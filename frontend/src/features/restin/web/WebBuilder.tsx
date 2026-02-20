import { useState } from 'react';
import {
    Layout, Type, Image as ImageIcon,
    Hash, Smartphone, Monitor, Tablet,
    Plus, Eye, Globe, MousePointer2, Rocket
} from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Card } from '../../../components/ui/card';
import { cn } from '../../../lib/utils';
import type { LucideIcon } from 'lucide-react';

/**
 * 🕸️ WEB ARCHITECT (Pillar 2)
 * Drag & Drop Website Builder synced with POS Inventory.
 */
import { webBuilderService } from './web-service';
import { useVenue } from '../../../context/VenueContext';
import { useAuth } from '../../../context/AuthContext';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

interface MenuItem {
    name: string;
    price: number;
    description?: string;
}


interface SectionItem {
    id: string;
    title: string;
    icon: LucideIcon;
}

export default function WebBuilder() {
    const { activeVenueId } = useVenue();
    const { user, isManager, isOwner } = useAuth();
    const venueId = activeVenueId;

    const [device, setDevice] = useState<string>('desktop');
    const [activeTab, setActiveTab] = useState<string>('sections');

    // Fetch Live Menu Data
    const { data: menuData, isLoading } = useQuery({
        queryKey: ['web-builder-menu', venueId],
        queryFn: () => webBuilderService.getActiveMenuItems(venueId || 'default'),
        enabled: !!venueId
    });

    // Publish Mutation
    const publishMutation = useMutation({
        mutationFn: webBuilderService.publishSite,
        onSuccess: () => toast.success('Website published successfully!'),
        onError: () => toast.error('Failed to publish website.')
    });

    const handlePublish = (): void => {
        const currentTheme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
        publishMutation.mutate({
            theme: { mode: currentTheme },
            sections: [{ id: 'hero', type: 'hero', content: {} }, { id: 'menu', type: 'menu', content: {} }]
        });
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const menuItems: MenuItem[] = (menuData as any)?.items ?? [];

    const sections: SectionItem[] = [
        { id: 'hero', title: 'Hero Header', icon: Layout },
        { id: 'menu', title: 'Live Menu', icon: Hash },
        { id: 'gallery', title: 'Food Gallery', icon: ImageIcon },
        { id: 'about', title: 'Story Section', icon: Type },
    ];

    return (
        <div className="flex h-[calc(100vh-140px)] gap-6 animate-in slide-in-from-bottom-4 duration-700">
            {/* Left Sidebar: Components */}
            <aside className="w-80 flex flex-col gap-4">
                <Card className="bg-card/40 border-border/50 p-6 flex-1 flex flex-col backdrop-blur-xl">
                    <div className="flex items-center justify-between mb-8">
                        <h2 className="text-xl font-black text-foreground italic tracking-tighter">WEB ARCHITECT</h2>
                        <div className="bg-emerald-500/20 text-emerald-500 text-[10px] font-black px-2 py-1 rounded-md uppercase tracking-widest border border-emerald-500/20">Synced</div>
                    </div>

                    <div className="flex p-1 bg-background/50 rounded-xl mb-6">
                        {['sections', 'theme'].map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={cn(
                                    "flex-1 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all",
                                    activeTab === tab ? "bg-secondary text-foreground shadow-xl" : "text-muted-foreground hover:text-secondary-foreground"
                                )}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>

                    <div className="space-y-3 flex-1 overflow-auto">
                        {sections.map(section => (
                            <div
                                key={section.id}
                                className="group flex items-center justify-between p-4 bg-card/50 border border-border/50 rounded-xl hover:border-red-500/30 transition-all cursor-grab active:cursor-grabbing"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-secondary rounded-lg text-muted-foreground group-hover:text-red-500 transition-colors">
                                        <section.icon size={18} />
                                    </div>
                                    <span className="text-sm font-bold text-secondary-foreground">{section.title}</span>
                                </div>
                                <Plus size={16} className="text-muted-foreground group-hover:text-foreground" />
                            </div>
                        ))}
                    </div>

                    <div className="mt-auto pt-6 border-t border-border/50 space-y-3">
                        <Button variant="outline" className="w-full border-border text-muted-foreground font-bold hover:bg-white/5 gap-2">
                            <Eye size={16} /> Preview Mode
                        </Button>
                        <Button
                            onClick={handlePublish}
                            disabled={publishMutation.isPending}
                            className="w-full bg-red-600 text-foreground font-black hover:bg-red-700 shadow-lg gap-2"
                        >
                            <Rocket size={16} />
                            {publishMutation.isPending ? 'Publishing...' : 'Publish Changes'}
                        </Button>
                    </div>
                </Card>
            </aside>

            {/* Main Preview Area */}
            <main className="flex-1 flex flex-col gap-4">
                <header className="flex justify-between items-center px-4">
                    <div className="flex p-1 bg-background/50 rounded-xl">
                        {[
                            { id: 'desktop', icon: Monitor },
                            { id: 'tablet', icon: Tablet },
                            { id: 'mobile', icon: Smartphone }
                        ].map(d => (
                            <button
                                key={d.id}
                                onClick={() => setDevice(d.id)}
                                className={cn(
                                    "p-2 rounded-lg transition-all",
                                    device === d.id ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-muted-foreground"
                                )}
                            >
                                <d.icon size={18} />
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-2 text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                        <Globe size={14} />
                        domain: restin.ai/menu
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                    </div>
                </header>

                <div className="flex-1 bg-background/20 rounded-[2.5rem] border-[12px] border-zinc-900 shadow-2xl overflow-hidden relative group">
                    {/* Simulated Website UI */}
                    <div className={cn(
                        "h-full overflow-auto bg-background transition-all duration-500",
                        device === 'mobile' ? "max-w-[375px] mx-auto" :
                            device === 'tablet' ? "max-w-[768px] mx-auto" : "w-full"
                    )}>
                        {/* Hero */}
                        <section className="h-64 bg-gradient-to-br from-red-600 to-red-900 flex items-center justify-center p-12 text-center relative overflow-hidden">
                            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?q=80&w=2070&auto=format&fit=crop')] mix-blend-overlay opacity-30 grayscale saturate-0"></div>
                            <div className="relative z-10">
                                <h2 className="text-4xl font-black text-foreground italic tracking-tighter uppercase leading-none">The Artisan&apos;s <br /> Kitchen</h2>
                                <Button className="mt-6 bg-card text-foreground font-black hover:bg-zinc-200 dark:hover:bg-secondary/80">Order Now</Button>
                            </div>
                        </section>

                        {/* Live Menu Section */}
                        <section className="p-12 space-y-8">
                            <div className="flex items-baseline justify-between border-b border-border pb-4">
                                <h3 className="text-2xl font-black text-foreground italic">Signature Dishes</h3>
                                <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">Live from POS</span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {isLoading ? (
                                    <div className="text-foreground text-center col-span-2">Loading menu data...</div>
                                ) : menuItems.slice(0, 4).map((item: MenuItem, i: number) => (
                                    <div key={i} className="p-4 bg-white/5 rounded-2xl border border-border hover:border-border transition-all cursor-pointer">
                                        <div className="flex justify-between items-start mb-2">
                                            <h4 className="font-bold text-foreground">{item.name}</h4>
                                            <span className="text-red-500 font-black text-xs">€{item.price}</span>
                                        </div>
                                        <p className="text-xs text-muted-foreground font-medium line-clamp-2">{item.description || 'No description available.'}</p>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </div>

                    {/* Editing Overlays (Simulated) */}
                    <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <div className="bg-red-600/20 backdrop-blur-sm border border-red-500 px-4 py-2 rounded-full flex items-center gap-2">
                            <MousePointer2 size={16} className="text-red-500" />
                            <span className="text-[10px] font-black text-foreground uppercase tracking-widest">Edit Mode Enabled</span>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
