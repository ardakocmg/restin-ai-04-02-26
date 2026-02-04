"""
Observability Routes - Test Panel & Error Inbox
"""

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from typing import Optional, List, Dict, Any
from core.dependencies import get_current_user, check_venue_access
from core.database import db
from services.observability_service import get_observability_service
from services.permission_service import effective_permissions
from models.observability import Domain, ErrorInboxStatus, Severity, StepStatus
from datetime import datetime, timezone
import secrets
import json
import time
import httpx
import hashlib

def create_observability_router():
    router = APIRouter(prefix="/observability", tags=["observability"])

    def infer_domain_from_path(path: str) -> Domain:
        if "/kds" in path:
            return Domain.KDS
        if "/inventory" in path:
            return Domain.INVENTORY
        if "/orders" in path or "/pos" in path:
            return Domain.POS
        if "/devices" in path:
            return Domain.DEVICES
        if "/reservations" in path or "/guests" in path:
            return Domain.RESERVATIONS
        return Domain.SYSTEM

    def can_access_global(current_user: dict) -> bool:
        return current_user.get("role") in ["owner", "product_owner", "it_admin"]
    
    # ============= ERROR INBOX =============
    
    @router.get("/error-inbox")
    async def list_error_inbox(
        venue_id: str = Query(...),
        domains: Optional[str] = Query(None),  # comma-separated
        statuses: Optional[str] = Query(None),
        severities: Optional[str] = Query(None),
        error_codes: Optional[str] = Query(None),
        q: Optional[str] = Query(None),
        blocking_only: Optional[bool] = Query(False),
        retryable_only: Optional[bool] = Query(False),
        page: int = Query(1, ge=1),
        page_size: int = Query(50, ge=1, le=1000),
        sort_by: str = Query("created_at"),
        sort_dir: str = Query("desc"),
        occurrence_min: Optional[int] = Query(None),
        occurrence_max: Optional[int] = Query(None),
        last_seen_start: Optional[str] = Query(None),
        last_seen_end: Optional[str] = Query(None),
        current_user: dict = Depends(get_current_user)
    ):
        """List error inbox items with filters"""
        if venue_id == "GLOBAL":
            if not can_access_global(current_user):
                raise HTTPException(status_code=403, detail="Permission denied")
        else:
            await check_venue_access(current_user, venue_id)
        
        # Check permission
        venue = await db.venues.find_one({"id": venue_id}, {"_id": 0})
        venue_settings = venue.get("settings", {}) if venue else {}
        perms = effective_permissions(current_user["role"], venue_settings)
        if "OBS_ERROR_INBOX_VIEW" not in perms:
            raise HTTPException(status_code=403, detail="Permission denied")
        
        # Build query
        query = {"venue_id": venue_id}
        
        if domains:
            query["domain"] = {"$in": domains.split(",")}
        if statuses:
            query["status"] = {"$in": statuses.split(",")}
        if severities:
            query["severity"] = {"$in": severities.split(",")}
        if error_codes:
            query["error.code"] = {"$in": error_codes.split(",")}
        if q:
            query["$or"] = [
                {"error.message": {"$regex": q, "$options": "i"}},
                {"error.code": {"$regex": q, "$options": "i"}},
                {"display_id": {"$regex": q, "$options": "i"}}
            ]
        if blocking_only:
            query["steps.blocking"] = True
        if retryable_only:
            query["retry_plan.allowed"] = True

        if occurrence_min is not None or occurrence_max is not None:
            query["occurrence_count"] = {}
            if occurrence_min is not None:
                query["occurrence_count"]["$gte"] = occurrence_min
            if occurrence_max is not None:
                query["occurrence_count"]["$lte"] = occurrence_max

        if last_seen_start or last_seen_end:
            query["last_seen_at"] = {}
            if last_seen_start:
                query["last_seen_at"]["$gte"] = last_seen_start
            if last_seen_end:
                query["last_seen_at"]["$lte"] = last_seen_end

        sort_fields = {
            "created_at": "created_at",
            "last_seen_at": "last_seen_at",
            "occurrence_count": "occurrence_count",
            "severity": "severity",
            "status": "status"
        }
        sort_field = sort_fields.get(sort_by, "created_at")
        sort_direction = -1 if sort_dir == "desc" else 1

        total = await db.obs_error_inbox.count_documents(query)
        cursor = db.obs_error_inbox.find(query, {"_id": 0}).sort(sort_field, sort_direction)
        cursor = cursor.skip((page - 1) * page_size).limit(page_size)
        items = await cursor.to_list(page_size)
        
        return {
            "success": True,
            "items": items,
            "total": total
        }
    
    @router.get("/error-inbox/{error_id}")
    async def get_error_detail(
        error_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        """Get error inbox item detail"""
        item = await db.obs_error_inbox.find_one({"id": error_id}, {"_id": 0})
        if not item:
            raise HTTPException(status_code=404, detail="Error not found")
        
        if item["venue_id"] == "GLOBAL":
            if not can_access_global(current_user):
                raise HTTPException(status_code=403, detail="Permission denied")
        else:
            await check_venue_access(current_user, item["venue_id"])

        # Check permission
        venue = await db.venues.find_one({"id": item["venue_id"]}, {"_id": 0})
        venue_settings = venue.get("settings", {}) if venue else {}
        perms = effective_permissions(current_user["role"], venue_settings)
        if "OBS_ERROR_INBOX_VIEW" not in perms:
            raise HTTPException(status_code=403, detail="Permission denied")
        
        return {
            "success": True,
            "item": item
        }
    
    @router.post("/error-inbox/{error_id}/action-token")
    async def get_action_token(
        error_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        """Generate one-time action token for retry"""
        item = await db.obs_error_inbox.find_one({"id": error_id}, {"_id": 0})
        if not item:
            raise HTTPException(status_code=404, detail="Error not found")
        
        if item["venue_id"] == "GLOBAL":
            if not can_access_global(current_user):
                raise HTTPException(status_code=403, detail="Permission denied")
        else:
            await check_venue_access(current_user, item["venue_id"])
        
        # Check permission
        venue = await db.venues.find_one({"id": item["venue_id"]}, {"_id": 0})
        venue_settings = venue.get("settings", {}) if venue else {}
        perms = effective_permissions(current_user["role"], venue_settings)
        if "OBS_ERROR_INBOX_ACTIONS" not in perms:
            raise HTTPException(status_code=403, detail="Permission denied")

        if not item.get("retry_plan") or not item["retry_plan"].get("allowed"):
            raise HTTPException(status_code=400, detail="Retry not allowed")
        
        # Generate one-time token
        action_token = secrets.token_urlsafe(32)
        ttl = item.get("retry_plan", {}).get("action_token_ttl_seconds", 60)
        expires_at = datetime.now(timezone.utc).timestamp() + ttl
        
        # Store token
        await db.obs_action_tokens.insert_one({
            "token": action_token,
            "error_id": error_id,
            "user_id": current_user["id"],
            "expires_at": expires_at,
            "used": False
        })
        
        return {
            "success": True,
            "action_token": action_token,
            "expires_in_seconds": ttl
        }
    
    @router.post("/error-inbox/{error_id}/retry")
    async def retry_error(
        error_id: str,
        retry_req: dict,
        request: Request,
        current_user: dict = Depends(get_current_user)
    ):
        """Retry failed operation with optional fixes"""
        item = await db.obs_error_inbox.find_one({"id": error_id}, {"_id": 0})
        if not item:
            raise HTTPException(status_code=404, detail="Error not found")
        
        if item["venue_id"] == "GLOBAL":
            if not can_access_global(current_user):
                raise HTTPException(status_code=403, detail="Permission denied")
        else:
            await check_venue_access(current_user, item["venue_id"])
        
        # Validate action token
        action_token = retry_req.get("token")
        if not action_token:
            raise HTTPException(status_code=400, detail="Action token required")
        
        token_doc = await db.obs_action_tokens.find_one({"token": action_token})
        if not token_doc or token_doc["used"] or token_doc["expires_at"] < datetime.now(timezone.utc).timestamp():
            raise HTTPException(status_code=403, detail="Invalid or expired action token")
        
        # Mark token as used
        await db.obs_action_tokens.update_one(
            {"token": action_token},
            {"$set": {"used": True}}
        )

        retry_plan = item.get("retry_plan") or {}
        if not retry_plan.get("allowed"):
            raise HTTPException(status_code=400, detail="Retry not allowed")

        patch = retry_req.get("patch", {}) or {}
        patch_body = patch.get("body", {}) or {}
        patch_query = patch.get("query", {}) or {}

        editable_fields = retry_plan.get("editable_fields", [])
        allowed_body_paths = {f.get("path") for f in editable_fields if f.get("location") in [None, "body"]}
        allowed_query_paths = {f.get("path") for f in editable_fields if f.get("location") == "query"}
        allowed_path_vars = {f.get("path") for f in editable_fields if f.get("location") == "path"}

        def set_nested_value(target: Dict[str, Any], path: str, value: Any):
            parts = path.split(".")
            current = target
            for part in parts[:-1]:
                if part not in current or not isinstance(current[part], dict):
                    current[part] = {}
                current = current[part]
            current[parts[-1]] = value

        for key in patch_body.keys():
            if key not in allowed_body_paths:
                raise HTTPException(status_code=400, detail=f"Field not editable: {key}")
        for key in patch_query.keys():
            if key not in allowed_query_paths:
                raise HTTPException(status_code=400, detail=f"Field not editable: {key}")

        base_body = retry_plan.get("base_body_redacted", {}) or {}
        base_query = retry_plan.get("base_query", {}) or {}

        for key, value in patch_body.items():
            if key in allowed_path_vars:
                continue
            set_nested_value(base_body, key, value)
        for key, value in patch_query.items():
            if key in allowed_path_vars:
                continue
            set_nested_value(base_query, key, value)

        target = retry_plan.get("target", {})
        method = (target.get("method") or "POST").upper()
        path = target.get("path") or ""

        # Replace path variables from entity_refs or patch
        path_vars = {**(item.get("entity_refs") or {}), **{k: patch_body.get(k) for k in allowed_path_vars}, **{k: patch_query.get(k) for k in allowed_path_vars}}
        for key, value in path_vars.items():
            if value is None:
                continue
            path = path.replace(f"{{{key}}}", str(value)).replace(f"{{{{{key}}}}}", str(value))

        obs_service = get_observability_service(db)
        if not obs_service.is_path_allowed(path):
            raise HTTPException(status_code=400, detail="Target not allowed")

        attempt = item.get("retry_attempts", 0) + 1
        idempotency_template = retry_plan.get("idempotency_key_template", "OBS-RETRY-{err_id}-{attempt}")
        idempotency_key = idempotency_template.replace("{{err_id}}", error_id).replace("{{attempt}}", str(attempt))

        headers = {
            "X-Idempotency-Key": idempotency_key,
            "X-Observability-Retry": "true"
        }
        auth_header = request.headers.get("Authorization")
        if auth_header:
            headers["Authorization"] = auth_header

        started = time.monotonic()
        response_payload = {}
        status_code = 500
        try:
            async with httpx.AsyncClient(base_url=str(request.base_url)) as client:
                if method in ["GET", "DELETE"]:
                    response = await client.request(method, path, params=base_query, headers=headers)
                else:
                    response = await client.request(method, path, params=base_query, json=base_body, headers=headers)
            status_code = response.status_code
            try:
                response_payload = response.json()
            except Exception:
                response_payload = {"raw": response.text}
        except Exception as exc:
            response_payload = {"error": str(exc)}
            status_code = 500

        duration_ms = int((time.monotonic() - started) * 1000)
        now = datetime.now(timezone.utc).isoformat()
        success = status_code < 400

        await db.obs_retry_audits.insert_one({
            "id": secrets.token_urlsafe(12),
            "error_id": error_id,
            "user_id": current_user["id"],
            "attempt": attempt,
            "created_at": now,
            "request": {
                "method": method,
                "path": path,
                "query": base_query,
                "body": base_body
            },
            "response": {
                "status_code": status_code,
                "payload": response_payload,
                "duration_ms": duration_ms
            }
        })

        update_doc = {
            "retry_attempts": attempt,
            "last_retry_at": now,
            "status": "RESOLVED" if success else item.get("status", "OPEN"),
        }
        if success:
            update_doc["resolution"] = {
                "resolved_by_user_id": current_user["id"],
                "resolved_at": now,
                "resolution_note": "Retried successfully"
            }

        await db.obs_error_inbox.update_one(
            {"id": error_id},
            {
                "$set": update_doc,
                "$push": {
                    "steps": {
                        "step_id": f"RETRY_ATTEMPT_{attempt}",
                        "title": "Retry attempt",
                        "domain": item.get("domain", Domain.SYSTEM),
                        "status": "RETRIED" if success else "FAILED",
                        "severity": "INFO" if success else "ERROR",
                        "blocking": False,
                        "retryable": not success,
                        "timestamp": now,
                        "error_detail": {
                            "status_code": status_code,
                            "duration_ms": duration_ms
                        }
                    }
                }
            }
        )

        return {
            "success": success,
            "message": "Retry executed" if success else "Retry failed",
            "status_code": status_code,
            "response": response_payload
        }
    
    @router.post("/error-inbox/{error_id}/acknowledge")
    async def acknowledge_error(
        error_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        """Acknowledge error (change status to ACKED)"""
        item = await db.obs_error_inbox.find_one({"id": error_id}, {"_id": 0})
        if not item:
            raise HTTPException(status_code=404, detail="Error not found")
        
        if item["venue_id"] == "GLOBAL":
            if not can_access_global(current_user):
                raise HTTPException(status_code=403, detail="Permission denied")
        else:
            await check_venue_access(current_user, item["venue_id"])

        venue = await db.venues.find_one({"id": item["venue_id"]}, {"_id": 0})
        venue_settings = venue.get("settings", {}) if venue else {}
        perms = effective_permissions(current_user["role"], venue_settings)
        if "OBS_ERROR_INBOX_ACTIONS" not in perms:
            raise HTTPException(status_code=403, detail="Permission denied")
        
        await db.obs_error_inbox.update_one(
            {"id": error_id},
            {"$set": {"status": "ACKED"}}
        )
        
        return {"success": True}
    
    # ============= TEST PANEL =============
    
    @router.post("/testpanel/run")
    async def run_test(
        test_req: dict,
        request: Request,
        current_user: dict = Depends(get_current_user)
    ):
        """Execute test API call and capture results"""
        venue_id = test_req.get("venue_id")
        await check_venue_access(current_user, venue_id)
        
        # Check permission
        venue = await db.venues.find_one({"id": venue_id}, {"_id": 0})
        venue_settings = venue.get("settings", {}) if venue else {}
        perms = effective_permissions(current_user["role"], venue_settings)
        if "OBS_TESTPANEL_RUN" not in perms:
            raise HTTPException(status_code=403, detail="Permission denied")

        obs_service = get_observability_service(db)
        target = test_req.get("target", {}) or {}
        method = (target.get("method") or "GET").upper()
        path = target.get("path") or ""
        request_body = test_req.get("request_body", {}) or {}
        request_query = test_req.get("request_query", {}) or {}

        if not obs_service.is_path_allowed(path):
            raise HTTPException(status_code=400, detail="Target not allowed")

        if method not in ["GET", "POST", "PUT", "PATCH", "DELETE"]:
            raise HTTPException(status_code=400, detail="Unsupported method")

        # Compose idempotency key based on request signature
        signature_raw = json.dumps({"method": method, "path": path, "body": request_body, "query": request_query}, sort_keys=True, default=str)
        signature_digest = hashlib.sha256(signature_raw.encode()).hexdigest()[:16]
        idempotency_key = f"OBS-TEST-{signature_digest}"

        headers = {
            "X-Idempotency-Key": idempotency_key,
            "X-Observability-Test": "true"
        }
        auth_header = request.headers.get("Authorization")
        if auth_header:
            headers["Authorization"] = auth_header

        started = time.monotonic()
        response_payload = {}
        status_code = 500
        try:
            async with httpx.AsyncClient(base_url=str(request.base_url)) as client:
                if method in ["GET", "DELETE"]:
                    response = await client.request(method, path, params=request_query or request_body, headers=headers)
                else:
                    response = await client.request(method, path, params=request_query, json=request_body, headers=headers)
            status_code = response.status_code
            try:
                response_payload = response.json()
            except Exception:
                response_payload = {"raw": response.text}
        except Exception as exc:
            response_payload = {"error": str(exc)}
            status_code = 500

        duration_ms = int((time.monotonic() - started) * 1000)
        request_id = response.headers.get("X-Request-ID") if 'response' in locals() else None
        trace = {
            "request_id": request_id,
            "latency_ms": duration_ms,
            "method": method,
            "path": path,
            "status_code": status_code
        }

        if "/orders/" in path and path.endswith("/send"):
            steps = obs_service.generate_steps_for_order_send(request_body, response_payload)
        else:
            steps = obs_service.generate_generic_steps({"method": method, "path": path}, status_code)

        diagrams = {
            "mermaid_sequence": "sequenceDiagram\n    participant Client\n    participant API\n    Client->>API: Test Request\n    API-->>Client: Response"
        }

        run = await obs_service.create_test_run(
            venue_id=venue_id,
            user_id=current_user["id"],
            target={"method": method, "path": path},
            request_body=request_body,
            request_query=request_query,
            response=response_payload,
            status_code=status_code,
            steps=steps,
            trace=trace,
            events=[],
            audits=[],
            diagrams=diagrams
        )

        # If failed, capture error inbox item
        if status_code >= 400:
            severity = Severity.CRITICAL if status_code >= 500 else Severity.WARNING
            error_code = response_payload.get("code") if isinstance(response_payload, dict) else "TEST_PANEL_ERROR"
            error_message = response_payload.get("message") if isinstance(response_payload, dict) else "Test panel request failed"
            domain = infer_domain_from_path(path)

            await obs_service.create_error_inbox_item(
                venue_id=venue_id,
                domain=domain,
                error_code=error_code or "TEST_PANEL_ERROR",
                error_message=error_message or "Test panel request failed",
                source={
                    "source_type": "TEST_PANEL",
                    "request_id": request_id,
                    "target": {"method": method, "path": path},
                    "request_body": request_body,
                    "request_query": request_query,
                    "status_code": status_code
                },
                entity_refs={},
                steps=steps,
                severity=severity
            )

        return {
            "success": True,
            "run": run.model_dump()
        }
    
    @router.get("/testpanel/runs")
    async def list_test_runs(
        venue_id: str = Query(...),
        limit: int = Query(50, le=200),
        current_user: dict = Depends(get_current_user)
    ):
        """List test runs"""
        await check_venue_access(current_user, venue_id)

        venue = await db.venues.find_one({"id": venue_id}, {"_id": 0})
        venue_settings = venue.get("settings", {}) if venue else {}
        perms = effective_permissions(current_user["role"], venue_settings)
        if "OBS_TESTPANEL_RUN" not in perms:
            raise HTTPException(status_code=403, detail="Permission denied")
        
        runs = await db.obs_testpanel_runs.find(
            {"venue_id": venue_id},
            {"_id": 0}
        ).sort("created_at", -1).limit(limit).to_list(limit)
        
        return {
            "success": True,
            "runs": runs
        }
    
    return router
