/**
 * POS & KDS Route Module
 * POS Dashboard, POS Setup, KDS Setup/Runtime/Stations
 * K-Series Parity: KDS 2.0, KDS 1.0, POS Config Settings
 */
import React from 'react';
import { Navigate,Route } from 'react-router-dom';
import RoleRoute from '../components/shared/RoleRoute';

// ─── Lazy Imports ───────────────────────────────────────────────────────────────
const POSSetup = React.lazy(() => import('../pages/pos/POSSetup'));
const POSMain = React.lazy(() => import('../pages/pos/POSMain'));
const POSRuntimeEnhanced = React.lazy(() => import('../pages/pos/POSRuntimeEnhanced'));
const POSThemeRouter = React.lazy(() => import('../pages/pos/POSThemeRouter'));
const POSDashboard = React.lazy(() => import('../pages/manager/POSDashboard'));
const POSSettings = React.lazy(() => import('../pages/manager/POSSettings'));
const POSFeature = React.lazy(() => import('../features/pos/POSFeature'));
const KDSSetup = React.lazy(() => import('../pages/kds/KDSSetup'));
const KDSMain = React.lazy(() => import('../pages/kds/KDSMain'));
const KDSRuntime = React.lazy(() => import('../pages/kds/KDSRuntime'));
const KDSStations = React.lazy(() => import('../pages/kds/KDSStations'));
const KDSStationDetail = React.lazy(() => import('../pages/kds/KDSStationDetail'));
const KDSFeature = React.lazy(() => import('../features/pos/KDSFeature'));

const POSThemeGallery = React.lazy(() => import('../pages/manager/POSThemeGallery'));
const POSThemeBuilder = React.lazy(() => import('../pages/manager/POSThemeBuilder'));

// ─── K-Series Parity Imports ────────────────────────────────────────────────────
const KDS2Screen = React.lazy(() => import('../pages/pos/KDS2Screen'));
const KDS1Screen = React.lazy(() => import('../pages/pos/KDS1Screen'));
const KDS2Setup = React.lazy(() => import('../pages/pos/KDS2Setup'));
const KDS1Setup = React.lazy(() => import('../pages/pos/KDS1Setup'));
const POSConfigSettings = React.lazy(() => import('../pages/pos/POSConfigSettings'));
const MenuBuilder = React.lazy(() => import('../pages/pos/MenuBuilder'));
const ItemLibrary = React.lazy(() => import('../pages/pos/ItemLibrary'));
const AccountingGroups = React.lazy(() => import('../pages/pos/AccountingGroups'));
const PaymentMethods = React.lazy(() => import('../pages/pos/PaymentMethods'));
const TaxSettings = React.lazy(() => import('../pages/pos/TaxSettings'));
const PrintingProfiles = React.lazy(() => import('../pages/pos/PrintingProfiles'));
const ProductionCenters = React.lazy(() => import('../pages/pos/ProductionCenters'));
const POSUsersGroups = React.lazy(() => import('../pages/pos/POSUsersGroups'));
const ProductionInstructions = React.lazy(() => import('../pages/pos/ProductionInstructions'));
const Discounts = React.lazy(() => import('../pages/pos/Discounts'));
const VoidReasons = React.lazy(() => import('../pages/pos/VoidReasons'));
const ReceiptTemplates = React.lazy(() => import('../pages/pos/ReceiptTemplates'));
const FloorPlanBO = React.lazy(() => import('../pages/pos/FloorPlanBO'));
const OrderProfiles = React.lazy(() => import('../pages/pos/OrderProfiles'));
const Courses = React.lazy(() => import('../pages/pos/Courses'));
const ComboMeals = React.lazy(() => import('../pages/pos/ComboMeals'));
const AllergenManager = React.lazy(() => import('../pages/pos/AllergenManager'));
const ItemTags = React.lazy(() => import('../pages/pos/ItemTags'));
const CustomerDisplayBO = React.lazy(() => import('../pages/pos/CustomerDisplayBO'));
const ServiceCharge = React.lazy(() => import('../pages/pos/ServiceCharge'));
const LoyaltyConfig = React.lazy(() => import('../pages/pos/LoyaltyConfig'));
const KioskMode = React.lazy(() => import('../pages/pos/KioskMode'));
const TableTracker = React.lazy(() => import('../pages/pos/TableTracker'));
const KitchenAnalytics = React.lazy(() => import('../pages/pos/KitchenAnalytics'));
const StaffScheduler = React.lazy(() => import('../pages/pos/StaffScheduler'));
const InventoryAlerts = React.lazy(() => import('../pages/pos/InventoryAlerts'));
const POSDevices = React.lazy(() => import('../pages/pos/POSDevices'));

