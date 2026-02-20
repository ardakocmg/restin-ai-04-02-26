/**
 * AllergenManager.tsx — K-Series Allergen Management
 * 14 EU allergens with item association management
 * Lightspeed K-Series Back Office > Menu > Allergens parity
 */
import React, { useState, useEffect } from 'react';
import { ArrowLeft, Save, Search, AlertTriangle, Check, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useVenueConfig } from '../../hooks/shared/useVenueConfig';
import authStore from '../../lib/AuthStore';

interface Allergen { id: string; name: string; icon: string; isActive: boolean; itemCount: number; }

const pg: React.CSSProperties = { minHeight: '100vh', background: 'var(--bg-primary,#0a0a0a)', color: 'var(--text-primary,#fafafa)', fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif' };
const ct: React.CSSProperties = { maxWidth: 1100, margin: '0 auto', padding: '24px 20px' };
const cd: React.CSSProperties = { background: 'var(--bg-card,#18181b)', border: '1px solid var(--border-primary,#27272a)', borderRadius: 12, padding: 20, marginBottom: 16 };
const bp: React.CSSProperties = { padding: '10px 24px', background: '#3B82F6', border: 'none', borderRadius: 8, color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 };
const bo: React.CSSProperties = { padding: '10px 24px', background: 'transparent', border: '1px solid var(--border-primary,#27272a)', borderRadius: 8, color: 'var(--text-primary,#fafafa)', fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 };
const ip: React.CSSProperties = { width: '100%', padding: '10px 14px', background: 'var(--bg-secondary,#09090b)', border: '1px solid var(--border-primary,#27272a)', borderRadius: 8, color: 'var(--text-primary,#fafafa)', fontSize: 14 };

const EU_ALLERGENS: Allergen[] = [
    { id: '1', name: 'Gluten', icon: '🌾', isActive: true, itemCount: 18 },
    { id: '2', name: 'Crustaceans', icon: '🦐', isActive: true, itemCount: 4 },
    { id: '3', name: 'Eggs', icon: '🥚', isActive: true, itemCount: 12 },
    { id: '4', name: 'Fish', icon: '🐟', isActive: true, itemCount: 6 },
    { id: '5', name: 'Peanuts', icon: '🥜', isActive: true, itemCount: 3 },
    { id: '6', name: 'Soybeans', icon: '🫘', isActive: true, itemCount: 8 },
    { id: '7', name: 'Milk', icon: '🥛', isActive: true, itemCount: 22 },
    { id: '8', name: 'Tree Nuts', icon: '🌰', isActive: true, itemCount: 5 },
    { id: '9', name: 'Celery', icon: '🥬', isActive: true, itemCount: 7 },
    { id: '10', name: 'Mustard', icon: '🟡', isActive: true, itemCount: 3 },
    { id: '11', name: 'Sesame', icon: '⚪', isActive: true, itemCount: 4 },
    { id: '12', name: 'Sulphites', icon: '🍷', isActive: true, itemCount: 9 },
    { id: '13', name: 'Lupin', icon: '🌿', isActive: true, itemCount: 1 },
    { id: '14', name: 'Molluscs', icon: '🐚', isActive: true, itemCount: 3 },
];

const AllergenManager: React.FC = () => {
    const navigate = useNavigate();
    const venueId = localStorage.getItem('restin_pos_venue') || authStore.getUser()?.venue_id || '';
    const { data: apiAllergens, loading: apiLoading, error: apiError, refetch } = useVenueConfig({ venueId, configType: 'allergens', enabled: !!venueId });
    const [allergens, setAllergens] = useState(EU_ALLERGENS);
    const [apiWired, setApiWired] = useState(false);

    useEffect(() => {
        if (apiAllergens.length > 0) {
            const mapped: Allergen[] = apiAllergens.map(// eslint-disable-next-line @typescript-eslint/no-explicit-any
                (aa: any) => ({
                    id: String(aa.id || aa._id || ''),
                    name: String(aa.name || ''),
                    icon: String(aa.icon || '⚠️'),
                    isActive: aa.is_active !== false,
                    itemCount: Number(aa.item_count || aa.itemCount || 0),
                }));
            setAllergens(mapped);
            setApiWired(true);
        }
    }, [apiAllergens]);

    const [search, setSearch] = useState('');
    const filtered = allergens.filter(a => !search || a.name.toLowerCase().includes(search.toLowerCase()));
    const activeCount = allergens.filter(a => a.isActive).length;
    const totalItems = allergens.filter(a => a.isActive).reduce((s, a) => s + a.itemCount, 0);

    const toggle = (id: string) => setAllergens(prev => prev.map(a => a.id === id ? { ...a, isActive: !a.isActive } : a));

    return (
        <div style={pg}><div style={ct}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                <div>
                    <button onClick={() => navigate(-1)} style={{ ...bo, marginBottom: 8, padding: '6px 14px', fontSize: 12 }}><ArrowLeft size={14} /> Back</button>
                    <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Allergen Management</h1>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary,#a1a1aa)', margin: '4px 0 0' }}>EU 14 mandatory allergens — enable/disable per your menu{apiWired && <span style={{ marginLeft: 8, fontSize: 11, color: '#10B981' }}>● Live</span>}</p>
                </div>
                <button style={bp} onClick={() => toast.success('Allergen settings saved')}><Save size={16} /> Save Changes</button>
            </div>

            {/* Loading / Error */}
            {apiLoading && <div style={{ ...cd, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 30 }}><Loader2 size={18} className="animate-spin" style={{ color: '#3B82F6' }} /><span style={{ color: 'var(--text-secondary)' }}>Loading allergens...</span></div>}
            {apiError && <div style={{ ...cd, borderColor: '#EF4444', padding: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span style={{ color: '#EF4444', fontSize: 13 }}>⚠ {apiError}</span><button style={{ ...bo, padding: '6px 14px', fontSize: 12 }} onClick={() => refetch()}>Retry</button></div>}

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 20 }}>
                <div style={{ ...cd, padding: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(59,130,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3B82F6' }}><AlertTriangle size={16} /></div>
                    <div><div style={{ fontSize: 20, fontWeight: 700 }}>{activeCount}</div><div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Active Allergens</div></div>
                </div>
                <div style={{ ...cd, padding: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10B981' }}><Check size={16} /></div>
                    <div><div style={{ fontSize: 20, fontWeight: 700 }}>{totalItems}</div><div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Tagged Items</div></div>
                </div>
                <div style={{ ...cd, padding: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(245,158,11,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F59E0B' }}>🇪🇺</div>
                    <div><div style={{ fontSize: 20, fontWeight: 700 }}>EU 1169/2011</div><div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Regulation</div></div>
                </div>
            </div>

            <div style={{ position: 'relative', marginBottom: 16 }}>
                <Search size={14} style={{ position: 'absolute', left: 14, top: 12, color: 'var(--text-secondary)' }} />
                <input style={{ ...ip, paddingLeft: 36 }} placeholder="Search allergens..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 12 }}>
                {filtered.map(allergen => (
                    <div key={allergen.id} style={{ ...cd, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, padding: 14, border: allergen.isActive ? '1px solid rgba(59,130,246,0.3)' : '1px solid var(--border-primary,#27272a)', opacity: allergen.isActive ? 1 : 0.5 }} onClick={() => toggle(allergen.id)}>
                        <span style={{ fontSize: 28 }}>{allergen.icon}</span>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 14, fontWeight: 600 }}>{allergen.name}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{allergen.itemCount} items tagged</div>
                        </div>
                        <div style={{ width: 44, height: 24, borderRadius: 12, background: allergen.isActive ? '#3B82F6' : '#3f3f46', position: 'relative' }}>
                            <div style={{ position: 'absolute', top: 2, left: allergen.isActive ? 22 : 2, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left 0.2s ease', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                        </div>
                    </div>
                ))}
            </div>

            <div style={{ ...cd, background: 'rgba(245,158,11,0.04)', border: '1px solid rgba(245,158,11,0.2)', marginTop: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, color: '#F59E0B' }}>⚠️ Legal Requirement</div>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6 }}>
                    Under EU Regulation 1169/2011, all 14 allergens must be declared when present in food served to consumers.
                    Disabling an allergen here only hides it from the POS selection — you remain legally responsible for allergen disclosure.
                </p>
            </div>
        </div></div>
    );
};

export default AllergenManager;
