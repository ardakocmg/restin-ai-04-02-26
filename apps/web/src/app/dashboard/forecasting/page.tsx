'use client';

import React, { useState } from 'react';
import PageContainer from '@/components/layout/PageContainer';
import { Card, CardContent } from '@antigravity/ui';
import { TrendingUp, BarChart, Calendar, ChevronRight } from 'lucide-react';
import { Button } from '@antigravity/ui';
import { useRouter } from 'next/navigation';

export default function ForecastingHub() {
    const router = useRouter();
    const [stats, setStats] = useState({
        active_forecasts: 12,
        accuracy: 87,
        items_tracked: 42
    });

    return (
        <PageContainer title="Demand Forecasting" description="AI-powered demand predictions">
            <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-3">
                    <Card className="border-blue-500/20 bg-blue-900/10"><CardContent className="p-6">
                        <div className="flex justify-between items-center">
                            <div>
                                <p className="text-sm text-blue-400 font-bold uppercase tracking-widest">Active Forecasts</p>
                                <p className="text-3xl text-white font-black">{stats.active_forecasts}</p>
                            </div>
                            <TrendingUp className="h-8 w-8 text-blue-500" />
                        </div>
                    </CardContent></Card>
                    <Card className="border-green-500/20 bg-green-900/10"><CardContent className="p-6">
                        <div className="flex justify-between items-center">
                            <div>
                                <p className="text-sm text-green-400 font-bold uppercase tracking-widest">Accuracy</p>
                                <p className="text-3xl text-white font-black">{stats.accuracy}%</p>
                            </div>
                            <BarChart className="h-8 w-8 text-green-500" />
                        </div>
                    </CardContent></Card>
                    <Card className="border-purple-500/20 bg-purple-900/10"><CardContent className="p-6">
                        <div className="flex justify-between items-center">
                            <div>
                                <p className="text-sm text-purple-400 font-bold uppercase tracking-widest">Items Tracked</p>
                                <p className="text-3xl text-white font-black">{stats.items_tracked}</p>
                            </div>
                            <TrendingUp className="h-8 w-8 text-purple-500" />
                        </div>
                    </CardContent></Card>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                    <button onClick={() => router.push('/dashboard/forecasting/seasonal')} className="text-left group">
                        <Card className="border-zinc-800 bg-zinc-900/50 hover:border-blue-500/50 transition-colors h-full">
                            <CardContent className="p-6 flex items-start gap-4">
                                <div className="h-12 w-12 rounded-xl bg-indigo-900/20 flex items-center justify-center text-indigo-500 group-hover:bg-indigo-900/40 transition-colors">
                                    <Calendar className="h-6 w-6" />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center justify-between">
                                        <h3 className="font-bold text-white group-hover:text-blue-400 transition-colors">Seasonal Patterns</h3>
                                        <ChevronRight className="h-5 w-5 text-zinc-600" />
                                    </div>
                                    <p className="text-sm text-zinc-400 mt-1">Analyze recurring demand spikes (e.g. Holidays, Weekends) to optimize stock levels.</p>
                                </div>
                            </CardContent>
                        </Card>
                    </button>
                </div>

                <div className="border-t border-zinc-800 pt-6">
                    <h3 className="text-lg font-bold text-white mb-4">Recent Predictions</h3>
                    <div className="grid gap-4">
                        {/* Mock Forecast Item */}
                        <Card className="border-zinc-800 bg-zinc-900/50">
                            <CardContent className="p-6">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h4 className="font-bold text-white text-lg">Ribeye Steak (300g)</h4>
                                        <p className="text-sm text-zinc-400">Forecast Method: <span className="text-blue-400">Ensemble (AI + Moving Avg)</span></p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-zinc-500 uppercase tracking-widest">Recommended Order</p>
                                        <p className="text-2xl font-mono text-green-400 font-bold">45 KG</p>
                                    </div>
                                </div>
                                <div className="mt-4 h-24 bg-zinc-950 rounded border border-zinc-800 flex items-end justify-between p-2 gap-1">
                                    {/* Fake Chart Bars */}
                                    {[20, 35, 40, 60, 45, 30, 25, 30, 45, 55, 65, 50].map((h, i) => (
                                        <div key={i} className="bg-blue-600/50 hover:bg-blue-500 w-full rounded-t" style={{ height: `${h}%` }}></div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </PageContainer>
    );
}
