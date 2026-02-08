import React from 'react';
import { CreditCard, Smartphone, DollarSign, TrendingUp, Wallet } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';

/**
 * 💳 FINTECH - Payment & Financial Services
 */
export default function Fintech() {
    return (
        <div className="p-6 space-y-6">
            <Card className="bg-gradient-to-br from-green-900/20 to-black border-green-500/20">
                <CardHeader>
                    <div className="flex items-center gap-4">
                        <div className="p-4 bg-green-600/20 rounded-xl">
                            <CreditCard size={32} className="text-green-500" />
                        </div>
                        <div>
                            <CardTitle className="text-3xl font-black text-white italic">FINTECH HUB</CardTitle>
                            <p className="text-zinc-500 font-bold text-sm mt-1">Payment Solutions & Self-Service</p>
                        </div>
                    </div>
                </CardHeader>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-zinc-900/30 border-zinc-800">
                    <CardContent className="p-6">
                        <DollarSign size={24} className="text-green-500 mb-4" />
                        <p className="text-3xl font-black text-white">€12,450</p>
                        <p className="text-sm text-zinc-500 font-bold uppercase tracking-widest mt-1">Today's Revenue</p>
                        <Badge className="mt-3 bg-green-600">
                            <TrendingUp size={12} className="mr-1" /> +15%
                        </Badge>
                    </CardContent>
                </Card>

                <Card className="bg-zinc-900/30 border-zinc-800">
                    <CardContent className="p-6">
                        <Smartphone size={24} className="text-blue-500 mb-4" />
                        <p className="text-3xl font-black text-white">87</p>
                        <p className="text-sm text-zinc-500 font-bold uppercase tracking-widest mt-1">Kiosk Orders</p>
                    </CardContent>
                </Card>

                <Card className="bg-zinc-900/30 border-zinc-800">
                    <CardContent className="p-6">
                        <Wallet size={24} className="text-purple-500 mb-4" />
                        <p className="text-3xl font-black text-white">234</p>
                        <p className="text-sm text-zinc-500 font-bold uppercase tracking-widest mt-1">Split Payments</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="bg-zinc-900/30 border-zinc-800">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Smartphone size={20} /> Kiosk Mode
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <p className="text-zinc-400">Enable self-service ordering for guests</p>
                            <Button className="w-full bg-green-600 hover:bg-green-700">
                                Activate Kiosk Mode
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-zinc-900/30 border-zinc-800">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Wallet size={20} /> Split Payment
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <p className="text-zinc-400">Advanced bill splitting logic</p>
                            <Button className="w-full bg-purple-600 hover:bg-purple-700">
                                Configure Rules
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
