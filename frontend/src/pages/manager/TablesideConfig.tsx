import React, { useState, useEffect, useCallback } from 'react';
import PageContainer from '../../layouts/PageContainer';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';
import api from '@/lib/api';
import { useVenue } from '@/context/VenueContext';
import {
    Smartphone, Settings, Users, Table2, Plus, Trash2,
    ToggleLeft, ToggleRight, Save, RefreshCw,
    Loader2, Shield, Eye, Zap, CreditCard, ChevronRight,
} from 'lucide-react';

// ── Types ───────────────────────────────────────────────────────
interface TablesideConfigData {
    id: string;
    venue_id: string;
    enabled: boolean;
    require_pin_for_discount: boolean;
    require_pin_for_void: boolean;
    show_item_photos: boolean;
    quick_reorder: boolean;
    tap_to_pay_enabled: boolean;
    [key: string]: unknown;
}

interface Assignment {
    id: string;
    venue_id: string;
    server_id: string;
    server_name: string;
    table_names: string[];
    active: boolean;
    assigned_at: string;
    assigned_by: string;
}

interface MyTable {
    id?: string;
    name: string;
    floor?: string;
    seats?: number;
    status?: string;
}

export default function TablesideConfig() {
    const { activeVenue } = useVenue();
    const venueId = activeVenue?.id;

    const [activeTab, setActiveTab] = useState<'config' | 'assignments' | 'preview'>('config');
    const [config, setConfig] = useState<TablesideConfigData | null>(null);
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [myTables, setMyTables] = useState<MyTable[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // ─── New Assignment Form ───
    const [newServerName, setNewServerName] = useState('');
    const [newTableNames, setNewTableNames] = useState('');

    const loadAll = useCallback(async () => {
        if (!venueId) return;
        setLoading(true);
        try {
            const [configRes, assignRes, tablesRes] = await Promise.all([
                api.get(`/tableside/config/${venueId}`),
                api.get(`/tableside/assignments/${venueId}`),
                api.get(`/tableside/my-tables?venue_id=${venueId}`),
            ]);
            setConfig(configRes.data?.data || null);
            setAssignments(assignRes.data?.data || []);
            setMyTables(tablesRes.data?.tables || []);
        } catch {
            toast.error('Failed to load tableside data');
        } finally {
            setLoading(false);
        }
    }, [venueId]);

    useEffect(() => { loadAll(); }, [loadAll]);

    const saveConfig = async () => {
        if (!config || !venueId) return;
        setSaving(true);
        try {
            await api.put(`/tableside/config/${venueId}`, {
                enabled: config.enabled,
                require_pin_for_discount: config.require_pin_for_discount,
                require_pin_for_void: config.require_pin_for_void,
                show_item_photos: config.show_item_photos,
                quick_reorder: config.quick_reorder,
                tap_to_pay_enabled: config.tap_to_pay_enabled,
            });
            toast.success('Tableside config saved');
        } catch {
            toast.error('Failed to save config');
        } finally {
            setSaving(false);
        }
    };

    const toggleConfig = (field: string) => {
        setConfig(prev => prev ? { ...prev, [field]: !prev[field] } : prev);
    };

    const createAssignment = async () => {
        if (!venueId || !newServerName.trim() || !newTableNames.trim()) {
            toast.error('Enter server name and table names');
            return;
        }
        try {
            const tables = newTableNames.split(',').map(t => t.trim()).filter(Boolean);
            await api.post('/tableside/assignments', {
                venue_id: venueId,
                server_id: newServerName.toLowerCase().replace(/\s+/g, '-'),
                server_name: newServerName,
                table_names: tables,
            });
            toast.success('Assignment created');
            setNewServerName('');
            setNewTableNames('');
            loadAll();
        } catch {
            toast.error('Failed to create assignment');
        }
    };

    const deleteAssignment = async (assignmentId: string) => {
        try {
            await api.delete(`/tableside/assignments/${assignmentId}`);
            toast.success('Assignment removed');
            setAssignments(prev => prev.filter(a => a.id !== assignmentId));
        } catch {
            toast.error('Failed to remove assignment');
        }
    };

    if (loading) {
        return (
            <PageContainer title="Tableside Ordering" description="Loading..." actions={undefined}>
                <div className="flex items-center justify-center min-h-[40vh]">
                    <Loader2 className="w-8 h-8 text-red-600 dark:text-red-400 animate-spin" />
                </div>
            </PageContainer>
        );
    }

    const configFields = [
        { field: 'enabled', label: 'Enable Tableside Ordering', desc: 'Allow servers to take orders at the table via mobile POS', icon: Smartphone },
        { field: 'require_pin_for_discount', label: 'PIN for Discounts', desc: 'Manager PIN required to apply discounts tableside', icon: Shield },
        { field: 'require_pin_for_void', label: 'PIN for Voids', desc: 'Manager PIN required to void items tableside', icon: Shield },
        { field: 'show_item_photos', label: 'Show Item Photos', desc: 'Display product images on the tableside POS', icon: Eye },
        { field: 'quick_reorder', label: 'Quick Reorder', desc: 'Allow servers to quickly re-add previous items', icon: Zap },
        { field: 'tap_to_pay_enabled', label: 'Tap to Pay', desc: 'Enable NFC / contactless payment at the table', icon: CreditCard },
    ];

    const tabs = [
        { id: 'config' as const, label: 'Configuration', icon: Settings },
        { id: 'assignments' as const, label: `Assignments (${assignments.length})`, icon: Users },
        { id: 'preview' as const, label: `My Tables (${myTables.length})`, icon: Table2 },
    ];

    return (
        <PageContainer
            title="Tableside Ordering"
            description="Mobile POS for server-to-table ordering — Lightspeed Parity Phase 3"
            actions={
                <div className="flex gap-3">
                    <button onClick={loadAll} className="p-2 bg-secondary border border-border rounded-xl text-muted-foreground hover:text-foreground transition-colors" title="Refresh">
                        <RefreshCw className="w-4 h-4" />
                    </button>
                    {activeTab === 'config' && (
                        <button onClick={saveConfig} disabled={saving} className="flex items-center gap-2 px-6 py-2.5 bg-red-600 hover:bg-red-500 text-foreground font-bold rounded-xl transition-all disabled:opacity-50">
                            <Save className="w-4 h-4" />
                            {saving ? 'Saving...' : 'Save Config'}
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
                                ? "bg-red-600 text-foreground"
                                : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* ─── Config Tab ─── */}
            {activeTab === 'config' && (
                <div className="max-w-3xl space-y-3">
                    {configFields.map(cfg => (
                        <div key={cfg.field} className="flex items-center justify-between p-5 bg-card/50 border border-border rounded-2xl group hover:border-border transition-all">
                            <div className="flex items-center gap-4">
                                <div className={cn(
                                    "w-10 h-10 rounded-xl flex items-center justify-center",
                                    (config as /**/any)?.[cfg.field]
                                        ? "bg-red-600/15 text-red-400"
                                        : "bg-secondary text-muted-foreground"
                                )}>
                                    <cfg.icon className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-foreground">{cfg.label}</h3>
                                    <p className="text-xs text-muted-foreground mt-0.5">{cfg.desc}</p>
                                </div>
                            </div>
                            <button onClick={() => toggleConfig(cfg.field)} title={`Toggle ${cfg.label}`}>
                                {(config as /**/any)?.[cfg.field]
                                    ? <ToggleRight className="w-10 h-10 text-red-500" />
                                    : <ToggleLeft className="w-10 h-10 text-muted-foreground" />
                                }
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* ─── Assignments Tab ─── */}
            {activeTab === 'assignments' && (
                <div className="space-y-6">
                    {/* Add Assignment */}
                    <div className="p-5 bg-card/50 border border-border rounded-2xl space-y-4">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">New Assignment</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <input aria-label="Input"
                                value={newServerName}
                                onChange={e => setNewServerName(e.target.value)}
                                placeholder="Server Name (e.g. John)"
                                className="h-10 bg-background border border-border rounded-lg text-foreground px-3 text-sm outline-none focus:border-red-500"
                            />
                            <input aria-label="Input"
                                value={newTableNames}
                                onChange={e => setNewTableNames(e.target.value)}
                                placeholder="Tables (comma-separated: T1, T2, T3)"
                                className="h-10 bg-background border border-border rounded-lg text-foreground px-3 text-sm outline-none focus:border-red-500"
                            />
                            <button
                                onClick={createAssignment}
                                className="h-10 bg-red-600 hover:bg-red-500 text-foreground font-bold text-sm rounded-lg transition-all flex items-center justify-center gap-2"
                            >
                                <Plus className="w-4 h-4" />
                                Assign
                            </button>
                        </div>
                    </div>

                    {/* Existing Assignments */}
                    {assignments.length === 0 ? (
                        <div className="p-12 bg-card/30 border border-dashed border-border rounded-2xl text-center">
                            <Users className="w-12 h-12 text-foreground mx-auto mb-3" />
                            <p className="text-sm text-muted-foreground">{"No "}server assignments yet</p>
                            <p className="text-xs text-muted-foreground mt-1">Assign tables to servers for tableside ordering</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Active Assignments</h3>
                            {assignments.map(a => (
                                <div key={a.id} className="flex items-center justify-between p-4 bg-card/50 border border-border rounded-xl group hover:border-border transition-all">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-red-600/15 flex items-center justify-center">
                                            <Users className="w-5 h-5 text-red-400" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-foreground">{a.server_name}</p>
                                            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                                {a.table_names.map(t => (
                                                    <span key={t} className="px-2 py-0.5 bg-secondary text-muted-foreground text-[10px] font-bold rounded-md border border-border">
                                                        {t}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-[10px] text-muted-foreground">
                                            {new Date(a.assigned_at).toLocaleDateString()}
                                        </span>
                                        <button
                                            onClick={() => deleteAssignment(a.id)}
                                            className="p-2 text-muted-foreground hover:text-red-400 hover:bg-red-600/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                            title="Remove assignment"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ─── My Tables Preview Tab ─── */}
            {activeTab === 'preview' && (
                <div className="space-y-6">
                    <div className="p-5 bg-card/50 border border-border rounded-2xl">
                        <div className="flex items-center gap-3 mb-4">
                            <Smartphone className="w-5 h-5 text-red-400" />
                            <div>
                                <h3 className="text-sm font-bold text-foreground">Mobile POS Preview</h3>
                                <p className="text-[10px] text-muted-foreground">Tables assigned to your server account</p>
                            </div>
                        </div>
                        {myTables.length === 0 ? (
                            <div className="p-8 bg-background/50 border border-dashed border-border rounded-xl text-center">
                                <Table2 className="w-8 h-8 text-foreground mx-auto mb-2" />
                                <p className="text-xs text-muted-foreground">{"No "}tables assigned to you</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {myTables.map((table, i) => (
                                    <button
                                        key={table.name || i}
                                        className="p-4 bg-background/50 border border-border rounded-xl text-center hover:border-red-500/30 hover:bg-red-600/5 transition-all group"
                                    >
                                        <Table2 className="w-6 h-6 text-muted-foreground mx-auto mb-2 group-hover:text-red-400 transition-colors" />
                                        <p className="text-sm font-bold text-foreground">{table.name}</p>
                                        {table.floor && (
                                            <p className="text-[10px] text-muted-foreground mt-0.5">{table.floor}</p>
                                        )}
                                        {table.seats && (
                                            <p className="text-[10px] text-muted-foreground">{table.seats} seats</p>
                                        )}
                                        <div className="mt-2 flex items-center justify-center gap-1 text-[9px] text-red-400 font-bold uppercase opacity-0 group-hover:opacity-100 transition-opacity">
                                            Open <ChevronRight className="w-3 h-3" />
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </PageContainer>
    );
}
