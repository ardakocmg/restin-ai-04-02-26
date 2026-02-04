'use client';
import React from 'react';
import { Card } from '@antigravity/ui';
import { SlidersHorizontal } from 'lucide-react';

export default function FilterBar({ children }: any) {
    return (
        <Card className="bg-zinc-900 border-zinc-800 p-4 mb-6">
            <div className="flex items-center gap-2 mb-4 text-zinc-400 text-sm font-bold uppercase tracking-wider">
                <SlidersHorizontal className="h-4 w-4" />
                Filters
            </div>
            {children}
        </Card>
    );
}
