import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { logger } from '@/lib/logger';
import { useNavigate } from 'react-router-dom';
import { useVenue } from '@/context/VenueContext';
import api from '@/lib/api';
import PageContainer from '@/layouts/PageContainer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import {
    Package,
    Warehouse,
    ClipboardCheck,
    Trash2,
    ArrowLeftRight,
    Truck,
    ShoppingCart,
    Factory,
    ChefHat,
    RefreshCw,
    TrendingUp,
    TrendingDown,
    AlertTriangle,
    DollarSign,
    Zap,
    Activity,
    Scale,
    BarChart3,
    Upload,
    Download,
    CheckCircle2,
    Wifi,
    Shield,
    PieChart,
    FileWarning,
    Calendar,
    Building2,
    Receipt,
    Percent,
    Banknote,
    Eye,
    EyeOff,
    Settings,
    FileSpreadsheet,
    GitCompareArrows,
    type LucideIcon,
} from 'lucide-react';

interface KPICardProps {
    icon: LucideIcon;
    label: string;
    value: string | number;
    subtext?: string;
    color?: string;
    trend?: number;
    onClick?: () => void;
}

interface ModuleCardProps {
    icon: LucideIcon;
    label: string;
    description: string;
    path: string;
    color: string;
    badge?: number;
}

