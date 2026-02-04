"""Advanced Payroll Processing Routes"""
from fastapi import APIRouter, HTTPException, Depends, Response
from typing import Optional
from datetime import datetime, timezone

from core.database import db
from core.dependencies import get_current_user, check_venue_access
from models.hr_payroll_advanced import PayrollRun, PayrollRunState, DispatchQueue, PayrollRunRequest
from services.pdf_generation_service import pdf_service



def create_hr_payroll_advanced_router():
    router = APIRouter(tags=["hr_payroll_advanced"])
    
    @router.get("/venues/{venue_id}/hr/payroll/runs/{run_id}/dispatch-zip")
    async def dispatch_payroll_zip(
        venue_id: str,
        run_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        """Generates a ZIP file containing all payslip PDFs for a specific run."""
        await check_venue_access(current_user, venue_id)
        
        run = await db["payroll_runs"].find_one({"venue_id": venue_id, "id": run_id})
        if not run:
            # Try finding by run_number if ID isn't found
            run = await db["payroll_runs"].find_one({"venue_id": venue_id, "run_number": run_id})
            
        if not run:
            raise HTTPException(status_code=404, detail="Payroll run not found")
            
        import io
        import zipfile
        
        zip_buffer = io.BytesIO()
        with zipfile.ZipFile(zip_buffer, "a", zipfile.ZIP_DEFLATED, False) as zip_file:
            for ps in run.get("payslips", []):
                pdf_bytes = pdf_service.generate_payslip_reportlab(ps)
                filename = f"Payslip_{ps.get('employee_name', 'Employee')}_{ps.get('employee_id')}.pdf"
                zip_file.writestr(filename, pdf_bytes)
                
        zip_buffer.seek(0)
        return Response(
            content=zip_buffer.read(),
            media_type="application/x-zip-compressed",
            headers={"Content-Disposition": f"attachment; filename=Payroll_{run.get('run_number', 'Run')}.zip"}
        )

    
    def calculate_tax(gross: float) -> float:
        # Simplified Malta Tax Bands (Mock Logic)
        if gross <= 9100: return 0
        if gross <= 14500: return (gross - 9100) * 0.15
        if gross <= 60000: return (5400 * 0.15) + (gross - 14500) * 0.25
        return (gross) * 0.35
    
    def calculate_ssc(gross: float) -> float:
        ssc = gross * 0.10
        if ssc > 50: ssc = 50.0
        return ssc

    @router.post("/venues/{venue_id}/hr/payroll/calculate")
    async def create_payroll_run_calculated(
        venue_id: str,
        run_data: dict, 
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        try:
            period_start = run_data.get("period_start")
            period_end = run_data.get("period_end")
            run_name = run_data.get("run_name")
            
            # 1. Uniqueness Check
            existing = await db["payroll_runs"].find_one({
                "venue_id": venue_id,
                "period_start": period_start,
                "period_end": period_end
            })
            
            if existing:
                raise HTTPException(
                    status_code=400, 
                    detail=f"A payroll run for this period ({period_start} - {period_end}) already exists."
                )
            
            # 2. Real Database Calculation Logic
            payslips = []
            total_gross = 0
            total_net = 0
            total_tax = 0
            
            selected_employees = run_data.get("employees", [])
            
            # Fetch Target Employees
            query = {"venue_id": venue_id, "status": "active"}
            if selected_employees:
                query["id"] = {"$in": selected_employees}
                
            employees = await db.employees.find(query).to_list(1000)
            
            for emp in employees:
                emp_id = emp["id"]
                
                # Fetch shifts for the period
                shifts = await db.shifts.find({
                    "employee_id": emp_id,
                    "venue_id": venue_id,
                    "date": {"$gte": period_start, "$lte": period_end},
                    "status": "completed"
                }).to_list(1000)
                
                total_hours = sum(s.get("hours_worked", 0) for s in shifts)
                basic_pay = sum(s.get("total_cost", 0) for s in shifts)
                
                # If basic_pay is 0 but we have hours, use the employee's rate
                if basic_pay == 0 and total_hours > 0:
                    rate = emp.get("payroll", {}).get("hourly_rate", 0)
                    basic_pay = total_hours * rate
                
                bonus = 0.0 # Placeholder for overtime or other bonuses
                gross = basic_pay + bonus
                
                # Malta Tax Logic for Part Timers (10% standard usually, or based on bands)
                tax_rate = 0.10 if emp.get("employment_type") == "part_time" else 0.15
                
                tax = gross * tax_rate
                ssc = calculate_ssc(gross) # Mock SSC for now
                net = gross - tax - ssc
                
                payslip = {
                    "employee_id": emp_id,
                    "employee_name": emp['name'],
                    "employee_number": emp.get('display_id', emp_id),
                    "period_start": period_start,
                    "period_end": period_end,
                    "basic_pay": round(basic_pay, 2),
                    "gross_pay": round(gross, 2),
                    "tax_amount": round(tax, 2),
                    "net_pay": round(net, 2),
                    "total_deductions": round(tax + ssc, 2),
                    "hours_worked": total_hours,
                    "components": [
                        {"component_name": "Basic Pay", "component_type": "earning", "amount": round(basic_pay, 2), "is_taxable": True},
                        {"component_name": "FSS Tax", "component_type": "tax", "amount": round(tax, 2), "is_taxable": False},
                        {"component_name": "Social Security", "component_type": "deduction", "amount": round(ssc, 2), "is_taxable": False}
                    ]
                }
                payslips.append(payslip)
                total_gross += gross
                total_net += net
                total_tax += tax

            import uuid
            payroll_run = PayrollRun(
                venue_id=venue_id,
                run_number=f"PR-{datetime.now(timezone.utc).strftime('%Y%m%d')}-{str(uuid.uuid4())[:4].upper()}",
                run_name=run_name,
                period_start=period_start,
                period_end=period_end,
                payslips=payslips,
                total_gross=round(total_gross, 2),
                total_net=round(total_net, 2),
                total_tax=round(total_tax, 2),
                employee_count=len(payslips),
                created_by=current_user["id"],
                state=PayrollRunState.DRAFT
            )
            
            await db["payroll_runs"].insert_one(payroll_run.model_dump())
            return payroll_run.model_dump()
        except Exception as e:
            import traceback
            print(f"PAYROLL_CALC_ERROR: {str(e)}")
            print(traceback.format_exc())
            raise HTTPException(status_code=500, detail=f"Calculation Error: {str(e)}")

    @router.post("/venues/{venue_id}/hr/payroll/runs")
    async def create_payroll_run(
        venue_id: str,
        run_data: PayrollRunRequest,
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        # Uniqueness Check
        existing = await db["payroll_runs"].find_one({
            "venue_id": venue_id,
            "period_start": run_data.period_start,
            "period_end": run_data.period_end
        })
        if existing:
            raise HTTPException(status_code=400, detail="Payroll run for this period already exists.")
            
        # Calculate totals
        payslips = run_data.payslips
        total_gross = sum(p.get("gross_pay", 0) for p in payslips)
        total_net = sum(p.get("net_pay", 0) for p in payslips)
        total_tax = sum(p.get("tax_amount", 0) for p in payslips)
        
        payroll_run = PayrollRun(
            venue_id=venue_id,
            run_number=f"PR-{datetime.now(timezone.utc).strftime('%Y%m%d')}",
            run_name=run_data.run_name,
            period_start=run_data.period_start,
            period_end=run_data.period_end,
            payslips=payslips,
            total_gross=total_gross,
            total_net=total_net,
            total_tax=total_tax,
            employee_count=len(payslips),
            created_by=current_user["id"]
        )
        
        await db["payroll_runs"].insert_one(payroll_run.model_dump())
        return payroll_run.model_dump()
    
    @router.get("/venues/{venue_id}/hr/payroll/runs")
    async def list_payroll_runs(
        venue_id: str,
        state: Optional[str] = None,
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        query = {"venue_id": venue_id}
        if state:
            query["state"] = state
        
        runs = await db["payroll_runs"].find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
        return runs
    
    @router.post("/venues/{venue_id}/hr/payroll/runs/{run_id}/validate")
    async def validate_payroll_run(
        venue_id: str,
        run_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        await db["payroll_runs"].update_one(
            {"id": run_id, "venue_id": venue_id},
            {
                "$set": {
                    "state": "validated",
                    "validated_by": current_user["id"],
                    "validated_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        
        return {"message": "Payroll run validated"}
    
    @router.post("/venues/{venue_id}/hr/payroll/runs/{run_id}/approve")
    async def approve_payroll_run(
        venue_id: str,
        run_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        await db["payroll_runs"].update_one(
            {"id": run_id, "venue_id": venue_id},
            {
                "$set": {
                    "state": "approved",
                    "approved_by": current_user["id"],
                    "approved_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        
        return {"message": "Payroll run approved"}
    
    @router.post("/venues/{venue_id}/hr/payroll/runs/{run_id}/lock")
    async def lock_payroll_run(
        venue_id: str,
        run_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        await db["payroll_runs"].update_one(
            {"id": run_id, "venue_id": venue_id},
            {
                "$set": {
                    "state": "locked",
                    "locked_by": current_user["id"],
                    "locked_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        
        return {"message": "Payroll run locked"}
    
    @router.post("/venues/{venue_id}/hr/payroll/runs/{run_id}/dispatch")
    async def dispatch_payroll_run(
        venue_id: str,
        run_id: str,
        dispatch_data: dict,
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        # Get payroll run
        run = await db["payroll_runs"].find_one({"id": run_id, "venue_id": venue_id}, {"_id": 0})
        if not run:
            raise HTTPException(404, "Payroll run not found")
        
        if run["state"] != "locked":
            raise HTTPException(400, "Payroll run must be locked before dispatch")
        
        # Create dispatch queue entries
        method = dispatch_data.get("method", "email")
        for payslip in run["payslips"]:
            dispatch_entry = DispatchQueue(
                payroll_run_id=run_id,
                employee_id=payslip["employee_id"],
                payslip_id=payslip.get("id", payslip["employee_id"]),
                method=method,
                email=dispatch_data.get("emails", {}).get(payslip["employee_id"])
            )
            await db.DispatchQueue.insert_one(dispatch_entry.model_dump())
        
        # Update run state
        await db["payroll_runs"].update_one(
            {"id": run_id},
            {
                "$set": {
                    "state": "dispatched",
                    "dispatched_at": datetime.now(timezone.utc).isoformat(),
                    "dispatch_method": method
                }
            }
        )
        
        return {"message": "Payroll run dispatched", "queued": len(run["payslips"])}

    @router.delete("/venues/{venue_id}/hr/payroll/runs/{run_id}")
    async def delete_payroll_run(
        venue_id: str,
        run_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        result = await db["payroll_runs"].delete_one({"id": run_id, "venue_id": venue_id})
        if result.deleted_count == 0:
            raise HTTPException(404, "Payroll run not found")
            
        return {"message": "Payroll run deleted"}
    
    @router.get("/venues/{venue_id}/hr/payroll/runs/{run_id}/payslips/{employee_id}/pdf")
    async def download_payslip_pdf(
        venue_id: str,
        run_id: str,
        employee_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        # Get payroll run
        run = await db["payroll_runs"].find_one({"id": run_id, "venue_id": venue_id}, {"_id": 0})
        if not run:
            raise HTTPException(404, "Payroll run not found")
        
        # Find payslip
        payslip = None
        for ps in run["payslips"]:
            if ps["employee_id"] == employee_id:
                payslip = ps
                break
        
        if not payslip:
            raise HTTPException(404, "Payslip not found")
        
        # Generate PDF
        try:
            # Prefer ReportLab for 'birebir' template support
            if hasattr(pdf_service, 'generate_payslip_reportlab'):
                pdf_bytes = pdf_service.generate_payslip_reportlab(payslip)
            else:
                pdf_bytes = pdf_service.generate_payslip(payslip)
                
            return Response(
                content=pdf_bytes,
                media_type="application/pdf",
                headers={"Content-Disposition": f"attachment; filename=\"Payslip ({run.get('run_number', run_id)}) {employee_id}.pdf\""}
            )
        except Exception as e:
            raise HTTPException(500, f"PDF generation failed: {str(e)}")
    
    @router.get("/venues/{venue_id}/hr/payroll/dispatch-queue")
    async def get_dispatch_queue(
        venue_id: str,
        status: Optional[str] = None,
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        query = {}
        if status:
            query["status"] = status
        
        # Get all dispatch entries
        queue = await db.DispatchQueue.find(query, {"_id": 0}).to_list(10000)
        
        # Filter by venue (need to check payroll run)
        result = []
        for entry in queue:
            run = await db["payroll_runs"].find_one(
                {"id": entry["payroll_run_id"], "venue_id": venue_id},
                {"_id": 0, "id": 1}
            )
            if run:
                result.append(entry)
        
        return result
    
    return router
