// @ts-nocheck
import React, { useState } from 'react';
import {
    Mic, Settings, PhoneIncoming, Clock, Shield,
    BookOpen, UserPlus, Play, BarChart3, Send,
    Calendar, MessageSquare, Volume2, ChevronRight,
    Phone, Loader2, CheckCircle, AlertTriangle
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { voiceService } from './voice-service';
import { useVenue } from '../../../context/VenueContext';
import { useAuth } from '../../../context/AuthContext';
import { Card } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { cn } from '../../../lib/utils';
import { toast } from 'sonner';

/**
 * 📞 VOICE AI DASHBOARD (Pillar 4)
 * Manage the 24/7 AI Receptionist & RAG Knowledge Base.
 * Connected to real backend: /api/voice/*
 */
export default function VoiceDashboard() {
    const { activeVenueId } = useVenue();
    const { user, isManager, isOwner } = useAuth();
    const queryClient = useQueryClient();
    const [simulateText, setSimulateText] = useState('');
    const [aiResponse, setAiResponse] = useState(null);

    const { data: config } = useQuery({
        queryKey: ['voice-config', activeVenueId],
        queryFn: () => voiceService.getConfig(activeVenueId || 'default'),
        enabled: !!activeVenueId
    });

    const { data: logs = [] } = useQuery({
        queryKey: ['voice-logs', activeVenueId],
        queryFn: () => voiceService.getLogs(activeVenueId || 'default'),
        enabled: !!activeVenueId
    });

    const { data: stats } = useQuery({
        queryKey: ['voice-stats', activeVenueId],
        queryFn: () => voiceService.getStats(activeVenueId || 'default'),
        enabled: !!activeVenueId
    });

    const { data: knowledge = [] } = useQuery({
        queryKey: ['voice-knowledge', activeVenueId],
        queryFn: () => voiceService.getKnowledge(activeVenueId || 'default'),
        enabled: !!activeVenueId
    });

    const simulateMutation = useMutation({
        mutationFn: (transcript) => voiceService.simulateCall(activeVenueId || 'default', transcript),
        onSuccess: (data) => {
            setAiResponse(data);
            queryClient.invalidateQueries({ queryKey: ['voice-logs'] });
            queryClient.invalidateQueries({ queryKey: ['voice-stats'] });
            toast.success('Call simulated successfully');
        },
        onError: () => toast.error('Simulation failed')
    });

    const seedMutation = useMutation({
        mutationFn: () => voiceService.seedData(activeVenueId || 'default'),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['voice-logs'] });
            queryClient.invalidateQueries({ queryKey: ['voice-stats'] });
            queryClient.invalidateQueries({ queryKey: ['voice-knowledge'] });
            queryClient.invalidateQueries({ queryKey: ['voice-config'] });
            toast.success('Demo data seeded!');
        }
    });

    const handleSimulate = () => {
        if (!simulateText.trim()) return;
        simulateMutation.mutate(simulateText);
    };

    // Use real logs or show placeholder
    const activities = logs.length > 0 ? logs.slice(0, 8).map(log => ({
        time: _timeAgo(log.created_at),
        guest: log.caller || 'Unknown',
        action: log.transcript_in || log.action || '',
        response: log.transcript_out || '',
        status: log.status === 'BOOKED' ? 'success' : log.status === 'Escalated' ? 'error' : 'info',
        sentiment: log.sentiment,
    })) : [];

    return (
        <div className="flex flex-col gap-8 animate-in zoom-in duration-500">
            {/* Top Banner: Status & Controls */}
            <Card className="bg-gradient-to-br from-zinc-900 to-black border-border p-8 overflow-hidden relative group">
                <div className="absolute top-0 right-0 p-12 opacity-10 blur-2xl text-red-600">
                    <Mic size={200} />
                </div>

                <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                    <div className="flex items-center gap-6">
                        <div className="relative">
                            <div className="w-20 h-20 rounded-full bg-red-600/10 border border-red-500/20 flex items-center justify-center">
                                <Mic size={32} className="text-red-500 animate-pulse" />
                            </div>
                            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 border-4 border-black flex items-center justify-center">
                                <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
                            </div>
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-foreground italic tracking-tighter">VOICE RECEPTIONIST</h1>
                            <div className="flex items-center gap-3 mt-2">
                                <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                                    Active Line: {config?.phone_number || '+356 2100 0001'}
                                </span>
                                <div className="w-1 h-1 rounded-full bg-zinc-700"></div>
                                <span className="text-xs font-bold text-emerald-500 uppercase tracking-widest">
                                    {config?.status === 'active' ? 'Cloud Sync Active' : 'Setup Required'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <Button
                            variant="outline"
                            onClick={() => seedMutation.mutate()}
                            disabled={seedMutation.isPending}
                            className="h-12 border-border text-foreground font-bold px-6 rounded-xl hover:bg-white/5 gap-2"
                        >
                            {seedMutation.isPending ? <Loader2 size={18} className="animate-spin" /> : <Settings size={18} />}
                            Seed Demo
                        </Button>
                        <Button className="h-12 bg-red-600 text-foreground font-black px-8 rounded-xl hover:bg-red-700 shadow-[0_10px_30px_rgba(220,38,38,0.3)] gap-2">
                            <Play size={18} /> Live Monitor
                        </Button>
                    </div>
                </div>
            </Card>

            {/* Stats Row */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                {[
                    { label: 'Total Calls', value: stats?.total_calls || 0, icon: Phone, color: 'text-blue-500' },
                    { label: 'Today', value: stats?.calls_today || 0, icon: Calendar, color: 'text-emerald-500' },
                    { label: 'Resolution', value: `${stats?.resolution_rate || 0}%`, icon: CheckCircle, color: 'text-green-500' },
                    { label: 'Avg Duration', value: `${stats?.avg_duration_seconds || 0}s`, icon: Clock, color: 'text-amber-500' },
                    { label: 'AI Tokens', value: stats?.total_tokens_used?.toLocaleString() || '0', icon: BarChart3, color: 'text-purple-500' },
                ].map(({ label, value, icon: Icon, color }, i) => (
                    <Card key={i} className="bg-card/30 border-border p-4 backdrop-blur-lg">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-background rounded-lg">
                                <Icon size={16} className={color} />
                            </div>
                            <div>
                                <p className="text-xl font-black text-foreground">{value}</p>
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{label}</p>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>

            {/* Call Simulator */}
            <Card className="bg-gradient-to-br from-purple-600/5 to-transparent border-purple-500/10 p-6">
                <h3 className="text-lg font-black text-foreground italic mb-4 flex items-center gap-2">
                    <Phone size={20} className="text-purple-500" />
                    CALL SIMULATOR
                </h3>
                <div className="flex gap-3">
                    <Input
                        value={simulateText}
                        onChange={(e) => setSimulateText(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSimulate()}
                        placeholder="Type what a guest would say... e.g. 'I'd like to book a table for 4 tonight'"
                        className="flex-1 bg-background border-border text-foreground placeholder:text-muted-foreground"
                    />
                    <Button
                        onClick={handleSimulate}
                        disabled={simulateMutation.isPending || !simulateText.trim()}
                        className="bg-purple-600 hover:bg-purple-700 text-foreground font-bold px-6 gap-2"
                    >
                        {simulateMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                        Simulate
                    </Button>
                </div>
                {aiResponse && (
                    <div className="mt-4 p-4 bg-background/70 rounded-xl border border-purple-500/20 animate-in slide-in-from-bottom-2">
                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-purple-600/20 rounded-lg mt-0.5">
                                <Mic size={14} className="text-purple-400" />
                            </div>
                            <div className="flex-1">
                                <p className="text-sm text-foreground font-medium">{aiResponse.response}</p>
                                <div className="flex items-center gap-4 mt-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                    <span>Provider: {aiResponse.provider}</span>
                                    <span>Tokens: {aiResponse.tokens_used}</span>
                                    <span className={cn(
                                        aiResponse.status === 'BOOKED' ? 'text-green-500' :
                                            aiResponse.status === 'Escalated' ? 'text-red-500' :
                                                'text-blue-500'
                                    )}>
                                        {aiResponse.status}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Knowledge Base Section (Left) */}
                <div className="lg:col-span-4 space-y-6">
                    <Card className="bg-card/30 border-border p-6 backdrop-blur-lg">
                        <h3 className="text-lg font-black text-foreground italic mb-6 flex items-center gap-2">
                            <BookOpen size={20} className="text-red-500" />
                            KNOWLEDGE BASE (RAG)
                        </h3>
                        <div className="space-y-3">
                            {(knowledge.length > 0 ? knowledge : [
                                { filename: 'No documents yet', uploaded_at: '', size_bytes: 0 }
                            ]).map((doc, i) => (
                                <div key={i} className="flex items-center justify-between p-3 bg-background/50 rounded-xl border border-border/50 group hover:border-border transition-all">
                                    <div className="flex items-center gap-3 truncate">
                                        <Shield size={16} className="text-muted-foreground group-hover:text-red-500" />
                                        <span className="text-xs font-bold text-muted-foreground truncate">{doc.filename}</span>
                                    </div>
                                    {doc.status === 'indexed' && (
                                        <span className="text-[10px] font-bold text-green-500 bg-green-500/10 px-2 py-0.5 rounded">Indexed</span>
                                    )}
                                </div>
                            ))}
                            <Button variant="ghost" className="w-full mt-4 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] hover:text-foreground">
                                Upload New Policy +
                            </Button>
                        </div>
                    </Card>

                    <Card className="bg-gradient-to-br from-red-600/10 to-transparent border-red-500/10 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="text-xs font-black text-secondary-foreground uppercase tracking-widest">AI Persona</h4>
                            <span className="text-[10px] font-black text-red-500">PRO MODE</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-red-600/20 rounded-xl">
                                <Volume2 className="text-red-500" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-foreground italic">"{config?.persona || 'Professional'}"</p>
                                <p className="text-[10px] text-muted-foreground font-bold uppercase mt-1">
                                    Provider: {config?.voice_provider || 'Google TTS'}
                                </p>
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Live Call Logs (Right) */}
                <div className="lg:col-span-8">
                    <Card className="bg-card/10 border-border h-full flex flex-col">
                        <div className="p-6 border-b border-border flex items-center justify-between bg-background/20">
                            <h3 className="text-lg font-black text-foreground italic flex items-center gap-2">
                                <PhoneIncoming size={20} className="text-emerald-500" />
                                RECENT INTERACTIONS ({activities.length})
                            </h3>
                            <div className="flex gap-2">
                                <Button variant="ghost" size="sm" className="text-xs font-bold text-muted-foreground">Filter</Button>
                                <Button variant="ghost" size="sm" className="text-xs font-bold text-muted-foreground">Export CSV</Button>
                            </div>
                        </div>

                        <div className="flex-1 p-6">
                            {activities.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                                    <Phone size={48} className="mb-4 opacity-30" />
                                    <p className="text-sm font-bold">No call logs yet</p>
                                    <p className="text-xs mt-1">Click "Seed Demo" or use the simulator above</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {activities.map((log, i) => (
                                        <div key={i} className="flex items-center gap-6 p-4 bg-card/40 rounded-2xl border border-border/50 hover:bg-card/60 transition-all cursor-pointer group">
                                            <div className="p-3 bg-background rounded-xl group-hover:scale-110 transition-transform">
                                                <MessageSquare size={18} className={cn(
                                                    log.status === 'success' ? "text-emerald-500" :
                                                        log.status === 'error' ? "text-red-500" :
                                                            "text-blue-500"
                                                )} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-start">
                                                    <p className="font-black text-foreground">{log.guest}</p>
                                                    <span className="text-[10px] font-bold text-muted-foreground whitespace-nowrap ml-2">{log.time}</span>
                                                </div>
                                                <p className="text-sm text-muted-foreground font-medium mt-1 truncate">📞 {log.action}</p>
                                                {log.response && (
                                                    <p className="text-xs text-muted-foreground mt-1 truncate">🤖 {log.response}</p>
                                                )}
                                            </div>
                                            <ChevronRight size={18} className="text-zinc-800" />
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="mt-8 grid grid-cols-2 gap-4">
                                <div className="p-4 bg-background/50 rounded-2xl border border-border">
                                    <BarChart3 className="text-muted-foreground mb-2" size={16} />
                                    <p className="text-2xl font-black text-foreground">{stats?.resolution_rate || 0}%</p>
                                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Resolution Rate</p>
                                </div>
                                <div className="p-4 bg-background/50 rounded-2xl border border-border">
                                    <Clock className="text-muted-foreground mb-2" size={16} />
                                    <p className="text-2xl font-black text-foreground">{stats?.avg_duration_seconds || 0}s</p>
                                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Avg Response</p>
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}

function _timeAgo(dateStr) {
    if (!dateStr) return '';
    const now = new Date();
    const date = new Date(dateStr);
    const diff = Math.floor((now - date) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
}
