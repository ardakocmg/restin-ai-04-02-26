import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    MessageSquare, Hash, Mic, MicOff, Send, Users, Radio,
    ChefHat, Wine, Briefcase, Bell, Search, Pin, Star,
    CheckSquare, Clock, Zap, Volume2, Paperclip, Smile,
    Reply, Trash2, Edit3, MoreHorizontal, Image, FileText,
    X, Check, ArrowRight, PhoneCall, FileAudio, Share2,
    Play, Pause, Square, Calendar, UserPlus, ListTodo, RotateCw, Timer, GripVertical, Plus,
    Settings, Globe, Volume1, Bookmark, Flag, BarChart3,
    AlarmClock, Languages, Sparkles, Eye, MessageSquarePlus,
    Copy, Sticker, LayoutTemplate, Layout, VolumeX
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { parseSmartMessage, SmartToken } from '@/lib/smartParser';
import { useGlobalPTT, TransmissionResult, LiveSpeaker } from '@/contexts/GlobalPTTContext';
import { useVoiceDictation, speakMessage, stopSpeaking, isSpeaking, getAvailableVoices, SUPPORTED_LANGUAGES } from '@/hooks/useVoiceDictation';
import type { TTSConfig } from '@/hooks/useVoiceDictation';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';

// ─── Channel Definitions ────────────────────────────────────────────────
interface Channel {
    id: string;
    name: string;
    icon: React.ElementType;
    color: string;
    unread: number;
    description: string;
}

const CHANNELS: Channel[] = [
    { id: 'general', name: 'General', icon: Hash, color: 'text-blue-400', unread: 3, description: 'Team-wide announcements' },
    { id: 'kitchen', name: 'Kitchen', icon: ChefHat, color: 'text-orange-400', unread: 1, description: 'Kitchen comms & orders' },
    { id: 'bar', name: 'Bar', icon: Wine, color: 'text-purple-400', unread: 0, description: 'Bar operations' },
    { id: 'management', name: 'Management', icon: Briefcase, color: 'text-emerald-400', unread: 0, description: 'Managers only' },
    { id: 'alerts', name: 'Alerts', icon: Bell, color: 'text-red-400', unread: 5, description: 'System alerts & IoT' },
];

// ─── Message Types ──────────────────────────────────────────────────────
interface PollOption {
    id: string;
    text: string;
    votes: string[]; // voter names
}

interface ChatMessage {
    id: string;
    channelId: string;
    sender: string;
    senderInitials: string;
    senderColor: string;
    text: string;
    timestamp: string;
    isPinned?: boolean;
    reactions?: Record<string, string[]>;
    replyTo?: string;
    replyPreview?: string;
    attachments?: { name: string; type: 'image' | 'file'; size: string }[];
    isEdited?: boolean;
    readBy?: string[];
    // Voice
    isVoice?: boolean;
    voiceDuration?: number;
    audioUrl?: string;
    transcriptConfidence?: number; // 0-1
    // Tier 1
    isBookmarked?: boolean;
    isPriority?: boolean;
    isScheduled?: boolean;
    scheduledTime?: string;
    poll?: { question: string; options: PollOption[]; multiSelect?: boolean };
    reminder?: { time: string; label?: string };
    // Tier 2
    isTranslated?: boolean;
    translatedText?: string;
    // Tier 3
    templateId?: string;
}

// API helpers
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function mapApiMessage(m: Record<string, unknown>): ChatMessage {
    return {
        id: (m.id as string) || '',
        channelId: (m.channel_id as string) || 'general',
        sender: (m.sender as string) || '',
        senderInitials: (m.sender_initials as string) || '',
        senderColor: (m.sender_color as string) || 'bg-zinc-600',
        text: (m.text as string) || '',
        timestamp: (m.timestamp as string) || '',
        isPinned: (m.is_pinned as boolean) || false,
        reactions: (m.reactions as Record<string, string[]>) || {},
        readBy: (m.read_by as string[]) || [],
        isEdited: (m.is_edited as boolean) || false,
        isBookmarked: (m.is_bookmarked as boolean) || false,
        isPriority: (m.is_priority as boolean) || false,
        replyTo: (m.reply_to as string) || undefined,
        replyPreview: (m.reply_preview as string) || undefined,
        isVoice: (m.is_voice as boolean) || false,
        voiceDuration: (m.voice_duration as number) || undefined,
        audioUrl: (m.audio_url as string) || undefined,
        attachments: (m.attachments as ChatMessage['attachments']) || [],
        poll: (m.poll as ChatMessage['poll']) || undefined,
        isScheduled: (m.is_scheduled as boolean) || false,
        scheduledTime: (m.scheduled_time as string) || undefined,
    };
}

// ─── Online Staff ───────────────────────────────────────────────────────
interface OnlineStaff {
    name: string;
    initials: string;
    color: string;
    role: string;
    status: 'online' | 'busy' | 'away';
}

// Online staff loaded from API (see useEffect below)

// ─── Micro-Tasks ────────────────────────────────────────────────────────
interface MicroTask {
    id: string;
    title: string;
    urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    xp: number;
    assignedTo?: string;
    department?: string;
    deadline?: string;
    status: 'pool' | 'assigned' | 'in-progress' | 'done';
    recurrence?: 'none' | 'daily' | 'weekly' | 'shift-start' | 'shift-end';
    startedAt?: string;
    completedAt?: string;
    sourceMessageId?: string;
    sourceMessageText?: string;
    sourceChannelId?: string;
}

// Tasks loaded from API (see useEffect below)

// ─── AVAILABLE REACTIONS ────────────────────────────────────────────────
const REACTION_EMOJIS = ['👍', '❤️', '😂', '🔥', '🎉', '⭐', '👀', '✅'];

// ─── Smart Token Renderer ──────────────────────────────────────────────

// ─── Quick Message Shortcuts ────────────────────────────────────────────
interface QuickMessage {
    command: string;
    label: string;
    emoji: string;
    text: string;
}

const QUICK_MESSAGES: QuickMessage[] = [
    { command: '/86', label: '86 Item', emoji: '\ud83d\udeab', text: '\ud83d\udeab 86d \u2014 Item is no longer available' },
    { command: '/vip', label: 'VIP Alert', emoji: '\u2b50', text: '\u2b50 VIP guest arriving \u2014 priority service required' },
    { command: '/fire', label: 'Fire Course', emoji: '\ud83d\udd25', text: '\ud83d\udd25 FIRE \u2014 Send the next course NOW' },
    { command: '/hold', label: 'Hold Course', emoji: '\u23f8\ufe0f', text: '\u23f8\ufe0f HOLD \u2014 Do NOT send next course yet' },
    { command: '/clean', label: 'Cleanup', emoji: '\ud83e\uddf9', text: '\ud83e\uddf9 Table needs immediate cleanup' },
    { command: '/help', label: 'Need Help', emoji: '\ud83c\udd98', text: '\ud83c\udd98 Need assistance at my station immediately' },
];

// ─── Smart Token Renderer (with navigation + premium design) ────────────
const SMART_CHIP_STYLES: Record<string, { bg: string; text: string; border: string; glow: string; icon: string; label: string }> = {
    ORDER_LINK: { bg: 'bg-blue-500/15', text: 'text-blue-300', border: 'border-blue-500/30', glow: 'shadow-blue-500/20', icon: '📋', label: 'Order' },
    TABLE_LINK: { bg: 'bg-emerald-500/15', text: 'text-emerald-300', border: 'border-emerald-500/30', glow: 'shadow-emerald-500/20', icon: '🪑', label: 'Table' },
    ITEM_LINK: { bg: 'bg-amber-500/15', text: 'text-amber-300', border: 'border-amber-500/30', glow: 'shadow-amber-500/20', icon: '📦', label: 'Inventory' },
    RECIPE_LINK: { bg: 'bg-rose-500/15', text: 'text-rose-300', border: 'border-rose-500/30', glow: 'shadow-rose-500/20', icon: '🍳', label: 'Recipe' },
    RESERVATION_LINK: { bg: 'bg-violet-500/15', text: 'text-violet-300', border: 'border-violet-500/30', glow: 'shadow-violet-500/20', icon: '📅', label: 'Reservation' },
    STAFF_MENTION: { bg: 'bg-cyan-500/15', text: 'text-cyan-300', border: 'border-cyan-500/30', glow: 'shadow-cyan-500/20', icon: '👤', label: 'Staff' },
    GUEST_LINK: { bg: 'bg-pink-500/15', text: 'text-pink-300', border: 'border-pink-500/30', glow: 'shadow-pink-500/20', icon: '🎯', label: 'Guest' },
};

interface SmartTokenSpanProps {
    token: SmartToken;
    onNavigate?: (route: string) => void;
}

function SmartTokenSpan({ token, onNavigate }: SmartTokenSpanProps) {
    const style = SMART_CHIP_STYLES[token.type];
    if (!style) return <span>{token.text}</span>;

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (token.route && onNavigate) onNavigate(token.route);
    };

    return (
        <motion.span
            onClick={handleClick}
            whileHover={{ scale: 1.05, y: -1 }}
            whileTap={{ scale: 0.97 }}
            className={`
                inline-flex items-center gap-1 px-2 py-0.5 rounded-md
                ${style.bg} ${style.text} border ${style.border}
                text-xs font-semibold cursor-pointer
                backdrop-blur-sm
                hover:shadow-lg ${style.glow}
                transition-all duration-200
                select-none
            `}
            title={`Go to ${style.label}: ${token.id || token.text}`}
        >
            <span className="text-[11px]">{style.icon}</span>
            <span>{token.text}</span>
            <ArrowRight className="h-2.5 w-2.5 opacity-0 group-hover:opacity-60 -mr-0.5 transition-opacity" />
        </motion.span>
    );
}

function SmartMessageRenderer({ text, onNavigate }: { text: string; onNavigate?: (route: string) => void }) {
    const tokens = useMemo(() => parseSmartMessage(text), [text]);
    return (
        <span className="leading-relaxed">
            {tokens.map((token, i) => (
                <SmartTokenSpan key={i} token={token} onNavigate={onNavigate} />
            ))}
        </span>
    );
}

// ─── Typing Indicator ──────────────────────────────────────────────────
function TypingIndicator({ names }: { names: string[] }) {
    if (names.length === 0) return null;
    const text = names.length === 1
        ? `${names[0]} is typing`
        : names.length === 2
            ? `${names[0]} and ${names[1]} are typing`
            : `${names[0]} and ${names.length - 1} others are typing`;
    return (
        <motion.div
            className="flex items-center gap-2 px-4 py-1.5"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
        >
            <div className="flex gap-[3px]">
                {[0, 1, 2].map(i => (
                    <motion.div
                        key={i}
                        className="h-1.5 w-1.5 rounded-full bg-zinc-500"
                        animate={{ y: [0, -4, 0] }}
                        transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                    />
                ))}
            </div>
            <span className="text-[10px] text-zinc-500 italic">{text}</span>
        </motion.div>
    );
}

// ─── Attachment Preview ─────────────────────────────────────────────────
function AttachmentBubble({ att }: { att: { name: string; type: 'image' | 'file'; size: string } }) {
    return (
        <div className="mt-1.5 inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-zinc-800/60 border border-zinc-700/50 hover:bg-zinc-700/60 transition-colors cursor-pointer">
            {att.type === 'image' ? (
                <Image className="h-3.5 w-3.5 text-blue-400" />
            ) : (
                <FileText className="h-3.5 w-3.5 text-amber-400" />
            )}
            <span className="text-xs text-zinc-300">{att.name}</span>
            <span className="text-[10px] text-zinc-600">{att.size}</span>
        </div>
    );
}

