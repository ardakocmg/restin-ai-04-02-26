import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import MobileNav from './MobileNav';
import { Sheet, SheetContent } from '@/components/ui/sheet';

export default function AppShell({ children, user }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isTertiaryOpen, setIsTertiaryOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Auto-collapse sidebar on smaller screens
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setSidebarCollapsed(true);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="min-h-screen bg-[#0A0A0B]">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
          onTertiaryToggle={setIsTertiaryOpen}
        />
      </div>

      {/* Mobile Sidebar (Sheet) */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="p-0 w-64">
          <Sidebar collapsed={false} onToggle={() => setMobileMenuOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className={cn(
        'transition-all duration-300',
        sidebarCollapsed ? 'lg:pl-16' : (isTertiaryOpen ? 'lg:pl-[496px]' : 'lg:pl-[304px]'),
        'pb-16 lg:pb-0' // Space for mobile bottom nav
      )}>
        {/* Top Bar */}
        <TopBar
          onMenuToggle={() => setMobileMenuOpen(true)}
          user={user}
        />

        {/* Page Content */}
        <main className="min-h-[calc(100vh-4rem)]">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileNav />
    </div>
  );
}
