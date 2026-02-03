"""
Backup Routes - Manual backup triggers and status
"""

from fastapi import APIRouter, Depends, HTTPException
from core.dependencies import get_current_user
from core.database import db
from services.backup_service import BackupService
from datetime import datetime, timezone

def create_backup_router():
    router = APIRouter(prefix="/backup", tags=["backup"])
    backup_service = BackupService(db)
    
    @router.post("/snapshot")
    async def create_manual_snapshot(
        venue_id: str = None,
        current_user: dict = Depends(get_current_user)
    ):
        """Create manual backup snapshot"""
        try:
            result = await backup_service.create_snapshot(venue_id)
            return {
                "success": True,
                "snapshot": result
            }
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
    
    @router.get("/list")
    async def list_backups(
        venue_id: str = None,
        current_user: dict = Depends(get_current_user)
    ):
        """List all backups"""
        query = {}
        if venue_id:
            query["venue_id"] = venue_id
        
        backups = await db.backups.find(query, {"_id": 0}).sort("created_at", -1).limit(50).to_list(50)
        return {
            "success": True,
            "backups": backups
        }
    
    @router.get("/status")
    async def get_backup_status(current_user: dict = Depends(get_current_user)):
        """Get backup system status"""
        # Count backups by status
        pipeline = [
            {"$group": {
                "_id": "$status",
                "count": {"$sum": 1}
            }}
        ]
        
        stats = await db.backups.aggregate(pipeline).to_list(10)
        stats_dict = {s["_id"]: s["count"] for s in stats}
        
        # Get latest backup
        latest = await db.backups.find_one({}, {"_id": 0}, sort=[("created_at", -1)])
        
        return {
            "success": True,
            "stats": stats_dict,
            "latest_backup": latest,
            "total_backups": sum(stats_dict.values())
        }
    
    @router.post("/cleanup")
    async def cleanup_old_backups(current_user: dict = Depends(get_current_user)):
        """Manually trigger backup cleanup"""
        try:
            deleted = await backup_service.cleanup_old_backups()
            return {
                "success": True,
                "deleted_count": deleted
            }
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
    
    return router
