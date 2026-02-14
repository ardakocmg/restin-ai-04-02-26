import React, { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';

import { useVenue } from '../../context/VenueContext';
import { useAuth } from '../../context/AuthContext';

import { venueAPI } from '../../lib/api';

import { toast } from 'sonner';

import PageContainer from '../../layouts/PageContainer';

import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';

import { Button } from '../../components/ui/button';

import { Input } from '../../components/ui/input';

import { Label } from '../../components/ui/label';

import { Switch } from '../../components/ui/switch';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';

import { Badge } from '../../components/ui/badge';

import { Textarea } from '../../components/ui/textarea';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';

import { Separator } from '../../components/ui/separator';

import DataTable from '../../components/shared/DataTable';

import { Save, Building2, Plus, Globe, MapPin, Contact2, Receipt, Settings2, Activity } from 'lucide-react';

import { cn } from '../../lib/utils';

import { useAuditLog } from '../../hooks/useAuditLog';

export default function CompanySettings() {
    const { activeVenue, refreshVenues } = useVenue();
    const { user, isOwner, isManager } = useAuth();
    const canEdit = isOwner() || isManager();
    const { logAction } = useAuditLog();
    const [loading, setLoading] = useState(false);
    const [zones, setZones] = useState([]);
    const [tables, setTables] = useState([]);
    const [dataLoading, setDataLoading] = useState(true);

    const [formData, setFormData] = useState({
        companyName: 'Caviar & Bull',
        displayName: 'Caviar & Bull',
        description: 'Restaurant',
        streetName: 'Triq ix-Xatt',
        number: 'St. George\'s Bay',
        postalCode: 'STJ 3301',
        city: 'St. Julians',
        country: 'Malta',
        telephone: '(+356) 27 593301',
        fax: '+32',
        taxMode: 'Default VAT included',
        vatNumber: 'MT15355214 (XO4725)',
        timeZone: 'GMT+01:00',
        locale: 'English - United Kingdom',
        dateRegion: 'Europe/Malta',
        openingTime: '00:00',
        websiteUrl: 'www.caviarandbull.com'
    });

    const [venueForm, setVenueForm] = useState({});

    useEffect(() => {
        if (activeVenue?.id) {
            setVenueForm(activeVenue);
            loadData();
        }
    }, [activeVenue?.id]);

    const loadData = async () => {
        try {
            setDataLoading(true);
            const [zonesRes, tablesRes] = await Promise.all([
                venueAPI.getZones(activeVenue.id),
                venueAPI.getTables(activeVenue.id)
            ]);
            setZones(zonesRes.data);
            setTables(tablesRes.data);
        } catch (error) {
            logger.error('Failed to load data:', error);
        } finally {
            setDataLoading(false);
        }
    };

    const handleInputChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            // Logic for saving both company details and venue identity
            await venueAPI.update(activeVenue.id, venueForm);
            toast.success('Settings saved successfully');
            logAction('SETTINGS_UPDATED', 'company_settings', activeVenue.id);
            refreshVenues();
        } catch (error) {
            toast.error('Failed to update settings');
        } finally {
            setLoading(false);
        }
    };

    return (
        <PageContainer
            title="Company & Venue Settings"
            description="Centralized administration for your business identity, physical layout, and regional configuration."
            actions={
                <Button onClick={handleSave} disabled={loading || !canEdit} className="bg-red-600 hover:bg-red-700 text-white font-bold uppercase tracking-wider h-10 px-8 shadow-lg disabled:opacity-50">
                    <Save className="w-4 h-4 mr-2" />
                    {loading ? 'Saving...' : 'Save All Changes'}
                </Button>
            }
        >
            <Tabs defaultValue="details" className="w-full">
                <div className="flex items-center justify-between mb-8 border-b border-white/5 overflow-x-auto">
                    <TabsList className="bg-transparent h-12 w-auto justify-start p-0">
                        <TabsTrigger value="details" className="data-[state=active]:bg-transparent data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-red-500 rounded-none h-12 px-6 text-zinc-500 font-bold uppercase tracking-widest text-[10px]">Company Details</TabsTrigger>
                        <TabsTrigger value="identity" className="data-[state=active]:bg-transparent data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-red-500 rounded-none h-12 px-6 text-zinc-500 font-bold uppercase tracking-widest text-[10px]">Venue Identity</TabsTrigger>
                        <TabsTrigger value="regional" className="data-[state=active]:bg-transparent data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-red-500 rounded-none h-12 px-6 text-zinc-500 font-bold uppercase tracking-widest text-[10px]">Regional & Tax</TabsTrigger>
                        <TabsTrigger value="zones" className="data-[state=active]:bg-transparent data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-red-500 rounded-none h-12 px-6 text-zinc-500 font-bold uppercase tracking-widest text-[10px]">Service Zones</TabsTrigger>
                        <TabsTrigger value="tables" className="data-[state=active]:bg-transparent data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-red-500 rounded-none h-12 px-6 text-zinc-500 font-bold uppercase tracking-widest text-[10px]">Physical Tables</TabsTrigger>
                        <TabsTrigger value="import" className="data-[state=active]:bg-transparent data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-red-500 rounded-none h-12 px-6 text-zinc-500 font-bold uppercase tracking-widest text-[10px]">Wizard</TabsTrigger>
                    </TabsList>
                </div>

                {/* DETAILS TAB */}
                <TabsContent value="details" className="space-y-6">
                    <Card className="border-white/5 bg-zinc-900/50 backdrop-blur-xl">
                        <CardHeader>
                            <CardTitle className="text-lg font-bold flex items-center gap-2">
                                <Contact2 className="w-5 h-5 text-red-500" />
                                Contact & General Information
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold text-zinc-500 uppercase">Company Name</Label>
                                    <Input value={formData.companyName} onChange={e => handleInputChange('companyName', e.target.value)} className="bg-zinc-950 border-white/10" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold text-zinc-500 uppercase">Display Name</Label>
                                    <Input value={formData.displayName} onChange={e => handleInputChange('displayName', e.target.value)} className="bg-zinc-950 border-white/10" />
                                </div>
                                <div className="col-span-2 space-y-2">
                                    <Label className="text-xs font-bold text-zinc-500 uppercase">Description</Label>
                                    <Textarea value={formData.description} onChange={e => handleInputChange('description', e.target.value)} className="bg-zinc-950 border-white/10 min-h-[80px]" />
                                </div>
                            </div>

                            <Separator className="bg-white/5" />

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold text-zinc-500 uppercase">Street Name</Label>
                                    <Input value={formData.streetName} onChange={e => handleInputChange('streetName', e.target.value)} className="bg-zinc-950 border-white/10" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold text-zinc-500 uppercase">Number / Building</Label>
                                    <Input value={formData.number} onChange={e => handleInputChange('number', e.target.value)} className="bg-zinc-950 border-white/10" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold text-zinc-500 uppercase">City</Label>
                                    <Input value={formData.city} onChange={e => handleInputChange('city', e.target.value)} className="bg-zinc-950 border-white/10" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold text-zinc-500 uppercase">Postal Code</Label>
                                    <Input value={formData.postalCode} onChange={e => handleInputChange('postalCode', e.target.value)} className="bg-zinc-950 border-white/10" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* IDENTITY TAB */}
                <TabsContent value="identity" className="space-y-6">
                    <Card className="border-white/5 bg-zinc-900/50 backdrop-blur-xl">
                        <CardHeader>
                            <CardTitle className="text-lg font-bold flex items-center gap-2">
                                <Globe className="w-5 h-5 text-blue-500" />
                                Venue Identity
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label className="text-xs uppercase text-zinc-500 font-bold">Internal Venue Name</Label>
                                    <Input
                                        className="bg-zinc-950 border-white/10"
                                        value={venueForm.name || ''}
                                        onChange={(e) => setVenueForm({ ...venueForm, name: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs uppercase text-zinc-500 font-bold">Concept / Type</Label>
                                    <Input
                                        className="bg-zinc-950 border-white/10"
                                        value={venueForm.type || ''}
                                        onChange={(e) => setVenueForm({ ...venueForm, type: e.target.value })}
                                    />
                                </div>
                                <div className="flex items-center justify-between p-4 bg-zinc-950 rounded-lg border border-white/5 col-span-2">
                                    <div>
                                        <Label className="text-sm font-bold text-white">Enable Table Pacing</Label>
                                        <p className="text-xs text-zinc-500">Automatically manage reservation flow</p>
                                    </div>
                                    <Switch
                                        checked={venueForm.pacing_enabled || false}
                                        onCheckedChange={(checked) => setVenueForm({ ...venueForm, pacing_enabled: checked })}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* REGIONAL TAB */}
                <TabsContent value="regional" className="space-y-6">
                    <Card className="border-white/5 bg-zinc-900/50 backdrop-blur-xl">
                        <CardHeader>
                            <CardTitle className="text-lg font-bold flex items-center gap-2">
                                <Receipt className="w-5 h-5 text-yellow-500" />
                                Tax, Currency & Regional
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold text-zinc-500 uppercase">Currency (e.g. EUR)</Label>
                                    <Input value={venueForm.currency || 'EUR'} onChange={e => setVenueForm({ ...venueForm, currency: e.target.value })} className="bg-zinc-950 border-white/10" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold text-zinc-500 uppercase">VAT Number</Label>
                                    <Input value={formData.vatNumber} onChange={e => handleInputChange('vatNumber', e.target.value)} className="bg-zinc-950 border-white/10" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold text-zinc-500 uppercase">Time Zone</Label>
                                    <Select value={venueForm.timezone || 'Europe/Malta'} onValueChange={val => setVenueForm({ ...venueForm, timezone: val })}>
                                        <SelectTrigger className="bg-zinc-950 border-white/10">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Europe/Malta">Europe/Malta</SelectItem>
                                            <SelectItem value="UTC">UTC</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold text-zinc-500 uppercase">Opening Time</Label>
                                    <Input type="time" value={formData.openingTime} onChange={e => handleInputChange('openingTime', e.target.value)} className="bg-zinc-950 border-white/10" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ZONES TAB */}
                <TabsContent value="zones">
                    <Card className="border-white/5 bg-zinc-900/50">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-lg font-bold flex items-center gap-2">
                                    <MapPin className="w-5 h-5 text-orange-500" />
                                    Service Zones
                                </CardTitle>
                                <Button size="sm" className="bg-zinc-800 text-white">
                                    <Plus className="w-4 h-4 mr-2" />
                                    New Zone
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <DataTable
                                columns={[
                                    { key: 'name', label: 'Zone Name' },
                                    {
                                        key: 'type', label: 'Type', render: (row) => (
                                            <Badge variant="outline" className="border-zinc-700">{row.type}</Badge>
                                        )
                                    }
                                ]}
                                data={zones}
                                loading={dataLoading}
                                emptyMessage="No zones configured yet"
                            />
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* TABLES TAB */}
                <TabsContent value="tables">
                    <Card className="border-white/5 bg-zinc-900/50">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-lg font-bold flex items-center gap-2">
                                    <Settings2 className="w-5 h-5 text-zinc-400" />
                                    Physical Tables
                                </CardTitle>
                                <Button size="sm" className="bg-zinc-800 text-white">
                                    <Plus className="w-4 h-4 mr-2" />
                                    Add Table
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <DataTable
                                columns={[
                                    { key: 'name', label: 'Table #' },
                                    { key: 'zone_id', label: 'Zone' },
                                    { key: 'seats', label: 'Capacity' },
                                    {
                                        key: 'status', label: 'Status', render: (row) => (
                                            <Badge variant={row.status === 'available' ? 'default' : 'secondary'} className={cn(row.status === 'available' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "")}>
                                                {row.status}
                                            </Badge>
                                        )
                                    }
                                ]}
                                data={tables}
                                loading={dataLoading}
                                emptyMessage="No tables found"
                            />
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* WIZARD TAB */}
                <TabsContent value="import">
                    <Card className="border-white/5 bg-zinc-900/50 p-12 flex flex-col items-center justify-center text-center">
                        <div className="h-12 w-12 rounded-full bg-zinc-800 flex items-center justify-center mb-4">
                            <Building2 className="h-6 w-6 text-red-500" />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-2">Import/Export Wizard</h3>
                        <p className="text-sm text-zinc-500 max-w-sm mb-6">Bulk upload configuration, menus, and data via CSV or Excel mapping.</p>
                        <Button variant="outline" className="border-white/10 hover:bg-zinc-800" onClick={() => window.location.href = '/manager/menu-import'}>Start Import Wizard</Button>
                    </Card>
                </TabsContent>
            </Tabs>
        </PageContainer>
    );
}