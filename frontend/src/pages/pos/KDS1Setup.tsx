/**
 * KDS1Setup.tsx — KDS 1.0 Setup Page
 * Pixel-perfect Lightspeed K-Series clone
 *
 * Setup sections:
 * 1. Connection Code — 4-digit security code
 * 2. Mode Selection — Receipt Mode / Production Mode
 * 3. Filtering — By Accounting Group, Order Profile, Production Center, Tag
 * 4. Print Settings — Printing profile selection, chit rules
 */

import React, { useState } from 'react';
import {
    ArrowLeft, Save, Monitor, LayoutList, Grid, Filter,
    Printer, Settings, HelpCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

/* ===== Types ===== */

interface KDS1Config {
    connectionCode: string;
    mode: 'receipt' | 'production';
    filters: {
        accountingGroups: string[];
        orderProfiles: string[];
        productionCenters: string[];
        tags: string[];
    };
    printSettings: {
        printingProfile: string;
        printChitOnReady: boolean;
        printChitOnRemove: boolean;
    };
}

/* ===== Demo Data ===== */

const ALL_ACCOUNTING_GROUPS = ['Food', 'Beverages', 'Hot Drinks', 'Cold Drinks', 'Alcohol', 'Desserts', 'Specials'];
const ALL_ORDER_PROFILES = ['Dine-In', 'Takeaway', 'Delivery', 'Pickup', 'Room Service'];
const ALL_PRODUCTION_CENTERS = ['Kitchen', 'Bar', 'Cold Kitchen', 'Pastry', 'Grill Station'];
const ALL_TAGS = ['Priority', 'VIP', 'Staff Meal', 'Event Catering', 'Online Order'];
const ALL_PRINTING_PROFILES = ['Default Kitchen Printer', 'Bar Printer', 'Receipt Printer', 'Office Printer'];

/* ===== Styles ===== */

const pageStyle: React.CSSProperties = {
    minHeight: '100vh',
    background: 'var(--bg-primary, #0a0a0a)',
    color: 'var(--text-primary, #fafafa)',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
};

const containerStyle: React.CSSProperties = {
    maxWidth: 900,
    margin: '0 auto',
    padding: '24px 20px',
};

const cardStyle: React.CSSProperties = {
    background: 'var(--bg-card, #18181b)',
    border: '1px solid var(--border-primary, #27272a)',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
};

const btnPrimary: React.CSSProperties = {
    padding: '10px 24px',
    background: '#3B82F6',
    border: 'none',
    borderRadius: 8,
    color: '#fff',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
};

const btnOutline: React.CSSProperties = {
    padding: '10px 24px',
    background: 'transparent',
    border: '1px solid var(--border-primary, #27272a)',
    borderRadius: 8,
    color: 'var(--text-primary, #fafafa)',
    fontSize: 14,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
};

const toggleRow: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 0',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
};

const toggleStyle = (active: boolean): React.CSSProperties => ({
    width: 44, height: 24, borderRadius: 12, background: active ? '#3B82F6' : '#3f3f46',
    cursor: 'pointer', position: 'relative', flexShrink: 0,
});

const toggleDotStyle = (active: boolean): React.CSSProperties => ({
    position: 'absolute', top: 2, left: active ? 22 : 2, width: 20, height: 20,
    borderRadius: '50%', background: '#fff', transition: 'left 0.2s ease',
    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
});

const chipStyle = (active: boolean): React.CSSProperties => ({
    padding: '8px 14px', borderRadius: 8,
    border: active ? '2px solid #3B82F6' : '1px solid var(--border-primary, #27272a)',
    background: active ? 'rgba(59,130,246,0.1)' : 'transparent',
    color: active ? '#3B82F6' : 'var(--text-primary, #fafafa)',
    fontSize: 13, fontWeight: 500, cursor: 'pointer',
});

/* ===== Main Component ===== */

