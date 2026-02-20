"""
Hiring / ATS Routes — Applicant Tracking System
Based on Shireburn Indigo Hiring feature set:
- Job postings CRUD with screening questions
- Candidate applications with pipeline stages
- Interview scorecards and evaluations
- Branded career page (public endpoint)
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import Optional, List
from datetime import datetime, timezone
from pydantic import BaseModel
import uuid

from core.database import db
from core.dependencies import get_current_user, check_venue_access


# ── Models ──────────────────────────────────────────────
class ScreeningQuestion(BaseModel):
    question: str
    required: bool = True
    question_type: str = "text"  # text, yes_no, multiple_choice
    options: List[str] = []

class JobPostingRequest(BaseModel):
    title: str
    department: str
    location: str = ""
    employment_type: str = "full_time"  # full_time, part_time, contract, temporary
    description: str = ""
    requirements: List[str] = []
    benefits: List[str] = []
    salary_min: Optional[float] = None
    salary_max: Optional[float] = None
    screening_questions: List[ScreeningQuestion] = []
    auto_publish: bool = True

class CandidateApplicationRequest(BaseModel):
    job_id: str
    candidate_name: str
    candidate_email: str
    candidate_phone: str = ""
    cover_letter: str = ""
    cv_url: str = ""
    screening_answers: List[dict] = []

class ScorecardEntry(BaseModel):
    category: str  # e.g. "Technical Skills", "Communication", "Culture Fit"
    rating: int  # 1-5
    notes: str = ""


def create_hiring_router():
    router = APIRouter(tags=["hiring"])

    # ═══════════════════════════════════════════════════════
    # JOB POSTINGS
    # ═══════════════════════════════════════════════════════

    @router.post("/venues/{venue_id}/hr/hiring/jobs")
    async def create_job_posting(
        venue_id: str,
        job_data: JobPostingRequest,
        current_user: dict = Depends(get_current_user)
    ):
        """Create a new job posting."""
        await check_venue_access(current_user, venue_id)

        job = {
            "id": f"job-{uuid.uuid4().hex[:12]}",
            "venue_id": venue_id,
            "title": job_data.title,
            "department": job_data.department,
            "location": job_data.location,
            "employment_type": job_data.employment_type,
            "description": job_data.description,
            "requirements": job_data.requirements,
            "benefits": job_data.benefits,
            "salary_min": job_data.salary_min,
            "salary_max": job_data.salary_max,
            "screening_questions": [q.model_dump() for q in job_data.screening_questions],
            "status": "published" if job_data.auto_publish else "draft",
            "pipeline_stages": ["applied", "screening", "interview", "evaluation", "offer", "hired", "rejected"],
            "applicant_count": 0,
            "created_by": current_user["id"],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }

        await db.job_postings.insert_one(job)
        return job

    @router.get("/venues/{venue_id}/hr/hiring/jobs")
    async def list_job_postings(
        venue_id: str,
        status: Optional[str] = None,
        department: Optional[str] = None,
        current_user: dict = Depends(get_current_user)
    ):
        """List all job postings for a venue."""
        await check_venue_access(current_user, venue_id)

        query = {"venue_id": venue_id}
        if status:
            query["status"] = status
        if department:
            query["department"] = department

        jobs = await db.job_postings.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
        return jobs

    @router.get("/venues/{venue_id}/hr/hiring/jobs/{job_id}")
    async def get_job_posting(
        venue_id: str,
        job_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        """Get a specific job posting."""
        await check_venue_access(current_user, venue_id)
        job = await db.job_postings.find_one({"id": job_id, "venue_id": venue_id}, {"_id": 0})
        if not job:
            raise HTTPException(404, "Job posting not found")
        return job

    @router.put("/venues/{venue_id}/hr/hiring/jobs/{job_id}")
    async def update_job_posting(
        venue_id: str,
        job_id: str,
        updates: dict,
        current_user: dict = Depends(get_current_user)
    ):
        """Update a job posting."""
        await check_venue_access(current_user, venue_id)
        updates["updated_at"] = datetime.now(timezone.utc).isoformat()

        await db.job_postings.update_one(
            {"id": job_id, "venue_id": venue_id},
            {"$set": updates}
        )
        return {"message": "Job posting updated"}

    @router.delete("/venues/{venue_id}/hr/hiring/jobs/{job_id}")
    async def close_job_posting(
        venue_id: str,
        job_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        """Close/archive a job posting."""
        await check_venue_access(current_user, venue_id)
        await db.job_postings.update_one(
            {"id": job_id, "venue_id": venue_id},
            {"$set": {"status": "closed", "closed_at": datetime.now(timezone.utc).isoformat()}}
        )
        return {"message": "Job posting closed"}

    # ═══════════════════════════════════════════════════════
    # CANDIDATE APPLICATIONS
    # ═══════════════════════════════════════════════════════

    @router.post("/venues/{venue_id}/hr/hiring/jobs/{job_id}/apply")
    async def submit_application(
        venue_id: str,
        job_id: str,
        application: CandidateApplicationRequest,
        current_user: dict = Depends(get_current_user)
    ):
        """Submit a candidate application."""
        candidate = {
            "id": f"app-{uuid.uuid4().hex[:12]}",
            "venue_id": venue_id,
            "job_id": job_id,
            "candidate_name": application.candidate_name,
            "candidate_email": application.candidate_email,
            "candidate_phone": application.candidate_phone,
            "cover_letter": application.cover_letter,
            "cv_url": application.cv_url,
            "screening_answers": application.screening_answers,
            "pipeline_stage": "applied",
            "scorecard": [],
            "notes": [],
            "rating": None,
            "source": "direct",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }

        await db.job_applications.insert_one(candidate)
        # Increment applicant count
        await db.job_postings.update_one(
            {"id": job_id, "venue_id": venue_id},
            {"$inc": {"applicant_count": 1}}
        )
        return candidate

    @router.get("/venues/{venue_id}/hr/hiring/jobs/{job_id}/applicants")
    async def list_applicants(
        venue_id: str,
        job_id: str,
        stage: Optional[str] = None,
        current_user: dict = Depends(get_current_user)
    ):
        """List all applicants for a job posting."""
        await check_venue_access(current_user, venue_id)

        query = {"venue_id": venue_id, "job_id": job_id}
        if stage:
            query["pipeline_stage"] = stage

        applicants = await db.job_applications.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
        return applicants

    @router.put("/venues/{venue_id}/hr/hiring/applicants/{app_id}/move")
    async def move_applicant_stage(
        venue_id: str,
        app_id: str,
        body: dict,
        current_user: dict = Depends(get_current_user)
    ):
        """Move an applicant to a different pipeline stage."""
        await check_venue_access(current_user, venue_id)
        new_stage = body.get("stage", "screening")

        await db.job_applications.update_one(
            {"id": app_id, "venue_id": venue_id},
            {
                "$set": {"pipeline_stage": new_stage, "updated_at": datetime.now(timezone.utc).isoformat()},
                "$push": {"notes": {"action": f"Moved to {new_stage}", "by": current_user["id"], "at": datetime.now(timezone.utc).isoformat()}}
            }
        )
        return {"message": f"Applicant moved to {new_stage}"}

    # ═══════════════════════════════════════════════════════
    # SCORECARDS & EVALUATIONS
    # ═══════════════════════════════════════════════════════

    @router.post("/venues/{venue_id}/hr/hiring/applicants/{app_id}/scorecard")
    async def add_scorecard(
        venue_id: str,
        app_id: str,
        scorecard: List[ScorecardEntry],
        current_user: dict = Depends(get_current_user)
    ):
        """Add interview scorecard for an applicant."""
        await check_venue_access(current_user, venue_id)

        entry = {
            "evaluator_id": current_user["id"],
            "evaluator_name": current_user.get("name", "Unknown"),
            "entries": [s.model_dump() for s in scorecard],
            "overall_rating": sum(s.rating for s in scorecard) / len(scorecard) if scorecard else 0,
            "created_at": datetime.now(timezone.utc).isoformat()
        }

        await db.job_applications.update_one(
            {"id": app_id, "venue_id": venue_id},
            {"$push": {"scorecard": entry}}
        )
        return {"message": "Scorecard added", "overall_rating": entry["overall_rating"]}

    # ═══════════════════════════════════════════════════════
    # PUBLIC CAREER PAGE (No auth required)
    # ═══════════════════════════════════════════════════════

    @router.get("/public/careers/{venue_id}")
    async def public_career_page(venue_id: str):
        """Public-facing career page — shows all published jobs for a venue."""
        jobs = await db.job_postings.find(
            {"venue_id": venue_id, "status": "published"},
            {"_id": 0, "screening_questions": 0, "pipeline_stages": 0, "created_by": 0}
        ).sort("created_at", -1).to_list(100)

        venue = await db.venues.find_one({"id": venue_id}, {"_id": 0, "name": 1, "logo_url": 1, "description": 1})

        return {
            "venue": venue or {"name": venue_id},
            "open_positions": len(jobs),
            "jobs": jobs
        }

    # ═══════════════════════════════════════════════════════
    # HIRING DASHBOARD / ANALYTICS
    # ═══════════════════════════════════════════════════════

    @router.get("/venues/{venue_id}/hr/hiring/dashboard")
    async def hiring_dashboard(
        venue_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        """Get hiring analytics dashboard data."""
        await check_venue_access(current_user, venue_id)

        total_jobs = await db.job_postings.count_documents({"venue_id": venue_id})
        active_jobs = await db.job_postings.count_documents({"venue_id": venue_id, "status": "published"})
        total_applicants = await db.job_applications.count_documents({"venue_id": venue_id})

        # Pipeline breakdown
        pipeline_counts = {}
        for stage in ["applied", "screening", "interview", "evaluation", "offer", "hired", "rejected"]:
            pipeline_counts[stage] = await db.job_applications.count_documents(
                {"venue_id": venue_id, "pipeline_stage": stage}
            )

        return {
            "total_jobs": total_jobs,
            "active_jobs": active_jobs,
            "total_applicants": total_applicants,
            "pipeline_breakdown": pipeline_counts,
            "conversion_rate": round(pipeline_counts.get("hired", 0) / max(total_applicants, 1) * 100, 1)
        }

    return router