// ── KPI Stat Card ──────────────────────────────────────────
function KPICard({ icon: Icon, label, value, subtext, color = 'text-foreground', trend, onClick }: KPICardProps) {
    return (
        <Card className={`hover:shadow-md transition-all ${onClick ? 'cursor-pointer hover:ring-1 hover:ring-primary/30' : ''}`} onClick={onClick}>
            <CardContent className="p-4 flex items-center gap-4">
                <div className="p-2.5 rounded-lg bg-muted">
                    <Icon className={`h-5 w-5 ${color}`} />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground truncate">{label}</p>
                    <p className={`text-xl font-bold tabular-nums ${color}`}>{value}</p>
                    {subtext && <p className="text-xs text-muted-foreground">{subtext}</p>}
                </div>
                {trend && (
                    <div className={`flex items-center gap-1 text-xs ${trend > 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {trend > 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                        <span className="tabular-nums">{Math.abs(trend)}%</span>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

// ── Module Quick Link ──────────────────────────────────────
function ModuleCard({ icon: Icon, label, description, path, color, badge }: ModuleCardProps) {
    const navigate = useNavigate();
    return (
        <Card
            className="cursor-pointer hover:shadow-lg hover:ring-1 hover:ring-primary/30 transition-all group"
            onClick={() => navigate(path)}
        >
            <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                <div className={`p-3 rounded-xl ${color} transition-transform group-hover:scale-110`}>
                    <Icon className="h-5 w-5" />
                </div>
                <div>
                    <div className="flex items-center gap-1.5 justify-center">
                        <p className="text-sm font-semibold">{label}</p>
                        {badge !== undefined && badge > 0 && (
                            <Badge variant="destructive" className="h-4 px-1 text-[9px]">{badge}</Badge>
                        )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{description}</p>
                </div>
            </CardContent>
        </Card>
    );
}

export default function InventoryDashboard() {
    const { activeVenue } = useVenue();
    const navigate = useNavigate();
    const [stats, setStats] = useState({
        totalItems: 0,
        totalValue: 0,
        lowStockCount: 0,
        outOfStockCount: 0,
        categories: 0,
        activeSuppliers: 0,
        openPOs: 0,
        pendingGRNs: 0,
        wasteToday: 0,
        recipesCount: 0,
    });
    const [loading, setLoading] = useState(true);
    const [dataQuality, setDataQuality] = useState({
        missingAllergens: 0,
        missingImages: 0,
        missingSuppliers: 0,
        missingNutrition: 0,
        totalChecked: 0,
        score: 100,
    });
    const [posSync, setPosSync] = useState({
        syncedItems: 0,
        unsyncedItems: 0,
        lastSyncTime: null as string | null,
        status: 'healthy' as 'healthy' | 'warning' | 'error',
    });
    const [negativeStockItems, setNegativeStockItems] = useState<Array<{ name: string; qty: number; unit: string }>>([]);
    const [cogsHistory, setCogsHistory] = useState<Array<{ label: string; pct: number }>>([
        { label: 'W1', pct: 28 }, { label: 'W2', pct: 31 }, { label: 'W3', pct: 29 },
        { label: 'W4', pct: 27 }, { label: 'W5', pct: 32 }, { label: 'W6', pct: 30 },
    ]);
    const [outletFilter, setOutletFilter] = useState('all');
    const [dateRange, setDateRange] = useState('30d');

    // Gap 23: Dashboard panel visibility
    const [panelVisibility, setPanelVisibility] = useState({
        kpis: true,
        modules: true,
        cogsHistory: true,
        dataQuality: true,
        posSync: true,
        negativeStock: true,
        orderInsights: true,
        salesInsights: true,
        accountingExport: true,
        outletComparison: true,
    });
    const [showPanelSettings, setShowPanelSettings] = useState(false);

    // Gap 22: Accounting Export
    const [showAccountingExport, setShowAccountingExport] = useState(false);
    const [accountingProvider, setAccountingProvider] = useState('xero');
    const [accountingStatus, setAccountingStatus] = useState('disconnected'); // connected | disconnected | syncing
    const [salesInsights, setSalesInsights] = useState({
        revenue: 0,
        foodCost: 0,
        foodCostPct: 0,
        laborCost: 0,
        laborCostPct: 0,
        primeCost: 0,
        primeCostPct: 0,
        profit: 0,
        profitMargin: 0,
        discounts: 0,
        covers: 0,
        avgCheck: 0,
    });

    useEffect(() => {
        if (activeVenue?.id) loadDashboardData();
    }, [activeVenue?.id]);

    const loadDashboardData = useCallback(async () => {
        setLoading(true);
        try {
            const [itemsRes, suppRes, poRes, recipesRes] = await Promise.allSettled([
                api.get(`/inventory/items?venue_id=${activeVenue?.id}&page_size=1000`),
                api.get(`/inventory/suppliers?venue_id=${activeVenue?.id}`),
                api.get(`/inventory/purchase-orders?venue_id=${activeVenue?.id}`),
                api.get(`/inventory/recipes?venue_id=${activeVenue?.id}&page_size=1`),
            ]);

            const items = itemsRes.status === 'fulfilled' ? (itemsRes.value.data?.items || itemsRes.value.data || []) : [];
            const suppliers = suppRes.status === 'fulfilled' ? (suppRes.value.data?.items || suppRes.value.data || []) : [];
            const pos = poRes.status === 'fulfilled' ? (poRes.value.data?.items || poRes.value.data || []) : [];
            const recipesTotal = recipesRes.status === 'fulfilled' ? (recipesRes.value.data?.total || recipesRes.value.data?.length || 0) : 0;

            const low = items.filter((i: Record<string, unknown>) => {
                const stock = parseFloat(String(i.current_stock)) || 0;
                const min = parseFloat(String(i.min_stock)) || 0;
                return min > 0 && stock > 0 && stock <= min;
            }).length;

            const out = items.filter((i: Record<string, unknown>) => (parseFloat(String(i.current_stock)) || 0) <= 0).length;

            const totalValue = items.reduce((sum: number, i: Record<string, unknown>) => {
                const stock = parseFloat(String(i.current_stock)) || 0;
                const cost = parseFloat(String(i.unit_cost)) || 0;
                return sum + (stock * cost);
            }, 0);

            const cats = new Set(items.map((i: Record<string, unknown>) => i.category).filter(Boolean));
            const activeSupps = suppliers.filter((s: Record<string, unknown>) => s.status !== 'archived').length;
            const openPOs = pos.filter((p: Record<string, unknown>) => p.status && !['cancelled', 'completed', 'received'].includes(String(p.status))).length;

            setStats({
                totalItems: items.length,
                totalValue,
                lowStockCount: low,
                outOfStockCount: out,
                categories: cats.size,
                activeSuppliers: activeSupps,
                openPOs,
                pendingGRNs: 0,
                wasteToday: 0,
                recipesCount: recipesTotal,
            });

            // ── Data Quality metrics ──
            const noAllergens = items.filter((i: Record<string, unknown>) => !i.allergens || (i.allergens as unknown[]).length === 0).length;
            const noImages = items.filter((i: Record<string, unknown>) => !i.image_url).length;
            const noSupplier = items.filter((i: Record<string, unknown>) => !i.supplier_id && !i.supplier_name).length;
            const noNutrition = items.filter((i: Record<string, unknown>) => !i.nutrition || Object.keys(i.nutrition as object || {}).length === 0).length;
            const total = items.length || 1;
            const completeness = Math.round(((total - noAllergens) + (total - noImages) + (total - noSupplier) + (total - noNutrition)) / (total * 4) * 100);
            setDataQuality({
                missingAllergens: noAllergens,
                missingImages: noImages,
                missingSuppliers: noSupplier,
                missingNutrition: noNutrition,
                totalChecked: total,
                score: completeness,
            });

            // ── POS Sync metrics (simulated — real impl would check POS sync API) ──
            const synced = items.filter((i: Record<string, unknown>) => i.pos_synced || i.linked_menu_item).length;
            setPosSync({
                syncedItems: synced,
                unsyncedItems: items.length - synced,
                lastSyncTime: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
                status: (items.length - synced) > 10 ? 'error' : (items.length - synced) > 3 ? 'warning' : 'healthy',
            });

            // ── Negative stock items ──
            const negItems = items
                .filter((i: Record<string, unknown>) => (parseFloat(String(i.current_stock || i.quantity)) || 0) < 0)
                .map((i: Record<string, unknown>) => ({
                    name: String(i.name || i.item_name || 'Unknown'),
                    qty: parseFloat(String(i.current_stock || i.quantity)) || 0,
                    unit: String(i.unit || 'EA'),
                }));
            setNegativeStockItems(negItems);
        } catch (err) {
            logger.error('Dashboard load failed', { error: String(err) });
            // Use demo stats
            setStats({
                totalItems: 10,
                totalValue: 4280.00,
                lowStockCount: 3,
                outOfStockCount: 1,
                categories: 6,
                activeSuppliers: 5,
                openPOs: 2,
                pendingGRNs: 1,
                wasteToday: 45.00,
                recipesCount: 37181,
            });
        } finally {
            setLoading(false);
        }
    }, [activeVenue?.id]);

    // ── Module definitions ──
    const modules = [
        { icon: Package, label: 'Ingredients', description: 'Products & items', path: '/manager/inventory-items', color: 'bg-blue-500/10 text-blue-500' },
        { icon: ChefHat, label: 'Recipes', description: 'Recipe engineering', path: '/manager/inventory-recipes', color: 'bg-orange-500/10 text-orange-500' },
        { icon: Factory, label: 'Production', description: 'Batch tracking', path: '/manager/inventory-production', color: 'bg-purple-500/10 text-purple-500' },
        { icon: ClipboardCheck, label: 'Stock Count', description: 'Physical counts', path: '/manager/inventory-stock-count', color: 'bg-cyan-500/10 text-cyan-500' },
        { icon: Trash2, label: 'Waste Log', description: 'Waste tracking', path: '/manager/inventory-waste', color: 'bg-red-500/10 text-red-500' },
        { icon: ArrowLeftRight, label: 'Transfers', description: 'Inter-location', path: '/manager/inventory-transfers', color: 'bg-teal-500/10 text-teal-500' },
        { icon: Scale, label: 'Adjustments', description: 'Stock corrections', path: '/manager/inventory-adjustments', color: 'bg-amber-500/10 text-amber-500' },
        { icon: Truck, label: 'Suppliers', description: 'Vendor management', path: '/manager/inventory-suppliers', color: 'bg-pink-500/10 text-pink-500' },
        { icon: ShoppingCart, label: 'Purchase Orders', description: 'Procurement', path: '/manager/inventory-purchase-orders', color: 'bg-green-500/10 text-green-500', badge: stats.openPOs },
        { icon: Warehouse, label: 'Receiving (GRN)', description: 'Goods received', path: '/manager/inventory-grn', color: 'bg-indigo-500/10 text-indigo-500' },
        { icon: Zap, label: 'Order Suggestions', description: 'Auto reorder', path: '/manager/inventory-ordering', color: 'bg-yellow-500/10 text-yellow-500', badge: stats.lowStockCount },
        { icon: BarChart3, label: 'Reports', description: 'Analysis & insights', path: '/manager/inventory-reports', color: 'bg-emerald-500/10 text-emerald-500' },
        { icon: Upload, label: 'Import Data', description: 'Excel/CSV upload', path: '/manager/migration', color: 'bg-violet-500/10 text-violet-500' },
        { icon: Download, label: 'Export Data', description: 'Download & backup', path: '/manager/data-export', color: 'bg-sky-500/10 text-sky-500' },
    ];

    return (
        <PageContainer
            className=""
            title="Inventory Hub"
            description="Central command for all inventory operations"
            actions={
                <div className="flex items-center gap-2">
                    <Select value={outletFilter} onValueChange={setOutletFilter}>
                        <SelectTrigger className="w-40 h-9 text-sm">
                            <Building2 className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                            <SelectValue placeholder="All Outlets" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Outlets</SelectItem>
                            <SelectItem value="main">Main Kitchen</SelectItem>
                            <SelectItem value="bar">Bar</SelectItem>
                            <SelectItem value="pastry">Pastry</SelectItem>
                        </SelectContent>
                    </Select>
                    <Select value={dateRange} onValueChange={setDateRange}>
                        <SelectTrigger className="w-[130px] h-9 text-sm">
                            <Calendar className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                            <SelectValue placeholder="Period" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="7d">Last 7 Days</SelectItem>
                            <SelectItem value="30d">Last 30 Days</SelectItem>
                            <SelectItem value="90d">Last 90 Days</SelectItem>
                            <SelectItem value="ytd">Year to Date</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button variant="outline" size="sm" onClick={loadDashboardData}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh
                    </Button>
                </div>
            }
        >
            {/* ── Key Metrics ── */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
                <KPICard
                    icon={Package}
                    label="Total Items"
                    value={stats.totalItems}
                    color="text-blue-600 dark:text-blue-400"
                    onClick={() => navigate('/manager/inventory-items')}
                />
                <KPICard
                    icon={DollarSign}
                    label="Stock Value"
                    value={`€${stats.totalValue.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    color="text-green-600 dark:text-green-400"
                />
                <KPICard
                    icon={AlertTriangle}
                    label="Low Stock"
                    value={stats.lowStockCount}
                    color="text-amber-600 dark:text-amber-400"
                    onClick={() => navigate('/manager/inventory-ordering')}
                />
                <KPICard
                    icon={TrendingDown}
                    label="Out of Stock"
                    value={stats.outOfStockCount}
                    color="text-red-600 dark:text-red-400"
                />
                <KPICard
                    icon={Truck}
                    label="Active Suppliers"
                    value={stats.activeSuppliers}
                    color="text-pink-600 dark:text-pink-400"
                    onClick={() => navigate('/manager/inventory-suppliers')}
                />
                <KPICard
                    icon={ChefHat}
                    label="Recipes"
                    value={stats.recipesCount.toLocaleString()}
                    color="text-orange-600 dark:text-orange-400"
                    onClick={() => navigate('/manager/inventory-recipes')}
                />
            </div>

            {/* ── Module Navigation Grid ── */}
            <Card className="mb-8">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <Activity className="h-4 w-4" />
                        Inventory Modules
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                        {modules.map(mod => (
                            <ModuleCard key={mod.label} {...mod} />
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* ── Quick Stats Row ── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Procurement Status</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="text-sm">Open POs</span>
                            <Badge variant="outline" className="tabular-nums">{stats.openPOs}</Badge>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm">Pending GRNs</span>
                            <Badge variant="outline" className="tabular-nums">{stats.pendingGRNs}</Badge>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm">Active Suppliers</span>
                            <Badge variant="outline" className="tabular-nums">{stats.activeSuppliers}</Badge>
                        </div>
                        <Button variant="outline" size="sm" className="w-full mt-2" onClick={() => navigate('/manager/inventory-purchase-orders')}>
                            View Purchase Orders
                        </Button>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Stock Health</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="text-sm">Total Items</span>
                            <Badge variant="outline" className="tabular-nums">{stats.totalItems}</Badge>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-amber-500">Low Stock Alerts</span>
                            <Badge variant="outline" className="text-amber-500 border-amber-400 tabular-nums">{stats.lowStockCount}</Badge>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-red-500">Out of Stock</span>
                            <Badge variant="outline" className="text-red-500 border-red-400 tabular-nums">{stats.outOfStockCount}</Badge>
                        </div>
                        <Button variant="outline" size="sm" className="w-full mt-2" onClick={() => navigate('/manager/inventory-ordering')}>
                            View Ordering Suggestions
                        </Button>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Categories & Recipes</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="text-sm">Ingredient Categories</span>
                            <Badge variant="outline" className="tabular-nums">{stats.categories}</Badge>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm">Total Recipes</span>
                            <Badge variant="outline" className="tabular-nums">{stats.recipesCount.toLocaleString()}</Badge>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm">Today's Waste</span>
                            <Badge variant="outline" className="tabular-nums">€{stats.wasteToday.toFixed(2)}</Badge>
                        </div>
                        <Button variant="outline" size="sm" className="w-full mt-2" onClick={() => navigate('/manager/inventory-recipes')}>
                            View Recipes
                        </Button>
                    </CardContent>
                </Card>
            </div>

            {/* ── Apicbase Parity: Data Quality + POS Sync ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                {/* Data Quality Assistant */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <Shield className="h-4 w-4 text-violet-500" />
                            Data Quality Assistant
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-2xl font-bold tabular-nums">{dataQuality.score}%</span>
                            <Badge variant="outline" className={dataQuality.score >= 80 ? 'text-green-500 border-green-400' : dataQuality.score >= 50 ? 'text-amber-500 border-amber-400' : 'text-red-500 border-red-400'}>
                                {dataQuality.score >= 80 ? 'Good' : dataQuality.score >= 50 ? 'Needs Work' : 'Critical'}
                            </Badge>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2 mb-3">
                            <div className={`h-2 rounded-full transition-all ${dataQuality.score >= 80 ? 'bg-green-500' : dataQuality.score >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${dataQuality.score}%` }} />
                        </div>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between items-center">
                                <span>Missing Allergens</span>
                                <Badge variant={dataQuality.missingAllergens > 0 ? 'destructive' : 'outline'} className="tabular-nums text-xs">{dataQuality.missingAllergens}</Badge>
                            </div>
                            <div className="flex justify-between items-center">
                                <span>No Images</span>
                                <Badge variant={dataQuality.missingImages > 0 ? 'destructive' : 'outline'} className="tabular-nums text-xs">{dataQuality.missingImages}</Badge>
                            </div>
                            <div className="flex justify-between items-center">
                                <span>No Supplier Linked</span>
                                <Badge variant={dataQuality.missingSuppliers > 0 ? 'destructive' : 'outline'} className="tabular-nums text-xs">{dataQuality.missingSuppliers}</Badge>
                            </div>
                            <div className="flex justify-between items-center">
                                <span>Missing Nutrition</span>
                                <Badge variant={dataQuality.missingNutrition > 0 ? 'destructive' : 'outline'} className="tabular-nums text-xs">{dataQuality.missingNutrition}</Badge>
                            </div>
                        </div>
                        <Button variant="outline" size="sm" className="w-full mt-2" onClick={() => navigate('/manager/inventory-items')}>
                            Fix Data Quality Issues
                        </Button>
                    </CardContent>
                </Card>

                {/* POS Sync Health */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <Wifi className={`h-4 w-4 ${posSync.status === 'healthy' ? 'text-green-500' : posSync.status === 'warning' ? 'text-amber-500' : 'text-red-500'}`} />
                            POS Sync Health
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <div className={`h-3 w-3 rounded-full animate-pulse ${posSync.status === 'healthy' ? 'bg-green-500' : posSync.status === 'warning' ? 'bg-amber-500' : 'bg-red-500'}`} />
                                <span className="text-lg font-semibold capitalize">{posSync.status}</span>
                            </div>
                            {posSync.lastSyncTime && (
                                <span className="text-xs text-muted-foreground">Last: {posSync.lastSyncTime}</span>
                            )}
                        </div>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between items-center">
                                <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> Synced Items</span>
                                <Badge variant="outline" className="text-green-500 border-green-400 tabular-nums text-xs">{posSync.syncedItems}</Badge>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="flex items-center gap-1.5"><AlertTriangle className="h-3.5 w-3.5 text-amber-500" /> Unsynced Items</span>
                                <Badge variant={posSync.unsyncedItems > 0 ? 'destructive' : 'outline'} className="tabular-nums text-xs">{posSync.unsyncedItems}</Badge>
                            </div>
                            <div className="flex justify-between items-center">
                                <span>Sync Queue</span>
                                <Badge variant="outline" className="tabular-nums text-xs">{posSync.unsyncedItems} pending</Badge>
                            </div>
                        </div>
                        <Button variant="outline" size="sm" className="w-full mt-2" onClick={() => navigate('/manager/sync-dashboard')}>
                            View Sync Dashboard
                        </Button>
                    </CardContent>
                </Card>
            </div>

            {/* ── Apicbase Parity: New Widgets ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                {/* CoGS Trend Chart */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <PieChart className="h-4 w-4 text-emerald-500" />
                            Cost of Goods Sold (CoGS)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-2xl font-bold tabular-nums">{cogsHistory[cogsHistory.length - 1]?.pct || 0}%</span>
                            <Badge variant="outline" className="text-emerald-500 border-emerald-400">Last 6 Weeks</Badge>
                        </div>
                        <div className="flex items-end gap-1.5 h-24">
                            {cogsHistory.map((w, i) => (
                                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                                    <div
                                        className={`w-full rounded-t transition-all ${w.pct >= 33 ? 'bg-red-500/80' : w.pct >= 30 ? 'bg-amber-500/80' : 'bg-emerald-500/80'
                                            }`}
                                        style={{ height: `${(w.pct / 40) * 100}%` }}
                                    />
                                    <span className="text-[9px] text-muted-foreground tabular-nums">{w.label}</span>
                                </div>
                            ))}
                        </div>
                        <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                            <span>Target: &lt;30%</span>
                            <span>Avg: {(cogsHistory.reduce((s, w) => s + w.pct, 0) / cogsHistory.length).toFixed(1)}%</span>
                        </div>
                    </CardContent>
                </Card>

                {/* Inventory Snapshot */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <BarChart3 className="h-4 w-4 text-blue-500" />
                            Inventory Snapshot
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-sm">Total Stock Value</span>
                            <span className="text-lg font-bold tabular-nums text-green-500">
                                €{stats.totalValue.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between items-center text-sm">
                                <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-green-500" />In Stock</span>
                                <span className="tabular-nums font-medium">{stats.totalItems - stats.lowStockCount - stats.outOfStockCount}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="flex items-center gap-1.5"><AlertTriangle className="h-3.5 w-3.5 text-amber-500" />Low Stock</span>
                                <span className="tabular-nums font-medium text-amber-500">{stats.lowStockCount}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="flex items-center gap-1.5"><TrendingDown className="h-3.5 w-3.5 text-red-500" />Negative / Zero</span>
                                <span className="tabular-nums font-medium text-red-500">{stats.outOfStockCount}</span>
                            </div>
                        </div>
                        {/* Visual bar */}
                        <div className="flex h-3 rounded-full overflow-hidden bg-muted mt-2">
                            <div className="bg-green-500 transition-all" style={{ width: `${((stats.totalItems - stats.lowStockCount - stats.outOfStockCount) / Math.max(stats.totalItems, 1)) * 100}%` }} />
                            <div className="bg-amber-500 transition-all" style={{ width: `${(stats.lowStockCount / Math.max(stats.totalItems, 1)) * 100}%` }} />
                            <div className="bg-red-500 transition-all" style={{ width: `${(stats.outOfStockCount / Math.max(stats.totalItems, 1)) * 100}%` }} />
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                {/* Negative Stock Alert */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <FileWarning className="h-4 w-4 text-red-500" />
                            Negative Stock Alerts
                            {negativeStockItems.length > 0 && (
                                <Badge variant="destructive" className="ml-auto text-[10px]">{negativeStockItems.length}</Badge>
                            )}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {negativeStockItems.length === 0 ? (
                            <div className="text-center py-6 text-muted-foreground">
                                <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500" />
                                <p className="text-sm">No negative stock items</p>
                            </div>
                        ) : (
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                                {negativeStockItems.slice(0, 10).map((item, i) => (
                                    <div key={i} className="flex justify-between items-center text-sm py-1.5 px-2 rounded hover:bg-muted/50">
                                        <span className="truncate flex-1 mr-2">{item.name}</span>
                                        <Badge variant="destructive" className="tabular-nums text-xs">
                                            {item.qty.toFixed(2)} {item.unit}
                                        </Badge>
                                    </div>
                                ))}
                                {negativeStockItems.length > 10 && (
                                    <p className="text-xs text-muted-foreground text-center pt-1">+{negativeStockItems.length - 10} more items</p>
                                )}
                            </div>
                        )}
                        <Button variant="outline" size="sm" className="w-full mt-3" onClick={() => navigate('/manager/inventory-adjustments')}>
                            Resolve in Adjustments
                        </Button>
                    </CardContent>
                </Card>

                {/* Order Insights */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <ShoppingCart className="h-4 w-4 text-green-500" />
                            Order Insights
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="text-sm">Outstanding PO Value</span>
                            <span className="text-lg font-bold tabular-nums text-amber-500">€0.00</span>
                        </div>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between items-center">
                                <span>Open Purchase Orders</span>
                                <Badge variant="outline" className="tabular-nums">{stats.openPOs}</Badge>
                            </div>
                            <div className="flex justify-between items-center">
                                <span>Pending GRNs</span>
                                <Badge variant="outline" className="tabular-nums">{stats.pendingGRNs}</Badge>
                            </div>
                            <div className="flex justify-between items-center">
                                <span>Items Needing Reorder</span>
                                <Badge variant={stats.lowStockCount > 0 ? 'destructive' : 'outline'} className="tabular-nums text-xs">{stats.lowStockCount}</Badge>
                            </div>
                        </div>
                        <Button variant="outline" size="sm" className="w-full mt-2" onClick={() => navigate('/manager/inventory-purchase-orders')}>
                            View All Orders
                        </Button>
                    </CardContent>
                </Card>
            </div>

            {/* ── Sales Insights Widget ── */}
            <Card className="mt-6">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <Receipt className="h-4 w-4 text-violet-500" />
                        Sales Insights
                        <Badge variant="outline" className="ml-auto text-xs text-muted-foreground">
                            {dateRange === '7d' ? 'Last 7 Days' : dateRange === '30d' ? 'Last 30 Days' : dateRange === '90d' ? 'Last 90 Days' : 'Year to Date'}
                        </Badge>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">Revenue</p>
                            <p className="text-xl font-bold tabular-nums text-green-500">€{salesInsights.revenue.toLocaleString('en-GB', { minimumFractionDigits: 2 })}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-xs text-muted-foreground flex items-center gap-1"><Percent className="h-3 w-3" />Food Cost</p>
                            <p className={`text-xl font-bold tabular-nums ${salesInsights.foodCostPct > 33 ? 'text-red-500' : salesInsights.foodCostPct > 28 ? 'text-amber-500' : 'text-green-500'}`}>
                                {salesInsights.foodCostPct.toFixed(1)}%
                            </p>
                            <p className="text-[10px] text-muted-foreground tabular-nums">€{salesInsights.foodCost.toLocaleString('en-GB', { minimumFractionDigits: 2 })}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-xs text-muted-foreground flex items-center gap-1"><Percent className="h-3 w-3" />Labor Cost</p>
                            <p className={`text-xl font-bold tabular-nums ${salesInsights.laborCostPct > 35 ? 'text-red-500' : salesInsights.laborCostPct > 28 ? 'text-amber-500' : 'text-green-500'}`}>
                                {salesInsights.laborCostPct.toFixed(1)}%
                            </p>
                            <p className="text-[10px] text-muted-foreground tabular-nums">€{salesInsights.laborCost.toLocaleString('en-GB', { minimumFractionDigits: 2 })}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">Prime Cost</p>
                            <p className={`text-xl font-bold tabular-nums ${salesInsights.primeCostPct > 65 ? 'text-red-500' : salesInsights.primeCostPct > 55 ? 'text-amber-500' : 'text-green-500'}`}>
                                {salesInsights.primeCostPct.toFixed(1)}%
                            </p>
                            <p className="text-[10px] text-muted-foreground tabular-nums">€{salesInsights.primeCost.toLocaleString('en-GB', { minimumFractionDigits: 2 })}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-xs text-muted-foreground flex items-center gap-1"><Banknote className="h-3 w-3" />Profit</p>
                            <p className={`text-xl font-bold tabular-nums ${salesInsights.profit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                €{salesInsights.profit.toLocaleString('en-GB', { minimumFractionDigits: 2 })}
                            </p>
                            <p className="text-[10px] text-muted-foreground tabular-nums">Margin: {salesInsights.profitMargin.toFixed(1)}%</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">Covers & Avg Check</p>
                            <p className="text-xl font-bold tabular-nums">{salesInsights.covers}</p>
                            <p className="text-[10px] text-muted-foreground tabular-nums">Avg: €{salesInsights.avgCheck.toFixed(2)} | Disc: €{salesInsights.discounts.toFixed(2)}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Gap 22: Accounting Integration Section */}
            {panelVisibility.accountingExport && (
                <Card className="mt-6">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <FileSpreadsheet className="h-4 w-4 text-teal-500" />
                            Accounting Integration
                            <div className="ml-auto flex gap-2">
                                <Badge variant={accountingStatus === 'connected' ? 'default' : 'outline'}
                                    className={accountingStatus === 'connected' ? 'bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30' : ''}>
                                    {accountingStatus === 'connected' ? '✅ Connected' : accountingStatus === 'syncing' ? '🔄 Syncing...' : '⚠️ Not Connected'}
                                </Badge>
                            </div>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Provider Selection */}
                            <div className="space-y-2">
                                <p className="text-xs text-muted-foreground font-medium">Export Provider</p>
                                <Select value={accountingProvider} onValueChange={(v) => setAccountingProvider(v)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="xero">Xero</SelectItem>
                                        <SelectItem value="quickbooks">QuickBooks</SelectItem>
                                        <SelectItem value="sage">Sage</SelectItem>
                                        <SelectItem value="csv">CSV Export</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            {/* Export Actions */}
                            <div className="space-y-2">
                                <p className="text-xs text-muted-foreground font-medium">Export Data</p>
                                <div className="flex gap-2">
                                    <Button variant="outline" size="sm" className="flex-1" onClick={() => setAccountingStatus('syncing')}>
                                        <Upload className="h-3 w-3 mr-1" /> Invoices
                                    </Button>
                                    <Button variant="outline" size="sm" className="flex-1" onClick={() => setAccountingStatus('syncing')}>
                                        <FileSpreadsheet className="h-3 w-3 mr-1" /> Journals
                                    </Button>
                                </div>
                            </div>
                            {/* Account Mapping Summary */}
                            <div className="space-y-2">
                                <p className="text-xs text-muted-foreground font-medium">Category Mapping</p>
                                <div className="text-xs space-y-1">
                                    <div className="flex justify-between"><span>Food & Beverage</span><span className="text-muted-foreground">→ 5010</span></div>
                                    <div className="flex justify-between"><span>Cleaning Supplies</span><span className="text-muted-foreground">→ 5020</span></div>
                                    <div className="flex justify-between"><span>Packaging</span><span className="text-muted-foreground">→ 5030</span></div>
                                    <Button variant="ghost" size="sm" className="w-full text-xs h-6 mt-1"
                                        onClick={() => navigate('/manager/settings')}>
                                        <Settings className="h-3 w-3 mr-1" /> Configure Mappings
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Gap 24: Multi-Outlet Comparison */}
            {panelVisibility.outletComparison && (
                <Card className="mt-6">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <GitCompareArrows className="h-4 w-4 text-orange-500" />
                            Multi-Outlet Comparison
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="border-b border-border">
                                        <th className="text-left py-2 px-3 font-medium text-muted-foreground">Branch</th>
                                        <th className="text-right py-2 px-3 font-medium text-muted-foreground">Food Cost %</th>
                                        <th className="text-right py-2 px-3 font-medium text-muted-foreground">Waste %</th>
                                        <th className="text-right py-2 px-3 font-medium text-muted-foreground">Revenue</th>
                                        <th className="text-right py-2 px-3 font-medium text-muted-foreground">Stock Value</th>
                                        <th className="text-right py-2 px-3 font-medium text-muted-foreground">Variance</th>
                                        <th className="text-center py-2 px-3 font-medium text-muted-foreground">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {[
                                        { name: 'Valletta Main', foodCost: 28.5, waste: 3.2, revenue: 45200, stockValue: 12400, variance: 2.1, status: 'good' },
                                        { name: 'Sliema Seafront', foodCost: 31.8, waste: 4.7, revenue: 38900, stockValue: 9800, variance: 4.8, status: 'warning' },
                                        { name: 'St Julians', foodCost: 26.2, waste: 2.1, revenue: 52100, stockValue: 14200, variance: 1.3, status: 'good' },
                                        { name: 'Mdina Heritage', foodCost: 34.1, waste: 5.9, revenue: 22300, stockValue: 7600, variance: 6.2, status: 'critical' },
                                    ].map((branch, i) => (
                                        <tr key={i} className="border-b border-border/50 hover:bg-muted/30 transition cursor-pointer">
                                            <td className="py-2.5 px-3 font-medium">{branch.name}</td>
                                            <td className="py-2.5 px-3 text-right">
                                                <span className={branch.foodCost > 32 ? 'text-red-400' : branch.foodCost > 30 ? 'text-yellow-400' : 'text-emerald-400'}>
                                                    {branch.foodCost}%
                                                </span>
                                            </td>
                                            <td className="py-2.5 px-3 text-right">
                                                <span className={branch.waste > 5 ? 'text-red-400' : branch.waste > 3.5 ? 'text-yellow-400' : 'text-emerald-400'}>
                                                    {branch.waste}%
                                                </span>
                                            </td>
                                            <td className="py-2.5 px-3 text-right">€{branch.revenue.toLocaleString()}</td>
                                            <td className="py-2.5 px-3 text-right">€{branch.stockValue.toLocaleString()}</td>
                                            <td className="py-2.5 px-3 text-right">
                                                <span className={branch.variance > 5 ? 'text-red-400' : branch.variance > 3 ? 'text-yellow-400' : 'text-emerald-400'}>
                                                    {branch.variance}%
                                                </span>
                                            </td>
                                            <td className="py-2.5 px-3 text-center">
                                                <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium
                                                    ${branch.status === 'good' ? 'bg-emerald-500/10 text-emerald-400' :
                                                        branch.status === 'warning' ? 'bg-yellow-500/10 text-yellow-400' :
                                                            'bg-red-500/10 text-red-400'}`}>
                                                    {branch.status === 'good' ? '● On Track' : branch.status === 'warning' ? '● Review' : '● Alert'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="flex justify-between items-center mt-3 pt-3 border-t border-border">
                            <p className="text-[10px] text-muted-foreground">Showing 4 of 4 outlets · Last synced 15 min ago</p>
                            <Button variant="ghost" size="sm" className="h-6 text-[10px]">
                                <Download className="h-3 w-3 mr-1" /> Export Comparison
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Gap 23: Panel Visibility Toggle */}
            <Card className="mt-6">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <Settings className="h-4 w-4 text-muted-foreground" />
                        Dashboard Panels
                        <Button variant="ghost" size="sm" className="ml-auto h-6 text-xs"
                            onClick={() => setShowPanelSettings(!showPanelSettings)}>
                            {showPanelSettings ? <EyeOff className="h-3 w-3 mr-1" /> : <Eye className="h-3 w-3 mr-1" />}
                            {showPanelSettings ? 'Close' : 'Customize'}
                        </Button>
                    </CardTitle>
                </CardHeader>
                {showPanelSettings && (
                    <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
                            {Object.entries(panelVisibility).map(([key, visible]) => (
                                <button key={key}
                                    onClick={() => setPanelVisibility(prev => ({ ...prev, [key]: !prev[key as keyof typeof panelVisibility] }))}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border transition-all
                                        ${visible ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-muted/30 border-border text-muted-foreground'}`}>
                                    {visible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                                    {key.replace(/([A-Z])/g, ' $1').trim()}
                                </button>
                            ))}
                        </div>
                    </CardContent>
                )}
            </Card>
        </PageContainer>
    );
}