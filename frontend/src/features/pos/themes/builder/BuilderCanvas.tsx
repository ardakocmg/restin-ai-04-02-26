/**
 * BuilderCanvas — Premium POS/KDS layout preview with drag-drop,
 * resize handles, context menu, and framer-motion animations.
 */
import React, { useState, useRef, useCallback } from 'react';
import { X, Move, Eye, EyeOff, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import type { ZoneConfig, ZoneComponentDef, ZonePosition } from './themeZoneTypes';
import { getComponentDef } from './themeZoneTypes';
import type { ThemeStyleValues } from './StyleEditor';
import ZoneContextMenu from './ZoneContextMenu';

interface BuilderCanvasProps {
    zones: ZoneConfig[];
    styles: ThemeStyleValues;
    selectedZoneId: string | null;
    onSelectZone: (id: string | null) => void;
    onRemoveZone: (id: string) => void;
    onToggleVisibility: (id: string) => void;
    onDropZone: (def: ZoneComponentDef, position: string) => void;
    onReorderZone: (zoneId: string, direction: 'up' | 'down') => void;
    onDuplicateZone: (zoneId: string) => void;
    onMoveZoneTo: (zoneId: string, position: ZonePosition) => void;
    onUpdateZoneWidth: (zoneId: string, width: string) => void;
}

// ─── Context Menu State ──────────────────────────────────────────

interface ContextMenuState {
    zoneId: string;
    x: number;
    y: number;
}

// ─── Zone Card ───────────────────────────────────────────────────

function ZoneCard({
    zone,
    isSelected,
    styles,
    onSelect,
    onRemove,
    onToggleVisibility,
    onContextMenu,
    onDragStart,
    onDragOver,
    onDrop,
}: {
    zone: ZoneConfig;
    isSelected: boolean;
    styles: ThemeStyleValues;
    onSelect: () => void;
    onRemove: () => void;
    onToggleVisibility: () => void;
    onContextMenu: (e: React.MouseEvent) => void;
    onDragStart: (e: React.DragEvent) => void;
    onDragOver: (e: React.DragEvent) => void;
    onDrop: (e: React.DragEvent) => void;
}) {
    const def = getComponentDef(zone.component);
    if (!def) return null;
    const [isDragOver, setIsDragOver] = useState(false);

    return (
        <motion.div
            layout
            layoutId={zone.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.15 } }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        >
            <div
                draggable
                onDragStart={onDragStart}
                onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsDragOver(true);
                    onDragOver(e);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={(e) => {
                    setIsDragOver(false);
                    onDrop(e);
                }}
                onClick={(e) => { e.stopPropagation(); onSelect(); }}
                onContextMenu={onContextMenu}
                className={cn(
                    "relative group rounded-lg border-2 transition-all cursor-pointer",
                    "flex items-center min-h-12",
                    isSelected
                        ? "border-teal-500 shadow-lg shadow-teal-500/20 ring-2 ring-teal-500/30"
                        : "border-border hover:border-zinc-500",
                    !zone.visible && "opacity-40",
                    isDragOver && "border-teal-400 bg-teal-500/5"
                )}
                style={{ /* keep-inline */
                    backgroundColor: styles.tileBg + '40',
                    borderRadius: `${styles.tileRadius}px`,
                }}
            >
                {/* Drag handle */}
                <div className="flex items-center px-1.5 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity">
                    <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
                </div>

                {/* Label */}
                <div className="flex-1 text-center px-2 py-2">
                    <p className="text-xs font-semibold text-secondary-foreground">{def.name}</p>
                    <p className="text-[10px] text-muted-foreground">{zone.position} · {zone.width || 'auto'}</p>
                </div>

                {/* Toolbar (visible on hover / selected) */}
                <div className={cn(
                    "absolute -top-2 -right-2 flex gap-1 transition-opacity z-10",
                    isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                )}>
                    <button
                        onClick={(e) => { e.stopPropagation(); onToggleVisibility(); }}
                        title={zone.visible ? 'Hide zone' : 'Show zone'}
                        className="w-5 h-5 rounded-full bg-secondary border border-zinc-600 flex items-center justify-center hover:bg-secondary/80 transition-colors"
                    >
                        {zone.visible ? <Eye className="h-2.5 w-2.5 text-muted-foreground" /> : <EyeOff className="h-2.5 w-2.5 text-muted-foreground" />}
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onRemove(); }}
                        title="Remove zone"
                        className="w-5 h-5 rounded-full bg-red-900/80 border border-red-700 flex items-center justify-center hover:bg-red-800 transition-colors"
                    >
                        <X className="h-2.5 w-2.5 text-red-400" />
                    </button>
                </div>

                {/* Selection pulse */}
                {isSelected && (
                    <motion.div
                        className="absolute inset-0 rounded-lg border-2 border-teal-400 pointer-events-none"
                        initial={{ opacity: 0.8 }}
                        animate={{ opacity: [0.8, 0.3, 0.8] }}
                        transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
                        style={{ borderRadius: `${styles.tileRadius}px` }} /* keep-inline */
                    />
                )}
            </div>
        </motion.div>
    );
}

