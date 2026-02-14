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
    Activity, Loader2, Globe, CreditCard, MessageSquare, Mail, Star, Zap,
    ExternalLink, Building2, Search, Lock
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
    GOOGLE_BUSINESS: [
        { key: 'client_id', label: 'OAuth Client ID', type: 'text', placeholder: '123456.apps.googleusercontent.com' },
        { key: 'client_secret', label: 'OAuth Client Secret', type: 'password', placeholder: 'GOCSPX-...' },
        { key: 'location_id', label: 'Business Profile ID', type: 'text', placeholder: 'locations/...' },
    ],
    GOOGLE_WORKSPACE: [
        { key: 'domain', label: 'Workspace Domain', type: 'text', placeholder: 'yourcompany.com' },
        { key: 'admin_email', label: 'Admin Email', type: 'text', placeholder: 'admin@yourcompany.com' },
        { key: 'service_account_key', label: 'Service Account Key', type: 'password', placeholder: '{"type":"service_account",...}' },
    ],
    GOOGLE_MAPS: [
        { key: 'api_key', label: 'Maps API Key', type: 'password', placeholder: 'AIza...' },
    ],
    GOOGLE_ANALYTICS: [
        { key: 'measurement_id', label: 'Measurement ID', type: 'text', placeholder: 'G-XXXXXXXXXX' },
        { key: 'api_secret', label: 'API Secret', type: 'password', placeholder: '••••••••' },
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
    STRIPE: [
        { key: 'api_key', label: 'Secret Key', type: 'password', placeholder: 'sk_live_...' },
        { key: 'publishable_key', label: 'Publishable Key', type: 'text', placeholder: 'pk_live_...' },
        { key: 'webhook_secret', label: 'Webhook Secret', type: 'password', placeholder: 'whsec_...' },
    ],
    TWILIO: [
        { key: 'account_sid', label: 'Account SID', type: 'text', placeholder: 'AC...' },
        { key: 'auth_token', label: 'Auth Token', type: 'password', placeholder: '••••••••' },
        { key: 'phone_number', label: 'From Phone', type: 'text', placeholder: '+1234567890' },
    ],
    SENDGRID: [
        { key: 'api_key', label: 'API Key', type: 'password', placeholder: 'SG...' },
        { key: 'from_email', label: 'From Email', type: 'text', placeholder: 'noreply@yourdomain.com' },
    ],
    OPENAI: [
        { key: 'api_key', label: 'API Key', type: 'password', placeholder: 'sk-...' },
        { key: 'organization_id', label: 'Organization ID', type: 'text', placeholder: 'org-...' },
    ],
    TRIPADVISOR: [
        { key: 'location_id', label: 'Location ID', type: 'text', placeholder: '123456' },
        { key: 'api_key', label: 'API Key', type: 'password', placeholder: '••••••••' },
    ],
};

// ─── Provider Portal URLs (where to get API keys) ───────────────────────
const PORTAL_URLS: Record<string, { url: string; label: string }> = {
    LIGHTSPEED: { url: 'https://www.lightspeedhq.com/pos/integrations/', label: 'Lightspeed Developer Portal →' },
    SHIREBURN: { url: 'https://www.shireburn.com/indigo/', label: 'Shireburn Portal →' },
    APICBASE: { url: 'https://my.apicbase.com/settings/api', label: 'Apicbase API Settings →' },
    GOOGLE_BUSINESS: { url: 'https://console.cloud.google.com/apis/credentials', label: 'Google Cloud Console →' },
    GOOGLE_WORKSPACE: { url: 'https://admin.google.com/', label: 'Google Admin Console →' },
    GOOGLE_MAPS: { url: 'https://console.cloud.google.com/apis/credentials', label: 'Google Cloud Console →' },
    GOOGLE_ANALYTICS: { url: 'https://analytics.google.com/analytics/web/', label: 'Google Analytics →' },
    NUKI: { url: 'https://web.nuki.io/#/pages/web-api', label: 'Nuki Web API Portal →' },
    TUYA: { url: 'https://iot.tuya.com/', label: 'Tuya IoT Platform →' },
    MEROSS: { url: 'https://iot.meross.com/', label: 'Meross Cloud →' },
    QINGPING: { url: 'https://developer.qingping.co/', label: 'Qingping Developer →' },
    STRIPE: { url: 'https://dashboard.stripe.com/apikeys', label: 'Stripe Dashboard →' },
    TWILIO: { url: 'https://console.twilio.com/', label: 'Twilio Console →' },
    SENDGRID: { url: 'https://app.sendgrid.com/settings/api_keys', label: 'SendGrid API Keys →' },
    OPENAI: { url: 'https://platform.openai.com/api-keys', label: 'OpenAI Platform →' },
    TRIPADVISOR: { url: 'https://www.tripadvisor.com/developers', label: 'TripAdvisor API →' },
};

