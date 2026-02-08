import React, { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Toaster } from "sonner";
import systemService from "./services/SystemService";
import axios from "axios";
import api from "./lib/api";
import { logger } from "./lib/logger";
import BookingWidget from './pages/public/booking/BookingWidget';

// Pages
// Pages
import Login from "./pages/Login-new";
import AdminLayout from "./pages/admin/AdminLayout";
import PayrollDashboard from "./features/hr/PayrollDashboard";
import InventoryDashboard from "./features/inventory/InventoryDashboard";
import CRM from "./pages/admin/CRM";
import Loyalty from "./pages/admin/Loyalty";
import Automations from "./pages/admin/Automations";
import Connectors from "./pages/admin/Connectors";
import TrustDashboard from "./pages/observability/TrustDashboard";
import SystemHealth from "./pages/observability/SystemHealth"; // Corrected path
import Integrity from "./pages/observability/Integrity";
import AdvancedObservability from "./pages/observability/AdvancedObservability";
import SelfDiagnostics from "./pages/observability/SelfDiagnostics";
import ServiceDayClose from "./pages/operations/ServiceDayClose";
import PreGoLive from "./pages/operations/PreGoLive";
import TasksKanban from "./pages/collab/TasksKanban";
import Printers from "./pages/admin/Printers";
import Inbox from "./pages/collab/Inbox";
import IntegrationsHub from "./pages/integrations/IntegrationsHub";
import DeliveryAggregators from "./pages/integrations/DeliveryAggregators";
import FinanceProviderSettings from "./pages/finance/FinanceProviderSettings";
import GoogleHub from "./pages/google/GoogleHub";
import ProcurementHub from "./pages/admin/procurement/ProcurementHub";
import RFQManagement from "./pages/admin/procurement/RFQManagement";
import ApprovalWorkflow from "./pages/admin/procurement/ApprovalWorkflow";
import AutoOrderRules from "./pages/admin/procurement/AutoOrderRules";
import AIInvoiceHub from "./pages/admin/ai-invoice/AIInvoiceHub";
import InvoiceOCR from "./pages/admin/ai-invoice/InvoiceOCR";
import InvoiceList from "./pages/admin/ai-invoice/InvoiceList";
import ForecastingHub from "./pages/admin/forecasting/ForecastingHub";
import ForecastingDashboard from "./pages/admin/forecasting/ForecastingDashboard"; // Assuming adjacent
import CentralKitchenHub from "./pages/admin/central-kitchen/CentralKitchenHub";
import ProductionBatches from "./pages/admin/central-kitchen/ProductionBatches"; // Assuming adjacent
import RecipeEngineeringHub from "./pages/admin/recipe-engineering/RecipeEngineeringHub";
import RecipeList from "./pages/admin/recipe-engineering/RecipeList"; // Assuming adjacent
import QualityHub from "./pages/admin/quality/QualityHub";
import QualityAudits from "./pages/admin/quality/QualityAudits"; // Assuming adjacent
import LeaveManagement from "./pages/admin/hr/LeaveManagement";
import ExpenseManagementIndigo from "./pages/admin/hr/ExpenseManagement"; // Mapped from ExpenseManagement.jsx
import PerformanceManagementIndigo from "./pages/admin/hr/PerformanceManagement"; // Mapped from PerformanceManagement.jsx
import DocumentManagementIndigo from "./pages/admin/hr/DocumentManagement"; // Mapped from DocumentManagement.jsx
import HRAnalyticsIndigo from "./pages/admin/hr/HRAnalytics"; // Mapped from HRAnalytics.jsx
import SFMAccountingIndigo from "./pages/admin/hr/SFMAccounting"; // Mapped from SFMAccounting.jsx
import VarianceAnalysis from "./pages/admin/ai-invoice/VarianceAnalysis"; // Corrected path
import SeasonalPatterns from "./pages/admin/forecasting/SeasonalPatterns"; // Corrected path
import InternalOrders from "./pages/admin/central-kitchen/InternalOrders"; // Corrected path
import CostAnalysis from "./pages/admin/recipe-engineering/CostAnalysis"; // Corrected path
import VisualContentEditor from "./pages/admin/VisualContentEditor";

