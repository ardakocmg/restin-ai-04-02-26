import React, { useState, useEffect, useCallback, useMemo } from 'react';
import PageContainer from '../../layouts/PageContainer';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';
import './PulseAnalytics.css';
import api from '@/lib/api';
import { useVenue } from '@/context/VenueContext';
import {
    AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
    TrendingUp, TrendingDown, DollarSign, ShoppingBag,
    Clock, Users, BarChart3, RefreshCw,
    Flame, Star, Building2, Zap, Activity, Percent,
    ChevronRight, Circle
} from 'lucide-react';

// ── Types ───────────────────────────────────────────────────────
interface OverviewData {
    total_orders: number;
    revenue_cents: number;
    tax_cents: number;
    tips_cents: number;
    avg_order_cents: number;
    online_orders: number;
    online_revenue_cents: number;
    refunds: number;
    refund_total_cents: number;
}

interface TopItem {
    name: string;
    quantity: number;
    revenue_cents: number;
}

interface HourlyData {
    hour: string;
    orders: number;
    revenue_cents: number;
}

interface LaborData {
    revenue_cents: number;
    clocked_hours: number;
    labor_cost_cents: number;
    labor_percent: number;
    staff_on_clock: number;
}

interface LocationData {
    venue_id: string;
    venue_name: string;
    orders_today: number;
    revenue_today_cents: number;
}

type Period = 'today' | 'yesterday' | 'week' | 'month';

// ── Custom Tooltip ──────────────────────────────────────────────
interface TooltipPayloadEntry {
    name?: string;
    value?: number;
    color?: string;
    payload?: Record<string, unknown>;
}

interface CustomTooltipProps {
    active?: boolean;
    payload?: TooltipPayloadEntry[];
    label?: string;
    formatter?: (val: number) => string;
}

function CustomTooltip({ active, payload, label, formatter }: CustomTooltipProps) {
    if (!active || !payload?.length) return null;
    const fmt = formatter || ((v: number) => `€${(v / 100).toFixed(2)}`);
    return (
        <div className="pulse-tooltip">
            <p className="pulse-tooltip-label">{label}</p>
            {payload.map((p, i) => (
                <div key={i} className="flex items-center gap-2 mt-1">
                    <Circle className="w-2 h-2 fill-current" style={{ color: p.color }} />
                    <span className="pulse-tooltip-value">{fmt(p.value || 0)}</span>
                    <span className="pulse-tooltip-sub">{p.name}</span>
                </div>
            ))}
        </div>
    );
}

