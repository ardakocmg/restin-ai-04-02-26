/**
 * InsightsHub — Apicbase-style Sales Analytics Dashboard
 * Revenue vs CoGS, profit margin evolution, outlet comparison, category drill-down
 */
import React, { useState, useMemo } from 'react';
import PageContainer from '@/layouts/PageContainer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import {
    TrendingUp, TrendingDown, DollarSign, BarChart3, PieChart,
    Download, Calendar, Store, ArrowUpRight, ArrowDownRight,
    Minus, Target, ShoppingCart, Utensils, Percent,
} from 'lucide-react';
import { toast } from 'sonner';

/* ────────────────── Data ────────────────── */
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHLY_DATA = [
    { month: 'Jan', revenue: 42000, cogs: 12600, labor: 10500, covers: 1680, avgCheck: 25.0 },
    { month: 'Feb', revenue: 38500, cogs: 11550, labor: 9625, covers: 1540, avgCheck: 25.0 },
    { month: 'Mar', revenue: 45200, cogs: 13560, labor: 11300, covers: 1808, avgCheck: 25.0 },
    { month: 'Apr', revenue: 48000, cogs: 14400, labor: 12000, covers: 1920, avgCheck: 25.0 },
    { month: 'May', revenue: 52000, cogs: 14560, labor: 13000, covers: 2080, avgCheck: 25.0 },
    { month: 'Jun', revenue: 55000, cogs: 15400, labor: 13750, covers: 2200, avgCheck: 25.0 },
    { month: 'Jul', revenue: 61000, cogs: 17080, labor: 15250, covers: 2440, avgCheck: 25.0 },
    { month: 'Aug', revenue: 58000, cogs: 16820, labor: 14500, covers: 2320, avgCheck: 25.0 },
    { month: 'Sep', revenue: 50000, cogs: 14500, labor: 12500, covers: 2000, avgCheck: 25.0 },
    { month: 'Oct', revenue: 47000, cogs: 14100, labor: 11750, covers: 1880, avgCheck: 25.0 },
    { month: 'Nov', revenue: 44000, cogs: 13640, labor: 11000, covers: 1760, avgCheck: 25.0 },
    { month: 'Dec', revenue: 62000, cogs: 17360, labor: 15500, covers: 2480, avgCheck: 25.0 },
];

const OUTLETS = [
    { name: 'Main Restaurant', revenue: 380000, cogs: 106400, covers: 15200 },
    { name: 'Terrace Bar', revenue: 145000, cogs: 40600, covers: 7250 },
    { name: 'Private Dining', revenue: 52000, cogs: 13520, covers: 1300 },
    { name: 'Takeaway', revenue: 25700, cogs: 8655, covers: 3280 },
];

const CATEGORIES = [
    { name: 'Pizza', revenue: 185000, cogs: 41070, items: 14800, icon: '🍕' },
    { name: 'Pasta', revenue: 112000, cogs: 24640, items: 9333, icon: '🍝' },
    { name: 'Mains', revenue: 128000, cogs: 48000, items: 5120, icon: '🥩' },
    { name: 'Starters', revenue: 68000, cogs: 12920, items: 8500, icon: '🥗' },
    { name: 'Desserts', revenue: 42000, cogs: 7140, items: 5250, icon: '🍰' },
    { name: 'Beverages', revenue: 67700, cogs: 18963, items: 9671, icon: '🍷' },
];

const TOP_ITEMS = [
    { name: 'Margherita Pizza', sold: 4200, revenue: 52500, cost: 11760, trend: 8.2 },
    { name: 'Spaghetti Carbonara', sold: 3100, revenue: 40300, cost: 8060, trend: 5.1 },
    { name: 'Ribeye Steak', sold: 1800, revenue: 50400, cost: 18900, trend: -2.3 },
    { name: 'Caesar Salad', sold: 3800, revenue: 36100, cost: 7980, trend: 12.5 },
    { name: 'Tiramisu', sold: 2800, revenue: 22400, cost: 5040, trend: 3.7 },
    { name: 'Aperol Spritz', sold: 4100, revenue: 36900, cost: 9020, trend: 15.1 },
    { name: 'Pepperoni Pizza', sold: 3200, revenue: 44800, cost: 10880, trend: 6.4 },
    { name: 'Panna Cotta', sold: 2400, revenue: 18000, cost: 2880, trend: 1.2 },
];

