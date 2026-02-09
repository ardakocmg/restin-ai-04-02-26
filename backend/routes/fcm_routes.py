"""FCM Routes - Device registration and push notification endpoints"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, Dict, List
import logging

from services.fcm_service import fcm_service
from core.dependencies import get_current_user

logger = logging.getLogger(__name__)


class DeviceRegisterRequest(BaseModel):
    device_token: str
    platform: str = "android"  # android | ios | web
    device_name: Optional[str] = None


class PushNotificationRequest(BaseModel):
    user_id: str
    title: str
    body: str
    data: Optional[Dict] = None
    image_url: Optional[str] = None


class TopicPushRequest(BaseModel):
    topic: str
    title: str
    body: str
    data: Optional[Dict] = None


def create_fcm_router():
    router = APIRouter(prefix="/fcm", tags=["fcm"])
    
    @router.post("/register")
    async def register_device(
        request: DeviceRegisterRequest,
        current_user: dict = Depends(get_current_user)
    ):
        """
        Register device for push notifications.
        Called by mobile app after FCM SDK initialization.
        
        Mobile app should call this:
        1. On app launch after login
        2. When FCM token refreshes
        """
        user_id = current_user.get("user_id") or current_user.get("id")
        
        result = await fcm_service.register_device(
            user_id=user_id,
            device_token=request.device_token,
            platform=request.platform,
            device_name=request.device_name
        )
        
        return {"status": "registered", "device": result}
    
    @router.post("/unregister")
    async def unregister_device(
        device_token: str,
        current_user: dict = Depends(get_current_user)
    ):
        """Unregister device (logout)"""
        await fcm_service.unregister_device(device_token)
        return {"status": "unregistered"}
    
    @router.get("/devices")
    async def get_my_devices(
        current_user: dict = Depends(get_current_user)
    ):
        """Get all registered devices for current user"""
        user_id = current_user.get("user_id") or current_user.get("id")
        devices = await fcm_service.get_user_devices(user_id)
        return {"devices": devices}
    
    @router.post("/send")
    async def send_push_notification(
        request: PushNotificationRequest,
        current_user: dict = Depends(get_current_user)
    ):
        """
        Send push notification to a user (admin only).
        For testing and manual notifications.
        """
        # Admin role check: only managers+ can send manual push notifications
        admin_roles = {"owner", "general_manager", "manager", "it_admin"}
        current_role = current_user.get("role", "staff")
        if current_role not in admin_roles:
            raise HTTPException(status_code=403, detail="Admin role required to send push notifications")
        
        result = await fcm_service.send_push(
            user_id=request.user_id,
            title=request.title,
            body=request.body,
            data=request.data,
            image_url=request.image_url
        )
        return result
    
    @router.post("/topic")
    async def send_to_topic(
        request: TopicPushRequest,
        current_user: dict = Depends(get_current_user)
    ):
        """
        Send push notification to a topic.
        Topics: venue_{id}, role_{name}, all_staff
        """
        result = await fcm_service.send_to_topic(
            topic=request.topic,
            title=request.title,
            body=request.body,
            data=request.data
        )
        return result
    
    @router.get("/status")
    async def fcm_status():
        """Check FCM service status"""
        return {
            "enabled": fcm_service.enabled,
            "message": "FCM configured" if fcm_service.enabled else "FCM_SERVER_KEY not set"
        }
    
    return router
