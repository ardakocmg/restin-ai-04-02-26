/**
 * POSDevices.tsx — K-Series POS Device Management
 * Register and manage POS terminals, printers, and peripherals
 * Lightspeed K-Series Back Office > Hardware > Devices parity
 */
import React, { useState } from 'react';
import { ArrowLeft, Plus, Save, Edit3, Trash2, X, Monitor, Printer, Smartphone, Wifi, WifiOff, RefreshCw, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import './pos-shared.css';

type DeviceType = 'terminal' | 'printer' | 'scanner' | 'drawer' | 'display' | 'payment';
type DeviceStatus = 'online' | 'offline' | 'error';
interface Device {
    id: string; name: string; type: DeviceType; model: string; ipAddress: string; serialNumber: string;
    status: DeviceStatus; lastSeen: string; location: string; firmware: string; isActive: boolean;
}

const TYPE_ICONS: Record<DeviceType, React.ReactNode> = { terminal: <Monitor size={18} />, printer: <Printer size={18} />, scanner: <span style={{ fontSize: 16 }}>📷</span>, drawer: <span style={{ fontSize: 16 }}>💰</span>, display: <Smartphone size={18} />, payment: <span style={{ fontSize: 16 }}>💳</span> };
const TYPE_COLORS: Record<DeviceType, string> = { terminal: '#3B82F6', printer: '#10B981', scanner: '#F59E0B', drawer: '#8B5CF6', display: '#EC4899', payment: '#06B6D4' };
const STATUS_COLORS: Record<DeviceStatus, string> = { online: '#10B981', offline: '#71717a', error: '#EF4444' };

const SEED: Device[] = [
    { id: '1', name: 'POS Terminal 1', type: 'terminal', model: 'iPad Pro 12.9"', ipAddress: '192.168.1.101', serialNumber: 'A2B3C4D5', status: 'online', lastSeen: 'Just now', location: 'Front Counter', firmware: '4.2.1', isActive: true },
    { id: '2', name: 'POS Terminal 2', type: 'terminal', model: 'iPad Pro 11"', ipAddress: '192.168.1.102', serialNumber: 'E6F7G8H9', status: 'online', lastSeen: 'Just now', location: 'Bar', firmware: '4.2.1', isActive: true },
    { id: '3', name: 'Kitchen Printer', type: 'printer', model: 'Star TSP143IIIU', ipAddress: '192.168.1.201', serialNumber: 'STR-00123', status: 'online', lastSeen: '2 min ago', location: 'Main Kitchen', firmware: '2.1.0', isActive: true },
    { id: '4', name: 'Bar Printer', type: 'printer', model: 'Star TSP143IIIU', ipAddress: '192.168.1.202', serialNumber: 'STR-00456', status: 'online', lastSeen: '1 min ago', location: 'Bar', firmware: '2.1.0', isActive: true },
    { id: '5', name: 'Receipt Printer', type: 'printer', model: 'Epson TM-T88VI', ipAddress: '192.168.1.203', serialNumber: 'EPS-78901', status: 'offline', lastSeen: '3 hours ago', location: 'Front Counter', firmware: '3.0.2', isActive: true },
    { id: '6', name: 'Barcode Scanner', type: 'scanner', model: 'Zebra DS2208', ipAddress: 'USB', serialNumber: 'ZBR-11223', status: 'online', lastSeen: 'Just now', location: 'Front Counter', firmware: '1.5.0', isActive: true },
    { id: '7', name: 'Cash Drawer', type: 'drawer', model: 'Star CB-2002', ipAddress: 'USB', serialNumber: 'CD-44556', status: 'online', lastSeen: 'Just now', location: 'Front Counter', firmware: 'N/A', isActive: true },
    { id: '8', name: 'Customer Display', type: 'display', model: 'iPad 10th Gen', ipAddress: '192.168.1.301', serialNumber: 'I10-77889', status: 'online', lastSeen: 'Just now', location: 'Front Counter', firmware: '4.1.0', isActive: true },
    { id: '9', name: 'Card Reader', type: 'payment', model: 'SumUp Air', ipAddress: 'Bluetooth', serialNumber: 'SU-99001', status: 'online', lastSeen: '5 min ago', location: 'Front Counter', firmware: '5.3.1', isActive: true },
    { id: '10', name: 'Terrace Terminal', type: 'terminal', model: 'iPad Air', ipAddress: '192.168.1.103', serialNumber: 'K3L4M5N6', status: 'error', lastSeen: '1 day ago', location: 'Terrace', firmware: '4.1.9', isActive: false },
];

const POSDevices: React.FC = () => {
    const navigate = useNavigate();
    const [devices, setDevices] = useState(SEED);
    const [editing, setEditing] = useState<Device | null>(null);
    const [filterType, setFilterType] = useState<string>('all');

    const filtered = devices.filter(d => filterType === 'all' || d.type === filterType);
    const online = devices.filter(d => d.status === 'online').length;
    const offline = devices.filter(d => d.status === 'offline' || d.status === 'error').length;

    const save = () => { if (!editing) return; const e = devices.find(d => d.id === editing.id); if (e) setDevices(p => p.map(d => d.id === editing.id ? editing : d)); else setDevices(p => [...p, editing]); setEditing(null); toast.success('Saved'); };

    return (
        <div className="pos-page"><div className="pos-container pos-container--1200">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                <div>
                    <button onClick={() => navigate(-1)} className="pos-btn pos-btn--outline" style={{ marginBottom: 8, padding: '6px 14px', fontSize: 12 }}><ArrowLeft size={14} /> Back</button>
                    <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>POS Devices</h1>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary,#a1a1aa)', margin: '4px 0 0' }}>{online} online · {offline} offline · {devices.length} total</p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button className="pos-btn pos-btn--outline" onClick={() => toast.info('Scanning network...')}><RefreshCw size={14} /> Scan</button>
                    <button className="pos-btn pos-btn--primary" onClick={() => setEditing({ id: crypto.randomUUID(), name: '', type: 'terminal', model: '', ipAddress: '', serialNumber: '', status: 'offline', lastSeen: 'Never', location: '', firmware: '', isActive: true })}><Plus size={16} /> Add Device</button>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="pos-tab-group" style={{ marginBottom: 16, flexWrap: 'wrap' }}>
                <button onClick={() => setFilterType('all')} className={`pos-filter-btn${filterType === 'all' ? ' pos-filter-btn--active' : ''}`}>All ({devices.length})</button>
                {(['terminal', 'printer', 'scanner', 'drawer', 'display', 'payment'] as DeviceType[]).map(t => { const count = devices.filter(d => d.type === t).length; return count > 0 ? <button key={t} onClick={() => setFilterType(t)} style={{ padding: '6px 14px', borderRadius: 6, border: 'none', fontSize: 12, cursor: 'pointer', textTransform: 'capitalize', background: filterType === t ? `${TYPE_COLORS[t]}15` : 'transparent', color: filterType === t ? TYPE_COLORS[t] : 'var(--text-secondary)' }}>{t} ({count})</button> : null; })}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 12 }}>
                {filtered.map(device => (
                    <div key={device.id} className="pos-card" style={{ cursor: 'pointer', padding: 16, opacity: device.isActive ? 1 : 0.5 }} onClick={() => setEditing({ ...device })}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{ width: 40, height: 40, borderRadius: 10, background: `${TYPE_COLORS[device.type]}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: TYPE_COLORS[device.type] }}>
                                    {TYPE_ICONS[device.type]}
                                </div>
                                <div><div style={{ fontSize: 14, fontWeight: 600 }}>{device.name}</div>
                                    <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{device.model}</div></div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                {device.status === 'online' ? <Wifi size={12} style={{ color: '#10B981' }} /> : <WifiOff size={12} style={{ color: STATUS_COLORS[device.status] }} />}
                                <span style={{ fontSize: 10, color: STATUS_COLORS[device.status], textTransform: 'capitalize' }}>{device.status}</span>
                            </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, fontSize: 11, color: 'var(--text-secondary)' }}>
                            <div>📍 {device.location}</div>
                            <div>🔗 {device.ipAddress}</div>
                            <div>🕐 {device.lastSeen}</div>
                            <div>📦 v{device.firmware}</div>
                        </div>
                    </div>
                ))}
            </div>
        </div>

            {editing && <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setEditing(null)}>
                <div className="pos-card" style={{ width: 480, maxHeight: '85vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                        <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{devices.find(d => d.id === editing.id) ? 'Edit' : 'New'} Device</h3>
                        <button style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }} onClick={() => setEditing(null)}><X size={20} /></button>
                    </div>
                    <div style={{ marginBottom: 14 }}><label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Name *</label>
                        <input className="pos-input" value={editing.name} onChange={e => setEditing(p => p ? { ...p, name: e.target.value } : null)} /></div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                        <div><label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Type</label>
                            <select className="pos-input pos-select" value={editing.type} onChange={e => setEditing(p => p ? { ...p, type: e.target.value as DeviceType } : null)} aria-label="Device type">
                                {(['terminal', 'printer', 'scanner', 'drawer', 'display', 'payment'] as DeviceType[]).map(t => <option key={t} value={t} style={{ textTransform: 'capitalize' }}>{t}</option>)}
                            </select></div>
                        <div><label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Model</label>
                            <input className="pos-input" value={editing.model} onChange={e => setEditing(p => p ? { ...p, model: e.target.value } : null)} /></div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                        <div><label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>IP / Connection</label>
                            <input className="pos-input" value={editing.ipAddress} onChange={e => setEditing(p => p ? { ...p, ipAddress: e.target.value } : null)} placeholder="192.168.1.x or USB" /></div>
                        <div><label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Location</label>
                            <input className="pos-input" value={editing.location} onChange={e => setEditing(p => p ? { ...p, location: e.target.value } : null)} /></div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                        <div><label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Serial Number</label>
                            <input className="pos-input" value={editing.serialNumber} onChange={e => setEditing(p => p ? { ...p, serialNumber: e.target.value } : null)} /></div>
                        <div><label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Firmware</label>
                            <input className="pos-input" value={editing.firmware} onChange={e => setEditing(p => p ? { ...p, firmware: e.target.value } : null)} /></div>
                    </div>
                    <div style={{ marginBottom: 16 }}><label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                        <input type="checkbox" checked={editing.isActive} onChange={() => setEditing(p => p ? { ...p, isActive: !p.isActive } : null)} /> Active</label></div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button className="pos-btn pos-btn--primary" style={{ flex: 1, justifyContent: 'center' }} onClick={save}><Save size={14} /> Save</button>
                        <button className="pos-btn pos-btn--outline" style={{ color: '#EF4444' }} onClick={() => { setDevices(p => p.filter(d => d.id !== editing.id)); setEditing(null); toast.success('Deleted'); }}><Trash2 size={14} /></button>
                        <button className="pos-btn pos-btn--outline" onClick={() => setEditing(null)}>Cancel</button>
                    </div>
                </div>
            </div>}
        </div>
    );
};

export default POSDevices;
