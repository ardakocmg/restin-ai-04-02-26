/**
 * Shared Search Registry — Single source of truth for navigation items.
 *
 * Used by:
 *   - NewSidebar (navigation menu rendering)
 *   - NewTopBar (inline search suggestions + domain dropdowns)
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
    Wrench, Cog, Database, Brain, Smartphone, Combine, Banknote, Gauge,
    ChefHat, Tag, UtensilsCrossed, CreditCard, Percent, XCircle, Printer,
    Grid3X3, ClipboardList, Utensils, AlertCircle, Star, Tablet, Map,
    BarChart2, CalendarDays, Bell, Cpu,
    type LucideIcon
} from 'lucide-react';

import { ROLE_HIERARCHY } from './roles';

// ─── Types ──────────────────────────────────────────────────────────────

export interface MenuItem {
    title: string;
    icon: LucideIcon;
    href: string;
    group: string;
    requiredRole: string;
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
    { title: 'Dashboard', icon: LayoutDashboard, href: '/manager/dashboard', group: 'main', requiredRole: 'MANAGER' },

    // ═══════════════════════════════════════════════════════════════════
    // POS & OPERATIONS
    // ═══════════════════════════════════════════════════════════════════
    { title: 'POS Dashboard', icon: LayoutDashboard, href: '/manager/pos-dashboard', group: 'pos', requiredRole: 'MANAGER' },
    { title: 'POS Themes', icon: Palette, href: '/manager/pos-themes', group: 'pos', requiredRole: 'MANAGER' },
    {
        title: 'Sales Analytics', icon: BarChart3, href: '/manager/reports/sales', group: 'pos', requiredRole: 'MANAGER',
        children: [
            { title: 'Summary Reports', icon: BarChart3, href: '/manager/reports/sales?type=summary', group: 'pos', requiredRole: 'MANAGER' },
            { title: 'Revenue Reports', icon: BarChart3, href: '/manager/reports/sales?type=revenue', group: 'pos', requiredRole: 'MANAGER' },
            { title: 'Shift Reports', icon: BarChart3, href: '/manager/reports/sales?type=shift', group: 'pos', requiredRole: 'MANAGER' },
            { title: 'Product Reports', icon: BarChart3, href: '/manager/reports/sales?type=product', group: 'pos', requiredRole: 'MANAGER' },
            { title: 'Category Reports', icon: BarChart3, href: '/manager/reports/sales?type=category', group: 'pos', requiredRole: 'MANAGER' },
            { title: 'Labour Reports', icon: BarChart3, href: '/manager/reports/sales?type=labour', group: 'pos', requiredRole: 'MANAGER' },
            { title: 'Export Data', icon: BarChart3, href: '/manager/reports/sales?type=export', group: 'pos', requiredRole: 'MANAGER' },
        ],
    },
    { title: 'Products', icon: ShoppingCart, href: '/manager/products', group: 'pos', requiredRole: 'MANAGER' },
    { title: 'Physical Tables', icon: TableIcon, href: '/manager/physical-tables', group: 'pos', requiredRole: 'MANAGER' },
    { title: 'Floor Plans', icon: LayoutGrid, href: '/manager/floor-plans', group: 'pos', requiredRole: 'MANAGER' },
    { title: 'Review Risk', icon: ShieldAlert, href: '/manager/review-risk', group: 'pos', requiredRole: 'MANAGER' },
    { title: 'Reservations', icon: Calendar, href: '/manager/reservations', group: 'pos', requiredRole: 'MANAGER' },
    { title: 'CRM & Guests', icon: Users, href: '/manager/crm', group: 'pos', requiredRole: 'MANAGER' },
    { title: 'Loyalty Program', icon: Award, href: '/manager/loyalty', group: 'pos', requiredRole: 'MANAGER' },
    { title: 'Operational Timeline', icon: Clock, href: '/manager/reservations/timeline', group: 'pos', requiredRole: 'MANAGER' },
    {
        title: 'Printer Management', icon: Receipt, group: 'pos', href: '/manager/printers', requiredRole: 'MANAGER',
        children: [
            { title: 'Printers', icon: Receipt, href: '/manager/printers?tab=printers', group: 'pos', requiredRole: 'MANAGER' },
            { title: 'Templates', icon: Receipt, href: '/manager/printers?tab=templates', group: 'pos', requiredRole: 'MANAGER' },
            { title: 'Cash Drawers', icon: Receipt, href: '/manager/printers?tab=cash-drawers', group: 'pos', requiredRole: 'MANAGER' },
        ],
    },
    { title: 'Service Day Close', icon: Clock, href: '/manager/service-day-close', group: 'pos', requiredRole: 'MANAGER' },
    { title: 'Order Anywhere', icon: Smartphone, href: '/manager/order-anywhere', group: 'pos', requiredRole: 'MANAGER' },
    { title: 'Combo Builder', icon: Combine, href: '/manager/combos', group: 'pos', requiredRole: 'MANAGER' },
    { title: 'Tip Presets', icon: Banknote, href: '/manager/tip-presets', group: 'pos', requiredRole: 'OWNER' },
    { title: 'Tableside Ordering', icon: Smartphone, href: '/manager/tableside', group: 'pos', requiredRole: 'MANAGER' },
    { title: 'POS Setup', icon: Settings, href: '/pos/setup', group: 'pos', requiredRole: 'OWNER' },
    { title: 'KDS Stations', icon: Monitor, href: '/manager/kds/stations', group: 'pos', requiredRole: 'MANAGER' },
    {
        title: 'K-Series Config', icon: Settings, href: '/manager/menu-builder', group: 'pos', requiredRole: 'MANAGER',
        children: [
            // Menu & Items
            { title: 'Menu Builder', icon: LayoutGrid, href: '/manager/menu-builder', group: 'pos', requiredRole: 'MANAGER' },
            { title: 'Item Library', icon: ShoppingCart, href: '/manager/item-library', group: 'pos', requiredRole: 'MANAGER' },
            { title: 'Accounting Groups', icon: FileText, href: '/manager/accounting-groups', group: 'pos', requiredRole: 'MANAGER' },
            { title: 'Combo Meals', icon: Combine, href: '/manager/combo-meals', group: 'pos', requiredRole: 'MANAGER' },
            { title: 'Courses', icon: Utensils, href: '/manager/courses', group: 'pos', requiredRole: 'MANAGER' },
            { title: 'Item Tags', icon: Tag, href: '/manager/item-tags', group: 'pos', requiredRole: 'MANAGER' },
            { title: 'Allergen Manager', icon: AlertCircle, href: '/manager/allergens', group: 'pos', requiredRole: 'MANAGER' },
            // Payments & Charges
            { title: 'Payment Methods', icon: CreditCard, href: '/manager/payment-methods', group: 'pos', requiredRole: 'MANAGER' },
            { title: 'Tax Settings', icon: DollarSign, href: '/manager/taxes', group: 'pos', requiredRole: 'MANAGER' },
            { title: 'Discounts', icon: Percent, href: '/manager/discounts', group: 'pos', requiredRole: 'MANAGER' },
            { title: 'Service Charge', icon: Banknote, href: '/manager/service-charge', group: 'pos', requiredRole: 'MANAGER' },
            { title: 'Loyalty Program', icon: Star, href: '/manager/loyalty-config', group: 'pos', requiredRole: 'MANAGER' },
            // Operations
            { title: 'POS Users & Groups', icon: Users, href: '/manager/pos-users', group: 'pos', requiredRole: 'MANAGER' },
            { title: 'Void Reasons', icon: XCircle, href: '/manager/void-reasons', group: 'pos', requiredRole: 'MANAGER' },
            { title: 'Order Profiles', icon: ClipboardList, href: '/manager/order-profiles', group: 'pos', requiredRole: 'MANAGER' },
            { title: 'Floor Plans (BO)', icon: Grid3X3, href: '/manager/floor-plans', group: 'pos', requiredRole: 'MANAGER' },
            { title: 'Production Centers', icon: ChefHat, href: '/manager/production-centers', group: 'pos', requiredRole: 'MANAGER' },
            { title: 'Production Instructions', icon: UtensilsCrossed, href: '/manager/production-instructions', group: 'pos', requiredRole: 'MANAGER' },
            // Printing & Display
            { title: 'Printing Profiles', icon: Printer, href: '/manager/printing-profiles', group: 'pos', requiredRole: 'MANAGER' },
            { title: 'Receipt Templates', icon: Receipt, href: '/manager/receipt-templates', group: 'pos', requiredRole: 'MANAGER' },
            { title: 'Customer Display', icon: Monitor, href: '/manager/customer-display-config', group: 'pos', requiredRole: 'MANAGER' },
            // Hardware & Live
            { title: 'Kiosk Mode', icon: Tablet, href: '/manager/kiosk-mode', group: 'pos', requiredRole: 'MANAGER' },
            { title: 'POS Devices', icon: Cpu, href: '/manager/pos-devices', group: 'pos', requiredRole: 'MANAGER' },
            { title: 'Table Tracker', icon: Map, href: '/manager/table-tracker', group: 'pos', requiredRole: 'MANAGER' },
            { title: 'Kitchen Analytics', icon: BarChart2, href: '/manager/kitchen-analytics', group: 'pos', requiredRole: 'MANAGER' },
            { title: 'Staff Scheduler', icon: CalendarDays, href: '/manager/staff-scheduler', group: 'pos', requiredRole: 'MANAGER' },
            { title: 'Inventory Alerts', icon: Bell, href: '/manager/inventory-alerts', group: 'pos', requiredRole: 'MANAGER' },
        ],
    },

    // ═══════════════════════════════════════════════════════════════════
    // HUMAN RESOURCES
    // ═══════════════════════════════════════════════════════════════════
    { title: 'HR Dashboard', icon: Users, href: '/manager/hr', group: 'hr', requiredRole: 'MANAGER' },
    { title: 'Employee Directory', icon: UserCheck, href: '/manager/hr/people', group: 'hr', requiredRole: 'MANAGER' },
    { title: 'Leave Management', icon: Calendar, href: '/manager/hr/leave-management', group: 'hr', requiredRole: 'MANAGER' },
    { title: 'Payroll Processing', icon: DollarSign, href: '/manager/hr/payroll', group: 'hr', requiredRole: 'OWNER' },
    { title: 'Scheduler', icon: Clock, href: '/manager/hr/scheduler', group: 'hr', requiredRole: 'MANAGER' },
    { title: 'Clocking Data', icon: Activity, href: '/manager/hr/clocking', group: 'hr', requiredRole: 'MANAGER' },
    { title: 'Manual Clocking', icon: Timer, href: '/manager/hr/manual-clocking', group: 'hr', requiredRole: 'STAFF' },
    { title: 'Approval Center', icon: UserCheck, href: '/manager/hr/approvals', group: 'hr', requiredRole: 'STAFF' },
    { title: 'Approval Settings', icon: Settings, href: '/manager/hr/approval-settings', group: 'hr', requiredRole: 'OWNER' },
    { title: 'Contracts', icon: FileText, href: '/manager/hr/contracts', group: 'hr', requiredRole: 'OWNER' },
    { title: 'Documents', icon: FileText, href: '/manager/hr/documents', group: 'hr', requiredRole: 'MANAGER' },
    { title: 'Shift Planning', icon: Clock, href: '/manager/hr/shifts', group: 'hr', requiredRole: 'MANAGER' },
    { title: 'My Documents', icon: FileText, href: '/manager/hr/my-documents', group: 'hr', requiredRole: 'STAFF' },
    { title: 'Tips Management', icon: DollarSign, href: '/manager/hr/tips', group: 'hr', requiredRole: 'MANAGER' },
    { title: 'Timesheets', icon: Clock, href: '/manager/hr/timesheets', group: 'hr', requiredRole: 'MANAGER' },
    { title: 'Deep Analytics', icon: Activity, href: '/manager/hr/analytics', group: 'hr', requiredRole: 'OWNER' },
    {
        title: 'HR Reports', icon: FileText, href: '/manager/hr-reports/headcount', group: 'hr', requiredRole: 'OWNER',
        children: [
            { title: 'Headcount', icon: FileText, href: '/manager/hr-reports/headcount', group: 'hr', requiredRole: 'OWNER' },
            { title: 'Turnover', icon: FileText, href: '/manager/hr-reports/turnover', group: 'hr', requiredRole: 'OWNER' },
            { title: 'Employee Details', icon: FileText, href: '/manager/hr-reports/employee-details', group: 'hr', requiredRole: 'OWNER' },
            { title: 'Employment Dates', icon: FileText, href: '/manager/hr-reports/employment-dates', group: 'hr', requiredRole: 'OWNER' },
            { title: 'Birthdays & Anniversaries', icon: FileText, href: '/manager/hr-reports/birthdays', group: 'hr', requiredRole: 'OWNER' },
            { title: 'Training Expiring', icon: FileText, href: '/manager/hr-reports/training-expiring', group: 'hr', requiredRole: 'OWNER' },
            { title: 'Training Starting', icon: FileText, href: '/manager/hr-reports/training-starting', group: 'hr', requiredRole: 'OWNER' },
            { title: 'Training Ongoing', icon: FileText, href: '/manager/hr-reports/training-ongoing', group: 'hr', requiredRole: 'OWNER' },
        ],
    },
    {
        title: 'Advanced Modules', icon: Layers, href: '/manager/hr/esg', group: 'hr', requiredRole: 'OWNER',
        children: [
            { title: 'ESG & Sustainability', icon: Layers, href: '/manager/hr/esg', group: 'hr', requiredRole: 'OWNER' },
            { title: 'Gov Reports', icon: Layers, href: '/manager/hr/gov-reports', group: 'hr', requiredRole: 'OWNER' },
            { title: 'Sick Leave Analysis', icon: Layers, href: '/manager/hr/sick-leave', group: 'hr', requiredRole: 'OWNER' },
            { title: 'Cost Forecasting', icon: Layers, href: '/manager/hr/forecasting-costs', group: 'hr', requiredRole: 'OWNER' },
            { title: 'Employee Portal View', icon: Layers, href: '/manager/hr/portal-view', group: 'hr', requiredRole: 'OWNER' },
        ],
    },
    {
        title: 'HR Settings', icon: Settings, href: '/manager/hr/settings', group: 'hr', requiredRole: 'OWNER',
        children: [
            { title: 'Setup Hub', icon: Settings, href: '/manager/hr-setup', group: 'hr', requiredRole: 'OWNER' },
            { title: 'Feature Flags', icon: Settings, href: '/manager/hr/settings', group: 'hr', requiredRole: 'OWNER' },
            { title: 'Banks', icon: Settings, href: '/manager/hr-setup/banks', group: 'hr', requiredRole: 'OWNER' },
            { title: 'Departments', icon: Settings, href: '/manager/hr-setup/departments', group: 'hr', requiredRole: 'OWNER' },
            { title: 'Locations', icon: Settings, href: '/manager/hr-setup/locations', group: 'hr', requiredRole: 'OWNER' },
            { title: 'Occupations', icon: Settings, href: '/manager/hr-setup/occupations', group: 'hr', requiredRole: 'OWNER' },
            { title: 'Work Schedules', icon: Settings, href: '/manager/hr-setup/work-schedules', group: 'hr', requiredRole: 'OWNER' },
            { title: 'Tax Profiles', icon: Settings, href: '/manager/hr-setup/tax-profiles', group: 'hr', requiredRole: 'OWNER' },
        ],
    },

    // ═══════════════════════════════════════════════════════════════════
    // INVENTORY & SUPPLY CHAIN
    // ═══════════════════════════════════════════════════════════════════
    { title: 'General Settings', icon: Settings, href: '/manager/menu', group: 'menu', requiredRole: 'MANAGER' },
    { title: 'Quick Sync (Import)', icon: Upload, href: '/manager/migration', group: 'menu', requiredRole: 'OWNER' },
    {
        title: 'Inventory Hub', icon: Package, href: '/manager/inventory', group: 'menu', requiredRole: 'MANAGER',
        children: [
            { title: 'Items & Stock', icon: Package, href: '/manager/inventory-items', group: 'menu', requiredRole: 'MANAGER' },
            { title: 'Stock Count', icon: Package, href: '/manager/inventory-stock-count', group: 'menu', requiredRole: 'MANAGER' },
            { title: 'Waste Log', icon: Package, href: '/manager/inventory-waste', group: 'menu', requiredRole: 'MANAGER' },
            { title: 'Recipes', icon: Package, href: '/manager/inventory-recipes', group: 'menu', requiredRole: 'MANAGER' },
            { title: 'Production', icon: Factory, href: '/manager/inventory-production', group: 'menu', requiredRole: 'MANAGER' },
            { title: 'Transfers', icon: Package, href: '/manager/inventory-transfers', group: 'menu', requiredRole: 'MANAGER' },
            { title: 'Goods Received', icon: Package, href: '/manager/inventory-grn', group: 'menu', requiredRole: 'MANAGER' },
            { title: 'Ordering Suggestions', icon: TrendingUp, href: '/manager/inventory-ordering', group: 'menu', requiredRole: 'MANAGER' },
            { title: 'Adjustments', icon: Package, href: '/manager/inventory-adjustments', group: 'menu', requiredRole: 'MANAGER' },
            { title: 'Suppliers', icon: Truck, href: '/manager/suppliers', group: 'menu', requiredRole: 'MANAGER' },
            { title: 'Purchase Orders', icon: FileText, href: '/manager/inventory-purchase-orders', group: 'menu', requiredRole: 'MANAGER' },
            { title: 'Menu Engineering', icon: PieChartIcon, href: '/manager/menu-engineering', group: 'menu', requiredRole: 'MANAGER' },
            { title: 'Sales Mix', icon: BarChart3, href: '/manager/sales-mix', group: 'menu', requiredRole: 'MANAGER' },
            { title: 'Meal Planning', icon: Calendar, href: '/manager/meal-planning', group: 'menu', requiredRole: 'MANAGER' },
        ],
    },
    { title: 'Suppliers', icon: Truck, href: '/manager/suppliers', group: 'menu', requiredRole: 'MANAGER' },
    { title: 'Recipe Engineering', icon: Factory, href: '/manager/recipe-engineering', group: 'menu', requiredRole: 'MANAGER' },
    { title: 'Procurement Hub', icon: ShoppingCart, href: '/manager/procurement', group: 'procurement', requiredRole: 'MANAGER' },
    { title: 'RFQ Management', icon: FileText, href: '/manager/procurement/rfq', group: 'procurement', requiredRole: 'MANAGER' },
    { title: 'AI Invoice', icon: Activity, href: '/manager/ai-invoice', group: 'procurement', requiredRole: 'MANAGER' },
    { title: 'Central Kitchen', icon: Factory, href: '/manager/central-kitchen', group: 'production', requiredRole: 'MANAGER' },
    { title: 'Demand Forecasting', icon: TrendingUp, href: '/manager/forecasting', group: 'production', requiredRole: 'MANAGER' },
    { title: 'Quality Control', icon: Award, href: '/manager/quality', group: 'production', requiredRole: 'MANAGER' },

    // ═══════════════════════════════════════════════════════════════════
    // FINANCE
    // ═══════════════════════════════════════════════════════════════════
    { title: 'Finance Dashboard', icon: DollarSign, href: '/manager/finance', group: 'finance', requiredRole: 'OWNER' },
    { title: 'General Ledger', icon: FileText, href: '/manager/accounting', group: 'finance', requiredRole: 'OWNER' },
    { title: 'HR Accounting', icon: FileText, href: '/manager/hr-advanced/accounting', group: 'finance', requiredRole: 'OWNER' },

    // ═══════════════════════════════════════════════════════════════════
    // ANALYTICS & REPORTS
    // ═══════════════════════════════════════════════════════════════════
    {
        title: 'Reporting Hub', icon: BarChart3, href: '/manager/reporting', group: 'reports', requiredRole: 'MANAGER',
        children: [
            { title: 'Summary Reports', icon: BarChart3, href: '/manager/reporting?type=summary', group: 'reports', requiredRole: 'MANAGER' },
            { title: 'Revenue Reports', icon: BarChart3, href: '/manager/reporting?type=revenue', group: 'reports', requiredRole: 'MANAGER' },
            { title: 'Product Reports', icon: BarChart3, href: '/manager/reporting?type=product', group: 'reports', requiredRole: 'MANAGER' },
            { title: 'Category Reports', icon: BarChart3, href: '/manager/reporting?type=category', group: 'reports', requiredRole: 'MANAGER' },
            { title: 'Labour Reports', icon: BarChart3, href: '/manager/reporting?type=labour', group: 'reports', requiredRole: 'MANAGER' },
            { title: 'Export Data', icon: BarChart3, href: '/manager/reporting?type=export', group: 'reports', requiredRole: 'MANAGER' },
        ],
    },
    { title: 'Business Analytics', icon: TrendingUp, href: '/manager/analytics', group: 'reports', requiredRole: 'MANAGER' },
    { title: 'Pulse Analytics', icon: Gauge, href: '/manager/pulse', group: 'reports', requiredRole: 'MANAGER' },
    { title: 'HR Analytics', icon: BarChart3, href: '/manager/hr-advanced/analytics', group: 'reports', requiredRole: 'OWNER' },
    { title: 'KDS Performance', icon: Activity, href: '/manager/reports/kds-performance-detailed', group: 'reports', requiredRole: 'MANAGER' },
    { title: 'Inventory Analytics', icon: PieChartIcon, href: '/manager/reports/inventory-detailed', group: 'reports', requiredRole: 'MANAGER' },

    // ═══════════════════════════════════════════════════════════════════
    // RESTIN OS (AI & Platform Features — Unified)
    //   • Hey Rin & AI Config live under /manager/ai/ (unique pages)
    //   • All pillar dashboards live under /manager/restin/ (rich UIs)
    // ═══════════════════════════════════════════════════════════════════
    { title: 'Hey Rin', icon: Brain, href: '/manager/ai/copilot', group: 'restin', requiredRole: 'OWNER' },
    { title: 'Control Tower', icon: LayoutDashboard, href: '/manager/restin', group: 'restin', requiredRole: 'OWNER' },
    { title: 'Voice AI', icon: Mic, href: '/manager/restin/voice', group: 'restin', requiredRole: 'OWNER' },
    { title: 'Content Studio', icon: Wand2, href: '/manager/restin/studio', group: 'restin', requiredRole: 'OWNER' },
    { title: 'Market Radar', icon: Radar, href: '/manager/restin/radar', group: 'restin', requiredRole: 'OWNER' },
    { title: 'Website Builder', icon: Globe, href: '/manager/restin/web', group: 'restin', requiredRole: 'OWNER' },
    { title: 'Autopilot CRM', icon: Users, href: '/manager/restin/crm', group: 'restin', requiredRole: 'OWNER' },
    { title: 'Ops & Aggregators', icon: Layers, href: '/manager/restin/ops', group: 'restin', requiredRole: 'OWNER' },
    { title: 'Fintech & Payments', icon: DollarSign, href: '/manager/restin/fintech', group: 'restin', requiredRole: 'OWNER' },

    // ═══════════════════════════════════════════════════════════════════
    // 🏪 VENUE SETTINGS — Branch-specific (per-location hardware & config)
    // ═══════════════════════════════════════════════════════════════════
    { title: 'Venue Profile', icon: Settings, href: '/manager/settings', group: 'venue-settings', requiredRole: 'OWNER' },
    { title: 'App Settings', icon: Settings, href: '/manager/app-settings', group: 'venue-settings', requiredRole: 'OWNER' },
    {
        title: 'Device Manager', icon: Monitor, group: 'venue-settings', href: '/manager/devices', requiredRole: 'MANAGER',
        children: [
            { title: 'Device List', icon: Monitor, href: '/manager/devices', group: 'venue-settings', requiredRole: 'MANAGER' },
            { title: 'Device Hub', icon: Monitor, href: '/manager/device-hub', group: 'venue-settings', requiredRole: 'MANAGER' },
            { title: 'Device Mapping', icon: Monitor, href: '/manager/device-mapping', group: 'venue-settings', requiredRole: 'MANAGER' },
        ],
    },
    { title: 'Door Access (Nuki)', icon: Award, href: '/manager/door-access', group: 'venue-settings', requiredRole: 'OWNER' },
    { title: 'Smart Home & IoT', icon: Home, href: '/manager/smart-home', group: 'venue-settings', requiredRole: 'OWNER' },

    // ═══════════════════════════════════════════════════════════════════
    // 🏢 ORG SETTINGS — Company-wide (policies, users, branding)
    // ═══════════════════════════════════════════════════════════════════
    { title: 'Organization Profile', icon: Building2, href: '/manager/company-settings', group: 'org-settings', requiredRole: 'OWNER' },
    { title: 'Legal Entities', icon: FileText, href: '/manager/legal-entities', group: 'org-settings', requiredRole: 'OWNER' },
    { title: 'Venue Management', icon: Building2, href: '/manager/venues', group: 'org-settings', requiredRole: 'OWNER' },
    { title: 'User Accounts', icon: UserCheck, href: '/manager/users', group: 'org-settings', requiredRole: 'OWNER' },
    { title: 'Roles & Permissions', icon: Shield, href: '/manager/access-control', group: 'org-settings', requiredRole: 'OWNER' },
    { title: 'Integration Sync', icon: RefreshCw, href: '/manager/sync', group: 'org-settings', requiredRole: 'OWNER' },
    { title: 'Theme & Branding', icon: Palette, href: '/manager/theme', group: 'org-settings', requiredRole: 'OWNER' },
    { title: 'Template Studio', icon: LayoutDashboard, href: '/manager/templates', group: 'org-settings', requiredRole: 'MANAGER' },
    { title: 'Google Workspace', icon: Globe, href: '/manager/google-workspace', group: 'org-settings', requiredRole: 'MANAGER' },
    { title: 'My Google', icon: Globe, href: '/manager/my-google', group: 'org-settings', requiredRole: 'STAFF' },
    { title: 'AI Config', icon: Brain, href: '/manager/ai/models', group: 'org-settings', requiredRole: 'OWNER' },

    // ═══════════════════════════════════════════════════════════════════
    // ⚙️ SYSTEM ADMIN — Platform infrastructure (product_owner only)
    // ═══════════════════════════════════════════════════════════════════
    { title: 'Observability', icon: Activity, href: '/manager/observability', group: 'system-admin', requiredRole: 'PRODUCT_OWNER' },
    {
        title: 'System Intelligence', icon: Activity, href: '/manager/monitoring', group: 'system-admin', requiredRole: 'PRODUCT_OWNER',
        children: [
            { title: 'Real-time Monitor', icon: Activity, href: '/manager/monitoring', group: 'system-admin', requiredRole: 'PRODUCT_OWNER' },
            { title: 'System Logs', icon: Activity, href: '/manager/logs', group: 'system-admin', requiredRole: 'PRODUCT_OWNER' },
            { title: 'Advanced Health', icon: Activity, href: '/manager/system-health-advanced', group: 'system-admin', requiredRole: 'PRODUCT_OWNER' },
            { title: 'Error Inbox', icon: Activity, href: '/manager/observability/error-inbox', group: 'system-admin', requiredRole: 'PRODUCT_OWNER' },
            { title: 'Test Panel', icon: Activity, href: '/manager/observability/testpanel', group: 'system-admin', requiredRole: 'PRODUCT_OWNER' },
        ],
    },
    { title: 'Pre-Go-Live', icon: Activity, href: '/manager/pre-go-live', group: 'system-admin', requiredRole: 'PRODUCT_OWNER' },
    { title: 'Audit Logs', icon: Activity, href: '/manager/audit-logs', group: 'system-admin', requiredRole: 'PRODUCT_OWNER' },
    { title: 'Billing & Plans', icon: DollarSign, href: '/manager/billing', group: 'system-admin', requiredRole: 'PRODUCT_OWNER' },
    { title: 'Feature Flags', icon: Shield, href: '/manager/feature-flags', group: 'system-admin', requiredRole: 'PRODUCT_OWNER' },
    { title: 'Data Export', icon: Database, href: '/manager/data-export', group: 'system-admin', requiredRole: 'PRODUCT_OWNER' },
    { title: 'Microservices', icon: Server, href: '/manager/microservices', group: 'system-admin', requiredRole: 'PRODUCT_OWNER' },
    { title: 'Event Monitor', icon: Activity, href: '/manager/events', group: 'system-admin', requiredRole: 'PRODUCT_OWNER' },
    { title: 'Updates & Changelog', icon: Activity, href: '/manager/updates', group: 'system-admin', requiredRole: 'PRODUCT_OWNER' },
    { title: 'AI Models & Config', icon: Brain, href: '/manager/ai/models', group: 'system-admin', requiredRole: 'PRODUCT_OWNER' },
    { title: 'AI Control Center', icon: Brain, href: '/manager/ai/settings', group: 'system-admin', requiredRole: 'PRODUCT_OWNER' },

    // ═══════════════════════════════════════════════════════════════════
    // COLLABORATION & COMMUNICATION
    // ═══════════════════════════════════════════════════════════════════
    { title: 'Hive Chat', icon: MessageSquare, href: '/manager/collab/hive', group: 'collab', requiredRole: 'STAFF' },
    { title: 'Tasks Board', icon: LayoutGrid, href: '/manager/collab/tasks', group: 'collab', requiredRole: 'STAFF' },
    { title: 'Inbox', icon: FileText, href: '/manager/collab/inbox', group: 'collab', requiredRole: 'STAFF' },
    { title: 'Gamification', icon: Award, href: '/manager/staff-gamification', group: 'collab', requiredRole: 'STAFF' },
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

        // Add children (accordion sub-items)
        if (item.children) {
            for (const child of item.children) {
                const childLevel = ROLE_HIERARCHY[child.requiredRole] ?? 0;
                if (userLevel < childLevel) continue;
                items.push({
                    title: child.title,
                    path: child.href,
                    group: item.group,
                    domain: domainId,
                    domainTitle,
                    breadcrumb: `${domainTitle} › ${item.title} › ${child.title}`,
                    parentTitle: item.title,
                    icon: child.icon || item.icon,
                    requiredRole: child.requiredRole,
                    keywords: generateKeywords(child.title, child.href),
                });
            }
        }
    }

    return items;
}

/** Generate additional search keywords from title and path */
function generateKeywords(title: string, path: string): string[] {
    const words = title.toLowerCase().split(/[\s&\-/]+/).filter(Boolean);
    const pathParts = path.replace(/^\/manager\//, '').split(/[\s/\-?=]+/).filter(Boolean);
    return Array.from(new Set([...words, ...pathParts]));
}
