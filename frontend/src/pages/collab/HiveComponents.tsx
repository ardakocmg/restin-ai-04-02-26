/**
 * Hive Chat — Small Helper Components
 * Extracted from HiveDashboard.tsx and wrapped with React.memo for perf
 */
import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Image, FileText } from 'lucide-react';
import { parseSmartMessage, SmartToken } from '@/lib/smartParser';
import { SMART_CHIP_STYLES } from './hiveTypes';

// ─── Smart Token Span (memoized) ────────────────────────────────────────
interface SmartTokenSpanProps {
    token: SmartToken;
    onNavigate?: (route: string) => void;
}

export const SmartTokenSpan = React.memo(function SmartTokenSpan({ token, onNavigate }: SmartTokenSpanProps) {
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
});

// ─── Smart Message Renderer (memoized) ──────────────────────────────────
export const SmartMessageRenderer = React.memo(function SmartMessageRenderer(
    { text, onNavigate }: { text: string; onNavigate?: (route: string) => void }
) {
    const tokens = useMemo(() => parseSmartMessage(text), [text]);
    return (
        <span className="leading-relaxed">
            {tokens.map((token, i) => (
                <SmartTokenSpan key={i} token={token} onNavigate={onNavigate} />
            ))}
        </span>
    );
});

// ─── Typing Indicator (memoized) ────────────────────────────────────────
export const TypingIndicator = React.memo(function TypingIndicator({ names }: { names: string[] }) {
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
            <span className="text-[10px] text-muted-foreground italic">{text}</span>
        </motion.div>
    );
});

// ─── Attachment Preview (memoized) ──────────────────────────────────────
export const AttachmentBubble = React.memo(function AttachmentBubble(
    { att }: { att: { name: string; type: 'image' | 'file'; size: string } }
) {
    return (
        <div className="mt-1.5 inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-secondary/60 border border-border/50 hover:bg-secondary/80/60 transition-colors cursor-pointer">
            {att.type === 'image' ? (
                <Image className="h-3.5 w-3.5 text-blue-400" />
            ) : (
                <FileText className="h-3.5 w-3.5 text-amber-400" />
            )}
            <span className="text-xs text-secondary-foreground">{att.name}</span>
            <span className="text-[10px] text-muted-foreground">{att.size}</span>
        </div>
    );
});
