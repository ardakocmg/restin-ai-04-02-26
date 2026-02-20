import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { logger } from '@/lib/logger';
import { useVenue } from '@/context/VenueContext';
import api from '@/lib/api';
import PageContainer from '@/layouts/PageContainer';
import DataTable from '@/components/shared/DataTable';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    BarChart3, TrendingUp, DollarSign, ShoppingBag,
    AlertTriangle, Target, Download, RefreshCw, Filter,
    Percent, Star, ArrowUpDown, Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

// ── KPI Card ─────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, subtext, color = 'text-foreground' }) {
    return (
        <Card className="bg-card/50 border-border/50 hover:border-primary/20 transition-all">
            <CardContent className="p-4">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg bg-background/80 ${color}`}>
                        <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground truncate">{label}</p>
                        <p className="text-lg font-bold tabular-nums">{value}</p>
                        {subtext && <p className="text-[10px] text-muted-foreground">{subtext}</p>}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

// ── Date range to days mapping ───────────────────────────────
const PERIOD_DAYS = {
    today: 1,
    this_week: 7,
    this_month: 30,
    last_month: 60,
    this_quarter: 90,
};

// ── Main Page ────────────────────────────────────────────────
export default function SalesMixAnalysis() {
    const { activeVenue } = useVenue();
    const venueId = activeVenue?.id;
    const [dateRange, setDateRange] = useState('this_month');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [sortBy, setSortBy] = useState('revenue');
    const [salesData, setSalesData] = useState([]);
    const [loading, setLoading] = useState(true);

    // ── Fetch real data from profitability endpoint ──────────
    const loadData = useCallback(async () => {
        if (!venueId) {
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const days = PERIOD_DAYS[dateRange] || 30;
            const res = await api.get(
                `/venues/${venueId}/recipes/engineered/analytics/profitability?days=${days}`
            );
            const recipes = res.data?.recipes || [];

            // Enrich with derived fields needed by the Sales Mix UI
            const enriched = recipes.map((item, i) => {
                const revenue = item.revenue || 0;
                const foodCost = item.food_cost || 0;
                const cost = item.cost || 0;
                const sellPrice = item.sell_price || 0;
                const timesSold = item.times_sold || 0;

                // Theoretical cost = cost_per_serving × quantity sold
                const theoCost = Math.round(cost * timesSold * 100) / 100;
                const margin = revenue - foodCost;
                const marginPct = revenue > 0 ? ((revenue - foodCost) / revenue) * 100 : 0;
                const foodCostPct = revenue > 0 ? (foodCost / revenue) * 100 : 0;
                const theoCostPct = revenue > 0 ? (theoCost / revenue) * 100 : 0;
                const variance = Math.round((foodCost - theoCost) * 100) / 100;
                const variancePct = theoCost > 0 ? ((foodCost - theoCost) / theoCost) * 100 : 0;
                const avgPrice = timesSold > 0 ? revenue / timesSold : sellPrice;

                return {
                    id: item.id || `sm-${i}`,
                    name: item.name || 'Unknown',
                    category: item.category || 'Uncategorized',
                    sold: timesSold,
                    revenue,
                    food_cost: foodCost,
                    theo_cost: theoCost,
                    margin,
                    margin_pct: marginPct,
                    food_cost_pct: foodCostPct,
                    theo_cost_pct: theoCostPct,
                    variance,
                    variance_pct: variancePct,
                    avg_price: avgPrice,
                };
            });

            setSalesData(enriched);
        } catch (error: any) {
            logger.error('Failed to load sales mix data', { error });
            setSalesData([]);
        } finally {
            setLoading(false);
        }
    }, [venueId, dateRange]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // ── Filtering & Sorting ─────────────────────────────────
    const filtered = useMemo(() => {
        let data = salesData;
        if (categoryFilter !== 'all') {
            data = data.filter(d => d.category === categoryFilter);
        }
        data = [...data].sort((a, b) => (b[sortBy] || 0) - (a[sortBy] || 0));
        return data;
    }, [salesData, categoryFilter, sortBy]);

    const categories = useMemo(() => [...new Set(salesData.map(d => d.category))], [salesData]);

    const totals = useMemo(() => {
        const t = filtered.reduce((acc, d) => ({
            revenue: acc.revenue + d.revenue,
            food_cost: acc.food_cost + d.food_cost,
            theo_cost: acc.theo_cost + d.theo_cost,
            sold: acc.sold + d.sold,
            margin: acc.margin + d.margin,
            variance: acc.variance + d.variance,
        }), { revenue: 0, food_cost: 0, theo_cost: 0, sold: 0, margin: 0, variance: 0 });
        return {
            ...t,
            food_cost_pct: (t.food_cost / t.revenue * 100) || 0,
            theo_cost_pct: (t.theo_cost / t.revenue * 100) || 0,
            margin_pct: (t.margin / t.revenue * 100) || 0,
        };
    }, [filtered]);

    // ── Table Columns ───────────────────────────────────────
    const COLUMNS = useMemo(() => [
        {
            key: 'name', label: 'Item', enableSorting: true, size: 180,
            render: (row) => <span className="font-medium">{row.name}</span>,
        },
        {
            key: 'category', label: 'Category', size: 90,
            render: (row) => <Badge variant="outline" className="text-xs">{row.category}</Badge>,
        },
        {
            key: 'sold', label: 'Qty Sold', enableSorting: true, size: 80,
            render: (row) => <span className="font-bold tabular-nums">{row.sold.toLocaleString()}</span>,
        },
        {
            key: 'revenue', label: 'Revenue', enableSorting: true, size: 90,
            render: (row) => <span className="font-bold tabular-nums text-green-500">€{row.revenue.toLocaleString()}</span>,
        },
        {
            key: 'food_cost', label: 'Actual Cost', enableSorting: true, size: 90,
            render: (row) => <span className="tabular-nums">€{row.food_cost.toLocaleString()}</span>,
        },
        {
            key: 'food_cost_pct', label: 'Cost %', enableSorting: true, size: 70,
            render: (row) => {
                const pct = row.food_cost_pct;
                const color = pct > 35 ? 'text-red-500' : pct > 28 ? 'text-amber-500' : 'text-green-500';
                return <span className={`font-bold tabular-nums ${color}`}>{pct.toFixed(1)}%</span>;
            },
        },
        {
            key: 'theo_cost', label: 'Theo Cost', size: 85,
            render: (row) => <span className="tabular-nums text-muted-foreground">€{row.theo_cost.toLocaleString()}</span>,
        },
        {
            key: 'variance', label: 'Δ Variance', enableSorting: true, size: 90,
            render: (row) => {
                const v = row.variance;
                if (v > 0) return (
                    <span className="text-red-500 font-bold tabular-nums flex items-center gap-0.5 text-xs">
                        <TrendingUp className="h-3 w-3" />+€{v.toFixed(2)} ({row.variance_pct.toFixed(1)}%)
                    </span>
                );
                return <span className="text-green-500 tabular-nums text-xs">€0 OK</span>;
            },
        },
        {
            key: 'margin', label: 'Margin', enableSorting: true, size: 80,
            render: (row) => <span className="font-bold tabular-nums text-emerald-500">€{row.margin.toLocaleString()}</span>,
        },
        {
            key: 'margin_pct', label: 'Margin %', enableSorting: true, size: 75,
            render: (row) => {
                const mp = row.margin_pct;
                const color = mp >= 70 ? 'text-emerald-500' : mp >= 60 ? 'text-green-500' : mp >= 50 ? 'text-amber-500' : 'text-red-500';
                return (
                    <div className="flex items-center gap-1">
                        {mp >= 70 && <Star className="h-3 w-3 text-yellow-500" />}
                        <span className={`font-bold tabular-nums ${color}`}>{mp.toFixed(1)}%</span>
                    </div>
                );
            },
        },
        {
            key: 'avg_price', label: 'Avg Price', size: 80,
            render: (row) => <span className="tabular-nums text-muted-foreground">€{row.avg_price.toFixed(2)}</span>,
        },
    ], []);

    // ── Export CSV ───────────────────────────────────────────
    const handleExport = useCallback(() => {
        if (filtered.length === 0) {
            toast.error('No data to export');
            return;
        }
        const headers = ['Item', 'Category', 'Qty Sold', 'Revenue', 'Actual Cost', 'Cost %', 'Theo Cost', 'Variance', 'Margin', 'Margin %', 'Avg Price'];
        const rows = filtered.map(r => [
            r.name, r.category, r.sold, r.revenue.toFixed(2), r.food_cost.toFixed(2),
            r.food_cost_pct.toFixed(1), r.theo_cost.toFixed(2), r.variance.toFixed(2),
            r.margin.toFixed(2), r.margin_pct.toFixed(1), r.avg_price.toFixed(2),
        ]);
        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sales-mix-${dateRange}-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('CSV exported');
    }, [filtered, dateRange]);

    return (
        <PageContainer
            title="Sales Mix Analysis"
            subtitle="Revenue, costs, and margins by item — Actual vs Theoretical"
            icon={<BarChart3 className="h-6 w-6 text-blue-500" />}
        >
            {/* KPI Strip */}
            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
                        <StatCard icon={ShoppingBag} label="Items Sold" value={totals.sold.toLocaleString()} color="text-blue-500" />
                        <StatCard icon={DollarSign} label="Total Revenue" value={`€${totals.revenue.toLocaleString()}`} color="text-green-500" />
                        <StatCard icon={Percent} label="Actual Food Cost %" value={`${totals.food_cost_pct.toFixed(1)}%`}
                            subtext={`€${totals.food_cost.toLocaleString()}`} color={totals.food_cost_pct > 30 ? 'text-red-500' : 'text-green-500'} />
                        <StatCard icon={Target} label="Theo Food Cost %" value={`${totals.theo_cost_pct.toFixed(1)}%`}
                            subtext={`€${totals.theo_cost.toLocaleString()}`} color="text-blue-500" />
                        <StatCard icon={AlertTriangle} label="Total Variance" value={`€${totals.variance.toLocaleString()}`}
                            subtext="Actual - Theoretical" color={totals.variance > 0 ? 'text-red-500' : 'text-green-500'} />
                        <StatCard icon={TrendingUp} label="Gross Margin" value={`${totals.margin_pct.toFixed(1)}%`}
                            subtext={`€${totals.margin.toLocaleString()}`} color="text-emerald-500" />
                    </div>

                    {/* Filters */}
                    <div className="flex items-center gap-3 mb-4 flex-wrap">
                        <Select value={dateRange} onValueChange={setDateRange}>
                            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="today">Today</SelectItem>
                                <SelectItem value="this_week">This Week</SelectItem>
                                <SelectItem value="this_month">This Month</SelectItem>
                                <SelectItem value="last_month">Last Month</SelectItem>
                                <SelectItem value="this_quarter">This Quarter</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Categories</SelectItem>
                                {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                            </SelectContent>
                        </Select>

                        <Select value={sortBy} onValueChange={setSortBy}>
                            <SelectTrigger className="w-36">
                                <ArrowUpDown className="h-3 w-3 mr-1" /><SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="revenue">Revenue</SelectItem>
                                <SelectItem value="sold">Qty Sold</SelectItem>
                                <SelectItem value="food_cost_pct">Cost %</SelectItem>
                                <SelectItem value="margin_pct">Margin %</SelectItem>
                                <SelectItem value="variance">Variance</SelectItem>
                            </SelectContent>
                        </Select>

                        <div className="ml-auto flex gap-2">
                            <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
                                <RefreshCw className={`h-3.5 w-3.5 mr-1 ${loading ? 'animate-spin' : ''}`} /> Refresh
                            </Button>
                            <Button variant="outline" size="sm" onClick={handleExport}>
                                <Download className="h-3.5 w-3.5 mr-1" /> Export CSV
                            </Button>
                        </div>
                    </div>

                    {/* Category Summary Bar */}
                    <div className="flex gap-2 mb-4 flex-wrap">
                        {categories.map(cat => {
                            const catItems = salesData.filter(d => d.category === cat);
                            const catRevenue = catItems.reduce((s, d) => s + d.revenue, 0);
                            const catCostPct = catRevenue > 0 ? catItems.reduce((s, d) => s + d.food_cost, 0) / catRevenue * 100 : 0;
                            return (
                                <button key={cat}
                                    onClick={() => setCategoryFilter(cat === categoryFilter ? 'all' : cat)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all
                    ${cat === categoryFilter ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border hover:border-primary/30'}`}>
                                    {cat} <span className="text-[10px] opacity-70 ml-1">€{catRevenue.toLocaleString()} · {catCostPct.toFixed(0)}%</span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Main Table */}
                    <DataTable
                        data={filtered}
                        columns={COLUMNS}
                        pageSize={20}
                        searchable
                        searchPlaceholder="Search items..."
                        emptyMessage="0 items"
                    />
                </>
            )}
        </PageContainer>
    );
}
