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
StopCircle
} from 'lucide-react';
import React,{ useEffect,useState } from 'react';
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
XAxis,YAxis
} from 'recharts';

// Simulate live data generation
const generateTimeSeriesData = (points: number, base: number, variance: number, spikeIdx = -1) => {
    return Array.from({ length: points }).map((_, i) => ({
        time: `-${points - i}m`,
        value: i === spikeIdx ? base + (variance * 4) : Math.max(0, base + (Math.random() * variance * 2 - variance)),
        secondary: Math.max(0, (base * 0.8) + (Math.random() * variance - variance / 2))
    }));
};

const HyperscaleDashboard: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'executive' | 'engineering' | 'financial'>('executive');
    const [selectedMetric, setSelectedMetric] = useState<any | null>(null);

    // Simulated Live Metrics State
    const [metrics, setMetrics] = useState({
        p99Latency: 237,
        rps: 4200,
        dlqLag: 0,
        financialDrift: 0.00,
        errorRate: 0.02,
        dbConnections: 85,
        memoryUsage: 62
    });

    // Time Series Data
    const latencyData = generateTimeSeriesData(30, 150, 40, 25);
    const rpsData = generateTimeSeriesData(30, 4000, 500);
    const queueData = generateTimeSeriesData(30, 5, 2);
    const costData = generateTimeSeriesData(30, 0.012, 0.001);

    // Auto-refresh simulation
    useEffect(() => {
        const timer = setInterval(() => {
            setMetrics(prev => ({
                ...prev,
                p99Latency: Math.max(100, prev.p99Latency + (Math.random() * 20 - 10)),
                rps: Math.max(1000, prev.rps + (Math.random() * 400 - 200)),
                errorRate: Math.max(0.01, prev.errorRate + (Math.random() * 0.02 - 0.01))
            }));
        }, 2000);
        return () => clearInterval(timer);
    }, []);

    // Handlers
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleMetricClick = (title: string, data: /**/any, description: string, impact: string[]) => {
        setSelectedMetric({ title, data, description, impact });
    };

    const getStatusColor = (val: number, threshold1: number, threshold2: number, inverse = false) => {
        const isBad = inverse ? val < threshold1 : val > threshold1;
        const isCritical = inverse ? val < threshold2 : val > threshold2;
        if (isCritical) return 'text-red-500';
        if (isBad) return 'text-yellow-500';
        return 'text-emerald-500';
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const TopStatCard = ({ title, value, unit, icon: Icon, trend, statusClass, onClickMap }: /**/any) => (
        <div
            onClick={() => handleMetricClick(title, onClickMap.data, onClickMap.desc, onClickMap.impact)}
            className="bg-slate-900 border border-slate-800 rounded-xl p-4 cursor-pointer hover:border-indigo-500 transition-all group relative overflow-hidden"
        >
            <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-indigo-500/10 to-transparent rounded-bl-3xl" />
            <div className="flex justify-between items-start mb-2">
                <p className="text-slate-400 text-sm font-medium">{title}</p>
                <Icon className={`w-5 h-5 ${statusClass}`} />
            </div>
            <div className="flex items-baseline gap-2">
                <h3 className="text-3xl font-bold text-white">{typeof value === 'number' ? value.toFixed(value % 1 === 0 ? 0 : 2) : value}</h3>
                <span className="text-slate-500 text-sm">{unit}</span>
            </div>
            <div className="mt-2 flex items-center text-xs">
                {trend > 0 ? <ArrowUpRight className="w-3 h-3 text-red-400 mr-1" /> : <ArrowDownRight className="w-3 h-3 text-emerald-400 mr-1" />}
                <span className={trend > 0 ? "text-red-400" : "text-emerald-400"}>{Math.abs(trend)}% vs 1h</span>
            </div>
        </div>
    );

    const DrilldownModal = () => {
        if (!selectedMetric) return null;
        return (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl">
                    <div className="sticky top-0 bg-slate-900/90 backdrop-blur border-b border-slate-800 p-6 flex justify-between items-center z-10">
                        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                            <Activity className="text-indigo-500" />
                            {selectedMetric.title} Drill-down
                        </h2>
                        <button title="Close Drill-down" onClick={() => setSelectedMetric(null)} className="text-slate-400 hover:text-white p-2">
                            <StopCircle className="w-6 h-6" />
                        </button>
                    </div>

                    <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="md:col-span-2">
                            <div className="h-80 bg-slate-950 rounded-xl border border-slate-800 p-4 mb-6">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={selectedMetric.data}>
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
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                                    <h4 className="text-slate-300 font-medium mb-1">Ne Anlama Geliyor?</h4>
                                    <p className="text-sm text-muted-foreground leading-relaxed">{selectedMetric.description}</p>
                                </div>
                                <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                                    <h4 className="text-slate-300 font-medium mb-2">Sistem Etki Alanı (Blast Radius)</h4>
                                    <ul className="space-y-2">
                                        {selectedMetric.impact.map((imp: string, i: number) => (
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
                                    <span className="text-slate-400">SLO Threshold</span>
                                    <span className="text-emerald-400 font-mono">OK</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-400">Affected Regions</span>
                                    <span className="text-white">us-east-1, eu-central-1</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-400">Active Incidents</span>
                                    <span className="text-emerald-400">0</span>
                                </div>
                            </div>

                            <h3 className="text-lg font-semibold text-white mt-8 mb-4">Root Cause AI Analysis</h3>
                            <div className="bg-indigo-950/30 p-4 rounded-xl border border-indigo-500/30">
                                <p className="text-sm text-indigo-200 leading-relaxed">
                                    Analyzing historical patterns: Spike correlates 85% with background reconciliation jobs locking the primary DB node. Recommendation: Increase connection pool size or offload reconciliation to readable secondary node.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-[#050510] text-slate-200 p-4 md:p-8 font-sans selection:bg-indigo-500/30">

            {/* Header & Meta Metrics */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
                        <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                        Mission Control
                    </h1>
                    <p className="text-slate-400 mt-1">Hyperscale APM & SRE Telemetry</p>
                </div>

                <div className="flex flex-wrap gap-4">
                    <div className="px-4 py-2 bg-slate-900 border border-slate-800 rounded-lg flex items-center gap-3">
                        <div className="text-right">
                            <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">System IQ</div>
                            <div className="text-lg font-bold text-indigo-400">100 / 100</div>
                        </div>
                        <div className="w-10 h-10 rounded-full border-2 border-indigo-500/30 flex items-center justify-center">
                            <Shield className="w-5 h-5 text-indigo-400" />
                        </div>
                    </div>
                    <div className="px-4 py-2 bg-slate-900 border border-slate-800 rounded-lg flex items-center gap-3">
                        <div className="text-right">
                            <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Resilience</div>
                            <div className="text-lg font-bold text-emerald-400">99.99%</div>
                        </div>
                        <div className="w-10 h-10 rounded-full border-2 border-emerald-500/30 flex items-center justify-center">
                            <Shield className="w-5 h-5 text-emerald-400" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex space-x-1 bg-slate-900/50 p-1 rounded-xl w-full max-w-md mb-8 border border-slate-800">
                {(['executive', 'engineering', 'financial'] as const).map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium capitalize transition-all ${activeTab === tab
                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20'
                            : 'text-slate-400 hover:text-white hover:bg-slate-800'
                            }`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* The 5 Golden Hyperscale Signals (Always Visible) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
                <TopStatCard
                    title="p99 Latency (Tail)"
                    value={metrics.p99Latency}
                    unit="ms"
                    icon={Activity}
                    trend={1.2}
                    statusClass={getStatusColor(metrics.p99Latency, 300, 500)}
                    onClickMap={{
                        data: latencyData,
                        desc: "P99 Latency, sistemdeki en yavaş %1'lik isteklerin ne kadar sürdüğünü ölçer. Hyperscale sistemlerde ortalama (p50) hiçbir şey ifade etmez çünkü milyonlarca istekte %1'lik kesim bile yüz binlerce kullanıcı demektir.",
                        impact: ["Yüksek p99, Thread Havuzlarının (Worker'ların) kilitlendiğini gösterir.", "Müşteri ödeme ekranında dönen çarkta takılı kalır.", "AWS Load Balancer timeout yiyebilir (504 Gateway Timeout)."]
                    }}
                />
                <TopStatCard
                    title="Queue Lag (DLQ)"
                    value={metrics.dlqLag}
                    unit="events"
                    icon={Database}
                    trend={0}
                    statusClass={getStatusColor(metrics.dlqLag, 10, 100)}
                    onClickMap={{
                        data: queueData,
                        desc: "İşlenemeyen ve Dead Letter Queue'ya (DLQ) düşen veya Event Bus'ta bekleyen olay sayısı. Sistemin 'Backpressure' yiyip yemediğinin en net göstergesidir.",
                        impact: ["Sıfırdan büyükse, asenkron background task'ler ölüyor demektir.", "Mutfak ekranlarına (KDS) siparişler dakikalar sonra düşer.", "Mail ve bildirim kuyrukları bloklanır."]
                    }}
                />
                <TopStatCard
                    title="Financial Drift"
                    value={metrics.financialDrift}
                    unit="bps"
                    icon={DollarSign}
                    trend={0}
                    statusClass={getStatusColor(metrics.financialDrift, 1, 5)}
                    onClickMap={{
                        data: generateTimeSeriesData(30, 0, 0.1),
                        desc: "Veritabanındaki sipariş/cüzdan tutarları ile ödeme geçidindeki (Stripe vb.) settlement (mutabakat) tutarları arasındaki kuruşluk sapmalar. Basis Points (bps) cinsinden ölçülür.",
                        impact: ["Muhasebe dengesi (Ledger Imbalance) bozulur.", "Kullanıcıdan çift çekim yapılmış veya eksik iade (Refund) yapılmış olabilir.", "Sıfır değilse Idempotency mekanizmasında açık var demektir."]
                    }}
                />
                <TopStatCard
                    title="Traffic (RPS)"
                    value={metrics.rps}
                    unit="req/s"
                    icon={Pulse}
                    trend={-5.4}
                    statusClass="text-indigo-400"
                    onClickMap={{
                        data: rpsData,
                        desc: "Saniyede sunucuya gelen toplam HTTP ve WebSocket istek sayısı. Sistemin anlık nabzıdır.",
                        impact: ["RPS artarken Latency de artıyorsa Autoscaling devreye girmemiştir.", "Sıfıra inmesi DNS kopukluğu veya WAF engellemesi anlamına gelir.", "Sade RPS izlemek yerine 'Cost per 1k Requests' olarak maliyet endekslenmelidir."]
                    }}
                />
                <TopStatCard
                    title="Error Rate (5xx)"
                    value={metrics.errorRate * 100}
                    unit="%"
                    icon={AlertTriangle}
                    trend={0.01}
                    statusClass={getStatusColor(metrics.errorRate, 0.01, 0.05)}
                    onClickMap={{
                        data: generateTimeSeriesData(30, 0.02, 0.01),
                        desc: "Sunucunun doğrudan çökme (500) veya zaman aşımı (504) fırlattığı isteklerin tüm trafik içindeki oranı.",
                        impact: ["Geçici olarak CloudFlare devreden çıkabilir.", "Mobil uygulamada beyaz/kırmızı ekran hataları fırlar.", "Circuit breaker'ların tetiklenmesine yol açarak bazı özellikleri 'Graceful Degradation' (örneğin sadece nakit ödemeye izin verme) moduna sokar."]
                    }}
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
                                onClick={() => handleMetricClick("Latency/RPS Correlation", rpsData, "Yük (RPS) arttıkça gecikmenin (Latency) nasıl tepki verdiğini gösterir. İdeal bir sistemde RPS uçsa bile Latency çizgisi düz kalmalıdır (Cache ve Auto-scale sayesinde).", ["Veritabanı darboğazları", "Connection Pool yetersizliği"])}
                            >
                                <Maximize2 className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="h-72">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={rpsData}>
                                    <defs>
                                        <linearGradient id="rpsGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="latGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                    <XAxis dataKey="time" stroke="#64748b" fontSize={12} tickLine={false} />
                                    <YAxis yAxisId="left" stroke="#818cf8" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis yAxisId="right" orientation="right" stroke="#f87171" fontSize={12} tickLine={false} axisLine={false} />
                                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }} /* keep-inline */ />
                                    <Area yAxisId="left" type="monotone" dataKey="value" name="RPS" stroke="#818cf8" fill="url(#rpsGrad)" strokeWidth={2} />
                                    <Area yAxisId="right" type="monotone" dataKey="secondary" name="p99 Latency (ms)" stroke="#f87171" fill="url(#latGrad)" strokeWidth={2} />
                                </AreaChart>
                            </ResponsiveContainer>
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
                                    <div className="flex justify-between items-center cursor-pointer hover:bg-slate-800 p-2 rounded transition-colors"
                                        onClick={() => handleMetricClick("Lock Contention", [], "Aynı anda aynı siparişi veya stok kaydını güncellemeye çalışan thread'lerin veritabanında kuyruk oluşturma oranı.", ["Stok sayımı hataları", "Deadlock çökmeleri"])}>
                                        <span className="text-slate-400">Lock Contention</span>
                                        <span className="text-emerald-400 font-mono">0.01%</span>
                                    </div>
                                    <div className="w-full bg-slate-800 rounded-full h-1.5"><div className="bg-emerald-500 h-1.5 rounded-full w-[2%]"></div></div>

                                    <div className="flex justify-between items-center cursor-pointer hover:bg-slate-800 p-2 rounded transition-colors"
                                        onClick={() => handleMetricClick("Index Hit Ratio", [], "Sorguların ne kadarının Full-Table Scan yerine İndeks kullanarak hızlı döndüğü.", ["Disk I/O Spike'ları", "Yavaş arama çubukları"])}>
                                        <span className="text-slate-400">Index Hit Ratio</span>
                                        <span className="text-emerald-400 font-mono">99.8%</span>
                                    </div>
                                    <div className="w-full bg-slate-800 rounded-full h-1.5"><div className="bg-emerald-500 h-1.5 rounded-full w-[99%]"></div></div>

                                    <div className="flex justify-between items-center cursor-pointer hover:bg-slate-800 p-2 rounded transition-colors"
                                        onClick={() => handleMetricClick("Replication Lag", [], "Primary (Yazma) sunucusundaki verinin Replicaya (Okuma) kopyalanma süresi. Saniyeler sürerse kullanıcı eski menüyü görür.", ["Stale Data (Bayat veri okunması)", "Sipariş durum uyumsuzlukları"])}>
                                        <span className="text-slate-400">Replication Lag</span>
                                        <span className="text-yellow-400 font-mono">45ms</span>
                                    </div>
                                    <div className="w-full bg-slate-800 rounded-full h-1.5"><div className="bg-yellow-400 h-1.5 rounded-full w-[15%]"></div></div>
                                </div>
                            </div>

                            {/* Queue Panel */}
                            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                                <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
                                    <Server className="w-5 h-5 text-purple-500" /> Event Bus & Consumers
                                </h2>
                                <ResponsiveContainer width="100%" height={150}>
                                    <BarChart data={queueData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                        <XAxis dataKey="time" hide />
                                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }} /* keep-inline */ />
                                        <Bar dataKey="value" name="Events/sec" fill="#a855f7" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                                <div className="mt-4 flex justify-between items-center p-3 bg-slate-950 rounded-lg border border-slate-800">
                                    <span className="text-slate-400">Backpressure Active?</span>
                                    <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-full text-xs font-bold border border-emerald-500/20">NO (HEALTHY)</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'financial' && (
                        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                            <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-6">
                                <DollarSign className="w-5 h-5 text-emerald-500" /> Financial Integrity & Hyperscale Ledger
                            </h2>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="p-4 bg-slate-950 rounded-lg border border-slate-800">
                                    <div className="text-sm text-muted-foreground mb-1">Charge Success Rate</div>
                                    <div className="text-2xl font-bold text-emerald-400">99.98%</div>
                                </div>
                                <div className="p-4 bg-slate-950 rounded-lg border border-slate-800">
                                    <div className="text-sm text-muted-foreground mb-1">Double-Charge Prob.</div>
                                    <div className="text-2xl font-bold text-emerald-400">0.00%</div>
                                </div>
                                <div className="p-4 bg-slate-950 rounded-lg border border-slate-800">
                                    <div className="text-sm text-muted-foreground mb-1">Reconciliation Delay</div>
                                    <div className="text-2xl font-bold text-yellow-400">10m</div>
                                </div>
                                <div className="p-4 bg-red-950/20 rounded-lg border border-red-500/30">
                                    <div className="text-sm text-red-300 mb-1 cursor-help" title="Ledger imbalances signify lost revenue tracking between POS and Stripe">Ledger Imbalance</div>
                                    <div className="text-2xl font-bold text-emerald-400">€0.00</div>
                                </div>
                            </div>

                            <h3 className="text-md font-semibold text-muted-foreground mt-8 mb-4">Cost Efficiency Mapping</h3>
                            <ResponsiveContainer width="100%" height={150}>
                                <LineChart data={costData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                    <XAxis dataKey="time" hide />
                                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }} /* keep-inline */ />
                                    <Line type="step" dataKey="value" name="Cost per 1k Req (€)" stroke="#10b981" strokeWidth={2} dot={false} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    )}

                </div>

                {/* Right Column - Status & Alerts */}
                <div className="space-y-6">

                    {/* Active Alerts */}
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                        <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
                            <AlertTriangle className="w-5 h-5 text-yellow-500" /> Active Alert Intelligence
                        </h2>
                        <div className="space-y-3">
                            <div
                                className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg cursor-pointer hover:bg-red-500/20 transition-colors"
                                onClick={() => handleMetricClick("Multi-Region Failover Risk", [], "eu-central-1 bölgesindeki latency artışı nedeniyle trafiğin otomatik olarak farklı bir Availability Zone'a yönlendirilme riski.", ["Avrupa kullanıcıları 2-3 saniye yavaşlık hisseder.", "Eğer failover başlarsa kısa süreli connection drop (kopma) oluşur."])}
                            >
                                <div className="flex justify-between mb-1">
                                    <span className="text-sm font-semibold text-red-400">Region Latency Imbalance</span>
                                    <span className="text-xs text-slate-500">2m ago</span>
                                </div>
                                <p className="text-xs text-red-300">eu-central-1 showing p99 &gt; 800ms vs baseline 200ms.</p>
                            </div>

                            <div
                                className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg cursor-pointer hover:bg-yellow-500/20 transition-colors"
                                onClick={() => handleMetricClick("Fraud Pipeline Prediction", [], "Saniyede gelen webhook replay sayısı artışı. Botların eski başarılı webhook'ları tekrar sisteme gönderip 'ödendi' gösterme veya refund çekme çabası.", ["Eğer Idempotency açık kapatılırsa sahte refund üretilir.", "CPU utilization artar."])}
                            >
                                <div className="flex justify-between mb-1">
                                    <span className="text-sm font-semibold text-yellow-500">ML Anomaly: Spiky Webhooks</span>
                                    <span className="text-xs text-slate-500">12m ago</span>
                                </div>
                                <p className="text-xs text-yellow-300/80">Stripe Signature verification failures spiking +400%.</p>
                            </div>
                        </div>
                    </div>

                    {/* Map / Multi-region mock */}
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                        <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
                            <Globe className="w-5 h-5 text-blue-500" /> Multi-Region Fabric
                        </h2>
                        <div className="relative w-full h-40 bg-slate-950 rounded-lg border border-slate-800 overflow-hidden mt-4">
                            {/* Abstract nodes mapping */}
                            <div className="absolute top-[30%] left-[20%] w-4 h-4 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_15px_rgba(16,185,129,0.5)]">
                                <div className="absolute top-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] text-emerald-400 font-mono">us-east-1</div>
                            </div>
                            <div className="absolute top-[25%] right-[30%] w-4 h-4 bg-yellow-500 rounded-full animate-pulse shadow-[0_0_15px_rgba(234,179,8,0.5)]">
                                <div className="absolute top-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] text-yellow-400 font-mono">eu-central-1</div>
                            </div>
                            <div className="absolute bottom-[30%] right-[10%] w-4 h-4 bg-emerald-500 rounded-full opacity-50">
                                <div className="absolute top-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] text-emerald-400/50 font-mono">ap-southeast-1</div>
                            </div>

                            {/* SVG connections */}
                            <svg className="absolute inset-0 w-full h-full pointer-events-none">
                                <path d="M 20% 30% Q 40% 10% 70% 25%" fill="none" stroke="rgba(99, 102, 241, 0.3)" strokeWidth="2" strokeDasharray="4 4" className="animate-[dash_20s_linear_infinite]" />
                            </svg>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                            <div className="p-2 border border-slate-800 rounded flex justify-between">
                                <span className="text-slate-400">Cross-Region Lag</span>
                                <span className="text-white font-mono">1.2s</span>
                            </div>
                            <div className="p-2 border border-slate-800 rounded flex justify-between">
                                <span className="text-slate-400">Failover Readys</span>
                                <span className="text-emerald-400 font-mono">YES</span>
                            </div>
                        </div>
                    </div>

                </div>

            </div>

            <DrilldownModal />

            <style>{`
        @keyframes dash {
          to { stroke-dashoffset: -1000; }
        }
      `}</style>
        </div>
    );
};

export default HyperscaleDashboard;
