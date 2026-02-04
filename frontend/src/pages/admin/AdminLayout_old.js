import { useState, useEffect } from "react";
import { Outlet, useNavigate, Link, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useVenue } from "../../context/VenueContext";
import { 
  LayoutDashboard, Building2, UtensilsCrossed, Users, Package, 
  FileText, ShieldAlert, ScrollText, Settings, LogOut, Menu, X,
  ChevronDown, LayoutGrid, Upload, UserCheck, CalendarDays, Monitor, Activity, UserCog, Sliders, FileSearch, DollarSign, BookOpen, Briefcase, BarChart3
} from "lucide-react";
import { Button } from "../../components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import { cn } from "../../lib/utils";

const navItems = [
  { path: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { path: "/admin/reporting", label: "Reporting", icon: BarChart3 },
  { path: "/admin/hr", label: "HR", icon: Briefcase },
  { path: "/admin/finance", label: "Finance", icon: DollarSign },
  { path: "/admin/accounting", label: "Accounting", icon: BookOpen },
  { path: "/admin/observability", label: "Observability", icon: Activity },
  { path: "/admin/logs", label: "Logs", icon: FileSearch },
  { path: "/admin/operations", label: "Operations", icon: Sliders },
  { path: "/admin/settings", label: "Settings", icon: Settings },
  { path: "/admin/venues", label: "Venues", icon: Building2 },
  { path: "/admin/reservations", label: "Reservations", icon: CalendarDays },
  { path: "/admin/guests", label: "Guests", icon: UserCheck },
  { path: "/admin/floor-plans", label: "Floor Plans", icon: LayoutGrid },
  { path: "/admin/menu", label: "Menu", icon: UtensilsCrossed },
  { path: "/admin/menu-import", label: "Menu Import", icon: Upload },
  { path: "/admin/staff", label: "Staff", icon: Users },
  { path: "/admin/inventory", label: "Inventory", icon: Package },
  { path: "/admin/device-hub", label: "Device Hub", icon: Monitor },
  { path: "/admin/device-mapping", label: "Device Mapping", icon: Monitor },
  { path: "/admin/users", label: "Users", icon: UserCog },
  { path: "/admin/documents", label: "Documents", icon: FileText },
  { path: "/admin/review-risk", label: "Review Risk", icon: ShieldAlert },
  { path: "/admin/audit-logs", label: "Audit Logs", icon: ScrollText },
];

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, isAuthenticated } = useAuth();
  const { venues, activeVenue, selectVenue } = useVenue();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      // navigate("/login"); // DISABLED - Safe Mode
    }
  }, [isAuthenticated, navigate]);

  const handleLogout = () => {
    logout();
    // navigate("/login"); // DISABLED - Safe Mode
  };

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Top Header */}
      <header className="fixed top-0 left-0 right-0 h-16 glass z-50 flex items-center justify-between px-4 lg:px-6">
        <div className="flex items-center gap-4">
          {/* Mobile menu toggle */}
          <Button
            data-testid="mobile-menu-toggle"
            variant="ghost"
            size="icon"
            className="lg:hidden text-white"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>

          {/* Logo */}
          <Link to="/admin/dashboard" className="flex items-center gap-2">
            <h1 className="text-xl font-heading font-bold text-white">
              RESTIN<span className="text-red-500">.AI</span>
            </h1>
          </Link>
        </div>

        {/* Active Venue Selector */}
        <div className="flex items-center gap-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                data-testid="venue-selector"
                variant="outline" 
                className="bg-zinc-900 border-white/10 text-white hover:bg-zinc-800 gap-2"
              >
                <Building2 className="w-4 h-4" />
                <span className="hidden sm:inline">{activeVenue?.name || "Select Venue"}</span>
                <ChevronDown className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-zinc-900 border-white/10 w-56">
              {venues.map(venue => (
                <DropdownMenuItem
                  key={venue.id}
                  data-testid={`venue-option-${venue.id}`}
                  className={cn(
                    "text-white hover:bg-zinc-800 cursor-pointer",
                    activeVenue?.id === venue.id && "bg-zinc-800"
                  )}
                  onClick={() => selectVenue(venue)}
                >
                  <div className="flex flex-col">
                    <span>{venue.name}</span>
                    <span className="text-xs text-zinc-400 capitalize">{venue.type.replace('_', ' ')}</span>
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Venue Badge */}
          {activeVenue && (
            <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-red-500 text-xs font-medium uppercase">
                {activeVenue.type.replace('_', ' ')}
              </span>
            </div>
          )}

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                data-testid="user-menu"
                variant="ghost" 
                className="text-white hover:bg-zinc-800 gap-2"
              >
                <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center">
                  <span className="text-sm font-medium">{user?.name?.[0] || 'U'}</span>
                </div>
                <span className="hidden sm:inline">{user?.name}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-zinc-900 border-white/10 w-48">
              <DropdownMenuItem className="text-zinc-400 hover:bg-transparent cursor-default">
                <span className="text-xs uppercase">{user?.role}</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                data-testid="logout-btn"
                className="text-red-400 hover:bg-zinc-800 cursor-pointer"
                onClick={handleLogout}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Sidebar */}
      <aside className={cn(
        "fixed top-16 left-0 bottom-0 w-64 bg-zinc-900/50 backdrop-blur-sm border-r border-white/5 z-40 transition-transform duration-200",
        sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        <nav className="p-4 space-y-1">
          {navItems.map(item => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            
            return (
              <Link
                key={item.path}
                to={item.path}
                data-testid={`nav-${item.label.toLowerCase().replace(' ', '-')}`}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                  isActive 
                    ? "bg-white text-black" 
                    : "text-zinc-400 hover:text-white hover:bg-zinc-800"
                )}
                onClick={() => setSidebarOpen(false)}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Quick Links */}
        <div className="absolute bottom-4 left-4 right-4 space-y-2">
          <Link
            to="/pos/setup"
            data-testid="quick-link-pos"
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <Settings className="w-4 h-4" />
            <span className="text-sm">Open POS</span>
          </Link>
          <Link
            to="/kds/setup"
            data-testid="quick-link-kds"
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <Settings className="w-4 h-4" />
            <span className="text-sm">Open KDS</span>
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-64 pt-16 min-h-screen">
        <div className="p-6 lg:p-8">
          <Outlet />
        </div>
      </main>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
