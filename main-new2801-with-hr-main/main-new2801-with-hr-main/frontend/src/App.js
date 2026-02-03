import React, { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Toaster } from "sonner";
import systemService from "./services/SystemService";
import axios from "axios";
import api from "./lib/api";
import BookingWidget from './pages/public/booking/BookingWidget';

// Pages
import Login from "./pages/Login";
import AdminLayout from "./pages/admin/AdminLayout";
import Dashboard from "./pages/admin/Dashboard";
import VenueSettings from "./pages/admin/VenueSettings";
import StaffManagement from "./pages/admin/StaffManagement";
import Inventory from "./pages/admin/Inventory";
import Documents from "./pages/admin/Documents";
import ReviewRisk from "./pages/admin/ReviewRisk";
import AuditLogs from "./pages/admin/AuditLogs";
import FloorPlans from "./pages/admin/FloorPlans";
import FloorPlanEditor from "./pages/admin/FloorPlanEditor";
import MenuImportWizard from "./pages/admin/MenuImportWizard";
import Guests from "./pages/admin/Guests";
import Reservations from "./pages/admin/Reservations";
import ReservationTimeline from "./pages/admin/ReservationTimeline";
import DeviceHub from "./pages/admin/DeviceHub";
import DeviceMapping from "./pages/admin/DeviceMapping";
import Observability from "./pages/admin/Observability";
import Operations from "./pages/admin/Operations";
import POSDashboard from "./pages/admin/POSDashboard";
import SettingsHub from "./pages/admin/SettingsHub";
import ContentStudio from "./pages/admin/ContentStudio";
import Devices from "./pages/admin/Devices";
import RestaurantAppSettings from "./pages/admin/RestaurantAppSettings";
import PhysicalTables from "./pages/admin/PhysicalTables";
import Printers from "./pages/admin/Printers";
import CompanySettings from "./pages/admin/CompanySettings";
import LogsViewer from "./pages/admin/LogsViewer";
import FinanceDashboard from "./pages/admin/FinanceDashboard";
import AccountingHub from "./pages/admin/AccountingHub";
import UpdatesPage from "./pages/admin/UpdatesPage";
import ReportingHub from "./pages/admin/ReportingHub";
import ObservabilityLogs from "./pages/admin/ObservabilityLogs";
import Users from "./pages/admin/Users";
import RolesPermissions from "./pages/admin/RolesPermissions";
import UserAccess from "./pages/admin/UserAccess";
import ThemeCustomizer from "./pages/admin/ThemeCustomizer";
import Microservices from "./pages/admin/Microservices";
import EventMonitor from "./pages/admin/EventMonitor";
import PayrollCalculator from "./pages/admin/PayrollCalculator";
import PayrollPage from "./pages/admin/hr/PayrollPage";
import SuppliersAdmin from "./pages/admin/Suppliers";
import PurchaseOrdersAdmin from "./pages/admin/PurchaseOrders";
import Receiving from "./pages/admin/Receiving";
import InventoryPage from "./pages/inventory/InventoryPage";
import InventoryItemsNew from "./pages/inventory/InventoryItemsNew";
import InventoryItems from "./pages/inventory/InventoryItems";
import PurchaseOrdersNew from "./pages/inventory/PurchaseOrders";
import Suppliers from "./pages/inventory/Suppliers";
import StockCount from "./pages/inventory/StockCount";
import WasteLog from "./pages/inventory/WasteLog";
import RecipeManagement from "./pages/inventory/RecipeManagement";
import ProductionManagement from "./pages/inventory/ProductionManagement";
import StockTransfers from "./pages/inventory/StockTransfers";
import StockAdjustments from "./pages/inventory/StockAdjustments";
import RecipeManagementComplete from "./pages/inventory/RecipeManagementComplete";
import ProductionManagementComplete from "./pages/inventory/ProductionManagementComplete";
import StockTransfersComplete from "./pages/inventory/StockTransfersComplete";
import KDSPerformance from "./pages/reports/KDSPerformance";
import InventoryReports from "./pages/reports/InventoryReports";
import POSSalesReport from "./pages/reports/POSSalesReport";
import KDSPerformanceReport from "./pages/reports/KDSPerformanceReport";
import InventoryReport from "./pages/reports/InventoryReport";
import SystemHealthDashboard from "./pages/admin/SystemHealthDashboard";
import MonitoringDashboard from "./pages/admin/MonitoringDashboard";

