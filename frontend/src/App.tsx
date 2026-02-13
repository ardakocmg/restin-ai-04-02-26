import React, { Suspense, useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Toaster } from "sonner";
import systemService from "./services/SystemService";
import axios from "axios";
import api from "./lib/api";
import { logger } from "./lib/logger";

// ─── EAGER: Critical path only (Login, Layout, Landing, NotFound) ─────────────
import Login from "./pages/Login-new";
const SetupWizard = React.lazy(() => import("./pages/SetupWizard"));
import AdminLayout from "./pages/admin/AdminLayout";
import MarketingLanding from "./pages/MarketingLanding";
import NotFound from "./pages/NotFound";
import RoleRoute from "./components/shared/RoleRoute";

// ─── Lazy Loading Fallback ─────────────────────────────────────────────────────
function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

// ─── LAZY: All page components (code-split per route) ─────────────────────────
const BookingWidget = React.lazy(() => import('./pages/public/booking/BookingWidget'));
const PayrollDashboard = React.lazy(() => import("./features/hr/PayrollDashboard"));
const InventoryDashboard = React.lazy(() => import("./features/inventory/InventoryDashboard"));
const CRM = React.lazy(() => import("./pages/admin/CRM"));
const Loyalty = React.lazy(() => import("./pages/admin/Loyalty"));
const Automations = React.lazy(() => import("./pages/admin/Automations"));
const Connectors = React.lazy(() => import("./pages/admin/Connectors"));
const TrustDashboard = React.lazy(() => import("./pages/observability/TrustDashboard"));
const SystemHealth = React.lazy(() => import("./pages/observability/SystemHealth"));
const Integrity = React.lazy(() => import("./pages/observability/Integrity"));
const AdvancedObservability = React.lazy(() => import("./pages/observability/AdvancedObservability"));
const SelfDiagnostics = React.lazy(() => import("./pages/observability/SelfDiagnostics"));
const ServiceDayClose = React.lazy(() => import("./pages/operations/ServiceDayClose"));
const PreGoLive = React.lazy(() => import("./pages/operations/PreGoLive"));
const TasksKanban = React.lazy(() => import("./pages/collab/TasksKanban"));
const Printers = React.lazy(() => import("./pages/admin/Printers"));
const Inbox = React.lazy(() => import("./pages/collab/Inbox"));
const IntegrationsHub = React.lazy(() => import("./pages/integrations/IntegrationsHub"));
const DeliveryAggregators = React.lazy(() => import("./pages/integrations/DeliveryAggregators"));
const FinanceProviderSettings = React.lazy(() => import("./pages/finance/FinanceProviderSettings"));
// GoogleHub consolidated into WorkspaceSettings
const WorkspaceSettings = React.lazy(() => import("./pages/google/WorkspaceSettings"));
const ProcurementHub = React.lazy(() => import("./pages/admin/procurement/ProcurementHub"));
const RFQManagement = React.lazy(() => import("./pages/admin/procurement/RFQManagement"));
const ApprovalWorkflow = React.lazy(() => import("./pages/admin/procurement/ApprovalWorkflow"));
const AutoOrderRules = React.lazy(() => import("./pages/admin/procurement/AutoOrderRules"));
const AIInvoiceHub = React.lazy(() => import("./pages/admin/ai-invoice/AIInvoiceHub"));
const InvoiceOCR = React.lazy(() => import("./pages/admin/ai-invoice/InvoiceOCR"));
const InvoiceList = React.lazy(() => import("./pages/admin/ai-invoice/InvoiceList"));
const ForecastingHub = React.lazy(() => import("./pages/admin/forecasting/ForecastingHub"));
const ForecastingDashboard = React.lazy(() => import("./pages/admin/forecasting/ForecastingDashboard"));
const CentralKitchenHub = React.lazy(() => import("./pages/admin/central-kitchen/CentralKitchenHub"));
const ProductionBatches = React.lazy(() => import("./pages/admin/central-kitchen/ProductionBatches"));
const RecipeEngineeringHub = React.lazy(() => import("./pages/admin/recipe-engineering/RecipeEngineeringHub"));
const RecipeList = React.lazy(() => import("./pages/admin/recipe-engineering/RecipeList"));
const QualityHub = React.lazy(() => import("./pages/admin/quality/QualityHub"));
const QualityAudits = React.lazy(() => import("./pages/admin/quality/QualityAudits"));
const LeaveManagement = React.lazy(() => import("./pages/admin/hr/LeaveManagement"));
const ExpenseManagementIndigo = React.lazy(() => import("./pages/admin/hr/ExpenseManagement"));
const PerformanceManagementIndigo = React.lazy(() => import("./pages/admin/hr/PerformanceManagement"));
const DocumentManagementIndigo = React.lazy(() => import("./pages/admin/hr/DocumentManagement"));
const HRAnalyticsIndigo = React.lazy(() => import("./pages/admin/hr/HRAnalytics"));
const SFMAccountingIndigo = React.lazy(() => import("./pages/admin/hr/SFMAccounting"));
const VarianceAnalysis = React.lazy(() => import("./pages/admin/ai-invoice/VarianceAnalysis"));
const SeasonalPatterns = React.lazy(() => import("./pages/admin/forecasting/SeasonalPatterns"));
const InternalOrders = React.lazy(() => import("./pages/admin/central-kitchen/InternalOrders"));
const CostAnalysis = React.lazy(() => import("./pages/admin/recipe-engineering/CostAnalysis"));
const VisualContentEditor = React.lazy(() => import("./pages/admin/VisualContentEditor"));
const TemplateList = React.lazy(() => import("./pages/templates/TemplateList"));
const TemplateEditor = React.lazy(() => import("./pages/templates/TemplateEditor"));

// HR Reports
const EmployeeDetailsReport = React.lazy(() => import("./pages/admin/hr/reports/EmployeeDetailsReport"));
const HeadcountReport = React.lazy(() => import("./pages/admin/hr/reports/HeadcountReport"));
const TurnoverReport = React.lazy(() => import("./pages/admin/hr/reports/TurnoverReport"));
const EmploymentDatesReport = React.lazy(() => import("./pages/admin/hr/reports/EmploymentDatesReport"));
const BirthdaysAnniversariesReport = React.lazy(() => import("./pages/admin/hr/reports/BirthdaysAnniversariesReport"));
const TrainingExpiringReport = React.lazy(() => import("./pages/admin/hr/reports/TrainingExpiringReport"));
const TrainingStartingReport = React.lazy(() => import("./pages/admin/hr/reports/TrainingStartingReport"));
const TrainingOngoingReport = React.lazy(() => import("./pages/admin/hr/reports/TrainingOngoingReport"));

