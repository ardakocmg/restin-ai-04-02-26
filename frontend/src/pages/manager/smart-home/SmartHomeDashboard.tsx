import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Power, Wifi, WifiOff, Zap, DoorOpen, DoorClosed, Shield, Droplets,
    Flame, Radio, RefreshCw, ChevronRight, Activity, Home, AlertTriangle,
    CheckCircle2, XCircle, ToggleLeft, ToggleRight, Loader2, Plug, Server,
    CloudOff, Cloud, Music, SkipBack, SkipForward, Play, Pause, Volume2, Shuffle, Repeat, List
} from 'lucide-react';
import api from '../../../lib/api';

// ─── Types ──────────────────────────────────────────────────────────────
interface SmartDevice {
    name: string;
    uuid: string;
    type: string;
    online: boolean;
    is_on: boolean | null;
    firmware: string | null;
    hardware: string | null;
    device_category: string;
    provider?: string;
    last_synced?: string;
    playback?: {
        is_playing: boolean;
        track_name: string;
        artist: string;
        album_name: string;
        album_art: string | null;
        duration_ms: number;
        progress_ms: number;
        volume_percent: number;
        shuffle: boolean;
        repeat: string;
        playlist_uri: string;
    };
}

interface DevicesResponse {
    total: number;
    online: number;
    offline: number;
    devices: SmartDevice[];
    syncing?: boolean;
    last_sync_error?: string | null;
}

// ─── Category Helpers ───────────────────────────────────────────────────
const CATEGORY_CONFIG: Record<string, { icon: React.ElementType; gradient: string; glow: string; label: string }> = {
    plug: { icon: Plug, gradient: 'from-emerald-500 to-teal-600', glow: 'rgba(16,185,129,0.4)', label: 'Smart Plug' },
    surge_protector: { icon: Zap, gradient: 'from-amber-500 to-orange-600', glow: 'rgba(245,158,11,0.4)', label: 'Surge Protector' },
    gate: { icon: DoorOpen, gradient: 'from-blue-500 to-indigo-600', glow: 'rgba(59,130,246,0.4)', label: 'Smart Gate' },
    hub: { icon: Server, gradient: 'from-purple-500 to-violet-600', glow: 'rgba(139,92,246,0.4)', label: 'Smart Hub' },
    leak_sensor: { icon: Droplets, gradient: 'from-cyan-500 to-blue-600', glow: 'rgba(6,182,212,0.4)', label: 'Leak Sensor' },
    smoke_alarm: { icon: Flame, gradient: 'from-red-500 to-rose-600', glow: 'rgba(239,68,68,0.4)', label: 'Smoke Alarm' },
    door_sensor: { icon: DoorClosed, gradient: 'from-sky-500 to-blue-600', glow: 'rgba(14,165,233,0.4)', label: 'Door Sensor' },
    bulb: { icon: Zap, gradient: 'from-yellow-400 to-amber-500', glow: 'rgba(250,204,21,0.4)', label: 'Smart Bulb' },
    music_player: { icon: Music, gradient: 'from-green-500 to-emerald-600', glow: 'rgba(34,197,94,0.5)', label: 'Music Player' },
    unknown: { icon: Radio, gradient: 'from-zinc-500 to-zinc-700', glow: 'rgba(113,113,122,0.3)', label: 'Device' },
};

function getCategoryConfig(category: string) {
    return CATEGORY_CONFIG[category] || CATEGORY_CONFIG.unknown;
}