import Analytics from "./pages/admin/Analytics";
import PayrollMalta from "./pages/admin/PayrollMalta";
import AccountingMalta from "./pages/admin/AccountingMalta";
import CRM from "./pages/admin/CRM";
import Loyalty from "./pages/admin/Loyalty";
import ProductManagement from "./pages/admin/ProductManagement";
import Automations from "./pages/admin/Automations";
import Connectors from "./pages/admin/Connectors";
import TrustDashboard from "./pages/observability/TrustDashboard";
import SystemHealth from "./pages/observability/SystemHealth";
import Integrity from "./pages/observability/Integrity";
import AdvancedObservability from "./pages/observability/AdvancedObservability";
import SelfDiagnostics from "./pages/observability/SelfDiagnostics";
import TestPanel from "./pages/observability/TestPanel";
import ErrorInbox from "./pages/observability/ErrorInbox";
import MarketingLanding from "./pages/MarketingLanding";
import TechnicalHub from "./pages/TechnicalHub";
import ModulesCatalog from "./pages/ModulesCatalog";

// Shireburn Indigo HR Pages
import SummaryDashboard from "./pages/admin/hr/SummaryDashboard";
import EmployeePortalIndigo from "./pages/admin/hr/EmployeePortal";
import EmployeeDirectory from "./pages/admin/hr/EmployeeDirectory";
import EmployeePortalComplete from "./pages/admin/hr/EmployeePortalComplete";
import Scheduler from "./pages/admin/hr/Scheduler";
import ClockingData from "./pages/admin/hr/ClockingData";
import EmployeeSetupHub from "./pages/admin/hr/EmployeeSetupHub";
import HeadcountModule from "./pages/admin/hr/HeadcountModule";
import TurnoverModule from "./pages/admin/hr/TurnoverModule";
import SickLeaveAnalysis from "./pages/admin/hr/SickLeaveAnalysis";
import PayrollCosts from "./pages/admin/hr/PayrollCosts";
import ForecastingCosts from "./pages/admin/hr/ForecastingCosts";
import ESGModule from "./pages/admin/hr/ESGModule";
import ReportingHubIndigo from "./pages/admin/hr/ReportingHub";
import EmployeeDetailPage from "./pages/admin/hr/EmployeeDetailPage";
import LeaveManagement from "./pages/admin/hr/LeaveManagement";
import ContractsIndigo from "./pages/admin/hr/Contracts";
import TipsManagement from "./pages/admin/hr/TipsManagement";
import DocumentsIndigo from "./pages/admin/hr/Documents";
import AuditTrailIndigo from "./pages/admin/hr/AuditTrail";
import AdminSettingsIndigo from "./pages/admin/hr/AdminSettings";
import HRHomeIndigoPage from "./pages/admin/hr/HRHomeIndigo";
import ReportViewer from "./pages/admin/hr/ReportViewer";
import HRModulePlaceholder from "./pages/admin/hr/HRModulePlaceholder";
import PayrollRunDetail from "./pages/admin/hr/PayrollRunDetail";
import PayslipTemplate from "./pages/admin/hr/PayslipTemplate";
import GovReportsPage from "./pages/admin/hr/GovReportsPage";
import LeaveDashboard from "./pages/admin/hr/LeaveDashboard";
import HRImport from "./pages/admin/hr/HRImport";
import HRMap from "./pages/admin/hr/HRMap";
import HRDevices from "./pages/admin/hr/HRDevices";
import HRExceptions from "./pages/admin/hr/HRExceptions";
import PayslipViewer from "./pages/admin/hr/PayslipViewer";
import EmployeePayrollHistory from "./pages/portal/EmployeePayrollHistory";

