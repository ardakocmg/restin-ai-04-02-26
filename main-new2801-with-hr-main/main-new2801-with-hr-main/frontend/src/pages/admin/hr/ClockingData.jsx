import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar, Edit, MapPin, Info, Trash, ArrowUpDown, Search, Filter } from 'lucide-react';
import api from '@/lib/api';
import { useVenue } from '@/context/VenueContext';

export default function ClockingData() {
  const { venueId } = useVenue();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Sorting State
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });

  // Date State (Internal: YYYY-MM-DD for inputs, API: DD.MM.YYYY)
  const [dateRange, setDateRange] = useState({
    start: '2026-01-14',
    end: '2026-01-28'
  });

  useEffect(() => {
    fetchData();
  }, [dateRange, venueId]); // Refetch when dates or venue change

  // Helper: Convert YYYY-MM-DD to DD.MM.YYYY
  const formatDateForApi = (isoDate) => {
    if (!isoDate) return '';
    const [y, m, d] = isoDate.split('-');
    return `${d}.${m}.${y}`;
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const payload = {
        start_date: formatDateForApi(dateRange.start),
        end_date: formatDateForApi(dateRange.end),
        search_query: searchQuery
      };
      // Use dynamic venue endpoint if available, or stay with /clocking/data if it's global
      // User said "Venue marvin Gauci Group olsun", suggesting a fixed context for this page
      const response = await api.post('clocking/data', payload);
      setData(response.data);
    } catch (error) {
      console.error('Failed to fetch clocking data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Sorting Logic
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedData = React.useMemo(() => {
    if (!Array.isArray(data)) return [];
    let sortableItems = [...data];
    if (sortConfig.key !== null) {
      sortableItems.sort((a, b) => {
        // Special date handling
        if (sortConfig.key === 'date') {
          // format is DD/MM/YYYY
          const parseDate = (d) => {
            if (!d) return 0;
            const [day, month, year] = d.split('/');
            return new Date(`${year}-${month}-${day}`).getTime();
          };
          const va = parseDate(a[sortConfig.key]);
          const vb = parseDate(b[sortConfig.key]);
          if (va < vb) return sortConfig.direction === 'asc' ? -1 : 1;
          if (va > vb) return sortConfig.direction === 'asc' ? 1 : -1;
          return 0;
        }

        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [data, sortConfig]);

  // Handle Search
  const handleSearch = () => {
    fetchData();
  };

  const SortIcon = ({ column }) => {
    if (sortConfig.key !== column) return <ArrowUpDown className="h-3 w-3 opacity-30 ml-2" />;
    return <ArrowUpDown className={`h-3 w-3 ml-2 ${sortConfig.direction === 'asc' ? 'text-blue-400' : 'text-red-400'}`} />;
  };

  return (
    <div className="p-6 bg-[#09090b] min-h-screen text-zinc-100 font-sans">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <h1 className="text-3xl font-black text-white uppercase tracking-tighter mb-1">Clocking Data</h1>
          <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
            <span className="text-blue-500">Marvin Gauci Group</span> • Official Records
          </p>
        </div>

        {/* CONTROLS */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 group-focus-within:text-blue-400 transition-colors" />
            <Input
              placeholder="Search employees..."
              className="pl-9 bg-zinc-900/50 border-zinc-800 text-xs w-64 focus:ring-1 focus:ring-blue-500/50 h-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>

          {/* Date Range */}
          <div className="flex items-center gap-2 bg-zinc-900/50 p-1 rounded-lg border border-zinc-800">
            <Input
              type="date"
              className="bg-transparent border-none h-8 text-xs w-32 focus:ring-0 px-2 text-zinc-400 [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert-[0.5]"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
            />
            <span className="text-zinc-600">-</span>
            <Input
              type="date"
              className="bg-transparent border-none h-8 text-xs w-32 focus:ring-0 px-2 text-zinc-400 [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert-[0.5]"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
            />
          </div>

          <Button onClick={handleSearch} className="bg-blue-600 hover:bg-blue-500 text-white h-10 px-6">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
        </div>
      </div>

      {/* DATA TABLE */}
      <Card className="bg-zinc-900 border-zinc-800 overflow-hidden shadow-2xl">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-12 text-center text-zinc-500 animate-pulse">Synchronizing Data...</div>
            ) : (
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-zinc-950/50 border-b border-zinc-800/50">
                    {[
                      { key: 'day_of_week', label: 'Day' },
                      { key: 'date', label: 'Date' },
                      { key: 'clocking_in', label: 'In' },
                      { key: 'clocking_out', label: 'Out' },
                      { key: 'employee_name', label: 'Employee' },
                      { key: 'cost_centre', label: 'Cost Centre' },
                      { key: 'modified_by', label: 'Modified By' },
                      { key: 'created_by', label: 'Created By' },
                    ].map((col) => (
                      <th
                        key={col.key}
                        onClick={() => handleSort(col.key)}
                        className="p-4 text-left text-[10px] font-bold text-zinc-500 uppercase tracking-widest cursor-pointer hover:text-zinc-300 transition-colors select-none"
                      >
                        <div className="flex items-center">
                          {col.label}
                          <SortIcon column={col.key} />
                        </div>
                      </th>
                    ))}
                    <th className="p-4 text-center text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/30">
                  {sortedData.map((record, idx) => (
                    <tr key={idx} className="group transition-colors odd:bg-[#0f0f11] even:bg-[#151518] hover:bg-blue-900/10">
                      <td className="p-4 text-[11px] font-medium text-zinc-500">{record.day_of_week}</td>
                      <td className="p-4 text-[11px] font-medium text-zinc-400 font-mono">{record.date}</td>
                      <td className="p-4 text-[11px] font-bold text-zinc-300">{record.clocking_in}</td>
                      <td className="p-4 text-[11px] font-bold text-zinc-300">{record.clocking_out}</td>
                      <td className="p-4">
                        <div className="flex flex-col">
                          <span className="text-[11px] font-bold text-blue-400 group-hover:text-blue-300 transition-colors uppercase tracking-tight">{record.employee_name}</span>
                          {record.employee_designation && (
                            <span className="text-[9px] font-bold text-zinc-600 mt-0.5">{record.employee_designation || 'N/A'}</span>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="inline-flex items-center px-2 py-1 rounded bg-zinc-800 text-[9px] font-bold text-zinc-400 uppercase tracking-wider border border-zinc-700/50">
                          {record.cost_centre || 'N/A'}
                        </span>
                      </td>
                      <td className="p-4 text-[10px] font-medium text-zinc-600">{record.modified_by}</td>
                      <td className="p-4 text-[10px] font-medium text-zinc-600">{record.created_by}</td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-blue-500 hover:bg-blue-500/10 rounded-lg">
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:bg-red-500/10 rounded-lg">
                            <Trash className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {sortedData.length === 0 && !loading && (
                    <tr>
                      <td colSpan={9} className="p-12 text-center text-zinc-600 text-xs uppercase tracking-widest font-bold">
                        No clocking records found for this period
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}