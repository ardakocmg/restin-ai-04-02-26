import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card,CardContent,CardHeader,CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select,SelectContent,SelectItem,SelectTrigger,SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs,TabsContent,TabsList,TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useVenue } from '@/context/VenueContext';
import PageContainer from '@/layouts/PageContainer';
import api from '@/lib/api';
import { logger } from '@/lib/logger';
import {
ArrowLeft,
Building2,
ChefHat,
ChevronDown,
Clock,
DollarSign,
GripVertical,
ImageIcon,
Info,
Plus,
RefreshCw,
Save,
Scale,
Search,
ShieldAlert,
Trash2,
Upload,
UtensilsCrossed,
X,
type LucideIcon
} from 'lucide-react';
import { useCallback,useEffect,useRef,useState } from 'react';
import { useNavigate,useParams } from 'react-router-dom';
import { toast } from 'sonner';
import LoadingSpinner from '@/components/shared/LoadingSpinner';

// ── Types ──
interface EditIngredient {
    id: string;
    type: 'ingredient' | 'sub_recipe';
    name: string;
    net_qty: number;
    unit: string;
    waste_pct: number;
    remarks: string;
}

interface RecipeFormData {
    recipe_name: string;
    description: string;
    category: string;
    subcategory: string;
    cuisine: string;
    recipe_type: string;
    stage: string;
    seasons: string[];
    product_class: string;
    product_type: string;
    difficulty: number;
    servings: number;
    portion_weight_g: number;
    portion_volume_ml: number;
    yield_pct: number;
    manual_weight: boolean;
    shelf_life_days: number;
    storage_conditions: string;
    kitchen_utensils: string;
    reference_nr: string;
    url: string;
    is_perishable: boolean;
    allergens: Record<string, 'contains' | 'may_contain' | 'free'>;
    dietary: Record<string, boolean>;
    prep_time_min: number;
    cook_time_min: number;
    plate_time_min: number;
    sell_price: number;
    tax_pct: number;
    target_margin: number;
    ingredients: EditIngredient[];
    composition: string;
    steps: string;
    remarks: string;
    outlets: { id: string; name: string; linked: boolean }[];
    images: string[];
    active: boolean;
}

// ── EU Allergens ──
const EU_ALLERGENS = [
    'Celery', 'Cereals (Gluten)', 'Crustaceans', 'Eggs', 'Fish', 'Lupin',
    'Milk', 'Molluscs', 'Mustard', 'Nuts', 'Peanuts', 'Sesame', 'Soya', 'Sulphites'
];

const CATEGORIES = ['Food', 'Beverage', 'Dessert', 'Sauce', 'Dressing', 'Marinade', 'Garnish', 'Base', 'Other'];
const SUBCATEGORIES = ['Appetiser', 'Main Course', 'Side Dish', 'Soup', 'Salad', 'Pasta', 'Pizza', 'Sushi', 'Bread', 'Pastry', 'Other'];
const CUISINES = ['French', 'Italian', 'Mediterranean', 'Japanese', 'Chinese', 'Indian', 'American', 'Mexican', 'Thai', 'Contemporary', 'Fusion', 'Other'];
const TYPES = ['Main course', 'Starter', 'Side', 'Dessert', 'Beverage', 'Cocktail', 'Preparation', 'Sub Recipe', 'Mise en Place'];
const STAGES = ['Draft', 'In Development', 'Testing', 'Complete', 'Archived'];
const SEASONS_LIST = ['Winter', 'Spring', 'Summer', 'Autumn'];
const CLASSES = ['Finished Product', 'Semi-Finished', 'Preparation', 'Base Recipe'];
const UNITS = ['g', 'kg', 'ml', 'L', 'pcs', 'tbsp', 'tsp', 'cup', 'bunch', 'slice', 'portion'];
const DIFFICULTIES = [1, 2, 3, 4, 5];

// ── Blank form ──
function blankForm(): RecipeFormData {
    return {
        recipe_name: '', description: '', category: 'Food', subcategory: '',
        cuisine: '', recipe_type: 'Main course', stage: 'Draft', seasons: [],
        product_class: 'Finished Product', product_type: 'Finished Product',
        difficulty: 1, servings: 1, portion_weight_g: 0, portion_volume_ml: 0,
        yield_pct: 100, manual_weight: false, shelf_life_days: 0,
        storage_conditions: '', kitchen_utensils: '', reference_nr: '', url: '',
        is_perishable: false,
        allergens: Object.fromEntries(EU_ALLERGENS.map(a => [a, 'free' as const])),
        dietary: { halal: false, vegan: false, vegetarian: false, gluten_free: false, lactose_free: false },
        prep_time_min: 0, cook_time_min: 0, plate_time_min: 0,
        sell_price: 0, tax_pct: 18, target_margin: 70,
        ingredients: [], composition: '', steps: '', remarks: '',
        outlets: [], images: [], active: true,
    };
}

