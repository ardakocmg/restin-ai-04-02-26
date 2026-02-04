'use client';

import React, { useState, useEffect } from 'react';
import { useVenue } from '@/context/VenueContext';
import api from '@/lib/api';
import PageContainer from '@/components/layout/PageContainer';
import SearchBar from '@/components/shared/SearchBar';
import FilterBar from '@/components/shared/FilterBar';
import ItemDetailDrawer from '@/components/inventory/ItemDetailDrawer';
import { Card, CardContent } from '@antigravity/ui';
import { Badge } from '@antigravity/ui';
import { Button } from '@antigravity/ui';
import {
    Package, AlertTriangle, TrendingDown, CheckCircle2,
    Plus, RefreshCw
} from 'lucide-react';

export default function InventoryPage() {
    const { activeVenueId } = useVenue();
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filters, setFilters] = useState<any>({});
    const [selectedItem, setSelectedItem] = useState<any>(null);
    const [drawerOpen, setDrawerOpen] = useState(false);

    useEffect(() => {
        if (activeVenueId) {
            loadItems();
        }
    }, [activeVenueId, searchQuery, filters]);

    const loadItems = async () => {
        try {
            setLoading(true);
            // Mock data for now to ensure UI renders
            setItems([
                { id: '1', name: 'Burger Bun', quantity: 150, min_stock: 50, unit: 'pcs', category: 'Bakery' },
                { id: '2', name: 'Beef Patty', quantity: 20, min_stock: 40, unit: 'kg', category: 'Meat' },
                { id: '3', name: 'Lettuce', quantity: 5, min_stock: 5, unit: 'kg', category: 'Produce' }
            ]);
        } catch (error) {
            console.error('Failed to load items:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleItemClick = (item: any) => {
        setSelectedItem(item);
        setDrawerOpen(true);
    };

    const getStockStatus = (item: any) => {
        const balance = item.quantity || 0;
        const minStock = item.min_stock || item.min_quantity || 0;

        if (balance < 0) return { label: 'Negative', color: 'destructive', icon: AlertTriangle, className: 'bg-red-900/50 text-red-200 border-red-800' };
        if (balance <= minStock) return { label: 'Low Stock', color: 'outline', icon: TrendingDown, className: 'text-orange-400 border-orange-600 bg-orange-900/20' };
        return { label: 'OK', color: 'outline', icon: CheckCircle2, className: 'bg-green-900/20 text-green-400 border-green-800' };
    };

    return (
        <PageContainer
            title="Inventory Management"
            description="Stock control and recipe engineering"
        >
            <div className="flex flex-col space-y-4 mb-6">
                <div className="flex justify-between items-center">
                    <div className="flex-1 max-w-md">
                        <SearchBar
                            onSearch={setSearchQuery}
                            placeholder="Search items by name, SKU, or category..."
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <Button onClick={loadItems} variant="outline" size="sm" className="border-white/10 text-zinc-400 hover:text-white">
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Refresh
                        </Button>
                        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-500 text-white">
                            <Plus className="h-4 w-4 mr-2" />
                            Add Item
                        </Button>
                    </div>
                </div>

                <FilterBar>
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="text-xs font-bold text-zinc-500 mb-2 block uppercase tracking-wider">Status</label>
                            <select
                                value={filters.status || ''}
                                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                                className="w-full p-2 bg-zinc-800 border-zinc-700 rounded text-sm text-white"
                            >
                                <option value="">All Statuses</option>
                                <option value="OK">OK</option>
                                <option value="LOW">Low Stock</option>
                                <option value="NEG">Negative</option>
                            </select>
                        </div>
                    </div>
                </FilterBar>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {loading ? (
                    <div className="col-span-full text-center py-12 text-zinc-500">
                        Scanning warehouse...
                    </div>
                ) : items.length === 0 ? (
                    <div className="col-span-full text-center py-12 text-zinc-500">
                        No items found
                    </div>
                ) : (
                    items.map((item) => {
                        const status = getStockStatus(item);
                        const StatusIcon = status.icon;

                        return (
                            <Card
                                key={item.id}
                                className="cursor-pointer hover:bg-zinc-800/50 transition-all border-zinc-800 bg-zinc-900"
                                onClick={() => handleItemClick(item)}
                            >
                                <CardContent className="p-4">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-lg bg-zinc-800 flex items-center justify-center">
                                                <Package className="h-5 w-5 text-zinc-500" />
                                            </div>
                                            <div>
                                                <span className="font-bold text-zinc-200 block">{item.name}</span>
                                                <span className="text-[10px] text-zinc-500 uppercase font-mono">SKU-{item.id}</span>
                                            </div>
                                        </div>
                                        <Badge variant="outline" className={`text-xs ${status.className}`}>
                                            <StatusIcon className="h-3 w-3 mr-1" />
                                            {status.label}
                                        </Badge>
                                    </div>
                                    <div className="space-y-2 text-sm bg-zinc-950/50 p-3 rounded-lg border border-white/5">
                                        <div className="flex justify-between items-center border-b border-white/5 pb-2">
                                            <span className="text-zinc-500 text-xs uppercase font-bold">On Hand</span>
                                            <span className="font-mono font-bold text-white text-lg">
                                                {item.quantity?.toFixed(2) || '0.00'} <span className="text-xs text-zinc-500 ml-1">{item.unit}</span>
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center pt-1">
                                            <span className="text-zinc-500 text-xs">Min Stock</span>
                                            <span className="text-zinc-400 font-mono text-xs">
                                                {(item.min_stock || item.min_quantity || 0).toFixed(2)} {item.unit}
                                            </span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })
                )}
            </div>

            <ItemDetailDrawer
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                skuId={selectedItem?.id}
                venueId={activeVenueId}
            />
        </PageContainer>
    );
}
