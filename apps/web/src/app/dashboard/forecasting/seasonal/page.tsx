'use client';

import React from 'react';
import PageContainer from '@/components/layout/PageContainer';
import { Card, CardContent } from '@antigravity/ui';
import { Badge } from '@antigravity/ui';
import { Calendar, TrendingUp } from 'lucide-react';

const PATTERNS = [
    { id: 1, name: 'Friday Dinner Rush', items: 12, multiplier: 1.5, type: 'weekly' },
    { id: 2, name: 'Valentine\'s Day', items: 45, multiplier: 3.2, type: 'annual' },
    { id: 3, name: 'Summer Season', items: 120, multiplier: 1.2, type: 'seasonal' },
];

export default function SeasonalPatternsPage() {
    return (
        <PageContainer title="Seasonal Patterns" description="Demand multipliers based on time and events">
            <div className="space-y-4">
                {PATTERNS.map(pattern => (
                    <Card key={pattern.id} className="border-zinc-800 bg-zinc-900/50">
                        <CardContent className="p-6">
                            <div className="flex items-start gap-4">
                                <div className="h-12 w-12 rounded-xl bg-purple-900/20 flex items-center justify-center text-purple-500 shrink-0">
                                    <Calendar className="h-6 w-6" />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <h3 className="font-bold text-white text-lg">{pattern.name}</h3>
                                            <Badge variant="secondary" className="mt-1">{pattern.type.toUpperCase()}</Badge>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-xs text-zinc-500 uppercase tracking-widest">Multiplier</div>
                                            <div className="text-2xl font-mono text-green-400 font-bold flex items-center justify-end gap-1">
                                                <TrendingUp className="h-4 w-4" /> {pattern.multiplier}x
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-4 pt-4 border-t border-zinc-800">
                                        <div className="flex justify-between text-sm text-zinc-400">
                                            <span>Affected Items</span>
                                            <span className="text-white font-bold">{pattern.items}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </PageContainer>
    );
}
