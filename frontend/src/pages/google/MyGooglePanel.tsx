// @ts-nocheck
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { logger } from '@/lib/logger';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
    Calendar, HardDrive, Mail, Contact, CheckSquare, Image,
    RefreshCw, Unlink, Link2, Plus, Trash2, MapPin, Clock,
    Paperclip, Star, StarOff, Check, Circle, ChevronRight,
    Phone, Building2, FileText, FileSpreadsheet, Presentation,
    Folder, File, Settings, X, Users, ImageIcon, Table, Youtube,
    Eye, ThumbsUp, ExternalLink, Archive, MailOpen, Send,
    Download, Upload, ToggleLeft, ToggleRight, Zap
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────

interface GoogleStatus {
    connected: boolean;
    email?: string;
    connected_at?: string;
    display_name?: string;
}

interface CalendarEvent {
    id: string; title: string; description: string;
    start_time: string; end_time: string; location: string;
    color: string; calendar_name: string;
}

interface DriveFile {
    id: string; name: string; mime_type: string; size_bytes: number;
    modified_at: string; folder: string; shared_with: string[];
    icon_type: string; web_link?: string;
}

interface GmailMessage {
    id: string; from_name: string; from_email: string;
    subject: string; snippet: string; date: string;
    read: boolean; starred: boolean; labels: string[];
    has_attachment: boolean;
}

interface GoogleContact {
    id: string; name: string; email: string; phone: string;
    company: string; role: string; avatar_color: string; notes: string;
}

interface GoogleTask {
    id: string; title: string; notes: string; due_date: string;
    completed: boolean; task_list: string; priority: string;
}

interface GooglePhoto {
    id: string; name: string; album: string; type: string;
    width: number; height: number; size_bytes: number; taken_at: string;
    url?: string; thumbnail_url?: string;
}

interface GoogleSheet {
    id: string; name: string; modified_at: string; created_at: string;
    web_link: string; owner: string; shared: boolean;
}

interface YouTubeVideo {
    id: string; title: string; description: string; channel_title: string;
    published_at: string; thumbnail_url: string; view_count: number;
    like_count: number; web_link: string;
}

interface YouTubeChannel {
    id: string; title: string; thumbnail: string;
    subscriber_count: number; video_count: number; view_count: number;
}

interface YouTubeSub {
    id: string; channel_id: string; title: string;
    description: string; thumbnail_url: string;
}

type ServiceKey = 'calendar' | 'drive' | 'gmail' | 'contacts' | 'tasks' | 'photos' | 'sheets' | 'youtube';

interface SyncConfig {
    calendar_shift_sync: boolean;
    calendar_leave_sync: boolean;
    drive_payroll_auto_export: boolean;
    gmail_ai_enabled: boolean;
    sheets_auto_export: boolean;
}

const SERVICE_META: Record<ServiceKey, { label: string; icon: React.ElementType; color: string; description: string }> = {
    calendar: { label: 'Calendar', icon: Calendar, color: '#4285f4', description: 'View upcoming events' },
    drive: { label: 'Drive', icon: HardDrive, color: '#0f9d58', description: 'Access your files' },
    gmail: { label: 'Gmail', icon: Mail, color: '#ea4335', description: 'Recent emails' },
    contacts: { label: 'Contacts', icon: Contact, color: '#fbbc04', description: 'Your address book' },
    tasks: { label: 'Tasks', icon: CheckSquare, color: '#4285f4', description: 'To-do lists' },
    photos: { label: 'Photos', icon: ImageIcon, color: '#ea4335', description: 'Photo library' },
    sheets: { label: 'Sheets', icon: Table, color: '#0f9d58', description: 'Spreadsheets' },
    youtube: { label: 'YouTube', icon: Youtube, color: '#ff0000', description: 'Videos & channels' },
};

// ── Main Component ─────────────────────────────────────────────────────

