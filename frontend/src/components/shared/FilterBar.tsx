import React from 'react';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Filter } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function FilterBar({ filters, onFilterChange, className }) {
  return (
    <div className={cn('flex items-center gap-3 p-4 rounded-lg bg-card border', className)}>
      <Filter className="h-4 w-4 text-muted-foreground" />
      <span className="text-sm font-medium text-foreground">Filters:</span>

      {filters.map((filter) => (
        <Select aria-label="Select option"
          key={filter.key}
          value={filter.value}
          onValueChange={(value) => onFilterChange(filter.key, value)}
        >
          <SelectTrigger aria-label="Select option" className="w-[180px]">
            <SelectValue placeholder={filter.label} />
          </SelectTrigger>
          <SelectContent>
            {filter.options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ))}
    </div>
  );
}
