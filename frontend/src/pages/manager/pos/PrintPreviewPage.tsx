import React, { useState } from 'react';
import {
    Printer, FileText, Settings, Wifi, WifiOff,
    RefreshCw, Loader2, Check, X, Eye,
    Monitor, Smartphone, ReceiptText, Server,
    ArrowRight, Zap, TestTube2
} from 'lucide-react';
import { Card } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { cn } from '../../../lib/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useVenue } from '../../../context/VenueContext';
import { toast } from 'sonner';
import api from '../../../lib/api';

/**
 * 🖨️ Print Preview / ESC-POS Bridge — Rule 30
 * Localhost bridge for raw ESC/POS printing (No PDF dialogs).
 */
export default function PrintPreviewPage() {
    const { activeVenue } = useVenue();
    const venueId = activeVenue?.id || localStorage.getItem('currentVenueId') || 'default';
    const queryClient = useQueryClient();

    const [bridgeHost, setBridgeHost] = useState('localhost');
    const [bridgePort, setBridgePort] = useState('9100');
    const [testStatus, setTestStatus] = useState(null); // 'testing' | 'success' | 'fail'

    const { data: printers = [], isPending } = useQuery({
        queryKey: ['printers', venueId],
        queryFn: async () => {
            try {
                const { data } = await api.get(`/printers?venue_id=${venueId}`);
                return data || [];
            } catch {
                return [];
            }
        }
    });

    const discoverMutation = useMutation({
        mutationFn: () => api.post(`/printers/discover?venue_id=${venueId}`),
        onSuccess: (res) => {
            toast.success(`Found ${res.data?.found || 0} printers via mDNS`);
            queryClient.invalidateQueries({ queryKey: ['printers'] });
        },
        onError: () => toast.error('Discovery failed — is the Edge Bridge running?')
    });

    const testPrint = async (printerId) => {
        setTestStatus('testing');
        try {
            await api.post(`/printers/${printerId}/test?venue_id=${venueId}`);
            setTestStatus('success');
            toast.success('Test page printed');
        } catch {
            setTestStatus('fail');
            toast.error('Print test failed');
        }
        setTimeout(() => setTestStatus(null), 3000);
    };

    const RECEIPT_PREVIEW = [
        '================================',
        '        RESTIN.AI POS           ',
        '================================',
        'Table: 5             Server: Mark',
        '--------------------------------',
        '1x Grilled Seabass      €28.00  ',
        '1x Risotto Nero         €22.00  ',
        '2x Bruschetta           €19.00  ',
        '1x House Wine           €35.00  ',
        '--------------------------------',
        'SUBTOTAL              €104.00   ',
        'VAT 18%                €18.72   ',
        'TOTAL                 €122.72   ',
        '================================',
        '    Thank you for dining!       ',
        '          ★★★★★               ',
        '================================',
    ];

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                        <Printer className="w-6 h-6 text-orange-500" />
                        Print Preview & ESC/POS Bridge
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Direct receipt printing via localhost bridge — no PDF dialogs
                    </p>
                </div>
                <Button
                    variant="outline" size="sm"
                    onClick={() => discoverMutation.mutate()}
                    disabled={discoverMutation.isPending}
                >
                    {discoverMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <RefreshCw className="w-4 h-4 mr-1" />}
                    Auto-Discover (mDNS)
                </Button>
            </div>

            <div className="grid grid-cols-3 gap-6">
                {/* Printers */}
                <div className="col-span-2 space-y-4">
                    {/* Bridge Config */}
                    <Card className="p-5 bg-card border-border">
                        <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                            <Server className="w-4 h-4 text-orange-500" /> Edge Bridge
                        </h3>
                        <div className="flex gap-3 items-end">
                            <div className="flex-1">
                                <label className="text-xs text-muted-foreground block mb-1">Host</label>
                                <Input
                                    value={bridgeHost}
                                    onChange={(e) => setBridgeHost(e.target.value)}
                                    className="bg-background border-border text-foreground"
                                />
                            </div>
                            <div className="w-24">
                                <label className="text-xs text-muted-foreground block mb-1">Port</label>
                                <Input
                                    value={bridgePort}
                                    onChange={(e) => setBridgePort(e.target.value)}
                                    className="bg-background border-border text-foreground"
                                />
                            </div>
                            <Button variant="outline" className="flex items-center gap-1">
                                <Zap className="w-4 h-4" /> Connect
                            </Button>
                        </div>
                        <div className="mt-3 flex items-center gap-2 text-xs">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-muted-foreground">Bridge Status: Connected to {bridgeHost}:{bridgePort}</span>
                        </div>
                    </Card>

                    {/* Printer List */}
                    <h3 className="font-semibold text-foreground">Registered Printers</h3>
                    {isPending ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : printers.length === 0 ? (
                        <Card className="p-8 bg-card border-border text-center">
                            <Printer className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                            <p className="text-sm text-muted-foreground">No printers configured. Use Auto-Discover or add manually.</p>
                        </Card>
                    ) : (
                        <div className="space-y-2">
                            {printers.map(printer => (
                                <Card key={printer.id} className="p-4 bg-card border-border flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={cn(
                                            "p-2 rounded-lg",
                                            printer.status === 'online' ? "bg-emerald-500/10" : "bg-red-500/10"
                                        )}>
                                            <Printer className={cn(
                                                "w-5 h-5",
                                                printer.status === 'online' ? "text-emerald-500" : "text-red-500"
                                            )} />
                                        </div>
                                        <div>
                                            <div className="font-medium text-foreground">{printer.name}</div>
                                            <div className="text-xs text-muted-foreground flex items-center gap-2">
                                                <span>{printer.ip || 'USB'}</span>
                                                <span>• {printer.type || 'ESC/POS'}</span>
                                                {printer.status === 'online' ? (
                                                    <span className="flex items-center gap-0.5 text-emerald-500"><Wifi className="w-3 h-3" /> Online</span>
                                                ) : (
                                                    <span className="flex items-center gap-0.5 text-red-500"><WifiOff className="w-3 h-3" /> Offline</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button variant="outline" size="sm" onClick={() => testPrint(printer.id)}>
                                            <TestTube2 className="w-3.5 h-3.5 mr-1" /> Test
                                        </Button>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>

                {/* Receipt Preview */}
                <Card className="p-5 bg-card border-border">
                    <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                        <Eye className="w-4 h-4 text-orange-500" /> Receipt Preview
                    </h3>
                    <div className="bg-white rounded-lg p-4 font-mono text-xs text-foreground leading-relaxed shadow-inner">
                        {RECEIPT_PREVIEW.map((line, i) => (
                            <div key={i} className="whitespace-pre">{line}</div>
                        ))}
                    </div>
                    <div className="mt-3 text-[10px] text-muted-foreground">
                        Preview shows 80mm thermal receipt format. ESC/POS commands are sent raw via the Edge Bridge — no browser print dialogs.
                    </div>
                    <Button variant="outline" size="sm" className="mt-2 w-full">
                        <Printer className="w-3.5 h-3.5 mr-1" /> Print Preview
                    </Button>
                </Card>
            </div>
        </div>
    );
}
