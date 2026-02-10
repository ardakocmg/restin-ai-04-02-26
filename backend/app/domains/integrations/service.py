"""
Integration Service — MongoDB Native
Handles CRUD for integration configs and sync orchestration.
Uses get_database() directly (no Prisma dependency).
"""
from typing import List, Optional, Dict, Any
from datetime import datetime
from bson import ObjectId

from app.core.database import get_database
from app.domains.integrations.models import (
    IntegrationProvider,
    IntegrationConfigResponse,
    UpdateIntegrationConfig
)

import logging
logger = logging.getLogger(__name__)


class IntegrationService:
    """CRUD operations for integration_configs collection."""

    async def list_configs(self, organization_id: str) -> List[IntegrationConfigResponse]:
        db = get_database()
        cursor = db.integration_configs.find({"organization_id": organization_id})
        configs = await cursor.to_list(length=100)
        return [self._map_to_response(c) for c in configs]

    async def get_config(self, organization_id: str, provider: IntegrationProvider) -> Optional[IntegrationConfigResponse]:
        db = get_database()
        config = await db.integration_configs.find_one({
            "organization_id": organization_id,
            "provider": provider.value
        })
        return self._map_to_response(config) if config else None

    async def upsert_config(self, organization_id: str, provider: IntegrationProvider, data: UpdateIntegrationConfig) -> IntegrationConfigResponse:
        db = get_database()

        update_fields: Dict[str, Any] = {"updated_at": datetime.utcnow()}
        if data.is_enabled is not None:
            update_fields["is_enabled"] = data.is_enabled
        if data.credentials is not None:
            update_fields["credentials"] = data.credentials
        if data.settings is not None:
            update_fields["settings"] = data.settings

        # Determine status
        if data.is_enabled:
            update_fields["status"] = "CONNECTED"
        elif data.is_enabled is False:
            update_fields["status"] = "DISABLED"

        result = await db.integration_configs.find_one_and_update(
            {"organization_id": organization_id, "provider": provider.value},
            {
                "$set": update_fields,
                "$setOnInsert": {
                    "organization_id": organization_id,
                    "provider": provider.value,
                    "created_at": datetime.utcnow(),
                }
            },
            upsert=True,
            return_document=True
        )
        return self._map_to_response(result)

    def _map_to_response(self, doc: dict) -> IntegrationConfigResponse:
        return IntegrationConfigResponse(
            id=str(doc.get("_id", "")),
            organization_id=doc.get("organization_id", ""),
            provider=IntegrationProvider(doc.get("provider", "LIGHTSPEED")),
            is_enabled=doc.get("is_enabled", False),
            status=doc.get("status", "NOT_CONFIGURED"),
            last_sync=doc.get("last_sync_at"),
            settings=doc.get("settings", {})
        )


class SyncEngine:
    """Orchestrates sync runs using connector factory."""

    async def trigger_sync(self, organization_id: str, provider: IntegrationProvider, job_type: str = "SYNC") -> Dict[str, Any]:
        db = get_database()

        # 1. Create Run Record
        run_doc = {
            "organization_id": organization_id,
            "provider": provider.value,
            "job_type": job_type,
            "status": "IN_PROGRESS",
            "started_at": datetime.utcnow(),
            "finished_at": None,
            "items_processed": 0,
            "items_failed": 0,
            "duration_ms": None,
            "error_summary": None,
        }
        insert_result = await db.sync_runs.insert_one(run_doc)
        run_id = str(insert_result.inserted_id)

        try:
            # 2. Get Config
            config = await db.integration_configs.find_one({
                "organization_id": organization_id,
                "provider": provider.value
            })

            if not config or not config.get("is_enabled"):
                raise Exception(f"Provider {provider.value} not enabled for org {organization_id}")

            # 3. Get Connector & Execute
            connector = self._get_connector(
                provider, organization_id,
                config.get("credentials", {}),
                config.get("settings", {})
            )

            if job_type == "DISCOVER":
                result = await connector.discover()
            else:
                result = await connector.sync()

            # 4. Update Run (Success)
            duration = int((datetime.utcnow() - run_doc["started_at"]).total_seconds() * 1000)
            await db.sync_runs.update_one(
                {"_id": insert_result.inserted_id},
                {"$set": {
                    "status": "SUCCESS",
                    "finished_at": datetime.utcnow(),
                    "items_processed": result.get("processed", 0),
                    "items_failed": result.get("failed", 0),
                    "duration_ms": duration,
                }}
            )

            # Update last_sync on config
            await db.integration_configs.update_one(
                {"_id": config["_id"]},
                {"$set": {"last_sync_at": datetime.utcnow()}}
            )

            return {"run_id": run_id, "status": "SUCCESS", "result": result}

        except Exception as e:
            logger.error(f"[SyncEngine] {provider.value} sync failed: {e}")
            duration = int((datetime.utcnow() - run_doc["started_at"]).total_seconds() * 1000)
            await db.sync_runs.update_one(
                {"_id": insert_result.inserted_id},
                {"$set": {
                    "status": "FAILED",
                    "finished_at": datetime.utcnow(),
                    "error_summary": str(e),
                    "duration_ms": duration,
                }}
            )
            return {"run_id": run_id, "status": "FAILED", "error": str(e)}

    def _get_connector(self, provider: IntegrationProvider, org_id: str, creds: dict, settings: dict):
        from app.domains.integrations.connectors.stubs import (
            LightspeedConnector, ShireburnConnector, ApicbaseConnector, GoogleConnector
        )
        from app.domains.integrations.connectors.tuya import TuyaConnector
        from app.domains.integrations.connectors.meross import MerossConnector
        from app.domains.integrations.connectors.qingping import QingpingConnector
        from app.domains.integrations.connectors.nuki import NukiConnector

        CONNECTORS = {
            IntegrationProvider.LIGHTSPEED: LightspeedConnector,
            IntegrationProvider.SHIREBURN: ShireburnConnector,
            IntegrationProvider.APICBASE: ApicbaseConnector,
            IntegrationProvider.GOOGLE: GoogleConnector,
            IntegrationProvider.TUYA: TuyaConnector,
            IntegrationProvider.MEROSS: MerossConnector,
            IntegrationProvider.QINGPING: QingpingConnector,
            IntegrationProvider.NUKI: NukiConnector
        }

        ConnectorClass = CONNECTORS.get(provider)
        if not ConnectorClass:
            raise NotImplementedError(f"No connector for {provider}")

        return ConnectorClass(org_id, creds or {}, settings or {})
