import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { ChevronLeft, ChevronRight, LayoutDashboard, ShoppingCart, Monitor, Users, FileText, DollarSign, BarChart3, Settings, Menu, Sparkles } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const menuItems = [
  {
    title: 'Dashboard',
    icon: LayoutDashboard,
    href: '/admin/dashboard',
    group: 'main'
  },
  {
    title: 'Operations',
    icon: ShoppingCart,
    group: 'operations',
    children: [
      { title: 'POS Setup', href: '/pos/setup' },
      { title: 'KDS Setup', href: '/kds/setup' },
      { title: 'Floor Plans', href: '/admin/floor-plans' },
      { title: 'Reservations', href: '/admin/reservations' },
      { title: 'Operations', href: '/admin/operations' },
      { title: '📋 Tasks Kanban', href: '/admin/tasks-kanban' },
      { title: '📥 Inbox', href: '/admin/inbox' },
      { title: '🌙 Service Day Close', href: '/admin/service-day-close' },
      { title: '🎯 Pre-Go-Live', href: '/admin/pre-go-live' }
    ]
  },
  {
    title: 'People',
    icon: Users,
    group: 'people',
    children: [
      { title: 'Staff Management', href: '/admin/staff' },
      { title: 'HR Hub', href: '/admin/hr' },
      { title: 'Users', href: '/admin/users' },
      { title: 'Payroll Calculator', href: '/admin/payroll-calculator' },
      { title: 'Employee Portal', href: '/employee' }
    ]
  },
  {
    title: 'Menu & Inventory',
    icon: FileText,
    group: 'menu',
    children: [
      { title: 'Menu Management', href: '/admin/menu' },
      { title: 'Inventory', href: '/admin/inventory' },
      { title: '📦 Inventory Detail', href: '/admin/inventory-detail' },
      { title: 'Suppliers', href: '/admin/suppliers' },
      { title: 'Purchase Orders', href: '/admin/purchase-orders' },
      { title: 'Receiving', href: '/admin/receiving' },
      { title: 'Guests', href: '/admin/guests' },
      { title: '🛒 Procurement Hub', href: '/admin/procurement' },
      { title: '🧾 AI Invoices', href: '/admin/ai-invoice' },
      { title: '🍳 Central Kitchen', href: '/admin/central-kitchen' },
      { title: '🔮 Forecasting', href: '/admin/forecasting' },
      { title: '✅ Quality Control', href: '/admin/quality' },
      { title: '🧪 Recipe Engineering', href: '/admin/recipe-engineering' }
    ]
  },
  {
    title: 'Finance',
    icon: DollarSign,
    group: 'finance',
    children: [
      { title: 'Finance Dashboard', href: '/admin/finance' },
      { title: 'Accounting (Malta)', href: '/admin/accounting-malta' },
      { title: '🔗 Finance Provider', href: '/admin/finance-provider' },
      { title: 'Audit Logs', href: '/admin/audit-logs' },
      { title: '💶 Payroll Malta', href: '/admin/payroll-malta' }
    ]
  },
  {
    title: 'Reports & Analytics',
    icon: BarChart3,
    group: 'reports',
    children: [
      {
        title: 'Reporting Hub', href: '/admin/reporting',
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
      {
        title: 'Sales Analytics', href: '/admin/reports/sales',
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
      { title: 'Observability', href: '/admin/observability' },
      { title: '📊 Analytics', href: '/admin/analytics' },
      { title: '🎁 Loyalty', href: '/admin/loyalty' },
      { title: '🛡️ Trust & Resilience', href: '/admin/trust' }
    ]
  },
  {
    title: 'AI Hub',
    icon: Sparkles,
    group: 'ai',
    children: [
      { title: '📞 Voice AI', href: '/admin/ai/voice' },
      { title: '🎨 Studio', href: '/admin/ai/studio' },
      { title: '🌐 Web Builder', href: '/admin/ai/web-builder' },
      { title: '🔬 Radar', href: '/admin/ai/radar' },
      { title: '🤖 CRM', href: '/admin/ai/crm' },
      { title: '💳 Fintech', href: '/admin/ai/fintech' },
      { title: '👥 Ops Hub', href: '/admin/ai/ops' }
    ]
  },
  {
    title: 'Settings',
    icon: Settings,
    group: 'settings',
    children: [
      { title: 'Venue Settings', href: '/admin/settings' },
      { title: 'Device Hub', href: '/admin/devices' },
      { title: 'Settings Hub', href: '/admin/settings-hub' },
      { title: 'Theme Customizer', href: '/admin/theme' },
      { title: 'Updates', href: '/admin/updates' },
      { title: '🔌 Integration Hub', href: '/admin/integrations' },
      { title: '🚚 Delivery Aggregators', href: '/admin/delivery-aggregators' },
      { title: '🔵 External Connector', href: '/admin/google' },
      { title: '🚀 Microservices', href: '/admin/microservices' },
      { title: '⚡ Event Monitor', href: '/admin/events' },
      { title: '⚙️ Automations', href: '/admin/automations' },
      { title: '🔌 Connectors', href: '/admin/connectors' }
    ]
  }
];

export default function Sidebar({ collapsed, onToggle, onTertiaryToggle }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentTheme } = useTheme();

  // Find state based on current path
  const findActiveState = () => {
    for (const item of menuItems) {
      if (item.href === location.pathname) return { group: item.group, subItem: null };
      if (item.children) {
        for (const child of item.children) {
          if (child.href === location.pathname) return { group: item.group, subItem: child };
        }
      }
    }
    return { group: 'main', subItem: null };
  };

  const [activeGroup, setActiveGroup] = useState(() => findActiveState().group);
  const [activeSubItem, setActiveSubItem] = useState(() => findActiveState().subItem);
  const [lastPath, setLastPath] = useState(location.pathname);

  const isActive = (href) => location.pathname === href;
  const activeMenuItem = menuItems.find(item => item.group === activeGroup);

  const hasTertiary = activeSubItem?.subs?.length > 0;

  // Only sync from URL if the path actually changed (to allow manual exploration)
  React.useEffect(() => {
    if (location.pathname !== lastPath) {
      const { group, subItem } = findActiveState();
      setActiveGroup(group);
      setActiveSubItem(subItem);
      setLastPath(location.pathname);
    }
  }, [location.pathname, lastPath]);

  React.useEffect(() => {
    onTertiaryToggle?.(hasTertiary);
  }, [hasTertiary, onTertiaryToggle]);

  return (
    <div className="fixed left-0 top-0 z-40 h-screen flex transition-all duration-300">
      {/* Primary Sidebar (Slim) */}
      <aside
        className="w-16 h-full flex flex-col items-center py-4 gap-4 border-r border-white/5"
        style={{ backgroundColor: '#0A0A0B' }}
      >
        <div className="h-10 w-10 flex items-center justify-center mb-4">
          <h1 className="text-xl font-bold text-white">r<span className="text-red-500">.</span></h1>
        </div>

        {menuItems.map((item) => (
          <button
            key={item.group}
            onClick={() => {
              setActiveGroup(item.group);
              // When clicking domain, if we are ALREADY on a page in this group, 
              // show the 3rd pane for that page if it exists.
              const activeChild = item.children?.find(c => isActive(c.href));
              setActiveSubItem(activeChild || null);
            }}
            className={cn(
              'group relative h-11 w-11 flex items-center justify-center rounded-xl transition-all duration-300',
              activeGroup === item.group ? 'bg-red-600/10 text-red-500' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
            )}
          >
            <item.icon className="h-5 w-5" />
            {/* Active Indicator Bar */}
            {activeGroup === item.group && (
              <div className="absolute left-[-16px] w-[3px] h-6 bg-red-600 rounded-r-full shadow-[0_0_12px_rgba(229,57,53,0.5)]" />
            )}
            {/* Tooltip */}
            <div className="absolute left-16 px-3 py-1 bg-zinc-800 text-white text-[10px] font-bold rounded-md opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 uppercase tracking-widest border border-white/5">
              {item.title}
            </div>
          </button>
        ))}
      </aside>

      {/* Secondary Sidebar (Wide) */}
      <aside
        className={cn(
          'w-60 h-full flex flex-col transition-all duration-300 border-r border-white/5 shadow-2xl',
          collapsed ? 'w-0 overflow-hidden border-none' : 'w-60'
        )}
        style={{ backgroundColor: '#18181B' }}
      >
        {/* Secondary Header */}
        <div className="h-16 flex items-center px-6 border-b border-white/5">
          <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-100">
            {activeMenuItem?.title || 'Menu'}
          </h2>
        </div>

        <ScrollArea className="flex-1 px-4 py-6">
          <nav className="space-y-1.5">
            {activeMenuItem?.href && (
              <Link
                to={activeMenuItem.href}
                className={cn(
                  'flex items-center gap-3 px-4 py-2.5 rounded-xl text-[12px] font-bold transition-all border outline-none',
                  isActive(activeMenuItem.href) && !activeSubItem
                    ? 'bg-red-600/10 text-red-500 border-red-600/30'
                    : 'text-zinc-400 border-transparent hover:bg-zinc-800/50 hover:text-zinc-200'
                )}
                onClick={() => setActiveSubItem(null)}
              >
                Overview
              </Link>
            )}

            {activeMenuItem?.children?.map((child) => (
              <button
                key={child.href}
                onClick={() => {
                  if (child.subs) {
                    setActiveSubItem(child);
                  } else {
                    setActiveSubItem(null);
                  }
                  navigate(child.href);
                }}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-[12px] font-bold transition-all border outline-none tracking-tight text-left',
                  (isActive(child.href) || activeSubItem?.href === child.href)
                    ? 'bg-red-600/10 text-red-500 border-red-600/30 shadow-lg shadow-red-900/5'
                    : 'text-zinc-400 border-transparent hover:bg-zinc-800/50 hover:text-zinc-200'
                )}
              >
                {child.title}
                {child.subs && <ChevronRight className={cn("ml-auto h-3 w-3 transition-transform", activeSubItem?.href === child.href && "rotate-90")} />}
              </button>
            ))}
          </nav>
        </ScrollArea>

        {/* Sidebar Footer */}
        {!collapsed && (
          <div className="p-4 border-t border-white/5 bg-zinc-900/20">
            <div className="flex items-center gap-3 mb-4 px-2">
              <div className="h-8 w-8 rounded-lg border border-white/10 flex items-center justify-center bg-zinc-800 text-[10px] font-black text-zinc-400 uppercase">
                CB
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-bold text-white truncate">Caviar & Bull</p>
                <p className="text-[9px] text-zinc-500 truncate font-medium">experience@caviarandbull.com</p>
              </div>
            </div>

            <div className="flex items-center justify-between px-2">
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500 hover:text-white hover:bg-zinc-800">
                  <Monitor className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500 hover:text-white hover:bg-zinc-800">
                  <Users className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500 hover:text-white hover:bg-zinc-800">
                  <Settings className="h-4 w-4" />
                </Button>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onToggle}
                className="h-8 w-8 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 transition-colors"
              >
                <ChevronLeft className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")} />
              </Button>
            </div>
          </div>
        )}
      </aside>

      {/* Tertiary Sidebar (Narrower, Vertical List) */}
      <aside
        className={cn(
          'h-full flex flex-col transition-all duration-300 border-r border-white/5',
          hasTertiary ? 'w-48 opacity-100' : 'w-0 opacity-0 overflow-hidden border-none'
        )}
        style={{ backgroundColor: '#101012' }}
      >
        <div className="h-16 flex items-center px-6 border-b border-white/5">
          <h2 className="text-[10px] font-bold uppercase tracking-[0.1em] text-zinc-400">
            Select {activeSubItem?.title}
          </h2>
        </div>
        <ScrollArea className="flex-1 px-3 py-6">
          <nav className="space-y-1">
            {activeSubItem?.subs?.map((sub) => (
              <Button
                key={sub.id}
                variant="ghost"
                className={cn(
                  'w-full justify-start gap-3 px-4 py-2 h-auto rounded-lg text-[11px] font-bold transition-all border border-transparent',
                  isActive(activeSubItem.href) && location.search.includes(`type=${sub.id}`) || (isActive(activeSubItem.href) && !location.search && sub.id === 'summary')
                    ? 'bg-red-600/10 text-red-500 border-red-600/20 shadow-sm'
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
    </div >
  );
}
