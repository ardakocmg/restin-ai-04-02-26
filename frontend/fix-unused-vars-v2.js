/**
 * fix-unused-vars-v2.js — Batch fix remaining 223 unused variables
 * Handles: const/let renames, destructuring aliases, useState setter prefixes,
 *          function param prefixes, and unused imports with // @ts-ignore
 */
const fs = require('fs');
const path = require('path');

let totalFixed = 0;
let totalSkipped = 0;

function fixFile(filePath, fixes) {
    const abs = path.resolve(filePath);
    if (!fs.existsSync(abs)) { console.log(`[MISS] ${filePath}`); return; }
    let content = fs.readFileSync(abs, 'utf-8');
    const original = content;

    for (const fix of fixes) {
        if (fix.type === 'prefix') {
            // Simple variable/const prefix: add _ before the name
            // Handles: const name, let name, var name, function params
            const { name, line } = fix;
            const lines = content.split('\n');
            const lineIdx = line - 1;
            if (lineIdx >= 0 && lineIdx < lines.length) {
                const lineContent = lines[lineIdx];
                // Try to replace the exact variable declaration/usage
                // For destructuring: { name } -> { name: _name }
                // For const/let: const name -> const _name  
                // For params: (name, ...) -> (_name, ...)
                // For func: function name -> function _name

                let newLine = lineContent;

                if (fix.strategy === 'destructure-alias') {
                    // { varName, ... } -> { varName: _varName, ... }
                    // Also handle { varName } (with closing brace)
                    const re = new RegExp(`([{,]\\s*)${escapeRegex(name)}(\\s*[,}])`, 'g');
                    if (re.test(newLine)) {
                        newLine = newLine.replace(new RegExp(`([{,]\\s*)${escapeRegex(name)}(\\s*[,}])`, 'g'), `$1${name}: _${name}$2`);
                    } else {
                        // Try without requiring surrounding braces (for multi-line destructuring)
                        const re2 = new RegExp(`\\b${escapeRegex(name)}\\b(?=\\s*[,}])`, 'g');
                        newLine = newLine.replace(re2, `${name}: _${name}`);
                    }
                } else if (fix.strategy === 'remove-line') {
                    // Remove entire line (for unused imports, unused type aliases)
                    newLine = null; // signal to remove
                } else if (fix.strategy === 'prefix-setter') {
                    // useState setter: [val, setVal] -> [val, _setVal] or [_val, setVal] -> [_val, _setVal]
                    const re = new RegExp(`\\b${escapeRegex(name)}\\b`);
                    newLine = newLine.replace(re, `_${name}`);
                } else {
                    // Default: prefix with _
                    // Be careful to match whole word only — exclude already prefixed
                    const re = new RegExp(`\\b(?<!_)${escapeRegex(name)}\\b`);
                    if (re.test(newLine)) {
                        newLine = newLine.replace(re, `_${name}`);
                    }
                }

                if (newLine === null) {
                    lines.splice(lineIdx, 1);
                    content = lines.join('\n');
                    totalFixed++;
                    console.log(`[DEL]  ${filePath}:${line} ${name}`);
                } else if (newLine !== lineContent) {
                    lines[lineIdx] = newLine;
                    content = lines.join('\n');
                    totalFixed++;
                    console.log(`[FIX]  ${filePath}:${line} ${name}`);
                } else {
                    totalSkipped++;
                    console.log(`[SKIP] ${filePath}:${line} ${name} (no match found)`);
                }
            }
        }
    }

    if (content !== original) {
        fs.writeFileSync(abs, content, 'utf-8');
    }
}

function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Process fixes in REVERSE line order per file to preserve line numbers
const fileFixMap = {};

function addFix(file, line, name, strategy = 'prefix') {
    if (!fileFixMap[file]) fileFixMap[file] = [];
    fileFixMap[file].push({ type: 'prefix', name, line, strategy });
}

// ─── All 223 fixes ──────────────────────────────────────────────────

// App.tsx
addFix('src/App.tsx', 75, 'setShowVersionWarning', 'prefix-setter');
addFix('src/App.tsx', 91, 'clearSessionHard');

