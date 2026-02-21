const fs = require('fs');

const fixes = [
    // More useAuth: { _user } -> { user: _user }
    ['src/pages/manager/hr/HiringATS.tsx', 45, '_user', 'user'],
    ['src/pages/manager/hr/HRCalendarPage.tsx', 36, '_user', 'user'],
    ['src/pages/manager/hr/ManualClocking.tsx', 152, '_user', 'user'],
    ['src/pages/manager/hr/OnboardingChecklists.tsx', 42, '_user', 'user'],
    ['src/pages/manager/hr/SalaryBenchmarks.tsx', 31, '_user', 'user'],
    ['src/pages/manager/hr/reports/EmployeeDetailsReport.tsx', 12, '_user', 'user'],
    ['src/pages/manager/hr/reports/HeadcountReport.tsx', 11, '_user', 'user'],
    ['src/pages/manager/hr/reports/TurnoverReport.tsx', 10, '_user', 'user'],
    ['src/pages/manager/hr/ApprovalSettings.tsx', 92, '_user', 'user'],
    ['src/pages/manager/hr/ClockingData.tsx', 60, '_user', 'user'],
    ['src/pages/manager/CompanySettings.tsx', 43, '_user', 'user'],

    // useAuth: { _isManager, _isOwner }
    ['src/pages/manager/hr/ForecastingCosts.tsx', 16, '_isManager', 'isManager'],
    ['src/pages/manager/hr/ForecastingCosts.tsx', 16, '_isOwner', 'isOwner'],
    ['src/pages/manager/hr/HeadcountModule.tsx', 17, '_isManager', 'isManager'],
    ['src/pages/manager/hr/HeadcountModule.tsx', 17, '_isOwner', 'isOwner'],
    ['src/pages/manager/hr/PayrollMalta.tsx', 20, '_isOwner', 'isOwner'],
    ['src/pages/manager/hr/PayrollMalta.tsx', 20, '_isManager', 'isManager'],
    ['src/pages/manager/hr/SickLeaveAnalysis.tsx', 14, '_isManager', 'isManager'],
    ['src/pages/manager/hr/SickLeaveAnalysis.tsx', 14, '_isOwner', 'isOwner'],
    ['src/pages/manager/hr/TurnoverModule.tsx', 19, '_isManager', 'isManager'],
    ['src/pages/manager/hr/TurnoverModule.tsx', 19, '_isOwner', 'isOwner'],
    ['src/pages/manager/compliance/HACCPChecklists.tsx', 31, '_isManager', 'isManager'],
    ['src/pages/manager/compliance/HACCPChecklists.tsx', 31, '_isOwner', 'isOwner'],
    ['src/pages/manager/forecasting/ForecastingDashboard.tsx', 25, '_isManager', 'isManager'],
    ['src/pages/manager/forecasting/ForecastingDashboard.tsx', 25, '_isOwner', 'isOwner'],
    ['src/pages/manager/guests/GuestProfiles.tsx', 28, '_isManager', 'isManager'],
    ['src/pages/manager/guests/GuestProfiles.tsx', 28, '_isOwner', 'isOwner'],

    // useAuditLog: { _logAction }
    ['src/pages/manager/hr/ESGModule.tsx', 15, '_logAction', 'logAction'],
    ['src/pages/manager/hr/ExpenseManagement.tsx', 19, '_logAction', 'logAction'],
    ['src/pages/manager/hr/GovReportsPage.tsx', 25, '_logAction', 'logAction'],
    ['src/pages/manager/hr/AccountingMalta.tsx', 18, '_logAction', 'logAction'],
    ['src/pages/manager/hr/PerformanceManagement.tsx', 17, '_logAction', 'logAction'],
    ['src/pages/manager/hr/PerformanceReviews.tsx', 47, '_logAction', 'logAction'],
    ['src/pages/manager/hr/SFMAccounting.tsx', 19, '_logAction', 'logAction'],
    ['src/pages/manager/GuestDrawer.tsx', 76, '_logAction', 'logAction'],

    // Feature module hooks
    ['src/pages/manager/hr/EmployeeDirectory.tsx', 63, '_getAccess', 'getAccess'],

    // Other
    ['src/pages/manager/forecasting/SeasonalPatterns.tsx', 17, '_venueId', 'venueId'],
    ['src/pages/manager/guests/GuestProfiles.tsx', 30, '_queryClient', 'queryClient'],
    ['src/pages/manager/floorplan/FloorplanEditor.tsx', 57, '_queryClient', 'queryClient'],
    ['src/pages/manager/pos/KioskModePage.tsx', 32, '_queryClient', 'queryClient'],
    ['src/pages/manager/training/RecipeVideoBites.tsx', 27, '_queryClient', 'queryClient'],
    ['src/pages/manager/ProductManagement.tsx', 38, '_navigate', 'navigate'],
    ['src/pages/manager/Microservices.tsx', 23, '_navigate', 'navigate'],
    ['src/pages/manager/POSSettings.tsx', 99, '_setDevices', 'setDevices'],
    ['src/pages/manager/POSSettings.tsx', 106, '_setModifierGroups', 'setModifierGroups'],
    ['src/pages/manager/POSSettings.tsx', 114, '_setPrinters', 'setPrinters'],
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
    const replacement = rightName + ': ' + wrongName;

    if (oldLine.includes(replacement)) {
        console.log('[SKIP] ' + file + ':' + line + ' already correct');
        continue;
    }

    if (oldLine.includes(wrongName)) {
        const newLine = oldLine.replace(wrongName, replacement);
        if (newLine !== oldLine) {
            lines[idx] = newLine;
            fixed++;
            console.log('[FIX] ' + file + ':' + line + ' ' + wrongName + ' -> ' + replacement);
        }
    } else {
        console.log('[SKIP] ' + file + ':' + line + ' ' + wrongName + ' not found');
    }
}

// Write all modified files
for (const [file, lines] of Object.entries(fileCache)) {
    fs.writeFileSync(file, lines.join('\n'), 'utf-8');
}

console.log('Done! Fixed: ' + fixed);