// HR Reports
import EmployeeDetailsReport from "./pages/admin/hr/reports/EmployeeDetailsReport"; // Verify these next if needed
import HeadcountReport from "./pages/admin/hr/reports/HeadcountReport";
import TurnoverReport from "./pages/admin/hr/reports/TurnoverReport";
import EmploymentDatesReport from "./pages/admin/hr/reports/EmploymentDatesReport";
import BirthdaysAnniversariesReport from "./pages/admin/hr/reports/BirthdaysAnniversariesReport";
import TrainingExpiringReport from "./pages/admin/hr/reports/TrainingExpiringReport";
import TrainingStartingReport from "./pages/admin/hr/reports/TrainingStartingReport";
import TrainingOngoingReport from "./pages/admin/hr/reports/TrainingOngoingReport";

// HR Setup
import BanksPage from "./pages/admin/hr/setup/BanksPage";
import DepartmentsPage from "./pages/admin/hr/setup/DepartmentsPage";
import LocationsPage from "./pages/admin/hr/setup/LocationsPage";
import OccupationsPage from "./pages/admin/hr/setup/OccupationsPage";
import CountriesPage from "./pages/admin/hr/setup/CountriesPage";
import EmploymentTypesPage from "./pages/admin/hr/setup/EmploymentTypesPage";
import WorkSchedulesPage from "./pages/admin/hr/setup/WorkSchedulesPage";
import CostCentresPage from "./pages/admin/hr/setup/CostCentresPage";
import TerminationReasonsPage from "./pages/admin/hr/setup/TerminationReasonsPage";
import GradesPage from "./pages/admin/hr/setup/GradesPage";
import CitizenshipPage from "./pages/admin/hr/setup/CitizenshipPage";
import OrganisationPage from "./pages/admin/hr/setup/OrganisationPage";
import EmployeesSetupPage from "./pages/admin/hr/setup/EmployeesSetupPage";
import CalendarSetupPage from "./pages/admin/hr/setup/CalendarSetupPage";
import SalaryPackagePage from "./pages/admin/hr/setup/SalaryPackagePage";
import CustomFieldsPage from "./pages/admin/hr/setup/CustomFieldsPage";
import ApplicantsPage from "./pages/admin/hr/setup/ApplicantsPage";
import SettingsSetupPage from "./pages/admin/hr/setup/SettingsSetupPage";

// HR Main
import HRHomeIndigoPage from "./pages/admin/hr/HRHomeIndigo";
import EmployeeDirectory from "./pages/admin/hr/EmployeeDirectory";
import EmployeeDetailPage from "./pages/admin/hr/EmployeeDetailPage";
import PayrollRunDetail from "./pages/admin/hr/PayrollRunDetail";
import PayslipViewer from "./pages/admin/hr/PayslipViewer";
import Scheduler from "./pages/admin/hr/Scheduler";
import ClockingData from "./pages/admin/hr/ClockingData";
import HRImport from "./pages/admin/hr/HRImport";
import HRMap from "./pages/admin/hr/HRMap";
import HRExceptions from "./pages/admin/hr/HRExceptions";
import HRDevices from "./pages/admin/hr/HRDevices";
import HeadcountModule from "./pages/admin/hr/HeadcountModule";
import TurnoverModule from "./pages/admin/hr/TurnoverModule";
import PerformanceReviews from "./pages/admin/hr/PerformanceReviews";
import ContractsIndigo from "./pages/admin/hr/Contracts"; // Mapped from Contracts.jsx
import TipsManagement from "./pages/admin/hr/TipsManagement";
import ReportingHubIndigo from "./pages/admin/hr/ReportingHub"; // Mapped from ReportingHub.jsx
import ReportViewer from "./pages/admin/hr/ReportViewer";
import HRModulePlaceholder from "./pages/admin/hr/HRModulePlaceholder";
import AdminSettingsIndigo from "./pages/admin/hr/AdminSettings"; // Mapped from AdminSettings.jsx
import UserProfileSettings from "./pages/UserProfileSettings";
import POSSetup from "./pages/pos/POSSetup";
import POSMain from "./pages/pos/POSMain";
import POSRuntimeEnhanced from "./pages/pos/POSRuntimeEnhanced";
import KDSSetup from "./pages/kds/KDSSetup"; // Corrected path
import KDSMain from "./pages/kds/KDSMain"; // Corrected path
import KDSRuntime from "./pages/kds/KDSRuntime"; // Corrected path
import KDSStations from "./pages/kds/KDSStations";
import KDSStationDetail from "./pages/kds/KDSStationDetail";
import KDSFeature from "./features/pos/KDSFeature";
import POSFeature from "./features/pos/POSFeature";
import MarketingLanding from "./pages/MarketingLanding";
import TechnicalHub from "./pages/TechnicalHub";
import ModulesCatalog from "./pages/ModulesCatalog";
import PayrollPage from "./pages/admin/hr/PayrollPage";
import VenueSettings from "./pages/admin/VenueSettings";
import SummaryDashboard from "./pages/admin/hr/SummaryDashboard";
import SystemDashboard from "./pages/admin/SystemDashboard";
// import Dashboard from "./pages/admin/hr/SummaryDashboard"; // REMOVED
import StaffManagement from "./pages/admin/StaffManagement";
import POSSettings from "./pages/admin/POSSettings";
import Documents from "./pages/admin/Documents";
import ReviewRisk from "./pages/admin/ReviewRisk";
import AuditLogs from "./pages/admin/AuditLogs";
import FloorPlans from "./pages/admin/FloorPlans"; // Assuming existence
import FloorPlanEditor from "./pages/admin/FloorPlanEditor"; // Assuming existence
import MenuImportWizard from "./pages/admin/MenuImportWizard";
import MigrationHub from "./pages/admin/migration/MigrationHub"; // Quick Sync
import Guests from "./pages/admin/Guests";
import Reservations from "./pages/admin/Reservations";
import ReservationTimeline from "./pages/admin/ReservationTimeline";
import DeviceHub from "./pages/admin/DeviceHub";
import DeviceMapping from "./pages/admin/DeviceMapping";
import Observability from "./pages/admin/Observability";
import Operations from "./pages/admin/Operations";
import POSDashboard from "./pages/admin/POSDashboard";
import ProductManagement from "./pages/admin/ProductManagement";
import CompanySettings from "./pages/admin/CompanySettings";
import SettingsHub from "./pages/admin/SettingsHub";
import ESGModule from "./pages/admin/hr/ESGModule";
import GovReportsPage from "./pages/admin/hr/GovReportsPage";
import SickLeaveAnalysis from "./pages/admin/hr/SickLeaveAnalysis";
import ForecastingCosts from "./pages/admin/hr/ForecastingCosts";
import EmployeePortal from "./pages/admin/hr/EmployeePortal";
import TimesheetsIndices from "./pages/admin/hr/Timesheets";

