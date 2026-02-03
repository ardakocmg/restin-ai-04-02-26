import React, { useState, useEffect } from 'react';
import { ArrowRightLeft, Plus, MapPin } from 'lucide-react';
import axios from 'axios';
import StateModal from '../../components/StateModal';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function StockTransfers() {
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const venueId = localStorage.getItem('currentVenueId') || 'venue-caviar-bull';

  useEffect(() => {
    // Mock data
    setTransfers([
      {
        id: 'tr-001',
        from_location: 'Main Kitchen',
        to_location: 'Bar',
        item_name: 'Dom Pérignon 2012',
        qty: 3,
        unit: 'bottle',
        created_at: '2026-01-27T10:30:00Z'
      }
    ]);
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 p-6 flex items-center justify-center">
        <div className="text-white">Loading Transfers...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-4xl font-heading" style={{ color: '#F5F5F7' }}>
            STOCK TRANSFERS
          </h1>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary px-6 py-3 rounded-xl flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            New Transfer
          </button>
        </div>
        <p style={{ color: '#A1A1AA' }}>Move inventory between locations</p>
      </div>

      {/* Transfers List */}
      <div className="space-y-4">
        {transfers.map((transfer) => (
          <div key={transfer.id} className="card-dark p-6 rounded-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <ArrowRightLeft className="w-6 h-6 text-red-500" />
                <div>
                  <h3 className="font-semibold mb-1" style={{ color: '#F5F5F7' }}>
                    {transfer.item_name}
                  </h3>
                  <div className="flex items-center gap-2 text-sm">
                    <span style={{ color: '#A1A1AA' }}>{transfer.from_location}</span>
                    <ArrowRightLeft className="w-3 h-3" style={{ color: '#71717A' }} />
                    <span style={{ color: '#A1A1AA' }}>{transfer.to_location}</span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xl font-bold text-red-500">
                  {transfer.qty} {transfer.unit}
                </div>
                <div className="text-xs" style={{ color: '#71717A' }}>
                  {new Date(transfer.created_at).toLocaleDateString()}
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
          title="Create Stock Transfer"
          message="Stock transfer form will be implemented here. Select item, from/to locations, and quantity."
          actions={[
            { label: 'Close', onClick: () => setShowCreateModal(false) }
          ]}
          onClose={() => setShowCreateModal(false)}
        />
      )}
    </div>
  );
}
