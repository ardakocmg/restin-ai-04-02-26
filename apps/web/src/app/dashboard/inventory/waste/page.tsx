'use client';

import React, { useState } from 'react';
import PageContainer from '@/components/layout/PageContainer';
import { Button } from '@antigravity/ui';
import { Badge } from '@antigravity/ui';
import { Trash2, AlertTriangle, Plus } from 'lucide-react';
import { Input } from '@antigravity/ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@antigravity/ui';
import { toast } from 'sonner';

export default function WasteLogPage() {
    const [waste, setWaste] = useState([
        { id: '1', item: 'Avocados', qty: '2 kg', reason: 'SPOILAGE', user: 'John Chef', date: '2026-02-04 14:30' },
        { id: '2', item: 'White Plates', qty: '3 pcs', reason: 'BREAKAGE', user: 'Maria Server', date: '2026-02-04 19:15' },
    ]);

    const reasons = [
        { id: 'SPOILAGE', label: 'Spoilage', color: 'text-orange-500 border-orange-900 bg-orange-900/10' },
        { id: 'BREAKAGE', label: 'Breakage', color: 'text-red-500 border-red-900 bg-red-900/10' },
        { id: 'PREP_WASTE', label: 'Prep Waste', color: 'text-zinc-500 border-zinc-700 bg-zinc-800' },
    ];

    const getReasonStyle = (reasonId: string) => {
        return reasons.find(r => r.id === reasonId)?.color || 'text-zinc-500 border-zinc-700 bg-zinc-800';
    };

    return (
        <PageContainer title="Waste Log" description="Loss Prevention & Tracking">
            <div className="flex justify-end mb-6">
                <Button className="bg-red-600 hover:bg-red-700 text-white"><Plus className="h-4 w-4 mr-2" /> Log Waste</Button>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                <div className="p-4 border-b border-zinc-800 grid grid-cols-12 text-xs font-bold text-zinc-500 uppercase tracking-wider">
                    <div className="col-span-4">Item</div>
                    <div className="col-span-2">Reason</div>
                    <div className="col-span-2">Qty</div>
                    <div className="col-span-4 text-right">Logged By</div>
                </div>
                <div className="divide-y divide-zinc-800">
                    {waste.map(entry => (
                        <div key={entry.id} className="p-4 grid grid-cols-12 items-center hover:bg-zinc-800/50 transition-colors">
                            <div className="col-span-4">
                                <div className="font-bold text-white mb-1">{entry.item}</div>
                                <div className="text-xs text-zinc-500 flex items-center gap-1">
                                    <Trash2 className="h-3 w-3" /> Waste ID: #{entry.id}
                                </div>
                            </div>
                            <div className="col-span-2">
                                <Badge variant="outline" className={`text-[10px] ${getReasonStyle(entry.reason)}`}>
                                    {entry.reason}
                                </Badge>
                            </div>
                            <div className="col-span-2 font-mono text-zinc-300">
                                {entry.qty}
                            </div>
                            <div className="col-span-4 text-right">
                                <div className="text-sm text-white">{entry.user}</div>
                                <div className="text-[10px] text-zinc-500">{entry.date}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </PageContainer>
    );
}
