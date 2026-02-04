"""Menu routes - menus, categories, items, modifiers"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional

from core.database import db
from core.dependencies import get_current_user, check_venue_access
from models import (
    Menu, MenuCreate, MenuCategory, MenuCategoryCreate,
    MenuItem, MenuItemCreate, ModifierGroup, ModifierGroupCreate,
    ModifierOption, ModifierOptionCreate, MenuItemModifier
)
from services.audit_service import create_audit_log


def create_menu_router():
    router = APIRouter(tags=["menu"])

    # ==================== MENU ENDPOINTS ====================
    @router.get("/venues/{venue_id}/menus")
    async def list_menus(venue_id: str):
        menus = await db.menus.find({"venue_id": venue_id}, {"_id": 0}).to_list(100)
        return menus

    @router.get("/venues/{venue_id}/menus/active")
    async def get_active_menu(venue_id: str):
        menu = await db.menus.find_one({"venue_id": venue_id, "is_active": True}, {"_id": 0})
        if not menu:
            return None
        return menu

    @router.post("/menus", response_model=Menu)
    async def create_menu(data: MenuCreate, current_user: dict = Depends(get_current_user)):
        await check_venue_access(current_user, data.venue_id)
        
        menu = Menu(**data.model_dump())
        await db.menus.insert_one(menu.model_dump())
        
        await create_audit_log(
            data.venue_id, current_user["id"], current_user["name"],
            "create", "menu", menu.id, {"name": menu.name}
        )
        
        return menu

    @router.put("/menus/{menu_id}")
    async def update_menu(menu_id: str, data: dict, current_user: dict = Depends(get_current_user)):
        menu = await db.menus.find_one({"id": menu_id}, {"_id": 0})
        if not menu:
            raise HTTPException(status_code=404, detail="Menu not found")
        
        await check_venue_access(current_user, menu["venue_id"])
        
        # If setting this menu as active, deactivate others
        if data.get("is_active") == True:
            await db.menus.update_many(
                {"venue_id": menu["venue_id"], "id": {"$ne": menu_id}},
                {"$set": {"is_active": False}}
            )
        
        await db.menus.update_one({"id": menu_id}, {"$set": data})
        
        return {"message": "Menu updated"}

    # ==================== CATEGORY ENDPOINTS ====================
    @router.get("/venues/{venue_id}/menu/categories", response_model=List[MenuCategory])
    async def list_categories(venue_id: str, menu_id: Optional[str] = None):
        query = {"venue_id": venue_id}
        if menu_id:
            query["menu_id"] = menu_id
        categories = await db.menu_categories.find(query, {"_id": 0}).sort("sort_order", 1).to_list(100)
        return categories

    @router.post("/menu/categories", response_model=MenuCategory)
    async def create_category(data: MenuCategoryCreate, current_user: dict = Depends(get_current_user)):
        await check_venue_access(current_user, data.venue_id)
        
        category = MenuCategory(**data.model_dump())
        await db.menu_categories.insert_one(category.model_dump())
        
        return category

    @router.put("/menu/categories/{category_id}")
    async def update_category(category_id: str, data: dict, current_user: dict = Depends(get_current_user)):
        category = await db.menu_categories.find_one({"id": category_id}, {"_id": 0})
        if not category:
            raise HTTPException(status_code=404, detail="Category not found")
        
        await check_venue_access(current_user, category["venue_id"])
        await db.menu_categories.update_one({"id": category_id}, {"$set": data})
        
        return {"message": "Category updated"}

    @router.delete("/menu/categories/{category_id}")
    async def delete_category(category_id: str, current_user: dict = Depends(get_current_user)):
        category = await db.menu_categories.find_one({"id": category_id}, {"_id": 0})
        if not category:
            raise HTTPException(status_code=404, detail="Category not found")
        
        await check_venue_access(current_user, category["venue_id"])
        
        # Delete category and its items
        await db.menu_items.delete_many({"category_id": category_id})
        await db.menu_categories.delete_one({"id": category_id})
        
        return {"message": "Category deleted"}

    # ==================== MENU ITEM ENDPOINTS ====================
    @router.get("/venues/{venue_id}/menu/items", response_model=List[MenuItem])
    async def list_menu_items(
        venue_id: str, 
        category_id: Optional[str] = None, 
        menu_id: Optional[str] = None, 
        include_inactive: bool = False
    ):
        query = {"venue_id": venue_id}
        if not include_inactive:
            query["is_active"] = True
        if category_id:
            query["category_id"] = category_id
        if menu_id:
            query["menu_id"] = menu_id
        items = await db.menu_items.find(query, {"_id": 0}).to_list(500)
        return items

    @router.get("/menu/items/{item_id}")
    async def get_menu_item(item_id: str):
        item = await db.menu_items.find_one({"id": item_id}, {"_id": 0})
        if not item:
            raise HTTPException(status_code=404, detail="Item not found")
        return item

    @router.post("/menu/items", response_model=MenuItem)
    async def create_menu_item(data: MenuItemCreate, current_user: dict = Depends(get_current_user)):
        await check_venue_access(current_user, data.venue_id)
        
        item_data = data.model_dump()
        # Calculate price_cents if not provided
        if not item_data.get("price_cents"):
            item_data["price_cents"] = int(item_data["price"] * 100)
        
        item = MenuItem(**item_data)
        await db.menu_items.insert_one(item.model_dump())
        
        return item

    @router.put("/menu/items/{item_id}")
    async def update_menu_item(item_id: str, data: dict, current_user: dict = Depends(get_current_user)):
        item = await db.menu_items.find_one({"id": item_id}, {"_id": 0})
        if not item:
            raise HTTPException(status_code=404, detail="Item not found")
        
        await check_venue_access(current_user, item["venue_id"])
        
        # Update price_cents if price changed
        if "price" in data and "price_cents" not in data:
            data["price_cents"] = int(data["price"] * 100)
        
        await db.menu_items.update_one({"id": item_id}, {"$set": data})
        
        await create_audit_log(
            item["venue_id"], current_user["id"], current_user["name"],
            "update", "menu_item", item_id, {"name": item["name"]}
        )
        
        return {"message": "Item updated"}

    @router.delete("/menu/items/{item_id}")
    async def delete_menu_item(item_id: str, current_user: dict = Depends(get_current_user)):
        item = await db.menu_items.find_one({"id": item_id}, {"_id": 0})
        if not item:
            raise HTTPException(status_code=404, detail="Item not found")
        
        await check_venue_access(current_user, item["venue_id"])
        
        # Soft delete - just mark inactive
        await db.menu_items.update_one({"id": item_id}, {"$set": {"is_active": False}})
        
        return {"message": "Item deleted"}

    # ==================== MODIFIER ENDPOINTS ====================
    @router.post("/modifier-groups")
    async def create_modifier_group(
        group_data: ModifierGroupCreate,
        current_user: dict = Depends(get_current_user)
    ):
        """Create a modifier group"""
        await check_venue_access(current_user, group_data.venue_id)
        
        group = ModifierGroup(**group_data.model_dump())
        await db.modifier_groups.insert_one(group.model_dump())
        
        return group.model_dump()

    @router.get("/venues/{venue_id}/modifier-groups")
    async def list_modifier_groups(venue_id: str, current_user: dict = Depends(get_current_user)):
        """List all modifier groups for a venue"""
        await check_venue_access(current_user, venue_id)
        
        groups = await db.modifier_groups.find({"venue_id": venue_id}, {"_id": 0}).sort("sort_order", 1).to_list(100)
        return groups

    @router.post("/modifier-groups/{group_id}/options")
    async def create_modifier_option(
        group_id: str,
        option_data: ModifierOptionCreate,
        current_user: dict = Depends(get_current_user)
    ):
        """Add an option to a modifier group"""
        group = await db.modifier_groups.find_one({"id": group_id}, {"_id": 0})
        if not group:
            raise HTTPException(status_code=404, detail="Modifier group not found")
        
        await check_venue_access(current_user, group["venue_id"])
        
        option = ModifierOption(**option_data.model_dump())
        await db.modifier_options.insert_one(option.model_dump())
        
        return option.model_dump()

    @router.get("/modifier-groups/{group_id}/options")
    async def list_modifier_options(group_id: str):
        """List all options for a modifier group"""
        options = await db.modifier_options.find({"group_id": group_id}, {"_id": 0}).sort("sort_order", 1).to_list(100)
        return options

    @router.post("/menu/items/{item_id}/modifiers/{group_id}")
    async def link_modifier_to_item(
        item_id: str,
        group_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        """Link a modifier group to a menu item"""
        item = await db.menu_items.find_one({"id": item_id}, {"_id": 0})
        if not item:
            raise HTTPException(status_code=404, detail="Menu item not found")
        
        await check_venue_access(current_user, item["venue_id"])
        
        link = MenuItemModifier(menu_item_id=item_id, modifier_group_id=group_id)
        await db.menu_item_modifiers.insert_one(link.model_dump())
        
        return {"message": "Modifier linked to item"}

    @router.get("/menu/items/{item_id}/modifiers")
    async def get_item_modifiers(item_id: str):
        """Get all modifier groups for a menu item"""
        links = await db.menu_item_modifiers.find({"menu_item_id": item_id}, {"_id": 0}).to_list(100)
        
        result = []
        for link in links:
            group = await db.modifier_groups.find_one({"id": link["modifier_group_id"]}, {"_id": 0})
            if group:
                options = await db.modifier_options.find(
                    {"group_id": group["id"]},
                    {"_id": 0}
                ).sort("sort_order", 1).to_list(100)
                group["options"] = options
                result.append(group)
        
        return result

    return router
