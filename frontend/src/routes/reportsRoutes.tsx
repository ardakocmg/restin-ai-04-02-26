/**
 * Reports Route Module
 * POS Sales, KDS Performance, Inventory Reports
 */
import React from 'react';
import { Route } from 'react-router-dom';
import RoleRoute from '../components/shared/RoleRoute';

// ─── Lazy Imports ───────────────────────────────────────────────────────────────
const KDSPerformance = React.lazy(() => import('../pages/manager/hr/reports/KDSPerformance'));
const POSSales = React.lazy(() => import('../pages/reports/POSSales'));
const InventoryStatus = React.lazy(() => import('../pages/reports/InventoryStatus'));
const POSSalesReport = React.lazy(() => import('../pages/reports/POSSalesReport'));
const KDSPerformanceReport = React.lazy(() => import('../pages/reports/KDSPerformanceReport'));
const InventoryReport = React.lazy(() => import('../pages/reports/InventoryReport'));
const ManagerReportingHub = React.lazy(() => import('../pages/manager/ReportingHub'));

export const reportsRoutes = (
    <>
        <Route path="reports/kds" element={<RoleRoute requiredRole="MANAGER"><KDSPerformance /></RoleRoute>} />
        <Route path="reports/sales" element={<RoleRoute requiredRole="MANAGER"><POSSales /></RoleRoute>} />
        <Route path="reports/inventory" element={<RoleRoute requiredRole="MANAGER"><InventoryStatus /></RoleRoute>} />
        <Route path="reports/pos-sales-detailed" element={<RoleRoute requiredRole="MANAGER"><POSSalesReport /></RoleRoute>} />
        <Route path="reports/kds-performance-detailed" element={<RoleRoute requiredRole="MANAGER"><KDSPerformanceReport /></RoleRoute>} />
        <Route path="reports/inventory-detailed" element={<RoleRoute requiredRole="MANAGER"><InventoryReport /></RoleRoute>} />
        <Route path="reporting" element={<RoleRoute requiredRole="MANAGER"><ManagerReportingHub /></RoleRoute>} />
    </>
);
