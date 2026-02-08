import React, { useState, useEffect } from 'react';
import { Trash2, Plus } from 'lucide-react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

function WasteLog() {
  const [wasteEntries, setWasteEntries] = useState([]);
  const [items, setItems] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    item_id: '',
    qty: '',
    reason: 'SPOILAGE'
  });
  const venueId = localStorage.getItem('currentVenueId') || 'venue-caviar-bull';

  useEffect(() => {
    fetchWaste();
    fetchItems();
  }, []);

  const fetchWaste = async () => {
    try {
      const token = localStorage.getItem('restin_token');
      const response = await axios.get(
        `${API_URL}/api/inventory/waste?venue_id=${venueId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setWasteEntries(response.data.waste || []);
    } catch (error) {
      console.error('Error fetching waste:', error);
    }
  };

  const fetchItems = async () => {
    try {
      const token = localStorage.getItem('restin_token');
      const response = await axios.get(
        `${API_URL}/api/inventory/items?venue_id=${venueId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setItems(response.data.items || []);
    } catch (error) {
      console.error('Error fetching items:', error);
    }
  };

  const logWaste = async () => {
    const selectedItem = items.find(i => i.id === formData.item_id);
    if (!selectedItem) return;

    try {
      const token = localStorage.getItem('restin_token');
      await axios.post(
        `${API_URL}/api/inventory/waste`,
        {
          venue_id: venueId,
          item_id: formData.item_id,
          item_name: selectedItem.name,
          quantity: parseFloat(formData.qty),
          unit: selectedItem.unit || 'each',
          item_type: 'INGREDIENT',
          reason: formData.reason,
          notes: formData.notes
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      alert('Waste logged successfully');
      setShowForm(false);
      setFormData({ item_id: '', qty: '', reason: 'SPOILAGE' });
      fetchWaste();
    } catch (error) {
      console.error('Error logging waste:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-4xl font-bold text-gray-900">Waste Log</h1>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            <Plus className="w-5 h-5" />
            Log Waste
          </button>
        </div>
      </div>

      {/* Waste Entry Form */}
      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">New Waste Entry</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Item</label>
              <select
                value={formData.item_id}
                onChange={(e) => setFormData({ ...formData, item_id: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">Select item...</option>
                {items.map(item => (
                  <option key={item.id} value={item.id}>{item.name} ({item.sku})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Quantity</label>
              <input
                type="number"
                step="0.01"
                value={formData.qty}
                onChange={(e) => setFormData({ ...formData, qty: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Reason</label>
              <select
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              >
                <option value="SPOILAGE">Spoilage</option>
                <option value="PREP_WASTE">Prep Waste</option>
                <option value="BREAKAGE">Breakage</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
              <input
                type="text"
                value={formData.notes || ''}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                placeholder="Optional notes..."
              />
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={() => setShowForm(false)}
              className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
            >
              Cancel
            </button>
            <button
              onClick={logWaste}
              disabled={!formData.item_id || !formData.qty}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium disabled:bg-gray-300"
            >
              Log Waste
            </button>
          </div>
        </div>
      )}

      {/* Waste Entries List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Recent Waste</h2>
        </div>

        <div className="divide-y divide-gray-200">
          {wasteEntries.map((entry) => (
            <div key={entry.id} className="p-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Trash2 className="w-6 h-6 text-red-600 dark:text-red-400" />
                <div>
                  <h3 className="font-semibold text-gray-900">{entry.item_name}</h3>
                  <p className="text-sm text-gray-600">
                    {entry.qty} {entry.unit} - {entry.reason}
                  </p>
                  {entry.notes && (
                    <p className="text-xs text-gray-500 italic">{entry.notes}</p>
                  )}
                </div>
              </div>

              <div className="text-right">
                <p className="text-sm text-gray-500">
                  {new Date(entry.created_at).toLocaleDateString()}
                </p>
                <p className="text-sm text-gray-500">
                  {new Date(entry.created_at).toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))}

          {wasteEntries.length === 0 && (
            <div className="p-12 text-center text-gray-400">
              <Trash2 className="w-16 h-16 mx-auto mb-4" />
              <p>No waste entries yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default WasteLog;
