"""Check pos_orders and pos_order_items collections"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def main():
    client = AsyncIOMotorClient('mongodb://localhost:27017')
    db = client['restin_v2']
    
    orders = await db.pos_orders.find({}, {"_id": 0}).sort("created_at", -1).to_list(5)
    print(f"POS_ORDERS: {len(orders)}")
    for o in orders:
        print(f"  id={o.get('id','?')[:16]}  status={o.get('status')}  table={o.get('table_id','?')}  type={o.get('order_type','?')}  display={o.get('display_id','?')}")
    
    items = await db.pos_order_items.find({}, {"_id": 0}).to_list(20)
    print(f"\nPOS_ORDER_ITEMS: {len(items)}")
    for i in items:
        print(f"  name={i.get('menu_item_name','?')}  state={i.get('state','?')}  order={i.get('order_id','?')[:12]}")
    
    client.close()

asyncio.run(main())
