import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card,CardContent,CardDescription,CardHeader,CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select,SelectContent,SelectItem,SelectTrigger,SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs,TabsContent,TabsList,TabsTrigger } from '@/components/ui/tabs';
import { useVenue } from '@/context/VenueContext';
import { useAuth } from '@/features/auth/AuthContext';
import api from '@/lib/api';
import {
AlertCircle,
BarChart3,
Brain,
CheckCircle2,
Database,
Image,
Key,
Layers,
MapPin,
Mic,
RefreshCw,Save,
Settings,
Shield,
TrendingUp,
Zap
} from 'lucide-react';
import React,{ useCallback,useEffect,useState } from 'react';
import { toast } from 'sonner';

interface AIModel {
    id: string;
    category: string;
    tier: string;
    name: string;
    description: string;
    rpm: number;
    tpm: number | null;
    rpd: number;
    default_tasks: string[];
}

interface AIConfig {
    level: string;
    level_id: string;
    enabled_models?: string[];
    routing?: Record<string, string>;
    features?: Record<string, boolean>;
    limits?: { daily_token_limit?: number; monthly_cost_cap_usd?: number };
    message?: string;
    updated_at?: string;
    updated_by?: string;
}

interface UsageStats {
    period_days: number;
    total_tokens: number;
    total_requests: number;
    total_cost_usd: number;
    breakdown: Array<{
        model: string;
        key: string;
        action: string;
        tokens: number;
        requests: number;
        cost_usd: number;
    }>;
}

interface GeminiStatus {
    status: string;
    total_keys: number;
    active_key: string;
    keys: string[];
    models: string[];
    routing: Record<string, string>;
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
    text: <Brain className="w-4 h-4" />,
    image: <Image className="w-4 h-4" />,
    tts: <Mic className="w-4 h-4" />,
    embedding: <Database className="w-4 h-4" />,
};

const _CATEGORY_COLORS: Record<string, string> = {
    text: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    image: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    tts: 'bg-green-500/10 text-green-400 border-green-500/20',
    embedding: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
};

/** Map tier to a user-friendly speed / cost label */
const TIER_LABEL: Record<string, { text: string; class: string }> = {
    lite: { text: '⚡ Fast & Cheap', class: 'bg-emerald-600/20 text-emerald-300' },
    standard: { text: '⚙️ Balanced', class: 'bg-blue-600/20 text-blue-300' },
    premium: { text: '🧠 Most Capable', class: 'bg-amber-500/20 text-amber-300' },
};

const TASK_LABELS: Record<string, string> = {
    analysis: '📊 Analysis',
    strategy: '🎯 Strategy',
    market: '📈 Market Radar',
    content: '✍️ Content',
    studio: '🎨 Studio',
    chat: '💬 Chat',
    voice: '🎙️ Voice AI',
    copilot: '🤖 Copilot',
    image: '🖼️ Image Gen',
    tts: '🔊 Text-to-Speech',
    embedding: '🔗 Embeddings',
    default: '⚙️ Default',
};