import Devices from "./pages/admin/Devices";
import RestaurantAppSettings from "./pages/admin/RestaurantAppSettings";
import PhysicalTables from "./pages/admin/PhysicalTables";
import ContentStudio from "./pages/admin/ContentStudio";
import LogsViewer from "./pages/admin/LogsViewer";
import FinanceDashboard from "./pages/admin/FinanceDashboard";
import AccountingHub from "./pages/admin/AccountingHub";
import UpdatesPage from "./pages/admin/UpdatesPage";
import ReportingHub from "./pages/admin/ReportingHub";
import ObservabilityLogs from "./pages/admin/ObservabilityLogs";
import Users from "./pages/admin/Users";
import UserAccess from "./pages/admin/UserAccess";
import RolesPermissions from "./pages/admin/RolesPermissions";
import ThemeCustomizer from "./pages/admin/ThemeCustomizer";
import Microservices from "./pages/admin/Microservices";
import EventMonitor from "./pages/admin/EventMonitor";
import PayrollCalculator from "./pages/admin/PayrollCalculator";
import SuppliersAdmin from "./pages/admin/Suppliers"; // Mapped from Suppliers.js
import PurchaseOrdersAdmin from "./pages/admin/PurchaseOrders"; // Mapped from PurchaseOrders.js
import Receiving from "./pages/admin/Receiving";
import InventoryPage from "./pages/admin/Inventory"; // Mapped from Inventory.js
import InventoryItemsNew from "./pages/admin/inventory/InventoryItemsNew"; // Scaffolding next
import InventoryItems from "./pages/admin/inventory/InventoryItems"; // Scaffolding next
import Suppliers from "./pages/admin/Suppliers";
import PurchaseOrdersNew from "./pages/admin/inventory/PurchaseOrdersNew"; // Scaffolding next
import StockCount from "./pages/admin/inventory/StockCount"; // Scaffolding next
import WasteLog from "./pages/admin/inventory/WasteLog"; // Scaffolding next
import RecipeManagement from "./pages/admin/inventory/RecipeManagement"; // Scaffolding next
import ProductionManagement from "./pages/admin/inventory/ProductionManagement"; // Scaffolding next
import StockTransfers from "./pages/admin/inventory/StockTransfers"; // Scaffolding next
import StockAdjustments from "./pages/admin/inventory/StockAdjustments"; // Scaffolding next
import RecipeManagementComplete from "./pages/admin/inventory/RecipeManagementComplete"; // Scaffolding next
import ProductionManagementComplete from "./pages/admin/inventory/ProductionManagementComplete"; // Scaffolding next
import StockTransfersComplete from "./pages/admin/inventory/StockTransfersComplete"; // Scaffolding next
import KDSPerformance from "./pages/admin/hr/reports/KDSPerformance"; // Scaffolding next
import POSSales from "./pages/reports/POSSales";
import InventoryStatus from "./pages/reports/InventoryStatus";
import POSSalesReport from "./pages/reports/POSSalesReport";
import KDSPerformanceReport from "./pages/reports/KDSPerformanceReport";
import InventoryReport from "./pages/reports/InventoryReport";
import SystemHealthDashboard from "./pages/admin/SystemHealthDashboard";
import MonitoringDashboard from "./pages/admin/MonitoringDashboard";
import TestPanel from "./pages/observability/TestPanel";
import ErrorInbox from "./pages/observability/ErrorInbox";
import Analytics from "./pages/admin/Analytics";