// HR Setup
const BanksPage = React.lazy(() => import("./pages/admin/hr/setup/BanksPage"));
const DepartmentsPage = React.lazy(() => import("./pages/admin/hr/setup/DepartmentsPage"));
const LocationsPage = React.lazy(() => import("./pages/admin/hr/setup/LocationsPage"));
const OccupationsPage = React.lazy(() => import("./pages/admin/hr/setup/OccupationsPage"));
const CountriesPage = React.lazy(() => import("./pages/admin/hr/setup/CountriesPage"));
const EmploymentTypesPage = React.lazy(() => import("./pages/admin/hr/setup/EmploymentTypesPage"));
const WorkSchedulesPage = React.lazy(() => import("./pages/admin/hr/setup/WorkSchedulesPage"));
const CostCentresPage = React.lazy(() => import("./pages/admin/hr/setup/CostCentresPage"));
const TerminationReasonsPage = React.lazy(() => import("./pages/admin/hr/setup/TerminationReasonsPage"));
const GradesPage = React.lazy(() => import("./pages/admin/hr/setup/GradesPage"));
const CitizenshipPage = React.lazy(() => import("./pages/admin/hr/setup/CitizenshipPage"));
const OrganisationPage = React.lazy(() => import("./pages/admin/hr/setup/OrganisationPage"));
const EmployeesSetupPage = React.lazy(() => import("./pages/admin/hr/setup/EmployeesSetupPage"));
const CalendarSetupPage = React.lazy(() => import("./pages/admin/hr/setup/CalendarSetupPage"));
const SalaryPackagePage = React.lazy(() => import("./pages/admin/hr/setup/SalaryPackagePage"));
const CustomFieldsPage = React.lazy(() => import("./pages/admin/hr/setup/CustomFieldsPage"));
const ApplicantsPage = React.lazy(() => import("./pages/admin/hr/setup/ApplicantsPage"));
const SettingsSetupPage = React.lazy(() => import("./pages/admin/hr/setup/SettingsSetupPage"));

// HR Main
const HRHomeIndigoPage = React.lazy(() => import("./pages/admin/hr/HRHomeIndigo"));
const EmployeeDirectory = React.lazy(() => import("./pages/admin/hr/EmployeeDirectory"));
const EmployeeDetailPage = React.lazy(() => import("./pages/admin/hr/EmployeeDetailPage"));
const PayrollRunDetail = React.lazy(() => import("./pages/admin/hr/PayrollRunDetail"));
const PayslipViewer = React.lazy(() => import("./pages/admin/hr/PayslipViewer"));
const Scheduler = React.lazy(() => import("./pages/admin/hr/Scheduler"));
const ClockingData = React.lazy(() => import("./pages/admin/hr/ClockingData"));
const ManualClocking = React.lazy(() => import('./pages/admin/hr/ManualClocking'));
const AddClockEntry = React.lazy(() => import('./pages/admin/hr/AddClockEntry'));
const ApprovalCenter = React.lazy(() => import('./pages/admin/hr/ApprovalCenter'));
const ApprovalSettings = React.lazy(() => import("./pages/admin/hr/ApprovalSettings"));
const HRImport = React.lazy(() => import("./pages/admin/hr/HRImport"));
const HRMap = React.lazy(() => import("./pages/admin/hr/HRMap"));
const HRExceptions = React.lazy(() => import("./pages/admin/hr/HRExceptions"));
const HRDevices = React.lazy(() => import("./pages/admin/hr/HRDevices"));
const HeadcountModule = React.lazy(() => import("./pages/admin/hr/HeadcountModule"));
const TurnoverModule = React.lazy(() => import("./pages/admin/hr/TurnoverModule"));
const PerformanceReviews = React.lazy(() => import("./pages/admin/hr/PerformanceReviews"));
const ContractsIndigo = React.lazy(() => import("./pages/admin/hr/Contracts"));
const TipsManagement = React.lazy(() => import("./pages/admin/hr/TipsManagement"));
const ReportingHubIndigo = React.lazy(() => import("./pages/admin/hr/ReportingHub"));
const ReportViewer = React.lazy(() => import("./pages/admin/hr/ReportViewer"));
const HRModulePlaceholder = React.lazy(() => import("./pages/admin/hr/HRModulePlaceholder"));
const AdminSettingsIndigo = React.lazy(() => import("./pages/admin/hr/AdminSettings"));
const EmployeePortal = React.lazy(() => import("./pages/admin/hr/EmployeePortalComplete"));
const EmployeePayrollHistory = React.lazy(() => import("./pages/portal/EmployeePayrollHistory"));
const EmployeeSetupHub = React.lazy(() => import("./pages/admin/hr/EmployeeSetupHub"));
const Shifts = React.lazy(() => import("./pages/admin/hr/Shifts"));

