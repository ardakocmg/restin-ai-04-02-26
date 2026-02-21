const fs = require('fs');

const fixes = [
    // [file, line, wrongName, rightAlias]
    // useTranslation: { _t } -> { t: _t }
    ['src/pages/manager/inventory/InventoryValuation.tsx', 123, '_t', 't'],
    ['src/pages/manager/inventory/LabelDesigner.tsx', 248, '_t', 't'],
    ['src/pages/manager/inventory/MobileStockCount.tsx', 56, '_t', 't'],
    ['src/pages/manager/inventory/NutritionalCalculator.tsx', 137, '_t', 't'],
    ['src/pages/manager/inventory/PrepLists.tsx', 129, '_t', 't'],
    ['src/pages/manager/inventory/TheoreticalVsActual.tsx', 91, '_t', 't'],
    ['src/pages/manager/inventory/TraceabilityView.tsx', 105, '_t', 't'],
    ['src/pages/manager/inventory/UnitConversionMatrix.tsx', 89, '_t', 't'],
    ['src/pages/manager/POSThemeGallery.tsx', 214, '_t', 't'],
    ['src/pages/manager/quality/HACCPScheduler.tsx', 104, '_t', 't'],
    ['src/pages/pos/POSSetup.tsx', 35, '_t', 't'],

    // useAuth: { _user } -> { user: _user }
    ['src/pages/manager/Operations.tsx', 17, '_user', 'user'],
    ['src/pages/manager/Printers.tsx', 78, '_user', 'user'],
    ['src/pages/manager/RolesPermissions.tsx', 495, '_user', 'user'],
    ['src/pages/manager/TipPresetsSettings.tsx', 33, '_user', 'user'],
    ['src/pages/pos/KDS1Screen.tsx', 177, '_user', 'user'],
    ['src/pages/pos/KDS2Screen.tsx', 306, '_user', 'user'],
    ['src/pages/pos/POSSetup.tsx', 36, '_user', 'user'],

    // useAuth: { _isManager, _isOwner }
    ['src/pages/manager/ReservationTimeline.tsx', 25, '_isManager', 'isManager'],
    ['src/pages/manager/ReservationTimeline.tsx', 25, '_isOwner', 'isOwner'],

    // useVenue: { _activeVenue }
    ['src/pages/manager/inventory/MealPlanning.tsx', 74, '_activeVenue', 'activeVenue'],

    // useAuditLog: { _logAction }
    ['src/pages/manager/UpdatesPage.tsx', 21, '_logAction', 'logAction'],

    // Interface Props
    ['src/pages/pos/ActionsPanel.tsx', 101, '_order', 'order'],
    ['src/pages/manager/sync/components/ProviderCard.tsx', 51, '_provider', 'provider'],

    // Destructured return: { _subtotal, _tax }
    ['src/pages/pos/POSRuntime.tsx', 465, '_subtotal', 'subtotal'],
    ['src/pages/pos/POSRuntime.tsx', 465, '_tax', 'tax'],
];

let fixed = 0;
const fileCache = {};

for (const [file, line, wrongName, rightName] of fixes) {
    if (!fileCache[file]) {
        if (!fs.existsSync(file)) { console.log('[MISS] ' + file); continue; }
        fileCache[file] = fs.readFileSync(file, 'utf-8').split('\n');
    }
    const lines = fileCache[file];
    const idx = line - 1;
    if (idx >= lines.length) { console.log('[OOB] ' + file + ':' + line); continue; }

    const oldLine = lines[idx];
    if (oldLine.includes(wrongName)) {
        // Replace wrongName with rightName: wrongName
        // But be careful not to double-alias
        const replacement = rightName + ': ' + wrongName;
        if (!oldLine.includes(replacement)) {
            const newLine = oldLine.replace(wrongName, replacement);
            if (newLine !== oldLine) {
                lines[idx] = newLine;
                fixed++;
                console.log('[FIX] ' + file + ':' + line + ' ' + wrongName + ' -> ' + replacement);
            }
        } else {
            console.log('[SKIP] ' + file + ':' + line + ' already correct');
        }
    } else {
        console.log('[SKIP] ' + file + ':' + line + ' ' + wrongName + ' not found');
    }
}

// Fix OfflineAPI.tsx references
if (!fileCache['src/services/OfflineAPI.tsx']) {
    fileCache['src/services/OfflineAPI.tsx'] = fs.readFileSync('src/services/OfflineAPI.tsx', 'utf-8').split('\n');
}
const oaLines = fileCache['src/services/OfflineAPI.tsx'];
for (let i = 0; i < oaLines.length; i++) {
    if (oaLines[i].includes('this.edgeAvailable') && !oaLines[i].includes('this._edgeAvailable')) {
        oaLines[i] = oaLines[i].replace(/this\.edgeAvailable/g, 'this._edgeAvailable');
        fixed++;
        console.log('[FIX] OfflineAPI.tsx:' + (i + 1) + ' this.edgeAvailable -> this._edgeAvailable');
    }
}

// Write all modified files
for (const [file, lines] of Object.entries(fileCache)) {
    fs.writeFileSync(file, lines.join('\n'), 'utf-8');
}

console.log('Done! Fixed: ' + fixed);
