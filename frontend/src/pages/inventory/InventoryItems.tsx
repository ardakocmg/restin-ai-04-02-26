// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';

import { Package, Plus, TrendingUp, TrendingDown } from 'lucide-react';

import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

function InventoryItems() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const venueId = localStorage.getItem('currentVenueId') || 'venue-caviar-bull';

  useEffect(() => {
    fetchItems();
  }, [search]);

  const fetchItems = async () => {
    try {
      const token = localStorage.getItem('restin_token');
      const response = await axios.get(
        `${API_URL}/api/inventory/items?venue_id=${venueId}&q=${search}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setItems(response.data.items || []);
    } catch (error: any) {
      logger.error('Error fetching items:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-4xl font-bold text-foreground">Inventory Items</h1>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-foreground rounded-lg hover:bg-blue-700">
            <Plus className="w-5 h-5" />
            Add Item
          </button>
        </div>

        <input
          type="text"
          placeholder="Search items..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg"
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">SKU</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Name</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Category</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Stock</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Unit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {items.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50 cursor-pointer">
                <td className="px-6 py-4 text-sm font-medium text-foreground">{item.sku}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <Package className="w-5 h-5 text-gray-400" />
                    <span className="font-medium text-foreground">{item.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">{item.category || '-'}</td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${
                    item.current_stock > item.reorder_level
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {item.current_stock > item.reorder_level ? (
                      <TrendingUp className="w-4 h-4" />
                    ) : (
                      <TrendingDown className="w-4 h-4" />
                    )}
                    {item.current_stock?.toFixed(2)}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">{item.base_unit}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {items.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <Package className="w-16 h-16 mx-auto mb-4" />
            <p>No items found</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default InventoryItems;