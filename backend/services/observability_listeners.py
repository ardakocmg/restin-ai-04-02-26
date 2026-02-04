"""
Error Event Listener - Capture domain errors automatically
"""

from services.event_bus import event_bus, event_handler
from services.observability_service import get_observability_service
from core.database import db
from models.observability import Severity, Domain

# Listen for failure events
@event_handler('INV.LEDGER_POST_FAILED')
async def on_inventory_ledger_failed(event):
    """Capture inventory ledger failures"""
    obs_service = get_observability_service(db)
    
    await obs_service.create_error_inbox_item(
        venue_id=event.get('venue_id'),
        domain=Domain.INVENTORY,
        error_code='INSUFFICIENT_STOCK',
        error_message=event.get('error', {}).get('message', 'Stock deduction failed'),
        source={
            'source_type': 'EVENT',
            'event_id': event.get('id'),
            'request_id': event.get('request_id')
        },
        entity_refs={
            'order_id': event.get('order_id'),
            'sku_id': event.get('sku_id')
        },
        severity=Severity.ERROR
    )

@event_handler('PAY.DISPATCH_FAILED')
async def on_payment_failed(event):
    """Capture payment failures"""
    obs_service = get_observability_service(db)
    
    await obs_service.create_error_inbox_item(
        venue_id=event.get('venue_id'),
        domain=Domain.POS,
        error_code='PAYMENT_FAILED',
        error_message=event.get('error', {}).get('message', 'Payment processing failed'),
        source={
            'source_type': 'EVENT',
            'event_id': event.get('id'),
            'request_id': event.get('request_id')
        },
        entity_refs={
            'order_id': event.get('order_id'),
            'payment_id': event.get('payment_id')
        },
        severity=Severity.CRITICAL
    )

@event_handler('KDS.TICKET_SEND_FAILED')
async def on_kds_ticket_failed(event):
    """Capture KDS ticket failures"""
    obs_service = get_observability_service(db)
    
    await obs_service.create_error_inbox_item(
        venue_id=event.get('venue_id'),
        domain=Domain.KDS,
        error_code='KDS_UNAVAILABLE',
        error_message='Failed to send ticket to KDS',
        source={
            'source_type': 'EVENT',
            'event_id': event.get('id'),
            'request_id': event.get('request_id')
        },
        entity_refs={
            'order_id': event.get('order_id'),
            'ticket_id': event.get('ticket_id')
        },
        severity=Severity.WARNING
    )

print('[OK] Observability event listeners registered')
