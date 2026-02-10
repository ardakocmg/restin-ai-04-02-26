import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefreshCw, Database, Server, Smartphone, ShoppingCart, Users, Cloud } from 'lucide-react';
import { toast } from "sonner";
import api from '@/lib/api';

import { ProviderCard } from './components/ProviderCard';

// Stub Data for MVP
const PROVIDERS = [
    { key: 'LIGHTSPEED', label: 'Lightspeed K-Series', desc: 'POS Orders, Menu, Shifts', icon: ShoppingCart },
    { key: 'SHIREBURN', label: 'Shireburn Indigo', desc: 'HR, Payroll, Leave', icon: Users },
    { key: 'APICBASE', label: 'Apicbase', desc: 'Inventory, Recipes, Stock', icon: Database },
    { key: 'GOOGLE', label: 'Google Business', desc: 'Maps, Reservations, Reviews', icon: Cloud },
    { key: 'NUKI', label: 'Nuki Smart Lock', desc: 'Door Access, Keypad Codes', icon: Server },
    { key: 'TUYA', label: 'Tuya Smart Life', desc: 'Lights, Switches, Climate', icon: Smartphone },
    { key: 'MEROSS', label: 'Meross IoT', desc: 'Plugs, Garage Doors', icon: Smartphone },
    { key: 'QINGPING', label: 'Qingping Sensors', desc: 'Temp & Humidity Monitoring', icon: Smartphone },
];

export default function SyncDashboard() {
    const [configs, setConfigs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState<string | null>(null);

    useEffect(() => {
        fetchConfigs();
    }, []);

    const fetchConfigs = async () => {
        try {
            const res = await api.get('/integrations/');
            setConfigs(res.data);
        } catch (error) {
            console.error("Failed to load integrations", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSync = async (provider: string) => {
        setSyncing(provider);
        toast.info(`Starting sync for ${provider}...`);
        try {
            await api.post(`/integrations/${provider}/sync`);
            toast.success("Sync job started");
        } catch (error) {
            toast.error("Failed to start sync");
        } finally {
            setSyncing(null);
        }
    };

    const handleConfigure = (provider: string) => {
        toast.info("Configuration modal coming soon");
    };

    const getConfig = (provider: string) => configs.find(c => c.provider === provider);

    return (
        <div className="space-y-6 p-8 max-w-[1600px] mx-auto">
            <div>
                <h1 className="text-3xl font-bold text-zinc-100 flex items-center gap-3">
                    <RefreshCw className="h-8 w-8 text-blue-500" />
                    Integration Control Plane
                </h1>
                <p className="text-zinc-400 mt-2">
                    Manage external connections, synchronization policies, and real-time device status.
                </p>
            </div>

            <Tabs defaultValue="overview" className="space-y-6">
                <TabsList className="bg-zinc-900 border border-zinc-800">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="runs">Sync History</TabsTrigger>
                    <TabsTrigger value="settings">Global Policies</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {PROVIDERS.map(p => {
                            const config = getConfig(p.key);
                            return (
                                <ProviderCard
                                    key={p.key}
                                    provider={p.key}
                                    label={p.label}
                                    description={p.desc}
                                    icon={p.icon}
                                    status={config ? config.status : 'NOT_CONFIGURED'}
                                    lastSync={config ? config.last_sync : null}
                                    loading={syncing === p.key}
                                    onSync={() => handleSync(p.key)}
                                    onConfigure={() => handleConfigure(p.key)}
                                />
                            );
                        })}
                    </div>
                </TabsContent>

                <TabsContent value="runs">
                    <Card className="bg-zinc-950 border-zinc-800">
                        <CardHeader>
                            <CardTitle className="text-zinc-100">Sync Execution Logs</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-sm text-zinc-500 p-8 text-center border border-dashed border-zinc-800 rounded-md">
                                No sync history available yet.
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
