'use client';

import React, { useState } from 'react';
import PageContainer from '@/components/layout/PageContainer';
import { Button } from '@antigravity/ui';
import { Input } from '@antigravity/ui';
import { ClipboardList, Search, Check, Play } from 'lucide-react';
import { toast } from 'sonner';

export default function StockCountPage() {
    const [count, setCount] = useState<any>(null);
    const [search, setSearch] = useState('');
    const [lines, setLines] = useState<any>({});

    const mockItems = [
        { id: '1', sku: 'SKU-001', name: 'Burger Bun', system_stock: 150, unit: 'pcs' },
        { id: '2', sku: 'SKU-002', name: 'Beef Patty', system_stock: 200, unit: 'pcs' },
    ];

    const startCount = () => {
        setCount({ id: 'count_1', display_id: 'CNT-2026-001', status: 'active' });
        toast.info("Stock count started");
    };

    const completeCount = () => {
        if (confirm("Commit stock variances?")) {
            setCount(null);
            setLines({});
            toast.success("Stock count completed & variances posted");
        }
    };

    return (
        <PageContainer title="Stock Count" description="Variance Control">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-6 flex justify-between items-center">
                <div>
                    {!count ? (
                        <h2 className="text-zinc-500 font-bold">No Active Count</h2>
                    ) : (
                        <div>
                            <h2 className="text-white font-bold text-lg">Active Count: {count.display_id}</h2>
                            <p className="text-xs text-blue-500 animate-pulse">In Progress</p>
                        </div>
                    )}
                </div>
                <div>
                    {!count ? (
                        <Button onClick={startCount} className="bg-blue-600 hover:bg-blue-500"><Play className="h-4 w-4 mr-2" /> Start New Count</Button>
                    ) : (
                        <Button onClick={completeCount} className="bg-green-600 hover:bg-green-500"><Check className="h-4 w-4 mr-2" /> Complete</Button>
                    )}
                </div>
            </div>

            {count && (
                <div className="space-y-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                        <Input
                            className="pl-10 bg-zinc-900 border-zinc-800"
                            placeholder="Scan SKU or search item..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-black/20 border-b border-zinc-800">
                                <tr>
                                    <th className="p-4 text-left text-xs font-bold text-zinc-500 uppercase">Item</th>
                                    <th className="p-4 text-left text-xs font-bold text-zinc-500 uppercase">System</th>
                                    <th className="p-4 text-left text-xs font-bold text-zinc-500 uppercase">Counted</th>
                                    <th className="p-4 text-left text-xs font-bold text-zinc-500 uppercase">Diff</th>
                                </tr>
                            </thead>
                            <tbody>
                                {mockItems.map(item => {
                                    const val = parseFloat(lines[item.id] || 0);
                                    const diff = val - item.system_stock;
                                    return (
                                        <tr key={item.id} className="border-b border-zinc-800">
                                            <td className="p-4">
                                                <div className="font-bold text-white">{item.name}</div>
                                                <div className="text-xs text-zinc-500 font-mono">{item.sku}</div>
                                            </td>
                                            <td className="p-4 text-zinc-400 font-mono">{item.system_stock} {item.unit}</td>
                                            <td className="p-4">
                                                <Input
                                                    type="number"
                                                    className="w-24 bg-black border-zinc-700 font-mono text-right"
                                                    value={lines[item.id] || ''}
                                                    onChange={(e) => setLines({ ...lines, [item.id]: e.target.value })}
                                                    placeholder="0"
                                                />
                                            </td>
                                            <td className={`p-4 font-mono font-bold ${diff < 0 ? 'text-red-500' : 'text-green-500'}`}>
                                                {diff > 0 ? '+' : ''}{diff}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </PageContainer>
    );
}
