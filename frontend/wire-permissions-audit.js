/**
 * wire-permissions-audit.js
 * Phase 1 + Phase 2: Remove _ prefixes and wire permission gating + audit logging
 * 
 * Strategy:
 * 1. Restore isManager/isOwner from _isManager/_isOwner
 * 2. Restore logAction from _logAction
 * 3. Restore user from _user where needed
 * 4. Add useEffect audit log on page mount where missing
 * 5. Add isManager/isOwner conditional gates on admin actions
 */
const fs = require('fs');
const path = require('path');

let totalFixed = 0;

// ─── Phase 1: Restore variable names (remove _ prefix from aliases) ──────

const aliasRestores = [
    // Pattern: file, from, to
    // HR Modules — restore isManager + isOwner + user + logAction
    ['src/pages/manager/hr/ESGModule.tsx', 'user: _user, isManager: _isManager, isOwner: _isOwner', 'user, isManager, isOwner'],
    ['src/pages/manager/hr/ESGModule.tsx', 'logAction: _logAction', 'logAction'],

    ['src/pages/manager/hr/ExpenseManagement.tsx', 'user: _user, isManager: _isManager, isOwner: _isOwner', 'user, isManager, isOwner'],
    ['src/pages/manager/hr/ExpenseManagement.tsx', 'logAction: _logAction', 'logAction'],

    ['src/pages/manager/hr/GovReportsPage.tsx', 'user: _user, isManager: _isManager, isOwner: _isOwner', 'user, isManager, isOwner'],
    ['src/pages/manager/hr/GovReportsPage.tsx', 'logAction: _logAction', 'logAction'],

    ['src/pages/manager/hr/ForecastingCosts.tsx', 'isManager: _isManager, isOwner: _isOwner', 'isManager, isOwner'],
    ['src/pages/manager/hr/HeadcountModule.tsx', 'isManager: _isManager, isOwner: _isOwner', 'isManager, isOwner'],
    ['src/pages/manager/hr/PayrollMalta.tsx', 'isOwner: _isOwner, isManager: _isManager', 'isOwner, isManager'],
    ['src/pages/manager/hr/SickLeaveAnalysis.tsx', 'isManager: _isManager, isOwner: _isOwner', 'isManager, isOwner'],
    ['src/pages/manager/hr/TurnoverModule.tsx', 'isManager: _isManager, isOwner: _isOwner', 'isManager, isOwner'],

    ['src/pages/manager/hr/PayrollRunDetail.tsx', 'user: _user, isManager: _isManager, isOwner: _isOwner', 'user, isManager, isOwner'],
    ['src/pages/manager/hr/PayslipTemplate.tsx', 'user: _user, isManager: _isManager, isOwner: _isOwner', 'user, isManager, isOwner'],
    ['src/pages/manager/hr/PayslipViewer.tsx', 'user: _user, isManager: _isManager, isOwner: _isOwner', 'user, isManager, isOwner'],
    ['src/pages/manager/hr/PerformanceManagement.tsx', 'user: _user, isManager: _isManager, isOwner: _isOwner', 'user, isManager, isOwner'],
    ['src/pages/manager/hr/PerformanceManagement.tsx', 'logAction: _logAction', 'logAction'],
    ['src/pages/manager/hr/PerformanceReviews.tsx', 'user: _user, isManager: _isManager, isOwner: _isOwner', 'user, isManager, isOwner'],
    ['src/pages/manager/hr/PerformanceReviews.tsx', 'logAction: _logAction', 'logAction'],
    ['src/pages/manager/hr/Scheduler.tsx', 'user: _user, isManager: _isManager, isOwner: _isOwner', 'user, isManager, isOwner'],
    ['src/pages/manager/hr/SFMAccounting.tsx', 'user: _user, isManager: _isManager, isOwner: _isOwner', 'user, isManager, isOwner'],
    ['src/pages/manager/hr/SFMAccounting.tsx', 'logAction: _logAction', 'logAction'],
    ['src/pages/manager/hr/AccountingMalta.tsx', 'logAction: _logAction', 'logAction'],

    // Manager pages
    ['src/pages/manager/ReservationTimeline.tsx', 'isManager: _isManager, isOwner: _isOwner', 'isManager, isOwner'],
    ['src/pages/manager/ReservationModal.tsx', 'user: _user, isManager: _isManager, isOwner: _isOwner', 'user, isManager, isOwner'],
    ['src/pages/manager/guests/GuestProfiles.tsx', 'isManager: _isManager, isOwner: _isOwner', 'isManager, isOwner'],
    ['src/pages/manager/compliance/HACCPChecklists.tsx', 'isManager: _isManager, isOwner: _isOwner', 'isManager, isOwner'],
    ['src/pages/manager/forecasting/ForecastingDashboard.tsx', 'isManager: _isManager, isOwner: _isOwner', 'isManager, isOwner'],

    // RecipeManagement
    ['src/pages/manager/inventory/RecipeManagementComplete.tsx', 'user: _user, isManager: _isManager, isOwner: _isOwner', 'user, isManager, isOwner'],

    // Restin dashboards
    ['src/features/restin/crm/CrmDashboard.tsx', 'user: _user, isManager: _isManager, isOwner: _isOwner', 'user, isManager, isOwner'],
    ['src/features/restin/fintech/FintechDashboard.tsx', 'user: _user, isManager: _isManager, isOwner: _isOwner', 'user, isManager, isOwner'],
    ['src/features/restin/ops/OpsDashboard.tsx', 'user: _user, isManager: _isManager, isOwner: _isOwner', 'user, isManager, isOwner'],
    ['src/features/restin/radar/RadarDashboard.tsx', 'user: _user, isManager: _isManager, isOwner: _isOwner', 'user, isManager, isOwner'],
    ['src/features/restin/studio/StudioDashboard.tsx', 'user: _user, isManager: _isManager, isOwner: _isOwner', 'user, isManager, isOwner'],
    ['src/features/restin/voice/VoiceDashboard.tsx', 'user: _user, isManager: _isManager, isOwner: _isOwner', 'user, isManager, isOwner'],
    ['src/features/restin/voice/VoiceSettings.tsx', 'user: _user, isManager: _isManager, isOwner: _isOwner', 'user, isManager, isOwner'],
    ['src/features/restin/web/WebBuilder.tsx', 'user: _user, isManager: _isManager, isOwner: _isOwner', 'user, isManager, isOwner'],

    // Standalone audit log restores
    ['src/pages/manager/UpdatesPage.tsx', 'logAction: _logAction', 'logAction'],
    ['src/pages/manager/GuestDrawer.tsx', 'logAction: _logAction', 'logAction'],
];

