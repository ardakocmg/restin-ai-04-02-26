/**
 * HR Route Module
 * HR Main, HR Setup, HR Reports, HR Advanced
 */
import React from 'react';
import { Route, Navigate } from 'react-router-dom';
import RoleRoute from '../components/shared/RoleRoute';

// ─── HR Main ────────────────────────────────────────────────────────────────────
const HRHomePage = React.lazy(() => import('../pages/manager/hr/HRHome'));
const EmployeeDirectory = React.lazy(() => import('../pages/manager/hr/EmployeeDirectory'));
const EmployeeDetailPage = React.lazy(() => import('../pages/manager/hr/EmployeeDetailPage'));
const PayrollRunDetail = React.lazy(() => import('../pages/manager/hr/PayrollRunDetail'));
const PayslipViewer = React.lazy(() => import('../pages/manager/hr/PayslipViewer'));
const Scheduler = React.lazy(() => import('../pages/manager/hr/Scheduler'));
const ClockingData = React.lazy(() => import('../pages/manager/hr/ClockingData'));
const ManualClocking = React.lazy(() => import('../pages/manager/hr/ManualClocking'));
const AddClockEntry = React.lazy(() => import('../pages/manager/hr/AddClockEntry'));
const ApprovalCenter = React.lazy(() => import('../pages/manager/hr/ApprovalCenter'));
const ApprovalSettings = React.lazy(() => import('../pages/manager/hr/ApprovalSettings'));
const HRImport = React.lazy(() => import('../pages/manager/hr/HRImport'));
const HRMap = React.lazy(() => import('../pages/manager/hr/HRMap'));
const HRExceptions = React.lazy(() => import('../pages/manager/hr/HRExceptions'));
const HRDevices = React.lazy(() => import('../pages/manager/hr/HRDevices'));
const HeadcountModule = React.lazy(() => import('../pages/manager/hr/HeadcountModule'));
const TurnoverModule = React.lazy(() => import('../pages/manager/hr/TurnoverModule'));
const PerformanceReviews = React.lazy(() => import('../pages/manager/hr/PerformanceReviews'));
const Contracts = React.lazy(() => import('../pages/manager/hr/Contracts'));
const TipsManagement = React.lazy(() => import('../pages/manager/hr/TipsManagement'));
const ReportingHub = React.lazy(() => import('../pages/manager/hr/ReportingHub'));
const ReportViewer = React.lazy(() => import('../pages/manager/hr/ReportViewer'));
const HRModulePlaceholder = React.lazy(() => import('../pages/manager/hr/HRModulePlaceholder'));
const AdminSettings = React.lazy(() => import('../pages/manager/hr/AdminSettings'));
const EmployeePortal = React.lazy(() => import('../pages/manager/hr/EmployeePortalComplete'));
const EmployeePayrollHistory = React.lazy(() => import('../pages/portal/EmployeePayrollHistory'));
const EmployeeSetupHub = React.lazy(() => import('../pages/manager/hr/EmployeeSetupHub'));
const Shifts = React.lazy(() => import('../pages/manager/hr/Shifts'));
const SummaryDashboard = React.lazy(() => import('../pages/manager/hr/SummaryDashboard'));
const PayrollPage = React.lazy(() => import('../pages/manager/hr/PayrollPage'));
const LeaveManagement = React.lazy(() => import('../pages/manager/hr/LeaveManagement'));
const ExpenseManagement = React.lazy(() => import('../pages/manager/hr/ExpenseManagement'));
const PerformanceManagement = React.lazy(() => import('../pages/manager/hr/PerformanceManagement'));
const DocumentManagement = React.lazy(() => import('../pages/manager/hr/DocumentManagement'));
const HRAnalytics = React.lazy(() => import('../pages/manager/hr/HRAnalytics'));
const HREmployeePerformance = React.lazy(() => import('../pages/manager/hr/HREmployeePerformance'));
const SFMAccounting = React.lazy(() => import('../pages/manager/hr/SFMAccounting'));
const ESGModule = React.lazy(() => import('../pages/manager/hr/ESGModule'));
const GovReportsPage = React.lazy(() => import('../pages/manager/hr/GovReportsPage'));
const SickLeaveAnalysis = React.lazy(() => import('../pages/manager/hr/SickLeaveAnalysis'));
const ForecastingCosts = React.lazy(() => import('../pages/manager/hr/ForecastingCosts'));
const TimesheetsIndices = React.lazy(() => import('../pages/manager/hr/Timesheets'));
const PayrollMalta = React.lazy(() => import('../pages/manager/hr/PayrollMalta'));
const AccountingMalta = React.lazy(() => import('../pages/manager/hr/AccountingMalta'));

