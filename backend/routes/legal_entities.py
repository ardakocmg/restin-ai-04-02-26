"""
Legal Entities API — Manages company registrations within an organization.
Hierarchy: Organization → Legal Entity → Venue (Branch)

Example:
  Marvin Gauci Group (org)
    ├── MG Hospitality Ltd (legal entity) → C&B, Don Royale
    └── Sole Restaurant Ltd (legal entity) → Sole
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone
from bson import ObjectId

from app.core.database import get_db
from app.core.dependencies import get_current_user

router = APIRouter(prefix="/api/legal-entities", tags=["Legal Entities"])


# ── Schemas ──────────────────────────────────────────────────────────────────

class LegalEntityCreate(BaseModel):
    registered_name: str = Field(..., min_length=1, max_length=200)
    trading_name: Optional[str] = None
    registration_number: Optional[str] = None  # e.g. C56123
    vat_number: Optional[str] = None  # e.g. MT15355214
    pe_number: Optional[str] = None  # e.g. 456398
    registered_address: Optional[str] = None
    city: Optional[str] = None
    country: str = "Malta"
    hr_manager: Optional[str] = None
    principal_payer: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    notes: Optional[str] = None


class LegalEntityUpdate(BaseModel):
    registered_name: Optional[str] = None
    trading_name: Optional[str] = None
    registration_number: Optional[str] = None
    vat_number: Optional[str] = None
    pe_number: Optional[str] = None
    registered_address: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    hr_manager: Optional[str] = None
    principal_payer: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    notes: Optional[str] = None


class VenueAssignment(BaseModel):
    venue_ids: List[str]


# ── Helpers ──────────────────────────────────────────────────────────────────

def serialize_entity(doc: dict) -> dict:
    """Convert MongoDB document to JSON-safe dict."""
    doc["_id"] = str(doc["_id"])
    if "venue_ids" not in doc:
        doc["venue_ids"] = []
    return doc


# ── CRUD Endpoints ───────────────────────────────────────────────────────────

@router.get("")
async def list_legal_entities(
    current_user=Depends(get_current_user),
):
    """List all legal entities for the current organization."""
    db = get_db()
    venue_id = current_user.get("venue_id")

    # Get org_id from the venue
    venue = await db.venues.find_one({"_id": ObjectId(venue_id)}) if venue_id else None
    org_id = venue.get("org_id") if venue else current_user.get("org_id")

    query = {}
    if org_id:
        query["org_id"] = str(org_id)

    entities = []
    async for doc in db.legal_entities.find(query).sort("registered_name", 1):
        entities.append(serialize_entity(doc))

    # Enrich with venue names
    for entity in entities:
        venue_names = []
        for vid in entity.get("venue_ids", []):
            try:
                v = await db.venues.find_one({"_id": ObjectId(vid)})
                if v:
                    venue_names.append({"_id": str(v["_id"]), "name": v.get("name", "Unknown")})
            except Exception:
                pass
        entity["venues"] = venue_names

    return {"legal_entities": entities, "count": len(entities)}


@router.get("/{entity_id}")
async def get_legal_entity(
    entity_id: str,
    current_user=Depends(get_current_user),
):
    """Get a single legal entity by ID."""
    db = get_db()
    try:
        doc = await db.legal_entities.find_one({"_id": ObjectId(entity_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid entity ID")

    if not doc:
        raise HTTPException(status_code=404, detail="Legal entity not found")

    entity = serialize_entity(doc)

    # Enrich with venue names
    venue_names = []
    for vid in entity.get("venue_ids", []):
        try:
            v = await db.venues.find_one({"_id": ObjectId(vid)})
            if v:
                venue_names.append({"_id": str(v["_id"]), "name": v.get("name", "Unknown")})
        except Exception:
            pass
    entity["venues"] = venue_names

    return entity


@router.post("")
async def create_legal_entity(
    body: LegalEntityCreate,
    current_user=Depends(get_current_user),
):
    """Create a new legal entity."""
    db = get_db()
    venue_id = current_user.get("venue_id")

    # Get org_id from the venue
    venue = await db.venues.find_one({"_id": ObjectId(venue_id)}) if venue_id else None
    org_id = str(venue.get("org_id", "")) if venue else current_user.get("org_id", "")

    now = datetime.now(timezone.utc)
    doc = {
        **body.dict(exclude_none=True),
        "org_id": org_id,
        "venue_ids": [],
        "created_at": now,
        "updated_at": now,
        "created_by": current_user.get("username", "system"),
    }

    result = await db.legal_entities.insert_one(doc)
    doc["_id"] = str(result.inserted_id)

    return {"message": "Legal entity created", "entity": doc}


@router.put("/{entity_id}")
async def update_legal_entity(
    entity_id: str,
    body: LegalEntityUpdate,
    current_user=Depends(get_current_user),
):
    """Update a legal entity."""
    db = get_db()
    try:
        oid = ObjectId(entity_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid entity ID")

    existing = await db.legal_entities.find_one({"_id": oid})
    if not existing:
        raise HTTPException(status_code=404, detail="Legal entity not found")

    updates = body.dict(exclude_none=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")

    updates["updated_at"] = datetime.now(timezone.utc)

    await db.legal_entities.update_one({"_id": oid}, {"$set": updates})

    updated = await db.legal_entities.find_one({"_id": oid})
    return {"message": "Legal entity updated", "entity": serialize_entity(updated)}


@router.delete("/{entity_id}")
async def delete_legal_entity(
    entity_id: str,
    current_user=Depends(get_current_user),
):
    """Soft-delete a legal entity (marks as deleted, preserves data)."""
    db = get_db()
    try:
        oid = ObjectId(entity_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid entity ID")

    existing = await db.legal_entities.find_one({"_id": oid})
    if not existing:
        raise HTTPException(status_code=404, detail="Legal entity not found")

    # Soft delete — never lose data
    await db.legal_entities.update_one(
        {"_id": oid},
        {"$set": {
            "deleted_at": datetime.now(timezone.utc),
            "deleted_by": current_user.get("username", "system"),
        }}
    )

    # Unlink venues
    venue_ids = existing.get("venue_ids", [])
    if venue_ids:
        for vid in venue_ids:
            try:
                await db.venues.update_one(
                    {"_id": ObjectId(vid)},
                    {"$unset": {"legal_entity_id": ""}}
                )
            except Exception:
                pass

    return {"message": "Legal entity deleted (soft)"}


@router.post("/{entity_id}/assign-venues")
async def assign_venues(
    entity_id: str,
    body: VenueAssignment,
    current_user=Depends(get_current_user),
):
    """Assign venues (branches) to a legal entity."""
    db = get_db()
    try:
        oid = ObjectId(entity_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid entity ID")

    existing = await db.legal_entities.find_one({"_id": oid})
    if not existing:
        raise HTTPException(status_code=404, detail="Legal entity not found")

    # Update the entity's venue list
    await db.legal_entities.update_one(
        {"_id": oid},
        {"$set": {
            "venue_ids": body.venue_ids,
            "updated_at": datetime.now(timezone.utc),
        }}
    )

    # Update each venue's legal_entity_id
    # First, clear old assignments for this entity
    await db.venues.update_many(
        {"legal_entity_id": entity_id},
        {"$unset": {"legal_entity_id": ""}}
    )

    # Then set new assignments
    for vid in body.venue_ids:
        try:
            await db.venues.update_one(
                {"_id": ObjectId(vid)},
                {"$set": {"legal_entity_id": entity_id}}
            )
        except Exception:
            pass

    return {"message": f"Assigned {len(body.venue_ids)} venues to entity"}
