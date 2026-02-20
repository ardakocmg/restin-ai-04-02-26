/**
 * ReceiptTemplates.tsx — Premium Receipt Template Management
 * Full-featured template editor with live thermal preview, type filtering,
 * and venue auto-population. Covers all POS print scenarios.
 */
import React, { useState, useEffect, useMemo } from 'react';
import {
    FileText, Plus, Save, Trash2, Eye, Printer, ChefHat, BarChart3,
    Receipt, Hotel, Truck, Gift, Copy, Wifi, SlidersHorizontal, LayoutGrid
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Switch } from '../../components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../../components/ui/sheet';
import { Tabs, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { cn } from '../../lib/utils';
import { useVenueConfig } from '../../hooks/shared/useVenueConfig';
import api from '../../lib/api';

/* ─── Types ─── */
type TemplateType = 'customer' | 'kitchen' | 'report' | 'invoice' | 'room_charge' | 'delivery' | 'gift';

interface ReceiptTemplate {
    id: string;
    name: string;
    type: TemplateType;
    isDefault: boolean;
    isActive: boolean;
    headerLine1: string;
    headerLine2: string;
    headerLine3: string;
    showLogo: boolean;
    showDateTime: boolean;
    showServer: boolean;
    showTable: boolean;
    showOrderNumber: boolean;
    showItemPrices: boolean;
    showModifiers: boolean;
    showTax: boolean;
    showPaymentMethod: boolean;
    showTipLine: boolean;
    showCourseHeaders: boolean;
    showBarcode: boolean;
    footerLine1: string;
    footerLine2: string;
    footerLine3: string;
    qrCodeUrl: string;
    qrGuestConsole: boolean;
    invoicePrefix: string;
    paperWidth: '58mm' | '80mm';
    fontSize: 'small' | 'medium' | 'large';
}

/* ─── Type Metadata ─── */
const TYPE_META: Record<TemplateType, { label: string; icon: React.ElementType; color: string }> = {
    customer: { label: 'Customer', icon: Receipt, color: '#3B82F6' },
    kitchen: { label: 'Kitchen', icon: ChefHat, color: '#F59E0B' },
    report: { label: 'Report', icon: BarChart3, color: '#10B981' },
    invoice: { label: 'Invoice', icon: FileText, color: '#8B5CF6' },
    room_charge: { label: 'Room Charge', icon: Hotel, color: '#C74634' },
    delivery: { label: 'Delivery', icon: Truck, color: '#06B6D4' },
    gift: { label: 'Gift', icon: Gift, color: '#EC4899' },
};

/* ─── Default Template Factory ─── */
const makeTemplate = (o: Partial<ReceiptTemplate> & { id: string; name: string; type: TemplateType }): ReceiptTemplate => ({
    isDefault: false, isActive: true,
    headerLine1: '', headerLine2: '', headerLine3: '',
    showLogo: true, showDateTime: true, showServer: true, showTable: true,
    showOrderNumber: true, showItemPrices: true, showModifiers: true,
    showTax: true, showPaymentMethod: true, showTipLine: true,
    showCourseHeaders: false, showBarcode: false,
    footerLine1: '', footerLine2: '', footerLine3: '',
    qrCodeUrl: '', qrGuestConsole: false, invoicePrefix: '',
    paperWidth: '80mm', fontSize: 'medium',
    ...o,
});

/* ─── 10 Seed Templates ─── */
const SEED: ReceiptTemplate[] = [
    makeTemplate({
        id: 'tpl-1', name: 'Customer Receipt', type: 'customer', isDefault: true,
        headerLine1: 'Caviar & Bull', headerLine2: '131 Old Bakery Street, Valletta', headerLine3: 'Tel: +356 2123 4567',
        showTipLine: true, footerLine1: 'Thank you for dining with us!', footerLine2: 'WiFi: CaviarGuest / Pass: welcome2024',
        qrCodeUrl: 'https://restin.ai/feedback', qrGuestConsole: true
    }),

    makeTemplate({
        id: 'tpl-2', name: 'Takeaway Receipt', type: 'customer',
        headerLine1: 'Caviar & Bull', headerLine2: 'Order for Pickup / Delivery',
        showServer: false, showTable: false, showTipLine: false,
        footerLine1: 'Thank you for your order!', footerLine2: 'Order Again: restin.ai'
    }),

    makeTemplate({
        id: 'tpl-3', name: 'Kitchen Ticket', type: 'kitchen', isDefault: true,
        showLogo: false, showItemPrices: false, showTax: false, showPaymentMethod: false,
        showTipLine: false, showCourseHeaders: true, fontSize: 'large'
    }),

    makeTemplate({
        id: 'tpl-4', name: 'Bar Ticket', type: 'kitchen',
        headerLine1: '🍸 BAR', showLogo: false, showItemPrices: false, showTax: false,
        showPaymentMethod: false, showTipLine: false, showTable: true, fontSize: 'large'
    }),

    makeTemplate({
        id: 'tpl-5', name: 'End of Day Report', type: 'report', isDefault: true,
        headerLine1: 'Daily Summary Report', showServer: false, showTable: false, showTipLine: false, fontSize: 'small'
    }),

    makeTemplate({
        id: 'tpl-6', name: 'X-Report (Shift)', type: 'report',
        headerLine1: 'Shift Summary', showTable: false, showTipLine: false, fontSize: 'small'
    }),

    makeTemplate({
        id: 'tpl-7', name: 'Invoice / Fiscal', type: 'invoice', isDefault: true,
        headerLine1: 'Caviar & Bull Ltd', headerLine2: 'VAT: MT12345678', headerLine3: '131 Old Bakery Street, Valletta',
        invoicePrefix: 'INV-', showTipLine: false,
        footerLine1: 'This is a fiscal document', footerLine2: 'Retain for your records'
    }),

    makeTemplate({
        id: 'tpl-8', name: 'Room Charge Slip', type: 'room_charge', isDefault: true,
        headerLine1: 'Caviar & Bull', headerLine2: 'Hotel Room Charge',
        showTipLine: true, showTable: true,
        footerLine1: 'Charged to Room — Signature below', footerLine2: '____________________________'
    }),

    makeTemplate({
        id: 'tpl-9', name: 'Delivery Docket', type: 'delivery', isDefault: true,
        headerLine1: 'Caviar & Bull', headerLine2: 'Delivery Order',
        showServer: false, showTable: false, showTipLine: false,
        showBarcode: true, footerLine1: 'Driver Notes:', footerLine2: '____________________________'
    }),

    makeTemplate({
        id: 'tpl-10', name: 'Gift Receipt', type: 'gift', isDefault: true,
        headerLine1: 'Caviar & Bull', headerLine2: '🎁 Gift Receipt',
        showItemPrices: false, showTax: false, showPaymentMethod: false, showTipLine: false,
        footerLine1: 'Gift Message:', footerLine2: '____________________________'
    }),
];

/* ═══════════════════════════════════════════════════════════════
   LIVE THERMAL PREVIEW
   ═══════════════════════════════════════════════════════════════ */

const ThermalPreview: React.FC<{ template: ReceiptTemplate }> = ({ template: t }) => {
    const pw = t.paperWidth === '58mm' ? 240 : 300;
    const fs = t.fontSize === 'small' ? 10 : t.fontSize === 'large' ? 14 : 12;
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

    const isKitchen = t.type === 'kitchen';
    const isRoomCharge = t.type === 'room_charge';
    const isDelivery = t.type === 'delivery';

    const items = [
        { qty: 1, name: 'Margherita Pizza', price: 12.50, course: 'Starters' },
        { qty: 1, name: '  + Extra Mozzarella', price: 2.00, course: 'Starters' },
        { qty: 2, name: 'Grilled Sea Bass', price: 24.00, course: 'Mains' },
        { qty: 1, name: 'Caesar Salad', price: 9.80, course: 'Mains' },
        { qty: 2, name: 'House Red Wine', price: 16.00, course: 'Drinks' },
    ];

    const subtotal = items.reduce((s, i) => s + i.qty * i.price, 0);
    const tax = subtotal * 0.18;
    const total = subtotal + tax;
    let prevCourse = '';

    return (
        <div className="flex flex-col items-center">
            <div className="text-xs text-zinc-500 mb-2 flex items-center gap-1.5">
                <Printer className="w-3 h-3" /> {t.paperWidth} Preview
            </div>
            <div className="bg-white text-black rounded-sm shadow-xl relative overflow-hidden"
                style={{ width: pw, fontFamily: '"Courier New", Courier, monospace', fontSize: fs, lineHeight: 1.4, padding: '16px 12px' }}>
                {/* Torn edge top */}
                <div className="absolute top-0 left-0 right-0 h-2"
                    style={{ background: 'repeating-linear-gradient(90deg, transparent, transparent 4px, #e5e5e5 4px, #e5e5e5 5px)' }} />

                {/* HEADER */}
                <div className="text-center mb-2 mt-1">
                    {t.showLogo && <div className="text-lg mb-0.5">🍽️</div>}
                    {t.headerLine1 && <div className="font-bold" style={{ fontSize: fs + 2 }}>{t.headerLine1}</div>}
                    {t.headerLine2 && <div className="text-gray-600" style={{ fontSize: fs - 1 }}>{t.headerLine2}</div>}
                    {t.headerLine3 && <div className="text-gray-600" style={{ fontSize: fs - 1 }}>{t.headerLine3}</div>}
                </div>

                {t.invoicePrefix && (
                    <div className="text-center font-bold mb-1" style={{ fontSize: fs + 1 }}>{t.invoicePrefix}2026-00042</div>
                )}

                <div className="border-t border-dashed border-gray-400 my-1.5" />

                {/* META */}
                <div className="mb-1.5" style={{ fontSize: fs - 1 }}>
                    {t.showDateTime && <div>{dateStr} {timeStr}</div>}
                    {t.showOrderNumber && <div>Order: #1042</div>}
                    {t.showServer && <div>Server: Sofia C.</div>}
                    {t.showTable && !isDelivery && <div>Table: T-12</div>}
                    {isRoomCharge && <div className="font-bold mt-0.5">Room: 304 — John Smith</div>}
                    {isDelivery && <><div>Platform: UberEats</div><div>Delivery #: UE-889210</div></>}
                </div>

                <div className="border-t border-dashed border-gray-400 my-1.5" />

                {/* ITEMS */}
                <div className="mb-1.5">
                    {items.map((item, idx) => {
                        const showCourse = t.showCourseHeaders && item.course !== prevCourse;
                        if (showCourse) prevCourse = item.course;
                        const isMod = t.showModifiers && item.name.startsWith('  +');
                        return (
                            <React.Fragment key={idx}>
                                {showCourse && (
                                    <div className="font-bold mt-1 mb-0.5 uppercase tracking-wide"
                                        style={{ fontSize: fs - 2, color: '#666' }}>— {item.course} —</div>
                                )}
                                <div className={cn('flex justify-between', isMod && 'text-gray-500')}
                                    style={{ fontSize: isMod ? fs - 2 : fs }}>
                                    <span className={cn(isKitchen && !isMod && 'font-bold')}
                                        style={{ fontSize: isKitchen && !isMod ? fs + 2 : undefined }}>
                                        {!isMod && `${item.qty}x `}{item.name}
                                    </span>
                                    {t.showItemPrices && !isMod && <span>€{(item.qty * item.price).toFixed(2)}</span>}
                                </div>
                            </React.Fragment>
                        );
                    })}
                </div>

                {/* TOTALS */}
                {!isKitchen && (
                    <>
                        <div className="border-t border-dashed border-gray-400 my-1.5" />
                        {t.showItemPrices && (
                            <div className="flex justify-between" style={{ fontSize: fs - 1 }}>
                                <span>Subtotal</span><span>€{subtotal.toFixed(2)}</span>
                            </div>
                        )}
                        {t.showTax && (
                            <div className="flex justify-between text-gray-500" style={{ fontSize: fs - 1 }}>
                                <span>VAT 18%</span><span>€{tax.toFixed(2)}</span>
                            </div>
                        )}
                        {t.showItemPrices && (
                            <>
                                <div className="border-t border-black my-1" />
                                <div className="flex justify-between font-bold" style={{ fontSize: fs + 2 }}>
                                    <span>TOTAL</span><span>€{total.toFixed(2)}</span>
                                </div>
                            </>
                        )}
                    </>
                )}

                {/* PAYMENT */}
                {t.showPaymentMethod && !isKitchen && (
                    <div className="mt-1" style={{ fontSize: fs - 1 }}>
                        Paid: {isRoomCharge ? 'Room Charge — Rm 304' : 'Visa ****4242'}
                    </div>
                )}

                {/* TIP */}
                {t.showTipLine && (
                    <div className="mt-2 border-t border-dashed border-gray-400 pt-2" style={{ fontSize: fs - 1 }}>
                        Tip: __________ Total: __________
                    </div>
                )}

                {/* FOOTER */}
                <div className="text-center mt-3" style={{ fontSize: fs - 1 }}>
                    {t.footerLine1 && <div>{t.footerLine1}</div>}
                    {t.footerLine2 && <div className="text-gray-500">{t.footerLine2}</div>}
                    {t.footerLine3 && <div className="text-gray-500">{t.footerLine3}</div>}
                </div>

                {/* QR */}
                {t.qrCodeUrl && (
                    <div className="flex flex-col items-center mt-3">
                        <div className="w-14 h-14 border-2 border-black rounded-sm flex items-center justify-center">
                            <div className="grid grid-cols-5 grid-rows-5 gap-px w-10 h-10">
                                {Array.from({ length: 25 }).map((_, i) => (
                                    <div key={i} className={cn('w-full h-full', i % 3 === 0 ? 'bg-black' : 'bg-white')} />
                                ))}
                            </div>
                        </div>
                        <div className="text-gray-500 mt-0.5" style={{ fontSize: 7 }}>Scan for feedback</div>
                    </div>
                )}

                {/* BARCODE */}
                {t.showBarcode && (
                    <div className="flex flex-col items-center mt-2">
                        <div className="flex gap-px h-8">
                            {Array.from({ length: 30 }).map((_, i) => (
                                <div key={i} className="bg-black" style={{ width: i % 3 === 0 ? 2 : 1 }} />
                            ))}
                        </div>
                        <div className="text-gray-500" style={{ fontSize: 7 }}>1042-{dateStr.replace(/\//g, '')}</div>
                    </div>
                )}

                {/* Torn edge bottom */}
                <div className="absolute bottom-0 left-0 right-0 h-3"
                    style={{ background: 'repeating-conic-gradient(#fff 0deg 45deg, transparent 45deg 90deg) 0 0 / 8px 8px' }} />
            </div>
        </div>
    );
};

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════ */

export default function ReceiptTemplates() {
    const [templates, setTemplates] = useState<ReceiptTemplate[]>(SEED);
    const [editing, setEditing] = useState<ReceiptTemplate | null>(null);
    const [selectedPreview, setSelectedPreview] = useState<ReceiptTemplate | null>(null);
    const [activeType, setActiveType] = useState<string>('all');
    const [isLive, setIsLive] = useState(false);

    const venueId = localStorage.getItem('restin_pos_venue') || '';
    const { data: apiData } = useVenueConfig<ReceiptTemplate>({ venueId, configType: 'receipt-templates' });

    useEffect(() => {
        if (apiData && apiData.length > 0) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            setTemplates(apiData.map((t: any) => makeTemplate({
                id: t.id || t._id || crypto.randomUUID(), name: t.name || 'Untitled', type: t.type || 'customer', ...t,
            })));
            setIsLive(true);
        }
    }, [apiData]);

    const filtered = useMemo(() =>
        activeType === 'all' ? templates : templates.filter(t => t.type === activeType),
        [templates, activeType]);

    useEffect(() => {
        if (!selectedPreview && filtered.length > 0) setSelectedPreview(filtered[0]);
    }, [filtered, selectedPreview]);

    /* Save */
    const handleSave = async () => {
        if (!editing) return;
        const exists = templates.find(t => t.id === editing.id);
        setTemplates(exists ? templates.map(t => t.id === editing.id ? editing : t) : [...templates, editing]);
        setSelectedPreview(editing);
        try { await api.put(`/print/templates/${editing.id}`, editing); } catch { /* save locally even if API fails */ }
        setEditing(null);
        toast.success(`Template "${editing.name}" saved`);
    };

    const handleDelete = () => {
        if (!editing) return;
        setTemplates(p => p.filter(t => t.id !== editing.id));
        setSelectedPreview(null);
        setEditing(null);
        toast.success('Template deleted');
    };

    const handleDuplicate = () => {
        if (!editing) return;
        const dup = { ...editing, id: crypto.randomUUID(), name: `Copy of ${editing.name}`, isDefault: false };
        setTemplates(p => [...p, dup]);
        setEditing(dup);
        toast.success('Template duplicated');
    };

    const handleNew = () => {
        const typeKey = activeType !== 'all' ? (activeType as TemplateType) : 'customer';
        setEditing(makeTemplate({ id: crypto.randomUUID(), name: `New ${TYPE_META[typeKey].label} Template`, type: typeKey }));
    };

    const toggleField = (key: keyof ReceiptTemplate) => {
        setEditing(p => p ? { ...p, [key]: !p[key as keyof ReceiptTemplate] } as ReceiptTemplate : null);
    };
    const updateField = (key: keyof ReceiptTemplate, value: string) => {
        setEditing(p => p ? { ...p, [key]: value } as ReceiptTemplate : null);
    };

    const typeCounts = useMemo(() => {
        const c: Record<string, number> = { all: templates.length };
        Object.keys(TYPE_META).forEach(k => { c[k] = templates.filter(t => t.type === k).length; });
        return c;
    }, [templates]);

    return (
        <div className="min-h-screen bg-background">
            <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6">

                {/* ── Page Header ── */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                            <Receipt className="w-6 h-6 text-blue-400" />
                            Receipt Templates
                            {isLive && (
                                <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px] ml-2">
                                    <Wifi className="w-3 h-3 mr-1" /> Live
                                </Badge>
                            )}
                        </h1>
                        <p className="text-sm text-zinc-500 mt-1">Manage and preview all receipt, ticket, and document templates for printing</p>
                    </div>
                    <Button onClick={handleNew} className="bg-blue-600 hover:bg-blue-700">
                        <Plus className="w-4 h-4 mr-2" /> New Template
                    </Button>
                </div>

                {/* ── Type Filter Tabs ── */}
                <div className="mb-6 overflow-x-auto">
                    <Tabs value={activeType} onValueChange={setActiveType}>
                        <TabsList className="bg-zinc-900/60 border border-white/5 p-1 h-auto flex-wrap">
                            <TabsTrigger value="all" className="data-[state=active]:bg-zinc-700 data-[state=active]:text-white gap-1.5">
                                <LayoutGrid className="w-3.5 h-3.5" />
                                All <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">{typeCounts.all}</Badge>
                            </TabsTrigger>
                            {Object.entries(TYPE_META).map(([key, meta]) => {
                                const Icon = meta.icon;
                                return (
                                    <TabsTrigger key={key} value={key}
                                        className="data-[state=active]:bg-zinc-700 data-[state=active]:text-white gap-1.5">
                                        <Icon className="w-3.5 h-3.5" style={{ color: meta.color }} />
                                        {meta.label}
                                        {typeCounts[key] > 0 && (
                                            <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">{typeCounts[key]}</Badge>
                                        )}
                                    </TabsTrigger>
                                );
                            })}
                        </TabsList>
                    </Tabs>
                </div>

                {/* ── Two-Panel Layout ── */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* LEFT — Template Grid */}
                    <div className="lg:col-span-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                            {filtered.map(t => {
                                const meta = TYPE_META[t.type];
                                const Icon = meta.icon;
                                const isSelected = selectedPreview?.id === t.id;
                                return (
                                    <Card key={t.id}
                                        className={cn(
                                            'border-white/5 bg-zinc-900/50 backdrop-blur-xl cursor-pointer transition-all group hover:border-zinc-600',
                                            isSelected && 'ring-2 ring-blue-500/50 border-blue-500/30'
                                        )}
                                        onClick={() => setSelectedPreview(t)}>
                                        <CardContent className="pt-5 pb-4 px-5">
                                            <div className="flex items-start justify-between mb-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-lg flex items-center justify-center"
                                                        style={{ background: `${meta.color}15` }}>
                                                        <Icon className="w-4 h-4" style={{ color: meta.color }} />
                                                    </div>
                                                    <div>
                                                        <h3 className="text-sm font-semibold text-white leading-tight">{t.name}</h3>
                                                        <span className="text-[11px] text-zinc-500">{meta.label} • {t.paperWidth}</span>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col items-end gap-1">
                                                    {t.isDefault && (
                                                        <Badge className="text-[9px] px-1.5 py-0 bg-blue-500/10 text-blue-400 border-blue-500/20">DEFAULT</Badge>
                                                    )}
                                                    <Badge className={cn('text-[9px] px-1.5 py-0',
                                                        t.isActive ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'
                                                    )}>{t.isActive ? 'Active' : 'Off'}</Badge>
                                                </div>
                                            </div>

                                            {/* Feature pills */}
                                            <div className="flex flex-wrap gap-1.5 mb-3">
                                                {t.showLogo && <span className="text-[10px] text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded">Logo</span>}
                                                {t.showTax && <span className="text-[10px] text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded">Tax</span>}
                                                {t.showTipLine && <span className="text-[10px] text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded">Tip</span>}
                                                {t.qrCodeUrl && <span className="text-[10px] text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded">QR</span>}
                                                {t.showBarcode && <span className="text-[10px] text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded">Barcode</span>}
                                                {t.invoicePrefix && <span className="text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">{t.invoicePrefix}</span>}
                                            </div>

                                            {/* Actions */}
                                            <div className="flex gap-2 mt-1">
                                                <Button variant="ghost" size="sm" className="h-7 text-xs flex-1 text-zinc-400 hover:text-white"
                                                    onClick={(e) => { e.stopPropagation(); setEditing({ ...t }); }}>
                                                    <SlidersHorizontal className="w-3 h-3 mr-1" /> Edit
                                                </Button>
                                                <Button variant="ghost" size="sm" className="h-7 text-xs text-zinc-400 hover:text-white"
                                                    onClick={(e) => { e.stopPropagation(); setSelectedPreview(t); }}>
                                                    <Eye className="w-3 h-3 mr-1" /> Preview
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })}

                            {filtered.length === 0 && (
                                <div className="col-span-full text-center py-16">
                                    <FileText className="w-12 h-12 mx-auto text-zinc-600 mb-3" />
                                    <p className="text-zinc-500 mb-4">No templates of this type</p>
                                    <Button onClick={handleNew} variant="outline" size="sm">
                                        <Plus className="w-4 h-4 mr-2" /> Create One
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* RIGHT — Live Preview */}
                    <div className="lg:col-span-1">
                        <div className="sticky top-6">
                            <Card className="border-white/5 bg-zinc-900/50 backdrop-blur-xl">
                                <CardContent className="pt-5 pb-6">
                                    <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                        <Eye className="w-3.5 h-3.5" /> Live Preview
                                    </div>
                                    {selectedPreview ? (
                                        <ThermalPreview template={editing && editing.id === selectedPreview.id ? editing : selectedPreview} />
                                    ) : (
                                        <div className="text-center py-12 text-zinc-600">
                                            <Printer className="w-8 h-8 mx-auto mb-2" />
                                            <p className="text-sm">Select a template to preview</p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>

                {/* ── Edit Drawer ── */}
                <Sheet open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
                    <SheetContent className="bg-zinc-950 border-white/10 text-white w-full sm:max-w-lg overflow-y-auto">
                        <SheetHeader>
                            <SheetTitle className="text-white text-lg">
                                {templates.find(t => t.id === editing?.id) ? 'Edit Template' : 'New Template'}
                            </SheetTitle>
                        </SheetHeader>

                        {editing && (
                            <div className="space-y-6 mt-6">
                                {/* Name & Type */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-zinc-400 text-xs">Template Name</Label>
                                        <Input value={editing.name} onChange={e => updateField('name', e.target.value)}
                                            className="bg-zinc-900 border-white/10 text-white" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-zinc-400 text-xs">Type</Label>
                                        <Select value={editing.type} onValueChange={v => updateField('type', v)}>
                                            <SelectTrigger className="bg-zinc-900 border-white/10 text-white"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                {Object.entries(TYPE_META).map(([k, m]) => (
                                                    <SelectItem key={k} value={k}>{m.label}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                {/* Status */}
                                <div className="flex items-center gap-4">
                                    <label className="flex items-center gap-2 text-sm">
                                        <Switch checked={editing.isDefault} onCheckedChange={() => toggleField('isDefault')} />
                                        <span className="text-zinc-300">Default for type</span>
                                    </label>
                                    <label className="flex items-center gap-2 text-sm">
                                        <Switch checked={editing.isActive} onCheckedChange={() => toggleField('isActive')} />
                                        <span className="text-zinc-300">Active</span>
                                    </label>
                                </div>

                                {/* Header */}
                                <div>
                                    <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Header</div>
                                    <div className="space-y-2">
                                        {(['headerLine1', 'headerLine2', 'headerLine3'] as const).map((key, i) => (
                                            <Input key={key} value={editing[key]} onChange={e => updateField(key, e.target.value)}
                                                placeholder={`Header line ${i + 1}`} className="bg-zinc-900 border-white/10 text-white text-sm" />
                                        ))}
                                    </div>
                                </div>

                                {/* Fields */}
                                <div>
                                    <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Fields</div>
                                    <div className="bg-zinc-900/50 rounded-lg border border-white/5 divide-y divide-white/5">
                                        {([
                                            ['showLogo', 'Show Logo'], ['showDateTime', 'Date & Time'], ['showServer', 'Server Name'],
                                            ['showTable', 'Table Number'], ['showOrderNumber', 'Order Number'], ['showItemPrices', 'Item Prices'],
                                            ['showModifiers', 'Modifiers / Add-ons'], ['showCourseHeaders', 'Course Headers'],
                                            ['showTax', 'Tax Breakdown'], ['showPaymentMethod', 'Payment Method'],
                                            ['showTipLine', 'Tip Line'], ['showBarcode', 'Barcode'],
                                        ] as const).map(([key, label]) => (
                                            <div key={key} className="flex items-center justify-between px-4 py-3">
                                                <span className="text-sm text-zinc-300">{label}</span>
                                                <Switch checked={editing[key] as boolean} onCheckedChange={() => toggleField(key)} />
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Footer */}
                                <div>
                                    <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Footer</div>
                                    <div className="space-y-2">
                                        {(['footerLine1', 'footerLine2', 'footerLine3'] as const).map((key, i) => (
                                            <Input key={key} value={editing[key]} onChange={e => updateField(key, e.target.value)}
                                                placeholder={`Footer line ${i + 1}`} className="bg-zinc-900 border-white/10 text-white text-sm" />
                                        ))}
                                    </div>
                                </div>

                                {/* QR & Invoice */}
                                <div>
                                    <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">QR Code & Invoice</div>
                                    <div className="space-y-3">
                                        <div className="space-y-1.5">
                                            <Label className="text-zinc-400 text-xs">QR Code URL</Label>
                                            <Input value={editing.qrCodeUrl} onChange={e => updateField('qrCodeUrl', e.target.value)}
                                                placeholder="https://restin.ai/feedback" className="bg-zinc-900 border-white/10 text-white text-sm" />
                                        </div>
                                        <label className="flex items-center gap-2 text-sm">
                                            <Switch checked={editing.qrGuestConsole} onCheckedChange={() => toggleField('qrGuestConsole')} />
                                            <span className="text-zinc-300">QR links to Guest Console</span>
                                        </label>
                                        <div className="space-y-1.5">
                                            <Label className="text-zinc-400 text-xs">Invoice Prefix</Label>
                                            <Input value={editing.invoicePrefix} onChange={e => updateField('invoicePrefix', e.target.value)}
                                                placeholder="e.g. INV-" maxLength={10}
                                                className="bg-zinc-900 border-white/10 text-white text-sm" />
                                        </div>
                                    </div>
                                </div>

                                {/* Paper Settings */}
                                <div>
                                    <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Paper Settings</div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <Label className="text-zinc-400 text-xs">Paper Width</Label>
                                            <Select value={editing.paperWidth} onValueChange={v => updateField('paperWidth', v)}>
                                                <SelectTrigger className="bg-zinc-900 border-white/10 text-white"><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="58mm">58mm</SelectItem>
                                                    <SelectItem value="80mm">80mm</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-zinc-400 text-xs">Font Size</Label>
                                            <Select value={editing.fontSize} onValueChange={v => updateField('fontSize', v)}>
                                                <SelectTrigger className="bg-zinc-900 border-white/10 text-white"><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="small">Small</SelectItem>
                                                    <SelectItem value="medium">Medium</SelectItem>
                                                    <SelectItem value="large">Large</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex gap-2 pt-4 border-t border-white/5">
                                    <Button onClick={handleSave} className="flex-1 bg-blue-600 hover:bg-blue-700">
                                        <Save className="w-4 h-4 mr-2" /> Save
                                    </Button>
                                    <Button variant="outline" onClick={handleDuplicate}
                                        className="text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/10">
                                        <Copy className="w-4 h-4 mr-1" /> Copy
                                    </Button>
                                    <Button variant="outline" onClick={handleDelete}
                                        className="text-red-400 border-red-500/30 hover:bg-red-500/10">
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        )}
                    </SheetContent>
                </Sheet>

            </div>
        </div>
    );
}
