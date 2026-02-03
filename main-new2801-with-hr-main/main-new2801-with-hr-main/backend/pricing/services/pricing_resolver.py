from datetime import datetime, timezone
from typing import Optional, Dict

class PricingResolver:
    """Resolve item price based on active price books"""
    
    def __init__(self, db):
        self.db = db
        self.price_book_col = db.price_books
        self.price_item_col = db.price_book_items

    async def resolve_price(
        self,
        venue_id: str,
        item_id: str,
        channel: Optional[str] = None,
        order_type: Optional[str] = None
    ) -> Optional[float]:
        """
        Find the best price for an item based on active price books.
        Returns None if no price book applies.
        """
        now = datetime.now(timezone.utc).isoformat()
        
        # Find applicable price books
        query = {
            "venue_id": venue_id,
            "active": True,
            "$or": [
                {"valid_from": None},
                {"valid_from": {"$lte": now}}
            ],
            "$or": [
                {"valid_to": None},
                {"valid_to": {"$gte": now}}
            ]
        }
        
        # Filter by channel if provided
        if channel:
            query["$or"] = [{"channels": []}, {"channels": channel}]
        
        # Filter by order type if provided
        if order_type:
            if "$and" not in query:
                query["$and"] = []
            query["$and"].append({
                "$or": [{"order_types": []}, {"order_types": order_type}]
            })
        
        cursor = self.price_book_col.find(query, {"_id": 0}).sort("priority", -1)
        price_books = await cursor.to_list(100)
        
        # Check each price book for this item (highest priority first)
        for pb in price_books:
            item_price = await self.price_item_col.find_one({
                "price_book_id": pb["id"],
                "item_id": item_id
            }, {"_id": 0})
            
            if item_price:
                return item_price["price"]
        
        return None

    async def resolve_bulk_prices(
        self,
        venue_id: str,
        item_ids: list,
        channel: Optional[str] = None,
        order_type: Optional[str] = None
    ) -> Dict[str, float]:
        """Resolve prices for multiple items at once"""
        result = {}
        for item_id in item_ids:
            price = await self.resolve_price(venue_id, item_id, channel, order_type)
            if price is not None:
                result[item_id] = price
        return result
