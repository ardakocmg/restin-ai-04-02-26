import React, { useState, useEffect, useCallback } from 'react';
import PageContainer from '../../layouts/PageContainer';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';
import './PulseAnalytics.css';
import api from '@/lib/api';
import { useVenue } from '@/context/VenueContext';
import {
    TrendingUp, TrendingDown, DollarSign, ShoppingBag,
    Clock, Users, BarChart3, ArrowRight, RefreshCw,
    Flame, Star, Building2
} from 'lucide-react';

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

export default function PulseAnalytics() {
    const { activeVenue } = useVenue();
    const [period, setPeriod] = useState<Period>('today');
    const [overview, setOverview] = useState<OverviewData | null>(null);
    const [topItems, setTopItems] = useState<TopItem[]>([]);
    const [hourly, setHourly] = useState<HourlyData[]>([]);
    const [labor, setLabor] = useState<LaborData | null>(null);
    const [locations, setLocations] = useState<LocationData[]>([]);
    const [loading, setLoading] = useState(true);

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

    const periods: { id: Period; label: string }[] = [
        { id: 'today', label: 'Today' },
        { id: 'yesterday', label: 'Yesterday' },
        { id: 'week', label: '7 Days' },
        { id: 'month', label: '30 Days' },
    ];

    // Find max hourly revenue for bar chart scaling
    const maxHourlyRev = Math.max(1, ...hourly.map(h => h.revenue_cents));

    return (
        <PageContainer
            title="Pulse Analytics"
            description="Real-time business intelligence dashboard"
            actions={
                <button onClick={loadAll} className="p-2 bg-zinc-800 border border-white/10 rounded-xl text-zinc-400 hover:text-white transition-colors" title="Refresh">
                    <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
                </button>
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

            {/* Overview Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {[
                    { label: 'Revenue', value: fmt(overview?.revenue_cents || 0), icon: DollarSign, color: 'text-emerald-400', bgColor: 'bg-emerald-600/10' },
                    { label: 'Orders', value: overview?.total_orders || 0, icon: ShoppingBag, color: 'text-blue-400', bgColor: 'bg-blue-600/10' },
                    { label: 'Avg Order', value: fmt(overview?.avg_order_cents || 0), icon: TrendingUp, color: 'text-purple-400', bgColor: 'bg-purple-600/10' },
                    { label: 'Tips', value: fmt(overview?.tips_cents || 0), icon: Star, color: 'text-amber-400', bgColor: 'bg-amber-600/10' },
                ].map((card, i) => (
                    <div key={i} className="p-5 bg-zinc-900/50 border border-white/5 rounded-2xl">
                        <div className="flex items-center gap-2 mb-3">
                            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", card.bgColor)}>
                                <card.icon className={cn("w-4 h-4", card.color)} />
                            </div>
                        </div>
                        <p className="text-2xl font-black text-white">{card.value}</p>
                        <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-500 mt-1">{card.label}</p>
                    </div>
                ))}
            </div>

            {/* Secondary Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {[
                    { label: 'Online Orders', value: overview?.online_orders || 0, sub: fmt(overview?.online_revenue_cents || 0), icon: BarChart3, color: 'text-cyan-400' },
                    { label: 'Refunds', value: overview?.refunds || 0, sub: fmt(overview?.refund_total_cents || 0), icon: TrendingDown, color: 'text-red-400' },
                    { label: 'Labor %', value: `${labor?.labor_percent || 0}%`, sub: `${labor?.clocked_hours || 0}h clocked`, icon: Users, color: labor && labor.labor_percent > 30 ? 'text-red-400' : 'text-emerald-400' },
                    { label: 'Staff On Clock', value: labor?.staff_on_clock || 0, sub: fmt(labor?.labor_cost_cents || 0) + ' cost', icon: Clock, color: 'text-zinc-400' },
                ].map((card, i) => (
                    <div key={i} className="p-4 bg-zinc-900/30 border border-white/5 rounded-xl">
                        <div className="flex items-center gap-2 mb-2">
                            <card.icon className={cn("w-4 h-4", card.color)} />
                            <span className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-600">{card.label}</span>
                        </div>
                        <p className="text-xl font-bold text-white">{card.value}</p>
                        {card.sub && <p className="text-[10px] text-zinc-600 mt-0.5">{card.sub}</p>}
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Hourly Breakdown */}
                <div className="p-5 bg-zinc-900/50 border border-white/5 rounded-2xl">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-4">
                        <BarChart3 className="w-3 h-3 inline mr-1.5" />
                        Hourly Sales
                    </h3>
                    {hourly.length === 0 ? (
                        <p className="text-xs text-zinc-600 py-8 text-center">No data for this period</p>
                    ) : (
                        <div className="space-y-1.5">
                            {hourly.map(h => (
                                <div key={h.hour} className="flex items-center gap-2">
                                    <span className="text-[10px] text-zinc-600 font-mono w-8 text-right">{h.hour}:00</span>
                                    <div className="flex-1 h-5 bg-zinc-950 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-emerald-600 to-emerald-500 rounded-full transition-all duration-500 pulse-hourly-bar"
                                            style={{ '--bar-width': `${Math.max(2, (h.revenue_cents / maxHourlyRev) * 100)}%` } as React.CSSProperties}
                                        />
                                    </div>
                                    <span className="text-[10px] text-zinc-500 font-mono w-16 text-right">{fmt(h.revenue_cents)}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Top Items */}
                <div className="p-5 bg-zinc-900/50 border border-white/5 rounded-2xl">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-4">
                        <Flame className="w-3 h-3 inline mr-1.5" />
                        Top Sellers
                    </h3>
                    {topItems.length === 0 ? (
                        <p className="text-xs text-zinc-600 py-8 text-center">No sales data yet</p>
                    ) : (
                        <div className="space-y-2">
                            {topItems.map((item, i) => (
                                <div key={item.name} className="flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-800/50 transition-colors">
                                    <span className={cn(
                                        "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold",
                                        i === 0 ? "bg-amber-500/20 text-amber-400" :
                                            i === 1 ? "bg-zinc-500/20 text-zinc-400" :
                                                i === 2 ? "bg-orange-600/20 text-orange-400" :
                                                    "bg-zinc-800 text-zinc-600"
                                    )}>
                                        {i + 1}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-white truncate">{item.name}</p>
                                        <p className="text-[10px] text-zinc-600">{item.quantity} sold</p>
                                    </div>
                                    <span className="text-sm font-bold text-emerald-400">{fmt(item.revenue_cents)}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Multi-Location */}
            {locations.length > 1 && (
                <div className="mt-6 p-5 bg-zinc-900/50 border border-white/5 rounded-2xl">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-4">
                        <Building2 className="w-3 h-3 inline mr-1.5" />
                        Multi-Location Comparison (Today)
                    </h3>
                    <div className="space-y-2">
                        {locations.map((loc, i) => (
                            <div key={loc.venue_id} className={cn(
                                "flex items-center justify-between p-3 rounded-xl border transition-colors",
                                loc.venue_id === venueId ? "bg-emerald-600/10 border-emerald-500/30" : "bg-zinc-900/30 border-white/5"
                            )}>
                                <div className="flex items-center gap-3">
                                    <span className="text-[10px] font-bold text-zinc-500 w-4">{i + 1}</span>
                                    <div>
                                        <p className="text-sm font-bold text-white">{loc.venue_name}</p>
                                        <p className="text-[10px] text-zinc-600">{loc.orders_today} orders</p>
                                    </div>
                                </div>
                                <span className="text-sm font-bold text-emerald-400">{fmt(loc.revenue_today_cents)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </PageContainer>
    );
}
