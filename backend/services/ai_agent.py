"""
Restin.ai Intelligence Engine
Rule-Based NLP for local-first "Ask Data" capabilities.
"""
from datetime import datetime
from core.database import db

class AIAgent:
    def __init__(self):
        self.name = "Restin AI"
    
    async def ask(self, venue_id: str, query: str) -> str:
        q = query.lower()
        
        # Intent: Sales / Revenue
        if "sales" in q or "revenue" in q or "how much" in q:
            return await self._get_sales_insight(venue_id)
            
        # Intent: Staff / Labor
        if "staff" in q or "working" in q or "who" in q:
            return await self._get_staff_insight(venue_id)
            
        # Intent: Inventory / Stock
        if "stock" in q or "inventory" in q or "low" in q:
            return await self._get_inventory_insight(venue_id)
            
        # Fallback
        return "I can help with Sales, Staffing, or Inventory. Try asking: 'How are sales today?'"

    async def _get_sales_insight(self, venue_id: str) -> str:
        # Mock aggregation (In real RAG, this would generate SQL)
        # pipeline = [ ... ]
        # result = await db.orders.aggregate(pipeline)
        
        sales = 1250.50
        orders = 42
        return f"💰 **Sales Update:**\nToday we've done **€{sales:.2f}** across {orders} orders.\nTrending **+12%** vs last week."

    async def _get_staff_insight(self, venue_id: str) -> str:
        return "👨‍🍳 **Team Status:**\n- **Kitchen:** Marco, Giovanni (Busy)\n- **Floor:** Sarah, Mike\n\nLabor Cost is currently **18%** (Optimal)."

    async def _get_inventory_insight(self, venue_id: str) -> str:
        return "⚠️ **Low Stock Alert:**\n- **Truffle Oil:** 2 Bottles left\n- **Wagyu Beef:** 1.5kg left\n\nI've drafted a PO for Supplier A."

ai_agent = AIAgent()
