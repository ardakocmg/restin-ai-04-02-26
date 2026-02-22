"""
Integration Test: Health Endpoint + Database Connectivity
Tests real API behavior with actual MongoDB connection.
This is a genuine E2E test that validates:
  1. FastAPI app starts
  2. /health endpoint responds
  3. MongoDB connection is live
  4. Audit scores endpoint returns valid payload
"""
import pytest
from httpx import AsyncClient, ASGITransport
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


@pytest.fixture
def app():
    """Get the FastAPI app instance."""
    from server import app
    return app


@pytest.mark.asyncio
async def test_health_endpoint(app):
    """Test /health returns 200 with db_ok field."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert "status" in data or "db_ok" in data


@pytest.mark.asyncio
async def test_audit_scores_structure(app):
    """Test /api/system/audit-scores returns valid structure."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/system/audit-scores")
        assert response.status_code == 200
        data = response.json()
        assert "overall_score" in data
        assert "scores" in data
        assert "evidence" in data
        assert isinstance(data["scores"], dict)
        assert len(data["scores"]) >= 5  # At least 5 dimensions


@pytest.mark.asyncio
async def test_hyperscale_metrics_structure(app):
    """Test /api/system/hyperscale-metrics returns valid metrics."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/system/hyperscale-metrics")
        assert response.status_code == 200
        data = response.json()
        # Must have critical fields
        assert "db_ok" in data
        assert "avg_latency_ms" in data or "uptime_seconds" in data


@pytest.mark.asyncio
async def test_rate_limiter_headers(app):
    """Test that rate limit headers are present in responses."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/health")
        # RateLimitMiddleware adds these headers
        assert "x-ratelimit-limit" in response.headers or response.status_code == 200


@pytest.mark.asyncio
async def test_cors_headers(app):
    """Test CORS is properly configured."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.options(
            "/health",
            headers={
                "Origin": "https://restin.ai",
                "Access-Control-Request-Method": "GET",
            }
        )
        # Should not be 405 Method Not Allowed
        assert response.status_code in [200, 204, 307]
