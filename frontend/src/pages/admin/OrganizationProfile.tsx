import React, { useState, useEffect, useCallback } from 'react';
import { logger } from '@/lib/logger';
import { useVenue } from '../../context/VenueContext';
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/api';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import {
    Save, Building2, Globe, MapPin, Contact2,
    Receipt, ExternalLink, ChevronRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuditLog } from '../../hooks/useAuditLog';

// ── Types ───────────────────────────────────────────────────────────────────
interface OrganizationData {
    organization_name: string;
    display_name: string;
    description: string;
    street_name: string;
    number: string;
    postal_code: string;
    city: string;
    country: string;
    telephone: string;
    fax: string;
    website_url: string;
    contact_email: string;
    vat_number: string;
    timezone: string;
    locale: string;
    currency: string;
    opening_time: string;
}

interface LegalEntity {
    _id: string;
    registered_name: string;
    vat_number?: string;
    venues: Array<{ _id: string; name: string }>;
}

const INITIAL_ORG: OrganizationData = {
    organization_name: '',
    display_name: '',
    description: '',
    street_name: '',
    number: '',
    postal_code: '',
    city: '',
    country: 'Malta',
    telephone: '',
    fax: '',
    website_url: '',
    contact_email: '',
    vat_number: '',
    timezone: 'Europe/Malta',
    locale: 'en-MT',
    currency: 'EUR',
    opening_time: '00:00',
};