export default function MyGooglePanel(): React.ReactElement {
    const { t } = useTranslation();

    // Connection
    const [status, setStatus] = useState<GoogleStatus | null>(null);
    const [connecting, setConnecting] = useState(false);
    const [syncing, setSyncing] = useState(false);

    // Service toggles
    const [enabledServices, setEnabledServices] = useState<ServiceKey[]>(['calendar', 'drive']);
    const [showSettings, setShowSettings] = useState(false);

    // Active tab
    const [activeTab, setActiveTab] = useState<ServiceKey>('calendar');

    // Data
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [files, setFiles] = useState<DriveFile[]>([]);
    const [messages, setMessages] = useState<GmailMessage[]>([]);
    const [contacts, setContacts] = useState<GoogleContact[]>([]);
    const [tasks, setTasks] = useState<GoogleTask[]>([]);
    const [photos, setPhotos] = useState<GooglePhoto[]>([]);
    const [sheets, setSheets] = useState<GoogleSheet[]>([]);
    const [ytVideos, setYtVideos] = useState<YouTubeVideo[]>([]);
    const [ytChannel, setYtChannel] = useState<YouTubeChannel | null>(null);
    const [ytSubs, setYtSubs] = useState<YouTubeSub[]>([]);

    // Loading
    const [loadingData, setLoadingData] = useState(false);

    // Sync config
    const [syncConfig, setSyncConfig] = useState<SyncConfig | null>(null);
    const [showSyncSettings, setShowSyncSettings] = useState(false);

    // Dialogs
    const [showNewEvent, setShowNewEvent] = useState(false);
    const [newEventTitle, setNewEventTitle] = useState('');
    const [newEventDesc, setNewEventDesc] = useState('');
    const [newEventStart, setNewEventStart] = useState('');
    const [newEventEnd, setNewEventEnd] = useState('');
    const [newEventLocation, setNewEventLocation] = useState('');

    const [showNewTask, setShowNewTask] = useState(false);
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [newTaskNotes, setNewTaskNotes] = useState('');

    // ── Fetch Status ────────────────────────────────────────────────────

    const fetchStatus = useCallback(async () => {
        try {
            const res = await api.get('/google/personal/status');
            if (res.data?.ok) setStatus(res.data);
        } catch {
            logger.error('Failed to fetch Google status');
        }
    }, []);

    const fetchServices = useCallback(async () => {
        try {
            const res = await api.get('/google/personal/services');
            if (res.data?.ok) {
                setEnabledServices(res.data.enabled || ['calendar', 'drive']);
            }
        } catch {
            logger.error('Failed to fetch services config');
        }
    }, []);

    // ── Fetch Data per service ──────────────────────────────────────────

    const fetchCalendar = useCallback(async () => {
        try {
            const res = await api.get('/google/personal/calendar/events');
            if (res.data?.ok) setEvents(res.data.data || []);
        } catch { /* silent */ }
    }, []);

    const fetchDrive = useCallback(async () => {
        try {
            const res = await api.get('/google/personal/drive/files');
            if (res.data?.ok) setFiles(res.data.data || []);
        } catch { /* silent */ }
    }, []);

    const fetchGmail = useCallback(async () => {
        try {
            const res = await api.get('/google/personal/gmail/messages');
            if (res.data?.ok) setMessages(res.data.data || []);
        } catch { /* silent */ }
    }, []);

    const fetchContacts = useCallback(async () => {
        try {
            const res = await api.get('/google/personal/contacts');
            if (res.data?.ok) setContacts(res.data.data || []);
        } catch { /* silent */ }
    }, []);

    const fetchTasks = useCallback(async () => {
        try {
            const res = await api.get('/google/personal/tasks');
            if (res.data?.ok) setTasks(res.data.data || []);
        } catch { /* silent */ }
    }, []);

    const fetchPhotos = useCallback(async () => {
        try {
            const res = await api.get('/google/personal/photos');
            if (res.data?.ok) setPhotos(res.data.data || []);
        } catch { /* silent */ }
    }, []);

    const fetchSheets = useCallback(async () => {
        try {
            const res = await api.get('/google/personal/sheets');
            if (res.data?.ok) setSheets(res.data.data || []);
        } catch { /* silent */ }
    }, []);

    const fetchYouTube = useCallback(async () => {
        try {
            const [vRes, sRes] = await Promise.all([
                api.get('/google/personal/youtube/videos'),
                api.get('/google/personal/youtube/subscriptions'),
            ]);
            if (vRes.data?.ok) {
                setYtVideos(vRes.data.data || []);
                setYtChannel(vRes.data.channel || null);
            }
            if (sRes.data?.ok) setYtSubs(sRes.data.data || []);
        } catch { /* silent */ }
    }, []);

    const fetchAllData = useCallback(async () => {
        setLoadingData(true);
        await Promise.all([
            fetchCalendar(), fetchDrive(), fetchGmail(),
            fetchContacts(), fetchTasks(), fetchPhotos(),
            fetchSheets(), fetchYouTube(),
        ]);
        setLoadingData(false);
    }, [fetchCalendar, fetchDrive, fetchGmail, fetchContacts, fetchTasks, fetchPhotos, fetchSheets, fetchYouTube]);

    const fetchSyncConfig = useCallback(async () => {
        try {
            const res = await api.get('/google/sync/config');
            if (res.data?.ok) setSyncConfig(res.data.config);
        } catch { /* silent */ }
    }, []);

    useEffect(() => {
        fetchStatus();
        fetchServices();

        // Check URL params for OAuth callback result
        const params = new URLSearchParams(window.location.search);
        if (params.get('connected') === 'true') {
            toast.success('Google Account connected successfully!');
            // Clean URL
            window.history.replaceState({}, '', window.location.pathname);
        }
        if (params.get('error')) {
            toast.error(`Connection failed: ${params.get('error')}`);
            window.history.replaceState({}, '', window.location.pathname);
        }
    }, [fetchStatus, fetchServices]);

    useEffect(() => {
        if (status?.connected) {
            fetchAllData();
            fetchSyncConfig();
        }
    }, [status?.connected, fetchAllData, fetchSyncConfig]);

    // Ensure active tab is an enabled service
    useEffect(() => {
        if (!enabledServices.includes(activeTab) && enabledServices.length > 0) {
            setActiveTab(enabledServices[0] as ServiceKey);
        }
    }, [enabledServices, activeTab]);

    // ── Actions ─────────────────────────────────────────────────────────

    const handleConnect = async () => {
        setConnecting(true);
        try {
            // Get the real Google OAuth URL from backend
            const res = await api.get('/google/personal/authorize');
            if (res.data?.ok && res.data?.url) {
                // Open Google OAuth in current window (redirect flow)
                window.location.href = res.data.url;
            } else {
                toast.error('Failed to get authorization URL');
            }
        } catch (err: unknown) {
            const errorMsg = err instanceof Error ? err.message : 'Failed to connect Google';
            toast.error(errorMsg);
            setConnecting(false);
        }
    };

    const handleDisconnect = async () => {
        try {
            await api.post('/google/personal/disconnect');
            setStatus({ connected: false });
            setEvents([]); setFiles([]); setMessages([]);
            setContacts([]); setTasks([]); setPhotos([]);
            toast.success('Google disconnected');
        } catch {
            toast.error('Failed to disconnect');
        }
    };

    const handleSync = async () => {
        setSyncing(true);
        await fetchAllData();
        setSyncing(false);
        toast.success('Data synced');
    };

    const handleToggleService = async (service: ServiceKey) => {
        const next = enabledServices.includes(service)
            ? enabledServices.filter(s => s !== service)
            : [...enabledServices, service];
        setEnabledServices(next);
        try {
            await api.put('/google/personal/services', { services: next });
        } catch {
            toast.error('Failed to save');
        }
    };

    const handleCreateEvent = async () => {
        if (!newEventTitle.trim()) return;
        try {
            await api.post('/google/personal/calendar/events', {
                title: newEventTitle, description: newEventDesc,
                start_time: newEventStart || new Date().toISOString(),
                end_time: newEventEnd || new Date().toISOString(),
                location: newEventLocation,
            });
            toast.success('Event created');
            setShowNewEvent(false);
            setNewEventTitle(''); setNewEventDesc(''); setNewEventStart(''); setNewEventEnd(''); setNewEventLocation('');
            fetchCalendar();
        } catch {
            toast.error('Failed to create event');
        }
    };

    const handleDeleteEvent = async (id: string) => {
        try {
            await api.delete(`/google/personal/calendar/events/${id}`);
            setEvents(prev => prev.filter(e => e.id !== id));
            toast.success('Event deleted');
        } catch {
            toast.error('Failed to delete');
        }
    };

    const handleCreateTask = async () => {
        if (!newTaskTitle.trim()) return;
        try {
            await api.post('/google/personal/tasks', { title: newTaskTitle, notes: newTaskNotes });
            toast.success('Task created');
            setShowNewTask(false);
            setNewTaskTitle(''); setNewTaskNotes('');
            fetchTasks();
        } catch {
            toast.error('Failed to create task');
        }
    };

    const handleToggleTask = async (id: string) => {
        try {
            await api.patch(`/google/personal/tasks/${id}`);
            setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
        } catch {
            toast.error('Failed to update task');
        }
    };

    const handleDeleteFile = async (id: string) => {
        try {
            await api.delete(`/google/personal/drive/files/${id}`);
            setFiles(prev => prev.filter(f => f.id !== id));
            toast.success('File deleted');
        } catch {
            toast.error('Failed to delete');
        }
    };

    // ── Gmail Actions ───────────────────────────────────────────────────

    const handleGmailAction = async (messageId: string, action: string) => {
        try {
            const res = await api.post('/google/sync/gmail/action', { message_id: messageId, action });
            if (res.data?.ok) {
                if (action === 'star') setMessages(prev => prev.map(m => m.id === messageId ? { ...m, starred: true } : m));
                else if (action === 'unstar') setMessages(prev => prev.map(m => m.id === messageId ? { ...m, starred: false } : m));
                else if (action === 'mark_read') setMessages(prev => prev.map(m => m.id === messageId ? { ...m, read: true } : m));
                else if (action === 'archive' || action === 'trash') setMessages(prev => prev.filter(m => m.id !== messageId));
                toast.success(`Email ${action === 'trash' ? 'trashed' : action === 'archive' ? 'archived' : 'updated'}`);
            }
        } catch { toast.error('Action failed'); }
    };

    // ── Sync Config ─────────────────────────────────────────────────────

    const toggleSyncSetting = async (key: keyof SyncConfig) => {
        if (!syncConfig) return;
        const newVal = !syncConfig[key];
        setSyncConfig({ ...syncConfig, [key]: newVal });
        try {
            await api.put('/google/sync/config', { [key]: newVal });
            toast.success(`${key.replace(/_/g, ' ')} ${newVal ? 'enabled' : 'disabled'}`);
        } catch { toast.error('Failed to save'); }
    };

    // ── Export to Sheets ─────────────────────────────────────────────────

    const handleExportToSheets = async (type: string) => {
        try {
            const res = await api.post('/google/sync/sheets/export', { type });
            if (res.data?.ok) {
                toast.success('Exported to Google Sheets');
                if (res.data.sheet?.url) window.open(res.data.sheet.url, '_blank');
            } else {
                toast.error(res.data?.error || 'Export failed');
            }
        } catch { toast.error('Export failed'); }
    };

    // ── Helpers ─────────────────────────────────────────────────────────

    const formatTime = (iso: string): string => {
        try {
            return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Malta' });
        } catch { return ''; }
    };

    const formatDate = (iso: string): string => {
        try {
            return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'Europe/Malta' });
        } catch { return ''; }
    };

    const formatRelative = (iso: string): string => {
        try {
            const diff = Date.now() - new Date(iso).getTime();
            const mins = Math.floor(diff / 60000);
            if (mins < 60) return `${mins}m ago`;
            const hrs = Math.floor(mins / 60);
            if (hrs < 24) return `${hrs}h ago`;
            const days = Math.floor(hrs / 24);
            return `${days}d ago`;
        } catch { return ''; }
    };

    const formatSize = (bytes: number): string => {
        if (bytes === 0) return '—';
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const getDriveIcon = (type: string): React.ReactElement => {
        const cls = "h-4 w-4";
        switch (type) {
            case 'doc': return <FileText className={cn(cls, "text-blue-400")} />;
            case 'sheet': return <FileSpreadsheet className={cn(cls, "text-green-400")} />;
            case 'slides': return <Presentation className={cn(cls, "text-yellow-400")} />;
            case 'pdf': return <FileText className={cn(cls, "text-red-400")} />;
            case 'folder': return <Folder className={cn(cls, "text-muted-foreground")} />;
            default: return <File className={cn(cls, "text-muted-foreground")} />;
        }
    };

    const priorityColor = (p: string): string => {
        if (p === 'high') return 'text-red-400';
        if (p === 'medium') return 'text-yellow-400';
        return 'text-muted-foreground';
    };

    const visibleTabs = useMemo(() =>
        enabledServices.filter(s => s in SERVICE_META) as ServiceKey[]
        , [enabledServices]);

    // ── Render ──────────────────────────────────────────────────────────

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                        <svg className="w-6 h-6" viewBox="0 0 24 24">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                        </svg>
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-zinc-900 dark:text-foreground tracking-tight uppercase">My Google</h1>
                        <p className="text-xs text-muted-foreground">Connect your personal Google account</p>
                    </div>
                </div>
                {status?.connected && (
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowSettings(!showSettings)}
                            className="border-border text-muted-foreground hover:text-foreground gap-1.5"
                        >
                            <Settings className="h-3.5 w-3.5" />
                            Services
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleSync}
                            disabled={syncing}
                            className="border-border text-muted-foreground hover:text-foreground gap-1.5"
                        >
                            <RefreshCw className={cn("h-3.5 w-3.5", syncing && "animate-spin")} />
                            Sync
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleDisconnect}
                            className="border-red-500/20 text-red-400 hover:bg-red-500/10 gap-1.5"
                        >
                            <Unlink className="h-3.5 w-3.5" />
                            Disconnect
                        </Button>
                    </div>
                )}
            </div>

            {/* Service Settings Panel */}
            {showSettings && status?.connected && (
                <div className="bg-card/50 border border-border rounded-2xl p-5 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="text-sm font-bold text-foreground">Google Services</h3>
                            <p className="text-xs text-muted-foreground mt-0.5">Choose which services to show</p>
                        </div>
                        <button onClick={() => setShowSettings(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                        {(Object.keys(SERVICE_META) as ServiceKey[]).map(key => {
                            const meta = SERVICE_META[key];
                            const Icon = meta.icon;
                            const enabled = enabledServices.includes(key);
                            return (
                                <button
                                    key={key}
                                    onClick={() => handleToggleService(key)}
                                    className={cn(
                                        "flex flex-col items-center gap-2 p-4 rounded-xl border transition-all duration-200",
                                        enabled
                                            ? "bg-white/5 border-white/20 shadow-lg"
                                            : "bg-card/30 border-border opacity-50 hover:opacity-75"
                                    )}
                                >
                                    <div
                                        className={cn(
                                            "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                                            enabled ? "bg-white/10" : "bg-secondary"
                                        )}
                                    >
                                        <Icon className="h-5 w-5" style={{ color: enabled ? meta.color : '#71717a' }} />
                                    </div>
                                    <span className={cn("text-xs font-bold", enabled ? "text-foreground" : "text-muted-foreground")}>{meta.label}</span>
                                    <div className={cn(
                                        "w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all",
                                        enabled ? "border-green-500 bg-green-500/20" : "border-border"
                                    )}>
                                        {enabled && <Check className="h-2.5 w-2.5 text-green-400" />}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Not Connected State */}
            {(!status || !status.connected) && (
                <div className="bg-card/50 border border-border rounded-2xl p-12 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-secondary/50 flex items-center justify-center">
                        <Link2 className="h-8 w-8 text-muted-foreground rotate-45" />
                    </div>
                    <h2 className="text-lg font-black text-foreground uppercase tracking-wide mb-2">No Google Account Connected</h2>
                    <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
                        Link your Google account to manage Calendar, Drive, Gmail, Contacts, Tasks, Photos, Sheets and YouTube right here in Restin.ai.
                    </p>
                    <Button
                        onClick={handleConnect}
                        disabled={connecting}
                        className="bg-red-600 hover:bg-red-500 text-foreground font-bold px-6 gap-2"
                    >
                        <Link2 className="h-4 w-4" />
                        {connecting ? 'Connecting...' : 'Connect Google Account'}
                    </Button>
                </div>
            )}

            {/* Connected: Tabs + Content */}
            {status?.connected && (
                <>
                    {/* Connected info bar */}
                    <div className="flex items-center gap-3 px-4 py-2.5 bg-green-500/5 border border-green-500/10 rounded-xl">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-xs text-green-400 font-medium">Connected as {status.email}</span>
                        {status.connected_at && (
                            <span className="text-xs text-muted-foreground ml-auto">since {formatDate(status.connected_at)}</span>
                        )}
                    </div>

                    {/* Tab Bar */}
                    <div className="flex items-center gap-1 bg-card/50 border border-border rounded-xl p-1 overflow-x-auto">
                        {visibleTabs.map(key => {
                            const meta = SERVICE_META[key];
                            const Icon = meta.icon;
                            const active = activeTab === key;
                            // Badge counts
                            let badge = 0;
                            if (key === 'gmail') badge = messages.filter(m => !m.read).length;
                            if (key === 'tasks') badge = tasks.filter(t => !t.completed).length;

                            return (
                                <button
                                    key={key}
                                    onClick={() => setActiveTab(key)}
                                    className={cn(
                                        "flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap",
                                        active
                                            ? "bg-white/10 text-foreground shadow-lg"
                                            : "text-muted-foreground hover:text-secondary-foreground hover:bg-white/5"
                                    )}
                                >
                                    <Icon className="h-3.5 w-3.5" style={{ color: active ? meta.color : undefined }} />
                                    {meta.label}
                                    {badge > 0 && (
                                        <span className="ml-1 px-1.5 py-0.5 text-[10px] font-black bg-red-500 text-foreground rounded-full leading-none">{badge}</span>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* Loading */}
                    {loadingData && (
                        <div className="flex items-center justify-center py-12">
                            <RefreshCw className="h-6 w-6 text-muted-foreground animate-spin" />
                        </div>
                    )}

                    {/* ── Calendar Tab ───────────────────────────────────────────── */}
                    {!loadingData && activeTab === 'calendar' && (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Upcoming Events ({events.length})</h3>
                                <Button size="sm" variant="outline" onClick={() => setShowNewEvent(!showNewEvent)} className="border-border text-muted-foreground hover:text-foreground gap-1 text-xs">
                                    <Plus className="h-3 w-3" /> New Event
                                </Button>
                            </div>
                            {showNewEvent && (
                                <div className="bg-card/50 border border-border rounded-xl p-4 space-y-3 animate-in fade-in duration-200">
                                    <input value={newEventTitle} onChange={e => setNewEventTitle(e.target.value)} placeholder="Event title" className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-blue-500/30" />
                                    <textarea value={newEventDesc} onChange={e => setNewEventDesc(e.target.value)} placeholder="Description" rows={2} className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-blue-500/30 resize-none" />
                                    <div className="grid grid-cols-2 gap-3">
                                        <input type="datetime-local" value={newEventStart} onChange={e => setNewEventStart(e.target.value)} className="bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-blue-500/30" />
                                        <input type="datetime-local" value={newEventEnd} onChange={e => setNewEventEnd(e.target.value)} className="bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-blue-500/30" />
                                    </div>
                                    <input value={newEventLocation} onChange={e => setNewEventLocation(e.target.value)} placeholder="Location" className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-blue-500/30" />
                                    <div className="flex gap-2 justify-end">
                                        <Button size="sm" variant="ghost" onClick={() => setShowNewEvent(false)} className="text-muted-foreground">Cancel</Button>
                                        <Button size="sm" onClick={handleCreateEvent} className="bg-blue-600 hover:bg-blue-500 text-foreground">Create</Button>
                                    </div>
                                </div>
                            )}
                            {events.length === 0 && <div className="text-center py-8 text-muted-foreground text-sm">No upcoming events</div>}
                            {events.map(ev => (
                                <div key={ev.id} className="group flex items-start gap-3 p-3 bg-card/30 border border-border rounded-xl hover:border-border transition-all">
                                    <div className="mt-1.5 h-3 w-3 rounded-full flex-shrink-0" style={{ backgroundColor: ev.color || '#4285f4' }} />
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-bold text-foreground truncate">{ev.title}</div>
                                        {ev.description && <div className="text-xs text-muted-foreground truncate mt-0.5">{ev.description}</div>}
                                        <div className="flex items-center gap-3 mt-1.5">
                                            <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> {formatTime(ev.start_time)} – {formatTime(ev.end_time)}</span>
                                            {ev.location && <span className="text-[10px] text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" /> {ev.location}</span>}
                                            <span className="text-[10px] text-zinc-700 bg-secondary/60 px-1.5 py-0.5 rounded">{ev.calendar_name}</span>
                                        </div>
                                    </div>
                                    <button onClick={() => handleDeleteEvent(ev.id)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-400 transition-all">
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* ── Drive Tab ──────────────────────────────────────────────── */}
                    {!loadingData && activeTab === 'drive' && (
                        <div className="space-y-3">
                            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Recent Files ({files.length})</h3>
                            {files.length === 0 && <div className="text-center py-8 text-muted-foreground text-sm">No files</div>}
                            <div className="divide-y divide-white/5">
                                {files.map(file => (
                                    <div
                                        key={file.id}
                                        className="group flex items-center gap-3 px-3 py-3 hover:bg-white/5 rounded-lg transition-all cursor-pointer"
                                        onClick={() => file.web_link && file.web_link !== '#' ? window.open(file.web_link, '_blank') : null}
                                    >
                                        {getDriveIcon(file.icon_type)}
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-semibold text-foreground truncate">{file.name}</div>
                                            <div className="text-[10px] text-muted-foreground">{file.folder} · {formatSize(file.size_bytes)} · {formatRelative(file.modified_at)}</div>
                                        </div>
                                        {file.shared_with.length > 0 && (
                                            <span className="text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded flex items-center gap-1"><Users className="h-2.5 w-2.5" /> {file.shared_with.length}</span>
                                        )}
                                        <ChevronRight className="h-4 w-4 text-zinc-700 group-hover:text-muted-foreground transition-colors" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ── Gmail Tab ──────────────────────────────────────────────── */}
                    {!loadingData && activeTab === 'gmail' && (
                        <div className="space-y-3">
                            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                                Inbox ({messages.length}) · {messages.filter(m => !m.read).length} unread
                            </h3>
                            {messages.length === 0 && <div className="text-center py-8 text-muted-foreground text-sm">No messages</div>}
                            {messages.map(msg => (
                                <div
                                    key={msg.id}
                                    className={cn(
                                        "group flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer",
                                        msg.read
                                            ? "bg-card/20 border-border hover:border-border"
                                            : "bg-blue-500/5 border-blue-500/10 hover:border-blue-500/20"
                                    )}
                                    onClick={() => window.open(`https://mail.google.com/mail/u/0/#inbox/${msg.id}`, '_blank')}
                                >
                                    <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black flex-shrink-0", msg.read ? "bg-secondary text-muted-foreground" : "bg-blue-500/10 text-blue-400")}>
                                        {msg.from_name.charAt(0)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className={cn("text-sm font-bold truncate", msg.read ? "text-muted-foreground" : "text-foreground")}>{msg.from_name}</span>
                                            <span className="text-[10px] text-muted-foreground flex-shrink-0">{formatRelative(msg.date)}</span>
                                        </div>
                                        <div className={cn("text-sm truncate", msg.read ? "text-muted-foreground" : "text-secondary-foreground font-medium")}>{msg.subject}</div>
                                        <div className="text-xs text-muted-foreground truncate mt-0.5">{msg.snippet}</div>
                                        <div className="flex items-center gap-2 mt-1.5">
                                            {msg.has_attachment && <Paperclip className="h-3 w-3 text-muted-foreground" />}
                                            {msg.labels.includes('important') && <span className="text-[9px] font-bold text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded">IMPORTANT</span>}
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-center gap-1 flex-shrink-0 mt-1">
                                        <button onClick={(e) => { e.stopPropagation(); handleGmailAction(msg.id, msg.starred ? 'unstar' : 'star'); }} className="text-muted-foreground hover:text-yellow-400 transition-colors">
                                            {msg.starred ? <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" /> : <StarOff className="h-3.5 w-3.5" />}
                                        </button>
                                        {!msg.read && (
                                            <button onClick={(e) => { e.stopPropagation(); handleGmailAction(msg.id, 'mark_read'); }} className="text-muted-foreground hover:text-blue-400 transition-colors" title="Mark read">
                                                <MailOpen className="h-3.5 w-3.5" />
                                            </button>
                                        )}
                                        <button onClick={(e) => { e.stopPropagation(); handleGmailAction(msg.id, 'archive'); }} className="text-muted-foreground hover:text-green-400 transition-colors" title="Archive">
                                            <Archive className="h-3.5 w-3.5" />
                                        </button>
                                        <button onClick={(e) => { e.stopPropagation(); handleGmailAction(msg.id, 'trash'); }} className="text-muted-foreground hover:text-red-400 transition-colors" title="Trash">
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* ── Contacts Tab ───────────────────────────────────────────── */}
                    {!loadingData && activeTab === 'contacts' && (
                        <div className="space-y-3">
                            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Contacts ({contacts.length})</h3>
                            {contacts.length === 0 && <div className="text-center py-8 text-muted-foreground text-sm">No contacts</div>}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {contacts.map(c => (
                                    <div key={c.id} className="flex items-start gap-3 p-3 bg-card/30 border border-border rounded-xl hover:border-border transition-all">
                                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black text-foreground flex-shrink-0" style={{ backgroundColor: c.avatar_color }}>
                                            {c.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-bold text-foreground">{c.name}</div>
                                            {(c.company || c.role) && <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5"><Building2 className="h-3 w-3" /> {[c.company, c.role].filter(Boolean).join(' · ')}</div>}
                                            <div className="flex items-center gap-3 mt-1.5">
                                                {c.email && (
                                                    <a href={`mailto:${c.email}`} onClick={(e) => e.stopPropagation()} className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors">
                                                        <Mail className="h-2.5 w-2.5" /> {c.email}
                                                    </a>
                                                )}
                                                {c.phone && (
                                                    <a href={`tel:${c.phone}`} onClick={(e) => e.stopPropagation()} className="text-[10px] text-green-400 hover:text-green-300 flex items-center gap-1 transition-colors">
                                                        <Phone className="h-2.5 w-2.5" /> {c.phone}
                                                    </a>
                                                )}
                                            </div>
                                            {c.notes && <div className="text-[10px] text-zinc-700 mt-1 italic">{c.notes}</div>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ── Tasks Tab ──────────────────────────────────────────────── */}
                    {!loadingData && activeTab === 'tasks' && (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                                    Tasks ({tasks.length}) · {tasks.filter(t => !t.completed).length} pending
                                </h3>
                                <Button size="sm" variant="outline" onClick={() => setShowNewTask(!showNewTask)} className="border-border text-muted-foreground hover:text-foreground gap-1 text-xs">
                                    <Plus className="h-3 w-3" /> New Task
                                </Button>
                            </div>
                            {showNewTask && (
                                <div className="bg-card/50 border border-border rounded-xl p-4 space-y-3 animate-in fade-in duration-200">
                                    <input value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)} placeholder="Task title" className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-blue-500/30" />
                                    <textarea value={newTaskNotes} onChange={e => setNewTaskNotes(e.target.value)} placeholder="Notes (optional)" rows={2} className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-blue-500/30 resize-none" />
                                    <div className="flex gap-2 justify-end">
                                        <Button size="sm" variant="ghost" onClick={() => setShowNewTask(false)} className="text-muted-foreground">Cancel</Button>
                                        <Button size="sm" onClick={handleCreateTask} className="bg-blue-600 hover:bg-blue-500 text-foreground">Create</Button>
                                    </div>
                                </div>
                            )}
                            {tasks.length === 0 && <div className="text-center py-8 text-muted-foreground text-sm">No tasks</div>}
                            {tasks.map(task => (
                                <div key={task.id} className={cn(
                                    "group flex items-start gap-3 p-3 rounded-xl border transition-all",
                                    task.completed ? "bg-card/20 border-border opacity-60" : "bg-card/30 border-border hover:border-border"
                                )}>
                                    <button onClick={() => handleToggleTask(task.id)} className="mt-0.5 flex-shrink-0">
                                        {task.completed
                                            ? <Check className="h-4 w-4 text-green-500" />
                                            : <Circle className="h-4 w-4 text-muted-foreground hover:text-blue-400 transition-colors" />
                                        }
                                    </button>
                                    <div className="flex-1 min-w-0">
                                        <div className={cn("text-sm font-bold", task.completed ? "text-muted-foreground line-through" : "text-foreground")}>{task.title}</div>
                                        {task.notes && <div className="text-xs text-muted-foreground mt-0.5">{task.notes}</div>}
                                        <div className="flex items-center gap-3 mt-1.5">
                                            <span className="text-[10px] text-zinc-700 bg-secondary/60 px-1.5 py-0.5 rounded">{task.task_list}</span>
                                            <span className={cn("text-[10px] font-bold uppercase", priorityColor(task.priority))}>{task.priority}</span>
                                            {task.due_date && (
                                                <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Clock className="h-2.5 w-2.5" /> {formatDate(task.due_date)}</span>
                                            )}
                                        </div>
                                    </div>
                                    <button onClick={() => handleToggleTask(task.id)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-400 transition-all">
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* ── Photos Tab ─────────────────────────────────────────────── */}
                    {!loadingData && activeTab === 'photos' && (
                        <div className="space-y-3">
                            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                                Photos ({photos.length}) · {Array.from(new Set(photos.map(p => p.album))).length} albums
                            </h3>
                            {photos.length === 0 && <div className="text-center py-8 text-muted-foreground text-sm">No photos</div>}
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                {photos.map(photo => (
                                    <div key={photo.id} className="group relative bg-secondary/50 border border-border rounded-xl overflow-hidden hover:border-border transition-all aspect-[4/3]">
                                        {/* Placeholder since mock has no real images */}
                                        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-900 p-4">
                                            <Image className="h-8 w-8 text-zinc-700 mb-2" />
                                            <span className="text-xs font-medium text-muted-foreground text-center leading-tight">{photo.name}</span>
                                        </div>
                                        {/* Overlay on hover */}
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex flex-col justify-end p-3">
                                            <div className="text-xs font-bold text-foreground truncate">{photo.name}</div>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-[10px] text-muted-foreground">{photo.album}</span>
                                                <span className="text-[10px] text-muted-foreground">{formatSize(photo.size_bytes)}</span>
                                                <span className="text-[10px] text-muted-foreground">{formatRelative(photo.taken_at)}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ── Sheets Tab ────────────────────────────────────────────── */}
                    {!loadingData && activeTab === 'sheets' && (
                        <div className="space-y-3">
                            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Spreadsheets ({sheets.length})</h3>
                            {sheets.length === 0 && <div className="text-center py-8 text-muted-foreground text-sm">No spreadsheets</div>}
                            <div className="divide-y divide-white/5">
                                {sheets.map(sheet => (
                                    <div
                                        key={sheet.id}
                                        className="group flex items-center gap-3 px-3 py-3 hover:bg-white/5 rounded-lg transition-all cursor-pointer"
                                        onClick={() => window.open(sheet.web_link, '_blank')}
                                    >
                                        <div className="w-9 h-9 rounded-lg bg-green-500/10 flex items-center justify-center flex-shrink-0">
                                            <Table className="h-4.5 w-4.5 text-green-400" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-semibold text-foreground truncate">{sheet.name}</div>
                                            <div className="text-[10px] text-muted-foreground">
                                                {sheet.owner && <span>{sheet.owner} · </span>}
                                                {formatRelative(sheet.modified_at)}
                                                {sheet.shared && <span className="ml-2 text-blue-400">· Shared</span>}
                                            </div>
                                        </div>
                                        <ExternalLink className="h-4 w-4 text-zinc-700 group-hover:text-green-400 transition-colors" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ── YouTube Tab ───────────────────────────────────────────── */}
                    {!loadingData && activeTab === 'youtube' && (
                        <div className="space-y-4">
                            {/* Channel Info */}
                            {ytChannel && (
                                <div className="flex items-center gap-4 p-4 bg-card/40 border border-border rounded-xl">
                                    {ytChannel.thumbnail && (
                                        <img src={ytChannel.thumbnail} alt={ytChannel.title} className="w-12 h-12 rounded-full" />
                                    )}
                                    <div className="flex-1">
                                        <div className="text-sm font-bold text-foreground">{ytChannel.title}</div>
                                        <div className="flex items-center gap-4 mt-1">
                                            <span className="text-[10px] text-muted-foreground">{ytChannel.subscriber_count.toLocaleString()} subscribers</span>
                                            <span className="text-[10px] text-muted-foreground">{ytChannel.video_count} videos</span>
                                            <span className="text-[10px] text-muted-foreground">{ytChannel.view_count.toLocaleString()} views</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Liked Videos */}
                            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Liked Videos ({ytVideos.length})</h3>
                            {ytVideos.length === 0 && <div className="text-center py-8 text-muted-foreground text-sm">No liked videos</div>}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {ytVideos.map(video => (
                                    <div
                                        key={video.id}
                                        className="group bg-card/30 border border-border rounded-xl overflow-hidden hover:border-border transition-all cursor-pointer"
                                        onClick={() => window.open(video.web_link, '_blank')}
                                    >
                                        {video.thumbnail_url && (
                                            <div className="relative">
                                                <img src={video.thumbnail_url} alt={video.title} className="w-full aspect-video object-cover" />
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                    <Youtube className="h-10 w-10 text-red-500" />
                                                </div>
                                            </div>
                                        )}
                                        <div className="p-3">
                                            <div className="text-sm font-semibold text-foreground line-clamp-2">{video.title}</div>
                                            <div className="text-xs text-muted-foreground mt-1">{video.channel_title}</div>
                                            <div className="flex items-center gap-3 mt-2">
                                                <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Eye className="h-2.5 w-2.5" /> {video.view_count.toLocaleString()}</span>
                                                <span className="text-[10px] text-muted-foreground flex items-center gap-1"><ThumbsUp className="h-2.5 w-2.5" /> {video.like_count.toLocaleString()}</span>
                                                <span className="text-[10px] text-muted-foreground">{formatRelative(video.published_at)}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Subscriptions */}
                            {ytSubs.length > 0 && (
                                <>
                                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-4">Subscriptions ({ytSubs.length})</h3>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                        {ytSubs.map(sub => (
                                            <div
                                                key={sub.id}
                                                className="flex flex-col items-center gap-2 p-3 bg-card/30 border border-border rounded-xl hover:border-border transition-all cursor-pointer"
                                                onClick={() => window.open(`https://www.youtube.com/channel/${sub.channel_id}`, '_blank')}
                                            >
                                                {sub.thumbnail_url && (
                                                    <img src={sub.thumbnail_url} alt={sub.title} className="w-12 h-12 rounded-full" />
                                                )}
                                                <div className="text-xs font-semibold text-foreground text-center truncate w-full">{sub.title}</div>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </>
            )}

            {/* ── Sync Settings Panel ─────────────────────────────────── */}
            {status?.connected && (
                <div className="mt-6">
                    <button
                        onClick={() => setShowSyncSettings(!showSyncSettings)}
                        className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <Zap className="h-3.5 w-3.5" />
                        <span className="font-bold uppercase tracking-widest">Sync Settings</span>
                        <ChevronRight className={cn("h-3.5 w-3.5 transition-transform", showSyncSettings && "rotate-90")} />
                    </button>

                    {showSyncSettings && syncConfig && (
                        <div className="mt-3 bg-card/50 border border-border rounded-2xl p-5 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                            <p className="text-xs text-muted-foreground">Control how Restin.ai syncs with your Google account. Changes take effect immediately.</p>

                            {[
                                { key: 'calendar_shift_sync' as keyof SyncConfig, label: 'Shift → Calendar', desc: 'Auto-create calendar events when shifts are assigned to you', icon: Calendar, color: '#4285f4' },
                                { key: 'calendar_leave_sync' as keyof SyncConfig, label: 'Leave → Calendar', desc: 'Auto-add leave days to your calendar when approved', icon: Calendar, color: '#0f9d58' },
                                { key: 'drive_payroll_auto_export' as keyof SyncConfig, label: 'Payroll → Drive', desc: 'Auto-export payroll reports to Google Drive monthly', icon: HardDrive, color: '#0f9d58' },
                                { key: 'sheets_auto_export' as keyof SyncConfig, label: 'Data → Sheets', desc: 'Enable one-click export of inventory/roster data to Sheets', icon: Table, color: '#0f9d58' },
                            ].map(item => {
                                const Icon = item.icon;
                                const enabled = syncConfig[item.key];
                                return (
                                    <div key={item.key} className="flex items-center gap-4 py-2">
                                        <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center">
                                            <Icon className="h-4 w-4" style={{ color: item.color }} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-bold text-foreground">{item.label}</div>
                                            <div className="text-xs text-muted-foreground">{item.desc}</div>
                                        </div>
                                        <button
                                            onClick={() => toggleSyncSetting(item.key)}
                                            className="flex-shrink-0"
                                        >
                                            {enabled
                                                ? <ToggleRight className="h-7 w-7 text-green-500" />
                                                : <ToggleLeft className="h-7 w-7 text-muted-foreground" />
                                            }
                                        </button>
                                    </div>
                                );
                            })}

                            {/* Quick export buttons */}
                            <div className="border-t border-border pt-4">
                                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">Quick Export to Sheets</h4>
                                <div className="flex flex-wrap gap-2">
                                    <Button size="sm" variant="outline" onClick={() => handleExportToSheets('inventory')} className="border-border text-muted-foreground hover:text-foreground gap-1.5 text-xs">
                                        <Upload className="h-3 w-3" /> Inventory
                                    </Button>
                                    <Button size="sm" variant="outline" onClick={() => handleExportToSheets('roster')} className="border-border text-muted-foreground hover:text-foreground gap-1.5 text-xs">
                                        <Upload className="h-3 w-3" /> Roster
                                    </Button>
                                    <Button size="sm" variant="outline" onClick={() => handleExportToSheets('recipe_costs')} className="border-border text-muted-foreground hover:text-foreground gap-1.5 text-xs">
                                        <Upload className="h-3 w-3" /> Recipe Costs
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
