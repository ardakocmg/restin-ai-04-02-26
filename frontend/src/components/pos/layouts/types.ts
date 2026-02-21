/**
 * Shared types for all POS Layout components (Pro, Restin, Express)
 * 
 * All layouts receive the same set of props from POSMain.tsx
 */
import type { ReactNode, CSSProperties } from 'react';
import type { LucideIcon } from 'lucide-react';

export interface POSVenue {
    id: string;
    name: string;
    [key: string]: unknown;
}

export interface POSUser {
    id: string;
    name: string;
    role?: string;
    [key: string]: unknown;
}

export interface POSCategory {
    id: string;
    name: string;
    image?: string;
    color?: string;
    [key: string]: unknown;
}

export interface POSMenuItem {
    id: string;
    name: string;
    price: number;
    image?: string;
    color?: string;
    modifiers?: unknown[];
    [key: string]: unknown;
}

export interface POSTable {
    id: string;
    name: string;
    seats: number;
    status: string;
    [key: string]: unknown;
}

export interface POSModifier {
    name?: string;
    price_adjustment?: number;
    [key: string]: unknown;
}

export interface POSOrderItem {
    menu_item_name?: string;
    name?: string;
    quantity: number;
    price: number;
    total_price?: number;
    course?: number;
    seat?: number;
    modifiers?: Array<POSModifier | string>;
    _originalIndex?: number;
    _proCourse?: number;
    _proSeat?: number;
    [key: string]: unknown;
}

export interface POSSendRound {
    round_no: number;
    sent_at: string;
    do_print?: boolean;
    do_kds?: boolean;
    do_stock?: boolean;
    [key: string]: unknown;
}

export interface POSCurrentOrder {
    order_number?: string;
    send_rounds?: POSSendRound[];
    [key: string]: unknown;
}

export interface POSSendOptions {
    do_print: boolean;
    do_kds: boolean;
    do_stock?: boolean;
}

export interface POSSettings {
    pos?: {
        send_checkbox_print?: boolean;
        send_checkbox_kds?: boolean;
        send_checkbox_stock?: boolean;
        [key: string]: unknown;
    };
    [key: string]: unknown;
}

export interface POSFloorPlan {
    id: string;
    name?: string;
    [key: string]: unknown;
}

export interface POSLayoutProps {
    // Data
    venue: POSVenue | null;
    user: POSUser | null;
    categories: POSCategory[];
    menuItems: POSMenuItem[];
    tables: POSTable[];
    activeCategory: string | null;
    selectedTable: POSTable | null;
    currentOrder: POSCurrentOrder | null;
    orderItems: POSOrderItem[];
    settings: POSSettings | null;
    sendOptions: POSSendOptions;
    sendInProgress: boolean;
    floorPlan: POSFloorPlan | null;
    selectedItem: POSMenuItem | null;
    // Dialog states
    showTableDialog: boolean;
    showPaymentDialog: boolean;
    showFloorPlanDialog: boolean;
    showModifierDialog: boolean;
    // Calculated values
    subtotal: number;
    tax: number;
    total: number;
    searchQuery: string;
    onSearchChange?: (query: string) => void;
    isKeyboardOpen?: boolean;
    onSetKeyboardOpen?: (open: boolean) => void;
    // Actions
    onLoadCategoryItems: (categoryId: string) => void;
    onSelectTable: (table: POSTable) => void;
    onAddItemToOrder: (item: POSMenuItem) => void;
    onConfirmItemWithModifiers: (item: POSMenuItem & { modifiers: unknown[]; final_price: number }) => void;
    onUpdateItemQuantity: (index: number, delta: number) => void;
    onRemoveItem: (index: number) => void;
    onSendOrder: () => void;
    onHandlePayment: (method: string) => void;
    onClearOrder: () => void;
    onDeselectTable: () => void;
    onSetSendOptions: (updater: (prev: POSSendOptions) => POSSendOptions) => void;
    onSetShowTableDialog: (show: boolean) => void;
    onSetShowPaymentDialog: (show: boolean) => void;
    onSetShowFloorPlanDialog: (show: boolean) => void;
    onSetShowModifierDialog: (show: boolean) => void;
    onCloseModifierDialog: () => void;
    onNavigate: (path: string) => void;
    // Theme switcher slot
    themeSelector?: ReactNode;
}

export interface CategoryIconMap {
    [key: string]: LucideIcon;
}

export type ItemStyle = CSSProperties;
