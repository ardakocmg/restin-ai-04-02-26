from .base import BaseMigrationAdapter
from typing import Any, Dict
# Pandas imported lazily

class ApicbaseAdapter(BaseMigrationAdapter):
    def normalize_columns(self, df):
        """Normalize column names to standard keys and return mapping info"""
        import pandas as pd
        import numpy as np
        
        # 1. Detect and Handle Hierarchical Headers (Scanning first 10 rows)
        header_indicators = [
            "name", "sku", "id", "cost", "unit", "price", "ingredients", "reçete", "ürün", "fiyat",
            "urun", "maliyet", "barkod", "stok", "adi", "adı", "ismi", "birim", "tutar", "description"
        ]
        
        def count_matches(vals):
            # Stricter matching: check if indicator is a whole word or exact match in the cell
            count = 0
            for v in vals:
                v_clean = str(v).lower().strip().replace('ı', 'i')
                # Check for exact matches or word-boundary matches
                for ind in header_indicators:
                    ind_clean = ind.replace('ı', 'i')
                    if v_clean == ind_clean or f" {ind_clean} " in f" {v_clean} " or v_clean.endswith(f": {ind_clean}") or v_clean.startswith(f"{ind_clean}:"):
                        count += 1
                        break
            return count

        label_row_idx = -2 # -1 means columns, -2 means none
        max_matches = count_matches(df.columns)
        
        # Scan first 10 rows to see if any is better than the current columns
        for i in range(min(len(df), 10)):
            matches = count_matches(df.iloc[i].values)
            if matches > max_matches:
                max_matches = matches
                label_row_idx = i
        
        # If we found a likely header row (prioritize Row 0/Columns if matches are equal)
        if label_row_idx != -2:
            print(f"DEBUG: Header row detected at index {label_row_idx} ( -1=cols ) with {max_matches} matches.")
            
            if label_row_idx == -1:
                # Columns are already good, just check if Row 0 is categories
                first_row_matches = count_matches(df.iloc[0].values)
                # If Row 0 has very few matches but Columns has many, maybe Row 0 is data?
                # But if Row 0 looks like partial labels, it might be a 2-row header
                pass 
            else:
                # We need to shift the header
                if label_row_idx == 0:
                    categories = [str(x) if not str(x).startswith("Unnamed") else "" for x in df.columns]
                else:
                    categories = [str(x) if pd.notna(x) else "" for x in df.iloc[label_row_idx - 1].values]
                
                labels = [str(x) if pd.notna(x) else "" for x in df.iloc[label_row_idx].values]
                
                new_headers = []
                last_cat = ""
                for cat, label in zip(categories, labels):
                    if cat and not cat.lower().startswith("unnamed"):
                        last_cat = cat
                    
                    if last_cat and label and not label.lower() in last_cat.lower():
                        full_name = f"{last_cat}: {label}"
                    else:
                        full_name = label if label else last_cat
                    new_headers.append(full_name.strip())
                
                print(f"DEBUG: Merged Headers: {new_headers}")
                df.columns = new_headers
                df = df.iloc[label_row_idx + 1:].reset_index(drop=True)
        
        # SPECIAL: Check if Column B (index 1) contains 'Name (required)' - common Apicbase pattern
        # If so, and we haven't found Name yet, force-map it
        col_b_name = str(df.columns[1]).lower() if len(df.columns) > 1 else ""
        if "name" in col_b_name and "(required)" in col_b_name:
            df["Name"] = df.iloc[:, 1]  # Column B = index 1
            print(f"DEBUG: Forced Column B ('{df.columns[1]}') as Name due to 'Name (required)' pattern")

        column_map = {
            # IMPORTANT: Only use EXACT matches, not partial words like 'product' or 'item' which match 'product type'
            "Name": ["name", "item name", "product name", "recipe name", "dish", "title", "ürün adı", "urun adi", "yemek", "reçete", "name (required)", "item_name", "adı", "adi", "ismi", "raw material name", "ingredient name"],
            "Unit": ["unit", "uom", "measure", "size", "birim", "ölçü birimi", "olcu birimi", "birimi", "ölçü", "basal unit", "base unit", "net weight unit", "net volume unit"],
            "Cost": ["cost", "unit cost", "cost price", "buying price", "maliyet", "alış fiyatı", "alis fiyati", "unit_cost", "birim maliyet", "maliyeti", "purchase price", "net cost"],
            "Sales_price": ["sell price", "sales price", "satış fiyatı", "fiyat", "menu price", "sales_price", "fiyatı", "tutar", "gross price"],
            "Sku": ["sku", "code", "item code", "external id", "apicbase id", "barkod", "stok kodu", "stok_kodu", "article number", "article_number", "sku number", "kod", "barkodu", "supplier code", "internal code"],
            "Ingredients": ["ingredients", "recipe ingredients", "malzemeler", "içindekiler", "icindekiler", "composition", "ingredients list", "reçete malzemeleri", "malzeme", "recipe items"]
        }
        
        # Standardize matching
        mappings = []
        found_name = False
        
        # We'll use a copy of columns to avoid modifying during iteration
        cols_to_process = list(df.columns)
        
        for col in cols_to_process:
            col_str = str(col)
            col_lower = col_str.lower().strip().replace('ı', 'i')
            
            # Skip internal columns if they somehow got here
            if col_str in column_map.keys():
                if col_str == "Name": found_name = True
                continue
                
            for std_key, aliases in column_map.items():
                # Stricter word-boundary matching for aliases
                match = False
                for a in aliases:
                    if col_lower == a:
                        match = True
                    elif col_lower.endswith(f": {a}") or col_lower.endswith(f" {a}"):
                        match = True
                    elif f" {a} " in f" {col_lower} ":
                        # Only match if it's a whole word to avoid "Id" matching "NameId"
                        match = True
                        
                if match:
                    df[std_key] = df[col]
                    mappings.append(f"Mapped '{col_str}' -> '{std_key}'")
                    if std_key == "Name":
                        found_name = True
                    break
        
        # Last resort fallback for Name: Pick the column with highest number of unique text values
        if not found_name:
            candidates = []
            for col in df.columns:
                if col not in column_map.keys() and not str(col).startswith("Unnamed"):
                    sample = df[col].dropna().astype(str)
                    # Filter out purely numeric samples
                    text_vals = [s for s in sample if not s.replace('.','',1).isdigit()]
                    if text_vals:
                        unique_count = len(set(text_vals))
                        candidates.append((unique_count, col))
            
            if candidates:
                # Sort by unique count descending, pick the best one
                candidates.sort(key=lambda x: x[0], reverse=True)
                best_col = candidates[0][1]
                df["Name"] = df[best_col]
                mappings.append(f"AGGRESSIVE FALLBACK: Mapped '{best_col}' -> 'Name' (Unique text count: {candidates[0][0]})")
                found_name = True
            
        print(f"DEBUG: Final Mappings: {mappings}")
        return df, mappings

    def is_recipe_file(self, df) -> bool:
        """Heuristic to check if this is a recipe export"""
        # Check columns (handles both original and normalized)
        columns_lower = [str(c).lower() for c in df.columns]
        
        # Strong indicators (Normalized or original)
        keywords = ["ingredients", "sales_price", "reçete", "recipe", "malzemeler", "içindekiler", "icindekiler"]
        if any(any(k in c for k in keywords) for c in columns_lower):
            return True
        
        secondary_keywords = ["instructions", "prep time", "servings", "yield", "tarif"]
        match_count = sum(1 for k in secondary_keywords if any(k in c for c in columns_lower))
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
            # Check Case-insensitive for column existence since normalize_columns capitalizes
            cols = [c.capitalize() for c in data.columns]
            missing = [col for col in required if col not in data.columns and col not in cols]
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

    async def preview(self, data: Any) -> Dict[str, Any]:
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
            result = await self.preview_recipes(data)
        else:
            result = self.preview_inventory(data)
            
        # Inject metadata into the response
        result["meta"] = {
            "target": target,
            "mappings": mappings,
            "detected_type": "Recipe" if is_recipe else "Inventory"
        }
        
        return result

    def _parse_float(self, value):
        """Helper to parse float from string with currency symbols"""
        if pd.isna(value) or value == "":
            return 0.0
        if isinstance(value, (int, float)):
            return float(value)
        try:
            # Remove currency symbols and non-numeric chars except dot/minus
            clean = str(value).replace("$", "").replace("€", "").replace("£", "").replace(",", "").strip()
            return float(clean)
        except:
            return 0.0

    def preview_inventory(self, data):
        new_items = 0
        updates = 0
        conflicts = 0
        details = []

        # Mock Database Check (In real app, query DB here)
        existing_skus = {"COKE-001": 2.20, "HEINEKEN-PINT": 4.50} 
        
        for index, row in data.iterrows():
            name = row.get("Name", "Unknown")
            sku = row.get("Sku", "N/A")
            cost = self._parse_float(row.get("Cost", 0))
            
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
                if new_items <= 50: # Increased limit for visibility
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

    async def preview_recipes(self, data, db=None):
        import pandas as pd
        from core.database import get_database
        
        if db is None:
            db = get_database()
        
        new_items = 0
        update_items = 0
        unchanged_items = 0
        restore_from_archive = 0
        restore_from_trash = 0
        details = []
        
        # Get venue prefix for Item ID (first 2-3 letters of venue name)
        venue_prefix = self.venue_id[:2].upper() if self.venue_id else "XX"
        
        # OPTIMIZATION: 2-Step Fetch
        # 1. Fetch Key Index (ID, SKU, Name) only - fast and small
        # 2. Identify matches from the input data
        # 3. Fetch full data only for the matched subset
        
        # Step 1: Lightweight Scan
        existing_index = {} # Map 'sku:X' or 'name:X' -> document_id
        
        # Only fetch identification fields
        cursor = db.recipes_engineered.find(
            {"venue_id": self.venue_id},
            {"_id": 0, "id": 1, "sku": 1, "recipe_name": 1, "active": 1, "deleted_at": 1} 
        )
        
        async for recipe in cursor:
            sku = recipe.get("sku", "")
            name = recipe.get("recipe_name", "")
            doc_id = recipe.get("id")
            
            if sku:
                existing_index[f"sku:{sku}"] = doc_id
            if name:
                existing_index[f"name:{name.lower()}"] = doc_id

        # Step 2: Identify required IDs from the uploaded Data
        needed_ids = set()
        
        # Pre-scan data to find matches
        for index, row in data.iterrows():
            name = row.get("Name", "Unknown Recipe")
            if pd.isna(name) or str(name).lower() in ['nan', 'total', 'totals', '', 'none']:
                continue
                
            sku = str(row.get("Sku", "")) if pd.notna(row.get("Sku")) else ""
            
            # Check Index
            found_id = None
            if sku and f"sku:{sku}" in existing_index:
                found_id = existing_index[f"sku:{sku}"]
            elif f"name:{str(name).lower()}" in existing_index:
                found_id = existing_index[f"name:{str(name).lower()}"]
            
            if found_id:
                needed_ids.add(found_id)
        
        # Step 3: Fetch Full Data for matches (Bulk)
        existing_recipes = {} # The full map expected by logic below
        
        if needed_ids:
            # Batch fetch full documents including raw_import_data
            full_docs_cursor = db.recipes_engineered.find(
                {"venue_id": self.venue_id, "id": {"$in": list(needed_ids)}}
            )
            async for recipe in full_docs_cursor:
                sku = recipe.get("sku", "")
                name = recipe.get("recipe_name", "")
                
                # Re-populate the map used by the loop below
                if sku:
                    existing_recipes[f"sku:{sku}"] = recipe
                if name:
                    existing_recipes[f"name:{name.lower()}"] = recipe

        # Get max sequence for auto Item ID
        max_seq = await db.recipes_engineered.count_documents({"venue_id": self.venue_id})
        
        for index, row in data.iterrows():
            name = row.get("Name", "Unknown Recipe")
            # Skip rows that look like totals or empty
            if str(name).lower() in ['nan', 'total', 'totals', '', 'none'] or pd.isna(name):
                continue
            
            sku = str(row.get("Sku", "")) if pd.notna(row.get("Sku")) else ""
            
            # Include all original data as raw_import_data
            raw_data = {}
            for col in data.columns:
                val = row.get(col)
                if pd.notna(val):
                    raw_data[str(col)] = str(val) if not isinstance(val, (int, float)) else val
            
            # Check if this is an update or new item
            existing = None
            if sku and f"sku:{sku}" in existing_recipes:
                existing = existing_recipes[f"sku:{sku}"]
            elif f"name:{str(name).lower()}" in existing_recipes:
                existing = existing_recipes[f"name:{str(name).lower()}"]
            
            if existing:
                # Determine if it's archived or trashed
                is_archived = not existing.get("active", True) and not existing.get("deleted_at")
                is_trashed = existing.get("deleted_at") is not None
                
                if is_trashed:
                    # RESTORE FROM TRASH - highlight this
                    update_items += 1
                    restore_from_trash += 1
                    details.append({
                        "type": "restore_from_trash",
                        "name": str(name),
                        "sku": sku or "N/A",
                        "item_id": existing.get("item_id", ""),
                        "existing_id": existing.get("id", ""),
                        "info": "⚠️ Was in TRASH - will be restored and updated",
                        "deleted_at": existing.get("deleted_at"),
                        "raw_import_data": raw_data
                    })
                elif is_archived:
                    # RESTORE FROM ARCHIVE - highlight this
                    update_items += 1
                    restore_from_archive += 1
                    details.append({
                        "type": "restore_from_archive",
                        "name": str(name),
                        "sku": sku or "N/A",
                        "item_id": existing.get("item_id", ""),
                        "existing_id": existing.get("id", ""),
                        "info": "📦 Was ARCHIVED - will be restored and updated",
                        "raw_import_data": raw_data
                    })
                else:
                    # Regular UPDATE - find changed fields
                    changed_fields = []
                    old_raw = existing.get("raw_import_data", {})
                    
                    # Compare ALL fields, not just key fields
                    all_old_keys = set(old_raw.keys())
                    all_new_keys = set(raw_data.keys())
                    all_fields = all_old_keys | all_new_keys
                    
                    for field in all_fields:
                        old_val = str(old_raw.get(field, "")) if old_raw.get(field) else ""
                        new_val = str(raw_data.get(field, "")) if raw_data.get(field) else ""
                        if old_val != new_val:
                            changed_fields.append({
                                "field": field.split(": ")[-1] if ": " in field else field,
                                "old": old_val or "(empty)",
                                "new": new_val or "(empty)"
                            })
                    
                    if len(changed_fields) > 0:
                        # Has actual changes
                        update_items += 1
                        details.append({
                            "type": "update",
                            "name": str(name),
                            "sku": sku or "N/A",
                            "item_id": existing.get("item_id", ""),
                            "existing_id": existing.get("id", ""),
                            "changed_fields": changed_fields,
                            "info": f"{len(changed_fields)} field(s) changed",
                            "raw_import_data": raw_data
                        })
                    else:
                        # No changes - count as unchanged
                        unchanged_items += 1
                        details.append({
                            "type": "unchanged",
                            "name": str(name),
                            "sku": sku or "N/A",
                            "item_id": existing.get("item_id", ""),
                            "existing_id": existing.get("id", ""),
                            "info": "✓ No changes detected",
                            "raw_import_data": raw_data
                        })
            else:
                # NEW item - generate Item ID
                new_items += 1
                max_seq += 1
                item_id = f"{venue_prefix}/{str(max_seq).zfill(3)}"
                
                details.append({
                    "type": "new_recipe",
                    "name": str(name),
                    "sku": sku or "N/A",
                    "item_id": item_id,
                    "info": f"New - will be assigned {item_id}",
                    "raw_import_data": raw_data
                })
        
        summary_parts = []
        if new_items > 0:
            summary_parts.append(f"{new_items} New")
        if update_items > 0:
            summary_parts.append(f"{update_items} Updates")
        if restore_from_archive > 0:
            summary_parts.append(f"{restore_from_archive} from Archive")
        if restore_from_trash > 0:
            summary_parts.append(f"{restore_from_trash} from Trash")
        if unchanged_items > 0:
            summary_parts.append(f"{unchanged_items} Unchanged")
        
        return {
            "type": "recipes",
            "new": new_items,
            "update": update_items,
            "restore_from_archive": restore_from_archive,
            "restore_from_trash": restore_from_trash,
            "unchanged": unchanged_items,
            "conflict": 0,
            "details": details,
            "summary": f"Detected: {', '.join(summary_parts) if summary_parts else 'No items'}"
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
            return await self.execute_inventory(items, db)
        
        # JSON data from frontend - check if it's recipe data
        if isinstance(data, list) and len(data) > 0:
            first_item = data[0]
            # Check for recipe indicators
            is_recipe = (
                first_item.get("type") == "new_recipe" or 
                "raw_import_data" in first_item or
                "recipe_name" in first_item
            )
            
            if is_recipe:
                print(f"DEBUG execute: Detected {len(data)} recipes from JSON data")
                return await self.execute_recipes_from_json(data, db)
        
        return await self.execute_inventory(data if isinstance(data, list) else [], db)

    async def execute_inventory(self, items, db):
        processed = 0
        errors = 0
        
        from datetime import datetime, timezone
        import uuid
        
        for item in items:
            try:
                name = item.get("Name", "Unknown Item")
                sku = str(item.get("Sku")) if pd.notna(item.get("Sku")) else f"GEN-{uuid.uuid4().hex[:8]}"
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
                name = item.get("Name", item.get("Recipe", item.get("recipe_name", "Unknown Recipe")))
                sales_price = float(item.get("Sales_price", item.get("Price", 0)) or 0)
                
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
                await db.recipes_engineered.insert_one(doc)
                processed += 1
            except Exception as e:
                print(f"Error recipe {item}: {e}")
                errors += 1

        return {
            "status": "completed",
            "summary": f"Processed {processed} Recipes. {errors} errors.",
            "details": {"processed": processed, "errors": errors}
        }

    async def execute_recipes_from_json(self, data, db):
        """Process recipe data from JSON (sent by frontend after preview)"""
        processed = 0
        updated = 0
        skipped = 0
        errors = 0
        import uuid
        from datetime import datetime, timezone
        
        # Get venue prefix for Item ID
        venue_prefix = self.venue_id[:2].upper() if self.venue_id else "XX"
        
        # Get current max sequence for item_id
        existing_count = await db.recipes_engineered.count_documents({"venue_id": self.venue_id})
        current_seq = existing_count
        
        for item in data:
            try:
                item_type = item.get("type", "new_recipe")
                
                # SKIP UNCHANGED ITEMS - they should not be processed or counted
                if item_type == "unchanged":
                    skipped += 1
                    continue
                
                # Get name from various possible locations
                name = (
                    item.get("name") or 
                    item.get("recipe_name") or 
                    item.get("raw_import_data", {}).get("Name") or
                    item.get("raw_import_data", {}).get("General Information: name (required)") or
                    "Unknown Recipe"
                )
                
                # Get raw import data (contains all original columns)
                raw_data = item.get("raw_import_data", item)
                
                # Get SKU for duplicate detection
                sku = item.get("sku", raw_data.get("Internal: apicbase ID", ""))
                
                # Check if this is an update (item already exists)
                is_update = item.get("type") == "update"
                existing_id = item.get("existing_id")
                item_id = item.get("item_id", "")
                
                # Extract sales price
                sales_price = 0
                for key in ["Financial: sell price", "Sales_price", "sell price", "price"]:
                    if key in raw_data:
                        try:
                            sales_price = float(raw_data[key] or 0)
                            break
                        except:
                            pass
                
                now = datetime.now(timezone.utc).isoformat()
                item_type = item.get("type", "new_recipe")
                
                # Handle RESTORE FROM TRASH
                if item_type == "restore_from_trash" and existing_id:
                    # Restore from trash + update
                    await db.recipes_engineered.update_one(
                        {"id": existing_id, "venue_id": self.venue_id},
                        {
                            "$set": {
                                "active": True,
                                "deleted_at": None,
                                "deleted_by": None,
                                "recipe_name": str(name),
                                "raw_import_data": raw_data,
                                "updated_at": now,
                                "last_modified_by": self.user_id,
                                "last_modified_method": "excel_upload"
                            },
                            "$inc": {"version": 1},
                            "$push": {
                                "change_history": {
                                    "id": str(uuid.uuid4()),
                                    "version": 0,
                                    "change_type": "restored_from_trash",
                                    "change_method": "excel_upload",
                                    "change_summary": f"Restored from trash via Excel import",
                                    "user_id": self.user_id,
                                    "user_name": "Import",
                                    "timestamp": now
                                }
                            }
                        }
                    )
                    updated += 1
                    
                # Handle RESTORE FROM ARCHIVE  
                elif item_type == "restore_from_archive" and existing_id:
                    await db.recipes_engineered.update_one(
                        {"id": existing_id, "venue_id": self.venue_id},
                        {
                            "$set": {
                                "active": True,
                                "recipe_name": str(name),
                                "raw_import_data": raw_data,
                                "updated_at": now,
                                "last_modified_by": self.user_id,
                                "last_modified_method": "excel_upload"
                            },
                            "$inc": {"version": 1},
                            "$push": {
                                "change_history": {
                                    "id": str(uuid.uuid4()),
                                    "version": 0,
                                    "change_type": "restored",
                                    "change_method": "excel_upload",
                                    "change_summary": f"Restored from archive via Excel import",
                                    "user_id": self.user_id,
                                    "user_name": "Import",
                                    "timestamp": now
                                }
                            }
                        }
                    )
                    updated += 1
                    
                # Handle regular UPDATE
                elif item_type == "update" and existing_id:
                    # Fetch existing document to compare
                    existing_doc = await db.recipes_engineered.find_one(
                        {"id": existing_id, "venue_id": self.venue_id},
                        {"_id": 0, "recipe_name": 1, "target_sales_price": 1, "description": 1,
                         "category": 1, "subcategory": 1, "product_type": 1, "portions": 1,
                         "difficulty": 1, "cuisine": 1}
                    )
                    
                    update_data = {
                        "recipe_name": str(name),
                        "target_sales_price": sales_price,
                        "description": raw_data.get("General Information: extra info", ""),
                        "category": raw_data.get("General Information: category", "Imported"),
                        "subcategory": raw_data.get("General Information: subcategory", ""),
                        "product_type": raw_data.get("General Information: product type", ""),
                        "portions": raw_data.get("Portioning: # portions", 1),
                        "difficulty": raw_data.get("General Information: difficulty", ""),
                        "cuisine": raw_data.get("General Information: cuisine", ""),
                        "raw_import_data": raw_data,
                        "updated_at": now,
                        "last_modified_by": self.user_id,
                        "last_modified_method": "excel_upload"
                    }
                    
                    # Check if any tracked fields actually changed
                    has_changes = False
                    if existing_doc:
                        compare_fields = ["recipe_name", "target_sales_price", "description", 
                                         "category", "subcategory", "product_type", "portions",
                                         "difficulty", "cuisine"]
                        for field in compare_fields:
                            old_val = existing_doc.get(field)
                            new_val = update_data.get(field)
                            # Normalize for comparison
                            if old_val != new_val:
                                has_changes = True
                                break
                    else:
                        has_changes = True  # No existing doc, so definitely has changes
                    
                    if has_changes:
                        await db.recipes_engineered.update_one(
                            {"id": existing_id, "venue_id": self.venue_id},
                            {
                                "$set": update_data,
                                "$inc": {"version": 1},
                                "$push": {
                                    "change_history": {
                                        "id": str(uuid.uuid4()),
                                        "version": 0,
                                        "change_type": "updated",
                                        "change_method": "excel_upload",
                                        "change_summary": f"Updated via Excel import",
                                        "user_id": self.user_id,
                                        "user_name": "Import",
                                        "timestamp": now
                                    }
                                }
                            }
                        )
                        updated += 1
                    else:
                        skipped += 1
                else:
                    # NEW recipe - generate item_id if not provided
                    if not item_id:
                        current_seq += 1
                        item_id = f"{venue_prefix}/{str(current_seq).zfill(3)}"
                    
                    doc = {
                        "id": str(uuid.uuid4()),
                        "venue_id": self.venue_id,
                        "item_id": item_id,
                        "recipe_name": str(name),
                        "target_sales_price": sales_price,
                        "sku": sku,
                        "version": 1,
                        "description": raw_data.get("General Information: extra info", ""),
                        "category": raw_data.get("General Information: category", "Imported"),
                        "subcategory": raw_data.get("General Information: subcategory", ""),
                        "product_type": raw_data.get("General Information: product type", ""),
                        "portions": raw_data.get("Portioning: # portions", 1),
                        "prep_time": {
                            "min": raw_data.get("Production: prep time min", 0),
                            "sec": raw_data.get("Production: prep time sec", 0)
                        },
                        "cook_time": {
                            "min": raw_data.get("Production: cook time min", 0),
                            "sec": raw_data.get("Production: cook time sec", 0)
                        },
                        "difficulty": raw_data.get("General Information: difficulty", ""),
                        "cuisine": raw_data.get("General Information: cuisine", ""),
                        "ingredients": [],
                        "raw_import_data": raw_data,
                        "active": True,
                        "created_at": now,
                        "updated_at": now,
                        "created_by": self.user_id,
                        "last_modified_by": self.user_id,
                        "last_modified_method": "excel_upload",
                        "change_history": [{
                            "id": str(uuid.uuid4()),
                            "version": 1,
                            "change_type": "imported",
                            "change_method": "excel_upload",
                            "change_summary": f"Created via Excel import",
                            "user_id": self.user_id,
                            "user_name": "Import",
                            "timestamp": now
                        }],
                        "external_links": {
                            "source": "apicbase_recipe",
                            "apicbase_id": raw_data.get("Internal: apicbase ID", ""),
                            "imported_at": now
                        }
                    }
                    
                    await db.recipes_engineered.insert_one(doc)
                    processed += 1
                
            except Exception as e:
                print(f"Error processing recipe from JSON: {e}")
                errors += 1
        
        summary_parts = []
        if processed > 0:
            summary_parts.append(f"{processed} New")
        if updated > 0:
            summary_parts.append(f"{updated} Updated")
        if skipped > 0:
            summary_parts.append(f"{skipped} Unchanged (skipped)")
        if errors > 0:
            summary_parts.append(f"{errors} Errors")
        
        return {
            "status": "completed",
            "summary": f"Processed {', '.join(summary_parts) if summary_parts else '0 items'}.",
            "details": {"processed": processed, "updated": updated, "skipped": skipped, "errors": errors}
        }
