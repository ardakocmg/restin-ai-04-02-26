import React, { useState, useCallback, useRef } from 'react';
import { Badge } from "@/components/ui/badge";
import {
    Mic, MicOff, Radio, ChevronDown, X, Volume2,
    Hash, ChefHat, Wine, Briefcase, Bell
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGlobalPTT, LiveSpeaker } from '@/contexts/GlobalPTTContext';

// ─── Channel Config ─────────────────────────────────────────────────────
interface PTTChannel {
    id: string;
    name: string;
    icon: React.ElementType;
    color: string;
    listeners: number;
}

const PTT_CHANNELS: PTTChannel[] = [
    { id: 'general', name: 'General', icon: Hash, color: 'text-blue-400', listeners: 6 },
    { id: 'kitchen', name: 'Kitchen', icon: ChefHat, color: 'text-orange-400', listeners: 3 },
    { id: 'bar', name: 'Bar', icon: Wine, color: 'text-purple-400', listeners: 2 },
    { id: 'management', name: 'Management', icon: Briefcase, color: 'text-emerald-400', listeners: 2 },
    { id: 'alerts', name: 'Alerts', icon: Bell, color: 'text-red-400', listeners: 4 },
];

// ─── Active Speakers ────────────────────────────────────────────────────
interface Speaker {
    name: string;
    initials: string;
    color: string;
    online: boolean;
}

const SPEAKERS: Speaker[] = [
    { name: 'Maria', initials: 'ML', color: 'bg-pink-600', online: true },
    { name: 'Marco', initials: 'CM', color: 'bg-orange-600', online: true },
    { name: 'John', initials: 'JK', color: 'bg-blue-600', online: true },
    { name: 'Sarah', initials: 'SP', color: 'bg-teal-600', online: true },
    { name: 'Tony', initials: 'TB', color: 'bg-purple-600', online: false },
];

// ─── Waveform Bars ──────────────────────────────────────────────────────
function WaveformBars({ active }: { active: boolean }) {
    return (
        <div className="flex items-center gap-0.5 h-5">
            {[0, 1, 2, 3, 4, 5, 6].map(i => (
                <motion.div
                    key={i}
                    className={`w-[3px] rounded-full ${active ? 'bg-red-400' : 'bg-zinc-700'}`}
                    animate={active ? {
                        height: [4, 12 + Math.random() * 10, 6, 16 + Math.random() * 6, 4],
                    } : { height: 4 }}
                    transition={active ? {
                        duration: 0.5 + Math.random() * 0.3,
                        repeat: Infinity,
                        ease: 'easeInOut',
                        delay: i * 0.07,
                    } : { duration: 0.3 }}
                />
            ))}
        </div>
    );
}

