/**
 * KioskMode.tsx — K-Series Self-Service Kiosk Configuration
 * Configure kiosk mode for self-ordering terminals
 * Lightspeed K-Series Back Office > Hardware > Kiosk parity
 */
import React, { useState } from 'react';
import { ArrowLeft, Save, Monitor, Eye, Palette, CreditCard, ShieldCheck, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import './pos-shared.css';

const Toggle: React.FC<{ value: boolean; onChange: () => void }> = ({ value, onChange }) => (
    <div className={`pos-toggle-track ${value ? 'pos-toggle-track--on' : 'pos-toggle-track--off'}`} onClick={onChange}>
        <div className={`pos-toggle-thumb ${value ? 'pos-toggle-thumb--on' : 'pos-toggle-thumb--off'}`} />
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
        <div className="pos-page"><div className="pos-container">
            <div className="pos-header">
                <div>
                    <button onClick={() => navigate(-1)} className="pos-btn-outline pos-btn-back"><ArrowLeft size={14} /> Back</button>
                    <h1 className="pos-title">Kiosk Mode</h1>
                    <p className="pos-subtitle">Configure self-service ordering terminals</p>
                </div>
                <div className="pos-flex pos-gap-8">
                    <button className="pos-btn-outline" onClick={() => toast.info('Launch kiosk preview...')}><Eye size={14} /> Preview</button>
                    <button className="pos-btn-primary" onClick={() => toast.success('Kiosk settings saved')}><Save size={16} /> Save</button>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}> /* keep-inline */ /* keep-inline */
                {/* Left Column */}
                <div>
                    <div className="pos-card">
                        <h3 className="pos-card-title pos-flex pos-flex--center pos-gap-6"><Settings size={16} style={{ color: '#3B82F6' }} /> General</h3> /* keep-inline */ /* keep-inline */
                        <div className="pos-setting-row"><span className="pos-cell-value">Enable Kiosk Mode</span><Toggle value={config.enabled} onChange={() => upd('enabled', !config.enabled)} /></div>
                        <div className="pos-setting-row">
                            <span className="pos-cell-value">Order Type</span>
                            <div className="pos-flex pos-gap-4">
                                {(['dine-in', 'takeaway', 'both'] as const).map(t => (
                                    <button key={t} onClick={() => upd('orderType', t)} className={`pos-btn-outline ${config.orderType === t ? 'pos-toggle-btn--active' : ''}`} style={{ padding: '4px 12px', fontSize: 11, textTransform: 'capitalize' }}>{t}</button> /* keep-inline */ /* keep-inline */
                                ))}
                            </div>
                        </div>
                        <div className="pos-setting-row"><span className="pos-cell-value">Require Phone Number</span><Toggle value={config.requirePhoneNumber} onChange={() => upd('requirePhoneNumber', !config.requirePhoneNumber)} /></div>
                        <div className="pos-setting-row"><span className="pos-cell-value">Queue Number</span><Toggle value={config.queueNumber} onChange={() => upd('queueNumber', !config.queueNumber)} /></div>
                        <div className="pos-setting-row"><span className="pos-cell-value">Print Receipt</span><Toggle value={config.printReceipt} onChange={() => upd('printReceipt', !config.printReceipt)} /></div>
                        <div className="pos-setting-row"><span className="pos-cell-value">Upsell Suggestions</span><Toggle value={config.upsellEnabled} onChange={() => upd('upsellEnabled', !config.upsellEnabled)} /></div>
                    </div>

                    <div className="pos-card">
                        <h3 className="pos-card-title pos-flex pos-flex--center pos-gap-6"><CreditCard size={16} style={{ color: '#10B981' }} /> Payment</h3> /* keep-inline */ /* keep-inline */
                        <div className="pos-setting-row"><span className="pos-cell-value">Require Payment Before Send</span><Toggle value={config.requirePayment} onChange={() => upd('requirePayment', !config.requirePayment)} /></div>
                        <div className="pos-form-group" style={{ marginTop: 8 }}><label className="pos-form-label">Accepted Methods</label> /* keep-inline */ /* keep-inline */
                            <div className="pos-flex pos-gap-6 pos-flex--wrap">{PAYMENTS.map(p => { const on = config.acceptedPayments.includes(p); return <button key={p} onClick={() => upd('acceptedPayments', on ? config.acceptedPayments.filter(x => x !== p) : [...config.acceptedPayments, p])} className={`pos-btn-outline ${on ? 'pos-badge--green' : ''}`} style={{ padding: '4px 12px', fontSize: 11, background: on ? 'rgba(16,185,129,0.1)' : undefined, color: on ? '#10B981' : undefined, borderColor: on ? 'rgba(16,185,129,0.3)' : undefined }}>{p}</button>; })}</div></div> /* keep-inline */ /* keep-inline */
                        <div className="pos-form-group" style={{ marginTop: 12 }}><label className="pos-form-label">Max Order Value (€)</label> /* keep-inline */ /* keep-inline */
                            <input type="number" className="pos-input" value={config.maxOrderValue} onChange={e = aria-label="Input field"> upd('maxOrderValue', parseInt(e.target.value) || 0)} /></div>
                    </div>
                </div>

                {/* Right Column */}
                <div>
                    <div className="pos-card">
                        <h3 className="pos-card-title pos-flex pos-flex--center pos-gap-6"><Monitor size={16} style={{ color: '#F59E0B' }} /> Display</h3> /* keep-inline */ /* keep-inline */
                        <div className="pos-setting-row"><span className="pos-cell-value">Show Product Images</span><Toggle value={config.showImages} onChange={() => upd('showImages', !config.showImages)} /></div>
                        <div className="pos-setting-row"><span className="pos-cell-value">Show Descriptions</span><Toggle value={config.showDescriptions} onChange={() => upd('showDescriptions', !config.showDescriptions)} /></div>
                        <div className="pos-setting-row"><span className="pos-cell-value">Show Calories</span><Toggle value={config.showCalories} onChange={() => upd('showCalories', !config.showCalories)} /></div>
                        <div className="pos-setting-row"><span className="pos-cell-value">Show Allergens</span><Toggle value={config.showAllergens} onChange={() => upd('showAllergens', !config.showAllergens)} /></div>
                    </div>

                    <div className="pos-card">
                        <h3 className="pos-card-title pos-flex pos-flex--center pos-gap-6"><Palette size={16} style={{ color: '#8B5CF6' }} /> Appearance</h3> /* keep-inline */ /* keep-inline */
                        <div className="pos-form-group" style={{ marginBottom: 14 }}> /* keep-inline */ /* keep-inline */
                            <label className="pos-form-label">Theme</label>
                            <div className="pos-flex pos-gap-6">
                                {(['dark', 'light'] as const).map(t => (
                                    <button key={t} onClick={() => upd('theme', t)} className={`pos-btn-outline ${config.theme === t ? 'pos-toggle-btn--active' : ''}`} style={{ padding: '8px 16px', fontSize: 12, textTransform: 'capitalize' }}>{t}</button> /* keep-inline */ /* keep-inline */
                                ))}
                            </div>
                        </div>
                        <div className="pos-form-group" style={{ marginBottom: 14 }}> /* keep-inline */ /* keep-inline */
                            <label className="pos-form-label">Accent Color</label>
                            <div className="pos-flex pos-gap-6">{['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'].map(c => (<div key={c} onClick={() => upd('accentColor', c)} style={{ width: 28, height: 28, borderRadius: 6, background: c, cursor: 'pointer', border: config.accentColor === c ? '3px solid #fff' : '3px solid transparent' }} />))}</div> /* keep-inline */ /* keep-inline */
                        </div>
                        <div className="pos-form-group">
                            <label className="pos-form-label">Language</label>
                            <div className="pos-flex pos-gap-6">
                                {([['en', 'English'], ['mt', 'Maltese'], ['it', 'Italian'], ['multi', 'Multi']] as const).map(([v, l]) => (
                                    <button key={v} onClick={() => upd('language', v)} className={`pos-btn-outline ${config.language === v ? 'pos-toggle-btn--active' : ''}`} style={{ padding: '4px 12px', fontSize: 11 }}>{l}</button> /* keep-inline */ /* keep-inline */
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="pos-card">
                        <h3 className="pos-card-title pos-flex pos-flex--center pos-gap-6"><ShieldCheck size={16} style={{ color: '#EF4444' }} /> Security</h3> /* keep-inline */ /* keep-inline */
                        <div className="pos-form-group"><label className="pos-form-label">Inactivity Timeout (seconds)</label>
                            <input type="number" min={10} className="pos-input" value={config.inactivityTimeout} onChange={e = aria-label="Input field"> upd('inactivityTimeout', parseInt(e.target.value) || 60)} /></div>
                    </div>
                </div>
            </div>
        </div></div>
    );
};

export default KioskMode;
