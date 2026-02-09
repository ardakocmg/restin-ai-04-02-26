from fastapi import FastAPI, HTTPException, Header, Body
from datetime import datetime
import logging
from typing import Dict

# App Components
from app.core.config import settings
from app.core.crypto.envelope import EnvelopeCrypto
from app.services.malta_payroll import MaltaPayrollEngine
from app.models.schemas import PayrollRequest

# Setup Logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("MaltaHR")

app = FastAPI(title=settings.APP_NAME)

from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    # ALLOW ALL ORIGINS for Local Restaurant LAN (Tablets, KDS, Phones)
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from app.domains.hr import router as hr_router
from app.domains.inventory import router as inventory_router
from app.domains.pos import router as pos_router
from app.domains.auth import router as auth_router
from app.domains.venues import router as venues_router
from app.domains.migrations import router as migrations_router

app.include_router(hr_router)
app.include_router(inventory_router)
app.include_router(pos_router)
app.include_router(auth_router)
app.include_router(venues_router)
app.include_router(migrations_router)

# MongoDB connection for vault endpoints
from app.core.database import get_database

@app.get("/health")
def read_health():
    return {"status": "System Operational", "region": "Malta", "config": "Secure"}

@app.post("/api/employees/secure-vault")
async def create_secret_vault(
    emp_id: str = Body(...), 
    secrets: dict = Body(...)
):
    try:
        encrypted = EnvelopeCrypto.encrypt(secrets)
        db = get_database()
        await db.secrets.update_one(
            {"emp_id": emp_id},
            {"$set": {"emp_id": emp_id, "data": encrypted}},
            upsert=True
        )
        logger.info(f"Vault created for employee {emp_id}")
        return {"status": "secured", "emp_id": emp_id}
    except Exception as e:
        logger.error(f"Vault creation failed: {e}")
        raise HTTPException(status_code=500, detail="Encryption failure")

@app.get("/api/employees/{emp_id}/reveal")
async def reveal_sensitive_data(
    emp_id: str, 
    type: str, 
    user_agent: str = Header(None)
):
    logger.info(f"[ALERT] AUDIT LOG: Access to {type} for Employee {emp_id} at {datetime.now()} [UA: {user_agent}]")
    
    db = get_database()
    record = await db.secrets.find_one({"emp_id": emp_id})
    if not record or not record.get("data"):
        logger.warning(f"Vault access denied: Not found for {emp_id}")
        raise HTTPException(404, "Vault not found")

    try:
        full_data = EnvelopeCrypto.decrypt(record["data"])
    except Exception as e:
        logger.critical(f"Security integrity breach attempt or error: {e}")
        raise HTTPException(500, "Security Integrity Error")

    if type == "SALARY":
        return {"gross_annual": full_data.get("salary_gross")}
    elif type == "MEDICAL":
        return {"notes": full_data.get("medical_notes")}
    elif type == "FULL":
        return full_data
    
    return {"error": "Invalid data type"}

@app.post("/api/payroll/calculate")
async def calculate_payroll(request: PayrollRequest):
    logger.info(f"Payroll calculation requested for {request.gross_annual}")
    return MaltaPayrollEngine.calculate(request.gross_annual, request.tax_category, request.cola_eligible)

@app.post("/ai/generate")
async def generate_ai_content(
    provider: str = Body(...),
    model: str = Body(...),
    prompt: str = Body(...)
):
    """
    Master Protocol v18.0 AI Gateway
    Mocks the connection to Vertex AI/Gemini for the frontend wrapper.
    """
    logger.info(f"AI Generation Request: {provider}/{model} - Length: {len(prompt)}")
    
    # Simulation Logic
    import time
    time.sleep(1.5) # Simulate latency
    
    return {
        "text": f"**[AI Generated Content]**\nBased on your request for '{prompt[:30]}...', here is a simulated response from {model}. In production, this would connect to Vertex AI.",
        "usage": {"prompt_tokens": 50, "candidate_tokens": 100, "total_tokens": 150},
        "citationMetadata": {"citations": []}
    }

@app.get("/api/system/version")
async def get_system_version():
    """
    Returns the current system build version to prevent frontend 404 errors.
    """
    return {
        "version": "1.0.0",
        "build_id": "dev-build-2026",
        "environment": "development"
    }

if __name__ == "__main__":
    import uvicorn
    # Bind to 0.0.0.0 to allow LAN access (Tablets/Phones)
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