export default function AIModelConfig() {
    const { activeVenue } = useVenue();
    const { user } = useAuth();
    const isSystemAdmin = user?.role?.toUpperCase() === 'PRODUCT_OWNER';
    const [models, setModels] = useState<AIModel[]>([]);
    const [_defaultRouting, setDefaultRouting] = useState<Record<string, string>>({});
    const [geminiStatus, setGeminiStatus] = useState<GeminiStatus | null>(null);
    const [_systemConfig, setSystemConfig] = useState<AIConfig | null>(null);
    const [venueConfig, setVenueConfig] = useState<AIConfig | null>(null);
    const [resolvedConfig, setResolvedConfig] = useState<AIConfig | null>(null);
    const [usageStats, setUsageStats] = useState<UsageStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState('overview');
    const [usageDays, setUsageDays] = useState(7);

    // Editable routing state
    const [editRouting, setEditRouting] = useState<Record<string, string>>({});
    const [editFeatures, setEditFeatures] = useState<Record<string, boolean>>({});
    const [editLimits, setEditLimits] = useState({ daily_token_limit: 100000, monthly_cost_cap_usd: 50 });
    // Non-system users can only edit venue config
    const [configLevel, setConfigLevel] = useState<'system' | 'venue'>(isSystemAdmin ? 'system' : 'venue');

    const venueId = activeVenue?.id || '';

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const promises: Promise<any>[] = [
                api.get('/ai/models'),
                isSystemAdmin ? api.get('/ai/gemini/status') : Promise.resolve({ data: null }),
                isSystemAdmin ? api.get('/ai/config/system') : Promise.resolve({ data: null }),
                venueId ? api.get(`/ai/config/resolved/${venueId}`) : Promise.resolve({ data: null }),
                api.get(`/ai/gemini/usage?days=${usageDays}${venueId ? `&venue_id=${venueId}` : ''}`),
            ];
            const [modelsRes, statusRes, systemRes, resolvedRes, usageRes] = await Promise.all(promises);

            setModels(modelsRes.data.models || []);
            setDefaultRouting(modelsRes.data.default_routing || {});
            setGeminiStatus(statusRes.data);
            setSystemConfig(systemRes.data);
            setResolvedConfig(resolvedRes.data);
            setUsageStats(usageRes.data);

            // Initialize editable state from system config
            const cfg = systemRes.data;
            if (cfg?.routing) setEditRouting(cfg.routing);
            if (cfg?.features) setEditFeatures(cfg.features);
            if (cfg?.limits) setEditLimits(cfg.limits);

            // Load venue config if exists
            if (venueId) {
                try {
                    const venueRes = await api.get(`/ai/config/venue/${venueId}`);
                    setVenueConfig(venueRes.data);
                } catch { /* no venue config yet */ }
            }
        } catch (err) {
            toast.error('Failed');
        } finally {
            setLoading(false);
        }
    }, [venueId, usageDays]);

    useEffect(() => { loadData(); }, [loadData]);

    const handleSaveConfig = async () => {
        setSaving(true);
        try {
            const endpoint = configLevel === 'system'
                ? '/ai/config/system'
                : `/ai/config/venue/${venueId}`;

            await api.put(endpoint, {
                routing: editRouting,
                features: editFeatures,
                limits: editLimits,
            });
            await loadData();
        } catch (err) {
            toast.error('Failed to save config');
        } finally {
            setSaving(false);
        }
    };

    const textModels = models.filter(m => m.category === 'text');

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-6 p-1">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Brain className="w-7 h-7 text-blue-400" />
                        AI Model Configuration
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        {isSystemAdmin
                            ? 'Manage models, routing, and usage across system, groups, and venues'
                            : `Manage AI routing and usage for ${activeVenue?.name || 'your venue'}`}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {isSystemAdmin && geminiStatus?.status === 'connected' && (
                        <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/20">
                            <CheckCircle2 className="w-3 h-3 mr-1" /> Connected
                        </Badge>
                    )}
                    {isSystemAdmin && (
                        <Badge variant="outline" className="text-muted-foreground">
                            <Key className="w-3 h-3 mr-1" /> {geminiStatus?.total_keys || 0} Keys
                        </Badge>
                    )}
                    {!isSystemAdmin && (
                        <Badge variant="outline" className="text-muted-foreground">
                            <MapPin className="w-3 h-3 mr-1" /> Venue Level
                        </Badge>
                    )}
                </div>
            </div>

            {/* Key Status Cards — System Admin Only */}
            {isSystemAdmin && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                    {geminiStatus?.keys?.map((key, i) => (
                        <Card key={key} className="bg-card/60 border-border">
                            <CardContent className="p-3">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-[10px] font-mono text-muted-foreground">KEY {i + 1}</span>
                                    {key === geminiStatus.active_key && (
                                        <Badge className="bg-emerald-500/20 text-emerald-300 text-[10px] px-1 py-0">ACTIVE</Badge>
                                    )}
                                </div>
                                <p className="font-mono text-xs text-secondary-foreground">{key}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Main Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="bg-card border border-border">
                    <TabsTrigger value="overview" className="gap-1"><Layers className="w-3.5 h-3.5" /> Models</TabsTrigger>
                    <TabsTrigger value="routing" className="gap-1"><Settings className="w-3.5 h-3.5" /> Routing</TabsTrigger>
                    <TabsTrigger value="usage" className="gap-1"><BarChart3 className="w-3.5 h-3.5" /> Usage</TabsTrigger>
                    <TabsTrigger value="config" className="gap-1"><Shield className="w-3.5 h-3.5" /> Config</TabsTrigger>
                </TabsList>

                {/* ─── Models Tab ─── */}
                <TabsContent value="overview" className="space-y-4 mt-4">
                    {['text', 'image', 'tts', 'embedding'].map(cat => {
                        const catModels = models.filter(m => m.category === cat);
                        if (!catModels.length) return null;
                        return (
                            <div key={cat}>
                                <h3 className="text-sm font-semibold text-secondary-foreground mb-2 flex items-center gap-2">
                                    {CATEGORY_ICONS[cat]}
                                    {cat.charAt(0).toUpperCase() + cat.slice(1)} Models ({catModels.length})
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {catModels.map(model => (
                                        <Card key={model.id} className="bg-card/60 border-border hover:border-border transition-colors">
                                            <CardContent className="p-4">
                                                <div className="flex items-start justify-between mb-2">
                                                    <div>
                                                        <h4 className="font-semibold text-sm text-foreground">{model.name}</h4>
                                                        <p className="text-xs text-muted-foreground font-mono">{model.id}</p>
                                                    </div>
                                                    <Badge className={`text-[10px] ${TIER_LABEL[model.tier]?.class || ''}`}>
                                                        {TIER_LABEL[model.tier]?.text || model.tier}
                                                    </Badge>
                                                </div>
                                                <p className="text-xs text-muted-foreground mb-3">{model.description}</p>
                                                <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                                                    <span className="flex items-center gap-1"><Zap className="w-3 h-3" /> {model.rpm ?? '—'} RPM</span>
                                                    <span className="flex items-center gap-1"><TrendingUp className="w-3 h-3" /> {(model.rpd ?? 0).toLocaleString()} RPD</span>
                                                </div>
                                                {(model.default_tasks?.length ?? 0) > 0 && (
                                                    <div className="flex flex-wrap gap-1 mt-2">
                                                        {(model.default_tasks || []).map(task => (
                                                            <Badge key={task} variant="outline" className="text-[10px] text-muted-foreground border-border">
                                                                {task}
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                )}
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </TabsContent>

                {/* ─── Routing Tab ─── */}
                <TabsContent value="routing" className="space-y-4 mt-4">
                    <Card className="bg-card/60 border-border">
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-base">Task → Model Routing</CardTitle>
                                    <CardDescription>Assign which model handles each task type</CardDescription>
                                </div>
                                <div className="flex items-center gap-2">
                                    {isSystemAdmin ? (
                                        <Select aria-label="Select option" value={configLevel} onValueChange={(v: 'system' | 'venue') => setConfigLevel(v)}>
                                            <SelectTrigger aria-label="Select option" className="w-32 h-8 text-xs">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="system">
                                                    <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> System</span>
                                                </SelectItem>
                                                <SelectItem value="venue" disabled={!venueId}>
                                                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> Venue</span>
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                    ) : (
                                        <Badge variant="outline" className="text-xs text-muted-foreground">
                                            <MapPin className="w-3 h-3 mr-1" /> Venue Override
                                        </Badge>
                                    )}
                                    <Button size="sm" onClick={handleSaveConfig} disabled={saving}>
                                        <Save className="w-3.5 h-3.5 mr-1" />
                                        {saving ? 'Saving...' : 'Save'}
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {Object.entries(editRouting).map(([task, modelId]) => (
                                    <div key={task} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 border border-border">
                                        <span className="text-sm font-medium">
                                            {TASK_LABELS[task] || task}
                                        </span>
                                        <Select aria-label="Select option"
                                            value={modelId}
                                            onValueChange={(v) => setEditRouting(prev => ({ ...prev, [task]: v }))}
                                        >
                                            <SelectTrigger aria-label="Select option" className="w-48 h-8 text-xs">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {textModels.map(m => (
                                                    <SelectItem key={m.id} value={m.id}>
                                                        <span className="flex items-center gap-1.5">
                                                            <Badge className={`text-[9px] px-1 py-0 ${TIER_LABEL[m.tier]?.class || ''}`}>{TIER_LABEL[m.tier]?.text || m.tier}</Badge>
                                                            {m.id}
                                                        </span>
                                                    </SelectItem>
                                                ))}
                                                {models.filter(m => m.category === 'image').map(m => (
                                                    <SelectItem key={m.id} value={m.id}>{m.id}</SelectItem>
                                                ))}
                                                {models.filter(m => m.category === 'tts').map(m => (
                                                    <SelectItem key={m.id} value={m.id}>{m.id}</SelectItem>
                                                ))}
                                                {models.filter(m => m.category === 'embedding').map(m => (
                                                    <SelectItem key={m.id} value={m.id}>{m.id}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Features Toggle */}
                    <Card className="bg-card/60 border-border">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base">AI Features</CardTitle>
                            <CardDescription>Toggle AI features on/off per level</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                {Object.entries(editFeatures).map(([feature, enabled]) => (
                                    <div key={feature} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 border border-border">
                                        <span className="text-sm capitalize">{feature.replace(/_/g, ' ')}</span>
                                        <Switch
                                            checked={enabled}
                                            onCheckedChange={(v) => setEditFeatures(prev => ({ ...prev, [feature]: v }))}
                                        />
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ─── Usage Tab ─── */}
                <TabsContent value="usage" className="space-y-4 mt-4">
                    {/* Period Selector */}
                    <div className="flex items-center gap-2">
                        {[7, 14, 30, 60].map(d => (
                            <Button
                                key={d}
                                size="sm"
                                variant={usageDays === d ? 'default' : 'outline'}
                                onClick={() => setUsageDays(d)}
                                className="text-xs"
                            >
                                {d}d
                            </Button>
                        ))}
                    </div>

                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <Card className="bg-card/60 border-border">
                            <CardContent className="p-4">
                                <p className="text-xs text-muted-foreground mb-1">Total Requests</p>
                                <p className="text-2xl font-bold text-foreground">{usageStats?.total_requests || 0}</p>
                            </CardContent>
                        </Card>
                        <Card className="bg-card/60 border-border">
                            <CardContent className="p-4">
                                <p className="text-xs text-muted-foreground mb-1">Total Tokens</p>
                                <p className="text-2xl font-bold text-foreground">{(usageStats?.total_tokens || 0).toLocaleString()}</p>
                            </CardContent>
                        </Card>
                        <Card className="bg-card/60 border-border">
                            <CardContent className="p-4">
                                <p className="text-xs text-muted-foreground mb-1">Estimated Cost</p>
                                <p className="text-2xl font-bold text-emerald-400">${(usageStats?.total_cost_usd || 0).toFixed(6)}</p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Breakdown Table */}
                    <Card className="bg-card/60 border-border">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base">Usage Breakdown</CardTitle>
                            <CardDescription>Per model, per key, per action</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {usageStats?.breakdown?.length ? (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-border text-muted-foreground text-xs">
                                                <th className="text-left py-2 pl-2">Model</th>
                                                <th className="text-left py-2">Key</th>
                                                <th className="text-left py-2">Action</th>
                                                <th className="text-right py-2">Requests</th>
                                                <th className="text-right py-2">Tokens</th>
                                                <th className="text-right py-2 pr-2">Cost</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {usageStats.breakdown.map((row, i) => (
                                                <tr key={i} className="border-b border-border/50 hover:bg-secondary/30">
                                                    <td className="py-2 pl-2 font-mono text-xs text-secondary-foreground">{row.model}</td>
                                                    <td className="py-2 font-mono text-xs text-muted-foreground">{row.key}</td>
                                                    <td className="py-2">
                                                        <Badge variant="outline" className="text-[10px]">{row.action}</Badge>
                                                    </td>
                                                    <td className="py-2 text-right text-secondary-foreground">{row.requests}</td>
                                                    <td className="py-2 text-right text-secondary-foreground">{row.tokens.toLocaleString()}</td>
                                                    <td className="py-2 text-right text-emerald-400 pr-2">${row.cost_usd.toFixed(6)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="text-center py-8 text-muted-foreground">
                                    <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                    <p className="text-sm">{"No "}usage data for this period</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ─── Config Tab ─── */}
                <TabsContent value="config" className="space-y-4 mt-4">
                    {/* System Config — System Admin Only */}
                    {isSystemAdmin && (
                        <Card className="bg-card/60 border-border">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Shield className="w-4 h-4 text-blue-400" /> System Config
                                </CardTitle>
                                <CardDescription>Global defaults for all groups and venues</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <Label className="text-xs text-muted-foreground">Daily Token Limit</Label>
                                            <Input aria-label="Input field"
                                                type="number"
                                                value={editLimits.daily_token_limit}
                                                onChange={(e) => setEditLimits(prev => ({ ...prev, daily_token_limit: parseInt(e.target.value) || 0 }))}
                                                className="h-8 text-sm bg-secondary border-border"
                                            />
                                        </div>
                                        <div>
                                            <Label className="text-xs text-muted-foreground">Monthly Cost Cap (USD)</Label>
                                            <Input aria-label="Input field"
                                                type="number"
                                                step="0.01"
                                                value={editLimits.monthly_cost_cap_usd}
                                                onChange={(e) => setEditLimits(prev => ({ ...prev, monthly_cost_cap_usd: parseFloat(e.target.value) || 0 }))}
                                                className="h-8 text-sm bg-secondary border-border"
                                            />
                                        </div>
                                    </div>
                                    <Button size="sm" onClick={handleSaveConfig} disabled={saving}>
                                        <Save className="w-3.5 h-3.5 mr-1" />
                                        {saving ? 'Saving...' : 'Save System Config'}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Venue Config */}
                    {venueId && (
                        <Card className="bg-card/60 border-border">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <MapPin className="w-4 h-4 text-amber-400" /> Venue Config
                                    <Badge variant="outline" className="text-[10px]">{activeVenue?.name || venueId}</Badge>
                                </CardTitle>
                                <CardDescription>Override system defaults for this venue</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {venueConfig?.message ? (
                                    <p className="text-sm text-muted-foreground">{venueConfig.message}</p>
                                ) : (
                                    <p className="text-sm text-muted-foreground">
                                        Venue has custom config. Last updated: {venueConfig?.updated_at || 'N/A'}
                                    </p>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {/* Resolved Config Preview */}
                    {resolvedConfig && (
                        <Card className="bg-card/60 border-border">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Layers className="w-4 h-4 text-emerald-400" /> Resolved Config
                                    <Badge className="bg-emerald-500/10 text-emerald-300 text-[10px]">MERGED</Badge>
                                </CardTitle>
                                <CardDescription>Final config after cascade: System → Group → Venue</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <pre className="text-xs text-muted-foreground bg-background p-3 rounded-lg overflow-x-auto max-h-64 overflow-y-auto">
                                    {JSON.stringify(resolvedConfig, null, 2)}
                                </pre>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}
