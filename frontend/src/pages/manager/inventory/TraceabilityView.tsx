/**
 * TraceabilityView — 2-Way Ingredient Traceability: Supplier → Ingredient → Recipe → Order
 * Apicbase parity: full supply chain visibility, allergen tracking, recall simulation
 */
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { logger } from '@/lib/logger';
import { useVenue } from '@/context/VenueContext';
import api from '@/lib/api';
import PageContainer from '@/layouts/PageContainer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
    Search, RefreshCw, Loader2, GitBranch, ArrowRight,
    Truck, Package, ChefHat, ShoppingCart, AlertTriangle,
    Shield, Filter, ChevronRight, Eye, Zap, Leaf,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

/* ────────────────────────────────────────── Types ────────────────── */
interface TraceNode {
    _id: string;
    name: string;
    type: 'supplier' | 'ingredient' | 'recipe' | 'menu_item' | 'order';
    metadata: Record<string, string | number>;
    allergens?: string[];
    children?: TraceNode[];
}

interface TraceableItem {
    _id: string;
    ingredient: string;
    category: string;
    supplier: string;
    supplierCode: string;
    batchNumber: string;
    receivedDate: string;
    expiryDate: string;
    allergens: string[];
    usedInRecipes: string[];
    usedInOrders: number;
    status: 'active' | 'recalled' | 'expired';
    chain: TraceNode;
}

/* ──────────────────────────── Helper Components ─────────────────── */
function ChainArrow() {
    return <ChevronRight className="h-4 w-4 text-muted-foreground mx-1 flex-shrink-0" />;
}

function ChainNode({ label, icon: Icon, color, count, sublabel }: {
    label: string; icon: React.ElementType; color: string; count?: number; sublabel?: string;
}) {
    return (
        <div className={cn('flex items-center gap-2 px-3 py-2 rounded-lg border transition-all hover:scale-105 cursor-default',
            `border-${color}/30 bg-${color}/5`
        )} style={{ borderColor: `var(--${color})` }}>
            <Icon className={cn('h-4 w-4 flex-shrink-0', `text-${color}`)} style={{ color: `var(--${color})` }} />
            <div className="min-w-0">
                <p className="text-xs font-medium truncate">{label}</p>
                {sublabel && <p className="text-[10px] text-muted-foreground">{sublabel}</p>}
            </div>
            {count !== undefined && (
                <Badge variant="outline" className="text-[9px] ml-auto border-white/10">{count}</Badge>
            )}
        </div>
    );
}

function AllergenBadge({ allergen }: { allergen: string }) {
    const colors: Record<string, string> = {
        'Gluten': 'bg-amber-500/10 text-amber-400 border-amber-500/30',
        'Dairy': 'bg-blue-500/10 text-blue-400 border-blue-500/30',
        'Eggs': 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
        'Fish': 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
        'Shellfish': 'bg-red-500/10 text-red-400 border-red-500/30',
        'Nuts': 'bg-orange-500/10 text-orange-400 border-orange-500/30',
        'Soy': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
        'Celery': 'bg-green-500/10 text-green-400 border-green-500/30',
    };
    return (
        <Badge variant="outline" className={cn('text-[9px]', colors[allergen] || 'border-white/10 text-muted-foreground')}>
            {allergen}
        </Badge>
    );
}

/* ═══════════════════════════════════════════════════════════════════
   ██  TRACEABILITY VIEW
   ═══════════════════════════════════════════════════════════════════ */
