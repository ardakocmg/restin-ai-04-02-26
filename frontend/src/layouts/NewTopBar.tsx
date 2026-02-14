import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';
import { useVenue } from '../context/VenueContext';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { buildSearchIndex, type SearchableItem } from '@/lib/searchRegistry';
import { Bell, User, LogOut, ChevronDown, Moon, Sun, Monitor, Database, Palette, Settings, Building2, Search, X, Check, Wifi, WifiOff, AlertTriangle, ShieldAlert, ShieldCheck, Clock } from 'lucide-react';
import { useSafeMode } from '../context/SafeModeContext';
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
      default: return 'text-zinc-500';
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
      className="h-20 flex items-center justify-between px-8 gap-6 z-20 relative transition-all duration-300 bg-[#0A0A0B]/95 backdrop-blur-xl border-b border-white/5"
    >
      {/* Left: Venue Switcher */}
      <div className="flex items-center gap-4 flex-shrink-0">
        {activeVenue && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-3 px-4 py-2 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-all cursor-pointer group outline-none focus:ring-2 focus:ring-blue-500/30">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center border border-white/10 shadow-inner">
                  <Building2 className="h-4 w-4 text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors" />
                </div>
                <div className="text-left">
                  <h2 className="text-sm font-bold text-zinc-600 dark:text-zinc-200 tracking-tight group-hover:text-zinc-900 dark:group-hover:text-white transition-colors">
                    {activeVenue.name}
                  </h2>
                  <p className="text-[10px] uppercase font-black tracking-[0.2em] text-zinc-600 group-hover:text-zinc-500 transition-colors">
                    {(activeVenue.type as string) || 'VENUE'}
                  </p>
                </div>
                <ChevronDown className="h-3.5 w-3.5 text-zinc-500 group-hover:text-zinc-300 transition-colors ml-1" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-72 bg-[#0F0F10] border-white/10 text-zinc-200">
              <DropdownMenuLabel className="text-[10px] uppercase font-black tracking-widest text-zinc-500 px-3 py-2">
                Switch Venue
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-white/5" />
              {(venues || []).map((venue) => (
                <DropdownMenuItem
                  key={venue.id}
                  onClick={() => selectVenue(venue)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-3 cursor-pointer font-medium rounded-lg mx-1 my-0.5",
                    venue.id === activeVenue.id
                      ? "bg-blue-500/10 text-blue-400"
                      : "focus:bg-zinc-100 dark:focus:bg-white/5 text-zinc-500 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white"
                  )}
                >
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center border shadow-inner",
                    venue.id === activeVenue.id
                      ? "bg-blue-500/10 border-blue-500/20"
                      : "bg-zinc-900 border-white/5"
                  )}>
                    <Building2 className={cn(
                      "h-4 w-4",
                      venue.id === activeVenue.id ? "text-blue-400" : "text-zinc-500"
                    )} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold truncate">{venue.name}</div>
                    <div className="text-[10px] text-zinc-500 uppercase tracking-wider">{(venue.type as string) || 'venue'}</div>
                  </div>
                  {venue.id === activeVenue.id && (
                    <Check className="h-4 w-4 text-blue-400 shrink-0" />
                  )}
                </DropdownMenuItem>
              ))}
              {(!venues || venues.length === 0) && (
                <div className="px-4 py-3 text-xs text-zinc-600 italic">No venues available</div>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Center: Inline Search Bar */}
      <form onSubmit={handleSearch} className="flex-1 max-w-2xl relative">
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 group-focus-within:text-red-500 transition-colors z-10 duration-300" />
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
            className="w-full bg-zinc-900/50 border border-white/5 rounded-2xl px-12 py-3 text-sm text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-red-500/30 focus:bg-zinc-900 focus:ring-4 focus:ring-red-500/10 shadow-inner hover:bg-zinc-900/80 transition-all duration-300"
          />
          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none">
            <kbd className="text-[10px] font-mono text-zinc-600 bg-zinc-800/60 border border-zinc-700/50 rounded px-1.5 py-0.5 shadow-sm">⌘K</kbd>
          </div>
          {searchQuery && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => {
                setSearchQuery('');
                setShowSuggestions(false);
              }}
              className="absolute right-12 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors z-10 p-1 rounded-full hover:bg-zinc-100 dark:hover:bg-white/10 pointer-events-auto"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Autocomplete Suggestions Dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-[#0F0F10] border border-white/10 rounded-2xl shadow-[0_20px_40px_rgba(0,0,0,0.5)] overflow-hidden z-50 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200">
            <div className="px-3 py-2 text-[10px] uppercase font-bold tracking-widest text-zinc-600 bg-white/5">Pages & Features</div>
            {suggestions.map((suggestion, idx) => {
              const Icon = suggestion.icon;
              const isSelected = idx === selectedSuggestionIdx;
              return (
                <div
                  key={`${suggestion.path}-${idx}`}
                  onClick={() => handleSuggestionClick(suggestion.path)}
                  className={cn(
                    "flex items-center justify-between px-4 py-3 cursor-pointer transition-all group border-b border-white/5 last:border-b-0",
                    isSelected ? "bg-red-500/10" : "hover:bg-white/5"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center border transition-all",
                      isSelected
                        ? "bg-red-500/10 border-red-500/30"
                        : "bg-zinc-900 border-white/5 group-hover:border-red-500/30 group-hover:bg-red-500/10"
                    )}>
                      <Icon className={cn("h-4 w-4", isSelected ? "text-red-500" : "text-zinc-500 group-hover:text-red-500")} />
                    </div>
                    <div>
                      <div className={cn(
                        "text-sm font-semibold transition-colors",
                        isSelected ? "text-white" : "text-zinc-300 group-hover:text-white"
                      )}>
                        {suggestion.title}
                      </div>
                      <div className="text-[10px] uppercase tracking-wider text-zinc-600">
                        {suggestion.breadcrumb}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isSelected && (
                      <span className="text-[10px] font-mono text-zinc-600 border border-zinc-800 rounded px-1.5 py-0.5">↵</span>
                    )}
                    <ChevronDown className={cn(
                      "h-3 w-3 -rotate-90 transition-transform",
                      isSelected ? "text-red-400 translate-x-1" : "text-zinc-700 group-hover:text-zinc-400 group-hover:translate-x-1"
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
        <div className="flex items-center gap-3 px-1 py-1 rounded-full bg-black/40 border border-white/5 hover:border-white/10 transition-all">
          <div className="flex items-center gap-2 pl-3">
            {isSafeMode ? (
              <ShieldAlert className="h-3.5 w-3.5 text-red-500 animate-pulse" />
            ) : (
              <ShieldCheck className="h-3.5 w-3.5 text-green-500" />
            )}
            <span className={cn(
              "text-[10px] font-black tracking-widest uppercase",
              isSafeMode ? "text-red-500" : "text-zinc-500"
            )}>
              {isSafeMode ? "SAFE MODE" : "LIVE MODE"}
            </span>
          </div>
          <button
            aria-label={isSafeMode ? 'Disable safe mode' : 'Enable safe mode'}
            onClick={() => setSafeMode(!isSafeMode)}
            className={cn(
              "w-10 h-6 rounded-full p-1 transition-all duration-300 relative focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black focus:ring-zinc-700",
              isSafeMode ? "bg-red-900/40" : "bg-zinc-800"
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
            <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors">
              {mode === 'dark' ? <Moon className="h-5 w-5" /> :
                mode === 'light' ? <Sun className="h-5 w-5" /> :
                  <Monitor className="h-5 w-5" />}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-[#0F0F10] border-white/10 text-zinc-200">
            <DropdownMenuItem onClick={() => setMode('light')} className={cn("cursor-pointer focus:bg-white/5", mode === 'light' && "bg-white/10")}>
              <Sun className="mr-2 h-4 w-4" /> Light
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setMode('dark')} className={cn("cursor-pointer focus:bg-white/5", mode === 'dark' && "bg-white/10")}>
              <Moon className="mr-2 h-4 w-4" /> Dark
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setMode('system')} className={cn("cursor-pointer focus:bg-white/5", mode === 'system' && "bg-white/10")}>
              <Monitor className="mr-2 h-4 w-4" /> System
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Clock — Malta Timezone */}
        <div className="flex items-center gap-1.5 text-zinc-500">
          <Clock className="h-3.5 w-3.5" />
          <span className="text-xs font-mono font-medium tabular-nums tracking-wide">{currentTime}</span>
        </div>

        <div className="w-px h-8 bg-white/5"></div>

        {/* Notifications */}
        <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-white hover:bg-white/5 relative">
          <Bell className="h-5 w-5" />
          <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 rounded-full border-2 border-[#0A0A0B] flex items-center justify-center">
            <span className="text-[8px] font-black text-white leading-none">3</span>
          </span>
        </Button>

        {/* User Menu with System Status Indicator */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="flex items-center gap-3 text-zinc-100 font-medium hover:bg-white/5 relative px-2 py-1 h-auto rounded-xl border border-transparent hover:border-white/5 transition-all"
            >
              <div className="relative">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-zinc-700 to-zinc-900 flex items-center justify-center border border-white/10 shadow-lg">
                  <User className={cn("h-4 w-4", getStatusColor())} />
                </div>
                <div className={cn(
                  "absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-[#0A0A0B]",
                  systemStatus === 'healthy' && "bg-green-500",
                  systemStatus === 'degraded' && "bg-yellow-500",
                  systemStatus === 'offline' && "bg-red-500"
                )} />
              </div>
              <div className="flex flex-col items-start mr-1">
                <span className="text-sm font-bold leading-none">{user?.name || t('topbar.roles.user')}</span>
                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider leading-none mt-1">
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
              <ChevronDown className="h-3 w-3 text-zinc-500" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64 bg-[#0F0F10] border-white/10 text-zinc-200">
            <div className="px-4 py-3 border-b border-white/5 mb-1">
              <p className="text-sm font-bold text-zinc-900 dark:text-white">{t('topbar.myAccount')}</p>
              <p className="text-xs text-zinc-500">{t('topbar.managePreferences')}</p>
            </div>

            <DropdownMenuItem
              onClick={() => navigate('/profile')}
              className="font-medium cursor-pointer focus:bg-white/5"
            >
              <User className="mr-2 h-4 w-4 text-zinc-500" />
              {t('topbar.profile')}
            </DropdownMenuItem>

            <DropdownMenuSeparator className="bg-white/5" />

            {/* System Status */}
            <div className="px-3 py-2">
              <div className="text-[10px] uppercase font-bold tracking-widest text-zinc-600 mb-2 px-1">{t('topbar.systemHealth')}</div>
              <div className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-widest border border-transparent transition-colors",
                systemStatus === 'healthy' && "bg-green-500/5 text-green-500 border-green-500/10",
                systemStatus === 'degraded' && "bg-yellow-500/5 text-yellow-500 border-yellow-500/10",
                systemStatus === 'offline' && "bg-red-500/5 text-red-500 border-red-500/10"
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

            {/* Admin Actions */}
            {user?.role === 'product_owner' && (
              <>
                <div className="px-3 py-2">
                  <div className="text-[10px] uppercase font-bold tracking-widest text-zinc-600 mb-2 px-1">{t('topbar.adminControls')}</div>
                  <DropdownMenuItem
                    onClick={() => navigate('/admin/migration')}
                    className="font-medium cursor-pointer focus:bg-white/5"
                  >
                    <Database className="mr-2 h-4 w-4 text-zinc-500" />
                    {t('topbar.migrationHub')}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => navigate('/admin/theme')}
                    className="font-medium cursor-pointer focus:bg-white/5"
                  >
                    <Palette className="mr-2 h-4 w-4 text-zinc-500" />
                    {t('topbar.themeCustomizer')}
                  </DropdownMenuItem>
                </div>
                <DropdownMenuSeparator className="bg-white/5" />
              </>
            )}

            <DropdownMenuItem onClick={() => navigate('/admin/settings')} className="focus:bg-white/5">
              <Settings className="mr-2 h-4 w-4 text-zinc-500" />
              {t('topbar.settings')}
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-white/5" />
            <DropdownMenuItem
              onClick={handleLogout}
              className="text-red-400 focus:text-red-300 focus:bg-red-500/10 cursor-pointer font-medium"
            >
              <LogOut className="mr-2 h-4 w-4" />
              {t('topbar.signOut')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="w-px h-8 bg-white/5"></div>

        {/* Region & Language (Malta) - Moved to Far Right */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-9 w-auto px-2 gap-2 hover:bg-white/5 transition-colors" title="Region: Malta (EUR)">
              <span className="text-xl leading-none">🇲🇹</span>
              <span className="text-zinc-400 font-medium text-sm">€</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-[#0F0F10] border-white/10 text-zinc-200 min-w-[140px]">
            <DropdownMenuLabel className="text-xs text-zinc-500 font-normal uppercase tracking-wider">
              {t('topbar.fiscalRegion')}
            </DropdownMenuLabel>
            <DropdownMenuItem className="focus:bg-transparent cursor-default">
              <span className="mr-3 text-lg">🇲🇹</span> Malta (MT)
            </DropdownMenuItem>

            <DropdownMenuSeparator className="bg-white/10" />

            <DropdownMenuLabel className="text-xs text-zinc-500 font-normal uppercase tracking-wider">
              {t('topbar.interfaceLanguage')}
            </DropdownMenuLabel>
            <DropdownMenuItem onClick={() => i18n.changeLanguage('en')} className={cn("cursor-pointer focus:bg-white/5 font-medium", i18n.language === 'en' && "bg-white/10 text-blue-400")}>
              <span className="mr-3 text-lg">🇬🇧</span> English
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => i18n.changeLanguage('mt')} className={cn("cursor-pointer focus:bg-white/5 font-medium", i18n.language === 'mt' && "bg-white/10 text-blue-400")}>
              <span className="mr-3 text-lg">🇲🇹</span> Malti
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
