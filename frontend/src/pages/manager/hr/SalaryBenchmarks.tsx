import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { logger } from '@/lib/logger';
import { AlertTriangle,BarChart2,DollarSign,TrendingUp,Users } from 'lucide-react';
import { useCallback,useEffect,useState } from 'react';

interface SalaryBenchmark {
    occupation?: string;
    department?: string;
    employee_count: number;
    avg_salary: number;
    min_salary: number;
    max_salary: number;
}

interface GenderStats {
    avg_salary: number;
    count: number;
}

interface GenderGapData {
    gender_pay_gap_pct: number;
    eu_compliant: boolean;
    by_gender?: {
        male?: GenderStats;
        female?: GenderStats;
    };
}

export default function SalaryBenchmarks() {
    const { user } = useAuth();
    const [benchmarks, setBenchmarks] = useState<SalaryBenchmark[]>([]);
    const [genderGap, setGenderGap] = useState<GenderGapData | null>(null);
    const [loading, setLoading] = useState(true);

    const venueId = localStorage.getItem('currentVenueId');

    const fetchData = useCallback(async () => {
        if (!venueId) return;
        setLoading(true);
        try {
            const [bRes, gRes] = await Promise.all([
                api.get(`/venues/${venueId}/hr/salary-benchmarks`),
                api.get(`/venues/${venueId}/hr/salary-benchmarks/gender-gap`),
            ]);
            setBenchmarks(bRes.data?.benchmarks || bRes.data || []);
            setGenderGap(gRes.data || null);
        } catch (e) { logger.error('Failed to fetch benchmarks:', { error: String(e) }); }
        setLoading(false);
    }, [venueId]);

    useEffect(() => { fetchData(); }, [fetchData]);

    /* No full-page spinner — page renders immediately with €0 values */

    const avgSalary = benchmarks.length ? Math.round(benchmarks.reduce((s, b) => s + (b.avg_salary || 0), 0) / benchmarks.length) : 0;
    const totalEmployees = benchmarks.reduce((s, b) => s + (b.employee_count || 0), 0);
    const gapPct = genderGap?.gender_pay_gap_pct ?? 0;

    return (
        <div className="px-8 py-6 max-w-[1400px] mx-auto">
            <div className="mb-6">
                <h1 className="text-[28px] font-bold text-slate-100 m-0 flex items-center gap-2.5">
                    <TrendingUp size={28} className="text-indigo-400" /> Salary Benchmarks
                </h1>
                <p className="text-slate-500 mt-1">Internal salary comparison by role, department & gender pay gap analysis</p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-4 gap-4 mb-6">
                {[
                    { label: 'Avg Salary', value: `€${avgSalary.toLocaleString()}`, color: 'text-indigo-400', icon: DollarSign },
                    { label: 'Roles Tracked', value: benchmarks.length, color: 'text-blue-400', icon: BarChart2 },
                    { label: 'Employees', value: totalEmployees, color: 'text-green-400', icon: Users },
                    { label: 'Gender Gap', value: `${gapPct}%`, color: Math.abs(gapPct) > 5 ? 'text-red-400' : 'text-green-400', icon: AlertTriangle },
                ].map((s, i) => (
                    <div key={i} className="bg-slate-950 border border-slate-800 rounded-xl p-5">
                        <div className="flex justify-between">
                            <span className="text-slate-500 text-[13px]">{s.label}</span>
                            <s.icon size={18} className={s.color} />
                        </div>
                        <div className="text-[28px] font-bold text-slate-100 mt-2">{s.value}</div>
                    </div>
                ))}
            </div>

            {/* Gender Pay Gap Analysis */}
            {genderGap && (
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 mb-6">
                    <h3 className="text-slate-100 text-lg font-semibold mb-4 mt-0">Gender Pay Gap Analysis</h3>
                    <div className="grid grid-cols-3 gap-4">
                        {[
                            { label: 'Male Average', color: 'text-blue-400', avg: genderGap.by_gender?.male?.avg_salary || 0, count: genderGap.by_gender?.male?.count || 0 },
                            { label: 'Female Average', color: 'text-pink-400', avg: genderGap.by_gender?.female?.avg_salary || 0, count: genderGap.by_gender?.female?.count || 0 },
                            { label: 'Pay Gap', color: Math.abs(gapPct) > 5 ? 'text-red-400' : 'text-green-400', avg: null, count: null },
                        ].map((g, i) => (
                            <div key={i} className="bg-slate-800 rounded-lg p-4 text-center">
                                <div className={`${g.color} text-[13px] mb-2`}>{g.label}</div>
                                <div className="text-slate-100 text-2xl font-bold">
                                    {g.avg !== null ? `€${Math.round(g.avg).toLocaleString()}` : `${gapPct}%`}
                                </div>
                                <div className="text-slate-500 text-xs mt-1">
                                    {g.count !== null ? `${g.count} employees` : (genderGap.eu_compliant ? '✓ Within EU threshold' : '⚠ Exceeds 5% threshold')}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Role Benchmarks Table */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-800">
                    <h3 className="text-slate-100 text-base font-semibold m-0">Salary by Role / Department</h3>
                </div>
                <table className="w-full border-collapse">
                    <thead>
                        <tr className="border-b border-slate-800">
                            {['Role / Department', 'Employees', 'Min', 'Avg', 'Max', 'Spread'].map(h => (
                                <th key={h} className="px-4 py-3 text-left text-slate-500 text-xs font-semibold uppercase">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {benchmarks.length === 0 ? (
                            <tr><td colSpan={6} className="p-10 text-center text-slate-500">{"No "}salary data available.</td></tr>
                        ) : benchmarks.map((b, i) => {
                            const spread = b.max_salary && b.min_salary && b.avg_salary ? Math.round(((b.max_salary - b.min_salary) / b.avg_salary) * 100) : 0;
                            return (
                                <tr key={i} className="border-b border-slate-800/20">
                                    <td className="px-4 py-3">
                                        <div className="text-slate-100 text-sm font-medium">{b.occupation || b.department || 'Unassigned'}</div>
                                        {b.department && b.occupation && <div className="text-slate-500 text-xs">{b.department}</div>}
                                    </td>
                                    <td className="px-4 py-3 text-slate-400 text-sm">{b.employee_count || 0}</td>
                                    <td className="px-4 py-3 text-slate-400 text-sm">€{Math.round(b.min_salary || 0).toLocaleString()}</td>
                                    <td className="px-4 py-3 text-slate-100 text-sm font-semibold">€{Math.round(b.avg_salary || 0).toLocaleString()}</td>
                                    <td className="px-4 py-3 text-slate-400 text-sm">€{Math.round(b.max_salary || 0).toLocaleString()}</td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <div className="w-[60px] h-1.5 bg-slate-800 rounded-sm">
                                                <div className={`h-full rounded-sm ${spread > 50 ? 'bg-red-400' : spread > 25 ? 'bg-amber-400' : 'bg-green-400'}`} style={{ width: `${Math.min(spread, 100)}%`  /* keep-inline */ }} /> {}
                                            </div>
                                            <span className="text-slate-500 text-xs">{spread}%</span>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
