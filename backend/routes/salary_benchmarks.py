"""
Salary Benchmarking Routes
Based on Shireburn Indigo Benchmarks feature:
- Internal salary statistics by role/department
- Anonymized aggregate comparison data
- Market positioning analysis
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
from datetime import datetime, timezone

from core.database import db
from core.dependencies import get_current_user, check_venue_access


def create_salary_benchmarks_router():
    router = APIRouter(tags=["salary_benchmarks"])

    @router.get("/venues/{venue_id}/hr/salary-benchmarks")
    async def get_salary_benchmarks(
        venue_id: str,
        department: Optional[str] = None,
        current_user: dict = Depends(get_current_user)
    ):
        """Get salary benchmark data aggregated by job title/department."""
        await check_venue_access(current_user, venue_id)

        # Build match stage
        match_stage = {"venue_id": venue_id, "status": "active"}
        if department:
            match_stage["department"] = department

        # Aggregate salary stats by occupation/role
        pipeline = [
            {"$match": match_stage},
            {"$group": {
                "_id": {"occupation": "$occupation", "department": {"$ifNull": ["$department", "General"]}},
                "count": {"$sum": 1},
                "avg_salary": {"$avg": {"$ifNull": ["$base_salary", 0]}},
                "min_salary": {"$min": {"$ifNull": ["$base_salary", 0]}},
                "max_salary": {"$max": {"$ifNull": ["$base_salary", 0]}},
                "avg_hourly": {"$avg": {"$ifNull": ["$hourly_rate", 0]}}
            }},
            {"$sort": {"_id.department": 1, "_id.occupation": 1}}
        ]

        results = await db.employees.aggregate(pipeline).to_list(200)

        benchmarks = []
        for r in results:
            benchmarks.append({
                "occupation": r["_id"].get("occupation", "Unknown"),
                "department": r["_id"].get("department", "General"),
                "employee_count": r["count"],
                "avg_salary": round(r["avg_salary"], 2),
                "min_salary": round(r["min_salary"], 2),
                "max_salary": round(r["max_salary"], 2),
                "avg_hourly_rate": round(r["avg_hourly"], 2),
                "salary_range": round(r["max_salary"] - r["min_salary"], 2)
            })

        return {
            "venue_id": venue_id,
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "total_roles": len(benchmarks),
            "benchmarks": benchmarks
        }

    @router.get("/venues/{venue_id}/hr/salary-benchmarks/comparison")
    async def salary_comparison(
        venue_id: str,
        employee_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        """Compare an individual employee's salary against the internal benchmark for their role."""
        await check_venue_access(current_user, venue_id)

        employee = await db.employees.find_one(
            {"id": employee_id, "venue_id": venue_id},
            {"_id": 0, "full_name": 1, "name": 1, "occupation": 1, "base_salary": 1, "hourly_rate": 1, "department": 1}
        )
        if not employee:
            raise HTTPException(404, "Employee not found")

        occupation = employee.get("occupation", "Staff")
        emp_salary = employee.get("base_salary", 0)

        # Get peers with same occupation
        peers = await db.employees.find(
            {"venue_id": venue_id, "occupation": occupation, "status": "active"},
            {"_id": 0, "base_salary": 1}
        ).to_list(500)

        peer_salaries = [p.get("base_salary", 0) for p in peers if p.get("base_salary")]

        if not peer_salaries:
            return {"message": "No peer data available", "employee": employee}

        avg = sum(peer_salaries) / len(peer_salaries)
        percentile = len([s for s in peer_salaries if s <= emp_salary]) / len(peer_salaries) * 100

        return {
            "employee_name": employee.get("full_name") or employee.get("name"),
            "occupation": occupation,
            "department": employee.get("department", "General"),
            "current_salary": emp_salary,
            "peer_count": len(peer_salaries),
            "peer_avg_salary": round(avg, 2),
            "peer_min_salary": min(peer_salaries),
            "peer_max_salary": max(peer_salaries),
            "percentile": round(percentile, 1),
            "diff_from_avg": round(emp_salary - avg, 2),
            "diff_from_avg_pct": round((emp_salary - avg) / max(avg, 1) * 100, 1)
        }

    @router.get("/venues/{venue_id}/hr/salary-benchmarks/gender-gap")
    async def gender_pay_gap(
        venue_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        """Analyze gender pay gap — critical for ESG/EU Pay Transparency compliance."""
        await check_venue_access(current_user, venue_id)

        pipeline = [
            {"$match": {"venue_id": venue_id, "status": "active"}},
            {"$group": {
                "_id": {"$ifNull": ["$gender", "unspecified"]},
                "count": {"$sum": 1},
                "avg_salary": {"$avg": {"$ifNull": ["$base_salary", 0]}},
                "median_hourly": {"$avg": {"$ifNull": ["$hourly_rate", 0]}}
            }}
        ]

        results = await db.employees.aggregate(pipeline).to_list(10)

        gender_data = {}
        for r in results:
            gender_data[r["_id"]] = {
                "count": r["count"],
                "avg_salary": round(r["avg_salary"], 2),
                "avg_hourly": round(r["median_hourly"], 2)
            }

        male_avg = gender_data.get("male", {}).get("avg_salary", 0)
        female_avg = gender_data.get("female", {}).get("avg_salary", 0)
        gap_pct = round((male_avg - female_avg) / max(male_avg, 1) * 100, 1) if male_avg else 0

        return {
            "venue_id": venue_id,
            "by_gender": gender_data,
            "gender_pay_gap_pct": gap_pct,
            "eu_compliant": abs(gap_pct) < 5,  # EU target
            "generated_at": datetime.now(timezone.utc).isoformat()
        }

    return router
