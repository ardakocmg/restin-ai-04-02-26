from fastapi import APIRouter, Depends, HTTPException
from typing import List
from app.domains.integrations.models import (
    IntegrationProvider, 
    IntegrationConfigResponse, 
    UpdateIntegrationConfig
)
from app.domains.integrations.service import IntegrationService
# Assume simple auth dependency for now
# from app.dependencies import get_current_user_organization 

router = APIRouter()
service = IntegrationService()

# Mock Auth Dependency until fully wired
async def get_current_org_id():
    # MG Group Org ID
    return "698896440bc2eddbf9cac672" 

@router.get("/", response_model=List[IntegrationConfigResponse])
async def list_integrations(organization_id: str = Depends(get_current_org_id)):
    """List all integration configurations for the venue"""
    return await service.list_configs(organization_id)

@router.get("/{provider}", response_model=IntegrationConfigResponse)
async def get_integration(
    provider: IntegrationProvider, 
    organization_id: str = Depends(get_current_org_id)
):
    """Get specific integration config"""
    config = await service.get_config(organization_id, provider)
    if not config:
        raise HTTPException(status_code=404, detail="Integration not configured")
    return config

@router.post("/{provider}", response_model=IntegrationConfigResponse)
async def configure_integration(
    provider: IntegrationProvider, 
    data: UpdateIntegrationConfig,
    organization_id: str = Depends(get_current_org_id)
):
    """Update or create integration configuration"""
    return await service.upsert_config(organization_id, provider, data)

@router.post("/{provider}/sync")
async def trigger_sync(
    provider: IntegrationProvider,
    organization_id: str = Depends(get_current_org_id)
):
    """Manually trigger a sync job"""
    engine = SyncEngine()
    result = await engine.trigger_sync(organization_id, provider)
    return result
