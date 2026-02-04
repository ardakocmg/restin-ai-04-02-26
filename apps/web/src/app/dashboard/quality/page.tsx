'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import PageContainer from '@/components/layout/PageContainer';
import { Card, CardContent } from '@antigravity/ui';
import { ShieldCheck, ClipboardCheck } from 'lucide-react';

export default function QualityHub() {
    const router = useRouter();

    return (
        <PageContainer title="Quality & Compliance" description="HACCP and Safety Standards">
            <div className="grid gap-6 md:grid-cols-2">
                <button onClick={() => router.push('/dashboard/quality/audits')} className="text-left group">
                    <Card className="border-zinc-800 bg-zinc-900/50 hover:border-yellow-500/50 transition-colors h-full">
                        <CardContent className="p-6 flex items-start gap-4">
                            <div className="h-12 w-12 rounded-xl bg-yellow-900/20 flex items-center justify-center text-yellow-500 group-hover:bg-yellow-900/40 transition-colors">
                                <ShieldCheck className="h-6 w-6" />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-bold text-white text-lg group-hover:text-yellow-400 transition-colors">Quality Audits</h3>
                                <p className="text-zinc-400 mt-1">HACCP, Safety, and Hygiene inspections.</p>
                            </div>
                        </CardContent>
                    </Card>
                </button>
                <button onClick={() => router.push('/dashboard/quality/checklist')} className="text-left group">
                    <Card className="border-zinc-800 bg-zinc-900/50 hover:border-blue-500/50 transition-colors h-full">
                        <CardContent className="p-6 flex items-start gap-4">
                            <div className="h-12 w-12 rounded-xl bg-blue-900/20 flex items-center justify-center text-blue-500 group-hover:bg-blue-900/40 transition-colors">
                                <ClipboardCheck className="h-6 w-6" />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-bold text-white text-lg group-hover:text-blue-400 transition-colors">Digital Checklists</h3>
                                <p className="text-zinc-400 mt-1">Daily opening/closing tasks.</p>
                            </div>
                        </CardContent>
                    </Card>
                </button>
            </div>
        </PageContainer>
    );
}
