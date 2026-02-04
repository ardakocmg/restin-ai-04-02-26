"""Pre-Go-Live Service"""
from datetime import datetime, timezone

from core.database import db
from ops.models.pre_go_live import PreGoLiveRun, PreGoLiveCheck
from system_health.services.health_service import health_service


class PreGoLiveService:
    
    async def run_certification(self, venue_id: str, started_by: str):
        """Run complete pre-go-live certification"""
        
        run = PreGoLiveRun(
            venue_id=venue_id,
            started_by=started_by,
            status="RUNNING"
        )
        
        checks = []
        
        # Check 1: System Health
        try:
            health = await health_service.get_health_snapshot(venue_id)
            if health["overall"] == "OK":
                checks.append(PreGoLiveCheck(
                    key="system_health",
                    status="PASS",
                    details="All systems healthy"
                ))
            else:
                checks.append(PreGoLiveCheck(
                    key="system_health",
                    status="FAIL",
                    details=f"Health: {health['overall']}"
                ))
        except Exception as e:
            checks.append(PreGoLiveCheck(
                key="system_health",
                status="FAIL",
                details=str(e)
            ))
        
        # Check 2: Outbox Consumer
        try:
            heartbeat = await db.job_heartbeats.find_one({"job_key": "outbox_consumer"})
            if heartbeat and heartbeat.get("status") == "OK":
                checks.append(PreGoLiveCheck(
                    key="outbox_consumer",
                    status="PASS",
                    details="Outbox consumer running"
                ))
            else:
                checks.append(PreGoLiveCheck(
                    key="outbox_consumer",
                    status="FAIL",
                    details="Consumer not healthy"
                ))
        except Exception:
            checks.append(PreGoLiveCheck(
                key="outbox_consumer",
                status="FAIL",
                details="Could not verify consumer"
            ))
        
        # Check 3: No critical integrity issues
        try:
            crit_count = await db.integrity_findings.count_documents({
                "venue_id": venue_id,
                "severity": "CRITICAL",
                "status": "OPEN"
            })
            
            if crit_count == 0:
                checks.append(PreGoLiveCheck(
                    key="integrity",
                    status="PASS",
                    details="No critical issues"
                ))
            else:
                checks.append(PreGoLiveCheck(
                    key="integrity",
                    status="FAIL",
                    details=f"{crit_count} critical findings"
                ))
        except Exception:
            checks.append(PreGoLiveCheck(
                key="integrity",
                status="FAIL",
                details="Could not check integrity"
            ))
        
        # Determine overall
        has_fail = any(c.status == "FAIL" for c in checks)
        run.status = "FAIL" if has_fail else "PASS"
        run.checks = checks
        run.finished_at = datetime.now(timezone.utc).isoformat()
        
        # Store run
        await db.pre_go_live_runs.insert_one(run.model_dump())
        
        return run

pre_go_live_service = PreGoLiveService()