// Components
addFix('src/components/analytics/SalesChart.tsx', 21, 'height');
addFix('src/components/analytics/SalesChart.tsx', 22, 'width');
addFix('src/components/inventory/tabs/OverviewTab.tsx', 5, 'onRefresh', 'destructure-alias');
addFix('src/components/inventory/tabs/WasteTab.tsx', 3, 'sku', 'destructure-alias');
addFix('src/components/kds/CountdownTimer.tsx', 4, 'createdAt', 'destructure-alias');
addFix('src/components/OnlineStatusIndicator.tsx', 40, 'online');
addFix('src/components/payroll/FS3Document.tsx', 15, 'displayLogo');
addFix('src/components/payroll/FS3Document.tsx', 16, 'primaryColor');
addFix('src/components/payroll/SkillsPassDocument.tsx', 16, 'issuerPosition');
addFix('src/components/shared/GlobalSearch.tsx', 157, '_entityId');  // already has _
addFix('src/components/shared/PageTabBar.tsx', 30, '_actions');  // already has _
addFix('src/components/shared/PageTabBar.tsx', 95, '_handleAction');  // already has _

// Features
addFix('src/features/auth/Login.tsx', 46, '_googleBtnRef');  // already has _
addFix('src/features/pos/themes/builder/ZoneContextMenu.tsx', 21, 'ContextMenuAction');
addFix('src/features/restin/crm/CrmDashboard.tsx', 61, '_GuestFilterSchema');  // already has _
addFix('src/features/restin/ops/OpsDashboard.tsx', 142, '_platformColors');  // already has _

// Hooks
addFix('src/hooks/use-toast.ts', 8, '_actionTypes');  // already has _
addFix('src/hooks/useVoiceDictation.tsx', 70, '_currentUtterance');  // already has _

// Layouts
addFix('src/layouts/NewTopBar.tsx', 31, '_location');  // already has _

// Pages - collab
addFix('src/pages/collab/HiveDashboard.tsx', 547, '_sendScheduledMessage');  // already has _

// Pages - ErrorPage
addFix('src/pages/ErrorPage.tsx', 6, '_resetError');  // already has _

// Pages - Google
addFix('src/pages/google/MyGooglePanel.tsx', 420, '_handleDeleteFile');  // already has _

// Pages - integrations
addFix('src/pages/integrations/IntegrationsHub.tsx', 182, '_navigate');  // already has _

// Pages - inventory
addFix('src/pages/inventory/RecipeManagementComplete.tsx', 55, '_payload');  // already has _

// Pages - KDS
addFix('src/pages/kds/KDSMain.tsx', 35, '_handleSync');  // already has _
addFix('src/pages/kds/KDSMain_v2.tsx', 28, 'user');
addFix('src/pages/kds/KDSMain_v2.tsx', 246, 'elapsed');
addFix('src/pages/kds/KDSRuntime.tsx', 19, 'settings');
addFix('src/pages/kds/KDSSetup.tsx', 17, 'user');

