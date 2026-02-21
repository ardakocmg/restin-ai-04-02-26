import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    RefreshCw, Settings, CheckCircle, AlertTriangle, Clock,
    ExternalLink, User, Globe, Loader2
} from 'lucide-react';

interface ProviderCardProps {
    provider: string;
    label: string;
    description: string;
    icon: React.ElementType;
    status: 'CONNECTED' | 'ERROR' | 'DISABLED' | 'NOT_CONFIGURED';
    lastSync: string | null;
    configuredAt: string | null;
    configuredBy: string | null;
    configSummary?: Record<string, unknown>;
    onSync: () => void;
    onConfigure: () => void;
    loading?: boolean;
    appLink?: string;
    appLabel?: string;
    portalUrl?: string;
    portalLabel?: string;
    accentColor?: string;
}

function timeAgo(dateStr: string): string {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now.getTime() - date.getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    return date.toLocaleDateString();
}

export function ProviderCard({
    provider, label, description, icon: Icon,
    status, lastSync, configuredAt, configuredBy, configSummary,
    onSync, onConfigure, loading, appLink, appLabel,
    portalUrl, portalLabel, accentColor
}: ProviderCardProps) {
    const navigate = useNavigate();

    const isConfigured = status === 'CONNECTED' || status === 'ERROR' || status === 'DISABLED';

    const statusStyles: Record<string, { border: string; badge: string; badgeText: string; dot: string; label: string }> = {
        CONNECTED: { border: 'border-emerald-500/20', badge: 'border-emerald-900 text-emerald-400 bg-emerald-950/30', badgeText: 'Connected', dot: 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]', label: 'text-emerald-400' },
        ERROR: { border: 'border-red-500/20', badge: 'border-red-900 text-red-400 bg-red-950/30', badgeText: 'Error', dot: 'bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.6)]', label: 'text-red-400' },
        DISABLED: { border: 'border-border', badge: 'border-border text-muted-foreground bg-card/50', badgeText: 'Disabled', dot: 'bg-zinc-600', label: 'text-muted-foreground' },
        NOT_CONFIGURED: { border: 'border-border', badge: 'border-border text-muted-foreground bg-card/30', badgeText: 'Not Configured', dot: 'bg-zinc-700', label: 'text-muted-foreground' },
    };

    const s = statusStyles[status] || statusStyles.NOT_CONFIGURED;

    // Build config summary text
    const summaryItems: string[] = [];
    if (configSummary) {
        for (const [k, v] of Object.entries(configSummary)) {
            if (v && typeof v === 'string' && !v.includes('••••')) {
                summaryItems.push(`${k.replace(/_/g, ' ')}: ${v}`);
            } else if (v && typeof v === 'number') {
                summaryItems.push(`${k.replace(/_/g, ' ')}: ${v}`);
            }
        }
    }

    return (
        <Card className={`bg-background/80 ${s.border} flex flex-col transition-all duration-300 hover:border-zinc-600 hover:shadow-lg hover:shadow-black/20 group relative overflow-hidden`}>
            {/* Accent top bar for connected */}
            {status === 'CONNECTED' && (
                <div
                    className="absolute top-0 left-0 right-0 h-0.5"
                    style={{ background: accentColor ? `${accentColor}` : 'linear-gradient(90deg, #10b981, #059669)' }} /* keep-inline */
                />
            )}

            <CardHeader className="pb-2 space-y-2">
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                        <div
                            className="p-2.5 rounded-xl border transition-colors"
                            style={{ /* keep-inline */
                                borderColor: accentColor ? `${accentColor}30` : status === 'CONNECTED' ? '#10b98130' : '#27272a',
                                backgroundColor: accentColor ? `${accentColor}08` : status === 'CONNECTED' ? '#10b98108' : '#18181b',
                                color: accentColor || (status === 'CONNECTED' ? '#10b981' : '#71717a'),
                            }}
                        >
                            <Icon className="h-5 w-5" />
                        </div>
                        <div>
                            <CardTitle className="text-sm font-semibold text-foreground leading-tight">{label}</CardTitle>
                            <CardDescription className="text-[11px] text-muted-foreground mt-0.5 leading-tight">{description}</CardDescription>
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className={`h-2 w-2 rounded-full ${s.dot}`} />
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-5 ${s.badge}`}>
                            {s.badgeText}
                        </Badge>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="flex-1 pb-3 pt-0 space-y-2">
                {/* Config summary */}
                {summaryItems.length > 0 && (
                    <div className="text-[11px] text-muted-foreground bg-card/50 rounded-lg px-3 py-2 border border-border/50 space-y-0.5">
                        {summaryItems.slice(0, 3).map((item, i) => (
                            <div key={i} className="truncate">{item}</div>
                        ))}
                    </div>
                )}

                {/* Audit info */}
                <div className="text-[11px] text-muted-foreground space-y-1">
                    <div className="flex items-center gap-1.5">
                        <Clock className="h-3 w-3 flex-shrink-0" />
                        <span>Last sync: {lastSync ? timeAgo(lastSync) : 'Never'}</span>
                    </div>
                    {configuredAt && (
                        <div className="flex items-center gap-1.5">
                            <CheckCircle className="h-3 w-3 flex-shrink-0 text-emerald-500/60" />
                            <span>Configured: {timeAgo(configuredAt)}</span>
                        </div>
                    )}
                    {configuredBy && (
                        <div className="flex items-center gap-1.5">
                            <User className="h-3 w-3 flex-shrink-0 text-blue-400/60" />
                            <span>by {configuredBy}</span>
                        </div>
                    )}
                    {status === 'ERROR' && (
                        <div className="flex items-center gap-1.5 text-red-400">
                            <AlertTriangle className="h-3 w-3 flex-shrink-0" />
                            <span>Authentication failed (401)</span>
                        </div>
                    )}
                </div>
            </CardContent>

            <CardFooter className="pt-0 flex-col gap-1.5">
                {/* Primary actions */}
                <div className="flex gap-1.5 w-full">
                    <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 h-8 text-[11px] bg-card border-border text-secondary-foreground hover:bg-secondary hover:text-foreground"
                        onClick={onConfigure}
                    >
                        <Settings className="h-3 w-3 mr-1.5" />
                        Configure
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 h-8 text-[11px] bg-card border-border text-secondary-foreground hover:bg-secondary hover:text-foreground disabled:opacity-40"
                        onClick={onSync}
                        disabled={!isConfigured || loading}
                    >
                        {loading ? (
                            <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                        ) : (
                            <RefreshCw className="h-3 w-3 mr-1.5" />
                        )}
                        Sync
                    </Button>
                </div>

                {/* App deep-link */}
                {appLink && isConfigured && (
                    <Button
                        size="sm"
                        className="w-full h-7 text-[11px] bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-foreground border-0"
                        onClick={() => navigate(appLink)}
                    >
                        <ExternalLink className="h-3 w-3 mr-1.5" />
                        {appLabel || 'Open App'}
                    </Button>
                )}

                {/* Portal link — "Get API Key" */}
                {portalUrl && (
                    <a
                        href={portalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full flex items-center justify-center gap-1.5 h-7 text-[11px] text-muted-foreground hover:text-blue-400 transition-colors rounded-md hover:bg-blue-400/5"
                    >
                        <Globe className="h-3 w-3" />
                        {portalLabel || 'Get API Key →'}
                    </a>
                )}
            </CardFooter>
        </Card>
    );
}
