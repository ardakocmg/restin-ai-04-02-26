"""Item Detail Aggregate - Single endpoint for ALL drawer tabs"""
from datetime import datetime, timezone

from core.database import db
from core.feature_flags import require_feature
from core.venue_config import VenueConfigRepo


class ItemDetailAggregateService:
    
    async def get_item_detail(
        self,
        venue_id: str,
        sku_id: str,
        mov_from: str = None,
        mov_to: str = None,
        mov_limit: int = 50
    ):
        """Get complete item detail for drawer (ALL tabs in one call)"""
        
        # Check feature flag
        config_repo = VenueConfigRepo(db)
        cfg = await config_repo.get(venue_id)
        require_feature(cfg, "inventory_detail_drawer", "inventory_detail")
        
        # 1. SKU Master
        sku = await db.inventory_items.find_one(
            {"id": sku_id, "venue_id": venue_id},
            {"_id": 0}
        )
        if not sku:
            return None
        
        # 2. On-Hand Balance (from ledger)
        ledger_entries = await db.stock_ledger.find(
            {"venue_id": venue_id, "item_id": sku_id},
            {"_id": 0}
        ).to_list(10000)
        
        balance = 0.0
        for entry in ledger_entries:
            if entry["action"] == "IN":
                balance += entry["quantity"]
            elif entry["action"] == "OUT":
                balance -= entry["quantity"]
            elif entry["action"] == "ADJUST":
                balance = entry["quantity"]
        
        # 3. Suppliers & Pricing
        suppliers_data = []
        catalog_items = await db.supplier_catalog.find(
            {"sku_id": sku_id},
            {"_id": 0}
        ).to_list(100)
        
        for cat_item in catalog_items:
            supplier = await db.suppliers.find_one(
                {"id": cat_item["supplier_id"]},
                {"_id": 0}
            )
            if supplier:
                suppliers_data.append({
                    "supplier": supplier,
                    "catalog_item": cat_item,
                    "is_preferred": supplier["id"] == sku.get("preferred_supplier_id")
                })
        
        # 4. Recipe Tree
        recipe = await db.recipes.find_one(
            {"venue_id": venue_id, "sku_id": sku_id, "is_active": True},
            {"_id": 0}
        )
        
        recipe_tree = None
        if recipe:
            recipe_tree = await self._resolve_recipe_tree(recipe)
        
        # 5. Waste Profile
        waste_profile = await db.waste_profiles.find_one(
            {"venue_id": venue_id, "sku_id": sku_id},
            {"_id": 0},
            sort=[("effective_from", -1)]
        )
        
        # 6. Recent Movements (paginated)
        mov_query = {"venue_id": venue_id, "item_id": sku_id}
        if mov_from:
            mov_query["created_at"] = {"$gte": mov_from}
        if mov_to:
            mov_query.setdefault("created_at", {})["$lte"] = mov_to
        
        movements = await db.stock_ledger.find(
            mov_query,
            {"_id": 0}
        ).sort("created_at", -1).limit(mov_limit).to_list(mov_limit)
        
        # 7. Recent Production Batches
        production_batches = await db.production_batches.find(
            {"venue_id": venue_id, "outputs.sku_id": sku_id},
            {"_id": 0}
        ).sort("produced_at", -1).limit(20).to_list(20)
        
        # 8. Recent Audit Entries
        audit_entries = await db.audit_log.find(
            {"venue_id": venue_id, "entity": "inventory_item", "entity_id": sku_id},
            {"_id": 0}
        ).sort("ts", -1).limit(20).to_list(20)
        
        # Return aggregated detail
        return {
            "sku": sku,
            "on_hand_balance": balance,
            "suppliers_pricing": suppliers_data,
            "recipe_tree": recipe_tree,
            "waste_profile": waste_profile,
            "recent_movements": movements,
            "production_batches": production_batches,
            "audit_entries": audit_entries
        }
    
    async def _resolve_recipe_tree(self, recipe: dict, depth: int = 0):
        """Recursively resolve recipe tree"""
        if depth > 5:  # Prevent infinite loops
            return recipe
        
        tree = recipe.copy()
        resolved_components = []
        
        for comp in recipe.get("components", []):
            if comp["type"] == "SKU":
                sku = await db.inventory_items.find_one(
                    {"id": comp["ref_id"]},
                    {"_id": 0, "name": 1, "unit": 1}
                )
                resolved_components.append({
                    **comp,
                    "sku_name": sku.get("name") if sku else "Unknown",
                    "sku_unit": sku.get("unit") if sku else "EA"
                })
            elif comp["type"] == "SUB_RECIPE":
                sub_recipe = await db.recipes.find_one(
                    {"id": comp["ref_id"]},
                    {"_id": 0}
                )
                if sub_recipe:
                    resolved_sub = await self._resolve_recipe_tree(sub_recipe, depth + 1)
                    resolved_components.append({
                        **comp,
                        "sub_recipe": resolved_sub
                    })
        
        tree["components"] = resolved_components
        return tree


item_detail_service = ItemDetailAggregateService()
