"""
Google Workspace Onboarding Service
──────────────────────────────────────
Bridges HR employee creation with Google Workspace user provisioning.
Called as a fire-and-forget hook after employee creation when auto_provision
is enabled for the venue's Workspace domain.
"""
from datetime import datetime, timezone
from typing import Optional
import logging

logger = logging.getLogger("restin.workspace.onboarding")


async def try_workspace_provision(db, employee_doc: dict, venue_id: str, triggered_by: dict):
    """
    After an employee is created, check if this venue has an auto-provisioning
    Workspace domain configured. If so, create a Workspace account for the
    employee and store the link back on the employee record.

    This function is designed to NEVER raise — failures are logged and audited
    but do not block the HR flow.
    """
    try:
        # 1. Check if venue has Google Workspace SSO + Auto-Provision enabled
        settings = await db.google_settings.find_one(
            {"venue_id": venue_id, "sso_enabled": True},
            {"_id": 0}
        )
        if not settings:
            return  # SSO not configured → skip silently

        # Find a domain with auto_provision enabled
        domains = settings.get("workspace_domains", [])
        auto_domain = next((d for d in domains if d.get("auto_provision")), None)
        if not auto_domain:
            return  # No auto-provision domain → skip

        email = employee_doc.get("email", "")
        full_name = employee_doc.get("full_name", "")

        if not email or not full_name:
            logger.warning(
                "Skipping Workspace provision: missing email or name",
                extra={"employee_id": employee_doc.get("id")}
            )
            return

        # 2. Check if employee email belongs to the auto-provision domain
        email_domain = email.split("@")[-1].lower() if "@" in email else ""
        target_domain = auto_domain.get("domain", "").lower()

        if email_domain != target_domain:
            # Employee email is not in the Workspace domain — skip
            # (e.g., personal Gmail vs company domain)
            logger.info(
                f"Employee email domain ({email_domain}) != workspace domain ({target_domain}), skipping provision"
            )
            return

        # 3. Check if user already exists in Workspace (avoid duplicates)
        existing = await db.workspace_provisioned_users.find_one(
            {"email": email.lower(), "venue_id": venue_id},
            {"_id": 0}
        )
        if existing:
            logger.info(f"Workspace user {email} already provisioned, skipping")
            return

        # 4. Attempt provisioning via WorkspaceService
        try:
            from google.services.workspace_service import WorkspaceService
            ws = WorkspaceService()

            name_parts = full_name.strip().split(" ", 1)
            first_name = name_parts[0]
            last_name = name_parts[1] if len(name_parts) > 1 else ""

            result = await ws.create_user(
                domain=target_domain,
                admin_email=auto_domain.get("admin_email", ""),
                service_account_key_ref=auto_domain.get("service_account_key_ref", ""),
                primary_email=email,
                first_name=first_name,
                last_name=last_name,
                org_unit_path=f"/Restin/{venue_id}",
                cost_center_tag=auto_domain.get("cost_center_tag", venue_id)
            )

            # 5. Store provisioning record
            provision_record = {
                "email": email.lower(),
                "google_id": result.get("id", ""),
                "employee_id": employee_doc.get("id"),
                "venue_id": venue_id,
                "domain": target_domain,
                "status": "active",
                "provisioned_at": datetime.now(timezone.utc).isoformat(),
                "provisioned_by": triggered_by.get("id", "system")
            }
            await db.workspace_provisioned_users.insert_one(provision_record)

            # 6. Update employee record with workspace link
            await db.employees.update_one(
                {"id": employee_doc.get("id")},
                {"$set": {
                    "google_workspace_id": result.get("id", ""),
                    "workspace_provisioned": True,
                    "workspace_provisioned_at": datetime.now(timezone.utc).isoformat()
                }}
            )

            # 7. Audit log
            await _log_provision_event(
                db, venue_id, triggered_by,
                action="WORKSPACE_AUTO_PROVISION",
                message=f"Google Workspace account provisioned for {email}",
                meta={
                    "employee_id": employee_doc.get("id"),
                    "email": email,
                    "google_id": result.get("id", ""),
                    "domain": target_domain
                }
            )

            logger.info(f"✅ Workspace account provisioned for {email}")

        except Exception as provision_err:
            # Provisioning failed — log but don't block HR creation
            logger.error(
                f"Workspace provisioning failed for {email}: {provision_err}",
                exc_info=True
            )
            await _log_provision_event(
                db, venue_id, triggered_by,
                action="WORKSPACE_PROVISION_FAILED",
                message=f"Failed to provision Workspace account for {email}: {str(provision_err)}",
                meta={
                    "employee_id": employee_doc.get("id"),
                    "email": email,
                    "error": str(provision_err)
                }
            )

    except Exception as outer_err:
        # Catch-all: never crash the HR flow
        logger.error(f"Workspace onboarding hook error: {outer_err}", exc_info=True)


async def try_workspace_suspend(db, employee_id: str, venue_id: str, triggered_by: dict):
    """
    When an employee is terminated/deactivated, suspend their Google Workspace
    account if one was provisioned.
    """
    try:
        provision = await db.workspace_provisioned_users.find_one(
            {"employee_id": employee_id, "venue_id": venue_id, "status": "active"},
            {"_id": 0}
        )
        if not provision:
            return  # No provisioned account → skip

        settings = await db.google_settings.find_one(
            {"venue_id": venue_id, "sso_enabled": True},
            {"_id": 0}
        )
        if not settings:
            return

        domains = settings.get("workspace_domains", [])
        domain_config = next(
            (d for d in domains if d.get("domain") == provision.get("domain")),
            None
        )
        if not domain_config:
            return

        try:
            from google.services.workspace_service import WorkspaceService
            ws = WorkspaceService()

            await ws.suspend_user(
                domain=provision.get("domain"),
                admin_email=domain_config.get("admin_email", ""),
                service_account_key_ref=domain_config.get("service_account_key_ref", ""),
                user_key=provision.get("email")
            )

            # Update records
            await db.workspace_provisioned_users.update_one(
                {"employee_id": employee_id, "venue_id": venue_id},
                {"$set": {
                    "status": "suspended",
                    "suspended_at": datetime.now(timezone.utc).isoformat(),
                    "suspended_by": triggered_by.get("id", "system")
                }}
            )

            await db.employees.update_one(
                {"id": employee_id},
                {"$set": {"workspace_suspended": True}}
            )

            await _log_provision_event(
                db, venue_id, triggered_by,
                action="WORKSPACE_AUTO_SUSPEND",
                message=f"Google Workspace account suspended for {provision.get('email')}",
                meta={
                    "employee_id": employee_id,
                    "email": provision.get("email"),
                    "domain": provision.get("domain")
                }
            )

            logger.info(f"🔒 Workspace account suspended for {provision.get('email')}")

        except Exception as suspend_err:
            logger.error(f"Workspace suspension failed: {suspend_err}", exc_info=True)

    except Exception as outer_err:
        logger.error(f"Workspace suspend hook error: {outer_err}", exc_info=True)


async def _log_provision_event(
    db, venue_id: str, user: dict, action: str, message: str, meta: dict
):
    """Write an audit log entry for provisioning events."""
    from uuid import uuid4
    await db.event_logs.insert_one({
        "id": str(uuid4()),
        "level": "AUDIT",
        "code": action,
        "message": message,
        "user_id": user.get("id", "system"),
        "user_name": user.get("name", "System"),
        "venue_id": venue_id,
        "meta": meta,
        "timestamp": datetime.now(timezone.utc).isoformat()
    })
