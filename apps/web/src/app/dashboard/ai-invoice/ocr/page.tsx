'use client';

import React, { useState } from 'react';
import PageContainer from '@/components/layout/PageContainer';
import { Card, CardContent } from '@antigravity/ui';
import { Button } from '@antigravity/ui';
import { Upload, Loader2, FileCheck } from 'lucide-react';
import { toast } from 'sonner';

export default function InvoiceOCRPage() {
    const [processing, setProcessing] = useState(false);
    const [result, setResult] = useState<any>(null);

    const handleUpload = () => {
        setProcessing(true);
        setTimeout(() => {
            setProcessing(false);
            setResult({
                invoice_number: 'INV-998877',
                supplier: 'FarmFresh Ltd.',
                total_amount: 450.25,
                line_items: 12,
                variances: [
                    { type: 'price_mismatch', description: 'Milk (Whole) exceeded contract price by 5%' }
                ]
            });
            toast.success("Invoice Processed Successfully");
        }, 2000);
    };

    return (
        <PageContainer title="Invoice OCR" description="Upload and process invoices with AI">
            <div className="grid gap-6 lg:grid-cols-2">
                <Card className="border-zinc-800 bg-zinc-900/50">
                    <CardContent className="p-8">
                        <div className="border-2 border-dashed border-zinc-700 rounded-2xl p-12 text-center hover:border-blue-500/50 transition-colors cursor-pointer" onClick={handleUpload}>
                            {processing ? (
                                <div className="flex flex-col items-center">
                                    <Loader2 className="h-12 w-12 text-blue-500 animate-spin mb-4" />
                                    <p className="text-blue-400 font-bold animate-pulse">Analyzing Document...</p>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center">
                                    <div className="h-16 w-16 bg-zinc-800 rounded-full flex items-center justify-center mb-4 text-zinc-400">
                                        <Upload className="h-8 w-8" />
                                    </div>
                                    <h3 className="text-lg font-bold text-white mb-2">Upload Invoice</h3>
                                    <p className="text-sm text-zinc-500 max-w-xs mx-auto">Click to browse or drag and drop PDF, JPG, or PNG files.</p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {result && (
                    <Card className="border-zinc-800 bg-zinc-900/50 animate-in fade-in slide-in-from-bottom-4">
                        <CardContent className="p-6 space-y-6">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="h-10 w-10 bg-green-900/20 text-green-500 rounded-full flex items-center justify-center">
                                    <FileCheck className="h-5 w-5" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-white">Analysis Complete</h3>
                                    <p className="text-xs text-zinc-500">Confidence Score: 98.5%</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-800">
                                    <p className="text-xs text-zinc-500 uppercase tracking-widest mb-1">Invoice #</p>
                                    <p className="font-mono text-white">{result.invoice_number}</p>
                                </div>
                                <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-800">
                                    <p className="text-xs text-zinc-500 uppercase tracking-widest mb-1">Total</p>
                                    <p className="font-mono text-green-400 text-lg">${result.total_amount}</p>
                                </div>
                                <div className="col-span-2 p-4 bg-zinc-950 rounded-xl border border-zinc-800">
                                    <p className="text-xs text-zinc-500 uppercase tracking-widest mb-1">Supplier</p>
                                    <p className="text-white">{result.supplier}</p>
                                </div>
                            </div>

                            {result.variances.length > 0 && (
                                <div className="bg-red-900/10 border border-red-900/30 p-4 rounded-xl">
                                    <p className="text-red-400 text-sm font-bold flex items-center gap-2 mb-2">
                                        Warnings Detected
                                    </p>
                                    {result.variances.map((v: any, i: number) => (
                                        <p key={i} className="text-xs text-red-300 ml-6 list-disc display-list-item">{v.description}</p>
                                    ))}
                                </div>
                            )}

                            <div className="flex gap-3">
                                <Button className="flex-1 bg-white text-black hover:bg-zinc-200">Approve & Pay</Button>
                                <Button variant="outline" className="flex-1">Flag for Review</Button>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </PageContainer>
    );
}
