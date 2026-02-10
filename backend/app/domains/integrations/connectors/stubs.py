from typing import Dict, Any, List
from app.domains.integrations.connectors.base import BaseConnector
from app.domains.integrations.models import IntegrationProvider

class TodoConnector(BaseConnector):
    """Placeholder for providers not yet implemented"""
    
    def get_provider(self) -> IntegrationProvider:
        # This is generic, actual implementations will override
        return IntegrationProvider.LIGHTSPEED 

    async def validate_credentials(self) -> bool:
        return True

    async def discover(self) -> Dict[str, Any]:
        return {"status": "Not implemented"}

    async def sync(self, window_days: int = 1) -> Dict[str, Any]:
        return {"processed": 0, "failed": 0, "details": "Stub connector"}

class LightspeedConnector(TodoConnector):
    def get_provider(self): return IntegrationProvider.LIGHTSPEED

class ShireburnConnector(TodoConnector):
    def get_provider(self): return IntegrationProvider.SHIREBURN

class ApicbaseConnector(TodoConnector):
    def get_provider(self): return IntegrationProvider.APICBASE

class GoogleConnector(TodoConnector):
    def get_provider(self): return IntegrationProvider.GOOGLE

# IoT Connectors will share a hub
class DeviceHubConnector(TodoConnector):
    def get_provider(self): return IntegrationProvider.NUKI # Default, can be overridden