/* ═══════════════════════════════════════════════════ */
export default function InsightsHub() {
    const [period, setPeriod] = useState('ytd');
    const [activeTab, setActiveTab] = useState('overview');

    const totals = useMemo(() => {
        const rev = MONTHLY_DATA.reduce((s, m) => s + m.revenue, 0);
        const cogs = MONTHLY_DATA.reduce((s, m) => s + m.cogs, 0);
        const labor = MONTHLY_DATA.reduce((s, m) => s + m.labor, 0);
        const covers = MONTHLY_DATA.reduce((s, m) => s + m.covers, 0);
        const profit = rev - cogs;
        const prime = cogs + labor;
        return { rev, cogs, labor, profit, covers, margin: (profit / rev) * 100, foodCostPct: (cogs / rev) * 100, laborPct: (labor / rev) * 100, primePct: (prime / rev) * 100, avgCheck: rev / covers };
    }, []);

    const maxMonthlyRev = Math.max(...MONTHLY_DATA.map(m => m.revenue));

    return (
        <PageContainer title="Insights Hub" description="Sales analytics, profitability trends, and outlet performance"
            actions={<div className="flex gap-2">
                <Select aria-label="Select option" value={period} onValueChange={setPeriod}><SelectTrigger aria-label="Select option" className="w-28 h-8 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ytd">Year to Date</SelectItem><SelectItem value="mtd">This Month</SelectItem><SelectItem value="q4">Q4 2025</SelectItem><SelectItem value="q3">Q3 2025</SelectItem></SelectContent></Select>
                <Button variant="outline" size="sm" onClick={() => toast.info('Exported')}><Download className="h-4 w-4 mr-1" /> Export</Button>
            </div>}>

            {/* ── KPI Strip ── */}
            <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3 mb-6">
                {[
                    { label: 'Revenue', value: `€${(totals.rev / 1000).toFixed(0)}k`, color: 'text-emerald-400', icon: DollarSign },
                    { label: 'CoGS', value: `€${(totals.cogs / 1000).toFixed(0)}k`, color: 'text-red-400', icon: ShoppingCart },
                    { label: 'Gross Profit', value: `€${(totals.profit / 1000).toFixed(0)}k`, color: 'text-blue-400', icon: TrendingUp },
                    { label: 'Food Cost %', value: `${totals.foodCostPct.toFixed(1)}%`, color: totals.foodCostPct <= 30 ? 'text-emerald-400' : 'text-amber-400', icon: Percent },
                    { label: 'Labor %', value: `${totals.laborPct.toFixed(1)}%`, color: totals.laborPct <= 28 ? 'text-emerald-400' : 'text-amber-400', icon: Utensils },
                    { label: 'Prime Cost %', value: `${totals.primePct.toFixed(1)}%`, color: totals.primePct <= 60 ? 'text-emerald-400' : 'text-red-400', icon: Target },
                    { label: 'Covers', value: totals.covers.toLocaleString(), color: 'text-purple-400', icon: Store },
                    { label: 'Avg Check', value: `€${totals.avgCheck.toFixed(2)}`, color: 'text-cyan-400', icon: BarChart3 },
                ].map(k => {
                    const Icon = k.icon; return (
                        <Card key={k.label} className="border-white/5 bg-zinc-900/40">
                            <CardContent className="p-3">
                                <div className="flex items-center gap-1 mb-0.5"><Icon className="h-3 w-3 text-muted-foreground" /><p className="text-[9px] text-muted-foreground uppercase tracking-wider">{k.label}</p></div>
                                <p className={cn('text-lg font-bold', k.color)}>{k.value}</p>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="bg-zinc-900/60 border border-white/5 mb-4">
                    <TabsTrigger value="overview" className="text-xs">Revenue & Profit</TabsTrigger>
                    <TabsTrigger value="outlets" className="text-xs">Outlet Comparison</TabsTrigger>
                    <TabsTrigger value="categories" className="text-xs">Category Drill-Down</TabsTrigger>
                    <TabsTrigger value="top-items" className="text-xs">Top Items</TabsTrigger>
                </TabsList>

                {/* ═══ OVERVIEW ═══ */}
                <TabsContent value="overview">
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                        {/* Revenue vs CoGS Bar Chart (CSS) */}
                        <Card className="border-white/5 bg-zinc-900/40">
                            <CardHeader className="pb-2"><CardTitle className="text-sm">Revenue vs CoGS — Monthly</CardTitle></CardHeader>
                            <CardContent>
                                <div className="flex items-end gap-1 h-48">
                                    {MONTHLY_DATA.map(m => {
                                        const revH = (m.revenue / maxMonthlyRev) * 100; const cogsH = (m.cogs / maxMonthlyRev) * 100; return (
                                            <div key={m.month} className="flex-1 flex flex-col items-center gap-0.5">
                                                <div className="w-full flex gap-px" style={{ height: `${revH}%` }}>
                                                    <div className="flex-1 bg-emerald-500/60 rounded-t-sm" />
                                                    <div className="flex-1 bg-red-500/40 rounded-t-sm" style={{ height: `${(cogsH / revH) * 100}%`, alignSelf: 'flex-end' }} />
                                                </div>
                                                <span className="text-[8px] text-muted-foreground">{m.month}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                                <div className="flex items-center gap-4 mt-3 text-[10px]">
                                    <span className="flex items-center gap-1"><span className="w-2 h-2 bg-emerald-500/60 rounded-sm" /> Revenue</span>
                                    <span className="flex items-center gap-1"><span className="w-2 h-2 bg-red-500/40 rounded-sm" /> CoGS</span>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Profit Margin Evolution (line-like bars) */}
                        <Card className="border-white/5 bg-zinc-900/40">
                            <CardHeader className="pb-2"><CardTitle className="text-sm">Profit Margin Evolution</CardTitle></CardHeader>
                            <CardContent>
                                <div className="flex items-end gap-1 h-48">
                                    {MONTHLY_DATA.map(m => {
                                        const margin = ((m.revenue - m.cogs) / m.revenue) * 100; const h = margin; const color = margin >= 72 ? 'bg-emerald-500/60' : margin >= 68 ? 'bg-amber-500/60' : 'bg-red-500/60'; return (
                                            <div key={m.month} className="flex-1 flex flex-col items-center gap-0.5">
                                                <span className="text-[8px] text-muted-foreground">{margin.toFixed(0)}%</span>
                                                <div className={cn('w-full rounded-t-sm transition-all', color)} style={{ height: `${h}%` }} />
                                                <span className="text-[8px] text-muted-foreground">{m.month}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                                <div className="flex items-center gap-2 mt-3">
                                    <div className="flex-1 h-px bg-amber-500/40" />
                                    <span className="text-[9px] text-amber-400">Target: 70%</span>
                                    <div className="flex-1 h-px bg-amber-500/40" />
                                </div>
                            </CardContent>
                        </Card>

                        {/* Food Cost % Trend */}
                        <Card className="border-white/5 bg-zinc-900/40">
                            <CardHeader className="pb-2"><CardTitle className="text-sm">Food Cost % Trend</CardTitle></CardHeader>
                            <CardContent>
                                <div className="flex items-end gap-1 h-40">
                                    {MONTHLY_DATA.map(m => {
                                        const pct = (m.cogs / m.revenue) * 100; const color = pct <= 28 ? 'bg-emerald-500/60' : pct <= 32 ? 'bg-amber-500/60' : 'bg-red-500/60'; return (
                                            <div key={m.month} className="flex-1 flex flex-col items-center gap-0.5">
                                                <span className="text-[8px] text-muted-foreground">{pct.toFixed(0)}%</span>
                                                <div className={cn('w-full rounded-t-sm', color)} style={{ height: `${pct * 2.5}%` }} />
                                                <span className="text-[8px] text-muted-foreground">{m.month}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                                <div className="flex items-center gap-2 mt-2">
                                    <div className="flex-1 h-px bg-red-500/40" />
                                    <span className="text-[9px] text-red-400">Budget: 30%</span>
                                    <div className="flex-1 h-px bg-red-500/40" />
                                </div>
                            </CardContent>
                        </Card>

                        {/* Covers & Avg Check */}
                        <Card className="border-white/5 bg-zinc-900/40">
                            <CardHeader className="pb-2"><CardTitle className="text-sm">Covers & Revenue per Cover</CardTitle></CardHeader>
                            <CardContent>
                                <div className="flex items-end gap-1 h-40">
                                    {MONTHLY_DATA.map(m => {
                                        const h = (m.covers / Math.max(...MONTHLY_DATA.map(x => x.covers))) * 100; return (
                                            <div key={m.month} className="flex-1 flex flex-col items-center gap-0.5">
                                                <span className="text-[8px] text-muted-foreground">{m.covers}</span>
                                                <div className="w-full bg-purple-500/50 rounded-t-sm" style={{ height: `${h}%` }} />
                                                <span className="text-[8px] text-muted-foreground">{m.month}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* ═══ OUTLETS ═══ */}
                <TabsContent value="outlets">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {OUTLETS.map(o => {
                            const profit = o.revenue - o.cogs; const margin = (profit / o.revenue) * 100; const foodPct = (o.cogs / o.revenue) * 100; const revShare = (o.revenue / OUTLETS.reduce((s, x) => s + x.revenue, 0)) * 100; return (
                                <Card key={o.name} className="border-white/5 bg-zinc-900/40">
                                    <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Store className="h-4 w-4 text-blue-400" />{o.name}<Badge variant="outline" className="ml-auto text-[9px] text-blue-400">{revShare.toFixed(0)}% share</Badge></CardTitle></CardHeader>
                                    <CardContent>
                                        {/* Revenue bar */}
                                        <div className="mb-3">
                                            <div className="flex justify-between text-[10px] mb-1"><span className="text-muted-foreground">Revenue</span><span className="text-emerald-400 font-bold">€{(o.revenue / 1000).toFixed(0)}k</span></div>
                                            <div className="h-2 bg-zinc-800 rounded-full overflow-hidden"><div className="h-full bg-emerald-500/60 rounded-full" style={{ width: `${(o.revenue / OUTLETS[0].revenue) * 100}%` }} /></div>
                                        </div>

                                        <div className="grid grid-cols-4 gap-2 text-center">
                                            <div><p className="text-[9px] text-muted-foreground">Profit</p><p className="text-sm font-bold text-blue-400">€{(profit / 1000).toFixed(0)}k</p></div>
                                            <div><p className="text-[9px] text-muted-foreground">Margin</p><p className={cn('text-sm font-bold', margin >= 72 ? 'text-emerald-400' : 'text-amber-400')}>{margin.toFixed(1)}%</p></div>
                                            <div><p className="text-[9px] text-muted-foreground">Food %</p><p className={cn('text-sm font-bold', foodPct <= 30 ? 'text-emerald-400' : 'text-amber-400')}>{foodPct.toFixed(1)}%</p></div>
                                            <div><p className="text-[9px] text-muted-foreground">Covers</p><p className="text-sm font-bold text-purple-400">{o.covers.toLocaleString()}</p></div>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>

                    {/* Revenue split donut (CSS) */}
                    <Card className="border-white/5 bg-zinc-900/40 mt-4">
                        <CardHeader className="pb-2"><CardTitle className="text-sm">Revenue Distribution by Outlet</CardTitle></CardHeader>
                        <CardContent>
                            <div className="flex items-center gap-6">
                                {/* CSS donut */}
                                <div className="relative w-32 h-32 flex-shrink-0">{(() => {
                                    const totalRev = OUTLETS.reduce((s, o) => s + o.revenue, 0);
                                    const colors = ['#10b981', '#3b82f6', '#a855f7', '#f59e0b'];
                                    let cumPct = 0;
                                    const segments = OUTLETS.map((o, i) => { const pct = (o.revenue / totalRev) * 100; const start = cumPct; cumPct += pct; return { color: colors[i], start, end: cumPct }; });
                                    const gradient = segments.map(s => `${s.color} ${s.start}% ${s.end}%`).join(', ');
                                    return (<>
                                        <div className="w-full h-full rounded-full" style={{ background: `conic-gradient(${gradient})` }} />
                                        <div className="absolute inset-4 bg-zinc-900 rounded-full flex items-center justify-center">
                                            <span className="text-xs font-bold">€{(totalRev / 1000).toFixed(0)}k</span>
                                        </div>
                                    </>);
                                })()}</div>
                                <div className="flex-1 space-y-2">{OUTLETS.map((o, i) => {
                                    const totalRev = OUTLETS.reduce((s, x) => s + x.revenue, 0);
                                    const colors = ['bg-emerald-500', 'bg-blue-500', 'bg-purple-500', 'bg-amber-500'];
                                    return (<div key={o.name} className="flex items-center gap-2 text-xs">
                                        <span className={cn('w-2.5 h-2.5 rounded-sm', colors[i])} />
                                        <span className="flex-1">{o.name}</span>
                                        <span className="text-muted-foreground">{((o.revenue / totalRev) * 100).toFixed(0)}%</span>
                                        <span className="font-bold">€{(o.revenue / 1000).toFixed(0)}k</span>
                                    </div>);
                                })}</div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ═══ CATEGORIES ═══ */}
                <TabsContent value="categories">
                    <div className="space-y-3">
                        {CATEGORIES.map(cat => {
                            const profit = cat.revenue - cat.cogs; const margin = (profit / cat.revenue) * 100; const maxRev = CATEGORIES[0].revenue; return (
                                <Card key={cat.name} className="border-white/5 bg-zinc-900/40">
                                    <CardContent className="p-4">
                                        <div className="flex items-center gap-3">
                                            <span className="text-2xl">{cat.icon}</span>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <p className="text-sm font-medium">{cat.name}</p>
                                                    <Badge variant="outline" className={cn('text-[9px]', margin >= 75 ? 'text-emerald-400' : margin >= 65 ? 'text-amber-400' : 'text-red-400')}>{margin.toFixed(1)}% margin</Badge>
                                                </div>
                                                {/* Revenue bar */}
                                                <div className="h-2 bg-zinc-800 rounded-full overflow-hidden mb-2"><div className="h-full bg-emerald-500/50 rounded-full" style={{ width: `${(cat.revenue / maxRev) * 100}%` }} /></div>
                                                <div className="flex items-center gap-6 text-[10px] text-muted-foreground">
                                                    <span>Revenue: <span className="text-emerald-400 font-bold">€{(cat.revenue / 1000).toFixed(0)}k</span></span>
                                                    <span>CoGS: <span className="text-red-400 font-bold">€{(cat.cogs / 1000).toFixed(0)}k</span></span>
                                                    <span>Profit: <span className="text-blue-400 font-bold">€{(profit / 1000).toFixed(0)}k</span></span>
                                                    <span>Items: <span className="text-purple-400 font-bold">{cat.items.toLocaleString()}</span></span>
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                </TabsContent>

                {/* ═══ TOP ITEMS ═══ */}
                <TabsContent value="top-items">
                    <Card className="border-white/5 bg-zinc-900/40"><CardContent className="p-0">
                        <table className="w-full text-xs">
                            <thead><tr className="border-b border-white/5">
                                <th className="p-3 text-left font-medium">#</th>
                                <th className="p-3 text-left font-medium">Menu Item</th>
                                <th className="p-3 text-center font-medium">Sold</th>
                                <th className="p-3 text-right font-medium">Revenue</th>
                                <th className="p-3 text-right font-medium">CoGS</th>
                                <th className="p-3 text-right font-medium">Profit</th>
                                <th className="p-3 text-center font-medium">Margin</th>
                                <th className="p-3 text-center font-medium">Trend</th>
                            </tr></thead>
                            <tbody>{TOP_ITEMS.sort((a, b) => b.revenue - a.revenue).map((item, i) => {
                                const profit = item.revenue - item.cost; const margin = (profit / item.revenue) * 100; return (
                                    <tr key={item.name} className="border-b border-white/5 hover:bg-white/5">
                                        <td className="p-3 text-muted-foreground">{i + 1}</td>
                                        <td className="p-3 font-medium">{item.name}</td>
                                        <td className="p-3 text-center tabular-nums">{item.sold.toLocaleString()}</td>
                                        <td className="p-3 text-right tabular-nums text-emerald-400">€{item.revenue.toLocaleString()}</td>
                                        <td className="p-3 text-right tabular-nums text-red-400">€{item.cost.toLocaleString()}</td>
                                        <td className="p-3 text-right tabular-nums text-blue-400">€{profit.toLocaleString()}</td>
                                        <td className="p-3 text-center"><Badge variant="outline" className={cn('text-[9px]', margin >= 75 ? 'text-emerald-400' : margin >= 65 ? 'text-amber-400' : 'text-red-400')}>{margin.toFixed(1)}%</Badge></td>
                                        <td className="p-3 text-center"><span className={cn('flex items-center justify-center gap-0.5 text-[10px]', item.trend > 0 ? 'text-emerald-400' : 'text-red-400')}>
                                            {item.trend > 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}{Math.abs(item.trend)}%
                                        </span></td>
                                    </tr>
                                );
                            })}</tbody>
                        </table>
                    </CardContent></Card>
                </TabsContent>
            </Tabs>
        </PageContainer>
    );
}
