
import React, { useState } from 'react';
import PageContainer from '../../../layouts/PageContainer';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Upload, Scan, FileText, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';

export default function AIInvoiceHub() {
    // Phase 5: Simulated AI OCR
    const [scanning, setScanning] = useState(false);
    const [invoices, setInvoices] = useState([
        { id: 'INV-001', supplier: 'Sysco Foods', amount: '$1,204.50', status: 'scanned', confidence: 0.98, date: '2026-02-05' },
        { id: 'INV-002', supplier: 'Metro Cash & Carry', amount: '$450.20', status: 'review_needed', confidence: 0.75, date: '2026-02-04' },
    ]);

    const handleScan = () => {
        setScanning(true);
        setTimeout(() => {
            setScanning(false);
            setInvoices([{
                id: `INV-${Math.floor(Math.random() * 1000)}`,
                supplier: 'Simulated Supplier',
                amount: '$88.00',
                status: 'scanned',
                confidence: 0.99,
                date: new Date().toISOString().split('T')[0]
            }, ...invoices]);
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
                        {invoices.map(inv => (
                            <div key={inv.id} className="p-3 bg-zinc-950 rounded-lg border border-white/5 flex items-center justify-between">
                                <div>
                                    <div className="font-medium text-white">{inv.supplier}</div>
                                    <div className="text-xs text-zinc-500">{inv.id} • {inv.date}</div>
                                </div>
                                <div className="text-right">
                                    <div className="font-bold text-white">{inv.amount}</div>
                                    <div className={`text-[10px] flex items-center justify-end gap-1 ${inv.status === 'scanned' ? 'text-green-500' : 'text-orange-500'}`}>
                                        {inv.status === 'scanned' ? <CheckCircle className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
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
