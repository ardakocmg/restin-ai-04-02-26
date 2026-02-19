import React, { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';
import api from '@/lib/api';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Router, WifiOff, RefreshCw, Settings } from 'lucide-react';
import { toast } from 'sonner';
import type { BridgeHealth } from '../doorAccessTypes';
import { getVenueId } from '../doorAccessTypes';

export default function BridgeTab() {
    const [health, setHealth] = useState<BridgeHealth>({ configured: false, is_healthy: false });
    const [bridgeIp, setBridgeIp] = useState('');
    const [bridgePort, setBridgePort] = useState('8080');
    const [bridgeToken, setBridgeToken] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => { checkHealth(); }, []);

    const checkHealth = async () => {
        try {
            const resp = await api.get(`/access-control/bridge/health?venue_id=${getVenueId()}`);
            if (resp.status === 200) setHealth(resp.data);
        } catch (e) {
            logger.error('Bridge health check failed', { error: String(e) });
        }
    };

    const configureBridge = async () => {
        if (!bridgeIp) { toast.error('Enter bridge IP'); return; }
        setLoading(true);
        try {
            const resp = await api.post(`/access-control/bridge/configure?venue_id=${getVenueId()}`, {
                ip_address: bridgeIp, port: parseInt(bridgePort), token: bridgeToken || null
            });
            if (resp.status === 200) {
                const data = resp.data;
                toast.success(data.is_healthy ? 'Bridge connected and healthy!' : 'Bridge configured but unreachable');
                checkHealth();
            } else {
                toast.error('Configuration failed');
            }
        } catch (e) {
            toast.error('Bridge configuration error');
            logger.error('Bridge config failed', { error: String(e) });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <Card className="bg-zinc-950 border-zinc-800">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-zinc-100">
                        <Router className="h-5 w-5 text-cyan-400" />
                        Bridge Status
                    </CardTitle>
                    <CardDescription className="text-zinc-400">
                        Optional. When a bridge is present, actions execute via local LAN for faster response.
                        Falls back to Nuki Web API automatically if bridge is unavailable.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-4">
                        {health.configured ? (
                            <>
                                <div className={`h-3 w-3 rounded-full ${health.is_healthy ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                                <span className="text-zinc-200 font-medium">
                                    {health.is_healthy ? 'Bridge Online' : 'Bridge Offline'}
                                </span>
                                {health.ip_address && <span className="text-xs text-zinc-500">{health.ip_address}:{health.port}</span>}
                                <Badge variant="outline" className={health.is_healthy ? 'border-emerald-800 text-emerald-400' : 'border-red-800 text-red-400'}>
                                    {health.is_healthy ? 'LAN Priority' : 'Web API Fallback'}
                                </Badge>
                            </>
                        ) : (
                            <>
                                <WifiOff className="h-5 w-5 text-zinc-600" />
                                <span className="text-zinc-400">No bridge configured — using Nuki Web API only</span>
                            </>
                        )}
                    </div>
                </CardContent>
            </Card>

            <Card className="bg-zinc-950 border-zinc-800">
                <CardHeader>
                    <CardTitle className="text-zinc-100 flex items-center gap-2">
                        <Settings className="h-5 w-5 text-zinc-400" />
                        Configure Bridge
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-4 gap-3 items-end">
                        <div className="col-span-2">
                            <label className="text-xs text-zinc-400 mb-1 block">Bridge IP Address</label>
                            <Input placeholder="192.168.1.100" value={bridgeIp} onChange={(e) => setBridgeIp(e.target.value)} className="bg-zinc-900 border-zinc-700 text-zinc-200" />
                        </div>
                        <div>
                            <label className="text-xs text-zinc-400 mb-1 block">Port</label>
                            <Input placeholder="8080" value={bridgePort} onChange={(e) => setBridgePort(e.target.value)} className="bg-zinc-900 border-zinc-700 text-zinc-200" />
                        </div>
                        <Button onClick={configureBridge} disabled={loading} className="bg-cyan-600 hover:bg-cyan-700 text-white">
                            {loading ? <RefreshCw className="h-4 w-4 animate-spin mr-1" /> : <Router className="h-4 w-4 mr-1" />}
                            Connect
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
