import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '../features/auth/AuthContext';
import { MENU_ITEMS, DOMAINS, getDomainForGroup, type MenuItem, type Domain } from '@/lib/searchRegistry';
import { ChevronRight, ChevronLeft, ChevronDown, Search, X, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ROLE_HIERARCHY } from '../lib/roles';
import { useNotifications } from '@/hooks/useNotifications';

// ─── Types ───────────────────────────────────────────────────────────

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  onTertiaryToggle?: (open: boolean) => void;
  onDomainExpand?: (expanded: boolean) => void;
}

const menuItems: MenuItem[] = MENU_ITEMS;

export default function NewSidebar({ collapsed, onToggle, onTertiaryToggle }: SidebarProps): React.ReactElement {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const userLevel = ROLE_HIERARCHY[user?.role ?? ''] ?? 0;
  const canSeeItem = (item: MenuItem): boolean => userLevel >= (ROLE_HIERARCHY[item.requiredRole] ?? 0);
  const visibleMenuItems = useMemo<MenuItem[]>(() => menuItems.filter(canSeeItem), [userLevel]);

  const domains = DOMAINS;

  // Only show domains that have at least one visible menu item
  const visibleDomains = useMemo(() => {
    const visibleDomainIds = new Set(visibleMenuItems.map(item => getDomainForGroup(item.group)));
    return domains.filter(d => visibleDomainIds.has(d.id));
  }, [userLevel]) as Domain[];

  const [searchTerm, setSearchTerm] = useState<string>('');

  // Track which domain sections are expanded
  const [expandedDomains, setExpandedDomains] = useState<string[]>(() => {
    // Auto-expand domain of current page
    for (const item of MENU_ITEMS) {
      if (item.href === location.pathname || item.children?.some(c => c.href === location.pathname)) {
        return [getDomainForGroup(item.group)];
      }
    }
    return ['home'];
  });

  // Track which accordion parents are expanded (items with children)
  const [expandedAccordions, setExpandedAccordions] = useState<string[]>(() => {
    const expanded: string[] = [];
    for (const item of MENU_ITEMS) {
      if (item.children?.some(c => c.href === location.pathname || location.pathname.startsWith(c.href))) {
        expanded.push(item.title);
      }
    }
    return expanded;
  });

  // Pinned pages
  const PINS_KEY = 'restin:pinned-pages';
  const [pinnedPages, setPinnedPages] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(PINS_KEY) || '[]') as string[]; }
    catch { return []; }
  });

  const togglePin = useCallback((href: string): void => {
    setPinnedPages((prev: string[]) => {
      const next = prev.includes(href)
        ? prev.filter((p: string) => p !== href)
        : [...prev, href];
      try { localStorage.setItem(PINS_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, []);

  const isPinned = (href: string): boolean => pinnedPages.includes(href);

  const isActive = (href: string): boolean => location.pathname === href || location.pathname.startsWith(href + '/');
  const isChildActive = (children?: MenuItem[]): boolean => !!children?.some((c: MenuItem) => isActive(c.href));

  // Check if any item in a domain is currently active
  const isDomainActive = (domainId: string): boolean => {
    const items = itemsByDomain[domainId] || [];
    return items.some(item => isActive(item.href) || isChildActive(item.children));
  };

  // Live notification badge counts from API (30s polling)
  const { domainBadges, itemBadges } = useNotifications();

  const getItemBadge = (href: string): number => itemBadges[href] || 0;

  // Get total badges for an accordion parent (sum of its children)
  const getAccordionBadge = (item: MenuItem): number => {
    let count = getItemBadge(item.href);
    if (item.children) {
      count += item.children.reduce((sum, c) => sum + (itemBadges[c.href] || 0), 0);
    }
    return count;
  };

  // Auto-expand domain & accordion for current route
  useEffect(() => {
    for (const item of visibleMenuItems) {
      const domainId = getDomainForGroup(item.group);
      const directMatch = item.href === location.pathname;
      const childMatch = item.children?.some(c => isActive(c.href));

      if (directMatch || childMatch) {
        if (!expandedDomains.includes(domainId)) {
          setExpandedDomains(prev => [...prev, domainId]);
        }
        if (childMatch && !expandedAccordions.includes(item.title)) {
          setExpandedAccordions(prev => [...prev, item.title]);
        }
      }
    }
  }, [location.pathname]);

  // No tertiary panel
  useEffect(() => {
    onTertiaryToggle?.(false);
  }, [onTertiaryToggle]);

  const toggleDomain = useCallback((id: string): void => {
    setExpandedDomains(prev =>
      prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]
    );
  }, []);

  const toggleAccordion = useCallback((title: string): void => {
    setExpandedAccordions(prev =>
      prev.includes(title) ? prev.filter(t => t !== title) : [...prev, title]
    );
  }, []);

  const handleNavClick = useCallback((href: string, e?: React.MouseEvent): void => {
    if (e?.metaKey || e?.ctrlKey) {
      e.preventDefault();
      window.open(href, '_blank');
      return;
    }
    navigate(href);
  }, [navigate]);

  // Group menu items by domain
  const itemsByDomain = useMemo(() => {
    const map: Record<string, MenuItem[]> = {};
    for (const item of visibleMenuItems) {
      const domainId = getDomainForGroup(item.group);
      if (!map[domainId]) map[domainId] = [];
      map[domainId].push(item);
    }
    return map;
  }, [visibleMenuItems]);

  // Search filter
  const filteredDomains = useMemo(() => {
    if (!searchTerm.trim()) return visibleDomains;
    const term = searchTerm.toLowerCase();
    return visibleDomains.filter(domain => {
      const items = itemsByDomain[domain.id] || [];
      return (
        domain.title.toLowerCase().includes(term) ||
        items.some(item =>
          item.title.toLowerCase().includes(term) ||
          item.children?.some(c => c.title.toLowerCase().includes(term))
        )
      );
    });
  }, [searchTerm, visibleDomains, itemsByDomain]);

  const getFilteredItems = useCallback((domainId: string): MenuItem[] => {
    const items = itemsByDomain[domainId] || [];
    if (!searchTerm.trim()) return items;
    const term = searchTerm.toLowerCase();
    return items.filter(item =>
      item.title.toLowerCase().includes(term) ||
      item.children?.some(c => c.title.toLowerCase().includes(term))
    );
  }, [itemsByDomain, searchTerm]);

  // Count total notifications for a domain
  const getDomainBadge = (domainId: string): number => domainBadges[domainId] || 0;

  return (
    <aside
      className={cn(
        "h-full flex flex-col transition-all duration-300 border-r border-border bg-sidebar z-50",
        collapsed ? "w-20" : "w-72"
      )}
    >
      {/* ─── Header: Logo + Collapse ─── */}
      <div className={cn("flex items-center h-20 shrink-0 border-b border-border bg-sidebar", collapsed ? "justify-center px-2" : "justify-between px-5")}>
        <button
          onClick={() => onToggle()}
          className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
        >
          <div className="h-10 w-10 bg-gradient-to-br from-red-600 to-red-800 rounded-xl flex items-center justify-center shadow-[0_0_25px_rgba(220,38,38,0.4)] border border-red-500/20 active:scale-95 transition-transform">
            <span className="text-2xl font-black text-foreground italic transform -skew-x-6">R</span>
          </div>
          {!collapsed && (
            <div className="flex flex-col items-start">
              <span className="text-lg font-black text-foreground italic tracking-tighter leading-none">restin.ai</span>
              <span className="text-[9px] font-bold text-red-600 dark:text-red-400 tracking-[0.3em] uppercase">Enterprise</span>
            </div>
          )}
        </button>
        {!collapsed && (
          <Button variant="ghost" size="icon" onClick={onToggle} className="text-muted-foreground hover:text-foreground h-8 w-8 hover:bg-secondary" aria-label="Action">
            <ChevronLeft className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* ─── Search ─── */}
      {!collapsed && (
        <div className="px-4 py-3 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input aria-label="Input"
              type="search"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoComplete="off"
              data-1p-ignore
              data-lpignore="true"
              className="w-full bg-secondary border border-border rounded-lg py-2 pl-9 pr-8 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-red-500/50 transition-all"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* ─── Scrollable Navigation ─── */}
      <ScrollArea className="flex-1">
        <nav className={cn("py-4", collapsed ? "px-2" : "px-3")} aria-label="Sidebar navigation">

          {/* ─── Pinned Section ─── */}
          {!collapsed && !searchTerm && pinnedPages.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center gap-2 px-3 mb-2">
                <Star className="w-3 h-3 text-amber-600 dark:text-amber-400 fill-amber-500" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Pinned</span>
              </div>
              {pinnedPages.map(href => {
                const allItems = visibleMenuItems.flatMap(i => i.children ? [i, ...i.children] : [i]);
                const item = allItems.find(i => i.href === href);
                if (!item) return null;
                return (
                  <Link
                    key={`pin-${href}`}
                    to={href}
                    className={cn(
                      'group flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-sm',
                      isActive(href)
                        ? 'bg-amber-500/[0.06] text-amber-400'
                        : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                    )}
                  >
                    <item.icon className="h-4 w-4 flex-shrink-0 text-amber-500/60" />
                    <span className="truncate font-medium">{item.title}</span>
                  </Link>
                );
              })}
              <div className="mx-3 mt-2 border-b border-border" />
            </div>
          )}

          {/* ─── Domain Sections ─── */}
          {filteredDomains.map(domain => {
            const domainItems = getFilteredItems(domain.id);
            if (domainItems.length === 0) return null;
            const isExpanded = expandedDomains.includes(domain.id) || !!searchTerm;

            return (
              <div key={domain.id} className="mb-1">
                {/* Domain Header — Premium Style */}
                <button
                  onClick={() => {
                    if (collapsed) {
                      onToggle();
                      // Also expand this domain section
                      if (!expandedDomains.includes(domain.id)) {
                        setExpandedDomains(prev => [...prev, domain.id]);
                      }
                      return;
                    }
                    toggleDomain(domain.id);
                  }}
                  className={cn(
                    "w-full flex items-center rounded-xl transition-all duration-300 group relative outline-none",
                    collapsed ? "justify-center h-12 w-12 mx-auto" : "gap-3 px-3.5 py-3",
                    isDomainActive(domain.id)
                      ? "bg-gradient-to-r from-red-600/90 to-red-700/80 shadow-[0_0_20px_rgba(229,57,53,0.3)] text-foreground border border-red-500/20"
                      : isExpanded && !collapsed
                        ? "bg-white/[0.04] text-foreground border border-border"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary border border-transparent"
                  )}
                >
                  {/* Ambient glow behind active domain in collapsed mode */}
                  {isDomainActive(domain.id) && collapsed && (
                    <div className="absolute inset-0 rounded-xl bg-red-500/10 blur-xl scale-150 animate-pulse pointer-events-none" />
                  )}
                  {/* Active domain left edge glow — expanded mode */}
                  {isDomainActive(domain.id) && !collapsed && (
                    <div className="absolute left-[-1px] top-2 bottom-2 w-[3px] bg-white rounded-r-full shadow-[0_0_12px_rgba(255,255,255,0.6)]" />
                  )}
                  {/* White left bar when just expanded (not active) */}
                  {!isDomainActive(domain.id) && isExpanded && !collapsed && (
                    <div className="absolute left-[-1px] top-2 bottom-2 w-0.5 bg-zinc-600 rounded-r-full" />
                  )}
                  <domain.icon className={cn(
                    "shrink-0 transition-all duration-300 group-hover:scale-110 relative z-10",
                    collapsed ? "h-6 w-6" : "h-4.5 w-4.5",
                    isDomainActive(domain.id) ? "text-foreground" : isExpanded ? "text-foreground/80" : "text-muted-foreground group-hover:text-foreground/60"
                  )} />
                  {/* Collapsed: notification badge */}
                  {collapsed && getDomainBadge(domain.id) > 0 && (
                    <span className="absolute -top-1 -right-1 z-20 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-black text-foreground bg-red-600 rounded-full shadow-[0_0_8px_rgba(220,38,38,0.6)] border-2 border-sidebar animate-in fade-in">
                      {getDomainBadge(domain.id) > 9 ? '9+' : getDomainBadge(domain.id)}
                    </span>
                  )}
                  {!collapsed && (
                    <>
                      <span className={cn(
                        "flex-1 text-left text-[11px] font-black uppercase tracking-[0.15em]",
                        isDomainActive(domain.id) ? "text-foreground" : ""
                      )}>
                        {domain.title}
                      </span>
                      {getDomainBadge(domain.id) > 0 && (
                        <span className={cn(
                          "flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-black rounded-full",
                          isDomainActive(domain.id)
                            ? "text-red-600 bg-white shadow-sm"
                            : "text-foreground bg-red-600 shadow-[0_0_6px_rgba(220,38,38,0.4)]"
                        )}>
                          {getDomainBadge(domain.id)}
                        </span>
                      )}
                      <ChevronDown className={cn(
                        'h-3.5 w-3.5 transition-transform duration-200',
                        isDomainActive(domain.id) ? "text-foreground/60" : "text-muted-foreground",
                        isExpanded && 'rotate-180 text-muted-foreground'
                      )} />
                    </>
                  )}
                  {/* Collapsed tooltip */}
                  {collapsed && (
                    <div className="absolute left-16 px-4 py-2 bg-popover text-foreground text-xs font-bold rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 translate-x-2 group-hover:translate-x-0 whitespace-nowrap z-50 uppercase tracking-widest border border-border shadow-2xl">
                      {domain.title}
                      <div className="absolute left-[-4px] top-1/2 -translate-y-1/2 w-2 h-2 bg-popover rotate-45 border-l border-b border-border" />
                    </div>
                  )}
                </button>

                {/* Domain Items */}
                {!collapsed && isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                    className="ml-2 pl-3 border-l border-border space-y-0.5 mt-1 mb-2 overflow-hidden"
                  >
                    {domainItems.map(item => (
                      <div key={item.title + item.href}>
                        {!item.children ? (
                          /* ── Simple Link ── */
                          <button
                            onClick={(e) => handleNavClick(item.href, e)}
                            className={cn(
                              'group w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all relative',
                              isActive(item.href)
                                ? 'bg-red-500/[0.08] text-red-600 dark:text-red-400 font-semibold'
                                : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                            )}
                          >
                            <item.icon className={cn("h-4 w-4 flex-shrink-0", isActive(item.href) ? "text-red-500" : "text-muted-foreground")} />
                            <span className="flex-1 text-left truncate">{item.title}</span>
                            {getItemBadge(item.href) > 0 && !isActive(item.href) && (
                              <span className="flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-black text-foreground bg-red-600 rounded-full shadow-[0_0_4px_rgba(220,38,38,0.4)]">
                                {getItemBadge(item.href)}
                              </span>
                            )}
                            {isActive(item.href) && (
                              <>
                                <div className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(229,57,53,0.8)] animate-pulse shrink-0" />
                                <div className="absolute left-0 top-1 bottom-1 w-0.5 bg-red-500 rounded-full shadow-[0_0_8px_rgba(229,57,53,0.6)]" />
                              </>
                            )}
                            {/* Pin button — uses span to avoid button-in-button nesting */}
                            <span
                              role="button"
                              tabIndex={0}
                              onClick={(e) => { e.stopPropagation(); e.preventDefault(); togglePin(item.href); }}
                              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); e.preventDefault(); togglePin(item.href); } }}
                              className={cn(
                                'p-0.5 rounded hover:bg-white/10 transition-all shrink-0 cursor-pointer',
                                isPinned(item.href) ? 'opacity-100' : 'opacity-0 group-hover:opacity-60'
                              )}
                            >
                              <Star className={cn('w-3 h-3', isPinned(item.href) ? 'text-amber-500 fill-amber-500' : 'text-muted-foreground')} />
                            </span>
                          </button>
                        ) : (
                          /* ── Accordion Parent ── */
                          <div>
                            <button
                              onClick={(e) => {
                                // Navigate to the page AND expand the accordion
                                handleNavClick(item.href, e);
                                if (!expandedAccordions.includes(item.title)) {
                                  toggleAccordion(item.title);
                                }
                              }}
                              className={cn(
                                'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all group',
                                isActive(item.href) || isChildActive(item.children) ? 'text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                              )}
                            >
                              <item.icon className={cn("h-4 w-4 flex-shrink-0", isActive(item.href) || isChildActive(item.children) ? "text-red-400" : "text-muted-foreground")} />
                              <span className="flex-1 text-left truncate font-medium">{item.title}</span>
                              {getAccordionBadge(item) > 0 && !expandedAccordions.includes(item.title) && (
                                <span className="flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-black text-foreground bg-red-600 rounded-full shadow-[0_0_4px_rgba(220,38,38,0.4)]">
                                  {getAccordionBadge(item)}
                                </span>
                              )}
                              <div
                                onClick={(e) => { e.stopPropagation(); toggleAccordion(item.title); }}
                                className="p-0.5 rounded hover:bg-white/10 transition-all shrink-0"
                              >
                                <ChevronRight className={cn(
                                  'h-3.5 w-3.5 transition-transform duration-200 text-muted-foreground',
                                  expandedAccordions.includes(item.title) && 'rotate-90 text-foreground/60'
                                )} />
                              </div>
                            </button>
                            {/* Accordion Children */}
                            <AnimatePresence>
                              {expandedAccordions.includes(item.title) && (
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  exit={{ opacity: 0, height: 0 }}
                                  transition={{ duration: 0.15, ease: 'easeOut' }}
                                  className="ml-4 pl-3 border-l border-border space-y-0.5 mt-0.5 mb-1 overflow-hidden"
                                >
                                  {item.children.map(child => (
                                    <button
                                      key={child.href}
                                      onClick={(e) => handleNavClick(child.href, e)}
                                      className={cn(
                                        'w-full text-left px-3 py-1.5 rounded-md text-[13px] transition-all relative overflow-hidden',
                                        isActive(child.href)
                                          ? 'bg-red-500/[0.06] text-red-600 dark:text-red-400 font-semibold border border-red-500/10'
                                          : 'text-muted-foreground hover:text-foreground hover:bg-secondary border border-transparent'
                                      )}
                                    >
                                      <span className="relative z-10 flex items-center gap-2">
                                        {child.title}
                                        {getItemBadge(child.href) > 0 && !isActive(child.href) && (
                                          <span className="flex items-center justify-center min-w-4 h-4 px-1 text-[9px] font-black text-foreground bg-red-600 rounded-full">
                                            {getItemBadge(child.href)}
                                          </span>
                                        )}
                                        {isActive(child.href) && (
                                          <div className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_6px_rgba(229,57,53,0.8)] animate-pulse shrink-0" />
                                        )}
                                      </span>
                                      {isActive(child.href) && (
                                        <div className="absolute left-0 top-1 bottom-1 w-0.5 bg-red-500 rounded-full shadow-[0_0_6px_rgba(229,57,53,0.8)]" />
                                      )}
                                    </button>
                                  ))}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        )}
                      </div>
                    ))}
                  </motion.div>
                )}
              </div>
            );
          })}
        </nav>
      </ScrollArea>

      {/* ─── Footer: Collapse toggle ─── */}
      <div className="shrink-0 border-t border-border p-3">
        {collapsed ? (
          <Button
            variant="ghost"
            size="icon" aria-label="Action"
            onClick={onToggle}
            className="w-full h-10 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary"
           aria-label="Action">
            <ChevronRight className="h-5 w-5" />
          </Button>
        ) : (
          <button
            onClick={onToggle}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary transition-all text-sm"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="font-medium">Collapse</span>
          </button>
        )}
      </div>
    </aside>
  );
}
