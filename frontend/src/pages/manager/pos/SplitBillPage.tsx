import React, { useState } from 'react';
import {
    Split, Users, DollarSign, Calculator, Loader2,
    Check, Percent, Equal, UserMinus, ChevronDown,
    ChevronRight, Receipt, CreditCard, Banknote,
    Hash, ArrowRight
} from 'lucide-react';
import { Card } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { cn } from '../../../lib/utils';
import { toast } from 'sonner';

/**
 * 💰 Split Bill Advanced UI — Rule 50 / Pillar 8
 * Per-item, per-seat, equal split, and custom amount splitting.
 */
export default function SplitBillPage() {
    const [splitMode, setSplitMode] = useState('equal');
    const [guestCount, setGuestCount] = useState(2);

    // Demo order items (in cents per Rule #4)
    const [items] = useState([
        { id: 1, name: 'Grilled Seabass', price: 2800, qty: 1, assignedTo: null },
        { id: 2, name: 'Risotto Nero', price: 2200, qty: 1, assignedTo: null },
        { id: 3, name: 'Bruschetta', price: 950, qty: 2, assignedTo: null },
        { id: 4, name: 'House Wine (Bottle)', price: 3500, qty: 1, assignedTo: null },
        { id: 5, name: 'Tiramisu', price: 1100, qty: 1, assignedTo: null },
        { id: 6, name: 'Espresso', price: 350, qty: 2, assignedTo: null },
    ]);

    const [assignments, setAssignments] = useState({});
    const [customAmounts, setCustomAmounts] = useState({});

    const total = items.reduce((s, i) => s + i.price * i.qty, 0);

    const assignItem = (itemId, guestIdx) => {
        setAssignments(prev => ({ ...prev, [itemId]: guestIdx }));
    };

    const SPLIT_MODES = [
        { key: 'equal', label: 'Equal Split', icon: Equal, desc: 'Divide total equally' },
        { key: 'per-seat', label: 'Per Seat', icon: Users, desc: 'Assign items to guests' },
        { key: 'custom', label: 'Custom Amount', icon: Calculator, desc: 'Enter custom amounts' },
    ];

    const guestTotals = () => {
        if (splitMode === 'equal') {
            const perGuest = Math.floor(total / guestCount);
            const remainder = total - perGuest * guestCount;
            return Array.from({ length: guestCount }, (_, i) => ({
                label: `Guest ${i + 1}`,
                amount: perGuest + (i === 0 ? remainder : 0),
            }));
        }

        if (splitMode === 'per-seat') {
            const totals = Array.from({ length: guestCount }, (_, i) => ({
                label: `Guest ${i + 1}`,
                amount: 0,
            }));
            items.forEach(item => {
                const g = assignments[item.id];
                if (g !== undefined && g !== null && totals[g]) {
                    totals[g].amount += item.price * item.qty;
                }
            });
            // Unassigned split equally
            const unassigned = items.filter(i => assignments[i.id] === undefined || assignments[i.id] === null);
            const unassignedTotal = unassigned.reduce((s, i) => s + i.price * i.qty, 0);
            if (unassignedTotal > 0) {
                const each = Math.floor(unassignedTotal / guestCount);
                totals.forEach(t => t.amount += each);
            }
            return totals;
        }

        // Custom
        return Array.from({ length: guestCount }, (_, i) => ({
            label: `Guest ${i + 1}`,
            amount: (customAmounts[i] || 0) * 100,
        }));
    };

    const totals = guestTotals();
    const allocated = totals.reduce((s, t) => s + t.amount, 0);
    const remaining = total - allocated;

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                        <Split className="w-6 h-6 text-teal-500" />
                        Split Bill
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Advanced bill splitting — per item, per seat, or custom amounts
                    </p>
                </div>
            </div>

            {/* Mode Selector */}
            <div className="grid grid-cols-3 gap-3">
                {SPLIT_MODES.map(mode => {
                    const Icon = mode.icon;
                    return (
                        <Card
                            key={mode.key}
                            onClick={() => setSplitMode(mode.key)}
                            className={cn(
                                "p-4 cursor-pointer border-2 transition-all",
                                splitMode === mode.key
                                    ? "border-teal-500 bg-teal-500/5"
                                    : "border-border bg-card hover:border-muted-foreground/30"
                            )}
                        >
                            <div className="flex items-center gap-3">
                                <div className={cn("p-2 rounded-lg", splitMode === mode.key ? "bg-teal-500/10" : "bg-muted")}>
                                    <Icon className={cn("w-5 h-5", splitMode === mode.key ? "text-teal-500" : "text-muted-foreground")} />
                                </div>
                                <div>
                                    <div className="font-medium text-foreground">{mode.label}</div>
                                    <div className="text-xs text-muted-foreground">{mode.desc}</div>
                                </div>
                            </div>
                        </Card>
                    );
                })}
            </div>

            {/* Guest Count */}
            <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground">Number of guests:</span>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setGuestCount(Math.max(2, guestCount - 1))}>-</Button>
                    <span className="text-lg font-bold text-foreground w-8 text-center">{guestCount}</span>
                    <Button variant="outline" size="sm" onClick={() => setGuestCount(Math.min(12, guestCount + 1))}>+</Button>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
                {/* Order Items */}
                <Card className="p-5 bg-card border-border">
                    <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                        <Receipt className="w-4 h-4 text-teal-500" /> Order Items
                    </h3>
                    <div className="space-y-2">
                        {items.map(item => (
                            <div key={item.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                                <div>
                                    <div className="text-sm font-medium text-foreground">{item.name}</div>
                                    <div className="text-xs text-muted-foreground">x{item.qty}</div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-sm font-mono text-foreground">
                                        €{((item.price * item.qty) / 100).toFixed(2)}
                                    </span>
                                    {splitMode === 'per-seat' && (
                                        <div className="flex gap-1">
                                            {Array.from({ length: guestCount }, (_, i) => (
                                                <button
                                                    key={i}
                                                    onClick={() => assignItem(item.id, i)}
                                                    className={cn(
                                                        "w-7 h-7 rounded-full text-[10px] font-bold transition-all",
                                                        assignments[item.id] === i
                                                            ? "bg-teal-500 text-foreground"
                                                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                                                    )}
                                                >
                                                    {i + 1}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
                        <span className="font-semibold text-foreground">Total</span>
                        <span className="text-lg font-bold text-foreground">€{(total / 100).toFixed(2)}</span>
                    </div>
                </Card>

                {/* Guest Breakdown */}
                <Card className="p-5 bg-card border-border">
                    <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                        <Users className="w-4 h-4 text-teal-500" /> Guest Breakdown
                    </h3>
                    <div className="space-y-3">
                        {totals.map((guest, i) => (
                            <div key={i} className="bg-muted/30 rounded-lg p-3">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium text-foreground">{guest.label}</span>
                                    {splitMode === 'custom' ? (
                                        <div className="flex items-center gap-1">
                                            <span className="text-xs text-muted-foreground">€</span>
                                            <Input
                                                type="number"
                                                value={customAmounts[i] || ''}
                                                onChange={(e) => setCustomAmounts(prev => ({
                                                    ...prev,
                                                    [i]: parseFloat(e.target.value) || 0
                                                }))}
                                                className="bg-background border-border text-foreground h-7 w-20 text-sm text-right"
                                                step="0.01"
                                            />
                                        </div>
                                    ) : (
                                        <span className="text-sm font-bold text-foreground">
                                            €{(guest.amount / 100).toFixed(2)}
                                        </span>
                                    )}
                                </div>
                                {splitMode === 'per-seat' && (
                                    <div className="text-[10px] text-muted-foreground">
                                        {items.filter(it => assignments[it.id] === i).map(it => it.name).join(', ') || 'No items assigned'}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Balance Check */}
                    <div className={cn(
                        "mt-3 pt-3 border-t border-border flex items-center justify-between",
                        remaining === 0 ? "text-emerald-500" : remaining > 0 ? "text-amber-500" : "text-red-500"
                    )}>
                        <span className="text-sm">
                            {remaining === 0 ? '✅ Balanced' : remaining > 0 ? `⚠️ €${(remaining / 100).toFixed(2)} unallocated` : `❌ €${(Math.abs(remaining) / 100).toFixed(2)} over-allocated`}
                        </span>
                        <span className="text-sm font-mono">
                            €{(allocated / 100).toFixed(2)} / €{(total / 100).toFixed(2)}
                        </span>
                    </div>

                    {/* Action Buttons */}
                    <div className="mt-4 grid grid-cols-2 gap-2">
                        {totals.map((guest, i) => (
                            <Button
                                key={i} variant="outline" size="sm"
                                onClick={() => toast.success(`Payment started for ${guest.label}: €${(guest.amount / 100).toFixed(2)}`)}
                                disabled={guest.amount === 0}
                            >
                                <CreditCard className="w-3.5 h-3.5 mr-1" />
                                Pay {guest.label}
                            </Button>
                        ))}
                    </div>
                </Card>
            </div>
        </div>
    );
}