// ── Component ───────────────────────────────────────────────────
export default function PulseAnalytics() {
    const { activeVenue } = useVenue();
    const [period, setPeriod] = useState<Period>('today');
    const [overview, setOverview] = useState<OverviewData | null>(null);
    const [topItems, setTopItems] = useState<TopItem[]>([]);
    const [hourly, setHourly] = useState<HourlyData[]>([]);
    const [labor, setLabor] = useState<LaborData | null>(null);
    const [locations, setLocations] = useState<LocationData[]>([]);
    const [loading, setLoading] = useState(true);
    const [chartView, setChartView] = useState<'revenue' | 'orders'>('revenue');

    const venueId = activeVenue?.id;

    const loadAll = useCallback(async () => {
        if (!venueId) return;
        setLoading(true);
        try {
            const [ovR, tiR, hrR, lbR, lcR] = await Promise.all([
                api.get(`/pulse/overview/${venueId}?period=${period}`),
                api.get(`/pulse/top-items/${venueId}?period=${period}`),
                api.get(`/pulse/hourly/${venueId}?period=${period}`),
                api.get(`/pulse/labor/${venueId}`),
                api.get(`/pulse/multi-location`),
            ]);
            setOverview(ovR.data?.data || null);
            setTopItems(tiR.data?.data || []);
            setHourly(hrR.data?.data || []);
            setLabor(lbR.data?.data || null);
            setLocations(lcR.data?.data || []);
        } catch {
            toast.error('Failed to load analytics');
        } finally {
            setLoading(false);
        }
    }, [venueId, period]);

    useEffect(() => { loadAll(); }, [loadAll]);

    const fmt = (cents: number) => `€${(cents / 100).toFixed(2)}`;
    const fmtK = (cents: number) => {
        const val = cents / 100;
        if (val >= 1000) return `€${(val / 1000).toFixed(1)}k`;
        return `€${val.toFixed(0)}`;
    };

    const periods: { id: Period; label: string }[] = [
        { id: 'today', label: 'Today' },
        { id: 'yesterday', label: 'Yesterday' },
        { id: 'week', label: '7 Days' },
        { id: 'month', label: '30 Days' },
    ];

    // ── Derived chart data ─────────────────────────────────────
    const hourlyChart = useMemo(() => {
        // Fill in all 24 hours for smooth chart
        const map = new Map(hourly.map(h => [h.hour, h]));
        return Array.from({ length: 24 }, (_, i) => {
            const hr = String(i).padStart(2, '0');
            const d = map.get(hr);
            return {
                hour: `${hr}:00`,
                revenue: d ? d.revenue_cents / 100 : 0,
                orders: d?.orders || 0,
            };
        });
    }, [hourly]);

    const topItemsChart = useMemo(() =>
        topItems.slice(0, 8).map(item => ({
            name: item.name.length > 14 ? item.name.substring(0, 14) + '…' : item.name,
            fullName: item.name,
            quantity: item.quantity,
            revenue: item.revenue_cents / 100,
        })),
        [topItems]
    );

    const revenueBreakdown = useMemo(() => {
        if (!overview) return [];
        const online = overview.online_revenue_cents || 0;
        const inStore = (overview.revenue_cents || 0) - online;
        const tips = overview.tips_cents || 0;
        return [
            { name: 'In-Store', value: Math.max(0, inStore / 100), color: '#10b981' },
            { name: 'Online', value: online / 100, color: '#3b82f6' },
            { name: 'Tips', value: tips / 100, color: '#f59e0b' },
        ].filter(d => d.value > 0);
    }, [overview]);

    // ── Layout ─────────────────────────────────────────────────
    return (
        <PageContainer
            title="Pulse Analytics"
            description="Real-time business intelligence dashboard"
            actions={
                <div className="flex items-center gap-2">
                    {period === 'today' && (
                        <span className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600/10 border border-emerald-500/20 rounded-lg text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 pulse-live-dot" />
                            Live
                        </span>
                    )}
                    <button
                        onClick={loadAll}
                        className="p-2 bg-zinc-800 border border-white/10 rounded-xl text-zinc-400 hover:text-white transition-colors"
                        title="Refresh data"
                    >
                        <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
                    </button>
                </div>
            }
        >
            {/* Period Selector */}
            <div className="flex items-center gap-1 mb-6 bg-zinc-900 p-1 rounded-xl border border-white/5 w-fit">
                {periods.map(p => (
                    <button
                        key={p.id}
                        onClick={() => setPeriod(p.id)}
                        className={cn(
                            "px-4 py-2 rounded-lg text-sm font-bold transition-all",
                            period === p.id ? "bg-emerald-600 text-white" : "text-zinc-500 hover:text-white"
                        )}
                    >
                        {p.label}
                    </button>
                ))}
            </div>

            {/* ── Primary KPI Cards ──────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {[
                    { label: 'Revenue', value: fmt(overview?.revenue_cents || 0), icon: DollarSign, color: 'text-emerald-400', bgColor: 'bg-emerald-600/10', trend: overview && overview.revenue_cents > 0 ? '+' : null },
                    { label: 'Orders', value: overview?.total_orders || 0, icon: ShoppingBag, color: 'text-blue-400', bgColor: 'bg-blue-600/10', trend: null },
                    { label: 'Avg Order', value: fmt(overview?.avg_order_cents || 0), icon: TrendingUp, color: 'text-purple-400', bgColor: 'bg-purple-600/10', trend: null },
                    { label: 'Tips', value: fmt(overview?.tips_cents || 0), icon: Star, color: 'text-amber-400', bgColor: 'bg-amber-600/10', trend: null },
                ].map((card, i) => (
                    <div key={i} className="p-5 bg-zinc-900/50 border border-white/5 rounded-2xl pulse-stat-card cursor-default">
                        <div className="flex items-center justify-between mb-3">
                            <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center", card.bgColor)}>
                                <card.icon className={cn("w-4.5 h-4.5", card.color)} />
                            </div>
                            {card.trend && (
                                <span className="flex items-center gap-0.5 text-[10px] font-bold text-emerald-400">
                                    <TrendingUp className="w-3 h-3" />
                                </span>
                            )}
                        </div>
                        <p className="text-2xl font-black text-white">{card.value}</p>
                        <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-500 mt-1">{card.label}</p>
                    </div>
                ))}
            </div>

            {/* ── Secondary Stats Row ───────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {[
                    { label: 'Online Orders', value: overview?.online_orders || 0, sub: fmt(overview?.online_revenue_cents || 0), icon: Zap, color: 'text-cyan-400' },
                    { label: 'Refunds', value: overview?.refunds || 0, sub: fmt(overview?.refund_total_cents || 0), icon: TrendingDown, color: 'text-red-400' },
                    { label: 'Tax Collected', value: fmt(overview?.tax_cents || 0), sub: `${overview?.total_orders || 0} transactions`, icon: Percent, color: 'text-orange-400' },
                    { label: 'Staff On Clock', value: labor?.staff_on_clock || 0, sub: `${labor?.clocked_hours || 0}h clocked`, icon: Users, color: 'text-zinc-400' },
                ].map((card, i) => (
                    <div key={i} className="p-4 bg-zinc-900/30 border border-white/5 rounded-xl pulse-stat-card cursor-default">
                        <div className="flex items-center gap-2 mb-2">
                            <card.icon className={cn("w-4 h-4", card.color)} />
                            <span className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-600">{card.label}</span>
                        </div>
                        <p className="text-xl font-bold text-white">{card.value}</p>
                        {card.sub && <p className="text-[10px] text-zinc-600 mt-0.5">{card.sub}</p>}
                    </div>
                ))}
            </div>

            {/* ── Charts Row ─────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">

                {/* Hourly Revenue / Orders Area Chart */}
                <div className="lg:col-span-2 p-5 bg-zinc-900/50 border border-white/5 rounded-2xl">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 flex items-center gap-1.5">
                            <Activity className="w-3 h-3" />
                            Hourly Performance
                        </h3>
                        <div className="flex items-center gap-1 bg-zinc-800 p-0.5 rounded-lg">
                            <button
                                onClick={() => setChartView('revenue')}
                                className={cn(
                                    "px-3 py-1 rounded-md text-[10px] font-bold transition-all",
                                    chartView === 'revenue' ? "bg-emerald-600 text-white" : "text-zinc-500 hover:text-white"
                                )}
                            >
                                Revenue
                            </button>
                            <button
                                onClick={() => setChartView('orders')}
                                className={cn(
                                    "px-3 py-1 rounded-md text-[10px] font-bold transition-all",
                                    chartView === 'orders' ? "bg-blue-600 text-white" : "text-zinc-500 hover:text-white"
                                )}
                            >
                                Orders
                            </button>
                        </div>
                    </div>

                    {hourlyChart.every(h => h.revenue === 0 && h.orders === 0) ? (
                        <div className="flex items-center justify-center py-16">
                            <div className="text-center">
                                <BarChart3 className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
                                <p className="text-xs text-zinc-600">No data for this period</p>
                            </div>
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height={220}>
                            <AreaChart data={hourlyChart} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                                <defs>
                                    <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                                        <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="gradOrders" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                                        <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                                <XAxis
                                    dataKey="hour"
                                    tickFormatter={(v: string) => v.replace(':00', 'h')}
                                    tick={{ fontSize: 9, fill: '#52525b' }}
                                    axisLine={false}
                                    tickLine={false}
                                    interval={2}
                                />
                                <YAxis
                                    tick={{ fontSize: 9, fill: '#52525b' }}
                                    axisLine={false}
                                    tickLine={false}
                                    tickFormatter={(v: number) => chartView === 'revenue' ? `€${v}` : String(v)}
                                />
                                <Tooltip
                                    content={
                                        <CustomTooltip
                                            formatter={chartView === 'revenue'
                                                ? (v: number) => `€${v.toFixed(2)}`
                                                : (v: number) => `${v} orders`
                                            }
                                        />
                                    }
                                />
                                {chartView === 'revenue' ? (
                                    <Area
                                        type="monotone"
                                        dataKey="revenue"
                                        stroke="#10b981"
                                        strokeWidth={2}
                                        fill="url(#gradRevenue)"
                                        name="Revenue"
                                    />
                                ) : (
                                    <Area
                                        type="monotone"
                                        dataKey="orders"
                                        stroke="#3b82f6"
                                        strokeWidth={2}
                                        fill="url(#gradOrders)"
                                        name="Orders"
                                    />
                                )}
                            </AreaChart>
                        </ResponsiveContainer>
                    )}
                </div>

                {/* Revenue Breakdown Donut */}
                <div className="p-5 bg-zinc-900/50 border border-white/5 rounded-2xl">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-4 flex items-center gap-1.5">
                        <DollarSign className="w-3 h-3" />
                        Revenue Split
                    </h3>

                    {revenueBreakdown.length === 0 ? (
                        <div className="flex items-center justify-center py-12">
                            <p className="text-xs text-zinc-600">No revenue data</p>
                        </div>
                    ) : (
                        <div className="pulse-chart-container flex flex-col items-center">
                            <div className="relative">
                                <ResponsiveContainer width={180} height={180}>
                                    <PieChart>
                                        <Pie
                                            data={revenueBreakdown}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={55}
                                            outerRadius={80}
                                            paddingAngle={3}
                                            dataKey="value"
                                            stroke="none"
                                        >
                                            {revenueBreakdown.map((entry, i) => (
                                                <Cell key={i} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            content={<CustomTooltip formatter={(v: number) => `€${v.toFixed(2)}`} />}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="pulse-donut-center">
                                    <p className="text-lg font-black text-white">{fmtK(overview?.revenue_cents || 0)}</p>
                                    <p className="text-[9px] text-zinc-600 font-bold uppercase">Total</p>
                                </div>
                            </div>

                            {/* Legend */}
                            <div className="flex flex-wrap gap-3 mt-3 justify-center">
                                {revenueBreakdown.map((d, i) => (
                                    <div key={i} className="flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                                        <span className="text-[10px] text-zinc-500 font-bold">{d.name}</span>
                                        <span className="text-[10px] text-zinc-400 font-bold">€{d.value.toFixed(0)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Top Sellers Bar Chart + Labor Gauge ──────── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

                {/* Top Sellers */}
                <div className="p-5 bg-zinc-900/50 border border-white/5 rounded-2xl">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-4 flex items-center gap-1.5">
                        <Flame className="w-3 h-3" />
                        Top Sellers
                    </h3>
                    {topItemsChart.length === 0 ? (
                        <div className="flex items-center justify-center py-12">
                            <p className="text-xs text-zinc-600">No sales data yet</p>
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height={240}>
                            <BarChart data={topItemsChart} layout="vertical" margin={{ top: 0, right: 10, bottom: 0, left: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={false} />
                                <XAxis
                                    type="number"
                                    tick={{ fontSize: 9, fill: '#52525b' }}
                                    axisLine={false}
                                    tickLine={false}
                                    tickFormatter={(v: number) => String(v)}
                                />
                                <YAxis
                                    type="category"
                                    dataKey="name"
                                    width={100}
                                    tick={{ fontSize: 10, fill: '#a1a1aa', fontWeight: 600 }}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <Tooltip
                                    content={<CustomTooltip formatter={(v: number) => `${v} qty`} />}
                                />
                                <Bar
                                    dataKey="quantity"
                                    fill="#10b981"
                                    radius={[0, 6, 6, 0]}
                                    name="Quantity"
                                    barSize={18}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>

                {/* Labor Dashboard */}
                <div className="p-5 bg-zinc-900/50 border border-white/5 rounded-2xl">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-4 flex items-center gap-1.5">
                        <Users className="w-3 h-3" />
                        Labor Overview
                    </h3>

                    <div className="space-y-5">
                        {/* Labor % Gauge */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-bold text-white">Labor Cost %</span>
                                <span className={cn(
                                    "text-xl font-black",
                                    (labor?.labor_percent || 0) > 30 ? "text-red-400" :
                                        (labor?.labor_percent || 0) > 25 ? "text-amber-400" : "text-emerald-400"
                                )}>
                                    {labor?.labor_percent || 0}%
                                </span>
                            </div>
                            <div className="pulse-gauge-track">
                                <div
                                    className={cn(
                                        "pulse-gauge-fill",
                                        (labor?.labor_percent || 0) > 30 ? "bg-red-500" :
                                            (labor?.labor_percent || 0) > 25 ? "bg-amber-500" : "bg-emerald-500"
                                    )}
                                    style={{ '--gauge-pct': `${Math.min(100, labor?.labor_percent || 0)}%` } as React.CSSProperties}
                                />
                            </div>
                            <div className="flex justify-between mt-1.5">
                                <span className="text-[9px] text-zinc-600 font-bold">0%</span>
                                <span className="text-[9px] text-zinc-600 font-bold">Target: 25%</span>
                                <span className="text-[9px] text-zinc-600 font-bold">50%</span>
                            </div>
                        </div>

                        {/* Labor detail cards */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="p-3 bg-zinc-800/50 rounded-xl">
                                <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-wider">Revenue</p>
                                <p className="text-lg font-bold text-white mt-1">{fmt(labor?.revenue_cents || 0)}</p>
                            </div>
                            <div className="p-3 bg-zinc-800/50 rounded-xl">
                                <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-wider">Labor Cost</p>
                                <p className="text-lg font-bold text-white mt-1">{fmt(labor?.labor_cost_cents || 0)}</p>
                            </div>
                            <div className="p-3 bg-zinc-800/50 rounded-xl">
                                <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-wider">Hours Clocked</p>
                                <p className="text-lg font-bold text-white mt-1">{labor?.clocked_hours || 0}h</p>
                            </div>
                            <div className="p-3 bg-zinc-800/50 rounded-xl">
                                <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-wider">Staff On Clock</p>
                                <p className="text-lg font-bold text-white mt-1 flex items-center gap-1.5">
                                    {labor?.staff_on_clock || 0}
                                    {(labor?.staff_on_clock || 0) > 0 && (
                                        <span className="w-2 h-2 rounded-full bg-emerald-400 pulse-live-dot" />
                                    )}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Multi-Location Comparison ──────────────────── */}
            {locations.length > 1 && (
                <div className="p-5 bg-zinc-900/50 border border-white/5 rounded-2xl">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-4 flex items-center gap-1.5">
                        <Building2 className="w-3 h-3" />
                        Multi-Location Comparison (Today)
                    </h3>
                    <div className="space-y-2">
                        {locations.map((loc, i) => {
                            const maxRev = Math.max(1, ...locations.map(l => l.revenue_today_cents));
                            const widthPct = (loc.revenue_today_cents / maxRev) * 100;
                            return (
                                <div key={loc.venue_id} className={cn(
                                    "flex items-center gap-3 p-3 rounded-xl border transition-colors",
                                    loc.venue_id === venueId ? "bg-emerald-600/10 border-emerald-500/30" : "bg-zinc-900/30 border-white/5"
                                )}>
                                    <span className={cn(
                                        "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold",
                                        i === 0 ? "bg-amber-500/20 text-amber-400" :
                                            i === 1 ? "bg-zinc-500/20 text-zinc-400" : "bg-zinc-800 text-zinc-600"
                                    )}>
                                        {i + 1}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm font-bold text-white truncate">{loc.venue_name}</p>
                                            <span className="text-sm font-bold text-emerald-400 ml-2">{fmt(loc.revenue_today_cents)}</span>
                                        </div>
                                        <div className="flex items-center gap-2 mt-1">
                                            <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-emerald-500 rounded-full transition-all duration-700 pulse-hourly-bar"
                                                    style={{ '--bar-width': `${widthPct}%` } as React.CSSProperties}
                                                />
                                            </div>
                                            <span className="text-[9px] text-zinc-600 font-bold">{loc.orders_today} orders</span>
                                        </div>
                                    </div>
                                    {loc.venue_id === venueId && (
                                        <span className="text-[9px] font-bold text-emerald-400 uppercase">Current</span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </PageContainer>
    );
}
