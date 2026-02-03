from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
import uuid
from pymongo import ReturnDocument

from models.public_content import ContentStatus, PublicContentVersion


DEFAULT_PUBLIC_CONTENT: Dict[str, Dict[str, Any]] = {
    "marketing": {
        "hero": {
            "tag": "Enterprise-grade, offline-first, Europe-ready",
            "title": "Operate every venue with total control, even when the cloud disappears.",
            "subtitle": "restin.ai unifies POS, KDS, inventory, and observability into a single resilience-first platform built for European hospitality groups.",
            "cardTitle": "What you get on day one",
            "cardItems": [
                "Zero‑downtime POS + KDS launch kit",
                "Inventory ledger with immutable audit trail",
                "Observability hub with safe retry flows",
                "Edge gateway for offline failover"
            ],
            "metrics": [
                {"key": "uptime", "value": "99.95%", "label": "Service continuity target"},
                {"key": "latency", "value": "<50ms", "label": "Edge response time"},
                {"key": "venues", "value": "Multi‑venue", "label": "Built for scaled groups"}
            ]
        },
        "features": [
            {
                "key": "resilience",
                "title": "Zero-Drama Resilience",
                "description": "Offline-first architecture keeps service alive even when connectivity drops."
            },
            {
                "key": "security",
                "title": "Security You Can Audit",
                "description": "Immutable logs, idempotent retries, and role-scoped permissions."
            },
            {
                "key": "speed",
                "title": "Operational Velocity",
                "description": "Faster table turns, smoother kitchens, fewer breakpoints."
            }
        ],
        "modules": [
            {
                "key": "pos",
                "title": "POS Command Center",
                "description": "Seat-aware ordering, coursing, split checks, and high‑velocity service flows with offline resilience.",
                "capabilities": ["Seat & course pacing", "Table transfers", "Split checks"]
            },
            {
                "key": "kds",
                "title": "KDS Orchestration",
                "description": "Station routing, real‑time ticket rails, and expo coordination with latency‑aware prioritization.",
                "capabilities": ["Station routing", "Expo screens", "Auto re-fire"]
            },
            {
                "key": "inventory",
                "title": "Inventory Ledger",
                "description": "Immutable stock ledger, recipe costing, transfers, and production management.",
                "capabilities": ["Ledger-based stock", "Recipe costing", "Transfers"]
            },
            {
                "key": "observability",
                "title": "Observability Hub",
                "description": "Test panel, error inbox, and safe retry engine with full run artifacts.",
                "capabilities": ["Test panel", "Error inbox", "Retry engine"]
            },
            {
                "key": "edge",
                "title": "Edge + Device Mesh",
                "description": "Cloud → Edge → Device failover with offline-first data sync and peer redundancy.",
                "capabilities": ["Offline sync", "Device mesh", "Edge gateway"]
            },
            {
                "key": "analytics",
                "title": "Real-Time Analytics",
                "description": "Operational KPIs, labor insights, and performance monitoring at venue scale.",
                "capabilities": ["Live KPIs", "Labor analytics", "Compliance dashboards"]
            }
        ],
        "pricing": [
            {
                "key": "basic",
                "name": "Basic",
                "price": "€299",
                "period": "/month",
                "yearly": "€3,050 /year (avg EU rate)",
                "tagline": "For single-location teams modernizing fast service.",
                "highlights": ["POS + KDS Core", "Inventory Ledger Lite", "Daily Reports", "Standard Support"],
                "future": ["Unified mobile waitlist", "Basic loyalty cards"]
            },
            {
                "key": "pro",
                "name": "Pro",
                "price": "€699",
                "period": "/month",
                "yearly": "€7,100 /year (avg EU rate)",
                "tagline": "For multi‑venue operators who need visibility & control.",
                "highlights": ["Everything in Basic", "Observability Hub", "Edge Gateway (1 site)", "Advanced analytics", "Role-based permissions"],
                "future": ["Automated procurement", "Menu intelligence insights"]
            },
            {
                "key": "business",
                "name": "Business",
                "price": "€1,290",
                "period": "/month",
                "yearly": "€13,100 /year (avg EU rate)",
                "tagline": "For enterprise groups that demand resilience + compliance.",
                "highlights": ["Everything in Pro", "Device Mesh redundancy", "Custom workflows", "Security + audit suite", "SLA with priority response"],
                "future": ["Multi-region failover", "AI service optimization"]
            }
        ],
        "roadmap": [
            "Mermaid-based system diagrams + live topology",
            "Automated backup validation and restore drills",
            "Unified guest intelligence & CRM insights",
            "Dynamic workforce scheduling and forecasting",
            "Embedded payments & smart settlement workflows"
        ],
        "cta": {
            "title": "Ready to see it live?",
            "subtitle": "We can onboard a pilot venue in under two weeks."
        }
    },
    "technical": {
        "hero": {
            "tag": "Complete system spec · microservices aligned",
            "title": "Every service, flow, template, and diagram in one place.",
            "subtitle": "Built for engineering, implementation partners, and enterprise procurement teams. Multi-language readiness is baked in for EU deployments.",
            "pills": ["FastAPI + MongoDB", "Edge Gateway + Device Mesh", "Observability + Retry Engine"],
            "assurances": [
                "3-layer failover: Cloud → Edge → Device",
                "Idempotent retries with action tokens",
                "Immutable audit + inventory ledgers",
                "Secure venue-scoped permissions"
            ]
        },
        "architectureLayers": [
            {
                "key": "cloud",
                "title": "Cloud Control Plane",
                "description": "FastAPI + MongoDB services, orchestration, reporting, and global policy enforcement."
            },
            {
                "key": "edge",
                "title": "Edge Gateway",
                "description": "Local Node.js gateway with queueing, sync, and offline-first request routing."
            },
            {
                "key": "device",
                "title": "Device Mesh",
                "description": "Peer redundancy for POS/KDS terminals with local election + replay."
            }
        ],
        "microservices": [
            {
                "key": "core",
                "title": "Core Services",
                "items": ["Auth & MFA", "Venue/Users", "Orders & Checks", "Audit Logs"]
            },
            {
                "key": "ops",
                "title": "Ops Services",
                "items": ["POS/KDS", "Inventory Ledger", "Purchase Orders", "Device Hub"]
            },
            {
                "key": "obs",
                "title": "Observability Services",
                "items": ["Test Panel", "Error Inbox", "Retry Engine", "Event Bus"]
            },
            {
                "key": "edge",
                "title": "Edge Services",
                "items": ["Queue Service", "Sync Service", "Discovery Service", "Mesh Server"]
            }
        ],
        "templates": [
            {
                "key": "error-inbox",
                "title": "Error Inbox Item Template",
                "code": "{\n  \"id\": \"uuid\",\n  \"display_id\": \"ERR-0001\",\n  \"venue_id\": \"venue-id\",\n  \"status\": \"OPEN\",\n  \"severity\": \"WARNING\",\n  \"domain\": \"INVENTORY\",\n  \"signature\": \"sha256\",\n  \"steps\": [\n    {\"step_id\": \"CAPTURE_EXCEPTION\", \"status\": \"FAILED\"}\n  ],\n  \"retry_plan\": {\"allowed\": true, \"mode\": \"FULL_REPLAY\"}\n}"
            },
            {
                "key": "retry-plan",
                "title": "Retry Plan Template",
                "code": "{\n  \"allowed\": true,\n  \"mode\": \"STEP_RETRY\",\n  \"requires_token\": true,\n  \"idempotency_key_template\": \"OBS-RETRY-{err_id}-{attempt}\",\n  \"target\": {\"method\": \"POST\", \"path\": \"/api/orders/{order_id}/send\"}\n}"
            },
            {
                "key": "test-run",
                "title": "Test Panel Run Template",
                "code": "{\n  \"display_id\": \"RUN-0007\",\n  \"target\": {\"method\": \"GET\", \"path\": \"/api/health\"},\n  \"status_code\": 200,\n  \"trace\": {\"latency_ms\": 52}\n}"
            }
        ],
        "diagrams": [
            {
                "key": "offline",
                "title": "Offline-First Flow (Cloud → Edge → Device)",
                "code": "sequenceDiagram\n    participant Cloud\n    participant Edge\n    participant Device\n    Device->>Edge: Write order\n    Edge->>Cloud: Sync (when online)\n    Cloud-->>Edge: Ack + audit\n    Edge-->>Device: Reconcile"
            },
            {
                "key": "observability",
                "title": "Observability Pipeline",
                "code": "flowchart LR\n    Request-->Capture\n    Capture-->ErrorInbox\n    ErrorInbox-->RetryPlan\n    RetryPlan-->ActionToken\n    ActionToken-->SafeReplay"
            }
        ],
        "apiSurface": [
            {"key": "auth", "method": "POST", "path": "/api/auth/login/pin", "desc": "PIN login + MFA gate"},
            {"key": "orders", "method": "POST", "path": "/api/orders/{order_id}/send", "desc": "Send order to KDS + stock update"},
            {"key": "testpanel", "method": "POST", "path": "/api/observability/testpanel/run", "desc": "Execute safe API test"},
            {"key": "error", "method": "GET", "path": "/api/observability/error-inbox", "desc": "Query error inbox with filters"},
            {"key": "retry", "method": "POST", "path": "/api/observability/error-inbox/{id}/retry", "desc": "Safe retry execution"}
        ],
        "security": [
            "JWT + MFA for elevated roles with 12h token rotation.",
            "Venue-scoped data access and role-based policy gates.",
            "Idempotency keys enforced on critical write paths.",
            "Audit logs with hash chaining for tamper evidence."
        ]
    },
    "modules": {
        "hero": {
            "title": "Module Catalog",
            "subtitle": "Every capability, service, and workflow module with EU-ready defaults."
        },
        "auto_sync_registry": True,
        "modules": [
            {
                "key": "pos",
                "title": "POS Command Center",
                "description": "Seat-aware ordering, coursing, and split checks designed for high-volume service.",
                "capabilities": ["Seat & course pacing", "Split checks", "Table transfers", "Offline queue"]
            },
            {
                "key": "kds",
                "title": "KDS Orchestration",
                "description": "Ticket routing, expo control, and station-level analytics.",
                "capabilities": ["Station routing", "Expo screens", "Prep timers", "Re-fire workflows"]
            },
            {
                "key": "inventory",
                "title": "Inventory Ledger",
                "description": "Immutable stock ledger with recipe costing and procurement.",
                "capabilities": ["Ledger entries", "Recipe costing", "Stock transfers", "Waste logs"]
            },
            {
                "key": "observability",
                "title": "Observability Hub",
                "description": "System test panel, error inbox, and safe retry orchestration.",
                "capabilities": ["Test panel", "Error inbox", "Retry engine", "Step timeline"]
            },
            {
                "key": "edge",
                "title": "Edge + Device Mesh",
                "description": "Local gateway with peer redundancy for offline resilience.",
                "capabilities": ["Edge gateway", "Mesh election", "Sync replay", "Local cache"]
            },
            {
                "key": "analytics",
                "title": "Real-Time Analytics",
                "description": "Operational intelligence across venues.",
                "capabilities": ["Live KPIs", "Labor insights", "Performance alerts", "Compliance tracking"]
            }
        ]
    }
}


