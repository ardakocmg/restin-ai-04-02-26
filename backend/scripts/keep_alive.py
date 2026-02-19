"""
Keep-Alive Self-Ping for Render Free Tier
==========================================
Pings the /health endpoint every 14 minutes to prevent cold starts.
Run as a background task on app startup.
"""
import asyncio
import logging
import os

import httpx

logger = logging.getLogger(__name__)

HEALTH_URL = os.getenv("RENDER_EXTERNAL_URL", "https://restin-ai-backend.onrender.com") + "/health"
PING_INTERVAL = int(os.getenv("KEEP_ALIVE_INTERVAL", "840"))  # 14 minutes


async def _ping_loop():
    """Continuously ping the health endpoint to keep the Render instance warm."""
    async with httpx.AsyncClient(timeout=30) as client:
        while True:
            try:
                resp = await client.get(HEALTH_URL)
                logger.info("Keep-alive ping: %s (%dms)", resp.status_code, int(resp.elapsed.total_seconds() * 1000))
            except Exception as exc:
                logger.warning("Keep-alive ping failed: %s", exc)
            await asyncio.sleep(PING_INTERVAL)


def start_keep_alive():
    """Launch the keep-alive loop as a background task."""
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            loop.create_task(_ping_loop())
            logger.info("Keep-alive started (interval=%ds, url=%s)", PING_INTERVAL, HEALTH_URL)
        else:
            logger.warning("Event loop not running — keep-alive skipped")
    except RuntimeError:
        logger.warning("No event loop available — keep-alive skipped")
