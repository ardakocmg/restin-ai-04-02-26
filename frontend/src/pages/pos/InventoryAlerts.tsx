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
import './pos-shared.css';

const Toggle: React.FC<{ value: boolean; onChange: () => void }> = ({ value, onChange }) => (
    <div className={`pos-toggle-track ${value ? 'pos-toggle-track--on' : 'pos-toggle-track--off'}`} onClick={onChange}>
        <div className={`pos-toggle-thumb ${value ? 'pos-toggle-thumb--on' : 'pos-toggle-thumb--off'}`} />
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
    const venueId = String(localStorage.getItem('restin_pos_venue') || authStore.getUser()?.venue_id || '');
    const { items: apiItems, loading: apiLoading, error: apiError, refetch } = useItemService({ venueId, lowStockOnly: true, enabled: !!venueId });
    const [items, setItems] = useState(SEED);
    const [apiWired, setApiWired] = useState(false);

    useEffect(() => {
        if (apiItems.length > 0) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const mapped: AlertItem[] = apiItems.map((ai: Record<string, unknown>) => {
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
                    status: (current <= 0 ? 'out' : pct <= 0.2 ? 'critical' : current <= reorder ? 'low' : 'ok') as AlertItem['status'],
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
        <div className="pos-page"><div className="pos-container">
            <div className="pos-header">
                <div>
                    <button onClick={() => navigate(-1)} className="pos-btn-outline pos-btn-back"><ArrowLeft size={14} /> Back</button>
                    <h1 className="pos-title">Inventory Alerts</h1>
                    <p className="pos-subtitle">Stock levels, par targets, and reorder notifications{apiWired && <span className="pos-live-dot">● Live</span>}</p>
                </div>
                <button className="pos-btn-primary" onClick={() => toast.success('Alert settings saved')}><Save size={16} /> Save</button>
            </div>

            {/* Loading / Error */}
            {apiLoading && <div className="pos-card pos-flex pos-flex--center" style={{ justifyContent: 'center', gap: 8, padding: 30 }}><Loader2 size={18} className="animate-spin" style={{ color: '#3B82F6' }} /><span className="pos-text-secondary">{"Loading "}stock data...</span></div>} /* keep-inline */ /* keep-inline */ /* keep-inline */
            {apiError && <div className="pos-card pos-flex pos-flex--between pos-flex--center pos-mb-16" style={{ borderColor: '#EF4444', padding: 14 }}><span style={{ color: '#EF4444', fontSize: 13 }}>⚠ {apiError}</span><button className="pos-btn-outline" style={{ padding: '6px 14px', fontSize: 12 }} onClick={() => refetch()}>Retry</button></div>} /* keep-inline */ /* keep-inline */ /* keep-inline */

            {/* Stats */}
            <div className="pos-stats-grid pos-mb-16">
                {[{ l: 'Out of Stock', v: outCount, c: '#EF4444', i: <Package size={16} /> }, { l: 'Critical', v: critCount, c: '#F97316', i: <AlertTriangle size={16} /> }, { l: 'Low Stock', v: lowCount, c: '#F59E0B', i: <TrendingDown size={16} /> }, { l: 'OK', v: items.filter(i => i.status === 'ok').length, c: '#10B981', i: <Bell size={16} /> }].map((s, i) => (
                    <div key={i} className="pos-stat-card">
                        <div className="pos-stat-icon" style={{ background: `${s.c}15`, color: s.c }}>{s.i}</div> /* keep-inline */ /* keep-inline */ /* keep-inline */
                        <div><div className="pos-stat-value">{s.v}</div><div className="pos-stat-label">{s.l}</div></div>
                    </div>
                ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16 }}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                <div>
                    {/* Filters */}
                    <div className="pos-flex pos-gap-8 pos-mb-12">
                        <div className="pos-search-wrapper" style={{ flex: 1 }}><Search size={14} className="pos-search-icon" /><input className="pos-input pos-search-input" placeholder="Search items..." value={search} onChange={e => setSearch(e.target.value)} /></div> /* keep-inline */ /* keep-inline */ /* keep-inline */
                        <div className="pos-toggle-group">
                            {['all', 'out', 'critical', 'low', 'ok'].map(s => <button key={s} onClick={() => setFilterStatus(s)} className={`pos-toggle-btn ${filterStatus === s ? 'pos-toggle-btn--active' : ''}`} style={{ textTransform: 'capitalize', color: filterStatus === s ? (STATUS_COLORS[s] || '#3B82F6') : undefined }}>{s}</button>)} /* keep-inline */ /* keep-inline */ /* keep-inline */
                        </div>
                    </div>

                    {/* Items Table */}
                    <div className="pos-card">
                        {filtered.map(item => (
                            <div key={item.id} className="pos-flex pos-flex--center pos-gap-12" style={{ padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                                <div style={{ width: 8, height: 8, borderRadius: '50%', background: STATUS_COLORS[item.status], flexShrink: 0 }} /> /* keep-inline */ /* keep-inline */ /* keep-inline */
                                <div style={{ flex: 1 }}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                                    <div className="pos-cell-value">{item.name}</div>
                                    <div className="pos-cell-secondary">{item.category}</div>
                                </div>
                                <div style={{ textAlign: 'center', minWidth: 80 }}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                                    <div style={{ fontSize: 15, fontWeight: 700, color: STATUS_COLORS[item.status] }}>{item.currentStock} {item.unit}</div> /* keep-inline */ /* keep-inline */ /* keep-inline */
                                    <div className="pos-cell-secondary" style={{ fontSize: 10 }}>of {item.parLevel} par</div> /* keep-inline */ /* keep-inline */ /* keep-inline */
                                </div>
                                <div style={{ width: 100, height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                                    <div style={{ width: `${Math.min(100, (item.currentStock / item.parLevel) * 100)}%`, height: '100%', background: STATUS_COLORS[item.status], borderRadius: 3, transition: 'width 0.3s ease' }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Notification Settings */}
                <div>
                    <div className="pos-card">
                        <h3 className="pos-card-title pos-flex pos-flex--center pos-gap-6"><Bell size={14} style={{ color: '#3B82F6' }} /> Notifications</h3> /* keep-inline */ /* keep-inline */ /* keep-inline */
                        <div className="pos-setting-row"><div className="pos-flex pos-flex--center pos-gap-6"><Mail size={14} className="pos-text-secondary" /><span className="pos-cell-value">Email Alerts</span></div><Toggle value={emailAlerts} onChange={() => setEmailAlerts(!emailAlerts)} /></div>
                        <div className="pos-setting-row"><div className="pos-flex pos-flex--center pos-gap-6"><MessageSquare size={14} className="pos-text-secondary" /><span className="pos-cell-value">Push Notifications</span></div><Toggle value={pushAlerts} onChange={() => setPushAlerts(!pushAlerts)} /></div>
                        <div className="pos-setting-row"><div className="pos-flex pos-flex--center pos-gap-6"><Package size={14} className="pos-text-secondary" /><span className="pos-cell-value">Auto Reorder</span></div><Toggle value={autoOrder} onChange={() => setAutoOrder(!autoOrder)} /></div>
                    </div>
                    {(outCount + critCount) > 0 && <div className="pos-card" style={{ background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.2)' }}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#EF4444', marginBottom: 6 }}>⚠️ Action Required</div> /* keep-inline */ /* keep-inline */ /* keep-inline */
                        <p className="pos-cell-secondary" style={{ margin: 0, lineHeight: 1.5 }}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                            {outCount} items out of stock, {critCount} at critical level. Review and place orders to avoid service disruption.
                        </p>
                    </div>}
                </div>
            </div>
        </div></div>
    );
};

export default InventoryAlerts;
