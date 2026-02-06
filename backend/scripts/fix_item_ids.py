import asyncio
import os
import sys

# Add backend directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.database import get_database, db

async def backfill_item_ids():
    print("Starting Item ID Backfill...")
    
    # Initialize DB
    if hasattr(db, 'initialize'):
         await db.initialize()
    
    database = get_database()
    
    # We need a venue_id. Since this is a script, we'll strip the first one we find or process ALL venues.
    # Let's process per venue to ensure sequencing is correct.
    
    recipes = await database.RecipesEngineered.find({
        "$or": [
            {"item_id": {"$exists": False}},
            {"item_id": ""},
            {"item_id": None}
        ]
    }).to_list(length=None)
    
    if not recipes:
        print("No recipes found missing item_id.")
        return

    print(f"Found {len(recipes)} recipes without item_id.")
    
    # Group by venue
    recipes_by_venue = {}
    for r in recipes:
        v_id = r.get("venue_id", "UNKNOWN")
        if v_id not in recipes_by_venue:
            recipes_by_venue[v_id] = []
        recipes_by_venue[v_id].append(r)
        
    for venue_id, venue_recipes in recipes_by_venue.items():
        print(f"Processing venue: {venue_id} ({len(venue_recipes)} items)")
        
        venue_prefix = venue_id[:2].upper() if venue_id and venue_id != "UNKNOWN" else "XX"
        
        # Get current max sequence for this venue
        max_recipe = await database.RecipesEngineered.find_one(
            {"venue_id": venue_id, "item_id": {"$regex": f"^{venue_prefix}/"}},
            sort=[("item_id", -1)]
        )
        
        current_seq = 0
        if max_recipe and max_recipe.get("item_id"):
            try:
                current_seq = int(max_recipe["item_id"].split("/")[1])
            except:
                current_seq = 0
        
        # If sequence is 0, maybe check count of all valid ones
        if current_seq == 0:
             current_seq = await database.RecipesEngineered.count_documents({
                "venue_id": venue_id,
                "item_id": {"$exists": True, "$ne": "", "$ne": None}
            })

        print(f"  - Starting sequence from: {current_seq}")
        
        updated_count = 0
        for recipe in venue_recipes:
            current_seq += 1
            new_item_id = f"{venue_prefix}/{str(current_seq).zfill(3)}"
            
            await database.RecipesEngineered.update_one(
                {"_id": recipe["_id"]},
                {"$set": {"item_id": new_item_id}}
            )
            updated_count += 1
            
        print(f"  - Updated {updated_count} recipes for {venue_id}. Last ID: {venue_prefix}/{str(current_seq).zfill(3)}")

    print("\nBackfill Complete!")

if __name__ == "__main__":
    try:
        if sys.platform == 'win32':
            asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
        asyncio.run(backfill_item_ids())
    except Exception as e:
        print(f"Error: {e}")
