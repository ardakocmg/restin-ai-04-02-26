from fastapi import APIRouter, Depends, HTTPException
from typing import Optional
from app.domains.billing.calculator import BillCalculator
from app.core.database import get_database

router = APIRouter()

@router.get("/current")
async def get_current_bill(venue_id: str):
    """Get the estimated bill for the current month."""
    if not venue_id:
        raise HTTPException(status_code=400, detail="Missing venue_id")
        
    invoice = await BillCalculator.generate_invoice(venue_id)
    if "error" in invoice:
        raise HTTPException(status_code=404, detail=invoice["error"])
        
    return invoice

@router.post("/modules")
async def toggle_module(venue_id: str, module: str, enabled: bool):
    """Enable/Disable a specific module (Voice, Radar, Studio)."""
    db = get_database()
    
    valid_modules = ["hasVoice", "hasRadar", "hasStudio", "hasWeb", "hasCrm"]
    if module not in valid_modules:
        raise HTTPException(status_code=400, detail="Invalid module name")
        
    result = await db.module_configs.update_one(
        {"organizationId": venue_id},
        {"$set": {module: enabled}},
        upsert=True
    )
    
    return {"success": True, "module": module, "enabled": enabled}