const KDS1Setup: React.FC = () => {
    const navigate = useNavigate();

    const [config, setConfig] = useState<KDS1Config>({
        connectionCode: '7291',
        mode: 'receipt',
        filters: {
            accountingGroups: ['Food', 'Hot Drinks'],
            orderProfiles: [],
            productionCenters: ['Kitchen'],
            tags: [],
        },
        printSettings: {
            printingProfile: 'Default Kitchen Printer',
            printChitOnReady: true,
            printChitOnRemove: false,
        },
    });

    const toggleFilter = (category: keyof KDS1Config['filters'], item: string) => {
        setConfig(prev => {
            const arr = prev.filters[category];
            const updated = arr.includes(item) ? arr.filter(i => i !== item) : [...arr, item];
            return { ...prev, filters: { ...prev.filters, [category]: updated } };
        });
    };

    const saveConfig = () => {
        toast.success('KDS 1.0 configuration saved');
    };

    return (
        <div style={pageStyle}>
            <div style={containerStyle}>
                {/* Back */}
                <button onClick={() => navigate('/pos/kds1')} style={{ ...btnOutline, marginBottom: 20 }}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                    <ArrowLeft size={16} /> Back to KDS 1.0
                </button>

                <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>KDS 1.0 Setup</h1> /* keep-inline */ /* keep-inline */ /* keep-inline */

                {/* 1. Connection Code */}
                <div style={cardStyle}>
                    <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                        <Monitor size={18} /> Connection Code
                    </h2>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary, #a1a1aa)', marginBottom: 12 }}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                        This 4-digit code is used to connect a kitchen display device to your account.
                    </p>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                        <div style={{ display: 'flex', gap: 6 }}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                            {config.connectionCode.split('').map((digit, idx) => (
                                <div key={idx} style={{ /* keep-inline */ /* keep-inline */ /* keep-inline */
                                    width: 48, height: 56, background: 'var(--bg-secondary, #09090b)',
                                    border: '1px solid var(--border-primary, #27272a)', borderRadius: 8,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: 24, fontWeight: 700,
                                }}>{digit}</div>
                            ))}
                        </div>
                        <button style={{ ...btnOutline, padding: '8px 14px' }} onClick={() => { /* keep-inline */ /* keep-inline */ /* keep-inline */
                            const newCode = String(Math.floor(1000 + Math.random() * 9000));
                            setConfig(prev => ({ ...prev, connectionCode: newCode }));
                            toast.success('New connection code generated');
                        }}>
                            Regenerate
                        </button>
                    </div>
                </div>

                {/* 2. Mode Selection */}
                <div style={cardStyle}>
                    <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                        <Settings size={18} /> Display Mode
                    </h2>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                        <button
                            onClick={() => setConfig(prev => ({ ...prev, mode: 'receipt' }))}
                            style={{ /* keep-inline */ /* keep-inline */ /* keep-inline */
                                padding: 16, borderRadius: 12, cursor: 'pointer',
                                border: config.mode === 'receipt' ? '2px solid #3B82F6' : '1px solid var(--border-primary, #27272a)',
                                background: config.mode === 'receipt' ? 'rgba(59,130,246,0.08)' : 'transparent',
                                color: 'var(--text-primary, #fafafa)', textAlign: 'left',
                            }}
                        >
                            <LayoutList size={24} style={{ marginBottom: 8, color: config.mode === 'receipt' ? '#3B82F6' : 'var(--text-secondary)' }} /> /* keep-inline */ /* keep-inline */ /* keep-inline */
                            <div style={{ fontWeight: 600, marginBottom: 4 }}>Receipt Mode</div> /* keep-inline */ /* keep-inline */ /* keep-inline */
                            <div style={{ fontSize: 12, color: 'var(--text-secondary, #a1a1aa)' }}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                                Each order appears as a separate tile that lists all items
                            </div>
                        </button>
                        <button
                            onClick={() => setConfig(prev => ({ ...prev, mode: 'production' }))}
                            style={{ /* keep-inline */ /* keep-inline */ /* keep-inline */
                                padding: 16, borderRadius: 12, cursor: 'pointer',
                                border: config.mode === 'production' ? '2px solid #8b5cf6' : '1px solid var(--border-primary, #27272a)',
                                background: config.mode === 'production' ? 'rgba(139,92,246,0.08)' : 'transparent',
                                color: 'var(--text-primary, #fafafa)', textAlign: 'left',
                            }}
                        >
                            <Grid size={24} style={{ marginBottom: 8, color: config.mode === 'production' ? '#8b5cf6' : 'var(--text-secondary)' }} /> /* keep-inline */ /* keep-inline */ /* keep-inline */
                            <div style={{ fontWeight: 600, marginBottom: 4 }}>Production Mode</div> /* keep-inline */ /* keep-inline */ /* keep-inline */
                            <div style={{ fontSize: 12, color: 'var(--text-secondary, #a1a1aa)' }}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                                Each item appears as a tile with total quantity for all pending orders
                            </div>
                        </button>
                    </div>
                </div>

                {/* 3. Filtering */}
                <div style={cardStyle}>
                    <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                        <Filter size={18} /> Filtering
                    </h2>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary, #a1a1aa)', marginBottom: 16 }}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                        Customize which types of orders appear on the KDS. Leave empty to show all.
                    </p>

                    {/* Accounting Groups */}
                    <div style={{ marginBottom: 20 }}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: 'var(--text-secondary, #a1a1aa)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Accounting Groups</div> /* keep-inline */ /* keep-inline */ /* keep-inline */
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                            {ALL_ACCOUNTING_GROUPS.map(g => (
                                <button key={g} style={chipStyle(config.filters.accountingGroups.includes(g))} onClick={() => toggleFilter('accountingGroups', g)}>{g}</button>
                            ))}
                        </div>
                    </div>

                    {/* Order Profiles */}
                    <div style={{ marginBottom: 20 }}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: 'var(--text-secondary, #a1a1aa)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Order Profiles</div> /* keep-inline */ /* keep-inline */ /* keep-inline */
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                            {ALL_ORDER_PROFILES.map(p => (
                                <button key={p} style={chipStyle(config.filters.orderProfiles.includes(p))} onClick={() => toggleFilter('orderProfiles', p)}>{p}</button>
                            ))}
                        </div>
                    </div>

                    {/* Production Centers */}
                    <div style={{ marginBottom: 20 }}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: 'var(--text-secondary, #a1a1aa)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Production Centers</div> /* keep-inline */ /* keep-inline */ /* keep-inline */
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                            {ALL_PRODUCTION_CENTERS.map(c => (
                                <button key={c} style={chipStyle(config.filters.productionCenters.includes(c))} onClick={() => toggleFilter('productionCenters', c)}>{c}</button>
                            ))}
                        </div>
                    </div>

                    {/* Tags */}
                    <div>
                        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: 'var(--text-secondary, #a1a1aa)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Tags</div> /* keep-inline */ /* keep-inline */ /* keep-inline */
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                            {ALL_TAGS.map(t => (
                                <button key={t} style={chipStyle(config.filters.tags.includes(t))} onClick={() => toggleFilter('tags', t)}>{t}</button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* 4. Print Settings */}
                <div style={cardStyle}>
                    <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                        <Printer size={18} /> Print Settings
                    </h2>

                    <div style={toggleRow}>
                        <div>
                            <div style={{ fontWeight: 500 }}>Printing Profile</div> /* keep-inline */ /* keep-inline */ /* keep-inline */
                            <div style={{ fontSize: 12, color: 'var(--text-secondary, #a1a1aa)', marginTop: 2 }}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                                Select a printing profile for customer receipts
                            </div>
                        </div>
                        <select aria-label="Input"
                            value={config.printSettings.printingProfile}
                            onChange={e => setConfig(prev => ({ ...prev, printSettings: { ...prev.printSettings, printingProfile: e.target.value } }))}
                            style={{ padding: '6px 12px', background: 'var(--bg-secondary, #09090b)', border: '1px solid var(--border-primary, #27272a)', borderRadius: 6, color: 'var(--text-primary, #fafafa)', fontSize: 13 }} /* keep-inline */ /* keep-inline */ /* keep-inline */
                            aria-label="Printing profile"
                        >
                            {ALL_PRINTING_PROFILES.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                    </div>

                    <div style={toggleRow}>
                        <div>
                            <div style={{ fontWeight: 500 }}>Print chit when order is ready</div> /* keep-inline */ /* keep-inline */ /* keep-inline */
                            <div style={{ fontSize: 12, color: 'var(--text-secondary, #a1a1aa)', marginTop: 2 }}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                                Print a draft receipt when delivery/pickup order is marked ready
                            </div>
                        </div>
                        <div
                            style={toggleStyle(config.printSettings.printChitOnReady)}
                            onClick={() => setConfig(prev => ({ ...prev, printSettings: { ...prev.printSettings, printChitOnReady: !prev.printSettings.printChitOnReady } }))}
                        >
                            <div style={toggleDotStyle(config.printSettings.printChitOnReady)} />
                        </div>
                    </div>

                    <div style={toggleRow}>
                        <div>
                            <div style={{ fontWeight: 500 }}>Print chit when removed from KDS</div> /* keep-inline */ /* keep-inline */ /* keep-inline */
                            <div style={{ fontSize: 12, color: 'var(--text-secondary, #a1a1aa)', marginTop: 2 }}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                                Print a chit when an item or order is removed from the screen
                            </div>
                        </div>
                        <div
                            style={toggleStyle(config.printSettings.printChitOnRemove)}
                            onClick={() => setConfig(prev => ({ ...prev, printSettings: { ...prev.printSettings, printChitOnRemove: !prev.printSettings.printChitOnRemove } }))}
                        >
                            <div style={toggleDotStyle(config.printSettings.printChitOnRemove)} />
                        </div>
                    </div>
                </div>

                {/* Save */}
                <button onClick={saveConfig} style={btnPrimary}>
                    <Save size={16} /> Save Configuration
                </button>
            </div>
        </div>
    );
};

export default KDS1Setup;
