"""
Migrations domain routes - Real Excel parsing with MongoDB persistence.
Handles Apicbase multi-row headers (Row 1 = category, Row 2 = field names).
"""
from fastapi import APIRouter, UploadFile, File, HTTPException, Body
from typing import Optional, List, Any
from motor.motor_asyncio import AsyncIOMotorClient
import pandas as pd
import io
import os
from datetime import datetime, timezone

from app.core.data_loader import get_data_loader

router = APIRouter(prefix="/api/migrations", tags=["migrations"])

# MongoDB connection for persistence
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'restin_v2')

_mongo_client = None
_db = None

def get_db():
    """Get MongoDB database instance."""
    global _mongo_client, _db
    if _db is None:
        _mongo_client = AsyncIOMotorClient(MONGO_URL)
        _db = _mongo_client[DB_NAME]
    return _db


def detect_header_row(df_raw: pd.DataFrame) -> int:
    """Detect which row contains the actual field names."""
    for i in range(min(5, len(df_raw))):
        row = df_raw.iloc[i]
        valid_count = sum(
            1 for val in row 
            if pd.notna(val) and 'unnamed' not in str(val).lower()
        )
        if valid_count > len(row) * 0.3:
            return i
    return 0


def clean_column_name(col: Any, idx: int) -> str:
    """Clean up column name, handling Unnamed columns."""
    col_str = str(col).strip() if pd.notna(col) else ""
    if not col_str or col_str.lower().startswith('unnamed'):
        return f"field_{idx}"
    return col_str


def build_smart_mappings(columns: List[str], sample_row: dict) -> List[dict]:
    """Build intelligent column mappings with sample data."""
    FIELD_PATTERNS = {
        'name': ['name', 'recipe name', 'product name', 'item name', 'title'],
        'sku': ['sku', 'code', 'reference', 'ref', 'item code', 'product code'],
        'category': ['category', 'type', 'class', 'product type'],
        'subcategory': ['subcategory', 'subcat', 'sub category'],
        'price': ['price', 'sell price', 'selling price', 'retail price'],
        'cost': ['cost', 'unit cost', 'ingredient cost', 'food cost'],
        'unit': ['unit', 'uom', 'unit of measure', 'measure'],
        'portions': ['portions', '# portions', 'servings', 'serving size'],
    }
    
    mappings = []
    
    for col in columns:
        col_lower = col.lower()
        sample_value = str(sample_row.get(col, ''))[:50] if sample_row else ''
        
        matched_field = None
        confidence = 'low'
        
        for field, patterns in FIELD_PATTERNS.items():
            for pattern in patterns:
                if pattern in col_lower:
                    matched_field = field
                    confidence = 'high'
                    break
            if matched_field:
                break
        
        is_unnamed = col.startswith('field_') or 'unnamed' in col_lower
        
        mappings.append({
            'excel_column': col,
            'restin_field': matched_field or col,
            'sample_value': sample_value,
            'confidence': confidence if matched_field else 'unmapped',
            'is_mapped': matched_field is not None,
            'is_empty': is_unnamed and not sample_value.strip()
        })
    
    mappings.sort(key=lambda m: (not m['is_mapped'], m['is_empty'], m['excel_column']))
    
    return mappings


def parse_excel_file(file_content: bytes, filename: str) -> dict:
    """Parse an Excel file and compare with existing inventory."""
    loader = get_data_loader()
    existing_inventory = loader.get_inventory()
    existing_menu = loader.get_menu_items()
    
    existing_by_name = {item['name'].lower(): item for item in existing_inventory}
    menu_by_name = {item['name'].lower(): item for item in existing_menu}
    
    try:
        df_raw = pd.read_excel(io.BytesIO(file_content), engine='openpyxl', header=None)
        
        if df_raw.empty:
            raise ValueError("Excel file is empty")
        
        header_row = detect_header_row(df_raw)
        
        df = pd.read_excel(
            io.BytesIO(file_content), 
            engine='openpyxl', 
            header=header_row,
            skiprows=range(0, header_row) if header_row > 0 else None
        )
        
        clean_cols = [clean_column_name(col, i) for i, col in enumerate(df.columns)]
        df.columns = clean_cols
        
        if len(df) > 0:
            first_row = df.iloc[0]
            if any(str(v).lower() in ['name', 'name (required)', 'apicbase id'] for v in first_row.values if pd.notna(v)):
                df = df.iloc[1:]
        
        name_col = None
        for col in df.columns:
            col_lower = col.lower()
            if col_lower in ['name', 'recipe name', 'product name', 'item name']:
                name_col = col
                break
            if 'name' in col_lower and 'unnamed' not in col_lower:
                name_col = col
                break
        
        if not name_col and len(df.columns) > 1:
            name_col = df.columns[1] if not df.columns[1].startswith('field_') else df.columns[0]
        
        new_items = []
        update_items = []
        unchanged_items = []
        conflict_items = []
        
        for idx, row in df.iterrows():
            if name_col and pd.notna(row.get(name_col)):
                item_name = str(row[name_col]).strip()
                if not item_name or item_name.lower() in ['nan', 'none', '']:
                    continue
                    
                item_lower = item_name.lower()
                
                item_data = {
                    "name": item_name,
                    "item_id": f"IMP-{idx:04d}",
                    "row_number": int(idx) + header_row + 2,
                    "raw_import_data": {col: str(val) if pd.notna(val) else "" for col, val in row.items()}
                }
                
                if item_lower in existing_by_name:
                    existing = existing_by_name[item_lower]
                    item_data["type"] = "unchanged"
                    item_data["category"] = existing.get("category", "Inventory")
                    unchanged_items.append(item_data)
                elif item_lower in menu_by_name:
                    item_data["type"] = "unchanged"
                    item_data["category"] = "Menu Item"
                    unchanged_items.append(item_data)
                else:
                    item_data["type"] = "new"
                    item_data["category"] = "New"
                    new_items.append(item_data)
        
        sample_row = dict(df.iloc[0]) if len(df) > 0 else {}
        mappings = build_smart_mappings(list(df.columns), sample_row)
        
        all_details = new_items + update_items + conflict_items + unchanged_items
        
        return {
            "filename": filename,
            "total": len(all_details),
            "new": len(new_items),
            "update": len(update_items),
            "conflict": len(conflict_items),
            "archived": 0,
            "trash": 0,
            "unchanged": len(unchanged_items),
            "details": all_details,
            "meta": {
                "columns": list(df.columns),
                "row_count": len(df),
                "mappings": mappings,
                "header_row": header_row + 1,
                "parse_status": "success"
            }
        }
        
    except Exception as e:
        import traceback
        return {
            "filename": filename,
            "total": 0,
            "new": 0,
            "update": 0,
            "conflict": 0,
            "archived": 0,
            "trash": 0,
            "unchanged": 0,
            "details": [],
            "error": str(e),
            "meta": {
                "columns": [],
                "row_count": 0,
                "mappings": [],
                "parse_status": "error",
                "traceback": traceback.format_exc()
            }
        }


