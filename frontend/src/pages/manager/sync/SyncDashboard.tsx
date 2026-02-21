import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import {
    RefreshCw, Settings, Key, Eye, EyeOff, CheckCircle2, AlertTriangle, Clock, Power,
    Activity, Loader2, Globe, Zap, ExternalLink, Users, Search, Lock, ArrowUpDown,
    BookOpen, ChevronDown, ChevronUp, LayoutGrid, Store
} from 'lucide-react';
import { toast } from "sonner";
import api from '@/lib/api';
import { useVenue } from '@/context/VenueContext';
import { ProviderCard } from './components/ProviderCard';
import type { IntegrationConfig, SyncRun, GroupData, SortMode } from './syncDashboardTypes';
import {
    PROVIDER_FIELDS, PORTAL_URLS, PROVIDER_SETUP_GUIDES,
    SORT_OPTIONS, STATUS_WEIGHT, PROVIDERS, CATEGORY_META,
} from './syncDashboardTypes';

export default function SyncDashboard() {
    const { activeVenueId } = useVenue();
    const [configs, setConfigs] = useState<IntegrationConfig[]>([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState('all');
    const [sortBy, setSortBy] = useState<SortMode>('status');
    const [guideOpen, setGuideOpen] = useState(false);

    // Config Modal
    const [configOpen, setConfigOpen] = useState(false);
    const [configProvider, setConfigProvider] = useState<string | null>(null);
    const [credentials, setCredentials] = useState<Record<string, string>>({});
    const [configEnabled, setConfigEnabled] = useState(false);
    const [saving, setSaving] = useState(false);
    const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});

    // Sync History
    const [syncHistory, setSyncHistory] = useState<SyncRun[]>([]);

    // Group Overview
    const [groupData, setGroupData] = useState<GroupData | null>(null);
    const [groupLoading, setGroupLoading] = useState(false);

    // User role
    const userStr = typeof window !== 'undefined' ? localStorage.getItem('restin_user') : null;
    const currentUser = userStr ? JSON.parse(userStr) : {};
    const userRole = (currentUser.role || '').toUpperCase();
    const isGroupViewer = ['PRODUCT_OWNER', 'SUPER_ADMIN', 'ADMIN', 'OWNER'].includes(userRole);

    // ─── Fetch Configs ──────────────────────────────────────────────────
    const fetchConfigs = useCallback(async () => {
        if (!activeVenueId) { setLoading(false); return; }
        try {
            const res = await api.get(`/venues/${activeVenueId}/integrations`);
            const raw = Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
            const mapped: IntegrationConfig[] = raw.map((item: Record<string, unknown>) => ({
                key: (item.key as string) || '',
                enabled: !!(item.enabled ?? item.isEnabled),
                status: (item.status as string) || ((item.enabled ?? item.isEnabled) ? 'CONNECTED' : 'NOT_CONFIGURED'),
                lastSync: (item.lastSync as string) || null,
                config: (item.config as Record<string, unknown>) || {},
                configured_at: (item.configured_at as string) || (item.createdAt as string) || null,
                configured_by: (item.configured_by as string) || null,
                organization_id: (item.organization_id as string) || null,
                test_mode: !!(item.test_mode),
            }));
            setConfigs(mapped);
        } catch {
            setConfigs([]);
        } finally {
            setLoading(false);
        }
    }, [activeVenueId]);

    const fetchSyncHistory = useCallback(async () => {
        if (!activeVenueId) return;
        try {
            const res = await api.get(`/venues/${activeVenueId}/integrations/sync-history`);
            setSyncHistory(Array.isArray(res.data) ? res.data : []);
        } catch {
            setSyncHistory([]);
        }
    }, [activeVenueId]);

    const fetchGroupData = useCallback(async () => {
        if (!isGroupViewer) return;
        setGroupLoading(true);
        try {
            const res = await api.get('/group/integrations');
            setGroupData(res.data);
        } catch {
            setGroupData(null);
        } finally {
            setGroupLoading(false);
        }
    }, [isGroupViewer]);

    useEffect(() => { fetchConfigs(); fetchSyncHistory(); fetchGroupData(); }, [fetchConfigs, fetchSyncHistory, fetchGroupData]);

    // ─── Helpers ────────────────────────────────────────────────────────
    const getConfig = (provider: string) => configs.find(c => c.key === provider);

    const handleSync = async (provider: string) => {
        setSyncing(provider);
        toast.info(`Starting sync for ${provider}...`);
        try {
            const res = await api.post(`/venues/${activeVenueId}/integrations/${provider}/sync`);
            const result = res.data;
            if (result.status === 'SUCCESS' || result.success) {
                toast.success(`${provider} sync completed!`);
            } else {
                toast.error(`${provider} sync failed: ${result.error || 'Unknown error'}`);
            }
            await fetchConfigs();
            await fetchSyncHistory();
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Sync request failed';
            toast.error(msg);
        } finally {
            setSyncing(null);
        }
    };

    const handleConfigure = (provider: string) => {
        const existing = getConfig(provider);
        setConfigProvider(provider);
        setConfigEnabled(existing?.enabled ?? false);
        const settings = (existing?.config || {}) as Record<string, string>;
        setCredentials({ ...settings });
        setShowSecrets({});
        setConfigOpen(true);
    };

    const handleSaveConfig = async () => {
        if (!configProvider) return;
        setSaving(true);
        try {
            await api.post(`/venues/${activeVenueId}/integrations/${configProvider}`, {
                enabled: configEnabled,
                config: credentials,
                test_mode: false,
            });
            toast.success(`${configProvider} configuration saved!`);
            setConfigOpen(false);
            await fetchConfigs();
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Failed to save configuration';
            toast.error(msg);
        } finally {
            setSaving(false);
        }
    };

    // ─── Computed ───────────────────────────────────────────────────────
    const connectedCount = configs.filter(c => c.status === 'CONNECTED' || c.enabled).length;
    const errorCount = configs.filter(c => c.status === 'ERROR').length;
    const totalProviders = PROVIDERS.length;

    const filteredProviders = PROVIDERS.filter(p => {
        const matchesCategory = activeCategory === 'all' || p.category === activeCategory;
        const matchesSearch = searchQuery === '' ||
            p.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.desc.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    }).sort((a, b) => {
        if (sortBy === 'name') return a.label.localeCompare(b.label);
        if (sortBy === 'lastSync') {
            const aSync = getConfig(a.key)?.lastSync || '';
            const bSync = getConfig(b.key)?.lastSync || '';
            return bSync.localeCompare(aSync); // newest first
        }
        // Default: status — active first, then alpha
        const aStatus = getConfig(a.key)?.status || 'NOT_CONFIGURED';
        const bStatus = getConfig(b.key)?.status || 'NOT_CONFIGURED';
        const wA = STATUS_WEIGHT[aStatus] ?? 3;
        const wB = STATUS_WEIGHT[bStatus] ?? 3;
        if (wA !== wB) return wA - wB;
        return a.label.localeCompare(b.label);
    });

    const currentFields = configProvider ? (PROVIDER_FIELDS[configProvider] || []) : [];
    const currentProviderLabel = PROVIDERS.find(p => p.key === configProvider)?.label || configProvider;
    const currentPortal = configProvider ? PORTAL_URLS[configProvider] : null;
    const currentGuide = configProvider ? (PROVIDER_SETUP_GUIDES[configProvider] || []) : [];
    const isNuki = configProvider === 'NUKI';

    const categories = Object.keys(CATEGORY_META);

    return (
        <div className="space-y-6 p-6 lg:p-8 max-w-[1600px] mx-auto">
            {/* Hero */}
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl lg:text-3xl font-bold text-foreground flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-600 to-blue-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
                            <RefreshCw className="h-5 w-5 text-foreground" />
                        </div>
                        Integration Control
                    </h1>
                    <p className="text-muted-foreground mt-2 text-sm">
                        Manage all venue connections, APIs, Google services, and IoT — with full audit trail.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative w-full lg:w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input aria-label="Search integrations..."
                            placeholder="Search integrations..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 bg-card border-border text-secondary-foreground placeholder:text-muted-foreground"
                        />
                    </div>
                    {/* Sort Dropdown */}
                    <div className="flex items-center gap-1 bg-card rounded-lg p-1 border border-border">
                        <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground ml-2" />
                        {SORT_OPTIONS.map(opt => (
                            <button
                                key={opt.id}
                                onClick={() => setSortBy(opt.id)}
                                className={`px-2.5 py-1.5 rounded-md text-[11px] font-semibold transition-all ${sortBy === opt.id
                                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                    : 'text-muted-foreground hover:text-secondary-foreground'
                                    }`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Card className="bg-background/80 border-border border-l-2 border-l-emerald-500/50">
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                        </div>
                        <div>
                            <p className="text-xl font-bold text-foreground tabular-nums">{connectedCount}</p>
                            <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Connected</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-background/80 border-border border-l-2 border-l-red-500/50">
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-red-500/10 flex items-center justify-center">
                            <AlertTriangle className="h-4 w-4 text-red-400" />
                        </div>
                        <div>
                            <p className="text-xl font-bold text-foreground tabular-nums">{errorCount}</p>
                            <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Errors</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-background/80 border-border border-l-2 border-l-blue-500/50">
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
                            <Activity className="h-4 w-4 text-blue-400" />
                        </div>
                        <div>
                            <p className="text-xl font-bold text-foreground tabular-nums">{totalProviders}</p>
                            <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Total</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-background/80 border-border border-l-2 border-l-amber-500/50">
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-amber-500/10 flex items-center justify-center">
                            <Clock className="h-4 w-4 text-amber-400" />
                        </div>
                        <div>
                            <p className="text-xl font-bold text-foreground tabular-nums">{syncHistory.length}</p>
                            <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Sync Runs</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Main Tabs */}
            <Tabs defaultValue="overview" className="space-y-5">
                <TabsList className="bg-card border border-border">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    {isGroupViewer && (
                        <TabsTrigger value="group" className="flex items-center gap-1.5">
                            <LayoutGrid className="h-3.5 w-3.5" />
                            Group Overview
                        </TabsTrigger>
                    )}
                    <TabsTrigger value="runs">Sync History</TabsTrigger>
                    <TabsTrigger value="settings">Policies</TabsTrigger>
                </TabsList>

                {/* Overview Tab */}
                <TabsContent value="overview" className="space-y-5">
                    {/* Category Filters */}
                    <div className="flex flex-wrap gap-2">
                        {categories.map(cat => {
                            const meta = CATEGORY_META[cat];
                            const CategoryIcon = meta.icon;
                            const isActive = activeCategory === cat;
                            const count = cat === 'all' ? PROVIDERS.length : PROVIDERS.filter(p => p.category === cat).length;
                            const connectedInCat = cat === 'all'
                                ? connectedCount
                                : PROVIDERS.filter(p => p.category === cat && getConfig(p.key)?.status === 'CONNECTED').length;
                            return (
                                <button
                                    key={cat}
                                    onClick={() => setActiveCategory(cat)}
                                    className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all duration-200
                                        ${isActive
                                            ? `bg-gradient-to-r ${meta.gradient} text-foreground shadow-lg`
                                            : 'bg-card border border-border text-muted-foreground hover:text-secondary-foreground hover:bg-secondary'
                                        }`}
                                >
                                    <CategoryIcon className="h-3.5 w-3.5" />
                                    {meta.label}
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${isActive ? 'bg-white/20' : 'bg-secondary text-muted-foreground'}`}>
                                        {connectedInCat}/{count}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Loading */}
                    {loading && (
                        <div className="flex items-center justify-center py-20 text-muted-foreground">
                            <Loader2 className="h-6 w-6 animate-spin mr-3" />
                            Loading integrations...
                        </div>
                    )}

                    {/* Provider Cards */}
                    {!loading && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                            {filteredProviders.map(p => {
                                const config = getConfig(p.key);
                                const portal = PORTAL_URLS[p.key];
                                return (
                                    <ProviderCard
                                        key={p.key}
                                        provider={p.key}
                                        label={p.label}
                                        description={p.desc}
                                        icon={p.icon}
                                        status={config ? (config.status as 'CONNECTED' | 'ERROR' | 'DISABLED') : 'NOT_CONFIGURED'}
                                        lastSync={config?.lastSync ?? null}
                                        configuredAt={config?.configured_at ?? null}
                                        configuredBy={config?.configured_by ?? null}
                                        configSummary={config?.config as Record<string, unknown>}
                                        loading={syncing === p.key}
                                        onSync={() => handleSync(p.key)}
                                        onConfigure={() => handleConfigure(p.key)}
                                        appLink={p.appLink}
                                        appLabel={p.appLabel}
                                        portalUrl={portal?.url}
                                        portalLabel={portal?.label}
                                        accentColor={p.color}
                                    />
                                );
                            })}
                        </div>
                    )}

                    {!loading && filteredProviders.length === 0 && (
                        <div className="text-center py-16 text-muted-foreground">
                            <Search className="h-10 w-10 mx-auto mb-3 opacity-50" />
                            <p className="text-sm">{"No "}integrations match your search.</p>
                        </div>
                    )}
                </TabsContent>

                {/* ─── Group Overview Tab ──────────────────────────────────────── */}
                {isGroupViewer && (
                    <TabsContent value="group" className="space-y-5">
                        {groupLoading ? (
                            <div className="flex items-center justify-center py-20 text-muted-foreground">
                                <Loader2 className="h-6 w-6 animate-spin mr-3" />
                                Loading group integrations...
                            </div>
                        ) : groupData ? (
                            <>
                                {/* Group Summary Cards */}
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                    <Card className="bg-background/80 border-border border-l-2 border-l-violet-500/50">
                                        <CardContent className="p-4 flex items-center gap-3">
                                            <div className="h-9 w-9 rounded-lg bg-violet-500/10 flex items-center justify-center">
                                                <Store className="h-4 w-4 text-violet-400" />
                                            </div>
                                            <div>
                                                <p className="text-xl font-bold text-foreground tabular-nums">{groupData.summary.total_venues}</p>
                                                <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Venues</p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                    <Card className="bg-background/80 border-border border-l-2 border-l-emerald-500/50">
                                        <CardContent className="p-4 flex items-center gap-3">
                                            <div className="h-9 w-9 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                                                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                                            </div>
                                            <div>
                                                <p className="text-xl font-bold text-foreground tabular-nums">{groupData.summary.total_connected}</p>
                                                <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Active Links</p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                    <Card className="bg-background/80 border-border border-l-2 border-l-blue-500/50">
                                        <CardContent className="p-4 flex items-center gap-3">
                                            <div className="h-9 w-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
                                                <Zap className="h-4 w-4 text-blue-400" />
                                            </div>
                                            <div>
                                                <p className="text-xl font-bold text-foreground tabular-nums">{groupData.summary.providers_used.length}</p>
                                                <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Providers Used</p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>

                                {/* Venue × Provider Matrix */}
                                <Card className="bg-background border-border">
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-foreground text-base flex items-center gap-2">
                                            <LayoutGrid className="h-4 w-4 text-blue-400" />
                                            Venue × Provider Matrix
                                        </CardTitle>
                                        <p className="text-xs text-muted-foreground">Integration status per venue. Click any cell to manage.</p>
                                    </CardHeader>
                                    <CardContent className="overflow-x-auto">
                                        <table className="w-full text-xs">
                                            <thead>
                                                <tr className="border-b border-border">
                                                    <th className="text-left py-3 px-3 text-muted-foreground font-semibold uppercase tracking-wider sticky left-0 bg-background z-10 min-w-[180px]">
                                                        Venue
                                                    </th>
                                                    {PROVIDERS.map(p => (
                                                        <th key={p.key} className="text-center py-3 px-2 text-muted-foreground font-semibold uppercase tracking-wider min-w-20">
                                                            <div className="flex flex-col items-center gap-1">
                                                                <p.icon className="h-3.5 w-3.5" />
                                                                <span className="text-[9px] leading-tight">{p.label.split(' ')[0]}</span>
                                                            </div>
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {groupData.venues.map(venue => {
                                                    const venueMatrix = groupData.matrix[venue.id] || {};
                                                    return (
                                                        <tr key={venue.id} className="border-b border-border/50 hover:bg-card/50 transition-colors">
                                                            <td className="py-3 px-3 sticky left-0 bg-background z-10">
                                                                <div className="flex items-center gap-2">
                                                                    <Store className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                                                                    <div>
                                                                        <p className="text-secondary-foreground font-medium text-xs">{venue.name}</p>
                                                                        {venue.brand && (
                                                                            <p className="text-[10px] text-muted-foreground">{venue.brand}</p>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            {PROVIDERS.map(p => {
                                                                const cfg = venueMatrix[p.key];
                                                                const isConnected = cfg && (cfg.status === 'CONNECTED' || cfg.enabled);
                                                                const isError = cfg?.status === 'ERROR';
                                                                const isDisabled = cfg && cfg.status === 'DISABLED';
                                                                return (
                                                                    <td key={p.key} className="text-center py-3 px-2">
                                                                        {isConnected ? (
                                                                            <div className="flex flex-col items-center gap-0.5" title={cfg?.configured_by ? `Set up by ${cfg.configured_by}` : undefined}>
                                                                                <div className="h-6 w-6 rounded-full bg-emerald-500/15 flex items-center justify-center">
                                                                                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                                                                                </div>
                                                                                {cfg?.scope === 'global' && (
                                                                                    <span className="text-[8px] text-blue-400/70">Global</span>
                                                                                )}
                                                                            </div>
                                                                        ) : isError ? (
                                                                            <div className="h-6 w-6 rounded-full bg-red-500/15 flex items-center justify-center mx-auto">
                                                                                <AlertTriangle className="h-3 w-3 text-red-400" />
                                                                            </div>
                                                                        ) : isDisabled ? (
                                                                            <div className="h-6 w-6 rounded-full bg-secondary flex items-center justify-center mx-auto">
                                                                                <Power className="h-3 w-3 text-muted-foreground" />
                                                                            </div>
                                                                        ) : (
                                                                            <div className="h-6 w-6 rounded-full bg-card flex items-center justify-center mx-auto">
                                                                                <span className="text-zinc-700 text-[10px]">—</span>
                                                                            </div>
                                                                        )}
                                                                    </td>
                                                                );
                                                            })}
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </CardContent>
                                </Card>

                                {/* Provider Usage List */}
                                <Card className="bg-background border-border">
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-foreground text-sm">Active Providers Across Group</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-2">
                                        {groupData.summary.providers_used.length === 0 ? (
                                            <p className="text-sm text-muted-foreground text-center py-4">{"No "}integrations connected yet.</p>
                                        ) : (
                                            groupData.summary.providers_used.map(provKey => {
                                                const pDef = PROVIDERS.find(p => p.key === provKey);
                                                const venuesWithIt = groupData.venues.filter(v => {
                                                    const cfg = groupData.matrix[v.id]?.[provKey];
                                                    return cfg && (cfg.status === 'CONNECTED' || cfg.enabled);
                                                });
                                                const ProvIcon = pDef?.icon || Zap;
                                                return (
                                                    <div key={provKey} className="flex items-center justify-between p-3 rounded-lg bg-card/50 border border-border">
                                                        <div className="flex items-center gap-3">
                                                            <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                                                                <ProvIcon className="h-4 w-4 text-blue-400" />
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-medium text-secondary-foreground">{pDef?.label || provKey}</p>
                                                                <p className="text-[10px] text-muted-foreground">{pDef?.desc || ''}</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <Badge className="bg-emerald-600/20 text-emerald-400 border-emerald-500/20 text-[10px]">
                                                                {venuesWithIt.length} venue{venuesWithIt.length !== 1 ? 's' : ''}
                                                            </Badge>
                                                            <div className="flex -space-x-1">
                                                                {venuesWithIt.slice(0, 3).map(v => (
                                                                    <div
                                                                        key={v.id}
                                                                        className="h-5 w-5 rounded-full bg-secondary border border-border flex items-center justify-center"
                                                                        title={v.name}
                                                                    >
                                                                        <span className="text-[8px] text-muted-foreground font-bold">{v.name.charAt(0)}</span>
                                                                    </div>
                                                                ))}
                                                                {venuesWithIt.length > 3 && (
                                                                    <div className="h-5 w-5 rounded-full bg-zinc-700 border border-zinc-600 flex items-center justify-center">
                                                                        <span className="text-[8px] text-secondary-foreground font-bold">+{venuesWithIt.length - 3}</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </CardContent>
                                </Card>
                            </>
                        ) : (
                            <div className="text-center py-16 text-muted-foreground">
                                <AlertTriangle className="h-8 w-8 mx-auto mb-3 opacity-50" />
                                <p className="text-sm">Unable to load group data. Check permissions.</p>
                            </div>
                        )}
                    </TabsContent>
                )}

                {/* Sync History Tab */}
                <TabsContent value="runs">
                    <Card className="bg-background border-border">
                        <CardHeader>
                            <CardTitle className="text-foreground text-base">Sync Execution Logs</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {syncHistory.length === 0 ? (
                                <div className="text-sm text-muted-foreground p-8 text-center border border-dashed border-border rounded-md">
                                    No sync history yet. Trigger a sync from the Overview tab.
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {syncHistory.map((run, i) => (
                                        <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-card/50 border border-border">
                                            <div className="flex items-center gap-3">
                                                <Badge
                                                    variant={run.status === 'SUCCESS' ? 'default' : 'destructive'}
                                                    className={run.status === 'SUCCESS' ? 'bg-emerald-600 text-xs' : 'text-xs'}
                                                >
                                                    {run.status}
                                                </Badge>
                                                <span className="text-sm font-medium text-secondary-foreground">{run.provider}</span>
                                                <span className="text-xs text-muted-foreground">{run.job_type}</span>
                                            </div>
                                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                                {run.triggered_by && (
                                                    <span className="flex items-center gap-1">
                                                        <Users className="h-3 w-3" />
                                                        {run.triggered_by}
                                                    </span>
                                                )}
                                                <span>{run.items_processed} items</span>
                                                <span className="flex items-center gap-1">
                                                    <Clock className="h-3 w-3" />
                                                    {new Date(run.started_at).toLocaleString()}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Policies Tab */}
                <TabsContent value="settings">
                    <Card className="bg-background border-border">
                        <CardHeader>
                            <CardTitle className="text-foreground text-base">Sync Policies</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between p-4 rounded-lg bg-card/50 border border-border">
                                <div>
                                    <p className="text-sm font-medium text-secondary-foreground">Auto-Sync on Startup</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">Sync all enabled providers when the system starts</p>
                                </div>
                                <Switch />
                            </div>
                            <div className="flex items-center justify-between p-4 rounded-lg bg-card/50 border border-border">
                                <div>
                                    <p className="text-sm font-medium text-secondary-foreground">Scheduled Sync (6h interval)</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">Run sync jobs automatically for all connected providers</p>
                                </div>
                                <Switch />
                            </div>
                            <div className="flex items-center justify-between p-4 rounded-lg bg-card/50 border border-border">
                                <div>
                                    <p className="text-sm font-medium text-secondary-foreground">{"Error "}Notifications</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">Send email alerts when a sync run fails</p>
                                </div>
                                <Switch defaultChecked />
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* ─── Configuration Dialog ──────────────────────────────────────── */}
            <Dialog open={configOpen} onOpenChange={setConfigOpen}>
                <DialogContent className="max-w-lg bg-background border-border">
                    <DialogHeader>
                        <DialogTitle className="text-foreground flex items-center gap-2">
                            <Settings className="h-5 w-5 text-blue-400" />
                            Configure {currentProviderLabel}
                        </DialogTitle>
                        <DialogDescription className="text-muted-foreground">
                            Enter your API credentials. They are encrypted and stored securely.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        {/* Security Notice */}
                        <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-500/5 border border-blue-500/10">
                            <Key className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
                            <p className="text-xs text-blue-300/80">
                                Credentials are encrypted with AES-256 before storage. Raw values are never logged or returned via API.
                            </p>
                        </div>

                        {/* Setup Guide (collapsible) */}
                        {currentGuide.length > 0 && (
                            <div className="rounded-lg border border-emerald-500/10 bg-emerald-500/5 overflow-hidden">
                                <button
                                    onClick={() => setGuideOpen(!guideOpen)}
                                    className="w-full flex items-center justify-between px-3 py-2.5 text-sm font-semibold text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                                >
                                    <span className="flex items-center gap-2">
                                        <BookOpen className="h-4 w-4" />
                                        How to Configure
                                    </span>
                                    {guideOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                </button>
                                {guideOpen && (
                                    <div className="px-3 pb-3 space-y-1.5">
                                        {currentGuide.map((step, i) => (
                                            <p key={i} className="text-xs text-emerald-300/70 leading-relaxed">
                                                {step}
                                            </p>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Nuki OAuth Connect Button */}
                        {isNuki && (
                            <a
                                href={`/api/integrations/nuki/oauth/start`}
                                className="flex items-center justify-center gap-2 p-3 rounded-lg bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-foreground font-semibold text-sm transition-all shadow-lg shadow-blue-500/20"
                            >
                                <Lock className="h-4 w-4" />
                                Connect with Nuki (OAuth2)
                                <ExternalLink className="h-3 w-3 opacity-70" />
                            </a>
                        )}

                        {/* Portal link in dialog */}
                        {currentPortal && (
                            <a
                                href={currentPortal.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 p-3 rounded-lg bg-card/60 border border-border hover:border-blue-500/30 hover:bg-blue-500/5 transition-all text-sm text-secondary-foreground hover:text-blue-400"
                            >
                                <Globe className="h-4 w-4" />
                                <span className="flex-1">{currentPortal.label}</span>
                                <ExternalLink className="h-3 w-3 opacity-50" />
                            </a>
                        )}

                        {/* Enable/Disable Toggle */}
                        <div className="flex items-center justify-between p-3 rounded-lg bg-card/60 border border-border">
                            <div className="flex items-center gap-2">
                                <Power className="h-4 w-4 text-muted-foreground" />
                                <Label className="text-sm text-secondary-foreground">Enable Integration</Label>
                            </div>
                            <Switch
                                checked={configEnabled}
                                onCheckedChange={setConfigEnabled}
                            />
                        </div>

                        {/* Credential Fields */}
                        {currentFields.map(field => (
                            <div key={field.key} className="space-y-1.5">
                                <Label htmlFor={`field-${field.key}`} className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                                    {field.label}
                                </Label>
                                <div className="relative">
                                    <Input aria-label="Input field"
                                        id={`field-${field.key}`}
                                        type={field.type === 'password' && !showSecrets[field.key] ? 'password' : 'text'}
                                        placeholder={field.placeholder}
                                        value={credentials[field.key] || ''}
                                        onChange={e => setCredentials(prev => ({ ...prev, [field.key]: e.target.value }))}
                                        className="bg-card border-border text-secondary-foreground placeholder:text-muted-foreground pr-10"
                                    />
                                    {field.type === 'password' && (
                                        <button
                                            type="button"
                                            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-secondary-foreground transition-colors"
                                            onClick={() => setShowSecrets(prev => ({ ...prev, [field.key]: !prev[field.key] }))}
                                        >
                                            {showSecrets[field.key]
                                                ? <EyeOff className="h-4 w-4" />
                                                : <Eye className="h-4 w-4" />
                                            }
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}

                        {currentFields.length === 0 && (
                            <div className="text-sm text-muted-foreground p-4 text-center border border-dashed border-border rounded-md">
                                No credential fields defined for this provider.
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex justify-end gap-2 pt-2">
                            <Button
                                variant="outline"
                                size="sm"
                                className="bg-card border-border text-secondary-foreground hover:bg-secondary"
                                onClick={() => setConfigOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                size="sm"
                                className="bg-gradient-to-r from-blue-600 to-blue-500 text-foreground border-0 hover:from-blue-500 hover:to-blue-400"
                                onClick={handleSaveConfig}
                                disabled={saving}
                            >
                                {saving ? (
                                    <><Loader2 className="h-3 w-3 mr-2 animate-spin" /> Saving...</>
                                ) : (
                                    'Save Configuration'
                                )}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
