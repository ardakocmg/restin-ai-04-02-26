// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';
import api from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    DoorOpen, RefreshCw, Check, X, BarChart3, Activity,
    AlertTriangle, TrendingUp, Users, Zap,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import type { AccessSummary, TimelineEntry, HeatmapEntry } from '../doorAccessTypes';
import { getVenueId } from '../doorAccessTypes';

export default function ReportsTab() {
    const [summary, setSummary] = useState<AccessSummary | null>(null);
    const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
    const [heatmap, setHeatmap] = useState<HeatmapEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [days, setDays] = useState(30);

    useEffect(() => { loadReports(); }, [days]);

    const loadReports = async () => {
        setLoading(true);
        try {
            const [sumResp, tlResp, hmResp] = await Promise.all([
                api.get(`/access-control/reports/summary?venue_id=${getVenueId()}&days=${days}`),
                api.get(`/access-control/reports/timeline?venue_id=${getVenueId()}&limit=50`),
                api.get(`/access-control/reports/heatmap?venue_id=${getVenueId()}&days=14`),
            ]);
            if (sumResp.status === 200) setSummary(sumResp.data);
            if (tlResp.status === 200) setTimeline(tlResp.data);
            if (hmResp.status === 200) setHeatmap(hmResp.data);
        } catch (e) {
            logger.error('Reports load failed', { error: String(e) });
        } finally { setLoading(false); }
    };

    const severityColors: Record<string, string> = {
        info: 'border-l-emerald-500 bg-emerald-500/5',
        warning: 'border-l-amber-500 bg-amber-500/5',
        error: 'border-l-red-500 bg-red-500/5',
    };
    const severityIcons: Record<string, React.ReactNode> = {
        info: <Check className="h-4 w-4 text-emerald-400" />,
        warning: <AlertTriangle className="h-4 w-4 text-amber-400" />,
        error: <X className="h-4 w-4 text-red-400" />,
    };

    if (loading) {
        return <div className="flex justify-center py-12"><RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
    }

    return (
        <div className="space-y-6">
            {/* Period Selector */}
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-foreground">Access Reports</h3>
                <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Period:</span>
                    {[7, 14, 30, 90].map(d => (
                        <Button key={d} size="sm" variant={days === d ? 'default' : 'outline'}
                            className={days === d ? 'bg-emerald-600 text-foreground h-7 text-xs' : 'border-border text-muted-foreground h-7 text-xs'}
                            onClick={() => setDays(d)}>{d}d</Button>
                    ))}
                </div>
            </div>

            {/* Summary Cards */}
            {summary && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        { icon: <Activity className="h-4 w-4 text-blue-400" />, label: 'Total Actions', value: summary.total_actions.toLocaleString(), sub: `Last ${summary.period_days} days`, delay: 0 },
                        { icon: <TrendingUp className="h-4 w-4 text-emerald-400" />, label: 'Success Rate', value: `${summary.success_rate}%`, sub: `${summary.success_count} / ${summary.total_actions}`, delay: 0.05, valColor: 'text-emerald-400' },
                        { icon: <Zap className="h-4 w-4 text-cyan-400" />, label: 'Avg Response', value: `${summary.avg_response_ms}ms`, sub: `Bridge: ${summary.bridge_usage_pct}%`, delay: 0.1 },
                        { icon: <AlertTriangle className="h-4 w-4 text-red-400" />, label: 'Failures', value: `${summary.failure_count + summary.unauthorized_count}`, sub: `${summary.unauthorized_count} unauthorized`, delay: 0.15, valColor: 'text-red-400' },
                    ].map((card, i) => (
                        <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: card.delay }}>
                            <Card className="bg-background border-border">
                                <CardContent className="p-4">
                                    <div className="flex items-center gap-2 mb-2">{card.icon}<span className="text-xs text-muted-foreground uppercase">{card.label}</span></div>
                                    <p className={`text-2xl font-bold ${card.valColor || 'text-foreground'}`}>{card.value}</p>
                                    <p className="text-xs text-muted-foreground mt-1">{card.sub}</p>
                                </CardContent>
                            </Card>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Highlights */}
            {summary && (summary.busiest_door || summary.most_active_user) && (
                <div className="grid grid-cols-2 gap-4">
                    {summary.busiest_door && (
                        <Card className="bg-background border-border">
                            <CardContent className="p-4 flex items-center gap-4">
                                <div className="h-10 w-10 rounded-lg bg-blue-900/30 flex items-center justify-center"><DoorOpen className="h-5 w-5 text-blue-400" /></div>
                                <div><p className="text-xs text-muted-foreground">Busiest Door</p><p className="text-sm font-semibold text-foreground">{summary.busiest_door.name}</p><p className="text-xs text-muted-foreground">{summary.busiest_door.count} actions</p></div>
                            </CardContent>
                        </Card>
                    )}
                    {summary.most_active_user && (
                        <Card className="bg-background border-border">
                            <CardContent className="p-4 flex items-center gap-4">
                                <div className="h-10 w-10 rounded-lg bg-purple-900/30 flex items-center justify-center"><Users className="h-5 w-5 text-purple-400" /></div>
                                <div><p className="text-xs text-muted-foreground">Most Active User</p><p className="text-sm font-semibold text-foreground">{summary.most_active_user.name}</p><p className="text-xs text-muted-foreground">{summary.most_active_user.count} actions</p></div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            )}

            {/* Heatmap */}
            <Card className="bg-background border-border">
                <CardHeader><CardTitle className="text-foreground flex items-center gap-2 text-sm"><BarChart3 className="h-4 w-4 text-orange-400" />Access Heatmap (14 days)</CardTitle></CardHeader>
                <CardContent>
                    <div className="grid grid-cols-24 gap-0.5">
                        {Array.from({ length: 24 }, (_, hour) => {
                            const hourEntries = heatmap.filter(h => h.hour === hour);
                            const totalCount = hourEntries.reduce((s, e) => s + e.count, 0);
                            const maxCount = Math.max(...heatmap.map(h => h.count), 1);
                            const intensity = heatmap.length > 0 ? totalCount / (maxCount * Math.max(hourEntries.length, 1)) : 0;
                            const bgOpacity = heatmap.length > 0 ? Math.min(0.1 + intensity * 0.9, 1) : 0.05;
                            return (
                                <div key={hour} className="flex flex-col items-center" title={`${hour}:00 — ${totalCount} total actions`}>
                                    <div className="w-full h-8 rounded-sm" style={{ backgroundColor: `rgba(52, 211, 153, ${bgOpacity})` }} />
                                    <span className="text-[9px] text-muted-foreground mt-1">{hour}</span>
                                </div>
                            );
                        })}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-2 text-right">Hour of day (UTC)</p>
                </CardContent>
            </Card>

            {/* Activity Timeline */}
            <Card className="bg-background border-border">
                <CardHeader><CardTitle className="text-foreground flex items-center gap-2 text-sm"><Activity className="h-4 w-4 text-emerald-400" />Activity Timeline</CardTitle></CardHeader>
                <CardContent>
                    <div className="space-y-2 max-h-[400px] overflow-auto">
                        <AnimatePresence>
                            {timeline.map((entry, i) => (
                                <motion.div key={entry.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.02 }}
                                    className={`border-l-2 ${severityColors[entry.severity] || severityColors.info} px-3 py-2 rounded-r`}>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">{severityIcons[entry.severity]}<span className="text-sm text-secondary-foreground">{entry.description}</span></div>
                                        <div className="flex items-center gap-2">
                                            {entry.duration_ms && <span className="text-[10px] text-muted-foreground">{entry.duration_ms}ms</span>}
                                            <Badge variant="outline" className="text-[9px] border-border text-muted-foreground">{entry.provider_path}</Badge>
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground mt-1">{new Date(entry.timestamp).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'medium' })}</p>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                        {timeline.length === 0 && (
                            Array.from({ length: 3 }).map((_, i) => (
                                <div key={`placeholder-${i}`} className="border-l-2 border-l-zinc-700 bg-zinc-800/20 px-3 py-2 rounded-r">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2"><Activity className="h-4 w-4 text-muted-foreground" /><span className="text-sm text-muted-foreground">—</span></div>
                                        <Badge variant="outline" className="text-[9px] border-border text-muted-foreground">—</Badge>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground mt-1">No entries</p>
                                </div>
                            ))
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
