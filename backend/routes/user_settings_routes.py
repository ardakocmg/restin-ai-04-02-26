"""
2FA (Two-Factor Authentication) Routes
Google Authenticator integration
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
import pyotp
import qrcode
import io
import base64
import secrets
from models.auth import User
from core.dependencies import get_current_user
from core.database import db

class Enable2FARequest(BaseModel):
    method: str = 'google_authenticator'

class Verify2FARequest(BaseModel):
    token: str

class Disable2FARequest(BaseModel):
    password: str

def create_2fa_router():
    router = APIRouter(prefix="/users", tags=["2fa"])
    
    @router.post("/{user_id}/2fa/enable")
    async def enable_2fa(user_id: str, data: Enable2FARequest, current_user: User = Depends(get_current_user)):
        """Enable 2FA for user"""
        if current_user.id != user_id:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        # Generate secret
        secret = pyotp.random_base32()
        
        # Generate QR code
        totp = pyotp.TOTP(secret)
        provisioning_uri = totp.provisioning_uri(
            name=current_user.email or current_user.name,
            issuer_name="restin.ai"
        )
        
        # Generate QR code image
        qr = qrcode.QRCode(version=1, box_size=10, border=5)
        qr.add_data(provisioning_uri)
        qr.make(fit=True)
        img = qr.make_image(fill_color="black", back_color="white")
        
        # Convert to base64
        buffer = io.BytesIO()
        img.save(buffer, format='PNG')
        qr_code_base64 = base64.b64encode(buffer.getvalue()).decode()
        
        # Generate backup codes
        backup_codes = [secrets.token_hex(4).upper() for _ in range(10)]
        
        # Store secret temporarily (will be confirmed after verification)
        await db.users.update_one(
            {"id": user_id},
            {"$set": {
                "mfa_secret_temp": secret,
                "mfa_backup_codes": backup_codes
            }}
        )
        
        return {
            "qrCode": f"data:image/png;base64,{qr_code_base64}",
            "secret": secret,
            "backupCodes": backup_codes
        }
    
    @router.post("/{user_id}/2fa/verify")
    async def verify_2fa(user_id: str, data: Verify2FARequest, current_user: User = Depends(get_current_user)):
        """Verify 2FA token and enable it"""
        if current_user.id != user_id:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        # Get temp secret
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if not user or not user.get('mfa_secret_temp'):
            raise HTTPException(status_code=400, detail="2FA setup not initiated")
        
        # Verify token
        totp = pyotp.TOTP(user['mfa_secret_temp'])
        if not totp.verify(data.token, valid_window=1):
            return {"verified": False}
        
        # Enable 2FA
        await db.users.update_one(
            {"id": user_id},
            {"$set": {
                "mfa_enabled": True,
                "mfa_secret": user['mfa_secret_temp']
            },
             "$unset": {"mfa_secret_temp": ""}}
        )
        
        return {"verified": True}
    
    @router.post("/{user_id}/2fa/disable")
    async def disable_2fa(user_id: str, data: Disable2FARequest, current_user: User = Depends(get_current_user)):
        """Disable 2FA"""
        if current_user.id != user_id:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        # Verify password before disabling 2FA
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        stored_hash = user.get("password_hash") or user.get("pin_hash")
        if stored_hash:
            import hashlib
            # Support both PIN and password verification
            input_hash = hashlib.sha256(data.password.encode()).hexdigest()
            if input_hash != stored_hash:
                raise HTTPException(status_code=401, detail="Invalid password")
        
        await db.users.update_one(
            {"id": user_id},
            {"$set": {"mfa_enabled": False},
             "$unset": {"mfa_secret": "", "mfa_backup_codes": ""}}
        )
        
        return {"success": True}
    
    @router.get("/{user_id}/settings")
    async def get_user_settings(user_id: str, current_user: User = Depends(get_current_user)):
        """Get user settings"""
        if current_user.id != user_id:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        return {
            "theme": user.get('theme', 'light'),
            "language": user.get('language', 'en'),
            "fontSize": user.get('fontSize', 'medium'),
            "compactMode": user.get('compactMode', False),
            "emailNotifications": user.get('emailNotifications', True),
            "pushNotifications": user.get('pushNotifications', False),
            "smsNotifications": user.get('smsNotifications', False),
            "mfaEnabled": user.get('mfa_enabled', False),
            "mfaMethod": user.get('mfa_method', None),
            "showOnlineStatus": user.get('showOnlineStatus', True),
            "allowAnalytics": user.get('allowAnalytics', True),
            "highContrast": user.get('highContrast', False),
            "reducedMotion": user.get('reducedMotion', False),
            "keyboardShortcuts": user.get('keyboardShortcuts', True)
        }
    
    @router.patch("/{user_id}/settings")
    async def update_user_settings(user_id: str, settings: dict, current_user: User = Depends(get_current_user)):
        """Update user settings"""
        if current_user.id != user_id:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        await db.users.update_one(
            {"id": user_id},
            {"$set": settings}
        )
        
        return {"success": True}
    
    @router.patch("/{user_id}/profile")
    async def update_user_profile(user_id: str, profile: dict, current_user: User = Depends(get_current_user)):
        """Update user profile (name, email, phone only)"""
        if current_user.id != user_id:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        # Whitelist safe fields only
        allowed = {"name", "email", "phone"}
        safe_update = {k: v for k, v in profile.items() if k in allowed}
        if not safe_update:
            raise HTTPException(status_code=400, detail="No valid fields to update")
        
        await db.users.update_one(
            {"id": user_id},
            {"$set": safe_update}
        )
        
        return {"success": True, "updated": list(safe_update.keys())}
    
    return router