// ─── Provider Definitions (Categorized) ─────────────────────────────────
interface ProviderDef {
    key: string;
    label: string;
    desc: string;
    icon: React.ElementType;
    category: string;
    appLink?: string;
    appLabel?: string;
    color?: string;
}

const PROVIDERS: ProviderDef[] = [
    // POS & Operations
    { key: 'LIGHTSPEED', label: 'Lightspeed K-Series', desc: 'POS Orders, Menu, Shifts', icon: ShoppingCart, category: 'pos' },
    { key: 'APICBASE', label: 'Apicbase', desc: 'Inventory, Recipes, Stock', icon: Database, category: 'pos' },
    // HR & Payroll
    { key: 'SHIREBURN', label: 'Shireburn Indigo', desc: 'HR, Payroll, Leave', icon: Users, category: 'hr' },
    // Google Suite
    { key: 'GOOGLE_BUSINESS', label: 'Business Profile', desc: 'Maps, Reservations & Reviews', icon: Building2, category: 'google', color: '#4285F4', appLink: '/admin/google-workspace', appLabel: 'Workspace' },
    { key: 'GOOGLE_WORKSPACE', label: 'Workspace SSO', desc: 'Single Sign-On, Domain Auth', icon: Lock, category: 'google', color: '#4285F4', appLink: '/admin/google-workspace', appLabel: 'Workspace' },
    { key: 'GOOGLE_MAPS', label: 'Maps API', desc: 'Location Services, Geocoding', icon: Globe, category: 'google', color: '#34A853' },
    { key: 'GOOGLE_ANALYTICS', label: 'Analytics', desc: 'Website & App Tracking', icon: Activity, category: 'google', color: '#E37400' },
    // IoT & Smart Home
    { key: 'NUKI', label: 'Nuki Smart Lock', desc: 'Door Access, Keypad Codes', icon: Lock, category: 'iot', appLink: '/admin/door-access', appLabel: 'Door Control' },
    { key: 'TUYA', label: 'Tuya Smart Life', desc: 'Lights, Switches, Climate', icon: Smartphone, category: 'iot', appLink: '/admin/smart-home', appLabel: 'Smart Home' },
    { key: 'MEROSS', label: 'Meross IoT', desc: 'Plugs, Garage Doors, Sensors', icon: Smartphone, category: 'iot', appLink: '/admin/smart-home', appLabel: 'Smart Home' },
    { key: 'QINGPING', label: 'Qingping Sensors', desc: 'Temp & Humidity Monitoring', icon: Server, category: 'iot' },
    // API Services
    { key: 'STRIPE', label: 'Stripe', desc: 'Payment Processing', icon: CreditCard, category: 'api', color: '#635BFF' },
    { key: 'TWILIO', label: 'Twilio', desc: 'SMS & Voice Notifications', icon: MessageSquare, category: 'api', color: '#F22F46' },
    { key: 'SENDGRID', label: 'SendGrid', desc: 'Email Notifications', icon: Mail, category: 'api', color: '#3368E5' },
    { key: 'OPENAI', label: 'OpenAI / Vertex AI', desc: 'AI-Powered Features', icon: Zap, category: 'api', color: '#10A37F' },
    { key: 'TRIPADVISOR', label: 'TripAdvisor', desc: 'Review Management', icon: Star, category: 'api', color: '#00AA6C' },
];

