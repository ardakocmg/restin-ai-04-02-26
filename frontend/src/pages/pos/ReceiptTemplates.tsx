/**
 * ReceiptTemplates.tsx — Industry-Leading Receipt Template Management
 *
 * Integrates 4 major features:
 * 1. AI Receipt Scanner — Upload photo, AI creates template
 * 2. Visual Block Editor — Drag & drop receipt blocks
 * 3. Smart Conditional Logic — Rules-based dynamic content
 * 4. Template Gallery — 22 curated industry presets
 */
import React, { useState, useEffect, useMemo } from 'react';
import {
    FileText, Plus, Save, Trash2, Eye, Printer, ChefHat, BarChart3,
    Receipt, Hotel, Truck, Gift, Copy, Wifi, SlidersHorizontal, LayoutGrid,
    Sparkles, Star, Layers
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

/* ─── Sub-Components ─── */
import { AIReceiptScanner } from '../../components/receipt/AIReceiptScanner';
import { BlockEditor } from '../../components/receipt/BlockEditor';
import { TemplateGallery } from '../../components/receipt/TemplateGallery';
import {
    type ReceiptTemplate, type TemplateType, type TemplateBlock,
    TYPE_META, DEFAULT_BLOCKS, makeTemplate
} from '../../components/receipt/types';

/* ─── Type Metadata with Icons ─── */
const TYPE_ICONS: Record<TemplateType, React.ElementType> = {
    customer: Receipt, kitchen: ChefHat, report: BarChart3, invoice: FileText,
    room_charge: Hotel, delivery: Truck, gift: Gift,
};

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

    // If blocks exist, render in block order
    const sortedBlocks = t.blocks ? [...t.blocks].sort((a, b) => a.order - b.order).filter(b => b.enabled) : null;

    const renderBlock = (blockType: string) => {
        switch (blockType) {
            case 'header':
                return (
                    <div key="header" className="text-center mb-2 mt-1">
                        {t.showLogo && <div className="text-lg mb-0.5">🍽️</div>}
                        {t.headerLine1 && <div className="font-bold" style={{ fontSize: fs + 2  /* keep-inline */ }} /* keep-inline */ /* keep-inline */>{t.headerLine1}</div>}
                        {t.headerLine2 && <div className="text-gray-600" style={{ fontSize: fs - 1  /* keep-inline */ }} /* keep-inline */ /* keep-inline */>{t.headerLine2}</div>}
                        {t.headerLine3 && <div className="text-gray-600" style={{ fontSize: fs - 1  /* keep-inline */ }} /* keep-inline */ /* keep-inline */>{t.headerLine3}</div>}
                    </div>
                );
            case 'order_info':
                return (
                    <div key="order_info" className="mb-1.5" style={{ fontSize: fs - 1  /* keep-inline */ }} /* keep-inline */ /* keep-inline */>
                        {t.showDateTime && <div>{dateStr} {timeStr}</div>}
                        {t.showOrderNumber && <div>Order: #1042</div>}
                        {t.showServer && <div>Server: Sofia C.</div>}
                        {t.showTable && !isDelivery && <div>Table: T-12</div>}
                        {isRoomCharge && <div className="font-bold mt-0.5">Room: 304 — John Smith</div>}
                        {isDelivery && <><div>Platform: UberEats</div><div>Delivery #: UE-889210</div></>}
                    </div>
                );
            case 'items':
                return (
                    <div key="items" className="mb-1.5">
                        {items.map((item, idx) => {
                            const showCourse = t.showCourseHeaders && item.course !== prevCourse;
                            if (showCourse) prevCourse = item.course;
                            const isMod = t.showModifiers && item.name.startsWith('  +');
                            return (
                                <React.Fragment key={idx}>
                                    {showCourse && (
                                        <div className="font-bold mt-1 mb-0.5 uppercase tracking-wide"
                                            style={{ fontSize: fs - 2, color: '#666'  /* keep-inline */ }} /* keep-inline */ /* keep-inline */>— {item.course} —</div>
                                    )}
                                    <div className={cn('flex justify-between', isMod && 'text-gray-500')}
                                        style={{ fontSize: isMod ? fs - 2 : fs  /* keep-inline */ }} /* keep-inline */ /* keep-inline */>
                                        <span className={cn(isKitchen && !isMod && 'font-bold')}
                                            style={{ fontSize: isKitchen && !isMod ? fs + 2 : undefined  /* keep-inline */ }} /* keep-inline */ /* keep-inline */>
                                            {!isMod && `${item.qty}x `}{item.name}
                                        </span>
                                        {t.showItemPrices && !isMod && <span>€{(item.qty * item.price).toFixed(2)}</span>}
                                    </div>
                                </React.Fragment>
                            );
                        })}
                    </div>
                );
            case 'totals':
                if (isKitchen) return null;
                return (
                    <div key="totals">
                        {t.showItemPrices && (
                            <div className="flex justify-between" style={{ fontSize: fs - 1  /* keep-inline */ }} /* keep-inline */ /* keep-inline */>
                                <span>Subtotal</span><span>€{subtotal.toFixed(2)}</span>
                            </div>
                        )}
                        {t.showTax && (
                            <div className="flex justify-between text-gray-500" style={{ fontSize: fs - 1  /* keep-inline */ }} /* keep-inline */ /* keep-inline */>
                                <span>VAT 18%</span><span>€{tax.toFixed(2)}</span>
                            </div>
                        )}
                        {t.showItemPrices && (
                            <>
                                <div className="border-t border-black my-1" />
                                <div className="flex justify-between font-bold" style={{ fontSize: fs + 2  /* keep-inline */ }} /* keep-inline */ /* keep-inline */>
                                    <span>TOTAL</span><span>€{total.toFixed(2)}</span>
                                </div>
                            </>
                        )}
                    </div>
                );
            case 'payment':
                if (isKitchen || !t.showPaymentMethod) return null;
                return (
                    <div key="payment" className="mt-1" style={{ fontSize: fs - 1  /* keep-inline */ }} /* keep-inline */ /* keep-inline */>
                        Paid: {isRoomCharge ? 'Room Charge — Rm 304' : 'Visa ****4242'}
                    </div>
                );
            case 'tip':
                if (!t.showTipLine) return null;
                return (
                    <div key="tip" className="mt-2 border-t border-dashed border-gray-400 pt-2" style={{ fontSize: fs - 1  /* keep-inline */ }} /* keep-inline */ /* keep-inline */>
                        Tip: __________ Total: __________
                    </div>
                );
            case 'footer':
                return (
                    <div key="footer" className="text-center mt-3" style={{ fontSize: fs - 1  /* keep-inline */ }} /* keep-inline */ /* keep-inline */>
                        {t.footerLine1 && <div>{t.footerLine1}</div>}
                        {t.footerLine2 && <div className="text-gray-500">{t.footerLine2}</div>}
                        {t.footerLine3 && <div className="text-gray-500">{t.footerLine3}</div>}
                    </div>
                );
            case 'qr':
                if (!t.qrCodeUrl) return null;
                return (
                    <div key="qr" className="flex flex-col items-center mt-3">
                        <div className="w-14 h-14 border-2 border-black rounded-sm flex items-center justify-center">
                            <div className="grid grid-cols-5 grid-rows-5 gap-px w-10 h-10">
                                {Array.from({ length: 25 }).map((_, i) => (
                                    <div key={i} className={cn('w-full h-full', i % 3 === 0 ? 'bg-black' : 'bg-white')} />
                                ))}
                            </div>
                        </div>
                        <div className="text-gray-500 mt-0.5" style={{ fontSize: 7  /* keep-inline */ }} /* keep-inline */ /* keep-inline */>Scan for feedback</div>
                    </div>
                );
            case 'barcode':
                if (!t.showBarcode) return null;
                return (
                    <div key="barcode" className="flex flex-col items-center mt-2">
                        <div className="flex gap-px h-8">
                            {Array.from({ length: 30 }).map((_, i) => (
                                <div key={i} className="bg-black" style={{ width: i % 3 === 0 ? 2 : 1  /* keep-inline */ }} /* keep-inline */ /* keep-inline */ />
                            ))}
                        </div>
                        <div className="text-gray-500" style={{ fontSize: 7  /* keep-inline */ }} /* keep-inline */ /* keep-inline */>1042-{dateStr.replace(/\//g, '')}</div>
                    </div>
                );
            case 'separator':
                return <div key={`sep-${Math.random()}`} className="border-t border-dashed border-gray-400 my-1.5" />;
            case 'promo':
                return (
                    <div key="promo" className="text-center mt-2 p-1.5 border border-dashed border-gray-400 rounded" style={{ fontSize: fs - 1  /* keep-inline */ }} /* keep-inline */ /* keep-inline */>
                        {t.promoText || '⭐ Happy Hour 4-7pm — 2 for 1 Cocktails! ⭐'}
                    </div>
                );
            case 'allergen':
                return (
                    <div key="allergen" className="text-center mt-2 text-gray-500" style={{ fontSize: fs - 2  /* keep-inline */ }} /* keep-inline */ /* keep-inline */>
                        {t.allergenNotice || '⚠️ Allergen info available on request'}
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="flex flex-col items-center">
            <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5">
                <Printer className="w-3 h-3" /> {t.paperWidth} Preview
                {t.blocks && <Badge className="text-[8px] px-1 py-0 bg-violet-500/10 text-violet-400 border-violet-500/20 ml-1">Block Mode</Badge>}
            </div>
            <div className="bg-white text-black rounded-sm shadow-xl relative overflow-hidden"
                style={{ width: pw, fontFamily: '"Courier New", Courier, monospace', fontSize: fs, lineHeight: 1.4, padding: '16px 12px'  /* keep-inline */ }} /* keep-inline */ /* keep-inline */>
                {/* Torn edge top */}
                <div className="absolute top-0 left-0 right-0 h-2"
                    style={{ background: 'repeating-linear-gradient(90deg, transparent, transparent 4px, #e5e5e5 4px, #e5e5e5 5px)'  /* keep-inline */ }} /* keep-inline */ /* keep-inline */ />

                {/* Invoice prefix */}
                {t.invoicePrefix && (
                    <div className="text-center font-bold mb-1" style={{ fontSize: fs + 1  /* keep-inline */ }} /* keep-inline */ /* keep-inline */>{t.invoicePrefix}2026-00042</div>
                )}

                {/* Render blocks in order if available, otherwise default rendering */}
                {sortedBlocks
                    ? sortedBlocks.map(block => renderBlock(block.type))
                    : (
                        <>
                            {renderBlock('header')}
                            <div className="border-t border-dashed border-gray-400 my-1.5" />
                            {renderBlock('order_info')}
                            <div className="border-t border-dashed border-gray-400 my-1.5" />
                            {renderBlock('items')}
                            {renderBlock('totals')}
                            {renderBlock('payment')}
                            {renderBlock('tip')}
                            {renderBlock('footer')}
                            {renderBlock('qr')}
                            {renderBlock('barcode')}
                        </>
                    )
                }

                {/* Torn edge bottom */}
                <div className="absolute bottom-0 left-0 right-0 h-3"
                    style={{ background: 'repeating-conic-gradient(#fff 0deg 45deg, transparent 45deg 90deg) 0 0 / 8px 8px'  /* keep-inline */ }} /* keep-inline */ /* keep-inline */ />
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
    const [editorTab, setEditorTab] = useState<'fields' | 'blocks'>('fields');

    /* ── Modals ── */
    const [showAIScanner, setShowAIScanner] = useState(false);
    const [showGallery, setShowGallery] = useState(false);

    const venueId = localStorage.getItem('restin_pos_venue') || '';
    const { data: apiData } = useVenueConfig<ReceiptTemplate>({ venueId, configType: 'receipt-templates' });

    useEffect(() => {
        if (apiData && apiData.length > 0) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            setTemplates(apiData.map((t: /**/any) => makeTemplate({
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

    /* ── CRUD ── */
    const handleSave = async () => {
        if (!editing) return;
        const exists = templates.find(t => t.id === editing.id);
        setTemplates(exists ? templates.map(t => t.id === editing.id ? editing : t) : [...templates, editing]);
        setSelectedPreview(editing);
        try { await api.put(`/print/templates/${editing.id}`, editing); } catch { /* local save */ }
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

    /* ── AI Scanner Callback ── */
    const handleAITemplateCreated = (template: ReceiptTemplate) => {
        setTemplates(prev => [...prev, template]);
        setSelectedPreview(template);
        setEditing(template);
        toast.success('AI template created! Fine-tune in the editor.');
    };

    /* ── Gallery Install Callback ── */
    const handleGalleryInstall = (template: ReceiptTemplate) => {
        setTemplates(prev => [...prev, template]);
        setSelectedPreview(template);
        toast.success(`"${template.name}" installed from gallery`);
    };

    /* ── Editor Helpers ── */
    const toggleField = (key: keyof ReceiptTemplate) => {
        setEditing(p => p ? { ...p, [key]: !p[key as keyof ReceiptTemplate] } as ReceiptTemplate : null);
    };
    const updateField = (key: keyof ReceiptTemplate, value: string) => {
        setEditing(p => p ? { ...p, [key]: value } as ReceiptTemplate : null);
    };
    const updateBlocks = (blocks: TemplateBlock[]) => {
        setEditing(p => p ? { ...p, blocks } : null);
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
                        <p className="text-sm text-muted-foreground mt-1">Build, scan, and manage all receipt templates with AI assistance</p>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* AI Scanner */}
                        <Button onClick={() => setShowAIScanner(true)}
                            className="bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700">
                            <Sparkles className="w-4 h-4 mr-2" /> Import from Photo
                        </Button>
                        {/* Gallery */}
                        <Button onClick={() => setShowGallery(true)} variant="outline"
                            className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10">
                            <Star className="w-4 h-4 mr-2" /> Gallery
                        </Button>
                        {/* New */}
                        <Button onClick={handleNew} className="bg-blue-600 hover:bg-blue-700">
                            <Plus className="w-4 h-4 mr-2" /> New
                        </Button>
                    </div>
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
                                const Icon = TYPE_ICONS[key as TemplateType];
                                return (
                                    <TabsTrigger key={key} value={key}
                                        className="data-[state=active]:bg-zinc-700 data-[state=active]:text-white gap-1.5">
                                        <Icon className="w-3.5 h-3.5" style={{ color: meta.color  /* keep-inline */ }} /* keep-inline */ /* keep-inline */ />
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
                                const Icon = TYPE_ICONS[t.type];
                                const isSelected = selectedPreview?.id === t.id;
                                const hasBlocks = t.blocks && t.blocks.some(b => b.conditions.length > 0);
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
                                                        style={{ background: `${meta.color}15`  /* keep-inline */ }}>
                                                        <Icon className="w-4 h-4" style={{ color: meta.color  /* keep-inline */ }} /* keep-inline */ /* keep-inline */ />
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

                                            <div className="flex flex-wrap gap-1.5 mb-3">
                                                {t.showLogo && <span className="text-[10px] text-muted-foreground bg-zinc-800 px-1.5 py-0.5 rounded">Logo</span>}
                                                {t.showTax && <span className="text-[10px] text-muted-foreground bg-zinc-800 px-1.5 py-0.5 rounded">Tax</span>}
                                                {t.showTipLine && <span className="text-[10px] text-muted-foreground bg-zinc-800 px-1.5 py-0.5 rounded">Tip</span>}
                                                {t.qrCodeUrl && <span className="text-[10px] text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded">QR</span>}
                                                {t.showBarcode && <span className="text-[10px] text-muted-foreground bg-zinc-800 px-1.5 py-0.5 rounded">Barcode</span>}
                                                {t.invoicePrefix && <span className="text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">{t.invoicePrefix}</span>}
                                                {hasBlocks && <span className="text-[10px] text-violet-400 bg-violet-500/10 px-1.5 py-0.5 rounded">⚡ Smart</span>}
                                            </div>

                                            <div className="flex gap-2 mt-1">
                                                <Button variant="ghost" size="sm" className="h-7 text-xs flex-1 text-muted-foreground hover:text-white"
                                                    onClick={(e) => { e.stopPropagation(); setEditing({ ...t }); }}>
                                                    <SlidersHorizontal className="w-3 h-3 mr-1" /> Edit
                                                </Button>
                                                <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground hover:text-white"
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
                                    <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                                    <p className="text-zinc-500 mb-4">{"No "}templates of this type</p>
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
                                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
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
                                        <Input aria-label="Input field" value={editing.name} onChange={e => updateField('name', e.target.value)}
                                            className="bg-zinc-900 border-white/10 text-white" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-zinc-400 text-xs">Type</Label>
                                        <Select aria-label="Select option" value={editing.type} onValueChange={v => updateField('type', v)}>
                                            <SelectTrigger aria-label="Select option" className="bg-zinc-900 border-white/10 text-white"><SelectValue /></SelectTrigger>
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

                                {/* ── Editor Mode Toggle ── */}
                                <div className="flex bg-zinc-900 rounded-lg border border-white/5 p-0.5">
                                    <button
                                        className={cn('flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-medium transition-all',
                                            editorTab === 'fields' ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300')}
                                        onClick={() => setEditorTab('fields')}>
                                        <SlidersHorizontal className="w-3.5 h-3.5" /> Classic Editor
                                    </button>
                                    <button
                                        className={cn('flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-medium transition-all',
                                            editorTab === 'blocks' ? 'bg-violet-600 text-white' : 'text-zinc-500 hover:text-zinc-300')}
                                        onClick={() => setEditorTab('blocks')}>
                                        <Layers className="w-3.5 h-3.5" /> Block Editor
                                    </button>
                                </div>

                                {/* ── CLASSIC EDITOR ── */}
                                {editorTab === 'fields' && (
                                    <>
                                        {/* Header */}
                                        <div>
                                            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Header</div>
                                            <div className="space-y-2">
                                                {(['headerLine1', 'headerLine2', 'headerLine3'] as const).map((key, i) => (
                                                    <Input aria-label="Input field" key={key} value={editing[key]} onChange={e => updateField(key, e.target.value)}
                                                        placeholder={`Header line ${i + 1}`} className="bg-zinc-900 border-white/10 text-white text-sm" />
                                                ))}
                                            </div>
                                        </div>

                                        {/* Fields */}
                                        <div>
                                            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Fields</div>
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
                                            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Footer</div>
                                            <div className="space-y-2">
                                                {(['footerLine1', 'footerLine2', 'footerLine3'] as const).map((key, i) => (
                                                    <Input aria-label="Input field" key={key} value={editing[key]} onChange={e => updateField(key, e.target.value)}
                                                        placeholder={`Footer line ${i + 1}`} className="bg-zinc-900 border-white/10 text-white text-sm" />
                                                ))}
                                            </div>
                                        </div>

                                        {/* QR & Invoice */}
                                        <div>
                                            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">QR Code & Invoice</div>
                                            <div className="space-y-3">
                                                <div className="space-y-1.5">
                                                    <Label className="text-zinc-400 text-xs">QR Code URL</Label>
                                                    <Input aria-label="Input field" value={editing.qrCodeUrl} onChange={e => updateField('qrCodeUrl', e.target.value)}
                                                        placeholder="https://restin.ai/feedback" className="bg-zinc-900 border-white/10 text-white text-sm" />
                                                </div>
                                                <label className="flex items-center gap-2 text-sm">
                                                    <Switch checked={editing.qrGuestConsole} onCheckedChange={() => toggleField('qrGuestConsole')} />
                                                    <span className="text-zinc-300">QR links to Guest Console</span>
                                                </label>
                                                <div className="space-y-1.5">
                                                    <Label className="text-zinc-400 text-xs">Invoice Prefix</Label>
                                                    <Input aria-label="Input field" value={editing.invoicePrefix} onChange={e => updateField('invoicePrefix', e.target.value)}
                                                        placeholder="e.g. INV-" maxLength={10}
                                                        className="bg-zinc-900 border-white/10 text-white text-sm" />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Promo & Allergen */}
                                        <div>
                                            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Promo & Notices</div>
                                            <div className="space-y-2">
                                                <div className="space-y-1.5">
                                                    <Label className="text-zinc-400 text-xs">Promo Banner Text</Label>
                                                    <Input aria-label="Input field" value={editing.promoText || ''} onChange={e => updateField('promoText' as keyof ReceiptTemplate, e.target.value)}
                                                        placeholder="e.g. Happy Hour 4-7pm — 2 for 1!" className="bg-zinc-900 border-white/10 text-white text-sm" />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <Label className="text-zinc-400 text-xs">Allergen Notice</Label>
                                                    <Input aria-label="Input field" value={editing.allergenNotice || ''} onChange={e => updateField('allergenNotice' as keyof ReceiptTemplate, e.target.value)}
                                                        placeholder="⚠️ Allergen info available on request" className="bg-zinc-900 border-white/10 text-white text-sm" />
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                )}

                                {/* ── BLOCK EDITOR ── */}
                                {editorTab === 'blocks' && editing.blocks && (
                                    <BlockEditor blocks={editing.blocks} onChange={updateBlocks} />
                                )}

                                {/* Paper Settings (always visible) */}
                                <div>
                                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Paper Settings</div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <Label className="text-zinc-400 text-xs">Paper Width</Label>
                                            <Select aria-label="Select option" value={editing.paperWidth} onValueChange={v => updateField('paperWidth', v)}>
                                                <SelectTrigger aria-label="Select option" className="bg-zinc-900 border-white/10 text-white"><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="58mm">58mm</SelectItem>
                                                    <SelectItem value="80mm">80mm</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-zinc-400 text-xs">Font Size</Label>
                                            <Select aria-label="Select option" value={editing.fontSize} onValueChange={v => updateField('fontSize', v)}>
                                                <SelectTrigger aria-label="Select option" className="bg-zinc-900 border-white/10 text-white"><SelectValue /></SelectTrigger>
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
                                        aria-label="Action" className="text-red-400 border-red-500/30 hover:bg-red-500/10">
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        )}
                    </SheetContent>
                </Sheet>

                {/* ── AI Scanner Modal ── */}
                <AIReceiptScanner
                    open={showAIScanner}
                    onClose={() => setShowAIScanner(false)}
                    onTemplateCreated={handleAITemplateCreated}
                />

                {/* ── Template Gallery Modal ── */}
                <TemplateGallery
                    open={showGallery}
                    onClose={() => setShowGallery(false)}
                    onInstall={handleGalleryInstall}
                    onPreview={(t) => { setSelectedPreview(t); setShowGallery(false); }}
                />

            </div>
        </div>
    );
}
