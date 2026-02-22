import logging
logger = logging.getLogger(__name__)

"""Menu import routes - Excel/CSV menu import"""
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from typing import Dict, Any, List
import pandas as pd
import io

from core.database import db
from core.dependencies import get_current_user, check_venue_access
from models import MenuItem, MenuCategory


def parse_price(price_str: str) -> float:
    """Robust price parser supporting multiple formats"""
    if not price_str or price_str == "nan":
        return 0.0
    
    price_str = str(price_str).strip()
    
    for symbol in ["€", "$", "£", "EUR", "USD", "GBP", "TL", "₺"]:
        price_str = price_str.replace(symbol, "")
    
    price_str = price_str.strip()
    
    try:
        if "," in price_str and "." not in price_str:
            price_str = price_str.replace(",", ".")
        elif "," in price_str and "." in price_str:
            price_str = price_str.replace(",", "")
        
        price = float(price_str)
        
        if price < 0:
            return 0.0
        
        return round(price, 2)
    except Exception as e:
        logger.warning(f"Silenced error: {e}")
        return 0.0


def normalize_allergens(text: str) -> List[str]:
    """Normalize allergen text to canonical list"""
    if not text or text == "nan":
        return []
    
    text = str(text).lower()
    
    allergen_map = {
        "gluten": ["gluten", "wheat", "bread", "flour"],
        "dairy": ["dairy", "milk", "cheese", "cream", "butter", "lactose"],
        "nuts": ["nuts", "nut", "peanut", "almond", "walnut"],
        "shellfish": ["shellfish", "shrimp", "crab", "lobster"],
        "fish": ["fish", "salmon", "tuna"],
        "eggs": ["egg", "eggs"],
        "soy": ["soy", "soya"],
        "sesame": ["sesame"],
    }
    
    found = []
    parts = text.replace(";", ",").replace("/", ",").split(",")
    
    for part in parts:
        part = part.strip()
        for canonical, synonyms in allergen_map.items():
            if any(syn in part for syn in synonyms) and canonical not in found:
                found.append(canonical)
    
    return found


def create_menu_import_router():
    router = APIRouter(tags=["menu_import"])

    @router.post("/venues/{venue_id}/menu/import")
    async def import_menu_excel(
        venue_id: str,
        file: UploadFile = File(...),
        current_user: dict = Depends(get_current_user)
    ):
        """Import menu from Excel file"""
        await check_venue_access(current_user, venue_id)
        
        if not file.filename.endswith(('.xlsx', '.xls')):
            raise HTTPException(status_code=400, detail="Only Excel files supported")
        
        content = await file.read()
        
        try:
            df = pd.read_excel(io.BytesIO(content))
            
            columns = [c.lower() for c in df.columns]
            name_col = next((c for c in columns if "name" in c or "item" in c), columns[0])
            category_col = next((c for c in columns if "category" in c), None)
            price_col = next((c for c in columns if "price" in c), None)
            desc_col = next((c for c in columns if "description" in c), None)
            
            categories = {}
            current_category = "Main"
            items_created = 0
            
            for idx, row in df.iterrows():
                item_name = str(row[df.columns[columns.index(name_col)]]).strip()
                if not item_name or item_name == "nan":
                    continue
                
                if len(item_name) > 3 and item_name.isupper():
                    current_category = item_name.title()
                    continue
                
                if current_category not in categories:
                    cat = MenuCategory(
                        venue_id=venue_id,
                        name=current_category,
                        sort_order=len(categories)
                    )
                    await db.menu_categories.insert_one(cat.model_dump())
                    categories[current_category] = cat.id
                
                price = 0.0
                if price_col:
                    price_val = row[df.columns[columns.index(price_col)]]
                    price = parse_price(str(price_val))
                
                description = ""
                if desc_col:
                    desc_val = row[df.columns[columns.index(desc_col)]]
                    description = str(desc_val) if desc_val and str(desc_val) != "nan" else ""
                
                item = MenuItem(
                    venue_id=venue_id,
                    category_id=categories[current_category],
                    name=item_name,
                    description=description,
                    price=price,
                    price_cents=int(price * 100),
                    is_active=True
                )
                
                await db.menu_items.insert_one(item.model_dump())
                items_created += 1
            
            return {
                "message": "Menu imported successfully",
                "categories_created": len(categories),
                "items_created": items_created
            }
        
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Import failed: {str(e)}")

    return router
