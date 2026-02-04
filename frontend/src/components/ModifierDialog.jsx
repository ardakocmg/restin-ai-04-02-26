import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import { Plus, Minus, X } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';

export default function ModifierDialog({ open, onClose, item, onConfirm }) {
  const [selectedModifiers, setSelectedModifiers] = useState([]);
  const [quantities, setQuantities] = useState({});
  const [notes, setNotes] = useState('');

  if (!item) return null;

  const toggleModifier = (modifier) => {
    if (selectedModifiers.find(m => m.id === modifier.id)) {
      setSelectedModifiers(prev => prev.filter(m => m.id !== modifier.id));
      const newQty = { ...quantities };
      delete newQty[modifier.id];
      setQuantities(newQty);
    } else {
      setSelectedModifiers(prev => [...prev, modifier]);
      setQuantities(prev => ({ ...prev, [modifier.id]: 1 }));
    }
  };

  const updateQuantity = (modifierId, delta) => {
    setQuantities(prev => ({
      ...prev,
      [modifierId]: Math.max(1, (prev[modifierId] || 1) + delta)
    }));
  };

  const handleConfirm = () => {
    const modifiersWithQty = selectedModifiers.map(mod => ({
      ...mod,
      quantity: quantities[mod.id] || 1
    }));
    onConfirm(item, modifiersWithQty, notes);
    onClose();
  };

  const modifierGroups = item.modifier_groups || [];
  const totalPrice = item.price + selectedModifiers.reduce((sum, mod) => 
    sum + (mod.price * (quantities[mod.id] || 1)), 0
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{item.name}</DialogTitle>
          <p style={{ color: '#A1A1AA' }}>Customize your order</p>
        </DialogHeader>

        <ScrollArea className="max-h-[500px] pr-4">
          <div className="space-y-6">
            {/* Modifier Groups */}
            {modifierGroups.map(group => (
              <div key={group.id}>
                <h3 className="font-semibold mb-3" style={{ color: '#F5F5F7' }}>
                  {group.name}
                  {group.required && <span style={{ color: '#E53935' }}> *</span>}
                </h3>
                <div className="space-y-2">
                  {group.modifiers?.map(modifier => {
                    const isSelected = selectedModifiers.find(m => m.id === modifier.id);
                    return (
                      <div 
                        key={modifier.id}
                        className="flex items-center justify-between p-3 rounded-lg cursor-pointer"
                        style={{
                          backgroundColor: isSelected ? 'rgba(229, 57, 53, 0.1)' : 'rgba(255, 255, 255, 0.02)',
                          border: isSelected ? '1px solid rgba(229, 57, 53, 0.3)' : '1px solid rgba(255, 255, 255, 0.05)'
                        }}
                        onClick={() => toggleModifier(modifier)}
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <Checkbox 
                            checked={!!isSelected}
                            onCheckedChange={() => toggleModifier(modifier)}
                          />
                          <div>
                            <p style={{ color: '#F5F5F7' }}>{modifier.name}</p>
                            {modifier.price > 0 && (
                              <p className="text-sm" style={{ color: '#A1A1AA' }}>+€{modifier.price.toFixed(2)}</p>
                            )}
                          </div>
                        </div>
                        {isSelected && (
                          <div className="flex items-center gap-2">
                            <Button 
                              size="icon" 
                              variant="outline" 
                              className="h-8 w-8"
                              onClick={(e) => {
                                e.stopPropagation();
                                updateQuantity(modifier.id, -1);
                              }}
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                            <span className="w-8 text-center font-bold" style={{ color: '#F5F5F7' }}>
                              {quantities[modifier.id] || 1}
                            </span>
                            <Button 
                              size="icon" 
                              variant="outline" 
                              className="h-8 w-8"
                              onClick={(e) => {
                                e.stopPropagation();
                                updateQuantity(modifier.id, 1);
                              }}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Special Instructions */}
            <div>
              <h3 className="font-semibold mb-2" style={{ color: '#F5F5F7' }}>Special Instructions</h3>
              <textarea
                className="w-full p-3 rounded-lg text-sm"
                style={{
                  backgroundColor: '#27272A',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#F5F5F7',
                  minHeight: '80px'
                }}
                placeholder="Add notes (e.g., 'no onions', 'extra crispy')..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
        </ScrollArea>

        <DialogFooter>
          <div className="flex items-center justify-between w-full">
            <div>
              <p className="text-sm" style={{ color: '#A1A1AA' }}>Total</p>
              <p className="text-2xl font-bold" style={{ color: '#E53935' }}>€{totalPrice.toFixed(2)}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={handleConfirm}>
                Add to Order
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
