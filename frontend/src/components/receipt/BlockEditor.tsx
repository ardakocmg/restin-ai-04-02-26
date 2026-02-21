/**
 * BlockEditor — Drag & Drop receipt block editor
 * Users reorder receipt sections, toggle visibility, and add conditional rules.
 * Uses native HTML5 drag & drop (no external library needed).
 */
import {
ChevronDown,ChevronRight,
GripVertical,
Plus,
Settings2,
Trash2,
Zap
} from 'lucide-react';
import React,{ useCallback,useRef,useState } from 'react';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Select,SelectContent,SelectItem,SelectTrigger,SelectValue } from '../../components/ui/select';
import { Switch } from '../../components/ui/switch';
import { cn } from '../../lib/utils';
import { type ConditionalRule,type ConditionField,type ConditionOperator,type TemplateBlock } from './types';

/* ─── Condition Field Options ─── */
const CONDITION_FIELDS: { value: ConditionField; label: string }[] = [
    { value: 'order_type', label: 'Order Type' },
    { value: 'payment_method', label: 'Payment Method' },
    { value: 'time_of_day', label: 'Time of Day' },
    { value: 'day_of_week', label: 'Day of Week' },
    { value: 'total_amount', label: 'Total Amount' },
    { value: 'platform', label: 'Platform' },
    { value: 'guest_language', label: 'Guest Language' },
    { value: 'season', label: 'Season / Date' },
];

const CONDITION_OPERATORS: { value: ConditionOperator; label: string }[] = [
    { value: 'equals', label: '=' },
    { value: 'not_equals', label: '≠' },
    { value: 'greater_than', label: '>' },
    { value: 'less_than', label: '<' },
    { value: 'between', label: 'Between' },
    { value: 'in', label: 'In list' },
];

const VALUE_HINTS: Partial<Record<ConditionField, string>> = {
    order_type: 'dine_in, takeaway, delivery, room_charge',
    payment_method: 'cash, card, room_charge, aggregator',
    time_of_day: 'HH:MM (e.g. 16:00)',
    day_of_week: 'monday, tuesday, ...',
    total_amount: 'Amount in cents (e.g. 1000 = €10)',
    platform: 'pos, ubereats, wolt, bolt',
    guest_language: 'en, mt, it, de',
    season: 'christmas, valentines, summer, or YYYY-MM-DD',
};

/* ═════════════════════════════════════════════════════
   CONDITIONAL RULE EDITOR
   ═════════════════════════════════════════════════════ */

