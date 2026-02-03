import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../lib/api';

const MultiVenueContext = createContext();

export function MultiVenueProvider({ children }) {
  const [availableVenues, setAvailableVenues] = useState([]);
  const [currentVenue, setCurrentVenue] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAvailableVenues();
  }, []);

  const loadAvailableVenues = async () => {
    try {
      const user = JSON.parse(localStorage.getItem('restin_user') || '{}');
      const allowedVenueIds = user.allowedVenueIds || [user.venueId];

      // Load all venues user has access to
      const venuesRes = await api.get('/venues');
      console.log('Venues response full:', venuesRes);
      const data = venuesRes.data;

      let userVenues = [];
      if (Array.isArray(data)) {
        userVenues = data.filter(v => allowedVenueIds.includes(v.id));
      } else if (data && Array.isArray(data.items)) {
        userVenues = data.items.filter(v => allowedVenueIds.includes(v.id));
      } else if (data && typeof data === 'object') {
        // If it's a single venue object or something else, try to wrap it
        console.log('Data is object but not array, checking for single venue...');
        if (data.id && allowedVenueIds.includes(data.id)) {
          userVenues = [data];
        } else {
          console.warn('Data object does not look like a venue or list:', data);
        }
      } else {
        console.error('Venues response data is missing or invalid type:', typeof data);
      }

      setAvailableVenues(userVenues);

      // Set current venue from localStorage or default
      const savedVenueId = localStorage.getItem('restin_venue');
      const currentV = userVenues.find(v => v.id === savedVenueId) || userVenues[0];
      setCurrentVenue(currentV);

    } catch (error) {
      console.error('Failed to load venues:', error);
    } finally {
      setLoading(false);
    }
  };

  const switchVenue = (venueId) => {
    const venue = availableVenues.find(v => v.id === venueId);
    if (venue) {
      setCurrentVenue(venue);
      localStorage.setItem('restin_venue', venueId);
      // Reload page to refresh all data for new venue
      window.location.reload();
    }
  };

  const value = {
    availableVenues,
    currentVenue,
    loading,
    switchVenue,
    hasMultipleVenues: availableVenues.length > 1
  };

  return (
    <MultiVenueContext.Provider value={value}>
      {children}
    </MultiVenueContext.Provider>
  );
}

export function useMultiVenue() {
  const context = useContext(MultiVenueContext);
  if (!context) {
    throw new Error('useMultiVenue must be used within MultiVenueProvider');
  }
  return context;
}