const UserProfileSettings = React.lazy(() => import("./pages/UserProfileSettings"));
const POSSetup = React.lazy(() => import("./pages/pos/POSSetup"));
const POSMain = React.lazy(() => import("./pages/pos/POSMain"));
const POSRuntimeEnhanced = React.lazy(() => import("./pages/pos/POSRuntimeEnhanced"));
const KDSSetup = React.lazy(() => import("./pages/kds/KDSSetup"));
const KDSMain = React.lazy(() => import("./pages/kds/KDSMain"));
const KDSRuntime = React.lazy(() => import("./pages/kds/KDSRuntime"));
const KDSStations = React.lazy(() => import("./pages/kds/KDSStations"));
const KDSStationDetail = React.lazy(() => import("./pages/kds/KDSStationDetail"));
const KDSFeature = React.lazy(() => import("./features/pos/KDSFeature"));
const POSFeature = React.lazy(() => import("./features/pos/POSFeature"));
const TechnicalHub = React.lazy(() => import("./pages/TechnicalHub"));
const ModulesCatalog = React.lazy(() => import("./pages/ModulesCatalog"));
const PayrollPage = React.lazy(() => import("./pages/admin/hr/PayrollPage"));
const VenueSettings = React.lazy(() => import("./pages/admin/VenueSettings"));
const SummaryDashboard = React.lazy(() => import("./pages/admin/hr/SummaryDashboard"));
const SystemDashboard = React.lazy(() => import("./pages/admin/SystemDashboard"));
// StaffManagement removed — consolidated into Users.js
const POSSettings = React.lazy(() => import("./pages/admin/POSSettings"));
const Documents = React.lazy(() => import("./pages/admin/Documents"));
const ReviewRisk = React.lazy(() => import("./pages/admin/ReviewRisk"));
const AuditLogs = React.lazy(() => import("./pages/admin/AuditLogs"));
const FloorPlans = React.lazy(() => import("./pages/admin/FloorPlans"));
const FloorPlanEditor = React.lazy(() => import("./pages/admin/FloorPlanEditor"));
const MenuImportWizard = React.lazy(() => import("./pages/admin/MenuImportWizard"));
const MigrationHub = React.lazy(() => import("./pages/admin/migration/MigrationHub"));
const Guests = React.lazy(() => import("./pages/admin/Guests"));
const Reservations = React.lazy(() => import("./pages/admin/Reservations"));
const ReservationTimeline = React.lazy(() => import("./pages/admin/ReservationTimeline"));
const DeviceHub = React.lazy(() => import("./pages/admin/DeviceHub"));
const DeviceMapping = React.lazy(() => import("./pages/admin/DeviceMapping"));
const Observability = React.lazy(() => import("./pages/admin/Observability"));
const Operations = React.lazy(() => import("./pages/admin/Operations"));
const POSDashboard = React.lazy(() => import("./pages/admin/POSDashboard"));
const ProductManagement = React.lazy(() => import("./pages/admin/ProductManagement"));
const CompanySettings = React.lazy(() => import("./pages/admin/CompanySettings"));
const SettingsHub = React.lazy(() => import("./pages/admin/SettingsHub"));
const ESGModule = React.lazy(() => import("./pages/admin/hr/ESGModule"));
const GovReportsPage = React.lazy(() => import("./pages/admin/hr/GovReportsPage"));
const SickLeaveAnalysis = React.lazy(() => import("./pages/admin/hr/SickLeaveAnalysis"));
const ForecastingCosts = React.lazy(() => import("./pages/admin/hr/ForecastingCosts"));
const TimesheetsIndices = React.lazy(() => import("./pages/admin/hr/Timesheets"));
const SmartHomeDashboard = React.lazy(() => import("./pages/admin/smart-home/SmartHomeDashboard"));
const Devices = React.lazy(() => import("./pages/admin/Devices"));
const RestaurantAppSettings = React.lazy(() => import("./pages/admin/RestaurantAppSettings"));
const PhysicalTables = React.lazy(() => import("./pages/admin/PhysicalTables"));
const ContentStudio = React.lazy(() => import("./pages/admin/ContentStudio"));
const LogsViewer = React.lazy(() => import("./pages/admin/LogsViewer"));
const FinanceDashboard = React.lazy(() => import("./pages/admin/FinanceDashboard"));
const AccountingHub = React.lazy(() => import("./pages/admin/AccountingHub"));
const UpdatesPage = React.lazy(() => import("./pages/admin/UpdatesPage"));
const ReportingHub = React.lazy(() => import("./pages/admin/ReportingHub"));
const ObservabilityLogs = React.lazy(() => import("./pages/admin/ObservabilityLogs"));
const Users = React.lazy(() => import("./pages/admin/Users"));
const UserAccess = React.lazy(() => import("./pages/admin/UserAccess"));
const RolesPermissions = React.lazy(() => import("./pages/admin/RolesPermissions"));
const ThemeCustomizer = React.lazy(() => import("./pages/admin/ThemeCustomizer"));
const Microservices = React.lazy(() => import("./pages/admin/Microservices"));
const EventMonitor = React.lazy(() => import("./pages/admin/EventMonitor"));
const PayrollCalculator = React.lazy(() => import("./pages/admin/PayrollCalculator"));
const SuppliersAdmin = React.lazy(() => import("./pages/admin/Suppliers"));
const PurchaseOrdersAdmin = React.lazy(() => import("./pages/admin/PurchaseOrders"));
const Receiving = React.lazy(() => import("./pages/admin/Receiving"));
const InventoryPage = React.lazy(() => import("./pages/admin/Inventory"));
const InventoryItemsNew = React.lazy(() => import("./pages/admin/inventory/InventoryItemsNew"));
// const InventoryItems = React.lazy(() => import("./pages/admin/inventory/InventoryItems")); // Removed - file deleted
const Suppliers = React.lazy(() => import("./pages/admin/Suppliers"));
const PurchaseOrdersNew = React.lazy(() => import("./pages/admin/inventory/PurchaseOrdersNew"));
const StockCount = React.lazy(() => import("./pages/admin/inventory/StockCount"));
const WasteLog = React.lazy(() => import("./pages/admin/inventory/WasteLog"));
const RecipeManagement = React.lazy(() => import("./pages/admin/inventory/RecipeManagementComplete"));
const ProductionManagement = React.lazy(() => import("./pages/admin/inventory/ProductionManagementComplete"));
const StockTransfers = React.lazy(() => import("./pages/admin/inventory/StockTransfersComplete"));
const StockAdjustments = React.lazy(() => import("./pages/admin/inventory/StockAdjustments"));
const KDSPerformance = React.lazy(() => import("./pages/admin/hr/reports/KDSPerformance"));
const POSSales = React.lazy(() => import("./pages/reports/POSSales"));
const InventoryStatus = React.lazy(() => import("./pages/reports/InventoryStatus"));
const POSSalesReport = React.lazy(() => import("./pages/reports/POSSalesReport"));
const KDSPerformanceReport = React.lazy(() => import("./pages/reports/KDSPerformanceReport"));
const InventoryReport = React.lazy(() => import("./pages/reports/InventoryReport"));
const SystemHealthDashboard = React.lazy(() => import("./pages/admin/SystemHealthDashboard"));
const MonitoringDashboard = React.lazy(() => import("./pages/admin/MonitoringDashboard"));
const TestPanel = React.lazy(() => import("./pages/observability/TestPanel"));
const ErrorInbox = React.lazy(() => import("./pages/observability/ErrorInbox"));
const Analytics = React.lazy(() => import("./pages/admin/Analytics"));
const PayrollMalta = React.lazy(() => import("./pages/admin/hr/PayrollMalta"));
const AccountingMalta = React.lazy(() => import("./pages/admin/hr/AccountingMalta"));

