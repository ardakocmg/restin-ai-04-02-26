import React, { useState, useEffect } from 'react';
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
import { Search, Plus, Trash2, Save, FileText, ChefHat, RefreshCw, AlertCircle } from 'lucide-react';
import DataTable from '../../../components/shared/DataTable';
import { toast } from 'sonner';

export default function RecipeManagement() {
  const { activeVenue } = useVenue();
  const [recipes, setRecipes] = useState([]);
  const [items, setItems] = useState([]); // Inventory Items to pick from
  const [menuItems, setMenuItems] = useState([]); // Menu Items to attach recipe to
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState(null);

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
        api.get(`/recipes?venue_id=${activeVenue.id}`),
        api.get(`/inventory/items?venue_id=${activeVenue.id}`),
        api.get(`/menus/${activeVenue.id}/items?all=true`) // Assuming endpoint to get flat list
      ]);
      setRecipes(recipesRes.data || []);
      setItems(itemsRes.data || []);
      setMenuItems(menuRes.data || []);
    } catch (e) {
      // Graceful fallback if endpoints mismatch
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
    if (!formData.sku_id) return toast.error("Please select a target Menu Item");
    if (formData.components.length === 0) return toast.error("Recipe must have ingredients");

    try {
      const payload = {
        venue_id: activeVenue.id,
        sku_id: formData.sku_id,
        display_id: `RCP-${Math.floor(Math.random() * 10000)}`,
        version: 1,
        is_active: true,
        yield_qty: parseFloat(formData.yield_qty),
        yield_uom: formData.yield_uom,
        components: formData.components.map(c => ({
          type: c.type,
          ref_id: c.ref_id,
          qty_base: c.qty_base,
          waste_factor: c.waste_factor || 1.0,
          prep_loss: 0
        })),
        created_by: 'admin' // Should come from context
      };

      if (editingRecipe) {
        await api.put(`/recipes/${editingRecipe.id}`, payload);
        toast.success("Recipe updated");
      } else {
        await api.post('/recipes', payload);
        toast.success("Recipe created");
      }

      setIsModalOpen(false);
      setEditingRecipe(null);
      loadData();
    } catch (e) {
      console.error(e);
      toast.error("Failed to save recipe");
    }
  };

  // Helper to find name from ID
  const getName = (id, list) => list.find(x => x.id === id)?.name || id;

  return (
    <PageContainer
      title="Recipe Engineering"
      description="Link menu items to ingredients for automatic stock deduction"
      actions={
        <div className="flex gap-2">
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
      <Card className="bg-zinc-950 border-white/10">
        <CardContent className="p-0">
          <DataTable
            columns={[
              {
                key: 'sku_id',
                label: 'Menu Item',
                render: (row) => <span className="font-bold text-white">{getName(row.sku_id, menuItems)}</span>
              },
              {
                key: 'components',
                label: 'Ingredients',
                render: (row) => <Badge variant="secondary">{row.components?.length || 0} items</Badge>
              },
              {
                key: 'yield',
                label: 'Yield',
                render: (row) => <span className="text-zinc-400">{row.yield_qty} {row.yield_uom}</span>
              },
              {
                key: 'actions',
                label: '',
                render: (row) => (
                  <Button variant="ghost" size="sm" onClick={() => {
                    setEditingRecipe(row);
                    // Hydrate form
                    setFormData({
                      sku_id: row.sku_id,
                      yield_qty: row.yield_qty,
                      yield_uom: row.yield_uom,
                      components: row.components.map(c => ({
                        ...c,
                        name: getName(c.ref_id, items),
                        unit: items.find(i => i.id === c.ref_id)?.unit || '?'
                      }))
                    });
                    setIsModalOpen(true);
                  }}>
                    <FileText className="w-4 h-4 text-blue-400" />
                  </Button>
                )
              }
            ]}
            data={recipes}
            loading={loading}
            emptyMessage="No recipes defined. Create one to enable inventory tracking."
          />
        </CardContent>
      </Card>

      {/* Editor Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="bg-zinc-950 border-white/10 text-white max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRecipe ? 'Edit Recipe' : 'New Recipe Costing'}</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-4">
            {/* Left: Recipe Meta */}
            <div className="space-y-4 border-r border-white/10 pr-4">
              <div className="space-y-2">
                <Label>Target Menu Item</Label>
                <Select
                  value={formData.sku_id}
                  onValueChange={v => setFormData({ ...formData, sku_id: v })}
                  disabled={!!editingRecipe} // Lock target on edit to prevent confusion
                >
                  <SelectTrigger className="bg-zinc-900 border-white/10">
                    <SelectValue placeholder="Select Item..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {menuItems.map(m => (
                      <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label>Yield Qty</Label>
                  <Input
                    type="number"
                    value={formData.yield_qty}
                    onChange={e => setFormData({ ...formData, yield_qty: e.target.value })}
                    className="bg-zinc-900 border-white/10"
                  />
                </div>
                <div className="space-y-2">
                  <Label>UOM</Label>
                  <Input
                    value={formData.yield_uom}
                    onChange={e => setFormData({ ...formData, yield_uom: e.target.value })}
                    className="bg-zinc-900 border-white/10"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-white/10">
                <h4 className="font-bold text-sm mb-2 flex items-center gap-2">
                  <Plus className="w-4 h-4 text-green-500" />
                  Add Ingredient
                </h4>
                <div className="max-h-60 overflow-y-auto space-y-1 pr-1">
                  {items.map(item => (
                    <button
                      key={item.id}
                      onClick={() => addItemToRecipe(item)}
                      className="w-full text-left text-xs p-2 bg-zinc-900 hover:bg-zinc-800 rounded flex justify-between group"
                    >
                      <span>{item.name}</span>
                      <span className="text-zinc-500 group-hover:text-white">{item.unit}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: Ingredients Table */}
            <div className="md:col-span-2 space-y-4">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <ChefHat className="w-5 h-5 text-red-500" />
                Composition
              </h3>

              {formData.components.length === 0 ? (
                <div className="p-8 border-2 border-dashed border-zinc-800 rounded-xl text-center text-zinc-500">
                  No ingredients added yet.
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="grid grid-cols-12 gap-2 text-[10px] uppercase font-bold text-zinc-500 px-2">
                    <div className="col-span-5">Ingredient</div>
                    <div className="col-span-3">Qty</div>
                    <div className="col-span-2">Waste</div>
                    <div className="col-span-2"></div>
                  </div>
                  {formData.components.map((comp, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-zinc-900/50 p-2 rounded border border-white/5">
                      <div className="col-span-5 text-sm font-medium text-white truncate">
                        {comp.name || getName(comp.ref_id, items)}
                      </div>
                      <div className="col-span-3">
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            className="h-7 text-xs bg-black/50 border-0"
                            value={comp.qty_base}
                            onChange={e => updateComponent(idx, 'qty_base', e.target.value)}
                          />
                          <span className="text-[10px] text-zinc-500">{comp.unit}</span>
                        </div>
                      </div>
                      <div className="col-span-2">
                        <Input
                          type="number"
                          className="h-7 text-xs bg-black/50 border-0"
                          value={comp.waste_factor}
                          step="0.1"
                          onChange={e => updateComponent(idx, 'waste_factor', e.target.value)}
                        />
                      </div>
                      <div className="col-span-2 text-right">
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500 hover:bg-red-500/20" onClick={() => removeComponent(idx)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} className="bg-purple-600 hover:bg-purple-700">Save Recipe</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
