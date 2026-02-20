/**
 * KioskMode.tsx — K-Series Self-Service Kiosk Configuration
 * Configure kiosk mode for self-ordering terminals
 * Lightspeed K-Series Back Office > Hardware > Kiosk parity
 */
import React, { useState } from 'react';
import { ArrowLeft, Save, Monitor, Eye, Palette, CreditCard, Clock, ShieldCheck, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

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

interface KioskConfig {
    enabled: boolean; orderType: 'dine-in' | 'takeaway' | 'both'; requirePayment: boolean; acceptedPayments: string[];
    showImages: boolean; showDescriptions: boolean; showCalories: boolean; showAllergens: boolean;
    inactivityTimeout: number; maxOrderValue: number; requirePhoneNumber: boolean;
    theme: 'dark' | 'light'; accentColor: string; language: 'en' | 'mt' | 'it' | 'multi';
    printReceipt: boolean; queueNumber: boolean; upsellEnabled: boolean;
}

const KioskMode: React.FC = () => {
    const navigate = useNavigate();
    const [config, setConfig] = useState<KioskConfig>({
        enabled: true, orderType: 'both', requirePayment: true, acceptedPayments: ['Card', 'Apple Pay', 'Google Pay'],
        showImages: true, showDescriptions: true, showCalories: false, showAllergens: true,
        inactivityTimeout: 60, maxOrderValue: 200, requirePhoneNumber: false,
        theme: 'dark', accentColor: '#3B82F6', language: 'en',
        printReceipt: true, queueNumber: true, upsellEnabled: true,
    });
    const upd = (f: string, v: unknown) => setConfig(p => ({ ...p, [f]: v }));
    const PAYMENTS = ['Card', 'Cash', 'Apple Pay', 'Google Pay'];

    return (
        <div style={pg}><div style={ct}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                <div>
                    <button onClick={() => navigate(-1)} style={{ ...bo, marginBottom: 8, padding: '6px 14px', fontSize: 12 }}><ArrowLeft size={14} /> Back</button>
                    <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Kiosk Mode</h1>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary,#a1a1aa)', margin: '4px 0 0' }}>Configure self-service ordering terminals</p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button style={bo} onClick={() => toast.info('Launch kiosk preview...')}><Eye size={14} /> Preview</button>
                    <button style={bp} onClick={() => toast.success('Kiosk settings saved')}><Save size={16} /> Save</button>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {/* Left Column */}
                <div>
                    <div style={cd}>
                        <h3 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 6 }}><Settings size={16} style={{ color: '#3B82F6' }} /> General</h3>
                        <div style={rw}><span style={{ fontSize: 13 }}>Enable Kiosk Mode</span><Toggle value={config.enabled} onChange={() => upd('enabled', !config.enabled)} /></div>
                        <div style={rw}>
                            <span style={{ fontSize: 13 }}>Order Type</span>
                            <div style={{ display: 'flex', gap: 4 }}>
                                {(['dine-in', 'takeaway', 'both'] as const).map(t => (
                                    <button key={t} onClick={() => upd('orderType', t)} style={{ ...bo, padding: '4px 12px', fontSize: 11, textTransform: 'capitalize', background: config.orderType === t ? 'rgba(59,130,246,0.1)' : 'transparent', color: config.orderType === t ? '#3B82F6' : 'var(--text-secondary)' }}>{t}</button>
                                ))}
                            </div>
                        </div>
                        <div style={rw}><span style={{ fontSize: 13 }}>Require Phone Number</span><Toggle value={config.requirePhoneNumber} onChange={() => upd('requirePhoneNumber', !config.requirePhoneNumber)} /></div>
                        <div style={rw}><span style={{ fontSize: 13 }}>Queue Number</span><Toggle value={config.queueNumber} onChange={() => upd('queueNumber', !config.queueNumber)} /></div>
                        <div style={rw}><span style={{ fontSize: 13 }}>Print Receipt</span><Toggle value={config.printReceipt} onChange={() => upd('printReceipt', !config.printReceipt)} /></div>
                        <div style={rw}><span style={{ fontSize: 13 }}>Upsell Suggestions</span><Toggle value={config.upsellEnabled} onChange={() => upd('upsellEnabled', !config.upsellEnabled)} /></div>
                    </div>

                    <div style={cd}>
                        <h3 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 6 }}><CreditCard size={16} style={{ color: '#10B981' }} /> Payment</h3>
                        <div style={rw}><span style={{ fontSize: 13 }}>Require Payment Before Send</span><Toggle value={config.requirePayment} onChange={() => upd('requirePayment', !config.requirePayment)} /></div>
                        <div style={{ marginTop: 8 }}><label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>Accepted Methods</label>
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{PAYMENTS.map(p => { const on = config.acceptedPayments.includes(p); return <button key={p} onClick={() => upd('acceptedPayments', on ? config.acceptedPayments.filter(x => x !== p) : [...config.acceptedPayments, p])} style={{ ...bo, padding: '4px 12px', fontSize: 11, background: on ? 'rgba(16,185,129,0.1)' : 'transparent', color: on ? '#10B981' : 'var(--text-secondary)', borderColor: on ? 'rgba(16,185,129,0.3)' : 'var(--border-primary)' }}>{p}</button>; })}</div></div>
                        <div style={{ marginTop: 12 }}><label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Max Order Value (€)</label>
                            <input type="number" style={ip} value={config.maxOrderValue} onChange={e => upd('maxOrderValue', parseInt(e.target.value) || 0)} /></div>
                    </div>
                </div>

                {/* Right Column */}
                <div>
                    <div style={cd}>
                        <h3 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 6 }}><Monitor size={16} style={{ color: '#F59E0B' }} /> Display</h3>
                        <div style={rw}><span style={{ fontSize: 13 }}>Show Product Images</span><Toggle value={config.showImages} onChange={() => upd('showImages', !config.showImages)} /></div>
                        <div style={rw}><span style={{ fontSize: 13 }}>Show Descriptions</span><Toggle value={config.showDescriptions} onChange={() => upd('showDescriptions', !config.showDescriptions)} /></div>
                        <div style={rw}><span style={{ fontSize: 13 }}>Show Calories</span><Toggle value={config.showCalories} onChange={() => upd('showCalories', !config.showCalories)} /></div>
                        <div style={rw}><span style={{ fontSize: 13 }}>Show Allergens</span><Toggle value={config.showAllergens} onChange={() => upd('showAllergens', !config.showAllergens)} /></div>
                    </div>

                    <div style={cd}>
                        <h3 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 6 }}><Palette size={16} style={{ color: '#8B5CF6' }} /> Appearance</h3>
                        <div style={{ marginBottom: 14 }}>
                            <label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Theme</label>
                            <div style={{ display: 'flex', gap: 6 }}>
                                {(['dark', 'light'] as const).map(t => (
                                    <button key={t} onClick={() => upd('theme', t)} style={{ ...bo, padding: '8px 16px', fontSize: 12, textTransform: 'capitalize', background: config.theme === t ? 'rgba(59,130,246,0.1)' : 'transparent', color: config.theme === t ? '#3B82F6' : 'var(--text-secondary)' }}>{t}</button>
                                ))}
                            </div>
                        </div>
                        <div style={{ marginBottom: 14 }}>
                            <label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Accent Color</label>
                            <div style={{ display: 'flex', gap: 6 }}>{['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'].map(c => (<div key={c} onClick={() => upd('accentColor', c)} style={{ width: 28, height: 28, borderRadius: 6, background: c, cursor: 'pointer', border: config.accentColor === c ? '3px solid #fff' : '3px solid transparent' }} />))}</div>
                        </div>
                        <div style={{ marginBottom: 14 }}>
                            <label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Language</label>
                            <div style={{ display: 'flex', gap: 6 }}>
                                {([['en', 'English'], ['mt', 'Maltese'], ['it', 'Italian'], ['multi', 'Multi']] as const).map(([v, l]) => (
                                    <button key={v} onClick={() => upd('language', v)} style={{ ...bo, padding: '4px 12px', fontSize: 11, background: config.language === v ? 'rgba(59,130,246,0.1)' : 'transparent', color: config.language === v ? '#3B82F6' : 'var(--text-secondary)' }}>{l}</button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div style={cd}>
                        <h3 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 6 }}><ShieldCheck size={16} style={{ color: '#EF4444' }} /> Security</h3>
                        <div><label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Inactivity Timeout (seconds)</label>
                            <input type="number" min={10} style={ip} value={config.inactivityTimeout} onChange={e => upd('inactivityTimeout', parseInt(e.target.value) || 60)} /></div>
                    </div>
                </div>
            </div>
        </div></div>
    );
};

export default KioskMode;
