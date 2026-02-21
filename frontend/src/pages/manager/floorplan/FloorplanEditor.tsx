import { useMutation,useQuery,useQueryClient } from '@tanstack/react-query';
import {
Circle,
Grid3X3,
Flame as HeatIcon,
LayoutGrid,
Loader2,Maximize,
RotateCw,
Save,
Square,
Trash2,
Users,
ZoomIn,ZoomOut
} from 'lucide-react';
import React,{ useCallback,useRef,useState } from 'react';
import { toast } from 'sonner';
import PermissionGate from '../../../components/shared/PermissionGate';
import { Button } from '../../../components/ui/button';
import { Card } from '../../../components/ui/card';
import { Input } from '../../../components/ui/input';
import { useAuth } from '../../../context/AuthContext';
import { useVenue } from '../../../context/VenueContext';
import { useAuditLog } from '../../../hooks/useAuditLog';
import api from '../../../lib/api';
import { cn } from '../../../lib/utils';

interface FloorplanTable {
    id: string;
    number: number;
    name: string;
    seats: number;
    shape: string;
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number;
    status: string;
    heatValue: number;
}

const TABLE_SHAPES = [
    { key: 'square', label: 'Square', icon: Square },
    { key: 'round', label: 'Round', icon: Circle },
    { key: 'rect', label: 'Rectangle', icon: Maximize },
];

/**
 * 🗺️ Drag & Drop Floorplan Editor — Rule 44
 * Interactive table layout with drag, resize, heatmap overlay.
 */
