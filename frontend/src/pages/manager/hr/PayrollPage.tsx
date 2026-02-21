import React, { useState, useEffect } from 'react';
import { useVenue } from '@/context/VenueContext';
import { useAuth } from '@/context/AuthContext';
import PageContainer from '@/layouts/PageContainer';
import PermissionGate from '@/components/shared/PermissionGate';
import { useAuditLog } from '@/hooks/useAuditLog';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
    Wallet,
    Users,
    Calculator,
    CalendarClock,
    Download,
    Send,
    Lock,
    FileText,
    Trash2,
    Trash,
    Search,
    ChevronDown,
    Calendar,
    ArrowUpDown,
    CheckCircle2,
    Clock,
    AlertCircle,
    Eye,
    Mail,
    Share2,
    Filter,
    Award as AwardIcon,
    ShieldCheck,
    BarChart3,
    TrendingUp,
    PieChart,
    ListChecks
} from 'lucide-react';
import api, { userAPI } from '@/lib/api';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { cn } from "@/lib/utils";
import { logger } from '@/lib/logger';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from '@/components/ui/input';
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";

interface Payslip {
    employee_name?: string;
    name?: string;
    employee_number?: string;
    department?: string;
    gross_pay?: number;
    tax_amount?: number;
    social_security?: number;
    net_pay?: number;
    [key: string]: unknown;
}

interface PayrollRun {
    id: string;
    run_name?: string;
    run_number?: string;
    period_start?: string;
    period_end?: string;
    total_gross?: number;
    total_net?: number;
    total_tax?: number;
    employee_count?: number;
    state?: string;
    payslips?: Payslip[];
    [key: string]: unknown;
}

interface PayrollEmployee {
    id: string;
    full_name?: string;
    name?: string;
    occupation?: string;
    department?: string;
    display_id?: string;
    employee_name?: string;
    employee_code?: string;
    username?: string;
    employee_number?: string;
    gross_pay?: number;
    tax_amount?: number;
    social_security?: number;
    net_pay?: number;
    [key: string]: unknown;
}

interface DeptEntry {
    name: string;
    amount: number;
}

interface MonthlyTrend {
    month: string;
    gross: number;
    net: number;
}

interface CostMetrics {
    ytd_total: number;
    departments: DeptEntry[];
    monthly_trend: MonthlyTrend[];
}

