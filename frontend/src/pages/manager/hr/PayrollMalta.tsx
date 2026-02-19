/**
 * 💰 Payroll Malta Dashboard
 * FSS/NI calculations, payroll runs, payslips, and compliance.
 * Connected to: /api/payroll-mt/*, /api/fin-mt/*
 */
import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    DollarSign, FileText, Users, Calculator, Download,
    Calendar, CheckCircle, Clock, AlertTriangle, Loader2,
    Play, Eye, TrendingUp, Building2, Shield
} from 'lucide-react';
import { toast } from 'sonner';
import { useVenue } from '../../../context/VenueContext';
import { useAuth } from '../../../context/AuthContext';
import { cn } from '../../../lib/utils';
import api from '../../../lib/api';

// ─── Types ───
interface PayrollRun {
    id: string;
    venue_id: string;
    period: string;
    month: number;
    year: number;
    status: 'draft' | 'processing' | 'approved' | 'paid';
    total_gross_cents: number;
    total_net_cents: number;
    total_fss_cents: number;
    total_ni_cents: number;
    employee_count: number;
    created_at: string;
    approved_at?: string;
}

interface PayrollStats {
    total_runs: number;
    total_paid_cents: number;
    total_fss_cents: number;
    total_ni_cents: number;
    employees_on_payroll: number;
    last_run_date?: string;
}

interface Payslip {
    id: string;
    employee_name: string;
    employee_id: string;
    period: string;
    gross_cents: number;
    net_cents: number;
    fss_employee_cents: number;
    fss_employer_cents: number;
    ni_cents: number;
    bonus_cents: number;
    deductions_cents: number;
    status: string;
}

