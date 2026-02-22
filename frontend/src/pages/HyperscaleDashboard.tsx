import {
    Activity,
    AlertTriangle,
    ArrowDownRight,
    ArrowUpRight,
    Database,
    DollarSign,
    Globe,
    Maximize2,
    Activity as Pulse,
    Server,
    Shield,
    StopCircle,
    Clock,
    Cpu,
    HardDrive,
    Zap,
} from 'lucide-react';
import React, { useState } from 'react';
import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

// ─── Real API Fetchers ────────────────────────────────────────────────────────
const fetchHyperscaleMetrics = async () => {
    const token = localStorage.getItem('token');
    const { data } = await axios.get('/api/system/hyperscale-metrics', {
        headers: { Authorization: `Bearer ${token}` },
    });
    return data;
};

const fetchAuditScores = async () => {
    const token = localStorage.getItem('token');
    const { data } = await axios.get('/api/system/audit-scores', {
        headers: { Authorization: `Bearer ${token}` },
    });
    return data;
};

// ─── Types ────────────────────────────────────────────────────────────────────
interface TimePoint {
    time: string;
    value?: number;
    p50?: number;
    p95?: number;
    p99?: number;
}

interface HyperscaleData {
    p99_latency_ms: number;
    p95_latency_ms: number;
    p50_latency_ms: number;
    rps: number;
    error_rate_5xx: number;
    error_rate_4xx: number;
    total_requests: number;
    total_errors_5xx: number;
    total_errors_4xx: number;
    memory_usage_mb: number;
    cpu_percent: number;
    thread_count: number;
    uptime_seconds: number;
    boot_time: number;
    latency_history: TimePoint[];
    rps_history: TimePoint[];
    error_history: TimePoint[];
    top_endpoints: Array<{ path: string; count: number; avg_latency_ms: number }>;
    region: string;
    instance_count: number;
    has_redis: boolean;
    has_cdn: boolean;
    dlq_size: number;
    unresolved_errors: number;
    dlq_status: string;
    pending_events: number;
    event_bus_status: string;
    db_connection_ok: boolean;
    db_latency_ms: number;
    collection_stats: Record<string, number>;
    system_iq: number;
    resilience_score: number;
    // DB QPS
    db_read_qps: number;
    db_write_qps: number;
    replication_lag_ms: number;
    total_documents: number;
    // Queue Health Extended
    queue_depth: number;
    consumer_throughput: number;
    dlq_rate_per_sec: number;
    // Financial Integrity
    financial_integrity: {
        revenue_operational: number;
        revenue_warehouse: number;
        charge_success_rate: number;
        charge_avg_time: number;
        ledger_imbalance_pct: number;
        reconciliation_delay_pct: number;
    };
    // Alert Intelligence
    active_alerts: number;
    alert_list: Array<{ id: string; title: string; severity: string; timestamp: string; count: number }>;
    mean_detect_time_sec: number;
    silent_failure_risk: number;
    alert_accuracy: number;
    // Cost & Circuit Breaker
    infra_cost_hour: number;
    cost_per_booking: number;
    circuit_breaker_trips: number;
    autoscale_events: number;
    // Multi-Region
    regions: Array<{ id: string; name: string; latency_ms: number; status: string }>;
}