// HR Setup Pages
import BanksPage from "./pages/admin/hr-setup/BanksPage";
import DepartmentsPage from "./pages/admin/hr-setup/DepartmentsPage";
import LocationsPage from "./pages/admin/hr-setup/LocationsPage";
import OccupationsPage from "./pages/admin/hr-setup/OccupationsPage";
import CountriesPage from "./pages/admin/hr-setup/CountriesPage";
import EmploymentTypesPage from "./pages/admin/hr-setup/EmploymentTypesPage";
import WorkSchedulesPage from "./pages/admin/hr-setup/WorkSchedulesPage";
import CostCentresPage from "./pages/admin/hr-setup/CostCentresPage";
import TerminationReasonsPage from "./pages/admin/hr-setup/TerminationReasonsPage";
import GradesPage from "./pages/admin/hr-setup/GradesPage";
import CitizenshipPage from "./pages/admin/hr-setup/CitizenshipPage";
import OrganisationPage from "./pages/admin/hr-setup/OrganisationPage";
import EmployeesSetupPage from "./pages/admin/hr-setup/EmployeesSetupPage";
import CalendarSetupPage from "./pages/admin/hr-setup/CalendarSetupPage";
import SalaryPackagePage from "./pages/admin/hr-setup/SalaryPackagePage";
import CustomFieldsPage from "./pages/admin/hr-setup/CustomFieldsPage";
import ApplicantsPage from "./pages/admin/hr-setup/ApplicantsPage";
import SettingsSetupPage from "./pages/admin/hr-setup/SettingsSetupPage";
import POSSettings from "./pages/admin/POSSettings";
import { POSFilterProvider } from "./context/POSFilterContext";

// HR Reporting Pages
import EmployeeDetailsReport from "./pages/admin/hr-reports/EmployeeDetailsReport";
import TrainingExpiringReport from "./pages/admin/hr-reports/TrainingExpiringReport";
import TrainingStartingReport from "./pages/admin/hr-reports/TrainingStartingReport";
import TrainingOngoingReport from "./pages/admin/hr-reports/TrainingOngoingReport";
import BirthdaysAnniversariesReport from "./pages/admin/hr-reports/BirthdaysAnniversariesReport";
import HeadcountReport from "./pages/admin/hr-reports/HeadcountReport";
import TurnoverReport from "./pages/admin/hr-reports/TurnoverReport";
import EmploymentDatesReport from "./pages/admin/hr-reports/EmploymentDatesReport";
import PerformanceReviews from "./pages/admin/hr/PerformanceReviews";
import ServiceDayClose from "./pages/operations/ServiceDayClose";
import PreGoLive from "./pages/operations/PreGoLive";
import TasksKanban from "./pages/collab/TasksKanban";
import Inbox from "./pages/collab/Inbox";
import IntegrationsHub from "./pages/integrations/IntegrationsHub";
import POSRuntime from "./pages/pos/POSRuntime";
import POSRuntimeEnhanced from "./pages/pos/POSRuntimeEnhanced";

import DeliveryAggregators from "./pages/integrations/DeliveryAggregators";
import FinanceProviderSettings from "./pages/finance/FinanceProviderSettings";
import GoogleHub from "./pages/google/GoogleHub";
import EmployeePortal from "./pages/employee/EmployeePortal";
import POSSetup from "./pages/pos/POSSetup";
import POSMain from "./pages/pos/POSMain";
import KDSSetup from "./pages/kds/KDSSetup";
import KDSMain from "./pages/kds/KDSMain";
import KDSStations from "./pages/kds/KDSStations";
import KDSStationDetail from "./pages/kds/KDSStationDetail";
import KDSRuntime from "./pages/kds/KDSRuntime";
import DeviceManagement from "./pages/kds/DeviceManagement";
import UserProfileSettings from "./pages/UserProfileSettings";

