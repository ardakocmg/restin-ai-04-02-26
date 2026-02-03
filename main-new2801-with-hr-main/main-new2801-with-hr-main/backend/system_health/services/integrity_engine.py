"""Integrity Engine Service"""
from datetime import datetime, timezone

from core.database import db
from system_health.models.integrity import IntegrityRun, IntegrityFinding


class IntegrityEngine:
    
    async def run_checks(self, venue_id: str, check_keys: list = None, mode: str = "SAFE"):
        """Run integrity checks"""
        
        # Create run
        run = IntegrityRun(
            venue_id=venue_id,
            triggered_by="MANUAL",
            status="RUNNING"
        )
        
        await db.integrity_runs.insert_one(run.model_dump())
        
        findings = []
        
        # Check 1: Negative stock over threshold
        neg_skus = await db.inventory_items.find(
            {"venue_id": venue_id, "quantity": {"$lt": 0}},
            {"_id": 0}
        ).to_list(100)
        
        if len(neg_skus) > 0:
            finding = IntegrityFinding(
                run_id=run.run_id,
                venue_id=venue_id,
                check_key="negative_stock_over_threshold",
                severity="MED",
                title=f"{len(neg_skus)} items with negative stock",
                details={"count": len(neg_skus)},
                evidence_refs=[s["id"] for s in neg_skus[:10]]
            )
            findings.append(finding)
            await db.integrity_findings.insert_one(finding.model_dump())
        
        # Check 2: Outbox lag
        lag = await db.event_outbox.count_documents({"consumed_at": None})
        if lag > 25:
            finding = IntegrityFinding(
                run_id=run.run_id,
                venue_id=venue_id,
                check_key="outbox_lag_exceeds",
                severity="HIGH" if lag > 100 else "MED",
                title=f"Outbox lag: {lag} events pending",
                details={"count": lag}
            )
            findings.append(finding)
            await db.integrity_findings.insert_one(finding.model_dump())
        
        # Finish run
        await db.integrity_runs.update_one(
            {"run_id": run.run_id},
            {"$set": {
                "status": "SUCCESS",
                "finished_at": datetime.now(timezone.utc).isoformat(),
                "summary": {
                    "findings_total": len(findings),
                    "high": len([f for f in findings if f.severity == "HIGH"]),
                    "crit": len([f for f in findings if f.severity == "CRITICAL"])
                }
            }}
        )
        
        return run.run_id

integrity_engine = IntegrityEngine()
