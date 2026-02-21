"""
Observability Service - Test Panel & Error Collection
"""

from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
import json
import hashlib
from models.observability import (
    ErrorInboxItem, TestPanelRun, StepDetail, StepStatus,
    Severity, Domain, ErrorInboxStatus, RetryPlan
)

class ObservabilityService:
    def __init__(self, db):
        self.db = db
        self.safe_prefixes = [
            "/api/venues",
            "/api/orders",
            "/api/kds",
            "/api/inventory",
            "/api/print-jobs",
            "/api/menu",
            "/api/reports",
            "/api/devices",
            "/api/telemetry",
            "/api/guide",
            "/api/health"
        ]
        self.disallowed_prefixes = [
            "/api/auth",
            "/api/observability",
            "/api/admin",
            "/api/users",
            "/api/venue-integrations"
        ]
    
    # ============= ERROR INBOX =============
    
    async def create_error_inbox_item(
        self,
        venue_id: str,
        domain: Domain,
        error_code: str,
        error_message: str,
        source: Dict[str, Any],
        entity_refs: Dict[str, Any] = None,
        steps: List[StepDetail] = None,
        severity: Severity = Severity.ERROR
    ) -> ErrorInboxItem:
        """Create or update error inbox item (deduplication)"""
        
        # Generate signature for deduplication
        signature = self._build_signature(venue_id, domain, error_code, entity_refs or {})
        
        # Check if already exists
        existing = await self.db.obs_error_inbox.find_one(
            {"signature": signature, "status": {"$in": ["OPEN", "ACKED"]}},
            {"_id": 0}
        )
        
        now = datetime.now(timezone.utc).isoformat()
        
        if existing:
            # Update existing
            update_doc = {
                "last_seen_at": now,
            }
            existing_severity = existing.get("severity", Severity.ERROR)
            if self._severity_rank(severity) > self._severity_rank(existing_severity):
                update_doc["severity"] = severity
            await self.db.obs_error_inbox.update_one(
                {"id": existing["id"]},
                {
                    "$set": update_doc,
                    "$inc": {"occurrence_count": 1}
                }
            )
            existing.update(update_doc)
            existing["occurrence_count"] = existing.get("occurrence_count", 1) + 1
            return existing
        
        # Create new
        # Generate display_id
        count = await self.db.obs_error_inbox.count_documents({"venue_id": venue_id})
        display_id = f"ERR-{count + 1:04d}"
        
        item = ErrorInboxItem(
            display_id=display_id,
            venue_id=venue_id,
            created_at=now,
            last_seen_at=now,
            severity=severity,
            domain=domain,
            signature=signature,
            source=source,
            error={"code": error_code, "message": error_message},
            entity_refs=entity_refs or {},
            steps=steps or [],
        )
        
        # Generate retry plan if retryable
        item.retry_plan = self.generate_retry_plan(domain, error_code, source, entity_refs or {})
        
        item_dict = item.model_dump()
        await self.db.obs_error_inbox.insert_one(item_dict.copy())
        
        return item
    
    def generate_retry_plan(
        self,
        domain: Domain,
        error_code: str,
        source: Dict[str, Any],
        entity_refs: Dict[str, Any]
    ) -> Optional[RetryPlan]:
        """Generate safe retry plan based on error type or request context"""
        request_target = source.get("target") if source else None
        if request_target:
            return self._build_retry_plan_from_request(request_target, source)

        # Define retryable scenarios
        retryable_errors = {
            "INSUFFICIENT_STOCK": {
                "mode": "STEP_RETRY",
                "target": {"method": "POST", "path": "/api/inventory/ledger"},
                "base_query": {
                    "item_id": entity_refs.get("item_id") or entity_refs.get("sku_id"),
                    "action": "OUT",
                    "quantity": 1
                },
                "editable_fields": [
                    {"path": "item_id", "label": "Item ID", "type": "string", "location": "query"},
                    {"path": "action", "label": "Action", "type": "string", "location": "query"},
                    {"path": "quantity", "label": "Quantity", "type": "number", "location": "query"},
                    {"path": "reason", "label": "Reason", "type": "string", "location": "query"}
                ]
            },
            "KDS_UNAVAILABLE": {
                "mode": "STEP_RETRY",
                "target": {"method": "POST", "path": "/api/orders/{order_id}/send"},
                "base_body": {"do_print": False, "do_kds": True, "do_stock": False},
                "editable_fields": [
                    {"path": "order_id", "label": "Order ID", "type": "string", "location": "path"},
                    {"path": "do_kds", "label": "Send to KDS", "type": "boolean", "location": "body"},
                    {"path": "do_print", "label": "Print Receipt", "type": "boolean", "location": "body"},
                    {"path": "do_stock", "label": "Update Stock", "type": "boolean", "location": "body"}
                ]
            }
        }

        if error_code not in retryable_errors:
            return RetryPlan(
                allowed=False,
                mode="NONE",
                requires_token=True,
                idempotency_key_template="",
                target={}
            )

        config = retryable_errors[error_code]
        return RetryPlan(
            allowed=self.is_path_allowed(config["target"].get("path", "")),
            mode=config["mode"],
            requires_token=True,
            action_token_ttl_seconds=60,
            idempotency_key_template="OBS-RETRY-{{err_id}}-{{attempt}}",
            target=config["target"],
            base_query=config.get("base_query", {}),
            base_body_redacted=self._sanitize_payload(config.get("base_body", {})),
            editable_fields=config.get("editable_fields", []),
            guards=[
                {"rule": "ALLOWLIST_PATH", "value": True},
                {"rule": "NOT_AUTH_ENDPOINT", "value": True}
            ]
        )
    
    # ============= TEST PANEL =============
    
    async def create_test_run(
        self,
        venue_id: str,
        user_id: str,
        target: Dict[str, str],
        request_body: Dict[str, Any],
        request_query: Dict[str, Any],
        response: Dict[str, Any],
        status_code: int,
        steps: List[StepDetail],
        trace: Dict[str, Any] = None,
        events: List[Dict[str, Any]] = None,
        audits: List[Dict[str, Any]] = None,
        diagrams: Dict[str, str] = None
    ) -> TestPanelRun:
        """Create test panel run artifact"""
        
        count = await self.db.obs_testpanel_runs.count_documents({"venue_id": venue_id})
        display_id = f"RUN-{count + 1:04d}"
        
        run = TestPanelRun(
            display_id=display_id,
            venue_id=venue_id,
            created_at=datetime.now(timezone.utc).isoformat(),
            created_by=user_id,
            test_type="MANUAL",
            target=target,
            request_body=request_body,
            request_query=request_query or {},
            response=response,
            status_code=status_code,
            steps=steps,
            trace=trace or {},
            events=events or [],
            audits=audits or [],
            diagrams=diagrams or {},
            success=status_code < 400
        )
        
        run_dict = run.model_dump()
        await self.db.obs_testpanel_runs.insert_one(run_dict.copy())
        
        return run

    # ============= SYSTEM & DLQ MONITORING (Added for 100% Maturity) =============
    
    async def log_background_error(self, source_name: str, error_msg: str, metadata: dict = None):
        """Log a silently suppressed background task error to DB."""
        try:
            log_entry = {
                "source": source_name,
                "error_message": error_msg,
                "metadata": metadata or {},
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "status": "UNRESOLVED"
            }
            await self.db.system_errors.insert_one(log_entry)
            print(f"🚨 [Observability] {source_name} Error: {error_msg}")
        except Exception as e:
            print(f"Failed to log background error: {e}")

    async def get_dlq_stats(self) -> dict:
        """Fetch current stats on Dead Letter Queue health."""
        total_dlq = await self.db.event_dlq.count_documents({})
        unresolved_errors = await self.db.system_errors.count_documents({"status": "UNRESOLVED"})
        
        recent_dlq = await self.db.event_dlq.find({}, {"_id": 0, "event_type": 1, "final_error": 1, "moved_to_dlq_at": 1}).sort("moved_to_dlq_at", -1).limit(5).to_list(5)
        
        return {
            "dlq_size": total_dlq,
            "unresolved_system_errors": unresolved_errors,
            "recent_dlq_events": recent_dlq,
            "status": "HEALTHY" if total_dlq == 0 else "WARNING"
        }
    
    
    # ============= STEPS GENERATOR =============
    
    def generate_steps_for_order_send(self, order_data: Dict[str, Any], result: Dict[str, Any]) -> List[StepDetail]:
        """Generate steps for POS order send operation"""
        steps = []
        now = datetime.now(timezone.utc).isoformat()
        
        # Step 1: Validate order
        steps.append(StepDetail(
            step_id="VALIDATE_ORDER",
            title="Validate order data",
            domain=Domain.POS,
            status=StepStatus.SUCCESS if result.get("ok") else StepStatus.FAILED,
            severity=Severity.INFO,
            blocking=True,
            retryable=False,
            timestamp=now
        ))
        
        # Step 2: Send to KDS
        if order_data.get("do_kds"):
            steps.append(StepDetail(
                step_id="SEND_TO_KDS",
                title="Send tickets to KDS",
                domain=Domain.KDS,
                status=StepStatus.SUCCESS if result.get("kds_ok") else StepStatus.FAILED,
                severity=Severity.WARNING,
                blocking=False,
                retryable=True,
                timestamp=now
            ))
        
        # Step 3: Print receipt
        if order_data.get("do_print"):
            steps.append(StepDetail(
                step_id="PRINT_RECEIPT",
                title="Print receipt",
                domain=Domain.DEVICES,
                status=StepStatus.SUCCESS,
                severity=Severity.INFO,
                blocking=False,
                retryable=True,
                timestamp=now
            ))
        
        # Step 4: Update inventory
        if order_data.get("do_stock"):
            steps.append(StepDetail(
                step_id="UPDATE_INVENTORY",
                title="Deduct inventory (recipe-based)",
                domain=Domain.INVENTORY,
                status=StepStatus.SUCCESS,
                severity=Severity.WARNING,
                blocking=False,
                retryable=True,
                report_impacts=["INVENTORY_LEDGER", "COGS"],
                timestamp=now
            ))
        
        return steps

    def generate_generic_steps(self, target: Dict[str, str], status_code: int) -> List[StepDetail]:
        now = datetime.now(timezone.utc).isoformat()
        success = status_code < 400
        return [
            StepDetail(
                step_id="REQUEST_DISPATCH",
                title=f"Dispatch {target.get('method', 'REQUEST')} {target.get('path', '')}",
                domain=Domain.SYSTEM,
                status=StepStatus.SUCCESS,
                severity=Severity.INFO,
                blocking=True,
                retryable=False,
                timestamp=now
            ),
            StepDetail(
                step_id="RESPONSE_RECEIVED",
                title="Process response",
                domain=Domain.SYSTEM,
                status=StepStatus.SUCCESS if success else StepStatus.FAILED,
                severity=Severity.INFO if success else Severity.ERROR,
                blocking=False,
                retryable=not success,
                timestamp=now
            )
        ]

    def is_path_allowed(self, path: str) -> bool:
        if not path or not path.startswith("/api/"):
            return False
        if any(path.startswith(prefix) for prefix in self.disallowed_prefixes):
            return False
        return any(path.startswith(prefix) for prefix in self.safe_prefixes)

    def _build_retry_plan_from_request(self, target: Dict[str, str], source: Dict[str, Any]) -> RetryPlan:
        method = (target.get("method") or "").upper()
        path = target.get("path") or ""
        allowed = self.is_path_allowed(path)
        base_body = self._sanitize_payload(source.get("request_body", {}))
        base_query = self._sanitize_payload(source.get("request_query", {}))

        editable_fields = []
        for key, value in base_body.items():
            editable_fields.append({
                "path": key,
                "label": key.replace("_", " ").title(),
                "type": self._infer_field_type(value),
                "location": "body"
            })
        for key, value in base_query.items():
            editable_fields.append({
                "path": key,
                "label": key.replace("_", " ").title(),
                "type": self._infer_field_type(value),
                "location": "query"
            })

        return RetryPlan(
            allowed=allowed,
            mode="FULL_REPLAY",
            requires_token=True,
            action_token_ttl_seconds=60,
            idempotency_key_template="OBS-RETRY-{{err_id}}-{{attempt}}",
            target={"method": method, "path": path},
            base_query=base_query,
            base_body_redacted=base_body,
            editable_fields=editable_fields,
            guards=[
                {"rule": "ALLOWLIST_PATH", "value": True},
                {"rule": "NOT_AUTH_ENDPOINT", "value": True}
            ]
        )

    def _build_signature(self, venue_id: str, domain: Domain, error_code: str, entity_refs: Dict[str, Any]) -> str:
        domain_value = domain.value if hasattr(domain, "value") else str(domain)
        raw = f"{venue_id}:{domain_value}:{error_code}:{json.dumps(entity_refs or {}, sort_keys=True, default=str)}"
        return hashlib.sha256(raw.encode()).hexdigest()

    def _infer_field_type(self, value: Any) -> str:
        if isinstance(value, bool):
            return "boolean"
        if isinstance(value, (int, float)):
            return "number"
        if isinstance(value, list):
            return "array"
        if isinstance(value, dict):
            return "object"
        return "string"

    def _sanitize_payload(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        if not isinstance(payload, dict):
            return {}
        redacted = {}
        for key, value in payload.items():
            lowered = key.lower()
            if any(sensitive in lowered for sensitive in ["password", "pin", "token", "authorization", "secret"]):
                redacted[key] = "***"
            else:
                redacted[key] = value
        return redacted

    def _severity_rank(self, severity: Severity) -> int:
        ranks = {
            Severity.INFO: 1,
            Severity.WARNING: 2,
            Severity.ERROR: 3,
            Severity.CRITICAL: 4
        }
        if isinstance(severity, str):
            try:
                return ranks.get(Severity(severity), 1)
            except Exception:
                return 1
        return ranks.get(severity, 1)

observability_service = None

def get_observability_service(db):
    global observability_service
    if observability_service is None:
        observability_service = ObservabilityService(db)
    return observability_service
