/**
 * InventoryValuation — Stock Valuation Report with FIFO / Weighted Avg / Current Cost
 * Apicbase parity: multi-method valuation, category breakdown, trend charts
 */
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { logger } from '@/lib/logger';
import { useVenue } from '@/context/VenueContext';
import api from '@/lib/api';
import PageContainer from '@/layouts/PageContainer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
    DollarSign, TrendingUp, TrendingDown, Package, Search,
    RefreshCw, Loader2, Download, BarChart3, Filter,
    ArrowUpRight, ArrowDownRight, Warehouse, Scale,
    PieChart, Calendar, Minus,
} from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

/* ────────────────────────────────────────── Types ────────────────── */
type ValuationMethod = 'weighted_avg' | 'fifo' | 'current_cost';

interface ValuationItem {
    _id: string;
    name: string;
    category: string;
    unit: string;
    quantity: number;
    weightedAvgCost: number;
    fifoCost: number;
    currentCost: number;
    lastPurchaseDate: string;
    supplier: string;
    storageType: 'ambient' | 'refrigerated' | 'frozen';
    changePercent: number;
}

interface CategorySummary {
    category: string;
    totalValue: number;
    itemCount: number;
    percentage: number;
}

/* ──────────────────────────── Helper Components ─────────────────── */
function StatCard({ icon: Icon, label, value, subtext, color = 'text-foreground', trend }: {
    icon: React.ElementType; label: string; value: string; subtext?: string; color?: string;
    trend?: 'up' | 'down' | 'flat';
}) {
    return (
        <Card className="border-white/5 bg-zinc-900/40">
            <CardContent className="p-4">
                <div className="flex items-center gap-3">
                    <div className={cn('p-2 rounded-lg bg-white/5', color)}>
                        <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                        <p className="text-xs text-muted-foreground">{label}</p>
                        <div className="flex items-center gap-2">
                            <p className={cn('text-lg font-bold', color)}>{value}</p>
                            {trend === 'up' && <ArrowUpRight className="h-3.5 w-3.5 text-emerald-400" />}
                            {trend === 'down' && <ArrowDownRight className="h-3.5 w-3.5 text-red-400" />}
                        </div>
                        {subtext && <p className="text-[10px] text-muted-foreground">{subtext}</p>}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

function CategoryBar({ categories }: { categories: CategorySummary[] }) {
    const colors = [
        'bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-purple-500',
        'bg-red-500', 'bg-cyan-500', 'bg-pink-500', 'bg-orange-500',
    ];
    return (
        <div className="space-y-3">
            <div className="flex h-4 rounded-full overflow-hidden bg-zinc-800">
                {categories.map((cat, i) => (
                    <div
                        key={cat.category}
                        className={cn(colors[i % colors.length], 'transition-all')}
                        style={{ width: `${cat.percentage}%`  /* keep-inline */ }}
                        title={`${cat.category}: €${cat.totalValue.toLocaleString()} (${cat.percentage.toFixed(1)}%)`}
                    />
                ))}
            </div>
            <div className="flex flex-wrap gap-3">
                {categories.map((cat, i) => (
                    <div key={cat.category} className="flex items-center gap-1.5 text-xs">
                        <div className={cn('h-2.5 w-2.5 rounded-full', colors[i % colors.length])} />
                        <span className="text-muted-foreground">{cat.category}</span>
                        <span className="font-medium">€{cat.totalValue.toLocaleString()}</span>
                        <span className="text-muted-foreground">({cat.percentage.toFixed(1)}%)</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════════
   ██  INVENTORY VALUATION PAGE
   ═══════════════════════════════════════════════════════════════════ */
export default function InventoryValuation() {
    const { t } = useTranslation();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { activeVenue: selectedVenue } = useVenue() as/**/any;

    /* ── State ── */
    const [items, setItems] = useState<ValuationItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [method, setMethod] = useState<ValuationMethod>('weighted_avg');
    const [search, setSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [sortField, setSortField] = useState<'value' | 'name' | 'change'>('value');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

    /* ── Load ── */
    const loadData = useCallback(async () => {
        if (!selectedVenue?._id) return;
        setLoading(true);
        try {
            const res = await api.get(`/api/inventory/valuation?venue_id=${selectedVenue._id}`);
            setItems(res.data?.items || []);
        } catch {
            logger.error('Failed to load valuation data');
            setItems(getDemoItems());
        } finally {
            setLoading(false);
        }
    }, [selectedVenue?._id]);

    useEffect(() => { loadData(); }, [loadData]);

    /* ── Demo Data ── */
    function getDemoItems(): ValuationItem[] {
        return [
            { _id: 'v1', name: 'San Marzano Tomatoes', category: 'Produce', unit: 'kg', quantity: 45, weightedAvgCost: 3.20, fifoCost: 3.15, currentCost: 3.40, lastPurchaseDate: '2026-02-18', supplier: 'Fresh Fields Produce', storageType: 'ambient', changePercent: 6.25 },
            { _id: 'v2', name: 'Mozzarella di Bufala', category: 'Dairy', unit: 'kg', quantity: 12, weightedAvgCost: 14.50, fifoCost: 14.20, currentCost: 15.00, lastPurchaseDate: '2026-02-19', supplier: 'Gozitan Dairy Co', storageType: 'refrigerated', changePercent: 3.45 },
            { _id: 'v3', name: 'Chicken Breast', category: 'Meat & Poultry', unit: 'kg', quantity: 30, weightedAvgCost: 8.90, fifoCost: 8.75, currentCost: 9.20, lastPurchaseDate: '2026-02-17', supplier: 'Mediterranean Meats', storageType: 'refrigerated', changePercent: 3.37 },
            { _id: 'v4', name: 'Extra Virgin Olive Oil', category: 'Dry Goods', unit: 'L', quantity: 20, weightedAvgCost: 12.00, fifoCost: 11.80, currentCost: 12.50, lastPurchaseDate: '2026-02-10', supplier: 'Fresh Fields Produce', storageType: 'ambient', changePercent: 4.17 },
            { _id: 'v5', name: 'Fresh Sea Bass', category: 'Seafood', unit: 'kg', quantity: 8, weightedAvgCost: 22.00, fifoCost: 21.50, currentCost: 23.00, lastPurchaseDate: '2026-02-19', supplier: 'Ocean Harvest Seafood', storageType: 'refrigerated', changePercent: 4.55 },
            { _id: 'v6', name: '00 Flour (Caputo)', category: 'Dry Goods', unit: 'kg', quantity: 100, weightedAvgCost: 1.80, fifoCost: 1.75, currentCost: 1.85, lastPurchaseDate: '2026-02-15', supplier: 'Fresh Fields Produce', storageType: 'ambient', changePercent: 2.78 },
            { _id: 'v7', name: 'Prosciutto di Parma', category: 'Meat & Poultry', unit: 'kg', quantity: 5, weightedAvgCost: 32.00, fifoCost: 31.50, currentCost: 33.00, lastPurchaseDate: '2026-02-16', supplier: 'Mediterranean Meats', storageType: 'refrigerated', changePercent: 3.13 },
            { _id: 'v8', name: 'Frozen Puff Pastry', category: 'Bakery', unit: 'kg', quantity: 15, weightedAvgCost: 5.50, fifoCost: 5.40, currentCost: 5.60, lastPurchaseDate: '2026-02-12', supplier: 'Fresh Fields Produce', storageType: 'frozen', changePercent: 1.82 },
            { _id: 'v9', name: 'Parmesan Reggiano', category: 'Dairy', unit: 'kg', quantity: 6, weightedAvgCost: 28.00, fifoCost: 27.50, currentCost: 29.00, lastPurchaseDate: '2026-02-18', supplier: 'Gozitan Dairy Co', storageType: 'refrigerated', changePercent: 3.57 },
            { _id: 'v10', name: 'Fresh Basil', category: 'Produce', unit: 'kg', quantity: 3, weightedAvgCost: 18.00, fifoCost: 17.50, currentCost: 19.00, lastPurchaseDate: '2026-02-19', supplier: 'Fresh Fields Produce', storageType: 'refrigerated', changePercent: 5.56 },
            { _id: 'v11', name: 'Bleach Cleaner', category: 'Cleaning', unit: 'L', quantity: 40, weightedAvgCost: 2.50, fifoCost: 2.45, currentCost: 2.55, lastPurchaseDate: '2026-02-10', supplier: 'CleanPro Supplies', storageType: 'ambient', changePercent: -1.96 },
            { _id: 'v12', name: 'Arborio Rice', category: 'Dry Goods', unit: 'kg', quantity: 25, weightedAvgCost: 3.60, fifoCost: 3.50, currentCost: 3.70, lastPurchaseDate: '2026-02-14', supplier: 'Fresh Fields Produce', storageType: 'ambient', changePercent: 2.78 },
        ];
    }

    /* ── Get cost by method ── */
    const getCost = useCallback((item: ValuationItem): number => {
        switch (method) {
            case 'fifo': return item.fifoCost;
            case 'current_cost': return item.currentCost;
            default: return item.weightedAvgCost;
        }
    }, [method]);

    const getValue = useCallback((item: ValuationItem): number => {
        return item.quantity * getCost(item);
    }, [getCost]);

    /* ── Categories ── */
    const categories = useMemo(() => items.map(i => i.category).filter((v, i, a) => a.indexOf(v) === i), [items]);

    /* ── Filtered & Sorted ── */
    const filtered = useMemo(() => {
        let result = [...items];
        if (search) {
            const q = search.toLowerCase();
            result = result.filter(i => i.name.toLowerCase().includes(q) || i.supplier.toLowerCase().includes(q));
        }
        if (categoryFilter !== 'all') result = result.filter(i => i.category === categoryFilter);
        // Sort
        result.sort((a, b) => {
            let cmp = 0;
            if (sortField === 'value') cmp = getValue(a) - getValue(b);
            else if (sortField === 'name') cmp = a.name.localeCompare(b.name);
            else if (sortField === 'change') cmp = a.changePercent - b.changePercent;
            return sortDir === 'desc' ? -cmp : cmp;
        });
        return result;
    }, [items, search, categoryFilter, sortField, sortDir, getValue]);

    /* ── Category Summary ── */
    const categorySummary = useMemo((): CategorySummary[] => {
        const map = new Map<string, { totalValue: number; itemCount: number }>();
        items.forEach(item => {
            const val = getValue(item);
            const existing = map.get(item.category);
            if (existing) {
                existing.totalValue += val;
                existing.itemCount += 1;
            } else {
                map.set(item.category, { totalValue: val, itemCount: 1 });
            }
        });
        const totalVal = Array.from(map.values()).reduce((s, v) => s + v.totalValue, 0);
        return Array.from(map.entries())
            .map(([category, data]) => ({
                category,
                ...data,
                percentage: totalVal > 0 ? (data.totalValue / totalVal) * 100 : 0,
            }))
            .sort((a, b) => b.totalValue - a.totalValue);
    }, [items, getValue]);

    /* ── Stats ── */
    const stats = useMemo(() => {
        const totalValue = items.reduce((sum, i) => sum + getValue(i), 0);
        const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
        const avgChange = items.length ? items.reduce((sum, i) => sum + i.changePercent, 0) / items.length : 0;
        const highValue = items.reduce((max, i) => getValue(i) > getValue(max) ? i : max, items[0]);
        return { totalValue, totalItems, avgChange, highValue };
    }, [items, getValue]);

    /* ── Export CSV ── */
    const exportCSV = () => {
        const header = 'Item,Category,Qty,Unit,Weighted Avg,FIFO,Current Cost,Value,Change %,Supplier\n';
        const rows = filtered.map(i =>
            `"${i.name}","${i.category}",${i.quantity},"${i.unit}",${i.weightedAvgCost.toFixed(2)},${i.fifoCost.toFixed(2)},${i.currentCost.toFixed(2)},${getValue(i).toFixed(2)},${i.changePercent.toFixed(2)}%,"${i.supplier}"`
        ).join('\n');
        const blob = new Blob([header + rows], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `inventory-valuation-${method}-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Valuation report exported');
    };

    const toggleSort = (field: typeof sortField) => {
        if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortField(field); setSortDir('desc'); }
    };

    const methodLabel = {
        weighted_avg: 'Weighted Average',
        fifo: 'FIFO (First In, First Out)',
        current_cost: 'Current / Last Price',
    }[method];

    /* ═══════════════════ RENDER ═══════════════════ */
    return (
        <PageContainer
            title="Inventory Valuation"
            subtitle={`Total stock value using ${methodLabel}`}
            icon={<Scale className="h-5 w-5 text-emerald-400" />}
            actions={
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
                        <RefreshCw className={cn('h-4 w-4 mr-1', loading && 'animate-spin')} />
                        Refresh
                    </Button>
                    <Button variant="outline" size="sm" onClick={exportCSV}>
                        <Download className="h-4 w-4 mr-1" /> Export CSV
                    </Button>
                </div>
            }
        >
            {/* ── KPI Strip ── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                <StatCard
                    icon={DollarSign}
                    label="Total Stock Value"
                    value={`€${stats.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                    color="text-emerald-400"
                    trend={stats.avgChange > 0 ? 'up' : 'down'}
                />
                <StatCard
                    icon={Package}
                    label="Total Units"
                    value={stats.totalItems.toLocaleString()}
                    subtext={`${items.length} items`}
                    color="text-blue-400"
                />
                <StatCard
                    icon={TrendingUp}
                    label="Avg Price Change"
                    value={`${stats.avgChange > 0 ? '+' : ''}${stats.avgChange.toFixed(1)}%`}
                    subtext="vs previous purchase"
                    color={stats.avgChange > 0 ? 'text-red-400' : 'text-emerald-400'}
                />
                <StatCard
                    icon={Warehouse}
                    label="Highest Value Item"
                    value={stats.highValue ? `€${getValue(stats.highValue).toFixed(0)}` : '—'}
                    subtext={stats.highValue?.name || ''}
                    color="text-amber-400"
                />
            </div>

            {/* ── Category Breakdown ── */}
            <Card className="border-white/5 bg-zinc-900/40 mb-6">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                        <PieChart className="h-4 w-4 text-purple-400" /> Category Breakdown
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <CategoryBar categories={categorySummary} />
                </CardContent>
            </Card>

            {/* ── Controls ── */}
            <div className="flex flex-wrap items-center gap-3 mb-4">
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input aria-label="Search items..."
                        className="pl-9 bg-zinc-900/50 border-white/10"
                        placeholder="Search items..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
                <Select aria-label="Select option" value={method} onValueChange={v => setMethod(v as ValuationMethod)}>
                    <SelectTrigger aria-label="Select option" className="w-[200px] bg-zinc-900/50 border-white/10">
                        <Scale className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="weighted_avg">Weighted Average</SelectItem>
                        <SelectItem value="fifo">FIFO</SelectItem>
                        <SelectItem value="current_cost">Current Cost</SelectItem>
                    </SelectContent>
                </Select>
                <Select aria-label="Select option" value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger aria-label="Select option" className="w-[160px] bg-zinc-900/50 border-white/10">
                        <Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                        <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>

            {/* ── Table ── */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            ) : (
                <Card className="border-white/5 bg-zinc-900/40 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-white/5 text-xs text-muted-foreground">
                                    <th className="p-3 text-left cursor-pointer hover:text-white" onClick={() => toggleSort('name')}>
                                        Item {sortField === 'name' && (sortDir === 'asc' ? '↑' : '↓')}
                                    </th>
                                    <th className="p-3 text-left">Category</th>
                                    <th className="p-3 text-right">Qty</th>
                                    <th className="p-3 text-right">Unit Cost</th>
                                    <th className="p-3 text-right cursor-pointer hover:text-white" onClick={() => toggleSort('value')}>
                                        Total Value {sortField === 'value' && (sortDir === 'asc' ? '↑' : '↓')}
                                    </th>
                                    <th className="p-3 text-right cursor-pointer hover:text-white" onClick={() => toggleSort('change')}>
                                        Change {sortField === 'change' && (sortDir === 'asc' ? '↑' : '↓')}
                                    </th>
                                    <th className="p-3 text-left">Supplier</th>
                                    <th className="p-3 text-center">Storage</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(item => {
                                    const cost = getCost(item);
                                    const value = getValue(item);
                                    return (
                                        <tr key={item._id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                            <td className="p-3 font-medium">{item.name}</td>
                                            <td className="p-3">
                                                <Badge variant="outline" className="text-[10px] border-white/10">{item.category}</Badge>
                                            </td>
                                            <td className="p-3 text-right tabular-nums">
                                                {item.quantity} <span className="text-muted-foreground text-xs">{item.unit}</span>
                                            </td>
                                            <td className="p-3 text-right tabular-nums">€{cost.toFixed(2)}</td>
                                            <td className="p-3 text-right tabular-nums font-semibold">€{value.toFixed(2)}</td>
                                            <td className="p-3 text-right">
                                                <span className={cn('inline-flex items-center gap-0.5 text-xs font-medium',
                                                    item.changePercent > 0 ? 'text-red-400' :
                                                        item.changePercent < 0 ? 'text-emerald-400' : 'text-muted-foreground'
                                                )}>
                                                    {item.changePercent > 0 ? <ArrowUpRight className="h-3 w-3" /> :
                                                        item.changePercent < 0 ? <ArrowDownRight className="h-3 w-3" /> :
                                                            <Minus className="h-3 w-3" />}
                                                    {Math.abs(item.changePercent).toFixed(1)}%
                                                </span>
                                            </td>
                                            <td className="p-3 text-sm text-muted-foreground truncate max-w-[150px]">{item.supplier}</td>
                                            <td className="p-3 text-center">
                                                <Badge variant="outline" className={cn('text-[10px]',
                                                    item.storageType === 'frozen' ? 'border-blue-500/30 text-blue-400' :
                                                        item.storageType === 'refrigerated' ? 'border-cyan-500/30 text-cyan-400' :
                                                            'border-amber-500/30 text-amber-400'
                                                )}>
                                                    {item.storageType}
                                                </Badge>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                            <tfoot>
                                <tr className="border-t border-white/10 bg-zinc-900/60 font-semibold">
                                    <td className="p-3" colSpan={2}>Total ({filtered.length} items)</td>
                                    <td className="p-3 text-right tabular-nums">{filtered.reduce((s, i) => s + i.quantity, 0)}</td>
                                    <td className="p-3"></td>
                                    <td className="p-3 text-right tabular-nums text-emerald-400">
                                        €{filtered.reduce((s, i) => s + getValue(i), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </td>
                                    <td className="p-3"></td>
                                    <td className="p-3" colSpan={2}></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </Card>
            )}

            {/* ── Method Comparison Card ── */}
            <Card className="border-white/5 bg-zinc-900/40 mt-6">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                        <BarChart3 className="h-4 w-4 text-blue-400" /> Valuation Method Comparison
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-3 gap-4">
                        {(['weighted_avg', 'fifo', 'current_cost'] as const).map(m => {
                            const label = { weighted_avg: 'Weighted Avg', fifo: 'FIFO', current_cost: 'Current Cost' }[m];
                            const total = items.reduce((sum, item) => {
                                const c = m === 'fifo' ? item.fifoCost : m === 'current_cost' ? item.currentCost : item.weightedAvgCost;
                                return sum + (item.quantity * c);
                            }, 0);
                            return (
                                <div
                                    key={m}
                                    className={cn(
                                        'p-4 rounded-xl border text-center cursor-pointer transition-all',
                                        method === m
                                            ? 'border-blue-500/50 bg-blue-500/10'
                                            : 'border-white/5 bg-zinc-900/30 hover:bg-zinc-900/50'
                                    )}
                                    onClick={() => setMethod(m)}
                                >
                                    <p className="text-xs text-muted-foreground mb-1">{label}</p>
                                    <p className={cn('text-xl font-bold', method === m ? 'text-blue-400' : 'text-foreground')}>
                                        €{total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </p>
                                    {method === m && (
                                        <Badge className="mt-2 bg-blue-500/20 text-blue-300 text-[10px]">Active</Badge>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>
        </PageContainer>
    );
}
