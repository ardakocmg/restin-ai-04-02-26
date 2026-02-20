/**
 * LoyaltyConfig.tsx — K-Series Loyalty Program Config (Back Office)
 * Points-based loyalty with rewards and tiers
 * Lightspeed K-Series Back Office > Configuration > Loyalty parity
 */
import React, { useState, useEffect } from 'react';
import { ArrowLeft, Save, Gift, Star, Users, TrendingUp, Award, Wifi, Plus, X, Trash2, Crown, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useVenueConfig } from '../../hooks/shared/useVenueConfig';

interface LoyaltyTier { id: string; name: string; icon: string; color: string; minPoints: number; multiplier: number; perks: string[]; }
interface Reward { id: string; name: string; pointsCost: number; type: 'discount' | 'freeItem' | 'upgrade'; value: string; isActive: boolean; }

// Define the structure for bonus rules
interface BonusRule {
    event: string;
    points: number;
    active: boolean;
}

// Define the structure for the loyalty configuration
interface LoyaltyConfigData {
    enabled: boolean;
    pointsPerEuro: number;
    autoEnroll: boolean;
    showOnReceipt: boolean;
    redeemThreshold: number;
    redeemValue: number;
    expiryDays: number;
    referralBonus: number;
    doublePointsDays: string[];
    tiers: LoyaltyTier[];
    bonusRules: BonusRule[];
}

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

const SEED: LoyaltyConfigData = {
    enabled: true,
    pointsPerEuro: 1,
    autoEnroll: true,
    showOnReceipt: true,
    redeemThreshold: 100,
    redeemValue: 5,
    expiryDays: 365,
    referralBonus: 50,
    doublePointsDays: ['Tuesday', 'Thursday'],
    tiers: TIERS,
    bonusRules: []
};

type TabKey = 'settings' | 'tiers' | 'rewards';

