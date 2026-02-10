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
    X, Check, ArrowRight, PhoneCall, FileAudio,
    Play, Pause, Square, Calendar, UserPlus, ListTodo, RotateCw, Timer, GripVertical, Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { parseSmartMessage, SmartToken } from '@/lib/smartParser';
import { useGlobalPTT, TransmissionResult, LiveSpeaker } from '@/contexts/GlobalPTTContext';
import { useVoiceDictation, speakMessage, stopSpeaking, isSpeaking } from '@/hooks/useVoiceDictation';

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
interface ChatMessage {
    id: string;
    channelId: string;
    sender: string;
    senderInitials: string;
    senderColor: string;
    text: string;
    timestamp: string;
    isPinned?: boolean;
    reactions?: Record<string, string[]>; // emoji -> list of user names
    replyTo?: string; // message id
    replyPreview?: string;
    attachments?: { name: string; type: 'image' | 'file'; size: string }[];
    isEdited?: boolean;
    readBy?: string[];
    // Voice message fields
    isVoice?: boolean;
    voiceDuration?: number; // seconds
    audioUrl?: string;      // Blob URL for playback
}

const MOCK_MESSAGES: ChatMessage[] = [
    {
        id: '1', channelId: 'general', sender: 'Maria L.', senderInitials: 'ML',
        senderColor: 'bg-pink-600', text: 'Staff meeting at 4 PM today. Everyone must attend.',
        timestamp: '14:32', isPinned: true, readBy: ['JK', 'CM', 'SP'],
        reactions: { '👍': ['John K.', 'Sarah P.'], '🎉': ['Chef Marco'] },
    },
    {
        id: '2', channelId: 'general', sender: 'John K.', senderInitials: 'JK',
        senderColor: 'bg-blue-600', text: 'Got it! Will be there.',
        timestamp: '14:35', readBy: ['ML'],
    },
    {
        id: '3', channelId: 'kitchen', sender: 'Chef Marco', senderInitials: 'CM',
        senderColor: 'bg-orange-600', text: '#Order847 needs to be medium-rare, NOT well done! Please double check before plating.',
        timestamp: '14:40', reactions: { '🔥': ['Sarah P.'] },
    },
    {
        id: '4', channelId: 'kitchen', sender: 'Sarah P.', senderInitials: 'SP',
        senderColor: 'bg-teal-600', text: 'Confirmed! Fixing it now for @Table12.',
        timestamp: '14:41:22', replyTo: '3', replyPreview: '#Order847 needs to be medium-rare...',
    },
    {
        id: '5', channelId: 'general', sender: 'Alex R.', senderInitials: 'AR',
        senderColor: 'bg-violet-600', text: 'VIP guests on @Table3 — please prioritize their #Order902.',
        timestamp: '14:45:10', reactions: { '⭐': ['Maria L.', 'John K.'] },
    },
    {
        id: '5b', channelId: 'kitchen', sender: 'Chef Marco', senderInitials: 'CM',
        senderColor: 'bg-orange-600', text: 'Hey team, the supplier just called — fresh sea bass is arriving at 4pm, let\'s prep the station now.',
        timestamp: '14:47:33', isVoice: true, voiceDuration: 8,
    },
    {
        id: '6', channelId: 'alerts', sender: 'System', senderInitials: '⚡',
        senderColor: 'bg-red-600', text: 'Low stock alert: $ItemFlour is below reorder threshold.',
        timestamp: '14:50:00',
    },
    {
        id: '7', channelId: 'alerts', sender: 'System', senderInitials: '⚡',
        senderColor: 'bg-red-600', text: 'IoT: Coffee machine temperature above normal range (96°C).',
        timestamp: '14:52:15',
    },
    {
        id: '8', channelId: 'bar', sender: 'Tony B.', senderInitials: 'TB',
        senderColor: 'bg-purple-600', text: 'Running low on Aperol. Please add to next order.',
        timestamp: '15:01:44',
        attachments: [{ name: 'aperol-photo.jpg', type: 'image', size: '1.2 MB' }],
    },
    {
        id: '9', channelId: 'management', sender: 'Maria L.', senderInitials: 'ML',
        senderColor: 'bg-pink-600', text: 'Labor cost at 32% this week — target is 28%. Need to optimize weekend shifts.',
        timestamp: '15:10',
        attachments: [{ name: 'labor-report.pdf', type: 'file', size: '245 KB' }],
    },
];

