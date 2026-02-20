// @ts-nocheck
import { useState, useEffect, useMemo, useCallback } from 'react';
import { logger } from '@/lib/logger';
import { useVenue } from '@/context/VenueContext';
import api from '@/lib/api';
import PageContainer from '@/layouts/PageContainer';
import DataTable from '@/components/shared/DataTable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    Star, TrendingUp, TrendingDown, HelpCircle, XCircle,
    RefreshCw, Loader2, Filter, BarChart3, DollarSign,
    Target, Award,
} from 'lucide-react';

// ── KPI Stat Card ──────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, subtext, color = 'text-foreground' }) {
    return (
        <Card>
            <CardContent className="p-4 flex items-start gap-3">
                <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${color.includes('green') ? 'bg-green-500/10' : color.includes('amber') ? 'bg-amber-500/10' : color.includes('red') ? 'bg-red-500/10' : color.includes('blue') ? 'bg-blue-500/10' : 'bg-muted'}`}>
                    <Icon className={`h-5 w-5 ${color}`} />
                </div>
                <div className="min-w-0">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
                    <p className={`text-xl font-bold tabular-nums ${color}`}>{value}</p>
                    {subtext && <p className="text-xs text-muted-foreground">{subtext}</p>}
                </div>
            </CardContent>
        </Card>
    );
}

// ── Quadrant config ────────────────────────────────────────────────
const QUADRANTS = {
    STAR: {
        label: 'Star',
        icon: Star,
        color: 'text-green-500',
        bg: 'bg-green-500/10 border-green-500/30',
        description: 'High popularity + High profit',
        action: 'Promote & Feature',
    },
    PUZZLE: {
        label: 'Puzzle',
        icon: HelpCircle,
        color: 'text-blue-500',
        bg: 'bg-blue-500/10 border-blue-500/30',
        description: 'Low popularity + High profit',
        action: 'Market & Reposition',
    },
    PLOW_HORSE: {
        label: 'Plow Horse',
        icon: TrendingDown,
        color: 'text-amber-500',
        bg: 'bg-amber-500/10 border-amber-500/30',
        description: 'High popularity + Low profit',
        action: 'Re-engineer Recipe',
    },
    DOG: {
        label: 'Dog',
        icon: XCircle,
        color: 'text-red-500',
        bg: 'bg-red-500/10 border-red-500/30',
        description: 'Low popularity + Low profit',
        action: 'Remove or Rework',
    },
};

// Demo data removed — all data comes from the profitability API endpoint.

function classifyItem(item, avgPopularity, avgMargin) {
    const isPopular = item.times_sold >= avgPopularity;
    const isProfitable = item.margin_pct >= avgMargin;
    if (isPopular && isProfitable) return 'STAR';
    if (!isPopular && isProfitable) return 'PUZZLE';
    if (isPopular && !isProfitable) return 'PLOW_HORSE';
    return 'DOG';
}

// ── Quadrant Badge ─────────────────────────────────────────────────
function QuadrantBadge({ quadrant }) {
    const q = QUADRANTS[quadrant];
    if (!q) return null;
    const Icon = q.icon;
    return (
        <Badge variant="outline" className={`text-xs gap-1 ${q.bg} ${q.color}`}>
            <Icon className="h-3 w-3" /> {q.label}
        </Badge>
    );
}

// ═══════════════════════════════════════════════════════════════════
// ██  MENU ENGINEERING PAGE
// ═══════════════════════════════════════════════════════════════════
export default function MenuEngineering() {
    const { activeVenue } = useVenue();
    const venueId = activeVenue?.id;

    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [categoryFilter, setCategoryFilter] = useState('ALL');
    const [dateRange, setDateRange] = useState('30d');

    // ── Load data ──
    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            if (venueId) {
                const res = await api.get(`/venues/${venueId}/recipes/engineered/analytics/profitability?days=${dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90}`);
                setItems(res.data?.recipes || []);
            } else {
                setItems([]);
            }
        } catch {
            logger.error('Failed to load menu engineering data');
            setItems([]);
        } finally {
            setLoading(false);
        }
    }, [venueId, dateRange]);

    useEffect(() => { loadData(); }, [loadData]);

    // ── Filtering ──
    const categories = useMemo(() => {
        const cats = new Set(items.map(i => i.category));
        return ['ALL', ...Array.from(cats).sort()];
    }, [items]);

    const filtered = useMemo(() => {
        if (categoryFilter === 'ALL') return items;
        return items.filter(i => i.category === categoryFilter);
    }, [items, categoryFilter]);

    // ── Averages & Classification ──
    const { avgPopularity, avgMargin, classified, quadrantCounts } = useMemo(() => {
        if (filtered.length === 0) return { avgPopularity: 0, avgMargin: 0, classified: [], quadrantCounts: {} };
        const totalSold = filtered.reduce((s, i) => s + (i.times_sold || 0), 0);
        const totalMargin = filtered.reduce((s, i) => s + (i.margin_pct || 0), 0);
        const avgP = totalSold / filtered.length;
        const avgM = totalMargin / filtered.length;

        const counts = { STAR: 0, PUZZLE: 0, PLOW_HORSE: 0, DOG: 0 };
        const cl = filtered.map(item => {
            const q = classifyItem(item, avgP, avgM);
            counts[q]++;
            return { ...item, quadrant: q };
        });

        return { avgPopularity: avgP, avgMargin: avgM, classified: cl, quadrantCounts: counts };
    }, [filtered]);

    // ── KPIs ──
    const totalRevenue = useMemo(() => classified.reduce((s, i) => s + (i.revenue || 0), 0), [classified]);
    const totalProfit = useMemo(() => classified.reduce((s, i) => s + (i.profit || 0), 0), [classified]);
    const avgMarginAll = useMemo(() => classified.length > 0 ? classified.reduce((s, i) => s + (i.margin_pct || 0), 0) / classified.length : 0, [classified]);
    const bestSeller = useMemo(() => classified.reduce((best, i) => (i.times_sold > (best?.times_sold || 0) ? i : best), null), [classified]);

    // ── Chart dimensions ──
    const chartWidth = 600;
    const chartHeight = 400;
    const padding = 50;

    const maxSold = useMemo(() => Math.max(...classified.map(i => i.times_sold || 0), 1), [classified]);
    const maxMargin = useMemo(() => Math.max(...classified.map(i => i.margin_pct || 0), 1), [classified]);

    function toX(sold) {
        return padding + ((sold / (maxSold * 1.1)) * (chartWidth - padding * 2));
    }
    function toY(margin) {
        return chartHeight - padding - ((margin / (maxMargin * 1.1)) * (chartHeight - padding * 2));
    }

    const avgX = toX(avgPopularity);
    const avgY = toY(avgMargin);

    // ── Table columns ──
    const COLUMNS = [
        { key: 'name', label: 'Menu Item', sortable: true, size: 180 },
        { key: 'category', label: 'Category', sortable: true, size: 120 },
        {
            key: 'quadrant', label: 'Classification', sortable: true, size: 140,
            render: (row) => <QuadrantBadge quadrant={row.quadrant} />,
        },
        {
            key: 'times_sold', label: 'Times Sold', sortable: true, size: 100,
            render: (row) => <span className="tabular-nums font-medium">{row.times_sold?.toLocaleString() || 0}</span>,
        },
        {
            key: 'sell_price', label: 'Sell Price', sortable: true, size: 100,
            render: (row) => <span className="tabular-nums">€{(row.sell_price || 0).toFixed(2)}</span>,
        },
        {
            key: 'food_cost_pct', label: 'Food Cost %', sortable: true, size: 100,
            render: (row) => {
                const pct = row.food_cost_pct || 0;
                const clr = pct > 40 ? 'text-red-500' : pct > 30 ? 'text-amber-500' : 'text-green-500';
                return <span className={`tabular-nums font-medium ${clr}`}>{pct}%</span>;
            },
        },
        {
            key: 'margin_pct', label: 'Margin %', sortable: true, size: 100,
            render: (row) => {
                const m = row.margin_pct || 0;
                const clr = m >= 70 ? 'text-green-500' : m >= 50 ? 'text-amber-500' : 'text-red-500';
                return <span className={`tabular-nums font-bold ${clr}`}>{m}%</span>;
            },
        },
        {
            key: 'revenue', label: 'Revenue', sortable: true, size: 110,
            render: (row) => <span className="tabular-nums">€{(row.revenue || 0).toLocaleString()}</span>,
        },
        {
            key: 'profit', label: 'Profit', sortable: true, size: 110,
            render: (row) => {
                const p = row.profit || 0;
                return <span className={`tabular-nums font-medium ${p > 0 ? 'text-green-500' : 'text-red-500'}`}>€{p.toLocaleString()}</span>;
            },
        },
        {
            key: 'action', label: 'Action', size: 150,
            render: (row) => {
                const q = QUADRANTS[row.quadrant];
                if (!q) return null;
                return <span className={`text-xs font-medium ${q.color}`}>{q.action}</span>;
            },
        },
    ];

    const dotColor = (q) => {
        if (q === 'STAR') return 'fill-green-500';
        if (q === 'PUZZLE') return 'fill-blue-500';
        if (q === 'PLOW_HORSE') return 'fill-amber-500';
        return 'fill-red-500';
    };

    return (
        <PageContainer
            className=""
            title="Menu Engineering"
            description="Profitability × Popularity matrix — classify every dish"
            actions={
                <div className="flex gap-2">
                    <Select value={dateRange} onValueChange={setDateRange}>
                        <SelectTrigger className="w-[100px] h-9 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="7d">Last 7d</SelectItem>
                            <SelectItem value="30d">Last 30d</SelectItem>
                            <SelectItem value="90d">Last 90d</SelectItem>
                            <SelectItem value="ytd">YTD</SelectItem>
                        </SelectContent>
                    </Select>
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                        <SelectTrigger className="w-[140px] h-9 text-xs">
                            <Filter className="h-3.5 w-3.5 mr-1" /><SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {categories.map(c => <SelectItem key={c} value={c}>{c === 'ALL' ? 'All Categories' : c}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
                        <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />Refresh
                    </Button>
                </div>
            }
        >
            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            ) : (
                <div className="space-y-6">
                    {/* ── KPI Cards ── */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <StatCard icon={DollarSign} label="Total Revenue" value={`€${totalRevenue.toLocaleString()}`} subtext={`${classified.length} items`} color="text-green-500" />
                        <StatCard icon={TrendingUp} label="Total Profit" value={`€${totalProfit.toLocaleString()}`} subtext={`Avg margin ${avgMarginAll.toFixed(1)}%`} color="text-blue-500" />
                        <StatCard icon={Award} label="Best Seller" value={bestSeller?.name || '—'} subtext={`${bestSeller?.times_sold || 0} sold`} color="text-amber-500" />
                        <StatCard icon={Target} label="Menu Items" value={classified.length} subtext={`${quadrantCounts.STAR || 0} Stars, ${quadrantCounts.DOG || 0} Dogs`} color="text-foreground" />
                    </div>

                    {/* ── Quadrant Summary Cards ── */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {Object.entries(QUADRANTS).map(([key, q]) => {
                            const Icon = q.icon;
                            const count = quadrantCounts[key] || 0;
                            const pct = classified.length > 0 ? Math.round((count / classified.length) * 100) : 0;
                            return (
                                <Card key={key} className={`border ${q.bg}`}>
                                    <CardContent className="p-4 flex items-center gap-3">
                                        <Icon className={`h-8 w-8 ${q.color}`} />
                                        <div>
                                            <p className={`text-lg font-bold ${q.color}`}>{count}</p>
                                            <p className="text-xs text-muted-foreground">{q.label} ({pct}%)</p>
                                            <p className="text-[10px] text-muted-foreground">{q.action}</p>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>

                    {/* ── Scatter Plot (SVG) ── */}
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base flex items-center gap-2">
                                <BarChart3 className="h-5 w-5 text-amber-500" /> Menu Matrix — Popularity vs Profitability
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="w-full overflow-x-auto">
                                <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full max-w-[800px] mx-auto h-auto" style={{ minHeight: 300 }}>
                                    {/* Background quadrants */}
                                    <rect x={padding} y={padding} width={avgX - padding} height={avgY - padding} fill="rgba(59,130,246,0.04)" />
                                    <rect x={avgX} y={padding} width={chartWidth - padding - avgX} height={avgY - padding} fill="rgba(34,197,94,0.04)" />
                                    <rect x={padding} y={avgY} width={avgX - padding} height={chartHeight - padding - avgY} fill="rgba(239,68,68,0.04)" />
                                    <rect x={avgX} y={avgY} width={chartWidth - padding - avgX} height={chartHeight - padding - avgY} fill="rgba(245,158,11,0.04)" />

                                    {/* Quadrant labels */}
                                    <text x={padding + 8} y={padding + 18} className="fill-blue-400 text-[11px] font-semibold" opacity="0.7">PUZZLES</text>
                                    <text x={chartWidth - padding - 55} y={padding + 18} className="fill-green-400 text-[11px] font-semibold" opacity="0.7">STARS ★</text>
                                    <text x={padding + 8} y={chartHeight - padding - 8} className="fill-red-400 text-[11px] font-semibold" opacity="0.7">DOGS</text>
                                    <text x={chartWidth - padding - 90} y={chartHeight - padding - 8} className="fill-amber-400 text-[11px] font-semibold" opacity="0.7">PLOW HORSES</text>

                                    {/* Average lines */}
                                    <line x1={avgX} y1={padding} x2={avgX} y2={chartHeight - padding} stroke="currentColor" strokeWidth="1" strokeDasharray="4 4" opacity="0.3" />
                                    <line x1={padding} y1={avgY} x2={chartWidth - padding} y2={avgY} stroke="currentColor" strokeWidth="1" strokeDasharray="4 4" opacity="0.3" />

                                    {/* Axis labels */}
                                    <text x={chartWidth / 2} y={chartHeight - 10} textAnchor="middle" className="fill-muted-foreground text-[11px]">Popularity (Times Sold) →</text>
                                    <text x={14} y={chartHeight / 2} textAnchor="middle" className="fill-muted-foreground text-[11px]" transform={`rotate(-90, 14, ${chartHeight / 2})`}>Profit Margin % →</text>

                                    {/* Data points */}
                                    {classified.map((item) => (
                                        <g key={item.id}>
                                            <circle
                                                cx={toX(item.times_sold)}
                                                cy={toY(item.margin_pct)}
                                                r={Math.max(5, Math.min(14, (item.revenue || 0) / 1500))}
                                                className={`${dotColor(item.quadrant)} opacity-70 hover:opacity-100 transition-opacity cursor-pointer`}
                                                stroke="white"
                                                strokeWidth="1"
                                            >
                                                <title>{`${item.name}\nSold: ${item.times_sold}\nMargin: ${item.margin_pct}%\nRevenue: €${item.revenue?.toLocaleString()}`}</title>
                                            </circle>
                                            {item.revenue > 5000 && (
                                                <text
                                                    x={toX(item.times_sold)}
                                                    y={toY(item.margin_pct) - (Math.max(5, Math.min(14, (item.revenue || 0) / 1500)) + 4)}
                                                    textAnchor="middle"
                                                    className="fill-foreground text-[9px] font-medium pointer-events-none"
                                                >
                                                    {item.name.length > 15 ? item.name.slice(0, 15) + '…' : item.name}
                                                </text>
                                            )}
                                        </g>
                                    ))}

                                    {/* Border */}
                                    <rect x={padding} y={padding} width={chartWidth - padding * 2} height={chartHeight - padding * 2} fill="none" stroke="currentColor" strokeWidth="1" opacity="0.15" rx="4" />
                                </svg>
                            </div>

                            {/* Legend */}
                            <div className="flex flex-wrap justify-center gap-4 mt-4 text-xs">
                                {Object.entries(QUADRANTS).map(([key, q]) => {
                                    const Icon = q.icon;
                                    return (
                                        <div key={key} className="flex items-center gap-1.5">
                                            <Icon className={`h-3.5 w-3.5 ${q.color}`} />
                                            <span className="text-muted-foreground">{q.label}: {q.description}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>

                    {/* ── Data Table ── */}
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base">Detailed Item Analysis</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <DataTable
                                data={classified}
                                columns={COLUMNS}
                                searchField="name"
                                searchPlaceholder="Search menu items..."
                                defaultSort="revenue"
                                defaultSortDir="desc"
                            />
                        </CardContent>
                    </Card>
                </div>
            )}
        </PageContainer>
    );
}
