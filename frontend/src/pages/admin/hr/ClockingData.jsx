import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { logger } from '@/lib/logger';
import PermissionGate from '@/components/shared/PermissionGate';
import { useAuditLog } from '@/hooks/useAuditLog';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Calendar, Edit, MapPin, Trash, ArrowUpDown, Search, Filter,
  Clock, Monitor, Smartphone, Globe, Download, Timer,
  CheckCircle2, Loader2, Users, Plus
} from 'lucide-react';
import api from '@/lib/api';
import { useVenue } from '@/context/VenueContext';
import { useAuth } from '@/context/AuthContext';

/* ── Device badge config ────────────────────────────── */
const DEVICE_BADGE = {
  terminal: { label: 'Terminal', icon: Monitor, bg: 'bg-blue-500/15', text: 'text-blue-400', border: 'border-blue-500/20' },
  web_manual: { label: 'Web', icon: Globe, bg: 'bg-purple-500/15', text: 'text-purple-400', border: 'border-purple-500/20' },
  mobile_app: { label: 'Mobile', icon: Smartphone, bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/20' },
  kiosk: { label: 'Kiosk', icon: Monitor, bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/20' },
  import: { label: 'Import', icon: Download, bg: 'bg-zinc-500/15', text: 'text-zinc-400', border: 'border-zinc-500/20' },
};

export default function ClockingData() {
  const { activeVenueId: venueId } = useVenue();
  const { user, isManager, isOwner } = useAuth();
  useAuditLog('CLOCKING_DATA_VIEWED', { resource: 'clocking-data' });
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCount, setActiveCount] = useState(0);
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });

  const today = new Date();
  const twoWeeksAgo = new Date(today);
  twoWeeksAgo.setDate(today.getDate() - 14);

  const [dateRange, setDateRange] = useState({
    start: twoWeeksAgo.toISOString().slice(0, 10),
    end: today.toISOString().slice(0, 10)
  });

  useEffect(() => { fetchData(); }, [dateRange, venueId]);
  useEffect(() => { fetchActiveCount(); }, [venueId]);

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
      const response = await api.post('clocking/data', payload);
      setData(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      logger.error('Failed to fetch clocking data:', error);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchActiveCount = async () => {
    try {
      const response = await api.get('clocking/active');
      setActiveCount(Array.isArray(response.data) ? response.data.length : 0);
    } catch { setActiveCount(0); }
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const sortedData = React.useMemo(() => {
    if (!Array.isArray(data)) return [];
    let items = [...data];
    if (sortConfig.key !== null) {
      items.sort((a, b) => {
        if (sortConfig.key === 'date') {
          const parse = (d) => {
            if (!d) return 0;
            const [day, month, year] = d.split('/');
            return new Date(`${year}-${month}-${day}`).getTime();
          };
          const va = parse(a[sortConfig.key]);
          const vb = parse(b[sortConfig.key]);
          return sortConfig.direction === 'asc' ? va - vb : vb - va;
        }
        if (sortConfig.key === 'hours_worked') {
          const va = Number(a.hours_worked) || 0;
          const vb = Number(b.hours_worked) || 0;
          return sortConfig.direction === 'asc' ? va - vb : vb - va;
        }
        const va = (a[sortConfig.key] || '').toString().toLowerCase();
        const vb = (b[sortConfig.key] || '').toString().toLowerCase();
        if (va < vb) return sortConfig.direction === 'asc' ? -1 : 1;
        if (va > vb) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return items;
  }, [data, sortConfig]);

  const handleSearch = () => { fetchData(); };

  const SortIcon = ({ column }) => {
    if (sortConfig.key !== column) return <ArrowUpDown className="h-3 w-3 opacity-30 ml-1.5" />;
    return <ArrowUpDown className={`h-3 w-3 ml-1.5 ${sortConfig.direction === 'asc' ? 'text-blue-400' : 'text-red-400'}`} />;
  };

  const formatHours = (h) => {
    if (!h || h === 0) return '—';
    const hrs = Math.floor(h);
    const mins = Math.round((h - hrs) * 60);
    return `${hrs}h ${mins}m`;
  };

  const DeviceBadge = ({ source, deviceName }) => {
    const conf = DEVICE_BADGE[source] || DEVICE_BADGE.terminal;
    const Icon = conf.icon;
    return (
      <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider border ${conf.bg} ${conf.text} ${conf.border}`}
        title={deviceName || conf.label}>
        <Icon className="h-3 w-3" />
        {conf.label}
      </div>
    );
  };

  const StatusDot = ({ status }) => {
    const isActive = status === 'active';
    return (
      <div className="flex items-center gap-1.5">
        <span className={`relative flex h-2.5 w-2.5`}>
          {isActive && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />}
          <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isActive ? 'bg-emerald-400' : 'bg-zinc-600'}`} />
        </span>
        <span className={`text-[9px] font-bold uppercase tracking-wider ${isActive ? 'text-emerald-400' : 'text-zinc-600'}`}>
          {isActive ? 'Active' : 'Done'}
        </span>
      </div>
    );
  };

  const TABLE_COLS = [
    { key: 'status', label: 'Status' },
    { key: 'day_of_week', label: 'Day' },
    { key: 'date', label: 'Date' },
    { key: 'clocking_in', label: 'In' },
    { key: 'clocking_out', label: 'Out' },
    { key: 'hours_worked', label: 'Duration' },
    { key: 'employee_name', label: 'Employee' },
    { key: 'work_area', label: 'Work Area' },
    { key: 'cost_centre', label: 'Cost Centre' },
    { key: 'source_device', label: 'Device' },
    { key: 'device_name', label: 'Device Name' },
  ];

  return (
    <PermissionGate requiredRole="MANAGER">
      <div className="p-6 bg-[#09090b] min-h-screen text-zinc-100 font-sans">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div>
            <h1 className="text-3xl font-black text-white uppercase tracking-tighter mb-1">Clocking Data</h1>
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
              <span className="text-blue-500">Official Records</span>
              {activeCount > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                  </span>
                  {activeCount} Active
                </span>
              )}
            </p>
          </div>

          {/* CONTROLS */}
          <div className="flex flex-wrap items-center gap-3">
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

            <div className="flex items-center gap-2 bg-zinc-900/50 p-1 rounded-lg border border-zinc-800">
              <Input
                type="date"
                className="bg-transparent border-none h-8 text-xs w-32 focus:ring-0 px-2 text-zinc-400 [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert-[0.5]"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              />
              <span className="text-zinc-600">–</span>
              <Input
                type="date"
                className="bg-transparent border-none h-8 text-xs w-32 focus:ring-0 px-2 text-zinc-400 [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert-[0.5]"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              />
            </div>

            <Button onClick={handleSearch} className="bg-blue-600 hover:bg-blue-500 text-white h-10 px-5">
              <Filter className="h-4 w-4 mr-2" />Filter
            </Button>

            <Button
              onClick={() => navigate('/admin/hr/clocking/add')}
              className="bg-violet-600 hover:bg-violet-500 text-white h-10 px-5"
            >
              <Plus className="h-4 w-4 mr-2" />Add Entry
            </Button>

            <Button
              onClick={() => navigate('/admin/hr/manual-clocking')}
              className="bg-emerald-600 hover:bg-emerald-500 text-white h-10 px-5"
            >
              <Timer className="h-4 w-4 mr-2" />Manual Clock
            </Button>
          </div>
        </div>

        {/* DATA TABLE */}
        <Card className="bg-zinc-900 border-zinc-800 overflow-hidden shadow-2xl">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              {loading ? (
                <div className="p-12 text-center text-zinc-500 flex items-center justify-center gap-3">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span className="animate-pulse">Synchronizing Data...</span>
                </div>
              ) : (
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-zinc-950/50 border-b border-zinc-800/50">
                      {TABLE_COLS.map((col) => (
                        <th
                          key={col.key}
                          onClick={() => handleSort(col.key)}
                          className="p-3 text-left text-[10px] font-bold text-zinc-500 uppercase tracking-widest cursor-pointer hover:text-zinc-300 transition-colors select-none whitespace-nowrap"
                        >
                          <div className="flex items-center">
                            {col.label}
                            <SortIcon column={col.key} />
                          </div>
                        </th>
                      ))}
                      <th className="p-3 text-center text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/30">
                    {sortedData.map((record, idx) => (
                      <tr key={record.id || idx} className="group transition-colors odd:bg-[#0f0f11] even:bg-[#151518] hover:bg-blue-900/10">
                        {/* Status */}
                        <td className="p-3"><StatusDot status={record.status || 'completed'} /></td>
                        {/* Day */}
                        <td className="p-3 text-[11px] font-medium text-zinc-500">{record.day_of_week}</td>
                        {/* Date */}
                        <td className="p-3 text-[11px] font-medium text-zinc-400 font-mono">{record.date}</td>
                        {/* In */}
                        <td className="p-3">
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                            <Clock className="h-3 w-3 opacity-50" />{record.clocking_in}
                          </span>
                        </td>
                        {/* Out */}
                        <td className="p-3">
                          {record.clocking_out ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-400">
                              <Clock className="h-3 w-3 opacity-50" />{record.clocking_out}
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-emerald-400/60 animate-pulse">In Progress</span>
                          )}
                        </td>
                        {/* Duration */}
                        <td className="p-3">
                          <span className="text-[11px] font-bold text-zinc-300 font-mono">
                            {formatHours(record.hours_worked)}
                          </span>
                        </td>
                        {/* Employee */}
                        <td className="p-3">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (record.employee_code || record.employee_id)
                                navigate(`/admin/hr/people/${record.employee_code || record.employee_id}`);
                            }}
                            className="group/emp text-left"
                          >
                            <div className="flex flex-col">
                              <span className="text-[11px] font-bold text-blue-400 group-hover/emp:text-blue-300 hover:underline decoration-blue-500/40 underline-offset-2 transition-colors uppercase tracking-tight cursor-pointer">{record.employee_name}</span>
                              {record.employee_designation && (
                                <span className="text-[9px] font-bold text-zinc-600 mt-0.5">{record.employee_designation}</span>
                              )}
                            </div>
                          </button>
                        </td>
                        {/* Work Area */}
                        <td className="p-3">
                          {record.work_area ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-violet-500/10 text-[9px] font-bold text-violet-400 uppercase tracking-wider border border-violet-500/20">
                              <MapPin className="h-2.5 w-2.5" />{record.work_area}
                            </span>
                          ) : (
                            <span className="text-[10px] text-zinc-600">—</span>
                          )}
                        </td>
                        {/* Cost Centre */}
                        <td className="p-3">
                          <span className="inline-flex items-center px-2 py-1 rounded bg-zinc-800 text-[9px] font-bold text-zinc-400 uppercase tracking-wider border border-zinc-700/50">
                            {record.cost_centre || 'N/A'}
                          </span>
                        </td>
                        {/* Device */}
                        <td className="p-3">
                          <DeviceBadge source={record.source_device || 'terminal'} deviceName={record.device_name} />
                        </td>
                        {/* Device Name */}
                        <td className="p-3 text-[10px] font-medium text-zinc-600">{record.device_name || '—'}</td>
                        {/* Actions */}
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-blue-500 hover:bg-blue-500/10 rounded-lg" title="Edit">
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:bg-red-500/10 rounded-lg" title="Delete">
                              <Trash className="h-3 w-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {sortedData.length === 0 && !loading && (
                      <tr>
                        <td colSpan={TABLE_COLS.length + 1} className="p-12 text-center text-zinc-600 text-xs uppercase tracking-widest font-bold">
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
    </PermissionGate>
  );
}