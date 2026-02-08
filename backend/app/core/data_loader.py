"""
DataLoader: Centralized service for loading seed data.
Replaces all hardcoded mock data with real data from seed-master.json.
"""
import json
import os
from typing import List, Dict, Any, Optional
from functools import lru_cache

class DataLoader:
    """Singleton data loader that reads from seed-master.json."""
    
    _instance: Optional['DataLoader'] = None
    _data: Dict[str, Any] = {}
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._load_data()
        return cls._instance
    
    def _load_data(self):
        """Load seed-master.json into memory."""
        # Path relative to backend root
        seed_path = os.path.join(
            os.path.dirname(__file__), 
            "../../../frontend/src/data/seed-master.json"
        )
        
        try:
            with open(seed_path, 'r', encoding='utf-8') as f:
                self._data = json.load(f)
            print(f"[DataLoader] Loaded seed data: {list(self._data.keys())}")
        except FileNotFoundError:
            print(f"[DataLoader] WARNING: seed-master.json not found at {seed_path}")
            self._data = {}
        except json.JSONDecodeError as e:
            print(f"[DataLoader] ERROR: Invalid JSON in seed file: {e}")
            self._data = {}
    
    def reload(self):
        """Force reload data from file."""
        self._load_data()
    
    # === VENUES ===
    def get_venues(self) -> List[Dict]:
        """Get all venues."""
        return self._data.get("venues", [])
    
    def get_venue(self, venue_id: str) -> Optional[Dict]:
        """Get a single venue by ID."""
        for venue in self.get_venues():
            if venue.get("id") == venue_id:
                return venue
        return None
    
    # === USERS ===
    def get_users(self, venue_id: Optional[str] = None) -> List[Dict]:
        """Get users, optionally filtered by venue."""
        users = self._data.get("users", [])
        if venue_id:
            users = [u for u in users if u.get("venueId") == venue_id]
        return users
    
    def get_user_by_pin(self, pin: str) -> Optional[Dict]:
        """Find user by PIN code."""
        for user in self.get_users():
            if user.get("pin") == pin:
                return user
        return None
    
    # === INVENTORY ===
    def get_inventory(self) -> List[Dict]:
        """Get all inventory items."""
        return self._data.get("inventory", [])
    
    # === MENU ITEMS (as recipes) ===
    def get_menu_items(self) -> List[Dict]:
        """Get menu items (serves as recipes)."""
        return self._data.get("menu_items", [])
    
    def get_recipes(self, active: Optional[bool] = None) -> List[Dict]:
        """
        Get recipes from menu_items.
        Since seed doesn't have 'active' field, we add it.
        """
        items = self.get_menu_items()
        # Add active field if missing
        for item in items:
            if 'active' not in item:
                item['active'] = True
        
        if active is not None:
            items = [i for i in items if i.get('active') == active]
        return items
    
    # === EMPLOYEES ===
    def get_employees(self, venue_id: Optional[str] = None) -> List[Dict]:
        """Get employees, optionally filtered by venue."""
        employees = self._data.get("employees", [])
        if venue_id:
            employees = [e for e in employees if e.get("venueId") == venue_id]
        return employees
    
    # === SUPPLIERS ===
    def get_suppliers(self) -> List[Dict]:
        """Get all suppliers."""
        return self._data.get("suppliers", [])
    
    # === GUESTS ===
    def get_guests(self) -> List[Dict]:
        """Get all guests/customers."""
        return self._data.get("guests", [])


# Singleton accessor
@lru_cache(maxsize=1)
def get_data_loader() -> DataLoader:
    """Get the singleton DataLoader instance."""
    return DataLoader()
