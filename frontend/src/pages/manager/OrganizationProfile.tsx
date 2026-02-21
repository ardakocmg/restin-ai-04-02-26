import { logger } from '@/lib/logger';
import {
Building2,
ChevronRight,
Contact2,
ExternalLink,
Globe,MapPin,
Receipt,
Save
} from 'lucide-react';
import React,{ useCallback,useEffect,useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import { Card,CardContent,CardHeader,CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select,SelectContent,SelectItem,SelectTrigger,SelectValue } from '../../components/ui/select';
import { useAuth } from '../../context/AuthContext';
import { useVenue } from '../../context/VenueContext';
import { useAuditLog } from '../../hooks/useAuditLog';
import api from '../../lib/api';

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
                    <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500/20 to-orange-500/20 border border-red-500/20 flex items-center justify-center">
                            <Building2 className="w-5 h-5 text-red-400" />
                        </div>
                        Organization Profile
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Manage your company identity, address, and regional settings
                    </p>
                </div>
                <Button
                    onClick={handleSave}
                    disabled={saving || !canEdit}
                    className="bg-red-600 hover:bg-red-700 text-foreground font-bold uppercase tracking-wider h-10 px-8 shadow-lg disabled:opacity-50"
                >
                    <Save className="w-4 h-4 mr-2" />
                    {saving ? 'Saving...' : 'Save Changes'}
                </Button>
            </div>

            {/* Section 1: Company Identity */}
            <Card className="border-border bg-card/50 backdrop-blur-xl">
                <CardHeader>
                    <CardTitle className="text-lg font-bold flex items-center gap-2 text-foreground">
                        <Contact2 className="w-5 h-5 text-red-500" />
                        Company Identity
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-muted-foreground uppercase">Organization Name</Label>
                            <Input aria-label="Input field"
                                value={formData.organization_name}
                                onChange={e => handleChange('organization_name', e.target.value)}
                                className="bg-background border-border text-foreground h-12"
                                disabled={!canEdit}
                                placeholder="e.g. Marvin Gauci Group"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-muted-foreground uppercase">Display Name</Label>
                            <Input aria-label="Input field"
                                value={formData.display_name}
                                onChange={e => handleChange('display_name', e.target.value)}
                                className="bg-background border-border text-foreground h-12"
                                disabled={!canEdit}
                                placeholder="e.g. Caviar & Bull"
                            />
                        </div>
                        <div className="col-span-2 space-y-2">
                            <Label className="text-xs font-bold text-muted-foreground uppercase">Description</Label>
                            <textarea aria-label="Input"
                                value={formData.description}
                                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleChange('description', e.target.value)}
                                className="flex w-full rounded-md bg-background border border-border text-foreground min-h-20 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-violet-500/30 resize-none"
                                disabled={!canEdit}
                                placeholder="Brief description of your organization"
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Section 2: Address */}
            <Card className="border-border bg-card/50 backdrop-blur-xl">
                <CardHeader>
                    <CardTitle className="text-lg font-bold flex items-center gap-2 text-foreground">
                        <MapPin className="w-5 h-5 text-amber-500" />
                        Registered Address
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-muted-foreground uppercase">Street Name</Label>
                            <Input aria-label="Input field"
                                value={formData.street_name}
                                onChange={e => handleChange('street_name', e.target.value)}
                                className="bg-background border-border text-foreground"
                                disabled={!canEdit}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-muted-foreground uppercase">Number / Building</Label>
                            <Input aria-label="Input field"
                                value={formData.number}
                                onChange={e => handleChange('number', e.target.value)}
                                className="bg-background border-border text-foreground"
                                disabled={!canEdit}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-muted-foreground uppercase">City</Label>
                            <Input aria-label="Input field"
                                value={formData.city}
                                onChange={e => handleChange('city', e.target.value)}
                                className="bg-background border-border text-foreground"
                                disabled={!canEdit}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-muted-foreground uppercase">Postal Code</Label>
                            <Input aria-label="Input field"
                                value={formData.postal_code}
                                onChange={e => handleChange('postal_code', e.target.value)}
                                className="bg-background border-border text-foreground"
                                disabled={!canEdit}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-muted-foreground uppercase">Country</Label>
                            <Input aria-label="Input field"
                                value={formData.country}
                                onChange={e => handleChange('country', e.target.value)}
                                className="bg-background border-border text-foreground"
                                disabled={!canEdit}
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Section 3: Contact */}
            <Card className="border-border bg-card/50 backdrop-blur-xl">
                <CardHeader>
                    <CardTitle className="text-lg font-bold flex items-center gap-2 text-foreground">
                        <Globe className="w-5 h-5 text-blue-500" />
                        Contact & Web
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-muted-foreground uppercase">Telephone</Label>
                            <Input aria-label="Input field"
                                value={formData.telephone}
                                onChange={e => handleChange('telephone', e.target.value)}
                                className="bg-background border-border text-foreground"
                                disabled={!canEdit}
                                placeholder="(+356) 2134 5678"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-muted-foreground uppercase">Fax</Label>
                            <Input aria-label="Input field"
                                value={formData.fax}
                                onChange={e => handleChange('fax', e.target.value)}
                                className="bg-background border-border text-foreground"
                                disabled={!canEdit}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-muted-foreground uppercase">Contact Email</Label>
                            <Input aria-label="Input field"
                                type="email"
                                value={formData.contact_email}
                                onChange={e => handleChange('contact_email', e.target.value)}
                                className="bg-background border-border text-foreground"
                                disabled={!canEdit}
                                placeholder="info@company.com"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-muted-foreground uppercase">Website</Label>
                            <Input aria-label="Input field"
                                value={formData.website_url}
                                onChange={e => handleChange('website_url', e.target.value)}
                                className="bg-background border-border text-foreground"
                                disabled={!canEdit}
                                placeholder="www.example.com"
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Section 4: Regional & Tax */}
            <Card className="border-border bg-card/50 backdrop-blur-xl">
                <CardHeader>
                    <CardTitle className="text-lg font-bold flex items-center gap-2 text-foreground">
                        <Receipt className="w-5 h-5 text-yellow-500" />
                        Regional & Tax Configuration
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-muted-foreground uppercase">Currency</Label>
                            <Select aria-label="Select option"
                                value={formData.currency}
                                onValueChange={val => handleChange('currency', val)}
                                disabled={!canEdit}
                            >
                                <SelectTrigger aria-label="Select option" className="bg-background border-border text-foreground h-12">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-card border-border">
                                    <SelectItem value="EUR">EUR (€)</SelectItem>
                                    <SelectItem value="GBP">GBP (£)</SelectItem>
                                    <SelectItem value="USD">USD ($)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-muted-foreground uppercase">VAT Number</Label>
                            <Input aria-label="Input field"
                                value={formData.vat_number}
                                onChange={e => handleChange('vat_number', e.target.value)}
                                className="bg-background border-border text-foreground"
                                disabled={!canEdit}
                                placeholder="MT15355214"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-muted-foreground uppercase">Time Zone</Label>
                            <Select aria-label="Select option"
                                value={formData.timezone}
                                onValueChange={val => handleChange('timezone', val)}
                                disabled={!canEdit}
                            >
                                <SelectTrigger aria-label="Select option" className="bg-background border-border text-foreground h-12">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-card border-border">
                                    <SelectItem value="Europe/Malta">Europe/Malta (GMT+1)</SelectItem>
                                    <SelectItem value="Europe/London">Europe/London (GMT)</SelectItem>
                                    <SelectItem value="UTC">UTC</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-muted-foreground uppercase">Business Day Start</Label>
                            <Input aria-label="Input field"
                                type="time"
                                value={formData.opening_time}
                                onChange={e => handleChange('opening_time', e.target.value)}
                                className="bg-background border-border text-foreground h-12"
                                disabled={!canEdit}
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Section 5: Legal Entities Quick View */}
            <Card className="border-border bg-card/50 backdrop-blur-xl">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-lg font-bold flex items-center gap-2 text-foreground">
                            <Building2 className="w-5 h-5 text-violet-500" />
                            Legal Entities
                        </CardTitle>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate('/manager/legal-entities')}
                            className="border-border text-secondary-foreground hover:bg-white/5"
                        >
                            <ExternalLink className="w-4 h-4 mr-2" />
                            Manage
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {legalEntities.length === 0 ? (
                        <div className="text-center py-8">
                            <p className="text-sm text-muted-foreground">{"No "}legal entities configured</p>
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
                                    className="flex items-center justify-between p-4 rounded-xl bg-secondary/50 border border-border hover:border-border transition-colors cursor-pointer"
                                    onClick={() => navigate('/manager/legal-entities')}
                                >
                                    <div>
                                        <p className="text-sm font-semibold text-secondary-foreground">{le.registered_name}</p>
                                        {le.vat_number && (
                                            <p className="text-xs text-muted-foreground">VAT: {le.vat_number}</p>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {le.venues && le.venues.length > 0 && (
                                            <span className="text-xs text-muted-foreground">
                                                {le.venues.length} venue{le.venues.length > 1 ? 's' : ''}
                                            </span>
                                        )}
                                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
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
