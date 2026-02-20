"""Apply the Express auto-send fix to POSMain.tsx"""
import re

filepath = r"c:\Users\arda\.gemini\antigravity\scratch\restin-ai\frontend\src\pages\pos\POSMain.tsx"

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

old = """  const handlePayment = async (method) => {\r\n    if (!currentOrder) {\r\n      toast.error("No active order");\r\n      return;\r\n    }"""

new = """  const handlePayment = async (method) => {\r\n    // Express auto-send: if items exist but no order yet, send first\r\n    if (!currentOrder && theme === 'express' && orderItems.length > 0) {\r\n      try {\r\n        await sendOrder();\r\n        const ordersRes = await venueAPI.getOrders(venueId, 'sent', selectedTable?.id || 'counter');\r\n        const latestOrder = ordersRes.data?.[0];\r\n        if (latestOrder) {\r\n          await orderAPI.close(latestOrder.id);\r\n          toast.success("Payment processed!");\r\n          setSelectedTable(null);\r\n          setCurrentOrder(null);\r\n          setOrderItems([]);\r\n          const tablesRes = await venueAPI.getTables(venueId);\r\n          setTables(tablesRes.data);\r\n          return;\r\n        }\r\n      } catch (error: any) {\r\n        console.error("Express auto-send failed:", error);\r\n        toast.error(error.response?.data?.detail || "Failed to process order");\r\n        return;\r\n      }\r\n    }\r\n    if (!currentOrder) {\r\n      toast.error("No active order");\r\n      return;\r\n    }"""

if old in content:
    content = content.replace(old, new)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print("SUCCESS - Applied Express auto-send fix")
else:
    print("NOT FOUND - Trying without \\r\\n")
    old2 = old.replace('\r\n', '\n')
    new2 = new.replace('\r\n', '\n') 
    if old2 in content:
        content = content.replace(old2, new2)
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print("SUCCESS (LF) - Applied Express auto-send fix")
    else:
        # Debug: show what we find around handlePayment
        idx = content.find('handlePayment')
        if idx >= 0:
            print(f"Found handlePayment at index {idx}")
            print(repr(content[idx:idx+200]))
        else:
            print("handlePayment not found at all!")
