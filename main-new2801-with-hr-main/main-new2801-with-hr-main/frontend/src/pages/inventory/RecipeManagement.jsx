import React, { useState, useEffect } from 'react';
import { Plus, ChefHat, DollarSign, Package } from 'lucide-react';
import axios from 'axios';
import StateModal from '../../components/StateModal';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function RecipeManagement() {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const venueId = localStorage.getItem('currentVenueId') || 'venue-caviar-bull';

  useEffect(() => {
    loadRecipes();
  }, []);

  const loadRecipes = async () => {
    try {
      const token = localStorage.getItem('restin_token');
      const response = await axios.get(
        `${API_URL}/api/inventory/recipes?venue_id=${venueId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setRecipes(response.data.recipes || []);
    } catch (error) {
      console.error('Error loading recipes:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 p-6 flex items-center justify-center">
        <div className="text-white">Loading Recipes...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-4xl font-heading" style={{ color: '#F5F5F7' }}>
            RECIPE MANAGEMENT
          </h1>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary px-6 py-3 rounded-xl flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            New Recipe
          </button>
        </div>
        <p style={{ color: '#A1A1AA' }}>Manage recipes, components, and cost calculations</p>
      </div>

      {/* Recipes Grid */}
      {recipes.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <ChefHat className="w-20 h-20 mx-auto mb-4" style={{ color: '#52525B' }} />
            <h3 className="text-xl font-heading mb-2" style={{ color: '#D4D4D8' }}>No Recipes Yet</h3>
            <p className="mb-6" style={{ color: '#71717A' }}>Create your first recipe to get started</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-primary px-6 py-3 rounded-xl"
            >
              <Plus className="w-5 h-5 inline mr-2" />
              Create Recipe
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recipes.map((recipe) => (
            <div
              key={recipe.id}
              className="card-dark p-6 rounded-xl hover:border-red-500/50 cursor-pointer transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-lg" style={{ backgroundColor: 'rgba(229, 57, 53, 0.15)' }}>
                    <ChefHat className="w-6 h-6 text-red-500" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold" style={{ color: '#F5F5F7' }}>
                      {recipe.name}
                    </h3>
                    <p className="text-sm" style={{ color: '#A1A1AA' }}>Yield: {recipe.yield_qty} {recipe.yield_unit}</p>
                  </div>
                </div>
              </div>

              {/* Components */}
              <div className="space-y-2 mb-4">
                <p className="text-xs font-semibold" style={{ color: '#71717A' }}>COMPONENTS:</p>
                {recipe.components?.slice(0, 3).map((comp, idx) => (
                  <div key={idx} className="text-sm flex justify-between">
                    <span style={{ color: '#D4D4D8' }}>{comp.item_name}</span>
                    <span style={{ color: '#A1A1AA' }}>{comp.qty} {comp.unit}</span>
                  </div>
                ))}
                {recipe.components?.length > 3 && (
                  <p className="text-xs" style={{ color: '#71717A' }}>+{recipe.components.length - 3} more</p>
                )}
              </div>

              {/* Cost */}
              <div className="pt-4 border-t border-white/10 flex justify-between items-center">
                <span className="text-sm" style={{ color: '#A1A1AA' }}>Total Cost:</span>
                <span className="text-xl font-bold text-red-500">
                  €{recipe.total_cost?.toFixed(2) || '0.00'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal Placeholder */}
      {showCreateModal && (
        <StateModal
          type="info"
          title="Create Recipe"
          message="Recipe creation form will be implemented here. You'll be able to add components, set yield, and calculate costs."
          actions={[
            { label: 'Close', onClick: () => setShowCreateModal(false) }
          ]}
          onClose={() => setShowCreateModal(false)}
        />
      )}
    </div>
  );
}
