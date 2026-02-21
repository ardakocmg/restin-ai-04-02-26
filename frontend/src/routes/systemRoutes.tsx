/**
 * System & Settings Route Module
 * Settings, Users, Access Control, Billing, Observability, Devices, Smart Home, etc.
 */
import React from 'react';
import { Route, Navigate } from 'react-router-dom';
import RoleRoute from '../components/shared/RoleRoute';

// ─── Settings & Admin ───────────────────────────────────────────────────────────
const VenueSettings = React.lazy(() => import('../pages/manager/VenueSettings'));
const OrganizationProfile = React.lazy(() => import('../pages/manager/OrganizationProfile'));
const LegalEntities = React.lazy(() => import('../pages/manager/LegalEntities'));
const RestaurantAppSettings = React.lazy(() => import('../pages/manager/RestaurantAppSettings'));
const ThemeEngineSettings = React.lazy(() => import('../pages/manager/system/ThemeEngineSettings'));
const FeatureFlagAdmin = React.lazy(() => import('../pages/manager/settings/FeatureFlagAdmin'));
const DataExportPage = React.lazy(() => import('../pages/manager/settings/DataExportPage'));

// ─── Users & Access ─────────────────────────────────────────────────────────────
const Users = React.lazy(() => import('../pages/manager/Users'));
const UserAccess = React.lazy(() => import('../pages/manager/UserAccess'));
const RolesPermissions = React.lazy(() => import('../pages/manager/RolesPermissions'));
const DoorAccessControl = React.lazy(() => import('../pages/manager/door-access/DoorAccessControl'));

// ─── Observability & Monitoring ─────────────────────────────────────────────────
const Observability = React.lazy(() => import('../pages/manager/Observability'));
const ObservabilityLogs = React.lazy(() => import('../pages/manager/ObservabilityLogs'));
const SystemHealthDashboard = React.lazy(() => import('../pages/manager/SystemHealthDashboard'));
const MonitoringDashboard = React.lazy(() => import('../pages/manager/MonitoringDashboard'));
const TestPanel = React.lazy(() => import('../pages/observability/TestPanel'));
const ErrorInbox = React.lazy(() => import('../pages/observability/ErrorInbox'));
const LogsViewer = React.lazy(() => import('../pages/manager/LogsViewer'));
const HyperscaleDashboard = React.lazy(() => import('../pages/HyperscaleDashboard'));

// ─── Devices & IoT ──────────────────────────────────────────────────────────────
const DeviceHub = React.lazy(() => import('../pages/manager/DeviceHub'));
const DeviceMapping = React.lazy(() => import('../pages/manager/DeviceMapping'));
const Devices = React.lazy(() => import('../pages/manager/Devices'));
const Printers = React.lazy(() => import('../pages/manager/Printers'));
const SmartHomeDashboard = React.lazy(() => import('../pages/manager/smart-home/SmartHomeDashboard'));

// ─── Operations & Finance ───────────────────────────────────────────────────────
const ServiceDayClose = React.lazy(() => import('../pages/operations/ServiceDayClose'));
const PreGoLive = React.lazy(() => import('../pages/operations/PreGoLive'));
const FinanceDashboard = React.lazy(() => import('../pages/manager/FinanceDashboard'));
const AccountingHub = React.lazy(() => import('../pages/manager/AccountingHub'));
const FinanceProviderSettings = React.lazy(() => import('../pages/finance/FinanceProviderSettings'));
const BillingDashboard = React.lazy(() => import('../pages/manager/billing/BillingDashboard'));
const SyncDashboard = React.lazy(() => import('../pages/manager/sync/SyncDashboard'));

// ─── Misc Manager Pages ────────────────────────────────────────────────────────
const AuditLogs = React.lazy(() => import('../pages/manager/AuditLogs'));
const FloorPlans = React.lazy(() => import('../pages/manager/FloorPlans'));
const FloorPlanEditor = React.lazy(() => import('../pages/manager/FloorPlanEditor'));
const MigrationHub = React.lazy(() => import('../pages/manager/migration/MigrationHub'));
const Reservations = React.lazy(() => import('../pages/manager/Reservations'));
const ReservationTimeline = React.lazy(() => import('../pages/manager/ReservationTimeline'));
const PhysicalTables = React.lazy(() => import('../pages/manager/PhysicalTables'));
const ReviewRisk = React.lazy(() => import('../pages/manager/ReviewRisk'));
const UpdatesPage = React.lazy(() => import('../pages/manager/UpdatesPage'));
const Microservices = React.lazy(() => import('../pages/manager/Microservices'));
const EventMonitor = React.lazy(() => import('../pages/manager/EventMonitor'));
const Analytics = React.lazy(() => import('../pages/manager/Analytics'));
const Documents = React.lazy(() => import('../pages/manager/Documents'));
const WorkspaceSettings = React.lazy(() => import('../pages/google/WorkspaceSettings'));
const MyGooglePanel = React.lazy(() => import('../pages/google/MyGooglePanel'));
const GoogleSyncDashboard = React.lazy(() => import('../pages/google/GoogleSyncDashboard'));
const CRM = React.lazy(() => import('../pages/manager/CRM'));
const Loyalty = React.lazy(() => import('../pages/manager/Loyalty'));
const StaffGamification = React.lazy(() => import('../pages/manager/staff/GamificationDashboard'));
const TemplateList = React.lazy(() => import('../pages/templates/TemplateList'));
const TemplateEditor = React.lazy(() => import('../pages/templates/TemplateEditor'));
const SystemDashboard = React.lazy(() => import('../pages/manager/SystemDashboard'));
const AIOSDashboard = React.lazy(() => import('../pages/manager/system/AIOSDashboard'));

