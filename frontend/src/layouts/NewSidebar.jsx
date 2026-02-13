import React, { useState, useMemo } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from '../features/auth/AuthContext';
import { useVenue } from '../context/VenueContext';
import {
  LayoutDashboard, ShoppingCart, Users, FileText,
  DollarSign, BarChart3, Settings, Activity, TrendingUp, Factory, Award,
  Table as TableIcon, Calendar, Truck, PieChart as PieChartIcon,
  UserCheck, Receipt, Clock, Package, Upload, Monitor,
  Building2, LayoutGrid, ShieldAlert, Shield, Layers,
  RefreshCw, Home, Timer, Type, Palette, Server, Globe, Mic, Wand2, Radar, MessageSquare, Cpu, Zap, Archive, Briefcase, Menu, ChevronRight, ChevronLeft, Search, X
} from 'lucide-react';

// Role hierarchy from centralized definition (includes product_owner: 99)
import { ROLE_HIERARCHY } from '../lib/roles';

const menuItems = [
  // HOME / MAIN
  { title: 'Dashboard', icon: LayoutDashboard, href: '/admin/dashboard', group: 'main', requiredRole: 'MANAGER' },
  { title: 'Observability', icon: Activity, href: '/admin/observability', group: 'main', requiredRole: 'OWNER' },

  // POS & OPERATIONS
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
      { title: 'Export Data', id: 'export' }
    ]
  },
  { title: 'Products', icon: ShoppingCart, href: '/admin/products', group: 'pos', requiredRole: 'MANAGER' },
  { title: 'Physical Tables', icon: TableIcon, href: '/admin/physical-tables', group: 'pos', requiredRole: 'MANAGER' },
  { title: 'Floor Plans', icon: LayoutGrid, href: '/admin/floor-plans', group: 'pos', requiredRole: 'MANAGER' },
  { title: 'Review Risk', icon: ShieldAlert, href: '/admin/review-risk', group: 'pos', requiredRole: 'MANAGER' },
  { title: 'Reservations', icon: Calendar, href: '/admin/reservations', group: 'pos', requiredRole: 'MANAGER' },
  { title: 'CRM & Guests', icon: Users, href: '/admin/crm', group: 'pos', requiredRole: 'MANAGER' },
  { title: 'Loyalty Program', icon: Award, href: '/admin/loyalty', group: 'pos', requiredRole: 'MANAGER' },
  { title: 'Operational Timeline', icon: Clock, href: '/admin/reservations/timeline', group: 'pos', requiredRole: 'MANAGER' },
  { title: 'Devices', icon: Activity, href: '/admin/devices', group: 'pos', requiredRole: 'MANAGER' },
  {
    title: 'Printer Management',
    icon: Receipt,
    group: 'pos',
    href: '/admin/printers',
    requiredRole: 'MANAGER',
    subs: [
      { title: 'Printers', id: 'printers', href: '/admin/printers?tab=printers' },
      { title: 'Templates', id: 'templates', href: '/admin/printers?tab=templates' },
      { title: 'Cash Drawers', id: 'drawers', href: '/admin/printers?tab=cash-drawers' }
    ]
  },

  { title: 'Tasks Kanban', icon: LayoutDashboard, href: '/admin/tasks-kanban', group: 'pos', requiredRole: 'STAFF' },
  { title: 'Inbox', icon: Activity, href: '/admin/inbox', group: 'pos', requiredRole: 'STAFF' },
  { title: 'Service Day Close', icon: Clock, href: '/admin/service-day-close', group: 'pos', requiredRole: 'MANAGER' },
  { title: 'Pre-Go-Live', icon: Activity, href: '/admin/pre-go-live', group: 'pos', requiredRole: 'OWNER' },
  { title: 'App Settings', icon: Settings, href: '/admin/app-settings', group: 'pos', requiredRole: 'OWNER' },
  { title: 'Company Settings', icon: Building2, href: '/admin/company-settings', group: 'pos', requiredRole: 'OWNER' },
  { title: 'POS Setup', icon: Settings, href: '/pos/setup', group: 'pos', requiredRole: 'OWNER' },
  { title: 'KDS Stations', icon: Monitor, href: '/admin/kds/stations', group: 'pos', requiredRole: 'MANAGER' },

  // HUMAN RESOURCES
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
    title: 'HR Reports',
    icon: FileText,
    href: '/admin/hr-reports/headcount',
    group: 'hr',
    requiredRole: 'OWNER',
    subs: [
      { title: 'Headcount', id: 'headcount', href: '/admin/hr-reports/headcount' },
      { title: 'Turnover', id: 'turnover', href: '/admin/hr-reports/turnover' },
      { title: 'Employee Details', id: 'emp-details', href: '/admin/hr-reports/employee-details' },
      { title: 'Employment Dates', id: 'emp-dates', href: '/admin/hr-reports/employment-dates' },
      { title: 'Birthdays & Anniversaries', id: 'birthdays', href: '/admin/hr-reports/birthdays' },
      { title: 'Training Expiring', id: 'train-exp', href: '/admin/hr-reports/training-expiring' },
      { title: 'Training Starting', id: 'train-start', href: '/admin/hr-reports/training-starting' },
      { title: 'Training Ongoing', id: 'train-on', href: '/admin/hr-reports/training-ongoing' }
    ]
  },
  {
    title: 'Advanced Modules',
    icon: Layers,
    href: '#',
    group: 'hr',
    requiredRole: 'OWNER',
    subs: [
      { title: 'ESG & Sustainability', id: 'esg', href: '/admin/hr/esg' },
      { title: 'Gov Reports', id: 'gov', href: '/admin/hr/gov-reports' },
      { title: 'Sick Leave Analysis', id: 'sick', href: '/admin/hr/sick-leave' },
      { title: 'Cost Forecasting', id: 'cost', href: '/admin/hr/forecasting-costs' },
      { title: 'Employee Portal View', id: 'portal', href: '/admin/hr/portal-view' }
    ]
  },
  {
    title: 'HR Settings',
    icon: Settings,
    href: '/admin/hr/settings',
    group: 'hr',
    requiredRole: 'OWNER',
    subs: [
      { title: 'Setup Hub', id: 'setup-hub', href: '/admin/hr-setup' },
      { title: 'Feature Flags', id: 'flags', href: '/admin/hr/settings' },
      { title: 'Banks', id: 'banks', href: '/admin/hr-setup/banks' },
      { title: 'Departments', id: 'depts', href: '/admin/hr-setup/departments' },
      { title: 'Locations', id: 'locs', href: '/admin/hr-setup/locations' },
      { title: 'Occupations', id: 'jobs', href: '/admin/hr-setup/occupations' },
      { title: 'Work Schedules', id: 'sched', href: '/admin/hr-setup/work-schedules' },
      { title: 'Tax Profiles', id: 'tax', href: '/admin/hr-setup/tax-profiles' }
    ]
  },

  // INVENTORY & SUPPLY CHAIN
  { title: 'General Settings', icon: Settings, href: '/admin/menu', group: 'menu', requiredRole: 'MANAGER' },
  { title: 'Quick Sync (Import)', icon: Upload, href: '/admin/migration', group: 'menu', requiredRole: 'OWNER' },
  { title: 'Menu Import (Legacy)', icon: Upload, href: '/admin/menu-import', group: 'menu', requiredRole: 'OWNER' },
  {
    title: 'Inventory Hub',
    icon: Package,
    href: '/admin/inventory',
    group: 'menu',
    requiredRole: 'MANAGER',
    subs: [
      { title: 'Items & Stock', id: 'items', href: '/admin/inventory-items' },
      { title: 'Stock Count', id: 'count', href: '/admin/inventory-stock-count' },
      { title: 'Waste Log', id: 'waste', href: '/admin/inventory-waste' },
      { title: 'Recipes', id: 'recipes', href: '/admin/inventory-recipes' },
      { title: 'Production', id: 'production', href: '/admin/inventory-production' },
      { title: 'Transfers', id: 'transfers', href: '/admin/inventory-transfers' },
      { title: 'Suppliers', id: 'suppliers', href: '/admin/suppliers' },
      { title: 'Purchase Orders', id: 'po', href: '/admin/inventory-purchase-orders' }
    ]
  },
  { title: 'Suppliers', icon: Truck, href: '/admin/suppliers', group: 'menu', requiredRole: 'MANAGER' },
  { title: 'Recipe Engineering', icon: Factory, href: '/admin/recipe-engineering', group: 'menu', requiredRole: 'MANAGER' },
  { title: 'Procurement Hub', icon: ShoppingCart, href: '/admin/procurement', group: 'procurement', requiredRole: 'MANAGER' },
  { title: 'RFQ Management', icon: FileText, href: '/admin/procurement/rfq', group: 'procurement', requiredRole: 'MANAGER' },
  { title: 'AI Invoice', icon: Activity, href: '/admin/ai-invoice', group: 'procurement', requiredRole: 'MANAGER' },
  { title: 'Central Kitchen', icon: Factory, href: '/admin/central-kitchen', group: 'production', requiredRole: 'MANAGER' },
  { title: 'Demand Forecasting', icon: TrendingUp, href: '/admin/forecasting', group: 'production', requiredRole: 'MANAGER' },
  { title: 'Quality Control', icon: Award, href: '/admin/quality', group: 'production', requiredRole: 'MANAGER' },

  // FINANCE
  { title: 'Finance Dashboard', icon: DollarSign, href: '/admin/finance', group: 'finance', requiredRole: 'OWNER' },
  { title: 'General Ledger', icon: FileText, href: '/admin/accounting', group: 'finance', requiredRole: 'OWNER' },
  { title: 'HR Accounting', icon: FileText, href: '/admin/hr-advanced/accounting', group: 'finance', requiredRole: 'OWNER' },
  { title: 'Audit Logs', icon: Activity, href: '/admin/audit-logs', group: 'finance', requiredRole: 'OWNER' },

  // ANALYTICS & REPORTS
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
      { title: 'Export Data', id: 'export' }
    ]
  },
  { title: 'Business Analytics', icon: TrendingUp, href: '/admin/analytics', group: 'reports', requiredRole: 'MANAGER' },
  { title: 'HR Analytics', icon: BarChart3, href: '/admin/hr-advanced/analytics', group: 'reports', requiredRole: 'OWNER' },
  { title: 'KDS Performance', icon: Activity, href: '/admin/reports/kds-performance-detailed', group: 'reports', requiredRole: 'MANAGER' },
  { title: 'Inventory Analytics', icon: PieChartIcon, href: '/admin/reports/inventory-detailed', group: 'reports', requiredRole: 'MANAGER' },
  { title: 'Headcount Analysis', icon: Users, href: '/admin/hr/headcount', group: 'reports', requiredRole: 'OWNER' },
  { title: 'Turnover Analysis', icon: TrendingUp, href: '/admin/hr/turnover', group: 'reports', requiredRole: 'OWNER' },

  // SETTINGS
  { title: 'Venue Settings', icon: Settings, href: '/admin/settings', group: 'settings', requiredRole: 'OWNER' },
  { title: 'User Accounts', icon: UserCheck, href: '/admin/users', group: 'settings', requiredRole: 'OWNER' },
  { title: 'Roles & Permissions', icon: Shield, href: '/admin/access-control', group: 'settings', requiredRole: 'OWNER' },
  { title: 'Integration Sync', icon: RefreshCw, href: '/admin/sync', group: 'settings', requiredRole: 'OWNER' },
  { title: 'Door Access (Nuki)', icon: Award, href: '/admin/door-access', group: 'settings', requiredRole: 'OWNER' },
  { title: 'Smart Home', icon: Home, href: '/admin/smart-home', group: 'settings', requiredRole: 'OWNER' },
  { title: 'Event Monitor', icon: Activity, href: '/admin/events', group: 'settings', requiredRole: 'OWNER' },
  {
    title: 'Device Manager',
    icon: Monitor,
    group: 'settings',
    href: '/admin/devices',
    requiredRole: 'MANAGER',
    subs: [
      { title: 'Device List', id: 'list', href: '/admin/devices' },
      { title: 'Device Hub', id: 'hub', href: '/admin/device-hub' },
      { title: 'Device Mapping', id: 'map', href: '/admin/device-mapping' }
    ]
  },
  { title: 'Content Studio', icon: LayoutDashboard, href: '/admin/content-studio', group: 'settings', requiredRole: 'OWNER' },
  { title: 'Template Studio', icon: LayoutDashboard, href: '/admin/templates', group: 'settings', requiredRole: 'MANAGER' },
  { title: 'Content Editor', icon: Type, href: '/admin/content-editor', group: 'settings', requiredRole: 'OWNER' },
  { title: 'Theme Customizer', icon: Palette, href: '/admin/theme', group: 'settings', requiredRole: 'OWNER' },
  { title: 'Microservices', icon: Server, href: '/admin/microservices', group: 'settings', requiredRole: 'OWNER' },
  {
    title: 'System Intelligence',
    icon: Activity,
    href: '/admin/monitoring',
    group: 'settings',
    requiredRole: 'OWNER',
    subs: [
      { title: 'Real-time Monitor', id: 'monitor', href: '/admin/monitoring' },
      { title: 'System Logs', id: 'logs', href: '/admin/logs' },
      { title: 'Advanced Health', id: 'health', href: '/admin/system-health-advanced' },
      { title: 'Error Inbox', id: 'errors', href: '/admin/observability/error-inbox' },
      { title: 'Test Panel', id: 'test', href: '/admin/observability/testpanel' }
    ]
  },

  // GOOGLE & INTEGRATION
  { title: 'Google Integration', icon: Globe, href: '/admin/google-workspace', group: 'settings', requiredRole: 'OWNER' },
  { title: 'Integrations', icon: Layers, href: '/admin/integrations', group: 'settings', requiredRole: 'OWNER' },

  // RESTIN.AI COMMERCIAL MODULES (Protocol v18.0)
  { title: 'Control Tower', icon: LayoutDashboard, href: '/admin/restin', group: 'restin', requiredRole: 'OWNER' },
  { title: 'Website Builder', icon: Globe, href: '/admin/restin/web', group: 'restin', requiredRole: 'OWNER' },
  { title: 'Voice AI', icon: Mic, href: '/admin/restin/voice', group: 'restin', requiredRole: 'OWNER' },
  { title: 'Autopilot CRM', icon: Users, href: '/admin/restin/crm', group: 'restin', requiredRole: 'OWNER' },
  { title: 'Content Studio', icon: Wand2, href: '/admin/restin/studio', group: 'restin', requiredRole: 'OWNER' },
  { title: 'Market Radar', icon: Radar, href: '/admin/restin/radar', group: 'restin', requiredRole: 'OWNER' },
  { title: 'Ops & Aggregators', icon: Layers, href: '/admin/restin/ops', group: 'restin', requiredRole: 'OWNER' },
  { title: 'Fintech & Payments', icon: DollarSign, href: '/admin/restin/fintech', group: 'restin', requiredRole: 'OWNER' },

  // COLLABORATION & COMMUNICATION
  { title: 'Hive Chat', icon: MessageSquare, href: '/admin/collab/hive', group: 'collab', requiredRole: 'STAFF' },
  { title: 'Tasks Board', icon: LayoutGrid, href: '/admin/collab/tasks', group: 'collab', requiredRole: 'STAFF' },
  { title: 'Inbox', icon: FileText, href: '/admin/collab/inbox', group: 'collab', requiredRole: 'STAFF' },
  { title: 'Gamification', icon: Award, href: '/admin/staff-gamification', group: 'collab', requiredRole: 'STAFF' },
];

