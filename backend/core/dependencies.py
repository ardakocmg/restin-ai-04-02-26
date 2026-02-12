from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from core.security import verify_jwt_token
from core.database import get_database

security = HTTPBearer()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    payload = verify_jwt_token(token)
    
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "INVALID_TOKEN", "message": "Invalid or expired token"}
        )
    
    db = get_database()
    user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "USER_NOT_FOUND", "message": "User not found"}
        )
    
    return user

async def check_venue_access(user: dict, venue_id: str):
    # 0. "all" is org-wide (payroll, reports) — allow if user has any venue access
    if venue_id == "all":
        return
    
    # 1. Allow System/Global users
    if user.get("venue_id") == "system" or user.get("venue_id") == "GLOBAL":
        return
    
    # 2. Allow Product Owner (Superuser)
    if user.get("role") in ["product_owner", "PRODUCT_OWNER"]:
        return

    # 3. Allow Owner/Manager with multi-venue access
    if user.get("role") in ["OWNER", "MANAGER", "owner", "manager"]:
        allowed = user.get("allowed_venue_ids", [])
        if venue_id in allowed:
            return
        
    # 4. Direct Venue Match
    if user.get("venue_id") == venue_id:
        return
        
    # 5. Allowed Venues List
    allowed = user.get("allowed_venue_ids", [])
    if venue_id in allowed:
        return
        
    # 6. Deny
    print(f"❌ Access Denied: User {user.get('name')} (role={user.get('role')}, venue={user.get('venue_id')}) tried to access {venue_id}. Allowed: {user.get('allowed_venue_ids')}")
    raise HTTPException(status_code=403, detail="Access denied")
