/**
 * KitchenAnalytics.tsx — K-Series Kitchen Performance Analytics
 * Kitchen speed, ticket times, production center efficiency
 * Lightspeed K-Series Back Office > Reports > Kitchen parity
 */
import React, { useState } from 'react';
import { ArrowLeft, Clock, ChefHat, TrendingUp, TrendingDown, AlertTriangle, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './pos-shared.css';

interface StationMetric { name: string; avgTime: number; ticketsToday: number; trend: number; bumped: number; recalled: number; }
interface HourlyData { hour: string; avgTime: number; tickets: number; }

const STATIONS: StationMetric[] = [
    { name: 'Main Kitchen', avgTime: 12.4, ticketsToday: 86, trend: -8, bumped: 82, recalled: 4 },
    { name: 'Bar', avgTime: 4.2, ticketsToday: 124, trend: -12, bumped: 120, recalled: 4 },
    { name: 'Pastry Station', avgTime: 8.7, ticketsToday: 28, trend: 3, bumped: 26, recalled: 2 },
    { name: 'Pizza Station', avgTime: 10.1, ticketsToday: 42, trend: -5, bumped: 40, recalled: 2 },
    { name: 'Cold Kitchen', avgTime: 5.3, ticketsToday: 56, trend: -15, bumped: 55, recalled: 1 },
];

const HOURLY: HourlyData[] = [
    { hour: '11:00', avgTime: 8.2, tickets: 6 }, { hour: '12:00', avgTime: 14.5, tickets: 22 }, { hour: '13:00', avgTime: 16.8, tickets: 34 },
    { hour: '14:00', avgTime: 12.1, tickets: 18 }, { hour: '15:00', avgTime: 6.4, tickets: 8 }, { hour: '16:00', avgTime: 5.2, tickets: 4 },
    { hour: '17:00', avgTime: 7.8, tickets: 12 }, { hour: '18:00', avgTime: 11.2, tickets: 28 }, { hour: '19:00', avgTime: 15.6, tickets: 42 },
    { hour: '20:00', avgTime: 18.2, tickets: 48 }, { hour: '21:00', avgTime: 14.8, tickets: 36 }, { hour: '22:00', avgTime: 9.5, tickets: 14 },
];

const TOP_SLOW = [
    { name: 'Wagyu Ribeye', avg: 22, orders: 8 }, { name: 'Slow-Roasted Lamb', avg: 18, orders: 12 }, { name: 'Seafood Risotto', avg: 16, orders: 15 },
    { name: 'Lobster Thermidor', avg: 15, orders: 6 }, { name: 'Duck Confit', avg: 14, orders: 9 },
];

const KitchenAnalytics: React.FC = () => {
    const navigate = useNavigate();
    const [period, setPeriod] = useState<'today' | 'week' | 'month'>('today');
    const totalTickets = STATIONS.reduce((s, st) => s + st.ticketsToday, 0);
    const avgOverall = (STATIONS.reduce((s, st) => s + st.avgTime, 0) / STATIONS.length).toFixed(1);
    const maxTime = Math.max(...HOURLY.map(h => h.avgTime));

    return (
        <div className="pos-page"><div className="pos-container max-w-[1200px]">
            <div className="pos-header">
                <div>
                    <button onClick={() => navigate(-1)} className="pos-btn-outline pos-btn-back"><ArrowLeft size={14} /> Back</button>
                    <h1 className="pos-title">Kitchen Analytics</h1>
                    <p className="pos-subtitle">Production speed and efficiency metrics</p>
                </div>
                <div className="pos-toggle-group">
                    {(['today', 'week', 'month'] as const).map(p => (
                        <button key={p} onClick={() => setPeriod(p)} className={`pos-toggle-btn capitalize ${period === p ? 'pos-toggle-btn--active' : ''}`}>{p}</button>
                    ))}
                </div>
            </div>

            {/* Stats */}
            <div className="pos-stats-grid pos-mb-20">
                {/* keep-inline: dynamic background/color from data-driven stat config */}
                {[{ l: 'Avg Ticket Time', v: `${avgOverall}m`, c: '#3B82F6', i: <Clock size={16} /> }, { l: 'Tickets Today', v: totalTickets.toString(), c: '#10B981', i: <ChefHat size={16} /> }, { l: 'On-Time Rate', v: '87%', c: '#F59E0B', i: <Zap size={16} /> }, { l: 'Recalls', v: STATIONS.reduce((s, st) => s + st.recalled, 0).toString(), c: '#EF4444', i: <AlertTriangle size={16} /> }].map((s, i) => (
                    <div key={i} className="pos-stat-card">
                        <div className="pos-stat-icon" style={{ background: `${s.c}15`, color: s.c  /* keep-inline */ }}>{s.i}</div>
                        <div><div className="pos-stat-value">{s.v}</div><div className="pos-stat-label">{s.l}</div></div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-2 gap-4">
                {/* Station Performance */}
                <div className="pos-card">
                    <h3 className="pos-card-title">Station Performance</h3>
                    {STATIONS.map(station => (
                        <div key={station.name} className="pos-flex pos-flex--center pos-gap-12 py-2.5 border-b border-white/[0.04]">
                            <div className="flex-1">
                                <div className="pos-cell-value">{station.name}</div>
                                <div className="pos-cell-secondary">{station.ticketsToday} tickets · {station.bumped} bumped</div>
                            </div>
                            <div className="text-right">
                                <div className="text-base font-bold">{station.avgTime}m</div>
                                <div className={`pos-flex pos-flex--center pos-gap-4 text-[11px] justify-end ${station.trend < 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                    {station.trend < 0 ? <TrendingDown size={10} /> : <TrendingUp size={10} />} {Math.abs(station.trend)}%
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Hourly Chart */}
                <div className="pos-card">
                    <h3 className="pos-card-title">Hourly Avg Ticket Time</h3>
                    {/* keep-inline: dynamic height percentages and conditional colors computed at runtime */}
                    <div className="flex items-end gap-1 h-[180px] pb-5 relative">
                        {HOURLY.map(h => {
                            const pct = (h.avgTime / maxTime) * 100; return (
                                <div key={h.hour} className="flex-1 flex flex-col items-center gap-1">
                                    <span className={`text-[9px] font-semibold ${h.avgTime > 15 ? 'text-red-500' : 'text-blue-500'}`}>{h.avgTime}m</span>
                                    <div className={`w-full rounded min-h-1 ${h.avgTime > 15 ? 'bg-red-500/40' : 'bg-blue-500/40'}`} style={{ height: `${pct}%`  /* keep-inline */ }} /> {/* keep-inline: dynamic height from calculated percentage */}
                                    <span className="text-[8px] text-[var(--text-secondary)] -rotate-45 whitespace-nowrap">{h.hour}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Slowest Items */}
                <div className="pos-card">
                    <h3 className="pos-card-title pos-flex pos-flex--center pos-gap-6"><AlertTriangle size={14} className="text-amber-500" /> Slowest Items</h3>
                    {TOP_SLOW.map((item, i) => (
                        <div key={item.name} className="pos-flex pos-flex--center pos-gap-10 py-2 border-b border-white/[0.04]">
                            <span className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold text-red-500 bg-red-500/15">{i + 1}</span>
                            <div className="flex-1">
                                <div className="pos-cell-value">{item.name}</div>
                                <div className="pos-cell-secondary">{item.orders} orders today</div>
                            </div>
                            <span className="text-[15px] font-bold text-red-500">{item.avg}m</span>
                        </div>
                    ))}
                </div>

                {/* Speed Tips */}
                <div className="pos-card bg-emerald-500/[0.04] border border-emerald-500/20">
                    <h3 className="pos-card-title text-emerald-500">💡 Speed Insights</h3>
                    {[
                        '🔥 Peak slow: 20:00–20:59 avg 18.2min — consider an extra cook',
                        '✅ Bar performance improved 12% vs last week',
                        '⚠️ Wagyu Ribeye consistently slowest — review prep workflow',
                        '📊 4 recalls today (avg 2.8/day) — quality holding steady',
                    ].map((tip, i) => (
                        <div key={i} className={`pos-cell-secondary py-1.5 leading-relaxed ${i < 3 ? 'border-b border-white/[0.04]' : ''}`}>{tip}</div>
                    ))}
                </div>
            </div>
        </div></div>
    );
};

export default KitchenAnalytics;
