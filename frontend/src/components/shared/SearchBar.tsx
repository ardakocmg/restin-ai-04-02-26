import React from 'react';
import { Input } from '../ui/input';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function SearchBar({ value, onChange, placeholder = 'Search...', className }) {
  return (
    <div className={cn('relative', className)}>
      <Search
        className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4"
        style={{ color: '#71717A' }} /* keep-inline */ /* keep-inline */ /* keep-inline */
      />
      <Input
        type="search"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-10"
        style={{ paddingLeft: '2.5rem' }} /* keep-inline */ /* keep-inline */ /* keep-inline */
        autoComplete="off"
        data-1p-ignore
        data-lpignore="true"
      />
    </div>
  );
}
