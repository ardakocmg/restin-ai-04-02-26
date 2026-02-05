from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Body
from typing import Optional, List, Dict
from core.dependencies import get_current_user
from services.migration.manager import MigrationManager
import json

router = APIRouter()

@router.post("/migrations/preview")
async def preview_migration(
    source: str = Form(...),
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user)
):
    """Preview migration data from file (Real CSV Parsing)"""
    try:
        content = await file.read()
        
        # Determine format
        print(f"Migration Upload:Filename={file.filename}, ContentType={file.content_type}")
        filename = file.filename.lower()
        
        # Determine format
        if filename.endswith('.csv'):
            import pandas as pd
            import io
            # Read CSV into DataFrame
            df = pd.read_csv(io.BytesIO(content))
            data = df # Pass DataFrame directly to adapter
        elif filename.endswith('.json'):
            import json
            data = json.loads(content)
        elif filename.endswith(('.xlsx', '.xls')):
            import pandas as pd
            import io
            # Read Excel into DataFrame
            df = pd.read_excel(io.BytesIO(content))
            data = df
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported file format ({file.filename}). Use CSV or JSON.")
            
        manager = MigrationManager(venue_id=user["venue_id"], user_id=user["id"])
        
        # Adapter will handle validation inside preview call or before
        # For now, let's call preview directly which should handle DF
        preview = manager.preview(source, data)
        return preview
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"Migration Error: {e}")
        raise HTTPException(status_code=400, detail=f"Migration Processing Failed: {str(e)}")

@router.post("/migrations/execute")
async def execute_migration(
    payload: Dict = Body(...),
    user: dict = Depends(get_current_user)
):
    """Execute confirmed migration"""
    # payload: { source: "apicbase", mode: "migrate", data: [...], options: {} }
    source = payload.get("source")
    data = payload.get("data")
    mode = payload.get("mode", "migrate")
    options = payload.get("options", {})

    manager = MigrationManager(venue_id=user["venue_id"], user_id=user["id"])
    result = await manager.execute(source, data, mode, options)
    return result

@router.get("/migrations/history")
async def get_migration_history(
    user: dict = Depends(get_current_user)
):
    """Get migration history for the venue"""
    # Verify DB Access
    from core.database import get_database
    db = get_database()
    
    # Simple fetch
    # Ensure to sort by started_at desc
    logs = await db.migration_logs.find(
        {"venue_id": user["venue_id"]}
    ).sort("started_at", -1).limit(50).to_list(length=50)
    
    # Map _id to id
    for log in logs:
        if "_id" in log:
            log["id"] = str(log["_id"])
            del log["_id"]
            
    return logs
