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
                    <Circle className="w-2 h-2 fill-current pulse-tooltip-dot" style={{ '--dot-color': p.color } as React.CSSProperties} /> /* keep-inline */ /* keep-inline */
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
        const online = overview?.online_revenue_cents || 0;
        const inStore = Math.max(0, (overview?.revenue_cents || 0) - online);
        const tips = overview?.tips_cents || 0;
        const items = [
            { name: 'In-Store', value: inStore / 100, color: '#10b981' },
            { name: 'Online', value: online / 100, color: '#3b82f6' },
            { name: 'Tips', value: tips / 100, color: '#f59e0b' },
        ];
        // If all zero, still return segments so donut renders (with tiny placeholder values for shape)
        const hasData = items.some(d => d.value > 0);
        return hasData ? items.filter(d => d.value > 0) : items.map(d => ({ ...d, value: 0.01 }));
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
                        className="p-2 bg-secondary border border-border rounded-xl text-muted-foreground hover:text-foreground transition-colors"
                        title="Refresh data"
                    >
                        <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
                    </button>
                </div>
            }
        >
            {/* Period Selector */}
            <div className="flex items-center gap-1 mb-6 bg-card p-1 rounded-xl border border-border w-fit">
                {periods.map(p => (
                    <button
                        key={p.id}
                        onClick={() => setPeriod(p.id)}
                        className={cn(
                            "px-4 py-2 rounded-lg text-sm font-bold transition-all",
                            period === p.id ? "bg-emerald-600 text-foreground" : "text-muted-foreground hover:text-foreground"
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
                    <div key={i} className="p-5 bg-card/50 border border-border rounded-2xl pulse-stat-card cursor-default">
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
                        <p className="text-2xl font-black text-foreground">{card.value}</p>
                        <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground mt-1">{card.label}</p>
                    </div>
                ))}
            </div>

            {/* ── Secondary Stats Row ───────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {[
                    { label: 'Online Orders', value: overview?.online_orders || 0, sub: fmt(overview?.online_revenue_cents || 0), icon: Zap, color: 'text-cyan-400' },
                    { label: 'Refunds', value: overview?.refunds || 0, sub: fmt(overview?.refund_total_cents || 0), icon: TrendingDown, color: 'text-red-400' },
                    { label: 'Tax Collected', value: fmt(overview?.tax_cents || 0), sub: `${overview?.total_orders || 0} transactions`, icon: Percent, color: 'text-orange-400' },
                    { label: 'Staff On Clock', value: labor?.staff_on_clock || 0, sub: `${labor?.clocked_hours || 0}h clocked`, icon: Users, color: 'text-muted-foreground' },
                ].map((card, i) => (
                    <div key={i} className="p-4 bg-card/30 border border-border rounded-xl pulse-stat-card cursor-default">
                        <div className="flex items-center gap-2 mb-2">
                            <card.icon className={cn("w-4 h-4", card.color)} />
                            <span className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground">{card.label}</span>
                        </div>
                        <p className="text-xl font-bold text-foreground">{card.value}</p>
                        {card.sub && <p className="text-[10px] text-muted-foreground mt-0.5">{card.sub}</p>}
                    </div>
                ))}
            </div>

            {/* ── Charts Row ─────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">

                {/* Hourly Revenue / Orders Area Chart */}
                <div className="lg:col-span-2 p-5 bg-card/50 border border-border rounded-2xl">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-1.5">
                            <Activity className="w-3 h-3" />
                            Hourly Performance
                        </h3>
                        <div className="flex items-center gap-1 bg-secondary p-0.5 rounded-lg">
                            <button
                                onClick={() => setChartView('revenue')}
                                className={cn(
                                    "px-3 py-1 rounded-md text-[10px] font-bold transition-all",
                                    chartView === 'revenue' ? "bg-emerald-600 text-foreground" : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                Revenue
                            </button>
                            <button
                                onClick={() => setChartView('orders')}
                                className={cn(
                                    "px-3 py-1 rounded-md text-[10px] font-bold transition-all",
                                    chartView === 'orders' ? "bg-blue-600 text-foreground" : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                Orders
                            </button>
                        </div>
                    </div>

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
                </div>

                {/* Revenue Breakdown Donut */}
                <div className="p-5 bg-card/50 border border-border rounded-2xl">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-4 flex items-center gap-1.5">
                        <DollarSign className="w-3 h-3" />
                        Revenue Split
                    </h3>

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
                                <p className="text-lg font-black text-foreground">{fmtK(overview?.revenue_cents || 0)}</p>
                                <p className="text-[9px] text-muted-foreground font-bold uppercase">Total</p>
                            </div>
                        </div>

                        {/* Legend */}
                        <div className="flex flex-wrap gap-3 mt-3 justify-center">
                            {revenueBreakdown.map((d, i) => (
                                <div key={i} className="flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} /> /* keep-inline */ /* keep-inline */
                                    <span className="text-[10px] text-muted-foreground font-bold">{d.name}</span>
                                    <span className="text-[10px] text-muted-foreground font-bold">€{Math.max(0, Math.round(d.value))}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Top Sellers Bar Chart + Labor Gauge ──────── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

                {/* Top Sellers */}
                <div className="p-5 bg-card/50 border border-border rounded-2xl">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-4 flex items-center gap-1.5">
                        <Flame className="w-3 h-3" />
                        Top Sellers
                    </h3>
                    <ResponsiveContainer width="100%" height={240}>
                        <BarChart data={topItemsChart.length > 0 ? topItemsChart : [{ name: '—', quantity: 0, revenue: 0 }]} layout="vertical" margin={{ top: 0, right: 10, bottom: 0, left: 0 }}>
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
                </div>

                {/* Labor Dashboard */}
                <div className="p-5 bg-card/50 border border-border rounded-2xl">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-4 flex items-center gap-1.5">
                        <Users className="w-3 h-3" />
                        Labor Overview
                    </h3>

                    <div className="space-y-5">
                        {/* Labor % Gauge */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-bold text-foreground">Labor Cost %</span>
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
                                    style={{ width: `${Math.min(100, labor?.labor_percent || 0)}%` }}
                                />
                            </div>
                            <div className="flex justify-between mt-1.5">
                                <span className="text-[9px] text-muted-foreground font-bold">0%</span>
                                <span className="text-[9px] text-muted-foreground font-bold">Target: 25%</span>
                                <span className="text-[9px] text-muted-foreground font-bold">50%</span>
                            </div>
                        </div>

                        {/* Labor detail cards */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="p-3 bg-secondary/50 rounded-xl">
                                <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider">Revenue</p>
                                <p className="text-lg font-bold text-foreground mt-1">{fmt(labor?.revenue_cents || 0)}</p>
                            </div>
                            <div className="p-3 bg-secondary/50 rounded-xl">
                                <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider">Labor Cost</p>
                                <p className="text-lg font-bold text-foreground mt-1">{fmt(labor?.labor_cost_cents || 0)}</p>
                            </div>
                            <div className="p-3 bg-secondary/50 rounded-xl">
                                <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider">Hours Clocked</p>
                                <p className="text-lg font-bold text-foreground mt-1">{labor?.clocked_hours || 0}h</p>
                            </div>
                            <div className="p-3 bg-secondary/50 rounded-xl">
                                <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider">Staff On Clock</p>
                                <p className="text-lg font-bold text-foreground mt-1 flex items-center gap-1.5">
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
                <div className="p-5 bg-card/50 border border-border rounded-2xl">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-4 flex items-center gap-1.5">
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
                                    loc.venue_id === venueId ? "bg-emerald-600/10 border-emerald-500/30" : "bg-card/30 border-border"
                                )}>
                                    <span className={cn(
                                        "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold",
                                        i === 0 ? "bg-amber-500/20 text-amber-400" :
                                            i === 1 ? "bg-zinc-500/20 text-muted-foreground" : "bg-secondary text-muted-foreground"
                                    )}>
                                        {i + 1}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm font-bold text-foreground truncate">{loc.venue_name}</p>
                                            <span className="text-sm font-bold text-emerald-400 ml-2">{fmt(loc.revenue_today_cents)}</span>
                                        </div>
                                        <div className="flex items-center gap-2 mt-1">
                                            <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-emerald-500 rounded-full transition-all duration-700 pulse-hourly-bar"
                                                    style={{ '--bar-width': `${widthPct}%` } as React.CSSProperties} /* keep-inline */ /* keep-inline */
                                                />
                                            </div>
                                            <span className="text-[9px] text-muted-foreground font-bold">{loc.orders_today} orders</span>
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