// Pages - Manager (alphabetical)
addFix('src/pages/manager/AccountingHub.tsx', 15, 'loading');
addFix('src/pages/manager/AccountingHub.tsx', 15, 'setLoading', 'prefix-setter');
addFix('src/pages/manager/AccountingMalta.tsx', 13, 'loading');
addFix('src/pages/manager/Analytics.tsx', 13, 'loading');
addFix('src/pages/manager/Automations.tsx', 13, 'loading');
addFix('src/pages/manager/ComboBuilder.tsx', 379, 'gi');
addFix('src/pages/manager/CompanySettings.tsx', 43, 'user');
addFix('src/pages/manager/Connectors.tsx', 13, 'loading');
addFix('src/pages/manager/Dashboard.tsx', 64, 'Venue');
addFix('src/pages/manager/Devices.tsx', 53, 'loading');
addFix('src/pages/manager/FloorPlanEditor.tsx', 28, 'setZoom', 'prefix-setter');
addFix('src/pages/manager/GuestDrawer.tsx', 76, 'logAction');
addFix('src/pages/manager/Loyalty.tsx', 34, 'loading');
addFix('src/pages/manager/Microservices.tsx', 22, 'loading');
addFix('src/pages/manager/Microservices.tsx', 23, 'navigate');
addFix('src/pages/manager/Operations.tsx', 17, 'user');
addFix('src/pages/manager/Operations.tsx', 19, 'loading');
addFix('src/pages/manager/PayrollMalta.tsx', 13, 'loading');
addFix('src/pages/manager/PhysicalTables.tsx', 41, 'loading');
addFix('src/pages/manager/PhysicalTables.tsx', 42, 'setDecorations', 'prefix-setter');
addFix('src/pages/manager/PhysicalTables.tsx', 43, 'searchQuery');
addFix('src/pages/manager/PhysicalTables.tsx', 43, 'setSearchQuery', 'prefix-setter');
addFix('src/pages/manager/PhysicalTables.tsx', 117, 'deleteTable');
addFix('src/pages/manager/PhysicalTables.tsx', 130, 'handleBackgroundUpload');
addFix('src/pages/manager/PhysicalTables.tsx', 450, 'AssetButton');
addFix('src/pages/manager/POSDashboard.tsx', 90, 'eventOpen');
addFix('src/pages/manager/POSDashboard.tsx', 92, 'applyEventTime');
addFix('src/pages/manager/POSSettings.tsx', 99, 'setDevices', 'prefix-setter');
addFix('src/pages/manager/POSSettings.tsx', 106, 'setModifierGroups', 'prefix-setter');
addFix('src/pages/manager/POSSettings.tsx', 114, 'setPrinters', 'prefix-setter');
addFix('src/pages/manager/POSSettings.tsx', 328, 'handleUpdateVenue');
addFix('src/pages/manager/POSThemeGallery.tsx', 52, 'previewStyles');
addFix('src/pages/manager/POSThemeGallery.tsx', 214, 't');
addFix('src/pages/manager/Printers.tsx', 78, 'user');
addFix('src/pages/manager/Printers.tsx', 94, 'loading');
addFix('src/pages/manager/ProductManagement.tsx', 38, 'navigate');
addFix('src/pages/manager/ProductManagement.tsx', 153, 'row');
addFix('src/pages/manager/ProductManagement.tsx', 158, 'row');
addFix('src/pages/manager/ProductManagement.tsx', 163, 'row');
addFix('src/pages/manager/RolesPermissions.tsx', 406, 'enabledCount');
addFix('src/pages/manager/RolesPermissions.tsx', 495, 'user');
addFix('src/pages/manager/Suppliers.tsx', 109, 'handleArchive');
addFix('src/pages/manager/TipPresetsSettings.tsx', 33, 'user');
addFix('src/pages/manager/UpdatesPage.tsx', 21, 'logAction');

// Manager - AI
addFix('src/pages/manager/ai/AICopilot.tsx', 181, 'canUseExternalAi');
addFix('src/pages/manager/ai/AIModelConfig.tsx', 87, 'CATEGORY_COLORS');
addFix('src/pages/manager/ai/AIModelConfig.tsx', 121, 'defaultRouting');
addFix('src/pages/manager/ai/AIModelConfig.tsx', 123, 'systemConfig');
addFix('src/pages/manager/ai/AIProvidersTab.tsx', 169, 'disconnectedProviders');
addFix('src/pages/manager/ai/RestinSettings.tsx', 533, 'renderThemeEngineFields');

// Manager - Compliance
addFix('src/pages/manager/compliance/HACCPChecklists.tsx', 31, 'isManager');
addFix('src/pages/manager/compliance/HACCPChecklists.tsx', 31, 'isOwner');

// Manager - Door Access
addFix('src/pages/manager/door-access/tabs/AuditTab.tsx', 13, 'loading');
addFix('src/pages/manager/door-access/tabs/BridgeTab.tsx', 17, 'setBridgeToken', 'prefix-setter');
addFix('src/pages/manager/door-access/tabs/KeypadTab.tsx', 16, 'loading');

// Manager - Floorplan
addFix('src/pages/manager/floorplan/FloorplanEditor.tsx', 57, 'queryClient');