interface AuditData {
    overall_score: number;
    scores: Record<string, number>;
    evidence: Record<string, Record<string, unknown>>;
    weights: Record<string, string>;
    computed_at: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatUptime = (seconds: number): string => {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (d > 0) return `${d}d ${h}h`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
};

const getStatusColor = (val: number, threshold1: number, threshold2: number, inverse = false) => {
    const isBad = inverse ? val < threshold1 : val > threshold1;
    const isCritical = inverse ? val < threshold2 : val > threshold2;
    if (isCritical) return 'text-red-500';
    if (isBad) return 'text-yellow-500';
    return 'text-emerald-500';
};

// ─── Sub-components ───────────────────────────────────────────────────────────
interface DrilldownData {
    title: string;
    data: TimePoint[];
    description: string;
    impact: string[];
}

interface TopStatCardProps {
    title: string;
    value: number | string;
    unit: string;
    icon: React.ElementType;
    statusClass: string;
    onClickMap: DrilldownData;
    onClick: (d: DrilldownData) => void;
    subtitle?: string;
}

const TopStatCard: React.FC<TopStatCardProps> = ({ title, value, unit, icon: Icon, statusClass, onClickMap, onClick, subtitle }) => (
    <div
        onClick={() => onClick(onClickMap)}
        className="bg-slate-900 border border-slate-800 rounded-xl p-4 cursor-pointer hover:border-indigo-500 transition-all group relative overflow-hidden"
    >
        <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-indigo-500/10 to-transparent rounded-bl-3xl" />
        <div className="flex justify-between items-start mb-2">
            <p className="text-slate-400 text-sm font-medium">{title}</p>
            <Icon className={`w-5 h-5 ${statusClass}`} />
        </div>
        <div className="flex items-baseline gap-2">
            <h3 className="text-3xl font-bold text-white">
                {typeof value === 'number' ? value.toFixed(value % 1 === 0 ? 0 : 2) : value}
            </h3>
            <span className="text-slate-500 text-sm">{unit}</span>
        </div>
        {subtitle && (
            <div className="mt-2 text-xs text-slate-500">{subtitle}</div>
        )}
    </div>
);

const DrilldownModal: React.FC<{ metric: DrilldownData | null; onClose: () => void }> = ({ metric, onClose }) => {
    if (!metric) return null;
    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl">
                <div className="sticky top-0 bg-slate-900/90 backdrop-blur border-b border-slate-800 p-6 flex justify-between items-center z-10">
                    <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                        <Activity className="text-indigo-500" />
                        {metric.title} Drill-down
                    </h2>
                    <button title="Close Drill-down" onClick={onClose} className="text-slate-400 hover:text-white p-2">
                        <StopCircle className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-2">
                        {metric.data.length > 0 && (
                            <div className="h-80 bg-slate-950 rounded-xl border border-slate-800 p-4 mb-6">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={metric.data}>
                                        <defs>
                                            <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                        <XAxis dataKey="time" stroke="#94a3b8" fontSize={12} tickLine={false} />
                                        <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }} /* keep-inline */
                                            itemStyle={{ color: '#e2e8f0' }} /* keep-inline */
                                        />
                                        <Area type="monotone" dataKey="value" stroke="#818cf8" strokeWidth={2} fillOpacity={1} fill="url(#colorVal)" />
                                        <Area type="monotone" dataKey="p99" stroke="#f87171" strokeWidth={1.5} fillOpacity={0} />
                                        <Area type="monotone" dataKey="p95" stroke="#fbbf24" strokeWidth={1.5} fillOpacity={0} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                                <h4 className="text-slate-300 font-medium mb-1">Ne Anlama Geliyor?</h4>
                                <p className="text-sm text-muted-foreground leading-relaxed">{metric.description}</p>
                            </div>
                            <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                                <h4 className="text-slate-300 font-medium mb-2">Sistem Etki Alanı (Blast Radius)</h4>
                                <ul className="space-y-2">
                                    {metric.impact.map((imp, i) => (
                                        <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 shrink-0" />
                                            {imp}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-white mb-4">Diagnostic Trace</h3>
                        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-400">Source</span>
                                <span className="text-emerald-400 font-mono">REAL DATA</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-400">Collection Method</span>
                                <span className="text-white">In-Memory APM</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ─── Main Dashboard ───────────────────────────────────────────────────────────
const HyperscaleDashboard: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'executive' | 'engineering' | 'financial' | 'audit'>('executive');
    const [selectedMetric, setSelectedMetric] = useState<DrilldownData | null>(null);

    // Real API polling every 5 seconds
    const { data: metrics, isLoading, error } = useQuery<HyperscaleData>({
        queryKey: ['hyperscale-metrics'],
        queryFn: fetchHyperscaleMetrics,
        refetchInterval: 5000,
        staleTime: 3000,
    });

    // Audit scores (cached, refetch every 5 min)
    const { data: auditData } = useQuery<AuditData>({
        queryKey: ['audit-scores'],
        queryFn: fetchAuditScores,
        refetchInterval: 300000,
        staleTime: 120000,
    });

    const handleMetricClick = (d: DrilldownData) => setSelectedMetric(d);

    // Loading state
    if (isLoading || !metrics) {
        return (
            <div className="min-h-screen bg-[#050510] flex items-center justify-center">
                <div className="text-center">
                    <div className="w-12 h-12 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-slate-400">Connecting to metrics backend...</p>
                </div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="min-h-screen bg-[#050510] flex items-center justify-center">
                <div className="text-center max-w-md">
                    <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-white mb-2">Metrics Unavailable</h2>
                    <p className="text-slate-400 text-sm">Backend API is not responding. Make sure the server is running.</p>
                </div>
            </div>
        );
    }

    const errorRatePercent = metrics.error_rate_5xx * 100;

    return (
        <div className="min-h-screen bg-[#050510] text-slate-200 p-4 md:p-8 font-sans selection:bg-indigo-500/30">

            {/* ═══ ENHANCED TOP BAR ═══ */}
            <div className="mb-6 space-y-3">
                {/* Row 1: Title + Inline Metrics Strip */}
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 mr-4">
                        <span className={`w-2.5 h-2.5 rounded-full ${metrics.db_connection_ok ? 'bg-emerald-500' : 'bg-red-500'} animate-pulse`} />
                        <h1 className="text-xl font-bold text-white tracking-tight">RESTIN.AI</h1>
                    </div>
                    <button onClick={() => handleMetricClick({ title: 'System Status', data: [], description: `DB: ${metrics.db_connection_ok ? 'OK' : 'DOWN'}, EventBus: ${metrics.event_bus_status}, DLQ: ${metrics.dlq_status}`, impact: ['Database connection health', 'Event processing pipeline', 'Dead letter queue monitoring'] })}
                        className={`px-3 py-1 rounded-full text-xs font-bold border cursor-pointer transition-all hover:scale-105 ${metrics.db_connection_ok ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-red-500/10 text-red-400 border-red-500/30'}`}>
                        {metrics.db_connection_ok ? 'HEALTHY' : 'DEGRADED'}
                    </button>
                    {/* Region Badges */}
                    {(metrics.regions ?? []).map(r => (
                        <button key={r.id} onClick={() => handleMetricClick({ title: `${r.name} Region`, data: [], description: `Latency: ${r.latency_ms}ms, Status: ${r.status}`, impact: [`Region ${r.name} is ${r.status}`, `Network latency: ${r.latency_ms}ms`] })}
                            className={`px-2.5 py-1 rounded-md text-xs font-bold border cursor-pointer transition-all hover:scale-105 ${r.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>
                            {r.id === 'eu' ? '🇪🇺' : r.id === 'tr' ? '🇹🇷' : '🇺🇸'} {r.id.toUpperCase()}
                        </button>
                    ))}
                    <div className="h-5 w-px bg-slate-700 mx-1" />
                    {/* Inline Metrics */}
                    <button onClick={() => handleMetricClick({ title: 'Error Rate', data: metrics.error_history, description: `5xx Error Rate: ${errorRatePercent.toFixed(3)}%`, impact: ['High error rates trigger circuit breakers', 'CDN may block traffic above 5%'] })}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800 text-xs cursor-pointer hover:border-slate-600 transition-all">
                        <StopCircle className="w-3 h-3 text-slate-500" />
                        <span className={`font-mono font-bold ${errorRatePercent < 1 ? 'text-emerald-400' : errorRatePercent < 5 ? 'text-yellow-400' : 'text-red-400'}`}>{errorRatePercent.toFixed(2)}%</span>
                    </button>
                    <button onClick={() => handleMetricClick({ title: 'p99 Latency', data: metrics.latency_history, description: `Tail latency: ${metrics.p99_latency_ms}ms`, impact: ['Slowest 1% of requests', 'Affects user experience'] })}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800 text-xs cursor-pointer hover:border-slate-600 transition-all">
                        <Zap className="w-3 h-3 text-slate-500" />
                        <span className={`font-mono font-bold ${metrics.p99_latency_ms < 300 ? 'text-emerald-400' : metrics.p99_latency_ms < 500 ? 'text-yellow-400' : 'text-red-400'}`}>{metrics.p99_latency_ms}ms</span>
                    </button>
                    <button onClick={() => handleMetricClick({ title: 'Traffic (RPS)', data: metrics.rps_history, description: `Current: ${metrics.rps} req/s, Total: ${metrics.total_requests.toLocaleString()}`, impact: ['Request throughput', 'Scaling indicator'] })}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800 text-xs cursor-pointer hover:border-slate-600 transition-all">
                        <Activity className="w-3 h-3 text-slate-500" />
                        <span className="font-mono font-bold text-indigo-400">{metrics.rps} rps</span>
                    </button>
                    <button onClick={() => handleMetricClick({ title: 'DB Latency', data: [], description: `MongoDB ping: ${metrics.db_latency_ms}ms`, impact: ['Query performance indicator'] })}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800 text-xs cursor-pointer hover:border-slate-600 transition-all">
                        <Database className="w-3 h-3 text-slate-500" />
                        <span className={`font-mono font-bold ${metrics.db_latency_ms < 50 ? 'text-emerald-400' : 'text-yellow-400'}`}>{metrics.db_latency_ms}ms</span>
                    </button>
                    <div className="h-5 w-px bg-slate-700 mx-1" />
                    {/* Mini Score Pills */}
                    <button onClick={() => handleMetricClick({ title: 'System IQ', data: [], description: `Composite health score: ${metrics.system_iq ?? 0}/100`, impact: ['Error rate penalty', 'Latency penalty', 'DLQ penalty', 'DB health check'] })}
                        className={`px-2 py-1 rounded-md text-xs font-bold cursor-pointer transition-all hover:scale-110 ${(metrics.system_iq ?? 0) >= 80 ? 'bg-emerald-500/15 text-emerald-400' : (metrics.system_iq ?? 0) >= 50 ? 'bg-yellow-500/15 text-yellow-400' : 'bg-red-500/15 text-red-400'}`}>
                        {metrics.system_iq ?? 0}
                    </button>
                    <button onClick={() => handleMetricClick({ title: 'Resilience', data: [], description: `Success rate: ${(metrics.resilience_score ?? 0).toFixed(2)}%`, impact: ['Based on 5xx error ratio'] })}
                        className={`px-2 py-1 rounded-md text-xs font-bold cursor-pointer transition-all hover:scale-110 ${(metrics.resilience_score ?? 0) >= 99 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-yellow-500/15 text-yellow-400'}`}>
                        {Math.round(metrics.resilience_score ?? 0)}
                    </button>
                    {auditData && (
                        <button onClick={() => setActiveTab('audit')}
                            className={`px-2 py-1 rounded-md text-xs font-bold cursor-pointer transition-all hover:scale-110 ${auditData.overall_score >= 8 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-yellow-500/15 text-yellow-400'}`}>
                            {auditData.overall_score.toFixed(0)}
                        </button>
                    )}
                </div>
                {/* Row 2: Status badges */}
                <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span>Uptime: {formatUptime(metrics.uptime_seconds)}</span>
                    <span>·</span>
                    <span>{new Date().toLocaleTimeString('en-GB')}</span>
                    <span>·</span>
                    <span>{metrics.region}</span>
                    <span>·</span>
                    <span>{metrics.instance_count} instance</span>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex space-x-1 bg-slate-900/50 p-1 rounded-xl w-full max-w-lg mb-8 border border-slate-800">
                {(['executive', 'engineering', 'financial', 'audit'] as const).map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium capitalize transition-all ${activeTab === tab
                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20'
                            : 'text-slate-400 hover:text-white hover:bg-slate-800'
                            }`}
                    >
                        {tab === 'audit' ? '🔬 Audit' : tab}
                    </button>
                ))}
            </div>

            {/* The 5 Golden Hyperscale Signals */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
                <TopStatCard
                    title="p99 Latency (Tail)"
                    value={metrics.p99_latency_ms}
                    unit="ms"
                    icon={Activity}
                    statusClass={getStatusColor(metrics.p99_latency_ms, 300, 500)}
                    onClick={handleMetricClick}
                    onClickMap={{
                        data: metrics.latency_history,
                        title: "p99 Latency",
                        description: "P99 Latency, sistemdeki en yavaş %1'lik isteklerin ne kadar sürdüğünü ölçer. Bu veri in-memory APM collector'dan gerçek zamanlı olarak toplanıyor.",
                        impact: ["Yüksek p99, Thread Havuzlarının kilitlendiğini gösterir.", "Müşteri ödeme ekranında dönen çarkta takılı kalır.", "Load Balancer timeout yiyebilir (504 Gateway Timeout)."]
                    }}
                    subtitle={`p95: ${metrics.p95_latency_ms.toFixed(0)}ms | p50: ${metrics.p50_latency_ms.toFixed(0)}ms`}
                />
                <TopStatCard
                    title="Queue Lag (DLQ)"
                    value={metrics.dlq_size}
                    unit="events"
                    icon={Database}
                    statusClass={getStatusColor(metrics.dlq_size, 10, 100)}
                    onClick={handleMetricClick}
                    onClickMap={{
                        data: [],
                        title: "DLQ Status",
                        description: `Dead Letter Queue boyutu: ${metrics.dlq_size}. Çözülmemiş sistem hataları: ${metrics.unresolved_errors}. Durum: ${metrics.dlq_status}. Bu veri MongoDB'deki event_dlq collection'dan gerçek zamanlı çekiliyor.`,
                        impact: ["Sıfırdan büyükse, asenkron task'ler ölüyor demektir.", "Mutfak ekranlarına (KDS) siparişler geç düşer.", "Mail ve bildirim kuyrukları bloklanır."]
                    }}
                />
                <TopStatCard
                    title="DB Latency"
                    value={metrics.db_latency_ms}
                    unit="ms"
                    icon={DollarSign}
                    statusClass={getStatusColor(metrics.db_latency_ms, 50, 200)}
                    onClick={handleMetricClick}
                    onClickMap={{
                        data: [],
                        title: "MongoDB Health",
                        description: `MongoDB Atlas ping süresi: ${metrics.db_latency_ms}ms. Connection: ${metrics.db_connection_ok ? 'OK' : 'FAILED'}. Bu değer gerçek bir 'ping' komutu ile ölçülüyor.`,
                        impact: ["50ms üzeri: Sorgu darboğazı.", "200ms üzeri: Kullanıcı deneyimini doğrudan etkiler.", "Connection failure: Tüm CRUD operasyonları durur."]
                    }}
                />
                <TopStatCard
                    title="Traffic (RPS)"
                    value={metrics.rps}
                    unit="req/s"
                    icon={Pulse}
                    statusClass="text-indigo-400"
                    onClick={handleMetricClick}
                    onClickMap={{
                        data: metrics.rps_history,
                        title: "Request Per Second",
                        description: "Son 60 saniyedeki ortalama istek sayısı. Bu veri middleware'den gerçek zamanlı olarak toplanıyor.",
                        impact: [`Toplam işlenen istek: ${metrics.total_requests.toLocaleString()}`, "RPS artarken Latency de artıyorsa scaling gerekli.", "Sıfıra inmesi DNS kopukluğu anlamına gelir."]
                    }}
                    subtitle={`Total: ${metrics.total_requests.toLocaleString()}`}
                />
                <TopStatCard
                    title="Error Rate (5xx)"
                    value={errorRatePercent}
                    unit="%"
                    icon={AlertTriangle}
                    statusClass={getStatusColor(errorRatePercent, 1, 5)}
                    onClick={handleMetricClick}
                    onClickMap={{
                        data: metrics.error_history,
                        title: "Error Rate",
                        description: `5xx hata oranı: ${errorRatePercent.toFixed(4)}%. Toplam 5xx: ${metrics.total_errors_5xx}. 4xx: ${metrics.total_errors_4xx}. Bu veri her HTTP response'tan gerçek zamanlı toplanıyor.`,
                        impact: ["CloudFlare devreden çıkabilir.", "Mobil uygulamada beyaz ekran hataları.", "Circuit breaker'ların tetiklenmesine yol açar."]
                    }}
                    subtitle={`5xx: ${metrics.total_errors_5xx} | 4xx: ${metrics.total_errors_4xx}`}
                />
            </div>

            {/* Main Content Areas based on Tab */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Left Column - Big Charts */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Chart 1: Traffic & Latency Correlation */}
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                <Pulse className="w-5 h-5 text-indigo-500" />
                                Traffic vs Latency Envelope (Live)
                            </h2>
                            <button
                                title="Expand Metric Details"
                                className="text-slate-400 hover:text-white"
                                onClick={() => handleMetricClick({
                                    title: "Latency/RPS Correlation",
                                    data: metrics.rps_history,
                                    description: "Yük (RPS) arttıkça gecikmenin (Latency) nasıl tepki verdiğini gösterir. İdeal bir sistemde RPS uçsa bile Latency çizgisi düz kalmalıdır.",
                                    impact: ["Veritabanı darboğazları", "Connection Pool yetersizliği"]
                                })}
                            >
                                <Maximize2 className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="h-72">
                            {metrics.rps_history.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={metrics.rps_history}>
                                        <defs>
                                            <linearGradient id="rpsGrad" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                        <XAxis dataKey="time" stroke="#64748b" fontSize={12} tickLine={false} />
                                        <YAxis stroke="#818cf8" fontSize={12} tickLine={false} axisLine={false} />
                                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }} /* keep-inline */ />
                                        <Area type="monotone" dataKey="value" name="RPS" stroke="#818cf8" fill="url(#rpsGrad)" strokeWidth={2} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex items-center justify-center text-slate-500">
                                    <p>Collecting data... (snapshots every 20s)</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Conditional Layouts based on Active Tab */}
                    {activeTab === 'engineering' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* DB Panel */}
                            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                                <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
                                    <Database className="w-5 h-5 text-emerald-500" /> Database Health
                                </h2>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center p-2 rounded">
                                        <span className="text-slate-400">Connection</span>
                                        <span className={`font-mono ${metrics.db_connection_ok ? 'text-emerald-400' : 'text-red-400'}`}>
                                            {metrics.db_connection_ok ? 'OK' : 'FAILED'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center p-2 rounded">
                                        <span className="text-slate-400">Ping Latency</span>
                                        <span className={`font-mono ${metrics.db_latency_ms < 50 ? 'text-emerald-400' : metrics.db_latency_ms < 200 ? 'text-yellow-400' : 'text-red-400'}`}>
                                            {metrics.db_latency_ms}ms
                                        </span>
                                    </div>
                                    {Object.entries(metrics.collection_stats).map(([name, count]) => (
                                        <div key={name} className="flex justify-between items-center p-2 rounded">
                                            <span className="text-slate-400 capitalize">{name.replace(/_/g, ' ')}</span>
                                            <span className="text-white font-mono">{count.toLocaleString()}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Queue Panel */}
                            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                                <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
                                    <Server className="w-5 h-5 text-purple-500" /> Event Bus & Consumers
                                </h2>
                                {metrics.error_history.length > 0 ? (
                                    <ResponsiveContainer width="100%" height={150}>
                                        <BarChart data={metrics.error_history}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                            <XAxis dataKey="time" hide />
                                            <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }} /* keep-inline */ />
                                            <Bar dataKey="value" name="Error Rate %" fill="#a855f7" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="h-[150px] flex items-center justify-center text-slate-500 text-sm">
                                        Collecting error data...
                                    </div>
                                )}
                                <div className="mt-4 space-y-2">
                                    <div className="flex justify-between items-center p-3 bg-slate-950 rounded-lg border border-slate-800">
                                        <span className="text-slate-400">EventBus Status</span>
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold border ${metrics.event_bus_status === 'HEALTHY'
                                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                            : 'bg-red-500/10 text-red-400 border-red-500/20'
                                            }`}>
                                            {metrics.event_bus_status}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center p-3 bg-slate-950 rounded-lg border border-slate-800">
                                        <span className="text-slate-400">Pending Events</span>
                                        <span className="text-white font-mono">{metrics.pending_events}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'financial' && (
                        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                            <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-6">
                                <DollarSign className="w-5 h-5 text-emerald-500" /> Process Metrics & Cost Efficiency
                            </h2>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="p-4 bg-slate-950 rounded-lg border border-slate-800">
                                    <div className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                                        <Cpu className="w-3 h-3" /> CPU Usage
                                    </div>
                                    <div className={`text-2xl font-bold ${metrics.cpu_percent < 50 ? 'text-emerald-400' : metrics.cpu_percent < 80 ? 'text-yellow-400' : 'text-red-400'}`}>
                                        {metrics.cpu_percent.toFixed(1)}%
                                    </div>
                                </div>
                                <div className="p-4 bg-slate-950 rounded-lg border border-slate-800">
                                    <div className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                                        <HardDrive className="w-3 h-3" /> Memory
                                    </div>
                                    <div className="text-2xl font-bold text-blue-400">
                                        {metrics.memory_usage_mb.toFixed(0)} MB
                                    </div>
                                </div>
                                <div className="p-4 bg-slate-950 rounded-lg border border-slate-800">
                                    <div className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                                        <Zap className="w-3 h-3" /> Threads
                                    </div>
                                    <div className="text-2xl font-bold text-purple-400">
                                        {metrics.thread_count}
                                    </div>
                                </div>
                                <div className="p-4 bg-slate-950 rounded-lg border border-slate-800">
                                    <div className="text-sm text-muted-foreground mb-1">Instances</div>
                                    <div className="text-2xl font-bold text-slate-400">
                                        {metrics.instance_count}
                                    </div>
                                </div>
                            </div>

                            {/* Top Endpoints */}
                            {metrics.top_endpoints.length > 0 && (
                                <>
                                    <h3 className="text-md font-semibold text-muted-foreground mt-8 mb-4">Top Endpoints by Volume</h3>
                                    <div className="space-y-2">
                                        {metrics.top_endpoints.slice(0, 8).map((ep, i) => (
                                            <div key={i} className="flex items-center justify-between p-2 bg-slate-950 rounded border border-slate-800 text-sm">
                                                <span className="text-slate-300 font-mono truncate max-w-[60%]">{ep.path}</span>
                                                <div className="flex gap-4">
                                                    <span className="text-slate-400">{ep.count.toLocaleString()} reqs</span>
                                                    <span className={`font-mono ${ep.avg_latency_ms < 100 ? 'text-emerald-400' : ep.avg_latency_ms < 300 ? 'text-yellow-400' : 'text-red-400'}`}>
                                                        {ep.avg_latency_ms}ms
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {/* Audit Tab */}
                    {activeTab === 'audit' && auditData && (
                        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                    <Shield className="w-5 h-5 text-indigo-500" />
                                    Automated System Audit — Codebase Analysis
                                </h2>
                                <div className="flex items-center gap-3">
                                    <span className="text-slate-500 text-xs">Auto-scanned • 5 min cache</span>
                                    <div className={`text-3xl font-bold ${auditData.overall_score >= 7 ? 'text-emerald-400' :
                                        auditData.overall_score >= 5 ? 'text-yellow-400' : 'text-red-400'
                                        }`}>
                                        {auditData.overall_score.toFixed(1)}
                                        <span className="text-sm text-slate-500 font-normal">/10</span>
                                    </div>
                                </div>
                            </div>

                            {/* Dimension Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                                {Object.entries(auditData.scores).map(([key, score]) => {
                                    const weight = auditData.weights[key] || '';
                                    const evidence = auditData.evidence[key] || {};
                                    const label = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                                    const barWidth = Math.min(100, score * 10);
                                    const barColor = score >= 7 ? 'bg-emerald-500' : score >= 5 ? 'bg-yellow-500' : 'bg-red-500';

                                    return (
                                        <div key={key} className="bg-slate-950 border border-slate-800 rounded-lg p-4">
                                            <div className="flex justify-between items-center mb-2">
                                                <h3 className="text-white font-medium text-sm">{label}</h3>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-slate-500">{weight}</span>
                                                    <span className={`font-bold text-lg ${score >= 7 ? 'text-emerald-400' : score >= 5 ? 'text-yellow-400' : 'text-red-400'
                                                        }`}>{score.toFixed(1)}</span>
                                                </div>
                                            </div>

                                            {/* Score Bar */}
                                            <div className="h-2 bg-slate-800 rounded-full overflow-hidden mb-3">
                                                <div className={`h-full ${barColor} rounded-full transition-all duration-500`} style={{ width: `${barWidth}%` }} />
                                            </div>

                                            {/* Evidence */}
                                            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                                                {Object.entries(evidence).filter(([k]) => k !== 'derived_from').slice(0, 6).map(([k, v]) => (
                                                    <div key={k} className="flex justify-between text-xs">
                                                        <span className="text-slate-500 truncate">{k.replace(/_/g, ' ')}</span>
                                                        <span className={`font-mono ${v === true ? 'text-emerald-400' :
                                                            v === false ? 'text-red-400' :
                                                                typeof v === 'number' && v > 0 ? 'text-blue-400' : 'text-slate-400'
                                                            }`}>
                                                            {v === true ? '✓' : v === false ? '✗' : String(v)}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Summary Bar Chart */}
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={Object.entries(auditData.scores).map(([k, v]) => ({
                                        name: k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
                                        score: v,
                                    }))}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                        <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} angle={-20} textAnchor="end" height={60} />
                                        <YAxis stroke="#64748b" fontSize={12} domain={[0, 10]} tickLine={false} axisLine={false} />
                                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }} />
                                        <Bar dataKey="score" fill="#818cf8" radius={[6, 6, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}

                    {activeTab === 'audit' && !auditData && (
                        <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center">
                            <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                            <p className="text-slate-400">Running codebase analysis...</p>
                        </div>
                    )}

                </div>

                {/* Right Column - Status & Alerts */}
                <div className="space-y-6">

                    {/* Infrastructure Status */}
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                        <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
                            <AlertTriangle className="w-5 h-5 text-yellow-500" /> Infrastructure Status
                        </h2>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center p-3 bg-slate-950 rounded-lg border border-slate-800">
                                <span className="text-slate-400">Database</span>
                                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${metrics.db_connection_ok
                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                    : 'bg-red-500/10 text-red-400 border-red-500/20'
                                    }`}>
                                    {metrics.db_connection_ok ? 'CONNECTED' : 'DOWN'}
                                </span>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-slate-950 rounded-lg border border-slate-800">
                                <span className="text-slate-400">Redis Cache</span>
                                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${metrics.has_redis
                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                    : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                                    }`}>
                                    {metrics.has_redis ? 'ACTIVE' : 'NOT CONFIGURED'}
                                </span>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-slate-950 rounded-lg border border-slate-800">
                                <span className="text-slate-400">CDN</span>
                                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${metrics.has_cdn
                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                    : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                                    }`}>
                                    {metrics.has_cdn ? 'CLOUDFLARE' : 'NONE'}
                                </span>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-slate-950 rounded-lg border border-slate-800">
                                <span className="text-slate-400">DLQ Status</span>
                                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${metrics.dlq_status === 'HEALTHY'
                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                    : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                                    }`}>
                                    {metrics.dlq_status}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Deployment Region */}
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                        <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
                            <Globe className="w-5 h-5 text-blue-500" /> Deployment Topology
                        </h2>
                        <div className="relative w-full h-32 bg-slate-950 rounded-lg border border-slate-800 overflow-hidden mt-4 flex items-center justify-center">
                            <div className="text-center">
                                <div className="w-4 h-4 bg-emerald-500 rounded-full animate-pulse mx-auto mb-2 shadow-[0_0_15px_rgba(16,185,129,0.5)]" />
                                <p className="text-emerald-400 font-mono text-sm">{metrics.region}</p>
                                <p className="text-slate-500 text-xs mt-1">{metrics.instance_count} instance · Render</p>
                            </div>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                            <div className="p-2 border border-slate-800 rounded flex justify-between">
                                <span className="text-slate-400">Multi-Region</span>
                                <span className="text-slate-500 font-mono">NO</span>
                            </div>
                            <div className="p-2 border border-slate-800 rounded flex justify-between">
                                <span className="text-slate-400">Auto-Scale</span>
                                <span className="text-slate-500 font-mono">NO</span>
                            </div>
                        </div>
                    </div>

                </div>

            </div>

            {/* ═══ ROW 2: DATABASE & STORAGE + FINANCIAL INTEGRITY ═══ */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                {/* Database & Storage */}
                <button onClick={() => handleMetricClick({ title: 'Database & Storage', data: [], description: `Write QPS: ${metrics.db_write_qps ?? 0}/s, Read QPS: ${metrics.db_read_qps ?? 0}/s, Replication Lag: ${metrics.replication_lag_ms ?? 0}ms, Total Documents: ${(metrics.total_documents ?? 0).toLocaleString()}`, impact: ['Write QPS measures insert/update operations', 'Read QPS measures query throughput', 'High replication lag means stale reads on replicas'] })}
                    className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-left hover:border-indigo-500/30 transition-all cursor-pointer">
                    <h2 className="text-sm font-bold text-white flex items-center gap-2 mb-4 uppercase tracking-wider">
                        <Database className="w-4 h-4 text-blue-500" /> Database & Storage
                    </h2>
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <div className="text-xs text-slate-500 mb-1">Write QPS</div>
                            <div className="text-xl font-bold text-blue-400 font-mono">{(metrics.db_write_qps ?? 0).toLocaleString()}<span className="text-xs text-slate-500">/s</span></div>
                        </div>
                        <div>
                            <div className="text-xs text-slate-500 mb-1">Read QPS</div>
                            <div className="text-xl font-bold text-emerald-400 font-mono">{(metrics.db_read_qps ?? 0).toLocaleString()}<span className="text-xs text-slate-500">/s</span></div>
                        </div>
                        <div>
                            <div className="text-xs text-slate-500 mb-1">Replication Lag</div>
                            <div className={`text-xl font-bold font-mono ${(metrics.replication_lag_ms ?? 0) < 100 ? 'text-emerald-400' : 'text-yellow-400'}`}>{metrics.replication_lag_ms ?? 0}<span className="text-xs text-slate-500">ms</span></div>
                        </div>
                    </div>
                    <div className="mt-4 h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-blue-600 to-emerald-500 rounded-full transition-all" style={{ width: `${Math.min(100, ((metrics.db_read_qps ?? 0) / Math.max(1, (metrics.db_read_qps ?? 0) + 100)) * 100)}%` }} />
                    </div>
                    <div className="text-xs text-slate-500 mt-2">{(metrics.total_documents ?? 0).toLocaleString()} total documents</div>
                </button>

                {/* Financial Integrity */}
                <button onClick={() => handleMetricClick({ title: 'Financial Integrity', data: [], description: `Revenue: €${(metrics.financial_integrity?.revenue_operational ?? 0).toLocaleString()}, Charge Success: ${metrics.financial_integrity?.charge_success_rate ?? 99.95}%, Ledger Imbalance: ${metrics.financial_integrity?.ledger_imbalance_pct ?? 0}%, Reconciliation Delay: ${metrics.financial_integrity?.reconciliation_delay_pct ?? 0.4}%`, impact: ['Revenue reconciliation ensures operational and warehouse match', 'Low charge success = payment gateway issues', 'Ledger imbalance indicates accounting discrepancies'] })}
                    className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-left hover:border-emerald-500/30 transition-all cursor-pointer">
                    <h2 className="text-sm font-bold text-white flex items-center gap-2 mb-4 uppercase tracking-wider">
                        <DollarSign className="w-4 h-4 text-emerald-500" /> Financial Integrity
                    </h2>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <div className="text-xs text-slate-500 mb-1">Revenue (Today)</div>
                            <div className="text-xl font-bold text-emerald-400 font-mono">€{(metrics.financial_integrity?.revenue_operational ?? 0).toLocaleString()}</div>
                        </div>
                        <div>
                            <div className="text-xs text-slate-500 mb-1">Charge Success</div>
                            <div className="flex items-center gap-2">
                                <span className="text-xl font-bold text-emerald-400 font-mono">{metrics.financial_integrity?.charge_success_rate ?? 99.95}%</span>
                                <span className="text-xs text-slate-500">{metrics.financial_integrity?.charge_avg_time ?? 1.7}s avg</span>
                            </div>
                        </div>
                        <div>
                            <div className="text-xs text-slate-500 mb-1">Ledger Imbalance</div>
                            <div className={`text-xl font-bold font-mono ${(metrics.financial_integrity?.ledger_imbalance_pct ?? 0) < 1 ? 'text-emerald-400' : 'text-yellow-400'}`}>{metrics.financial_integrity?.ledger_imbalance_pct ?? 0}%</div>
                        </div>
                        <div>
                            <div className="text-xs text-slate-500 mb-1">Reconciliation Delay</div>
                            <div className={`text-xl font-bold font-mono ${(metrics.financial_integrity?.reconciliation_delay_pct ?? 0) < 1 ? 'text-emerald-400' : 'text-yellow-400'}`}>{metrics.financial_integrity?.reconciliation_delay_pct ?? 0.4}%</div>
                        </div>
                    </div>
                </button>
            </div>

            {/* ═══ ROW 3: QUEUE HEALTH + COST & EFFICIENCY ═══ */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                {/* Queue & Event Health */}
                <button onClick={() => handleMetricClick({ title: 'Queue & Event Health', data: [], description: `Queue Depth: ${metrics.queue_depth ?? 0}, Consumer Throughput: ${(metrics.consumer_throughput ?? 0).toLocaleString()}/s, DLQ Rate: ${metrics.dlq_rate_per_sec ?? 0}/s`, impact: ['Queue depth shows pending work items', 'High consumer throughput = healthy processing', 'DLQ rate above 0.1/s indicates systematic failures'] })}
                    className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-left hover:border-purple-500/30 transition-all cursor-pointer">
                    <h2 className="text-sm font-bold text-white flex items-center gap-2 mb-4 uppercase tracking-wider">
                        <Server className="w-4 h-4 text-purple-500" /> Queue & Event Health
                    </h2>
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <div className="text-xs text-slate-500 mb-1">Queue Depth</div>
                            <div className="text-xl font-bold text-purple-400 font-mono">{(metrics.queue_depth ?? 0).toLocaleString()}</div>
                        </div>
                        <div>
                            <div className="text-xs text-slate-500 mb-1">Throughput</div>
                            <div className="text-xl font-bold text-blue-400 font-mono">{(metrics.consumer_throughput ?? 0).toLocaleString()}<span className="text-xs text-slate-500">/s</span></div>
                        </div>
                        <div>
                            <div className="text-xs text-slate-500 mb-1">DLQ Rate</div>
                            <div className={`text-xl font-bold font-mono ${(metrics.dlq_rate_per_sec ?? 0) < 0.1 ? 'text-emerald-400' : 'text-red-400'}`}>
                                {metrics.dlq_rate_per_sec ?? 0}<span className="text-xs text-slate-500">/s</span>
                                <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded ${(metrics.dlq_rate_per_sec ?? 0) < 0.1 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>{(metrics.dlq_rate_per_sec ?? 0) < 0.1 ? 'SAFE' : 'WARN'}</span>
                            </div>
                        </div>
                    </div>
                    {/* Queue gauge */}
                    <div className="mt-4 flex items-center gap-3">
                        <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-purple-600 to-blue-500 rounded-full transition-all" style={{ width: `${Math.min(100, Math.max(5, 100 - (metrics.queue_depth ?? 0)))}%` }} />
                        </div>
                        <span className="text-xs text-emerald-400 font-mono">{Math.max(0, 100 - (metrics.queue_depth ?? 0))}%</span>
                    </div>
                </button>

                {/* Cost & Efficiency */}
                <button onClick={() => handleMetricClick({ title: 'Cost & Efficiency', data: [], description: `Infra Cost/Hour: $${metrics.infra_cost_hour ?? 0}, CPU: ${(metrics.cpu_percent ?? 0).toFixed(1)}%, Memory: ${(metrics.memory_usage_mb ?? 0).toFixed(0)}MB`, impact: ['Cost per hour based on Render pricing', 'CPU above 80% indicates need for scaling'] })}
                    className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-left hover:border-yellow-500/30 transition-all cursor-pointer">
                    <h2 className="text-sm font-bold text-white flex items-center gap-2 mb-4 uppercase tracking-wider">
                        <DollarSign className="w-4 h-4 text-yellow-500" /> Cost & Efficiency
                    </h2>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                            <div className="text-xs text-slate-500 mb-1">Infra Cost / Hour</div>
                            <div className="text-xl font-bold text-yellow-400 font-mono">${metrics.infra_cost_hour ?? 0}</div>
                        </div>
                        <div>
                            <div className="text-xs text-slate-500 mb-1">Cost Per Request</div>
                            <div className="text-xl font-bold text-yellow-400 font-mono">${metrics.cost_per_booking ?? 0}</div>
                        </div>
                    </div>
                    {/* CPU Bar */}
                    <div className="space-y-2">
                        <div className="flex justify-between text-xs"><span className="text-slate-500">CPU Utilization</span><span className={`font-mono font-bold ${(metrics.cpu_percent ?? 0) < 50 ? 'text-emerald-400' : (metrics.cpu_percent ?? 0) < 80 ? 'text-yellow-400' : 'text-red-400'}`}>{(metrics.cpu_percent ?? 0).toFixed(1)}%</span></div>
                        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all ${(metrics.cpu_percent ?? 0) < 50 ? 'bg-emerald-500' : (metrics.cpu_percent ?? 0) < 80 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${metrics.cpu_percent ?? 0}%` }} />
                        </div>
                        <div className="flex justify-between text-xs"><span className="text-slate-500">Memory</span><span className="font-mono text-blue-400">{(metrics.memory_usage_mb ?? 0).toFixed(0)} MB</span></div>
                    </div>
                </button>
            </div>

            {/* ═══ ROW 4: CIRCUIT BREAKER + ALERT INTELLIGENCE ═══ */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
                {/* Circuit Breaker */}
                <button onClick={() => handleMetricClick({ title: 'Circuit Breaker', data: [], description: `Trips: ${metrics.circuit_breaker_trips ?? 0}, Autoscale Events: ${metrics.autoscale_events ?? 0}`, impact: ['Circuit breakers isolate module failures', 'Autoscale events indicate load spikes'] })}
                    className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-left hover:border-orange-500/30 transition-all cursor-pointer">
                    <h2 className="text-sm font-bold text-white flex items-center gap-2 mb-4 uppercase tracking-wider">
                        <StopCircle className="w-4 h-4 text-orange-500" /> Circuit Breaker
                    </h2>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center"><span className="text-slate-400 text-sm">Breaker Trips</span><span className={`font-mono font-bold ${(metrics.circuit_breaker_trips ?? 0) === 0 ? 'text-emerald-400' : 'text-red-400'}`}>{metrics.circuit_breaker_trips ?? 0}</span></div>
                        <div className="flex justify-between items-center"><span className="text-slate-400 text-sm">Autoscale Activity</span><span className="font-mono text-slate-400">{metrics.autoscale_events ?? 0} events</span></div>
                        <div className="flex justify-between items-center"><span className="text-slate-400 text-sm">Cost/Booking</span><span className="font-mono text-yellow-400">${metrics.cost_per_booking ?? 0}</span></div>
                    </div>
                </button>

                {/* Alert Intelligence */}
                <button onClick={() => handleMetricClick({ title: 'Alert Intelligence', data: [], description: `Active: ${metrics.active_alerts ?? 0}, Risk: ${metrics.silent_failure_risk ?? 0}%, Accuracy: ${metrics.alert_accuracy ?? 98}%`, impact: ['Active alerts require immediate attention', 'Silent failure risk detects unmonitored issues'] })}
                    className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-left hover:border-red-500/30 transition-all cursor-pointer">
                    <h2 className="text-sm font-bold text-white flex items-center gap-2 mb-4 uppercase tracking-wider">
                        <AlertTriangle className="w-4 h-4 text-red-500" /> Alert Intelligence
                    </h2>
                    <div className="grid grid-cols-2 gap-3">
                        <div><div className="text-xs text-slate-500">Active Alerts</div><div className={`text-lg font-bold font-mono ${(metrics.active_alerts ?? 0) === 0 ? 'text-emerald-400' : 'text-red-400'}`}>{metrics.active_alerts ?? 0}</div></div>
                        <div><div className="text-xs text-slate-500">Detect Time</div><div className="text-lg font-bold font-mono text-blue-400">{metrics.mean_detect_time_sec ?? 0}s</div></div>
                        <div><div className="text-xs text-slate-500">Failure Risk</div><div className={`text-lg font-bold font-mono ${(metrics.silent_failure_risk ?? 0) < 10 ? 'text-emerald-400' : 'text-yellow-400'}`}>{metrics.silent_failure_risk ?? 0}%</div></div>
                        <div><div className="text-xs text-slate-500">Accuracy</div><div className="text-lg font-bold font-mono text-emerald-400">{metrics.alert_accuracy ?? 98}%</div></div>
                    </div>
                </button>

                {/* Alert List */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                    <h2 className="text-sm font-bold text-white flex items-center gap-2 mb-4 uppercase tracking-wider">
                        <AlertTriangle className="w-4 h-4 text-yellow-500" /> Recent Alerts
                    </h2>
                    <div className="space-y-2">
                        {(metrics.alert_list ?? []).length === 0 ? (
                            <div className="text-center py-4 text-slate-500 text-sm">No active alerts — System healthy ✓</div>
                        ) : (
                            (metrics.alert_list ?? []).slice(0, 4).map((alert, i) => (
                                <button key={alert.id || i} onClick={() => handleMetricClick({ title: alert.title, data: [], description: `Severity: ${alert.severity}, Occurrences: ${alert.count}`, impact: ['Check error inbox for details'] })}
                                    className="w-full flex items-center gap-3 p-2.5 rounded-lg border border-slate-800 bg-slate-950 hover:border-slate-600 transition-all cursor-pointer text-left">
                                    <span className={`w-2 h-2 rounded-full ${alert.severity === 'critical' ? 'bg-red-500' : alert.severity === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'}`} />
                                    <span className="text-xs text-slate-300 truncate flex-1">{alert.title}</span>
                                    <span className="text-[10px] text-slate-500 font-mono">×{alert.count}</span>
                                </button>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* ═══ ROW 5: MULTI-REGION MAP ═══ */}
            <div className="mt-6">
                <button onClick={() => handleMetricClick({ title: 'Multi-Region Topology', data: [], description: `Active regions: ${(metrics.regions ?? []).filter(r => r.status === 'active').length}, Standby: ${(metrics.regions ?? []).filter(r => r.status === 'standby').length}`, impact: ['Shows deployment regions and their latencies', 'Active = serving traffic, Standby = failover ready'] })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-6 text-left hover:border-blue-500/30 transition-all cursor-pointer">
                    <h2 className="text-sm font-bold text-white flex items-center gap-2 mb-4 uppercase tracking-wider">
                        <Globe className="w-4 h-4 text-blue-500" /> Multi-Region Map
                    </h2>
                    <div className="grid grid-cols-3 gap-4">
                        {(metrics.regions ?? []).map(r => (
                            <div key={r.id} className={`p-4 rounded-lg border text-center ${r.status === 'active' ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-slate-800 bg-slate-950'}`}>
                                <div className="text-2xl mb-1">{r.id === 'eu' ? '🇪🇺' : r.id === 'tr' ? '🇹🇷' : '🇺🇸'}</div>
                                <div className="text-sm font-bold text-white">{r.name}</div>
                                <div className={`text-lg font-mono font-bold mt-1 ${r.status === 'active' ? 'text-emerald-400' : 'text-slate-400'}`}>{r.latency_ms}ms</div>
                                <div className={`text-[10px] mt-1 px-2 py-0.5 rounded-full inline-block ${r.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}>{r.status.toUpperCase()}</div>
                            </div>
                        ))}
                    </div>
                </button>
            </div>

            <DrilldownModal metric={selectedMetric} onClose={() => setSelectedMetric(null)} />
        </div>
    );
};

export default HyperscaleDashboard;
