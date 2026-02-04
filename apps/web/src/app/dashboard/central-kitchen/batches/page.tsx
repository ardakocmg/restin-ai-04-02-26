'use client';

import React, { useState } from 'react';
import PageContainer from '@/components/layout/PageContainer';
import { Card, CardContent } from '@antigravity/ui';
import { Badge } from '@antigravity/ui';
import { Button } from '@antigravity/ui';
import { Plus, Factory, CheckCircle, Clock } from 'lucide-react';

export default function BatchesPage() {
    const [batches, setBatches] = useState([
        { id: 'B-001', date: '2026-02-04', status: 'in_progress', output: 'Tomato Sauce Base', qty: '500 L' },
        { id: 'B-002', date: '2026-02-05', status: 'planned', output: 'Pizza Dough', qty: '2000 Units' },
        { id: 'B-003', date: '2026-02-01', status: 'completed', output: 'Beef Stock', qty: '200 L' },
    ]);

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'completed': return <Badge className="bg-green-900/20 text-green-500 border-green-900 flex gap-1"><CheckCircle className="h-3 w-3" /> COMPLETE</Badge>;
            case 'in_progress': return <Badge className="bg-blue-900/20 text-blue-500 border-blue-900 flex gap-1"><Factory className="h-3 w-3 animate-pulse" /> COOKING</Badge>;
            case 'planned': return <Badge className="bg-zinc-800 text-zinc-400 border-zinc-700 flex gap-1"><Clock className="h-3 w-3" /> PLANNED</Badge>;
            default: return <Badge>UNKNOWN</Badge>;
        }
    };

    return (
        <PageContainer title="Production Batches" description="Mass production management" actions={
            <Button className="bg-orange-600 text-white hover:bg-orange-700">
                <Plus className="h-4 w-4 mr-2" /> Start Batch
            </Button>
        }>
            <div className="space-y-4">
                {batches.map(batch => (
                    <Card key={batch.id} className="border-zinc-800 bg-zinc-900/50">
                        <CardContent className="p-6 flex items-center justify-between">
                            <div className="flex items-center gap-6">
                                <div className="h-12 w-12 bg-zinc-800 rounded-lg flex items-center justify-center font-mono text-zinc-500 font-bold text-xs uppercase">
                                    {batch.id}
                                </div>
                                <div>
                                    <h3 className="font-bold text-white text-lg">{batch.output}</h3>
                                    <p className="text-zinc-400 text-sm">Scheduled: {batch.date}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-8">
                                <div>
                                    <p className="text-xs text-zinc-500 uppercase tracking-widest text-right">Target Output</p>
                                    <p className="text-xl font-mono text-white font-bold">{batch.qty}</p>
                                </div>
                                {getStatusBadge(batch.status)}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </PageContainer>
    );
}