// ─── Floating PTT Widget ────────────────────────────────────────────────
export default function FloatingPTT() {
    const [isOpen, setIsOpen] = useState(false);
    const [showChannels, setShowChannels] = useState(false);
    const {
        activeChannel,
        setActiveChannel,
        isTalking,
        startTalking,
        stopTalking,
        micPermission,
        liveTranscript,
        liveSpeakers,
    } = useGlobalPTT();

    const activeChannelData = PTT_CHANNELS.find(c => c.id === activeChannel);

    // Play chirp sound on PTT start/stop
    const audioCtxRef = useRef<AudioContext | null>(null);
    const playChirp = useCallback((freq: number, dur: number) => {
        try {
            if (!audioCtxRef.current) {
                audioCtxRef.current = new AudioContext();
            }
            const ctx = audioCtxRef.current;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.setValueAtTime(freq, ctx.currentTime);
            gain.gain.setValueAtTime(0.08, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + dur);
        } catch {
            // Audio not available
        }
    }, []);

    const handlePTTStart = useCallback(() => {
        playChirp(1200, 0.08);
        startTalking();
    }, [playChirp, startTalking]);

    const handlePTTStop = useCallback(() => {
        playChirp(800, 0.1);
        stopTalking();
    }, [playChirp, stopTalking]);

    // ─── Collapsed Bubble ───────────────────────────────────────────────
    if (!isOpen) {
        return (
            <motion.button
                onClick={() => setIsOpen(true)}
                title="Open Walkie-Talkie"
                className={`fixed bottom-24 right-6 z-50 h-12 w-12 rounded-full border flex items-center justify-center shadow-lg transition-colors group ${isTalking
                        ? 'bg-red-600 border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.4)]'
                        : 'bg-secondary border-border hover:bg-secondary/80'
                    }`}
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.95 }}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 260, damping: 20 }}
            >
                {isTalking ? (
                    <>
                        <Mic className="h-5 w-5 text-foreground animate-pulse" />
                        <motion.div
                            className="absolute inset-0 rounded-full border-2 border-red-500"
                            animate={{ scale: [1, 1.5], opacity: [0.6, 0] }}
                            transition={{ duration: 1, repeat: Infinity }}
                        />
                    </>
                ) : (
                    <Radio className="h-5 w-5 text-muted-foreground group-hover:text-emerald-400 transition-colors" />
                )}
                {/* Green dot = connected */}
                {!isTalking && (
                    <div className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-zinc-950" />
                )}
            </motion.button>
        );
    }

    // ─── Expanded Widget ────────────────────────────────────────────────
    return (
        <AnimatePresence>
            <motion.div
                className="fixed bottom-24 right-6 z-50 w-[280px] bg-background border border-border rounded-2xl shadow-[0_8px_60px_rgba(0,0,0,0.6)] overflow-hidden"
                initial={{ y: 30, opacity: 0, scale: 0.9 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: 30, opacity: 0, scale: 0.9 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            >
                {/* Header */}
                <div className="h-10 border-b border-border flex items-center justify-between px-3 bg-card/80">
                    <div className="flex items-center gap-1.5">
                        <Radio className="h-3.5 w-3.5 text-emerald-400" />
                        <span className="text-xs font-semibold text-secondary-foreground">Walkie-Talkie</span>
                        {isTalking && (
                            <Badge className="h-4 px-1.5 text-[9px] bg-red-600 text-foreground border-0 animate-pulse">LIVE</Badge>
                        )}
                    </div>
                    <button title="Close" onClick={() => setIsOpen(false)} className="p-1 rounded-md hover:bg-secondary text-muted-foreground hover:text-secondary-foreground transition-colors">
                        <X className="h-3.5 w-3.5" />
                    </button>
                </div>

                {/* Channel Selector */}
                <div className="px-3 py-2 border-b border-border">
                    <button
                        title="Select channel"
                        onClick={() => setShowChannels(!showChannels)}
                        className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-card hover:bg-secondary transition-colors"
                    >
                        <div className="flex items-center gap-2">
                            {activeChannelData && <activeChannelData.icon className={`h-3.5 w-3.5 ${activeChannelData.color}`} />}
                            <span className="text-xs font-medium text-secondary-foreground">#{activeChannelData?.name}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-muted-foreground">{activeChannelData?.listeners} on</span>
                            <ChevronDown className={`h-3 w-3 text-muted-foreground transition-transform ${showChannels ? 'rotate-180' : ''}`} />
                        </div>
                    </button>

                    <AnimatePresence>
                        {showChannels && (
                            <motion.div
                                className="mt-1 space-y-0.5"
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.15 }}
                            >
                                {PTT_CHANNELS.map(ch => (
                                    <button
                                        key={ch.id}
                                        title={`Switch to ${ch.name}`}
                                        onClick={() => { setActiveChannel(ch.id); setShowChannels(false); }}
                                        className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs transition-all ${activeChannel === ch.id ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-secondary-foreground hover:bg-secondary/50'
                                            }`}
                                    >
                                        <ch.icon className={`h-3 w-3 ${ch.color}`} />
                                        <span className="flex-1 text-left">{ch.name}</span>
                                        <span className="text-[10px] text-muted-foreground">{ch.listeners}</span>
                                    </button>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* PTT Button Area */}
                <div className="flex flex-col items-center py-5 px-4 gap-3">
                    {/* Waveform */}
                    <WaveformBars active={isTalking} />

                    {/* Big PTT Button */}
                    <motion.button
                        title={isTalking ? 'Release to stop' : 'Hold to talk'}
                        onMouseDown={handlePTTStart}
                        onMouseUp={handlePTTStop}
                        onMouseLeave={handlePTTStop}
                        onTouchStart={handlePTTStart}
                        onTouchEnd={handlePTTStop}
                        whileTap={{ scale: 0.95 }}
                        disabled={micPermission === 'denied'}
                        className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all ${isTalking
                            ? 'bg-red-600 shadow-[0_0_40px_rgba(239,68,68,0.5)]'
                            : micPermission === 'denied'
                                ? 'bg-secondary cursor-not-allowed'
                                : 'bg-secondary hover:bg-secondary/80 shadow-[0_0_15px_rgba(0,0,0,0.4)]'
                            }`}
                    >
                        {/* Pulse rings on transmit */}
                        {isTalking && (
                            <>
                                <motion.div
                                    className="absolute inset-0 rounded-full border-2 border-red-500"
                                    animate={{ scale: [1, 1.4], opacity: [0.6, 0] }}
                                    transition={{ duration: 1, repeat: Infinity }}
                                />
                                <motion.div
                                    className="absolute inset-0 rounded-full border-2 border-red-500"
                                    animate={{ scale: [1, 1.7], opacity: [0.4, 0] }}
                                    transition={{ duration: 1.5, repeat: Infinity }}
                                />
                            </>
                        )}
                        {isTalking ? (
                            <Mic className="h-8 w-8 text-foreground" />
                        ) : (
                            <MicOff className="h-8 w-8 text-muted-foreground" />
                        )}
                    </motion.button>

                    <p className="text-[10px] text-muted-foreground text-center">
                        {isTalking ? (
                            <span className="text-red-400 font-bold animate-pulse">🔴 TRANSMITTING</span>
                        ) : micPermission === 'denied' ? (
                            <span className="text-red-400">Mic access denied</span>
                        ) : (
                            <span>Hold to talk · <kbd className="px-1 py-0.5 rounded bg-secondary text-muted-foreground text-[9px] font-mono">Space</kbd></span>
                        )}
                    </p>

                    {/* Live transcript */}
                    {isTalking && liveTranscript && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="w-full px-2 py-1.5 rounded-lg bg-card border border-border"
                        >
                            <p className="text-[10px] text-muted-foreground italic truncate">"{liveTranscript}"</p>
                        </motion.div>
                    )}
                </div>

                {/* Active Listeners with Live Speaker Indicators */}
                <div className="px-3 pb-3 border-t border-border pt-3">
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">On this channel</p>
                    <div className="flex flex-wrap gap-2">
                        {SPEAKERS.filter(s => s.online).map(s => {
                            const isLive = liveSpeakers.some(ls => ls.initials === s.initials);
                            return (
                                <div key={s.name} className={`flex items-center gap-1.5 px-2 py-1 rounded-full ${isLive ? 'bg-red-500/10 ring-1 ring-red-500/40' : 'bg-card'}`}>
                                    <div className={`h-5 w-5 rounded-full ${s.color} flex items-center justify-center ${isLive ? 'ring-2 ring-red-500' : ''}`}>
                                        <span className="text-foreground text-[8px] font-bold">{s.initials}</span>
                                    </div>
                                    <span className={`text-[10px] ${isLive ? 'text-red-400 font-semibold' : 'text-muted-foreground'}`}>{s.name}</span>
                                    {isLive && <Volume2 className="h-2.5 w-2.5 text-red-400 animate-pulse" />}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
