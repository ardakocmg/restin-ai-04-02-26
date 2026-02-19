/**
 * Procurement Route Module
 * Procurement Hub, AI Invoice, Forecasting, Central Kitchen, Recipe Engineering, Quality
 */
import React from 'react';
import { Route } from 'react-router-dom';
import RoleRoute from '../components/shared/RoleRoute';

// ─── Procurement ────────────────────────────────────────────────────────────────
const ProcurementHub = React.lazy(() => import('../pages/manager/procurement/ProcurementHub'));
const RFQManagement = React.lazy(() => import('../pages/manager/procurement/RFQManagement'));
const ApprovalWorkflow = React.lazy(() => import('../pages/manager/procurement/ApprovalWorkflow'));
const AutoOrderRules = React.lazy(() => import('../pages/manager/procurement/AutoOrderRules'));

// ─── AI Invoice ─────────────────────────────────────────────────────────────────
const AIInvoiceHub = React.lazy(() => import('../pages/manager/ai-invoice/AIInvoiceHub'));
const InvoiceOCR = React.lazy(() => import('../pages/manager/ai-invoice/InvoiceOCR'));
const InvoiceList = React.lazy(() => import('../pages/manager/ai-invoice/InvoiceList'));
const VarianceAnalysis = React.lazy(() => import('../pages/manager/ai-invoice/VarianceAnalysis'));

// ─── Forecasting ────────────────────────────────────────────────────────────────
const ForecastingHub = React.lazy(() => import('../pages/manager/forecasting/ForecastingHub'));
const ForecastingDashboard = React.lazy(() => import('../pages/manager/forecasting/ForecastingDashboard'));
const SeasonalPatterns = React.lazy(() => import('../pages/manager/forecasting/SeasonalPatterns'));

// ─── Central Kitchen ────────────────────────────────────────────────────────────
const CentralKitchenHub = React.lazy(() => import('../pages/manager/central-kitchen/CentralKitchenHub'));
const ProductionBatches = React.lazy(() => import('../pages/manager/central-kitchen/ProductionBatches'));
const InternalOrders = React.lazy(() => import('../pages/manager/central-kitchen/InternalOrders'));

// ─── Recipe Engineering ─────────────────────────────────────────────────────────
const RecipeEngineeringHub = React.lazy(() => import('../pages/manager/recipe-engineering/RecipeEngineeringHub'));
const RecipeList = React.lazy(() => import('../pages/manager/recipe-engineering/RecipeList'));
const CostAnalysis = React.lazy(() => import('../pages/manager/recipe-engineering/CostAnalysis'));

// ─── Quality ────────────────────────────────────────────────────────────────────
const QualityHub = React.lazy(() => import('../pages/manager/quality/QualityHub'));
const QualityAudits = React.lazy(() => import('../pages/manager/quality/QualityAudits'));

export const procurementRoutes = (
    <>
        {/* Procurement */}
        <Route path="procurement" element={<RoleRoute requiredRole="OWNER"><ProcurementHub /></RoleRoute>} />
        <Route path="procurement/rfq" element={<RoleRoute requiredRole="OWNER"><RFQManagement /></RoleRoute>} />
        <Route path="procurement/approval" element={<RoleRoute requiredRole="OWNER"><ApprovalWorkflow /></RoleRoute>} />
        <Route path="procurement/auto-order" element={<RoleRoute requiredRole="OWNER"><AutoOrderRules /></RoleRoute>} />

        {/* AI Invoice */}
        <Route path="ai-invoice" element={<RoleRoute requiredRole="OWNER"><AIInvoiceHub /></RoleRoute>} />
        <Route path="ai-invoice/ocr" element={<RoleRoute requiredRole="OWNER"><InvoiceOCR /></RoleRoute>} />
        <Route path="ai-invoice/list" element={<RoleRoute requiredRole="OWNER"><InvoiceList /></RoleRoute>} />
        <Route path="ai-invoice/variance" element={<RoleRoute requiredRole="OWNER"><VarianceAnalysis /></RoleRoute>} />

        {/* Forecasting */}
        <Route path="forecasting" element={<RoleRoute requiredRole="OWNER"><ForecastingHub /></RoleRoute>} />
        <Route path="forecasting/dashboard" element={<RoleRoute requiredRole="OWNER"><ForecastingDashboard /></RoleRoute>} />
        <Route path="forecasting/seasonal" element={<RoleRoute requiredRole="OWNER"><SeasonalPatterns /></RoleRoute>} />

        {/* Central Kitchen */}
        <Route path="central-kitchen" element={<RoleRoute requiredRole="OWNER"><CentralKitchenHub /></RoleRoute>} />
        <Route path="central-kitchen/batches" element={<RoleRoute requiredRole="OWNER"><ProductionBatches /></RoleRoute>} />
        <Route path="central-kitchen/orders" element={<RoleRoute requiredRole="OWNER"><InternalOrders /></RoleRoute>} />

        {/* Recipe Engineering */}
        <Route path="recipe-engineering" element={<RoleRoute requiredRole="OWNER"><RecipeEngineeringHub /></RoleRoute>} />
        <Route path="recipe-engineering/list" element={<RoleRoute requiredRole="OWNER"><RecipeList /></RoleRoute>} />
        <Route path="recipe-engineering/cost" element={<RoleRoute requiredRole="OWNER"><CostAnalysis /></RoleRoute>} />

        {/* Quality */}
        <Route path="quality" element={<RoleRoute requiredRole="OWNER"><QualityHub /></RoleRoute>} />
        <Route path="quality/audits" element={<RoleRoute requiredRole="OWNER"><QualityAudits /></RoleRoute>} />
    </>
);
