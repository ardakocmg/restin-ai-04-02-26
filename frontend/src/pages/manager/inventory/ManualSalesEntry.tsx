/**
 * ManualSalesEntry — Register sales without POS for food cost calculations
 * Apicbase parity: manual dish entry, quantity, outlet, CoGS impact
 */
import React, { useState, useMemo, useCallback } from 'react';
import PageContainer from '@/layouts/PageContainer';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { Plus, Trash2, Search, Download } from 'lucide-react';
import { toast } from 'sonner';

interface SalesEntry {
    _id: string; date: string; menuItem: string; category: string;
    quantity: number; sellingPrice: number; foodCost: number; margin: number;
    outlet: string; enteredBy: string; enteredAt: string;
}
interface MenuItem {
    _id: string; name: string; category: string; sellingPrice: number; foodCost: number;
}

const MENU_ITEMS: MenuItem[] = [
    { _id: 'm1', name: 'Margherita Pizza', category: 'Pizza', sellingPrice: 12.50, foodCost: 2.80 },
    { _id: 'm2', name: 'Pepperoni Pizza', category: 'Pizza', sellingPrice: 14.00, foodCost: 3.40 },
    { _id: 'm3', name: 'Caesar Salad', category: 'Starters', sellingPrice: 9.50, foodCost: 2.10 },
    { _id: 'm4', name: 'Bruschetta', category: 'Starters', sellingPrice: 7.00, foodCost: 1.30 },
    { _id: 'm5', name: 'Spaghetti Carbonara', category: 'Pasta', sellingPrice: 13.00, foodCost: 2.60 },
    { _id: 'm6', name: 'Penne Arrabiata', category: 'Pasta', sellingPrice: 11.00, foodCost: 2.00 },
    { _id: 'm7', name: 'Grilled Sea Bass', category: 'Mains', sellingPrice: 22.00, foodCost: 7.50 },
    { _id: 'm8', name: 'Ribeye Steak', category: 'Mains', sellingPrice: 28.00, foodCost: 10.50 },
    { _id: 'm9', name: 'Tiramisu', category: 'Desserts', sellingPrice: 8.00, foodCost: 1.80 },
    { _id: 'm10', name: 'Panna Cotta', category: 'Desserts', sellingPrice: 7.50, foodCost: 1.20 },
    { _id: 'm11', name: 'House Red Wine', category: 'Beverages', sellingPrice: 6.00, foodCost: 1.50 },
    { _id: 'm12', name: 'Aperol Spritz', category: 'Beverages', sellingPrice: 9.00, foodCost: 2.20 },
];
const OUTLETS = ['Main Restaurant', 'Terrace Bar', 'Private Dining', 'Takeaway'];

const SEED: SalesEntry[] = [
    { _id: 'se1', date: '2025-02-20', menuItem: 'Margherita Pizza', category: 'Pizza', quantity: 45, sellingPrice: 12.50, foodCost: 2.80, margin: 77.6, outlet: 'Main Restaurant', enteredBy: 'Arda K.', enteredAt: '2025-02-20T16:00' },
    { _id: 'se2', date: '2025-02-20', menuItem: 'Caesar Salad', category: 'Starters', quantity: 22, sellingPrice: 9.50, foodCost: 2.10, margin: 77.9, outlet: 'Main Restaurant', enteredBy: 'Arda K.', enteredAt: '2025-02-20T16:00' },
    { _id: 'se3', date: '2025-02-20', menuItem: 'Grilled Sea Bass', category: 'Mains', quantity: 18, sellingPrice: 22.00, foodCost: 7.50, margin: 65.9, outlet: 'Main Restaurant', enteredBy: 'Arda K.', enteredAt: '2025-02-20T16:00' },
    { _id: 'se4', date: '2025-02-20', menuItem: 'Tiramisu', category: 'Desserts', quantity: 30, sellingPrice: 8.00, foodCost: 1.80, margin: 77.5, outlet: 'Terrace Bar', enteredBy: 'Maria C.', enteredAt: '2025-02-20T15:30' },
    { _id: 'se5', date: '2025-02-19', menuItem: 'Ribeye Steak', category: 'Mains', quantity: 25, sellingPrice: 28.00, foodCost: 10.50, margin: 62.5, outlet: 'Main Restaurant', enteredBy: 'Arda K.', enteredAt: '2025-02-19T22:00' },
    { _id: 'se6', date: '2025-02-19', menuItem: 'Aperol Spritz', category: 'Beverages', quantity: 40, sellingPrice: 9.00, foodCost: 2.20, margin: 75.6, outlet: 'Terrace Bar', enteredBy: 'Maria C.', enteredAt: '2025-02-19T22:00' },
];