/** Manager-scoped POS/KDS routes (inside ManagerLayout) */
export const posKdsManagerRoutes = (
    <>
        <Route path="pos" element={<Navigate to="/manager/pos-dashboard" replace />} />
        <Route path="posdashboard" element={<Navigate to="/manager/pos-dashboard" replace />} />
        <Route path="pos-dashboard" element={<RoleRoute requiredRole="MANAGER"><POSDashboard /></RoleRoute>} />
        <Route path="pos-themes" element={<RoleRoute requiredRole="MANAGER"><POSThemeGallery /></RoleRoute>} />
        <Route path="pos-themes/builder/:id" element={<RoleRoute requiredRole="MANAGER"><POSThemeBuilder /></RoleRoute>} />
        <Route path="menu" element={<RoleRoute requiredRole="MANAGER"><POSSettings /></RoleRoute>} />
        <Route path="menu-builder" element={<RoleRoute requiredRole="MANAGER"><MenuBuilder /></RoleRoute>} />
        <Route path="item-library" element={<RoleRoute requiredRole="MANAGER"><ItemLibrary /></RoleRoute>} />
        <Route path="accounting-groups" element={<RoleRoute requiredRole="MANAGER"><AccountingGroups /></RoleRoute>} />
        <Route path="payment-methods" element={<RoleRoute requiredRole="MANAGER"><PaymentMethods /></RoleRoute>} />
        <Route path="taxes" element={<RoleRoute requiredRole="MANAGER"><TaxSettings /></RoleRoute>} />
        <Route path="printing-profiles" element={<RoleRoute requiredRole="MANAGER"><PrintingProfiles /></RoleRoute>} />
        <Route path="production-centers" element={<RoleRoute requiredRole="MANAGER"><ProductionCenters /></RoleRoute>} />
        <Route path="pos-users" element={<RoleRoute requiredRole="MANAGER"><POSUsersGroups /></RoleRoute>} />
        <Route path="production-instructions" element={<RoleRoute requiredRole="MANAGER"><ProductionInstructions /></RoleRoute>} />
        <Route path="discounts" element={<RoleRoute requiredRole="MANAGER"><Discounts /></RoleRoute>} />
        <Route path="void-reasons" element={<RoleRoute requiredRole="MANAGER"><VoidReasons /></RoleRoute>} />
        <Route path="receipt-templates" element={<RoleRoute requiredRole="MANAGER"><ReceiptTemplates /></RoleRoute>} />
        <Route path="floor-plans" element={<RoleRoute requiredRole="MANAGER"><FloorPlanBO /></RoleRoute>} />
        <Route path="order-profiles" element={<RoleRoute requiredRole="MANAGER"><OrderProfiles /></RoleRoute>} />
        <Route path="courses" element={<RoleRoute requiredRole="MANAGER"><Courses /></RoleRoute>} />
        <Route path="combo-meals" element={<RoleRoute requiredRole="MANAGER"><ComboMeals /></RoleRoute>} />
        <Route path="allergens" element={<RoleRoute requiredRole="MANAGER"><AllergenManager /></RoleRoute>} />
        <Route path="item-tags" element={<RoleRoute requiredRole="MANAGER"><ItemTags /></RoleRoute>} />
        <Route path="customer-display-config" element={<RoleRoute requiredRole="MANAGER"><CustomerDisplayBO /></RoleRoute>} />
        <Route path="service-charge" element={<RoleRoute requiredRole="MANAGER"><ServiceCharge /></RoleRoute>} />
        <Route path="loyalty-config" element={<RoleRoute requiredRole="MANAGER"><LoyaltyConfig /></RoleRoute>} />
        <Route path="kiosk-mode" element={<RoleRoute requiredRole="MANAGER"><KioskMode /></RoleRoute>} />
        <Route path="table-tracker" element={<RoleRoute requiredRole="MANAGER"><TableTracker /></RoleRoute>} />
        <Route path="kitchen-analytics" element={<RoleRoute requiredRole="MANAGER"><KitchenAnalytics /></RoleRoute>} />
        <Route path="staff-scheduler" element={<RoleRoute requiredRole="MANAGER"><StaffScheduler /></RoleRoute>} />
        <Route path="inventory-alerts" element={<RoleRoute requiredRole="MANAGER"><InventoryAlerts /></RoleRoute>} />
        <Route path="pos-devices" element={<RoleRoute requiredRole="MANAGER"><POSDevices /></RoleRoute>} />
        <Route path="kds" element={<RoleRoute requiredRole="MANAGER"><KDSFeature /></RoleRoute>} />
        <Route path="kds/stations" element={<KDSStations />} />
        <Route path="kds/stations/:stationKey" element={<KDSStationDetail />} />
    </>
);

