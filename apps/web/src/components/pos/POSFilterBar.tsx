'use client';

import React from 'react';
import { Card } from '@antigravity/ui';
import { Button } from '@antigravity/ui';
import { Calendar } from 'lucide-react';

export default function POSFilterBar() {
    return (
        <Card className="bg-zinc-900 border-zinc-800 p-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
                <span className="text-zinc-400 text-sm font-medium uppercase tracking-wider">Parameters</span>
                <Button variant="outline" className="h-9 border-zinc-700 text-zinc-300">
                    <Calendar className="mr-2 h-4 w-4" />
                    Today (Live)
                </Button>
            </div>
            <div className="flex items-center gap-2">
                {/* Stub for filters */}
            </div>
        </Card>
    );
}