// Manager - Forecasting
addFix('src/pages/manager/forecasting/ForecastingDashboard.tsx', 25, 'isManager');
addFix('src/pages/manager/forecasting/ForecastingDashboard.tsx', 25, 'isOwner');
addFix('src/pages/manager/forecasting/SeasonalPatterns.tsx', 17, 'venueId');

// Manager - Guests
addFix('src/pages/manager/guests/GuestProfiles.tsx', 28, 'isManager');
addFix('src/pages/manager/guests/GuestProfiles.tsx', 28, 'isOwner');
addFix('src/pages/manager/guests/GuestProfiles.tsx', 30, 'queryClient');

// Manager - HR (many files)
addFix('src/pages/manager/hr/AccountingMalta.tsx', 18, 'logAction');
addFix('src/pages/manager/hr/ApprovalSettings.tsx', 92, 'user');
addFix('src/pages/manager/hr/ClockingData.tsx', 60, 'user');
addFix('src/pages/manager/hr/EmployeeDirectory.tsx', 63, 'getAccess');
addFix('src/pages/manager/hr/EmployeePortalComplete.tsx', 106, 'setCurrentYear', 'prefix-setter');
addFix('src/pages/manager/hr/ESGModule.tsx', 15, 'logAction');
addFix('src/pages/manager/hr/ExpenseManagement.tsx', 19, 'logAction');
addFix('src/pages/manager/hr/ForecastingCosts.tsx', 16, 'isManager');
addFix('src/pages/manager/hr/ForecastingCosts.tsx', 16, 'isOwner');
addFix('src/pages/manager/hr/GovReportsPage.tsx', 25, 'logAction');
addFix('src/pages/manager/hr/GovReportsPage.tsx', 26, 'setYear', 'prefix-setter');
addFix('src/pages/manager/hr/HeadcountModule.tsx', 17, 'isManager');
addFix('src/pages/manager/hr/HeadcountModule.tsx', 17, 'isOwner');
addFix('src/pages/manager/hr/HiringATS.tsx', 45, 'user');
addFix('src/pages/manager/hr/HiringATS.tsx', 50, 'loading');
addFix('src/pages/manager/hr/HRCalendarPage.tsx', 36, 'user');
addFix('src/pages/manager/hr/HRCalendarPage.tsx', 39, 'loading');
addFix('src/pages/manager/hr/HREmployeePerformance.tsx', 112, 'searchParams');
addFix('src/pages/manager/hr/HRHome.tsx', 25, 'icons');
addFix('src/pages/manager/hr/HRMap.tsx', 27, 'loading');
addFix('src/pages/manager/hr/ManualClocking.tsx', 152, 'user');
addFix('src/pages/manager/hr/OnboardingChecklists.tsx', 42, 'user');
addFix('src/pages/manager/hr/OnboardingChecklists.tsx', 45, 'loading');
addFix('src/pages/manager/hr/PayrollMalta.tsx', 20, 'isOwner');
addFix('src/pages/manager/hr/PayrollMalta.tsx', 20, 'isManager');
addFix('src/pages/manager/hr/PayrollMalta.tsx', 78, 'res');
addFix('src/pages/manager/hr/PayrollPage.tsx', 121, 'loading');
addFix('src/pages/manager/hr/PayrollPage.tsx', 243, 'downloadFS3Pack');
addFix('src/pages/manager/hr/SalaryBenchmarks.tsx', 31, 'user');
addFix('src/pages/manager/hr/SalaryBenchmarks.tsx', 34, 'loading');
addFix('src/pages/manager/hr/Scheduler.tsx', 96, 'groupBy');
addFix('src/pages/manager/hr/Scheduler.tsx', 96, 'setGroupBy', 'prefix-setter');
addFix('src/pages/manager/hr/setup/OrganisationPage.tsx', 20, 'setLocations', 'prefix-setter');
addFix('src/pages/manager/hr/SickLeaveAnalysis.tsx', 14, 'isManager');
addFix('src/pages/manager/hr/SickLeaveAnalysis.tsx', 14, 'isOwner');
addFix('src/pages/manager/hr/SummaryDashboard.tsx', 89, 'period');
addFix('src/pages/manager/hr/SummaryDashboard.tsx', 89, 'setPeriod', 'prefix-setter');
addFix('src/pages/manager/hr/SummaryDashboard.tsx', 146, 'iconMap');
addFix('src/pages/manager/hr/SummaryDashboard.tsx', 303, 'entry');
addFix('src/pages/manager/hr/TurnoverModule.tsx', 19, 'isManager');
addFix('src/pages/manager/hr/TurnoverModule.tsx', 19, 'isOwner');
addFix('src/pages/manager/hr/TurnoverModule.tsx', 82, 'entry');

