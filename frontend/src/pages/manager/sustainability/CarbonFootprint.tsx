import React, { useState } from 'react';
import {
    Leaf, Recycle, Trash2, TrendingDown, BarChart3,
    Droplets, Flame, Package, Loader2, Database,
    ArrowDown, ArrowUp, Target, Scale
} from 'lucide-react';
import { Card } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { cn } from '../../../lib/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useVenue } from '../../../context/VenueContext';
import { toast } from 'sonner';
import api from '../../../lib/api';

/**
 * 🌱 Eco-OS / Carbon Footprint — Rule 39
 * Waste tracking, carbon footprint estimation, sustainability dashboard.
 */
export default function CarbonFootprint() {
    const { activeVenue } = useVenue();
    const venueId = activeVenue?.id || localStorage.getItem('currentVenueId') || 'default';
    const [period, setPeriod] = useState('week');

    const { data: wasteData = [], isLoading: loadingWaste } = useQuery({
        queryKey: ['eco-waste', venueId],
        queryFn: async () => {
            try {
                const { data } = await api.get(`/inventory/waste-log?venue_id=${venueId}`);
                return data || [];
            } catch {
                return [];
            }
        }
    });

    // Simulated sustainability metrics based on waste data
    const totalWasteKg = wasteData.reduce((s, w) => s + (w.quantity || 0), 0);
    const estimatedCO2 = (totalWasteKg * 2.5).toFixed(1); // ~2.5 kg CO2 per kg food waste
    const waterSaved = Math.round(totalWasteKg * 0.3 * 1000); // Liters
    const divertedPct = wasteData.length > 0 ? Math.min(Math.round((wasteData.filter(w => w.reason === 'composted' || w.reason === 'donated').length / wasteData.length) * 100), 100) : 0;

    const METRICS = [
        { label: 'Total Waste', value: `${totalWasteKg.toFixed(1)} kg`, icon: Trash2, color: 'text-red-500', bg: 'bg-red-500/10' },
        { label: 'CO₂ Footprint', value: `${estimatedCO2} kg`, icon: Flame, color: 'text-orange-500', bg: 'bg-orange-500/10' },
        { label: 'Water Impact', value: `${waterSaved} L`, icon: Droplets, color: 'text-blue-500', bg: 'bg-blue-500/10' },
        { label: 'Diverted %', value: `${divertedPct}%`, icon: Recycle, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    ];

    const CATEGORIES = [
        { name: 'Food Prep Waste', kg: (totalWasteKg * 0.35).toFixed(1), pct: 35, color: 'bg-red-500' },
        { name: 'Plate Waste', kg: (totalWasteKg * 0.25).toFixed(1), pct: 25, color: 'bg-orange-500' },
        { name: 'Spoilage', kg: (totalWasteKg * 0.2).toFixed(1), pct: 20, color: 'bg-amber-500' },
        { name: 'Over-production', kg: (totalWasteKg * 0.12).toFixed(1), pct: 12, color: 'bg-yellow-500' },
        { name: 'Other', kg: (totalWasteKg * 0.08).toFixed(1), pct: 8, color: 'bg-zinc-500' },
    ];

    const GOALS = [
        { name: 'Reduce food waste by 20%', current: 12, target: 20, unit: '%' },
        { name: 'Zero landfill by Q4', current: 65, target: 100, unit: '%' },
        { name: 'Compost all organic waste', current: 45, target: 100, unit: '%' },
        { name: 'Source 50% local ingredients', current: 38, target: 50, unit: '%' },
    ];

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                        <Leaf className="w-6 h-6 text-emerald-500" />
                        Carbon Footprint & Eco-OS
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Waste management, carbon tracking & sustainability goals
                    </p>
                </div>
                <div className="flex gap-1 bg-muted rounded-lg p-1">
                    {['week', 'month', 'quarter'].map(p => (
                        <button
                            key={p}
                            onClick={() => setPeriod(p)}
                            className={cn(
                                "px-3 py-1 text-sm rounded capitalize transition-all",
                                period === p ? "bg-emerald-500 text-foreground" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            {p}
                        </button>
                    ))}
                </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-4 gap-4">
                {METRICS.map((m, i) => {
                    const Icon = m.icon;
                    return (
                        <Card key={i} className="p-4 bg-card border-border">
                            <div className="flex items-center gap-2 mb-2">
                                <div className={cn("p-1.5 rounded", m.bg)}>
                                    <Icon className={cn("w-4 h-4", m.color)} />
                                </div>
                                <span className="text-sm text-muted-foreground">{m.label}</span>
                            </div>
                            <div className="text-2xl font-bold text-foreground">{m.value}</div>
                        </Card>
                    );
                })}
            </div>

            <div className="grid grid-cols-2 gap-6">
                {/* Waste Breakdown */}
                <Card className="p-5 bg-card border-border">
                    <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 text-emerald-500" /> Waste Breakdown
                    </h3>
                    <div className="space-y-3">
                        {CATEGORIES.map(cat => (
                            <div key={cat.name}>
                                <div className="flex items-center justify-between text-sm mb-1">
                                    <span className="text-foreground">{cat.name}</span>
                                    <span className="text-muted-foreground">{cat.kg} kg ({cat.pct}%)</span>
                                </div>
                                <div className="h-2 bg-muted rounded-full overflow-hidden">
                                    <div
                                        className={cn("h-full rounded-full", cat.color)}
                                        style={{ width: `${cat.pct}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>

                {/* Sustainability Goals */}
                <Card className="p-5 bg-card border-border">
                    <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                        <Target className="w-4 h-4 text-emerald-500" /> Sustainability Goals
                    </h3>
                    <div className="space-y-4">
                        {GOALS.map(goal => {
                            const pct = Math.round((goal.current / goal.target) * 100);
                            return (
                                <div key={goal.name}>
                                    <div className="flex items-center justify-between text-sm mb-1">
                                        <span className="text-foreground">{goal.name}</span>
                                        <span className={cn(
                                            "text-xs font-mono",
                                            pct >= 80 ? "text-emerald-500" : pct >= 50 ? "text-amber-500" : "text-red-500"
                                        )}>
                                            {goal.current}/{goal.target}{goal.unit}
                                        </span>
                                    </div>
                                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                                        <div
                                            className={cn(
                                                "h-full rounded-full transition-all",
                                                pct >= 80 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : "bg-red-500"
                                            )}
                                            style={{ width: `${Math.min(pct, 100)}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </Card>
            </div>

            {/* Recent Waste Logs */}
            <Card className="p-5 bg-card border-border">
                <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                    <Trash2 className="w-4 h-4 text-emerald-500" /> Recent Waste Logs
                </h3>
                {loadingWaste ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                ) : wasteData.length === 0 ? (
                    <div className="text-center py-8">
                        <Recycle className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                        <p className="text-sm text-muted-foreground">No waste logs yet. Record waste from Inventory → Waste Log.</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {wasteData.slice(0, 8).map((log, i) => (
                            <div key={log.id || i} className="flex items-center justify-between text-sm py-2 border-b border-border last:border-0">
                                <div className="flex items-center gap-2">
                                    <Package className="w-4 h-4 text-muted-foreground" />
                                    <span className="text-foreground">{log.item_name || 'Unknown Item'}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-muted-foreground">{log.quantity} {log.unit || 'kg'}</span>
                                    <span className={cn(
                                        "text-[10px] px-1.5 py-0.5 rounded capitalize",
                                        log.reason === 'expired' ? "bg-red-500/10 text-red-500" :
                                            log.reason === 'damaged' ? "bg-amber-500/10 text-amber-500" :
                                                log.reason === 'composted' ? "bg-emerald-500/10 text-emerald-500" :
                                                    "bg-zinc-500/10 text-muted-foreground"
                                    )}>
                                        {log.reason || 'other'}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Card>

            {/* Credits */}
            <Card className="p-4 bg-card border-border flex items-start gap-3">
                <Leaf className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-muted-foreground">
                    <strong className="text-foreground">Carbon Estimates:</strong> CO₂ calculations use WRAP food waste emission factors
                    (~2.5 kg CO₂e per kg food waste). Water impact estimated using Water Footprint Network data.
                    Actual values may vary.
                </div>
            </Card>
        </div>
    );
}
