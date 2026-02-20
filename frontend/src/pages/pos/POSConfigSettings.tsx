/**
 * POSConfigSettings.tsx — POS Configuration Settings
 * Pixel-perfect Lightspeed K-Series clone
 *
 * 7 Tabs (exact Lightspeed match):
 * 1. Basic Setup — Menu selection, Configuration name
 * 2. Order Management — Order mode, floor plans, courses, group ordering
 * 3. Order Tickets — 16+ toggles for ticket display/appearance/printing
 * 4. Payments — Payment options, tips, discounts/loyalty
 * 5. Receipts — 15+ toggles for receipt customization/printing
 * 6. Device Settings — User rules, register screen, idle mode, advanced
 * 7. Scheduling & Reporting — Timed menus, tags, shift reports, stock transfer
 */

import React, { useState } from 'react';
import {
    ArrowLeft, Save, Settings, ShoppingCart, FileText,
    CreditCard, Receipt, Monitor, Calendar, ChevronRight,
    Plus, X, Clock, Trash2, Copy, Link, HelpCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

/* ===== Types ===== */

type TabKey = 'basic' | 'orders' | 'tickets' | 'payments' | 'receipts' | 'device' | 'scheduling';

interface POSConfig {
    name: string;
    menu: string;

    // Order Management
    orderMode: 'direct-sales' | 'table-service';
    floorPlans: string[];
    selectedFloorPlan: string;
    onDemandTables: boolean;
    orderTypes: { directSales: boolean; directOrders: boolean; tableOnly: boolean };
    defaultOrderProfile: string;
    orderNumberReset: number;
    firstCourse: 'course-0' | 'course-1';
    allowZeroCovers: boolean;
    showFireCourse: boolean;
    autoFireFirstCourse: boolean;
    limitOrderToAssignedUser: boolean;
    allowDirectSalesOnHold: boolean;
    groupOrdering: boolean;
    groupMaxTimeBetween: number;
    groupMaxTimeSinceFirst: number;

    // Order Tickets
    ticketFloorPlanName: boolean;
    ticketSeatDetails: boolean;
    ticketCovers: boolean;
    ticketOrderSummary: boolean;
    ticketOrderProfile: boolean;
    ticketPrice: boolean;
    ticketCustomerAddress: boolean;
    ticketDivider: boolean;
    ticketAlphabetical: boolean;
    ticketMergeIdentical: boolean;
    ticketSortBySeats: boolean;
    ticketShortenLines: boolean;
    ticketRedSubItems: boolean;
    ticketPrintOnTransfer: boolean;
    ticketCutCourses: boolean;
    ticketOnlyPrintAssigned: boolean;
    ticketOnePerItem: boolean;

    // Payments
    payAllowRefund: boolean;
    payAutoFillAmount: boolean;
    payCheckSplitting: boolean;
    payPrintFinalCheck: boolean;
    payRequireSignature: boolean;
    payWholeAmountsOnly: boolean;
    payLinkLoyaltyToCustomer: boolean;
    payEnableMealVoucherCredit: boolean;
    payProcessThirdPartyQR: boolean;
    payEnableTips: boolean;
    paySuggestedTips: boolean;
    payTipCalculation: 'before-tax' | 'after-tax';
    payTipDiscount: 'before-discount' | 'after-discount';
    payTipType: 'percentage' | 'fixed' | 'dynamic';
    payTipValues: [number, number, number];
    payDynamicThreshold: number;

    // Receipts
    receiptBusinessName: boolean;
    receiptOrderProfile: boolean;
    receiptCoverCount: boolean;
    receiptZeroPriced: boolean;
    receiptPreTaxTotal: boolean;
    receiptCustomerName: boolean;
    receiptCustomerAddress: boolean;
    receiptDeliveryInfo: boolean;
    receiptGroupBySeat: boolean;
    receiptGroupSubItems: boolean;
    receiptShowFree: boolean;
    receiptListIdenticalSeparately: boolean;
    receiptIncludeTaxRate: boolean;
    receiptSplitByCovers: boolean;
    receiptPrintOnce: boolean;
    receiptLargeItems: boolean;
    receiptLargeTotal: boolean;
    receiptLargeServer: boolean;
    receiptRefundHistory: boolean;
    receiptPartialPayment: boolean;
    receiptDeliverySlip: boolean;
    receiptAutoPrintPaid: boolean;
    receiptAutoPrintTable: boolean;
    receiptAutoPrintCard: boolean;
    receiptAutoCardTransaction: boolean;

    // Device Settings
    mergeIdenticalItems: boolean;
    afterSendAction: 'stay' | 'new-order' | 'logout';
    enableIdleMode: boolean;
    idleScreenSaver: 'logo' | 'slideshow';
    capitalMainButtons: boolean;
    capitalItemButtons: boolean;

    // Scheduling
    timedEvents: Array<{ title: string; menu: string; startDate: string; endDate: string; allDay: boolean; startTime: string; endTime: string; days: string[] }>;
    reportTags: string[];
    shiftReportDetail: 'total' | 'groups' | 'groups-items';
    stockTransfers: Array<{ from: string; to: string }>;
}

/* ===== Default Config ===== */

const DEFAULT_CONFIG: POSConfig = {
    name: 'Main POS Configuration',
    menu: 'Default Menu',
    orderMode: 'table-service',
    floorPlans: ['Main Floor', 'Terrace', 'Outdoor'],
    selectedFloorPlan: 'Main Floor',
    onDemandTables: true,
    orderTypes: { directSales: true, directOrders: true, tableOnly: false },
    defaultOrderProfile: 'Dine-In',
    orderNumberReset: 999,
    firstCourse: 'course-1',
    allowZeroCovers: false,
    showFireCourse: true,
    autoFireFirstCourse: true,
    limitOrderToAssignedUser: false,
    allowDirectSalesOnHold: true,
    groupOrdering: false,
    groupMaxTimeBetween: 5,
    groupMaxTimeSinceFirst: 15,
    ticketFloorPlanName: true,
    ticketSeatDetails: true,
    ticketCovers: true,
    ticketOrderSummary: false,
    ticketOrderProfile: true,
    ticketPrice: false,
    ticketCustomerAddress: true,
    ticketDivider: true,
    ticketAlphabetical: false,
    ticketMergeIdentical: true,
    ticketSortBySeats: true,
    ticketShortenLines: false,
    ticketRedSubItems: false,
    ticketPrintOnTransfer: true,
    ticketCutCourses: true,
    ticketOnlyPrintAssigned: false,
    ticketOnePerItem: false,
    payAllowRefund: true,
    payAutoFillAmount: true,
    payCheckSplitting: true,
    payPrintFinalCheck: false,
    payRequireSignature: false,
    payWholeAmountsOnly: false,
    payLinkLoyaltyToCustomer: true,
    payEnableMealVoucherCredit: false,
    payProcessThirdPartyQR: true,
    payEnableTips: true,
    paySuggestedTips: true,
    payTipCalculation: 'after-tax',
    payTipDiscount: 'before-discount',
    payTipType: 'percentage',
    payTipValues: [10, 15, 20],
    payDynamicThreshold: 50,
    receiptBusinessName: true,
    receiptOrderProfile: true,
    receiptCoverCount: true,
    receiptZeroPriced: false,
    receiptPreTaxTotal: true,
    receiptCustomerName: true,
    receiptCustomerAddress: true,
    receiptDeliveryInfo: true,
    receiptGroupBySeat: true,
    receiptGroupSubItems: true,
    receiptShowFree: true,
    receiptListIdenticalSeparately: false,
    receiptIncludeTaxRate: true,
    receiptSplitByCovers: false,
    receiptPrintOnce: false,
    receiptLargeItems: false,
    receiptLargeTotal: true,
    receiptLargeServer: false,
    receiptRefundHistory: true,
    receiptPartialPayment: true,
    receiptDeliverySlip: true,
    receiptAutoPrintPaid: true,
    receiptAutoPrintTable: true,
    receiptAutoPrintCard: true,
    receiptAutoCardTransaction: false,
    mergeIdenticalItems: true,
    afterSendAction: 'stay',
    enableIdleMode: true,
    idleScreenSaver: 'logo',
    capitalMainButtons: false,
    capitalItemButtons: false,
    timedEvents: [
        { title: 'Lunch Special', menu: 'Lunch Menu', startDate: '2026-01-01', endDate: '', allDay: false, startTime: '11:30', endTime: '14:30', days: ['Weekdays'] },
    ],
    reportTags: ['Main POS'],
    shiftReportDetail: 'groups',
    stockTransfers: [{ from: 'Main Stock', to: 'Bar Stock' }],
};

/* ===== Tab Config ===== */

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    { key: 'basic', label: 'Basic Setup', icon: <Settings size={16} /> },
    { key: 'orders', label: 'Order Management', icon: <ShoppingCart size={16} /> },
    { key: 'tickets', label: 'Order Tickets', icon: <FileText size={16} /> },
    { key: 'payments', label: 'Payments', icon: <CreditCard size={16} /> },
    { key: 'receipts', label: 'Receipts', icon: <Receipt size={16} /> },
    { key: 'device', label: 'Device Settings', icon: <Monitor size={16} /> },
    { key: 'scheduling', label: 'Scheduling & Reporting', icon: <Calendar size={16} /> },
];

