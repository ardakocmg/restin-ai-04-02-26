from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional
from datetime import datetime
from app.domains.integrations.models import IntegrationProvider, SyncStatus

class BaseConnector(ABC):
    """
    Standard interface for ALL external integrations.
    Enforces venue-scoping and uniform behavior.
    """
    
    def __init__(self, organization_id: str, credentials: Dict[str, Any], settings: Dict[str, Any]):
        self.organization_id = organization_id
        self.credentials = credentials
        self.settings = settings
        self.provider = self.get_provider()

    @abstractmethod
    def get_provider(self) -> IntegrationProvider:
        pass

    @abstractmethod
    async def validate_credentials(self) -> bool:
        """Ping external API to verify auth"""
        pass

    @abstractmethod
    async def discover(self) -> Dict[str, Any]:
        """Fetch metadata (locations, devices, schema)"""
        pass

    @abstractmethod
    async def sync(self, window_days: int = 1) -> Dict[str, Any]:
        """
        Perform standard sync (pull data).
        Returns { "processed": int, "failed": int, "details": dict }
        """
        pass

    async def execute_command(self, command: str, payload: Dict[str, Any]) -> bool:
        """Optional: Execute action (e.g. unlock door, print receipt)"""
        raise NotImplementedError("Command execution not supported by this connector")

    async def handle_webhook(self, payload: Dict[str, Any]) -> bool:
        """Optional: Ingest real-time event"""
        return False
