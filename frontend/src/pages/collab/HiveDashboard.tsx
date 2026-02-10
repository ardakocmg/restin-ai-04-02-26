import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    MessageSquare, Hash, Mic, MicOff, Send, Users, Radio,
    ChefHat, Wine, Briefcase, Bell, Search, Pin, Star,
    CheckSquare, Clock, Zap, Volume2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { parseSmartMessage, SmartToken } from '@/lib/smartParser';
import { useWalkieTalkie } from '@/hooks/useWalkieTalkie';

// ─── Channel Definitions ────────────────────────────────────────────────
interface Channel {
    id: string;
    name: string;
    icon: React.ElementType;
    color: string;
    unread: number;
}

const CHANNELS: Channel[] = [
    { id: 'general', name: 'General', icon: Hash, color: 'text-blue-400', unread: 3 },
    { id: 'kitchen', name: 'Kitchen', icon: ChefHat, color: 'text-orange-400', unread: 1 },
    { id: 'bar', name: 'Bar', icon: Wine, color: 'text-purple-400', unread: 0 },
    { id: 'management', name: 'Management', icon: Briefcase, color: 'text-emerald-400', unread: 0 },
    { id: 'alerts', name: 'Alerts', icon: Bell, color: 'text-red-400', unread: 5 },
];

// ─── Mock Messages ──────────────────────────────────────────────────────
interface ChatMessage {
    id: string;
    channelId: string;
    sender: string;
    senderInitials: string;
    senderColor: string;
    text: string;
    timestamp: string;
    isPinned?: boolean;
}

const MOCK_MESSAGES: ChatMessage[] = [
    {
        id: '1', channelId: 'general', sender: 'Maria L.', senderInitials: 'ML',
        senderColor: 'bg-pink-600', text: 'Staff meeting at 4 PM today. Everyone must attend.',
        timestamp: '14:32', isPinned: true,
    },
    {
        id: '2', channelId: 'general', sender: 'John K.', senderInitials: 'JK',
        senderColor: 'bg-blue-600', text: 'Got it! Will be there.',
        timestamp: '14:35',
    },
    {
        id: '3', channelId: 'kitchen', sender: 'Chef Marco', senderInitials: 'CM',
        senderColor: 'bg-orange-600', text: '#Order847 needs to be medium-rare, NOT well done! Please double check before plating.',
        timestamp: '14:40',
    },
    {
        id: '4', channelId: 'kitchen', sender: 'Sarah P.', senderInitials: 'SP',
        senderColor: 'bg-teal-600', text: 'Confirmed! Fixing it now for @Table12.',
        timestamp: '14:41',
    },
    {
        id: '5', channelId: 'general', sender: 'Alex R.', senderInitials: 'AR',
        senderColor: 'bg-violet-600', text: 'VIP guests on @Table3 — please prioritize their #Order902.',
        timestamp: '14:45',
    },
    {
        id: '6', channelId: 'alerts', sender: 'System', senderInitials: '⚡',
        senderColor: 'bg-red-600', text: 'Low stock alert: $ItemFlour is below reorder threshold.',
        timestamp: '14:50',
    },
    {
        id: '7', channelId: 'alerts', sender: 'System', senderInitials: '⚡',
        senderColor: 'bg-red-600', text: 'IoT: Coffee machine temperature above normal range (96°C).',
        timestamp: '14:52',
    },
    {
        id: '8', channelId: 'bar', sender: 'Tony B.', senderInitials: 'TB',
        senderColor: 'bg-purple-600', text: 'Running low on Aperol. Please add to next order.',
        timestamp: '15:01',
    },
    {
        id: '9', channelId: 'management', sender: 'Maria L.', senderInitials: 'ML',
        senderColor: 'bg-pink-600', text: 'Labor cost at 32% this week — target is 28%. Need to optimize weekend shifts.',
        timestamp: '15:10',
    },
];

// ─── Active Staff (Online) ──────────────────────────────────────────────
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
    urgency: 'LOW' | 'MEDIUM' | 'HIGH';
    xp: number;
    assignee?: string;
}

