import { logger } from '@/lib/logger';
import { AlertCircle,BarChart3,Barcode,Camera,Check,ChefHat,ChevronDown,ChevronLeft,ChevronRight,ChevronsUpDown,Download,FileUp,Filter,LayoutGrid,Plus,RefreshCw,Search,SlidersHorizontal,Sparkles,Trash2,Upload,UploadCloud,Warehouse,X } from 'lucide-react';
import { useEffect,useMemo,useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import PremiumDataTable from '../../../components/shared/PremiumDataTable';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Card,CardContent } from '../../../components/ui/card';
import { Checkbox } from '../../../components/ui/checkbox';
import { Dialog,DialogContent,DialogHeader,DialogTitle } from '../../../components/ui/dialog';
import { DropdownMenu,DropdownMenuContent,DropdownMenuItem,DropdownMenuLabel,DropdownMenuSeparator,DropdownMenuTrigger } from '../../../components/ui/dropdown-menu';
import { Input } from '../../../components/ui/input';
import { Popover,PopoverContent,PopoverTrigger } from '../../../components/ui/popover';
import { Select,SelectContent,SelectItem,SelectTrigger,SelectValue } from '../../../components/ui/select';
import { useAuth } from '../../../context/AuthContext';
import { useVenue } from '../../../context/VenueContext';
import PageContainer from '../../../layouts/PageContainer';
import api from '../../../lib/api';

import { AlertDialog,AlertDialogAction,AlertDialogCancel,AlertDialogContent,AlertDialogDescription,AlertDialogFooter,AlertDialogHeader,AlertDialogTitle } from '../../../components/ui/alert-dialog';

// ── Collapsible Filter Section (matching Items page) ──
function RecipeFilterSection({ title, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-border/50 last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full py-2.5 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
      >
        {title}
        {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
      </button>
      {open && <div className="pb-3 space-y-1.5">{children}</div>}
    </div>
  );
}

// ── Multi-Select Checkbox Filter (matching Items page) ──
function RecipeCheckboxFilter({ options, selected, onChange, maxVisible = 6 }) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? options : options.slice(0, maxVisible);
  return (
    <div className="space-y-1">
      {visible.map(opt => (
        <label
          key={opt.value}
          className="flex items-center gap-2 px-1 py-1 rounded text-xs cursor-pointer hover:bg-muted/50 transition-colors"
        >
          <Checkbox
            checked={selected.includes(opt.value)}
            onCheckedChange={(checked) => {
              if (checked) onChange([...selected, opt.value]);
              else onChange(selected.filter(v => v !== opt.value));
            }}
            className="h-3.5 w-3.5"
          />
          <span className="truncate">{opt.label}</span>
          {opt.count !== undefined && (
            <span className="ml-auto text-[10px] text-muted-foreground tabular-nums">{opt.count}</span>
          )}
        </label>
      ))}
      {options.length > maxVisible && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="text-[10px] text-primary hover:underline pl-1 pt-1"
        >
          {showAll ? 'Show less' : `+${options.length - maxVisible} more`}
        </button>
      )}
    </div>
  );
}