// Process alias restores
for (const [file, from, to] of aliasRestores) {
    const abs = path.resolve(file);
    if (!fs.existsSync(abs)) { console.log(`[MISS] ${file}`); continue; }
    let content = fs.readFileSync(abs, 'utf-8');
    if (content.includes(from)) {
        content = content.replace(from, to);
        fs.writeFileSync(abs, content, 'utf-8');
        totalFixed++;
        console.log(`[RESTORE] ${file}: ${from.substring(0, 40)}...`);
    } else {
        console.log(`[SKIP] ${file}: pattern not found`);
    }
}

// ─── Phase 2: Add audit logging useEffect where missing ──────────────

const auditEffects = [
    // Files that need useEffect(() => { logAction(...) }, []) added
    // Format: [file, afterPattern, auditEvent, resourceType]
    ['src/pages/manager/UpdatesPage.tsx', 'useAuditLog();', "useEffect(() => { logAction('UPDATES_VIEWED', 'updates_page'); }, []);", 'useEffect'],
    ['src/pages/manager/hr/ESGModule.tsx', 'fetchData();\n  }, []);', "logAction('ESG_MODULE_VIEWED', 'esg_module');", 'inline-after-fetch'],
    ['src/pages/manager/hr/ExpenseManagement.tsx', 'fetchClaims();\n  }, []);', "logAction('EXPENSE_MANAGEMENT_VIEWED', 'expense_management');", 'inline-after-fetch'],
    ['src/pages/manager/hr/AccountingMalta.tsx', 'useAuditLog();', "useEffect(() => { logAction('ACCOUNTING_MALTA_VIEWED', 'accounting_malta'); }, []);", 'useEffect'],
    ['src/pages/manager/GuestDrawer.tsx', null, null, 'skip-has-logAction'], // Already may have logAction calls
];

