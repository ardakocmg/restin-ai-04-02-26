/**
 * QuickPayPanel — Always-visible payment panel for Express POS Layout
 * 
 * Shows running total, cash/card buttons, and smart amount suggestions.
 * Designed for speed — tap item, tap pay, done.
 * 
 * Props:
 *   total: number
 *   subtotal: number
 *   tax: number
 *   orderItems: array
 *   onHandlePayment: (method: string) => void
 *   disabled: boolean
 */

import { CreditCard, Banknote, Wallet } from "lucide-react";

export default function QuickPayPanel({ total, subtotal, tax, orderItems, onHandlePayment, disabled }) {
    const itemCount = (orderItems || []).reduce((sum, item) => sum + (item.quantity || 1), 0);

    // Smart cash amounts — round up to nearest 5, 10, 20, 50
    const smartAmounts = [];
    if (total > 0) {
        const exact = total;
        const round5 = Math.ceil(total / 5) * 5;
        const round10 = Math.ceil(total / 10) * 10;
        const round20 = Math.ceil(total / 20) * 20;
        const round50 = Math.ceil(total / 50) * 50;

        smartAmounts.push(exact);
        if (round5 > exact && !smartAmounts.includes(round5)) smartAmounts.push(round5);
        if (round10 > exact && !smartAmounts.includes(round10)) smartAmounts.push(round10);
        if (round20 > exact && !smartAmounts.includes(round20)) smartAmounts.push(round20);
        if (round50 > exact && smartAmounts.length < 4 && !smartAmounts.includes(round50)) smartAmounts.push(round50);
    }

    // Keep max 4 smart amounts
    const displayAmounts = smartAmounts.slice(0, 4);

    return (
        <div className="bg-zinc-900 border-t border-zinc-700/50 p-3 flex flex-col gap-2">
            {/* Running Total */}
            <div className="flex items-center justify-between">
                <div>
                    <span className="text-zinc-500 text-xs">{itemCount} items</span>
                    <div className="flex items-center gap-3 text-xs text-zinc-500">
                        <span>Sub: €{subtotal.toFixed(2)}</span>
                        <span>Tax: €{tax.toFixed(2)}</span>
                    </div>
                </div>
                <div className="text-right">
                    <span className="text-2xl font-bold text-white">€{total.toFixed(2)}</span>
                </div>
            </div>

            {/* Payment Buttons */}
            <div className="grid grid-cols-2 gap-2">
                <button
                    onClick={() => onHandlePayment('cash')}
                    disabled={disabled}
                    className={`
            h-14 rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-all
            ${disabled
                            ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
                            : 'bg-emerald-600 hover:bg-emerald-500 active:scale-[0.97] text-white shadow-lg shadow-emerald-600/20'
                        }
          `}
                >
                    <Banknote className="w-5 h-5" />
                    Cash
                </button>
                <button
                    onClick={() => onHandlePayment('card')}
                    disabled={disabled}
                    className={`
            h-14 rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-all
            ${disabled
                            ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
                            : 'bg-blue-600 hover:bg-blue-500 active:scale-[0.97] text-white shadow-lg shadow-blue-600/20'
                        }
          `}
                >
                    <CreditCard className="w-5 h-5" />
                    Card
                </button>
            </div>

            {/* Smart Amount Buttons (for cash) */}
            {displayAmounts.length > 0 && !disabled && (
                <div className="grid grid-cols-4 gap-1.5">
                    {displayAmounts.map((amount, i) => (
                        <button
                            key={i}
                            onClick={() => onHandlePayment('cash')}
                            className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-300 font-mono text-sm transition-colors"
                        >
                            €{amount.toFixed(2)}
                        </button>
                    ))}
                </div>
            )}

            {/* Other Payment */}
            {!disabled && (
                <button
                    onClick={() => onHandlePayment('split')}
                    className="w-full p-2 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 text-zinc-400 text-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                    <Wallet className="w-3.5 h-3.5" />
                    Split / Other
                </button>
            )}
        </div>
    );
}
