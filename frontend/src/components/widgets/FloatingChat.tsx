import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
    MessageSquare, X, Send, Hash, ChefHat, Wine, Briefcase, Bell,
    Minimize2, Maximize2, ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { parseSmartMessage, SmartToken } from '@/lib/smartParser';

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

// ─── Message Types ──────────────────────────────────────────────────────
interface ChatMessage {
    id: string;
    channelId: string;
    sender: string;
    senderInitials: string;
    senderColor: string;
    text: string;
    timestamp: string;
    reactions?: Record<string, number>;
}

const SEED_MESSAGES: ChatMessage[] = [
    { id: '1', channelId: 'general', sender: 'Maria L.', senderInitials: 'ML', senderColor: 'bg-pink-600', text: 'Staff meeting at 4 PM today.', timestamp: '14:32' },
    { id: '2', channelId: 'general', sender: 'John K.', senderInitials: 'JK', senderColor: 'bg-blue-600', text: 'Got it! Will be there.', timestamp: '14:35' },
    { id: '3', channelId: 'kitchen', sender: 'Chef Marco', senderInitials: 'CM', senderColor: 'bg-orange-600', text: '#Order847 needs medium-rare!', timestamp: '14:40' },
    { id: '4', channelId: 'alerts', sender: 'System', senderInitials: '⚡', senderColor: 'bg-red-600', text: '$ItemFlour is below reorder threshold.', timestamp: '14:50' },
];

// ─── Smart Token Renderer ──────────────────────────────────────────────
function SmartTokenSpan({ token }: { token: SmartToken }) {
    if (token.type === 'ORDER_LINK') {
        return <span className="px-1 py-0.5 rounded bg-blue-500/20 text-blue-300 text-[10px] font-medium cursor-pointer">📋 {token.text}</span>;
    }
    if (token.type === 'TABLE_LINK') {
        return <span className="px-1 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-medium cursor-pointer">🪑 {token.text}</span>;
    }
    if (token.type === 'ITEM_LINK') {
        return <span className="px-1 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-medium cursor-pointer">📦 {token.text}</span>;
    }
    return <span>{token.text}</span>;
}

function MiniMessage({ text }: { text: string }) {
    const tokens = useMemo(() => parseSmartMessage(text), [text]);
    return <span>{tokens.map((t, i) => <SmartTokenSpan key={i} token={t} />)}</span>;
}