// ── Component ───────────────────────────────────────────────────────────────
export default function OrganizationProfile() {
    const { activeVenue, refreshVenues } = useVenue();
    const { isOwner } = useAuth();
    const canEdit = isOwner();
    const { logAction } = useAuditLog();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState<OrganizationData>(INITIAL_ORG);
    const [legalEntities, setLegalEntities] = useState<LegalEntity[]>([]);

    // ── Load Data ───────────────────────────────────────────────────────────
    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            // Fetch org profile from venue's org data
            if (activeVenue?.id) {
                const venueRes = await api.get(`/api/venues/${activeVenue.id}`);
                const venue = venueRes.data?.venue || venueRes.data;

                // Pull org-level data either from org profile or venue fallback
                const org = venue.organization || {};
                setFormData({
                    organization_name: org.organization_name || venue.name || '',
                    display_name: org.display_name || venue.name || '',
                    description: org.description || '',
                    street_name: org.street_name || venue.address?.street || '',
                    number: org.number || venue.address?.number || '',
                    postal_code: org.postal_code || venue.address?.postal_code || '',
                    city: org.city || venue.address?.city || '',
                    country: org.country || venue.address?.country || 'Malta',
                    telephone: org.telephone || venue.telephone || '',
                    fax: org.fax || '',
                    website_url: org.website_url || venue.website_url || '',
                    contact_email: org.contact_email || venue.contact_email || '',
                    vat_number: org.vat_number || '',
                    timezone: org.timezone || venue.timezone || 'Europe/Malta',
                    locale: org.locale || 'en-MT',
                    currency: org.currency || venue.currency || 'EUR',
                    opening_time: org.opening_time || '00:00',
                });
            }

            // Fetch legal entities summary
            const leRes = await api.get('/api/legal-entities');
            setLegalEntities((leRes.data?.legal_entities || []).filter((e: LegalEntity & { deleted_at?: string }) => !e.deleted_at));
        } catch (err) {
            logger.error('Failed to load org data', { error: err });
        } finally {
            setLoading(false);
        }
    }, [activeVenue?.id]);

    useEffect(() => { loadData(); }, [loadData]);

    // ── Save ────────────────────────────────────────────────────────────────
    const handleSave = async () => {
        setSaving(true);
        try {
            await api.put(`/api/venues/${activeVenue?.id}`, {
                organization: { ...formData },
            });
            toast.success('Organization profile saved');
            logAction('SETTINGS_UPDATED', 'organization_profile', activeVenue?.id || '');
            refreshVenues();
        } catch (err) {
            logger.error('Failed to save org profile', { error: err });
            toast.error('Failed to save');
        } finally {
            setSaving(false);
        }
    };

    const handleChange = (field: keyof OrganizationData, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    // ── Render ──────────────────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-fade-in max-w-5xl">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-zinc-100 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500/20 to-orange-500/20 border border-red-500/20 flex items-center justify-center">
                            <Building2 className="w-5 h-5 text-red-400" />
                        </div>
                        Organization Profile
                    </h1>
                    <p className="text-zinc-500 mt-1">
                        Manage your company identity, address, and regional settings
                    </p>
                </div>
                <Button
                    onClick={handleSave}
                    disabled={saving || !canEdit}
                    className="bg-red-600 hover:bg-red-700 text-white font-bold uppercase tracking-wider h-10 px-8 shadow-lg disabled:opacity-50"
                >
                    <Save className="w-4 h-4 mr-2" />
                    {saving ? 'Saving...' : 'Save Changes'}
                </Button>
            </div>

            {/* Section 1: Company Identity */}
            <Card className="border-white/5 bg-zinc-900/50 backdrop-blur-xl">
                <CardHeader>
                    <CardTitle className="text-lg font-bold flex items-center gap-2 text-zinc-100">
                        <Contact2 className="w-5 h-5 text-red-500" />
                        Company Identity
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-zinc-500 uppercase">Organization Name</Label>
                            <Input
                                value={formData.organization_name}
                                onChange={e => handleChange('organization_name', e.target.value)}
                                className="bg-zinc-950 border-white/10 text-zinc-100 h-12"
                                disabled={!canEdit}
                                placeholder="e.g. Marvin Gauci Group"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-zinc-500 uppercase">Display Name</Label>
                            <Input
                                value={formData.display_name}
                                onChange={e => handleChange('display_name', e.target.value)}
                                className="bg-zinc-950 border-white/10 text-zinc-100 h-12"
                                disabled={!canEdit}
                                placeholder="e.g. Caviar & Bull"
                            />
                        </div>
                        <div className="col-span-2 space-y-2">
                            <Label className="text-xs font-bold text-zinc-500 uppercase">Description</Label>
                            <textarea
                                value={formData.description}
                                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleChange('description', e.target.value)}
                                className="flex w-full rounded-md bg-zinc-950 border border-white/10 text-zinc-100 min-h-[80px] px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-violet-500/30 resize-none"
                                disabled={!canEdit}
                                placeholder="Brief description of your organization"
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Section 2: Address */}
            <Card className="border-white/5 bg-zinc-900/50 backdrop-blur-xl">
                <CardHeader>
                    <CardTitle className="text-lg font-bold flex items-center gap-2 text-zinc-100">
                        <MapPin className="w-5 h-5 text-amber-500" />
                        Registered Address
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-zinc-500 uppercase">Street Name</Label>
                            <Input
                                value={formData.street_name}
                                onChange={e => handleChange('street_name', e.target.value)}
                                className="bg-zinc-950 border-white/10 text-zinc-100"
                                disabled={!canEdit}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-zinc-500 uppercase">Number / Building</Label>
                            <Input
                                value={formData.number}
                                onChange={e => handleChange('number', e.target.value)}
                                className="bg-zinc-950 border-white/10 text-zinc-100"
                                disabled={!canEdit}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-zinc-500 uppercase">City</Label>
                            <Input
                                value={formData.city}
                                onChange={e => handleChange('city', e.target.value)}
                                className="bg-zinc-950 border-white/10 text-zinc-100"
                                disabled={!canEdit}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-zinc-500 uppercase">Postal Code</Label>
                            <Input
                                value={formData.postal_code}
                                onChange={e => handleChange('postal_code', e.target.value)}
                                className="bg-zinc-950 border-white/10 text-zinc-100"
                                disabled={!canEdit}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-zinc-500 uppercase">Country</Label>
                            <Input
                                value={formData.country}
                                onChange={e => handleChange('country', e.target.value)}
                                className="bg-zinc-950 border-white/10 text-zinc-100"
                                disabled={!canEdit}
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Section 3: Contact */}
            <Card className="border-white/5 bg-zinc-900/50 backdrop-blur-xl">
                <CardHeader>
                    <CardTitle className="text-lg font-bold flex items-center gap-2 text-zinc-100">
                        <Globe className="w-5 h-5 text-blue-500" />
                        Contact & Web
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-zinc-500 uppercase">Telephone</Label>
                            <Input
                                value={formData.telephone}
                                onChange={e => handleChange('telephone', e.target.value)}
                                className="bg-zinc-950 border-white/10 text-zinc-100"
                                disabled={!canEdit}
                                placeholder="(+356) 2134 5678"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-zinc-500 uppercase">Fax</Label>
                            <Input
                                value={formData.fax}
                                onChange={e => handleChange('fax', e.target.value)}
                                className="bg-zinc-950 border-white/10 text-zinc-100"
                                disabled={!canEdit}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-zinc-500 uppercase">Contact Email</Label>
                            <Input
                                type="email"
                                value={formData.contact_email}
                                onChange={e => handleChange('contact_email', e.target.value)}
                                className="bg-zinc-950 border-white/10 text-zinc-100"
                                disabled={!canEdit}
                                placeholder="info@company.com"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-zinc-500 uppercase">Website</Label>
                            <Input
                                value={formData.website_url}
                                onChange={e => handleChange('website_url', e.target.value)}
                                className="bg-zinc-950 border-white/10 text-zinc-100"
                                disabled={!canEdit}
                                placeholder="www.example.com"
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Section 4: Regional & Tax */}
            <Card className="border-white/5 bg-zinc-900/50 backdrop-blur-xl">
                <CardHeader>
                    <CardTitle className="text-lg font-bold flex items-center gap-2 text-zinc-100">
                        <Receipt className="w-5 h-5 text-yellow-500" />
                        Regional & Tax Configuration
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-zinc-500 uppercase">Currency</Label>
                            <Select
                                value={formData.currency}
                                onValueChange={val => handleChange('currency', val)}
                                disabled={!canEdit}
                            >
                                <SelectTrigger className="bg-zinc-950 border-white/10 text-zinc-100 h-12">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-zinc-900 border-white/10">
                                    <SelectItem value="EUR">EUR (€)</SelectItem>
                                    <SelectItem value="GBP">GBP (£)</SelectItem>
                                    <SelectItem value="USD">USD ($)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-zinc-500 uppercase">VAT Number</Label>
                            <Input
                                value={formData.vat_number}
                                onChange={e => handleChange('vat_number', e.target.value)}
                                className="bg-zinc-950 border-white/10 text-zinc-100"
                                disabled={!canEdit}
                                placeholder="MT15355214"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-zinc-500 uppercase">Time Zone</Label>
                            <Select
                                value={formData.timezone}
                                onValueChange={val => handleChange('timezone', val)}
                                disabled={!canEdit}
                            >
                                <SelectTrigger className="bg-zinc-950 border-white/10 text-zinc-100 h-12">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-zinc-900 border-white/10">
                                    <SelectItem value="Europe/Malta">Europe/Malta (GMT+1)</SelectItem>
                                    <SelectItem value="Europe/London">Europe/London (GMT)</SelectItem>
                                    <SelectItem value="UTC">UTC</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-zinc-500 uppercase">Business Day Start</Label>
                            <Input
                                type="time"
                                value={formData.opening_time}
                                onChange={e => handleChange('opening_time', e.target.value)}
                                className="bg-zinc-950 border-white/10 text-zinc-100 h-12"
                                disabled={!canEdit}
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Section 5: Legal Entities Quick View */}
            <Card className="border-white/5 bg-zinc-900/50 backdrop-blur-xl">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-lg font-bold flex items-center gap-2 text-zinc-100">
                            <Building2 className="w-5 h-5 text-violet-500" />
                            Legal Entities
                        </CardTitle>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate('/manager/legal-entities')}
                            className="border-white/10 text-zinc-300 hover:bg-white/5"
                        >
                            <ExternalLink className="w-4 h-4 mr-2" />
                            Manage
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {legalEntities.length === 0 ? (
                        <div className="text-center py-8">
                            <p className="text-sm text-zinc-500">No legal entities configured</p>
                            <Button
                                variant="link"
                                onClick={() => navigate('/manager/legal-entities')}
                                className="text-violet-400 mt-2"
                            >
                                Create your first legal entity →
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {legalEntities.map(le => (
                                <div
                                    key={le._id}
                                    className="flex items-center justify-between p-4 rounded-xl bg-zinc-800/50 border border-white/5 hover:border-white/10 transition-colors cursor-pointer"
                                    onClick={() => navigate('/manager/legal-entities')}
                                >
                                    <div>
                                        <p className="text-sm font-semibold text-zinc-200">{le.registered_name}</p>
                                        {le.vat_number && (
                                            <p className="text-xs text-zinc-500">VAT: {le.vat_number}</p>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {le.venues && le.venues.length > 0 && (
                                            <span className="text-xs text-zinc-500">
                                                {le.venues.length} venue{le.venues.length > 1 ? 's' : ''}
                                            </span>
                                        )}
                                        <ChevronRight className="w-4 h-4 text-zinc-600" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
