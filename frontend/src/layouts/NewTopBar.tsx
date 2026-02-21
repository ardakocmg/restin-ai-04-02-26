import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';
import { useVenue } from '../context/VenueContext';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { buildSearchIndex, MENU_ITEMS, type SearchableItem } from '@/lib/searchRegistry';
import { ROLE_HIERARCHY } from '../lib/roles';
import { Bell, User, LogOut, ChevronDown, Moon, Sun, Monitor, Database, Palette, Settings, Building2, Search, X, Check, Wifi, WifiOff, AlertTriangle, ShieldAlert, ShieldCheck, Clock, Bot, Radio, MessageSquare } from 'lucide-react';
import { useSafeMode } from '../context/SafeModeContext';
import { useNotifications } from '@/hooks/useNotifications';
import { Button } from '../components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';

type SystemStatus = 'healthy' | 'degraded' | 'offline';

export default function NewTopBar(): React.ReactElement {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();
  const { activeVenue, venues, selectVenue } = useVenue();
  const { mode, setMode } = useTheme();
  const { isSafeMode, setSafeMode } = useSafeMode();
  const { totalCount: notifTotal } = useNotifications();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
  const [systemStatus, _setSystemStatus] = useState<SystemStatus>('healthy');
  const [selectedSuggestionIdx, setSelectedSuggestionIdx] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<string>('');
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // Build role-filtered search index from shared registry
  const searchIndex = useMemo<SearchableItem[]>(() => buildSearchIndex(user?.role), [user?.role]);

  // Live clock — Malta timezone
  useEffect(() => {
    const updateClock = (): void => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('en-GB', {
        hour: '2-digit', minute: '2-digit',
        timeZone: 'Europe/Malta'
      }));
    };
    updateClock();
    const interval = setInterval(updateClock, 30000);
    return () => clearInterval(interval);
  }, []);

  // ⌘K / Ctrl+K global shortcut to focus search bar
  useEffect(() => {
    const handleGlobalKey = (e: KeyboardEvent): void => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
        setShowSuggestions(true);
      }
      // Escape to close search
      if (e.key === 'Escape' && showSuggestions) {
        setShowSuggestions(false);
        searchInputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', handleGlobalKey);
    return () => window.removeEventListener('keydown', handleGlobalKey);
  }, [showSuggestions]);

  const handleLogout = (): void => {
    logout();
    navigate('/login');
  };

  // Filter suggestions based on search query — searches title, breadcrumb, keywords, path
  const suggestions = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return searchIndex
      .filter((item: SearchableItem) => {
        return (
          item.title.toLowerCase().includes(q) ||
          item.breadcrumb.toLowerCase().includes(q) ||
          item.path.toLowerCase().includes(q) ||
          item.keywords.some((kw: string) => kw.includes(q))
        );
      })
      .slice(0, 8);
  }, [searchQuery, searchIndex]);

  // Reset selected suggestion when suggestions change
  useEffect(() => {
    setSelectedSuggestionIdx(0);
  }, [suggestions.length, searchQuery]);

  // Keyboard navigation for suggestions
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (!showSuggestions || suggestions.length === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedSuggestionIdx(prev => Math.min(prev + 1, suggestions.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedSuggestionIdx(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter' && suggestions[selectedSuggestionIdx]) {
        e.preventDefault();
        handleSuggestionClick(suggestions[selectedSuggestionIdx].path);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showSuggestions, suggestions, selectedSuggestionIdx]);

  const handleSearch = (e: React.FormEvent): void => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    if (suggestions.length > 0) {
      navigate(suggestions[selectedSuggestionIdx]?.path || suggestions[0].path);
    }

    setSearchQuery('');
    setShowSuggestions(false);
  };

  const handleSuggestionClick = (path: string): void => {
    navigate(path);
    setSearchQuery('');
    setShowSuggestions(false);
  };

  const getStatusColor = (): string => {
    switch (systemStatus) {
      case 'healthy': return 'text-green-500';
      case 'degraded': return 'text-yellow-500';
      case 'offline': return 'text-red-500';
      default: return 'text-muted-foreground';
    }
  };

  const getStatusIcon = (): React.ReactElement => {
    switch (systemStatus) {
      case 'healthy': return <Wifi className="h-3 w-3" />;
      case 'degraded': return <AlertTriangle className="h-3 w-3" />;
      case 'offline': return <WifiOff className="h-3 w-3" />;
      default: return <Wifi className="h-3 w-3" />;
    }
  };

  const getStatusText = (): string => {
    switch (systemStatus) {
      case 'healthy': return 'CLOUD ONLINE';
      case 'degraded': return 'PARTIAL OUTAGE';
      case 'offline': return 'OFFLINE';
      default: return 'UNKNOWN';
    }
  };

  return (
    <header
      className="h-20 flex items-center justify-between px-8 gap-6 z-20 relative transition-all duration-300 bg-background/95 backdrop-blur-xl border-b border-border"
    >
      {/* Left: Venue Switcher */}
      <div className="flex items-center gap-4 flex-shrink-0">
        {activeVenue && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-3 px-4 py-2 rounded-xl bg-secondary border border-border hover:border-primary/20 transition-all cursor-pointer group outline-none focus:ring-2 focus:ring-blue-500/30">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-zinc-200 to-zinc-300 dark:from-zinc-800 dark:to-zinc-900 flex items-center justify-center border border-border shadow-inner">
                  <Building2 className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                </div>
                <div className="text-left">
                  <h2 className="text-sm font-bold text-foreground tracking-tight group-hover:text-foreground transition-colors">
                    {activeVenue.name}
                  </h2>
                  <p className="text-[10px] uppercase font-black tracking-[0.2em] text-muted-foreground group-hover:text-muted-foreground transition-colors">
                    {(activeVenue.type as string) || 'VENUE'}
                  </p>
                </div>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-colors ml-1" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-72 bg-popover border-border text-popover-foreground">
              <DropdownMenuLabel className="text-[10px] uppercase font-black tracking-widest text-muted-foreground px-3 py-2">
                Switch Venue
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-border" />
              {(venues || []).map((venue) => (
                <DropdownMenuItem
                  key={venue.id}
                  onClick={() => selectVenue(venue)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-3 cursor-pointer font-medium rounded-lg mx-1 my-0.5",
                    venue.id === activeVenue.id
                      ? "bg-blue-500/10 text-blue-400"
                      : "focus:bg-secondary text-muted-foreground hover:text-foreground"
                  )}
                >
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center border shadow-inner",
                    venue.id === activeVenue.id
                      ? "bg-blue-500/10 border-blue-500/20"
                      : "bg-secondary border-border"
                  )}>
                    <Building2 className={cn(
                      "h-4 w-4",
                      venue.id === activeVenue.id ? "text-blue-400" : "text-muted-foreground"
                    )} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold truncate">{venue.name}</div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{(venue.type as string) || 'venue'}</div>
                  </div>
                  {venue.id === activeVenue.id && (
                    <Check className="h-4 w-4 text-blue-400 shrink-0" />
                  )}
                </DropdownMenuItem>
              ))}
              {(!venues || venues.length === 0) && (
                <div className="px-4 py-3 text-xs text-muted-foreground italic">{"No "}venues available</div>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Center: Search Bar */}
      <form onSubmit={handleSearch} className="flex-1 max-w-2xl relative">
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-red-500 transition-colors z-10 duration-300" />
          <input
            ref={searchInputRef}
            type="search"
            placeholder="Search pages, modules, features..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            autoComplete="off"
            data-1p-ignore
            data-lpignore="true"
            className="w-full bg-secondary border border-border rounded-2xl px-12 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-red-500/30 focus:bg-card focus:ring-4 focus:ring-red-500/10 shadow-inner hover:bg-card transition-all duration-300"
          />
          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none">
            <kbd className="text-[10px] font-mono text-muted-foreground bg-secondary border border-border rounded px-1.5 py-0.5 shadow-sm">⌘K</kbd>
          </div>
          {searchQuery && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => {
                setSearchQuery('');
                setShowSuggestions(false);
              }}
              className="absolute right-12 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors z-10 p-1 rounded-full hover:bg-secondary pointer-events-auto"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Autocomplete Suggestions Dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-popover border border-border rounded-2xl shadow-[0_20px_40px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_40px_rgba(0,0,0,0.5)] overflow-hidden z-50 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200">
            <div className="px-3 py-2 text-[10px] uppercase font-bold tracking-widest text-muted-foreground bg-secondary/50">Pages & Features</div>
            {suggestions.map((suggestion, idx) => {
              const Icon = suggestion.icon;
              const isSelected = idx === selectedSuggestionIdx;
              return (
                <div
                  key={`${suggestion.path}-${idx}`}
                  onClick={() => handleSuggestionClick(suggestion.path)}
                  className={cn(
                    "flex items-center justify-between px-4 py-3 cursor-pointer transition-all group border-b border-border last:border-b-0",
                    isSelected ? "bg-red-500/10" : "hover:bg-secondary"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center border transition-all",
                      isSelected
                        ? "bg-red-500/10 border-red-500/30"
                        : "bg-secondary border-border group-hover:border-red-500/30 group-hover:bg-red-500/10"
                    )}>
                      <Icon className={cn("h-4 w-4", isSelected ? "text-red-500" : "text-muted-foreground group-hover:text-red-500")} />
                    </div>
                    <div>
                      <div className={cn(
                        "text-sm font-semibold transition-colors",
                        isSelected ? "text-foreground" : "text-foreground/80 group-hover:text-foreground"
                      )}>
                        {suggestion.title}
                      </div>
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        {suggestion.breadcrumb}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isSelected && (
                      <span className="text-[10px] font-mono text-muted-foreground border border-border rounded px-1.5 py-0.5">↵</span>
                    )}
                    <ChevronDown className={cn(
                      "h-3 w-3 -rotate-90 transition-transform",
                      isSelected ? "text-red-400 translate-x-1" : "text-muted-foreground group-hover:text-foreground/60 group-hover:translate-x-1"
                    )} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </form>

      {/* Right: Actions */}
      <div className="flex items-center gap-4 flex-shrink-0">
        {/* Global Context Switcher */}
        <div className="flex items-center gap-3 px-1 py-1 rounded-full bg-secondary border border-border hover:border-primary/20 transition-all">
          <div className="flex items-center gap-2 pl-3">
            {isSafeMode ? (
              <ShieldAlert className="h-3.5 w-3.5 text-red-600 dark:text-red-400 animate-pulse" />
            ) : (
              <ShieldCheck className="h-3.5 w-3.5 text-green-500" />
            )}
            <span className={cn(
              "text-[10px] font-black tracking-widest uppercase",
              isSafeMode ? "text-red-500" : "text-muted-foreground"
            )}>
              {isSafeMode ? "SAFE MODE" : "LIVE MODE"}
            </span>
          </div>
          <button
            aria-label={isSafeMode ? 'Disable safe mode' : 'Enable safe mode'}
            onClick={() => setSafeMode(!isSafeMode)}
            className={cn(
              "w-10 h-6 rounded-full p-1 transition-all duration-300 relative focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background focus:ring-border",
              isSafeMode ? "bg-red-900/40" : "bg-secondary"
            )}
          >
            <div className={cn(
              "w-4 h-4 rounded-full shadow-lg transform transition-all duration-300",
              isSafeMode ? "translate-x-4 bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]" : "translate-x-0 bg-zinc-400"
            )} />
          </button>
        </div>

        {/* Theme Toggle */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
              {mode === 'dark' ? <Moon className="h-5 w-5" /> :
                mode === 'light' ? <Sun className="h-5 w-5" /> :
                  <Monitor className="h-5 w-5" />}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-popover border-border text-popover-foreground">
            <DropdownMenuItem onClick={() => setMode('light')} className={cn("cursor-pointer focus:bg-secondary", mode === 'light' && "bg-secondary")}>
              <Sun className="mr-2 h-4 w-4" /> Light
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setMode('dark')} className={cn("cursor-pointer focus:bg-secondary", mode === 'dark' && "bg-secondary")}>
              <Moon className="mr-2 h-4 w-4" /> Dark
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setMode('system')} className={cn("cursor-pointer focus:bg-secondary", mode === 'system' && "bg-secondary")}>
              <Monitor className="mr-2 h-4 w-4" /> System
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Clock — Malta Timezone */}
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          <span className="text-xs font-mono font-medium tabular-nums tracking-wide">{currentTime}</span>
        </div>

        <div className="w-px h-8 bg-border"></div>

        {/* Notifications */}
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground hover:bg-secondary relative">
          <Bell className="h-5 w-5" />
          {notifTotal > 0 && (
            <span className="absolute top-1 right-1 w-5 h-5 bg-red-500 rounded-full border-2 border-background flex items-center justify-center">
              <span className="text-[10px] font-black text-foreground leading-none">{notifTotal > 9 ? '9+' : notifTotal}</span>
            </span>
          )}
        </Button>

        {/* User Menu with System Status Indicator */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="flex items-center gap-3 text-foreground font-medium hover:bg-secondary relative px-2 py-1 h-auto rounded-xl border border-transparent hover:border-border transition-all"
            >
              <div className="relative">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-zinc-200 to-zinc-300 dark:from-zinc-700 dark:to-zinc-900 flex items-center justify-center border border-border shadow-lg">
                  <User className={cn("h-4 w-4", getStatusColor())} />
                </div>
                <div className={cn(
                  "absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-background",
                  systemStatus === 'healthy' && "bg-green-500",
                  systemStatus === 'degraded' && "bg-yellow-500",
                  systemStatus === 'offline' && "bg-red-500"
                )} />
              </div>
              <div className="flex flex-col items-start mr-1">
                <span className="text-sm font-bold leading-none">{user?.name || t('topbar.roles.user')}</span>
                <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider leading-none mt-1">
                  {(() => {
                    const role = user?.role?.toLowerCase();
                    if (role === 'product_owner') return t('topbar.roles.productOwner');
                    if (role === 'owner') return t('topbar.roles.owner');
                    if (role === 'manager') return t('topbar.roles.manager');
                    if (role === 'staff') return t('topbar.roles.staff');
                    return user?.role || t('topbar.roles.user');
                  })()}
                </span>
              </div>
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64 bg-popover border-border text-popover-foreground">
            <div className="px-4 py-3 border-b border-border mb-1">
              <p className="text-sm font-bold text-foreground">{t('topbar.myAccount')}</p>
              <p className="text-xs text-muted-foreground">{t('topbar.managePreferences')}</p>
            </div>

            <DropdownMenuItem
              onClick={() => navigate('/profile')}
              className="font-medium cursor-pointer focus:bg-secondary"
            >
              <User className="mr-2 h-4 w-4 text-muted-foreground" />
              {t('topbar.profile')}
            </DropdownMenuItem>

            <DropdownMenuSeparator className="bg-border" />

            {/* System Status */}
            <div className="px-3 py-2">
              <div className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground mb-2 px-1">{t('topbar.systemHealth')}</div>
              <div className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-widest border border-transparent transition-colors",
                systemStatus === 'healthy' && "bg-green-500/5 text-green-600 dark:text-green-400 border-green-500/10",
                systemStatus === 'degraded' && "bg-yellow-500/5 text-yellow-600 dark:text-yellow-400 border-yellow-500/10",
                systemStatus === 'offline' && "bg-red-500/5 text-red-600 dark:text-red-400 border-red-500/10"
              )}>
                <span className={cn(
                  "inline-block w-2 h-2 rounded-full",
                  systemStatus === 'healthy' && "bg-green-500 animate-pulse",
                  systemStatus === 'degraded' && "bg-yellow-500 animate-[pulse_0.5s_ease-in-out_infinite]",
                  systemStatus === 'offline' && "bg-red-500"
                )} />
                {getStatusIcon()}
                <span>{getStatusText()}</span>
              </div>
            </div>

            <DropdownMenuSeparator className="bg-white/5" />

            {/* Quick Access */}
            <div className="px-3 py-2">
              <div className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground mb-2 px-1">QUICK ACCESS</div>
              <DropdownMenuItem
                onClick={() => navigate('/manager/my-google')}
                className="font-medium cursor-pointer focus:bg-secondary"
              >
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>
                My Google
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => navigate('/manager/ai/copilot')}
                className="font-medium cursor-pointer focus:bg-white/5"
              >
                <Bot className="mr-2 h-4 w-4 text-blue-400" />
                Hey Rin AI
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => navigate('/manager/collab/tasks')}
                className="font-medium cursor-pointer focus:bg-white/5"
              >
                <Radio className="mr-2 h-4 w-4 text-amber-400" />
                Tasks Board
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => navigate('/manager/collab/hive')}
                className="font-medium cursor-pointer focus:bg-white/5"
              >
                <MessageSquare className="mr-2 h-4 w-4 text-green-400" />
                Hive Chat
              </DropdownMenuItem>
            </div>

            <DropdownMenuSeparator className="bg-border" />
            <DropdownMenuItem
              onClick={handleLogout}
              className="text-red-400 focus:text-red-300 focus:bg-red-500/10 cursor-pointer font-medium"
            >
              <LogOut className="mr-2 h-4 w-4" />
              {t('topbar.signOut')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="w-px h-8 bg-border"></div>

        {/* Region & Language (Malta) - Moved to Far Right */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-9 w-auto px-2 gap-2 hover:bg-secondary transition-colors" title="Region: Malta (EUR)">
              <span className="text-xl leading-none">🇲🇹</span>
              <span className="text-muted-foreground font-medium text-sm">€</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-popover border-border text-popover-foreground min-w-[140px]">
            <DropdownMenuLabel className="text-xs text-muted-foreground font-normal uppercase tracking-wider">
              {t('topbar.fiscalRegion')}
            </DropdownMenuLabel>
            <DropdownMenuItem className="focus:bg-transparent cursor-default">
              <span className="mr-3 text-lg">🇲🇹</span> Malta (MT)
            </DropdownMenuItem>

            <DropdownMenuSeparator className="bg-border" />

            <DropdownMenuLabel className="text-xs text-muted-foreground font-normal uppercase tracking-wider">
              {t('topbar.interfaceLanguage')}
            </DropdownMenuLabel>
            <DropdownMenuItem onClick={() => i18n.changeLanguage('en')} className={cn("cursor-pointer focus:bg-secondary font-medium", i18n.language === 'en' && "bg-secondary text-blue-500")}>
              <span className="mr-3 text-lg">🇬🇧</span> English
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => i18n.changeLanguage('mt')} className={cn("cursor-pointer focus:bg-secondary font-medium", i18n.language === 'mt' && "bg-secondary text-blue-500")}>
              <span className="mr-3 text-lg">🇲🇹</span> Malti
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
