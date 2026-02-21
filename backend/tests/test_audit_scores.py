"""
Tests for the audit scores computation.
"""

import pytest
from routes.audit_scores_routes import compute_audit_scores, _compute_system_iq, _compute_resilience


class TestSystemIQ:
    """Test the System IQ composite health score."""

    def test_perfect_system(self):
        snapshot = {"error_rate_5xx": 0, "p99_latency_ms": 50}
        dlq = {"dlq_size": 0}
        score = _compute_system_iq(snapshot, dlq, db_ok=True, pending=0)
        assert score == 100

    def test_high_error_rate_penalizes(self):
        snapshot = {"error_rate_5xx": 0.1, "p99_latency_ms": 50}
        dlq = {"dlq_size": 0}
        score = _compute_system_iq(snapshot, dlq, db_ok=True, pending=0)
        assert score < 100

    def test_db_down_heavily_penalizes(self):
        snapshot = {"error_rate_5xx": 0, "p99_latency_ms": 50}
        dlq = {"dlq_size": 0}
        score = _compute_system_iq(snapshot, dlq, db_ok=False, pending=0)
        assert score <= 75

    def test_high_dlq_penalizes(self):
        snapshot = {"error_rate_5xx": 0, "p99_latency_ms": 50}
        dlq = {"dlq_size": 150}
        score = _compute_system_iq(snapshot, dlq, db_ok=True, pending=0)
        assert score <= 80


class TestResilience:
    """Test the resilience score calculation."""

    def test_no_requests(self):
        snapshot = {"total_requests": 0, "total_errors_5xx": 0}
        assert _compute_resilience(snapshot, db_ok=True) == 100.0

    def test_perfect_uptime(self):
        snapshot = {"total_requests": 1000, "total_errors_5xx": 0}
        assert _compute_resilience(snapshot, db_ok=True) == 100.0

    def test_some_errors(self):
        snapshot = {"total_requests": 1000, "total_errors_5xx": 10}
        resilience = _compute_resilience(snapshot, db_ok=True)
        assert resilience == 99.0

    def test_db_down(self):
        snapshot = {"total_requests": 1000, "total_errors_5xx": 0}
        assert _compute_resilience(snapshot, db_ok=False) == 0.0