// ─── Online Staff ───────────────────────────────────────────────────────
interface OnlineStaff {
    name: string;
    initials: string;
    color: string;
    role: string;
    status: 'online' | 'busy' | 'away';
}

const ONLINE_STAFF: OnlineStaff[] = [
    { name: 'Maria L.', initials: 'ML', color: 'bg-pink-600', role: 'Manager', status: 'online' },
    { name: 'Chef Marco', initials: 'CM', color: 'bg-orange-600', role: 'Head Chef', status: 'busy' },
    { name: 'John K.', initials: 'JK', color: 'bg-blue-600', role: 'Waiter', status: 'online' },
    { name: 'Sarah P.', initials: 'SP', color: 'bg-teal-600', role: 'Waitress', status: 'online' },
    { name: 'Tony B.', initials: 'TB', color: 'bg-purple-600', role: 'Bartender', status: 'away' },
    { name: 'Alex R.', initials: 'AR', color: 'bg-violet-600', role: 'Host', status: 'online' },
];

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
}

const SEED_TASKS: MicroTask[] = [
    { id: 't1', title: 'Clean coffee machine', urgency: 'HIGH', xp: 100, deadline: '15:30', status: 'pool', recurrence: 'daily' },
    { id: 't2', title: 'Restock napkins at Table 5-8', urgency: 'MEDIUM', xp: 50, status: 'pool' },
    { id: 't3', title: 'Polish wine glasses', urgency: 'LOW', xp: 30, status: 'pool' },
    { id: 't4', title: 'Update daily specials board', urgency: 'MEDIUM', xp: 50, deadline: '16:00', status: 'assigned', assignedTo: 'Sarah P.', department: 'floor' },
    { id: 't5', title: 'Inventory count — freezer', urgency: 'HIGH', xp: 150, deadline: '17:00', status: 'assigned', assignedTo: 'You', department: 'kitchen' },
    { id: 't6', title: 'Check walk-in fridge temps', urgency: 'CRITICAL', xp: 80, status: 'pool', recurrence: 'shift-start' },
];

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

// ─── Smart Token Renderer ──────────────────────────────────────────────
function SmartTokenSpan({ token }: { token: SmartToken }) {
    if (token.type === 'ORDER_LINK') {
        return (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 text-xs font-medium cursor-pointer hover:bg-blue-500/30 transition-colors">
                📋 {token.text}
            </span>
        );
    }
    if (token.type === 'TABLE_LINK') {
        return (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-xs font-medium cursor-pointer hover:bg-emerald-500/30 transition-colors">
                🪑 {token.text}
            </span>
        );
    }
    if (token.type === 'ITEM_LINK') {
        return (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-xs font-medium cursor-pointer hover:bg-amber-500/30 transition-colors">
                📦 {token.text}
            </span>
        );
    }
    return <span>{token.text}</span>;
}

