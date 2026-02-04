'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PageContainer from '@/components/layout/PageContainer';
import { Card, CardContent } from '@antigravity/ui';
import { Upload, FileText, AlertTriangle, CheckCircle } from 'lucide-react';

const MODULES = [
    { key: 'ocr', title: 'Invoice OCR', desc: 'AI-powered invoice scanning', icon: Upload, path: '/dashboard/ai-invoice/ocr', color: 'text-blue-500' },
    { key: 'variance', title: 'Variance Analysis', desc: 'Detect price & quantity differences', icon: AlertTriangle, path: '/dashboard/ai-invoice/variance', color: 'text-yellow-500' },
    { key: 'list', title: 'Invoice List', desc: 'View all processed invoices', icon: FileText, path: '/dashboard/ai-invoice/list', color: 'text-purple-500' }
];

export default function AIInvoiceHub() {
    const router = useRouter();
    const [stats, setStats] = useState({ total: 45, pending: 8, matched: 32, variance: 5 });

    return (
        <PageContainer title="AI Payables" description="Automated Invoice Processing & Variance Detection">
            <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-4">
                    <Card className="border-blue-500/20 bg-blue-900/10"><CardContent className="p-6"><p className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-1">Total</p><p className="text-3xl font-black text-white">{stats.total}</p></CardContent></Card>
                    <Card className="border-yellow-500/20 bg-yellow-900/10"><CardContent className="p-6"><p className="text-[10px] font-black uppercase tracking-widest text-yellow-400 mb-1">Pending</p><p className="text-3xl font-black text-white">{stats.pending}</p></CardContent></Card>
                    <Card className="border-green-500/20 bg-green-900/10"><CardContent className="p-6"><p className="text-[10px] font-black uppercase tracking-widest text-green-400 mb-1">Matched</p><p className="text-3xl font-black text-white">{stats.matched}</p></CardContent></Card>
                    <Card className="border-red-500/20 bg-red-900/10"><CardContent className="p-6"><p className="text-[10px] font-black uppercase tracking-widest text-red-400 mb-1">Variances</p><p className="text-3xl font-black text-white">{stats.variance}</p></CardContent></Card>
                </div>

                <Card className="border-zinc-800 bg-zinc-900/50">
                    <CardContent className="p-6">
                        <h3 className="text-sm font-black uppercase tracking-widest text-zinc-500 mb-6">Utilities</h3>
                        <div className="grid gap-4 md:grid-cols-2">
                            {MODULES.map((m) => {
                                const Icon = m.icon;
                                return (
                                    <button
                                        key={m.key}
                                        onClick={() => router.push(m.path)}
                                        className="flex items-start gap-4 p-4 rounded-xl border border-zinc-800 bg-zinc-900 transition-all hover:bg-zinc-800/80 hover:border-blue-500/50 group text-left"
                                    >
                                        <div className="p-2 rounded-lg bg-zinc-950 border border-zinc-800 group-hover:border-blue-500/30">
                                            <Icon className={`h-6 w-6 ${m.color}`} />
                                        </div>
                                        <div>
                                            <p className="font-bold text-white group-hover:text-blue-400 transition-colors">{m.title}</p>
                                            <p className="text-xs font-medium text-zinc-500">{m.desc}</p>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </PageContainer>
    );
}