/* ===== Styles ===== */

const pg: React.CSSProperties = { minHeight: '100vh', background: 'var(--bg-primary, #0a0a0a)', color: 'var(--text-primary, #fafafa)', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' };
const ct: React.CSSProperties = { maxWidth: 1100, margin: '0 auto', padding: '24px 20px', display: 'flex', gap: 20 };
const sb: React.CSSProperties = { width: 220, flexShrink: 0 };
const mn: React.CSSProperties = { flex: 1 };
const cd: React.CSSProperties = { background: 'var(--bg-card, #18181b)', border: '1px solid var(--border-primary, #27272a)', borderRadius: 12, padding: 20, marginBottom: 16 };
const rw: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' };
const bp: React.CSSProperties = { padding: '10px 24px', background: '#3B82F6', border: 'none', borderRadius: 8, color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 };
const bo: React.CSSProperties = { padding: '10px 24px', background: 'transparent', border: '1px solid var(--border-primary, #27272a)', borderRadius: 8, color: 'var(--text-primary, #fafafa)', fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 };
const ip: React.CSSProperties = { width: '100%', padding: '10px 14px', background: 'var(--bg-secondary, #09090b)', border: '1px solid var(--border-primary, #27272a)', borderRadius: 8, color: 'var(--text-primary, #fafafa)', fontSize: 14 };
const sl: React.CSSProperties = { ...ip, cursor: 'pointer' };

const ts = (a: boolean): React.CSSProperties => ({ width: 44, height: 24, borderRadius: 12, background: a ? '#3B82F6' : '#3f3f46', cursor: 'pointer', position: 'relative', flexShrink: 0 });
const td = (a: boolean): React.CSSProperties => ({ position: 'absolute', top: 2, left: a ? 22 : 2, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left 0.2s ease', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' });
const rdio = (a: boolean): React.CSSProperties => ({ padding: '8px 14px', borderRadius: 8, border: a ? '2px solid #3B82F6' : '1px solid var(--border-primary, #27272a)', background: a ? 'rgba(59,130,246,0.1)' : 'transparent', color: a ? '#3B82F6' : 'var(--text-primary, #fafafa)', fontSize: 13, fontWeight: a ? 600 : 400, cursor: 'pointer' });

/* ===== Toggle Component ===== */

const Toggle: React.FC<{ value: boolean; onChange: () => void }> = ({ value, onChange }) => (
    <div style={ts(value)} onClick={onChange}><div style={td(value)} /></div>
);

/* ===== Section Title ===== */

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div style={{ fontSize: 13, fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-secondary, #a1a1aa)', marginBottom: 10, marginTop: 16, letterSpacing: 0.5 }}>{children}</div>
);

/* ===== Row Component ===== */

const SettingRow: React.FC<{ label: string; desc?: string; children: React.ReactNode }> = ({ label, desc, children }) => (
    <div style={rw}>
        <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 500, fontSize: 14 }}>{label}</div>
            {desc && <div style={{ fontSize: 12, color: 'var(--text-secondary, #a1a1aa)', marginTop: 2 }}>{desc}</div>}
        </div>
        <div style={{ flexShrink: 0, marginLeft: 16 }}>{children}</div>
    </div>
);

