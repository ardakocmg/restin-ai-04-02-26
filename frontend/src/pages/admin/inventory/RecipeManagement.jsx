import React, { useState, useEffect, useMemo } from 'react';
import { useVenue } from '../../../context/VenueContext';
import api from '../../../lib/api';
import PageContainer from '../../../layouts/PageContainer';
import { Card, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Badge } from '../../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../../components/ui/dialog';
import { Label } from '../../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { Search, Plus, Trash2, Save, FileText, ChefHat, RefreshCw, AlertCircle, Columns, Filter, UploadCloud, LayoutGrid, Table } from 'lucide-react';
import DataTable from '../../../components/shared/DataTable';
import PremiumDataTable from '../../../components/shared/PremiumDataTable';
import { toast } from 'sonner';
import { Checkbox } from '../../../components/ui/checkbox';
import { useNavigate } from 'react-router-dom';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from '../../../components/ui/dropdown-menu';
import { MoreHorizontal, Archive, Undo2, ChevronLeft, ChevronRight } from 'lucide-react';
import { logger } from '@/lib/logger';

import { Tabs, TabsList, TabsTrigger } from '../../../components/ui/tabs'; // Add Tabs
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../../../components/ui/alert-dialog';

// Simple Popover-like Dropdown for Column Selection if Shadcn Popover is missing
const ColumnSelector = ({ allColumns, visibleColumns, onToggle }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <Button variant="outline" size="sm" onClick={() => setIsOpen(!isOpen)}>
        <Columns className="w-4 h-4 mr-2" />
        Columns
      </Button>
      {isOpen && (
        <div className="absolute right-0 top-10 z-50 w-56 bg-zinc-950 border border-white/10 rounded-md shadow-xl p-2 max-h-60 overflow-y-auto">
          <div className="text-xs font-bold text-zinc-500 mb-2 px-2">TOGGLE COLUMNS</div>
          {allColumns.map(col => (
            <div key={col} className="flex items-center gap-2 p-2 hover:bg-white/5 rounded cursor-pointer" onClick={() => onToggle(col)}>
              <input
                type="checkbox"
                checked={visibleColumns.includes(col)}
                readOnly
                className="rounded border-zinc-700 bg-zinc-900"
              />
              <span className="text-sm truncate capitalize">{col.replace(/_/g, ' ')}</span>
            </div>
          ))}
          {allColumns.length === 0 && <div className="text-xs text-zinc-500 px-2">No extra columns found</div>}
          <div className="mt-2 pt-2 border-t border-white/10">
            <Button size="sm" variant="ghost" className="w-full text-xs h-7" onClick={() => setIsOpen(false)}>Close</Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default function RecipeManagement() {
  const { activeVenue } = useVenue();
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
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedSubcategory, setSelectedSubcategory] = useState('All');
  const [availableCategories, setAvailableCategories] = useState([]);
  const [availableSubcategories, setAvailableSubcategories] = useState([]);

  // Dynamic Columns State
  const [importKeys, setImportKeys] = useState([]);
  const [visibleImportKeys, setVisibleImportKeys] = useState([]);
  const [collapsedGroups, setCollapsedGroups] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [quickFilter, setQuickFilter] = useState('all');
  const [tableStyle, setTableStyle] = useState('classic'); // 'classic' | 'premium'

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

  const toggleGroup = (groupId) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };

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
            category: selectedCategory !== 'All' ? selectedCategory : undefined,
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
        servings: 1
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
  const getName = (id, list) => list.find(x => x.id === id)?.name || id;

  const toggleColumn = (key) => {
    setVisibleImportKeys(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  // Generate Table Columns dynamically with Hierarchy
  const tableColumns = useMemo(() => {
    const isMainCollapsed = collapsedGroups.has('main_fields');
    const isImportCollapsed = collapsedGroups.has('imported_data');

    // Grouping logic for import columns
    const groupedImportCols = {};
    visibleImportKeys.forEach(key => {
      const parts = key.split(': ');
      const cat = parts.length > 1 ? parts[0].trim() : 'General Information';
      const label = parts.length > 1 ? parts.slice(1).join(': ').trim() : key;

      if (!groupedImportCols[cat]) groupedImportCols[cat] = [];
      groupedImportCols[cat].push({ key, label });
    });

    const mainGroup = {
      id: 'main_group',
      label: (
        <div className="flex items-center gap-2 cursor-pointer group" onClick={() => toggleGroup('main_fields')}>
          <span className="text-orange-500 font-bold uppercase tracking-tighter text-[10px]">KEY INGREDIENTS</span>
          {isMainCollapsed ? <Plus className="w-3 h-3 text-zinc-500 group-hover:text-white" /> : <Trash2 className="w-3 h-3 text-zinc-500 group-hover:text-white rotate-45" />}
        </div>
      ),
      columns: isMainCollapsed ? [] : [
        {
          key: 'recipe_select',
          label: (
            <Checkbox
              checked={recipes.length > 0 && selectedIds.size === recipes.length}
              onCheckedChange={(checked) => {
                if (checked) setSelectedIds(new Set(recipes.map(r => r.id)));
                else setSelectedIds(new Set());
              }}
              className="border-zinc-700 data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500"
            />
          ),
          size: 40,
          render: (row) => (
            <Checkbox
              checked={selectedIds.has(row.id)}
              onCheckedChange={(checked) => {
                const next = new Set(selectedIds);
                if (checked) next.add(row.id);
                else next.delete(row.id);
                setSelectedIds(next);
              }}
              className="border-zinc-700 data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500"
            />
          )
        },
        {
          key: 'item_id',
          label: 'Item ID',
          render: (row) => (
            <div className="font-mono text-xs text-emerald-400 bg-emerald-950/50 px-2 py-1 rounded font-bold">
              {row.raw_import_data?.['Item ID'] || row.raw_import_data?.['Sku'] || row.item_id || '-'}
            </div>
          )
        },
        {
          key: 'recipe_name',
          label: 'Recipe Name',
          render: (row) => <div className="font-bold text-white">{row.recipe_name}</div>
        },
        {
          key: 'category',
          label: 'Category',
          render: (row) => <Badge variant="outline">{row.category || 'Standard'}</Badge>
        },
        {
          key: 'subcategory',
          label: 'Subcategory',
          render: (row) => {
            const sub = Object.entries(row.raw_import_data || {}).find(([k, v]) => k.toLowerCase().includes('subcategory'))?.[1];
            return <Badge variant="secondary" className="bg-zinc-800 text-zinc-400">{sub || '-'}</Badge>
          }
        },
        {
          key: 'status',
          label: 'Status',
          render: (row) => (
            <Badge className={row.active ? "bg-emerald-500 text-emerald-950 hover:bg-emerald-400 font-bold border-0" : "bg-zinc-700 text-zinc-300 hover:bg-zinc-600"}>
              {row.active ? 'ACTIVE' : 'ARCHIVED'}
            </Badge>
          )
        },
        {
          key: 'components',
          label: 'Ingredients',
          render: (row) => <Badge variant="secondary">{row.ingredients?.length || row.components?.length || 0} items</Badge>
        }
      ]
    };

    const dynamicImportGroups = isImportCollapsed ? [] : Object.entries(groupedImportCols).map(([cat, fields]) => ({
      id: `group_${cat}`,
      label: <span className="text-zinc-100 font-black uppercase text-[10px] tracking-widest">{cat}</span>,
      columns: fields.map(f => ({
        key: `raw_${f.key}`,
        label: f.label,
        render: (row) => (
          <span className="text-zinc-400 text-xs font-medium">
            {row.raw_import_data?.[f.key]?.toString() || '-'}
          </span>
        )
      }))
    }));

    const actionCol = {
      id: 'ops_group',
      label: <span className="text-zinc-500 font-bold text-[10px] uppercase">Actions</span>,
      columns: [
        {
          key: 'actions',
          label: '',
          size: 50,
          render: (row) => (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <span className="sr-only">Open menu</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-zinc-950 border-zinc-800 text-white">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => { setEditingRecipe(row); setIsModalOpen(true); }} className="hover:bg-zinc-800 cursor-pointer">
                  <FileText className="mr-2 h-4 w-4 text-blue-400" /> Edit Recipe
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-zinc-800" />
                {viewMode === 'active' ? (
                  <DropdownMenuItem onClick={() => handleAction('archive', row.id)} className="hover:bg-zinc-800 cursor-pointer text-orange-400">
                    <Archive className="mr-2 h-4 w-4" /> Archive
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={() => handleAction('restore', row.id)} className="hover:bg-zinc-800 cursor-pointer text-emerald-400">
                    <Undo2 className="mr-2 h-4 w-4" /> Restore
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => handleAction('delete', row.id)} className="hover:bg-zinc-800 cursor-pointer text-red-500 font-bold">
                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )
        }
      ]
    };

    // Construct final layout: Main Group + All Dynamic Category Groups + Actions
    return [
      mainGroup,
      ...dynamicImportGroups,
      actionCol
    ];
  }, [visibleImportKeys, collapsedGroups, selectedIds, recipes]);

  // Convert columns to TanStack format for PremiumDataTable
  const premiumColumns = useMemo(() => {
    return [
      {
        accessorKey: 'item_id',
        header: 'Item ID',
        size: 120,
        cell: ({ row }) => (
          <div className="font-mono text-xs text-emerald-400 bg-emerald-950/50 px-2 py-1 rounded font-bold">
            {row.original.raw_import_data?.['Item ID'] || row.original.raw_import_data?.['Sku'] || row.original.item_id || '-'}
          </div>
        ),
        filterFn: 'auto'
      },
      {
        accessorKey: 'recipe_name',
        header: 'Recipe Name',
        cell: ({ row }) => <div className="font-bold text-foreground">{row.original.recipe_name}</div>,
        filterFn: 'auto'
      },
      {
        accessorKey: 'category',
        header: 'Category',
        cell: ({ row }) => (
          <span className="text-xs font-semibold text-muted-foreground uppercase">
            {row.original.raw_import_data?.Category || '-'}
          </span>
        ),
        filterFn: 'auto'
      },
      {
        accessorKey: 'subcategory',
        header: 'Subcategory',
        cell: ({ row }) => row.original.raw_import_data?.Subcategory || '-',
        filterFn: 'auto'
      },
      {
        accessorKey: 'yield_qty',
        header: 'Yield',
        cell: ({ row }) => (
          <span className="font-mono text-xs">
            {row.original.yield_qty} {row.original.yield_uom}
          </span>
        )
      },
      {
        accessorKey: 'cost',
        header: 'Cost',
        cell: ({ row }) => (
          <span className="font-mono text-xs text-amber-400">
            €{(row.original.total_cost || 0).toFixed(2)}
          </span>
        )
      }
    ];
  }, []);

  return (
    <PageContainer
      title="Recipe Engineering"
      description="Link menu items to ingredients for automatic stock deduction"
      actions={
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10"
            onClick={async () => {
              try {
                const res = await api.post('migrations/backfill-item-ids');
                toast.success(`✅ ${res.data?.message || 'Item IDs assigned!'}`);
                loadData(); // Refresh
              } catch (e) {
                toast.error('Failed to assign Item IDs');
              }
            }}
          >
            🔧 Fix Item IDs
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="border-orange-500/50 text-orange-400 hover:bg-orange-500/10"
            onClick={() => navigate('/admin/migration')}
          >
            <UploadCloud className="w-4 h-4 mr-2" />
            Apicbase Import
          </Button>
          <ColumnSelector
            allColumns={importKeys}
            visibleColumns={visibleImportKeys}
            onToggle={toggleColumn}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => setTableStyle(s => s === 'classic' ? 'premium' : 'classic')}
            className={tableStyle === 'premium' ? 'border-violet-500/50 text-violet-400 hover:bg-violet-500/10' : ''}
          >
            {tableStyle === 'premium' ? <LayoutGrid className="w-4 h-4 mr-2" /> : <Table className="w-4 h-4 mr-2" />}
            {tableStyle === 'premium' ? 'Premium' : 'Classic'}
          </Button>
          <Button variant="outline" size="sm" onClick={() => loadData()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button size="sm" onClick={() => {
            setEditingRecipe(null);
            setFormData({ sku_id: '', yield_qty: 1, yield_uom: 'EA', components: [] });
            setIsModalOpen(true);
          }}>
            <Plus className="w-4 h-4 mr-2" />
            New Recipe
          </Button>
        </div>
      }
    >
      {/* Trash Mode Banner */}
      {viewMode === 'trash' && (
        <div className="bg-red-950/50 border border-red-500/30 rounded-xl p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl bg-red-600/20 flex items-center justify-center">
              <Trash2 className="w-8 h-8 text-red-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-red-400">🗑️ Trash Bin</h3>
              <p className="text-zinc-400 text-sm">
                Items here will be permanently deleted after {trashData.retention_days || 30} days.
                <span className="text-zinc-500 ml-2">({totalRecords} items)</span>
              </p>
            </div>
            {selectedIds.size > 0 && (
              <div className="flex gap-2">
                <Badge variant="outline" className="border-red-500/50 text-red-400">
                  {selectedIds.size} selected
                </Badge>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Dashboard Stats - Only show for active/archived */}
      {viewMode !== 'trash' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {/* Total Recipes Card */}
          <Card
            className={`relative overflow-hidden cursor-pointer transition-all duration-300 hover:scale-105 border-l-4 ${quickFilter === 'all' ? 'border-l-emerald-500 ring-2 ring-emerald-500 bg-zinc-900 shadow-[0_0_20px_rgba(16,185,129,0.2)]' : 'border-l-zinc-700 bg-zinc-950 hover:bg-zinc-900 group opacity-70 hover:opacity-100'}`}
            onClick={() => setQuickFilter('all')}
          >
            <div className={`absolute top-0 right-0 p-3 opacity-10 ${quickFilter === 'all' ? 'text-emerald-500' : 'text-white'}`}>
              <ChefHat className="w-16 h-16 transform rotate-12" />
            </div>
            <CardContent className="p-5 flex flex-col justify-between h-full relative z-10">
              <div>
                <div className={`text-xs font-black uppercase tracking-widest mb-1 ${quickFilter === 'all' ? 'text-emerald-400' : 'text-zinc-500 group-hover:text-zinc-300'}`}>
                  Total Recipes
                </div>
                <div className="text-4xl font-black text-white tracking-tighter shadow-black drop-shadow-lg">
                  {stats.total_active}
                </div>
              </div>
              <div className={`text-[10px] font-bold mt-2 ${quickFilter === 'all' ? 'text-emerald-500/80' : 'text-zinc-600'}`}>
                ALL ACTIVE RECIPES
              </div>
            </CardContent>
          </Card>

          {/* Added Today Card */}
          <Card
            className={`relative overflow-hidden cursor-pointer transition-all duration-300 hover:scale-105 border-l-4 ${quickFilter === 'today' ? 'border-l-blue-500 ring-2 ring-blue-500 bg-zinc-900 shadow-[0_0_20px_rgba(59,130,246,0.2)]' : 'border-l-zinc-700 bg-zinc-950 hover:bg-zinc-900 group opacity-70 hover:opacity-100'}`}
            onClick={() => setQuickFilter('today')}
          >
            <div className={`absolute top-0 right-0 p-3 opacity-10 ${quickFilter === 'today' ? 'text-blue-500' : 'text-white'}`}>
              <RefreshCw className="w-16 h-16 transform -rotate-12" />
            </div>
            <CardContent className="p-5 flex flex-col justify-between h-full relative z-10">
              <div>
                <div className={`text-xs font-black uppercase tracking-widest mb-1 ${quickFilter === 'today' ? 'text-blue-400' : 'text-zinc-500 group-hover:text-zinc-300'}`}>
                  Fresh Uploads
                </div>
                <div className="text-4xl font-black text-white tracking-tighter shadow-black drop-shadow-lg">
                  {stats.added_today}
                </div>
              </div>
              <div className={`text-[10px] font-bold mt-2 ${quickFilter === 'today' ? 'text-blue-500/80' : 'text-zinc-600'}`}>
                ADDED TODAY
              </div>
            </CardContent>
          </Card>

          {/* Categories Card */}
          <Card
            className={`relative overflow-hidden cursor-pointer transition-all duration-300 hover:scale-105 border-l-4 ${quickFilter === 'categories' ? 'border-l-purple-500 ring-2 ring-purple-500 bg-zinc-900 shadow-[0_0_20px_rgba(168,85,247,0.2)]' : 'border-l-zinc-700 bg-zinc-950 hover:bg-zinc-900 group opacity-70 hover:opacity-100'}`}
            onClick={() => setQuickFilter('categories')} // Could just filter to show distribution or nothing unique yet
          >
            <div className={`absolute top-0 right-0 p-3 opacity-10 ${quickFilter === 'categories' ? 'text-purple-500' : 'text-white'}`}>
              <Filter className="w-16 h-16 transform rotate-6" />
            </div>
            <CardContent className="p-5 flex flex-col justify-between h-full relative z-10">
              <div>
                <div className={`text-xs font-black uppercase tracking-widest mb-1 ${quickFilter === 'categories' ? 'text-purple-400' : 'text-zinc-500 group-hover:text-zinc-300'}`}>
                  Unique Categories
                </div>
                <div className="text-4xl font-black text-white tracking-tighter shadow-black drop-shadow-lg">
                  {stats.categories}
                </div>
              </div>
              <div className={`text-[10px] font-bold mt-2 ${quickFilter === 'categories' ? 'text-purple-500/80' : 'text-zinc-600'}`}>
                MENU DIVERSITY
              </div>
            </CardContent>
          </Card>

          {/* Data Quality / Missing IDs Card */}
          <Card
            className={`relative overflow-hidden cursor-pointer transition-all duration-300 hover:scale-105 border-l-4 ${quickFilter === 'missing_id' ? 'border-l-amber-500 ring-1 ring-amber-500/50 bg-zinc-900' : 'border-l-zinc-700 bg-zinc-950 hover:bg-zinc-900 group'}`}
            onClick={() => setQuickFilter('missing_id')}
          >
            <div className={`absolute top-0 right-0 p-3 opacity-10 ${quickFilter === 'missing_id' ? 'text-amber-500' : 'text-white'}`}>
              <AlertCircle className="w-16 h-16 transform -rotate-6" />
            </div>
            <CardContent className="p-5 flex flex-col justify-between h-full relative z-10">
              <div>
                <div className={`text-xs font-black uppercase tracking-widest mb-1 ${quickFilter === 'missing_id' ? 'text-amber-400' : 'text-zinc-500 group-hover:text-zinc-300'}`}>
                  Missing IDs
                </div>
                <div className="text-4xl font-black text-white tracking-tighter shadow-black drop-shadow-lg">
                  {stats.missing_ids}
                </div>
              </div>
              <div className={`text-[10px] font-bold mt-2 ${quickFilter === 'missing_id' ? 'text-amber-500/80' : 'text-zinc-600'}`}>
                NEEDS ATTENTION
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Stats & Controls */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div className="flex-1 space-y-4">
          {/* Tabs for Active / Archive / Trash */}
          <Tabs value={viewMode} onValueChange={setViewMode} className="w-full md:w-auto">
            <TabsList className="bg-zinc-900/80 border border-zinc-700 p-1 gap-1">
              <TabsTrigger
                value="active"
                className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:ring-2 data-[state=active]:ring-emerald-400/50 text-zinc-400 hover:text-white transition-all px-4"
              >
                ✅ Active ({stats.total_active || 0})
              </TabsTrigger>
              <TabsTrigger
                value="archived"
                className="data-[state=active]:bg-amber-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:ring-2 data-[state=active]:ring-amber-400/50 text-zinc-500 hover:text-zinc-300 transition-all px-4"
              >
                📦 Archived ({stats.total_archived || 0})
              </TabsTrigger>
              <TabsTrigger
                value="trash"
                className="data-[state=active]:bg-red-600 data-[state=active]:text-white data-[state=active]:shadow-[0_0_15px_rgba(239,68,68,0.4)] data-[state=active]:ring-2 data-[state=active]:ring-red-400/50 text-zinc-600 hover:text-red-400 transition-all px-4"
              >
                🗑️ Trash ({stats.total_trash || 0})
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Search & Filters */}
          <div className="flex flex-col sm:flex-row gap-2 max-w-2xl">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <Input
                placeholder="Search recipes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-zinc-900 border-zinc-800 focus:border-emerald-500 h-10 w-full"
              />
            </div>

            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[140px] bg-zinc-900 border-zinc-800">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-950 border-zinc-800 text-white">
                {availableCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={selectedSubcategory} onValueChange={setSelectedSubcategory}>
              <SelectTrigger className="w-[140px] bg-zinc-900 border-zinc-800">
                <SelectValue placeholder="Subcat" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-950 border-zinc-800 text-white">
                {availableSubcategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2 bg-indigo-950/30 border border-indigo-500/30 px-4 py-2 rounded-lg animate-in fade-in slide-in-from-bottom-2">
            <span className="text-sm font-bold text-indigo-200">{selectedIds.size} selected</span>
            <div className="h-4 w-px bg-white/10 mx-2" />

            {viewMode === 'active' ? (
              <Button size="sm" variant="ghost" className="text-indigo-300 hover:text-indigo-100 hover:bg-indigo-500/20" onClick={() => handleBulkAction('archive')}>
                Archive
              </Button>
            ) : viewMode === 'archived' ? (
              <Button size="sm" variant="ghost" className="text-emerald-300 hover:text-emerald-100 hover:bg-emerald-500/20" onClick={() => handleBulkAction('restore')}>
                Restore
              </Button>
            ) : viewMode === 'trash' ? (
              <>
                <Button size="sm" variant="ghost" className="text-emerald-300 hover:text-emerald-100 hover:bg-emerald-500/20" onClick={() => handleBulkAction('restore-trash')}>
                  ♻️ Restore
                </Button>
                <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-200 hover:bg-red-500/10" onClick={() => setIsDeleteAlertOpen(true)}>
                  💀 Permanently Delete
                </Button>
              </>
            ) : null}

            {viewMode !== 'trash' && (
              <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-200 hover:bg-red-500/10" onClick={() => setIsDeleteAlertOpen(true)}>
                <Trash2 className="w-4 h-4 mr-1" /> Move to Trash
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {/* ... stats cards ... */}
      </div>

      <Card className="bg-zinc-950 border-white/10">
        <CardContent className="p-0">
          {tableStyle === 'classic' ? (
            <DataTable
              columns={tableColumns}
              data={recipes}
              loading={loading}
              emptyMessage="No recipes found."
              enableRowSelection={false}
            />
          ) : (
            <PremiumDataTable
              columns={premiumColumns}
              data={recipes}
              loading={loading}
              title="Recipe Engineering"
              subtitle={`${totalRecords} recipes`}
              enableGlobalSearch={true}
              enableFilters={true}
              enableExport={true}
              enableRowSelection={true}
              stickyHeader={true}
              maxHeight="calc(100vh - 400px)"
              onRowClick={(row) => {
                setEditingRecipe(row);
                setIsModalOpen(true);
              }}
              emptyTitle="No recipes found"
              emptyDescription="Import recipes or create a new one to get started."
            />
          )}
          {/* Pagination Controls */}
          <div className="flex items-center justify-between px-4 py-4 border-t border-white/10 bg-zinc-900/50">
            <div className="text-sm text-zinc-500">
              Showing <span className="text-white font-bold">{((page - 1) * limit) + 1}</span> to <span className="text-white font-bold">{Math.min(page * limit, totalRecords)}</span> of <span className="text-white font-bold">{totalRecords}</span> entries
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1 || loading}
                className="h-8 border-zinc-700 hover:bg-zinc-800 text-zinc-300"
              >
                <ChevronLeft className="h-4 w-4 mr-1" /> Previous
              </Button>
              <div className="text-sm font-medium text-white bg-zinc-800 px-3 py-1 rounded border border-zinc-700">
                Page {page} of {totalPages || 1}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages || loading}
                className="h-8 border-zinc-700 hover:bg-zinc-800 text-zinc-300"
              >
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Editor Modal omitted for brevity, keeping existing structure implies just focus on table */}
      {/* Recipe Editor Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-zinc-950 border-zinc-900 border-2 text-white">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-white uppercase tracking-tighter">
              {editingRecipe?.id ? 'Edit Recipe' : 'New Recipe'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-8 p-4">
            {/* Main Fields */}
            <div className="grid grid-cols-2 gap-6 p-6 bg-zinc-900/30 rounded-2xl border border-zinc-800/50">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest pl-1">Recipe Name</label>
                <input
                  className="w-full bg-zinc-950 border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-orange-500/50 outline-none transition-all placeholder:text-zinc-700"
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
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest pl-1">Category <span className="text-red-500">*</span></label>
                <select
                  className="w-full bg-zinc-950 border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-orange-500/50 outline-none transition-all appearance-none"
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
                  <div className="h-px flex-1 bg-zinc-800" />
                  <span className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em]">Detailed Engineering</span>
                  <div className="h-px flex-1 bg-zinc-800" />
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
                      <div key={category} className="space-y-3 p-4 bg-zinc-900/30 border border-zinc-800/40 rounded-xl">
                        <div className="flex items-center gap-2 text-zinc-400 mb-3 pb-2 border-b border-zinc-800/50">
                          <Plus className="w-3 h-3 text-orange-500" />
                          <h4 className="text-[10px] font-black uppercase tracking-widest">{category}</h4>
                          <span className="text-[9px] text-zinc-600 ml-auto">{groupedFields[category].length} fields</span>
                        </div>
                        <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                          {groupedFields[category].map(field => {
                            const value = rawData[field.key];
                            // Skip empty/null values for cleaner UI
                            const displayValue = value !== null && value !== undefined && value !== '' ? String(value) : '';

                            return (
                              <div key={field.key} className="space-y-1">
                                <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-tight pl-1 block">{field.label}</label>
                                <input
                                  className="w-full bg-zinc-950/60 border border-zinc-800/60 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:border-orange-500/50 outline-none transition-all placeholder:text-zinc-700 font-mono"
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

            {/* Version History Section */}
            {editingRecipe?.change_history && editingRecipe.change_history.length > 0 && (
              <div className="space-y-3 p-4 bg-zinc-900/20 border border-zinc-800/30 rounded-xl">
                <div className="flex items-center gap-2 text-zinc-400 mb-2">
                  <RefreshCw className="w-3 h-3 text-blue-500" />
                  <h4 className="text-[10px] font-black uppercase tracking-widest">Version History</h4>
                  <span className="text-[9px] text-zinc-600 ml-auto">v{editingRecipe?.version || 1}</span>
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
                                  'bg-zinc-800 text-zinc-400'
                            }`}>
                            {change.change_type?.replace(/_/g, ' ') || 'change'}
                          </span>
                          <span className="text-[9px] text-zinc-600">
                            {change.timestamp ? new Date(change.timestamp).toLocaleDateString() : '-'}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-400 mt-0.5 truncate">{change.change_summary || change.change_method}</p>
                        <p className="text-[9px] text-zinc-600 mt-0.5">by {change.user_name || 'System'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-6">
              <Button variant="ghost" onClick={() => setIsModalOpen(false)} className="text-zinc-500">Cancel</Button>
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

      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent className="bg-zinc-950 border-zinc-800 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              This action cannot be undone. This will permanently delete {selectedIds.size} selected recipes from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-zinc-900 text-white hover:bg-zinc-800 border-zinc-700">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleBulkAction(viewMode === 'trash' ? 'purge' : 'delete')} className="bg-red-600 hover:bg-red-700 text-white border-0">
              {viewMode === 'trash' ? '💀 Permanently Delete' : 'Continue'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageContainer>
  );
}