export interface POSVenue {
    id: string;
    name: string;
    currency?: string;
    timezone?: string;
    pos?: {
        theme?: string;
        send_checkbox_print?: boolean;
        send_checkbox_kds?: boolean;
        send_checkbox_stock?: boolean;
        [key: string]: string | boolean | number | undefined;
    };
    [key: string]: string | boolean | number | Record<string, unknown> | undefined;
}

export interface POSCategory {
    id: string;
    name: string;
    sort_order?: number;
    image?: string;
    color?: string;
    [key: string]: string | number | undefined;
}

export interface POSModifier {
    id: string;
    name: string;
    price?: number;
    group_id?: string;
}

export interface POSMenuItem {
    id: string;
    name: string;
    short_name?: string;
    description?: string;
    price: number;
    priceCents?: number;
    vat_rate?: number;
    category_id?: string;
    image?: string;
    color?: string;
    modifiers?: POSModifier[];
    [key: string]: string | number | boolean | POSModifier[] | undefined;
}

export interface POSTable {
    id: string;
    name: string;
    status: string;
    current_order_id?: string;
    capacity?: number;
    seats: number;
    zone_id?: string;
    [key: string]: string | number | undefined;
}


export interface POSOrderItem {
    item_id?: string;
    menu_item_id?: string;
    menu_item_name?: string;
    name: string;
    price: number;
    quantity: number;
    total_price: number;
    seat?: number;
    course?: number;
    modifiers?: POSModifier[];
    notes?: string;
    [key: string]: string | number | boolean | POSModifier[] | undefined;
}

export interface POSSendOptions {
    do_print: boolean;
    do_kds: boolean;
    do_stock?: boolean;
}

export interface POSOrder {
    id: string;
    venue_id?: string;
    table_id?: string;
    server_id?: string;
    status?: string;
    items?: POSOrderItem[];
    total_price?: number;
    [key: string]: string | number | boolean | POSOrderItem[] | undefined;
}
