import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/api';
import { toast } from 'sonner';
import PageContainer from '../../layouts/PageContainer';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Switch } from '../../components/ui/switch';
import { Label } from '../../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Badge } from '../../components/ui/badge';
import { Save, Package, Palette, Shield } from 'lucide-react';

export default function SettingsHub() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState(null);
  const [modules, setModules] = useState([]);

  const venueId = user?.venueId || user?.venue_id || localStorage.getItem('restin_venue');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    if (!venueId) {
      setLoading(false);
      return;
    }
    try {
      const [settingsRes, modulesRes] = await Promise.all([
        api.get(`/venues/${venueId}/settings`),
        api.get(`/system/modules`).catch(() => ({
          data: {
            modules: [
              { key: 'pos', title: 'Point of Sale', desc: 'Full POS system with order management', status: 'active' },
              { key: 'kds', title: 'Kitchen Display', desc: 'Kitchen order display system', status: 'active' },
              { key: 'inventory', title: 'Inventory', desc: 'Stock tracking and recipe management', status: 'active' },
              { key: 'hr', title: 'HR & Payroll', desc: 'Employee management and payroll', status: 'active' },
              { key: 'crm', title: 'CRM & Loyalty', desc: 'Guest profiles and loyalty programs', status: 'active' },
              { key: 'reservations', title: 'Reservations', desc: 'Table booking system', status: 'active' },
              { key: 'analytics', title: 'Analytics', desc: 'Reports and dashboards', status: 'active' },
              { key: 'voice', title: 'Voice AI', desc: '24/7 AI phone receptionist', status: 'beta' },
              { key: 'web', title: 'Web Builder', desc: 'Drag & drop website builder', status: 'beta' },
              { key: 'studio', title: 'Content Studio', desc: 'AI-powered content generation', status: 'beta' },
            ]
          }
        }))
      ]);
      setSettings(settingsRes.data.settings || settingsRes.data);
      setModules(modulesRes.data.modules || []);
    } catch (error) {
      console.error('Failed to load settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (updates) => {
    setSaving(true);
    try {
      await api.patch(`/venues/${venueId}/settings`, updates);
      toast.success('Settings saved');
      await loadData();
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const toggleModule = (moduleKey, enabled) => {
    const updates = {
      modules: { ...settings?.modules, [moduleKey]: { enabled } }
    };
    saveSettings(updates);
  };

  return (
    <PageContainer
      title="Settings Hub"
      description="Configure modules and system settings"
      actions={
        <Button onClick={() => loadData()} variant="outline" size="sm">
          <Save className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      }
    >
      <Tabs defaultValue="modules" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="modules">
            <Package className="w-4 h-4 mr-2" />
            Modules
          </TabsTrigger>
          <TabsTrigger value="ui">
            <Palette className="w-4 h-4 mr-2" />
            UI Settings
          </TabsTrigger>
          <TabsTrigger value="security">
            <Shield className="w-4 h-4 mr-2" />
            Security
          </TabsTrigger>
        </TabsList>

        <TabsContent value="modules">
          <Card>
            <CardHeader>
              <CardTitle>Module Configuration</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {modules.map(module => {
                  const isEnabled = settings?.modules?.[module.key]?.enabled || false;
                  return (
                    <div key={module.key} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{module.title}</h4>
                          <Badge variant={module.status === 'active' ? 'default' : 'secondary'}>
                            {module.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{module.desc}</p>
                      </div>
                      <Switch
                        checked={isEnabled}
                        onCheckedChange={(checked) => toggleModule(module.key, checked)}
                        disabled={saving}
                      />
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ui">
          <Card>
            <CardHeader>
              <CardTitle>UI Configuration</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">UI customization options will appear here</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Security options will appear here</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}
