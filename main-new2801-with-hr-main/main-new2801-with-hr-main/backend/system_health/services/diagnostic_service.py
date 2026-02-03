"""Self-Diagnostic Service"""
from datetime import datetime, timezone

from core.database import db
from system_health.services.health_service import health_service


class DiagnosticService:
    
    async def run_diagnostics(self, venue_id: str):
        """Run complete system diagnostics"""
        
        report = {
            "report_id": f"DIAG-{datetime.now(timezone.utc).isoformat()}",
            "venue_id": venue_id,
            "overall_status": "OK",
            "failed_checks": [],
            "suggested_actions": [],
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        # Step 1: Health check
        try:
            health = await health_service.get_health_snapshot(venue_id)
            if health["overall"] != "OK":
                report["failed_checks"].append({
                    "check": "Health Check",
                    "status": "FAIL",
                    "details": f"Overall: {health['overall']}"
                })
                report["overall_status"] = "WARN"
        except Exception as e:
            report["failed_checks"].append({
                "check": "Health Check",
                "status": "FAIL",
                "error": str(e)
            })
            report["overall_status"] = "CRIT"
        
        # Step 2: Job status
        try:
            jobs = await db.job_heartbeats.find({"venue_id": venue_id}, {"_id": 0}).to_list(100)
            stale_jobs = [j for j in jobs if j.get("status") != "OK"]
            if stale_jobs:
                report["failed_checks"].append({
                    "check": "Job Status",
                    "status": "FAIL",
                    "details": f"{len(stale_jobs)} jobs not OK"
                })
                report["overall_status"] = "WARN"
        except Exception:
            pass
        
        # Step 3: Integrity findings
        try:
            findings = await db.integrity_findings.find(
                {"venue_id": venue_id, "status": "OPEN"},
                {"_id": 0}
            ).to_list(100)
            
            if findings:
                report["failed_checks"].append({
                    "check": "Integrity Findings",
                    "status": "WARN",
                    "details": f"{len(findings)} open findings"
                })
                if report["overall_status"] == "OK":
                    report["overall_status"] = "WARN"
        except Exception:
            pass
        
        # Step 4: Outbox & DLQ
        try:
            outbox_lag = await db.event_outbox.count_documents({"consumed_at": None})
            dlq_count = await db.event_dlq.count_documents({})
            
            if outbox_lag > 100 or dlq_count > 10:
                report["failed_checks"].append({
                    "check": "Event Infrastructure",
                    "status": "FAIL",
                    "details": f"Outbox lag: {outbox_lag}, DLQ: {dlq_count}"
                })
                report["overall_status"] = "CRIT"
        except Exception:
            pass
        
        # Generate suggestions
        if report["overall_status"] != "OK":
            report["suggested_actions"] = [
                "Review failed checks in detail",
                "Check system logs for errors",
                "Run integrity checks",
                "Restart background workers if needed"
            ]
        
        return report

diagnostic_service = DiagnosticService()
