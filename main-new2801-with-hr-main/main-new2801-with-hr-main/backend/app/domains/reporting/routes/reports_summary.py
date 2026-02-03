from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from datetime import datetime, timezone
from typing import Optional

from core.database import get_database
from core.dependencies import get_current_user, check_venue_access
from services.audit_service import create_audit_log

from app.domains.reporting.service.summary_report_service import generate_summary_report_data
from app.domains.reporting.renderers.summary_report_csv_v1 import render_csv_v1
from app.domains.reporting.renderers.summary_report_pdf_v1 import render_pdf_v1

def create_summary_report_router():
    router = APIRouter(prefix="/reports", tags=["summary-report"])

    @router.get("/summary")
    async def get_summary_report(
        venue_id: str = Query(...),
        from_iso: str = Query(..., alias="from"),
        to_iso: str = Query(..., alias="to"),
        format: str = Query("csv", regex="^(csv|pdf)$"),
        current_user: dict = Depends(get_current_user)
    ):
        db = get_database()
        await check_venue_access(current_user, venue_id)
        
        # 1. Feature Flag Check
        venue = await db.venues.find_one({"id": venue_id}, {"_id": 0, "features": 1})
        if not venue or not venue.get("features", {}).get("REPORTING_ENABLED", True):
            return { "ok": False, "error": { "code": "FEATURE_DISABLED" } }
            
        # 2. Permission Check
        user_perms = current_user.get("permissions", [])
        if "REPORTS_VIEW_SUMMARY" not in user_perms and current_user.get("role") != "product_owner":
            raise HTTPException(status_code=403, detail="Permission REPORTS_VIEW_SUMMARY required")
            
        # Parse Dates
        try:
            from_dt = datetime.fromisoformat(from_iso.replace('Z', '+00:00'))
            to_dt = datetime.fromisoformat(to_iso.replace('Z', '+00:00'))
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use ISO format.")

        # 3. Generate Data
        data = generate_summary_report_data(
            from_dt=from_dt,
            to_dt=to_dt,
            venue_id=venue_id,
            tz="UTC", # Simplified for now
            actor_ctx=current_user
        )
        
        # 4. Render
        if format == "csv":
            content = render_csv_v1(data)
            media_type = "text/csv"
            filename = f"summaryreport-{from_dt.strftime('%Y-%m-%d')}_{to_dt.strftime('%Y-%m-%d')}.csv"
        else:
            content = render_pdf_v1(data)
            media_type = "application/pdf"
            filename = f"summaryreport-{from_dt.strftime('%Y-%m-%d')}_{to_dt.strftime('%Y-%m-%d')}.pdf"

        # 5. Audit Log
        # Writes audit log with: request_id, user_id, venue_id, build_id, report_type="restaurant_summary", format, range
        await create_audit_log(
            venue_id, 
            current_user.get("id"), 
            current_user.get("name"),
            action="generate_report",
            resource_type="restaurant_summary",
            resource_id=venue_id,
            details={
                "format": format,
                "range": f"{from_iso} - {to_iso}",
                "report_type": "restaurant_summary"
            }
        )
        
        return Response(
            content=content,
            media_type=media_type,
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"'
            }
        )

    return router
