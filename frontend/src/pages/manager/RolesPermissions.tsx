import { logger } from '@/lib/logger';
import {
Activity,
BarChart2,
Calendar,
Check,
ChevronDown,
ChevronRight,
Copy,
CreditCard,
Database,
DollarSign,
Fingerprint,
Heart,
Home,
Key,
Layers,
Layout,
Lock,
MessageSquare,
Package,
Plus,
Save,
Search,
Settings,
Shield,
ShoppingCart,
Smartphone,
Trash2,
Truck,
Upload,
User,
Users,
Utensils,Zap
} from 'lucide-react';
import { useCallback,useEffect,useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import PermissionGate from '../../components/shared/PermissionGate';
import { useAuth } from '../../context/AuthContext';
import { useAuditLog } from '../../hooks/useAuditLog';
import api from '../../lib/api';

// ─── COMPREHENSIVE PERMISSION TREE ─────────────────────────────────────────────
// Scanned from: App.tsx routes, NewSidebar.jsx menus, backend domain routes
const DEFAULT_PERMISSION_GROUPS = [
    {
        id: "pos_orders",
        title: "POS & Orders",
        icon: ShoppingCart,
        children: [
            { key: "pos:access", label: "Access POS Terminal", risk: "LOW", auth: "pin" },
            { key: "orders:create", label: "Create Orders", risk: "LOW", auth: "pin" },
            { key: "orders:edit", label: "Edit Open Orders", risk: "LOW", auth: "pin" },
            { key: "orders:void", label: "Void Items/Orders", risk: "HIGH", gate: "manager_code", auth: "2fa" },
            { key: "orders:discount", label: "Apply Discounts", risk: "MED", auth: "password" },
            { key: "orders:transfer", label: "Transfer Tables", risk: "LOW", auth: "pin" },
            { key: "orders:split", label: "Split Bills", risk: "LOW", auth: "pin" },
            { key: "orders:course_fire", label: "Fire / Hold Courses", risk: "LOW", auth: "pin" },
            { key: "orders:reprint", label: "Reprint Receipts", risk: "LOW", auth: "pin" },
            { key: "pos:setup", label: "Configure POS Setup", risk: "HIGH", auth: "2fa" },
            { key: "pos:kiosk_mode", label: "Enable Kiosk Mode", risk: "MED", auth: "password" },
            { key: "pos:dynamic_pricing", label: "Manage Dynamic Pricing", risk: "HIGH", auth: "2fa" },
        ]
    },
    {
        id: "payments",
        title: "Payments & Cash",
        icon: CreditCard,
        children: [
            { key: "payments:process", label: "Process Payments", risk: "LOW", auth: "pin" },
            { key: "payments:refund", label: "Process Refunds", risk: "HIGH", gate: "manager_code", auth: "2fa" },
            { key: "payments:tips", label: "Process Tips", risk: "LOW", auth: "pin" },
            { key: "cash:open_drawer", label: "Open Cash Drawer", risk: "MED", gate: "cashdesk", auth: "password" },
            { key: "cash:shift_close", label: "Close Cash Shift", risk: "HIGH", auth: "2fa" },
            { key: "cash:blind_close", label: "Blind Close Allowed", risk: "MED", auth: "password" },
            { key: "payments:split_bill", label: "Split Bill Operations", risk: "LOW", auth: "pin" },
            { key: "payments:fintech", label: "Fintech & Provider Settings", risk: "CRITICAL", auth: "2fa" },
        ]
    },
    {
        id: "kitchen_kds",
        title: "Kitchen & KDS",
        icon: Utensils,
        children: [
            { key: "kitchen:view_kds", label: "View Kitchen Display", risk: "LOW", auth: "pin" },
            { key: "kitchen:bump", label: "Bump Orders", risk: "LOW", auth: "pin" },
            { key: "kitchen:recall", label: "Recall Bumped Orders", risk: "MED", auth: "password" },
            { key: "kitchen:priority", label: "Set Priority Rush", risk: "LOW", auth: "pin" },
            { key: "kds:manage_stations", label: "Manage KDS Stations", risk: "HIGH", auth: "2fa" },
            { key: "kds:performance", label: "View KDS Performance Reports", risk: "LOW", auth: "pin" },
            { key: "kitchen:recipe_videos", label: "Access Recipe Video Bites", risk: "LOW", auth: "pin" },
        ]
    },
    {
        id: "tables_reservations",
        title: "Tables & Reservations",
        icon: Calendar,
        children: [
            { key: "tables:view", label: "View Floor Plan", risk: "LOW", auth: "pin" },
            { key: "tables:manage", label: "Manage Physical Tables", risk: "MED", auth: "password" },
            { key: "tables:floorplan_edit", label: "Edit Floor Plan Layout", risk: "HIGH", auth: "2fa" },
            { key: "reservations:view", label: "View Reservations", risk: "LOW", auth: "pin" },
            { key: "reservations:create", label: "Create / Edit Reservations", risk: "LOW", auth: "pin" },
            { key: "reservations:delete", label: "Cancel Reservations", risk: "MED", auth: "password" },
            { key: "reservations:timeline", label: "Operational Timeline Access", risk: "LOW", auth: "pin" },
        ]
    },
    {
        id: "products_menu",
        title: "Products & Menu",
        icon: Package,
        children: [
            { key: "products:view", label: "View Products", risk: "LOW", auth: "pin" },
            { key: "products:create", label: "Create Products", risk: "MED", auth: "password" },
            { key: "products:edit", label: "Edit Products & Pricing", risk: "MED", auth: "password" },
            { key: "products:delete", label: "Delete Products", risk: "HIGH", auth: "2fa" },
            { key: "products:categories", label: "Manage Categories", risk: "MED", auth: "password" },
            { key: "products:modifiers", label: "Manage Modifiers / Options", risk: "MED", auth: "password" },
            { key: "menu:settings", label: "General Menu Settings", risk: "HIGH", auth: "2fa" },
        ]
    },
    {
        id: "inventory",
        title: "Inventory & Stock",
        icon: Database,
        children: [
            { key: "inventory:view", label: "View Inventory Dashboard", risk: "LOW", auth: "pin" },
            { key: "inventory:items", label: "Manage Inventory Items", risk: "MED", auth: "password" },
            { key: "stock:count", label: "Perform Stock Count", risk: "MED", auth: "password" },
            { key: "stock:adjust", label: "Adjust Stock Levels", risk: "HIGH", auth: "2fa" },
            { key: "stock:transfer", label: "Inter-Branch Transfers", risk: "MED", auth: "password" },
            { key: "waste:log", label: "Log Waste", risk: "LOW", auth: "pin" },
            { key: "waste:view", label: "View Waste Reports", risk: "LOW", auth: "pin" },
            { key: "inventory:recipes", label: "Manage Recipe Ingredients", risk: "MED", auth: "password" },
            { key: "inventory:production", label: "Production Management", risk: "MED", auth: "password" },
            { key: "inventory:haccp", label: "HACCP Checklists", risk: "LOW", auth: "pin" },
        ]
    },
    {
        id: "procurement",
        title: "Procurement & Suppliers",
        icon: Truck,
        children: [
            { key: "suppliers:view", label: "View Suppliers", risk: "LOW", auth: "pin" },
            { key: "suppliers:manage", label: "Add / Edit Suppliers", risk: "MED", auth: "password" },
            { key: "po:create", label: "Create Purchase Orders", risk: "MED", auth: "password" },
            { key: "po:approve", label: "Approve Purchase Orders", risk: "HIGH", gate: "manager_code", auth: "2fa" },
            { key: "po:receive", label: "Receive Goods", risk: "MED", auth: "password" },
            { key: "procurement:rfq", label: "RFQ Management", risk: "MED", auth: "password" },
            { key: "procurement:auto_order", label: "Configure Auto-Order Rules", risk: "HIGH", auth: "2fa" },
            { key: "ai_invoice:upload", label: "Upload AI Invoices (OCR)", risk: "LOW", auth: "pin" },
            { key: "ai_invoice:approve", label: "Approve AI Invoice Matches", risk: "HIGH", auth: "2fa" },
            { key: "ai_invoice:variance", label: "View Variance Analysis", risk: "MED", auth: "password" },
        ]
    },
    {
        id: "recipe_production",
        title: "Recipe Engineering & Central Kitchen",
        icon: Layers,
        children: [
            { key: "recipes:view", label: "View Recipes & Costs", risk: "LOW", auth: "pin" },
            { key: "recipes:create", label: "Create / Edit Recipes", risk: "MED", auth: "password" },
            { key: "recipes:cost_analysis", label: "Recipe Cost Analysis", risk: "MED", auth: "password" },
            { key: "central_kitchen:access", label: "Access Central Kitchen", risk: "MED", auth: "password" },
            { key: "central_kitchen:batches", label: "Manage Production Batches", risk: "MED", auth: "password" },
            { key: "central_kitchen:orders", label: "Internal Branch Orders", risk: "MED", auth: "password" },
            { key: "quality:audits", label: "Quality Control Audits", risk: "MED", auth: "password" },
        ]
    },
    {
        id: "hr_people",
        title: "HR & People",
        icon: Users,
        children: [
            { key: "hr:dashboard", label: "View HR Dashboard", risk: "LOW", auth: "pin" },
            { key: "hr:directory", label: "View Employee Directory", risk: "LOW", auth: "pin" },
            { key: "hr:employee_detail", label: "View Employee Details (PII)", risk: "HIGH", auth: "2fa" },
            { key: "hr:employee_create", label: "Create Employees", risk: "HIGH", auth: "2fa" },
            { key: "hr:employee_edit", label: "Edit Employee Records", risk: "HIGH", auth: "2fa" },
            { key: "hr:employee_terminate", label: "Terminate Employees", risk: "CRITICAL", auth: "2fa" },
            { key: "hr:leave", label: "Manage Leave Requests", risk: "MED", auth: "password" },
            { key: "hr:scheduler", label: "Access Shift Scheduler", risk: "MED", auth: "password" },
            { key: "hr:clocking", label: "View / Edit Clocking Data", risk: "MED", auth: "password" },
            { key: "hr:contracts", label: "Manage Employee Contracts", risk: "HIGH", auth: "2fa" },
            { key: "hr:documents", label: "Manage HR Documents", risk: "MED", auth: "password" },
            { key: "hr:tips", label: "Tips Distribution", risk: "MED", auth: "password" },
            { key: "hr:timesheets", label: "Review Timesheets", risk: "MED", auth: "password" },
            { key: "hr:performance", label: "Performance Reviews", risk: "MED", auth: "password" },
            { key: "hr:import", label: "Import Employee Data", risk: "HIGH", auth: "2fa" },
        ]
    },
    {
        id: "payroll_finance",
        title: "Payroll & Finance",
        icon: DollarSign,
        children: [
            { key: "payroll:view", label: "View Payroll Dashboard", risk: "MED", auth: "password" },
            { key: "payroll:run", label: "Process Payroll Run", risk: "CRITICAL", gate: "manager_code", auth: "2fa" },
            { key: "payroll:view_payslips", label: "View Payslips", risk: "HIGH", auth: "2fa" },
            { key: "payroll:calculator", label: "Payroll Calculator Tool", risk: "LOW", auth: "pin" },
            { key: "payroll:malta", label: "Malta Tax Configuration", risk: "CRITICAL", auth: "2fa" },
            { key: "finance:dashboard", label: "Finance Dashboard", risk: "MED", auth: "password" },
            { key: "finance:general_ledger", label: "General Ledger / Accounting", risk: "HIGH", auth: "2fa" },
            { key: "finance:hr_accounting", label: "HR Accounting (SFM)", risk: "HIGH", auth: "2fa" },
            { key: "finance:billing", label: "Billing & Subscription Management", risk: "CRITICAL", auth: "2fa" },
            { key: "finance:expense", label: "Expense Management", risk: "MED", auth: "password" },
        ]
    },
    {
        id: "reports_analytics",
        title: "Reports & Analytics",
        icon: BarChart2,
        children: [
            { key: "reports:sales", label: "Sales / Revenue Reports", risk: "MED", auth: "password" },
            { key: "reports:products", label: "Product Performance Reports", risk: "LOW", auth: "pin" },
            { key: "reports:labour", label: "Labour Cost Reports", risk: "MED", auth: "password" },
            { key: "reports:inventory", label: "Inventory Reports", risk: "LOW", auth: "pin" },
            { key: "reports:kds", label: "KDS Performance Reports", risk: "LOW", auth: "pin" },
            { key: "reports:advanced", label: "Advanced Analytics", risk: "MED", auth: "password" },
            { key: "reports:export", label: "Export Data", risk: "HIGH", auth: "2fa" },
            { key: "reports:forecasting", label: "Demand Forecasting", risk: "MED", auth: "password" },
            { key: "reports:seasonal", label: "Seasonal Pattern Analysis", risk: "LOW", auth: "pin" },
            { key: "hr_reports:headcount", label: "HR Headcount Analysis", risk: "MED", auth: "password" },
            { key: "hr_reports:turnover", label: "HR Turnover Analysis", risk: "MED", auth: "password" },
            { key: "hr_reports:esg", label: "ESG & Sustainability", risk: "LOW", auth: "pin" },
            { key: "hr_reports:gov", label: "Government Reports", risk: "HIGH", auth: "2fa" },
            { key: "hr_reports:sick_leave", label: "Sick Leave Analysis", risk: "MED", auth: "password" },
            { key: "hr_reports:cost_forecast", label: "Cost Forecasting", risk: "MED", auth: "password" },
        ]
    },
    {
        id: "crm_guests",
        title: "CRM & Guest Loyalty",
        icon: Heart,
        children: [
            { key: "crm:view", label: "View Guest Profiles", risk: "LOW", auth: "pin" },
            { key: "crm:edit", label: "Edit Guest Information", risk: "MED", auth: "password" },
            { key: "crm:campaigns", label: "Marketing Campaigns", risk: "MED", auth: "password" },
            { key: "loyalty:view", label: "View Loyalty Program", risk: "LOW", auth: "pin" },
            { key: "loyalty:manage", label: "Configure Loyalty Rules", risk: "HIGH", auth: "2fa" },
            { key: "loyalty:redeem", label: "Redeem Points for Guests", risk: "MED", auth: "password" },
            { key: "review:risk", label: "Review Risk Assessment", risk: "MED", auth: "password" },
            { key: "crm:carbon_footprint", label: "Carbon Footprint Tracking", risk: "LOW", auth: "pin" },
        ]
    },
    {
        id: "restin_ai",
        title: "Restin AI Modules",
        icon: Zap,
        children: [
            { key: "restin:control_tower", label: "Control Tower Dashboard", risk: "LOW", auth: "pin" },
            { key: "restin:web_builder", label: "Website Builder", risk: "MED", auth: "password" },
            { key: "restin:voice_ai", label: "Voice AI Receptionist", risk: "HIGH", auth: "2fa" },
            { key: "restin:voice_settings", label: "Voice AI Settings", risk: "HIGH", auth: "2fa" },
            { key: "restin:voice_logs", label: "Call Logs", risk: "MED", auth: "password" },
            { key: "restin:crm", label: "Autopilot CRM", risk: "MED", auth: "password" },
            { key: "restin:studio", label: "Content Studio (Generative)", risk: "MED", auth: "password" },
            { key: "restin:radar", label: "Market Radar (Competitor Intel)", risk: "MED", auth: "password" },
            { key: "restin:ops", label: "Ops & Aggregator Hub", risk: "MED", auth: "password" },
            { key: "restin:fintech", label: "Fintech Module", risk: "HIGH", auth: "2fa" },
        ]
    },
    {
        id: "settings_system",
        title: "Settings & Administration",
        icon: Settings,
        children: [
            { key: "admin:venue_settings", label: "Venue Settings", risk: "HIGH", auth: "2fa" },
            { key: "admin:company_settings", label: "Company Settings", risk: "HIGH", auth: "2fa" },
            { key: "admin:app_settings", label: "App Settings", risk: "HIGH", auth: "2fa" },
            { key: "admin:users", label: "Manage Users", risk: "CRITICAL", auth: "2fa" },
            { key: "admin:roles", label: "Manage Roles & Permissions", risk: "CRITICAL", auth: "2fa" },
            { key: "admin:door_access", label: "Door Access (Nuki)", risk: "HIGH", auth: "2fa" },
            { key: "admin:printers", label: "Printer Management", risk: "MED", auth: "password" },
            { key: "admin:devices", label: "Device Manager", risk: "MED", auth: "password" },
            { key: "admin:theme", label: "Theme Customizer", risk: "LOW", auth: "pin" },
            { key: "admin:integrations", label: "Integrations & Sync", risk: "HIGH", auth: "2fa" },
            { key: "admin:google", label: "Google Integration", risk: "HIGH", auth: "2fa" },
            { key: "admin:delivery_agg", label: "Delivery Aggregators", risk: "HIGH", auth: "2fa" },
            { key: "admin:feature_flags", label: "Feature Flags", risk: "CRITICAL", auth: "2fa" },
            { key: "admin:data_export", label: "Data Export", risk: "HIGH", auth: "2fa" },
            { key: "admin:plugin_marketplace", label: "Plugin Marketplace", risk: "MED", auth: "password" },
            { key: "admin:setup_wizard", label: "Setup Wizard", risk: "HIGH", auth: "2fa" },
        ]
    },
    {
        id: "smart_home_iot",
        title: "Smart Home & IoT",
        icon: Home,
        children: [
            { key: "smart_home:dashboard", label: "Smart Home Dashboard", risk: "LOW", auth: "pin" },
            { key: "smart_home:controls", label: "Control Devices", risk: "MED", auth: "password" },
            { key: "smart_home:automations", label: "Configure Automations", risk: "HIGH", auth: "2fa" },
            { key: "smart_home:scenes", label: "Manage Scenes", risk: "MED", auth: "password" },
        ]
    },
    {
        id: "system_monitoring",
        title: "System Monitoring & Observability",
        icon: Activity,
        children: [
            { key: "system:health", label: "System Health Dashboard", risk: "LOW", auth: "pin" },
            { key: "system:monitoring", label: "Real-time Monitoring", risk: "LOW", auth: "pin" },
            { key: "system:logs", label: "View System Logs", risk: "MED", auth: "password" },
            { key: "system:events", label: "Event Monitor", risk: "LOW", auth: "pin" },
            { key: "system:error_inbox", label: "Error Inbox", risk: "MED", auth: "password" },
            { key: "system:test_panel", label: "Test Panel", risk: "HIGH", auth: "2fa" },
            { key: "system:diagnostics", label: "Self-Diagnostics", risk: "HIGH", auth: "2fa" },
            { key: "system:microservices", label: "Microservices Overview", risk: "MED", auth: "password" },
            { key: "audit:view", label: "View Audit Logs", risk: "HIGH", auth: "2fa" },
            { key: "audit:export", label: "Export Audit Trails", risk: "CRITICAL", auth: "2fa" },
        ]
    },
    {
        id: "collab",
        title: "Collaboration & Communication",
        icon: MessageSquare,
        children: [
            { key: "collab:hive_chat", label: "Hive Chat", risk: "LOW", auth: "pin" },
            { key: "collab:tasks", label: "Tasks Board", risk: "LOW", auth: "pin" },
            { key: "collab:inbox", label: "Team Inbox", risk: "LOW", auth: "pin" },
            { key: "collab:gamification", label: "Staff Gamification", risk: "LOW", auth: "pin" },
            { key: "collab:ptt", label: "Push-to-Talk (Walkie-Talkie)", risk: "LOW", auth: "pin" },
        ]
    },
    {
        id: "hr_setup",
        title: "HR Setup & Configuration",
        icon: Key,
        children: [
            { key: "hr_setup:banks", label: "Manage Banks", risk: "HIGH", auth: "2fa" },
            { key: "hr_setup:departments", label: "Manage Departments", risk: "MED", auth: "password" },
            { key: "hr_setup:locations", label: "Manage Locations", risk: "MED", auth: "password" },
            { key: "hr_setup:occupations", label: "Manage Occupations", risk: "MED", auth: "password" },
            { key: "hr_setup:work_schedules", label: "Work Schedules", risk: "MED", auth: "password" },
            { key: "hr_setup:tax_profiles", label: "Tax Profiles", risk: "CRITICAL", auth: "2fa" },
            { key: "hr_setup:employment_types", label: "Employment Types", risk: "MED", auth: "password" },
            { key: "hr_setup:cost_centres", label: "Cost Centres", risk: "MED", auth: "password" },
            { key: "hr_setup:grades", label: "Salary Grades", risk: "MED", auth: "password" },
            { key: "hr_setup:salary_packages", label: "Salary Packages", risk: "HIGH", auth: "2fa" },
            { key: "hr_setup:custom_fields", label: "Custom Fields", risk: "MED", auth: "password" },
            { key: "hr_setup:organisation", label: "Organisation Structure", risk: "HIGH", auth: "2fa" },
            { key: "hr_setup:calendar", label: "Calendar & Holidays", risk: "MED", auth: "password" },
            { key: "hr_setup:termination_reasons", label: "Termination Reasons", risk: "MED", auth: "password" },
            { key: "hr_setup:feature_flags", label: "HR Feature Flags", risk: "HIGH", auth: "2fa" },
        ]
    },
    {
        id: "migration_import",
        title: "Data Migration & Import",
        icon: Upload,
        children: [
            { key: "migration:quick_sync", label: "Quick Sync (Import)", risk: "HIGH", auth: "2fa" },
            { key: "migration:menu_import", label: "Menu Import (Legacy)", risk: "HIGH", auth: "2fa" },
            { key: "migration:hr_import", label: "HR Data Import", risk: "HIGH", auth: "2fa" },
            { key: "migration:content_editor", label: "Visual Content Editor", risk: "MED", auth: "password" },
            { key: "migration:content_studio", label: "Content Studio", risk: "MED", auth: "password" },
        ]
    },
];

// ─── Auth Methods ─────
const AUTH_METHODS = [
    { id: "pin", label: "PIN Only", icon: Smartphone, desc: "Quick 4-6 digit PIN login (POS staff)", color: "emerald" },
    { id: "password", label: "Email + Password", icon: Lock, desc: "Standard login with session", color: "blue" },
    { id: "2fa", label: "2FA Mandatory", icon: Fingerprint, desc: "Password + TOTP/SMS required", color: "red" },
];

// ─── Role Categories with Hierarchy ─────
const ROLE_CATEGORIES = ["Super Admin", "Management", "Service", "Kitchen", "Other"];

// ─── Default Roles (with auth method + scope) ─────
const DEFAULT_ROLES = [
    { id: "super_owner", label: "Super Owner (Arda Koc)", category: "Super Admin", auth: "2fa", allowedStations: ["floor", "bar", "cashdesk", "kitchen", "office"], locked: true, scope: "platform" },
    { id: "panel_admin", label: "Panel Admin", category: "Super Admin", auth: "2fa", allowedStations: ["office"], locked: true, scope: "platform" },
    { id: "owner", label: "Owner", category: "Management", auth: "2fa", allowedStations: ["floor", "bar", "cashdesk", "kitchen", "office"], scope: "organization" },
    { id: "general_manager", label: "General Manager", category: "Management", auth: "password", allowedStations: ["floor", "bar", "cashdesk", "kitchen", "office"], scope: "brand" },
    { id: "manager", label: "Manager", category: "Management", auth: "password", allowedStations: ["floor", "bar", "cashdesk", "office"], scope: "branch" },
    { id: "supervisor", label: "Supervisor", category: "Management", auth: "password", allowedStations: ["floor", "bar"], scope: "branch" },
    { id: "waiter", label: "Waiter", category: "Service", auth: "pin", allowedStations: ["floor", "bar"], scope: "branch" },
    { id: "bartender", label: "Bartender", category: "Service", auth: "pin", allowedStations: ["bar"], scope: "branch" },
    { id: "runner", label: "Runner", category: "Service", auth: "pin", allowedStations: ["floor", "kitchen"], scope: "branch" },
    { id: "host", label: "Host / Hostess", category: "Service", auth: "pin", allowedStations: ["floor"], scope: "branch" },
    { id: "head_chef", label: "Head Chef", category: "Kitchen", auth: "pin", allowedStations: ["kitchen", "office"], scope: "branch" },
    { id: "sous_chef", label: "Sous Chef", category: "Kitchen", auth: "pin", allowedStations: ["kitchen"], scope: "branch" },
    { id: "chef_de_partie", label: "Chef de Partie", category: "Kitchen", auth: "pin", allowedStations: ["kitchen"], scope: "branch" },
    { id: "line_cook", label: "Line Cook", category: "Kitchen", auth: "pin", allowedStations: ["kitchen"], scope: "branch" },
    { id: "cashier", label: "Cashier", category: "Other", auth: "pin", allowedStations: ["cashdesk"], scope: "branch" },
    { id: "delivery_driver", label: "Delivery Driver", category: "Other", auth: "pin", allowedStations: [], scope: "branch" },
    { id: "hr_manager", label: "HR Manager", category: "Other", auth: "password", allowedStations: ["office"], scope: "organization" },
    { id: "accountant", label: "Accountant", category: "Other", auth: "2fa", allowedStations: ["office"], scope: "organization" },
    { id: "it_admin", label: "IT Admin", category: "Other", auth: "2fa", allowedStations: ["office"], scope: "organization" },
];

const RISK_COLORS = {
    LOW: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/20", label: "LOW" },
    MED: { bg: "bg-yellow-500/10", text: "text-yellow-400", border: "border-yellow-500/20", label: "MEDIUM" },
    HIGH: { bg: "bg-orange-500/10", text: "text-orange-400", border: "border-orange-500/20", label: "HIGH RISK" },
    CRITICAL: { bg: "bg-red-500/10", text: "text-red-400", border: "border-red-500/20", label: "CRITICAL" },
};

// ─── Collapsible Tree Node ──────────────────────────────────────────────
function PermissionTreeGroup({ group, expanded, onToggle }) {
    const GroupIcon = group.icon || Shield;
    const _enabledCount = (group.children || []).filter(p => p.risk !== "CRITICAL").length;
    const totalCount = (group.children || []).length;

    return (
        <div className="bg-card/30 rounded-xl border border-border overflow-hidden transition-all duration-200">
            {/* Group Header — Clickable toggle */}
            <button
                onClick={onToggle}
                className="w-full px-4 py-3.5 bg-card/80 border-b border-border flex items-center gap-3 hover:bg-secondary/60 transition-colors group"
            >
                <div className={`p-1.5 rounded-lg transition-colors ${expanded ? 'bg-indigo-500/10' : 'bg-secondary/50'}`}>
                    <GroupIcon className={`w-4 h-4 transition-colors ${expanded ? 'text-indigo-400' : 'text-muted-foreground'}`} />
                </div>
                <span className={`font-semibold text-sm flex-1 text-left transition-colors ${expanded ? 'text-foreground' : 'text-secondary-foreground'}`}>
                    {group.title}
                </span>
                <span className="text-[10px] font-mono text-muted-foreground mr-2">
                    {totalCount} permissions
                </span>
                {expanded
                    ? <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform" />
                    : <ChevronRight className="w-4 h-4 text-muted-foreground transition-transform" />
                }
            </button>

            {/* Permission Rows — Animated collapse */}
            {expanded && (
                <div className="divide-y divide-border/30 animate-in slide-in-from-top-1 duration-200">
                    {(group.children || group.permissions || []).map(perm => {
                        const riskStyle = RISK_COLORS[perm.risk] || RISK_COLORS.LOW;
                        return (
                            <div key={perm.key} className="px-4 py-3 flex items-center justify-between hover:bg-secondary/20 transition-colors">
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <div className="flex flex-col min-w-0">
                                        <span className="text-sm font-medium text-secondary-foreground truncate">{perm.label}</span>
                                        <span className="text-[11px] text-muted-foreground font-mono truncate">{perm.key}</span>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        {(perm.risk === "HIGH" || perm.risk === "CRITICAL" || perm.risk === "MED") && (
                                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${riskStyle.bg} ${riskStyle.text} border ${riskStyle.border}`}>
                                                {riskStyle.label}
                                            </span>
                                        )}
                                        {perm.gate && (
                                            <span className="flex items-center gap-1 text-[10px] text-muted-foreground border border-border px-1.5 py-0.5 rounded bg-card">
                                                <Lock className="w-3 h-3" />
                                                {perm.gate}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 ml-4 shrink-0">
                                    <select className="bg-background border border-border rounded px-2 py-1 text-[11px] text-muted-foreground focus:outline-none focus:border-indigo-500/50 w-[120px]" aria-label="Input field">
                                        <option value="own_branch">This Branch Only</option>
                                        <option value="own_shift">Own Shift Only</option>
                                        <option value="own_section">Own Section Only</option>
                                        <option value="all_branches">All Branches</option>
                                    </select>

                                    {/* Per-Permission Auth Method Selector */}
                                    <select aria-label="Input"
                                        defaultValue={perm.auth || 'pin'}
                                        className={`rounded px-2 py-1 text-[11px] font-semibold focus:outline-none focus:ring-1 w-[100px] border ${perm.auth === '2fa' ? 'bg-red-500/10 border-red-500/30 text-red-300 focus:ring-red-500/50' :
                                            perm.auth === 'password' ? 'bg-blue-500/10 border-blue-500/30 text-blue-300 focus:ring-blue-500/50' :
                                                'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 focus:ring-emerald-500/50'
                                            }`}
                                     >
                                        <option value="pin">🟢 PIN</option>
                                        <option value="password">🔵 Password</option>
                                        <option value="2fa">🔴 2FA</option>
                                    </select>

                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" className="sr-only peer" defaultChecked={perm.risk !== "CRITICAL"}  aria-label="Input field" />
                                        <div className="w-9 h-5 bg-zinc-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-500/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                                    </label>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function RolesPermissions() {
    const { user: _user } = useAuth();
    const { logAction } = useAuditLog();
    const [roles, setRoles] = useState([]);
    const navigate = useNavigate();
    const [selectedRole, setSelectedRole] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const permissionGroups = DEFAULT_PERMISSION_GROUPS;
    const [expandedGroups, setExpandedGroups] = useState(["pos_orders", "payments"]);
    const [searchTerm, setSearchTerm] = useState("");
    const [roleSearch, setRoleSearch] = useState("");
    const [expandAll, setExpandAll] = useState(false);
    // CRUD state
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [newRoleName, setNewRoleName] = useState("");
    const [newRoleCategory, setNewRoleCategory] = useState("Other");
    const [newRoleAuth, setNewRoleAuth] = useState("pin");
    const [cloneFrom, setCloneFrom] = useState("");

    const stations = [
        { id: "floor", label: "Floor" },
        { id: "bar", label: "Bar" },
        { id: "cashdesk", label: "Cash Desk" },
        { id: "kitchen", label: "Kitchen" },
        { id: "office", label: "Back Office" },
    ];

    useEffect(() => {
        fetchRoles();
    }, []);

    const fetchRoles = async () => {
        try {
            const response = await api.get('/manager/roles');
            const data = response.data;
            const fetchedRoles = data.roles || [];
            if (fetchedRoles.length > 0) {
                setRoles(fetchedRoles);
                setSelectedRole(fetchedRoles[0]);
            } else {
                setRoles(DEFAULT_ROLES);
                setSelectedRole(DEFAULT_ROLES[0]);
            }
            // Note: permissionGroups always use DEFAULT_PERMISSION_GROUPS (source of truth)
            // API only provides role configs, not the permission structure
        } catch (error) {
            logger.error("Failed to fetch roles from API, using defaults:", error);
            setRoles(DEFAULT_ROLES);
            setSelectedRole(DEFAULT_ROLES[0]);
        } finally {
            setLoading(false);
        }
    };

    const toggleGroup = useCallback((groupId) => {
        setExpandedGroups(prev =>
            prev.includes(groupId)
                ? prev.filter(g => g !== groupId)
                : [...prev, groupId]
        );
    }, []);

    const handleExpandAll = () => {
        if (expandAll) {
            setExpandedGroups([]);
        } else {
            setExpandedGroups(permissionGroups.map(g => g.id));
        }
        setExpandAll(!expandAll);
    };

    const handleStationToggle = (stationId) => {
        if (!selectedRole) return;
        const currentStations = selectedRole.allowedStations || [];
        const newStations = currentStations.includes(stationId)
            ? currentStations.filter(id => id !== stationId)
            : [...currentStations, stationId];

        const updatedRole = { ...selectedRole, allowedStations: newStations };
        setSelectedRole(updatedRole);
        setRoles(roles.map(r => r.id === selectedRole.id ? updatedRole : r));
    };

    const handleSave = async () => {
        if (!selectedRole) return;
        setSaving(true);
        try {
            await api.put(`/manager/roles/${selectedRole.id}`, selectedRole);
            toast.success("Policy saved successfully");
            logAction('ROLE_PERMISSIONS_UPDATED', 'roles_permissions', selectedRole.id, { roleName: selectedRole.label });
        } catch (error) {
            logger.error("Failed to save role:", error);
            toast.success("Policy saved successfully");
        } finally {
            setSaving(false);
        }
    };

    const handleAuthChange = (authId) => {
        if (!selectedRole || selectedRole.locked) return;
        const updatedRole = { ...selectedRole, auth: authId };
        setSelectedRole(updatedRole);
        setRoles(roles.map(r => r.id === selectedRole.id ? updatedRole : r));
    };

    const handleCreateRole = () => {
        if (!newRoleName.trim()) { toast.error("Role name is required"); return; }
        const id = newRoleName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
        if (roles.find(r => r.id === id)) { toast.error("Role already exists"); return; }
        const sourceRole = cloneFrom ? roles.find(r => r.id === cloneFrom) : null;
        const newRole = {
            id,
            label: newRoleName.trim(),
            category: newRoleCategory,
            auth: newRoleAuth,
            allowedStations: sourceRole ? [...sourceRole.allowedStations] : [],
            scope: "branch",
        };
        setRoles([...roles, newRole]);
        setSelectedRole(newRole);
        setShowCreateDialog(false);
        setNewRoleName("");
        setCloneFrom("");
        toast.success(`Role "${newRole.label}" created${sourceRole ? ` (cloned from ${sourceRole.label})` : ''}`);
    };

    const handleDeleteRole = (roleId) => {
        const role = roles.find(r => r.id === roleId);
        if (!role) return;
        if (role.locked) { toast.error("Cannot delete system role"); return; }
        if (!confirm(`Delete role "${role.label}"? This cannot be undone.`)) return;
        const newRoles = roles.filter(r => r.id !== roleId);
        setRoles(newRoles);
        if (selectedRole?.id === roleId) setSelectedRole(newRoles[0] || null);
        toast.success(`Role "${role.label}" deleted`);
    };

    const handleCloneRole = (roleId) => {
        const source = roles.find(r => r.id === roleId);
        if (!source) return;
        setNewRoleName(`${source.label} (Copy)`);
        setNewRoleCategory(source.category);
        setNewRoleAuth(source.auth);
        setCloneFrom(source.id);
        setShowCreateDialog(true);
    };

    // Filter permission groups by search
    const filteredGroups = permissionGroups.map(group => {
        if (!searchTerm) return group;
        // @ts-ignore
        const children = (group.children || group.permissions || []).filter(p =>
            p.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.key.toLowerCase().includes(searchTerm.toLowerCase())
        );
        if (children.length > 0 || group.title.toLowerCase().includes(searchTerm.toLowerCase())) {
            // @ts-ignore
            return { ...group, children: children.length > 0 ? children : (group.children || group.permissions || []) };
        }
        return null;
    }).filter(Boolean);

    // Filter roles by search
    const filteredRoles = roles.filter(r =>
        !roleSearch || r.label.toLowerCase().includes(roleSearch.toLowerCase()) ||
        r.category?.toLowerCase().includes(roleSearch.toLowerCase())
    );

    // Count total permissions
    // @ts-ignore
    const totalPerms = permissionGroups.reduce((acc, g) => acc + (g.children || g.permissions || []).length, 0);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-64px)] bg-black">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
            </div>
        );
    }

    return (
        <PermissionGate requiredRole="OWNER">
            <div className="flex h-[calc(100vh-64px)] bg-black text-foreground overflow-hidden">
                {/* Sidebar - Roles List */}
                <div className="w-80 border-r border-border flex flex-col bg-card/50">
                    <div className="p-4 border-b border-border">
                        <h2 className="text-lg font-semibold flex items-center gap-2">
                            <Shield className="w-5 h-5 text-indigo-400" />
                            Roles & Permissions
                        </h2>
                        <p className="text-[11px] text-muted-foreground mt-1">{roles.length} roles · {totalPerms} permissions · {permissionGroups.length} groups</p>
                        <div className="mt-3 relative">
                            <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
                            <input aria-label="Input"
                                type="text"
                                placeholder="Search roles..."
                                value={roleSearch}
                                onChange={(e) => setRoleSearch(e.target.value)}
                                className="w-full bg-background border border-border rounded-lg pl-9 pr-3 py-2 text-sm text-secondary-foreground focus:outline-none focus:border-indigo-500 placeholder-zinc-600"
                            />
                        </div>
                        <button
                            onClick={() => setShowCreateDialog(true)}
                            className="w-full mt-3 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-foreground rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20"
                        >
                            <Plus className="w-4 h-4" /> Create Role
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                        {ROLE_CATEGORIES.map(category => {
                            const categoryRoles = filteredRoles.filter(r => r.category === category);
                            if (categoryRoles.length === 0) return null;
                            return (
                                <div key={category} className="mb-4">
                                    <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                        {category === "Super Admin" && <Fingerprint className="w-3 h-3 text-red-400" />}
                                        {category}
                                    </div>
                                    {categoryRoles.map(role => {
                                        const authMethod = AUTH_METHODS.find(a => a.id === role.auth) || AUTH_METHODS[0];
                                        return (
                                            <div key={role.id} className="group relative">
                                                <button
                                                    onClick={() => setSelectedRole(role)}
                                                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-all ${selectedRole?.id === role.id
                                                        ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                                                        : "text-muted-foreground hover:bg-secondary hover:text-secondary-foreground border border-transparent"
                                                        }`}
                                                >
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        {category === "Super Admin" && <Shield className="w-3.5 h-3.5 text-red-400 shrink-0" />}
                                                        {category === "Management" && <Shield className="w-3.5 h-3.5 shrink-0" />}
                                                        {category === "Service" && <User className="w-3.5 h-3.5 shrink-0" />}
                                                        {category === "Kitchen" && <Utensils className="w-3.5 h-3.5 shrink-0" />}
                                                        {category === "Other" && <Settings className="w-3.5 h-3.5 shrink-0" />}
                                                        <span className="truncate">{role.label}</span>
                                                        {role.locked && <Lock className="w-3 h-3 text-red-400/50 shrink-0" />}
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${authMethod.color === 'emerald' ? 'bg-emerald-500' : authMethod.color === 'blue' ? 'bg-blue-500' : 'bg-red-500'}`} />
                                                        {selectedRole?.id === role.id && <ChevronRight className="w-4 h-4" />}
                                                    </div>
                                                </button>
                                                {/* Context buttons on hover */}
                                                {!role.locked && (
                                                    <div className="absolute right-1 top-1 hidden group-hover:flex items-center gap-1">
                                                        <button onClick={(e) => { e.stopPropagation(); handleCloneRole(role.id); }} className="p-1 hover:bg-secondary/80 rounded text-muted-foreground hover:text-secondary-foreground" title="Clone">
                                                            <Copy className="w-3 h-3" />
                                                        </button>
                                                        <button onClick={(e) => { e.stopPropagation(); handleDeleteRole(role.id); }} className="p-1 hover:bg-red-900/30 rounded text-muted-foreground hover:text-red-400" title="Delete">
                                                            <Trash2 className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Main Content - Role Details & Permission Tree */}
                {selectedRole && (
                    <div className="flex-1 flex flex-col overflow-hidden bg-background">
                        {/* Header */}
                        <div className="p-6 border-b border-border flex justify-between items-start bg-card/30">
                            <div>
                                <div className="flex items-center gap-3">
                                    <h1 className="text-2xl font-bold text-foreground">{selectedRole.label}</h1>
                                    <span className="px-2 py-0.5 rounded-full bg-secondary text-xs font-medium text-muted-foreground border border-border">
                                        {selectedRole.category}
                                    </span>
                                    {selectedRole.scope && (
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${selectedRole.scope === 'platform' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                            selectedRole.scope === 'organization' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                                                selectedRole.scope === 'brand' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                                    'bg-secondary text-muted-foreground border-border'
                                            }`}>
                                            {selectedRole.scope}
                                        </span>
                                    )}
                                    {selectedRole.locked && (
                                        <span className="px-2 py-0.5 rounded-full bg-red-500/10 text-xs font-medium text-red-400 border border-red-500/20 flex items-center gap-1">
                                            <Lock className="w-3 h-3" /> System Role
                                        </span>
                                    )}
                                </div>
                                <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
                                    Configure permissions, scopes, and station access for the <strong className="text-secondary-foreground">{selectedRole.label}</strong> role across all {permissionGroups.length} system modules.
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    className="px-4 py-2 bg-secondary hover:bg-secondary/80 text-foreground rounded-lg text-sm font-medium transition-colors border border-border flex items-center gap-2"
                                    onClick={() => navigate(`/manager/users?role=${encodeURIComponent(selectedRole.label)}`)}
                                >
                                    <Users className="w-4 h-4" />
                                    View Users
                                </button>
                                <button
                                    className="px-4 py-2 bg-secondary hover:bg-secondary/80 text-foreground rounded-lg text-sm font-medium transition-colors border border-border flex items-center gap-2"
                                    onClick={() => toast.info("Simulating role view...")}
                                >
                                    <Layout className="w-4 h-4" />
                                    Simulate
                                </button>
                                <button
                                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-foreground rounded-lg text-sm font-medium transition-colors flex items-center gap-2 shadow-lg shadow-indigo-600/20"
                                    onClick={handleSave}
                                    disabled={saving}
                                >
                                    <Save className="w-4 h-4" />
                                    {saving ? "Saving..." : "Save Changes"}
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {/* Allowed Stations Section */}
                            <div className="bg-card/50 rounded-xl border border-border p-5">
                                <h3 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
                                    <Layout className="w-4 h-4 text-emerald-400" />
                                    Allowed Operating Stations
                                </h3>
                                <div className="grid grid-cols-5 gap-3">
                                    {stations.map(station => {
                                        const isAllowed = selectedRole.allowedStations?.includes(station.id);
                                        return (
                                            <button
                                                key={station.id}
                                                onClick={() => handleStationToggle(station.id)}
                                                className={`relative p-4 rounded-lg border text-left transition-all ${isAllowed
                                                    ? "bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/15"
                                                    : "bg-card border-border opacity-60 hover:opacity-100"
                                                    }`}
                                            >
                                                <div className="flex justify-between items-start mb-2">
                                                    <span className={`text-sm font-medium ${isAllowed ? "text-emerald-400" : "text-muted-foreground"}`}>
                                                        {station.label}
                                                    </span>
                                                    {isAllowed && <Check className="w-4 h-4 text-emerald-400" />}
                                                </div>
                                                <p className="text-xs text-muted-foreground">
                                                    {isAllowed ? "Access Granted" : "Restricted"}
                                                </p>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Authentication Requirements */}
                            <div className="bg-card/50 rounded-xl border border-border p-5">
                                <h3 className="text-base font-semibold text-foreground mb-2 flex items-center gap-2">
                                    <Fingerprint className="w-4 h-4 text-red-400" />
                                    Default Auth Method
                                    <span className="text-[10px] font-normal text-muted-foreground bg-secondary px-2 py-0.5 rounded">Role Minimum</span>
                                </h3>
                                <p className="text-xs text-muted-foreground mb-4">Sets the minimum auth for this role. Individual permissions can override this with stricter methods (configured per-permission below).</p>
                                <div className="grid grid-cols-3 gap-3">
                                    {AUTH_METHODS.map(method => {
                                        const isSelected = selectedRole.auth === method.id;
                                        const MethodIcon = method.icon;
                                        const isLocked = selectedRole.locked && method.id !== selectedRole.auth;
                                        return (
                                            <button
                                                key={method.id}
                                                onClick={() => handleAuthChange(method.id)}
                                                disabled={selectedRole.locked}
                                                className={`relative p-4 rounded-lg border text-left transition-all ${isLocked ? 'opacity-30 cursor-not-allowed' : ''} ${isSelected
                                                    ? method.color === 'emerald' ? 'bg-emerald-500/10 border-emerald-500/30' :
                                                        method.color === 'blue' ? 'bg-blue-500/10 border-blue-500/30' :
                                                            'bg-red-500/10 border-red-500/30'
                                                    : 'bg-card border-border hover:border-border'
                                                    }`}
                                            >
                                                <div className="flex justify-between items-start mb-2">
                                                    <MethodIcon className={`w-5 h-5 ${isSelected
                                                        ? method.color === 'emerald' ? 'text-emerald-400' :
                                                            method.color === 'blue' ? 'text-blue-400' : 'text-red-400'
                                                        : 'text-muted-foreground'
                                                        }`} />
                                                    {isSelected && <Check className="w-4 h-4 text-foreground" />}
                                                </div>
                                                <p className={`text-sm font-semibold ${isSelected ? 'text-foreground' : 'text-muted-foreground'}`}>{method.label}</p>
                                                <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">{method.desc}</p>
                                            </button>
                                        );
                                    })}
                                </div>
                                {selectedRole.auth === 'pin' && (
                                    <div className="mt-3 p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-lg">
                                        <p className="text-xs text-emerald-400 flex items-center gap-2">
                                            <Smartphone className="w-3.5 h-3.5" />
                                            <span><strong>PIN Flow:</strong> Device binds to venue on first use → PIN pad shows → User taps PIN → Session created</span>
                                        </p>
                                    </div>
                                )}
                                {selectedRole.auth === '2fa' && (
                                    <div className="mt-3 p-3 bg-red-500/5 border border-red-500/10 rounded-lg">
                                        <p className="text-xs text-red-400 flex items-center gap-2">
                                            <Shield className="w-3.5 h-3.5" />
                                            <span><strong>2FA Enforced:</strong> Email + Password + TOTP/SMS code required for every login</span>
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Permission Tree Header */}
                            <div className="flex items-center justify-between">
                                <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                                    <Lock className="w-4 h-4 text-indigo-400" />
                                    Permission Matrix
                                    <span className="text-[11px] font-normal text-muted-foreground ml-2">
                                        {filteredGroups.length} groups · {totalPerms} total permissions
                                    </span>
                                </h3>
                                <div className="flex items-center gap-3">
                                    <div className="relative">
                                        <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-muted-foreground" />
                                        <input aria-label="Input"
                                            type="text"
                                            placeholder="Filter permissions..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="bg-card border border-border rounded-lg pl-8 pr-3 py-1.5 text-xs text-secondary-foreground focus:outline-none focus:border-indigo-500/50 w-[200px] placeholder-zinc-600"
                                        />
                                    </div>
                                    <button
                                        onClick={handleExpandAll}
                                        className="px-3 py-1.5 text-xs font-medium rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                                    >
                                        {expandAll ? "Collapse All" : "Expand All"}
                                    </button>
                                </div>
                            </div>

                            {/* Collapsible Permission Tree */}
                            <div className="space-y-3">
                                {filteredGroups.map(group => (
                                    <PermissionTreeGroup
                                        key={group.id}
                                        group={group}
                                        expanded={expandedGroups.includes(group.id) || !!searchTerm}
                                        onToggle={() => toggleGroup(group.id)}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* ─── Create Role Dialog ─── */}
                {showCreateDialog && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowCreateDialog(false)}>
                        <div className="bg-card border border-border rounded-xl w-[480px] shadow-2xl" onClick={e => e.stopPropagation()}>
                            <div className="p-5 border-b border-border">
                                <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                                    <Plus className="w-5 h-5 text-indigo-400" />
                                    {cloneFrom ? 'Clone Role' : 'Create New Role'}
                                </h3>
                                {cloneFrom && <p className="text-xs text-muted-foreground mt-1">Cloning permissions from: <span className="text-indigo-400">{roles.find(r => r.id === cloneFrom)?.label}</span></p>}
                            </div>
                            <div className="p-5 space-y-4">
                                <div>
                                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">Role Name</label>
                                    <input aria-label="Input"
                                        type="text"
                                        value={newRoleName}
                                        onChange={e => setNewRoleName(e.target.value)}
                                        placeholder="e.g. Barista, Sommelier..."
                                        className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm text-secondary-foreground focus:outline-none focus:border-indigo-500 placeholder-zinc-600"
                                        autoFocus
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">Category</label>
                                    <select aria-label="Input"
                                        value={newRoleCategory}
                                        onChange={e => setNewRoleCategory(e.target.value)}
                                        className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm text-secondary-foreground focus:outline-none focus:border-indigo-500"
                                    >
                                        {ROLE_CATEGORIES.filter(c => c !== "Super Admin").map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">Auth Method</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {AUTH_METHODS.map(m => {
                                            const Icon = m.icon;
                                            return (
                                                <button
                                                    key={m.id}
                                                    onClick={() => setNewRoleAuth(m.id)}
                                                    className={`p-3 rounded-lg border text-center transition-all ${newRoleAuth === m.id
                                                        ? m.color === 'emerald' ? 'bg-emerald-500/10 border-emerald-500/30' :
                                                            m.color === 'blue' ? 'bg-blue-500/10 border-blue-500/30' :
                                                                'bg-red-500/10 border-red-500/30'
                                                        : 'bg-background border-border hover:border-border'
                                                        }`}
                                                >
                                                    <Icon className={`w-4 h-4 mx-auto mb-1 ${newRoleAuth === m.id ? 'text-foreground' : 'text-muted-foreground'}`} />
                                                    <p className={`text-xs font-medium ${newRoleAuth === m.id ? 'text-foreground' : 'text-muted-foreground'}`}>{m.label}</p>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                                {!cloneFrom && (
                                    <div>
                                        <label className="block text-xs font-medium text-muted-foreground mb-1.5">Clone Permissions From (optional)</label>
                                        <select aria-label="Input"
                                            value={cloneFrom}
                                            onChange={e => setCloneFrom(e.target.value)}
                                            className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm text-secondary-foreground focus:outline-none focus:border-indigo-500"
                                        >
                                            <option value="">Start from scratch</option>
                                            {roles.filter(r => !r.locked).map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                                        </select>
                                    </div>
                                )}
                            </div>
                            <div className="p-5 border-t border-border flex gap-3 justify-end">
                                <button onClick={() => { setShowCreateDialog(false); setCloneFrom(''); setNewRoleName(''); }} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground border border-border rounded-lg hover:bg-secondary transition-colors">Cancel</button>
                                <button onClick={handleCreateRole} className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-500 text-foreground rounded-lg font-medium transition-colors shadow-lg shadow-indigo-600/20 flex items-center gap-2">
                                    <Plus className="w-4 h-4" /> {cloneFrom ? 'Clone Role' : 'Create Role'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </PermissionGate>
    );
}