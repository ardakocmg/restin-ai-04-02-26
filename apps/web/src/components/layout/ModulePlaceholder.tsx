'use client';

import React from 'react';
import PageContainer from './PageContainer';
import { Card, CardContent } from '@antigravity/ui';
import { Construction } from 'lucide-react';

interface ModulePlaceholderProps {
    moduleName: string;
    icon?: React.ElementType;
}

export default function ModulePlaceholder({ moduleName, icon: Icon }: ModulePlaceholderProps) {
    return (
        <PageContainer title={moduleName} description={`Manage your ${moduleName.toLowerCase()} operations.`}>
            <Card className="border-dashed border-2 border-zinc-800 bg-zinc-900/20">
                <CardContent className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                    <div className="h-20 w-20 rounded-full bg-zinc-900 flex items-center justify-center border border-white/5">
                        {Icon ? <Icon className="h-10 w-10 text-zinc-500" /> : <Construction className="h-10 w-10 text-zinc-500" />}
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-xl font-bold text-white">Module Initializing</h3>
                        <p className="text-zinc-500 max-w-sm mx-auto">
                            The {moduleName} module is currently being migrated to the new architecture.
                            Data integrity checks are in progress.
                        </p>
                    </div>
                </CardContent>
            </Card>
        </PageContainer>
    );
}
