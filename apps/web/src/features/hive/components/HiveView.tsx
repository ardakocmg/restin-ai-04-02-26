import { Button } from '@antigravity/ui';
import React from 'react';

// Rule #40: Hive Mind (Chat) & Rule #41: Micro-Tasking

export default function HiveView() {
    return (
        <div className="grid grid-cols-2 h-screen bg-zinc-950 text-zinc-100">
            {/* LEFT: Chat Threads */}
            <div className="border-r border-zinc-800 flex flex-col">
                <div className="p-4 border-b border-zinc-800 font-bold">THE HIVE 🐝</div>
                <div className="flex-1 overflow-auto p-4 space-y-4">
                    <div className="p-3 bg-zinc-900 rounded-lg border border-zinc-800">
                        <div className="text-xs text-zinc-500">#Order123 • Kitchen</div>
                        <p>Steak needs to be medium-rare, not well done!</p>
                    </div>
                    <div className="p-3 bg-zinc-900 rounded-lg border border-zinc-800">
                        <div className="text-xs text-zinc-500">#General • Manager</div>
                        <p>Staff meeting at 4 PM.</p>
                    </div>
                </div>
                <div className="p-4 border-t border-zinc-800">
                    <input className="w-full bg-zinc-900 border border-zinc-700 rounded p-2 text-sm" placeholder="Message #General..." />
                </div>
            </div>

            {/* RIGHT: Tasks (Tinder-style) */}
            <div className="flex flex-col items-center justify-center p-12 bg-zinc-900/50">
                <div className="w-full max-w-sm aspect-[3/4] bg-white text-black rounded-3xl p-8 flex flex-col shadow-2xl">
                    <div className="flex-1">
                        <h2 className="text-2xl font-bold mb-2">Clean Coffee Machine</h2>
                        <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs">URGENT</span>
                        <p className="mt-4 text-gray-600">Daily maintenance cycle required.</p>
                    </div>
                    <div className="flex gap-4 mt-8">
                        <Button variant="destructive" className="flex-1 h-12 rounded-full">SKIP</Button>
                        <Button className="flex-1 h-12 rounded-full bg-green-600 hover:bg-green-500">DONE</Button>
                    </div>
                </div>
                <div className="mt-8 text-zinc-500 text-sm font-mono">
                    YOUR SCORE: 1,240 XP
                </div>
            </div>
        </div>
    );
}