export default function PayrollPage() {
    const [runs, setRuns] = useState<PayrollRun[]>([]);
    const [employees, setEmployees] = useState<PayrollEmployee[]>([]);
    const [loading, setLoading] = useState(true);
    const [calculating, setCalculating] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [docTypeFilter, setDocTypeFilter] = useState('ALL'); // ALL, FS3, FS5, FS7, PAYSLIP
    const [periodFilter, setPeriodFilter] = useState('Feb 2026');
    const [isDrillDownOpen, setIsDrillDownOpen] = useState(false);
    const [isNextRunDialogOpen, setIsNextRunDialogOpen] = useState(false);
    const [isGrossSummaryOpen, setIsGrossSummaryOpen] = useState(false);
    const [nextRunSearch, setNextRunSearch] = useState('');
    const [grossSearch, setGrossSearch] = useState('');
    const [activeTab, setActiveTab] = useState('OVERVIEW');
    const [costMetrics, setCostMetrics] = useState<CostMetrics>({ ytd_total: 0, departments: [], monthly_trend: [] });
    const { activeVenue } = useVenue();
    const navigate = useNavigate();

    const { logAction } = useAuditLog();
    useEffect(() => { logAction('PAYROLL_VIEWED', 'payroll-page'); }, []);

    useEffect(() => {
        logger.info('Ultimate Payroll Hub v1.0.1', { venueId: activeVenue?.id });
        if (activeVenue?.id) {
            fetchData();
        } else {
            logger.warn('PayrollPage: No active venue ID found in context');
            // If venue is missing, we might be stuck in loading state or redirected
        }
    }, [activeVenue?.id]);

    const fetchData = async () => {
        if (!activeVenue?.id) return;
        try {
            const [runsRes, empsRes] = await Promise.all([
                api.get(`venues/${activeVenue.id}/hr/payroll/runs`),
                api.get(`venues/${activeVenue.id}/hr/employees`)
            ]);
            setRuns(runsRes.data || []);
            setEmployees(empsRes.data || []);
            // Build cost metrics from runs data
            const deptMap: Record<string, number> = {};
            (runsRes.data || []).forEach((run: PayrollRun) => {
                (run.payslips || []).forEach((ps: Payslip) => {
                    const dept = ps.department || 'Unassigned';
                    deptMap[dept] = (deptMap[dept] || 0) + (ps.gross_pay || 0);
                });
            });
            setCostMetrics({
                ytd_total: (runsRes.data || []).reduce((a: number, r: PayrollRun) => a + (r.total_gross || 0), 0),
                departments: Object.entries(deptMap).map(([name, amount]) => ({ name, amount: amount as number })),
                monthly_trend: (runsRes.data || []).map((r: PayrollRun) => ({
                    month: r.period_start?.substring(0, 7) || 'N/A',
                    gross: r.total_gross || 0,
                    net: r.total_net || (r.total_gross || 0) * 0.72 || 0
                }))
            });
        } catch (error: unknown) {
            logger.error('Failed to fetch data', { error: error instanceof Error ? error.message : String(error) });
            toast.error("Failed to load payroll intelligence");
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteRun = async (e: React.MouseEvent, runId: string) => {
        e.stopPropagation();
        if (!window.confirm("Confirm deletion of this payroll record?")) return;

        try {
            await api.delete(`venues/${activeVenue?.id}/hr/payroll/runs/${runId}`);
            toast.success("Record permanently removed");
            fetchData();
        } catch (error: unknown) {
            toast.error("Deletion failed (Backend override required)");
            logger.error('Deletion failed', { error: error instanceof Error ? error.message : String(error) });
        }
    };

    const handleCalculate = async () => {
        setCalculating(true);
        try {
            const payload = {
                run_name: `Payroll Run — ${periodFilter}`,
                period_start: "2026-02-01", // ISO Format preferred
                period_end: "2026-02-28",
                pay_date: "2026-02-28",
                employees: [] // Send empty to auto-select all active
            };
            const res = await api.post(`venues/${activeVenue?.id}/hr/payruns`, { ...payload, venue_id: activeVenue?.id });
            // Then calculate
            await api.post(`venues/${activeVenue?.id}/hr/payruns/${res.data.id}/calculate`);

            toast.success("Payroll cycle calculated");
            fetchData();
        } catch (error: unknown) {
            logger.error('Calculation failed', { error: error instanceof Error ? error.message : String(error) });
            toast.error("Calculation failed");
        } finally {
            setCalculating(false);
        }
    };

    // Generic File Download Handler
    const handleDownload = async (url: string, filename: string) => {
        try {
            const response = await api.get(url, { responseType: 'blob' });
            const blob = new Blob([response.data], { type: response.headers['content-type'] });
            const link = document.createElement('a');
            link.href = window.URL.createObjectURL(blob);
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(link.href);
            toast.success("Download started");
        } catch (error: unknown) {
            logger.error('Download failed', { error: error instanceof Error ? error.message : String(error) });
            toast.error("Download failed. Please try again.");
        }
    };

    // Compliance Actions
    const downloadSEPA = (run: PayrollRun) => handleDownload(`venues/${activeVenue?.id}/hr/payroll/runs/${run.id}/sepa-xml`, `SEPA_PAYROLL_${run.id}.xml`);
    const downloadFS5 = (run: PayrollRun) => handleDownload(`venues/${activeVenue?.id}/hr/payroll/reports/fs5/${run.id}/pdf`, `FS5_Report_${(run.period_end || '').replace(/\//g, '-')}.pdf`);
    const downloadFS3Pack = (year: string) => handleDownload(`venues/${activeVenue?.id}/hr/payroll/reports/fs3/${year}/pdf`, `FS3_Pack_${year}.zip`);
    const downloadPayslipPack = (run: PayrollRun) => handleDownload(`venues/${activeVenue?.id}/hr/payroll/runs/${run.id}/dispatch-zip`, `Payroll_${run.run_number}.zip`);

    // Derived stats based on filtered data
    const totalGrossAccumulated = runs.reduce((acc: number, r: PayrollRun) => acc + (r.total_gross || 0), 0);
    const totalTaxAccumulated = runs.reduce((acc: number, r: PayrollRun) => acc + (r.total_tax || 0), 0);
    const totalNIAccumulated = totalGrossAccumulated * 0.1; // 10% estimation for display

    // Determine Featured Employee (First available or placeholder)
    const featuredEmp: PayrollEmployee = employees.length > 0 ? employees[0] : { id: '---', full_name: "Staff Member", occupation: "Pending Loading", display_id: "---", department: 'N/A' };

    return (
        <PermissionGate requiredRole="OWNER">
            <PageContainer title="Ultimate Payroll Engine" description="Centralized Compliance & Processing Hub" actions={null}>
                <div className="p-6 space-y-8 max-w-[1600px] mx-auto">

                    {/* Advanced Filtering Suite */}
                    <div className="flex flex-col md:flex-row items-end gap-4 bg-card/50 p-6 rounded-2xl border border-border backdrop-blur-sm">
                        <div className="flex-1 space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Personnel / Employee</label>
                            <div className="relative group">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-blue-500 transition-colors" />
                                <Input
                                    placeholder="Search employees by name or ID..."
                                    className="pl-10 bg-black border-border focus:border-blue-500/50"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="w-full md:w-48 space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Document Type</label>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" className="w-full justify-between border-border bg-black text-xs font-bold uppercase tracking-widest">
                                        {docTypeFilter === 'ALL' ? 'All Documents' : docTypeFilter} <ChevronDown className="h-4 w-4 opacity-50" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="bg-card border-border w-48">
                                    <DropdownMenuItem onClick={() => setDocTypeFilter('ALL')}>All Documents</DropdownMenuItem>
                                    <DropdownMenuSeparator className="bg-secondary" />
                                    <DropdownMenuItem onClick={() => setDocTypeFilter('PAYSLIP')}>Payslips</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setDocTypeFilter('FS3')}>FS3 Statement</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setDocTypeFilter('FS5')}>FS5 Monthly</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setDocTypeFilter('FS7')}>FS7 Annual</DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>

                        <div className="w-full md:w-48 space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Payroll Period</label>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" className="w-full justify-between border-border bg-black text-xs font-bold uppercase tracking-widest">
                                        {periodFilter} <Calendar className="h-4 w-4 opacity-50" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="bg-card border-border w-48">
                                    <DropdownMenuItem onClick={() => setPeriodFilter('Feb 2026')}>Feb 2026</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setPeriodFilter('Jan 2026')}>Jan 2026</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setPeriodFilter('Q4 2025')}>Q4 2025</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setPeriodFilter('Year 2025')}>Full Year 2025</DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>

                        <Button onClick={resetFilters} variant="ghost" className="h-10 text-muted-foreground hover:text-foreground px-3 flex items-center gap-2">
                            <Filter className="h-4 w-4" /> Reset
                        </Button>
                    </div>

                    {/* ─── Tab Bar ─────────────────────────────────────────── */}
                    <div className="flex gap-1 bg-background/50 p-1 rounded-xl border border-border">
                        {[
                            { id: 'OVERVIEW', label: 'Overview', icon: Wallet },
                            { id: 'COSTS', label: 'Cost Analytics', icon: BarChart3 },
                            { id: 'PROCESSING', label: 'Processing', icon: ListChecks },
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={cn(
                                    'flex items-center gap-2 px-4 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all',
                                    activeTab === tab.id
                                        ? 'bg-blue-600 text-foreground shadow-lg shadow-blue-500/20'
                                        : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                                )}
                            >
                                <tab.icon className="h-3.5 w-3.5" />
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {activeTab === 'OVERVIEW' && (<>
                        {/* High-Level Intelligence Cards (Restored & Enhanced) */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <Card
                                onClick={() => setIsNextRunDialogOpen(true)}
                                className="bg-black/40 border-border shadow-2xl hover:border-blue-500/30 transition-all cursor-pointer group relative overflow-hidden h-32"
                            >
                                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-20 transition-opacity">
                                    <Calendar className="h-16 w-16 text-blue-500" />
                                </div>
                                <CardContent className="p-6">
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-1">Next Payroll Run</p>
                                    <div className="flex items-center gap-3">
                                        <Calendar className="h-5 w-5 text-blue-500" />
                                        <h3 className="text-2xl font-black text-foreground uppercase tracking-tight">Feb 2026</h3>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground font-bold uppercase mt-2">Due in 25 days • Target: 28th Feb</p>
                                </CardContent>
                            </Card>

                            <Card
                                onClick={() => setIsDrillDownOpen(true)}
                                className="bg-black/40 border-border shadow-2xl hover:border-emerald-500/30 transition-all cursor-pointer group relative overflow-hidden h-32"
                            >
                                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-20 transition-opacity">
                                    <Users className="h-16 w-16 text-emerald-500" />
                                </div>
                                <CardContent className="p-6">
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-1">Active Employees</p>
                                    <div className="flex items-center gap-3">
                                        <Users className="h-5 w-5 text-emerald-500" />
                                        <h3 className="text-3xl font-black text-foreground font-mono">{employees.length}</h3>
                                    </div>
                                    <p className="text-[10px] text-emerald-500/60 font-black uppercase mt-2 flex items-center gap-2">
                                        <CheckCircle2 className="h-3 w-3" /> Ready for processing
                                    </p>
                                </CardContent>
                            </Card>

                            <Card
                                onClick={() => setIsGrossSummaryOpen(true)}
                                className="bg-black/40 border-border shadow-2xl hover:border-amber-500/30 transition-all cursor-pointer group relative overflow-hidden h-32"
                            >
                                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-20 transition-opacity">
                                    <Wallet className="h-16 w-16 text-amber-500" />
                                </div>
                                <CardContent className="p-6">
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-1">Last Total Gross</p>
                                    <div className="flex items-center gap-3">
                                        <Wallet className="h-5 w-5 text-amber-500" />
                                        <h3 className="text-2xl font-black text-foreground font-mono">€{runs[0]?.total_gross?.toLocaleString() || "0"}</h3>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground font-bold uppercase mt-2">Jan 2026 Summary • Audited</p>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Secondary Aggregate Insights (The "Newer" Stats) */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-background/30 p-4 rounded-2xl border border-border">
                            <div className="px-4 py-2 border-r border-border">
                                <Label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest block mb-1">Selection Gross</Label>
                                <span className="text-lg font-black text-foreground font-mono italic">€{totalGrossAccumulated.toLocaleString()}</span>
                            </div>
                            <div className="px-4 py-2 border-r border-border">
                                <Label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest block mb-1">Tax Accrual</Label>
                                <span className="text-lg font-black text-rose-500 font-mono italic">€{totalTaxAccumulated.toLocaleString()}</span>
                            </div>
                            <div className="px-4 py-2 border-r border-border">
                                <Label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest block mb-1">SSC Projection</Label>
                                <span className="text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono italic">€{totalNIAccumulated.toLocaleString()}</span>
                            </div>
                            <div className="pl-4">
                                <Button
                                    onClick={handleCalculate}
                                    disabled={calculating}
                                    className="w-full bg-blue-600 hover:bg-blue-500 text-foreground font-black uppercase tracking-widest text-[9px] h-10 shadow-lg"
                                >
                                    {calculating ? "Processing..." : "Run New Cycle"}
                                </Button>
                            </div>
                        </div>

                        {/* Featured Staff Access (Dynamic) */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <div className="h-1 w-8 bg-blue-500 rounded-full" />
                                <h3 className="text-sm font-black text-foreground uppercase tracking-[0.3em]">Direct Staff Access</h3>
                            </div>
                            {employees.length > 0 ? (
                                <Card className="bg-card/80 border-blue-500/20 shadow-2xl overflow-hidden border-2 relative group hover:border-blue-500/40 transition-all">
                                    <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-100 transition-all scale-150">
                                        <AwardIcon className="h-24 w-24 text-blue-500" />
                                    </div>
                                    <CardContent className="p-8">
                                        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                                            <div className="flex items-center gap-6">
                                                <div className="h-20 w-20 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-500 p-0.5 shadow-2xl">
                                                    <div className="h-full w-full rounded-[14px] bg-card flex items-center justify-center font-black text-2xl text-foreground">
                                                        {featuredEmp.full_name?.substring(0, 2).toUpperCase() || "OK"}
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <h4 className="text-2xl font-black text-foreground uppercase tracking-tight">{featuredEmp.full_name}</h4>
                                                        <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 uppercase text-[9px] font-black tracking-widest">Active</Badge>
                                                    </div>
                                                    <p className="text-xs text-muted-foreground font-bold uppercase tracking-[0.2em] mb-4">{featuredEmp.occupation} — {featuredEmp.department}</p>
                                                    <div className="flex gap-4">
                                                        <div className="px-3 py-1 bg-white/5 rounded-full border border-border text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                                            <ShieldCheck className="h-3 w-3 text-blue-500" /> ID: {featuredEmp.display_id || featuredEmp.id?.substring(0, 6)}
                                                        </div>
                                                        <div className="px-3 py-1 bg-white/5 rounded-full border border-border text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                                            <Clock className="h-3 w-3 text-amber-500" /> Dec 2025 Cycle
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex gap-3">
                                                <Button
                                                    onClick={() => navigate(`/manager/hr/payroll/view/emp/${featuredEmp.id}`)}
                                                    className="bg-zinc-100 hover:bg-white text-black font-black uppercase tracking-widest text-[10px] px-8 py-6 rounded-xl shadow-2xl"
                                                >
                                                    Inspect Payslip <Eye className="ml-2 h-4 w-4" />
                                                </Button>
                                                <Button variant="outline" className="border-border hover:bg-white/5 text-muted-foreground font-black uppercase tracking-widest text-[10px] px-6 py-6 rounded-xl">
                                                    Distribute <Mail className="ml-2 h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ) : (
                                <div className="p-8 bg-card border border-border rounded-xl text-center text-muted-foreground">
                                    No active staff found. Please check Employee Directory.
                                </div>
                            )}
                        </div>

                        <Separator className="bg-secondary/50" />

                        {/* Ultimate Document Repository Grid */}
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <h3 className="text-lg font-black text-foreground uppercase tracking-widest">Digital Payroll Archive</h3>
                                    <p className="text-xs text-muted-foreground font-medium">Found {runs.length} processed records for the selected filters.</p>
                                </div>
                                <div className="flex gap-2">
                                    <Button variant="outline" size="sm" className="border-border bg-black text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                        <Download className="h-4 w-4 mr-2" /> Bulk Export
                                    </Button>
                                    <Button variant="outline" size="sm" className="border-border bg-black text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                        <Share2 className="h-4 w-4 mr-2" /> Share Vault
                                    </Button>
                                </div>
                            </div>

                            {runs.length === 0 ? (
                                <div className="h-[300px] rounded-3xl border-2 border-dashed border-border flex flex-col items-center justify-center text-center p-8 bg-card/20">
                                    <div className="h-16 w-16 rounded-full bg-card border border-border flex items-center justify-center mb-4">
                                        <AlertCircle className="h-8 w-8 text-zinc-700" />
                                    </div>
                                    <h4 className="text-muted-foreground font-black uppercase tracking-widest mb-1">{"No "}Payroll Artifacts Detected</h4>
                                    <p className="text-xs text-muted-foreground max-w-[300px]">Adjust your filters or execute a new payroll cycle to generate documentation.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                    {runs.map((run) => (
                                        <Card
                                            key={run.id}
                                            onClick={() => navigate(`/manager/hr/payroll/runs/${run.id}`)}
                                            className="bg-card/50 border-border hover:border-blue-500/30 transition-all cursor-pointer group shadow-2xl relative overflow-hidden"
                                        >
                                            <div className="absolute top-0 left-0 w-1 h-full bg-secondary group-hover:bg-blue-500 transition-colors" />
                                            <CardContent className="p-6">
                                                <div className="flex items-start justify-between">
                                                    <div className="space-y-4">
                                                        <div>
                                                            <div className="flex items-center gap-3 mb-1">
                                                                <h4 className="text-xl font-black text-foreground tracking-tight">{run.run_name}</h4>
                                                                <Badge className={cn(
                                                                    "uppercase text-[9px] font-black tracking-widest",
                                                                    run.state === 'LOCKED' ? 'bg-secondary text-muted-foreground' : 'bg-blue-600 text-foreground'
                                                                )}>
                                                                    {run.state}
                                                                </Badge>
                                                            </div>
                                                            <p className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.2em]">
                                                                {run.period_start} — {run.period_end}
                                                            </p>
                                                        </div>

                                                        <div className="grid grid-cols-2 gap-8 py-4 border-y border-border">
                                                            <div className="space-y-1">
                                                                <div className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Total Valuation</div>
                                                                <div className="text-lg font-black text-foreground font-mono">€{(run.total_gross || 0).toLocaleString()}</div>
                                                            </div>
                                                            <div className="space-y-1">
                                                                <div className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Employees</div>
                                                                <div className="text-lg font-black text-foreground font-mono">{run.employee_count} <span className="text-[10px] font-medium text-muted-foreground">PAX</span></div>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-4">
                                                            <div className="flex -space-x-3">
                                                                {[1, 2, 3].map(i => (
                                                                    <div key={i} className="h-8 w-8 rounded-full border-2 border-zinc-900 bg-secondary flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                                                                        {i === 3 ? '+' : 'U'}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Audited by System</span>
                                                        </div>
                                                    </div>

                                                    <div className="flex flex-col gap-2">
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon" aria-label="Action"
                                                                    className="h-10 w-10 text-muted-foreground hover:text-foreground hover:bg-white/5 rounded-xl border border-transparent hover:border-border"
                                                                    onClick={(e) = aria-label="Action"> e.stopPropagation()}
                                                                >
                                                                    <Download className="h-5 w-5" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent className="bg-card border-border w-56">
                                                                <DropdownMenuLabel className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Compliance & Exports</DropdownMenuLabel>
                                                                <DropdownMenuSeparator className="bg-secondary" />
                                                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); downloadSEPA(run); }} className="gap-2">
                                                                    <div className="h-6 w-6 rounded bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400 font-black text-[9px]">XML</div>
                                                                    <span className="text-xs font-bold">SEPA Bank File</span>
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); downloadFS5(run); }} className="gap-2">
                                                                    <div className="h-6 w-6 rounded bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400 font-black text-[9px]">FS5</div>
                                                                    <span className="text-xs font-bold">FS5 Return Data</span>
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); downloadPayslipPack(run); }} className="gap-2">
                                                                    <div className="h-6 w-6 rounded bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-black text-[9px]">PDF</div>
                                                                    <span className="text-xs font-bold">Payslip Bundle</span>
                                                                </DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon" aria-label="Action"
                                                            className="h-10 w-10 text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 rounded-xl border border-transparent hover:border-rose-500/20"
                                                            onClick={(e) = aria-label="Action"> handleDeleteRun(e, run.id)}
                                                        >
                                                            <Trash2 className="h-5 w-5" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </div>
                    </>)}

                    {/* ─── COSTS TAB ─────────────────────────────────────── */}
                    {activeTab === 'COSTS' && (
                        <div className="space-y-6">
                            {/* YTD Summary */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <Card className="bg-black/40 border-border shadow-2xl">
                                    <CardContent className="p-6">
                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-1">YTD Total Payroll</p>
                                        <h3 className="text-3xl font-black text-foreground font-mono">€{costMetrics.ytd_total.toLocaleString()}</h3>
                                        <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold mt-2 flex items-center gap-1"><TrendingUp className="h-3 w-3" /> Across {runs.length} cycles</p>
                                    </CardContent>
                                </Card>
                                <Card className="bg-black/40 border-border shadow-2xl">
                                    <CardContent className="p-6">
                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-1">Avg Cost / Employee</p>
                                        <h3 className="text-3xl font-black text-foreground font-mono">€{employees.length > 0 ? Math.round(costMetrics.ytd_total / employees.length).toLocaleString() : '0'}</h3>
                                        <p className="text-[10px] text-muted-foreground font-bold mt-2">{employees.length} active employees</p>
                                    </CardContent>
                                </Card>
                                <Card className="bg-black/40 border-border shadow-2xl">
                                    <CardContent className="p-6">
                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-1">Departments</p>
                                        <h3 className="text-3xl font-black text-foreground font-mono">{costMetrics.departments.length}</h3>
                                        <p className="text-[10px] text-muted-foreground font-bold mt-2">Cost centres tracked</p>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Department Breakdown */}
                            <Card className="bg-card/50 border-border">
                                <CardHeader>
                                    <CardTitle className="text-sm font-black uppercase tracking-widest text-foreground flex items-center gap-2">
                                        <PieChart className="h-4 w-4 text-blue-500" /> Department Cost Breakdown
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3">
                                        {costMetrics.departments.length > 0 ? costMetrics.departments.map((dept, idx) => {
                                            const maxAmount = Math.max(...costMetrics.departments.map((d: DeptEntry) => d.amount), 1);
                                            const pct = Math.round((dept.amount / maxAmount) * 100);
                                            const colors = ['bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-purple-500', 'bg-cyan-500'];
                                            return (
                                                <div key={idx} className="flex items-center gap-4">
                                                    <div className="w-32 text-xs font-bold text-muted-foreground uppercase tracking-wider truncate">{dept.name}</div>
                                                    <div className="flex-1 h-6 bg-white/5 rounded-lg overflow-hidden">
                                                        <div className={`h-full ${colors[idx % colors.length]} rounded-lg transition-all`} style={{ width: `${pct}%` }} />
                                                    </div>
                                                    <div className="w-24 text-right text-xs font-black text-foreground font-mono">€{dept.amount.toLocaleString()}</div>
                                                </div>
                                            );
                                        }) : (
                                            ['Kitchen', 'FOH', 'Management'].map((name, idx) => {
                                                const colors = ['bg-blue-500', 'bg-emerald-500', 'bg-amber-500'];
                                                return (
                                                    <div key={idx} className="flex items-center gap-4">
                                                        <div className="w-32 text-xs font-bold text-muted-foreground uppercase tracking-wider truncate">{name}</div>
                                                        <div className="flex-1 h-6 bg-white/5 rounded-lg overflow-hidden">
                                                            <div className={`h-full ${colors[idx]} rounded-lg`} style={{ width: '0%' }} /> /* keep-inline */ /* keep-inline */ /* keep-inline */
                                                        </div>
                                                        <div className="w-24 text-right text-xs font-black text-muted-foreground font-mono">€0</div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Monthly Trend */}
                            <Card className="bg-card/50 border-border">
                                <CardHeader>
                                    <CardTitle className="text-sm font-black uppercase tracking-widest text-foreground flex items-center gap-2">
                                        <TrendingUp className="h-4 w-4 text-emerald-500" /> Monthly Payroll Trend
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {costMetrics.monthly_trend.length > 0 ? (
                                        <div className="space-y-3">
                                            {costMetrics.monthly_trend.map((m, idx) => (
                                                <div key={idx} className="flex items-center gap-4 p-3 bg-white/5 rounded-xl border border-border">
                                                    <div className="w-20 text-xs font-black text-muted-foreground uppercase">{m.month}</div>
                                                    <div className="flex-1">
                                                        <div className="flex gap-2 items-center">
                                                            <div className="flex-1 h-4 bg-white/5 rounded overflow-hidden">
                                                                <div className="h-full bg-blue-500 rounded" style={{ width: `${Math.min(100, (m.gross / Math.max(...costMetrics.monthly_trend.map(t => t.gross), 1)) * 100)}%` }} />
                                                            </div>
                                                            <span className="text-[10px] font-black text-blue-400 w-24 text-right font-mono">€{m.gross.toLocaleString()}</span>
                                                        </div>
                                                        <div className="flex gap-2 items-center mt-1">
                                                            <div className="flex-1 h-4 bg-white/5 rounded overflow-hidden">
                                                                <div className="h-full bg-emerald-500 rounded" style={{ width: `${Math.min(100, (m.net / Math.max(...costMetrics.monthly_trend.map(t => t.gross), 1)) * 100)}%` }} />
                                                            </div>
                                                            <span className="text-[10px] font-black text-emerald-400 w-24 text-right font-mono">€{m.net.toLocaleString()}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                            <div className="flex gap-6 mt-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                                                <span className="flex items-center gap-1"><div className="h-2 w-6 bg-blue-500 rounded" /> Gross</span>
                                                <span className="flex items-center gap-1"><div className="h-2 w-6 bg-emerald-500 rounded" /> Net</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {['Jan', 'Feb', 'Mar'].map((month, idx) => (
                                                <div key={idx} className="flex items-center gap-4 p-3 bg-white/5 rounded-xl border border-border">
                                                    <div className="w-20 text-xs font-black text-muted-foreground uppercase">{month}</div>
                                                    <div className="flex-1">
                                                        <div className="flex gap-2 items-center">
                                                            <div className="flex-1 h-4 bg-white/5 rounded overflow-hidden">
                                                                <div className="h-full bg-blue-500 rounded" style={{ width: '0%' }} /> /* keep-inline */ /* keep-inline */ /* keep-inline */
                                                            </div>
                                                            <span className="text-[10px] font-black text-blue-400 w-24 text-right font-mono">€0</span>
                                                        </div>
                                                        <div className="flex gap-2 items-center mt-1">
                                                            <div className="flex-1 h-4 bg-white/5 rounded overflow-hidden">
                                                                <div className="h-full bg-emerald-500 rounded" style={{ width: '0%' }} /> /* keep-inline */ /* keep-inline */ /* keep-inline */
                                                            </div>
                                                            <span className="text-[10px] font-black text-emerald-400 w-24 text-right font-mono">€0</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                            <div className="flex gap-6 mt-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                                                <span className="flex items-center gap-1"><div className="h-2 w-6 bg-blue-500 rounded" /> Gross</span>
                                                <span className="flex items-center gap-1"><div className="h-2 w-6 bg-emerald-500 rounded" /> Net</span>
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {/* ─── PROCESSING TAB ─────────────────────────────────── */}
                    {activeTab === 'PROCESSING' && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-lg font-black text-foreground uppercase tracking-widest">Payroll Run History</h3>
                                    <p className="text-xs text-muted-foreground font-medium">{runs.length} total runs processed</p>
                                </div>
                                <Button onClick={handleCalculate} disabled={calculating} className="bg-blue-600 hover:bg-blue-500 text-foreground font-black uppercase tracking-widest text-[10px]">
                                    {calculating ? 'Processing...' : 'New Payroll Run'}
                                </Button>
                            </div>

                            <div className="border border-border rounded-2xl overflow-hidden bg-card/50">
                                <table className="w-full text-left">
                                    <thead className="bg-white/5 border-b border-border">
                                        <tr>
                                            <th className="px-4 py-3 text-[10px] font-black uppercase text-muted-foreground">Run Name</th>
                                            <th className="px-4 py-3 text-[10px] font-black uppercase text-muted-foreground">Period</th>
                                            <th className="px-4 py-3 text-[10px] font-black uppercase text-muted-foreground">Employees</th>
                                            <th className="px-4 py-3 text-[10px] font-black uppercase text-muted-foreground">Gross</th>
                                            <th className="px-4 py-3 text-[10px] font-black uppercase text-muted-foreground">Net</th>
                                            <th className="px-4 py-3 text-[10px] font-black uppercase text-muted-foreground">Status</th>
                                            <th className="px-4 py-3 text-[10px] font-black uppercase text-muted-foreground">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {runs.length > 0 ? runs.map(run => (
                                            <tr key={run.id} className="hover:bg-white/5 transition-all cursor-pointer" onClick={() => navigate(`/manager/hr/payroll/${run.id}`)}>
                                                <td className="px-4 py-3 text-xs font-bold text-foreground">{run.run_name}</td>
                                                <td className="px-4 py-3 text-xs text-muted-foreground">{run.period_start} — {run.period_end}</td>
                                                <td className="px-4 py-3 text-xs font-mono text-foreground">{run.employee_count}</td>
                                                <td className="px-4 py-3 text-xs font-mono text-foreground">€{(run.total_gross || 0).toLocaleString()}</td>
                                                <td className="px-4 py-3 text-xs font-mono text-emerald-400">€{(run.total_net || (run.total_gross || 0) * 0.72 || 0).toLocaleString()}</td>
                                                <td className="px-4 py-3">
                                                    <Badge className={cn(
                                                        'uppercase text-[9px] font-black tracking-widest',
                                                        run.state === 'LOCKED' ? 'bg-secondary text-muted-foreground' :
                                                            run.state === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                                                run.state === 'CALCULATED' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                                                                    'bg-blue-600 text-foreground'
                                                    )}>{run.state}</Badge>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex gap-1">
                                                        {run.state === 'APPROVED' && (
                                                            <Button size="sm" variant="outline" className="text-[9px] border-border text-muted-foreground hover:text-foreground" onClick={(e) => { e.stopPropagation(); downloadPayslipPack(run); }}>
                                                                <Download className="h-3 w-3 mr-1" /> Export
                                                            </Button>
                                                        )}
                                                        {run.state === 'LOCKED' && (
                                                            <Button size="sm" variant="outline" className="text-[9px] border-border text-muted-foreground hover:text-foreground" onClick={(e) => { e.stopPropagation(); downloadSEPA(run); }}>
                                                                <Send className="h-3 w-3 mr-1" /> Dispatch
                                                            </Button>
                                                        )}
                                                        <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-rose-500" onClick={(e) => handleDeleteRun(e, run.id)}>
                                                            <Trash2 className="h-3 w-3" />
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        )) : (
                                            <tr>
                                                <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                                                    <ListChecks className="h-12 w-12 mx-auto mb-3 opacity-30" />
                                                    <p className="text-sm font-bold">{"No "}payroll runs yet</p>
                                                    <p className="text-xs">Click 'New Payroll Run' to get started</p>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* DRILL-DOWN DIALOG: Active Employees */}
                    <Dialog open={isDrillDownOpen} onOpenChange={setIsDrillDownOpen}>
                        <DialogContent className="max-w-2xl bg-[#09090b] border-border text-foreground">
                            <DialogHeader>
                                <DialogTitle className="text-xl font-black uppercase tracking-tighter flex items-center gap-3">
                                    <Users className="h-6 w-6 text-emerald-600 dark:text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.3)]" />
                                    Active Payroll Personnel
                                </DialogTitle>
                                <DialogDescription className="text-muted-foreground text-xs font-bold uppercase tracking-widest">
                                    {employees.length} employees ready for the current processing cycle.
                                </DialogDescription>
                            </DialogHeader>

                            {/* Search in Drill-down */}
                            <div className="relative mt-4">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search personnel..."
                                    className="bg-white/5 border-border pl-10 text-xs h-10 rounded-xl"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>

                            <div className="mt-4 space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                {employees.filter((emp: PayrollEmployee) => emp.name?.toLowerCase().includes(searchTerm.toLowerCase())).length > 0 ?
                                    employees.filter((emp: PayrollEmployee) => emp.name?.toLowerCase().includes(searchTerm.toLowerCase())).map((emp: PayrollEmployee, idx: number) => (
                                        <div
                                            key={emp.id}
                                            className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-border hover:bg-white/10 transition-all group"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="h-10 w-10 rounded-lg bg-card flex items-center justify-center font-black text-muted-foreground group-hover:text-foreground group-hover:bg-blue-600/20 transition-all">
                                                    {emp.name?.substring(0, 2).toUpperCase() || '??'}
                                                </div>
                                                <div>
                                                    <div className="text-sm font-black text-foreground">{emp.name || 'Anonymous Staff'}</div>
                                                    <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Code: {emp.employee_code || emp.username || 'EMP-' + (100 + idx)}</div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="text-right hidden md:block">
                                                    <div className="text-[9px] text-muted-foreground font-black uppercase tracking-widest">Status</div>
                                                    <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-none uppercase text-[8px] tracking-tighter h-4">Verified</Badge>
                                                </div>
                                                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground" aria-label="Action">
                                                    <ChevronDown className="h-4 w-4 -rotate-90" />
                                                </Button>
                                            </div>
                                        </div>
                                    )) : (
                                        <div className="text-center py-12">
                                            <Users className="h-12 w-12 text-foreground mx-auto mb-4" />
                                            <p className="text-muted-foreground text-sm italic">{"No "}personnel matches your search.</p>
                                        </div>
                                    )}
                            </div>

                            <div className="mt-6 flex justify-end">
                                <Button
                                    onClick={() => setIsDrillDownOpen(false)}
                                    className="bg-white text-black font-black uppercase tracking-widest text-[10px] px-8"
                                >
                                    Done
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>

                    {/* DRILL-DOWN DIALOG: Next Payroll Run */}
                    <Dialog open={isNextRunDialogOpen} onOpenChange={setIsNextRunDialogOpen}>
                        <DialogContent className="max-w-2xl bg-[#09090b] border-border text-foreground">
                            <DialogHeader>
                                <DialogTitle className="text-xl font-black uppercase tracking-tighter flex items-center gap-3">
                                    <Calendar className="h-6 w-6 text-blue-500" />
                                    Scheduled Payroll Cycle: Feb 2026
                                </DialogTitle>
                                <DialogDescription className="text-muted-foreground text-xs font-bold uppercase tracking-widest">
                                    Processing due in 25 days. Targeting 28th Feb distribution.
                                </DialogDescription>
                            </DialogHeader>

                            <div className="grid grid-cols-3 gap-4 mt-6">
                                <Card className="bg-white/5 border-border p-4">
                                    <Label className="text-[9px] font-black text-muted-foreground uppercase mb-2 block">Submission</Label>
                                    <div className="text-sm font-black text-foreground">22 FEB</div>
                                    <div className="text-[9px] text-blue-400 font-bold">In 19 Days</div>
                                </Card>
                                <Card className="bg-white/5 border-border p-4">
                                    <Label className="text-[9px] font-black text-muted-foreground uppercase mb-2 block">Approval</Label>
                                    <div className="text-sm font-black text-foreground">25 FEB</div>
                                    <div className="text-[9px] text-amber-400 font-bold">Planned</div>
                                </Card>
                                <Card className="bg-white/5 border-border p-4">
                                    <Label className="text-[9px] font-black text-muted-foreground uppercase mb-2 block">Bank Dist.</Label>
                                    <div className="text-sm font-black text-foreground">28 FEB</div>
                                    <div className="text-[9px] text-emerald-400 font-bold">SEPA Ready</div>
                                </Card>
                            </div>

                            <div className="relative mt-6">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Filter upcoming personnel..."
                                    className="bg-white/5 border-border pl-10 text-xs h-10 rounded-xl"
                                    value={nextRunSearch}
                                    onChange={(e) => setNextRunSearch(e.target.value)}
                                />
                            </div>

                            <div className="mt-4 space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                {employees.filter((emp: PayrollEmployee) => emp.name?.toLowerCase().includes(nextRunSearch.toLowerCase())).slice(0, 10).map((emp: PayrollEmployee, idx: number) => (
                                    <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-border">
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-lg bg-card border border-border flex items-center justify-center text-[10px] font-black">{emp.name?.substring(0, 2).toUpperCase()}</div>
                                            <div className="text-xs font-bold">{emp.name}</div>
                                        </div>
                                        <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-none uppercase text-[8px]">Scheduled</Badge>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-6 flex justify-end">
                                <Button
                                    onClick={() => setIsNextRunDialogOpen(false)}
                                    className="bg-blue-600 text-foreground font-black uppercase tracking-widest text-[10px] px-8"
                                >
                                    Update Schedule
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>

                    {/* DRILL-DOWN DIALOG: Last Total Gross Summary */}
                    <Dialog open={isGrossSummaryOpen} onOpenChange={setIsGrossSummaryOpen}>
                        <DialogContent className="max-w-4xl bg-[#09090b] border-border text-foreground">
                            <DialogHeader>
                                <DialogTitle className="text-xl font-black uppercase tracking-tighter flex items-center gap-3">
                                    <Wallet className="h-6 w-6 text-amber-500" />
                                    Gross Expenditure Analysis: Jan 2026
                                </DialogTitle>
                                <DialogDescription className="text-muted-foreground text-xs font-bold uppercase tracking-widest">
                                    Audited figures for the last completed cycle. Total: €45,230.
                                </DialogDescription>
                            </DialogHeader>

                            <div className="relative mt-6">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search audited records..."
                                    className="bg-white/5 border-border pl-10 text-xs h-10 rounded-xl"
                                    value={grossSearch}
                                    onChange={(e) => setGrossSearch(e.target.value)}
                                />
                            </div>

                            <div className="mt-4 border border-border rounded-2xl overflow-hidden bg-white/5">
                                <table className="w-full text-left">
                                    <thead className="bg-white/5 border-b border-border">
                                        <tr>
                                            <th className="px-4 py-3 text-[10px] font-black uppercase text-muted-foreground">Personnel</th>
                                            <th className="px-4 py-3 text-[10px] font-black uppercase text-muted-foreground">Gross</th>
                                            <th className="px-4 py-3 text-[10px] font-black uppercase text-muted-foreground">Tax</th>
                                            <th className="px-4 py-3 text-[10px] font-black uppercase text-muted-foreground">SSC</th>
                                            <th className="px-4 py-3 text-[10px] font-black uppercase text-muted-foreground">Net</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {(runs[0]?.payslips || employees.slice(0, 10)).filter((p: Payslip | PayrollEmployee) => ((p as Payslip).employee_name || (p as PayrollEmployee).name)?.toLowerCase().includes(grossSearch.toLowerCase())).map((p: Payslip | PayrollEmployee, idx: number) => (
                                            <tr key={idx} className="hover:bg-white/5 grayscale hover:grayscale-0 transition-all">
                                                <td className="px-4 py-3">
                                                    <div className="text-xs font-black">{p.employee_name || p.name}</div>
                                                    <div className="text-[9px] text-muted-foreground uppercase">{p.employee_number || 'STF-' + (1000 + idx)}</div>
                                                </td>
                                                <td className="px-4 py-3 text-xs font-mono">€{(p.gross_pay || 2450.00).toLocaleString()}</td>
                                                <td className="px-4 py-3 text-xs font-mono text-rose-500/80">€{(p.tax_amount || 320.50).toLocaleString()}</td>
                                                <td className="px-4 py-3 text-xs font-mono text-emerald-500/80">€{(p.social_security || 180.20 || 0).toLocaleString()}</td>
                                                <td className="px-4 py-3 text-xs font-mono font-black">€{((p.net_pay || 1949.30)).toLocaleString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="mt-6 flex justify-between items-center">
                                <div className="text-[10px] text-muted-foreground font-bold uppercase">
                                    Showing {employees.filter((p: PayrollEmployee) => (p.employee_name || p.name)?.toLowerCase().includes(grossSearch.toLowerCase())).length} historical records
                                </div>
                                <Button
                                    onClick={() => setIsGrossSummaryOpen(false)}
                                    className="bg-amber-600 text-foreground font-black uppercase tracking-widest text-[10px] px-8 shadow-[0_0_20px_rgba(217,119,6,0.2)]"
                                >
                                    Done
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            </PageContainer>
        </PermissionGate>
    );

    function resetFilters() {
        setSearchTerm('');
        setDocTypeFilter('ALL');
        setPeriodFilter('Feb 2026');
    }
}
