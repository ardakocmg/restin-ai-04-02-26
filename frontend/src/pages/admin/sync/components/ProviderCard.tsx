import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Settings, CheckCircle, AlertTriangle, XCircle, Power } from 'lucide-react';

interface ProviderCardProps {
    provider: string;
    label: string;
    description: string;
    icon: React.ElementType;
    status: 'CONNECTED' | 'ERROR' | 'DISABLED' | 'NOT_CONFIGURED';
    lastSync: string | null;
    onSync: () => void;
    onConfigure: () => void;
    loading?: boolean;
}

export function ProviderCard({
    provider, label, description, icon: Icon,
    status, lastSync, onSync, onConfigure, loading
}: ProviderCardProps) {

    const getStatusColor = () => {
        switch (status) {
            case 'CONNECTED': return "text-emerald-500";
            case 'ERROR': return "text-red-500";
            case 'DISABLED': return "text-zinc-500";
            default: return "text-zinc-500";
        }
    };

    const getStatusBadge = () => {
        switch (status) {
            case 'CONNECTED': return <Badge variant="outline" className="border-emerald-900 text-emerald-500 bg-emerald-950/30">Connected</Badge>;
            case 'ERROR': return <Badge variant="destructive">Error</Badge>;
            case 'DISABLED': return <Badge variant="secondary">Disabled</Badge>;
            default: return <Badge variant="outline" className="text-zinc-500">Not Configured</Badge>;
        }
    };

    return (
        <Card className="bg-zinc-950 border-zinc-800 flex flex-col">
            <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-md bg-zinc-900 border border-zinc-800 ${getStatusColor()}`}>
                            <Icon className="h-5 w-5" />
                        </div>
                        <div>
                            <CardTitle className="text-base text-zinc-100">{label}</CardTitle>
                            <CardDescription className="text-xs text-zinc-500 mt-1">{description}</CardDescription>
                        </div>
                    </div>
                    {getStatusBadge()}
                </div>
            </CardHeader>
            <CardContent className="flex-1 pb-3">
                <div className="text-xs text-zinc-500 flex flex-col gap-1">
                    <span className="flex items-center gap-1.5">
                        <CheckCircle className="h-3 w-3" />
                        Last Sync: {lastSync ? new Date(lastSync).toLocaleString() : 'Never'}
                    </span>
                    {status === 'ERROR' && (
                        <span className="flex items-center gap-1.5 text-red-400">
                            <AlertTriangle className="h-3 w-3" />
                            Auth failed (401)
                        </span>
                    )}
                </div>
            </CardContent>
            <CardFooter className="pt-0 gap-2">
                <Button variant="outline" size="sm" className="flex-1 h-8 text-xs bg-zinc-900 border-zinc-800 hover:bg-zinc-800" onClick={onConfigure}>
                    <Settings className="h-3 w-3 mr-2" />
                    Config
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 h-8 text-xs bg-zinc-900 border-zinc-800 hover:bg-zinc-800 disabled:opacity-50"
                    onClick={onSync}
                    disabled={status === 'NOT_CONFIGURED' || status === 'DISABLED' || loading}
                >
                    <RefreshCw className={`h-3 w-3 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Sync
                </Button>
            </CardFooter>
        </Card>
    );
}
