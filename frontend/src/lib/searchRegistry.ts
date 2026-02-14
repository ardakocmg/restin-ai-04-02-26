/**
 * Shared Search Registry — Single source of truth for navigation items.
 *
 * Used by:
 *   - NewSidebar (navigation menu rendering)
 *   - NewTopBar (inline search suggestions)
 *   - GlobalSearch (Cmd+K command palette)
 *
 * All pages, groups, domains, and role requirements are defined here.
 *
 * SETTINGS ARCHITECTURE (3-Tier):
 *   🏪 Venue Settings  — Branch-specific (devices, tables, IoT, door access)
 *   🏢 Org Settings    — Company-wide (users, roles, branding, integrations)
 *   ⚙️ System Admin    — Platform infra (monitoring, logs, microservices) — product_owner only
 */

import {
    LayoutDashboard, ShoppingCart, Users, FileText,
    DollarSign, BarChart3, Settings, Activity, TrendingUp, Factory, Award,
    Table as TableIcon, Calendar, Truck, PieChart as PieChartIcon,
    UserCheck, Receipt, Clock, Package, Upload, Monitor,
    Building2, LayoutGrid, ShieldAlert, Shield, Layers,
    RefreshCw, Home, Timer, Type, Palette, Server, Globe, Mic, Wand2, Radar, MessageSquare,
    Wrench, Cog, Database,
    type LucideIcon
} from 'lucide-react';

import { ROLE_HIERARCHY } from './roles';

// ─── Types ──────────────────────────────────────────────────────────────

export interface SubItem {
    title: string;
    id: string;
    href?: string;
}

export interface MenuItem {
    title: string;
    icon: LucideIcon;
    href: string;
    group: string;
    requiredRole: string;
    subs?: SubItem[];
    children?: MenuItem[];
}

export interface Domain {
    id: string;
    title: string;
    icon: LucideIcon;
}

export interface SearchableItem {
    title: string;
    path: string;
    group: string;
    domain: string;
    domainTitle: string;
    breadcrumb: string;
    parentTitle?: string;
    icon: LucideIcon;
    requiredRole: string;
    keywords: string[];
}

// ─── Domain Groups ──────────────────────────────────────────────────────
//
// 3-tier settings: venue → org → system (nested hierarchy in sidebar)

export const DOMAINS: Domain[] = [
    { id: 'home', title: 'Home', icon: LayoutDashboard },
    { id: 'pos', title: 'POS & Ops', icon: ShoppingCart },
    { id: 'hr', title: 'HR & People', icon: Users },
    { id: 'inventory', title: 'Inventory', icon: Package },
    { id: 'finance', title: 'Finance', icon: DollarSign },
    { id: 'analytics', title: 'Reporting', icon: BarChart3 },
    { id: 'restin', title: 'Restin OS', icon: Globe },
    { id: 'collab', title: 'Collaborate', icon: MessageSquare },
    { id: 'venue-settings', title: 'Venue', icon: Wrench },
    { id: 'org-settings', title: 'Organization', icon: Building2 },
    { id: 'system-admin', title: 'System', icon: Cog },
];

// ─── Group → Domain Mapping ─────────────────────────────────────────────

export function getDomainForGroup(group: string): string {
    if (group === 'main') return 'home';
    if (['pos', 'operations'].includes(group)) return 'pos';
    if (['hr', 'staff'].includes(group)) return 'hr';
    if (['menu', 'procurement', 'production'].includes(group)) return 'inventory';
    if (['finance'].includes(group)) return 'finance';
    if (['reports'].includes(group)) return 'analytics';
    if (['restin'].includes(group)) return 'restin';
    if (['collab'].includes(group)) return 'collab';
    // 3-tier settings
    if (['venue-settings'].includes(group)) return 'venue-settings';
    if (['org-settings'].includes(group)) return 'org-settings';
    if (['system-admin'].includes(group)) return 'system-admin';
    return 'home';
}

// ─── Full Menu Items Registry ───────────────────────────────────────────

