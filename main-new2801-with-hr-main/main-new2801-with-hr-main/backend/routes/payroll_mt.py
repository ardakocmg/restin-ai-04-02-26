"""Payroll Malta Routes"""
from fastapi import APIRouter, Depends, Query

from core.database import db
from core.dependencies import get_current_user, check_venue_access
from core.feature_flags import require_feature
from core.venue_config import VenueConfigRepo


def create_payroll_mt_router():
    router = APIRouter(tags=["payroll_mt"])

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
        
        payruns = await db.pay_runs.find(
            {"venue_id": venue_id},
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
        
        from app.services.malta_payroll import MaltaPayrollEngine
        result = MaltaPayrollEngine.calculate(gross, category)
        
        return {"ok": True, "data": result}
        
    @router.post("/payroll-mt/run")
    async def generate_pay_run(
        payload: dict,
        current_user: dict = Depends(get_current_user)
    ):
        """
        Generate a payroll run for a venue.
        Payload: { "venue_id": "...", "year": 2025, "month": 1, "commit": false }
        """
        venue_id = payload.get("venue_id")
        await check_venue_access(current_user, venue_id)
        
        year = int(payload.get("year"))
        month = int(payload.get("month"))
        
        # 1. Fetch profiles
        profiles = await db.payroll_profiles.find({"venue_id": venue_id}).to_list(1000)
        
        payslips = []
        total_gross = 0
        total_tax = 0
        total_net = 0
        
        from app.services.malta_payroll import MaltaPayrollEngine
        
        for p in profiles:
            gross = p.get("salary_amount", 0)
            if p.get("salary_period") == "hourly":
                # Estimate annual for calculation or use hours * rate (Simplified for MVP)
                # Assuming salary_amount is Annual Gross for salary types
                gross = 0 # specific logic for hourly needed
            
            # Calculate taxes
            calc = MaltaPayrollEngine.calculate(gross, p.get("tax_category", "Single"))
            
            # Create Payslip Item
            payslip = {
                "employee_id": p.get("employee_id"),
                "employee_name": p.get("employee_name"),
                "gross_pay": calc["net_monthly"] + calc["tax_annual"]/12 + calc["ssc_annual"]/12, # Reconstruct monthly gross
                "net_pay": calc["net_monthly"],
                "tax_amount": calc["tax_annual"] / 12,
                "ssc_amount": calc["ssc_annual"] / 12,
                "components": [
                    {"name": "Basic Pay", "amount": calc["net_monthly"], "type": "earning"},
                    {"name": "Tax", "amount": -calc["tax_annual"]/12, "type": "deduction"},
                    {"name": "SSC", "amount": -calc["ssc_annual"]/12, "type": "deduction"}
                ]
            }
            payslips.append(payslip)
            
            total_gross += payslip["gross_pay"]
            total_tax += payslip["tax_amount"]
            total_net += payslip["net_pay"]
            
        period_str = f"{year}-{month:02d}"
        
        run_data = {
            "venue_id": venue_id,
            "period": period_str,
            "period_start": f"{year}-{month:02d}-01",
            "period_end": f"{year}-{month:02d}-28", # Simplified end date
            "status": "draft",
            "employee_count": len(profiles),
            "total_gross": round(total_gross, 2),
            "total_tax": round(total_tax, 2),
            "total_net": round(total_net, 2),
            "payslips": payslips,
            "created_by": current_user.get("uid")
        }
        
        if payload.get("commit"):
            res = await db.pay_runs.insert_one(run_data)
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
        
        from services.reporting_malta import MaltaReportingService
        svc = MaltaReportingService(db)
        
        report = await svc.generate_fs5_data(venue_id, month, year)
        return {"ok": True, "data": report}

    @router.get("/payroll-mt/reports/fs3")
    async def get_fs3_report(
        venue_id: str,
        employee_id: str,
        year: int,
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        from services.reporting_malta import MaltaReportingService
        svc = MaltaReportingService(db)
        
        report = await svc.get_employee_annual_summary(venue_id, employee_id, year)
        return {"ok": True, "data": report}

    return router
