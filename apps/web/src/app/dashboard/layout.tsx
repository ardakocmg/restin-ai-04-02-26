'use client';

import React, { useState } from 'react';
import { Sidebar } from '../../components/layout/Sidebar';
import { TopBar } from '../../components/layout/TopBar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [isTertiaryOpen, setIsTertiaryOpen] = useState(false);
    const [domainBarExpanded, setDomainBarExpanded] = useState(false);

    const sidebarOffset = sidebarCollapsed
        ? '4rem'
        : `${(domainBarExpanded ? 14 : 4) + 16 + (isTertiaryOpen ? 14 : 0)}rem`;

    return (
        <div className="flex h-screen overflow-hidden bg-[#0A0A0B] text-white">
            {/* Sidebar */}
            <Sidebar
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
                <TopBar />

                {/* Page Content */}
                <main className="flex-1 overflow-auto p-6 bg-zinc-950">
                    {children}
                </main>
            </div>
        </div>
    );
}
