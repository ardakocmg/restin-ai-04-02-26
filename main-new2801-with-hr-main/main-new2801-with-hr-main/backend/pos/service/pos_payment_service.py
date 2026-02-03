from datetime import datetime, timezone
from typing import Optional
from pos.models import PosPayment, PosPaymentCreate

class PosPaymentService:
    def __init__(self, db):
        self.db = db
        self.col = db.pos_payments

    async def create_payment(self, data: PosPaymentCreate, user_id: str) -> PosPayment:
        payment = PosPayment(
            order_id=data.order_id,
            venue_id=data.venue_id,
            tender_type=data.tender_type,
            amount=data.amount,
            external_ref=data.external_ref,
            created_by=user_id
        )
        
        await self.col.insert_one(payment.model_dump())
        return payment

    async def complete_payment(self, payment_id: str, venue_id: str):
        await self.col.update_one(
            {"id": payment_id, "venue_id": venue_id},
            {"$set": {"status": "COMPLETED"}}
        )

    async def void_payment(self, payment_id: str, venue_id: str):
        await self.col.update_one(
            {"id": payment_id, "venue_id": venue_id},
            {"$set": {"status": "VOIDED"}}
        )

    async def get_order_payments(self, order_id: str, venue_id: str):
        cursor = self.col.find({"order_id": order_id, "venue_id": venue_id}, {"_id": 0})
        docs = await cursor.to_list(100)
        return [PosPayment(**doc) for doc in docs]