class PublicContentService:
    def __init__(self, db):
        self.db = db

    async def get_current_content(self, content_type: str) -> Dict[str, Any]:
        items = await self.db.public_content_versions.find(
            {"type": content_type, "status": ContentStatus.APPROVED.value},
            {"_id": 0}
        ).sort("approved_at", -1).limit(1).to_list(1)

        if items:
            content_doc = items[0]
            if content_type == "modules":
                content_doc["content"] = self._apply_registry_sync(content_doc.get("content", {}))
            return content_doc

        default_content = DEFAULT_PUBLIC_CONTENT.get(content_type)
        if default_content is None:
            return {}

        content_doc = {
            "id": f"default-{content_type}",
            "type": content_type,
            "status": ContentStatus.APPROVED.value,
            "version": "default",
            "content": default_content,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "created_by": None,
            "approved_at": datetime.now(timezone.utc).isoformat(),
            "approved_by": None
        }

        if content_type == "modules":
            content_doc["content"] = self._apply_registry_sync(default_content)

        return content_doc

    async def list_versions(self, content_type: str) -> List[Dict[str, Any]]:
        return await self.db.public_content_versions.find(
            {"type": content_type},
            {"_id": 0}
        ).sort("created_at", -1).limit(100).to_list(100)

    async def create_version(
        self,
        content_type: str,
        content: Dict[str, Any],
        changelog: Optional[str],
        user_id: str,
        scheduled_publish_at: Optional[str] = None,
        created_by_role: Optional[str] = None
    ) -> Dict[str, Any]:
        now = datetime.now(timezone.utc).isoformat()
        version = f"v{datetime.now(timezone.utc).strftime('%Y%m%d-%H%M%S')}"
        payload = PublicContentVersion(
            id=str(uuid.uuid4()),
            type=content_type,
            status=ContentStatus.DRAFT,
            version=version,
            content=content,
            changelog=changelog,
            created_at=now,
            created_by=user_id,
            created_by_role=created_by_role,
            scheduled_publish_at=scheduled_publish_at
        )
        await self.db.public_content_versions.insert_one(payload.model_dump())
        return payload.model_dump()

    async def update_version(
        self,
        version_id: str,
        content: Dict[str, Any],
        changelog: Optional[str],
        scheduled_publish_at: Optional[str] = None
    ) -> Dict[str, Any]:
        now = datetime.now(timezone.utc).isoformat()
        update_doc = {
            "content": content,
            "changelog": changelog,
            "updated_at": now,
            "scheduled_publish_at": scheduled_publish_at
        }
        updated = await self.db.public_content_versions.find_one_and_update(
            {"id": version_id, "status": ContentStatus.DRAFT},
            {"$set": update_doc},
            return_document=ReturnDocument.AFTER,
            projection={"_id": 0}
        )
        return updated

    async def approve_version(self, version_id: str, user_id: str, approved_by_role: Optional[str] = None) -> Dict[str, Any]:
        version_doc = await self.db.public_content_versions.find_one({"id": version_id}, {"_id": 0})
        if not version_doc:
            return None

        await self.db.public_content_versions.update_many(
            {"type": version_doc["type"], "status": ContentStatus.APPROVED.value},
            {"$set": {"status": ContentStatus.ARCHIVED.value}}
        )

        now = datetime.now(timezone.utc).isoformat()
        await self.db.public_content_versions.update_one(
            {"id": version_id},
            {"$set": {"status": ContentStatus.APPROVED.value, "approved_at": now, "approved_by": user_id, "approved_by_role": approved_by_role}}
        )

        updated = await self.db.public_content_versions.find_one({"id": version_id}, {"_id": 0})
        return updated

    def _apply_registry_sync(self, content: Dict[str, Any]) -> Dict[str, Any]:
        if not content.get("auto_sync_registry"):
            return content

        try:
            from services.settings_service import MODULE_REGISTRY
            modules = [
                {
                    "key": item.get("key"),
                    "title": item.get("title"),
                    "description": item.get("desc"),
                    "status": item.get("status"),
                    "enabled_by_default": item.get("enabled_by_default", False)
                }
                for item in MODULE_REGISTRY
            ]
            merged = {**content, "modules": modules}
            return merged
        except Exception:
            return content


def get_public_content_service(db) -> PublicContentService:
    return PublicContentService(db)
