import React from 'react';
import PageContainer from '../../../layouts/PageContainer';
import { Card, CardContent } from '../../../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table';
import { Badge } from '../../../components/ui/badge';
import { Phone, Play, FileText, Clock, Loader2 } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { voiceService } from './voice-service';
import { useVenue } from '../../../context/VenueContext';
import { useAuth } from '../../../context/AuthContext';

export default function CallLogs() {
    const { activeVenueId } = useVenue();
    const { user, isManager, isOwner } = useAuth();

    const { data: logs = [], isLoading } = useQuery({
        queryKey: ['voice-logs', activeVenueId],
        queryFn: () => voiceService.getLogs(activeVenueId || 'default', 100),
        enabled: !!activeVenueId,
    });

    const formatDuration = (seconds) => {
        if (!seconds) return '0s';
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return m > 0 ? `${m}m ${s}s` : `${s}s`;
    };

    const formatTime = (dateStr) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <PageContainer title="Call Analytics" description="Review AI performance and call transcripts">
            <Card className="bg-card border-border">
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-16">
                            <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
                        </div>
                    ) : logs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                            <Phone size={48} className="mb-4 opacity-30" />
                            <p className="text-sm font-bold">No call logs yet</p>
                            <p className="text-xs mt-1">Use the Voice Dashboard to seed demo data or simulate calls</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow className="border-border hover:bg-transparent">
                                    <TableHead className="text-muted-foreground">Caller</TableHead>
                                    <TableHead className="text-muted-foreground">Time</TableHead>
                                    <TableHead className="text-muted-foreground">Duration</TableHead>
                                    <TableHead className="text-muted-foreground">Outcome</TableHead>
                                    <TableHead className="text-muted-foreground">Guest Said</TableHead>
                                    <TableHead className="text-muted-foreground">AI Response</TableHead>
                                    <TableHead className="text-muted-foreground">Provider</TableHead>
                                    <TableHead className="text-right text-muted-foreground">Tokens</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {logs.map((log, i) => (
                                    <TableRow key={log.id || i} className="border-border hover:bg-white/5">
                                        <TableCell className="font-medium text-foreground">
                                            <div className="flex items-center gap-2">
                                                <Phone className="w-4 h-4 text-muted-foreground" />
                                                {log.caller || 'Unknown'}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">{formatTime(log.created_at)}</TableCell>
                                        <TableCell className="text-muted-foreground">{formatDuration(log.duration_seconds)}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={
                                                log.status === 'BOOKED' ? 'bg-green-500/10 text-green-500 border-green-500/20' :
                                                    log.status === 'Escalated' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                                                        'bg-blue-500/10 text-blue-500 border-blue-500/20'
                                            }>
                                                {log.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-secondary-foreground max-w-[200px] truncate">
                                            {log.transcript_in || log.summary || '—'}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground max-w-[250px] truncate text-xs">
                                            {log.transcript_out || '—'}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground text-xs">
                                            {log.ai_provider || '—'}
                                        </TableCell>
                                        <TableCell className="text-right text-muted-foreground text-xs">
                                            {log.tokens_used || 0}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </PageContainer>
    );
}
