"""Filters DSL for safe query building"""

def parse_filters(filters: dict) -> dict:
    """Convert filters DSL to MongoDB query (safe)"""
    mongo_query = {}
    
    for field, condition in filters.items():
        if not isinstance(condition, dict):
            continue
        
        # Support operators: eq, in, gte, lte, gt, lt
        if "eq" in condition:
            mongo_query[field] = condition["eq"]
        elif "in" in condition:
            mongo_query[field] = {"$in": condition["in"]}
        elif "gte" in condition or "lte" in condition:
            range_filter = {}
            if "gte" in condition:
                range_filter["$gte"] = condition["gte"]
            if "lte" in condition:
                range_filter["$lte"] = condition["lte"]
            mongo_query[field] = range_filter
        elif "gt" in condition:
            mongo_query[field] = {"$gt": condition["gt"]}
        elif "lt" in condition:
            mongo_query[field] = {"$lt": condition["lt"]}
    
    return mongo_query
