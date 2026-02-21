/**
 * LoyaltyConfig.tsx — K-Series Loyalty Program Configuration
 * Configure points, tiers, rewards, and bonus rules
 * Lightspeed K-Series Back Office > Configuration > Loyalty parity
 */
import React, { useState } from 'react';
import { ArrowLeft, Save, Gift, Crown, Star, Shield, Zap, Award, Settings, TrendingUp, X, Trash2, Plus, ToggleRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import './pos-shared.css';

interface LoyaltyTier { id: string; name: string; icon: string; color: string; minPoints: number; multiplier: number; perks: string[]; }
interface Reward { id: string; name: string; pointsCost: number; type: 'discount' | 'freeItem' | 'upgrade'; value: string; isActive: boolean; }
interface BonusRule { event: string; points: number; active: boolean; }
interface LoyaltyConfigData {
    enabled: boolean; pointsPerEuro: number; autoEnroll: boolean; showOnReceipt: boolean;
    redeemThreshold: number; redeemValue: number; expiryDays: number; referralBonus: number;
    doublePointsDays: string[]; tiers: LoyaltyTier[]; bonusRules: BonusRule[];
}

const TIERS: LoyaltyTier[] = [
    { id: 't1', name: 'Bronze', icon: '🥉', color: '#CD7F32', minPoints: 0, multiplier: 1, perks: ['Earn 1 point per €1 spent'] },
    { id: 't2', name: 'Silver', icon: '🥈', color: '#C0C0C0', minPoints: 500, multiplier: 1.5, perks: ['1.5x points', 'Birthday dessert', 'Priority seating'] },
    { id: 't3', name: 'Gold', icon: '🥇', color: '#FFD700', minPoints: 2000, multiplier: 2, perks: ['2x points', 'Free appetizer/month', 'Exclusive events', 'Priority reservations'] },
    { id: 't4', name: 'Platinum', icon: '💎', color: '#E5E4E2', minPoints: 5000, multiplier: 3, perks: ['3x points', 'Personal concierge', 'Chef table access', 'Annual dinner', 'VIP lounge'] },
];

const REWARDS: Reward[] = [
    { id: 'r1', name: '€5 Off', pointsCost: 100, type: 'discount', value: '€5', isActive: true },
    { id: 'r2', name: '€10 Off', pointsCost: 180, type: 'discount', value: '€10', isActive: true },
    { id: 'r3', name: 'Free Dessert', pointsCost: 150, type: 'freeItem', value: 'Any dessert', isActive: true },
    { id: 'r4', name: 'Free Starter', pointsCost: 200, type: 'freeItem', value: 'Any starter', isActive: true },
    { id: 'r5', name: 'Bottle Upgrade', pointsCost: 300, type: 'upgrade', value: 'House → Premium wine', isActive: true },
    { id: 'r6', name: 'Free Main Course', pointsCost: 500, type: 'freeItem', value: 'Any main up to €25', isActive: true },
    { id: 'r7', name: 'Private Dining', pointsCost: 2000, type: 'upgrade', value: '2-hour private room', isActive: false },
];

const BONUS_RULES: BonusRule[] = [
    { event: 'First order', points: 50, active: true }, { event: 'Referral signup', points: 100, active: true },
    { event: 'Birthday visit', points: 75, active: true }, { event: 'Review on Google', points: 25, active: false },
    { event: 'Order over €50', points: 20, active: true }, { event: 'Weekend brunch', points: 15, active: false },
];

type TabKey = 'settings' | 'tiers' | 'rewards';

const LoyaltyConfig: React.FC = () => {
    const navigate = useNavigate();
    const [tab, setTab] = useState<TabKey>('settings');
    const [config, setConfig] = useState<LoyaltyConfigData>({
        enabled: true, pointsPerEuro: 10, autoEnroll: true, showOnReceipt: true,
        redeemThreshold: 100, redeemValue: 5, expiryDays: 365, referralBonus: 100,
        doublePointsDays: ['Saturday', 'Sunday'], tiers: TIERS, bonusRules: BONUS_RULES,
    });
    const [rewards, setRewards] = useState(REWARDS);
    const [editReward, setEditReward] = useState<Reward | null>(null);

    const upd = <K extends keyof LoyaltyConfigData>(k: K, v: LoyaltyConfigData[K]) => setConfig(p => ({ ...p, [k]: v }));

    /* Setting Row helper */
    const SettingRow: React.FC<{ label: string; desc?: string; children: React.ReactNode }> = ({ label, desc, children }) => (
        <div className="pos-setting-row">
            <div className="pos-setting-row__label"><div className="pos-setting-row__title">{label}</div>{desc && <div className="pos-setting-row__desc">{desc}</div>}</div>
            <div className="pos-setting-row__control">{children}</div>
        </div>
    );

    /* Toggle */
    const Toggle: React.FC<{ value: boolean; onChange: () => void }> = ({ value, onChange }) => (
        <div onClick={onChange} style={{ width: 42, height: 24, borderRadius: 12, background: value ? '#3B82F6' : 'var(--border-primary,#27272a)', cursor: 'pointer', position: 'relative', transition: 'background 0.2s' }}> /* keep-inline */ /* keep-inline */
            <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, left: value ? 21 : 3, transition: 'left 0.2s' }} />
        </div>
    );

    return (
        <div className="pos-page"><div className="pos-container pos-container--900">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}> /* keep-inline */ /* keep-inline */
                <div>
                    <button onClick={() => navigate(-1)} className="pos-btn pos-btn--outline" style={{ marginBottom: 8, padding: '6px 14px', fontSize: 12 }}><ArrowLeft size={14} /> Back</button> /* keep-inline */ /* keep-inline */
                    <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Loyalty Program</h1> /* keep-inline */ /* keep-inline */
                    <p style={{ fontSize: 13, color: 'var(--text-secondary,#a1a1aa)', margin: '4px 0 0' }}>{config.enabled ? '✅ Active' : '⏸ Paused'} · {config.tiers.length} tiers · {rewards.filter(r => r.isActive).length} rewards</p> /* keep-inline */ /* keep-inline */
                </div>
                <button className="pos-btn pos-btn--primary" onClick={() => toast.success('Configuration saved')}><Save size={14} /> Save All</button>
            </div>

            {/* Tabs */}
            <div className="pos-tab-group" style={{ marginBottom: 20 }}> /* keep-inline */ /* keep-inline */
                {([['settings', '⚙️ Settings'], ['tiers', '👑 Tiers'], ['rewards', '🎁 Rewards']] as [TabKey, string][]).map(([k, l]) => (
                    <button key={k} onClick={() => setTab(k)} className={`pos-tab-btn${tab === k ? ' pos-tab-btn--active' : ''}`}>{l}</button>
                ))}
            </div>

            {/* Settings Tab */}
            {tab === 'settings' && <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}> /* keep-inline */ /* keep-inline */
                <div className="pos-card">
                    <h3 className="pos-section-title">General</h3>
                    <SettingRow label="Enable Loyalty" desc="Turn the loyalty program on/off"><Toggle value={config.enabled} onChange={() => upd('enabled', !config.enabled)} /></SettingRow>
                    <SettingRow label="Points Per Euro" desc="Points earned per €1 spent">
                        <input type="number" min={1} className="pos-input" style={{ width: 80, textAlign: 'center' }} value={config.pointsPerEuro} onChange={e = aria-label="Input field"> upd('pointsPerEuro', parseInt(e.target.value) || 1)} /></SettingRow> /* keep-inline */ /* keep-inline */
                    <SettingRow label="Auto-Enroll" desc="New customers auto-join"><Toggle value={config.autoEnroll} onChange={() => upd('autoEnroll', !config.autoEnroll)} /></SettingRow>
                    <SettingRow label="Show on Receipt" desc="Print loyalty status on receipt"><Toggle value={config.showOnReceipt} onChange={() => upd('showOnReceipt', !config.showOnReceipt)} /></SettingRow>
                </div>
                <div className="pos-card">
                    <h3 className="pos-section-title">Redemption</h3>
                    <SettingRow label="Min Points to Redeem" desc="Minimum points before redemption">
                        <input type="number" min={1} className="pos-input" style={{ width: 80, textAlign: 'center' }} value={config.redeemThreshold} onChange={e = aria-label="Input field"> upd('redeemThreshold', parseInt(e.target.value) || 1)} /></SettingRow> /* keep-inline */ /* keep-inline */
                    <SettingRow label="Redemption Value (€)" desc="Euro value per redemption unit">
                        <input type="number" min={1} className="pos-input" style={{ width: 80, textAlign: 'center' }} value={config.redeemValue} onChange={e = aria-label="Input field"> upd('redeemValue', parseInt(e.target.value) || 1)} /></SettingRow> /* keep-inline */ /* keep-inline */
                    <SettingRow label="Points Expiry (Days)" desc="Days before points expire">
                        <input type="number" min={0} className="pos-input" style={{ width: 80, textAlign: 'center' }} value={config.expiryDays} onChange={e = aria-label="Input field"> upd('expiryDays', parseInt(e.target.value) || 0)} /></SettingRow> /* keep-inline */ /* keep-inline */
                    <SettingRow label="Referral Bonus" desc="Points for successful referral">
                        <input type="number" min={0} className="pos-input" style={{ width: 80, textAlign: 'center' }} value={config.referralBonus} onChange={e = aria-label="Input field"> upd('referralBonus', parseInt(e.target.value) || 0)} /></SettingRow> /* keep-inline */ /* keep-inline */
                </div>
                <div className="pos-card">
                    <h3 className="pos-section-title">Double Points Days</h3>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}> /* keep-inline */ /* keep-inline */
                        {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                            <button key={day} onClick={() => upd('doublePointsDays', config.doublePointsDays.includes(day) ? config.doublePointsDays.filter(d => d !== day) : [...config.doublePointsDays, day])}
                                className={`pos-radio-option${config.doublePointsDays.includes(day) ? ' pos-radio-option--active' : ''}`} style={{ fontSize: 12, padding: '6px 12px' }}> /* keep-inline */ /* keep-inline */
                                {day.slice(0, 3)}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="pos-card">
                    <h3 className="pos-section-title">Bonus Rules</h3>
                    {config.bonusRules.map((rule, i) => (
                        <SettingRow key={i} label={rule.event} desc={`+${rule.points} points`}>
                            <Toggle value={rule.active} onChange={() => {
                                const updated = [...config.bonusRules]; updated[i] = { ...updated[i], active: !updated[i].active }; upd('bonusRules', updated);
                            }} />
                        </SettingRow>
                    ))}
                </div>
            </div>}

            {/* Tiers Tab */}
            {tab === 'tiers' && <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 12 }}> /* keep-inline */ /* keep-inline */
                {config.tiers.map(tier => (
                    <div key={tier.id} className="pos-card" style={{ padding: 20, borderTop: `3px solid ${tier.color}` }}> /* keep-inline */ /* keep-inline */
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}> /* keep-inline */ /* keep-inline */
                            <span style={{ fontSize: 24 }}>{tier.icon}</span> /* keep-inline */ /* keep-inline */
                            <div><div style={{ fontSize: 16, fontWeight: 700 }}>{tier.name}</div> /* keep-inline */ /* keep-inline */
                                <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{tier.minPoints.toLocaleString()}+ pts</div></div> /* keep-inline */ /* keep-inline */
                        </div>
                        <div style={{ display: 'inline-block', padding: '3px 8px', borderRadius: 4, background: `${tier.color}20`, color: tier.color, fontSize: 11, fontWeight: 600, marginBottom: 10 }}>{tier.multiplier}x Points</div> /* keep-inline */ /* keep-inline */
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}> /* keep-inline */ /* keep-inline */
                            {tier.perks.map((p, j) => <div key={j} style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}><Star size={10} style={{ color: tier.color }} />{p}</div>)} /* keep-inline */ /* keep-inline */
                        </div>
                    </div>
                ))}
            </div>}

            {/* Rewards Tab */}
            {tab === 'rewards' && <>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}> /* keep-inline */ /* keep-inline */
                    <button className="pos-btn pos-btn--primary" style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => setEditReward({ id: crypto.randomUUID(), name: '', pointsCost: 100, type: 'discount', value: '', isActive: true })}><Plus size={14} /> Add Reward</button> /* keep-inline */ /* keep-inline */
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 12 }}> /* keep-inline */ /* keep-inline */
                    {rewards.map(reward => (
                        <div key={reward.id} className="pos-card" style={{ cursor: 'pointer', opacity: reward.isActive ? 1 : 0.5, padding: 16 }} onClick={() => setEditReward({ ...reward })}> /* keep-inline */ /* keep-inline */
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}> /* keep-inline */ /* keep-inline */
                                <div style={{ width: 36, height: 36, borderRadius: 8, background: reward.type === 'discount' ? 'rgba(59,130,246,0.15)' : reward.type === 'freeItem' ? 'rgba(16,185,129,0.15)' : 'rgba(139,92,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: reward.type === 'discount' ? '#3B82F6' : reward.type === 'freeItem' ? '#10B981' : '#8B5CF6' }}> /* keep-inline */ /* keep-inline */
                                    {reward.type === 'discount' ? <span style={{ fontSize: 14 }}>€</span> : reward.type === 'freeItem' ? <Gift size={16} /> : <Crown size={16} />} /* keep-inline */ /* keep-inline */
                                </div>
                                <div><div style={{ fontSize: 14, fontWeight: 600 }}>{reward.name}</div> /* keep-inline */ /* keep-inline */
                                    <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{reward.value}</div></div> /* keep-inline */ /* keep-inline */
                            </div>
                            <div style={{ fontSize: 16, fontWeight: 700, color: '#F59E0B' }}>{reward.pointsCost} <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-secondary)' }}>points</span></div> /* keep-inline */ /* keep-inline */
                        </div>
                    ))}
                </div>
            </>}
        </div>

            {/* Edit Reward Modal */}
            {editReward && <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setEditReward(null)}> /* keep-inline */ /* keep-inline */
                <div className="pos-card" style={{ width: 480 }} onClick={e => e.stopPropagation()}> /* keep-inline */ /* keep-inline */
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}> /* keep-inline */ /* keep-inline */
                        <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{rewards.find(r => r.id === editReward.id) ? 'Edit' : 'New'} Reward</h3> /* keep-inline */ /* keep-inline */
                        <button style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }} onClick={() => setEditReward(null)}><X size={20} /></button> /* keep-inline */ /* keep-inline */
                    </div>
                    <div style={{ marginBottom: 14 }}><label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Name</label> /* keep-inline */ /* keep-inline */
                        <input className="pos-input" value={editReward.name} onChange={e = aria-label="Input field"> setEditReward(p => p ? { ...p, name: e.target.value } : null)} /></div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}> /* keep-inline */ /* keep-inline */
                        <div><label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Type</label> /* keep-inline */ /* keep-inline */
                            <div style={{ display: 'flex', gap: 4 }}>{(['discount', 'freeItem', 'upgrade'] as const).map(t => ( /* keep-inline */ /* keep-inline */
                                <button key={t} onClick={() => setEditReward(p => p ? { ...p, type: t } : null)} className={`pos-radio-option${editReward.type === t ? ' pos-radio-option--active' : ''}`} style={{ flex: 1, textAlign: 'center', fontSize: 11, padding: '6px 4px' }}> /* keep-inline */ /* keep-inline */
                                    {t === 'discount' ? '€ Off' : t === 'freeItem' ? 'Free' : 'Upgrade'}
                                </button>
                            ))}</div></div>
                        <div><label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Points Cost</label> /* keep-inline */ /* keep-inline */
                            <input type="number" min={1} className="pos-input" value={editReward.pointsCost} onChange={e = aria-label="Input field"> setEditReward(p => p ? { ...p, pointsCost: parseInt(e.target.value) || 1 } : null)} /></div>
                    </div>
                    <div style={{ marginBottom: 14 }}><label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Value / Description</label> /* keep-inline */ /* keep-inline */
                        <input className="pos-input" value={editReward.value} onChange={e = aria-label="Input field"> setEditReward(p => p ? { ...p, value: e.target.value } : null)} /></div>
                    <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}> /* keep-inline */ /* keep-inline */
                        <Toggle value={editReward.isActive} onChange={() => setEditReward(p => p ? { ...p, isActive: !p.isActive } : null)} />
                        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Active</span> /* keep-inline */ /* keep-inline */
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}> /* keep-inline */ /* keep-inline */
                        <button className="pos-btn pos-btn--primary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => { /* keep-inline */ /* keep-inline */
                            if (rewards.find(r => r.id === editReward.id)) setRewards(p => p.map(r => r.id === editReward.id ? editReward : r));
                            else setRewards(p => [...p, editReward]);
                            setEditReward(null); toast.success('Reward saved');
                        }}><Save size={14} /> Save</button>
                        {rewards.find(r => r.id === editReward.id) && <button className="pos-btn pos-btn--outline" style={{ color: '#EF4444' }} onClick={() => { setRewards(p => p.filter(r => r.id !== editReward.id)); setEditReward(null); toast.success('Reward deleted'); }}><Trash2 size={14} /></button>} /* keep-inline */ /* keep-inline */
                        <button className="pos-btn pos-btn--outline" onClick={() => setEditReward(null)}>Cancel</button>
                    </div>
                </div>
            </div>}
        </div>
    );
};

export default LoyaltyConfig;
