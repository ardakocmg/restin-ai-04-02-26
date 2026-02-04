from fastapi import APIRouter, Depends, HTTPException
from typing import List
from core.database import db
from core.dependencies import get_current_user
from core.feature_flags import require_feature
from core.venue_config import get_venue_config
from pricing.models import PriceBook, PriceBookCreate, PriceBookUpdate, PriceBookItem, PriceBookItemCreate
from datetime import datetime, timezone

def create_pricing_admin_router():
    router = APIRouter(prefix="/pricing", tags=["pricing"])

    @router.post("/price-books", response_model=PriceBook)
    async def create_price_book(
        price_book_data: PriceBookCreate,
        current_user: dict = Depends(get_current_user)
    ):
        cfg = await get_venue_config(price_book_data.venue_id)
        require_feature(cfg, "PRICING_PRICEBOOKS_ENABLED", "pricing")
        
        price_book_dict = price_book_data.model_dump()
        price_book_dict["created_by"] = current_user["id"]
        price_book_dict["updated_by"] = current_user["id"]
        
        price_book = PriceBook(**price_book_dict)
        await db.price_books.insert_one(price_book.model_dump())
        return price_book

    @router.get("/price-books", response_model=List[PriceBook])
    async def list_price_books(
        venue_id: str,
        active_only: bool = False,
        current_user: dict = Depends(get_current_user)
    ):
        cfg = await get_venue_config(venue_id)
        require_feature(cfg, "PRICING_PRICEBOOKS_ENABLED", "pricing")
        
        query = {"venue_id": venue_id}
        if active_only:
            query["active"] = True
        
        cursor = db.price_books.find(query, {"_id": 0}).sort("priority", -1)
        docs = await cursor.to_list(1000)
        return [PriceBook(**doc) for doc in docs]

    @router.get("/price-books/{price_book_id}", response_model=PriceBook)
    async def get_price_book(
        price_book_id: str,
        venue_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        doc = await db.price_books.find_one(
            {"id": price_book_id, "venue_id": venue_id},
            {"_id": 0}
        )
        if not doc:
            raise HTTPException(404, "Price book not found")
        return PriceBook(**doc)

    @router.patch("/price-books/{price_book_id}", response_model=PriceBook)
    async def update_price_book(
        price_book_id: str,
        venue_id: str,
        update_data: PriceBookUpdate,
        current_user: dict = Depends(get_current_user)
    ):
        update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
        
        if update_dict:
            update_dict["updated_by"] = current_user["id"]
            update_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
            
            await db.price_books.update_one(
                {"id": price_book_id, "venue_id": venue_id},
                {"$set": update_dict}
            )
        
        doc = await db.price_books.find_one(
            {"id": price_book_id, "venue_id": venue_id},
            {"_id": 0}
        )
        return PriceBook(**doc)

    @router.post("/price-books/{price_book_id}/items", response_model=PriceBookItem)
    async def add_price_book_item(
        price_book_id: str,
        item_data: PriceBookItemCreate,
        current_user: dict = Depends(get_current_user)
    ):
        item = PriceBookItem(**item_data.model_dump())
        await db.price_book_items.insert_one(item.model_dump())
        return item

    @router.get("/price-books/{price_book_id}/items", response_model=List[PriceBookItem])
    async def list_price_book_items(
        price_book_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        cursor = db.price_book_items.find({"price_book_id": price_book_id}, {"_id": 0})
        docs = await cursor.to_list(10000)
        return [PriceBookItem(**doc) for doc in docs]

    return router
