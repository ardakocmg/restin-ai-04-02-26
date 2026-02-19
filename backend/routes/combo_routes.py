"""
Combo / Item Group Routes — Menu item combos with required groups and defaults
Lightspeed Parity: combo builder, pre-selected defaults, review before send
"""
from fastapi import APIRouter, Depends, HTTPException, Body, Query
from core.dependencies import get_current_user, get_database
from datetime import datetime, timezone
import logging
import uuid

logger = logging.getLogger(__name__)


def create_combo_router():
    router = APIRouter(prefix="/combos", tags=["combos"])

    @router.get("")
    async def list_combos(
        venue_id: str = Query(...),
        current_user: dict = Depends(get_current_user),
        db=Depends(get_database),
    ):
        """List all combos for a venue."""
        combos = await db.menu_combos.find(
            {"venue_id": venue_id, "deleted_at": None},
            {"_id": 0},
        ).sort("sort_order", 1).to_list(200)
        return {"success": True, "data": combos, "count": len(combos)}

    @router.get("/{combo_id}")
    async def get_combo(
        combo_id: str,
        current_user: dict = Depends(get_current_user),
        db=Depends(get_database),
    ):
        """Get a single combo by ID."""
        combo = await db.menu_combos.find_one(
            {"id": combo_id, "deleted_at": None}, {"_id": 0}
        )
        if not combo:
            raise HTTPException(status_code=404, detail="Combo not found")
        return {"success": True, "data": combo}

    @router.post("")
    async def create_combo(
        payload: dict = Body(...),
        current_user: dict = Depends(get_current_user),
        db=Depends(get_database),
    ):
        """Create a new combo / item group."""
        venue_id = payload.get("venue_id")
        name = payload.get("name")
        if not venue_id or not name:
            raise HTTPException(status_code=400, detail="venue_id and name required")

        combo = {
            "id": str(uuid.uuid4()),
            "venue_id": venue_id,
            "name": name,
            "description": payload.get("description", ""),
            "price_cents": payload.get("price_cents", 0),
            "image_url": payload.get("image_url"),
            "is_active": payload.get("is_active", True),
            "sort_order": payload.get("sort_order", 0),
            "groups": payload.get("groups", []),
            # groups: [
            #   {
            #     "id": "grp-1",
            #     "name": "Choose Main",
            #     "min_select": 1,
            #     "max_select": 1,
            #     "items": [
            #       {"item_id": "item-wagyu", "name": "Wagyu Ribeye", "price_delta_cents": 0, "is_default": true},
            #       {"item_id": "item-lobster", "name": "Lobster Tail", "price_delta_cents": 500, "is_default": false}
            #     ]
            #   },
            #   {
            #     "id": "grp-2",
            #     "name": "Choose Side",
            #     "min_select": 1,
            #     "max_select": 2,
            #     "items": [...]
            #   }
            # ]
            "tags": payload.get("tags", []),
            "category_id": payload.get("category_id"),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "created_by": current_user["id"],
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "deleted_at": None,
        }

        await db.menu_combos.insert_one(combo)
        logger.info(f"Combo created: {combo['id']} - {name}")
        return {"success": True, "data": combo}

    @router.put("/{combo_id}")
    async def update_combo(
        combo_id: str,
        payload: dict = Body(...),
        current_user: dict = Depends(get_current_user),
        db=Depends(get_database),
    ):
        """Update a combo / item group."""
        existing = await db.menu_combos.find_one(
            {"id": combo_id, "deleted_at": None}
        )
        if not existing:
            raise HTTPException(status_code=404, detail="Combo not found")

        allowed = {
            "name", "description", "price_cents", "image_url",
            "is_active", "sort_order", "groups", "tags", "category_id"
        }
        update = {k: v for k, v in payload.items() if k in allowed}
        update["updated_at"] = datetime.now(timezone.utc).isoformat()
        update["updated_by"] = current_user["id"]

        await db.menu_combos.update_one({"id": combo_id}, {"$set": update})
        updated = await db.menu_combos.find_one({"id": combo_id}, {"_id": 0})
        logger.info(f"Combo updated: {combo_id}")
        return {"success": True, "data": updated}

    @router.delete("/{combo_id}")
    async def delete_combo(
        combo_id: str,
        current_user: dict = Depends(get_current_user),
        db=Depends(get_database),
    ):
        """Soft-delete a combo."""
        result = await db.menu_combos.update_one(
            {"id": combo_id, "deleted_at": None},
            {"$set": {
                "deleted_at": datetime.now(timezone.utc).isoformat(),
                "deleted_by": current_user["id"],
            }}
        )
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Combo not found")
        return {"success": True}

    @router.post("/seed")
    async def seed_combos(
        venue_id: str = Query(...),
        current_user: dict = Depends(get_current_user),
        db=Depends(get_database),
    ):
        """Seed demo combos for a venue."""
        await db.menu_combos.delete_many({"venue_id": venue_id})

        combos = [
            {
                "id": str(uuid.uuid4()),
                "venue_id": venue_id,
                "name": "Fine Dining Experience",
                "description": "3-course meal with choice of starter, main, and dessert",
                "price_cents": 8500,
                "is_active": True,
                "sort_order": 1,
                "groups": [
                    {
                        "id": f"grp-{uuid.uuid4().hex[:6]}",
                        "name": "Choose Starter",
                        "min_select": 1,
                        "max_select": 1,
                        "items": [
                            {"item_id": "item-carpaccio", "name": "Beef Carpaccio", "price_delta_cents": 0, "is_default": True},
                            {"item_id": "item-burrata", "name": "Burrata & Heirloom Tomato", "price_delta_cents": 0, "is_default": False},
                            {"item_id": "item-soup", "name": "Truffle Mushroom Soup", "price_delta_cents": 0, "is_default": False},
                        ],
                    },
                    {
                        "id": f"grp-{uuid.uuid4().hex[:6]}",
                        "name": "Choose Main",
                        "min_select": 1,
                        "max_select": 1,
                        "items": [
                            {"item_id": "item-wagyu", "name": "Wagyu Ribeye 250g", "price_delta_cents": 1500, "is_default": True},
                            {"item_id": "item-seabass", "name": "Mediterranean Sea Bass", "price_delta_cents": 0, "is_default": False},
                            {"item_id": "item-risotto", "name": "Black Truffle Risotto", "price_delta_cents": 0, "is_default": False},
                        ],
                    },
                    {
                        "id": f"grp-{uuid.uuid4().hex[:6]}",
                        "name": "Choose Dessert",
                        "min_select": 1,
                        "max_select": 1,
                        "items": [
                            {"item_id": "item-tiramisu", "name": "Classic Tiramisu", "price_delta_cents": 0, "is_default": True},
                            {"item_id": "item-panna", "name": "Panna Cotta", "price_delta_cents": 0, "is_default": False},
                            {"item_id": "item-fondant", "name": "Chocolate Fondant", "price_delta_cents": 300, "is_default": False},
                        ],
                    },
                ],
                "tags": ["popular", "signature"],
                "created_at": datetime.now(timezone.utc).isoformat(),
                "created_by": "system",
                "updated_at": datetime.now(timezone.utc).isoformat(),
                "deleted_at": None,
            },
            {
                "id": str(uuid.uuid4()),
                "venue_id": venue_id,
                "name": "Business Lunch",
                "description": "Quick 2-course lunch with drink",
                "price_cents": 3500,
                "is_active": True,
                "sort_order": 2,
                "groups": [
                    {
                        "id": f"grp-{uuid.uuid4().hex[:6]}",
                        "name": "Choose Main",
                        "min_select": 1,
                        "max_select": 1,
                        "items": [
                            {"item_id": "item-pasta", "name": "Spaghetti Pomodoro", "price_delta_cents": 0, "is_default": True},
                            {"item_id": "item-salad", "name": "Caesar Salad", "price_delta_cents": 0, "is_default": False},
                            {"item_id": "item-burger", "name": "Wagyu Burger", "price_delta_cents": 500, "is_default": False},
                        ],
                    },
                    {
                        "id": f"grp-{uuid.uuid4().hex[:6]}",
                        "name": "Choose Drink",
                        "min_select": 1,
                        "max_select": 1,
                        "items": [
                            {"item_id": "item-water", "name": "Still Water", "price_delta_cents": 0, "is_default": True},
                            {"item_id": "item-juice", "name": "Fresh Orange Juice", "price_delta_cents": 0, "is_default": False},
                            {"item_id": "item-wine", "name": "Glass of House Wine", "price_delta_cents": 300, "is_default": False},
                        ],
                    },
                ],
                "tags": ["lunch", "quick"],
                "created_at": datetime.now(timezone.utc).isoformat(),
                "created_by": "system",
                "updated_at": datetime.now(timezone.utc).isoformat(),
                "deleted_at": None,
            },
            {
                "id": str(uuid.uuid4()),
                "venue_id": venue_id,
                "name": "Wine & Cheese Pairing",
                "description": "3 wines paired with artisan cheeses",
                "price_cents": 4500,
                "is_active": True,
                "sort_order": 3,
                "groups": [
                    {
                        "id": f"grp-{uuid.uuid4().hex[:6]}",
                        "name": "Wine Selection",
                        "min_select": 3,
                        "max_select": 3,
                        "items": [
                            {"item_id": "item-prosecco", "name": "Prosecco Superiore", "price_delta_cents": 0, "is_default": True},
                            {"item_id": "item-chardonnay", "name": "White Burgundy", "price_delta_cents": 0, "is_default": True},
                            {"item_id": "item-merlot", "name": "Super Tuscan", "price_delta_cents": 0, "is_default": True},
                            {"item_id": "item-barolo", "name": "Barolo DOCG", "price_delta_cents": 800, "is_default": False},
                        ],
                    },
                ],
                "tags": ["wine", "pairing"],
                "created_at": datetime.now(timezone.utc).isoformat(),
                "created_by": "system",
                "updated_at": datetime.now(timezone.utc).isoformat(),
                "deleted_at": None,
            },
        ]

        await db.menu_combos.insert_many(combos)
        logger.info(f"Seeded {len(combos)} combos for venue {venue_id}")
        return {"success": True, "count": len(combos)}

    return router
