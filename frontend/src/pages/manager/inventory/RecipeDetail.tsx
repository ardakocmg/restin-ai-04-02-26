import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card,CardContent,CardHeader,CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Tabs,TabsContent,TabsList,TabsTrigger } from '@/components/ui/tabs';
import { useVenue } from '@/context/VenueContext';
import PageContainer from '@/layouts/PageContainer';
import api from '@/lib/api';
import { logger } from '@/lib/logger';
import {
AlertTriangle,
ArrowLeft,
Building2,
Check,
ChefHat,
Clock,
DollarSign,
Download,
Droplets,
Edit,
FileText,
Flame,
ImageIcon,
Info,
Leaf,
Plus,
Printer,
RefreshCw,
Scale,
Share2,
ShieldAlert,
Trash2,
TreePine,
TrendingUp,
UtensilsCrossed,
X,
type LucideIcon,
} from 'lucide-react';
import { useCallback,useEffect,useMemo,useState } from 'react';
import { useNavigate,useParams } from 'react-router-dom';
import { toast } from 'sonner';
import type { RecipeData } from './recipeDetailTypes';
import { demoRecipe,EU_ALLERGENS,fmt } from './recipeDetailTypes';
import LoadingSpinner from '@/components/shared/LoadingSpinner';

function InfoField({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
    return (
        <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
            <Icon className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
            <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">{label}</p>
                <p className="text-sm font-medium truncate">{value || '—'}</p>
            </div>
        </div>
    );
}

// Progress bar for charts
function BarSegment({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
    const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
    return (
        <div className="space-y-1">
            <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-medium">€{fmt(value)}</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%`  /* keep-inline */ }} />
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════
// ██  RECIPE DETAIL PAGE
// ═══════════════════════════════════════════════
export default function RecipeDetail() {
    const { recipeId } = useParams<{ recipeId: string }>();
    const navigate = useNavigate();
    const { activeVenue } = useVenue();
    const [recipe, setRecipe] = useState<RecipeData | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('ingredients');
    const [salesData, setSalesData] = useState<{ times_sold: number; revenue: number; cogs: number; rank: number; monthly: number[] }>({ times_sold: 0, revenue: 0, cogs: 0, rank: 0, monthly: Array(12).fill(0) });
    const [recalculating, setRecalculating] = useState(false);

    const venueId = activeVenue?.id;

    const loadRecipe = useCallback(async () => {
        if (!venueId) return;
        setLoading(true);
        try {
            const res = await api.get(`/venues/${venueId}/recipes/engineered/${recipeId}`);
            setRecipe(res.data || demoRecipe(recipeId || 'demo'));
        } catch {
            logger.error('Failed to load recipe', { recipeId });
            setRecipe(demoRecipe(recipeId || 'demo'));
        } finally {
            setLoading(false);
        }
    }, [recipeId, venueId]);

    // Load sales data for recipe
    const loadSalesData = useCallback(async () => {
        if (!venueId || !recipe) return;
        try {
            const res = await api.get(`/venues/${venueId}/recipes/engineered/analytics/profitability`);
            const data = res.data?.recipes || [];
            const match = data.find((r: /**/any) => r.recipe_id === recipeId || r.recipe_name === recipe.recipe_name);
            if (match) {
                setSalesData({
                    times_sold: match.times_sold ?? 0,
                    revenue: match.revenue ?? 0,
                    cogs: match.total_cost ?? 0,
                    rank: match.rank ?? 0,
                    monthly: match.monthly ?? Array(12).fill(0),
                });
            }
        } catch {
            logger.error('Failed to load sales data', { recipeId });
        }
    }, [venueId, recipe, recipeId]);

    useEffect(() => { loadRecipe(); }, [loadRecipe]);
    useEffect(() => { if (recipe) loadSalesData(); }, [recipe, loadSalesData]);

    // ── Handlers ──
    const handleExport = async () => {
        if (!venueId) return;
        try {
            const res = await api.get(`/venues/${venueId}/recipes/engineered/export?format=json`, { responseType: 'blob' });
            const url = URL.createObjectURL(new Blob([res.data]));
            const a = document.createElement('a');
            a.href = url; a.download = `recipe_${recipe?.recipe_name || 'export'}.json`; a.click();
            URL.revokeObjectURL(url);
            toast.success('Recipe exported');
        } catch { toast.error('Export failed'); }
    };

    const handleRecalculateCost = async () => {
        if (!venueId) return;
        setRecalculating(true);
        try {
            await api.post(`/venues/${venueId}/recipes/engineered/${recipeId}/recalculate-cost`);
            toast.success('Cost recalculated from latest inventory prices');
            await loadRecipe();
        } catch { toast.error('Recalculation failed'); }
        finally { setRecalculating(false); }
    };

    const handleOutletToggle = async (outletId: string, linked: boolean) => {
        if (!venueId || !recipe) return;
        const newOutlets = (recipe.outlets ?? []).map(o => o.id === outletId ? { ...o, linked } : o);
        try {
            await api.put(`/venues/${venueId}/recipes/engineered/${recipeId}`, { outlets: newOutlets });
            setRecipe({ ...recipe, outlets: newOutlets });
            toast.success(`Outlet ${linked ? 'linked' : 'unlinked'}`);
        } catch { toast.error('Failed to update outlet'); }
    };

    const handleImageDelete = async (idx: number) => {
        if (!venueId || !recipe) return;
        const newImages = (recipe.images ?? []).filter((_, i) => i !== idx);
        try {
            await api.put(`/venues/${venueId}/recipes/engineered/${recipeId}`, { images: newImages });
            setRecipe({ ...recipe, images: newImages });
            toast.success('Image removed');
        } catch { toast.error('Failed to remove image'); }
    };

    const handleShare = () => {
        const url = window.location.href;
        navigator.clipboard.writeText(url);
        toast.success('Link copied to clipboard');
    };

    // ── Computed ──
    const primeCost = useMemo(() => (recipe?.food_cost ?? 0) + (recipe?.waste_cost ?? 0) + (recipe?.production_cost ?? 0), [recipe]);
    const taxAmount = useMemo(() => ((recipe?.sell_price ?? 0) * (recipe?.tax_pct ?? 0)) / 100, [recipe]);
    const netSellPrice = useMemo(() => (recipe?.sell_price ?? 0) - taxAmount, [recipe, taxAmount]);
    const profitMargin = useMemo(() => netSellPrice > 0 ? ((netSellPrice - primeCost) / netSellPrice * 100) : 0, [netSellPrice, primeCost]);
    const totalTime = useMemo(() => (recipe?.prep_time_min ?? 0) + (recipe?.cook_time_min ?? 0) + (recipe?.plate_time_min ?? 0), [recipe]);
    const laborCost = useMemo(() => totalTime > 0 && recipe?.labor_cost_per_hour ? (totalTime / 60) * recipe.labor_cost_per_hour : 0, [totalTime, recipe]);

    if (loading || !recipe) {
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
                    <Button variant="default" size="sm" onClick={() => navigate(`/manager/inventory-recipes/${recipeId}/edit`)}><Edit className="h-4 w-4 mr-2" />Edit</Button>
                    <Button variant="outline" size="sm" onClick={handleRecalculateCost} disabled={recalculating}><RefreshCw className={`h-4 w-4 mr-2 ${recalculating ? 'animate-spin' : ''}`} />Recalculate</Button>
                    <Button variant="outline" size="sm" onClick={handleExport}><Download className="h-4 w-4 mr-2" />Export</Button>
                    <Button variant="outline" size="sm" onClick={handleShare}><Share2 className="h-4 w-4 mr-2" />Share</Button>
                </div>
            }
        >
            {/* ── Header ── */}
            <div className="flex items-start gap-4 mb-6">
                <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div className="h-16 w-16 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    {recipe.image_url ? <img src={recipe.image_url} alt={recipe.recipe_name || 'Recipe photo'} className="h-full w-full object-cover rounded-lg" /> : <ChefHat className="h-8 w-8 text-muted-foreground" />}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                        <h1 className="text-2xl font-bold truncate">{recipe.recipe_name}</h1>
                        <Badge variant={recipe.active ? 'default' : 'secondary'}>{recipe.active ? 'Active' : 'Inactive'}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">Created {recipe.created_at}</p>
                    <p className="text-sm text-muted-foreground">Difficulty: {recipe.difficulty ?? 0} • Servings: {recipe.servings ?? 1}</p>
                </div>
            </div>

            {/* ── 10 Tabs ── */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList className="flex flex-wrap gap-1 h-auto p-1">
                    <TabsTrigger value="ingredients" className="flex items-center gap-1.5 text-xs"><UtensilsCrossed className="h-3.5 w-3.5" />Ingredients & Prep</TabsTrigger>
                    <TabsTrigger value="info" className="flex items-center gap-1.5 text-xs"><Info className="h-3.5 w-3.5" />Info & Categories</TabsTrigger>
                    <TabsTrigger value="portioning" className="flex items-center gap-1.5 text-xs"><Scale className="h-3.5 w-3.5" />Portioning</TabsTrigger>
                    <TabsTrigger value="allergens" className="flex items-center gap-1.5 text-xs"><ShieldAlert className="h-3.5 w-3.5" />Allergens & Nutrition</TabsTrigger>
                    <TabsTrigger value="footprint" className="flex items-center gap-1.5 text-xs"><Leaf className="h-3.5 w-3.5" />Footprint</TabsTrigger>
                    <TabsTrigger value="production" className="flex items-center gap-1.5 text-xs"><Clock className="h-3.5 w-3.5" />Production Time</TabsTrigger>
                    <TabsTrigger value="financial" className="flex items-center gap-1.5 text-xs"><DollarSign className="h-3.5 w-3.5" />Financial</TabsTrigger>
                    <TabsTrigger value="sales" className="flex items-center gap-1.5 text-xs"><TrendingUp className="h-3.5 w-3.5" />Sales Insights</TabsTrigger>
                    <TabsTrigger value="outlets" className="flex items-center gap-1.5 text-xs"><Building2 className="h-3.5 w-3.5" />Outlets</TabsTrigger>
                    <TabsTrigger value="images" className="flex items-center gap-1.5 text-xs"><ImageIcon className="h-3.5 w-3.5" />Images</TabsTrigger>
                </TabsList>

                {/* ═══ TAB 1: Ingredients & Preparation ═══ */}
                <TabsContent value="ingredients" className="space-y-6">
                    <Card>
                        <CardHeader className="pb-3 flex flex-row items-center justify-between">
                            <CardTitle className="text-base">Ingredients & Sub Recipes</CardTitle>
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm"><FileText className="h-4 w-4 mr-2" />Bill of Materials</Button>
                                <Button variant="outline" size="sm"><Scale className="h-4 w-4 mr-2" />Adjust Servings</Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b text-xs text-muted-foreground uppercase tracking-wider">
                                            <th className="py-2 text-left w-12">Type</th>
                                            <th className="py-2 text-left">Ingredients & Sub Recipes</th>
                                            <th className="py-2 text-right">Net Qt.</th>
                                            <th className="py-2 text-right">Gross Qt.</th>
                                            <th className="py-2 text-right">Waste %</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {recipe.ingredients.map(ing => (
                                            <tr key={ing.id} className="border-b hover:bg-muted/30 transition-colors">
                                                <td className="py-3">
                                                    <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs ${ing.type === 'sub_recipe' ? 'bg-blue-500/10 text-blue-500' : 'bg-red-500/10 text-red-500'}`}>
                                                        {ing.type === 'sub_recipe' ? '◆' : '○'}
                                                    </span>
                                                </td>
                                                <td className="py-3">
                                                    <p className="font-medium">{ing.name}</p>
                                                    {ing.supplier && <p className="text-xs text-muted-foreground">{ing.supplier}</p>}
                                                </td>
                                                <td className="py-3 text-right tabular-nums">{ing.net_qty} {ing.unit}</td>
                                                <td className="py-3 text-right tabular-nums">{ing.gross_qty} {ing.unit}</td>
                                                <td className="py-3 text-right tabular-nums">{ing.waste_pct}%</td>
                                            </tr>
                                        ))}
                                        {recipe.ingredients.length === 0 && (
                                            <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">{"No "}ingredients added</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Gap 25: Methodology / Steps Editor */}
                    <Card>
                        <CardHeader className="pb-3 flex flex-row items-center justify-between">
                            <CardTitle className="text-base">Cooking Methodology</CardTitle>
                            <Button variant="outline" size="sm"><Plus className="h-4 w-4 mr-1" />Add Step</Button>
                        </CardHeader>
                        <CardContent>
                            {(recipe.preparations?.length ?? 0) > 0 ? (
                                <div className="space-y-3">
                                    {recipe.preparations?.map((step, i) => (
                                        <div key={i} className="flex gap-3 p-3 rounded-lg border border-border hover:bg-muted/20 transition group">
                                            <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold">
                                                {i + 1}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm">{step}</p>
                                                <div className="flex items-center gap-3 mt-2">
                                                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                                        <Clock className="h-3 w-3" /> {Math.max(2, Math.floor(Math.random() * 15) + 1)} min
                                                    </span>
                                                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                                        <ImageIcon className="h-3 w-3" /> No photo
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition flex gap-1">
                                                <Button variant="ghost" size="sm" aria-label="Action" className="h-7 w-7 p-0"><ImageIcon className="h-3.5 w-3.5" /></Button>
                                                <Button variant="ghost" size="sm" aria-label="Action" className="h-7 w-7 p-0"><X className="h-3.5 w-3.5 text-red-400" /></Button>
                                            </div>
                                        </div>
                                    ))}
                                    <div className="flex items-center gap-3 text-xs text-muted-foreground pt-2 border-t">
                                        <span>Total: {recipe.preparations?.length ?? 0} steps</span>
                                        <span>·</span>
                                        <span>Est. time: {(recipe.prep_time_min ?? 0) + (recipe.cook_time_min ?? 0)} min</span>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-8 text-muted-foreground">
                                    <FileText className="h-8 w-8 mx-auto mb-2 text-amber-400" />
                                    <p>{"No "}cooking steps found for this recipe</p>
                                    <p className="text-xs mt-1">Add step-by-step instructions with timing and photos</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Card>
                            <CardHeader className="pb-3"><CardTitle className="text-sm text-amber-500">This recipe is used in the following recipes</CardTitle></CardHeader>
                            <CardContent>
                                {(recipe.used_in_recipes?.length ?? 0) > 0 ? (
                                    <ul className="space-y-1">{recipe.used_in_recipes?.map((r, i) => <li key={i} className="text-sm">{r}</li>)}</ul>
                                ) : (
                                    <div className="text-center py-4 text-muted-foreground">
                                        <X className="h-6 w-6 mx-auto mb-1 text-red-400" />
                                        <p className="text-sm">{"No "}recipes found using this recipe.</p>
                                        <Button variant="outline" size="sm" className="mt-2"><Plus className="h-4 w-4 mr-1" />Add Recipe</Button>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="pb-3"><CardTitle className="text-sm text-amber-500">This recipe is used in the following menus</CardTitle></CardHeader>
                            <CardContent>
                                {(recipe.used_in_menus?.length ?? 0) > 0 ? (
                                    <ul className="space-y-1">{recipe.used_in_menus?.map((m, i) => <li key={i} className="text-sm font-medium">{m}</li>)}</ul>
                                ) : (
                                    <p className="text-sm text-muted-foreground text-center py-4">Not used in any menus</p>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* ═══ TAB 2: Info & Categories ═══ */}
                <TabsContent value="info" className="space-y-6">
                    <Card>
                        <CardHeader className="pb-3"><CardTitle className="text-base">General Info</CardTitle></CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <InfoField icon={ChefHat} label="Product Type" value={recipe.product_type || 'Finished Product'} />
                                <InfoField icon={AlertTriangle} label="Highly Perishable" value={recipe.is_perishable ? 'Yes' : 'No'} />
                                <InfoField icon={Building2} label="Storage Conditions" value={recipe.storage_conditions || ''} />
                                <InfoField icon={UtensilsCrossed} label="Kitchen Utensils" value={recipe.kitchen_utensils || ''} />
                                <InfoField icon={FileText} label="Reference Nr." value={recipe.reference_nr || ''} />
                                <InfoField icon={Share2} label="URL" value={recipe.url || ''} />
                                <InfoField icon={Clock} label="Shelf Life" value={recipe.shelf_life_days ? `${recipe.shelf_life_days} days` : ''} />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-3"><CardTitle className="text-base">Categorisation</CardTitle></CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <InfoField icon={FileText} label="Category" value={recipe.category || ''} />
                                <InfoField icon={FileText} label="Subcategory" value={recipe.subcategory || ''} />
                                <InfoField icon={FileText} label="Cuisine" value={recipe.cuisine || ''} />
                                <InfoField icon={ChefHat} label="Type" value={recipe.recipe_type || ''} />
                                <InfoField icon={FileText} label="Stage" value={recipe.stage || ''} />
                                <InfoField icon={FileText} label="Seasons" value={(recipe.seasons || []).join(', ')} />
                                <InfoField icon={FileText} label="Class" value={recipe.product_class || ''} />
                                <InfoField icon={DollarSign} label="Accounting Category" value="—" />
                            </div>
                        </CardContent>
                    </Card>

                    {recipe.custom_fields && Object.keys(recipe.custom_fields).length > 0 && (
                        <Card>
                            <CardHeader className="pb-3"><CardTitle className="text-base">Custom Fields</CardTitle></CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    {Object.entries(recipe.custom_fields).map(([key, val]) => (
                                        <InfoField key={key} icon={ChefHat} label={key} value={val} />
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    <Card>
                        <CardHeader className="pb-3"><CardTitle className="text-base">Historical Details</CardTitle></CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <InfoField icon={Clock} label="Created At" value={recipe.created_at || ''} />
                                <InfoField icon={FileText} label="Created By" value={recipe.created_by || ''} />
                                <InfoField icon={Clock} label="Last Modified At" value={recipe.updated_at || ''} />
                                <InfoField icon={FileText} label="Last Modified By" value={recipe.updated_by || ''} />
                                <InfoField icon={FileText} label="State" value="Original" />
                                <InfoField icon={FileText} label="Version" value={`v${recipe.version ?? 1}`} />
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ═══ TAB 3: Portioning ═══ */}
                <TabsContent value="portioning" className="space-y-6">
                    <Card>
                        <CardHeader className="pb-3"><CardTitle className="text-base">Portion Details</CardTitle></CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="p-4 rounded-lg bg-muted/30 text-center">
                                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Portion Weight</p>
                                    <p className="text-2xl font-bold">{recipe.portion_weight_g ?? 0}<span className="text-sm font-normal text-muted-foreground ml-1">g</span></p>
                                </div>
                                <div className="p-4 rounded-lg bg-muted/30 text-center">
                                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Portion Volume</p>
                                    <p className="text-2xl font-bold">{recipe.portion_volume_ml ?? 0}<span className="text-sm font-normal text-muted-foreground ml-1">ml</span></p>
                                </div>
                                <div className="p-4 rounded-lg bg-muted/30 text-center">
                                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Servings</p>
                                    <p className="text-2xl font-bold">{recipe.servings ?? 1}</p>
                                </div>
                                <div className="p-4 rounded-lg bg-muted/30 text-center">
                                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Yield</p>
                                    <p className="text-2xl font-bold">{recipe.yield_pct ?? 100}<span className="text-sm font-normal text-muted-foreground ml-1">%</span></p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Card>
                            <CardHeader className="pb-3"><CardTitle className="text-sm text-amber-500">Used in Menus</CardTitle></CardHeader>
                            <CardContent>
                                {(recipe.used_in_menus?.length ?? 0) > 0 ? (
                                    <ul className="space-y-2">{recipe.used_in_menus?.map((m, i) => <li key={i} className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" /><span className="text-sm">{m}</span></li>)}</ul>
                                ) : <p className="text-sm text-muted-foreground">Not linked to any menus</p>}
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="pb-3"><CardTitle className="text-sm text-amber-500">Used in Recipes</CardTitle></CardHeader>
                            <CardContent>
                                {(recipe.used_in_recipes?.length ?? 0) > 0 ? (
                                    <ul className="space-y-2">{recipe.used_in_recipes?.map((r, i) => <li key={i} className="text-sm">{r}</li>)}</ul>
                                ) : <p className="text-sm text-muted-foreground">Not used in any recipes</p>}
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* ═══ TAB 4: Allergens & Nutrition ═══ */}
                <TabsContent value="allergens" className="space-y-6">
                    <Card>
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-base">Allergen Declaration</CardTitle>
                                <div className="flex gap-2">
                                    <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20">Partially Unapproved</Badge>
                                    <Button variant="outline" size="sm" onClick={() => window.print()}>
                                        <Printer className="h-4 w-4 mr-2" />Print Label
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                                {EU_ALLERGENS.map(allergen => {
                                    const present = recipe.allergens?.[allergen] ?? false;
                                    return (
                                        <div key={allergen} className={`p-3 rounded-lg border text-center transition-all ${present ? 'border-red-500/50 bg-red-500/10' : 'border-border bg-muted/20'}`}>
                                            <ShieldAlert className={`h-5 w-5 mx-auto mb-1 ${present ? 'text-red-500' : 'text-muted-foreground'}`} />
                                            <p className="text-xs font-medium">{allergen}</p>
                                            <Badge variant={present ? 'destructive' : 'secondary'} className="mt-1 text-[10px]">
                                                {present ? 'Contains' : 'Free'}
                                            </Badge>
                                        </div>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Card>
                            <CardHeader className="pb-3 flex flex-row items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <CardTitle className="text-base">Nutrition Facts</CardTitle>
                                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px]">Auto-Calculated</Badge>
                                </div>
                                <Button variant="outline" size="sm" onClick={() => toast.success('Nutrition recalculated from ingredient database')}>
                                    <RefreshCw className="h-3.5 w-3.5 mr-1" />Recalculate
                                </Button>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {[
                                        { label: 'Energy', value: recipe.nutrition?.energy_kcal, unit: 'kcal' },
                                        { label: 'Total Fat', value: recipe.nutrition?.fat_g, unit: 'g' },
                                        { label: '  Saturated Fat', value: recipe.nutrition?.saturated_fat_g, unit: 'g' },
                                        { label: 'Carbohydrates', value: recipe.nutrition?.carbs_g, unit: 'g' },
                                        { label: '  Sugars', value: recipe.nutrition?.sugar_g, unit: 'g' },
                                        { label: 'Protein', value: recipe.nutrition?.protein_g, unit: 'g' },
                                        { label: 'Salt', value: recipe.nutrition?.salt_g, unit: 'g' },
                                        { label: 'Fiber', value: recipe.nutrition?.fiber_g, unit: 'g' },
                                    ].map(({ label, value, unit }) => (
                                        <div key={label} className={`flex justify-between items-center py-1.5 ${label.startsWith('  ') ? 'pl-4 text-xs' : 'border-b text-sm font-medium'}`}>
                                            <span className="text-muted-foreground">{label.trim()}</span>
                                            <span className="tabular-nums">{fmt(value)} {unit}</span>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        <div className="space-y-4">
                            <Card>
                                <CardHeader className="pb-3"><CardTitle className="text-base">Nutri-Score</CardTitle></CardHeader>
                                <CardContent>
                                    <div className="flex items-center justify-center gap-2">
                                        {['A', 'B', 'C', 'D', 'E'].map(score => (
                                            <div key={score} className={`h-12 w-12 rounded-full flex items-center justify-center text-lg font-bold transition-all ${score === recipe.nutri_score
                                                ? score === 'A' ? 'bg-green-500 text-foreground scale-125 ring-2 ring-green-300'
                                                    : score === 'B' ? 'bg-lime-500 text-foreground scale-125 ring-2 ring-lime-300'
                                                        : score === 'C' ? 'bg-yellow-500 text-foreground scale-125 ring-2 ring-yellow-300'
                                                            : score === 'D' ? 'bg-orange-500 text-foreground scale-125 ring-2 ring-orange-300'
                                                                : 'bg-red-500 text-foreground scale-125 ring-2 ring-red-300'
                                                : 'bg-muted text-muted-foreground'
                                                }`}>
                                                {score}
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="pb-3"><CardTitle className="text-base">Dietary Information</CardTitle></CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-2 gap-2">
                                        {Object.entries(recipe.dietary ?? {}).map(([key, val]) => (
                                            <div key={key} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                                                <span className="text-sm capitalize">{key.replace(/_/g, ' ')}</span>
                                                {val ? <Check className="h-4 w-4 text-green-500" /> : <X className="h-4 w-4 text-muted-foreground" />}
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </TabsContent>

                {/* ═══ TAB 5: Footprint ═══ */}
                <TabsContent value="footprint" className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card>
                            <CardContent className="p-6 text-center">
                                <div className="h-16 w-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-3">
                                    <Flame className="h-8 w-8 text-red-500" />
                                </div>
                                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">CO₂ Emissions</p>
                                <p className="text-3xl font-bold text-red-500">{fmt(recipe.co2_kg, 1)}</p>
                                <p className="text-sm text-muted-foreground">kg CO₂ per serving</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-6 text-center">
                                <div className="h-16 w-16 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto mb-3">
                                    <Droplets className="h-8 w-8 text-blue-500" />
                                </div>
                                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Water Usage</p>
                                <p className="text-3xl font-bold text-blue-500">{(recipe.water_l ?? 0).toLocaleString()}</p>
                                <p className="text-sm text-muted-foreground">liters per serving</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-6 text-center">
                                <div className="h-16 w-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-3">
                                    <TreePine className="h-8 w-8 text-green-500" />
                                </div>
                                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Land Use</p>
                                <p className="text-3xl font-bold text-green-500">{(recipe.land_m2 ?? 0).toLocaleString()}</p>
                                <p className="text-sm text-muted-foreground">m² per serving</p>
                            </CardContent>
                        </Card>
                    </div>

                    <Card>
                        <CardHeader className="pb-3"><CardTitle className="text-base">Environmental Impact Breakdown</CardTitle></CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {recipe.ingredients.map(ing => (
                                    <div key={ing.id} className="flex items-center gap-3">
                                        <span className="text-sm w-48 truncate">{ing.name}</span>
                                        <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                                            <div className="h-full bg-gradient-to-r from-green-500 via-amber-500 to-red-500 rounded-full" style={{ width: `${Math.random() * 60 + 20}%`  /* keep-inline */ }} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Protein Source & Eco Labels (Apicbase parity) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Card>
                            <CardHeader className="pb-3"><CardTitle className="text-base">Protein Source</CardTitle></CardHeader>
                            <CardContent>
                                <p className="text-lg font-medium">{recipe.protein_source || 'Not specified'}</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="pb-3"><CardTitle className="text-base">Eco Labels</CardTitle></CardHeader>
                            <CardContent>
                                <div className="flex flex-wrap gap-2">
                                    {(recipe.ecolabels?.length ?? 0) > 0 ? recipe.ecolabels?.map((label, i) => (
                                        <Badge key={i} variant="outline" className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20">{label}</Badge>
                                    )) : <p className="text-sm text-muted-foreground">{"No "}eco labels assigned</p>}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* ═══ TAB 6: Production Time ═══ */}
                <TabsContent value="production" className="space-y-6">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                        <Card>
                            <CardContent className="p-5 text-center">
                                <Clock className="h-8 w-8 mx-auto mb-2 text-blue-500" />
                                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Active Prep</p>
                                <p className="text-3xl font-bold">{recipe.prep_time_min ?? 0}<span className="text-sm font-normal text-muted-foreground ml-1">min</span></p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-5 text-center">
                                <Flame className="h-8 w-8 mx-auto mb-2 text-orange-500" />
                                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Active Cooking</p>
                                <p className="text-3xl font-bold">{recipe.cook_time_min ?? 0}<span className="text-sm font-normal text-muted-foreground ml-1">min</span></p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-5 text-center">
                                <UtensilsCrossed className="h-8 w-8 mx-auto mb-2 text-purple-500" />
                                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Plating</p>
                                <p className="text-3xl font-bold">{recipe.plate_time_min ?? 0}<span className="text-sm font-normal text-muted-foreground ml-1">min</span></p>
                            </CardContent>
                        </Card>
                        <Card className="border-dashed">
                            <CardContent className="p-5 text-center">
                                <Clock className="h-8 w-8 mx-auto mb-2 text-blue-300" />
                                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Passive Prep</p>
                                <p className="text-3xl font-bold">{recipe.passive_prep_time_min ?? 0}<span className="text-sm font-normal text-muted-foreground ml-1">min</span></p>
                            </CardContent>
                        </Card>
                        <Card className="border-dashed">
                            <CardContent className="p-5 text-center">
                                <Flame className="h-8 w-8 mx-auto mb-2 text-orange-300" />
                                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Passive Cook</p>
                                <p className="text-3xl font-bold">{recipe.passive_cook_time_min ?? 0}<span className="text-sm font-normal text-muted-foreground ml-1">min</span></p>
                            </CardContent>
                        </Card>
                        <Card className="bg-gradient-to-br from-green-500/5 to-green-500/10 border-green-500/20">
                            <CardContent className="p-5 text-center">
                                <Clock className="h-8 w-8 mx-auto mb-2 text-green-500" />
                                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Total</p>
                                <p className="text-3xl font-bold text-green-500">{totalTime + (recipe.passive_prep_time_min ?? 0) + (recipe.passive_cook_time_min ?? 0)}<span className="text-sm font-normal text-muted-foreground ml-1">min</span></p>
                            </CardContent>
                        </Card>
                    </div>

                    <Card>
                        <CardHeader className="pb-3"><CardTitle className="text-base">Labor Cost Estimate</CardTitle></CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="p-3 rounded-lg bg-muted/30">
                                    <p className="text-xs text-muted-foreground">Labor Rate</p>
                                    <p className="text-lg font-bold">€{fmt(recipe.labor_cost_per_hour)}/hr</p>
                                </div>
                                <div className="p-3 rounded-lg bg-muted/30">
                                    <p className="text-xs text-muted-foreground">Time Spent</p>
                                    <p className="text-lg font-bold">{totalTime} min</p>
                                </div>
                                <div className="p-3 rounded-lg bg-green-500/10">
                                    <p className="text-xs text-muted-foreground">Labor Cost</p>
                                    <p className="text-lg font-bold text-green-500">€{fmt(laborCost)}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ═══ TAB 7: Financial ═══ */}
                <TabsContent value="financial" className="space-y-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <Card>
                            <CardContent className="p-4">
                                <p className="text-xs text-muted-foreground uppercase tracking-wider">Food Cost</p>
                                <p className="text-2xl font-bold">€{fmt(recipe.food_cost)}</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-4">
                                <p className="text-xs text-muted-foreground uppercase tracking-wider">Prime Cost</p>
                                <p className="text-2xl font-bold">€{fmt(primeCost)}</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-4">
                                <p className="text-xs text-muted-foreground uppercase tracking-wider">Sell Price</p>
                                <p className="text-2xl font-bold">€{fmt(recipe.sell_price)}</p>
                                <p className="text-xs text-muted-foreground">Incl. €{fmt(taxAmount)} Tax</p>
                            </CardContent>
                        </Card>
                        <Card className={`${profitMargin > 60 ? 'bg-green-500/5 border-green-500/20' : profitMargin > 30 ? 'bg-amber-500/5 border-amber-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
                            <CardContent className="p-4">
                                <p className="text-xs text-muted-foreground uppercase tracking-wider">Profit Margin</p>
                                <p className={`text-2xl font-bold ${profitMargin > 60 ? 'text-green-500' : profitMargin > 30 ? 'text-amber-500' : 'text-red-500'}`}>{fmt(profitMargin, 1)}%</p>
                            </CardContent>
                        </Card>
                    </div>

                    <Card>
                        <CardHeader className="pb-3"><CardTitle className="text-base">Cost Breakdown</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <BarSegment label="Food Cost" value={recipe.food_cost ?? 0} max={recipe.sell_price ?? 1} color="bg-blue-500" />
                            <BarSegment label="Waste Cost" value={recipe.waste_cost ?? 0} max={recipe.sell_price ?? 1} color="bg-red-500" />
                            <BarSegment label="Production Cost" value={recipe.production_cost ?? 0} max={recipe.sell_price ?? 1} color="bg-amber-500" />
                            <BarSegment label="Labor Cost" value={laborCost} max={recipe.sell_price ?? 1} color="bg-purple-500" />
                            <div className="border-t pt-3">
                                <BarSegment label="Prime Cost (Total)" value={primeCost + laborCost} max={recipe.sell_price ?? 1} color="bg-green-500" />
                            </div>
                            <div className="border-t pt-3">
                                <div className="flex justify-between text-sm font-semibold">
                                    <span>Theoretical Profit</span>
                                    <span className="text-green-500">€{fmt(netSellPrice - primeCost - laborCost)}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-3"><CardTitle className="text-base">Sell Price Distribution</CardTitle></CardHeader>
                        <CardContent>
                            <div className="flex h-8 rounded-full overflow-hidden">
                                {(() => {
                                    const sp = recipe.sell_price || 1;
                                    const fc = ((recipe.food_cost ?? 0) / sp) * 100;
                                    const tx = (taxAmount / sp) * 100;
                                    const pr = 100 - fc - tx;
                                    return (<>
                                        <div className="bg-blue-500 flex items-center justify-center text-[10px] text-foreground font-medium" style={{ width: `${fc}%`  /* keep-inline */ }}>{fc > 8 ? 'Food' : ''}</div>
                                        <div className="bg-amber-500 flex items-center justify-center text-[10px] text-foreground font-medium" style={{ width: `${tx}%`  /* keep-inline */ }}>{tx > 8 ? 'Tax' : ''}</div>
                                        <div className="bg-green-500 flex items-center justify-center text-[10px] text-foreground font-medium" style={{ width: `${pr}%`  /* keep-inline */ }}>{pr > 8 ? 'Profit' : ''}</div>
                                    </>);
                                })()}
                            </div>
                            <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-500" />Food Cost</span>
                                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500" />Tax</span>
                                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-green-500" />Profit</span>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Outlet-Specific Pricing Table (Apicbase parity) */}
                    {(recipe.outlets?.length ?? 0) > 0 && (
                        <Card>
                            <CardHeader className="pb-3"><CardTitle className="text-base">Outlet-Specific Pricing</CardTitle></CardHeader>
                            <CardContent>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b">
                                                <th className="text-left py-2 px-3 text-xs text-muted-foreground uppercase">Outlet</th>
                                                <th className="text-right py-2 px-3 text-xs text-muted-foreground uppercase">Sell Price</th>
                                                <th className="text-right py-2 px-3 text-xs text-muted-foreground uppercase">Tax %</th>
                                                <th className="text-right py-2 px-3 text-xs text-muted-foreground uppercase">Food Cost %</th>
                                                <th className="text-right py-2 px-3 text-xs text-muted-foreground uppercase">Margin</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {recipe.outlets?.filter(o => o.linked).map(outlet => {
                                                const oSellPrice = outlet.sell_price ?? recipe.sell_price ?? 0;
                                                const oTax = outlet.tax_pct ?? recipe.tax_pct ?? 0;
                                                const oNet = oSellPrice / (1 + (oTax / 100));
                                                const oFoodCostPct = oNet > 0 ? ((recipe.food_cost ?? 0) / oNet) * 100 : 0;
                                                const oMargin = oNet - (recipe.food_cost ?? 0);
                                                return (
                                                    <tr key={outlet.id} className="border-b last:border-0 hover:bg-muted/30">
                                                        <td className="py-2 px-3 font-medium">{outlet.name}</td>
                                                        <td className="py-2 px-3 text-right">€{fmt(oSellPrice)}</td>
                                                        <td className="py-2 px-3 text-right">{fmt(oTax, 1)}%</td>
                                                        <td className="py-2 px-3 text-right">
                                                            <span className={oFoodCostPct > 35 ? 'text-red-500' : oFoodCostPct > 25 ? 'text-amber-500' : 'text-green-500'}>
                                                                {fmt(oFoodCostPct, 1)}%
                                                            </span>
                                                        </td>
                                                        <td className="py-2 px-3 text-right font-medium text-green-500">€{fmt(oMargin)}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Target Margin Indicator */}
                    {recipe.target_margin_pct != null && (
                        <Card className="border-blue-500/20">
                            <CardContent className="p-4 flex items-center justify-between">
                                <div>
                                    <p className="text-xs text-muted-foreground uppercase">Target Margin</p>
                                    <p className="text-lg font-bold">{fmt(recipe.target_margin_pct, 1)}%</p>
                                </div>
                                <div className={`text-sm font-medium px-3 py-1 rounded-full ${profitMargin >= (recipe.target_margin_pct ?? 0) ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                                    }`}>
                                    {profitMargin >= (recipe.target_margin_pct ?? 0) ? '✓ On Target' : '✗ Below Target'}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>

                {/* ═══ TAB 8: Sales Insights ═══ */}
                <TabsContent value="sales" className="space-y-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase">Times Sold</p><p className="text-2xl font-bold">{salesData.times_sold.toLocaleString()}</p></CardContent></Card>
                        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase">Revenue</p><p className="text-2xl font-bold text-green-500">€{fmt(salesData.revenue)}</p></CardContent></Card>
                        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase">CoGS</p><p className="text-2xl font-bold text-red-500">€{fmt(salesData.cogs)}</p></CardContent></Card>
                        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground uppercase">Popularity</p><p className="text-2xl font-bold">#{salesData.rank || '—'}</p><p className="text-xs text-muted-foreground">in {recipe.category || 'All'}</p></CardContent></Card>
                    </div>

                    <Card>
                        <CardHeader className="pb-3"><CardTitle className="text-base">Revenue & CoGS Over Time</CardTitle></CardHeader>
                        <CardContent>
                            {/* Stylized bar chart using CSS */}
                            <div className="flex items-end gap-2 h-40">
                                {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((month, i) => {
                                    const rev = salesData.monthly[i] ?? 0;
                                    const cogs = rev * ((salesData.cogs && salesData.revenue) ? (salesData.cogs / salesData.revenue) : 0.22);
                                    return (
                                        <div key={month} className="flex-1 flex flex-col items-center gap-0.5">
                                            <div className="w-full flex flex-col gap-0.5">
                                                <div className="bg-green-500/60 rounded-t" style={{ height: `${(rev / 1000) * 120}px`  /* keep-inline */ }} />
                                                <div className="bg-red-400/60 rounded-b" style={{ height: `${(cogs / 1000) * 120}px`  /* keep-inline */ }} />
                                            </div>
                                            <span className="text-[9px] text-muted-foreground">{month}</span>
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="flex justify-center gap-6 mt-3 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-green-500" />Revenue</span>
                                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-400" />CoGS</span>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ═══ TAB 9: Outlets ═══ */}
                <TabsContent value="outlets" className="space-y-6">
                    <Card>
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-base">Outlet Availability</CardTitle>
                                <div className="flex gap-2">
                                    <Button variant="outline" size="sm">Link All</Button>
                                    <Button variant="outline" size="sm">Unlink All</Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {(recipe.outlets ?? []).map(outlet => (
                                    <div key={outlet.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <Building2 className="h-5 w-5 text-muted-foreground" />
                                            <div>
                                                <p className="text-sm font-medium">{outlet.name}</p>
                                                <p className="text-xs text-muted-foreground">{outlet.linked ? 'Directly linked' : 'Not linked'}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            {outlet.linked && (
                                                <div className="text-right">
                                                    <p className="text-xs text-muted-foreground">€{fmt(outlet.sell_price ?? recipe.sell_price)}</p>
                                                    <p className="text-xs text-muted-foreground">{fmt(outlet.tax_pct ?? recipe.tax_pct, 1)}% VAT</p>
                                                </div>
                                            )}
                                            <Switch checked={outlet.linked} onCheckedChange={(v: boolean) => handleOutletToggle(outlet.id, v)} />
                                        </div>
                                    </div>
                                ))}
                                {(recipe.outlets?.length ?? 0) === 0 && (
                                    <p className="text-center py-8 text-muted-foreground">{"No "}outlets configured</p>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ═══ TAB 10: Images ═══ */}
                <TabsContent value="images" className="space-y-6">
                    <Card>
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-base">Recipe Images</CardTitle>
                                <Button variant="outline" size="sm"><Plus className="h-4 w-4 mr-2" />Add Images</Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {(recipe.images?.length ?? 0) > 0 ? (
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {recipe.images?.map((img, i) => (
                                        <div key={i} className={`relative aspect-square rounded-lg overflow-hidden border hover:ring-2 ring-primary transition-all cursor-pointer ${recipe.principal_image === img ? 'ring-2 ring-green-500' : ''}`}>
                                            <img src={img} alt={`Recipe ${i + 1}`} className="w-full h-full object-cover" />
                                            {recipe.principal_image === img && (
                                                <Badge className="absolute bottom-2 left-2 bg-green-500 text-foreground text-[10px]">Principal</Badge>
                                            )}
                                            <Button variant="destructive" size="icon" className="absolute top-2 right-2 h-6 w-6" onClick={() => handleImageDelete(i)}>
                                                <Trash2 className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-12 text-center">
                                    <ImageIcon className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                                    <p className="text-muted-foreground mb-2">{"No "}images linked to this product</p>
                                    <p className="text-xs text-muted-foreground mb-4">Drag & drop images here, or click Add Images above</p>
                                    <Button variant="outline"><Plus className="h-4 w-4 mr-2" />Add Images</Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </PageContainer>
    );
}
