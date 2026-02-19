import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useVenue } from '../../../context/VenueContext';
import api from '@/lib/api';
import {
    CreditCard, Zap, HardDrive, Receipt, Package, ToggleLeft, ToggleRight,
    ArrowUpRight, Brain, TrendingUp, ChevronRight, Sparkles
} from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

/* ────────────────────── helpers ────────────────────── */
const fmt = (v: number) => `€${v.toFixed(2)}`;

/* ────────────────────── BillingDashboard ────────────────────── */
export default function BillingDashboard() {
    const { activeVenueId: venueId } = useVenue();
    const qc = useQueryClient();
    const [tab, setTab] = useState<'overview' | 'modules' | 'usage' | 'invoices'>('overview');

    /* ── queries ── */
    const { data: billing, isLoading } = useQuery({
        queryKey: ['billing', venueId],
        queryFn: () => api.get(`/billing/current?venue_id=${venueId}`).then(r => r.data),
        enabled: !!venueId,
    });

    const { data: plans } = useQuery({
        queryKey: ['billing-plans'],
        queryFn: () => api.get('/billing/plans').then(r => r.data),
    });

    const { data: usage } = useQuery({
        queryKey: ['billing-usage', venueId],
        queryFn: () => api.get(`/billing/usage?venue_id=${venueId}`).then(r => r.data),
        enabled: !!venueId && tab === 'usage',
    });

    const { data: invoices } = useQuery({
        queryKey: ['billing-invoices', venueId],
        queryFn: () => api.get(`/billing/invoices?venue_id=${venueId}`).then(r => r.data),
        enabled: !!venueId && tab === 'invoices',
    });

    /* ── mutations ── */
    const toggleMod = useMutation({
        mutationFn: (p: { module: string; enabled: boolean }) =>
            api.post(`/billing/modules?venue_id=${venueId}&module=${p.module}&enabled=${p.enabled}`),
        onSuccess: (_, v) => {
            qc.invalidateQueries({ queryKey: ['billing'] });
            toast.success(`${v.module} ${v.enabled ? 'enabled' : 'disabled'}`);
        },
    });

    const changePlan = useMutation({
        mutationFn: (planKey: string) => api.post(`/billing/subscribe?venue_id=${venueId}&plan_key=${planKey}`),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['billing'] });
            toast.success('Plan updated');
        },
    });

    const switchModel = useMutation({
        mutationFn: (model: string) => api.post(`/billing/ai-model?venue_id=${venueId}&model=${model}`),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['billing-usage'] });
            toast.success('AI model switched');
        },
    });

    if (isLoading) return <div className="p-8 text-center text-zinc-500">Loading billing…</div>;

    const modules = billing?.modules?.items ?? [];
    const moduleKeys: Record<string, boolean> = {};
    modules.forEach((m: { key: string }) => { moduleKeys[m.key] = true; });

    const MODULE_LIST = [
        { key: 'hasVoice', name: 'Voice AI', icon: '📞', price: 50 },
        { key: 'hasRadar', name: 'Market Radar', icon: '🔬', price: 30 },
        { key: 'hasStudio', name: 'Content Studio', icon: '🎨', price: 20 },
        { key: 'hasCRM', name: 'Autopilot CRM', icon: '🤖', price: 40 },
        { key: 'hasFintech', name: 'Omni-Payment', icon: '💳', price: 25 },
        { key: 'hasOps', name: 'Operations Hub', icon: '⚙️', price: 35 },
        { key: 'hasWeb', name: 'Web Architect', icon: '🌐', price: 30 },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-zinc-100">Billing & Subscription</h1>
                    <p className="text-sm text-zinc-500 mt-1">Manage your plan, modules, and usage</p>
                </div>
                <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-2">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-400 font-semibold text-lg">{fmt(billing?.total_estimated ?? 0)}</span>
                    <span className="text-zinc-500 text-sm">/mo</span>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-zinc-900 rounded-lg p-1">
                {(['overview', 'modules', 'usage', 'invoices'] as const).map(t => (
                    <button
                        key={t}
                        onClick={() => setTab(t)}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all capitalize ${tab === t ? 'bg-zinc-800 text-zinc-100 shadow' : 'text-zinc-500 hover:text-zinc-300'
                            }`}
                    >
                        {t}
                    </button>
                ))}
            </div>

            {/* ── Overview Tab ── */}
            {tab === 'overview' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard icon={<CreditCard className="w-5 h-5" />} label="Plan" value={billing?.plan?.name ?? 'Free'} sub={fmt(billing?.plan?.price ?? 0) + '/mo'} color="blue" />
                    <StatCard icon={<Package className="w-5 h-5" />} label="Modules" value={`${modules.length} active`} sub={fmt(billing?.modules?.total ?? 0) + '/mo'} color="purple" />
                    <StatCard icon={<Brain className="w-5 h-5" />} label="AI Usage" value={`${(billing?.ai?.tokens_used ?? 0).toLocaleString()} tokens`} sub={fmt(billing?.ai?.billed ?? 0)} color="amber" />
                    <StatCard icon={<HardDrive className="w-5 h-5" />} label="Storage" value={`${billing?.storage?.used_gb ?? 0} GB`} sub={fmt(billing?.storage?.cost ?? 0) + '/mo'} color="emerald" />
                </div>
            )}

            {/* ── Plans Selection ── */}
            {tab === 'overview' && plans && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    {plans.map((p: { key: string; name: string; price: number; features: string[] }) => (
                        <motion.div
                            key={p.key}
                            whileHover={{ y: -2 }}
                            className={`p-5 rounded-xl border transition-all cursor-pointer ${billing?.plan?.name === p.name
                                ? 'border-blue-500/50 bg-blue-500/5'
                                : 'border-zinc-800 bg-zinc-900/50 hover:border-zinc-700'
                                }`}
                            onClick={() => p.name !== billing?.plan?.name && changePlan.mutate(p.key)}
                        >
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-lg font-semibold text-zinc-100">{p.name}</span>
                                <span className="text-xl font-bold text-blue-400">{fmt(p.price)}<span className="text-xs text-zinc-500">/mo</span></span>
                            </div>
                            <div className="space-y-1">
                                {p.features.map(f => (
                                    <div key={f} className="flex items-center gap-2 text-sm text-zinc-400">
                                        <ChevronRight className="w-3 h-3 text-emerald-500" />
                                        {f}
                                    </div>
                                ))}
                            </div>
                            {billing?.plan?.name === p.name && (
                                <div className="mt-3 text-xs text-blue-400 font-medium">✓ Current Plan</div>
                            )}
                        </motion.div>
                    ))}
                </div>
            )}

            {/* ── Modules Tab ── */}
            {tab === 'modules' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {MODULE_LIST.map(m => {
                        const active = moduleKeys[m.key] ?? false;
                        return (
                            <div key={m.key} className={`flex items-center justify-between p-4 rounded-xl border transition-all ${active ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-zinc-800 bg-zinc-900/50'
                                }`}>
                                <div className="flex items-center gap-3">
                                    <span className="text-2xl">{m.icon}</span>
                                    <div>
                                        <div className="font-medium text-zinc-100">{m.name}</div>
                                        <div className="text-sm text-zinc-500">{fmt(m.price)}/mo</div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => toggleMod.mutate({ module: m.key, enabled: !active })}
                                    className="transition-colors"
                                    disabled={toggleMod.isPending}
                                >
                                    {active
                                        ? <ToggleRight className="w-8 h-8 text-emerald-400" />
                                        : <ToggleLeft className="w-8 h-8 text-zinc-600" />}
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ── Usage Tab ── */}
            {tab === 'usage' && usage && (
                <div className="space-y-6">
                    {/* AI Model Selector */}
                    <div className="p-5 rounded-xl border border-zinc-800 bg-zinc-900/50">
                        <h3 className="font-semibold text-zinc-100 mb-3 flex items-center gap-2">
                            <Brain className="w-5 h-5 text-amber-400" />
                            AI Model
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            {usage.ai.available_models.map((m: { key: string; name: string; price_per_1k: number }) => (
                                <div
                                    key={m.key}
                                    onClick={() => switchModel.mutate(m.key)}
                                    className={`p-3 rounded-lg border cursor-pointer transition-all ${usage.ai.model_key === m.key
                                        ? 'border-amber-500/50 bg-amber-500/10'
                                        : 'border-zinc-800 hover:border-zinc-700'
                                        }`}
                                >
                                    <div className="font-medium text-zinc-200 text-sm">{m.name}</div>
                                    <div className="text-xs text-zinc-500 mt-1">{fmt(m.price_per_1k)}/1k tokens</div>
                                    {usage.ai.model_key === m.key && (
                                        <div className="text-xs text-amber-400 mt-1">✓ Active</div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Usage Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-5 rounded-xl border border-zinc-800 bg-zinc-900/50">
                            <h3 className="font-semibold text-zinc-100 mb-2 flex items-center gap-2">
                                <Zap className="w-4 h-4 text-amber-400" /> AI Tokens
                            </h3>
                            <div className="text-3xl font-bold text-zinc-100">{usage.ai.tokens_used.toLocaleString()}</div>
                            <div className="text-sm text-zinc-500 mt-1">Cost: {fmt(usage.ai.cost_per_1k)}/1k tokens</div>
                        </div>
                        <div className="p-5 rounded-xl border border-zinc-800 bg-zinc-900/50">
                            <h3 className="font-semibold text-zinc-100 mb-2 flex items-center gap-2">
                                <HardDrive className="w-4 h-4 text-emerald-400" /> Storage
                            </h3>
                            <div className="text-3xl font-bold text-zinc-100">{usage.storage.used_gb} GB</div>
                            <div className="text-sm text-zinc-500 mt-1">{fmt(usage.storage.cost)}/mo ({fmt(usage.storage.rate_per_gb)}/GB)</div>
                        </div>
                    </div>

                    {/* Recent Usage Log */}
                    {usage.recent_usage?.length > 0 && (
                        <div className="p-5 rounded-xl border border-zinc-800 bg-zinc-900/50">
                            <h3 className="font-semibold text-zinc-100 mb-3">Recent AI Usage</h3>
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                                {usage.recent_usage.map((entry: { id: string; model: string; tokens: number; created_at: string }, i: number) => (
                                    <div key={entry.id ?? i} className="flex items-center justify-between py-2 border-b border-zinc-800/50 last:border-0">
                                        <span className="text-sm text-zinc-400">{entry.model ?? 'Gemini'}</span>
                                        <span className="text-sm text-zinc-300">{entry.tokens?.toLocaleString() ?? '—'} tokens</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ── Invoices Tab ── */}
            {tab === 'invoices' && (
                <div className="space-y-3">
                    {invoices?.map((inv: { id: string; period_start: string; period_end: string; status: string; total: number }) => (
                        <div key={inv.id} className="flex items-center justify-between p-4 rounded-xl border border-zinc-800 bg-zinc-900/50">
                            <div className="flex items-center gap-3">
                                <Receipt className="w-5 h-5 text-zinc-500" />
                                <div>
                                    <div className="text-sm font-medium text-zinc-200">
                                        {new Date(inv.period_start).toLocaleDateString('en', { month: 'short', year: 'numeric' })}
                                    </div>
                                    <div className="text-xs text-zinc-500 capitalize">{inv.status}</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="font-semibold text-zinc-100">{fmt(inv.total)}</span>
                                <ArrowUpRight className="w-4 h-4 text-zinc-600" />
                            </div>
                        </div>
                    ))}
                    {(!invoices || invoices.length === 0) && (
                        <div className="text-center py-8 text-zinc-500">No invoices yet</div>
                    )}
                </div>
            )}
        </div>
    );
}

/* ────────────────────── StatCard ────────────────────── */
function StatCard({ icon, label, value, sub, color }: {
    icon: React.ReactNode; label: string; value: string; sub: string; color: string;
}) {
    const colors: Record<string, string> = {
        blue: 'from-blue-500/10 to-transparent border-blue-500/20',
        purple: 'from-purple-500/10 to-transparent border-purple-500/20',
        amber: 'from-amber-500/10 to-transparent border-amber-500/20',
        emerald: 'from-emerald-500/10 to-transparent border-emerald-500/20',
    };
    return (
        <div className={`p-4 rounded-xl border bg-gradient-to-br ${colors[color] ?? colors.blue}`}>
            <div className="flex items-center gap-2 text-zinc-500 mb-2">{icon}<span className="text-sm">{label}</span></div>
            <div className="text-xl font-bold text-zinc-100">{value}</div>
            <div className="text-sm text-zinc-500 mt-1">{sub}</div>
        </div>
    );
}
