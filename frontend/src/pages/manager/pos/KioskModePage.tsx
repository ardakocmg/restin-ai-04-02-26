import React, { useState } from 'react';
import {
    Monitor, TabletSmartphone, Settings, Eye, Palette,
    Layout, Type, Image, ShoppingCart, CreditCard,
    ToggleLeft, ToggleRight, Loader2, Save, RotateCcw
} from 'lucide-react';
import { Card } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { cn } from '../../../lib/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useVenue } from '../../../context/VenueContext';
import { toast } from 'sonner';
import api from '../../../lib/api';

/**
 * 🖥️ Kiosk Mode — Rule 47 (Pillar 8: Fintech)
 * Toggle POS into a self-service guest-facing kiosk mode.
 */
export default function KioskModePage() {
    const { activeVenue } = useVenue();
    const venueId = activeVenue?.id || localStorage.getItem('currentVenueId') || 'default';
    const queryClient = useQueryClient();

    const [config, setConfig] = useState({
        enabled: false,
        display_mode: 'fullscreen',
        show_prices: true,
        show_images: true,
        show_descriptions: true,
        allow_customization: true,
        payment_methods: ['card', 'cash'],
        idle_timeout: 60,
        welcome_message: 'Welcome! Tap to order.',
        language: 'en',
        theme: 'dark',
        font_size: 'large',
    });

    const update = (field, value) => {
        setConfig(prev => ({ ...prev, [field]: value }));
    };

    const togglePayment = (method) => {
        update('payment_methods', config.payment_methods.includes(method)
            ? config.payment_methods.filter(m => m !== method)
            : [...config.payment_methods, method]
        );
    };

    const saveMutation = useMutation({
        mutationFn: () => api.post(`/venue-config/kiosk?venue_id=${venueId}`, config),
        onSuccess: () => toast.success('Kiosk configuration saved'),
        onError: () => toast.error('Failed to save kiosk config')
    });

    const PAYMENT_OPTIONS = [
        { key: 'card', label: 'Card', icon: CreditCard },
        { key: 'cash', label: 'Cash', icon: ShoppingCart },
        { key: 'mobile', label: 'Mobile Pay', icon: TabletSmartphone },
    ];

    const DISPLAY_MODES = [
        { key: 'fullscreen', label: 'Full Screen', desc: 'Takes over the entire display' },
        { key: 'embedded', label: 'Embedded', desc: 'Runs inside POS with toggle' },
    ];

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                        <Monitor className="w-6 h-6 text-cyan-500" />
                        Kiosk Mode
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Turn any POS terminal into a self-service ordering kiosk
                    </p>
                </div>
                <Button
                    onClick={() => saveMutation.mutate()}
                    disabled={saveMutation.isPending}
                    className="bg-cyan-600 hover:bg-cyan-700 text-foreground"
                >
                    {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
                    Save Config
                </Button>
            </div>

            {/* Master Toggle */}
            <Card className={cn(
                "p-6 border-2 transition-all",
                config.enabled ? "border-cyan-500 bg-cyan-500/5" : "border-border bg-card"
            )}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className={cn(
                            "p-3 rounded-xl",
                            config.enabled ? "bg-cyan-500/10" : "bg-muted"
                        )}>
                            <Monitor className={cn("w-8 h-8", config.enabled ? "text-cyan-500" : "text-muted-foreground")} />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-foreground">
                                Kiosk Mode is {config.enabled ? 'Active' : 'Inactive'}
                            </h2>
                            <p className="text-sm text-muted-foreground">
                                {config.enabled
                                    ? 'Guests can order directly from the terminal'
                                    : 'Enable to allow self-service ordering'}
                            </p>
                        </div>
                    </div>
                    <button onClick={() => update('enabled', !config.enabled)}>
                        {config.enabled ? (
                            <ToggleRight className="w-12 h-12 text-cyan-500" />
                        ) : (
                            <ToggleLeft className="w-12 h-12 text-muted-foreground" />
                        )}
                    </button>
                </div>
            </Card>

            <div className="grid grid-cols-2 gap-6">
                {/* Display Settings */}
                <Card className="p-5 bg-card border-border space-y-4">
                    <h3 className="font-semibold text-foreground flex items-center gap-2">
                        <Layout className="w-4 h-4 text-cyan-500" /> Display
                    </h3>

                    <div className="space-y-3">
                        <div>
                            <label className="text-sm text-muted-foreground mb-2 block">Mode</label>
                            <div className="grid grid-cols-2 gap-2">
                                {DISPLAY_MODES.map(mode => (
                                    <Card
                                        key={mode.key}
                                        onClick={() => update('display_mode', mode.key)}
                                        className={cn(
                                            "p-3 cursor-pointer border-2 transition-all",
                                            config.display_mode === mode.key
                                                ? "border-cyan-500 bg-cyan-500/5"
                                                : "border-border hover:border-muted-foreground/30"
                                        )}
                                    >
                                        <div className="text-sm font-medium text-foreground">{mode.label}</div>
                                        <div className="text-[10px] text-muted-foreground">{mode.desc}</div>
                                    </Card>
                                ))}
                            </div>
                        </div>

                        {[
                            { key: 'show_prices', label: 'Show Prices', icon: Eye },
                            { key: 'show_images', label: 'Show Images', icon: Image },
                            { key: 'show_descriptions', label: 'Show Descriptions', icon: Type },
                            { key: 'allow_customization', label: 'Allow Item Customization', icon: Settings },
                        ].map(toggle => {
                            const Icon = toggle.icon;
                            return (
                                <div key={toggle.key} className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Icon className="w-4 h-4 text-muted-foreground" />
                                        <span className="text-sm text-foreground">{toggle.label}</span>
                                    </div>
                                    <button onClick={() => update(toggle.key, !config[toggle.key])}>
                                        {config[toggle.key] ? (
                                            <ToggleRight className="w-8 h-8 text-cyan-500" />
                                        ) : (
                                            <ToggleLeft className="w-8 h-8 text-muted-foreground" />
                                        )}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </Card>

                {/* Payment & Behavior */}
                <Card className="p-5 bg-card border-border space-y-4">
                    <h3 className="font-semibold text-foreground flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-cyan-500" /> Payment & Behavior
                    </h3>

                    <div>
                        <label className="text-sm text-muted-foreground mb-2 block">Accepted Payments</label>
                        <div className="grid grid-cols-3 gap-2">
                            {PAYMENT_OPTIONS.map(opt => {
                                const Icon = opt.icon;
                                return (
                                    <Card
                                        key={opt.key}
                                        onClick={() => togglePayment(opt.key)}
                                        className={cn(
                                            "p-3 cursor-pointer border-2 transition-all text-center",
                                            config.payment_methods.includes(opt.key)
                                                ? "border-cyan-500 bg-cyan-500/5"
                                                : "border-border hover:border-muted-foreground/30"
                                        )}
                                    >
                                        <Icon className={cn("w-5 h-5 mx-auto mb-1", config.payment_methods.includes(opt.key) ? "text-cyan-500" : "text-muted-foreground")} />
                                        <div className="text-xs text-foreground">{opt.label}</div>
                                    </Card>
                                );
                            })}
                        </div>
                    </div>

                    <div>
                        <label className="text-sm text-muted-foreground mb-1 block">Welcome Message</label>
                        <Input aria-label="Input field"
                            value={config.welcome_message}
                            onChange={(e) => update('welcome_message', e.target.value)}
                            className="bg-background border-border text-foreground"
                        />
                    </div>

                    <div>
                        <label className="text-sm text-muted-foreground mb-1 block">Idle Timeout (seconds)</label>
                        <Input aria-label="Input field"
                            type="number"
                            value={config.idle_timeout}
                            onChange={(e) => update('idle_timeout', parseInt(e.target.value) || 30)}
                            className="bg-background border-border text-foreground"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-sm text-muted-foreground mb-1 block">Theme</label>
                            <div className="flex gap-2">
                                {['dark', 'light'].map(t => (
                                    <button
                                        key={t}
                                        onClick={() => update('theme', t)}
                                        className={cn(
                                            "px-3 py-1.5 rounded text-sm capitalize border transition-all",
                                            config.theme === t
                                                ? "border-cyan-500 text-cyan-600 dark:text-cyan-400 bg-cyan-500/5"
                                                : "border-border text-muted-foreground"
                                        )}
                                    >
                                        {t}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="text-sm text-muted-foreground mb-1 block">Font Size</label>
                            <div className="flex gap-2">
                                {['medium', 'large', 'xl'].map(s => (
                                    <button
                                        key={s}
                                        onClick={() => update('font_size', s)}
                                        className={cn(
                                            "px-3 py-1.5 rounded text-sm uppercase border transition-all",
                                            config.font_size === s
                                                ? "border-cyan-500 text-cyan-600 dark:text-cyan-400 bg-cyan-500/5"
                                                : "border-border text-muted-foreground"
                                        )}
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Preview */}
            <Card className="p-6 bg-card border-border">
                <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                    <Eye className="w-4 h-4 text-cyan-500" /> Preview
                </h3>
                <div className={cn(
                    "rounded-xl p-8 text-center border-2 border-dashed border-border",
                    config.theme === 'dark' ? "bg-card" : "bg-zinc-100"
                )}>
                    <Monitor className={cn("w-16 h-16 mx-auto mb-4", config.theme === 'dark' ? "text-muted-foreground" : "text-muted-foreground")} />
                    <p className={cn(
                        "text-lg",
                        config.font_size === 'xl' ? 'text-2xl' : config.font_size === 'large' ? 'text-xl' : 'text-lg',
                        config.theme === 'dark' ? "text-secondary-foreground" : "text-zinc-700"
                    )}>
                        {config.welcome_message}
                    </p>
                    <p className={cn(
                        "text-sm mt-2",
                        config.theme === 'dark' ? "text-muted-foreground" : "text-muted-foreground"
                    )}>
                        {config.enabled ? '✅ Kiosk Active' : '⬜ Kiosk Inactive'} • Timeout: {config.idle_timeout}s
                    </p>
                </div>
            </Card>
        </div>
    );
}
