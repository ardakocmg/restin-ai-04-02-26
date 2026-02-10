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
    RefreshCw, Database, Server, Smartphone, ShoppingCart, Users, Cloud,
    Settings, Key, Eye, EyeOff, CheckCircle2, AlertTriangle, Clock, Power,
    Activity, Loader2
} from 'lucide-react';
import { toast } from "sonner";
import api from '@/lib/api';
import { useVenue } from '@/context/VenueContext';
import { ProviderCard } from './components/ProviderCard';

// ─── Per-Provider Credential Field Definitions ──────────────────────────
interface CredField {
    key: string;
    label: string;
    type: 'text' | 'password';
    placeholder: string;
}

const PROVIDER_FIELDS: Record<string, CredField[]> = {
    LIGHTSPEED: [
        { key: 'client_id', label: 'Client ID', type: 'text', placeholder: 'ls_client_...' },
        { key: 'client_secret', label: 'Client Secret', type: 'password', placeholder: '••••••••' },
        { key: 'restaurant_id', label: 'Restaurant ID', type: 'text', placeholder: '123456' },
        { key: 'api_base', label: 'API Region', type: 'text', placeholder: 'https://api.lightspeedapp.com' },
    ],
    SHIREBURN: [
        { key: 'api_key', label: 'API Key', type: 'password', placeholder: 'sb_live_...' },
        { key: 'company_code', label: 'Company Code', type: 'text', placeholder: 'MGGROUP' },
        { key: 'payroll_endpoint', label: 'Endpoint URL', type: 'text', placeholder: 'https://...' },
    ],
    APICBASE: [
        { key: 'api_key', label: 'API Key', type: 'password', placeholder: 'apic_...' },
        { key: 'restaurant_id', label: 'Restaurant UUID', type: 'text', placeholder: '550e8400-...' },
    ],
    GOOGLE: [
        { key: 'client_id', label: 'OAuth Client ID', type: 'text', placeholder: '123456.apps.googleusercontent.com' },
        { key: 'client_secret', label: 'OAuth Client Secret', type: 'password', placeholder: 'GOCSPX-...' },
        { key: 'location_id', label: 'Business Profile ID', type: 'text', placeholder: 'locations/...' },
    ],
    NUKI: [
        { key: 'api_token', label: 'API Token', type: 'password', placeholder: 'nk_...' },
        { key: 'bridge_ip', label: 'Bridge IP', type: 'text', placeholder: '192.168.1.100' },
        { key: 'bridge_port', label: 'Bridge Port', type: 'text', placeholder: '8080' },
    ],
    TUYA: [
        { key: 'access_id', label: 'Access ID', type: 'text', placeholder: 'p9jnc...' },
        { key: 'access_key', label: 'Access Key', type: 'password', placeholder: '••••••••' },
        { key: 'endpoint', label: 'API Endpoint', type: 'text', placeholder: 'https://openapi.tuyaeu.com' },
    ],
    MEROSS: [
        { key: 'email', label: 'Meross Email', type: 'text', placeholder: 'user@example.com' },
        { key: 'password', label: 'Meross Password', type: 'password', placeholder: '••••••••' },
        { key: 'api_base', label: 'API Region', type: 'text', placeholder: 'https://iotx-eu.meross.com' },
    ],
    QINGPING: [
        { key: 'app_key', label: 'App Key', type: 'text', placeholder: 'qp_...' },
        { key: 'app_secret', label: 'App Secret', type: 'password', placeholder: '••••••••' },
    ],
};