// Ultimate & HR Advanced Pages
import ProcurementHub from "./pages/admin/procurement/ProcurementHub";
import RFQManagement from "./pages/admin/procurement/RFQManagement";
import ApprovalWorkflow from "./pages/admin/procurement/ApprovalWorkflow";
import AIInvoiceHub from "./pages/admin/ai-invoice/AIInvoiceHub";
import InvoiceOCR from "./pages/admin/ai-invoice/InvoiceOCR";
import ForecastingHub from "./pages/admin/forecasting/ForecastingHub";
import CentralKitchenHub from "./pages/admin/central-kitchen/CentralKitchenHub";
import RecipeEngineeringHub from "./pages/admin/recipe-engineering/RecipeEngineeringHub";
import QualityHub from "./pages/admin/quality/QualityHub";
import AutoOrderRules from "./pages/admin/procurement/AutoOrderRules";
import InvoiceList from "./pages/admin/ai-invoice/InvoiceList";
import ForecastingDashboard from "./pages/admin/forecasting/ForecastingDashboard";
import ProductionBatches from "./pages/admin/central-kitchen/ProductionBatches";
import RecipeList from "./pages/admin/recipe-engineering/RecipeList";
import QualityAudits from "./pages/admin/quality/QualityAudits";
import ExpenseManagementIndigo from "./pages/admin/hr/ExpenseManagement";
import PerformanceManagementIndigo from "./pages/admin/hr/PerformanceManagement";
import DocumentManagementIndigo from "./pages/admin/hr/DocumentManagement";
import HRAnalyticsIndigo from "./pages/admin/hr/HRAnalytics";
import SFMAccountingIndigo from "./pages/admin/hr/SFMAccounting";
import VarianceAnalysis from "./pages/admin/ai-invoice/VarianceAnalysis";
import SeasonalPatterns from "./pages/admin/forecasting/SeasonalPatterns";
import InternalOrders from "./pages/admin/central-kitchen/InternalOrders";
import CostAnalysis from "./pages/admin/recipe-engineering/CostAnalysis";
import VisualContentEditor from "./pages/admin/VisualContentEditor";


// Context
import { AuthProvider } from "./context/AuthContext";
import { VenueProvider } from "./context/VenueContext";
import { SafeModeProvider } from "./context/SafeModeContext";
import { RuntimeProvider } from "./context/RuntimeContext";
import { UIProvider, useUI } from "./context/UIContext";
import { ThemeProvider } from "./context/ThemeContext";
import { MultiVenueProvider } from "./context/MultiVenueContext";
import { DesignSystemProvider } from "./context/DesignSystemContext";
import { SubdomainProvider } from "./context/SubdomainContext";
import { UserSettingsProvider } from "./context/UserSettingsContext";

// Components
import LoadingOverlay from "./components/LoadingOverlay";
import ErrorModal from "./components/ErrorModal";
import ErrorBoundary from "./components/ErrorBoundary";
import AuthExpiredModal from "./components/AuthExpiredModal";
import GlobalSearch from "./components/shared/GlobalSearch";

