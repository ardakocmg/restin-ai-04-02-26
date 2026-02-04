from fastapi import APIRouter, HTTPException, Body
from typing import List
from .models import Order, OrderCreate
from .services import PosService

router = APIRouter(prefix="/api/pos", tags=["POS"])

@router.post("/orders", response_model=Order)
def create_order(order: OrderCreate):
    return PosService.create_order(order)

@router.get("/orders", response_model=List[Order])
def get_orders(venue_id: str):
    return PosService.get_active_orders(venue_id)

@router.patch("/orders/{order_id}/status")
def update_status(order_id: str, status: str = Body(..., embed=True)):
    updated = PosService.update_status(order_id, status)
    if not updated:
        raise HTTPException(404, "Order not found")
    return updated
