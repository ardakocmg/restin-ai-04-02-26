import React, { useState, useRef, useEffect } from 'react';
import { Card } from '../ui/card';
import { cn } from '../../lib/utils';
import { Users, Timer, Receipt } from 'lucide-react';

interface TableData {
    id: string;
    name: string;
    status: 'FREE' | 'OCCUPIED' | 'BILL_PRINTED' | 'RESERVED';
    shape?: 'CIRCLE' | 'RECTANGLE';
    position?: { x: number; y: number };
    width?: number;
    height?: number;
    seats?: number;
    active_orders?: unknown[];
}

interface FloorPlanWidgetProps {
    tables: TableData[];
    onTableSelect: (table: TableData) => void;
    onTableMove?: (tableId: string, position: { x: number; y: number }) => void;
}

export default function FloorPlanWidget({ tables, onTableSelect, onTableMove }: FloorPlanWidgetProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [draggingId, setDraggingId] = useState<string | null>(null);
    const [localTables, setLocalTables] = useState<TableData[]>(tables);
    const [offset, setOffset] = useState({ x: 0, y: 0 });

    useEffect(() => {
        setLocalTables(tables);
    }, [tables]);

    const handleDragStart = (e: React.MouseEvent<HTMLDivElement>, table: TableData) => {
        if (!onTableMove) return;

        setDraggingId(table.id);
        const rect = e.currentTarget.getBoundingClientRect();
        setOffset({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        });
    };

    const handleDragEnd = () => {
        setDraggingId(null);
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (draggingId && onTableMove && containerRef.current) {
            const containerRect = containerRef.current.getBoundingClientRect();
            const x = e.clientX - containerRect.left - offset.x;
            const y = e.clientY - containerRect.top - offset.y;

            // Snap to grid 10px
            const snappedX = Math.round(x / 10) * 10;
            const snappedY = Math.round(y / 10) * 10;

            onTableMove(draggingId, { x: snappedX, y: snappedY });
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'OCCUPIED': return 'bg-red-500/20 border-red-500 text-red-600 dark:text-red-400 hover:bg-red-500/30';
            case 'BILL_PRINTED': return 'bg-yellow-500/20 border-yellow-500 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-500/30';
            case 'RESERVED': return 'bg-blue-500/20 border-blue-500 text-blue-600 dark:text-blue-400 hover:bg-blue-500/30';
            default: return 'bg-green-500/20 border-green-500 text-green-600 dark:text-green-400 hover:bg-green-500/30';
        }
    };

    return (
        <div
            ref={containerRef}
            className="relative w-full h-full min-h-[600px] bg-background/50 rounded-xl border-2 border-dashed border-border overflow-hidden"
            onMouseMove={handleMouseMove}
            onMouseUp={handleDragEnd}
            onMouseLeave={handleDragEnd}
        >
            {/* Grid Background */}
            <div className="absolute inset-0 opacity-10 pointer-events-none"
                style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '20px 20px'  /* keep-inline */ }} /* keep-inline */ /* keep-inline */
            />

            {localTables.map(table => {
                const x = table.position?.x || (parseInt(table.id) * 100) % 800 + 50;
                const y = table.position?.y || Math.floor((parseInt(table.id) * 100) / 800) * 100 + 50;

                return (
                    <div
                        key={table.id}
                        className={cn(
                            "absolute cursor-pointer transition-colors duration-200 backdrop-blur-sm border-2 rounded-xl flex flex-col items-center justify-center shadow-lg select-none",
                            getStatusColor(table.status),
                            table.shape === 'CIRCLE' ? 'rounded-full' : 'rounded-lg'
                        )}
                        style={{ /* keep-inline */
                            left: x,
                            top: y,
                            width: table.width || 120,
                            height: table.height || 120,
                            zIndex: draggingId === table.id ? 50 : 1
                         /* keep-inline */ }} /* keep-inline */ /* keep-inline */
                        onMouseDown={(e) => handleDragStart(e, table)}
                        onClick={() => !onTableMove && onTableSelect(table)}
                    >
                        <div className="font-bold text-lg">{table.name}</div>

                        {table.status !== 'FREE' && (
                            <div className="flex items-center gap-2 text-xs mt-1 font-mono">
                                {table.status === 'OCCUPIED' && <Timer className="w-3 h-3 animate-pulse" />}
                                {table.status === 'BILL_PRINTED' && <Receipt className="w-3 h-3" />}
                                <span>{table.active_orders?.length || 0} Orders</span>
                            </div>
                        )}

                        <div className="absolute top-2 right-2 opacity-50">
                            <Users className="w-3 h-3" />
                            <span className="text-[10px] ml-1">{table.seats}</span>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
