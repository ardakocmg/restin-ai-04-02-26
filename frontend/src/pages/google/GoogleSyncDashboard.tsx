// @ts-nocheck
/**
 * GoogleSyncDashboard — Organization-wide Google Sync Status & Management
 * @route /manager/google-sync
 * Shows sync activity across all venues/personnel, sync health, logs, config.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { logger } from '@/lib/logger';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
    RefreshCw, Activity, Calendar, HardDrive, Mail, Table,
    CheckCircle2, XCircle, AlertTriangle, Clock, Users,
    ChevronRight, Zap, ArrowUpDown, Filter, Search,
    ToggleLeft, ToggleRight, Download, Upload
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────

interface SyncLog {
    id: string;
    user_id: string;
    user_name: string;
    venue_id: string;
    venue_name: string;
    sync_type: string;
    service: string;
    direction: 'push' | 'pull';
    status: 'success' | 'failed' | 'pending';
    details: string;
    created_at: string;
}

interface SyncStats {
    total_syncs: number;
    successful: number;
    failed: number;
    pending: number;
    connected_users: number;
    total_users: number;
    active_services: Record<string, number>;
    last_sync: string;
}

interface VenueSyncStatus {
    venue_id: string;
    venue_name: string;
    connected_employees: number;
    total_employees: number;
    last_sync: string;
    sync_health: 'healthy' | 'degraded' | 'offline';
    enabled_syncs: string[];
}

interface PersonnelSync {
    user_id: string;
    user_name: string;
    email: string;
    google_connected: boolean;
    google_email: string;
    venue_name: string;
    sync_config: {
        calendar_shift_sync: boolean;
        calendar_leave_sync: boolean;
        drive_payroll_auto_export: boolean;
        sheets_auto_export: boolean;
    };
    last_sync: string;
}

type TabKey = 'overview' | 'venues' | 'personnel' | 'logs';

// ── Component ──────────────────────────────────────────────────────────

export default function GoogleSyncDashboard(): React.ReactElement {
    const [activeTab, setActiveTab] = useState<TabKey>('overview');
    const [loading, setLoading] = useState(false);
    const [stats, setStats] = useState<SyncStats | null>(null);
    const [venues, setVenues] = useState<VenueSyncStatus[]>([]);
    const [personnel, setPersonnel] = useState<PersonnelSync[]>([]);
    const [logs, setLogs] = useState<SyncLog[]>([]);
    const [searchQuery, setSearchQuery] = useState('');

    const fetchDashboard = useCallback(async () => {
        setLoading(true);
        try {
            const [statsRes, venuesRes, personnelRes, logsRes] = await Promise.allSettled([
                api.get('/google/sync/dashboard/stats'),
                api.get('/google/sync/dashboard/venues'),
                api.get('/google/sync/dashboard/personnel'),
                api.get('/google/sync/dashboard/logs'),
            ]);

            if (statsRes.status === 'fulfilled' && statsRes.value.data?.ok)
                setStats(statsRes.value.data.stats);
            if (venuesRes.status === 'fulfilled' && venuesRes.value.data?.ok)
                setVenues(venuesRes.value.data.venues || []);
            if (personnelRes.status === 'fulfilled' && personnelRes.value.data?.ok)
                setPersonnel(personnelRes.value.data.personnel || []);
            if (logsRes.status === 'fulfilled' && logsRes.value.data?.ok)
                setLogs(logsRes.value.data.logs || []);
        } catch {
            logger.error('Failed to fetch sync dashboard');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchDashboard();
    }, [fetchDashboard]);

    const handleForceSync = async () => {
        try {
            await api.post('/google/sync/force-all');
            toast.success('Force sync triggered for all users');
            fetchDashboard();
        } catch {
            toast.error('Failed to trigger sync');
        }
    };

    const formatRelative = (iso: string): string => {
        if (!iso) return 'Never';
        try {
            const diff = Date.now() - new Date(iso).getTime();
            const mins = Math.floor(diff / 60000);
            if (mins < 1) return 'Just now';
            if (mins < 60) return `${mins}m ago`;
            const hrs = Math.floor(mins / 60);
            if (hrs < 24) return `${hrs}h ago`;
            return `${Math.floor(hrs / 24)}d ago`;
        } catch { return ''; }
    };

    const serviceIcon = (service: string) => {
        switch (service) {
            case 'calendar': return <Calendar className="h-3.5 w-3.5 text-blue-400" />;
            case 'drive': return <HardDrive className="h-3.5 w-3.5 text-green-400" />;
            case 'gmail': return <Mail className="h-3.5 w-3.5 text-red-400" />;
            case 'sheets': return <Table className="h-3.5 w-3.5 text-green-400" />;
            default: return <Zap className="h-3.5 w-3.5 text-muted-foreground" />;
        }
    };

    const healthColor = (health: string) => {
        switch (health) {
            case 'healthy': return 'text-green-400 bg-green-500/10';
            case 'degraded': return 'text-amber-400 bg-amber-500/10';
            case 'offline': return 'text-red-400 bg-red-500/10';
            default: return 'text-muted-foreground bg-zinc-500/10';
        }
    };

    const healthIcon = (health: string) => {
        switch (health) {
            case 'healthy': return <CheckCircle2 className="h-4 w-4 text-green-400" />;
            case 'degraded': return <AlertTriangle className="h-4 w-4 text-amber-400" />;
            case 'offline': return <XCircle className="h-4 w-4 text-red-400" />;
            default: return <Clock className="h-4 w-4 text-muted-foreground" />;
        }
    };

    const filteredPersonnel = personnel.filter(p =>
        p.user_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.venue_name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredLogs = logs.filter(l =>
        l.user_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.venue_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.service.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const TABS: { key: TabKey; label: string; icon: React.ElementType }[] = [
        { key: 'overview', label: 'Overview', icon: Activity },
        { key: 'venues', label: 'Venues', icon: HardDrive },
        { key: 'personnel', label: 'Personnel', icon: Users },
        { key: 'logs', label: 'Sync Logs', icon: ArrowUpDown },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-black text-foreground uppercase tracking-wide">Google Sync Dashboard</h1>
                    <p className="text-xs text-muted-foreground mt-0.5">Monitor and manage Google sync across your organization</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={fetchDashboard}
                        disabled={loading}
                        className="border-border text-muted-foreground hover:text-foreground gap-1.5"
                    >
                        <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
                        Refresh
                    </Button>
                    <Button
                        size="sm"
                        onClick={handleForceSync}
                        className="bg-blue-600 hover:bg-blue-500 text-foreground gap-1.5"
                    >
                        <Zap className="h-3.5 w-3.5" />
                        Force Sync All
                    </Button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 bg-card/50 border border-border rounded-xl p-1">
                {TABS.map(tab => {
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={cn(
                                "flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all",
                                activeTab === tab.key
                                    ? "bg-white/10 text-foreground"
                                    : "text-muted-foreground hover:text-secondary-foreground"
                            )}
                        >
                            <Icon className="h-3.5 w-3.5" />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Search bar for personnel and logs */}
            {(activeTab === 'personnel' || activeTab === 'logs') && (
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder={`Search ${activeTab}...`}
                        className="w-full bg-card/50 border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-blue-500/30"
                    />
                </div>
            )}

            {/* Loading */}
            {loading && (
                <div className="flex items-center justify-center py-16">
                    <RefreshCw className="h-6 w-6 text-muted-foreground animate-spin" />
                </div>
            )}

            {/* ── Overview Tab ─────────────────────────────────────────────── */}
            {!loading && activeTab === 'overview' && (
                <div className="space-y-6">
                    {/* Stat Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                            { label: 'Total Syncs', value: stats?.total_syncs ?? 0, icon: ArrowUpDown, color: 'text-blue-400' },
                            { label: 'Successful', value: stats?.successful ?? 0, icon: CheckCircle2, color: 'text-green-400' },
                            { label: 'Failed', value: stats?.failed ?? 0, icon: XCircle, color: 'text-red-400' },
                            { label: 'Connected Users', value: `${stats?.connected_users ?? 0}/${stats?.total_users ?? 0}`, icon: Users, color: 'text-purple-400' },
                        ].map(card => {
                            const Icon = card.icon;
                            return (
                                <div key={card.label} className="bg-card/50 border border-border rounded-2xl p-5">
                                    <div className="flex items-center gap-2 mb-3">
                                        <Icon className={cn("h-4 w-4", card.color)} />
                                        <span className="text-xs text-muted-foreground uppercase tracking-widest font-bold">{card.label}</span>
                                    </div>
                                    <div className="text-2xl font-black text-foreground">{card.value}</div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Active Services */}
                    {stats?.active_services && (
                        <div className="bg-card/50 border border-border rounded-2xl p-5">
                            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4">Active Services</h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {Object.entries(stats.active_services).map(([service, count]) => (
                                    <div key={service} className="flex items-center gap-3 p-3 bg-secondary/30 rounded-xl">
                                        {serviceIcon(service)}
                                        <div>
                                            <div className="text-sm font-bold text-foreground capitalize">{service}</div>
                                            <div className="text-xs text-muted-foreground">{count} user{count !== 1 ? 's' : ''}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Last Sync */}
                    <div className="bg-card/50 border border-border rounded-2xl p-5">
                        <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">Last organization-wide sync: </span>
                            <span className="text-sm font-bold text-foreground">{formatRelative(stats?.last_sync || '')}</span>
                        </div>
                    </div>

                    {/* Recent Logs */}
                    {logs.length > 0 && (
                        <div className="bg-card/50 border border-border rounded-2xl p-5">
                            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4">Recent Activity</h3>
                            <div className="space-y-2">
                                {logs.slice(0, 5).map(log => (
                                    <div key={log.id} className="flex items-center gap-3 p-3 bg-secondary/20 rounded-xl">
                                        {serviceIcon(log.service)}
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm text-foreground truncate">
                                                <span className="font-bold">{log.user_name}</span>
                                                <span className="text-muted-foreground"> · {log.sync_type}</span>
                                            </div>
                                            <div className="text-xs text-muted-foreground">{log.venue_name} · {log.details}</div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className={cn(
                                                "text-[10px] font-bold px-2 py-0.5 rounded-full",
                                                log.status === 'success' ? 'text-green-400 bg-green-500/10' :
                                                    log.status === 'failed' ? 'text-red-400 bg-red-500/10' :
                                                        'text-amber-400 bg-amber-500/10'
                                            )}>
                                                {log.status.toUpperCase()}
                                            </span>
                                            <span className="text-[10px] text-muted-foreground">{formatRelative(log.created_at)}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ── Venues Tab ──────────────────────────────────────────────── */}
            {!loading && activeTab === 'venues' && (
                <div className="space-y-4">
                    {venues.length === 0 && (
                        <div className="text-center py-12 text-muted-foreground text-sm">{"No "}venues configured</div>
                    )}
                    {venues.map(venue => (
                        <div key={venue.venue_id} className="bg-card/50 border border-border rounded-2xl p-5 hover:border-border transition-all">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    {healthIcon(venue.sync_health)}
                                    <div>
                                        <div className="text-sm font-bold text-foreground">{venue.venue_name}</div>
                                        <div className="text-xs text-muted-foreground">
                                            {venue.connected_employees}/{venue.total_employees} employees connected
                                        </div>
                                    </div>
                                </div>
                                <span className={cn("text-[10px] font-bold px-2.5 py-1 rounded-full uppercase", healthColor(venue.sync_health))}>
                                    {venue.sync_health}
                                </span>
                            </div>

                            {/* Enabled syncs */}
                            <div className="flex flex-wrap gap-2 mt-3">
                                {venue.enabled_syncs.map(sync => (
                                    <div key={sync} className="flex items-center gap-1.5 px-2 py-1 bg-secondary/50 rounded-lg text-[10px] text-muted-foreground">
                                        {serviceIcon(sync.split('_')[0])}
                                        <span className="capitalize">{sync.replace(/_/g, ' ')}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                Last sync: {formatRelative(venue.last_sync)}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* ── Personnel Tab ───────────────────────────────────────────── */}
            {!loading && activeTab === 'personnel' && (
                <div className="space-y-3">
                    {filteredPersonnel.length === 0 && (
                        <div className="text-center py-12 text-muted-foreground text-sm">{"No "}personnel found</div>
                    )}
                    {filteredPersonnel.map(person => (
                        <div key={person.user_id} className="bg-card/50 border border-border rounded-2xl p-4 hover:border-border transition-all">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={cn(
                                        "w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black",
                                        person.google_connected
                                            ? "bg-green-500/10 text-green-400"
                                            : "bg-secondary text-muted-foreground"
                                    )}>
                                        {person.user_name.charAt(0)}
                                    </div>
                                    <div>
                                        <div className="text-sm font-bold text-foreground">{person.user_name}</div>
                                        <div className="text-xs text-muted-foreground">
                                            {person.google_connected
                                                ? <span className="text-green-400">{person.google_email}</span>
                                                : <span className="text-muted-foreground">Not connected</span>
                                            }
                                            <span className="text-zinc-700 mx-1.5">·</span>
                                            {person.venue_name}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 text-xs">
                                    <span className="text-muted-foreground">{formatRelative(person.last_sync)}</span>
                                </div>
                            </div>

                            {/* Sync toggles */}
                            {person.google_connected && (
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3 pt-3 border-t border-border">
                                    {[
                                        { key: 'calendar_shift_sync', label: 'Shift→Cal' },
                                        { key: 'calendar_leave_sync', label: 'Leave→Cal' },
                                        { key: 'drive_payroll_auto_export', label: 'Payroll→Drive' },
                                        { key: 'sheets_auto_export', label: 'Data→Sheets' },
                                    ].map(toggle => {
                                        const enabled = person.sync_config?.[toggle.key as keyof typeof person.sync_config];
                                        return (
                                            <div key={toggle.key} className="flex items-center gap-2">
                                                {enabled
                                                    ? <ToggleRight className="h-4 w-4 text-green-500" />
                                                    : <ToggleLeft className="h-4 w-4 text-muted-foreground" />
                                                }
                                                <span className={cn("text-[10px]", enabled ? "text-foreground" : "text-muted-foreground")}>{toggle.label}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* ── Logs Tab ────────────────────────────────────────────────── */}
            {!loading && activeTab === 'logs' && (
                <div className="space-y-2">
                    {filteredLogs.length === 0 && (
                        <div className="text-center py-12 text-muted-foreground text-sm">{"No "}sync logs</div>
                    )}
                    {filteredLogs.map(log => (
                        <div key={log.id} className="flex items-center gap-3 p-3 bg-card/30 border border-border rounded-xl hover:border-border transition-all">
                            {serviceIcon(log.service)}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-bold text-foreground">{log.user_name}</span>
                                    <span className="text-[10px] text-foreground bg-secondary px-1.5 py-0.5 rounded">{log.venue_name}</span>
                                </div>
                                <div className="text-xs text-muted-foreground truncate mt-0.5">
                                    {log.sync_type} · {log.direction === 'push' ? '↑' : '↓'} · {log.details}
                                </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                                <span className={cn(
                                    "text-[10px] font-bold px-2 py-0.5 rounded-full",
                                    log.status === 'success' ? 'text-green-400 bg-green-500/10' :
                                        log.status === 'failed' ? 'text-red-400 bg-red-500/10' :
                                            'text-amber-400 bg-amber-500/10'
                                )}>
                                    {log.status.toUpperCase()}
                                </span>
                                <span className="text-[10px] text-muted-foreground w-14 text-right">{formatRelative(log.created_at)}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
