
import React, { useState } from 'react';
import PageContainer from '../../../layouts/PageContainer';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { FileText, Send, Clock, DollarSign } from 'lucide-react';

export default function RFQManagement() {
    // Phase 5: Simulated RFQ Data
    const [rfqs] = useState([
        { id: 'RFQ-2026-001', item: 'Wagyu Beef A5', qty: '50kg', deadline: '2026-02-10', status: 'Open', bids: 3 },
        { id: 'RFQ-2026-002', item: 'Truffle Oil', qty: '20L', deadline: '2026-02-08', status: 'Closed', bids: 5 },
    ]);

    return (
        <PageContainer
            title="Request for Quotation (RFQ)"
            description="Manage supplier bidding and procurement requests"
            actions={<Button className="bg-blue-600"><FileText className="w-4 h-4 mr-2" /> Create RFQ</Button>}
        >
            <div className="grid grid-cols-1 gap-4">
                {rfqs.map(rfq => (
                    <Card key={rfq.id} className="bg-zinc-900 border-white/10 hover:border-blue-500/50 transition-colors">
                        <CardContent className="p-6 flex items-center justify-between">
                            <div>
                                <div className="flex items-center gap-3 mb-2">
                                    <span className="font-mono text-zinc-500 text-sm">{rfq.id}</span>
                                    <Badge variant="outline" className="text-blue-400 border-blue-500/20">{rfq.status}</Badge>
                                </div>
                                <h3 className="text-xl font-bold text-white mb-1">{rfq.item} <span className="text-zinc-500 text-base font-normal">({rfq.qty})</span></h3>
                                <div className="flex items-center gap-4 text-sm text-zinc-400">
                                    <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> Due: {rfq.deadline}</span>
                                    <span className="flex items-center gap-1 text-green-400"><DollarSign className="w-4 h-4" /> {rfq.bids} Bids Received</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <Button variant="outline" size="sm">View Bids</Button>
                                <Button size="sm" className="bg-blue-600 hover:bg-blue-700">Manage</Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </PageContainer>
    );
}
