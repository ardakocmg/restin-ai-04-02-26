"""Approval Settings Routes — per-venue approval configuration"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List
from core.dependencies import get_current_user, get_database
from core.venue_config import VenueConfigRepo, DEFAULTS


router = APIRouter(prefix="/config/venues", tags=["Approval Settings"])

# Default approval config for reference
DEFAULT_APPROVAL = DEFAULTS["rules"]["approval"]


class ClockingApprovalSettings(BaseModel):
    staff_app_requires_approval: bool = True
    auto_clocking_requires_approval: bool = False
    shift_mismatch_requires_approval: bool = True
    shift_mismatch_tolerance_minutes: int = 15
    auto_approve_enabled: bool = False
    allowed_approvers: List[str] = Field(default_factory=lambda: ["manager", "owner", "hr"])
    specific_approver_ids: List[str] = Field(default_factory=list)


class GenericApprovalSettings(BaseModel):
    requires_approval: bool = True
    auto_approve_enabled: bool = False
    allowed_approvers: List[str] = Field(default_factory=lambda: ["manager", "owner", "hr"])
    specific_approver_ids: List[str] = Field(default_factory=list)


class ApprovalSettingsPayload(BaseModel):
    manual_clocking: Optional[ClockingApprovalSettings] = None
    leave: Optional[GenericApprovalSettings] = None
    expense: Optional[GenericApprovalSettings] = None


@router.get("/{venue_id}/approval-settings")
async def get_approval_settings(
    venue_id: str,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database)
):
    """Get approval settings for a venue"""
    repo = VenueConfigRepo(db)
    cfg = await repo.get(venue_id)

    # Deep merge: venue rules.approval over defaults
    approval = {**DEFAULT_APPROVAL}
    venue_approval = cfg.get("rules", {}).get("approval", {})
    for key in approval:
        if key in venue_approval:
            approval[key] = {**approval[key], **venue_approval[key]}

    return {"ok": True, "data": approval, "venue_id": venue_id}


@router.put("/{venue_id}/approval-settings")
async def update_approval_settings(
    venue_id: str,
    payload: ApprovalSettingsPayload,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database)
):
    """Update approval settings for a venue (Owner/Admin only)"""
    role = (current_user.get("role") or "").lower()
    if role not in ("owner", "product_owner", "admin"):
        raise HTTPException(status_code=403, detail="Only owners/admins can change approval settings")

    # Build the update
    update_data = {}
    if payload.manual_clocking:
        update_data["manual_clocking"] = payload.manual_clocking.model_dump()
    if payload.leave:
        update_data["leave"] = payload.leave.model_dump()
    if payload.expense:
        update_data["expense"] = payload.expense.model_dump()

    if not update_data:
        raise HTTPException(status_code=400, detail="No settings provided")

    # Merge with existing
    repo = VenueConfigRepo(db)
    cfg = await repo.get(venue_id)
    existing_rules = cfg.get("rules", {})
    existing_approval = existing_rules.get("approval", {**DEFAULT_APPROVAL})

    for key, value in update_data.items():
        existing_approval[key] = {**existing_approval.get(key, {}), **value}

    existing_rules["approval"] = existing_approval

    # Save via upsert
    user_id = current_user.get("userId") or current_user.get("id") or ""
    await repo.upsert(
        venue_id,
        features=cfg.get("features"),
        rules=existing_rules,
        user_id=user_id
    )

    return {
        "ok": True,
        "data": existing_approval,
        "venue_id": venue_id,
        "message": "Approval settings updated"
    }
