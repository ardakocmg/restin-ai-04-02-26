'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@antigravity/ui';
import { Button } from '@antigravity/ui';
import { ScrollArea } from '@antigravity/ui';
import {
    ChevronLeft, ChevronRight, LayoutDashboard, ShoppingCart, Users, FileText,
    DollarSign, BarChart3, Settings, Activity, Zap, TrendingUp, Factory, Award,
    Table as TableIcon, Calendar, Truck, PieChart as PieChartIcon,
    UserCheck, Receipt, Clock, Package, Type, Building2
} from 'lucide-react';

const menuItems = [
    // HOME / MAIN
    { title: 'Dashboard', icon: LayoutDashboard, href: '/dashboard', group: 'main' },
    { title: 'Observability', icon: Activity, href: '/dashboard/observability', group: 'main' },

    // POS & OPERATIONS
    { title: 'POS Dashboard', icon: LayoutDashboard, href: '/dashboard/pos', group: 'pos' },
    {
        title: 'Sales Analytics', icon: BarChart3, href: '/dashboard/reports/sales', group: 'pos',
        subs: [
            { title: 'Summary Reports', id: 'summary' },
            { title: 'Revenue Reports', id: 'revenue' },
            { title: 'Shift Reports', id: 'shift' },
            { title: 'Hour Reports', id: 'hour' },
            { title: 'Export Data', id: 'export' }
        ]
    },
    { title: 'Products', icon: ShoppingCart, href: '/dashboard/products', group: 'pos' },
    { title: 'Tables', icon: TableIcon, href: '/dashboard/tables', group: 'pos' },
    { title: 'Reservations', icon: Calendar, href: '/dashboard/reservations', group: 'pos' },

    // HUMAN RESOURCES
    { title: 'HR Dashboard', icon: Users, href: '/dashboard/hr', group: 'hr' },
    { title: 'Employees', icon: UserCheck, href: '/dashboard/hr/people', group: 'hr' },
    { title: 'Payroll', icon: DollarSign, href: '/dashboard/hr/payroll', group: 'hr' },
    { title: 'Scheduler', icon: Clock, href: '/dashboard/hr/scheduler', group: 'hr' },

    // INVENTORY
    { title: 'Inventory Hub', icon: Package, href: '/dashboard/inventory', group: 'inventory' },
    { title: 'Suppliers', icon: Truck, href: '/dashboard/inventory/suppliers', group: 'inventory' },
    { title: 'Recipes', icon: Factory, href: '/dashboard/inventory/recipes', group: 'inventory' },

    // FINANCE
    { title: 'Finance', icon: DollarSign, href: '/dashboard/finance', group: 'finance' },
    { title: 'Audit Logs', icon: Activity, href: '/dashboard/audit', group: 'finance' },

    // SETTINGS
    { title: 'Settings', icon: Settings, href: '/dashboard/settings', group: 'settings' },
];

interface SidebarProps {
    collapsed: boolean;
    onToggle: () => void;
    onTertiaryToggle?: (isOpen: boolean) => void;
    onDomainExpand?: (expanded: boolean) => void;
}