// HR Advanced
import PayrollMalta from "./pages/admin/hr/PayrollMalta"; // Scaffolding next
import AccountingMalta from "./pages/admin/hr/AccountingMalta"; // Scaffolding next

// RESTIN.AI Master Protocol
import WebBuilder from "./features/restin/web/WebBuilder";
import VoiceDashboard from "./features/restin/voice/VoiceDashboard";
import VoiceSettings from "./features/restin/voice/VoiceSettings";
import CallLogs from "./features/restin/voice/CallLogs";
import StudioDashboard from "./features/restin/studio/StudioDashboard";
import RadarDashboard from "./features/restin/radar/RadarDashboard";
import { CrmDashboard } from "./features/restin/crm";
import { OpsDashboard } from "./features/restin/ops";
import { FintechDashboard } from "./features/restin/fintech";
import RestinControlTower from "./pages/admin/RestinControlTower";

// AI Hub (New React Pages)
import VoiceAI from "./pages/admin/ai/VoiceAI";
import Studio from "./pages/admin/ai/Studio";
import WebBuilderAI from "./pages/admin/ai/WebBuilder";
import Radar from "./pages/admin/ai/Radar";
import CRMAI from "./pages/admin/ai/CRM";
import Fintech from "./pages/admin/ai/Fintech";
import Ops from "./pages/admin/ai/Ops";

