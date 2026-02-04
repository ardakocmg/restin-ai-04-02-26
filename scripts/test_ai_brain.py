"""
Script to test the AI Agent logic without running the full backend.
"""
import asyncio
import sys
import os

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from services.ai_agent import ai_agent

async def main():
    venue_id = "test_venue"
    
    print("[AI] Initializing Restin.ai Intelligence Test...\n")
    
    queries = [
        "How much sales did we make today?",
        "Who is currently working?",
        "Do we have low stock?",
        "What is the capital of Malta?" # Fallback test
    ]
    
    for q in queries:
        print(f"[User]: {q}")
        response = await ai_agent.ask(venue_id, q)
        # Force encode/decode to remove non-ascii for windows console
        sanitized = response.encode('ascii', 'ignore').decode('ascii')
        print(f"[AI]:   {sanitized}\n")
        print("-" * 50)

if __name__ == "__main__":
    asyncio.run(main())