// ─── HR Setup ───────────────────────────────────────────────────────────────────
const BanksPage = React.lazy(() => import('../pages/manager/hr/setup/BanksPage'));
const DepartmentsPage = React.lazy(() => import('../pages/manager/hr/setup/DepartmentsPage'));
const LocationsPage = React.lazy(() => import('../pages/manager/hr/setup/LocationsPage'));
const OccupationsPage = React.lazy(() => import('../pages/manager/hr/setup/OccupationsPage'));
const CountriesPage = React.lazy(() => import('../pages/manager/hr/setup/CountriesPage'));
const EmploymentTypesPage = React.lazy(() => import('../pages/manager/hr/setup/EmploymentTypesPage'));
const WorkSchedulesPage = React.lazy(() => import('../pages/manager/hr/setup/WorkSchedulesPage'));
const CostCentresPage = React.lazy(() => import('../pages/manager/hr/setup/CostCentresPage'));
const TerminationReasonsPage = React.lazy(() => import('../pages/manager/hr/setup/TerminationReasonsPage'));
const GradesPage = React.lazy(() => import('../pages/manager/hr/setup/GradesPage'));
const CitizenshipPage = React.lazy(() => import('../pages/manager/hr/setup/CitizenshipPage'));
const OrganisationPage = React.lazy(() => import('../pages/manager/hr/setup/OrganisationPage'));
const EmployeesSetupPage = React.lazy(() => import('../pages/manager/hr/setup/EmployeesSetupPage'));
const CalendarSetupPage = React.lazy(() => import('../pages/manager/hr/setup/CalendarSetupPage'));
const SalaryPackagePage = React.lazy(() => import('../pages/manager/hr/setup/SalaryPackagePage'));
const CustomFieldsPage = React.lazy(() => import('../pages/manager/hr/setup/CustomFieldsPage'));
const ApplicantsPage = React.lazy(() => import('../pages/manager/hr/setup/ApplicantsPage'));
const SettingsSetupPage = React.lazy(() => import('../pages/manager/hr/setup/SettingsSetupPage'));

// ─── HR Reports ─────────────────────────────────────────────────────────────────
const EmployeeDetailsReport = React.lazy(() => import('../pages/manager/hr/reports/EmployeeDetailsReport'));
const HeadcountReport = React.lazy(() => import('../pages/manager/hr/reports/HeadcountReport'));
const TurnoverReport = React.lazy(() => import('../pages/manager/hr/reports/TurnoverReport'));
const EmploymentDatesReport = React.lazy(() => import('../pages/manager/hr/reports/EmploymentDatesReport'));
const BirthdaysAnniversariesReport = React.lazy(() => import('../pages/manager/hr/reports/BirthdaysAnniversariesReport'));
const TrainingExpiringReport = React.lazy(() => import('../pages/manager/hr/reports/TrainingExpiringReport'));
const TrainingStartingReport = React.lazy(() => import('../pages/manager/hr/reports/TrainingStartingReport'));
const TrainingOngoingReport = React.lazy(() => import('../pages/manager/hr/reports/TrainingOngoingReport'));

// ─── Payroll Feature ────────────────────────────────────────────────────────────
const PayrollDashboard = React.lazy(() => import('../features/hr/PayrollDashboard'));

