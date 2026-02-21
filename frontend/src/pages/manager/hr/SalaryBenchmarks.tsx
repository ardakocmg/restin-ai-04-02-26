import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { logger } from '@/lib/logger';
import { TrendingUp, DollarSign, Users, BarChart2, AlertTriangle, Clock } from 'lucide-react';

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
        } catch (e) { logger.error('Failed to fetch benchmarks:', e); }
        setLoading(false);
    }, [venueId]);

    useEffect(() => { fetchData(); }, [fetchData]);

    /* No full-page spinner — page renders immediately with €0 values */

    const avgSalary = benchmarks.length ? Math.round(benchmarks.reduce((s, b) => s + (b.avg_salary || 0), 0) / benchmarks.length) : 0;
    const totalEmployees = benchmarks.reduce((s, b) => s + (b.employee_count || 0), 0);
    const gapPct = genderGap?.gender_pay_gap_pct ?? 0;

    return (
        <div style={{ padding: '24px 32px', maxWidth: 1400, margin: '0 auto' }}>
            <div style={{ marginBottom: 24 }}>
                <h1 style={{ fontSize: 28, fontWeight: 700, color: '#f1f5f9', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <TrendingUp size={28} style={{ color: '#6366f1' }} /> Salary Benchmarks
                </h1>
                <p style={{ color: '#64748b', marginTop: 4 }}>Internal salary comparison by role, department & gender pay gap analysis</p>
            </div>

            {/* Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
                {[
                    { label: 'Avg Salary', value: `€${avgSalary.toLocaleString()}`, color: '#6366f1', icon: DollarSign },
                    { label: 'Roles Tracked', value: benchmarks.length, color: '#3b82f6', icon: BarChart2 },
                    { label: 'Employees', value: totalEmployees, color: '#22c55e', icon: Users },
                    { label: 'Gender Gap', value: `${gapPct}%`, color: Math.abs(gapPct) > 5 ? '#ef4444' : '#22c55e', icon: AlertTriangle },
                ].map((s, i) => (
                    <div key={i} style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, padding: 20 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#64748b', fontSize: 13 }}>{s.label}</span>
                            <s.icon size={18} style={{ color: s.color }} />
                        </div>
                        <div style={{ fontSize: 28, fontWeight: 700, color: '#f1f5f9', marginTop: 8 }}>{s.value}</div>
                    </div>
                ))}
            </div>

            {/* Gender Pay Gap Analysis */}
            {genderGap && (
                <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, padding: 24, marginBottom: 24 }}>
                    <h3 style={{ color: '#f1f5f9', fontSize: 18, fontWeight: 600, marginBottom: 16, margin: '0 0 16px' }}>Gender Pay Gap Analysis</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                        {[
                            { label: 'Male Average', color: '#3b82f6', avg: genderGap.by_gender?.male?.avg_salary || 0, count: genderGap.by_gender?.male?.count || 0 },
                            { label: 'Female Average', color: '#ec4899', avg: genderGap.by_gender?.female?.avg_salary || 0, count: genderGap.by_gender?.female?.count || 0 },
                            { label: 'Pay Gap', color: Math.abs(gapPct) > 5 ? '#ef4444' : '#22c55e', avg: null, count: null },
                        ].map((g, i) => (
                            <div key={i} style={{ background: '#1e293b', borderRadius: 8, padding: 16, textAlign: 'center' }}>
                                <div style={{ color: g.color, fontSize: 13, marginBottom: 8 }}>{g.label}</div>
                                <div style={{ color: '#f1f5f9', fontSize: 24, fontWeight: 700 }}>
                                    {g.avg !== null ? `€${Math.round(g.avg).toLocaleString()}` : `${gapPct}%`}
                                </div>
                                <div style={{ color: '#64748b', fontSize: 12, marginTop: 4 }}>
                                    {g.count !== null ? `${g.count} employees` : (genderGap.eu_compliant ? '✓ Within EU threshold' : '⚠ Exceeds 5% threshold')}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Role Benchmarks Table */}
            <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, overflow: 'hidden' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid #1e293b' }}>
                    <h3 style={{ color: '#f1f5f9', fontSize: 16, fontWeight: 600, margin: 0 }}>Salary by Role / Department</h3>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid #1e293b' }}>
                            {['Role / Department', 'Employees', 'Min', 'Avg', 'Max', 'Spread'].map(h => (
                                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', color: '#64748b', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {benchmarks.length === 0 ? (
                            <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>{"No "}salary data available.</td></tr>
                        ) : benchmarks.map((b, i) => {
                            const spread = b.max_salary && b.min_salary && b.avg_salary ? Math.round(((b.max_salary - b.min_salary) / b.avg_salary) * 100) : 0;
                            return (
                                <tr key={i} style={{ borderBottom: '1px solid #1e293b22' }}>
                                    <td style={{ padding: '12px 16px' }}>
                                        <div style={{ color: '#f1f5f9', fontSize: 14, fontWeight: 500 }}>{b.occupation || b.department || 'Unassigned'}</div>
                                        {b.department && b.occupation && <div style={{ color: '#64748b', fontSize: 12 }}>{b.department}</div>}
                                    </td>
                                    <td style={{ padding: '12px 16px', color: '#94a3b8', fontSize: 14 }}>{b.employee_count || 0}</td>
                                    <td style={{ padding: '12px 16px', color: '#94a3b8', fontSize: 14 }}>€{Math.round(b.min_salary || 0).toLocaleString()}</td>
                                    <td style={{ padding: '12px 16px', color: '#f1f5f9', fontSize: 14, fontWeight: 600 }}>€{Math.round(b.avg_salary || 0).toLocaleString()}</td>
                                    <td style={{ padding: '12px 16px', color: '#94a3b8', fontSize: 14 }}>€{Math.round(b.max_salary || 0).toLocaleString()}</td>
                                    <td style={{ padding: '12px 16px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <div style={{ width: 60, height: 6, background: '#1e293b', borderRadius: 3 }}>
                                                <div style={{ height: '100%', background: spread > 50 ? '#ef4444' : spread > 25 ? '#f59e0b' : '#22c55e', borderRadius: 3, width: `${Math.min(spread, 100)}%` }} />
                                            </div>
                                            <span style={{ color: '#64748b', fontSize: 12 }}>{spread}%</span>
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