export default function ManualSalesEntry() {
    const [entries, setEntries] = useState<SalesEntry[]>(SEED);
    const [activeTab, setActiveTab] = useState('entries');
    const [search, setSearch] = useState('');
    const [dateFilter, setDateFilter] = useState('2025-02-20');
    const [outletFilter, setOutletFilter] = useState('all');
    const [addOpen, setAddOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState('');
    const [qty, setQty] = useState(1);
    const [addOutlet, setAddOutlet] = useState(OUTLETS[0]);
    const [addDate, setAddDate] = useState('2025-02-20');

    const filtered = useMemo(() => entries.filter(e => {
        if (dateFilter && e.date !== dateFilter) return false;
        if (outletFilter !== 'all' && e.outlet !== outletFilter) return false;
        if (search) return e.menuItem.toLowerCase().includes(search.toLowerCase());
        return true;
    }), [entries, dateFilter, outletFilter, search]);

    const kpis = useMemo(() => {
        const day = entries.filter(e => e.date === dateFilter);
        const rev = day.reduce((s, e) => s + e.quantity * e.sellingPrice, 0);
        const cogs = day.reduce((s, e) => s + e.quantity * e.foodCost, 0);
        const profit = rev - cogs;
        return { rev, cogs, profit, margin: rev > 0 ? (profit / rev) * 100 : 0, items: day.reduce((s, e) => s + e.quantity, 0), count: day.length };
    }, [entries, dateFilter]);

    const handleAdd = useCallback(() => {
        const item = MENU_ITEMS.find(m => m._id === selectedItem);
        if (!item) { toast.error('Select a menu item'); return; }
        const margin = ((item.sellingPrice - item.foodCost) / item.sellingPrice) * 100;
        setEntries(p => [{ _id: `se${Date.now()}`, date: addDate, menuItem: item.name, category: item.category, quantity: qty, sellingPrice: item.sellingPrice, foodCost: item.foodCost, margin: Math.round(margin * 10) / 10, outlet: addOutlet, enteredBy: 'Arda K.', enteredAt: new Date().toISOString() }, ...p]);
        toast.success(`Added ${qty}× ${item.name}`);
        setAddOpen(false); setSelectedItem(''); setQty(1);
    }, [selectedItem, qty, addOutlet, addDate]);

    const catBreakdown = useMemo(() => {
        const day = entries.filter(e => e.date === dateFilter);
        const map: Record<string, { revenue: number; cogs: number; items: number }> = {};
        for (const e of day) { if (!map[e.category]) map[e.category] = { revenue: 0, cogs: 0, items: 0 }; map[e.category].revenue += e.quantity * e.sellingPrice; map[e.category].cogs += e.quantity * e.foodCost; map[e.category].items += e.quantity; }
        return Object.entries(map).sort((a, b) => b[1].revenue - a[1].revenue);
    }, [entries, dateFilter]);

    return (
        <PageContainer title="Manual Sales Entry" description="Register sales without POS for accurate food cost calculations"
            actions={<div className="flex items-center gap-2"><Button size="sm" onClick={() => setAddOpen(true)}><Plus className="h-4 w-4 mr-1" /> Add Sale</Button><Button variant="outline" size="sm" onClick={() => toast.info('Exported')}><Download className="h-4 w-4 mr-1" /> Export</Button></div>}>

            {/* KPI Strip */}
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
                {[
                    { label: 'Revenue', value: `€${kpis.rev.toFixed(0)}`, color: 'text-emerald-400' },
                    { label: 'CoGS', value: `€${kpis.cogs.toFixed(0)}`, color: 'text-red-400' },
                    { label: 'Gross Profit', value: `€${kpis.profit.toFixed(0)}`, color: 'text-blue-400' },
                    { label: 'Avg Margin', value: `${kpis.margin.toFixed(1)}%`, color: kpis.margin >= 70 ? 'text-emerald-400' : 'text-amber-400' },
                    { label: 'Items Sold', value: kpis.items, color: 'text-purple-400' },
                    { label: 'Entries', value: kpis.count, color: 'text-cyan-400' },
                ].map(k => (
                    <Card key={k.label} className="border-white/5 bg-zinc-900/40">
                        <CardContent className="p-3">
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{k.label}</p>
                            <p className={cn('text-xl font-bold mt-0.5', k.color)}>{k.value}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="bg-zinc-900/60 border border-white/5 mb-4">
                    <TabsTrigger value="entries" className="text-xs">Sales Entries</TabsTrigger>
                    <TabsTrigger value="breakdown" className="text-xs">Category Breakdown</TabsTrigger>
                </TabsList>

                <TabsContent value="entries">
                    <div className="flex flex-wrap items-center gap-2 mb-4">
                        <div className="relative flex-1 max-w-xs">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input aria-label="Search items..." className="pl-9 h-8 text-xs" placeholder="Search items..." value={search} onChange={e => setSearch(e.target.value)} />
                        </div>
                        <Input aria-label="Input field" type="date" className="w-40 h-8 text-xs" value={dateFilter} onChange={e => setDateFilter(e.target.value)} />
                        <Select aria-label="Select option" value={outletFilter} onValueChange={setOutletFilter}>
                            <SelectTrigger aria-label="Select option" className="w-40 h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent><SelectItem value="all">All Outlets</SelectItem>{OUTLETS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                        </Select>
                    </div>

                    <Card className="border-white/5 bg-zinc-900/40"><CardContent className="p-0">
                        <table className="w-full text-xs">
                            <thead><tr className="border-b border-white/5">
                                <th className="p-3 text-left font-medium">Menu Item</th><th className="p-3 text-left font-medium">Category</th>
                                <th className="p-3 text-center font-medium">Qty</th><th className="p-3 text-right font-medium">Price</th>
                                <th className="p-3 text-right font-medium">Revenue</th><th className="p-3 text-right font-medium">CoGS</th>
                                <th className="p-3 text-center font-medium">Margin</th><th className="p-3 text-left font-medium">Outlet</th>
                                <th className="p-3 text-center font-medium">×</th>
                            </tr></thead>
                            <tbody>{filtered.map(e => (
                                <tr key={e._id} className="border-b border-white/5 hover:bg-white/5">
                                    <td className="p-3 font-medium">{e.menuItem}</td><td className="p-3 text-muted-foreground">{e.category}</td>
                                    <td className="p-3 text-center tabular-nums font-medium">{e.quantity}</td><td className="p-3 text-right tabular-nums">€{e.sellingPrice.toFixed(2)}</td>
                                    <td className="p-3 text-right tabular-nums text-emerald-400">€{(e.quantity * e.sellingPrice).toFixed(2)}</td>
                                    <td className="p-3 text-right tabular-nums text-red-400">€{(e.quantity * e.foodCost).toFixed(2)}</td>
                                    <td className="p-3 text-center"><Badge variant="outline" className={cn('text-[9px]', e.margin >= 75 ? 'text-emerald-400' : e.margin >= 65 ? 'text-amber-400' : 'text-red-400')}>{e.margin.toFixed(1)}%</Badge></td>
                                    <td className="p-3 text-muted-foreground">{e.outlet}</td>
                                    <td className="p-3 text-center"><Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setEntries(p => p.filter(x => x._id !== e._id))}><Trash2 className="h-3 w-3 text-red-400" /></Button></td>
                                </tr>
                            ))}</tbody>
                        </table>
                    </CardContent></Card>
                </TabsContent>

                <TabsContent value="breakdown">
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {catBreakdown.map(([cat, d]) => {
                            const profit = d.revenue - d.cogs; const margin = d.revenue > 0 ? (profit / d.revenue) * 100 : 0; const maxRev = catBreakdown[0]?.[1].revenue || 1; return (
                                <Card key={cat} className="border-white/5 bg-zinc-900/40"><CardContent className="p-4">
                                    <div className="flex items-center justify-between mb-3"><p className="text-sm font-medium">{cat}</p><Badge variant="outline" className={cn('text-[9px]', margin >= 75 ? 'text-emerald-400' : 'text-amber-400')}>{margin.toFixed(1)}%</Badge></div>
                                    <div className="h-2 bg-zinc-800 rounded-full mb-3 overflow-hidden"><div className="h-full bg-emerald-500/60 rounded-full" style={{ width: `${(d.revenue / maxRev) * 100}%` }} /></div>
                                    <div className="grid grid-cols-3 gap-2 text-center">
                                        <div><p className="text-[10px] text-muted-foreground">Revenue</p><p className="text-sm font-bold text-emerald-400">€{d.revenue.toFixed(0)}</p></div>
                                        <div><p className="text-[10px] text-muted-foreground">CoGS</p><p className="text-sm font-bold text-red-400">€{d.cogs.toFixed(0)}</p></div>
                                        <div><p className="text-[10px] text-muted-foreground">Items</p><p className="text-sm font-bold text-blue-400">{d.items}</p></div>
                                    </div>
                                </CardContent></Card>
                            );
                        })}
                    </div>
                </TabsContent>
            </Tabs>

            <Dialog open={addOpen} onOpenChange={setAddOpen}><DialogContent className="max-w-sm">
                <DialogHeader><DialogTitle>Register Manual Sale</DialogTitle><DialogDescription>Add a sale for food cost calculations</DialogDescription></DialogHeader>
                <div className="space-y-3">
                    <div><Label className="text-xs">Date</Label><Input aria-label="Input field" type="date" value={addDate} onChange={e => setAddDate(e.target.value)} /></div>
                    <div><Label className="text-xs">Menu Item</Label><Select aria-label="Select option" value={selectedItem} onValueChange={setSelectedItem}><SelectTrigger aria-label="Select option" className="text-xs"><SelectValue placeholder="Select item..." /></SelectTrigger><SelectContent>{MENU_ITEMS.map(m => <SelectItem key={m._id} value={m._id}>{m.name} — €{m.sellingPrice.toFixed(2)}</SelectItem>)}</SelectContent></Select></div>
                    <div><Label className="text-xs">Quantity</Label><Input aria-label="Input field" type="number" value={qty} onChange={e => setQty(Math.max(1, Number(e.target.value)))} className="w-24" /></div>
                    <div><Label className="text-xs">Outlet</Label><Select aria-label="Select option" value={addOutlet} onValueChange={setAddOutlet}><SelectTrigger aria-label="Select option" className="text-xs"><SelectValue /></SelectTrigger><SelectContent>{OUTLETS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select></div>
                    {selectedItem && (() => {
                        const item = MENU_ITEMS.find(m => m._id === selectedItem); if (!item) return null; const rev = qty * item.sellingPrice; const cogs = qty * item.foodCost; return (
                            <div className="p-3 bg-zinc-800/50 rounded-lg border border-white/5 text-xs">
                                <div className="flex justify-between"><span>Revenue:</span><span className="text-emerald-400 font-bold">€{rev.toFixed(2)}</span></div>
                                <div className="flex justify-between"><span>CoGS:</span><span className="text-red-400 font-bold">€{cogs.toFixed(2)}</span></div>
                                <div className="flex justify-between border-t border-white/5 mt-1 pt-1"><span>Profit:</span><span className="text-blue-400 font-bold">€{(rev - cogs).toFixed(2)}</span></div>
                            </div>
                        );
                    })()}
                </div>
                <DialogFooter><Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button><Button onClick={handleAdd}><Plus className="h-4 w-4 mr-1" /> Add</Button></DialogFooter>
            </DialogContent></Dialog>
        </PageContainer>
    );
}
