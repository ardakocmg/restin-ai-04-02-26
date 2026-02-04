'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import PageContainer from '@/components/layout/PageContainer';
import { Card, CardContent } from '@antigravity/ui';
import { Factory, ClipboardList, Package } from 'lucide-react';
import { Button } from '@antigravity/ui';

export default function CentralKitchenHub() {
    const router = useRouter();

    const MODULES = [
        { title: 'Production Batches', desc: 'Manage massive cooking runs', icon: Factory, path: '/dashboard/central-kitchen/batches', color: 'text-orange-500' },
        { title: 'Internal Orders', desc: 'Requests from outlet venues', icon: ClipboardList, path: '/dashboard/central-kitchen/orders', color: 'text-blue-500' },
    ];

    return (
        <PageContainer title="Central Kitchen" description="Production & Distribution Management">
            <div className="grid gap-6">
                <div className="grid md:grid-cols-2 gap-4">
                    {MODULES.map((mod, i) => {
                        const Icon = mod.icon;
                        return (
                            <button
                                key={i}
                                onClick={() => router.push(mod.path)}
                                className="text-left group"
                            >
                                <Card className="border-zinc-800 bg-zinc-900/50 hover:border-blue-500/50 transition-colors h-full">
                                    <CardContent className="p-6 flex items-start gap-4">
                                        <div className="h-12 w-12 rounded-xl bg-zinc-800 flex items-center justify-center group-hover:bg-zinc-700 transition-colors">
                                            <Icon className={`h-6 w-6 ${mod.color}`} />
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-bold text-white text-lg group-hover:text-blue-400 transition-colors">{mod.title}</h3>
                                            <p className="text-zinc-400 mt-1">{mod.desc}</p>
                                        </div>
                                    </CardContent>
                                </Card>
                            </button>
                        )
                    })}
                </div>

                <div className="border-t border-zinc-800 pt-6">
                    <h3 className="text-lg font-bold text-white mb-4">Stock Overview</h3>
                    <div className="grid md:grid-cols-3 gap-4">
                        <Card className="border-zinc-800 bg-zinc-900/50">
                            <CardContent className="p-4 flex items-center gap-3">
                                <Package className="h-5 w-5 text-zinc-500" />
                                <div>
                                    <p className="text-xs text-zinc-500 uppercase">Sauce (Base)</p>
                                    <p className="text-xl font-mono text-white">450 L</p>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="border-zinc-800 bg-zinc-900/50">
                            <CardContent className="p-4 flex items-center gap-3">
                                <Package className="h-5 w-5 text-zinc-500" />
                                <div>
                                    <p className="text-xs text-zinc-500 uppercase">Dough Balls</p>
                                    <p className="text-xl font-mono text-white">1,200 Units</p>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="border-zinc-800 bg-zinc-900/50">
                            <CardContent className="p-4 flex items-center gap-3">
                                <Package className="h-5 w-5 text-zinc-500" />
                                <div>
                                    <p className="text-xs text-zinc-500 uppercase">Soup (Frozen)</p>
                                    <p className="text-xl font-mono text-white">80 KG</p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </PageContainer>
    );
}
