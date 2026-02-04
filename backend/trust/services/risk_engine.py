"""Risk Engine Service"""
from typing import List

from core.database import db
from trust.models.risk_rule import RiskFinding


class RiskEngine:
    
    async def evaluate(self, ctx: dict) -> List[RiskFinding]:
        """Evaluate risk rules for action context"""
        venue_id = ctx.get("venue_id")
        action_key = ctx.get("action_key")
        
        # Get applicable rules
        rules = await db.risk_rules.find(
            {
                "venue_id": venue_id,
                "enabled": True,
                "applies_to": action_key
            },
            {"_id": 0}
        ).to_list(100)
        
        findings = []
        
        for rule in rules:
            # Evaluate conditions (simplified - production would be more robust)
            if self._evaluate_conditions(rule["conditions"], ctx):
                finding = RiskFinding(
                    rule_id=rule["id"],
                    action_key=action_key,
                    severity=rule["severity"],
                    outcomes=rule["outcomes"],
                    evidence=[{"rule": rule["name"], "context": ctx}]
                )
                findings.append(finding)
        
        # Store findings
        for finding in findings:
            await db.risk_findings.insert_one(finding.model_dump())
        
        return findings
    
    def _evaluate_conditions(self, conditions: dict, ctx: dict) -> bool:
        """Evaluate condition DSL (simplified)"""
        # Production would implement full DSL evaluation
        # For now, simple check
        return len(conditions) > 0

risk_engine = RiskEngine()
