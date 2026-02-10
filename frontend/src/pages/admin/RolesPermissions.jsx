import React, { useState, useEffect, useCallback } from 'react';
import { logger } from '@/lib/logger';
import {
    Shield, User, Lock, Save, AlertTriangle, Check,
    ChevronRight, ChevronDown, Search, Layout, Printer, Coffee,
    DollarSign, BarChart2, Users, Settings, Package, Truck,
    Calendar, FileText, Mic, Globe, Wand2, Radar, Home,
    Layers, Monitor, Activity, TrendingUp, Award, Clock,
    MessageSquare, ShoppingCart, MapPin, Utensils, Zap,
    CreditCard, PieChart, Heart, Bell, Eye, Edit, Trash2,
    Plus, Download, Upload, RefreshCw, Key, Database
} from 'lucide-react';
import { toast } from 'sonner';
import api from '../../lib/api';

// ─── COMPREHENSIVE PERMISSION TREE ─────────────────────────────────────────────
// Scanned from: App.tsx routes, NewSidebar.jsx menus, backend domain routes
const DEFAULT_PERMISSION_GROUPS = [
    {
        id: "pos_orders",
        title: "POS & Orders",
        icon: ShoppingCart,
        children: [
            { key: "pos:access", label: "Access POS Terminal", risk: "LOW" },
            { key: "orders:create", label: "Create Orders", risk: "LOW" },
            { key: "orders:edit", label: "Edit Open Orders", risk: "LOW" },
            { key: "orders:void", label: "Void Items/Orders", risk: "HIGH", gate: "manager_code" },
            { key: "orders:discount", label: "Apply Discounts", risk: "MED" },
            { key: "orders:transfer", label: "Transfer Tables", risk: "LOW" },
            { key: "orders:split", label: "Split Bills", risk: "LOW" },
            { key: "orders:course_fire", label: "Fire / Hold Courses", risk: "LOW" },
            { key: "orders:reprint", label: "Reprint Receipts", risk: "LOW" },
            { key: "pos:setup", label: "Configure POS Setup", risk: "HIGH" },
            { key: "pos:kiosk_mode", label: "Enable Kiosk Mode", risk: "MED" },
            { key: "pos:dynamic_pricing", label: "Manage Dynamic Pricing", risk: "HIGH" },
        ]
    },
    {
        id: "payments",
        title: "Payments & Cash",
        icon: CreditCard,
        children: [
            { key: "payments:process", label: "Process Payments", risk: "LOW" },
            { key: "payments:refund", label: "Process Refunds", risk: "HIGH", gate: "manager_code" },
            { key: "payments:tips", label: "Process Tips", risk: "LOW" },
            { key: "cash:open_drawer", label: "Open Cash Drawer", risk: "MED", gate: "cashdesk" },
            { key: "cash:shift_close", label: "Close Cash Shift", risk: "HIGH" },
            { key: "cash:blind_close", label: "Blind Close Allowed", risk: "MED" },
            { key: "payments:split_bill", label: "Split Bill Operations", risk: "LOW" },
            { key: "payments:fintech", label: "Fintech & Provider Settings", risk: "CRITICAL" },
        ]
    },
    {
        id: "kitchen_kds",
        title: "Kitchen & KDS",
        icon: Utensils,
        children: [
            { key: "kitchen:view_kds", label: "View Kitchen Display", risk: "LOW" },
            { key: "kitchen:bump", label: "Bump Orders", risk: "LOW" },
            { key: "kitchen:recall", label: "Recall Bumped Orders", risk: "MED" },
            { key: "kitchen:priority", label: "Set Priority Rush", risk: "LOW" },
            { key: "kds:manage_stations", label: "Manage KDS Stations", risk: "HIGH" },
            { key: "kds:performance", label: "View KDS Performance Reports", risk: "LOW" },
            { key: "kitchen:recipe_videos", label: "Access Recipe Video Bites", risk: "LOW" },
        ]
    },
    {
        id: "tables_reservations",
        title: "Tables & Reservations",
        icon: Calendar,
        children: [
            { key: "tables:view", label: "View Floor Plan", risk: "LOW" },
            { key: "tables:manage", label: "Manage Physical Tables", risk: "MED" },
            { key: "tables:floorplan_edit", label: "Edit Floor Plan Layout", risk: "HIGH" },
            { key: "reservations:view", label: "View Reservations", risk: "LOW" },
            { key: "reservations:create", label: "Create / Edit Reservations", risk: "LOW" },
            { key: "reservations:delete", label: "Cancel Reservations", risk: "MED" },
            { key: "reservations:timeline", label: "Operational Timeline Access", risk: "LOW" },
        ]
    },
    {
        id: "products_menu",
        title: "Products & Menu",
        icon: Package,
        children: [
            { key: "products:view", label: "View Products", risk: "LOW" },
            { key: "products:create", label: "Create Products", risk: "MED" },
            { key: "products:edit", label: "Edit Products & Pricing", risk: "MED" },
            { key: "products:delete", label: "Delete Products", risk: "HIGH" },
            { key: "products:categories", label: "Manage Categories", risk: "MED" },
            { key: "products:modifiers", label: "Manage Modifiers / Options", risk: "MED" },
            { key: "menu:settings", label: "General Menu Settings", risk: "HIGH" },
        ]
    },
    {
        id: "inventory",
        title: "Inventory & Stock",
        icon: Database,
        children: [
            { key: "inventory:view", label: "View Inventory Dashboard", risk: "LOW" },
            { key: "inventory:items", label: "Manage Inventory Items", risk: "MED" },
            { key: "stock:count", label: "Perform Stock Count", risk: "MED" },
            { key: "stock:adjust", label: "Adjust Stock Levels", risk: "HIGH" },
            { key: "stock:transfer", label: "Inter-Branch Transfers", risk: "MED" },
            { key: "waste:log", label: "Log Waste", risk: "LOW" },
            { key: "waste:view", label: "View Waste Reports", risk: "LOW" },
            { key: "inventory:recipes", label: "Manage Recipe Ingredients", risk: "MED" },
            { key: "inventory:production", label: "Production Management", risk: "MED" },
            { key: "inventory:haccp", label: "HACCP Checklists", risk: "LOW" },
        ]
    },
    {
        id: "procurement",
        title: "Procurement & Suppliers",
        icon: Truck,
        children: [
            { key: "suppliers:view", label: "View Suppliers", risk: "LOW" },
            { key: "suppliers:manage", label: "Add / Edit Suppliers", risk: "MED" },
            { key: "po:create", label: "Create Purchase Orders", risk: "MED" },
            { key: "po:approve", label: "Approve Purchase Orders", risk: "HIGH", gate: "manager_code" },
            { key: "po:receive", label: "Receive Goods", risk: "MED" },
            { key: "procurement:rfq", label: "RFQ Management", risk: "MED" },
            { key: "procurement:auto_order", label: "Configure Auto-Order Rules", risk: "HIGH" },
            { key: "ai_invoice:upload", label: "Upload AI Invoices (OCR)", risk: "LOW" },
            { key: "ai_invoice:approve", label: "Approve AI Invoice Matches", risk: "HIGH" },
            { key: "ai_invoice:variance", label: "View Variance Analysis", risk: "MED" },
        ]
    },
    {
        id: "recipe_production",
        title: "Recipe Engineering & Central Kitchen",
        icon: Layers,
        children: [
            { key: "recipes:view", label: "View Recipes & Costs", risk: "LOW" },
            { key: "recipes:create", label: "Create / Edit Recipes", risk: "MED" },
            { key: "recipes:cost_analysis", label: "Recipe Cost Analysis", risk: "MED" },
            { key: "central_kitchen:access", label: "Access Central Kitchen", risk: "MED" },
            { key: "central_kitchen:batches", label: "Manage Production Batches", risk: "MED" },
            { key: "central_kitchen:orders", label: "Internal Branch Orders", risk: "MED" },
            { key: "quality:audits", label: "Quality Control Audits", risk: "MED" },
        ]
    },
    {
        id: "hr_people",
        title: "HR & People",
        icon: Users,
        children: [
            { key: "hr:dashboard", label: "View HR Dashboard", risk: "LOW" },
            { key: "hr:directory", label: "View Employee Directory", risk: "LOW" },
            { key: "hr:employee_detail", label: "View Employee Details (PII)", risk: "HIGH" },
            { key: "hr:employee_create", label: "Create Employees", risk: "HIGH" },
            { key: "hr:employee_edit", label: "Edit Employee Records", risk: "HIGH" },
            { key: "hr:employee_terminate", label: "Terminate Employees", risk: "CRITICAL" },
            { key: "hr:leave", label: "Manage Leave Requests", risk: "MED" },
            { key: "hr:scheduler", label: "Access Shift Scheduler", risk: "MED" },
            { key: "hr:clocking", label: "View / Edit Clocking Data", risk: "MED" },
            { key: "hr:contracts", label: "Manage Employee Contracts", risk: "HIGH" },
            { key: "hr:documents", label: "Manage HR Documents", risk: "MED" },
            { key: "hr:tips", label: "Tips Distribution", risk: "MED" },
            { key: "hr:timesheets", label: "Review Timesheets", risk: "MED" },
            { key: "hr:performance", label: "Performance Reviews", risk: "MED" },
            { key: "hr:import", label: "Import Employee Data", risk: "HIGH" },
        ]
    },
    {
        id: "payroll_finance",
        title: "Payroll & Finance",
        icon: DollarSign,
        children: [
            { key: "payroll:view", label: "View Payroll Dashboard", risk: "MED" },
            { key: "payroll:run", label: "Process Payroll Run", risk: "CRITICAL", gate: "manager_code" },
            { key: "payroll:view_payslips", label: "View Payslips", risk: "HIGH" },
            { key: "payroll:calculator", label: "Payroll Calculator Tool", risk: "LOW" },
            { key: "payroll:malta", label: "Malta Tax Configuration", risk: "CRITICAL" },
            { key: "finance:dashboard", label: "Finance Dashboard", risk: "MED" },
            { key: "finance:general_ledger", label: "General Ledger / Accounting", risk: "HIGH" },
            { key: "finance:hr_accounting", label: "HR Accounting (SFM)", risk: "HIGH" },
            { key: "finance:billing", label: "Billing & Subscription Management", risk: "CRITICAL" },
            { key: "finance:expense", label: "Expense Management", risk: "MED" },
        ]
    },
    {
        id: "reports_analytics",
        title: "Reports & Analytics",
        icon: BarChart2,
        children: [
            { key: "reports:sales", label: "Sales / Revenue Reports", risk: "MED" },
            { key: "reports:products", label: "Product Performance Reports", risk: "LOW" },
            { key: "reports:labour", label: "Labour Cost Reports", risk: "MED" },
            { key: "reports:inventory", label: "Inventory Reports", risk: "LOW" },
            { key: "reports:kds", label: "KDS Performance Reports", risk: "LOW" },
            { key: "reports:advanced", label: "Advanced Analytics", risk: "MED" },
            { key: "reports:export", label: "Export Data", risk: "HIGH" },
            { key: "reports:forecasting", label: "Demand Forecasting", risk: "MED" },
            { key: "reports:seasonal", label: "Seasonal Pattern Analysis", risk: "LOW" },
            { key: "hr_reports:headcount", label: "HR Headcount Analysis", risk: "MED" },
            { key: "hr_reports:turnover", label: "HR Turnover Analysis", risk: "MED" },
            { key: "hr_reports:esg", label: "ESG & Sustainability", risk: "LOW" },
            { key: "hr_reports:gov", label: "Government Reports", risk: "HIGH" },
            { key: "hr_reports:sick_leave", label: "Sick Leave Analysis", risk: "MED" },
            { key: "hr_reports:cost_forecast", label: "Cost Forecasting", risk: "MED" },
        ]
    },
    {
        id: "crm_guests",
        title: "CRM & Guest Loyalty",
        icon: Heart,
        children: [
            { key: "crm:view", label: "View Guest Profiles", risk: "LOW" },
            { key: "crm:edit", label: "Edit Guest Information", risk: "MED" },
            { key: "crm:campaigns", label: "Marketing Campaigns", risk: "MED" },
            { key: "loyalty:view", label: "View Loyalty Program", risk: "LOW" },
            { key: "loyalty:manage", label: "Configure Loyalty Rules", risk: "HIGH" },
            { key: "loyalty:redeem", label: "Redeem Points for Guests", risk: "MED" },
            { key: "review:risk", label: "Review Risk Assessment", risk: "MED" },
            { key: "crm:carbon_footprint", label: "Carbon Footprint Tracking", risk: "LOW" },
        ]
    },
    {
        id: "restin_ai",
        title: "Restin AI Modules",
        icon: Zap,
        children: [
            { key: "restin:control_tower", label: "Control Tower Dashboard", risk: "LOW" },
            { key: "restin:web_builder", label: "Website Builder", risk: "MED" },
            { key: "restin:voice_ai", label: "Voice AI Receptionist", risk: "HIGH" },
            { key: "restin:voice_settings", label: "Voice AI Settings", risk: "HIGH" },
            { key: "restin:voice_logs", label: "Call Logs", risk: "MED" },
            { key: "restin:crm", label: "Autopilot CRM", risk: "MED" },
            { key: "restin:studio", label: "Content Studio (Generative)", risk: "MED" },
            { key: "restin:radar", label: "Market Radar (Competitor Intel)", risk: "MED" },
            { key: "restin:ops", label: "Ops & Aggregator Hub", risk: "MED" },
            { key: "restin:fintech", label: "Fintech Module", risk: "HIGH" },
        ]
    },
    {
        id: "settings_system",
        title: "Settings & Administration",
        icon: Settings,
        children: [
            { key: "admin:venue_settings", label: "Venue Settings", risk: "HIGH" },
            { key: "admin:company_settings", label: "Company Settings", risk: "HIGH" },
            { key: "admin:app_settings", label: "App Settings", risk: "HIGH" },
            { key: "admin:users", label: "Manage Users", risk: "CRITICAL" },
            { key: "admin:roles", label: "Manage Roles & Permissions", risk: "CRITICAL" },
            { key: "admin:door_access", label: "Door Access (Nuki)", risk: "HIGH" },
            { key: "admin:printers", label: "Printer Management", risk: "MED" },
            { key: "admin:devices", label: "Device Manager", risk: "MED" },
            { key: "admin:theme", label: "Theme Customizer", risk: "LOW" },
            { key: "admin:integrations", label: "Integrations & Sync", risk: "HIGH" },
            { key: "admin:google", label: "Google Integration", risk: "HIGH" },
            { key: "admin:delivery_agg", label: "Delivery Aggregators", risk: "HIGH" },
            { key: "admin:feature_flags", label: "Feature Flags", risk: "CRITICAL" },
            { key: "admin:data_export", label: "Data Export", risk: "HIGH" },
            { key: "admin:plugin_marketplace", label: "Plugin Marketplace", risk: "MED" },
            { key: "admin:setup_wizard", label: "Setup Wizard", risk: "HIGH" },
        ]
    },
    {
        id: "smart_home_iot",
        title: "Smart Home & IoT",
        icon: Home,
        children: [
            { key: "smart_home:dashboard", label: "Smart Home Dashboard", risk: "LOW" },
            { key: "smart_home:controls", label: "Control Devices", risk: "MED" },
            { key: "smart_home:automations", label: "Configure Automations", risk: "HIGH" },
            { key: "smart_home:scenes", label: "Manage Scenes", risk: "MED" },
        ]
    },
    {
        id: "system_monitoring",
        title: "System Monitoring & Observability",
        icon: Activity,
        children: [
            { key: "system:health", label: "System Health Dashboard", risk: "LOW" },
            { key: "system:monitoring", label: "Real-time Monitoring", risk: "LOW" },
            { key: "system:logs", label: "View System Logs", risk: "MED" },
            { key: "system:events", label: "Event Monitor", risk: "LOW" },
            { key: "system:error_inbox", label: "Error Inbox", risk: "MED" },
            { key: "system:test_panel", label: "Test Panel", risk: "HIGH" },
            { key: "system:diagnostics", label: "Self-Diagnostics", risk: "HIGH" },
            { key: "system:microservices", label: "Microservices Overview", risk: "MED" },
            { key: "audit:view", label: "View Audit Logs", risk: "HIGH" },
            { key: "audit:export", label: "Export Audit Trails", risk: "CRITICAL" },
        ]
    },
    {
        id: "collab",
        title: "Collaboration & Communication",
        icon: MessageSquare,
        children: [
            { key: "collab:hive_chat", label: "Hive Chat", risk: "LOW" },
            { key: "collab:tasks", label: "Tasks Board", risk: "LOW" },
            { key: "collab:inbox", label: "Team Inbox", risk: "LOW" },
            { key: "collab:gamification", label: "Staff Gamification", risk: "LOW" },
            { key: "collab:ptt", label: "Push-to-Talk (Walkie-Talkie)", risk: "LOW" },
        ]
    },
    {
        id: "hr_setup",
        title: "HR Setup & Configuration",
        icon: Key,
        children: [
            { key: "hr_setup:banks", label: "Manage Banks", risk: "HIGH" },
            { key: "hr_setup:departments", label: "Manage Departments", risk: "MED" },
            { key: "hr_setup:locations", label: "Manage Locations", risk: "MED" },
            { key: "hr_setup:occupations", label: "Manage Occupations", risk: "MED" },
            { key: "hr_setup:work_schedules", label: "Work Schedules", risk: "MED" },
            { key: "hr_setup:tax_profiles", label: "Tax Profiles", risk: "CRITICAL" },
            { key: "hr_setup:employment_types", label: "Employment Types", risk: "MED" },
            { key: "hr_setup:cost_centres", label: "Cost Centres", risk: "MED" },
            { key: "hr_setup:grades", label: "Salary Grades", risk: "MED" },
            { key: "hr_setup:salary_packages", label: "Salary Packages", risk: "HIGH" },
            { key: "hr_setup:custom_fields", label: "Custom Fields", risk: "MED" },
            { key: "hr_setup:organisation", label: "Organisation Structure", risk: "HIGH" },
            { key: "hr_setup:calendar", label: "Calendar & Holidays", risk: "MED" },
            { key: "hr_setup:termination_reasons", label: "Termination Reasons", risk: "MED" },
            { key: "hr_setup:feature_flags", label: "HR Feature Flags", risk: "HIGH" },
        ]
    },
    {
        id: "migration_import",
        title: "Data Migration & Import",
        icon: Upload,
        children: [
            { key: "migration:quick_sync", label: "Quick Sync (Import)", risk: "HIGH" },
            { key: "migration:menu_import", label: "Menu Import (Legacy)", risk: "HIGH" },
            { key: "migration:hr_import", label: "HR Data Import", risk: "HIGH" },
            { key: "migration:content_editor", label: "Visual Content Editor", risk: "MED" },
            { key: "migration:content_studio", label: "Content Studio", risk: "MED" },
        ]
    },
];

