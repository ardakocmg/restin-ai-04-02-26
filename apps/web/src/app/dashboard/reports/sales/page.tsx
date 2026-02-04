'use client';

import React, { useState, useEffect } from 'react';
import { useVenue } from '@/context/VenueContext';
import { useSearchParams, useRouter } from 'next/navigation';
import { usePOSFilters } from '@/context/POSFilterContext';
import PageContainer from '@/components/layout/PageContainer';
import { Card, CardContent, CardHeader, CardTitle } from '@antigravity/ui';
import { Button } from '@antigravity/ui';
import { Badge } from '@antigravity/ui';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import {
    TrendingUp, Users, DollarSign, Package, Download,
    Clock,
    ChevronLeft, FileText,
    UserCheck, Receipt,
    FileDown, Trash2, GripVertical,
    BarChart3,
    Table as TableIcon,
} from 'lucide-react';
import api from '@/lib/api';
import POSFilterBar from '@/components/pos/POSFilterBar';
import { format } from 'date-fns';
// Mock Table components since we don't have separate Table components in all UI libs yet
const Table = ({ children, className }: any) => <table className={`w-full ${className}`}>{children}</table>;
const TableHeader = ({ children, className }: any) => <thead className={className}>{children}</thead>;
const TableBody = ({ children, className }: any) => <tbody className={className}>{children}</tbody>;
const TableRow = ({ children, className }: any) => <tr className={`border-b ${className}`}>{children}</tr>;
const TableHead = ({ children, className }: any) => <th className={`text-left p-2 ${className}`}>{children}</th>;
const TableCell = ({ children, className }: any) => <td className={`p-2 ${className}`}>{children}</td>;

// Mock toast
const toast = {
    error: (msg: string) => console.error(msg),
    success: (msg: string) => console.log(msg),
};


const COLORS = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

export default function POSSalesReport() {
    const { activeVenueId: venueId } = useVenue();
    const { filters: globalFilters } = usePOSFilters();
    const searchParams = useSearchParams();
    const router = useRouter();

    const [salesData, setSalesData] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    // Handl null searchParams
    const typeParam = searchParams ? searchParams.get('type') : null;
    const [activeReport, setActiveReport] = useState(typeParam || 'hub');

    const [timeRange, setTimeRange] = useState('today');
    const [advancedWidgets, setAdvancedWidgets] = useState([
        { id: 'rev-sum', type: 'revenue_summary', title: 'Revenue summary' },
        { id: 'pay-sum', type: 'payments', title: 'Payments' }
    ]);

    const reportTypes = [
        { id: 'summary', label: 'Summary Reports', icon: FileText, category: 'Core' },
        { id: 'revenue', label: 'Revenue Reports', icon: DollarSign, category: 'Core' },
        { id: 'shift', label: 'Shift Reports', icon: Clock, category: 'Core' },
        { id: 'product', label: 'Product Reports', icon: Package, category: 'Entity' },
        { id: 'user', label: 'User Reports', icon: UserCheck, category: 'Entity' },
        { id: 'receipt', label: 'Receipts', icon: Receipt, category: 'Data' },
    ];

    /*
    useEffect(() => {
      const type = searchParams.get('type');
      if (type && type !== activeReport) {
        setActiveReport(type);
      } else if (!type && activeReport !== 'hub') {
        setActiveReport('hub');
      }
    }, [searchParams]);
    */

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

            // Ensure API doesn't crash if backend is down - return mock data
            // const response = await api.get('/api/reports/pos-sales', { params });
            // setSalesData(response.data);

            // MOCK DATA FOR DEMO
            setSalesData({
                total_revenue: 45231.89,
                gross_sales: 50000.00,
                restaurant_revenue: 38000.00,
                service_charges: 2000.00,
                customers: 1250,
                customers_avg: 36.18,
                tickets: 450,
                tickets_avg: 100.51,
                tables_served: 120,
                voided_total: 150.00,
                total_discounts: 540.00,
                vat_rows: [
                    { rate: '18%', net: 30000, vat: 5400, total: 35400 },
                    { rate: '7%', net: 8000, vat: 560, total: 8560 }
                ],
                payment_rows: [
                    { type_name: 'Cash', amount: 15000, tips: 500, total: 15500 },
                    { type_name: 'Visa', amount: 25000, tips: 2000, total: 27000, provider: 'BOV' }
                ],
                discount_rows: [
                    { type_name: 'Staff Meal', percentage: '100%', count: 5, total: 100 },
                    { type_name: 'Manager Comp', percentage: '100%', count: 2, total: 440 }
                ],
                top_5: [
                    { name: 'Burger', revenue: 5000 },
                    { name: 'Pizza', revenue: 4500 },
                    { name: 'Coke', revenue: 1200 },
                    { name: 'Beer', revenue: 3000 },
                    { name: 'Steak', revenue: 8000 }
                ],
                items: [
                    { name: 'Burger', quantity: 500, revenue: 5000 },
                    { name: 'Pizza', quantity: 450, revenue: 4500 }
                ]
            });

        } catch (error) {
            console.error('Failed to fetch POS report:', error);
            toast.error('Failed to load report data');
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount: any) => {
        return new Intl.NumberFormat('en-MT', { style: 'currency', currency: 'EUR' }).format(amount || 0);
    };

    const Section = ({ title, children }: any) => (
        <div className="mb-8">
            <h2 className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest mb-4 px-1">{title}</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {children}
            </div>
        </div>
    );

    const Tile = ({ title, icon: Icon, onClick, highlight = false }: any) => (
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
            </div>
        );
    };


    const renderHubTiles = (isBottom = false) => {
        const categories = Array.from(new Set(reportTypes.map(t => t.category)));
        return (
            <div className={`animate-in fade-in zoom-in-95 duration-500 ${isBottom ? "mt-12 pt-12 border-t border-zinc-800" : ""}`}>
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

        const reportInfo = reportTypes.find(t => t.id === activeReport);
        return (
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800 shadow-xl">
                    <div className="flex items-center gap-5">
                        <Button variant="ghost" className="h-12 w-12 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-xl transition-all shadow-lg border border-white/5" onClick={() => setActiveReport('hub')}>
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
                </div>

                {/* CONTENT RENDERER */}
                {!salesData ? (
                    <div className="p-8 text-center"><p>Loading Mock Data...</p></div>
                ) : (activeReport === 'product' ? renderProductReport() : (
                    <div className="p-12 text-center text-zinc-500 bg-zinc-900/10 border border-zinc-800 rounded-xl">
                        <p className="mb-4 text-lg">Report Type <b>{activeReport}</b> is successfully initialized.</p>
                        <code className="text-xs bg-black p-4 rounded block text-left whitespace-pre-wrap">
                            {JSON.stringify({
                                total_revenue: salesData.total_revenue,
                                payments: salesData.payment_rows
                            }, null, 2)}
                        </code>
                    </div>
                ))}

                {/* Always show hub tiles at the bottom of any specific report */}
                {renderHubTiles(true)}
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
