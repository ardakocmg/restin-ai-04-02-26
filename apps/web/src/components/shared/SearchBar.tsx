'use client';
import React from 'react';
import { Input } from '@antigravity/ui';
import { Search } from 'lucide-react';

export default function SearchBar({ onSearch, placeholder }: any) {
    return (
        <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-500 h-4 w-4" />
            <Input
                className="pl-10 bg-zinc-900 border-zinc-800"
                placeholder={placeholder || "Search..."}
                onChange={(e) => onSearch(e.target.value)}
            />
        </div>
    );
}
