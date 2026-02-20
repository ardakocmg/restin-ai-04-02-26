/**
 * KitchenAnalytics.tsx — K-Series Kitchen Performance Analytics
 * Kitchen speed, ticket times, production center efficiency
 * Lightspeed K-Series Back Office > Reports > Kitchen parity
 */
import React, { useState } from 'react';
import { ArrowLeft, Clock, ChefHat, TrendingUp, TrendingDown, AlertTriangle, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const pg: React.CSSProperties = { minHeight: '100vh', background: 'var(--bg-primary,#0a0a0a)', color: 'var(--text-primary,#fafafa)', fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif' };
const ct: React.CSSProperties = { maxWidth: 1200, margin: '0 auto', padding: '24px 20px' };
const cd: React.CSSProperties = { background: 'var(--bg-card,#18181b)', border: '1px solid var(--border-primary,#27272a)', borderRadius: 12, padding: 20, marginBottom: 16 };
const bo: React.CSSProperties = { padding: '10px 24px', background: 'transparent', border: '1px solid var(--border-primary,#27272a)', borderRadius: 8, color: 'var(--text-primary,#fafafa)', fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 };

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
        <div style={pg}><div style={ct}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                <div>
                    <button onClick={() => navigate(-1)} style={{ ...bo, marginBottom: 8, padding: '6px 14px', fontSize: 12 }}><ArrowLeft size={14} /> Back</button>
                    <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Kitchen Analytics</h1>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary,#a1a1aa)', margin: '4px 0 0' }}>Production speed and efficiency metrics</p>
                </div>
                <div style={{ display: 'flex', gap: 4, background: 'var(--bg-card)', borderRadius: 8, padding: 3, border: '1px solid var(--border-primary,#27272a)' }}>
                    {(['today', 'week', 'month'] as const).map(p => (<button key={p} onClick={() => setPeriod(p)} style={{ padding: '8px 16px', borderRadius: 6, border: 'none', fontSize: 12, cursor: 'pointer', textTransform: 'capitalize', background: period === p ? 'rgba(59,130,246,0.1)' : 'transparent', color: period === p ? '#3B82F6' : 'var(--text-secondary)' }}>{p}</button>))}
                </div>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
                {[{ l: 'Avg Ticket Time', v: `${avgOverall}m`, c: '#3B82F6', i: <Clock size={16} /> }, { l: 'Tickets Today', v: totalTickets.toString(), c: '#10B981', i: <ChefHat size={16} /> }, { l: 'On-Time Rate', v: '87%', c: '#F59E0B', i: <Zap size={16} /> }, { l: 'Recalls', v: STATIONS.reduce((s, st) => s + st.recalled, 0).toString(), c: '#EF4444', i: <AlertTriangle size={16} /> }].map((s, i) => (
                    <div key={i} style={{ ...cd, padding: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 8, background: `${s.c}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.c }}>{s.i}</div>
                        <div><div style={{ fontSize: 22, fontWeight: 700 }}>{s.v}</div><div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{s.l}</div></div>
                    </div>
                ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {/* Station Performance */}
                <div style={cd}>
                    <h3 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 16px' }}>Station Performance</h3>
                    {STATIONS.map(station => (
                        <div key={station.name} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 14, fontWeight: 500 }}>{station.name}</div>
                                <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{station.ticketsToday} tickets · {station.bumped} bumped</div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: 16, fontWeight: 700 }}>{station.avgTime}m</div>
                                <div style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 2, justifyContent: 'flex-end', color: station.trend < 0 ? '#10B981' : '#EF4444' }}>
                                    {station.trend < 0 ? <TrendingDown size={10} /> : <TrendingUp size={10} />} {Math.abs(station.trend)}%
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Hourly Chart */}
                <div style={cd}>
                    <h3 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 16px' }}>Hourly Avg Ticket Time</h3>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 180, paddingBottom: 20, position: 'relative' }}>
                        {HOURLY.map(h => {
                            const pct = (h.avgTime / maxTime) * 100; return (
                                <div key={h.hour} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                                    <span style={{ fontSize: 9, fontWeight: 600, color: h.avgTime > 15 ? '#EF4444' : '#3B82F6' }}>{h.avgTime}m</span>
                                    <div style={{ width: '100%', height: `${pct}%`, borderRadius: 4, background: h.avgTime > 15 ? 'rgba(239,68,68,0.4)' : 'rgba(59,130,246,0.4)', minHeight: 4 }} />
                                    <span style={{ fontSize: 8, color: 'var(--text-secondary)', transform: 'rotate(-45deg)', whiteSpace: 'nowrap' }}>{h.hour}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Slowest Items */}
                <div style={cd}>
                    <h3 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 6 }}><AlertTriangle size={14} style={{ color: '#F59E0B' }} /> Slowest Items</h3>
                    {TOP_SLOW.map((item, i) => (
                        <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                            <span style={{ width: 20, height: 20, borderRadius: 4, background: 'rgba(239,68,68,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#EF4444' }}>{i + 1}</span>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 13, fontWeight: 500 }}>{item.name}</div>
                                <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{item.orders} orders today</div>
                            </div>
                            <span style={{ fontSize: 15, fontWeight: 700, color: '#EF4444' }}>{item.avg}m</span>
                        </div>
                    ))}
                </div>

                {/* Speed Tips */}
                <div style={{ ...cd, background: 'rgba(16,185,129,0.04)', border: '1px solid rgba(16,185,129,0.2)' }}>
                    <h3 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 12px', color: '#10B981' }}>💡 Speed Insights</h3>
                    {[
                        '🔥 Peak slow: 20:00–20:59 avg 18.2min — consider an extra cook',
                        '✅ Bar performance improved 12% vs last week',
                        '⚠️ Wagyu Ribeye consistently slowest — review prep workflow',
                        '📊 4 recalls today (avg 2.8/day) — quality holding steady',
                    ].map((tip, i) => (
                        <div key={i} style={{ fontSize: 12, color: 'var(--text-secondary)', padding: '6px 0', borderBottom: i < 3 ? '1px solid rgba(255,255,255,0.04)' : 'none', lineHeight: 1.5 }}>{tip}</div>
                    ))}
                </div>
            </div>
        </div></div>
    );
};

export default KitchenAnalytics;
