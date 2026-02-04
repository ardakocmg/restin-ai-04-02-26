'use client';

import React, { useState } from 'react';
import PageContainer from '@/components/layout/PageContainer';
import { Card, CardContent } from '@antigravity/ui';
import { Badge } from '@antigravity/ui';
import { Button } from '@antigravity/ui';
import { Shield, Plus } from 'lucide-react';

export default function ApprovalPage() {
    const [rules, setRules] = useState([
        { id: 1, name: 'Manager Approval > $1k', condition: 'amount_gt', threshold: 1000, approvers: ['Manager'], active: true },
        { id: 2, name: 'New Supplier Check', condition: 'supplier_new', threshold: null, approvers: ['Head Chef'], active: true }
    ]);

    return (
        <PageContainer title="Approval Rules" description="Configure spending limits and approval gates" actions={
            <Button className="bg-emerald-600 text-white hover:bg-emerald-700">
                <Plus className="h-4 w-4 mr-2" /> New Rule
            </Button>
        }>
            <div className="grid gap-4">
                {rules.map(rule => (
                    <Card key={rule.id} className="border-zinc-800 bg-zinc-900/50">
                        <CardContent className="p-6 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="h-10 w-10 rounded-full bg-emerald-900/20 flex items-center justify-center text-emerald-500">
                                    <Shield className="h-5 w-5" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-white">{rule.name}</h3>
                                    <p className="text-sm text-zinc-400">
                                        Condition: <span className="font-mono text-zinc-300">{rule.condition}</span>
                                        {rule.threshold && <span className="font-mono text-zinc-300"> (${rule.threshold})</span>}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="text-right hidden md:block">
                                    <div className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Approvers</div>
                                    <div className="text-sm text-white">{rule.approvers.join(', ')}</div>
                                </div>
                                <Badge className="bg-emerald-900/20 text-emerald-500 border-emerald-900/50">ACTIVE</Badge>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </PageContainer>
    );
}
