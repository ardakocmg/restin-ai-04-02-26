/**
 * Legacy Redirects
 * All Navigate/redirect routes consolidated for easy auditing
 */
import { Route, Navigate } from 'react-router-dom';

export const legacyRedirects = (
    <>
        {/* Document redirect → HR */}
        <Route path="documents" element={<Navigate to="/manager/hr/documents" replace />} />

        {/* Menu Import → Migration */}
        <Route path="menu-import" element={<Navigate to="/manager/migration" replace />} />

        {/* Guests → CRM */}
        <Route path="guests" element={<Navigate to="/manager/crm" replace />} />
        <Route path="guest-profiles" element={<Navigate to="/manager/crm" replace />} />

        {/* Operations → POS Dashboard */}
        <Route path="operations" element={<Navigate to="/manager/pos-dashboard" replace />} />

        {/* Content routes → Restin Studio */}
        <Route path="content-studio" element={<Navigate to="/manager/restin/studio" replace />} />
        <Route path="content-editor" element={<Navigate to="/manager/restin/studio" replace />} />

        {/* Automations → App Settings */}
        <Route path="automations" element={<Navigate to="/manager/app-settings" replace />} />

        {/* Connectors/Integrations → Sync */}
        <Route path="connectors" element={<Navigate to="/manager/sync" replace />} />
        <Route path="integrations" element={<Navigate to="/manager/sync" replace />} />

        {/* Observability aliases */}
        <Route path="trust" element={<Navigate to="/manager/access-control" replace />} />
        <Route path="system-health" element={<Navigate to="/manager/system-health-advanced" replace />} />
        <Route path="integrity" element={<Navigate to="/manager/audit-logs" replace />} />
        <Route path="advanced-observability" element={<Navigate to="/manager/observability" replace />} />
        <Route path="diagnostics" element={<Navigate to="/manager/observability" replace />} />

        {/* Tasks/Inbox → Collab */}
        <Route path="tasks-kanban" element={<Navigate to="/manager/collab/tasks" replace />} />
        <Route path="inbox" element={<Navigate to="/manager/collab/inbox" replace />} />

        {/* Payroll aliases */}
        <Route path="payroll-calculator" element={<Navigate to="/manager/hr/payroll" replace />} />
        <Route path="payroll-malta" element={<Navigate to="/manager/hr/payroll" replace />} />

        {/* Purchase Orders → Inventory */}
        <Route path="purchase-orders" element={<Navigate to="/manager/inventory-purchase-orders" replace />} />
        <Route path="receiving" element={<Navigate to="/manager/inventory" replace />} />

        {/* Delivery → Restin Ops */}
        <Route path="delivery-aggregators" element={<Navigate to="/manager/restin/ops" replace />} />

        {/* Feature redirects */}
        <Route path="dynamic-pricing" element={<Navigate to="/manager/products" replace />} />
        <Route path="haccp" element={<Navigate to="/manager/quality" replace />} />
        <Route path="setup-wizard" element={<Navigate to="/manager/settings" replace />} />
        <Route path="kiosk-mode" element={<Navigate to="/manager/posdashboard" replace />} />
        <Route path="carbon-footprint" element={<Navigate to="/manager/hr/esg" replace />} />
        <Route path="competitor-monitoring" element={<Navigate to="/manager/restin/radar" replace />} />
        <Route path="floorplan" element={<Navigate to="/manager/floor-plans" replace />} />
        <Route path="split-bill" element={<Navigate to="/manager/posdashboard" replace />} />
        <Route path="print-preview" element={<Navigate to="/manager/printers" replace />} />
        <Route path="recipe-videos" element={<Navigate to="/manager/inventory-recipes" replace />} />
        <Route path="plugin-marketplace" element={<Navigate to="/manager/app-settings" replace />} />
    </>
);
