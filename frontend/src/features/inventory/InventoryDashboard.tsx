import React, { useState, useEffect } from 'react';
import PageLayout from '../../layouts/PageLayout';
import DataTable from '../../components/shared/DataTable';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Ingredient } from '../../types';
import { InventoryService } from './InventoryService';
import { toast } from 'sonner';

export default function InventoryDashboard() {
    const [items, setItems] = useState<Ingredient[]>([]);
    const [valuation, setValuation] = useState<{ total_valuation_cents: number, currency: string } | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await InventoryService.getItems();
            setItems(data);

            // Simple client-side valuation since endpoint might not be ready
            const totalCents = data.reduce((acc, item) => acc + (item.stock * item.priceCents), 0);
            setValuation({ total_valuation_cents: totalCents, currency: 'EUR' });
        } catch (e) {
            console.error("Failed to load inventory:", e);
            toast.error("Could not load inventory.");
        } finally {
            setLoading(false);
        }
    };

    const columns = [
        { key: 'name', label: 'Ingredient Name' },
        { key: 'category', label: 'Category', render: (row: Ingredient) => <Badge variant="secondary">{row.category}</Badge> },
        {
            key: 'stock',
            label: 'Stock Level',
            render: (row: Ingredient) => {
                const isLow = row.minStock && row.stock <= row.minStock;
                return (
                    <div className="flex items-center gap-2">
                        <span>{row.stock} {row.unit}</span>
                        {isLow && <Badge variant="destructive" className="h-5 px-1 text-[10px]">LOW</Badge>}
                    </div>
                );
            }
        },
        { key: 'priceCents', label: 'Cost/Unit', render: (row: Ingredient) => `€${(row.priceCents / 100).toFixed(2)}` },
        {
            key: 'value',
            label: 'Total Value',
            render: (row: Ingredient) => `€${((row.stock * row.priceCents) / 100).toFixed(2)}`
        },
        { key: 'gl_code_purchase', label: 'Xero GL', render: (row: Ingredient) => <code className="text-xs bg-zinc-800 px-1 rounded">{row.gl_code_purchase}</code> },
        {
            key: 'allergens',
            label: 'Allergens',
            render: (row: Ingredient) => (
                <div className="flex gap-1 flex-wrap">
                    {row.allergens.map(a => <Badge key={a} variant="outline" className="text-[9px] border-red-900 text-red-400">{a}</Badge>)}
                </div>
            )
        }
    ];

    return (
        <PageLayout
            title="Inventory Management (Apicbase)"
            description="Real-time ingredient tracking with Allergen & Xero integration."
            actions={
                <Button onClick={loadData}>Refresh</Button>
            }
        >
            <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-3">
                    <Card className="p-4 bg-zinc-950 border-zinc-800">
                        <div className="text-sm font-medium text-zinc-400">Total Ingredients</div>
                        <div className="text-2xl font-bold text-zinc-100">{items.length}</div>
                    </Card>
                    <Card className="p-4 bg-zinc-950 border-zinc-800">
                        <div className="text-sm font-medium text-zinc-400">Total Valuation</div>
                        <div className="text-2xl font-bold text-zinc-100">
                            {valuation ? `€${(valuation.total_valuation_cents / 100).toLocaleString()}` : '-'}
                        </div>
                    </Card>
                    <Card className="p-4 bg-zinc-950 border-zinc-800">
                        <div className="text-sm font-medium text-zinc-400">Low Stock Alerts</div>
                        <div className="text-2xl font-bold text-red-500">
                            {items.filter(i => i.minStock && i.stock <= i.minStock).length}
                        </div>
                    </Card>
                </div>

                <Card className="bg-zinc-950 border-zinc-800 p-6">
                    <DataTable
                        columns={columns}
                        data={items}
                        loading={loading}
                        emptyMessage="No ingredients found."
                    />
                </Card>
            </div>
        </PageLayout>
    );
}
