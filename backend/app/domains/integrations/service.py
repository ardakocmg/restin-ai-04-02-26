from typing import List, Optional, Dict, Any
from datetime import datetime
from app.services.prisma import prisma
from app.domains.integrations.models import (
    IntegrationProvider, 
    IntegrationConfigResponse, 
    UpdateIntegrationConfig
)

class IntegrationService:
    async def list_configs(self, organization_id: str) -> List[IntegrationConfigResponse]:
        configs = await prisma.integrationconfig.find_many(
            where={"organizationId": organization_id}
        )
        return [self._map_to_response(c) for c in configs]

    async def get_config(self, organization_id: str, provider: IntegrationProvider) -> Optional[IntegrationConfigResponse]:
        config = await prisma.integrationconfig.find_unique(
            where={
                "organizationId_provider": {
                    "organizationId": organization_id, 
                    "provider": provider
                }
            }
        )
        return self._map_to_response(config) if config else None

    async def upsert_config(self, organization_id: str, provider: IntegrationProvider, data: UpdateIntegrationConfig) -> IntegrationConfigResponse:
        # Prepare update data
        update_data = {}
        if data.is_enabled is not None:
            update_data["isEnabled"] = data.is_enabled
        if data.credentials is not None:
            update_data["credentials"] = data.credentials # TODO: Encrypt here
        if data.settings is not None:
            update_data["settings"] = data.settings

        # Upsert
        config = await prisma.integrationconfig.upsert(
            where={
                "organizationId_provider": {
                    "organizationId": organization_id,
                    "provider": provider
                }
            },
            create={
                "organizationId": organization_id,
                "provider": provider,
                "isEnabled": data.is_enabled if data.is_enabled is not None else False,
                "credentials": data.credentials or {}, # TODO: Encrypt here
                "settings": data.settings or {},
                "status": "NOT_CONFIGURED"
            },
            update=update_data
        )
        return self._map_to_response(config)

    def _map_to_response(self, config) -> IntegrationConfigResponse:
        return IntegrationConfigResponse(
            id=config.id,
            organization_id=config.organizationId,
            provider=IntegrationProvider(config.provider),
            is_enabled=config.isEnabled,
            status=config.status,
            last_sync=config.lastSyncAt,
            settings=config.settings or {}
        )

class SyncEngine:
    async def trigger_sync(self, organization_id: str, provider: IntegrationProvider, job_type: str = "SYNC") -> Dict[str, Any]:
        """
        Orchestrates a sync run:
        1. Create SyncRun record (PENDING)
        2. Instantiate Connector
        3. Execute Sync
        4. Update SyncRun (SUCCESS/FAILED)
        5. Log results
        """
        # 1. Create Run Record
        run = await prisma.syncrun.create(
            data={
                "organizationId": organization_id,
                "provider": provider,
                "jobType": job_type,
                "status": "IN_PROGRESS",
                "startedAt": datetime.now()
            }
        )
        
        try:
            # 2. Get Config & Connector
            service = IntegrationService()
            config = await prisma.integrationconfig.find_unique(
                where={
                    "organizationId_provider": {
                        "organizationId": organization_id, 
                        "provider": provider
                    }
                }
            )
            
            if not config or not config.isEnabled:
                raise Exception(f"Provider {provider} not enabled for org {organization_id}")

            # Dynamic Import to avoid circular deps or massive if/else here if possible
            # For now, simple factory:
            connector = self._get_connector(provider, organization_id, config.credentials, config.settings)
            
            # 3. Execute
            if job_type == "DISCOVER":
                result = await connector.discover()
            else:
                result = await connector.sync()
            
            # 4. Update Run (Success)
            await prisma.syncrun.update(
                where={"id": run.id},
                data={
                    "status": "SUCCESS",
                    "finishedAt": datetime.now(),
                    "itemsProcessed": result.get("processed", 0),
                    "itemsFailed": result.get("failed", 0),
                    "durationMs": int((datetime.now() - run.startedAt).total_seconds() * 1000)
                }
            )
            
            return {"run_id": run.id, "status": "SUCCESS", "result": result}

        except Exception as e:
            # 4. Update Run (Failed)
            await prisma.syncrun.update(
                where={"id": run.id},
                data={
                    "status": "FAILED",
                    "finishedAt": datetime.now(),
                    "errorSummary": str(e),
                    "durationMs": int((datetime.now() - run.startedAt).total_seconds() * 1000)
                }
            )
            return {"run_id": run.id, "status": "FAILED", "error": str(e)}

    def _get_connector(self, provider: IntegrationProvider, org_id: str, creds: dict, settings: dict):
        from app.domains.integrations.connectors.stubs import (
            LightspeedConnector, ShireburnConnector, ApicbaseConnector, GoogleConnector
        )
        from app.domains.integrations.connectors.tuya import TuyaConnector
        from app.domains.integrations.connectors.meross import MerossConnector
        from app.domains.integrations.connectors.qingping import QingpingConnector
        from app.domains.integrations.connectors.nuki import NukiConnector
        
        # Factory Map
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



