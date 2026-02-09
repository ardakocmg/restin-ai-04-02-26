"""
Physical Tables API — CRUD for table layouts and floorplans.
Stores table definitions per venue/floor in MongoDB.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from bson import ObjectId

router = APIRouter(prefix="/api/tables", tags=["Tables"])


class TableCreate(BaseModel):
    name: str
    floor: str
    capacity: int = 4
    x: float = 0
    y: float = 0
    type: str = "rect"  # rect | round
    status: str = "available"  # available | occupied | reserved


class TableUpdate(BaseModel):
    name: Optional[str] = None
    floor: Optional[str] = None
    capacity: Optional[int] = None
    x: Optional[float] = None
    y: Optional[float] = None
    type: Optional[str] = None
    status: Optional[str] = None


def _serialize(doc: dict) -> dict:
    """Convert MongoDB doc to JSON-safe dict."""
    doc["id"] = str(doc.pop("_id"))
    return doc


@router.get("", response_model=None)
async def list_tables(venue_id: str):
    """List all tables for a venue."""
    from app.main import db
    cursor = db["tables"].find({"venue_id": venue_id}).sort("floor", 1)
    results = []
    async for doc in cursor:
        results.append(_serialize(doc))
    return results


@router.post("", response_model=None, status_code=201)
async def create_table(venue_id: str, body: TableCreate):
    """Create a new table for a venue."""
    from app.main import db
    doc = {
        "venue_id": venue_id,
        **body.model_dump(),
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }
    result = await db["tables"].insert_one(doc)
    doc["id"] = str(result.inserted_id)
    doc.pop("_id", None)
    return doc


@router.put("/{table_id}", response_model=None)
async def update_table(table_id: str, body: TableUpdate):
    """Update a table's properties (position, capacity, status, etc.)."""
    from app.main import db
    update_data = {k: v for k, v in body.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    update_data["updated_at"] = datetime.utcnow()
    result = await db["tables"].update_one(
        {"_id": ObjectId(table_id)},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Table not found")
    return {"status": "updated", "id": table_id}


@router.delete("/{table_id}", response_model=None)
async def delete_table(table_id: str):
    """Delete a table."""
    from app.main import db
    result = await db["tables"].delete_one({"_id": ObjectId(table_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Table not found")
    return {"status": "deleted", "id": table_id}


@router.get("/floors", response_model=None)
async def list_floors(venue_id: str):
    """Get distinct floor names for a venue."""
    from app.main import db
    floors = await db["tables"].distinct("floor", {"venue_id": venue_id})
    return floors
