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
const GoogleHub = React.lazy(() => import("./pages/google/GoogleHub"));
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
const StaffManagement = React.lazy(() => import("./pages/admin/StaffManagement"));
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
const EmployeePortal = React.lazy(() => import("./pages/admin/hr/EmployeePortal"));
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
const InventoryItems = React.lazy(() => import("./pages/admin/inventory/InventoryItems"));
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
const SetupWizard = React.lazy(() => import("./pages/admin/onboarding/SetupWizard"));
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
                              <Suspense fallback={<PageLoader />}>
                                <Routes>
                                  <Route path="/" element={<MarketingLanding />} />
                                  <Route path="/diag" element={<div>Router is working! Current Location: {window.location.pathname}</div>} />
                                  <Route path="/technic" element={<TechnicalHub />} />
                                  <Route path="/modules" element={<ModulesCatalog />} />
                                  <Route path="/login" element={<Login />} />
                                  <Route path="/setup" element={<React.Suspense fallback={<LoadingFallback />}><SetupWizard /></React.Suspense>} />
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
                                    <Route path="door-access" element={<DoorAccessControl />} />
                                    <Route path="billing" element={<BillingDashboard />} />
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
                                    {/* Consolidated: old 'Complete' routes removed, primary routes now use Complete components */}
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
                                    <Route path="smart-home" element={<SmartHomeDashboard />} />
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
                                    <Route path="feature-flags" element={<FeatureFlagAdmin />} />
                                    <Route path="dynamic-pricing" element={<DynamicPricingPage />} />
                                    <Route path="haccp" element={<HACCPChecklists />} />
                                    <Route path="data-export" element={<DataExportPage />} />
                                    <Route path="setup-wizard" element={<SetupWizard />} />
                                    <Route path="guest-profiles" element={<GuestProfiles />} />
                                    <Route path="staff-gamification" element={<StaffGamification />} />
                                    <Route path="kiosk-mode" element={<KioskModePage />} />
                                    <Route path="carbon-footprint" element={<CarbonFootprint />} />
                                    <Route path="competitor-monitoring" element={<CompetitorMonitoring />} />
                                    <Route path="floorplan" element={<FloorplanEditor />} />
                                    <Route path="split-bill" element={<SplitBillPage />} />
                                    <Route path="print-preview" element={<PrintPreviewPage />} />
                                    <Route path="recipe-videos" element={<RecipeVideoBites />} />
                                    <Route path="plugin-marketplace" element={<PluginMarketplace />} />
                                    {/* door-access route is defined above at line ~414 */}
                                    <Route path="sync" element={<SyncDashboard />} />

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
                                      <Route path="portal-view" element={<EmployeePortal />} />
                                      <Route path="reporting" element={<ReportingHubIndigo />} />
                                      <Route path="reports/:reportId" element={<ReportViewer />} />

                                      <Route path="reports/:reportId" element={<ReportViewer />} />

                                      {/* Missing Setup Routes - Mapped to Placeholder for now */}
                                      <Route path="setup/:moduleName" element={<HRModulePlaceholder />} />

                                      <Route path="settings" element={<AdminSettingsIndigo />} />
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
