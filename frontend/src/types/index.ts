// ==========================================
// PROTOCOL v3.5: INTEGRATION-READY STANDARDS
// ==========================================

export type UserRole = 'OWNER' | 'MANAGER' | 'STAFF';

// 1. CORE & AUTH (Google Workspace)
export interface User {
    id: string;
    google_id?: string; // Google Workspace ID
    email: string;
    name: string;
    role: UserRole;
    pin: string; // Legacy PIN for quick POS access
    venueId: string;
    ou_path?: string; // e.g., "/Operations/Kitchen"
}

// 2. CRM & GUEST (SevenRooms)
export interface Guest {
    id: string;
    first_name: string;
    last_name: string;
    email?: string;
    phone?: string;
    tags: string[]; // e.g., ["VIP", "Nut Allergy", "Big Spender"]
    total_spend_cents: number;
    visit_notes: string;
    last_visit: string;
}

export interface Venue {
    id: string;
    name: string;
    currency: string;
    timezone: string;
}

// 3. INVENTORY & MENU (Apicbase & Xero)
export interface Ingredient { // Formerly InventoryItem
    id: string;
    name: string;
    category: string; // e.g., "Seafood", "Dairy"
    stock: number;
    unit: string; // e.g., "kg", "tin", "L"
    priceCents: number; // Cost price
    minStock: number;
    supplier_id?: string;
    par_level?: number;
    reorder_point?: number;
    last_restock_date?: string;
    gl_code_purchase: string; // Xero 5000 series
    allergens: string[]; // e.g., ["Fish", "Dairy"]
}

export interface MenuItem {
    id: string;
    name: string;
    description?: string;
    priceCents: number; // Selling price
    vat_rate: number; // e.g., 18.0
    gl_code_revenue: string; // Xero 4000 series
    recipe_id?: string;
}

// 4. POS & KDS (Lightspeed K-Series)
export type OrderStatus = 'PENDING' | 'PREPARING' | 'READY' | 'COMPLETED' | 'LATE';

export interface OrderItem {
    name: string;
    quantity: number;
    priceCents: number;
    course_id: number; // 1=Starters, 2=Mains, 3=Dessert
    seat_number?: number; // Seat 1, Seat 2
    modifiers: string[]; // ["No Onion", "Med-Rare"]
}

export interface Order {
    id: string;
    venueId: string;
    tableId: string;
    userId: string;
    status: OrderStatus;
    totalCents: number;
    items: OrderItem[];
    createdAt: string;
    revenue_center?: string; // "Main Dining", "Terrace"
}

// 5. SUPPLIERS
export interface Supplier {
    id: string;
    name: string;
    contact_email: string;
    contact_phone: string;
}

// 6. HR & PAYROLL (Shireburn Indigo - Malta)
export interface Employee {
    id: string;
    venueId: string;
    first_name: string;
    last_name: string;
    role: string;
    email?: string;

    // Financials
    gross_salary_cents: number;
    hourly_rate_cents?: number;

    // Malta Compliance
    id_card_number: string; // 123456M
    fss_tax_status: 'single' | 'married' | 'parent' | 'part_time' | 'non_resident';
    ss_number: string;
    cola_eligible: boolean;

    // Leave Management
    leave_balance_hours: number;

    start_date: string;
    status: 'active' | 'terminated';
}

export interface Payslip {
    id: string;
    employee_id: string;
    period_start: string;
    period_end: string;
    gross_pay_cents: number;
    tax_cents: number;
    ssc_cents: number;
    net_pay_cents: number;
    status: 'draft' | 'approved' | 'paid';
}

export interface StockAdjustment {
    item_id: string;
    quantity_change: number;
    reason: string;
    user_id: string;
}

// Aggregated Seed Data Type
export interface SeedData {
    venues: Venue[];
    users: User[];
    inventory: Ingredient[]; // Updated to Ingredient
    suppliers: Supplier[];
    orders: Order[];
    employees: Employee[];
    guests?: Guest[];
    menu_items?: MenuItem[];
}
