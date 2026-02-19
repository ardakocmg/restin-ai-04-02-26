import React, { useState, useEffect } from 'react';
import PageContainer from '../../layouts/PageContainer';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';
import api from '@/lib/api';
import { useVenue } from '@/context/VenueContext';
import { useAuth } from '@/context/AuthContext';
import {
    Percent, DollarSign, Layers, Save,
    Monitor, Receipt, Smartphone, ToggleLeft, ToggleRight
} from 'lucide-react';

interface TipPresetConfig {
    id: string;
    venue_id: string;
    enabled: boolean;
    mode: 'percent' | 'fixed' | 'combo';
    percent_options: number[];
    fixed_options_cents: number[];
    default_selected: number;
    show_custom: boolean;
    show_on: string[];
    created_at: string;
    [key: string]: unknown;
}

export default function TipPresetsSettings() {
    const { activeVenue } = useVenue();
    const { user } = useAuth();
    const [config, setConfig] = useState<TipPresetConfig | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!activeVenue?.id) return;
        loadConfig();
    }, [activeVenue?.id]);

    const loadConfig = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/tip-presets/${activeVenue?.id}`);
            setConfig(res.data?.data || null);
        } catch {
            toast.error('Failed to load tip presets');
        } finally {
            setLoading(false);
        }
    };

    const saveConfig = async () => {
        if (!config) return;
        setSaving(true);
        try {
            const { id: _id, venue_id: _vid, created_at: _ca, ...update } = config;
            await api.put(`/tip-presets/${activeVenue?.id}`, update);
            toast.success('Tip presets saved');
        } catch {
            toast.error('Failed to save');
        } finally {
            setSaving(false);
        }
    };

    const updateField = (field: string, value: unknown) => {
        setConfig(prev => prev ? { ...prev, [field]: value } : prev);
    };

    const updatePercentOption = (index: number, value: string) => {
        const next = [...(config?.percent_options || [])];
        next[index] = parseInt(value) || 0;
        updateField('percent_options', next);
    };

    const updateFixedOption = (index: number, value: number) => {
        const next = [...(config?.fixed_options_cents || [])];
        next[index] = value;
        updateField('fixed_options_cents', next);
    };

    const toggleShowOn = (target: string) => {
        const current = config?.show_on || [];
        if (current.includes(target)) {
            updateField('show_on', current.filter((s: string) => s !== target));
        } else {
            updateField('show_on', [...current, target]);
        }
    };

    if (loading) {
        return (
            <PageContainer title="Tip Presets" description="Loading..." actions={undefined}>
                <div className="flex items-center justify-center min-h-[40vh]">
                    <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                </div>
            </PageContainer>
        );
    }

    const modes = [
        { value: 'percent', label: 'Percentage', icon: Percent, desc: 'Show 10%, 15%, 20%' },
        { value: 'fixed', label: 'Fixed Amount', icon: DollarSign, desc: 'Show €2, €5, €10' },
        { value: 'combo', label: 'Both', icon: Layers, desc: 'Show % and fixed options' },
    ];

    const showOnTargets = [
        { value: 'pos', label: 'POS Terminal', icon: Monitor },
        { value: 'receipt', label: 'Printed Receipt', icon: Receipt },
        { value: 'kiosk', label: 'Self-Service Kiosk', icon: Smartphone },
    ];

    return (
        <PageContainer
            title="Tip Presets"
            description="Configure suggested tip amounts shown at checkout. Customers see these options when paying."
            actions={
                <button
                    onClick={saveConfig}
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-all disabled:opacity-50"
                >
                    <Save className="w-4 h-4" />
                    {saving ? 'Saving...' : 'Save Changes'}
                </button>
            }
        >
            <div className="max-w-3xl space-y-8">
                {/* Enable/Disable Toggle */}
                <div className="flex items-center justify-between p-5 bg-zinc-900/50 border border-white/5 rounded-2xl">
                    <div>
                        <h3 className="text-sm font-bold text-white">Enable Tip Suggestions</h3>
                        <p className="text-xs text-zinc-500 mt-1">Show suggested tip amounts at checkout</p>
                    </div>
                    <button
                        onClick={() => updateField('enabled', !config?.enabled)}
                        className="transition-colors"
                    >
                        {config?.enabled ? (
                            <ToggleRight className="w-10 h-10 text-emerald-500" />
                        ) : (
                            <ToggleLeft className="w-10 h-10 text-zinc-600" />
                        )}
                    </button>
                </div>

                {/* Mode Selection */}
                <div className="space-y-3">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Suggestion Mode</h3>
                    <div className="grid grid-cols-3 gap-3">
                        {modes.map(m => (
                            <button
                                key={m.value}
                                onClick={() => updateField('mode', m.value)}
                                className={cn(
                                    "p-4 rounded-xl border-2 transition-all text-left",
                                    config?.mode === m.value
                                        ? "bg-emerald-600/10 border-emerald-500/40 text-white"
                                        : "bg-zinc-900/50 border-white/5 text-zinc-500 hover:border-white/15"
                                )}
                            >
                                <m.icon className={cn("w-5 h-5 mb-2", config?.mode === m.value ? "text-emerald-400" : "text-zinc-600")} />
                                <p className="text-sm font-bold">{m.label}</p>
                                <p className="text-[10px] text-zinc-500 mt-1">{m.desc}</p>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Percentage Options */}
                {(config?.mode === 'percent' || config?.mode === 'combo') && (
                    <div className="space-y-3">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Percentage Options</h3>
                        <div className="grid grid-cols-3 gap-3">
                            {(config?.percent_options || [10, 15, 20]).map((val, i) => (
                                <div key={i} className="relative">
                                    <input
                                        type="number"
                                        value={val}
                                        onChange={(e) => updatePercentOption(i, e.target.value)}
                                        className="w-full h-12 bg-zinc-900/50 border border-white/10 rounded-xl text-white text-center text-lg font-bold focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                                        aria-label={`Tip percentage option ${i + 1}`}
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 font-bold">%</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Fixed Amount Options */}
                {(config?.mode === 'fixed' || config?.mode === 'combo') && (
                    <div className="space-y-3">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Fixed Amount Options (cents)</h3>
                        <div className="grid grid-cols-3 gap-3">
                            {(config?.fixed_options_cents || [200, 500, 1000]).map((val, i) => (
                                <div key={i} className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 font-bold">€</span>
                                    <input
                                        type="number"
                                        value={(val / 100).toFixed(2)}
                                        onChange={(e) => updateFixedOption(i, Math.round(parseFloat(e.target.value) * 100))}
                                        step="0.50"
                                        className="w-full h-12 bg-zinc-900/50 border border-white/10 rounded-xl text-white text-center text-lg font-bold pl-8 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                                        aria-label={`Fixed tip amount option ${i + 1}`}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Default Selection */}
                <div className="space-y-3">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Default Pre-Selected</h3>
                    <div className="grid grid-cols-3 gap-3">
                        {[0, 1, 2].map(i => (
                            <button
                                key={i}
                                onClick={() => updateField('default_selected', i)}
                                className={cn(
                                    "h-12 rounded-xl border-2 font-bold text-sm transition-all",
                                    config?.default_selected === i
                                        ? "bg-emerald-600/20 border-emerald-500/40 text-emerald-400"
                                        : "bg-zinc-900/50 border-white/5 text-zinc-500 hover:border-white/15"
                                )}
                            >
                                Option {i + 1}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Show Custom Input */}
                <div className="flex items-center justify-between p-5 bg-zinc-900/50 border border-white/5 rounded-2xl">
                    <div>
                        <h3 className="text-sm font-bold text-white">Allow Custom Amount</h3>
                        <p className="text-xs text-zinc-500 mt-1">Let customers enter a custom tip amount</p>
                    </div>
                    <button onClick={() => updateField('show_custom', !config?.show_custom)}>
                        {config?.show_custom ? (
                            <ToggleRight className="w-10 h-10 text-emerald-500" />
                        ) : (
                            <ToggleLeft className="w-10 h-10 text-zinc-600" />
                        )}
                    </button>
                </div>

                {/* Show On Targets */}
                <div className="space-y-3">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Display On</h3>
                    <div className="grid grid-cols-3 gap-3">
                        {showOnTargets.map(t => (
                            <button
                                key={t.value}
                                onClick={() => toggleShowOn(t.value)}
                                className={cn(
                                    "p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2",
                                    (config?.show_on || []).includes(t.value)
                                        ? "bg-emerald-600/10 border-emerald-500/40 text-white"
                                        : "bg-zinc-900/50 border-white/5 text-zinc-500 hover:border-white/15"
                                )}
                            >
                                <t.icon className={cn("w-6 h-6", (config?.show_on || []).includes(t.value) ? "text-emerald-400" : "text-zinc-600")} />
                                <span className="text-xs font-bold">{t.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Preview */}
                <div className="space-y-3">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Preview</h3>
                    <div className="p-6 bg-zinc-950 border border-white/5 rounded-2xl">
                        <p className="text-center text-xs text-zinc-500 mb-4">Would you like to add a tip?</p>
                        <div className="flex items-center justify-center gap-3">
                            {config?.mode !== 'fixed' && (config?.percent_options || []).map((p, i) => (
                                <button
                                    key={i}
                                    className={cn(
                                        "px-5 py-3 rounded-xl font-bold text-sm border-2 transition-all min-w-[72px]",
                                        config?.default_selected === i
                                            ? "bg-emerald-600 border-emerald-500 text-white"
                                            : "bg-zinc-900 border-white/10 text-zinc-400"
                                    )}
                                >
                                    {p}%
                                </button>
                            ))}
                            {config?.mode !== 'percent' && (config?.fixed_options_cents || []).map((c, i) => (
                                <button
                                    key={`f-${i}`}
                                    className={cn(
                                        "px-5 py-3 rounded-xl font-bold text-sm border-2 transition-all min-w-[72px]",
                                        config?.mode === 'fixed' && config?.default_selected === i
                                            ? "bg-emerald-600 border-emerald-500 text-white"
                                            : "bg-zinc-900 border-white/10 text-zinc-400"
                                    )}
                                >
                                    €{(c / 100).toFixed(2)}
                                </button>
                            ))}
                            {config?.show_custom && (
                                <button className="px-5 py-3 rounded-xl font-bold text-sm border-2 border-dashed border-white/10 text-zinc-600">
                                    Custom
                                </button>
                            )}
                        </div>
                        <p className="text-center text-[10px] text-zinc-700 mt-4">
                            Showing on: {(config?.show_on || []).join(', ') || 'None'}
                        </p>
                    </div>
                </div>
            </div>
        </PageContainer>
    );
}
