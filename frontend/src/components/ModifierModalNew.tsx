import React, { useState } from 'react';
import { X, Plus, Minus, Check } from 'lucide-react';

interface ModifierOption {
  id: string;
  name: string;
  price_adjustment: number;
}

interface ModifierGroup {
  id: string;
  name: string;
  required?: boolean;
  multiple?: boolean;
  options: ModifierOption[];
}

interface MenuItem {
  id: string;
  name: string;
  price?: number;
  [key: string]: unknown;
}

interface SelectedModifierItem {
  group_id: string;
  group_name: string;
  option_id: string;
  option_name: string;
  price_adjustment: number;
}

interface ModifierModalProps {
  item: MenuItem;
  modifierGroups?: ModifierGroup[];
  onAdd: (item: MenuItem & { quantity: number; modifiers: SelectedModifierItem[]; special_instructions: string; total: number }) => void;
  onClose: () => void;
}

/**
 * ModifierModal - Dark Theme Modifier Selection Modal
 */
export default function ModifierModal({ item, modifierGroups = [], onAdd, onClose }: ModifierModalProps) {
  const [quantity, setQuantity] = useState(1);
  const [selectedModifiers, setSelectedModifiers] = useState<Record<string, string[]>>({});
  const [specialInstructions, setSpecialInstructions] = useState('');

  const handleModifierToggle = (groupId: string, optionId: string, isMultiple: boolean) => {
    setSelectedModifiers(prev => {
      const newSelection = { ...prev };

      if (isMultiple) {
        // Checkbox behavior
        if (!newSelection[groupId]) {
          newSelection[groupId] = [];
        }
        if (newSelection[groupId].includes(optionId)) {
          newSelection[groupId] = newSelection[groupId].filter(id => id !== optionId);
        } else {
          newSelection[groupId] = [...newSelection[groupId], optionId];
        }
      } else {
        // Radio behavior
        newSelection[groupId] = [optionId];
      }

      return newSelection;
    });
  };

  const calculateTotal = (): number => {
    let total = (item.price || 0) * quantity;

    modifierGroups.forEach(group => {
      const selected = selectedModifiers[group.id] || [];
      selected.forEach(optionId => {
        const option = group.options.find(opt => opt.id === optionId);
        if (option && option.price_adjustment) {
          total += option.price_adjustment * quantity;
        }
      });
    });

    return total;
  };

  const handleAddToOrder = () => {
    const modifiersArray: SelectedModifierItem[] = [];
    modifierGroups.forEach(group => {
      const selected = selectedModifiers[group.id] || [];
      selected.forEach(optionId => {
        const option = group.options.find(opt => opt.id === optionId);
        if (option) {
          modifiersArray.push({
            group_id: group.id,
            group_name: group.name,
            option_id: option.id,
            option_name: option.name,
            price_adjustment: option.price_adjustment || 0
          });
        }
      });
    });

    onAdd({
      ...item,
      quantity,
      modifiers: modifiersArray,
      special_instructions: specialInstructions,
      total: calculateTotal()
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-md"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-2xl card-dark">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-card border-b border-border p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h2 className="text-2xl font-heading mb-1" style={{ color: '#F5F5F7' }}>
                {item.name}
              </h2>
              <p className="text-lg font-bold text-red-500">
                €{item.price?.toFixed(2)}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/5 transition-colors"
              style={{ color: '#71717A' }}
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-220px)] p-6 space-y-6">
          {/* Modifier Groups */}
          {modifierGroups.map((group) => (
            <div key={group.id} className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold" style={{ color: '#F5F5F7' }}>
                  {group.name}
                </h3>
                {group.required && (
                  <span className="text-xs px-2 py-1 rounded bg-red-950/30 text-red-400 border border-red-500/30">
                    Required
                  </span>
                )}
              </div>

              <div className="space-y-2">
                {group.options.map((option) => {
                  const isSelected = (selectedModifiers[group.id] || []).includes(option.id);

                  return (
                    <button
                      key={option.id}
                      onClick={() => handleModifierToggle(group.id, option.id, group.multiple)}
                      className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all duration-200 ${isSelected
                          ? 'bg-red-950/30 border-red-500'
                          : 'bg-card/50 border-border hover:border-red-500/50'
                        }`}
                      style={
                        isSelected
                          ? { boxShadow: '0 0 16px rgba(229, 57, 53, 0.3)' }
                          : {}
                      }
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-5 h-5 rounded flex items-center justify-center border-2 ${isSelected
                              ? 'bg-red-500 border-red-500'
                              : 'border-white/30'
                            }`}
                        >
                          {isSelected && <Check className="w-3 h-3 text-foreground" />}
                        </div>
                        <span style={{ color: isSelected ? '#F5F5F7' : '#D4D4D8' }}>
                          {option.name}
                        </span>
                      </div>
                      {option.price_adjustment !== 0 && (
                        <span className="text-sm font-bold text-red-500">
                          +€{option.price_adjustment?.toFixed(2)}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Special Instructions */}
          <div className="space-y-2">
            <label className="block font-semibold" style={{ color: '#F5F5F7' }}>
              Special Instructions
            </label>
            <textarea
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
              placeholder="e.g., No onions, extra sauce..."
              rows={3}
              className="w-full input-dark rounded-xl p-3 text-sm"
              style={{
                backgroundColor: '#18181B',
                borderColor: 'rgba(255, 255, 255, 0.1)',
                color: '#F5F5F7'
              }}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 z-10 bg-card border-t border-border p-6">
          {/* Quantity Selector */}
          <div className="flex items-center justify-between mb-4">
            <span className="font-semibold" style={{ color: '#F5F5F7' }}>Quantity</span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-10 h-10 rounded-lg bg-secondary hover:bg-secondary/80 border border-border flex items-center justify-center transition-colors"
                disabled={quantity <= 1}
              >
                <Minus className="w-4 h-4" style={{ color: '#D4D4D8' }} />
              </button>
              <span className="text-xl font-bold w-12 text-center" style={{ color: '#F5F5F7' }}>
                {quantity}
              </span>
              <button
                onClick={() => setQuantity(quantity + 1)}
                className="w-10 h-10 rounded-lg bg-secondary hover:bg-secondary/80 border border-border flex items-center justify-center transition-colors"
              >
                <Plus className="w-4 h-4" style={{ color: '#D4D4D8' }} />
              </button>
            </div>
          </div>

          {/* Add to Order Button */}
          <button
            onClick={handleAddToOrder}
            className="w-full h-14 btn-primary rounded-xl font-bold text-lg flex items-center justify-center gap-3"
          >
            <Plus className="w-5 h-5" />
            Add to Order — €{calculateTotal().toFixed(2)}
          </button>
        </div>
      </div>
    </div>
  );
}