export default function RecipeManagement() {
  const { activeVenue } = useVenue();
  const { user, isManager, isOwner } = useAuth();
  const navigate = useNavigate();
  const [recipes, setRecipes] = useState([]);
  const [items, setItems] = useState([]); // Inventory Items to pick from
  const [menuItems, setMenuItems] = useState([]); // Menu Items to attach recipe to
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState(null);

  // Bulk Actions & View State
  const [viewMode, setViewMode] = useState('active'); // 'active' | 'archived' | 'trash'
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [trashData, setTrashData] = useState({ items: [], total: 0, retention_days: 30 });

  // Filters
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedSubcategories, setSelectedSubcategories] = useState([]);
  const [selectedDiets, setSelectedDiets] = useState([]);
  const [availableCategories, setAvailableCategories] = useState([]);
  const [availableSubcategories, _setAvailableSubcategories] = useState([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [quickFilter, setQuickFilter] = useState('all');
  const [displayMode, setDisplayMode] = useState('list'); // 'list' | 'grid'
  const [statViewMode, setStatViewMode] = useState('cards'); // 'compact' | 'cards' | 'hidden'

  const DIET_OPTIONS = [
    { value: 'halal', label: 'Halal' },
    { value: 'kosher', label: 'Kosher' },
    { value: 'vegan', label: 'Vegan' },
    { value: 'vegetarian', label: 'Vegetarian' },
    { value: 'gluten_free', label: 'Gluten-Free' },
    { value: 'dairy_free', label: 'Dairy-Free' },
    { value: 'nut_free', label: 'Nut-Free' },
  ];

  // Multi-select toggle helper
  const toggleMultiSelect = (_arr, setArr, value) => {
    setArr(prev => prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]);
  };

  // Gap 8: PLU Mapping
  const [pluMappings, setPluMappings] = useState([]);

  // Gap 16: Stockable Recipes
  const [stockableEnabled, setStockableEnabled] = useState(false);
  const [stockableFields, setStockableFields] = useState({ unit: 'portion', shelf_life_days: 3, storage: 'refrigerated' });

  // Gap 17: AI Recipe Import
  const [showAiImport, setShowAiImport] = useState(false);
  const [aiImportMode, setAiImportMode] = useState('url'); // 'url' | 'photo' | 'pdf'
  const [aiImportInput, setAiImportInput] = useState('');
  const [aiImportLoading, setAiImportLoading] = useState(false);

  // Gap 21: Media Library
  const [showMediaLibrary, setShowMediaLibrary] = useState(false);

  // Column Visibility
  const [visibleColumns, setVisibleColumns] = useState({
    item_id: true, recipe_name: true, category: true, subcategory: true,
    cost: true, sell_price: true, margin: true, cuisine: true, updated_at: true,
  });
  const [columnMenuOpen, setColumnMenuOpen] = useState(false);
  const toggleColumnVisibility = (colId) => {
    setVisibleColumns(prev => ({ ...prev, [colId]: !prev[colId] }));
  };

  // â”€â”€ Sidebar Filter Panel â”€â”€
  const [recipeSidebarOpen, setRecipeSidebarOpen] = useState(true);
  const [recipeSidebarFilters, setRecipeSidebarFilters] = useState({
    productType: 'all',    // 'all' | 'finished' | 'semi_finished'
    cuisine: 'all',
    allergens: [],
    difficulty: 'all',     // 'all' | 'easy' | 'medium' | 'hard'
    seasons: [],
    dishType: 'all',       // 'all' | 'main' | 'side' | 'dessert' | 'starter' | 'appetizer'
    stage: 'all',          // 'all' | 'development' | 'testing' | 'production'
    approved: 'all',       // 'all' | 'approved' | 'pending'
  });

  const EU_ALLERGENS = [
    'gluten', 'crustaceans', 'eggs', 'fish', 'peanuts', 'soybeans',
    'milk', 'nuts', 'celery', 'mustard', 'sesame', 'sulphites',
    'lupin', 'molluscs',
  ];

  const CUISINE_OPTIONS = [
    'Italian', 'French', 'Mediterranean', 'Asian', 'Japanese', 'Chinese',
    'Indian', 'Mexican', 'American', 'Middle Eastern', 'Greek', 'Thai',
    'Spanish', 'Maltese', 'British', 'Other',
  ];

  const updateRecipeSidebarFilter = (key, value) => {
    setRecipeSidebarFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearRecipeSidebarFilters = () => {
    setRecipeSidebarFilters({
      productType: 'all', cuisine: 'all', allergens: [],
      difficulty: 'all', seasons: [], dishType: 'all',
      stage: 'all', approved: 'all',
    });
  };

  const recipeSidebarFilterCount = useMemo(() => {
    let count = 0;
    if (recipeSidebarFilters.productType !== 'all') count++;
    if (recipeSidebarFilters.cuisine !== 'all') count++;
    if (recipeSidebarFilters.allergens.length > 0) count++;
    if (recipeSidebarFilters.difficulty !== 'all') count++;
    if (recipeSidebarFilters.seasons.length > 0) count++;
    if (recipeSidebarFilters.dishType !== 'all') count++;
    if (recipeSidebarFilters.stage !== 'all') count++;
    if (recipeSidebarFilters.approved !== 'all') count++;
    return count;
  }, [recipeSidebarFilters]);

  // Apply sidebar filters to recipes
  const sidebarFilteredRecipes = useMemo(() => {
    let filtered = recipes;

    // Apply command-bar multi-select filters first
    if (selectedCategories.length > 0) {
      filtered = filtered.filter(r => {
        const cat = r.category || r.raw_import_data?.Category || r.raw_import_data?.['General Information: Dish type'] || '';
        return selectedCategories.some(c => cat.toLowerCase() === c.toLowerCase());
      });
    }
    if (selectedSubcategories.length > 0) {
      filtered = filtered.filter(r => {
        const sub = r.subcategory || r.raw_import_data?.Subcategory || r.raw_import_data?.['General Information: Product class'] || '';
        return selectedSubcategories.some(c => sub.toLowerCase() === c.toLowerCase());
      });
    }
    if (selectedDiets.length > 0) {
      filtered = filtered.filter(r => {
        const raw = r.raw_import_data || {};
        const diets = [
          r.diet?.toLowerCase(),
          raw['General Information: Diet']?.toLowerCase(),
          ...(Array.isArray(r.diets) ? r.diets.map(d => d.toLowerCase()) : []),
        ].filter(Boolean);
        // Also check boolean flags
        if (r.is_halal || raw.halal) diets.push('halal');
        if (r.is_kosher || raw.kosher) diets.push('kosher');
        if (r.is_vegan || raw.vegan) diets.push('vegan');
        if (r.is_vegetarian || raw.vegetarian) diets.push('vegetarian');
        if (r.is_gluten_free || raw.gluten_free) diets.push('gluten_free');
        return selectedDiets.some(d => diets.includes(d));
      });
    }

    // Then apply sidebar filters
    if (recipeSidebarFilterCount === 0) return filtered;
    return filtered.filter(r => {
      const raw = r.raw_import_data || {};
      // Product Type
      if (recipeSidebarFilters.productType !== 'all') {
        const pt = (raw['General Information: Product Type'] || r.product_type || '').toLowerCase();
        if (recipeSidebarFilters.productType === 'finished' && pt.includes('semi')) return false;
        if (recipeSidebarFilters.productType === 'semi_finished' && !pt.includes('semi')) return false;
      }
      // Cuisine
      if (recipeSidebarFilters.cuisine !== 'all') {
        const cuisine = (raw['General Information: Cuisine'] || r.cuisine || '').toLowerCase();
        if (!cuisine.includes(recipeSidebarFilters.cuisine.toLowerCase())) return false;
      }
      // Allergens
      if (recipeSidebarFilters.allergens.length > 0) {
        const recipeAllergens = Object.entries(r.allergens || {})
          .filter(([, v]) => v === true)
          .map(([k]) => k.toLowerCase());
        const rawAllergens = Object.entries(raw)
          .filter(([k, v]) => k.includes('Allergens') && (v === 'contains' || v === true || v === 'Yes'))
          .map(([k]) => k.split(': ').pop().toLowerCase());
        const all = [...recipeAllergens, ...rawAllergens];
        if (!recipeSidebarFilters.allergens.some(a => all.includes(a))) return false;
      }
      // Difficulty
      if (recipeSidebarFilters.difficulty !== 'all') {
        const diff = (raw['General Information: Difficulty'] || r.difficulty || '').toLowerCase();
        if (diff !== recipeSidebarFilters.difficulty) return false;
      }
      // Seasons
      if (recipeSidebarFilters.seasons.length > 0) {
        const seasons = (raw['General Information: Seasons'] || r.seasons || '').toLowerCase();
        if (!recipeSidebarFilters.seasons.some(s => seasons.includes(s.toLowerCase()))) return false;
      }
      // Dish Type
      if (recipeSidebarFilters.dishType !== 'all') {
        const dt = (raw['General Information: Dish type'] || r.dish_type || r.category || '').toLowerCase();
        if (!dt.includes(recipeSidebarFilters.dishType)) return false;
      }
      // Stage
      if (recipeSidebarFilters.stage !== 'all') {
        const stage = (raw['General Information: Stage'] || r.stage || '').toLowerCase();
        if (stage !== recipeSidebarFilters.stage) return false;
      }
      // Approved
      if (recipeSidebarFilters.approved !== 'all') {
        const approved = r.approved !== false;
        if (recipeSidebarFilters.approved === 'approved' && !approved) return false;
        if (recipeSidebarFilters.approved === 'pending' && approved) return false;
      }
      return true;
    });
  }, [recipes, recipeSidebarFilters, recipeSidebarFilterCount, selectedCategories, selectedSubcategories, selectedDiets]);

  // Pagination & Server Stats
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [stats, setStats] = useState({
    total_active: 0,
    total_archived: 0,
    added_today: 0,
    missing_ids: 0,
    categories: 0
  });



  // Form State
  const [formData, setFormData] = useState({
    sku_id: '',
    yield_qty: 1,
    yield_uom: 'EA',
    components: [] // { ref_id, qty_base, type='SKU' }
  });

  useEffect(() => {
    if (activeVenue?.id) {
      loadStats();
      loadData(1);
    }
  }, [activeVenue?.id, viewMode]);

  useEffect(() => {
    // Reload when page changes
    if (activeVenue?.id) {
      loadData(page);
    }
  }, [page]);

  useEffect(() => {
    if (activeVenue?.id) {
      setPage(1);
      loadData(1);
    }
  }, [limit]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (activeVenue?.id) {
        if (page === 1) loadData(1);
        else setPage(1);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Reload when quickFilter changes (dashboard widget clicks)
  useEffect(() => {
    if (activeVenue?.id) {
      setPage(1);
      loadData(1);
    }
  }, [quickFilter]);

  const loadStats = async () => {
    try {
      const res = await api.get(`venues/${activeVenue.id}/recipes/engineered/stats`);
      setStats(res.data);
    } catch (e) {
      logger.error("Failed to load stats", e);
    }
  };

  const loadData = async (currentPage = 1) => {
    setLoading(true);
    try {
      const isArchived = viewMode === 'archived';
      const isTrash = viewMode === 'trash';

      // Server-Side: Fetch only what we need
      let recipesRes;

      if (isTrash) {
        // Fetch trash data from dedicated endpoint
        recipesRes = await api.get(`venues/${activeVenue.id}/recipes/engineered/trash`, {
          params: { page: currentPage, limit: limit }
        });
        const trashResponse = recipesRes.data;
        setTrashData(trashResponse);
        setRecipes(trashResponse.data || []);
        setTotalPages(trashResponse.total_pages || 1);
        setTotalRecords(trashResponse.total || 0);
      } else {
        // Normal active/archived fetch
        recipesRes = await api.get(`venues/${activeVenue.id}/recipes/engineered`, {
          params: {
            active: !isArchived,
            page: currentPage,
            limit: limit,
            search: searchQuery || undefined,
            category: selectedCategories.length > 0 ? selectedCategories.join(',') : undefined,
            quick_filter: quickFilter !== 'all' ? quickFilter : undefined
          }
        });
      }

      const [itemsRes, menuRes] = await Promise.all([
        items.length === 0 ? api.get(`venues/${activeVenue.id}/inventory`) : Promise.resolve({ data: items }),
        menuItems.length === 0 ? api.get(`venues/${activeVenue.id}/menu/items?all=true`) : Promise.resolve({ data: menuItems })
      ]);

      if (!isTrash) {
        const data = recipesRes.data;
        // Handle both legacy (array) and new (object) responses during transition
        const loadedRecipes = Array.isArray(data) ? data : (data.items || []);

        if (!Array.isArray(data)) {
          setTotalPages(data.pages || 1);
          setTotalRecords(data.total || 0);
        } else {
          // Fallback for legacy
          setTotalPages(1);
          setTotalRecords(loadedRecipes.length);
        }

        setRecipes(loadedRecipes);

        // Extract Filters (Optimized: Only from current page)
        const cats = new Set(availableCategories);
        loadedRecipes.forEach(r => { if (r.category) cats.add(r.category); });
        setAvailableCategories(Array.from(cats));
      }

      if (itemsRes.data) setItems(itemsRes.data);
      if (menuRes.data) setMenuItems(menuRes.data);
    } catch (e) {
      logger.error(e);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const addItemToRecipe = (inventoryItem) => {
    setFormData(prev => ({
      ...prev,
      components: [
        ...prev.components,
        {
          ref_id: inventoryItem.id,
          name: inventoryItem.name, // Temp for UI
          unit: inventoryItem.unit, // Temp for UI
          type: 'SKU',
          qty_base: 1,
          waste_factor: 1.0
        }
      ]
    }));
  };

  const updateComponent = (index, field, value) => {
    const updated = [...formData.components];
    updated[index][field] = value;
    updated[index].qty_base = parseFloat(updated[index].qty_base || 0);
    setFormData({ ...formData, components: updated });
  };

  const removeComponent = (index) => {
    const updated = [...formData.components];
    updated.splice(index, 1);
    setFormData({ ...formData, components: updated });
  };

  const handleAction = async (action, recipeId) => {
    try {
      let res;
      const ids = [recipeId];
      if (action === 'archive') {
        res = await api.post(`venues/${activeVenue.id}/recipes/engineered/bulk-archive`, { recipe_ids: ids });
      } else if (action === 'restore') {
        res = await api.post(`venues/${activeVenue.id}/recipes/engineered/bulk-restore`, { recipe_ids: ids });
      } else if (action === 'delete') {
        res = await api.post(`venues/${activeVenue.id}/recipes/engineered/bulk-delete`, { recipe_ids: ids });
      }
      toast.success(res.data.message);
      loadData();
    } catch (e) {
      toast.error("Action failed");
    }
  };

  const handleBulkAction = async (action) => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    try {
      let res;
      if (action === 'archive') {
        res = await api.post(`venues/${activeVenue.id}/recipes/engineered/bulk-archive`, { recipe_ids: ids });
      } else if (action === 'restore') {
        res = await api.post(`venues/${activeVenue.id}/recipes/engineered/bulk-restore`, { recipe_ids: ids });
      } else if (action === 'delete') {
        res = await api.post(`venues/${activeVenue.id}/recipes/engineered/bulk-delete`, { recipe_ids: ids });
        setIsDeleteAlertOpen(false);
      } else if (action === 'restore-trash') {
        // Restore from trash
        res = await api.post(`venues/${activeVenue.id}/recipes/engineered/bulk-restore-trash`, { recipe_ids: ids });
      } else if (action === 'purge') {
        // Permanent delete (owner only)
        res = await api.post(`venues/${activeVenue.id}/recipes/engineered/bulk-purge`, { recipe_ids: ids });
        setIsDeleteAlertOpen(false);
      }

      toast.success(res?.data?.message || 'Action completed');
      setSelectedIds(new Set());
      loadData();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Bulk action failed");
    }
  };

  const handleSave = async () => {
    // Validation
    if (!editingRecipe.recipe_name?.trim()) {
      toast.error("Recipe Name is required");
      return;
    }
    if (!editingRecipe.category) {
      toast.error("Category is required");
      return;
    }

    try {
      const isNew = !editingRecipe?.id;
      const venueId = recipes[0]?.venue_id || activeVenue?.id || 'v1'; // Fallback

      const payload = {
        recipe_name: editingRecipe.recipe_name,
        category: editingRecipe.category,
        raw_import_data: editingRecipe.raw_import_data || {},
        ingredients: [],
        servings: 1,
        // Gap 8: PLU Mapping data
        plu_codes: pluMappings.filter(p => p.code.trim()),
        // Gap 16: Stockable recipe data
        is_stockable: stockableEnabled,
        stockable_config: stockableEnabled ? stockableFields : undefined,
      };

      // Sync names if raw data exists
      if (payload.raw_import_data) {
        payload.raw_import_data.Name = payload.recipe_name;

        // Auto-Generate Item ID if missing (Format: MG{Venue}001)
        if (!payload.raw_import_data['Item ID'] && isNew) {
          const venueCode = (activeVenue?.name?.substring(0, 3) || 'VEN').toUpperCase();
          // Find max existing number to increment
          let maxNum = 0;
          recipes.forEach(r => {
            const existId = r.raw_import_data?.['Item ID'] || '';
            const match = existId.match(/(\d+)$/);
            if (match) {
              const num = parseInt(match[1], 10);
              if (num > maxNum) maxNum = num;
            }
          });
          const nextNum = String(maxNum + 1).padStart(3, '0');
          payload.raw_import_data['Item ID'] = `MG${venueCode}${nextNum}`;
        }
      }

      let response;
      if (isNew) {
        response = await fetch(`/api/venues/${venueId}/recipes/engineered`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        response = await fetch(`/api/venues/${venueId}/recipes/engineered/${editingRecipe.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      if (response.ok) {
        toast.success(isNew ? "Recipe created successfully" : "Recipe updated successfully");
        setIsModalOpen(false);
        loadData();
      } else {
        const error = await response.json();
        toast.error(error.detail || "Failed to save recipe");
      }
    } catch (e) {
      logger.error(e);
      toast.error("An error occurred while saving");
    }
  };

  // Helper to find name from ID
  const _getName = (id, list) => list.find(x => x.id === id)?.name || id;





  // Convert columns to TanStack format for PremiumDataTable
  const premiumColumns = useMemo(() => {
    return [
      {
        id: 'item_id',
        accessorKey: 'item_id',
        header: 'Item ID',
        size: 110,
        minSize: 90,
        cell: ({ row }) => (
          <div className="font-mono text-xs text-emerald-400 bg-emerald-950/50 px-2 py-1 rounded font-bold">
            {row.original.raw_import_data?.['Item ID'] || row.original.raw_import_data?.['Sku'] || row.original.item_id || '-'}
          </div>
        ),
        filterFn: 'auto'
      },
      {
        id: 'recipe_name',
        accessorKey: 'recipe_name',
        header: 'Recipe Name',
        size: 220,
        minSize: 160,
        cell: ({ row }) => <div className="font-bold text-foreground truncate">{row.original.recipe_name}</div>,
        filterFn: 'auto'
      },
      {
        id: 'category',
        accessorKey: 'category',
        header: 'Category',
        size: 110,
        minSize: 80,
        cell: ({ row }) => {
          const cat = row.original.category || row.original.raw_import_data?.['General Information: category'] || row.original.raw_import_data?.['General Information: type'] || '-';
          return (
            <span className="text-xs font-semibold text-muted-foreground uppercase truncate max-w-[140px] block" title={cat}>
              {cat}
            </span>
          );
        },
        filterFn: 'auto'
      },
      {
        id: 'subcategory',
        accessorKey: 'subcategory',
        header: 'Subcategory',
        size: 120,
        minSize: 80,
        cell: ({ row }) => {
          const sub = row.original.subcategory || row.original.raw_import_data?.['General Information: subcategory'] || row.original.raw_import_data?.['General Information: class'] || '-';
          return <span className="text-xs truncate max-w-[140px] block" title={sub}>{sub}</span>;
        },
        filterFn: 'auto'
      },

      {
        id: 'cost',
        accessorKey: 'cost',
        header: 'Cost',
        size: 100,
        minSize: 80,
        cell: ({ row }) => {
          const cost = row.original.total_cost || row.original.cost_analysis?.total_cost || 0;
          return (
            <span className="font-mono text-xs text-amber-400">
              {`\u20AC${Number(cost).toFixed(2)}`}
            </span>
          );
        }
      },
      {
        id: 'sell_price',
        accessorKey: 'sell_price',
        header: 'Sell Price',
        size: 100,
        minSize: 80,
        cell: ({ row }) => {
          const price = row.original.sell_price || row.original.target_sales_price || row.original.raw_import_data?.['Financial: sell price'] || 0;
          return <span className="font-mono text-xs text-emerald-400">{`\u20AC${Number(price).toFixed(2)}`}</span>;
        }
      },
      {
        id: 'margin',
        accessorKey: 'margin',
        header: 'Margin %',
        size: 90,
        minSize: 70,
        cell: ({ row }) => {
          const cost = row.original.total_cost || row.original.cost_analysis?.total_cost || 0;
          const price = row.original.sell_price || row.original.target_sales_price || Number(row.original.raw_import_data?.['Financial: sell price'] || 0);
          if (!price || !cost) return <span className="text-xs text-muted-foreground">{"\u2014"}</span>;
          const margin = ((price - cost) / price * 100).toFixed(1);
          // @ts-ignore
          const color = margin >= 70 ? 'text-green-400' : margin >= 50 ? 'text-amber-400' : 'text-red-400';
          return <span className={`font-mono text-xs ${color}`}>{margin}%</span>;
        }
      },
      {
        id: 'cuisine',
        accessorKey: 'cuisine',
        header: 'Cuisine',
        size: 100,
        minSize: 70,
        cell: ({ row }) => {
          const cuisine = row.original.cuisine || row.original.raw_import_data?.['General Information: cuisine'] || '';
          return cuisine ? <span className="text-xs">{cuisine}</span> : <span className="text-xs text-muted-foreground">{"\u2014"}</span>;
        }
      },
      {
        id: 'updated_at',
        accessorKey: 'updated_at',
        header: 'Modified',
        size: 110,
        minSize: 90,
        cell: ({ row }) => {
          const d = row.original.updated_at || row.original.last_modified;
          if (!d) return <span className="text-xs text-muted-foreground">{"\u2014"}</span>;
          try { return <span className="text-xs text-muted-foreground tabular-nums">{new Date(d).toLocaleDateString()}</span>; }
          catch { return <span className="text-xs text-muted-foreground">{"\u2014"}</span>; }
        }
      }
    ];
  }, []);

  return (
    <PageContainer>
      {/* Trash Mode Banner */}
      {viewMode === 'trash' && (
        <div className="bg-red-950/50 border border-red-500/30 rounded-xl p-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-600/20 flex items-center justify-center">
              <Trash2 className="w-5 h-5 text-red-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-bold text-red-400">Trash Bin</h3>
              <p className="text-muted-foreground text-xs">
                Items permanently deleted after {trashData.retention_days || 30} days
                <span className="text-muted-foreground ml-1">({totalRecords} items)</span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Collapsible Stat Strip ── */}
      {viewMode !== 'trash' && statViewMode !== 'hidden' && (() => {
        const statItems = [
          { key: 'all', label: 'Total Recipes', value: stats.total_active, color: 'emerald', icon: ChefHat },
          { key: 'today', label: 'Added Today', value: stats.added_today, color: 'blue', icon: RefreshCw },
          { key: 'categories', label: 'Categories', value: stats.categories, color: 'purple', icon: Filter },
          { key: 'missing_id', label: 'Missing IDs', value: stats.missing_ids, color: 'amber', icon: AlertCircle },
        ];
        return (
          <div className="mb-3 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-start justify-between gap-2">
              {statViewMode === 'compact' ? (
                <div className="flex items-center gap-2 flex-wrap">
                  {statItems.map(stat => {
                    const Icon = stat.icon;
                    const isActive = quickFilter === stat.key;
                    return (
                      <button
                        key={stat.key}
                        onClick={() => setQuickFilter(stat.key)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 border ${isActive
                          ? `bg-${stat.color}-500/15 border-${stat.color}-500/40 text-${stat.color}-400 ring-1 ring-${stat.color}-500/20`
                          : 'bg-card/50 border-border text-muted-foreground hover:text-secondary-foreground hover:bg-secondary/50'
                          }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span className="tracking-wide uppercase">{stat.label}</span>
                        <span className={`font-mono text-sm font-black ${isActive ? `text-${stat.color}-300` : 'text-foreground'}`}>
                          {stat.value}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 flex-1">
                  {statItems.map(stat => {
                    const Icon = stat.icon;
                    const isActive = quickFilter === stat.key;
                    return (
                      <button
                        key={stat.key}
                        onClick={() => setQuickFilter(stat.key)}
                        className={`relative rounded-xl p-5 transition-all duration-200 border text-left group ${isActive
                          ? `bg-${stat.color}-500/10 border-${stat.color}-500/40 ring-1 ring-${stat.color}-500/20`
                          : 'bg-card/40 border-border hover:bg-secondary/60 hover:border-border'
                          }`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isActive ? `bg-${stat.color}-500/20` : 'bg-secondary'
                            }`}>
                            <Icon className={`w-6 h-6 ${isActive ? `text-${stat.color}-400` : 'text-muted-foreground group-hover:text-secondary-foreground'}`} />
                          </div>
                        </div>
                        <div className={`text-3xl font-black font-mono mb-1 ${isActive ? `text-${stat.color}-300` : 'text-foreground'}`}>
                          {stat.value}
                        </div>
                        <div className={`text-xs font-medium uppercase tracking-wider ${isActive ? `text-${stat.color}-400/80` : 'text-muted-foreground'}`}>
                          {stat.label}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Stat view toggle + close */}
              <div className="flex flex-col gap-1 ml-1">
                <button
                  onClick={() => setStatViewMode(statViewMode === 'compact' ? 'cards' : 'compact')}
                  title={statViewMode === 'compact' ? 'Large cards' : 'Compact pills'}
                  className="p-1.5 rounded-md transition-all text-muted-foreground hover:text-secondary-foreground bg-secondary/50 hover:bg-secondary/80"
                >
                  {statViewMode === 'compact' ? <LayoutGrid className="w-3.5 h-3.5" /> : (
                    <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <line x1="2" y1="4" x2="14" y2="4" /><line x1="2" y1="8" x2="14" y2="8" /><line x1="2" y1="12" x2="14" y2="12" />
                    </svg>
                  )}
                </button>
                <button
                  onClick={() => setStatViewMode('hidden')}
                  title="Hide stats"
                  className="p-1.5 rounded-md transition-all text-muted-foreground hover:text-muted-foreground"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Single Compact Command Row ── */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        {/* Search (leftmost) */}
        <div className="relative flex-1 min-w-40 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input aria-label="Search recipes..."
            placeholder="Search recipes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-8 text-xs bg-card border-border focus:border-emerald-500"
          />
        </div>

        {/* Inline filter dropdowns */}
        {/* Multi-Select: Category */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className={`h-8 text-xs gap-1.5 border-border bg-card hover:bg-secondary ${selectedCategories.length > 0 ? 'text-emerald-400 border-emerald-500/40' : 'text-muted-foreground'}`}>
              {selectedCategories.length === 0 ? 'All Categories' : `${selectedCategories.length} Cat.`}
              <ChevronsUpDown className="w-3 h-3 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-52 p-0 bg-background border-border" align="start">
            <div className="p-2 border-b border-border">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Categories</span>
                {selectedCategories.length > 0 && (
                  <button onClick={() => setSelectedCategories([])} className="text-[10px] text-muted-foreground hover:text-foreground">Clear</button>
                )}
              </div>
            </div>
            <div className="max-h-48 overflow-y-auto p-1">
              {availableCategories.filter(c => c !== 'All').map(c => (
                <label key={c} className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-secondary/80 cursor-pointer text-xs text-secondary-foreground">
                  <Checkbox checked={selectedCategories.includes(c)} onCheckedChange={() => toggleMultiSelect(selectedCategories, setSelectedCategories, c)} className="h-3.5 w-3.5 border-zinc-600" />
                  {c}
                </label>
              ))}
              {availableCategories.filter(c => c !== 'All').length === 0 && (
                <div className="text-xs text-muted-foreground text-center py-3">{"No "}categories</div>
              )}
            </div>
          </PopoverContent>
        </Popover>

        {/* Multi-Select: Subcategory */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className={`h-8 text-xs gap-1.5 border-border bg-card hover:bg-secondary ${selectedSubcategories.length > 0 ? 'text-emerald-400 border-emerald-500/40' : 'text-muted-foreground'}`}>
              {selectedSubcategories.length === 0 ? 'All Subcats' : `${selectedSubcategories.length} Sub.`}
              <ChevronsUpDown className="w-3 h-3 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-52 p-0 bg-background border-border" align="start">
            <div className="p-2 border-b border-border">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Subcategories</span>
                {selectedSubcategories.length > 0 && (
                  <button onClick={() => setSelectedSubcategories([])} className="text-[10px] text-muted-foreground hover:text-foreground">Clear</button>
                )}
              </div>
            </div>
            <div className="max-h-48 overflow-y-auto p-1">
              {availableSubcategories.filter(c => c !== 'All').map(c => (
                <label key={c} className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-secondary/80 cursor-pointer text-xs text-secondary-foreground">
                  <Checkbox checked={selectedSubcategories.includes(c)} onCheckedChange={() => toggleMultiSelect(selectedSubcategories, setSelectedSubcategories, c)} className="h-3.5 w-3.5 border-zinc-600" />
                  {c}
                </label>
              ))}
              {availableSubcategories.filter(c => c !== 'All').length === 0 && (
                <div className="text-xs text-muted-foreground text-center py-3">{"No "}subcategories</div>
              )}
            </div>
          </PopoverContent>
        </Popover>

        {/* Multi-Select: Diet */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className={`h-8 text-xs gap-1.5 border-border bg-card hover:bg-secondary ${selectedDiets.length > 0 ? 'text-emerald-400 border-emerald-500/40' : 'text-muted-foreground'}`}>
              {selectedDiets.length === 0 ? 'All Diets' : `${selectedDiets.length} Diet`}
              <ChevronsUpDown className="w-3 h-3 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-0 bg-background border-border" align="start">
            <div className="p-2 border-b border-border">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Diets</span>
                {selectedDiets.length > 0 && (
                  <button onClick={() => setSelectedDiets([])} className="text-[10px] text-muted-foreground hover:text-foreground">Clear</button>
                )}
              </div>
            </div>
            <div className="max-h-48 overflow-y-auto p-1">
              {DIET_OPTIONS.map(d => (
                <label key={d.value} className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-secondary/80 cursor-pointer text-xs text-secondary-foreground">
                  <Checkbox checked={selectedDiets.includes(d.value)} onCheckedChange={() => toggleMultiSelect(selectedDiets, setSelectedDiets, d.value)} className="h-3.5 w-3.5 border-zinc-600" />
                  {d.label}
                </label>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        <div className="w-px h-5 bg-secondary" />

        {/* Active/Archived/Trash dropdown (right side) */}
        <div className="relative">
          <select aria-label="Input"
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value)}

            className="appearance-none cursor-pointer h-8 pl-3 pr-8 rounded-lg text-[11px] font-bold border transition-all"
            style={{ /* keep-inline */
              backgroundColor: viewMode === 'active' ? 'rgba(16, 185, 129, 0.15)' : viewMode === 'archived' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              color: viewMode === 'active' ? '#34D399' : viewMode === 'archived' ? '#FBBF24' : '#F87171',
              borderColor: viewMode === 'active' ? 'rgba(16, 185, 129, 0.4)' : viewMode === 'archived' ? 'rgba(245, 158, 11, 0.4)' : 'rgba(239, 68, 68, 0.4)',
              outline: 'none',
              /* keep-inline */
}} /* keep-inline */ /* keep-inline */
          >
            <option value="active" style={{ backgroundColor: '#18181b', color: '#e4e4e7'  /* keep-inline */ }} /* keep-inline */ /* keep-inline */>Active ({stats.total_active || 0})</option>
            <option value="archived" style={{ backgroundColor: '#18181b', color: '#e4e4e7'  /* keep-inline */ }} /* keep-inline */ /* keep-inline */>Archived ({stats.total_archived || 0})</option>
            {/* @ts-ignore */}
            <option value="trash" style={{ backgroundColor: '#18181b', color: '#e4e4e7'  /* keep-inline */ }} /* keep-inline */ /* keep-inline */>Trash ({stats.total_trash || 0})</option>
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
            <svg className="w-3 h-3" style={{ color: viewMode === 'active' ? '#34D399' : viewMode === 'archived' ? '#FBBF24' : '#F87171'  /* keep-inline */ }} /* keep-inline */ /* keep-inline */ fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        {/* Stat strip toggle */}
        {viewMode !== 'trash' && (
          <Button
            variant="ghost"
            size="sm"
            className={`h-8 w-8 p-0 ${statViewMode !== 'hidden' ? 'text-emerald-400 bg-emerald-500/10' : 'text-muted-foreground hover:text-foreground'}`}
            onClick={() => setStatViewMode(statViewMode === 'hidden' ? 'compact' : 'hidden')}
            title={statViewMode === 'hidden' ? 'Show stats' : 'Hide stats'}
          >
            <BarChart3 className="w-3.5 h-3.5" />
          </Button>
        )}

        {/* Filter sidebar toggle */}
        <Button variant="ghost" size="sm" className={`h-8 text-xs ${recipeSidebarOpen ? 'text-emerald-400 bg-emerald-500/10' : 'text-muted-foreground hover:text-foreground'}`} onClick={() => setRecipeSidebarOpen(!recipeSidebarOpen)}>
          <SlidersHorizontal className="w-3.5 h-3.5 mr-1" />
          Filters
          {recipeSidebarFilterCount > 0 && (
            <Badge className="ml-1 h-4 min-w-4 px-1 text-[9px] rounded-full bg-emerald-500 text-foreground">{recipeSidebarFilterCount}</Badge>
          )}
        </Button>

        {/* Column visibility toggle */}
        <DropdownMenu open={columnMenuOpen} onOpenChange={setColumnMenuOpen}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className={`h-8 w-8 p-0 ${Object.values(visibleColumns).some(v => !v) ? 'text-amber-400 bg-amber-500/10' : 'text-muted-foreground hover:text-foreground'}`} title="Toggle columns">
              <LayoutGrid className="w-3.5 h-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-44 bg-card border-border">
            <DropdownMenuLabel className="text-[10px] text-muted-foreground uppercase tracking-wider">Columns</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {[
              { id: 'item_id', label: 'Item ID' },
              { id: 'recipe_name', label: 'Recipe Name' },
              { id: 'category', label: 'Category' },
              { id: 'subcategory', label: 'Subcategory' },
              { id: 'cost', label: 'Cost' },
              { id: 'sell_price', label: 'Sell Price' },
              { id: 'margin', label: 'Margin %' },
              { id: 'cuisine', label: 'Cuisine' },
              { id: 'updated_at', label: 'Modified' },
            ].map(col => (
              <DropdownMenuItem key={col.id} onSelect={(e) => { e.preventDefault(); toggleColumnVisibility(col.id); }} className="flex items-center gap-2 cursor-pointer text-xs">
                <div className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center ${visibleColumns[col.id] ? 'bg-emerald-500/20 border-emerald-500/60' : 'border-zinc-600'}`}>
                  {visibleColumns[col.id] && <Check className="w-2.5 h-2.5 text-emerald-400" />}
                </div>
                {col.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Action buttons */}
        <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground hover:text-foreground" onClick={() => navigate('/manager/migration')}>
          <UploadCloud className="w-3.5 h-3.5 mr-1" />
          Import
        </Button>
        <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground hover:text-foreground" onClick={() => navigate('/manager/data-exports')}>
          <Download className="w-3.5 h-3.5 mr-1" />
          Export
        </Button>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground" onClick={() => loadData()}>
          <RefreshCw className="w-3.5 h-3.5" />
        </Button>
        <Button size="sm" className="h-8 text-xs bg-emerald-600 hover:bg-emerald-500 text-foreground font-bold" onClick={() => navigate('/manager/inventory-recipes/new')}>
          <Plus className="w-3.5 h-3.5 mr-1" />
          New Recipe
        </Button>

        {/* List/Grid toggle */}
        <div className="flex rounded-md border border-border bg-card overflow-hidden">
          <button
            onClick={() => setDisplayMode('list')}
            title="List view"
            className={`px-2 py-1.5 text-xs transition-colors ${displayMode === 'list' ? 'bg-emerald-600 text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <LayoutGrid className="w-3.5 h-3.5 rotate-0" />
          </button>
          <button
            onClick={() => setDisplayMode('grid')}
            title="Grid view"
            className={`px-2 py-1.5 text-xs transition-colors ${displayMode === 'grid' ? 'bg-emerald-600 text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-2 bg-indigo-950/30 border border-indigo-500/30 px-3 py-1.5 rounded-lg mb-3 animate-in fade-in slide-in-from-bottom-2">
          <span className="text-xs font-bold text-indigo-200">{selectedIds.size} selected</span>
          <div className="h-3 w-px bg-white/10 mx-1" />

          {viewMode === 'active' ? (
            <Button size="sm" variant="ghost" className="h-7 text-xs text-indigo-300 hover:text-indigo-100 hover:bg-indigo-500/20" onClick={() => handleBulkAction('archive')}>
              Archive
            </Button>
          ) : viewMode === 'archived' ? (
            <Button size="sm" variant="ghost" className="h-7 text-xs text-emerald-300 hover:text-emerald-100 hover:bg-emerald-500/20" onClick={() => handleBulkAction('restore')}>
              Restore
            </Button>
          ) : viewMode === 'trash' ? (
            <>
              <Button size="sm" variant="ghost" className="h-7 text-xs text-emerald-300 hover:text-emerald-100 hover:bg-emerald-500/20" onClick={() => handleBulkAction('restore-trash')}>
                Restore
              </Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs text-red-400 hover:text-red-200 hover:bg-red-500/10" onClick={() => setIsDeleteAlertOpen(true)}>
                Permanently Delete
              </Button>
            </>
          ) : null}

          {viewMode !== 'trash' && (
            <Button size="sm" variant="ghost" className="h-7 text-xs text-red-400 hover:text-red-200 hover:bg-red-500/10" onClick={() => setIsDeleteAlertOpen(true)}>
              <Trash2 className="w-3 h-3 mr-1" /> Move to Trash
            </Button>
          )}
        </div>
      )
      }


      {/* Sidebar Active Filters Bar */}
      {
        recipeSidebarFilterCount > 0 && (
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <span className="text-xs text-muted-foreground">Active filters:</span>
            {recipeSidebarFilters.productType !== 'all' && (
              <Badge variant="secondary" className="text-xs gap-1">
                {recipeSidebarFilters.productType === 'finished' ? 'Finished' : 'Semi-finished'}
                <X className="h-3 w-3 cursor-pointer" onClick={() => updateRecipeSidebarFilter('productType', 'all')} />
              </Badge>
            )}
            {recipeSidebarFilters.cuisine !== 'all' && (
              <Badge variant="secondary" className="text-xs gap-1">
                {recipeSidebarFilters.cuisine}
                <X className="h-3 w-3 cursor-pointer" onClick={() => updateRecipeSidebarFilter('cuisine', 'all')} />
              </Badge>
            )}
            {recipeSidebarFilters.allergens.map(a => (
              <Badge key={a} variant="secondary" className="text-xs gap-1 capitalize">
                {a}
                <X className="h-3 w-3 cursor-pointer" onClick={() => updateRecipeSidebarFilter('allergens', recipeSidebarFilters.allergens.filter(v => v !== a))} />
              </Badge>
            ))}
            {recipeSidebarFilters.difficulty !== 'all' && (
              <Badge variant="secondary" className="text-xs gap-1 capitalize">
                {recipeSidebarFilters.difficulty}
                <X className="h-3 w-3 cursor-pointer" onClick={() => updateRecipeSidebarFilter('difficulty', 'all')} />
              </Badge>
            )}
            {recipeSidebarFilters.seasons.map(s => (
              <Badge key={s} variant="secondary" className="text-xs gap-1 capitalize">
                {s}
                <X className="h-3 w-3 cursor-pointer" onClick={() => updateRecipeSidebarFilter('seasons', recipeSidebarFilters.seasons.filter(v => v !== s))} />
              </Badge>
            ))}
            {recipeSidebarFilters.dishType !== 'all' && (
              <Badge variant="secondary" className="text-xs gap-1 capitalize">
                {recipeSidebarFilters.dishType}
                <X className="h-3 w-3 cursor-pointer" onClick={() => updateRecipeSidebarFilter('dishType', 'all')} />
              </Badge>
            )}
            {recipeSidebarFilters.stage !== 'all' && (
              <Badge variant="secondary" className="text-xs gap-1 capitalize">
                {recipeSidebarFilters.stage}
                <X className="h-3 w-3 cursor-pointer" onClick={() => updateRecipeSidebarFilter('stage', 'all')} />
              </Badge>
            )}
            {recipeSidebarFilters.approved !== 'all' && (
              <Badge variant="secondary" className="text-xs gap-1">
                {recipeSidebarFilters.approved === 'approved' ? 'Approved' : 'Pending'}
                <X className="h-3 w-3 cursor-pointer" onClick={() => updateRecipeSidebarFilter('approved', 'all')} />
              </Badge>
            )}
            <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={clearRecipeSidebarFilters}>Clear all</Button>
          </div>
        )
      }

      {/* â”€â”€ Main Content with Sidebar â”€â”€ */}
      <div className="flex gap-4">

        {/* ── LEFT SIDEBAR FILTER PANEL ── */}
        {recipeSidebarOpen && (
          <div className="w-64 shrink-0">
            <Card className="sticky top-4">
              <CardContent className="p-4 space-y-1 max-h-[calc(100vh-240px)] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-semibold">Filters</span>
                  </div>
                  {recipeSidebarFilterCount > 0 && (
                    <Button variant="ghost" size="sm" className="h-6 text-xs text-muted-foreground hover:text-foreground" onClick={clearRecipeSidebarFilters}>
                      Clear all
                    </Button>
                  )}
                </div>

                {/* Product Type */}
                <RecipeFilterSection title="Product Type">
                  <Select aria-label="Select option" value={recipeSidebarFilters.productType} onValueChange={v => updateRecipeSidebarFilter('productType', v)}>
                    <SelectTrigger aria-label="Select option" className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">📋 All Types</SelectItem>
                      <SelectItem value="finished">✅ Finished Product</SelectItem>
                      <SelectItem value="semi_finished">🔧 Semi-Finished</SelectItem>
                    </SelectContent>
                  </Select>
                </RecipeFilterSection>

                {/* Cuisine */}
                <RecipeFilterSection title="Cuisine">
                  <Select aria-label="Select option" value={recipeSidebarFilters.cuisine} onValueChange={v => updateRecipeSidebarFilter('cuisine', v)}>
                    <SelectTrigger aria-label="Select option" className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">🌍 All Cuisines</SelectItem>
                      {CUISINE_OPTIONS.map(c => <SelectItem key={c} value={c}>🍽️ {c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </RecipeFilterSection>

                {/* Allergens */}
                <RecipeFilterSection title="Allergens" defaultOpen={false}>
                  <RecipeCheckboxFilter
                    options={EU_ALLERGENS.map(a => {
                      const allergenEmojis = { gluten: '🌾', crustaceans: '🦐', eggs: '🥚', fish: '🐟', peanuts: '🥜', soybeans: '🫘', milk: '🥛', nuts: '🌰', celery: '🥬', mustard: '🟡', sesame: '🫙', sulphites: '🍷', lupin: '🌸', molluscs: '🐚' };
                      return { value: a, label: (allergenEmojis[a] || '⚠️') + ' ' + a.charAt(0).toUpperCase() + a.slice(1) };
                    })}
                    selected={recipeSidebarFilters.allergens}
                    onChange={(v) => updateRecipeSidebarFilter('allergens', v)}
                    maxVisible={8}
                  />
                </RecipeFilterSection>

                {/* Dish Type */}
                <RecipeFilterSection title="Dish Type">
                  <Select aria-label="Select option" value={recipeSidebarFilters.dishType} onValueChange={v => updateRecipeSidebarFilter('dishType', v)}>
                    <SelectTrigger aria-label="Select option" className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">🍽️ All Types</SelectItem>
                      <SelectItem value="starter">🥗 Starter</SelectItem>
                      <SelectItem value="main">🍖 Main</SelectItem>
                      <SelectItem value="side">🥦 Side</SelectItem>
                      <SelectItem value="dessert">🍰 Dessert</SelectItem>
                      <SelectItem value="appetizer">🧀 Appetizer</SelectItem>
                      <SelectItem value="drink">🍹 Drink</SelectItem>
                    </SelectContent>
                  </Select>
                </RecipeFilterSection>

                {/* Difficulty */}
                <RecipeFilterSection title="Difficulty">
                  <Select aria-label="Select option" value={recipeSidebarFilters.difficulty} onValueChange={v => updateRecipeSidebarFilter('difficulty', v)}>
                    <SelectTrigger aria-label="Select option" className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">📊 All</SelectItem>
                      <SelectItem value="easy">🟢 Easy</SelectItem>
                      <SelectItem value="medium">🟡 Medium</SelectItem>
                      <SelectItem value="hard">🔴 Hard</SelectItem>
                    </SelectContent>
                  </Select>
                </RecipeFilterSection>

                {/* Seasons */}
                <RecipeFilterSection title="Seasons" defaultOpen={false}>
                  <RecipeCheckboxFilter
                    options={[
                      { value: 'spring', label: '🌱 Spring' },
                      { value: 'summer', label: '☀️ Summer' },
                      { value: 'autumn', label: '🍂 Autumn' },
                      { value: 'winter', label: '❄️ Winter' }
                    ]}
                    selected={recipeSidebarFilters.seasons}
                    onChange={(v) => updateRecipeSidebarFilter('seasons', v)}
                  />
                </RecipeFilterSection>

                {/* Stage */}
                <RecipeFilterSection title="Stage">
                  <Select aria-label="Select option" value={recipeSidebarFilters.stage} onValueChange={v => updateRecipeSidebarFilter('stage', v)}>
                    <SelectTrigger aria-label="Select option" className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">📋 All Stages</SelectItem>
                      <SelectItem value="development">🛠️ Development</SelectItem>
                      <SelectItem value="testing">🧪 Testing</SelectItem>
                      <SelectItem value="production">✅ Production</SelectItem>
                    </SelectContent>
                  </Select>
                </RecipeFilterSection>

                {/* Approved */}
                <RecipeFilterSection title="Approved Status">
                  <Select aria-label="Select option" value={recipeSidebarFilters.approved} onValueChange={v => updateRecipeSidebarFilter('approved', v)}>
                    <SelectTrigger aria-label="Select option" className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">📋 All</SelectItem>
                      <SelectItem value="approved">✅ Approved</SelectItem>
                      <SelectItem value="pending">⏳ Pending</SelectItem>
                    </SelectContent>
                  </Select>
                </RecipeFilterSection>
              </CardContent>
            </Card>
          </div>
        )}

        {/* â”€â”€ Main Content Area â”€â”€ */}
        <div className="flex-1 min-w-0">

          {displayMode === 'grid' ? (
            /* â•â•â• GRID VIEW (Apicbase card layout) â•â•â• */
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {sidebarFilteredRecipes.filter(r => {
                if (searchQuery && !r.recipe_name?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
                return true;
              }).map(recipe => (
                <Card
                  key={recipe._id || recipe.id}
                  className="bg-background border-border hover:border-emerald-500/50 hover:shadow-lg hover:shadow-emerald-500/5 transition-all cursor-pointer group overflow-hidden"
                  onClick={() => navigate(`/manager/inventory-recipes/${recipe._id || recipe.id}`)}
                >
                  <div className="aspect-[4/3] bg-card relative overflow-hidden">
                    {recipe.images?.[0] ? (
                      <img src={recipe.images[0]} alt={recipe.recipe_name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ChefHat className="w-12 h-12 text-zinc-700" />
                      </div>
                    )}
                    {recipe.raw_import_data?.Category && (
                      <Badge className="absolute top-2 left-2 bg-card/90 text-xs">
                        {recipe.raw_import_data.Category}
                      </Badge>
                    )}
                  </div>
                  <CardContent className="p-3">
                    <h3 className="font-bold text-sm text-foreground truncate group-hover:text-emerald-400 transition-colors">
                      {recipe.recipe_name}
                    </h3>
                    <div className="flex items-center justify-between mt-1.5 text-xs text-muted-foreground">
                      <span className="font-mono text-amber-400">\u20AC{(recipe.total_cost || 0).toFixed(2)}</span>
                      <span>{recipe.yield_qty} {recipe.yield_uom}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {recipes.length === 0 && (
                <div className="col-span-full text-center py-12 text-muted-foreground">{"No "}recipes found.</div>
              )}
            </div>
          ) : (
            <div>
              <PremiumDataTable
                // @ts-ignore
                columns={premiumColumns.filter(c => visibleColumns[c.id] !== false)}
                data={sidebarFilteredRecipes}
                loading={loading}
                title=""
                subtitle=""
                enableGlobalSearch={false}
                enableFilters={false}
                enableExport={false}
                enablePagination={false}
                enableRowSelection={true}
                compactMode={true}
                stripedRows={true}
                getRowId={(row, index) => row._id || row.id || row.item_id || `row-${index}`}
                stickyHeader={true}
                maxHeight="calc(100vh - 340px)"
                onRowClick={(row) => {
                  navigate(`/manager/inventory-recipes/${row._id || row.id}`);
                }}
                emptyState={{
                  title: 'No recipes found',
                  description: 'Import recipes or create a new one to get started.'
                }}
              />
              {/* Pagination Controls */}
              <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-card/50">
                <div className="flex items-center gap-4">
                  <div className="text-sm text-muted-foreground">
                    Showing <span className="text-foreground font-bold">{((page - 1) * limit) + 1}</span> to <span className="text-foreground font-bold">{Math.min(page * limit, totalRecords)}</span> of <span className="text-foreground font-bold">{totalRecords}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground">Rows:</span>
                    {[25, 50, 100].map(n => (
                      <button
                        key={n}
                        onClick={() => setLimit(n)}
                        className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${limit === n
                          ? 'bg-emerald-600/30 text-emerald-400 border border-emerald-500/40'
                          : 'text-muted-foreground hover:text-secondary-foreground hover:bg-secondary'
                          }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1 || loading}
                    className="h-8 border-border hover:bg-secondary text-secondary-foreground"
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                  </Button>
                  <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                    <span className="text-muted-foreground">Page</span>
                    <input aria-label="Input"
                      type="number"
                      min={1}
                      max={totalPages || 1}
                      value={page}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        if (!isNaN(val) && val >= 1 && val <= (totalPages || 1)) {
                          setPage(val);
                        }
                      }}
                      onKeyDown={(e) => {
                        // @ts-ignore
                        if (e.key === 'Enter') e.target.blur();
                      }}
                      className="w-16 h-8 text-center text-sm font-bold bg-secondary border border-border rounded text-foreground focus:border-emerald-500 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <span className="text-muted-foreground">of {totalPages || 1}</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages || loading}
                    className="h-8 border-border hover:bg-secondary text-secondary-foreground"
                  >
                    Next <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            </div>
          )}

        </div> {/* end flex-1 */}
      </div> {/* end flex gap-4 sidebar wrapper */}

      {/* Recipe Editor Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-background border-zinc-900 border-2 text-foreground">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-foreground uppercase tracking-tighter">
              {editingRecipe?.id ? 'Edit Recipe' : 'New Recipe'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-8 p-4">
            {/* Main Fields */}
            <div className="grid grid-cols-2 gap-6 p-6 bg-card/30 rounded-2xl border border-border/50">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-1">Recipe Name</label>
                <input aria-label="Input"
                  className="w-full bg-background border-border rounded-xl px-4 py-3 text-foreground focus:border-orange-500/50 outline-none transition-all placeholder:text-zinc-700"
                  value={editingRecipe?.recipe_name || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    setEditingRecipe(prev => ({
                      ...prev,
                      recipe_name: val,
                      // Sync with raw name
                      raw_import_data: { ...(prev.raw_import_data || {}), Name: val }
                    }));
                  }}
                  placeholder="e.g. Classic Margherita"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-1">Category <span className="text-red-500">*</span></label>
                <select aria-label="Input"
                  className="w-full bg-background border-border rounded-xl px-4 py-3 text-foreground focus:border-orange-500/50 outline-none transition-all appearance-none"
                  value={editingRecipe?.category || ''}
                  onChange={(e) => setEditingRecipe({ ...editingRecipe, category: e.target.value })}
                >
                  <option value="">Select Category</option>
                  <option value="Pizza">Pizza</option>
                  <option value="Pasta">Pasta</option>
                  <option value="Main">Main</option>
                  <option value="Drink">Drink</option>
                </select>
              </div>
            </div>

            {/* Dynamic Categorized Fields (Hierarchical) - Shows ALL columns from raw_import_data */}
            {editingRecipe?.raw_import_data && Object.keys(editingRecipe.raw_import_data).length > 0 && (
              <div className="space-y-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-px flex-1 bg-secondary" />
                  <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Detailed Engineering</span>
                  <div className="h-px flex-1 bg-secondary" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {(() => {
                    // Group ALL keys from raw_import_data by their category prefix
                    const groupedFields = {};
                    const rawData = editingRecipe?.raw_import_data || {};

                    Object.keys(rawData).forEach(key => {
                      // Skip internal keys that start with Name or are the normalized ones
                      if (key === 'Name' || key === 'Sku' || key === 'Unit' || key === 'Cost' || key === 'Sales_price' || key === 'Ingredients') return;

                      const parts = key.split(': ');
                      const cat = parts.length > 1 ? parts[0].trim() : 'Other';
                      const label = parts.length > 1 ? parts.slice(1).join(': ').trim() : key;

                      if (!groupedFields[cat]) groupedFields[cat] = [];
                      groupedFields[cat].push({ key, label });
                    });

                    // Define category order for better UX
                    const categoryOrder = ['Internal', 'General Information', 'Portioning', 'Financial', 'Production', 'Allergens & Dietary', 'Custom fields', 'Other'];
                    const sortedCategories = Object.keys(groupedFields).sort((a, b) => {
                      const aIdx = categoryOrder.findIndex(c => a.toLowerCase().includes(c.toLowerCase()));
                      const bIdx = categoryOrder.findIndex(c => b.toLowerCase().includes(c.toLowerCase()));
                      return (aIdx === -1 ? 999 : aIdx) - (bIdx === -1 ? 999 : bIdx);
                    });

                    return sortedCategories.map(category => (
                      <div key={category} className="space-y-3 p-4 bg-card/30 border border-border/40 rounded-xl">
                        <div className="flex items-center gap-2 text-muted-foreground mb-3 pb-2 border-b border-border/50">
                          <Plus className="w-3 h-3 text-orange-500" />
                          <h4 className="text-[10px] font-black uppercase tracking-widest">{category}</h4>
                          <span className="text-[9px] text-muted-foreground ml-auto">{groupedFields[category].length} fields</span>
                        </div>
                        <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                          {groupedFields[category].map(field => {
                            const value = rawData[field.key];
                            // Skip empty/null values for cleaner UI
                            const displayValue = value !== null && value !== undefined && value !== '' ? String(value) : '';

                            return (
                              <div key={field.key} className="space-y-1">
                                <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-tight pl-1 block">{field.label}</label>
                                <input aria-label="Input"
                                  className="w-full bg-background/60 border border-border/60 rounded-lg px-3 py-2 text-sm text-secondary-foreground focus:border-orange-500/50 outline-none transition-all placeholder:text-zinc-700 font-mono"
                                  value={displayValue}
                                  onChange={(e) => {
                                    const newRaw = { ...(editingRecipe?.raw_import_data || {}), [field.key]: e.target.value };
                                    setEditingRecipe({ ...editingRecipe, raw_import_data: newRaw });
                                  }}
                                  placeholder={`Enter ${field.label}...`}
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            )}

            {/* Gap 8: PLU â†” Recipe Mapping Section */}
            <div className="space-y-3 p-4 bg-card/30 border border-border/40 rounded-xl">
              <div className="flex items-center gap-2 text-muted-foreground mb-3 pb-2 border-b border-border/50">
                <Barcode className="w-3 h-3 text-cyan-500" />
                <h4 className="text-[10px] font-black uppercase tracking-widest">PLU â†” POS Mapping</h4>
                <span className="text-[9px] text-muted-foreground ml-auto">{pluMappings.length} code(s)</span>
              </div>
              <p className="text-[10px] text-muted-foreground mb-2">Link POS PLU codes to this recipe for automatic stock deduction. Each outlet can have a different PLU.</p>
              {pluMappings.map((plu, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-4">
                    <input aria-label="Input"
                      className="w-full bg-background/60 border border-border/60 rounded-lg px-3 py-2 text-sm text-cyan-300 focus:border-cyan-500/50 outline-none font-mono"
                      value={plu.code}
                      onChange={e => { const m = [...pluMappings]; m[idx].code = e.target.value; setPluMappings(m); }}
                      placeholder="PLU code"
                    />
                  </div>
                  <div className="col-span-4">
                    <select aria-label="Input"
                      className="w-full bg-background/60 border border-border/60 rounded-lg px-3 py-2 text-sm text-secondary-foreground outline-none appearance-none"
                      value={plu.outlet || 'all'}
                      onChange={e => { const m = [...pluMappings]; m[idx].outlet = e.target.value; setPluMappings(m); }}
                    >
                      <option value="all">All Outlets</option>
                      <option value="dine_in">Dine-In</option>
                      <option value="takeaway">Takeaway</option>
                      <option value="delivery">Delivery</option>
                      <option value="kiosk">Kiosk</option>
                    </select>
                  </div>
                  <div className="col-span-3">
                    <input aria-label="Input"
                      className="w-full bg-background/60 border border-border/60 rounded-lg px-3 py-2 text-sm text-secondary-foreground outline-none"
                      value={plu.pos_name || ''}
                      onChange={e => { const m = [...pluMappings]; m[idx].pos_name = e.target.value; setPluMappings(m); }}
                      placeholder="POS display name"
                    />
                  </div>
                  <div className="col-span-1 flex justify-center">
                    <button className="text-red-400 hover:text-red-300 p-1" onClick={() => setPluMappings(pluMappings.filter((_, i) => i !== idx))}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
              <Button variant="outline" size="sm" className="w-full border-dashed border-border text-muted-foreground hover:text-cyan-400 hover:border-cyan-500/30" onClick={() => setPluMappings([...pluMappings, { code: '', outlet: 'all', pos_name: '' }])}>
                <Plus className="w-3 h-3 mr-1" /> Add PLU Code
              </Button>
            </div>

            {/* Gap 16: Stockable Recipe Section */}
            <div className="space-y-3 p-4 bg-card/30 border border-border/40 rounded-xl">
              <div className="flex items-center gap-2 text-muted-foreground mb-3 pb-2 border-b border-border/50">
                <Warehouse className="w-3 h-3 text-emerald-500" />
                <h4 className="text-[10px] font-black uppercase tracking-widest">Stockable Recipe</h4>
                <label className="ml-auto flex items-center gap-2 cursor-pointer">
                  <span className="text-[9px] text-muted-foreground">{stockableEnabled ? 'Active' : 'Off'}</span>
                  <input type="checkbox" checked={stockableEnabled} onChange={(e) => setStockableEnabled(e.target.checked)}
                    className="accent-emerald-500 w-4 h-4" />
                </label>
              </div>
              {stockableEnabled && (
                <div className="space-y-3">
                  <p className="text-[10px] text-muted-foreground">This recipe will be tracked as an inventory item. When produced, ingredients are deducted; when sold, the recipe quantity depletes.</p>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[9px] font-bold text-muted-foreground uppercase block mb-1">Inventory Unit</label>
                      <select aria-label="Input" className="w-full bg-background/60 border border-border/60 rounded-lg px-2 py-2 text-sm text-secondary-foreground focus:border-emerald-500/50 outline-none"
                        value={stockableFields.unit} onChange={(e) => setStockableFields({ ...stockableFields, unit: e.target.value })}>
                        <option value="portion">Portion</option>
                        <option value="batch">Batch</option>
                        <option value="liter">Litre</option>
                        <option value="kg">Kilogram</option>
                        <option value="unit">Unit</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-muted-foreground uppercase block mb-1">Shelf Life (days)</label>
                      <input aria-label="Input" type="number" className="w-full bg-background/60 border border-border/60 rounded-lg px-2 py-2 text-sm text-secondary-foreground focus:border-emerald-500/50 outline-none"
                        value={stockableFields.shelf_life_days} onChange={(e) => setStockableFields({ ...stockableFields, shelf_life_days: parseInt(e.target.value) || 0 })} />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-muted-foreground uppercase block mb-1">Storage</label>
                      <select aria-label="Input" className="w-full bg-background/60 border border-border/60 rounded-lg px-2 py-2 text-sm text-secondary-foreground focus:border-emerald-500/50 outline-none"
                        value={stockableFields.storage} onChange={(e) => setStockableFields({ ...stockableFields, storage: e.target.value })}>
                        <option value="ambient">â˜€ï¸ Ambient</option>
                        <option value="refrigerated">â„ï¸ Refrigerated</option>
                        <option value="frozen">ğŸ§Š Frozen</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Version History Section */}
            {editingRecipe?.change_history && editingRecipe.change_history.length > 0 && (
              <div className="space-y-3 p-4 bg-card/20 border border-border/30 rounded-xl">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <RefreshCw className="w-3 h-3 text-blue-500" />
                  <h4 className="text-[10px] font-black uppercase tracking-widest">Version History</h4>
                  <span className="text-[9px] text-muted-foreground ml-auto">v{editingRecipe?.version || 1}</span>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {editingRecipe.change_history.slice(0, 10).map((change, idx) => (
                    <div key={change.id || idx} className="flex items-start gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors group">
                      <div className="flex flex-col items-center">
                        <div className={`w-2 h-2 rounded-full mt-1.5 ${change.change_type === 'imported' ? 'bg-green-500' :
                          change.change_type === 'updated' ? 'bg-amber-500' :
                            change.change_type === 'deleted' ? 'bg-red-500' :
                              change.change_type === 'restored' || change.change_type === 'restored_from_trash' ? 'bg-emerald-500' :
                                'bg-zinc-500'
                          }`} />
                        {idx < editingRecipe.change_history.slice(0, 10).length - 1 && (
                          <div className="w-px h-full bg-zinc-700/50 mt-1" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${change.change_type === 'imported' ? 'bg-green-950/50 text-green-400' :
                            change.change_type === 'updated' ? 'bg-amber-950/50 text-amber-400' :
                              change.change_type === 'deleted' ? 'bg-red-950/50 text-red-400' :
                                change.change_type?.includes('restored') ? 'bg-emerald-950/50 text-emerald-400' :
                                  'bg-secondary text-muted-foreground'
                            }`}>
                            {change.change_type?.replace(/_/g, ' ') || 'change'}
                          </span>
                          <span className="text-[9px] text-muted-foreground">
                            {change.timestamp ? new Date(change.timestamp).toLocaleDateString() : '-'}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">{change.change_summary || change.change_method}</p>
                        <p className="text-[9px] text-muted-foreground mt-0.5">by {change.user_name || 'System'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-6">
              <Button variant="ghost" onClick={() => setIsModalOpen(false)} className="text-muted-foreground">Cancel</Button>
              <Button
                className="bg-orange-500 hover:bg-orange-600 text-orange-950 font-black uppercase tracking-tighter px-8"
                onClick={handleSave}
              >
                Save Recipe
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Gap 17: AI Recipe Import Dialog */}
      <Dialog open={showAiImport} onOpenChange={setShowAiImport}>
        <DialogContent className="max-w-lg bg-background border-border text-foreground">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <Sparkles className="h-5 w-5 text-purple-400" />
              AI Recipe Import
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-xs text-muted-foreground">
              Paste a URL, upload a photo of a recipe card, or a PDF {"\u2014"} our AI will extract ingredients, portions, and method.
            </p>

            {/* Mode Tabs */}
            <div className="flex gap-1 bg-card rounded-lg p-0.5">
              {[
                { key: 'url', label: 'URL', icon: 'ğŸ”—' },
                { key: 'photo', label: 'Photo', icon: 'ğŸ“¸' },
                { key: 'pdf', label: 'PDF', icon: 'ğŸ“„' },
              ].map(m => (
                <button key={m.key}
                  onClick={() => setAiImportMode(m.key)}
                  className={`flex-1 py-2 px-3 rounded-md text-xs font-medium transition ${aiImportMode === m.key ? 'bg-purple-600 text-foreground' : 'text-muted-foreground hover:text-secondary-foreground'
                    }`}>
                  {m.icon} {m.label}
                </button>
              ))}
            </div>

            {/* Input Area */}
            {aiImportMode === 'url' && (
              <div className="space-y-2">
                <Input aria-label="https://www.allrecipes.com/recipe/..."
                  placeholder="https://www.allrecipes.com/recipe/..."
                  value={aiImportInput}
                  onChange={(e) => setAiImportInput(e.target.value)}
                  className="bg-card border-border text-foreground"
                />
              </div>
            )}
            {(aiImportMode === 'photo' || aiImportMode === 'pdf') && (
              <div className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-purple-500/50 transition cursor-pointer"
                onClick={() => document.getElementById('ai-import-file')?.click()}>
                <FileUp className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">
                  {aiImportMode === 'photo' ? 'Drop a photo of a recipe card here' : 'Drop a PDF menu or recipe book'}
                </p>
                <input aria-label="Ai Import File" id="ai-import-file" type="file" className="hidden"
                  accept={aiImportMode === 'photo' ? 'image/*' : '.pdf'}
                  onChange={(e) => setAiImportInput(e.target.files?.[0]?.name || '')} />
                {aiImportInput && (
                  <Badge variant="outline" className="mt-2 text-purple-400 border-purple-500/30">
                    {aiImportInput}
                  </Badge>
                )}
              </div>
            )}

            <Button
              className="w-full bg-purple-600 hover:bg-purple-700 text-foreground"
              disabled={!aiImportInput || aiImportLoading}
              onClick={() => {
                setAiImportLoading(true);
                setTimeout(() => {
                  setAiImportLoading(false);
                  setShowAiImport(false);
                  setAiImportInput('');
                  toast?.success?.('Recipe extracted! Review and save.');
                }, 2000);
              }}>
              {aiImportLoading ? (
                <><span className="animate-spin mr-2">âš™ï¸</span> Extracting...</>
              ) : (
                <><Sparkles className="h-4 w-4 mr-2" /> Extract Recipe</>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Gap 21: Media Library Drawer */}
      <Dialog open={showMediaLibrary} onOpenChange={setShowMediaLibrary}>
        <DialogContent className="max-w-2xl bg-background border-border text-foreground">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <Camera className="h-5 w-5 text-blue-400" />
              Media Library
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-xs text-muted-foreground">
              Centralized photo and video library for recipes, plating guides, and training materials.
            </p>

            {/* Upload Zone */}
            <div className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:border-blue-500/50 transition cursor-pointer"
              onClick={() => document.getElementById('media-upload-input')?.click()}>
              <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">Drag & drop or click to upload photos/videos</p>
              <input aria-label="Media Upload Input" id="media-upload-input" type="file" className="hidden" multiple accept="image/*,video/*" />
            </div>

            {/* Demo Media Grid */}
            <div className="grid grid-cols-4 gap-2">
              {['ğŸ• Pizza Margherita', 'ğŸ¥— Caesar Salad', 'ğŸ° Tiramisu', 'ğŸ Carbonara',
                'ğŸ¥© Wagyu Steak', 'ğŸ£ Salmon Sashimi', 'ğŸ² Ramen Bowl', 'ğŸ§ Cupcake'].map((item, i) => (
                  <div key={i} className="bg-card rounded-lg p-3 text-center border border-border hover:border-blue-500/30 cursor-pointer transition">
                    <div className="text-2xl mb-1">{item.split(' ')[0]}</div>
                    <p className="text-[10px] text-muted-foreground truncate">{item.split(' ').slice(1).join(' ')}</p>
                  </div>
                ))}
            </div>

            <div className="flex justify-between text-[10px] text-muted-foreground pt-2 border-t border-border">
              <span>8 assets Â· 24.3 MB used</span>
              <span>Storage: 24.3 / 500 MB</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent className="bg-background border-border text-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              This action cannot be undone. This will permanently delete {selectedIds.size} selected recipes from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-card text-foreground hover:bg-secondary border-border">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleBulkAction(viewMode === 'trash' ? 'purge' : 'delete')} className="bg-red-600 hover:bg-red-700 text-foreground border-0">
              {viewMode === 'trash' ? 'ğŸ’€ Permanently Delete' : 'Continue'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageContainer >
  );
}