export const hrRoutes = (
    <>
        {/* HR Main */}
        <Route path="hr">
            <Route index element={<RoleRoute requiredRole="MANAGER"><HRHomePage /></RoleRoute>} />
            <Route path="people" element={<RoleRoute requiredRole="MANAGER"><EmployeeDirectory /></RoleRoute>} />
            <Route path="people/:employeeCode" element={<RoleRoute requiredRole="MANAGER"><EmployeeDetailPage /></RoleRoute>} />
            <Route path="analytics" element={<RoleRoute requiredRole="OWNER"><HRAnalytics /></RoleRoute>} />
            <Route path="employee-performance/:employeeId" element={<RoleRoute requiredRole="MANAGER"><HREmployeePerformance /></RoleRoute>} />
            <Route path="payroll" element={<RoleRoute requiredRole="OWNER"><PayrollPage /></RoleRoute>} />
            <Route path="payroll/:runId" element={<RoleRoute requiredRole="OWNER"><PayrollRunDetail /></RoleRoute>} />
            <Route path="payroll/view/:employeeId/:period" element={<RoleRoute requiredRole="OWNER"><PayslipViewer /></RoleRoute>} />
            <Route path="esg" element={<RoleRoute requiredRole="OWNER"><ESGModule /></RoleRoute>} />
            <Route path="gov-reports" element={<RoleRoute requiredRole="OWNER"><GovReportsPage /></RoleRoute>} />
            <Route path="sick-leave" element={<RoleRoute requiredRole="OWNER"><SickLeaveAnalysis /></RoleRoute>} />
            <Route path="forecasting-costs" element={<RoleRoute requiredRole="OWNER"><ForecastingCosts /></RoleRoute>} />
            <Route path="portal-view" element={<RoleRoute requiredRole="MANAGER"><EmployeePortal /></RoleRoute>} />
            <Route path="timesheets" element={<RoleRoute requiredRole="MANAGER"><TimesheetsIndices /></RoleRoute>} />
            <Route path="settings" element={<RoleRoute requiredRole="OWNER"><AdminSettings /></RoleRoute>} />
            <Route path="contracts" element={<RoleRoute requiredRole="OWNER"><Contracts /></RoleRoute>} />
            <Route path="leave-management" element={<RoleRoute requiredRole="MANAGER"><LeaveManagement /></RoleRoute>} />
            <Route path="summary" element={<Navigate to="/manager/hr/dashboard" replace />} />
            <Route path="dashboard" element={<RoleRoute requiredRole="MANAGER"><SummaryDashboard /></RoleRoute>} />
            <Route path="clocking" element={<RoleRoute requiredRole="MANAGER"><ClockingData /></RoleRoute>} />
            <Route path="manual-clocking" element={<ManualClocking />} />
            <Route path="clocking/add" element={<RoleRoute requiredRole="STAFF"><AddClockEntry /></RoleRoute>} />
            <Route path="approvals" element={<RoleRoute requiredRole="STAFF"><ApprovalCenter /></RoleRoute>} />
            <Route path="approval-settings" element={<RoleRoute requiredRole="OWNER"><ApprovalSettings /></RoleRoute>} />
            <Route path="scheduler" element={<RoleRoute requiredRole="MANAGER"><Scheduler /></RoleRoute>} />
            <Route path="import" element={<RoleRoute requiredRole="OWNER"><HRImport /></RoleRoute>} />
            <Route path="map" element={<RoleRoute requiredRole="MANAGER"><HRMap /></RoleRoute>} />
            <Route path="exceptions" element={<RoleRoute requiredRole="MANAGER"><HRExceptions /></RoleRoute>} />
            <Route path="devices" element={<RoleRoute requiredRole="MANAGER"><HRDevices /></RoleRoute>} />
            <Route path="headcount" element={<RoleRoute requiredRole="OWNER"><HeadcountModule /></RoleRoute>} />
            <Route path="turnover" element={<RoleRoute requiredRole="OWNER"><TurnoverModule /></RoleRoute>} />
            <Route path="performance-reviews" element={<RoleRoute requiredRole="MANAGER"><PerformanceReviews /></RoleRoute>} />
            <Route path="tips" element={<RoleRoute requiredRole="MANAGER"><TipsManagement /></RoleRoute>} />
            <Route path="reporting" element={<RoleRoute requiredRole="MANAGER"><ReportingHub /></RoleRoute>} />
            <Route path="reports/:reportId" element={<RoleRoute requiredRole="MANAGER"><ReportViewer /></RoleRoute>} />
            <Route path="setup/:moduleName" element={<RoleRoute requiredRole="OWNER"><HRModulePlaceholder /></RoleRoute>} />
            <Route path="my-documents" element={<EmployeePayrollHistory />} />
            <Route path="shifts" element={<RoleRoute requiredRole="MANAGER"><Shifts /></RoleRoute>} />
            <Route path="payroll-malta" element={<RoleRoute requiredRole="OWNER"><PayrollMalta /></RoleRoute>} />
        </Route>

        {/* HR Advanced */}
        <Route path="hr-advanced/leave" element={<RoleRoute requiredRole="MANAGER"><LeaveManagement /></RoleRoute>} />
        <Route path="hr-advanced/payroll" element={<RoleRoute requiredRole="OWNER"><PayrollPage /></RoleRoute>} />
        <Route path="hr-advanced/expense" element={<RoleRoute requiredRole="MANAGER"><ExpenseManagement /></RoleRoute>} />
        <Route path="hr-advanced/performance" element={<RoleRoute requiredRole="MANAGER"><PerformanceManagement /></RoleRoute>} />
        <Route path="hr-advanced/documents" element={<RoleRoute requiredRole="MANAGER"><DocumentManagement /></RoleRoute>} />
        <Route path="hr-advanced/analytics" element={<RoleRoute requiredRole="OWNER"><HRAnalytics /></RoleRoute>} />
        <Route path="hr-advanced/accounting" element={<RoleRoute requiredRole="OWNER"><SFMAccounting /></RoleRoute>} />
        <Route path="accounting-malta" element={<RoleRoute requiredRole="OWNER"><AccountingMalta /></RoleRoute>} />

        {/* HR Setup */}
        <Route path="hr-setup">
            <Route index element={<RoleRoute requiredRole="OWNER"><EmployeeSetupHub /></RoleRoute>} />
            <Route path="banks" element={<RoleRoute requiredRole="OWNER"><BanksPage /></RoleRoute>} />
            <Route path="departments" element={<RoleRoute requiredRole="OWNER"><DepartmentsPage /></RoleRoute>} />
            <Route path="locations" element={<RoleRoute requiredRole="OWNER"><LocationsPage /></RoleRoute>} />
            <Route path="occupations" element={<RoleRoute requiredRole="OWNER"><OccupationsPage /></RoleRoute>} />
            <Route path="countries" element={<RoleRoute requiredRole="OWNER"><CountriesPage /></RoleRoute>} />
            <Route path="employment-types" element={<RoleRoute requiredRole="OWNER"><EmploymentTypesPage /></RoleRoute>} />
            <Route path="work-schedules" element={<RoleRoute requiredRole="OWNER"><WorkSchedulesPage /></RoleRoute>} />
            <Route path="cost-centres" element={<RoleRoute requiredRole="OWNER"><CostCentresPage /></RoleRoute>} />
            <Route path="termination-reasons" element={<RoleRoute requiredRole="OWNER"><TerminationReasonsPage /></RoleRoute>} />
            <Route path="grades" element={<RoleRoute requiredRole="OWNER"><GradesPage /></RoleRoute>} />
            <Route path="citizenship" element={<RoleRoute requiredRole="OWNER"><CitizenshipPage /></RoleRoute>} />
            <Route path="organisation" element={<RoleRoute requiredRole="OWNER"><OrganisationPage /></RoleRoute>} />
            <Route path="employees" element={<RoleRoute requiredRole="OWNER"><EmployeesSetupPage /></RoleRoute>} />
            <Route path="calendar" element={<RoleRoute requiredRole="OWNER"><CalendarSetupPage /></RoleRoute>} />
            <Route path="salary-packages" element={<RoleRoute requiredRole="OWNER"><SalaryPackagePage /></RoleRoute>} />
            <Route path="custom-fields" element={<RoleRoute requiredRole="OWNER"><CustomFieldsPage /></RoleRoute>} />
            <Route path="applicants" element={<RoleRoute requiredRole="OWNER"><ApplicantsPage /></RoleRoute>} />
            <Route path="settings" element={<RoleRoute requiredRole="OWNER"><SettingsSetupPage /></RoleRoute>} />
        </Route>

        {/* HR Reports */}
        <Route path="hr-reports">
            <Route path="employee-details" element={<RoleRoute requiredRole="OWNER"><EmployeeDetailsReport /></RoleRoute>} />
            <Route path="headcount" element={<RoleRoute requiredRole="OWNER"><HeadcountReport /></RoleRoute>} />
            <Route path="turnover" element={<RoleRoute requiredRole="OWNER"><TurnoverReport /></RoleRoute>} />
            <Route path="employment-dates" element={<RoleRoute requiredRole="OWNER"><EmploymentDatesReport /></RoleRoute>} />
            <Route path="birthdays" element={<RoleRoute requiredRole="OWNER"><BirthdaysAnniversariesReport /></RoleRoute>} />
            <Route path="training-expiring" element={<RoleRoute requiredRole="OWNER"><TrainingExpiringReport /></RoleRoute>} />
            <Route path="training-starting" element={<RoleRoute requiredRole="OWNER"><TrainingStartingReport /></RoleRoute>} />
            <Route path="training-ongoing" element={<RoleRoute requiredRole="OWNER"><TrainingOngoingReport /></RoleRoute>} />
        </Route>
    </>
);