// Context
import { AuthProvider } from "./features/auth/AuthContext";
import { VenueProvider } from "./context/VenueContext";
import { SafeModeProvider } from "./context/SafeModeContext";
import { RuntimeProvider } from "./context/RuntimeContext";
import { UIProvider, useUI } from "./context/UIContext";
import { ThemeProvider } from "./context/ThemeContext";
import { MultiVenueProvider } from "./context/MultiVenueContext";
import { DesignSystemProvider } from "./context/DesignSystemContext";
import { SubdomainProvider } from "./context/SubdomainContext";
import { UserSettingsProvider } from "./context/UserSettingsContext";
import { POSFilterProvider } from "./context/POSFilterContext";

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
    const handleKeyDown = (e: KeyboardEvent) => {
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
          // clearSessionHard(); // DISABLED: Causing loop
          if (!mounted) return;
          // setShowVersionWarning(true); // DISABLED: Causing confusion
          // openAuthExpiredModal({ reason: "DEPLOYMENT_CHANGED" });
          logger.warn('Version mismatch detected (ignored for dev)');
        }
        if (serverBuild) localStorage.setItem("last_build_id", serverBuild);
      } catch (e) {
        logger.warn('Version check failed', { error: (e as Error).message });
      }
    })();

    const onAuthExpired = (e: CustomEvent) => {
      if (!mounted) return;
      logger.debug('Auth expired event received (ignored)', { detail: e.detail });
      // openAuthExpiredModal({ reason: e.detail?.reason || "AUTH_EXPIRED" }); // DISABLED
    };
    window.addEventListener("auth-expired", onAuthExpired as EventListener);
    return () => {
      mounted = false;
      window.removeEventListener("auth-expired", onAuthExpired as EventListener);
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
                                  <Route path="dashboard" element={<SystemDashboard />} />
                                  <Route path="venues" element={<VenueSettings />} />
                                  <Route path="menu" element={<POSSettings />} />
                                  <Route path="staff" element={<StaffManagement />} />
                                  <Route path="inventory" element={<InventoryDashboard />} />
                                  <Route path="pos" element={<POSFeature />} />
                                  <Route path="kds" element={<KDSFeature />} />
                                  <Route path="documents" element={<Documents />} />
                                  <Route path="review-risk" element={<ReviewRisk />} />
                                  <Route path="audit-logs" element={<AuditLogs />} />
                                  <Route path="floor-plans" element={<FloorPlans />} />
                                  <Route path="floor-plans/:planId/edit" element={<FloorPlanEditor />} />
                                  <Route path="menu-import" element={<MenuImportWizard />} />
                                  <Route path="migration" element={<MigrationHub />} />
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
                                  <Route path="reports/sales" element={<POSSales />} />
                                  <Route path="reports/inventory" element={<InventoryStatus />} />
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

                                  {/* RESTIN.AI MASTER PROTOCOL v18.0 */}
                                  <Route path="restin">
                                    <Route index element={<RestinControlTower />} />
                                    <Route path="web" element={<WebBuilder />} />
                                    <Route path="voice" element={<VoiceDashboard />} />
                                    <Route path="voice/settings" element={<VoiceSettings />} />
                                    <Route path="voice/logs" element={<CallLogs />} />
                                    <Route path="studio" element={<StudioDashboard />} />
                                    <Route path="radar" element={<RadarDashboard />} />
                                    <Route path="crm" element={<CrmDashboard />} />
                                  </Route>

                                  {/* AI HUB - New React Pages */}
                                  <Route path="ai">
                                    <Route path="voice" element={<VoiceAI />} />
                                    <Route path="studio" element={<Studio />} />
                                    <Route path="web-builder" element={<WebBuilderAI />} />
                                    <Route path="radar" element={<Radar />} />
                                    <Route path="crm" element={<CRMAI />} />
                                    <Route path="fintech" element={<Fintech />} />
                                    <Route path="ops" element={<Ops />} />
                                  </Route>

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
                                    <Route path="people" element={<EmployeeDirectory />} />
                                    <Route path="analytics" element={<HRAnalyticsIndigo />} />
                                    <Route path="payroll" element={<PayrollPage />} />
                                    {/* Restored Legacy Modules */}
                                    <Route path="esg" element={<ESGModule />} />
                                    <Route path="gov-reports" element={<GovReportsPage />} />
                                    <Route path="sick-leave" element={<SickLeaveAnalysis />} />
                                    <Route path="forecasting-costs" element={<ForecastingCosts />} />
                                    <Route path="portal-view" element={<EmployeePortal />} />
                                    <Route path="timesheets" element={<TimesheetsIndices />} />

                                    <Route path="settings" element={<AdminSettingsIndigo />} />
                                    <Route path="contracts" element={<ContractsIndigo />} />

                                    {/* Restored Sub-Routes */}
                                    <Route path="people/:employeeCode" element={<EmployeeDetailPage />} />
                                    <Route path="leave-management" element={<LeaveManagement />} />
                                    <Route path="summary" element={<SummaryDashboard />} />
                                    <Route path="dashboard" element={<SummaryDashboard />} />
                                    <Route path="clocking" element={<ClockingData />} />

                                    <Route path="payroll" element={<PayrollDashboard />} />
                                    <Route path="payroll/:runId" element={<PayrollRunDetail />} />
                                    <Route path="payroll/view/:employeeId/:period" element={<PayslipViewer />} />

                                    <Route path="scheduler" element={<Scheduler />} />
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

                                    <Route path="reports/:reportId" element={<ReportViewer />} />

                                    {/* Missing Setup Routes - Mapped to Placeholder for now */}
                                    <Route path="setup/:moduleName" element={<HRModulePlaceholder />} />

                                    <Route path="settings" element={<AdminSettingsIndigo />} />
                                  </Route>
                                </Route>
                                <Route path="/profile" element={<UserProfileSettings />} />
                                <Route path="/pos/setup" element={<POSSetup />} />
                                <Route path="/pos" element={<POSMain />} />
                                <Route path="/pos/runtime" element={<POSRuntimeEnhanced />} />
                                <Route path="/kds/setup" element={<KDSSetup />} />
                                <Route path="/kds" element={<KDSMain />} />
                                <Route path="/kds/stations" element={<KDSStations />} />
                                <Route path="/admin/kds/stations" element={<KDSStations />} />
                                <Route path="/admin/kds/stations/:stationKey" element={<KDSStationDetail />} />
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
    logger.debug('No internal match for route', { path: location.pathname, search: location.search, hash: location.hash });
  }, [location]);
  return null;
};

export default App;
