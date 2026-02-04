import React from 'react';
import { Button } from '@antigravity/ui';

// Rule #35: Guest Mode (Lite / App Clip)
// Must be lightweight. No heavy auth.

export default function GuestPage({ searchParams }: { searchParams: { table?: string } }) {
    const tableId = searchParams.table || '??';

    return (
        <div className="min-h-screen bg-white text-zinc-900 flex flex-col font-sans">
            {/* Minimal Header */}
            <header className="p-4 border-b flex justify-between items-center bg-white sticky top-0 z-10">
                <h1 className="font-bold text-lg">Table {tableId}</h1>
                <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center">👤</div>
            </header>

            {/* Quick Menu (Optimized for Speed) */}
            <main className="flex-1 p-4 space-y-6">

                {/* Promo / Hero */}
                <div className="bg-zinc-900 text-white rounded-2xl p-6 shadow-xl">
                    <h2 className="text-2xl font-black mb-2">Order & Pay</h2>
                    <p className="text-zinc-400 text-sm mb-4">Skip the wait. Get food instantly.</p>
                    <Button className="w-full bg-white text-black font-bold">Start Ordering</Button>
                </div>

                {/* Popular Items */}
                <div>
                    <h3 className="font-bold text-lg mb-3">Popular</h3>
                    <div className="flex gap-4 overflow-x-auto pb-4 snap-x">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="min-w-[140px] snap-center">
                                <div className="h-32 bg-zinc-100 rounded-xl mb-2"></div>
                                <div className="font-medium">Burger {i}</div>
                                <div className="text-sm text-zinc-500">€12.50</div>
                            </div>
                        ))}
                    </div>
                </div>

            </main>

            {/* Sticky Pay Action */}
            <div className="p-4 bg-white border-t safe-area-bottom">
                <Button className="w-full h-12 bg-black text-white font-bold rounded-xl flex items-center justify-center gap-2">
                     Pay / GPay
                </Button>
            </div>
        </div>
    );
}
