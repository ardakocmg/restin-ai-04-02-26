'use client';

import React from 'react';
import PageContainer from '@/components/layout/PageContainer';
import { Card, CardContent } from '@antigravity/ui';
import { Button } from '@antigravity/ui';
import { Wallet, Users, Calendar, Download, CheckCircle2 } from 'lucide-react';

export default function PayrollPage() {
    return (
        <PageContainer title="Payroll Engine" description="Compliance & Processing">
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <Card className="bg-zinc-900 border-zinc-800">
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest">Next Run</p>
                                <h3 className="text-2xl font-black text-white mt-1">Feb 2026</h3>
                            </div>
                            <Calendar className="h-8 w-8 text-blue-500 opacity-50" />
                        </div>
                        <div className="text-xs text-zinc-400">Target Date: 28 Feb</div>
                    </CardContent>
                </Card>
                <Card className="bg-zinc-900 border-zinc-800">
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest">Active Pax</p>
                                <h3 className="text-2xl font-black text-white mt-1">24</h3>
                            </div>
                            <Users className="h-8 w-8 text-emerald-500 opacity-50" />
                        </div>
                        <div className="text-xs text-zinc-400 flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-emerald-500" /> Verified</div>
                    </CardContent>
                </Card>
                <Card className="bg-zinc-900 border-zinc-800">
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest">Last Gross</p>
                                <h3 className="text-2xl font-black text-white mt-1">€45,230</h3>
                            </div>
                            <Wallet className="h-8 w-8 text-amber-500 opacity-50" />
                        </div>
                        <div className="text-xs text-zinc-400">Jan 2026 • Finalized</div>
                    </CardContent>
                </Card>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                <div className="p-4 border-b border-zinc-800 flex justify-between items-center">
                    <h3 className="font-bold text-white">Payroll Archives</h3>
                    <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-2" /> Export</Button>
                </div>
                <div className="p-8 text-center text-zinc-500">
                    <p>No payroll runs found for 2026 yet.</p>
                    <Button className="mt-4 bg-blue-600">Start New Cycle</Button>
                </div>
            </div>

            {/* Regulatory Exports */}
            <h3 className="text-lg font-bold text-white mt-8 mb-4">Government Compliance (Malta)</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                    { code: "FS3", title: "Payee Statement", sub: "Annual Employee Tax Form" },
                    { code: "FS5", title: "Payer Receipt", sub: "Monthly Tax Submission" },
                    { code: "FS7", title: "Annual Tax", sub: "Yearly Reconciliation" }
                ].map((doc) => (
                    <Card key={doc.code}
                        onClick={() => {
                            // Simulate download
                            import('sonner').then(({ toast }) => toast.success(`Generated ${doc.code} Report`, { description: "Download started..." }));
                        }}
                        className="bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-colors cursor-pointer active:scale-95 duration-75">
                        <CardContent className="p-6 flex items-center gap-4">
                            <div className="h-10 w-10 rounded-lg bg-zinc-800 flex items-center justify-center">
                                <span className="font-bold text-zinc-400">{doc.code}</span>
                            </div>
                            <div>
                                <h4 className="text-white font-medium">{doc.title}</h4>
                                <p className="text-xs text-zinc-500">{doc.sub}</p>
                            </div>
                            <Download className="ml-auto h-4 w-4 text-zinc-600" />
                        </CardContent>
                    </Card>
                ))}
            </div>
        </PageContainer>
    );
}
