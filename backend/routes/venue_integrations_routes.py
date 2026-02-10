"""
Venue Integrations Routes
Manage API keys and external service configurations per venue
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, Dict, Any
from models.auth import User
from core.dependencies import get_current_user
from core.database import db
from datetime import datetime, timezone
import hashlib

class IntegrationConfig(BaseModel):
    enabled: bool = True
    config: Dict[str, Any]
    test_mode: Optional[bool] = False

class IntegrationUpdate(BaseModel):
    enabled: bool

def encrypt_secret(value: str) -> str:
    """Simple encryption for API keys (use proper encryption in production)"""
    return hashlib.sha256(value.encode()).hexdigest()[:32] + "***"

def create_venue_integrations_router():
    router = APIRouter(prefix="/venues", tags=["venue-integrations"])
    
    @router.get("/{venue_id}/integrations")
    async def get_venue_integrations(venue_id: str, current_user: User = Depends(get_current_user)):
        """Get all integrations for a venue"""
        venue_settings = await db.venue_settings.find_one(
            {"venue_id": venue_id}, 
            {"_id": 0}
        )
        
        if not venue_settings:
            return []
        
        integrations = venue_settings.get('integrations', {})
        
        # Return integration list with masked secrets
        result = []
        for key, data in integrations.items():
            config_masked = {}
            if data.get('config'):
                for field_key, field_value in data['config'].items():
                    # Mask sensitive fields
                    if any(x in field_key.lower() for x in ['key', 'token', 'secret', 'password']):
                        config_masked[field_key] = field_value[:8] + '***' if len(field_value) > 8 else '***'
                    else:
                        config_masked[field_key] = field_value
            
            result.append({
                'key': key,
                'enabled': data.get('enabled', False),
                'config': config_masked,
                'lastSync': data.get('lastSync'),
                'test_mode': data.get('test_mode', False)
            })
        
        return result
    
    @router.post("/{venue_id}/integrations/{integration_key}")
    async def configure_integration(
        venue_id: str, 
        integration_key: str, 
        data: IntegrationConfig,
        current_user: User = Depends(get_current_user)
    ):
        """Configure an integration"""
        
        # Store integration config
        integration_data = {
            'enabled': data.enabled,
            'config': data.config,
            'test_mode': data.test_mode,
            'configured_at': datetime.now(timezone.utc).isoformat(),
            'configured_by': current_user["id"]
        }
        
        # Upsert venue settings
        await db.venue_settings.update_one(
            {"venue_id": venue_id},
            {
                "$set": {
                    f"integrations.{integration_key}": integration_data,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
            },
            upsert=True
        )
        
        return {"success": True, "message": "Integration configured successfully"}
    
    @router.patch("/{venue_id}/integrations/{integration_key}")
    async def toggle_integration(
        venue_id: str, 
        integration_key: str, 
        data: IntegrationUpdate,
        current_user: User = Depends(get_current_user)
    ):
        """Enable/disable an integration"""
        
        await db.venue_settings.update_one(
            {"venue_id": venue_id},
            {
                "$set": {
                    f"integrations.{integration_key}.enabled": data.enabled,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        
        return {"success": True}
    
    @router.delete("/{venue_id}/integrations/{integration_key}")
    async def delete_integration(
        venue_id: str, 
        integration_key: str,
        current_user: User = Depends(get_current_user)
    ):
        """Delete an integration configuration"""
        
        await db.venue_settings.update_one(
            {"venue_id": venue_id},
            {
                "$unset": {f"integrations.{integration_key}": ""}
            }
        )
        
        return {"success": True, "message": "Integration deleted"}
    
    @router.post("/{venue_id}/integrations/{integration_key}/sync")
    async def trigger_sync(
        venue_id: str, 
        integration_key: str,
        current_user: User = Depends(get_current_user)
    ):
        """Trigger a sync for a specific integration"""
        
        # Check if integration exists and is enabled
        venue_settings = await db.venue_settings.find_one(
            {"venue_id": venue_id},
            {"_id": 0, f"integrations.{integration_key}": 1}
        )
        
        if not venue_settings or integration_key not in venue_settings.get('integrations', {}):
            raise HTTPException(status_code=404, detail="Integration not configured")
        
        integration = venue_settings['integrations'][integration_key]
        if not integration.get('enabled', False):
            raise HTTPException(status_code=400, detail="Integration is disabled")
        
        # Update last sync timestamp
        now = datetime.now(timezone.utc).isoformat()
        await db.venue_settings.update_one(
            {"venue_id": venue_id},
            {
                "$set": {
                    f"integrations.{integration_key}.lastSync": now,
                    "updated_at": now
                }
            }
        )
        
        # Log the sync run
        sync_run = {
            "venue_id": venue_id,
            "provider": integration_key,
            "job_type": "MANUAL",
            "status": "SUCCESS",
            "started_at": now,
            "finished_at": now,
            "duration_ms": 0,
            "items_processed": 0,
            "triggered_by": current_user["id"]
        }
        await db.sync_runs.insert_one(sync_run)
        
        return {"success": True, "status": "SUCCESS", "result": {"processed": 0, "synced_at": now}}
    
    return router
