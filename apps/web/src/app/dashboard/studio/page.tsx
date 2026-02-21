'use client';

import React from 'react';
import {
    Wand2, Image as ImageIcon, Palette, Sparkles,
    RefreshCw, Download, Share2, Layers, Search,
    Zap, Camera, Heart
} from 'lucide-react';
import { Card } from '@antigravity/ui';
import { Button } from '@antigravity/ui';
import { cn } from '@antigravity/ui';
import { toast } from 'sonner';

/**
 * 🎨 GENERATIVE STUDIO (Pillar 5)
 * Reality-First content pipeline for marketing and menus.
 */
export default function StudioPage() {
    const [activeFilter, setActiveFilter] = React.useState('all');
    const assets = []; // NOTE: Load from API

    const handleGenerate = () => {
        toast.info("Connecting to Imagen 3...");
        // NOTE: Implement actual generation
        setTimeout(() => {
            toast.success("Asset Generated!", { description: "Cost: €0.04 (Billed to Account)" });
        }, 2000);
    };

    return (
        <div className=\"flex flex-col gap-8 animate-in slide-in-from-right duration-700\">
    {/* Search and Global Action */ }
    <div className=\"flex flex-col lg:flex-row lg:items-center justify-between gap-6\">
        < div className =\"relative flex-1 max-w-2xl\">
            < Search className =\"absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600\" size={20} />
                < input
    type =\"text\"
    placeholder =\"Search generated assets, prompts, or recipes...\"
    className =\"w-full bg-zinc-900/50 border border-zinc-800 rounded-2xl py-4 pl-12 pr-6 text-white text-lg font-medium focus:outline-none focus:ring-2 focus:ring-red-500/50 backdrop-blur-md transition-all\"
        />
                </div >
        <div className=\"flex items-center gap-4\">
            < div className =\"p-4 bg-zinc-900/50 rounded-2xl border border-zinc-800/80 flex items-center gap-3\">
                < div className =\"flex flex-col text-right\">
                    < span className =\"text-[10px] font-black text-zinc-500 uppercase tracking-widest\">Storage</span>
                        < span className =\"text-xs font-black text-white\">4.2 GB / 10 GB</span>
                        </div >
        <div className=\"w-10 h-10 rounded-full bg-red-600/10 border border-red-500/20 flex items-center justify-center\">
            < Zap size = { 20} className =\"text-red-500\" />
                        </div >
                    </div >
                </div >
            </div >

        <div className=\"grid grid-cols-1 lg:grid-cols-4 gap-6\">
    {/* Creation Tools (Left) */ }
    <div className=\"lg:col-span-1 space-y-4\">
        < Card className =\"bg-gradient-to-b from-zinc-900 to-black border-zinc-800 p-6 overflow-hidden relative group\">
            < div className =\"absolute -bottom-4 -right-4 text-white/5 group-hover:text-red-600/10 transition-colors\">
                < Sparkles size = { 80} />
                        </div >
        <h3 className=\"text-xs font-black text-zinc-500 uppercase tracking-[0.2em] mb-4\">Magic Tools</h3>
            < div className =\"space-y-2 relative z-10\">
                < Button
    onClick = { handleGenerate }
    className =\"w-full justify-start h-14 bg-zinc-950/50 border border-zinc-800 hover:border-red-500/30 text-zinc-300 font-bold px-4 rounded-xl gap-3\">
        < Camera size = { 20} className =\"text-red-500\" /> Generate Photo
                            </Button >
        <Button className=\"w-full justify-start h-14 bg-zinc-950/50 border border-zinc-800 hover:border-red-500/30 text-zinc-300 font-bold px-4 rounded-xl gap-3\">
            < Palette size = { 20} className =\"text-purple-500\" /> Tone Editor
                            </Button >
        <Button className=\"w-full justify-start h-14 bg-zinc-950/50 border border-zinc-800 hover:border-red-500/30 text-zinc-300 font-bold px-4 rounded-xl gap-3\">
            < Layers size = { 20} className =\"text-blue-500\" /> Menu Designer
                            </Button >
                        </div >
                    </Card >

        <Card className=\"bg-zinc-900/20 border-zinc-800 p-6\">
            < h3 className =\"text-xs font-black text-zinc-500 uppercase tracking-[0.2em] mb-4\">Pipeline Stats</h3>
                < div className =\"space-y-4\">
                    < div className =\"flex justify-between items-center text-xs\">
                        < span className =\"text-zinc-600 font-bold uppercase\">Render Time</span>
                            < span className =\"text-white font-black italic\">Avg 12s</span>
                            </div >
        <div className=\"w-full h-1 bg-zinc-800 rounded-full overflow-hidden\">
            < div className =\"w-3/4 h-full bg-red-600 shadow-[0_0_10px_#dc2626]\"></div>
                            </div >
        <div className=\"flex justify-between items-center text-xs\">
            < span className =\"text-zinc-600 font-bold uppercase\">Token Cost</span>
                < span className =\"text-emerald-500 font-black italic\">€0.04 / Gen</span>
                            </div >
                        </div >
                    </Card >
                </div >

        {/* Asset Library (Main) */ }
        < div className =\"lg:col-span-3\">
            < div className =\"flex items-center gap-4 mb-6\">
    {
        ['all', 'photos', 'videos', 'menus'].map(filter => (
            <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={cn(
                    \"px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all border\",
                                    activeFilter === filter
                        ?\"bg-red-600 text-white border-red-500 shadow-lg\"
                                        : \"bg-transparent text-zinc-600 border-zinc-800 hover:text-zinc-300\"
                )}
            >
                {filter}
            </button>
        ))
    }
                    </div >

        <div className=\"grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6\">
    {/* Empty State / Add New */ }
    <button className=\"h-64 border-2 border-dashed border-zinc-900 rounded-2xl flex flex-col items-center justify-center p-8 text-zinc-800 hover:text-zinc-600 hover:border-zinc-800 transition-all group\">
        < div className =\"w-16 h-16 rounded-full bg-zinc-900/50 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform\">
            < Wand2 size = { 32} />
                            </div >
        <span className=\"text-sm font-black uppercase tracking-[0.2em] italic\">New Synthesis</span>
                        </button >
                    </div >
                </div >
            </div >
        </div >
    );
}
