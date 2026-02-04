'use client';

import React from 'react';
import PageContainer from '@/components/layout/PageContainer';
import { Card, CardContent } from '@antigravity/ui';
import { Badge } from '@antigravity/ui';
import { Crown, Gift } from 'lucide-react';

export default function LoyaltyPage() {
    return (
        <PageContainer title="Loyalty Program" description="Tiers and rewards configuration">
            <div className="space-y-4">
                <Card className="border-zinc-800 bg-zinc-900/50">
                    <CardContent className="p-6 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 bg-yellow-900/20 rounded-full flex items-center justify-center text-yellow-500">
                                <Crown className="h-6 w-6" />
                            </div>
                            <div>
                                <h3 className="font-bold text-white text-lg">Gold Tier</h3>
                                <p className="text-zinc-400 text-sm">Spend {'>'} $1000/yr</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-zinc-500 uppercase tracking-widest">Perks</p>
                            <div className="flex gap-2 mt-1">
                                <Badge variant="secondary">15% Off</Badge>
                                <Badge variant="secondary">Priority Booking</Badge>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-zinc-800 bg-zinc-900/50">
                    <CardContent className="p-6 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 bg-zinc-800 rounded-full flex items-center justify-center text-zinc-400">
                                <Crown className="h-6 w-6" />
                            </div>
                            <div>
                                <h3 className="font-bold text-white text-lg">Silver Tier</h3>
                                <p className="text-zinc-400 text-sm">Spend {'>'} $500/yr</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-zinc-500 uppercase tracking-widest">Perks</p>
                            <div className="flex gap-2 mt-1">
                                <Badge variant="secondary">5% Off</Badge>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </PageContainer>
    );
}
