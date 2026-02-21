// @ts-nocheck
import React, { useState } from 'react';
import { X, Plus, Minus } from 'lucide-react';

function ModifierModal({ menuItem, onClose, onConfirm }) {
  const [selectedModifiers, setSelectedModifiers] = useState([]);
  const [instructions, setInstructions] = useState('');

  const toggleModifier = (groupId, option) => {
    const exists = selectedModifiers.find(m => m.group_id === groupId && m.option_id === option.id);
    
    if (exists) {
      setSelectedModifiers(selectedModifiers.filter(m => !(m.group_id === groupId && m.option_id === option.id)));
    } else {
      setSelectedModifiers([...selectedModifiers, {
        group_id: groupId,
        option_id: option.id,
        qty: 1,
        price_delta: option.price || 0
      }]);
    }
  };

  const handleConfirm = () => {
    onConfirm({
      modifiers: selectedModifiers,
      instructions
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">{menuItem.name}</h2>
            <p className="text-gray-600">Customize your order</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Modifier Groups */}
          {menuItem.modifier_groups?.map((group) => (
            <div key={group.id}>
              <h3 className="text-lg font-semibold text-foreground mb-3">
                {group.name}
                {group.required && <span className="text-red-500 ml-1">*</span>}
              </h3>
              <div className="space-y-2">
                {group.options?.map((option) => {
                  const isSelected = selectedModifiers.some(
                    m => m.group_id === group.id && m.option_id === option.id
                  );
                  
                  return (
                    <button
                      key={option.id}
                      onClick={() => toggleModifier(group.id, option)}
                      className={`w-full flex items-center justify-between p-4 rounded-lg border-2 transition ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <span className="font-medium text-foreground">{option.name}</span>
                      <div className="flex items-center gap-3">
                        {option.price > 0 && (
                          <span className="text-sm text-gray-600">+€{option.price.toFixed(2)}</span>
                        )}
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                          isSelected ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                        }`}>
                          {isSelected && <div className="w-3 h-3 bg-white rounded-full" />}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Special Instructions */}
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-3">Special Instructions</h3>
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Add cooking instructions..."
              className="w-full px-4 py-3 border border-border rounded-lg resize-none"
              rows={3}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-4 bg-muted text-foreground rounded-lg hover:bg-gray-200 font-semibold"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 px-6 py-4 bg-blue-600 text-foreground rounded-lg hover:bg-blue-700 font-semibold"
          >
            Add to Order
          </button>
        </div>
      </div>
    </div>
  );
}

export default ModifierModal;
