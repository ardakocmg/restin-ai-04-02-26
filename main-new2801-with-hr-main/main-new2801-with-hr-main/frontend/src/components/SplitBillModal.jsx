import React, { useState } from 'react';
import { X, Users, CheckCircle2, Split, ArrowRight } from 'lucide-react';

export default function SplitBillModal({ order, items, onClose, onSplit }) {
    const [splitType, setSplitType] = useState('items'); // 'items' or 'seats'
    const [selectedItems, setSelectedItems] = useState([]);
    const [seats, setSeats] = useState(2);

    const handleItemToggle = (itemId) => {
        if (selectedItems.includes(itemId)) {
            setSelectedItems(selectedItems.filter(id => id !== itemId));
        } else {
            setSelectedItems([...selectedItems, itemId]);
        }
    };

    const calculateSplitTotal = () => {
        if (splitType === 'items') {
            return items
                .filter(item => selectedItems.includes(item.id))
                .reduce((sum, item) => sum + (item.pricing?.line_total || 0), 0);
        } else {
            return (order?.totals?.grand_total || 0) / seats;
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
            <div
                className="absolute inset-0 bg-black/70 backdrop-blur-md"
                onClick={onClose}
            />

            <div className="relative z-10 w-full max-w-2xl bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/10 bg-zinc-900/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                            <Split className="w-5 h-5 text-blue-500" />
                        </div>
                        <div>
                            <h2 className="text-xl font-heading text-white">Split Bill</h2>
                            <p className="text-sm text-zinc-400">Total: €{order?.totals?.grand_total?.toFixed(2)}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg text-zinc-400">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    {/* Split Method Tabs */}
                    <div className="flex gap-2 p-1 bg-zinc-800/50 rounded-xl mb-6">
                        <button
                            onClick={() => setSplitType('items')}
                            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${splitType === 'items'
                                    ? 'bg-zinc-700 text-white shadow-sm'
                                    : 'text-zinc-400 hover:text-white'
                                }`}
                        >
                            Split by Items
                        </button>
                        <button
                            onClick={() => setSplitType('seats')}
                            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${splitType === 'seats'
                                    ? 'bg-zinc-700 text-white shadow-sm'
                                    : 'text-zinc-400 hover:text-white'
                                }`}
                        >
                            Split Equally
                        </button>
                    </div>

                    {splitType === 'items' ? (
                        <div className="space-y-4">
                            <div className="text-sm text-zinc-400 mb-2">Select items to split:</div>
                            <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2">
                                {items.map(item => (
                                    <button
                                        key={item.id}
                                        onClick={() => handleItemToggle(item.id)}
                                        className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all ${selectedItems.includes(item.id)
                                                ? 'bg-blue-500/10 border-blue-500/50'
                                                : 'bg-zinc-800/30 border-white/5 hover:border-white/10'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${selectedItems.includes(item.id)
                                                    ? 'bg-blue-500 border-blue-500'
                                                    : 'border-zinc-600'
                                                }`}>
                                                {selectedItems.includes(item.id) && <CheckCircle2 className="w-3 h-3 text-white" />}
                                            </div>
                                            <div className="text-left">
                                                <div className="text-white font-medium">{item.menu_item_name}</div>
                                                {item.modifiers?.length > 0 && (
                                                    <div className="text-xs text-zinc-500">
                                                        +{item.modifiers.length} modifiers
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="font-bold text-white">€{item.pricing?.line_total?.toFixed(2)}</div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="py-8 flex flex-col items-center justify-center">
                            <div className="text-zinc-400 mb-4">How many people?</div>
                            <div className="flex items-center gap-6">
                                <button
                                    onClick={() => setSeats(Math.max(2, seats - 1))}
                                    className="w-12 h-12 rounded-xl bg-zinc-800 border border-white/10 flex items-center justify-center hover:bg-zinc-700 text-white"
                                >
                                    -
                                </button>
                                <div className="text-4xl font-bold text-white w-16 text-center">{seats}</div>
                                <button
                                    onClick={() => setSeats(seats + 1)}
                                    className="w-12 h-12 rounded-xl bg-zinc-800 border border-white/10 flex items-center justify-center hover:bg-zinc-700 text-white"
                                >
                                    +
                                </button>
                            </div>
                            <div className="mt-8 p-4 bg-zinc-800/50 rounded-xl border border-white/5 text-center">
                                <div className="text-sm text-zinc-400">Each person pays</div>
                                <div className="text-2xl font-bold text-blue-500">€{(order?.totals?.grand_total / seats).toFixed(2)}</div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-white/10 bg-zinc-900/50 flex justify-between items-center">
                    <div>
                        <div className="text-sm text-zinc-400">Total Selected</div>
                        <div className="text-xl font-bold text-white">€{calculateSplitTotal().toFixed(2)}</div>
                    </div>
                    <button
                        onClick={() => onSplit(splitType, splitType === 'items' ? selectedItems : seats)}
                        disabled={splitType === 'items' && selectedItems.length === 0}
                        className="px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold flex items-center gap-2 transition-all"
                    >
                        Proceed to Payment
                        <ArrowRight className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </div>
    );
}
