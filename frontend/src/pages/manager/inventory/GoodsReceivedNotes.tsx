import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { logger } from '@/lib/logger';
import { useVenue } from '@/context/VenueContext';
import api from '@/lib/api';
import PageContainer from '@/layouts/PageContainer';
import DataTable from '@/components/shared/DataTable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger,
} from '@/components/ui/dialog';
import {
    ClipboardCheck,
    Plus,
    RefreshCw,
    Package,
    AlertTriangle,
    CheckCircle2,
    Truck,
    Calendar,
    FileText,
    Loader2,
    Trash2,
    Scale,
    DollarSign,
    Search,
    AlertCircle,
    Shield,
    QrCode,
} from 'lucide-react';
import { toast } from 'sonner';

// ── Interfaces ─────────────────────────────────────────────────────
interface GRNLineItem {
    name: string;
    ordered: number;
    received: number;
    unit: string;
    po_price: number;
    invoice_price: number;
    lot?: string;
    expiry?: string;
}

interface GRNData {
    id: string;
    supplier_name: string;
    po_number?: string;
    delivery_note?: string;
    received_date: string;
    items_count: number;
    total_value: number;
    status: string;
    variance_count: number;
    qty_discrepancy: number;
    price_discrepancy: number;
    lots_tracked: number;
    line_items: GRNLineItem[];
}

interface SupplierItem {
    id: string;
    name: string;
}

interface InventoryItemData {
    id: string;
    name: string;
}

interface StatCardProps {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    value: string | number;
    subtext?: string;
    color?: string;
}

// ── KPI Stat Card ──────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, subtext, color = 'text-foreground' }: StatCardProps) {
    return (
        <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4 flex items-center gap-4">
                <div className="p-2.5 rounded-lg bg-muted">
                    <Icon className={`h-5 w-5 ${color}`} />
                </div>
                <div>
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className={`text-xl font-bold tabular-nums ${color}`}>{value}</p>
                    {subtext && <p className="text-xs text-muted-foreground">{subtext}</p>}
                </div>
            </CardContent>
        </Card>
    );
}

// ── Status Badge ───────────────────────────────────────────────────
function GRNStatusBadge({ status }: { status: string }) {
    const config: Record<string, { label: string; className: string }> = {
        draft: { label: 'Draft', className: 'text-muted-foreground border-zinc-400' },
        posted: { label: 'Posted', className: 'text-green-600 dark:text-green-400 border-green-400' },
        with_variance: { label: 'Variance', className: 'text-amber-600 dark:text-amber-400 border-amber-400' },
    };
    const c = config[status] || config.draft;
    return <Badge variant="outline" className={`text-xs gap-1 ${c.className}`}>{c.label}</Badge>;
}

// ── Reconciliation Badge (Gap 11) ──────────────────────────────────
function ReconciliationBadge({ row }: { row: GRNData }) {
    const discrepancies = row.qty_discrepancy || 0;
    const priceDisc = row.price_discrepancy || 0;
    const total = discrepancies + priceDisc;
    if (total === 0 && row.status === 'posted') {
        return <Badge variant="outline" className="text-xs text-green-600 dark:text-green-400 border-green-400 gap-1"><CheckCircle2 className="h-3 w-3" /> Reconciled</Badge>;
    }
    if (total > 0) {
        return <Badge variant="outline" className="text-xs text-red-600 dark:text-red-400 border-red-400 gap-1"><AlertCircle className="h-3 w-3" /> {total} Discrepancies</Badge>;
    }
    return <Badge variant="outline" className="text-xs text-muted-foreground gap-1">Pending</Badge>;
}

