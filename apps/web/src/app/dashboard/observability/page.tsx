'use client';

import React from 'react';
import PageContainer from '@/components/layout/PageContainer';
import { Card, CardContent } from '@antigravity/ui';
import { Activity, Database, Server, Wifi, RefreshCw } from 'lucide-react';
import { Button } from '@antigravity/ui';

export default function ObservabilityHub() {
    return (
        <PageContainer title="System Observability" description="Real-time health and diagnostics" actions={
            <Button variant="outline"><RefreshCw className="h-4 w-4 mr-2" /> Refresh</Button>
        }>
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="border-zinc-800 bg-zinc-900/50">
                        <CardContent className="p-6 flex items-center gap-4">
                            <div className="h-12 w-12 bg-green-900/20 rounded-xl flex items-center justify-center text-green-500">
                                <Server className="h-6 w-6" />
                            </div>
                            <div>
                                <p className="text-xs uppercase font-bold text-zinc-500">Backend API</p>
                                <p className="text-xl font-mono text-green-400 font-bold">ONLINE</p>
                                <p className="text-xs text-zinc-500">12ms latency</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border-zinc-800 bg-zinc-900/50">
                        <CardContent className="p-6 flex items-center gap-4">
                            <div className="h-12 w-12 bg-green-900/20 rounded-xl flex items-center justify-center text-green-500">
                                <Database className="h-6 w-6" />
                            </div>
                            <div>
                                <p className="text-xs uppercase font-bold text-zinc-500">Database</p>
                                <p className="text-xl font-mono text-green-400 font-bold">HEALTHY</p>
                                <p className="text-xs text-zinc-500">Replica Set OK</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border-zinc-800 bg-zinc-900/50">
                        <CardContent className="p-6 flex items-center gap-4">
                            <div className="h-12 w-12 bg-green-900/20 rounded-xl flex items-center justify-center text-green-500">
                                <Wifi className="h-6 w-6" />
                            </div>
                            <div>
                                <p className="text-xs uppercase font-bold text-zinc-500">Edge Nodes</p>
                                <p className="text-xl font-mono text-green-400 font-bold">3/3 ACTIVE</p>
                                <p className="text-xs text-zinc-500">Syncing...</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="p-6 border border-zinc-800 bg-zinc-950 rounded-xl">
                    <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest mb-4">Live Logs</h3>
                    <div className="font-mono text-xs text-zinc-500 space-y-1">
                        <p>[20:14:02] <span className="text-blue-500">INFO</span>  Sync worker started batch #9921</p>
                        <p>[20:14:05] <span className="text-green-500">SUCCESS</span> Order #1024 synced to cloud</p>
                        <p>[20:14:12] <span className="text-blue-500">INFO</span>  Heartbeat metrics pushed</p>
                    </div>
                </div>
            </div>
        </PageContainer>
    );
}