// ─── Main Dashboard ─────────────────────────────────────────────────────
export default function HiveDashboard() {
    const { user } = useAuth();
    const navigate = useNavigate();

    // Smart navigation callback for context-aware chat links
    const handleSmartNavigate = useCallback((route: string) => {
        navigate(route);
    }, [navigate]);

    // Derive user identity for sent messages
    const senderName = user?.name || 'You';
    const senderInitials = user?.name
        ? user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().substring(0, 2)
        : 'ME';

    const [messageInput, setMessageInput] = useState('');
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [onlineStaff, setOnlineStaff] = useState<OnlineStaff[]>([]);

    // Load messages from API
    const fetchMessages = useCallback(async (channel: string) => {
        try {
            const res = await fetch(`${API_BASE}/api/hive/messages?channel=${channel}&limit=100`);
            if (res.ok) {
                const data = await res.json();
                setMessages(prev => {
                    const otherChannels = prev.filter(m => m.channelId !== channel);
                    const mapped = (data.messages || []).map(mapApiMessage);
                    return [...otherChannels, ...mapped];
                });
            }
        } catch (e) { /* offline fallback */ }
    }, []);

    // Load all channels on mount
    useEffect(() => {
        ['general', 'kitchen', 'bar', 'management', 'alerts'].forEach(ch => fetchMessages(ch));
    }, [fetchMessages]);

    // Load online staff from API
    useEffect(() => {
        (async () => {
            try {
                const res = await fetch(`${API_BASE}/api/hive/staff/online`);
                if (res.ok) {
                    const data = await res.json();
                    setOnlineStaff((data.staff || []).map((s: Record<string, unknown>) => ({
                        name: s.name as string, initials: s.initials as string,
                        color: s.color as string, role: s.role as string,
                        status: (s.status as OnlineStaff['status']) || 'online',
                    })));
                }
            } catch { /* offline */ }
        })();
    }, []);
    const [searchQuery, setSearchQuery] = useState('');
    const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editText, setEditText] = useState('');
    const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null);
    const [typingUsers] = useState<string[]>(['Chef Marco']);
    const [showAttachMenu, setShowAttachMenu] = useState(false);
    const [showQuickPicker, setShowQuickPicker] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);
    const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [forwardingMsg, setForwardingMsg] = useState<ChatMessage | null>(null);

    // ─── Tier 1-3 Feature State ─────────────────────────────────────────
    const [showBookmarks, setShowBookmarks] = useState(false);
    const [showScheduler, setShowScheduler] = useState<string | null>(null); // msg id being scheduled
    const [scheduleTime, setScheduleTime] = useState('');
    const [showPollCreator, setShowPollCreator] = useState(false);
    const [pollQuestion, setPollQuestion] = useState('');
    const [pollOptions, setPollOptions] = useState(['', '']);
    const [showReminderPicker, setShowReminderPicker] = useState<string | null>(null);
    const [reminders, setReminders] = useState<{ msgId: string; time: string; text: string }[]>([]);
    const [showTemplates, setShowTemplates] = useState(false);
    const [messageTemplates] = useState([
        { id: 't1', name: 'Shift Handover', text: '📋 **Shift Handover Report**\n- Pending orders: \n- Notes: \n- Issues: ' },
        { id: 't2', name: 'Daily Special', text: '🍽️ **Today\'s Special**: \n💰 Price: €\n⏰ Available: until sold out' },
        { id: 't3', name: 'Kitchen Alert', text: '🔴 **KITCHEN ALERT**\n- Item: \n- Status: 86\'d / Low Stock\n- ETA: ' },
        { id: 't4', name: 'Staff Update', text: '👥 **Staff Update**\n- Who: \n- What: \n- When: ' },
        { id: 't5', name: 'Reservation Note', text: '📞 **Reservation**\n- Name: \n- Covers: \n- Time: \n- Notes: ' },
    ]);
    const [staffStatus, setStaffStatus] = useState<{ emoji: string; label: string }>({ emoji: '🟢', label: 'Available' });
    const [showStatusPicker, setShowStatusPicker] = useState(false);
    const [mutedChannels, setMutedChannels] = useState<string[]>([]);
    const [showReceiptsDetail, setShowReceiptsDetail] = useState<string | null>(null);
    const [lastReadTimestamp, setLastReadTimestamp] = useState<string>('14:35');

    // ─── Message Settings State ──────────────────────────────────────
    const [ttsRate, setTtsRate] = useState(1.4);
    const [ttsVoiceName, setTtsVoiceName] = useState('');
    const [recognitionLang, setRecognitionLang] = useState('en-US');
    const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);

    // Load available voices (they load asynchronously in some browsers)
    useEffect(() => {
        const loadVoices = () => {
            const voices = getAvailableVoices();
            if (voices.length > 0) setAvailableVoices(voices);
        };
        loadVoices();
        if ('speechSynthesis' in window) {
            window.speechSynthesis.onvoiceschanged = loadVoices;
        }
    }, []);

    const ttsConfig: TTSConfig = useMemo(() => ({
        rate: ttsRate,
        voiceName: ttsVoiceName || undefined,
    }), [ttsRate, ttsVoiceName]);

    // Voice dictation — mic button fills the input field
    const { isListening, interimText, toggleDictation, isSupported: dictationSupported } = useVoiceDictation({
        onResult: (text: string) => setMessageInput(prev => (prev + ' ' + text).trim()),
        onInterim: () => { /* interim shown via interimText state */ },
        lang: recognitionLang,
    });

    // TTS — read a message aloud
    const handleSpeak = useCallback((msgId: string, text: string) => {
        if (speakingMsgId === msgId && isSpeaking()) {
            stopSpeaking();
            setSpeakingMsgId(null);
        } else {
            speakMessage(text, ttsConfig);
            setSpeakingMsgId(msgId);
            // Clear speaking state when done
            const checkDone = setInterval(() => {
                if (!isSpeaking()) {
                    setSpeakingMsgId(null);
                    clearInterval(checkDone);
                }
            }, 300);
        }
    }, [speakingMsgId]);

    // PTT — use global context (shared with FloatingPTT + Space bar + AirPods)
    const {
        isTalking, isConnected, startTalking, stopTalking, micPermission,
        liveTranscript, callLog, clearCallLog, liveSpeakers,
        activeChannel, setActiveChannel, setOnTransmissionEnd,
    } = useGlobalPTT();

    // Register voice message injection callback
    useEffect(() => {
        setOnTransmissionEnd((result: TransmissionResult) => {
            const voiceMsg: ChatMessage = {
                id: `voice-${Date.now()}`,
                channelId: result.channelId,
                sender: senderName,
                senderInitials: senderInitials,
                senderColor: 'bg-zinc-600',
                text: result.transcript || '🎙️ Voice message',
                timestamp: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                isVoice: true,
                voiceDuration: result.duration,
                audioUrl: result.audioUrl,
            };
            setMessages(prev => [...prev, voiceMsg]);
        });
        return () => setOnTransmissionEnd(null);
    }, [setOnTransmissionEnd]);

    // Filter messages
    const channelMessages = useMemo(() => {
        let msgs = messages.filter(m => m.channelId === activeChannel);
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            msgs = msgs.filter(m => m.text.toLowerCase().includes(q) || m.sender.toLowerCase().includes(q));
        }
        return msgs;
    }, [messages, activeChannel, searchQuery]);

    const activeChannelData = CHANNELS.find(c => c.id === activeChannel);
    const pinnedMessages = channelMessages.filter(m => m.isPinned);

    // Auto-scroll
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [channelMessages]);

    // Notification sound via Web Audio API
    const playNotifSound = useCallback(() => {
        try {
            const ctx = new AudioContext();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.setValueAtTime(880, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.15);
            gain.gain.setValueAtTime(0.05, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.2);
        } catch {
            // Audio not available
        }
    }, []);

    // Send message (API + optimistic)
    const handleSend = useCallback(async () => {
        if (!messageInput.trim()) return;
        const tempId = `msg-${Date.now()}`;
        const ts = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const newMsg: ChatMessage = {
            id: tempId, channelId: activeChannel, sender: senderName,
            senderInitials, senderColor: 'bg-zinc-600', text: messageInput,
            timestamp: ts, replyTo: replyingTo?.id,
            replyPreview: replyingTo ? replyingTo.text.substring(0, 60) + (replyingTo.text.length > 60 ? '...' : '') : undefined,
        };
        setMessages(prev => [...prev, newMsg]);
        setMessageInput('');
        setReplyingTo(null);
        playNotifSound();
        try {
            const res = await fetch(`${API_BASE}/api/hive/messages`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    channel_id: activeChannel, sender: senderName,
                    sender_initials: senderInitials, sender_color: 'bg-zinc-600',
                    text: newMsg.text, reply_to: newMsg.replyTo, reply_preview: newMsg.replyPreview,
                }),
            });
            if (res.ok) {
                const saved = await res.json();
                setMessages(prev => prev.map(m => m.id === tempId ? mapApiMessage(saved) : m));
            }
        } catch { /* offline - keep optimistic */ }
    }, [messageInput, activeChannel, replyingTo, playNotifSound, senderName, senderInitials]);

    // Edit message (API + optimistic)
    const handleSaveEdit = useCallback(async (msgId: string) => {
        if (!editText.trim()) return;
        setMessages(prev => prev.map(m => m.id === msgId ? { ...m, text: editText, isEdited: true } : m));
        setEditingId(null);
        setEditText('');
        try {
            await fetch(`${API_BASE}/api/hive/messages/${msgId}`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: editText }),
            });
        } catch { /* offline */ }
    }, [editText]);

    // Delete message (API + optimistic)
    const handleDelete = useCallback(async (msgId: string) => {
        setMessages(prev => prev.filter(m => m.id !== msgId));
        try {
            await fetch(`${API_BASE}/api/hive/messages/${msgId}`, { method: 'DELETE' });
        } catch { /* offline */ }
    }, []);

    // Add reaction (API + optimistic)
    const addReaction = useCallback(async (msgId: string, emoji: string) => {
        setMessages(prev => prev.map(m => {
            if (m.id !== msgId) return m;
            const reactions = { ...(m.reactions || {}) };
            const users = reactions[emoji] || [];
            if (users.includes(senderName)) {
                reactions[emoji] = users.filter(u => u !== senderName);
                if (reactions[emoji].length === 0) delete reactions[emoji];
            } else {
                reactions[emoji] = [...users, senderName];
            }
            return { ...m, reactions };
        }));
        setShowEmojiPicker(null);
        try {
            await fetch(`${API_BASE}/api/hive/messages/${msgId}/reaction`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ emoji, user_name: senderName }),
            });
        } catch { /* offline */ }
    }, [senderName]);

    // Toggle pin (API + optimistic)
    const togglePin = useCallback(async (msgId: string) => {
        setMessages(prev => prev.map(m => m.id === msgId ? { ...m, isPinned: !m.isPinned } : m));
        try {
            await fetch(`${API_BASE}/api/hive/messages/${msgId}/pin`, { method: 'PUT' });
        } catch { /* offline */ }
    }, []);

    // ─── Audio playback (voice messages & call log) ──────────────────
    const playAudio = useCallback((audioUrl: string, itemId: string) => {
        // Stop current playback
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.src = '';
            audioRef.current = null;
        }
        // If same item, just stop
        if (playingAudioId === itemId) {
            setPlayingAudioId(null);
            return;
        }
        const audio = new Audio(audioUrl);
        audio.onended = () => {
            setPlayingAudioId(null);
            audioRef.current = null;
        };
        audio.onerror = () => {
            setPlayingAudioId(null);
            audioRef.current = null;
        };
        audioRef.current = audio;
        setPlayingAudioId(itemId);
        audio.play().catch(() => {
            setPlayingAudioId(null);
            audioRef.current = null;
        });
    }, [playingAudioId]);

    // ─── Forward message to another channel ──────────────────────────
    const forwardMessage = useCallback((msg: ChatMessage, targetChannelId: string) => {
        const forwardedMsg: ChatMessage = {
            id: `msg-${Date.now()}`,
            sender: msg.sender,
            senderInitials: msg.senderInitials,
            senderColor: msg.senderColor,
            text: msg.text,
            timestamp: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
            channelId: targetChannelId,
            isVoice: msg.isVoice,
            voiceDuration: msg.voiceDuration,
            audioUrl: msg.audioUrl,
            attachments: msg.attachments,
            replyTo: undefined,
            replyPreview: `↪ Forwarded from #${msg.channelId || 'general'}`,
        };
        setMessages(prev => [...prev, forwardedMsg]);
        setForwardingMsg(null);
    }, []);

    // ─── Tier 1: Bookmark (API + optimistic) ────────────────────────────
    const toggleBookmark = useCallback(async (msgId: string) => {
        setMessages(prev => prev.map(m => m.id === msgId ? { ...m, isBookmarked: !m.isBookmarked } : m));
        try {
            await fetch(`${API_BASE}/api/hive/messages/${msgId}/bookmark`, { method: 'PUT' });
        } catch { /* offline */ }
    }, []);

    // ─── Tier 1: Priority Flag (API + optimistic) ───────────────────────
    const togglePriority = useCallback(async (msgId: string) => {
        setMessages(prev => prev.map(m => m.id === msgId ? { ...m, isPriority: !m.isPriority } : m));
        try {
            await fetch(`${API_BASE}/api/hive/messages/${msgId}/priority`, { method: 'PUT' });
        } catch { /* offline */ }
    }, []);

    // ─── Tier 2: Translate Message (simulated — Google Translate API in prod) ──
    const translateMessage = useCallback((msgId: string) => {
        setMessages(prev => prev.map(m => {
            if (m.id !== msgId) return m;
            if (m.isTranslated) return { ...m, isTranslated: false, translatedText: undefined };
            // Simulated translation — in production this calls Google Translate API
            const translated = `[Translated] ${m.text}`;
            return { ...m, isTranslated: true, translatedText: translated };
        }));
    }, []);

    // ─── Tier 1: Poll Vote ───────────────────────────────────────────────
    const votePoll = useCallback((msgId: string, optionId: string) => {
        setMessages(prev => prev.map(m => {
            if (m.id !== msgId || !m.poll) return m;
            const updatedOptions = m.poll.options.map(opt => {
                if (opt.id !== optionId) return opt;
                const hasVoted = opt.votes.includes('You');
                return { ...opt, votes: hasVoted ? opt.votes.filter(v => v !== 'You') : [...opt.votes, 'You'] };
            });
            return { ...m, poll: { ...m.poll, options: updatedOptions } };
        }));
    }, []);

    // ─── Tier 1: Set Reminder ────────────────────────────────────────────
    const setMsgReminder = useCallback((msgId: string, minutes: number) => {
        const now = new Date();
        const rem = new Date(now.getTime() + minutes * 60000);
        const timeStr = rem.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
        const msg = messages.find(m => m.id === msgId);
        setReminders(prev => [...prev, { msgId, time: timeStr, text: msg?.text?.slice(0, 50) || 'Message' }]);
        setShowReminderPicker(null);
        // Auto-remove reminder after timeout (simulated notification)
        setTimeout(() => {
            setReminders(prev => prev.filter(r => r.msgId !== msgId));
        }, minutes * 60000);
    }, [messages]);

    // ─── Tier 1: Schedule Message ────────────────────────────────────────
    const sendScheduledMessage = useCallback(() => {
        if (!messageInput.trim() || !scheduleTime) return;
        const newMsg: ChatMessage = {
            id: `msg-${Date.now()}`,
            channelId: activeChannel,
            sender: 'You',
            senderInitials: 'YO',
            senderColor: 'bg-blue-600',
            text: messageInput,
            timestamp: scheduleTime,
            isScheduled: true,
            scheduledTime: scheduleTime,
        };
        setMessages(prev => [...prev, newMsg]);
        setMessageInput('');
        setScheduleTime('');
        setShowScheduler(null);
    }, [messageInput, scheduleTime, activeChannel]);

    // ─── Tier 1: Create Poll ─────────────────────────────────────────────
    const createPollMessage = useCallback(() => {
        if (!pollQuestion.trim() || pollOptions.filter(o => o.trim()).length < 2) return;
        const newMsg: ChatMessage = {
            id: `msg-${Date.now()}`,
            channelId: activeChannel,
            sender: 'You',
            senderInitials: 'YO',
            senderColor: 'bg-blue-600',
            text: `📊 Poll: ${pollQuestion}`,
            timestamp: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
            poll: {
                question: pollQuestion,
                options: pollOptions.filter(o => o.trim()).map((o, i) => ({
                    id: `opt-${i}`,
                    text: o.trim(),
                    votes: [],
                })),
            },
        };
        setMessages(prev => [...prev, newMsg]);
        setPollQuestion('');
        setPollOptions(['', '']);
        setShowPollCreator(false);
    }, [pollQuestion, pollOptions, activeChannel]);

    // ─── Tier 3: Use Template ────────────────────────────────────────────
    const useTemplate = useCallback((templateText: string) => {
        setMessageInput(templateText);
        setShowTemplates(false);
        inputRef.current?.focus();
    }, []);

    // ─── Tier 3: AI Summary ──────────────────────────────────────────────
    const aiSummarize = useCallback(() => {
        const channelMsgs = messages.filter(m => m.channelId === activeChannel).slice(-20);
        const summary = channelMsgs.map(m => `${m.sender}: ${m.text}`).join(' | ');
        const summaryMsg: ChatMessage = {
            id: `msg-${Date.now()}`,
            channelId: activeChannel,
            sender: '✨ AI Assistant',
            senderInitials: 'AI',
            senderColor: 'bg-gradient-to-r from-purple-600 to-pink-600',
            text: `📝 **Channel Summary** (last ${channelMsgs.length} messages):\n${summary.slice(0, 300)}...`,
            timestamp: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages(prev => [...prev, summaryMsg]);
    }, [messages, activeChannel]);

    // ─── Tier 2: Toggle Channel Mute ─────────────────────────────────────
    const toggleChannelMute = useCallback((channelId: string) => {
        setMutedChannels(prev => prev.includes(channelId) ? prev.filter(c => c !== channelId) : [...prev, channelId]);
    }, []);

    // ─── Computed: bookmarked & filtered messages ────────────────────────
    const bookmarkedMessages = useMemo(() => messages.filter(m => m.isBookmarked), [messages]);

    // Task management (stateful)
    const [tasks, setTasks] = useState<MicroTask[]>([]);

    // Load tasks from API on mount
    useEffect(() => {
        (async () => {
            try {
                const res = await fetch(`${API_BASE}/api/hive/tasks`);
                if (res.ok) {
                    const data = await res.json();
                    setTasks((data.tasks || []).map((t: Record<string, unknown>) => ({
                        id: t.id as string,
                        title: t.title as string,
                        urgency: (t.urgency as MicroTask['urgency']) || 'MEDIUM',
                        xp: (t.xp as number) || 50,
                        assignedTo: t.assigned_to as string | undefined,
                        department: t.department as string | undefined,
                        deadline: t.deadline as string | undefined,
                        status: (t.status as MicroTask['status']) || 'pool',
                        recurrence: (t.recurrence as MicroTask['recurrence']) || 'none',
                        startedAt: t.started_at as string | undefined,
                        completedAt: t.completed_at as string | undefined,
                        sourceMessageId: t.source_message_id as string | undefined,
                        sourceMessageText: t.source_message_text as string | undefined,
                        sourceChannelId: t.source_channel_id as string | undefined,
                    })));
                }
            } catch { /* offline */ }
        })();
    }, []);
    const [showCreateTask, setShowCreateTask] = useState(false);
    const [createFromMessage, setCreateFromMessage] = useState<ChatMessage | null>(null);
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [newTaskUrgency, setNewTaskUrgency] = useState<MicroTask['urgency']>('MEDIUM');
    const [newTaskAssignee, setNewTaskAssignee] = useState('');
    const [newTaskDeadline, setNewTaskDeadline] = useState('');
    const [newTaskRecurrence, setNewTaskRecurrence] = useState<MicroTask['recurrence']>('none');

    // Task actions (API + optimistic)
    const claimTask = useCallback(async (taskId: string) => {
        setTasks(prev => prev.map(t =>
            t.id === taskId ? { ...t, status: 'assigned' as const, assignedTo: 'You' } : t
        ));
        try {
            await fetch(`${API_BASE}/api/hive/tasks/${taskId}`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'assigned', assigned_to: senderName }),
            });
        } catch { /* offline */ }
    }, [senderName]);

    const startTask = useCallback(async (taskId: string) => {
        setTasks(prev => prev.map(t =>
            t.id === taskId ? { ...t, status: 'in-progress' as const, startedAt: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) } : t
        ));
        try {
            await fetch(`${API_BASE}/api/hive/tasks/${taskId}`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'in-progress' }),
            });
        } catch { /* offline */ }
    }, []);

    const completeTask = useCallback(async (taskId: string) => {
        setTasks(prev => prev.map(t =>
            t.id === taskId ? { ...t, status: 'done' as const, completedAt: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) } : t
        ));
        try {
            await fetch(`${API_BASE}/api/hive/tasks/${taskId}`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'done' }),
            });
        } catch { /* offline */ }
    }, []);

    const createTaskFromMessage = useCallback((msg: ChatMessage) => {
        setCreateFromMessage(msg);
        setNewTaskTitle(msg.text.substring(0, 80));
        setNewTaskUrgency('MEDIUM');
        setNewTaskAssignee('');
        setNewTaskDeadline('');
        setNewTaskRecurrence('none');
        setShowCreateTask(true);
    }, []);

    // Announce a task as a chat message in the active channel
    const announceTaskInChat = useCallback(async (task: MicroTask) => {
        const urgencyEmoji = task.urgency === 'CRITICAL' ? '🚨' : task.urgency === 'HIGH' ? '🔴' : task.urgency === 'MEDIUM' ? '🟡' : '🟢';
        const assigneeText = task.assignedTo ? ` → Assigned to @${task.assignedTo}` : ' → Open for claims';
        const deadlineText = task.deadline ? ` ⏰ Due by ${task.deadline}` : '';
        const xpText = ` ⚡${task.xp} XP`;
        const announcementText = `📋 **New Task Created** ${urgencyEmoji} ${task.urgency}\n${task.title}${assigneeText}${deadlineText}${xpText}`;

        const tempId = `msg-${Date.now()}`;
        const ts = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const newMsg: ChatMessage = {
            id: tempId, channelId: activeChannel, sender: senderName,
            senderInitials, senderColor: 'bg-emerald-600', text: announcementText,
            timestamp: ts,
        };
        setMessages(prev => [...prev, newMsg]);
        playNotifSound();
        try {
            const res = await fetch(`${API_BASE}/api/hive/messages`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    channel_id: activeChannel, sender: senderName,
                    sender_initials: senderInitials, sender_color: 'bg-emerald-600',
                    text: announcementText,
                }),
            });
            if (res.ok) {
                const saved = await res.json();
                setMessages(prev => prev.map(m => m.id === tempId ? mapApiMessage(saved) : m));
            }
        } catch { /* offline */ }
    }, [activeChannel, senderName, senderInitials, playNotifSound]);

    const [announceAfterCreate, setAnnounceAfterCreate] = useState(true);

    const submitNewTask = useCallback(async () => {
        if (!newTaskTitle.trim()) return;
        const xp = newTaskUrgency === 'CRITICAL' ? 200 : newTaskUrgency === 'HIGH' ? 100 : newTaskUrgency === 'MEDIUM' ? 50 : 30;
        const tempTask: MicroTask = {
            id: `task-${Date.now()}`,
            title: newTaskTitle.trim(),
            urgency: newTaskUrgency,
            xp,
            status: newTaskAssignee ? 'assigned' : 'pool',
            assignedTo: newTaskAssignee || undefined,
            deadline: newTaskDeadline || undefined,
            recurrence: newTaskRecurrence,
            sourceMessageId: createFromMessage?.id,
            sourceMessageText: createFromMessage?.text?.substring(0, 120),
            sourceChannelId: createFromMessage?.channelId,
        };
        setTasks(prev => [tempTask, ...prev]);
        setShowCreateTask(false);
        setCreateFromMessage(null);
        setNewTaskTitle('');

        // Auto-announce task in chat
        if (announceAfterCreate) {
            announceTaskInChat(tempTask);
        }

        try {
            const res = await fetch(`${API_BASE}/api/hive/tasks`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: tempTask.title, urgency: tempTask.urgency, xp,
                    assigned_to: tempTask.assignedTo, deadline: tempTask.deadline,
                    recurrence: tempTask.recurrence, source_message_id: tempTask.sourceMessageId,
                    source_message_text: tempTask.sourceMessageText,
                    source_channel_id: tempTask.sourceChannelId,
                }),
            });
            if (res.ok) {
                const saved = await res.json();
                setTasks(prev => prev.map(t => t.id === tempTask.id ? { ...t, id: saved.id } : t));
            }
        } catch { /* offline */ }
    }, [newTaskTitle, newTaskUrgency, newTaskAssignee, newTaskDeadline, newTaskRecurrence, createFromMessage, announceAfterCreate, announceTaskInChat]);

    const poolTasks = tasks.filter(t => t.status === 'pool');
    const myTasks = tasks.filter(t => (t.status === 'assigned' || t.status === 'in-progress') && t.assignedTo === 'You');
    const allActiveTasks = tasks.filter(t => t.status !== 'done');
    const doneTasks = tasks.filter(t => t.status === 'done');

    return (
        <div className="h-[calc(100vh-5rem)] -m-4 lg:-m-6 flex bg-zinc-950 text-zinc-100 overflow-hidden">

            {/* ─── LEFT: Channels & Staff ───────────────────────────────── */}
            <div className="w-64 flex-shrink-0 border-r border-zinc-800/50 flex flex-col bg-gradient-to-b from-zinc-950 via-zinc-950 to-zinc-900/80">
                {/* Header — Premium Gradient */}
                <div className="p-4 border-b border-zinc-800/50 bg-gradient-to-r from-amber-500/5 via-zinc-950 to-violet-500/5">
                    <h2 className="text-lg font-bold flex items-center gap-2">
                        <motion.span
                            className="text-2xl drop-shadow-[0_0_8px_rgba(245,158,11,0.4)]"
                            animate={{ rotate: [0, 10, -10, 0] }}
                            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                        >
                            🐝
                        </motion.span>
                        <span className="bg-gradient-to-r from-amber-200 via-zinc-100 to-violet-200 bg-clip-text text-transparent">THE HIVE</span>
                    </h2>
                    <p className="text-[10px] text-zinc-500 mt-1 tracking-wider uppercase">Team Communication Hub</p>
                </div>

                {/* Search — Glassmorphism */}
                <div className="px-3 py-2.5">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
                        <Input
                            placeholder="Search messages..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="bg-zinc-900/60 border-zinc-800/60 text-zinc-300 placeholder:text-zinc-600 pl-8 h-8 text-xs rounded-lg backdrop-blur-sm focus:ring-1 focus:ring-amber-500/30 focus:border-amber-500/30 transition-all"
                        />
                    </div>
                </div>

                {/* Channels — Premium List */}
                <div className="px-3 py-2">
                    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-600 mb-2 flex items-center gap-1.5">
                        <Hash className="h-3 w-3" />
                        Channels
                    </p>
                    <div className="space-y-0.5">
                        {CHANNELS.map(ch => (
                            <button
                                key={ch.id}
                                onClick={() => setActiveChannel(ch.id)}
                                className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm transition-all duration-200 ${activeChannel === ch.id
                                    ? 'bg-gradient-to-r from-zinc-800 to-zinc-800/60 text-zinc-100 shadow-sm shadow-zinc-900/50 border border-zinc-700/30'
                                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50'
                                    }`}
                            >
                                <ch.icon className={`h-4 w-4 ${ch.color}`} />
                                <span className="flex-1 text-left">{ch.name}</span>
                                {ch.unread > 0 && (
                                    <Badge className="h-4 min-w-[16px] px-1 text-[10px] bg-blue-600 text-white border-0">
                                        {ch.unread}
                                    </Badge>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Direct Messages */}
                <div className="px-3 py-2">
                    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-600 mb-2 flex items-center gap-1.5">
                        <MessageSquare className="h-3 w-3" />
                        Direct Messages
                    </p>
                    <div className="space-y-0.5">
                        {onlineStaff.filter(s => s.status === 'online').slice(0, 3).map(s => {
                            const dmId = `dm-${s.name.toLowerCase().replace(/\s+/g, '-')}`;
                            return (
                                <button
                                    key={dmId}
                                    onClick={() => setActiveChannel(dmId)}
                                    className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm transition-all duration-200 ${activeChannel === dmId
                                        ? 'bg-gradient-to-r from-zinc-800 to-zinc-800/60 text-zinc-100 shadow-sm border border-zinc-700/30'
                                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50'
                                        }`}
                                    title={`DM ${s.name}`}
                                >
                                    <div className="relative">
                                        <div className={`h-5 w-5 rounded-full ${s.color} flex items-center justify-center`}>
                                            <span className="text-white text-[8px] font-bold">{s.initials}</span>
                                        </div>
                                        <div className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-500 border border-zinc-950" />
                                    </div>
                                    <span className="flex-1 text-left truncate">{s.name}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Online Staff */}
                <div className="px-3 py-2 flex-1 overflow-auto">
                    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-600 mb-2 flex items-center gap-1.5">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                        </span>
                        Online — {onlineStaff.filter(s => s.status === 'online').length}
                    </p>
                    <div className="space-y-0.5">
                        {onlineStaff.map(s => {
                            const dmId = `dm-${s.name.toLowerCase().replace(/\s+/g, '-')}`;
                            return (
                                <div
                                    key={s.name}
                                    className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-zinc-900/50 cursor-pointer transition-all duration-200"
                                    onClick={() => setActiveChannel(dmId)}
                                    title={`Open DM with ${s.name}`}
                                >
                                    <div className="relative">
                                        <div className={`h-7 w-7 rounded-full ${s.color} flex items-center justify-center`}>
                                            <span className="text-white text-[10px] font-bold">{s.initials}</span>
                                        </div>
                                        <div className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-zinc-950 ${s.status === 'online' ? 'bg-emerald-500' :
                                            s.status === 'busy' ? 'bg-red-500' : 'bg-amber-500'
                                            }`} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-medium text-zinc-300 truncate">{s.name}</p>
                                        <p className="text-[10px] text-zinc-600">{s.role}</p>
                                    </div>
                                </div>);
                        })}
                    </div>
                </div>

                {/* PTT Quick Access */}
                <div className="p-3 border-t border-zinc-800">
                    <button
                        onMouseDown={startTalking}
                        onMouseUp={stopTalking}
                        onMouseLeave={stopTalking}
                        onTouchStart={startTalking}
                        onTouchEnd={stopTalking}
                        className={`w-full py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${isTalking
                            ? 'bg-red-600 text-white shadow-[0_0_20px_rgba(239,68,68,0.4)] scale-[1.02]'
                            : micPermission === 'denied'
                                ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                                : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700 active:bg-red-600'
                            }`}
                        disabled={micPermission === 'denied'}
                    >
                        {isTalking ? (
                            <><Volume2 className="h-4 w-4 animate-pulse" /> TRANSMITTING...</>
                        ) : (
                            <><Radio className="h-4 w-4" /> HOLD TO TALK</>
                        )}
                    </button>
                </div>
            </div>

            {/* ─── CENTER: Chat ─────────────────────────────────────────── */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Channel Header */}
                <div className="h-14 border-b border-zinc-800 flex items-center px-4 gap-3 bg-zinc-950/80 backdrop-blur-sm flex-shrink-0">
                    {activeChannelData && (
                        <>
                            <activeChannelData.icon className={`h-5 w-5 ${activeChannelData.color}`} />
                            <div>
                                <h3 className="font-semibold text-zinc-100 text-sm">{activeChannelData.name}</h3>
                                <p className="text-[10px] text-zinc-500">{activeChannelData.description}</p>
                            </div>
                            <Badge variant="outline" className="text-[10px] border-zinc-700 text-zinc-400 ml-2">
                                {channelMessages.length} msgs
                            </Badge>
                        </>
                    )}
                    <div className="flex-1" />
                    {pinnedMessages.length > 0 && (
                        <Button variant="ghost" size="sm" className="h-7 text-xs text-amber-400 hover:text-amber-300" title="View pinned messages">
                            <Pin className="h-3 w-3 mr-1" /> {pinnedMessages.length} Pinned
                        </Button>
                    )}
                    {bookmarkedMessages.length > 0 && (
                        <Button
                            variant="ghost" size="sm"
                            className={`h-7 text-xs ${showBookmarks ? 'text-amber-400' : 'text-zinc-400 hover:text-amber-400'}`}
                            onClick={() => setShowBookmarks(!showBookmarks)}
                            title="View bookmarked messages"
                        >
                            <Bookmark className="h-3 w-3 mr-1" /> {bookmarkedMessages.length}
                        </Button>
                    )}
                    <Button
                        variant="ghost" size="sm"
                        className="h-7 text-xs text-zinc-400 hover:text-purple-400"
                        onClick={aiSummarize}
                        title="AI channel summary"
                    >
                        <Sparkles className="h-3 w-3 mr-1" /> Summary
                    </Button>
                    <Button
                        variant="ghost" size="sm"
                        className="h-7 text-xs text-zinc-400 hover:text-purple-400"
                        onClick={() => setShowPollCreator(!showPollCreator)}
                        title="Create a poll"
                    >
                        <BarChart3 className="h-3 w-3 mr-1" /> Poll
                    </Button>
                    <Button
                        variant="ghost" size="sm"
                        className="h-7 text-xs text-zinc-400 hover:text-blue-400"
                        onClick={() => setShowTemplates(!showTemplates)}
                        title="Message templates"
                    >
                        <Layout className="h-3 w-3 mr-1" /> Templates
                    </Button>
                    <Button
                        variant="ghost" size="sm"
                        className={`h-7 text-xs ${mutedChannels.includes(activeChannel) ? 'text-red-400' : 'text-zinc-400 hover:text-zinc-100'}`}
                        onClick={() => toggleChannelMute(activeChannel)}
                        title={mutedChannels.includes(activeChannel) ? 'Unmute channel' : 'Mute channel'}
                    >
                        {mutedChannels.includes(activeChannel) ? <VolumeX className="h-3 w-3 mr-1" /> : <Volume2 className="h-3 w-3 mr-1" />}
                        {mutedChannels.includes(activeChannel) ? 'Muted' : 'Mute'}
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 text-xs text-zinc-400 hover:text-zinc-100" title="Online staff">
                        <Users className="h-3 w-3 mr-1" /> {onlineStaff.length}
                    </Button>
                    {/* Staff Status Picker */}
                    <div className="relative">
                        <button
                            onClick={() => setShowStatusPicker(!showStatusPicker)}
                            className="h-7 px-2 rounded-md text-xs flex items-center gap-1 bg-zinc-800/50 text-zinc-300 hover:bg-zinc-800 transition-colors"
                            title="Set your status"
                        >
                            <span>{staffStatus.emoji}</span>
                            <span className="text-[10px]">{staffStatus.label}</span>
                        </button>
                        <AnimatePresence>
                            {showStatusPicker && (
                                <motion.div
                                    className="absolute top-8 right-0 bg-zinc-900 border border-zinc-700 rounded-xl p-2 shadow-xl z-30 min-w-[140px]"
                                    initial={{ opacity: 0, scale: 0.9, y: -5 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.9, y: -5 }}
                                >
                                    {[
                                        { emoji: '🟢', label: 'Available' },
                                        { emoji: '🔴', label: 'Busy' },
                                        { emoji: '🟡', label: 'Away' },
                                        { emoji: '🍽️', label: 'On Break' },
                                        { emoji: '🏃', label: 'In Service' },
                                        { emoji: '🧹', label: 'Cleaning' },
                                    ].map(s => (
                                        <button
                                            key={s.label}
                                            onClick={() => { setStaffStatus(s); setShowStatusPicker(false); }}
                                            className={`w-full text-left px-2 py-1.5 rounded-md text-xs transition-colors ${staffStatus.label === s.label ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-300 hover:bg-zinc-800'}`}
                                            title={`Set status: ${s.label}`}
                                        >
                                            {s.emoji} {s.label}
                                        </button>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Reminders Banner */}
                <AnimatePresence>
                    {reminders.length > 0 && (
                        <motion.div
                            className="px-4 py-2 bg-violet-500/10 border-b border-violet-500/20 flex items-center gap-2"
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                        >
                            <AlarmClock className="h-3.5 w-3.5 text-violet-400" />
                            <span className="text-xs text-violet-300">
                                {reminders.length} reminder{reminders.length > 1 ? 's' : ''} set
                            </span>
                            {reminders.map(r => (
                                <Badge key={r.msgId} className="text-[9px] bg-violet-500/20 text-violet-300 border-0">
                                    {r.time} — {r.text}
                                </Badge>
                            ))}
                            <div className="flex-1" />
                            <button onClick={() => setReminders([])} className="h-5 w-5 rounded hover:bg-violet-500/20 flex items-center justify-center text-violet-400 hover:text-violet-300" title="Dismiss all reminders">
                                <X className="h-3 w-3" />
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Poll Creator Drawer */}
                <AnimatePresence>
                    {showPollCreator && (
                        <motion.div
                            className="px-4 py-3 bg-zinc-900/90 border-b border-zinc-800 space-y-2"
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                        >
                            <div className="flex items-center justify-between">
                                <p className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                                    <BarChart3 className="h-3.5 w-3.5 text-purple-400" /> Create Poll
                                </p>
                                <button onClick={() => setShowPollCreator(false)} className="h-5 w-5 rounded hover:bg-zinc-800 flex items-center justify-center text-zinc-500 hover:text-zinc-300" title="Close poll creator">
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            </div>
                            <Input
                                value={pollQuestion}
                                onChange={e => setPollQuestion(e.target.value)}
                                placeholder="Poll question..."
                                className="bg-zinc-800 border-zinc-700 text-zinc-200 text-sm h-8"
                            />
                            {pollOptions.map((opt, i) => (
                                <Input
                                    key={i}
                                    value={opt}
                                    onChange={e => {
                                        const newOpts = [...pollOptions];
                                        newOpts[i] = e.target.value;
                                        setPollOptions(newOpts);
                                    }}
                                    placeholder={`Option ${i + 1}`}
                                    className="bg-zinc-800 border-zinc-700 text-zinc-200 text-sm h-8"
                                />
                            ))}
                            <div className="flex gap-2">
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 text-xs text-zinc-400"
                                    onClick={() => setPollOptions([...pollOptions, ''])}
                                    title="Add another option"
                                >
                                    + Add Option
                                </Button>
                                <div className="flex-1" />
                                <Button size="sm" variant="ghost" className="h-7 text-xs text-zinc-400" onClick={() => setShowPollCreator(false)} title="Cancel poll">Cancel</Button>
                                <Button size="sm" className="h-7 text-xs bg-purple-600 hover:bg-purple-500 text-white" onClick={createPollMessage} title="Send poll">Send Poll</Button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Templates Drawer */}
                <AnimatePresence>
                    {showTemplates && (
                        <motion.div
                            className="px-4 py-3 bg-zinc-900/90 border-b border-zinc-800 space-y-1.5"
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                        >
                            <div className="flex items-center justify-between mb-1">
                                <p className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                                    <Layout className="h-3.5 w-3.5 text-blue-400" /> Message Templates
                                </p>
                                <button onClick={() => setShowTemplates(false)} className="h-5 w-5 rounded hover:bg-zinc-800 flex items-center justify-center text-zinc-500 hover:text-zinc-300" title="Close templates">
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            </div>
                            {messageTemplates.map(t => (
                                <button
                                    key={t.id}
                                    onClick={() => useTemplate(t.text)}
                                    className="w-full text-left px-3 py-2 rounded-lg bg-zinc-800/50 border border-zinc-700/50 hover:bg-zinc-800 hover:border-zinc-600 transition-colors"
                                    title={`Use template: ${t.name}`}
                                >
                                    <p className="text-xs font-medium text-zinc-200">{t.name}</p>
                                    <p className="text-[10px] text-zinc-500 truncate">{t.text.slice(0, 60)}...</p>
                                </button>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Bookmarks Drawer */}
                <AnimatePresence>
                    {showBookmarks && bookmarkedMessages.length > 0 && (
                        <motion.div
                            className="px-4 py-3 bg-zinc-900/90 border-b border-zinc-800 space-y-1.5 max-h-40 overflow-y-auto"
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                        >
                            <div className="flex items-center justify-between mb-1">
                                <p className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                                    <Bookmark className="h-3.5 w-3.5 fill-amber-400" /> Bookmarked Messages
                                </p>
                                <button onClick={() => setShowBookmarks(false)} className="h-5 w-5 rounded hover:bg-zinc-800 flex items-center justify-center text-zinc-500 hover:text-zinc-300" title="Close bookmarks">
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            </div>
                            {bookmarkedMessages.map(m => (
                                <div key={m.id} className="flex items-center gap-2 px-2 py-1 rounded bg-zinc-800/50 text-xs">
                                    <span className="text-zinc-400 font-medium">{m.sender}</span>
                                    <span className="text-zinc-500 truncate flex-1">{m.text.slice(0, 60)}</span>
                                    <span className="text-[10px] text-zinc-600">{m.timestamp}</span>
                                </div>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4">
                    <div className="space-y-3 max-w-3xl">
                        <AnimatePresence>
                            {channelMessages.map((msg, msgIndex) => {
                                // Unread separator
                                const showUnreadSep = msgIndex > 0 && msg.timestamp > lastReadTimestamp && channelMessages[msgIndex - 1].timestamp <= lastReadTimestamp;
                                return (
                                    <React.Fragment key={msg.id}>
                                        {showUnreadSep && (
                                            <div className="flex items-center gap-2 py-1">
                                                <div className="flex-1 h-px bg-red-500/40" />
                                                <span className="text-[10px] font-bold text-red-400 uppercase tracking-widest">New Messages</span>
                                                <div className="flex-1 h-px bg-red-500/40" />
                                            </div>
                                        )}
                                        <motion.div
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                                            className={`flex gap-3 group relative rounded-xl px-3 py-2.5 transition-all duration-200
                                                hover:bg-zinc-900/40 hover:backdrop-blur-sm
                                                ${msg.isPriority ? 'border-l-2 border-red-500/70 bg-red-500/[0.03] shadow-[inset_0_0_20px_rgba(239,68,68,0.03)]' : ''}
                                                ${msg.isBookmarked ? 'border-l-2 border-amber-500/50' : ''}
                                            `}
                                        >
                                            {/* Avatar with status ring */}
                                            <div className="relative flex-shrink-0">
                                                <div className={`h-9 w-9 rounded-full mt-0.5 ${msg.senderColor} flex items-center justify-center ring-2 ring-zinc-900 shadow-lg`}>
                                                    <span className="text-white text-[11px] font-bold tracking-tight">{msg.senderInitials}</span>
                                                </div>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                {/* Reply Reference */}
                                                {msg.replyTo && msg.replyPreview && (
                                                    <div className="flex items-center gap-1.5 mb-1 pl-2 border-l-2 border-zinc-700">
                                                        <Reply className="h-3 w-3 text-zinc-600 rotate-180" />
                                                        <span className="text-[10px] text-zinc-500 truncate max-w-xs">{msg.replyPreview}</span>
                                                    </div>
                                                )}

                                                <div className="flex items-center gap-1.5">
                                                    <p className="text-sm font-semibold text-zinc-200">{msg.sender}</p>
                                                    {msg.isPriority && <Flag className="h-3 w-3 text-red-400" />}
                                                    {msg.isBookmarked && <Bookmark className="h-3 w-3 text-amber-400 fill-amber-400" />}
                                                    {msg.isScheduled && (
                                                        <Badge className="text-[9px] bg-blue-600/20 text-blue-400 border-0 px-1 py-0">
                                                            <Clock className="h-2 w-2 mr-0.5" /> Scheduled {msg.scheduledTime}
                                                        </Badge>
                                                    )}
                                                    <span className="text-[10px] text-zinc-600">{msg.timestamp}</span>
                                                    {msg.isVoice && (
                                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-500/15 text-red-400 text-[10px] font-medium">
                                                            🎙️ Voice · {msg.voiceDuration}s
                                                        </span>
                                                    )}
                                                    {msg.isPinned && <Pin className="h-3 w-3 text-amber-500" />}
                                                    {msg.isEdited && <span className="text-[10px] text-zinc-600 italic">(edited)</span>}
                                                </div>

                                                {/* Message Body — Voice or Text */}
                                                {msg.isVoice ? (
                                                    <div className="mt-1 p-2 rounded-lg bg-zinc-900/80 border border-zinc-800 space-y-1">
                                                        {/* Waveform + Audio Playback */}
                                                        <div className="flex items-center gap-1.5">
                                                            {msg.audioUrl ? (
                                                                <button
                                                                    onClick={() => playAudio(msg.audioUrl as string, msg.id)}
                                                                    className="h-6 w-6 rounded-full bg-red-500/20 hover:bg-red-500/30 flex items-center justify-center text-red-400 transition-colors flex-shrink-0"
                                                                    title={playingAudioId === msg.id ? 'Stop playback' : 'Play voice message'}
                                                                >
                                                                    {playingAudioId === msg.id ? (
                                                                        <Pause className="h-3 w-3" />
                                                                    ) : (
                                                                        <Play className="h-3 w-3 ml-0.5" />
                                                                    )}
                                                                </button>
                                                            ) : (
                                                                <Mic className="h-3.5 w-3.5 text-red-400 flex-shrink-0" />
                                                            )}
                                                            <div className="flex items-end gap-0.5 h-4">
                                                                {Array.from({ length: 20 }).map((_, i) => (
                                                                    <div
                                                                        key={i}
                                                                        className={`w-1 rounded-full ${playingAudioId === msg.id ? 'bg-red-400 animate-pulse' : 'bg-red-500/60'}`}
                                                                        style={{ height: `${4 + Math.sin(i * 0.7) * 8 + Math.random() * 6}px` }}
                                                                    />
                                                                ))}
                                                            </div>
                                                            <span className="text-[10px] text-zinc-500 ml-1">{msg.voiceDuration}s</span>
                                                        </div>
                                                        {msg.text && msg.text !== '🎙️ Voice message' && (
                                                            <p className="text-xs text-zinc-400 italic leading-relaxed pl-5">
                                                                &quot;{msg.text}&quot;
                                                            </p>
                                                        )}
                                                    </div>
                                                ) : editingId === msg.id ? (
                                                    <div className="flex gap-2 mt-1">
                                                        <Input
                                                            value={editText}
                                                            onChange={e => setEditText(e.target.value)}
                                                            onKeyDown={e => { if (e.key === 'Enter') handleSaveEdit(msg.id); if (e.key === 'Escape') setEditingId(null); }}
                                                            className="bg-zinc-900 border-zinc-700 text-zinc-200 text-sm h-8 flex-1"
                                                            autoFocus
                                                        />
                                                        <Button size="sm" title="Save edit" className="h-8 bg-emerald-600 hover:bg-emerald-500 text-white" onClick={() => handleSaveEdit(msg.id)}>
                                                            <Check className="h-3 w-3" />
                                                        </Button>
                                                        <Button size="sm" title="Cancel edit" variant="ghost" className="h-8 text-zinc-400" onClick={() => setEditingId(null)}>
                                                            <X className="h-3 w-3" />
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <p className="text-sm text-zinc-300 mt-0.5 leading-relaxed">
                                                        <SmartMessageRenderer text={msg.text} onNavigate={handleSmartNavigate} />
                                                    </p>
                                                )}

                                                {/* Poll Display */}
                                                {msg.poll && (
                                                    <div className="mt-2 p-3 rounded-lg bg-zinc-900/80 border border-zinc-800 space-y-2">
                                                        <p className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
                                                            <BarChart3 className="h-3.5 w-3.5 text-purple-400" />
                                                            {msg.poll.question}
                                                        </p>
                                                        {msg.poll.options.map(opt => {
                                                            const totalVotes = msg.poll!.options.reduce((s, o) => s + o.votes.length, 0);
                                                            const pct = totalVotes > 0 ? Math.round((opt.votes.length / totalVotes) * 100) : 0;
                                                            const hasVoted = opt.votes.includes('You');
                                                            return (
                                                                <button
                                                                    key={opt.id}
                                                                    onClick={() => votePoll(msg.id, opt.id)}
                                                                    className={`w-full relative overflow-hidden rounded-md border text-left px-3 py-1.5 text-xs transition-colors ${hasVoted ? 'border-purple-500/40 bg-purple-500/10' : 'border-zinc-700 hover:border-zinc-600 bg-zinc-800/50'
                                                                        }`}
                                                                    title={`Vote for ${opt.text}`}
                                                                >
                                                                    <div
                                                                        className="absolute inset-y-0 left-0 bg-purple-500/15 transition-all"
                                                                        style={{ width: `${pct}%` }}
                                                                    />
                                                                    <div className="relative flex items-center justify-between">
                                                                        <span className="text-zinc-300">{opt.text}</span>
                                                                        <span className="text-zinc-500 text-[10px]">{opt.votes.length} ({pct}%)</span>
                                                                    </div>
                                                                </button>
                                                            );
                                                        })}
                                                        <p className="text-[10px] text-zinc-600">
                                                            {msg.poll.options.reduce((s, o) => s + o.votes.length, 0)} votes · Click to vote
                                                        </p>
                                                    </div>
                                                )}

                                                {/* Translation Display */}
                                                {msg.isTranslated && msg.translatedText && (
                                                    <div className="mt-1 p-2 rounded-md bg-emerald-500/10 border border-emerald-500/20">
                                                        <p className="text-[10px] text-emerald-400 flex items-center gap-1 mb-0.5">
                                                            <Languages className="h-2.5 w-2.5" /> Translated
                                                        </p>
                                                        <p className="text-xs text-zinc-300">{msg.translatedText}</p>
                                                    </div>
                                                )}

                                                {/* Attachments */}
                                                {msg.attachments && msg.attachments.length > 0 && (
                                                    <div className="flex flex-wrap gap-2 mt-1">
                                                        {msg.attachments.map((att, i) => (
                                                            <AttachmentBubble key={i} att={att} />
                                                        ))}
                                                    </div>
                                                )}

                                                {/* Reactions */}
                                                {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                                                    <div className="flex flex-wrap gap-1 mt-1.5">
                                                        {Object.entries(msg.reactions).map(([emoji, users]) => (
                                                            <button
                                                                key={emoji}
                                                                onClick={() => addReaction(msg.id, emoji)}
                                                                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[11px] transition-colors ${users.includes('You') ? 'bg-blue-500/20 border border-blue-500/30' : 'bg-zinc-800 hover:bg-zinc-700'
                                                                    }`}
                                                            >
                                                                <span>{emoji}</span>
                                                                <span className="text-zinc-400">{users.length}</span>
                                                            </button>
                                                        ))}
                                                        {/* Add reaction button */}
                                                        <button
                                                            onClick={() => setShowEmojiPicker(showEmojiPicker === msg.id ? null : msg.id)}
                                                            className="px-1.5 py-0.5 rounded-full bg-zinc-800/50 hover:bg-zinc-700 text-zinc-500 text-[11px] transition-colors"
                                                        >
                                                            +
                                                        </button>
                                                    </div>
                                                )}

                                                {/* Read Receipts */}
                                                {msg.readBy && msg.readBy.length > 0 && msg.sender === 'You' && (
                                                    <p className="text-[10px] text-zinc-600 mt-1 flex items-center gap-1">
                                                        <Check className="h-2.5 w-2.5" /> Seen by {msg.readBy.join(', ')}
                                                    </p>
                                                )}
                                            </div>

                                            {/* ─── Message Action Bar (hover) ────────────────── */}
                                            <div className="absolute -top-3 right-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 bg-zinc-900 border border-zinc-800 rounded-lg px-1 py-0.5 shadow-xl">
                                                {REACTION_EMOJIS.slice(0, 4).map(emoji => (
                                                    <button
                                                        key={emoji}
                                                        onClick={() => addReaction(msg.id, emoji)}
                                                        className="h-6 w-6 rounded hover:bg-zinc-800 text-xs flex items-center justify-center transition-colors"
                                                    >
                                                        {emoji}
                                                    </button>
                                                ))}
                                                <div className="w-px h-4 bg-zinc-700 mx-0.5" />
                                                <button
                                                    onClick={() => setShowEmojiPicker(showEmojiPicker === msg.id ? null : msg.id)}
                                                    className="h-6 w-6 rounded hover:bg-zinc-800 text-zinc-400 flex items-center justify-center transition-colors"
                                                    title="More reactions"
                                                >
                                                    <Smile className="h-3.5 w-3.5" />
                                                </button>
                                                <button
                                                    onClick={() => { setReplyingTo(msg); inputRef.current?.focus(); }}
                                                    className="h-6 w-6 rounded hover:bg-zinc-800 text-zinc-400 flex items-center justify-center transition-colors"
                                                    title="Reply"
                                                >
                                                    <Reply className="h-3.5 w-3.5" />
                                                </button>
                                                <button
                                                    onClick={() => togglePin(msg.id)}
                                                    className={`h-6 w-6 rounded hover:bg-zinc-800 flex items-center justify-center transition-colors ${msg.isPinned ? 'text-amber-400' : 'text-zinc-400'}`}
                                                    title={msg.isPinned ? 'Unpin' : 'Pin'}
                                                >
                                                    <Pin className="h-3.5 w-3.5" />
                                                </button>
                                                <button
                                                    onClick={() => handleSpeak(msg.id, msg.text)}
                                                    className={`h-6 w-6 rounded hover:bg-zinc-800 flex items-center justify-center transition-colors ${speakingMsgId === msg.id ? 'text-blue-400' : 'text-zinc-400'}`}
                                                    title={speakingMsgId === msg.id ? 'Stop reading' : 'Read aloud'}
                                                >
                                                    <Volume2 className="h-3.5 w-3.5" />
                                                </button>
                                                <button
                                                    onClick={() => createTaskFromMessage(msg)}
                                                    className={`h-6 w-6 rounded hover:bg-zinc-800 flex items-center justify-center transition-colors relative ${tasks.some(t => t.sourceMessageId === msg.id) ? 'text-emerald-400' : 'text-zinc-400 hover:text-emerald-400'
                                                        }`}
                                                    title={tasks.some(t => t.sourceMessageId === msg.id) ? 'Task created from this message ✓' : 'Create task from message'}
                                                >
                                                    <CheckSquare className="h-3.5 w-3.5" />
                                                    {tasks.some(t => t.sourceMessageId === msg.id) && (
                                                        <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-500 ring-1 ring-zinc-900" />
                                                    )}
                                                </button>
                                                <button
                                                    onClick={() => setForwardingMsg(forwardingMsg?.id === msg.id ? null : msg)}
                                                    className={`h-6 w-6 rounded hover:bg-zinc-800 flex items-center justify-center transition-colors ${forwardingMsg?.id === msg.id ? 'text-cyan-400' : 'text-zinc-400 hover:text-cyan-400'}`}
                                                    title="Forward message"
                                                >
                                                    <Share2 className="h-3.5 w-3.5" />
                                                </button>
                                                <div className="w-px h-4 bg-zinc-700 mx-0.5" />
                                                {/* Bookmark */}
                                                <button
                                                    onClick={() => toggleBookmark(msg.id)}
                                                    className={`h-6 w-6 rounded hover:bg-zinc-800 flex items-center justify-center transition-colors ${msg.isBookmarked ? 'text-amber-400' : 'text-zinc-400 hover:text-amber-400'}`}
                                                    title={msg.isBookmarked ? 'Remove bookmark' : 'Bookmark'}
                                                >
                                                    <Bookmark className={`h-3.5 w-3.5 ${msg.isBookmarked ? 'fill-amber-400' : ''}`} />
                                                </button>
                                                {/* Priority */}
                                                <button
                                                    onClick={() => togglePriority(msg.id)}
                                                    className={`h-6 w-6 rounded hover:bg-zinc-800 flex items-center justify-center transition-colors ${msg.isPriority ? 'text-red-400' : 'text-zinc-400 hover:text-red-400'}`}
                                                    title={msg.isPriority ? 'Remove priority' : 'Mark as urgent'}
                                                >
                                                    <Flag className={`h-3.5 w-3.5 ${msg.isPriority ? 'fill-red-400' : ''}`} />
                                                </button>
                                                {/* Translate */}
                                                <button
                                                    onClick={() => translateMessage(msg.id)}
                                                    className={`h-6 w-6 rounded hover:bg-zinc-800 flex items-center justify-center transition-colors ${msg.isTranslated ? 'text-emerald-400' : 'text-zinc-400 hover:text-emerald-400'}`}
                                                    title={msg.isTranslated ? 'Show original' : 'Translate'}
                                                >
                                                    <Languages className="h-3.5 w-3.5" />
                                                </button>
                                                {/* Reminder */}
                                                <button
                                                    onClick={() => setShowReminderPicker(showReminderPicker === msg.id ? null : msg.id)}
                                                    className={`h-6 w-6 rounded hover:bg-zinc-800 flex items-center justify-center transition-colors ${showReminderPicker === msg.id ? 'text-violet-400' : 'text-zinc-400 hover:text-violet-400'}`}
                                                    title="Set reminder"
                                                >
                                                    <AlarmClock className="h-3.5 w-3.5" />
                                                </button>
                                                {/* Copy */}
                                                <button
                                                    onClick={() => navigator.clipboard.writeText(msg.text)}
                                                    className="h-6 w-6 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 flex items-center justify-center transition-colors"
                                                    title="Copy text"
                                                >
                                                    <Copy className="h-3.5 w-3.5" />
                                                </button>
                                                {msg.sender === 'You' && (
                                                    <>
                                                        <button
                                                            onClick={() => { setEditingId(msg.id); setEditText(msg.text); }}
                                                            className="h-6 w-6 rounded hover:bg-zinc-800 text-zinc-400 flex items-center justify-center transition-colors"
                                                            title="Edit"
                                                        >
                                                            <Edit3 className="h-3.5 w-3.5" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(msg.id)}
                                                            className="h-6 w-6 rounded hover:bg-zinc-800 text-red-400 flex items-center justify-center transition-colors"
                                                            title="Delete"
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </button>
                                                    </>
                                                )}
                                            </div>

                                            {/* Emoji Picker Dropdown */}
                                            <AnimatePresence>
                                                {showEmojiPicker === msg.id && (
                                                    <motion.div
                                                        className="absolute -top-12 right-0 bg-zinc-900 border border-zinc-700 rounded-xl px-2 py-1.5 flex gap-1 shadow-xl z-10"
                                                        initial={{ opacity: 0, scale: 0.9, y: 5 }}
                                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                                        exit={{ opacity: 0, scale: 0.9, y: 5 }}
                                                    >
                                                        {REACTION_EMOJIS.map(emoji => (
                                                            <button
                                                                key={emoji}
                                                                onClick={() => addReaction(msg.id, emoji)}
                                                                className="h-7 w-7 rounded-lg hover:bg-zinc-800 text-sm flex items-center justify-center transition-all hover:scale-125"
                                                            >
                                                                {emoji}
                                                            </button>
                                                        ))}
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>

                                            {/* Forward Channel / DM Picker */}
                                            <AnimatePresence>
                                                {forwardingMsg?.id === msg.id && (
                                                    <motion.div
                                                        className="absolute -top-32 right-0 bg-zinc-900 border border-zinc-700 rounded-xl p-2 shadow-xl z-20 min-w-[180px] max-h-64 overflow-y-auto"
                                                        initial={{ opacity: 0, scale: 0.9, y: 5 }}
                                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                                        exit={{ opacity: 0, scale: 0.9, y: 5 }}
                                                    >
                                                        <div className="flex items-center justify-between mb-1 px-1">
                                                            <p className="text-[10px] font-bold uppercase text-zinc-500">Forward to</p>
                                                            <button onClick={() => setForwardingMsg(null)} className="h-4 w-4 rounded hover:bg-zinc-800 flex items-center justify-center text-zinc-500 hover:text-zinc-300" title="Close">
                                                                <X className="h-3 w-3" />
                                                            </button>
                                                        </div>
                                                        <p className="text-[9px] uppercase text-zinc-600 px-1 mt-1 mb-0.5">Channels</p>
                                                        {CHANNELS.filter(ch => ch.id !== activeChannel).map(ch => (
                                                            <button
                                                                key={ch.id}
                                                                onClick={() => forwardMessage(msg, ch.id)}
                                                                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 transition-colors"
                                                                title={`Forward to #${ch.name}`}
                                                            >
                                                                <ch.icon className={`h-3.5 w-3.5 ${ch.color}`} />
                                                                <span>#{ch.name}</span>
                                                            </button>
                                                        ))}
                                                        <div className="border-t border-zinc-800 my-1" />
                                                        <p className="text-[9px] uppercase text-zinc-600 px-1 mb-0.5">Direct Messages</p>
                                                        {onlineStaff.map(staff => (
                                                            <button
                                                                key={staff.name}
                                                                onClick={() => forwardMessage(msg, `dm-${staff.initials.toLowerCase()}`)}
                                                                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 transition-colors"
                                                                title={`DM ${staff.name}`}
                                                            >
                                                                <div className={`h-4 w-4 rounded-full ${staff.color} flex items-center justify-center text-[8px] font-bold text-white`}>{staff.initials}</div>
                                                                <span>{staff.name}</span>
                                                                <span className={`ml-auto h-1.5 w-1.5 rounded-full ${staff.status === 'online' ? 'bg-green-400' : staff.status === 'busy' ? 'bg-red-400' : 'bg-yellow-400'}`} />
                                                            </button>
                                                        ))}
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>

                                            {/* Reminder Picker */}
                                            <AnimatePresence>
                                                {showReminderPicker === msg.id && (
                                                    <motion.div
                                                        className="absolute -top-28 right-14 bg-zinc-900 border border-zinc-700 rounded-xl p-2 shadow-xl z-20 min-w-[140px]"
                                                        initial={{ opacity: 0, scale: 0.9, y: 5 }}
                                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                                        exit={{ opacity: 0, scale: 0.9, y: 5 }}
                                                    >
                                                        <div className="flex items-center justify-between mb-1 px-1">
                                                            <p className="text-[10px] font-bold uppercase text-zinc-500 flex items-center gap-1">
                                                                <AlarmClock className="h-2.5 w-2.5" /> Remind me
                                                            </p>
                                                            <button onClick={() => setShowReminderPicker(null)} className="h-4 w-4 rounded hover:bg-zinc-800 flex items-center justify-center text-zinc-500 hover:text-zinc-300" title="Close">
                                                                <X className="h-3 w-3" />
                                                            </button>
                                                        </div>
                                                        {[
                                                            { label: 'In 5 min', mins: 5 },
                                                            { label: 'In 15 min', mins: 15 },
                                                            { label: 'In 30 min', mins: 30 },
                                                            { label: 'In 1 hour', mins: 60 },
                                                            { label: 'In 2 hours', mins: 120 },
                                                        ].map(opt => (
                                                            <button
                                                                key={opt.mins}
                                                                onClick={() => setMsgReminder(msg.id, opt.mins)}
                                                                className="w-full text-left px-2 py-1.5 rounded-md text-xs text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 transition-colors"
                                                                title={opt.label}
                                                            >
                                                                {opt.label}
                                                            </button>
                                                        ))}
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>

                                            {/* Read Receipts Detail */}
                                            <AnimatePresence>
                                                {showReceiptsDetail === msg.id && msg.readBy && (
                                                    <motion.div
                                                        className="absolute -top-16 right-0 bg-zinc-900 border border-zinc-700 rounded-xl p-2.5 shadow-xl z-20 min-w-[140px]"
                                                        initial={{ opacity: 0, scale: 0.9 }}
                                                        animate={{ opacity: 1, scale: 1 }}
                                                        exit={{ opacity: 0, scale: 0.9 }}
                                                    >
                                                        <div className="flex items-center justify-between mb-1">
                                                            <p className="text-[10px] font-bold uppercase text-zinc-500 flex items-center gap-1">
                                                                <Eye className="h-2.5 w-2.5" /> Seen by {msg.readBy.length}
                                                            </p>
                                                            <button onClick={() => setShowReceiptsDetail(null)} className="h-4 w-4 rounded hover:bg-zinc-800 flex items-center justify-center text-zinc-500 hover:text-zinc-300" title="Close">
                                                                <X className="h-3 w-3" />
                                                            </button>
                                                        </div>
                                                        {msg.readBy.map(name => (
                                                            <p key={name} className="text-xs text-zinc-300 py-0.5">{name}</p>
                                                        ))}
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </motion.div>
                                    </React.Fragment>
                                );
                            })}
                        </AnimatePresence>
                        <div ref={messagesEndRef} />
                    </div>
                </div>

                {/* Typing Indicator */}
                <AnimatePresence>
                    {activeChannel === 'kitchen' && <TypingIndicator names={typingUsers} />}
                </AnimatePresence>

                {/* Reply Bar */}
                <AnimatePresence>
                    {replyingTo && (
                        <motion.div
                            className="px-4 py-2 border-t border-zinc-800 bg-zinc-900/50 flex items-center gap-2"
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                        >
                            <Reply className="h-3.5 w-3.5 text-blue-400 rotate-180 flex-shrink-0" />
                            <span className="text-xs text-zinc-400 truncate flex-1">
                                Replying to <span className="text-zinc-300 font-medium">{replyingTo.sender}</span>: {replyingTo.text.substring(0, 50)}...
                            </span>
                            <button title="Cancel reply" onClick={() => setReplyingTo(null)} className="text-zinc-500 hover:text-zinc-300">
                                <X className="h-3.5 w-3.5" />
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Live Dictation Indicator */}
                <AnimatePresence>
                    {isListening && (
                        <motion.div
                            className="px-4 py-1.5 border-t border-red-500/20 bg-red-500/5 flex items-center gap-2"
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                        >
                            <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                            <span className="text-xs text-red-400 font-medium">Listening...</span>
                            {interimText && (
                                <span className="text-xs text-zinc-400 italic truncate flex-1">"{interimText}"</span>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Message Input — Premium Glassmorphism */}
                <div className="p-4 border-t border-zinc-800/50 bg-gradient-to-r from-zinc-950/90 via-zinc-950 to-zinc-950/90 backdrop-blur-sm flex-shrink-0">
                    <div className="flex gap-2 max-w-3xl relative">
                        {/* Attachment Button */}
                        <div className="relative">
                            <button
                                title="Attach file"
                                onClick={() => setShowAttachMenu(!showAttachMenu)}
                                className="h-10 w-10 rounded-xl bg-zinc-900/80 border border-zinc-800/50 hover:bg-zinc-800 hover:border-zinc-700 flex items-center justify-center text-zinc-400 hover:text-zinc-200 transition-all duration-200"
                            >
                                <Paperclip className="h-4 w-4" />
                            </button>
                            <AnimatePresence>
                                {showAttachMenu && (
                                    <motion.div
                                        className="absolute bottom-12 left-0 bg-zinc-900/95 backdrop-blur-md border border-zinc-700/50 rounded-xl shadow-2xl shadow-black/40 w-44 overflow-hidden z-10"
                                        initial={{ opacity: 0, y: 5, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 5, scale: 0.95 }}
                                    >
                                        <button className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-zinc-300 hover:bg-zinc-800/80 transition-colors">
                                            <Image className="h-3.5 w-3.5 text-blue-400" /> Upload Image
                                        </button>
                                        <button className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-zinc-300 hover:bg-zinc-800/80 transition-colors">
                                            <FileText className="h-3.5 w-3.5 text-amber-400" /> Upload File
                                        </button>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        <Input
                            ref={inputRef}
                            placeholder={`Message #${activeChannelData?.name || 'channel'}... (use / for shortcuts, # for orders, @ for tables)`}
                            value={messageInput}
                            onChange={e => {
                                setMessageInput(e.target.value);
                                setShowQuickPicker(e.target.value === '/');
                            }}
                            onKeyDown={e => { if (e.key === 'Enter') handleSend(); }}
                            className="bg-zinc-900/60 border-zinc-800/50 text-zinc-200 placeholder:text-zinc-600 flex-1 h-10 rounded-xl backdrop-blur-sm focus:ring-1 focus:ring-amber-500/30 focus:border-amber-500/30 transition-all duration-200"
                        />

                        {/* Quick Message Picker */}
                        <AnimatePresence>
                            {showQuickPicker && (
                                <motion.div
                                    className="absolute bottom-12 left-12 bg-zinc-900 border border-zinc-700 rounded-xl shadow-xl w-72 overflow-hidden z-20"
                                    initial={{ opacity: 0, y: 5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 5 }}
                                >
                                    <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500 border-b border-zinc-800">
                                        ⚡ Quick Shortcuts
                                    </p>
                                    {QUICK_MESSAGES.map(qm => (
                                        <button
                                            key={qm.command}
                                            onClick={() => {
                                                setMessageInput(qm.text);
                                                setShowQuickPicker(false);
                                                inputRef.current?.focus();
                                            }}
                                            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800 transition-colors text-left"
                                            title={qm.label}
                                        >
                                            <span className="text-base">{qm.emoji}</span>
                                            <div>
                                                <span className="text-zinc-400 font-mono">{qm.command}</span>
                                                <span className="text-zinc-500 ml-2">{qm.label}</span>
                                            </div>
                                        </button>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                        {/* Voice Dictation Button */}
                        {dictationSupported && (
                            <button
                                onClick={toggleDictation}
                                title={isListening ? 'Stop dictation' : 'Voice input'}
                                className={`h-9 w-9 rounded-lg border flex items-center justify-center transition-all flex-shrink-0 ${isListening
                                    ? 'bg-red-600 border-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.4)] animate-pulse'
                                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                                    }`}
                            >
                                {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                            </button>
                        )}
                        <Button
                            size="sm"
                            className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white px-5 h-10 rounded-xl shadow-lg shadow-blue-600/20 hover:shadow-blue-500/30 transition-all duration-200 disabled:opacity-40 disabled:shadow-none"
                            onClick={handleSend}
                            disabled={!messageInput.trim()}
                        >
                            <Send className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>

            {/* ─── RIGHT: Tasks + Call Log + PTT Panel ─────────────────── */}
            <div className="w-72 flex-shrink-0 border-l border-zinc-800/50 flex flex-col bg-gradient-to-b from-zinc-950 via-zinc-950 to-zinc-900/80">
                <Tabs defaultValue="tasks" className="flex flex-col h-full">
                    <TabsList className="bg-zinc-900/60 backdrop-blur-sm border-b border-zinc-800/50 rounded-none h-14 px-2 flex-shrink-0">
                        <TabsTrigger value="tasks" className="text-xs">
                            <CheckSquare className="h-3.5 w-3.5 mr-1" /> Tasks
                        </TabsTrigger>
                        <TabsTrigger value="ptt" className="text-xs">
                            <Radio className="h-3.5 w-3.5 mr-1" /> PTT
                        </TabsTrigger>
                        <TabsTrigger value="log" className="text-xs">
                            <PhoneCall className="h-3.5 w-3.5 mr-1" /> Log
                            {callLog.length > 0 && (
                                <Badge className="ml-1 h-4 min-w-[16px] px-1 text-[10px] bg-zinc-700 text-zinc-300 border-0">{callLog.length}</Badge>
                            )}
                        </TabsTrigger>
                        <TabsTrigger value="settings" className="text-xs">
                            <Settings className="h-3.5 w-3.5 mr-1" /> Settings
                        </TabsTrigger>
                    </TabsList>

                    {/* Tasks Tab */}
                    <TabsContent value="tasks" className="flex-1 overflow-auto p-3 mt-0 space-y-3">
                        {/* Create Task Button */}
                        <button
                            onClick={() => { setShowCreateTask(true); setCreateFromMessage(null); setNewTaskTitle(''); }}
                            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-dashed border-zinc-700 hover:border-zinc-500 text-zinc-500 hover:text-zinc-300 text-xs transition-colors"
                            title="Create new task"
                        >
                            <Plus className="h-3.5 w-3.5" /> New Task
                        </button>

                        {/* Create Task Form (Premium) */}
                        <AnimatePresence>
                            {showCreateTask && (
                                <motion.div
                                    className="p-3.5 rounded-xl bg-gradient-to-b from-zinc-900 to-zinc-900/80 border border-zinc-700/50 space-y-2.5 backdrop-blur-sm shadow-xl shadow-black/20"
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                >
                                    {/* Header */}
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
                                            {createFromMessage ? (
                                                <><MessageSquare className="h-3.5 w-3.5 text-blue-400" /> Task from Message</>
                                            ) : (
                                                <><Plus className="h-3.5 w-3.5 text-emerald-400" /> New Task</>
                                            )}
                                        </p>
                                        <button onClick={() => setShowCreateTask(false)} className="text-zinc-500 hover:text-zinc-300 transition-colors" title="Close">
                                            <X className="h-3.5 w-3.5" />
                                        </button>
                                    </div>

                                    {/* Source Message Preview (when created from a message) */}
                                    {createFromMessage && (
                                        <div className="relative pl-3 py-2 bg-zinc-800/50 rounded-lg border-l-2 border-blue-500/50">
                                            <div className="flex items-center gap-1.5 mb-1">
                                                <span className="text-[10px] font-semibold text-blue-400">{createFromMessage.sender}</span>
                                                <span className="text-[9px] text-zinc-600">in #{createFromMessage.channelId}</span>
                                            </div>
                                            <p className="text-[11px] text-zinc-400 leading-relaxed line-clamp-2">{createFromMessage.text}</p>
                                        </div>
                                    )}

                                    {/* Task Title */}
                                    <Input
                                        placeholder="Task title..."
                                        value={newTaskTitle}
                                        onChange={e => setNewTaskTitle(e.target.value)}
                                        className="bg-zinc-800/60 border-zinc-700/50 text-zinc-200 h-8 text-xs rounded-lg focus:ring-1 focus:ring-emerald-500/30"
                                    />

                                    {/* Urgency + Assignee */}
                                    <div className="grid grid-cols-2 gap-2">
                                        <select
                                            value={newTaskUrgency}
                                            onChange={e => setNewTaskUrgency(e.target.value as MicroTask['urgency'])}
                                            className="bg-zinc-800/60 border border-zinc-700/50 rounded-lg text-xs text-zinc-300 h-8 px-2"
                                            title="Task urgency level"
                                        >
                                            <option value="LOW">🟢 Low</option>
                                            <option value="MEDIUM">🟡 Medium</option>
                                            <option value="HIGH">🔴 High</option>
                                            <option value="CRITICAL">🚨 Critical</option>
                                        </select>
                                        <select
                                            value={newTaskAssignee}
                                            onChange={e => setNewTaskAssignee(e.target.value)}
                                            className="bg-zinc-800/60 border border-zinc-700/50 rounded-lg text-xs text-zinc-300 h-8 px-2"
                                            title="Assign task to staff"
                                        >
                                            <option value="">Unassigned (Pool)</option>
                                            <option value="You">Assign to Me</option>
                                            {onlineStaff.map(s => (
                                                <option key={s.name} value={s.name}>{s.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Deadline + Recurrence */}
                                    <div className="grid grid-cols-2 gap-2">
                                        <Input
                                            placeholder="Deadline (HH:MM)"
                                            value={newTaskDeadline}
                                            onChange={e => setNewTaskDeadline(e.target.value)}
                                            className="bg-zinc-800/60 border-zinc-700/50 text-zinc-200 h-8 text-xs rounded-lg"
                                        />
                                        <select
                                            value={newTaskRecurrence}
                                            onChange={e => setNewTaskRecurrence(e.target.value as MicroTask['recurrence'])}
                                            className="bg-zinc-800/60 border border-zinc-700/50 rounded-lg text-xs text-zinc-300 h-8 px-2"
                                            title="Task recurrence schedule"
                                        >
                                            <option value="none">No Repeat</option>
                                            <option value="daily">🔄 Daily</option>
                                            <option value="weekly">📅 Weekly</option>
                                            <option value="shift-start">▶ Shift Start</option>
                                            <option value="shift-end">⏹ Shift End</option>
                                        </select>
                                    </div>

                                    {/* Announce Toggle */}
                                    <div className="flex items-center justify-between py-1 px-1">
                                        <label className="text-[10px] text-zinc-400 flex items-center gap-1.5 cursor-pointer" htmlFor="announce-toggle">
                                            <MessageSquarePlus className="h-3 w-3 text-blue-400" />
                                            Announce in #{activeChannelData?.name || 'channel'}
                                        </label>
                                        <button
                                            id="announce-toggle"
                                            onClick={() => setAnnounceAfterCreate(!announceAfterCreate)}
                                            className={`relative w-8 h-4 rounded-full transition-all duration-200 ${announceAfterCreate ? 'bg-emerald-600' : 'bg-zinc-700'}`}
                                            title={announceAfterCreate ? 'Will post announcement' : 'No announcement'}
                                        >
                                            <span className={`absolute top-0.5 h-3 w-3 rounded-full bg-white transition-all duration-200 ${announceAfterCreate ? 'left-4.5' : 'left-0.5'}`} />
                                        </button>
                                    </div>

                                    {/* Submit */}
                                    <Button
                                        size="sm"
                                        className="w-full h-9 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white text-xs rounded-lg shadow-lg shadow-emerald-600/15 transition-all duration-200 disabled:opacity-40 disabled:shadow-none"
                                        onClick={submitNewTask}
                                        disabled={!newTaskTitle.trim()}
                                    >
                                        <Check className="h-3.5 w-3.5 mr-1" /> Create Task
                                        {announceAfterCreate && <span className="ml-1 text-emerald-200/60">& Announce</span>}
                                    </Button>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* My Tasks */}
                        {myTasks.length > 0 && (
                            <>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-blue-400 mt-1">
                                    📌 My Tasks — {myTasks.length}
                                </p>
                                <AnimatePresence>
                                    {myTasks.map(task => (
                                        <motion.div
                                            key={task.id}
                                            layout
                                            initial={{ opacity: 0, scale: 0.95 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.95, height: 0 }}
                                            className="p-3 rounded-xl bg-gradient-to-b from-zinc-900 to-zinc-900/70 border border-blue-500/20 space-y-2 backdrop-blur-sm"
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <p className="text-sm font-medium text-zinc-200">{task.title}</p>
                                                <Badge className={`text-[10px] shrink-0 ${task.urgency === 'CRITICAL' ? 'bg-red-700 text-white' : task.urgency === 'HIGH' ? 'bg-red-600 text-white' :
                                                    task.urgency === 'MEDIUM' ? 'bg-amber-600 text-white' : 'bg-zinc-700 text-zinc-300'}`}>
                                                    {task.urgency}
                                                </Badge>
                                            </div>

                                            {/* Source Message Back-Link */}
                                            {task.sourceMessageId && task.sourceMessageText && (
                                                <button
                                                    onClick={() => {
                                                        if (task.sourceChannelId) setActiveChannel(task.sourceChannelId);
                                                    }}
                                                    className="w-full text-left pl-2.5 py-1.5 bg-zinc-800/40 rounded-lg border-l-2 border-blue-500/40 hover:border-blue-400/60 hover:bg-zinc-800/60 transition-all group/src"
                                                    title="Go to source message"
                                                >
                                                    <div className="flex items-center gap-1">
                                                        <MessageSquare className="h-2.5 w-2.5 text-blue-400/60" />
                                                        <span className="text-[9px] text-zinc-600 group-hover/src:text-zinc-400 transition-colors">Source message</span>
                                                    </div>
                                                    <p className="text-[10px] text-zinc-500 truncate mt-0.5 group-hover/src:text-zinc-300 transition-colors">{task.sourceMessageText}</p>
                                                </button>
                                            )}

                                            {task.deadline && (
                                                <p className="text-[10px] text-zinc-500 flex items-center gap-1">
                                                    <Clock className="h-2.5 w-2.5" /> Due by {task.deadline}
                                                </p>
                                            )}
                                            {task.recurrence && task.recurrence !== 'none' && (
                                                <p className="text-[10px] text-violet-400 flex items-center gap-1">
                                                    <RotateCw className="h-2.5 w-2.5" /> {task.recurrence}
                                                </p>
                                            )}
                                            {task.startedAt && (
                                                <p className="text-[10px] text-emerald-400 flex items-center gap-1">
                                                    <Timer className="h-2.5 w-2.5" /> Started {task.startedAt}
                                                </p>
                                            )}
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs text-zinc-500 flex items-center gap-1">
                                                    <Zap className="h-3 w-3 text-amber-400" /> {task.xp} XP
                                                </span>
                                                <div className="flex gap-1.5">
                                                    {/* Announce in Chat */}
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-6 px-2 text-[10px] text-zinc-500 hover:text-blue-400"
                                                        onClick={() => announceTaskInChat(task)}
                                                        title="Announce task in chat"
                                                    >
                                                        <MessageSquarePlus className="h-3 w-3" />
                                                    </Button>
                                                    {task.status === 'assigned' && (
                                                        <Button
                                                            size="sm"
                                                            className="h-6 px-3 text-[10px] bg-blue-600 hover:bg-blue-500 text-white border-0"
                                                            onClick={() => startTask(task.id)}
                                                        >
                                                            ▶ Start
                                                        </Button>
                                                    )}
                                                    <Button
                                                        size="sm"
                                                        className="h-6 px-3 text-[10px] bg-emerald-600 hover:bg-emerald-500 text-white border-0"
                                                        onClick={() => completeTask(task.id)}
                                                    >
                                                        Done ✓
                                                    </Button>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </>
                        )}

                        {/* Task Pool */}
                        <div className="flex items-center justify-between mt-1">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">
                                🎯 Task Pool — {poolTasks.length}
                            </p>
                            {doneTasks.length > 0 && (
                                <Badge className="bg-emerald-600/20 text-emerald-400 text-[10px] border-0">
                                    {doneTasks.length} done ✓
                                </Badge>
                            )}
                        </div>
                        <AnimatePresence>
                            {poolTasks.map(task => (
                                <motion.div
                                    key={task.id}
                                    layout
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95, height: 0 }}
                                    whileHover={{ scale: 1.01 }}
                                    className="p-3 rounded-xl bg-gradient-to-b from-zinc-900 to-zinc-900/70 border border-zinc-800/60 space-y-2 backdrop-blur-sm"
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <p className="text-sm font-medium text-zinc-200">{task.title}</p>
                                        <Badge className={`text-[10px] shrink-0 ${task.urgency === 'CRITICAL' ? 'bg-red-700 text-white' : task.urgency === 'HIGH' ? 'bg-red-600 text-white' :
                                            task.urgency === 'MEDIUM' ? 'bg-amber-600 text-white' : 'bg-zinc-700 text-zinc-300'}`}>
                                            {task.urgency}
                                        </Badge>
                                    </div>

                                    {/* Source Message Back-Link */}
                                    {task.sourceMessageId && task.sourceMessageText && (
                                        <button
                                            onClick={() => {
                                                if (task.sourceChannelId) setActiveChannel(task.sourceChannelId);
                                            }}
                                            className="w-full text-left pl-2.5 py-1.5 bg-zinc-800/40 rounded-lg border-l-2 border-blue-500/40 hover:border-blue-400/60 hover:bg-zinc-800/60 transition-all group/src"
                                            title="Go to source message"
                                        >
                                            <div className="flex items-center gap-1">
                                                <MessageSquare className="h-2.5 w-2.5 text-blue-400/60" />
                                                <span className="text-[9px] text-zinc-600 group-hover/src:text-zinc-400 transition-colors">Source message</span>
                                            </div>
                                            <p className="text-[10px] text-zinc-500 truncate mt-0.5 group-hover/src:text-zinc-300 transition-colors">{task.sourceMessageText}</p>
                                        </button>
                                    )}

                                    {task.deadline && (
                                        <p className="text-[10px] text-zinc-500 flex items-center gap-1">
                                            <Clock className="h-2.5 w-2.5" /> Due by {task.deadline}
                                        </p>
                                    )}
                                    {task.recurrence && task.recurrence !== 'none' && (
                                        <p className="text-[10px] text-violet-400 flex items-center gap-1">
                                            <RotateCw className="h-2.5 w-2.5" /> {task.recurrence}
                                        </p>
                                    )}
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-zinc-500 flex items-center gap-1">
                                            <Zap className="h-3 w-3 text-amber-400" /> {task.xp} XP
                                        </span>
                                        <div className="flex gap-1.5">
                                            <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px] text-zinc-400 hover:text-red-400">
                                                Skip
                                            </Button>
                                            <Button
                                                size="sm"
                                                className="h-6 px-3 text-[10px] bg-blue-600 hover:bg-blue-500 text-white border-0"
                                                onClick={() => claimTask(task.id)}
                                            >
                                                👋 Claim
                                            </Button>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>

                        {allActiveTasks.length === 0 && (
                            <motion.div
                                className="flex flex-col items-center justify-center py-8 text-center"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                            >
                                <span className="text-3xl mb-2">🎉</span>
                                <p className="text-sm font-medium text-zinc-300">All tasks complete!</p>
                                <p className="text-xs text-zinc-500 mt-1">Great job, team.</p>
                            </motion.div>
                        )}
                    </TabsContent>

                    {/* PTT Tab — with Live Speakers + Transcript */}
                    <TabsContent value="ptt" className="flex-1 flex flex-col items-center p-6 mt-0 overflow-auto">
                        <div className="text-center space-y-4 w-full">
                            <p className="text-[10px] uppercase tracking-widest text-zinc-600 font-bold">
                                Walkie-Talkie
                            </p>
                            <p className="text-xs text-zinc-500">
                                Channel: <span className="text-zinc-300 font-medium">#{activeChannelData?.name}</span>
                            </p>

                            {/* 🔴 Live Speakers (who is currently talking) */}
                            <AnimatePresence>
                                {liveSpeakers.filter(s => s.channelId === activeChannel).map(speaker => (
                                    <motion.div
                                        key={speaker.name}
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.8 }}
                                        className="flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-red-600/10 border border-red-500/20"
                                    >
                                        <div className="relative">
                                            <div className={`h-8 w-8 rounded-full ${speaker.color} flex items-center justify-center`}>
                                                <span className="text-white text-[10px] font-bold">{speaker.initials}</span>
                                            </div>
                                            <motion.div
                                                className="absolute -inset-1 rounded-full border-2 border-red-500"
                                                animate={{ scale: [1, 1.3], opacity: [0.8, 0] }}
                                                transition={{ duration: 1, repeat: Infinity }}
                                            />
                                        </div>
                                        <div className="text-left">
                                            <p className="text-xs font-bold text-red-400">{speaker.name}</p>
                                            <p className="text-[10px] text-red-400/60 animate-pulse">🔴 LIVE</p>
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>

                            {/* Big PTT Button */}
                            <motion.button
                                onMouseDown={startTalking}
                                onMouseUp={stopTalking}
                                onMouseLeave={stopTalking}
                                onTouchStart={startTalking}
                                onTouchEnd={stopTalking}
                                whileTap={{ scale: 0.95 }}
                                className={`relative mx-auto w-28 h-28 rounded-full flex items-center justify-center transition-all ${isTalking
                                    ? 'bg-red-600 shadow-[0_0_40px_rgba(239,68,68,0.5)]'
                                    : micPermission === 'denied'
                                        ? 'bg-zinc-800 cursor-not-allowed'
                                        : 'bg-zinc-800 hover:bg-zinc-700 shadow-[0_0_20px_rgba(0,0,0,0.5)]'
                                    }`}
                                disabled={micPermission === 'denied'}
                                title="Hold to talk"
                            >
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
                                    <Mic className="h-10 w-10 text-white" />
                                ) : (
                                    <MicOff className="h-10 w-10 text-zinc-400" />
                                )}
                            </motion.button>

                            <p className="text-xs text-zinc-500">
                                {isTalking ? (
                                    <span className="text-red-400 font-bold animate-pulse">🔴 LIVE — Release to stop</span>
                                ) : micPermission === 'denied' ? (
                                    <span className="text-red-400">Microphone access denied</span>
                                ) : (
                                    'Hold to talk · Space bar · AirPods squeeze'
                                )}
                            </p>

                            {/* Live Transcript (while talking) */}
                            <AnimatePresence>
                                {isTalking && liveTranscript && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 5 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0 }}
                                        className="w-full p-2 rounded-lg bg-zinc-900 border border-zinc-800"
                                    >
                                        <p className="text-[10px] text-zinc-600 uppercase tracking-widest mb-1 flex items-center gap-1">
                                            <FileAudio className="h-2.5 w-2.5" /> Live Transcript
                                        </p>
                                        <p className="text-xs text-zinc-300 italic leading-relaxed">
                                            "{liveTranscript}"
                                        </p>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* On This Channel — with LIVE indicators */}
                            <div className="pt-4 border-t border-zinc-800 w-full">
                                <p className="text-[10px] uppercase tracking-widest text-zinc-600 mb-3">On this channel</p>
                                <div className="flex flex-wrap justify-center gap-2">
                                    {onlineStaff.filter(s => s.status === 'online').slice(0, 4).map(s => {
                                        const isLive = liveSpeakers.some(ls => ls.initials === s.initials && ls.channelId === activeChannel);
                                        return (
                                            <div key={s.name} className="flex flex-col items-center gap-1">
                                                <div className="relative">
                                                    <div className={`h-8 w-8 rounded-full ${s.color} flex items-center justify-center ${isLive ? 'ring-2 ring-red-500 ring-offset-1 ring-offset-zinc-950' : ''}`}>
                                                        <span className="text-white text-[10px] font-bold">{s.initials}</span>
                                                    </div>
                                                    {isLive && (
                                                        <motion.div
                                                            className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-red-500 border border-zinc-950 flex items-center justify-center"
                                                            animate={{ scale: [1, 1.2, 1] }}
                                                            transition={{ duration: 1, repeat: Infinity }}
                                                        >
                                                            <Mic className="h-1.5 w-1.5 text-white" />
                                                        </motion.div>
                                                    )}
                                                </div>
                                                <span className={`text-[10px] ${isLive ? 'text-red-400 font-bold' : 'text-zinc-500'}`}>
                                                    {isLive ? '🔴 LIVE' : s.name.split(' ')[0]}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </TabsContent>

                    {/* Call Log Tab — Transcripts */}
                    <TabsContent value="log" className="flex-1 overflow-auto p-3 mt-0 space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">
                                Call History
                            </p>
                            {callLog.length > 0 && (
                                <button
                                    onClick={clearCallLog}
                                    className="text-[10px] text-zinc-600 hover:text-red-400 transition-colors"
                                    title="Clear log"
                                >
                                    Clear
                                </button>
                            )}
                        </div>

                        {/* Search call log */}
                        <div className="relative">
                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-zinc-600" />
                            <Input
                                placeholder="Search transcripts..."
                                className="bg-zinc-900 border-zinc-800 text-zinc-300 placeholder:text-zinc-600 pl-7 h-7 text-[11px]"
                            />
                        </div>

                        <AnimatePresence>
                            {callLog.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-10 text-center">
                                    <PhoneCall className="h-8 w-8 text-zinc-700 mb-2" />
                                    <p className="text-xs text-zinc-600">No calls yet</p>
                                    <p className="text-[10px] text-zinc-700 mt-1">PTT transmissions will appear here with transcripts</p>
                                </div>
                            ) : (
                                callLog.map(entry => (
                                    <motion.div
                                        key={entry.id}
                                        initial={{ opacity: 0, x: 10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 space-y-1.5"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-1.5">
                                                <div className="h-5 w-5 rounded-full bg-zinc-700 flex items-center justify-center">
                                                    <Mic className="h-2.5 w-2.5 text-zinc-300" />
                                                </div>
                                                <span className="text-xs font-medium text-zinc-300">{entry.speaker}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                {entry.audioUrl && (
                                                    <button
                                                        onClick={() => playAudio(entry.audioUrl as string, `log-${entry.id}`)}
                                                        className={`h-5 w-5 rounded-full flex items-center justify-center transition-colors ${playingAudioId === `log-${entry.id}` ? 'bg-blue-500/40 text-blue-300' : 'bg-blue-500/20 hover:bg-blue-500/30 text-blue-400'
                                                            }`}
                                                        title={playingAudioId === `log-${entry.id}` ? 'Stop playback' : 'Play recording'}
                                                    >
                                                        {playingAudioId === `log-${entry.id}` ? (
                                                            <Pause className="h-2.5 w-2.5" />
                                                        ) : (
                                                            <Play className="h-2.5 w-2.5 ml-0.5" />
                                                        )}
                                                    </button>
                                                )}
                                                <span className="text-[10px] text-zinc-600">{entry.startedAt}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 text-[10px] text-zinc-500">
                                            <span>#{entry.channelId}</span>
                                            <span>·</span>
                                            <span>{entry.duration}s</span>
                                        </div>
                                        {entry.transcript !== '(no transcript)' && (
                                            <p className="text-[11px] text-zinc-400 italic bg-zinc-800/50 rounded px-2 py-1.5 leading-relaxed">
                                                &quot;{entry.transcript}&quot;
                                            </p>
                                        )}
                                    </motion.div>
                                ))
                            )}
                        </AnimatePresence>
                    </TabsContent>

                    {/* ─── Settings Tab ──────────────────────────────── */}
                    <TabsContent value="settings" className="flex-1 overflow-auto p-3 mt-0 space-y-4">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">
                            🎙️ Voice & Language
                        </p>

                        {/* TTS Speed */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="text-xs text-zinc-300 flex items-center gap-1.5">
                                    <Volume1 className="h-3.5 w-3.5 text-blue-400" />
                                    Speech Speed
                                </label>
                                <span className="text-xs font-mono text-zinc-400">{ttsRate.toFixed(1)}x</span>
                            </div>
                            <input
                                type="range"
                                min="0.5"
                                max="2.0"
                                step="0.1"
                                value={ttsRate}
                                onChange={e => setTtsRate(parseFloat(e.target.value))}
                                className="w-full h-1.5 bg-zinc-800 rounded-full appearance-none cursor-pointer accent-blue-500"
                                title="TTS speech rate"
                            />
                            <div className="flex justify-between text-[10px] text-zinc-600">
                                <span>0.5x Slow</span>
                                <span>1.0x Normal</span>
                                <span>2.0x Fast</span>
                            </div>
                        </div>

                        {/* TTS Voice */}
                        <div className="space-y-1.5">
                            <label className="text-xs text-zinc-300 flex items-center gap-1.5">
                                <Volume2 className="h-3.5 w-3.5 text-purple-400" />
                                TTS Voice
                            </label>
                            <select
                                value={ttsVoiceName}
                                onChange={e => setTtsVoiceName(e.target.value)}
                                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg text-xs text-zinc-300 h-8 px-2"
                                title="Select TTS voice"
                            >
                                <option value="">Auto (System Default)</option>
                                {availableVoices
                                    .filter(v => v.lang.startsWith('en'))
                                    .map(v => (
                                        <option key={v.name} value={v.name}>
                                            {v.name} ({v.lang})
                                        </option>
                                    ))}
                                {availableVoices.filter(v => !v.lang.startsWith('en')).length > 0 && (
                                    <optgroup label="Other Languages">
                                        {availableVoices
                                            .filter(v => !v.lang.startsWith('en'))
                                            .map(v => (
                                                <option key={v.name} value={v.name}>
                                                    {v.name} ({v.lang})
                                                </option>
                                            ))}
                                    </optgroup>
                                )}
                            </select>
                            <button
                                onClick={() => speakMessage('Hello, this is a test of the selected voice.', ttsConfig)}
                                className="w-full py-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700 text-[10px] text-zinc-400 hover:text-zinc-200 transition-colors"
                                title="Test current TTS voice"
                            >
                                ▶ Test Voice
                            </button>
                        </div>

                        <div className="h-px bg-zinc-800" />

                        {/* Speech Recognition Language */}
                        <div className="space-y-1.5">
                            <label className="text-xs text-zinc-300 flex items-center gap-1.5">
                                <Globe className="h-3.5 w-3.5 text-emerald-400" />
                                Recognition Language
                            </label>
                            <select
                                value={recognitionLang}
                                onChange={e => setRecognitionLang(e.target.value)}
                                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg text-xs text-zinc-300 h-8 px-2"
                                title="Select speech recognition language"
                            >
                                {SUPPORTED_LANGUAGES.map(lang => (
                                    <option key={lang.code} value={lang.code}>
                                        {lang.label} ({lang.code})
                                    </option>
                                ))}
                            </select>
                            <p className="text-[10px] text-zinc-600">Used for voice dictation (mic button) and PTT transcription</p>
                        </div>

                        <div className="h-px bg-zinc-800" />

                        {/* Quick Voice Info */}
                        <div className="space-y-1.5">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">
                                ℹ️ Info
                            </p>
                            <div className="text-[10px] text-zinc-500 space-y-1">
                                <p>• <span className="text-zinc-400">Dictation:</span> Click the mic button in the input bar</p>
                                <p>• <span className="text-zinc-400">PTT:</span> Hold-to-Talk sends audio to the channel</p>
                                <p>• <span className="text-zinc-400">Read Aloud:</span> Click 🔊 on any message</p>
                                <p>• <span className="text-zinc-400">Shortcuts:</span> Space bar or AirPods squeeze for PTT</p>
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
