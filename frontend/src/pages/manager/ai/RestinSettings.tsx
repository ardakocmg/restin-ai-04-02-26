import React, { useState, useEffect, useMemo } from 'react';
import {
    Brain, Bot, Phone, Wand2, Radar, Users, Shield, MapPin, Save,
    Activity, TrendingUp, BarChart3, Clock, AlertCircle, CheckCircle2,
    Settings, Zap, RefreshCw, History, ToggleLeft, ToggleRight,
    MessageSquare, Mic, Palette, Target, ChevronRight, Loader2,
    Database, Eye, ArrowUpRight, Layers, Key, Cpu
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useVenue } from '@/context/VenueContext';
import { useAuth } from '@/features/auth/AuthContext';
import api from '@/lib/api';
import { toast } from 'sonner';
import AIProvidersTab from './AIProvidersTab';

// ─── Types ─────────────────────────────────────────
interface ModuleConfig {
    module: string;
    level: string;
    venue_id?: string;
    config: Record<string, unknown>;
    is_default: boolean;
    updated_at: string | null;
    updated_by: string | null;
}

interface ModuleStatus {
    enabled: boolean;
    has_system_config: boolean;
    has_venue_config: boolean;
    last_updated: string | null;
    updated_by: string | null;
}

interface UsageByModule {
    total_requests: number;
    total_tokens: number;
    total_cost_usd: number;
    avg_latency_ms: number;
    error_rate: number;
    success_count: number;
    error_count: number;
}

interface AuditEntry {
    module: string;
    level: string;
    venue_id?: string;
    changed_by: string;
    changed_at: string;
    new_config: Record<string, unknown>;
}

// ─── Module Metadata ──────────────────────────────
const MODULE_META: Record<string, { icon: React.ComponentType<{ className?: string }>; label: string; color: string; desc: string }> = {
    copilot: { icon: Bot, label: 'Hey Rin', color: 'text-blue-400', desc: 'Ask Data, get insights, take action' },
    voice: { icon: Phone, label: 'Voice AI', color: 'text-emerald-400', desc: '24/7 AI receptionist & phone system' },
    studio: { icon: Wand2, label: 'Studio', color: 'text-purple-400', desc: 'Generative content & marketing' },
    radar: { icon: Target, label: 'Market Radar', color: 'text-amber-400', desc: 'Competitor intel & dynamic pricing' },
    crm: { icon: Users, label: 'CRM Autopilot', color: 'text-rose-400', desc: 'Guest retention & campaigns' },
};

// ─── Helper ───────────────────────────────────────
function timeAgo(dateStr: string | null | undefined): string {
    if (!dateStr) return 'Never';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
}

function formatNumber(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return n.toString();
}

