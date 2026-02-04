'use client';

import React, { useState } from 'react';
import PageContainer from '@/components/layout/PageContainer';
import { Card, CardContent } from '@antigravity/ui';
import { Badge } from '@antigravity/ui';
import { Button } from '@antigravity/ui';
import { ClipboardList, Truck } from 'lucide-react';

export default function InternalOrdersPage() {
    const [orders, setOrders] = useState([
        { id: 'IO-992', venue: 'Downtown Outlet', items: 12, due: '2026-02-06', status: 'pending' },
        { id: 'IO-991', venue: 'Seaside Grill', items: 45, due: '2026-02-05', status: 'shipped' },
    ]);

    return (
        <PageContainer title="Internal Orders" description="Fulfillment requests from outlets">
            <div className="space-y-4">
                {orders.map(order => (
                    <Card key={order.id} className="border-zinc-800 bg-zinc-900/50">
                        <CardContent className="p-6 flex items-center justify-between">
                            <div className="flex items-center gap-6">
                                <div className="h-12 w-12 bg-zinc-800 rounded-lg flex items-center justify-center text-blue-500">
                                    <ClipboardList className="h-6 w-6" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-white">{order.venue}</h3>
                                    <p className="text-zinc-400 text-sm font-mono">{order.id}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-8">
                                <div className="text-right">
                                    <p className="text-xs text-zinc-500 uppercase tracking-widest">Items</p>
                                    <p className="text-white font-bold">{order.items}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-zinc-500 uppercase tracking-widest">Due Date</p>
                                    <p className="text-white font-bold">{order.due}</p>
                                </div>
                                <Badge className={order.status === 'shipped' ? 'bg-green-900/20 text-green-500' : 'bg-yellow-900/20 text-yellow-500'}>
                                    {order.status.toUpperCase()}
                                </Badge>
                                <Button size="sm" variant="outline">View Manifest</Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </PageContainer>
    );
}
