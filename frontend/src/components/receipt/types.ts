/**
 * Receipt Template Types — Shared across all receipt components
 */

/* ─── Template Types ─── */
export type TemplateType = 'customer' | 'kitchen' | 'report' | 'invoice' | 'room_charge' | 'delivery' | 'gift';

/* ─── Block Types for the Visual Editor ─── */
export type BlockType =
    | 'header' | 'order_info' | 'items' | 'totals' | 'payment'
    | 'tip' | 'footer' | 'qr' | 'barcode' | 'separator' | 'promo' | 'allergen';

export interface TemplateBlock {
    id: string;
    type: BlockType;
    enabled: boolean;
    order: number;
    label: string;
    icon: string; // emoji for simplicity
    settings: Record<string, string | boolean | number>;
    conditions: ConditionalRule[];
}

/* ─── Conditional Rules ─── */
export type ConditionField = 'order_type' | 'payment_method' | 'time_of_day' | 'day_of_week' | 'total_amount' | 'platform' | 'guest_language' | 'season';
export type ConditionOperator = 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'between' | 'in';

export interface ConditionalRule {
    id: string;
    field: ConditionField;
    operator: ConditionOperator;
    value: string;
    action: 'show' | 'hide' | 'replace_text';
    replacementText?: string;
}

/* ─── Receipt Template ─── */
export interface ReceiptTemplate {
    id: string;
    name: string;
    type: TemplateType;
    isDefault: boolean;
    isActive: boolean;
    /* Header */
    headerLine1: string;
    headerLine2: string;
    headerLine3: string;
    /* Field Toggles */
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
    /* Footer */
    footerLine1: string;
    footerLine2: string;
    footerLine3: string;
    /* QR & Invoice */
    qrCodeUrl: string;
    qrGuestConsole: boolean;
    invoicePrefix: string;
    /* Paper */
    paperWidth: '58mm' | '80mm';
    fontSize: 'small' | 'medium' | 'large';
    /* v2 — Block Editor */
    blocks?: TemplateBlock[];
    /* v2 — Conditional Logic */
    conditions?: ConditionalRule[];
    /* v2 — Promo */
    promoText?: string;
    allergenNotice?: string;
}

/* ─── AI Scanner Result ─── */
export interface AIScanResult {
    confidence: number;
    detectedType: TemplateType;
    template: Partial<ReceiptTemplate>;
    rawAnalysis: string;
}

/* ─── Gallery Category ─── */
export interface GalleryCategory {
    id: string;
    name: string;
    icon: string;
    description: string;
    templates: ReceiptTemplate[];
}

/* ─── Type Metadata ─── */
export const TYPE_META: Record<TemplateType, { label: string; color: string }> = {
    customer: { label: 'Customer', color: '#3B82F6' },
    kitchen: { label: 'Kitchen', color: '#F59E0B' },
    report: { label: 'Report', color: '#10B981' },
    invoice: { label: 'Invoice', color: '#8B5CF6' },
    room_charge: { label: 'Room Charge', color: '#C74634' },
    delivery: { label: 'Delivery', color: '#06B6D4' },
    gift: { label: 'Gift', color: '#EC4899' },
};

/* ─── Default Block Layout ─── */
export const DEFAULT_BLOCKS: TemplateBlock[] = [
    { id: 'b-header', type: 'header', enabled: true, order: 0, label: 'Header', icon: '📝', settings: {}, conditions: [] },
    { id: 'b-order', type: 'order_info', enabled: true, order: 1, label: 'Order Info', icon: '📊', settings: {}, conditions: [] },
    { id: 'b-sep1', type: 'separator', enabled: true, order: 2, label: 'Separator', icon: '✂️', settings: { style: 'dashed' }, conditions: [] },
    { id: 'b-items', type: 'items', enabled: true, order: 3, label: 'Items List', icon: '🍕', settings: {}, conditions: [] },
    { id: 'b-sep2', type: 'separator', enabled: true, order: 4, label: 'Separator', icon: '✂️', settings: { style: 'dashed' }, conditions: [] },
    { id: 'b-totals', type: 'totals', enabled: true, order: 5, label: 'Totals', icon: '💰', settings: {}, conditions: [] },
    { id: 'b-payment', type: 'payment', enabled: true, order: 6, label: 'Payment', icon: '💳', settings: {}, conditions: [] },
    { id: 'b-tip', type: 'tip', enabled: true, order: 7, label: 'Tip Line', icon: '✍️', settings: {}, conditions: [] },
    { id: 'b-footer', type: 'footer', enabled: true, order: 8, label: 'Footer', icon: '📄', settings: {}, conditions: [] },
    { id: 'b-qr', type: 'qr', enabled: false, order: 9, label: 'QR Code', icon: '🔲', settings: {}, conditions: [] },
    { id: 'b-barcode', type: 'barcode', enabled: false, order: 10, label: 'Barcode', icon: '📊', settings: {}, conditions: [] },
    { id: 'b-promo', type: 'promo', enabled: false, order: 11, label: 'Promo Banner', icon: '📢', settings: {}, conditions: [] },
    { id: 'b-allergen', type: 'allergen', enabled: false, order: 12, label: 'Allergen Notice', icon: '⚠️', settings: {}, conditions: [] },
];

/* ─── Template Factory ─── */
export const makeTemplate = (o: Partial<ReceiptTemplate> & { id: string; name: string; type: TemplateType }): ReceiptTemplate => ({
    isDefault: false, isActive: true,
    headerLine1: '', headerLine2: '', headerLine3: '',
    showLogo: true, showDateTime: true, showServer: true, showTable: true,
    showOrderNumber: true, showItemPrices: true, showModifiers: true,
    showTax: true, showPaymentMethod: true, showTipLine: true,
    showCourseHeaders: false, showBarcode: false,
    footerLine1: '', footerLine2: '', footerLine3: '',
    qrCodeUrl: '', qrGuestConsole: false, invoicePrefix: '',
    paperWidth: '80mm', fontSize: 'medium',
    blocks: DEFAULT_BLOCKS.map(b => ({ ...b })),
    conditions: [],
    ...o,
});
