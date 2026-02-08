import React from 'react';
import { Users, Mail, TrendingDown, Star, MessageCircle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';

/**
 * 🤖 CRM - Customer Relationship Management with AI
 */
export default function CRM() {
    const customers = [
        { name: 'Maria Borg', visits: 24, lastVisit: '2 days ago', risk: 'low', status: 'vip' },
        { name: 'John Smith', visits: 8, lastVisit: '45 days ago', risk: 'high', status: 'churn' },
        { name: 'Anna Camilleri', visits: 12, lastVisit: '1 week ago', risk: 'medium', status: 'regular' },
    ];

    return (
        <div className="p-6 space-y-6">
            <Card className="bg-gradient-to-br from-amber-900/20 to-black border-amber-500/20">
                <CardHeader>
                    <div className="flex items-center gap-4">
                        <div className="p-4 bg-amber-600/20 rounded-xl">
                            <Users size={32} className="text-amber-500" />
                        </div>
                        <div>
                            <CardTitle className="text-3xl font-black text-white italic">AI CRM</CardTitle>
                            <p className="text-zinc-500 font-bold text-sm mt-1">Automated Customer Retention</p>
                        </div>
                    </div>
                </CardHeader>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card className="bg-zinc-900/30 border-zinc-800">
                    <CardContent className="p-6">
                        <Users size={24} className="text-amber-500 mb-4" />
                        <p className="text-3xl font-black text-white">1,247</p>
                        <p className="text-sm text-zinc-500 font-bold uppercase tracking-widest mt-1">Total Guests</p>
                    </CardContent>
                </Card>

                <Card className="bg-zinc-900/30 border-zinc-800">
                    <CardContent className="p-6">
                        <Star size={24} className="text-yellow-500 mb-4" />
                        <p className="text-3xl font-black text-white">182</p>
                        <p className="text-sm text-zinc-500 font-bold uppercase tracking-widest mt-1">VIP Customers</p>
                    </CardContent>
                </Card>

                <Card className="bg-zinc-900/30 border-zinc-800">
                    <CardContent className="p-6">
                        <TrendingDown size={24} className="text-red-500 mb-4" />
                        <p className="text-3xl font-black text-white">34</p>
                        <p className="text-sm text-zinc-500 font-bold uppercase tracking-widest mt-1">Churn Risk</p>
                    </CardContent>
                </Card>

                <Card className="bg-zinc-900/30 border-zinc-800">
                    <CardContent className="p-6">
                        <Mail size={24} className="text-blue-500 mb-4" />
                        <p className="text-3xl font-black text-white">12</p>
                        <p className="text-sm text-zinc-500 font-bold uppercase tracking-widest mt-1">Auto-Sent Today</p>
                    </CardContent>
                </Card>
            </div>

            <Card className="bg-zinc-900/10 border-zinc-800">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle>Customer Insights</CardTitle>
                        <Button size="sm" className="bg-amber-600 hover:bg-amber-700">
                            <MessageCircle size={16} className="mr-2" /> Send Campaign
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {customers.map((customer, i) => (
                            <div key={i} className="flex items-center justify-between p-4 bg-zinc-900/40 rounded-xl border border-zinc-800">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center">
                                        <Users size={20} className="text-zinc-400" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-white">{customer.name}</p>
                                        <p className="text-sm text-zinc-500">{customer.visits} visits • Last: {customer.lastVisit}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Badge variant={customer.risk === 'high' ? 'destructive' : customer.risk === 'medium' ? 'default' : 'secondary'}>
                                        {customer.risk.toUpperCase()} RISK
                                    </Badge>
                                    {customer.status === 'vip' && <Star size={16} className="text-yellow-500" />}
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
