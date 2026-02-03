import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useVenue } from '../context/VenueContext';
import { cn } from '@/lib/utils';
import { Bell, Search, Settings, User, LogOut, ChevronDown, X, Wifi, WifiOff, AlertTriangle, ShieldCheck, ShieldAlert } from 'lucide-react';
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

export default function NewTopBar() {
  const { user, logout } = useAuth();
  const { activeVenue, venues, selectVenue } = useVenue();
  const { isSafeMode, setSafeMode } = useSafeMode();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [systemStatus, setSystemStatus] = useState('healthy'); // 'healthy', 'degraded', 'offline'

  // All available pages for search
  const allPages = [
    { title: 'Dashboard', path: '/admin/dashboard', category: 'Main', keywords: ['home', 'overview', 'main'] },
    { title: 'HR Dashboard', path: '/admin/hr', category: 'Human Resources', keywords: ['human', 'resources', 'people'] },
    { title: 'Scheduler', path: '/admin/hr/scheduler', category: 'Human Resources', keywords: ['schedule', 'shifts', 'roster', 'planning'] },
    { title: 'Personnel', path: '/admin/hr/personnel', category: 'Human Resources', keywords: ['employees', 'staff', 'team', 'people'] },
    { title: 'Payroll', path: '/admin/hr/payroll', category: 'Human Resources', keywords: ['salary', 'wages', 'payment', 'compensation'] },
    { title: 'Clocking Data', path: '/admin/hr/clocking', category: 'Human Resources', keywords: ['attendance', 'time', 'clock'] },
    { title: 'Settings', path: '/admin/settings', category: 'System', keywords: ['config', 'preferences', 'options'] },
    { title: 'Observability', path: '/admin/observability', category: 'System', keywords: ['monitoring', 'logs', 'metrics'] },
    { title: 'Operations', path: '/admin/operations', category: 'Main', keywords: ['ops', 'orders', 'service'] },
    { title: 'Menu & Inventory', path: '/admin/menu', category: 'Main', keywords: ['food', 'items', 'stock'] },
  ];

  // Filter suggestions based on search query
  const suggestions = searchQuery.trim()
    ? allPages.filter(page => {
      const query = searchQuery.toLowerCase();
      return (
        page.title.toLowerCase().includes(query) ||
        page.category.toLowerCase().includes(query) ||
        page.keywords.some(kw => kw.includes(query))
      );
    }).slice(0, 5) // Limit to 5 suggestions
    : []

  // Monitor system health (mock implementation)
  useEffect(() => {
    const checkSystemHealth = () => {
      // In production, this would check actual API health endpoints
      const isOnline = navigator.onLine;
      if (!isOnline) {
        setSystemStatus('offline');
      } else {
        // Mock: randomly set status for demo
        setSystemStatus('healthy');
      }
    };

    checkSystemHealth();
    const interval = setInterval(checkSystemHealth, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    // If there are suggestions, navigate to the first one
    if (suggestions.length > 0) {
      navigate(suggestions[0].path);
    } else {
      // Fallback navigation
      const query = searchQuery.toLowerCase();
      if (query.includes('scheduler')) navigate('/admin/hr/scheduler');
      else if (query.includes('personnel')) navigate('/admin/hr/personnel');
      else if (query.includes('payroll')) navigate('/admin/hr/payroll');
      else if (query.includes('hr')) navigate('/admin/hr');
      else navigate('/admin/dashboard');
    }

    setSearchQuery('');
    setShowSuggestions(false);
  };

  const handleSuggestionClick = (path) => {
    navigate(path);
    setSearchQuery('');
    setShowSuggestions(false);
  };

  const getStatusColor = () => {
    switch (systemStatus) {
      case 'healthy': return 'text-green-500';
      case 'degraded': return 'text-yellow-500';
      case 'offline': return 'text-red-500';
      default: return 'text-zinc-500';
    }
  };

  const getStatusIcon = () => {
    switch (systemStatus) {
      case 'healthy': return <Wifi className="h-3 w-3" />;
      case 'degraded': return <AlertTriangle className="h-3 w-3" />;
      case 'offline': return <WifiOff className="h-3 w-3" />;
      default: return <Wifi className="h-3 w-3" />;
    }
  };

  const getStatusText = () => {
    switch (systemStatus) {
      case 'healthy': return 'CLOUD ONLINE';
      case 'degraded': return 'PARTIAL OUTAGE';
      case 'offline': return 'OFFLINE';
      default: return 'UNKNOWN';
    }
  };

  return (
    <header
      className="h-16 flex items-center justify-between px-6 gap-4"
      style={{
        backgroundColor: '#0A0A0B',
        borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
      }}
    >
      {/* Left: Venue Info (Static Display) */}
      <div className="flex items-center gap-4 flex-shrink-0">
        {activeVenue && (
          <div className="flex items-center gap-2 px-2 py-1">
            <div>
              <h2 className="text-sm font-black text-white uppercase tracking-tight">
                {activeVenue.name}
              </h2>
              <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-zinc-500">
                {activeVenue.type}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Center: Inline Search Bar */}
      <form onSubmit={handleSearch} className="flex-1 max-w-2xl relative">
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 group-focus-within:text-blue-500 transition-colors z-10" />
          <input
            type="text"
            placeholder="Search pages, modules, features..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            className="w-full bg-black/40 border border-white/5 rounded-full px-10 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-blue-500/50 shadow-inner hover:bg-black/60 transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setShowSuggestions(false);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors z-10"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Autocomplete Suggestions Dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-[#121214] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50">
            {suggestions.map((suggestion, idx) => (
              <div
                key={idx}
                onClick={() => handleSuggestionClick(suggestion.path)}
                className="flex items-center justify-between px-4 py-3 hover:bg-white/5 cursor-pointer transition-all group border-b border-white/5 last:border-b-0"
              >
                <div className="flex items-center gap-3">
                  <Search className="h-4 w-4 text-blue-400" />
                  <div>
                    <div className="text-sm font-medium text-white group-hover:text-blue-400 transition-colors">
                      {suggestion.title}
                    </div>
                    <div className="text-[10px] uppercase tracking-widest text-zinc-600">
                      {suggestion.category}
                    </div>
                  </div>
                </div>
                <ChevronDown className="h-3 w-3 text-zinc-600 -rotate-90" />
              </div>
            ))}
          </div>
        )}
      </form>

      {/* Right: Actions */}
      <div className="flex items-center gap-3 flex-shrink-0">
        {/* Global Context Switcher */}
        <div className="flex items-center gap-3 px-3 py-1.5 rounded-full bg-zinc-900/50 border border-white/5 hover:border-white/10 transition-all">
          <div className="flex items-center gap-2">
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
            onClick={() => setSafeMode(!isSafeMode)}
            className={cn(
              "w-8 h-4 rounded-full p-0.5 transition-all duration-300 relative",
              isSafeMode ? "bg-red-500/20" : "bg-zinc-800"
            )}
          >
            <div className={cn(
              "w-3 h-3 rounded-full shadow-lg transform transition-all duration-300",
              isSafeMode ? "translate-x-4 bg-red-500" : "translate-x-0 bg-zinc-400"
            )} />
          </button>
        </div>

        {/* Notifications */}
        <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-white">
          <Bell className="h-5 w-5" />
        </Button>

        {/* User Menu with System Status Indicator */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="flex items-center gap-2 text-zinc-100 font-medium hover:bg-white/5 relative"
            >
              <div className="relative">
                <User className={cn("h-5 w-5", getStatusColor())} />
                <div className={cn(
                  "absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border border-[#0A0A0B]",
                  systemStatus === 'healthy' && "bg-green-500",
                  systemStatus === 'degraded' && "bg-yellow-500",
                  systemStatus === 'offline' && "bg-red-500"
                )} />
              </div>
              <span className="text-sm">{user?.name || 'User'}</span>
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem
              onClick={() => navigate('/admin/hr/employee-portal')}
              className="font-bold cursor-pointer"
            >
              My Account
            </DropdownMenuItem>
            <DropdownMenuSeparator />

            {/* System Status */}
            <div className="px-2 py-2 mb-1">
              <div className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-md text-xs font-bold uppercase tracking-widest",
                systemStatus === 'healthy' && "bg-green-500/10 text-green-500",
                systemStatus === 'degraded' && "bg-yellow-500/10 text-yellow-500",
                systemStatus === 'offline' && "bg-red-500/10 text-red-500"
              )}>
                {getStatusIcon()}
                <span>{getStatusText()}</span>
              </div>
            </div>

            <DropdownMenuSeparator />

            <DropdownMenuItem onClick={() => navigate('/admin/settings')}>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout}>
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
