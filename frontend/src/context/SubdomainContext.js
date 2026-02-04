import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../lib/api';

/**
 * Subdomain Context for Hybrid Multi-Tenant Architecture
 * Detects venue and module from subdomain
 * Pattern: {venueSlug}-{module}.domain.com
 */

const SubdomainContext = createContext();

export const SUPPORTED_MODULES = [
  'pos',
  'kds',
  'admin',
  'management',
  'inventory',
  'accounting',
  'finance',
  'hr',
  'workforce',
  'analytics',
  'reports',
  'crm',
  'reputation',
  'loyalty',
  'system',
  'integrations',
  'reservations'
];

export function SubdomainProvider({ children }) {
  const [context, setContext] = useState({
    isSubdomain: false,
    venueSlug: null,
    module: null,
    venue: null,
    group: null,
    loading: true
  });

  useEffect(() => {
    detectSubdomain();
  }, []);

  const detectSubdomain = async () => {
    try {
      const hostname = window.location.hostname;

      // Skip localhost and IP addresses
      if (hostname === 'localhost' || hostname.startsWith('192.168') || hostname === '127.0.0.1') {
        setContext(prev => ({ ...prev, loading: false }));
        return;
      }

      // Parse subdomain
      const parts = hostname.split('.');
      if (parts.length < 3) {
        setContext(prev => ({ ...prev, loading: false }));
        return;
      }

      const subdomain = parts[0];
      const match = subdomain.match(/^([a-z0-9\-]+)-([a-z]+)$/);

      if (!match) {
        setContext(prev => ({ ...prev, loading: false }));
        return;
      }

      const venueSlug = match[1];
      const module = match[2];

      // Validate module
      if (!SUPPORTED_MODULES.includes(module)) {
        console.warn(`Unsupported module: ${module}`);
        setContext(prev => ({ ...prev, loading: false }));
        return;
      }

      // Fetch venue and group data
      const response = await api.get('/venue-groups/context/current');
      
      setContext({
        isSubdomain: true,
        venueSlug,
        module,
        venue: response.data.venue || null,
        group: response.data.group || null,
        loading: false
      });

    } catch (error) {
      console.error('Failed to detect subdomain:', error);
      setContext(prev => ({ ...prev, loading: false }));
    }
  };

  const switchVenue = (venueSlug, module) => {
    // Build new subdomain URL
    const hostname = window.location.hostname;
    const baseDomain = hostname.split('.').slice(1).join('.');
    const newHostname = `${venueSlug}-${module}.${baseDomain}`;
    const newUrl = `${window.location.protocol}//${newHostname}${window.location.pathname}`;
    
    // Navigate to new venue
    window.location.href = newUrl;
  };

  const value = {
    ...context,
    switchVenue,
    refreshContext: detectSubdomain
  };

  return (
    <SubdomainContext.Provider value={value}>
      {children}
    </SubdomainContext.Provider>
  );
}

export function useSubdomain() {
  const context = useContext(SubdomainContext);
  if (!context) {
    throw new Error('useSubdomain must be used within SubdomainProvider');
  }
  return context;
}