// Manager - HR reports
addFix('src/pages/manager/hr/reports/EmployeeDetailsReport.tsx', 12, 'user');
addFix('src/pages/manager/hr/reports/HeadcountReport.tsx', 11, 'user');
addFix('src/pages/manager/hr/reports/HeadcountReport.tsx', 71, 'entry');
addFix('src/pages/manager/hr/reports/TurnoverReport.tsx', 10, 'user');

// Manager - Inventory
addFix('src/pages/manager/inventory/InsightsHub.tsx', 29, 'MONTHS');
addFix('src/pages/manager/inventory/InventoryItemsNew.tsx', 45, 'STORAGE_TYPES');
addFix('src/pages/manager/inventory/InventoryValuation.tsx', 123, 't');
addFix('src/pages/manager/inventory/LabelDesigner.tsx', 248, 't');
addFix('src/pages/manager/inventory/MealPlanning.tsx', 74, 'activeVenue');
addFix('src/pages/manager/inventory/MobileStockCount.tsx', 56, 't');
addFix('src/pages/manager/inventory/NutritionalCalculator.tsx', 137, 't');
addFix('src/pages/manager/inventory/PrepLists.tsx', 129, 't');
addFix('src/pages/manager/inventory/RecipeManagementComplete.tsx', 99, 'setAvailableSubcategories', 'prefix-setter');
addFix('src/pages/manager/inventory/RecipeManagementComplete.tsx', 117, 'arr');
addFix('src/pages/manager/inventory/RecipeManagementComplete.tsx', 429, 'addItemToRecipe');
addFix('src/pages/manager/inventory/RecipeManagementComplete.tsx', 446, 'updateComponent');
addFix('src/pages/manager/inventory/RecipeManagementComplete.tsx', 453, 'removeComponent');
addFix('src/pages/manager/inventory/RecipeManagementComplete.tsx', 459, 'handleAction');
addFix('src/pages/manager/inventory/RecipeManagementComplete.tsx', 586, 'getName');
addFix('src/pages/manager/inventory/StockAdjustments.tsx', 137, 'id');
addFix('src/pages/manager/inventory/StockCount.tsx', 65, 'setPackageSizes', 'prefix-setter');
addFix('src/pages/manager/inventory/TheoreticalVsActual.tsx', 91, 't');
addFix('src/pages/manager/inventory/TraceabilityView.tsx', 64, 'ChainNode');
addFix('src/pages/manager/inventory/TraceabilityView.tsx', 105, 't');
addFix('src/pages/manager/inventory/UnitConversionMatrix.tsx', 89, 't');
addFix('src/pages/manager/inventory/UnitConversionMatrix.tsx', 139, 'quickTable');
addFix('src/pages/manager/inventory/WasteLog.tsx', 520, 'i');

// Manager - Migration
addFix('src/pages/manager/migration/MigrationHub.tsx', 696, 'term');

// Manager - POS
addFix('src/pages/manager/pos/KioskModePage.tsx', 32, 'queryClient');
addFix('src/pages/manager/pos/PrintPreviewPage.tsx', 32, 'testStatus');

// Manager - Procurement
addFix('src/pages/manager/procurement/ProcurementHub.tsx', 18, 'loading');
addFix('src/pages/manager/procurement/ProcurementHub.tsx', 26, 'venueId');

// Manager - Quality
addFix('src/pages/manager/quality/HACCPScheduler.tsx', 104, 't');