const LoyaltyConfig: React.FC = () => {
    const navigate = useNavigate();
    const [tab, setTab] = useState<TabKey>('settings');
    const [config, setConfig] = useState<LoyaltyConfigData>(SEED);
    const [isLive, setIsLive] = useState(false);

    const venueId = localStorage.getItem('restin_pos_venue') || '';
    const { data: apiData } = useVenueConfig<LoyaltyConfigData>({ venueId, configType: 'loyalty-config' });
    useEffect(() => {
        if (apiData && apiData.length > 0) {
            const c = apiData[0] as any; // Assuming apiData[0] contains the config object
            setConfig({
                enabled: c.enabled ?? true,
                pointsPerEuro: c.pointsPerEuro ?? c.points_per_euro ?? 1,
                autoEnroll: c.autoEnroll ?? c.auto_enroll ?? true,
                showOnReceipt: c.showOnReceipt ?? c.show_on_receipt ?? true,
                redeemThreshold: c.redeemThreshold ?? c.redeem_threshold ?? 100,
                redeemValue: c.redeemValue ?? c.redeem_value ?? 5,
                expiryDays: c.expiryDays ?? c.expiry_days ?? 365,
                referralBonus: c.referralBonus ?? c.referral_bonus ?? 50,
                doublePointsDays: c.doublePointsDays ?? c.double_points_days ?? [],
                tiers: c.tiers || SEED.tiers,
                bonusRules: c.bonusRules ?? c.bonus_rules ?? SEED.bonusRules
            });
            setIsLive(true);
        }
    }, [apiData]);

    const [rewards, setRewards] = useState(REWARDS);
    const [editReward, setEditReward] = useState<Reward | null>(null);

    const saveReward = () => { if (!editReward) return; const e = rewards.find(r => r.id === editReward.id); if (e) setRewards(p => p.map(r => r.id === editReward.id ? editReward : r)); else setRewards(p => [...p, editReward]); setEditReward(null); toast.success('Saved'); };

    return (
        <div style={pg}><div style={ct}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                <div>
                    <button onClick={() => navigate(-1)} style={{ ...bo, marginBottom: 8, padding: '6px 14px', fontSize: 12 }}><ArrowLeft size={14} /> Back</button>
                    <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Loyalty Program {isLive && <Wifi size={14} style={{ color: '#10B981', verticalAlign: 'middle', marginLeft: 6 }} />}</h1>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary,#a1a1aa)', margin: '4px 0 0' }}>Configure points, tiers, and rewards for guest retention</p>
                </div>
                <button style={bp} onClick={() => toast.success('Settings saved')}><Save size={16} /> Save</button>
            </div>

            <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'var(--bg-card,#18181b)', borderRadius: 10, padding: 4, border: '1px solid var(--border-primary,#27272a)', width: 'fit-content' }}>
                {(['settings', 'tiers', 'rewards'] as TabKey[]).map(t => (
                    <button key={t} onClick={() => setTab(t)} style={{ padding: '10px 24px', borderRadius: 8, border: 'none', fontSize: 13, fontWeight: tab === t ? 600 : 400, cursor: 'pointer', background: tab === t ? 'rgba(59,130,246,0.1)' : 'transparent', color: tab === t ? '#3B82F6' : 'var(--text-secondary)', textTransform: 'capitalize' }}>{t === 'settings' ? '⚙️ Settings' : t === 'tiers' ? '👑 Tiers' : '🎁 Rewards'}</button>
                ))}
            </div>

            {tab === 'settings' && <div style={{ maxWidth: 600 }}>
                <div style={cd}>
                    <div style={rw}><span style={{ fontSize: 14, fontWeight: 500 }}>Enable Loyalty Program</span><Toggle value={config.enabled} onChange={() => setConfig(p => ({ ...p, enabled: !p.enabled }))} /></div>
                    <div style={rw}><span style={{ fontSize: 14, fontWeight: 500 }}>Auto-Enroll New Customers</span><Toggle value={config.autoEnroll} onChange={() => setConfig(p => ({ ...p, autoEnroll: !p.autoEnroll }))} /></div>
                    <div style={rw}><span style={{ fontSize: 14, fontWeight: 500 }}>Show Points on Receipt</span><Toggle value={config.showOnReceipt} onChange={() => setConfig(p => ({ ...p, showOnReceipt: !p.showOnReceipt }))} /></div>
                    <div style={{ ...rw, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <span style={{ fontSize: 14, fontWeight: 500 }}>Points per €1 Spent</span>
                        <input type="number" min={1} style={{ ...ip, width: 80, textAlign: 'center' }} value={config.pointsPerEuro} onChange={e => setConfig(p => ({ ...p, pointsPerEuro: parseInt(e.target.value) || 1 }))} aria-label="Points per euro" />
                    </div>
                    <div style={{ ...rw, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <span style={{ fontSize: 14, fontWeight: 500 }}>Referral Bonus (Points)</span>
                        <input type="number" min={0} style={{ ...ip, width: 80, textAlign: 'center' }} value={config.referralBonus} onChange={e => setConfig(p => ({ ...p, referralBonus: parseInt(e.target.value) || 0 }))} aria-label="Referral bonus points" />
                    </div>
                    <div style={{ ...rw, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <span style={{ fontSize: 14, fontWeight: 500 }}>Double Points Days</span>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                            {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                                <button key={day} onClick={() => setConfig(p => ({ ...p, doublePointsDays: p.doublePointsDays.includes(day) ? p.doublePointsDays.filter(d => d !== day) : [...p.doublePointsDays, day] }))} style={{ padding: '4px 10px', borderRadius: 6, fontSize: 11, border: 'none', cursor: 'pointer', background: config.doublePointsDays.includes(day) ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.04)', color: config.doublePointsDays.includes(day) ? '#3B82F6' : 'var(--text-secondary)', fontWeight: config.doublePointsDays.includes(day) ? 600 : 400 }}>{day.slice(0, 3)}</button>
                            ))}
                        </div>
                    </div>
                    <div style={{ ...rw, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <span style={{ fontSize: 14, fontWeight: 500 }}>Points Expiry (days)</span>
                        <input type="number" min={0} style={{ ...ip, width: 80, textAlign: 'center' }} value={config.expiryDays} onChange={e => setConfig(p => ({ ...p, expiryDays: parseInt(e.target.value) || 0 }))} aria-label="Expiry days" />
                    </div>
                    <div style={{ ...rw, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <span style={{ fontSize: 14, fontWeight: 500 }}>Redeem Threshold (min points)</span>
                        <input type="number" min={0} style={{ ...ip, width: 80, textAlign: 'center' }} value={config.redeemThreshold} onChange={e => setConfig(p => ({ ...p, redeemThreshold: parseInt(e.target.value) || 0 }))} aria-label="Redeem threshold" />
                    </div>
                    <div style={{ ...rw, borderBottom: 'none' }}>
                        <span style={{ fontSize: 14, fontWeight: 500 }}>Redeem Value (€ per threshold)</span>
                        <input type="number" min={0} step={0.5} style={{ ...ip, width: 80, textAlign: 'center' }} value={config.redeemValue} onChange={e => setConfig(p => ({ ...p, redeemValue: parseFloat(e.target.value) || 0 }))} aria-label="Redeem value" />
                    </div>
                </div>
            </div>}

            {tab === 'tiers' && <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 16 }}>
                {config.tiers.map((tier: LoyaltyTier) => (
                    <div key={tier.id} style={{ ...cd, borderTop: `3px solid ${tier.color}` }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                            <span style={{ fontSize: 28 }}>{tier.icon}</span>
                            <div><h3 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{tier.name}</h3>
                                <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{tier.minPoints} points to unlock</span></div>
                        </div>
                        <div style={{ fontSize: 20, fontWeight: 700, color: tier.color, marginBottom: 10 }}>{tier.multiplier}x <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-secondary)' }}>points multiplier</span></div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {tier.perks.map((perk, i) => (
                                <div key={i} style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <Zap size={10} style={{ color: tier.color }} /> {perk}
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>}

            {tab === 'rewards' && <>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                    <button style={bp} onClick={() => setEditReward({ id: crypto.randomUUID(), name: '', pointsCost: 100, type: 'discount', value: '', isActive: true })}><Plus size={14} /> Add Reward</button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 12 }}>
                    {rewards.map(reward => (
                        <div key={reward.id} style={{ ...cd, cursor: 'pointer', opacity: reward.isActive ? 1 : 0.5, padding: 16 }} onClick={() => setEditReward({ ...reward })}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                <div style={{ width: 36, height: 36, borderRadius: 8, background: reward.type === 'discount' ? 'rgba(59,130,246,0.15)' : reward.type === 'freeItem' ? 'rgba(16,185,129,0.15)' : 'rgba(139,92,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: reward.type === 'discount' ? '#3B82F6' : reward.type === 'freeItem' ? '#10B981' : '#8B5CF6' }}>
                                    {reward.type === 'discount' ? <></> : reward.type === 'freeItem' ? <Gift size={16} /> : <Crown size={16} />}
                                    {reward.type === 'discount' && <span style={{ fontSize: 14 }}>€</span>}
                                </div>
                                <div><div style={{ fontSize: 14, fontWeight: 600 }}>{reward.name}</div>
                                    <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{reward.value}</div></div>
                            </div>
                            <div style={{ fontSize: 16, fontWeight: 700, color: '#F59E0B' }}>{reward.pointsCost} <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-secondary)' }}>points</span></div>
                        </div>
                    ))}
                </div>
            </>}
        </div>

            {editReward && <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setEditReward(null)}>
                <div style={{ ...cd, width: 480 }} onClick={e => e.stopPropagation()}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                        <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{rewards.find(r => r.id === editReward.id) ? 'Edit' : 'New'} Reward</h3>
                        <button style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }} onClick={() => setEditReward(null)}><X size={20} /></button>
                    </div>
                    <div style={{ marginBottom: 14 }}><label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Name *</label>
                        <input style={ip} value={editReward.name} onChange={e => setEditReward(p => p ? { ...p, name: e.target.value } : null)} /></div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                        <div><label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Type</label>
                            <select style={{ ...ip, cursor: 'pointer' }} value={editReward.type} onChange={e => setEditReward(p => p ? { ...p, type: e.target.value as Reward['type'] } : null)} aria-label="Type"><option value="discount">Discount</option><option value="freeItem">Free Item</option><option value="upgrade">Upgrade</option></select></div>
                        <div><label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Points Cost</label>
                            <input type="number" min={1} style={ip} value={editReward.pointsCost} onChange={e => setEditReward(p => p ? { ...p, pointsCost: parseInt(e.target.value) || 0 } : null)} /></div>
                    </div>
                    <div style={{ marginBottom: 14 }}><label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Value / Description</label>
                        <input style={ip} value={editReward.value} onChange={e => setEditReward(p => p ? { ...p, value: e.target.value } : null)} placeholder="e.g. Any dessert" /></div>
                    <div style={{ marginBottom: 16 }}><label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                        <input type="checkbox" checked={editReward.isActive} onChange={() => setEditReward(p => p ? { ...p, isActive: !p.isActive } : null)} /> Active</label></div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button style={{ ...bp, flex: 1, justifyContent: 'center' }} onClick={saveReward}><Save size={14} /> Save</button>
                        <button style={{ ...bo, color: '#EF4444' }} onClick={() => { setRewards(p => p.filter(r => r.id !== editReward.id)); setEditReward(null); toast.success('Deleted'); }}><Trash2 size={14} /></button>
                        <button style={bo} onClick={() => setEditReward(null)}>Cancel</button>
                    </div>
                </div>
            </div>}
        </div>
    );
};

export default LoyaltyConfig;
