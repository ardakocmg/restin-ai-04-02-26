from .base import BaseMigrationAdapter
from typing import Any, Dict
# Pandas imported lazily

class ApicbaseAdapter(BaseMigrationAdapter):
    def normalize_columns(self, df):
        """Normalize column names to standard keys and return mapping info"""
        # Debug: Print received columns
        print(f"DEBUG: Received Columns: {df.columns.tolist()}")

        column_map = {
            "name": ["name", "item name", "product name", "item", "description", "recipe name", "recipe", "dish", "title", "ürün adı", "urun adi", "yemek", "reçete", "name (required)"],
            "unit": ["unit", "uom", "measure", "size", "birim"],
            "cost": ["cost", "unit cost", "cost price", "buying price", "maliyet", "alış fiyatı"], # Valid Cost (Buying Price)
            "sales_price": ["sales price", "sell price", "price", "satış fiyatı", "fiyat", "menu price"], # Valid Sales Price
            "sku": ["sku", "code", "item code", "external id", "id", "barkod", "stok kodu"]
        }
        
        # Lowercase all columns
        df.columns = df.columns.str.lower().str.strip()
        
        # Rename based on map
        new_cols = {}
        mappings = []
        
        for safe_col, aliases in column_map.items():
            for alias in aliases:
                if alias in df.columns:
                    new_cols[alias] = safe_col.capitalize() # Standardize to Name, Unit, Cost, Sales_price
                    mappings.append(f"Found '{alias}' -> Mapped to '{safe_col.capitalize()}'")
                    print(f"DEBUG: Mapped '{alias}' -> '{safe_col.capitalize()}'")
                    break
        
        if new_cols:
            df.rename(columns=new_cols, inplace=True)
            
        return df, mappings

    def is_recipe_file(self, df) -> bool:
        """Heuristic to check if this is a recipe export"""
        columns = [c.lower() for c in df.columns]
        # Strong indicators (Normalized keys)
        if "ingredients" in columns or "sales_price" in columns:
            return True
        
        keywords = ["instructions", "prep time", "servings", "yield", "recipe"]
        match_count = sum(1 for k in keywords if any(k in c for c in columns))
        return match_count >= 1

    def validate(self, data: Any) -> bool:
        """
        Validate input data. Supports both Inventory and Recipe formats.
        """
        import pandas as pd
        if not isinstance(data, pd.DataFrame):
            return False
            
        data, _ = self.normalize_columns(data)
        
        if self.is_recipe_file(data):
            # Recipe Validation
            required = ["Name", "Ingredients"] # Minimal
            missing = [col for col in required if col not in data.columns]
            if missing:
                self.log(f"Recipe file missing columns: {missing}", "error")
                return False
            return True
        else:
            # Inventory Validation
            required_cols = ["Name", "Unit", "Cost"]
            missing = [col for col in required_cols if col not in data.columns]
            if missing:
                self.log(f"Inventory file missing columns: {missing}. Found: {list(data.columns)}", "error")
                return False
            return True

    def preview(self, data: Any) -> Dict[str, Any]:
        """
        Analyze DataFrame for Inventory OR Recipes
        """
        import pandas as pd
        if not isinstance(data, pd.DataFrame):
            return {"error": "Invalid data format"}

        data, mappings = self.normalize_columns(data)
        
        is_recipe = self.is_recipe_file(data)
        target = "Recipes (Engineered)" if is_recipe else "Inventory Items"
        
        # Add mapping info to the first detail item or a special summary field
        mapping_summary = f"Detected: {target}. Mappings: {', '.join(mappings)}"
        
        if is_recipe:
            result = self.preview_recipes(data)
        else:
            result = self.preview_inventory(data)
            
        # Inject metadata into the response
        result["summary"] = mapping_summary
        result["meta"] = {
            "target": target,
            "mappings": mappings,
            "detected_type": "Recipe" if is_recipe else "Inventory"
        }
        
        return result

    def preview_inventory(self, data):
        new_items = 0
        updates = 0
        conflicts = 0
        details = []

        # Mock Database Check (In real app, query DB here)
        existing_skus = {"COKE-001": 2.20, "HEINEKEN-PINT": 4.50} 
        
        for index, row in data.iterrows():
            name = row.get("Name", "Unknown")
            sku = row.get("SKU", "N/A")
            cost = float(row.get("Cost", 0) or 0)
            
            if sku in existing_skus:
                old_price = existing_skus[sku]
                if abs(cost - old_price) > 0.01:
                    conflicts += 1
                    details.append({
                        "type": "conflict",
                        "message": f"{name}",
                        "newPrice": cost,
                        "oldPrice": old_price
                    })
                else:
                    updates += 1 
            else:
                new_items += 1
                if new_items <= 5: 
                    details.append({
                        "type": "new",
                        "name": name,
                        "sku": sku
                    })

        return {
            "type": "inventory",
            "new": new_items,
            "update": updates,
            "conflict": conflicts,
            "details": details
        }

    def preview_recipes(self, data):
        new_items = 0
        details = []
        
        for index, row in data.iterrows():
            name = row.get("Name", "Unknown Recipe")
            new_items += 1
            if new_items <= 5:
                details.append({
                    "type": "new_recipe",
                    "name": name,
                    "info": f"{len(str(row.get('Ingredients', '')).split(','))} ingredients"
                })
        
        return {
            "type": "recipes",
            "new": new_items,
            "update": 0,
            "conflict": 0,
            "details": details,
            "summary": "Detected Recipe Import"
        }

    async def execute(self, data: Any, mode: str = "migrate", options: Dict = None):
        import pandas as pd
        from core.database import get_database
        from datetime import datetime, timezone
        import uuid
        import json
        
        db = get_database()
        
        if isinstance(data, pd.DataFrame):
            data, _ = self.normalize_columns(data)
            
            if self.is_recipe_file(data):
                return await self.execute_recipes(data, db)
            
            items = data.to_dict(orient="records")
        else:
            items = data

        return await self.execute_inventory(items, db)

    async def execute_inventory(self, items, db):
        processed = 0
        errors = 0
        
        from datetime import datetime, timezone
        import uuid
        
        for item in items:
            try:
                name = item.get("Name", "Unknown Item")
                sku = str(item.get("SKU")) if pd.notna(item.get("SKU")) else f"GEN-{uuid.uuid4().hex[:8]}"
                cost = float(item.get("Cost", 0) or 0)
                unit = item.get("Unit", "unit")
                
                doc = {
                    "id": str(uuid.uuid4()),
                    "venue_id": self.venue_id,
                    "name": name,
                    "sku": sku,
                    "unit": unit,
                    "cost": cost,
                    "current_stock": 0,
                    "min_stock": 0,
                    "category": "Ingredient",
                    "supplier": "Apicbase Import",
                    "external_links": {
                        "source": "apicbase",
                        "imported_at": datetime.now(timezone.utc).isoformat()
                    },
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
                
                existing = await db.inventory_items.find_one({"venue_id": self.venue_id, "sku": sku})
                
                if existing:
                    await db.inventory_items.update_one(
                        {"_id": existing["_id"]},
                        {"$set": {
                            "name": name, 
                            "cost": cost, 
                            "updated_at": datetime.now(timezone.utc).isoformat()
                        }}
                    )
                else:
                    await db.inventory_items.insert_one(doc)
                
                processed += 1
            except Exception as e:
                print(f"Error processing item {item}: {e}")
                errors += 1
        
        return {
            "status": "completed",
            "summary": f"Processed {processed} Inventory Items. {errors} errors.",
            "details": {"processed": processed, "errors": errors}
        }

    async def execute_recipes(self, df, db):
        processed = 0
        errors = 0
        import uuid
        from datetime import datetime, timezone
        
        items = df.to_dict(orient="records")
        
        for item in items:
            try:
                name = item.get("Name", "Unknown Recipe")
                sales_price = float(item.get("Sales_price", 0) or 0)
                
                # Try to parse ingredients
                ingredients_raw = item.get("Ingredients", "")
                ingredients = []
                
                if isinstance(ingredients_raw, str) and ":" in ingredients_raw:
                    parts = ingredients_raw.split(",")
                    for p in parts:
                        if ":" in p:
                            i_name, i_qty = p.split(":", 1)
                            ingredients.append({"name": i_name.strip(), "quantity": i_qty.strip()})
                
                doc = {
                    "id": str(uuid.uuid4()),
                    "venue_id": self.venue_id,
                    "recipe_name": name,
                    "target_sales_price": sales_price, # Stored separately
                    "description": item.get("Description", ""),
                    "ingredients": ingredients,
                    "raw_import_data": item, 
                    "active": True,
                    "category": "Imported",
                    "external_links": {
                        "source": "apicbase_recipe",
                        "imported_at": datetime.now(timezone.utc).isoformat()
                    }
                }
                
                # Insert into RecipesEngineered
                await db.RecipesEngineered.insert_one(doc)
                processed += 1
            except Exception as e:
                print(f"Error recipe {item}: {e}")
                errors += 1

        return {
            "status": "completed",
            "summary": f"Processed {processed} Recipes. {errors} errors.",
            "details": {"processed": processed, "errors": errors}
        }
