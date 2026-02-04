import React, { useEffect } from 'react';
import { Button } from '@antigravity/ui';
import { usePOS } from '../logic/usePOS'; // We need to implement this hook wrapping the reducer

// Rule #4: Hybrid Input (Touch + Keyboard)
// Rule #36: Zero-Install / Offline Resilience

export default function POSLayout({ children }: { children: React.ReactNode }) {
    const {
        state,
        dispatch,
        // Shortcuts
        pay,
        addItem
    } = usePOS();

    // Global Key Listener
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Rule #4: Keyboard Mappings
            switch (e.key) {
                case 'F1':
                    e.preventDefault();
                    // dispatch({ type: 'NEW_ORDER' });
                    break;
                case ' ': // Space
                    if (e.ctrlKey) { // Prevent accidental spaces in inputs
                        e.preventDefault();
                        pay('CASH');
                    }
                    break;
                case 'Escape':
                    // dispatch({ type: 'VOID' }); // Or Back
                    break;
                default:
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [pay]);

    return (
        <div className="flex h-screen w-screen bg-zinc-950 text-white overflow-hidden selection:bg-none">
            {/* LEFT: Categories & Products (Touch Optimized) */}
            <div className="flex-1 flex flex-col border-r border-zinc-800">
                <div className="h-16 border-b border-zinc-800 flex items-center px-4 gap-4">
                    <div className="font-bold text-xl text-blue-500">POS TERMINAL 01</div>
                    <div className={`px-2 py-1 rounded text-xs font-bold ${navigator.onLine ? 'bg-green-900 text-green-400' : 'bg-red-900 text-red-400'}`}>
                        {navigator.onLine ? 'ONLINE' : 'OFFLINE MODE'}
                    </div>
                </div>

                <main className="flex-1 p-4 grid grid-cols-4 gap-4 overflow-y-auto content-start">
                    {/* Dynamic Grid */}
                    {children}
                </main>
            </div>

            {/* RIGHT: Ticket / Order Summary */}
            <aside className="w-[450px] bg-zinc-900 flex flex-col shadow-2xl z-10">
                {/* Header */}
                <div className="h-16 flex items-center justify-between px-6 border-b border-zinc-800 bg-zinc-900">
                    <span className="font-mono text-zinc-400">ORDER #{state.id?.slice(0, 8)}</span>
                    <span className="font-bold text-white">{state.status}</span>
                </div>

                {/* Items List (Virtualize this if > 50 items) */}
                <div className="flex-1 overflow-y-auto p-4 space-y-1">
                    {state.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between p-3 bg-zinc-800/50 rounded hover:bg-zinc-800 transition-colors cursor-pointer border-l-2 border-transparent hover:border-blue-500">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded bg-zinc-700 flex items-center justify-center font-bold text-sm">
                                    {item.quantity}
                                </div>
                                <div>
                                    <div className="font-medium">{item.name}</div>
                                    {item.status === 'HELD' && <span className="text-xs text-yellow-500">HOLD</span>}
                                    {item.status === 'Sent' && <span className="text-xs text-green-500">SENT</span>}
                                </div>
                            </div>
                            <div className="font-mono mt-1">
                                {(item.priceCents * item.quantity / 100).toFixed(2)}
                            </div>
                        </div>
                    ))}
                    {state.items.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center text-zinc-600 space-y-4">
                            <div className="w-24 h-24 rounded-full bg-zinc-800/50 flex items-center justify-center text-4xl">🧾</div>
                            <p>No items (Press F1 or Tap Product)</p>
                        </div>
                    )}
                </div>

                {/* Totals Panel */}
                <div className="p-6 bg-zinc-900 border-t border-zinc-800 space-y-4">
                    <div className="space-y-2 text-sm text-zinc-400">
                        <div className="flex justify-between">
                            <span>Subtotal</span>
                            <span>{(state.subtotal / 100).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Tax (18%)</span>
                            <span>{(state.subtotal * 0.18 / 100).toFixed(2)}</span>
                        </div>
                    </div>

                    <div className="flex justify-between items-end border-t border-zinc-700 pt-4 mb-4">
                        <span className="text-xl font-bold">Total</span>
                        <span className="text-4xl font-black text-green-400">€{(state.total / 100).toFixed(2)}</span>
                    </div>

                    {/* Action Buttons (Touch Area > 44px) */}
                    <div className="grid grid-cols-2 gap-4 h-20">
                        <Button
                            variant="secondary"
                            className="h-full text-xl font-bold rounded-xl"
                            onClick={() => dispatch({ type: 'FIRE_COURSE', course: 1 })}
                        >
                            🔥 FIRE (KITCHEN)
                        </Button>
                        <Button
                            className="h-full text-xl font-bold bg-green-600 hover:bg-green-500 rounded-xl"
                            onClick={() => pay('CASH')}
                        >
                            PAY (SPACE)
                        </Button>
                    </div>
                </div>
            </aside>
        </div>
    );
}
