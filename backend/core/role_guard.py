"""
🛡️ Role Guard — Backend Role-Based Access Control
FastAPI dependency that enforces role hierarchy at the API level.
Usage:
    @router.get("/payroll", dependencies=[Depends(require_role("OWNER"))])
    async def get_payroll(): ...

    # Or as shortcut:
    @router.get("/payroll", dependencies=[Depends(require_owner)])
    async def get_payroll(): ...
"""
from fastapi import Depends, HTTPException, status
from core.dependencies import get_current_user
import logging

logger = logging.getLogger(__name__)

# ─── Role Hierarchy ─────────────────────────────────────────────────────────────
ROLE_HIERARCHY: dict[str, int] = {
    "STAFF": 1,
    "staff": 1,
    "MANAGER": 2,
    "manager": 2,
    "OWNER": 3,
    "owner": 3,
    "product_owner": 99,  # Superuser — access to everything
    "PRODUCT_OWNER": 99,
    "admin": 99,
    "ADMIN": 99,
}


def _get_role_level(role: str) -> int:
    """Resolve a role string to its numeric level."""
    return ROLE_HIERARCHY.get(role, 0)


def require_role(minimum_role: str):
    """
    FastAPI dependency factory — blocks requests below the required role.

    Args:
        minimum_role: "STAFF" | "MANAGER" | "OWNER"

    Returns:
        A dependency function for use with Depends().
    """
    min_level = _get_role_level(minimum_role)

    async def _guard(current_user: dict = Depends(get_current_user)):
        user_role = current_user.get("role", "")
        user_level = _get_role_level(user_role)

        if user_level < min_level:
            logger.warning(
                "Role guard blocked request: user=%s role=%s required=%s",
                current_user.get("name", "unknown"),
                user_role,
                minimum_role,
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "code": "INSUFFICIENT_ROLE",
                    "message": f"This action requires {minimum_role} role or higher",
                    "required_role": minimum_role,
                    "current_role": user_role,
                },
            )
        return current_user

    return _guard


# ─── Shortcut Dependencies ──────────────────────────────────────────────────────
require_staff = require_role("STAFF")
require_manager = require_role("MANAGER")
require_owner = require_role("OWNER")
