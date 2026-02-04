'use client';
import React from 'react';
import { Button } from '@antigravity/ui';
import { Home } from 'lucide-react';

export default function BottomNav({ mode }: { mode: string }) {
    return (
        <div className="fixed bottom-0 left-0 right-0 bg-zinc-900 border-t border-zinc-800 p-4 flex justify-between">
            <Button variant="ghost" className="text-zinc-400"><Home className="h-6 w-6" /></Button>
            <span className="text-zinc-500 text-xs uppercase self-center">{mode} MODE</span>
        </div>
    );
}
