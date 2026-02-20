// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Palette, Save, Loader2, CheckCircle2, Paintbrush, Check } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import api from '@/lib/api';
import PageContainer from '@/layouts/PageContainer';
import { useTheme, ThemeColors } from '@/context/ThemeContext';
import { useAuth } from '@/features/auth/AuthContext';
import { cn } from '@/lib/utils';

function timeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    if (diffMs < 0) return 'just now';
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return `${diffMins}m ago`;
    const hrs = Math.floor(diffMins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
}

export default function ThemeEngineSettings() {
    const { user } = useAuth();
    const isSystemAdmin = user?.role?.toUpperCase() === 'PRODUCT_OWNER';

    const {
        globalThemeClass,
        setGlobalThemeClass,
        currentTheme,
        presetThemes,
        saveTheme,
        setTheme
    } = useTheme();

    // Engine Config State
    const [engineLoading, setEngineLoading] = useState(isSystemAdmin);
    const [engineSaving, setEngineSaving] = useState(false);
    const [enabled, setEnabled] = useState(true);
    const [activeTheme, setActiveTheme] = useState(globalThemeClass || 'theme-standard');
    const [lastUpdated, setLastUpdated] = useState<string | null>(null);
    const [updatedBy, setUpdatedBy] = useState<string | null>(null);

    // Color Customizer State
    const [customThemeObj, setCustomThemeObj] = useState<any>({
        id: 'custom',
        name: 'Custom Theme',
        primary: '#2563eb',
        primaryHover: '#1d4ed8',
        primaryLight: '#dbeafe',
        accent: '#3b82f6',
        success: '#10b981',
        warning: '#f59e0b',
        danger: '#ef4444',
        sidebar: '#ffffff',
        sidebarText: '#1f2937',
        sidebarActive: '#dbeafe',
        sidebarActiveText: '#2563eb'
    });

    // Fetch existing ENGINE settings (System Admin Only)
    useEffect(() => {
        if (!isSystemAdmin) return;
        const fetchEngineConfig = async () => {
            try {
                const res = await api.get('/ai/settings/theme_engine?level=system');
                if (res.data) {
                    if (res.data.config?.enabled !== undefined) setEnabled(res.data.config.enabled);
                    if (res.data.config?.active_theme) setActiveTheme(res.data.config.active_theme);
                    setLastUpdated(res.data.updated_at || null);
                    setUpdatedBy(res.data.updated_by || null);
                }
            } catch (error: any) {
                console.error("Failed to fetch theme engine status", error);
            } finally {
                setEngineLoading(false);
            }
        };
        fetchEngineConfig();
    }, [isSystemAdmin]);

    // ─── Engine Methods ────────────────────────────

    const handleThemeChange = (newTheme: string) => {
        setActiveTheme(newTheme);
        setGlobalThemeClass(newTheme);

        const root = window.document.documentElement;
        if (newTheme === 'theme-tech') {
            root.classList.add('theme-tech');
            root.classList.remove('light');
            root.classList.add('dark');
            root.style.colorScheme = 'dark';
        } else {
            root.classList.remove('theme-tech');
            const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
            root.classList.remove('light', 'dark');
            root.classList.add(systemTheme);
            root.style.colorScheme = systemTheme;
        }
    };

    const handleEngineSave = async () => {
        setEngineSaving(true);
        try {
            await api.put('/ai/settings/theme_engine', {
                level: 'system',
                config: {
                    enabled: enabled,
                    active_theme: activeTheme
                }
            });
            toast.success('System theme engine updated!');

            const res = await api.get('/ai/settings/theme_engine?level=system');
            if (res.data) {
                setLastUpdated(res.data.updated_at || null);
                setUpdatedBy(res.data.updated_by || null);
            }
        } catch (error: any) {
            toast.error('Failed to save theme settings');
        } finally {
            setEngineSaving(false);
        }
    };

    // ─── Color Customizer Methods ──────────────────

    const handlePresetSelect = async (themeId: string) => {
        const theme = presetThemes[themeId];
        setTheme(theme);
        const success = await saveTheme(themeId);
        if (success) {
            toast.success(`Brand colors changed to ${theme.name}`);
        } else {
            toast.error('Failed to save brand colors');
        }
    };

    const handleCustomSave = async () => {
        setTheme(customThemeObj);
        const success = await saveTheme('custom', customThemeObj);
        if (success) {
            toast.success('Custom brand colors saved');
        } else {
            toast.error('Failed to save custom colors');
        }
    };

    const previewColorTheme = (theme: ThemeColors) => {
        setTheme(theme);
    };

    if (engineLoading) {
        return (
            <PageContainer title="Theme Engine" description="Loading" actions={null}>
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
                </div>
            </PageContainer>
        );
    }

    return (
        <PageContainer title="Visual Identity" description="Theme Engine" actions={null}>
            <div className="max-w-4xl mx-auto space-y-6">

                {/* Header */}
                <div className="flex items-center gap-4 border-b border-border pb-6">
                    <div className="p-3 bg-pink-500/10 rounded-xl border border-pink-500/20">
                        <Palette className="w-8 h-8 text-pink-500" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-foreground">Visual Identity Settings</h1>
                        <p className="text-muted-foreground">Manage organizational aesthetics, branding, and core themes.</p>
                    </div>
                </div>

                {/* 1. Theme Engine (System-Level) - Restricted to Product Owner */}
                {isSystemAdmin && (
                    <Card className="bg-card/40 border-border mb-8 shadow-sm">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <CheckCircle2 className="w-5 h-5 text-emerald-500" /> System Engine Configuration
                            </CardTitle>
                            <CardDescription>Only product owners can alter the underlying structural visuals globally.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">

                            <div className="flex items-center justify-between py-2 border-b border-border">
                                <div>
                                    <Label className="text-base font-semibold">Enable Engine Overrides</Label>
                                    <p className="text-sm text-muted-foreground">Toggle the global aesthetic engine subsystem.</p>
                                </div>
                                <Switch checked={enabled} onCheckedChange={setEnabled} />
                            </div>

                            <div className="space-y-4 pt-2">
                                <div>
                                    <Label className="text-base font-semibold">Base Architectural Theme</Label>
                                    <p className="text-sm text-muted-foreground mb-4">Select the foundational CSS structure for all Restin.ai features.</p>
                                </div>

                                {/* Visual Theme Selection Cards */}
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-4 opacity-100 transition-opacity" style={{ opacity: enabled ? 1 : 0.5 }}>

                                    {/* STANDARD ENTERPRISE THEME */}
                                    <div
                                        className={cn(
                                            'cursor-pointer transition-all hover:shadow-lg rounded-xl border p-4 relative overflow-hidden bg-card group',
                                            activeTheme === 'theme-standard' && enabled ? 'border-blue-500 ring-1 ring-blue-500 bg-blue-500/5' : 'border-border grayscale-[0.2]'
                                        )}
                                        onClick={() => enabled && handleThemeChange('theme-standard')}
                                    >
                                        {/* Mockup Windows */}
                                        <div className="h-32 mb-5 bg-zinc-100 dark:bg-zinc-950 rounded-lg border border-zinc-200 dark:border-zinc-800 p-3 overflow-hidden flex flex-col gap-2 relative">
                                            {/* Header */}
                                            <div className="h-4 w-1/3 bg-blue-500 rounded"></div>
                                            {/* Content */}
                                            <div className="flex-1 flex gap-2">
                                                {/* Sidebar */}
                                                <div className="w-1/4 bg-white dark:bg-zinc-900 rounded shadow-sm border border-zinc-200 dark:border-zinc-800 flex flex-col gap-1 p-1">
                                                    <div className="h-2 w-full bg-zinc-200 dark:bg-zinc-800 rounded"></div>
                                                    <div className="h-2 w-3/4 bg-zinc-200 dark:bg-zinc-800 rounded"></div>
                                                    <div className="h-2 w-1/2 bg-blue-500/20 rounded mt-auto"></div>
                                                </div>
                                                {/* Main Area */}
                                                <div className="flex-1 bg-white dark:bg-zinc-900 rounded shadow-sm border border-zinc-200 dark:border-zinc-800 p-2">
                                                    <div className="h-10 w-full bg-zinc-50 dark:bg-zinc-950 rounded border border-zinc-100 dark:border-zinc-800 mb-2"></div>
                                                    <div className="h-3 w-1/2 bg-zinc-200 dark:bg-zinc-800 rounded"></div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between">
                                            <div className="flex flex-col text-left">
                                                <span className="font-semibold text-foreground text-lg flex items-center gap-2">
                                                    Standard Enterprise
                                                </span>
                                                <span className="text-xs text-muted-foreground font-normal">Clean, Professional & Utilitarian</span>
                                            </div>
                                            {activeTheme === 'theme-standard' && <CheckCircle2 className="w-6 h-6 text-blue-500" />}
                                            {activeTheme !== 'theme-standard' && <div className="w-6 h-6 rounded-full border-2 border-muted-foreground/30"></div>}
                                        </div>
                                    </div>

                                    {/* TECH_NOLOGICAL THEME */}
                                    <div
                                        className={cn(
                                            'cursor-pointer transition-all hover:shadow-lg hover:shadow-pink-500/10 rounded-xl border p-4 relative overflow-hidden bg-card group',
                                            activeTheme === 'theme-tech' && enabled ? 'border-pink-500 ring-1 ring-pink-500 bg-pink-500/5' : 'border-border grayscale-[0.2]'
                                        )}
                                        onClick={() => enabled && handleThemeChange('theme-tech')}
                                    >
                                        {/* Mockup Windows */}
                                        <div className="h-32 mb-5 bg-[#040508] rounded-lg border border-[#1E293B] p-3 overflow-hidden flex flex-col gap-2 relative">
                                            {/* Atmosphere Glow */}
                                            <div className="absolute top-0 right-0 w-32 h-32 bg-pink-500/10 blur-2xl rounded-full"></div>

                                            {/* Header */}
                                            <div className="h-4 w-1/3 bg-[#06B6D4] rounded shadow-[0_0_8px_rgba(6,182,212,0.8)] z-10 flex items-center px-1">
                                                <div className="w-1 h-2 bg-white/50 rounded-full"></div>
                                            </div>
                                            {/* Content */}
                                            <div className="flex-1 flex gap-2 z-10">
                                                {/* Sidebar */}
                                                <div className="w-1/4 bg-[#0A0C13] rounded border border-[#1E293B] flex flex-col gap-1 p-1">
                                                    <div className="h-2 w-full bg-[#1E293B] rounded"></div>
                                                    <div className="h-2 w-3/4 bg-[#1E293B] rounded"></div>
                                                    <div className="h-2 w-full bg-pink-500/20 rounded mt-auto border border-pink-500/30"></div>
                                                </div>
                                                {/* Main Area */}
                                                <div className="flex-1 bg-[#0A0C13] rounded border border-[#1E293B] p-2 relative overflow-hidden">
                                                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent"></div>
                                                    <div className="h-10 w-full bg-[#040508] rounded border border-[#1E293B] mb-2 shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]"></div>
                                                    <div className="h-3 w-1/2 bg-[#1E293B] rounded"></div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between">
                                            <div className="flex flex-col text-left">
                                                <span className="text-pink-400 font-mono tracking-wider font-bold text-lg drop-shadow-[0_0_5px_rgba(236,72,153,0.5)]">
                                                    TeCh_NoLoGiCaL
                                                </span>
                                                <span className="text-xs text-pink-500/70 font-normal uppercase tracking-widest">Neon Accents, Deep Space</span>
                                            </div>
                                            {activeTheme === 'theme-tech' && <div className="w-6 h-6 rounded-full bg-pink-500 shadow-[0_0_12px_rgba(236,72,153,0.8)] border border-white/20"></div>}
                                            {activeTheme !== 'theme-tech' && <div className="w-6 h-6 rounded-full border-2 border-muted-foreground/30"></div>}
                                        </div>
                                    </div>

                                    {/* CYBERPUNK THEME */}
                                    <div
                                        className={cn(
                                            'cursor-pointer transition-all hover:shadow-lg hover:shadow-red-500/10 rounded-xl border p-4 relative overflow-hidden bg-card group',
                                            activeTheme === 'theme-cyber' && enabled ? 'border-red-500 ring-1 ring-red-500 bg-red-500/5' : 'border-border grayscale-[0.2]'
                                        )}
                                        onClick={() => enabled && handleThemeChange('theme-cyber')}
                                    >
                                        {/* Mockup Windows */}
                                        <div className="h-32 mb-5 bg-[#000000] rounded-lg border border-[#330000] p-3 overflow-hidden flex flex-col gap-2 relative">
                                            {/* Atmosphere Glow */}
                                            <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 blur-3xl rounded-full pointer-events-none"></div>

                                            {/* Header */}
                                            <div className="h-4 w-1/3 bg-[#FF0000] rounded shadow-[0_0_12px_rgba(255,0,0,0.8)] z-10 flex items-center px-1">
                                                <div className="w-1 h-2 bg-white/50 rounded-full"></div>
                                            </div>
                                            {/* Content */}
                                            <div className="flex-1 flex gap-2 z-10">
                                                {/* Sidebar */}
                                                <div className="w-1/4 bg-[#050505] rounded border border-[#330000] flex flex-col gap-1 p-1">
                                                    <div className="h-2 w-full bg-[#1C0000] rounded"></div>
                                                    <div className="h-2 w-3/4 bg-[#1C0000] rounded"></div>
                                                    <div className="h-2 w-full bg-[#FF0000]/20 rounded mt-auto border border-[#FF0000]/30 shadow-[0_0_5px_rgba(255,0,0,0.5)]"></div>
                                                </div>
                                                {/* Main Area */}
                                                <div className="flex-1 bg-[#050505] rounded border border-[#330000] p-2 relative overflow-hidden">
                                                    <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent pointer-events-none"></div>
                                                    <div className="h-10 w-full bg-[#000000] rounded border border-[#FF0000]/30 mb-2 shadow-[inset_0_0_15px_rgba(255,0,0,0.15)] overflow-hidden relative">
                                                        {/* Fake data bars */}
                                                        <div className="absolute bottom-1 left-1 w-1/3 h-6 bg-[#FF0000]/20 border border-[#FF0000]/40 rounded-sm"></div>
                                                        <div className="absolute bottom-1 left-1/2 w-1/4 h-8 bg-[#FF0000]/20 border border-[#FF0000]/40 rounded-sm"></div>
                                                    </div>
                                                    <div className="h-3 w-1/2 bg-[#1C0000] rounded"></div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between">
                                            <div className="flex flex-col text-left">
                                                <span className="text-red-500 font-mono tracking-widest font-black text-lg drop-shadow-[0_0_8px_rgba(255,0,0,0.8)] uppercase">
                                                    Cyberpunk
                                                </span>
                                                <span className="text-[10px] text-red-500/60 font-mono uppercase tracking-widest">Raw System Override</span>
                                            </div>
                                            {activeTheme === 'theme-cyber' && <div className="w-6 h-6 rounded-full bg-red-600 shadow-[0_0_15px_rgba(255,0,0,1)] border border-white/30"></div>}
                                            {activeTheme !== 'theme-cyber' && <div className="w-6 h-6 rounded-full border-2 border-muted-foreground/30"></div>}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-between pt-6 border-t border-border mt-8">
                                <div className="text-xs text-muted-foreground">
                                    {lastUpdated ? `Last changed ${timeAgo(lastUpdated)} by ${updatedBy}` : 'Unmodified defaults inside core'}
                                </div>
                                <Button onClick={handleEngineSave} disabled={engineSaving || !enabled} className="bg-red-600 hover:bg-red-700 text-white min-w-[140px]">
                                    {engineSaving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : <><Save className="w-4 h-4 mr-2" /> Save Active Theme</>}
                                </Button>
                            </div>

                        </CardContent>
                    </Card>
                )}

                {/* 2. Color Palettes (Org-Level) */}
                <Card className="bg-card/40 border-border shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Paintbrush className="w-5 h-5 text-blue-500" /> Brand Colors
                        </CardTitle>
                        <CardDescription>Customize the accenting primary and secondary color palette for your venue.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Tabs defaultValue="presets" className="w-full">
                            <TabsList className="mb-6 bg-secondary border border-border">
                                <TabsTrigger value="presets" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
                                    <Palette className="w-4 h-4 mr-2" />
                                    Preset Palettes
                                </TabsTrigger>
                                <TabsTrigger value="custom" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
                                    <Paintbrush className="w-4 h-4 mr-2" />
                                    Custom HEX
                                </TabsTrigger>
                            </TabsList>

                            {/* Preset Themes */}
                            <TabsContent value="presets">
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {Object.values(presetThemes).map((theme) => (
                                        <div
                                            key={theme.id}
                                            className={cn(
                                                'cursor-pointer transition-all hover:shadow-md rounded-xl border bg-card/60 p-6 relative overflow-hidden',
                                                currentTheme?.id === theme.id ? 'ring-2 ring-offset-2 ring-offset-background' : 'border-border'
                                            )}
                                            style={
                                                currentTheme?.id === theme.id
                                                    ? { '--tw-ring-color': theme.primary } as React.CSSProperties
                                                    : {}
                                            }
                                            onClick={() => handlePresetSelect(theme.id)}
                                        >
                                            {currentTheme?.id === theme.id && (
                                                <div className="absolute top-0 right-0 p-2 bg-green-500/10 rounded-bl-lg">
                                                    <Check className="w-4 h-4 text-green-500" />
                                                </div>
                                            )}
                                            <h3 className="font-semibold text-lg mb-4 text-foreground">{theme.name}</h3>

                                            {/* Color Preview */}
                                            <div className="space-y-2">
                                                <div className="flex gap-2">
                                                    <div className="h-10 flex-1 rounded" style={{ backgroundColor: theme.primary }} title="Primary" />
                                                    <div className="h-10 flex-1 rounded" style={{ backgroundColor: theme.accent }} title="Accent" />
                                                </div>
                                                <div className="flex gap-2">
                                                    <div className="h-4 flex-1 rounded" style={{ backgroundColor: theme.success }} title="Success" />
                                                    <div className="h-4 flex-1 rounded" style={{ backgroundColor: theme.warning }} title="Warning" />
                                                    <div className="h-4 flex-1 rounded" style={{ backgroundColor: theme.danger }} title="Danger" />
                                                </div>
                                            </div>

                                            <Button
                                                className="w-full mt-5 font-bold"
                                                size="sm"
                                                style={{ backgroundColor: theme.primary, color: '#ffffff' }}
                                                onClick={(e) => { e.stopPropagation(); previewColorTheme(theme); }}
                                            >
                                                Preview Palette
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </TabsContent>

                            {/* Custom Theme */}
                            <TabsContent value="custom">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border border-border p-6 rounded-xl bg-card/30">

                                    <div className="space-y-4">
                                        <div>
                                            <Label>Palette Name</Label>
                                            <Input
                                                value={customThemeObj.name}
                                                onChange={(e) => setCustomThemeObj({ ...customThemeObj, name: e.target.value })}
                                                placeholder="My Brand Theme"
                                                className="bg-secondary mt-1"
                                            />
                                        </div>

                                        {[
                                            { label: 'Primary Brand Color', key: 'primary' },
                                            { label: 'Accent Highlight', key: 'accent' },
                                            { label: 'Success (Green)', key: 'success' },
                                            { label: 'Warning (Yellow)', key: 'warning' },
                                            { label: 'Danger (Red)', key: 'danger' }
                                        ].map(field => (
                                            <div key={field.key}>
                                                <Label>{field.label}</Label>
                                                <div className="flex gap-2 mt-1">
                                                    <Input
                                                        type="color"
                                                        value={(customThemeObj as any)[field.key]}
                                                        onChange={(e) => setCustomThemeObj({ ...customThemeObj, [field.key]: e.target.value })}
                                                        className="w-16 h-10 p-1 cursor-pointer bg-secondary"
                                                    />
                                                    <Input
                                                        value={(customThemeObj as any)[field.key]}
                                                        onChange={(e) => setCustomThemeObj({ ...customThemeObj, [field.key]: e.target.value })}
                                                        className="bg-secondary font-mono"
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Live Preview UI */}
                                    <div className="flex flex-col h-full">
                                        <Label className="mb-3 block text-foreground">Live Application Preview</Label>
                                        <div className="flex-1 border-2 rounded-xl p-6 bg-background space-y-6" style={{ borderColor: customThemeObj.primary }}>
                                            <div className="space-y-2">
                                                <h3 className="text-lg font-bold" style={{ color: customThemeObj.primary }}>Mock Header</h3>
                                                <p className="text-sm text-muted-foreground">This validates text contrasts and borders.</p>
                                            </div>

                                            <Button className="w-full" style={{ backgroundColor: customThemeObj.primary, color: '#ffffff' }}>
                                                Primary Action
                                            </Button>

                                            <div className="flex flex-wrap gap-2">
                                                <Badge style={{ backgroundColor: customThemeObj.success, color: '#ffffff' }}>Success Node</Badge>
                                                <Badge style={{ backgroundColor: customThemeObj.warning, color: '#ffffff' }}>Warning Flag</Badge>
                                                <Badge style={{ backgroundColor: customThemeObj.danger, color: '#ffffff' }}>Error Alert</Badge>
                                            </div>

                                            <div className="p-4 rounded-xl font-medium" style={{ backgroundColor: customThemeObj.primaryLight || `${customThemeObj.primary}15`, color: customThemeObj.primary }}>
                                                Active Sidebar Navigation Item
                                            </div>
                                        </div>

                                        <div className="flex gap-3 mt-6">
                                            <Button onClick={() => previewColorTheme(customThemeObj)} variant="outline" className="flex-1 border-border">
                                                Preview Live
                                            </Button>
                                            <Button onClick={handleCustomSave} className="flex-1" style={{ backgroundColor: customThemeObj.primary, color: '#ffffff' }}>
                                                Deploy Custom Palette
                                            </Button>
                                        </div>
                                    </div>

                                </div>
                            </TabsContent>
                        </Tabs>
                    </CardContent>
                </Card>

            </div>
        </PageContainer>
    );
}
