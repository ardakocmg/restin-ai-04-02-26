import React from 'react';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Filter } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function FilterBar({ filters, onFilterChange, className }) {
  return (
    <div className={cn('flex items-center gap-3 p-4 rounded-lg', className)}
      style={{ backgroundColor: '#18181B', border: '1px solid rgba(255, 255, 255, 0.1)' }}
    >
      <Filter className="h-4 w-4" style={{ color: '#A1A1AA' }} />
      <span className="text-sm font-medium" style={{ color: '#D4D4D8' }}>Filters:</span>
      
      {filters.map((filter) => (
        <Select
          key={filter.key}
          value={filter.value}
          onValueChange={(value) => onFilterChange(filter.key, value)}
        >
          <SelectTrigger className="w-[180px]">
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
