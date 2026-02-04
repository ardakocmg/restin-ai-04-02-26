from datetime import datetime, timezone
from typing import List
from inventory.models import Recipe, RecipeCreate

class RecipeService:
    def __init__(self, db):
        self.db = db
        self.col = db.recipes

    async def create_recipe(self, data: RecipeCreate, user_id: str) -> Recipe:
        menu_item = await self.db.menu_items.find_one({"id": data.menu_item_id}, {"_id": 0})
        
        recipe = Recipe(
            venue_id=data.venue_id,
            menu_item_id=data.menu_item_id,
            menu_item_name=menu_item["name"] if menu_item else "Unknown",
            components=data.components,
            yield_qty=data.yield_qty,
            created_by=user_id
        )
        
        await self.col.insert_one(recipe.model_dump())
        await self.recompute_cost(recipe.id, data.venue_id)
        return recipe

    async def recompute_cost(self, recipe_id: str, venue_id: str):
        """Recompute recipe cost from latest ingredient prices"""
        recipe = await self.col.find_one({"id": recipe_id, "venue_id": venue_id}, {"_id": 0})
        if not recipe:
            return
        
        total_cost = 0.0
        
        for component in recipe["components"]:
            # Get latest item price (simplified - should use proper pricing logic)
            item = await self.db.inventory_items.find_one({"id": component["item_id"]}, {"_id": 0})
            if item:
                # Assume base price for now
                unit_price = 5.0  # Placeholder
                total_cost += component["qty"] * unit_price
        
        await self.col.update_one(
            {"id": recipe_id, "venue_id": venue_id},
            {"$set": {
                "cost": total_cost,
                "last_costed_at": datetime.now(timezone.utc).isoformat()
            }}
        )

    async def list_recipes(self, venue_id: str) -> List[Recipe]:
        cursor = self.col.find({"venue_id": venue_id}, {"_id": 0})
        docs = await cursor.to_list(1000)
        return [Recipe(**doc) for doc in docs]
