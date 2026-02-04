'use client';

import React, { useState } from 'react';
import { TicketCard } from '../../features/kds/components/TicketCard';
import { useVoiceOps } from '../../lib/voice/speechRecognition';

// Mock Data for KDS Demo using LocalOrder interface
// In reality, this would fetch from db.orders where status = 'SENT'
const MOCK_ORDERS: any[] = [
    {
        id: '1024',
        tableId: '5',
        createdAt: Date.now() - 1000 * 60 * 5, // 5 mins ago
        items: [
            { name: 'Caesar Salad', quantity: 1, course: 1 },
            { name: 'Garlic Bread', quantity: 1, course: 1 },
            { name: 'Steak Frites', quantity: 2, course: 2, notes: 'Medium Rare' }
        ]
    },
    {
        id: '1023',
        tableId: 'TAKEAWAY',
        createdAt: Date.now() - 1000 * 60 * 18, // 18 mins ago (Warning)
        items: [
            { name: 'Margherita Pizza', quantity: 3, course: 1 }
        ]
    },
    {
        id: '1021',
        tableId: '12',
        createdAt: Date.now() - 1000 * 60 * 25, // 25 mins ago (Critical)
        items: [
            { name: 'Lobster Risotto', quantity: 1, course: 1 }
        ]
    }
];

export default function KDSPage() {
    const [orders, setOrders] = useState(MOCK_ORDERS);

    const bumpTicket = (id: string) => {
        console.log("Bumping", id);
        setOrders(prev => prev.filter(o => o.id !== id));
    };

    // Voice Ops Registry
    const { isListening, lastCommand } = useVoiceOps([
        { trigger: 'bump ticket', action: (args) => alert(`Voice Bump: ${args}`) },
        { trigger: 'show all', action: () => alert('Showing All') }
    ]);

    return (
        <div className="h-screen w-screen bg-black text-white p-4 flex flex-col">
            <header className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-4">
                    <h1 className="text-3xl font-black text-zinc-100 tracking-tight">KITCHEN DISPLAY</h1>
                    {isListening && <span className="text-red-500 animate-pulse font-mono">● LISTENING</span>}
                </div>
                <div className="text-zinc-500 font-mono">
                    Last Cmd: {lastCommand || 'None'}
                </div>
            </header>

            <div className="flex-1 overflow-x-auto">
                <div className="flex gap-4 h-full">
                    {orders.map(order => (
                        <TicketCard key={order.id} order={order} onBump={bumpTicket} />
                    ))}
                    {orders.length === 0 && (
                        <div className="flex-1 flex items-center justify-center text-zinc-800 text-4xl font-black uppercase">
                            All Caught Up
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
