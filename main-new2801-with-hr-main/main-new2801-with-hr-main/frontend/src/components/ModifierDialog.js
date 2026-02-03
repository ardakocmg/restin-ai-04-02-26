import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Button } from "./ui/button";
import { Checkbox } from "./ui/checkbox";
import { Label } from "./ui/label";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { ScrollArea } from "./ui/scroll-area";
import api from "../lib/api";
import { Loader2 } from "lucide-react";

export default function ModifierDialog({ item, open, onClose, onConfirm }) {
  const [modifierGroups, setModifierGroups] = useState([]);
  const [selections, setSelections] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open && item) {
      loadModifiers();
    }
  }, [open, item]);

  const loadModifiers = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/menu/items/${item.id}/modifiers`);
      setModifierGroups(response.data);
      
      // Set default selections
      const defaults = {};
      response.data.forEach(group => {
        if (group.selection_type === 'single') {
          const defaultOption = group.options.find(opt => opt.is_default);
          if (defaultOption) {
            defaults[group.id] = defaultOption.id;
          }
        } else {
          defaults[group.id] = [];
        }
      });
      setSelections(defaults);
    } catch (error) {
      console.error('Failed to load modifiers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSingleSelect = (groupId, optionId) => {
    setSelections({ ...selections, [groupId]: optionId });
  };

  const handleMultiSelect = (groupId, optionId, checked) => {
    const current = selections[groupId] || [];
    if (checked) {
      setSelections({ ...selections, [groupId]: [...current, optionId] });
    } else {
      setSelections({ ...selections, [groupId]: current.filter(id => id !== optionId) });
    }
  };

  const calculateTotal = () => {
    if (!item) return 0;
    let adjustment = 0;
    modifierGroups.forEach(group => {
      if (group.selection_type === 'single') {
        const optionId = selections[group.id];
        const option = group.options.find(opt => opt.id === optionId);
        if (option) adjustment += option.price_adjustment;
      } else {
        const optionIds = selections[group.id] || [];
        optionIds.forEach(id => {
          const option = group.options.find(opt => opt.id === id);
          if (option) adjustment += option.price_adjustment;
        });
      }
    });
    return (item.price || 0) + adjustment;
  };

  const handleConfirm = () => {
    const selectedModifiers = [];
    modifierGroups.forEach(group => {
      if (group.selection_type === 'single') {
        const optionId = selections[group.id];
        const option = group.options.find(opt => opt.id === optionId);
        if (option) {
          selectedModifiers.push({
            group_id: group.id,
            group_name: group.name,
            option_id: option.id,
            name: option.name,
            price_adjustment: option.price_adjustment
          });
        }
      } else {
        const optionIds = selections[group.id] || [];
        optionIds.forEach(id => {
          const option = group.options.find(opt => opt.id === id);
          if (option) {
            selectedModifiers.push({
              group_id: group.id,
              group_name: group.name,
              option_id: option.id,
              name: option.name,
              price_adjustment: option.price_adjustment
            });
          }
        });
      }
    });
    
    onConfirm({
      ...item,
      modifiers: selectedModifiers,
      final_price: calculateTotal()
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-white/10 max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-white text-xl">
            {item?.name}
            <span className="text-zinc-400 text-sm ml-2">€{(item?.price || 0).toFixed(2)}</span>
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="py-12 text-center">
            <Loader2 className="w-8 h-8 text-red-500 animate-spin mx-auto" />
          </div>
        ) : modifierGroups.length === 0 ? (
          <div className="py-8 text-center text-zinc-400">
            <p>No modifiers available</p>
            <p className="text-xs mt-1">Item will be added with no customization</p>
          </div>
        ) : (
          <ScrollArea className="max-h-96">
            <div className="space-y-6 p-4">
              {modifierGroups.map(group => (
                <div key={group.id}>
                  <Label className="text-white font-medium mb-3 block">
                    {group.name}
                    {group.required && <span className="text-red-400 ml-1">*</span>}
                  </Label>
                  
                  {group.selection_type === 'single' ? (
                    <RadioGroup
                      value={selections[group.id]}
                      onValueChange={(value) => handleSingleSelect(group.id, value)}
                    >
                      <div className="space-y-2">
                        {group.options.map(option => (
                          <div key={option.id} className="flex items-center space-x-3 p-2 rounded hover:bg-zinc-800">
                            <RadioGroupItem value={option.id} id={option.id} />
                            <Label htmlFor={option.id} className="text-white flex-1 cursor-pointer">
                              {option.name}
                              {option.price_adjustment !== 0 && (
                                <span className="ml-2 text-orange-400 text-sm">
                                  {option.price_adjustment > 0 ? '+' : ''}
                                  €{option.price_adjustment.toFixed(2)}
                                </span>
                              )}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </RadioGroup>
                  ) : (
                    <div className="space-y-2">
                      {group.options.map(option => (
                        <div key={option.id} className="flex items-center space-x-3 p-2 rounded hover:bg-zinc-800">
                          <Checkbox
                            id={option.id}
                            checked={(selections[group.id] || []).includes(option.id)}
                            onCheckedChange={(checked) => handleMultiSelect(group.id, option.id, checked)}
                          />
                          <Label htmlFor={option.id} className="text-white flex-1 cursor-pointer">
                            {option.name}
                            {option.price_adjustment !== 0 && (
                              <span className="ml-2 text-orange-400 text-sm">
                                {option.price_adjustment > 0 ? '+' : ''}
                                €{option.price_adjustment.toFixed(2)}
                              </span>
                            )}
                          </Label>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        <DialogFooter>
          <div className="flex items-center justify-between w-full">
            <div className="text-white">
              <span className="text-sm text-zinc-400">Total: </span>
              <span className="text-2xl font-bold">€{calculateTotal().toFixed(2)}</span>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose} className="border-white/10">
                Cancel
              </Button>
              <Button onClick={handleConfirm} className="bg-red-500 hover:bg-red-600">
                Add to Order
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