export function Sidebar({ collapsed, onToggle, onTertiaryToggle, onDomainExpand }: SidebarProps) {
    const pathname = usePathname();
    const router = useRouter();

    // Domain Groups (Pane 1)
    const domains = [
        { id: 'home', title: 'Home', icon: LayoutDashboard },
        { id: 'pos', title: 'POS & Ops', icon: ShoppingCart },
        { id: 'hr', title: 'HR & People', icon: Users },
        { id: 'inventory', title: 'Inventory', icon: FileText },
        { id: 'finance', title: 'Finance', icon: DollarSign },
        { id: 'cpu', title: 'Central Kitchen', icon: Zap },
        { id: 'technical', title: 'Technical Hub', icon: Activity },
    ];

    // Map modules to domains
    const getDomainForGroup = (group: string): string => {
        if (group === 'main') return 'home';
        if (['pos', 'operations'].includes(group)) return 'pos';
        if (['hr', 'staff'].includes(group)) return 'hr';
        if (['inventory', 'menu', 'procurement'].includes(group)) return 'inventory';
        if (['finance'].includes(group)) return 'finance';
        if (['settings'].includes(group)) return 'settings';
        return 'home';
    };

    const [activeDomain, setActiveDomain] = useState('home');
    const [expandedGroups, setExpandedGroups] = useState(['main', 'pos', 'hr']);
    const [activeSubItem, setActiveSubItem] = useState<any>(null);
    const [domainBarExpanded, setDomainBarExpanded] = useState(false);

    const handleDomainClick = (id: string) => {
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

    const isActive = (href: string) => pathname === href;
    const isGroupActive = (children: any[]) => children?.some(child => pathname === child.href);

    const hasTertiary = activeSubItem?.subs?.length > 0;

    useEffect(() => {
        onTertiaryToggle?.(hasTertiary);
    }, [hasTertiary, onTertiaryToggle]);

    const toggleGroup = (group: string) => {
        setExpandedGroups(prev =>
            prev.includes(group)
                ? prev.filter(g => g !== group)
                : [...prev, group]
        );
    };

    return (
        <div className="fixed left-0 top-0 z-40 h-screen flex transition-all duration-300 font-sans">
            {/* Pane 1: Slim Domain Bar */}
            <aside
                className={cn(
                    "h-full flex flex-col items-center py-4 gap-4 border-r border-white/5 transition-all duration-300 shadow-[20px_0_40px_rgba(0,0,0,0.5)] z-50",
                    domainBarExpanded ? "w-64 px-4 bg-zinc-950/95 backdrop-blur-xl" : "w-20 bg-zinc-950"
                )}
            >
                <div className={cn("flex items-center w-full mb-8", domainBarExpanded ? "justify-between px-2" : "justify-center")}>
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-gradient-to-br from-red-600 to-red-800 rounded-xl flex items-center justify-center shadow-[0_0_25px_rgba(220,38,38,0.4)] border border-red-500/20">
                            <span className="text-2xl font-black text-white italic transform -skew-x-6">R</span>
                        </div>
                        {domainBarExpanded && (
                            <div className="flex flex-col">
                                <span className="text-xl font-black text-white italic tracking-tighter leading-none">restin.ai</span>
                                <span className="text-[10px] font-bold text-red-500 tracking-[0.3em] uppercase">Enterprise</span>
                            </div>
                        )}
                    </div>
                    {domainBarExpanded && (
                        <Button variant="ghost" size="icon" onClick={toggleDomainExpand} className="text-zinc-500 hover:text-white h-8 w-8 hover:bg-white/5">
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                    )}
                </div>

                <div className="flex-1 w-full space-y-3">
                    {domains.map((domain: { id: string; title: string; icon: any }) => (
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
            </aside>

            {/* Pane 2: Original Accordion Bar */}
            <aside
                className={cn(
                    'h-full flex flex-col transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] border-r border-white/5 overflow-hidden shadow-[10px_0_30px_rgba(0,0,0,0.3)] z-40 bg-zinc-950',
                    collapsed ? 'w-0 opacity-0' : 'w-72 opacity-100'
                )}
            >
                <div className="flex items-center justify-between h-20 px-6 shrink-0 border-b border-white/5 bg-zinc-950/50 backdrop-blur-sm">
                    {!collapsed && (
                        <h1 className="text-xs font-black uppercase tracking-[0.25em] text-zinc-400">
                            {domains.find(d => d.id === activeDomain)?.title || 'Navigation'}
                        </h1>
                    )}
                    <Button variant="ghost" size="icon" onClick={onToggle} className="text-zinc-500 hover:text-white hover:bg-white/5 h-8 w-8 rounded-lg">
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                </div>

                <ScrollArea className="flex-1 px-4 py-6">
                    <nav className="space-y-1.5">
                        {menuItems
                            .filter(item => getDomainForGroup(item.group) === activeDomain)
                            .map((item: any) => (
                                <div key={item.title}>
                                    {item.href && !item.children ? (
                                        <Link
                                            href={item.href}
                                            className={cn(
                                                'group flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all duration-200 border border-transparent',
                                                collapsed && 'justify-center'
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
                                                onClick={() => !collapsed && toggleGroup(item.group)}
                                                className={cn(
                                                    'w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all duration-200 group hover:bg-white/5',
                                                    collapsed && 'justify-center'
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
                    'h-full flex flex-col transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] border-r border-white/5 shadow-inner z-30 bg-[#050506]',
                    hasTertiary ? 'w-60 opacity-100 translate-x-0' : 'w-0 opacity-0 -translate-x-full overflow-hidden border-none'
                )}
            >
                <div className="h-20 flex items-center px-6 border-b border-white/5 bg-[#050506]/80 backdrop-blur-sm">
                    <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-zinc-700"></span>
                        {activeSubItem?.title}
                    </h2>
                </div>
                <ScrollArea className="flex-1 px-4 py-6">
                    <nav className="space-y-2">
                        {activeSubItem?.subs?.map((sub: any) => (
                            <Button
                                key={sub.id}
                                variant="ghost"
                                className={cn(
                                    'w-full justify-start gap-3 px-4 py-6 h-auto rounded-xl text-xs font-bold transition-all border border-transparent group relative overflow-hidden',
                                    'text-zinc-500 hover:bg-white/5 hover:text-zinc-200'
                                )}
                                onClick={() => {
                                    // navigate(`${activeSubItem.href}?type=${sub.id}`);
                                }}
                            >
                                <div className={cn("w-1.5 h-1.5 rounded-full transition-all bg-zinc-800 group-hover:bg-zinc-600")}></div>
                                {sub.title}
                            </Button>
                        ))}
                    </nav>
                </ScrollArea>
            </aside>
        </div>
    );
}
