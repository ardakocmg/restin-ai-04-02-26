import React, { useState, useEffect } from 'react';
import PageLayout from '../../layouts/PageLayout';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { OrderItem, Ingredient } from '../../types';
import { POSService } from './POSService';
import { toast } from 'sonner';
import logger from '../../lib/logger';

interface MenuItem {
    id: string;
    name: string;
    category: string;
    priceCents: number;
    price?: number;
}

export default function POSFeature() {
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [cart, setCart] = useState<OrderItem[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>('All');
    const [loading, setLoading] = useState(true);

    // Fetch real menu items from API
    useEffect(() => {
        const fetchMenu = async () => {
            try {
                const token = localStorage.getItem('accessToken') || '';
                const venueId = localStorage.getItem('selectedVenueId') || 'venue-caviar-bull';
                const res = await fetch(`/api/venues/${venueId}/menus`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    // Menus contain items — flatten if nested
                    const menus = Array.isArray(data) ? data : (data.menus || []);
                    const allItems: MenuItem[] = [];
                    for (const menu of menus) {
                        const categories = menu.categories || [];
                        for (const cat of categories) {
                            for (const item of (cat.items || [])) {
                                allItems.push({
                                    id: item.id || item.sku_id || item.name,
                                    name: item.name,
                                    category: cat.name || 'Uncategorized',
                                    priceCents: item.priceCents || Math.round((item.price || 0) * 100),
                                });
                            }
                        }
                    }
                    setMenuItems(allItems);
                }
            } catch (err) {
                // Offline-first: fail silently
                logger.warn('POS: Could not fetch menu from API');
            } finally {
                setLoading(false);
            }
        };
        fetchMenu();
    }, []);

    // Menu Categories (dynamically derived from loaded data)
    const categories = ['All', ...Array.from(new Set(menuItems.map(i => i.category)))];

    // Filter by category
    const filteredItems = selectedCategory === 'All' ? menuItems : menuItems.filter(i => i.category === selectedCategory);

    const addToCart = (item: MenuItem) => {
        setCart((prev: OrderItem[]) => {
            const existing = prev.find(i => i.name === item.name);
            if (existing) {
                return prev.map(i => i.name === item.name ? { ...i, quantity: i.quantity + 1 } : i);
            }
            return [...prev, { name: item.name, quantity: 1, priceCents: item.priceCents, course_id: 1, modifiers: [] }];
        });
    };

    const handleCheckout = async () => {
        if (cart.length === 0) return;
        const totalCents = cart.reduce((sum, item) => sum + (item.priceCents * item.quantity), 0);
        const venueId = localStorage.getItem('selectedVenueId') || 'venue-caviar-bull';
        const newOrder = {
            venueId,
            tableId: 'T-1',
            userId: 'user-cb-server1',
            status: 'PENDING' as const,
            totalCents,
            items: cart,
            createdAt: new Date().toISOString()
        };
        await POSService.submitOrder(newOrder);
        setCart([]);
    };

    return (
        <PageLayout title="Point of Sale" description="Take orders (Offline Capable)" actions={<Button variant="outline" onClick={() => POSService.syncQueue()}>Force Sync</Button>}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
                {/* Menu Section */}
                <Card className="md:col-span-2 p-4 bg-background border-border flex flex-col gap-4">
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

                    {loading ? (
                        <div className="flex-1 flex items-center justify-center text-muted-foreground">{"Loading "}menu...</div>
                    ) : filteredItems.length === 0 ? (
                        <div className="flex-1 flex items-center justify-center text-muted-foreground">{"No "}menu items found</div>
                    ) : (
                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto">
                            {filteredItems.map(item => (
                                <Card
                                    key={item.id}
                                    className="p-4 cursor-pointer hover:bg-card transition-colors border-border flex flex-col justify-between"
                                    onClick={() => addToCart(item)}
                                >
                                    <div className="font-bold text-foreground">{item.name}</div>
                                    <div className="text-muted-foreground">€{(item.priceCents / 100).toFixed(2)}</div>
                                </Card>
                            ))}
                        </div>
                    )}
                </Card>

                {/* Cart Section */}
                <Card className="p-4 bg-card border-border flex flex-col h-full">
                    <h2 className="text-xl font-bold text-foreground mb-4">Current Order (Table 1)</h2>

                    <div className="flex-1 overflow-y-auto space-y-2">
                        {cart.length === 0 && <div className="text-muted-foreground text-center mt-10">Cart is empty</div>}
                        {cart.map((item, idx) => (
                            <div key={idx} className="flex justify-between items-center bg-background p-2 rounded border border-border">
                                <div>
                                    <div className="text-secondary-foreground">{item.name}</div>
                                    <div className="text-xs text-muted-foreground">x{item.quantity}</div>
                                </div>
                                <div className="text-secondary-foreground">€{((item.priceCents * item.quantity) / 100).toFixed(2)}</div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-4 border-t border-border pt-4">
                        <div className="flex justify-between text-xl font-bold text-foreground mb-4">
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