// ─── Stat Card ──────────────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, gradient, delay }: { label: string; value: number; icon: React.ElementType; gradient: string; delay: number }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay }}
            className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-card/60 backdrop-blur-xl p-6"
        >
            {/* eslint-disable-next-line react/forbid-dom-props */}
            <div className="absolute inset-0 opacity-[0.03]" style={{ background: `linear-gradient(135deg, ${gradient})` }} /> /* keep-inline */ /* keep-inline */
            <div className="relative flex items-center gap-4">
                <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg`}>
                    <Icon className="h-6 w-6 text-foreground" />
                </div>
                <div>
                    <p className="text-3xl font-black text-foreground tabular-nums">{value}</p>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-0.5">{label}</p>
                </div>
            </div>
        </motion.div>
    );
}

// ─── Power Toggle Button ────────────────────────────────────────────────
function PowerToggle({ isOn, loading, onClick }: { isOn: boolean; loading: boolean; onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            disabled={loading}
            className={`
        relative h-8 w-16 rounded-full transition-all duration-500 ease-out
        ${isOn
                    ? 'bg-gradient-to-r from-emerald-500 to-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.5)]'
                    : 'bg-secondary border border-border'
                }
      `}
        >
            <motion.div
                className={`
          absolute top-1 h-6 w-6 rounded-full flex items-center justify-center
          ${isOn ? 'bg-white shadow-lg' : 'bg-zinc-600'}
        `}
                animate={{ left: isOn ? '2.25rem' : '0.25rem' }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            >
                {loading ? (
                    <Loader2 className="h-3 w-3 animate-spin text-zinc-800" />
                ) : isOn ? (
                    <Power className="h-3 w-3 text-emerald-600" />
                ) : (
                    <Power className="h-3 w-3 text-muted-foreground" />
                )}
            </motion.div>
        </button>
    );
}

// ─── Gate Control Button ────────────────────────────────────────────────
function GateControl({ loading, onOpen, onClose }: { loading: boolean; onOpen: () => void; onClose: () => void }) {
    return (
        <div className="flex gap-2">
            <button
                onClick={onOpen}
                disabled={loading}
                className="flex-1 h-10 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 text-foreground text-xs font-bold uppercase tracking-wider 
          hover:shadow-[0_0_20px_rgba(59,130,246,0.4)] active:scale-95 transition-all duration-200 flex items-center justify-center gap-1.5
          disabled:opacity-50"
            >
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <DoorOpen className="h-3.5 w-3.5" />}
                Open
            </button>
            <button
                onClick={onClose}
                disabled={loading}
                className="flex-1 h-10 rounded-xl bg-secondary border border-border text-secondary-foreground text-xs font-bold uppercase tracking-wider 
          hover:bg-secondary/80 active:scale-95 transition-all duration-200 flex items-center justify-center gap-1.5
          disabled:opacity-50"
            >
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <DoorClosed className="h-3.5 w-3.5" />}
                Close
            </button>
        </div>
    );
}

// ─── Sensor Status Badge ────────────────────────────────────────────────
function SensorBadge({ type, online }: { type: 'leak' | 'smoke' | 'door'; online: boolean }) {
    const configs = {
        leak: { safe: 'No Leak Detected', danger: 'Leak Alert!', safeColor: 'emerald', dangerColor: 'red' },
        smoke: { safe: 'Air Quality OK', danger: 'Smoke Alert!', safeColor: 'emerald', dangerColor: 'red' },
        door: { safe: 'Closed', danger: 'Open', safeColor: 'blue', dangerColor: 'amber' },
    };
    const cfg = configs[type];
    const isSafe = online;

    return (
        <div className={`
      flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider
      ${isSafe
                ? `bg-${cfg.safeColor}-500/10 text-${cfg.safeColor}-400 border border-${cfg.safeColor}-500/20`
                : `bg-${cfg.dangerColor}-500/10 text-${cfg.dangerColor}-400 border border-${cfg.dangerColor}-500/20`
            }
    `}>
            <div className={`h-2 w-2 rounded-full ${isSafe ? 'bg-emerald-400' : 'bg-red-400 animate-pulse'}`} />
            {isSafe ? cfg.safe : cfg.danger}
        </div>
    );
}

// ─── Music Player Controls ──────────────────────────────────────────────
function MusicPlayerControls({ device, onControl }: {
    device: SmartDevice;
    onControl: (uuid: string, command: string, channel?: number) => Promise<void>;
}) {
    const [loading, setLoading] = useState(false);
    const [localVolume, setLocalVolume] = useState(device.playback?.volume_percent ?? 50);
    const pb = device.playback;
    const isPlaying = pb?.is_playing ?? false;

    const send = async (cmd: string) => {
        setLoading(true);
        try { await onControl(device.uuid, cmd); } finally { setLoading(false); }
    };

    const handleVolume = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const vol = parseInt(e.target.value, 10);
        setLocalVolume(vol);
        try {
            await api.post('/spotify/volume', { volume_percent: vol, device_id: device.uuid });
        } catch { /* silent */ }
    };

    return (
        <div className="space-y-3">
            {/* Now Playing */}
            {pb?.track_name && (
                <div className="flex items-center gap-3">
                    {pb.album_art && (
                        <img
                            src={pb.album_art}
                            alt={pb.album_name}
                            className="h-12 w-12 rounded-lg object-cover shadow-lg ring-1 ring-white/10"
                        />
                    )}
                    <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-foreground truncate">{pb.track_name}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{pb.artist}</p>
                    </div>
                </div>
            )}

            {/* Transport Controls */}
            <div className="flex items-center justify-center gap-3">
                <button
                    onClick={() => send('PREV')}
                    disabled={loading}
                    title="Previous track"
                    aria-label="Previous track"
                    className="h-9 w-9 rounded-full bg-white/[0.06] hover:bg-white/[0.12] flex items-center justify-center transition-all active:scale-90 disabled:opacity-40"
                >
                    <SkipBack className="h-4 w-4 text-secondary-foreground" />
                </button>

                <button
                    onClick={() => send(isPlaying ? 'PAUSE' : 'PLAY')}
                    disabled={loading}
                    title={isPlaying ? 'Pause' : 'Play'}
                    aria-label={isPlaying ? 'Pause' : 'Play'}
                    className={`h-11 w-11 rounded-full flex items-center justify-center transition-all active:scale-90 disabled:opacity-40
                        ${isPlaying
                            ? 'bg-gradient-to-br from-green-500 to-emerald-600 shadow-[0_0_20px_rgba(34,197,94,0.4)]'
                            : 'bg-white/[0.1] hover:bg-white/[0.15] border border-white/[0.08]'
                        }`}
                >
                    {loading ? (
                        <Loader2 className="h-5 w-5 animate-spin text-foreground" />
                    ) : isPlaying ? (
                        <Pause className="h-5 w-5 text-foreground" />
                    ) : (
                        <Play className="h-5 w-5 text-foreground ml-0.5" />
                    )}
                </button>

                <button
                    onClick={() => send('NEXT')}
                    disabled={loading}
                    title="Next track"
                    aria-label="Next track"
                    className="h-9 w-9 rounded-full bg-white/[0.06] hover:bg-white/[0.12] flex items-center justify-center transition-all active:scale-90 disabled:opacity-40"
                >
                    <SkipForward className="h-4 w-4 text-secondary-foreground" />
                </button>
            </div>

            {/* Volume Slider */}
            <div className="flex items-center gap-2">
                <Volume2 className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                <input aria-label="Input"
                    type="range"
                    min={0}
                    max={100}
                    value={localVolume}
                    onChange={handleVolume}
                    title="Volume"
                    aria-label="Volume"
                    className="w-full h-1.5 rounded-full bg-secondary appearance-none cursor-pointer
                        [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4
                        [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-green-500
                        [&::-webkit-slider-thumb]:shadow-[0_0_8px_rgba(34,197,94,0.5)] [&::-webkit-slider-thumb]:cursor-pointer"
                />
                <span className="text-[10px] font-mono text-muted-foreground w-8 text-right">{localVolume}%</span>
            </div>
        </div>
    );
}

// ─── Device Card ────────────────────────────────────────────────────────
function DeviceCard({ device, index, onControl }: {
    device: SmartDevice;
    index: number;
    onControl: (uuid: string, command: string, channel?: number) => Promise<void>;
}) {
    const [loading, setLoading] = useState(false);
    const [localIsOn, setLocalIsOn] = useState(device.is_on);
    const cfg = getCategoryConfig(device.device_category);
    const Icon = cfg.icon;

    useEffect(() => { setLocalIsOn(device.is_on); }, [device.is_on]);

    const handleToggle = async () => {
        setLoading(true);
        try {
            const cmd = localIsOn ? 'OFF' : 'ON';
            await onControl(device.uuid, cmd);
            setLocalIsOn(!localIsOn);
        } finally {
            setLoading(false);
        }
    };

    const handleGateCommand = async (cmd: string) => {
        setLoading(true);
        try { await onControl(device.uuid, cmd); } finally { setLoading(false); }
    };

    const isSensorType = ['leak_sensor', 'smoke_alarm', 'door_sensor'].includes(device.device_category);
    const isControllable = ['plug', 'surge_protector', 'bulb'].includes(device.device_category);
    const isGate = device.device_category === 'gate';
    const isMusicPlayer = device.device_category === 'music_player';

    return (
        <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.5, delay: index * 0.06 }}
            className="group relative"
        >
            {/* Glow Effect */}
            {device.online && (
                <div
                    className="absolute -inset-0.5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl"
                    style={{ background: `radial-gradient(circle, ${cfg.glow}, transparent 70%)` }} /* keep-inline */ /* keep-inline */
                />
            )}

            <div className={`
        relative overflow-hidden rounded-2xl border transition-all duration-300
        ${device.online
                    ? 'border-white/[0.08] bg-card/80 backdrop-blur-xl hover:border-white/[0.15] hover:shadow-2xl'
                    : 'border-border/50 bg-background/60 opacity-60'
                }
      `}>
                {/* Header */}
                <div className="p-5 pb-3">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                            <div
                                className={`
                  h-11 w-11 rounded-xl flex items-center justify-center transition-all duration-300
                  ${device.online
                                        ? `bg-gradient-to-br ${cfg.gradient} shadow-md`
                                        : 'bg-secondary border border-border'
                                    }
                `}
                                style={device.online ? { boxShadow: `0 4px 15px ${cfg.glow}` } : {}}
                            >
                                <Icon className={`h-5 w-5 ${device.online ? 'text-foreground' : 'text-muted-foreground'}`} />
                            </div>
                            <div>
                                <h3 className={`text-sm font-bold ${device.online ? 'text-foreground' : 'text-muted-foreground'}`}>
                                    {device.name}
                                </h3>
                                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mt-0.5">
                                    {cfg.label}
                                </p>
                            </div>
                        </div>

                        {/* Online Indicator */}
                        <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider
              ${device.online ? 'text-emerald-400 bg-emerald-500/10' : 'text-muted-foreground bg-secondary'}
            `}>
                            <div className={`h-1.5 w-1.5 rounded-full ${device.online ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-600'}`} />
                            {device.online ? 'Online' : 'Offline'}
                        </div>
                    </div>
                </div>

                {/* Divider */}
                <div className="mx-5 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

                {/* Controls */}
                <div className="p-5 pt-4">
                    {isControllable && device.online && (
                        <div className="flex items-center justify-between">
                            <span className={`text-xs font-bold uppercase tracking-wider ${localIsOn ? 'text-emerald-400' : 'text-muted-foreground'}`}>
                                {localIsOn ? 'Power On' : 'Power Off'}
                            </span>
                            <PowerToggle isOn={!!localIsOn} loading={loading} onClick={handleToggle} />
                        </div>
                    )}

                    {isGate && device.online && (
                        <GateControl loading={loading} onOpen={() => handleGateCommand('OPEN')} onClose={() => handleGateCommand('CLOSE')} />
                    )}

                    {isSensorType && (
                        <SensorBadge
                            type={device.device_category === 'leak_sensor' ? 'leak' : device.device_category === 'smoke_alarm' ? 'smoke' : 'door'}
                            online={device.online}
                        />
                    )}

                    {device.device_category === 'hub' && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Radio className="h-3.5 w-3.5 text-purple-400" />
                            <span className="font-medium text-muted-foreground">Central Hub — Sub-devices connected</span>
                        </div>
                    )}

                    {isMusicPlayer && device.online && (
                        <MusicPlayerControls device={device} onControl={onControl} />
                    )}

                    {!device.online && !isSensorType && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <WifiOff className="h-3.5 w-3.5" />
                            <span>Device unreachable</span>
                        </div>
                    )}
                </div>

                {/* Footer: Type + Provider badge */}
                <div className="px-5 pb-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono text-foreground uppercase">{device.type}</span>
                            {device.provider && (
                                <span className={`text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded ${device.provider === 'tuya'
                                    ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                                    : device.provider === 'spotify'
                                        ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                                        : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                    }`}>
                                    {device.provider}
                                </span>
                            )}
                        </div>
                        {device.firmware && (
                            <span className="text-[10px] font-mono text-zinc-700">FW {device.firmware}</span>
                        )}
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

