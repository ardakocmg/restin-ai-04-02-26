from fastapi import APIRouter, Body, Depends, HTTPException
from typing import Dict, Any
from core.dependencies import get_current_user

router = APIRouter(prefix="/pay", tags=["Payments (Pillar 8)"])

@router.post("/transaction")
async def process_transaction(
    payload: Dict[str, Any] = Body(...),
    current_user: dict = Depends(get_current_user)
):
    """
    Process a Payment Transaction (Mocked).
    """
    amount = payload.get("amountCents", 0)
    method = payload.get("method", "CARD")
    
    # Simulate Payment Gateway Response
    return {
        "status": "SUCCESS",
        "transaction_id": f"TR-{amount}-8842",
        "message": f"Did charge {amount} cents via {method}",
        "gateway": "STRIPE_MOCK"
    }
