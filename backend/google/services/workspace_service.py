"""
Google Workspace Provisioning Service
Handles user creation, suspension, deletion via Admin SDK.
"""
import logging
from typing import Optional, List
from pydantic import BaseModel
from datetime import datetime, timezone

logger = logging.getLogger("google.workspace")

# Lazy-load Admin SDK
try:
    from googleapiclient.discovery import build
    from google.oauth2 import service_account
    ADMIN_SDK_AVAILABLE = True
except ImportError:
    ADMIN_SDK_AVAILABLE = False
    logger.warning("google-api-python-client not installed — Workspace provisioning disabled")


# ── Data Models ───────────────────────────────────────────────────────────

class GoogleWorkspaceUser(BaseModel):
    """Represents a Google Workspace user."""
    primary_email: str
    first_name: str
    last_name: str
    org_unit_path: str = "/"
    is_suspended: bool = False
    is_admin: bool = False
    creation_time: str = ""
    last_login_time: str = ""
    cost_center: str = ""


class LicenseInfo(BaseModel):
    """License availability for a Workspace domain."""
    total_licenses: int = 0
    assigned_licenses: int = 0
    available_licenses: int = 0
    license_type: str = "Business Starter"


class ProvisionRequest(BaseModel):
    """Request to provision a new Workspace user."""
    first_name: str
    last_name: str
    domain: str                       # Target domain (e.g., "caviar-bull.com")
    venue_id: str                     # For cost center tagging
    org_unit_path: str = "/"
    password: Optional[str] = None    # Auto-generated if not provided
    send_invite: bool = True


# ── Service ───────────────────────────────────────────────────────────────

