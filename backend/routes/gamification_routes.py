"""
Gamification Routes — Leaderboard, Quests & XP API
Rule #38: Staff Leaderboards, Quests, and Daily Goals
"""
from fastapi import APIRouter, Depends, Query
from core.dependencies import get_current_user, get_database
from datetime import datetime, timezone, timedelta
import logging
import math

logger = logging.getLogger(__name__)

# ─── XP Constants (mirror frontend gamification.ts) ──────────────────────
XP_TABLE = {
    "SALE_MULTIPLIER": 0.1,
    "TASK_COMPLETE": 50,
    "SHIFT_ON_TIME": 100,
    "FIVE_STAR_REVIEW": 200,
    "UPSELL_BONUS": 75,
}

LEVEL_FORMULA = lambda lvl: int(1000 * math.pow(lvl, 1.5))

LEVEL_TITLES = [
    (2, "Rookie"),
    (5, "Apprentice"),
    (10, "Veteran"),
    (20, "Expert"),
    (50, "Master"),
]


def get_level_from_xp(xp: int) -> int:
    """Calculate level from total XP."""
    level = 1
    while xp >= LEVEL_FORMULA(level):
        level += 1
    return level


def get_level_title(level: int) -> str:
    for threshold, title in LEVEL_TITLES:
        if level <= threshold:
            return title
    return "Legend"


