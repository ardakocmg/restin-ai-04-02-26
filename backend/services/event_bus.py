"""Event Bus - Publish/Subscribe system with MongoDB Outbox Pattern"""
import asyncio
from typing import Dict, List, Callable, Any, Optional
from datetime import datetime, timezone
import json
import uuid

from core.database import db
from services.observability_service import get_observability_service


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
    
    async def publish(self, event_type: str, data: Dict[str, Any], metadata: Optional[Dict[str, Any]] = None):
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
        # 1. Recovery on startup: Process any leftover PENDING events
        try:
            pending_events = await db.event_outbox.find(
                {"status": "PENDING"},
                {"_id": 0}
            ).limit(1000).to_list(1000)
            
            for event in pending_events:
                asyncio.create_task(self._process_event(event))
                
            if pending_events:
                print(f"♻️ EventBus: Recovered {len(pending_events)} pending events on startup")
        except Exception as e:
            print(f"Error recovering pending events: {e}")

        # 2. Main processing loop
        has_watch = hasattr(db.event_outbox, 'watch')
        print(f"📡 EventBus: Change Streams supported = {has_watch}")
        
        while self.running:
            try:
                if has_watch:
                    # Real-time change stream (MongoDB Replica Set / Atlas)
                    pipeline = [{"$match": {"operationType": "insert"}}]
                    try:
                        async with db.event_outbox.watch(pipeline) as stream:
                            async for change in stream:
                                if not self.running:
                                    break
                                
                                event = change.get("fullDocument")
                                if event and event.get("status") == "PENDING":
                                    asyncio.create_task(self._process_event(event))
                    except Exception as watch_err:
                        if "changeStream" in str(watch_err) or "40573" in str(watch_err):
                            print("⚠️ EventBus: MongoDB Standalone detected. Falling back to interval polling.")
                            has_watch = False
                        else:
                            raise watch_err
                else:
                    # Fallback to polling (Mock DB or Standalone)
                    events = await db.event_outbox.find(
                        {"status": "PENDING"},
                        {"_id": 0}
                    ).limit(10).to_list(10)
                    
                    for event in events:
                        asyncio.create_task(self._process_event(event))
                    
                    await asyncio.sleep(1)
                    
            except Exception as e:
                # Sleep briefly to avoid tight crash loops if DB disconnects
                print(f"Error in EventBus watch/poll loop: {e}")
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
                        # Log handler error to observability
                        import asyncio
                        obs = get_observability_service(db)
                        if obs:
                            asyncio.create_task(obs.log_background_error(
                                source_name=f"EventBus.Handler[{event_type}]",
                                error_msg=str(handler_error),
                                metadata={"event_id": event_id}
                            ))
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
                # Alert observability about DLQ insertion
                obs = get_observability_service(db)
                if obs:
                    import asyncio
                    asyncio.create_task(obs.log_background_error(
                        source_name="EventBus.DLQ",
                        error_msg=f"Event {event_id} ({event_type}) moved to DLQ. Reason: {str(e)}",
                        metadata={"event_id": event_id, "event_type": event_type}
                    ))
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
