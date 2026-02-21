import React, { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';
import api from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Lock, Unlock, DoorOpen, RefreshCw, Globe, Router } from 'lucide-react';
import type { AuditEntry } from '../doorAccessTypes';
import { getVenueId } from '../doorAccessTypes';

export default function AuditTab() {
    const [entries, setEntries] = useState<AuditEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => { loadAudit(); }, []);

    const loadAudit = async () => {
        setLoading(true);
        try {
            const resp = await api.get(`/access-control/audit-logs?venue_id=${getVenueId()}&limit=200`);
            if (resp.status === 200) setEntries(resp.data);
        } catch (e) {
            logger.error('Audit load failed', { error: String(e) });
        } finally { setLoading(false); }
    };

    const resultColors: Record<string, string> = {
        SUCCESS: 'bg-emerald-500/10 text-emerald-400 border-emerald-800',
        FAILURE: 'bg-red-500/10 text-red-400 border-red-800',
        UNAUTHORIZED: 'bg-orange-500/10 text-orange-400 border-orange-800',
        TIMEOUT: 'bg-yellow-500/10 text-yellow-400 border-yellow-800',
        PROVIDER_UNAVAILABLE: 'bg-zinc-700/30 text-muted-foreground border-border',
    };

    const actionIcons: Record<string, React.ReactNode> = {
        UNLOCK: <Unlock className="h-3.5 w-3.5 text-emerald-400" />,
        LOCK: <Lock className="h-3.5 w-3.5 text-red-400" />,
        UNLATCH: <DoorOpen className="h-3.5 w-3.5 text-blue-400" />,
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-foreground">Access Audit Trail</h3>
                <Button onClick={loadAudit} variant="outline" className="border-border text-secondary-foreground" size="sm">
                    <RefreshCw className="h-3 w-3 mr-1" /> Refresh
                </Button>
            </div>
            <Card className="bg-background border-border">
                <CardContent className="p-0">
                    <div className="max-h-[600px] overflow-auto">
                        <table className="w-full">
                            <thead className="sticky top-0 bg-background z-10">
                                <tr className="border-b border-border">
                                    <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase">Time</th>
                                    <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase">User</th>
                                    <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase">Door</th>
                                    <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase">Action</th>
                                    <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase">Result</th>
                                    <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase">Path</th>
                                    <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase">Speed</th>
                                </tr>
                            </thead>
                            <tbody>
                                {entries.map(entry => (
                                    <tr key={entry.id} className="border-b border-zinc-900/50 hover:bg-card/30 transition-colors">
                                        <td className="p-3 text-xs text-muted-foreground whitespace-nowrap">
                                            {new Date(entry.timestamp).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'medium' })}
                                        </td>
                                        <td className="p-3 text-sm text-secondary-foreground">{entry.user_name}</td>
                                        <td className="p-3 text-sm text-secondary-foreground">{entry.door_display_name}</td>
                                        <td className="p-3">
                                            <div className="flex items-center gap-1.5">
                                                {actionIcons[entry.action]}
                                                <span className="text-xs text-secondary-foreground">{entry.action}</span>
                                            </div>
                                        </td>
                                        <td className="p-3">
                                            <Badge variant="outline" className={`text-[10px] ${resultColors[entry.result] || resultColors.FAILURE}`}>
                                                {entry.result}
                                            </Badge>
                                        </td>
                                        <td className="p-3">
                                            <Badge variant="outline" className="text-[10px] border-border text-muted-foreground">
                                                {entry.provider_path === 'BRIDGE' ? <Router className="h-3 w-3 mr-1" /> : <Globe className="h-3 w-3 mr-1" />}
                                                {entry.provider_path}
                                            </Badge>
                                        </td>
                                        <td className="p-3 text-xs text-muted-foreground">{entry.duration_ms ? `${entry.duration_ms}ms` : '—'}</td>
                                    </tr>
                                ))}
                                {entries.length === 0 && (
                                    <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">{"No "}audit entries yet.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
