import React, { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';

import { ClipboardList, Search, Check } from 'lucide-react';

import axios from 'axios';

import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

function StockCount() {
  const [count, setCount] = useState(null);
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [countLines, setCountLines] = useState({});
  const venueId = localStorage.getItem('currentVenueId') || 'venue-caviar-bull';

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const token = localStorage.getItem('restin_token');
      const response = await axios.get(
        `${API_URL}/api/inventory/items?venue_id=${venueId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setItems(response.data.items || []);
    } catch (error: any) {
      logger.error('Error fetching items:', error);
    }
  };

  const startCount = async () => {
    try {
      const token = localStorage.getItem('restin_token');
      const response = await axios.post(
        `${API_URL}/api/inventory/counts/start?venue_id=${venueId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCount(response.data.count);
      toast.success('Stock count started: ' + response.data.count.display_id);
    } catch (error: any) {
      logger.error('Error starting count:', error);
    }
  };

  const submitLine = async (item) => {
    if (!count) return;

    const countedQty = parseFloat(countLines[item.id] || 0);

    try {
      const token = localStorage.getItem('restin_token');
      await axios.post(
        `${API_URL}/api/inventory/counts/${count.id}/lines?venue_id=${venueId}`,
        {
          item_id: item.id,
          item_name: item.name,
          counted_qty: countedQty,
          unit: item.base_unit
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.info(`Counted: ${item.name} — ${countedQty} ${item.base_unit}`);
    } catch (error: any) {
      logger.error('Error submitting line:', error);
    }
  };

  const completeCount = async () => {
    if (!count) return;

    if (!confirm('Complete stock count? This will adjust stock levels.')) return;

    try {
      const token = localStorage.getItem('restin_token');
      await axios.post(
        `${API_URL}/api/inventory/counts/${count.id}/complete?venue_id=${venueId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Stock count completed!');
      setCount(null);
      setCountLines({});
    } catch (error: any) {
      logger.error('Error completing count:', error);
    }
  };

  const filteredItems = search
    ? items.filter(item =>
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.sku.toLowerCase().includes(search.toLowerCase())
    )
    : items;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-4xl font-bold text-foreground">Stock Count</h1>
            {count && (
              <p className="text-lg text-blue-600 dark:text-blue-400 font-medium mt-1">
                Active Count: {count.display_id}
              </p>
            )}
          </div>

          <div className="flex gap-3">
            {!count ? (
              <button
                onClick={startCount}
                className="px-6 py-3 bg-blue-600 text-foreground rounded-lg hover:bg-blue-700 font-semibold"
              >
                Start New Count
              </button>
            ) : (
              <button
                onClick={completeCount}
                className="flex items-center gap-2 px-6 py-3 bg-green-600 text-foreground rounded-lg hover:bg-green-700 font-semibold"
              >
                <Check className="w-5 h-5" />
                Complete Count
              </button>
            )}
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search items by name or SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3 border border-border rounded-lg"
          />
        </div>
      </div>

      {!count ? (
        <div className="text-center py-20 bg-white rounded-xl border-2 border-dashed border-gray-300">
          <ClipboardList className="w-20 h-20 mx-auto text-muted-foreground mb-4" />
          <p className="text-xl text-muted-foreground mb-2">No active count</p>
          <p className="text-gray-400">Start a new stock count to begin</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">SKU</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Item</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Theoretical</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Counted</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Unit</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-mono text-gray-600">{item.sku}</td>
                    <td className="px-6 py-4 font-medium text-foreground">{item.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{item.current_stock?.toFixed(2)}</td>
                    <td className="px-6 py-4">
                      <input
                        type="number"
                        step="0.01"
                        value={countLines[item.id] || ''}
                        onChange={(e) => setCountLines({ ...countLines, [item.id]: e.target.value })}
                        className="w-32 px-3 py-2 border border-border rounded-lg"
                        placeholder="0.00"
                      />
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{item.base_unit}</td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => submitLine(item)}
                        disabled={!countLines[item.id]}
                        className="px-4 py-2 bg-blue-600 text-foreground rounded-lg hover:bg-blue-700 disabled:bg-gray-300 text-sm font-medium"
                      >
                        Submit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default StockCount;