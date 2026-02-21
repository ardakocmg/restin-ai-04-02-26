import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';
import { Checkbox } from '../../components/ui/checkbox';
import { Badge } from '../../components/ui/badge';
import { DollarSign, Users } from 'lucide-react';

export default function BillSplitModal({ open, onClose, order, onConfirm }) {
  const [splitType, setSplitType] = useState('equal'); // 'equal' | 'by_item' | 'custom'
  const [numberOfSplits, setNumberOfSplits] = useState(2);
  const [itemSelections, setItemSelections] = useState({});

  if (!order) return null;

  const totalAmount = order.totals?.grand_total || 0;
  const items = order.items || [];

  const handleSplitEqual = () => {
    const amountPerPerson = totalAmount / numberOfSplits;
    const splits = Array(numberOfSplits).fill(0).map((_, i) => ({
      split_id: `split_${i + 1}`,
      amount: amountPerPerson,
      items: 'equal'
    }));
    onConfirm(splits);
    onClose();
  };

  const handleSplitByItem = () => {
    // Group items by selection
    const splits = {};
    Object.keys(itemSelections).forEach(itemId => {
      const splitId = itemSelections[itemId];
      if (!splits[splitId]) splits[splitId] = [];
      const item = items.find(i => i.id === itemId);
      if (item) splits[splitId].push(item);
    });

    const splitArray = Object.keys(splits).map(splitId => ({
      split_id: splitId,
      items: splits[splitId],
      amount: splits[splitId].reduce((sum, item) => sum + (item.line_total || 0), 0)
    }));

    onConfirm(splitArray);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Split Bill</DialogTitle>
          <p style={{ color: '#A1A1AA' }}>Total: €{totalAmount.toFixed(2)}</p> /* keep-inline */
        </DialogHeader>

        <div className="space-y-4">
          {/* Split Type Selection */}
          <div className="flex gap-3">
            <Button 
              variant={splitType === 'equal' ? 'default' : 'outline'}
              onClick={() => setSplitType('equal')}
              className="flex-1"
            >
              <Users className="h-4 w-4 mr-2" />
              Split Equally
            </Button>
            <Button 
              variant={splitType === 'by_item' ? 'default' : 'outline'}
              onClick={() => setSplitType('by_item')}
              className="flex-1"
            >
              <DollarSign className="h-4 w-4 mr-2" />
              Split by Item
            </Button>
          </div>

          {/* Equal Split */}
          {splitType === 'equal' && (
            <div className="p-4 rounded-lg" style={{ backgroundColor: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.05)' }}> /* keep-inline */
              <label className="block mb-2" style={{ color: '#D4D4D8' }}>Number of People</label> /* keep-inline */
              <div className="flex items-center gap-4">
                <Button onClick={() => setNumberOfSplits(Math.max(2, numberOfSplits - 1))}>-</Button>
                <span className="text-2xl font-bold" style={{ color: '#F5F5F7' }}>{numberOfSplits}</span> /* keep-inline */
                <Button onClick={() => setNumberOfSplits(Math.min(10, numberOfSplits + 1))}>+</Button>
              </div>
              <div className="mt-4">
                <p style={{ color: '#A1A1AA' }}>Amount per person:</p> /* keep-inline */
                <p className="text-2xl font-bold" style={{ color: '#E53935' }}>€{(totalAmount / numberOfSplits).toFixed(2)}</p> /* keep-inline */
              </div>
            </div>
          )}

          {/* By Item Split */}
          {splitType === 'by_item' && (
            <div className="space-y-3">
              <p className="text-sm" style={{ color: '#A1A1AA' }}>Select items for each person</p> /* keep-inline */
              {items.map((item, idx) => (
                <div 
                  key={item.id || idx}
                  className="flex items-center justify-between p-3 rounded-lg"
                  style={{ backgroundColor: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.05)' }} /* keep-inline */
                >
                  <div className="flex-1">
                    <p style={{ color: '#F5F5F7' }}>{item.name}</p> /* keep-inline */
                    <p className="text-sm" style={{ color: '#71717A' }}>€{item.line_total?.toFixed(2)}</p> /* keep-inline */
                  </div>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4].map(splitNum => (
                      <Button
                        key={splitNum}
                        size="sm"
                        variant={itemSelections[item.id] === `split_${splitNum}` ? 'default' : 'outline'}
                        onClick={() => setItemSelections(prev => ({ ...prev, [item.id]: `split_${splitNum}` }))}
                      >
                        #{splitNum}
                      </Button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={splitType === 'equal' ? handleSplitEqual : handleSplitByItem}>
            Split Bill
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
