/**
 * KDS2Setup.tsx — KDS 2.0 Setup Wizard
 * Pixel-perfect Lightspeed K-Series clone
 *
 * Setup flow:
 * 1. Hub Configuration — IP Address, Connection Code, Connected Devices
 * 2. Create Station — Name (max 25 chars)
 * 3. Item Routing — Which items go to this station
 * 4. Ticket Display — Configure what info shows on tickets
 * 5. Order Status Setup — Activate/deactivate New and Ready statuses
 */

import React, { useState } from 'react';
import {
    Wifi, Monitor, Plus, ChevronRight, Check, X,
    Settings, ArrowLeft, Edit3, Trash2, Eye
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

/* ===== Types ===== */

interface KDSStation {
    id: string;
    name: string;
    itemRouting: string; // 'all' or comma-separated category names
    ticketDisplay: {
        customer: boolean;
        orderId: boolean;
        covers: boolean;
        server: boolean;
        type: boolean;
        floor: boolean;
        orderSource: boolean;
        pickupTime: boolean;
    };
    statusNew: boolean;
    statusReady: boolean;
}

/* ===== Demo Data ===== */

const DEMO_STATIONS: KDSStation[] = [
    {
        id: 's1',
        name: 'Kitchen',
        itemRouting: 'Food, Hot Drinks',
        ticketDisplay: { customer: true, orderId: true, covers: true, server: true, type: true, floor: true, orderSource: false, pickupTime: true },
        statusNew: true, statusReady: true,
    },
    {
        id: 's2',
        name: 'Bar',
        itemRouting: 'Beverages, Cocktails, Cold Drinks',
        ticketDisplay: { customer: false, orderId: true, covers: false, server: true, type: true, floor: false, orderSource: false, pickupTime: false },
        statusNew: true, statusReady: false,
    },
];

const ALL_CATEGORIES = [
    'All Items', 'Food', 'Hot Drinks', 'Cold Drinks', 'Beverages', 'Cocktails',
    'Starters', 'Main Course', 'Desserts', 'Sides', 'Specials', 'Kids Menu',
];

/* ===== Helpers ===== */

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

const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 14px',
    background: 'var(--bg-secondary, #09090b)',
    border: '1px solid var(--border-primary, #27272a)',
    borderRadius: 8,
    color: 'var(--text-primary, #fafafa)',
    fontSize: 14,
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
};

const btnOutline: React.CSSProperties = {
    padding: '10px 24px',
    background: 'transparent',
    border: '1px solid var(--border-primary, #27272a)',
    borderRadius: 8,
    color: 'var(--text-primary, #fafafa)',
    fontSize: 14,
    cursor: 'pointer',
};

const toggleStyle = (active: boolean): React.CSSProperties => ({
    width: 44,
    height: 24,
    borderRadius: 12,
    background: active ? '#3B82F6' : '#3f3f46',
    cursor: 'pointer',
    position: 'relative',
    flexShrink: 0,
});

const toggleDotStyle = (active: boolean): React.CSSProperties => ({
    position: 'absolute',
    top: 2,
    left: active ? 22 : 2,
    width: 20,
    height: 20,
    borderRadius: '50%',
    background: '#fff',
    transition: 'left 0.2s ease',
    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
});

/* ===== Main Component ===== */

