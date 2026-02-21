import React from 'react';
import { Network } from 'lucide-react';

export default function SentimentNodeGraph({ data }) {
    const safeData = data || { positive: 0, neutral: 0, negative: 0 };
    return (
        <div className="bg-[#020610] border border-[#00FFFF]/30 rounded p-4 relative overflow-hidden flex flex-col h-full shadow-[inset_0_0_20px_rgba(0,255,255,0.05)]">
            <div className="flex justify-between items-center mb-4 z-10">
                <h3 className="text-[#00FFFF] font-mono text-sm tracking-widest font-bold uppercase drop-shadow-[0_0_5px_rgba(0,255,255,0.8)] flex items-center gap-2">
                    <Network className="w-4 h-4" />
                    Customer Sentiment Analysis
                </h3>
            </div>

            <div className="flex w-full h-full text-white relative z-10">
                {/* Sentiment Distribution List */}
                <div className="w-1/4 h-full flex flex-col justify-center space-y-4 pr-4 border-r border-[#00FFFF]/30 z-20">
                    <div className="flex flex-col">
                        <span className="font-mono text-xs text-[#00FFFF] tracking-widest bg-[#00FFFF]/10 px-2 py-1 rounded inline-block w-fit mb-1 border-l-2 border-[#00FFFF]">POSITIVE: {safeData.positive}%</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="font-mono text-xs text-[#FF9900] tracking-widest bg-[#FF9900]/10 px-2 py-1 rounded inline-block w-fit mb-1 border-l-2 border-[#FF9900]">NEUTRAL: {safeData.neutral}%</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="font-mono text-xs text-[#FF0000] tracking-widest bg-[#FF0000]/10 px-2 py-1 rounded inline-block w-fit border-l-2 border-[#FF0000]">NEGATIVE: {safeData.negative}%</span>
                    </div>
                </div>

                {/* Node Graph Area */}
                <div className="flex-1 relative overflow-hidden">
                    {/* Background Grid */}
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,#00FFFF_1px,transparent_1px),linear-gradient(to_bottom,#00FFFF_1px,transparent_1px)] bg-[size:2rem_2rem] opacity-[0.05]"></div>

                    {/* SVG Connector Lines */}
                    <svg className="absolute inset-0 w-full h-full" style={{ zIndex: 1 }}> /* keep-inline */
                        <line x1="20%" y1="50%" x2="40%" y2="20%" stroke="#00FFFF" strokeWidth="1" opacity="0.5" />
                        <line x1="20%" y1="50%" x2="50%" y2="70%" stroke="#00FFFF" strokeWidth="1" opacity="0.3" />
                        <line x1="50%" y1="70%" x2="70%" y2="40%" stroke="#FF9900" strokeWidth="1" opacity="0.5" />
                        <line x1="40%" y1="20%" x2="70%" y2="40%" stroke="#00FFFF" strokeWidth="1" opacity="0.5" />
                        <line x1="70%" y1="40%" x2="85%" y2="60%" stroke="#FF0000" strokeWidth="1" opacity="0.8" className="animate-pulse" />
                        <line x1="70%" y1="40%" x2="90%" y2="30%" stroke="#00FFFF" strokeWidth="1" opacity="0.3" />
                        <line x1="50%" y1="70%" x2="85%" y2="60%" stroke="#FF0000" strokeWidth="1" opacity="0.4" />
                    </svg>

                    {/* Nodes */}
                    <div className="absolute top-[50%] left-[20%] w-3 h-3 bg-[#00FFFF] rounded-full shadow-[0_0_10px_#00FFFF] -translate-x-1/2 -translate-y-1/2 z-10 cursor-pointer hover:scale-150 transition-transform">
                        <span className="absolute -top-6 left-1/2 -translate-x-1/2 font-mono text-[8px] text-[#00FFFF] whitespace-nowrap opacity-0 hover:opacity-100">Review Match</span>
                    </div>

                    <div className="absolute top-[20%] left-[40%] w-4 h-4 bg-[#00FFFF] rounded-full shadow-[0_0_15px_#00FFFF] -translate-x-1/2 -translate-y-1/2 z-10 cursor-pointer hover:scale-150 transition-transform">
                        <span className="absolute -top-6 left-1/2 -translate-x-1/2 font-mono text-[10px] text-[#00FFFF] whitespace-nowrap bg-[#000000] px-1 border border-[#00FFFF]/30">Food Quality</span>
                        <div className="absolute inset-0 rounded-full border border-[#00FFFF] animate-ping opacity-50"></div>
                    </div>

                    <div className="absolute top-[70%] left-[50%] w-2 h-2 bg-[#00FFFF] rounded-full shadow-[0_0_5px_#00FFFF] -translate-x-1/2 -translate-y-1/2 z-10"></div>

                    <div className="absolute top-[40%] left-[70%] w-3 h-3 bg-[#FF9900] rounded-full shadow-[0_0_10px_#FF9900] -translate-x-1/2 -translate-y-1/2 z-10 cursor-pointer hover:scale-150 transition-transform">
                        <span className="absolute -top-6 left-1/2 -translate-x-1/2 font-mono text-[8px] text-[#FF9900] whitespace-nowrap opacity-0 hover:opacity-100">Wait Time</span>
                    </div>

                    <div className="absolute top-[60%] left-[85%] w-5 h-5 bg-[#FF0000] rounded-full shadow-[0_0_20px_#FF0000] -translate-x-1/2 -translate-y-1/2 z-10 cursor-pointer hover:scale-125 transition-transform flex items-center justify-center">
                        <div className="w-2 h-2 bg-white rounded-full"></div>
                        <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 font-mono text-[10px] text-[#FF0000] whitespace-nowrap bg-[#1C0000] px-1 border border-[#FF0000]/50 shadow-[0_0_5px_#FF0000]">Cold Food</span>
                    </div>

                    <div className="absolute top-[30%] left-[90%] w-2 h-2 bg-[#00FFFF] rounded-full shadow-[0_0_5px_#00FFFF] -translate-x-1/2 -translate-y-1/2 z-10"></div>
                </div>
            </div>
        </div>
    );
}