export const MENU_ITEMS: MenuItem[] = [
    // ═══════════════════════════════════════════════════════════════════
    // HOME / MAIN
    // ═══════════════════════════════════════════════════════════════════
    { title: 'Dashboard', icon: LayoutDashboard, href: '/admin/dashboard', group: 'main', requiredRole: 'MANAGER' },

    // ═══════════════════════════════════════════════════════════════════
    // POS & OPERATIONS
    // ═══════════════════════════════════════════════════════════════════
    { title: 'POS Dashboard', icon: LayoutDashboard, href: '/admin/posdashboard', group: 'pos', requiredRole: 'MANAGER' },
    {
        title: 'Sales Analytics', icon: BarChart3, href: '/admin/reports/sales', group: 'pos', requiredRole: 'MANAGER',
        subs: [
            { title: 'Summary Reports', id: 'summary' },
            { title: 'Revenue Reports', id: 'revenue' },
            { title: 'Shift Reports', id: 'shift' },
            { title: 'Hour Reports', id: 'hour' },
            { title: 'Day Reports', id: 'day' },
            { title: 'Week Reports', id: 'week' },
            { title: 'Month Reports', id: 'month' },
            { title: 'Product Reports', id: 'product' },
            { title: 'Category Reports', id: 'category' },
            { title: 'User Reports', id: 'user' },
            { title: 'Labour Reports', id: 'labour' },
            { title: 'Advanced Reports', id: 'advanced' },
            { title: 'Export Data', id: 'export' },
        ],
    },
    { title: 'Products', icon: ShoppingCart, href: '/admin/products', group: 'pos', requiredRole: 'MANAGER' },
    { title: 'Physical Tables', icon: TableIcon, href: '/admin/physical-tables', group: 'pos', requiredRole: 'MANAGER' },
    { title: 'Floor Plans', icon: LayoutGrid, href: '/admin/floor-plans', group: 'pos', requiredRole: 'MANAGER' },
    { title: 'Review Risk', icon: ShieldAlert, href: '/admin/review-risk', group: 'pos', requiredRole: 'MANAGER' },
    { title: 'Reservations', icon: Calendar, href: '/admin/reservations', group: 'pos', requiredRole: 'MANAGER' },
    { title: 'CRM & Guests', icon: Users, href: '/admin/crm', group: 'pos', requiredRole: 'MANAGER' },
    { title: 'Loyalty Program', icon: Award, href: '/admin/loyalty', group: 'pos', requiredRole: 'MANAGER' },
    { title: 'Operational Timeline', icon: Clock, href: '/admin/reservations/timeline', group: 'pos', requiredRole: 'MANAGER' },
    {
        title: 'Printer Management', icon: Receipt, group: 'pos', href: '/admin/printers', requiredRole: 'MANAGER',
        subs: [
            { title: 'Printers', id: 'printers', href: '/admin/printers?tab=printers' },
            { title: 'Templates', id: 'templates', href: '/admin/printers?tab=templates' },
            { title: 'Cash Drawers', id: 'drawers', href: '/admin/printers?tab=cash-drawers' },
        ],
    },
    { title: 'Service Day Close', icon: Clock, href: '/admin/service-day-close', group: 'pos', requiredRole: 'MANAGER' },
    { title: 'POS Setup', icon: Settings, href: '/pos/setup', group: 'pos', requiredRole: 'OWNER' },
    { title: 'KDS Stations', icon: Monitor, href: '/admin/kds/stations', group: 'pos', requiredRole: 'MANAGER' },

    // ═══════════════════════════════════════════════════════════════════
    // HUMAN RESOURCES
    // ═══════════════════════════════════════════════════════════════════
    { title: 'HR Dashboard', icon: Users, href: '/admin/hr', group: 'hr', requiredRole: 'MANAGER' },
    { title: 'Employee Directory', icon: UserCheck, href: '/admin/hr/people', group: 'hr', requiredRole: 'MANAGER' },
    { title: 'Leave Management', icon: Calendar, href: '/admin/hr/leave-management', group: 'hr', requiredRole: 'MANAGER' },
    { title: 'Payroll Processing', icon: DollarSign, href: '/admin/hr/payroll', group: 'hr', requiredRole: 'OWNER' },
    { title: 'Scheduler', icon: Clock, href: '/admin/hr/scheduler', group: 'hr', requiredRole: 'MANAGER' },
    { title: 'Clocking Data', icon: Activity, href: '/admin/hr/clocking', group: 'hr', requiredRole: 'MANAGER' },
    { title: 'Manual Clocking', icon: Timer, href: '/admin/hr/manual-clocking', group: 'hr', requiredRole: 'STAFF' },
    { title: 'Approval Center', icon: UserCheck, href: '/admin/hr/approvals', group: 'hr', requiredRole: 'STAFF' },
    { title: 'Approval Settings', icon: Settings, href: '/admin/hr/approval-settings', group: 'hr', requiredRole: 'OWNER' },
    { title: 'Contracts', icon: FileText, href: '/admin/hr/contracts', group: 'hr', requiredRole: 'OWNER' },
    { title: 'Documents', icon: FileText, href: '/admin/hr/documents', group: 'hr', requiredRole: 'MANAGER' },
    { title: 'Shift Planning', icon: Clock, href: '/admin/hr/shifts', group: 'hr', requiredRole: 'MANAGER' },
    { title: 'My Documents', icon: FileText, href: '/admin/hr/my-documents', group: 'hr', requiredRole: 'STAFF' },
    { title: 'Tips Management', icon: DollarSign, href: '/admin/hr/tips', group: 'hr', requiredRole: 'MANAGER' },
    { title: 'Timesheets', icon: Clock, href: '/admin/hr/timesheets', group: 'hr', requiredRole: 'MANAGER' },
    { title: 'Deep Analytics', icon: Activity, href: '/admin/hr/analytics', group: 'hr', requiredRole: 'OWNER' },
    {
        title: 'HR Reports', icon: FileText, href: '/admin/hr-reports/headcount', group: 'hr', requiredRole: 'OWNER',
        subs: [
            { title: 'Headcount', id: 'headcount', href: '/admin/hr-reports/headcount' },
            { title: 'Turnover', id: 'turnover', href: '/admin/hr-reports/turnover' },
            { title: 'Employee Details', id: 'emp-details', href: '/admin/hr-reports/employee-details' },
            { title: 'Employment Dates', id: 'emp-dates', href: '/admin/hr-reports/employment-dates' },
            { title: 'Birthdays & Anniversaries', id: 'birthdays', href: '/admin/hr-reports/birthdays' },
            { title: 'Training Expiring', id: 'train-exp', href: '/admin/hr-reports/training-expiring' },
            { title: 'Training Starting', id: 'train-start', href: '/admin/hr-reports/training-starting' },
            { title: 'Training Ongoing', id: 'train-on', href: '/admin/hr-reports/training-ongoing' },
        ],
    },
    {
        title: 'Advanced Modules', icon: Layers, href: '#', group: 'hr', requiredRole: 'OWNER',
        subs: [
            { title: 'ESG & Sustainability', id: 'esg', href: '/admin/hr/esg' },
            { title: 'Gov Reports', id: 'gov', href: '/admin/hr/gov-reports' },
            { title: 'Sick Leave Analysis', id: 'sick', href: '/admin/hr/sick-leave' },
            { title: 'Cost Forecasting', id: 'cost', href: '/admin/hr/forecasting-costs' },
            { title: 'Employee Portal View', id: 'portal', href: '/admin/hr/portal-view' },
        ],
    },
    {
        title: 'HR Settings', icon: Settings, href: '/admin/hr/settings', group: 'hr', requiredRole: 'OWNER',
        subs: [
            { title: 'Setup Hub', id: 'setup-hub', href: '/admin/hr-setup' },
            { title: 'Feature Flags', id: 'flags', href: '/admin/hr/settings' },
            { title: 'Banks', id: 'banks', href: '/admin/hr-setup/banks' },
            { title: 'Departments', id: 'depts', href: '/admin/hr-setup/departments' },
            { title: 'Locations', id: 'locs', href: '/admin/hr-setup/locations' },
            { title: 'Occupations', id: 'jobs', href: '/admin/hr-setup/occupations' },
            { title: 'Work Schedules', id: 'sched', href: '/admin/hr-setup/work-schedules' },
            { title: 'Tax Profiles', id: 'tax', href: '/admin/hr-setup/tax-profiles' },
        ],
    },

    // ═══════════════════════════════════════════════════════════════════
    // INVENTORY & SUPPLY CHAIN
    // ═══════════════════════════════════════════════════════════════════
    { title: 'General Settings', icon: Settings, href: '/admin/menu', group: 'menu', requiredRole: 'MANAGER' },
    { title: 'Quick Sync (Import)', icon: Upload, href: '/admin/migration', group: 'menu', requiredRole: 'OWNER' },
    { title: 'Menu Import (Legacy)', icon: Upload, href: '/admin/menu-import', group: 'menu', requiredRole: 'OWNER' },
    {
        title: 'Inventory Hub', icon: Package, href: '/admin/inventory', group: 'menu', requiredRole: 'MANAGER',
        subs: [
            { title: 'Items & Stock', id: 'items', href: '/admin/inventory-items' },
            { title: 'Stock Count', id: 'count', href: '/admin/inventory-stock-count' },
            { title: 'Waste Log', id: 'waste', href: '/admin/inventory-waste' },
            { title: 'Recipes', id: 'recipes', href: '/admin/inventory-recipes' },
            { title: 'Production', id: 'production', href: '/admin/inventory-production' },
            { title: 'Transfers', id: 'transfers', href: '/admin/inventory-transfers' },
            { title: 'Suppliers', id: 'suppliers', href: '/admin/suppliers' },
            { title: 'Purchase Orders', id: 'po', href: '/admin/inventory-purchase-orders' },
        ],
    },
    { title: 'Suppliers', icon: Truck, href: '/admin/suppliers', group: 'menu', requiredRole: 'MANAGER' },
    { title: 'Recipe Engineering', icon: Factory, href: '/admin/recipe-engineering', group: 'menu', requiredRole: 'MANAGER' },
    { title: 'Procurement Hub', icon: ShoppingCart, href: '/admin/procurement', group: 'procurement', requiredRole: 'MANAGER' },
    { title: 'RFQ Management', icon: FileText, href: '/admin/procurement/rfq', group: 'procurement', requiredRole: 'MANAGER' },
    { title: 'AI Invoice', icon: Activity, href: '/admin/ai-invoice', group: 'procurement', requiredRole: 'MANAGER' },
    { title: 'Central Kitchen', icon: Factory, href: '/admin/central-kitchen', group: 'production', requiredRole: 'MANAGER' },
    { title: 'Demand Forecasting', icon: TrendingUp, href: '/admin/forecasting', group: 'production', requiredRole: 'MANAGER' },
    { title: 'Quality Control', icon: Award, href: '/admin/quality', group: 'production', requiredRole: 'MANAGER' },

    // ═══════════════════════════════════════════════════════════════════
    // FINANCE
    // ═══════════════════════════════════════════════════════════════════
    { title: 'Finance Dashboard', icon: DollarSign, href: '/admin/finance', group: 'finance', requiredRole: 'OWNER' },
    { title: 'General Ledger', icon: FileText, href: '/admin/accounting', group: 'finance', requiredRole: 'OWNER' },
    { title: 'HR Accounting', icon: FileText, href: '/admin/hr-advanced/accounting', group: 'finance', requiredRole: 'OWNER' },

    // ═══════════════════════════════════════════════════════════════════
    // ANALYTICS & REPORTS
    // ═══════════════════════════════════════════════════════════════════
    {
        title: 'Reporting Hub', icon: BarChart3, href: '/admin/reporting', group: 'reports', requiredRole: 'MANAGER',
        subs: [
            { title: 'Summary Reports', id: 'summary' },
            { title: 'Revenue Reports', id: 'revenue' },
            { title: 'Shift Reports', id: 'shift' },
            { title: 'Hour Reports', id: 'hour' },
            { title: 'Day Reports', id: 'day' },
            { title: 'Week Reports', id: 'week' },
            { title: 'Month Reports', id: 'month' },
            { title: 'Product Reports', id: 'product' },
            { title: 'Category Reports', id: 'category' },
            { title: 'User Reports', id: 'user' },
            { title: 'Labour Reports', id: 'labour' },
            { title: 'Advanced Reports', id: 'advanced' },
            { title: 'Export Data', id: 'export' },
        ],
    },
    { title: 'Business Analytics', icon: TrendingUp, href: '/admin/analytics', group: 'reports', requiredRole: 'MANAGER' },
    { title: 'HR Analytics', icon: BarChart3, href: '/admin/hr-advanced/analytics', group: 'reports', requiredRole: 'OWNER' },
    { title: 'KDS Performance', icon: Activity, href: '/admin/reports/kds-performance-detailed', group: 'reports', requiredRole: 'MANAGER' },
    { title: 'Inventory Analytics', icon: PieChartIcon, href: '/admin/reports/inventory-detailed', group: 'reports', requiredRole: 'MANAGER' },

    // ═══════════════════════════════════════════════════════════════════
    // 🏪 VENUE SETTINGS — Branch-specific (per-location hardware & config)
    // ═══════════════════════════════════════════════════════════════════
    { title: 'Venue Profile', icon: Settings, href: '/admin/settings', group: 'venue-settings', requiredRole: 'OWNER' },
    { title: 'App Settings', icon: Settings, href: '/admin/app-settings', group: 'venue-settings', requiredRole: 'OWNER' },
    {
        title: 'Device Manager', icon: Monitor, group: 'venue-settings', href: '/admin/devices', requiredRole: 'MANAGER',
        subs: [
            { title: 'Device List', id: 'list', href: '/admin/devices' },
            { title: 'Device Hub', id: 'hub', href: '/admin/device-hub' },
            { title: 'Device Mapping', id: 'map', href: '/admin/device-mapping' },
        ],
    },
    { title: 'Door Access (Nuki)', icon: Award, href: '/admin/door-access', group: 'venue-settings', requiredRole: 'OWNER' },
    { title: 'Smart Home & IoT', icon: Home, href: '/admin/smart-home', group: 'venue-settings', requiredRole: 'OWNER' },

    // ═══════════════════════════════════════════════════════════════════
    // 🏢 ORG SETTINGS — Company-wide (policies, users, branding)
    // ═══════════════════════════════════════════════════════════════════
    { title: 'Organization Profile', icon: Building2, href: '/admin/company-settings', group: 'org-settings', requiredRole: 'OWNER' },
    { title: 'Legal Entities', icon: FileText, href: '/admin/legal-entities', group: 'org-settings', requiredRole: 'OWNER' },
    { title: 'Venue Management', icon: Building2, href: '/admin/venues', group: 'org-settings', requiredRole: 'OWNER' },
    { title: 'User Accounts', icon: UserCheck, href: '/admin/users', group: 'org-settings', requiredRole: 'OWNER' },
    { title: 'Roles & Permissions', icon: Shield, href: '/admin/access-control', group: 'org-settings', requiredRole: 'OWNER' },
    { title: 'Integration Sync', icon: RefreshCw, href: '/admin/sync', group: 'org-settings', requiredRole: 'OWNER' },
    { title: 'Theme & Branding', icon: Palette, href: '/admin/theme', group: 'org-settings', requiredRole: 'OWNER' },
    { title: 'Template Studio', icon: LayoutDashboard, href: '/admin/templates', group: 'org-settings', requiredRole: 'MANAGER' },
    { title: 'Google Workspace', icon: Globe, href: '/admin/google-workspace', group: 'org-settings', requiredRole: 'MANAGER' },

    // ═══════════════════════════════════════════════════════════════════
    // ⚙️ SYSTEM ADMIN — Platform infrastructure (product_owner only)
    // ═══════════════════════════════════════════════════════════════════
    { title: 'Observability', icon: Activity, href: '/admin/observability', group: 'system-admin', requiredRole: 'PRODUCT_OWNER' },
    {
        title: 'System Intelligence', icon: Activity, href: '/admin/monitoring', group: 'system-admin', requiredRole: 'PRODUCT_OWNER',
        subs: [
            { title: 'Real-time Monitor', id: 'monitor', href: '/admin/monitoring' },
            { title: 'System Logs', id: 'logs', href: '/admin/logs' },
            { title: 'Advanced Health', id: 'health', href: '/admin/system-health-advanced' },
            { title: 'Error Inbox', id: 'errors', href: '/admin/observability/error-inbox' },
            { title: 'Test Panel', id: 'test', href: '/admin/observability/testpanel' },
        ],
    },
    { title: 'Pre-Go-Live', icon: Activity, href: '/admin/pre-go-live', group: 'system-admin', requiredRole: 'PRODUCT_OWNER' },
    { title: 'Audit Logs', icon: Activity, href: '/admin/audit-logs', group: 'system-admin', requiredRole: 'PRODUCT_OWNER' },
    { title: 'Billing & Plans', icon: DollarSign, href: '/admin/billing', group: 'system-admin', requiredRole: 'PRODUCT_OWNER' },
    { title: 'Feature Flags', icon: Shield, href: '/admin/feature-flags', group: 'system-admin', requiredRole: 'PRODUCT_OWNER' },
    { title: 'Data Export', icon: Database, href: '/admin/data-export', group: 'system-admin', requiredRole: 'PRODUCT_OWNER' },
    { title: 'Microservices', icon: Server, href: '/admin/microservices', group: 'system-admin', requiredRole: 'PRODUCT_OWNER' },
    { title: 'Event Monitor', icon: Activity, href: '/admin/events', group: 'system-admin', requiredRole: 'PRODUCT_OWNER' },
    { title: 'Updates & Changelog', icon: Activity, href: '/admin/updates', group: 'system-admin', requiredRole: 'PRODUCT_OWNER' },

    // ═══════════════════════════════════════════════════════════════════
    // RESTIN.AI COMMERCIAL MODULES
    // ═══════════════════════════════════════════════════════════════════
    { title: 'Control Tower', icon: LayoutDashboard, href: '/admin/restin', group: 'restin', requiredRole: 'OWNER' },
    { title: 'Website Builder', icon: Globe, href: '/admin/restin/web', group: 'restin', requiredRole: 'OWNER' },
    { title: 'Voice AI', icon: Mic, href: '/admin/restin/voice', group: 'restin', requiredRole: 'OWNER' },
    { title: 'Autopilot CRM', icon: Users, href: '/admin/restin/crm', group: 'restin', requiredRole: 'OWNER' },
    { title: 'Content Studio', icon: Wand2, href: '/admin/restin/studio', group: 'restin', requiredRole: 'OWNER' },
    { title: 'Market Radar', icon: Radar, href: '/admin/restin/radar', group: 'restin', requiredRole: 'OWNER' },
    { title: 'Ops & Aggregators', icon: Layers, href: '/admin/restin/ops', group: 'restin', requiredRole: 'OWNER' },
    { title: 'Fintech & Payments', icon: DollarSign, href: '/admin/restin/fintech', group: 'restin', requiredRole: 'OWNER' },

    // ═══════════════════════════════════════════════════════════════════
    // COLLABORATION & COMMUNICATION
    // ═══════════════════════════════════════════════════════════════════
    { title: 'Hive Chat', icon: MessageSquare, href: '/admin/collab/hive', group: 'collab', requiredRole: 'STAFF' },
    { title: 'Tasks Board', icon: LayoutGrid, href: '/admin/collab/tasks', group: 'collab', requiredRole: 'STAFF' },
    { title: 'Inbox', icon: FileText, href: '/admin/collab/inbox', group: 'collab', requiredRole: 'STAFF' },
    { title: 'Gamification', icon: Award, href: '/admin/staff-gamification', group: 'collab', requiredRole: 'STAFF' },
];

