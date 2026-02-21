import re

# We will apply literal string replacements to fix these remaining TS errors.
replacements = [
    # 1-2. AuthContext.tsx
    (r"frontend/src/features/auth/AuthContext.tsx",
     r"setUser\(storedUser\);",
     r"setUser(storedUser as unknown as User);"),
     
    (r"frontend/src/features/auth/AuthContext.tsx",
     r"authStore\.setAuth\(authToken, userData\)",
     r"authStore.setAuth(authToken, userData as any)"),

    # 3. AccountingHub.tsx & FinanceDashboard.tsx Missing `dataEndpoint` in PermissionedTable
    (r"frontend/src/pages/manager/AccountingHub.tsx",
     r'tableKey="accounting_journal"\n',
     r'tableKey="accounting_journal"\n                dataEndpoint="/api/v1/accounting/journal"\n'),

    (r"frontend/src/pages/manager/FinanceDashboard.tsx",
     r'tableKey="finance_invoices"\n',
     r'tableKey="finance_invoices"\n                dataEndpoint="/api/v1/finance/invoices"\n'),
     
    (r"frontend/src/pages/manager/FinanceDashboard.tsx",
     r'tableKey="finance_expenses"\n',
     r'tableKey="finance_expenses"\n                dataEndpoint="/api/v1/finance/expenses"\n'),

    # 4. Dashboard.tsx - Empty object to string
    (r"frontend/src/pages/manager/Dashboard.tsx",
     r"venueAPI\.getOrders\(activeVenue\.id, \{\}, \{\}\)",
     r"venueAPI.getOrders(activeVenue.id, '', '')"),

    # 5. DoorsTab.tsx - Number instead of string
    (r"frontend/src/pages/manager/door-access/tabs/DoorsTab.tsx",
     r"parseInt\(code\)",
     r"code"),

    (r"frontend/src/pages/manager/door-access/tabs/DoorsTab.tsx",
     r"await accessControlAPI\.updateConfig\(door\.id, config, getVenueId\(\)\);",
     r"await accessControlAPI.updateConfig(door.id, config as any, getVenueId());"),

    # 6. POS UI Components `unknown` to `string` assignments.
    # The error comes from `(e.target.value as unknown)` or similar. Let's fix those by casting to string instead.
    (r"frontend/src/pages/pos/AllergenManager.tsx", r"as unknown\)", r"as string)"),
    (r"frontend/src/pages/pos/ComboMeals.tsx", r"as unknown\)", r"as string)"),
    (r"frontend/src/pages/pos/InventoryAlerts.tsx", r"as unknown\)", r"as string)"),
    (r"frontend/src/pages/pos/ItemLibrary.tsx", r"as unknown\)", r"as string)"),
    (r"frontend/src/pages/pos/POSUsersGroups.tsx", r"as unknown\)", r"as string)"),
    (r"frontend/src/pages/pos/ProductionCenters.tsx", r"as unknown\)", r"as string)"),
    
    # 7. iterators with `--downlevelIteration` (ServiceRegistry.ts, escpos.ts)
    # The easiest fix without modifying tsconfig is using `Array.from()`
    (r"frontend/src/platform/ServiceRegistry.ts",
     r"for \(const \[\_, service\] of this\.services\) \{",
     r"for (const [_, service] of Array.from(this.services.entries())) {"),

    (r"frontend/src/utils/escpos.ts",
     r"for \(const b of data\) \{",
     r"for (const b of Array.from(data)) {")
]

for filepath, search_str, replace_str in replacements:
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            content = f.read()
        
        new_content, count = re.subn(search_str, replace_str, content)
        if count > 0:
            with open(filepath, "w", encoding="utf-8") as f:
                f.write(new_content)
            print(f"Fixed {filepath}: {count} changes")
        else:
            print(f"FAILED TO MATCH: {filepath} for {search_str[:50]}...")
    except Exception as e:
        print(f"Error {filepath}: {e}")
