import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Monitor, Tablet, Zap, Coffee, Check, Play, Copy, Plus,
    Palette, ChevronRight, ArrowLeft, Star, Pencil, Trash2,
    Loader2
} from 'lucide-react';
import { BUILTIN_THEMES, getActiveTheme, setActiveTheme } from '@/features/pos/themes/builtinThemes';
import { POSThemeConfig } from '@/features/pos/themes/posThemeTypes';
import { logger } from '@/lib/logger';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import api from '@/lib/api';

/** Icon map for engine types */
const ENGINE_ICONS: Record<string, React.ElementType> = {
    'l-series': Monitor,
    'restin': Star,
    'pro': Tablet,
    'express': Zap,
    'custom': Palette,
};

/** Business type labels */
const BIZ_TYPE_LABELS: Record<string, string> = {
    'full-service': 'Full Service',
    'counter': 'Counter',
    'cafe': 'Café',
    'bar': 'Bar & Lounge',
    'food-truck': 'Food Truck',
    'fine-dining': 'Fine Dining',
    'casual-dining': 'Casual Dining',
    'hotel': 'Hotel F&B',
};

/** Mini preview layouts for visual differentiation */
function ThemePreview({ engine }: { engine: string }) {
    const previewStyles: Record<string, React.CSSProperties> = {
        'l-series': {},
        'restin': {},
        'pro': {},
        'express': {},
        'custom': {},
    };

    if (engine === 'l-series') {
        return (
            <div className="w-full h-full bg-black rounded-md overflow-hidden flex flex-col">
                {/* Top bar */}
                <div className="h-3 bg-[#1a1a1a] flex items-center px-1 gap-0.5">
                    <div className="w-3 h-1.5 rounded-sm bg-[#2A9D8F]" />
                    <div className="flex-1" />
                    <div className="w-2 h-1.5 rounded-sm bg-[#333]" />
                    <div className="w-2 h-1.5 rounded-sm bg-[#333]" />
                </div>
                {/* Main */}
                <div className="flex-1 flex">
                    {/* Left sidebar */}
                    <div className="w-3 bg-[#111] flex flex-col gap-0.5 p-0.5">
                        <div className="w-full h-2 bg-[#222] rounded-sm" />
                        <div className="w-full h-2 bg-[#222] rounded-sm" />
                        <div className="w-full h-2 bg-[#222] rounded-sm" />
                    </div>
                    {/* Order panel */}
                    <div className="w-8 bg-[#0d0d0d] p-0.5">
                        <div className="w-full h-1.5 bg-[#1a1a1a] rounded-sm mb-0.5" />
                        <div className="w-full h-1.5 bg-[#1a1a1a] rounded-sm mb-0.5" />
                        <div className="w-full h-1.5 bg-[#1a1a1a] rounded-sm" />
                    </div>
                    {/* Item grid */}
                    <div className="flex-1 p-1 grid grid-cols-3 gap-0.5">
                        <div className="bg-[#E07A5F] rounded-sm" />
                        <div className="bg-[#5B8DEF] rounded-sm" />
                        <div className="bg-[#C77DBA] rounded-sm" />
                        <div className="bg-[#81B29A] rounded-sm" />
                        <div className="bg-[#E8947A] rounded-sm" />
                        <div className="bg-[#D4534B] rounded-sm" />
                    </div>
                </div>
                {/* Bottom bar */}
                <div className="h-4 bg-[#111] flex items-center gap-0.5 px-1">
                    <div className="w-2 h-2 rounded-full bg-[#2A9D8F]" />
                    <div className="flex-1 flex gap-0.5 justify-end">
                        <div className="w-4 h-2 rounded-sm bg-[#E07A5F]" />
                        <div className="w-4 h-2 rounded-sm bg-[#5B8DEF]" />
                        <div className="w-4 h-2 rounded-sm bg-[#C77DBA]" />
                    </div>
                </div>
            </div>
        );
    }

    if (engine === 'restin') {
        return (
            <div className="w-full h-full bg-[#0f172a] rounded-md overflow-hidden flex">
                {/* Category sidebar */}
                <div className="w-6 bg-[#1e293b] flex flex-col gap-0.5 p-0.5">
                    <div className="w-full h-3 bg-[#3b82f6] rounded-sm" />
                    <div className="w-full h-3 bg-[#334155] rounded-sm" />
                    <div className="w-full h-3 bg-[#334155] rounded-sm" />
                    <div className="w-full h-3 bg-[#334155] rounded-sm" />
                </div>
                {/* Item grid center */}
                <div className="flex-1 p-1 grid grid-cols-3 gap-0.5">
                    <div className="bg-[#334155] rounded-sm" />
                    <div className="bg-[#334155] rounded-sm" />
                    <div className="bg-[#334155] rounded-sm" />
                    <div className="bg-[#334155] rounded-sm" />
                    <div className="bg-[#334155] rounded-sm" />
                    <div className="bg-[#334155] rounded-sm" />
                </div>
                {/* Order panel right */}
                <div className="w-10 bg-[#1e293b] p-0.5 flex flex-col">
                    <div className="w-full h-2 bg-[#334155] rounded-sm mb-0.5" />
                    <div className="w-full h-2 bg-[#334155] rounded-sm mb-0.5" />
                    <div className="flex-1" />
                    <div className="w-full h-3 bg-[#3b82f6] rounded-sm" />
                </div>
            </div>
        );
    }

    if (engine === 'pro') {
        return (
            <div className="w-full h-full bg-[#09090b] rounded-md overflow-hidden flex">
                {/* Left order panel (wider) */}
                <div className="w-12 bg-[#18181b] p-0.5 flex flex-col gap-0.5">
                    <div className="w-full h-2 bg-[#27272a] rounded-sm" />
                    <div className="w-full h-1.5 bg-[#2A9D8F] rounded-sm opacity-50" />
                    <div className="w-full h-2 bg-[#27272a] rounded-sm" />
                    <div className="w-full h-2 bg-[#27272a] rounded-sm" />
                    <div className="flex-1" />
                    <div className="w-full h-3 bg-[#2A9D8F] rounded-sm" />
                </div>
                {/* Right item grid */}
                <div className="flex-1 flex flex-col">
                    {/* Category tabs */}
                    <div className="h-3 bg-[#18181b] flex gap-0.5 px-1 items-center">
                        <div className="w-4 h-1.5 bg-[#2A9D8F] rounded-sm" />
                        <div className="w-4 h-1.5 bg-[#27272a] rounded-sm" />
                        <div className="w-4 h-1.5 bg-[#27272a] rounded-sm" />
                    </div>
                    <div className="flex-1 p-1 grid grid-cols-4 gap-0.5">
                        <div className="bg-[#27272a] rounded-sm" />
                        <div className="bg-[#27272a] rounded-sm" />
                        <div className="bg-[#27272a] rounded-sm" />
                        <div className="bg-[#27272a] rounded-sm" />
                        <div className="bg-[#27272a] rounded-sm" />
                        <div className="bg-[#27272a] rounded-sm" />
                        <div className="bg-[#27272a] rounded-sm" />
                        <div className="bg-[#27272a] rounded-sm" />
                    </div>
                </div>
            </div>
        );
    }

    if (engine === 'express') {
        return (
            <div className="w-full h-full bg-black rounded-md overflow-hidden flex flex-col">
                {/* Category strip top */}
                <div className="h-3 bg-[#111] flex gap-0.5 px-1 items-center">
                    <div className="w-5 h-1.5 bg-[#22c55e] rounded-sm" />
                    <div className="w-5 h-1.5 bg-[#1a1a1a] rounded-sm" />
                    <div className="w-5 h-1.5 bg-[#1a1a1a] rounded-sm" />
                </div>
                {/* Main area */}
                <div className="flex-1 flex">
                    {/* Large product grid */}
                    <div className="flex-1 p-1 grid grid-cols-3 gap-0.5">
                        <div className="bg-[#1a1a1a] rounded-lg" />
                        <div className="bg-[#1a1a1a] rounded-lg" />
                        <div className="bg-[#1a1a1a] rounded-lg" />
                        <div className="bg-[#1a1a1a] rounded-lg" />
                        <div className="bg-[#1a1a1a] rounded-lg" />
                        <div className="bg-[#1a1a1a] rounded-lg" />
                    </div>
                    {/* Slim order panel right */}
                    <div className="w-8 bg-[#111] p-0.5 flex flex-col gap-0.5">
                        <div className="w-full h-2 bg-[#1a1a1a] rounded-sm" />
                        <div className="w-full h-2 bg-[#1a1a1a] rounded-sm" />
                        <div className="flex-1" />
                        <div className="w-full h-2 bg-[#22c55e] rounded-sm" />
                        <div className="w-full h-2 bg-[#3b82f6] rounded-sm" />
                    </div>
                </div>
            </div>
        );
    }

    // Custom / fallback
    return (
        <div className="w-full h-full bg-gradient-to-br from-zinc-900 to-zinc-800 rounded-md flex items-center justify-center">
            <Palette className="w-6 h-6 text-muted-foreground" />
        </div>
    );
}

