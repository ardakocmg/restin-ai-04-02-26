import { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';

import { useVenue } from '../../context/VenueContext';
import { useAuth } from '../../context/AuthContext';
import PermissionGate from '../../components/shared/PermissionGate';
import { useAuditLog } from '../../hooks/useAuditLog';

import { venueAPI } from '../../lib/api';

import { toast } from 'sonner';

import PageContainer from '../../layouts/PageContainer';

import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';

import { Button } from '../../components/ui/button';

import { Input } from '../../components/ui/input';

import { Label } from '../../components/ui/label';

import { Switch } from '../../components/ui/switch';

import { cn } from '../../lib/utils';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';

import { Badge } from '../../components/ui/badge';

import DataTable from '../../components/shared/DataTable';

import { Save, Building2, Plus } from 'lucide-react';

export default function POSSettings() {
  const { activeVenue, refreshVenues } = useVenue();
  const { user } = useAuth();
  const { logAction } = useAuditLog();
  const [zones, setZones] = useState([]);
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [venueForm, setVenueForm] = useState({});

  // Audit: log POS settings access
  useEffect(() => {
    if (user?.id) logAction('POS_SETTINGS_VIEWED', 'pos_settings');
  }, [user?.id]);

  useEffect(() => {
    if (activeVenue?.id) {
      setVenueForm(activeVenue);
      loadData();
    }
  }, [activeVenue?.id]);

  const loadData = async () => {
    try {
      const [zonesRes, tablesRes] = await Promise.all([
        venueAPI.getZones(activeVenue.id),
        venueAPI.getTables(activeVenue.id)
      ]);
      setZones(zonesRes.data);
      setTables(tablesRes.data);
    } catch (error) {
      logger.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateVenue = async () => {
    try {
      await venueAPI.update(activeVenue.id, venueForm);
      toast.success('Settings saved successfully');
      refreshVenues();
    } catch (error) {
      toast.error('Failed to update settings');
    }
  };

  return (
    <PermissionGate requiredRole="MANAGER">
      <PageContainer
        title="POS Settings & Configuration"
        description="Centralized control for your venue, floor plans, and menu items"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="bg-zinc-900 border-white/5 text-zinc-400">
              Export Config
            </Button>
            <Button onClick={handleUpdateVenue} size="sm" className="bg-red-600 hover:bg-red-700 text-white">
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
          </div>
        }
      >
        <Tabs defaultValue="venue" className="w-full">
          <div className="flex items-center justify-between mb-8 border-b border-white/5 overflow-x-auto">
            <TabsList className="bg-transparent h-12 w-auto justify-start p-0">
              <TabsTrigger value="venue" className="data-[state=active]:bg-transparent data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-red-500 rounded-none h-12 px-6 text-zinc-500">General</TabsTrigger>
              <TabsTrigger value="zones" className="data-[state=active]:bg-transparent data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-red-500 rounded-none h-12 px-6 text-zinc-500">Zones</TabsTrigger>
              <TabsTrigger value="tables" className="data-[state=active]:bg-transparent data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-red-500 rounded-none h-12 px-6 text-zinc-500">Tables</TabsTrigger>
              <TabsTrigger value="products" className="data-[state=active]:bg-transparent data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-red-500 rounded-none h-12 px-6 text-zinc-500">Products/Menu</TabsTrigger>
              <TabsTrigger value="import" className="data-[state=active]:bg-transparent data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-red-500 rounded-none h-12 px-6 text-zinc-500">Import Wizard</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="venue" className="space-y-6">
            <Card className="border-white/5 bg-zinc-900/50 backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="text-lg font-bold">Venue Identity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-xs uppercase text-zinc-500 font-bold">Venue Name</Label>
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
                  <div className="space-y-2">
                    <Label className="text-xs uppercase text-zinc-500 font-bold">Currency</Label>
                    <Input
                      className="bg-zinc-950 border-white/10"
                      value={venueForm.currency || 'EUR'}
                      onChange={(e) => setVenueForm({ ...venueForm, currency: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs uppercase text-zinc-500 font-bold">Timezone</Label>
                    <Input
                      className="bg-zinc-950 border-white/10"
                      value={venueForm.timezone || 'Europe/Malta'}
                      onChange={(e) => setVenueForm({ ...venueForm, timezone: e.target.value })}
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

          <TabsContent value="zones">
            <Card className="border-white/5 bg-zinc-900/50">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-bold">Service Zones</CardTitle>
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
                  loading={loading}
                  emptyMessage="No zones configured yet"
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tables">
            <Card className="border-white/5 bg-zinc-900/50">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-bold">Physical Tables</CardTitle>
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
                  loading={loading}
                  emptyMessage="No tables found"
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="products">
            <Card className="border-white/5 bg-zinc-900/50 p-12 flex flex-col items-center justify-center text-center">
              <div className="h-12 w-12 rounded-full bg-zinc-800 flex items-center justify-center mb-4">
                <Plus className="h-6 w-6 text-zinc-400" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Menu Management Integrated</h3>
              <p className="text-sm text-zinc-500 max-w-sm mb-6">Manage your product catalog, pricing, and category assignments directly from this unified view.</p>
              <Button className="bg-red-600 hover:bg-red-700">Open Catalog</Button>
            </Card>
          </TabsContent>

          <TabsContent value="import">
            <Card className="border-white/5 bg-zinc-900/50 p-12 flex flex-col items-center justify-center text-center">
              <div className="h-12 w-12 rounded-full bg-zinc-800 flex items-center justify-center mb-4">
                <Building2 className="h-6 w-6 text-zinc-400" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Import/Export Wizard</h3>
              <p className="text-sm text-zinc-500 max-w-sm mb-6">Bulk upload menu items via CSV or Excel mapping.</p>
              <Button variant="outline" className="border-white/10 hover:bg-zinc-800" onClick={() => window.location.href = '/admin/menu-import'}>Start Import Wizard</Button>
            </Card>
          </TabsContent>
        </Tabs>
      </PageContainer>
    </PermissionGate>
  );
}