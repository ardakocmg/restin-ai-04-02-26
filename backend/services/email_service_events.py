"""Email Service - Event-driven email notifications (FUTURE MICROSERVICE)"""
from typing import Dict
from datetime import datetime, timezone

from core.database import db
from services.event_bus import event_handler
from services.service_registry import service_registry


class EmailService:
    """Email notification service (listens to business events)"""
    
    def __init__(self):
        self.service_name = "EmailService"
    
    async def initialize(self):
        await service_registry.register_service(
            service_name=self.service_name,
            capabilities=["email_send", "template_render", "smtp_delivery"],
            subscribed_events=["order.closed", "reservation.created", "user.created", "shift.reminder"]
        )
    
    async def send_email(self, to: str, subject: str, body: str, template: str = None):
        """Send email (placeholder - integrate with Resend/SendGrid)"""
        email_record = {
            "to": to,
            "subject": subject,
            "body": body,
            "template": template,
            "sent_at": datetime.now(timezone.utc).isoformat(),
            "status": "PENDING"
        }
        
        await db.emails.insert_one(email_record)
        
        # TODO: Integrate with email provider (Resend, SendGrid, etc.)
        print(f"📧 EmailService: Email queued to {to}")
        
        return email_record


# Event handlers
@event_handler("order.closed")
async def send_order_confirmation(event: Dict):
    """Send order confirmation email when order closes"""
    data = event["data"]
    order_id = data.get("order_id")
    total = data.get("total", 0)
    
    # TODO: Get customer email and send confirmation
    print(f"📧 EmailService: Order confirmation for {order_id} (€{total})")
    
    # Log to DB
    await db.email_logs.insert_one({
        "event_type": "order_confirmation",
        "order_id": order_id,
        "timestamp": datetime.now(timezone.utc).isoformat()
    })


@event_handler("reservation.created")
async def send_reservation_confirmation(event: Dict):
    """Send reservation confirmation email"""
    data = event["data"]
    print(f"📧 EmailService: Reservation confirmation sent")


@event_handler("user.created")
async def send_welcome_email(event: Dict):
    """Send welcome email to new users"""
    data = event["data"]
    print(f"📧 EmailService: Welcome email sent to {data.get('email')}")


email_service = EmailService()
