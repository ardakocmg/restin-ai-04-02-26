import hashlib
from datetime import datetime, timezone
import asyncio

class MockCursor:
    def __init__(self, data):
        self.data = data
        
    def sort(self, *args, **kwargs):
        return self # No-op sort for mock
        
    async def to_list(self, length):
        if length is None:
            return self.data
        return self.data[:length]

    def limit(self, length):
        # Apply limit to data immediately or store for to_list? 
        # For simplicity, slice now
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
        
    async def find_one(self, query, projection=None):
        # Very basic query matching
        for item in self.data:
            match = True
            for k, v in query.items():
                if k not in item:
                    match = False
                    break
                if isinstance(v, dict):
                    # Handle basic $ operators if needed, or ignore for MVP
                    pass 
                elif item[k] != v:
                    match = False
                    break
            if match:
                return item
        return None
        
    def find(self, query, projection=None):
        results = []
        for item in self.data:
            match = True
            for k, v in query.items():
                if k not in item:
                    match = False
                    break
                if item[k] != v:
                    match = False
                    break
            if match:
                results.append(item)
        return MockCursor(results)
        
    async def insert_one(self, doc):
        doc["_id"] = str(len(self.data) + 1)
        self.data.append(doc)
        return type('obj', (object,), {'inserted_id': doc["_id"]})
        
    async def count_documents(self, query):
        count = 0
        for item in self.data:
            match = True
            for k, v in query.items():
                if k not in item:
                    # In mongo, if key missing, it doesn't match
                    match = False
                    break
                if isinstance(v, dict):
                    # Handle $gt, $lt etc if used
                    # Example: "timestamp": {"$gt": ...}
                    for op, val in v.items():
                        if op == "$gt" and not (item[k] > val): match = False
                        elif op == "$gte" and not (item[k] >= val): match = False
                        elif op == "$lt" and not (item[k] < val): match = False
                        elif op == "$lte" and not (item[k] <= val): match = False
                elif item[k] != v:
                    match = False
                    break
            if match:
                count += 1
        return count

    async def update_one(self, query, update, upsert=False, **kwargs):
        item = await self.find_one(query)
        if item:
            # Handle $set
            if "$set" in update:
                item.update(update["$set"])
            return type('obj', (object,), {'modified_count': 1, 'upserted_id': None})
        elif upsert:
            # Naive upsert
            new_doc = query.copy()
            if "$set" in update:
                new_doc.update(update["$set"])
            
            # Remove any query operators if present (simple cleanup)
            keys_to_remove = [k for k in new_doc.keys() if k.startswith('$')]
            for k in keys_to_remove:
                del new_doc[k]
                
            res = await self.insert_one(new_doc)
            return type('obj', (object,), {'modified_count': 0, 'upserted_id': res.inserted_id})
            
        return type('obj', (object,), {'modified_count': 0, 'upserted_id': None})

class MockDatabase:
    def __init__(self):
        # Pre-seed with Admin User
        # PIN 1111 hash (SHA256)
        # Using the same hash_pin logic: hashlib.sha256(pin.encode()).hexdigest()
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
            "currency": "EUR"
        }])
        
        self.shifts = MockCollection("shifts", [])
        self.manager_overrides = MockCollection("manager_overrides", [])
        self.logs = MockCollection("logs", [])
        self.audit_logs = MockCollection("audit_logs", [])
        self.payroll_profiles = MockCollection("payroll_profiles", [])
        self.pay_runs = MockCollection("pay_runs", [])

    def __getattr__(self, name):
        # __getattr__ is only called if attribute is not found in normal lookup
        col = MockCollection(name, [])
        setattr(self, name, col)
        return col
