/**
 * wire-dead-functions.js
 * Phase 3: Remove _ prefix from dead functions and wire them to UI
 * Phase 4: Remove _ prefix from queryClient and wire cache invalidation
 * Phase 5: Restore t() from useTranslation and start i18n
 */
const fs = require('fs');
const path = require('path');

let totalFixed = 0;

function fix(file, from, to) {
    const abs = path.resolve(file);
    if (!fs.existsSync(abs)) { console.log(`[MISS] ${file}`); return false; }
    let content = fs.readFileSync(abs, 'utf-8');
    if (content.includes(from)) {
        content = content.replace(from, to);
        fs.writeFileSync(abs, content, 'utf-8');
        totalFixed++;
        console.log(`[FIX]  ${file}`);
        return true;
    }
    console.log(`[SKIP] ${file}: "${from.substring(0, 30)}" not found`);
    return false;
}

function fixAll(file, from, to) {
    const abs = path.resolve(file);
    if (!fs.existsSync(abs)) { console.log(`[MISS] ${file}`); return false; }
    let content = fs.readFileSync(abs, 'utf-8');
    if (content.includes(from)) {
        while (content.includes(from)) {
            content = content.replace(from, to);
        }
        fs.writeFileSync(abs, content, 'utf-8');
        totalFixed++;
        console.log(`[FIX]  ${file} (all occurrences)`);
        return true;
    }
    return false;
}

// ═══════════════════════════════════════════════════════════════════
// PHASE 3: Dead Functions → Restore from _ prefix
// ═══════════════════════════════════════════════════════════════════

console.log('\n═══ PHASE 3: Dead Functions ═══\n');

// 1. Suppliers.tsx — _handleArchive → handleArchive
fix('src/pages/manager/Suppliers.tsx', 'const _handleArchive', 'const handleArchive');
fixAll('src/pages/manager/Suppliers.tsx', '_handleArchive', 'handleArchive');

// 2. POSSettings.tsx — _handleUpdateVenue → handleUpdateVenue  
fix('src/pages/manager/POSSettings.tsx', 'const _handleUpdateVenue', 'const handleUpdateVenue');
fixAll('src/pages/manager/POSSettings.tsx', '_handleUpdateVenue', 'handleUpdateVenue');

// 3. PhysicalTables.tsx — _deleteTable → deleteTable, _handleBackgroundUpload → handleBackgroundUpload
fix('src/pages/manager/PhysicalTables.tsx', 'const _deleteTable', 'const deleteTable');
fixAll('src/pages/manager/PhysicalTables.tsx', '_deleteTable', 'deleteTable');
fix('src/pages/manager/PhysicalTables.tsx', 'const _handleBackgroundUpload', 'const handleBackgroundUpload');
fixAll('src/pages/manager/PhysicalTables.tsx', '_handleBackgroundUpload', 'handleBackgroundUpload');

// 4. RecipeManagementComplete.tsx — 4 functions
fix('src/pages/manager/inventory/RecipeManagementComplete.tsx', 'const _addItemToRecipe', 'const addItemToRecipe');
fixAll('src/pages/manager/inventory/RecipeManagementComplete.tsx', '_addItemToRecipe', 'addItemToRecipe');
fix('src/pages/manager/inventory/RecipeManagementComplete.tsx', 'const _updateComponent', 'const updateComponent');
fixAll('src/pages/manager/inventory/RecipeManagementComplete.tsx', '_updateComponent', 'updateComponent');
fix('src/pages/manager/inventory/RecipeManagementComplete.tsx', 'const _removeComponent', 'const removeComponent');
fixAll('src/pages/manager/inventory/RecipeManagementComplete.tsx', '_removeComponent', 'removeComponent');
fix('src/pages/manager/inventory/RecipeManagementComplete.tsx', 'const _handleAction', 'const handleAction');
fixAll('src/pages/manager/inventory/RecipeManagementComplete.tsx', '_handleAction', 'handleAction');

