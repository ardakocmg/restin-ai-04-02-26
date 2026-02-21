import { Button } from '@/components/ui/button';
import {
DropdownMenu,
DropdownMenuContent,
DropdownMenuItem,
DropdownMenuLabel,
DropdownMenuSeparator,
DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Building2,CheckCircle2,ChevronDown } from 'lucide-react';
import { useMultiVenue } from '../context/MultiVenueContext';

export default function VenueSwitcher() {
  const { availableVenues, currentVenue, switchVenue, hasMultipleVenues } = useMultiVenue();

  if (!hasMultipleVenues) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg">
        <Building2 className="h-4 w-4 text-slate-600" />
        <span className="text-sm font-medium text-slate-900">{currentVenue?.name || 'No Venue'}</span>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="justify-between min-w-[200px]">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            <span className="text-sm font-medium truncate">{currentVenue?.name || 'Select Venue'}</span>
          </div>
          <ChevronDown className="h-4 w-4 ml-2 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[200px]">
        <DropdownMenuLabel>Switch Venue</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {availableVenues.map((venue) => (
          <DropdownMenuItem
            key={venue.id}
            onClick={() => switchVenue(venue.id)}
            className="cursor-pointer"
          >
            <div className="flex items-center justify-between w-full">
              <span>{venue.name}</span>
              {currentVenue?.id === venue.id && (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              )}
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
