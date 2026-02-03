import { useEffect, useMemo, useState } from 'react';
import { hrFeatureFlagsAPI } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useVenue } from '../context/VenueContext';

export const useHRFeatureFlags = () => {
  const { user } = useAuth();
  const { activeVenue } = useVenue();
  const [flags, setFlags] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadFlags = async () => {
      if (!activeVenue?.id) return;
      try {
        setLoading(true);
        const response = await hrFeatureFlagsAPI.get(activeVenue.id);
        setFlags(response.data.flags || []);
      } catch (error) {
        setFlags([]);
      } finally {
        setLoading(false);
      }
    };
    loadFlags();
  }, [activeVenue?.id]);

  const getAccess = useMemo(() => {
    return (moduleKey) => {
      const flag = flags.find((item) => item.module_key === moduleKey);
      if (!flag) {
        return { enabled: true, flag: null };
      }
      const roleAllowed = !flag.roles?.length || flag.roles.includes(user?.role);
      return { enabled: flag.enabled && roleAllowed, flag };
    };
  }, [flags, user?.role]);

  return { flags, loading, getAccess, setFlags };
};
