from .base import BaseMigrationAdapter
from typing import Any, Dict
import pandas as pd
import uuid
from datetime import datetime, timezone

class ShireburnAdapter(BaseMigrationAdapter):
    def validate(self, data: Any) -> bool:
        if not isinstance(data, pd.DataFrame):
            return False
        
        # Shireburn Exports (Employees)
        cols = [c.lower() for c in data.columns]
        required = ["code", "name", "surname"]
        if not any(r in cols for r in required):
            self.log(f"Missing required columns. Found: {cols}", "error")
            return False
        return True

    def preview(self, data: Any) -> Dict[str, Any]:
        if not isinstance(data, pd.DataFrame):
            return {"error": "Invalid data"}
            
        new_items = 0
        details = []
        
        # Normalize columns
        data.columns = data.columns.str.lower().str.strip()
        
        for index, row in data.iterrows():
            code = row.get("code") or row.get("emp code") or "Unknown"
            name = f"{row.get('name', '')} {row.get('surname', '')}".strip()
            
            new_items += 1
            if new_items <= 5:
                details.append({
                    "type": "new_employee",
                    "name": name,
                    "info": f"Code: {code}"
                })
                
        return {
            "type": "shireburn_hr",
            "new": new_items,
            "update": 0,
            "conflict": 0,
            "details": details,
            "summary": "Shireburn Indigo Employee Export Detected"
        }

    async def execute(self, data: Any, mode: str = "migrate", options: Dict = None):
        from core.database import get_database
        from services.id_service import ensure_ids
        db = get_database()
        
        if isinstance(data, pd.DataFrame):
            items = data.to_dict(orient="records")
        else:
            items = data
            
        processed = 0
        errors = 0
        
        for item in items:
            try:
                code = str(item.get("code") or item.get("emp code"))
                name = item.get("name") or "Unknown"
                surname = item.get("surname") or ""
                email = item.get("email") or f"{code}@placeholder.com"
                department = item.get("department") or "General"
                
                # Check if user exists
                existing = await db.users.find_one({"venue_id": self.venue_id, "external_links.id": code})
                if not existing:
                    # Create User
                     doc = {
                        "id": str(uuid.uuid4()),
                        "venue_id": self.venue_id,
                        "email": email,
                        "full_name": f"{name} {surname}".strip(),
                        "role": "staff", # Default
                        "active": True,
                        "pin_code": None, 
                        "external_links": {
                            "source": "shireburn",
                            "id": code,
                            "imported_at": datetime.now(timezone.utc).isoformat()
                        },
                        "hr_data": {
                            "department": department,
                            "job_title": item.get("designation", "Staff"),
                            "start_date": item.get("date_joined")
                        }
                    }
                     await db.users.insert_one(doc)
                
                processed += 1
            except Exception as e:
                print(f"Error shireburn item {item}: {e}")
                errors += 1
                
        return {
            "status": "completed",
            "summary": f"Processed {processed} Employees. {errors} errors.",
            "details": {"processed": processed, "errors": errors}
        }
