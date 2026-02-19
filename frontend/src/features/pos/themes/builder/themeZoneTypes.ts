/**
 * Theme Zone System — Shared type definitions for POS and KDS layout zones
 * 
 * Each layout is decomposed into configurable ZONES.
 * The builder lets users drag zones onto a canvas and configure properties.
 * Same zone system works for both POS and KDS.
 * 
 * Phase 4: Full component catalogue with variants, categories, and validation metadata.
 */

// ─── Layout types ────────────────────────────────────────────────

export type LayoutType = 'pos' | 'kds';

// ─── Zone positions ──────────────────────────────────────────────

export type ZonePosition = 'top' | 'left' | 'right' | 'center' | 'bottom';

// ─── Zone categories ─────────────────────────────────────────────

export type ZoneCategory = 'layout' | 'action' | 'display' | 'dialog';

// ─── Zone variant ────────────────────────────────────────────────

export interface ZoneVariant {
    id: string;
    label: string;
    icon: string;         // lucide icon name
    color: string;        // tailwind color name (e.g. 'emerald', 'blue', 'amber')
    description: string;
}

// ─── Zone definition ─────────────────────────────────────────────

export interface ZoneConfig {
    id: string;
    component: string;
    position: ZonePosition;
    variant?: string;       // active variant ID (for components with variants)
    width?: string;         // e.g. '320px', '25%', 'w-80'
    height?: string;
    order: number;
    visible: boolean;
    config: Record<string, unknown>;
}

// ─── Component Registry ──────────────────────────────────────────

export interface ZoneComponentDef {
    id: string;
    name: string;
    description: string;
    icon: string;           // lucide icon name
    layoutType: LayoutType;
    category: ZoneCategory;
    defaultPosition: ZonePosition;
    defaultWidth?: string;
    defaultConfig: Record<string, unknown>;
    maxInstances: number;   // how many of this component can exist (1 = singleton)
    required: boolean;      // triggers "missing" warning if not included
    variants?: ZoneVariant[];
    conflicts?: string[];   // component IDs that conflict with this one
    configSchema: ZoneConfigField[];
}

export interface ZoneConfigField {
    key: string;
    label: string;
    type: 'text' | 'number' | 'boolean' | 'select' | 'color';
    defaultValue: unknown;
    options?: { label: string; value: string }[];
}

// ─── POS Components ──────────────────────────────────────────────

