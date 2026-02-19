/**
 * Hive Chat — Shared Types & Constants
 * Extracted from HiveDashboard.tsx for code splitting
 */
import { Hash, ChefHat, Wine, Briefcase, Bell, Bot } from 'lucide-react';

// ─── Channel Definitions ────────────────────────────────────────────────
export interface Channel {
    id: string;
    name: string;
    icon: React.ElementType;
    color: string;
    unread: number;
    description: string;
}

export const CHANNELS: Channel[] = [
    { id: 'general', name: 'General', icon: Hash, color: 'text-blue-400', unread: 3, description: 'Team-wide announcements' },
    { id: 'kitchen', name: 'Kitchen', icon: ChefHat, color: 'text-orange-400', unread: 1, description: 'Kitchen comms & orders' },
    { id: 'bar', name: 'Bar', icon: Wine, color: 'text-purple-400', unread: 0, description: 'Bar operations' },
    { id: 'management', name: 'Management', icon: Briefcase, color: 'text-emerald-400', unread: 0, description: 'Managers only' },
    { id: 'alerts', name: 'Alerts', icon: Bell, color: 'text-red-400', unread: 5, description: 'System alerts & IoT' },
    { id: 'restin-ai', name: 'Hey Rin', icon: Bot, color: 'text-violet-400', unread: 0, description: 'Hey Rin — ask questions about your venue' },
];

// ─── Message Types ──────────────────────────────────────────────────────
export interface PollOption {
    id: string;
    text: string;
    votes: string[];
}

export interface ChatMessage {
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
    isVoice?: boolean;
    voiceDuration?: number;
    audioUrl?: string;
    transcriptConfidence?: number;
    isBookmarked?: boolean;
    isPriority?: boolean;
    isScheduled?: boolean;
    scheduledTime?: string;
    poll?: { question: string; options: PollOption[]; multiSelect?: boolean };
    reminder?: { time: string; label?: string };
    isTranslated?: boolean;
    translatedText?: string;
    templateId?: string;
}

// ─── Online Staff ───────────────────────────────────────────────────────
export interface OnlineStaff {
    name: string;
    initials: string;
    color: string;
    role: string;
    status: 'online' | 'busy' | 'away' | 'offline';
    id?: string;
}

// ─── Micro-Tasks ────────────────────────────────────────────────────────
export interface MicroTask {
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

// ─── Quick Messages ─────────────────────────────────────────────────────
export interface QuickMessage {
    command: string;
    label: string;
    emoji: string;
    text: string;
}

export const QUICK_MESSAGES: QuickMessage[] = [
    { command: '/86', label: '86 Item', emoji: '\ud83d\udeab', text: '\ud83d\udeab 86d \u2014 Item is no longer available' },
    { command: '/vip', label: 'VIP Alert', emoji: '\u2b50', text: '\u2b50 VIP guest arriving \u2014 priority service required' },
    { command: '/fire', label: 'Fire Course', emoji: '\ud83d\udd25', text: '\ud83d\udd25 FIRE \u2014 Send the next course NOW' },
    { command: '/hold', label: 'Hold Course', emoji: '\u23f8\ufe0f', text: '\u23f8\ufe0f HOLD \u2014 Do NOT send next course yet' },
    { command: '/clean', label: 'Cleanup', emoji: '\ud83e\uddf9', text: '\ud83e\uddf9 Table needs immediate cleanup' },
    { command: '/help', label: 'Need Help', emoji: '\ud83c\udd98', text: '\ud83c\udd98 Need assistance at my station immediately' },
];

// ─── Reactions ──────────────────────────────────────────────────────────
export const REACTION_EMOJIS = ['\ud83d\udc4d', '\u2764\ufe0f', '\ud83d\ude02', '\ud83d\udd25', '\ud83c\udf89', '\u2b50', '\ud83d\udc40', '\u2705'];

// ─── Smart Chip Styles ──────────────────────────────────────────────────
export const SMART_CHIP_STYLES: Record<string, { bg: string; text: string; border: string; glow: string; icon: string; label: string }> = {
    ORDER_LINK: { bg: 'bg-blue-500/15', text: 'text-blue-300', border: 'border-blue-500/30', glow: 'shadow-blue-500/20', icon: '\ud83d\udccb', label: 'Order' },
    TABLE_LINK: { bg: 'bg-emerald-500/15', text: 'text-emerald-300', border: 'border-emerald-500/30', glow: 'shadow-emerald-500/20', icon: '\ud83e\ude91', label: 'Table' },
    ITEM_LINK: { bg: 'bg-amber-500/15', text: 'text-amber-300', border: 'border-amber-500/30', glow: 'shadow-amber-500/20', icon: '\ud83d\udce6', label: 'Inventory' },
    RECIPE_LINK: { bg: 'bg-rose-500/15', text: 'text-rose-300', border: 'border-rose-500/30', glow: 'shadow-rose-500/20', icon: '\ud83c\udf73', label: 'Recipe' },
    RESERVATION_LINK: { bg: 'bg-violet-500/15', text: 'text-violet-300', border: 'border-violet-500/30', glow: 'shadow-violet-500/20', icon: '\ud83d\udcc5', label: 'Reservation' },
    STAFF_MENTION: { bg: 'bg-cyan-500/15', text: 'text-cyan-300', border: 'border-cyan-500/30', glow: 'shadow-cyan-500/20', icon: '\ud83d\udc64', label: 'Staff' },
    GUEST_LINK: { bg: 'bg-pink-500/15', text: 'text-pink-300', border: 'border-pink-500/30', glow: 'shadow-pink-500/20', icon: '\ud83c\udfaf', label: 'Guest' },
};

// ─── API Helpers ────────────────────────────────────────────────────────
export const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export function mapApiMessage(m: Record<string, unknown>): ChatMessage {
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

// ─── Message Templates ──────────────────────────────────────────────────
export const MESSAGE_TEMPLATES = [
    { id: 't1', name: 'Shift Handover', text: '\ud83d\udccb **Shift Handover Report**\n- Pending orders: \n- Notes: \n- Issues: ' },
    { id: 't2', name: 'Daily Special', text: '\ud83c\udf7d\ufe0f **Today\'s Special**: \n\ud83d\udcb0 Price: €\n\u23f0 Available: until sold out' },
    { id: 't3', name: 'Kitchen Alert', text: '\ud83d\udd34 **KITCHEN ALERT**\n- Item: \n- Status: 86\'d / Low Stock\n- ETA: ' },
    { id: 't4', name: 'Staff Update', text: '\ud83d\udc65 **Staff Update**\n- Who: \n- What: \n- When: ' },
    { id: 't5', name: 'Reservation Note', text: '\ud83d\udcde **Reservation**\n- Name: \n- Covers: \n- Time: \n- Notes: ' },
];
