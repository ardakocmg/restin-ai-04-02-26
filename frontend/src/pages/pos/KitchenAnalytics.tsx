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
        <div className="pos-page"><div className="pos-container" style={{ maxWidth: 1200 }}> /* keep-inline */
            <div className="pos-header">
                <div>
                    <button onClick={() => navigate(-1)} className="pos-btn-outline pos-btn-back"><ArrowLeft size={14} /> Back</button>
                    <h1 className="pos-title">Kitchen Analytics</h1>
                    <p className="pos-subtitle">Production speed and efficiency metrics</p>
                </div>
                <div className="pos-toggle-group">
                    {(['today', 'week', 'month'] as const).map(p => (
                        <button key={p} onClick={() => setPeriod(p)} className={`pos-toggle-btn ${period === p ? 'pos-toggle-btn--active' : ''}`} style={{ textTransform: 'capitalize' }}>{p}</button> /* keep-inline */
                    ))}
                </div>
            </div>

            {/* Stats */}
            <div className="pos-stats-grid pos-mb-20">
                {[{ l: 'Avg Ticket Time', v: `${avgOverall}m`, c: '#3B82F6', i: <Clock size={16} /> }, { l: 'Tickets Today', v: totalTickets.toString(), c: '#10B981', i: <ChefHat size={16} /> }, { l: 'On-Time Rate', v: '87%', c: '#F59E0B', i: <Zap size={16} /> }, { l: 'Recalls', v: STATIONS.reduce((s, st) => s + st.recalled, 0).toString(), c: '#EF4444', i: <AlertTriangle size={16} /> }].map((s, i) => (
                    <div key={i} className="pos-stat-card">
                        <div className="pos-stat-icon" style={{ background: `${s.c}15`, color: s.c }}>{s.i}</div> /* keep-inline */
                        <div><div className="pos-stat-value">{s.v}</div><div className="pos-stat-label">{s.l}</div></div>
                    </div>
                ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}> /* keep-inline */
                {/* Station Performance */}
                <div className="pos-card">
                    <h3 className="pos-card-title">Station Performance</h3>
                    {STATIONS.map(station => (
                        <div key={station.name} className="pos-flex pos-flex--center pos-gap-12" style={{ padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}> /* keep-inline */
                            <div style={{ flex: 1 }}> /* keep-inline */
                                <div className="pos-cell-value">{station.name}</div>
                                <div className="pos-cell-secondary">{station.ticketsToday} tickets · {station.bumped} bumped</div>
                            </div>
                            <div style={{ textAlign: 'right' }}> /* keep-inline */
                                <div style={{ fontSize: 16, fontWeight: 700 }}>{station.avgTime}m</div> /* keep-inline */
                                <div className="pos-flex pos-flex--center pos-gap-4" style={{ fontSize: 11, justifyContent: 'flex-end', color: station.trend < 0 ? '#10B981' : '#EF4444' }}> /* keep-inline */
                                    {station.trend < 0 ? <TrendingDown size={10} /> : <TrendingUp size={10} />} {Math.abs(station.trend)}%
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Hourly Chart */}
                <div className="pos-card">
                    <h3 className="pos-card-title">Hourly Avg Ticket Time</h3>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 180, paddingBottom: 20, position: 'relative' }}> /* keep-inline */
                        {HOURLY.map(h => {
                            const pct = (h.avgTime / maxTime) * 100; return (
                                <div key={h.hour} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}> /* keep-inline */
                                    <span style={{ fontSize: 9, fontWeight: 600, color: h.avgTime > 15 ? '#EF4444' : '#3B82F6' }}>{h.avgTime}m</span> /* keep-inline */
                                    <div style={{ width: '100%', height: `${pct}%`, borderRadius: 4, background: h.avgTime > 15 ? 'rgba(239,68,68,0.4)' : 'rgba(59,130,246,0.4)', minHeight: 4 }} />
                                    <span style={{ fontSize: 8, color: 'var(--text-secondary)', transform: 'rotate(-45deg)', whiteSpace: 'nowrap' }}>{h.hour}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Slowest Items */}
                <div className="pos-card">
                    <h3 className="pos-card-title pos-flex pos-flex--center pos-gap-6"><AlertTriangle size={14} style={{ color: '#F59E0B' }} /> Slowest Items</h3> /* keep-inline */
                    {TOP_SLOW.map((item, i) => (
                        <div key={item.name} className="pos-flex pos-flex--center pos-gap-10" style={{ padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}> /* keep-inline */
                            <span style={{ width: 20, height: 20, borderRadius: 4, background: 'rgba(239,68,68,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#EF4444' }}>{i + 1}</span> /* keep-inline */
                            <div style={{ flex: 1 }}> /* keep-inline */
                                <div className="pos-cell-value">{item.name}</div>
                                <div className="pos-cell-secondary">{item.orders} orders today</div>
                            </div>
                            <span style={{ fontSize: 15, fontWeight: 700, color: '#EF4444' }}>{item.avg}m</span> /* keep-inline */
                        </div>
                    ))}
                </div>

                {/* Speed Tips */}
                <div className="pos-card" style={{ background: 'rgba(16,185,129,0.04)', border: '1px solid rgba(16,185,129,0.2)' }}> /* keep-inline */
                    <h3 className="pos-card-title" style={{ color: '#10B981' }}>💡 Speed Insights</h3> /* keep-inline */
                    {[
                        '🔥 Peak slow: 20:00–20:59 avg 18.2min — consider an extra cook',
                        '✅ Bar performance improved 12% vs last week',
                        '⚠️ Wagyu Ribeye consistently slowest — review prep workflow',
                        '📊 4 recalls today (avg 2.8/day) — quality holding steady',
                    ].map((tip, i) => (
                        <div key={i} className="pos-cell-secondary" style={{ padding: '6px 0', borderBottom: i < 3 ? '1px solid rgba(255,255,255,0.04)' : 'none', lineHeight: 1.5 }}>{tip}</div> /* keep-inline */
                    ))}
                </div>
            </div>
        </div></div>
    );
};

export default KitchenAnalytics;