export default function NewSidebar({ collapsed, onToggle, onTertiaryToggle, onDomainExpand }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Role-based filtering: user can only see items at or below their role level
  const userLevel = ROLE_HIERARCHY[user?.role] ?? 0;
  const canSeeItem = (item) => userLevel >= (ROLE_HIERARCHY[item.requiredRole] ?? 0);
  const visibleMenuItems = useMemo(() => menuItems.filter(canSeeItem), [userLevel]);

  // Domain Groups (Pane 1)
  const domains = [
    { id: 'home', title: 'Home', icon: LayoutDashboard },
    { id: 'pos', title: 'POS & Ops', icon: ShoppingCart },
    { id: 'hr', title: 'HR & People', icon: Users },
    { id: 'inventory', title: 'Inventory', icon: FileText },
    { id: 'finance', title: 'Finance', icon: DollarSign },
    { id: 'analytics', title: 'Reporting', icon: BarChart3 },
    { id: 'restin', title: 'Restin OS', icon: Globe },
    { id: 'collab', title: 'Collaborate', icon: MessageSquare },
    { id: 'settings', title: 'Settings', icon: Settings }
  ];

  // Map modules to domains
  const getDomainForGroup = (group) => {
    if (group === 'main') return 'home';
    if (['pos', 'operations'].includes(group)) return 'pos';
    if (['hr', 'staff'].includes(group)) return 'hr';
    if (['menu', 'procurement', 'production'].includes(group)) return 'inventory';
    if (['finance'].includes(group)) return 'finance';
    if (['reports'].includes(group)) return 'analytics';
    if (['restin'].includes(group)) return 'restin';
    if (['collab'].includes(group)) return 'collab';
    if (['settings'].includes(group)) return 'settings';
    return 'home';
  };

  // Only show domains that have at least one visible menu item
  const visibleDomains = useMemo(() => {
    const visibleDomainIds = new Set(visibleMenuItems.map(item => getDomainForGroup(item.group)));
    return domains.filter(d => visibleDomainIds.has(d.id));
  }, [userLevel]);

  const findActiveDomain = () => {
    for (const item of visibleMenuItems) {
      if (item.href === location.pathname || item.children?.some(c => c.href === location.pathname)) {
        return getDomainForGroup(item.group);
      }
    }
    // Fallback to first visible domain
    return visibleDomains[0]?.id || 'home';
  };

  const [activeDomain, setActiveDomain] = useState(() => {
    const d = findActiveDomain();
    return d || 'home';
  });
  const [expandedGroups, setExpandedGroups] = useState(['main', 'pos', 'hr', 'reports']);
  const [activeSubItem, setActiveSubItem] = useState(null);
  const [domainBarExpanded, setDomainBarExpanded] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const handleDomainClick = (id) => {
    setActiveDomain(id);
    if (collapsed) {
      onToggle?.();
    }
  };

  const toggleDomainExpand = () => {
    const newState = !domainBarExpanded;
    setDomainBarExpanded(newState);
    onDomainExpand?.(newState);
  };

  const isActive = (href) => location.pathname === href;
  const isGroupActive = (children) => children?.some(child => location.pathname === child.href);

  const hasTertiary = activeSubItem?.subs?.length > 0;

  React.useEffect(() => {
    onTertiaryToggle?.(hasTertiary);
  }, [hasTertiary, onTertiaryToggle]);

  const toggleGroup = (group) => {
    setExpandedGroups(prev =>
      prev.includes(group)
        ? prev.filter(g => g !== group)
        : [...prev, group]
    );
  };

  return (
    <div className="flex h-full font-body">
      {/* Pane 1: Slim Domain Bar */}
      <aside
        className={cn(
          "h-full flex flex-col items-center py-4 gap-4 border-r border-white/5 transition-all duration-300 shadow-[20px_0_40px_rgba(0,0,0,0.5)] z-50",
          domainBarExpanded ? "w-64 px-4 bg-zinc-950/95 backdrop-blur-xl" : "w-20 bg-zinc-950"
        )}
      >
        <div className={cn("flex items-center w-full mb-8", domainBarExpanded ? "justify-between px-2" : "justify-center")}>
          <button
            onClick={toggleDomainExpand}
            className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
          >
            <div className="h-10 w-10 bg-gradient-to-br from-red-600 to-red-800 rounded-xl flex items-center justify-center shadow-[0_0_25px_rgba(220,38,38,0.4)] border border-red-500/20 active:scale-95 transition-transform">
              <span className="text-2xl font-black text-white dark:text-white text-zinc-900 italic transform -skew-x-6">R</span>
            </div>
            {domainBarExpanded && (
              <div className="flex flex-col items-start">
                <span className="text-xl font-black text-white dark:text-white text-zinc-900 italic tracking-tighter leading-none">restin.ai</span>
                <span className="text-[10px] font-bold text-red-500 tracking-[0.3em] uppercase">Enterprise</span>
              </div>
            )}
          </button>
          {domainBarExpanded && (
            <Button variant="ghost" size="icon" onClick={toggleDomainExpand} className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white h-8 w-8 hover:bg-zinc-100 dark:hover:bg-white/5">
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}
        </div>

        <div className="flex-1 w-full space-y-3">
          {visibleDomains.map((domain) => (
            <button
              key={domain.id}
              onClick={() => handleDomainClick(domain.id)}
              className={cn(
                'group relative flex items-center rounded-xl transition-all duration-300 w-full outline-none focus:ring-2 focus:ring-red-500/20',
                domainBarExpanded ? 'px-4 py-3.5 gap-4' : 'h-12 w-12 justify-center mx-auto',
                activeDomain === domain.id
                  ? 'bg-gradient-to-r from-red-600 to-red-700 shadow-[0_0_20px_rgba(229,57,53,0.4)] text-white border border-red-500/20'
                  : 'text-zinc-500 hover:text-zinc-200 hover:bg-white/5 border border-transparent'
              )}
            >
              <domain.icon className={cn("shrink-0 transition-transform duration-300 group-hover:scale-110", domainBarExpanded ? "h-5 w-5" : "h-6 w-6")} />
              {domainBarExpanded && (
                <span className="text-sm font-bold truncate tracking-wide">{domain.title}</span>
              )}
              {activeDomain === domain.id && !domainBarExpanded && (
                <div className="absolute left-[-20px] w-[4px] h-8 bg-white rounded-r-full shadow-[0_0_15px_rgba(255,255,255,0.8)] animate-pulse" />
              )}
              {!domainBarExpanded && (
                <div className="absolute left-16 px-4 py-2 bg-zinc-900 text-white text-xs font-bold rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 translate-x-2 group-hover:translate-x-0 whitespace-nowrap z-50 uppercase tracking-widest border border-white/10 shadow-2xl">
                  {domain.title}
                  <div className="absolute left-[-4px] top-1/2 -translate-y-1/2 w-2 h-2 bg-zinc-900 rotate-45 border-l border-b border-white/10"></div>
                </div>
              )}
            </button>
          ))}
        </div>

        <div className="mt-auto w-full flex flex-col items-center gap-2 pb-4">
          {collapsed && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggle}
              className={cn(
                "h-12 w-12 rounded-xl text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/5 transition-all border border-transparent hover:border-zinc-200 dark:hover:border-white/5",
                domainBarExpanded && "w-full justify-start px-4 gap-4"
              )}
            >
              <ChevronRight className="h-5 w-5" />
              {domainBarExpanded && <span className="text-sm font-bold tracking-wide">Open Menu</span>}
            </Button>
          )}
          <button
            onClick={toggleDomainExpand}
            className={cn(
              "h-12 w-12 flex items-center justify-center rounded-xl text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/5 transition-all border border-transparent hover:border-zinc-200 dark:hover:border-white/5",
              domainBarExpanded && "w-full justify-start px-4 gap-4"
            )}
          >
            {domainBarExpanded ? <ChevronLeft className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
            {domainBarExpanded && <span className="text-sm font-bold tracking-wide">Collapse Bar</span>}
          </button>
        </div>
      </aside>

      {/* Pane 2: Original Accordion Bar - Now with Icon Mode */}
      <aside
        className={cn(
          'h-full flex flex-col transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] border-r border-white/5 overflow-hidden shadow-[10px_0_30px_rgba(0,0,0,0.3)] z-40 bg-zinc-950',
          collapsed ? 'w-16' : 'w-72'
        )}
      >
        <div className={cn("flex items-center h-20 shrink-0 border-b border-white/5 bg-zinc-950/50 backdrop-blur-sm", collapsed ? "justify-center px-0" : "justify-between px-6")}>
          {!collapsed && (
            <h1 className="text-xs font-black uppercase tracking-[0.25em] text-zinc-400">
              {domains.find(d => d.id === activeDomain)?.title || 'Navigation'}
            </h1>
          )}
          <Button variant="ghost" size="icon" onClick={onToggle} className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/5 h-8 w-8 rounded-lg">
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>

        <ScrollArea className={cn("flex-1 py-6", collapsed ? "px-2" : "px-4")}>
          <nav className="space-y-1.5">
            {/* Search Bar - Hidden in Icon Mode */}
            {!collapsed && (
              <div className="px-3 pb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    type="text"
                    placeholder="Search features..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-zinc-100 dark:bg-zinc-900/50 border border-zinc-200 dark:border-white/10 rounded-lg py-2 pl-9 pr-3 text-sm text-zinc-900 dark:text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-red-500/50 transition-all"
                  />
                </div>
              </div>
            )}
            {visibleMenuItems
              .filter(item => {
                if (searchTerm && !collapsed) {
                  const term = searchTerm.toLowerCase();
                  const matchesTitle = item.title.toLowerCase().includes(term);
                  const matchesSub = item.children?.some(c => c.title.toLowerCase().includes(term) || c.href?.toLowerCase().includes(term));
                  return matchesTitle || matchesSub;
                }
                return getDomainForGroup(item.group) === activeDomain;
              })
              .map((item) => (
                <div key={item.title}>
                  {item.href && !item.children ? (
                    <Link
                      to={item.href}
                      className={cn(
                        'group flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all duration-200 border border-transparent',
                        collapsed && 'justify-center px-2 py-3'
                      )}
                      style={isActive(item.href) ? {
                        backgroundColor: 'rgba(229, 57, 53, 0.08)',
                        color: '#EF4444',
                        borderColor: 'rgba(229, 57, 53, 0.2)',
                        boxShadow: '0 0 15px rgba(229, 57, 53, 0.05)'
                      } : { color: '#A1A1AA' }}
                      onClick={() => setActiveSubItem(item)}
                    >
                      <item.icon className={cn("h-5 w-5 flex-shrink-0 transition-colors", isActive(item.href) ? "text-red-500" : "text-zinc-500 group-hover:text-zinc-300")} />
                      {!collapsed && <span className={cn("text-sm font-medium", isActive(item.href) ? "font-bold" : "")}>{item.title}</span>}
                      {isActive(item.href) && !collapsed && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(229,57,53,0.8)]"></div>}
                    </Link>
                  ) : (
                    <div className="space-y-1">
                      <button
                        onClick={() => !collapsed ? toggleGroup(item.group) : null}
                        className={cn(
                          'w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all duration-200 group hover:bg-white/5',
                          collapsed && 'justify-center px-2 py-3'
                        )}
                        style={{
                          color: isGroupActive(item.children) ? '#F4F4F5' : '#71717A'
                        }}
                      >
                        <item.icon className={cn("h-5 w-5 flex-shrink-0 transition-colors", isGroupActive(item.children) ? "text-zinc-200" : "text-zinc-600 group-hover:text-zinc-400")} />
                        {!collapsed && (
                          <>
                            <span className="flex-1 text-left text-sm font-medium tracking-wide">{item.title}</span>
                            <ChevronRight className={cn('h-4 w-4 transition-transform duration-300 opacity-50', expandedGroups.includes(item.group) && 'rotate-90 opacity-100')} />
                          </>
                        )}
                      </button>
                      {!collapsed && expandedGroups.includes(item.group) && item.children && (
                        <div className="ml-4 pl-4 border-l border-white/5 space-y-1 mt-1 py-1">
                          {item.children.map((child) => (
                            <button
                              key={child.href}
                              onClick={() => {
                                navigate(child.href);
                                setActiveSubItem(child);
                              }}
                              className={cn('w-full text-left block px-3 py-2 rounded-lg text-sm transition-all border border-transparent outline-none relative overflow-hidden')}
                              style={isActive(child.href) ? {
                                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                                color: '#EF4444',
                                borderColor: 'rgba(229, 57, 53, 0.1)',
                                fontWeight: 600
                              } : { color: '#71717A' }}
                            >
                              <span className="relative z-10">{child.title}</span>
                              {isActive(child.href) && <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-red-500 shadow-[0_0_8px_rgba(229,57,53,0.8)]"></div>}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
          </nav>
        </ScrollArea>
      </aside>

      {/* Pane 3: Tertiary Segment - Collapsible */}
      <aside
        className={cn(
          'h-full flex flex-col transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] border-r border-white/5 shadow-inner z-30 bg-[#050506]',
          hasTertiary ? (collapsed ? 'w-16 opacity-100 translate-x-0' : 'w-60 opacity-100 translate-x-0') : 'w-0 opacity-0 -translate-x-full overflow-hidden border-none'
        )}
      >
        <div className={cn("h-20 flex items-center border-b border-white/5 bg-[#050506]/80 backdrop-blur-sm", collapsed ? "justify-center px-0" : "justify-between px-6")}>
          {!collapsed && (
            <div className="flex items-center justify-between w-full">
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-700"></span>
                {activeSubItem?.title}
              </h2>
              <button
                onClick={() => setActiveSubItem(null)}
                className="p-1 hover:bg-zinc-100 dark:hover:bg-white/10 rounded-lg transition-colors text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
          {/* Auto-collapse based on Pane 2, essentially mimicking its state or could be independent. 
               User requested 3rd column to be icon mode too.
               If header is collapsed, we show just a dot or icon.
           */}
        </div>
        <ScrollArea className={cn("flex-1 py-6", collapsed ? "px-2" : "px-4")}>
          <nav className="space-y-2">
            {activeSubItem?.subs?.map((sub) => (
              <Button
                key={sub.id}
                variant="ghost"
                className={cn(
                  'w-full h-auto rounded-xl text-xs font-bold transition-all border border-transparent group relative overflow-hidden',
                  collapsed ? 'justify-center px-2 py-4' : 'justify-start gap-3 px-4 py-6',
                  location.search.includes(`type = ${sub.id} `)
                    ? 'bg-red-600/5 text-red-500 border-red-600/10'
                    : 'text-zinc-500 hover:bg-white/5 hover:text-zinc-200'
                )}
                onClick={() => {
                  navigate(`${activeSubItem.href}?type = ${sub.id} `);
                }}
                title={collapsed ? sub.title : undefined}
              >
                <div className={cn("w-1.5 h-1.5 rounded-full shrink-0 transition-all", location.search.includes(`type = ${sub.id} `) ? "bg-red-500 shadow-[0_0_5px_rgba(229,57,53,0.5)]" : "bg-zinc-800 group-hover:bg-zinc-600")}></div>
                {!collapsed && sub.title}
              </Button>
            ))}
          </nav>
        </ScrollArea>
      </aside>
    </div>
  );
}
