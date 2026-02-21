// @ts-nocheck
import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import PageContainer from '../../../layouts/PageContainer';
import { Card, CardContent } from '../../../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table';
import { Badge } from '../../../components/ui/badge';
import { Phone, Play, FileText, Clock, Loader2, Download, Filter, X, ChevronRight, Mic, MessageSquare, ArrowUpDown } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { useQuery } from '@tanstack/react-query';
import { voiceService } from './voice-service';
import { useVenue } from '../../../context/VenueContext';
import { cn } from '../../../lib/utils';
import { toast } from 'sonner';

/* ========== Tab Nav ========== */
const TABS = [
    { id: 'dashboard', label: 'Dashboard', path: '/admin/restin/voice' },
    { id: 'settings', label: 'Settings', path: '/admin/restin/voice/settings' },
    { id: 'logs', label: 'Call Logs', path: '/admin/restin/voice/logs' },
];

const STATUS_OPTIONS = [
    { value: '', label: 'All Statuses' },
    { value: 'BOOKED', label: 'Booked' },
    { value: 'Inquiry', label: 'Inquiry' },
    { value: 'Escalated', label: 'Escalated' },
];

export default function CallLogs() {
    const { activeVenueId } = useVenue();
    const navigate = useNavigate();
    const location = useLocation();
    const [statusFilter, setStatusFilter] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedLog, setSelectedLog] = useState<any>(null);
    const [sortField, setSortField] = useState('created_at');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

    const { data: logs = [], isLoading } = useQuery({
        queryKey: ['voice-logs', activeVenueId, statusFilter],
        queryFn: () => voiceService.getLogs(activeVenueId || 'default', 200, statusFilter || undefined),
        enabled: !!activeVenueId
    });

    // Filter & sort
    const filteredLogs = logs
        .filter((log: any) => {
            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                return (log.caller || '').toLowerCase().includes(q) ||
                    (log.transcript_in || '').toLowerCase().includes(q);
            }
            return true;
        })
        .sort((a: any, b: any) => {
            const aVal = a[sortField] || '';
            const bVal = b[sortField] || '';
            return sortDir === 'asc' ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
        });

    const handleSort = (field: string) => {
        if (sortField === field) {
            setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDir('desc');
        }
    };

    const handleExport = () => {
        if (filteredLogs.length === 0) {
            toast.error('No logs to export');
            return;
        }
        voiceService.exportLogsCSV(filteredLogs);
        toast.success(`Exported ${filteredLogs.length} call logs`);
    };

    const activeTab = location.pathname.includes('/settings') ? 'settings'
        : location.pathname.includes('/logs') ? 'logs' : 'dashboard';

    const getStatusBadge = (status: string) => {
        const map: Record<string, string> = {
            'BOOKED': 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20',
            'Inquiry': 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
            'Escalated': 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
        };
        return map[status] || 'bg-zinc-500/10 text-muted-foreground border-zinc-500/20';
    };

    const getSentimentIcon = (sentiment: string) => {
        if (sentiment === 'positive') return '😊';
        if (sentiment === 'negative') return '😟';
        return '😐';
    };

    return (
        <div className="flex flex-col gap-6 animate-in zoom-in duration-500">
            {/* ── Tab Navigation ── */}
            <div className="flex items-center gap-1 bg-card/30 p-1 rounded-xl border border-border w-fit">
                {TABS.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => navigate(tab.path)}
                        className={cn(
                            'px-5 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all',
                            activeTab === tab.id
                                ? 'bg-red-600 text-white shadow-lg shadow-red-600/20'
                                : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                        )}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* ── Header & Controls ── */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-black text-foreground italic tracking-tighter">CALL LOGS</h2>
                    <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest mt-1">
                        {filteredLogs.length} call{filteredLogs.length !== 1 ? 's' : ''} logged
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <Input
                        placeholder="Search caller or transcript..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-60 bg-background border-border text-foreground placeholder:text-muted-foreground text-sm"
                    />
                    <div className="relative">
                        <select aria-label="Filter by call status"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="h-9 pl-3 pr-8 bg-background border border-border rounded-lg text-sm text-foreground appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-red-500"
                        >
                            {STATUS_OPTIONS.map(o => (
                                <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                        </select>
                        <Filter size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    </div>
                    <Button variant="outline" onClick={handleExport} className="gap-2 border-border text-foreground font-bold">
                        <Download size={14} /> Export CSV
                    </Button>
                </div>
            </div>

            {/* ── Table ── */}
            <Card className="bg-card/20 border-border backdrop-blur-lg overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="border-border hover:bg-transparent">
                            <TableHead className="cursor-pointer select-none font-black text-muted-foreground text-[10px] uppercase tracking-widest" onClick={() => handleSort('caller')}>
                                <div className="flex items-center gap-1">Caller <ArrowUpDown size={10} /></div>
                            </TableHead>
                            <TableHead className="cursor-pointer select-none font-black text-muted-foreground text-[10px] uppercase tracking-widest" onClick={() => handleSort('created_at')}>
                                <div className="flex items-center gap-1">Time <ArrowUpDown size={10} /></div>
                            </TableHead>
                            <TableHead className="font-black text-muted-foreground text-[10px] uppercase tracking-widest">Duration</TableHead>
                            <TableHead className="font-black text-muted-foreground text-[10px] uppercase tracking-widest">Status</TableHead>
                            <TableHead className="font-black text-muted-foreground text-[10px] uppercase tracking-widest">Sentiment</TableHead>
                            <TableHead className="font-black text-muted-foreground text-[10px] uppercase tracking-widest hidden lg:table-cell">Guest Said</TableHead>
                            <TableHead className="font-black text-muted-foreground text-[10px] uppercase tracking-widest w-8"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-12">
                                    <Loader2 size={24} className="animate-spin text-muted-foreground mx-auto" />
                                </TableCell>
                            </TableRow>
                        ) : filteredLogs.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground text-sm">
                                    No calls found. Use the Call Simulator or Seed Demo on the Dashboard to generate test data.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredLogs.map((log: any, i: number) => (
                                <TableRow
                                    key={log.id || i}
                                    className="border-border/30 cursor-pointer hover:bg-card/40 transition-colors group"
                                    onClick={() => setSelectedLog(selectedLog?.id === log.id ? null : log)}
                                >
                                    <TableCell className="font-bold text-foreground text-sm">{log.caller || 'Unknown'}</TableCell>
                                    <TableCell className="text-xs text-muted-foreground font-medium">
                                        {log.created_at ? new Date(log.created_at).toLocaleString('en-MT', { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                                    </TableCell>
                                    <TableCell className="text-xs text-muted-foreground font-bold">{log.duration_seconds || 0}s</TableCell>
                                    <TableCell>
                                        <span className={cn('px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border', getStatusBadge(log.status || ''))}>
                                            {log.status || 'Unknown'}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-sm">{getSentimentIcon(log.sentiment)}</TableCell>
                                    <TableCell className="hidden lg:table-cell text-xs text-muted-foreground font-medium truncate max-w-[200px]">
                                        {log.transcript_in || '—'}
                                    </TableCell>
                                    <TableCell>
                                        <ChevronRight size={14} className={cn(
                                            'text-zinc-700 transition-transform',
                                            selectedLog?.id === log.id && 'rotate-90 text-red-500'
                                        )} />
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </Card>

            {/* ── Detail Drawer (inline slide-down) ── */}
            {selectedLog && (
                <Card className="bg-card/30 border-border p-6 animate-in slide-in-from-top-4 duration-300">
                    <div className="flex items-start justify-between mb-4">
                        <div>
                            <h3 className="text-lg font-black text-foreground italic">Call Detail</h3>
                            <p className="text-xs text-muted-foreground font-bold mt-1">
                                {selectedLog.caller} • {selectedLog.created_at ? new Date(selectedLog.created_at).toLocaleString() : ''}
                            </p>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => setSelectedLog(null)}>
                            <X size={16} />
                        </Button>
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        <div className="p-3 bg-background/50 rounded-xl border border-border">
                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Status</p>
                            <span className={cn('px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border', getStatusBadge(selectedLog.status))}>
                                {selectedLog.status}
                            </span>
                        </div>
                        <div className="p-3 bg-background/50 rounded-xl border border-border">
                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Duration</p>
                            <p className="text-lg font-black text-foreground">{selectedLog.duration_seconds || 0}s</p>
                        </div>
                        <div className="p-3 bg-background/50 rounded-xl border border-border">
                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Provider</p>
                            <p className="text-sm font-bold text-foreground">{selectedLog.ai_provider || 'Gemini'}</p>
                        </div>
                        <div className="p-3 bg-background/50 rounded-xl border border-border">
                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Tokens</p>
                            <p className="text-lg font-black text-foreground">{selectedLog.tokens_used || 0}</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="p-4 bg-background/50 rounded-xl border border-border">
                            <div className="flex items-center gap-2 mb-2">
                                <Phone size={14} className="text-blue-500" />
                                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Guest Said</p>
                            </div>
                            <p className="text-sm text-foreground">{selectedLog.transcript_in || 'No transcript available'}</p>
                        </div>
                        <div className="p-4 bg-background/50 rounded-xl border border-border">
                            <div className="flex items-center gap-2 mb-2">
                                <Mic size={14} className="text-purple-500" />
                                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">AI Response</p>
                            </div>
                            <p className="text-sm text-foreground">{selectedLog.transcript_out || 'No response recorded'}</p>
                        </div>
                    </div>
                </Card>
            )}
        </div>
    );
}
