"""Global Search Service - Cross-module intelligent search"""
from typing import List, Dict, Any
from core.database import db


class GlobalSearchService:
    """Search across multiple collections"""
    
    async def search(self, venue_id: str, query: str, modules: List[str] = None, limit: int = 50) -> Dict[str, Any]:
        """Global search across modules"""
        
        if not modules:
            modules = ["inventory", "menu", "orders", "employees", "suppliers", "recipes"]
        
        results = {"query": query, "results": []}
        
        # Search inventory
        if "inventory" in modules:
            inventory_results = await db.InventoryItems.find(
                {
                    "venue_id": venue_id,
                    "$or": [
                        {"name": {"$regex": query, "$options": "i"}},
                        {"sku": {"$regex": query, "$options": "i"}}
                    ]
                },
                {"_id": 0}
            ).limit(limit).to_list(limit)
            
            for item in inventory_results:
                results["results"].append({
                    "module": "inventory",
                    "type": "item",
                    "data": item
                })
        
        # Search menu items
        if "menu" in modules:
            menu_results = await db.MenuItems.find(
                {
                    "venue_id": venue_id,
                    "$or": [
                        {"name": {"$regex": query, "$options": "i"}},
                        {"description": {"$regex": query, "$options": "i"}}
                    ]
                },
                {"_id": 0}
            ).limit(limit).to_list(limit)
            
            for item in menu_results:
                results["results"].append({
                    "module": "menu",
                    "type": "menu_item",
                    "data": item
                })
        
        # Search employees
        if "employees" in modules:
            employee_results = await db.Employees.find(
                {
                    "venue_id": venue_id,
                    "$or": [
                        {"name": {"$regex": query, "$options": "i"}},
                        {"email": {"$regex": query, "$options": "i"}}
                    ]
                },
                {"_id": 0}
            ).limit(limit).to_list(limit)
            
            for item in employee_results:
                results["results"].append({
                    "module": "hr",
                    "type": "employee",
                    "data": item
                })
        
        # Search suppliers
        if "suppliers" in modules:
            supplier_results = await db.Suppliers.find(
                {
                    "venue_id": venue_id,
                    "name": {"$regex": query, "$options": "i"}
                },
                {"_id": 0}
            ).limit(limit).to_list(limit)
            
            for item in supplier_results:
                results["results"].append({
                    "module": "procurement",
                    "type": "supplier",
                    "data": item
                })
        
        results["total"] = len(results["results"])
        
        return results


global_search_service = GlobalSearchService()
