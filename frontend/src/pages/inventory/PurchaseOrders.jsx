import React, { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';

import { FileText, Plus, CheckCircle, Clock } from 'lucide-react';

import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

function PurchaseOrders() {
  const [pos, setPos] = useState([]);
  const [loading, setLoading] = useState(true);
  const venueId = localStorage.getItem('currentVenueId') || 'venue-caviar-bull';

  useEffect(() => {
    fetchPOs();
  }, []);

  const fetchPOs = async () => {
    try {
      const token = localStorage.getItem('restin_token');
      const response = await axios.get(
        `${API_URL}/api/inventory/purchase-orders?venue_id=${venueId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPos(response.data.purchase_orders || []);
    } catch (error) {
      logger.error('Error fetching POs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      DRAFT: 'bg-gray-100 text-gray-700',
      APPROVED: 'bg-blue-100 text-blue-700',
      SENT: 'bg-purple-100 text-purple-700',
      RECEIVED: 'bg-green-100 text-green-700',
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-4xl font-bold text-foreground">Purchase Orders</h1>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Plus className="w-5 h-5" />
            New PO
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {pos.map((po) => (
          <div key={po.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition cursor-pointer">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                <div>
                  <h3 className="text-lg font-semibold text-foreground">{po.display_id}</h3>
                  <p className="text-sm text-gray-600">{po.supplier_name}</p>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(po.status)}`}>
                {po.status}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-100">
              <div>
                <p className="text-sm text-gray-600">Lines</p>
                <p className="text-lg font-semibold text-foreground">{po.lines?.length || 0}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Total</p>
                <p className="text-lg font-semibold text-foreground">€{po.total?.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Created</p>
                <p className="text-sm text-foreground">{new Date(po.created_at).toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        ))}

        {pos.length === 0 && (
          <div className="bg-white rounded-xl border-2 border-dashed border-gray-300 p-12 text-center">
            <FileText className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">No purchase orders yet</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default PurchaseOrders;