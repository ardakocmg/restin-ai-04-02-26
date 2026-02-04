'use client';

import React, { useState } from 'react';
import PageContainer from '@/components/layout/PageContainer';
import { Button } from '@antigravity/ui';
import { Badge } from '@antigravity/ui';
import { Factory, Plus, Play, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function ProductionPage() {
    const [batches, setBatches] = useState([
        { id: '1', name: 'Bolognese Sauce', qty: '50 kg', status: 'planned', date: '2026-02-05' },
        { id: '2', name: 'Pizza Dough', qty: '200 balls', status: 'in_progress', date: '2026-02-04' }
    ]);

    const handleAction = (id: string, action: string) => {
        toast.success(`Batch ${action}`);
    };

    return (
        <PageContainer title="Production" description="Kitchen Manufacturing">
            <div className="flex justify-end mb-6">
                <Button className="bg-red-600"><Plus className="h-4 w-4 mr-2" /> Plan Batch</Button>
            </div>

            <div className="space-y-4">
                {batches.map(batch => (
                    <div key={batch.id} className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-zinc-800 rounded-lg"><Factory className="h-6 w-6 text-zinc-400" /></div>
                            <div>
                                <h3 className="font-bold text-white text-lg">{batch.name}</h3>
                                <p className="text-zinc-500 text-xs font-mono">{batch.qty} • {batch.date}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <Badge variant="outline" className={batch.status === 'in_progress' ? 'text-blue-500 border-blue-900' : 'text-zinc-500 border-zinc-800'}>
                                {batch.status.replace('_', ' ').toUpperCase()}
                            </Badge>
                            {batch.status === 'planned' && (
                                <Button size="sm" onClick={() => handleAction(batch.id, 'started')}><Play className="h-4 w-4 mr-2" /> Start</Button>
                            )}
                            {batch.status === 'in_progress' && (
                                <Button size="sm" variant="secondary" onClick={() => handleAction(batch.id, 'completed')}><CheckCircle className="h-4 w-4 mr-2" /> Complete</Button>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </PageContainer>
    );
}
