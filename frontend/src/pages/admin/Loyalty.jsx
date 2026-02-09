
import React, { useState, useEffect } from 'react';
import { useVenue } from '../../context/VenueContext';
import api from '../../lib/api';
import PageContainer from '../../layouts/PageContainer';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Gift, Star, Award, TrendingUp, Settings, Plus, Trophy } from 'lucide-react';
import { toast } from 'sonner';

export default function LoyaltyPage() {
    const { activeVenue } = useVenue();
    const [accounts, setAccounts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('members');

    // Phase 5: Simulated Tiers
    const TIERS = [
        { name: 'Bronze', threshold: 0, color: 'text-orange-700 bg-orange-900/20 border-orange-700/50' },
        { name: 'Silver', threshold: 500, color: 'text-zinc-300 bg-zinc-700/20 border-zinc-500/50' },
        { name: 'Gold', threshold: 1500, color: 'text-yellow-400 bg-yellow-900/20 border-yellow-600/50' },
        { name: 'Platinum', threshold: 5000, color: 'text-cyan-400 bg-cyan-900/20 border-cyan-500/50' }
    ];

    useEffect(() => {
        if (activeVenue?.id) {
            loadLoyalty();
        }
    }, [activeVenue?.id]);

    const loadLoyalty = async () => {
        try {
            const res = await api.get(`/loyalty/accounts?venue_id=${activeVenue.id}`).catch(() => ({ data: { data: [] } }));
            // Augment with mock data if empty
            const data = res.data?.data || [];
            setAccounts(data);
        } catch (error) {
            console.error('Loyalty error:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <PageContainer
            title="Loyalty & Rewards"
            description="Gamified customer retention engine"
            actions={
                <div className="flex gap-2">
                    <Button variant="outline"><Settings className="w-4 h-4 mr-2" /> Config</Button>
                    <Button className="bg-purple-600"><Plus className="w-4 h-4 mr-2" /> Add Points</Button>
                </div>
            }
        >
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                {(() => {
                    const totalPoints = accounts.reduce((sum, a) => sum + (a.points || 0), 0);
                    const totalVisits = accounts.reduce((sum, a) => sum + (a.visits || 0), 0);
                    const returning = accounts.filter(a => (a.visits || 0) > 1).length;
                    const retentionPct = accounts.length > 0 ? Math.round((returning / accounts.length) * 100) : 0;
                    const fmtPoints = totalPoints >= 1_000_000 ? `${(totalPoints / 1_000_000).toFixed(1)}M` :
                        totalPoints >= 1_000 ? `${(totalPoints / 1_000).toFixed(1)}K` : totalPoints.toString();
                    return [
                        { label: 'Total Members', value: accounts.length, icon: Gift, color: 'text-purple-500' },
                        { label: 'Points Issued', value: fmtPoints, icon: Star, color: 'text-yellow-500' },
                        { label: 'Total Visits', value: totalVisits.toLocaleString(), icon: Award, color: 'text-green-500' },
                        { label: 'Retention Rate', value: `${retentionPct}%`, icon: TrendingUp, color: 'text-blue-500' }
                    ];
                })().map((m, i) => {
                    const Icon = m.icon;
                    return (
                        <Card key={i} className="bg-zinc-950 border-white/5 shadow-xl">
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

            <div className="flex items-center justify-between mb-4">
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="bg-zinc-900 border border-white/5">
                        <TabsTrigger value="members">Members</TabsTrigger>
                        <TabsTrigger value="tiers">Tiers</TabsTrigger>
                        <TabsTrigger value="history">History</TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>

            <Card className="bg-zinc-900 border-white/5">
                <CardContent className="p-0">
                    {activeTab === 'members' && (
                        <div className="divide-y divide-white/5">
                            <div className="grid grid-cols-5 p-4 text-[10px] font-black uppercase text-zinc-500">
                                <span className="col-span-2">Member</span>
                                <span>Current Tier</span>
                                <span>Points Balance</span>
                                <span className="text-right">Lifetime Visits</span>
                            </div>
                            {accounts.map(acc => {
                                const tier = TIERS.find(t => t.name === (acc.tier || 'Bronze')) || TIERS[0];
                                return (
                                    <div key={acc.guest_id} className="grid grid-cols-5 p-4 hover:bg-white/5 transition-colors items-center">
                                        <div className="col-span-2">
                                            <p className="font-bold text-white text-sm">{acc.name || 'Guest'}</p>
                                            <p className="text-xs text-zinc-500 font-mono">{acc.guest_id}</p>
                                        </div>
                                        <div>
                                            <Badge variant="outline" className={`${tier.color} text-[10px] uppercase`}>{tier.name}</Badge>
                                        </div>
                                        <div className="flex items-center gap-1 font-mono text-yellow-500 font-bold">
                                            <Star className="w-3 h-3" /> {acc.points.toLocaleString()}
                                        </div>
                                        <div className="text-right font-mono text-zinc-400">
                                            {acc.visits || 0}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {activeTab === 'tiers' && (
                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                            {TIERS.map(tier => (
                                <div key={tier.name} className={`p-4 rounded-xl border ${tier.color} bg-opacity-10 relative overflow-hidden group`}>
                                    <div className="absolute right-0 top-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                                        <Trophy className="w-12 h-12" />
                                    </div>
                                    <h3 className="text-lg font-black uppercase mb-1">{tier.name}</h3>
                                    <p className="text-xs font-mono opacity-80 mb-4">{tier.threshold}+ Points</p>
                                    <ul className="text-sm space-y-1 opacity-90">
                                        <li>• {tier.name === 'Platinum' ? '2.0x' : tier.name === 'Gold' ? '1.5x' : '1.0x'} Point Multiplier</li>
                                        <li>• Birthday Reward</li>
                                        {tier.name === 'Platinum' && <li>• Priority Reservations</li>}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </PageContainer>
    );
}
