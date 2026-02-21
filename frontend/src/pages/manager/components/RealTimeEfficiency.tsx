import { Activity, Receipt, UtensilsCrossed, ChefHat, CheckCircle2 } from 'lucide-react';

export default function RealTimeEfficiency({ data }) {
    const safeData = data || {
        prepTimeAvg: "00:00:00",
        cookTimeAvg: "00:00:00",
        deliveryWindow: "0%",
        systemHealth: 0,
        bottleneck: "SCANNING...",
        counts: { ordered: 0, prep: 0, cooking: 0, plating: 0, ready: 0 }
    };

    // Circumference for a 72px radius circle (used in the ring)
    const ringCircumference = 2 * Math.PI * 72;
    const healthOffset = ringCircumference - (ringCircumference * safeData.systemHealth / 100);

    return (
        <div className="bg-[#020610] border border-[#00FFFF]/20 rounded p-4 relative overflow-hidden flex flex-col h-full">
            {/* Ambient Background Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#00FFFF]/[0.03] blur-[100px] pointer-events-none rounded-full z-0"></div>

            <div className="flex justify-between items-center mb-4 z-10 relative">
                <h3 className="text-[#FF0000] font-mono text-sm tracking-widest font-bold uppercase drop-shadow-[0_0_5px_rgba(255,0,0,0.8)] flex items-center gap-2">
                    <Activity className="w-4 h-4" />
                    Real-Time Kitchen Efficiency
                </h3>
            </div>

            {/* Top Stats Row */}
            <div className="z-10 relative grid grid-cols-4 gap-3 mb-4">
                <div className="flex flex-col border-l-2 border-[#00FFFF] pl-2">
                    <span className="text-[#00FFFF]/60 font-mono text-[10px] tracking-widest mb-1">PREP TIME AVG</span>
                    <span className="text-[#00FFFF] font-mono text-lg tracking-wider font-bold drop-shadow-[0_0_5px_rgba(0,255,255,0.8)]">{safeData.prepTimeAvg}</span>
                </div>
                <div className="flex flex-col border-l-2 border-[#00FFFF] pl-2">
                    <span className="text-[#00FFFF]/60 font-mono text-[10px] tracking-widest mb-1">COOK TIME AVG</span>
                    <span className="text-[#00FFFF] font-mono text-lg tracking-wider font-bold drop-shadow-[0_0_5px_rgba(0,255,255,0.8)]">{safeData.cookTimeAvg}</span>
                </div>
                <div className="flex flex-col border-l-2 border-[#00FFFF] pl-2">
                    <span className="text-[#00FFFF]/60 font-mono text-[10px] tracking-widest mb-1">DELIVERY WINDOW</span>
                    <span className="text-[#00FF00] font-mono text-lg tracking-wider font-bold drop-shadow-[0_0_8px_rgba(0,255,0,0.8)]">{safeData.deliveryWindow} <span className="text-xs text-[#00FF00]/60 font-normal">ON TIME</span></span>
                </div>
                <div className="flex flex-col border-l-2 border-[#FF0000] pl-2">
                    <span className="text-[#FF0000]/60 font-mono text-[10px] tracking-widest mb-1">BOTTLENECK</span>
                    <div className="bg-[#FF0000]/20 border border-[#FF0000] px-2 py-0.5 rounded inline-block">
                        <span className="text-[#FF0000] font-mono text-xs tracking-wider font-bold drop-shadow-[0_0_5px_rgba(255,0,0,0.8)] animate-pulse uppercase">{safeData.bottleneck}</span>
                    </div>
                </div>
            </div>

            {/* Central Graphic Area */}
            <div className="flex-1 flex items-center justify-center relative w-full min-h-[260px] z-10">
                <div className="relative w-full max-w-[850px] h-[260px]">

                    {/* SVG Connector Lines - Circuit Board Style */}
                    <svg viewBox="0 0 850 260" className="absolute inset-0 w-full h-full pointer-events-none">
                        {/* Left Side: 3 incoming lines merging into center */}
                        <path d="M 30,50 L 120,50 L 170,80 L 320,130" fill="none" stroke="#00FFFF" strokeWidth="1.5" opacity="0.7" style={{ filter: 'drop-shadow(0 0 3px #00FFFF)' }} /> /* keep-inline */ /* keep-inline */
                        <path d="M 30,130 L 200,130 L 320,130" fill="none" stroke="#00FFFF" strokeWidth="1.5" opacity="0.5" />
                        <path d="M 30,210 L 120,210 L 170,180 L 320,130" fill="none" stroke="#00FFFF" strokeWidth="1.5" opacity="0.7" style={{ filter: 'drop-shadow(0 0 3px #00FFFF)' }} /> /* keep-inline */ /* keep-inline */

                        {/* Right Side: 3 outgoing lines from center */}
                        <path d="M 530,130 L 680,80 L 730,50 L 820,50" fill="none" stroke="#00FFFF" strokeWidth="1.5" opacity="0.7" style={{ filter: 'drop-shadow(0 0 3px #00FFFF)' }} /> /* keep-inline */ /* keep-inline */
                        <path d="M 530,130 L 650,130 L 820,130" fill="none" stroke="#FF0000" strokeWidth="2" opacity="0.9" style={{ filter: 'drop-shadow(0 0 6px #FF0000)' }} /> /* keep-inline */ /* keep-inline */
                        <path d="M 530,130 L 680,180 L 730,210 L 820,210" fill="none" stroke="#00FFFF" strokeWidth="1.5" opacity="0.7" style={{ filter: 'drop-shadow(0 0 3px #00FFFF)' }} /> /* keep-inline */ /* keep-inline */

                        {/* Extra branching sub-lines for density */}
                        <path d="M 120,50 L 140,30" fill="none" stroke="#00FFFF" strokeWidth="1" opacity="0.3" />
                        <path d="M 120,210 L 140,230" fill="none" stroke="#00FFFF" strokeWidth="1" opacity="0.3" />
                        <path d="M 680,80 L 700,60" fill="none" stroke="#FF0000" strokeWidth="1" opacity="0.4" />
                        <path d="M 680,180 L 700,200" fill="none" stroke="#00FFFF" strokeWidth="1" opacity="0.3" />

                        {/* Horizontal data stream pulses */}
                        <line x1="200" y1="100" x2="310" y2="100" stroke="#00FFFF" strokeWidth="1" opacity="0.3" strokeDasharray="4 4" />
                        <line x1="200" y1="160" x2="310" y2="160" stroke="#00FFFF" strokeWidth="1" opacity="0.3" strokeDasharray="4 4" />
                        <line x1="540" y1="100" x2="650" y2="100" stroke="#FF0000" strokeWidth="1" opacity="0.3" strokeDasharray="4 4" />
                        <line x1="540" y1="160" x2="650" y2="160" stroke="#00FFFF" strokeWidth="1" opacity="0.3" strokeDasharray="4 4" />

                        {/* Connection Nodes */}
                        <circle cx="320" cy="130" r="4" fill="#00FFFF" style={{ filter: 'drop-shadow(0 0 5px #00FFFF)' }} /> /* keep-inline */ /* keep-inline */
                        <circle cx="530" cy="130" r="4" fill="#00FFFF" style={{ filter: 'drop-shadow(0 0 5px #00FFFF)' }} /> /* keep-inline */ /* keep-inline */
                        <circle cx="120" cy="50" r="2.5" fill="#00FFFF" />
                        <circle cx="120" cy="210" r="2.5" fill="#00FFFF" />
                        <circle cx="200" cy="130" r="2" fill="#00FFFF" opacity="0.6" />
                        <circle cx="680" cy="80" r="2.5" fill="#00FFFF" />
                        <circle cx="650" cy="130" r="2.5" fill="#FF0000" style={{ filter: 'drop-shadow(0 0 5px #FF0000)' }} /> /* keep-inline */ /* keep-inline */
                        <circle cx="680" cy="180" r="2.5" fill="#00FFFF" />
                    </svg>

                    {/* 8 Sparkline Bar Chart Clusters */}
                    {/* Top Left */}
                    <div className="absolute top-[5%] left-[3%] flex flex-col items-start">
                        <span className="font-mono text-[7px] text-[#00FFFF]/60 mb-1">09:00</span>
                        <div className="flex items-end gap-[2px] h-8">
                            {[30, 70, 45, 90, 60, 40, 55, 75].map((h, i) => (
                                <div key={`tl-${i}`} className="w-1.5 bg-[#00FFFF] rounded-t opacity-80 shadow-[0_0_3px_#00FFFF]" style={{ height: `${h}%` }}></div>
                            ))}
                        </div>
                    </div>

                    {/* Mid Left */}
                    <div className="absolute top-[38%] left-[3%] flex flex-col items-start">
                        <span className="font-mono text-[7px] text-[#00FFFF]/60 mb-1">10:00</span>
                        <div className="flex items-end gap-[2px] h-8">
                            {[60, 40, 80, 50, 70, 30, 90, 45].map((h, i) => (
                                <div key={`ml-${i}`} className="w-1.5 bg-[#00FFFF] rounded-t opacity-80 shadow-[0_0_3px_#00FFFF]" style={{ height: `${h}%` }}></div>
                            ))}
                        </div>
                    </div>

                    {/* Bottom Left */}
                    <div className="absolute top-[72%] left-[3%] flex flex-col items-start">
                        <span className="font-mono text-[7px] text-[#00FFFF]/60 mb-1">11:00</span>
                        <div className="flex items-end gap-[2px] h-8">
                            {[80, 50, 60, 30, 90, 100, 55, 70].map((h, i) => (
                                <div key={`bl-${i}`} className="w-1.5 bg-[#00FFFF] rounded-t opacity-80 shadow-[0_0_3px_#00FFFF]" style={{ height: `${h}%` }}></div>
                            ))}
                        </div>
                    </div>

                    {/* Extra Left-Center */}
                    <div className="absolute top-[22%] left-[18%] flex flex-col items-start">
                        <span className="font-mono text-[7px] text-[#00FFFF]/60 mb-1">09:30</span>
                        <div className="flex items-end gap-[2px] h-6">
                            {[50, 80, 35, 65, 45, 70].map((h, i) => (
                                <div key={`elc-${i}`} className="w-1 bg-[#00FFFF] rounded-t opacity-60 shadow-[0_0_3px_#00FFFF]" style={{ height: `${h}%` }}></div>
                            ))}
                        </div>
                    </div>

                    {/* Top Right (Red - Bottleneck) */}
                    <div className="absolute top-[5%] right-[3%] flex flex-col items-end">
                        <span className="font-mono text-[7px] text-[#FF0000]/60 mb-1">04:20</span>
                        <div className="flex items-end gap-[2px] h-8">
                            {[20, 30, 40, 80, 100, 90, 85, 95].map((h, i) => (
                                <div key={`tr-${i}`} className="w-1.5 bg-[#FF0000] rounded-t opacity-80 shadow-[0_0_3px_#FF0000] animate-[pulse_1.5s_infinite]" style={{ height: `${h}%` }}></div>
                            ))}
                        </div>
                    </div>

                    {/* Mid Right (Red) */}
                    <div className="absolute top-[38%] right-[3%] flex flex-col items-end">
                        <span className="font-mono text-[7px] text-[#FF0000]/60 mb-1">LOAD</span>
                        <div className="flex items-end gap-[2px] h-8">
                            {[50, 60, 70, 90, 80, 100, 75, 85].map((h, i) => (
                                <div key={`mr-${i}`} className="w-1.5 bg-[#FF0000] rounded-t opacity-70 shadow-[0_0_3px_#FF0000]" style={{ height: `${h}%` }}></div>
                            ))}
                        </div>
                    </div>

                    {/* Bottom Right */}
                    <div className="absolute top-[72%] right-[3%] flex flex-col items-end">
                        <span className="font-mono text-[7px] text-[#00FFFF]/60 mb-1">00:08</span>
                        <div className="flex items-end gap-[2px] h-8">
                            {[40, 60, 30, 70, 50, 80, 65, 45].map((h, i) => (
                                <div key={`br-${i}`} className="w-1.5 bg-[#00FFFF] rounded-t opacity-80 shadow-[0_0_3px_#00FFFF]" style={{ height: `${h}%` }}></div>
                            ))}
                        </div>
                    </div>

                    {/* Extra Right-Center */}
                    <div className="absolute top-[58%] right-[18%] flex flex-col items-end">
                        <span className="font-mono text-[7px] text-[#FF0000]/60 mb-1">HEAT</span>
                        <div className="flex items-end gap-[2px] h-6">
                            {[70, 90, 55, 85, 60, 75].map((h, i) => (
                                <div key={`erc-${i}`} className="w-1 bg-[#FF0000] rounded-t opacity-60 shadow-[0_0_3px_#FF0000]" style={{ height: `${h}%` }}></div>
                            ))}
                        </div>
                    </div>

                    {/* The Core Ring */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-44 h-44 flex items-center justify-center z-10">
                        {/* Dark fill behind ring */}
                        <div className="absolute inset-0 bg-[#020610] rounded-full"></div>

                        {/* Outer Rotating Dashes */}
                        <div className="absolute inset-0 border-2 border-dashed border-[#00FF00]/30 rounded-full animate-[spin_10s_linear_infinite]" style={{ maskImage: "radial-gradient(transparent 65%, black 65%)", WebkitMaskImage: "radial-gradient(transparent 65%, black 65%)" }}></div> /* keep-inline */ /* keep-inline */

                        {/* Dynamic Health Ring */}
                        <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none" viewBox="0 0 160 160">
                            {/* Background ring track */}
                            <circle cx="80" cy="80" r="72" fill="none" stroke="#00FF00" strokeWidth="6" opacity="0.15" />
                            {/* Filled ring based on health */}
                            <circle cx="80" cy="80" r="72" fill="none" stroke="#00FF00" strokeWidth="6"
                                strokeDasharray={ringCircumference}
                                strokeDashoffset={healthOffset}
                                strokeLinecap="round"
                                style={{ filter: 'drop-shadow(0 0 8px #00FF00)', transition: 'stroke-dashoffset 1s ease-in-out' }} /* keep-inline */ /* keep-inline */
                            />
                        </svg>

                        {/* Core Text */}
                        <div className="flex flex-col items-center justify-center z-10 absolute inset-4 rounded-full bg-[#020610]">
                            <span className="font-mono text-[9px] text-[#00FF00]/80 tracking-widest uppercase mb-0.5">OVERALL</span>
                            <span className="font-mono text-[9px] text-[#00FF00] tracking-widest uppercase mb-1 drop-shadow-[0_0_2px_#00FF00]">SYSTEM HEALTH</span>
                            <span className="font-mono text-4xl text-[#FFFFFF] font-black drop-shadow-[0_0_10px_#FFFFFF]">{safeData.systemHealth}%</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom 5-Stage Pipeline */}
            <div className="mt-auto pt-4 flex justify-center gap-8 z-20 relative">
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#00FFFF]/30 to-transparent"></div>

                <div className="flex flex-col items-center pt-2">
                    <Receipt className="w-5 h-5 text-[#00FFFF] mb-1.5 drop-shadow-[0_0_5px_#00FFFF]" />
                    <span className="font-mono text-[10px] text-[#00FFFF] font-bold tracking-widest">ORDERED</span>
                    <span className="font-mono text-[8px] text-[#00FFFF]/60">TABLE {safeData.counts.ordered}</span>
                </div>

                <span className="text-[#00FFFF]/30 self-center text-lg">›</span>

                <div className="flex flex-col items-center pt-2">
                    <UtensilsCrossed className="w-5 h-5 text-[#00FFFF] mb-1.5 drop-shadow-[0_0_5px_#00FFFF]" />
                    <span className="font-mono text-[10px] text-[#00FFFF] font-bold tracking-widest">PREP</span>
                    <span className="font-mono text-[8px] text-[#00FFFF]/60">TABLE {safeData.counts.prep}</span>
                </div>

                <span className="text-[#FF0000]/50 self-center text-lg">›</span>

                <div className="flex flex-col items-center pt-2">
                    <ChefHat className="w-5 h-5 text-[#FF0000] mb-1.5 drop-shadow-[0_0_5px_#FF0000] animate-pulse" />
                    <span className="font-mono text-[10px] text-[#FF0000] font-bold tracking-widest">COOKING</span>
                    <span className="font-mono text-[8px] text-[#FF0000]/60">TABLE {safeData.counts.cooking}</span>
                </div>

                <span className="text-[#00FFFF]/30 self-center text-lg">›</span>

                <div className="flex flex-col items-center pt-2">
                    <Activity className="w-5 h-5 text-[#00FFFF] mb-1.5 drop-shadow-[0_0_5px_#00FFFF]" />
                    <span className="font-mono text-[10px] text-[#00FFFF] font-bold tracking-widest">PLATING</span>
                    <span className="font-mono text-[8px] text-[#00FFFF]/60">TABLE {safeData.counts.plating}</span>
                </div>

                <span className="text-[#00FF00]/30 self-center text-lg">›</span>

                <div className="flex flex-col items-center pt-2">
                    <CheckCircle2 className="w-5 h-5 text-[#00FF00] mb-1.5 drop-shadow-[0_0_5px_#00FF00]" />
                    <span className="font-mono text-[10px] text-[#00FF00] font-bold tracking-widest">READY</span>
                    <span className="font-mono text-[8px] text-[#00FF00]/60">TABLE {safeData.counts.ready}</span>
                </div>
            </div>
        </div>
    );
}