const TASKS: MicroTask[] = [
    { id: 't1', title: 'Clean coffee machine', urgency: 'HIGH', xp: 100 },
    { id: 't2', title: 'Restock napkins at Table 5-8', urgency: 'MEDIUM', xp: 50 },
    { id: 't3', title: 'Polish wine glasses', urgency: 'LOW', xp: 30 },
    { id: 't4', title: 'Update daily specials board', urgency: 'MEDIUM', xp: 50 },
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

// ─── Main Dashboard ─────────────────────────────────────────────────────
export default function HiveDashboard() {
    const [activeChannel, setActiveChannel] = useState('general');
    const [messageInput, setMessageInput] = useState('');
    const [messages, setMessages] = useState<ChatMessage[]>(MOCK_MESSAGES);
    const [searchQuery, setSearchQuery] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // PTT
    const { isTalking, isConnected, startTalking, stopTalking, micPermission } = useWalkieTalkie(activeChannel);

    // Filter messages
    const channelMessages = useMemo(() =>
        messages.filter(m => m.channelId === activeChannel),
        [messages, activeChannel]
    );

    const activeChannelData = CHANNELS.find(c => c.id === activeChannel);

    // Auto-scroll
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [channelMessages]);

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
            timestamp: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages(prev => [...prev, newMsg]);
        setMessageInput('');
    }, [messageInput, activeChannel]);

    return (
        <div className="h-[calc(100vh-64px)] flex bg-zinc-950 text-zinc-100 overflow-hidden">
            {/* ─── LEFT: Channels & Staff ───────────────────────────────── */}
            <div className="w-64 flex-shrink-0 border-r border-zinc-800 flex flex-col bg-zinc-950/80">
                {/* Header */}
                <div className="p-4 border-b border-zinc-800">
                    <h2 className="text-lg font-bold flex items-center gap-2">
                        <span className="text-2xl">🐝</span> THE HIVE
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

                {/* Online Staff */}
                <div className="px-3 py-2 flex-1 overflow-auto">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 mb-2">
                        Online — {ONLINE_STAFF.filter(s => s.status === 'online').length}
                    </p>
                    <div className="space-y-1">
                        {ONLINE_STAFF.map(s => (
                            <div key={s.name} className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-zinc-900 cursor-pointer">
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
                            </div>
                        ))}
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
                <div className="h-14 border-b border-zinc-800 flex items-center px-4 gap-3 bg-zinc-950/80 backdrop-blur-sm">
                    {activeChannelData && (
                        <>
                            <activeChannelData.icon className={`h-5 w-5 ${activeChannelData.color}`} />
                            <h3 className="font-semibold text-zinc-100">{activeChannelData.name}</h3>
                            <Badge variant="outline" className="text-[10px] border-zinc-700 text-zinc-400">
                                {channelMessages.length} messages
                            </Badge>
                        </>
                    )}
                    <div className="flex-1" />
                    <Button variant="ghost" size="sm" className="h-7 text-xs text-zinc-400 hover:text-zinc-100">
                        <Pin className="h-3 w-3 mr-1" /> Pinned
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 text-xs text-zinc-400 hover:text-zinc-100">
                        <Users className="h-3 w-3 mr-1" /> Members
                    </Button>
                </div>

                {/* Messages */}
                <ScrollArea className="flex-1 p-4">
                    <div className="space-y-4 max-w-3xl">
                        <AnimatePresence>
                            {channelMessages.map(msg => (
                                <motion.div
                                    key={msg.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="flex gap-3 group"
                                >
                                    <div className={`h-8 w-8 rounded-full flex-shrink-0 mt-0.5 ${msg.senderColor} flex items-center justify-center`}>
                                        <span className="text-white text-[10px] font-bold">{msg.senderInitials}</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-baseline gap-2">
                                            <span className="font-semibold text-sm text-zinc-200">{msg.sender}</span>
                                            <span className="text-[10px] text-zinc-600">{msg.timestamp}</span>
                                            {msg.isPinned && (
                                                <Pin className="h-3 w-3 text-amber-500" />
                                            )}
                                        </div>
                                        <p className="text-sm text-zinc-300 mt-0.5 leading-relaxed">
                                            <SmartMessageRenderer text={msg.text} />
                                        </p>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                        <div ref={messagesEndRef} />
                    </div>
                </ScrollArea>

                {/* Message Input */}
                <div className="p-4 border-t border-zinc-800 bg-zinc-950/80">
                    <div className="flex gap-2 max-w-3xl">
                        <Input
                            placeholder={`Message #${activeChannelData?.name || 'channel'}... (use #Order, @Table, $Item for smart links)`}
                            value={messageInput}
                            onChange={e => setMessageInput(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') handleSend(); }}
                            className="bg-zinc-900 border-zinc-800 text-zinc-200 placeholder:text-zinc-600 flex-1"
                        />
                        <Button
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-500 text-white px-4"
                            onClick={handleSend}
                            disabled={!messageInput.trim()}
                        >
                            <Send className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>

            {/* ─── RIGHT: Tasks Panel ──────────────────────────────────── */}
            <div className="w-72 flex-shrink-0 border-l border-zinc-800 flex flex-col bg-zinc-950/80">
                <Tabs defaultValue="tasks" className="flex flex-col h-full">
                    <TabsList className="bg-zinc-900 border-b border-zinc-800 rounded-none h-14 px-2">
                        <TabsTrigger value="tasks" className="text-xs">
                            <CheckSquare className="h-3.5 w-3.5 mr-1" /> Tasks
                        </TabsTrigger>
                        <TabsTrigger value="ptt" className="text-xs">
                            <Radio className="h-3.5 w-3.5 mr-1" /> PTT
                        </TabsTrigger>
                    </TabsList>

                    {/* Tasks Tab */}
                    <TabsContent value="tasks" className="flex-1 overflow-auto p-3 mt-0 space-y-3">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">
                            Active Tasks — {TASKS.length}
                        </p>
                        {TASKS.map(task => (
                            <motion.div
                                key={task.id}
                                whileHover={{ scale: 1.01 }}
                                className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 space-y-2"
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <p className="text-sm font-medium text-zinc-200">{task.title}</p>
                                    <Badge className={`text-[10px] shrink-0 ${task.urgency === 'HIGH' ? 'bg-red-600 text-white' :
                                        task.urgency === 'MEDIUM' ? 'bg-amber-600 text-white' :
                                            'bg-zinc-700 text-zinc-300'
                                        }`}>
                                        {task.urgency}
                                    </Badge>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-zinc-500 flex items-center gap-1">
                                        <Zap className="h-3 w-3 text-amber-400" /> {task.xp} XP
                                    </span>
                                    <div className="flex gap-1.5">
                                        <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px] text-zinc-400 hover:text-red-400">
                                            Skip
                                        </Button>
                                        <Button size="sm" className="h-6 px-3 text-[10px] bg-emerald-600 hover:bg-emerald-500 text-white border-0">
                                            Done ✓
                                        </Button>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </TabsContent>

                    {/* PTT Tab */}
                    <TabsContent value="ptt" className="flex-1 flex flex-col items-center justify-center p-6 mt-0">
                        <div className="text-center space-y-4">
                            <p className="text-[10px] uppercase tracking-widest text-zinc-600 font-bold">
                                Walkie-Talkie
                            </p>
                            <p className="text-xs text-zinc-500">
                                Channel: <span className="text-zinc-300 font-medium">#{activeChannelData?.name}</span>
                            </p>

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
                            >
                                {/* Pulse rings when talking */}
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
                                    'Hold button to transmit'
                                )}
                            </p>

                            {/* Active Speakers */}
                            <div className="pt-4 border-t border-zinc-800 w-full">
                                <p className="text-[10px] uppercase tracking-widest text-zinc-600 mb-3">On this channel</p>
                                <div className="flex flex-wrap justify-center gap-2">
                                    {ONLINE_STAFF.filter(s => s.status === 'online').slice(0, 4).map(s => (
                                        <div key={s.name} className="flex flex-col items-center gap-1">
                                            <div className={`h-8 w-8 rounded-full ${s.color} flex items-center justify-center`}>
                                                <span className="text-white text-[10px] font-bold">{s.initials}</span>
                                            </div>
                                            <span className="text-[10px] text-zinc-500">{s.name.split(' ')[0]}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
