import React, { useState, useEffect } from 'react';
import { Plus, Factory, Clock, CheckCircle } from 'lucide-react';
import axios from 'axios';
import StateModal from '../../components/StateModal';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function ProductionManagement() {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const venueId = localStorage.getItem('currentVenueId') || 'venue-caviar-bull';

  useEffect(() => {
    // Mock data for now
    setBatches([
      {
        id: 'batch-001',
        recipe_name: 'House-made Pasta',
        batch_qty: 20,
        unit: 'kg',
        status: 'COMPLETED',
        started_at: '2026-01-27T08:00:00Z',
        completed_at: '2026-01-27T12:00:00Z'
      },
      {
        id: 'batch-002',
        recipe_name: 'Tomato Sauce Base',
        batch_qty: 15,
        unit: 'L',
        status: 'IN_PROGRESS',
        started_at: '2026-01-27T10:00:00Z',
        completed_at: null
      }
    ]);
    setLoading(false);
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-950/30 text-green-400 border-green-500/30';
      case 'IN_PROGRESS':
        return 'bg-blue-950/30 text-blue-400 border-blue-500/30';
      case 'CANCELLED':
        return 'bg-red-950/30 text-red-400 border-red-500/30';
      default:
        return 'bg-zinc-900 text-zinc-400 border-white/10';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 p-6 flex items-center justify-center">
        <div className="text-white">Loading Production...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-4xl font-heading" style={{ color: '#F5F5F7' }}>
            PRODUCTION MANAGEMENT
          </h1>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary px-6 py-3 rounded-xl flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            New Batch
          </button>
        </div>
        <p style={{ color: '#A1A1AA' }}>Track production batches and recipe execution</p>
      </div>

      {/* Production Batches */}
      <div className="space-y-4">
        {batches.map((batch) => (
          <div
            key={batch.id}
            className="card-dark p-6 rounded-xl hover:border-red-500/30 transition-all"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg" style={{ backgroundColor: 'rgba(229, 57, 53, 0.15)' }}>
                  <Factory className="w-6 h-6 text-red-500" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-1" style={{ color: '#F5F5F7' }}>
                    {batch.recipe_name}
                  </h3>
                  <p className="text-sm" style={{ color: '#A1A1AA' }}>
                    Batch: {batch.batch_qty} {batch.unit}
                  </p>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(batch.status)}`}>
                {batch.status}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-white/10">
              <div>
                <p className="text-xs mb-1" style={{ color: '#71717A' }}>Started</p>
                <p className="text-sm" style={{ color: '#D4D4D8' }}>
                  {new Date(batch.started_at).toLocaleTimeString()}
                </p>
              </div>
              {batch.completed_at && (
                <div>
                  <p className="text-xs mb-1" style={{ color: '#71717A' }}>Completed</p>
                  <p className="text-sm" style={{ color: '#D4D4D8' }}>
                    {new Date(batch.completed_at).toLocaleTimeString()}
                  </p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Create Modal Placeholder */}
      {showCreateModal && (
        <StateModal
          type="info"
          title="Create Production Batch"
          message="Production batch creation form will be implemented here. Select recipe, enter quantity, and start production."
          actions={[
            { label: 'Close', onClick: () => setShowCreateModal(false) }
          ]}
          onClose={() => setShowCreateModal(false)}
        />
      )}
    </div>
  );
}
