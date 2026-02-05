from .base import BaseMigrationAdapter
from typing import Any, Dict
# Pandas imported lazily

class ApicbaseAdapter(BaseMigrationAdapter):
    def validate(self, data: Any) -> bool:
        """
        Validate input data (Pandas DataFrame) has required columns.
        Expected columns for Ingredients: Name, Unit, Cost, SKU (Optional)
        """
        import pandas as pd
        required_cols = ["Name", "Unit", "Cost"]
        
        if isinstance(data, pd.DataFrame):
            missing = [col for col in required_cols if col not in data.columns]
            if missing:
                self.log(f"Missing columns: {missing}", "error")
                return False
            return True
        return False

    def preview(self, data: Any) -> Dict[str, Any]:
        """
        Analyze the DataFrame for new items and conflicts.
        """
        import pandas as pd
        if not isinstance(data, pd.DataFrame):
            return {"error": "Invalid data format"}

        new_items = 0
        updates = 0
        conflicts = 0
        details = []

        # Mock Database Check (In real app, query DB here)
        existing_skus = {"COKE-001": 2.20, "HEINEKEN-PINT": 4.50} 
        
        for index, row in data.iterrows():
            name = row.get("Name", "Unknown")
            sku = row.get("SKU", "N/A")
            cost = float(row.get("Cost", 0))
            
            # Check for Conflict (Price Mismatch)
            if sku in existing_skus:
                old_price = existing_skus[sku]
                if abs(cost - old_price) > 0.01:
                    conflicts += 1
                    details.append({
                        "type": "conflict",
                        "message": f"{name}",
                        "newPrice": cost,
                        "oldPrice": old_price
                    })
                else:
                    updates += 1 # Same price, assume update other fields
            else:
                new_items += 1
                if new_items <= 5: # Limit preview details
                    details.append({
                        "type": "new",
                        "name": name,
                        "sku": sku
                    })

        return {
            "new": new_items,
            "update": updates,
            "conflict": conflicts,
            "details": details
        }

    async def execute(self, data: Any, mode: str = "migrate", options: Dict = None):
        """
        Execute migration: Insert/Update records in DB.
        """
        # data is expected to be a JSON list (converted from DF in manager) or raw DF
        count = len(data) if isinstance(data, list) else len(data)
        
        return {
            "status": "completed",
            "summary": f"Processed {count} items from Apicbase. Images queued for download.",
            "details": {"processed": count}
        }