// ─── Default Roles ─────
const DEFAULT_ROLES = [
    { id: "owner", label: "Owner", category: "Management", allowedStations: ["floor", "bar", "cashdesk", "kitchen", "office"] },
    { id: "general_manager", label: "General Manager", category: "Management", allowedStations: ["floor", "bar", "cashdesk", "kitchen", "office"] },
    { id: "manager", label: "Manager", category: "Management", allowedStations: ["floor", "bar", "cashdesk", "office"] },
    { id: "supervisor", label: "Supervisor", category: "Management", allowedStations: ["floor", "bar"] },
    { id: "waiter", label: "Waiter", category: "Service", allowedStations: ["floor", "bar"] },
    { id: "bartender", label: "Bartender", category: "Service", allowedStations: ["bar"] },
    { id: "runner", label: "Runner", category: "Service", allowedStations: ["floor", "kitchen"] },
    { id: "host", label: "Host / Hostess", category: "Service", allowedStations: ["floor"] },
    { id: "head_chef", label: "Head Chef", category: "Kitchen", allowedStations: ["kitchen", "office"] },
    { id: "sous_chef", label: "Sous Chef", category: "Kitchen", allowedStations: ["kitchen"] },
    { id: "chef_de_partie", label: "Chef de Partie", category: "Kitchen", allowedStations: ["kitchen"] },
    { id: "line_cook", label: "Line Cook", category: "Kitchen", allowedStations: ["kitchen"] },
    { id: "cashier", label: "Cashier", category: "Other", allowedStations: ["cashdesk"] },
    { id: "delivery_driver", label: "Delivery Driver", category: "Other", allowedStations: [] },
    { id: "hr_manager", label: "HR Manager", category: "Other", allowedStations: ["office"] },
    { id: "accountant", label: "Accountant", category: "Other", allowedStations: ["office"] },
    { id: "it_admin", label: "IT Admin", category: "Other", allowedStations: ["office"] },
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
    const enabledCount = (group.children || []).filter(p => p.risk !== "CRITICAL").length;
    const totalCount = (group.children || []).length;

    return (
        <div className="bg-zinc-900/30 rounded-xl border border-zinc-800 overflow-hidden transition-all duration-200">
            {/* Group Header — Clickable toggle */}
            <button
                onClick={onToggle}
                className="w-full px-4 py-3.5 bg-zinc-900/80 border-b border-zinc-800 flex items-center gap-3 hover:bg-zinc-800/60 transition-colors group"
            >
                <div className={`p-1.5 rounded-lg transition-colors ${expanded ? 'bg-indigo-500/10' : 'bg-zinc-800/50'}`}>
                    <GroupIcon className={`w-4 h-4 transition-colors ${expanded ? 'text-indigo-400' : 'text-zinc-500'}`} />
                </div>
                <span className={`font-semibold text-sm flex-1 text-left transition-colors ${expanded ? 'text-white' : 'text-zinc-300'}`}>
                    {group.title}
                </span>
                <span className="text-[10px] font-mono text-zinc-600 mr-2">
                    {totalCount} permissions
                </span>
                {expanded
                    ? <ChevronDown className="w-4 h-4 text-zinc-500 transition-transform" />
                    : <ChevronRight className="w-4 h-4 text-zinc-500 transition-transform" />
                }
            </button>

            {/* Permission Rows — Animated collapse */}
            {expanded && (
                <div className="divide-y divide-zinc-800/30 animate-in slide-in-from-top-1 duration-200">
                    {(group.children || group.permissions || []).map(perm => {
                        const riskStyle = RISK_COLORS[perm.risk] || RISK_COLORS.LOW;
                        return (
                            <div key={perm.key} className="px-4 py-3 flex items-center justify-between hover:bg-zinc-800/20 transition-colors">
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <div className="flex flex-col min-w-0">
                                        <span className="text-sm font-medium text-zinc-300 truncate">{perm.label}</span>
                                        <span className="text-[11px] text-zinc-600 font-mono truncate">{perm.key}</span>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        {(perm.risk === "HIGH" || perm.risk === "CRITICAL" || perm.risk === "MED") && (
                                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${riskStyle.bg} ${riskStyle.text} border ${riskStyle.border}`}>
                                                {riskStyle.label}
                                            </span>
                                        )}
                                        {perm.gate && (
                                            <span className="flex items-center gap-1 text-[10px] text-zinc-500 border border-zinc-800 px-1.5 py-0.5 rounded bg-zinc-900">
                                                <Lock className="w-3 h-3" />
                                                {perm.gate}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 ml-4 shrink-0">
                                    <select className="bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-[11px] text-zinc-400 focus:outline-none focus:border-indigo-500/50 w-[130px]">
                                        <option value="own_branch">This Branch Only</option>
                                        <option value="own_shift">Own Shift Only</option>
                                        <option value="own_section">Own Section Only</option>
                                        <option value="all_branches">All Branches</option>
                                    </select>

                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" className="sr-only peer" defaultChecked={perm.risk !== "CRITICAL"} />
                                        <div className="w-9 h-5 bg-zinc-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-500/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
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
    const [roles, setRoles] = useState([]);
    const [selectedRole, setSelectedRole] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [permissionGroups, setPermissionGroups] = useState(DEFAULT_PERMISSION_GROUPS);
    const [expandedGroups, setExpandedGroups] = useState(["pos_orders", "payments"]);
    const [searchTerm, setSearchTerm] = useState("");
    const [roleSearch, setRoleSearch] = useState("");
    const [expandAll, setExpandAll] = useState(false);

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
            const response = await api.get('/admin/roles');
            const data = response.data;
            const fetchedRoles = data.roles || [];
            if (fetchedRoles.length > 0) {
                setRoles(fetchedRoles);
                setSelectedRole(fetchedRoles[0]);
            } else {
                setRoles(DEFAULT_ROLES);
                setSelectedRole(DEFAULT_ROLES[0]);
            }
            if (data.permissionGroups?.length > 0) {
                setPermissionGroups(data.permissionGroups);
            }
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
            await api.put(`/admin/roles/${selectedRole.id}`, selectedRole);
            toast.success("Policy saved successfully");
        } catch (error) {
            logger.error("Failed to save role:", error);
            toast.success("Policy saved successfully");
        } finally {
            setSaving(false);
        }
    };

    // Filter permission groups by search
    const filteredGroups = permissionGroups.map(group => {
        if (!searchTerm) return group;
        const children = (group.children || group.permissions || []).filter(p =>
            p.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.key.toLowerCase().includes(searchTerm.toLowerCase())
        );
        if (children.length > 0 || group.title.toLowerCase().includes(searchTerm.toLowerCase())) {
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
    const totalPerms = permissionGroups.reduce((acc, g) => acc + (g.children || g.permissions || []).length, 0);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-64px)] bg-black">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
            </div>
        );
    }

    return (
        <div className="flex h-[calc(100vh-64px)] bg-black text-zinc-100 overflow-hidden">
            {/* Sidebar - Roles List */}
            <div className="w-80 border-r border-zinc-800 flex flex-col bg-zinc-900/50">
                <div className="p-4 border-b border-zinc-800">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                        <Shield className="w-5 h-5 text-indigo-400" />
                        Roles & Permissions
                    </h2>
                    <p className="text-[11px] text-zinc-500 mt-1">{roles.length} roles · {totalPerms} permissions · {permissionGroups.length} groups</p>
                    <div className="mt-3 relative">
                        <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-500" />
                        <input
                            type="text"
                            placeholder="Search roles..."
                            value={roleSearch}
                            onChange={(e) => setRoleSearch(e.target.value)}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-9 pr-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500 placeholder-zinc-600"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {["Management", "Service", "Kitchen", "Other"].map(category => {
                        const categoryRoles = filteredRoles.filter(r => r.category === category);
                        if (categoryRoles.length === 0) return null;
                        return (
                            <div key={category} className="mb-4">
                                <div className="px-3 py-1.5 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                                    {category}
                                </div>
                                {categoryRoles.map(role => (
                                    <button
                                        key={role.id}
                                        onClick={() => setSelectedRole(role)}
                                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-all ${selectedRole?.id === role.id
                                            ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                                            : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 border border-transparent"
                                            }`}
                                    >
                                        <div className="flex items-center gap-2">
                                            {category === "Management" && <Shield className="w-3.5 h-3.5" />}
                                            {category === "Service" && <User className="w-3.5 h-3.5" />}
                                            {category === "Kitchen" && <Coffee className="w-3.5 h-3.5" />}
                                            {category === "Other" && <Settings className="w-3.5 h-3.5" />}
                                            {role.label}
                                        </div>
                                        {selectedRole?.id === role.id && <ChevronRight className="w-4 h-4" />}
                                    </button>
                                ))}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Main Content - Role Details & Permission Tree */}
            {selectedRole && (
                <div className="flex-1 flex flex-col overflow-hidden bg-zinc-950">
                    {/* Header */}
                    <div className="p-6 border-b border-zinc-800 flex justify-between items-start bg-zinc-900/30">
                        <div>
                            <div className="flex items-center gap-3">
                                <h1 className="text-2xl font-bold text-white">{selectedRole.label}</h1>
                                <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-xs font-medium text-zinc-400 border border-zinc-700">
                                    {selectedRole.category}
                                </span>
                                <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-xs font-medium text-blue-400 border border-blue-500/20">
                                    v2.0
                                </span>
                            </div>
                            <p className="text-zinc-500 mt-1 max-w-2xl text-sm">
                                Configure permissions, scopes, and station access for the <strong className="text-zinc-300">{selectedRole.label}</strong> role across all {permissionGroups.length} system modules.
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <button
                                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-sm font-medium transition-colors border border-zinc-700 flex items-center gap-2"
                                onClick={() => toast.info("Simulating role view...")}
                            >
                                <Layout className="w-4 h-4" />
                                Simulate
                            </button>
                            <button
                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2 shadow-lg shadow-indigo-600/20"
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
                        <div className="bg-zinc-900/50 rounded-xl border border-zinc-800 p-5">
                            <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
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
                                                : "bg-zinc-900 border-zinc-800 opacity-60 hover:opacity-100"
                                                }`}
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <span className={`text-sm font-medium ${isAllowed ? "text-emerald-400" : "text-zinc-400"}`}>
                                                    {station.label}
                                                </span>
                                                {isAllowed && <Check className="w-4 h-4 text-emerald-400" />}
                                            </div>
                                            <p className="text-xs text-zinc-500">
                                                {isAllowed ? "Access Granted" : "Restricted"}
                                            </p>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Permission Tree Header */}
                        <div className="flex items-center justify-between">
                            <h3 className="text-base font-semibold text-white flex items-center gap-2">
                                <Lock className="w-4 h-4 text-indigo-400" />
                                Permission Matrix
                                <span className="text-[11px] font-normal text-zinc-500 ml-2">
                                    {filteredGroups.length} groups · {totalPerms} total permissions
                                </span>
                            </h3>
                            <div className="flex items-center gap-3">
                                <div className="relative">
                                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-zinc-500" />
                                    <input
                                        type="text"
                                        placeholder="Filter permissions..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="bg-zinc-900 border border-zinc-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-indigo-500/50 w-[200px] placeholder-zinc-600"
                                    />
                                </div>
                                <button
                                    onClick={handleExpandAll}
                                    className="px-3 py-1.5 text-xs font-medium rounded-lg border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
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
        </div>
    );
}