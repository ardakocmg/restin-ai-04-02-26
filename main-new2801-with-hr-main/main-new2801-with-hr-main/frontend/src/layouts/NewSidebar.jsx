import React, { useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { cn } from '../lib/utils';
import { Button } from '../components/ui/button';
import { ScrollArea } from '../components/ui/scroll-area';
import {
  ChevronLeft, ChevronRight, LayoutDashboard, ShoppingCart, Users, FileText,
  DollarSign, BarChart3, Settings, Activity, TrendingUp, Factory, Award,
  Table as TableIcon, Calendar, Truck, PieChart as PieChartIcon,
  UserCheck, Receipt, Clock, Package, Type, Building2
} from 'lucide-react';

const menuItems = [
  // HOME / MAIN
  { title: 'Dashboard', icon: LayoutDashboard, href: '/admin/dashboard', group: 'main' },
  { title: 'Observability', icon: Activity, href: '/admin/observability', group: 'main' },

  // POS & OPERATIONS
  { title: 'POS Dashboard', icon: LayoutDashboard, href: '/admin/posdashboard', group: 'pos' },
  {
    title: 'Sales Analytics', icon: BarChart3, href: '/admin/reports/sales', group: 'pos',
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
  { title: 'Products', icon: ShoppingCart, href: '/admin/products', group: 'pos' },
  { title: 'Physical Tables', icon: TableIcon, href: '/admin/physical-tables', group: 'pos' },
  { title: 'Reservations', icon: Calendar, href: '/admin/reservations', group: 'pos' },
  { title: 'Operational Timeline', icon: Clock, href: '/admin/reservations/timeline', group: 'pos' },
  { title: 'Devices', icon: Activity, href: '/admin/devices', group: 'pos' },
  { title: 'Printers', icon: Receipt, href: '/admin/printers', group: 'pos' },
  { title: 'Printer Templates', icon: FileText, href: '/admin/printers?tab=templates', group: 'pos' },
  { title: 'Cash Drawers', icon: DollarSign, href: '/admin/printers?tab=cash-drawers', group: 'pos' },
  { title: 'Tasks Kanban', icon: LayoutDashboard, href: '/admin/tasks-kanban', group: 'pos' },
  { title: 'Inbox', icon: Activity, href: '/admin/inbox', group: 'pos' },
  { title: 'Service Day Close', icon: Clock, href: '/admin/service-day-close', group: 'pos' },
  { title: 'Pre-Go-Live', icon: Activity, href: '/admin/pre-go-live', group: 'pos' },
  { title: 'App Settings', icon: Settings, href: '/admin/app-settings', group: 'pos' },
  { title: 'Company Settings', icon: Building2, href: '/admin/company-settings', group: 'pos' },
  { title: 'POS Setup', icon: Settings, href: '/pos/setup', group: 'pos' },

  // HUMAN RESOURCES
  { title: 'HR Dashboard', icon: Users, href: '/admin/hr', group: 'hr' },
  { title: 'Employee Directory', icon: UserCheck, href: '/admin/hr/people', group: 'hr' },
  { title: 'Leave Management', icon: Calendar, href: '/admin/hr/leave-management', group: 'hr' },
  { title: 'Payroll Processing', icon: DollarSign, href: '/admin/hr/payroll', group: 'hr' },
  { title: 'Staff Management', icon: Users, href: '/admin/staff', group: 'hr' },
  { title: 'Scheduler', icon: Clock, href: '/admin/hr/scheduler', group: 'hr' },
  { title: 'Clocking Data', icon: Activity, href: '/admin/hr/clocking', group: 'hr' },
  { title: 'Contracts', icon: FileText, href: '/admin/hr/contracts', group: 'hr' },
  { title: 'Documents', icon: FileText, href: '/admin/hr/documents', group: 'hr' },
  { title: 'Tips Management', icon: DollarSign, href: '/admin/hr/tips', group: 'hr' },
  { title: 'HR Settings', icon: Settings, href: '/admin/hr/settings', group: 'hr' },

  // INVENTORY & SUPPLY CHAIN
  { title: 'General Settings', icon: Settings, href: '/admin/menu', group: 'menu' },
  { title: 'Inventory Hub', icon: Package, href: '/admin/inventory', group: 'menu' },
  { title: 'Suppliers', icon: Truck, href: '/admin/suppliers', group: 'menu' },
  { title: 'Recipe Engineering', icon: Factory, href: '/admin/recipe-engineering', group: 'menu' },
  { title: 'Procurement Hub', icon: ShoppingCart, href: '/admin/procurement', group: 'procurement' },
  { title: 'RFQ Management', icon: FileText, href: '/admin/procurement/rfq', group: 'procurement' },
  { title: 'AI Invoice', icon: Activity, href: '/admin/ai-invoice', group: 'procurement' },
  { title: 'Central Kitchen', icon: Factory, href: '/admin/central-kitchen', group: 'production' },
  { title: 'Demand Forecasting', icon: TrendingUp, href: '/admin/forecasting', group: 'production' },
  { title: 'Quality Control', icon: Award, href: '/admin/quality', group: 'production' },

  // FINANCE
  { title: 'Finance Dashboard', icon: DollarSign, href: '/admin/finance', group: 'finance' },
  { title: 'Accounting', icon: FileText, href: '/admin/hr-advanced/accounting', group: 'finance' },
  { title: 'Audit Logs', icon: Activity, href: '/admin/audit-logs', group: 'finance' },

  // ANALYTICS & REPORTS
  {
    title: 'Reporting Hub', icon: BarChart3, href: '/admin/reporting', group: 'reports',
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
  { title: 'HR Analytics', icon: BarChart3, href: '/admin/hr-advanced/analytics', group: 'reports' },
  { title: 'KDS Performance', icon: Activity, href: '/admin/reports/kds-performance-detailed', group: 'reports' },
  { title: 'Inventory Analytics', icon: PieChartIcon, href: '/admin/reports/inventory-detailed', group: 'reports' },
  { title: 'Headcount Analysis', icon: Users, href: '/admin/hr/headcount', group: 'reports' },
  { title: 'Turnover Analysis', icon: TrendingUp, href: '/admin/hr/turnover', group: 'reports' },

  // SETTINGS
  { title: 'Venue Settings', icon: Settings, href: '/admin/settings', group: 'settings' },
  { title: 'Users', icon: UserCheck, href: '/admin/users', group: 'settings' },
  { title: 'Access Control', icon: Award, href: '/admin/access-control', group: 'settings' },
  { title: 'Devices', icon: Activity, href: '/admin/devices', group: 'settings' },
  { title: 'Content Studio', icon: LayoutDashboard, href: '/admin/content-studio', group: 'settings' },
  { title: 'Content Editor', icon: Type, href: '/admin/content-editor', group: 'settings' },
];

export default function NewSidebar({ collapsed, onToggle, onTertiaryToggle, onDomainExpand }) {
  const location = useLocation();
  const navigate = useNavigate();

  // Domain Groups (Pane 1)
  const domains = [
    { id: 'home', title: 'Home', icon: LayoutDashboard },
    { id: 'pos', title: 'POS & Ops', icon: ShoppingCart },
    { id: 'hr', title: 'HR & People', icon: Users },
    { id: 'inventory', title: 'Inventory', icon: FileText },
    { id: 'finance', title: 'Finance', icon: DollarSign },
    { id: 'analytics', title: 'Reporting', icon: BarChart3 },
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
    if (['settings'].includes(group)) return 'settings';
    return 'home';
  };

  const findActiveDomain = () => {
    for (const item of menuItems) {
      if (item.href === location.pathname || item.children?.some(c => c.href === location.pathname)) {
        return getDomainForGroup(item.group);
      }
    }
    return 'pos';
  };

  const [activeDomain, setActiveDomain] = useState(() => {
    const d = findActiveDomain();
    return d || 'home';
  });
  const [expandedGroups, setExpandedGroups] = useState(['main', 'pos', 'hr', 'reports']);
  const [activeSubItem, setActiveSubItem] = useState(null);
  const [domainBarExpanded, setDomainBarExpanded] = useState(false);

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
    <div className="fixed left-0 top-0 z-40 h-screen flex transition-all duration-300">
      {/* Pane 1: Slim Domain Bar */}
      <aside
        className={cn(
          "h-full flex flex-col items-center py-4 gap-4 border-r border-white/5 transition-all duration-300 shadow-[20px_0_40px_rgba(0,0,0,0.3)]",
          domainBarExpanded ? "w-56 px-4" : "w-16"
        )}
        style={{ backgroundColor: '#0A0A0B' }}
      >
        <div className={cn("flex items-center w-full mb-8", domainBarExpanded ? "justify-between px-2" : "justify-center")}>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 bg-red-600 rounded-lg flex items-center justify-center shadow-lg shadow-red-900/40">
              <span className="text-xl font-black text-white italic">R</span>
            </div>
            {domainBarExpanded && <span className="text-lg font-black text-white italic tracking-tighter">restin.ai</span>}
          </div>
          {domainBarExpanded && (
            <Button variant="ghost" size="icon" onClick={toggleDomainExpand} className="text-zinc-500 hover:text-white h-8 w-8">
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}
        </div>

        <div className="flex-1 w-full space-y-2">
          {domains.map((domain) => (
            <button
              key={domain.id}
              onClick={() => handleDomainClick(domain.id)}
              className={cn(
                'group relative flex items-center rounded-xl transition-all duration-300 w-full',
                domainBarExpanded ? 'px-4 py-3 gap-3' : 'h-11 w-11 justify-center mx-auto',
                activeDomain === domain.id
                  ? 'bg-red-600 shadow-[0_0_20px_rgba(229,57,53,0.3)] text-white'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
              )}
            >
              <domain.icon className={cn("shrink-0", domainBarExpanded ? "h-5 w-5" : "h-5 w-5")} />
              {domainBarExpanded && (
                <span className="text-sm font-bold truncate uppercase tracking-widest">{domain.title}</span>
              )}
              {activeDomain === domain.id && !domainBarExpanded && (
                <div className="absolute left-[-16px] w-[3px] h-6 bg-white rounded-r-full shadow-[0_0_12px_rgba(255,255,255,0.8)]" />
              )}
              {!domainBarExpanded && (
                <div className="absolute left-16 px-3 py-1 bg-zinc-800 text-white text-[10px] font-bold rounded-md opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 uppercase tracking-widest border border-white/5 shadow-2xl">
                  {domain.title}
                </div>
              )}
            </button>
          ))}
        </div>

        <div className="mt-auto w-full flex flex-col items-center gap-2">
          {collapsed && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggle}
              className={cn(
                "h-11 w-11 rounded-xl text-zinc-500 hover:text-white hover:bg-white/5 transition-all",
                domainBarExpanded && "w-full justify-start px-4 gap-3"
              )}
            >
              <ChevronRight className="h-5 w-5" />
              {domainBarExpanded && <span className="text-sm font-bold uppercase tracking-widest">Open Menu</span>}
            </Button>
          )}
          <button
            onClick={toggleDomainExpand}
            className={cn(
              "h-11 w-11 flex items-center justify-center rounded-xl text-zinc-500 hover:text-white hover:bg-white/5 transition-all",
              domainBarExpanded && "w-full justify-start px-4 gap-3"
            )}
          >
            {domainBarExpanded ? <ChevronLeft className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
            {domainBarExpanded && <span className="text-sm font-bold uppercase tracking-widest">Collapse Bar</span>}
          </button>
        </div>
      </aside>

      {/* Pane 2: Original Accordion Bar */}
      <aside
        className={cn(
          'w-64 h-full flex flex-col transition-all duration-300 border-r border-white/5 overflow-hidden shadow-2xl',
          collapsed ? 'w-0' : 'w-64'
        )}
        style={{ backgroundColor: '#0A0A0B' }}
      >
        <div className="flex items-center justify-between h-16 px-4 shrink-0" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
          {!collapsed && (
            <h1 className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-100">
              {domains.find(d => d.id === activeDomain)?.title || 'Navigation'}
            </h1>
          )}
          <Button variant="ghost" size="icon" onClick={onToggle} className="text-zinc-400">
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>

        <ScrollArea className="flex-1 px-3 py-4">
          <nav className="space-y-1">
            {menuItems
              .filter(item => getDomainForGroup(item.group) === activeDomain)
              .map((item) => (
                <div key={item.title}>
                  {item.href && !item.children ? (
                    <Link
                      to={item.href}
                      className={cn('flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200', collapsed && 'justify-center')}
                      style={isActive(item.href) ? {
                        backgroundColor: 'rgba(239, 68, 68, 0.15)',
                        color: '#EF4444',
                        border: '1px solid rgba(239, 68, 68, 0.3)'
                      } : { color: '#E2E8F0', border: '1px solid transparent' }}
                      onClick={() => setActiveSubItem(item)}
                    >
                      <item.icon className="h-5 w-5 flex-shrink-0" />
                      {!collapsed && <span className="text-sm font-medium">{item.title}</span>}
                    </Link>
                  ) : (
                    <div className="space-y-1">
                      <button
                        onClick={() => !collapsed && toggleGroup(item.group)}
                        className={cn('w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200', collapsed && 'justify-center')}
                        style={{ backgroundColor: isGroupActive(item.children) ? 'rgba(255, 255, 255, 0.05)' : 'transparent', color: isGroupActive(item.children) ? '#F8FAFC' : '#CBD5E1' }}
                      >
                        <item.icon className="h-5 w-5 flex-shrink-0" />
                        {!collapsed && (
                          <>
                            <span className="flex-1 text-left text-sm font-medium">{item.title}</span>
                            <ChevronRight className={cn('h-4 w-4 transition-transform', expandedGroups.includes(item.group) && 'rotate-90')} />
                          </>
                        )}
                      </button>
                      {!collapsed && expandedGroups.includes(item.group) && item.children && (
                        <div className="ml-6 space-y-1 mt-1">
                          {item.children.map((child) => (
                            <button
                              key={child.href}
                              onClick={() => {
                                navigate(child.href);
                                setActiveSubItem(child);
                              }}
                              className={cn('w-full text-left block px-3 py-1.5 rounded-md text-sm transition-colors border outline-none')}
                              style={isActive(child.href) ? { backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#EF4444', border: '1px solid rgba(239, 68, 68, 0.3)', fontWeight: 600 } : { color: '#CBD5E1', border: '1px solid transparent' }}
                            >
                              {child.title}
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

      {/* Pane 3: Tertiary Segment */}
      <aside
        className={cn(
          'h-full flex flex-col transition-all duration-300 border-r border-white/5 shadow-inner',
          hasTertiary ? 'w-56 opacity-100' : 'w-0 opacity-0 overflow-hidden border-none'
        )}
        style={{ backgroundColor: '#070708' }}
      >
        <div className="h-16 flex items-center px-6 border-b border-white/5">
          <h2 className="text-[10px] font-bold uppercase tracking-[0.1em] text-zinc-400">
            {activeSubItem?.title} Details
          </h2>
        </div>
        <ScrollArea className="flex-1 px-3 py-6">
          <nav className="space-y-1">
            {activeSubItem?.subs?.map((sub) => (
              <Button
                key={sub.id}
                variant="ghost"
                className={cn(
                  'w-full justify-start gap-3 px-4 py-2.5 h-auto rounded-lg text-[11px] font-bold transition-all border border-transparent',
                  location.search.includes(`type=${sub.id}`)
                    ? 'bg-red-600/10 text-red-500 border-red-600/20'
                    : 'text-zinc-500 hover:bg-white/5 hover:text-zinc-200'
                )}
                onClick={() => {
                  navigate(`${activeSubItem.href}?type=${sub.id}`);
                }}
              >
                {sub.title}
              </Button>
            ))}
          </nav>
        </ScrollArea>
      </aside>
    </div>
  );
}