// ─── Lightspeed Parity ──────────────────────────────────────────────────────────
const TipPresetsSettings = React.lazy(() => import('../pages/manager/TipPresetsSettings'));
const ComboBuilder = React.lazy(() => import('../pages/manager/ComboBuilder'));
const OrderAnywhereDashboard = React.lazy(() => import('../pages/manager/OrderAnywhereDashboard'));
const PulseAnalytics = React.lazy(() => import('../pages/manager/PulseAnalytics'));
const TablesideConfig = React.lazy(() => import('../pages/manager/TablesideConfig'));

export const systemRoutes = (
    <>
        {/* Dashboard */}
        <Route path="dashboard" element={<RoleRoute requiredRole="MANAGER"><SystemDashboard /></RoleRoute>} />
        <Route path="ai-os" element={<RoleRoute requiredRole="OWNER"><AIOSDashboard /></RoleRoute>} />

        {/* Settings & Admin */}
        <Route path="venues" element={<RoleRoute requiredRole="OWNER"><VenueSettings /></RoleRoute>} />
        <Route path="settings" element={<RoleRoute requiredRole="OWNER"><VenueSettings /></RoleRoute>} />
        <Route path="company-settings" element={<RoleRoute requiredRole="OWNER"><OrganizationProfile /></RoleRoute>} />
        <Route path="legal-entities" element={<RoleRoute requiredRole="OWNER"><LegalEntities /></RoleRoute>} />
        <Route path="app-settings" element={<RoleRoute requiredRole="OWNER"><RestaurantAppSettings /></RoleRoute>} />
        <Route path="theme-engine" element={<RoleRoute requiredRole="PRODUCT_OWNER"><ThemeEngineSettings /></RoleRoute>} />
        <Route path="feature-flags" element={<RoleRoute requiredRole="OWNER"><FeatureFlagAdmin /></RoleRoute>} />
        <Route path="data-export" element={<RoleRoute requiredRole="OWNER"><DataExportPage /></RoleRoute>} />
        <Route path="tip-presets" element={<RoleRoute requiredRole="OWNER"><TipPresetsSettings /></RoleRoute>} />

        {/* Users & Access */}
        <Route path="users" element={<RoleRoute requiredRole="OWNER"><Users /></RoleRoute>} />
        <Route path="users/:userId/access" element={<RoleRoute requiredRole="OWNER"><UserAccess /></RoleRoute>} />
        <Route path="access-control" element={<RoleRoute requiredRole="OWNER"><RolesPermissions /></RoleRoute>} />
        <Route path="door-access" element={<RoleRoute requiredRole="OWNER"><DoorAccessControl /></RoleRoute>} />
        <Route path="billing" element={<RoleRoute requiredRole="OWNER"><BillingDashboard /></RoleRoute>} />

        {/* Observability */}
        <Route path="observability" element={<RoleRoute requiredRole="MANAGER"><Observability /></RoleRoute>} />
        <Route path="observability/logs" element={<RoleRoute requiredRole="OWNER"><ObservabilityLogs /></RoleRoute>} />
        <Route path="observability/testpanel" element={<RoleRoute requiredRole="OWNER"><TestPanel /></RoleRoute>} />
        <Route path="observability/error-inbox" element={<RoleRoute requiredRole="OWNER"><ErrorInbox /></RoleRoute>} />
        <Route path="system-health-advanced" element={<RoleRoute requiredRole="OWNER"><SystemHealthDashboard /></RoleRoute>} />
        <Route path="monitoring" element={<RoleRoute requiredRole="OWNER"><MonitoringDashboard /></RoleRoute>} />
        <Route path="logs" element={<RoleRoute requiredRole="OWNER"><LogsViewer /></RoleRoute>} />
        <Route path="hyperscale" element={<RoleRoute requiredRole="PRODUCT_OWNER"><HyperscaleDashboard /></RoleRoute>} />

        {/* Devices & IoT */}
        <Route path="device-hub" element={<RoleRoute requiredRole="MANAGER"><DeviceHub /></RoleRoute>} />
        <Route path="device-mapping" element={<RoleRoute requiredRole="MANAGER"><DeviceMapping /></RoleRoute>} />
        <Route path="devices" element={<RoleRoute requiredRole="MANAGER"><Devices /></RoleRoute>} />
        <Route path="printers" element={<RoleRoute requiredRole="MANAGER"><Printers /></RoleRoute>} />
        <Route path="smart-home" element={<RoleRoute requiredRole="OWNER"><SmartHomeDashboard /></RoleRoute>} />
        <Route path="physical-tables" element={<RoleRoute requiredRole="MANAGER"><PhysicalTables /></RoleRoute>} />

        {/* Operations & Finance */}
        <Route path="service-day-close" element={<RoleRoute requiredRole="MANAGER"><ServiceDayClose /></RoleRoute>} />
        <Route path="pre-go-live" element={<RoleRoute requiredRole="OWNER"><PreGoLive /></RoleRoute>} />
        <Route path="finance" element={<RoleRoute requiredRole="OWNER"><FinanceDashboard /></RoleRoute>} />
        <Route path="accounting" element={<RoleRoute requiredRole="OWNER"><AccountingHub /></RoleRoute>} />
        <Route path="finance-provider" element={<RoleRoute requiredRole="OWNER"><FinanceProviderSettings /></RoleRoute>} />
        <Route path="sync" element={<RoleRoute requiredRole="OWNER"><SyncDashboard /></RoleRoute>} />

        {/* Floor Plans */}
        <Route path="floor-plans" element={<RoleRoute requiredRole="MANAGER"><FloorPlans /></RoleRoute>} />
        <Route path="floor-plans/:planId/edit" element={<RoleRoute requiredRole="MANAGER"><FloorPlanEditor /></RoleRoute>} />

        {/* Reservations */}
        <Route path="reservations" element={<RoleRoute requiredRole="MANAGER"><Reservations /></RoleRoute>} />
        <Route path="reservations/timeline" element={<RoleRoute requiredRole="MANAGER"><ReservationTimeline /></RoleRoute>} />

        {/* CRM & Loyalty */}
        <Route path="crm" element={<RoleRoute requiredRole="MANAGER"><CRM /></RoleRoute>} />
        <Route path="loyalty" element={<RoleRoute requiredRole="MANAGER"><Loyalty /></RoleRoute>} />
        <Route path="combos" element={<RoleRoute requiredRole="MANAGER"><ComboBuilder /></RoleRoute>} />
        <Route path="order-anywhere" element={<RoleRoute requiredRole="MANAGER"><OrderAnywhereDashboard /></RoleRoute>} />
        <Route path="pulse" element={<RoleRoute requiredRole="MANAGER"><PulseAnalytics /></RoleRoute>} />
        <Route path="tableside" element={<RoleRoute requiredRole="MANAGER"><TablesideConfig /></RoleRoute>} />

        {/* Misc */}
        <Route path="migration" element={<RoleRoute requiredRole="OWNER"><MigrationHub /></RoleRoute>} />
        <Route path="review-risk" element={<RoleRoute requiredRole="MANAGER"><ReviewRisk /></RoleRoute>} />
        <Route path="audit-logs" element={<RoleRoute requiredRole="OWNER"><AuditLogs /></RoleRoute>} />
        <Route path="updates" element={<RoleRoute requiredRole="OWNER"><UpdatesPage /></RoleRoute>} />
        <Route path="microservices" element={<RoleRoute requiredRole="OWNER"><Microservices /></RoleRoute>} />
        <Route path="events" element={<RoleRoute requiredRole="OWNER"><EventMonitor /></RoleRoute>} />
        <Route path="analytics" element={<RoleRoute requiredRole="MANAGER"><Analytics /></RoleRoute>} />
        <Route path="google-workspace" element={<RoleRoute requiredRole="MANAGER"><WorkspaceSettings /></RoleRoute>} />
        <Route path="my-google" element={<RoleRoute requiredRole="STAFF"><MyGooglePanel /></RoleRoute>} />
        <Route path="google-sync" element={<RoleRoute requiredRole="OWNER"><GoogleSyncDashboard /></RoleRoute>} />
        <Route path="staff-gamification" element={<RoleRoute requiredRole="STAFF"><StaffGamification /></RoleRoute>} />
        <Route path="templates" element={<RoleRoute requiredRole="MANAGER"><TemplateList /></RoleRoute>} />
        <Route path="templates/new" element={<RoleRoute requiredRole="MANAGER"><TemplateEditor /></RoleRoute>} />
        <Route path="templates/:id" element={<RoleRoute requiredRole="MANAGER"><TemplateEditor /></RoleRoute>} />
    </>
);