const KDS2Setup: React.FC = () => {
    const navigate = useNavigate();

    const [stations, setStations] = useState<KDSStation[]>(DEMO_STATIONS);
    const [wizardStep, setWizardStep] = useState<number | null>(null); // null = list view
    const [editStationId, setEditStationId] = useState<string | null>(null);

    // New station wizard state
    const [newName, setNewName] = useState('');
    const [newRouting, setNewRouting] = useState<Set<string>>(new Set(['All Items']));
    const [newTicketDisplay, setNewTicketDisplay] = useState({
        customer: true, orderId: true, covers: true, server: true,
        type: true, floor: true, orderSource: false, pickupTime: true,
    });
    const [newStatusNew, setNewStatusNew] = useState(true);
    const [newStatusReady, setNewStatusReady] = useState(true);

    // Hub info
    const hubIP = '192.168.1.100';
    const connectionCode = '4829';
    const hubVersion = '2.4.1';

    const startNewStation = () => {
        setNewName('');
        setNewRouting(new Set(['All Items']));
        setNewTicketDisplay({ customer: true, orderId: true, covers: true, server: true, type: true, floor: true, orderSource: false, pickupTime: true });
        setNewStatusNew(true);
        setNewStatusReady(true);
        setWizardStep(1);
        setEditStationId(null);
    };

    const saveStation = () => {
        if (!newName.trim()) { toast.error('Station name is required'); return; }
        const station: KDSStation = {
            id: editStationId || `s${Date.now()}`,
            name: newName,
            itemRouting: Array.from(newRouting).join(', '),
            ticketDisplay: newTicketDisplay,
            statusNew: newStatusNew,
            statusReady: newStatusReady,
        };

        if (editStationId) {
            setStations(prev => prev.map(s => s.id === editStationId ? station : s));
        } else {
            setStations(prev => [...prev, station]);
        }
        toast.success(`Station "${newName}" ${editStationId ? 'updated' : 'created'}`);
        setWizardStep(null);
        setEditStationId(null);
    };

    const editStation = (station: KDSStation) => {
        setEditStationId(station.id);
        setNewName(station.name);
        setNewRouting(new Set(station.itemRouting.split(', ')));
        setNewTicketDisplay(station.ticketDisplay);
        setNewStatusNew(station.statusNew);
        setNewStatusReady(station.statusReady);
        setWizardStep(1);
    };

    const deleteStation = (id: string) => {
        setStations(prev => prev.filter(s => s.id !== id));
        toast.success('Station deleted');
    };

    const toggleRouting = (category: string) => {
        setNewRouting(prev => {
            const next = new Set(prev);
            if (category === 'All Items') {
                if (next.has('All Items')) { next.delete('All Items'); } else { next.clear(); next.add('All Items'); }
            } else {
                next.delete('All Items');
                if (next.has(category)) next.delete(category); else next.add(category);
            }
            return next;
        });
    };

    /* ===== Render ===== */

    return (
        <div style={pageStyle}>
            <div style={containerStyle}>
                {/* Back button */}
                <button onClick={() => wizardStep !== null ? setWizardStep(null) : navigate('/pos/kds2')} style={{ ...btnOutline, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}> /* keep-inline */ /* keep-inline */
                    <ArrowLeft size={16} /> {wizardStep !== null ? 'Back to Stations' : 'Back to KDS'}
                </button>

                <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}> /* keep-inline */ /* keep-inline */
                    {wizardStep !== null ? (editStationId ? 'Edit Station' : 'Create New Station') : 'KDS 2.0 Setup'}
                </h1>

                {wizardStep === null ? (
                    /* ===== Station List + Hub Info ===== */
                    <>
                        {/* Hub Configuration */}
                        <div style={cardStyle}>
                            <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}> /* keep-inline */ /* keep-inline */
                                <Settings size={18} /> Hub Configuration
                            </h2>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}> /* keep-inline */ /* keep-inline */
                                <div style={{ padding: '12px 16px', background: 'var(--bg-secondary, #09090b)', borderRadius: 8 }}> /* keep-inline */ /* keep-inline */
                                    <div style={{ fontSize: 12, color: 'var(--text-secondary, #a1a1aa)', marginBottom: 4 }}>IP Address</div> /* keep-inline */ /* keep-inline */
                                    <div style={{ fontSize: 16, fontWeight: 600 }}>{hubIP}</div> /* keep-inline */ /* keep-inline */
                                </div>
                                <div style={{ padding: '12px 16px', background: 'var(--bg-secondary, #09090b)', borderRadius: 8 }}> /* keep-inline */ /* keep-inline */
                                    <div style={{ fontSize: 12, color: 'var(--text-secondary, #a1a1aa)', marginBottom: 4 }}>Connection Code</div> /* keep-inline */ /* keep-inline */
                                    <div style={{ fontSize: 16, fontWeight: 600 }}>{connectionCode}</div> /* keep-inline */ /* keep-inline */
                                </div>
                                <div style={{ padding: '12px 16px', background: 'var(--bg-secondary, #09090b)', borderRadius: 8 }}> /* keep-inline */ /* keep-inline */
                                    <div style={{ fontSize: 12, color: 'var(--text-secondary, #a1a1aa)', marginBottom: 4 }}>Current Version</div> /* keep-inline */ /* keep-inline */
                                    <div style={{ fontSize: 16, fontWeight: 600 }}>{hubVersion}</div> /* keep-inline */ /* keep-inline */
                                </div>
                                <div style={{ padding: '12px 16px', background: 'var(--bg-secondary, #09090b)', borderRadius: 8 }}> /* keep-inline */ /* keep-inline */
                                    <div style={{ fontSize: 12, color: 'var(--text-secondary, #a1a1aa)', marginBottom: 4 }}>Connected Devices</div> /* keep-inline */ /* keep-inline */
                                    <div style={{ fontSize: 16, fontWeight: 600 }}>{stations.length}</div> /* keep-inline */ /* keep-inline */
                                </div>
                            </div>
                        </div>

                        {/* Stations */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}> /* keep-inline */ /* keep-inline */
                            <h2 style={{ fontSize: 16, fontWeight: 600 }}>Stations ({stations.length})</h2> /* keep-inline */ /* keep-inline */
                            <button onClick={startNewStation} style={{ ...btnPrimary, display: 'flex', alignItems: 'center', gap: 6 }}> /* keep-inline */ /* keep-inline */
                                <Plus size={16} /> Create New Station
                            </button>
                        </div>

                        {stations.map(station => (
                            <div key={station.id} style={{ ...cardStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}> /* keep-inline */ /* keep-inline */
                                <div>
                                    <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>{station.name}</div> /* keep-inline */ /* keep-inline */
                                    <div style={{ fontSize: 13, color: 'var(--text-secondary, #a1a1aa)' }}>Items: {station.itemRouting}</div> /* keep-inline */ /* keep-inline */
                                </div>
                                <div style={{ display: 'flex', gap: 8 }}> /* keep-inline */ /* keep-inline */
                                    <button onClick={() => navigate('/pos/kds2')} style={{ ...btnOutline, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 4 }}> /* keep-inline */ /* keep-inline */
                                        <Eye size={14} /> View
                                    </button>
                                    <button onClick={() => editStation(station)} style={{ ...btnOutline, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 4 }}> /* keep-inline */ /* keep-inline */
                                        <Edit3 size={14} /> Edit
                                    </button>
                                    <button onClick={() => deleteStation(station.id)} style={{ ...btnOutline, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 4, color: '#ef4444', borderColor: '#ef4444' }}> /* keep-inline */ /* keep-inline */
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </>
                ) : (
                    /* ===== Wizard Steps ===== */
                    <>
                        {/* Step Indicators */}
                        <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}> /* keep-inline */ /* keep-inline */
                            {['Name', 'Item Routing', 'Ticket Display', 'Order Status'].map((step, idx) => (
                                <button
                                    key={step}
                                    onClick={() => setWizardStep(idx + 1)}
                                    style={{ /* keep-inline */ /* keep-inline */
                                        flex: 1,
                                        padding: '10px 8px',
                                        borderRadius: 8,
                                        border: wizardStep === idx + 1 ? '2px solid #3B82F6' : '1px solid var(--border-primary, #27272a)',
                                        background: wizardStep === idx + 1 ? 'rgba(59,130,246,0.1)' : 'transparent',
                                        color: wizardStep === idx + 1 ? '#3B82F6' : 'var(--text-secondary, #a1a1aa)',
                                        fontSize: 13,
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: 6,
                                    }}
                                >
                                    <span style={{ width: 22, height: 22, borderRadius: '50%', background: wizardStep > idx + 1 ? '#22C55E' : wizardStep === idx + 1 ? '#3B82F6' : '#3f3f46', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#fff' }}> /* keep-inline */ /* keep-inline */
                                        {wizardStep > idx + 1 ? <Check size={12} /> : idx + 1}
                                    </span>
                                    {step}
                                </button>
                            ))}
                        </div>

                        {/* Step 1: Name */}
                        {wizardStep === 1 && (
                            <div style={cardStyle}>
                                <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Station Name</h3> /* keep-inline */ /* keep-inline */
                                <p style={{ fontSize: 13, color: 'var(--text-secondary, #a1a1aa)', marginBottom: 12 }}> /* keep-inline */ /* keep-inline */
                                    Enter a unique name for this KDS screen (max 25 characters). This name is used to identify the screen on the POS Hub.
                                </p>
                                <input aria-label="Input"
                                    type="text"
                                    value={newName}
                                    onChange={e = aria-label="Input field"> setNewName(e.target.value.slice(0, 25))}
                                    placeholder="e.g. Kitchen, Bar, Grill, Cold Service"
                                    style={inputStyle}
                                    maxLength={25}
                                />
                                <div style={{ fontSize: 12, color: 'var(--text-secondary, #a1a1aa)', marginTop: 6 }}> /* keep-inline */ /* keep-inline */
                                    {newName.length}/25 characters
                                </div>
                                <div style={{ display: 'flex', gap: 12, marginTop: 20 }}> /* keep-inline */ /* keep-inline */
                                    <button onClick={() => setWizardStep(2)} style={btnPrimary} disabled={!newName.trim()}>
                                        Save and Continue <ChevronRight size={14} style={{ marginLeft: 4 }} /> /* keep-inline */ /* keep-inline */
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Step 2: Item Routing */}
                        {wizardStep === 2 && (
                            <div style={cardStyle}>
                                <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Item Routing</h3> /* keep-inline */ /* keep-inline */
                                <p style={{ fontSize: 13, color: 'var(--text-secondary, #a1a1aa)', marginBottom: 12 }}> /* keep-inline */ /* keep-inline */
                                    Select which items you wish to have routed to this station.
                                </p>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}> /* keep-inline */ /* keep-inline */
                                    {ALL_CATEGORIES.map(cat => (
                                        <button
                                            key={cat}
                                            onClick={() => toggleRouting(cat)}
                                            style={{ /* keep-inline */ /* keep-inline */
                                                padding: '10px 14px',
                                                borderRadius: 8,
                                                border: newRouting.has(cat) ? '2px solid #3B82F6' : '1px solid var(--border-primary, #27272a)',
                                                background: newRouting.has(cat) ? 'rgba(59,130,246,0.1)' : 'transparent',
                                                color: newRouting.has(cat) ? '#3B82F6' : 'var(--text-primary, #fafafa)',
                                                fontSize: 13,
                                                fontWeight: 500,
                                                cursor: 'pointer',
                                                textAlign: 'left',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 8,
                                            }}
                                        >
                                            {newRouting.has(cat) && <Check size={14} />}
                                            {cat}
                                        </button>
                                    ))}
                                </div>
                                <div style={{ display: 'flex', gap: 12, marginTop: 20 }}> /* keep-inline */ /* keep-inline */
                                    <button onClick={() => setWizardStep(1)} style={btnOutline}><ArrowLeft size={14} /> Back</button>
                                    <button onClick={() => setWizardStep(3)} style={btnPrimary}>
                                        Add {newRouting.size} items to station <ChevronRight size={14} />
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Step 3: Ticket Display */}
                        {wizardStep === 3 && (
                            <div style={cardStyle}>
                                <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Ticket Display</h3> /* keep-inline */ /* keep-inline */
                                <p style={{ fontSize: 13, color: 'var(--text-secondary, #a1a1aa)', marginBottom: 16 }}> /* keep-inline */ /* keep-inline */
                                    Select which information you wish to have displayed on each ticket.
                                </p>
                                {Object.entries(newTicketDisplay).map(([key, value]) => (
                                    <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}> /* keep-inline */ /* keep-inline */
                                        <span style={{ fontSize: 14 }}>{key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}</span> /* keep-inline */ /* keep-inline */
                                        <div style={toggleStyle(value)} onClick={() => setNewTicketDisplay(prev => ({ ...prev, [key]: !value }))}>
                                            <div style={toggleDotStyle(value)} />
                                        </div>
                                    </div>
                                ))}
                                <div style={{ display: 'flex', gap: 12, marginTop: 20 }}> /* keep-inline */ /* keep-inline */
                                    <button onClick={() => setWizardStep(2)} style={btnOutline}><ArrowLeft size={14} /> Back</button>
                                    <button onClick={() => setWizardStep(4)} style={btnPrimary}>
                                        Save and Continue <ChevronRight size={14} />
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Step 4: Order Status */}
                        {wizardStep === 4 && (
                            <div style={cardStyle}>
                                <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Order Status Setup</h3> /* keep-inline */ /* keep-inline */
                                <p style={{ fontSize: 13, color: 'var(--text-secondary, #a1a1aa)', marginBottom: 16 }}> /* keep-inline */ /* keep-inline */
                                    You can deactivate two of the Order Status options if your workflow doesn't use them.
                                </p>

                                <div style={{ ...cardStyle, background: 'var(--bg-secondary, #09090b)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}> /* keep-inline */ /* keep-inline */
                                    <div>
                                        <div style={{ fontWeight: 600, marginBottom: 4 }}> /* keep-inline */ /* keep-inline */
                                            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#9CA3AF', display: 'inline-block', marginRight: 8 }} /> /* keep-inline */ /* keep-inline */
                                            New
                                        </div>
                                        <div style={{ fontSize: 13, color: 'var(--text-secondary, #a1a1aa)' }}>Received order awaiting preparation</div> /* keep-inline */ /* keep-inline */
                                    </div>
                                    <button
                                        onClick={() => setNewStatusNew(!newStatusNew)}
                                        style={{ padding: '6px 16px', borderRadius: 6, border: '1px solid', borderColor: newStatusNew ? '#22C55E' : '#ef4444', background: newStatusNew ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', color: newStatusNew ? '#22C55E' : '#ef4444', fontSize: 13, fontWeight: 600, cursor: 'pointer' }} /* keep-inline */ /* keep-inline */
                                    >
                                        {newStatusNew ? 'Activated' : 'Deactivated'}
                                    </button>
                                </div>

                                <div style={{ ...cardStyle, background: 'var(--bg-secondary, #09090b)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}> /* keep-inline */ /* keep-inline */
                                    <div>
                                        <div style={{ fontWeight: 600, marginBottom: 4 }}> /* keep-inline */ /* keep-inline */
                                            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#22C55E', display: 'inline-block', marginRight: 8 }} /> /* keep-inline */ /* keep-inline */
                                            Ready to Collect
                                        </div>
                                        <div style={{ fontSize: 13, color: 'var(--text-secondary, #a1a1aa)' }}>Cooked items ready to be served</div> /* keep-inline */ /* keep-inline */
                                    </div>
                                    <button
                                        onClick={() => setNewStatusReady(!newStatusReady)}
                                        style={{ padding: '6px 16px', borderRadius: 6, border: '1px solid', borderColor: newStatusReady ? '#22C55E' : '#ef4444', background: newStatusReady ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', color: newStatusReady ? '#22C55E' : '#ef4444', fontSize: 13, fontWeight: 600, cursor: 'pointer' }} /* keep-inline */ /* keep-inline */
                                    >
                                        {newStatusReady ? 'Activated' : 'Deactivated'}
                                    </button>
                                </div>

                                <div style={{ display: 'flex', gap: 12, marginTop: 20 }}> /* keep-inline */ /* keep-inline */
                                    <button onClick={() => setWizardStep(3)} style={btnOutline}><ArrowLeft size={14} /> Back</button>
                                    <button onClick={saveStation} style={btnPrimary}>
                                        <Check size={14} style={{ marginRight: 4 }} /> {editStationId ? 'Save Changes' : 'Create Station'} /* keep-inline */ /* keep-inline */
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default KDS2Setup;