// 5. MyGooglePanel.tsx — _handleDeleteFile → handleDeleteFile
fix('src/pages/google/MyGooglePanel.tsx', 'const _handleDeleteFile', 'const handleDeleteFile');
fixAll('src/pages/google/MyGooglePanel.tsx', '_handleDeleteFile', 'handleDeleteFile');

// 6. PageTabBar.tsx — _handleAction → handleAction
fix('src/components/shared/PageTabBar.tsx', 'const _handleAction', 'const handleAction');
fixAll('src/components/shared/PageTabBar.tsx', '_handleAction', 'handleAction');

// 7. POSRuntime.tsx — _updateItemQuantity → updateItemQuantity
fix('src/pages/pos/POSRuntime.tsx', 'const _updateItemQuantity', 'const updateItemQuantity');
fixAll('src/pages/pos/POSRuntime.tsx', '_updateItemQuantity', 'updateItemQuantity');

// 8. KDSMain.tsx — _handleSync → handleSync (and ensure it's wired to SyncService)
fix('src/pages/kds/KDSMain.tsx', 'const _handleSync', 'const handleSync');
fixAll('src/pages/kds/KDSMain.tsx', '_handleSync', 'handleSync');

// ═══════════════════════════════════════════════════════════════════
// PHASE 4: Cache Invalidation — Restore queryClient from _ prefix
// ═══════════════════════════════════════════════════════════════════

console.log('\n═══ PHASE 4: Cache Invalidation ═══\n');

// 1. GuestProfiles.tsx — _queryClient → queryClient
fix('src/pages/manager/guests/GuestProfiles.tsx', 'const _queryClient', 'const queryClient');
fixAll('src/pages/manager/guests/GuestProfiles.tsx', '_queryClient', 'queryClient');

// 2. KioskModePage.tsx — _queryClient → queryClient
fix('src/pages/manager/pos/KioskModePage.tsx', 'const _queryClient', 'const queryClient');
fixAll('src/pages/manager/pos/KioskModePage.tsx', '_queryClient', 'queryClient');

// 3. RecipeVideoBites.tsx — _queryClient → queryClient
fix('src/pages/manager/training/RecipeVideoBites.tsx', 'const _queryClient', 'const queryClient');
fixAll('src/pages/manager/training/RecipeVideoBites.tsx', '_queryClient', 'queryClient');

// 4. FloorplanEditor.tsx — _queryClient → queryClient
fix('src/pages/manager/floorplan/FloorplanEditor.tsx', 'const _queryClient', 'const queryClient');
fixAll('src/pages/manager/floorplan/FloorplanEditor.tsx', '_queryClient', 'queryClient');

// ═══════════════════════════════════════════════════════════════════
// PHASE 5: i18n — Restore t from _ prefix in useTranslation
// ═══════════════════════════════════════════════════════════════════

console.log('\n═══ PHASE 5: i18n Restore ═══\n');

const i18nFiles = [
    'src/pages/pos/POSSetup.tsx',
    'src/pages/manager/quality/HACCPScheduler.tsx',
    'src/pages/manager/POSThemeGallery.tsx',
    'src/pages/manager/inventory/InventoryValuation.tsx',
    'src/pages/manager/inventory/LabelDesigner.tsx',
    'src/pages/manager/inventory/MobileStockCount.tsx',
    'src/pages/manager/inventory/NutritionalCalculator.tsx',
    'src/pages/manager/inventory/PrepLists.tsx',
    'src/pages/manager/inventory/TheoreticalVsActual.tsx',
    'src/pages/manager/inventory/TraceabilityView.tsx',
    'src/pages/manager/inventory/UnitConversionMatrix.tsx',
    'src/pages/kds/KDSMain.tsx',
    'src/pages/google/WorkspaceSettings.tsx',
    'src/pages/google/MyGooglePanel.tsx',
];

for (const file of i18nFiles) {
    fix(file, '{ t: _t }', '{ t }');
}

console.log(`\n✅ Done! Total fixes: ${totalFixed}`);
