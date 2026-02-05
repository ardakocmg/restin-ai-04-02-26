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
import { Search, Plus, Trash2, Save, FileText, ChefHat, RefreshCw, AlertCircle, Columns, Filter, UploadCloud } from 'lucide-react';
import DataTable from '../../../components/shared/DataTable';
import { toast } from 'sonner';
import { Checkbox } from '../../../components/ui/checkbox';
import { useNavigate } from 'react-router-dom';

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

  // Dynamic Columns State
  const [importKeys, setImportKeys] = useState([]);
  const [visibleImportKeys, setVisibleImportKeys] = useState([]);
  const [collapsedGroups, setCollapsedGroups] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState(''); // Search state

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
      loadData();
    }
  }, [activeVenue?.id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [recipesRes, itemsRes, menuRes] = await Promise.all([
        api.get(`venues/${activeVenue.id}/recipes/engineered`),
        api.get(`venues/${activeVenue.id}/inventory`), // Corrected path to match backend
        api.get(`venues/${activeVenue.id}/menu/items?all=true`) // Corrected path to match backend
      ]);

      const loadedRecipes = recipesRes.data || [];
      setRecipes(loadedRecipes);
      setItems(itemsRes.data || []);
      setMenuItems(menuRes.data || []);

      // Extract all unique keys from raw_import_data
      const keys = new Set();
      const standardKeys = ['id', 'Name', 'sys_id', 'Sku', 'Unit', 'Cost', 'Sales_price', 'Ingredients', 'Recipe', 'recipe_name'];
      loadedRecipes.forEach(r => {
        if (r.raw_import_data) {
          Object.keys(r.raw_import_data).forEach(k => {
            if (!standardKeys.includes(k)) keys.add(k);
          });
        }
      });
      const keysArray = Array.from(keys);
      setImportKeys(keysArray);

      // Default visible keys (first 3 found, just as a sane default)
      if (visibleImportKeys.length === 0) {
        setVisibleImportKeys(keysArray.slice(0, 3));
      }

    } catch (e) {
      console.error(e);
      // toast.error("Failed to load recipe data");
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

  const handleSave = async () => {
    try {
      const isNew = !editingRecipe?.id;
      const venueId = recipes[0]?.venue_id || 'v1'; // Fallback

      const payload = {
        recipe_name: editingRecipe.recipe_name,
        category: editingRecipe.category,
        raw_import_data: editingRecipe.raw_import_data || {},
        ingredients: [], // Placeholder for now, can be expanded to full ingredient selection
        servings: 1
      };

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
      console.error(e);
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
          <span className="text-orange-500 font-bold uppercase tracking-tighter text-[10px]">Ana Maddeler</span>
          {isMainCollapsed ? <Plus className="w-3 h-3 text-zinc-500 group-hover:text-white" /> : <Trash2 className="w-3 h-3 text-zinc-500 group-hover:text-white rotate-45" />}
        </div>
      ),
      columns: isMainCollapsed ? [] : [
        {
          key: 'item_id',
          label: 'Item ID',
          render: (row) => (
            <div className="font-mono text-xs text-emerald-400 bg-emerald-950/50 px-2 py-1 rounded font-bold">
              {row.item_id || row.sku || '-'}
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
            <Button variant="ghost" size="sm" onClick={() => {
              setEditingRecipe(row);
              setIsModalOpen(true);
            }}>
              <FileText className="w-4 h-4 text-blue-400" />
            </Button>
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
  }, [visibleImportKeys, collapsedGroups]);

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
          <Button variant="outline" size="sm" onClick={loadData}>
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
      {/* Dashboard Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="bg-gradient-to-br from-emerald-950/50 to-zinc-950 border-emerald-500/30">
          <CardContent className="p-4">
            <div className="text-3xl font-black text-white">{recipes.length}</div>
            <div className="text-xs text-emerald-400 font-bold uppercase tracking-wider">Total Recipes</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-950/50 to-zinc-950 border-blue-500/30">
          <CardContent className="p-4">
            <div className="text-3xl font-black text-white">
              {recipes.filter(r => {
                if (!r.created_at) return false;
                const created = new Date(r.created_at);
                const today = new Date();
                return created.toDateString() === today.toDateString();
              }).length}
            </div>
            <div className="text-xs text-blue-400 font-bold uppercase tracking-wider">Added Today</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-950/50 to-zinc-950 border-purple-500/30">
          <CardContent className="p-4">
            <div className="text-3xl font-black text-white">
              {new Set(recipes.map(r => r.category || 'Standard')).size}
            </div>
            <div className="text-xs text-purple-400 font-bold uppercase tracking-wider">Categories</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-950/50 to-zinc-950 border-amber-500/30">
          <CardContent className="p-4">
            <div className="text-3xl font-black text-white">
              {recipes.reduce((sum, r) => sum + (r.ingredients?.length || 0), 0)}
            </div>
            <div className="text-xs text-amber-400 font-bold uppercase tracking-wider">Total Components</div>
          </CardContent>
        </Card>
      </div>

      {/* Search Bar */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <Input
            placeholder="Search recipes by name, Item ID, or SKU..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-zinc-900 border-zinc-800 focus:border-emerald-500 h-10"
          />
        </div>
      </div>

      <Card className="bg-zinc-950 border-white/10">
        <CardContent className="p-0">
          <DataTable
            columns={tableColumns}
            data={recipes.filter(r => {
              if (!searchQuery) return true;
              const q = searchQuery.toLowerCase();
              return (
                (r.recipe_name || '').toLowerCase().includes(q) ||
                (r.item_id || '').toLowerCase().includes(q) ||
                (r.sku || '').toLowerCase().includes(q)
              );
            })}
            loading={loading}
            emptyMessage="No recipes defined. Create one to enable inventory tracking."
          />
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
                  className="w-full bg-zinc-950 border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-orange-500/50 outline-none transition-all"
                  value={editingRecipe?.recipe_name || ''}
                  onChange={(e) => setEditingRecipe({ ...editingRecipe, recipe_name: e.target.value })}
                  placeholder="e.g. Classic Margherita"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest pl-1">Category</label>
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

            <div className="flex justify-end gap-3 pt-6">
              <Button variant="ghost" onClick={() => setIsModalOpen(false)} className="text-zinc-500">Cancel</Button>
              <Button
                className="bg-orange-500 hover:bg-orange-600 text-black font-black uppercase tracking-tighter px-8"
                onClick={handleSave}
              >
                Save Recipe
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
