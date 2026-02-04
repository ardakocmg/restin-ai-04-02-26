'use client';

import React from 'react';
import PageContainer from '@/components/layout/PageContainer';
import { Card, CardContent, CardTitle, CardHeader } from '@antigravity/ui';
import { Badge } from '@antigravity/ui';
import { Button } from '@antigravity/ui';
import { DollarSign, MessageSquare, Mail, Globe, Zap, Settings, CheckCircle2 } from 'lucide-react';

const INTEGRATIONS = [
    { key: 'stripe', name: 'Stripe Payments', icon: DollarSign, color: 'text-purple-500', bg: 'bg-purple-900/20', status: 'connected' },
    { key: 'twilio', name: 'Twilio SMS', icon: MessageSquare, color: 'text-red-500', bg: 'bg-red-900/20', status: 'connected' },
    { key: 'sendgrid', name: 'SendGrid Email', icon: Mail, color: 'text-blue-500', bg: 'bg-blue-900/20', status: 'disconnected' },
    { key: 'openai', name: 'OpenAI Intelligence', icon: Zap, color: 'text-green-500', bg: 'bg-green-900/20', status: 'connected' },
];

export default function IntegrationsHub() {
    return (
        <PageContainer title="Integration Hub" description="Manage external API connections">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {INTEGRATIONS.map(int => {
                    const Icon = int.icon;
                    return (
                        <Card key={int.key} className="border-zinc-800 bg-zinc-900/50 hover:border-zinc-700 transition">
                            <CardHeader>
                                <div className="flex justify-between items-start">
                                    <div className="flex gap-3 items-center">
                                        <div className={`h-10 w-10 rounded-lg ${int.bg} flex items-center justify-center ${int.color}`}>
                                            <Icon className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-base text-white">{int.name}</CardTitle>
                                            <Badge variant="outline" className="mt-1 text-[10px]">{int.key}</Badge>
                                        </div>
                                    </div>
                                    {int.status === 'connected' ? (
                                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                                    ) : (
                                        <div className="h-2 w-2 rounded-full bg-zinc-600" />
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent>
                                <Button variant="outline" className="w-full mt-2">
                                    <Settings className="h-4 w-4 mr-2" /> Configure
                                </Button>
                            </CardContent>
                        </Card>
                    )
                })}
            </div>
        </PageContainer>
    );
}
