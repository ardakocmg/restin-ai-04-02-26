import React, { useState } from 'react';
import { logger } from '@/lib/logger';

import { useNavigate } from 'react-router-dom';

import { cn } from '@/lib/utils';

import { Button } from '@/components/ui/button';

import { Input } from '@/components/ui/input';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';

import { Search, Bell, Menu, LogOut, User } from 'lucide-react';

import VenueSwitcher from '../components/VenueSwitcher';

export default function TopBar({ onMenuToggle, user }) {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  const handleLogout = () => {
    localStorage.removeItem('restin_token');
    localStorage.removeItem('restin_user');
    navigate('/login');
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // Implement search functionality
      logger.info('Search:', { query: searchQuery });
    }
  };

  const getInitials = (name) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U';
  };

  return (
    <header className="sticky top-0 z-30 h-16 border-b border-border bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="flex h-full items-center justify-between px-4 gap-4">
        {/* Mobile Menu Button */}
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onMenuToggle}
         >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="flex-1 max-w-md hidden md:block">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input aria-label="Search orders, items, staff..."
              type="search"
              placeholder="Search orders, items, staff..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-9 bg-background border-border focus:bg-white"
              autoComplete="off"
            />
          </div>
        </form>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          {/* Venue Switcher */}
          <VenueSwitcher />

          {/* Notifications */}
          <Button variant="ghost" size="icon" className="relative hidden sm:flex" aria-label="Action">
            <Bell className="h-5 w-5" />
            <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full" />
          </Button>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2 px-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-blue-100 text-blue-600 dark:text-blue-400 text-xs font-medium">
                    {getInitials(user?.name)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium hidden md:inline">{user?.name}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">{user?.name}</p>
                  <p className="text-xs text-gray-500">{user?.role}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/manager/profile')}>
                <User className="mr-2 h-4 w-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}