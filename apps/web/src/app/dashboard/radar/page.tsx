'use client';

import React, { useState } from 'react';
import {
    Radar, Target, TrendingUp, TrendingDown,
    MapPin, Filter, ArrowUpRight,
    BarChart3, AlertCircle, RefreshCcw
} from 'lucide-react';
import { Card } from '@antigravity/ui';
import { Button } from '@antigravity/ui';
import { cn } from '@antigravity/ui';
import { toast } from 'sonner';

/**
 * 🔬 MARKET RADAR (Pillar 6)
 * Competitive Intelligence & Yield Management.
 */
export default function RadarPage() {
    const [region, setRegion] = useState('Valletta');
    const [scanning, setScanning] = useState(false);

    const competitors = [
        { name: 'La Valette', items_scanned: 24, trend: 'up', price: '€18.50', confidence: '94%' },
        { name: 'Noni', items_scanned: 18, trend: 'down', price: '€22.00', confidence: '91%' },
        { name: 'Rampila', items_scanned: 31, trend: 'up', price: '€16.80', confidence: '97%' },
    ];

    const handleScan = () => {
        setScanning(true);
        toast.info("Initializing Grounding Scan...");
        setTimeout(() => {
            setScanning(false);
            toast.success("Scan Complete", { description: "Found 3 competitors nearby" });
        }, 2000);
    };

    return (
        <div className=\"flex flex-col gap-8 animate-in fade-in zoom-in duration-700\">
    {/* Radar Main Header */ }
    <div className=\"flex flex-col lg:flex-row lg:items-center justify-between gap-6 px-1\">
        < div className =\"flex items-center gap-6\">
            < div className =\"w-20 h-20 rounded-[2rem] bg-zinc-900 border border-zinc-800 flex items-center justify-center relative overflow-hidden\">
                < div className =\"absolute inset-0 bg-red-600/10 blur-xl\"></div>
                    < Radar className =\"text-red-500 relative z-10\" size={32} />
                    </div >
                    <div>
                        <h1 className=\"text-4xl font-black text-white italic tracking-tighter uppercase leading-none\">Market <br /> Radar</h1>
                        <div className=\"flex items-center gap-2 mt-2\">
        < MapPin size = { 14} className =\"text-red-500\" />
            < span className =\"text-xs font-black text-zinc-500 uppercase tracking-widest\">{region}, Malta</span>
                        </div >
                    </div >
                </div >

        <div className=\"flex items-center gap-4 bg-zinc-900/30 p-2 rounded-2xl border border-zinc-800/50 backdrop-blur-md\">
            < div className =\"px-4 py-2 border-r border-zinc-800\">
                < p className =\"text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-1\">Grounding Confidence</p>
                    < p className =\"text-lg font-black text-emerald-500 italic leading-none\">96.8%</p>
                    </div >
        <div className=\"px-4 py-2\">
            < p className =\"text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-1\">Index Updated</p>
                < p className =\"text-lg font-black text-white italic leading-none\">Now</p>
                    </div >
        <Button
            variant=\"ghost\"
    size =\"icon\"
    onClick = { handleScan }
    disabled = { scanning }
    className =\"hover:bg-white/5 h-10 w-10\">
        < RefreshCcw size = { 18} className = {
            cn(\"text-zinc-500\", scanning && \"animate-spin text-red-500\")} />
                    </Button>
                </div >
            </div >

        <div className=\"grid grid-cols-1 lg:grid-cols-12 gap-8\">
    {/* Dynamic Pricing Engine (Left) */ }
    <div className=\"lg:col-span-8 flex flex-col gap-6\">
        < Card className =\"bg-zinc-950 border-zinc-800/50 p-8 relative overflow-hidden group\">
    {/* Radar Grid Background */ }
    <div className=\"absolute inset-0 opacity-5 pointer-events-none\">
        < div className =\"w-full h-full bg-[radial-gradient(circle,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:30px_30px]\"></div>
                        </div >

        <div className=\"relative z-10\">
            < div className =\"flex justify-between items-start mb-12\">
                < div >
                <h2 className=\"text-2xl font-black text-white italic tracking-tight\">Yield Management Suggestion</h2>
                    < p className =\"text-zinc-500 font-medium max-w-lg mt-2 leading-relaxed\">
                                        Weekend demand surge detected.Consider increasing premium items by 8 - 12 %.
                                    </p >
                                </div >
        <Button className=\"bg-emerald-600 text-white font-black px-8 h-12 rounded-xl shadow-[0_10px_30px_rgba(16,185,129,0.3)] border-none\">
                                    Approve Strategy
                                </Button >
                            </div >

        <div className=\"grid grid-cols-1 md:grid-cols-3 gap-8\">
    {
        [
            { label: 'Demand Surge', value: '+24%', color: 'text-red-500', icon: TrendingUp },
            { label: 'Market Volatility', value: 'High', color: 'text-orange-500', icon: AlertCircle },
            { label: 'Predicted Yield', value: '+€842', color: 'text-emerald-500', icon: BarChart3 },
        ].map((metric, i) => (
            <div key={i} className=\"flex flex-col gap-2\">
        < div className =\"flex items-center gap-2\">
        < metric.icon size = { 14} className =\"text-zinc-600\" />
        < span className =\"text-[10px] font-black text-zinc-600 uppercase tracking-widest\">{metric.label}</span>
                                        </div >
            <span className={cn(\"text-4xl font-black italic\", metric.color)}>{metric.value}</span>
                                    </div >
                                ))
    }
                            </div >
                        </div >
                    </Card >

        <div className=\"grid grid-cols-1 md:grid-cols-2 gap-6\">
            < Card className =\"bg-zinc-900/40 border-zinc-800 p-6 backdrop-blur-md\">
                < h3 className =\"text-xs font-black text-zinc-400 uppercase tracking-[0.2em] mb-6\">Price Index vs Region</h3>
                    < div className =\"h-40 flex items-end gap-2 px-2\">
    {
        [40, 60, 45, 90, 65, 30].map((h, i) => (
            <div key={i} className=\"flex-1 bg-zinc-800/50 rounded-t-lg relative group\">
        < div
                                            className = {
                cn(
                    \"absolute bottom-0 left-0 right-0 rounded-t-lg transition-all duration-1000\",
                    i === 3 ?\"bg-red-600 shadow-[0_0_20px_rgba(220,38,38,0.5)]\" : \"bg-zinc-700\"
        )
    }
    style = {{ height: `${h}%` }
}
                                        ></div >
                                    </div >
                                ))}
                            </div >
                        </Card >

    <Card className=\"bg-zinc-900/40 border-zinc-800 p-6 backdrop-blur-md overflow-hidden relative\">
        < h3 className =\"text-xs font-black text-zinc-400 uppercase tracking-[0.2em] mb-6\">Regional Context</h3>
            < div className =\"space-y-4 relative z-10\">
                < div className =\"p-4 bg-zinc-950/50 rounded-2xl border border-zinc-800/50\">
                    < p className =\"text-xs text-zinc-500 font-bold uppercase mb-1\">Local Event Detected</p>
                        < p className =\"text-sm font-bold text-white italic\">\"Valletta Wine Festival • 200m away\"</p>
                                </div >
                            </div >
                        </Card >
                    </div >
                </div >

    {/* Competitor List (Right) */ }
    < div className =\"lg:col-span-4\">
        < Card className =\"bg-zinc-900/10 border-zinc-800 h-full flex flex-col\">
            < div className =\"p-6 border-b border-zinc-800 bg-zinc-950/20 flex items-center justify-between\">
                < h3 className =\"text-lg font-black text-white italic flex items-center gap-3\">
                    < Target className =\"text-red-500\" size={20} />
                                MONITORED TARGETS
                            </h3 >
    <Button variant=\"ghost\" size=\"icon\" className=\"h-8 w-8 hover:bg-white/5\">
        < Filter size = { 14} className =\"text-zinc-500\" />
                            </Button >
                        </div >

    <div className=\"p-4 flex-1 overflow-auto\">
        < div className =\"space-y-2\">
{
    competitors.map((comp, i) => (
        <div key={i} className=\"p-5 bg-zinc-900/40 rounded-2xl border border-zinc-800/50 hover:border-red-500/30 transition-all group cursor-pointer\">
    < div className =\"flex justify-between items-start mb-4\">
    < div >
    <h4 className=\"text-sm font-black text-white tracking-tight group-hover:text-red-500 transition-colors uppercase italic\">{comp.name}</h4>
    < p className =\"text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1\">{comp.items_scanned} Items Scanned</p>
                                            </div >
        <div className={cn(
            \"p-2 rounded-xl transition-all\",
                                                comp.trend === 'up' ?\"bg-red-500/10 text-red-500\" :
                                                    comp.trend === 'down' ?\"bg-emerald-500/10 text-emerald-500\" :
            \"bg-zinc-800 text-zinc-400\"
        )}>
            {comp.trend === 'up' ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
        </div>
                                        </div >
        <div className=\"flex justify-between items-end border-t border-white/5 pt-4 mt-4\">
        < div >
    <span className=\"text-[10px] font-black text-zinc-600 uppercase tracking-widest block mb-1\">Avg Price</span>
    < span className =\"text-lg font-black text-white italic\">{comp.price}</span>
                                            </div >
        <div className=\"text-right\">
    < span className =\"text-[10px] font-black text-zinc-600 uppercase tracking-widest block mb-1\">Confidence</span>
    < span className =\"text-xs font-bold text-white italic\">{comp.confidence}</span>
                                            </div >
                                        </div >
                                    </div >
                                ))
}
                            </div >
                        </div >
                    </Card >
                </div >
            </div >
        </div >
    );
}
