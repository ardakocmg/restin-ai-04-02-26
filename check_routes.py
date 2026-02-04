import sys
import os
from fastapi import FastAPI
from fastapi.routing import APIRouter

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

try:
    from routes.scheduler import router as scheduler_router
    print("Successfully imported scheduler_router")
    print(f"Prefix: {scheduler_router.prefix}")
    
    app = FastAPI()
    app.include_router(scheduler_router)
    
    found = False
    for route in app.routes:
        if route.path == "/api/scheduler/week":
            print(f"Found route: {route.path}")
            found = True
            break
    
    if not found:
        print("Route /api/scheduler/week NOT found in router")
        for route in app.routes:
            print(f"Available route: {route.path}")

except Exception as e:
    print(f"Error importing scheduler: {e}")