// Instead of complex AST manipulation, let's add audit call in the useEffect
// that already exists for data fetching where sensible
for (const [file, afterPattern, auditCode, type] of auditEffects) {
    if (type === 'skip-has-logAction') continue;
    const abs = path.resolve(file);
    if (!fs.existsSync(abs)) continue;
    let content = fs.readFileSync(abs, 'utf-8');

    if (type === 'useEffect' && afterPattern && auditCode) {
        // Add a new useEffect after the useAuditLog line
        if (content.includes(afterPattern) && !content.includes(auditCode)) {
            content = content.replace(afterPattern, afterPattern + '\n  ' + auditCode);
            fs.writeFileSync(abs, content, 'utf-8');
            totalFixed++;
            console.log(`[AUDIT] ${file}: Added page view audit`);
        }
    }
}

// ─── Phase 3: Add GovReportsPage download audit logging ──────────────

const govFile = 'src/pages/manager/hr/GovReportsPage.tsx';
if (fs.existsSync(govFile)) {
    let content = fs.readFileSync(govFile, 'utf-8');
    // Add logAction call after successful download
    if (content.includes("toast.success(`${reportType} downloaded successfully`)") && !content.includes("logAction('REPORT_DOWNLOADED'")) {
        content = content.replace(
            "toast.success(`${reportType} downloaded successfully`);",
            "toast.success(`${reportType} downloaded successfully`);\n            logAction('REPORT_DOWNLOADED', 'gov_report', reportType, { year });"
        );
        totalFixed++;
        console.log('[AUDIT] GovReportsPage: Added REPORT_DOWNLOADED audit');
    }
    // Add page view audit  
    if (content.includes('loadData();') && !content.includes("logAction('GOV_REPORTS_VIEWED'")) {
        const idx = content.indexOf('loadData();\n    }, [year]);');
        if (idx > -1) {
            const insert = "\n\n    useEffect(() => {\n        logAction('GOV_REPORTS_VIEWED', 'gov_reports', venueId);\n    }, []);";
            content = content.replace('loadData();\n    }, [year]);', 'loadData();\n    }, [year]);' + insert);
            totalFixed++;
            console.log('[AUDIT] GovReportsPage: Added GOV_REPORTS_VIEWED audit');
        }
    }
    fs.writeFileSync(govFile, content, 'utf-8');
}

// ─── Phase 4: Add ExpenseManagement approve/reject audit ──────────────

const expFile = 'src/pages/manager/hr/ExpenseManagement.tsx';
if (fs.existsSync(expFile)) {
    let content = fs.readFileSync(expFile, 'utf-8');
    // Add page view audit
    if (content.includes('fetchClaims();\n  }, []);') && !content.includes("logAction('EXPENSE_")) {
        content = content.replace(
            'fetchClaims();\n  }, []);',
            "fetchClaims();\n    logAction('EXPENSE_MANAGEMENT_VIEWED', 'expense_management');\n  }, []);"
        );
        totalFixed++;
        console.log('[AUDIT] ExpenseManagement: Added page view audit');
    }
    fs.writeFileSync(expFile, content, 'utf-8');
}

// ─── Phase 5: Add ESGModule page view audit ──────────────

const esgFile = 'src/pages/manager/hr/ESGModule.tsx';
if (fs.existsSync(esgFile)) {
    let content = fs.readFileSync(esgFile, 'utf-8');
    if (content.includes('fetchData();\n  }, []);') && !content.includes("logAction('ESG_")) {
        content = content.replace(
            'fetchData();\n  }, []);',
            "fetchData();\n    logAction('ESG_MODULE_VIEWED', 'esg_module');\n  }, []);"
        );
        totalFixed++;
        console.log('[AUDIT] ESGModule: Added page view audit');
    }
    fs.writeFileSync(esgFile, content, 'utf-8');
}

// ─── Phase 6: Add UpdatesPage page view audit ──────────────

