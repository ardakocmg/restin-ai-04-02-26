"""Payroll Malta Routes"""
from fastapi import APIRouter, Depends, Query
from datetime import datetime
from core.database import db
from core.dependencies import get_current_user, check_venue_access
from core.feature_flags import require_feature
from core.venue_config import VenueConfigRepo


def create_payroll_mt_router():
    router = APIRouter(tags=["payroll_mt"])

    # ── Shared helper: resolve venue legal entity ───────────────────────
    async def _resolve_employer(venue_id: str) -> dict:
        """Look up venue → legal_entity → employer info (PE, VAT, name)."""
        venue_doc = await db.venues.find_one({"id": venue_id}) or await db.venues.find_one({"_id": venue_id})
        if not venue_doc:
            return {}
        le_id = venue_doc.get("legal_entity_id")
        if le_id:
            from bson import ObjectId
            try:
                le = await db.legal_entities.find_one({"_id": ObjectId(le_id), "deleted_at": None})
            except Exception:
                le = await db.legal_entities.find_one({"id": le_id, "deleted_at": None})
            if le:
                return {
                    "legal_entity_id": le_id,
                    "pe_number": le.get("pe_number", ""),
                    "registered_name": le.get("registered_name", ""),
                    "employer_name": le.get("registered_name", ""),
                    "vat_number": le.get("vat_number", ""),
                    "registered_address": le.get("registered_address", ""),
                }
        # Fallback: legacy venue.legal_info
        legacy = venue_doc.get("legal_info", {})
        return {
            "legal_entity_id": None,
            "pe_number": legacy.get("pe_number", ""),
            "registered_name": legacy.get("registered_name", venue_doc.get("name", "")),
            "employer_name": legacy.get("registered_name", venue_doc.get("name", "")),
            "vat_number": legacy.get("vat_number", ""),
            "registered_address": legacy.get("registered_address", ""),
        }

    @router.get("/payroll-mt/profiles")
    async def list_profiles(
        venue_id: str = Query(...),
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        config_repo = VenueConfigRepo(db)
        cfg = await config_repo.get(venue_id)
        require_feature(cfg, "payroll_mt", "payroll")
        
        profiles = await db.payroll_profiles.find(
            {"venue_id": venue_id},
            {"_id": 0}
        ).to_list(200)
        
        return {"ok": True, "data": profiles}

    @router.get("/payroll-mt/payruns")
    async def list_payruns(
        venue_id: str = Query(...),
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        config_repo = VenueConfigRepo(db)
        cfg = await config_repo.get(venue_id)
        require_feature(cfg, "payroll_mt", "payroll")
        
        # Support org-wide ("all") and venue-specific payroll runs
        allowed_venues = current_user.get("allowed_venue_ids", [venue_id])
        venue_query = {"$or": [
            {"venue_id": venue_id},
            {"venue_id": "all"},
            {"venue_id": {"$in": allowed_venues}},
        ]}
        
        payruns = await db.payroll_runs.find(
            venue_query,
            {"_id": 0}
        ).sort("created_at", -1).to_list(100)
        
        return {"ok": True, "data": payruns}

    @router.post("/payroll-mt/calculate")
    async def calculate_salary(
        payload: dict,
        current_user: dict = Depends(get_current_user)
    ):
        """
        On-demand tax calculation for a given gross amount.
        Payload: { "gross_annual": 25000, "tax_category": "Single" }
        """
        # No venue check strictly needed for a pure calculator, but good for context if added later.
        # For now, open tool.
        
        gross = float(payload.get("gross_annual", 0))
        category = payload.get("tax_category", "Single")
        
        from services.payroll_mt_engine import MaltaPayrollEngine
        result = MaltaPayrollEngine.calculate_net_salary(gross / 12, category) # Engine takes monthly now for net, or upgrade engine
        # Actually my Engine.calculate_tax takes annual, calculate_net_salary takes monthly.
        # User implies payload has "gross_annual".
        # Let's use calculate_net_salary passing monthly equivalent
        result = MaltaPayrollEngine.calculate_net_salary(gross / 12, category)
        
        return {"ok": True, "data": result}
        
    @router.post("/payroll-mt/run")
    async def generate_pay_run(
        payload: dict,
        current_user: dict = Depends(get_current_user)
    ):
        """
        Generate a payroll run for a venue.
        Payload: { "venue_id": "...", "year": 2025, "month": 1, "commit": false }
        Now resolves the Legal Entity associated with the venue for
        PE number, VAT, and employer name on FS5/FS3 reports.
        """
        venue_id = payload.get("venue_id")
        await check_venue_access(current_user, venue_id)
        
        year = int(payload.get("year"))
        month = int(payload.get("month"))
        
        # ── Resolve Legal Entity from Venue ──────────────────────────────
        employer_info = await _resolve_employer(venue_id)
        
        # 1. Fetch profiles
        profiles = await db.payroll_profiles.find({"venue_id": venue_id}).to_list(1000)
        
        payslips = []
        total_gross = 0
        total_tax = 0
        total_net = 0
        
        from services.payroll_mt_engine import MaltaPayrollEngine
        
        for p in profiles:
            gross_annual = p.get("salary_amount", 0)
            status = p.get("tax_category", "Single")
            
            # Simple simulation: Monthly Gross = Annual / 12
            monthly_gross = gross_annual / 12
            
            # Use new Engine
            calc = MaltaPayrollEngine.calculate_net_salary(monthly_gross, status)
            
            # Create Payslip Item
            payslip = {
                "employee_id": p.get("employee_id"),
                "employee_name": p.get("employee_name", "Unknown"),
                "employee_number": p.get("employee_number", "000"),
                "gross_pay": calc["gross"],
                "net_pay": calc["net"],
                "tax_amount": calc["tax"],
                "components": [
                    {"component_name": "Basic Pay", "amount": calc["gross"], "type": "earning"},
                    {"component_name": "FSS Tax", "amount": calc["tax"], "type": "deduction"},
                    {"component_name": "Social Security", "amount": calc["ssc"], "type": "deduction"}
                ]
            }
            payslips.append(payslip)
            
            total_gross += payslip["gross_pay"]
            total_tax += payslip["tax_amount"]
            total_net += payslip["net_pay"]
            
        period_str = f"{year}-{month:02d}"
        
        # Use consistent collection: 'payroll_runs' (matches hr_compliance_mt)
        run_data = {
            "venue_id": venue_id,
            "period": period_str,
            "period_start": f"{year}-{month:02d}-01",
            "period_end": f"{year}-{month:02d}-28",  # Simplified end date
            "state": "draft",  # match enum in other files
            "employer": employer_info,
            "employee_count": len(profiles),
            "total_gross": round(total_gross, 2),
            "total_tax": round(total_tax, 2),
            "total_net": round(total_net, 2),
            "payslips": payslips,
            "created_by": current_user.get("uid", "system"),
            "created_at": datetime.utcnow()
        }
        
        if payload.get("commit"):
            # Ensure unique ID if not present
            if "id" not in run_data:
                import uuid
                run_data["id"] = str(uuid.uuid4())
                
            res = await db.payroll_runs.insert_one(run_data)
            run_data["_id"] = str(res.inserted_id)
            
        return {"ok": True, "data": run_data}

    @router.get("/payroll-mt/reports/fs5")
    async def get_fs5_report(
        venue_id: str,
        month: int,
        year: int,
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)

        # ── Resolve Legal Entity for FS5 header (PE Number, Employer) ─
        legal_entity_meta = await _resolve_employer(venue_id)

        # Try reporting service first
        try:
            from services.reporting_malta import MaltaReportingService
            svc = MaltaReportingService(db)
            report = await svc.generate_fs5_data(venue_id, month, year)
            if report:
                # Inject legal entity meta into report
                report["employer"] = legal_entity_meta
                return {"ok": True, "data": report}
        except Exception:
            pass

        # Fallback: query seeded fs5_forms collection directly
        fs5_id = f"fs5-{year}-{month:02d}"
        fs5 = await db.fs5_forms.find_one({"id": fs5_id, "venue_id": venue_id}, {"_id": 0})
        if fs5:
            fs5["employer"] = legal_entity_meta
            return {"ok": True, "data": fs5}
        return {"ok": False, "error": f"No FS5 data for {year}-{month:02d}"}

    @router.get("/payroll-mt/reports/fs3")
    async def get_fs3_report(
        venue_id: str,
        employee_id: str,
        year: int,
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)

        # Resolve employer for FS3 header
        employer_meta = await _resolve_employer(venue_id)

        # Try reporting service first
        try:
            from services.reporting_malta import MaltaReportingService
            svc = MaltaReportingService(db)
            report = await svc.get_employee_annual_summary(venue_id, employee_id, year)
            if report:
                report["employer"] = employer_meta
                return {"ok": True, "data": report}
        except Exception:
            pass

        # Fallback: query seeded fs3_entries by employee_id
        fs3 = await db.fs3_entries.find_one(
            {"employee_id": employee_id, "year": year, "venue_id": venue_id},
            {"_id": 0}
        )
        if not fs3:
            # Try by employee_code (legacy)
            fs3 = await db.fs3_entries.find_one(
                {"employee_code": employee_id, "year": year, "venue_id": venue_id},
                {"_id": 0}
            )
        if fs3:
            fs3["employer"] = employer_meta
            return {"ok": True, "data": fs3}
        return {"ok": False, "error": f"No FS3 data for employee {employee_id}, year {year}"}

    @router.get("/payroll-mt/reports/fs7")
    async def get_fs7_report(
        venue_id: str,
        year: int,
        current_user: dict = Depends(get_current_user)
    ):
        """Annual reconciliation statement"""
        await check_venue_access(current_user, venue_id)
        fs7 = await db.fs7_forms.find_one(
            {"venue_id": venue_id, "year": year},
            {"_id": 0}
        )
        if fs7:
            return {"ok": True, "data": fs7}
        return {"ok": False, "error": f"No FS7 data for year {year}"}

    # ── LIST endpoints for all compliance forms ──────────────────────────
    @router.get("/payroll-mt/compliance/fs3")
    async def list_fs3_entries(
        venue_id: str,
        year: int = 2025,
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        entries = await db.fs3_entries.find(
            {"venue_id": venue_id, "year": year}, {"_id": 0}
        ).to_list(200)
        return {"ok": True, "data": entries, "count": len(entries)}

    @router.get("/payroll-mt/compliance/fs5")
    async def list_fs5_forms(
        venue_id: str,
        year: int = 2025,
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        forms = await db.fs5_forms.find(
            {"venue_id": venue_id, "year": year}, {"_id": 0}
        ).sort("month", 1).to_list(12)
        return {"ok": True, "data": forms, "count": len(forms)}

    @router.get("/payroll-mt/compliance/fs7")
    async def list_fs7_forms(
        venue_id: str,
        year: int = 2025,
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        forms = await db.fs7_forms.find(
            {"venue_id": venue_id, "year": year}, {"_id": 0}
        ).to_list(10)
        return {"ok": True, "data": forms, "count": len(forms)}

    @router.get("/payroll-mt/run/{run_id}/payslip/{employee_id}/pdf")
    async def get_payslip_pdf(
        venue_id: str,
        run_id: str,
        employee_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        """Generate Individual Payslip PDF"""
        await check_venue_access(current_user, venue_id)
        
        run = await db.payroll_runs.find_one({"id": run_id, "venue_id": venue_id})
        if not run:
            # Fallback check by _id if needed, but 'id' is standard
            from bson import ObjectId
            try:
                run = await db.payroll_runs.find_one({"_id": ObjectId(run_id), "venue_id": venue_id})
            except:
                pass
        
        if not run:
             # Try finding in pay_runs collection (legacy)
             run = await db.pay_runs.find_one({"id": run_id, "venue_id": venue_id})

        if not run:
            return {"ok": False, "error": "Run not found"}

        # Find payslip
        target_slip = None
        payslips = run.get("payslips", [])
        for slip in payslips:
            if slip.get("employee_id") == employee_id:
                target_slip = slip
                break
        
        if not target_slip:
             return {"ok": False, "error": "Payslip not found for employee"}

        # Use PDF Service
        from services.pdf_generation_service import pdf_service
        
        # Enhance slip data with run info for header
        slip_data = target_slip.copy()
        slip_data['period_start'] = run.get('period_start', '')
        slip_data['period_end'] = run.get('period_end', '')
        
        # Prepare lines if not present in desired format
        if 'lines' not in slip_data:
             slip_data['lines'] = []
             for comp in slip_data.get('components', []):
                 slip_data['lines'].append({
                     'name': comp.get('component_name'),
                     'qty': 0, # Mock or calc
                     'rate': 0, # Mock or calc
                     'earn': comp.get('amount') if comp.get('type') == 'earning' else 0,
                     'deduct': comp.get('amount') if comp.get('type') == 'deduction' else 0
                 })

        pdf_bytes = pdf_service.generate_payslip_reportlab(slip_data)
        
        from fastapi import Response
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=Payslip_{slip_data['employee_name']}_{run.get('period', 'Run')}.pdf"}
        )

    return router
