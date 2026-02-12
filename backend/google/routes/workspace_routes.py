"""
Google Workspace Domain Management & Provisioning Routes
Admin endpoints for managing Workspace domains and provisioning users.
"""
from fastapi import APIRouter, HTTPException, Depends, Query, Body
from typing import Optional
from datetime import datetime, timezone
import logging

from core.database import db
from core.dependencies import get_current_user, check_venue_access
from services.audit_service import create_audit_log

logger = logging.getLogger("google.workspace.routes")


def create_workspace_routes():
    router = APIRouter(prefix="/workspace", tags=["google-workspace"])

    # ─── DOMAIN MANAGEMENT ────────────────────────────────────────────────

    @router.get("/domains")
    async def list_workspace_domains(
        venue_id: str = Query(...),
        current_user: dict = Depends(get_current_user),
    ):
        """List configured Workspace domains for a venue."""
        await check_venue_access(current_user, venue_id)

        settings = await db.google_settings.find_one(
            {"venue_id": venue_id},
            {"_id": 0}
        )

        domains = []
        allowed_login = []

        if settings:
            domains = settings.get("workspace_domains", [])
            allowed_login = settings.get("allowed_login_domains", [])

        # Check group-level domains
        venue = await db.venues.find_one({"id": venue_id}, {"_id": 0})
        group_domains = []
        if venue and venue.get("group_id"):
            group = await db.venue_groups.find_one(
                {"id": venue["group_id"]},
                {"_id": 0}
            )
            if group:
                group_domains = group.get("allowed_login_domains", [])

        return {
            "ok": True,
            "data": {
                "venue_domains": domains,
                "allowed_login_domains": allowed_login,
                "group_domains": group_domains,
                "sso_enabled": settings.get("sso_enabled", False) if settings else False,
                "sso_enforce": settings.get("sso_enforce", False) if settings else False,
                "group_id": venue.get("group_id") if venue else None,
                "is_group_admin": current_user.get("role") in ["owner", "product_owner"] # Simplified check
            }
        }

    @router.post("/domains")
    async def add_workspace_domain(
        venue_id: str = Query(...),
        payload: dict = Body(...),
        current_user: dict = Depends(get_current_user),
    ):
        """
        Add a new Workspace domain for a venue.
        Body: { "domain": "caviar-bull.com", "admin_email": "admin@caviar-bull.com", ... }
        """
        await check_venue_access(current_user, venue_id)

        # Only owners can manage domains
        if current_user.get("role") not in ["owner", "product_owner"]:
            raise HTTPException(status_code=403, detail="Only owners can manage workspace domains")

        domain = payload.get("domain", "").lower().strip()
        if not domain or "." not in domain:
            raise HTTPException(status_code=400, detail="Invalid domain")

        domain_config = {
            "domain": domain,
            "workspace_customer_id": payload.get("workspace_customer_id", ""),
            "admin_email": payload.get("admin_email", ""),
            "service_account_key_ref": payload.get("service_account_key_ref", ""),
            "auto_provision": payload.get("auto_provision", False),
            "license_pool": payload.get("license_pool", "Business Starter"),
            "cost_center_tag": payload.get("cost_center_tag", venue_id),
            "created_at": datetime.now(timezone.utc).isoformat(),
        }

        # Upsert into google_settings
        await db.google_settings.update_one(
            {"venue_id": venue_id},
            {
                "$push": {"workspace_domains": domain_config},
                "$addToSet": {"allowed_login_domains": domain},
                "$set": {
                    "sso_enabled": True,
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                },
                "$setOnInsert": {
                    "venue_id": venue_id,
                    "enabled": True,
                    "created_at": datetime.now(timezone.utc).isoformat(),
                }
            },
            upsert=True
        )

        await create_audit_log(
            venue_id, current_user["id"], current_user.get("name", ""),
            "workspace_domain_added", "google_settings", venue_id,
            {"domain": domain, "admin_email": domain_config["admin_email"]}
        )

        return {"ok": True, "message": f"Domain {domain} added", "data": domain_config}

    @router.delete("/domains/{domain}")
    async def remove_workspace_domain(
        domain: str,
        venue_id: str = Query(...),
        current_user: dict = Depends(get_current_user),
    ):
        """Remove a Workspace domain configuration."""
        await check_venue_access(current_user, venue_id)

        if current_user.get("role") not in ["owner", "product_owner"]:
            raise HTTPException(status_code=403, detail="Only owners can manage workspace domains")

        await db.google_settings.update_one(
            {"venue_id": venue_id},
            {
                "$pull": {
                    "workspace_domains": {"domain": domain},
                    "allowed_login_domains": domain,
                },
                "$set": {"updated_at": datetime.now(timezone.utc).isoformat()},
            }
        )

        await create_audit_log(
            venue_id, current_user["id"], current_user.get("name", ""),
            "workspace_domain_removed", "google_settings", venue_id,
            {"domain": domain}
        )

        return {"ok": True, "message": f"Domain {domain} removed"}

    @router.post("/domains/{domain}/test")
    async def test_domain_connectivity(
        domain: str,
        venue_id: str = Query(...),
        current_user: dict = Depends(get_current_user),
    ):
        """Test Admin SDK connectivity for a domain."""
        await check_venue_access(current_user, venue_id)

        settings = await db.google_settings.find_one(
            {"venue_id": venue_id},
            {"_id": 0}
        )

        if not settings:
            raise HTTPException(status_code=404, detail="No Google settings found")

        domain_config = None
        for d in settings.get("workspace_domains", []):
            if d.get("domain") == domain:
                domain_config = d
                break

        if not domain_config:
            raise HTTPException(status_code=404, detail=f"Domain {domain} not configured")

        try:
            from google.services.workspace_service import workspace_service
            users = await workspace_service.list_users(domain_config, max_results=1)

            return {
                "ok": True,
                "message": f"Connected to {domain} successfully",
                "test_user_count": len(users),
            }
        except Exception as exc:
            return {
                "ok": False,
                "message": f"Connection failed: {str(exc)}",
                "error": str(exc),
            }

    # ─── SSO CONFIG ───────────────────────────────────────────────────────

    @router.patch("/sso-config")
    async def update_sso_config(
        venue_id: str = Query(...),
        payload: dict = Body(...),
        current_user: dict = Depends(get_current_user),
    ):
        """
        Update SSO configuration.
        Body: { "sso_enabled": true, "sso_enforce": false }
        """
        await check_venue_access(current_user, venue_id)

        if current_user.get("role") not in ["owner", "product_owner"]:
            raise HTTPException(status_code=403, detail="Only owners can manage SSO config")

        allowed_fields = {"sso_enabled", "sso_enforce", "allowed_login_domains"}
        updates = {k: v for k, v in payload.items() if k in allowed_fields}
        updates["updated_at"] = datetime.now(timezone.utc).isoformat()

        await db.google_settings.update_one(
            {"venue_id": venue_id},
            {"$set": updates},
            upsert=True
        )

        await create_audit_log(
            venue_id, current_user["id"], current_user.get("name", ""),
            "sso_config_updated", "google_settings", venue_id, updates
        )

        return {"ok": True, "message": "SSO configuration updated", "data": updates}

    # ─── USER PROVISIONING ────────────────────────────────────────────────

    @router.get("/users")
    async def list_workspace_users(
        venue_id: str = Query(...),
        domain: str = Query(...),
        current_user: dict = Depends(get_current_user),
    ):
        """List Google Workspace users for a domain."""
        await check_venue_access(current_user, venue_id)

        settings = await db.google_settings.find_one(
            {"venue_id": venue_id},
            {"_id": 0}
        )
        if not settings:
            raise HTTPException(status_code=404, detail="No Google settings found")

        domain_config = None
        for d in settings.get("workspace_domains", []):
            if d.get("domain") == domain:
                domain_config = d
                break

        if not domain_config:
            raise HTTPException(status_code=404, detail=f"Domain {domain} not configured")

        try:
            from google.services.workspace_service import workspace_service
            users = await workspace_service.list_users(domain_config)
            return {"ok": True, "data": [u.model_dump() for u in users]}
        except ImportError:
            raise HTTPException(status_code=503, detail="Workspace SDK not available")
        except Exception as exc:
            raise HTTPException(status_code=500, detail=str(exc))

    @router.post("/users/provision")
    async def provision_workspace_user(
        venue_id: str = Query(...),
        payload: dict = Body(...),
        current_user: dict = Depends(get_current_user),
    ):
        """
        Create a new Google Workspace user for an employee.
        Body: { "first_name": "Arda", "last_name": "Koc", "domain": "caviar-bull.com" }
        """
        await check_venue_access(current_user, venue_id)

        if current_user.get("role") not in ["owner", "product_owner", "manager"]:
            raise HTTPException(status_code=403, detail="Insufficient permissions")

        settings = await db.google_settings.find_one(
            {"venue_id": venue_id},
            {"_id": 0}
        )
        if not settings:
            raise HTTPException(status_code=404, detail="No Google settings found")

        target_domain = payload.get("domain", "")
        domain_config = None
        for d in settings.get("workspace_domains", []):
            if d.get("domain") == target_domain:
                domain_config = d
                break

        if not domain_config:
            raise HTTPException(
                status_code=404,
                detail=f"Domain {target_domain} not configured for this venue"
            )

        try:
            from google.services.workspace_service import workspace_service, ProvisionRequest

            # Check license availability first
            license_info = await workspace_service.check_license_availability(domain_config)
            if license_info.available_licenses == 0 and license_info.total_licenses > 0:
                raise HTTPException(
                    status_code=409,
                    detail="No available Workspace licenses. Please purchase more."
                )

            request = ProvisionRequest(
                first_name=payload["first_name"],
                last_name=payload["last_name"],
                domain=target_domain,
                venue_id=venue_id,
                org_unit_path=payload.get("org_unit_path", "/"),
                password=payload.get("password"),
                send_invite=payload.get("send_invite", True),
            )

            new_user = await workspace_service.create_user(domain_config, request)

            # Link to restin user if employee_id provided
            employee_id = payload.get("employee_id")
            if employee_id:
                await db.users.update_one(
                    {"id": employee_id},
                    {
                        "$set": {
                            "primary_email": new_user.primary_email,
                            "identity_provider": "google",
                        },
                        "$addToSet": {"linked_emails": new_user.primary_email},
                    }
                )

            await create_audit_log(
                venue_id, current_user["id"], current_user.get("name", ""),
                "workspace_user_provisioned", "user", employee_id or "",
                {
                    "email": new_user.primary_email,
                    "domain": target_domain,
                    "cost_center": venue_id,
                }
            )

            return {
                "ok": True,
                "message": f"User {new_user.primary_email} created",
                "data": new_user.model_dump()
            }

        except ImportError:
            raise HTTPException(status_code=503, detail="Workspace SDK not available")

    @router.post("/users/{email}/suspend")
    async def suspend_workspace_user(
        email: str,
        venue_id: str = Query(...),
        current_user: dict = Depends(get_current_user),
    ):
        """Suspend a Workspace user (Leaver process)."""
        await check_venue_access(current_user, venue_id)

        if current_user.get("role") not in ["owner", "product_owner"]:
            raise HTTPException(status_code=403, detail="Only owners can suspend users")

        domain = email.split("@")[1] if "@" in email else ""
        settings = await db.google_settings.find_one(
            {"venue_id": venue_id},
            {"_id": 0}
        )

        domain_config = None
        if settings:
            for d in settings.get("workspace_domains", []):
                if d.get("domain") == domain:
                    domain_config = d
                    break

        if not domain_config:
            raise HTTPException(status_code=404, detail=f"Domain {domain} not managed")

        try:
            from google.services.workspace_service import workspace_service
            success = await workspace_service.suspend_user(domain_config, email)

            if success:
                await create_audit_log(
                    venue_id, current_user["id"], current_user.get("name", ""),
                    "workspace_user_suspended", "user", "",
                    {"email": email, "domain": domain}
                )

            return {"ok": success, "message": f"User {email} {'suspended' if success else 'suspension failed'}"}

        except ImportError:
            raise HTTPException(status_code=503, detail="Workspace SDK not available")

    @router.get("/licenses")
    async def check_licenses(
        venue_id: str = Query(...),
        domain: str = Query(...),
        current_user: dict = Depends(get_current_user),
    ):
        """Check available Workspace licenses for a domain."""
        await check_venue_access(current_user, venue_id)

        settings = await db.google_settings.find_one(
            {"venue_id": venue_id},
            {"_id": 0}
        )

        domain_config = None
        if settings:
            for d in settings.get("workspace_domains", []):
                if d.get("domain") == domain:
                    domain_config = d
                    break

        if not domain_config:
            raise HTTPException(status_code=404, detail=f"Domain {domain} not configured")

        try:
            from google.services.workspace_service import workspace_service
            info = await workspace_service.check_license_availability(domain_config)
            return {"ok": True, "data": info.model_dump()}
        except ImportError:
            raise HTTPException(status_code=503, detail="Workspace SDK not available")

    @router.patch("/groups/{group_id}/domains")
    async def update_group_domains(
        group_id: str,
        payload: dict = Body(...),
        current_user: dict = Depends(get_current_user),
    ):
        """
        Update allowed login domains for a Venue Group.
        These domains are inherited by all venues in the group.
        Body: { "allowed_login_domains": ["example.com"] }
        """
        # Verify user is owner and has access to group
        # For MVP, we check if user is owner of ANY venue in the group
        # or just check if user is 'owner' role generally (simplified)
        
        if current_user.get("role") not in ["owner", "product_owner"]:
             raise HTTPException(status_code=403, detail="Only owners can manage group domains")

        group = await db.venue_groups.find_one({"id": group_id}, {"_id": 0})
        if not group:
            raise HTTPException(status_code=404, detail="Group not found")
        
        domains = payload.get("allowed_login_domains", [])
        
        await db.venue_groups.update_one(
            {"id": group_id},
            {"$set": {"allowed_login_domains": domains, "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
        
        await create_audit_log(
            group_id, current_user["id"], current_user.get("name", ""),
            "group_domains_updated", "venue_group", group_id,
            {"domains": domains}
        )
        
        return {"ok": True, "message": "Group domains updated", "data": domains}

    return router
