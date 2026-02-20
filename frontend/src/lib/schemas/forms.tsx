/**
 * Zod Validation Schemas for Form Inputs
 * @module lib/schemas/forms
 * 
 * Rule #7: Use zod schemas for ALL inputs and API responses.
 */
import { z } from 'zod';

// ============================================================
// Auth Forms
// ============================================================

export const LoginFormSchema = z.object({
    pin: z.string()
        .length(4, 'PIN must be exactly 4 digits')
        .regex(/^\d{4}$/, 'PIN must contain only digits')
});

export const MFAFormSchema = z.object({
    code: z.string()
        .length(6, 'Code must be exactly 6 digits')
        .regex(/^\d{6}$/, 'Code must contain only digits')
});

export const PasswordChangeFormSchema = z.object({
    currentPassword: z.string().min(8, 'Password must be at least 8 characters'),
    newPassword: z.string()
        .min(8, 'Password must be at least 8 characters')
        .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
        .regex(/[a-z]/, 'Must contain at least one lowercase letter')
        .regex(/[0-9]/, 'Must contain at least one number'),
    confirmPassword: z.string()
}).refine(data => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword']
});

// ============================================================
// Order Forms
// ============================================================

export const OrderItemFormSchema = z.object({
    menu_item_id: z.string().min(1, 'Item is required'),
    quantity: z.number().int().min(1, 'Quantity must be at least 1'),
    notes: z.string().max(200, 'Notes too long').optional(),
    modifiers: z.array(z.string()).optional()
});

export const CreateOrderFormSchema = z.object({
    table_id: z.string().optional(),
    order_type: z.enum(['dine_in', 'takeaway', 'delivery']).default('dine_in'),
    guest_count: z.number().int().min(1).optional(),
    notes: z.string().max(500).optional(),
    items: z.array(OrderItemFormSchema).min(1, 'Order must have at least one item')
});

// ============================================================
// Menu Forms
// ============================================================

export const MenuCategoryFormSchema = z.object({
    name: z.string()
        .min(2, 'Name must be at least 2 characters')
        .max(50, 'Name too long'),
    icon: z.string().optional(),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format').optional(),
    display_order: z.number().int().min(0).optional(),
    is_active: z.boolean().default(true)
});

export const MenuItemFormSchema = z.object({
    name: z.string()
        .min(2, 'Name must be at least 2 characters')
        .max(100, 'Name too long'),
    category_id: z.string().min(1, 'Category is required'),
    price: z.number()
        .min(0, 'Price cannot be negative')
        .multipleOf(0.01, 'Price must have at most 2 decimal places'),
    description: z.string().max(500, 'Description too long').optional(),
    allergens: z.array(z.string()).optional(),
    station: z.string().optional(),
    prep_time_minutes: z.number().int().min(0).optional(),
    is_active: z.boolean().default(true)
});

// ============================================================
// Employee / HR Forms
// ============================================================

export const EmployeeFormSchema = z.object({
    name: z.string()
        .min(2, 'Name must be at least 2 characters')
        .max(100, 'Name too long'),
    email: z.string().email('Invalid email').optional().or(z.literal('')),
    phone: z.string().max(20).optional(),
    role: z.string().min(1, 'Role is required'),
    department: z.string().optional(),
    hourly_rate: z.number().min(0, 'Rate cannot be negative').optional(),
    salary: z.number().min(0, 'Salary cannot be negative').optional(),
    hire_date: z.string().optional(),
    venue_ids: z.array(z.string()).min(1, 'At least one venue required')
});

export const ClockingFormSchema = z.object({
    employee_id: z.string().min(1, 'Employee is required'),
    clock_in: z.string().datetime({ message: 'Invalid date format' }),
    clock_out: z.string().datetime().optional(),
    break_minutes: z.number().int().min(0).optional(),
    notes: z.string().max(500).optional()
});

// ============================================================
// Inventory Forms
// ============================================================

export const InventoryItemFormSchema = z.object({
    name: z.string()
        .min(2, 'Name must be at least 2 characters')
        .max(100, 'Name too long'),
    sku: z.string().max(50).optional(),
    category_id: z.string().optional(),
    unit: z.string().min(1, 'Unit is required'),
    current_stock: z.number().min(0, 'Stock cannot be negative'),
    reorder_level: z.number().min(0).optional(),
    cost_per_unit: z.number().min(0, 'Cost cannot be negative').optional(),
    supplier_id: z.string().optional()
});

export const SupplierFormSchema = z.object({
    name: z.string()
        .min(2, 'Name must be at least 2 characters')
        .max(100, 'Name too long'),
    email: z.string().email('Invalid email').optional().or(z.literal('')),
    phone: z.string().max(20).optional(),
    address: z.string().max(200).optional()
});

export const StockAdjustmentFormSchema = z.object({
    item_id: z.string().min(1, 'Item is required'),
    adjustment_type: z.enum(['add', 'remove', 'set']),
    quantity: z.number().min(0, 'Quantity must be positive'),
    reason: z.string().min(1, 'Reason is required').max(200)
});

// ============================================================
// Settings Forms
// ============================================================

export const VenueSettingsFormSchema = z.object({
    name: z.string().min(2, 'Name is required').max(100),
    address: z.string().max(200).optional(),
    phone: z.string().max(20).optional(),
    email: z.string().email().optional().or(z.literal('')),
    timezone: z.string().default('Europe/Malta'),
    currency: z.string().length(3, 'Currency must be 3 characters').default('EUR'),
    tax_rate: z.number().min(0).max(100).optional()
});

export const DeviceBindFormSchema = z.object({
    device_id: z.string().min(1, 'Device ID is required'),
    venue_id: z.string().min(1, 'Venue is required'),
    station: z.string().min(1, 'Station is required'),
    station_name: z.string().optional()
});

// ============================================================
// Type Exports
// ============================================================

export type LoginForm = z.infer<typeof LoginFormSchema>;
export type MFAForm = z.infer<typeof MFAFormSchema>;
export type PasswordChangeForm = z.infer<typeof PasswordChangeFormSchema>;
export type OrderItemForm = z.infer<typeof OrderItemFormSchema>;
export type CreateOrderForm = z.infer<typeof CreateOrderFormSchema>;
export type MenuCategoryForm = z.infer<typeof MenuCategoryFormSchema>;
export type MenuItemForm = z.infer<typeof MenuItemFormSchema>;
export type EmployeeForm = z.infer<typeof EmployeeFormSchema>;
export type ClockingForm = z.infer<typeof ClockingFormSchema>;
export type InventoryItemForm = z.infer<typeof InventoryItemFormSchema>;
export type SupplierForm = z.infer<typeof SupplierFormSchema>;
export type StockAdjustmentForm = z.infer<typeof StockAdjustmentFormSchema>;
export type VenueSettingsForm = z.infer<typeof VenueSettingsFormSchema>;
export type DeviceBindForm = z.infer<typeof DeviceBindFormSchema>;
