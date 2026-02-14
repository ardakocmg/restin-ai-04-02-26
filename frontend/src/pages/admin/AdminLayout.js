import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import NewSidebar from '../../layouts/NewSidebar';
import NewTopBar from '../../layouts/NewTopBar';
import { logger } from '../../lib/logger';
import FloatingChat from '../../components/widgets/FloatingChat';
import FloatingPTT from '../../components/widgets/FloatingPTT';
import { GlobalPTTProvider } from '../../contexts/GlobalPTTContext';
import AuthElevationModal from '../../features/auth/AuthElevationModal';
import Breadcrumb from '../../components/shared/Breadcrumb';
import AnimatedOutlet from '../../components/shared/AnimatedOutlet';

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



  return (
    <GlobalPTTProvider>
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

          {/* Breadcrumb Strip */}
          <div className="px-4 lg:px-6 py-2 border-b border-white/[0.04] bg-[#0A0A0B]/80 backdrop-blur-sm">
            <Breadcrumb />
          </div>

          {/* Page Content — Animated route transitions */}
          <main className="flex-1 overflow-auto p-4 lg:p-6 pb-24 lg:pb-6"> {/* Extra bottom padding for mobile usage */}
            <AnimatedOutlet />
          </main>

          {/* Floating Widgets — visible on all admin pages */}
          <FloatingChat />
          <FloatingPTT />

          {/* Auth Elevation Modal — appears when sensitive areas need password/2FA */}
          <AuthElevationModal />
        </div>
      </div>
    </GlobalPTTProvider>
  );
}

