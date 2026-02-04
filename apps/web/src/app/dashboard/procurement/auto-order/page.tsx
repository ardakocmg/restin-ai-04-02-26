'use client';

import React, { useState } from 'react';
import PageContainer from '@/components/layout/PageContainer';
import { Card, CardContent } from '@antigravity/ui';
import { Badge } from '@antigravity/ui';
import { Button } from '@antigravity/ui';
import { Settings, Plus } from 'lucide-react';

export default function AutoOrderPage() {
    const [rules, setRules] = useState([
        { id: 1, item: 'Milk (Whole)', min: 10, order_qty: 50, supplier: 'FarmFresh', active: true },
        { id: 2, item: 'Coffee Beans', min: 5, order_qty: 20, supplier: 'BeanCo', active: false }
    ]);

    return (
        <PageContainer title="Auto-Ordering" description="Set re-order points for automatic procurement" actions={
            <Button className="bg-purple-600 text-white hover:bg-purple-700">
                <Plus className="h-4 w-4 mr-2" /> New Rule
            </Button>
        }>
            <div className="grid gap-4">
                {rules.map(rule => (
                    <Card key={rule.id} className="border-zinc-800 bg-zinc-900/50">
                        <CardContent className="p-6 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="h-10 w-10 rounded-full bg-purple-900/20 flex items-center justify-center text-purple-500">
                                    <Settings className="h-5 w-5" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-white">{rule.item}</h3>
                                    <p className="text-sm text-zinc-400">Supplier: {rule.supplier}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-8">
                                <div>
                                    <div className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Re-Order Point</div>
                                    <div className="text-xl font-mono text-white">{rule.min}</div>
                                </div>
                                <div>
                                    <div className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Order Qty</div>
                                    <div className="text-xl font-mono text-white">{rule.order_qty}</div>
                                </div>
                                <Badge variant="outline" className={rule.active ? "text-green-500 border-green-900" : "text-zinc-500 border-zinc-800"}>
                                    {rule.active ? 'ACTIVE' : 'PAUSED'}
                                </Badge>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </PageContainer>
    );
}
