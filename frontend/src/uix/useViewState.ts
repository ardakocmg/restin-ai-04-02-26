import { useState, useEffect } from 'react';
import api from '../lib/api';
import { logger } from '@/lib/logger';

export function useViewState(venueId, pageKey) {
  const [viewState, setViewState] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (venueId && pageKey) {
      loadViewState();
    }
  }, [venueId, pageKey]);

  const loadViewState = async () => {
    try {
      const res = await api.get(`/uix/view-state?venue_id=${venueId}&page_key=${pageKey}`);
      setViewState(res.data?.data);
    } catch (error) {
      logger.error('Failed to load view state:', error);
      // Use default
      setViewState({
        ui: { filters_open: true, filter_sections: {} },
        query: { q: '', filters: {}, sort: 'name', page_size: 50 }
      });
    } finally {
      setLoading(false);
    }
  };

  const saveViewState = async (ui, query) => {
    try {
      await api.put(`/uix/view-state?venue_id=${venueId}&page_key=${pageKey}`, {
        ui,
        query
      });
    } catch (error) {
      logger.error('Failed to save view state:', error);
    }
  };

  return { viewState, loading, saveViewState, refreshViewState: loadViewState };
}
