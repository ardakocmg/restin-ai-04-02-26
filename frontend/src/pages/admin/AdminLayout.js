import React, { useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import NewSidebar from '../../layouts/NewSidebar';
import NewTopBar from '../../layouts/NewTopBar';
import { Button } from '../../components/ui/button';
import { logger } from '../../lib/logger';

export default function AdminLayout() {
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isTertiaryOpen, setIsTertiaryOpen] = useState(false);
  const [domainBarExpanded, setDomainBarExpanded] = useState(false);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const { user, loading } = useAuth();
  const location = useLocation();

  useEffect(() => {
    if (!loading && !user) {
      // navigate('/login'); // DISABLED per user request: "Never redirect to login"
      // Dev mode: silently continue without user
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    logger.debug('Current admin path', { path: location.pathname });
    setMobileMenuOpen(false); // Close mobile menu on route change
  }, [location.pathname]);

  // Calculate Sidebar Width dynamically based on state
  // Pane 1: w-20 (5rem) or w-64 (16rem)
  const pane1Width = domainBarExpanded ? 16 : 5;

  // Pane 2: w-72 (18rem) or w-16 (4rem)
  const pane2Width = sidebarCollapsed ? 4 : 18;

  // Pane 3: w-60 (15rem) or w-16 (4rem) or 0
  const pane3Width = isTertiaryOpen ? (sidebarCollapsed ? 4 : 15) : 0;

  // Mobile: 0 margin, Desktop: calculated
  // We use CSS media query logic or simple class toggling. 
  // Since we can't easily perform media queries in JS variables without hooks, we'll control layout via classes.
  const desktopSidebarOffset = `${pane1Width + pane2Width + pane3Width}rem`;

  return (
    <div className="flex h-screen overflow-hidden bg-[#0A0A0B]">
      {/* Mobile Logo Toggle (Favicon) */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="h-10 w-10 bg-gradient-to-br from-red-600 to-red-800 rounded-xl flex items-center justify-center shadow-[0_0_25px_rgba(220,38,38,0.4)] border border-red-500/20 active:scale-95 transition-transform"
        >
          <span className="text-2xl font-black text-white italic transform -skew-x-6">R</span>
        </button>
      </div>

      {/* Sidebar Wrapper for Mobile */}
      <div className={`
        fixed inset-0 z-40 lg:relative lg:z-auto transition-transform duration-300 lg:translate-x-0
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:flex
      `}>
        <NewSidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
          onTertiaryToggle={setIsTertiaryOpen}
          onDomainExpand={setDomainBarExpanded}
        />
      </div>

      {/* Mobile Overlay Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/80 z-30 lg:hidden backdrop-blur-sm"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Main Content */}
      <div
        className="flex-1 flex flex-col overflow-hidden transition-all duration-300 w-full"
      >
        {/* Top Bar */}
        <div className="pl-16 lg:pl-0"> {/* Add padding on mobile for hamburger */}
          <NewTopBar />
        </div>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-4 lg:p-6 pb-24 lg:pb-6"> {/* Extra bottom padding for mobile usage */}
          <Outlet />
        </main>
      </div>
    </div>
  );
}
