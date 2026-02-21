/**
 * TemplateGallery — Curated industry template presets
 * 7 categories with one-click install into user's templates.
 */
import React, { useState } from 'react';
import {
    X, Download, Eye, Star, Search, ChefHat, Coffee,
    Hotel, UtensilsCrossed, Truck, GlassWater
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Card, CardContent } from '../../components/ui/card';
import { cn } from '../../lib/utils';
import { type ReceiptTemplate, type GalleryCategory, makeTemplate } from './types';

interface TemplateGalleryProps {
    open: boolean;
    onClose: () => void;
    onInstall: (template: ReceiptTemplate) => void;
    onPreview: (template: ReceiptTemplate) => void;
}

/* ─── Gallery Categories with Preset Templates ─── */
const GALLERY: GalleryCategory[] = [
    {
        id: 'pizzeria', name: 'Pizzeria & Italian', icon: '🍕',
        description: 'Classic Italian restaurant receipts with wine pairings and pizza box stickers',
        templates: [
            makeTemplate({
                id: 'g-pizza-1', name: 'Classic Pizzeria', type: 'customer',
                headerLine1: '🍕 La Pizzeria', headerLine2: 'Via Roma 42, Napoli', headerLine3: 'Tel: +39 081 234 5678',
                showTipLine: true, footerLine1: 'Grazie! Buon appetito!', footerLine2: 'WiFi: PizzaGuest',
                qrCodeUrl: 'https://example.com/review'
            }),
            makeTemplate({
                id: 'g-pizza-2', name: 'Pizza Kitchen Ticket', type: 'kitchen',
                headerLine1: '🔥 FORNO / OVEN', showLogo: false, showItemPrices: false,
                showTax: false, showPaymentMethod: false, showTipLine: false, showCourseHeaders: true, fontSize: 'large'
            }),
            makeTemplate({
                id: 'g-pizza-3', name: 'Pizza Box Sticker', type: 'delivery',
                headerLine1: 'La Pizzeria Delivery', headerLine2: 'Order Ready!',
                showServer: false, showTable: false, showTipLine: false, showTax: false, showBarcode: true, paperWidth: '58mm'
            }),
        ]
    },
    {
        id: 'cafe', name: 'Café & Coffee', icon: '☕',
        description: 'Minimal coffee shop receipts with loyalty stamps and barista tickets',
        templates: [
            makeTemplate({
                id: 'g-cafe-1', name: 'Artisan Café Receipt', type: 'customer',
                headerLine1: '☕ The Daily Grind', headerLine2: 'Specialty Coffee & Bakery', headerLine3: 'Open 7AM – 6PM',
                showTable: false, showServer: false, showCourseHeaders: false, showTipLine: true,
                footerLine1: 'Your 8th coffee is FREE! ☕', footerLine2: 'Follow @thedailygrind', paperWidth: '58mm', fontSize: 'small'
            }),
            makeTemplate({
                id: 'g-cafe-2', name: 'Barista Prep Ticket', type: 'kitchen',
                headerLine1: '☕ BARISTA', showLogo: false, showItemPrices: false,
                showTax: false, showPaymentMethod: false, showTipLine: false, showTable: false,
                fontSize: 'large', paperWidth: '58mm'
            }),
        ]
    },
    {
        id: 'hotel', name: 'Hotel Restaurant', icon: '🏨',
        description: 'Room charge slips, breakfast vouchers, minibar receipts, and conference catering',
        templates: [
            makeTemplate({
                id: 'g-hotel-1', name: 'Hotel Dining Receipt', type: 'customer',
                headerLine1: 'Grand Palace Hotel', headerLine2: 'The Terrace Restaurant', headerLine3: 'Tel: +356 2222 3333',
                showTipLine: true, footerLine1: 'Thank you for dining with us', footerLine2: 'Charge to room or card'
            }),
            makeTemplate({
                id: 'g-hotel-2', name: 'Room Charge Voucher', type: 'room_charge',
                headerLine1: 'Grand Palace Hotel', headerLine2: 'Room Charge Slip',
                showTipLine: true, footerLine1: 'Guest Signature:', footerLine2: '____________________________',
                footerLine3: 'Charged to Room Account'
            }),
            makeTemplate({
                id: 'g-hotel-3', name: 'Breakfast Voucher', type: 'customer',
                headerLine1: 'Grand Palace Hotel', headerLine2: '🌅 Breakfast Included',
                showItemPrices: false, showTax: false, showPaymentMethod: false, showTipLine: false,
                footerLine1: 'Included in room rate', footerLine2: 'Valid for current stay only'
            }),
            makeTemplate({
                id: 'g-hotel-4', name: 'Minibar Receipt', type: 'room_charge',
                headerLine1: 'Grand Palace Hotel', headerLine2: 'Minibar Charge',
                showServer: false, showTable: false, showTipLine: false,
                footerLine1: 'Charged to Room Account'
            }),
        ]
    },
    {
        id: 'finedining', name: 'Fine Dining', icon: '🍷',
        description: 'Elegant receipts with wine pairings, tasting menu notes, and sommelier service',
        templates: [
            makeTemplate({
                id: 'g-fine-1', name: 'Fine Dining Receipt', type: 'customer',
                headerLine1: 'Noma Copenhagen', headerLine2: 'New Nordic Cuisine', headerLine3: 'Since 2003',
                showTipLine: true, showCourseHeaders: true,
                footerLine1: 'We hope you enjoyed your dining experience',
                footerLine2: 'Please leave a review', qrCodeUrl: 'https://example.com/review'
            }),
            makeTemplate({
                id: 'g-fine-2', name: 'Tasting Menu Card', type: 'customer',
                headerLine1: '✦ Tasting Menu ✦', headerLine2: 'Chef\'s Selection',
                showItemPrices: false, showTax: false, showPaymentMethod: false, showTipLine: false,
                showCourseHeaders: true, footerLine1: 'Wine pairing selected by our Sommelier'
            }),
            makeTemplate({
                id: 'g-fine-3', name: 'Kitchen Pass', type: 'kitchen',
                headerLine1: '🔔 PASS', showLogo: false, showItemPrices: false, showTax: false,
                showPaymentMethod: false, showTipLine: false, showCourseHeaders: true, fontSize: 'large'
            }),
        ]
    },
    {
        id: 'fastfood', name: 'Fast Food & QSR', icon: '🍔',
        description: 'Quick service receipts, drive-thru tickets, combo deals, and kiosk receipts',
        templates: [
            makeTemplate({
                id: 'g-fast-1', name: 'Quick Service Receipt', type: 'customer',
                headerLine1: 'Burger Barn', headerLine2: 'Fast • Fresh • Tasty',
                showServer: false, showTable: false, showCourseHeaders: false, showTipLine: false,
                footerLine1: 'Download our app for rewards!', footerLine2: 'Order online: burgerbarn.com',
                fontSize: 'small', paperWidth: '58mm'
            }),
            makeTemplate({
                id: 'g-fast-2', name: 'Drive-Thru Ticket', type: 'kitchen',
                headerLine1: '🚗 DRIVE-THRU', showLogo: false, showItemPrices: false, showTable: false,
                showTax: false, showPaymentMethod: false, showTipLine: false, showBarcode: true, fontSize: 'large'
            }),
            makeTemplate({
                id: 'g-fast-3', name: 'Self-Service Kiosk', type: 'customer',
                headerLine1: 'Burger Barn', headerLine2: 'Self-Service Order',
                showServer: false, showTable: false, showTipLine: false,
                showBarcode: true, footerLine1: 'Your order number will be called'
            }),
        ]
    },
    {
        id: 'bar', name: 'Bar & Pub', icon: '🍺',
        description: 'Tab receipts, happy hour banners, drink specials, and tap list tickets',
        templates: [
            makeTemplate({
                id: 'g-bar-1', name: 'Bar Tab Receipt', type: 'customer',
                headerLine1: '🍺 The Rusty Barrel', headerLine2: 'Craft Beer & Cocktails',
                showTable: true, showTipLine: true, showCourseHeaders: false,
                footerLine1: 'Tab closed — Thank you!', footerLine2: 'Happy Hour: Mon-Fri 4-7pm'
            }),
            makeTemplate({
                id: 'g-bar-2', name: 'Bar Prep Ticket', type: 'kitchen',
                headerLine1: '🍸 BAR', showLogo: false, showItemPrices: false, showTable: true,
                showTax: false, showPaymentMethod: false, showTipLine: false, fontSize: 'large'
            }),
            makeTemplate({
                id: 'g-bar-3', name: 'Happy Hour Receipt', type: 'customer',
                headerLine1: '🍺 The Rusty Barrel', headerLine2: '🎉 HAPPY HOUR PRICES',
                showTable: true, showTipLine: true,
                footerLine1: 'Happy Hour: Mon-Fri 4-7pm', footerLine2: '50% off selected cocktails!'
            }),
        ]
    },
    {
        id: 'delivery', name: 'Delivery & Cloud Kitchen', icon: '🛵',
        description: 'Delivery dockets, aggregator slips, contactless receipts, driver instructions',
        templates: [
            makeTemplate({
                id: 'g-del-1', name: 'Delivery Docket', type: 'delivery',
                headerLine1: 'Cloud Kitchen Co.', headerLine2: 'Delivery Order',
                showServer: false, showTable: false, showTipLine: false,
                showBarcode: true, footerLine1: 'Driver Notes:', footerLine2: '____________________________'
            }),
            makeTemplate({
                id: 'g-del-2', name: 'UberEats Order Slip', type: 'delivery',
                headerLine1: 'Cloud Kitchen Co.', headerLine2: '🟢 UBER EATS ORDER',
                showServer: false, showTable: false, showTipLine: false, showTax: false, showPaymentMethod: false,
                showBarcode: true, fontSize: 'large'
            }),
            makeTemplate({
                id: 'g-del-3', name: 'Contactless Receipt', type: 'customer',
                headerLine1: 'Cloud Kitchen Co.', headerLine2: 'Contactless Delivery',
                showServer: false, showTable: false, showTipLine: false,
                footerLine1: 'Left at door as requested', footerLine2: 'Thank you for ordering!'
            }),
        ]
    },
];

