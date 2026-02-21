import asyncio
import aiohttp
import time
import statistics
from datetime import datetime
import json

# Configuration
BASE_URL = "http://127.0.0.1:8000"
CONCURRENCY = 100
TOTAL_REQUESTS = 1000
VENUE_ID = "venue-caviar-bull"

class MetricsCollector:
    def __init__(self):
        self.latencies = []
        self.status_codes = {}
        self.start_time = 0.0
        self.end_time = 0.0

    def add(self, latency, status):
        self.latencies.append(latency)
        self.status_codes[status] = self.status_codes.get(status, 0) + 1

    def print_report(self, name):
        if not self.latencies:
            print(f"\n--- {name} Metrics ---")
            print("No data collected.")
            return

        total_time = self.end_time - self.start_time
        rps = len(self.latencies) / total_time if total_time > 0 else 0
        
        self.latencies.sort()
        p50 = self.latencies[int(len(self.latencies) * 0.50)]
        p95 = self.latencies[int(len(self.latencies) * 0.95)]
        p99 = self.latencies[int(len(self.latencies) * 0.99)]

        print(f"\n🚀 --- {name} METRICS ---")
        print(f"Total Requests  : {len(self.latencies)}")
        print(f"Concurrency     : {CONCURRENCY}")
        print(f"Time Taken      : {total_time:.2f} seconds")
        print(f"RPS (Peak)      : {rps:.2f} req/sec")
        print(f"Status Codes    : {self.status_codes}")
        print(f"⚡ Latency p50    : {p50*1000:.2f} ms")
        print(f"⚡ Latency p95    : {p95*1000:.2f} ms")
        print(f"⚡ Latency p99    : {p99*1000:.2f} ms")

async def fetch(session, url, method="GET", payload=None, collector=None):
    start = time.perf_counter()
    status = 500
    try:
        if method == "GET":
            async with session.get(url) as response:
                await response.read()
                status = response.status
        else:
            async with session.post(url, json=payload) as response:
                await response.read()
                status = response.status
    except Exception as e:
        status = "ERROR"
    
    latency = time.perf_counter() - start
    collector.add(latency, status)

async def run_cache_test():
    """Test the LRU Cache Scalability (Reads)"""
    collector = MetricsCollector()
    url = f"{BASE_URL}/api/venues/{VENUE_ID}/menu"
    
    print("\nStarting Test 1: Heavy Read / Cache Scalability (Menu DB Hits)...")
    connector = aiohttp.TCPConnector(limit=CONCURRENCY)
    collector.start_time = time.perf_counter()
    
    async with aiohttp.ClientSession(connector=connector) as session:
        tasks = [fetch(session, url, collector=collector) for _ in range(TOTAL_REQUESTS)]
        await asyncio.gather(*tasks)
        
    collector.end_time = time.perf_counter()
    collector.print_report("READ/CACHE HYPERSCALE")

async def run_checkout_abuse_test():
    """Test Resilience Rate Limiting & Financial Trust"""
    collector = MetricsCollector()
    url = f"{BASE_URL}/api/pos/orders"
    payload = {
        "venue_id": VENUE_ID,
        "items": [],
        "source": "pos",
        "customer_id": "cust-123"
    }
    
    # We only send 100 requests to trigger the 429 logic rapidly
    test_runs = 50
    print("\nStarting Test 2: Checkout Abuse & Rate Limiting (Financial Resilience)...")
    connector = aiohttp.TCPConnector(limit=50)
    collector.start_time = time.perf_counter()
    
    async with aiohttp.ClientSession(connector=connector) as session:
        tasks = [fetch(session, url, method="POST", payload=payload, collector=collector) for _ in range(test_runs)]
        await asyncio.gather(*tasks)
        
    collector.end_time = time.perf_counter()
    collector.print_report("FINANCIAL ABUSE RESILIENCE")

async def main():
    print("==================================================")
    print(" RESTIN.AI LOCAL HYPERSCALE SIMULATION SUITE")
    print("==================================================")
    await run_cache_test()
    await run_checkout_abuse_test()
    
if __name__ == "__main__":
    # Windows asyncio policy patch
    import sys
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(main())
