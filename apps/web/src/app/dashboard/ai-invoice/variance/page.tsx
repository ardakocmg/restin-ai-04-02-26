'use client';

import React from 'react';
import PageContainer from '@/components/layout/PageContainer';
import { Card, CardContent } from '@antigravity/ui';
import { AlertTriangle, TrendingDown } from 'lucide-react';
import { Button } from '@antigravity/ui';

export default function VariancePage() {
    return (
        <PageContainer title="Variance Analysis" description="Discrepancies between POs and Invoices">
            <div className="grid gap-4">
                <Card className="border-zinc-800 bg-zinc-900/50">
                    <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                            <div className="h-10 w-10 text-red-500 bg-red-900/20 rounded-lg flex items-center justify-center shrink-0">
                                <AlertTriangle className="h-5 w-5" />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-bold text-white">Price Mismatch - INV-002</h3>
                                <p className="text-zinc-400 text-sm mt-1">
                                    Supplier <strong>Local Farm</strong> charged <strong>$3.50/kg</strong> for Tomatoes, but the Contract Price is <strong>$2.90/kg</strong>.
                                    Total impact: <span className="text-red-400 font-mono">$42.00</span>.
                                </p>
                                <div className="mt-4 flex gap-2">
                                    <Button size="sm" className="bg-white text-black hover:bg-zinc-200">Reject Invoice</Button>
                                    <Button size="sm" variant="outline">Accept Variance</Button>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-zinc-800 bg-zinc-900/50">
                    <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                            <div className="h-10 w-10 text-yellow-500 bg-yellow-900/20 rounded-lg flex items-center justify-center shrink-0">
                                <TrendingDown className="h-5 w-5" />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-bold text-white">Quantity Shortage - INV-005</h3>
                                <p className="text-zinc-400 text-sm mt-1">
                                    Ordered <strong>50 Units</strong> of Napkins, but only received <strong>45 Units</strong>.
                                    The invoice charges for full amount.
                                </p>
                                <div className="mt-4 flex gap-2">
                                    <Button size="sm" className="bg-white text-black hover:bg-zinc-200">Request Credit Note</Button>
                                    <Button size="sm" variant="outline">Ignore</Button>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </PageContainer>
    );
}
