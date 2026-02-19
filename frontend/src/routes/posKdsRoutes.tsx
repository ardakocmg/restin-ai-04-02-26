/**
 * POS & KDS Route Module
 * POS Dashboard, POS Setup, KDS Setup/Runtime/Stations
 */
import React from 'react';
import { Route, Navigate } from 'react-router-dom';
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

/** Manager-scoped POS/KDS routes (inside ManagerLayout) */
export const posKdsManagerRoutes = (
    <>
        <Route path="pos" element={<Navigate to="/manager/pos-dashboard" replace />} />
        <Route path="posdashboard" element={<Navigate to="/manager/pos-dashboard" replace />} />
        <Route path="pos-dashboard" element={<RoleRoute requiredRole="MANAGER"><POSDashboard /></RoleRoute>} />
        <Route path="pos-themes" element={<RoleRoute requiredRole="MANAGER"><POSThemeGallery /></RoleRoute>} />
        <Route path="pos-themes/builder/:id" element={<RoleRoute requiredRole="MANAGER"><POSThemeBuilder /></RoleRoute>} />
        <Route path="menu" element={<RoleRoute requiredRole="MANAGER"><POSSettings /></RoleRoute>} />
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
        <Route path="/kds/setup" element={<KDSSetup />} />
        <Route path="/kds" element={<KDSMain />} />
        <Route path="/kds/stations" element={<KDSStations />} />
        <Route path="/kds/runtime/:stationKey" element={<KDSRuntime />} />
    </>
);