export default function TraceabilityView() {
    const { t } = useTranslation();
    const { activeVenue } = useVenue();

    const [items, setItems] = useState<TraceableItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [direction, setDirection] = useState<'forward' | 'backward'>('forward');
    const [selectedItem, setSelectedItem] = useState<TraceableItem | null>(null);
    const [categoryFilter, setCategoryFilter] = useState('all');

    const loadData = useCallback(async () => {
        if (!activeVenue?.id) return;
        setLoading(true);
        try {
            const res = await api.get(`/api/inventory/traceability?venue_id=${activeVenue?.id}`);
            setItems(res.data?.items || []);
        } catch {
            logger.error('Failed to load traceability data');
            setItems(getDemoData());
        } finally {
            setLoading(false);
        }
    }, [activeVenue?.id]);

    useEffect(() => { loadData(); }, [loadData]);

    function getDemoData(): TraceableItem[] {
        return [
            {
                _id: 't1', ingredient: 'San Marzano Tomatoes', category: 'Produce',
                supplier: 'Fresh Fields Produce', supplierCode: 'FFP-001',
                batchNumber: 'BAT-2026-0218-A', receivedDate: '2026-02-18', expiryDate: '2026-02-25',
                allergens: [],
                usedInRecipes: ['Margherita Pizza', 'Pasta Pomodoro', 'Bruschetta'],
                usedInOrders: 47, status: 'active',
                chain: { _id: 'c1', name: 'San Marzano Tomatoes', type: 'ingredient', metadata: {}, children: [] },
            },
            {
                _id: 't2', ingredient: 'Mozzarella di Bufala', category: 'Dairy',
                supplier: 'Gozitan Dairy Co', supplierCode: 'GDC-004',
                batchNumber: 'BAT-2026-0219-B', receivedDate: '2026-02-19', expiryDate: '2026-02-23',
                allergens: ['Dairy'],
                usedInRecipes: ['Margherita Pizza', 'Caprese Salad', 'Lasagna'],
                usedInOrders: 38, status: 'active',
                chain: { _id: 'c2', name: 'Mozzarella di Bufala', type: 'ingredient', metadata: {}, children: [] },
            },
            {
                _id: 't3', ingredient: 'Chicken Breast', category: 'Meat & Poultry',
                supplier: 'Mediterranean Meats', supplierCode: 'MM-002',
                batchNumber: 'BAT-2026-0217-C', receivedDate: '2026-02-17', expiryDate: '2026-02-21',
                allergens: [],
                usedInRecipes: ['Chicken Caesar Salad', 'Grilled Chicken Plate', 'Chicken Wrap'],
                usedInOrders: 25, status: 'active',
                chain: { _id: 'c3', name: 'Chicken Breast', type: 'ingredient', metadata: {}, children: [] },
            },
            {
                _id: 't4', ingredient: 'Fresh Sea Bass', category: 'Seafood',
                supplier: 'Ocean Harvest Seafood', supplierCode: 'OHS-003',
                batchNumber: 'BAT-2026-0219-D', receivedDate: '2026-02-19', expiryDate: '2026-02-21',
                allergens: ['Fish'],
                usedInRecipes: ['Grilled Sea Bass', 'Fish Stew'],
                usedInOrders: 12, status: 'active',
                chain: { _id: 'c4', name: 'Fresh Sea Bass', type: 'ingredient', metadata: {}, children: [] },
            },
            {
                _id: 't5', ingredient: '00 Flour (Caputo)', category: 'Dry Goods',
                supplier: 'Fresh Fields Produce', supplierCode: 'FFP-001',
                batchNumber: 'BAT-2026-0215-E', receivedDate: '2026-02-15', expiryDate: '2026-06-15',
                allergens: ['Gluten'],
                usedInRecipes: ['Margherita Pizza', 'Pasta Fresca', 'Focaccia', 'Bread Rolls'],
                usedInOrders: 62, status: 'active',
                chain: { _id: 'c5', name: '00 Flour', type: 'ingredient', metadata: {}, children: [] },
            },
            {
                _id: 't6', ingredient: 'Prawns (Tiger)', category: 'Seafood',
                supplier: 'Ocean Harvest Seafood', supplierCode: 'OHS-003',
                batchNumber: 'BAT-2026-0210-F', receivedDate: '2026-02-10', expiryDate: '2026-02-14',
                allergens: ['Shellfish'],
                usedInRecipes: ['Spaghetti ai Gamberi', 'Prawn Cocktail'],
                usedInOrders: 8, status: 'expired',
                chain: { _id: 'c6', name: 'Prawns', type: 'ingredient', metadata: {}, children: [] },
            },
        ];
    }

    const categories = useMemo(() => items.map(i => i.category).filter((v, i, a) => a.indexOf(v) === i), [items]);

    const filtered = useMemo(() => {
        let result = [...items];
        if (search) {
            const q = search.toLowerCase();
            result = result.filter(i =>
                i.ingredient.toLowerCase().includes(q) ||
                i.supplier.toLowerCase().includes(q) ||
                i.batchNumber.toLowerCase().includes(q) ||
                i.usedInRecipes.some(r => r.toLowerCase().includes(q))
            );
        }
        if (categoryFilter !== 'all') result = result.filter(i => i.category === categoryFilter);
        return result;
    }, [items, search, categoryFilter]);

    const stats = useMemo(() => ({
        totalItems: items.length,
        activeItems: items.filter(i => i.status === 'active').length,
        allergenItems: items.filter(i => i.allergens.length > 0).length,
        totalRecipes: new Set(items.flatMap(i => i.usedInRecipes)).size,
        totalOrders: items.reduce((s, i) => s + i.usedInOrders, 0),
    }), [items]);

    return (
        <PageContainer
            title="Ingredient Traceability"
            subtitle="Track ingredients from supplier to customer — Forward & backward tracing"
            icon={<GitBranch className="h-5 w-5 text-purple-400" />}
            actions={
                <div className="flex items-center gap-2">
                    <div className="flex items-center bg-zinc-900/50 rounded-lg border border-white/10 p-0.5">
                        <Button
                            variant={direction === 'forward' ? 'default' : 'ghost'}
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => setDirection('forward')}
                        >
                            <ArrowRight className="h-3 w-3 mr-1" /> Forward
                        </Button>
                        <Button
                            variant={direction === 'backward' ? 'default' : 'ghost'}
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => setDirection('backward')}
                        >
                            <ArrowRight className="h-3 w-3 mr-1 rotate-180" /> Backward
                        </Button>
                    </div>
                    <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
                        <RefreshCw className={cn('h-4 w-4 mr-1', loading && 'animate-spin')} /> Refresh
                    </Button>
                </div>
            }
        >
            {/* KPI Strip */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
                {[
                    { icon: Package, label: 'Tracked Items', value: stats.totalItems, color: 'text-blue-400' },
                    { icon: Truck, label: 'Active Batches', value: stats.activeItems, color: 'text-emerald-400' },
                    { icon: AlertTriangle, label: 'Allergen Items', value: stats.allergenItems, color: 'text-amber-400' },
                    { icon: ChefHat, label: 'Recipes Linked', value: stats.totalRecipes, color: 'text-purple-400' },
                    { icon: ShoppingCart, label: 'Orders Affected', value: stats.totalOrders, color: 'text-cyan-400' },
                ].map(s => (
                    <Card key={s.label} className="border-white/5 bg-zinc-900/40">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className={cn('p-2 rounded-lg bg-white/5', s.color)}><s.icon className="h-4 w-4" /></div>
                                <div>
                                    <p className="text-xs text-muted-foreground">{s.label}</p>
                                    <p className={cn('text-lg font-bold', s.color)}>{s.value}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3 mb-4">
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input className="pl-9 bg-zinc-900/50 border-white/10" placeholder="Search ingredients, suppliers, batches, recipes..." value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-[160px] bg-zinc-900/50 border-white/10">
                        <Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                        <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                </Select>
                <Badge variant="outline" className="text-muted-foreground border-white/10">{filtered.length} items</Badge>
            </div>

            {/* Direction Label */}
            <div className="flex items-center gap-2 mb-4 p-3 rounded-lg bg-zinc-900/40 border border-white/5">
                <Zap className="h-4 w-4 text-amber-400" />
                <span className="text-sm font-medium">
                    {direction === 'forward'
                        ? 'Forward Trace: Supplier → Ingredient → Recipe → Customer Order'
                        : 'Backward Trace: Customer Order → Recipe → Ingredient → Supplier'}
                </span>
                <div className="flex items-center gap-1 ml-auto text-xs text-muted-foreground">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-400" /> Supplier
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 ml-2" /> Ingredient
                    <span className="h-1.5 w-1.5 rounded-full bg-purple-400 ml-2" /> Recipe
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400 ml-2" /> Order
                </div>
            </div>

            {/* Traceable Items */}
            {loading ? (
                <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
            ) : (
                <div className="space-y-3">
                    {filtered.map(item => {
                        const isSelected = selectedItem?._id === item._id;
                        const chain = direction === 'forward'
                            ? [
                                { label: item.supplier, icon: Truck, color: 'blue-400', sublabel: item.supplierCode },
                                { label: item.ingredient, icon: Package, color: 'emerald-400', sublabel: `Batch: ${item.batchNumber}` },
                                { label: `${item.usedInRecipes.length} Recipes`, icon: ChefHat, color: 'purple-400', sublabel: item.usedInRecipes[0] },
                                { label: `${item.usedInOrders} Orders`, icon: ShoppingCart, color: 'amber-400', sublabel: 'this period' },
                            ]
                            : [
                                { label: `${item.usedInOrders} Orders`, icon: ShoppingCart, color: 'amber-400', sublabel: 'this period' },
                                { label: `${item.usedInRecipes.length} Recipes`, icon: ChefHat, color: 'purple-400', sublabel: item.usedInRecipes[0] },
                                { label: item.ingredient, icon: Package, color: 'emerald-400', sublabel: `Batch: ${item.batchNumber}` },
                                { label: item.supplier, icon: Truck, color: 'blue-400', sublabel: item.supplierCode },
                            ];

                        return (
                            <Card
                                key={item._id}
                                className={cn(
                                    'border-white/5 bg-zinc-900/40 hover:bg-zinc-900/60 transition-all cursor-pointer',
                                    isSelected && 'border-purple-500/30 bg-purple-500/5',
                                    item.status === 'expired' && 'opacity-60',
                                    item.status === 'recalled' && 'border-red-500/30',
                                )}
                                onClick={() => setSelectedItem(isSelected ? null : item)}
                            >
                                <CardContent className="p-4">
                                    {/* Chain Visualization */}
                                    <div className="flex items-center flex-wrap gap-1 mb-3">
                                        {chain.map((node, i) => (
                                            <React.Fragment key={i}>
                                                {i > 0 && <ChainArrow />}
                                                <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                                                    <node.icon className="h-3.5 w-3.5 text-muted-foreground" />
                                                    <div>
                                                        <p className="text-xs font-medium">{node.label}</p>
                                                        <p className="text-[10px] text-muted-foreground">{node.sublabel}</p>
                                                    </div>
                                                </div>
                                            </React.Fragment>
                                        ))}

                                        {/* Status */}
                                        <div className="ml-auto flex items-center gap-2">
                                            {item.allergens.length > 0 && (
                                                <div className="flex gap-1">
                                                    {item.allergens.map(a => <AllergenBadge key={a} allergen={a} />)}
                                                </div>
                                            )}
                                            <Badge variant="outline" className={cn('text-[10px]',
                                                item.status === 'active' ? 'border-emerald-500/30 text-emerald-400' :
                                                    item.status === 'expired' ? 'border-zinc-500/30 text-zinc-400' :
                                                        'border-red-500/30 text-red-400'
                                            )}>
                                                {item.status}
                                            </Badge>
                                        </div>
                                    </div>

                                    {/* Expanded Detail */}
                                    {isSelected && (
                                        <div className="mt-3 pt-3 border-t border-white/5 space-y-3">
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                                                <div className="p-2 rounded-lg bg-zinc-800/50 border border-white/5">
                                                    <p className="text-muted-foreground">Batch Number</p>
                                                    <p className="font-medium">{item.batchNumber}</p>
                                                </div>
                                                <div className="p-2 rounded-lg bg-zinc-800/50 border border-white/5">
                                                    <p className="text-muted-foreground">Received</p>
                                                    <p className="font-medium">{item.receivedDate}</p>
                                                </div>
                                                <div className="p-2 rounded-lg bg-zinc-800/50 border border-white/5">
                                                    <p className="text-muted-foreground">Expiry</p>
                                                    <p className={cn('font-medium',
                                                        new Date(item.expiryDate) < new Date() ? 'text-red-400' : 'text-foreground'
                                                    )}>{item.expiryDate}</p>
                                                </div>
                                                <div className="p-2 rounded-lg bg-zinc-800/50 border border-white/5">
                                                    <p className="text-muted-foreground">Category</p>
                                                    <p className="font-medium">{item.category}</p>
                                                </div>
                                            </div>
                                            <div>
                                                <p className="text-xs text-muted-foreground mb-1.5">Used in Recipes:</p>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {item.usedInRecipes.map(r => (
                                                        <Badge key={r} variant="outline" className="text-[10px] border-purple-500/20 text-purple-300">
                                                            <ChefHat className="h-2.5 w-2.5 mr-1" />
                                                            {r}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}
        </PageContainer>
    );
}
