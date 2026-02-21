import React, { useState } from 'react';
import { X, Table2, ArrowRightLeft, CheckCircle2 } from 'lucide-react';

export default function MergeTableModal({ currentTableId, activeTables, onClose, onMerge }) {
    const [selectedTable, setSelectedTable] = useState(null);
    const tables = activeTables || [
        { id: 'table-2', name: 'Table 2', status: 'occupied', guests: 3, total: 145.50 },
        { id: 'table-5', name: 'Table 5', status: 'occupied', guests: 2, total: 89.00 },
        { id: 'table-8', name: 'Table 8', status: 'occupied', guests: 4, total: 210.25 },
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
            <div
                className="absolute inset-0 bg-black/70 backdrop-blur-md"
                onClick={onClose}
            />

            <div className="relative z-10 w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-border bg-card/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                            <ArrowRightLeft className="w-5 h-5 text-purple-500" />
                        </div>
                        <div>
                            <h2 className="text-xl font-heading text-foreground">Merge Tables</h2>
                            <p className="text-sm text-muted-foreground">Merge with current table ({currentTableId})</p>
                        </div>
                    </div>
                    <button onClick={onClose} aria-label="Action" className="p-2 hover:bg-white/5 rounded-lg text-muted-foreground">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    <div className="text-sm text-muted-foreground mb-4">Select a table to merge into this order:</div>

                    <div className="max-h-[300px] overflow-y-auto space-y-3">
                        {tables.map(table => (
                            <button
                                key={table.id}
                                onClick={() => setSelectedTable(table.id)}
                                className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all ${selectedTable === table.id
                                        ? 'bg-purple-500/10 border-purple-500/50'
                                        : 'bg-secondary/30 border-border hover:border-border'
                                    }`}
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${selectedTable === table.id ? 'bg-purple-500 text-foreground' : 'bg-zinc-700 text-muted-foreground'
                                        }`}>
                                        <Table2 className="w-5 h-5" />
                                    </div>
                                    <div className="text-left">
                                        <div className="text-foreground font-medium">{table.name}</div>
                                        <div className="text-xs text-muted-foreground">{table.guests} Guests</div>
                                    </div>
                                </div>

                                <div className="text-right">
                                    <div className="font-bold text-foreground">€{table.total.toFixed(2)}</div>
                                    {selectedTable === table.id && (
                                        <div className="text-xs text-purple-400 flex items-center justify-end gap-1 mt-1">
                                            <CheckCircle2 className="w-3 h-3" /> Selected
                                        </div>
                                    )}
                                </div>
                            </button>
                        ))}

                        {tables.length === 0 && (
                            <div className="text-center py-8 text-muted-foreground">
                                No available tables to merge.
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-border bg-card/50">
                    <button
                        onClick={() => onMerge(selectedTable)}
                        disabled={!selectedTable}
                        className="w-full h-12 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-foreground rounded-xl font-bold flex items-center justify-center gap-2 transition-all"
                    >
                        Confirm Merge
                    </button>
                </div>
            </div>
        </div>
    );
}
