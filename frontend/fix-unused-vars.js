/**
 * Script to prefix unused variables with _ to suppress TS6133 warnings.
 * This handles the "intentionally unused" pattern where props are destructured
 * from a shared interface but not all are used by every component.
 */
const fs = require('fs');
const path = require('path');

// Map of file -> list of variable names to prefix with _
const fixes = {
    // ── POS Layout Express ──
    'src/components/pos/layouts/POSLayoutExpress.tsx': [
        // Props destructured from POSLayoutProps but intentionally unused in Express layout
        { var: 'user', line: 52 },
        { var: 'settings', line: 53 },
        { var: 'sendOptions', line: 53 },
        { var: 'sendInProgress', line: 53 },
        { var: 'floorPlan', line: 53 },
        { var: 'showTableDialog', line: 54 },
        { var: 'showPaymentDialog', line: 54 },
        { var: 'showFloorPlanDialog', line: 54 },
        { var: 'isKeyboardOpen', line: 55 },
        { var: 'onSendOrder', line: 57 },
        { var: 'onSetSendOptions', line: 58 },
        { var: 'onSetShowTableDialog', line: 58 },
        { var: 'onSetShowPaymentDialog', line: 58 },
        { var: 'onSetShowFloorPlanDialog', line: 59 },
        { var: 'onSetShowModifierDialog', line: 59 },
    ],
    // ── POS Layout Pro ──
    'src/components/pos/layouts/POSLayoutPro.tsx': [
        { var: 'isKeyboardOpen', line: 68 },
        { var: 'onSetShowModifierDialog', line: 72 },
    ],
    // ── POS Layout Restin ──
    'src/components/pos/layouts/POSLayoutRestin.tsx': [
        { var: 'isKeyboardOpen', line: 51 },
        { var: 'onSetShowModifierDialog', line: 55 },
    ],
    // ── TableMergeModal ──
    'src/components/pos/TableMergeModal.tsx': [
        { var: 'setTargetTable', line: 9, pattern: 'setTargetTable' },
    ],
    // ── UniversalSearchBar ──
    'src/components/search/UniversalSearchBar.tsx': [
        { var: 'payload', line: 59 },
    ],
    // ── DataList ──
    'src/components/shared/DataList.tsx': [
        { var: 'selectedIds', line: 88 },
        { var: 'onSelect', line: 89 },
    ],
    // ── DataTable ──
    'src/components/shared/DataTable.tsx': [
        { var: 'TValue', line: 76 },
    ],
    // ── GlobalSearch ──
    'src/components/shared/GlobalSearch.tsx': [
        { var: 'entityId', line: 157 },
    ],
    // ── PageTabBar ──
    'src/components/shared/PageTabBar.tsx': [
        { var: 'actions', line: 30 },
        { var: 'handleAction', line: 95 },
    ],
    // ── Login ──
    'src/features/auth/Login.tsx': [
        { var: 'googleBtnRef', line: 46 },
    ],
    // ── InventoryDashboard ──
    'src/features/inventory/InventoryDashboard.tsx': [
        { var: 'loading', line: 134 },
        { var: 'setCogsHistory', line: 150 },
        { var: 'showAccountingExport', line: 173 },
        { var: 'setShowAccountingExport', line: 173 },
        { var: 'setSalesInsights', line: 176 },
    ],
    // ── BuilderCanvas ──
    'src/features/pos/themes/builder/BuilderCanvas.tsx': [
        { var: 'onUpdateZoneWidth', line: 164 },
        { var: 'draggedZoneId', line: 167 },
    ],
    // ── CrmDashboard ──
    'src/features/restin/crm/CrmDashboard.tsx': [
        { var: 'GuestFilterSchema', line: 61 },
    ],
    // ── Ops index ──
    'src/features/restin/ops/index.ts': [
        { var: 'payload', line: 25 },
    ],
    // ── OpsDashboard ──
    'src/features/restin/ops/OpsDashboard.tsx': [
        { var: 'platformColors', line: 142 },
    ],
    // ── RadarDashboard ──
    'src/features/restin/radar/RadarDashboard.tsx': [
        { var: 'setRegion', line: 35 },
    ],
    // ── VoiceSettings ──
    'src/features/restin/voice/VoiceSettings.tsx': [
        { var: 'isLoading', line: 368 },
    ],
    // ── sync-engine ──
    'src/features/restin/web/sync-engine.ts': [
        { var: 'config', line: 23 },
    ],
    // ── use-toast ──
    'src/hooks/use-toast.ts': [
        { var: 'actionTypes', line: 8 },
    ],
    // ── useVoiceDictation ──
    'src/hooks/useVoiceDictation.tsx': [
        { var: 'currentUtterance', line: 70 },
    ],
    // ── NewTopBar ──
    'src/layouts/NewTopBar.tsx': [
        { var: 'location', line: 31 },
    ],
    // ── PageContainer ──
    'src/layouts/PageContainer.tsx': [
        { var: 'title', line: 26 },
        { var: 'description', line: 26 },
        { var: 'actions', line: 26 },
    ],
    // ── HiveDashboard ──
    'src/pages/collab/HiveDashboard.tsx': [
        { var: 'showScheduler', line: 146 },
        { var: 'setLastReadTimestamp', line: 165 },
        { var: 'isConnected', line: 217 },
        { var: 'sendScheduledMessage', line: 547 },
    ],
    // ── ErrorPage ──
    'src/pages/ErrorPage.tsx': [
        { var: 'resetError', line: 6 },
    ],
    // ── FinanceProviderSettings ──
    'src/pages/finance/FinanceProviderSettings.tsx': [
        { var: 'loading', line: 27 },
    ],
    // ── MyGooglePanel ──
    'src/pages/google/MyGooglePanel.tsx': [
        { var: 't', line: 139 },
        { var: 'handleDeleteFile', line: 420 },
    ],
    // ── WorkspaceSettings ──
    'src/pages/google/WorkspaceSettings.tsx': [
        { var: 't', line: 100 },
    ],
    // ── DeliveryAggregators ──
    'src/pages/integrations/DeliveryAggregators.tsx': [
        { var: 'loading', line: 25 },
        { var: 'k', line: 81 },
        { var: 'value', line: 81 },
    ],
    // ── IntegrationsHub ──
    'src/pages/integrations/IntegrationsHub.tsx': [
        { var: 'navigate', line: 182 },
        { var: 'loading', line: 184 },
    ],
    // ── RecipeManagementComplete ──
    'src/pages/inventory/RecipeManagementComplete.tsx': [
        { var: 'payload', line: 55 },
    ],
    // ── DeviceManagement ──
    'src/pages/kds/DeviceManagement.tsx': [
        { var: 'showPairingModal', line: 13 },
    ],
    // ── KDSMain ──
    'src/pages/kds/KDSMain.tsx': [
        { var: 's', line: 34 },
        { var: 'handleSync', line: 35 },
        { var: 'data', line: 35 },
        { var: 't', line: 45 },
        { var: 'user', line: 46 },
        { var: 'elapsed', line: 280 },
    ],
};