// ─── Provider List ──────────────────────────────────────────────────────
const PROVIDERS = [
    { key: 'LIGHTSPEED', label: 'Lightspeed K-Series', desc: 'POS Orders, Menu, Shifts', icon: ShoppingCart },
    { key: 'SHIREBURN', label: 'Shireburn Indigo', desc: 'HR, Payroll, Leave', icon: Users },
    { key: 'APICBASE', label: 'Apicbase', desc: 'Inventory, Recipes, Stock', icon: Database },
    { key: 'GOOGLE', label: 'Google Business', desc: 'Maps, Reservations, Reviews', icon: Cloud },
    { key: 'NUKI', label: 'Nuki Smart Lock', desc: 'Door Access, Keypad Codes', icon: Server, appLink: '/admin/door-access', appLabel: 'Door Control' },
    { key: 'TUYA', label: 'Tuya Smart Life', desc: 'Lights, Switches, Climate', icon: Smartphone, appLink: '/admin/smart-home', appLabel: 'Smart Home' },
    { key: 'MEROSS', label: 'Meross IoT', desc: 'Plugs, Garage Doors', icon: Smartphone, appLink: '/admin/smart-home', appLabel: 'Smart Home' },
    { key: 'QINGPING', label: 'Qingping Sensors', desc: 'Temp & Humidity Monitoring', icon: Smartphone },
];

// ─── Types ──────────────────────────────────────────────────────────────
interface IntegrationConfig {
    id: string;
    organization_id: string;
    provider: string;
    is_enabled: boolean;
    status: string;
    last_sync: string | null;
    settings: Record<string, unknown>;
}

interface SyncRun {
    id: string;
    provider: string;
    job_type: string;
    status: string;
    started_at: string;
    finished_at: string | null;
    duration_ms: number | null;
    items_processed: number;
    error_summary: string | null;
}

