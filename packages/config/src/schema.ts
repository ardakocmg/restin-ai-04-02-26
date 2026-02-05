import { z } from 'zod';

export const AppConfigSchema = z.object({
    siteName: z.string().min(1).default("Antigravity OS"),
    locale: z.object({
        currency: z.string().length(3).default("EUR"), // ISO 4217
        timezone: z.string().min(1).default("Europe/Malta"),
        dateFormat: z.string().default("dd/MM/yyyy"),
    }),
    features: z.object({
        inventory: z.boolean().default(true),
        pos: z.boolean().default(true),
        kds: z.boolean().default(false),
        hr: z.boolean().default(true),
        // Restin AI Pillars
        voice: z.boolean().default(false),
        radar: z.boolean().default(false),
        studio: z.boolean().default(false),
        web: z.boolean().default(false),
        crm: z.boolean().default(false),
    }),
    tax: z.object({
        defaultRate: z.number().min(0).max(100).default(18), // Malta Standard
        enabled: z.boolean().default(true),
    }),
});

export type AppConfig = z.infer<typeof AppConfigSchema>;

export const defaultConfig = AppConfigSchema.parse({});
