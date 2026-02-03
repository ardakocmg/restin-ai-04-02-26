"""Event Bus - Publish/Subscribe system with MongoDB Outbox Pattern"""
import asyncio
from typing import Dict, List, Callable, Any
from datetime import datetime, timezone
import json
import uuid

from core.database import db


class EventBus:
    """Centralized event bus with outbox pattern"""
    
    def __init__(self):
        self.subscribers: Dict[str, List[Callable]] = {}
        self.running = False
    
    def subscribe(self, event_type: str, handler: Callable):
        """Subscribe to an event type"""
        if event_type not in self.subscribers:
            self.subscribers[event_type] = []
        self.subscribers[event_type].append(handler)
        return self
    
    async def publish(self, event_type: str, data: Dict[str, Any], metadata: Dict[str, Any] = None):
        """
        Publish event to outbox (MongoDB)
        Uses outbox pattern for reliability
        """
        event = {
            "id": str(uuid.uuid4()),
            "event_type": event_type,
            "data": data,
            "metadata": metadata or {},
            "status": "PENDING",
            "published_at": datetime.now(timezone.utc).isoformat(),
            "retry_count": 0,
            "max_retries": 3
        }
        
        # Write to outbox collection
        await db.event_outbox.insert_one(event)
        
        return event["id"]
    
    async def process_pending_events(self):
        """Process pending events from outbox (background worker)"""
        while self.running:
            try:
                # Get pending events
                events = await db.event_outbox.find(
                    {"status": "PENDING"},
                    {"_id": 0}
                ).limit(10).to_list(10)
                
                for event in events:
                    await self._process_event(event)
                
                # Sleep before next batch
                await asyncio.sleep(1)
            except Exception as e:
                print(f"Error processing events: {e}")
                await asyncio.sleep(5)
    
    async def _process_event(self, event: Dict):
        """Process a single event"""
        event_type = event["event_type"]
        event_id = event["id"]
        
        try:
            # Mark as processing
            await db.event_outbox.update_one(
                {"id": event_id},
                {"$set": {"status": "PROCESSING", "processing_started_at": datetime.now(timezone.utc).isoformat()}}
            )
            
            # Execute all subscribers
            if event_type in self.subscribers:
                for handler in self.subscribers[event_type]:
                    try:
                        await handler(event)
                    except Exception as handler_error:
                        print(f"Handler error for {event_type}: {handler_error}")
                        # Continue with other handlers
            
            # Mark as completed
            await db.event_outbox.update_one(
                {"id": event_id},
                {"$set": {
                    "status": "COMPLETED",
                    "completed_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            
        except Exception as e:
            # Mark as failed, increment retry
            retry_count = event.get("retry_count", 0) + 1
            max_retries = event.get("max_retries", 3)
            
            if retry_count >= max_retries:
                # Move to dead letter queue
                await self._move_to_dlq(event, str(e))
            else:
                # Retry later
                await db.event_outbox.update_one(
                    {"id": event_id},
                    {"$set": {
                        "status": "PENDING",
                        "retry_count": retry_count,
                        "last_error": str(e),
                        "last_retry_at": datetime.now(timezone.utc).isoformat()
                    }}
                )
    
    async def _move_to_dlq(self, event: Dict, error: str):
        """Move failed event to Dead Letter Queue"""
        dlq_event = event.copy()
        dlq_event["moved_to_dlq_at"] = datetime.now(timezone.utc).isoformat()
        dlq_event["final_error"] = error
        
        await db.event_dlq.insert_one(dlq_event)
        await db.event_outbox.delete_one({"id": event["id"]})
    
    def start(self):
        """Start the event processor"""
        self.running = True
    
    def stop(self):
        """Stop the event processor"""
        self.running = False


# Global event bus instance
event_bus = EventBus()


# Decorator for event handlers
def event_handler(event_type: str):
    """Decorator to register event handlers"""
    def decorator(func):
        event_bus.subscribe(event_type, func)
        return func
    return decorator