// ─── Main Dashboard ─────────────────────────────────────────────────────
export default function SmartHomeDashboard() {
    const [devices, setDevices] = useState<SmartDevice[]>([]);
    const [stats, setStats] = useState({ total: 0, online: 0, offline: 0 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [syncing, setSyncing] = useState(false);
    const [syncError, setSyncError] = useState<string | null>(null);
    const syncPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // ── Fetch cached devices from DB (instant) ──
    const fetchDevices = useCallback(async (showLoader = false) => {
        try {
            if (showLoader) setLoading(true);
            setError(null);
            const { data } = await api.get<DevicesResponse>('/smart-home/devices');
            setDevices(data.devices);
            setStats({ total: data.total, online: data.online, offline: data.offline });
            setLastUpdated(new Date());
            if (data.syncing) setSyncing(true);
            if (data.last_sync_error) setSyncError(data.last_sync_error);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Failed to fetch devices';
            setError(message);
        } finally {
            setLoading(false);
        }
    }, []);

    // ── Trigger background sync ──
    const triggerSync = useCallback(async () => {
        try {
            setSyncing(true);
            setSyncError(null);
            await api.post('/smart-home/sync');

            // Poll for completion every 3s
            if (syncPollRef.current) clearInterval(syncPollRef.current);
            syncPollRef.current = setInterval(async () => {
                try {
                    const { data } = await api.get<{ syncing: boolean; last_error: string | null }>('/smart-home/sync/status');
                    if (!data.syncing) {
                        // Sync complete — refresh device list
                        setSyncing(false);
                        if (data.last_error) setSyncError(data.last_error);
                        if (syncPollRef.current) clearInterval(syncPollRef.current);
                        syncPollRef.current = null;
                        fetchDevices(); // Refresh to show newly synced devices
                    }
                } catch {
                    // Ignore poll errors
                }
            }, 3000);
        } catch (err: unknown) {
            setSyncing(false);
            const message = err instanceof Error ? err.message : 'Sync failed';
            setSyncError(message);
        }
    }, [fetchDevices]);

    // ── On mount: load cached devices instantly, then trigger background sync ──
    useEffect(() => {
        fetchDevices(true).then(() => {
            // After showing cached data, trigger background sync
            triggerSync();
        });

        return () => {
            if (syncPollRef.current) clearInterval(syncPollRef.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleControl = async (uuid: string, command: string, channel = 0) => {
        await api.post(`/smart-home/devices/${uuid}/control`, { command, channel });
    };

    // Group by category
    const grouped = devices.reduce<Record<string, SmartDevice[]>>((acc, dev) => {
        const cat = dev.device_category;
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(dev);
        return acc;
    }, {});

    const categoryOrder = ['music_player', 'plug', 'surge_protector', 'gate', 'hub', 'leak_sensor', 'smoke_alarm', 'door_sensor', 'bulb', 'unknown'];

    return (
        <div className="min-h-screen p-6 lg:p-8">
            {/* Hero Section */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="relative overflow-hidden rounded-3xl border border-white/[0.06] bg-card/40 backdrop-blur-xl p-8 mb-8"
            >
                {/* Animated Background */}
                <div className="absolute inset-0 overflow-hidden">
                    <div className="absolute -top-1/2 -right-1/4 w-96 h-96 rounded-full bg-gradient-to-br from-emerald-500/[0.07] to-transparent blur-3xl" />
                    <div className="absolute -bottom-1/2 -left-1/4 w-96 h-96 rounded-full bg-gradient-to-br from-blue-500/[0.05] to-transparent blur-3xl" />
                </div>

                <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <div className="flex items-center gap-5">
                        <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.3)]">
                            <Home className="h-8 w-8 text-foreground" />
                        </div>
                        <div>
                            <h1 className="text-2xl lg:text-3xl font-black text-foreground tracking-tight">Smart Home</h1>
                            <p className="text-sm text-muted-foreground font-medium mt-1">
                                IoT Device Control Center — Meross + Tuya + Spotify
                            </p>
                            {lastUpdated && (
                                <p className="text-[10px] text-muted-foreground font-mono mt-2 uppercase tracking-wider">
                                    Last synced: {lastUpdated.toLocaleTimeString()}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Sync Status Badge */}
                        {syncing && (
                            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                <span className="text-[10px] font-bold uppercase tracking-wider">Syncing from cloud...</span>
                            </div>
                        )}
                        {syncError && !syncing && (
                            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                                <CloudOff className="h-3.5 w-3.5" />
                                <span className="text-[10px] font-bold uppercase tracking-wider">Sync issue</span>
                            </div>
                        )}
                        <button
                            onClick={() => { fetchDevices(); triggerSync(); }}
                            disabled={syncing}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.08] text-secondary-foreground text-sm font-bold
              hover:bg-white/[0.08] hover:border-white/[0.12] active:scale-95 transition-all duration-200 disabled:opacity-50"
                        >
                            <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
                            {syncing ? 'Syncing...' : 'Refresh'}
                        </button>
                    </div>
                </div>
            </motion.div>

            {/* Stats Row */}
            {!loading && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                    <StatCard label="Total Devices" value={stats.total} icon={Radio} gradient="from-zinc-500 to-zinc-600" delay={0.1} />
                    <StatCard label="Online" value={stats.online} icon={Wifi} gradient="from-emerald-500 to-teal-600" delay={0.2} />
                    <StatCard label="Offline" value={stats.offline} icon={WifiOff} gradient="from-red-500 to-rose-600" delay={0.3} />
                </div>
            )}

            {/* Loading State */}
            <AnimatePresence>
                {loading && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex flex-col items-center justify-center py-24 gap-4"
                    >
                        <div className="relative">
                            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center animate-pulse">
                                <Radio className="h-8 w-8 text-foreground" />
                            </div>
                            <div className="absolute -inset-2 rounded-2xl border-2 border-emerald-500/20 animate-ping" />
                        </div>
                        <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider">{"Loading "}devices...</p>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Error State */}
            {error && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-2xl border border-red-500/20 bg-red-500/[0.05] p-6 mb-8 flex items-center gap-4"
                >
                    <AlertTriangle className="h-6 w-6 text-red-400 flex-shrink-0" />
                    <div>
                        <p className="text-sm font-bold text-red-400">Connection Error</p>
                        <p className="text-xs text-red-400/60 mt-1">{error}</p>
                    </div>
                    <button
                        onClick={() => fetchDevices(true)}
                        className="ml-auto px-4 py-2 rounded-lg bg-red-500/10 text-red-400 text-xs font-bold hover:bg-red-500/20 transition-colors"
                    >
                        Retry
                    </button>
                </motion.div>
            )}

            {/* Device Groups */}
            {!loading && devices.length > 0 && (
                <div className="space-y-8">
                    {categoryOrder
                        .filter(cat => grouped[cat]?.length)
                        .map(cat => {
                            const catCfg = getCategoryConfig(cat);
                            const CatIcon = catCfg.icon;
                            return (
                                <motion.section
                                    key={cat}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.5 }}
                                >
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className={`h-8 w-8 rounded-lg bg-gradient-to-br ${catCfg.gradient} flex items-center justify-center`}>
                                            <CatIcon className="h-4 w-4 text-foreground" />
                                        </div>
                                        <h2 className="text-sm font-black text-muted-foreground uppercase tracking-wider">{catCfg.label}s</h2>
                                        <span className="text-[10px] font-bold text-muted-foreground bg-secondary/60 px-2 py-0.5 rounded-full">
                                            {grouped[cat].length}
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                                        {grouped[cat].map((dev, i) => (
                                            <DeviceCard key={dev.uuid} device={dev} index={i} onControl={handleControl} />
                                        ))}
                                    </div>
                                </motion.section>
                            );
                        })
                    }
                </div>
            )}

            {/* Empty State */}
            {!loading && devices.length === 0 && !error && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center justify-center py-24 gap-4"
                >
                    <div className="h-20 w-20 rounded-2xl bg-card border border-border flex items-center justify-center">
                        <Radio className="h-10 w-10 text-zinc-700" />
                    </div>
                    <h3 className="text-lg font-bold text-muted-foreground">{"No "}Devices Found</h3>
                    <p className="text-sm text-muted-foreground max-w-md text-center">
                        {syncing
                            ? 'Discovering devices from Meross & Tuya cloud... This may take a moment.'
                            : 'No devices synced yet. Make sure your Meross/Tuya credentials are configured in Sync Dashboard, then click Refresh.'}
                    </p>
                    {!syncing && (
                        <button
                            onClick={() => triggerSync()}
                            className="mt-4 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-foreground text-sm font-bold
                hover:shadow-[0_0_30px_rgba(16,185,129,0.3)] active:scale-95 transition-all duration-200 flex items-center gap-2"
                        >
                            <Cloud className="h-4 w-4" />
                            Sync from Cloud
                        </button>
                    )}
                </motion.div>
            )}
        </div>
    );
}