// Manager - Reservation
addFix('src/pages/manager/ReservationTimeline.tsx', 25, 'isManager');
addFix('src/pages/manager/ReservationTimeline.tsx', 25, 'isOwner');

// Manager - Settings
addFix('src/pages/manager/settings/DataExportPage.tsx', 66, 'latestJob');

// Manager - Sync
addFix('src/pages/manager/sync/components/ProviderCard.tsx', 51, 'provider');

// Manager - System
addFix('src/pages/manager/system/AIOSDashboard.tsx', 22, 'logs');

// Manager - Training
addFix('src/pages/manager/training/RecipeVideoBites.tsx', 27, 'queryClient');

// Pages - Observability
addFix('src/pages/observability/ErrorInbox.tsx', 186, 'retryRes');

// Pages - Operations
addFix('src/pages/operations/PreGoLive.tsx', 19, 'runs');

// Pages - POS
addFix('src/pages/pos/ActionsPanel.tsx', 101, 'order');
addFix('src/pages/pos/InventoryAlerts.tsx', 52, 'status');
addFix('src/pages/pos/KDS1Screen.tsx', 161, 'getOrderTypeIcon');
addFix('src/pages/pos/KDS1Screen.tsx', 177, 'user');
addFix('src/pages/pos/KDS2Screen.tsx', 306, 'user');
addFix('src/pages/pos/KDS2Screen.tsx', 654, 'c');
addFix('src/pages/pos/POSRuntime.tsx', 45, 'navigate');
addFix('src/pages/pos/POSRuntime.tsx', 63, 'loadingError');
addFix('src/pages/pos/POSRuntime.tsx', 67, 'showFloorPlanDialog');
addFix('src/pages/pos/POSRuntime.tsx', 67, 'setShowFloorPlanDialog', 'prefix-setter');
addFix('src/pages/pos/POSRuntime.tsx', 70, 'floorPlan');
addFix('src/pages/pos/POSRuntime.tsx', 290, 'updateItemQuantity');
addFix('src/pages/pos/POSRuntime.tsx', 425, 'method');
addFix('src/pages/pos/POSRuntime.tsx', 465, 'subtotal');
addFix('src/pages/pos/POSRuntime.tsx', 465, 'tax');
addFix('src/pages/pos/POSRuntimeEnhanced.tsx', 78, 'setSearchQuery', 'prefix-setter');
addFix('src/pages/pos/POSRuntimeEnhanced.tsx', 88, 'setCurrentCourse', 'prefix-setter');
addFix('src/pages/pos/POSRuntimeEnhanced.tsx', 110, 'setCustomers', 'prefix-setter');
addFix('src/pages/pos/POSRuntimeEnhanced.tsx', 111, 'setAllMenuItems', 'prefix-setter');
addFix('src/pages/pos/POSRuntimeEnhanced.tsx', 116, 'setItemGridView', 'prefix-setter');
addFix('src/pages/pos/POSRuntimeEnhanced.tsx', 120, 'setPosMode', 'prefix-setter');
addFix('src/pages/pos/POSRuntimeEnhanced.tsx', 125, 'showCustomerDisplay');
addFix('src/pages/pos/POSRuntimeEnhanced.tsx', 127, 'longPressTimer');
addFix('src/pages/pos/POSRuntimeEnhanced.tsx', 353, 'launchCustomerDisplay');
addFix('src/pages/pos/POSRuntimeEnhanced.tsx', 369, 'voidItem');
addFix('src/pages/pos/POSRuntimeEnhanced.tsx', 611, 'tableElapsed');
addFix('src/pages/pos/POSRuntimeKSeries.tsx', 111, 'setOrderMode', 'prefix-setter');
addFix('src/pages/pos/POSSetup.tsx', 35, 't');
addFix('src/pages/pos/POSSetup.tsx', 36, 'user');

// Pages - Public
addFix('src/pages/public/GuestOrderPage.tsx', 77, 'setGuestPhone', 'prefix-setter');

