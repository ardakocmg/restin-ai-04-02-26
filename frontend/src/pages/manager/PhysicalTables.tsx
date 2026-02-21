import PermissionGate from '@/components/shared/PermissionGate';
import { useAuth } from '@/context/AuthContext';
import { useVenue } from '@/context/VenueContext';
import { useAuditLog } from '@/hooks/useAuditLog';
import api from '@/lib/api';
import {
Box,
LayoutGrid,List,
Move,
Music,
Plus,
Trees
} from 'lucide-react';
import React,{ useCallback,useEffect,useState } from 'react';
import { toast } from 'sonner';
import DataTable from '../../components/shared/DataTable';
import { Button } from '../../components/ui/button';
import { Card,CardContent,CardHeader,CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Tabs,TabsContent,TabsList,TabsTrigger } from '../../components/ui/tabs';
import PageContainer from '../../layouts/PageContainer';
import { cn } from '../../lib/utils';

const DECORATIONS = [
    { id: 'plant1', name: 'Plant', icon: Trees, x: 50, y: 50 },
    { id: 'violin1', name: 'Violin', icon: Music, x: 100, y: 100 },
];

export default function PhysicalTables() {
    const { user } = useAuth();
    const { activeVenue } = useVenue();
    const { logAction } = useAuditLog();

    React.useEffect(() => {
        logAction('PHYSICAL_TABLES_VIEWED', 'physical_tables', undefined, { user_id: user?.id });
    }, []);
    const [activeTab, setActiveTab] = useState('list');
    const [selectedFloor, setSelectedFloor] = useState('');
    const [tables, setTables] = useState([]);
    const [floors, setFloors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [decorations, setDecorations] = useState(DECORATIONS);
    const [searchQuery, setSearchQuery] = useState('');
    const [draggedItem, setDraggedItem] = useState(null);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [selectedTable, setSelectedTable] = useState(null);
    const [backgroundImages, setBackgroundImages] = useState({});

    // ─── Fetch tables from API ───────────────────────────────────
    const loadTables = useCallback(async () => {
        if (!activeVenue?.id) return;
        setLoading(true);
        try {
            const [tablesRes, floorsRes] = await Promise.all([
                api.get('/tables', { params: { venue_id: activeVenue.id } }),
                api.get('/tables/floors', { params: { venue_id: activeVenue.id } }),
            ]);
            setTables(tablesRes.data || []);
            const loadedFloors = floorsRes.data?.length > 0 ? floorsRes.data : ['Main Floor'];
            setFloors(loadedFloors);
            if (!selectedFloor || !loadedFloors.includes(selectedFloor)) {
                setSelectedFloor(loadedFloors[0]);
            }
        } catch (err) {
            toast.error('Failed to load tables');
            setTables([]);
            setFloors(['Main Floor']);
            if (!selectedFloor) setSelectedFloor('Main Floor');
        } finally {
            setLoading(false);
        }
    }, [activeVenue?.id]);

    useEffect(() => { loadTables(); }, [loadTables]);

    const addTable = async () => {
        if (!activeVenue?.id) return;
        const currentFloorTables = tables.filter(t => t.floor === selectedFloor);
        const maxTableNumber = Math.max(...currentFloorTables.map(t => parseInt(t.name) || 0), 0);
        const body = {
            name: (maxTableNumber + 1).toString(),
            floor: selectedFloor,
            capacity: 4,
            x: 400,
            y: 400,
            type: 'rect',
            status: 'available'
        };
        try {
            const res = await api.post('/tables', body, { params: { venue_id: activeVenue.id } });
            const newTable = res.data;
            setTables(prev => [...prev, newTable]);
            setSelectedTable(newTable);
            toast.success('Table added');
        } catch {
            toast.error('Failed to add table');
        }
    };

    const updateTablePosition = (id, x, y) => {
        setTables(prev => prev.map(t => t.id === id ? { ...t, x, y } : t));
    };

    const updateTableProperty = async (id, property, value) => {
        // Optimistic update
        setTables(prev => prev.map(t => t.id === id ? { ...t, [property]: value } : t));
        if (selectedTable?.id === id) {
            setSelectedTable(prev => ({ ...prev, [property]: value }));
        }
        try {
            await api.put(`/tables/${id}`, { [property]: value });
        } catch {
            toast.error('Failed to update table');
        }
    };

    const deleteTable = async (id) => {
        try {
            await api.delete(`/tables/${id}`);
            setTables(prev => prev.filter(t => t.id !== id));
            if (selectedTable?.id === id) {
                setSelectedTable(null);
            }
            toast.success('Table deleted');
        } catch {
            toast.error('Failed to delete table');
        }
    };

    const handleBackgroundUpload = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                setBackgroundImages(prev => ({
                    ...prev,
                    [selectedFloor]: event.target.result
                }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleMouseDown = (e, table) => {
        e.stopPropagation();
        setDragOffset({ x: 0, y: 0 });
        setDraggedItem({ type: 'table', data: table });
        setSelectedTable(table);
    };

    const handleMouseMove = (e) => {
        if (!draggedItem) return;
        const canvas = e.currentTarget;
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left - dragOffset.x;
        const y = e.clientY - rect.top - dragOffset.y;

        if (draggedItem.type === 'table') {
            updateTablePosition(draggedItem.data.id, x, y);
        }
    };

    const handleMouseUp = () => {
        setDraggedItem(null);
    };

    const handleCanvasClick = (e) => {
        if (e.target === e.currentTarget) {
            setSelectedTable(null);
        }
    };

    return (
        <PermissionGate requiredRole="MANAGER">
            <PageContainer
                title="Physical Tables"
                description="Manage table inventory and visual floorplans for Caviar & Bull."
                breadcrumb={[
                    { label: 'Management', href: '#' },
                    { label: 'Tables', href: '/manager/physical-tables' }
                ]}
                actions={
                    <div className="flex gap-3">
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="bg-card rounded-lg p-1 border border-border">
                            <TabsList className="bg-transparent border-none p-0">
                                <TabsTrigger value="list" className="data-[state=active]:bg-red-600 data-[state=active]:text-foreground rounded-md px-4 h-8 flex items-center gap-2">
                                    <List className="w-4 h-4" />
                                    List View
                                </TabsTrigger>
                                <TabsTrigger value="builder" className="data-[state=active]:bg-red-600 data-[state=active]:text-foreground rounded-md px-4 h-8 flex items-center gap-2">
                                    <LayoutGrid className="w-4 h-4" />
                                    Floorplan Builder
                                </TabsTrigger>
                            </TabsList>
                        </Tabs>
                        <Button className="bg-emerald-600 hover:bg-emerald-700 text-foreground rounded-xl px-6 font-bold" onClick={addTable}>
                            <Plus className="w-4 h-4 mr-2" />
                            Add Table
                        </Button>
                    </div>
                }
            >
                <div className="mb-6 flex items-center gap-4">
                    <div className="flex items-center gap-2 bg-card border border-border p-1 rounded-xl">
                        {floors.map(floor => (
                            <button
                                key={floor}
                                onClick={() => setSelectedFloor(floor)}
                                className={cn(
                                    "px-4 py-2 rounded-lg text-sm font-bold transition-all",
                                    selectedFloor === floor
                                        ? "bg-white/10 text-foreground"
                                        : "text-muted-foreground hover:text-secondary-foreground"
                                )}
                            >
                                {floor}
                            </button>
                        ))}
                    </div>
                </div>

                <Tabs value={activeTab} className="w-full">
                    <TabsContent value="list" className="m-0 border-none">
                        <DataTable
                            data={tables.filter(t => t.floor === selectedFloor)}
                            columns={[
                                // @ts-ignore
                                { header: 'Table', accessorKey: 'name' },
                                // @ts-ignore
                                { header: 'Floor', accessorKey: 'floor' },
                                // @ts-ignore
                                { header: 'Capacity', accessorKey: 'capacity' },
                                // @ts-ignore
                                { header: 'Type', accessorKey: 'type' },
                                // @ts-ignore
                                { header: 'Status', accessorKey: 'status' }
                            ]}
                        />
                    </TabsContent>

                    <TabsContent value="builder" className="m-0 border-none">
                        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                            <div className="space-y-6">
                                {/* Table Properties */}
                                <Card className="border-border bg-card/50 backdrop-blur-xl">
                                    <CardHeader className="py-4 border-b border-border">
                                        <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Table Properties</CardTitle>
                                    </CardHeader>
                                    <CardContent className="pt-6 space-y-6">
                                        {/* Table Name (Alphanumeric) */}
                                        <div>
                                            <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-2 block">Table Name</label>
                                            <Input aria-label="Input field"
                                                value={selectedTable?.name || ''}
                                                onChange={(e) => selectedTable && updateTableProperty(selectedTable.id, 'name', e.target.value)}
                                                placeholder="e.g. Patio-A1"
                                                className="bg-background border-border text-foreground h-9 text-sm"
                                                disabled={!selectedTable}
                                            />
                                        </div>

                                        {/* Capacity */}
                                        <div>
                                            <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-3 block">Capacity</label>
                                            <div className="grid grid-cols-3 gap-2">
                                                {[2, 4, 6, 8, 10, 12].map(cap => (
                                                    <button
                                                        key={cap}
                                                        onClick={() => selectedTable && updateTableProperty(selectedTable.id, 'capacity', cap)}
                                                        disabled={!selectedTable}
                                                        className={cn(
                                                            "h-10 rounded-lg font-bold text-sm transition-all border-2",
                                                            selectedTable?.capacity === cap
                                                                ? "bg-white/10 border-white/20 text-foreground"
                                                                : "bg-background border-border text-muted-foreground hover:border-border hover:text-muted-foreground",
                                                            !selectedTable && "opacity-50 cursor-not-allowed"
                                                        )}
                                                    >
                                                        {cap}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Shape */}
                                        <div>
                                            <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-3 block">Shape</label>
                                            <div className="grid grid-cols-2 gap-2">
                                                <button
                                                    onClick={() => selectedTable && updateTableProperty(selectedTable.id, 'type', 'rect')}
                                                    disabled={!selectedTable}
                                                    className={cn(
                                                        "h-12 rounded-lg font-bold text-xs uppercase transition-all border-2 flex items-center justify-center gap-2",
                                                        selectedTable?.type === 'rect'
                                                            ? "bg-white/10 border-white/20 text-foreground"
                                                            : "bg-background border-border text-muted-foreground hover:border-border hover:text-muted-foreground",
                                                        !selectedTable && "opacity-50 cursor-not-allowed"
                                                    )}
                                                >
                                                    <Box className="w-4 h-4" />
                                                    Rectangle
                                                </button>
                                                <button
                                                    onClick={() => selectedTable && updateTableProperty(selectedTable.id, 'type', 'round')}
                                                    disabled={!selectedTable}
                                                    className={cn(
                                                        "h-12 rounded-lg font-bold text-xs uppercase transition-all border-2 flex items-center justify-center gap-2",
                                                        selectedTable?.type === 'round'
                                                            ? "bg-white/10 border-white/20 text-foreground"
                                                            : "bg-background border-border text-muted-foreground hover:border-border hover:text-muted-foreground",
                                                        !selectedTable && "opacity-50 cursor-not-allowed"
                                                    )}
                                                >
                                                    <div className="w-4 h-4 rounded-full border-2 border-current" />
                                                    Round
                                                </button>
                                            </div>
                                        </div>

                                        {/* Status */}
                                        <div>
                                            <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-3 block">Status</label>
                                            <div className="space-y-2">
                                                <button
                                                    onClick={() => selectedTable && updateTableProperty(selectedTable.id, 'status', 'available')}
                                                    disabled={!selectedTable}
                                                    className={cn(
                                                        "w-full h-10 rounded-lg font-bold text-xs uppercase transition-all border-2 flex items-center justify-center gap-2",
                                                        selectedTable?.status === 'available'
                                                            ? "bg-emerald-600/20 border-emerald-500/30 text-emerald-400"
                                                            : "bg-background border-border text-muted-foreground hover:border-border hover:text-muted-foreground",
                                                        !selectedTable && "opacity-50 cursor-not-allowed"
                                                    )}
                                                >
                                                    Available
                                                </button>
                                                <button
                                                    onClick={() => selectedTable && updateTableProperty(selectedTable.id, 'status', 'occupied')}
                                                    disabled={!selectedTable}
                                                    className={cn(
                                                        "w-full h-10 rounded-lg font-bold text-xs uppercase transition-all border-2 flex items-center justify-center gap-2",
                                                        selectedTable?.status === 'occupied'
                                                            ? "bg-red-600/20 border-red-500/30 text-red-400"
                                                            : "bg-background border-border text-muted-foreground hover:border-border hover:text-muted-foreground",
                                                        !selectedTable && "opacity-50 cursor-not-allowed"
                                                    )}
                                                >
                                                    Occupied
                                                </button>
                                            </div>
                                        </div>

                                        {/* Custom Table Button */}
                                        <Button
                                            className="w-full bg-red-600 hover:bg-red-500 text-foreground font-black uppercase tracking-wider h-11 rounded-xl"
                                            onClick={addTable}
                                        >
                                            <Plus className="w-4 h-4 mr-2" />
                                            Custom Table
                                        </Button>
                                    </CardContent>
                                </Card>

                                {/* Unplaced Tables */}
                                <Card className="border-border bg-card/50 backdrop-blur-xl">
                                    <CardHeader className="py-4 border-b border-border">
                                        <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Unplaced Tables</CardTitle>
                                    </CardHeader>
                                    <CardContent className="pt-6">
                                        {tables.filter(t => t.floor === selectedFloor && (t.x === 0 || t.y === 0)).length === 0 ? (
                                            <p className="text-[10px] text-muted-foreground italic text-center py-4">All tables placed</p>
                                        ) : (
                                            <div className="space-y-2">
                                                {tables.filter(t => t.floor === selectedFloor && (t.x === 0 || t.y === 0)).map(t => (
                                                    <div key={t.id} className="p-3 bg-background border border-border rounded-lg flex items-center justify-between group cursor-move hover:border-red-500/30 transition-all">
                                                        <span className="text-xs font-bold text-foreground">Table {t.name}</span>
                                                        <Move className="w-3 h-3 text-muted-foreground group-hover:text-red-500" />
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>

                            <div className="lg:col-span-3 space-y-4">
                                <div
                                    className="bg-background border-4 border-zinc-900 rounded-3xl relative overflow-hidden aspect-[4/3] group shadow-2xl"
                                    onMouseMove={handleMouseMove}
                                    onMouseUp={handleMouseUp}
                                    onMouseLeave={handleMouseUp}
                                    onClick={handleCanvasClick}
                                >
                                    {/* Background Image */}
                                    {backgroundImages[selectedFloor] && (
                                        <div
                                            className="absolute inset-0 bg-cover bg-center opacity-30"
                                            style={{ backgroundImage: `url(${backgroundImages[selectedFloor]})`  /* keep-inline */ }}
                                        />
                                    )}

                                    {/* Visual Canvas Pattern */}
                                    <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 0)', backgroundSize: '40px 40px'  /* keep-inline */ }} /* keep-inline */ /* keep-inline */ />

                                    {/* Table Rendering */}
                                    {tables.filter(t => t.floor === selectedFloor && t.x !== 0).map(table => (
                                        <div
                                            key={table.id}
                                            onMouseDown={(e) => handleMouseDown(e, table)}
                                            className={cn(
                                                "absolute cursor-move transition-all hover:shadow-[0_0_20px_rgba(229,57,53,0.3)] flex items-center justify-center font-black text-foreground text-xs select-none",
                                                table.type === 'round' ? "rounded-full" : "rounded-lg",
                                                table.status === 'occupied' ? "bg-red-600/60 border-2 border-red-500" :
                                                    table.status === 'reserved' ? "bg-yellow-600/60 border-2 border-yellow-500" :
                                                        "bg-secondary border-2 border-border",
                                                selectedTable?.id === table.id && "ring-2 ring-red-500 ring-offset-2 ring-offset-zinc-950"
                                            )}
                                            style={{ /* keep-inline */
                                                width: table.capacity * 20 + 20,
                                                height: table.capacity * 20 + 20,
                                                left: table.x,
                                                top: table.y,
                                                transform: 'translate(-50%, -50%)'
                                             /* keep-inline */ }} /* keep-inline */ /* keep-inline */
                                        >
                                            {table.name}
                                        </div>
                                    ))}

                                    {/* Decorations */}
                                    {decorations.map(dec => (
                                        <div
                                            key={dec.id}
                                            className="absolute cursor-move text-muted-foreground hover:text-foreground transition-colors"
                                            style={{ left: dec.x, top: dec.y, transform: 'translate(-50%, -50%)'  /* keep-inline */ }} /* keep-inline */ /* keep-inline */
                                        >
                                            <dec.icon className="w-8 h-8 opacity-40" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>
            </PageContainer>
        </PermissionGate >
    );
}

const AssetButton = ({ icon: Icon, label }) => (
    <button className="p-3 bg-background border border-border rounded-lg hover:border-red-500/30 transition-all group flex flex-col items-center gap-2">
        <Icon className="w-5 h-5 text-muted-foreground group-hover:text-red-500" />
        <span className="text-[9px] font-bold text-muted-foreground group-hover:text-foreground uppercase">{label}</span>
    </button>
);