const CATEGORY_META: Record<string, { label: string; icon: React.ElementType; gradient: string }> = {
    all: { label: 'All', icon: Activity, gradient: 'from-blue-500 to-cyan-500' },
    pos: { label: 'POS & Ops', icon: ShoppingCart, gradient: 'from-violet-500 to-purple-500' },
    hr: { label: 'HR & Payroll', icon: Users, gradient: 'from-rose-500 to-pink-500' },
    google: { label: 'Google', icon: Cloud, gradient: 'from-blue-500 to-green-500' },
    iot: { label: 'IoT & Smart', icon: Smartphone, gradient: 'from-amber-500 to-orange-500' },
    api: { label: 'API Services', icon: Zap, gradient: 'from-emerald-500 to-teal-500' },
};

// ─── Types ──────────────────────────────────────────────────────────────
interface IntegrationConfig {
    key: string;
    enabled: boolean;
    status: string;
    lastSync: string | null;
    config: Record<string, unknown>;
    configured_at: string | null;
    configured_by: string | null;
    organization_id?: string;
    test_mode?: boolean;
}

interface SyncRun {
    provider: string;
    job_type: string;
    status: string;
    started_at: string;
    finished_at: string | null;
    duration_ms: number | null;
    items_processed: number;
    triggered_by: string | null;
}

