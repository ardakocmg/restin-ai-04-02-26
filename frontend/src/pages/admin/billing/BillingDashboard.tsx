import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreditCard, DollarSign, Zap, Server, Activity, ArrowUpRight } from 'lucide-react';
import { toast } from "sonner";
import api from '@/lib/api';
import { useAuth } from '@/features/auth/AuthContext';

// Explicitly type the Switch component if it's missing types
const TypedSwitch = Switch as React.ComponentType<{
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
    disabled?: boolean;
    className?: string;
}>;

interface UsageData {
    ai_cost: number;
    storage_cost: number;
}

interface PlanData {
    name: string;
    price: number;
}

interface ModuleData {
    active: string[];
    price: number;
}

interface InvoiceData {
    period: string;
    plan: PlanData;
    modules: ModuleData;
    usage: UsageData;
    total_estimated: number;
    currency: string;
}

export default function BillingDashboard() {
    const { user } = useAuth();
    const [invoice, setInvoice] = useState<InvoiceData | null>(null);
    const [loading, setLoading] = useState(true);
    const [toggling, setToggling] = useState<string | null>(null);

    // Use organizationId if available, otherwise fall back to venueId (often synonymous in single-tenant context)
    const venueId = user?.organizationId || user?.venueId || '';

    useEffect(() => {
        if (venueId) {
            fetchBilling();
        }
    }, [venueId]);

    const fetchBilling = async () => {
        try {
            const res = await api.get(`/billing/current?venue_id=${venueId}`);
            setInvoice(res.data);
        } catch (error) {
            console.error("Failed to fetch billing:", error);
            // toast.error("Could not load billing data");
        } finally {
            setLoading(false);
        }
    };

    const toggleModule = async (moduleName: string, key: string, enabled: boolean) => {
        setToggling(key);
        try {
            await api.post(`/billing/modules?venue_id=${venueId}&module=${key}&enabled=${enabled}`);
            toast.success(`${moduleName} ${enabled ? 'enabled' : 'disabled'}`);
            fetchBilling(); // Refresh estimates
        } catch (error) {
            toast.error("Failed to update module");
        } finally {
            setToggling(null);
        }
    };

    if (loading) {
        return <div className="p-8 text-zinc-400">Loading financial data...</div>;
    }

    if (!invoice) {
        return <div className="p-8 text-zinc-400">Billing information unavailable.</div>;
    }

    const { plan, modules, usage, total_estimated, currency } = invoice;
    const isModuleActive = (name: string) => modules.active.includes(name);

    return (
        <div className="space-y-8 p-8 max-w-7xl mx-auto">
            <div>
                <h1 className="text-3xl font-bold text-zinc-100 flex items-center gap-3">
                    <CreditCard className="h-8 w-8 text-emerald-500" />
                    Commercial Engine
                </h1>
                <p className="text-zinc-400 mt-2">Manage your subscription, active modules, and usage-based costs.</p>
            </div>

            {/* Top Stats Row */}
            <div className="grid gap-6 md:grid-cols-3">
                <Card className="bg-zinc-950 border-zinc-800">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-zinc-400">Current Plan</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-zinc-100">{plan.name.toUpperCase()}</div>
                        <p className="text-xs text-zinc-500 mt-1">
                            Base: {currency} {plan.price.toFixed(2)} / month
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-zinc-950 border-zinc-800">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-zinc-400">Estimated Bill (This Month)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-emerald-400 flex items-baseline gap-1">
                            {currency} {total_estimated.toFixed(2)}
                            <span className="text-xs font-normal text-zinc-500 ml-2">excl. VAT</span>
                        </div>
                        <p className="text-xs text-zinc-500 mt-1">
                            Resets on {new Date().getFullYear()}-{new Date().getMonth() + 2}-01
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-zinc-950 border-zinc-800">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-zinc-400">AI Usage Cost</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-400">
                            {currency} {usage.ai_cost.toFixed(2)}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-[10px] border-blue-900 text-blue-400 bg-blue-950/30">
                                Pay-as-you-go
                            </Badge>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Main Content Areas */}
            <div className="grid gap-6 md:grid-cols-2">

                {/* Cost Breakdown */}
                <Card className="bg-zinc-950 border-zinc-800 h-full">
                    <CardHeader>
                        <CardTitle className="text-zinc-100 flex items-center gap-2">
                            <DollarSign className="h-5 w-5 text-zinc-400" />
                            Cost Breakdown
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex justify-between items-center py-2 border-b border-zinc-800">
                            <span className="text-zinc-400">Base Subscription</span>
                            <span className="text-zinc-200 font-mono">{currency} {plan.price.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-zinc-800">
                            <span className="text-zinc-400">Active Modules ({modules.active.length})</span>
                            <span className="text-zinc-200 font-mono">{currency} {modules.price.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-zinc-800">
                            <span className="text-zinc-400">AI Token Usage</span>
                            <span className="text-zinc-200 font-mono">{currency} {usage.ai_cost.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-zinc-800">
                            <span className="text-zinc-400">Cloud Storage</span>
                            <span className="text-zinc-200 font-mono">{currency} {usage.storage_cost.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center pt-4">
                            <span className="text-emerald-400 font-bold">Total Estimated</span>
                            <span className="text-emerald-400 font-bold font-mono text-lg">{currency} {total_estimated.toFixed(2)}</span>
                        </div>
                    </CardContent>
                </Card>

                {/* Module Management */}
                <Card className="bg-zinc-950 border-zinc-800 h-full">
                    <CardHeader>
                        <CardTitle className="text-zinc-100 flex items-center gap-2">
                            <Zap className="h-5 w-5 text-amber-400" />
                            Active Modules
                        </CardTitle>
                        <CardDescription className="text-zinc-400">
                            Enable or disable powerful AI features. Changes apply immediately.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Voice AI */}
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <label className="text-base font-medium text-zinc-200">Voice AI Receptionist</label>
                                <p className="text-sm text-zinc-500">24/7 Phone answering & reservations</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-sm text-zinc-400 font-mono">€50/mo</span>
                                <TypedSwitch
                                    checked={isModuleActive('Voice AI')}
                                    disabled={toggling === 'hasVoice'}
                                    onCheckedChange={(c) => toggleModule('Voice AI', 'hasVoice', c)}
                                />
                            </div>
                        </div>

                        {/* Market Radar */}
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <label className="text-base font-medium text-zinc-200">Market Radar</label>
                                <p className="text-sm text-zinc-500">Competitor price tracking & alerts</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-sm text-zinc-400 font-mono">€30/mo</span>
                                <TypedSwitch
                                    checked={isModuleActive('Market Radar')}
                                    disabled={toggling === 'hasRadar'}
                                    onCheckedChange={(c) => toggleModule('Market Radar', 'hasRadar', c)}
                                />
                            </div>
                        </div>

                        {/* Content Studio */}
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <label className="text-base font-medium text-zinc-200">Content Studio</label>
                                <p className="text-sm text-zinc-500">AI-generated food photography & posts</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-sm text-zinc-400 font-mono">€20/mo</span>
                                <TypedSwitch
                                    checked={isModuleActive('Content Studio')}
                                    disabled={toggling === 'hasStudio'}
                                    onCheckedChange={(c) => toggleModule('Content Studio', 'hasStudio', c)}
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