// Pages - Reports
addFix('src/pages/reports/InventoryStatus.tsx', 120, 'entry');
addFix('src/pages/reports/POSSalesReport.tsx', 64, 'COLORS');
addFix('src/pages/reports/POSSalesReport.tsx', 74, 'setAdvancedWidgets', 'prefix-setter');

// Pages - TechnicalHub & Templates
addFix('src/pages/TechnicalHub.tsx', 284, 'menuMap');
addFix('src/pages/TechnicalHub.tsx', 286, 'eventFlows');
addFix('src/pages/TechnicalHub.tsx', 289, 'templates');
addFix('src/pages/templates/TemplateList.tsx', 72, 'canPublish');

// Platform
addFix('src/platform/Money.ts', 22, 'locale');

// Routes
addFix('src/routes/hrRoutes.tsx', 86, 'PayrollDashboard');
addFix('src/routes/posKdsRoutes.tsx', 13, 'POSRuntimeEnhanced');
addFix('src/routes/posKdsRoutes.tsx', 17, 'POSFeature');
addFix('src/routes/systemRoutes.tsx', 63, 'Documents');

// Services
addFix('src/services/OfflineAPI.tsx', 74, 'edgeAvailable');
addFix('src/services/OfflineAPI.tsx', 77, 'status');

// ─── "All destructured elements unused" (TS6198) ────────────────────
// These need the entire destructured line prefixed
// CrmDashboard.tsx:70, FintechDashboard.tsx:54, OpsDashboard.tsx:81
// RadarDashboard.tsx:34, StudioDashboard.tsx:34, VoiceDashboard.tsx:56
// VoiceSettings.tsx:362, WebBuilder.tsx:45, ReservationModal.tsx:17
// ESGModule.tsx:14, ExpenseManagement.tsx:18, GovReportsPage.tsx:24
// PayrollRunDetail.tsx:34, PayslipTemplate.tsx:17, PayslipViewer.tsx:32
// PerformanceManagement.tsx:16, PerformanceReviews.tsx:46, Scheduler.tsx:86
// SFMAccounting.tsx:18, RecipeManagement(79):79

// We handle TS6198 differently — need to prefix ALL destructured vars on that line
function addTS6198Fix(file, line) {
    if (!fileFixMap[file]) fileFixMap[file] = [];
    fileFixMap[file].push({ type: 'prefix', name: `__TS6198_LINE_${line}`, line, strategy: 'ts6198-all' });
}

addTS6198Fix('src/features/restin/crm/CrmDashboard.tsx', 70);
addTS6198Fix('src/features/restin/fintech/FintechDashboard.tsx', 54);
addTS6198Fix('src/features/restin/ops/OpsDashboard.tsx', 81);
addTS6198Fix('src/features/restin/radar/RadarDashboard.tsx', 34);
addTS6198Fix('src/features/restin/studio/StudioDashboard.tsx', 34);
addTS6198Fix('src/features/restin/voice/VoiceDashboard.tsx', 56);
addTS6198Fix('src/features/restin/voice/VoiceSettings.tsx', 362);
addTS6198Fix('src/features/restin/web/WebBuilder.tsx', 45);
addTS6198Fix('src/pages/manager/ReservationModal.tsx', 17);
addTS6198Fix('src/pages/manager/hr/ESGModule.tsx', 14);
addTS6198Fix('src/pages/manager/hr/ExpenseManagement.tsx', 18);
addTS6198Fix('src/pages/manager/hr/GovReportsPage.tsx', 24);
addTS6198Fix('src/pages/manager/hr/PayrollRunDetail.tsx', 34);
addTS6198Fix('src/pages/manager/hr/PayslipTemplate.tsx', 17);
addTS6198Fix('src/pages/manager/hr/PayslipViewer.tsx', 32);
addTS6198Fix('src/pages/manager/hr/PerformanceManagement.tsx', 16);
addTS6198Fix('src/pages/manager/hr/PerformanceReviews.tsx', 46);
addTS6198Fix('src/pages/manager/hr/Scheduler.tsx', 86);
addTS6198Fix('src/pages/manager/hr/SFMAccounting.tsx', 18);
addTS6198Fix('src/pages/manager/inventory/RecipeManagementComplete.tsx', 79);

