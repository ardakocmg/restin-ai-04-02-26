"""Search utilities"""

def parse_list_query(q: str = None, filters: dict = None, page: int = 1, limit: int = 50, sort: str = None):
    return {
        "q": q or "",
        "filters": filters or {},
        "page": max(page, 1),
        "limit": min(max(limit, 1), 200),
        "sort": sort or "name"
    }
