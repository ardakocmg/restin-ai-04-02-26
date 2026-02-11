import React from 'react';
import {
    Globe, Mic, Wand2, Radar, ShieldCheck,
    TrendingUp, CreditCard, Activity,
    ChevronRight, ArrowUpRight, Zap, Target, Loader2,
    Truck, Users
} from 'lucide-react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { cn } from '../../lib/utils';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { useVenue } from '../../context/VenueContext';
import { useAuth } from '../../context/AuthContext';
import PermissionGate from '../../components/shared/PermissionGate';
import { useAuditLog } from '../../hooks/useAuditLog';

/**
 * 🛰️ RESTIN.AI CONTROL TOWER (Protocol v18.0)
 * Central Command for the Restaurant AI Operating System.
 * All metrics fetched from LIVE backend endpoints.
 */

interface PillarConfig {
    id: string;
    title: string;
    icon: React.ElementType;
    color: string;
    description: string;
    route: string;
    metricsEndpoint: string;
    metricsExtractor: (data: Record<string, unknown>) => string;
    statusExtractor: (data: Record<string, unknown>) => string;
}

const PILLAR_CONFIGS: PillarConfig[] = [
    {
        id: 'web',
        title: 'Web Architect',
        icon: Globe,
        color: 'blue',
        description: 'Synchronized digital storefront with live inventory mapping.',
        route: '/admin/restin/web',
        metricsEndpoint: '/web/site',
        metricsExtractor: (d) => d?.site_name ? 'Published' : 'Draft',
        statusExtractor: (d) => d?.site_name ? 'Live' : 'Setup'
    },
    {
        id: 'voice',
        title: 'Voice AI',
        icon: Mic,
        color: 'red',
        description: '24/7 RAG-based receptionist handling guest inquiries.',
        route: '/admin/restin/voice',
        metricsEndpoint: '/voice/analytics',
        metricsExtractor: (d) => `${d?.total_calls || 0} Calls`,
        statusExtractor: (d) => (d?.total_calls as number) > 0 ? 'Active' : 'Ready'
    },
    {
        id: 'studio',
        title: 'Generative Studio',
        icon: Wand2,
        color: 'purple',
        description: 'Reality-first generative content pipeline for menu visuals.',
        route: '/admin/restin/studio',
        metricsEndpoint: '/media/assets',
        metricsExtractor: (d) => `${Array.isArray(d) ? d.length : 0} Assets`,
        statusExtractor: (d) => Array.isArray(d) && d.length > 0 ? 'Active' : 'Empty'
    },
    {
        id: 'radar',
        title: 'Market Radar',
        icon: Radar,
        color: 'orange',
        description: 'Real-time competitive intelligence and yield management.',
        route: '/admin/restin/radar',
        metricsEndpoint: '/radar/competitors',
        metricsExtractor: (d) => `${Array.isArray(d) ? d.length : 0} Tracked`,
        statusExtractor: (d) => Array.isArray(d) && d.length > 0 ? 'Scanning' : 'Idle'
    },
    {
        id: 'crm',
        title: 'Autopilot CRM',
        icon: Zap,
        color: 'yellow',
        description: 'Autonomous churn detection and boomerang outreach.',
        route: '/admin/restin/crm',
        metricsEndpoint: '/crm/stats',
        metricsExtractor: (d) => `${d?.high_risk || 0} At Risk`,
        statusExtractor: (d) => (d?.campaigns_sent as number) > 0 ? 'Triggered' : 'Monitoring'
    },
    {
        id: 'fintech',
        title: 'Fintech Hub',
        icon: CreditCard,
        color: 'emerald',
        description: 'Omni-channel settlement and embedded financial logic.',
        route: '/admin/restin/fintech',
        metricsEndpoint: '/fintech/stats',
        metricsExtractor: (d) => {
            const rev = (d?.total_revenue_cents as number) || 0;
            return `€${(rev / 100).toFixed(0)} Rev`;
        },
        statusExtractor: (d) => (d?.total_transactions as number) > 0 ? 'Stable' : 'Setup'
    }
];

const colorMap: Record<string, { bg: string; text: string; glow: string }> = {
    red: { bg: 'bg-red-500/10', text: 'text-red-500', glow: 'bg-red-500' },
    blue: { bg: 'bg-blue-500/10', text: 'text-blue-500', glow: 'bg-blue-500' },
    purple: { bg: 'bg-purple-500/10', text: 'text-purple-500', glow: 'bg-purple-500' },
    orange: { bg: 'bg-orange-500/10', text: 'text-orange-500', glow: 'bg-orange-500' },
    yellow: { bg: 'bg-yellow-500/10', text: 'text-yellow-500', glow: 'bg-yellow-500' },
    emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-500', glow: 'bg-emerald-500' },
};

