import React, { useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import NewSidebar from '../../layouts/NewSidebar';
import NewTopBar from '../../layouts/NewTopBar';
import { Button } from '../../components/ui/button';

export default function AdminLayout() {
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isTertiaryOpen, setIsTertiaryOpen] = useState(false);
  const [domainBarExpanded, setDomainBarExpanded] = useState(false);

  const { user, loading } = useAuth();
  const location = useLocation();

  useEffect(() => {
    if (!loading && !user) {
      // navigate('/login'); // DISABLED per user request: "Never redirect to login"
      console.warn("User not found, but staying on page (Dev Mode)");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    console.log('[AdminLayout] Current Path:', location.pathname);
  }, [location.pathname]);

  // Calculate Sidebar Width dynamically based on state
  // Pane 1: w-20 (5rem) or w-64 (16rem)
  const pane1Width = domainBarExpanded ? 16 : 5;

  // Pane 2: w-72 (18rem) or w-16 (4rem)
  const pane2Width = sidebarCollapsed ? 4 : 18;

  // Pane 3: w-60 (15rem) or w-16 (4rem) or 0
  const pane3Width = isTertiaryOpen ? (sidebarCollapsed ? 4 : 15) : 0;

  const sidebarOffset = `${pane1Width + pane2Width + pane3Width}rem`;

  return (
    <div className="flex h-screen overflow-hidden bg-[#0A0A0B]">
      {/* Sidebar */}
      <NewSidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        onTertiaryToggle={setIsTertiaryOpen}
        onDomainExpand={setDomainBarExpanded}
      />

      {/* Main Content */}
      <div
        className="flex-1 flex flex-col overflow-hidden transition-all duration-300"
        style={{ marginLeft: sidebarOffset, width: `calc(100% - ${sidebarOffset})` }}
      >
        {/* Top Bar */}
        <NewTopBar />

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