@router.get("/history")
async def get_migration_history(venue_id: Optional[str] = None):
    """Get migration history from MongoDB."""
    db = get_db()
    cursor = db.migration_history.find({}).sort("executed_at", -1).limit(50)
    history = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])  # Convert ObjectId to string
        history.append(doc)
    return history


@router.post("/preview")
async def preview_migration(file: UploadFile = File(...)):
    """Parse uploaded Excel file and return preview."""
    if not file.filename:
        raise HTTPException(400, "No file provided")
    
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ['.xlsx', '.xls', '.csv']:
        raise HTTPException(400, f"Unsupported file type: {ext}")
    
    content = await file.read()
    
    if len(content) == 0:
        raise HTTPException(400, "Empty file")
    
    preview_data = parse_excel_file(content, file.filename)
    
    return preview_data


@router.post("/execute")
async def execute_migration(
    source: str = Body(default=""),
    mode: str = Body(default="migrate"),
    data: list = Body(default=None),
    options: dict = Body(default={}),
    filename: str = Body(default="unknown")
):
    """Execute the migration and save to MongoDB recipes_engineered collection."""
    new_count = 0
    update_count = 0
    unchanged_count = 0
    
    recipes_to_insert = []
    
    if data:
        for item in data:
            item_type = item.get("type", "")
            if item_type in ["new", "new_recipe"]:
                new_count += 1
            elif item_type == "update":
                update_count += 1
            elif item_type == "unchanged":
                unchanged_count += 1
            
            # Transform to recipe document format
            recipe_doc = {
                "id": item.get("id") or f"recipe-{datetime.now().timestamp()}-{new_count}",
                "recipe_name": item.get("name") or item.get("recipe_name") or "Unnamed Recipe",
                "category": item.get("category") or "Standard",
                "subcategory": item.get("subcategory") or "",
                "active": True,
                "item_id": item.get("sku") or item.get("item_id") or "",
                "cost_analysis": {
                    "total_cost": float(item.get("cost", 0) or 0),
                    "cost_per_serving": float(item.get("cost", 0) or 0),
                    "suggested_price": float(item.get("price", 0) or 0),
                    "markup_percentage": 65.0
                },
                "ingredients": [],
                "servings": int(item.get("portions", 1) or 1),
                "raw_import_data": item.get("raw_data", item),
                "import_source": filename,
                "change_history": [{
                    "change_type": "imported",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "change_summary": f"Imported from {filename}",
                    "user_name": "Migration System"
                }],
                "created_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc),
                "venue_id": options.get("venue_id", "venue-caviar-bull")
            }
            recipes_to_insert.append(recipe_doc)
    
    # Create migration record
    migration_record = {
        "filename": filename,
        "source": source,
        "mode": mode,
        "executed_at": datetime.now(timezone.utc),
        "stats": {
            "new": new_count,
            "updated": update_count,
            "unchanged": unchanged_count
        },
        "status": "completed",
        "recipe_count": len(recipes_to_insert)
    }
    
    # Save to MongoDB
    db = get_db()
    result = await db.migration_history.insert_one(migration_record)
    migration_id = str(result.inserted_id)
    
    # Save recipes to recipes_engineered collection
    if recipes_to_insert:
        for recipe in recipes_to_insert:
            recipe["migration_id"] = migration_id
        await db.recipes_engineered.insert_many(recipes_to_insert)
    
    return {
        "status": "success",
        "message": f"Migration completed. {new_count} new recipes imported.",
        "migration_id": migration_id,
        "recipe_count": len(recipes_to_insert)
    }