/** Standalone POS/KDS routes (outside ManagerLayout) */
const CustomerFacingDisplay = React.lazy(() => import('../pages/pos/CustomerFacingDisplay'));

export const posKdsStandaloneRoutes = (
    <>
        <Route path="/pos/setup" element={<POSSetup />} />
        <Route path="/pos" element={<POSMain />} />
        <Route path="/pos/runtime" element={<POSThemeRouter />} />
        <Route path="/pos/customer-display" element={<CustomerFacingDisplay />} />
        <Route path="/pos/config" element={<POSConfigSettings />} />
        <Route path="/pos/menu-builder" element={<MenuBuilder />} />
        <Route path="/pos/item-library" element={<ItemLibrary />} />
        <Route path="/pos/accounting-groups" element={<AccountingGroups />} />
        <Route path="/pos/payment-methods" element={<PaymentMethods />} />
        <Route path="/pos/taxes" element={<TaxSettings />} />
        <Route path="/pos/printing-profiles" element={<PrintingProfiles />} />
        <Route path="/pos/production-centers" element={<ProductionCenters />} />
        <Route path="/pos/pos-users" element={<POSUsersGroups />} />
        <Route path="/pos/production-instructions" element={<ProductionInstructions />} />
        <Route path="/pos/discounts" element={<Discounts />} />
        <Route path="/pos/void-reasons" element={<VoidReasons />} />
        <Route path="/pos/receipt-templates" element={<ReceiptTemplates />} />
        <Route path="/pos/floor-plans" element={<FloorPlanBO />} />
        <Route path="/pos/order-profiles" element={<OrderProfiles />} />
        <Route path="/pos/courses" element={<Courses />} />
        <Route path="/pos/combo-meals" element={<ComboMeals />} />
        <Route path="/pos/allergens" element={<AllergenManager />} />
        <Route path="/pos/item-tags" element={<ItemTags />} />
        <Route path="/pos/customer-display-config" element={<CustomerDisplayBO />} />
        <Route path="/pos/service-charge" element={<ServiceCharge />} />
        <Route path="/pos/loyalty-config" element={<LoyaltyConfig />} />
        <Route path="/pos/kiosk-mode" element={<KioskMode />} />
        <Route path="/pos/table-tracker" element={<TableTracker />} />
        <Route path="/pos/kitchen-analytics" element={<KitchenAnalytics />} />
        <Route path="/pos/staff-scheduler" element={<StaffScheduler />} />
        <Route path="/pos/inventory-alerts" element={<InventoryAlerts />} />
        <Route path="/pos/pos-devices" element={<POSDevices />} />
        <Route path="/pos/kds2" element={<KDS2Screen />} />
        <Route path="/pos/kds2/setup" element={<KDS2Setup />} />
        <Route path="/pos/kds1" element={<KDS1Screen />} />
        <Route path="/pos/kds1/setup" element={<KDS1Setup />} />
        <Route path="/kds/setup" element={<KDSSetup />} />
        <Route path="/kds" element={<KDSMain />} />
        <Route path="/kds/stations" element={<KDSStations />} />
        <Route path="/kds/runtime/:stationKey" element={<KDSRuntime />} />
    </>
);