function RootOverlays() {
  const { loading, modalError, hideErrorModal, hideLoading, authExpiredModalOpen, openAuthExpiredModal, closeAuthExpiredModal } = useUI();
  const [showVersionWarning, setShowVersionWarning] = useState(false);
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setGlobalSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    let mounted = true;
    const clearSessionHard = () => {
      localStorage.removeItem("restin_token");
      localStorage.removeItem("restin_user");
      try { delete axios.defaults.headers.common.Authorization; } catch { }
      try { delete api.defaults.headers.common.Authorization; } catch { }
    };

    (async () => {
      try {
        const v = await systemService.getVersion();
        const serverBuild = v?.build_id || "";
        const lastBuild = localStorage.getItem("last_build_id") || "";
        if (lastBuild && serverBuild && lastBuild !== serverBuild) {
          clearSessionHard();
          if (!mounted) return;
          setShowVersionWarning(true);
          openAuthExpiredModal({ reason: "DEPLOYMENT_CHANGED" });
        }
        if (serverBuild) localStorage.setItem("last_build_id", serverBuild);
      } catch (e) {
        console.warn("version check failed", e);
      }
    })();

    const onAuthExpired = (e) => {
      if (!mounted) return;
      console.log('🚨 [AUTH] Expired event received:', e.detail);
      openAuthExpiredModal({ reason: e.detail?.reason || "AUTH_EXPIRED" });
    };
    window.addEventListener("auth-expired", onAuthExpired);
    return () => {
      mounted = false;
      window.removeEventListener("auth-expired", onAuthExpired);
    };
  }, [openAuthExpiredModal]);

  return (
    <>
      {showVersionWarning && (
        <div className="fixed top-0 left-0 right-0 z-50 pointer-events-none">
          <div className="mx-auto max-w-4xl h-12 flex items-center justify-between px-4 bg-yellow-600 text-black">
            <div className="truncate"><strong>Warning:</strong> System version changed. Refresh required.</div>
            <button className="pointer-events-auto px-3 py-1 bg-black text-white rounded hover:bg-zinc-800 transition-colors" onClick={() => window.location.reload()}>Refresh Now</button>
          </div>
        </div>
      )}
      <LoadingOverlay open={loading.open} title={loading.title} body={loading.body} onCancel={() => hideLoading()} />
      <ErrorModal open={!!modalError} title={modalError?.title} body={modalError?.body} onClose={hideErrorModal} onRetry={modalError?.onRetry} />
      <AuthExpiredModal open={authExpiredModalOpen} onClose={closeAuthExpiredModal} />
      <GlobalSearch open={globalSearchOpen} onOpenChange={setGlobalSearchOpen} />
    </>
  );
}

