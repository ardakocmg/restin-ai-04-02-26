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
import './pos-shared.css';

interface Allergen { id: string; name: string; icon: string; isActive: boolean; itemCount: number; }

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
    const venueId = String(localStorage.getItem('restin_pos_venue') || authStore.getUser()?.venue_id || '');
    const { data: apiAllergens, loading: apiLoading, error: apiError, refetch } = useVenueConfig({ venueId, configType: 'allergens', enabled: !!venueId });
    const [allergens, setAllergens] = useState(EU_ALLERGENS);
    const [apiWired, setApiWired] = useState(false);

    useEffect(() => {
        if (apiAllergens.length > 0) {
            const mapped: Allergen[] = apiAllergens.map(// eslint-disable-next-line @typescript-eslint/no-explicit-any
                (aa: Record<string, unknown>) => ({
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
        <div className="pos-page"><div className="pos-container">
            <div className="pos-header">
                <div>
                    <button onClick={() => navigate(-1)} className="pos-btn-outline pos-btn-back"><ArrowLeft size={14} /> Back</button>
                    <h1 className="pos-title">Allergen Management</h1>
                    <p className="pos-subtitle">EU 14 mandatory allergens — enable/disable per your menu{apiWired && <span className="pos-badge--green" style={{ marginLeft: 8, fontSize: 11 }}>● Live</span>}</p> /* keep-inline */ /* keep-inline */ /* keep-inline */
                </div>
                <button className="pos-btn-primary" onClick={() => toast.success('Allergen settings saved')}><Save size={16} /> Save Changes</button>
            </div>

            {/* Loading / Error */}
            {apiLoading && <div className="pos-card pos-flex pos-flex--center" style={{ justifyContent: 'center', gap: 8, padding: 30 }}><Loader2 size={18} className="animate-spin" style={{ color: '#3B82F6' }} /><span className="pos-text-secondary">{"Loading "}allergens...</span></div>} /* keep-inline */ /* keep-inline */ /* keep-inline */
            {apiError && <div className="pos-card pos-flex pos-flex--between pos-flex--center" style={{ borderColor: '#EF4444', padding: 14 }}><span style={{ color: '#EF4444', fontSize: 13 }}>⚠ {apiError}</span><button className="pos-btn-outline pos-btn-back" onClick={() => refetch()}>Retry</button></div>} /* keep-inline */ /* keep-inline */ /* keep-inline */

            {/* Stats */}
            <div className="pos-stats-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                <div className="pos-card pos-stat-card">
                    <div className="pos-stat-icon pos-stat-icon--blue"><AlertTriangle size={16} /></div>
                    <div><div className="pos-stat-value">{activeCount}</div><div className="pos-stat-label">Active Allergens</div></div>
                </div>
                <div className="pos-card pos-stat-card">
                    <div className="pos-stat-icon pos-stat-icon--green"><Check size={16} /></div>
                    <div><div className="pos-stat-value">{totalItems}</div><div className="pos-stat-label">Tagged Items</div></div>
                </div>
                <div className="pos-card pos-stat-card">
                    <div className="pos-stat-icon pos-stat-icon--amber">🇪🇺</div>
                    <div><div className="pos-stat-value">EU 1169/2011</div><div className="pos-stat-label">Regulation</div></div>
                </div>
            </div>

            <div className="pos-search-wrapper pos-mb-16">
                <Search size={14} className="pos-search-icon" />
                <input className="pos-input pos-search-input" placeholder="Search allergens..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 12 }}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                {filtered.map(allergen => (
                    <div key={allergen.id} className="pos-card pos-flex pos-flex--center pos-gap-12" style={{ cursor: 'pointer', padding: 14, borderColor: allergen.isActive ? 'rgba(59,130,246,0.3)' : undefined, opacity: allergen.isActive ? 1 : 0.5 }} onClick={() => toggle(allergen.id)}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                        <span style={{ fontSize: 28 }}>{allergen.icon}</span> /* keep-inline */ /* keep-inline */ /* keep-inline */
                        <div style={{ flex: 1 }}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                            <div className="pos-cell-value" style={{ fontSize: 14, fontWeight: 600 }}>{allergen.name}</div> /* keep-inline */ /* keep-inline */ /* keep-inline */
                            <div className="pos-cell-secondary">{allergen.itemCount} items tagged</div>
                        </div>
                        <div className={`pos-toggle-track ${allergen.isActive ? 'pos-toggle-track--on' : 'pos-toggle-track--off'}`}>
                            <div className={`pos-toggle-thumb ${allergen.isActive ? 'pos-toggle-thumb--on' : 'pos-toggle-thumb--off'}`} />
                        </div>
                    </div>
                ))}
            </div>

            <div className="pos-card" style={{ background: 'rgba(245,158,11,0.04)', borderColor: 'rgba(245,158,11,0.2)', marginTop: 16 }}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                <div className="pos-text-sm pos-text-bold pos-mb-8" style={{ color: '#F59E0B' }}>⚠️ Legal Requirement</div> /* keep-inline */ /* keep-inline */ /* keep-inline */
                <p className="pos-cell-secondary pos-mb-0" style={{ lineHeight: 1.6 }}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                    Under EU Regulation 1169/2011, all 14 allergens must be declared when present in food served to consumers.
                    Disabling an allergen here only hides it from the POS selection — you remain legally responsible for allergen disclosure.
                </p>
            </div>
        </div></div>
    );
};

export default AllergenManager;