function usePillarMetrics(venueId: string | null) {
    return useQuery({
        queryKey: ['control-tower-metrics', venueId],
        queryFn: async () => {
            const results: Record<string, { metrics: string; status: string }> = {};
            const promises = PILLAR_CONFIGS.map(async (pillar) => {
                try {
                    const sep = pillar.metricsEndpoint.includes('?') ? '&' : '?';
                    const res = await api.get(`${pillar.metricsEndpoint}${sep}venue_id=${venueId}`);
                    results[pillar.id] = {
                        metrics: pillar.metricsExtractor(res.data),
                        status: pillar.statusExtractor(res.data),
                    };
                } catch {
                    results[pillar.id] = { metrics: 'Offline', status: 'Error' };
                }
            });
            await Promise.all(promises);
            return results;
        },
        enabled: !!venueId,
        refetchInterval: 30000,
    });
}

function useAggregateStats(venueId: string | null) {
    return useQuery({
        queryKey: ['control-tower-aggregate', venueId],
        queryFn: async () => {
            const [fintech, ops, voice] = await Promise.allSettled([
                api.get(`/fintech/stats?venue_id=${venueId}`),
                api.get(`/ops/metrics?venue_id=${venueId}`),
                api.get(`/voice/analytics?venue_id=${venueId}`),
            ]);
            const ft = fintech.status === 'fulfilled' ? fintech.value.data : {};
            const op = ops.status === 'fulfilled' ? ops.value.data : {};
            const vo = voice.status === 'fulfilled' ? voice.value.data : {};

            return {
                totalRevenue: `€${(((ft?.total_revenue_cents as number) || 0) / 100).toFixed(0)}`,
                laborPct: `${(op?.labor_percentage as number) || 0}%`,
                totalCalls: `${(vo?.total_calls as number) || 0}`,
                kdsActive: `${((op?.kds_pending as number) || 0) + ((op?.kds_in_progress as number) || 0)}`,
            };
        },
        enabled: !!venueId,
        refetchInterval: 30000,
    });
}