const ConditionalRuleRow: React.FC<{
    rule: ConditionalRule;
    onChange: (rule: ConditionalRule) => void;
    onDelete: () => void;
}> = ({ rule, onChange, onDelete }) => (
    <div className="flex items-center gap-2 p-2 rounded-lg bg-zinc-900/50 border border-white/5">
        <Zap className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />

        <Select aria-label="Select option" value={rule.field} onValueChange={v => onChange({ ...rule, field: v as ConditionField })}>
            <SelectTrigger aria-label="Select option" className="h-7 text-xs bg-zinc-800 border-white/5 w-28"><SelectValue /></SelectTrigger>
            <SelectContent>
                {CONDITION_FIELDS.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
            </SelectContent>
        </Select>

        <Select aria-label="Select option" value={rule.operator} onValueChange={v => onChange({ ...rule, operator: v as ConditionOperator })}>
            <SelectTrigger aria-label="Select option" className="h-7 text-xs bg-zinc-800 border-white/5 w-16"><SelectValue /></SelectTrigger>
            <SelectContent>
                {CONDITION_OPERATORS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
        </Select>

        <Input aria-label="Input field" value={rule.value} onChange={e => onChange({ ...rule, value: e.target.value })}
            placeholder={VALUE_HINTS[rule.field] || 'Value'}
            className="h-7 text-xs bg-zinc-800 border-white/5 flex-1" />

        <Select aria-label="Select option" value={rule.action} onValueChange={v => onChange({ ...rule, action: v as ConditionalRule['action'] })}>
            <SelectTrigger aria-label="Select option" className="h-7 text-xs bg-zinc-800 border-white/5 w-20"><SelectValue /></SelectTrigger>
            <SelectContent>
                <SelectItem value="show">Show</SelectItem>
                <SelectItem value="hide">Hide</SelectItem>
                <SelectItem value="replace_text">Replace</SelectItem>
            </SelectContent>
        </Select>

        <Button variant="ghost" size="sm" onClick={onDelete} aria-label="Action" className="h-7 w-7 p-0 text-muted-foreground hover:text-red-400">
            <Trash2 className="w-3 h-3" />
        </Button>
    </div>
);

/* ═════════════════════════════════════════════════════
   BLOCK EDITOR COMPONENT
   ═════════════════════════════════════════════════════ */

interface BlockEditorProps {
    blocks: TemplateBlock[];
    onChange: (blocks: TemplateBlock[]) => void;
}

export const BlockEditor: React.FC<BlockEditorProps> = ({ blocks, onChange }) => {
    const [expandedBlock, setExpandedBlock] = useState<string | null>(null);
    const [draggedId, setDraggedId] = useState<string | null>(null);
    const [dragOverId, setDragOverId] = useState<string | null>(null);
    const dragStartIndex = useRef<number>(-1);

    /* ── Drag Handlers ── */
    const handleDragStart = useCallback((e: React.DragEvent, blockId: string, index: number) => {
        setDraggedId(blockId);
        dragStartIndex.current = index;
        e.dataTransfer.effectAllowed = 'move';
        // Ghost image
        const el = e.currentTarget as HTMLElement;
        e.dataTransfer.setDragImage(el, el.offsetWidth / 2, 20);
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent, blockId: string) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setDragOverId(blockId);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent, targetIndex: number) => {
        e.preventDefault();
        setDraggedId(null);
        setDragOverId(null);

        if (dragStartIndex.current === targetIndex || dragStartIndex.current < 0) return;

        const updated = [...blocks];
        const [moved] = updated.splice(dragStartIndex.current, 1);
        updated.splice(targetIndex, 0, moved);
        // Re-index order
        onChange(updated.map((b, i) => ({ ...b, order: i })));
        dragStartIndex.current = -1;
    }, [blocks, onChange]);

    const handleDragEnd = useCallback(() => {
        setDraggedId(null);
        setDragOverId(null);
        dragStartIndex.current = -1;
    }, []);

    /* ── Toggle Block ── */
    const toggleBlock = useCallback((blockId: string) => {
        onChange(blocks.map(b => b.id === blockId ? { ...b, enabled: !b.enabled } : b));
    }, [blocks, onChange]);

    /* ── Condition CRUD ── */
    const addCondition = useCallback((blockId: string) => {
        const rule: ConditionalRule = {
            id: crypto.randomUUID(),
            field: 'order_type',
            operator: 'equals',
            value: '',
            action: 'show',
        };
        onChange(blocks.map(b => b.id === blockId ? { ...b, conditions: [...b.conditions, rule] } : b));
    }, [blocks, onChange]);

    const updateCondition = useCallback((blockId: string, ruleId: string, updated: ConditionalRule) => {
        onChange(blocks.map(b => b.id === blockId
            ? { ...b, conditions: b.conditions.map(c => c.id === ruleId ? updated : c) }
            : b
        ));
    }, [blocks, onChange]);

    const deleteCondition = useCallback((blockId: string, ruleId: string) => {
        onChange(blocks.map(b => b.id === blockId
            ? { ...b, conditions: b.conditions.filter(c => c.id !== ruleId) }
            : b
        ));
    }, [blocks, onChange]);

    const sorted = [...blocks].sort((a, b) => a.order - b.order);

    return (
        <div className="space-y-1.5">
            <div className="flex items-center justify-between mb-3">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Receipt Blocks
                </div>
                <span className="text-[10px] text-zinc-600">
                    Drag to reorder • Click to expand
                </span>
            </div>

            {sorted.map((block, index) => {
                const isExpanded = expandedBlock === block.id;
                const isDragging = draggedId === block.id;
                const isDragOver = dragOverId === block.id;

                return (
                    <div
                        key={block.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, block.id, index)}
                        onDragOver={(e) => handleDragOver(e, block.id)}
                        onDrop={(e) => handleDrop(e, index)}
                        onDragEnd={handleDragEnd}
                        className={cn(
                            'rounded-lg border transition-all',
                            isDragging && 'opacity-30 scale-95',
                            isDragOver && 'border-blue-500/50 bg-blue-500/5',
                            block.enabled
                                ? 'bg-zinc-900/50 border-white/5 hover:border-white/10'
                                : 'bg-zinc-950/30 border-white/3 opacity-50'
                        )}
                    >
                        {/* Block Row */}
                        <div className="flex items-center gap-2 px-3 py-2.5 cursor-grab active:cursor-grabbing">
                            <GripVertical className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />

                            <span className="text-base flex-shrink-0">{block.icon}</span>

                            <span className={cn(
                                'text-sm font-medium flex-1',
                                block.enabled ? 'text-white' : 'text-zinc-500 line-through'
                            )}>
                                {block.label}
                            </span>

                            {/* Condition badge */}
                            {block.conditions.length > 0 && (
                                <Badge className="text-[9px] px-1 py-0 bg-amber-500/10 text-amber-400 border-amber-500/20">
                                    <Zap className="w-2.5 h-2.5 mr-0.5" /> {block.conditions.length}
                                </Badge>
                            )}

                            {/* Toggle */}
                            <Switch checked={block.enabled} onCheckedChange={() => toggleBlock(block.id)} />

                            {/* Expand */}
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground hover:text-white"
                                onClick={(e) => { e.stopPropagation(); setExpandedBlock(isExpanded ? null : block.id); }}>
                                {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                            </Button>
                        </div>

                        {/* Expanded Settings */}
                        {isExpanded && (
                            <div className="px-3 pb-3 border-t border-white/5 mt-0 pt-3 space-y-3">
                                {/* Block-specific settings */}
                                <div className="flex items-center gap-2 text-xs text-zinc-500">
                                    <Settings2 className="w-3 h-3" />
                                    <span>Block settings for <strong className="text-zinc-300">{block.label}</strong></span>
                                </div>

                                {/* Conditional Rules */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                                            <Zap className="w-3 h-3 text-amber-400" /> Conditional Rules
                                        </span>
                                        <Button variant="ghost" size="sm" className="h-6 text-[10px] text-amber-400 hover:text-amber-300"
                                            onClick={() => addCondition(block.id)}>
                                            <Plus className="w-3 h-3 mr-1" /> Add Rule
                                        </Button>
                                    </div>

                                    {block.conditions.length === 0 ? (
                                        <p className="text-[11px] text-muted-foreground italic">
                                            No conditions — block always shows. Add a rule to make it dynamic.
                                        </p>
                                    ) : (
                                        block.conditions.map(rule => (
                                            <ConditionalRuleRow
                                                key={rule.id}
                                                rule={rule}
                                                onChange={(updated) => updateCondition(block.id, rule.id, updated)}
                                                onDelete={() => deleteCondition(block.id, rule.id)}
                                            />
                                        ))
                                    )}
                                </div>

                                {/* Visibility shortcuts */}
                                <div className="flex gap-2 text-[10px]">
                                    <Button variant="outline" size="sm" className="h-6 text-[10px] border-white/5 text-zinc-500"
                                        onClick={() => {
                                            addCondition(block.id);
                                            const lastRule = blocks.find(b => b.id === block.id)?.conditions.slice(-1)[0];
                                            if (lastRule) updateCondition(block.id, lastRule.id, { ...lastRule, field: 'order_type', operator: 'equals', value: 'takeaway', action: 'hide' });
                                        }}>
                                        Hide on Takeaway
                                    </Button>
                                    <Button variant="outline" size="sm" className="h-6 text-[10px] border-white/5 text-zinc-500"
                                        onClick={() => {
                                            addCondition(block.id);
                                        }}>
                                        Show only Dine-in
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

export default BlockEditor;