const updFile = 'src/pages/manager/UpdatesPage.tsx';
if (fs.existsSync(updFile)) {
    let content = fs.readFileSync(updFile, 'utf-8');
    // Check if a useEffect for audit already exists
    if (!content.includes("logAction('UPDATES_VIEWED'") && content.includes('useAuditLog()')) {
        // Find where to insert — after the useAuditLog line
        // We need to add a useEffect import if not present, and the effect itself
        if (!content.includes("'react'") && !content.includes("useEffect")) {
            content = "import { useEffect } from 'react';\n" + content;
        }
        // Add the audit useEffect after useAuditLog line
        content = content.replace(
            'const { logAction } = useAuditLog();',
            "const { logAction } = useAuditLog();\n  useEffect(() => { logAction('UPDATES_VIEWED', 'updates_page'); }, []);"
        );
        totalFixed++;
        console.log('[AUDIT] UpdatesPage: Added UPDATES_VIEWED audit');
    }
    fs.writeFileSync(updFile, content, 'utf-8');
}

// ─── Phase 7: Wire GuestDrawer audit on guest actions ──────────────

const gdFile = 'src/pages/manager/GuestDrawer.tsx';
if (fs.existsSync(gdFile)) {
    let content = fs.readFileSync(gdFile, 'utf-8');
    // The GuestDrawer should log when opened — look for onOpen or useEffect
    if (!content.includes("logAction('GUEST_PROFILE_VIEWED'") && content.includes('const { logAction }')) {
        // Add audit when drawer opens (look for a visible useEffect or the component mount)
        // This depends on the actual structure — let's just ensure the variable is restored and used
        // The logAction restoration was already done in phase 1
        console.log('[INFO] GuestDrawer: logAction restored, needs manual review for specific trigger points');
    }
    fs.writeFileSync(gdFile, content, 'utf-8');
}

// ─── Phase 8: Add AccountingMalta page view audit ──────────────

const acctFile = 'src/pages/manager/hr/AccountingMalta.tsx';
if (fs.existsSync(acctFile)) {
    let content = fs.readFileSync(acctFile, 'utf-8');
    if (!content.includes("logAction('ACCOUNTING_MALTA_VIEWED'") && content.includes('const { logAction }')) {
        // Find the first useEffect and add audit call
        const effectPattern = /useEffect\(\(\) => \{/;
        const match = content.match(effectPattern);
        if (match) {
            content = content.replace(
                match[0],
                match[0] + "\n    logAction('ACCOUNTING_MALTA_VIEWED', 'accounting_malta');"
            );
            totalFixed++;
            console.log('[AUDIT] AccountingMalta: Added page view audit');
        }
    }
    fs.writeFileSync(acctFile, content, 'utf-8');
}

// ─── Phase 9: SFMAccounting + PerformanceManagement + PerformanceReviews page view audit ──────────────

const auditPageViews = [
    ['src/pages/manager/hr/SFMAccounting.tsx', 'SFM_ACCOUNTING_VIEWED', 'sfm_accounting'],
    ['src/pages/manager/hr/PerformanceManagement.tsx', 'PERFORMANCE_MANAGEMENT_VIEWED', 'performance_management'],
    ['src/pages/manager/hr/PerformanceReviews.tsx', 'PERFORMANCE_REVIEWS_VIEWED', 'performance_reviews'],
];

for (const [file, action, resource] of auditPageViews) {
    const abs = path.resolve(file);
    if (!fs.existsSync(abs)) continue;
    let content = fs.readFileSync(abs, 'utf-8');
    if (!content.includes(`logAction('${action}'`) && content.includes('const { logAction }')) {
        // Find a useEffect to inject into
        const effectMatch = content.match(/useEffect\(\(\) => \{[^}]*\n\s*\}, \[\]\)/);
        if (effectMatch) {
            // Inject into existing effect
            const original = effectMatch[0];
            const injected = original.replace('useEffect(() => {', `useEffect(() => {\n    logAction('${action}', '${resource}');`);
            content = content.replace(original, injected);
        } else {
            // Add new useEffect after logAction declaration
            content = content.replace(
                'const { logAction } = useAuditLog();',
                `const { logAction } = useAuditLog();\n  useEffect(() => { logAction('${action}', '${resource}'); }, []);`
            );
        }
        fs.writeFileSync(abs, content, 'utf-8');
        totalFixed++;
        console.log(`[AUDIT] ${path.basename(file)}: Added ${action} audit`);
    }
}

console.log(`\n✅ Done! Total fixes: ${totalFixed}`);
