"""Service Day Close Service"""
from datetime import datetime, timezone

from core.database import db
from ops.models.service_day_close import ServiceDayCloseRun, ServiceDayCloseCheck


class ServiceDayCloseService:
    
    async def run_checks(self, venue_id: str, service_date: str):
        """Run day close readiness checks"""
        
        checks = []
        overall_status = "READY"
        
        # Check 1: Open orders
        open_orders = await db.orders.count_documents({
            "venue_id": venue_id,
            "status": {"$nin": ["closed", "voided"]}
        })
        
        if open_orders > 0:
            checks.append(ServiceDayCloseCheck(
                key="open_orders",
                label="Open Orders",
                status="BLOCK",
                details=f"{open_orders} orders still open"
            ))
            overall_status = "BLOCKED"
        else:
            checks.append(ServiceDayCloseCheck(
                key="open_orders",
                label="Open Orders",
                status="OK",
                details="All orders closed"
            ))
        
        # Check 2: Open KDS tickets
        open_kds = await db.kds_tickets.count_documents({
            "venue_id": venue_id,
            "status": {"$nin": ["done", "cancelled"]}
        })
        
        if open_kds > 0:
            checks.append(ServiceDayCloseCheck(
                key="open_kds",
                label="Open KDS Tickets",
                status="BLOCK",
                details=f"{open_kds} tickets not done"
            ))
            overall_status = "BLOCKED"
        else:
            checks.append(ServiceDayCloseCheck(
                key="open_kds",
                label="Open KDS Tickets",
                status="OK",
                details="All tickets completed"
            ))
        
        # Check 3: Critical integrity findings
        crit_findings = await db.integrity_findings.count_documents({
            "venue_id": venue_id,
            "severity": "CRITICAL",
            "status": "OPEN"
        })
        
        if crit_findings > 0:
            checks.append(ServiceDayCloseCheck(
                key="integrity_crit",
                label="Critical Integrity Issues",
                status="WARN",
                details=f"{crit_findings} critical findings"
            ))
            if overall_status == "READY":
                overall_status = "BLOCKED"
        else:
            checks.append(ServiceDayCloseCheck(
                key="integrity_crit",
                label="Critical Integrity Issues",
                status="OK",
                details="No critical issues"
            ))
        
        return ServiceDayCloseRun(
            venue_id=venue_id,
            service_date=service_date,
            status=overall_status,
            checks=checks
        )

service_day_close_service = ServiceDayCloseService()