let totalFixes = 0;
let filesFixed = 0;

for (const [relPath, vars] of Object.entries(fixes)) {
    const absPath = path.resolve(__dirname, relPath);
    if (!fs.existsSync(absPath)) {
        console.log(`[SKIP] ${relPath} — file not found`);
        continue;
    }

    let content = fs.readFileSync(absPath, 'utf-8');
    let fixCount = 0;

    for (const { var: varName } of vars) {
        // Multiple strategies to find and prefix the variable
        // Strategy 1: Destructuring patterns like { varName, ... } or { varName }
        // We need to be careful to only match the variable name as a standalone word
        // and not as part of another word

        const patterns = [
            // const [varName, setVarName] = useState(...)
            new RegExp(`(\\[\\s*)${escapeRegex(varName)}(\\s*,)`, 'g'),
            // const [something, varName] = useState(...)
            new RegExp(`(,\\s*)${escapeRegex(varName)}(\\s*\\])`, 'g'),
            // const [something, varName, other] = ... (middle of array destructuring)
            new RegExp(`(,\\s*)${escapeRegex(varName)}(\\s*,)`, 'g'),
            // { varName, ... } in destructuring (followed by comma, space, or newline)
            new RegExp(`([{,]\\s*)\\b${escapeRegex(varName)}\\b(\\s*[,}])`, 'g'),
            // { ..., varName } at end of destructuring
            new RegExp(`(,\\s*)\\b${escapeRegex(varName)}\\b(\\s*})`, 'g'),
            // function parameter: (varName, ...) or (..., varName, ...)
            new RegExp(`([,(]\\s*)\\b${escapeRegex(varName)}\\b(\\s*[,)])`, 'g'),
            // const varName = ... (standalone variable declaration)
            new RegExp(`(const\\s+)\\b${escapeRegex(varName)}\\b(\\s*=)`, 'g'),
            // let varName = ...
            new RegExp(`(let\\s+)\\b${escapeRegex(varName)}\\b(\\s*=)`, 'g'),
            // Type parameter: <TValue>
            new RegExp(`(<)${escapeRegex(varName)}(>)`, 'g'),
            new RegExp(`(<)${escapeRegex(varName)}(,)`, 'g'),
            new RegExp(`(,\\s*)${escapeRegex(varName)}(>)`, 'g'),
            // aliased destructuring: loading: varName
            new RegExp(`(:\\s*)\\b${escapeRegex(varName)}\\b(\\s*[,}])`, 'g'),
        ];

        let fixed = false;
        for (const pattern of patterns) {
            const oldContent = content;
            content = content.replace(pattern, (match, prefix, suffix) => {
                // Don't double-prefix
                if (prefix.endsWith('_') || match.includes(`_${varName}`)) return match;
                return `${prefix}_${varName}${suffix}`;
            });
            if (content !== oldContent) {
                fixed = true;
                break;
            }
        }

        if (fixed) {
            fixCount++;
        } else {
            console.log(`[WARN] Could not fix ${varName} in ${relPath}`);
        }
    }

    if (fixCount > 0) {
        fs.writeFileSync(absPath, content, 'utf-8');
        console.log(`[OK] ${relPath} — ${fixCount} fixes`);
        totalFixes += fixCount;
        filesFixed++;
    }
}

console.log(`\nDone: ${totalFixes} variables prefixed across ${filesFixed} files`);

function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
