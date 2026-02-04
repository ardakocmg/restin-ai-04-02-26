import { z } from 'zod';

// Rule #1: Strict Typing with Zod
// Rule #60: Universal Config

export const FeaturesSchema = z.object({
    ai_copilot: z.boolean().default(false), // SaaS Locked
    kds_voice: z.boolean().default(false),  // Beta
    inventory_complex: z.boolean().default(true), // Plan Limit
    loyalty_program: z.boolean().default(false),
    table_ordering: z.boolean().default(false),
});

export const UIOptionsSchema = z.object({
    theme: z.enum(['light', 'dark', 'system']).default('dark'),
    density: z.enum(['compact', 'comfortable']).default('comfortable'),
    primaryColor: z.string().default('#000000'), // Hex
    showImagesInGrid: z.boolean().default(true),
    animationsEnabled: z.boolean().default(true), // Rule #69
});

export const POSConfigSchema = z.object({
    gridSize: z.number().min(2).max(6).default(4),
    quickPaymentButtons: z.array(z.number()).default([500, 1000, 2000, 5000]), // Cents
    requirePinAfterOrder: z.boolean().default(false),
    printReceiptAuto: z.boolean().default(true),
    allowOfflineMode: z.boolean().default(true),
    courseManagement: z.boolean().default(true), // Rule #15
});

export const InventoryConfigSchema = z.object({
    enforceStockCounts: z.boolean().default(false), // Prevent negative stock
    defaultWastageReason: z.string().default('Expired'),
    lowStockThreshold: z.number().default(10),
    autoGeneratePOs: z.boolean().default(false), // Rule #52
});

export const HardwareConfigSchema = z.object({
    printers: z.array(z.object({
        id: z.string(),
        name: z.string(),
        ip: z.string(),
        type: z.enum(['thermal', 'kitchen', 'label']),
        categories: z.array(z.string()).optional(), // specific categories to print
    })).default([]),
    kdsScreens: z.array(z.object({
        id: z.string(),
        name: z.string(),
        ip: z.string().optional(),
    })).default([]),
});

export const AppConfigSchema = z.object({
    siteName: z.string().min(1).default("Antigravity OS"),
    locale: z.object({
        currency: z.string().length(3).default("EUR"), // ISO 4217
        timezone: z.string().min(1).default("Europe/Malta"), // Rule #18
        dateFormat: z.string().default("dd/MM/yyyy"),
    }),
    features: FeaturesSchema,
    ui: UIOptionsSchema,
    pos: POSConfigSchema,
    inventory: InventoryConfigSchema,
    hardware: HardwareConfigSchema,
});

export type AppConfig = z.infer<typeof AppConfigSchema>;
export type FeatureFlags = z.infer<typeof FeaturesSchema>;
