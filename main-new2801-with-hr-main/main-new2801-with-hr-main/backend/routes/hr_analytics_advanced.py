"""Advanced HR Analytics Routes"""
from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
from datetime import datetime, timezone, timedelta

from core.database import db
from core.dependencies import get_current_user, check_venue_access
from models.hr_analytics_advanced import HRAnalyticsSnapshot, HeadcountMetrics, TurnoverMetrics, CostMetrics


def create_hr_analytics_advanced_router():
    router = APIRouter(tags=["hr_analytics_advanced"])
    
    @router.post("/venues/{venue_id}/hr/analytics/snapshot")
    async def create_analytics_snapshot(
        venue_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        # Get all employees
        employees = await db.Employees.find({"venue_id": venue_id}, {"_id": 0}).to_list(10000)
        
        # Headcount metrics
        total_employees = len(employees)
        active = len([e for e in employees if e.get("status") == "active"])
        on_leave = 0  # Placeholder
        terminated = len([e for e in employees if e.get("status") == "terminated"])
        new_hires = 0  # Placeholder - would check hire_date within last month
        
        department_breakdown = {}
        role_breakdown = {}
        for emp in employees:
            dept = emp.get("department", "Unknown")
            role = emp.get("role", "Unknown")
            department_breakdown[dept] = department_breakdown.get(dept, 0) + 1
            role_breakdown[role] = role_breakdown.get(role, 0) + 1
        
        headcount = HeadcountMetrics(
            total_employees=total_employees,
            active=active,
            on_leave=on_leave,
            terminated=terminated,
            new_hires=new_hires,
            department_breakdown=department_breakdown,
            role_breakdown=role_breakdown
        )
        
        # Turnover metrics
        now = datetime.now(timezone.utc)
        period_start = (now - timedelta(days=365)).isoformat()
        period_end = now.isoformat()
        
        turnover = TurnoverMetrics(
            period_start=period_start,
            period_end=period_end,
            voluntary_exits=0,
            involuntary_exits=0,
            turnover_rate=0.0,
            retention_rate=100.0,
            avg_tenure_days=365.0
        )
        
        # Cost metrics
        costs = CostMetrics(
            total_payroll_cost=0.0,
            cost_per_employee=0.0,
            benefits_cost=0.0,
            overtime_cost=0.0,
            training_cost=0.0,
            recruitment_cost=0.0
        )
        
        snapshot = HRAnalyticsSnapshot(
            venue_id=venue_id,
            snapshot_date=now.isoformat()[:10],
            headcount=headcount.model_dump(),
            turnover=turnover.model_dump(),
            costs=costs.model_dump(),
            leave_utilization={},
            performance_summary={}
        )
        
        await db.HRAnalyticsSnapshots.insert_one(snapshot.model_dump())
        return snapshot.model_dump()
    
    @router.get("/venues/{venue_id}/hr/analytics/snapshots")
    async def list_analytics_snapshots(
        venue_id: str,
        limit: int = 12,
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        snapshots = await db.HRAnalyticsSnapshots.find(
            {"venue_id": venue_id},
            {"_id": 0}
        ).sort("snapshot_date", -1).limit(limit).to_list(limit)
        
        return snapshots
    
    @router.get("/venues/{venue_id}/hr/analytics/headcount", response_model=HeadcountMetrics)
    async def get_headcount_analytics(
        venue_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        employees = await db.Employees.find({"venue_id": venue_id}, {"_id": 0}).to_list(10000)
        
        total = len(employees)
        active = len([e for e in employees if e.get("status") == "active"])
        terminated = len([e for e in employees if e.get("status") == "terminated"])
        on_leave = 0 # Placeholder
        
        # Breakdown calculations
        dept_counts = {}
        role_counts = {}
        type_counts = {}
        loc_counts = {}
        
        for emp in employees:
            dept = emp.get("department", "Unknown")
            role = emp.get("role", "Unknown")
            etype = emp.get("employment_type", "Full Time")
            loc = emp.get("location", "Main")
            
            dept_counts[dept] = dept_counts.get(dept, 0) + 1
            role_counts[role] = role_counts.get(role, 0) + 1
            type_counts[etype] = type_counts.get(etype, 0) + 1
            loc_counts[loc] = loc_counts.get(loc, 0) + 1
            
        return HeadcountMetrics(
            total_headcount=total,
            active=active,
            on_leave=on_leave,
            terminated=terminated,
            new_employees_ytd=8, # Mock
            terminated_ytd=terminated,
            by_department=[{"name": k, "count": v} for k, v in dept_counts.items()],
            by_employment_type=[{"name": k, "count": v} for k, v in type_counts.items()],
            by_location=[{"name": k, "count": v} for k, v in loc_counts.items()],
            trend_data=[
                {"month": "Jan", "count": total - 4},
                {"month": "Feb", "count": total - 2},
                {"month": "Mar", "count": total - 1},
                {"month": "Apr", "count": total}
            ],
            department_breakdown=dept_counts,
            role_breakdown=role_counts
        )
    
    @router.get("/venues/{venue_id}/hr/analytics/turnover", response_model=TurnoverMetrics)
    async def get_turnover_analytics(
        venue_id: str,
        period_days: int = 365,
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        now = datetime.now(timezone.utc)
        start_date = (now - timedelta(days=period_days)).isoformat()
        
        terminated = await db.Employees.find(
            {
                "venue_id": venue_id,
                "status": "terminated",
                "termination_date": {"$gte": start_date}
            },
            {"_id": 0}
        ).to_list(10000)
        
        total_employees = await db.Employees.count_documents({"venue_id": venue_id})
        
        turnover_count = len(terminated)
        turnover_rate = (turnover_count / total_employees * 100) if total_employees > 0 else 0
        retention_rate = 100 - turnover_rate
        
        # Detailed breakdowns
        dept_counts = {}
        reason_counts = {}
        for emp in terminated:
            dept = emp.get("department", "Unknown")
            reason = emp.get("termination_reason", "Resignation")
            dept_counts[dept] = dept_counts.get(dept, 0) + 1
            reason_counts[reason] = reason_counts.get(reason, 0) + 1
            
        return TurnoverMetrics(
            period_start=start_date,
            period_end=now.isoformat(),
            voluntary_terminations=len([e for e in terminated if e.get("termination_type") != "dismissal"]),
            non_voluntary_terminations=len([e for e in terminated if e.get("termination_type") == "dismissal"]),
            voluntary_exits=len([e for e in terminated if e.get("termination_type") != "dismissal"]),
            involuntary_exits=len([e for e in terminated if e.get("termination_type") == "dismissal"]),
            turnover_rate=round(turnover_rate, 2),
            retention_rate=round(retention_rate, 2),
            avg_tenure_days=365.0, # Mock
            by_department=[{"name": k, "count": v} for k, v in dept_counts.items()],
            by_reason=[{"name": k, "count": v} for k, v in reason_counts.items()],
            trend_data=[
                {"month": "Jan", "count": 1},
                {"month": "Feb", "count": 2},
                {"month": "Mar", "count": turnover_count - 3 if turnover_count > 3 else 0},
                {"month": "Apr", "count": 0}
            ]
        )
    
    @router.get("/venues/{venue_id}/hr/analytics/costs")
    async def get_cost_analytics(
        venue_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        # Get recent payroll runs
        now = datetime.now(timezone.utc)
        three_months_ago = (now - timedelta(days=90)).isoformat()
        
        payroll_runs = await db.PayrollRuns.find(
            {
                "venue_id": venue_id,
                "created_at": {"$gte": three_months_ago}
            },
            {"_id": 0}
        ).to_list(1000)
        
        total_payroll = sum(run.get("total_net", 0) for run in payroll_runs)
        avg_payroll = total_payroll / len(payroll_runs) if payroll_runs else 0
        
        total_employees = await db.Employees.count_documents({"venue_id": venue_id, "status": "active"})
        cost_per_employee = total_payroll / total_employees if total_employees > 0 else 0
        
        return {
            "total_payroll_cost": total_payroll,
            "avg_monthly_payroll": avg_payroll,
            "cost_per_employee": round(cost_per_employee, 2),
            "total_employees": total_employees
        }
    
    return router
