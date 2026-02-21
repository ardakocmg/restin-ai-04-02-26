import React from 'react';
import { Target, TrendingUp, Package, AlertTriangle } from 'lucide-react';

export function DemandForecast({ data }) {
    const safeData = data || { peakExpected: "19:00 - 21:00", covers: 0 };
    return (
        <div className="bg-[#020610] border border-[#00FFFF]/30 rounded p-4 relative overflow-hidden mb-4 shadow-[inset_0_0_20px_rgba(0,255,255,0.05)]">
            <div className="flex justify-between items-center mb-4 z-10">
                <h3 className="text-[#00FFFF] font-mono text-sm tracking-widest font-bold uppercase drop-shadow-[0_0_5px_rgba(0,255,255,0.8)] flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    AI Demand Forecast
                </h3>
            </div>

            <div className="flex justify-between items-end mb-6">
                <div className="flex flex-col">
                    <span className="text-[#00FFFF]/60 font-mono text-[10px] tracking-widest mb-1 uppercase">Peak Expected</span>
                    <span className="text-[#FFFFFF] font-mono text-lg tracking-wider text-shadow-[0_0_5px_rgba(255,255,255,0.8)]">{safeData.peakExpected}</span>
                </div>
                <div className="flex flex-col items-end">
                    <span className="text-[#00FFFF]/60 font-mono text-[10px] tracking-widest mb-1 uppercase">Est Covers</span>
                    <span className="text-[#00FFFF] font-mono text-xl font-bold tracking-wider text-shadow-[0_0_8px_rgba(0,255,255,0.8)] flex items-center gap-1">
                        <TrendingUp className="w-4 h-4" /> {safeData.covers}+
                    </span>
                </div>
            </div>

            {/* Simulated Chart Area */}
            <div className="h-24 w-full relative border-b border-l border-[#00FFFF]/30">
                {/* Grid */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,255,255,0.1)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,255,255,0.1)_1px,transparent_1px)] bg-[size:2rem_1rem]"></div>

                {/* SVG Curve Line */}
                <svg className="absolute inset-0 w-full h-full preserve-3d" viewBox="0 0 100 100" preserveAspectRatio="none">
                    <path d="M0,80 Q20,80 30,50 T60,20 T100,50" fill="none" stroke="#FF0000" strokeWidth="2" className="drop-shadow-[0_0_5px_rgba(255,0,0,0.8)]" />
                    <path d="M0,80 Q20,80 30,50 T60,20 T100,50 L100,100 L0,100 Z" fill="url(#redGlow)" opacity="0.2" />
                    <defs>
                        <linearGradient id="redGlow" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#FF0000" />
                            <stop offset="100%" stopColor="transparent" />
                        </linearGradient>
                    </defs>

                    {/* Points */}
                    <circle cx="30" cy="50" r="2" fill="#00FFFF" className="drop-shadow-[0_0_5px_#00FFFF]" />
                    <circle cx="60" cy="20" r="3" fill="#FFFFFF" className="drop-shadow-[0_0_10px_#FFFFFF] animate-pulse" />
                    <circle cx="100" cy="50" r="2" fill="#00FFFF" className="drop-shadow-[0_0_5px_#00FFFF]" />
                </svg>

                {/* X-Axis Labels */}
                <div className="absolute -bottom-5 left-0 w-full flex justify-between font-mono text-[8px] text-[#00FFFF]/60">
                    <span>17:00</span>
                    <span>19:00</span>
                    <span>21:00</span>
                    <span>23:00</span>
                </div>
            </div>

        </div>
    );
}

export function InventoryStatus({ data }) {
    const safeData = data || [
        { name: "SYSTEM OFFLINE", left: 0, status: "critical" },
        { name: "SYSTEM OFFLINE", left: 0, status: "critical" },
        { name: "SYSTEM OFFLINE", left: 0, status: "critical" }
    ];
    return (
        <div className="bg-[#020610] border border-[#00FFFF]/30 rounded p-4 flex-1 relative overflow-hidden shadow-[inset_0_0_20px_rgba(0,255,255,0.05)]">
            <div className="flex justify-between items-center mb-6 z-10">
                <h3 className="text-[#00FFFF] font-mono text-sm tracking-widest font-bold uppercase drop-shadow-[0_0_5px_rgba(0,255,255,0.8)] flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    Smart Inventory Status
                </h3>
            </div>

            <div className="space-y-4">
                {safeData.map((item, idx) => {
                    let color = "#00FF00";
                    let isPulse = false;
                    let BarIcon = null;
                    if (item.status === 'critical') { color = "#FF0000"; isPulse = true; BarIcon = AlertTriangle; }
                    else if (item.status === 'warning') { color = "#FF9900"; isPulse = true; BarIcon = AlertTriangle; }

                    return (
                        <div key={idx} className="flex flex-col gap-1">
                            <div className="flex justify-between font-mono text-[10px]">
                                <span className="text-[#FFFFFF] flex items-center gap-1">
                                    {BarIcon && <BarIcon className={`w-3 h-3 text-[${color}]`} />}
                                    {item.name}
                                </span>
                                <span className={`text-[${color}] ${isPulse ? 'animate-pulse' : ''}`}>{item.left}% LEFT</span>
                            </div>

                            {item.status === 'critical' ? (
                                <div className="w-full h-1.5 bg-[#021020] rounded overflow-hidden border border-[#FF0000]/30 relative">
                                    <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,0,0,0.2)_50%,transparent_75%,transparent_100%)] bg-[length:10px_10px]"></div>
                                    <div className={`h-full bg-[${color}] shadow-[0_0_5px_${color}] relative z-10`} style={{ width: `${item.left}%`  /* keep-inline */ }}></div>
                                </div>
                            ) : item.status === 'warning' ? (
                                <div className="w-full h-1.5 bg-[#021020] rounded overflow-hidden p-[1px]">
                                    <div className={`h-full bg-gradient-to-r from-[${color}] to-[transparent] w-full animate-pulse relative`}>
                                        <div className={`absolute top-0 left-0 h-full bg-[${color}] shadow-[0_0_5px_${color}]`} style={{ width: `${item.left}%`  /* keep-inline */ }}></div>
                                    </div>
                                </div>
                            ) : (
                                <div className="w-full h-1.5 bg-[#021020] rounded overflow-hidden">
                                    <div className={`h-full bg-[${color}] shadow-[0_0_5px_${color}]`} style={{ width: `${item.left}%`  /* keep-inline */ }}></div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Action button */}
            <button className="w-full mt-6 py-2 border border-[#FF0000]/50 bg-[#FF0000]/10 text-[#FF0000] font-mono text-[10px] tracking-widest uppercase hover:bg-[#FF0000] hover:text-white transition-all shadow-[inset_0_0_10px_rgba(255,0,0,0.2)]">
                Auto-Restock Critical Items
            </button>
        </div>
    );
}
