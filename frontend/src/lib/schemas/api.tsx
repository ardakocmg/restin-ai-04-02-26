/**
 * Zod Validation Schemas for API Responses
 * @module lib/schemas/api
 * 
 * Rule #7: Use zod schemas for ALL inputs and API responses.
 */
import { z } from 'zod';

// ============================================================
// Common / Base Schemas
// ============================================================

export const MongoIdSchema = z.string().min(1, 'ID is required');
export const TimestampSchema = z.string().datetime().or(z.date());
export const EmailSchema = z.string().email('Invalid email format');
export const PhoneSchema = z.string().optional();
export const MoneySchema = z.number().int('Amount must be in cents');

// ============================================================
// User / Auth Schemas
// ============================================================

export const UserRoleSchema = z.enum([
    'admin',
    'manager',
    'staff',
    'kitchen',
    'bartender',
    'server',
    'cashier'
]);

export const UserSchema = z.object({
    id: MongoIdSchema,
    email: EmailSchema.optional(),
    name: z.string().min(1, 'Name is required'),
    pin: z.string().length(4, 'PIN must be 4 digits').optional(),
    role: UserRoleSchema,
    venue_ids: z.array(MongoIdSchema),
    created_at: TimestampSchema.optional(),
    updated_at: TimestampSchema.optional(),
    is_active: z.boolean().default(true)
});

export const LoginResponseSchema = z.object({
    token: z.string(),
    user: UserSchema,
    mfa_required: z.boolean().optional(),
    venues: z.array(z.any()).optional()
});

// ============================================================
// Venue Schemas
// ============================================================

export const VenueSchema = z.object({
    id: MongoIdSchema,
    name: z.string().min(1, 'Venue name is required'),
    address: z.string().optional(),
    phone: PhoneSchema,
    email: EmailSchema.optional(),
    timezone: z.string().default('Europe/Malta'),
    currency: z.string().default('EUR'),
    settings: z.record(z.any()).optional(),
    created_at: TimestampSchema.optional()
});

export const ZoneSchema = z.object({
    id: MongoIdSchema,
    name: z.string().min(1),
    type: z.enum(['kitchen', 'bar', 'prep', 'pass', 'service']),
    venue_id: MongoIdSchema,
    display_order: z.number().int().optional()
});

// ============================================================
// Menu Schemas
// ============================================================

export const MenuCategorySchema = z.object({
    id: MongoIdSchema,
    name: z.string().min(1),
    venue_id: MongoIdSchema,
    display_order: z.number().int().optional(),
    icon: z.string().optional(),
    color: z.string().optional(),
    is_active: z.boolean().default(true)
});

export const MenuItemSchema = z.object({
    id: MongoIdSchema,
    name: z.string().min(1),
    category_id: MongoIdSchema,
    venue_id: MongoIdSchema,
    price: MoneySchema, // Price in cents
    description: z.string().optional(),
    image_url: z.string().url().optional(),
    allergens: z.array(z.string()).optional(),
    is_active: z.boolean().default(true),
    station: z.string().optional(),
    prep_time_minutes: z.number().int().optional()
});

// ============================================================
// Order Schemas
// ============================================================

export const OrderStatusSchema = z.enum([
    'PENDING',
    'CONFIRMED',
    'PREPARING',
    'READY',
    'DELIVERED',
    'COMPLETED',
    'CANCELLED'
]);

export const OrderItemSchema = z.object({
    id: MongoIdSchema.optional(),
    menu_item_id: MongoIdSchema,
    name: z.string(),
    quantity: z.number().int().positive(),
    unit_price: MoneySchema,
    modifiers: z.array(z.any()).optional(),
    notes: z.string().optional(),
    status: z.string().optional()
});

export const OrderSchema = z.object({
    id: MongoIdSchema,
    display_id: z.string().optional(),
    venue_id: MongoIdSchema,
    table_id: MongoIdSchema.optional(),
    table_name: z.string().optional(),
    order_type: z.enum(['dine_in', 'takeaway', 'delivery']).default('dine_in'),
    status: OrderStatusSchema,
    items: z.array(OrderItemSchema),
    subtotal: MoneySchema,
    tax: MoneySchema.optional(),
    discount: MoneySchema.optional(),
    total: MoneySchema,
    created_at: TimestampSchema,
    created_by: MongoIdSchema.optional(),
    notes: z.string().optional()
});