export default function GoodsReceivedNotes() {
    const { activeVenue } = useVenue();
    const [grns, setGrns] = useState<GRNData[]>([]);
    const [loading, setLoading] = useState(true);
    const [suppliers, setSuppliers] = useState<SupplierItem[]>([]);
    const [inventoryItems, setInventoryItems] = useState<InventoryItemData[]>([]);
    const [createOpen, setCreateOpen] = useState(false);
    const [saving, setSaving] = useState(false);

    // Gap 11: Reconciliation detail view
    const [reconcileOpen, setReconcileOpen] = useState(false);
    const [selectedGRN, setSelectedGRN] = useState<GRNData | null>(null);

    // Create form state — enhanced with lot/traceability fields (Gap 14)
    const [form, setForm] = useState({
        supplier_id: '',
        po_number: '',
        delivery_note: '',
        items: [{
            item_id: '', item_name: '', ordered_qty: '', received_qty: '', unit: 'kg',
            unit_price: '', po_price: '', lot_number: '', expiry_date: '', temperature: '',
        }],
    });

    useEffect(() => {
        if (activeVenue?.id) {
            loadAll();
        }
    }, [activeVenue?.id]);

    const loadAll = useCallback(async () => {
        setLoading(true);
        try {
            const [grnsRes, suppRes, itemsRes] = await Promise.allSettled([
                api.get(`/inventory/receiving/grns?venue_id=${activeVenue!.id}`),
                api.get(`/inventory/suppliers?venue_id=${activeVenue!.id}`),
                api.get(`/inventory/items?venue_id=${activeVenue!.id}&page_size=500`),
            ]);

            setGrns(grnsRes.status === 'fulfilled' ? (grnsRes.value.data || []) : getDemoGRNs());
            setSuppliers(suppRes.status === 'fulfilled' ? (suppRes.value.data?.items || suppRes.value.data || []) : []);
            setInventoryItems(itemsRes.status === 'fulfilled' ? (itemsRes.value.data?.items || itemsRes.value.data || []) : []);
        } catch {
            setGrns(getDemoGRNs());
        } finally {
            setLoading(false);
        }
    }, [activeVenue?.id]);

    function getDemoGRNs() {
        return [
            {
                id: 'GRN-001', supplier_name: 'Fresh Catch Fisheries', po_number: 'PO-2026-001', delivery_note: 'DN-4521',
                received_date: '2026-02-14T10:30', items_count: 4, total_value: 856.00, status: 'posted', variance_count: 0,
                qty_discrepancy: 0, price_discrepancy: 0, lots_tracked: 4,
                line_items: [
                    { name: 'Fresh Salmon Fillet', ordered: 20, received: 20, unit: 'kg', po_price: 18.50, invoice_price: 18.50, lot: 'LOT-FC-2026-045', expiry: '2026-02-21' },
                    { name: 'Sea Bass', ordered: 15, received: 15, unit: 'kg', po_price: 22.00, invoice_price: 22.00, lot: 'LOT-FC-2026-046', expiry: '2026-02-20' },
                    { name: 'Prawns Tiger', ordered: 10, received: 10, unit: 'kg', po_price: 28.00, invoice_price: 28.00, lot: 'LOT-FC-2026-047', expiry: '2026-02-19' },
                    { name: 'Squid Tubes', ordered: 8, received: 8, unit: 'kg', po_price: 14.00, invoice_price: 14.00, lot: 'LOT-FC-2026-048', expiry: '2026-02-22' },
                ],
            },
            {
                id: 'GRN-002', supplier_name: 'Premium Meats & Delicatessen', po_number: 'PO-2026-003', delivery_note: 'DN-7834',
                received_date: '2026-02-13T08:15', items_count: 6, total_value: 1240.50, status: 'posted', variance_count: 1,
                qty_discrepancy: 1, price_discrepancy: 1, lots_tracked: 6,
                line_items: [
                    { name: 'Wagyu Striploin', ordered: 10, received: 9, unit: 'kg', po_price: 85.00, invoice_price: 88.00, lot: 'LOT-PM-2026-112', expiry: '2026-02-18' },
                    { name: 'Lamb Rack', ordered: 8, received: 8, unit: 'kg', po_price: 32.00, invoice_price: 32.00, lot: 'LOT-PM-2026-113', expiry: '2026-02-20' },
                    { name: 'Duck Breast', ordered: 12, received: 12, unit: 'kg', po_price: 24.00, invoice_price: 24.00, lot: 'LOT-PM-2026-114', expiry: '2026-02-19' },
                    { name: 'Pork Belly', ordered: 15, received: 15, unit: 'kg', po_price: 12.00, invoice_price: 12.00, lot: 'LOT-PM-2026-115', expiry: '2026-02-22' },
                    { name: 'Veal Scallopini', ordered: 6, received: 6, unit: 'kg', po_price: 38.00, invoice_price: 38.00, lot: 'LOT-PM-2026-116', expiry: '2026-02-17' },
                    { name: 'Beef Tenderloin', ordered: 10, received: 10, unit: 'kg', po_price: 45.00, invoice_price: 45.00, lot: 'LOT-PM-2026-117', expiry: '2026-02-21' },
                ],
            },
            {
                id: 'GRN-003', supplier_name: 'Mediterranean Foods Ltd', po_number: 'PO-2026-005', delivery_note: '',
                received_date: '2026-02-12T14:00', items_count: 3, total_value: 345.00, status: 'with_variance', variance_count: 2,
                qty_discrepancy: 2, price_discrepancy: 1, lots_tracked: 2,
                line_items: [
                    { name: 'Extra Virgin Olive Oil', ordered: 20, received: 18, unit: 'L', po_price: 8.50, invoice_price: 9.20, lot: 'LOT-MF-2026-033', expiry: '2027-01-15' },
                    { name: 'Sundried Tomatoes', ordered: 10, received: 7, unit: 'kg', po_price: 12.00, invoice_price: 12.00, lot: 'LOT-MF-2026-034', expiry: '2026-08-30' },
                    { name: 'Kalamata Olives', ordered: 5, received: 5, unit: 'kg', po_price: 9.00, invoice_price: 9.00, lot: '', expiry: '' },
                ],
            },
            {
                id: 'GRN-004', supplier_name: 'Wine Direct Malta', po_number: 'PO-2026-007', delivery_note: 'DN-1256',
                received_date: '2026-02-11T11:00', items_count: 8, total_value: 2100.00, status: 'posted', variance_count: 0,
                qty_discrepancy: 0, price_discrepancy: 0, lots_tracked: 0, line_items: [],
            },
            {
                id: 'GRN-005', supplier_name: 'Caffè Malta Roasters', po_number: '', delivery_note: '',
                received_date: '2026-02-10T09:30', items_count: 2, total_value: 180.00, status: 'draft', variance_count: 0,
                qty_discrepancy: 0, price_discrepancy: 0, lots_tracked: 0, line_items: [],
            },
        ];
    }

    // ── KPI Calculations ──
    const stats = useMemo(() => {
        const total = grns.length;
        const posted = grns.filter(g => g.status === 'posted').length;
        const withVariance = grns.filter(g => g.variance_count > 0).length;
        const totalValue = grns.reduce((sum, g) => sum + (g.total_value || 0), 0);
        const totalDiscrepancies = grns.reduce((sum, g) => sum + (g.qty_discrepancy || 0) + (g.price_discrepancy || 0), 0);
        const totalLots = grns.reduce((sum, g) => sum + (g.lots_tracked || 0), 0);
        return { total, posted, withVariance, totalValue, totalDiscrepancies, totalLots };
    }, [grns]);

    const addItem = () => {
        setForm(prev => ({
            ...prev,
            items: [...prev.items, {
                item_id: '', item_name: '', ordered_qty: '', received_qty: '', unit: 'kg',
                unit_price: '', po_price: '', lot_number: '', expiry_date: '', temperature: '',
            }],
        }));
    };

    const removeItem = (idx: number) => {
        setForm(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== idx) }));
    };

    const updateItem = (idx: number, field: string, value: string) => {
        setForm(prev => ({
            ...prev,
            items: prev.items.map((it, i) => i === idx ? { ...it, [field]: value } : it),
        }));
    };

    const handleCreate = async () => {
        if (!form.supplier_id) { toast.error('Select a supplier'); return; }
        if (form.items.some(i => !i.received_qty)) { toast.error('Enter received quantity for all items'); return; }

        setSaving(true);
        try {
            await api.post('/inventory/receiving/grn', {
                venue_id: activeVenue!.id,
                supplier_id: form.supplier_id,
                po_number: form.po_number,
                delivery_note: form.delivery_note,
                items: form.items.map(i => ({
                    item_id: i.item_id,
                    ordered_qty: parseFloat(i.ordered_qty) || 0,
                    received_qty: parseFloat(i.received_qty),
                    unit: i.unit,
                    unit_price: parseFloat(i.unit_price) || 0,
                    po_price: parseFloat(i.po_price) || 0,
                    lot_number: i.lot_number,
                    expiry_date: i.expiry_date,
                    temperature: i.temperature,
                })),
            });
            toast.success('GRN created successfully');
            setCreateOpen(false);
            setForm({
                supplier_id: '', po_number: '', delivery_note: '',
                items: [{ item_id: '', item_name: '', ordered_qty: '', received_qty: '', unit: 'kg', unit_price: '', po_price: '', lot_number: '', expiry_date: '', temperature: '' }],
            });
            loadAll();
        } catch (err: unknown) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            logger.error('Failed to create GRN', err as any);
            toast.error('Failed to create GRN');
        } finally {
            setSaving(false);
        }
    };

    const handlePost = async (grnId: string) => {
        try {
            await api.post(`/inventory/receiving/grn/${grnId}/post`);
            toast.success('GRN posted to ledger');
            loadAll();
        } catch (err: unknown) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            logger.error('Failed to post GRN', err as any);
            toast.error('Failed to post GRN');
        }
    };

    const openReconciliation = (grn: GRNData) => {
        setSelectedGRN(grn);
        setReconcileOpen(true);
    };

    // ── Column Definitions ──
    const COLUMNS = useMemo(() => [
        {
            key: 'id', label: 'GRN #', enableSorting: true, size: 100,
            render: (row: GRNData) => <span className="font-mono text-sm font-medium">{row.id}</span>,
        },
        {
            key: 'supplier_name', label: 'Supplier', enableSorting: true, size: 180,
            render: (row: GRNData) => (
                <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-md bg-muted flex items-center justify-center shrink-0">
                        <Truck className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                        <div className="font-medium text-sm">{row.supplier_name}</div>
                        {row.po_number && <div className="text-xs text-muted-foreground">PO: {row.po_number}</div>}
                    </div>
                </div>
            ),
        },
        {
            key: 'received_date', label: 'Received', enableSorting: true, size: 110,
            render: (row: GRNData) => (
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    <span className="tabular-nums">{new Date(row.received_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span>
                </div>
            ),
        },
        { key: 'items_count', label: 'Items', size: 60, render: (row: GRNData) => <span className="tabular-nums">{row.items_count}</span> },
        {
            key: 'total_value', label: 'Total', enableSorting: true, size: 100,
            render: (row: GRNData) => <span className="font-medium tabular-nums text-green-600 dark:text-green-400">€{(row.total_value || 0).toFixed(2)}</span>,
        },
        // Gap 11: Reconciliation column
        {
            key: 'reconciliation', label: 'Reconciliation', size: 130,
            render: (row: GRNData) => <ReconciliationBadge row={row} />,
        },
        // Gap 14: Lots tracked column
        {
            key: 'lots_tracked', label: 'Lots', size: 70,
            render: (row: GRNData) => row.lots_tracked > 0
                ? <Badge variant="outline" className="text-xs text-blue-600 dark:text-blue-400 border-blue-400 gap-1"><QrCode className="h-3 w-3" /> {row.lots_tracked}</Badge>
                : <span className="text-xs text-muted-foreground">—</span>,
        },
        {
            key: 'status', label: 'Status', size: 90,
            filterType: 'select',
            filterOptions: [
                { value: 'draft', label: 'Draft' }, { value: 'posted', label: 'Posted' }, { value: 'with_variance', label: 'Variance' },
            ],
            render: (row: GRNData) => <GRNStatusBadge status={row.status} />,
        },
        {
            key: 'actions', label: 'Actions', size: 130,
            render: (row: GRNData) => (
                <div className="flex gap-1">
                    {row.status === 'draft' && (
                        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => handlePost(row.id)}>Post</Button>
                    )}
                    {(row.line_items?.length > 0) && (
                        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => openReconciliation(row)}>
                            <Scale className="h-3 w-3 mr-1" /> Reconcile
                        </Button>
                    )}
                </div>
            ),
        },
    ], []);

    return (
        <PageContainer
            title="Goods Received Notes"
            description="Receive deliveries, reconcile against PO, track lot numbers"
            actions={
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={loadAll}>
                        <RefreshCw className="h-4 w-4 mr-2" />Refresh
                    </Button>
                    <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                        <DialogTrigger asChild>
                            <Button size="sm"><Plus className="h-4 w-4 mr-2" />New GRN</Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle>Create Goods Received Note</DialogTitle>
                                <DialogDescription>Record delivery with lot tracking and invoice reconciliation</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-2">
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <Label>Supplier</Label>
                                        <Select value={form.supplier_id} onValueChange={v => setForm(p => ({ ...p, supplier_id: v }))}>
                                            <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
                                            <SelectContent>
                                                {suppliers.map((s: SupplierItem) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>PO Number (optional)</Label>
                                        <Input value={form.po_number} onChange={e => setForm(p => ({ ...p, po_number: e.target.value }))} placeholder="PO-2026-XXX" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Delivery Note Ref</Label>
                                        <Input value={form.delivery_note} onChange={e => setForm(p => ({ ...p, delivery_note: e.target.value }))} placeholder="DN-XXXX" />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <Label>Items Received (with Lot Tracking)</Label>
                                        <Button variant="outline" size="sm" onClick={addItem}>
                                            <Plus className="h-3 w-3 mr-1" /> Add Item
                                        </Button>
                                    </div>
                                    {form.items.map((item, idx) => (
                                        <div key={idx} className="p-3 rounded-lg border bg-muted/50 space-y-2">
                                            <div className="flex items-end gap-2">
                                                <div className="flex-1 space-y-1">
                                                    <Label className="text-xs">Item</Label>
                                                    <Select value={item.item_id} onValueChange={(v: string) => {
                                                        const found = inventoryItems.find((i: InventoryItemData) => i.id === v);
                                                        updateItem(idx, 'item_id', v);
                                                        if (found) updateItem(idx, 'item_name', found.name);
                                                    }}>
                                                        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select item" /></SelectTrigger>
                                                        <SelectContent>
                                                            {inventoryItems.slice(0, 50).map((i: InventoryItemData) => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="w-16 space-y-1">
                                                    <Label className="text-xs">Ordered</Label>
                                                    <Input className="h-8 text-xs" type="number" value={item.ordered_qty} onChange={e => updateItem(idx, 'ordered_qty', e.target.value)} />
                                                </div>
                                                <div className="w-16 space-y-1">
                                                    <Label className="text-xs">Received</Label>
                                                    <Input className="h-8 text-xs" type="number" value={item.received_qty} onChange={e => updateItem(idx, 'received_qty', e.target.value)} />
                                                </div>
                                                <div className="w-14 space-y-1">
                                                    <Label className="text-xs">Unit</Label>
                                                    <Input className="h-8 text-xs" value={item.unit} onChange={e => updateItem(idx, 'unit', e.target.value)} />
                                                </div>
                                                <div className="w-16 space-y-1">
                                                    <Label className="text-xs">PO €</Label>
                                                    <Input className="h-8 text-xs" type="number" step="0.01" value={item.po_price} onChange={e => updateItem(idx, 'po_price', e.target.value)} />
                                                </div>
                                                <div className="w-16 space-y-1">
                                                    <Label className="text-xs">Inv €</Label>
                                                    <Input className="h-8 text-xs" type="number" step="0.01" value={item.unit_price} onChange={e => updateItem(idx, 'unit_price', e.target.value)} />
                                                </div>
                                                {form.items.length > 1 && (
                                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive" onClick={() => removeItem(idx)}>
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                )}
                                            </div>
                                            {/* Gap 14: Lot Traceability Fields */}
                                            <div className="flex gap-2 pl-1">
                                                <div className="flex-1 space-y-1">
                                                    <Label className="text-[10px] text-muted-foreground flex items-center gap-1"><QrCode className="h-3 w-3" /> Lot / Batch #</Label>
                                                    <Input className="h-7 text-xs font-mono" value={item.lot_number} onChange={e => updateItem(idx, 'lot_number', e.target.value)} placeholder="LOT-XXX" />
                                                </div>
                                                <div className="w-32 space-y-1">
                                                    <Label className="text-[10px] text-muted-foreground">Expiry Date</Label>
                                                    <Input className="h-7 text-xs" type="date" value={item.expiry_date} onChange={e => updateItem(idx, 'expiry_date', e.target.value)} />
                                                </div>
                                                <div className="w-20 space-y-1">
                                                    <Label className="text-[10px] text-muted-foreground">Temp °C</Label>
                                                    <Input className="h-7 text-xs" type="number" step="0.1" value={item.temperature} onChange={e => updateItem(idx, 'temperature', e.target.value)} placeholder="4.0" />
                                                </div>
                                                {/* Qty variance indicator */}
                                                {item.ordered_qty && item.received_qty && parseFloat(item.ordered_qty) !== parseFloat(item.received_qty) && (
                                                    <div className="flex items-end pb-0.5">
                                                        <Badge variant="outline" className="text-xs text-red-600 dark:text-red-400 border-red-400">
                                                            Δ {(parseFloat(item.received_qty) - parseFloat(item.ordered_qty)).toFixed(1)}
                                                        </Badge>
                                                    </div>
                                                )}
                                                {/* Price variance indicator */}
                                                {item.po_price && item.unit_price && parseFloat(item.po_price) !== parseFloat(item.unit_price) && (
                                                    <div className="flex items-end pb-0.5">
                                                        <Badge variant="outline" className="text-xs text-amber-600 dark:text-amber-400 border-amber-400">
                                                            €Δ {(parseFloat(item.unit_price) - parseFloat(item.po_price)).toFixed(2)}
                                                        </Badge>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                                <Button onClick={handleCreate} disabled={saving}>
                                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Create GRN
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            }
        >
            {/* ── KPI Stat Cards (Enhanced) ── */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
                <StatCard icon={ClipboardCheck} label="Total GRNs" value={stats.total} color="text-blue-600 dark:text-blue-400" />
                <StatCard icon={CheckCircle2} label="Posted" value={stats.posted} color="text-green-600 dark:text-green-400" />
                <StatCard icon={AlertTriangle} label="With Variance" value={stats.withVariance} color="text-amber-600 dark:text-amber-400" />
                <StatCard icon={Package} label="Total Received" value={`€${stats.totalValue.toFixed(2)}`} color="text-green-600 dark:text-green-400" />
                <StatCard icon={AlertCircle} label="Discrepancies" value={stats.totalDiscrepancies} subtext="qty + price" color="text-red-600 dark:text-red-400" />
                <StatCard icon={QrCode} label="Lots Tracked" value={stats.totalLots} color="text-blue-600 dark:text-blue-400" />
            </div>

            {/* ── Data Table ── */}
            <DataTable
                columns={COLUMNS}
                data={grns}
                loading={loading}
                totalCount={grns.length}
                enableGlobalSearch={true}
                enableFilters={true}
                enablePagination={true}
                emptyMessage="No goods received notes found. Create your first GRN."
                tableId="grn"
                venueId={activeVenue?.id}
            />

            {/* ── Gap 11: Reconciliation Detail Dialog ── */}
            <Dialog open={reconcileOpen} onOpenChange={setReconcileOpen}>
                <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Scale className="h-5 w-5" /> Line-Level Reconciliation — {selectedGRN?.id}
                        </DialogTitle>
                        <DialogDescription>
                            PO vs Received vs Invoice — {selectedGRN?.supplier_name}
                        </DialogDescription>
                    </DialogHeader>

                    {selectedGRN && selectedGRN.line_items && selectedGRN.line_items.length > 0 ? (
                        <div className="space-y-4">
                            {/* Summary */}
                            <div className="grid grid-cols-3 gap-3">
                                <Card><CardContent className="p-3 text-center">
                                    <p className="text-xs text-muted-foreground">Total Lines</p>
                                    <p className="text-xl font-bold">{selectedGRN.line_items.length}</p>
                                </CardContent></Card>
                                <Card><CardContent className="p-3 text-center">
                                    <p className="text-xs text-muted-foreground">Qty Discrepancies</p>
                                    <p className="text-xl font-bold text-red-500">{selectedGRN.qty_discrepancy || 0}</p>
                                </CardContent></Card>
                                <Card><CardContent className="p-3 text-center">
                                    <p className="text-xs text-muted-foreground">Price Discrepancies</p>
                                    <p className="text-xl font-bold text-amber-500">{selectedGRN.price_discrepancy || 0}</p>
                                </CardContent></Card>
                            </div>

                            {/* Line Items Table */}
                            <div className="border rounded-lg overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-muted text-muted-foreground text-xs">
                                            <th className="text-left px-3 py-2">Item</th>
                                            <th className="text-right px-3 py-2">Ordered</th>
                                            <th className="text-right px-3 py-2">Received</th>
                                            <th className="text-right px-3 py-2">Qty Δ</th>
                                            <th className="text-right px-3 py-2">PO €</th>
                                            <th className="text-right px-3 py-2">Invoice €</th>
                                            <th className="text-right px-3 py-2">Price Δ</th>
                                            <th className="text-left px-3 py-2">Lot #</th>
                                            <th className="text-left px-3 py-2">Expiry</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {selectedGRN.line_items.map((line: GRNLineItem, idx: number) => {
                                            const qtyDiff = line.received - line.ordered;
                                            const priceDiff = (line.invoice_price || 0) - (line.po_price || 0);
                                            const hasQtyIssue = qtyDiff !== 0;
                                            const hasPriceIssue = priceDiff !== 0;
                                            return (
                                                <tr key={idx} className={`border-t ${hasQtyIssue || hasPriceIssue ? 'bg-red-950/10' : ''}`}>
                                                    <td className="px-3 py-2 font-medium">{line.name}</td>
                                                    <td className="px-3 py-2 text-right tabular-nums">{line.ordered} {line.unit}</td>
                                                    <td className="px-3 py-2 text-right tabular-nums">{line.received} {line.unit}</td>
                                                    <td className={`px-3 py-2 text-right tabular-nums font-bold ${hasQtyIssue ? 'text-red-500' : 'text-green-500'}`}>
                                                        {qtyDiff === 0 ? '✓' : `${qtyDiff > 0 ? '+' : ''}${qtyDiff}`}
                                                    </td>
                                                    <td className="px-3 py-2 text-right tabular-nums">€{(line.po_price || 0).toFixed(2)}</td>
                                                    <td className="px-3 py-2 text-right tabular-nums">€{(line.invoice_price || 0).toFixed(2)}</td>
                                                    <td className={`px-3 py-2 text-right tabular-nums font-bold ${hasPriceIssue ? 'text-amber-500' : 'text-green-500'}`}>
                                                        {priceDiff === 0 ? '✓' : `€${priceDiff > 0 ? '+' : ''}${priceDiff.toFixed(2)}`}
                                                    </td>
                                                    <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{line.lot || '—'}</td>
                                                    <td className="px-3 py-2 text-xs tabular-nums">
                                                        {line.expiry ? (
                                                            <span className={new Date(line.expiry) < new Date() ? 'text-red-500 font-bold' : 'text-muted-foreground'}>
                                                                {new Date(line.expiry).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                                                            </span>
                                                        ) : '—'}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* Gap 14: Traceability Actions */}
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" className="gap-1">
                                    <Search className="h-3.5 w-3.5" /> Forward Trace (Lot → Recipes → Orders)
                                </Button>
                                <Button variant="outline" size="sm" className="gap-1 text-red-600 dark:text-red-400 border-red-400 hover:bg-red-950/20">
                                    <Shield className="h-3.5 w-3.5" /> Recall Alert
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <p className="text-muted-foreground text-sm py-4">No line-level data available for this GRN.</p>
                    )}
                </DialogContent>
            </Dialog>
        </PageContainer>
    );
}