class WorkspaceService:
    """
    Google Workspace Admin SDK service.
    Each domain has its own service account + delegated admin.
    """

    def _check_available(self) -> None:
        if not ADMIN_SDK_AVAILABLE:
            raise ImportError(
                "google-api-python-client not installed. "
                "Workspace provisioning features are disabled."
            )

    def _build_admin_service(self, domain_config: dict):
        """
        Build an Admin SDK Directory API service for a specific domain.
        Uses a service account with domain-wide delegation.
        """
        self._check_available()

        key_ref = domain_config.get("service_account_key_ref", "")
        admin_email = domain_config.get("admin_email", "")

        if not key_ref or not admin_email:
            raise ValueError(
                f"Domain {domain_config.get('domain')} missing "
                "service_account_key_ref or admin_email"
            )

        # In production: decrypt key_ref → load JSON → build credentials
        # For now we expect the key_ref to be a file path
        scopes = [
            "https://www.googleapis.com/auth/admin.directory.user",
            "https://www.googleapis.com/auth/admin.directory.user.readonly",
            "https://www.googleapis.com/auth/apps.licensing",
        ]

        credentials = service_account.Credentials.from_service_account_file(
            key_ref,
            scopes=scopes,
            subject=admin_email  # Impersonate admin
        )

        return build("admin", "directory_v1", credentials=credentials)

    async def list_users(
        self,
        domain_config: dict,
        query: str = "",
        max_results: int = 100
    ) -> List[GoogleWorkspaceUser]:
        """List users in a Workspace domain."""
        service = self._build_admin_service(domain_config)
        domain = domain_config["domain"]

        try:
            results = service.users().list(
                domain=domain,
                query=query,
                maxResults=max_results,
                orderBy="email",
                projection="full"
            ).execute()

            users = []
            for u in results.get("users", []):
                users.append(GoogleWorkspaceUser(
                    primary_email=u.get("primaryEmail", ""),
                    first_name=u.get("name", {}).get("givenName", ""),
                    last_name=u.get("name", {}).get("familyName", ""),
                    org_unit_path=u.get("orgUnitPath", "/"),
                    is_suspended=u.get("suspended", False),
                    is_admin=u.get("isAdmin", False),
                    creation_time=u.get("creationTime", ""),
                    last_login_time=u.get("lastLoginTime", ""),
                    cost_center=u.get("organizations", [{}])[0].get("costCenter", "")
                    if u.get("organizations") else ""
                ))
            return users

        except Exception as exc:
            logger.error("Failed to list Workspace users: %s", exc)
            raise

    async def get_user(
        self,
        domain_config: dict,
        email: str
    ) -> Optional[GoogleWorkspaceUser]:
        """Get a single Workspace user by email."""
        service = self._build_admin_service(domain_config)

        try:
            u = service.users().get(userKey=email).execute()
            return GoogleWorkspaceUser(
                primary_email=u.get("primaryEmail", ""),
                first_name=u.get("name", {}).get("givenName", ""),
                last_name=u.get("name", {}).get("familyName", ""),
                org_unit_path=u.get("orgUnitPath", "/"),
                is_suspended=u.get("suspended", False),
                is_admin=u.get("isAdmin", False),
                creation_time=u.get("creationTime", ""),
                last_login_time=u.get("lastLoginTime", ""),
            )
        except Exception as exc:
            logger.warning("Workspace user not found: %s — %s", email, exc)
            return None

    async def create_user(
        self,
        domain_config: dict,
        request: ProvisionRequest
    ) -> GoogleWorkspaceUser:
        """
        Create a new Google Workspace user.
        Tags with venue_id as cost center for billing transparency.
        """
        service = self._build_admin_service(domain_config)
        import secrets

        email = f"{request.first_name.lower()}.{request.last_name.lower()}@{request.domain}"
        password = request.password or secrets.token_urlsafe(16)

        user_body = {
            "primaryEmail": email,
            "name": {
                "givenName": request.first_name,
                "familyName": request.last_name,
            },
            "password": password,
            "changePasswordAtNextLogin": True,
            "orgUnitPath": request.org_unit_path,
            "organizations": [{
                "name": "Restin.AI",
                "title": "Staff",
                "primary": True,
                "costCenter": request.venue_id,  # Billing transparency
                "department": request.venue_id,
            }],
            "customSchemas": {
                "Restin": {
                    "venue_id": request.venue_id,
                    "provisioned_at": datetime.now(timezone.utc).isoformat(),
                    "provisioned_by": "restin-ai-workspace-service",
                }
            }
        }

        try:
            result = service.users().insert(body=user_body).execute()
            logger.info("Created Workspace user: %s for venue %s", email, request.venue_id)

            return GoogleWorkspaceUser(
                primary_email=result.get("primaryEmail", email),
                first_name=request.first_name,
                last_name=request.last_name,
                org_unit_path=request.org_unit_path,
                creation_time=result.get("creationTime", ""),
                cost_center=request.venue_id,
            )

        except Exception as exc:
            logger.error("Failed to create Workspace user %s: %s", email, exc)
            raise

    async def suspend_user(
        self,
        domain_config: dict,
        email: str
    ) -> bool:
        """Suspend a Workspace user (Leaver process)."""
        service = self._build_admin_service(domain_config)

        try:
            service.users().update(
                userKey=email,
                body={"suspended": True}
            ).execute()
            logger.info("Suspended Workspace user: %s", email)
            return True
        except Exception as exc:
            logger.error("Failed to suspend Workspace user %s: %s", email, exc)
            return False

    async def unsuspend_user(
        self,
        domain_config: dict,
        email: str
    ) -> bool:
        """Reactivate a suspended Workspace user."""
        service = self._build_admin_service(domain_config)

        try:
            service.users().update(
                userKey=email,
                body={"suspended": False}
            ).execute()
            logger.info("Unsuspended Workspace user: %s", email)
            return True
        except Exception as exc:
            logger.error("Failed to unsuspend %s: %s", email, exc)
            return False

    async def delete_user(
        self,
        domain_config: dict,
        email: str
    ) -> bool:
        """Delete a Workspace user (permanent). Use suspend_user for Leaver."""
        service = self._build_admin_service(domain_config)

        try:
            service.users().delete(userKey=email).execute()
            logger.info("Deleted Workspace user: %s", email)
            return True
        except Exception as exc:
            logger.error("Failed to delete Workspace user %s: %s", email, exc)
            return False

    async def check_license_availability(
        self,
        domain_config: dict
    ) -> LicenseInfo:
        """
        Check how many Workspace licenses are available.
        Uses the Enterprise License Manager API.
        """
        self._check_available()

        # License check requires the Licensing API
        try:
            key_ref = domain_config.get("service_account_key_ref", "")
            admin_email = domain_config.get("admin_email", "")

            scopes = ["https://www.googleapis.com/auth/apps.licensing"]
            credentials = service_account.Credentials.from_service_account_file(
                key_ref, scopes=scopes, subject=admin_email
            )

            lic_service = build("licensing", "v1", credentials=credentials)
            customer_id = domain_config.get("workspace_customer_id", "")

            # List assignments for the workspace product
            result = lic_service.licenseAssignments().listForProduct(
                productId="Google-Apps",
                customerId=customer_id,
                maxResults=1000
            ).execute()

            assigned = len(result.get("items", []))

            return LicenseInfo(
                assigned_licenses=assigned,
                license_type=domain_config.get("license_pool", "Business Starter"),
            )

        except Exception as exc:
            logger.warning("License check failed: %s", exc)
            return LicenseInfo(license_type=domain_config.get("license_pool", "Unknown"))


# Singleton
workspace_service = WorkspaceService()