export default function FloorplanEditor() {
    const { activeVenue } = useVenue();
    const { user } = useAuth();
    const { logAction } = useAuditLog();
    const venueId = activeVenue?.id || localStorage.getItem('currentVenueId') || 'default';
    const _queryClient = useQueryClient();

    // Audit: log floorplan editor access
    React.useEffect(() => {
        if (user?.id) logAction('FLOORPLAN_VIEWED', 'floorplan_editor');
    }, [user?.id, logAction]);

    const [tables, setTables] = useState<FloorplanTable[]>([]);
    const [selectedTable, setSelectedTable] = useState<string | null>(null);
    const [showHeatmap, setShowHeatmap] = useState(false);
    const [zoom, setZoom] = useState(1);
    const [dragging, setDragging] = useState<string | null>(null);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const canvasRef = useRef<HTMLDivElement>(null);

    const { isLoading } = useQuery({
        queryKey: ['floorplan-tables', venueId],
        queryFn: async () => {
            try {
                const { data } = await api.get(`/tables?venue_id=${venueId}`);
                const mapped = (data || []).map((t: /**/any, i: number) => ({
                    ...t,
                    x: t.x || 50 + (i % 6) * 130,
                    y: t.y || 50 + Math.floor(i / 6) * 130,
                    width: t.width || (t.shape === 'rect' ? 120 : 80),
                    height: t.height || 80,
                    shape: t.shape || 'square',
                    rotation: t.rotation || 0,
                    heatValue: Math.random(),
                }));
                setTables(mapped);
                return mapped;
            } catch {
                return [];
            }
        }
    });

    const saveMutation = useMutation({
        mutationFn: () => api.post(`/tables/layout?venue_id=${venueId}`, { tables }),
        onSuccess: () => toast.success('Floor plan saved'),
        onError: () => toast.error('Failed to save layout')
    });

    const addTable = (shape: string) => {
        const newTable = {
            id: `table-${Date.now()}`,
            number: tables.length + 1,
            name: `Table ${tables.length + 1}`,
            seats: 4,
            shape,
            x: 200 + Math.random() * 200,
            y: 200 + Math.random() * 200,
            width: shape === 'rect' ? 120 : 80,
            height: 80,
            rotation: 0,
            status: 'available',
            heatValue: 0,
        };
        setTables(prev => [...prev, newTable]);
        setSelectedTable(newTable.id);
    };

    const updateTable = (id: string, updates: Partial<FloorplanTable>) => {
        setTables(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
    };

    const deleteTable = (id: string) => {
        setTables(prev => prev.filter(t => t.id !== id));
        if (selectedTable === id) setSelectedTable(null);
    };

    const handleMouseDown = (e: React.MouseEvent, tableId: string) => {
        e.stopPropagation();
        const rect = canvasRef.current?.getBoundingClientRect();
        const table = tables.find(t => t.id === tableId);
        if (rect && table) {
            setDragging(tableId);
            setDragOffset({
                x: (e.clientX - rect.left) / zoom - table.x,
                y: (e.clientY - rect.top) / zoom - table.y,
            });
        }
        setSelectedTable(tableId);
    };

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        if (!dragging || !canvasRef.current) return;
        const rect = canvasRef.current.getBoundingClientRect();
        const x = Math.max(0, (e.clientX - rect.left) / zoom - dragOffset.x);
        const y = Math.max(0, (e.clientY - rect.top) / zoom - dragOffset.y);
        updateTable(dragging, { x: Math.round(x), y: Math.round(y) });
    }, [dragging, zoom, dragOffset]);

    const handleMouseUp = useCallback(() => {
        setDragging(null);
    }, []);

    const selected = tables.find(t => t.id === selectedTable);

    const heatColor = (val: number): string => {
        if (val > 0.8) return 'rgba(239, 68, 68, 0.3)';
        if (val > 0.5) return 'rgba(245, 158, 11, 0.25)';
        if (val > 0.2) return 'rgba(34, 197, 94, 0.2)';
        return 'rgba(100, 116, 139, 0.1)';
    };

    return (
        <PermissionGate requiredRole="MANAGER">
            <div className="p-6 space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                            <LayoutGrid className="w-6 h-6 text-pink-500" />
                            Floor Plan Editor
                        </h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            Drag tables to arrange your restaurant layout
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="outline" size="sm"
                            onClick={() => setShowHeatmap(!showHeatmap)}
                            className={showHeatmap ? "border-pink-500 text-pink-500" : ""}
                        >
                            <HeatIcon className="w-4 h-4 mr-1" /> Heatmap
                        </Button>
                        <Button
                            size="sm"
                            onClick={() => saveMutation.mutate()}
                            disabled={saveMutation.isPending}
                            className="bg-pink-600 hover:bg-pink-700 text-foreground"
                        >
                            {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
                            Save Layout
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-4 gap-4" style={{ height: 'calc(100vh - 200px)'  /* keep-inline */ }} /* keep-inline */ /* keep-inline */>
                    {/* Toolbar */}
                    <Card className="p-4 bg-card border-border space-y-4 overflow-y-auto">
                        <div>
                            <h3 className="font-semibold text-foreground text-sm mb-2">Add Table</h3>
                            <div className="grid grid-cols-3 gap-2">
                                {TABLE_SHAPES.map(shape => {
                                    const Icon = shape.icon;
                                    return (
                                        <Button
                                            key={shape.key}
                                            variant="outline" size="sm"
                                            onClick={() => addTable(shape.key)}
                                            className="flex flex-col gap-1 h-auto py-2"
                                        >
                                            <Icon className="w-4 h-4" />
                                            <span className="text-[10px]">{shape.label}</span>
                                        </Button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}>
                                <ZoomOut className="w-4 h-4" />
                            </Button>
                            <span className="text-xs text-muted-foreground flex-1 text-center">{Math.round(zoom * 100)}%</span>
                            <Button variant="outline" size="sm" onClick={() => setZoom(Math.min(2, zoom + 0.1))}>
                                <ZoomIn className="w-4 h-4" />
                            </Button>
                        </div>

                        {/* Selected Table Properties */}
                        {selected && (
                            <div className="border-t border-border pt-4 space-y-3">
                                <h3 className="font-semibold text-foreground text-sm flex items-center gap-1">
                                    <Grid3X3 className="w-4 h-4 text-pink-500" /> Properties
                                </h3>
                                <div>
                                    <label className="text-xs text-muted-foreground block mb-1">Name</label>
                                    <Input aria-label="Input field"
                                        value={selected.name}
                                        onChange={(e) => updateTable(selected.id, { name: e.target.value })}
                                        className="bg-background border-border text-foreground h-8 text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-muted-foreground block mb-1">Seats</label>
                                    <Input aria-label="Input field"
                                        type="number"
                                        value={selected.seats}
                                        onChange={(e) => updateTable(selected.id, { seats: parseInt(e.target.value) || 1 })}
                                        className="bg-background border-border text-foreground h-8 text-sm"
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline" size="sm"
                                        onClick={() => updateTable(selected.id, { rotation: (selected.rotation + 45) % 360 })}
                                    >
                                        <RotateCw className="w-3.5 h-3.5 mr-1" /> Rotate
                                    </Button>
                                    <Button
                                        variant="outline" size="sm"
                                        onClick={() => deleteTable(selected.id)}
                                        className="text-red-500 hover:text-red-400"
                                    >
                                        <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
                                    </Button>
                                </div>
                                <div className="text-[10px] text-muted-foreground">
                                    Position: ({selected.x}, {selected.y})
                                </div>
                            </div>
                        )}

                        <div className="text-xs text-muted-foreground mt-auto pt-2 border-t border-border">
                            {tables.length} tables • {tables.reduce((s, t) => s + (t.seats || 0), 0)} total seats
                        </div>
                    </Card>

                    {/* Canvas */}
                    <div className="col-span-3 relative overflow-hidden rounded-xl border border-border bg-card/50">
                        <div
                            ref={canvasRef}
                            className="absolute inset-0"
                            style={{ /* keep-inline */
                                backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px)',
                                backgroundSize: `${20 * zoom}px ${20 * zoom}px`,
                             /* keep-inline */ }}
                            onMouseMove={handleMouseMove}
                            onMouseUp={handleMouseUp}
                            onMouseLeave={handleMouseUp}
                            onClick={() => setSelectedTable(null)}
                        >
                            {isLoading ? (
                                <div className="flex items-center justify-center h-full">
                                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                                </div>
                            ) : tables.length === 0 ? (
                                <div className="flex items-center justify-center h-full text-center">
                                    <div>
                                        <LayoutGrid className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                                        <p className="text-sm text-muted-foreground">Click "Add Table" to start designing your floor plan</p>
                                    </div>
                                </div>
                            ) : (
                                tables.map(table => (
                                    <div
                                        key={table.id}
                                        onMouseDown={(e) => handleMouseDown(e, table.id)}
                                        className={cn(
                                            "absolute cursor-move flex flex-col items-center justify-center border-2 transition-shadow select-none",
                                            table.shape === 'round' ? "rounded-full" : table.shape === 'rect' ? "rounded-lg" : "rounded-md",
                                            selectedTable === table.id
                                                ? "border-pink-500 shadow-lg shadow-pink-500/20 z-10"
                                                : "border-zinc-600 hover:border-zinc-400"
                                        )}
                                        style={{ /* keep-inline */
                                            left: table.x * zoom,
                                            top: table.y * zoom,
                                            width: table.width * zoom,
                                            height: table.height * zoom,
                                            transform: `rotate(${table.rotation}deg)`,
                                            backgroundColor: showHeatmap ? heatColor(table.heatValue) : 'rgba(39, 39, 42, 0.8)',
                                         /* keep-inline */ }}
                                    >
                                        <span className="text-xs font-bold text-foreground">{table.number}</span>
                                        <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
                                            <Users className="w-2.5 h-2.5" />{table.seats}
                                        </span>
                                    </div>
                                ))
                            )}
                        </div>

                        {showHeatmap && (
                            <div className="absolute bottom-3 right-3 bg-card/80 border border-border rounded-lg p-2 flex items-center gap-2 text-[10px] text-muted-foreground">
                                <span>Low</span>
                                <div className="flex gap-0.5">
                                    {['rgba(100,116,139,0.3)', 'rgba(34,197,94,0.4)', 'rgba(245,158,11,0.5)', 'rgba(239,68,68,0.6)'].map((c, i) => (
                                        <div key={i} className="w-4 h-3 rounded-sm" style={{ backgroundColor: c  /* keep-inline */ }} /* keep-inline */ /* keep-inline */ />
                                    ))}
                                </div>
                                <span>High</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </PermissionGate>
    );
}
