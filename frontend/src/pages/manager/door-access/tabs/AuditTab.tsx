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
        PROVIDER_UNAVAILABLE: 'bg-zinc-700/30 text-zinc-400 border-zinc-700',
    };

    const actionIcons: Record<string, React.ReactNode> = {
        UNLOCK: <Unlock className="h-3.5 w-3.5 text-emerald-400" />,
        LOCK: <Lock className="h-3.5 w-3.5 text-red-400" />,
        UNLATCH: <DoorOpen className="h-3.5 w-3.5 text-blue-400" />,
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-zinc-100">Access Audit Trail</h3>
                <Button onClick={loadAudit} variant="outline" className="border-zinc-700 text-zinc-300" size="sm">
                    <RefreshCw className="h-3 w-3 mr-1" /> Refresh
                </Button>
            </div>
            <Card className="bg-zinc-950 border-zinc-800">
                <CardContent className="p-0">
                    <div className="max-h-[600px] overflow-auto">
                        <table className="w-full">
                            <thead className="sticky top-0 bg-zinc-950 z-10">
                                <tr className="border-b border-zinc-800">
                                    <th className="text-left p-3 text-xs font-medium text-zinc-500 uppercase">Time</th>
                                    <th className="text-left p-3 text-xs font-medium text-zinc-500 uppercase">User</th>
                                    <th className="text-left p-3 text-xs font-medium text-zinc-500 uppercase">Door</th>
                                    <th className="text-left p-3 text-xs font-medium text-zinc-500 uppercase">Action</th>
                                    <th className="text-left p-3 text-xs font-medium text-zinc-500 uppercase">Result</th>
                                    <th className="text-left p-3 text-xs font-medium text-zinc-500 uppercase">Path</th>
                                    <th className="text-left p-3 text-xs font-medium text-zinc-500 uppercase">Speed</th>
                                </tr>
                            </thead>
                            <tbody>
                                {entries.map(entry => (
                                    <tr key={entry.id} className="border-b border-zinc-900/50 hover:bg-zinc-900/30 transition-colors">
                                        <td className="p-3 text-xs text-zinc-400 whitespace-nowrap">
                                            {new Date(entry.timestamp).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'medium' })}
                                        </td>
                                        <td className="p-3 text-sm text-zinc-200">{entry.user_name}</td>
                                        <td className="p-3 text-sm text-zinc-300">{entry.door_display_name}</td>
                                        <td className="p-3">
                                            <div className="flex items-center gap-1.5">
                                                {actionIcons[entry.action]}
                                                <span className="text-xs text-zinc-300">{entry.action}</span>
                                            </div>
                                        </td>
                                        <td className="p-3">
                                            <Badge variant="outline" className={`text-[10px] ${resultColors[entry.result] || resultColors.FAILURE}`}>
                                                {entry.result}
                                            </Badge>
                                        </td>
                                        <td className="p-3">
                                            <Badge variant="outline" className="text-[10px] border-zinc-700 text-zinc-400">
                                                {entry.provider_path === 'BRIDGE' ? <Router className="h-3 w-3 mr-1" /> : <Globe className="h-3 w-3 mr-1" />}
                                                {entry.provider_path}
                                            </Badge>
                                        </td>
                                        <td className="p-3 text-xs text-zinc-500">{entry.duration_ms ? `${entry.duration_ms}ms` : '—'}</td>
                                    </tr>
                                ))}
                                {entries.length === 0 && (
                                    <tr><td colSpan={7} className="p-8 text-center text-zinc-500">No audit entries yet.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
