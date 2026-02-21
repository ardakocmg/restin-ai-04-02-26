"""
Tests for the Hyperscale Metrics API and MetricsCollector.
"""

import pytest
from core.metrics_collector import MetricsCollector


class TestMetricsCollector:
    """Test the in-memory APM metrics collector."""

    def test_initial_state(self):
        mc = MetricsCollector()
        snapshot = mc.get_snapshot()
        assert snapshot["total_requests"] == 0
        assert snapshot["rps"] == 0
        assert snapshot["p99_latency_ms"] == 0
        assert snapshot["error_rate_5xx"] == 0

    def test_record_request_increments_count(self):
        mc = MetricsCollector()
        mc.record_request(latency_ms=50.0, status_code=200, path="/api/test")
        snapshot = mc.get_snapshot()
        assert snapshot["total_requests"] == 1

    def test_latency_percentiles(self):
        mc = MetricsCollector()
        for i in range(100):
            mc.record_request(latency_ms=float(i), status_code=200, path="/api/test")
        snapshot = mc.get_snapshot()
        assert snapshot["p50_latency_ms"] >= 45
        assert snapshot["p50_latency_ms"] <= 55
        assert snapshot["p99_latency_ms"] >= 95

    def test_error_counting(self):
        mc = MetricsCollector()
        mc.record_request(latency_ms=10, status_code=200, path="/api/ok")
        mc.record_request(latency_ms=10, status_code=404, path="/api/not-found")
        mc.record_request(latency_ms=10, status_code=500, path="/api/crash")
        snapshot = mc.get_snapshot()
        assert snapshot["total_errors_4xx"] == 1
        assert snapshot["total_errors_5xx"] == 1
        assert snapshot["total_requests"] == 3

    def test_path_normalization(self):
        mc = MetricsCollector()
        mc.record_request(latency_ms=10, status_code=200, path="/api/orders/507f1f77bcf86cd799439011/items")
        snapshot = mc.get_snapshot()
        endpoints = snapshot["top_endpoints"]
        assert any(":id" in ep["path"] for ep in endpoints)

    def test_snapshot_creates_history(self):
        mc = MetricsCollector()
        mc.record_request(latency_ms=100, status_code=200, path="/api/test")
        mc.take_snapshot()
        snapshot = mc.get_snapshot()
        assert len(snapshot["latency_history"]) == 1
        assert len(snapshot["rps_history"]) == 1

    def test_resilience_calculation(self):
        """With 100 requests and 1 error, resilience should be 99%."""
        mc = MetricsCollector()
        for _ in range(99):
            mc.record_request(latency_ms=10, status_code=200, path="/api/test")
        mc.record_request(latency_ms=10, status_code=500, path="/api/crash")
        snapshot = mc.get_snapshot()
        error_rate = snapshot["error_rate_5xx"]
        assert error_rate == pytest.approx(0.01, abs=0.001)
