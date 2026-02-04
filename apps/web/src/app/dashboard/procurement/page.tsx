'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PageContainer from '@/components/layout/PageContainer';
import { Card, CardContent } from '@antigravity/ui';
import { ShoppingCart, FileText, TrendingUp, Settings, CheckCircle } from 'lucide-react';

const PROCUREMENT_MODULES = [
    { key: 'rfq', title: 'RFQ Management', desc: 'Request for Quotation workflow', icon: FileText, path: '/dashboard/procurement/rfq', color: 'text-blue-500' },
    { key: 'approval', title: 'Approval Workflow', desc: 'Configure approval rules', icon: CheckCircle, path: '/dashboard/procurement/approval', color: 'text-green-500' },
    { key: 'auto-order', title: 'Auto-Ordering', desc: 'Automatic reorder rules', icon: Settings, path: '/dashboard/procurement/auto-order', color: 'text-purple-500' },
    { key: 'analytics', title: 'Supplier Analytics', desc: 'Performance & insights', icon: TrendingUp, path: '/dashboard/procurement/analytics', color: 'text-orange-500' }
];

export default function ProcurementHub() {
    const router = useRouter();
    const [stats, setStats] = useState({ rfqs: 0, pending: 0, approved: 0, suppliers: 0 });

    useEffect(() => {
        // Mock stats
        setStats({ rfqs: 12, pending: 3, approved: 8, suppliers: 24 });
    }, []);

    return (
        <PageContainer title="Procurement & Sourcing" description="Advanced procurement management">
            <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-4">
                    <Card className="border-blue-500/20 bg-blue-950/30">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-zinc-400">Active RFQs</p>
                                    <p className="text-2xl font-bold text-blue-50">{stats.rfqs}</p>
                                </div>
                                <ShoppingCart className="h-8 w-8 text-blue-400" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <Card className="border-zinc-800 bg-zinc-900/50">
                    <CardContent className="p-6">
                        <h3 className="text-lg font-semibold text-white mb-4">Procurement Modules</h3>
                        <div className="grid gap-4 md:grid-cols-2">
                            {PROCUREMENT_MODULES.map((module) => {
                                const Icon = module.icon;
                                return (
                                    <button
                                        key={module.key}
                                        onClick={() => router.push(module.path)}
                                        className="flex items-start gap-4 rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-left transition hover:border-blue-500/50 hover:bg-zinc-800/80 group"
                                    >
                                        <div className="p-2 rounded-lg bg-zinc-950 border border-zinc-800 group-hover:border-blue-500/30">
                                            <Icon className={`h-6 w-6 ${module.color}`} />
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-semibold text-white">{module.title}</p>
                                            <p className="text-sm text-zinc-400">{module.desc}</p>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </PageContainer>
    );
}
