import { useState, useEffect } from "react";
import { useVenue } from "../../context/VenueContext";
import { useAuth } from "../../context/AuthContext";
import { venueAPI } from "../../lib/api";
import api from "../../lib/api";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Switch } from "../../components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { MapPin, Table2, Plus, Settings, Package, ChevronDown, ChevronUp, Upload, Loader2, Building2, ExternalLink } from "lucide-react";
import { documentAPI } from "../../lib/api";
import { cn } from "../../lib/utils";
import { useNavigate } from "react-router-dom";

export default function VenueSettings() {
  const { activeVenue, refreshVenues } = useVenue();
  const { isManager } = useAuth();
  const [zones, setZones] = useState([]);
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showZoneDialog, setShowZoneDialog] = useState(false);
  const [showTableDialog, setShowTableDialog] = useState(false);

  // Form state
  const [venueForm, setVenueForm] = useState({});
  const [newZone, setNewZone] = useState({ name: "", type: "dining" });
  const [newTable, setNewTable] = useState({ zone_id: "", name: "", seats: 4 });
  const [uploading, setUploading] = useState(false);
  const [legalEntities, setLegalEntities] = useState([]);
  const navigate = useNavigate();

  const [venueModules, setVenueModules] = useState([]);
  const [expandedModule, setExpandedModule] = useState(null);

  const MODULES_LIST = [
    { id: 'ops', title: 'OPERATIONS', desc: 'Complimentary items, specials, low stock push', status: 'active' },
    { id: 'people', title: 'PEOPLE', desc: 'Staff, users, roles, shifts', status: 'active' },
    { id: 'menu', title: 'MENU', desc: 'Menu management, modifiers, pricing', status: 'active' },
    { id: 'inventory', title: 'INVENTORY', desc: 'Stock ledger, recipes, procurement', status: 'active' },
    { id: 'reservations', title: 'RESERVATIONS', desc: 'Table booking, guest tracking', status: 'active' },
    { id: 'devices', title: 'DEVICES', desc: 'KDS, POS stations, printer mapping', status: 'active' },
    { id: 'observability', title: 'OBSERVABILITY', desc: 'System logs, error inbox, test panel', status: 'active' },
    { id: 'exports', title: 'EXPORTS', desc: 'CSV/Excel reporting, data sync', status: 'active' },
    { id: 'finance', title: 'FINANCE', desc: 'Invoicing, accounting, cost analysis', status: 'active' },
    { id: 'analytics', title: 'ANALYTICS', desc: 'Sales pace, KDS timing, revenue insights', status: 'planned' },
    { id: 'payroll', title: 'PAYROLL (MALTA)', desc: 'Payroll processing, tax compliance', status: 'planned' },
    { id: 'crm', title: 'CRM', desc: 'Guest profiles, visit history, preferences', status: 'planned' },
    { id: 'loyalty', title: 'LOYALTY', desc: 'Tiers, points, rewards', status: 'planned' },
    { id: 'automations', title: 'AUTOMATIONS', desc: 'Email/WhatsApp/Telegram responders', status: 'planned' },
    { id: 'connectors', title: 'API CONNECTORS', desc: 'Admin-configurable integrations', status: 'planned' },
  ];

  useEffect(() => {
    if (activeVenue?.id) {
      setVenueForm(activeVenue);
      loadData();
    }
  }, [activeVenue?.id]);

  useEffect(() => {
    const fetchLegalEntities = async () => {
      try {
        const res = await api.get('/api/legal-entities');
        setLegalEntities(res.data?.legal_entities || []);
      } catch { /* silent */ }
    };
    fetchLegalEntities();
  }, []);

  const loadData = async () => {
    try {
      const [zonesRes, tablesRes] = await Promise.all([
        venueAPI.getZones(activeVenue.id),
        venueAPI.getTables(activeVenue.id)
      ]);
      setZones(zonesRes.data);
      setTables(tablesRes.data);
    } catch (error: any) {
      console.error("Failed to load data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateVenue = async () => {
    try {
      await venueAPI.update(activeVenue.id, venueForm);
      toast.success("Venue updated");
      refreshVenues();
    } catch (error: any) {
      toast.error("Failed to update venue");
    }
  };

  const handleCreateZone = async () => {
    try {
      await venueAPI.createZone({ venue_id: activeVenue.id, ...newZone });
      toast.success("Zone created");
      setShowZoneDialog(false);
      setNewZone({ name: "", type: "dining" });
      loadData();
    } catch (error: any) {
      toast.error("Failed to create zone");
    }
  };

  const handleCreateTable = async () => {
    try {
      await venueAPI.createTable({ venue_id: activeVenue.id, ...newTable });
      toast.success("Table created");
      setShowTableDialog(false);
      setNewTable({ zone_id: "", name: "", seats: 4 });
      loadData();
    } catch (error: any) {
      toast.error("Failed to create table");
    }
  };
  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const response = await documentAPI.upload(activeVenue.id, file);
      // Construct the URL based on the document ID or returned path
      // Assuming documentAPI.upload returns { id, url, ... }
      const logoUrl = response.data.url;
      setVenueForm({
        ...venueForm,
        branding: { ...(venueForm.branding || {}), logo_url: logoUrl }
      });
      toast.success("Logo uploaded successfully");
    } catch (error: any) {
      console.error("Upload failed:", error);
      toast.error("Failed to upload logo");
    } finally {
      setUploading(false);
    }
  };

  if (!activeVenue) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Please select a venue
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold text-zinc-900 dark:text-foreground">Venue Settings</h1>
          <p className="text-muted-foreground dark:text-muted-foreground mt-1">{activeVenue.name}</p>
        </div>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <div className="mb-8 p-1 bg-zinc-100 dark:bg-card/50 border border-zinc-200 dark:border-border rounded-xl inline-flex h-12">
          <TabsList className="bg-transparent border-none p-0 flex gap-2 h-full">
            <TabsTrigger value="general" className="font-black uppercase tracking-widest text-[10px] data-[state=active]:bg-red-600 data-[state=active]:text-foreground data-[state=active]:shadow-md px-6 h-full rounded-lg text-muted-foreground dark:text-muted-foreground">General</TabsTrigger>
            <TabsTrigger value="branding" className="font-black uppercase tracking-widest text-[10px] data-[state=active]:bg-red-600 data-[state=active]:text-foreground data-[state=active]:shadow-md px-6 h-full rounded-lg text-muted-foreground dark:text-muted-foreground">Branding</TabsTrigger>
            <TabsTrigger value="zones" className="font-black uppercase tracking-widest text-[10px] data-[state=active]:bg-red-600 data-[state=active]:text-foreground data-[state=active]:shadow-md px-6 h-full rounded-lg text-muted-foreground dark:text-muted-foreground">Zones</TabsTrigger>
            <TabsTrigger value="tables" className="font-black uppercase tracking-widest text-[10px] data-[state=active]:bg-red-600 data-[state=active]:text-foreground data-[state=active]:shadow-md px-6 h-full rounded-lg text-muted-foreground dark:text-muted-foreground">Tables</TabsTrigger>
            <TabsTrigger value="modules" className="font-black uppercase tracking-widest text-[10px] data-[state=active]:bg-red-600 data-[state=active]:text-foreground data-[state=active]:shadow-md px-6 h-full rounded-lg text-muted-foreground dark:text-muted-foreground">Modules</TabsTrigger>
          </TabsList>
        </div>

        {/* General Settings */}
        <TabsContent value="general">
          <Card className="bg-white dark:bg-card/50 border-zinc-200 dark:border-border">
            <CardHeader>
              <CardTitle className="text-zinc-900 dark:text-foreground font-heading flex items-center gap-2">
                <Settings className="w-5 h-5 text-muted-foreground dark:text-muted-foreground" />
                General Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-4">
                  <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-2 block">Venue Name</Label>
                  <Input
                    data-testid="venue-name-input"
                    value={venueForm.name || ""}
                    onChange={(e) => setVenueForm({ ...venueForm, name: e.target.value })}
                    className="bg-zinc-50 dark:bg-background border-zinc-200 dark:border-border text-zinc-900 dark:text-foreground font-bold h-14 focus:ring-red-500/50 text-lg"
                    disabled={!isManager()}
                  />
                </div>
                <div className="space-y-4">
                  <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-2 block">Venue Type</Label>
                  <Select
                    value={venueForm.type || ""}
                    onValueChange={(v) => setVenueForm({ ...venueForm, type: v })}
                    disabled={!isManager()}
                  >
                    <SelectTrigger data-testid="venue-type-select" className="bg-background border-border text-foreground font-bold h-14 text-lg">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border shadow-2xl">
                      <SelectItem value="fine_dining" className="font-bold text-foreground uppercase tracking-tighter">Fine Dining</SelectItem>
                      <SelectItem value="casual" className="font-bold text-foreground uppercase tracking-tighter">Casual</SelectItem>
                      <SelectItem value="bar" className="font-bold text-foreground uppercase tracking-tighter">Bar</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="border-t border-zinc-200 dark:border-border pt-6">
                <h3 className="text-lg font-heading text-zinc-900 dark:text-foreground mb-4">Course Pacing</h3>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-zinc-900 dark:text-foreground">Enable Course Pacing</p>
                    <p className="text-sm text-muted-foreground dark:text-muted-foreground">Control course timing for fine dining</p>
                  </div>
                  <Switch
                    data-testid="pacing-switch"
                    checked={venueForm.pacing_enabled || false}
                    onCheckedChange={(v) => setVenueForm({ ...venueForm, pacing_enabled: v })}
                    disabled={!isManager()}
                  />
                </div>
                {venueForm.pacing_enabled && (
                  <div className="mt-4 space-y-2">
                    <Label className="text-secondary-foreground">Pacing Interval (minutes)</Label>
                    <Input
                      data-testid="pacing-interval-input"
                      type="number"
                      value={venueForm.pacing_interval_minutes || 15}
                      onChange={(e) => setVenueForm({ ...venueForm, pacing_interval_minutes: parseInt(e.target.value) })}
                      className="bg-zinc-50 dark:bg-secondary border-zinc-200 dark:border-border text-zinc-900 dark:text-foreground w-32"
                      disabled={!isManager()}
                    />
                  </div>
                )}
              </div>

              <div className="border-t border-zinc-200 dark:border-border pt-6">
                <h3 className="text-lg font-heading text-zinc-900 dark:text-foreground mb-4">Review Policy</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-secondary-foreground">Low Risk Threshold (0-100)</Label>
                    <Input
                      data-testid="low-threshold-input"
                      type="number"
                      min="0"
                      max="100"
                      value={venueForm.review_policy_low_threshold || 30}
                      onChange={(e) => setVenueForm({ ...venueForm, review_policy_low_threshold: parseInt(e.target.value) })}
                      className="bg-zinc-50 dark:bg-secondary border-zinc-200 dark:border-border text-zinc-900 dark:text-foreground"
                      disabled={!isManager()}
                    />
                    <p className="text-xs text-muted-foreground">Review QR visible for scores 0-{venueForm.review_policy_low_threshold || 30}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-secondary-foreground">Medium Risk Threshold (0-100)</Label>
                    <Input
                      data-testid="medium-threshold-input"
                      type="number"
                      min="0"
                      max="100"
                      value={venueForm.review_policy_medium_threshold || 60}
                      onChange={(e) => setVenueForm({ ...venueForm, review_policy_medium_threshold: parseInt(e.target.value) })}
                      className="bg-zinc-50 dark:bg-secondary border-zinc-200 dark:border-border text-zinc-900 dark:text-foreground"
                      disabled={!isManager()}
                    />
                    <p className="text-xs text-muted-foreground">Manager override for scores {(venueForm.review_policy_low_threshold || 30) + 1}-{venueForm.review_policy_medium_threshold || 60}</p>
                  </div>
                </div>
              </div>

              {/* Legal Entity Link */}
              <div className="border-t border-zinc-200 dark:border-border pt-6">
                <h3 className="text-lg font-heading text-zinc-900 dark:text-foreground mb-4 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-violet-400" />
                  Legal Entity
                </h3>
                <div className="space-y-3">
                  <Select
                    value={venueForm.legal_entity_id || ""}
                    onValueChange={(v) => setVenueForm({ ...venueForm, legal_entity_id: v === "none" ? "" : v })}
                    disabled={!isManager()}
                  >
                    <SelectTrigger className="bg-zinc-50 dark:bg-background border-zinc-200 dark:border-border text-zinc-900 dark:text-foreground h-12">
                      <SelectValue placeholder="Select a legal entity..." />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      <SelectItem value="none" className="text-muted-foreground">No legal entity</SelectItem>
                      {legalEntities.map(le => (
                        <SelectItem key={le._id} value={le._id} className="text-foreground">
                          {le.registered_name}{le.vat_number ? ` (${le.vat_number})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <button
                    onClick={() => navigate('/manager/legal-entities')}
                    className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1 transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Manage Legal Entities
                  </button>
                </div>
              </div>

              {isManager() && (
                <Button
                  data-testid="save-venue-btn"
                  onClick={handleUpdateVenue}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  Save Changes
                </Button>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Branding Tab (logo + accent color only — legal info is in Legal Entities page) */}
        <TabsContent value="branding">
          <Card className="bg-card/50 border-border">
            <CardHeader>
              <CardTitle className="text-foreground font-heading flex items-center gap-2 text-sm uppercase tracking-widest">
                Venue Branding
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 p-6">
              <div className="space-y-4">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Establishment Logo</Label>
                <div className="flex gap-4 items-start">
                  <div className="flex-1 space-y-2">
                    <Input
                      value={venueForm.branding?.logo_url || ""}
                      onChange={(e) => setVenueForm({ ...venueForm, branding: { ...(venueForm.branding || {}), logo_url: e.target.value } })}
                      className="bg-background border-border text-foreground"
                      placeholder="Paste Logo URL or Upload ->"
                    />
                    <p className="text-[10px] text-muted-foreground italic">Accepts direct URLs or uploaded files.</p>
                  </div>
                  <div className="relative">
                    <input
                      type="file"
                      id="logo-upload"
                      className="hidden"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      disabled={uploading}
                    />
                    <Button
                      asChild
                      variant="outline"
                      className="bg-card border-border text-foreground cursor-pointer hover:bg-secondary"
                    >
                      <label htmlFor="logo-upload">
                        {uploading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Upload className="w-4 h-4 mr-2" />
                        )}
                        {uploading ? 'Uploading...' : 'Upload'}
                      </label>
                    </Button>
                  </div>
                </div>
                {venueForm.branding?.logo_url && (
                  <div className="mt-2 p-4 bg-white rounded-lg flex items-center justify-center relative group"> {/* eslint-disable-line restin-guardrails/no-hardcoded-colors */}
                    <img src={venueForm.branding.logo_url} alt="Logo Preview" className="max-h-12 object-contain" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-lg">
                      <span className="text-[10px] font-black text-foreground uppercase tracking-widest">Preview</span>
                    </div>
                  </div>
                )}
              </div>
              <div className="space-y-4">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Document Accent Color</Label>
                <div className="flex gap-3">
                  <Input
                    type="color"
                    value={venueForm.branding?.primary_color || "#dc2626"}
                    onChange={(e) => setVenueForm({ ...venueForm, branding: { ...(venueForm.branding || {}), primary_color: e.target.value } })}
                    className="bg-background border-border w-12 h-10 p-1"
                  />
                  <Input
                    value={venueForm.branding?.primary_color || "#dc2626"}
                    onChange={(e) => setVenueForm({ ...venueForm, branding: { ...(venueForm.branding || {}), primary_color: e.target.value } })}
                    className="bg-background border-border text-foreground font-mono"
                  />
                </div>
              </div>
              {isManager() && (
                <Button
                  onClick={handleUpdateVenue}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 h-12 font-black uppercase tracking-widest"
                  disabled={!isManager()}
                >
                  Save Branding
                </Button>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Zones */}
        <TabsContent value="zones">
          <Card className="bg-card/50 border-border">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-foreground font-heading flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Zones / Prep Areas
              </CardTitle>
              {isManager() && (
                <Dialog open={showZoneDialog} onOpenChange={setShowZoneDialog}>
                  <DialogTrigger asChild>
                    <Button data-testid="add-zone-btn" className="bg-primary text-primary-foreground hover:bg-primary/90">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Zone
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-card border-border">
                    <DialogHeader>
                      <DialogTitle className="text-foreground">Add New Zone</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-secondary-foreground">Zone Name</Label>
                        <Input
                          data-testid="new-zone-name"
                          value={newZone.name}
                          onChange={(e) => setNewZone({ ...newZone, name: e.target.value })}
                          className="bg-secondary border-border text-foreground"
                          placeholder="e.g., Main Kitchen"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-secondary-foreground">Type</Label>
                        <Select value={newZone.type} onValueChange={(v) => setNewZone({ ...newZone, type: v })}>
                          <SelectTrigger data-testid="new-zone-type" className="bg-secondary border-border text-foreground">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-card border-border">
                            <SelectItem value="dining">Dining</SelectItem>
                            <SelectItem value="bar">Bar</SelectItem>
                            <SelectItem value="kitchen">Kitchen</SelectItem>
                            <SelectItem value="prep">Prep Area</SelectItem>
                            <SelectItem value="pass">Pass/Expo</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        data-testid="create-zone-btn"
                        onClick={handleCreateZone}
                        className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                      >
                        Create Zone
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {zones.map(zone => (
                  <div
                    key={zone.id}
                    data-testid={`zone-${zone.id}`}
                    className="p-4 rounded-lg bg-zinc-50 dark:bg-secondary/50 border border-zinc-200 dark:border-border"
                  >
                    <h4 className="text-zinc-900 dark:text-foreground font-medium">{zone.name}</h4>
                    <p className="text-muted-foreground text-sm capitalize">{zone.type}</p>
                    <p className="text-muted-foreground text-xs mt-2">
                      {tables.filter(t => t.zone_id === zone.id).length} tables
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tables */}
        <TabsContent value="tables">
          <Card className="bg-white dark:bg-card/50 border-zinc-200 dark:border-border">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-zinc-900 dark:text-foreground font-heading flex items-center gap-2">
                <Table2 className="w-5 h-5" />
                Tables
              </CardTitle>
              {isManager() && (
                <Dialog open={showTableDialog} onOpenChange={setShowTableDialog}>
                  <DialogTrigger asChild>
                    <Button data-testid="add-table-btn" className="bg-primary text-primary-foreground hover:bg-primary/90">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Table
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-card border-border">
                    <DialogHeader>
                      <DialogTitle className="text-foreground">Add New Table</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-secondary-foreground">Zone</Label>
                        <Select value={newTable.zone_id} onValueChange={(v) => setNewTable({ ...newTable, zone_id: v })}>
                          <SelectTrigger data-testid="new-table-zone" className="bg-secondary border-border text-foreground">
                            <SelectValue placeholder="Select zone" />
                          </SelectTrigger>
                          <SelectContent className="bg-card border-border">
                            {zones.map(zone => (
                              <SelectItem key={zone.id} value={zone.id}>{zone.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-secondary-foreground">Table Name</Label>
                        <Input
                          data-testid="new-table-name"
                          value={newTable.name}
                          onChange={(e) => setNewTable({ ...newTable, name: e.target.value })}
                          className="bg-secondary border-border text-foreground"
                          placeholder="e.g., Table 1"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-secondary-foreground">Seats</Label>
                        <Input
                          data-testid="new-table-seats"
                          type="number"
                          value={newTable.seats}
                          onChange={(e) => setNewTable({ ...newTable, seats: parseInt(e.target.value) })}
                          className="bg-secondary border-border text-foreground"
                        />
                      </div>
                      <Button
                        data-testid="create-table-btn"
                        onClick={handleCreateTable}
                        className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                      >
                        Create Table
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </CardHeader>
            <CardContent>
              {zones.map(zone => {
                const zoneTables = tables.filter(t => t.zone_id === zone.id);
                if (zoneTables.length === 0) return null;

                return (
                  <div key={zone.id} className="mb-6">
                    <h4 className="text-muted-foreground text-sm uppercase tracking-wide mb-3">{zone.name}</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                      {zoneTables.map(table => (
                        <div
                          key={table.id}
                          data-testid={`table-${table.id}`}
                          className={`p-3 rounded-lg border text-center cursor-pointer transition-colors ${table.status === "occupied"
                            ? "bg-red-500/10 border-red-500/30"
                            : table.status === "reserved"
                              ? "bg-blue-500/10 border-blue-500/30"
                              : "bg-secondary/50 border-border hover:border-border"
                            }`}
                        >
                          <p className="text-foreground font-medium text-sm">{table.name}</p>
                          <p className="text-muted-foreground text-xs">{table.seats} seats</p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>
        {/* Modules */}
        <TabsContent value="modules">
          <Card className="bg-white dark:bg-background border-zinc-200 dark:border-border shadow-2xl overflow-hidden">
            <CardHeader className="border-b border-border bg-card/50 p-6">
              <CardTitle className="text-sm font-black uppercase tracking-[0.2em] text-foreground flex items-center gap-2">
                <Package className="w-4 h-4 text-red-500" />
                Module Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-white/5">
                {MODULES_LIST.map((module) => {
                  const isActive = module.status === 'active';
                  const isExpanded = expandedModule === module.id;
                  const isEnabled = venueModules.includes(module.id) || (isActive && !venueModules.length);

                  return (
                    <div key={module.id} className="group">
                      <div
                        className="flex items-center justify-between p-6 hover:bg-white/[0.02] transition-all cursor-pointer"
                        onClick={() => setExpandedModule(isExpanded ? null : module.id)}
                      >
                        <div className="flex items-center gap-6">
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center border transition-all",
                            isActive ? "bg-red-500/10 border-red-500/20 text-red-500" : "bg-card border-border text-muted-foreground"
                          )}>
                            <Package className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-3">
                              <h3 className={cn(
                                "text-sm font-black uppercase tracking-widest",
                                isActive ? "text-foreground" : "text-muted-foreground"
                              )}>
                                {module.title}
                              </h3>
                              <span className={cn(
                                "px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter",
                                isActive ? "bg-red-500/10 text-red-500" : "bg-card text-muted-foreground"
                              )}>
                                {module.status}
                              </span>
                            </div>
                            <p className="text-xs font-bold text-muted-foreground mt-1 uppercase tracking-tight">
                              {module.desc}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          {isActive && (
                            <Switch
                              checked={isEnabled}
                              onCheckedChange={() => { }}
                              className="data-[state=checked]:bg-red-600"
                            />
                          )}
                          <div className="text-muted-foreground group-hover:text-foreground transition-colors">
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </div>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="px-6 pb-6 pt-0 bg-zinc-50 dark:bg-card/30">
                          <div className="pl-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4 border-t border-zinc-200 dark:border-border">
                            <div className="p-4 rounded-xl bg-white dark:bg-background border border-zinc-200 dark:border-border">
                              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Configuration</p>
                              <p className="text-xs font-bold text-zinc-900 dark:text-foreground uppercase tracking-tight">Advanced Settings</p>
                            </div>
                            <div className="p-4 rounded-xl bg-white dark:bg-background border border-zinc-200 dark:border-border">
                              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Status</p>
                              <p className="text-xs font-bold text-green-600 dark:text-green-500 uppercase tracking-tight">System Ready</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
