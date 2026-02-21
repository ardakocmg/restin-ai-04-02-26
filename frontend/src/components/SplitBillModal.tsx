import React, { useState } from 'react';
import { X, Users, CheckCircle2, Split, ArrowRight, ArrowLeftRight, MoveRight, Receipt } from 'lucide-react';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';

export default function SplitBillModal({ order, items, onClose, onSplit }) {
    const [splitType, setSplitType] = useState('items'); // 'items' or 'seats'
    const [selectedItems, setSelectedItems] = useState([]);
    const [seats, setSeats] = useState(2);

    // Visual Split State
    // We treat 'selectedItems' as items moved to the 'New Bill' (Right Side)
    // Unselected items remain on 'Main Bill' (Left Side)

    const handleItemToggle = (itemId) => {
        if (selectedItems.includes(itemId)) {
            setSelectedItems(selectedItems.filter(id => id !== itemId));
        } else {
            setSelectedItems([...selectedItems, itemId]);
        }
    };

    const moveAll = () => {
        if (selectedItems.length === items.length) {
            setSelectedItems([]);
        } else {
            setSelectedItems(items.map(i => i.id));
        }
    }

    const unselectedList = items.filter(i => !selectedItems.includes(i.id));
    const selectedList = items.filter(i => selectedItems.includes(i.id));

    const totalMain = unselectedList.reduce((sum, item) => sum + (item.pricing?.line_total || item.total_price || 0), 0);
    const totalSplit = selectedList.reduce((sum, item) => sum + (item.pricing?.line_total || item.total_price || 0), 0);
    const totalGrand = (order?.totals?.grand_total || 0) / (splitType === 'seats' ? seats : 1);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in text-foreground">
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-md"
                onClick={onClose}
            />

            <div className="relative z-10 w-full max-w-4xl bg-background border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-border bg-card">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-900/20">
                            <Split className="w-5 h-5 text-foreground" />
                        </div>
                        <div>
                            <h2 className="text-xl font-heading font-bold text-foreground">Split Bill</h2>
                            <p className="text-sm text-muted-foreground">Total Order: €{((order?.totals?.grand_total) || 0).toFixed(2)}</p>
                        </div>
                    </div>

                    {/* Split Type Toggle */}
                    <div className="flex bg-secondary p-1 rounded-lg">
                        <button
                            onClick={() => setSplitType('items')}
                            className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${splitType === 'items' ? 'bg-zinc-700 text-foreground shadow' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            By Items
                        </button>
                        <button
                            onClick={() => setSplitType('seats')}
                            className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${splitType === 'seats' ? 'bg-zinc-700 text-foreground shadow' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            Equally
                        </button>
                    </div>

                    <button onClick={onClose} aria-label="Action" className="p-2 hover:bg-white/10 rounded-lg text-muted-foreground hover:text-foreground transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-hidden p-6">
                    {splitType === 'items' ? (
                        <div className="flex gap-8 h-full">
                            {/* Left Receipt: Main Bill */}
                            <div className="flex-1 flex flex-col bg-card/50 rounded-xl border border-border overflow-hidden">
                                <div className="p-4 bg-card border-b border-border flex justify-between items-center">
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <Receipt className="w-4 h-4" />
                                        <span className="font-bold text-sm uppercase">Original Bill</span>
                                    </div>
                                    <div className="font-mono font-bold text-lg">€{totalMain.toFixed(2)}</div>
                                </div>
                                <ScrollArea className="flex-1 p-2">
                                    <div className="space-y-1">
                                        {unselectedList.map(item => (
                                            <button
                                                key={item.id}
                                                onClick={() => handleItemToggle(item.id)}
                                                className="w-full flex justify-between items-center p-3 rounded-lg hover:bg-secondary/50 group text-left transition-colors"
                                            >
                                                <div>
                                                    <div className="font-medium text-secondary-foreground">{item.menu_item_name || item.name}</div>
                                                    <div className="text-xs text-muted-foreground">x{item.quantity}</div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className="font-bold text-secondary-foreground">€{(item.pricing?.line_total || item.total_price || 0).toFixed(2)}</span>
                                                    <MoveRight className="w-4 h-4 text-muted-foreground group-hover:text-blue-500 transition-colors" />
                                                </div>
                                            </button>
                                        ))}
                                        {unselectedList.length === 0 && (
                                            <div className="py-12 text-center text-muted-foreground italic">Empty</div>
                                        )}
                                    </div>
                                </ScrollArea>
                            </div>

                            {/* Middle Actions */}
                            <div className="flex flex-col justify-center gap-2">
                                <Button variant="ghost" size="icon" onClick={moveAll} aria-label="Action">
                                    <ArrowLeftRight className="w-4 h-4" />
                                </Button>
                            </div>

                            {/* Right Receipt: New Split */}
                            <div className="flex-1 flex flex-col bg-blue-950/20 rounded-xl border-2 border-dashed border-blue-500/30 overflow-hidden">
                                <div className="p-4 bg-blue-900/20 border-b border-blue-500/20 flex justify-between items-center">
                                    <div className="flex items-center gap-2 text-blue-400">
                                        <Receipt className="w-4 h-4" />
                                        <span className="font-bold text-sm uppercase">New Split Bill</span>
                                    </div>
                                    <div className="font-mono font-bold text-lg text-blue-300">€{totalSplit.toFixed(2)}</div>
                                </div>
                                <ScrollArea className="flex-1 p-2">
                                    <div className="space-y-1">
                                        {selectedList.map(item => (
                                            <button
                                                key={item.id}
                                                onClick={() => handleItemToggle(item.id)}
                                                className="w-full flex justify-between items-center p-3 rounded-lg hover:bg-blue-900/20 group text-left transition-colors"
                                            >
                                                <div>
                                                    <div className="font-medium text-secondary-foreground">{item.menu_item_name || item.name}</div>
                                                    <div className="text-xs text-muted-foreground">x{item.quantity}</div>
                                                </div>
                                                <div className="font-bold text-blue-300">€{(item.pricing?.line_total || item.total_price || 0).toFixed(2)}</div>
                                            </button>
                                        ))}
                                        {selectedList.length === 0 && (
                                            <div className="py-12 text-center text-muted-foreground italic">Tap items on left to move them here</div>
                                        )}
                                    </div>
                                </ScrollArea>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center">
                            <div className="text-muted-foreground mb-4 font-bold uppercase tracking-widest text-xs">Split Equally By Heads</div>
                            <div className="flex items-center gap-8 mb-8">
                                <button
                                    onClick={() => setSeats(Math.max(2, seats - 1))}
                                    className="w-16 h-16 rounded-2xl bg-secondary border border-border flex items-center justify-center hover:bg-secondary/80 text-foreground text-2xl transition-all active:scale-95"
                                >
                                    -
                                </button>
                                <div className="flex flex-col items-center">
                                    <span className="text-6xl font-bold text-foreground">{seats}</span>
                                    <span className="text-sm text-muted-foreground uppercase font-bold mt-1">Guests</span>
                                </div>
                                <button
                                    onClick={() => setSeats(seats + 1)}
                                    className="w-16 h-16 rounded-2xl bg-secondary border border-border flex items-center justify-center hover:bg-secondary/80 text-foreground text-2xl transition-all active:scale-95"
                                >
                                    +
                                </button>
                            </div>
                            <div className="p-6 bg-card rounded-2xl border border-border text-center min-w-[200px]">
                                <div className="text-sm text-muted-foreground mb-1">Price Per Person</div>
                                <div className="text-3xl font-bold text-blue-400">€{totalGrand.toFixed(2)}</div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-border bg-card flex justify-between items-center">
                    <div>
                        <div className="text-sm text-muted-foreground">Paying Now</div>
                        <div className="text-2xl font-bold text-foreground">
                            €{(splitType === 'items' ? totalSplit : totalGrand).toFixed(2)}
                        </div>
                    </div>
                    <Button
                        onClick={() => onSplit(splitType, splitType === 'items' ? selectedItems : seats)}
                        disabled={splitType === 'items' && selectedItems.length === 0}
                        className="px-8 h-12 bg-blue-600 hover:bg-blue-500 text-foreground rounded-xl font-bold text-lg shadow-lg shadow-blue-900/20"
                    >
                        Pay This Amount
                        <ArrowRight className="w-5 h-5 ml-2" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