// ─── Main Component ───────────────────────────────
export default function RestinSettings() {
    const { activeVenue } = useVenue();
    const { user } = useAuth();
    const isSystemAdmin = user?.role?.toUpperCase() === 'PRODUCT_OWNER';
    const venueId = activeVenue?.id || '';

    const [activeTab, setActiveTab] = useState('overview');
    const [activeModule, setActiveModule] = useState<string | null>(null);
    const [configLevel, setConfigLevel] = useState<'system' | 'venue'>(isSystemAdmin ? 'system' : 'venue');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [analyticsDays, setAnalyticsDays] = useState(7);

    // Data
    const [moduleStatuses, setModuleStatuses] = useState<Record<string, ModuleStatus>>({});
    const [moduleConfig, setModuleConfig] = useState<ModuleConfig | null>(null);
    const [editConfig, setEditConfig] = useState<Record<string, unknown>>({});
    const [analytics, setAnalytics] = useState<{
        usage_by_module: Record<string, UsageByModule>;
        daily_trend: Array<{ date: string; module: string; requests: number; tokens: number; cost: number }>;
        learning_history: AuditEntry[];
        active_modules: number;
    } | null>(null);
    const [auditHistory, setAuditHistory] = useState<AuditEntry[]>([]);

    // ─── Fetch Overview Data ──────────────────────
    const fetchOverview = async () => {
        setLoading(true);
        try {
            const [statusRes, analyticsRes] = await Promise.all([
                api.get(`/ai/settings/all/status${venueId ? `?venue_id=${venueId}` : ''}`),
                api.get(`/ai/settings/analytics/overview?days=${analyticsDays}${venueId ? `&venue_id=${venueId}` : ''}`)
            ]);
            setModuleStatuses(statusRes.data.modules || {});
            setAnalytics(analyticsRes.data);
        } catch {
            // Graceful fallback
            setModuleStatuses({});
            setAnalytics(null);
        } finally {
            setLoading(false);
        }
    };

    // ─── Fetch Module Config ──────────────────────
    const fetchModuleConfig = async (mod: string) => {
        try {
            const params = new URLSearchParams({ level: configLevel });
            if (configLevel === 'venue' && venueId) params.set('venue_id', venueId);
            const res = await api.get(`/ai/settings/${mod}?${params}`);
            setModuleConfig(res.data);
            setEditConfig(res.data.config || {});
        } catch {
            toast.error('Failed to load module config');
        }
    };

    // ─── Fetch Audit ──────────────────────────────
    const fetchAudit = async () => {
        try {
            const res = await api.get('/ai/settings/audit/history?limit=50');
            setAuditHistory(res.data.history || []);
        } catch {
            setAuditHistory([]);
        }
    };

    // ─── Save Config ──────────────────────────────
    const handleSave = async () => {
        if (!activeModule) return;
        setSaving(true);
        try {
            await api.put(`/ai/settings/${activeModule}`, {
                level: configLevel,
                venue_id: configLevel === 'venue' ? venueId : undefined,
                config: editConfig
            });
            toast.success(`${MODULE_META[activeModule]?.label} config saved!`);
            await fetchOverview();
        } catch {
            toast.error('Failed to save config');
        } finally {
            setSaving(false);
        }
    };

    useEffect(() => {
        fetchOverview();
    }, [analyticsDays, venueId]);

    useEffect(() => {
        if (activeModule) fetchModuleConfig(activeModule);
    }, [activeModule, configLevel]);

    useEffect(() => {
        if (activeTab === 'history') fetchAudit();
    }, [activeTab]);

    // ─── Computed ─────────────────────────────────
    const totalRequests = useMemo(() => {
        if (!analytics?.usage_by_module) return 0;
        return Object.values(analytics.usage_by_module).reduce((sum, m) => sum + m.total_requests, 0);
    }, [analytics]);

    const totalTokens = useMemo(() => {
        if (!analytics?.usage_by_module) return 0;
        return Object.values(analytics.usage_by_module).reduce((sum, m) => sum + m.total_tokens, 0);
    }, [analytics]);

    const totalCost = useMemo(() => {
        if (!analytics?.usage_by_module) return 0;
        return Object.values(analytics.usage_by_module).reduce((sum, m) => sum + m.total_cost_usd, 0);
    }, [analytics]);

    const avgLatency = useMemo(() => {
        if (!analytics?.usage_by_module) return 0;
        const vals = Object.values(analytics.usage_by_module);
        if (vals.length === 0) return 0;
        return vals.reduce((sum, m) => sum + m.avg_latency_ms, 0) / vals.length;
    }, [analytics]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
            </div>
        );
    }

    // ─── Config Editor for a Module ───────────────
    const renderConfigEditor = () => {
        if (!activeModule) return null;
        const meta = MODULE_META[activeModule];
        const Icon = meta.icon;

        return (
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg bg-zinc-800 ${meta.color}`}>
                            <Icon className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-zinc-100">{meta.label} Settings</h3>
                            <p className="text-xs text-zinc-500">{meta.desc}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {isSystemAdmin ? (
                            <Select value={configLevel} onValueChange={(v: 'system' | 'venue') => setConfigLevel(v)}>
                                <SelectTrigger className="w-28 h-8 text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="system"><span className="flex items-center gap-1"><Shield className="w-3 h-3" /> System</span></SelectItem>
                                    <SelectItem value="venue" disabled={!venueId}><span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> Venue</span></SelectItem>
                                </SelectContent>
                            </Select>
                        ) : (
                            <Badge variant="outline" className="text-xs text-zinc-400">
                                <MapPin className="w-3 h-3 mr-1" /> Venue
                            </Badge>
                        )}
                        {moduleConfig?.is_default && <Badge className="bg-zinc-700 text-zinc-300 text-[10px]">Default</Badge>}
                    </div>
                </div>

                <Card className="bg-zinc-900/60 border-zinc-800">
                    <CardContent className="p-4 space-y-4">
                        {/* Module Enabled Toggle */}
                        <div className="flex items-center justify-between py-2 border-b border-zinc-800">
                            <div>
                                <Label className="text-sm font-medium">Module Enabled</Label>
                                <p className="text-xs text-zinc-500">Turn {meta.label} on or off</p>
                            </div>
                            <Switch
                                checked={editConfig.enabled as boolean ?? false}
                                onCheckedChange={(v) => setEditConfig(prev => ({ ...prev, enabled: v }))}
                            />
                        </div>

                        {/* Module-specific fields */}
                        {activeModule === 'copilot' && renderCopilotFields()}
                        {activeModule === 'voice' && renderVoiceFields()}
                        {activeModule === 'studio' && renderStudioFields()}
                        {activeModule === 'radar' && renderRadarFields()}
                        {activeModule === 'crm' && renderCrmFields()}

                        <div className="flex items-center justify-between pt-3 border-t border-zinc-800">
                            <div className="text-xs text-zinc-500">
                                {moduleConfig?.updated_at
                                    ? `Last updated ${timeAgo(moduleConfig.updated_at)} by ${moduleConfig.updated_by}`
                                    : 'Using default configuration'}
                            </div>
                            <Button size="sm" onClick={handleSave} disabled={saving}>
                                <Save className="w-3.5 h-3.5 mr-1" />
                                {saving ? 'Saving...' : 'Save Settings'}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    };

    // ─── Module-specific Fields ───────────────────
    const renderCopilotFields = () => (
        <div className="space-y-3">
            <div>
                <Label className="text-xs text-zinc-500">Personality</Label>
                <Select value={editConfig.personality as string || 'professional'} onValueChange={(v) => setEditConfig(p => ({ ...p, personality: v }))}>
                    <SelectTrigger className="h-8 text-sm bg-zinc-800 border-zinc-700"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="professional">Professional</SelectItem>
                        <SelectItem value="friendly">Friendly</SelectItem>
                        <SelectItem value="concise">Concise</SelectItem>
                        <SelectItem value="detailed">Detailed</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div>
                <Label className="text-xs text-zinc-500">Greeting Message</Label>
                <Textarea
                    value={editConfig.greeting as string || ''}
                    onChange={(e) => setEditConfig(p => ({ ...p, greeting: e.target.value }))}
                    className="text-sm bg-zinc-800 border-zinc-700 min-h-[60px]"
                />
            </div>
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <Label className="text-xs text-zinc-500">Max Context Tokens</Label>
                    <Input type="number" value={editConfig.max_context_tokens as number || 4000} onChange={(e) => setEditConfig(p => ({ ...p, max_context_tokens: parseInt(e.target.value) || 4000 }))} className="h-8 text-sm bg-zinc-800 border-zinc-700" />
                </div>
                <div>
                    <Label className="text-xs text-zinc-500">Temperature</Label>
                    <Input type="number" step="0.1" min="0" max="1" value={editConfig.temperature as number || 0.3} onChange={(e) => setEditConfig(p => ({ ...p, temperature: parseFloat(e.target.value) || 0.3 }))} className="h-8 text-sm bg-zinc-800 border-zinc-700" />
                </div>
            </div>
            <div className="space-y-2">
                <Label className="text-xs text-zinc-500">Action Permissions</Label>
                {['can_refund', 'can_void', 'can_comp', 'can_modify_menu'].map((perm) => {
                    const perms = (editConfig.action_permissions || {}) as Record<string, boolean>;
                    return (
                        <div key={perm} className="flex items-center justify-between">
                            <span className="text-xs text-zinc-400 capitalize">{perm.replace('can_', '').replace('_', ' ')}</span>
                            <Switch checked={perms[perm] ?? false} onCheckedChange={(v) => setEditConfig(p => ({ ...p, action_permissions: { ...(p.action_permissions as Record<string, boolean> || {}), [perm]: v } }))} />
                        </div>
                    );
                })}
            </div>
        </div>
    );

    const renderVoiceFields = () => (
        <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <Label className="text-xs text-zinc-500">Persona</Label>
                    <Select value={editConfig.persona as string || 'receptionist'} onValueChange={(v) => setEditConfig(p => ({ ...p, persona: v }))}>
                        <SelectTrigger className="h-8 text-sm bg-zinc-800 border-zinc-700"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="receptionist">Receptionist</SelectItem>
                            <SelectItem value="concierge">Concierge</SelectItem>
                            <SelectItem value="sommelier">Sommelier</SelectItem>
                            <SelectItem value="host">Host</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div>
                    <Label className="text-xs text-zinc-500">Language</Label>
                    <Select value={editConfig.language as string || 'en'} onValueChange={(v) => setEditConfig(p => ({ ...p, language: v }))}>
                        <SelectTrigger className="h-8 text-sm bg-zinc-800 border-zinc-700"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="en">English</SelectItem>
                            <SelectItem value="mt">Maltese</SelectItem>
                            <SelectItem value="it">Italian</SelectItem>
                            <SelectItem value="tr">Turkish</SelectItem>
                            <SelectItem value="de">German</SelectItem>
                            <SelectItem value="fr">French</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <div>
                <Label className="text-xs text-zinc-500">Greeting Message</Label>
                <Textarea value={editConfig.greeting_message as string || ''} onChange={(e) => setEditConfig(p => ({ ...p, greeting_message: e.target.value }))} className="text-sm bg-zinc-800 border-zinc-700 min-h-[60px]" />
            </div>
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <Label className="text-xs text-zinc-500">Operating Hours Start</Label>
                    <Input type="time" value={(editConfig.operating_hours as Record<string, string>)?.start || '09:00'} onChange={(e) => setEditConfig(p => ({ ...p, operating_hours: { ...(p.operating_hours as Record<string, string> || {}), start: e.target.value } }))} className="h-8 text-sm bg-zinc-800 border-zinc-700" />
                </div>
                <div>
                    <Label className="text-xs text-zinc-500">Operating Hours End</Label>
                    <Input type="time" value={(editConfig.operating_hours as Record<string, string>)?.end || '23:00'} onChange={(e) => setEditConfig(p => ({ ...p, operating_hours: { ...(p.operating_hours as Record<string, string> || {}), end: e.target.value } }))} className="h-8 text-sm bg-zinc-800 border-zinc-700" />
                </div>
            </div>
            <div>
                <Label className="text-xs text-zinc-500">Max Call Duration (seconds)</Label>
                <Input type="number" value={editConfig.max_call_duration_seconds as number || 300} onChange={(e) => setEditConfig(p => ({ ...p, max_call_duration_seconds: parseInt(e.target.value) || 300 }))} className="h-8 text-sm bg-zinc-800 border-zinc-700" />
            </div>
            <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-400">Transfer to Human</span>
                <Switch checked={editConfig.transfer_to_human_enabled as boolean ?? true} onCheckedChange={(v) => setEditConfig(p => ({ ...p, transfer_to_human_enabled: v }))} />
            </div>
        </div>
    );

    const renderStudioFields = () => (
        <div className="space-y-3">
            <div>
                <Label className="text-xs text-zinc-500">Brand Tone</Label>
                <Select value={editConfig.brand_tone as string || 'modern'} onValueChange={(v) => setEditConfig(p => ({ ...p, brand_tone: v }))}>
                    <SelectTrigger className="h-8 text-sm bg-zinc-800 border-zinc-700"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="modern">Modern & Clean</SelectItem>
                        <SelectItem value="rustic">Rustic & Warm</SelectItem>
                        <SelectItem value="luxury">Luxury & Elegant</SelectItem>
                        <SelectItem value="casual">Casual & Fun</SelectItem>
                        <SelectItem value="traditional">Traditional</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <Label className="text-xs text-zinc-500">Primary Color</Label>
                    <div className="flex items-center gap-2">
                        <Input type="color" value={editConfig.primary_color as string || '#3b82f6'} onChange={(e) => setEditConfig(p => ({ ...p, primary_color: e.target.value }))} className="h-8 w-12 p-0.5 bg-zinc-800 border-zinc-700 cursor-pointer" />
                        <Input value={editConfig.primary_color as string || '#3b82f6'} onChange={(e) => setEditConfig(p => ({ ...p, primary_color: e.target.value }))} className="h-8 text-xs bg-zinc-800 border-zinc-700 font-mono" />
                    </div>
                </div>
                <div>
                    <Label className="text-xs text-zinc-500">Secondary Color</Label>
                    <div className="flex items-center gap-2">
                        <Input type="color" value={editConfig.secondary_color as string || '#8b5cf6'} onChange={(e) => setEditConfig(p => ({ ...p, secondary_color: e.target.value }))} className="h-8 w-12 p-0.5 bg-zinc-800 border-zinc-700 cursor-pointer" />
                        <Input value={editConfig.secondary_color as string || '#8b5cf6'} onChange={(e) => setEditConfig(p => ({ ...p, secondary_color: e.target.value }))} className="h-8 text-xs bg-zinc-800 border-zinc-700 font-mono" />
                    </div>
                </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <Label className="text-xs text-zinc-500">Max Generations / Day</Label>
                    <Input type="number" value={editConfig.max_generations_per_day as number || 20} onChange={(e) => setEditConfig(p => ({ ...p, max_generations_per_day: parseInt(e.target.value) || 20 }))} className="h-8 text-sm bg-zinc-800 border-zinc-700" />
                </div>
                <div>
                    <Label className="text-xs text-zinc-500">Default Style</Label>
                    <Select value={editConfig.default_style as string || 'food-photography'} onValueChange={(v) => setEditConfig(p => ({ ...p, default_style: v }))}>
                        <SelectTrigger className="h-8 text-sm bg-zinc-800 border-zinc-700"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="food-photography">Food Photography</SelectItem>
                            <SelectItem value="flat-lay">Flat Lay</SelectItem>
                            <SelectItem value="lifestyle">Lifestyle</SelectItem>
                            <SelectItem value="minimal">Minimal</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-400">Reality-First Protocol</span>
                <Switch checked={editConfig.reality_first as boolean ?? true} onCheckedChange={(v) => setEditConfig(p => ({ ...p, reality_first: v }))} />
            </div>
            <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-400">Auto Watermark</span>
                <Switch checked={editConfig.auto_watermark as boolean ?? true} onCheckedChange={(v) => setEditConfig(p => ({ ...p, auto_watermark: v }))} />
            </div>
        </div>
    );

    const renderRadarFields = () => (
        <div className="space-y-3">
            <div>
                <Label className="text-xs text-zinc-500">Monitor Region</Label>
                <Input value={editConfig.monitor_region as string || ''} onChange={(e) => setEditConfig(p => ({ ...p, monitor_region: e.target.value }))} placeholder="e.g. Sliema, Malta" className="h-8 text-sm bg-zinc-800 border-zinc-700" />
            </div>
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <Label className="text-xs text-zinc-500">Price Alert Threshold (%)</Label>
                    <Input type="number" value={editConfig.price_alert_threshold_pct as number || 10} onChange={(e) => setEditConfig(p => ({ ...p, price_alert_threshold_pct: parseInt(e.target.value) || 10 }))} className="h-8 text-sm bg-zinc-800 border-zinc-700" />
                </div>
                <div>
                    <Label className="text-xs text-zinc-500">Scan Frequency (hours)</Label>
                    <Input type="number" value={editConfig.scan_frequency_hours as number || 24} onChange={(e) => setEditConfig(p => ({ ...p, scan_frequency_hours: parseInt(e.target.value) || 24 }))} className="h-8 text-sm bg-zinc-800 border-zinc-700" />
                </div>
            </div>
            <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-400">Allergen Guard</span>
                <Switch checked={editConfig.allergen_guard_enabled as boolean ?? true} onCheckedChange={(v) => setEditConfig(p => ({ ...p, allergen_guard_enabled: v }))} />
            </div>
            <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-400">Yield Management / Dynamic Pricing</span>
                <Switch checked={editConfig.yield_management_enabled as boolean ?? false} onCheckedChange={(v) => setEditConfig(p => ({ ...p, yield_management_enabled: v }))} />
            </div>
        </div>
    );

    const renderCrmFields = () => (
        <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <Label className="text-xs text-zinc-500">Churn Threshold (days since last visit)</Label>
                    <Input type="number" value={editConfig.churn_threshold_days as number || 30} onChange={(e) => setEditConfig(p => ({ ...p, churn_threshold_days: parseInt(e.target.value) || 30 }))} className="h-8 text-sm bg-zinc-800 border-zinc-700" />
                </div>
                <div>
                    <Label className="text-xs text-zinc-500">High-Risk Visit Drop (%)</Label>
                    <Input type="number" value={editConfig.high_risk_visit_drop_pct as number || 50} onChange={(e) => setEditConfig(p => ({ ...p, high_risk_visit_drop_pct: parseInt(e.target.value) || 50 }))} className="h-8 text-sm bg-zinc-800 border-zinc-700" />
                </div>
            </div>
            <div>
                <Label className="text-xs text-zinc-500">LTV Calculation Period (days)</Label>
                <Input type="number" value={editConfig.ltv_calculation_period_days as number || 365} onChange={(e) => setEditConfig(p => ({ ...p, ltv_calculation_period_days: parseInt(e.target.value) || 365 }))} className="h-8 text-sm bg-zinc-800 border-zinc-700" />
            </div>
            <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-400">SMS Notifications</span>
                <Switch checked={editConfig.sms_enabled as boolean ?? false} onCheckedChange={(v) => setEditConfig(p => ({ ...p, sms_enabled: v }))} />
            </div>
            <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-400">Auto Campaigns</span>
                <Switch checked={editConfig.auto_campaign_enabled as boolean ?? false} onCheckedChange={(v) => setEditConfig(p => ({ ...p, auto_campaign_enabled: v }))} />
            </div>
        </div>
    );

    // ─── Render ───────────────────────────────────
    return (
        <div className="space-y-6 p-1">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Brain className="w-7 h-7 text-blue-400" />
                        Restin.ai Control Center
                    </h1>
                    <p className="text-sm text-zinc-400 mt-1">
                        {isSystemAdmin
                            ? 'System-wide AI module settings, analytics & learning history'
                            : `AI module settings for ${activeVenue?.name || 'your venue'}`}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/20">
                        <Activity className="w-3 h-3 mr-1" /> {analytics?.active_modules || 0} / 5 Active
                    </Badge>
                    <Button variant="outline" size="sm" onClick={fetchOverview}>
                        <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh
                    </Button>
                </div>
            </div>

            {/* KPI Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Card className="bg-zinc-900/60 border-zinc-800">
                    <CardContent className="p-3">
                        <div className="flex items-center gap-2 mb-1">
                            <Zap className="w-3.5 h-3.5 text-blue-400" />
                            <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Requests</span>
                        </div>
                        <p className="text-xl font-bold text-zinc-100">{formatNumber(totalRequests)}</p>
                        <p className="text-[10px] text-zinc-500">last {analyticsDays}d</p>
                    </CardContent>
                </Card>
                <Card className="bg-zinc-900/60 border-zinc-800">
                    <CardContent className="p-3">
                        <div className="flex items-center gap-2 mb-1">
                            <Database className="w-3.5 h-3.5 text-purple-400" />
                            <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Tokens</span>
                        </div>
                        <p className="text-xl font-bold text-zinc-100">{formatNumber(totalTokens)}</p>
                        <p className="text-[10px] text-zinc-500">consumed</p>
                    </CardContent>
                </Card>
                <Card className="bg-zinc-900/60 border-zinc-800">
                    <CardContent className="p-3">
                        <div className="flex items-center gap-2 mb-1">
                            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Cost</span>
                        </div>
                        <p className="text-xl font-bold text-zinc-100">${totalCost.toFixed(2)}</p>
                        <p className="text-[10px] text-zinc-500">estimated</p>
                    </CardContent>
                </Card>
                <Card className="bg-zinc-900/60 border-zinc-800">
                    <CardContent className="p-3">
                        <div className="flex items-center gap-2 mb-1">
                            <Clock className="w-3.5 h-3.5 text-amber-400" />
                            <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Latency</span>
                        </div>
                        <p className="text-xl font-bold text-zinc-100">{avgLatency.toFixed(0)}ms</p>
                        <p className="text-[10px] text-zinc-500">average</p>
                    </CardContent>
                </Card>
            </div>

            {/* Main Tabs */}
            <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); if (v !== 'settings') setActiveModule(null); }}>
                <TabsList className="bg-zinc-900 border-zinc-800">
                    <TabsTrigger value="overview" className="gap-1"><Layers className="w-3.5 h-3.5" /> Modules</TabsTrigger>
                    <TabsTrigger value="settings" className="gap-1"><Settings className="w-3.5 h-3.5" /> Settings</TabsTrigger>
                    <TabsTrigger value="analytics" className="gap-1"><BarChart3 className="w-3.5 h-3.5" /> Analytics</TabsTrigger>
                    <TabsTrigger value="history" className="gap-1"><History className="w-3.5 h-3.5" /> History</TabsTrigger>
                    <TabsTrigger value="providers" className="gap-1"><Cpu className="w-3.5 h-3.5" /> Providers</TabsTrigger>
                </TabsList>

                {/* ─── Modules Overview ─── */}
                <TabsContent value="overview" className="space-y-3 mt-4">
                    {Object.entries(MODULE_META).map(([key, meta]) => {
                        const Icon = meta.icon;
                        const status = moduleStatuses[key];
                        const usage = analytics?.usage_by_module?.[key];
                        return (
                            <Card key={key} className="bg-zinc-900/60 border-zinc-800 hover:border-zinc-700 transition-colors cursor-pointer group" onClick={() => { setActiveModule(key); setActiveTab('settings'); }}>
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2.5 rounded-xl bg-zinc-800 ${meta.color} group-hover:scale-105 transition-transform`}>
                                                <Icon className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h3 className="font-semibold text-zinc-100">{meta.label}</h3>
                                                    {status?.enabled
                                                        ? <Badge className="bg-emerald-500/20 text-emerald-300 text-[10px] px-1.5 py-0"><CheckCircle2 className="w-2.5 h-2.5 mr-0.5" /> Active</Badge>
                                                        : <Badge className="bg-zinc-700 text-zinc-400 text-[10px] px-1.5 py-0">Inactive</Badge>
                                                    }
                                                </div>
                                                <p className="text-xs text-zinc-500">{meta.desc}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-6">
                                            {usage && (
                                                <div className="flex items-center gap-4 text-xs text-zinc-500">
                                                    <span title="Requests"><Zap className="w-3 h-3 inline mr-0.5" />{formatNumber(usage.total_requests)}</span>
                                                    <span title="Tokens"><Database className="w-3 h-3 inline mr-0.5" />{formatNumber(usage.total_tokens)}</span>
                                                    <span title="Cost"><TrendingUp className="w-3 h-3 inline mr-0.5" />${usage.total_cost_usd.toFixed(2)}</span>
                                                    {usage.error_rate > 0 && (
                                                        <span className="text-rose-400" title="Error Rate"><AlertCircle className="w-3 h-3 inline mr-0.5" />{usage.error_rate}%</span>
                                                    )}
                                                </div>
                                            )}
                                            <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </TabsContent>

                {/* ─── Settings Tab ─── */}
                <TabsContent value="settings" className="mt-4">
                    {activeModule ? (
                        renderConfigEditor()
                    ) : (
                        <div className="space-y-3">
                            <p className="text-sm text-zinc-400 mb-3">Select a module to configure:</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {Object.entries(MODULE_META).map(([key, meta]) => {
                                    const Icon = meta.icon;
                                    const status = moduleStatuses[key];
                                    return (
                                        <Card
                                            key={key}
                                            className="bg-zinc-900/60 border-zinc-800 hover:border-zinc-600 transition-all cursor-pointer group"
                                            onClick={() => setActiveModule(key)}
                                        >
                                            <CardContent className="p-4 flex items-center gap-3">
                                                <div className={`p-2 rounded-lg bg-zinc-800 ${meta.color} group-hover:scale-110 transition-transform`}>
                                                    <Icon className="w-5 h-5" />
                                                </div>
                                                <div className="flex-1">
                                                    <p className="text-sm font-semibold text-zinc-100">{meta.label}</p>
                                                    <p className="text-[10px] text-zinc-500">
                                                        {status?.has_venue_config ? 'Venue override ✓' : status?.has_system_config ? 'System config ✓' : 'Default config'}
                                                    </p>
                                                </div>
                                                <ChevronRight className="w-4 h-4 text-zinc-600" />
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </TabsContent>

                {/* ─── Analytics Tab ─── */}
                <TabsContent value="analytics" className="space-y-4 mt-4">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-semibold text-zinc-300">Usage Analytics by Module</h3>
                        <Select value={analyticsDays.toString()} onValueChange={(v) => setAnalyticsDays(parseInt(v))}>
                            <SelectTrigger className="w-28 h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="7">Last 7 days</SelectItem>
                                <SelectItem value="14">Last 14 days</SelectItem>
                                <SelectItem value="30">Last 30 days</SelectItem>
                                <SelectItem value="90">Last 90 days</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Module usage bars */}
                    <div className="space-y-2">
                        {Object.entries(MODULE_META).map(([key, meta]) => {
                            const usage = analytics?.usage_by_module?.[key];
                            const Icon = meta.icon;
                            const maxReq = Math.max(...Object.values(analytics?.usage_by_module || {}).map(u => u.total_requests), 1);
                            const pct = usage ? (usage.total_requests / maxReq) * 100 : 0;
                            return (
                                <Card key={key} className="bg-zinc-900/60 border-zinc-800">
                                    <CardContent className="p-3">
                                        <div className="flex items-center gap-3 mb-2">
                                            <Icon className={`w-4 h-4 ${meta.color}`} />
                                            <span className="text-xs font-medium text-zinc-200 w-28">{meta.label}</span>
                                            <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
                                                    style={{ width: `${pct}%` }}
                                                />
                                            </div>
                                            <span className="text-xs text-zinc-400 w-16 text-right">{formatNumber(usage?.total_requests || 0)} req</span>
                                        </div>
                                        {usage && (
                                            <div className="flex items-center gap-4 text-[10px] text-zinc-500 ml-7">
                                                <span>{formatNumber(usage.total_tokens)} tokens</span>
                                                <span>${usage.total_cost_usd.toFixed(3)}</span>
                                                <span>{usage.avg_latency_ms.toFixed(0)}ms avg</span>
                                                <span className={usage.error_rate > 5 ? 'text-rose-400' : ''}>{usage.error_rate}% errors</span>
                                                <span className="text-emerald-400">{usage.success_count} ok</span>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>

                    {/* Daily trend (simple table) */}
                    {analytics?.daily_trend && analytics.daily_trend.length > 0 && (
                        <Card className="bg-zinc-900/60 border-zinc-800">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm">Daily Trend</CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="max-h-64 overflow-auto">
                                    <table className="w-full text-xs">
                                        <thead className="sticky top-0 bg-zinc-900">
                                            <tr className="border-b border-zinc-800">
                                                <th className="text-left px-3 py-2 text-zinc-400">Date</th>
                                                <th className="text-left px-3 py-2 text-zinc-400">Module</th>
                                                <th className="text-right px-3 py-2 text-zinc-400">Requests</th>
                                                <th className="text-right px-3 py-2 text-zinc-400">Tokens</th>
                                                <th className="text-right px-3 py-2 text-zinc-400">Cost</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {analytics.daily_trend.map((d, i) => (
                                                <tr key={i} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                                                    <td className="px-3 py-1.5 text-zinc-300">{d.date}</td>
                                                    <td className="px-3 py-1.5">
                                                        <Badge className={`text-[9px] ${MODULE_META[d.module]?.color || ''}`}>{d.module}</Badge>
                                                    </td>
                                                    <td className="px-3 py-1.5 text-right text-zinc-300">{d.requests}</td>
                                                    <td className="px-3 py-1.5 text-right text-zinc-400">{formatNumber(d.tokens)}</td>
                                                    <td className="px-3 py-1.5 text-right text-zinc-400">${d.cost.toFixed(4)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>

                {/* ─── History / Learning Tab ─── */}
                <TabsContent value="history" className="space-y-4 mt-4">
                    <h3 className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
                        <History className="w-4 h-4 text-zinc-500" />
                        Configuration Changes & Learning History
                    </h3>
                    {auditHistory.length === 0 ? (
                        <Card className="bg-zinc-900/60 border-zinc-800">
                            <CardContent className="p-8 text-center">
                                <History className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
                                <p className="text-sm text-zinc-400">No configuration changes recorded yet</p>
                                <p className="text-xs text-zinc-600 mt-1">Changes will appear here as you modify module settings</p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="space-y-2">
                            {auditHistory.map((entry, i) => {
                                const meta = MODULE_META[entry.module];
                                const Icon = meta?.icon || Settings;
                                return (
                                    <Card key={i} className="bg-zinc-900/60 border-zinc-800">
                                        <CardContent className="p-3 flex items-center gap-3">
                                            <div className={`p-1.5 rounded-lg bg-zinc-800 ${meta?.color || 'text-zinc-400'}`}>
                                                <Icon className="w-4 h-4" />
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-medium text-zinc-200">{meta?.label || entry.module}</span>
                                                    <Badge variant="outline" className="text-[9px] text-zinc-500">{entry.level}</Badge>
                                                    {entry.venue_id && <Badge variant="outline" className="text-[9px] text-zinc-500"><MapPin className="w-2.5 h-2.5 mr-0.5" /> {entry.venue_id.slice(0, 8)}</Badge>}
                                                </div>
                                                <p className="text-[10px] text-zinc-500">
                                                    Changed by <span className="text-zinc-400">{entry.changed_by}</span> · {timeAgo(entry.changed_at)}
                                                </p>
                                            </div>
                                            <span title="View change details"><Eye className="w-4 h-4 text-zinc-600 cursor-pointer hover:text-zinc-400" /></span>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    )}
                </TabsContent>

                {/* ─── AI Providers ─── */}
                <TabsContent value="providers">
                    <AIProvidersTab />
                </TabsContent>
            </Tabs>
        </div>
    );
}
