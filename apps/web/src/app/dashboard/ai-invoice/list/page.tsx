'use client';

import React, { useState } from 'react';
import PageContainer from '@/components/layout/PageContainer';
import { Card, CardContent } from '@antigravity/ui';
import { Badge } from '@antigravity/ui';
import { Button } from '@antigravity/ui';
import { CheckCircle, AlertTriangle, XCircle, Filter } from 'lucide-react';

export default function InvoiceListPage() {
    const [invoices, setInvoices] = useState([
        { id: 1, number: 'INV-001', supplier: 'Sysco', amount: 1250.00, status: 'matched', date: '2026-02-01' },
        { id: 2, number: 'INV-002', supplier: 'Local Farm', amount: 340.50, status: 'variance', date: '2026-02-02' },
        { id: 3, number: 'INV-003', supplier: 'BevCo', amount: 890.00, status: 'processing', date: '2026-02-03' }
    ]);

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'matched': return <Badge className="bg-green-900/20 text-green-500 border-green-900 flex gap-1"><CheckCircle className="h-3 w-3" /> MATCHED</Badge>;
            case 'variance': return <Badge className="bg-red-900/20 text-red-500 border-red-900 flex gap-1"><AlertTriangle className="h-3 w-3" /> VARIANCE</Badge>;
            case 'processing': return <Badge className="bg-blue-900/20 text-blue-500 border-blue-900 flex gap-1">PROCESSING</Badge>;
            default: return <Badge>UNKNOWN</Badge>;
        }
    };

    return (
        <PageContainer title="All Invoices" description="History of processed documents" actions={
            <Button variant="outline"><Filter className="h-4 w-4 mr-2" /> Filter</Button>
        }>
            <div className="space-y-4">
                {invoices.map(inv => (
                    <Card key={inv.id} className="border-zinc-800 bg-zinc-900/50">
                        <CardContent className="p-4 flex items-center justify-between">
                            <div className="flex items-center gap-6">
                                <div className="w-24 font-mono text-zinc-400 text-sm">{inv.number}</div>
                                <div>
                                    <div className="font-bold text-white">{inv.supplier}</div>
                                    <div className="text-xs text-zinc-500">{inv.date}</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-8">
                                <div className="text-right font-mono text-white font-bold">${inv.amount.toFixed(2)}</div>
                                {getStatusBadge(inv.status)}
                                <Button variant="ghost" size="sm" className="text-zinc-500">View</Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </PageContainer>
    );
}
