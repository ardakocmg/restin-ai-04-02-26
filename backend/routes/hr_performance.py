"""Performance Review & Goals Routes"""
from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
from datetime import datetime, timezone

from core.database import db
from core.dependencies import get_current_user, check_venue_access
from models.hr_performance import Goal, PerformanceReview, Feedback360, GoalStatus, ReviewStatus, GoalRequest


def create_hr_performance_router():
    router = APIRouter(tags=["hr_performance"])
    
    @router.post("/venues/{venue_id}/hr/goals")
    async def create_goal(
        venue_id: str,
        goal_data: GoalRequest,
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        goal = Goal(
            venue_id=venue_id,
            employee_id=goal_data.employee_id,
            goal_title=goal_data.goal_title,
            description=goal_data.description,
            target_date=goal_data.target_date,
            kpis=goal_data.kpis,
            created_by=current_user["id"]
        )
        
        await db.goals.insert_one(goal.model_dump())
        return goal.model_dump()
    
    @router.get("/venues/{venue_id}/hr/goals")
    async def list_goals(
        venue_id: str,
        employee_id: Optional[str] = None,
        status: Optional[str] = None,
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        query = {"venue_id": venue_id}
        if employee_id:
            query["employee_id"] = employee_id
        if status:
            query["status"] = status
        
        goals = await db.goals.find(query, {"_id": 0}).to_list(1000)
        return goals
    
    @router.put("/venues/{venue_id}/hr/goals/{goal_id}")
    async def update_goal(
        venue_id: str,
        goal_id: str,
        goal_data: dict,
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        goal_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        await db.goals.update_one(
            {"id": goal_id, "venue_id": venue_id},
            {"$set": goal_data}
        )
        
        return {"message": "Goal updated"}
    
    @router.post("/venues/{venue_id}/hr/reviews")
    async def create_performance_review(
        venue_id: str,
        review_data: dict,
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        review = PerformanceReview(
            venue_id=venue_id,
            employee_id=review_data["employee_id"],
            employee_name=review_data["employee_name"],
            review_period_start=review_data["review_period_start"],
            review_period_end=review_data["review_period_end"],
            reviewer_id=current_user["id"],
            reviewer_name=current_user.get("name", "Unknown"),
            review_type=review_data["review_type"],
            questions=review_data.get("questions", [])
        )
        
        await db.performance_reviews.insert_one(review.model_dump())
        return review.model_dump()
    
    @router.get("/venues/{venue_id}/hr/reviews")
    async def list_performance_reviews(
        venue_id: str,
        employee_id: Optional[str] = None,
        status: Optional[str] = None,
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        query = {"venue_id": venue_id}
        if employee_id:
            query["employee_id"] = employee_id
        if status:
            query["status"] = status
        
        reviews = await db.performance_reviews.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
        return reviews
    
    @router.post("/venues/{venue_id}/hr/reviews/{review_id}/complete")
    async def complete_review(
        venue_id: str,
        review_id: str,
        review_data: dict,
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        # Calculate overall rating
        questions = review_data.get("questions", [])
        ratings = [q.get("rating", 0) for q in questions if q.get("rating")]
        overall_rating = sum(ratings) / len(ratings) if ratings else None
        
        await db.performance_reviews.update_one(
            {"id": review_id, "venue_id": venue_id},
            {
                "$set": {
                    "status": "completed",
                    "questions": questions,
                    "overall_rating": overall_rating,
                    "strengths": review_data.get("strengths", []),
                    "areas_for_improvement": review_data.get("areas_for_improvement", []),
                    "goals_for_next_period": review_data.get("goals_for_next_period", []),
                    "completed_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        
        return {"message": "Review completed", "overall_rating": overall_rating}
    
    @router.post("/venues/{venue_id}/hr/reviews/{review_id}/acknowledge")
    async def acknowledge_review(
        venue_id: str,
        review_id: str,
        acknowledgement_data: dict,
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        await db.performance_reviews.update_one(
            {"id": review_id, "venue_id": venue_id},
            {
                "$set": {
                    "status": "acknowledged",
                    "acknowledged_by_employee": True,
                    "acknowledged_at": datetime.now(timezone.utc).isoformat(),
                    "employee_comments": acknowledgement_data.get("comments")
                }
            }
        )
        
        return {"message": "Review acknowledged"}
    
    @router.post("/venues/{venue_id}/hr/360-feedback")
    async def create_360_feedback(
        venue_id: str,
        feedback_data: dict,
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        # Calculate aggregated rating
        feedbacks = feedback_data.get("feedbacks", [])
        ratings = [f.get("rating", 0) for f in feedbacks if f.get("rating")]
        aggregated_rating = sum(ratings) / len(ratings) if ratings else None
        
        feedback_360 = Feedback360(
            venue_id=venue_id,
            employee_id=feedback_data["employee_id"],
            review_cycle=feedback_data["review_cycle"],
            feedbacks=feedbacks,
            aggregated_rating=aggregated_rating
        )
        
        await db.feedback_360.insert_one(feedback_360.model_dump())
        return feedback_360.model_dump()
    
    @router.get("/venues/{venue_id}/hr/360-feedback")
    async def list_360_feedback(
        venue_id: str,
        employee_id: Optional[str] = None,
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        
        query = {"venue_id": venue_id}
        if employee_id:
            query["employee_id"] = employee_id
        
        feedback = await db.Feedback360.find(query, {"_id": 0}).to_list(1000)
        return feedback
    
    return router