/* ─── Category Icons ─── */
const CATEGORY_ICONS: Record<string, React.ElementType> = {
    pizzeria: ChefHat,
    cafe: Coffee,
    hotel: Hotel,
    finedining: UtensilsCrossed,
    fastfood: UtensilsCrossed,
    bar: GlassWater,
    delivery: Truck,
};

export const TemplateGallery: React.FC<TemplateGalleryProps> = ({ open, onClose, onInstall, onPreview }) => {
    const [activeCategory, setActiveCategory] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');

    if (!open) return null;

    const filtered = GALLERY
        .filter(cat => activeCategory === 'all' || cat.id === activeCategory)
        .map(cat => ({
            ...cat,
            templates: cat.templates.filter(t =>
                !searchQuery || t.name.toLowerCase().includes(searchQuery.toLowerCase())
            ),
        }))
        .filter(cat => cat.templates.length > 0);

    const totalTemplates = GALLERY.reduce((sum, c) => sum + c.templates.length, 0);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="bg-zinc-950 border border-white/10 rounded-2xl w-full max-w-4xl mx-4 shadow-2xl overflow-hidden max-h-[85vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center">
                            <Star className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white">Template Gallery</h2>
                            <p className="text-xs text-zinc-500">{totalTemplates} curated templates across {GALLERY.length} industries</p>
                        </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={onClose} className="text-zinc-500 hover:text-white">
                        <X className="w-4 h-4" />
                    </Button>
                </div>

                {/* Search + Category Filter */}
                <div className="px-6 py-3 border-b border-white/5 flex-shrink-0">
                    <div className="flex gap-3 mb-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                            <Input
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search templates..."
                                className="pl-9 bg-zinc-900 border-white/10 text-white"
                            />
                        </div>
                    </div>

                    <div className="flex gap-2 overflow-x-auto pb-1">
                        <Button
                            variant={activeCategory === 'all' ? 'default' : 'outline'}
                            size="sm" className="h-7 text-xs flex-shrink-0"
                            onClick={() => setActiveCategory('all')}
                        >
                            All ({totalTemplates})
                        </Button>
                        {GALLERY.map(cat => {
                            const Icon = CATEGORY_ICONS[cat.id] || ChefHat;
                            return (
                                <Button
                                    key={cat.id}
                                    variant={activeCategory === cat.id ? 'default' : 'outline'}
                                    size="sm" className="h-7 text-xs flex-shrink-0 gap-1.5"
                                    onClick={() => setActiveCategory(cat.id)}
                                >
                                    <Icon className="w-3 h-3" /> {cat.name} ({cat.templates.length})
                                </Button>
                            );
                        })}
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
                    {filtered.map(cat => (
                        <div key={cat.id}>
                            <div className="flex items-center gap-2 mb-3">
                                <span className="text-xl">{cat.icon}</span>
                                <div>
                                    <h3 className="text-sm font-semibold text-white">{cat.name}</h3>
                                    <p className="text-[11px] text-zinc-500">{cat.description}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {cat.templates.map(template => (
                                    <Card key={template.id} className="border-white/5 bg-zinc-900/50 hover:border-zinc-600 transition-all group">
                                        <CardContent className="pt-4 pb-3 px-4">
                                            <div className="flex items-start justify-between mb-2">
                                                <div>
                                                    <h4 className="text-sm font-medium text-white">{template.name}</h4>
                                                    <span className="text-[10px] text-zinc-500">{template.type} • {template.paperWidth}</span>
                                                </div>
                                                <Badge className="text-[9px] px-1.5 py-0 bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                                                    FREE
                                                </Badge>
                                            </div>

                                            {/* Mini feature list */}
                                            <div className="flex flex-wrap gap-1 mb-3">
                                                {template.showTipLine && <span className="text-[9px] text-muted-foreground bg-zinc-800 px-1 py-0.5 rounded">Tip</span>}
                                                {template.showTax && <span className="text-[9px] text-muted-foreground bg-zinc-800 px-1 py-0.5 rounded">Tax</span>}
                                                {template.qrCodeUrl && <span className="text-[9px] text-cyan-400 bg-cyan-500/10 px-1 py-0.5 rounded">QR</span>}
                                                {template.showBarcode && <span className="text-[9px] text-muted-foreground bg-zinc-800 px-1 py-0.5 rounded">Barcode</span>}
                                                {template.showCourseHeaders && <span className="text-[9px] text-muted-foreground bg-zinc-800 px-1 py-0.5 rounded">Courses</span>}
                                            </div>

                                            <div className="flex gap-2">
                                                <Button size="sm" className="flex-1 h-7 text-xs bg-emerald-600 hover:bg-emerald-700"
                                                    onClick={() => { onInstall({ ...template, id: crypto.randomUUID() }); }}>
                                                    <Download className="w-3 h-3 mr-1" /> Install
                                                </Button>
                                                <Button variant="outline" size="sm" className="h-7 text-xs text-muted-foreground border-white/10"
                                                    onClick={() => onPreview(template)}>
                                                    <Eye className="w-3 h-3" />
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    ))}

                    {filtered.length === 0 && (
                        <div className="text-center py-12">
                            <Search className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                            <p className="text-zinc-500">No templates match your search</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TemplateGallery;
