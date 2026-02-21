import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card,CardContent,CardHeader,CardTitle } from '@/components/ui/card';
import {
Select,
SelectContent,
SelectItem,
SelectTrigger,
SelectValue,
} from '@/components/ui/select';
import api from '@/lib/api';
import {
Award,
BarChart3,
Brain,
ChevronDown,ChevronRight,
Cpu,
Database,
ExternalLink,
Layers,
Loader2,
RefreshCw,
Sparkles,
TrendingUp,
Wifi,WifiOff,
Zap
} from 'lucide-react';
import React,{ useEffect,useState } from 'react';

// ─── Types ─────────────────────────────────────────
interface ProviderModel {
    id: string;
    name: string;
    tier: string;
    category: string;
}

interface ProviderData {
    id: string;
    display_name: string;
    connected: boolean;
    key_source: string;
    key_count: number;
    capabilities: string[];
    free_tier: string;
    url: string;
    models_total: number;
    models_free: number;
    model_names: ProviderModel[];
    used_in_chains: string[];
    chain_positions: Record<string, number>;
}

interface ShadowInsight {
    model: string;
    provider: string;
    samples: number;
    errors: number;
    success_rate: number;
    avg_overlap: number;
    avg_latency_ms: number;
    total_tokens: number;
}

interface TaskMapping {
    chain: string;
    providers: string[];
    models: string[];
}

interface DashboardData {
    providers: ProviderData[];
    usage: {
        period_days: number;
        total_requests: number;
        total_tokens: number;
        avg_latency_ms: number;
        by_provider: Record<string, number>;
        by_task: Record<string, number>;
    };
    shadow_learning: {
        total_logs: number;
        model_insights: ShadowInsight[];
    };
    task_mapping: Record<string, TaskMapping>;
    summary: {
        providers_connected: number;
        providers_total: number;
        models_total: number;
        models_free: number;
    };
}

// ─── Provider Icons/Colors ─────────────────────────
const PROVIDER_COLORS: Record<string, { bg: string; text: string; glow: string }> = {
    google: { bg: 'bg-blue-500/15', text: 'text-blue-400', glow: 'shadow-blue-500/20' },
    groq: { bg: 'bg-orange-500/15', text: 'text-orange-400', glow: 'shadow-orange-500/20' },
    openai: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', glow: 'shadow-emerald-500/20' },
    anthropic: { bg: 'bg-amber-500/15', text: 'text-amber-400', glow: 'shadow-amber-500/20' },
    mistral: { bg: 'bg-violet-500/15', text: 'text-violet-400', glow: 'shadow-violet-500/20' },
    elevenlabs: { bg: 'bg-pink-500/15', text: 'text-pink-400', glow: 'shadow-pink-500/20' },
    deepgram: { bg: 'bg-teal-500/15', text: 'text-teal-400', glow: 'shadow-teal-500/20' },
    cloudflare: { bg: 'bg-yellow-500/15', text: 'text-yellow-400', glow: 'shadow-yellow-500/20' },
    huggingface: { bg: 'bg-rose-500/15', text: 'text-rose-400', glow: 'shadow-rose-500/20' },
    openrouter: { bg: 'bg-cyan-500/15', text: 'text-cyan-400', glow: 'shadow-cyan-500/20' },
};

const CAPABILITY_LABELS: Record<string, string> = {
    text: 'LLM',
    image: 'Image',
    tts: 'TTS',
    stt: 'STT',
    embedding: 'Embed',
    sentiment: 'Sentiment',
    ner: 'NER',
};

const CHAIN_LABELS: Record<string, string> = {
    text: 'General Text',
    text_premium: 'Premium Text',
    text_reasoning: 'Deep Reasoning',
    speed: 'Speed Priority',
    embedding: 'Embeddings',
    image: 'Image Gen',
    tts: 'Text-to-Speech',
    stt: 'Speech-to-Text',
    sentiment: 'Sentiment',
};

function formatNumber(n: number): string {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
    if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
    return n.toString();
}