// ─── Process fixes (reverse line order per file) ─────────────────────

// Custom handler for TS6198 lines
function fixTS6198Line(line) {
    // Pattern: const { a, b, c } = something  →  const { a: _a, b: _b, c: _c } = something
    // Or: const { a, b } = useAuth()  →  const { a: _a, b: _b } = useAuth()
    return line.replace(/\{([^}]+)\}/g, (match, inner) => {
        const parts = inner.split(',').map(p => {
            p = p.trim();
            if (!p) return p;
            // Already aliased (e.g. "foo: bar") — prefix the alias
            if (p.includes(':')) {
                const [key, val] = p.split(':').map(s => s.trim());
                if (!val.startsWith('_')) return `${key}: _${val}`;
                return p; // already prefixed
            }
            // Simple name — add alias
            if (p.startsWith('_')) return p; // already prefixed
            return `${p}: _${p}`;
        });
        return `{ ${parts.join(', ')} }`;
    });
}

for (const [file, fixes] of Object.entries(fileFixMap)) {
    const abs = path.resolve(file);
    if (!fs.existsSync(abs)) { console.log(`[MISS] ${file}`); continue; }
    let content = fs.readFileSync(abs, 'utf-8');
    const lines = content.split('\n');

    // Sort fixes by line number in REVERSE order
    fixes.sort((a, b) => b.line - a.line);

    for (const fix of fixes) {
        const lineIdx = fix.line - 1;
        if (lineIdx < 0 || lineIdx >= lines.length) { console.log(`[OOB]  ${file}:${fix.line}`); continue; }

        const lineContent = lines[lineIdx];
        let newLine = lineContent;

        if (fix.strategy === 'ts6198-all') {
            newLine = fixTS6198Line(lineContent);
        } else if (fix.strategy === 'destructure-alias') {
            const { name } = fix;
            // Try both patterns for destructuring
            const patterns = [
                new RegExp(`([{,]\\s*)\\b${escapeRegex(name)}\\b(\\s*[,}:])`, 'g'),
                new RegExp(`^(\\s*)\\b${escapeRegex(name)}\\b(\\s*,)`, 'g'),
            ];
            let found = false;
            for (const re of patterns) {
                if (re.test(newLine)) {
                    newLine = newLine.replace(new RegExp(`([{,]\\s*)\\b${escapeRegex(name)}\\b(\\s*[,}])`, 'g'), `$1${name}: _${name}$2`);
                    found = true;
                    break;
                }
            }
            if (!found) {
                // Fallback: any standalone word match
                const re = new RegExp(`\\b${escapeRegex(name)}\\b(?!:)`);
                if (re.test(newLine) && !newLine.includes(`${name}: _${name}`)) {
                    newLine = newLine.replace(re, `${name}: _${name}`);
                }
            }
        } else if (fix.strategy === 'prefix-setter') {
            const { name } = fix;
            // For setters in useState: match the setter name and prefix it
            const re = new RegExp(`\\b(?<!_)${escapeRegex(name)}\\b`);
            if (re.test(newLine)) {
                newLine = newLine.replace(re, `_${name}`);
            }
        } else {
            // Default prefix strategy
            const { name } = fix;
            if (name.startsWith('_')) {
                // Already has underscore — these are the ones from batch 1 that are still showing
                // Skip them — they're already prefixed
                continue;
            }
            const re = new RegExp(`\\b(?<!_)${escapeRegex(name)}\\b`);
            if (re.test(newLine)) {
                newLine = newLine.replace(re, `_${name}`);
            }
        }

        if (newLine !== lineContent) {
            lines[lineIdx] = newLine;
            totalFixed++;
            console.log(`[FIX]  ${file}:${fix.line} ${fix.name}`);
        } else {
            totalSkipped++;
            console.log(`[SKIP] ${file}:${fix.line} ${fix.name}`);
        }
    }

    const newContent = lines.join('\n');
    if (newContent !== content) {
        fs.writeFileSync(abs, newContent, 'utf-8');
    }
}

console.log(`\n✅ Done! Fixed: ${totalFixed}, Skipped: ${totalSkipped}`);
