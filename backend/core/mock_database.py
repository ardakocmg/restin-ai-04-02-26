import hashlib
from datetime import datetime, timezone
import asyncio

import re

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
        # Basic sort support if needed, assuming (key, direction) tuples
        if args:
            key_or_list = args[0]
            if isinstance(key_or_list, str):
                key = key_or_list
                direction = kwargs.get('direction', 1) # 1 for asc, -1 for desc
                reverse = direction == -1
                self.data.sort(key=lambda x: x.get(key), reverse=reverse)
            # Add more complex sort handling if needed
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
        pass # No-op for mock

class MockCollection:
    def __init__(self, name, data):
        self.name = name
        self.data = data
        
    def _matches_query(self, item, query):
        for k, v in query.items():
            if k not in item:
                # Unless checking for existence or null, missing key fails
                return False
            
            item_val = item[k]
            
            if isinstance(v, dict):
                # Handle operators
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
                    elif op == "$regex":
                        # Simple regex match
                        try:
                            if not re.search(op_val, str(item_val)): return False
                        except:
                            return False
            else:
                # Direct equality
                if item_val != v:
                    return False
        return True

    async def find_one(self, query, projection=None, sort=None, **kwargs):
        data_to_search = self.data
        if sort:
            # Basic sort support: sort=[("key", direction)]
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
            doc["_id"] = str(len(self.data) + 1)
        # Deep copy to simulate DB storage behavior (optional but good practice)
        self.data.append(doc)
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
            return type('obj', (object,), {'modified_count': 1, 'upserted_id': None})
        elif upsert:
            new_doc = query.copy()
            if "$set" in update:
                new_doc.update(update["$set"])
            if "$inc" in update:
                for k, v in update["$inc"].items():
                    new_doc[k] = v
            
            # Remove any query operators from new_doc keys
            keys_to_remove = [k for k in new_doc.keys() if k.startswith('$')]
            for k in keys_to_remove:
                del new_doc[k]
                
            res = await self.insert_one(new_doc)
            return type('obj', (object,), {'modified_count': 0, 'upserted_id': res.inserted_id})
            
        return type('obj', (object,), {'modified_count': 0, 'upserted_id': None})

class MockDatabase:
    def __init__(self):
        # Pre-seed with Admin User
        pin_hash = hashlib.sha256("1111".encode()).hexdigest()
        
        self.users = MockCollection("users", [{
            "id": "admin_user",
            "_id": "admin_user",
            "name": "Admin User",
            "role": "OWNER",
            "venue_id": "venue_1",
            "pin_hash": pin_hash,
            "allowed_venue_ids": ["venue_1"],
            "mfa_enabled": False
        }])
        
        self.venues = MockCollection("venues", [{
            "id": "venue_1",
            "_id": "venue_1",
            "name": "Malta Head Office",
            "type": "fine_dining",
            "slug": "malta-head-office",
            "location": "Valletta",
            "currency": "EUR"
        }])
        
        self.shifts = MockCollection("shifts", [])
        self.manager_overrides = MockCollection("manager_overrides", [])
        self.logs = MockCollection("logs", [])
        self.audit_logs = MockCollection("audit_logs", [])
        self.payroll_profiles = MockCollection("payroll_profiles", [])
        self.pay_runs = MockCollection("pay_runs", [])
        self.payroll_runs = MockCollection("payroll_runs", [])

    def __getattr__(self, name):
        col = MockCollection(name, [])
        setattr(self, name, col)
        return col

    def __getitem__(self, name):
        return getattr(self, name)
