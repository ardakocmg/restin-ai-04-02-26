'use client';

import React, { useState } from 'react';
import PageContainer from '@/components/layout/PageContainer';
import { Card, CardContent } from '@antigravity/ui';
import { Badge } from '@antigravity/ui';
import { Button } from '@antigravity/ui';
import { ShieldCheck, Plus } from 'lucide-react';

export default function QualityAuditsPage() {
    const [audits, setAudits] = useState([
        { id: 1, type: 'HACCP', score: 98, date: '2026-02-01', auditor: 'Chef Mario', status: 'pass' },
        { id: 2, type: 'Safety', score: 85, date: '2026-02-03', auditor: 'Safety Officer', status: 'warn' },
    ]);

    return (
        <PageContainer title="Quality Audits" description="Inspection history" actions={
            <Button className="bg-yellow-600 text-white hover:bg-yellow-700">
                <Plus className="h-4 w-4 mr-2" /> New Audit
            </Button>
        }>
            <div className="space-y-4">
                {audits.map(audit => (
                    <Card key={audit.id} className="border-zinc-800 bg-zinc-900/50">
                        <CardContent className="p-6 flex items-center justify-between">
                            <div className="flex items-center gap-6">
                                <div className="h-12 w-12 rounded-xl bg-yellow-900/20 flex items-center justify-center text-yellow-500">
                                    <ShieldCheck className="h-6 w-6" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-white text-lg">{audit.type} Audit</h3>
                                    <p className="text-zinc-400 text-sm">Auditor: {audit.auditor} • {audit.date}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-8">
                                <div className="text-right">
                                    <p className="text-xs text-zinc-500 uppercase tracking-widest">Score</p>
                                    <p className={`text-xl font-mono font-bold ${audit.score >= 90 ? 'text-green-500' : 'text-yellow-500'}`}>{audit.score}%</p>
                                </div>
                                <Badge variant={audit.status === 'pass' ? 'outline' : 'destructive'} className={audit.status === 'pass' ? 'text-green-500 border-green-900' : ''}>
                                    {audit.status === 'pass' ? 'PASSED' : 'WARNING'}
                                </Badge>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </PageContainer>
    );
}
