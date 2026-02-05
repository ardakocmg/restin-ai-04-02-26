from .base import BaseMigrationAdapter
from typing import Any, Dict
import pandas as pd
import uuid
from datetime import datetime, timezone

class LightspeedAdapter(BaseMigrationAdapter):
    def validate(self, data: Any) -> bool:
        if not isinstance(data, pd.DataFrame):
            return False
        
        # Lightspeed Exports usually have 'Product ID', 'Name', 'Price'
        cols = [c.lower() for c in data.columns]
        required = ["name"] # Minimal check
        if not any(r in cols for r in required):
            self.log(f"Missing required columns. Found: {cols}", "error")
            return False
        return True

    def preview(self, data: Any) -> Dict[str, Any]:
        if not isinstance(data, pd.DataFrame):
            return {"error": "Invalid data"}
            
        new_items = 0
        details = []
        
        # Normalize columns somewhat
        data.columns = data.columns.str.lower().str.strip()
        
        for index, row in data.iterrows():
            name = row.get("name") or row.get("product name") or "Unknown"
            price = row.get("price") or row.get("sales price") or 0
            
            new_items += 1
            if new_items <= 5:
                details.append({
                    "type": "new",
                    "name": name,
                    "info": f"Price: {price}"
                })
                
        return {
            "type": "lightspeed_menu",
            "new": new_items,
            "update": 0,
            "conflict": 0,
            "details": details,
            "summary": "Lightspeed Menu Export Detected"
        }

    async def execute(self, data: Any, mode: str = "migrate", options: Dict = None):
        from core.database import get_database
        db = get_database()
        
        if isinstance(data, pd.DataFrame):
            items = data.to_dict(orient="records")
        else:
            items = data
            
        processed = 0
        errors = 0
        
        for item in items:
            try:
                # Handle keys flexibly
                name = item.get("name") or item.get("Product Name") or "Unknown"
                sku = str(item.get("sku") or item.get("System ID") or uuid.uuid4().hex[:8])
                price = float(item.get("price") or item.get("Price") or 0)
                category_name = item.get("category") or item.get("Category") or "Uncategorized"
                
                # 1. Create/Find Category
                cat_doc = await db.menu_categories.find_one({"venue_id": self.venue_id, "name": category_name})
                if not cat_doc:
                    cat_id = str(uuid.uuid4())
                    cat_doc = {
                        "id": cat_id,
                        "venue_id": self.venue_id,
                        "name": category_name,
                        "active": True,
                        "sort_order": 0
                    }
                    await db.menu_categories.insert_one(cat_doc)
                else:
                    cat_id = cat_doc["id"]
                    
                # 2. Create MenuItem
                doc = {
                    "id": str(uuid.uuid4()),
                    "venue_id": self.venue_id,
                    "category_id": cat_id,
                    "name": name,
                    "description": item.get("description", ""),
                    "price": int(price * 100), # Store as cents
                    "active": True,
                    "sku": sku,
                    "external_links": {
                        "source": "lightspeed",
                        "imported_at": datetime.now(timezone.utc).isoformat()
                    }
                }
                
                # Upsert by SKU or Name
                existing = await db.menu_items.find_one({
                    "venue_id": self.venue_id, 
                    "$or": [{"sku": sku}, {"name": name}]
                })
                
                if existing:
                    await db.menu_items.update_one(
                        {"_id": existing["_id"]},
                        {"$set": {"price": int(price * 100), "category_id": cat_id}}
                    )
                else:
                    await db.menu_items.insert_one(doc)
                    
                processed += 1
            except Exception as e:
                print(f"Error lightspeed item {item}: {e}")
                errors += 1
                
        return {
            "status": "completed",
            "summary": f"Processed {processed} Menu Items. {errors} errors.",
            "details": {"processed": processed, "errors": errors}
        }