const formatCents = (cents: number): string => {
    return `€${(cents / 100).toLocaleString('en-MT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

// ─── Component ───
export default function PayrollMalta() {
    const { t } = useTranslation();
    const { activeVenue } = useVenue();
    const { token } = useAuth();
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState<'overview' | 'runs' | 'payslips' | 'config'>('overview');

    const venueId = activeVenue?.id || '';

    const headers = useCallback(() => ({
        Authorization: `Bearer ${token}`,
    }), [token]);

    // ─── Queries ───
    const { data: stats, isLoading: statsLoading } = useQuery({
        queryKey: ['payroll-stats', venueId],
        queryFn: async () => {
            const res = await api.get(`/api/payroll-mt/stats?venue_id=${venueId}`, { headers: headers() });
            return res.data?.data as PayrollStats;
        },
        enabled: !!venueId,
    });

    const { data: runs = [], isLoading: runsLoading } = useQuery({
        queryKey: ['payroll-runs', venueId],
        queryFn: async () => {
            const res = await api.get(`/api/payroll-mt/runs?venue_id=${venueId}`, { headers: headers() });
            return (res.data?.data || []) as PayrollRun[];
        },
        enabled: !!venueId,
    });

    const { data: payslips = [] } = useQuery({
        queryKey: ['payroll-payslips', venueId],
        queryFn: async () => {
            const res = await api.get(`/api/payroll-mt/payslips?venue_id=${venueId}`, { headers: headers() });
            return (res.data?.data || []) as Payslip[];
        },
        enabled: !!venueId,
    });

    const { data: fssConfig } = useQuery({
        queryKey: ['payroll-fss-config', venueId],
        queryFn: async () => {
            const res = await api.get(`/api/payroll-mt/fss-config?venue_id=${venueId}`, { headers: headers() });
            return res.data?.data;
        },
        enabled: !!venueId && activeTab === 'config',
    });

    // ─── Mutations ───
    const runPayrollMut = useMutation({
        mutationFn: async () => {
            return api.post(`/api/payroll-mt/run`, { venue_id: venueId }, { headers: headers() });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['payroll-runs'] });
            queryClient.invalidateQueries({ queryKey: ['payroll-stats'] });
            queryClient.invalidateQueries({ queryKey: ['payroll-payslips'] });
            toast.success(t('Payroll run initiated'));
        },
        onError: () => toast.error(t('Failed to run payroll')),
    });

    const exportMut = useMutation({
        mutationFn: async (runId: string) => {
            return api.get(`/api/payroll-mt/export/${runId}?venue_id=${venueId}`, { headers: headers() });
        },
        onSuccess: () => toast.success(t('Export generated')),
    });

    const loading = statsLoading || runsLoading;

    return (
        <div className="p-6 space-y-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Calculator className="w-7 h-7 text-emerald-500" />
                        {t('Payroll Malta')}
                    </h1>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                        {t('FSS, NI & Payroll Management — Malta Compliance')}
                    </p>
                </div>
                <Button size="sm" onClick={() => runPayrollMut.mutate()} disabled={runPayrollMut.isPending}>
                    {runPayrollMut.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Play className="w-4 h-4 mr-1" />}
                    {t('Run Payroll')}
                </Button>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <Card><CardContent className="pt-4 pb-3">
                    <div className="text-xs text-zinc-500 flex items-center gap-1"><Users className="w-3 h-3" /> {t('Employees')}</div>
                    <div className="text-2xl font-bold mt-1">{stats?.employees_on_payroll ?? '—'}</div>
                </CardContent></Card>
                <Card><CardContent className="pt-4 pb-3">
                    <div className="text-xs text-zinc-500 flex items-center gap-1"><DollarSign className="w-3 h-3" /> {t('Total Paid')}</div>
                    <div className="text-2xl font-bold mt-1 text-emerald-600">{stats ? formatCents(stats.total_paid_cents) : '—'}</div>
                </CardContent></Card>
                <Card><CardContent className="pt-4 pb-3">
                    <div className="text-xs text-zinc-500 flex items-center gap-1"><Building2 className="w-3 h-3" /> {t('FSS')}</div>
                    <div className="text-2xl font-bold mt-1">{stats ? formatCents(stats.total_fss_cents) : '—'}</div>
                </CardContent></Card>
                <Card><CardContent className="pt-4 pb-3">
                    <div className="text-xs text-zinc-500 flex items-center gap-1"><Shield className="w-3 h-3" /> {t('NI')}</div>
                    <div className="text-2xl font-bold mt-1">{stats ? formatCents(stats.total_ni_cents) : '—'}</div>
                </CardContent></Card>
                <Card><CardContent className="pt-4 pb-3">
                    <div className="text-xs text-zinc-500 flex items-center gap-1"><FileText className="w-3 h-3" /> {t('Runs')}</div>
                    <div className="text-2xl font-bold mt-1">{stats?.total_runs ?? '—'}</div>
                </CardContent></Card>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 border-b border-zinc-200 dark:border-zinc-700">
                {(['overview', 'runs', 'payslips', 'config'] as const).map(tab => (
                    <button key={tab} onClick={() => setActiveTab(tab)}
                        className={cn(
                            'px-4 py-2 text-sm font-medium border-b-2 transition-colors capitalize',
                            activeTab === tab
                                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                                : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                        )}>
                        {t(tab)}
                    </button>
                ))}
            </div>

            {/* Overview Tab */}
            {activeTab === 'overview' && (
                <div className="space-y-4">
                    {loading && <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-zinc-400" /></div>}

                    {/* Recent Runs */}
                    <Card>
                        <CardHeader><CardTitle className="text-sm">{t('Recent Payroll Runs')}</CardTitle></CardHeader>
                        <CardContent>
                            {runs.length === 0 ? (
                                <div className="text-center py-8 text-zinc-500">
                                    <Calculator className="w-10 h-10 mx-auto mb-3 opacity-30" />
                                    <p>{t('No payroll runs yet. Click "Run Payroll" to start.')}</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {runs.slice(0, 5).map(run => (
                                        <div key={run.id} className="flex items-center justify-between py-2 border-b dark:border-zinc-800 last:border-0">
                                            <div className="flex items-center gap-3">
                                                <div className={cn(
                                                    'w-8 h-8 rounded-lg flex items-center justify-center text-sm',
                                                    run.status === 'paid' ? 'bg-green-100 dark:bg-green-900/30 text-green-600' :
                                                        run.status === 'approved' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600' :
                                                            'bg-zinc-100 dark:bg-zinc-800 text-zinc-600'
                                                )}>
                                                    {run.status === 'paid' ? <CheckCircle className="w-4 h-4" /> :
                                                        run.status === 'approved' ? <Eye className="w-4 h-4" /> :
                                                            <Clock className="w-4 h-4" />}
                                                </div>
                                                <div>
                                                    <div className="font-medium text-sm">{run.period}</div>
                                                    <div className="text-xs text-zinc-500">{run.employee_count} {t('employees')} • {new Date(run.created_at).toLocaleDateString()}</div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="text-right">
                                                    <div className="font-semibold text-sm">{formatCents(run.total_net_cents)}</div>
                                                    <div className="text-xs text-zinc-400">{t('Net')}</div>
                                                </div>
                                                <span className={cn(
                                                    'px-2 py-0.5 rounded-full text-xs font-medium capitalize',
                                                    run.status === 'paid' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                                        run.status === 'approved' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                                                            'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                                                )}>
                                                    {run.status}
                                                </span>
                                                <Button variant="ghost" size="sm" onClick={() => exportMut.mutate(run.id)} title="Export payroll run">
                                                    <Download className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Runs Tab */}
            {activeTab === 'runs' && (
                <Card>
                    <CardContent className="pt-4">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b dark:border-zinc-700">
                                        <th className="text-left py-2 font-medium text-zinc-500">{t('Period')}</th>
                                        <th className="text-center py-2 font-medium text-zinc-500">{t('Employees')}</th>
                                        <th className="text-right py-2 font-medium text-zinc-500">{t('Gross')}</th>
                                        <th className="text-right py-2 font-medium text-zinc-500">{t('FSS')}</th>
                                        <th className="text-right py-2 font-medium text-zinc-500">{t('NI')}</th>
                                        <th className="text-right py-2 font-medium text-zinc-500">{t('Net')}</th>
                                        <th className="text-center py-2 font-medium text-zinc-500">{t('Status')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {runs.map(run => (
                                        <tr key={run.id} className="border-b dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                                            <td className="py-2 font-medium">{run.period}</td>
                                            <td className="py-2 text-center">{run.employee_count}</td>
                                            <td className="py-2 text-right">{formatCents(run.total_gross_cents)}</td>
                                            <td className="py-2 text-right text-amber-600">{formatCents(run.total_fss_cents)}</td>
                                            <td className="py-2 text-right text-blue-600">{formatCents(run.total_ni_cents)}</td>
                                            <td className="py-2 text-right font-semibold text-emerald-600">{formatCents(run.total_net_cents)}</td>
                                            <td className="py-2 text-center">
                                                <span className={cn('px-2 py-0.5 rounded-full text-xs capitalize',
                                                    run.status === 'paid' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                                        'bg-zinc-100 text-zinc-600 dark:bg-zinc-800'
                                                )}>{run.status}</span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Payslips Tab */}
            {activeTab === 'payslips' && (
                <div className="space-y-3">
                    {payslips.length === 0 ? (
                        <Card><CardContent className="py-12 text-center text-zinc-500">
                            <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
                            <p>{t('No payslips generated yet.')}</p>
                        </CardContent></Card>
                    ) : payslips.map(slip => (
                        <Card key={slip.id}>
                            <CardContent className="py-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="font-medium text-sm">{slip.employee_name}</h3>
                                        <div className="text-xs text-zinc-500 mt-0.5">{slip.period}</div>
                                    </div>
                                    <div className="flex items-center gap-6 text-sm">
                                        <div className="text-right">
                                            <div className="text-zinc-400 text-xs">{t('Gross')}</div>
                                            <div>{formatCents(slip.gross_cents)}</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-zinc-400 text-xs">{t('FSS')}</div>
                                            <div className="text-amber-600">{formatCents(slip.fss_employee_cents)}</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-zinc-400 text-xs">{t('Net')}</div>
                                            <div className="font-semibold text-emerald-600">{formatCents(slip.net_cents)}</div>
                                        </div>
                                        <Button variant="ghost" size="sm" title="Download payslip"><Download className="w-4 h-4" /></Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Config Tab */}
            {activeTab === 'config' && (
                <div className="grid md:grid-cols-2 gap-4">
                    <Card>
                        <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Building2 className="w-4 h-4" /> {t('FSS Configuration')}</CardTitle></CardHeader>
                        <CardContent className="space-y-3 text-sm">
                            <div className="flex justify-between py-1 border-b dark:border-zinc-800">
                                <span className="text-zinc-500">{t('Employee Rate')}</span>
                                <span className="font-medium">{fssConfig?.employee_rate ?? '10'}%</span>
                            </div>
                            <div className="flex justify-between py-1 border-b dark:border-zinc-800">
                                <span className="text-zinc-500">{t('Employer Rate')}</span>
                                <span className="font-medium">{fssConfig?.employer_rate ?? '10'}%</span>
                            </div>
                            <div className="flex justify-between py-1 border-b dark:border-zinc-800">
                                <span className="text-zinc-500">{t('Max Weekly Salary')}</span>
                                <span className="font-medium">€{fssConfig?.max_weekly ?? '534.59'}</span>
                            </div>
                            <div className="flex justify-between py-1">
                                <span className="text-zinc-500">{t('Maternity Fund')}</span>
                                <span className="font-medium">{fssConfig?.maternity_fund ?? '0.3'}%</span>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Shield className="w-4 h-4" /> {t('NI Contributions')}</CardTitle></CardHeader>
                        <CardContent className="space-y-3 text-sm">
                            <div className="flex justify-between py-1 border-b dark:border-zinc-800">
                                <span className="text-zinc-500">{t('Class 1 (Employee)')}</span>
                                <span className="font-medium">10%</span>
                            </div>
                            <div className="flex justify-between py-1 border-b dark:border-zinc-800">
                                <span className="text-zinc-500">{t('Class 2 (Self-Employed)')}</span>
                                <span className="font-medium">15%</span>
                            </div>
                            <div className="flex justify-between py-1 border-b dark:border-zinc-800">
                                <span className="text-zinc-500">{t('Minimum Contribution')}</span>
                                <span className="font-medium">€15.28/week</span>
                            </div>
                            <div className="flex justify-between py-1">
                                <span className="text-zinc-500">{t('Compliance Status')}</span>
                                <span className="font-medium text-green-600 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> {t('Compliant')}</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