// ─── Main Canvas ─────────────────────────────────────────────────

export default function BuilderCanvas({
    zones,
    styles,
    selectedZoneId,
    onSelectZone,
    onRemoveZone,
    onToggleVisibility,
    onDropZone,
    onReorderZone,
    onDuplicateZone,
    onMoveZoneTo,
    onUpdateZoneWidth,
}: BuilderCanvasProps) {
    const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
    const [draggedZoneId, setDraggedZoneId] = useState<string | null>(null);
    const [resizing, setResizing] = useState<{ panel: 'left' | 'right'; startX: number; startWidth: number } | null>(null);
    const [leftPanelWidth, setLeftPanelWidth] = useState(160);
    const [rightPanelWidth, setRightPanelWidth] = useState(160);
    const canvasRef = useRef<HTMLDivElement>(null);

    const topZones = zones.filter(z => z.position === 'top').sort((a, b) => a.order - b.order);
    const leftZones = zones.filter(z => z.position === 'left').sort((a, b) => a.order - b.order);
    const centerZones = zones.filter(z => z.position === 'center').sort((a, b) => a.order - b.order);
    const rightZones = zones.filter(z => z.position === 'right').sort((a, b) => a.order - b.order);
    const bottomZones = zones.filter(z => z.position === 'bottom').sort((a, b) => a.order - b.order);

    // ─── Drag from palette ────────────────────────────────────────
    const handlePaletteDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
    };

    const handlePaletteDrop = (e: React.DragEvent, position: string) => {
        e.preventDefault();
        try {
            const data = e.dataTransfer.getData('zone-component');
            if (data) {
                const def = JSON.parse(data) as ZoneComponentDef;
                onDropZone(def, position);
            }
            // Zone reorder drop
            const reorderData = e.dataTransfer.getData('zone-reorder');
            if (reorderData) {
                const { zoneId } = JSON.parse(reorderData) as { zoneId: string };
                onMoveZoneTo(zoneId, position as ZonePosition);
            }
        } catch {
            // Invalid drag
        }
    };

    // ─── Zone-to-zone drag for reorder ────────────────────────────
    const handleZoneDragStart = (e: React.DragEvent, zoneId: string) => {
        e.dataTransfer.setData('zone-reorder', JSON.stringify({ zoneId }));
        e.dataTransfer.effectAllowed = 'move';
        setDraggedZoneId(zoneId);
    };

    const handleZoneDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleZoneDrop = (e: React.DragEvent, targetZoneId: string, targetPosition: ZonePosition) => {
        e.preventDefault();
        e.stopPropagation();
        const data = e.dataTransfer.getData('zone-reorder');
        if (data) {
            const { zoneId: sourceId } = JSON.parse(data) as { zoneId: string };
            if (sourceId === targetZoneId) return;

            const sourceZone = zones.find(z => z.id === sourceId);
            if (!sourceZone) return;

            if (sourceZone.position !== targetPosition) {
                // Cross-position move
                onMoveZoneTo(sourceId, targetPosition);
            } else {
                // Same position reorder — determine direction
                const posZones = zones.filter(z => z.position === sourceZone.position).sort((a, b) => a.order - b.order);
                const sourceIdx = posZones.findIndex(z => z.id === sourceId);
                const targetIdx = posZones.findIndex(z => z.id === targetZoneId);
                if (sourceIdx < targetIdx) {
                    for (let i = sourceIdx; i < targetIdx; i++) onReorderZone(sourceId, 'down');
                } else {
                    for (let i = sourceIdx; i > targetIdx; i--) onReorderZone(sourceId, 'up');
                }
            }
        }
        setDraggedZoneId(null);
    };

    // ─── Resize handles ───────────────────────────────────────────
    const handleResizeStart = useCallback((e: React.MouseEvent, panel: 'left' | 'right') => {
        e.preventDefault();
        const startWidth = panel === 'left' ? leftPanelWidth : rightPanelWidth;
        setResizing({ panel, startX: e.clientX, startWidth });

        const handleMouseMove = (ev: MouseEvent) => {
            const delta = panel === 'left' ? ev.clientX - e.clientX : e.clientX - ev.clientX;
            const newWidth = Math.max(80, Math.min(320, startWidth + delta));
            if (panel === 'left') setLeftPanelWidth(newWidth);
            else setRightPanelWidth(newWidth);
        };
        const handleMouseUp = () => {
            setResizing(null);
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        };
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
    }, [leftPanelWidth, rightPanelWidth]);

    // ─── Context Menu ─────────────────────────────────────────────
    const handleContextMenu = (e: React.MouseEvent, zoneId: string) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenu({ zoneId, x: e.clientX, y: e.clientY });
        onSelectZone(zoneId);
    };

    const contextZone = contextMenu ? zones.find(z => z.id === contextMenu.zoneId) : null;
    const contextDef = contextZone ? getComponentDef(contextZone.component) : null;

    const getCanMoveUp = (zoneId: string) => {
        const zone = zones.find(z => z.id === zoneId);
        if (!zone) return false;
        const posZones = zones.filter(z => z.position === zone.position).sort((a, b) => a.order - b.order);
        return posZones.findIndex(z => z.id === zoneId) > 0;
    };

    const getCanMoveDown = (zoneId: string) => {
        const zone = zones.find(z => z.id === zoneId);
        if (!zone) return false;
        const posZones = zones.filter(z => z.position === zone.position).sort((a, b) => a.order - b.order);
        return posZones.findIndex(z => z.id === zoneId) < posZones.length - 1;
    };

    const getCanDuplicate = (zoneId: string) => {
        const zone = zones.find(z => z.id === zoneId);
        if (!zone) return false;
        const def = getComponentDef(zone.component);
        if (!def) return false;
        return zones.filter(z => z.component === zone.component).length < def.maxInstances;
    };

    // ─── Render Drop Area ─────────────────────────────────────────
    const renderDropArea = (position: ZonePosition, zoneList: ZoneConfig[]) => {
        const [isOver, setIsOver] = useState(false);
        return (
            <div
                onDragOver={(e) => { handlePaletteDragOver(e); setIsOver(true); }}
                onDragLeave={() => setIsOver(false)}
                onDrop={(e) => { setIsOver(false); handlePaletteDrop(e, position); }}
                className={cn(
                    "rounded-lg border-2 border-dashed transition-all p-2 min-h-14",
                    isOver
                        ? "border-teal-500 bg-teal-500/5 shadow-inner shadow-teal-500/10"
                        : zoneList.length > 0
                            ? "border-transparent"
                            : "border-border/50 hover:border-zinc-600/50"
                )}
            >
                {zoneList.length === 0 ? (
                    <div className={cn(
                        "flex items-center justify-center h-full text-[10px] uppercase tracking-wider transition-colors",
                        isOver ? "text-teal-400" : "text-muted-foreground"
                    )}>
                        {isOver ? '⬇ Drop here' : `Drop ${position}`}
                    </div>
                ) : (
                    <AnimatePresence mode="popLayout">
                        <div className={cn(
                            position === 'top' || position === 'bottom'
                                ? "flex gap-2"
                                : "space-y-2"
                        )}>
                            {zoneList.map((zone) => (
                                <ZoneCard
                                    key={zone.id}
                                    zone={zone}
                                    isSelected={selectedZoneId === zone.id}
                                    styles={styles}
                                    onSelect={() => onSelectZone(zone.id)}
                                    onRemove={() => onRemoveZone(zone.id)}
                                    onToggleVisibility={() => onToggleVisibility(zone.id)}
                                    onContextMenu={(e) => handleContextMenu(e, zone.id)}
                                    onDragStart={(e) => handleZoneDragStart(e, zone.id)}
                                    onDragOver={handleZoneDragOver}
                                    onDrop={(e) => handleZoneDrop(e, zone.id, position)}
                                />
                            ))}
                        </div>
                    </AnimatePresence>
                )}
            </div>
        );
    };

    // ─── Resize Divider ───────────────────────────────────────────
    const ResizeDivider = ({ panel }: { panel: 'left' | 'right' }) => (
        <div
            onMouseDown={(e) => handleResizeStart(e, panel)}
            className={cn(
                "w-1.5 cursor-col-resize flex-shrink-0 group/divider relative transition-colors",
                resizing?.panel === panel ? "bg-teal-500" : "bg-transparent hover:bg-zinc-600"
            )}
        >
            <div className="absolute inset-y-0 -left-1 -right-1" /> {/* wider hit area */}
            <div className={cn(
                "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-8 rounded-full transition-colors",
                resizing?.panel === panel ? "bg-teal-400" : "bg-zinc-700 group-hover/divider:bg-zinc-500"
            )} />
        </div>
    );

    return (
        <div className="flex-1 flex flex-col gap-2" onClick={() => { onSelectZone(null); setContextMenu(null); }}>
            {/* Canvas header */}
            <div className="flex items-center justify-between px-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Live Preview
                </h3>
                <div className="flex items-center gap-2">
                    {resizing && (
                        <span className="text-[10px] text-teal-400 font-mono animate-pulse">
                            {resizing.panel === 'left' ? leftPanelWidth : rightPanelWidth}px
                        </span>
                    )}
                    <span className="text-[10px] text-muted-foreground">{zones.length} zones</span>
                </div>
            </div>

            {/* Canvas area */}
            <div
                ref={canvasRef}
                className="flex-1 rounded-xl border border-border overflow-hidden flex flex-col"
                style={{ /* keep-inline */
                    backgroundColor: styles.rootBg,
                    fontFamily: styles.fontFamily,
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Top row */}
                <div style={{ backgroundColor: styles.topBarBg }}> /* keep-inline */
                    {renderDropArea('top', topZones)}
                </div>

                {/* Middle row: left | divider | center | divider | right */}
                <div className="flex flex-1 min-h-[300px]">
                    <div
                        style={{ /* keep-inline */
                            backgroundColor: styles.sidebarBg,
                            width: `${leftPanelWidth}px`,
                            minWidth: '80px',
                            maxWidth: '320px',
                        }}
                        className="flex-shrink-0 transition-[width]"
                    >
                        {renderDropArea('left', leftZones)}
                    </div>

                    <ResizeDivider panel="left" />

                    <div className="flex-1" style={{ backgroundColor: styles.rootBg }}> /* keep-inline */
                        {renderDropArea('center', centerZones)}
                    </div>

                    <ResizeDivider panel="right" />

                    <div
                        style={{ /* keep-inline */
                            backgroundColor: styles.orderPanelBg,
                            width: `${rightPanelWidth}px`,
                            minWidth: '80px',
                            maxWidth: '320px',
                        }}
                        className="flex-shrink-0 transition-[width]"
                    >
                        {renderDropArea('right', rightZones)}
                    </div>
                </div>

                {/* Bottom row */}
                <div style={{ backgroundColor: styles.topBarBg }}> /* keep-inline */
                    {renderDropArea('bottom', bottomZones)}
                </div>
            </div>

            {/* Context Menu */}
            {contextMenu && contextZone && contextDef && (
                <ZoneContextMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    zoneName={contextDef.name}
                    isVisible={contextZone.visible}
                    canMoveUp={getCanMoveUp(contextMenu.zoneId)}
                    canMoveDown={getCanMoveDown(contextMenu.zoneId)}
                    canDuplicate={getCanDuplicate(contextMenu.zoneId)}
                    currentPosition={contextZone.position}
                    onClose={() => setContextMenu(null)}
                    onEdit={() => onSelectZone(contextMenu.zoneId)}
                    onDuplicate={() => onDuplicateZone(contextMenu.zoneId)}
                    onMoveUp={() => onReorderZone(contextMenu.zoneId, 'up')}
                    onMoveDown={() => onReorderZone(contextMenu.zoneId, 'down')}
                    onMoveTo={(pos) => onMoveZoneTo(contextMenu.zoneId, pos)}
                    onToggleVisibility={() => onToggleVisibility(contextMenu.zoneId)}
                    onDelete={() => onRemoveZone(contextMenu.zoneId)}
                />
            )}
        </div>
    );
}
