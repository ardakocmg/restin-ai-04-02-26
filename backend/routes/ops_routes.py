from fastapi import APIRouter
from typing import Dict, Any, List
import random

router = APIRouter(prefix="/ops", tags=["Operations (Pillar 7)"])

@router.get("/metrics")
async def get_ops_metrics(venue_id: str):
    """
    Get Real-time Operational KPIs.
    """
    # Mock Logic: In real system, this queries Order analytics and HR Clocking data
    return [
        {"label": "Avg Prep Time", "value": "12m", "target": "< 15m", "status": "Optimal", "icon": "Clock"},
        {"label": "Error Rate", "value": "0.2%", "target": "< 1%", "status": "Healthy", "icon": "AlertCircle"},
        {"label": "Labor Cost", "value": "28.4%", "target": "30%", "status": "On Track", "icon": "Activity"},
    ]

@router.get("/logs")
async def get_ops_logs(venue_id: str):
    """
    Get latest operational event logs (Auto-generated).
    """
    return [
        {"time": "12:42", "type": "order", "msg": "UberEats #422 injected to KDS"},
        {"time": "12:40", "type": "alert", "msg": "Labour cost spike detected (32%)"},
        {"time": "12:35", "type": "success", "msg": "Auto-sync with apicbase completed"},
        {"time": "12:30", "type": "order", "msg": "Wolt #112 marked ready for pickup"},
    ]