// ─── Build Search Index ─────────────────────────────────────────────────

/**
 * Build a flat, searchable index of all pages/sub-pages that the given user role can access.
 * Each entry has a breadcrumb string like "HR & People › Clocking Data".
 */
export function buildSearchIndex(userRole: string | undefined): SearchableItem[] {
    const userLevel = ROLE_HIERARCHY[userRole ?? ''] ?? 0;
    const items: SearchableItem[] = [];

    for (const item of MENU_ITEMS) {
        const itemLevel = ROLE_HIERARCHY[item.requiredRole] ?? 0;
        if (userLevel < itemLevel) continue;
        if (item.href === '#') continue;

        const domainId = getDomainForGroup(item.group);
        const domain = DOMAINS.find(d => d.id === domainId);
        const domainTitle = domain?.title ?? 'Other';

        // Add the main item
        items.push({
            title: item.title,
            path: item.href,
            group: item.group,
            domain: domainId,
            domainTitle,
            breadcrumb: `${domainTitle} › ${item.title}`,
            icon: item.icon,
            requiredRole: item.requiredRole,
            keywords: generateKeywords(item.title, item.href),
        });

        // Add sub-items
        if (item.subs) {
            for (const sub of item.subs) {
                const subPath = sub.href || item.href;
                items.push({
                    title: sub.title,
                    path: subPath,
                    group: item.group,
                    domain: domainId,
                    domainTitle,
                    breadcrumb: `${domainTitle} › ${item.title} › ${sub.title}`,
                    parentTitle: item.title,
                    icon: item.icon,
                    requiredRole: item.requiredRole,
                    keywords: generateKeywords(sub.title, subPath),
                });
            }
        }
    }

    return items;
}

/** Generate additional search keywords from title and path */
function generateKeywords(title: string, path: string): string[] {
    const words = title.toLowerCase().split(/[\s&\-/]+/).filter(Boolean);
    const pathParts = path.replace(/^\/admin\//, '').split(/[\s/\-?=]+/).filter(Boolean);
    return Array.from(new Set([...words, ...pathParts]));
}