/* ===== Main Component ===== */

const POSConfigSettings: React.FC = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<TabKey>('basic');
    const [config, setConfig] = useState<POSConfig>(DEFAULT_CONFIG);

    const set = <K extends keyof POSConfig>(key: K, value: POSConfig[K]) => {
        setConfig(prev => ({ ...prev, [key]: value }));
    };

    const toggle = (key: keyof POSConfig) => {
        setConfig(prev => ({ ...prev, [key]: !(prev[key] as boolean) }));
    };

    const saveConfig = () => { toast.success('POS Configuration saved'); };

    return (
        <div style={pg}>
            <div style={ct}>
                {/* Sidebar */}
                <div style={sb}>
                    <button onClick={() => navigate('/pos/runtime')} style={{ ...bo, width: '100%', marginBottom: 16 }}>
                        <ArrowLeft size={16} /> Back to POS
                    </button>

                    <div style={{ ...cd, padding: 8 }}>
                        {TABS.map(tab => (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                style={{
                                    width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                                    padding: '10px 12px', borderRadius: 8, border: 'none',
                                    background: activeTab === tab.key ? 'rgba(59,130,246,0.1)' : 'transparent',
                                    color: activeTab === tab.key ? '#3B82F6' : 'var(--text-primary, #fafafa)',
                                    fontSize: 13, fontWeight: activeTab === tab.key ? 600 : 400,
                                    cursor: 'pointer', textAlign: 'left',
                                }}
                            >
                                {tab.icon} {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Quick Actions */}
                    <div style={{ ...cd, padding: 12, marginTop: 12 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary, #a1a1aa)', marginBottom: 8, textTransform: 'uppercase' }}>Actions</div>
                        <button style={{ ...bo, width: '100%', fontSize: 12, padding: '8px 12px', marginBottom: 6 }}><Link size={12} /> View Linked Devices</button>
                        <button style={{ ...bo, width: '100%', fontSize: 12, padding: '8px 12px', marginBottom: 6 }}><Copy size={12} /> Duplicate Config</button>
                    </div>
                </div>

                {/* Main Content */}
                <div style={mn}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                        <h1 style={{ fontSize: 22, fontWeight: 700 }}>{TABS.find(t => t.key === activeTab)?.label}</h1>
                        <div style={{ display: 'flex', gap: 12 }}>
                            <button style={bo} onClick={() => setConfig(DEFAULT_CONFIG)}>Discard</button>
                            <button style={bp} onClick={saveConfig}><Save size={16} /> Save</button>
                        </div>
                    </div>

                    {/* ===== TAB 1: Basic Setup ===== */}
                    {activeTab === 'basic' && (
                        <>
                            <div style={cd}>
                                <SectionTitle>Configuration</SectionTitle>
                                <SettingRow label="Configuration Name" desc="Name displayed in the Back Office">
                                    <input style={{ ...ip, width: 250 }} value={config.name} onChange={e => set('name', e.target.value)} />
                                </SettingRow>
                            </div>
                            <div style={cd}>
                                <SectionTitle>Menu Settings</SectionTitle>
                                <SettingRow label="Menu" desc="Select the menu to use for this configuration">
                                    <select style={{ ...sl, width: 250 }} value={config.menu} onChange={e => set('menu', e.target.value)} aria-label="Menu">
                                        <option>Default Menu</option><option>Lunch Menu</option><option>Dinner Menu</option><option>Bar Menu</option>
                                    </select>
                                </SettingRow>
                            </div>
                        </>
                    )}

                    {/* ===== TAB 2: Order Management ===== */}
                    {activeTab === 'orders' && (
                        <>
                            <div style={cd}>
                                <SectionTitle>Order Mode</SectionTitle>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                                    <button onClick={() => set('orderMode', 'direct-sales')} style={rdio(config.orderMode === 'direct-sales')}>
                                        Direct Sales Only
                                    </button>
                                    <button onClick={() => set('orderMode', 'table-service')} style={rdio(config.orderMode === 'table-service')}>
                                        With Table Service
                                    </button>
                                </div>

                                {config.orderMode === 'table-service' && (
                                    <>
                                        <SettingRow label="Floor Plan" desc="Select from available floor plans">
                                            <select style={{ ...sl, width: 200 }} value={config.selectedFloorPlan} onChange={e => set('selectedFloorPlan', e.target.value)} aria-label="Floor plan">
                                                {config.floorPlans.map(f => <option key={f}>{f}</option>)}
                                            </select>
                                        </SettingRow>
                                        <SettingRow label="On-demand table creation"><Toggle value={config.onDemandTables} onChange={() => toggle('onDemandTables')} /></SettingRow>
                                    </>
                                )}

                                <SectionTitle>Choose Order Types</SectionTitle>
                                <SettingRow label="Direct sales" desc="Orders paid for immediately"><Toggle value={config.orderTypes.directSales} onChange={() => setConfig(p => ({ ...p, orderTypes: { ...p.orderTypes, directSales: !p.orderTypes.directSales } }))} /></SettingRow>
                                <SettingRow label="Direct orders" desc="Orders assigned to a tab"><Toggle value={config.orderTypes.directOrders} onChange={() => setConfig(p => ({ ...p, orderTypes: { ...p.orderTypes, directOrders: !p.orderTypes.directOrders } }))} /></SettingRow>
                                {config.orderMode === 'table-service' && (
                                    <SettingRow label="Keep only table orders"><Toggle value={config.orderTypes.tableOnly} onChange={() => setConfig(p => ({ ...p, orderTypes: { ...p.orderTypes, tableOnly: !p.orderTypes.tableOnly } }))} /></SettingRow>
                                )}

                                <SettingRow label="Default order profile for direct sales">
                                    <select style={{ ...sl, width: 180 }} value={config.defaultOrderProfile} onChange={e => set('defaultOrderProfile', e.target.value)} aria-label="Default order profile">
                                        <option>Dine-In</option><option>Takeaway</option><option>Delivery</option>
                                    </select>
                                </SettingRow>

                                <SettingRow label="Order number reset at" desc="Set the last order number before count resets">
                                    <input type="number" style={{ ...ip, width: 100 }} value={config.orderNumberReset} onChange={e => set('orderNumberReset', parseInt(e.target.value) || 0)} />
                                </SettingRow>

                                <SettingRow label="First course numbering">
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <button style={rdio(config.firstCourse === 'course-0')} onClick={() => set('firstCourse', 'course-0')}>Course 0</button>
                                        <button style={rdio(config.firstCourse === 'course-1')} onClick={() => set('firstCourse', 'course-1')}>Course 1</button>
                                    </div>
                                </SettingRow>
                            </div>

                            <div style={cd}>
                                <SectionTitle>Order Toggles</SectionTitle>
                                {config.orderMode === 'table-service' && (
                                    <>
                                        <SettingRow label="Allow orders with zero covers"><Toggle value={config.allowZeroCovers} onChange={() => toggle('allowZeroCovers')} /></SettingRow>
                                        <SettingRow label='Show "Fire course" on register screen'><Toggle value={config.showFireCourse} onChange={() => toggle('showFireCourse')} /></SettingRow>
                                        <SettingRow label="Automatically fire the first course"><Toggle value={config.autoFireFirstCourse} onChange={() => toggle('autoFireFirstCourse')} /></SettingRow>
                                        <SettingRow label="Limit order taking to assigned user"><Toggle value={config.limitOrderToAssignedUser} onChange={() => toggle('limitOrderToAssignedUser')} /></SettingRow>
                                    </>
                                )}
                                {config.orderTypes.directSales && (
                                    <SettingRow label="Allow direct sales to be placed on hold"><Toggle value={config.allowDirectSalesOnHold} onChange={() => toggle('allowDirectSalesOnHold')} /></SettingRow>
                                )}
                            </div>

                            <div style={cd}>
                                <SectionTitle>Group Ordering</SectionTitle>
                                <SettingRow label="Enable group ordering" desc="Groups can order together but pay individually"><Toggle value={config.groupOrdering} onChange={() => toggle('groupOrdering')} /></SettingRow>
                                {config.groupOrdering && (
                                    <>
                                        <SettingRow label="Max time between orders">
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <input type="number" style={{ ...ip, width: 80 }} value={config.groupMaxTimeBetween} onChange={e => set('groupMaxTimeBetween', parseInt(e.target.value) || 0)} />
                                                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>min</span>
                                            </div>
                                        </SettingRow>
                                        <SettingRow label="Max time since first order">
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <input type="number" style={{ ...ip, width: 80 }} value={config.groupMaxTimeSinceFirst} onChange={e => set('groupMaxTimeSinceFirst', parseInt(e.target.value) || 0)} />
                                                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>min</span>
                                            </div>
                                        </SettingRow>
                                    </>
                                )}
                            </div>
                        </>
                    )}

                    {/* ===== TAB 3: Order Tickets ===== */}
                    {activeTab === 'tickets' && (
                        <>
                            <div style={cd}>
                                <SectionTitle>Ticket Information</SectionTitle>
                                <SettingRow label="Floor plan name"><Toggle value={config.ticketFloorPlanName} onChange={() => toggle('ticketFloorPlanName')} /></SettingRow>
                                <SettingRow label="Seat details"><Toggle value={config.ticketSeatDetails} onChange={() => toggle('ticketSeatDetails')} /></SettingRow>
                                <SettingRow label="Number of covers"><Toggle value={config.ticketCovers} onChange={() => toggle('ticketCovers')} /></SettingRow>
                                <SettingRow label="Order summary on each ticket" desc="All courses print with order history"><Toggle value={config.ticketOrderSummary} onChange={() => toggle('ticketOrderSummary')} /></SettingRow>
                                <SettingRow label="Order profile"><Toggle value={config.ticketOrderProfile} onChange={() => toggle('ticketOrderProfile')} /></SettingRow>
                                <SettingRow label="Price of items"><Toggle value={config.ticketPrice} onChange={() => toggle('ticketPrice')} /></SettingRow>
                                <SettingRow label="Customer address"><Toggle value={config.ticketCustomerAddress} onChange={() => toggle('ticketCustomerAddress')} /></SettingRow>
                            </div>

                            <div style={cd}>
                                <SectionTitle>Ticket Appearance</SectionTitle>
                                <SettingRow label="Separate items with a divider"><Toggle value={config.ticketDivider} onChange={() => toggle('ticketDivider')} /></SettingRow>
                                <SettingRow label="Sort items alphabetically by accounting group"><Toggle value={config.ticketAlphabetical} onChange={() => toggle('ticketAlphabetical')} /></SettingRow>
                                <SettingRow label="Merge identical items into a single line"><Toggle value={config.ticketMergeIdentical} onChange={() => toggle('ticketMergeIdentical')} /></SettingRow>
                                <SettingRow label="Sort items by seat"><Toggle value={config.ticketSortBySeats} onChange={() => toggle('ticketSortBySeats')} /></SettingRow>
                                <SettingRow label="Shorten lines to save space"><Toggle value={config.ticketShortenLines} onChange={() => toggle('ticketShortenLines')} /></SettingRow>
                                <SettingRow label="Print sub-items in red" desc="Requires compatible printer with red ink ribbon"><Toggle value={config.ticketRedSubItems} onChange={() => toggle('ticketRedSubItems')} /></SettingRow>
                            </div>

                            <div style={cd}>
                                <SectionTitle>Ticket Printing</SectionTitle>
                                <SettingRow label="Print order ticket when transferring table"><Toggle value={config.ticketPrintOnTransfer} onChange={() => toggle('ticketPrintOnTransfer')} /></SettingRow>
                                <SettingRow label="Cut order ticket into separate courses"><Toggle value={config.ticketCutCourses} onChange={() => toggle('ticketCutCourses')} /></SettingRow>
                                <SettingRow label="Only print items assigned to a production center"><Toggle value={config.ticketOnlyPrintAssigned} onChange={() => toggle('ticketOnlyPrintAssigned')} /></SettingRow>
                                <SettingRow label="Print one item per ticket" desc="Every item prints its own ticket"><Toggle value={config.ticketOnePerItem} onChange={() => toggle('ticketOnePerItem')} /></SettingRow>
                            </div>
                        </>
                    )}

                    {/* ===== TAB 4: Payments ===== */}
                    {activeTab === 'payments' && (
                        <>
                            <div style={cd}>
                                <SectionTitle>Payment Options</SectionTitle>
                                <SettingRow label="Allow refund processing on POS"><Toggle value={config.payAllowRefund} onChange={() => toggle('payAllowRefund')} /></SettingRow>
                                <SettingRow label="Auto-fill exact received amount at payment"><Toggle value={config.payAutoFillAmount} onChange={() => toggle('payAutoFillAmount')} /></SettingRow>
                                <SettingRow label="Activate separate screen for check splitting"><Toggle value={config.payCheckSplitting} onChange={() => toggle('payCheckSplitting')} /></SettingRow>
                                <SettingRow label="Print final check after the receipt"><Toggle value={config.payPrintFinalCheck} onChange={() => toggle('payPrintFinalCheck')} /></SettingRow>
                                <SettingRow label="Require signature on terminal"><Toggle value={config.payRequireSignature} onChange={() => toggle('payRequireSignature')} /></SettingRow>
                                <SettingRow label="Allow only whole amounts on payment keypad"><Toggle value={config.payWholeAmountsOnly} onChange={() => toggle('payWholeAmountsOnly')} /></SettingRow>
                            </div>

                            <div style={cd}>
                                <SectionTitle>Discounts, Loyalty Cards & Vouchers</SectionTitle>
                                <SettingRow label="Link loyalty card to customer"><Toggle value={config.payLinkLoyaltyToCustomer} onChange={() => toggle('payLinkLoyaltyToCustomer')} /></SettingRow>
                                <SettingRow label="Enable credit for unused meal voucher amount"><Toggle value={config.payEnableMealVoucherCredit} onChange={() => toggle('payEnableMealVoucherCredit')} /></SettingRow>
                                <SettingRow label="Process third-party QR codes"><Toggle value={config.payProcessThirdPartyQR} onChange={() => toggle('payProcessThirdPartyQR')} /></SettingRow>
                            </div>

                            <div style={cd}>
                                <SectionTitle>Tips</SectionTitle>
                                <SettingRow label="Enable tips" desc="Allow tips to be entered by staff or customers"><Toggle value={config.payEnableTips} onChange={() => toggle('payEnableTips')} /></SettingRow>

                                {config.payEnableTips && (
                                    <>
                                        <SettingRow label="Show suggested tips" desc="Display suggested tip amounts to customers"><Toggle value={config.paySuggestedTips} onChange={() => toggle('paySuggestedTips')} /></SettingRow>

                                        {config.paySuggestedTips && (
                                            <>
                                                <SettingRow label="Calculate tip on">
                                                    <div style={{ display: 'flex', gap: 8 }}>
                                                        <button style={rdio(config.payTipCalculation === 'before-tax')} onClick={() => set('payTipCalculation', 'before-tax')}>Before taxes</button>
                                                        <button style={rdio(config.payTipCalculation === 'after-tax')} onClick={() => set('payTipCalculation', 'after-tax')}>After taxes</button>
                                                    </div>
                                                </SettingRow>

                                                <SettingRow label="Calculate tip on discounts">
                                                    <div style={{ display: 'flex', gap: 8 }}>
                                                        <button style={rdio(config.payTipDiscount === 'before-discount')} onClick={() => set('payTipDiscount', 'before-discount')}>Before discounts</button>
                                                        <button style={rdio(config.payTipDiscount === 'after-discount')} onClick={() => set('payTipDiscount', 'after-discount')}>After discounts</button>
                                                    </div>
                                                </SettingRow>

                                                <SettingRow label="Suggestion type">
                                                    <div style={{ display: 'flex', gap: 8 }}>
                                                        <button style={rdio(config.payTipType === 'percentage')} onClick={() => set('payTipType', 'percentage')}>Percentage</button>
                                                        <button style={rdio(config.payTipType === 'fixed')} onClick={() => set('payTipType', 'fixed')}>Fixed Amounts</button>
                                                        <button style={rdio(config.payTipType === 'dynamic')} onClick={() => set('payTipType', 'dynamic')}>Dynamic</button>
                                                    </div>
                                                </SettingRow>

                                                <SettingRow label="Suggested values">
                                                    <div style={{ display: 'flex', gap: 8 }}>
                                                        {config.payTipValues.map((v, idx) => (
                                                            <input key={idx} type="number" style={{ ...ip, width: 70 }}
                                                                value={v}
                                                                onChange={e => { const vals = [...config.payTipValues] as [number, number, number]; vals[idx] = parseInt(e.target.value) || 0; set('payTipValues', vals); }}
                                                            />
                                                        ))}
                                                        <span style={{ fontSize: 12, color: 'var(--text-secondary)', alignSelf: 'center' }}>
                                                            {config.payTipType === 'percentage' ? '%' : '€'}
                                                        </span>
                                                    </div>
                                                </SettingRow>

                                                {config.payTipType === 'dynamic' && (
                                                    <SettingRow label="Dynamic threshold" desc="Show percentages when total is above this amount">
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                            <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>€</span>
                                                            <input type="number" style={{ ...ip, width: 80 }} value={config.payDynamicThreshold} onChange={e => set('payDynamicThreshold', parseInt(e.target.value) || 0)} />
                                                        </div>
                                                    </SettingRow>
                                                )}
                                            </>
                                        )}
                                    </>
                                )}
                            </div>
                        </>
                    )}

                    {/* ===== TAB 5: Receipts ===== */}
                    {activeTab === 'receipts' && (
                        <>
                            <div style={cd}>
                                <SectionTitle>Receipt Information</SectionTitle>
                                <SettingRow label="Business name"><Toggle value={config.receiptBusinessName} onChange={() => toggle('receiptBusinessName')} /></SettingRow>
                                <SettingRow label="Order profile"><Toggle value={config.receiptOrderProfile} onChange={() => toggle('receiptOrderProfile')} /></SettingRow>
                                <SettingRow label="Cover count"><Toggle value={config.receiptCoverCount} onChange={() => toggle('receiptCoverCount')} /></SettingRow>
                                <SettingRow label="Zero-priced items"><Toggle value={config.receiptZeroPriced} onChange={() => toggle('receiptZeroPriced')} /></SettingRow>
                                <SettingRow label="Pre-tax total"><Toggle value={config.receiptPreTaxTotal} onChange={() => toggle('receiptPreTaxTotal')} /></SettingRow>
                                <SettingRow label="Customer name"><Toggle value={config.receiptCustomerName} onChange={() => toggle('receiptCustomerName')} /></SettingRow>
                                <SettingRow label="Customer address"><Toggle value={config.receiptCustomerAddress} onChange={() => toggle('receiptCustomerAddress')} /></SettingRow>
                                <SettingRow label="Delivery information from Order Anywhere"><Toggle value={config.receiptDeliveryInfo} onChange={() => toggle('receiptDeliveryInfo')} /></SettingRow>
                            </div>

                            <div style={cd}>
                                <SectionTitle>Item Display</SectionTitle>
                                <SettingRow label="Group items by seat"><Toggle value={config.receiptGroupBySeat} onChange={() => toggle('receiptGroupBySeat')} /></SettingRow>
                                <SettingRow label="Group sub-items"><Toggle value={config.receiptGroupSubItems} onChange={() => toggle('receiptGroupSubItems')} /></SettingRow>
                                <SettingRow label='Show 100% discount as "Free"'><Toggle value={config.receiptShowFree} onChange={() => toggle('receiptShowFree')} /></SettingRow>
                                <SettingRow label="List identical items separately"><Toggle value={config.receiptListIdenticalSeparately} onChange={() => toggle('receiptListIdenticalSeparately')} /></SettingRow>
                            </div>

                            <div style={cd}>
                                <SectionTitle>Draft Receipt</SectionTitle>
                                <SettingRow label="Include tax rate on draft receipts"><Toggle value={config.receiptIncludeTaxRate} onChange={() => toggle('receiptIncludeTaxRate')} /></SettingRow>
                                <SettingRow label="Split total by covers on draft receipts"><Toggle value={config.receiptSplitByCovers} onChange={() => toggle('receiptSplitByCovers')} /></SettingRow>
                                <SettingRow label="Print draft receipts only once"><Toggle value={config.receiptPrintOnce} onChange={() => toggle('receiptPrintOnce')} /></SettingRow>
                            </div>

                            <div style={cd}>
                                <SectionTitle>Receipt Font & Printing</SectionTitle>
                                <SettingRow label="Print items in large font"><Toggle value={config.receiptLargeItems} onChange={() => toggle('receiptLargeItems')} /></SettingRow>
                                <SettingRow label="Print total in large font"><Toggle value={config.receiptLargeTotal} onChange={() => toggle('receiptLargeTotal')} /></SettingRow>
                                <SettingRow label="Print server name in large font"><Toggle value={config.receiptLargeServer} onChange={() => toggle('receiptLargeServer')} /></SettingRow>
                                <SettingRow label="Print receipt history on refund receipts"><Toggle value={config.receiptRefundHistory} onChange={() => toggle('receiptRefundHistory')} /></SettingRow>
                                <SettingRow label="Print receipt for each partial payment"><Toggle value={config.receiptPartialPayment} onChange={() => toggle('receiptPartialPayment')} /></SettingRow>
                                <SettingRow label="Print receipt with delivery slip"><Toggle value={config.receiptDeliverySlip} onChange={() => toggle('receiptDeliverySlip')} /></SettingRow>
                            </div>

                            <div style={cd}>
                                <SectionTitle>Automatic Printing</SectionTitle>
                                <SettingRow label="Print receipt when an order is paid"><Toggle value={config.receiptAutoPrintPaid} onChange={() => toggle('receiptAutoPrintPaid')} /></SettingRow>
                                <SettingRow label="Print receipt for table orders after payment"><Toggle value={config.receiptAutoPrintTable} onChange={() => toggle('receiptAutoPrintTable')} /></SettingRow>
                                <SettingRow label="Print customer receipt with card transaction"><Toggle value={config.receiptAutoPrintCard} onChange={() => toggle('receiptAutoPrintCard')} /></SettingRow>
                                <SettingRow label="Print card transaction receipts automatically"><Toggle value={config.receiptAutoCardTransaction} onChange={() => toggle('receiptAutoCardTransaction')} /></SettingRow>
                            </div>
                        </>
                    )}

                    {/* ===== TAB 6: Device Settings ===== */}
                    {activeTab === 'device' && (
                        <>
                            <div style={cd}>
                                <SectionTitle>Register Screen Settings</SectionTitle>
                                <SettingRow label="Merge identical items with different production instructions" desc="Merge identical items must be enabled"><Toggle value={config.mergeIdenticalItems} onChange={() => toggle('mergeIdenticalItems')} /></SettingRow>

                                <SettingRow label="After order is sent or paid">
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <button style={rdio(config.afterSendAction === 'stay')} onClick={() => set('afterSendAction', 'stay')}>Stay on current order</button>
                                        <button style={rdio(config.afterSendAction === 'new-order')} onClick={() => set('afterSendAction', 'new-order')}>Start new order</button>
                                        <button style={rdio(config.afterSendAction === 'logout')} onClick={() => set('afterSendAction', 'logout')}>Log user out</button>
                                    </div>
                                </SettingRow>
                            </div>

                            <div style={cd}>
                                <SectionTitle>Idle Mode & Screen Saver</SectionTitle>
                                <SettingRow label="Enable POS idle mode with screen saver" desc="POS goes idle after 10 minutes of inactivity"><Toggle value={config.enableIdleMode} onChange={() => toggle('enableIdleMode')} /></SettingRow>

                                {config.enableIdleMode && (
                                    <SettingRow label="Screen saver option">
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            <button style={rdio(config.idleScreenSaver === 'logo')} onClick={() => set('idleScreenSaver', 'logo')}>Display logo</button>
                                            <button style={rdio(config.idleScreenSaver === 'slideshow')} onClick={() => set('idleScreenSaver', 'slideshow')}>Slideshow</button>
                                        </div>
                                    </SettingRow>
                                )}
                            </div>

                            <div style={cd}>
                                <SectionTitle>Advanced Settings</SectionTitle>
                                <SettingRow label="Use capital letters for main screen buttons"><Toggle value={config.capitalMainButtons} onChange={() => toggle('capitalMainButtons')} /></SettingRow>
                                <SettingRow label="Use capital letters for item name buttons"><Toggle value={config.capitalItemButtons} onChange={() => toggle('capitalItemButtons')} /></SettingRow>
                            </div>
                        </>
                    )}

                    {/* ===== TAB 7: Scheduling & Reporting ===== */}
                    {activeTab === 'scheduling' && (
                        <>
                            <div style={cd}>
                                <SectionTitle>Timed Events</SectionTitle>
                                <p style={{ fontSize: 13, color: 'var(--text-secondary, #a1a1aa)', marginBottom: 12 }}>
                                    Create timed menu events that automatically change the active menu on your POS.
                                </p>
                                {config.timedEvents.map((event, idx) => (
                                    <div key={idx} style={{ ...cd, background: 'var(--bg-secondary, #09090b)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <div>
                                            <div style={{ fontWeight: 600 }}>{event.title}</div>
                                            <div style={{ fontSize: 12, color: 'var(--text-secondary, #a1a1aa)' }}>
                                                {event.menu} • {event.allDay ? 'All day' : `${event.startTime} - ${event.endTime}`} • {event.days.join(', ')}
                                            </div>
                                        </div>
                                        <button style={{ ...bo, padding: '6px 10px' }} onClick={() => setConfig(p => ({ ...p, timedEvents: p.timedEvents.filter((_, i) => i !== idx) }))}>
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))}
                                <button style={{ ...bo, fontSize: 13 }} onClick={() => {
                                    setConfig(p => ({
                                        ...p,
                                        timedEvents: [...p.timedEvents, { title: 'New Event', menu: 'Default Menu', startDate: '2026-01-01', endDate: '', allDay: true, startTime: '', endTime: '', days: ['Every day'] }]
                                    }));
                                }}>
                                    <Plus size={14} /> Add Timed Event
                                </button>
                            </div>

                            <div style={cd}>
                                <SectionTitle>Reporting Tags</SectionTitle>
                                <p style={{ fontSize: 13, color: 'var(--text-secondary, #a1a1aa)', marginBottom: 12 }}>
                                    Create tags to filter sales reports by this POS configuration.
                                </p>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                                    {config.reportTags.map((tag, idx) => (
                                        <span key={idx} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 6, fontSize: 13, color: '#3B82F6' }}>
                                            {tag}
                                            <button style={{ background: 'none', border: 'none', color: '#3B82F6', cursor: 'pointer', padding: 0 }} onClick={() => setConfig(p => ({ ...p, reportTags: p.reportTags.filter((_, i) => i !== idx) }))}>
                                                <X size={12} />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                                <button style={{ ...bo, fontSize: 13 }} onClick={() => {
                                    const name = prompt('Enter tag name:');
                                    if (name) setConfig(p => ({ ...p, reportTags: [...p.reportTags, name] }));
                                }}>
                                    <Plus size={14} /> Create Tag
                                </button>
                            </div>

                            <div style={cd}>
                                <SectionTitle>Shift Reports</SectionTitle>
                                <SettingRow label="Shift report detail">
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <button style={rdio(config.shiftReportDetail === 'total')} onClick={() => set('shiftReportDetail', 'total')}>Total sales only</button>
                                        <button style={rdio(config.shiftReportDetail === 'groups')} onClick={() => set('shiftReportDetail', 'groups')}>+ Accounting groups</button>
                                        <button style={rdio(config.shiftReportDetail === 'groups-items')} onClick={() => set('shiftReportDetail', 'groups-items')}>+ Groups & items</button>
                                    </div>
                                </SettingRow>
                            </div>

                            <div style={cd}>
                                <SectionTitle>Stock Transfer</SectionTitle>
                                <p style={{ fontSize: 13, color: 'var(--text-secondary, #a1a1aa)', marginBottom: 12 }}>
                                    Add stock transfers for devices to pull stock from specific locations.
                                </p>
                                {config.stockTransfers.map((transfer, idx) => (
                                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                                        <select style={{ ...sl, flex: 1 }} value={transfer.from} onChange={e => setConfig(p => ({ ...p, stockTransfers: p.stockTransfers.map((t, i) => i === idx ? { ...t, from: e.target.value } : t) }))} aria-label="From stock">
                                            <option>Main Stock</option><option>Bar Stock</option><option>Kitchen Stock</option>
                                        </select>
                                        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>→</span>
                                        <select style={{ ...sl, flex: 1 }} value={transfer.to} onChange={e => setConfig(p => ({ ...p, stockTransfers: p.stockTransfers.map((t, i) => i === idx ? { ...t, to: e.target.value } : t) }))} aria-label="To stock">
                                            <option>Main Stock</option><option>Bar Stock</option><option>Kitchen Stock</option>
                                        </select>
                                        <button style={{ ...bo, padding: '6px 10px' }} onClick={() => setConfig(p => ({ ...p, stockTransfers: p.stockTransfers.filter((_, i) => i !== idx) }))}>
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))}
                                <button style={{ ...bo, fontSize: 13 }} onClick={() => setConfig(p => ({ ...p, stockTransfers: [...p.stockTransfers, { from: 'Main Stock', to: 'Bar Stock' }] }))}>
                                    <Plus size={14} /> Add Stock Transfer
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default POSConfigSettings;
