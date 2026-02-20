// @ts-nocheck
import React, { useState, useEffect, useCallback } from 'react';
import PageContainer from '../../layouts/PageContainer';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';
import api from '@/lib/api';
import { useVenue } from '@/context/VenueContext';
import {
    QrCode, Globe, Settings, ShoppingBag, Clock, DollarSign,
    ToggleLeft, ToggleRight, Save, Copy, ExternalLink,
    TrendingUp, Package, AlertCircle, CheckCircle2, XCircle,
    Loader2, RefreshCw, Eye, ChefHat
} from 'lucide-react';

interface OrderAnywhereConfig {
    id: string;
    venue_id: string;
    enabled: boolean;
    allow_dine_in: boolean;
    allow_takeaway: boolean;
    allow_delivery: boolean;
    require_table_number: boolean;
    accept_tips: boolean;
    tip_presets_percent: number[];
    auto_accept_orders: boolean;
    estimated_prep_minutes: number;
    min_order_cents: number;
    max_order_cents: number;
    operating_hours: Record<string, { open: string; close: string }>;
    custom_welcome_message: string;
    custom_theme: { primary_color: string; bg_color: string; font: string };
    [key: string]: unknown;
}

interface Order {
    id: string;
    venue_id: string;
    order_type: string;
    table_name: string;
    guest_name: string;
    items: Array<{ name: string; quantity: number; line_total_cents: number }>;
    subtotal_cents: number;
    tip_cents: number;
    total_cents: number;
    status: string;
    created_at: string;
    kds_sent?: boolean;
}

interface Stats {
    total_orders: number;
    pending: number;
    completed: number;
    cancelled: number;
    revenue_cents: number;
    tips_cents: number;
}

