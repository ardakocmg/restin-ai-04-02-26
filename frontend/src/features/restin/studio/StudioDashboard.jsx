import React, { useState } from 'react';
import {
    Wand2, Image as ImageIcon, Video, Palette, Sparkles,
    RefreshCw, Download, Share2, Layers, Search,
    Zap, Camera, Heart
} from 'lucide-react';
import { Card } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { cn } from '../../../lib/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { studioService } from './studio-service';
import { useVenue } from '../../../context/VenueContext';
import { useAuth } from '../../../context/AuthContext';
import { toast } from 'sonner';
import { Loader2, Settings } from 'lucide-react';

/**
 * 🎨 GENERATIVE STUDIO (Pillar 5)
 * Reality-First content pipeline for marketing and menus.
 */
export default function StudioDashboard() {
    const { activeVenueId } = useVenue();
    const { user, isManager, isOwner } = useAuth();
    const queryClient = useQueryClient();
    const [activeFilter, setActiveFilter] = useState('all');

    // Fetch Assets
    const { data: assets = [], isLoading } = useQuery({
        queryKey: ['studio-assets', activeVenueId],
        queryFn: () => studioService.listAssets(activeVenueId || 'default'),
        enabled: !!activeVenueId
    });

    // Generate Mutation
    const generateMutation = useMutation({
        mutationFn: async () => {
            toast.info("Connecting to Imagen 3...");
            return await studioService.generateAsset(activeVenueId || 'default', "Hyper-realistic wagyu burger with truffle fries, cinematic lighting", "IMAGE");
        },
        onSuccess: () => {
            toast.success("Asset Generated!", { description: "Cost: €0.04 (Billed to Account)" });
            queryClient.invalidateQueries(['studio-assets']);
        },
        onError: () => toast.error("Generation Failed")
    });

    // Seed demo data
    const seedMutation = useMutation({
        mutationFn: async () => {
            const api = await import('../../../lib/api').then(m => m.default);
            return api.post(`/media/seed?venue_id=${activeVenueId}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['studio-assets']);
            toast.success('Studio demo data seeded!');
        },
    });

    return (
        <div className="flex flex-col gap-8 animate-in slide-in-from-right duration-700">
            {/* Search and Global Action */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="relative flex-1 max-w-2xl">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={20} />
                    <input
                        type="text"
                        placeholder="Search generated assets, prompts, or recipes..."
                        className="w-full bg-zinc-900/50 border border-zinc-800 rounded-2xl py-4 pl-12 pr-6 text-white text-lg font-medium focus:outline-none focus:ring-2 focus:ring-red-500/50 backdrop-blur-md transition-all"
                    />
                </div>
                <div className="flex items-center gap-4">
                    <Button
                        variant="outline"
                        onClick={() => seedMutation.mutate()}
                        disabled={seedMutation.isPending}
                        className="border-zinc-800 text-zinc-400 hover:bg-zinc-900 gap-2"
                    >
                        {seedMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Settings size={16} />}
                        Seed Demo
                    </Button>
                    <div className="p-4 bg-zinc-900/50 rounded-2xl border border-zinc-800/80 flex items-center gap-3">
                        <div className="flex flex-col text-right">
                            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Assets</span>
                            <span className="text-xs font-black text-white">{assets.length} items</span>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-red-600/10 border border-red-500/20 flex items-center justify-center">
                            <Zap size={20} className="text-red-500" />
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Creation Tools (Left) */}
                <div className="lg:col-span-1 space-y-4">
                    <Card className="bg-gradient-to-b from-zinc-900 to-black border-zinc-800 p-6 overflow-hidden relative group">
                        <div className="absolute -bottom-4 -right-4 text-white/5 group-hover:text-red-600/10 transition-colors">
                            <Sparkles size={80} />
                        </div>
                        <h3 className="text-xs font-black text-zinc-500 uppercase tracking-[0.2em] mb-4">Magic Tools</h3>
                        <div className="space-y-2 relative z-10">
                            <Button
                                onClick={() => generateMutation.mutate()}
                                disabled={generateMutation.isPending}
                                className="w-full justify-start h-14 bg-zinc-950/50 border border-zinc-800 hover:border-red-500/30 text-zinc-300 font-bold px-4 rounded-xl gap-3">
                                <Camera size={20} className="text-red-500" /> {generateMutation.isPending ? 'Dreaming...' : 'Generate Photo'}
                            </Button>
                            <Button className="w-full justify-start h-14 bg-zinc-950/50 border border-zinc-800 hover:border-red-500/30 text-zinc-300 font-bold px-4 rounded-xl gap-3">
                                <Palette size={20} className="text-purple-500" /> Tone Editor
                            </Button>
                            <Button className="w-full justify-start h-14 bg-zinc-950/50 border border-zinc-800 hover:border-red-500/30 text-zinc-300 font-bold px-4 rounded-xl gap-3">
                                <Layers size={20} className="text-blue-500" /> Menu Designer
                            </Button>
                        </div>
                    </Card>

                    <Card className="bg-zinc-900/20 border-zinc-800 p-6">
                        <h3 className="text-xs font-black text-zinc-500 uppercase tracking-[0.2em] mb-4">Pipeline Stats</h3>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-zinc-600 font-bold uppercase">Render Time</span>
                                <span className="text-white font-black italic">Avg 12s</span>
                            </div>
                            <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
                                <div className="w-3/4 h-full bg-red-600 shadow-[0_0_10px_#dc2626]"></div>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-zinc-600 font-bold uppercase">Token Cost</span>
                                <span className="text-emerald-500 font-black italic">€0.04 / Gen</span>
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Asset Library (Main) */}
                <div className="lg:col-span-3">
                    <div className="flex items-center gap-4 mb-6">
                        {['all', 'photos', 'videos', 'menus'].map(filter => (
                            <button
                                key={filter}
                                onClick={() => setActiveFilter(filter)}
                                className={cn(
                                    "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all border",
                                    activeFilter === filter
                                        ? "bg-red-600 text-white border-red-500 shadow-lg"
                                        : "bg-transparent text-zinc-600 border-zinc-800 hover:text-zinc-300"
                                )}
                            >
                                {filter}
                            </button>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {isLoading ? (
                            <div className="col-span-3 flex items-center justify-center py-20">
                                <Loader2 size={32} className="text-zinc-600 animate-spin" />
                            </div>
                        ) : assets.map((asset, i) => (
                            <Card key={asset.id || i} className="bg-zinc-900/40 border-zinc-800 overflow-hidden group hover:scale-[1.02] transition-all duration-300 shadow-2xl">
                                <div className="h-48 relative overflow-hidden">
                                    <img
                                        src={asset.url}
                                        alt={asset.prompt || 'Asset'}
                                        className="w-full h-full object-cover group-hover:scale-110 transition-duration-700"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent opacity-80"></div>
                                    <div className="absolute top-4 right-4 flex gap-2">
                                        <button className="p-2 bg-black/50 backdrop-blur-md rounded-lg text-white hover:text-red-500 transition-colors">
                                            <Heart size={16} />
                                        </button>
                                        <button className="p-2 bg-black/50 backdrop-blur-md rounded-lg text-white hover:text-blue-500 transition-colors">
                                            <Share2 size={16} />
                                        </button>
                                    </div>
                                    <div className="absolute bottom-4 left-4">
                                        <div className="p-2 bg-red-600/20 backdrop-blur-md rounded-lg border border-red-500/20">
                                            {asset.type === 'IMAGE' ? <ImageIcon size={16} className="text-red-500" /> : <Video size={16} className="text-blue-500" />}
                                        </div>
                                    </div>
                                </div>
                                <div className="p-5">
                                    <div className="flex justify-between items-center mb-2">
                                        <h4 className="text-sm font-black text-white italic truncate">{asset.prompt || 'Untitled'}</h4>
                                        <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-[0.1em] ${asset.source === 'upload' ? 'text-blue-500 bg-blue-500/10' : asset.source === 'inventory' ? 'text-emerald-500 bg-emerald-500/10' : 'text-purple-500 bg-purple-500/10'}`}>{asset.source || 'AI'}</span>
                                    </div>
                                    <div className="flex items-center justify-between mt-4">
                                        <span className="text-[10px] font-black text-zinc-600">{new Date(asset.created_at || Date.now()).toLocaleDateString()}</span>
                                        <div className="flex gap-2">
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500 hover:text-white hover:bg-white/5">
                                                <RefreshCw size={14} />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500 hover:text-white hover:bg-white/5">
                                                <Download size={14} />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        ))}

                        {/* Empty State / Add New */}
                        <button className="h-full border-2 border-dashed border-zinc-900 rounded-[inherit] flex flex-col items-center justify-center p-8 text-zinc-800 hover:text-zinc-600 hover:border-zinc-800 transition-all group">
                            <div className="w-16 h-16 rounded-full bg-zinc-900/50 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                <Wand2 size={32} />
                            </div>
                            <span className="text-sm font-black uppercase tracking-[0.2em] italic">New Synthesis</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
