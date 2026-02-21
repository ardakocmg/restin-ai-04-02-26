import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Users, ArrowRight } from 'lucide-react';

export default function TableMergeModal({ open, onClose, currentTable, availableTables, onConfirm }) {
  const [selectedTables, setSelectedTables] = useState([]);
  const [targetTable, setTargetTable] = useState(currentTable);

  const toggleTable = (table) => {
    if (selectedTables.find(t => t.id === table.id)) {
      setSelectedTables(prev => prev.filter(t => t.id !== table.id));
    } else {
      setSelectedTables(prev => [...prev, table]);
    }
  };

  const handleMerge = () => {
    onConfirm({
      source_tables: selectedTables.map(t => t.id),
      target_table: targetTable.id
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Merge Tables</DialogTitle>
          <p style={{ color: '#A1A1AA' }}>Combine multiple tables into one order</p> /* keep-inline */
        </DialogHeader>

        <div className="space-y-4">
          {/* Current Table */}
          <div className="p-4 rounded-lg" style={{ backgroundColor: 'rgba(229, 57, 53, 0.1)', border: '1px solid rgba(229, 57, 53, 0.3)' }}> /* keep-inline */
            <p className="text-sm mb-2" style={{ color: '#A1A1AA' }}>Primary Table:</p> /* keep-inline */
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold" style={{ color: '#F5F5F7' }}>{currentTable?.name}</p> /* keep-inline */
                <p className="text-sm" style={{ color: '#71717A' }}>Current order: €{currentTable?.order_total?.toFixed(2) || '0.00'}</p> /* keep-inline */
              </div>
              <Badge>Primary</Badge>
            </div>
          </div>

          {/* Available Tables */}
          <div>
            <p className="text-sm mb-3" style={{ color: '#D4D4D8' }}>Select tables to merge:</p> /* keep-inline */
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {availableTables?.filter(t => t.id !== currentTable?.id).map(table => {
                const isSelected = selectedTables.find(t => t.id === table.id);
                return (
                  <div
                    key={table.id}
                    className="p-4 rounded-lg cursor-pointer transition-all"
                    style={{ /* keep-inline */
                      backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.1)' : 'rgba(255, 255, 255, 0.02)',
                      border: isSelected ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid rgba(255, 255, 255, 0.05)'
                    }}
                    onClick={() => toggleTable(table)}
                  >
                    <p className="font-medium" style={{ color: '#F5F5F7' }}>{table.name}</p> /* keep-inline */
                    <p className="text-sm" style={{ color: '#71717A' }}> /* keep-inline */
                      {table.current_order_id ? `€${table.order_total?.toFixed(2) || '0.00'}` : 'Empty'}
                    </p>
                    {isSelected && <Badge variant="default" className="mt-2">Selected</Badge>}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Preview */}
          {selectedTables.length > 0 && (
            <div className="p-4 rounded-lg" style={{ backgroundColor: 'rgba(74, 222, 128, 0.1)', border: '1px solid rgba(74, 222, 128, 0.3)' }}> /* keep-inline */
              <p className="text-sm mb-2" style={{ color: '#86EFAC' }}>Merge Preview:</p> /* keep-inline */
              <div className="flex items-center gap-2">
                <Badge>{currentTable?.name}</Badge>
                {selectedTables.map(t => (
                  <React.Fragment key={t.id}>
                    <ArrowRight className="h-4 w-4" style={{ color: '#71717A' }} /> /* keep-inline */
                    <Badge variant="outline">{t.name}</Badge>
                  </React.Fragment>
                ))}
              </div>
              <p className="text-sm mt-2" style={{ color: '#D4D4D8' }}> /* keep-inline */
                Total guests: {(currentTable?.guests || 0) + selectedTables.reduce((sum, t) => sum + (t.guests || 0), 0)}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleMerge} disabled={selectedTables.length === 0}>
            Merge {selectedTables.length + 1} Tables
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