export const POS_ZONE_COMPONENTS: ZoneComponentDef[] = [
    // ── Layout Components ─────────────────────
    {
        id: 'TopBar',
        name: 'Top Bar',
        description: 'Header with branding, table info, search, user menu',
        icon: 'PanelTop',
        layoutType: 'pos',
        category: 'layout',
        defaultPosition: 'top',
        maxInstances: 1,
        required: true,
        defaultConfig: { showSearch: true, showUser: true, showOrderNumber: true },
        configSchema: [
            { key: 'showSearch', label: 'Show Search', type: 'boolean', defaultValue: true },
            { key: 'showUser', label: 'Show User Menu', type: 'boolean', defaultValue: true },
            { key: 'showOrderNumber', label: 'Show Order Number', type: 'boolean', defaultValue: true },
        ],
    },
    {
        id: 'CategoryBar',
        name: 'Category Bar',
        description: 'Menu categories — can be sidebar, tabs, or strip',
        icon: 'LayoutList',
        layoutType: 'pos',
        category: 'layout',
        defaultPosition: 'left',
        defaultWidth: '192px',
        maxInstances: 1,
        required: true,
        defaultConfig: { style: 'sidebar' },
        configSchema: [
            {
                key: 'style', label: 'Display Style', type: 'select', defaultValue: 'sidebar',
                options: [
                    { label: 'Sidebar (vertical)', value: 'sidebar' },
                    { label: 'Tabs (horizontal)', value: 'tabs' },
                    { label: 'Strip (compact)', value: 'strip' },
                ],
            },
        ],
    },
    {
        id: 'ItemGrid',
        name: 'Item Grid',
        description: 'Menu item tiles — the main product selection area',
        icon: 'LayoutGrid',
        layoutType: 'pos',
        category: 'layout',
        defaultPosition: 'center',
        maxInstances: 1,
        required: true,
        defaultConfig: { columns: 3, size: 'medium', showPrices: true, showImages: true },
        variants: [
            { id: 'grid', label: 'Grid View', icon: 'LayoutGrid', color: 'zinc', description: 'Classic tile grid' },
            { id: 'list', label: 'List View', icon: 'List', color: 'zinc', description: 'Compact list with prices' },
        ],
        configSchema: [
            {
                key: 'columns', label: 'Grid Columns', type: 'select', defaultValue: '3',
                options: [
                    { label: '2 Columns', value: '2' },
                    { label: '3 Columns', value: '3' },
                    { label: '4 Columns', value: '4' },
                    { label: '5 Columns', value: '5' },
                    { label: '6 Columns', value: '6' },
                ],
            },
            {
                key: 'size', label: 'Tile Size', type: 'select', defaultValue: 'medium',
                options: [
                    { label: 'Small', value: 'small' },
                    { label: 'Medium', value: 'medium' },
                    { label: 'Large', value: 'large' },
                ],
            },
            { key: 'showPrices', label: 'Show Prices', type: 'boolean', defaultValue: true },
            { key: 'showImages', label: 'Show Images', type: 'boolean', defaultValue: true },
        ],
    },
    {
        id: 'OrderPanel',
        name: 'Order Panel',
        description: 'Current order items, quantities, and totals',
        icon: 'Receipt',
        layoutType: 'pos',
        category: 'layout',
        defaultPosition: 'right',
        defaultWidth: '320px',
        maxInstances: 1,
        required: true,
        variants: [
            { id: 'full', label: 'Full Panel', icon: 'Receipt', color: 'zinc', description: 'Full order details with modifiers' },
            { id: 'compact', label: 'Compact', icon: 'ListOrdered', color: 'zinc', description: 'Minimal, speed-optimized list' },
        ],
        defaultConfig: { courses: false, seats: false, compact: false },
        configSchema: [
            { key: 'courses', label: 'Course Management', type: 'boolean', defaultValue: false },
            { key: 'seats', label: 'Seat Assignment', type: 'boolean', defaultValue: false },
            { key: 'compact', label: 'Compact Mode', type: 'boolean', defaultValue: false },
        ],
    },
    {
        id: 'SideTools',
        name: 'Side Tools',
        description: 'Vertical toolbar with quick actions (hold, void, discount)',
        icon: 'SidebarOpen',
        layoutType: 'pos',
        category: 'layout',
        defaultPosition: 'left',
        defaultWidth: '56px',
        maxInstances: 1,
        required: false,
        defaultConfig: {},
        configSchema: [],
    },
    {
        id: 'Footer',
        name: 'Status Footer',
        description: 'Sync status, clock, and connection indicator',
        icon: 'PanelBottom',
        layoutType: 'pos',
        category: 'layout',
        defaultPosition: 'bottom',
        maxInstances: 1,
        required: false,
        defaultConfig: { showClock: true, showSync: true },
        configSchema: [
            { key: 'showClock', label: 'Show Clock', type: 'boolean', defaultValue: true },
            { key: 'showSync', label: 'Show Sync Status', type: 'boolean', defaultValue: true },
        ],
    },

    // ── Action Buttons ─────────────────────────
    {
        id: 'SendButton',
        name: 'Send / Fire',
        description: 'Send order to kitchen, bar, or fire a course',
        icon: 'Send',
        layoutType: 'pos',
        category: 'action',
        defaultPosition: 'right',
        maxInstances: 3,  // Can have Kitchen + Bar + Punch
        required: true,
        variants: [
            { id: 'kitchen', label: 'Send to Kitchen', icon: 'ChefHat', color: 'teal', description: 'Send items to kitchen display' },
            { id: 'bar', label: 'Send to Bar', icon: 'Wine', color: 'purple', description: 'Send drinks to bar station' },
            { id: 'fire', label: 'Fire Course', icon: 'Flame', color: 'orange', description: 'Fire a held course immediately' },
            { id: 'punch', label: 'Punch / Quick Send', icon: 'Zap', color: 'amber', description: 'Instant send without confirmation' },
        ],
        defaultConfig: { variant: 'kitchen' },
        configSchema: [
            {
                key: 'destination', label: 'Send Destination', type: 'select', defaultValue: 'all',
                options: [
                    { label: 'All Stations', value: 'all' },
                    { label: 'Kitchen Only', value: 'kitchen' },
                    { label: 'Bar Only', value: 'bar' },
                ],
            },
            { key: 'autoClose', label: 'Auto-Close After Send', type: 'boolean', defaultValue: false },
        ],
    },
    {
        id: 'PayCash',
        name: 'Pay — Cash',
        description: 'Process cash payment with smart amount suggestions',
        icon: 'Banknote',
        layoutType: 'pos',
        category: 'action',
        defaultPosition: 'bottom',
        maxInstances: 1,
        required: false,
        defaultConfig: { showSmartAmounts: true, buttonColor: 'emerald' },
        configSchema: [
            { key: 'showSmartAmounts', label: 'Show Quick Amounts (€5, €10…)', type: 'boolean', defaultValue: true },
            { key: 'buttonColor', label: 'Button Color', type: 'color', defaultValue: '#10b981' },
        ],
    },
    {
        id: 'PayCard',
        name: 'Pay — Card',
        description: 'Process card/contactless payment',
        icon: 'CreditCard',
        layoutType: 'pos',
        category: 'action',
        defaultPosition: 'bottom',
        maxInstances: 1,
        required: false,
        defaultConfig: { buttonColor: 'blue' },
        configSchema: [
            { key: 'buttonColor', label: 'Button Color', type: 'color', defaultValue: '#3b82f6' },
        ],
    },
    {
        id: 'PaySplit',
        name: 'Pay — Split Bill',
        description: 'Split payment between multiple guests',
        icon: 'Split',
        layoutType: 'pos',
        category: 'action',
        defaultPosition: 'bottom',
        maxInstances: 1,
        required: false,
        defaultConfig: { buttonColor: 'purple' },
        configSchema: [
            { key: 'buttonColor', label: 'Button Color', type: 'color', defaultValue: '#9333ea' },
        ],
    },
    {
        id: 'QuickPay',
        name: 'Quick Pay Panel',
        description: 'Combined Cash + Card in one always-visible panel (Express mode)',
        icon: 'Wallet',
        layoutType: 'pos',
        category: 'action',
        defaultPosition: 'bottom',
        maxInstances: 1,
        required: false,
        conflicts: ['PayCash', 'PayCard'],  // QuickPay replaces individual pay buttons
        defaultConfig: {},
        configSchema: [],
    },
    {
        id: 'TableSelect',
        name: 'Table Selector',
        description: 'Select or switch table / counter',
        icon: 'Grid3x3',
        layoutType: 'pos',
        category: 'action',
        defaultPosition: 'left',
        maxInstances: 1,
        required: false,
        variants: [
            { id: 'grid', label: 'Grid View', icon: 'Grid3x3', color: 'zinc', description: 'Simple table grid' },
            { id: 'floorplan', label: 'Floor Plan', icon: 'Map', color: 'blue', description: 'Visual floor plan layout' },
        ],
        defaultConfig: { variant: 'grid' },
        configSchema: [],
    },
    {
        id: 'ClearOrder',
        name: 'Clear Order',
        description: 'Clear all items from current order',
        icon: 'Trash2',
        layoutType: 'pos',
        category: 'action',
        defaultPosition: 'right',
        maxInstances: 1,
        required: false,
        defaultConfig: { requireConfirm: true, buttonColor: 'red' },
        configSchema: [
            { key: 'requireConfirm', label: 'Require Confirmation', type: 'boolean', defaultValue: true },
            { key: 'buttonColor', label: 'Button Color', type: 'color', defaultValue: '#ef4444' },
        ],
    },
    {
        id: 'ExitButton',
        name: 'Exit POS',
        description: 'Return to manager dashboard',
        icon: 'LogOut',
        layoutType: 'pos',
        category: 'action',
        defaultPosition: 'left',
        maxInstances: 1,
        required: false,
        defaultConfig: {},
        configSchema: [],
    },

    // ── Display Components ──────────────────────
    {
        id: 'SendOptions',
        name: 'Send Options',
        description: 'Print / KDS / Stock checkboxes before sending',
        icon: 'Settings2',
        layoutType: 'pos',
        category: 'display',
        defaultPosition: 'right',
        maxInstances: 1,
        required: false,
        defaultConfig: { showPrint: true, showKDS: true, showStock: false },
        configSchema: [
            { key: 'showPrint', label: 'Show Print Checkbox', type: 'boolean', defaultValue: true },
            { key: 'showKDS', label: 'Show KDS Checkbox', type: 'boolean', defaultValue: true },
            { key: 'showStock', label: 'Show Stock Deduct', type: 'boolean', defaultValue: false },
        ],
    },
    {
        id: 'TotalsDisplay',
        name: 'Totals',
        description: 'Subtotal, tax, and grand total display',
        icon: 'Calculator',
        layoutType: 'pos',
        category: 'display',
        defaultPosition: 'right',
        maxInstances: 1,
        required: true,
        variants: [
            { id: 'detailed', label: 'Detailed', icon: 'Calculator', color: 'zinc', description: 'Subtotal + Tax + Total' },
            { id: 'compact', label: 'Compact', icon: 'Hash', color: 'zinc', description: 'Total only (large)' },
        ],
        defaultConfig: { showTax: true },
        configSchema: [
            { key: 'showTax', label: 'Show Tax Breakdown', type: 'boolean', defaultValue: true },
        ],
    },
    {
        id: 'CounterDisplay',
        name: 'Counter / Order #',
        description: 'Running counter number display (Express mode)',
        icon: 'Hash',
        layoutType: 'pos',
        category: 'display',
        defaultPosition: 'top',
        maxInstances: 1,
        required: false,
        defaultConfig: {},
        configSchema: [],
    },
    {
        id: 'ThemeSwitcher',
        name: 'Theme Switcher',
        description: 'In-POS dropdown to switch between layout themes',
        icon: 'Palette',
        layoutType: 'pos',
        category: 'display',
        defaultPosition: 'left',
        maxInstances: 1,
        required: false,
        defaultConfig: {},
        configSchema: [],
    },
];

