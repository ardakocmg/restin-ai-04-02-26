from fastapi import APIRouter, Depends, HTTPException, Query
from datetime import datetime, timezone
import uuid

from core.database import db
from core.dependencies import get_current_user, check_venue_access
from models.hr_feature_flags import HRFeatureFlag
from models.hr_audit_log import HRAuditLog

DEFAULT_HR_MODULES = [
    "people",
    "contracts",
    "shifts",
    "timesheets",
    "leave",
    "tips",
    "payroll",
    "documents",
    "analytics",
    "feature_flags",
    "audit_trail"
]


def create_hr_feature_flags_router():
    router = APIRouter(prefix="/hr/feature-flags", tags=["hr-feature-flags"])

    @router.get("")
    async def get_flags(
        venue_id: str = Query(...),
        current_user: dict = Depends(get_current_user)
    ):
        await check_venue_access(current_user, venue_id)
        flags = await db.hr_feature_flags.find({"venue_id": venue_id}, {"_id": 0}).to_list(200)
        if not flags:
            flags = [
                HRFeatureFlag(
                    id=str(uuid.uuid4()),
                    venue_id=venue_id,
                    module_key=module,
                    enabled=True,
                    roles=[],
                    updated_at=datetime.now(timezone.utc).isoformat(),
                    updated_by=None
                ).model_dump()
                for module in DEFAULT_HR_MODULES
            ]
        return {"success": True, "flags": flags}

    @router.post("")
    async def update_flags(payload: dict, current_user: dict = Depends(get_current_user)):
        venue_id = payload.get("venue_id")
        flags = payload.get("flags") or []
        if not venue_id:
            raise HTTPException(status_code=400, detail="venue_id required")
        await check_venue_access(current_user, venue_id)
        if current_user.get("role") not in ["owner", "product_owner"]:
            raise HTTPException(status_code=403, detail="Permission denied")

        now = datetime.now(timezone.utc).isoformat()
        for flag in flags:
            module_key = flag.get("module_key")
            if not module_key:
                continue
            flag_doc = HRFeatureFlag(
                id=str(uuid.uuid4()),
                venue_id=venue_id,
                module_key=module_key,
                enabled=bool(flag.get("enabled", True)),
                roles=flag.get("roles") or [],
                updated_at=now,
                updated_by=current_user.get("id")
            )
            await db.hr_feature_flags.update_one(
                {"venue_id": venue_id, "module_key": module_key},
                {"$set": flag_doc.model_dump()},
                upsert=True
            )

        audit = HRAuditLog(
            id=str(uuid.uuid4()),
            venue_id=venue_id,
            actor_id=current_user.get("id"),
            actor_role=current_user.get("role"),
            action="HR_FEATURE_FLAGS_UPDATED",
            entity="hr_feature_flags",
            details={"count": len(flags)},
            created_at=now
        )
        await db.hr_audit_logs.insert_one(audit.model_dump())

        return {"success": True}

    return router