// ── Helper: Icon + Label field ──
function FormField({ icon: Icon, label, children }: { icon?: LucideIcon; label: string; children: React.ReactNode }) {
    return (
        <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground font-medium">
                {Icon && <Icon className="h-3.5 w-3.5 text-amber-500" />}
                {label}
            </Label>
            {children}
        </div>
    );
}

// ═══════════════════════════════════════════════
// ██  RECIPE EDITOR
// ═══════════════════════════════════════════════
export default function RecipeEditor() {
    const { recipeId } = useParams<{ recipeId: string }>();
    const navigate = useNavigate();
    const { activeVenue } = useVenue();
    const isNew = !recipeId || recipeId === 'new';

    const [form, setForm] = useState<RecipeFormData>(blankForm());
    const [loading, setLoading] = useState(!isNew);
    const [saving, setSaving] = useState(false);
    const [dirty, setDirty] = useState(false);
    const [activeTab, setActiveTab] = useState('ingredients');
    const [ingredientSearch, setIngredientSearch] = useState('');
    const [searchResults, setSearchResults] = useState<Array<{ id: string; name: string; type: 'ingredient' | 'sub_recipe' }>>([]);
    const [showSearch, setShowSearch] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);

    // ── Update helper ──
    const updateField = useCallback(<K extends keyof RecipeFormData>(key: K, value: RecipeFormData[K]) => {
        setForm(prev => ({ ...prev, [key]: value }));
        setDirty(true);
    }, []);

    // ── Load existing recipe ──
    useEffect(() => {
        if (isNew) return;
        (async () => {
            setLoading(true);
            try {
                const res = await api.get(`/inventory/recipes/${recipeId}?venue_id=${activeVenue?.id}`);
                const r = res.data;
                if (r) {
                    setForm({
                        ...blankForm(),
                        recipe_name: r.recipe_name || '',
                        description: r.description || '',
                        category: r.category || 'Food',
                        subcategory: r.subcategory || '',
                        cuisine: r.cuisine || '',
                        recipe_type: r.recipe_type || 'Main course',
                        stage: r.stage || 'Draft',
                        seasons: r.seasons || [],
                        product_class: r.product_class || 'Finished Product',
                        product_type: r.product_type || 'Finished Product',
                        difficulty: r.difficulty ?? 1,
                        servings: r.servings ?? 1,
                        portion_weight_g: r.portion_weight_g ?? 0,
                        portion_volume_ml: r.portion_volume_ml ?? 0,
                        yield_pct: r.yield_pct ?? 100,
                        shelf_life_days: r.shelf_life_days ?? 0,
                        storage_conditions: r.storage_conditions || '',
                        kitchen_utensils: r.kitchen_utensils || '',
                        reference_nr: r.reference_nr || '',
                        url: r.url || '',
                        is_perishable: r.is_perishable ?? false,
                        allergens: r.allergens ? Object.fromEntries(
                            EU_ALLERGENS.map(a => [a, r.allergens[a] === true ? 'contains' : 'free'])
                        ) : blankForm().allergens,
                        dietary: r.dietary ?? blankForm().dietary,
                        prep_time_min: r.prep_time_min ?? 0,
                        cook_time_min: r.cook_time_min ?? 0,
                        plate_time_min: r.plate_time_min ?? 0,
                        sell_price: r.sell_price ?? 0,
                        tax_pct: r.tax_pct ?? 18,
                        target_margin: 70,
                        ingredients: (r.ingredients || []).map((ing: /**/any, i: number) => ({
                            id: (ing.id as string) || `ing-${i}`,
                            type: (ing.type as string) || 'ingredient',
                            name: (ing.name as string) || '',
                            net_qty: (ing.net_qty as number) || 0,
                            unit: (ing.unit as string) || 'g',
                            waste_pct: (ing.waste_pct as number) || 0,
                            remarks: '',
                        })),
                        composition: r.composition || '',
                        steps: r.steps || '',
                        remarks: r.remarks || '',
                        outlets: r.outlets || [],
                        images: r.images || [],
                        active: r.active ?? true,
                        manual_weight: false,
                    });
                }
            } catch {
                logger.error('Failed to load recipe for editing', { recipeId });
                toast.error('Failed to load recipe');
            } finally {
                setLoading(false);
            }
        })();
    }, [recipeId, isNew, activeVenue?.id]);

    // ── Ingredient search ──
    useEffect(() => {
        if (!ingredientSearch.trim()) { setSearchResults([]); return; }
        const timer = setTimeout(async () => {
            try {
                const res = await api.get(`/inventory/items?venue_id=${activeVenue?.id}&search=${encodeURIComponent(ingredientSearch)}&limit=10`);
                const items = (res.data?.items || res.data || []).map((item: /**/any) => ({
                    id: (item.id as string) || (item._id as string) || '',
                    name: (item.item_name as string) || (item.name as string) || '',
                    type: 'ingredient' as const,
                }));
                setSearchResults(items);
            } catch {
                setSearchResults([]);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [ingredientSearch, activeVenue?.id]);

    // ── Close search on outside click ──
    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowSearch(false);
        }
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    // ── Add ingredient ──
    const addIngredient = useCallback((item: { id: string; name: string; type: 'ingredient' | 'sub_recipe' }) => {
        const newIng: EditIngredient = {
            id: `ing-${Date.now()}`,
            type: item.type,
            name: item.name,
            net_qty: 0,
            unit: 'g',
            waste_pct: 0,
            remarks: '',
        };
        updateField('ingredients', [...form.ingredients, newIng]);
        setIngredientSearch('');
        setShowSearch(false);
    }, [form.ingredients, updateField]);

    // ── Update ingredient row ──
    const updateIngredient = useCallback((index: number, field: keyof EditIngredient, value: string | number) => {
        const updated = [...form.ingredients];
        updated[index] = { ...updated[index], [field]: value };
        updateField('ingredients', updated);
    }, [form.ingredients, updateField]);

    // ── Remove ingredient ──
    const removeIngredient = useCallback((index: number) => {
        updateField('ingredients', form.ingredients.filter((_, i) => i !== index));
    }, [form.ingredients, updateField]);

    // ── Cycle allergen state ──
    const cycleAllergen = useCallback((allergen: string) => {
        const current = form.allergens[allergen] || 'free';
        const next = current === 'free' ? 'contains' : current === 'contains' ? 'may_contain' : 'free';
        updateField('allergens', { ...form.allergens, [allergen]: next });
    }, [form.allergens, updateField]);

    // ── Toggle season ──
    const toggleSeason = useCallback((season: string) => {
        const current = form.seasons;
        const newSeasons = current.includes(season) ? current.filter(s => s !== season) : [...current, season];
        updateField('seasons', newSeasons);
    }, [form.seasons, updateField]);

    // ── Computed ──
    const totalTime = form.prep_time_min + form.cook_time_min + form.plate_time_min;
    const sellPriceExclTax = form.sell_price / (1 + form.tax_pct / 100);

    // ── Save ──
    const handleSave = useCallback(async (closeAfter = false) => {
        if (!form.recipe_name.trim()) {
            toast.error('Recipe Name is required');
            return;
        }
        setSaving(true);
        try {
            const venueId = activeVenue?.id || 'v1';
            const payload = {
                recipe_name: form.recipe_name,
                description: form.description,
                category: form.category,
                subcategory: form.subcategory,
                cuisine: form.cuisine,
                recipe_type: form.recipe_type,
                stage: form.stage,
                seasons: form.seasons,
                product_class: form.product_class,
                product_type: form.product_type,
                difficulty: form.difficulty,
                servings: form.servings,
                portion_weight_g: form.portion_weight_g,
                portion_volume_ml: form.portion_volume_ml,
                yield_pct: form.yield_pct,
                shelf_life_days: form.shelf_life_days,
                storage_conditions: form.storage_conditions,
                kitchen_utensils: form.kitchen_utensils,
                reference_nr: form.reference_nr,
                url: form.url,
                is_perishable: form.is_perishable,
                allergens: Object.fromEntries(
                    Object.entries(form.allergens).map(([k, v]) => [k, v === 'contains'])
                ),
                dietary: form.dietary,
                prep_time_min: form.prep_time_min,
                cook_time_min: form.cook_time_min,
                plate_time_min: form.plate_time_min,
                sell_price: form.sell_price,
                tax_pct: form.tax_pct,
                ingredients: form.ingredients.map(ing => ({
                    type: ing.type,
                    name: ing.name,
                    net_qty: ing.net_qty,
                    unit: ing.unit,
                    waste_pct: ing.waste_pct,
                })),
                composition: form.composition,
                steps: form.steps,
                remarks: form.remarks,
                active: form.active,
                raw_import_data: {},
            };

            if (isNew) {
                const res = await api.post(`/venues/${venueId}/recipes/engineered`, payload);
                const newId = res.data?.id || res.data?._id;
                toast.success('Recipe created successfully');
                setDirty(false);
                if (closeAfter) navigate(`/manager/inventory-recipes/${newId || 'demo'}`);
                else if (newId) navigate(`/manager/inventory-recipes/${newId}/edit`, { replace: true });
            } else {
                await api.put(`/venues/${venueId}/recipes/engineered/${recipeId}`, payload);
                toast.success('Recipe saved');
                setDirty(false);
                if (closeAfter) navigate(`/manager/inventory-recipes/${recipeId}`);
            }
        } catch (e: unknown) {
            logger.error('Save failed', { error: e instanceof Error ? e.message : String(e) });
            toast.error('Failed to save recipe');
        } finally {
            setSaving(false);
        }
    }, [form, isNew, recipeId, activeVenue?.id, navigate]);

    // ── Navigation guard ──
    const handleBack = useCallback(() => {
        if (dirty && !window.confirm('You have unsaved changes. Leave without saving?')) return;
        navigate(-1);
    }, [dirty, navigate]);

    // ── Loading state ──
    if (loading) {
        return (
            <PageContainer title="" description="" className="" actions={<></>}><LoadingSpinner variant="page" />
                <div className="flex items-center justify-center h-64">
                    <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            </PageContainer>
        );
    }

    return (
        <PageContainer
            className=""
            title=""
            description=""
            actions={
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleSave(false)} disabled={saving}>
                        <Save className="h-4 w-4 mr-2" />{saving ? 'Saving...' : 'Quick Save'}
                    </Button>
                    <div className="relative group">
                        <Button size="sm" onClick={() => handleSave(true)} disabled={saving}>
                            <Save className="h-4 w-4 mr-2" />{"Save "}and Close
                            <ChevronDown className="h-3 w-3 ml-1" />
                        </Button>
                    </div>
                </div>
            }
        >
            {/* ── Header ── */}
            <div className="flex items-center gap-3 mb-4">
                <Button variant="ghost" size="icon" onClick={handleBack} aria-label="Action">
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <h1 className="text-lg font-semibold text-muted-foreground">
                    {isNew ? 'New Recipe' : 'Edit Recipe'}
                </h1>
                {dirty && <Badge variant="outline" className="text-amber-500 border-amber-500/30">Unsaved changes</Badge>}
            </div>

            {/* ── Recipe Name (always visible) ── */}
            <div className="mb-6">
                <Label className="text-xs uppercase tracking-wider text-amber-600 dark:text-amber-400 font-medium mb-1 block">Recipe Name</Label>
                <Input aria-label="Input field"
                    value={form.recipe_name}
                    onChange={e => updateField('recipe_name', e.target.value)}
                    placeholder="Enter recipe name..."
                    className="text-lg font-semibold h-12"
                />
            </div>

            {/* ── 8 Editor Tabs ── */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList className="flex flex-wrap gap-1 h-auto p-1">
                    <TabsTrigger value="ingredients" className="flex items-center gap-1.5 text-xs"><UtensilsCrossed className="h-3.5 w-3.5" />Ingredients & Prep</TabsTrigger>
                    <TabsTrigger value="info" className="flex items-center gap-1.5 text-xs"><Info className="h-3.5 w-3.5" />Info & Categories</TabsTrigger>
                    <TabsTrigger value="portioning" className="flex items-center gap-1.5 text-xs"><Scale className="h-3.5 w-3.5" />Portioning</TabsTrigger>
                    <TabsTrigger value="allergens" className="flex items-center gap-1.5 text-xs"><ShieldAlert className="h-3.5 w-3.5" />Allergens & Dietary</TabsTrigger>
                    <TabsTrigger value="production" className="flex items-center gap-1.5 text-xs"><Clock className="h-3.5 w-3.5" />Production</TabsTrigger>
                    <TabsTrigger value="financial" className="flex items-center gap-1.5 text-xs"><DollarSign className="h-3.5 w-3.5" />Financial</TabsTrigger>
                    <TabsTrigger value="outlets" className="flex items-center gap-1.5 text-xs"><Building2 className="h-3.5 w-3.5" />Outlets</TabsTrigger>
                    <TabsTrigger value="images" className="flex items-center gap-1.5 text-xs"><ImageIcon className="h-3.5 w-3.5" />Images</TabsTrigger>
                </TabsList>

                {/* ═══ TAB 1: Ingredients & Preparation ═══ */}
                <TabsContent value="ingredients" className="space-y-6">
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base">Ingredients & Sub Recipes</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {/* Ingredient table */}
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b text-xs text-muted-foreground uppercase tracking-wider">
                                            <th className="py-2 w-8"></th>
                                            <th className="py-2 text-left w-10">Type</th>
                                            <th className="py-2 text-left">[I]ngredient or [R]ecipe</th>
                                            <th className="py-2 text-left w-28">Net Qt.</th>
                                            <th className="py-2 text-left w-24">Unit</th>
                                            <th className="py-2 text-left w-24">Prep. Waste %</th>
                                            <th className="py-2 text-left w-40">Remarks</th>
                                            <th className="py-2 w-10"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {form.ingredients.map((ing, idx) => (
                                            <tr key={ing.id} className="border-b hover:bg-muted/30 transition-colors group">
                                                <td className="py-2"><GripVertical className="h-4 w-4 text-muted-foreground/40 cursor-grab" /></td>
                                                <td className="py-2">
                                                    <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${ing.type === 'sub_recipe' ? 'bg-blue-500/10 text-blue-500' : 'bg-red-500/10 text-red-500'}`}>
                                                        {ing.type === 'sub_recipe' ? 'R' : 'I'}
                                                    </span>
                                                </td>
                                                <td className="py-2 font-medium">{ing.name}</td>
                                                <td className="py-2">
                                                    <Input aria-label="Input field"
                                                        type="number"
                                                        value={ing.net_qty || ''}
                                                        onChange={e => updateIngredient(idx, 'net_qty', parseFloat(e.target.value) || 0)}
                                                        className="h-8 w-24"
                                                        placeholder="Quantity"
                                                    />
                                                </td>
                                                <td className="py-2">
                                                    <Select aria-label="Select option" value={ing.unit} onValueChange={v => updateIngredient(idx, 'unit', v)}>
                                                        <SelectTrigger aria-label="Select option" className="h-8 w-20"><SelectValue /></SelectTrigger>
                                                        <SelectContent>{UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                                                    </Select>
                                                </td>
                                                <td className="py-2">
                                                    <Input aria-label="Input field"
                                                        type="number"
                                                        value={ing.waste_pct || ''}
                                                        onChange={e => updateIngredient(idx, 'waste_pct', parseFloat(e.target.value) || 0)}
                                                        className="h-8 w-20"
                                                        placeholder="Waste"
                                                    />
                                                </td>
                                                <td className="py-2">
                                                    <Input aria-label="Input field"
                                                        value={ing.remarks}
                                                        onChange={e => updateIngredient(idx, 'remarks', e.target.value)}
                                                        className="h-8"
                                                        placeholder="Remarks"
                                                    />
                                                </td>
                                                <td className="py-2">
                                                    <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100" onClick={() => removeIngredient(idx)}>
                                                        <Trash2 className="h-4 w-4 text-red-500" />
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Add ingredient */}
                            <div ref={searchRef} className="relative mt-3">
                                <div
                                    className="flex items-center gap-2 p-3 rounded-lg bg-muted/30 border border-dashed border-muted-foreground/20 cursor-pointer hover:bg-muted/50 transition-colors"
                                    onClick={() => setShowSearch(true)}
                                >
                                    <Plus className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-sm text-muted-foreground">Add ingredient or sub-recipe</span>
                                </div>
                                {showSearch && (
                                    <div className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded-lg shadow-lg z-50 p-2">
                                        <div className="flex items-center gap-2 p-2 border-b mb-2">
                                            <Search className="h-4 w-4 text-muted-foreground" />
                                            <Input aria-label="Input field"
                                                value={ingredientSearch}
                                                onChange={e => setIngredientSearch(e.target.value)}
                                                placeholder="Search ingredients or recipes..."
                                                className="border-0 shadow-none h-8 focus-visible:ring-0"
                                                autoFocus
                                            />
                                        </div>
                                        <div className="max-h-48 overflow-y-auto">
                                            {searchResults.length > 0 ? searchResults.map(item => (
                                                <div
                                                    key={item.id}
                                                    className="flex items-center gap-3 p-2 rounded hover:bg-muted cursor-pointer"
                                                    onClick={() => addIngredient(item)}
                                                >
                                                    <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${item.type === 'sub_recipe' ? 'bg-blue-500/10 text-blue-500' : 'bg-amber-500/10 text-amber-500'}`}>
                                                        {item.type === 'sub_recipe' ? 'R' : 'I'}
                                                    </span>
                                                    <span className="text-sm">{item.name}</span>
                                                </div>
                                            )) : ingredientSearch.trim() ? (
                                                <p className="text-sm text-muted-foreground text-center py-4">{"No "}results found</p>
                                            ) : (
                                                <p className="text-sm text-muted-foreground text-center py-4">Type to search...</p>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Composition */}
                    <Card>
                        <CardHeader className="pb-3"><CardTitle className="text-base">Preparations — Composition</CardTitle></CardHeader>
                        <CardContent>
                            <Textarea aria-label="Input field"
                                value={form.composition}
                                onChange={e => updateField('composition', e.target.value)}
                                placeholder="Explain here how to compose this recipe..."
                                className="min-h-[150px]"
                            />
                        </CardContent>
                    </Card>

                    {/* Step by Step */}
                    <Card>
                        <CardHeader className="pb-3"><CardTitle className="text-base">Step by Step</CardTitle></CardHeader>
                        <CardContent>
                            <Textarea aria-label="Input field"
                                value={form.steps}
                                onChange={e => updateField('steps', e.target.value)}
                                placeholder="Add step-by-step instructions..."
                                className="min-h-[120px]"
                            />
                        </CardContent>
                    </Card>

                    {/* Remarks */}
                    <Card>
                        <CardHeader className="pb-3"><CardTitle className="text-base">Remarks</CardTitle></CardHeader>
                        <CardContent>
                            <Textarea aria-label="Input field"
                                value={form.remarks}
                                onChange={e => updateField('remarks', e.target.value)}
                                placeholder="Add some remarks or information on this recipe here..."
                                className="min-h-[100px]"
                            />
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ═══ TAB 2: Info & Categories ═══ */}
                <TabsContent value="info" className="space-y-6">
                    <Card>
                        <CardHeader className="pb-3"><CardTitle className="text-base">General Info</CardTitle></CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <FormField icon={ChefHat} label="Product Type">
                                    <Select aria-label="Select option" value={form.product_type} onValueChange={v => updateField('product_type', v)}>
                                        <SelectTrigger aria-label="Select option"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {CLASSES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </FormField>
                                <FormField label="Reference Nr.">
                                    <Input aria-label="Input field" value={form.reference_nr} onChange={e => updateField('reference_nr', e.target.value)} placeholder="RCP-00001" />
                                </FormField>
                                <FormField icon={Clock} label="Shelf Life">
                                    <div className="flex gap-2">
                                        <Input aria-label="Input field" type="number" value={form.shelf_life_days || ''} onChange={e => updateField('shelf_life_days', parseInt(e.target.value) || 0)} placeholder="days" className="w-20" />
                                        <span className="self-center text-xs text-muted-foreground">days</span>
                                    </div>
                                </FormField>
                                <FormField label="Difficulty">
                                    <Select aria-label="Select option" value={String(form.difficulty)} onValueChange={v => updateField('difficulty', parseInt(v))}>
                                        <SelectTrigger aria-label="Select option"><SelectValue /></SelectTrigger>
                                        <SelectContent>{DIFFICULTIES.map(d => <SelectItem key={d} value={String(d)}>{d}</SelectItem>)}</SelectContent>
                                    </Select>
                                </FormField>
                                <FormField label="Highly Perishable">
                                    <div className="flex items-center gap-2 pt-1">
                                        <Switch checked={form.is_perishable} onCheckedChange={v => updateField('is_perishable', v)} />
                                        <span className="text-sm">{form.is_perishable ? 'Yes' : 'No'}</span>
                                    </div>
                                </FormField>
                                <FormField icon={Building2} label="Storage Conditions">
                                    <Input aria-label="Input field" value={form.storage_conditions} onChange={e => updateField('storage_conditions', e.target.value)} placeholder="Refrigerated 0-4°C" />
                                </FormField>
                                <FormField label="Kitchen Utensils">
                                    <Input aria-label="Input field" value={form.kitchen_utensils} onChange={e => updateField('kitchen_utensils', e.target.value)} placeholder="Pan, Tongs, etc." />
                                </FormField>
                                <FormField label="URL">
                                    <Input aria-label="Input field" value={form.url} onChange={e => updateField('url', e.target.value)} placeholder="Product URL" />
                                </FormField>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-3"><CardTitle className="text-base">Categorisation</CardTitle></CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <FormField label="Category">
                                    <Select aria-label="Select option" value={form.category} onValueChange={v => updateField('category', v)}>
                                        <SelectTrigger aria-label="Select option"><SelectValue /></SelectTrigger>
                                        <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                                    </Select>
                                </FormField>
                                <FormField label="Subcategory">
                                    <Select aria-label="Select option" value={form.subcategory} onValueChange={v => updateField('subcategory', v)}>
                                        <SelectTrigger aria-label="Select option"><SelectValue placeholder="Select..." /></SelectTrigger>
                                        <SelectContent>{SUBCATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                                    </Select>
                                </FormField>
                                <FormField label="Cuisine">
                                    <Select aria-label="Select option" value={form.cuisine} onValueChange={v => updateField('cuisine', v)}>
                                        <SelectTrigger aria-label="Select option"><SelectValue placeholder="Select..." /></SelectTrigger>
                                        <SelectContent>{CUISINES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                                    </Select>
                                </FormField>
                                <FormField label="Type">
                                    <Select aria-label="Select option" value={form.recipe_type} onValueChange={v => updateField('recipe_type', v)}>
                                        <SelectTrigger aria-label="Select option"><SelectValue /></SelectTrigger>
                                        <SelectContent>{TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                                    </Select>
                                </FormField>
                                <FormField label="Stage">
                                    <Select aria-label="Select option" value={form.stage} onValueChange={v => updateField('stage', v)}>
                                        <SelectTrigger aria-label="Select option"><SelectValue /></SelectTrigger>
                                        <SelectContent>{STAGES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                                    </Select>
                                </FormField>
                                <FormField label="Seasons">
                                    <div className="flex flex-wrap gap-1.5 pt-1">
                                        {SEASONS_LIST.map(s => (
                                            <Badge
                                                key={s}
                                                variant={form.seasons.includes(s) ? 'default' : 'outline'}
                                                className="cursor-pointer text-xs"
                                                onClick={() => toggleSeason(s)}
                                            >
                                                {s}
                                            </Badge>
                                        ))}
                                    </div>
                                </FormField>
                                <FormField label="Class">
                                    <Select aria-label="Select option" value={form.product_class} onValueChange={v => updateField('product_class', v)}>
                                        <SelectTrigger aria-label="Select option"><SelectValue /></SelectTrigger>
                                        <SelectContent>{CLASSES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                                    </Select>
                                </FormField>
                                <FormField label="Description">
                                    <Input aria-label="Input field" value={form.description} onChange={e => updateField('description', e.target.value)} placeholder="Brief description..." />
                                </FormField>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ═══ TAB 3: Portioning ═══ */}
                <TabsContent value="portioning" className="space-y-6">
                    <Card>
                        <CardHeader className="pb-3"><CardTitle className="text-base">Portioning & Weight</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <FormField icon={UtensilsCrossed} label="Portions">
                                    <Input aria-label="Input field" type="number" value={form.servings || ''} onChange={e => updateField('servings', parseInt(e.target.value) || 1)} />
                                </FormField>
                                <FormField label="Yield %">
                                    <Input aria-label="Input field" type="number" value={form.yield_pct || ''} onChange={e => updateField('yield_pct', parseFloat(e.target.value) || 100)} />
                                </FormField>
                            </div>

                            <div className="border-t pt-4">
                                <Label className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-2 block">Net Measurement Info</Label>
                                <div className="flex items-center gap-2 mb-3">
                                    <Switch checked={form.manual_weight} onCheckedChange={v => updateField('manual_weight', v)} />
                                    <span className="text-sm text-muted-foreground">I want to enter weight and volume manually</span>
                                </div>
                                {form.manual_weight ? (
                                    <div className="grid grid-cols-2 gap-4">
                                        <FormField label="Weight (g)">
                                            <Input aria-label="Input field" type="number" value={form.portion_weight_g || ''} onChange={e => updateField('portion_weight_g', parseFloat(e.target.value) || 0)} />
                                        </FormField>
                                        <FormField label="Volume (ml)">
                                            <Input aria-label="Input field" type="number" value={form.portion_volume_ml || ''} onChange={e => updateField('portion_volume_ml', parseFloat(e.target.value) || 0)} />
                                        </FormField>
                                    </div>
                                ) : (
                                    <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg">
                                        The weight and volume will be calculated automatically based on the sum of the ingredients.
                                    </p>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-3"><CardTitle className="text-base">Remarks</CardTitle></CardHeader>
                        <CardContent>
                            <Textarea aria-label="Input field" value={form.remarks} onChange={e => updateField('remarks', e.target.value)} placeholder="Add remarks..." className="min-h-[100px]" />
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ═══ TAB 4: Allergens & Dietary ═══ */}
                <TabsContent value="allergens" className="space-y-6">
                    <Card>
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-base">Allergen Declaration</CardTitle>
                                <p className="text-xs text-muted-foreground">Click to cycle: Free → Contains → May Contain</p>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                                {EU_ALLERGENS.map(allergen => {
                                    const state = form.allergens[allergen] || 'free';
                                    return (
                                        <div
                                            key={allergen}
                                            onClick={() => cycleAllergen(allergen)}
                                            className={`p-3 rounded-lg border text-center cursor-pointer transition-all hover:scale-[1.02] ${state === 'contains' ? 'border-red-500/50 bg-red-500/10' :
                                                state === 'may_contain' ? 'border-amber-500/50 bg-amber-500/10' :
                                                    'border-border bg-muted/20'
                                                }`}
                                        >
                                            <ShieldAlert className={`h-5 w-5 mx-auto mb-1 ${state === 'contains' ? 'text-red-500' : state === 'may_contain' ? 'text-amber-500' : 'text-muted-foreground'}`} />
                                            <p className="text-xs font-medium">{allergen}</p>
                                            <Badge
                                                variant={state === 'contains' ? 'destructive' : state === 'may_contain' ? 'default' : 'secondary'}
                                                className="mt-1 text-[10px]"
                                            >
                                                {state === 'contains' ? 'Contains' : state === 'may_contain' ? 'May Contain' : 'Free'}
                                            </Badge>
                                        </div>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-3"><CardTitle className="text-base">Dietary Information</CardTitle></CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                {Object.entries(form.dietary).map(([key, val]) => (
                                    <div key={key} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                                        <span className="text-sm capitalize">{key.replace(/_/g, ' ')}</span>
                                        <Switch checked={val} onCheckedChange={v => updateField('dietary', { ...form.dietary, [key]: v })} />
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ═══ TAB 5: Production ═══ */}
                <TabsContent value="production" className="space-y-6">
                    <Card>
                        <CardHeader className="pb-3"><CardTitle className="text-base">Production Time</CardTitle></CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <FormField icon={Clock} label="Prep Time (min)">
                                    <Input aria-label="Input field" type="number" value={form.prep_time_min || ''} onChange={e => updateField('prep_time_min', parseInt(e.target.value) || 0)} />
                                </FormField>
                                <FormField label="Cook Time (min)">
                                    <Input aria-label="Input field" type="number" value={form.cook_time_min || ''} onChange={e => updateField('cook_time_min', parseInt(e.target.value) || 0)} />
                                </FormField>
                                <FormField label="Plate Time (min)">
                                    <Input aria-label="Input field" type="number" value={form.plate_time_min || ''} onChange={e => updateField('plate_time_min', parseInt(e.target.value) || 0)} />
                                </FormField>
                                <div className="p-4 rounded-lg bg-green-500/5 border border-green-500/20">
                                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Total</p>
                                    <p className="text-2xl font-bold text-green-500">{totalTime}<span className="text-sm font-normal text-muted-foreground ml-1">min</span></p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ═══ TAB 6: Financial ═══ */}
                <TabsContent value="financial" className="space-y-6">
                    <Card>
                        <CardHeader className="pb-3"><CardTitle className="text-base">Financial Details</CardTitle></CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <FormField icon={DollarSign} label="Sell Price (Incl. Tax)">
                                    <div className="relative">
                                        <Input aria-label="Input field" type="number" value={form.sell_price || ''} onChange={e => updateField('sell_price', parseFloat(e.target.value) || 0)} className="pr-8" />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">€</span>
                                    </div>
                                </FormField>
                                <FormField label="Tax Rate">
                                    <div className="relative">
                                        <Input aria-label="Input field" type="number" value={form.tax_pct || ''} onChange={e => updateField('tax_pct', parseFloat(e.target.value) || 0)} className="pr-8" />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                                    </div>
                                </FormField>
                                <FormField label="Target Profit Margin">
                                    <div className="relative">
                                        <Input aria-label="Input field" type="number" value={form.target_margin || ''} onChange={e => updateField('target_margin', parseFloat(e.target.value) || 0)} className="pr-8" />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                                    </div>
                                </FormField>
                                <div className="p-4 rounded-lg bg-muted/30">
                                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Sell Price (Excl. Tax)</p>
                                    <p className="text-xl font-bold">€{sellPriceExclTax.toFixed(2)}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ═══ TAB 7: Outlets ═══ */}
                <TabsContent value="outlets" className="space-y-6">
                    <Card>
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-base">Outlet Availability</CardTitle>
                                <div className="flex gap-2">
                                    <Button variant="outline" size="sm" onClick={() => updateField('outlets', form.outlets.map(o => ({ ...o, linked: true })))}>Link All</Button>
                                    <Button variant="outline" size="sm" onClick={() => updateField('outlets', form.outlets.map(o => ({ ...o, linked: false })))}>Unlink All</Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {form.outlets.length > 0 ? (
                                <div className="space-y-2">
                                    {form.outlets.map((outlet, idx) => (
                                        <div key={outlet.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                                            <div className="flex items-center gap-3">
                                                <Building2 className="h-5 w-5 text-muted-foreground" />
                                                <span className="text-sm font-medium">{outlet.name}</span>
                                            </div>
                                            <Switch
                                                checked={outlet.linked}
                                                onCheckedChange={v => {
                                                    const updated = [...form.outlets];
                                                    updated[idx] = { ...updated[idx], linked: v };
                                                    updateField('outlets', updated);
                                                }}
                                            />
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-muted-foreground">
                                    <Building2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                    <p className="text-sm">{"No "}outlets configured. Outlets will be populated from your branches.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ═══ TAB 8: Images ═══ */}
                <TabsContent value="images" className="space-y-6">
                    <Card>
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-base">Product Images</CardTitle>
                                <div className="flex gap-2">
                                    <Button variant="outline" size="sm"><ImageIcon className="h-4 w-4 mr-2" />Add from library</Button>
                                    <Button variant="outline" size="sm"><Upload className="h-4 w-4 mr-2" />Upload images</Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {/* Key image placeholder */}
                                <div className="space-y-2">
                                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Key Image</p>
                                    <div className="aspect-square rounded-lg border-2 border-dashed border-muted-foreground/20 flex items-center justify-center bg-muted/10 cursor-pointer hover:bg-muted/30 transition-colors">
                                        <div className="text-center">
                                            <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
                                            <p className="text-xs text-muted-foreground">Drop image here</p>
                                        </div>
                                    </div>
                                </div>
                                {/* Additional images */}
                                {form.images.map((img, idx) => (
                                    <div key={idx} className="relative group">
                                        <img src={img} alt={`Recipe image ${idx + 1}`} className="aspect-square object-cover rounded-lg" />
                                        <Button
                                            variant="destructive"
                                            size="icon"
                                            className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                            onClick={() => updateField('images', form.images.filter((_, i) => i !== idx))}
                                        >
                                            <X className="h-3 w-3" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-3"><CardTitle className="text-base">Remarks</CardTitle></CardHeader>
                        <CardContent>
                            <Textarea aria-label="Input field" value={form.remarks} onChange={e => updateField('remarks', e.target.value)} placeholder="Add remarks..." className="min-h-[100px]" />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </PageContainer>
    );
}
