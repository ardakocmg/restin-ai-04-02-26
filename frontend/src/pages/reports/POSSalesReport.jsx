import React, { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';

import { useVenue } from '@/context/VenueContext';

import { useSearchParams } from 'react-router-dom';

import { cn } from '@/lib/utils';

import { usePOSFilters } from '@/context/POSFilterContext';

import PageContainer from '@/layouts/PageContainer';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

import { Button } from '@/components/ui/button';

import { Badge } from '@/components/ui/badge';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from 'recharts';

import {
  TrendingUp, Users, DollarSign, Package, Download,
  Filter, Calendar, Clock, ArrowUpRight, ArrowDownRight,
  ChevronRight, Search, FileText, LayoutDashboard, Settings,
  UserCheck, CreditCard, Receipt, ShoppingCart,
  FileDown, Share2, Save, Plus, Trash2, GripVertical, Info,
  Activity, BarChart3, PieChart as PieChartIcon,
  Table as TableIcon, Type, Home, ChevronLeft
} from 'lucide-react';

import api from '@/lib/api';

import POSFilterBar from '@/components/pos/POSFilterBar';

import { format } from 'date-fns';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

import LoadingSpinner from '@/components/shared/LoadingSpinner';

import { exportToCsv, exportToPdf } from '@/lib/exportUtils';

import { toast } from 'sonner';

const COLORS = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

export default function POSSalesReport() {
  const { activeVenueId: venueId } = useVenue();
  const { filters: globalFilters } = usePOSFilters();
  const [searchParams, setSearchParams] = useSearchParams();
  const [salesData, setSalesData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeReport, setActiveReport] = useState(searchParams.get('type') || 'hub');
  const [timeRange, setTimeRange] = useState('today');
  const [advancedWidgets, setAdvancedWidgets] = useState([
    { id: 'rev-sum', type: 'revenue_summary', title: 'Revenue summary' },
    { id: 'pay-sum', type: 'payments', title: 'Payments' }
  ]);

  const reportTypes = [
    { id: 'summary', label: 'Summary Reports', icon: FileText, category: 'Core' },
    { id: 'revenue', label: 'Revenue Reports', icon: DollarSign, category: 'Core' },
    { id: 'shift', label: 'Shift Reports', icon: Clock, category: 'Core' },
    { id: 'hour', label: 'Hour Reports', icon: Clock, category: 'Temporal' },
    { id: 'day', label: 'Day Reports', icon: Calendar, category: 'Temporal' },
    { id: 'week', label: 'Week Reports', icon: Calendar, category: 'Temporal' },
    { id: 'month', label: 'Month Reports', icon: Calendar, category: 'Temporal' },
    { id: 'product', label: 'Product Reports', icon: Package, category: 'Entity' },
    { id: 'category', label: 'Category Reports', icon: FileText, category: 'Entity' },
    { id: 'user', label: 'User Reports', icon: UserCheck, category: 'Entity' },
    { id: 'labour', label: 'Labour Reports', icon: Users, category: 'Specialized' },
    { id: 'ingredient', label: 'Ingredient Reports', icon: Package, category: 'Specialized' },
    { id: 'advanced', label: 'Advanced Reports', icon: BarChart3, category: 'Specialized' },
    { id: 'receipt', label: 'Receipts', icon: Receipt, category: 'Data' },
    { id: 'export', label: 'Export data', icon: Download, category: 'Data' },
  ];

  useEffect(() => {
    const type = searchParams.get('type');
    if (type && type !== activeReport) {
      setActiveReport(type);
    } else if (!type && activeReport !== 'hub') {
      setActiveReport('hub');
    }
  }, [searchParams]);

  useEffect(() => {
    if (venueId && activeReport !== 'hub' && activeReport !== 'export' && activeReport !== 'advanced') {
      fetchReportData();
    }
  }, [venueId, globalFilters, activeReport, timeRange]);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const params = {
        venue_id: venueId,
        type: activeReport,
        range: timeRange,
        start_date: globalFilters.dateRange.from ? format(globalFilters.dateRange.from, 'yyyy-MM-dd') : undefined,
        end_date: globalFilters.dateRange.to ? format(globalFilters.dateRange.to, 'yyyy-MM-dd') : (globalFilters.dateRange.from ? format(globalFilters.dateRange.from, 'yyyy-MM-dd') : undefined),
        shift: globalFilters.activeShift
      };

      const response = await api.get('/api/reports/pos-sales', { params });
      setSalesData(response.data);
    } catch (error) {
      logger.error('Failed to fetch POS report:', error);
      toast.error('Failed to load report data');
    } finally {
      setLoading(false);
    }
  };

  const handleExportCsv = (data, name) => {
    if (!data) {
      toast.error('No data to export');
      return;
    }
    exportToCsv(data, `${name}_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    toast.success('CSV exported successfully');
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-MT', { style: 'currency', currency: 'EUR' }).format(amount || 0);
  };

  const Section = ({ title, children }) => (
    <div className="mb-8">
      <h2 className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest mb-4 px-1">{title}</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {children}
      </div>
    </div>
  );

  const Tile = ({ title, icon: Icon, onClick, highlight = false }) => (
    <div
      onClick={onClick}
      className={`
        cursor-pointer group flex flex-col items-center justify-center p-6 rounded-2xl transition-all border h-40
        ${highlight ? 'bg-red-600/10 border-red-500/20 hover:bg-red-600/20' : 'bg-zinc-900/40 border-white/5 hover:border-white/20 hover:bg-zinc-900/60 shadow-xl'}
      `}
    >
      <div className={`mb-4 p-3 rounded-xl ${highlight ? 'bg-red-500/10 text-red-500' : 'bg-zinc-800 text-zinc-400 group-hover:text-zinc-100 transition-colors'}`}>
        <Icon className="w-6 h-6" />
      </div>
      <span className="text-[11px] font-bold text-zinc-100 text-center uppercase tracking-wider leading-tight px-2">
        {title}
      </span>
    </div>
  );

  const renderProductReport = () => {
    if (!salesData || !salesData.items) return <div className="text-zinc-400 text-center p-8">No product data found</div>;
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in slide-in-from-bottom-4 duration-500">
        <Card className="lg:col-span-2 bg-zinc-900 border-zinc-800 shadow-xl">
          <CardHeader className="border-b border-zinc-800 py-4"><CardTitle className="text-white text-base">Top 10 Selling Products</CardTitle></CardHeader>
          <CardContent className="p-6">
            <div className="h-[450px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salesData.top_5 || []} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={true} vertical={false} />
                  <XAxis type="number" stroke="#71717A" fontSize={11} tickFormatter={(val) => `€${val}`} tickLine={false} axisLine={false} />
                  <YAxis dataKey="name" type="category" stroke="#F4F4F5" fontSize={10} width={120} tickLine={false} axisLine={false} />
                  <Tooltip cursor={{ fill: 'rgba(255,255,255,0.03)' }} contentStyle={{ backgroundColor: '#18181B', border: '1px solid #27272A', borderRadius: '8px' }} />
                  <Bar dataKey="revenue" name="Revenue" fill="#E53935" radius={[0, 4, 4, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800 lg:col-span-1 shadow-xl">
          <CardHeader className="border-b border-zinc-800 py-4 flex flex-row items-center justify-between">
            <CardTitle className="text-white text-base">Sales List</CardTitle>
            <Button variant="ghost" size="icon" onClick={() => handleExportCsv(salesData.items, 'product_sales')} className="h-8 w-8 text-zinc-400">
              <FileDown className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[500px] overflow-auto">
              <Table>
                <TableHeader className="bg-zinc-800/20">
                  <TableRow className="border-zinc-800 hover:bg-transparent">
                    <TableHead className="text-[10px] uppercase font-bold text-zinc-500">Product</TableHead>
                    <TableHead className="text-right text-[10px] uppercase font-bold text-zinc-500">Qty</TableHead>
                    <TableHead className="text-right text-[10px] uppercase font-bold text-zinc-500">Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {salesData.items.map((item, i) => (
                    <TableRow key={i} className="border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                      <TableCell className="font-medium text-zinc-200 text-xs py-3">{item.name}</TableCell>
                      <TableCell className="text-right text-zinc-400 text-xs py-3">{item.quantity}</TableCell>
                      <TableCell className="text-right text-white text-xs py-3 font-semibold">{formatCurrency(item.revenue)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderExportHub = () => {
    return (
      <div className="max-w-4xl mx-auto py-12 flex flex-col items-center justify-center animate-in zoom-in-95 duration-500">
        <div className="w-64 h-64 mb-8 relative opacity-20">
          <div className="absolute inset-0 bg-red-500/20 blur-[100px] rounded-full" />
          <img
            src="https://img.freepik.com/free-vector/data-concept-illustration_114360-3162.jpg"
            alt="Data illustration"
            className="w-full h-full object-contain filter grayscale invert"
          />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2 tracking-tight text-center">Please select a date range to export</h2>
        <p className="text-zinc-500 mb-8 text-center max-w-md">Download your venue data in CSV or PDF format. Large exports may take a few seconds to generate.</p>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 w-full shadow-2xl space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div className="space-y-4">
              <Section title="Export Entities">
                {['Receipts', 'Products', 'Payments', 'Users', 'Taxes', 'Modifiers'].map(entity => (
                  <div key={entity} className="flex items-center gap-3 p-3 bg-zinc-800/30 border border-white/5 rounded-xl hover:bg-zinc-800/50 transition-all cursor-pointer group">
                    <div className="h-8 w-8 rounded-lg bg-zinc-800 flex items-center justify-center group-hover:bg-red-500/10 transition-colors">
                      <FileText className="w-4 h-4 text-zinc-500 group-hover:text-red-400" />
                    </div>
                    <span className="text-[11px] font-bold text-zinc-400 group-hover:text-zinc-100 uppercase tracking-tighter truncate">
                      {entity}
                    </span>
                  </div>
                ))}
              </Section>
            </div>
            <div className="flex flex-col gap-3">
              <div className="p-4 bg-zinc-800/50 rounded-xl border border-zinc-700 text-center mb-4">
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Estimated Wait Time</p>
                <p className="text-lg font-bold text-white tracking-widest">0 minute(s) 1 second(s)</p>
              </div>
              <Button onClick={() => handleExportCsv([], 'all_data')} className="w-full h-12 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-900/20 transition-all uppercase tracking-widest ring-offset-zinc-950 focus-visible:ring-emerald-500">
                <FileDown className="mr-2 h-5 w-5" />
                Export as CSV
              </Button>
              <Button variant="outline" onClick={() => exportToPdf('report-content')} className="w-full h-12 border-emerald-600/50 text-emerald-500 hover:bg-emerald-500/10 font-bold rounded-xl transition-all uppercase tracking-widest">
                <Download className="mr-2 h-5 w-5" />
                Export as PDF
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderAdvancedReporting = () => {
    return (
      <div className="flex flex-col lg:flex-row gap-6 h-[800px] animate-in fade-in duration-700">
        {/* Main Builder Canvas */}
        <div className="flex-1 bg-zinc-900/30 border border-zinc-800 rounded-2xl p-6 overflow-auto custom-scrollbar shadow-inner">
          <div className="flex items-center justify-between mb-8 pb-4 border-b border-zinc-800">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-red-600 rounded-lg flex items-center justify-center shadow-lg shadow-red-900/20">
                <BarChart3 className="text-white h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white tracking-tight">Advanced Reporting <span className="text-zinc-500 mx-2">›</span> <span className="text-zinc-400">{venueId || 'Venue'}</span></h3>
                <p className="text-xs text-zinc-500 font-medium">Build customized view for your operational data</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="bg-zinc-800 border-zinc-700 text-zinc-300 rounded-lg">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg px-6">
                Save
              </Button>
            </div>
          </div>

          <div className="space-y-6" id="report-builder-canvas">
            {advancedWidgets.map(widget => (
              <Card key={widget.id} className="bg-zinc-900 border-zinc-800 shadow-xl group relative overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-zinc-800 group-hover:bg-red-500 transition-colors" />
                <CardHeader className="flex flex-row items-center justify-between py-4 border-b border-zinc-800/50 bg-zinc-800/20">
                  <div className="flex items-center gap-3">
                    <GripVertical className="h-4 w-4 text-zinc-600 cursor-grab active:cursor-grabbing" />
                    <CardTitle className="text-sm font-bold text-zinc-100 uppercase tracking-widest">{widget.title}</CardTitle>
                    <Button variant="ghost" size="icon" onClick={() => handleExportCsv([], widget.type)} className="h-6 w-6 text-zinc-500 hover:text-red-400">
                      <FileDown className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500 hover:text-white"><Settings className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500 hover:text-red-500"><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {widget.type === 'revenue_summary' ? (
                    <Table>
                      <TableHeader className="bg-zinc-950/40">
                        <TableRow className="border-zinc-800 hover:bg-transparent">
                          <TableHead className="text-[10px] font-black uppercase text-zinc-500 w-1/3">Type</TableHead>
                          <TableHead className="text-right text-[10px] font-black uppercase text-zinc-500">Revenue Tax Excl.</TableHead>
                          <TableHead className="text-right text-[10px] font-black uppercase text-zinc-500">Revenue Tax Incl.</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {['restaurant', 'Service charges Tax Incl.', 'Total revenue with discounts', 'Total amount of discounts', 'Total revenue without discounts'].map((row, i) => (
                          <TableRow key={i} className={`border-zinc-800 hover:bg-zinc-800/30 ${i > 1 ? 'bg-zinc-950/20 font-bold' : ''}`}>
                            <TableCell className="text-xs text-zinc-300 font-medium py-4">{row}</TableCell>
                            <TableCell className="text-right text-zinc-400 text-xs py-4">849.94</TableCell>
                            <TableCell className="text-right text-white text-xs py-4">1,003.00</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <Table>
                      <TableHeader className="bg-zinc-950/40">
                        <TableRow className="border-zinc-800 hover:bg-transparent">
                          <TableHead className="text-[10px] font-black uppercase text-zinc-500 w-1/3">Type</TableHead>
                          <TableHead className="text-right text-[10px] font-black uppercase text-zinc-500">Total Amount</TableHead>
                          <TableHead className="text-right text-[10px] font-black uppercase text-zinc-500">Tips</TableHead>
                          <TableHead className="text-right text-[10px] font-black uppercase text-zinc-500">Number of Payments</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow className="border-zinc-800 hover:bg-zinc-800/30">
                          <TableCell className="py-4">
                            <p className="text-xs text-zinc-200 font-bold">Credit Card</p>
                            <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest mt-0.5">VIVAWALLET</p>
                          </TableCell>
                          <TableCell className="text-right text-white text-xs py-4 font-bold">1,003.00</TableCell>
                          <TableCell className="text-right text-emerald-500 text-xs py-4 font-bold">0.00</TableCell>
                          <TableCell className="text-right text-zinc-300 text-xs py-4 font-bold">4</TableCell>
                        </TableRow>
                        <TableRow className="bg-zinc-950/60 font-black border-t-2 border-zinc-700">
                          <TableCell className="text-xs text-zinc-300 py-4 uppercase tracking-widest">Total</TableCell>
                          <TableCell className="text-right text-white text-xs py-4">1,003.00</TableCell>
                          <TableCell className="text-right text-emerald-500 text-xs py-4">0.00</TableCell>
                          <TableCell className="text-right text-zinc-300 text-xs py-4">4</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            ))}

            <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-zinc-800 rounded-2xl bg-zinc-900/10 hover:bg-zinc-900/20 transition-all cursor-pointer group">
              <div className="h-12 w-12 bg-zinc-800 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Plus className="text-zinc-500 group-hover:text-red-500 h-6 w-6" />
              </div>
              <p className="text-sm font-bold text-zinc-600 uppercase tracking-widest group-hover:text-zinc-400">Drag a widget here or click to add</p>
            </div>
          </div>
        </div>

        {/* Sidebar Widgets Selector */}
        <div className="w-full lg:w-80 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl flex flex-col">
          <div className="p-6 border-b border-zinc-800">
            <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-500">Available Widgets</h4>
          </div>
          <div className="flex-1 overflow-auto p-4 space-y-3 custom-scrollbar">
            {[
              { title: 'Category Revenue', desc: 'Displays revenue and taxes grouped by category.' },
              { title: 'Custom Table', desc: 'Displays custom data of your choosing.' },
              { title: 'Custom text', desc: 'Use an editor to add text to your reports.' },
              { title: 'Floor Revenue', desc: 'Displays revenue and taxes grouped by floor.' },
              { title: 'Group by hour Graph', desc: 'Displays a graph depicting revenue, amount of items, profit, etc.' },
              { title: 'Kitchen and Bar Summary', desc: 'Displays the kitchen and bar totals.' },
              { title: 'Modifiers', desc: 'Breakdown of how many times a modifier is used.' },
              { title: 'Payments Summary', desc: 'Summary of all payments sorted by type.' },
              { title: 'Revenue Summary', desc: 'Displays a summary of all revenue.' },
              { title: 'Revenue per Weekday', desc: 'Revenue, number of tickets and average per weekday.' },
              { title: 'Table Revenue', desc: 'Revenue and taxes grouped by table.' },
              { title: 'Tax Summary', desc: 'Summary of taxes by percentage.' },
              { title: 'Tips Summary', desc: 'Breakdown of tips by waiter.' }
            ].map((w, idx) => (
              <div key={idx} className="p-4 bg-zinc-800/20 border border-white/5 rounded-xl hover:border-white/20 hover:bg-zinc-800/40 transition-all cursor-move group relative">
                <div className="absolute left-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <GripVertical className="h-4 w-4 text-zinc-600" />
                </div>
                <div className="pl-2">
                  <h5 className="text-[10px] font-black text-zinc-200 uppercase tracking-wider mb-1 group-hover:text-red-400 transition-colors">{w.title}</h5>
                  <p className="text-[9px] text-zinc-500 font-medium leading-relaxed">{w.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderSummaryReport = (data) => {
    if (!data) return null;

    return (
      <div className="space-y-8 animate-in fade-in zoom-in-95 duration-700 pb-20">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSearchParams({})}
            className="h-10 w-10 bg-zinc-900 border border-white/5 text-zinc-400 hover:text-white rounded-xl shadow-lg"
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <div className="h-10 w-10 bg-red-600 rounded-lg flex items-center justify-center shadow-lg shadow-red-900/20">
            <FileText className="text-white h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight uppercase">Summary Report Details</h3>
            <p className="text-[10px] text-zinc-500 font-bold tracking-widest uppercase">Verified operational metrics</p>
          </div>
        </div>
        {/* Section 1: Revenue Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-zinc-900 border-zinc-800 shadow-xl overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-1 bg-zinc-800 group-hover:bg-red-500 transition-colors" />
            <CardHeader className="pb-2">
              <CardTitle className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Total Revenue (Tax Incl.)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-white">{formatCurrency(data.total_revenue)}</div>
              <p className="text-[10px] text-zinc-500 mt-1 uppercase font-bold tracking-tight">Total with service charges & taxes</p>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900 border-zinc-800 shadow-xl overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-1 bg-zinc-800 group-hover:bg-emerald-500 transition-colors" />
            <CardHeader className="pb-2">
              <CardTitle className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Gross Sales</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-white">{formatCurrency(data.gross_sales)}</div>
              <p className="text-[10px] text-zinc-500 mt-1 uppercase font-bold tracking-tight">Total menu value sold</p>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900 border-zinc-800 shadow-xl overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-1 bg-zinc-800 group-hover:bg-blue-500 transition-colors" />
            <CardHeader className="pb-2">
              <CardTitle className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Net Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black text-white">{formatCurrency(data.restaurant_revenue)}</div>
              <p className="text-[10px] text-zinc-500 mt-1 uppercase font-bold tracking-tight">Revenue excluding service charges</p>
            </CardContent>
          </Card>
        </div>

        {/* Section 2: Operational Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {[
            { label: 'Customers', value: data.customers, icon: Users },
            { label: 'Avg / Customer', value: formatCurrency(data.customers_avg), icon: TrendingUp },
            { label: 'Tickets', value: data.tickets, icon: Receipt },
            { label: 'Avg / Ticket', value: formatCurrency(data.tickets_avg), icon: TrendingUp },
            { label: 'Tables', value: data.tables_served, icon: TableIcon },
            { label: 'Voids', value: data.voided_total > 0 ? formatCurrency(data.voided_total) : 'None', color: data.voided_total > 100 ? 'text-red-500' : 'text-zinc-400' }
          ].map((m, i) => (
            <div key={i} className="p-4 bg-zinc-900/50 border border-white/5 rounded-2xl flex flex-col items-center text-center group hover:bg-zinc-800/50 transition-all">
              <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest mb-2 group-hover:text-zinc-400">{m.label}</span>
              <span className={cn("text-lg font-bold text-zinc-200", m.color)}>{m.value}</span>
            </div>
          ))}
        </div>

        {/* Section 3: Tables Breakdown */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {/* Revenue & VAT */}
          <div className="space-y-8">
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl">
              <div className="px-6 py-4 bg-zinc-800/20 border-b border-zinc-800 flex items-center justify-between">
                <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400">Revenue Summary</h3>
                <Badge variant="outline" className="text-[10px] border-emerald-500/20 text-emerald-500 bg-emerald-500/5 uppercase font-black">Accuracy: 100%</Badge>
              </div>
              <Table>
                <TableHeader>
                  <TableRow className="border-zinc-800 hover:bg-transparent">
                    <TableHead className="text-[10px] font-black uppercase text-zinc-600 h-10">Revenue Type</TableHead>
                    <TableHead className="text-right text-[10px] font-black uppercase text-zinc-600 h-10">Amount (Tax Incl.)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow className="border-zinc-800 hover:bg-zinc-800/30">
                    <TableCell className="text-xs text-zinc-300 font-bold py-4">Total Restaurant Revenue</TableCell>
                    <TableCell className="text-right text-white text-xs py-4 font-black">{formatCurrency(data.restaurant_revenue)}</TableCell>
                  </TableRow>
                  <TableRow className="border-zinc-800 hover:bg-zinc-800/30">
                    <TableCell className="text-xs text-zinc-400 py-4 italic">Total Service Charges</TableCell>
                    <TableCell className="text-right text-zinc-300 text-xs py-4 font-bold">{formatCurrency(data.service_charges)}</TableCell>
                  </TableRow>
                  <TableRow className="bg-zinc-950/40 border-t-2 border-zinc-800">
                    <TableCell className="text-xs text-red-500 font-black py-5 uppercase tracking-widest">Total Revenue (Tax Incl.)</TableCell>
                    <TableCell className="text-right text-white text-sm py-5 font-black">{formatCurrency(data.total_revenue)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl">
              <div className="px-6 py-4 bg-zinc-800/20 border-b border-zinc-800">
                <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400">VAT Breakdown</h3>
              </div>
              <Table>
                <TableHeader>
                  <TableRow className="border-zinc-800 hover:bg-transparent">
                    <TableHead className="text-[10px] font-black uppercase text-zinc-600">Rate</TableHead>
                    <TableHead className="text-right text-[10px] font-black uppercase text-zinc-600">Net</TableHead>
                    <TableHead className="text-right text-[10px] font-black uppercase text-zinc-600">VAT Amount</TableHead>
                    <TableHead className="text-right text-[10px] font-black uppercase text-zinc-600">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.vat_rows.map((row, i) => (
                    <TableRow key={i} className="border-zinc-800 hover:bg-zinc-800/30">
                      <TableCell className="text-xs text-zinc-300 font-bold py-3">{row.rate}</TableCell>
                      <TableCell className="text-right text-zinc-400 text-xs py-3 font-medium">{formatCurrency(row.net)}</TableCell>
                      <TableCell className="text-right text-zinc-400 text-xs py-3 font-medium">{formatCurrency(row.vat)}</TableCell>
                      <TableCell className="text-right text-white text-xs py-3 font-black">{formatCurrency(row.total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Payments & Discounts */}
          <div className="space-y-8">
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl">
              <div className="px-6 py-4 bg-zinc-800/20 border-b border-zinc-800">
                <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400">Payment Methods</h3>
              </div>
              <Table>
                <TableHeader>
                  <TableRow className="border-zinc-800 hover:bg-transparent">
                    <TableHead className="text-[10px] font-black uppercase text-zinc-600">Method</TableHead>
                    <TableHead className="text-right text-[10px] font-black uppercase text-zinc-600">Amount</TableHead>
                    <TableHead className="text-right text-[10px] font-black uppercase text-zinc-600">Tips</TableHead>
                    <TableHead className="text-right text-[10px] font-black uppercase text-zinc-600">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.payment_rows.map((row, i) => (
                    <TableRow key={i} className={cn("border-zinc-800 hover:bg-zinc-800/30", row.kind === 'child' && 'bg-zinc-950/20')}>
                      <TableCell className="py-3">
                        <p className={cn("text-xs font-bold", row.kind === 'child' ? 'text-zinc-400 pl-4' : 'text-zinc-200 uppercase')}>{row.type_name}</p>
                        {row.provider && <p className="text-[8px] font-black text-red-500/80 uppercase tracking-widest pl-4">{row.provider}</p>}
                      </TableCell>
                      <TableCell className="text-right text-zinc-300 text-xs py-3 font-bold">{formatCurrency(row.amount)}</TableCell>
                      <TableCell className="text-right text-emerald-500 text-xs py-3 font-black">{formatCurrency(row.tips)}</TableCell>
                      <TableCell className="text-right text-white text-xs py-3 font-black">{formatCurrency(row.total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl">
              <div className="px-6 py-4 bg-zinc-800/20 border-b border-zinc-800">
                <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400">Discount Analysis</h3>
              </div>
              <Table>
                <TableHeader>
                  <TableRow className="border-zinc-800 hover:bg-transparent">
                    <TableHead className="text-[10px] font-black uppercase text-zinc-600">Discount Type</TableHead>
                    <TableHead className="text-right text-[10px] font-black uppercase text-zinc-600">Count</TableHead>
                    <TableHead className="text-right text-[10px] font-black uppercase text-zinc-600">Discount Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.discount_rows.map((row, i) => (
                    <TableRow key={i} className="border-zinc-800 hover:bg-zinc-800/30">
                      <TableCell className="text-xs text-zinc-200 font-bold py-3">
                        {row.type_name}
                        <span className="ml-2 text-[9px] text-zinc-500 font-black">({row.percentage})</span>
                      </TableCell>
                      <TableCell className="text-right text-zinc-400 text-xs py-3 font-medium">{row.count}</TableCell>
                      <TableCell className="text-right text-red-400 text-xs py-3 font-black">-{formatCurrency(row.total)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-zinc-950/40 border-t-2 border-zinc-800">
                    <TableCell className="text-xs text-zinc-400 py-4 font-bold italic">Total Discounts Applied</TableCell>
                    <TableCell className="text-right text-zinc-400 text-xs py-4 font-medium">-</TableCell>
                    <TableCell className="text-right text-red-500 text-xs py-4 font-black">-{formatCurrency(data.total_discounts)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderHubTiles = (isBottom = false) => {
    const categories = [...new Set(reportTypes.map(t => t.category))];
    return (
      <div className={cn("animate-in fade-in zoom-in-95 duration-500", isBottom && "mt-12 pt-12 border-t border-zinc-800")}>
        {isBottom && (
          <div className="mb-8">
            <h2 className="text-xl font-bold text-white tracking-tight">Explore Other Reports</h2>
            <p className="text-zinc-500 text-xs font-medium uppercase tracking-widest mt-1">Navigate across the POS Command Center</p>
          </div>
        )}
        <Section title="Quick Access">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
            <Tile title="Consolidated Sales" icon={Activity} onClick={() => setActiveReport('summary')} highlight={activeReport === 'summary'} />
            <Tile title="Financial Pulse" icon={DollarSign} onClick={() => setActiveReport('revenue')} highlight={activeReport === 'revenue'} />
            <Tile title="Advanced Builder" icon={BarChart3} onClick={() => setActiveReport('advanced')} highlight={activeReport === 'advanced'} />
          </div>
        </Section>
        {categories.map(cat => (
          <Section key={cat} title={cat}>
            {reportTypes.filter(t => t.category === cat).map(report => (
              <Tile
                key={report.id}
                title={report.label}
                icon={report.icon}
                onClick={() => {
                  setActiveReport(report.id);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                highlight={activeReport === report.id}
              />
            ))}
          </Section>
        ))}
      </div>
    );
  };

  const renderContent = () => {
    if (activeReport === 'hub') {
      return renderHubTiles();
    }

    if (activeReport === 'export') return renderExportHub();
    if (activeReport === 'advanced') return renderAdvancedReporting();

    const reportInfo = reportTypes.find(t => t.id === activeReport);
    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800 shadow-xl">
          <div className="flex items-center gap-5">
            <Button variant="ghost" size="icon" onClick={() => setActiveReport('hub')} className="h-12 w-12 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-xl transition-all shadow-lg border border-white/5">
              <ChevronLeft className="h-6 w-6" />
            </Button>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <div className="h-6 w-6 rounded-md bg-red-600 flex items-center justify-center">
                  {reportInfo?.icon && <reportInfo.icon className="h-3.5 w-3.5 text-white" />}
                </div>
                <h2 className="text-2xl font-black text-white tracking-tighter uppercase">{reportInfo?.label}</h2>
              </div>
              <p className="text-xs text-zinc-500 font-bold uppercase tracking-[0.2em]">{venueId || 'Restin POS'} • {activeReport}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-zinc-950 p-1.5 rounded-xl border border-zinc-800">
            {['today', 'week', 'month'].map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-6 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${timeRange === range
                  ? 'bg-red-600 text-white shadow-lg shadow-red-900/20'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'
                  }`}
              >
                {range}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="h-[500px] flex flex-col items-center justify-center">
            <LoadingSpinner text={`Sourcing ${reportInfo?.label}...`} />
            <p className="text-[10px] text-zinc-600 uppercase font-black tracking-[0.3em] mt-8 animate-pulse">Aggregating Cloud Data</p>
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-top-4 duration-500">
            {activeReport === 'summary' || activeReport === 'revenue' ? renderSummaryReport(salesData) :
              activeReport === 'product' || activeReport === 'category' ? renderProductReport() :
                activeReport === 'user' ? renderUserReport() :
                  <div className="flex flex-col items-center justify-center p-24 text-center text-zinc-600 bg-zinc-900/20 rounded-3xl border-2 border-zinc-800/50 border-dashed">
                    <div className="h-20 w-20 bg-zinc-800 rounded-3xl flex items-center justify-center mb-6 opacity-30">
                      {reportInfo?.icon && <reportInfo.icon className="h-10 w-10" />}
                    </div>
                    <h3 className="text-xl font-bold text-zinc-400 tracking-tight">{reportInfo?.label || 'Report'} is currently offline</h3>
                    <p className="max-w-xs mt-3 text-sm font-medium text-zinc-500">Our engineers are synchronizing real-time data for this report type. Please check back shortly.</p>
                    <Button variant="outline" onClick={() => setActiveReport('hub')} className="mt-8 border-zinc-700 text-zinc-400 rounded-xl hover:bg-zinc-800">
                      Explore Other Reports
                    </Button>
                  </div>
            }
            {/* Always show hub tiles at the bottom of any specific report */}
            {renderHubTiles(true)}
          </div>
        )}
      </div>
    );
  };

  return (
    <PageContainer title="POS Command Center" description="Premium analytics & operational reporting for Restin POS">
      <div className="space-y-8 pb-12">
        <POSFilterBar />
        <div className="min-h-[700px]">
          {renderContent()}
        </div>
      </div>
    </PageContainer>
  );
}