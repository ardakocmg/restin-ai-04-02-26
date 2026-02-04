import { AppConfigSchema, type AppConfig } from './types';

// Rule #60: Default Seed / Factory Reset state

export const defaultConfig: AppConfig = AppConfigSchema.parse({
    siteName: "Antigravity OS",
    locale: {
        currency: "EUR",
        timezone: "Europe/Malta",
        dateFormat: "dd/MM/yyyy",
    },
    features: {
        ai_copilot: false,
        kds_voice: false,
        inventory_complex: true,
        loyalty_program: false,
        table_ordering: false,
    },
    ui: {
        theme: 'dark',
        density: 'comfortable',
        primaryColor: '#18181b', // Zinc-950
        showImagesInGrid: true,
        animationsEnabled: true,
    },
    pos: {
        gridSize: 4,
        quickPaymentButtons: [500, 1000, 2000, 5000], // €5, €10, €20, €50
        requirePinAfterOrder: false,
        printReceiptAuto: true,
        allowOfflineMode: true,
        courseManagement: true,
    },
    inventory: {
        enforceStockCounts: false,
        defaultWastageReason: 'Expired',
        lowStockThreshold: 10,
        autoGeneratePOs: false,
    },
    hardware: {
        printers: [],
        kdsScreens: [],
    }
});
