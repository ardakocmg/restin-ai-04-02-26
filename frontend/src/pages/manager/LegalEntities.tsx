// @ts-nocheck
import React, { useState, useEffect, useCallback } from 'react';
import { Building2, Plus, Edit2, Trash2, Link2, ChevronRight, FileText, MapPin, Phone, Mail, Hash, AlertCircle, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import api from '../../lib/api';
import { logger } from '../../lib/logger';

// ── Types ───────────────────────────────────────────────────────────────────
interface LegalEntity {
    _id: string;
    registered_name: string;
    trading_name?: string;
    registration_number?: string;
    vat_number?: string;
    pe_number?: string;
    registered_address?: string;
    city?: string;
    country: string;
    hr_manager?: string;
    principal_payer?: string;
    contact_email?: string;
    contact_phone?: string;
    notes?: string;
    venue_ids: string[];
    venues: Array<{ _id: string; name: string }>;
    created_at?: string;
    deleted_at?: string;
}

interface Venue {
    _id: string;
    name: string;
    legal_entity_id?: string;
}

const EMPTY_FORM = {
    registered_name: '',
    trading_name: '',
    registration_number: '',
    vat_number: '',
    pe_number: '',
    registered_address: '',
    city: '',
    country: 'Malta',
    hr_manager: '',
    principal_payer: '',
    contact_email: '',
    contact_phone: '',
    notes: '',
};

// ── Main Component ──────────────────────────────────────────────────────────
export default function LegalEntities() {
    const [entities, setEntities] = useState<LegalEntity[]>([]);
    const [venues, setVenues] = useState<Venue[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState(EMPTY_FORM);
    const [showAssign, setShowAssign] = useState<string | null>(null);
    const [selectedVenues, setSelectedVenues] = useState<string[]>([]);
    const [saving, setSaving] = useState(false);

    // ── Fetch Data ────────────────────────────────────────────────────────
    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const [entRes, venRes] = await Promise.all([
                api.get('/legal-entities'),
                api.get('/venues'),
            ]);
            const ents = (entRes.data?.legal_entities || []).filter((e: LegalEntity) => !e.deleted_at);
            setEntities(ents);
            setVenues(venRes.data?.venues || venRes.data || []);
        } catch (err: any) {
            logger.error('Failed to load legal entities', { error: err });
            toast.error('Failed to load legal entities');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    // ── Create / Update ───────────────────────────────────────────────────
    const handleSave = async () => {
        if (!form.registered_name.trim()) {
            toast.error('Registered name is required');
            return;
        }
        setSaving(true);
        try {
            if (editingId) {
                await api.put(`/legal-entities/${editingId}`, form);
                toast.success('Legal entity updated');
            } else {
                await api.post('/legal-entities', form);
                toast.success('Legal entity created');
            }
            setShowForm(false);
            setEditingId(null);
            setForm(EMPTY_FORM);
            fetchData();
        } catch (err: any) {
            logger.error('Failed to save legal entity', { error: err });
            toast.error('Failed to save');
        } finally {
            setSaving(false);
        }
    };

    // ── Delete ────────────────────────────────────────────────────────────
    const handleDelete = async (id: string) => {
        if (!window.confirm('Are you sure? This will soft-delete the entity.')) return;
        try {
            await api.delete(`/legal-entities/${id}`);
            toast.success('Legal entity deleted');
            fetchData();
        } catch (err: any) {
            logger.error('Failed to delete legal entity', { error: err });
            toast.error('Failed to delete');
        }
    };

    // ── Assign Venues ─────────────────────────────────────────────────────
    const handleAssignVenues = async () => {
        if (!showAssign) return;
        try {
            await api.post(`/legal-entities/${showAssign}/assign-venues`, {
                venue_ids: selectedVenues,
            });
            toast.success('Venues assigned successfully');
            setShowAssign(null);
            fetchData();
        } catch (err: any) {
            logger.error('Failed to assign venues', { error: err });
            toast.error('Failed to assign venues');
        }
    };

    const startEdit = (entity: LegalEntity) => {
        setEditingId(entity._id);
        setForm({
            registered_name: entity.registered_name || '',
            trading_name: entity.trading_name || '',
            registration_number: entity.registration_number || '',
            vat_number: entity.vat_number || '',
            pe_number: entity.pe_number || '',
            registered_address: entity.registered_address || '',
            city: entity.city || '',
            country: entity.country || 'Malta',
            hr_manager: entity.hr_manager || '',
            principal_payer: entity.principal_payer || '',
            contact_email: entity.contact_email || '',
            contact_phone: entity.contact_phone || '',
            notes: entity.notes || '',
        });
        setShowForm(true);
    };

    const startAssign = (entity: LegalEntity) => {
        setShowAssign(entity._id);
        setSelectedVenues(entity.venue_ids || []);
    };

    // ── Render ────────────────────────────────────────────────────────────
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 border border-violet-500/20 flex items-center justify-center">
                            <Building2 className="w-5 h-5 text-violet-400" />
                        </div>
                        Legal Entities
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Manage company registrations and their venue assignments
                    </p>
                </div>
                <button
                    onClick={() => { setShowForm(true); setEditingId(null); setForm(EMPTY_FORM); }}
                    className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-500 text-foreground rounded-xl transition-all"
                >
                    <Plus className="w-4 h-4" />
                    Add Legal Entity
                </button>
            </div>

            {/* Explainer Card */}
            <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5">
                <div className="flex gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-muted-foreground">
                        <p className="text-amber-300 font-medium mb-1">Organization → Legal Entity → Venue</p>
                        <p>Multiple venues can share the same legal entity (e.g., same VAT & PE number for payroll).
                            Each legal entity represents a registered company under your organization.</p>
                    </div>
                </div>
            </div>

            {/* Loading */}
            {loading && (
                <div className="flex items-center justify-center h-40">
                    <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                </div>
            )}

            {/* Empty State */}
            {!loading && entities.length === 0 && (
                <div className="text-center py-20 rounded-2xl border border-border bg-card/50">
                    <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-secondary-foreground">No Legal Entities Yet</h3>
                    <p className="text-muted-foreground mt-1 max-w-md mx-auto">
                        Add your company registrations to organize venues under their legal entities.
                    </p>
                </div>
            )}

            {/* Entity Cards */}
            {!loading && entities.map((entity) => (
                <div
                    key={entity._id}
                    className="rounded-2xl border border-border bg-card/50 overflow-hidden hover:border-border transition-all"
                >
                    {/* Card Header */}
                    <div className="p-5 flex items-start justify-between">
                        <div className="flex gap-4">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500/20 to-indigo-500/20 border border-violet-500/20 flex items-center justify-center flex-shrink-0">
                                <Building2 className="w-6 h-6 text-violet-400" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-foreground">{entity.registered_name}</h3>
                                {entity.trading_name && (
                                    <p className="text-sm text-muted-foreground">Trading as: {entity.trading_name}</p>
                                )}
                                <div className="flex items-center gap-4 mt-2 flex-wrap">
                                    {entity.registration_number && (
                                        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                            <Hash className="w-3.5 h-3.5" /> {entity.registration_number}
                                        </span>
                                    )}
                                    {entity.vat_number && (
                                        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                            <FileText className="w-3.5 h-3.5" /> VAT: {entity.vat_number}
                                        </span>
                                    )}
                                    {entity.pe_number && (
                                        <span className="flex items-center gap-1.5 text-xs text-emerald-400">
                                            PE: {entity.pe_number}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => startAssign(entity)}
                                className="p-2 rounded-lg hover:bg-white/5 text-muted-foreground hover:text-violet-400 transition-colors"
                                title="Assign Venues"
                            >
                                <Link2 className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => startEdit(entity)}
                                className="p-2 rounded-lg hover:bg-white/5 text-muted-foreground hover:text-amber-400 transition-colors"
                                title="Edit"
                            >
                                <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => handleDelete(entity._id)}
                                className="p-2 rounded-lg hover:bg-white/5 text-muted-foreground hover:text-red-400 transition-colors"
                                title="Delete"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Details Grid */}
                    <div className="px-5 pb-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                        {entity.registered_address && (
                            <div className="flex items-start gap-2 text-sm">
                                <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                                <span className="text-muted-foreground">{entity.registered_address}{entity.city ? `, ${entity.city}` : ''}</span>
                            </div>
                        )}
                        {entity.contact_email && (
                            <div className="flex items-center gap-2 text-sm">
                                <Mail className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                <span className="text-muted-foreground">{entity.contact_email}</span>
                            </div>
                        )}
                        {entity.contact_phone && (
                            <div className="flex items-center gap-2 text-sm">
                                <Phone className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                <span className="text-muted-foreground">{entity.contact_phone}</span>
                            </div>
                        )}
                        {entity.hr_manager && (
                            <div className="text-sm">
                                <span className="text-muted-foreground">HR Manager: </span>
                                <span className="text-muted-foreground">{entity.hr_manager}</span>
                            </div>
                        )}
                        {entity.principal_payer && (
                            <div className="text-sm">
                                <span className="text-muted-foreground">Principal Payer: </span>
                                <span className="text-muted-foreground">{entity.principal_payer}</span>
                            </div>
                        )}
                    </div>

                    {/* Assigned Venues */}
                    <div className="px-5 pb-5 pt-2 border-t border-border">
                        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Assigned Venues</p>
                        {entity.venues && entity.venues.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                                {entity.venues.map((v) => (
                                    <span
                                        key={v._id}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-500/10 border border-violet-500/20 text-sm text-violet-300"
                                    >
                                        <ChevronRight className="w-3 h-3" />
                                        {v.name}
                                    </span>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground italic">No venues assigned</p>
                        )}
                    </div>
                </div>
            ))}

            {/* ── Create/Edit Modal ──────────────────────────────────────────── */}
            {showForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="w-full max-w-2xl mx-4 rounded-2xl border border-border bg-card shadow-2xl max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-border flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-foreground">
                                {editingId ? 'Edit Legal Entity' : 'New Legal Entity'}
                            </h2>
                            <button onClick={() => { setShowForm(false); setEditingId(null); }} className="p-2 rounded-lg hover:bg-white/5 text-muted-foreground" title="Close">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="text-sm text-muted-foreground mb-1 block">Registered Name *</label>
                                    <input
                                        type="text"
                                        value={form.registered_name}
                                        onChange={(e) => setForm({ ...form, registered_name: e.target.value })}
                                        className="w-full px-3 py-2.5 rounded-xl bg-secondary border border-border text-foreground focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500/30"
                                        placeholder="e.g. MG Hospitality Ltd"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm text-muted-foreground mb-1 block">Trading Name</label>
                                    <input
                                        type="text"
                                        value={form.trading_name}
                                        onChange={(e) => setForm({ ...form, trading_name: e.target.value })}
                                        className="w-full px-3 py-2.5 rounded-xl bg-secondary border border-border text-foreground focus:border-violet-500 focus:outline-none"
                                        placeholder="e.g. Caviar & Bull"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm text-muted-foreground mb-1 block">Registration # (Company)</label>
                                    <input
                                        type="text"
                                        value={form.registration_number}
                                        onChange={(e) => setForm({ ...form, registration_number: e.target.value })}
                                        className="w-full px-3 py-2.5 rounded-xl bg-secondary border border-border text-foreground focus:border-violet-500 focus:outline-none"
                                        placeholder="e.g. C56123"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm text-muted-foreground mb-1 block">VAT Number</label>
                                    <input
                                        type="text"
                                        value={form.vat_number}
                                        onChange={(e) => setForm({ ...form, vat_number: e.target.value })}
                                        className="w-full px-3 py-2.5 rounded-xl bg-secondary border border-border text-foreground focus:border-violet-500 focus:outline-none"
                                        placeholder="e.g. MT15355214"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm text-muted-foreground mb-1 block">PE Number</label>
                                    <input
                                        type="text"
                                        value={form.pe_number}
                                        onChange={(e) => setForm({ ...form, pe_number: e.target.value })}
                                        className="w-full px-3 py-2.5 rounded-xl bg-secondary border border-border text-foreground focus:border-violet-500 focus:outline-none"
                                        placeholder="e.g. 456398"
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="text-sm text-muted-foreground mb-1 block">Registered Address</label>
                                    <input
                                        type="text"
                                        value={form.registered_address}
                                        onChange={(e) => setForm({ ...form, registered_address: e.target.value })}
                                        className="w-full px-3 py-2.5 rounded-xl bg-secondary border border-border text-foreground focus:border-violet-500 focus:outline-none"
                                        placeholder="e.g. Triq ix-Xatt, St. George's Bay"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm text-muted-foreground mb-1 block">City</label>
                                    <input
                                        type="text"
                                        value={form.city}
                                        onChange={(e) => setForm({ ...form, city: e.target.value })}
                                        className="w-full px-3 py-2.5 rounded-xl bg-secondary border border-border text-foreground focus:border-violet-500 focus:outline-none"
                                        placeholder="e.g. STJ 3301"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm text-muted-foreground mb-1 block">Country</label>
                                    <input
                                        type="text"
                                        value={form.country}
                                        onChange={(e) => setForm({ ...form, country: e.target.value })}
                                        className="w-full px-3 py-2.5 rounded-xl bg-secondary border border-border text-foreground focus:border-violet-500 focus:outline-none"
                                        placeholder="Malta"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm text-muted-foreground mb-1 block">HR Manager</label>
                                    <input
                                        type="text"
                                        value={form.hr_manager}
                                        onChange={(e) => setForm({ ...form, hr_manager: e.target.value })}
                                        className="w-full px-3 py-2.5 rounded-xl bg-secondary border border-border text-foreground focus:border-violet-500 focus:outline-none"
                                        placeholder="e.g. Jacqueline Portelli"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm text-muted-foreground mb-1 block">Principal Payer</label>
                                    <input
                                        type="text"
                                        value={form.principal_payer}
                                        onChange={(e) => setForm({ ...form, principal_payer: e.target.value })}
                                        className="w-full px-3 py-2.5 rounded-xl bg-secondary border border-border text-foreground focus:border-violet-500 focus:outline-none"
                                        placeholder="e.g. Marvin Gauci"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm text-muted-foreground mb-1 block">Contact Email</label>
                                    <input
                                        type="email"
                                        value={form.contact_email}
                                        onChange={(e) => setForm({ ...form, contact_email: e.target.value })}
                                        className="w-full px-3 py-2.5 rounded-xl bg-secondary border border-border text-foreground focus:border-violet-500 focus:outline-none"
                                        placeholder="admin@company.com"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm text-muted-foreground mb-1 block">Contact Phone</label>
                                    <input
                                        type="tel"
                                        value={form.contact_phone}
                                        onChange={(e) => setForm({ ...form, contact_phone: e.target.value })}
                                        className="w-full px-3 py-2.5 rounded-xl bg-secondary border border-border text-foreground focus:border-violet-500 focus:outline-none"
                                        placeholder="+356 2134 5678"
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="text-sm text-muted-foreground mb-1 block">Notes</label>
                                    <textarea
                                        value={form.notes}
                                        onChange={(e) => setForm({ ...form, notes: e.target.value })}
                                        rows={3}
                                        className="w-full px-3 py-2.5 rounded-xl bg-secondary border border-border text-foreground focus:border-violet-500 focus:outline-none resize-none"
                                        placeholder="Internal notes..."
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="p-6 border-t border-border flex justify-end gap-3">
                            <button
                                onClick={() => { setShowForm(false); setEditingId(null); }}
                                className="px-4 py-2.5 rounded-xl border border-border text-muted-foreground hover:text-secondary-foreground hover:bg-white/5 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-500 text-foreground rounded-xl transition-all disabled:opacity-50"
                            >
                                {saving ? (
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <Check className="w-4 h-4" />
                                )}
                                {editingId ? 'Update' : 'Create'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Assign Venues Modal ────────────────────────────────────────── */}
            {showAssign && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="w-full max-w-md mx-4 rounded-2xl border border-border bg-card shadow-2xl">
                        <div className="p-6 border-b border-border flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-foreground">Assign Venues</h2>
                            <button onClick={() => setShowAssign(null)} className="p-2 rounded-lg hover:bg-white/5 text-muted-foreground" title="Close">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-2 max-h-[400px] overflow-y-auto">
                            {venues.length === 0 && (
                                <p className="text-sm text-muted-foreground text-center py-4">No venues found</p>
                            )}
                            {venues.map((venue) => {
                                const isSelected = selectedVenues.includes(venue._id);
                                return (
                                    <button
                                        key={venue._id}
                                        onClick={() => {
                                            setSelectedVenues(prev =>
                                                isSelected ? prev.filter(id => id !== venue._id) : [...prev, venue._id]
                                            );
                                        }}
                                        className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left
                      ${isSelected
                                                ? 'border-violet-500/40 bg-violet-500/10 text-violet-300'
                                                : 'border-border bg-secondary/50 text-muted-foreground hover:border-border'
                                            }`}
                                    >
                                        <div className={`w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0
                      ${isSelected ? 'bg-violet-500 border-violet-500' : 'border-white/20'}`}
                                        >
                                            {isSelected && <Check className="w-3 h-3 text-foreground" />}
                                        </div>
                                        <span className="font-medium">{venue.name}</span>
                                    </button>
                                );
                            })}
                        </div>
                        <div className="p-6 border-t border-border flex justify-end gap-3">
                            <button
                                onClick={() => setShowAssign(null)}
                                className="px-4 py-2.5 rounded-xl border border-border text-muted-foreground hover:text-secondary-foreground hover:bg-white/5 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAssignVenues}
                                className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-500 text-foreground rounded-xl transition-all"
                            >
                                <Link2 className="w-4 h-4" />
                                Assign ({selectedVenues.length})
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
