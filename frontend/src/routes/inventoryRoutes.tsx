/**
 * Inventory Route Module
 * Inventory Hub, Items, Suppliers, POs, Stock, Recipes, Production, Transfers
 */
import React from 'react';
import { Route, Navigate } from 'react-router-dom';
import RoleRoute from '../components/shared/RoleRoute';

// ─── Lazy Imports ───────────────────────────────────────────────────────────────
const InventoryDashboard = React.lazy(() => import('../features/inventory/InventoryDashboard'));
const InventoryPage = React.lazy(() => import('../pages/manager/Inventory'));
const InventoryItemsNew = React.lazy(() => import('../pages/manager/inventory/InventoryItemsNew'));
const Suppliers = React.lazy(() => import('../pages/manager/Suppliers'));
const PurchaseOrdersNew = React.lazy(() => import('../pages/manager/inventory/PurchaseOrdersNew'));
const StockCount = React.lazy(() => import('../pages/manager/inventory/StockCount'));
const WasteLog = React.lazy(() => import('../pages/manager/inventory/WasteLog'));
const RecipeManagement = React.lazy(() => import('../pages/manager/inventory/RecipeManagementComplete'));
const RecipeDetail = React.lazy(() => import('../pages/manager/inventory/RecipeDetail'));
const RecipeEditor = React.lazy(() => import('../pages/manager/inventory/RecipeEditor'));
const ProductionManagement = React.lazy(() => import('../pages/manager/inventory/ProductionManagementComplete'));
const StockTransfers = React.lazy(() => import('../pages/manager/inventory/StockTransfersComplete'));
const StockAdjustments = React.lazy(() => import('../pages/manager/inventory/StockAdjustments'));
const GoodsReceivedNotes = React.lazy(() => import('../pages/manager/inventory/GoodsReceivedNotes'));
const OrderingSuggestions = React.lazy(() => import('../pages/manager/inventory/OrderingSuggestions'));
const InventoryReports = React.lazy(() => import('../pages/manager/inventory/InventoryReports'));
const MenuEngineering = React.lazy(() => import('../pages/manager/inventory/MenuEngineering'));
const SalesMixAnalysis = React.lazy(() => import('../pages/manager/inventory/SalesMixAnalysis'));
const MealPlanning = React.lazy(() => import('../pages/manager/inventory/MealPlanning'));
const SuppliersAdmin = React.lazy(() => import('../pages/manager/Suppliers'));
const ProductManagement = React.lazy(() => import('../pages/manager/ProductManagement'));

// ─── Apicbase Parity ────────────────────────────────────────────────────────────
const SupplierManagement = React.lazy(() => import('../pages/manager/inventory/SupplierManagement'));
const InventoryValuation = React.lazy(() => import('../pages/manager/inventory/InventoryValuation'));
const TheoreticalVsActual = React.lazy(() => import('../pages/manager/inventory/TheoreticalVsActual'));
const TraceabilityView = React.lazy(() => import('../pages/manager/inventory/TraceabilityView'));
const UnitConversionMatrix = React.lazy(() => import('../pages/manager/inventory/UnitConversionMatrix'));
const MobileStockCount = React.lazy(() => import('../pages/manager/inventory/MobileStockCount'));

export const inventoryRoutes = (
    <>
        <Route path="inventory" element={<RoleRoute requiredRole="MANAGER"><InventoryDashboard /></RoleRoute>} />
        <Route path="inventory-detail" element={<RoleRoute requiredRole="MANAGER"><InventoryPage /></RoleRoute>} />
        <Route path="inventory-dashboard" element={<RoleRoute requiredRole="MANAGER"><InventoryDashboard /></RoleRoute>} />
        <Route path="inventory-reports" element={<RoleRoute requiredRole="MANAGER"><InventoryReports /></RoleRoute>} />
        <Route path="inventory-items" element={<RoleRoute requiredRole="MANAGER"><InventoryItemsNew /></RoleRoute>} />
        <Route path="inventory-items-list" element={<Navigate to="/manager/inventory-items" replace />} />
        <Route path="inventory-suppliers" element={<RoleRoute requiredRole="OWNER"><Suppliers /></RoleRoute>} />
        <Route path="inventory-purchase-orders" element={<RoleRoute requiredRole="OWNER"><PurchaseOrdersNew /></RoleRoute>} />
        <Route path="inventory-stock-count" element={<RoleRoute requiredRole="MANAGER"><StockCount /></RoleRoute>} />
        <Route path="inventory-waste" element={<RoleRoute requiredRole="MANAGER"><WasteLog /></RoleRoute>} />
        <Route path="inventory-recipes" element={<RoleRoute requiredRole="OWNER"><RecipeManagement /></RoleRoute>} />
        <Route path="inventory-recipes/:recipeId" element={<RoleRoute requiredRole="OWNER"><RecipeDetail /></RoleRoute>} />
        <Route path="inventory-recipes/:recipeId/edit" element={<RoleRoute requiredRole="OWNER"><RecipeEditor /></RoleRoute>} />
        <Route path="inventory-recipes/new" element={<RoleRoute requiredRole="OWNER"><RecipeEditor /></RoleRoute>} />
        <Route path="inventory-production" element={<RoleRoute requiredRole="MANAGER"><ProductionManagement /></RoleRoute>} />
        <Route path="inventory-transfers" element={<RoleRoute requiredRole="OWNER"><StockTransfers /></RoleRoute>} />
        <Route path="inventory-adjustments" element={<RoleRoute requiredRole="OWNER"><StockAdjustments /></RoleRoute>} />
        <Route path="inventory-grn" element={<RoleRoute requiredRole="MANAGER"><GoodsReceivedNotes /></RoleRoute>} />
        <Route path="inventory-ordering" element={<RoleRoute requiredRole="MANAGER"><OrderingSuggestions /></RoleRoute>} />
        <Route path="menu-engineering" element={<RoleRoute requiredRole="MANAGER"><MenuEngineering /></RoleRoute>} />
        <Route path="sales-mix" element={<RoleRoute requiredRole="MANAGER"><SalesMixAnalysis /></RoleRoute>} />
        <Route path="meal-planning" element={<RoleRoute requiredRole="MANAGER"><MealPlanning /></RoleRoute>} />
        <Route path="suppliers" element={<RoleRoute requiredRole="OWNER"><SuppliersAdmin /></RoleRoute>} />
        <Route path="products" element={<RoleRoute requiredRole="MANAGER"><ProductManagement /></RoleRoute>} />

        {/* Apicbase Parity Features */}
        <Route path="supplier-management" element={<RoleRoute requiredRole="MANAGER"><SupplierManagement /></RoleRoute>} />
        <Route path="inventory-valuation" element={<RoleRoute requiredRole="MANAGER"><InventoryValuation /></RoleRoute>} />
        <Route path="theoretical-vs-actual" element={<RoleRoute requiredRole="MANAGER"><TheoreticalVsActual /></RoleRoute>} />
        <Route path="inventory-traceability" element={<RoleRoute requiredRole="MANAGER"><TraceabilityView /></RoleRoute>} />
        <Route path="unit-conversion" element={<RoleRoute requiredRole="MANAGER"><UnitConversionMatrix /></RoleRoute>} />
        <Route path="mobile-stock-count" element={<RoleRoute requiredRole="MANAGER"><MobileStockCount /></RoleRoute>} />
    </>
);
