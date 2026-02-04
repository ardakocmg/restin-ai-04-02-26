import React, { useEffect, useState } from 'react';
import { calculateTicketAging } from '../logic/aging';
import { format } from 'date-fns';
import { type LocalOrder } from '../../../../lib/db';

// Rule #15: High-Contrast / Readable from 2m

interface TicketCardProps {
    order: LocalOrder;
    onBump: (id: string) => void;
}

export const TicketCard: React.FC<TicketCardProps> = ({ order, onBump }) => {
    // Force re-render every minute to update aging
    const [_, setTick] = useState(0);
    useEffect(() => {
        const i = setInterval(() => setTick(t => t + 1), 60000);
        return () => clearInterval(i);
    }, []);

    const { colorClass, severity, elapsedMinutes, isFlashing } = calculateTicketAging(order.createdAt);

    // Group Items by Course (Simulated for MVP: just split by index or mock course data)
    // OrderSchema has 'course' field on items
    const starters = order.items.filter(i => i.course === 1);
    const mains = order.items.filter(i => i.course === 2);
    // Fallback for uncoursed
    const others = order.items.filter(i => !i.course || i.course > 2);

    return (
        <div className={`
            flex flex-col bg-zinc-900 rounded-xl border-t-8 overflow-hidden 
            w-80 flex-shrink-0 h-[500px] transition-all duration-500
            ${colorClass}
            ${isFlashing ? 'animate-pulse' : ''}
        `}>
            {/* Header */}
            <div className="flex justify-between items-center p-4 border-b border-zinc-800 bg-zinc-900">
                <div>
                    <h2 className="text-2xl font-black text-white">#{order.id.slice(0, 4)}</h2>
                    <span className="text-zinc-400 font-mono text-sm">
                        {order.tableId ? `TBL ${order.tableId}` : 'TAKEAWAY'}
                    </span>
                </div>
                <div className="flex flex-col items-end">
                    <span className={`text-2xl font-bold font-mono ${severity === 'CRITICAL' ? 'text-red-500' : 'text-zinc-300'}`}>
                        {elapsedMinutes}m
                    </span>
                    <span className="text-xs text-zinc-500">{format(order.createdAt, 'HH:mm')}</span>
                </div>
            </div>

            {/* Content Groups */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">

                {starters.length > 0 && (
                    <div className="space-y-2">
                        <div className="text-xs font-bold text-blue-400 uppercase tracking-widest border-b border-blue-900/50 pb-1 mb-2">
                            Starters (Course 1)
                        </div>
                        {starters.map((item, idx) => (
                            <TicketLine key={idx} item={item} />
                        ))}
                    </div>
                )}

                {mains.length > 0 && (
                    <div className="space-y-2">
                        <div className="text-xs font-bold text-orange-400 uppercase tracking-widest border-b border-orange-900/50 pb-1 mb-2">
                            Mains (Course 2)
                        </div>
                        {mains.map((item, idx) => (
                            <TicketLine key={idx} item={item} />
                        ))}
                    </div>
                )}

                {others.length > 0 && (
                    <div className="space-y-2">
                        {others.map((item, idx) => (
                            <TicketLine key={idx} item={item} />
                        ))}
                    </div>
                )}
            </div>

            {/* Footer / Actions */}
            <div className="p-4 bg-zinc-950 border-t border-zinc-900">
                <button
                    onClick={() => onBump(order.id)}
                    className="w-full h-14 bg-zinc-800 hover:bg-zinc-700 active:bg-green-600 text-white font-bold text-xl rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                    ✅ BUMP TICKET
                </button>
            </div>
        </div>
    );
};

const TicketLine = ({ item }: { item: any }) => (
    <div className="flex items-start gap-3">
        <span className="font-bold text-xl text-white w-6 text-right">{item.quantity}</span>
        <div className="flex-1">
            <span className="text-lg font-medium text-zinc-200 leading-tight block">{item.name}</span>
            {item.notes && <span className="text-red-400 text-sm italic block">Note: {item.notes}</span>}
        </div>
    </div>
);
