/**
 * Performance Optimizations - Code Splitting & Lazy Loading Configuration
 * This file documents the lazy loading strategy.
 * Actual implementation is in App.tsx using React.lazy()
 */

export const LAZY_LOAD_ROUTES = [
    // Admin Pages (loaded on demand)
    '/manager/analytics',
    '/manager/payroll-malta',
    '/manager/accounting-malta',
    '/manager/crm',
    '/manager/loyalty',

    // Reports (loaded on demand)
    '/manager/reports/*',

    // Inventory (loaded on demand)
    '/manager/inventory-detail',
    '/manager/inventory-recipes',
    '/manager/inventory-production',

    // HR Pages (loaded on demand)
    '/manager/hr/*',

    // Integrations (loaded on demand)
    '/manager/integrations',
    '/manager/delivery-aggregators',
];

// Critical pages loaded immediately
export const EAGER_LOAD_ROUTES = [
    '/login',
    '/manager/dashboard',
    '/pos/*',
    '/kds/*',
];

// Bundle splitting strategy
export const CHUNKS = {
    vendor: ['react', 'react-dom', 'react-router-dom'],
    charts: ['recharts'],
    ui: ['@radix-ui/*'],
    pos: ['pos/*'],
    kds: ['kds/*'],
    admin: ['admin/*'],
};
