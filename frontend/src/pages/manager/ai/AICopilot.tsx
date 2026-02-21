import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
    Bot, Send, Sparkles, Brain, BarChart3, Clock,
    Settings2, Zap, ChevronDown, Loader2, MessageSquare,
    Database, Shield, ExternalLink, ToggleLeft, ToggleRight,
    History, TrendingUp, HelpCircle, Trash2, Copy, Forward
} from 'lucide-react';
import RinMascot from '../../../components/voice/RinMascot';
import { useVenue } from '../../../hooks/useVenue';
import { useAuth } from '@/features/auth/AuthContext';
import { toast } from 'sonner';
import api from '../../../lib/api';
import { smartCopy } from '../../../lib/copyUtils';

/* ─── Markdown-lite Renderer ─────────────────────────────────── */
function renderMarkdown(text: string) {
    if (!text) return null;

    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];
    let inTable = false;
    let tableRows: string[][] = [];
    let tableKey = 0;

    const flushTable = () => {
        if (tableRows.length > 0) {
            const headers = tableRows[0];
            const body = tableRows.slice(2); // skip separator row
            elements.push(
                <div key={`table-${tableKey++}`} className="overflow-x-auto my-2">
                    <table className="w-full text-xs border-collapse">
                        <thead>
                            <tr className="border-b border-border">
                                {headers.map((h, i) => (
                                    <th key={i} className="text-left px-2 py-1.5 font-semibold text-foreground">{renderInline(h.trim())}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {body.map((row, ri) => (
                                <tr key={ri} className="border-b border-border/50 hover:bg-muted/50">
                                    {row.map((cell, ci) => (
                                        <td key={ci} className="px-2 py-1.5 text-muted-foreground">{renderInline(cell.trim())}</td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            );
            tableRows = [];
        }
        inTable = false;
    };

    const renderInline = (text: string): React.ReactNode => {
        // Bold **text**
        const parts = text.split(/(\*\*[^*]+\*\*)/g);
        return parts.map((part, i) => {
            if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={i} className="text-foreground font-semibold">{part.slice(2, -2)}</strong>;
            }
            // Italic *text*
            if (part.startsWith('*') && part.endsWith('*') && !part.startsWith('**')) {
                return <em key={i} className="text-muted-foreground italic">{part.slice(1, -1)}</em>;
            }
            return part;
        });
    };

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Table detection
        if (line.includes('|') && line.trim().startsWith('|')) {
            const cells = line.split('|').filter(c => c.trim() !== '');
            if (cells.length > 0) {
                if (!inTable) inTable = true;
                // Skip separator rows (|---|---|)
                if (cells.every(c => c.trim().match(/^[-:]+$/))) {
                    tableRows.push(cells.map(c => c.trim()));
                    continue;
                }
                tableRows.push(cells.map(c => c.trim()));
                continue;
            }
        } else if (inTable) {
            flushTable();
        }

        // Headers
        if (line.startsWith('# ')) {
            elements.push(<h3 key={i} className="text-sm font-bold text-foreground mt-2">{renderInline(line.slice(2))}</h3>);
        } else if (line.startsWith('## ')) {
            elements.push(<h4 key={i} className="text-xs font-bold text-foreground mt-1.5">{renderInline(line.slice(3))}</h4>);
        }
        // List items
        else if (line.startsWith('- ')) {
            elements.push(<div key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground ml-2"><span className="mt-0.5 text-primary">•</span><span>{renderInline(line.slice(2))}</span></div>);
        }
        // Italic lines (hints)
        else if (line.startsWith('_') && line.endsWith('_')) {
            elements.push(<p key={i} className="text-[10px] text-muted-foreground/70 italic mt-1">{line.slice(1, -1)}</p>);
        }
        // Regular text
        else if (line.trim()) {
            elements.push(<p key={i} className="text-xs text-muted-foreground">{renderInline(line)}</p>);
        }
        // Empty line
        else {
            elements.push(<div key={i} className="h-1" />);
        }
    }

    if (inTable) flushTable();

    return <>{elements}</>;
}

/* ─── Types ──────────────────────────────────────────────────── */
interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    intent?: string;
    source?: string;
    processing_ms?: number;
    cost?: number;
    can_escalate?: boolean;
    timestamp: string;
}

interface AIStats {
    total_queries: number;
    local_queries: number;
    external_queries: number;
    cost_units: number;
    intent_distribution: Record<string, number>;
}

/* ─── Role tier normalization (mirrors backend role_access.py) ─── */
type RoleTier = 'owner' | 'manager' | 'staff';

const ROLE_TIER_MAP: Record<string, RoleTier> = {
    product_owner: 'owner', PRODUCT_OWNER: 'owner',
    OWNER: 'owner', owner: 'owner', brand_manager: 'owner',
    manager: 'manager', MANAGER: 'manager', branch_manager: 'manager',
};

function getRoleTier(role?: string): RoleTier {
    if (!role) return 'staff';
    return ROLE_TIER_MAP[role] || 'staff';
}

/* ─── Quick Suggestions (role-gated) ─────────────────────────── */
const ALL_SUGGESTIONS = [
    { label: 'Bugünkü satışlar', icon: TrendingUp, query: 'Bugünkü satışlar nedir?', tiers: ['owner', 'manager'] as RoleTier[] },
    { label: 'Envanter özeti', icon: Database, query: 'Envanter özeti göster', tiers: ['owner', 'manager', 'staff'] as RoleTier[] },
    { label: 'Düşük stok', icon: HelpCircle, query: 'Düşük stok var mı?', tiers: ['owner', 'manager', 'staff'] as RoleTier[] },
    { label: 'Kimler çalışıyor', icon: MessageSquare, query: 'Kimler çalışıyor?', tiers: ['owner', 'manager', 'staff'] as RoleTier[] },
    { label: 'Kaç tarif var?', icon: Database, query: 'Sistemde kaç recipe kayıtlı?', tiers: ['owner', 'manager', 'staff'] as RoleTier[] },
    { label: 'Yardım', icon: Bot, query: 'help', tiers: ['owner', 'manager', 'staff'] as RoleTier[] },
];

/* ─── Main Component ─────────────────────────────────────────── */
export default function AICopilot() {
    const { activeVenueId } = useVenue();
    const { user } = useAuth();
    const venueId = activeVenueId || localStorage.getItem('venueId') || '';
    const roleTier = getRoleTier(user?.role as string);
    const canUseExternalAi = roleTier === 'owner' || roleTier === 'manager';

    // Filter suggestions by role
    const suggestions = useMemo(
        () => ALL_SUGGESTIONS.filter(s => s.tiers.includes(roleTier)),
        [roleTier]
    );

    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [sessionId] = useState(() => `copilot-${Date.now()}`);
    const [stats, setStats] = useState<AIStats | null>(null);
    const [showSettings, setShowSettings] = useState(false);
    const [showStats, setShowStats] = useState(false);
    const [aiConfig, setAiConfig] = useState({
        external_ai_enabled: false,
        provider: 'google',
        model: 'gemini-2.0-flash',
        api_key: '',
        api_key_masked: '',
    });

    const chatEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    // Scroll to bottom on new messages
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Load stats on mount
    useEffect(() => {
        if (!venueId) return;
        api.get(`/ai/stats`, { params: { venue_id: venueId } })
            .then(r => setStats(r.data))
            .catch(() => { });

        api.get(`/ai/config`, { params: { venue_id: venueId } })
            .then(r => setAiConfig(r.data))
            .catch(() => { });
    }, [venueId]);

    const sendMessage = useCallback(async (queryOverride?: string) => {
        const query = queryOverride || input.trim();
        if (!query || isLoading) return;

        const userMsg: Message = {
            id: `u-${Date.now()}`,
            role: 'user',
            content: query,
            timestamp: new Date().toISOString(),
        };

        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);

        try {
            const res = await api.post(`/ai/ask`, { query, session_id: sessionId }, { params: { venue_id: venueId } });
            const data = res.data;

            const aiMsg: Message = {
                id: `a-${Date.now()}`,
                role: 'assistant',
                content: data.response || 'Bir hata oluştu.',
                intent: data.intent,
                source: data.source,
                processing_ms: data.processing_ms,
                cost: data.cost,
                can_escalate: data.can_escalate,
                timestamp: new Date().toISOString(),
            };

            setMessages(prev => [...prev, aiMsg]);
        } catch (err: unknown) {
            const errMsg = err instanceof Error ? err.message : 'Bağlantı hatası';
            setMessages(prev => [...prev, {
                id: `e-${Date.now()}`,
                role: 'assistant',
                content: `⚠️ AI servisine bağlanılamadı: ${errMsg}`,
                timestamp: new Date().toISOString(),
            }]);
        } finally {
            setIsLoading(false);
            inputRef.current?.focus();
        }
    }, [input, isLoading, venueId, sessionId]);

    const escalateMessage = useCallback(async (query: string) => {
        setIsLoading(true);
        try {
            const res = await api.post(`/ai/ask/external`, { query, session_id: sessionId }, { params: { venue_id: venueId } });
            const data = res.data;

            const aiMsg: Message = {
                id: `ext-${Date.now()}`,
                role: 'assistant',
                content: data.response || 'Harici AI yanıt vermedi.',
                intent: data.intent,
                source: data.source,
                processing_ms: data.processing_ms,
                cost: data.cost,
                timestamp: new Date().toISOString(),
            };
            setMessages(prev => [...prev, aiMsg]);
        } catch {
            toast.error('Harici AI çağrısı başarısız');
        } finally {
            setIsLoading(false);
        }
    }, [venueId]);

    const saveConfig = async () => {
        try {
            await api.post(`/ai/config`, aiConfig, { params: { venue_id: venueId } });
            toast.success('AI ayarları güncellendi');
            setShowSettings(false);
        } catch {
            toast.error('Ayarlar kaydedilemedi');
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-64px)] bg-background">
            {/* ─── HEADER ─────────────────────────────────── */}
            <div className="flex-shrink-0 border-b border-border bg-card px-6 py-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center shadow-lg shadow-red-500/10 border border-border">
                            <RinMascot size={28} />
                        </div>
                        <div>
                            <h1 className="text-sm font-bold text-foreground flex items-center gap-2">
                                <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-red-600 bg-clip-text text-transparent font-extrabold">Hey Rin</span>
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium">
                                    LOCAL
                                </span>
                                {aiConfig.external_ai_enabled && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-500/10 text-violet-500 font-medium">
                                        + {aiConfig.provider?.toUpperCase()}
                                    </span>
                                )}
                                {/* Role tier badge */}
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${roleTier === 'owner' ? 'bg-amber-500/10 text-amber-500' :
                                    roleTier === 'manager' ? 'bg-blue-500/10 text-blue-500' :
                                        'bg-zinc-500/10 text-muted-foreground'
                                    }`}>
                                    {roleTier === 'owner' ? '👑 Owner' : roleTier === 'manager' ? '🔧 Manager' : '👤 Staff'}
                                </span>
                            </h1>
                            <p className="text-[10px] text-muted-foreground">
                                Sıfır maliyet • Venue verinize hakim • Türkçe & English
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Stats badge */}
                        <button
                            onClick={() => setShowStats(!showStats)}
                            title="Query statistics"
                            aria-label="Toggle query statistics"
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-muted/50 hover:bg-muted text-xs text-muted-foreground transition"
                        >
                            <BarChart3 className="w-3.5 h-3.5" />
                            {stats?.total_queries || 0} query
                        </button>

                        {/* Settings */}
                        <button
                            onClick={() => setShowSettings(!showSettings)}
                            className="p-2 rounded-lg bg-muted/50 hover:bg-muted text-muted-foreground transition"
                        >
                            <Settings2 className="w-4 h-4" />
                        </button>

                        {/* Clear chat */}
                        <button
                            onClick={() => setMessages([])}
                            className="p-2 rounded-lg bg-muted/50 hover:bg-muted text-muted-foreground transition"
                            title="Sohbeti temizle"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* ─── STATS PANEL ──────────────────────────── */}
                {showStats && stats && (
                    <div className="mt-3 grid grid-cols-4 gap-3 pt-3 border-t border-border">
                        <div className="bg-muted/30 rounded-lg px-3 py-2 text-center">
                            <p className="text-lg font-bold text-foreground">{stats.total_queries}</p>
                            <p className="text-[10px] text-muted-foreground">Toplam Sorgu</p>
                        </div>
                        <div className="bg-muted/30 rounded-lg px-3 py-2 text-center">
                            <p className="text-lg font-bold text-emerald-500">{stats.local_queries}</p>
                            <p className="text-[10px] text-muted-foreground">Yerel (Ücretsiz)</p>
                        </div>
                        <div className="bg-muted/30 rounded-lg px-3 py-2 text-center">
                            <p className="text-lg font-bold text-violet-500">{stats.external_queries}</p>
                            <p className="text-[10px] text-muted-foreground">Harici AI</p>
                        </div>
                        <div className="bg-muted/30 rounded-lg px-3 py-2 text-center">
                            <p className="text-lg font-bold text-amber-500">€{((stats.cost_units || 0) * 0.005).toFixed(2)}</p>
                            <p className="text-[10px] text-muted-foreground">Toplam Maliyet</p>
                        </div>
                    </div>
                )}

                {/* ─── SETTINGS PANEL ──────────────────────── */}
                {showSettings && (
                    <div className="mt-3 pt-3 border-t border-border space-y-3">
                        <h3 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                            <Shield className="w-3.5 h-3.5" /> Harici AI Yapılandırma
                        </h3>

                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-medium text-foreground">Harici AI Desteği</p>
                                <p className="text-[10px] text-muted-foreground">
                                    Yerel AI yetmediğinde Gemini/OpenAI'dan destek al
                                </p>
                            </div>
                            <button
                                onClick={() => setAiConfig(c => ({ ...c, external_ai_enabled: !c.external_ai_enabled }))}
                                className="text-muted-foreground hover:text-foreground"
                            >
                                {aiConfig.external_ai_enabled ? (
                                    <ToggleRight className="w-8 h-8 text-emerald-500" />
                                ) : (
                                    <ToggleLeft className="w-8 h-8" />
                                )}
                            </button>
                        </div>

                        {aiConfig.external_ai_enabled && (
                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="text-[10px] font-medium text-muted-foreground">Provider</label>
                                    <select aria-label="Input"
                                        value={aiConfig.provider}
                                        onChange={e = aria-label="Input field"> setAiConfig(c => ({ ...c, provider: e.target.value }))}
                                        className="w-full mt-1 bg-muted border border-border rounded-md px-2 py-1.5 text-xs text-foreground"
                                    >
                                        <option value="google">Google Gemini</option>
                                        <option value="openai">OpenAI</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-medium text-muted-foreground">Model</label>
                                    <select aria-label="Input"
                                        value={aiConfig.model}
                                        onChange={e = aria-label="Input field"> setAiConfig(c => ({ ...c, model: e.target.value }))}
                                        className="w-full mt-1 bg-muted border border-border rounded-md px-2 py-1.5 text-xs text-foreground"
                                    >
                                        {aiConfig.provider === 'google' ? (
                                            <>
                                                <option value="gemini-2.0-flash">Gemini 2.0 Flash (Fast)</option>
                                                <option value="gemini-2.0-pro">Gemini 2.0 Pro (Smart)</option>
                                                <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                                            </>
                                        ) : (
                                            <>
                                                <option value="gpt-4o-mini">GPT-4o Mini (Fast)</option>
                                                <option value="gpt-4o">GPT-4o (Smart)</option>
                                                <option value="gpt-4.1">GPT 4.1</option>
                                            </>
                                        )}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-medium text-muted-foreground">API Key</label>
                                    <input aria-label="Input"
                                        type="password"
                                        value={aiConfig.api_key}
                                        onChange={e = aria-label="Input field"> setAiConfig(c => ({ ...c, api_key: e.target.value }))}
                                        placeholder={aiConfig.api_key_masked || 'API anahtarı...'}
                                        className="w-full mt-1 bg-muted border border-border rounded-md px-2 py-1.5 text-xs text-foreground"
                                    />
                                </div>
                            </div>
                        )}

                        <div className="flex justify-end">
                            <button
                                onClick={saveConfig}
                                className="px-3 py-1.5 text-xs font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition"
                            >
                                Kaydet
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* ─── CHAT AREA ──────────────────────────────── */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-zinc-800/80 to-zinc-900/80 flex items-center justify-center mb-4 border border-border">
                            <RinMascot size={48} />
                        </div>
                        <h2 className="text-lg font-bold text-foreground mb-1">Merhaba! Ben <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-red-600 bg-clip-text text-transparent">Hey Rin</span> 🤖</h2>
                        <p className="text-xs text-muted-foreground max-w-md mb-6">
                            Venue verinize tam hakimim. Satış, stok, personel, menü — her şeyi sıfır maliyetle sorabilirsiniz.
                            Yetmediğim yerde onayınızla harici AI (Gemini/OpenAI) desteği alırım.
                        </p>

                        <div className="flex flex-wrap gap-2 justify-center">
                            {suggestions.map(s => (
                                <button
                                    key={s.label}
                                    onClick={() => sendMessage(s.query)}
                                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-muted/50 hover:bg-muted border border-border text-xs text-muted-foreground hover:text-foreground transition"
                                >
                                    <s.icon className="w-3.5 h-3.5" />
                                    {s.label}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {messages.map(msg => (
                    <div
                        key={msg.id}
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        <div
                            className={`max-w-[80%] rounded-2xl px-4 py-3 ${msg.role === 'user'
                                ? 'bg-primary text-primary-foreground rounded-br-md'
                                : 'bg-card border border-border rounded-bl-md'
                                }`}
                        >
                            {msg.role === 'assistant' ? (
                                <div className="space-y-1">
                                    {renderMarkdown(msg.content)}

                                    {/* Source & timing badge */}
                                    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border/50">
                                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${msg.source === 'local_intelligence'
                                            ? 'bg-emerald-500/10 text-emerald-500'
                                            : 'bg-violet-500/10 text-violet-500'
                                            }`}>
                                            {msg.source === 'local_intelligence' ? '🧠 LOCAL' : `⚡ ${msg.source?.replace('external_', '').toUpperCase()}`}
                                        </span>
                                        {msg.processing_ms !== undefined && (
                                            <span className="text-[9px] text-muted-foreground/60">{msg.processing_ms}ms</span>
                                        )}
                                        {msg.cost !== undefined && msg.cost > 0 && (
                                            <span className="text-[9px] text-amber-500">💰 {msg.cost} birim</span>
                                        )}
                                        {msg.cost === 0 && (
                                            <span className="text-[9px] text-emerald-500/60">Ücretsiz</span>
                                        )}
                                    </div>

                                    {/* Copy & Forward actions */}
                                    <div className="flex items-center gap-1 mt-1.5">
                                        <button
                                            onClick={() => { smartCopy(msg.content).then(() => toast.success('Kopyalandı!')); }}
                                            className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-muted/80 text-[10px] text-muted-foreground hover:text-foreground transition"
                                            title="Kopyala"
                                            aria-label="Copy message"
                                        >
                                            <Copy className="w-3 h-3" />
                                            Kopyala
                                        </button>
                                        <button
                                            onClick={() => { smartCopy(msg.content).then(() => toast.success('İletme için kopyalandı!')); }}
                                            className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-muted/80 text-[10px] text-muted-foreground hover:text-foreground transition"
                                            title="İlet"
                                            aria-label="Forward message"
                                        >
                                            <Forward className="w-3 h-3" />
                                            İlet
                                        </button>
                                    </div>

                                    {/* Escalation button */}
                                    {msg.can_escalate && aiConfig.external_ai_enabled && (
                                        <button
                                            onClick={() => {
                                                const userMsg = messages.find(m => m.id === msg.id.replace('a-', 'u-'));
                                                if (userMsg) escalateMessage(userMsg.content);
                                            }}
                                            className="mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-500/10 hover:bg-violet-500/20 text-violet-500 text-[10px] font-medium transition"
                                        >
                                            <Zap className="w-3 h-3" />
                                            Harici AI ile derin analiz yap
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <p className="text-xs">{msg.content}</p>
                            )}
                        </div>
                    </div>
                ))}

                {isLoading && (
                    <div className="flex justify-start">
                        <div className="bg-card border border-border rounded-2xl rounded-bl-md px-4 py-3">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                Düşünüyorum...
                            </div>
                        </div>
                    </div>
                )}

                <div ref={chatEndRef} />
            </div>

            {/* ─── INPUT BAR ──────────────────────────────── */}
            <div className="flex-shrink-0 border-t border-border bg-card px-6 py-3">
                <div className="flex items-end gap-3">
                    <div className="flex-1 relative">
                        <textarea aria-label="Input"
                            ref={inputRef}
                            value={input}
                            onChange={e = aria-label="Input field"> setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Bir soru sorun... (örn: 'Bugünkü satışlar nedir?')"
                            rows={1}
                            className="w-full bg-muted border border-border rounded-xl px-4 py-2.5 text-xs text-foreground placeholder-muted-foreground/50 resize-none focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none"
                            style={{ minHeight: '40px', maxHeight: '120px' }} /* keep-inline */ /* keep-inline */ /* keep-inline */
                        />
                    </div>
                    <button
                        onClick={() => sendMessage()}
                        disabled={!input.trim() || isLoading}
                        className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-foreground flex items-center justify-center hover:shadow-lg hover:shadow-violet-500/20 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </button>
                </div>
                <div className="flex items-center gap-3 mt-2">
                    {messages.length > 0 && suggestions.slice(0, 3).map(s => (
                        <button
                            key={s.label}
                            onClick={() => sendMessage(s.query)}
                            className="text-[10px] text-muted-foreground/60 hover:text-muted-foreground transition"
                        >
                            {s.label}
                        </button>
                    ))}
                    <span className="ml-auto text-[9px] text-muted-foreground/40">
                        {aiConfig.external_ai_enabled ? '🧠+⚡ Hibrit Mod' : '🧠 Yerel Mod (Ücretsiz)'}
                    </span>
                </div>
            </div>
        </div>
    );
}
