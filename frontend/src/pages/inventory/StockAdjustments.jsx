import React, { useState, useEffect } from 'react';
import { Edit, Plus, TrendingUp, TrendingDown } from 'lucide-react';
import api from '../../lib/api';
import StateModal from '../../components/StateModal';
import { useVenue } from '../../context/VenueContext';

export default function StockAdjustments() {
  const { activeVenue } = useVenue();
  const [adjustments, setAdjustments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    if (activeVenue?.id) loadAdjustments();
  }, [activeVenue?.id]);

  const loadAdjustments = async () => {
    try {
      const res = await api.get('/inventory/adjustments', { params: { venue_id: activeVenue.id } });
      setAdjustments(Array.isArray(res.data) ? res.data : res.data.adjustments || []);
    } catch (err) {
      console.warn('Failed to load stock adjustments');
      setAdjustments([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 p-6 flex items-center justify-center">
        <div className="text-white">Loading Adjustments...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-4xl font-heading" style={{ color: '#F5F5F7' }}>
            STOCK ADJUSTMENTS
          </h1>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary px-6 py-3 rounded-xl flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            New Adjustment
          </button>
        </div>
        <p style={{ color: '#A1A1AA' }}>Manual stock corrections and adjustments</p>
      </div>

      {/* Adjustments List */}
      <div className="space-y-4">
        {adjustments.length === 0 ? (
          <div className="card-dark p-12 rounded-xl text-center">
            <p className="text-zinc-500">No stock adjustments found</p>
          </div>
        ) : adjustments.map((adj) => (
          <div key={adj.id || adj._id} className="card-dark p-6 rounded-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div
                  className="p-3 rounded-lg"
                  style={{
                    backgroundColor: (adj.qty_delta || adj.quantity_delta || 0) > 0
                      ? 'rgba(74, 222, 128, 0.15)'
                      : 'rgba(229, 57, 53, 0.15)'
                  }}
                >
                  {(adj.qty_delta || adj.quantity_delta || 0) > 0 ? (
                    <TrendingUp className="w-6 h-6 text-green-500" />
                  ) : (
                    <TrendingDown className="w-6 h-6 text-red-500" />
                  )}
                </div>
                <div>
                  <h3 className="font-semibold mb-1" style={{ color: '#F5F5F7' }}>
                    {adj.item_name || adj.product_name || 'Unknown Item'}
                  </h3>
                  <div className="flex items-center gap-3">
                    <span className="text-sm px-2 py-1 rounded bg-zinc-900 border border-white/10" style={{ color: '#A1A1AA' }}>
                      {(adj.reason || 'ADJUSTMENT').replace(/_/g, ' ')}
                    </span>
                    {adj.notes && (
                      <span className="text-xs" style={{ color: '#71717A' }}>{adj.notes}</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className={`text-2xl font-bold ${(adj.qty_delta || adj.quantity_delta || 0) > 0 ? 'text-green-500' : 'text-red-500'
                  }`}>
                  {(adj.qty_delta || adj.quantity_delta || 0) > 0 ? '+' : ''}{adj.qty_delta || adj.quantity_delta || 0} {adj.unit || adj.base_unit || ''}
                </div>
                <div className="text-xs" style={{ color: '#71717A' }}>
                  {adj.created_at ? new Date(adj.created_at).toLocaleDateString() : ''}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <StateModal
          type="info"
          title="Create Adjustment"
          message="Stock adjustment form will be implemented here. Select item, enter quantity change (+/-), and reason."
          actions={[
            { label: 'Close', onClick: () => setShowCreateModal(false) }
          ]}
          onClose={() => setShowCreateModal(false)}
        />
      )}
    </div>
  );
}