function SmartMessageRenderer({ text }: { text: string }) {
    const tokens = useMemo(() => parseSmartMessage(text), [text]);
    return (
        <span>
            {tokens.map((token, i) => (
                <SmartTokenSpan key={i} token={token} />
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
    const [messageInput, setMessageInput] = useState('');
    const [messages, setMessages] = useState<ChatMessage[]>(MOCK_MESSAGES);
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

    // Voice dictation — mic button fills the input field
    const { isListening, interimText, toggleDictation, isSupported: dictationSupported } = useVoiceDictation({
        onResult: (text: string) => setMessageInput(prev => (prev + ' ' + text).trim()),
        onInterim: () => { /* interim shown via interimText state */ },
    });

    // TTS — read a message aloud
    const handleSpeak = useCallback((msgId: string, text: string) => {
        if (speakingMsgId === msgId && isSpeaking()) {
            stopSpeaking();
            setSpeakingMsgId(null);
        } else {
            speakMessage(text);
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
                sender: result.speaker,
                senderInitials: 'ME',
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

    // Send message
    const handleSend = useCallback(() => {
        if (!messageInput.trim()) return;
        const newMsg: ChatMessage = {
            id: `msg-${Date.now()}`,
            channelId: activeChannel,
            sender: 'You',
            senderInitials: 'ME',
            senderColor: 'bg-zinc-600',
            text: messageInput,
            timestamp: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            replyTo: replyingTo?.id,
            replyPreview: replyingTo ? replyingTo.text.substring(0, 60) + (replyingTo.text.length > 60 ? '...' : '') : undefined,
        };
        setMessages(prev => [...prev, newMsg]);
        setMessageInput('');
        setReplyingTo(null);
        playNotifSound();
    }, [messageInput, activeChannel, replyingTo, playNotifSound]);

    // Edit message
    const handleSaveEdit = useCallback((msgId: string) => {
        if (!editText.trim()) return;
        setMessages(prev => prev.map(m => m.id === msgId ? { ...m, text: editText, isEdited: true } : m));
        setEditingId(null);
        setEditText('');
    }, [editText]);

    // Delete message
    const handleDelete = useCallback((msgId: string) => {
        setMessages(prev => prev.filter(m => m.id !== msgId));
    }, []);

    // Add reaction
    const addReaction = useCallback((msgId: string, emoji: string) => {
        setMessages(prev => prev.map(m => {
            if (m.id !== msgId) return m;
            const reactions = { ...(m.reactions || {}) };
            const users = reactions[emoji] || [];
            if (users.includes('You')) {
                reactions[emoji] = users.filter(u => u !== 'You');
                if (reactions[emoji].length === 0) delete reactions[emoji];
            } else {
                reactions[emoji] = [...users, 'You'];
            }
            return { ...m, reactions };
        }));
        setShowEmojiPicker(null);
    }, []);

    // Toggle pin
    const togglePin = useCallback((msgId: string) => {
        setMessages(prev => prev.map(m => m.id === msgId ? { ...m, isPinned: !m.isPinned } : m));
    }, []);

    // Task management (stateful)
    const [tasks, setTasks] = useState<MicroTask[]>(SEED_TASKS);
    const [showCreateTask, setShowCreateTask] = useState(false);
    const [createFromMessage, setCreateFromMessage] = useState<ChatMessage | null>(null);
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [newTaskUrgency, setNewTaskUrgency] = useState<MicroTask['urgency']>('MEDIUM');
    const [newTaskAssignee, setNewTaskAssignee] = useState('');
    const [newTaskDeadline, setNewTaskDeadline] = useState('');
    const [newTaskRecurrence, setNewTaskRecurrence] = useState<MicroTask['recurrence']>('none');

    // Task actions
    const claimTask = useCallback((taskId: string) => {
        setTasks(prev => prev.map(t =>
            t.id === taskId ? { ...t, status: 'assigned' as const, assignedTo: 'You' } : t
        ));
    }, []);

    const startTask = useCallback((taskId: string) => {
        setTasks(prev => prev.map(t =>
            t.id === taskId ? { ...t, status: 'in-progress' as const, startedAt: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) } : t
        ));
    }, []);

    const completeTask = useCallback((taskId: string) => {
        setTasks(prev => prev.map(t =>
            t.id === taskId ? { ...t, status: 'done' as const, completedAt: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) } : t
        ));
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

    const submitNewTask = useCallback(() => {
        if (!newTaskTitle.trim()) return;
        const task: MicroTask = {
            id: `task-${Date.now()}`,
            title: newTaskTitle.trim(),
            urgency: newTaskUrgency,
            xp: newTaskUrgency === 'CRITICAL' ? 200 : newTaskUrgency === 'HIGH' ? 100 : newTaskUrgency === 'MEDIUM' ? 50 : 30,
            status: newTaskAssignee ? 'assigned' : 'pool',
            assignedTo: newTaskAssignee || undefined,
            deadline: newTaskDeadline || undefined,
            recurrence: newTaskRecurrence,
            sourceMessageId: createFromMessage?.id,
        };
        setTasks(prev => [task, ...prev]);
        setShowCreateTask(false);
        setCreateFromMessage(null);
        setNewTaskTitle('');
    }, [newTaskTitle, newTaskUrgency, newTaskAssignee, newTaskDeadline, newTaskRecurrence, createFromMessage]);

    const poolTasks = tasks.filter(t => t.status === 'pool');
    const myTasks = tasks.filter(t => (t.status === 'assigned' || t.status === 'in-progress') && t.assignedTo === 'You');
    const allActiveTasks = tasks.filter(t => t.status !== 'done');
    const doneTasks = tasks.filter(t => t.status === 'done');

    return (
        <div className="h-[calc(100vh-64px)] flex bg-zinc-950 text-zinc-100 overflow-hidden rounded-xl border border-zinc-800/50">

            {/* ─── LEFT: Channels & Staff ───────────────────────────────── */}
            <div className="w-64 flex-shrink-0 border-r border-zinc-800 flex flex-col bg-zinc-950/80">
                {/* Header */}
                <div className="p-4 border-b border-zinc-800">
                    <h2 className="text-lg font-bold flex items-center gap-2">
                        <motion.span
                            className="text-2xl"
                            animate={{ rotate: [0, 10, -10, 0] }}
                            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                        >
                            🐝
                        </motion.span>
                        THE HIVE
                    </h2>
                    <p className="text-xs text-zinc-500 mt-1">Team Communication Hub</p>
                </div>

                {/* Search */}
                <div className="px-3 py-2">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
                        <Input
                            placeholder="Search messages..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="bg-zinc-900 border-zinc-800 text-zinc-300 placeholder:text-zinc-600 pl-8 h-8 text-xs"
                        />
                    </div>
                </div>

                {/* Channels */}
                <div className="px-3 py-2">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 mb-2">Channels</p>
                    <div className="space-y-0.5">
                        {CHANNELS.map(ch => (
                            <button
                                key={ch.id}
                                onClick={() => setActiveChannel(ch.id)}
                                className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-sm transition-all ${activeChannel === ch.id
                                    ? 'bg-zinc-800 text-zinc-100'
                                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
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
                    <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 mb-2">Direct Messages</p>
                    <div className="space-y-0.5">
                        {ONLINE_STAFF.filter(s => s.status === 'online').slice(0, 3).map(s => {
                            const dmId = `dm-${s.name.toLowerCase().replace(/\s+/g, '-')}`;
                            return (
                                <button
                                    key={dmId}
                                    onClick={() => setActiveChannel(dmId)}
                                    className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-sm transition-all ${activeChannel === dmId
                                        ? 'bg-zinc-800 text-zinc-100'
                                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
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
                    <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 mb-2">
                        Online — {ONLINE_STAFF.filter(s => s.status === 'online').length}
                    </p>
                    <div className="space-y-1">
                        {ONLINE_STAFF.map(s => {
                            const dmId = `dm-${s.name.toLowerCase().replace(/\s+/g, '-')}`;
                            return (
                                <div
                                    key={s.name}
                                    className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-zinc-900 cursor-pointer transition-colors"
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
                        <Button variant="ghost" size="sm" className="h-7 text-xs text-amber-400 hover:text-amber-300">
                            <Pin className="h-3 w-3 mr-1" /> {pinnedMessages.length} Pinned
                        </Button>
                    )}
                    <Button variant="ghost" size="sm" className="h-7 text-xs text-zinc-400 hover:text-zinc-100">
                        <Users className="h-3 w-3 mr-1" /> {ONLINE_STAFF.length}
                    </Button>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4">
                    <div className="space-y-3 max-w-3xl">
                        <AnimatePresence>
                            {channelMessages.map(msg => (
                                <motion.div
                                    key={msg.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="flex gap-3 group relative"
                                >
                                    <div className={`h-8 w-8 rounded-full flex-shrink-0 mt-0.5 ${msg.senderColor} flex items-center justify-center`}>
                                        <span className="text-white text-[10px] font-bold">{msg.senderInitials}</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        {/* Reply Reference */}
                                        {msg.replyTo && msg.replyPreview && (
                                            <div className="flex items-center gap-1.5 mb-1 pl-2 border-l-2 border-zinc-700">
                                                <Reply className="h-3 w-3 text-zinc-600 rotate-180" />
                                                <span className="text-[10px] text-zinc-500 truncate max-w-xs">{msg.replyPreview}</span>
                                            </div>
                                        )}

                                        <div className="flex items-baseline gap-2">
                                            <span className="font-semibold text-sm text-zinc-200">{msg.sender}</span>
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
                                                            onClick={() => {
                                                                const existing = document.getElementById(`audio-${msg.id}`) as HTMLAudioElement | null;
                                                                if (existing) {
                                                                    if (existing.paused) {
                                                                        existing.play();
                                                                    } else {
                                                                        existing.pause();
                                                                        existing.currentTime = 0;
                                                                    }
                                                                }
                                                            }}
                                                            className="h-6 w-6 rounded-full bg-red-500/20 hover:bg-red-500/30 flex items-center justify-center text-red-400 transition-colors flex-shrink-0"
                                                            title="Play voice message"
                                                        >
                                                            <Play className="h-3 w-3 ml-0.5" />
                                                        </button>
                                                    ) : (
                                                        <Mic className="h-3.5 w-3.5 text-red-400 flex-shrink-0" />
                                                    )}
                                                    <div className="flex items-end gap-0.5 h-4">
                                                        {Array.from({ length: 20 }).map((_, i) => (
                                                            <div
                                                                key={i}
                                                                className="w-1 rounded-full bg-red-500/60"
                                                                style={{ height: `${4 + Math.sin(i * 0.7) * 8 + Math.random() * 6}px` }}
                                                            />
                                                        ))}
                                                    </div>
                                                    <span className="text-[10px] text-zinc-500 ml-1">{msg.voiceDuration}s</span>
                                                </div>
                                                {msg.audioUrl && (
                                                    <audio id={`audio-${msg.id}`} src={msg.audioUrl} preload="metadata" className="hidden" />
                                                )}
                                                {msg.text && msg.text !== '🎙️ Voice message' && (
                                                    <p className="text-xs text-zinc-400 italic leading-relaxed pl-5">
                                                        "{msg.text}"
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
                                                <Button size="sm" className="h-8 bg-emerald-600 hover:bg-emerald-500 text-white" onClick={() => handleSaveEdit(msg.id)}>
                                                    <Check className="h-3 w-3" />
                                                </Button>
                                                <Button size="sm" variant="ghost" className="h-8 text-zinc-400" onClick={() => setEditingId(null)}>
                                                    <X className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        ) : (
                                            <p className="text-sm text-zinc-300 mt-0.5 leading-relaxed">
                                                <SmartMessageRenderer text={msg.text} />
                                            </p>
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
                                            className="h-6 w-6 rounded hover:bg-zinc-800 text-zinc-400 hover:text-emerald-400 flex items-center justify-center transition-colors"
                                            title="Create task from message"
                                        >
                                            <CheckSquare className="h-3.5 w-3.5" />
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
                                </motion.div>
                            ))}
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
                            <button onClick={() => setReplyingTo(null)} className="text-zinc-500 hover:text-zinc-300">
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

                {/* Message Input */}
                <div className="p-4 border-t border-zinc-800 bg-zinc-950/80 flex-shrink-0">
                    <div className="flex gap-2 max-w-3xl relative">
                        {/* Attachment Button */}
                        <div className="relative">
                            <button
                                onClick={() => setShowAttachMenu(!showAttachMenu)}
                                className="h-9 w-9 rounded-lg bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-zinc-200 transition-colors"
                            >
                                <Paperclip className="h-4 w-4" />
                            </button>
                            <AnimatePresence>
                                {showAttachMenu && (
                                    <motion.div
                                        className="absolute bottom-12 left-0 bg-zinc-900 border border-zinc-700 rounded-xl shadow-xl w-40 overflow-hidden z-10"
                                        initial={{ opacity: 0, y: 5 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 5 }}
                                    >
                                        <button className="w-full flex items-center gap-2 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800 transition-colors">
                                            <Image className="h-3.5 w-3.5 text-blue-400" /> Upload Image
                                        </button>
                                        <button className="w-full flex items-center gap-2 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800 transition-colors">
                                            <FileText className="h-3.5 w-3.5 text-amber-400" /> Upload File
                                        </button>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        <Input
                            ref={inputRef}
                            placeholder={`Message #${activeChannelData?.name || 'channel'}... (use / for shortcuts)`}
                            value={messageInput}
                            onChange={e => {
                                setMessageInput(e.target.value);
                                setShowQuickPicker(e.target.value === '/');
                            }}
                            onKeyDown={e => { if (e.key === 'Enter') handleSend(); }}
                            className="bg-zinc-900 border-zinc-800 text-zinc-200 placeholder:text-zinc-600 flex-1 h-9"
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
                            className="bg-blue-600 hover:bg-blue-500 text-white px-4 h-9"
                            onClick={handleSend}
                            disabled={!messageInput.trim()}
                        >
                            <Send className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>

            {/* ─── RIGHT: Tasks + Call Log + PTT Panel ─────────────────── */}
            <div className="w-72 flex-shrink-0 border-l border-zinc-800 flex flex-col bg-zinc-950/80">
                <Tabs defaultValue="tasks" className="flex flex-col h-full">
                    <TabsList className="bg-zinc-900 border-b border-zinc-800 rounded-none h-14 px-2 flex-shrink-0">
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

                        {/* Create Task Form (Popover) */}
                        <AnimatePresence>
                            {showCreateTask && (
                                <motion.div
                                    className="p-3 rounded-lg bg-zinc-900 border border-zinc-700 space-y-2"
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                >
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs font-bold text-zinc-300">
                                            {createFromMessage ? '📋 From Message' : '➕ New Task'}
                                        </p>
                                        <button onClick={() => setShowCreateTask(false)} className="text-zinc-500 hover:text-zinc-300" title="Close">
                                            <X className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                    <Input
                                        placeholder="Task title..."
                                        value={newTaskTitle}
                                        onChange={e => setNewTaskTitle(e.target.value)}
                                        className="bg-zinc-800 border-zinc-700 text-zinc-200 h-8 text-xs"
                                    />
                                    <div className="grid grid-cols-2 gap-2">
                                        <select
                                            value={newTaskUrgency}
                                            onChange={e => setNewTaskUrgency(e.target.value as MicroTask['urgency'])}
                                            className="bg-zinc-800 border border-zinc-700 rounded-md text-xs text-zinc-300 h-8 px-2"
                                            title="Task urgency level"
                                        >
                                            <option value="LOW">Low</option>
                                            <option value="MEDIUM">Medium</option>
                                            <option value="HIGH">High</option>
                                            <option value="CRITICAL">Critical</option>
                                        </select>
                                        <select
                                            value={newTaskAssignee}
                                            onChange={e => setNewTaskAssignee(e.target.value)}
                                            className="bg-zinc-800 border border-zinc-700 rounded-md text-xs text-zinc-300 h-8 px-2"
                                            title="Assign task to staff"
                                        >
                                            <option value="">Unassigned (Pool)</option>
                                            <option value="You">Assign to Me</option>
                                            {ONLINE_STAFF.map(s => (
                                                <option key={s.name} value={s.name}>{s.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <Input
                                            placeholder="Deadline (HH:MM)"
                                            value={newTaskDeadline}
                                            onChange={e => setNewTaskDeadline(e.target.value)}
                                            className="bg-zinc-800 border-zinc-700 text-zinc-200 h-8 text-xs"
                                        />
                                        <select
                                            value={newTaskRecurrence}
                                            onChange={e => setNewTaskRecurrence(e.target.value as MicroTask['recurrence'])}
                                            className="bg-zinc-800 border border-zinc-700 rounded-md text-xs text-zinc-300 h-8 px-2"
                                            title="Task recurrence schedule"
                                        >
                                            <option value="none">No Repeat</option>
                                            <option value="daily">Daily</option>
                                            <option value="weekly">Weekly</option>
                                            <option value="shift-start">Shift Start</option>
                                            <option value="shift-end">Shift End</option>
                                        </select>
                                    </div>
                                    <Button
                                        size="sm"
                                        className="w-full h-8 bg-emerald-600 hover:bg-emerald-500 text-white text-xs"
                                        onClick={submitNewTask}
                                        disabled={!newTaskTitle.trim()}
                                    >
                                        <Check className="h-3.5 w-3.5 mr-1" /> Create Task
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
                                            className="p-3 rounded-lg bg-zinc-900 border border-blue-500/20 space-y-2"
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <p className="text-sm font-medium text-zinc-200">{task.title}</p>
                                                <Badge className={`text-[10px] shrink-0 ${task.urgency === 'CRITICAL' ? 'bg-red-700 text-white' : task.urgency === 'HIGH' ? 'bg-red-600 text-white' :
                                                    task.urgency === 'MEDIUM' ? 'bg-amber-600 text-white' : 'bg-zinc-700 text-zinc-300'}`}>
                                                    {task.urgency}
                                                </Badge>
                                            </div>
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
                                    className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 space-y-2"
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <p className="text-sm font-medium text-zinc-200">{task.title}</p>
                                        <Badge className={`text-[10px] shrink-0 ${task.urgency === 'CRITICAL' ? 'bg-red-700 text-white' : task.urgency === 'HIGH' ? 'bg-red-600 text-white' :
                                            task.urgency === 'MEDIUM' ? 'bg-amber-600 text-white' : 'bg-zinc-700 text-zinc-300'}`}>
                                            {task.urgency}
                                        </Badge>
                                    </div>
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
                                    {ONLINE_STAFF.filter(s => s.status === 'online').slice(0, 4).map(s => {
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
                                                        onClick={() => {
                                                            const el = document.getElementById(`log-audio-${entry.id}`) as HTMLAudioElement | null;
                                                            if (el) {
                                                                if (el.paused) { el.play(); } else { el.pause(); el.currentTime = 0; }
                                                            }
                                                        }}
                                                        className="h-5 w-5 rounded-full bg-blue-500/20 hover:bg-blue-500/30 flex items-center justify-center text-blue-400 transition-colors"
                                                        title="Play recording"
                                                    >
                                                        <Play className="h-2.5 w-2.5 ml-0.5" />
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
                                                "{entry.transcript}"
                                            </p>
                                        )}
                                        {entry.audioUrl && (
                                            <audio id={`log-audio-${entry.id}`} src={entry.audioUrl} preload="metadata" className="hidden" />
                                        )}
                                    </motion.div>
                                ))
                            )}
                        </AnimatePresence>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
