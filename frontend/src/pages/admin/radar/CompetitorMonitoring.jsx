import React, { useState } from 'react';
import {
    Search, Store, TrendingUp, TrendingDown, Eye,
    DollarSign, Star, MapPin, Globe, Loader2,
    RefreshCw, ExternalLink, BarChart3, ArrowUpRight,
    ArrowDownRight, Minus, ChevronDown, ChevronRight
} from 'lucide-react';
import { Card } from '../../../../components/ui/card';
import { Button } from '../../../../components/ui/button';
import { cn } from '../../../../lib/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useVenue } from '../../../../context/VenueContext';
import { toast } from 'sonner';
import api from '../../../../lib/api';

/**
 * 🔬 Competitor Price Monitoring — Rule 65 (Pillar 6: Radar)
 * Real-time competitor intelligence using Google Grounding.
 */
export default function CompetitorMonitoring() {
    const { currentVenue } = useVenue();
    const venueId = currentVenue?.id || localStorage.getItem('currentVenueId') || 'default';
    const queryClient = useQueryClient();
    const [expandedCompetitor, setExpandedCompetitor] = useState(null);

    const { data: competitors = [], isLoading } = useQuery({
        queryKey: ['radar-competitors', venueId],
        queryFn: async () => {
            const { data } = await api.get(`/radar/competitors?venue_id=${venueId}`);
            return data;
        }
    });

    const { data: insights = [] } = useQuery({
        queryKey: ['radar-insights', venueId],
        queryFn: async () => {
            const { data } = await api.get(`/radar/insights?venue_id=${venueId}`);
            return data;
        }
    });

    const scanMutation = useMutation({
        mutationFn: () => api.post(`/radar/scan?venue_id=${venueId}`),
        onSuccess: (res) => {
            toast.success(`Market scan complete — ${res.data?.insights_generated || 0} new insights`);
            queryClient.invalidateQueries(['radar-competitors']);
            queryClient.invalidateQueries(['radar-insights']);
        },
        onError: () => toast.error('Scan failed')
    });

    const avgRating = competitors.length > 0
        ? (competitors.reduce((s, c) => s + (c.rating || 0), 0) / competitors.length).toFixed(1)
        : 0;

    const pricePosition = (comp) => {
        if (!comp.price_level) return null;
        if (comp.price_level === 'high') return { icon: ArrowUpRight, color: 'text-red-500', label: 'Above Market' };
        if (comp.price_level === 'low') return { icon: ArrowDownRight, color: 'text-emerald-500', label: 'Below Market' };
        return { icon: Minus, color: 'text-amber-500', label: 'Market Rate' };
    };

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                        <Eye className="w-6 h-6 text-indigo-500" />
                        Competitor Monitoring
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Market intelligence powered by Google Grounding — no scraping
                    </p>
                </div>
                <Button
                    variant="outline" size="sm"
                    onClick={() => scanMutation.mutate()}
                    disabled={scanMutation.isLoading}
                >
                    {scanMutation.isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <RefreshCw className="w-4 h-4 mr-1" />}
                    Scan Market
                </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-4">
                <Card className="p-4 bg-card border-border">
                    <div className="text-sm text-muted-foreground">Tracked</div>
                    <div className="text-2xl font-bold text-foreground">{competitors.length}</div>
                </Card>
                <Card className="p-4 bg-card border-border">
                    <div className="text-sm text-muted-foreground">Avg Rating</div>
                    <div className="text-2xl font-bold text-yellow-400 flex items-center gap-1">
                        {avgRating} <Star className="w-4 h-4" />
                    </div>
                </Card>
                <Card className="p-4 bg-card border-border">
                    <div className="text-sm text-muted-foreground">Insights</div>
                    <div className="text-2xl font-bold text-indigo-500">{insights.length}</div>
                </Card>
                <Card className="p-4 bg-card border-border">
                    <div className="text-sm text-muted-foreground">Last Scan</div>
                    <div className="text-lg font-bold text-foreground">Today</div>
                </Card>
            </div>

            <div className="grid grid-cols-3 gap-6">
                {/* Competitor List */}
                <div className="col-span-2 space-y-3">
                    <h3 className="font-semibold text-foreground">Competitors</h3>
                    {isLoading ? (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : competitors.length === 0 ? (
                        <Card className="p-8 bg-card border-border text-center">
                            <Store className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                            <p className="text-sm text-muted-foreground">No competitors tracked. Run a market scan to discover nearby restaurants.</p>
                        </Card>
                    ) : (
                        competitors.map(comp => {
                            const pos = pricePosition(comp);
                            const PosIcon = pos?.icon || Minus;
                            return (
                                <Card key={comp.id} className="bg-card border-border">
                                    <div
                                        className="p-4 cursor-pointer flex items-center justify-between"
                                        onClick={() => setExpandedCompetitor(expandedCompetitor === comp.id ? null : comp.id)}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                                                <Store className="w-5 h-5 text-indigo-500" />
                                            </div>
                                            <div>
                                                <div className="font-medium text-foreground">{comp.name}</div>
                                                <div className="text-xs text-muted-foreground flex items-center gap-2">
                                                    {comp.cuisine && <span>{comp.cuisine}</span>}
                                                    {comp.distance && <span>• {comp.distance}</span>}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            {comp.rating && (
                                                <div className="flex items-center gap-1 text-yellow-400 text-sm">
                                                    <Star className="w-4 h-4" /> {comp.rating}
                                                </div>
                                            )}
                                            {pos && (
                                                <span className={cn("text-[10px] px-1.5 py-0.5 rounded flex items-center gap-0.5", `${pos.color} bg-current/10`)}>
                                                    <PosIcon className="w-3 h-3" /> {pos.label}
                                                </span>
                                            )}
                                            {expandedCompetitor === comp.id ? (
                                                <ChevronDown className="w-4 h-4 text-muted-foreground" />
                                            ) : (
                                                <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                            )}
                                        </div>
                                    </div>

                                    {expandedCompetitor === comp.id && (
                                        <div className="px-4 pb-4 border-t border-border pt-3 space-y-2">
                                            {comp.address && (
                                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                    <MapPin className="w-3.5 h-3.5" /> {comp.address}
                                                </div>
                                            )}
                                            {comp.website && (
                                                <div className="flex items-center gap-2 text-sm text-indigo-400">
                                                    <Globe className="w-3.5 h-3.5" />
                                                    <a href={comp.website} target="_blank" rel="noopener noreferrer" className="hover:underline flex items-center gap-1">
                                                        Visit Website <ExternalLink className="w-3 h-3" />
                                                    </a>
                                                </div>
                                            )}
                                            {comp.price_range && (
                                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                    <DollarSign className="w-3.5 h-3.5" /> {comp.price_range}
                                                </div>
                                            )}
                                            {comp.review_count && (
                                                <div className="text-xs text-muted-foreground">
                                                    {comp.review_count} reviews
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </Card>
                            );
                        })
                    )}
                </div>

                {/* Insights Panel */}
                <div>
                    <h3 className="font-semibold text-foreground mb-3">Market Insights</h3>
                    {insights.length === 0 ? (
                        <Card className="p-6 bg-card border-border text-center">
                            <BarChart3 className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                            <p className="text-xs text-muted-foreground">Run a market scan to generate insights</p>
                        </Card>
                    ) : (
                        <div className="space-y-3">
                            {insights.map((insight, i) => (
                                <Card key={insight.id || i} className="p-4 bg-card border-border">
                                    <div className="flex items-start gap-2">
                                        <div className={cn(
                                            "p-1 rounded mt-0.5",
                                            insight.type === 'opportunity' ? "bg-emerald-500/10" :
                                                insight.type === 'threat' ? "bg-red-500/10" :
                                                    "bg-indigo-500/10"
                                        )}>
                                            {insight.type === 'opportunity' ? (
                                                <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                                            ) : insight.type === 'threat' ? (
                                                <TrendingDown className="w-3.5 h-3.5 text-red-500" />
                                            ) : (
                                                <Eye className="w-3.5 h-3.5 text-indigo-500" />
                                            )}
                                        </div>
                                        <div>
                                            <div className="text-sm font-medium text-foreground">{insight.title}</div>
                                            <div className="text-xs text-muted-foreground mt-0.5">{insight.description}</div>
                                            {insight.source && (
                                                <div className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                                                    <Globe className="w-3 h-3" /> {insight.source}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