// ============================================================
// KDS / Ticket Schemas
// ============================================================

export const TicketStatusSchema = z.enum([
    'NEW',
    'IN_PROGRESS',
    'READY',
    'PASS_PENDING',
    'DONE'
]);

export const TicketItemSchema = z.object({
    id: MongoIdSchema.optional(),
    name: z.string(),
    quantity: z.number().int(),
    modifiers: z.array(z.string()).optional(),
    notes: z.string().optional(),
    status: z.string().optional(),
    round_no: z.number().int().optional()
});

export const KDSTicketSchema = z.object({
    id: MongoIdSchema,
    display_id: z.string(),
    order_id: MongoIdSchema,
    venue_id: MongoIdSchema,
    station: z.string(),
    table_name: z.string().optional(),
    order_type: z.string().optional(),
    status: TicketStatusSchema,
    items: z.array(TicketItemSchema),
    created_at: TimestampSchema,
    pass_approved: z.boolean().optional(),
    pass_required: z.boolean().optional(),
    delivered: z.boolean().optional()
});

// ============================================================
// HR / Employee Schemas
// ============================================================

export const EmployeeSchema = z.object({
    id: MongoIdSchema,
    user_id: MongoIdSchema.optional(),
    name: z.string().min(1),
    email: EmailSchema.optional(),
    phone: PhoneSchema,
    role: z.string(),
    department: z.string().optional(),
    hourly_rate: MoneySchema.optional(),
    salary: MoneySchema.optional(),
    hire_date: TimestampSchema.optional(),
    is_active: z.boolean().default(true),
    venue_ids: z.array(MongoIdSchema).optional()
});

export const ClockingRecordSchema = z.object({
    id: MongoIdSchema,
    employee_id: MongoIdSchema,
    venue_id: MongoIdSchema,
    clock_in: TimestampSchema,
    clock_out: TimestampSchema.optional(),
    break_minutes: z.number().int().optional(),
    overtime_minutes: z.number().int().optional(),
    notes: z.string().optional()
});

// ============================================================
// Inventory Schemas
// ============================================================

export const InventoryItemSchema = z.object({
    id: MongoIdSchema,
    name: z.string().min(1),
    sku: z.string().optional(),
    category_id: MongoIdSchema.optional(),
    unit: z.string(),
    current_stock: z.number(),
    reorder_level: z.number().optional(),
    cost_per_unit: MoneySchema.optional(),
    venue_id: MongoIdSchema,
    supplier_id: MongoIdSchema.optional(),
    is_active: z.boolean().default(true)
});

export const SupplierSchema = z.object({
    id: MongoIdSchema,
    name: z.string().min(1),
    email: EmailSchema.optional(),
    phone: PhoneSchema,
    address: z.string().optional(),
    venue_id: MongoIdSchema,
    is_active: z.boolean().default(true)
});

// ============================================================
// API Response Wrappers
// ============================================================

export const ApiSuccessSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
    z.object({
        success: z.literal(true),
        data: dataSchema
    });

export const ApiErrorSchema = z.object({
    success: z.literal(false),
    error: z.string(),
    detail: z.any().optional(),
    code: z.string().optional()
});

export const PaginatedResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
    z.object({
        items: z.array(itemSchema),
        total: z.number().int(),
        page: z.number().int(),
        per_page: z.number().int(),
        total_pages: z.number().int()
    });

// ============================================================
// Type Exports
// ============================================================

export type User = z.infer<typeof UserSchema>;
export type LoginResponse = z.infer<typeof LoginResponseSchema>;
export type Venue = z.infer<typeof VenueSchema>;
export type Zone = z.infer<typeof ZoneSchema>;
export type MenuCategory = z.infer<typeof MenuCategorySchema>;
export type MenuItem = z.infer<typeof MenuItemSchema>;
export type Order = z.infer<typeof OrderSchema>;
export type OrderItem = z.infer<typeof OrderItemSchema>;
export type KDSTicket = z.infer<typeof KDSTicketSchema>;
export type Employee = z.infer<typeof EmployeeSchema>;
export type ClockingRecord = z.infer<typeof ClockingRecordSchema>;
export type InventoryItem = z.infer<typeof InventoryItemSchema>;
export type Supplier = z.infer<typeof SupplierSchema>;
