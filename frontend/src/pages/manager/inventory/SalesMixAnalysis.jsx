import React, { useState, useMemo } from 'react';
import { useVenue } from '@/context/VenueContext';
import PageContainer from '@/layouts/PageContainer';
import DataTable from '@/components/shared/DataTable';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    BarChart3, TrendingUp, TrendingDown, DollarSign, ShoppingBag,
    AlertTriangle, Target, Download, RefreshCw, Filter,
    Percent, Star, Minus, ArrowUpDown,
} from 'lucide-react';
import { toast } from 'sonner';

// ── Demo Sales Data ──────────────────────────────────────────
const generateSalesData = () => {
    const items = [
        { name: 'Margherita Pizza', category: 'Pizza', sold: 482, revenue: 5784, food_cost: 1620, theo_cost: 1540 },
        { name: 'Carbonara Pasta', category: 'Pasta', sold: 318, revenue: 4452, food_cost: 1338, theo_cost: 1272 },
        { name: 'Caesar Salad', category: 'Salad', sold: 247, revenue: 2470, food_cost: 618, theo_cost: 580 },
        { name: 'Grilled Salmon', category: 'Mains', sold: 176, revenue: 4400, food_cost: 1936, theo_cost: 1848 },
        { name: 'Tiramisu', category: 'Dessert', sold: 203, revenue: 1827, food_cost: 365, theo_cost: 340 },
        { name: 'Bruschetta', category: 'Starter', sold: 312, revenue: 2496, food_cost: 499, theo_cost: 468 },
        { name: 'Risotto Mushroom', category: 'Mains', sold: 156, revenue: 2808, food_cost: 936, theo_cost: 890 },
        { name: 'Pepperoni Pizza', category: 'Pizza', sold: 389, revenue: 5057, food_cost: 1820, theo_cost: 1700 },
        { name: 'Panna Cotta', category: 'Dessert', sold: 134, revenue: 1072, food_cost: 214, theo_cost: 201 },
        { name: 'Minestrone Soup', category: 'Starter', sold: 98, revenue: 784, food_cost: 196, theo_cost: 186 },
        { name: 'Lobster Linguine', category: 'Pasta', sold: 87, revenue: 2610, food_cost: 1305, theo_cost: 1218 },
        { name: 'Chicken Milanese', category: 'Mains', sold: 201, revenue: 3015, food_cost: 804, theo_cost: 760 },
        { name: 'Gelato (3 Scoops)', category: 'Dessert', sold: 267, revenue: 1602, food_cost: 320, theo_cost: 308 },
        { name: 'Caprese Salad', category: 'Salad', sold: 145, revenue: 1305, food_cost: 348, theo_cost: 320 },
        { name: 'Osso Buco', category: 'Mains', sold: 62, revenue: 1860, food_cost: 868, theo_cost: 810 },
    ].map((item, i) => ({
        ...item,
        id: `sm-${i}`,
        margin: item.revenue - item.food_cost,
        margin_pct: ((item.revenue - item.food_cost) / item.revenue * 100),
        food_cost_pct: (item.food_cost / item.revenue * 100),
        theo_cost_pct: (item.theo_cost / item.revenue * 100),
        variance: item.food_cost - item.theo_cost,
        variance_pct: ((item.food_cost - item.theo_cost) / item.theo_cost * 100),
        avg_price: (item.revenue / item.sold),
    }));
    return items;
};

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

// ── Main Page ────────────────────────────────────────────────
export default function SalesMixAnalysis() {
    const { activeVenue } = useVenue();
    const [dateRange, setDateRange] = useState('this_month');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [sortBy, setSortBy] = useState('revenue');

    const salesData = useMemo(() => generateSalesData(), []);

    const filtered = useMemo(() => {
        let data = salesData;
        if (categoryFilter !== 'all') {
            data = data.filter(d => d.category === categoryFilter);
        }
        data.sort((a, b) => b[sortBy] - a[sortBy]);
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
                        <TrendingUp className="h-3 w-3" />+€{v} ({row.variance_pct.toFixed(1)}%)
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

    return (
        <PageContainer
            title="Sales Mix Analysis"
            subtitle="Revenue, costs, and margins by item — Actual vs Theoretical"
            icon={<BarChart3 className="h-6 w-6 text-blue-500" />}
        >
            {/* KPI Strip */}
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
                    <Button variant="outline" size="sm" onClick={() => toast.success('Refreshed')}>
                        <RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => toast.success('Export started')}>
                        <Download className="h-3.5 w-3.5 mr-1" /> Export CSV
                    </Button>
                </div>
            </div>

            {/* Category Summary Bar */}
            <div className="flex gap-2 mb-4 flex-wrap">
                {categories.map(cat => {
                    const catItems = salesData.filter(d => d.category === cat);
                    const catRevenue = catItems.reduce((s, d) => s + d.revenue, 0);
                    const catCostPct = catItems.reduce((s, d) => s + d.food_cost, 0) / catRevenue * 100;
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
                emptyMessage="No sales data available"
            />
        </PageContainer>
    );
}
