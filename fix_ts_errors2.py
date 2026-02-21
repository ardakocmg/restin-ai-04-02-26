import os
import re

frontend_dir = r"c:\Users\arda\.gemini\antigravity\scratch\restin-ai\frontend\src"

def file_replace(filepath, find, replace):
    path = os.path.join(frontend_dir, filepath)
    if not os.path.exists(path):
        return
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()
    new_content = content.replace(find, replace)
    if new_content != content:
        with open(path, "w", encoding="utf-8") as f:
            f.write(new_content)
        print(f"Fixed {filepath}")

def regex_replace(filepath, pattern, replace):
    path = os.path.join(frontend_dir, filepath)
    if not os.path.exists(path):
        return
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()
    new_content = re.sub(pattern, replace, content)
    if new_content != content:
        with open(path, "w", encoding="utf-8") as f:
            f.write(new_content)
        print(f"Regex Fixed {filepath}")

# venue_id -> venueId
for p in [
    r"pages\inventory\ProductionManagementComplete.tsx",
    r"pages\inventory\RecipeManagementComplete.tsx",
    r"pages\inventory\StockTransfersComplete.tsx"
]:
    file_replace(p, "user?.venue_id", "user?.venueId")
    file_replace(p, "user.venue_id", "user.venueId")

# WasteLog.tsx: Add notes to state
file_replace(r"pages\inventory\WasteLog.tsx", "{ item_id: '', qty: '', reason: '' }", "{ item_id: '', qty: '', reason: '', notes: '' }")

# CountdownTimer date math
file_replace(r"pages\kds\KDSMain.tsx", "const target = new Date(order.target_time);", "const target = new Date(order.target_time).getTime();")
file_replace(r"pages\kds\KDSMain.tsx", "const now = new Date();", "const now = new Date().getTime();")
file_replace(r"pages\kds\KDSMain_v2.tsx", "const target = new Date(order.target_time);", "const target = new Date(order.target_time).getTime();")
file_replace(r"pages\kds\KDSMain_v2.tsx", "const now = new Date();", "const now = new Date().getTime();")
file_replace(r"pages\observability\AdvancedObservability.tsx", "Math.floor((new Date() - new Date(req.timestamp)) / 1000)", "Math.floor((new Date().getTime() - new Date(req.timestamp).getTime()) / 1000)")

# EmploymentDatesReport.tsx Date math
file_replace(r"pages\manager\hr\reports\EmploymentDatesReport.tsx", "const duration = today - startDate;", "const duration = today.getTime() - startDate.getTime();")

# LoadingScreen / LoadingSpinner missing className
file_replace(r"pages\reports\InventoryReport.tsx", "<LoadingSpinner fullScreen text=\"Loading inventory data...\" />", "<LoadingSpinner fullScreen text=\"Loading inventory data...\" className=\"\" />")
file_replace(r"pages\reports\KDSPerformanceReport.tsx", "<LoadingSpinner fullScreen text=\"Loading KDS data...\" />", "<LoadingSpinner fullScreen text=\"Loading KDS data...\" className=\"\" />")

# TurnoverReport turnoverRate
file_replace(r"pages\manager\hr\reports\TurnoverReport.tsx", "{ joined: 0, left: 0 }", "{ joined: 0, left: 0, turnoverRate: 0 }")

# AppEvents log -> info
file_replace(r"platform\AppEvents.ts", "logger.log", "logger.info")

# AuthStore.ts adding properties
auth_store_path = os.path.join(frontend_dir, r"lib\AuthStore.ts")
if os.path.exists(auth_store_path):
    with open(auth_store_path, "r", encoding="utf-8") as f:
        auth_store = f.read()
    if "private TOKEN_KEY" not in auth_store:
        auth_store = auth_store.replace("class AuthStore {", "class AuthStore {\n  private TOKEN_KEY = 'auth_token';\n  private USER_KEY = 'auth_user';\n  private API_HOST_KEY = 'api_host';\n  private listeners = new Set<Function>();")
        with open(auth_store_path, "w", encoding="utf-8") as f:
            f.write(auth_store)
        print("Fixed AuthStore.ts")

# ServiceRegistry.ts adding properties
service_registry_path = os.path.join(frontend_dir, r"platform\ServiceRegistry.ts")
if os.path.exists(service_registry_path):
    with open(service_registry_path, "r", encoding="utf-8") as f:
        registry = f.read()
    if "private services" not in registry:
        registry = registry.replace("class ServiceRegistry {", "class ServiceRegistry {\n  private services: Map<string, any> = new Map();\n  private initialized: boolean = false;")
        with open(service_registry_path, "w", encoding="utf-8") as f:
            f.write(registry)
        print("Fixed ServiceRegistry.ts")

# PayrollMalta venue_id axios
file_replace(r"pages\manager\hr\PayrollMalta.tsx", "venue_id: user?.venueId", "params: { venue_id: user?.venueId }")

# BookingWidget parameter
file_replace(r"pages\public\booking\BookingWidget.tsx", "setGuests(Number(value))", "setGuests(Number(value))") # Already correct maybe type mismatch with string
# Wait, it complains `Argument of type 'number' is not assignable to parameter of type 'string'` line 113. 
# And line 57, 79. I will handle it manually.

print("TS fixes 2 done.")
