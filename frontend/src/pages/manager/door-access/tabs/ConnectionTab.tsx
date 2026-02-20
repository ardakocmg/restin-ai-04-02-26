import React, { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';
import api from '@/lib/api';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Wifi, Key, RefreshCw, Globe, Shield } from 'lucide-react';
import { toast } from 'sonner';
import type { ConnectionStatus } from '../doorAccessTypes';
import { getVenueId } from '../doorAccessTypes';

export default function ConnectionTab() {
    const [status, setStatus] = useState<ConnectionStatus>({ connected: false });
    const [apiToken, setApiToken] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => { checkStatus(); }, []);

    const checkStatus = async () => {
        try {
            const resp = await api.get(`/access-control/connection/status?venue_id=${getVenueId()}`);
            if (resp.status === 200) setStatus(resp.data);
        } catch (e: any) {
            logger.error('Connection check failed', { error: String(e) });
        }
    };

    const connectToken = async () => {
        if (!apiToken || apiToken.length < 10) {
            toast.error('Please enter a valid Nuki API token');
            return;
        }
        setLoading(true);
        try {
            const resp = await api.post(`/access-control/connect/token?venue_id=${getVenueId()}`, {
                api_token: apiToken
            });
            if (resp.status === 200 || resp.status === 201) {
                toast.success('Nuki connected successfully!');
                setApiToken('');
                checkStatus();
            } else {
                toast.error('Connection failed');
            }
        } catch (e: any) {
            toast.error('Connection error');
            logger.error('Token connect failed', { error: String(e) });
        } finally {
            setLoading(false);
        }
    };

    const startOAuth = async () => {
        try {
            const resp = await api.post(`/access-control/connect/oauth?venue_id=${getVenueId()}`);
            if (resp.status === 200) {
                window.location.href = resp.data.redirect_url;
            } else {
                toast.error('OAuth2 not configured on server');
            }
        } catch (e: any) {
            toast.error('OAuth2 start failed');
            logger.error('OAuth start failed', { error: String(e) });
        }
    };

    return (
        <div className="space-y-6">
            <Card className="bg-background border-border">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-foreground">
                        <Wifi className="h-5 w-5 text-emerald-400" />
                        Connection Status
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-4">
                        <div className={`h-3 w-3 rounded-full ${status.connected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                        <span className="text-secondary-foreground font-medium">
                            {status.connected ? `Connected via ${status.mode}` : 'Not Connected'}
                        </span>
                        {status.connected_at && (
                            <span className="text-xs text-muted-foreground">
                                Since {new Date(status.connected_at).toLocaleDateString()}
                            </span>
                        )}
                    </div>
                </CardContent>
            </Card>

            <div className="grid gap-6 md:grid-cols-2">
                <Card className="bg-background border-border hover:border-emerald-900/50 transition-colors">
                    <CardHeader>
                        <CardTitle className="text-foreground flex items-center gap-2">
                            <Key className="h-5 w-5 text-amber-400" />
                            API Token
                        </CardTitle>
                        <CardDescription className="text-muted-foreground">
                            Quick setup — enter your Nuki API token once. Stored encrypted, never shown again.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Input
                            type="password"
                            placeholder="Paste your Nuki API token..."
                            value={apiToken}
                            onChange={(e) => setApiToken(e.target.value)}
                            className="bg-card border-border text-secondary-foreground"
                        />
                        <Button
                            onClick={connectToken}
                            disabled={loading || !apiToken}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-foreground"
                        >
                            {loading ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Key className="h-4 w-4 mr-2" />}
                            Connect with Token
                        </Button>
                    </CardContent>
                </Card>

                <Card className="bg-background border-border hover:border-blue-900/50 transition-colors">
                    <CardHeader>
                        <CardTitle className="text-foreground flex items-center gap-2">
                            <Shield className="h-5 w-5 text-blue-400" />
                            OAuth2 (Enterprise)
                        </CardTitle>
                        <CardDescription className="text-muted-foreground">
                            Recommended. Secure OAuth2 flow with automatic token refresh. Requires Nuki Advanced API.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button
                            onClick={startOAuth}
                            variant="outline"
                            className="w-full border-blue-800 text-blue-400 hover:bg-blue-950"
                        >
                            <Globe className="h-4 w-4 mr-2" />
                            Connect with OAuth2
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
