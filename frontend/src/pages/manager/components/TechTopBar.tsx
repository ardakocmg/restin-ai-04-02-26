import { Map,Power } from 'lucide-react';

export default function TechTopBar() {
    return (
        <div className="flex bg-[#020610] border-b border-[#00FFFF]/30 p-4 px-6 items-center shadow-[0_4px_12px_rgba(0,255,255,0.05)] shrink-0 z-10 relative overflow-hidden">
            {/* Ambient Top Glow */}
            <div className="absolute top-0 left-1/4 w-1/2 h-full bg-[#00FFFF]/5 blur-3xl pointer-events-none"></div>

            <div className="flex items-center gap-1 border border-[#00FFFF]/30 rounded-sm bg-[#020610] p-1">
                <button className="px-6 py-2 text-[#00FFFF] bg-[#00FFFF]/10 border border-[#00FFFF]/50 font-mono text-xs tracking-[0.2em] uppercase rounded-sm shadow-[0_0_10px_rgba(0,255,255,0.3)]">
                    Dashboard
                </button>
                <button className="px-6 py-2 text-[#00FFFF]/60 hover:text-[#00FFFF] hover:bg-[#00FFFF]/5 font-mono text-xs tracking-[0.2em] uppercase rounded-sm transition-all">
                    Operating
                </button>
                <button className="px-6 py-2 text-[#00FFFF]/60 hover:text-[#00FFFF] hover:bg-[#00FFFF]/5 font-mono text-xs tracking-[0.2em] uppercase rounded-sm transition-all">
                    Inventory
                </button>
                <button className="px-6 py-2 text-[#00FFFF]/60 hover:text-[#00FFFF] hover:bg-[#00FFFF]/5 font-mono text-xs tracking-[0.2em] uppercase rounded-sm transition-all">
                    System
                </button>
                <button className="px-6 py-2 text-[#00FFFF]/60 hover:text-[#00FFFF] hover:bg-[#00FFFF]/5 font-mono text-xs tracking-[0.2em] uppercase rounded-sm transition-all">
                    Analytics
                </button>
                <button className="px-6 py-2 text-[#00FFFF]/60 hover:text-[#00FFFF] hover:bg-[#00FFFF]/5 font-mono text-xs tracking-[0.2em] uppercase rounded-sm transition-all">
                    Settings
                </button>
            </div>

            <div className="ml-auto flex items-center gap-6">
                {/* Clock / Data Component */}
                <div className="flex flex-col text-right">
                    <span className="font-mono text-xs text-[#00FFFF] shadow-[0_0_5px_rgba(0,255,255,0.8)]">02:05:32</span>
                    <span className="font-mono text-[10px] text-[#00FFFF]/60 tracking-widest">SYNC_OK VER_04</span>
                </div>

                {/* System Status Node */}
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded border border-[#00FFFF]/30 bg-[#00FFFF]/10 flex items-center justify-center shadow-[inset_0_0_8px_rgba(0,255,255,0.2)]">
                        <Map className="w-4 h-4 text-[#00FFFF] drop-shadow-[0_0_5px_rgba(0,255,255,0.8)]" />
                    </div>
                </div>

                {/* Power / Exit */}
                <button className="flex items-center gap-2 px-3 h-8 rounded border border-[#FF0000] bg-transparent hover:bg-[#FF0000]/20 transition-all shadow-[0_0_10px_rgba(255,0,0,0.5)] cursor-pointer group">
                    <span className="font-mono text-[10px] text-[#FF0000] uppercase tracking-widest group-hover:drop-shadow-[0_0_5px_rgba(255,0,0,0.8)]">EXIT AI-OS</span>
                    <Power className="w-4 h-4 text-[#FF0000] drop-shadow-[0_0_5px_rgba(255,0,0,0.8)]" />
                </button>
            </div>
        </div>
    );
}
