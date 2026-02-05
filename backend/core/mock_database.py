import hashlib
from datetime import datetime, timezone
import asyncio
import json
import os
import re

DB_FILE = "local_db.json"

class MockCursor:
    def __init__(self, data):
        self.data = data
        self._index = 0
        
    def __aiter__(self):
        self._index = 0
        return self

    async def __anext__(self):
        if self._index < len(self.data):
            item = self.data[self._index]
            self._index += 1
            return item
        else:
            raise StopAsyncIteration

    def sort(self, *args, **kwargs):
        if args:
            key_or_list = args[0]
            if isinstance(key_or_list, str):
                key = key_or_list
                direction = kwargs.get('direction', 1) 
                reverse = direction == -1
                self.data.sort(key=lambda x: x.get(key), reverse=reverse)
        return self
        
    async def to_list(self, length):
        if length is None:
            return self.data
        return self.data[:length]

    def limit(self, length):
        if length is not None:
            self.data = self.data[:length]
        return self

    def skip(self, count):
        if count is not None:
            self.data = self.data[count:]
        return self

class MockClient:
    def __init__(self, db_instance):
        self._db = db_instance
    
    def __getitem__(self, name):
        return self._db
        
    def close(self):
        pass

class MockCollection:
    def __init__(self, name, db_instance):
        self.name = name
        self.db_instance = db_instance
        # Data is referenced from the main DB dict
        if name not in self.db_instance.data_store:
            self.db_instance.data_store[name] = []
        self.data = self.db_instance.data_store[name]
        
    def _matches_query(self, item, query):
        for k, v in query.items():
            if k not in item:
                return False
            
            item_val = item[k]
            
            if isinstance(v, dict):
                for op, op_val in v.items():
                    if op == "$gt":
                        if not (item_val > op_val): return False
                    elif op == "$gte":
                        if not (item_val >= op_val): return False
                    elif op == "$lt":
                        if not (item_val < op_val): return False
                    elif op == "$lte":
                        if not (item_val <= op_val): return False
                    elif op == "$in":
                        if item_val not in op_val: return False
                    elif op == "$ne":
                         if item_val == op_val: return False
                    elif op == "$regex":
                        try:
                            if not re.search(op_val, str(item_val)): return False
                        except:
                            return False
            else:
                if item_val != v:
                    return False
        return True

    async def find_one(self, query, projection=None, sort=None, **kwargs):
        data_to_search = self.data
        if sort:
            for key, direction in sort:
                reverse = direction == -1
                data_to_search = sorted(data_to_search, key=lambda x: x.get(key), reverse=reverse)
        
        for item in data_to_search:
            if self._matches_query(item, query):
                return item
        return None
        
    def find(self, query, projection=None):
        results = []
        for item in self.data:
            if self._matches_query(item, query):
                results.append(item)
        return MockCursor(results)
        
    async def insert_one(self, doc):
        if "_id" not in doc:
            doc["_id"] = str(len(self.data) + 1000 + int(datetime.utcnow().timestamp()))
        
        self.data.append(doc)
        self.db_instance.save_db()
        return type('obj', (object,), {'inserted_id': doc["_id"]})
        
    async def count_documents(self, query):
        count = 0
        for item in self.data:
            if self._matches_query(item, query):
                count += 1
        return count

    async def update_one(self, query, update, upsert=False, **kwargs):
        item = await self.find_one(query)
        if item:
            if "$set" in update:
                item.update(update["$set"])
            if "$inc" in update:
                for k, v in update["$inc"].items():
                    if k in item:
                        item[k] = item[k] + v
                    else:
                        item[k] = v
            if "$push" in update:
                 for k, v in update["$push"].items():
                    if k not in item: item[k] = []
                    item[k].append(v)
            
            self.db_instance.save_db()
            return type('obj', (object,), {'modified_count': 1, 'upserted_id': None})
            
        elif upsert:
            new_doc = query.copy()
            if "$set" in update:
                new_doc.update(update["$set"])
            if "$inc" in update:
                for k, v in update["$inc"].items():
                    new_doc[k] = v
            
            # Helper to remove operators
            clean_doc = {k:v for k,v in new_doc.items() if not k.startswith('$')}
            
            res = await self.insert_one(clean_doc)
            return type('obj', (object,), {'modified_count': 0, 'upserted_id': res.inserted_id})
            
        return type('obj', (object,), {'modified_count': 0, 'upserted_id': None})
        
    async def delete_one(self, query):
        item = await self.find_one(query)
        if item:
            self.data.remove(item)
            self.db_instance.save_db()
            return type('obj', (object,), {'deleted_count': 1})
        return type('obj', (object,), {'deleted_count': 0})

class MockDatabase:
    def __init__(self):
        self.data_store = {}
        self.load_db()

    def load_db(self):
        if os.path.exists(DB_FILE):
            try:
                with open(DB_FILE, 'r') as f:
                    self.data_store = json.load(f)
                print(f"[DB] Loaded persistent data from {DB_FILE}")
            except Exception as e:
                print(f"[DB] Failed to load {DB_FILE}: {e}. Starting fresh.")
                self.seed_defaults()
        else:
            self.seed_defaults()
            self.save_db()

    def save_db(self):
        try:
            # Basic JSON dump (wont handle Date objects well, but for a mock string/int/dict is usually fine)
            # In a real app we'd need a custom encoder
            with open(DB_FILE, 'w') as f:
                json.dump(self.data_store, f, indent=2, default=str)
        except Exception as e:
            print(f"[DB] Save failed: {e}")

    def seed_defaults(self):
        print("[DB] Seeding defaults...")
        pin_hash = hashlib.sha256("1111".encode()).hexdigest()
        self.data_store = {
            "users": [{
                "id": "admin_user",
                "_id": "admin_user",
                "name": "Admin User",
                "role": "OWNER",
                "venue_id": "venue-caviar-bull",
                "pin_hash": pin_hash,
                "allowed_venue_ids": ["venue_1", "venue-caviar-bull"],
                "mfa_enabled": False
            }],
            "venues": [{
                "id": "venue_1",
                "_id": "venue_1",
                "name": "Malta Head Office",
                "type": "fine_dining",
                "slug": "malta-head-office",
                "location": "Valletta",
                "currency": "EUR"
            },
            {
                "id": "venue-caviar-bull",
                "_id": "venue-caviar-bull",
                "name": "Caviar & Bull",
                "type": "fine_dining",
                "slug": "caviar-bull",
                "location": "St. Julians",
                "currency": "EUR"
            }],
            "tables": [],
            "orders": [],
            "items": [],
            "categories": []
        }

    def __getattr__(self, name):
        return MockCollection(name, self)

    def __getitem__(self, name):
        return getattr(self, name)
