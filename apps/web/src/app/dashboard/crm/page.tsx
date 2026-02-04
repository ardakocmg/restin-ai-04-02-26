'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import PageContainer from '@/components/layout/PageContainer';
import { Card, CardContent } from '@antigravity/ui';
import { Users, Star, Heart, Calendar } from 'lucide-react';

export default function CRMHub() {
    const router = useRouter();
    const [stats, setStats] = useState({ guests: 1250, vip: 45, loyalty: '32%', new: 120 });

    return (
        <PageContainer title="Guest CRM" description="Manage relationships and loyalty">
            <div className="space-y-6">
                {/* Quick Stats Replica from CRM.js */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {[
                        { label: 'Total Guests', value: stats.guests, icon: Users, color: 'text-blue-500' },
                        { label: 'VIP Members', value: stats.vip, icon: Star, color: 'text-yellow-500' },
                        { label: 'Loyalty', value: stats.loyalty, icon: Heart, color: 'text-red-500' },
                        { label: 'New this Month', value: stats.new, icon: Calendar, color: 'text-green-500' }
                    ].map((m, i) => {
                        const Icon = m.icon;
                        return (
                            <Card key={i} className="bg-zinc-900/50 border-zinc-800">
                                <CardContent className="p-4 flex items-center justify-between">
                                    <div>
                                        <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{m.label}</p>
                                        <p className="text-2xl font-black text-white">{m.value}</p>
                                    </div>
                                    <Icon className={`w-8 h-8 ${m.color} opacity-20`} />
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                    <button onClick={() => router.push('/dashboard/crm/guests')} className="text-left group">
                        <Card className="border-zinc-800 bg-zinc-900/50 hover:border-blue-500/50 transition-colors h-full">
                            <CardContent className="p-6 flex items-start gap-4">
                                <div className="h-12 w-12 rounded-xl bg-blue-900/20 flex items-center justify-center text-blue-500 group-hover:bg-blue-900/40 transition-colors">
                                    <Users className="h-6 w-6" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-bold text-white text-lg group-hover:text-blue-400 transition-colors">Guest Directory</h3>
                                    <p className="text-zinc-400 mt-1">Full database search and profiles.</p>
                                </div>
                            </CardContent>
                        </Card>
                    </button>
                    <button onClick={() => router.push('/dashboard/crm/loyalty')} className="text-left group">
                        <Card className="border-zinc-800 bg-zinc-900/50 hover:border-red-500/50 transition-colors h-full">
                            <CardContent className="p-6 flex items-start gap-4">
                                <div className="h-12 w-12 rounded-xl bg-red-900/20 flex items-center justify-center text-red-500 group-hover:bg-red-900/40 transition-colors">
                                    <Heart className="h-6 w-6" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-bold text-white text-lg group-hover:text-red-400 transition-colors">Loyalty Program</h3>
                                    <p className="text-zinc-400 mt-1">Configure tiers and rewards.</p>
                                </div>
                            </CardContent>
                        </Card>
                    </button>
                </div>
            </div>
        </PageContainer>
    );
}