def create_gamification_router():
    router = APIRouter(prefix="/gamification", tags=["gamification"])

    @router.get("/leaderboard/{venue_id}")
    async def get_leaderboard(
        venue_id: str,
        period: str = Query("weekly", enum=["daily", "weekly", "monthly", "all"]),
        current_user: dict = Depends(get_current_user),
        db=Depends(get_database),
    ):
        """Build leaderboard from real user/task/shift data."""
        try:
            now = datetime.now(timezone.utc)
            if period == "daily":
                start = now.replace(hour=0, minute=0, second=0, microsecond=0)
            elif period == "weekly":
                start = (now - timedelta(days=now.weekday())).replace(
                    hour=0, minute=0, second=0, microsecond=0
                )
            elif period == "monthly":
                start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            else:
                start = datetime(2020, 1, 1, tzinfo=timezone.utc)

            # Get all staff for this venue
            users = await db.users.find(
                {"venue_id": venue_id, "deletedAt": {"$exists": False}},
                {"_id": 0, "id": 1, "name": 1, "role": 1, "avatar": 1},
            ).to_list(length=100)

            if not users:
                return {"leaderboard": [], "total_xp": 0}

            user_ids = [u["id"] for u in users]

            # Aggregate XP from completed tasks
            task_pipeline = [
                {
                    "$match": {
                        "venue_id": venue_id,
                        "status": "DONE",
                        "assignee_id": {"$in": user_ids},
                        "completed_at": {"$gte": start.isoformat()},
                    }
                },
                {
                    "$group": {
                        "_id": "$assignee_id",
                        "task_xp": {"$sum": "$xp"},
                        "tasks_completed": {"$sum": 1},
                    }
                },
            ]
            task_results = await db.tasks.aggregate(task_pipeline).to_list(length=100)
            task_map = {r["_id"]: r for r in task_results}

            # Aggregate XP from shifts (on-time bonus)
            shift_pipeline = [
                {
                    "$match": {
                        "venue_id": venue_id,
                        "user_id": {"$in": user_ids},
                        "clock_in": {"$gte": start.isoformat()},
                    }
                },
                {
                    "$group": {
                        "_id": "$user_id",
                        "shifts": {"$sum": 1},
                    }
                },
            ]
            shift_results = (
                await db.shift_records.aggregate(shift_pipeline).to_list(length=100)
            )
            shift_map = {r["_id"]: r for r in shift_results}

            # Aggregate XP from sales (orders where server_id matches)
            sales_pipeline = [
                {
                    "$match": {
                        "venue_id": venue_id,
                        "server_id": {"$in": user_ids},
                        "status": {"$in": ["closed", "paid", "completed"]},
                        "created_at": {"$gte": start.isoformat()},
                    }
                },
                {
                    "$group": {
                        "_id": "$server_id",
                        "total_sales_cents": {"$sum": "$total"},
                        "order_count": {"$sum": 1},
                    }
                },
            ]
            sales_results = (
                await db.orders.aggregate(sales_pipeline).to_list(length=100)
            )
            sales_map = {r["_id"]: r for r in sales_results}

            # Build leaderboard entries
            leaderboard = []
            colors = [
                "bg-pink-600", "bg-orange-600", "bg-blue-600",
                "bg-teal-600", "bg-purple-600", "bg-violet-600",
                "bg-rose-600", "bg-cyan-600", "bg-amber-600", "bg-lime-600",
            ]

            for idx, user in enumerate(users):
                uid = user["id"]
                name = user.get("name", "Unknown")
                task_data = task_map.get(uid, {"task_xp": 0, "tasks_completed": 0})
                shift_data = shift_map.get(uid, {"shifts": 0})
                sales_data = sales_map.get(uid, {"total_sales_cents": 0, "order_count": 0})

                task_xp = task_data.get("task_xp", 0) or (
                    task_data["tasks_completed"] * XP_TABLE["TASK_COMPLETE"]
                )
                shift_xp = shift_data["shifts"] * XP_TABLE["SHIFT_ON_TIME"]
                sales_xp = int(
                    sales_data.get("total_sales_cents", 0)
                    * XP_TABLE["SALE_MULTIPLIER"]
                )

                total_xp = task_xp + shift_xp + sales_xp
                level = get_level_from_xp(total_xp)


                # Generate initials from name
                parts = name.split()
                initials = (
                    (parts[0][0] + parts[-1][0]).upper()
                    if len(parts) >= 2
                    else name[:2].upper()
                )

                leaderboard.append(
                    {
                        "id": uid,
                        "name": name,
                        "initials": initials,
                        "color": colors[idx % len(colors)],
                        "role": user.get("role", "Staff"),
                        "xp": total_xp,
                        "level": level,
                        "streak": shift_data["shifts"],  # Streak = consecutive shifts
                        "tasksCompleted": task_data["tasks_completed"],
                        "salesXP": sales_xp,
                        "taskXP": task_xp,
                        "shiftXP": shift_xp,
                    }
                )

            # Sort by XP descending
            leaderboard.sort(key=lambda e: e["xp"], reverse=True)
            total_xp = sum(e["xp"] for e in leaderboard)

            return {"leaderboard": leaderboard, "total_xp": total_xp}

        except Exception as e:
            logger.error(f"Gamification leaderboard error: {e}")
            return {"leaderboard": [], "total_xp": 0, "error": str(e)}

    @router.get("/quests/{venue_id}")
    async def get_quests(
        venue_id: str,
        current_user: dict = Depends(get_current_user),
        db=Depends(get_database),
    ):
        """Get active quests dynamically from tasks + venue targets."""
        try:
            now = datetime.now(timezone.utc)
            today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

            user_id = current_user.get("id", "")

            # Get tasks assigned to user that are in progress (live quests)
            active_tasks = (
                await db.tasks.find(
                    {
                        "venue_id": venue_id,
                        "assignee_id": user_id,
                        "status": {"$in": ["TODO", "IN_PROGRESS"]},
                    },
                    {"_id": 0},
                )
                .sort("created_at", -1)
                .to_list(length=10)
            )

            quests = []
            difficulty_map = {
                "LOW": "Easy",
                "MED": "Medium",
                "MEDIUM": "Medium",
                "HIGH": "Hard",
                "CRITICAL": "Epic",
            }
            icon_map = {
                "LOW": "Target",
                "MED": "Zap",
                "MEDIUM": "Zap",
                "HIGH": "Flame",
                "CRITICAL": "Award",
            }

            for task in active_tasks:
                checklist = task.get("checklist_items", [])
                done_count = sum(1 for c in checklist if c.get("done"))
                total = max(len(checklist), 1)
                priority = task.get("priority", "MED")

                # Calculate time remaining
                hours_left = "24h left"
                if task.get("start_at"):
                    try:
                        deadline = datetime.fromisoformat(
                            task["start_at"].replace("Z", "+00:00")
                        )
                        remaining = deadline - now
                        if remaining.total_seconds() > 0:
                            hours = int(remaining.total_seconds() / 3600)
                            hours_left = f"{hours}h left"
                        else:
                            hours_left = "Overdue"
                    except Exception:
                        pass

                quests.append(
                    {
                        "id": task.get("id", ""),
                        "title": task.get("title", "Untitled Task"),
                        "description": task.get("description", ""),
                        "progress": done_count,
                        "goal": total,
                        "rewardXP": task.get("xp", XP_TABLE["TASK_COMPLETE"]),
                        "icon": icon_map.get(priority, "Zap"),
                        "expiresIn": hours_left,
                        "difficulty": difficulty_map.get(priority, "Medium"),
                    }
                )

            # If no real quests, generate dynamic daily quests from venue performance
            if not quests:
                todays_orders = await db.orders.count_documents(
                    {
                        "venue_id": venue_id,
                        "created_at": {"$gte": today_start.isoformat()},
                    }
                )
                todays_tasks_done = await db.tasks.count_documents(
                    {
                        "venue_id": venue_id,
                        "status": "DONE",
                        "completed_at": {"$gte": today_start.isoformat()},
                    }
                )

                quests = [
                    {
                        "id": "dq-orders",
                        "title": "Service Star",
                        "description": "Reach 20 orders today",
                        "progress": min(todays_orders, 20),
                        "goal": 20,
                        "rewardXP": 200,
                        "icon": "Star",
                        "expiresIn": f"{max(0, 24 - now.hour)}h left",
                        "difficulty": "Medium",
                    },
                    {
                        "id": "dq-tasks",
                        "title": "Task Crusher",
                        "description": "Complete 5 tasks today",
                        "progress": min(todays_tasks_done, 5),
                        "goal": 5,
                        "rewardXP": 150,
                        "icon": "Target",
                        "expiresIn": f"{max(0, 24 - now.hour)}h left",
                        "difficulty": "Easy",
                    },
                    {
                        "id": "dq-perfect",
                        "title": "Perfect Shift",
                        "description": "Complete shift with zero incidents",
                        "progress": 0,
                        "goal": 1,
                        "rewardXP": 500,
                        "icon": "Flame",
                        "expiresIn": f"{max(0, 24 - now.hour)}h left",
                        "difficulty": "Hard",
                    },
                ]

            return {"quests": quests, "active_count": len(quests)}

        except Exception as e:
            logger.error(f"Gamification quests error: {e}")
            return {"quests": [], "active_count": 0, "error": str(e)}

    @router.get("/stats/{venue_id}")
    async def get_gamification_stats(
        venue_id: str,
        current_user: dict = Depends(get_current_user),
        db=Depends(get_database),
    ):
        """Get aggregate gamification stats for the venue."""
        try:
            now = datetime.now(timezone.utc)
            week_start = (now - timedelta(days=now.weekday())).replace(
                hour=0, minute=0, second=0, microsecond=0
            )

            staff_count = await db.users.count_documents(
                {"venue_id": venue_id, "deletedAt": {"$exists": False}}
            )

            tasks_done_week = await db.tasks.count_documents(
                {
                    "venue_id": venue_id,
                    "status": "DONE",
                    "completed_at": {"$gte": week_start.isoformat()},
                }
            )

            active_quests = await db.tasks.count_documents(
                {
                    "venue_id": venue_id,
                    "status": {"$in": ["TODO", "IN_PROGRESS"]},
                }
            )

            shifts_week = await db.shift_records.count_documents(
                {
                    "venue_id": venue_id,
                    "clock_in": {"$gte": week_start.isoformat()},
                }
            )

            # Find best streak (max consecutive shifts by any user)
            best_streak = shifts_week  # Simplified: use total shifts as proxy

            return {
                "staff_count": staff_count,
                "tasks_done_week": tasks_done_week,
                "active_quests": active_quests,
                "best_streak": best_streak,
                "shifts_week": shifts_week,
            }

        except Exception as e:
            logger.error(f"Gamification stats error: {e}")
            return {
                "staff_count": 0,
                "tasks_done_week": 0,
                "active_quests": 0,
                "best_streak": 0,
                "shifts_week": 0,
            }

    return router