// ─── KDS Components ──────────────────────────────────────────────

export const KDS_ZONE_COMPONENTS: ZoneComponentDef[] = [
    {
        id: 'KDSHeader',
        name: 'KDS Header',
        description: 'Station name, filter controls, and timer',
        icon: 'PanelTop',
        layoutType: 'kds',
        category: 'layout',
        defaultPosition: 'top',
        maxInstances: 1,
        required: true,
        defaultConfig: { showTimer: true, showFilters: true },
        configSchema: [
            { key: 'showTimer', label: 'Show Timer', type: 'boolean', defaultValue: true },
            { key: 'showFilters', label: 'Show Filters', type: 'boolean', defaultValue: true },
        ],
    },
    {
        id: 'KDSOrderColumns',
        name: 'Order Columns',
        description: 'Order cards displayed in columns (classic KDS view)',
        icon: 'Columns',
        layoutType: 'kds',
        category: 'layout',
        defaultPosition: 'center',
        maxInstances: 1,
        required: true,
        defaultConfig: { columns: 4, cardStyle: 'standard' },
        configSchema: [
            {
                key: 'columns', label: 'Columns', type: 'select', defaultValue: '4',
                options: [
                    { label: '3 Columns', value: '3' },
                    { label: '4 Columns', value: '4' },
                    { label: '5 Columns', value: '5' },
                    { label: '6 Columns', value: '6' },
                ],
            },
            {
                key: 'cardStyle', label: 'Card Style', type: 'select', defaultValue: 'standard',
                options: [
                    { label: 'Standard', value: 'standard' },
                    { label: 'Compact', value: 'compact' },
                    { label: 'Detailed', value: 'detailed' },
                ],
            },
        ],
    },
    {
        id: 'KDSTimeline',
        name: 'Timeline View',
        description: 'Time-coded horizontal order progression',
        icon: 'Clock',
        layoutType: 'kds',
        category: 'layout',
        defaultPosition: 'center',
        maxInstances: 1,
        required: false,
        defaultConfig: {},
        configSchema: [],
    },
    {
        id: 'KDSStatusBar',
        name: 'Status Bar',
        description: 'Order counts, average prep time, and alerts',
        icon: 'PanelBottom',
        layoutType: 'kds',
        category: 'layout',
        defaultPosition: 'bottom',
        maxInstances: 1,
        required: false,
        defaultConfig: { showAlerts: true },
        configSchema: [
            { key: 'showAlerts', label: 'Show Alerts', type: 'boolean', defaultValue: true },
        ],
    },
    {
        id: 'KDSSummary',
        name: 'Summary Panel',
        description: 'Item aggregation view — how many of each item to prepare',
        icon: 'BarChart3',
        layoutType: 'kds',
        category: 'layout',
        defaultPosition: 'right',
        defaultWidth: '280px',
        maxInstances: 1,
        required: false,
        defaultConfig: {},
        configSchema: [],
    },
];

// ─── All Components ──────────────────────────────────────────────

export const ALL_ZONE_COMPONENTS = [...POS_ZONE_COMPONENTS, ...KDS_ZONE_COMPONENTS];

export function getComponentsForLayout(layoutType: LayoutType): ZoneComponentDef[] {
    return ALL_ZONE_COMPONENTS.filter(c => c.layoutType === layoutType);
}

export function getComponentDef(componentId: string): ZoneComponentDef | undefined {
    return ALL_ZONE_COMPONENTS.find(c => c.id === componentId);
}

/**
 * Get components grouped by category for a given layout type.
 * Returns an ordered map: layout → action → display → dialog
 */
export function getComponentsByCategory(layoutType: LayoutType): Record<ZoneCategory, ZoneComponentDef[]> {
    const components = getComponentsForLayout(layoutType);
    return {
        layout: components.filter(c => c.category === 'layout'),
        action: components.filter(c => c.category === 'action'),
        display: components.filter(c => c.category === 'display'),
        dialog: components.filter(c => c.category === 'dialog'),
    };
}
