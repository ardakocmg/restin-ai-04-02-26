"""
Restin.AI — Role-Based Access Control for AI Copilot
=====================================================
Centralizes role normalization and intent-level access gating.

Role Tiers:
  owner    → product_owner, OWNER, owner, brand_manager
  manager  → manager, MANAGER, branch_manager
  staff    → everything else (server, chef, bartender, staff, etc.)
"""

from typing import Dict, List, Optional
import logging

logger = logging.getLogger(__name__)


# ─── ROLE TIER MAPPING ────────────────────────────────────────
# Normalizes the many role string variants into 3 tiers.

ROLE_TIER_MAP: Dict[str, str] = {
    # Owner tier — full access
    "product_owner": "owner",
    "PRODUCT_OWNER": "owner",
    "OWNER": "owner",
    "owner": "owner",
    "brand_manager": "owner",   # Brand-level = owner-level access
    # Manager tier — venue-scoped
    "manager": "manager",
    "MANAGER": "manager",
    "branch_manager": "manager",
    # Staff tier — personal data only (fallback)
}


def get_role_tier(user: Optional[dict]) -> str:
    """
    Normalize a user's role to one of: owner, manager, staff.
    Returns 'staff' as the safe default for unknown roles.
    """
    if not user:
        return "staff"
    role = user.get("role", "staff")
    return ROLE_TIER_MAP.get(role, "staff")


# ─── INTENT ACCESS MATRIX ─────────────────────────────────────
# Which tier can access which intent. Missing intents default to owner-only.

INTENT_ACCESS: Dict[str, List[str]] = {
    "sales_today":       ["owner", "manager"],
    "sales_period":      ["owner", "manager"],
    "staff_overview":    ["owner", "manager", "staff"],   # staff → own data only
    "inventory_low":     ["owner", "manager", "staff"],   # read-only for staff
    "inventory_summary": ["owner", "manager", "staff"],
    "top_sellers":       ["owner", "manager"],
    "suppliers":         ["owner", "manager"],
    "waste":             ["owner", "manager", "staff"],
    "recipe_count":      ["owner", "manager", "staff"],   # everyone sees counts
    "recipe_detail":     ["owner", "manager", "staff"],
    "recipe_ingredient_search": ["owner", "manager", "staff"],
    "menu_info":         ["owner", "manager", "staff"],   # everyone sees menu
    "employees":         ["owner", "manager"],
    "clockings":         ["owner", "manager"],
    "shifts_schedule":   ["owner", "manager", "staff"],
    "orders_pos":        ["owner", "manager"],
    "payroll_info":      ["owner"],                       # payroll is sensitive
    "tables_zones":      ["owner", "manager", "staff"],
    "venue_overview":    ["owner", "manager"],
    "system_overview":   ["owner"],
    "task_create":       ["owner", "manager"],             # action: create tasks
    "task_update":       ["owner", "manager", "staff"],    # action: update tasks
    "hive_send":         ["owner", "manager", "staff"],    # action: send messages
    "help":              ["owner", "manager", "staff"],
}

# Intents that are completely blocked for staff — used for quick checks
_STAFF_BLOCKED = {"sales_today", "sales_period", "top_sellers", "suppliers"}


def can_access_intent(role_tier: str, intent_id: str) -> bool:
    """Check if a role tier has access to a given intent."""
    allowed = INTENT_ACCESS.get(intent_id, ["owner"])   # default: owner-only
    return role_tier in allowed


def get_blocked_message(intent_id: str, role_tier: str) -> str:
    """Return a friendly Turkish message when access is denied."""
    intent_labels = {
        "sales_today": "satış verileri",
        "sales_period": "dönemsel satış raporları",
        "top_sellers": "en çok satan ürünler",
        "suppliers": "tedarikçi bilgileri",
    }
    label = intent_labels.get(intent_id, "bu veri")
    return (
        f"🔒 **Erişim Kısıtlı**\n\n"
        f"{label.capitalize()} bilgisine erişim yetkiniz bulunmamaktadır.\n"
        f"Bu verilere yalnızca yönetici ve üzeri yetkiye sahip kullanıcılar erişebilir.\n\n"
        f"_Yetki seviyeniz: **{role_tier}**_"
    )


def get_allowed_intents(role_tier: str) -> List[str]:
    """Return list of intent IDs a role tier can access."""
    return [intent for intent, tiers in INTENT_ACCESS.items() if role_tier in tiers]


def should_filter_staff_data(role_tier: str, intent_id: str) -> bool:
    """
    Check if the response data should be filtered to show only the user's own data.
    This applies to staff viewing staff_overview (only their own clockings).
    """
    return role_tier == "staff" and intent_id == "staff_overview"