// ─── Floating Chat Widget ──────────────────────────────────────────────
export default function FloatingChat() {
    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [activeChannel, setActiveChannel] = useState('general');
    const [messageInput, setMessageInput] = useState('');
    const [messages, setMessages] = useState<ChatMessage[]>(SEED_MESSAGES);
    const [showChannels, setShowChannels] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const totalUnread = CHANNELS.reduce((s, c) => s + c.unread, 0);
    const activeChannelData = CHANNELS.find(c => c.id === activeChannel);

    const channelMessages = useMemo(() =>
        messages.filter(m => m.channelId === activeChannel),
        [messages, activeChannel]
    );

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [channelMessages, isOpen]);

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

    // Bubble (closed state)
    if (!isOpen) {
        return (
            <motion.button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-[0_4px_30px_rgba(245,158,11,0.4)] hover:shadow-[0_4px_40px_rgba(245,158,11,0.6)] transition-shadow group"
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.95 }}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 260, damping: 20 }}
            >
                <span className="text-2xl">🐝</span>
                {totalUnread > 0 && (
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -top-1 -right-1 h-5 min-w-5 rounded-full bg-red-500 text-foreground text-[10px] font-bold flex items-center justify-center px-1 border-2 border-zinc-950"
                    >
                        {totalUnread}
                    </motion.div>
                )}
            </motion.button>
        );
    }

    // Minimized bar
    if (isMinimized) {
        return (
            <motion.div
                className="fixed bottom-6 right-6 z-50 h-12 bg-card border border-border rounded-xl flex items-center gap-2 px-4 shadow-2xl cursor-pointer"
                onClick={() => setIsMinimized(false)}
                whileHover={{ scale: 1.02 }}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
            >
                <span className="text-lg">🐝</span>
                <span className="text-sm text-secondary-foreground font-medium">Hive Chat</span>
                {totalUnread > 0 && (
                    <Badge className="bg-red-500 text-foreground text-[10px] border-0 h-4 px-1">{totalUnread}</Badge>
                )}
                <button title="Close chat" onClick={(e) => { e.stopPropagation(); setIsOpen(false); setIsMinimized(false); }} className="ml-2 text-muted-foreground hover:text-secondary-foreground">
                    <X className="h-3.5 w-3.5" />
                </button>
            </motion.div>
        );
    }

    // Full Widget
    return (
        <AnimatePresence>
            <motion.div
                className="fixed bottom-6 right-6 z-50 w-[380px] h-[520px] bg-background border border-border rounded-2xl shadow-[0_8px_60px_rgba(0,0,0,0.6)] flex flex-col overflow-hidden"
                initial={{ y: 40, opacity: 0, scale: 0.9 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: 40, opacity: 0, scale: 0.9 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            >
                {/* Header */}
                <div className="h-12 border-b border-border flex items-center justify-between px-3 bg-card/80 backdrop-blur-sm flex-shrink-0">
                    <div className="flex items-center gap-2">
                        <span className="text-lg">🐝</span>
                        <button
                            onClick={() => setShowChannels(!showChannels)}
                            className="flex items-center gap-1.5 text-sm font-medium text-secondary-foreground hover:text-foreground transition-colors"
                        >
                            {activeChannelData && <activeChannelData.icon className={`h-3.5 w-3.5 ${activeChannelData.color}`} />}
                            <span>{activeChannelData?.name || 'General'}</span>
                            <ChevronDown className={`h-3 w-3 text-muted-foreground transition-transform ${showChannels ? 'rotate-180' : ''}`} />
                        </button>
                    </div>
                    <div className="flex items-center gap-1">
                        <button title="Minimize chat" onClick={() => setIsMinimized(true)} className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-secondary-foreground transition-colors">
                            <Minimize2 className="h-3.5 w-3.5" />
                        </button>
                        <button title="Close chat" onClick={() => setIsOpen(false)} className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-secondary-foreground transition-colors">
                            <X className="h-3.5 w-3.5" />
                        </button>
                    </div>
                </div>

                {/* Channel Dropdown */}
                <AnimatePresence>
                    {showChannels && (
                        <motion.div
                            className="border-b border-border bg-card/60 overflow-hidden flex-shrink-0"
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.15 }}
                        >
                            <div className="p-2 space-y-0.5">
                                {CHANNELS.map(ch => (
                                    <button
                                        key={ch.id}
                                        onClick={() => { setActiveChannel(ch.id); setShowChannels(false); }}
                                        className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs transition-all ${activeChannel === ch.id ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-secondary-foreground hover:bg-secondary/50'
                                            }`}
                                    >
                                        <ch.icon className={`h-3.5 w-3.5 ${ch.color}`} />
                                        <span className="flex-1 text-left">{ch.name}</span>
                                        {ch.unread > 0 && (
                                            <Badge className="h-4 min-w-4 px-1 text-[10px] bg-blue-600 text-foreground border-0">{ch.unread}</Badge>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                    {channelMessages.length === 0 ? (
                        <div className="flex-1 flex items-center justify-center h-full">
                            <div className="text-center">
                                <MessageSquare className="h-8 w-8 text-foreground mx-auto mb-2" />
                                <p className="text-xs text-muted-foreground">{"No "}messages in #{activeChannelData?.name}</p>
                            </div>
                        </div>
                    ) : (
                        channelMessages.map(msg => (
                            <motion.div
                                key={msg.id}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex gap-2 group"
                            >
                                <div className={`h-7 w-7 rounded-full ${msg.senderColor} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                                    <span className="text-foreground text-[9px] font-bold">{msg.senderInitials}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-baseline gap-1.5">
                                        <span className="text-xs font-semibold text-secondary-foreground">{msg.sender}</span>
                                        <span className="text-[10px] text-muted-foreground">{msg.timestamp}</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                                        <MiniMessage text={msg.text} />
                                    </p>
                                    {/* Emoji Reactions */}
                                    {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                                        <div className="flex gap-1 mt-1">
                                            {Object.entries(msg.reactions).map(([emoji, count]) => (
                                                <button key={emoji} className="px-1.5 py-0.5 rounded-full bg-secondary text-[10px] hover:bg-secondary/80 transition-colors">
                                                    {emoji} {count}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                    {/* Quick Reaction Bar (hover) */}
                                    <div className="flex gap-0.5 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {['👍', '❤️', '😂', '🔥', '🎉'].map(emoji => (
                                            <button
                                                key={emoji}
                                                onClick={() => {
                                                    setMessages(prev => prev.map(m => {
                                                        if (m.id !== msg.id) return m;
                                                        const reactions = { ...(m.reactions || {}) };
                                                        reactions[emoji] = (reactions[emoji] || 0) + 1;
                                                        return { ...m, reactions };
                                                    }));
                                                }}
                                                className="h-5 w-5 rounded hover:bg-secondary text-[10px] flex items-center justify-center transition-colors"
                                            >
                                                {emoji}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </motion.div>
                        ))
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Typing Indicator */}
                <div className="px-3 pb-1 h-5 flex-shrink-0">
                    <motion.p
                        className="text-[10px] text-muted-foreground italic"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        key="typing"
                    >
                        {/* Would be driven by websocket event */}
                    </motion.p>
                </div>

                {/* Input */}
                <div className="p-3 border-t border-border bg-card/50 flex-shrink-0">
                    <div className="flex gap-2">
                        <Input
                            placeholder={`Message #${activeChannelData?.name || 'channel'}...`}
                            value={messageInput}
                            onChange={e => setMessageInput(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') handleSend(); }}
                            className="bg-card border-border text-secondary-foreground placeholder:text-muted-foreground text-xs h-8 flex-1"
                        />
                        <button
                            title="Send message"
                            onClick={handleSend}
                            disabled={!messageInput.trim()}
                            className="h-8 w-8 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:bg-secondary disabled:text-muted-foreground text-foreground flex items-center justify-center transition-colors flex-shrink-0"
                        >
                            <Send className="h-3.5 w-3.5" />
                        </button>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
