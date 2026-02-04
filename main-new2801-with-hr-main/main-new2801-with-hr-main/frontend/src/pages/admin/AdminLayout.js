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
      navigate('/login');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    console.log('[AdminLayout] Current Path:', location.pathname);
  }, [location.pathname]);

  const sidebarOffset = sidebarCollapsed
    ? '4rem'
    : `${(domainBarExpanded ? 14 : 4) + 16 + (isTertiaryOpen ? 14 : 0)}rem`;

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