def should_hide_costs(role_tier: str) -> bool:
    """
    Check if cost/pricing data should be hidden.
    Only owners see full cost data. Managers see names but not costs.
    """
    return role_tier not in ("owner",)


def can_use_external_ai(role_tier: str) -> bool:
    """Only owners and managers can escalate to external AI (cost control)."""
    return role_tier in ("owner", "manager")


# ─── ROLE-AWARE SYSTEM PROMPT SEGMENTS ─────────────────────────

ROLE_CONTEXT_PROMPTS: Dict[str, str] = {
    "owner": """
## Caller Context
You are speaking with a restaurant OWNER or senior executive.
- Share ALL business intelligence freely: revenue, costs, margins, staff data, supplier pricing.
- Be strategic: offer insights, comparisons, and actionable recommendations.
- You can discuss financials, HR data, and sensitive business metrics.
""".strip(),

    "manager": """
## Caller Context
You are speaking with a restaurant MANAGER.
- Share operational data: daily sales totals, staff schedules, inventory levels.
- Do NOT share: individual salaries, profit margins, supplier cost pricing, or cross-venue comparisons.
- Focus on actionable, shift-level information they can act on right now.
- If they ask about restricted data, politely redirect: "Bu bilgi için işletme sahibi ile görüşmenizi öneririm."
""".strip(),

    "staff": """
## Caller Context
You are speaking with a TEAM MEMBER (waiter, chef, bartender, etc.).
- ONLY share: their personal schedule, their own clockings, menu information, and general restaurant info.
- NEVER share: revenue, sales data, other employees' schedules, supplier info, or any financial data.
- Be friendly and supportive. Help them with their shift, menu questions, and daily tasks.
- If they ask about restricted data, kindly say: "Bu bilgiye erişim yetkiniz bulunmamaktadır."
""".strip(),
}


def get_role_prompt_segment(role_tier: str) -> str:
    """Get the system prompt segment for a given role tier."""
    return ROLE_CONTEXT_PROMPTS.get(role_tier, ROLE_CONTEXT_PROMPTS["staff"])


# ─── AUDIT LOGGING ─────────────────────────────────────────────

async def log_ai_audit(
    db,
    venue_id: str,
    user: dict,
    query: str,
    intent: str,
    role_tier: str,
    access_granted: bool,
    source: str = "local",
    processing_ms: int = 0,
):
    """
    Log every AI query for security auditing and usage analytics.
    Collection: ai_audit_log
    """
    from uuid import uuid4
    from datetime import datetime, timezone

    try:
        await db.ai_audit_log.insert_one({
            "id": str(uuid4()),
            "venue_id": venue_id,
            "user_id": user.get("id") if user else None,
            "user_name": user.get("name") if user else None,
            "user_role": user.get("role") if user else None,
            "role_tier": role_tier,
            "query": query[:500],        # cap query length
            "intent": intent,
            "access_granted": access_granted,
            "source": source,
            "processing_ms": processing_ms,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
    except Exception as e:
        logger.error(f"Failed to log AI audit: {e}")


# ─── RATE LIMITING ─────────────────────────────────────────────
# In-memory sliding window rate limiter per user.

import time
from collections import defaultdict

# Queries per minute by role tier
RATE_LIMITS: Dict[str, int] = {
    "staff": 20,     # 20 queries/min for staff
    "manager": 60,   # 60 queries/min for managers
    "owner": 120,    # 120 queries/min for owners
}


class AIRateLimiter:
    """Simple sliding window rate limiter for AI queries."""

    def __init__(self):
        self._windows: Dict[str, List[float]] = defaultdict(list)
        self._window_seconds = 60.0

    def check(self, user_id: str, role_tier: str) -> bool:
        """
        Returns True if the request is allowed, False if rate limited.
        """
        now = time.monotonic()
        limit = RATE_LIMITS.get(role_tier, 20)
        key = user_id or "anonymous"

        # Prune old entries
        window = self._windows[key]
        cutoff = now - self._window_seconds
        self._windows[key] = [t for t in window if t > cutoff]

        if len(self._windows[key]) >= limit:
            return False

        self._windows[key].append(now)
        return True

    def get_remaining(self, user_id: str, role_tier: str) -> int:
        """Get remaining requests in current window."""
        now = time.monotonic()
        limit = RATE_LIMITS.get(role_tier, 20)
        key = user_id or "anonymous"
        cutoff = now - self._window_seconds
        active = [t for t in self._windows.get(key, []) if t > cutoff]
        return max(0, limit - len(active))


# Singleton
ai_rate_limiter = AIRateLimiter()