// RESTIN.AI Master Protocol
const WebBuilder = React.lazy(() => import("./features/restin/web/WebBuilder"));
const VoiceDashboard = React.lazy(() => import("./features/restin/voice/VoiceDashboard"));
const VoiceSettings = React.lazy(() => import("./features/restin/voice/VoiceSettings"));
const CallLogs = React.lazy(() => import("./features/restin/voice/CallLogs"));
const StudioDashboard = React.lazy(() => import("./features/restin/studio/StudioDashboard"));
const RadarDashboard = React.lazy(() => import("./features/restin/radar/RadarDashboard"));
const CrmDashboard = React.lazy(() => import("./features/restin/crm").then(m => ({ default: m.CrmDashboard })));
const OpsDashboard = React.lazy(() => import("./features/restin/ops").then(m => ({ default: m.OpsDashboard })));
const FintechDashboard = React.lazy(() => import("./features/restin/fintech").then(m => ({ default: m.FintechDashboard })));
const RestinControlTower = React.lazy(() => import("./pages/admin/RestinControlTower"));
const FeatureFlagAdmin = React.lazy(() => import("./pages/admin/settings/FeatureFlagAdmin"));
const DynamicPricingPage = React.lazy(() => import("./pages/admin/pricing/DynamicPricingPage"));
const HACCPChecklists = React.lazy(() => import("./pages/admin/compliance/HACCPChecklists"));
const DataExportPage = React.lazy(() => import("./pages/admin/settings/DataExportPage"));
const OnboardingWizard = React.lazy(() => import("./pages/admin/onboarding/SetupWizard"));
const GuestProfiles = React.lazy(() => import("./pages/admin/guests/GuestProfiles"));
const StaffGamification = React.lazy(() => import("./pages/admin/staff/GamificationDashboard"));
const HiveDashboard = React.lazy(() => import("./pages/collab/HiveDashboard"));
const KioskModePage = React.lazy(() => import("./pages/admin/pos/KioskModePage"));
const CarbonFootprint = React.lazy(() => import("./pages/admin/sustainability/CarbonFootprint"));
const CompetitorMonitoring = React.lazy(() => import("./pages/admin/radar/CompetitorMonitoring"));
const FloorplanEditor = React.lazy(() => import("./pages/admin/floorplan/FloorplanEditor"));
const SplitBillPage = React.lazy(() => import("./pages/admin/pos/SplitBillPage"));
const PrintPreviewPage = React.lazy(() => import("./pages/admin/pos/PrintPreviewPage"));
const RecipeVideoBites = React.lazy(() => import("./pages/admin/training/RecipeVideoBites"));
const PluginMarketplace = React.lazy(() => import("./pages/admin/marketplace/PluginMarketplace"));
const DoorAccessControl = React.lazy(() => import("./pages/admin/door-access/DoorAccessControl"));
const BillingDashboard = React.lazy(() => import('./pages/admin/billing/BillingDashboard'));
const SyncDashboard = React.lazy(() => import('./pages/admin/sync/SyncDashboard'));

// AI Hub
const VoiceAI = React.lazy(() => import("./pages/admin/ai/VoiceAI"));
const Studio = React.lazy(() => import("./pages/admin/ai/Studio"));
const WebBuilderAI = React.lazy(() => import("./pages/admin/ai/WebBuilder"));
const Radar = React.lazy(() => import("./pages/admin/ai/Radar"));
const CRMAI = React.lazy(() => import("./pages/admin/ai/CRM"));
const Fintech = React.lazy(() => import("./pages/admin/ai/Fintech"));
const Ops = React.lazy(() => import("./pages/admin/ai/Ops"));

// Context (keep eager — these wrap the entire app)
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

