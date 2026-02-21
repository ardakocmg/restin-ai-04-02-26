import { useVenue } from '@/context/VenueContext';
import api from '@/lib/api';
import {
Check,
ChevronDown,ChevronUp,
Edit3,
GripVertical,
Loader2,
Package,
Plus,
Tag,
Trash2,
Utensils,
X
} from 'lucide-react';
import { useCallback,useEffect,useState } from 'react';
import { toast } from 'sonner';
import PageContainer from '../../layouts/PageContainer';
import { cn } from '../../lib/utils';

interface ComboItem {
    item_id: string;
    name: string;
    price_delta_cents: number;
    is_default: boolean;
}

interface ComboGroup {
    id: string;
    name: string;
    min_select: number;
    max_select: number;
    items: ComboItem[];
}

interface Combo {
    id: string;
    venue_id: string;
    name: string;
    description: string;
    price_cents: number;
    is_active: boolean;
    sort_order: number;
    groups: ComboGroup[];
    tags: string[];
    created_at: string;
}

export default function ComboBuilder() {
    const { activeVenue } = useVenue();
    const [combos, setCombos] = useState<Combo[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCombo, setSelectedCombo] = useState<Combo | null>(null);
    const [editingName, setEditingName] = useState(false);
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
    const [saving, setSaving] = useState(false);

    const loadCombos = useCallback(async () => {
        if (!activeVenue?.id) return;
        setLoading(true);
        try {
            const res = await api.get('/combos', { params: { venue_id: activeVenue.id } });
            setCombos(res.data?.data || []);
        } catch {
            toast.error('Failed to load combos');
        } finally {
            setLoading(false);
        }
    }, [activeVenue?.id]);

    useEffect(() => { loadCombos(); }, [loadCombos]);

    const createCombo = async () => {
        if (!activeVenue?.id) return;
        try {
            const res = await api.post('/combos', {
                venue_id: activeVenue.id,
                name: `New Combo ${combos.length + 1}`,
                description: '',
                price_cents: 0,
                groups: [
                    {
                        id: `grp-${Date.now()}`,
                        name: 'Choose Item',
                        min_select: 1,
                        max_select: 1,
                        items: [],
                    }
                ],
            });
            const newCombo = res.data?.data;
            setCombos(prev => [...prev, newCombo]);
            setSelectedCombo(newCombo);
            toast.success('Combo created');
        } catch {
            toast.error('Failed to create combo');
        }
    };

    const saveCombo = async () => {
        if (!selectedCombo) return;
        setSaving(true);
        try {
            await api.put(`/combos/${selectedCombo.id}`, selectedCombo);
            setCombos(prev => prev.map(c => c.id === selectedCombo.id ? selectedCombo : c));
            toast.success('Combo saved');
        } catch {
            toast.error('Failed to save');
        } finally {
            setSaving(false);
        }
    };

    const deleteCombo = async (id: string) => {
        try {
            await api.delete(`/combos/${id}`);
            setCombos(prev => prev.filter(c => c.id !== id));
            if (selectedCombo?.id === id) setSelectedCombo(null);
            toast.success('Combo deleted');
        } catch {
            toast.error('Failed to delete');
        }
    };

    const updateComboField = (field: string, value: unknown) => {
        if (!selectedCombo) return;
        setSelectedCombo({ ...selectedCombo, [field]: value });
    };

    const addGroup = () => {
        if (!selectedCombo) return;
        const newGroup: ComboGroup = {
            id: `grp-${Date.now()}`,
            name: `Group ${selectedCombo.groups.length + 1}`,
            min_select: 1,
            max_select: 1,
            items: [],
        };
        updateComboField('groups', [...selectedCombo.groups, newGroup]);
    };

    const updateGroup = (groupId: string, field: string, value: unknown) => {
        if (!selectedCombo) return;
        const newGroups = selectedCombo.groups.map(g =>
            g.id === groupId ? { ...g, [field]: value } : g
        );
        updateComboField('groups', newGroups);
    };

    const removeGroup = (groupId: string) => {
        if (!selectedCombo) return;
        updateComboField('groups', selectedCombo.groups.filter(g => g.id !== groupId));
    };

    const addItemToGroup = (groupId: string) => {
        if (!selectedCombo) return;
        const newItem: ComboItem = {
            item_id: `item-${Date.now()}`,
            name: 'New Item',
            price_delta_cents: 0,
            is_default: false,
        };
        const newGroups = selectedCombo.groups.map(g => {
            if (g.id === groupId) {
                return { ...g, items: [...g.items, newItem] };
            }
            return g;
        });
        updateComboField('groups', newGroups);
    };

    const updateItemInGroup = (groupId: string, itemIndex: number, field: string, value: unknown) => {
        if (!selectedCombo) return;
        const newGroups = selectedCombo.groups.map(g => {
            if (g.id === groupId) {
                const newItems = [...g.items];
                newItems[itemIndex] = { ...newItems[itemIndex], [field]: value };
                return { ...g, items: newItems };
            }
            return g;
        });
        updateComboField('groups', newGroups);
    };

    const removeItemFromGroup = (groupId: string, itemIndex: number) => {
        if (!selectedCombo) return;
        const newGroups = selectedCombo.groups.map(g => {
            if (g.id === groupId) {
                return { ...g, items: g.items.filter((_, i) => i !== itemIndex) };
            }
            return g;
        });
        updateComboField('groups', newGroups);
    };

    const toggleGroup = (groupId: string) => {
        setExpandedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
    };

    const seedCombos = async () => {
        if (!activeVenue?.id) return;
        try {
            await api.post('/combos/seed', null, { params: { venue_id: activeVenue.id } });
            toast.success('Demo combos seeded');
            loadCombos();
        } catch {
            toast.error('Failed to seed');
        }
    };

    if (loading) {
        return (
            <PageContainer title="Combo Builder" description="Loading..." actions={undefined}>
                <div className="flex items-center justify-center min-h-[40vh]">
                    <Loader2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400 animate-spin" />
                </div>
            </PageContainer>
        );
    }

    return (
        <PageContainer
            title="Combo & Item Groups"
            description="Build meal combos with required selections, defaults, and price adjustments."
            actions={
                <div className="flex gap-3">
                    {combos.length === 0 && (
                        <button
                            onClick={seedCombos}
                            className="flex items-center gap-2 px-4 py-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground font-bold rounded-xl border border-border transition-all text-sm"
                        >
                            <Package className="w-4 h-4" />
                            Seed Demo
                        </button>
                    )}
                    <button
                        onClick={createCombo}
                        className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-foreground font-bold rounded-xl transition-all"
                    >
                        <Plus className="w-4 h-4" />
                        New Combo
                    </button>
                </div>
            }
        >
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-[60vh]">
                {/* Combo List */}
                <div className="space-y-3">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                        All Combos ({combos.length})
                    </h3>
                    {combos.length === 0 ? (
                        <div className="p-8 bg-card/50 border border-border rounded-2xl text-center">
                            <Utensils className="w-10 h-10 text-foreground mx-auto mb-3" />
                            <p className="text-sm text-muted-foreground">{"No "}combos yet</p>
                            <p className="text-xs text-muted-foreground mt-1">Create one or seed demo data</p>
                        </div>
                    ) : (
                        combos.map(combo => (
                            <button
                                key={combo.id}
                                onClick={() => setSelectedCombo(combo)}
                                className={cn(
                                    "w-full p-4 rounded-xl border-2 text-left transition-all group",
                                    selectedCombo?.id === combo.id
                                        ? "bg-emerald-600/10 border-emerald-500/40"
                                        : "bg-card/50 border-border hover:border-white/15"
                                )}
                            >
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-bold text-foreground">{combo.name}</p>
                                        <p className="text-[10px] text-muted-foreground mt-1">
                                            {combo.groups.length} group{combo.groups.length !== 1 ? 's' : ''} · €{(combo.price_cents / 100).toFixed(2)}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={cn(
                                            "px-2 py-0.5 rounded-full text-[9px] font-bold uppercase",
                                            combo.is_active
                                                ? "bg-emerald-600/20 text-emerald-400"
                                                : "bg-secondary text-muted-foreground"
                                        )}>
                                            {combo.is_active ? 'Active' : 'Draft'}
                                        </span>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); deleteCombo(combo.id); }}
                                            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-600/20 rounded-lg transition-all"
                                            title="Delete combo"
                                        >
                                            <Trash2 className="w-3.5 h-3.5 text-red-400" />
                                        </button>
                                    </div>
                                </div>
                            </button>
                        ))
                    )}
                </div>

                {/* Combo Editor */}
                <div className="lg:col-span-2">
                    {!selectedCombo ? (
                        <div className="flex items-center justify-center min-h-[40vh] bg-card/30 border border-dashed border-border rounded-2xl">
                            <div className="text-center">
                                <Package className="w-12 h-12 text-foreground mx-auto mb-3" />
                                <p className="text-sm text-muted-foreground">Select a combo to edit</p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Header */}
                            <div className="flex items-center justify-between p-5 bg-card/50 border border-border rounded-2xl">
                                <div className="flex-1">
                                    {editingName ? (
                                        <div className="flex items-center gap-2">
                                            <input
                                                autoFocus
                                                value={selectedCombo.name}
                                                onChange={(e) => updateComboField('name', e.target.value)}
                                                className="bg-background border border-border rounded-lg px-3 py-1.5 text-foreground text-lg font-bold w-full outline-none focus:border-emerald-500"
                                                onKeyDown={(e) => e.key === 'Enter' && setEditingName(false)}
                                                
                                            />
                                            <button onClick={() => setEditingName(false)} className="p-1" title="Confirm name"><Check className="w-4 h-4 text-emerald-400" /></button>
                                        </div>
                                    ) : (
                                        <button onClick={() => setEditingName(true)} className="flex items-center gap-2 group" title="Edit combo name">
                                            <h2 className="text-lg font-bold text-foreground">{selectedCombo.name}</h2>
                                            <Edit3 className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100" />
                                        </button>
                                    )}
                                    <input aria-label="Input"
                                        value={selectedCombo.description}
                                        onChange={(e) => updateComboField('description', e.target.value)}
                                        placeholder="Add a description..."
                                        className="bg-transparent border-none text-xs text-muted-foreground mt-1 w-full outline-none placeholder:text-zinc-700"
                                    />
                                </div>
                                <div className="flex items-center gap-3 ml-4">
                                    <div className="text-right">
                                        <label className="text-[9px] font-bold uppercase text-muted-foreground block">Base Price</label>
                                        <div className="relative">
                                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-bold">€</span>
                                            <input
                                                type="number"
                                                value={(selectedCombo.price_cents / 100).toFixed(2)}
                                                onChange={(e) => updateComboField('price_cents', Math.round(parseFloat(e.target.value) * 100) || 0)}
                                                step="0.50"
                                                className="w-24 h-9 bg-background border border-border rounded-lg text-foreground font-bold text-sm text-right pr-2 pl-6 outline-none focus:border-emerald-500"
                                                
                                            />
                                        </div>
                                    </div>
                                    <button
                                        onClick={saveCombo}
                                        disabled={saving}
                                        className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-foreground font-bold rounded-xl text-sm transition-all disabled:opacity-50"
                                    >
                                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
                                    </button>
                                </div>
                            </div>

                            {/* Groups */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                                        Selection Groups ({selectedCombo.groups.length})
                                    </h3>
                                    <button
                                        onClick={addGroup}
                                        className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-colors"
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                        Add Group
                                    </button>
                                </div>

                                {selectedCombo.groups.map((group, _gi) => (
                                    <div key={group.id} className="bg-card/50 border border-border rounded-2xl overflow-hidden">
                                        {/* Group Header */}
                                        <div
                                            className="flex items-center gap-3 p-4 cursor-pointer hover:bg-white/[0.02] transition-colors"
                                            onClick={() => toggleGroup(group.id)}
                                        >
                                            <GripVertical className="w-4 h-4 text-zinc-700" />
                                            <div className="flex-1">
                                                <input
                                                    value={group.name}
                                                    onChange={(e) => updateGroup(group.id, 'name', e.target.value)}
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="bg-transparent border-none text-sm font-bold text-foreground outline-none w-full"
                                                    
                                                />
                                                <p className="text-[10px] text-muted-foreground mt-0.5">
                                                    Select {group.min_select}-{group.max_select} · {group.items.length} items
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                                <label className="text-[9px] text-muted-foreground font-bold">Min</label>
                                                <input
                                                    type="number"
                                                    value={group.min_select}
                                                    onChange={(e) => updateGroup(group.id, 'min_select', parseInt(e.target.value) || 0)}
                                                    className="w-12 h-7 bg-background border border-border rounded-lg text-foreground text-xs text-center outline-none"
                                                    min={0}
                                                    
                                                />
                                                <label className="text-[9px] text-muted-foreground font-bold">Max</label>
                                                <input
                                                    type="number"
                                                    value={group.max_select}
                                                    onChange={(e) => updateGroup(group.id, 'max_select', parseInt(e.target.value) || 1)}
                                                    className="w-12 h-7 bg-background border border-border rounded-lg text-foreground text-xs text-center outline-none"
                                                    min={1}
                                                    
                                                />
                                                <button
                                                    onClick={() => removeGroup(group.id)}
                                                    className="p-1 hover:bg-red-600/20 rounded-lg"
                                                    title="Remove group"
                                                >
                                                    <X className="w-3.5 h-3.5 text-red-400" />
                                                </button>
                                            </div>
                                            {expandedGroups[group.id] ? (
                                                <ChevronUp className="w-4 h-4 text-muted-foreground" />
                                            ) : (
                                                <ChevronDown className="w-4 h-4 text-muted-foreground" />
                                            )}
                                        </div>

                                        {/* Group Items */}
                                        {expandedGroups[group.id] !== false && (
                                            <div className="border-t border-border p-4 space-y-2">
                                                {group.items.map((item, ii) => (
                                                    <div key={ii} className="flex items-center gap-3 p-3 bg-background/50 rounded-xl">
                                                        <button
                                                            onClick={() => updateItemInGroup(group.id, ii, 'is_default', !item.is_default)}
                                                            className={cn(
                                                                "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors",
                                                                item.is_default
                                                                    ? "border-emerald-500 bg-emerald-600"
                                                                    : "border-white/20"
                                                            )}
                                                        >
                                                            {item.is_default && <Check className="w-3 h-3 text-foreground" />}
                                                        </button>
                                                        <input aria-label="Input"
                                                            value={item.name}
                                                            onChange={(e) => updateItemInGroup(group.id, ii, 'name', e.target.value)}
                                                            className="flex-1 bg-transparent border-none text-sm text-foreground outline-none"
                                                            placeholder="Item name"
                                                        />
                                                        <div className="flex items-center gap-1">
                                                            <span className="text-[10px] text-muted-foreground">+€</span>
                                                            <input
                                                                type="number"
                                                                value={(item.price_delta_cents / 100).toFixed(2)}
                                                                onChange={(e) => updateItemInGroup(group.id, ii, 'price_delta_cents', Math.round(parseFloat(e.target.value) * 100) || 0)}
                                                                step="0.50"
                                                                className="w-16 h-7 bg-card border border-border rounded-lg text-foreground text-xs text-right pr-1 outline-none"
                                                                
                                                            />
                                                        </div>
                                                        <button
                                                            onClick={() => removeItemFromGroup(group.id, ii)}
                                                            className="p-1 hover:bg-red-600/20 rounded-lg"
                                                            title="Remove item"
                                                        >
                                                            <Trash2 className="w-3 h-3 text-red-400" />
                                                        </button>
                                                    </div>
                                                ))}
                                                <button
                                                    onClick={() => addItemToGroup(group.id)}
                                                    className="w-full p-2 border-2 border-dashed border-border rounded-xl text-xs font-bold text-muted-foreground hover:text-emerald-400 hover:border-emerald-500/30 transition-all"
                                                >
                                                    + Add Item
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* Tags */}
                            <div className="p-4 bg-card/50 border border-border rounded-2xl">
                                <div className="flex items-center gap-2 mb-3">
                                    <Tag className="w-3.5 h-3.5 text-muted-foreground" />
                                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Tags</h4>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {(selectedCombo.tags || []).map((tag, i) => (
                                        <span key={i} className="px-3 py-1 bg-secondary rounded-lg text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                                            {tag}
                                            <button onClick={() => updateComboField('tags', selectedCombo.tags.filter((_, ti) => ti !== i))} title="Remove tag">
                                                <X className="w-3 h-3 text-muted-foreground hover:text-red-400" />
                                            </button>
                                        </span>
                                    ))}
                                    <button
                                        onClick={() => {
                                            const tag = prompt('Enter tag name');
                                            if (tag) updateComboField('tags', [...(selectedCombo.tags || []), tag]);
                                        }}
                                        className="px-3 py-1 border border-dashed border-border rounded-lg text-xs text-muted-foreground hover:text-emerald-400 hover:border-emerald-500/30 transition-all"
                                    >
                                        + Add Tag
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </PageContainer>
    );
}
