import React from 'react';
import { Radar as RadarIcon, TrendingUp, DollarSign, AlertCircle, Target } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';

/**
 * 🔬 RADAR - Market Intelligence
 */
export default function Radar() {
    const competitors = [
        { name: 'Restaurant A', price: '€25', trend: '+5%', status: 'higher' },
        { name: 'Restaurant B', price: '€22', trend: '-2%', status: 'similar' },
        { name: 'Restaurant C', price: '€28', trend: '+8%', status: 'higher' },
    ];

    return (
        <div className="p-6 space-y-6">
            <Card className="bg-gradient-to-br from-emerald-900/20 to-black border-emerald-500/20">
                <CardHeader>
                    <div className="flex items-center gap-4">
                        <div className="p-4 bg-emerald-600/20 rounded-xl">
                            <RadarIcon size={32} className="text-emerald-500" />
                        </div>
                        <div>
                            <CardTitle className="text-3xl font-black text-white italic">MARKET RADAR</CardTitle>
                            <p className="text-zinc-500 font-bold text-sm mt-1">Competitor Intelligence & Pricing</p>
                        </div>
                    </div>
                </CardHeader>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-zinc-900/30 border-zinc-800">
                    <CardContent className="p-6">
                        <TrendingUp size={24} className="text-emerald-500 mb-4" />
                        <p className="text-3xl font-black text-white">12</p>
                        <p className="text-sm text-zinc-500 font-bold uppercase tracking-widest mt-1">Competitors Tracked</p>
                    </CardContent>
                </Card>

                <Card className="bg-zinc-900/30 border-zinc-800">
                    <CardContent className="p-6">
                        <DollarSign size={24} className="text-blue-500 mb-4" />
                        <p className="text-3xl font-black text-white">€24.50</p>
                        <p className="text-sm text-zinc-500 font-bold uppercase tracking-widest mt-1">Avg Market Price</p>
                    </CardContent>
                </Card>

                <Card className="bg-zinc-900/30 border-zinc-800">
                    <CardContent className="p-6">
                        <Target size={24} className="text-red-500 mb-4" />
                        <p className="text-3xl font-black text-white">87%</p>
                        <p className="text-sm text-zinc-500 font-bold uppercase tracking-widest mt-1">Price Match Score</p>
                    </CardContent>
                </Card>
            </div>

            <Card className="bg-zinc-900/10 border-zinc-800">
                <CardHeader>
                    <CardTitle>Competitor Pricing</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {competitors.map((comp, i) => (
                            <div key={i} className="flex items-center justify-between p-4 bg-zinc-900/40 rounded-xl border border-zinc-800">
                                <div>
                                    <p className="font-bold text-white">{comp.name}</p>
                                    <p className="text-sm text-zinc-500 mt-1">Average main course</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-2xl font-black text-white">{comp.price}</p>
                                    <Badge variant={comp.status === 'higher' ? 'destructive' : 'default'} className="mt-1">
                                        {comp.trend}
                                    </Badge>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