export default function POSThemeGallery() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [activeThemeId, setActiveThemeId] = useState<string>(getActiveTheme().id);
    const [selectedTheme, setSelectedTheme] = useState<POSThemeConfig | null>(null);
    const [builtInThemes] = useState<POSThemeConfig[]>(BUILTIN_THEMES);
    const [customThemes, setCustomThemes] = useState<Array<{ id: string; meta: { name: string; description?: string }; engine: string; layout_type: string }>>([]);
    const [loadingCustom, setLoadingCustom] = useState(true);

    // Fetch custom themes from API
    useEffect(() => {
        api.get('/api/pos-themes?type=pos')
            .then((res) => {
                const apiThemes = Array.isArray(res.data) ? res.data : [];
                // Filter out built-in themes (they come from BUILTIN_THEMES)
                setCustomThemes(apiThemes.filter((t: { is_builtin?: boolean }) => !t.is_builtin));
            })
            .catch((err) => {
                logger.error('Failed to fetch custom themes', err);
            })
            .finally(() => setLoadingCustom(false));
    }, []);

    const handleActivate = (themeId: string) => {
        setActiveTheme(themeId);
        setActiveThemeId(themeId);

        // Also update legacy localStorage for backward compatibility
        const theme = builtInThemes.find(t => t.id === themeId);
        if (theme) {
            const legacyMap: Record<string, string> = {
                'l-series': 'l-series',
                'restin': 'restin',
                'pro': 'restin',
                'express': 'restin',
            };
            localStorage.setItem('pos_theme', legacyMap[theme.engine] || 'l-series');
            localStorage.setItem('pos_layout', theme.engine === 'l-series' ? 'l-series' : theme.engine);
        }

        toast.success(`Theme "${theme?.meta.name || themeId}" activated`);
        logger.info('POS theme activated', { themeId });
    };

    const handleLaunchPOS = () => {
        navigate('/pos/runtime');
    };

    return (
        <div className="min-h-screen bg-background text-foreground">
            {/* Header */}
            <div className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigate('/manager/pos-dashboard')}
                            className="text-muted-foreground hover:text-foreground"
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <div>
                            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
                                <Palette className="h-5 w-5 text-teal-400" />
                                POS Themes
                            </h1>
                            <p className="text-sm text-muted-foreground">Choose a layout for your point of sale</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button
                            onClick={() => navigate('/manager/pos-themes/builder/new')}
                            variant="outline"
                            className="border-teal-700 text-teal-400 hover:bg-teal-600/20 gap-2 font-medium"
                        >
                            <Plus className="h-4 w-4" />
                            Create Theme
                        </Button>
                        <Button
                            onClick={handleLaunchPOS}
                            className="bg-teal-600 hover:bg-teal-500 text-foreground gap-2 font-semibold"
                        >
                            <Play className="h-4 w-4" />
                            Launch POS
                        </Button>
                    </div>
                </div>
            </div>

            {/* Theme Grid */}
            <div className="max-w-7xl mx-auto px-6 py-8">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                    {builtInThemes.map((theme) => {
                        const isActive = theme.id === activeThemeId;
                        const Icon = ENGINE_ICONS[theme.engine] || Palette;

                        return (
                            <motion.div
                                key={theme.id}
                                layout
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3 }}
                            >
                                <Card
                                    className={cn(
                                        "group relative overflow-hidden border-2 transition-all duration-300 cursor-pointer bg-card",
                                        isActive
                                            ? "border-teal-500 shadow-lg shadow-teal-500/10"
                                            : "border-border hover:border-zinc-600"
                                    )}
                                    onClick={() => setSelectedTheme(selectedTheme?.id === theme.id ? null : theme)}
                                >
                                    {/* Active badge */}
                                    {isActive && (
                                        <div className="absolute top-3 right-3 z-10">
                                            <Badge className="bg-teal-500 text-foreground gap-1 shadow-lg">
                                                <Check className="h-3 w-3" />
                                                Active
                                            </Badge>
                                        </div>
                                    )}

                                    {/* Preview */}
                                    <div className="aspect-[4/3] p-3">
                                        <ThemePreview engine={theme.engine} />
                                    </div>

                                    <CardContent className="p-4 pt-0 space-y-3">
                                        {/* Title */}
                                        <div className="flex items-center gap-2">
                                            <div className={cn(
                                                "p-1.5 rounded-md",
                                                isActive ? "bg-teal-500/20" : "bg-secondary"
                                            )}>
                                                <Icon className={cn(
                                                    "h-4 w-4",
                                                    isActive ? "text-teal-400" : "text-muted-foreground"
                                                )} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-semibold text-foreground truncate">{theme.meta.name}</h3>
                                                <p className="text-xs text-muted-foreground truncate">{theme.meta.description}</p>
                                            </div>
                                        </div>

                                        {/* Business type tags */}
                                        <div className="flex flex-wrap gap-1">
                                            {theme.meta.businessType.slice(0, 3).map(bt => (
                                                <Badge
                                                    key={bt}
                                                    variant="secondary"
                                                    className="text-[10px] bg-secondary text-muted-foreground hover:bg-secondary/80"
                                                >
                                                    {BIZ_TYPE_LABELS[bt] || bt}
                                                </Badge>
                                            ))}
                                        </div>

                                        {/* Action buttons */}
                                        <div className="flex gap-2 pt-1">
                                            {!isActive ? (
                                                <Button
                                                    size="sm"
                                                    className="flex-1 bg-teal-600 hover:bg-teal-500 text-foreground font-medium"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleActivate(theme.id);
                                                    }}
                                                >
                                                    Activate
                                                </Button>
                                            ) : (
                                                <Button
                                                    size="sm"
                                                    className="flex-1 bg-teal-600/20 text-teal-400 hover:bg-teal-600/30 font-medium"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleLaunchPOS();
                                                    }}
                                                >
                                                    <Play className="h-3 w-3 mr-1" />
                                                    Launch
                                                </Button>
                                            )}
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="border-border text-muted-foreground hover:text-foreground hover:border-zinc-500"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    navigate(`/manager/pos-themes/builder/${theme.id}`);
                                                }}
                                                title="Customize this template"
                                            >
                                                <Pencil className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        );
                    })}

                    {/* Custom Themes from API */}
                    {customThemes.map((ct) => (
                        <motion.div
                            key={ct.id}
                            layout
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3 }}
                        >
                            <Card
                                className="group relative overflow-hidden border-2 border-border hover:border-teal-700 transition-all duration-300 cursor-pointer bg-card"
                                onClick={() => navigate(`/manager/pos-themes/builder/${ct.id}`)}
                            >
                                <Badge className="absolute top-3 right-3 z-10 bg-violet-500/80 text-foreground text-[10px]">
                                    Custom
                                </Badge>

                                <div className="aspect-[4/3] p-3">
                                    <ThemePreview engine="custom" />
                                </div>

                                <CardContent className="p-4 pt-0 space-y-3">
                                    <div className="flex items-center gap-2">
                                        <div className="p-1.5 rounded-md bg-violet-500/20">
                                            <Palette className="h-4 w-4 text-violet-400" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-semibold text-foreground truncate">{ct.meta.name}</h3>
                                            <p className="text-xs text-muted-foreground truncate">{ct.meta.description || 'Custom theme'}</p>
                                        </div>
                                    </div>

                                    <div className="flex gap-2 pt-1">
                                        <Button
                                            size="sm"
                                            className="flex-1 bg-violet-600 hover:bg-violet-500 text-foreground font-medium gap-1"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                navigate(`/manager/pos-themes/builder/${ct.id}`);
                                            }}
                                        >
                                            <Pencil className="h-3 w-3" />
                                            Edit
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="border-border text-muted-foreground hover:text-red-400 hover:border-red-700"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                api.delete(`/api/pos-themes/${ct.id}`)
                                                    .then(() => {
                                                        setCustomThemes(prev => prev.filter(c => c.id !== ct.id));
                                                        toast.success('Theme deleted');
                                                    })
                                                    .catch(() => toast.error('Failed to delete theme'));
                                            }}
                                        >
                                            <Trash2 className="h-3 w-3" />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    ))}

                    {loadingCustom && (
                        <div className="col-span-full flex justify-center py-4">
                            <Loader2 className="h-5 w-5 text-muted-foreground animate-spin" />
                        </div>
                    )}

                    {/* Create New Theme Card */}
                    <motion.div
                        layout
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: 0.15 }}
                    >
                        <Card
                            className="group border-2 border-dashed border-border hover:border-teal-600 transition-all duration-300 cursor-pointer bg-card/40 hover:bg-card"
                            onClick={() => navigate('/manager/pos-themes/builder/new')}
                        >
                            <div className="aspect-[4/3] flex flex-col items-center justify-center gap-3 p-6">
                                <div className="w-14 h-14 rounded-2xl bg-teal-500/10 flex items-center justify-center group-hover:bg-teal-500/20 transition-colors">
                                    <Plus className="h-7 w-7 text-teal-500" />
                                </div>
                                <div className="text-center">
                                    <h3 className="font-semibold text-secondary-foreground group-hover:text-foreground transition-colors">Create Custom Theme</h3>
                                    <p className="text-xs text-muted-foreground mt-1">Design your own POS layout</p>
                                </div>
                            </div>
                        </Card>
                    </motion.div>
                </div>

                {/* Detail Panel (selected theme) */}
                <AnimatePresence>
                    {selectedTheme && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mt-8 overflow-hidden"
                        >
                            <Card className="bg-card border-border">
                                <CardContent className="p-6">
                                    <div className="flex items-start gap-6">
                                        {/* Large preview */}
                                        <div className="w-80 aspect-[4/3] flex-shrink-0">
                                            <ThemePreview engine={selectedTheme.engine} />
                                        </div>

                                        {/* Details */}
                                        <div className="flex-1 space-y-4">
                                            <div>
                                                <h2 className="text-2xl font-bold text-foreground">{selectedTheme.meta.name}</h2>
                                                <p className="text-muted-foreground mt-1">{selectedTheme.meta.description}</p>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <span className="text-xs text-muted-foreground uppercase tracking-wider">Engine</span>
                                                    <p className="text-sm text-secondary-foreground mt-0.5 font-mono">{selectedTheme.engine}</p>
                                                </div>
                                                <div>
                                                    <span className="text-xs text-muted-foreground uppercase tracking-wider">Version</span>
                                                    <p className="text-sm text-secondary-foreground mt-0.5">{selectedTheme.meta.version}</p>
                                                </div>
                                                <div>
                                                    <span className="text-xs text-muted-foreground uppercase tracking-wider">Author</span>
                                                    <p className="text-sm text-secondary-foreground mt-0.5">{selectedTheme.meta.author}</p>
                                                </div>
                                                <div>
                                                    <span className="text-xs text-muted-foreground uppercase tracking-wider">Type</span>
                                                    <p className="text-sm text-secondary-foreground mt-0.5">
                                                        {selectedTheme.isBuiltIn ? 'Built-in Template' : 'Custom Theme'}
                                                    </p>
                                                </div>
                                            </div>

                                            <div>
                                                <span className="text-xs text-muted-foreground uppercase tracking-wider">Color Palette</span>
                                                <div className="flex gap-2 mt-2">
                                                    {[
                                                        selectedTheme.styles.rootBg,
                                                        selectedTheme.styles.topBarBg,
                                                        selectedTheme.styles.accentColor,
                                                        selectedTheme.styles.tileBg,
                                                        selectedTheme.styles.textPrimary,
                                                    ].map((color, i) => (
                                                        <div
                                                            key={i}
                                                            className="w-8 h-8 rounded-md border border-border"
                                                            style={{ backgroundColor: color  /* keep-inline */ }} /* keep-inline */ /* keep-inline */
                                                            title={color}
                                                        />
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="flex gap-2 pt-2">
                                                {selectedTheme.id !== activeThemeId && (
                                                    <Button
                                                        className="bg-teal-600 hover:bg-teal-500 text-foreground"
                                                        onClick={() => handleActivate(selectedTheme.id)}
                                                    >
                                                        <Check className="h-4 w-4 mr-2" />
                                                        Activate This Theme
                                                    </Button>
                                                )}
                                                <Button
                                                    variant="outline"
                                                    className="border-border text-secondary-foreground hover:text-foreground"
                                                    onClick={() => {
                                                        handleActivate(selectedTheme.id);
                                                        handleLaunchPOS();
                                                    }}
                                                >
                                                    <Play className="h-4 w-4 mr-2" />
                                                    Preview in POS
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
