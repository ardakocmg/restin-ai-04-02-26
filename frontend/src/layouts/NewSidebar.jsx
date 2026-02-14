import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from '../features/auth/AuthContext';
import { MENU_ITEMS, DOMAINS, getDomainForGroup } from '@/lib/searchRegistry';
import { ChevronRight, ChevronLeft, Search, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';


// Role hierarchy from centralized definition (includes product_owner: 99)
import { ROLE_HIERARCHY } from '../lib/roles';

// Use the shared menu items from searchRegistry
const menuItems = MENU_ITEMS;

export default function NewSidebar({ collapsed, onToggle, onTertiaryToggle, onDomainExpand }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Role-based filtering: user can only see items at or below their role level
  const userLevel = ROLE_HIERARCHY[user?.role] ?? 0;
  const canSeeItem = (item) => userLevel >= (ROLE_HIERARCHY[item.requiredRole] ?? 0);
  const visibleMenuItems = useMemo(() => menuItems.filter(canSeeItem), [userLevel]);

  // Domain Groups â€” from shared searchRegistry
  const domains = DOMAINS;

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

  const isActive = (href) => location.pathname === href || location.pathname.startsWith(href + '/');
  const isGroupActive = (children) => children?.some(c => isActive(c.href));

  // Detect when the domain bar should show
  // Sync activeDomain whenever the URL changes
  React.useEffect(() => {
    const detected = findActiveDomain();
    if (detected && detected !== activeDomain) {
      setActiveDomain(detected);
    }
  }, [location.pathname]);

  // Note: handleDomainClick replaced by handleDomainClickWithMemory (domain memory feature)

  const toggleDomainExpand = () => {
    setDomainBarExpanded((prev) => !prev);
    onDomainExpand?.(!domainBarExpanded);
  };

  // ─── Cmd/Ctrl+click support — open in new tab ───
  const handleNavClick = (href, e, extraFn) => {
    if (e?.metaKey || e?.ctrlKey) {
      e.preventDefault();
      window.open(href, '_blank');
      return;
    }
    navigate(href);
    extraFn?.();
  };

  // ─── Domain notification badges (mock counts, will be fed by real data later) ───
  const domainNotifications = useMemo(() => ({
    home: 0,
    pos: 2,
    hr: 5,
    inventory: 1,
    finance: 0,
    restin: 3,
    settings: 0,
    collab: 4,
  }), []);

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

  // ─── Domain Memory: remember last visited page per domain ───
  const DOMAIN_MEMORY_KEY = 'restin:domain-memory';

  const saveDomainPage = useCallback((domain, path) => {
    try {
      const mem = JSON.parse(localStorage.getItem(DOMAIN_MEMORY_KEY) || '{}');
      mem[domain] = path;
      localStorage.setItem(DOMAIN_MEMORY_KEY, JSON.stringify(mem));
    } catch { /* ignore */ }
  }, []);

  const getDomainPage = useCallback((domain) => {
    try {
      const mem = JSON.parse(localStorage.getItem(DOMAIN_MEMORY_KEY) || '{}');
      return mem[domain] || null;
    } catch { return null; }
  }, []);

  // Save current page whenever route changes
  useEffect(() => {
    const domain = findActiveDomain();
    if (domain && location.pathname !== '/admin/dashboard') {
      saveDomainPage(domain, location.pathname);
    }
  }, [location.pathname]);

  // Navigate to saved page on domain switch
  const handleDomainClickWithMemory = (id) => {
    setActiveDomain(id);
    if (collapsed) {
      onToggle?.();
    }
    const savedPage = getDomainPage(id);
    if (savedPage) {
      navigate(savedPage);
    }
  };

  // ─── Keyboard Navigation: ↑↓ traverse menu, Enter to select ───
  const [focusedIdx, setFocusedIdx] = useState(-1);
  const menuContainerRef = useRef(null);

  // Flatten visible items + their children into navigable list
  const flatNavItems = useMemo(() => {
    const items = [];
    visibleMenuItems
      .filter(item => {
        if (searchTerm && !collapsed) {
          const term = searchTerm.toLowerCase();
          const matchesTitle = item.title.toLowerCase().includes(term);
          const matchesSub = item.children?.some(c => c.title.toLowerCase().includes(term));
          return matchesTitle || matchesSub;
        }
        return getDomainForGroup(item.group) === activeDomain;
      })
      .forEach(item => {
        if (item.href && !item.children) {
          items.push({ title: item.title, href: item.href, type: 'link' });
        } else if (item.children) {
          items.push({ title: item.title, group: item.group, type: 'group' });
          if (expandedGroups.includes(item.group)) {
            item.children.forEach(c => {
              items.push({ title: c.title, href: c.href, type: 'child' });
            });
          }
        }
      });
    return items;
  }, [visibleMenuItems, activeDomain, searchTerm, collapsed, expandedGroups]);

  // Reset focus idx on domain switch or search
  useEffect(() => {
    setFocusedIdx(-1);
  }, [activeDomain, searchTerm]);

  // Keyboard handler for sidebar navigation
  useEffect(() => {
    const container = menuContainerRef.current;
    if (!container || collapsed) return;

    const handleKeyDown = (e) => {
      if (flatNavItems.length === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedIdx(prev => Math.min(prev + 1, flatNavItems.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedIdx(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter' && focusedIdx >= 0) {
        e.preventDefault();
        const item = flatNavItems[focusedIdx];
        if (item.type === 'group') {
          toggleGroup(item.group);
        } else if (item.href) {
          navigate(item.href);
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    return () => container.removeEventListener('keydown', handleKeyDown);
  }, [flatNavItems, focusedIdx, collapsed]);

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
              onClick={() => handleDomainClickWithMemory(domain.id)}
              className={cn(
                'group relative flex items-center rounded-xl transition-all duration-300 w-full outline-none focus:ring-2 focus:ring-red-500/20',
                domainBarExpanded ? 'px-4 py-3.5 gap-4' : 'h-12 w-12 justify-center mx-auto',
                activeDomain === domain.id
                  ? 'bg-gradient-to-r from-red-600 to-red-700 shadow-[0_0_20px_rgba(229,57,53,0.4)] text-white border border-red-500/20'
                  : 'text-zinc-500 hover:text-zinc-200 hover:bg-white/5 border border-transparent'
              )}
            >
              {/* Ambient gradient blob behind active domain icon */}
              {activeDomain === domain.id && !domainBarExpanded && (
                <div className="absolute inset-0 rounded-xl bg-red-500/10 blur-xl scale-150 animate-pulse pointer-events-none" />
              )}
              <domain.icon className={cn("shrink-0 transition-transform duration-300 group-hover:scale-110 relative z-10", domainBarExpanded ? "h-5 w-5" : "h-6 w-6")} />
              {/* Notification badge */}
              {!domainBarExpanded && domainNotifications[domain.id] > 0 && (
                <span className="absolute -top-1 -right-1 z-20 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-black text-white bg-red-600 rounded-full shadow-[0_0_8px_rgba(220,38,38,0.6)] border-2 border-zinc-950 animate-in fade-in">
                  {domainNotifications[domain.id] > 9 ? '9+' : domainNotifications[domain.id]}
                </span>
              )}
              {domainBarExpanded && (
                <div className="flex-1 flex items-center justify-between relative z-10">
                  <span className="text-sm font-bold truncate tracking-wide">{domain.title}</span>
                  {domainNotifications[domain.id] > 0 && (
                    <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[10px] font-black text-white bg-red-600 rounded-full">
                      {domainNotifications[domain.id]}
                    </span>
                  )}
                </div>
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
          <nav
            ref={menuContainerRef}
            tabIndex={0}
            className="space-y-1.5 outline-none"
            aria-label="Sidebar navigation"
          >
            {/* Search Bar - Hidden in Icon Mode */}
            {!collapsed && (
              <div className="px-3 pb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    type="search"
                    placeholder="Search features..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    autoComplete="off"
                    data-1p-ignore
                    data-lpignore="true"
                    className="w-full bg-zinc-900/50 border border-white/10 rounded-lg py-2 pl-9 pr-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-red-500/50 transition-all"
                  />
                </div>
              </div>
            )}
            {/* Animated menu content — transitions when domain switches */}
            <AnimatePresence mode="wait">
              <motion.div
                key={searchTerm ? 'search' : activeDomain}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                className="space-y-1.5"
              >
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
                            collapsed && 'justify-center px-2 py-3',
                            isActive(item.href)
                              ? 'bg-red-500/[0.08] text-red-500 border-red-500/20 shadow-[0_0_15px_rgba(229,57,53,0.05)]'
                              : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200'
                          )}
                          onClick={(e) => {
                            if (e.metaKey || e.ctrlKey) return; // Let browser handle new tab natively
                            setActiveSubItem(item);
                          }}
                        >
                          <item.icon className={cn("h-5 w-5 flex-shrink-0 transition-colors", isActive(item.href) ? "text-red-500" : "text-zinc-500 group-hover:text-zinc-300")} />
                          {!collapsed && <span className={cn("text-sm font-medium", isActive(item.href) ? "font-bold" : "")}>{item.title}</span>}
                          {isActive(item.href) && !collapsed && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(229,57,53,0.8)] animate-pulse"></div>}
                        </Link>
                      ) : (
                        <div className="space-y-1">
                          <button
                            onClick={() => !collapsed ? toggleGroup(item.group) : null}
                            className={cn(
                              'w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all duration-200 group hover:bg-white/5',
                              collapsed && 'justify-center px-2 py-3',
                              isGroupActive(item.children) ? 'text-zinc-100' : 'text-zinc-500'
                            )}
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
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.2, ease: 'easeOut' }}
                              className="ml-4 pl-4 border-l border-white/5 space-y-1 mt-1 py-1 overflow-hidden"
                            >
                              {item.children.map((child) => (
                                <button
                                  key={child.href}
                                  onClick={(e) => handleNavClick(child.href, e, () => setActiveSubItem(child))}
                                  className={cn(
                                    'w-full text-left block px-3 py-2 rounded-lg text-sm transition-all border border-transparent outline-none relative overflow-hidden',
                                    isActive(child.href)
                                      ? 'bg-white/[0.03] text-red-500 border-red-500/10 font-semibold'
                                      : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.03]'
                                  )}
                                >
                                  <span className="relative z-10">{child.title}</span>
                                  {isActive(child.href) && <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-red-500 shadow-[0_0_8px_rgba(229,57,53,0.8)]"></div>}
                                </button>
                              ))}
                            </motion.div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
              </motion.div>
            </AnimatePresence>
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
                  location.search.includes(`type=${sub.id}`)
                    ? 'bg-red-600/5 text-red-500 border-red-600/10'
                    : 'text-zinc-500 hover:bg-white/5 hover:text-zinc-200'
                )}
                onClick={() => {
                  navigate(`${activeSubItem.href}?type=${sub.id}`);
                }}
                title={collapsed ? sub.title : undefined}
              >
                <div className={cn("w-1.5 h-1.5 rounded-full shrink-0 transition-all", location.search.includes(`type=${sub.id}`) ? "bg-red-500 shadow-[0_0_5px_rgba(229,57,53,0.5)]" : "bg-zinc-800 group-hover:bg-zinc-600")}></div>
                {!collapsed && sub.title}
              </Button>
            ))}
          </nav>
        </ScrollArea>
      </aside>
    </div>
  );
}
