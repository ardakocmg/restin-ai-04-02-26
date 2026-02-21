import { logger } from '@/lib/logger';
import { useEffect,useState } from 'react';
import api from '../lib/api';

const DEFAULT_SETTINGS = {
  search: {
    kds_enabled: true,
    pos_enabled: true,
    admin_enabled: true,
    kds_default_scope: 'local',
    pos_default_scope: 'auto',
    admin_default_scope: 'global'
  },
  ui: {
    palette: {
      NEW: "#2F80ED",
      PREPARING: "#F2994A",
      READY: "#27AE60",
      DONE: "#828282",
      HELD: "#EB5757",
      PASS: "#9B51E0"
    },
    bottom_nav_enabled: true
  },
  pos: {
    send_default_print_only: true,
    send_checkbox_kds: true,
    send_checkbox_stock: true,
    send_checkbox_print: true,
    bill_require_done: true,
    bill_require_done_message: "Some items are not completed yet. Please wait for DONE items before printing the bill."
  },
  kds: {
    item_mode: true,
    show_seat: true,
    show_course: true,
    show_round_badge: true,
    require_pass_approval: true,
    allow_done_only_on_deliver: true
  },
  ops: {
    auto_complimentary_on_open: true,
    complimentary_items: ["Bread", "Amuse Bouche"],
    specials_enabled: true,
    specials_list: [],
    push_low_stock_enabled: true,
    low_stock_threshold: 3
  }
};

export function useVenueSettings(venueId) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!venueId) {
      setSettings(DEFAULT_SETTINGS);
      setLoading(false);
      return;
    }

    // Try to load from API
    (async () => {
      try {
        const response = await api.get(`/venues/${venueId}/settings`);
        // Backend returns {settings: {...}}, extract the settings object
        const backendSettings = response.data?.settings || response.data || {};
        
        // Deep merge with defaults
        const merged = deepMerge(DEFAULT_SETTINGS, backendSettings);
        setSettings(merged);
        
        // Cache in localStorage
        localStorage.setItem(`venue_settings_${venueId}`, JSON.stringify(merged));
      } catch (error) {
        logger.error("Failed to load venue settings:", error);
        // Fallback to localStorage
        const cached = localStorage.getItem(`venue_settings_${venueId}`);
        if (cached) {
          try {
            setSettings(JSON.parse(cached));
          } catch {
            setSettings(DEFAULT_SETTINGS);
          }
        } else {
          setSettings(DEFAULT_SETTINGS);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [venueId]);

  return { settings, loading };
}

function deepMerge(base, update) {
  const result = { ...base };
  for (const key in update) {
    if (update[key] && typeof update[key] === 'object' && !Array.isArray(update[key])) {
      result[key] = deepMerge(base[key] || {}, update[key]);
    } else {
      result[key] = update[key];
    }
  }
  return result;
}
