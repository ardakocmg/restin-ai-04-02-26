import React from 'react';
import { Button } from '@antigravity/ui';

export default function POSLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex h-screen w-screen bg-zinc-950 text-white overflow-hidden">
            {/* LEFT: Command Strip (Filters/Categories) */}
            <aside className="w-24 border-r border-zinc-800 flex flex-col items-center py-4 gap-4">
                <div className="h-12 w-12 bg-blue-600 rounded-xl flex items-center justify-center font-bold">
                    POS
                </div>
                {/* Placeholder for Quick Categories */}
                <div className="flex-1 w-full space-y-2 px-2">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="aspect-square rounded-lg bg-zinc-900 border border-zinc-800" />
                    ))}
                </div>
            </aside>

            {/* CENTER: Main Grid (Tables/Menu) */}
            <main className="flex-1 p-4 overflow-auto">
                {children}
            </main>

            {/* RIGHT: Ticket / Order Summary */}
            <aside className="w-96 border-l border-zinc-800 bg-zinc-900/50 flex flex-col">
                <div className="p-4 border-b border-zinc-800 font-mono text-xl font-bold">
                    Current Ticket
                </div>
                <div className="flex-1 p-4 space-y-2">
                    <div className="flex justify-between text-sm">
                        <span>1x Espresso</span>
                        <span>€2.50</span>
                    </div>
                </div>
                <div className="p-4 border-t border-zinc-800 bg-zinc-900">
                    <div className="flex justify-between text-2xl font-black mb-4">
                        <span>Total</span>
                        <span>€2.50</span>
                    </div>
                    <Button className="w-full h-14 text-xl bg-green-600 hover:bg-green-500">
                        PAY €2.50
                    </Button>
                </div>
            </aside>
        </div>
    );
}
