import { useState, useEffect, useCallback } from 'react';
import { logger } from '@/lib/logger';
import { exportToCsv } from '@/lib/exportUtils';
import { useVenue } from '@/context/VenueContext';
import api from '@/lib/api';
import PageContainer from '@/layouts/PageContainer';
import DataTable from '@/components/shared/DataTable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    ArrowUpDown,
    TrendingUp,
    TrendingDown,
    AlertTriangle,
    Trash2,
    RefreshCw,
    Package,
    DollarSign,
    BarChart3,
    Activity,
    Calendar,
    Download,
    type LucideIcon,
} from 'lucide-react';

// ── Types ──
interface KPICardProps {
    icon: LucideIcon;
    label: string;
    value: string | number;
    subtext?: string;
    color?: string;
}

interface StockMovement {
    id: string;
    item_name: string;
    category: string;
    type: string;
    quantity: number;
    unit: string;
    date: string;
    reference: string;
    cost_impact: number;
}

interface VarianceItem {
    id: string;
    item_name: string;
    category: string;
    expected_stock: number;
    actual_stock: number;
    variance: number;
    variance_pct: number;
    unit: string;
    cost_impact: number;
    last_count_date: string;
}

interface WasteEntry {
    id: string;
    item_name: string;
    category: string;
    quantity: number;
    unit: string;
    reason: string;
    cost: number;
    date: string;
    logged_by: string;
}

// ── KPI Card ──
function KPICard({ icon: Icon, label, value, subtext, color = 'text-foreground' }: KPICardProps) {
    return (
        <Card className="hover:shadow-md transition-all">
            <CardContent className="p-4 flex items-center gap-4">
                <div className="p-2.5 rounded-lg bg-muted">
                    <Icon className={`h-5 w-5 ${color}`} />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground truncate">{label}</p>
                    <p className={`text-xl font-bold tabular-nums ${color}`}>{value}</p>
                    {subtext && <p className="text-xs text-muted-foreground">{subtext}</p>}
                </div>
            </CardContent>
        </Card>
    );
}

// Demo data generators removed — all data comes from API endpoints.

// ── Table column definitions ──
const MOVEMENT_COLUMNS = [
    { key: 'date', label: 'Date', sortable: true },
    { key: 'item_name', label: 'Item', sortable: true },
    { key: 'category', label: 'Category', render: (row: StockMovement) => <Badge variant="secondary">{row.category}</Badge> },
    {
        key: 'type', label: 'Type', sortable: true,
        render: (row: StockMovement) => {
            const colors: Record<string, string> = {
                'Purchase': 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20',
                'Transfer In': 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
                'Transfer Out': 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20',
                'Adjustment': 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
                'Waste': 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
                'Production': 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20',
            };
            return <Badge variant="outline" className={colors[row.type] || ''}>{row.type}</Badge>;
        }
    },
    {
        key: 'quantity', label: 'Qty', sortable: true,
        render: (row: StockMovement) => (
            <span className={row.quantity >= 0 ? 'text-green-500' : 'text-red-500'}>
                {row.quantity >= 0 ? '+' : ''}{row.quantity} {row.unit}
            </span>
        )
    },
    { key: 'reference', label: 'Reference' },
    {
        key: 'cost_impact', label: 'Cost Impact', sortable: true,
        render: (row: StockMovement) => (
            <span className={row.cost_impact >= 0 ? 'text-green-500' : 'text-red-500'}>
                {row.cost_impact >= 0 ? '+' : ''}€{Math.abs(row.cost_impact).toFixed(2)}
            </span>
        )
    },
];

const VARIANCE_COLUMNS = [
    { key: 'item_name', label: 'Item', sortable: true },
    { key: 'category', label: 'Category', render: (row: VarianceItem) => <Badge variant="secondary">{row.category}</Badge> },
    { key: 'expected_stock', label: 'Expected', sortable: true, render: (row: VarianceItem) => `${row.expected_stock} ${row.unit}` },
    { key: 'actual_stock', label: 'Actual', sortable: true, render: (row: VarianceItem) => `${row.actual_stock} ${row.unit}` },
    {
        key: 'variance', label: 'Variance', sortable: true,
        render: (row: VarianceItem) => (
            <span className={row.variance >= 0 ? 'text-green-500' : 'text-red-500'}>
                {row.variance >= 0 ? '+' : ''}{row.variance} {row.unit}
            </span>
        )
    },
    {
        key: 'variance_pct', label: 'Variance %', sortable: true,
        render: (row: VarianceItem) => {
            const abs = Math.abs(row.variance_pct);
            const color = abs > 10 ? 'text-red-500' : abs > 5 ? 'text-amber-500' : 'text-green-500';
            return <span className={color}>{row.variance_pct >= 0 ? '+' : ''}{row.variance_pct}%</span>;
        }
    },
    {
        key: 'cost_impact', label: 'Cost Impact', sortable: true,
        render: (row: VarianceItem) => (
            <span className={row.cost_impact >= 0 ? 'text-green-500' : 'text-red-500'}>
                €{Math.abs(row.cost_impact).toFixed(2)}
            </span>
        )
    },
    { key: 'last_count_date', label: 'Last Count', sortable: true },
];

