
import React, { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';

import PageContainer from '../../../layouts/PageContainer';

import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';

import { Button } from '../../../components/ui/button';

import { Badge } from '../../../components/ui/badge';

import { FileText, Send, Clock, DollarSign, Loader2 } from 'lucide-react';

import api from '../../../lib/api';

import { useVenue } from '../../../context/VenueContext';

export default function RFQManagement() {
    const { activeVenue } = useVenue();
    const [rfqs, setRfqs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (activeVenue?.id) loadRfqs();
    }, [activeVenue?.id]);

    const loadRfqs = async () => {
        try {
            const res = await api.get('/procurement/rfqs', { params: { venue_id: activeVenue.id } });
            setRfqs(res.data.rfqs || []);
        } catch (err) {
            logger.warn('Failed to load RFQs');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <PageContainer title="Request for Quotation (RFQ)" description="Manage supplier bidding and procurement requests">
                <div className="flex items-center justify-center py-16">
                    <Loader2 className="w-8 h-8 animate-spin text-zinc-500" />
                </div>
            </PageContainer>
        );
    }

    return (
        <PageContainer
            title="Request for Quotation (RFQ)"
            description="Manage supplier bidding and procurement requests"
            actions={<Button className="bg-blue-600"><FileText className="w-4 h-4 mr-2" /> Create RFQ</Button>}
        >
            <div className="grid grid-cols-1 gap-4">
                {rfqs.length === 0 ? (
                    <Card className="bg-zinc-900 border-white/10">
                        <CardContent className="p-12 text-center text-zinc-500">
                            No RFQs found. Create one to start the bidding process.
                        </CardContent>
                    </Card>
                ) : rfqs.map(rfq => (
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
                                    <span className="flex items-center gap-1 text-green-400"><DollarSign className="w-4 h-4" /> {rfq.bids || 0} Bids Received</span>
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