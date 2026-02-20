import React from 'react';
import { Home, ClipboardList, Activity, Truck, Settings, AlertCircle, Database } from 'lucide-react';

export default function TechSidebar() {
    return (
        <div className="w-64 bg-[#020610] border-r border-[#00FFFF]/30 h-full flex flex-col pt-6 pb-6 shadow-[4px_0_24px_rgba(0,255,255,0.05)] z-10 shrink-0">
            {/* Logo Area */}
            <div className="flex items-center gap-3 px-6 mb-12">
                <div className="w-8 h-8 flex items-center justify-center relative">
                    {/* Glowing diamond */}
                    <div className="absolute inset-0 border-2 border-[#00FFFF] rotate-45 animate-pulse shadow-[0_0_10px_rgba(0,255,255,0.5)]"></div>
                    <div className="absolute inset-1 border border-[#00FFFF] rotate-45 bg-[#000000]"></div>
                    <div className="w-1.5 h-1.5 bg-[#FFFFFF] rounded-full z-10 relative shadow-[0_0_5px_#FFFFFF]"></div>
                </div>
                <div className="flex flex-col">
                    <span className="font-mono font-black tracking-widest text-[#FFFFFF] text-lg uppercase leading-tight drop-shadow-[0_0_5px_rgba(255,255,255,0.8)]">AI-OS</span>
                    <span className="font-mono text-[10px] tracking-[0.2em] text-[#00FFFF]/80 uppercase">Kitchen</span>
                </div>
            </div>

            {/* Navigation Links */}
            <nav className="flex-1 px-4 space-y-2">
                {/* Active Link */}
                <div className="flex items-center gap-4 px-4 py-3 bg-[#00FFFF]/10 border-l-2 border-[#00FFFF] rounded-r text-[#00FFFF] cursor-pointer group shadow-[inset_20px_0_20px_-20px_rgba(0,255,255,0.3)]">
                    <Home className="w-5 h-5 drop-shadow-[0_0_8px_rgba(0,255,255,0.8)]" />
                    <span className="font-mono text-sm tracking-wider font-bold drop-shadow-[0_0_5px_rgba(0,255,255,0.5)]">HOME</span>
                </div>

                {/* Inactive Links */}
                <div className="flex items-center gap-4 px-4 py-3 text-[#00FFFF]/50 hover:text-[#00FFFF] hover:bg-[#00FFFF]/5 rounded cursor-pointer transition-colors group">
                    <ClipboardList className="w-5 h-5 group-hover:drop-shadow-[0_0_8px_rgba(0,255,255,0.5)] transition-all" />
                    <span className="font-mono text-sm tracking-wider group-hover:drop-shadow-[0_0_5px_rgba(0,255,255,0.3)] transition-all">LIVE ORDERS</span>
                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#00FF00] shadow-[0_0_5px_#00FF00]"></div>
                </div>

                <div className="flex items-center gap-4 px-4 py-3 text-[#00FFFF]/50 hover:text-[#00FFFF] hover:bg-[#00FFFF]/5 rounded cursor-pointer transition-colors group">
                    <Activity className="w-5 h-5 group-hover:drop-shadow-[0_0_8px_rgba(0,255,255,0.5)] transition-all" />
                    <span className="font-mono text-sm tracking-wider group-hover:drop-shadow-[0_0_5px_rgba(0,255,255,0.3)] transition-all">KITCHEN FLOW</span>
                    <span className="ml-auto font-mono text-[10px] text-[#FF9900]">MODERATE</span>
                </div>

                <div className="flex items-center gap-4 px-4 py-3 text-[#00FFFF]/50 hover:text-[#00FFFF] hover:bg-[#00FFFF]/5 rounded cursor-pointer transition-colors group">
                    <Truck className="w-5 h-5 group-hover:drop-shadow-[0_0_8px_rgba(0,255,255,0.5)] transition-all" />
                    <span className="font-mono text-sm tracking-wider group-hover:drop-shadow-[0_0_5px_rgba(0,255,255,0.3)] transition-all">SUPPLY CHAIN</span>
                </div>

                <div className="flex items-center gap-4 px-4 py-3 text-[#00FFFF]/50 hover:text-[#00FFFF] hover:bg-[#00FFFF]/5 rounded cursor-pointer transition-colors group">
                    <Database className="w-5 h-5 group-hover:drop-shadow-[0_0_8px_rgba(0,255,255,0.5)] transition-all" />
                    <span className="font-mono text-sm tracking-wider group-hover:drop-shadow-[0_0_5px_rgba(0,255,255,0.3)] transition-all">FINANCE</span>
                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#FF0000] shadow-[0_0_5px_#FF0000]"></div>
                </div>
            </nav>

            {/* Bottom Alert Summary */}
            <div className="px-6 mt-auto">
                <div className="flex items-center gap-3 p-3 bg-[#1C0000]/30 border border-[#330000] rounded-lg">
                    <div className="w-8 h-8 rounded-full bg-[#FF0000]/20 flex items-center justify-center border border-[#FF0000]/50">
                        <AlertCircle className="w-4 h-4 text-[#FF0000] drop-shadow-[0_0_5px_rgba(255,0,0,1)]" />
                    </div>
                    <div className="flex flex-col">
                        <span className="font-mono text-xs text-[#FF3333] tracking-widest">ALERTS</span>
                        <span className="font-mono text-[10px] text-[#990000]">ATTENTION: 3</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
