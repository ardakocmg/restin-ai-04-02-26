from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Body
from typing import Optional, List, Dict
from core.dependencies import get_current_user
from services.migration.manager import MigrationManager
import json

router = APIRouter()
print("[OK] Migration Routes Loaded")

@router.get("/migrations/ping")
async def ping_migrations():
    return {"status": "ok", "message": "Migration API is active"}

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
            # Read CSV into DataFrame (Auto-detect delimiter)
            df = pd.read_csv(io.BytesIO(content), sep=None, engine='python')
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
        preview = await manager.preview(source, data)
        
        # Add filename to preview response for tracking
        preview["filename"] = file.filename
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
    filename = payload.get("filename")  # Get filename from preview

    manager = MigrationManager(venue_id=user["venue_id"], user_id=user["id"])
    result = await manager.execute(source, data, mode, options, filename=filename)
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
            

@router.post("/migrations/backfill-item-ids")
async def backfill_item_ids(
    user: dict = Depends(get_current_user)
):
    """Backfill item_id for all recipes that don't have one"""
    from core.database import get_database
    db = get_database()
    
    venue_id = user["venue_id"]
    venue_prefix = venue_id[:2].upper() if venue_id else "XX"
    
    # Find recipes without item_id
    recipes_without_id = await db.RecipesEngineered.find({
        "venue_id": venue_id,
        "$or": [
            {"item_id": {"$exists": False}},
            {"item_id": ""},
            {"item_id": None}
        ]
    }).to_list(length=None)
    
    if not recipes_without_id:
        return {"status": "success", "message": "All recipes already have item_id", "updated": 0}
    
    # Get current max sequence
    max_recipe = await db.RecipesEngineered.find_one(
        {"venue_id": venue_id, "item_id": {"$regex": f"^{venue_prefix}/"}},
        sort=[("item_id", -1)]
    )
    
    current_seq = 0
    if max_recipe and max_recipe.get("item_id"):
        try:
            current_seq = int(max_recipe["item_id"].split("/")[1])
        except:
            current_seq = 0
    
    # If no existing sequences, start from count of all recipes
    if current_seq == 0:
        current_seq = await db.RecipesEngineered.count_documents({
            "venue_id": venue_id,
            "item_id": {"$exists": True, "$ne": "", "$ne": None}
        })
    
    updated_count = 0
    for recipe in recipes_without_id:
        current_seq += 1
        new_item_id = f"{venue_prefix}/{str(current_seq).zfill(3)}"
        
        await db.RecipesEngineered.update_one(
            {"_id": recipe["_id"]},
            {"$set": {"item_id": new_item_id}}
        )
        updated_count += 1
    
    return {
        "status": "success",
        "message": f"Assigned item_id to {updated_count} recipes",
        "updated": updated_count,
        "format": f"{venue_prefix}/001 - {venue_prefix}/{str(current_seq).zfill(3)}"
    }

    return logs
