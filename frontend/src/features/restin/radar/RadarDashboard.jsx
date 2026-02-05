import React from 'react';
import PageContainer from '../../../layouts/PageContainer';
import { Card, CardContent } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Radar, TrendingUp, TrendingDown, Eye } from 'lucide-react';

export default function RadarDashboard() {
    return (
        <PageContainer title="Market Radar" description="Deep Intelligence & Competitor Tracking">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <Card className="bg-zinc-900 border-white/5">
                    <CardContent className="p-6">
                        <p className="text-zinc-400 text-xs uppercase tracking-wider">Market Position</p>
                        <h2 className="text-3xl font-bold text-white mt-2">#2</h2>
                        <p className="text-green-500 text-xs mt-1 flex items-center gap-1">
                            <TrendingUp className="w-3 h-3" /> Up from #4 last week
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-zinc-900 border-white/5">
                    <CardContent className="p-6">
                        <p className="text-zinc-400 text-xs uppercase tracking-wider">Price Index</p>
                        <h2 className="text-3xl font-bold text-white mt-2">108%</h2>
                        <p className="text-zinc-500 text-xs mt-1">
                            8% more expensive than avg
                        </p>
                    </CardContent>
                </Card>
            </div>

            <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                <Eye className="w-4 h-4 text-purple-500" /> Watchlist
            </h3>

            <div className="space-y-4">
                {/* Competitor Row */}
                <div className="bg-zinc-900 border border-white/5 rounded-xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center font-bold text-white">
                            NM
                        </div>
                        <div>
                            <h4 className="text-white font-bold">Noni Malta</h4>
                            <p className="text-xs text-zinc-400">Fine Dining • Valletta</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-8">
                        <div className="text-right">
                            <p className="text-xs text-zinc-500">Tasting Menu</p>
                            <p className="text-white font-bold">€135.00</p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-zinc-500">Last Changed</p>
                            <Badge variant="outline" className="text-orange-400 border-orange-400/20">2 days ago</Badge>
                        </div>
                    </div>
                </div>

                {/* Competitor Row */}
                <div className="bg-zinc-900 border border-white/5 rounded-xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center font-bold text-white">
                            IO
                        </div>
                        <div>
                            <h4 className="text-white font-bold">ION - The Harbour</h4>
                            <p className="text-xs text-zinc-400">Michelin Star • Valletta</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-8">
                        <div className="text-right">
                            <p className="text-xs text-zinc-500">Tasting Menu</p>
                            <p className="text-white font-bold">€155.00</p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-zinc-500">Last Changed</p>
                            <p className="text-zinc-400 text-sm">No change</p>
                        </div>
                    </div>
                </div>
            </div>
        </PageContainer>
    );
}