const WASTE_COLUMNS = [
    { key: 'date', label: 'Date', sortable: true },
    { key: 'item_name', label: 'Item', sortable: true },
    { key: 'category', label: 'Category', render: (row: WasteEntry) => <Badge variant="secondary">{row.category}</Badge> },
    { key: 'quantity', label: 'Quantity', sortable: true, render: (row: WasteEntry) => `${row.quantity} ${row.unit}` },
    {
        key: 'reason', label: 'Reason', sortable: true,
        render: (row: WasteEntry) => {
            const colors: Record<string, string> = {
                'Expired': 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
                'Spoiled': 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20',
                'Over-production': 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
                'Preparation Trim': 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
                'Dropped': 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
                'Quality Issue': 'bg-pink-500/10 text-pink-500 border-pink-500/20',
                'Customer Return': 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20',
            };
            return <Badge variant="outline" className={colors[row.reason] || ''}>{row.reason}</Badge>;
        }
    },
    {
        key: 'cost', label: 'Cost', sortable: true,
        render: (row: WasteEntry) => <span className="text-red-500">€{row.cost.toFixed(2)}</span>
    },
    { key: 'logged_by', label: 'Logged By' },
];

export default function InventoryReports() {
    const { activeVenue } = useVenue();
    const [activeTab, setActiveTab] = useState('movements');
    const [movements, setMovements] = useState<StockMovement[]>([]);
    const [variances, setVariances] = useState<VarianceItem[]>([]);
    const [waste, setWaste] = useState<WasteEntry[]>([]);
    const [loading, setLoading] = useState(true);

    const loadReports = useCallback(async () => {
        setLoading(true);
        try {
            // Try API first, fallback to demo
            const [movRes, varRes, wasteRes] = await Promise.allSettled([
                api.get(`/inventory/reports/movements?venue_id=${activeVenue?.id}`),
                api.get(`/inventory/reports/variances?venue_id=${activeVenue?.id}`),
                api.get(`/inventory/reports/waste?venue_id=${activeVenue?.id}`),
            ]);

            const movData = movRes.status === 'fulfilled' ? (movRes.value.data?.items || movRes.value.data || []) : [];
            const varData = varRes.status === 'fulfilled' ? (varRes.value.data?.items || varRes.value.data || []) : [];
            const wasteData = wasteRes.status === 'fulfilled' ? (wasteRes.value.data?.items || wasteRes.value.data || []) : [];

            setMovements(movData);
            setVariances(varData);
            setWaste(wasteData);
        } catch (err: any) {
            logger.error('Failed to load reports', { error: String(err) });
            setMovements([]);
            setVariances([]);
            setWaste([]);
        } finally {
            setLoading(false);
        }
    }, [activeVenue?.id]);

    useEffect(() => {
        loadReports();
    }, [loadReports]);

    // ── Computed Stats ──
    const movementStats = {
        total: movements.length,
        inbound: movements.filter(m => m.quantity > 0).length,
        outbound: movements.filter(m => m.quantity < 0).length,
        netCost: movements.reduce((s, m) => s + m.cost_impact, 0),
    };

    const varianceStats = {
        totalItems: variances.length,
        overStock: variances.filter(v => v.variance > 0).length,
        underStock: variances.filter(v => v.variance < 0).length,
        totalImpact: variances.reduce((s, v) => s + Math.abs(v.cost_impact), 0),
    };

    const wasteStats = {
        totalEntries: waste.length,
        totalCost: waste.reduce((s, w) => s + w.cost, 0),
        topReason: waste.length > 0
            ? Object.entries(waste.reduce((acc: Record<string, number>, w) => ({ ...acc, [w.reason]: (acc[w.reason] || 0) + 1 }), {}))
                .sort(([, a], [, b]) => b - a)[0]?.[0] || 'N/A'
            : 'N/A',
        avgPerDay: waste.length > 0 ? waste.reduce((s, w) => s + w.cost, 0) / 7 : 0,
    };

    const handleExportCsv = () => {
        const dataMap: Record<string, unknown[]> = { movements, variance: variances, waste };
        const nameMap: Record<string, string> = { movements: 'stock_movements', variance: 'variance_analysis', waste: 'waste_analysis' };
        const data = dataMap[activeTab] || [];
        if (data.length > 0) {
            exportToCsv(data as Record<string, unknown>[], `${nameMap[activeTab] || 'report'}_${new Date().toISOString().split('T')[0]}.csv`);
        }
    };

    return (
        <PageContainer
            className=""
            title="Inventory Reports"
            description="Stock movement, variance analysis, and waste tracking reports"
            actions={
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleExportCsv}>
                        <Download className="h-4 w-4 mr-2" />
                        Export CSV
                    </Button>
                    <Button variant="outline" size="sm" onClick={loadReports}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh
                    </Button>
                </div>
            }
        >
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList className="grid w-full grid-cols-3 max-w-lg">
                    <TabsTrigger value="movements" className="flex items-center gap-2">
                        <ArrowUpDown className="h-4 w-4" />
                        Stock Movement
                    </TabsTrigger>
                    <TabsTrigger value="variance" className="flex items-center gap-2">
                        <BarChart3 className="h-4 w-4" />
                        Variance
                    </TabsTrigger>
                    <TabsTrigger value="waste" className="flex items-center gap-2">
                        <Trash2 className="h-4 w-4" />
                        Waste Analysis
                    </TabsTrigger>
                </TabsList>

                {/* ── Stock Movement Tab ── */}
                <TabsContent value="movements" className="space-y-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <KPICard icon={Activity} label="Total Movements" value={movementStats.total} color="text-blue-600 dark:text-blue-400" />
                        <KPICard icon={TrendingUp} label="Inbound" value={movementStats.inbound} color="text-green-600 dark:text-green-400" />
                        <KPICard icon={TrendingDown} label="Outbound" value={movementStats.outbound} color="text-red-600 dark:text-red-400" />
                        <KPICard
                            icon={DollarSign}
                            label="Net Cost Impact"
                            value={`€${Math.abs(movementStats.netCost).toFixed(2)}`}
                            color={movementStats.netCost >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}
                        />
                    </div>
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base font-semibold">Stock Movement History</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <DataTable
                                columns={MOVEMENT_COLUMNS}
                                data={movements}
                                loading={loading}
                                totalCount={movements.length}
                                enableGlobalSearch={true}
                                enableFilters={true}
                                enablePagination={true}
                                emptyMessage="No stock movements recorded."
                                tableId="stock-movements"
                                venueId={activeVenue?.id}
                            />
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ── Variance Tab ── */}
                <TabsContent value="variance" className="space-y-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <KPICard icon={Package} label="Items Counted" value={varianceStats.totalItems} color="text-blue-600 dark:text-blue-400" />
                        <KPICard icon={TrendingUp} label="Over Stock" value={varianceStats.overStock} color="text-green-600 dark:text-green-400" />
                        <KPICard icon={AlertTriangle} label="Under Stock" value={varianceStats.underStock} color="text-amber-600 dark:text-amber-400" />
                        <KPICard icon={DollarSign} label="Total Variance Cost" value={`€${varianceStats.totalImpact.toFixed(2)}`} color="text-red-600 dark:text-red-400" />
                    </div>
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base font-semibold">Variance Analysis</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <DataTable
                                columns={VARIANCE_COLUMNS}
                                data={variances}
                                loading={loading}
                                totalCount={variances.length}
                                enableGlobalSearch={true}
                                enableFilters={true}
                                enablePagination={true}
                                emptyMessage="No variance data available. Run a stock count first."
                                tableId="variance-analysis"
                                venueId={activeVenue?.id}
                            />
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ── Waste Analysis Tab ── */}
                <TabsContent value="waste" className="space-y-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <KPICard icon={Trash2} label="Total Entries" value={wasteStats.totalEntries} color="text-red-600 dark:text-red-400" />
                        <KPICard icon={DollarSign} label="Total Waste Cost" value={`€${wasteStats.totalCost.toFixed(2)}`} color="text-red-600 dark:text-red-400" />
                        <KPICard icon={AlertTriangle} label="Top Reason" value={wasteStats.topReason} color="text-amber-600 dark:text-amber-400" />
                        <KPICard icon={Calendar} label="Avg/Day (7d)" value={`€${wasteStats.avgPerDay.toFixed(2)}`} color="text-orange-600 dark:text-orange-400" />
                    </div>
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base font-semibold">Waste Log Analysis</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <DataTable
                                columns={WASTE_COLUMNS}
                                data={waste}
                                loading={loading}
                                totalCount={waste.length}
                                enableGlobalSearch={true}
                                enableFilters={true}
                                enablePagination={true}
                                emptyMessage="No waste entries recorded."
                                tableId="waste-analysis"
                                venueId={activeVenue?.id}
                            />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </PageContainer>
    );
}
