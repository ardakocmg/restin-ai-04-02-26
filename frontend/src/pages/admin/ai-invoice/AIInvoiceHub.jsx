
import React, { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';

import PageContainer from '../../../layouts/PageContainer';

import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';

import { Button } from '../../../components/ui/button';

import { Upload, Scan, FileText, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';

import api from '../../../lib/api';

import { useVenue } from '../../../context/VenueContext';

export default function AIInvoiceHub() {
    const { activeVenue } = useVenue();
    const [scanning, setScanning] = useState(false);
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (activeVenue?.id) loadInvoices();
    }, [activeVenue?.id]);

    const loadInvoices = async () => {
        try {
            const res = await api.get(`/venues/${activeVenue.id}/invoices/ai`);
            const data = Array.isArray(res.data) ? res.data : [];
            setInvoices(data.map(inv => ({
                id: inv.invoice_number || inv.id,
                supplier: inv.supplier_name || 'Unknown',
                amount: `€${(inv.total_amount || 0).toFixed(2)}`,
                status: inv.status || 'pending',
                confidence: inv.ocr_confidence || 0,
                date: (inv.created_at || inv.invoice_date || '').split('T')[0]
            })));
        } catch (err) {
            logger.warn('Failed to load AI invoices');
        } finally {
            setLoading(false);
        }
    };

    const handleScan = () => {
        // In production, this would open a file picker and send to OCR endpoint
        setScanning(true);
        setTimeout(() => {
            setScanning(false);
            // Reload invoices after scan would complete
            if (activeVenue?.id) loadInvoices();
        }, 2000);
    };

    return (
        <PageContainer
            title="AI Invoice Processing"
            description="Automated OCR and Line-Item Extraction"
        >
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Upload Zone */}
                <Card className="bg-zinc-900 border-white/10 lg:col-span-2">
                    <CardHeader><CardTitle className="text-white">Upload Invoices</CardTitle></CardHeader>
                    <CardContent className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-zinc-700 rounded-xl bg-zinc-950/50">
                        {scanning ? (
                            <div className="text-center">
                                <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4 mx-auto" />
                                <p className="text-blue-400 font-medium">Analyzing document structure...</p>
                                <p className="text-zinc-500 text-sm mt-2">Extracting Line Items & Tax</p>
                            </div>
                        ) : (
                            <div className="text-center">
                                <Scan className="w-12 h-12 text-zinc-500 mb-4 mx-auto" />
                                <p className="text-zinc-300 font-medium text-lg">Drag & Drop Invoices Here</p>
                                <p className="text-zinc-500 text-sm mt-2 mb-6">Support for PDF, JPG, PNG</p>
                                <Button onClick={handleScan} className="bg-white text-black hover:bg-zinc-200">
                                    <Upload className="w-4 h-4 mr-2" /> Select Files
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Processing Queue */}
                <Card className="bg-zinc-900 border-white/10">
                    <CardHeader><CardTitle className="text-white">Recent Activity</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        {loading ? (
                            <div className="text-center py-8">
                                <Loader2 className="w-6 h-6 animate-spin mx-auto text-zinc-500" />
                            </div>
                        ) : invoices.length === 0 ? (
                            <p className="text-zinc-500 text-center py-8">No invoices processed yet</p>
                        ) : invoices.map(inv => (
                            <div key={inv.id} className="p-3 bg-zinc-950 rounded-lg border border-white/5 flex items-center justify-between">
                                <div>
                                    <div className="font-medium text-white">{inv.supplier}</div>
                                    <div className="text-xs text-zinc-500">{inv.id} • {inv.date}</div>
                                </div>
                                <div className="text-right">
                                    <div className="font-bold text-white">{inv.amount}</div>
                                    <div className={`text-[10px] flex items-center justify-end gap-1 ${inv.status === 'matched' || inv.status === 'approved' || inv.status === 'ocr_complete' ? 'text-green-500' : 'text-orange-500'}`}>
                                        {inv.status === 'matched' || inv.status === 'approved' || inv.status === 'ocr_complete' ? <CheckCircle className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                                        {(inv.confidence * 100).toFixed(0)}%
                                    </div>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>
        </PageContainer>
    );
}