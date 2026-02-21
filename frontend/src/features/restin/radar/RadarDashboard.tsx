import React, { useState } from 'react';
import {
    Radar, Target, TrendingUp, TrendingDown,
    MapPin, Filter, ArrowUpRight,
    BarChart3, AlertCircle, RefreshCcw, ExternalLink,
    ShieldAlert, Zap, Clock, ToggleLeft, ToggleRight
} from 'lucide-react';
import { Card } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { cn } from '../../../lib/utils';
import { useQuery, useMutation } from '@tanstack/react-query';
import { radarService } from './radar-service';
import { useVenue } from '../../../context/VenueContext';
import { useAuth } from '../../../context/AuthContext';
import { toast } from 'sonner';

/**
 * 🔬 MARKET RADAR (Pillar 6)
 * Competitive Intelligence, Allergen Guard & Yield Management.
 */
export default function RadarDashboard() {
    const { activeVenueId } = useVenue();
    const { user, isManager, isOwner } = useAuth();
    const [region, setRegion] = useState('Valletta');

    // Fetch Insights
    const { data: insights } = useQuery({
        queryKey: ['radar-insights', activeVenueId],
        queryFn: () => radarService.getInsights(activeVenueId || 'default'),
        enabled: !!activeVenueId
    });

    // Fetch Competitors
    const { data: competitors = [] } = useQuery({
        queryKey: ['radar-competitors', activeVenueId],
        queryFn: () => radarService.getCompetitors(activeVenueId || 'default'),
        enabled: !!activeVenueId
    });

    // Fetch Allergen Guard
    const { data: allergens } = useQuery({
        queryKey: ['radar-allergens', activeVenueId],
        queryFn: () => radarService.getAllergens(activeVenueId || 'default'),
        enabled: !!activeVenueId
    });

    // Fetch Yield Rules
    const { data: yieldRules = [] } = useQuery({
        queryKey: ['radar-yield-rules', activeVenueId],
        queryFn: () => radarService.getYieldRules(activeVenueId || 'default'),
        enabled: !!activeVenueId
    });

    // Scan Mutation
    const scanMutation = useMutation({
        mutationFn: async () => {
            toast.info("Initializing Grounding Scan...");
            return await radarService.scanMarket(activeVenueId || 'default', region, "Mediterranean");
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onSuccess: (data) => toast.success("Scan Started", { description: (data as any).message || 'Scan initiated' }),
        onError: () => toast.error("Scan Failed")
    });

    const ALLERGEN_COLORS = {
        gluten: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
        dairy: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
        nuts: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
        shellfish: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
        eggs: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
        soy: 'bg-green-500/20 text-green-400 border-green-500/30',
        fish: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
        sesame: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    };

    return (
        <div className="flex flex-col gap-8 animate-in fade-in zoom-in duration-700">
            {/* Radar Main Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 px-1">
                <div className="flex items-center gap-6">
                    <div className="w-20 h-20 rounded-[2rem] bg-card border border-border flex items-center justify-center relative overflow-hidden">
                        <div className="absolute inset-0 bg-red-600/10 blur-xl"></div>
                        <Radar className="text-red-500 relative z-10" size={32} />
                    </div>
                    <div>
                        <h1 className="text-4xl font-black text-foreground italic tracking-tighter uppercase leading-none">Market <br /> Radar</h1>
                        <div className="flex items-center gap-2 mt-2">
                            <MapPin size={14} className="text-red-500" />
                            <span className="text-xs font-black text-muted-foreground uppercase tracking-widest">{region}, Malta</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4 bg-card/30 p-2 rounded-2xl border border-border/50 backdrop-blur-md">
                    <div className="px-4 py-2 border-r border-border">
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Targets Tracked</p>
                        <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 italic leading-none">{competitors.length}</p>
                    </div>
                    <div className="px-4 py-2">
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Index Updated</p>
                        <p className="text-lg font-black text-foreground italic leading-none">{competitors[0]?.created_at ? new Date(competitors[0].created_at).toLocaleDateString() : 'Now'}</p>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => scanMutation.mutate()}
                        disabled={scanMutation.isPending}
                        className="hover:bg-white/5 h-10 w-10">
                        <RefreshCcw size={18} className={cn("text-muted-foreground", scanMutation.isPending && "animate-spin text-red-500")} />
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Dynamic Pricing Engine (Left) */}
                <div className="lg:col-span-12 xl:col-span-8 flex flex-col gap-6">
                    <Card className="bg-background border-border/50 p-8 relative overflow-hidden group">
                        <div className="absolute inset-0 opacity-5 pointer-events-none">
                            <div className="w-full h-full bg-[radial-gradient(circle,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:30px_30px]"></div>
                        </div>

                        <div className="relative z-10">
                            <div className="flex justify-between items-start mb-12">
                                <div>
                                    <h2 className="text-2xl font-black text-foreground italic tracking-tight">Yield Management Suggestion</h2>
                                    <p className="text-muted-foreground font-medium max-w-lg mt-2 leading-relaxed">
                                        {insights?.dynamic_pricing_suggestion || "Analyzing market conditions..."}
                                    </p>
                                </div>
                                <Button className="bg-emerald-600 text-foreground font-black px-8 h-12 rounded-xl shadow-[0_10px_30px_rgba(16,185,129,0.3)] border-none">
                                    Approve Strategy
                                </Button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                {[
                                    { label: 'Orders Analyzed', value: `${insights?.total_orders_analyzed || 0}`, color: 'text-red-500', icon: TrendingUp },
                                    { label: 'Peak Hour', value: `${insights?.peak_hour || 0}:00`, color: 'text-orange-500', icon: AlertCircle },
                                    { label: 'Avg Order', value: `€${Math.round((insights?.avg_order_cents || 0) / 100)}`, color: 'text-emerald-500', icon: BarChart3 },
                                ].map((metric, i) => (
                                    <div key={i} className="flex flex-col gap-2">
                                        <div className="flex items-center gap-2">
                                            <metric.icon size={14} className="text-muted-foreground" />
                                            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{metric.label}</span>
                                        </div>
                                        <span className={cn("text-4xl font-black italic", metric.color)}>{metric.value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </Card>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card className="bg-card/40 border-border p-6 backdrop-blur-md">
                            <h3 className="text-xs font-black text-muted-foreground uppercase tracking-[0.2em] mb-6">Price Index vs Region</h3>
                            <div className="h-40 flex items-end gap-2 px-2">
                                {[40, 60, 45, 90, 65, 30].map((h, i) => (
                                    <div key={i} className="flex-1 bg-secondary/50 rounded-t-lg relative group">
                                        <div
                                            className={cn(
                                                "absolute bottom-0 left-0 right-0 rounded-t-lg transition-all duration-1000",
                                                i === 3 ? "bg-red-600 shadow-[0_0_20px_rgba(220,38,38,0.5)]" : "bg-zinc-700"
                                            )}
                                            style={{ height: `${h}%` }}
                                        ></div>
                                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-white text-black text-[10px] font-black px-2 py-1 rounded">
                                            {h}%
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="flex justify-between items-center mt-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest px-1">
                                <span>Mon</span>
                                <span className="text-red-500">Surge (Now)</span>
                                <span>Sat</span>
                            </div>
                        </Card>

                        <Card className="bg-card/40 border-border p-6 backdrop-blur-md overflow-hidden relative">
                            <div className="absolute top-0 right-0 p-8 opacity-5 text-muted-foreground">
                                <MapPin size={100} />
                            </div>
                            <h3 className="text-xs font-black text-muted-foreground uppercase tracking-[0.2em] mb-6">Regional Context</h3>
                            <div className="space-y-4 relative z-10">
                                <div className="p-4 bg-background/50 rounded-2xl border border-border/50">
                                    <p className="text-xs text-muted-foreground font-bold uppercase mb-1 underline decoration-red-500/50">Local Event Detected</p>
                                    <p className="text-sm font-bold text-foreground italic">"Valletta Wine Festival • 200m away"</p>
                                </div>
                                <div className="p-4 bg-background/50 rounded-2xl border border-border/50">
                                    <p className="text-xs text-muted-foreground font-bold uppercase mb-1 underline decoration-emerald-500/50">Cruise Ship in Port</p>
                                    <p className="text-sm font-bold text-foreground italic">"MSC World Europa • 2k guests"</p>
                                </div>
                            </div>
                        </Card>
                    </div>
                </div>

                {/* Competitor List (Right) */}
                <div className="lg:col-span-12 xl:col-span-4">
                    <Card className="bg-card/10 border-border h-full flex flex-col">
                        <div className="p-6 border-b border-border bg-background/20 flex items-center justify-between">
                            <h3 className="text-lg font-black text-foreground italic flex items-center gap-3">
                                <Target className="text-red-500" size={20} />
                                MONITORED TARGETS
                            </h3>
                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-white/5">
                                <Filter size={14} className="text-muted-foreground" />
                            </Button>
                        </div>

                        <div className="p-4 flex-1 overflow-auto">
                            <div className="space-y-2">
                                {competitors.map((comp, i) => (
                                    <div key={i} className="p-5 bg-card/40 rounded-2xl border border-border/50 hover:border-red-500/30 transition-all group cursor-pointer">
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <h4 className="text-sm font-black text-foreground tracking-tight group-hover:text-red-500 transition-colors uppercase italic">{comp.name}</h4>
                                                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-1">{comp.review_count || 0} Reviews • {comp.cuisine}</p>
                                            </div>
                                            <div className={cn(
                                                "p-2 rounded-xl transition-all",
                                                comp.trending ? "bg-red-500/10 text-red-500" : "bg-secondary text-muted-foreground"
                                            )}>
                                                {comp.trending ? <TrendingUp size={16} /> : <ArrowUpRight size={16} />}
                                            </div>
                                        </div>
                                        <div className="flex justify-between items-end border-t border-border pt-4 mt-4">
                                            <div>
                                                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block mb-1">Avg Price</span>
                                                <span className="text-lg font-black text-foreground italic">€{((comp.avg_price_cents || 0) / 100).toFixed(0)}</span>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block mb-1">Rating</span>
                                                <span className="text-xs font-bold text-foreground italic">⭐ {comp.rating || '—'}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <Button className="w-full mt-6 h-12 border border-border bg-transparent text-muted-foreground font-black hover:text-foreground hover:bg-white/5 uppercase tracking-[0.2em] rounded-2xl gap-2">
                                Add Competitor <ExternalLink size={14} />
                            </Button>
                        </div>
                    </Card>
                </div>
            </div>

            {/* === ALLERGEN GUARD === */}
            <Card className="bg-background border-border/50 p-8 relative overflow-hidden">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                            <ShieldAlert className="text-amber-400" size={22} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-foreground italic tracking-tight">Allergen Guard</h2>
                            <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest mt-1">
                                {allergens?.total_scanned || 0} items scanned • {allergens?.flagged_count || 0} flagged
                            </p>
                        </div>
                    </div>
                    {allergens?.flagged_count > 0 && (
                        <div className="px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
                            <span className="text-amber-400 font-black text-sm">{allergens.flagged_count} Alerts</span>
                        </div>
                    )}
                </div>

                {allergens?.items?.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-72 overflow-y-auto">
                        {allergens.items.map((item, i) => (
                            <div key={i} className="p-4 bg-card/60 rounded-xl border border-border/50 hover:border-amber-500/30 transition-all">
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <p className="text-sm font-bold text-foreground">{item.item}</p>
                                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest">{item.category}</p>
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                    {item.allergens.map((a) => (
                                        <span key={a} className={cn("text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-lg border", ALLERGEN_COLORS[a] || 'bg-secondary text-muted-foreground border-border')}>
                                            {a}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-8 text-muted-foreground">
                        <ShieldAlert size={32} className="mx-auto mb-2 opacity-50" />
                        <p className="text-sm font-bold">No allergens detected in menu</p>
                        <p className="text-xs text-foreground mt-1">Add ingredients to menu items to enable scanning</p>
                    </div>
                )}
            </Card>

            {/* === YIELD PRICING RULES === */}
            <Card className="bg-background border-border/50 p-8">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                            <Zap className="text-emerald-400" size={22} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-foreground italic tracking-tight">Dynamic Pricing Rules</h2>
                            <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest mt-1">
                                Happy Hour • Surge Pricing • Occupancy Rules
                            </p>
                        </div>
                    </div>
                    <Button variant="outline" className="border-border text-muted-foreground hover:text-foreground h-9 text-xs font-black uppercase tracking-wider gap-2">
                        <Zap size={12} /> Add Rule
                    </Button>
                </div>

                <div className="space-y-3">
                    {yieldRules.map((rule, i) => (
                        <div key={rule.id || i} className={cn(
                            "flex items-center justify-between p-4 rounded-xl border transition-all",
                            rule.active
                                ? "bg-emerald-500/5 border-emerald-500/20"
                                : "bg-card/40 border-border/50 opacity-60"
                        )}>
                            <div className="flex items-center gap-4">
                                <div className={cn(
                                    "w-10 h-10 rounded-xl flex items-center justify-center",
                                    rule.type === 'discount' ? "bg-blue-500/10" : "bg-red-500/10"
                                )}>
                                    {rule.type === 'discount'
                                        ? <TrendingDown size={18} className="text-blue-400" />
                                        : <TrendingUp size={18} className="text-red-400" />}
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-foreground">{rule.name}</p>
                                    <div className="flex items-center gap-3 mt-1">
                                        <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest flex items-center gap-1">
                                            <Clock size={10} /> {rule.trigger}: {rule.condition}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <span className={cn(
                                    "text-lg font-black italic",
                                    rule.pct < 0 ? "text-blue-400" : "text-red-400"
                                )}>
                                    {rule.pct > 0 ? '+' : ''}{rule.pct}%
                                </span>
                                {rule.active
                                    ? <ToggleRight size={24} className="text-emerald-400" />
                                    : <ToggleLeft size={24} className="text-muted-foreground" />}
                            </div>
                        </div>
                    ))}
                    {yieldRules.length === 0 && (
                        <div className="text-center py-6 text-muted-foreground text-sm">No pricing rules configured</div>
                    )}
                </div>
            </Card>
        </div>
    );
}