// Components (keep eager — used at root level)
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
  // Theme is now handled by ThemeContext
  // useEffect(() => {
  //   document.documentElement.classList.add('dark');
  //   document.body.style.backgroundColor = '#0A0A0B';
  // }, []);

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
                              <Suspense fallback={<PageLoader />}>
                                <Routes>
                                  <Route path="/" element={<MarketingLanding />} />
                                  <Route path="/diag" element={<div>Router is working! Current Location: {window.location.pathname}</div>} />
                                  <Route path="/technic" element={<TechnicalHub />} />
                                  <Route path="/modules" element={<ModulesCatalog />} />
                                  <Route path="/login" element={<Login />} />
                                  <Route path="/setup" element={<React.Suspense fallback={<div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-400">Loading...</div>}><SetupWizard /></React.Suspense>} />
                                  <Route path="/profile" element={<Navigate to="/admin/profile" replace />} />
                                  <Route path="/payroll" element={<PayrollPage />} />
                                  <Route path="/admin" element={<AdminLayout />}>
                                    <Route index element={<Navigate to="dashboard" replace />} />
                                    <Route path="dashboard" element={<RoleRoute requiredRole="MANAGER"><SystemDashboard /></RoleRoute>} />
                                    {/* NOTE: dashboard is STAFF-accessible (no guard) */}
                                    <Route path="venues" element={<RoleRoute requiredRole="OWNER"><VenueSettings /></RoleRoute>} />
                                    <Route path="menu" element={<RoleRoute requiredRole="MANAGER"><POSSettings /></RoleRoute>} />
                                    {/* staff route removed — Users accessible at /admin/users */}
                                    <Route path="inventory" element={<RoleRoute requiredRole="MANAGER"><InventoryDashboard /></RoleRoute>} />
                                    <Route path="pos" element={<RoleRoute requiredRole="MANAGER"><POSFeature /></RoleRoute>} />
                                    <Route path="kds" element={<RoleRoute requiredRole="MANAGER"><KDSFeature /></RoleRoute>} />
                                    <Route path="documents" element={<RoleRoute requiredRole="MANAGER"><Documents /></RoleRoute>} />
                                    <Route path="review-risk" element={<RoleRoute requiredRole="MANAGER"><ReviewRisk /></RoleRoute>} />
                                    <Route path="audit-logs" element={<RoleRoute requiredRole="OWNER"><AuditLogs /></RoleRoute>} />
                                    <Route path="floor-plans" element={<RoleRoute requiredRole="MANAGER"><FloorPlans /></RoleRoute>} />
                                    <Route path="floor-plans/:planId/edit" element={<RoleRoute requiredRole="MANAGER"><FloorPlanEditor /></RoleRoute>} />
                                    <Route path="menu-import" element={<RoleRoute requiredRole="OWNER"><MenuImportWizard /></RoleRoute>} />
                                    <Route path="migration" element={<RoleRoute requiredRole="OWNER"><MigrationHub /></RoleRoute>} />
                                    <Route path="guests" element={<RoleRoute requiredRole="MANAGER"><Guests /></RoleRoute>} />
                                    <Route path="reservations" element={<RoleRoute requiredRole="MANAGER"><Reservations /></RoleRoute>} />
                                    <Route path="reservations/timeline" element={<RoleRoute requiredRole="MANAGER"><ReservationTimeline /></RoleRoute>} />
                                    <Route path="device-hub" element={<RoleRoute requiredRole="MANAGER"><DeviceHub /></RoleRoute>} />
                                    <Route path="device-mapping" element={<RoleRoute requiredRole="MANAGER"><DeviceMapping /></RoleRoute>} />
                                    <Route path="observability" element={<RoleRoute requiredRole="MANAGER"><Observability /></RoleRoute>} />
                                    <Route path="operations" element={<RoleRoute requiredRole="MANAGER"><Operations /></RoleRoute>} />
                                    <Route path="posdashboard" element={<RoleRoute requiredRole="MANAGER"><POSDashboard /></RoleRoute>} />
                                    <Route path="pos-dashboard" element={<RoleRoute requiredRole="MANAGER"><POSDashboard /></RoleRoute>} />
                                    <Route path="products" element={<RoleRoute requiredRole="MANAGER"><ProductManagement /></RoleRoute>} />
                                    <Route path="company-settings" element={<RoleRoute requiredRole="OWNER"><CompanySettings /></RoleRoute>} />
                                    <Route path="settings" element={<RoleRoute requiredRole="OWNER"><SettingsHub /></RoleRoute>} />
                                    <Route path="devices" element={<RoleRoute requiredRole="MANAGER"><Devices /></RoleRoute>} />
                                    <Route path="app-settings" element={<RoleRoute requiredRole="OWNER"><RestaurantAppSettings /></RoleRoute>} />
                                    <Route path="physical-tables" element={<RoleRoute requiredRole="MANAGER"><PhysicalTables /></RoleRoute>} />
                                    <Route path="content-studio" element={<RoleRoute requiredRole="OWNER"><ContentStudio /></RoleRoute>} />
                                    <Route path="templates" element={<RoleRoute requiredRole="MANAGER"><TemplateList /></RoleRoute>} />
                                    <Route path="templates/new" element={<RoleRoute requiredRole="MANAGER"><TemplateEditor /></RoleRoute>} />
                                    <Route path="templates/:id" element={<RoleRoute requiredRole="MANAGER"><TemplateEditor /></RoleRoute>} />
                                    <Route path="logs" element={<RoleRoute requiredRole="OWNER"><LogsViewer /></RoleRoute>} />
                                    <Route path="finance" element={<RoleRoute requiredRole="OWNER"><FinanceDashboard /></RoleRoute>} />
                                    <Route path="accounting" element={<RoleRoute requiredRole="OWNER"><AccountingHub /></RoleRoute>} />
                                    <Route path="updates" element={<RoleRoute requiredRole="OWNER"><UpdatesPage /></RoleRoute>} />
                                    <Route path="reporting" element={<RoleRoute requiredRole="MANAGER"><ReportingHub /></RoleRoute>} />
                                    <Route path="observability/logs" element={<RoleRoute requiredRole="OWNER"><ObservabilityLogs /></RoleRoute>} />
                                    <Route path="users" element={<RoleRoute requiredRole="OWNER"><Users /></RoleRoute>} />
                                    <Route path="users/:userId/access" element={<RoleRoute requiredRole="OWNER"><UserAccess /></RoleRoute>} />
                                    <Route path="access-control" element={<RoleRoute requiredRole="OWNER"><RolesPermissions /></RoleRoute>} />
                                    <Route path="door-access" element={<RoleRoute requiredRole="OWNER"><DoorAccessControl /></RoleRoute>} />
                                    <Route path="billing" element={<RoleRoute requiredRole="OWNER"><BillingDashboard /></RoleRoute>} />
                                    <Route path="theme" element={<RoleRoute requiredRole="OWNER"><ThemeCustomizer /></RoleRoute>} />
                                    <Route path="microservices" element={<RoleRoute requiredRole="OWNER"><Microservices /></RoleRoute>} />
                                    <Route path="events" element={<RoleRoute requiredRole="OWNER"><EventMonitor /></RoleRoute>} />
                                    <Route path="payroll-calculator" element={<RoleRoute requiredRole="OWNER"><PayrollCalculator /></RoleRoute>} />
                                    <Route path="suppliers" element={<RoleRoute requiredRole="OWNER"><SuppliersAdmin /></RoleRoute>} />
                                    <Route path="purchase-orders" element={<RoleRoute requiredRole="OWNER"><PurchaseOrdersAdmin /></RoleRoute>} />
                                    <Route path="receiving" element={<RoleRoute requiredRole="MANAGER"><Receiving /></RoleRoute>} />
                                    <Route path="inventory-detail" element={<RoleRoute requiredRole="MANAGER"><InventoryPage /></RoleRoute>} />
                                    <Route path="inventory-items" element={<RoleRoute requiredRole="MANAGER"><InventoryItemsNew /></RoleRoute>} />
                                    <Route path="inventory-items-list" element={<RoleRoute requiredRole="MANAGER"><InventoryItemsNew /></RoleRoute>} />
                                    <Route path="inventory-suppliers" element={<RoleRoute requiredRole="OWNER"><Suppliers /></RoleRoute>} />
                                    <Route path="inventory-purchase-orders" element={<RoleRoute requiredRole="OWNER"><PurchaseOrdersNew /></RoleRoute>} />
                                    <Route path="inventory-stock-count" element={<RoleRoute requiredRole="MANAGER"><StockCount /></RoleRoute>} />
                                    <Route path="inventory-waste" element={<RoleRoute requiredRole="MANAGER"><WasteLog /></RoleRoute>} />
                                    <Route path="inventory-recipes" element={<RoleRoute requiredRole="OWNER"><RecipeManagement /></RoleRoute>} />
                                    <Route path="inventory-production" element={<RoleRoute requiredRole="MANAGER"><ProductionManagement /></RoleRoute>} />
                                    <Route path="inventory-transfers" element={<RoleRoute requiredRole="OWNER"><StockTransfers /></RoleRoute>} />
                                    <Route path="inventory-adjustments" element={<RoleRoute requiredRole="OWNER"><StockAdjustments /></RoleRoute>} />
                                    {/* Consolidated: old 'Complete' routes removed, primary routes now use Complete components */}
                                    <Route path="reports/kds" element={<RoleRoute requiredRole="MANAGER"><KDSPerformance /></RoleRoute>} />
                                    <Route path="reports/sales" element={<RoleRoute requiredRole="MANAGER"><POSSales /></RoleRoute>} />
                                    <Route path="reports/inventory" element={<RoleRoute requiredRole="MANAGER"><InventoryStatus /></RoleRoute>} />
                                    <Route path="reports/pos-sales-detailed" element={<RoleRoute requiredRole="MANAGER"><POSSalesReport /></RoleRoute>} />
                                    <Route path="reports/kds-performance-detailed" element={<RoleRoute requiredRole="MANAGER"><KDSPerformanceReport /></RoleRoute>} />
                                    <Route path="reports/inventory-detailed" element={<RoleRoute requiredRole="MANAGER"><InventoryReport /></RoleRoute>} />
                                    <Route path="system-health-advanced" element={<RoleRoute requiredRole="OWNER"><SystemHealthDashboard /></RoleRoute>} />
                                    <Route path="monitoring" element={<RoleRoute requiredRole="OWNER"><MonitoringDashboard /></RoleRoute>} />
                                    <Route path="observability/testpanel" element={<RoleRoute requiredRole="OWNER"><TestPanel /></RoleRoute>} />
                                    <Route path="observability/error-inbox" element={<RoleRoute requiredRole="OWNER"><ErrorInbox /></RoleRoute>} />
                                    <Route path="analytics" element={<RoleRoute requiredRole="MANAGER"><Analytics /></RoleRoute>} />
                                    <Route path="payroll-malta" element={<RoleRoute requiredRole="OWNER"><PayrollMalta /></RoleRoute>} />
                                    <Route path="accounting-malta" element={<RoleRoute requiredRole="OWNER"><AccountingMalta /></RoleRoute>} />
                                    <Route path="crm" element={<RoleRoute requiredRole="MANAGER"><CRM /></RoleRoute>} />
                                    <Route path="loyalty" element={<RoleRoute requiredRole="MANAGER"><Loyalty /></RoleRoute>} />
                                    <Route path="automations" element={<RoleRoute requiredRole="OWNER"><Automations /></RoleRoute>} />
                                    <Route path="connectors" element={<RoleRoute requiredRole="OWNER"><Connectors /></RoleRoute>} />
                                    <Route path="trust" element={<RoleRoute requiredRole="OWNER"><TrustDashboard /></RoleRoute>} />
                                    <Route path="system-health" element={<RoleRoute requiredRole="OWNER"><SystemHealth /></RoleRoute>} />
                                    <Route path="integrity" element={<RoleRoute requiredRole="OWNER"><Integrity /></RoleRoute>} />
                                    <Route path="advanced-observability" element={<RoleRoute requiredRole="OWNER"><AdvancedObservability /></RoleRoute>} />
                                    <Route path="diagnostics" element={<RoleRoute requiredRole="OWNER"><SelfDiagnostics /></RoleRoute>} />
                                    <Route path="service-day-close" element={<RoleRoute requiredRole="MANAGER"><ServiceDayClose /></RoleRoute>} />
                                    <Route path="pre-go-live" element={<RoleRoute requiredRole="OWNER"><PreGoLive /></RoleRoute>} />
                                    <Route path="tasks-kanban" element={<RoleRoute requiredRole="STAFF"><TasksKanban /></RoleRoute>} />
                                    <Route path="printers" element={<RoleRoute requiredRole="MANAGER"><Printers /></RoleRoute>} />
                                    <Route path="inbox" element={<RoleRoute requiredRole="STAFF"><Inbox /></RoleRoute>} />
                                    <Route path="smart-home" element={<RoleRoute requiredRole="OWNER"><SmartHomeDashboard /></RoleRoute>} />
                                    <Route path="integrations" element={<RoleRoute requiredRole="OWNER"><IntegrationsHub /></RoleRoute>} />
                                    <Route path="delivery-aggregators" element={<RoleRoute requiredRole="OWNER"><DeliveryAggregators /></RoleRoute>} />
                                    <Route path="finance-provider" element={<RoleRoute requiredRole="OWNER"><FinanceProviderSettings /></RoleRoute>} />
                                    {/* Google Hub Consolidated into WorkspaceSettings - Manager Access for Operations */}
                                    <Route path="google-workspace" element={<RoleRoute requiredRole="MANAGER"><WorkspaceSettings /></RoleRoute>} />
                                    <Route path="procurement" element={<RoleRoute requiredRole="OWNER"><ProcurementHub /></RoleRoute>} />
                                    <Route path="procurement/rfq" element={<RoleRoute requiredRole="OWNER"><RFQManagement /></RoleRoute>} />
                                    <Route path="procurement/approval" element={<RoleRoute requiredRole="OWNER"><ApprovalWorkflow /></RoleRoute>} />
                                    <Route path="procurement/auto-order" element={<RoleRoute requiredRole="OWNER"><AutoOrderRules /></RoleRoute>} />
                                    <Route path="ai-invoice" element={<RoleRoute requiredRole="OWNER"><AIInvoiceHub /></RoleRoute>} />
                                    <Route path="ai-invoice/ocr" element={<RoleRoute requiredRole="OWNER"><InvoiceOCR /></RoleRoute>} />
                                    <Route path="ai-invoice/list" element={<RoleRoute requiredRole="OWNER"><InvoiceList /></RoleRoute>} />
                                    <Route path="forecasting" element={<RoleRoute requiredRole="OWNER"><ForecastingHub /></RoleRoute>} />
                                    <Route path="forecasting/dashboard" element={<RoleRoute requiredRole="OWNER"><ForecastingDashboard /></RoleRoute>} />
                                    <Route path="central-kitchen" element={<RoleRoute requiredRole="OWNER"><CentralKitchenHub /></RoleRoute>} />
                                    <Route path="central-kitchen/batches" element={<RoleRoute requiredRole="OWNER"><ProductionBatches /></RoleRoute>} />
                                    <Route path="recipe-engineering" element={<RoleRoute requiredRole="OWNER"><RecipeEngineeringHub /></RoleRoute>} />
                                    <Route path="recipe-engineering/list" element={<RoleRoute requiredRole="OWNER"><RecipeList /></RoleRoute>} />
                                    <Route path="quality" element={<RoleRoute requiredRole="OWNER"><QualityHub /></RoleRoute>} />
                                    <Route path="quality/audits" element={<RoleRoute requiredRole="OWNER"><QualityAudits /></RoleRoute>} />
                                    <Route path="hr-advanced/leave" element={<RoleRoute requiredRole="MANAGER"><LeaveManagement /></RoleRoute>} />
                                    <Route path="hr-advanced/payroll" element={<RoleRoute requiredRole="OWNER"><PayrollPage /></RoleRoute>} />
                                    <Route path="hr-advanced/expense" element={<RoleRoute requiredRole="MANAGER"><ExpenseManagementIndigo /></RoleRoute>} />
                                    <Route path="hr-advanced/performance" element={<RoleRoute requiredRole="MANAGER"><PerformanceManagementIndigo /></RoleRoute>} />
                                    <Route path="hr-advanced/documents" element={<RoleRoute requiredRole="MANAGER"><DocumentManagementIndigo /></RoleRoute>} />
                                    <Route path="hr-advanced/analytics" element={<RoleRoute requiredRole="OWNER"><HRAnalyticsIndigo /></RoleRoute>} />
                                    <Route path="hr-advanced/accounting" element={<RoleRoute requiredRole="OWNER"><SFMAccountingIndigo /></RoleRoute>} />
                                    <Route path="ai-invoice/variance" element={<RoleRoute requiredRole="OWNER"><VarianceAnalysis /></RoleRoute>} />
                                    <Route path="forecasting/seasonal" element={<RoleRoute requiredRole="OWNER"><SeasonalPatterns /></RoleRoute>} />
                                    <Route path="central-kitchen/orders" element={<RoleRoute requiredRole="OWNER"><InternalOrders /></RoleRoute>} />
                                    <Route path="recipe-engineering/cost" element={<RoleRoute requiredRole="OWNER"><CostAnalysis /></RoleRoute>} />
                                    <Route path="content-editor" element={<RoleRoute requiredRole="OWNER"><VisualContentEditor /></RoleRoute>} />
                                    <Route path="feature-flags" element={<RoleRoute requiredRole="OWNER"><FeatureFlagAdmin /></RoleRoute>} />
                                    <Route path="dynamic-pricing" element={<RoleRoute requiredRole="OWNER"><DynamicPricingPage /></RoleRoute>} />
                                    <Route path="haccp" element={<RoleRoute requiredRole="MANAGER"><HACCPChecklists /></RoleRoute>} />
                                    <Route path="data-export" element={<RoleRoute requiredRole="OWNER"><DataExportPage /></RoleRoute>} />
                                    <Route path="setup-wizard" element={<RoleRoute requiredRole="OWNER"><OnboardingWizard /></RoleRoute>} />
                                    <Route path="guest-profiles" element={<RoleRoute requiredRole="MANAGER"><GuestProfiles /></RoleRoute>} />
                                    <Route path="staff-gamification" element={<RoleRoute requiredRole="STAFF"><StaffGamification /></RoleRoute>} />
                                    <Route path="kiosk-mode" element={<RoleRoute requiredRole="OWNER"><KioskModePage /></RoleRoute>} />
                                    <Route path="carbon-footprint" element={<RoleRoute requiredRole="OWNER"><CarbonFootprint /></RoleRoute>} />
                                    <Route path="competitor-monitoring" element={<RoleRoute requiredRole="OWNER"><CompetitorMonitoring /></RoleRoute>} />
                                    <Route path="floorplan" element={<RoleRoute requiredRole="MANAGER"><FloorplanEditor /></RoleRoute>} />
                                    <Route path="split-bill" element={<RoleRoute requiredRole="MANAGER"><SplitBillPage /></RoleRoute>} />
                                    <Route path="print-preview" element={<RoleRoute requiredRole="MANAGER"><PrintPreviewPage /></RoleRoute>} />
                                    <Route path="recipe-videos" element={<RoleRoute requiredRole="OWNER"><RecipeVideoBites /></RoleRoute>} />
                                    <Route path="plugin-marketplace" element={<RoleRoute requiredRole="OWNER"><PluginMarketplace /></RoleRoute>} />
                                    {/* door-access route is defined above at line ~414 */}
                                    <Route path="sync" element={<RoleRoute requiredRole="OWNER"><SyncDashboard /></RoleRoute>} />

                                    {/* RESTIN.AI MASTER PROTOCOL v18.0 */}
                                    <Route path="restin">
                                      <Route index element={<RoleRoute requiredRole="OWNER"><RestinControlTower /></RoleRoute>} />
                                      <Route path="web" element={<RoleRoute requiredRole="OWNER"><WebBuilder /></RoleRoute>} />
                                      <Route path="voice" element={<RoleRoute requiredRole="OWNER"><VoiceDashboard /></RoleRoute>} />
                                      <Route path="voice/settings" element={<RoleRoute requiredRole="OWNER"><VoiceSettings /></RoleRoute>} />
                                      <Route path="voice/logs" element={<RoleRoute requiredRole="OWNER"><CallLogs /></RoleRoute>} />
                                      <Route path="studio" element={<RoleRoute requiredRole="OWNER"><StudioDashboard /></RoleRoute>} />
                                      <Route path="radar" element={<RoleRoute requiredRole="OWNER"><RadarDashboard /></RoleRoute>} />
                                      <Route path="crm" element={<RoleRoute requiredRole="OWNER"><CrmDashboard /></RoleRoute>} />
                                    </Route>

                                    {/* AI HUB - New React Pages */}
                                    <Route path="ai">
                                      <Route path="voice" element={<RoleRoute requiredRole="OWNER"><VoiceAI /></RoleRoute>} />
                                      <Route path="studio" element={<RoleRoute requiredRole="OWNER"><Studio /></RoleRoute>} />
                                      <Route path="web-builder" element={<RoleRoute requiredRole="OWNER"><WebBuilderAI /></RoleRoute>} />
                                      <Route path="radar" element={<RoleRoute requiredRole="OWNER"><Radar /></RoleRoute>} />
                                      <Route path="crm" element={<RoleRoute requiredRole="OWNER"><CRMAI /></RoleRoute>} />
                                      <Route path="fintech" element={<RoleRoute requiredRole="OWNER"><Fintech /></RoleRoute>} />
                                      <Route path="ops" element={<RoleRoute requiredRole="OWNER"><Ops /></RoleRoute>} />
                                    </Route>

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

                                    <Route path="hr">
                                      <Route index element={<RoleRoute requiredRole="MANAGER"><HRHomeIndigoPage /></RoleRoute>} />
                                      <Route path="people" element={<RoleRoute requiredRole="MANAGER"><EmployeeDirectory /></RoleRoute>} />
                                      <Route path="analytics" element={<RoleRoute requiredRole="OWNER"><HRAnalyticsIndigo /></RoleRoute>} />
                                      <Route path="payroll" element={<RoleRoute requiredRole="OWNER"><PayrollPage /></RoleRoute>} />
                                      {/* Restored Legacy Modules */}
                                      <Route path="esg" element={<RoleRoute requiredRole="OWNER"><ESGModule /></RoleRoute>} />
                                      <Route path="gov-reports" element={<RoleRoute requiredRole="OWNER"><GovReportsPage /></RoleRoute>} />
                                      <Route path="sick-leave" element={<RoleRoute requiredRole="OWNER"><SickLeaveAnalysis /></RoleRoute>} />
                                      <Route path="forecasting-costs" element={<RoleRoute requiredRole="OWNER"><ForecastingCosts /></RoleRoute>} />
                                      <Route path="portal-view" element={<RoleRoute requiredRole="MANAGER"><EmployeePortal /></RoleRoute>} />
                                      <Route path="timesheets" element={<RoleRoute requiredRole="MANAGER"><TimesheetsIndices /></RoleRoute>} />

                                      <Route path="settings" element={<RoleRoute requiredRole="OWNER"><AdminSettingsIndigo /></RoleRoute>} />
                                      <Route path="contracts" element={<RoleRoute requiredRole="OWNER"><ContractsIndigo /></RoleRoute>} />

                                      {/* Restored Sub-Routes */}
                                      <Route path="people/:employeeCode" element={<RoleRoute requiredRole="MANAGER"><EmployeeDetailPage /></RoleRoute>} />
                                      <Route path="leave-management" element={<RoleRoute requiredRole="MANAGER"><LeaveManagement /></RoleRoute>} />
                                      <Route path="summary" element={<RoleRoute requiredRole="MANAGER"><SummaryDashboard /></RoleRoute>} />
                                      <Route path="dashboard" element={<RoleRoute requiredRole="MANAGER"><SummaryDashboard /></RoleRoute>} />
                                      <Route path="clocking" element={<RoleRoute requiredRole="MANAGER"><ClockingData /></RoleRoute>} />
                                      <Route path="manual-clocking" element={<ManualClocking />} />
                                      <Route path="clocking/add" element={<RoleRoute requiredRole="STAFF"><AddClockEntry /></RoleRoute>} />
                                      <Route path="approvals" element={<RoleRoute requiredRole="STAFF"><ApprovalCenter /></RoleRoute>} />
                                      <Route path="approval-settings" element={<RoleRoute requiredRole="OWNER"><ApprovalSettings /></RoleRoute>} />

                                      {/* Duplicate payroll route removed — PayrollPage at line 574 is the canonical route */}
                                      <Route path="payroll/:runId" element={<RoleRoute requiredRole="OWNER"><PayrollRunDetail /></RoleRoute>} />
                                      <Route path="payroll/view/:employeeId/:period" element={<RoleRoute requiredRole="OWNER"><PayslipViewer /></RoleRoute>} />

                                      <Route path="scheduler" element={<RoleRoute requiredRole="MANAGER"><Scheduler /></RoleRoute>} />
                                      <Route path="import" element={<RoleRoute requiredRole="OWNER"><HRImport /></RoleRoute>} />
                                      <Route path="map" element={<RoleRoute requiredRole="MANAGER"><HRMap /></RoleRoute>} />
                                      <Route path="exceptions" element={<RoleRoute requiredRole="MANAGER"><HRExceptions /></RoleRoute>} />
                                      <Route path="devices" element={<RoleRoute requiredRole="MANAGER"><HRDevices /></RoleRoute>} />

                                      <Route path="headcount" element={<RoleRoute requiredRole="OWNER"><HeadcountModule /></RoleRoute>} />
                                      <Route path="turnover" element={<RoleRoute requiredRole="OWNER"><TurnoverModule /></RoleRoute>} />
                                      <Route path="performance-reviews" element={<RoleRoute requiredRole="MANAGER"><PerformanceReviews /></RoleRoute>} />
                                      <Route path="tips" element={<RoleRoute requiredRole="MANAGER"><TipsManagement /></RoleRoute>} />
                                      <Route path="reporting" element={<RoleRoute requiredRole="MANAGER"><ReportingHubIndigo /></RoleRoute>} />
                                      <Route path="reports/:reportId" element={<RoleRoute requiredRole="MANAGER"><ReportViewer /></RoleRoute>} />

                                      {/* Missing Setup Routes - Mapped to Placeholder for now */}
                                      <Route path="setup/:moduleName" element={<RoleRoute requiredRole="OWNER"><HRModulePlaceholder /></RoleRoute>} />

                                      <Route path="settings" element={<RoleRoute requiredRole="OWNER"><AdminSettingsIndigo /></RoleRoute>} />

                                      {/* Previously orphaned — now routed */}
                                      <Route path="my-documents" element={<EmployeePayrollHistory />} />
                                      <Route path="shifts" element={<RoleRoute requiredRole="MANAGER"><Shifts /></RoleRoute>} />
                                    </Route>

                                    {/* Collaboration */}
                                    <Route path="collab/hive" element={<HiveDashboard />} />
                                    <Route path="collab/inbox" element={<Inbox />} />
                                    <Route path="collab/tasks" element={<TasksKanban />} />

                                    {/* Profile */}
                                    <Route path="profile" element={<UserProfileSettings />} />
                                  </Route>
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
                                  <Route path="*" element={<NotFound />} />
                                </Routes>
                              </Suspense>
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
