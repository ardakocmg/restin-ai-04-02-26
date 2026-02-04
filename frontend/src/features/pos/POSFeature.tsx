import React, { useState, useEffect } from 'react';
import PageLayout from '../../layouts/PageLayout';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { useMockData } from '../../hooks/useMockData'; // Reuse seed data for menu
import { Order, OrderItem } from '../../types';
import { POSService } from './POSService';
import { toast } from 'sonner';

export default function POSFeature() {
    const { data } = useMockData();
    const [cart, setCart] = useState<OrderItem[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>('All');

    // Menu Categories (Dynamically derived from seed data would be better in real app)
    const categories = ['All', 'Starters', 'Mains', 'Desserts', 'Drinks'];

    const addToCart = (item: any) => { // Using any for seed inventory item
        setCart(prev => {
            const existing = prev.find(i => i.name === item.name);
            if (existing) {
                return prev.map(i => i.name === item.name ? { ...i, quantity: i.quantity + 1 } : i);
            }
            return [...prev, { name: item.name, quantity: 1, priceCents: item.priceCents }];
        });
    };

    const handleCheckout = async () => {
        if (cart.length === 0) return;

        const totalCents = cart.reduce((sum, item) => sum + (item.priceCents * item.quantity), 0);

        const newOrder = {
            venueId: 'venue-caviar-bull', // Context driven in real app
            tableId: 'T-1', // Selector needed
            userId: 'user-cb-server1',
            totalCents: totalCents,
            items: cart
        };

        const success = await POSService.submitOrder(newOrder);
        if (success || !success) { // Always clear cart if queued or sent (optimistic)
            setCart([]);
        }
    };

    // Filter Menu (Mock Inventory as Menu Items)
    const menuItems = data?.inventory.filter(i => selectedCategory === 'All' || i.category === selectedCategory) || [];

    return (
        <PageLayout title="Point of Sale" description="Take orders (Offline Capable)" actions={<Button variant="outline" onClick={() => POSService.syncQueue()}>Force Sync</Button>}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
                {/* Menu Section */}
                <Card className="md:col-span-2 p-4 bg-zinc-950 border-zinc-800 flex flex-col gap-4">
                    <div className="flex gap-2 overflow-x-auto pb-2">
                        {categories.map(cat => (
                            <Button
                                key={cat}
                                variant={selectedCategory === cat ? "default" : "outline"}
                                onClick={() => setSelectedCategory(cat)}
                            >
                                {cat}
                            </Button>
                        ))}
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto">
                        {menuItems.map(item => (
                            <Card
                                key={item.id}
                                className="p-4 cursor-pointer hover:bg-zinc-900 transition-colors border-zinc-800 flex flex-col justify-between"
                                onClick={() => addToCart(item)}
                            >
                                <div className="font-bold text-zinc-100">{item.name}</div>
                                <div className="text-zinc-400">€{(item.priceCents / 100).toFixed(2)}</div>
                            </Card>
                        ))}
                    </div>
                </Card>

                {/* Cart Section */}
                <Card className="p-4 bg-zinc-900 border-zinc-800 flex flex-col h-full">
                    <h2 className="text-xl font-bold text-zinc-100 mb-4">Current Order (Table 1)</h2>

                    <div className="flex-1 overflow-y-auto space-y-2">
                        {cart.length === 0 && <div className="text-zinc-500 text-center mt-10">Cart is empty</div>}
                        {cart.map((item, idx) => (
                            <div key={idx} className="flex justify-between items-center bg-zinc-950 p-2 rounded border border-zinc-800">
                                <div>
                                    <div className="text-zinc-200">{item.name}</div>
                                    <div className="text-xs text-zinc-500">x{item.quantity}</div>
                                </div>
                                <div className="text-zinc-300">€{((item.priceCents * item.quantity) / 100).toFixed(2)}</div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-4 border-t border-zinc-800 pt-4">
                        <div className="flex justify-between text-xl font-bold text-zinc-100 mb-4">
                            <span>Total</span>
                            <span>€{(cart.reduce((sum, i) => sum + (i.priceCents * i.quantity), 0) / 100).toFixed(2)}</span>
                        </div>
                        <Button className="w-full h-12 text-lg" onClick={handleCheckout} disabled={cart.length === 0}>
                            SEND ORDER
                        </Button>
                    </div>
                </Card>
            </div>
        </PageLayout>
    );
}
