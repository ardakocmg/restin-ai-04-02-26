const fs = require('fs');
const path = require('path');
let n = 0;

// i18n wiring — titles use PageContainer title="..." prop format
const files = {
    'src/pages/manager/inventory/InventoryValuation.tsx': ['title="Inventory Valuation"', 'title={t("inventory.valuation.title", "Inventory Valuation")}'],
    'src/pages/manager/inventory/MobileStockCount.tsx': ['title="Mobile Stock Count"', 'title={t("inventory.stockCount.title", "Mobile Stock Count")}'],
    'src/pages/manager/inventory/PrepLists.tsx': ['title="Prep Lists"', 'title={t("inventory.prepLists.title", "Prep Lists")}'],
    'src/pages/manager/inventory/TraceabilityView.tsx': ['title="Traceability"', 'title={t("inventory.traceability.title", "Traceability")}'],
    'src/pages/manager/inventory/NutritionalCalculator.tsx': ['title="Nutritional Calculator"', 'title={t("inventory.nutritional.title", "Nutritional Calculator")}'],
    'src/pages/manager/inventory/UnitConversionMatrix.tsx': ['title="Unit Conversion Matrix"', 'title={t("inventory.unitConversion.title", "Unit Conversion Matrix")}'],
    'src/pages/manager/inventory/LabelDesigner.tsx': ['title="Label Designer"', 'title={t("inventory.labelDesigner.title", "Label Designer")}'],
    'src/pages/manager/quality/HACCPScheduler.tsx': ['title="HACCP Scheduler"', 'title={t("quality.haccpScheduler.title", "HACCP Scheduler")}'],
    'src/pages/manager/POSThemeGallery.tsx': ['title="POS Theme Gallery"', 'title={t("pos.themeGallery.title", "POS Theme Gallery")}'],
    'src/pages/google/WorkspaceSettings.tsx': ['title="Workspace Settings"', 'title={t("google.workspaceSettings.title", "Workspace Settings")}'],
    'src/pages/manager/inventory/TheoreticalVsActual.tsx': ['title="Theoretical vs Actual"', 'title={t("inventory.theoreticalVsActual.title", "Theoretical vs Actual")}'],
};

for (const [file, [from, to]] of Object.entries(files)) {
    const abs = path.resolve(file);
    if (!fs.existsSync(abs)) { console.log('[MISS]', file); continue; }
    let c = fs.readFileSync(abs, 'utf-8');
    if (c.includes(from)) {
        c = c.replace(from, to);
        fs.writeFileSync(abs, c, 'utf-8');
        n++;
        console.log('[i18n]', path.basename(file));
    } else {
        console.log('[SKIP]', path.basename(file), '- pattern not found');
    }
}

console.log('\nDone!', n, 'files updated');
