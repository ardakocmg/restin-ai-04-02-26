'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { cn } from '@antigravity/ui';
import { Button } from '@antigravity/ui';
import {
    Bell, Search, Settings, User, LogOut, ChevronDown, X, Wifi, WifiOff, AlertTriangle, ShieldCheck, ShieldAlert
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@antigravity/ui';

export function TopBar() {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState('');
    const [isSafeMode, setSafeMode] = useState(false);
    const [systemStatus, setSystemStatus] = useState('healthy'); // 'healthy', 'degraded', 'offline'

    const handleSearch = (e) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;
        // Mock search navigation
        router.push('/dashboard/hr');
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
            className="h-20 flex items-center justify-between px-8 gap-6 z-20 relative transition-all duration-300"
            style={{
                backgroundColor: '#0A0A0B',
                borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                background: 'linear-gradient(to bottom, rgba(10,10,11,1) 0%, rgba(10,10,11,0.95) 100%)',
                backdropFilter: 'blur(10px)'
            }}
        >
            {/* Left: Venue Info (Static Display) */}
            <div className="flex items-center gap-4 flex-shrink-0">
                <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-all cursor-default group">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center border border-white/10 shadow-inner">
                        <span className="text-xs font-bold text-zinc-400 group-hover:text-white transition-colors">V</span>
                    </div>
                    <div>
                        <h2 className="text-sm font-bold text-zinc-200 tracking-tight group-hover:text-white transition-colors">
                            Valletta HQ
                        </h2>
                        <p className="text-[10px] uppercase font-black tracking-[0.2em] text-zinc-600 group-hover:text-zinc-500 transition-colors">
                            Flagship
                        </p>
                    </div>
                </div>
            </div>

            {/* Center: Inline Search Bar */}
            <form onSubmit={handleSearch} className="flex-1 max-w-2xl relative">
                <div className="relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 group-focus-within:text-red-500 transition-colors z-10 duration-300" />
                    <input
                        type="text"
                        placeholder="Search pages, modules, features..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-zinc-900/50 border border-white/5 rounded-2xl px-12 py-3 text-sm text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-red-500/30 focus:bg-zinc-900 focus:ring-4 focus:ring-red-500/10 shadow-inner hover:bg-zinc-900/80 transition-all duration-300"
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none">
                        <span className="text-[10px] font-mono text-zinc-700 border border-zinc-800 rounded px-1.5 py-0.5">⌘ K</span>
                    </div>
                </div>
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

                <div className="w-px h-8 bg-white/5"></div>

                {/* Notifications */}
                <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-white hover:bg-white/5 relative">
                    <Bell className="h-5 w-5" />
                    <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-[#0A0A0B]"></span>
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
                                <span className="text-sm font-bold leading-none">Admin</span>
                                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider leading-none mt-1">Super User</span>
                            </div>
                            <ChevronDown className="h-3 w-3 text-zinc-500" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-64 bg-[#0F0F10] border-white/10 text-zinc-200">
                        <div className="px-4 py-3 border-b border-white/5 mb-1">
                            <p className="text-sm font-bold text-white">My Account</p>
                            <p className="text-xs text-zinc-500">manage your preferences</p>
                        </div>

                        <DropdownMenuItem className="font-medium cursor-pointer focus:bg-white/5">
                            <User className="mr-2 h-4 w-4 text-zinc-500" />
                            Profile
                        </DropdownMenuItem>

                        <DropdownMenuSeparator className="bg-white/5" />

                        {/* System Status */}
                        <div className="px-3 py-2">
                            <div className="text-[10px] uppercase font-bold tracking-widest text-zinc-600 mb-2 px-1">System Health</div>
                            <div className={cn(
                                "flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-widest border border-transparent transition-colors",
                                systemStatus === 'healthy' && "bg-green-500/5 text-green-500 border-green-500/10",
                                systemStatus === 'degraded' && "bg-yellow-500/5 text-yellow-500 border-yellow-500/10",
                                systemStatus === 'offline' && "bg-red-500/5 text-red-500 border-red-500/10"
                            )}>
                                {getStatusIcon()}
                                <span>{getStatusText()}</span>
                            </div>
                        </div>

                        <DropdownMenuSeparator className="bg-white/5" />

                        <DropdownMenuItem className="text-red-500 focus:text-red-400 focus:bg-red-500/5">
                            <LogOut className="mr-2 h-4 w-4" />
                            Logout
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    );
}
