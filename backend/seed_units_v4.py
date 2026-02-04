import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'restinai')]

async def seed_unit_engine_v4():
    print("🌍 SEEDING UNIT ENGINE v4 - Global Culinary Standards...")
    print("=" * 70)
    
    # CANONICAL BASE UNITS
    base_units = [
        {"id": "unit-g", "code": "g", "type": "mass", "name": "Gram", "is_canonical": True},
        {"id": "unit-ml", "code": "ml", "type": "volume", "name": "Milliliter", "is_canonical": True},
        {"id": "unit-pcs", "code": "pcs", "type": "count", "name": "Pieces", "is_canonical": True}
    ]
    
    await db.base_units.delete_many({})
    await db.base_units.insert_many(base_units)
    print(f"✓ Created {len(base_units)} canonical base units: g, ml, pcs")
    
    # GLOBAL CONVERSIONS (VERIFIED)
    conversions = [
        # MASS -> g
        {"from_unit": "kg", "to_unit": "g", "multiplier": 1000, "scope": "global"},
        {"from_unit": "mg", "to_unit": "g", "multiplier": 0.001, "scope": "global"},
        {"from_unit": "hg", "to_unit": "g", "multiplier": 100, "scope": "global"},  # etto
        {"from_unit": "oz", "to_unit": "g", "multiplier": 28.3495, "scope": "global"},
        {"from_unit": "lb", "to_unit": "g", "multiplier": 453.592, "scope": "global"},
        
        # VOLUME -> ml
        {"from_unit": "l", "to_unit": "ml", "multiplier": 1000, "scope": "global"},
        {"from_unit": "dl", "to_unit": "ml", "multiplier": 100, "scope": "global"},
        {"from_unit": "cl", "to_unit": "ml", "multiplier": 10, "scope": "global"},
        {"from_unit": "fl_oz_us", "to_unit": "ml", "multiplier": 29.5735, "scope": "global"},
        {"from_unit": "fl_oz_uk", "to_unit": "ml", "multiplier": 28.4131, "scope": "global"},
        {"from_unit": "cup_us", "to_unit": "ml", "multiplier": 240, "scope": "global"},
        {"from_unit": "cup_uk", "to_unit": "ml", "multiplier": 250, "scope": "global"},
        {"from_unit": "tbsp", "to_unit": "ml", "multiplier": 15, "scope": "global"},
        {"from_unit": "tsp", "to_unit": "ml", "multiplier": 5, "scope": "global"},
        {"from_unit": "pint_us", "to_unit": "ml", "multiplier": 473.176, "scope": "global"},
        {"from_unit": "pint_uk", "to_unit": "ml", "multiplier": 568.261, "scope": "global"},
        {"from_unit": "quart_us", "to_unit": "ml", "multiplier": 946.353, "scope": "global"},
        {"from_unit": "gallon_us", "to_unit": "ml", "multiplier": 3785.41, "scope": "global"},
        {"from_unit": "shot", "to_unit": "ml", "multiplier": 30, "scope": "global"},
        
        # COUNT -> pcs
        {"from_unit": "dozen", "to_unit": "pcs", "multiplier": 12, "scope": "global"},
        {"from_unit": "half_dozen", "to_unit": "pcs", "multiplier": 6, "scope": "global"}
    ]
    
    await db.unit_conversions.delete_many({"scope": "global"})
    await db.unit_conversions.insert_many([{**c, "id": f"conv-{c['from_unit']}-{c['to_unit']}", "verified": True} for c in conversions])
    print(f"✓ Created {len(conversions)} verified global conversions")
    
    # UNIT ALIASES (Multi-language)
    aliases = [
        # ITALIAN
        {"alias": "etto", "canonical_unit": "hg", "language": "it"},
        {"alias": "etti", "canonical_unit": "hg", "language": "it"},
        {"alias": "ettogrammo", "canonical_unit": "hg", "language": "it"},
        {"alias": "litro", "canonical_unit": "l", "language": "it"},
        {"alias": "litri", "canonical_unit": "l", "language": "it"},
        {"alias": "decilitro", "canonical_unit": "dl", "language": "it"},
        {"alias": "centilitro", "canonical_unit": "cl", "language": "it"},
        {"alias": "pezzo", "canonical_unit": "pcs", "language": "it"},
        {"alias": "pezzi", "canonical_unit": "pcs", "language": "it"},
        {"alias": "spicchio", "canonical_unit": "clove", "language": "it"},
        {"alias": "spicchi", "canonical_unit": "clove", "language": "it"},
        {"alias": "fetta", "canonical_unit": "slice", "language": "it"},
        {"alias": "fette", "canonical_unit": "slice", "language": "it"},
        {"alias": "bottiglia", "canonical_unit": "bottle", "language": "it"},
        
        # US/UK ENGLISH
        {"alias": "tablespoon", "canonical_unit": "tbsp", "language": "en"},
        {"alias": "teaspoon", "canonical_unit": "tsp", "language": "en"},
        {"alias": "fluid ounce", "canonical_unit": "fl_oz_us", "language": "en"},
        {"alias": "fl oz", "canonical_unit": "fl_oz_us", "language": "en"},
        {"alias": "quart", "canonical_unit": "quart_us", "language": "en"},
        {"alias": "qt", "canonical_unit": "quart_us", "language": "en"},
        {"alias": "gallon", "canonical_unit": "gallon_us", "language": "en"},
        {"alias": "gal", "canonical_unit": "gallon_us", "language": "en"},
        {"alias": "pound", "canonical_unit": "lb", "language": "en"},
        {"alias": "lbs", "canonical_unit": "lb", "language": "en"},
        {"alias": "ounce", "canonical_unit": "oz", "language": "en"},
        {"alias": "jigger", "canonical_unit": "shot", "language": "en"},
        {"alias": "gram", "canonical_unit": "g", "language": "en"},
        {"alias": "grams", "canonical_unit": "g", "language": "en"},
        {"alias": "kilogram", "canonical_unit": "kg", "language": "en"},
        {"alias": "kilograms", "canonical_unit": "kg", "language": "en"},
        {"alias": "liter", "canonical_unit": "l", "language": "en"},
        {"alias": "litre", "canonical_unit": "l", "language": "en"},
        {"alias": "milliliter", "canonical_unit": "ml", "language": "en"},
        {"alias": "millilitre", "canonical_unit": "ml", "language": "en"},
        
        # SPANISH/ARGENTINE
        {"alias": "unidad", "canonical_unit": "pcs", "language": "es"},
        {"alias": "unidades", "canonical_unit": "pcs", "language": "es"},
        {"alias": "docena", "canonical_unit": "dozen", "language": "es"},
        {"alias": "media docena", "canonical_unit": "half_dozen", "language": "es"},
        {"alias": "bolsa", "canonical_unit": "bag", "language": "es"},
        {"alias": "caja", "canonical_unit": "box", "language": "es"},
        {"alias": "botella", "canonical_unit": "bottle", "language": "es"},
        {"alias": "lata", "canonical_unit": "can", "language": "es"},
        {"alias": "gramo", "canonical_unit": "g", "language": "es"},
        {"alias": "gramos", "canonical_unit": "g", "language": "es"},
        {"alias": "kilogramo", "canonical_unit": "kg", "language": "es"},
        
        # GENERIC/COMMON
        {"alias": "portion", "canonical_unit": "portion", "language": "en"},
        {"alias": "porzione", "canonical_unit": "portion", "language": "it"},
        {"alias": "porción", "canonical_unit": "portion", "language": "es"},
        {"alias": "filet", "canonical_unit": "fillet", "language": "en"},
        {"alias": "filetto", "canonical_unit": "fillet", "language": "it"},
        {"alias": "bife", "canonical_unit": "steak", "language": "es"},
        {"alias": "hoja", "canonical_unit": "leaf", "language": "es"},
        {"alias": "leaves", "canonical_unit": "leaf", "language": "en"},
        {"alias": "bloque", "canonical_unit": "block", "language": "es"}
    ]
    
    await db.unit_aliases.delete_many({})
    await db.unit_aliases.insert_many([{**a, "id": f"alias-{a['alias'].replace(' ', '-')}"} for a in aliases])
    print(f"✓ Created {len(aliases)} multi-language unit aliases")
    
    # INGREDIENT-SPECIFIC CONVERSIONS (Examples)
    ingredient_conversions = [
        {"from_unit": "clove", "to_unit": "g", "multiplier": 4, "scope": "ingredient", "scope_id": "garlic", "verified": True},
        {"from_unit": "ball", "to_unit": "g", "multiplier": 125, "scope": "ingredient", "scope_id": "mozzarella", "verified": True},
        {"from_unit": "leaf", "to_unit": "g", "multiplier": 0.5, "scope": "ingredient", "scope_id": "basil", "verified": True},
        {"from_unit": "portion", "to_unit": "g", "multiplier": 300, "scope": "ingredient", "scope_id": "steak", "verified": True},
        {"from_unit": "bottle", "to_unit": "ml", "multiplier": 750, "scope": "ingredient", "scope_id": "olive_oil", "verified": True},
        {"from_unit": "slice", "to_unit": "g", "multiplier": 30, "scope": "ingredient", "scope_id": "bread", "verified": True}
    ]
    
    await db.unit_conversions.insert_many([{**c, "id": f"conv-ing-{c['scope_id']}-{c['from_unit']}"} for c in ingredient_conversions])
    print(f"✓ Created {len(ingredient_conversions)} ingredient-specific conversions")
    
    print("=" * 70)
    print("✅ UNIT ENGINE v4 SEEDING COMPLETE!")
    print(f"   - 3 canonical base units (g, ml, pcs)")
    print(f"   - {len(conversions)} global conversions")
    print(f"   - {len(aliases)} multi-language aliases (IT, EN, ES)")
    print(f"   - {len(ingredient_conversions)} ingredient-specific overrides")
    print("=" * 70)
    print("🌍 International culinary unit system ready!")

if __name__ == "__main__":
    asyncio.run(seed_unit_engine_v4())
