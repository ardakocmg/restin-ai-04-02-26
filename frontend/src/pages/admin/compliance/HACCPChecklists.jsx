import React, { useState } from 'react';
import {
    ClipboardCheck, Thermometer, Plus, CheckCircle, XCircle,
    AlertTriangle, Clock, Loader2, RefreshCw, ChevronDown,
    ChevronRight, Trash2, Database, ShieldCheck
} from 'lucide-react';
import { Card } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { cn } from '../../../lib/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useVenue } from '../../../context/VenueContext';
import { toast } from 'sonner';
import api from '../../../lib/api';

/**
 * 🛡️ Digital HACCP Checklists (Auto-HACCP — Rule 53)
 * Template builder + daily log viewer with compliance scoring.
 */
export default function HACCPChecklists() {
    const { currentVenue } = useVenue();
    const venueId = currentVenue?.id || localStorage.getItem('currentVenueId') || 'default';
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState('templates');
    const [expandedLog, setExpandedLog] = useState(null);

    const { data: templates = [], isLoading: loadingTemplates } = useQuery({
        queryKey: ['haccp-templates', venueId],
        queryFn: async () => {
            const { data } = await api.get(`/haccp/templates?venue_id=${venueId}`);
            return data;
        }
    });

    const { data: logs = [], isLoading: loadingLogs } = useQuery({
        queryKey: ['haccp-logs', venueId],
        queryFn: async () => {
            const { data } = await api.get(`/haccp/logs?venue_id=${venueId}`);
            return data;
        }
    });

    const seedMutation = useMutation({
        mutationFn: () => api.post(`/haccp/seed?venue_id=${venueId}`),
        onSuccess: () => {
            toast.success('HACCP demo data seeded');
            queryClient.invalidateQueries(['haccp-templates']);
            queryClient.invalidateQueries(['haccp-logs']);
        },
        onError: () => toast.error('Failed to seed HACCP data')
    });

    const passRate = logs.length > 0
        ? Math.round(logs.filter(l => l.status === 'pass').length / logs.length * 100)
        : 0;

    const avgScore = logs.length > 0
        ? Math.round(logs.reduce((s, l) => s + (l.compliance_score || 0), 0) / logs.length)
        : 0;

    const categoryColors = {
        temperature: { icon: Thermometer, color: 'text-red-500', bg: 'bg-red-500/10' },
        receiving: { icon: ClipboardCheck, color: 'text-blue-500', bg: 'bg-blue-500/10' },
        cleaning: { icon: ShieldCheck, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
        general: { icon: ClipboardCheck, color: 'text-zinc-400', bg: 'bg-zinc-500/10' },
    };

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                        <ClipboardCheck className="w-6 h-6 text-emerald-500" />
                        HACCP Checklists
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Digital food safety compliance — temperature checks, cleaning logs, delivery inspections
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline" size="sm"
                        onClick={() => seedMutation.mutate()}
                        disabled={seedMutation.isLoading}
                    >
                        {seedMutation.isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Database className="w-4 h-4 mr-1" />}
                        Seed Demo
                    </Button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-4">
                <Card className="p-4 bg-card border-border">
                    <div className="text-sm text-muted-foreground">Templates</div>
                    <div className="text-2xl font-bold text-foreground">{templates.length}</div>
                </Card>
                <Card className="p-4 bg-card border-border">
                    <div className="text-sm text-muted-foreground">Logs Submitted</div>
                    <div className="text-2xl font-bold text-blue-500">{logs.length}</div>
                </Card>
                <Card className="p-4 bg-card border-border">
                    <div className="text-sm text-muted-foreground">Pass Rate</div>
                    <div className={cn("text-2xl font-bold", passRate >= 80 ? "text-emerald-500" : "text-red-500")}>
                        {passRate}%
                    </div>
                </Card>
                <Card className="p-4 bg-card border-border">
                    <div className="text-sm text-muted-foreground">Avg Score</div>
                    <div className={cn("text-2xl font-bold", avgScore >= 80 ? "text-emerald-500" : "text-amber-500")}>
                        {avgScore}%
                    </div>
                </Card>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 border-b border-border">
                {['templates', 'logs'].map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={cn(
                            "px-4 py-2 text-sm font-medium border-b-2 transition-colors capitalize",
                            activeTab === tab
                                ? "border-emerald-500 text-emerald-500"
                                : "border-transparent text-muted-foreground hover:text-foreground"
                        )}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* Templates Tab */}
            {activeTab === 'templates' && (
                loadingTemplates ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                    </div>
                ) : templates.length === 0 ? (
                    <Card className="p-12 bg-card border-border text-center">
                        <ClipboardCheck className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="font-semibold text-foreground">No Templates Yet</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                            Seed demo data or create your first HACCP checklist template.
                        </p>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {templates.map(template => {
                            const cat = categoryColors[template.category] || categoryColors.general;
                            const CatIcon = cat.icon;
                            return (
                                <Card key={template.id} className="p-4 bg-card border-border">
                                    <div className="flex items-start gap-3">
                                        <div className={cn("p-2 rounded-lg", cat.bg)}>
                                            <CatIcon className={cn("w-5 h-5", cat.color)} />
                                        </div>
                                        <div className="flex-1">
                                            <div className="font-medium text-foreground">{template.name}</div>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className={cn("text-[10px] px-1.5 py-0.5 rounded capitalize", cat.bg, cat.color)}>
                                                    {template.category}
                                                </span>
                                                <span className="text-xs text-muted-foreground">
                                                    {template.frequency}
                                                </span>
                                            </div>
                                            <div className="mt-3 space-y-1">
                                                {(template.items || []).slice(0, 3).map((item, idx) => (
                                                    <div key={idx} className="text-xs text-muted-foreground flex items-center gap-1.5">
                                                        <div className="w-1 h-1 rounded-full bg-muted-foreground" />
                                                        {item.label}
                                                    </div>
                                                ))}
                                                {(template.items || []).length > 3 && (
                                                    <div className="text-xs text-muted-foreground">
                                                        +{template.items.length - 3} more items
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
                                        <span className="text-[10px] text-muted-foreground">
                                            {template.items?.length || 0} check items
                                        </span>
                                        <span className={cn(
                                            "text-[10px] px-1.5 py-0.5 rounded",
                                            template.is_active ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"
                                        )}>
                                            {template.is_active ? 'Active' : 'Inactive'}
                                        </span>
                                    </div>
                                </Card>
                            );
                        })}
                    </div>
                )
            )}

            {/* Logs Tab */}
            {activeTab === 'logs' && (
                loadingLogs ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                    </div>
                ) : logs.length === 0 ? (
                    <Card className="p-12 bg-card border-border text-center">
                        <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="font-semibold text-foreground">No Logs Yet</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                            Checklist submissions will appear here. Seed demo data to see examples.
                        </p>
                    </Card>
                ) : (
                    <div className="space-y-3">
                        {logs.map(log => (
                            <Card key={log.id} className="bg-card border-border">
                                <div
                                    className="p-4 cursor-pointer flex items-center justify-between"
                                    onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                                >
                                    <div className="flex items-center gap-3">
                                        {log.status === 'pass' ? (
                                            <CheckCircle className="w-5 h-5 text-emerald-500" />
                                        ) : (
                                            <XCircle className="w-5 h-5 text-red-500" />
                                        )}
                                        <div>
                                            <div className="font-medium text-foreground">{log.template_name}</div>
                                            <div className="text-xs text-muted-foreground mt-0.5">
                                                {log.passed_items}/{log.total_items} passed • {log.compliance_score}% compliance
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs text-muted-foreground">
                                            {new Date(log.completed_at).toLocaleDateString()}
                                        </span>
                                        {expandedLog === log.id ? (
                                            <ChevronDown className="w-4 h-4 text-muted-foreground" />
                                        ) : (
                                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                        )}
                                    </div>
                                </div>

                                {expandedLog === log.id && (
                                    <div className="px-4 pb-4 space-y-2 border-t border-border pt-3">
                                        {(log.items || []).map((item, idx) => (
                                            <div key={idx} className="flex items-center justify-between text-sm">
                                                <span className="text-foreground">{item.label}</span>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-muted-foreground">{item.value}</span>
                                                    {item.passed ? (
                                                        <CheckCircle className="w-4 h-4 text-emerald-500" />
                                                    ) : (
                                                        <XCircle className="w-4 h-4 text-red-500" />
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </Card>
                        ))}
                    </div>
                )
            )}
        </div>
    );
}
