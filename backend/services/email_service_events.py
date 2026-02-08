"""Email Service - Real Email Delivery via Resend API"""
import os
import logging
from typing import Dict, Optional
from datetime import datetime, timezone

import httpx

from core.database import db
from services.event_bus import event_handler
from services.service_registry import service_registry

logger = logging.getLogger(__name__)

RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")
RESEND_API_URL = "https://api.resend.com/emails"
DEFAULT_FROM = os.getenv("EMAIL_FROM", "Restin.AI <noreply@restin.ai>")


class EmailService:
    """Email notification service with Resend API integration"""
    
    def __init__(self):
        self.service_name = "EmailService"
        self.api_key = RESEND_API_KEY
    
    async def initialize(self):
        await service_registry.register_service(
            service_name=self.service_name,
            capabilities=["email_send", "template_render", "resend_delivery"],
            subscribed_events=["order.closed", "reservation.created", "user.created", "shift.reminder"]
        )
        
        if not self.api_key or self.api_key == "re_YOUR_API_KEY_HERE":
            logger.warning("⚠️ EmailService: RESEND_API_KEY not configured. Emails will be logged only.")
        else:
            logger.info("✓ EmailService: Resend API configured")
    
    async def send_email(
        self, 
        to: str, 
        subject: str, 
        body: str, 
        html: Optional[str] = None,
        template: Optional[str] = None
    ) -> Dict:
        """Send email via Resend API"""
        email_record = {
            "to": to,
            "subject": subject,
            "body": body,
            "html": html,
            "template": template,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "status": "PENDING"
        }
        
        # Check if API key is configured
        if not self.api_key or self.api_key == "re_YOUR_API_KEY_HERE":
            email_record["status"] = "SIMULATED"
            await db.emails.insert_one(email_record)
            logger.info(f"📧 EmailService [SIMULATION]: Would send to {to} - {subject}")
            return email_record
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    RESEND_API_URL,
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "from": DEFAULT_FROM,
                        "to": [to] if isinstance(to, str) else to,
                        "subject": subject,
                        "html": html or body,
                        "text": body
                    },
                    timeout=10.0
                )
                
                if response.status_code in (200, 201):
                    result = response.json()
                    email_record["status"] = "SENT"
                    email_record["resend_id"] = result.get("id")
                    email_record["sent_at"] = datetime.now(timezone.utc).isoformat()
                    logger.info(f"📧 EmailService: Email sent to {to} - ID: {result.get('id')}")
                else:
                    email_record["status"] = "FAILED"
                    email_record["error"] = response.text
                    logger.error(f"📧 EmailService: Failed to send - {response.status_code}: {response.text}")
                    
        except httpx.TimeoutException:
            email_record["status"] = "TIMEOUT"
            email_record["error"] = "Request timeout"
            logger.error(f"📧 EmailService: Timeout sending to {to}")
            
        except Exception as e:
            email_record["status"] = "ERROR"
            email_record["error"] = str(e)
            logger.error(f"📧 EmailService: Error - {e}")
        
        await db.emails.insert_one(email_record)
        return email_record
    
    async def send_template_email(
        self, 
        to: str, 
        template_name: str, 
        context: Dict
    ) -> Dict:
        """Send email using predefined template"""
        # Get template from DB
        template = await db.email_templates.find_one({"name": template_name})
        
        if not template:
            logger.warning(f"📧 EmailService: Template '{template_name}' not found")
            return {"status": "TEMPLATE_NOT_FOUND"}
        
        # Simple variable replacement
        subject = template.get("subject", "")
        html = template.get("html", "")
        
        for key, value in context.items():
            subject = subject.replace(f"{{{{{key}}}}}", str(value))
            html = html.replace(f"{{{{{key}}}}}", str(value))
        
        return await self.send_email(to=to, subject=subject, body=html, html=html)


# Event handlers
@event_handler("order.closed")
async def send_order_confirmation(event: Dict):
    """Send order confirmation email when order closes"""
    data = event.get("data", {})
    order_id = data.get("order_id")
    total = data.get("total", 0)
    customer_email = data.get("customer_email")
    
    if not customer_email:
        logger.debug(f"📧 No customer email for order {order_id}")
        return
    
    await email_service.send_email(
        to=customer_email,
        subject=f"Order Confirmation #{order_id}",
        body=f"Thank you for your order!\n\nOrder ID: {order_id}\nTotal: €{total/100:.2f}",
        html=f"""
        <h1>Thank you for your order!</h1>
        <p><strong>Order ID:</strong> {order_id}</p>
        <p><strong>Total:</strong> €{total/100:.2f}</p>
        <p>We hope to see you again soon!</p>
        """
    )


@event_handler("reservation.created")
async def send_reservation_confirmation(event: Dict):
    """Send reservation confirmation email"""
    data = event.get("data", {})
    email = data.get("guest_email")
    guest_name = data.get("guest_name", "Guest")
    date = data.get("date", "")
    time = data.get("time", "")
    party_size = data.get("party_size", 2)
    
    if not email:
        return
    
    await email_service.send_email(
        to=email,
        subject="Reservation Confirmed",
        body=f"Hi {guest_name},\n\nYour reservation is confirmed.\nDate: {date}\nTime: {time}\nParty: {party_size}",
        html=f"""
        <h1>Reservation Confirmed</h1>
        <p>Hi {guest_name},</p>
        <p>Your reservation has been confirmed:</p>
        <ul>
            <li><strong>Date:</strong> {date}</li>
            <li><strong>Time:</strong> {time}</li>
            <li><strong>Party Size:</strong> {party_size}</li>
        </ul>
        """
    )


@event_handler("user.created")
async def send_welcome_email(event: Dict):
    """Send welcome email to new users"""
    data = event.get("data", {})
    email = data.get("email")
    name = data.get("name", "Team Member")
    
    if not email:
        return
    
    await email_service.send_email(
        to=email,
        subject="Welcome to Restin.AI!",
        body=f"Hi {name},\n\nWelcome to the team!\n\nYour account has been created.",
        html=f"""
        <h1>Welcome to Restin.AI!</h1>
        <p>Hi {name},</p>
        <p>Your account has been created. You can now log in using your PIN.</p>
        """
    )


email_service = EmailService()
