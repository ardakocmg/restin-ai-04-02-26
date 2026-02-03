import React, { useState } from 'react';
import PageContainer from '../../layouts/PageContainer';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import {
    Box, Maximize2, Move, Plus, Search,
    Trash2, Undo, Redo, Save, Layers,
    LayoutGrid, List, Smartphone, Music,
    Trees, Snowflake, Heart, Users
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { cn } from '../../lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Badge } from '../../components/ui/badge';
import { toast } from 'sonner';
import { TableIcon } from 'lucide-react';
import { Calendar } from 'lucide-react';
import { Activity } from 'lucide-react';
import { Clock } from 'lucide-react';
import DataTable from '../../components/shared/DataTable';

const MOCK_TABLES = [
    // Nut Allergy Floor
    { id: '1', name: '1', floor: 'Nut Allergy', capacity: 2, x: 150, y: 150, type: 'rect', status: 'available' },
    { id: '2', name: '2', floor: 'Nut Allergy', capacity: 2, x: 250, y: 150, type: 'rect', status: 'available' },
    { id: '3', name: '3', floor: 'Nut Allergy', capacity: 4, x: 350, y: 150, type: 'rect', status: 'available' },
    { id: '4', name: '4', floor: 'Nut Allergy', capacity: 4, x: 450, y: 150, type: 'rect', status: 'available' },
    { id: '5', name: '5', floor: 'Nut Allergy', capacity: 4, x: 550, y: 150, type: 'rect', status: 'available' },
    { id: '6', name: '6', floor: 'Nut Allergy', capacity: 6, x: 650, y: 150, type: 'round', status: 'available' },
    { id: '7', name: '7', floor: 'Nut Allergy', capacity: 6, x: 750, y: 150, type: 'round', status: 'available' },
    { id: '8', name: '8', floor: 'Nut Allergy', capacity: 8, x: 150, y: 300, type: 'round', status: 'occupied' },
    { id: '9', name: '9', floor: 'Nut Allergy', capacity: 4, x: 250, y: 300, type: 'rect', status: 'available' },
    { id: '10', name: '10', floor: 'Nut Allergy', capacity: 4, x: 350, y: 300, type: 'rect', status: 'available' },
    { id: '11', name: '11', floor: 'Nut Allergy', capacity: 2, x: 450, y: 300, type: 'rect', status: 'available' },
    { id: '12', name: '12', floor: 'Nut Allergy', capacity: 2, x: 550, y: 300, type: 'rect', status: 'available' },
    { id: '13', name: '13', floor: 'Nut Allergy', capacity: 4, x: 650, y: 300, type: 'rect', status: 'available' },
    { id: '14', name: '14', floor: 'Nut Allergy', capacity: 6, x: 750, y: 300, type: 'round', status: 'available' },
    { id: '15', name: '15', floor: 'Nut Allergy', capacity: 4, x: 150, y: 450, type: 'rect', status: 'available' },
    { id: '16', name: '16', floor: 'Nut Allergy', capacity: 4, x: 250, y: 450, type: 'rect', status: 'available' },
    { id: '17', name: '17', floor: 'Nut Allergy', capacity: 6, x: 350, y: 450, type: 'round', status: 'available' },
    { id: '18', name: '18', floor: 'Nut Allergy', capacity: 8, x: 450, y: 450, type: 'round', status: 'available' },
    { id: '19', name: '19', floor: 'Nut Allergy', capacity: 2, x: 550, y: 450, type: 'rect', status: 'available' },
    { id: '20', name: '20', floor: 'Nut Allergy', capacity: 2, x: 650, y: 450, type: 'rect', status: 'available' },

    // Terrace Floor
    { id: '21', name: '1', floor: 'Terrace', capacity: 2, x: 150, y: 150, type: 'rect', status: 'available' },
    { id: '22', name: '2', floor: 'Terrace', capacity: 2, x: 250, y: 150, type: 'rect', status: 'available' },
    { id: '23', name: '3', floor: 'Terrace', capacity: 4, x: 350, y: 150, type: 'rect', status: 'available' },
    { id: '24', name: '4', floor: 'Terrace', capacity: 4, x: 450, y: 150, type: 'rect', status: 'available' },
    { id: '25', name: '5', floor: 'Terrace', capacity: 4, x: 550, y: 150, type: 'rect', status: 'available' },
    { id: '26', name: '6', floor: 'Terrace', capacity: 6, x: 650, y: 150, type: 'round', status: 'available' },
    { id: '27', name: '7', floor: 'Terrace', capacity: 6, x: 750, y: 150, type: 'round', status: 'available' },
    { id: '28', name: '8', floor: 'Terrace', capacity: 8, x: 150, y: 300, type: 'round', status: 'available' },
    { id: '29', name: '9', floor: 'Terrace', capacity: 4, x: 250, y: 300, type: 'rect', status: 'available' },
    { id: '30', name: '10', floor: 'Terrace', capacity: 4, x: 350, y: 300, type: 'rect', status: 'available' },
    { id: '31', name: '11', floor: 'Terrace', capacity: 2, x: 450, y: 300, type: 'rect', status: 'available' },
    { id: '32', name: '12', floor: 'Terrace', capacity: 2, x: 550, y: 300, type: 'rect', status: 'available' },
    { id: '33', name: '13', floor: 'Terrace', capacity: 4, x: 650, y: 300, type: 'rect', status: 'available' },
    { id: '34', name: '14', floor: 'Terrace', capacity: 6, x: 750, y: 300, type: 'round', status: 'available' },
    { id: '35', name: '15', floor: 'Terrace', capacity: 4, x: 150, y: 450, type: 'rect', status: 'available' },
    { id: '36', name: '16', floor: 'Terrace', capacity: 4, x: 250, y: 450, type: 'rect', status: 'available' },
    { id: '37', name: '17', floor: 'Terrace', capacity: 6, x: 350, y: 450, type: 'round', status: 'available' },
    { id: '38', name: '18', floor: 'Terrace', capacity: 8, x: 450, y: 450, type: 'round', status: 'available' },
    { id: '39', name: '19', floor: 'Terrace', capacity: 2, x: 550, y: 450, type: 'rect', status: 'available' },
    { id: '40', name: '20', floor: 'Terrace', capacity: 2, x: 650, y: 450, type: 'rect', status: 'available' },

    // Valentine's Floor
    { id: '41', name: '1', floor: "Valentine's", capacity: 2, x: 150, y: 150, type: 'rect', status: 'available' },
    { id: '42', name: '2', floor: "Valentine's", capacity: 2, x: 250, y: 150, type: 'rect', status: 'available' },
    { id: '43', name: '3', floor: "Valentine's", capacity: 4, x: 350, y: 150, type: 'rect', status: 'available' },
    { id: '44', name: '4', floor: "Valentine's", capacity: 4, x: 450, y: 150, type: 'rect', status: 'available' },
    { id: '45', name: '5', floor: "Valentine's", capacity: 4, x: 550, y: 150, type: 'rect', status: 'available' },
    { id: '46', name: '6', floor: "Valentine's", capacity: 6, x: 650, y: 150, type: 'round', status: 'available' },
    { id: '47', name: '7', floor: "Valentine's", capacity: 6, x: 750, y: 150, type: 'round', status: 'available' },
    { id: '48', name: '8', floor: "Valentine's", capacity: 8, x: 150, y: 300, type: 'round', status: 'available' },
    { id: '49', name: '9', floor: "Valentine's", capacity: 4, x: 250, y: 300, type: 'rect', status: 'available' },
    { id: '50', name: '10', floor: "Valentine's", capacity: 4, x: 350, y: 300, type: 'rect', status: 'available' },
    { id: '51', name: '11', floor: "Valentine's", capacity: 2, x: 450, y: 300, type: 'rect', status: 'available' },
    { id: '52', name: '12', floor: "Valentine's", capacity: 2, x: 550, y: 300, type: 'rect', status: 'available' },
    { id: '53', name: '13', floor: "Valentine's", capacity: 4, x: 650, y: 300, type: 'rect', status: 'available' },
    { id: '54', name: '14', floor: "Valentine's", capacity: 6, x: 750, y: 300, type: 'round', status: 'available' },
    { id: '55', name: '15', floor: "Valentine's", capacity: 4, x: 150, y: 450, type: 'rect', status: 'available' },
    { id: '56', name: '16', floor: "Valentine's", capacity: 4, x: 250, y: 450, type: 'rect', status: 'available' },
    { id: '57', name: '17', floor: "Valentine's", capacity: 6, x: 350, y: 450, type: 'round', status: 'available' },
    { id: '58', name: '18', floor: "Valentine's", capacity: 8, x: 450, y: 450, type: 'round', status: 'available' },
    { id: '59', name: '19', floor: "Valentine's", capacity: 2, x: 550, y: 450, type: 'rect', status: 'available' },
    { id: '60', name: '20', floor: "Valentine's", capacity: 2, x: 650, y: 450, type: 'rect', status: 'available' },
];

const DECORATIONS = [
    { id: 'plant1', name: 'Plant', icon: Trees, x: 50, y: 50 },
    { id: 'violin1', name: 'Violin', icon: Music, x: 100, y: 100 },
];

const FLOORS = ['Nut Allergy', 'Terrace', 'Valentine\'s'];

export default function PhysicalTables() {
    const [activeTab, setActiveTab] = useState('list');
    const [selectedFloor, setSelectedFloor] = useState('Nut Allergy');
    const [tables, setTables] = useState(MOCK_TABLES);
    const [decorations, setDecorations] = useState(DECORATIONS);
    const [searchQuery, setSearchQuery] = useState('');
    const [draggedItem, setDraggedItem] = useState(null);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [selectedTable, setSelectedTable] = useState(null);
    const [backgroundImages, setBackgroundImages] = useState({
        'Nut Allergy': null,
        'Terrace': null,
        "Valentine's": null
    });

    const addTable = () => {
        const newId = (Math.max(...tables.map(t => parseInt(t.id) || 0)) + 1).toString();
        const currentFloorTables = tables.filter(t => t.floor === selectedFloor);
        const maxTableNumber = Math.max(...currentFloorTables.map(t => parseInt(t.name) || 0), 0);
        const newTable = {
            id: newId,
            name: (maxTableNumber + 1).toString(),
            floor: selectedFloor,
            capacity: 4,
            x: 400,
            y: 400,
            type: 'rect',
            status: 'available'
        };
        setTables([...tables, newTable]);
        setSelectedTable(newTable);
    };

    const updateTablePosition = (id, x, y) => {
        setTables(prev => prev.map(t => t.id === id ? { ...t, x, y } : t));
    };

    const updateTableProperty = (id, property, value) => {
        setTables(prev => prev.map(t => t.id === id ? { ...t, [property]: value } : t));
        if (selectedTable?.id === id) {
            setSelectedTable(prev => ({ ...prev, [property]: value }));
        }
    };

    const deleteTable = (id) => {
        setTables(prev => prev.filter(t => t.id !== id));
        if (selectedTable?.id === id) {
            setSelectedTable(null);
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
        <PageContainer
            title="Physical Tables"
            description="Manage table inventory and visual floorplans for Caviar & Bull."
            breadcrumb={[
                { label: 'Management', href: '#' },
                { label: 'Tables', href: '/admin/physical-tables' }
            ]}
            actions={
                <div className="flex gap-3">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="bg-zinc-900 rounded-lg p-1 border border-white/5">
                        <TabsList className="bg-transparent border-none p-0">
                            <TabsTrigger value="list" className="data-[state=active]:bg-red-600 data-[state=active]:text-white rounded-md px-4 h-8 flex items-center gap-2">
                                <List className="w-4 h-4" />
                                List View
                            </TabsTrigger>
                            <TabsTrigger value="builder" className="data-[state=active]:bg-red-600 data-[state=active]:text-white rounded-md px-4 h-8 flex items-center gap-2">
                                <LayoutGrid className="w-4 h-4" />
                                Floorplan Builder
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>
                    <Button className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-6 font-bold" onClick={addTable}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Table
                    </Button>
                </div>
            }
        >
            <div className="mb-6 flex items-center gap-4">
                <div className="flex items-center gap-2 bg-zinc-900 border border-white/5 p-1 rounded-xl">
                    {FLOORS.map(floor => (
                        <button
                            key={floor}
                            onClick={() => setSelectedFloor(floor)}
                            className={cn(
                                "px-4 py-2 rounded-lg text-sm font-bold transition-all",
                                selectedFloor === floor
                                    ? "bg-white/10 text-white"
                                    : "text-zinc-500 hover:text-zinc-300"
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
                            { header: 'Table', accessorKey: 'name' },
                            { header: 'Floor', accessorKey: 'floor' },
                            { header: 'Capacity', accessorKey: 'capacity' },
                            { header: 'Type', accessorKey: 'type' },
                            { header: 'Status', accessorKey: 'status' }
                        ]}
                    />
                </TabsContent>

                <TabsContent value="builder" className="m-0 border-none">
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                        <div className="space-y-6">
                            {/* Table Properties */}
                            <Card className="border-white/5 bg-zinc-900/50 backdrop-blur-xl">
                                <CardHeader className="py-4 border-b border-white/5">
                                    <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Table Properties</CardTitle>
                                </CardHeader>
                                <CardContent className="pt-6 space-y-6">
                                    {/* Table Number */}
                                    <div>
                                        <label className="text-[9px] font-black uppercase tracking-widest text-zinc-600 mb-2 block">Table Number</label>
                                        <Input
                                            value={selectedTable?.name || ''}
                                            onChange={(e) => selectedTable && updateTableProperty(selectedTable.id, 'name', e.target.value)}
                                            placeholder="Enter number"
                                            className="bg-zinc-950 border-white/10 text-white h-9 text-sm"
                                            disabled={!selectedTable}
                                        />
                                    </div>

                                    {/* Capacity */}
                                    <div>
                                        <label className="text-[9px] font-black uppercase tracking-widest text-zinc-600 mb-3 block">Capacity</label>
                                        <div className="grid grid-cols-3 gap-2">
                                            {[2, 4, 6, 8, 10, 12].map(cap => (
                                                <button
                                                    key={cap}
                                                    onClick={() => selectedTable && updateTableProperty(selectedTable.id, 'capacity', cap)}
                                                    disabled={!selectedTable}
                                                    className={cn(
                                                        "h-10 rounded-lg font-bold text-sm transition-all border-2",
                                                        selectedTable?.capacity === cap
                                                            ? "bg-white/10 border-white/20 text-white"
                                                            : "bg-zinc-950 border-white/5 text-zinc-600 hover:border-white/10 hover:text-zinc-400",
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
                                        <label className="text-[9px] font-black uppercase tracking-widest text-zinc-600 mb-3 block">Shape</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            <button
                                                onClick={() => selectedTable && updateTableProperty(selectedTable.id, 'type', 'rect')}
                                                disabled={!selectedTable}
                                                className={cn(
                                                    "h-12 rounded-lg font-bold text-xs uppercase transition-all border-2 flex items-center justify-center gap-2",
                                                    selectedTable?.type === 'rect'
                                                        ? "bg-white/10 border-white/20 text-white"
                                                        : "bg-zinc-950 border-white/5 text-zinc-600 hover:border-white/10 hover:text-zinc-400",
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
                                                        ? "bg-white/10 border-white/20 text-white"
                                                        : "bg-zinc-950 border-white/5 text-zinc-600 hover:border-white/10 hover:text-zinc-400",
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
                                        <label className="text-[9px] font-black uppercase tracking-widest text-zinc-600 mb-3 block">Status</label>
                                        <div className="space-y-2">
                                            <button
                                                onClick={() => selectedTable && updateTableProperty(selectedTable.id, 'status', 'available')}
                                                disabled={!selectedTable}
                                                className={cn(
                                                    "w-full h-10 rounded-lg font-bold text-xs uppercase transition-all border-2 flex items-center justify-center gap-2",
                                                    selectedTable?.status === 'available'
                                                        ? "bg-emerald-600/20 border-emerald-500/30 text-emerald-400"
                                                        : "bg-zinc-950 border-white/5 text-zinc-600 hover:border-white/10 hover:text-zinc-400",
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
                                                        : "bg-zinc-950 border-white/5 text-zinc-600 hover:border-white/10 hover:text-zinc-400",
                                                    !selectedTable && "opacity-50 cursor-not-allowed"
                                                )}
                                            >
                                                Occupied
                                            </button>
                                        </div>
                                    </div>

                                    {/* Custom Table Button */}
                                    <Button
                                        className="w-full bg-red-600 hover:bg-red-500 text-white font-black uppercase tracking-wider h-11 rounded-xl"
                                        onClick={addTable}
                                    >
                                        <Plus className="w-4 h-4 mr-2" />
                                        Custom Table
                                    </Button>
                                </CardContent>
                            </Card>

                            {/* Unplaced Tables */}
                            <Card className="border-white/5 bg-zinc-900/50 backdrop-blur-xl">
                                <CardHeader className="py-4 border-b border-white/5">
                                    <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Unplaced Tables</CardTitle>
                                </CardHeader>
                                <CardContent className="pt-6">
                                    {tables.filter(t => t.floor === selectedFloor && (t.x === 0 || t.y === 0)).length === 0 ? (
                                        <p className="text-[10px] text-zinc-600 italic text-center py-4">All tables placed</p>
                                    ) : (
                                        <div className="space-y-2">
                                            {tables.filter(t => t.floor === selectedFloor && (t.x === 0 || t.y === 0)).map(t => (
                                                <div key={t.id} className="p-3 bg-zinc-950 border border-white/5 rounded-lg flex items-center justify-between group cursor-move hover:border-red-500/30 transition-all">
                                                    <span className="text-xs font-bold text-white">Table {t.name}</span>
                                                    <Move className="w-3 h-3 text-zinc-600 group-hover:text-red-500" />
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        <div className="lg:col-span-3 space-y-4">
                            <div
                                className="bg-zinc-950 border-4 border-zinc-900 rounded-3xl relative overflow-hidden aspect-[4/3] group shadow-2xl"
                                onMouseMove={handleMouseMove}
                                onMouseUp={handleMouseUp}
                                onMouseLeave={handleMouseUp}
                                onClick={handleCanvasClick}
                            >
                                {/* Background Image */}
                                {backgroundImages[selectedFloor] && (
                                    <div
                                        className="absolute inset-0 bg-cover bg-center opacity-30"
                                        style={{ backgroundImage: `url(${backgroundImages[selectedFloor]})` }}
                                    />
                                )}

                                {/* Visual Canvas Pattern */}
                                <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 0)', backgroundSize: '40px 40px' }} />

                                {/* Table Rendering */}
                                {tables.filter(t => t.floor === selectedFloor && t.x !== 0).map(table => (
                                    <div
                                        key={table.id}
                                        onMouseDown={(e) => handleMouseDown(e, table)}
                                        className={cn(
                                            "absolute cursor-move transition-all hover:shadow-[0_0_20px_rgba(229,57,53,0.3)] flex items-center justify-center font-black text-white text-xs select-none",
                                            table.type === 'round' ? "rounded-full" : "rounded-lg",
                                            table.status === 'occupied' ? "bg-red-600/60 border-2 border-red-500" :
                                                table.status === 'reserved' ? "bg-yellow-600/60 border-2 border-yellow-500" :
                                                    "bg-zinc-800 border-2 border-white/10",
                                            selectedTable?.id === table.id && "ring-2 ring-red-500 ring-offset-2 ring-offset-zinc-950"
                                        )}
                                        style={{
                                            width: table.capacity * 20 + 20,
                                            height: table.capacity * 20 + 20,
                                            left: table.x,
                                            top: table.y,
                                            transform: 'translate(-50%, -50%)'
                                        }}
                                    >
                                        {table.name}
                                    </div>
                                ))}

                                {/* Decorations */}
                                {decorations.map(dec => (
                                    <div
                                        key={dec.id}
                                        className="absolute cursor-move text-zinc-600 hover:text-white transition-colors"
                                        style={{ left: dec.x, top: dec.y, transform: 'translate(-50%, -50%)' }}
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
    );
}

const AssetButton = ({ icon: Icon, label }) => (
    <button className="p-3 bg-zinc-950 border border-white/5 rounded-lg hover:border-red-500/30 transition-all group flex flex-col items-center gap-2">
        <Icon className="w-5 h-5 text-zinc-600 group-hover:text-red-500" />
        <span className="text-[9px] font-bold text-zinc-600 group-hover:text-white uppercase">{label}</span>
    </button>
);
