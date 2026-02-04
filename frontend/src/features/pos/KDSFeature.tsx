import React, { useState, useEffect } from 'react';
import PageLayout from '../../layouts/PageLayout';
import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Order } from '../../types';
import { POSService } from './POSService'; // Reusing service for fetch

export default function KDSFeature() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Poll for updates in KDS every 10s (Stage 1 KDS)
        fetchOrders();
        const interval = setInterval(fetchOrders, 10000);
        return () => clearInterval(interval);
    }, []);

    const fetchOrders = async () => {
        const data = await POSService.getOrders('venue-caviar-bull'); // Context needed
        setOrders(data);
        setLoading(false);
    };

    // Traffic Light Aging Logic (Rule #4)
    const getAgingColor = (createdAt: string) => {
        const diffMinutes = (Date.now() - new Date(createdAt).getTime()) / 60000;
        if (diffMinutes > 20) return 'border-red-500 text-red-500'; // Critical
        if (diffMinutes > 10) return 'border-yellow-500 text-yellow-500'; // Warning
        return 'border-green-500 text-green-500'; // Fresh
    };

    return (
        <PageLayout title="Kitchen Display System" description="Live Orders View">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {orders.length === 0 && !loading && (
                    <div className="col-span-full text-center text-zinc-500 mt-20 text-xl">No active orders in kitchen</div>
                )}

                {orders.map(order => (
                    <Card
                        key={order.id}
                        className={`p-0 bg-zinc-950 border-2 overflow-hidden flex flex-col ${getAgingColor(order.createdAt)}`}
                    >
                        <div className={`p-2 font-bold flex justify-between items-center text-black ${getAgingColor(order.createdAt).replace('text', 'bg').replace('border', 'bg')}`}>
                            <span>Table {order.tableId}</span>
                            <span>{new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <div className="p-4 flex-1 space-y-2">
                            {order.items.map((item, idx) => (
                                <div key={idx} className="flex justify-between items-start border-b border-zinc-900 pb-2 last:border-0">
                                    <span className="text-zinc-200 font-medium">{item.quantity}x {item.name}</span>
                                </div>
                            ))}
                        </div>
                        <div className="p-2 bg-zinc-900 text-center text-sm text-zinc-400">
                            Server: {order.userId}
                        </div>
                    </Card>
                ))}
            </div>
        </PageLayout>
    );
}
