"""
Performance Optimizations - Code Splitting & Lazy Loading Configuration
"""

# This file documents the lazy loading strategy
# Actual implementation is in App.js using React.lazy()

LAZY_LOAD_ROUTES = [
    # Admin Pages (loaded on demand)
    '/admin/analytics',
    '/admin/payroll-malta',
    '/admin/accounting-malta',
    '/admin/crm',
    '/admin/loyalty',
    
    # Reports (loaded on demand)
    '/admin/reports/*',
    
    # Inventory (loaded on demand)
    '/admin/inventory-detail',
    '/admin/inventory-recipes',
    '/admin/inventory-production',
    
    # HR Pages (loaded on demand)
    '/admin/hr/*',
    
    # Integrations (loaded on demand)
    '/admin/integrations',
    '/admin/delivery-aggregators',
]

# Critical pages loaded immediately
EAGER_LOAD_ROUTES = [
    '/login',
    '/admin/dashboard',
    '/pos/*',
    '/kds/*',
]

# Bundle splitting strategy
CHUNKS = {
    'vendor': ['react', 'react-dom', 'react-router-dom'],
    'charts': ['recharts'],
    'ui': ['@radix-ui/*'],
    'pos': ['pos/*'],
    'kds': ['kds/*'],
    'admin': ['admin/*'],
}
