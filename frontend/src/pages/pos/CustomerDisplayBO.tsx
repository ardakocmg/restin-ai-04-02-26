/**
 * CustomerDisplayBO.tsx — K-Series Customer Display Config (Back Office)
 * Configure the customer-facing display settings
 * Lightspeed K-Series Back Office > Hardware > Customer Display parity
 */
import React, { useState } from 'react';
import { ArrowLeft, Save, Monitor, Image, Palette, Type, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import './pos-shared.css';

const Toggle: React.FC<{ value: boolean; onChange: () => void }> = ({ value, onChange }) => (
    <div className={`pos-toggle-track ${value ? 'pos-toggle-track--on' : 'pos-toggle-track--off'}`} onClick={onChange}>
        <div className={`pos-toggle-thumb ${value ? 'pos-toggle-thumb--on' : 'pos-toggle-thumb--off'}`} />
    </div>
);

interface DisplayConfig {
    enabled: boolean; showLogo: boolean; showItemsAsAdded: boolean; showRunningTotal: boolean; showTaxBreakdown: boolean;
    showTipPrompt: boolean; tipPercentages: number[]; idleSlideshow: boolean; slideshowInterval: number;
    theme: 'dark' | 'light' | 'branded'; accentColor: string; fontSize: 'small' | 'medium' | 'large';
    welcomeMessage: string; thankYouMessage: string;
}

const CustomerDisplayBO: React.FC = () => {
    const navigate = useNavigate();
    const [config, setConfig] = useState<DisplayConfig>({
        enabled: true, showLogo: true, showItemsAsAdded: true, showRunningTotal: true, showTaxBreakdown: true,
        showTipPrompt: true, tipPercentages: [10, 15, 20], idleSlideshow: true, slideshowInterval: 5,
        theme: 'dark', accentColor: '#3B82F6', fontSize: 'medium',
        welcomeMessage: 'Welcome to Restin Restaurant', thankYouMessage: 'Thank you for dining with us!',
    });
    const upd = (field: string, val: unknown) => setConfig(prev => ({ ...prev, [field]: val }));

    return (
        <div className="pos-page"><div className="pos-container">
            <div className="pos-header">
                <div>
                    <button onClick={() => navigate(-1)} className="pos-btn-outline pos-btn-back"><ArrowLeft size={14} /> Back</button>
                    <h1 className="pos-title">Customer Display</h1>
                    <p className="pos-subtitle">Configure the customer-facing screen shown during ordering</p>
                </div>
                <div className="pos-flex pos-gap-8">
                    <button className="pos-btn-outline" onClick={() => window.open('/pos/customer-display', '_blank')}><Eye size={14} /> Preview</button>
                    <button className="pos-btn-primary" onClick={() => toast.success('Settings saved')}><Save size={16} /> Save</button>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}> /* keep-inline */
                <div>
                    {/* General */}
                    <div className="pos-card">
                        <h3 className="pos-card-title pos-flex pos-flex--center pos-gap-6"><Monitor size={16} style={{ color: '#3B82F6' }} /> General</h3> /* keep-inline */
                        <div className="pos-setting-row"><span className="pos-cell-value">Enable Customer Display</span><Toggle value={config.enabled} onChange={() => upd('enabled', !config.enabled)} /></div>
                        <div className="pos-setting-row"><span className="pos-cell-value">Show Logo</span><Toggle value={config.showLogo} onChange={() => upd('showLogo', !config.showLogo)} /></div>
                        <div className="pos-setting-row"><span className="pos-cell-value">Show Items As Added</span><Toggle value={config.showItemsAsAdded} onChange={() => upd('showItemsAsAdded', !config.showItemsAsAdded)} /></div>
                        <div className="pos-setting-row"><span className="pos-cell-value">Show Running Total</span><Toggle value={config.showRunningTotal} onChange={() => upd('showRunningTotal', !config.showRunningTotal)} /></div>
                        <div className="pos-setting-row"><span className="pos-cell-value">Show Tax Breakdown</span><Toggle value={config.showTaxBreakdown} onChange={() => upd('showTaxBreakdown', !config.showTaxBreakdown)} /></div>
                    </div>

                    {/* Tipping */}
                    <div className="pos-card">
                        <h3 className="pos-card-title pos-flex pos-flex--center pos-gap-6">💰 Tipping</h3>
                        <div className="pos-setting-row"><span className="pos-cell-value">Show Tip Prompt</span><Toggle value={config.showTipPrompt} onChange={() => upd('showTipPrompt', !config.showTipPrompt)} /></div>
                        {config.showTipPrompt && <div className="pos-form-group" style={{ marginTop: 8 }}> /* keep-inline */
                            <label className="pos-form-label">Tip Percentages (comma-separated)</label>
                            <input className="pos-input" value={config.tipPercentages.join(', ')} onChange={e => upd('tipPercentages', e.target.value.split(',').map(v => parseInt(v.trim())).filter(Boolean))} />
                        </div>}
                    </div>

                    {/* Idle Screen */}
                    <div className="pos-card">
                        <h3 className="pos-card-title pos-flex pos-flex--center pos-gap-6"><Image size={16} style={{ color: '#10B981' }} /> Idle Screen</h3> /* keep-inline */
                        <div className="pos-setting-row"><span className="pos-cell-value">Enable Slideshow</span><Toggle value={config.idleSlideshow} onChange={() => upd('idleSlideshow', !config.idleSlideshow)} /></div>
                        {config.idleSlideshow && <div className="pos-form-group" style={{ marginTop: 8 }}> /* keep-inline */
                            <label className="pos-form-label">Slide Interval (seconds)</label>
                            <input type="number" min={2} max={30} className="pos-input" value={config.slideshowInterval} onChange={e => upd('slideshowInterval', parseInt(e.target.value) || 5)} />
                        </div>}
                    </div>
                </div>

                <div>
                    {/* Appearance */}
                    <div className="pos-card">
                        <h3 className="pos-card-title pos-flex pos-flex--center pos-gap-6"><Palette size={16} style={{ color: '#8B5CF6' }} /> Appearance</h3> /* keep-inline */
                        <div className="pos-form-group" style={{ marginBottom: 14 }}> /* keep-inline */
                            <label className="pos-form-label">Theme</label>
                            <div className="pos-flex pos-gap-6">
                                {(['dark', 'light', 'branded'] as const).map(t => (
                                    <button key={t} onClick={() => upd('theme', t)} className={`pos-btn-outline ${config.theme === t ? 'pos-toggle-btn--active' : ''}`} style={{ padding: '8px 16px', fontSize: 12, textTransform: 'capitalize' }}>{t}</button> /* keep-inline */
                                ))}
                            </div>
                        </div>
                        <div className="pos-form-group" style={{ marginBottom: 14 }}> /* keep-inline */
                            <label className="pos-form-label">Accent Color</label>
                            <div className="pos-flex pos-gap-6">
                                {['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'].map(c => (
                                    <div key={c} onClick={() => upd('accentColor', c)} style={{ width: 28, height: 28, borderRadius: 6, background: c, cursor: 'pointer', border: config.accentColor === c ? '3px solid #fff' : '3px solid transparent' }} /> /* keep-inline */
                                ))}
                            </div>
                        </div>
                        <div className="pos-form-group">
                            <label className="pos-form-label">Font Size</label>
                            <div className="pos-flex pos-gap-6">
                                {(['small', 'medium', 'large'] as const).map(s => (
                                    <button key={s} onClick={() => upd('fontSize', s)} className={`pos-btn-outline ${config.fontSize === s ? 'pos-toggle-btn--active' : ''}`} style={{ padding: '8px 16px', fontSize: 12, textTransform: 'capitalize' }}>{s}</button> /* keep-inline */
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Messages */}
                    <div className="pos-card">
                        <h3 className="pos-card-title pos-flex pos-flex--center pos-gap-6"><Type size={16} style={{ color: '#F59E0B' }} /> Messages</h3> /* keep-inline */
                        <div className="pos-form-group" style={{ marginBottom: 14 }}> /* keep-inline */
                            <label className="pos-form-label">Welcome Message</label>
                            <input className="pos-input" value={config.welcomeMessage} onChange={e => upd('welcomeMessage', e.target.value)} />
                        </div>
                        <div className="pos-form-group">
                            <label className="pos-form-label">Thank You Message</label>
                            <input className="pos-input" value={config.thankYouMessage} onChange={e => upd('thankYouMessage', e.target.value)} />
                        </div>
                    </div>

                    {/* Preview */}
                    <div className="pos-card" style={{ background: '#000', border: '2px solid #27272a', overflow: 'hidden' }}> /* keep-inline */
                        <div style={{ padding: 20, textAlign: 'center', minHeight: 200, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 12 }}> /* keep-inline */
                            <div className="pos-text-xs pos-text-secondary" style={{ textTransform: 'uppercase', letterSpacing: 1 }}>Live Preview</div> /* keep-inline */
                            <div style={{ fontSize: 16, fontWeight: 600, color: config.accentColor }}>{config.welcomeMessage}</div> /* keep-inline */
                            <div style={{ width: '80%', borderTop: '1px solid rgba(255,255,255,0.1)', margin: '8px 0' }} /> /* keep-inline */
                            <div className="pos-text-sm pos-text-secondary">Order items will appear here...</div>
                            <div style={{ fontSize: 24, fontWeight: 700, color: '#fff', marginTop: 8 }}>€0.00</div> /* keep-inline */
                        </div>
                    </div>
                </div>
            </div>
        </div></div>
    );
};

export default CustomerDisplayBO;
