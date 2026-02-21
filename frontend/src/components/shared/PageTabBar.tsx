import {
DropdownMenu,
DropdownMenuContent,
DropdownMenuItem,
DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/features/auth/AuthContext';
import { useBreadcrumbActions,type BreadcrumbAction } from '@/hooks/useBreadcrumbActions';
import { logger } from '@/lib/logger';
import { ROLE_HIERARCHY } from '@/lib/roles';
import { MENU_ITEMS,type MenuItem } from '@/lib/searchRegistry';
import { cn } from '@/lib/utils';
import { MoreHorizontal } from 'lucide-react';
import React,{ useCallback,useEffect,useMemo,useRef,useState } from 'react';
import { Link,useLocation,useNavigate } from 'react-router-dom';

/**
 * PageTabBar — Single unified navigation bar below the TopBar.
 *
 * Layout: [Sibling Page Tabs ...] | [⋮ +N] | ─── | [Action Buttons]
 *
 * Left: sibling page tabs with icons (detected from current route's parent group)
 * Right: contextual action buttons (Add Product, Import, Export, etc.)
 * Overflow tabs go to ⋮ (3-dot) "More" menu.
 */
export default function PageTabBar(): React.ReactElement | null {
    const location = useLocation();
    const navigate = useNavigate();
    const { user } = useAuth();
    const actions = useBreadcrumbActions();
    const containerRef = useRef<HTMLDivElement>(null);
    const [visibleCount, setVisibleCount] = useState<number>(100);

    const uLevel = ROLE_HIERARCHY[user?.role ?? ''] ?? 0;

    // Find all sibling pages for current route
    const siblingPages = useMemo<MenuItem[]>(() => {
        const currentPath = location.pathname;

        // Step 1: Check if the current path is a child of an accordion parent
        for (const item of MENU_ITEMS) {
            if (uLevel < (ROLE_HIERARCHY[item.requiredRole] ?? 0)) continue;

            if (item.children && item.children.length > 0) {
                const isInChildren = item.children.some(c =>
                    currentPath === c.href || currentPath.startsWith(c.href + '/')
                );
                if (isInChildren) {
                    return item.children.filter(c =>
                        uLevel >= (ROLE_HIERARCHY[c.requiredRole] ?? 0)
                    );
                }
            }
        }

        // Step 2: If not in accordion, check if we're on a top-level page
        // and show all items in the same group
        const currentItem = MENU_ITEMS.find(item =>
            currentPath === item.href || currentPath.startsWith(item.href + '/')
        );
        if (currentItem) {
            return MENU_ITEMS.filter(item =>
                item.group === currentItem.group &&
                uLevel >= (ROLE_HIERARCHY[item.requiredRole] ?? 0) &&
                !item.children // Only show leaf items, not accordion parents
            );
        }

        return [];
    }, [location.pathname, uLevel]);

    // Measure container and calculate how many tabs fit
    const measureTabs = useCallback(() => {
        if (!containerRef.current) return;
        const tabsContainer = containerRef.current.querySelector('[data-tabs-row]');
        if (!tabsContainer) return;
        const containerWidth = (tabsContainer as HTMLElement).offsetWidth - 80; // Reserve space for ⋮
        const tabElements = tabsContainer.querySelectorAll('[data-tab-item]');
        let totalWidth = 0;
        let count = 0;
        tabElements.forEach((el) => {
            totalWidth += (el as HTMLElement).offsetWidth + 4;
            if (totalWidth < containerWidth) count++;
        });
        setVisibleCount(Math.max(count, 3));
    }, []);

    useEffect(() => {
        measureTabs();
        const observer = new ResizeObserver(measureTabs);
        if (containerRef.current) observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, [measureTabs, siblingPages]);

    const handleAction = (action: BreadcrumbAction): void => {
        if (action.href) {
            navigate(action.href);
        } else {
            const event = new CustomEvent('breadcrumb-action', { detail: { actionId: action.id } });
            window.dispatchEvent(event);
            logger.debug('PageTabBar action triggered', { actionId: action.id });
        }
    };

    // Don't render if no tabs
    if (siblingPages.length <= 1) return null;

    const visibleTabs = siblingPages.slice(0, visibleCount);
    const overflowTabs = siblingPages.slice(visibleCount);
    const hasOverflow = overflowTabs.length > 0;
    const isActive = (href: string) =>
        location.pathname === href || location.pathname.startsWith(href + '/');

    return (
        <div
            ref={containerRef}
            className="flex items-center gap-2 px-4 lg:px-6 py-1.5 overflow-hidden border-b border-white/[0.03]"
        >
            {/* Sibling Page Tabs */}
            <div className="flex items-center gap-1 overflow-hidden min-w-0" data-tabs-row>
                {visibleTabs.map((tab) => {
                    const TabIcon = tab.icon;
                    const active = isActive(tab.href);
                    return (
                        <Link
                            key={tab.href}
                            to={tab.href}
                            data-tab-item
                            className={cn(
                                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 whitespace-nowrap shrink-0 relative',
                                active
                                    ? 'bg-red-500/[0.08] text-red-400 border border-red-500/15 shadow-[0_0_12px_rgba(229,57,53,0.1)]'
                                    : 'text-muted-foreground hover:text-secondary-foreground hover:bg-white/[0.04] border border-transparent'
                            )}
                        >
                            <TabIcon className={cn('h-3.5 w-3.5 shrink-0', active ? 'text-red-400' : 'text-muted-foreground')} />
                            <span>{tab.title}</span>
                            {active && (
                                <div className="absolute bottom-0 left-3 right-3 h-0.5 bg-red-500 rounded-full shadow-[0_0_6px_rgba(229,57,53,0.6)]" />
                            )}
                        </Link>
                    );
                })}

                {/* Overflow ⋮ Menu */}
                {hasOverflow && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground hover:text-secondary-foreground hover:bg-white/[0.04] transition-all shrink-0 outline-none">
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="text-[10px] text-muted-foreground font-bold">+{overflowTabs.length}</span>
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-56 bg-[#0F0F10] border-border text-secondary-foreground max-h-72 overflow-y-auto">
                            {overflowTabs.map((tab) => {
                                const TabIcon = tab.icon;
                                const active = isActive(tab.href);
                                return (
                                    <DropdownMenuItem key={tab.href} asChild>
                                        <Link
                                            to={tab.href}
                                            className={cn(
                                                'flex items-center gap-3 px-3 py-2.5 cursor-pointer font-medium rounded-lg mx-1 my-0.5',
                                                active
                                                    ? 'bg-red-500/10 text-red-400'
                                                    : 'text-muted-foreground hover:text-foreground focus:bg-white/5'
                                            )}
                                        >
                                            <TabIcon className={cn('h-4 w-4 shrink-0', active ? 'text-red-400' : 'text-muted-foreground')} />
                                            <span className="text-sm truncate">{tab.title}</span>
                                        </Link>
                                    </DropdownMenuItem>
                                );
                            })}
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </div>
        </div>
    );
}
