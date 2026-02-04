"""Service Registry - Track active services and their capabilities"""
from typing import Dict, List, Set
from datetime import datetime, timezone

from core.database import db


class ServiceRegistry:
    """Registry for microservices"""
    
    def __init__(self):
        self.services: Dict[str, Dict] = {}
    
    async def register_service(
        self,
        service_name: str,
        capabilities: List[str],
        subscribed_events: List[str]
    ):
        """Register a service"""
        service_info = {
            "name": service_name,
            "capabilities": capabilities,
            "subscribed_events": subscribed_events,
            "registered_at": datetime.now(timezone.utc).isoformat(),
            "last_heartbeat": datetime.now(timezone.utc).isoformat(),
            "status": "ACTIVE"
        }
        
        self.services[service_name] = service_info
        
        # Persist to database
        await db.service_registry.update_one(
            {"name": service_name},
            {"$set": service_info},
            upsert=True
        )
        
        return service_info
    
    async def heartbeat(self, service_name: str):
        """Update service heartbeat"""
        if service_name in self.services:
            self.services[service_name]["last_heartbeat"] = datetime.now(timezone.utc).isoformat()
            
            await db.service_registry.update_one(
                {"name": service_name},
                {"$set": {"last_heartbeat": datetime.now(timezone.utc).isoformat()}}
            )
    
    async def get_services_for_capability(self, capability: str) -> List[str]:
        """Find services that provide a capability"""
        return [
            name for name, info in self.services.items()
            if capability in info.get("capabilities", [])
        ]
    
    async def get_services_for_event(self, event_type: str) -> List[str]:
        """Find services subscribed to an event"""
        return [
            name for name, info in self.services.items()
            if event_type in info.get("subscribed_events", [])
        ]
    
    async def list_all_services(self) -> List[Dict]:
        """List all registered services"""
        return list(self.services.values())


# Global service registry
service_registry = ServiceRegistry()
