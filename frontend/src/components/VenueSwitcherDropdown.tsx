import React, { useState, useEffect } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Building2, Check, ChevronDown } from 'lucide-react';
import { useSubdomain } from '../context/SubdomainContext';
import api from '../lib/api';
import { logger } from '@/lib/logger';

export default function VenueSwitcherDropdown() {
  const { venue, group, module, switchVenue } = useSubdomain();
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (group?.id) {
      loadGroupVenues();
    }
  }, [group]);

  const loadGroupVenues = async () => {
    try {
      const response = await api.get(`/venue-groups/${group.id}/venues`);
      setVenues(response.data);
    } catch (error) {
      logger.error('Failed to load venues:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVenueSwitch = (targetVenue) => {
    if (targetVenue.id === venue?.id) return;

    const currentModule = module || 'admin';
    switchVenue(targetVenue.slug, currentModule);
  };

  if (!group || venues.length <= 1) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="flex items-center space-x-2">
          <Building2 className="h-4 w-4" />
          <span className="hidden sm:inline">Switch Venue</span>
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>
          {group.name as string}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {loading ? (
          <DropdownMenuItem disabled>
            Loading venues...
          </DropdownMenuItem>
        ) : (
          venues.map((v) => (
            <DropdownMenuItem
              key={v.id}
              onClick={() => handleVenueSwitch(v)}
              className="flex items-center justify-between cursor-pointer"
            >
              <div className="flex flex-col">
                <span className="font-medium">{v.name}</span>
                {v.location && (
                  <span className="text-xs text-muted-foreground">{v.location}</span>
                )}
              </div>
              {v.id === venue?.id && (
                <Check className="h-4 w-4 text-primary" />
              )}
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