// ─── Main Dashboard ─────────────────────────────────────────────────────
export default function SyncDashboard() {
    const { activeVenueId } = useVenue();
    const [configs, setConfigs] = useState<IntegrationConfig[]>([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState('all');

    // Config Modal
    const [configOpen, setConfigOpen] = useState(false);
    const [configProvider, setConfigProvider] = useState<string | null>(null);
    const [credentials, setCredentials] = useState<Record<string, string>>({});
    const [configEnabled, setConfigEnabled] = useState(false);
    const [saving, setSaving] = useState(false);
    const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});

    // Sync History
    const [syncHistory, setSyncHistory] = useState<SyncRun[]>([]);

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

    useEffect(() => { fetchConfigs(); fetchSyncHistory(); }, [fetchConfigs, fetchSyncHistory]);

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
    });

    const currentFields = configProvider ? (PROVIDER_FIELDS[configProvider] || []) : [];
    const currentProviderLabel = PROVIDERS.find(p => p.key === configProvider)?.label || configProvider;
    const currentPortal = configProvider ? PORTAL_URLS[configProvider] : null;

    const categories = Object.keys(CATEGORY_META);

    return (
        <div className="space-y-6 p-6 lg:p-8 max-w-[1600px] mx-auto">
            {/* Hero */}
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl lg:text-3xl font-bold text-zinc-100 flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-600 to-blue-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
                            <RefreshCw className="h-5 w-5 text-white" />
                        </div>
                        Integration Control Plane
                    </h1>
                    <p className="text-zinc-400 mt-2 text-sm">
                        Manage all venue connections, APIs, Google services, and IoT — with full audit trail.
                    </p>
                </div>
                <div className="relative w-full lg:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                    <Input
                        placeholder="Search integrations..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 bg-zinc-900 border-zinc-800 text-zinc-200 placeholder:text-zinc-600"
                    />
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Card className="bg-zinc-950/80 border-zinc-800 border-l-2 border-l-emerald-500/50">
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                        </div>
                        <div>
                            <p className="text-xl font-bold text-zinc-100 tabular-nums">{connectedCount}</p>
                            <p className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider">Connected</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-zinc-950/80 border-zinc-800 border-l-2 border-l-red-500/50">
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-red-500/10 flex items-center justify-center">
                            <AlertTriangle className="h-4 w-4 text-red-400" />
                        </div>
                        <div>
                            <p className="text-xl font-bold text-zinc-100 tabular-nums">{errorCount}</p>
                            <p className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider">Errors</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-zinc-950/80 border-zinc-800 border-l-2 border-l-blue-500/50">
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
                            <Activity className="h-4 w-4 text-blue-400" />
                        </div>
                        <div>
                            <p className="text-xl font-bold text-zinc-100 tabular-nums">{totalProviders}</p>
                            <p className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider">Total</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-zinc-950/80 border-zinc-800 border-l-2 border-l-amber-500/50">
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-amber-500/10 flex items-center justify-center">
                            <Clock className="h-4 w-4 text-amber-400" />
                        </div>
                        <div>
                            <p className="text-xl font-bold text-zinc-100 tabular-nums">{syncHistory.length}</p>
                            <p className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider">Sync Runs</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Main Tabs */}
            <Tabs defaultValue="overview" className="space-y-5">
                <TabsList className="bg-zinc-900 border border-zinc-800">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
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
                                            ? `bg-gradient-to-r ${meta.gradient} text-white shadow-lg`
                                            : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                                        }`}
                                >
                                    <CategoryIcon className="h-3.5 w-3.5" />
                                    {meta.label}
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${isActive ? 'bg-white/20' : 'bg-zinc-800 text-zinc-500'}`}>
                                        {connectedInCat}/{count}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Loading */}
                    {loading && (
                        <div className="flex items-center justify-center py-20 text-zinc-500">
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
                        <div className="text-center py-16 text-zinc-500">
                            <Search className="h-10 w-10 mx-auto mb-3 opacity-50" />
                            <p className="text-sm">No integrations match your search.</p>
                        </div>
                    )}
                </TabsContent>

                {/* Sync History Tab */}
                <TabsContent value="runs">
                    <Card className="bg-zinc-950 border-zinc-800">
                        <CardHeader>
                            <CardTitle className="text-zinc-100 text-base">Sync Execution Logs</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {syncHistory.length === 0 ? (
                                <div className="text-sm text-zinc-500 p-8 text-center border border-dashed border-zinc-800 rounded-md">
                                    No sync history yet. Trigger a sync from the Overview tab.
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {syncHistory.map((run, i) => (
                                        <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-zinc-900/50 border border-zinc-800">
                                            <div className="flex items-center gap-3">
                                                <Badge
                                                    variant={run.status === 'SUCCESS' ? 'default' : 'destructive'}
                                                    className={run.status === 'SUCCESS' ? 'bg-emerald-600 text-xs' : 'text-xs'}
                                                >
                                                    {run.status}
                                                </Badge>
                                                <span className="text-sm font-medium text-zinc-200">{run.provider}</span>
                                                <span className="text-xs text-zinc-500">{run.job_type}</span>
                                            </div>
                                            <div className="flex items-center gap-4 text-xs text-zinc-500">
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
                    <Card className="bg-zinc-950 border-zinc-800">
                        <CardHeader>
                            <CardTitle className="text-zinc-100 text-base">Sync Policies</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between p-4 rounded-lg bg-zinc-900/50 border border-zinc-800">
                                <div>
                                    <p className="text-sm font-medium text-zinc-200">Auto-Sync on Startup</p>
                                    <p className="text-xs text-zinc-500 mt-0.5">Sync all enabled providers when the system starts</p>
                                </div>
                                <Switch />
                            </div>
                            <div className="flex items-center justify-between p-4 rounded-lg bg-zinc-900/50 border border-zinc-800">
                                <div>
                                    <p className="text-sm font-medium text-zinc-200">Scheduled Sync (6h interval)</p>
                                    <p className="text-xs text-zinc-500 mt-0.5">Run sync jobs automatically for all connected providers</p>
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

                        {/* Portal link in dialog */}
                        {currentPortal && (
                            <a
                                href={currentPortal.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 p-3 rounded-lg bg-zinc-900/60 border border-zinc-800 hover:border-blue-500/30 hover:bg-blue-500/5 transition-all text-sm text-zinc-300 hover:text-blue-400"
                            >
                                <Globe className="h-4 w-4" />
                                <span className="flex-1">{currentPortal.label}</span>
                                <ExternalLink className="h-3 w-3 opacity-50" />
                            </a>
                        )}

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
                                <Label htmlFor={`field-${field.key}`} className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
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