function App() {
  useEffect(() => {
    document.documentElement.classList.add('dark');
    document.body.style.backgroundColor = '#0A0A0B';
  }, []);

  return (
    <ErrorBoundary>
      <AuthProvider>
        <MultiVenueProvider>
          <VenueProvider>
            <DesignSystemProvider>
              <SubdomainProvider>
                <UserSettingsProvider>
                  <ThemeProvider>
                    <UIProvider>
                      <POSFilterProvider>
                        <BrowserRouter>
                          <RuntimeProvider>
                            <SafeModeProvider>
                              <Routes>
                                <Route path="/" element={<MarketingLanding />} />
                                <Route path="/diag" element={<div>Router is working! Current Location: {window.location.pathname}</div>} />
                                <Route path="/technic" element={<TechnicalHub />} />
                                <Route path="/modules" element={<ModulesCatalog />} />
                                <Route path="/login" element={<Login />} />
                                <Route path="/payroll" element={<PayrollPage />} />
                                <Route path="/admin" element={<AdminLayout />}>
                                  <Route index element={<Navigate to="dashboard" replace />} />
                                  <Route path="dashboard" element={<Dashboard />} />
                                  <Route path="venues" element={<VenueSettings />} />
                                  <Route path="menu" element={<POSSettings />} />
                                  <Route path="staff" element={<StaffManagement />} />
                                  <Route path="inventory" element={<Inventory />} />
                                  <Route path="documents" element={<Documents />} />
                                  <Route path="review-risk" element={<ReviewRisk />} />
                                  <Route path="audit-logs" element={<AuditLogs />} />
                                  <Route path="floor-plans" element={<FloorPlans />} />
                                  <Route path="floor-plans/:planId/edit" element={<FloorPlanEditor />} />
                                  <Route path="menu-import" element={<MenuImportWizard />} />
                                  <Route path="guests" element={<Guests />} />
                                  <Route path="reservations" element={<Reservations />} />
                                  <Route path="reservations/timeline" element={<ReservationTimeline />} />
                                  <Route path="device-hub" element={<DeviceHub />} />
                                  <Route path="device-mapping" element={<DeviceMapping />} />
                                  <Route path="observability" element={<Observability />} />
                                  <Route path="operations" element={<Operations />} />
                                  <Route path="posdashboard" element={<POSDashboard />} />
                                  <Route path="products" element={<ProductManagement />} />
                                  <Route path="company-settings" element={<CompanySettings />} />
                                  <Route path="settings" element={<SettingsHub />} />
                                  <Route path="devices" element={<Devices />} />
                                  <Route path="app-settings" element={<RestaurantAppSettings />} />
                                  <Route path="physical-tables" element={<PhysicalTables />} />
                                  <Route path="content-studio" element={<ContentStudio />} />
                                  <Route path="logs" element={<LogsViewer />} />
                                  <Route path="finance" element={<FinanceDashboard />} />
                                  <Route path="accounting" element={<AccountingHub />} />
                                  <Route path="updates" element={<UpdatesPage />} />
                                  <Route path="reporting" element={<ReportingHub />} />
                                  <Route path="observability/logs" element={<ObservabilityLogs />} />
                                  <Route path="users" element={<Users />} />
                                  <Route path="users/:userId/access" element={<UserAccess />} />
                                  <Route path="access-control" element={<RolesPermissions />} />
                                  <Route path="theme" element={<ThemeCustomizer />} />
                                  <Route path="microservices" element={<Microservices />} />
                                  <Route path="events" element={<EventMonitor />} />
                                  <Route path="payroll-calculator" element={<PayrollCalculator />} />
                                  <Route path="suppliers" element={<SuppliersAdmin />} />
                                  <Route path="purchase-orders" element={<PurchaseOrdersAdmin />} />
                                  <Route path="receiving" element={<Receiving />} />
                                  <Route path="inventory-detail" element={<InventoryPage />} />
                                  <Route path="inventory-items" element={<InventoryItemsNew />} />
                                  <Route path="inventory-items-list" element={<InventoryItems />} />
                                  <Route path="inventory-suppliers" element={<Suppliers />} />
                                  <Route path="inventory-purchase-orders" element={<PurchaseOrdersNew />} />
                                  <Route path="inventory-stock-count" element={<StockCount />} />
                                  <Route path="inventory-waste" element={<WasteLog />} />
                                  <Route path="inventory-recipes" element={<RecipeManagement />} />
                                  <Route path="inventory-production" element={<ProductionManagement />} />
                                  <Route path="inventory-transfers" element={<StockTransfers />} />
                                  <Route path="inventory-adjustments" element={<StockAdjustments />} />
                                  <Route path="inventory-recipes-complete" element={<RecipeManagementComplete />} />
                                  <Route path="inventory-production-complete" element={<ProductionManagementComplete />} />
                                  <Route path="inventory-transfers-complete" element={<StockTransfersComplete />} />
                                  <Route path="reports/kds" element={<KDSPerformance />} />
                                  <Route path="reports/sales" element={<POSSalesReport />} />
                                  <Route path="reports/inventory" element={<InventoryReports />} />
                                  <Route path="reports/pos-sales-detailed" element={<POSSalesReport />} />
                                  <Route path="reports/kds-performance-detailed" element={<KDSPerformanceReport />} />
                                  <Route path="reports/inventory-detailed" element={<InventoryReport />} />
                                  <Route path="system-health-advanced" element={<SystemHealthDashboard />} />
                                  <Route path="monitoring" element={<MonitoringDashboard />} />
                                  <Route path="observability/testpanel" element={<TestPanel />} />
                                  <Route path="observability/error-inbox" element={<ErrorInbox />} />
                                  <Route path="analytics" element={<Analytics />} />
                                  <Route path="payroll-malta" element={<PayrollMalta />} />
                                  <Route path="accounting-malta" element={<AccountingMalta />} />
                                  <Route path="crm" element={<CRM />} />
                                  <Route path="loyalty" element={<Loyalty />} />
                                  <Route path="automations" element={<Automations />} />
                                  <Route path="connectors" element={<Connectors />} />
                                  <Route path="trust" element={<TrustDashboard />} />
                                  <Route path="system-health" element={<SystemHealth />} />
                                  <Route path="integrity" element={<Integrity />} />
                                  <Route path="advanced-observability" element={<AdvancedObservability />} />
                                  <Route path="diagnostics" element={<SelfDiagnostics />} />
                                  <Route path="service-day-close" element={<ServiceDayClose />} />
                                  <Route path="pre-go-live" element={<PreGoLive />} />
                                  <Route path="tasks-kanban" element={<TasksKanban />} />
                                  <Route path="printers" element={<Printers />} />
                                  <Route path="inbox" element={<Inbox />} />
                                  <Route path="integrations" element={<IntegrationsHub />} />
                                  <Route path="delivery-aggregators" element={<DeliveryAggregators />} />
                                  <Route path="finance-provider" element={<FinanceProviderSettings />} />
                                  <Route path="google" element={<GoogleHub />} />
                                  <Route path="procurement" element={<ProcurementHub />} />
                                  <Route path="procurement/rfq" element={<RFQManagement />} />
                                  <Route path="procurement/approval" element={<ApprovalWorkflow />} />
                                  <Route path="procurement/auto-order" element={<AutoOrderRules />} />
                                  <Route path="ai-invoice" element={<AIInvoiceHub />} />
                                  <Route path="ai-invoice/ocr" element={<InvoiceOCR />} />
                                  <Route path="ai-invoice/list" element={<InvoiceList />} />
                                  <Route path="forecasting" element={<ForecastingHub />} />
                                  <Route path="forecasting/dashboard" element={<ForecastingDashboard />} />
                                  <Route path="central-kitchen" element={<CentralKitchenHub />} />
                                  <Route path="central-kitchen/batches" element={<ProductionBatches />} />
                                  <Route path="recipe-engineering" element={<RecipeEngineeringHub />} />
                                  <Route path="recipe-engineering/list" element={<RecipeList />} />
                                  <Route path="quality" element={<QualityHub />} />
                                  <Route path="quality/audits" element={<QualityAudits />} />
                                  <Route path="hr-advanced/leave" element={<LeaveManagement />} />
                                  <Route path="hr-advanced/payroll" element={<PayrollPage />} />
                                  <Route path="hr-advanced/expense" element={<ExpenseManagementIndigo />} />
                                  <Route path="hr-advanced/performance" element={<PerformanceManagementIndigo />} />
                                  <Route path="hr-advanced/documents" element={<DocumentManagementIndigo />} />
                                  <Route path="hr-advanced/analytics" element={<HRAnalyticsIndigo />} />
                                  <Route path="hr-advanced/accounting" element={<SFMAccountingIndigo />} />
                                  <Route path="ai-invoice/variance" element={<VarianceAnalysis />} />
                                  <Route path="forecasting/seasonal" element={<SeasonalPatterns />} />
                                  <Route path="central-kitchen/orders" element={<InternalOrders />} />
                                  <Route path="recipe-engineering/cost" element={<CostAnalysis />} />
                                  <Route path="content-editor" element={<VisualContentEditor />} />

                                  <Route path="hr-reports">
                                    <Route path="employee-details" element={<EmployeeDetailsReport />} />
                                    <Route path="headcount" element={<HeadcountReport />} />
                                    <Route path="turnover" element={<TurnoverReport />} />
                                    <Route path="employment-dates" element={<EmploymentDatesReport />} />
                                    <Route path="birthdays" element={<BirthdaysAnniversariesReport />} />
                                    <Route path="training-expiring" element={<TrainingExpiringReport />} />
                                    <Route path="training-starting" element={<TrainingStartingReport />} />
                                    <Route path="training-ongoing" element={<TrainingOngoingReport />} />
                                  </Route>

                                  <Route path="hr-setup">
                                    <Route path="banks" element={<BanksPage />} />
                                    <Route path="departments" element={<DepartmentsPage />} />
                                    <Route path="locations" element={<LocationsPage />} />
                                    <Route path="occupations" element={<OccupationsPage />} />
                                    <Route path="countries" element={<CountriesPage />} />
                                    <Route path="employment-types" element={<EmploymentTypesPage />} />
                                    <Route path="work-schedules" element={<WorkSchedulesPage />} />
                                    <Route path="cost-centres" element={<CostCentresPage />} />
                                    <Route path="termination-reasons" element={<TerminationReasonsPage />} />
                                    <Route path="grades" element={<GradesPage />} />
                                    <Route path="citizenship" element={<CitizenshipPage />} />
                                    <Route path="organisation" element={<OrganisationPage />} />
                                    <Route path="employees" element={<EmployeesSetupPage />} />
                                    <Route path="calendar" element={<CalendarSetupPage />} />
                                    <Route path="salary-packages" element={<SalaryPackagePage />} />
                                    <Route path="custom-fields" element={<CustomFieldsPage />} />
                                    <Route path="applicants" element={<ApplicantsPage />} />
                                    <Route path="settings" element={<SettingsSetupPage />} />
                                  </Route>

                                  <Route path="hr">
                                    <Route index element={<HRHomeIndigoPage />} />
                                    <Route path="summary" element={<HRHomeIndigoPage />} />
                                    <Route path="dashboard" element={<SummaryDashboard />} />
                                    <Route path="people" element={<EmployeeDirectory />} />
                                    <Route path="leave-management" element={<LeaveManagement />} />
                                    <Route path="payroll" element={<PayrollPage />} />
                                    <Route path="payroll/:runId" element={<PayrollRunDetail />} />
                                    <Route path="payroll/view/:employeeId/:period" element={<PayslipViewer />} />

                                    <Route path="scheduler" element={<Scheduler />} />
                                    <Route path="clocking" element={<ClockingData />} />
                                    <Route path="import" element={<HRImport />} />
                                    <Route path="map" element={<HRMap />} />
                                    <Route path="exceptions" element={<HRExceptions />} />
                                    <Route path="devices" element={<HRDevices />} />

                                    <Route path="headcount" element={<HeadcountModule />} />
                                    <Route path="turnover" element={<TurnoverModule />} />
                                    <Route path="performance-reviews" element={<PerformanceReviews />} />
                                    <Route path="contracts" element={<ContractsIndigo />} />
                                    <Route path="tips" element={<TipsManagement />} />
                                    <Route path="reporting" element={<ReportingHubIndigo />} />
                                    <Route path="reports/:reportId" element={<ReportViewer />} />

                                    <Route path="settings" element={<AdminSettingsIndigo />} />
                                  </Route>
                                </Route>
                                <Route path="/profile" element={<UserProfileSettings />} />
                                <Route path="/employee" element={<EmployeePortal />} />
                                <Route path="/pos/setup" element={<POSSetup />} />
                                <Route path="/pos" element={<POSMain />} />
                                <Route path="/pos/runtime" element={<POSRuntimeEnhanced />} />
                                <Route path="/kds/setup" element={<KDSSetup />} />
                                <Route path="/kds" element={<KDSMain />} />
                                <Route path="/kds/runtime/:stationKey" element={<KDSRuntime />} />
                                <Route path="/book/:venueId" element={<BookingWidget />} />
                                <Route path="*" element={<Navigate to="/login" replace />} />
                              </Routes>
                              <LogRoute />
                              <RootOverlays />
                            </SafeModeProvider>
                          </RuntimeProvider>
                        </BrowserRouter>
                      </POSFilterProvider>
                    </UIProvider>
                  </ThemeProvider>
                </UserSettingsProvider>
              </SubdomainProvider>
            </DesignSystemProvider>
          </VenueProvider>
        </MultiVenueProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

const LogRoute = () => {
  const location = useLocation();
  useEffect(() => {
    console.log(`[Router] No internal match for: ${location.pathname}${location.search}${location.hash}`);
  }, [location]);
  return null;
};

export default App;
