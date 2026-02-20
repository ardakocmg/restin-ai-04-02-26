/**
 * CustomerDisplayBO.tsx — K-Series Customer Display Config (Back Office)
 * Configure the customer-facing display settings
 * Lightspeed K-Series Back Office > Hardware > Customer Display parity
 */
import React, { useState } from 'react';
import { ArrowLeft, Save, Monitor, Image, Palette, Type, Eye } from 'lucide-react';
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
        <div style={pg}><div style={ct}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                <div>
                    <button onClick={() => navigate(-1)} style={{ ...bo, marginBottom: 8, padding: '6px 14px', fontSize: 12 }}><ArrowLeft size={14} /> Back</button>
                    <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Customer Display</h1>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary,#a1a1aa)', margin: '4px 0 0' }}>Configure the customer-facing screen shown during ordering</p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button style={bo} onClick={() => window.open('/pos/customer-display', '_blank')}><Eye size={14} /> Preview</button>
                    <button style={bp} onClick={() => toast.success('Settings saved')}><Save size={16} /> Save</button>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                    {/* General */}
                    <div style={cd}>
                        <h3 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 6 }}><Monitor size={16} style={{ color: '#3B82F6' }} /> General</h3>
                        <div style={rw}><span style={{ fontSize: 13 }}>Enable Customer Display</span><Toggle value={config.enabled} onChange={() => upd('enabled', !config.enabled)} /></div>
                        <div style={rw}><span style={{ fontSize: 13 }}>Show Logo</span><Toggle value={config.showLogo} onChange={() => upd('showLogo', !config.showLogo)} /></div>
                        <div style={rw}><span style={{ fontSize: 13 }}>Show Items As Added</span><Toggle value={config.showItemsAsAdded} onChange={() => upd('showItemsAsAdded', !config.showItemsAsAdded)} /></div>
                        <div style={rw}><span style={{ fontSize: 13 }}>Show Running Total</span><Toggle value={config.showRunningTotal} onChange={() => upd('showRunningTotal', !config.showRunningTotal)} /></div>
                        <div style={rw}><span style={{ fontSize: 13 }}>Show Tax Breakdown</span><Toggle value={config.showTaxBreakdown} onChange={() => upd('showTaxBreakdown', !config.showTaxBreakdown)} /></div>
                    </div>

                    {/* Tipping */}
                    <div style={cd}>
                        <h3 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 6 }}>💰 Tipping</h3>
                        <div style={rw}><span style={{ fontSize: 13 }}>Show Tip Prompt</span><Toggle value={config.showTipPrompt} onChange={() => upd('showTipPrompt', !config.showTipPrompt)} /></div>
                        {config.showTipPrompt && <div style={{ marginTop: 8 }}>
                            <label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Tip Percentages (comma-separated)</label>
                            <input style={ip} value={config.tipPercentages.join(', ')} onChange={e => upd('tipPercentages', e.target.value.split(',').map(v => parseInt(v.trim())).filter(Boolean))} />
                        </div>}
                    </div>

                    {/* Idle Screen */}
                    <div style={cd}>
                        <h3 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 6 }}><Image size={16} style={{ color: '#10B981' }} /> Idle Screen</h3>
                        <div style={rw}><span style={{ fontSize: 13 }}>Enable Slideshow</span><Toggle value={config.idleSlideshow} onChange={() => upd('idleSlideshow', !config.idleSlideshow)} /></div>
                        {config.idleSlideshow && <div style={{ marginTop: 8 }}>
                            <label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Slide Interval (seconds)</label>
                            <input type="number" min={2} max={30} style={ip} value={config.slideshowInterval} onChange={e => upd('slideshowInterval', parseInt(e.target.value) || 5)} />
                        </div>}
                    </div>
                </div>

                <div>
                    {/* Appearance */}
                    <div style={cd}>
                        <h3 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 6 }}><Palette size={16} style={{ color: '#8B5CF6' }} /> Appearance</h3>
                        <div style={{ marginBottom: 14 }}>
                            <label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Theme</label>
                            <div style={{ display: 'flex', gap: 6 }}>
                                {(['dark', 'light', 'branded'] as const).map(t => (
                                    <button key={t} onClick={() => upd('theme', t)} style={{ ...bo, padding: '8px 16px', fontSize: 12, textTransform: 'capitalize', background: config.theme === t ? 'rgba(59,130,246,0.1)' : 'transparent', color: config.theme === t ? '#3B82F6' : 'var(--text-secondary)', borderColor: config.theme === t ? 'rgba(59,130,246,0.3)' : 'var(--border-primary)' }}>{t}</button>
                                ))}
                            </div>
                        </div>
                        <div style={{ marginBottom: 14 }}>
                            <label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Accent Color</label>
                            <div style={{ display: 'flex', gap: 6 }}>
                                {['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'].map(c => (
                                    <div key={c} onClick={() => upd('accentColor', c)} style={{ width: 28, height: 28, borderRadius: 6, background: c, cursor: 'pointer', border: config.accentColor === c ? '3px solid #fff' : '3px solid transparent' }} />
                                ))}
                            </div>
                        </div>
                        <div>
                            <label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Font Size</label>
                            <div style={{ display: 'flex', gap: 6 }}>
                                {(['small', 'medium', 'large'] as const).map(s => (
                                    <button key={s} onClick={() => upd('fontSize', s)} style={{ ...bo, padding: '8px 16px', fontSize: 12, textTransform: 'capitalize', background: config.fontSize === s ? 'rgba(59,130,246,0.1)' : 'transparent', color: config.fontSize === s ? '#3B82F6' : 'var(--text-secondary)' }}>{s}</button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Messages */}
                    <div style={cd}>
                        <h3 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 6 }}><Type size={16} style={{ color: '#F59E0B' }} /> Messages</h3>
                        <div style={{ marginBottom: 14 }}>
                            <label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Welcome Message</label>
                            <input style={ip} value={config.welcomeMessage} onChange={e => upd('welcomeMessage', e.target.value)} />
                        </div>
                        <div>
                            <label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Thank You Message</label>
                            <input style={ip} value={config.thankYouMessage} onChange={e => upd('thankYouMessage', e.target.value)} />
                        </div>
                    </div>

                    {/* Preview */}
                    <div style={{ ...cd, background: '#000', border: '2px solid #27272a', overflow: 'hidden' }}>
                        <div style={{ padding: 20, textAlign: 'center', minHeight: 200, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 12 }}>
                            <div style={{ fontSize: 12, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 1 }}>Live Preview</div>
                            <div style={{ fontSize: 16, fontWeight: 600, color: config.accentColor }}>{config.welcomeMessage}</div>
                            <div style={{ width: '80%', borderTop: '1px solid rgba(255,255,255,0.1)', margin: '8px 0' }} />
                            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Order items will appear here...</div>
                            <div style={{ fontSize: 24, fontWeight: 700, color: '#fff', marginTop: 8 }}>€0.00</div>
                        </div>
                    </div>
                </div>
            </div>
        </div></div>
    );
};

export default CustomerDisplayBO;