export default function RestinControlTower() {
    const navigate = useNavigate();
    const { activeVenueId } = useVenue();
    const { user } = useAuth();
    const { logAction } = useAuditLog();
    const { data: pillarData, isLoading } = usePillarMetrics(activeVenueId);
    const { data: stats } = useAggregateStats(activeVenueId);

    // Audit: log control tower access (super-admin)
    React.useEffect(() => {
        if (user?.id) logAction('CONTROL_TOWER_VIEWED', 'restin_control_tower');
    }, [user?.id]);

    return (
        <PermissionGate requiredRole="OWNER">
            <div className="flex flex-col gap-8 animate-in fade-in duration-700">
                {/* Header Section */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-4xl font-black text-white italic tracking-tighter flex items-center gap-3">
                            <span className="bg-red-600 px-3 py-1 rounded-lg shadow-[0_0_30px_rgba(220,38,38,0.3)]">AI</span>
                            CONTROL TOWER
                        </h1>
                        <p className="text-zinc-500 mt-2 font-medium tracking-wide">
                            v18.0 RESTIN CORE • LIVE OPERATING SYSTEM
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 px-4 py-2 bg-zinc-900/50 rounded-full border border-zinc-800">
                            {isLoading ? (
                                <Loader2 className="w-3 h-3 animate-spin text-zinc-400" />
                            ) : (
                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                            )}
                            <span className="text-xs font-bold text-zinc-300 uppercase tracking-widest">
                                {isLoading ? 'Connecting...' : 'System Optimal'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Stats Ribbon — LIVE */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                        { label: 'Total Revenue', value: stats?.totalRevenue || '—', trend: 'Live', icon: TrendingUp },
                        { label: 'Labor Cost', value: stats?.laborPct || '—', trend: 'Target 28%', icon: Users },
                        { label: 'Voice Calls', value: stats?.totalCalls || '0', trend: 'Pillar 4', icon: Mic },
                        { label: 'KDS Active', value: stats?.kdsActive || '0', trend: 'Kitchen', icon: Activity },
                    ].map((stat, i) => (
                        <Card key={i} className="bg-zinc-900/30 border-zinc-800/50 p-6 backdrop-blur-md group hover:border-red-500/30 transition-all duration-300">
                            <div className="flex justify-between items-start">
                                <div className="p-2 rounded-lg bg-zinc-800/50 text-zinc-400 group-hover:text-red-500 transition-colors">
                                    <stat.icon size={20} />
                                </div>
                                <span className="text-[10px] font-black px-2 py-1 rounded-full bg-zinc-800 text-zinc-400">
                                    {stat.trend}
                                </span>
                            </div>
                            <div className="mt-4">
                                <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">{stat.label}</p>
                                <p className="text-2xl font-black text-white mt-1">{stat.value}</p>
                            </div>
                        </Card>
                    ))}
                </div>

                {/* Main Grid: Pillars — LIVE */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {PILLAR_CONFIGS.map((pillar) => {
                        const colors = colorMap[pillar.color] || colorMap.red;
                        const live = pillarData?.[pillar.id];
                        return (
                            <Card
                                key={pillar.id}
                                className="relative overflow-hidden group bg-zinc-900/20 border-zinc-800/50 p-8 backdrop-blur-xl hover:bg-zinc-900/40 transition-all duration-500 hover:scale-[1.02] hover:shadow-[0_20px_50px_rgba(0,0,0,0.5)] cursor-pointer"
                                onClick={() => navigate(pillar.route)}
                            >
                                {/* Background Glow */}
                                <div className={cn(
                                    "absolute -right-20 -top-20 w-40 h-40 blur-[100px] opacity-0 group-hover:opacity-20 transition-opacity duration-700 rounded-full",
                                    colors.glow
                                )}></div>

                                <div className="relative z-10">
                                    <div className="flex justify-between items-center mb-6">
                                        <div className={cn("p-4 rounded-2xl transition-all duration-500 shadow-2xl", colors.bg, colors.text)}>
                                            <pillar.icon size={28} />
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Status</span>
                                            <span className="text-xs font-bold text-white mt-1">
                                                {isLoading ? <Loader2 size={12} className="animate-spin" /> : (live?.status || '—')}
                                            </span>
                                        </div>
                                    </div>

                                    <h3 className="text-2xl font-black text-white tracking-tight leading-none group-hover:text-red-500 transition-colors">
                                        {pillar.title}
                                    </h3>
                                    <p className="text-sm text-zinc-500 mt-4 leading-relaxed font-medium">
                                        {pillar.description}
                                    </p>

                                    <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600">Metric</span>
                                            <span className="text-sm font-bold text-zinc-300">
                                                {isLoading ? '...' : (live?.metrics || '—')}
                                            </span>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="rounded-full bg-zinc-800/10 hover:bg-zinc-800 hover:text-white"
                                        >
                                            <ArrowUpRight size={20} />
                                        </Button>
                                    </div>
                                </div>
                            </Card>
                        );
                    })}

                    {/* Intelligence Radar Section (Large) */}
                    <Card className="lg:col-span-3 bg-gradient-to-br from-zinc-900 via-zinc-950 to-black border-zinc-800/50 p-1 bg-white/5 backdrop-blur-3xl overflow-hidden group">
                        <div className="h-full p-8 flex flex-col lg:flex-row gap-8 items-center bg-zinc-950/90 rounded-[inherit]">
                            <div className="flex-1 space-y-6">
                                <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-500/10 border border-red-500/20 rounded-full">
                                    <Target className="h-4 w-4 text-red-500" />
                                    <span className="text-[10px] font-black text-red-500 uppercase tracking-[0.2em]">Deep Intelligence Activated</span>
                                </div>
                                <h2 className="text-5xl font-black text-white italic tracking-tighter leading-none">
                                    MARKET <br /> <span className="text-red-600">GROUNDING</span>
                                </h2>
                                <p className="text-lg text-zinc-400 font-medium leading-relaxed max-w-xl">
                                    Gemini 1.5 Pro monitors regional competitors and syncs pricing intelligence into your yield management engine.
                                </p>
                                <div className="flex gap-4 pt-4">
                                    <Button
                                        className="h-14 px-8 bg-red-600 text-white font-black rounded-2xl hover:bg-red-700 shadow-[0_10px_40px_rgba(220,38,38,0.3)] border-none"
                                        onClick={() => navigate('/admin/restin/radar')}
                                    >
                                        View Market Map
                                    </Button>
                                    <Button variant="outline" className="h-14 px-8 border-zinc-800 text-white font-bold rounded-2xl hover:bg-white/5">
                                        Calibration Settings
                                    </Button>
                                </div>
                            </div>

                            <div className="w-full lg:w-[400px] h-[300px] relative">
                                {/* Simulated Radar Visual */}
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-64 h-64 rounded-full border border-zinc-800 animate-[spin_10s_linear_infinite] relative">
                                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 bg-red-500 rounded-full shadow-[0_0_20px_white]"></div>
                                        <div className="absolute top-1/4 right-0 w-2 h-2 bg-zinc-700 rounded-full"></div>
                                    </div>
                                    <div className="absolute w-40 h-40 rounded-full border border-zinc-800 shadow-[inset_0_0_50px_rgba(220,38,38,0.05)]"></div>
                                    <div className="absolute w-20 h-20 bg-red-600/5 rounded-full flex items-center justify-center backdrop-blur-2xl">
                                        <Radar className="text-red-500 animate-pulse" size={32} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>

                <div className="pb-12 text-center text-zinc-600 font-bold text-xs tracking-widest uppercase">
                    Autonomous Restaurant Operating System • Powered by Restin & Google Vertex AI
                </div>
            </div>
        </PermissionGate>
    );
}
