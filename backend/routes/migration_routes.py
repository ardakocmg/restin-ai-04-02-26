import logging
logger = logging.getLogger(__name__)

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

@router.post("/migrations/preview-json")
async def preview_migration_json(
    payload: Dict = Body(...),
    user: dict = Depends(get_current_user)
):
    """Preview migration from client-side parsed JSON (Avoids 30s timeout)"""
    import pandas as pd
    
    try:
        source = payload.get("source")
        data = payload.get("data")
        filename = payload.get("filename", "client-side-import.json")
        
        # Convert JSON list to DataFrame (Adapters expect DataFrames)
        if isinstance(data, list):
            df = pd.DataFrame(data)
            print(f"[Migration] Converted JSON to DataFrame: {len(df)} rows, columns: {list(df.columns)[:10]}")
        else:
            df = data
        
        manager = MigrationManager(venue_id=user["venue_id"], user_id=user["id"])
        
        # Call preview with DataFrame
        preview = await manager.preview(source, df)
        
        # Add filename
        preview["filename"] = filename
        return preview
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"JSON Migration Error: {e}")
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
    
    return logs


@router.post("/migrations/backfill-item-ids")
async def backfill_item_ids(
    user: dict = Depends(get_current_user)
):
    """Backfill item_id for all recipes that don't have one"""
    from core.database import get_database
    db = get_database()
    
    venue_id = user["venue_id"]
    
    # Fetch venue details to get name for code generation
    venue = await db.venues.find_one({"id": venue_id})
    venue_name = venue.get("name", "VEN") if venue else "VEN"
    venue_code = (venue_name[:3]).upper()
    
    prefix = f"MG{venue_code}"
    
    # Get recipes without item_id
    recipes_without_id = await db.recipes.find(
        {"venue_id": venue_id, "$or": [{"item_id": {"$exists": False}}, {"item_id": None}, {"item_id": ""}]}
    ).to_list(500)
    
    if not recipes_without_id:
        return {"status": "success", "message": "All recipes already have item_id", "updated": 0}
    
    # Get current max sequence using the new format
    max_recipe = await db.recipes.find_one(
        {"venue_id": venue_id, "item_id": {"$regex": f"^{prefix}"}},
        sort=[("item_id", -1)]
    )
    
    current_seq = 0
    if max_recipe and max_recipe.get("item_id"):
        try:
            # Extract number from MG{CODE}{NUM}
            current_seq = int(max_recipe["item_id"].replace(prefix, ""))
        except Exception as e:  # noqa
            current_seq = 0
            
    # If no existing sequences, make sure we account for total existing to avoid collision if regex failed
    if current_seq == 0:
        count = await db.recipes.count_documents({"venue_id": venue_id})
        if count > len(recipes_without_id):
             current_seq = count - len(recipes_without_id)

    updated_count = 0
    for recipe in recipes_without_id:
        current_seq += 1
        new_item_id = f"{prefix}{str(current_seq).zfill(3)}"
        
        # Update both root item_id and raw_import_data['Item ID'] for consistency
        update_data = {
            "item_id": new_item_id,
            "raw_import_data.Item ID": new_item_id,
            "raw_import_data.Sku": new_item_id  # Also set Sku as fallback
        }
        
        await db.recipes.update_one(
            {"_id": recipe["_id"]},
            {"$set": update_data}
        )
        updated_count += 1
    
    return {
        "status": "success",
        "message": f"Assigned item_id to {updated_count} recipes",
        "updated": updated_count,
        "format": f"{prefix}001..."
    }
