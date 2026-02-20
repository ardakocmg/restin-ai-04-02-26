/**
 * ZoneContextMenu — Premium right-click context menu for builder zones
 * 
 * Appears at cursor position with zone operations:
 * Edit, Duplicate, Move, Reorder, Toggle Visibility, Delete
 */
import React, { useEffect, useRef } from 'react';
import {
    Pencil, Copy, Trash2, Eye, EyeOff,
    ArrowUp, ArrowDown, MoveRight, ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ZonePosition } from './themeZoneTypes';

interface ContextMenuAction {
    label: string;
    icon: React.ElementType;
    shortcut?: string;
    danger?: boolean;
    disabled?: boolean;
    onClick: () => void;
    submenu?: { label: string; value: string; active?: boolean; onClick: () => void }[];
}

interface ZoneContextMenuProps {
    x: number;
    y: number;
    zoneName: string;
    isVisible: boolean;
    canMoveUp: boolean;
    canMoveDown: boolean;
    canDuplicate: boolean;
    currentPosition: ZonePosition;
    onClose: () => void;
    onEdit: () => void;
    onDuplicate: () => void;
    onMoveUp: () => void;
    onMoveDown: () => void;
    onMoveTo: (position: ZonePosition) => void;
    onToggleVisibility: () => void;
    onDelete: () => void;
}

const POSITIONS: { label: string; value: ZonePosition }[] = [
    { label: 'Top', value: 'top' },
    { label: 'Left Sidebar', value: 'left' },
    { label: 'Center', value: 'center' },
    { label: 'Right Panel', value: 'right' },
    { label: 'Bottom', value: 'bottom' },
];

export default function ZoneContextMenu({
    x,
    y,
    zoneName,
    isVisible,
    canMoveUp,
    canMoveDown,
    canDuplicate,
    currentPosition,
    onClose,
    onEdit,
    onDuplicate,
    onMoveUp,
    onMoveDown,
    onMoveTo,
    onToggleVisibility,
    onDelete,
}: ZoneContextMenuProps) {
    const menuRef = useRef<HTMLDivElement>(null);
    const [showMoveSubmenu, setShowMoveSubmenu] = React.useState(false);

    // Close on outside click or Escape
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                onClose();
            }
        };
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('mousedown', handleClick);
        document.addEventListener('keydown', handleKey);
        return () => {
            document.removeEventListener('mousedown', handleClick);
            document.removeEventListener('keydown', handleKey);
        };
    }, [onClose]);

    // Clamp position to viewport
    const clampedX = Math.min(x, window.innerWidth - 220);
    const clampedY = Math.min(y, window.innerHeight - 350);

    return (
        <div
            ref={menuRef}
            className="fixed z-50 animate-in fade-in zoom-in-95 duration-100"
            style={{ left: clampedX, top: clampedY }}
        >
            <div className="w-52 bg-card border border-border rounded-xl shadow-2xl shadow-black/50 overflow-hidden backdrop-blur-xl">
                {/* Header */}
                <div className="px-3 py-2 border-b border-border">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">{zoneName}</p>
                </div>

                {/* Actions */}
                <div className="py-1">
                    {/* Edit */}
                    <MenuItem
                        icon={Pencil}
                        label="Edit Properties"
                        shortcut="E"
                        onClick={() => { onEdit(); onClose(); }}
                    />

                    {/* Duplicate */}
                    <MenuItem
                        icon={Copy}
                        label="Duplicate"
                        shortcut="⌘D"
                        disabled={!canDuplicate}
                        onClick={() => { onDuplicate(); onClose(); }}
                    />

                    <div className="h-px bg-secondary my-1" />

                    {/* Move Up / Down */}
                    <MenuItem
                        icon={ArrowUp}
                        label="Move Up"
                        shortcut="↑"
                        disabled={!canMoveUp}
                        onClick={() => { onMoveUp(); onClose(); }}
                    />
                    <MenuItem
                        icon={ArrowDown}
                        label="Move Down"
                        shortcut="↓"
                        disabled={!canMoveDown}
                        onClick={() => { onMoveDown(); onClose(); }}
                    />

                    {/* Move To (submenu) */}
                    <div
                        className="relative"
                        onMouseEnter={() => setShowMoveSubmenu(true)}
                        onMouseLeave={() => setShowMoveSubmenu(false)}
                    >
                        <button
                            className="w-full flex items-center gap-2.5 px-3 py-1.5 text-xs text-secondary-foreground hover:bg-secondary transition-colors"
                        >
                            <MoveRight className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="flex-1 text-left">Move To</span>
                            <ChevronRight className="h-3 w-3 text-muted-foreground" />
                        </button>

                        {showMoveSubmenu && (
                            <div className="absolute left-full top-0 ml-1 w-40 bg-card border border-border rounded-lg shadow-xl overflow-hidden animate-in fade-in slide-in-from-left-1 duration-100">
                                {POSITIONS.map((pos) => (
                                    <button
                                        key={pos.value}
                                        disabled={pos.value === currentPosition}
                                        onClick={() => { onMoveTo(pos.value); onClose(); }}
                                        className={cn(
                                            "w-full text-left px-3 py-1.5 text-xs transition-colors",
                                            pos.value === currentPosition
                                                ? "text-muted-foreground cursor-not-allowed bg-secondary/50"
                                                : "text-secondary-foreground hover:bg-secondary"
                                        )}
                                    >
                                        {pos.label}
                                        {pos.value === currentPosition && (
                                            <span className="ml-1.5 text-[10px] text-teal-500">•</span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="h-px bg-secondary my-1" />

                    {/* Visibility */}
                    <MenuItem
                        icon={isVisible ? EyeOff : Eye}
                        label={isVisible ? 'Hide Zone' : 'Show Zone'}
                        shortcut="V"
                        onClick={() => { onToggleVisibility(); onClose(); }}
                    />

                    <div className="h-px bg-secondary my-1" />

                    {/* Delete */}
                    <MenuItem
                        icon={Trash2}
                        label="Delete Zone"
                        shortcut="⌫"
                        danger
                        onClick={() => { onDelete(); onClose(); }}
                    />
                </div>
            </div>
        </div>
    );
}

function MenuItem({
    icon: Icon,
    label,
    shortcut,
    danger,
    disabled,
    onClick,
}: {
    icon: React.ElementType;
    label: string;
    shortcut?: string;
    danger?: boolean;
    disabled?: boolean;
    onClick: () => void;
}) {
    return (
        <button
            disabled={disabled}
            onClick={onClick}
            className={cn(
                "w-full flex items-center gap-2.5 px-3 py-1.5 text-xs transition-colors",
                disabled
                    ? "text-muted-foreground cursor-not-allowed"
                    : danger
                        ? "text-red-400 hover:bg-red-500/10"
                        : "text-secondary-foreground hover:bg-secondary"
            )}
        >
            <Icon className={cn("h-3.5 w-3.5", disabled ? "text-zinc-700" : danger ? "text-red-500" : "text-muted-foreground")} />
            <span className="flex-1 text-left">{label}</span>
            {shortcut && (
                <span className="text-[10px] text-muted-foreground font-mono">{shortcut}</span>
            )}
        </button>
    );
}