export default function OrderAnywhereDashboard() {
    const { activeVenue } = useVenue();
    const [activeTab, setActiveTab] = useState<'overview' | 'orders' | 'settings'>('overview');
    const [config, setConfig] = useState<OrderAnywhereConfig | null>(null);
    const [orders, setOrders] = useState<Order[]>([]);
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const venueId = activeVenue?.id;

    const loadAll = useCallback(async () => {
        if (!venueId) return;
        setLoading(true);
        try {
            const [configRes, ordersRes, statsRes] = await Promise.all([
                api.get(`/order-anywhere/config/${venueId}`),
                api.get(`/order-anywhere/orders/${venueId}`),
                api.get(`/order-anywhere/stats/${venueId}`),
            ]);
            setConfig(configRes.data?.data || null);
            setOrders(ordersRes.data?.data || []);
            setStats(statsRes.data?.data || null);
        } catch {
            toast.error('Failed to load Order Anywhere data');
        } finally {
            setLoading(false);
        }
    }, [venueId]);

    useEffect(() => { loadAll(); }, [loadAll]);

    const saveConfig = async () => {
        if (!config || !venueId) return;
        setSaving(true);
        try {
            const { id: _id, venue_id: _vid, created_at: _ca, ...update } = config;
            await api.put(`/order-anywhere/config/${venueId}`, update);
            toast.success('Settings saved');
        } catch {
            toast.error('Failed to save');
        } finally {
            setSaving(false);
        }
    };

    const updateConfig = (field: string, value: unknown) => {
        setConfig(prev => prev ? { ...prev, [field]: value } : prev);
    };

    const updateOrderStatus = async (orderId: string, status: string) => {
        try {
            const res = await api.put(`/order-anywhere/orders/${orderId}/status`, { status });
            const kdsSent = res.data?.kds_tickets?.length > 0;
            setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status, kds_sent: kdsSent || o.kds_sent } : o));
            toast.success(`Order ${status}${kdsSent ? ' — Sent to Kitchen' : ''}`);
        } catch {
            toast.error('Failed to update');
        }
    };

    const copyQrLink = () => {
        const url = `${window.location.origin}/order/${venueId}`;
        navigator.clipboard.writeText(url);
        toast.success('Link copied!');
    };

    if (loading) {
        return (
            <PageContainer title="Order Anywhere" description="Loading..." actions={undefined}>
                <div className="flex items-center justify-center min-h-[40vh]">
                    <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
                </div>
            </PageContainer>
        );
    }

    const statusColors: Record<string, string> = {
        pending: 'bg-amber-600/20 text-amber-400 border-amber-500/30',
        accepted: 'bg-blue-600/20 text-blue-400 border-blue-500/30',
        preparing: 'bg-purple-600/20 text-purple-400 border-purple-500/30',
        ready: 'bg-emerald-600/20 text-emerald-400 border-emerald-500/30',
        completed: 'bg-zinc-700/20 text-muted-foreground border-zinc-600/30',
        cancelled: 'bg-red-600/20 text-red-400 border-red-500/30',
    };

    const tabs = [
        { id: 'overview' as const, label: 'Overview', icon: TrendingUp },
        { id: 'orders' as const, label: `Orders (${orders.length})`, icon: ShoppingBag },
        { id: 'settings' as const, label: 'Settings', icon: Settings },
    ];

    return (
        <PageContainer
            title="Order Anywhere"
            description="QR-based & online ordering for dine-in and takeaway."
            actions={
                <div className="flex gap-3">
                    <button onClick={loadAll} className="p-2 bg-secondary border border-border rounded-xl text-muted-foreground hover:text-foreground transition-colors" title="Refresh">
                        <RefreshCw className="w-4 h-4" />
                    </button>
                    <button onClick={copyQrLink} className="flex items-center gap-2 px-4 py-2 bg-secondary border border-border rounded-xl text-secondary-foreground hover:text-foreground text-sm font-bold transition-colors">
                        <Copy className="w-4 h-4" />
                        Copy Link
                    </button>
                    {activeTab === 'settings' && (
                        <button onClick={saveConfig} disabled={saving} className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-foreground font-bold rounded-xl transition-all disabled:opacity-50">
                            <Save className="w-4 h-4" />
                            {saving ? 'Saving...' : 'Save'}
                        </button>
                    )}
                </div>
            }
        >
            {/* Tabs */}
            <div className="flex items-center gap-1 mb-6 bg-card p-1 rounded-xl border border-border w-fit">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all",
                            activeTab === tab.id
                                ? "bg-emerald-600 text-foreground"
                                : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Overview Tab */}
            {activeTab === 'overview' && (
                <div className="space-y-6">
                    {/* Status Banner */}
                    <div className={cn(
                        "p-5 rounded-2xl border-2 flex items-center justify-between",
                        config?.enabled
                            ? "bg-emerald-600/10 border-emerald-500/30"
                            : "bg-card/50 border-border"
                    )}>
                        <div className="flex items-center gap-3">
                            <Globe className={cn("w-6 h-6", config?.enabled ? "text-emerald-400" : "text-muted-foreground")} />
                            <div>
                                <h3 className="text-sm font-bold text-foreground">
                                    {config?.enabled ? 'Online Ordering Active' : 'Online Ordering Disabled'}
                                </h3>
                                <p className="text-xs text-muted-foreground">
                                    {config?.enabled ? 'Guests can order via QR code or link' : 'Enable in Settings to start accepting orders'}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => { updateConfig('enabled', !config?.enabled); saveConfig(); }}
                            className="transition-colors"
                        >
                            {config?.enabled ? (
                                <ToggleRight className="w-10 h-10 text-emerald-500" />
                            ) : (
                                <ToggleLeft className="w-10 h-10 text-muted-foreground" />
                            )}
                        </button>
                    </div>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {[
                            { label: 'Total Orders', value: stats?.total_orders || 0, icon: Package, color: 'text-blue-400' },
                            { label: 'Pending', value: stats?.pending || 0, icon: AlertCircle, color: 'text-amber-400' },
                            { label: 'Completed', value: stats?.completed || 0, icon: CheckCircle2, color: 'text-emerald-400' },
                            { label: 'Revenue', value: `€${((stats?.revenue_cents || 0) / 100).toFixed(2)}`, icon: DollarSign, color: 'text-emerald-400' },
                        ].map((card, i) => (
                            <div key={i} className="p-4 bg-card/50 border border-border rounded-2xl">
                                <div className="flex items-center gap-2 mb-2">
                                    <card.icon className={cn("w-4 h-4", card.color)} />
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">{card.label}</span>
                                </div>
                                <p className="text-2xl font-black text-foreground">{card.value}</p>
                            </div>
                        ))}
                    </div>

                    {/* QR Preview */}
                    <div className="p-6 bg-card/50 border border-border rounded-2xl">
                        <div className="flex items-center gap-3 mb-4">
                            <QrCode className="w-5 h-5 text-emerald-400" />
                            <h3 className="text-sm font-bold text-foreground">QR Code Link</h3>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-background rounded-xl border border-border">
                            <code className="flex-1 text-xs text-muted-foreground font-mono truncate">
                                {window.location.origin}/order/{venueId}
                            </code>
                            <button onClick={copyQrLink} className="px-3 py-1.5 bg-secondary text-xs font-bold text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors">
                                Copy
                            </button>
                            <a href={`/order/${venueId}`} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 bg-secondary text-xs font-bold text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors flex items-center gap-1">
                                <ExternalLink className="w-3 h-3" />
                                Preview
                            </a>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-2">Print this QR code on table tents, receipts, or signage.</p>
                    </div>

                    {/* Recent Orders */}
                    {orders.length > 0 && (
                        <div className="space-y-3">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Recent Orders</h3>
                            {orders.slice(0, 5).map(order => (
                                <div key={order.id} className="p-4 bg-card/50 border border-border rounded-xl flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-bold text-foreground">{order.id}</p>
                                        <p className="text-[10px] text-muted-foreground">
                                            {order.items.length} item{order.items.length !== 1 ? 's' : ''} · €{(order.total_cents / 100).toFixed(2)} · {order.table_name ? `Table ${order.table_name}` : order.order_type}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={cn("px-3 py-1 rounded-full text-[10px] font-bold uppercase border", statusColors[order.status] || 'bg-secondary text-muted-foreground')}>
                                            {order.status}
                                        </span>
                                        {order.kds_sent && (
                                            <span className="flex items-center gap-1 px-2 py-1 rounded-full text-[9px] font-bold uppercase bg-orange-600/15 text-orange-400 border border-orange-500/20">
                                                <ChefHat className="w-3 h-3" /> KDS
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Orders Tab */}
            {activeTab === 'orders' && (
                <div className="space-y-3">
                    {orders.length === 0 ? (
                        <div className="p-12 bg-card/30 border border-dashed border-border rounded-2xl text-center">
                            <ShoppingBag className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
                            <p className="text-sm text-muted-foreground">No orders yet</p>
                            <p className="text-xs text-muted-foreground mt-1">Orders will appear here when guests order via QR</p>
                        </div>
                    ) : (
                        orders.map(order => (
                            <div key={order.id} className="p-5 bg-card/50 border border-border rounded-2xl space-y-3">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="flex items-center gap-3">
                                            <h4 className="text-sm font-bold text-foreground">{order.id}</h4>
                                            <span className={cn("px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border", statusColors[order.status])}>
                                                {order.status}
                                            </span>
                                            {order.kds_sent && (
                                                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-orange-600/15 text-orange-400 border border-orange-500/20">
                                                    <ChefHat className="w-3 h-3" /> Sent to Kitchen
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-[10px] text-muted-foreground mt-1">
                                            {order.guest_name || 'Guest'} · {order.order_type} · {order.table_name ? `Table ${order.table_name}` : ''}
                                            {' · '}{new Date(order.created_at).toLocaleTimeString()}
                                        </p>
                                    </div>
                                    <p className="text-lg font-bold text-foreground">€{(order.total_cents / 100).toFixed(2)}</p>
                                </div>
                                {/* Items */}
                                <div className="space-y-1 pl-2 border-l-2 border-border">
                                    {order.items.map((item, i) => (
                                        <div key={i} className="flex items-center justify-between text-xs">
                                            <span className="text-muted-foreground">{item.quantity}× {item.name}</span>
                                            <span className="text-muted-foreground">€{(item.line_total_cents / 100).toFixed(2)}</span>
                                        </div>
                                    ))}
                                </div>
                                {/* Actions */}
                                {order.status === 'pending' && (
                                    <div className="flex gap-2 pt-2">
                                        <button onClick={() => updateOrderStatus(order.id, 'accepted')} className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-foreground font-bold text-xs rounded-xl transition-all">
                                            Accept
                                        </button>
                                        <button onClick={() => updateOrderStatus(order.id, 'cancelled')} className="py-2 px-4 bg-red-600/20 hover:bg-red-600/30 text-red-400 font-bold text-xs rounded-xl transition-all border border-red-500/20">
                                            Decline
                                        </button>
                                    </div>
                                )}
                                {order.status === 'accepted' && (
                                    <button onClick={() => updateOrderStatus(order.id, 'preparing')} className="w-full py-2 bg-purple-600 hover:bg-purple-500 text-foreground font-bold text-xs rounded-xl transition-all">
                                        Start Preparing
                                    </button>
                                )}
                                {order.status === 'preparing' && (
                                    <button onClick={() => updateOrderStatus(order.id, 'ready')} className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-foreground font-bold text-xs rounded-xl transition-all">
                                        Mark Ready
                                    </button>
                                )}
                                {order.status === 'ready' && (
                                    <button onClick={() => updateOrderStatus(order.id, 'completed')} className="w-full py-2 bg-zinc-700 hover:bg-zinc-600 text-foreground font-bold text-xs rounded-xl transition-all">
                                        Complete
                                    </button>
                                )}
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Settings Tab */}
            {activeTab === 'settings' && config && (
                <div className="max-w-3xl space-y-6">
                    {/* Enable */}
                    <div className="flex items-center justify-between p-5 bg-card/50 border border-border rounded-2xl">
                        <div>
                            <h3 className="text-sm font-bold text-foreground">Enable Online Ordering</h3>
                            <p className="text-xs text-muted-foreground mt-1">Allow guests to place orders via QR code link</p>
                        </div>
                        <button onClick={() => updateConfig('enabled', !config.enabled)} title="Toggle online ordering">
                            {config.enabled ? <ToggleRight className="w-10 h-10 text-emerald-500" /> : <ToggleLeft className="w-10 h-10 text-muted-foreground" />}
                        </button>
                    </div>

                    {/* Order Types */}
                    <div className="space-y-3">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Order Types</h3>
                        <div className="grid grid-cols-3 gap-3">
                            {[
                                { field: 'allow_dine_in', label: 'Dine-In', desc: 'Order from the table' },
                                { field: 'allow_takeaway', label: 'Takeaway', desc: 'Order for pickup' },
                                { field: 'allow_delivery', label: 'Delivery', desc: 'Order for delivery' },
                            ].map(type => (
                                <button
                                    key={type.field}
                                    onClick={() => updateConfig(type.field, !(config as Record<string, unknown>)[type.field])}
                                    className={cn(
                                        "p-4 rounded-xl border-2 text-left transition-all",
                                        (config as Record<string, unknown>)[type.field]
                                            ? "bg-emerald-600/10 border-emerald-500/40"
                                            : "bg-card/50 border-border hover:border-white/15"
                                    )}
                                >
                                    <p className="text-sm font-bold text-foreground">{type.label}</p>
                                    <p className="text-[10px] text-muted-foreground mt-1">{type.desc}</p>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Options */}
                    <div className="space-y-3">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Options</h3>
                        <div className="space-y-3">
                            {[
                                { field: 'require_table_number', label: 'Require Table Number', desc: 'Guests must enter table for dine-in' },
                                { field: 'accept_tips', label: 'Accept Tips', desc: 'Show tip options at checkout' },
                                { field: 'auto_accept_orders', label: 'Auto-Accept Orders', desc: 'Automatically accept without manual review' },
                            ].map(opt => (
                                <div key={opt.field} className="flex items-center justify-between p-4 bg-card/50 border border-border rounded-xl">
                                    <div>
                                        <p className="text-sm font-bold text-foreground">{opt.label}</p>
                                        <p className="text-[10px] text-muted-foreground">{opt.desc}</p>
                                    </div>
                                    <button onClick={() => updateConfig(opt.field, !(config as Record<string, unknown>)[opt.field])} title={`Toggle ${opt.label}`}>
                                        {(config as Record<string, unknown>)[opt.field]
                                            ? <ToggleRight className="w-8 h-8 text-emerald-500" />
                                            : <ToggleLeft className="w-8 h-8 text-muted-foreground" />
                                        }
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Prep Time & Min Order */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-card/50 border border-border rounded-xl">
                            <label className="text-[9px] font-black uppercase text-muted-foreground block mb-2">
                                <Clock className="w-3 h-3 inline mr-1" />
                                Est. Prep Time (min)
                            </label>
                            <input
                                type="number"
                                value={config.estimated_prep_minutes}
                                onChange={(e) => updateConfig('estimated_prep_minutes', parseInt(e.target.value) || 0)}
                                title="Estimated prep time in minutes"
                                className="w-full h-10 bg-background border border-border rounded-lg text-foreground font-bold text-center outline-none focus:border-emerald-500"
                            />
                        </div>
                        <div className="p-4 bg-card/50 border border-border rounded-xl">
                            <label className="text-[9px] font-black uppercase text-muted-foreground block mb-2">
                                <DollarSign className="w-3 h-3 inline mr-1" />
                                Min Order (€)
                            </label>
                            <input
                                type="number"
                                value={(config.min_order_cents / 100).toFixed(2)}
                                onChange={(e) => updateConfig('min_order_cents', Math.round(parseFloat(e.target.value) * 100) || 0)}
                                step="0.50"
                                title="Minimum order amount"
                                className="w-full h-10 bg-background border border-border rounded-lg text-foreground font-bold text-center outline-none focus:border-emerald-500"
                            />
                        </div>
                    </div>

                    {/* Welcome Message */}
                    <div className="p-4 bg-card/50 border border-border rounded-xl">
                        <label className="text-[9px] font-black uppercase text-muted-foreground block mb-2">Welcome Message</label>
                        <input
                            value={config.custom_welcome_message}
                            onChange={(e) => updateConfig('custom_welcome_message', e.target.value)}
                            placeholder="Welcome! Scan to order."
                            className="w-full h-10 bg-background border border-border rounded-lg text-foreground px-3 outline-none focus:border-emerald-500 text-sm"
                        />
                    </div>
                </div>
            )}
        </PageContainer>
    );
}