// ─── Main Component ───────────────────────────────
export default function AIProvidersTab() {
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [days, setDays] = useState('7');
    const [expandedProvider, setExpandedProvider] = useState<string | null>(null);

    const fetchDashboard = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/ai/dashboard?days=${days}`);
            setData(res.data);
        } catch (err) {
            // Silent fail — show empty state
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboard();
    }, [days]);

    if (loading || !data) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
            </div>
        );
    }

    const { providers, usage, shadow_learning, task_mapping, summary } = data;
    const connectedProviders = providers.filter(p => p.connected);
    const _disconnectedProviders = providers.filter(p => !p.connected);

    // Usage bar chart data
    const maxUsage = Math.max(...Object.values(usage.by_provider), 1);
    const maxTaskUsage = Math.max(...Object.values(usage.by_task), 1);

    return (
        <div className="space-y-6 mt-4">
            {/* ── Summary KPI Strip ── */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <Card className="bg-card/60 border-border">
                    <CardContent className="p-3">
                        <div className="flex items-center gap-2 mb-1">
                            <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Providers</span>
                        </div>
                        <p className="text-xl font-bold text-emerald-400">{summary.providers_connected}<span className="text-muted-foreground">/{summary.providers_total}</span></p>
                    </CardContent>
                </Card>
                <Card className="bg-card/60 border-border">
                    <CardContent className="p-3">
                        <div className="flex items-center gap-2 mb-1">
                            <Cpu className="w-3.5 h-3.5 text-blue-400" />
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Models</span>
                        </div>
                        <p className="text-xl font-bold text-foreground">{summary.models_total} <span className="text-xs text-emerald-400">({summary.models_free} free)</span></p>
                    </CardContent>
                </Card>
                <Card className="bg-card/60 border-border">
                    <CardContent className="p-3">
                        <div className="flex items-center gap-2 mb-1">
                            <Zap className="w-3.5 h-3.5 text-purple-400" />
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Requests</span>
                        </div>
                        <p className="text-xl font-bold text-foreground">{formatNumber(usage.total_requests)}</p>
                        <p className="text-[10px] text-muted-foreground">last {usage.period_days}d</p>
                    </CardContent>
                </Card>
                <Card className="bg-card/60 border-border">
                    <CardContent className="p-3">
                        <div className="flex items-center gap-2 mb-1">
                            <Database className="w-3.5 h-3.5 text-amber-400" />
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Tokens</span>
                        </div>
                        <p className="text-xl font-bold text-foreground">{formatNumber(usage.total_tokens)}</p>
                    </CardContent>
                </Card>
                <Card className="bg-card/60 border-border">
                    <CardContent className="p-3">
                        <div className="flex items-center gap-2 mb-1">
                            <Sparkles className="w-3.5 h-3.5 text-rose-400" />
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Shadow Logs</span>
                        </div>
                        <p className="text-xl font-bold text-foreground">{shadow_learning.total_logs}</p>
                    </CardContent>
                </Card>
            </div>

            {/* ── Provider Grid ── */}
            <div>
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                        <Layers className="w-5 h-5 text-blue-400" />
                        AI Providers
                        <Badge className="bg-emerald-500/20 text-emerald-300 border-0 ml-1">{summary.providers_connected} Connected</Badge>
                    </h2>
                    <div className="flex items-center gap-2">
                        <Select aria-label="Select option" value={days} onValueChange={setDays}>
                            <SelectTrigger aria-label="Select option" className="w-[100px] h-8 bg-card border-border">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="1">24h</SelectItem>
                                <SelectItem value="7">7 days</SelectItem>
                                <SelectItem value="30">30 days</SelectItem>
                                <SelectItem value="90">90 days</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button variant="outline" size="sm" aria-label="Action" className="h-8" onClick={fetchDashboard}>
                            <RefreshCw className="w-3.5 h-3.5" />
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {providers.map(provider => {
                        const colors = PROVIDER_COLORS[provider.id] || PROVIDER_COLORS.google;
                        const isExpanded = expandedProvider === provider.id;
                        const providerUsage = usage.by_provider[provider.id] || 0;

                        return (
                            <Card
                                key={provider.id}
                                className={`border transition-all duration-300 cursor-pointer ${provider.connected
                                    ? `bg-card/80 border-border hover:border-zinc-600 shadow-lg ${colors.glow}`
                                    : 'bg-background/50 border-border/50 opacity-60 hover:opacity-80'
                                    }`}
                                onClick={() => setExpandedProvider(isExpanded ? null : provider.id)}
                            >
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-lg ${colors.bg}`}>
                                                <Cpu className={`w-5 h-5 ${colors.text}`} />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h3 className="font-semibold text-sm text-foreground">{provider.display_name}</h3>
                                                    {provider.connected ? (
                                                        <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                                                    ) : (
                                                        <WifiOff className="w-3.5 h-3.5 text-muted-foreground" />
                                                    )}
                                                </div>
                                                <p className="text-xs text-muted-foreground">{provider.free_tier}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 text-right">
                                            <div>
                                                <p className="text-sm font-mono text-secondary-foreground">{provider.models_total} <span className="text-muted-foreground text-xs">models</span></p>
                                                {provider.models_free > 0 && (
                                                    <p className="text-[10px] text-emerald-400">{provider.models_free} free</p>
                                                )}
                                            </div>
                                            {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                                        </div>
                                    </div>

                                    {/* Capability Tags */}
                                    <div className="flex gap-1.5 mt-2">
                                        {provider.capabilities.map(cap => (
                                            <Badge key={cap} variant="outline" className="text-[10px] px-1.5 py-0 border-border text-muted-foreground">
                                                {CAPABILITY_LABELS[cap] || cap}
                                            </Badge>
                                        ))}
                                        {provider.key_source === 'system' && (
                                            <Badge className="text-[10px] px-1.5 py-0 bg-blue-500/20 text-blue-300 border-0 ml-auto">
                                                System {provider.key_count > 1 ? `(${provider.key_count} keys)` : ''}
                                            </Badge>
                                        )}
                                    </div>

                                    {/* Usage bar */}
                                    {provider.connected && providerUsage > 0 && (
                                        <div className="mt-2">
                                            <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-0.5">
                                                <span>Usage ({usage.period_days}d)</span>
                                                <span>{providerUsage} requests</span>
                                            </div>
                                            <div className="h-1 bg-secondary rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full ${colors.bg.replace('/15', '/60')}`}
                                                    style={{ width: `${Math.max((providerUsage / maxUsage) * 100, 3)}%`  /* keep-inline */ }}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* Expanded Details */}
                                    {isExpanded && (
                                        <div className="mt-3 pt-3 border-t border-border space-y-3 animate-in fade-in duration-200">
                                            {/* Chains */}
                                            {provider.used_in_chains.length > 0 && (
                                                <div>
                                                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Used In Fallback Chains</p>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {provider.used_in_chains.map(chain => (
                                                            <Badge key={chain} className="text-[10px] px-2 py-0.5 bg-secondary text-secondary-foreground border-0">
                                                                {CHAIN_LABELS[chain] || chain}
                                                                {provider.chain_positions[chain] && (
                                                                    <span className="ml-1 text-muted-foreground">#{provider.chain_positions[chain]}</span>
                                                                )}
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Models */}
                                            <div>
                                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Models</p>
                                                <div className="grid grid-cols-1 gap-1">
                                                    {provider.model_names.map(m => (
                                                        <div key={m.id} className="flex items-center justify-between text-xs px-2 py-1 rounded bg-secondary/50">
                                                            <span className="text-secondary-foreground truncate">{m.name}</span>
                                                            <div className="flex gap-1">
                                                                <Badge variant="outline" className="text-[9px] px-1 py-0 border-border text-muted-foreground">
                                                                    {m.category}
                                                                </Badge>
                                                                <Badge className={`text-[9px] px-1 py-0 border-0 ${m.tier === 'free' || m.tier === 'lite' ? 'bg-emerald-500/20 text-emerald-400' :
                                                                    m.tier === 'premium' ? 'bg-amber-500/20 text-amber-400' :
                                                                        'bg-zinc-700 text-secondary-foreground'
                                                                    }`}>
                                                                    {m.tier}
                                                                </Badge>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Link */}
                                            {provider.url && (
                                                <a
                                                    href={provider.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <ExternalLink className="w-3 h-3" /> Manage Keys
                                                </a>
                                            )}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            </div>

            {/* ── Usage Analytics ── */}
            {Object.keys(usage.by_provider).length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* By Provider */}
                    <Card className="bg-card/60 border-border">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm flex items-center gap-2">
                                <BarChart3 className="w-4 h-4 text-blue-400" />
                                Requests by Provider
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            {Object.entries(usage.by_provider).map(([prov, count]) => {
                                const colors = PROVIDER_COLORS[prov] || PROVIDER_COLORS.google;
                                return (
                                    <div key={prov}>
                                        <div className="flex items-center justify-between text-xs mb-0.5">
                                            <span className={`font-medium ${colors.text}`}>{prov}</span>
                                            <span className="text-muted-foreground">{count}</span>
                                        </div>
                                        <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all duration-500 ${colors.bg.replace('/15', '/70')}`}
                                                style={{ width: `${(count / maxUsage) * 100}%`  /* keep-inline */ }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </CardContent>
                    </Card>

                    {/* By Task */}
                    <Card className="bg-card/60 border-border">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm flex items-center gap-2">
                                <Layers className="w-4 h-4 text-purple-400" />
                                Requests by Task Type
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            {Object.entries(usage.by_task).map(([task, count]) => (
                                <div key={task}>
                                    <div className="flex items-center justify-between text-xs mb-0.5">
                                        <span className="font-medium text-secondary-foreground capitalize">{task}</span>
                                        <span className="text-muted-foreground">{count}</span>
                                    </div>
                                    <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                                        <div
                                            className="h-full rounded-full bg-purple-500/60 transition-all duration-500"
                                            style={{ width: `${(count / maxTaskUsage) * 100}%`  /* keep-inline */ }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* ── Shadow Learning Insights ── */}
            {shadow_learning.model_insights.length > 0 && (
                <Card className="bg-card/60 border-border">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                            <Brain className="w-4 h-4 text-rose-400" />
                            Shadow Learning — Model Quality
                            <Badge className="bg-rose-500/20 text-rose-300 border-0 text-[10px] ml-1">
                                {shadow_learning.total_logs} sessions
                            </Badge>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="text-muted-foreground border-b border-border">
                                        <th className="text-left py-2 px-2 font-medium">Model</th>
                                        <th className="text-left py-2 px-2 font-medium">Provider</th>
                                        <th className="text-right py-2 px-2 font-medium">Samples</th>
                                        <th className="text-right py-2 px-2 font-medium">{"Success"}</th>
                                        <th className="text-right py-2 px-2 font-medium">Overlap</th>
                                        <th className="text-right py-2 px-2 font-medium">Latency</th>
                                        <th className="text-right py-2 px-2 font-medium">Tokens</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {shadow_learning.model_insights.map((insight, idx) => {
                                        const colors = PROVIDER_COLORS[insight.provider] || PROVIDER_COLORS.google;
                                        const isBest = idx === 0 && insight.avg_overlap > 0;
                                        return (
                                            <tr key={insight.model} className="border-b border-border/50 hover:bg-secondary/30">
                                                <td className="py-2 px-2">
                                                    <div className="flex items-center gap-1.5">
                                                        {isBest && <Award className="w-3.5 h-3.5 text-amber-400" />}
                                                        <span className="text-secondary-foreground font-medium truncate max-w-[200px]">{insight.model}</span>
                                                    </div>
                                                </td>
                                                <td className="py-2 px-2">
                                                    <Badge className={`text-[10px] px-1.5 py-0 border-0 ${colors.bg} ${colors.text}`}>
                                                        {insight.provider}
                                                    </Badge>
                                                </td>
                                                <td className="py-2 px-2 text-right text-secondary-foreground">{insight.samples}</td>
                                                <td className="py-2 px-2 text-right">
                                                    <span className={insight.success_rate >= 90 ? 'text-emerald-400' : insight.success_rate >= 50 ? 'text-amber-400' : 'text-red-400'}>
                                                        {insight.success_rate}%
                                                    </span>
                                                </td>
                                                <td className="py-2 px-2 text-right">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <div className="w-12 h-1.5 bg-secondary rounded-full overflow-hidden">
                                                            <div
                                                                className={`h-full rounded-full ${insight.avg_overlap >= 0.7 ? 'bg-emerald-500' : insight.avg_overlap >= 0.4 ? 'bg-amber-500' : 'bg-red-500'}`}
                                                                style={{ width: `${insight.avg_overlap * 100}%`  /* keep-inline */ }}
                                                            />
                                                        </div>
                                                        <span className="text-secondary-foreground font-mono w-10 text-right">{(insight.avg_overlap * 100).toFixed(0)}%</span>
                                                    </div>
                                                </td>
                                                <td className="py-2 px-2 text-right text-muted-foreground">{insight.avg_latency_ms.toFixed(0)}ms</td>
                                                <td className="py-2 px-2 text-right text-muted-foreground">{formatNumber(insight.total_tokens)}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* ── Task → Provider Mapping ── */}
            <Card className="bg-card/60 border-border">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-emerald-400" />
                        Task Routing — Fallback Chains
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {Object.entries(task_mapping).map(([task, mapping]) => (
                            <div key={task} className="p-2.5 bg-secondary/40 rounded-lg border border-border">
                                <div className="flex items-center justify-between mb-1.5">
                                    <span className="text-xs font-semibold text-secondary-foreground capitalize">{task}</span>
                                    <Badge variant="outline" className="text-[9px] px-1 py-0 border-border text-muted-foreground">{mapping.chain}</Badge>
                                </div>
                                <div className="flex items-center gap-1">
                                    {mapping.providers.map((prov, i) => {
                                        const colors = PROVIDER_COLORS[prov] || PROVIDER_COLORS.google;
                                        const isConnected = connectedProviders.some(p => p.id === prov);
                                        return (
                                            <React.Fragment key={prov}>
                                                {i > 0 && <span className="text-muted-foreground text-[10px]">→</span>}
                                                <Badge className={`text-[10px] px-1.5 py-0 border-0 ${isConnected ? `${colors.bg} ${colors.text}` : 'bg-secondary text-muted-foreground'
                                                    }`}>
                                                    {prov}
                                                </Badge>
                                            </React.Fragment>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Empty state for usage */}
            {Object.keys(usage.by_provider).length === 0 && shadow_learning.total_logs === 0 && (
                <Card className="bg-card/60 border-border border-dashed">
                    <CardContent className="p-8 text-center">
                        <BarChart3 className="w-10 h-10 mx-auto text-foreground mb-3" />
                        <h3 className="text-sm font-medium text-muted-foreground">{"No "}Usage Data Yet</h3>
                        <p className="text-xs text-muted-foreground mt-1">
                            Start using AI features to see analytics and shadow learning insights
                        </p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
