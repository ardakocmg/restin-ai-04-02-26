/**
 * InventoryAlerts.tsx — K-Series Inventory Alert Configuration
 * Low stock thresholds, par levels, and notification rules
 * Lightspeed K-Series Back Office > Inventory > Alerts parity
 */
import React, { useState, useEffect } from 'react';
import { ArrowLeft, Save, Search, Bell, AlertTriangle, Package, TrendingDown, Mail, MessageSquare, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useItemService } from '../../hooks/shared/useItemService';
import authStore from '../../lib/AuthStore';

const pg: React.CSSProperties = { minHeight: '100vh', background: 'var(--bg-primary,#0a0a0a)', color: 'var(--text-primary,#fafafa)', fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif' };
const ct: React.CSSProperties = { maxWidth: 1100, margin: '0 auto', padding: '24px 20px' };
const cd: React.CSSProperties = { background: 'var(--bg-card,#18181b)', border: '1px solid var(--border-primary,#27272a)', borderRadius: 12, padding: 20, marginBottom: 16 };
const bp: React.CSSProperties = { padding: '10px 24px', background: '#3B82F6', border: 'none', borderRadius: 8, color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 };
const bo: React.CSSProperties = { padding: '10px 24px', background: 'transparent', border: '1px solid var(--border-primary,#27272a)', borderRadius: 8, color: 'var(--text-primary,#fafafa)', fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 };
const ip: React.CSSProperties = { width: '100%', padding: '10px 14px', background: 'var(--bg-secondary,#09090b)', border: '1px solid var(--border-primary,#27272a)', borderRadius: 8, color: 'var(--text-primary,#fafafa)', fontSize: 14 };
const rw: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' };

const Toggle: React.FC<{ value: boolean; onChange: () => void }> = ({ value, onChange }) => (
    <div style={{ width: 44, height: 24, borderRadius: 12, background: value ? '#3B82F6' : '#3f3f46', cursor: 'pointer', position: 'relative' }} onClick={onChange}>
        <div style={{ position: 'absolute', top: 2, left: value ? 22 : 2, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left 0.2s ease', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
    </div>
);

interface AlertItem { id: string; name: string; category: string; currentStock: number; parLevel: number; reorderPoint: number; unit: string; status: 'ok' | 'low' | 'critical' | 'out'; }

const SEED: AlertItem[] = [
    { id: '1', name: 'Chicken Breast', category: 'Proteins', currentStock: 12, parLevel: 50, reorderPoint: 15, unit: 'kg', status: 'low' },
    { id: '2', name: 'Olive Oil (EVO)', category: 'Oils & Condiments', currentStock: 3, parLevel: 10, reorderPoint: 4, unit: 'L', status: 'low' },
    { id: '3', name: 'Mozzarella', category: 'Dairy', currentStock: 0, parLevel: 20, reorderPoint: 5, unit: 'kg', status: 'out' },
    { id: '4', name: 'Coca-Cola 330ml', category: 'Beverages', currentStock: 6, parLevel: 48, reorderPoint: 12, unit: 'cans', status: 'critical' },
    { id: '5', name: 'Pasta Flour 00', category: 'Dry Goods', currentStock: 25, parLevel: 30, reorderPoint: 10, unit: 'kg', status: 'ok' },
    { id: '6', name: 'Fresh Basil', category: 'Herbs', currentStock: 2, parLevel: 8, reorderPoint: 3, unit: 'bunches', status: 'low' },
    { id: '7', name: 'Atlantic Salmon', category: 'Proteins', currentStock: 4, parLevel: 15, reorderPoint: 5, unit: 'kg', status: 'low' },
    { id: '8', name: 'House Red Wine', category: 'Wines', currentStock: 0, parLevel: 24, reorderPoint: 6, unit: 'bottles', status: 'out' },
    { id: '9', name: 'Napkins', category: 'Supplies', currentStock: 200, parLevel: 500, reorderPoint: 100, unit: 'pcs', status: 'ok' },
    { id: '10', name: 'Espresso Beans', category: 'Coffee', currentStock: 1.5, parLevel: 10, reorderPoint: 3, unit: 'kg', status: 'critical' },
];

const STATUS_COLORS: Record<string, string> = { ok: '#10B981', low: '#F59E0B', critical: '#EF4444', out: '#EF4444' };

const InventoryAlerts: React.FC = () => {
    const navigate = useNavigate();
    const venueId = localStorage.getItem('restin_pos_venue') || authStore.getUser()?.venue_id || '';
    const { items: apiItems, loading: apiLoading, error: apiError, refetch } = useItemService({ venueId, lowStockOnly: true, enabled: !!venueId });
    const [items, setItems] = useState(SEED);
    const [apiWired, setApiWired] = useState(false);

    useEffect(() => {
        if (apiItems.length > 0) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const mapped: AlertItem[] = apiItems.map((ai: any) => {
                const current = Number(ai.current_stock || ai.currentStock || 0);
                const par = Number(ai.par_level || ai.parLevel || 50);
                const reorder = Number(ai.reorder_point || ai.reorderPoint || 10);
                const pct = par > 0 ? current / par : 0;
                const status: AlertItem['status'] = current <= 0 ? 'out' : pct <= 0.2 ? 'critical' : current <= reorder ? 'low' : 'ok';
                return {
                    id: String(ai.id || ai._id || ''),
                    name: String(ai.name || ''),
                    category: String(ai.category || ''),
                    currentStock: current,
                    parLevel: par,
                    reorderPoint: reorder,
                    unit: String(ai.unit || 'pcs'),
                    status,
                };
            });
            setItems(mapped);
            setApiWired(true);
        }
    }, [apiItems]);

    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [emailAlerts, setEmailAlerts] = useState(true);
    const [pushAlerts, setPushAlerts] = useState(true);
    const [autoOrder, setAutoOrder] = useState(false);

    const filtered = items.filter(i =>
        (filterStatus === 'all' || i.status === filterStatus) &&
        (!search || i.name.toLowerCase().includes(search.toLowerCase()))
    );
    const outCount = items.filter(i => i.status === 'out').length;
    const critCount = items.filter(i => i.status === 'critical').length;
    const lowCount = items.filter(i => i.status === 'low').length;

    return (
        <div style={pg}><div style={ct}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                <div>
                    <button onClick={() => navigate(-1)} style={{ ...bo, marginBottom: 8, padding: '6px 14px', fontSize: 12 }}><ArrowLeft size={14} /> Back</button>
                    <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Inventory Alerts</h1>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary,#a1a1aa)', margin: '4px 0 0' }}>Stock levels, par targets, and reorder notifications{apiWired && <span style={{ marginLeft: 8, fontSize: 11, color: '#10B981' }}>● Live</span>}</p>
                </div>
                <button style={bp} onClick={() => toast.success('Alert settings saved')}><Save size={16} /> Save</button>
            </div>

            {/* Loading / Error */}
            {apiLoading && <div style={{ ...cd, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 30 }}><Loader2 size={18} className="animate-spin" style={{ color: '#3B82F6' }} /><span style={{ color: 'var(--text-secondary)' }}>Loading stock data...</span></div>}
            {apiError && <div style={{ ...cd, borderColor: '#EF4444', padding: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span style={{ color: '#EF4444', fontSize: 13 }}>⚠ {apiError}</span><button style={{ ...bo, padding: '6px 14px', fontSize: 12 }} onClick={() => refetch()}>Retry</button></div>}

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 16 }}>
                {[{ l: 'Out of Stock', v: outCount, c: '#EF4444', i: <Package size={16} /> }, { l: 'Critical', v: critCount, c: '#F97316', i: <AlertTriangle size={16} /> }, { l: 'Low Stock', v: lowCount, c: '#F59E0B', i: <TrendingDown size={16} /> }, { l: 'OK', v: items.filter(i => i.status === 'ok').length, c: '#10B981', i: <Bell size={16} /> }].map((s, i) => (
                    <div key={i} style={{ ...cd, padding: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 8, background: `${s.c}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.c }}>{s.i}</div>
                        <div><div style={{ fontSize: 22, fontWeight: 700 }}>{s.v}</div><div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{s.l}</div></div>
                    </div>
                ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16 }}>
                <div>
                    {/* Filters */}
                    <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                        <div style={{ position: 'relative', flex: 1 }}>
                            <Search size={14} style={{ position: 'absolute', left: 14, top: 12, color: 'var(--text-secondary)' }} />
                            <input style={{ ...ip, paddingLeft: 36 }} placeholder="Search items..." value={search} onChange={e => setSearch(e.target.value)} />
                        </div>
                        <div style={{ display: 'flex', gap: 4, background: 'var(--bg-card)', borderRadius: 8, padding: 3, border: '1px solid var(--border-primary,#27272a)' }}>
                            {['all', 'out', 'critical', 'low', 'ok'].map(s => <button key={s} onClick={() => setFilterStatus(s)} style={{ padding: '6px 12px', borderRadius: 6, border: 'none', fontSize: 11, cursor: 'pointer', textTransform: 'capitalize', background: filterStatus === s ? (STATUS_COLORS[s] || 'rgba(59,130,246,0.1)') + '15' : 'transparent', color: filterStatus === s ? (STATUS_COLORS[s] || '#3B82F6') : 'var(--text-secondary)' }}>{s}</button>)}
                        </div>
                    </div>

                    {/* Items Table */}
                    <div style={cd}>
                        {filtered.map(item => (
                            <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                <div style={{ width: 8, height: 8, borderRadius: '50%', background: STATUS_COLORS[item.status], flexShrink: 0 }} />
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: 14, fontWeight: 500 }}>{item.name}</div>
                                    <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{item.category}</div>
                                </div>
                                <div style={{ textAlign: 'center', minWidth: 80 }}>
                                    <div style={{ fontSize: 15, fontWeight: 700, color: STATUS_COLORS[item.status] }}>{item.currentStock} {item.unit}</div>
                                    <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>of {item.parLevel} par</div>
                                </div>
                                <div style={{ width: 100, height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                                    <div style={{ width: `${Math.min(100, (item.currentStock / item.parLevel) * 100)}%`, height: '100%', background: STATUS_COLORS[item.status], borderRadius: 3, transition: 'width 0.3s ease' }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Notification Settings */}
                <div>
                    <div style={cd}>
                        <h3 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 6 }}><Bell size={14} style={{ color: '#3B82F6' }} /> Notifications</h3>
                        <div style={rw}><div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Mail size={14} style={{ color: 'var(--text-secondary)' }} /><span style={{ fontSize: 13 }}>Email Alerts</span></div><Toggle value={emailAlerts} onChange={() => setEmailAlerts(!emailAlerts)} /></div>
                        <div style={rw}><div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><MessageSquare size={14} style={{ color: 'var(--text-secondary)' }} /><span style={{ fontSize: 13 }}>Push Notifications</span></div><Toggle value={pushAlerts} onChange={() => setPushAlerts(!pushAlerts)} /></div>
                        <div style={rw}><div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Package size={14} style={{ color: 'var(--text-secondary)' }} /><span style={{ fontSize: 13 }}>Auto Reorder</span></div><Toggle value={autoOrder} onChange={() => setAutoOrder(!autoOrder)} /></div>
                    </div>
                    {(outCount + critCount) > 0 && <div style={{ ...cd, background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.2)' }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#EF4444', marginBottom: 6 }}>⚠️ Action Required</div>
                        <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                            {outCount} items out of stock, {critCount} at critical level. Review and place orders to avoid service disruption.
                        </p>
                    </div>}
                </div>
            </div>
        </div></div>
    );
};

export default InventoryAlerts;