// ─── Main Dashboard ─────────────────────────────────────────────────────
export default function SyncDashboard() {
    const { activeVenueId } = useVenue();
    const [configs, setConfigs] = useState<IntegrationConfig[]>([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState<string | null>(null);

    // Config Modal
    const [configOpen, setConfigOpen] = useState(false);
    const [configProvider, setConfigProvider] = useState<string | null>(null);
    const [credentials, setCredentials] = useState<Record<string, string>>({});
    const [configEnabled, setConfigEnabled] = useState(false);
    const [saving, setSaving] = useState(false);
    const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});

    // Sync History
    const [syncHistory, setSyncHistory] = useState<SyncRun[]>([]);
    const [historyLoading, setHistoryLoading] = useState(false);

    // ─── Fetch Configs ──────────────────────────────────────────────────
    const fetchConfigs = useCallback(async () => {
        if (!activeVenueId) { setLoading(false); return; }
        try {
            const res = await api.get(`/venues/${activeVenueId}/integrations`);
            const raw = Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
            // Map backend shape → frontend IntegrationConfig shape
            const mapped: IntegrationConfig[] = raw.map((item: Record<string, unknown>) => ({
                id: (item.key as string) || (item.id as string) || '',
                organization_id: '',
                provider: (item.key as string) || (item.provider as string) || '',
                is_enabled: !!(item.enabled ?? item.is_enabled),
                status: (item.enabled ?? item.is_enabled) ? 'CONNECTED' : 'DISABLED',
                last_sync: (item.lastSync as string) || (item.last_sync as string) || null,
                settings: (item.config as Record<string, unknown>) || (item.settings as Record<string, unknown>) || {},
            }));
            setConfigs(mapped);
        } catch (err) {
            // API might 404 if no configs yet — that's OK
            setConfigs([]);
        } finally {
            setLoading(false);
        }
    }, [activeVenueId]);

    useEffect(() => { fetchConfigs(); }, [fetchConfigs]);

    // ─── Get Config for Provider ────────────────────────────────────────
    const getConfig = (provider: string) => configs.find(c => c.provider === provider);

    // ─── Sync Handler ───────────────────────────────────────────────────
    const handleSync = async (provider: string) => {
        setSyncing(provider);
        toast.info(`Starting sync for ${provider}...`);
        try {
            const res = await api.post(`/venues/${activeVenueId}/integrations/${provider}/sync`);
            const result = res.data;
            if (result.status === 'SUCCESS' || result.success) {
                toast.success(`${provider} sync completed! ${result.result?.processed || 0} items processed.`);
            } else {
                toast.error(`${provider} sync failed: ${result.error || 'Unknown error'}`);
            }
            // Refresh configs to get updated last_sync
            await fetchConfigs();
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Sync request failed';
            toast.error(msg);
        } finally {
            setSyncing(null);
        }
    };

    // ─── Open Config Modal ──────────────────────────────────────────────
    const handleConfigure = (provider: string) => {
        const existing = getConfig(provider);
        setConfigProvider(provider);
        setConfigEnabled(existing?.is_enabled ?? false);
        // Pre-fill credentials from settings (never see real secrets, but placeholders)
        const settings = (existing?.settings || {}) as Record<string, string>;
        setCredentials({ ...settings });
        setShowSecrets({});
        setConfigOpen(true);
    };

    // ─── Save Config ────────────────────────────────────────────────────
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

    // ─── Stats ──────────────────────────────────────────────────────────
    const connectedCount = configs.filter(c => c.status === 'CONNECTED' || c.is_enabled).length;
    const errorCount = configs.filter(c => c.status === 'ERROR').length;
    const totalProviders = PROVIDERS.length;

    // ─── Get current config modal fields ────────────────────────────────
    const currentFields = configProvider ? (PROVIDER_FIELDS[configProvider] || []) : [];
    const currentProviderLabel = PROVIDERS.find(p => p.key === configProvider)?.label || configProvider;

    return (
        <div className="space-y-6 p-8 max-w-[1600px] mx-auto">
            {/* Hero */}
            <div>
                <h1 className="text-3xl font-bold text-zinc-100 flex items-center gap-3">
                    <RefreshCw className="h-8 w-8 text-blue-500" />
                    Integration Control Plane
                </h1>
                <p className="text-zinc-400 mt-2">
                    Manage external connections, synchronization policies, and real-time device status.
                </p>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="bg-zinc-950 border-zinc-800">
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-zinc-100 tabular-nums">{connectedCount}</p>
                            <p className="text-xs text-zinc-500 font-medium uppercase">Connected</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-zinc-950 border-zinc-800">
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                            <AlertTriangle className="h-5 w-5 text-red-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-zinc-100 tabular-nums">{errorCount}</p>
                            <p className="text-xs text-zinc-500 font-medium uppercase">Errors</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-zinc-950 border-zinc-800">
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                            <Activity className="h-5 w-5 text-blue-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-zinc-100 tabular-nums">{totalProviders}</p>
                            <p className="text-xs text-zinc-500 font-medium uppercase">Total Providers</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="overview" className="space-y-6">
                <TabsList className="bg-zinc-900 border border-zinc-800">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="runs">Sync History</TabsTrigger>
                    <TabsTrigger value="settings">Global Policies</TabsTrigger>
                </TabsList>

                {/* Overview Tab */}
                <TabsContent value="overview" className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {PROVIDERS.map(p => {
                            const config = getConfig(p.key);
                            return (
                                <ProviderCard
                                    key={p.key}
                                    provider={p.key}
                                    label={p.label}
                                    description={p.desc}
                                    icon={p.icon}
                                    status={config ? (config.status as 'CONNECTED' | 'ERROR' | 'DISABLED' | 'NOT_CONFIGURED') : 'NOT_CONFIGURED'}
                                    lastSync={config ? config.last_sync : null}
                                    loading={syncing === p.key}
                                    onSync={() => handleSync(p.key)}
                                    onConfigure={() => handleConfigure(p.key)}
                                    appLink={(p as Record<string, unknown>).appLink as string | undefined}
                                    appLabel={(p as Record<string, unknown>).appLabel as string | undefined}
                                />
                            );
                        })}
                    </div>
                </TabsContent>

                {/* Sync History Tab */}
                <TabsContent value="runs">
                    <Card className="bg-zinc-950 border-zinc-800">
                        <CardHeader>
                            <CardTitle className="text-zinc-100">Sync Execution Logs</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {syncHistory.length === 0 ? (
                                <div className="text-sm text-zinc-500 p-8 text-center border border-dashed border-zinc-800 rounded-md">
                                    No sync history available yet. Trigger a sync from the Overview tab.
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {syncHistory.map(run => (
                                        <div key={run.id} className="flex items-center justify-between p-3 rounded-lg bg-zinc-900/50 border border-zinc-800">
                                            <div className="flex items-center gap-3">
                                                <Badge variant={run.status === 'SUCCESS' ? 'default' : 'destructive'}
                                                    className={run.status === 'SUCCESS' ? 'bg-emerald-600' : ''}>
                                                    {run.status}
                                                </Badge>
                                                <span className="text-sm font-medium text-zinc-200">{run.provider}</span>
                                                <span className="text-xs text-zinc-500">{run.job_type}</span>
                                            </div>
                                            <div className="flex items-center gap-4 text-xs text-zinc-500">
                                                <span>{run.items_processed} items</span>
                                                {run.duration_ms && <span>{(run.duration_ms / 1000).toFixed(1)}s</span>}
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

                {/* Global Policies Tab */}
                <TabsContent value="settings">
                    <Card className="bg-zinc-950 border-zinc-800">
                        <CardHeader>
                            <CardTitle className="text-zinc-100">Sync Policies</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between p-4 rounded-lg bg-zinc-900/50 border border-zinc-800">
                                <div>
                                    <p className="text-sm font-medium text-zinc-200">Auto-Sync on Startup</p>
                                    <p className="text-xs text-zinc-500 mt-0.5">Automatically sync all enabled providers when the system starts</p>
                                </div>
                                <Switch />
                            </div>
                            <div className="flex items-center justify-between p-4 rounded-lg bg-zinc-900/50 border border-zinc-800">
                                <div>
                                    <p className="text-sm font-medium text-zinc-200">Scheduled Sync</p>
                                    <p className="text-xs text-zinc-500 mt-0.5">Run sync jobs every 6 hours for all connected providers</p>
                                </div>
                                <Switch />
                            </div>
                            <div className="flex items-center justify-between p-4 rounded-lg bg-zinc-900/50 border border-zinc-800">
                                <div>
                                    <p className="text-sm font-medium text-zinc-200">Error Notifications</p>
                                    <p className="text-xs text-zinc-500 mt-0.5">Send email alerts when a sync run fails</p>
                                </div>
                                <Switch defaultChecked />
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* ─── Configuration Dialog ──────────────────────────────────────── */}
            <Dialog open={configOpen} onOpenChange={setConfigOpen}>
                <DialogContent className="max-w-lg bg-zinc-950 border-zinc-800">
                    <DialogHeader>
                        <DialogTitle className="text-zinc-100 flex items-center gap-2">
                            <Settings className="h-5 w-5 text-blue-400" />
                            Configure {currentProviderLabel}
                        </DialogTitle>
                        <DialogDescription className="text-zinc-500">
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

                        {/* Enable/Disable Toggle */}
                        <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-900/60 border border-zinc-800">
                            <div className="flex items-center gap-2">
                                <Power className="h-4 w-4 text-zinc-400" />
                                <Label className="text-sm text-zinc-300">Enable Integration</Label>
                            </div>
                            <Switch
                                checked={configEnabled}
                                onCheckedChange={setConfigEnabled}
                            />
                        </div>

                        {/* Credential Fields */}
                        {currentFields.map(field => (
                            <div key={field.key} className="space-y-1.5">
                                <Label htmlFor={`field-${field.key}`} className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
                                    {field.label}
                                </Label>
                                <div className="relative">
                                    <Input
                                        id={`field-${field.key}`}
                                        type={field.type === 'password' && !showSecrets[field.key] ? 'password' : 'text'}
                                        placeholder={field.placeholder}
                                        value={credentials[field.key] || ''}
                                        onChange={e => setCredentials(prev => ({ ...prev, [field.key]: e.target.value }))}
                                        className="bg-zinc-900 border-zinc-800 text-zinc-200 placeholder:text-zinc-600 pr-10"
                                    />
                                    {field.type === 'password' && (
                                        <button
                                            type="button"
                                            className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
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
                            <div className="text-sm text-zinc-500 p-4 text-center border border-dashed border-zinc-800 rounded-md">
                                No credential fields defined for this provider.
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex justify-end gap-2 pt-2">
                            <Button
                                variant="outline"
                                size="sm"
                                className="bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800"
                                onClick={() => setConfigOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                size="sm"
                                className="bg-gradient-to-r from-blue-600 to-blue-500 text-white border-0 hover:from-blue-500 hover:to-blue-400"
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
