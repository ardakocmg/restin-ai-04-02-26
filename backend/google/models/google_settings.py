"""Google Settings model — Workspace SSO + Business Profile"""
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timezone


class WorkspaceDomainConfig(BaseModel):
    """Configuration for a single Google Workspace domain."""
    domain: str                                 # e.g. "caviar-bull.com"
    workspace_customer_id: str = ""             # Google Workspace customer ID
    admin_email: str = ""                       # Delegated admin for Admin SDK
    service_account_key_ref: str = ""           # encrypted ref to service account JSON
    auto_provision: bool = False                # Enable SCIM-like provisioning
    license_pool: str = "Business Starter"      # Workspace edition
    cost_center_tag: str = ""                   # Tag for billing transparency
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class GoogleSettings(BaseModel):
    venue_id: str
    enabled: bool = False
    oauth_ref: str = ""  # secret://...
    scopes: List[str] = [
        "business.profile",
        "calendar",
        "drive",
        "analytics.readonly",
        "ads.readonly"
    ]
    enabled_features: dict = {
        "business_profile": True,
        "reviews": True,
        "calendar": True,
        "drive": True,
        "analytics": True,
        "ads": False,
        "forms": False,
        "sheets": False
    }
    connected_at: str = ""
    last_sync_at: str = ""

    # ── Workspace SSO ──
    sso_enabled: bool = False
    sso_enforce: bool = False                   # If true, PIN login disabled for admin panel
    allowed_login_domains: List[str] = []       # ["caviar-bull.com", "mggroup.mt"]
    workspace_domains: List[WorkspaceDomainConfig] = []

    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
