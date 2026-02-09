import React, { useState, useEffect, useRef } from 'react';
import { logger } from '@/lib/logger';

import { Card, CardContent } from '@/components/ui/card';

import { Button } from '@/components/ui/button';

import {
  ChevronLeft,
  ChevronRight,
  Filter,
  Settings,
  Download,
  Copy,
  Trash2,
  Edit,
  MoreHorizontal,
  Plus,
  Calendar as CalendarIcon,
  Search,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  ChevronDown
} from 'lucide-react';

import api from '@/lib/api';

import { Badge } from '@/components/ui/badge';

import { cn } from '@/lib/utils';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { toast } from 'sonner';

export default function Scheduler() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [weekStart, setWeekStart] = useState('2026-01-26');
  const [groupBy, setGroupBy] = useState('none'); // 'cost_centre', 'occupation', 'none'
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, cell: null });
  const [sortConfig, setSortConfig] = useState({ key: 'employee_name', direction: 'asc' });
  const [filters, setFilters] = useState({
    employee_name: '',
    occupation: '',
    cost_centre: '',
    vendor: ''
  });
  const [globalSearch, setGlobalSearch] = useState('');
  const [timeRange, setTimeRange] = useState('all'); // 'all', 'morning', 'afternoon', 'night'
  const [viewType, setViewType] = useState('week'); // 'week', 'month'

  useEffect(() => {
    fetchData();
    // Close context menu on global click
    const handleClick = () => setContextMenu({ ...contextMenu, visible: false });
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, [weekStart, viewType]);

  const fetchData = async () => {
    try {
      const numDays = viewType === 'month' ? 28 : 7;
      const response = await api.get(`scheduler/data?week_start=${weekStart}&num_days=${numDays}`);
      setData(response.data);
    } catch (error) {
      logger.error('Failed to fetch scheduler data:', error);
      toast.error("Failed to load scheduler data");
    } finally {
      setLoading(false);
    }
  };

  const dayKeys = React.useMemo(() => {
    if (!data?.week_start || !data?.week_end) return [];
    const keys = [];
    let curr = new Date(data.week_start);
    const end = new Date(data.week_end);
    while (curr <= end) {
      keys.push(curr.toISOString().split('T')[0]);
      curr.setDate(curr.getDate() + 1);
    }
    return keys;
  }, [data]);

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const isFiltered = Object.values(filters).some(f => f !== '') || timeRange !== 'all' || globalSearch !== '';

  const resetFilters = () => {
    setFilters({
      employee_name: '',
      occupation: '',
      cost_centre: '',
      vendor: ''
    });
    setGlobalSearch('');
    setTimeRange('all');
  };

  const filteredAndSortedRows = React.useMemo(() => {
    if (!data?.rows) return [];

    let result = [...data.rows];

    // Apply Global Search
    if (globalSearch) {
      const search = globalSearch.toLowerCase();
      result = result.filter(row =>
        row.employee_name.toLowerCase().includes(search) ||
        row.occupation.toLowerCase().includes(search) ||
        row.cost_centre.toLowerCase().includes(search)
      );
    }

    // Apply column filters
    Object.keys(filters).forEach(key => {
      if (filters[key]) {
        result = result.filter(row =>
          row[key]?.toString().toLowerCase().includes(filters[key].toLowerCase())
        );
      }
    });

    // Apply Time Range Filter
    if (timeRange !== 'all') {
      result = result.filter(row => {
        return dayKeys.some(day => {
          const cell = row[day];
          if (!cell || cell.cell_type !== 'WORK_SHIFT') return false;

          const startHr = parseInt(cell.start_time.split(':')[0]);
          if (timeRange === 'morning') return startHr >= 6 && startHr < 14;
          if (timeRange === 'afternoon') return startHr >= 14 && startHr < 22;
          if (timeRange === 'night') return startHr >= 22 || startHr < 6;
          return true;
        });
      });
    }

    // Apply sorting
    if (sortConfig.key) {
      result.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        // Special handling for numeric-ish strings
        if (sortConfig.key === 'basic_hrs_overtime') {
          const parseHrs = (s) => parseFloat(s?.toString().split('h')[0]) || 0;
          aValue = parseHrs(aValue);
          bValue = parseHrs(bValue);
        }

        if (aValue === undefined || aValue === null) aValue = '';
        if (bValue === undefined || bValue === null) bValue = '';

        if (typeof aValue === 'string') aValue = aValue.toLowerCase();
        if (typeof bValue === 'string') bValue = bValue.toLowerCase();

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [data, filters, sortConfig, timeRange, globalSearch]);

  // Indigo Color mapping
  const getCellStyles = (cell) => {
    if (!cell) return 'bg-white/5 hover:bg-white/10';

    if (cell.cell_type === 'OFF_DAY') {
      return 'bg-pink-500/10 text-pink-400 border-l-2 border-pink-500 hover:bg-pink-500/20';
    }
    if (cell.cell_type === 'WORK_SHIFT') {
      return 'bg-blue-600/10 text-blue-400 border-l-2 border-blue-500 hover:bg-blue-600/20';
    }
    return 'bg-white/5';
  };

  const handleRightClick = (e, cell, employee, day) => {
    e.preventDefault();
    if (!cell) return;
    setContextMenu({
      visible: true,
      x: e.pageX,
      y: e.pageY,
      cell: { ...cell, employee, day }
    });
  };

  const handleAction = (action) => {
    if (!contextMenu.cell) return;
    toast.success(`${action} shift for ${contextMenu.cell.employee}`);
    setContextMenu({ ...contextMenu, visible: false });
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-[#0A0A0B]">
      <div className="animate-pulse flex flex-col items-center gap-4">
        <div className="h-12 w-12 rounded-full border-t-2 border-blue-500 animate-spin" />
        <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">Loading Roster...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-zinc-100 flex flex-col">
      {/* Top Bar - Exact Replica of Reference Image */}
      <div className="h-16 border-b border-white/5 flex items-center justify-between px-6 bg-zinc-900/50 backdrop-blur-xl sticky top-0 z-20">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-white uppercase tracking-tighter">Scheduler</h1>
            <Badge variant="outline" className="border-zinc-700 text-zinc-500 text-[10px] uppercase ml-2 tracking-widest hidden lg:flex">
              v2.1.0
            </Badge>
          </div>

          <div className="h-8 w-px bg-white/10" />

          {/* View Toggle */}
          <div className="flex items-center bg-black/40 rounded-lg p-1 border border-white/5 shadow-inner">
            <button
              onClick={() => setViewType('week')}
              className={cn(
                "px-3 py-1 rounded text-[10px] font-bold uppercase tracking-widest transition-all",
                viewType === 'week' ? "bg-blue-500/20 text-blue-400 shadow-[0_0_12px_-2px_rgba(59,130,246,0.3)]" : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              Week
            </button>
            <button
              onClick={() => setViewType('month')}
              className={cn(
                "px-3 py-1 rounded text-[10px] font-bold uppercase tracking-widest transition-all",
                viewType === 'month' ? "bg-blue-500/20 text-blue-400 shadow-[0_0_12px_-2px_rgba(59,130,246,0.3)]" : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              Month
            </button>
          </div>

          {/* Date Navigation */}
          <div className="flex items-center gap-2 bg-black/40 rounded-lg p-1 border border-white/5 shadow-inner">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 hover:bg-white/10 rounded-md text-zinc-400 hover:text-white"
              onClick={() => {
                const d = new Date(weekStart);
                d.setDate(d.getDate() - (viewType === 'month' ? 28 : 7));
                setWeekStart(d.toISOString().split('T')[0]);
              }}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex flex-col items-center px-4 min-w-[140px]">
              <span className="text-xs font-bold text-zinc-100 font-mono tracking-tight">{data?.week_start}</span>
              <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">{viewType === 'month' ? 'Month View' : 'Week View'}</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 hover:bg-white/10 rounded-md text-zinc-400 hover:text-white"
              onClick={() => {
                const d = new Date(weekStart);
                d.setDate(d.getDate() + (viewType === 'month' ? 28 : 7));
                setWeekStart(d.toISOString().split('T')[0]);
              }}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="h-8 w-px bg-white/10" />

          {/* Global Search */}
          <div className="relative group w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 group-focus-within:text-blue-500 transition-colors" />
            <input
              type="text"
              placeholder="Search personnel, role, unit..."
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              className="w-full bg-black/40 border border-white/5 rounded-full px-10 py-1.5 text-[11px] text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-blue-500/50 shadow-inner group-hover:bg-black/60 transition-all border-l-2 border-l-blue-500/30"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Shift Time Range Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className={cn(
                "h-8 border-white/10 bg-black/40 text-[10px] uppercase font-bold tracking-widest gap-2 flex hover:text-white transition-all",
                timeRange !== 'all' ? "text-blue-400 border-blue-500/30" : "text-zinc-100"
              )}>
                {timeRange === 'all' ? 'All Shifts' :
                  timeRange === 'morning' ? 'Morning (06-14)' :
                    timeRange === 'afternoon' ? 'Afternoon (14-22)' : 'Night (22-06)'}
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-[#18181b] border-white/10 text-zinc-300 shadow-2xl">
              <DropdownMenuItem className="text-xs hover:bg-white/5 cursor-pointer" onClick={() => setTimeRange('all')}>All Shifts</DropdownMenuItem>
              <DropdownMenuItem className="text-xs hover:bg-white/5 cursor-pointer" onClick={() => setTimeRange('morning')}>Morning (06-14)</DropdownMenuItem>
              <DropdownMenuItem className="text-xs hover:bg-white/5 cursor-pointer" onClick={() => setTimeRange('afternoon')}>Afternoon (14-22)</DropdownMenuItem>
              <DropdownMenuItem className="text-xs hover:bg-white/5 cursor-pointer" onClick={() => setTimeRange('night')}>Night (22-06)</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="h-4 w-px bg-white/10 mx-1" />

          {isFiltered && (
            <Button
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              className="h-8 text-[10px] font-black text-rose-500 uppercase tracking-widest hover:bg-rose-500/10 hover:text-rose-400 transition-all px-3 flex items-center gap-2"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Reset Filters
            </Button>
          )}

          <Button className="h-8 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold uppercase tracking-widest px-4 shadow-[0_0_15px_-3px_rgba(37,99,235,0.4)] transition-all">
            <Plus className="h-3.5 w-3.5 mr-2" />
            Create Shift
          </Button>

          <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500 hover:text-white hover:bg-white/5 transition-colors">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Main Grid Area */}
      <div className="flex-1 overflow-auto p-4 custom-scrollbar">
        <div className="border border-white/5 rounded-xl bg-zinc-900/30 overflow-hidden shadow-2xl">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-zinc-900/80 border-b border-white/5">
                <th className="p-4 text-left min-w-[200px] sticky left-0 bg-[#121214] z-10 border-r border-white/5 shadow-[4px_0_12px_-2px_rgba(0,0,0,0.5)]">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between cursor-pointer group/sort" onClick={() => handleSort('employee_name')}>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Employee</span>
                        {sortConfig.key === 'employee_name' ? (
                          sortConfig.direction === 'asc' ? <ArrowUp className="h-2.5 w-2.5 text-blue-500" /> : <ArrowDown className="h-2.5 w-2.5 text-blue-500" />
                        ) : (
                          <ArrowUpDown className="h-2.5 w-2.5 text-zinc-600 group-hover/sort:text-zinc-400" />
                        )}
                      </div>
                      <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">{filteredAndSortedRows.length} Staff</span>
                    </div>
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-2.5 w-2.5 text-zinc-600" />
                      <input
                        type="text"
                        placeholder="Filter..."
                        value={filters.employee_name}
                        onChange={(e) => handleFilterChange('employee_name', e.target.value)}
                        className="w-full bg-black/30 border border-white/5 rounded px-6 py-1 text-[9px] text-zinc-300 placeholder:text-zinc-700 outline-none focus:border-blue-500/50"
                      />
                    </div>
                  </div>
                </th>
                <th className="p-3 text-left min-w-[120px] bg-zinc-900/50 border-r border-white/5">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-1 cursor-pointer group/sort" onClick={() => handleSort('occupation')}>
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Occupation</span>
                      {sortConfig.key === 'occupation' ? (
                        sortConfig.direction === 'asc' ? <ArrowUp className="h-2.5 w-2.5 text-blue-500" /> : <ArrowDown className="h-2.5 w-2.5 text-blue-500" />
                      ) : (
                        <ArrowUpDown className="h-2.5 w-2.5 text-zinc-600 group-hover/sort:text-zinc-400" />
                      )}
                    </div>
                    <input
                      type="text"
                      placeholder="Filter..."
                      value={filters.occupation}
                      onChange={(e) => handleFilterChange('occupation', e.target.value)}
                      className="w-full bg-black/30 border border-white/5 rounded px-2 py-1 text-[9px] text-zinc-300 placeholder:text-zinc-700 outline-none focus:border-blue-500/50"
                    />
                  </div>
                </th>
                <th className="p-3 text-left min-w-[100px] bg-zinc-900/50 border-r border-white/5">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-1 cursor-pointer group/sort" onClick={() => handleSort('cost_centre')}>
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Cost Centre</span>
                      {sortConfig.key === 'cost_centre' ? (
                        sortConfig.direction === 'asc' ? <ArrowUp className="h-2.5 w-2.5 text-blue-500" /> : <ArrowDown className="h-2.5 w-2.5 text-blue-500" />
                      ) : (
                        <ArrowUpDown className="h-2.5 w-2.5 text-zinc-600 group-hover/sort:text-zinc-400" />
                      )}
                    </div>
                    <input
                      type="text"
                      placeholder="Filter..."
                      value={filters.cost_centre}
                      onChange={(e) => handleFilterChange('cost_centre', e.target.value)}
                      className="w-full bg-black/30 border border-white/5 rounded px-2 py-1 text-[9px] text-zinc-300 placeholder:text-zinc-700 outline-none focus:border-blue-500/50"
                    />
                  </div>
                </th>
                {dayKeys.map((dateKey) => {
                  const date = new Date(dateKey);
                  const formattedDay = date.toLocaleDateString('en-GB', { weekday: 'short' });
                  const formattedDate = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

                  return (
                    <th key={dateKey} className="p-3 text-center min-w-[140px] border-r border-white/5 last:border-0 relative group">
                      <div className="absolute inset-0 bg-white/0 group-hover:bg-white/[0.02] pointer-events-none transition-colors" />
                      <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-0.5">{formattedDay}</div>
                      <div className="text-[9px] font-medium text-zinc-600 uppercase tracking-tight">{formattedDate}</div>
                    </th>
                  )
                })}
                <th className="p-3 text-center min-w-[100px] border-l border-white/5 bg-zinc-900/50 cursor-pointer group/sort" onClick={() => handleSort('basic_hrs_overtime')}>
                  <div className="flex flex-col items-center gap-1">
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Hrs</span>
                      {sortConfig.key === 'basic_hrs_overtime' ? (
                        sortConfig.direction === 'asc' ? <ArrowUp className="h-2.5 w-2.5 text-blue-500" /> : <ArrowDown className="h-2.5 w-2.5 text-blue-500" />
                      ) : (
                        <ArrowUpDown className="h-2.5 w-2.5 text-zinc-600 group-hover/sort:text-zinc-400" />
                      )}
                    </div>
                  </div>
                </th>
                <th className="p-3 text-center min-w-[100px] bg-zinc-900/50 cursor-pointer group/sort" onClick={() => handleSort('cost_eur')}>
                  <div className="flex flex-col items-center gap-1">
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Cost</span>
                      {sortConfig.key === 'cost_eur' ? (
                        sortConfig.direction === 'asc' ? <ArrowUp className="h-2.5 w-2.5 text-blue-500" /> : <ArrowDown className="h-2.5 w-2.5 text-blue-500" />
                      ) : (
                        <ArrowUpDown className="h-2.5 w-2.5 text-zinc-600 group-hover/sort:text-zinc-400" />
                      )}
                    </div>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedRows.map((row, idx) => (
                <tr key={idx} className="border-b border-white/5 hover:bg-white/[0.02] group transition-colors">
                  {/* Employee Column */}
                  <td className="p-3 text-left sticky left-0 bg-[#0A0A0B] group-hover:bg-[#121214] transition-colors z-10 border-r border-white/5 shadow-[4px_0_12px_-2px_rgba(0,0,0,0.5)] cursor-pointer hover:bg-white/5"
                    onClick={() => handleFilterChange('employee_name', row.employee_name)}>
                    <div className="flex flex-col">
                      <div className="text-xs font-bold text-zinc-200 group-hover:text-blue-400 transition-colors">{row.employee_name}</div>
                      <div className="text-[9px] font-medium text-zinc-600 uppercase tracking-wider hidden">ID: {idx + 100}</div>
                    </div>
                  </td>
                  <td className="p-3 text-left border-r border-white/5 cursor-pointer hover:bg-white/5 group/cell whitespace-nowrap" onClick={() => handleFilterChange('occupation', row.occupation)}>
                    <span className="text-[10px] font-medium text-zinc-400 group-hover/cell:text-blue-400 transition-colors">{row.occupation}</span>
                  </td>
                  <td className="p-3 text-left border-r border-white/5 cursor-pointer hover:bg-white/5 group/cell whitespace-nowrap" onClick={() => handleFilterChange('cost_centre', row.cost_centre)}>
                    <span className="text-[10px] font-medium text-zinc-400 group-hover/cell:text-blue-400 transition-colors">{row.cost_centre}</span>
                  </td>

                  {/* Days Columns */}
                  {dayKeys.map(day => {
                    const cell = row[day];
                    return (
                      <td
                        key={day}
                        className="p-1 border-r border-white/5 last:border-0 relative h-[70px]"
                        onContextMenu={(e) => handleRightClick(e, cell, row.employee_name, day)}
                      >
                        {cell ? (
                          <div
                            className={`w-full h-full rounded-md p-2 flex flex-col justify-center cursor-pointer transition-all active:scale-95 active:opacity-80 draggable-shift ${getCellStyles(cell)}`}
                            title={`${cell.cell_type === 'WORK_SHIFT' ? `${cell.start_time} - ${cell.end_time}` : 'OFF DAY'}`}
                          >
                            {cell.cell_type === 'WORK_SHIFT' && (
                              <>
                                <div className="font-bold text-[10px] leading-tight mb-1 truncate opacity-90">{cell.role}</div>
                                <div className="text-[10px] font-mono font-medium opacity-75">{cell.start_time}-{cell.end_time}</div>
                              </>
                            )}
                            {cell.cell_type === 'OFF_DAY' && (
                              <div className="flex items-center justify-center h-full">
                                <span className="text-[10px] font-black tracking-widest opacity-50">OFF</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="w-full h-full hover:bg-white/5 rounded-md transition-colors cursor-crosshair flex items-center justify-center group/add">
                            <Plus className="h-4 w-4 text-zinc-700 group-hover/add:text-zinc-500 transition-colors" />
                          </div>
                        )}
                      </td>
                    );
                  })}

                  {/* Stats Columns */}
                  <td className="p-3 text-center border-l border-white/5">
                    <span className="text-xs font-mono font-bold text-zinc-400">{row.basic_hrs_overtime}</span>
                  </td>
                  <td className="p-3 text-center">
                    <span className="text-xs font-mono font-bold text-emerald-400">€{row.cost_eur?.toFixed(0)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Context Menu (Custom) */}
      {
        contextMenu.visible && (
          <div
            className="fixed z-50 bg-[#18181b] border border-white/10 rounded-lg shadow-2xl p-1 min-w-[180px] animate-in fade-in zoom-in-95 duration-100"
            style={{ top: contextMenu.y, left: contextMenu.x }}
          >
            <div className="bg-zinc-900/50 p-2 rounded-md mb-1 border-b border-white/5">
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{contextMenu.cell.employee}</p>
              <p className="text-xs font-bold text-white">{contextMenu.cell.day.toUpperCase()}</p>
            </div>
            <Button variant="ghost" onClick={() => handleAction('Edit')} className="w-full justify-start h-8 text-xs font-medium text-zinc-300 hover:text-white hover:bg-white/10">
              <Edit className="h-3.5 w-3.5 mr-2" />
              Edit Shift
            </Button>
            <Button variant="ghost" onClick={() => handleAction('Copy')} className="w-full justify-start h-8 text-xs font-medium text-zinc-300 hover:text-white hover:bg-white/10">
              <Copy className="h-3.5 w-3.5 mr-2" />
              Copy Shift
            </Button>
            <div className="h-px bg-white/10 my-1" />
            <Button variant="ghost" onClick={() => handleAction('Delete')} className="w-full justify-start h-8 text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10">
              <Trash2 className="h-3.5 w-3.5 mr-2" />
              Delete
            </Button>
          </div>
        )
      }
    </div >
  );
}