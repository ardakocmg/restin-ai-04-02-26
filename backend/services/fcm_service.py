"""Firebase Cloud Messaging (FCM) Service - Mobile Push Notifications"""
import os
import logging
from typing import Dict, List, Optional
from datetime import datetime, timezone

from core.database import db

logger = logging.getLogger(__name__)

# FCM Configuration
FCM_SERVER_KEY = os.getenv("FCM_SERVER_KEY", "")
FCM_API_URL = "https://fcm.googleapis.com/fcm/send"


class FCMService:
    """
    Firebase Cloud Messaging service for iOS/Android push notifications.
    
    Setup:
    1. Create Firebase project at https://console.firebase.google.com
    2. Go to Project Settings > Cloud Messaging
    3. Copy "Server Key" to .env as FCM_SERVER_KEY
    """
    
    def __init__(self):
        self.service_name = "FCMService"
        self.server_key = FCM_SERVER_KEY
        self.enabled = bool(self.server_key and self.server_key != "YOUR_FCM_SERVER_KEY")
    
    async def initialize(self):
        """Initialize FCM service"""
        if not self.enabled:
            logger.warning("⚠️ FCMService: FCM_SERVER_KEY not configured. Mobile push disabled.")
        else:
            logger.info("✓ FCMService: Firebase Cloud Messaging ready")
    
    async def register_device(
        self,
        user_id: str,
        device_token: str,
        platform: str = "android",  # android | ios | web
        device_name: Optional[str] = None
    ) -> Dict:
        """
        Register device token for push notifications.
        Called by mobile app after FCM SDK initialization.
        """
        device_record = {
            "user_id": user_id,
            "device_token": device_token,
            "platform": platform,
            "device_name": device_name or f"{platform}_device",
            "registered_at": datetime.now(timezone.utc).isoformat(),
            "active": True
        }
        
        # Upsert - update if token exists, insert if new
        await db.fcm_devices.update_one(
            {"device_token": device_token},
            {"$set": device_record},
            upsert=True
        )
        
        logger.info(f"📱 FCM: Device registered for user {user_id} ({platform})")
        return device_record
    
    async def unregister_device(self, device_token: str):
        """Unregister device (logout, app uninstall)"""
        await db.fcm_devices.update_one(
            {"device_token": device_token},
            {"$set": {"active": False, "unregistered_at": datetime.now(timezone.utc).isoformat()}}
        )
        logger.info(f"📱 FCM: Device unregistered")
    
    async def get_user_devices(self, user_id: str) -> List[Dict]:
        """Get all active devices for a user"""
        devices = await db.fcm_devices.find(
            {"user_id": user_id, "active": True}
        ).to_list(100)
        return devices
    
    async def send_push(
        self,
        user_id: str,
        title: str,
        body: str,
        data: Optional[Dict] = None,
        image_url: Optional[str] = None
    ) -> Dict:
        """
        Send push notification to all user devices via FCM.
        """
        if not self.enabled:
            logger.debug(f"📱 FCM [SIMULATION]: Would send to {user_id}: {title}")
            return {"status": "simulated", "user_id": user_id}
        
        # Get user's device tokens
        devices = await self.get_user_devices(user_id)
        
        if not devices:
            logger.debug(f"📱 FCM: No registered devices for user {user_id}")
            return {"status": "no_devices", "user_id": user_id}
        
        tokens = [d["device_token"] for d in devices]
        
        # Build FCM payload
        payload = {
            "registration_ids": tokens,
            "notification": {
                "title": title,
                "body": body,
                "sound": "default",
                "badge": 1
            },
            "data": data or {},
            "priority": "high"
        }
        
        if image_url:
            payload["notification"]["image"] = image_url
        
        # Send via FCM API
        try:
            import httpx
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    FCM_API_URL,
                    headers={
                        "Authorization": f"key={self.server_key}",
                        "Content-Type": "application/json"
                    },
                    json=payload,
                    timeout=10.0
                )
                
                result = response.json()
                
                # Log result
                push_log = {
                    "user_id": user_id,
                    "title": title,
                    "body": body,
                    "devices_count": len(tokens),
                    "success": result.get("success", 0),
                    "failure": result.get("failure", 0),
                    "sent_at": datetime.now(timezone.utc).isoformat()
                }
                await db.fcm_logs.insert_one(push_log)
                
                logger.info(f"📱 FCM: Sent to {result.get('success', 0)}/{len(tokens)} devices for {user_id}")
                return result
                
        except Exception as e:
            logger.error(f"📱 FCM Error: {e}")
            return {"status": "error", "error": str(e)}
    
    async def send_to_topic(
        self,
        topic: str,
        title: str,
        body: str,
        data: Optional[Dict] = None
    ) -> Dict:
        """
        Send push to FCM topic (e.g., 'venue_123', 'all_staff').
        Users subscribe to topics via mobile app.
        """
        if not self.enabled:
            logger.debug(f"📱 FCM [SIMULATION]: Would send to topic {topic}: {title}")
            return {"status": "simulated", "topic": topic}
        
        payload = {
            "to": f"/topics/{topic}",
            "notification": {
                "title": title,
                "body": body,
                "sound": "default"
            },
            "data": data or {}
        }
        
        try:
            import httpx
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    FCM_API_URL,
                    headers={
                        "Authorization": f"key={self.server_key}",
                        "Content-Type": "application/json"
                    },
                    json=payload,
                    timeout=10.0
                )
                
                logger.info(f"📱 FCM: Sent to topic {topic}")
                return response.json()
                
        except Exception as e:
            logger.error(f"📱 FCM Topic Error: {e}")
            return {"status": "error", "error": str(e)}


# Global instance
fcm_service = FCMService()
