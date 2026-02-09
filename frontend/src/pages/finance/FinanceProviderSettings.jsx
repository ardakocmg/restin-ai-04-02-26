import React, { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';

import { useVenue } from '../../context/VenueContext';

import api from '../../lib/api';

import PageContainer from '../../layouts/PageContainer';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';

import { Button } from '../../components/ui/button';

import { Input } from '../../components/ui/input';

import { Label } from '../../components/ui/label';

import { Badge } from '../../components/ui/badge';

import { Settings, CheckCircle2, XCircle, Link2 } from 'lucide-react';

import { toast } from 'sonner';

export default function FinanceProviderSettings() {
  const { activeVenue } = useVenue();
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (activeVenue?.id) {
      loadSettings();
    }
  }, [activeVenue?.id]);

  const loadSettings = async () => {
    try {
      const res = await api.get(`/finance-provider/settings?venue_id=${activeVenue.id}`);
      setSettings(res.data?.data);
    } catch (error) {
      logger.error('Provider settings error:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      await api.put(`/finance-provider/settings?venue_id=${activeVenue.id}`, settings);
      toast.success('Settings saved successfully!');
    } catch (error) {
      logger.error('Save error:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (!settings) return null;

  return (
    <PageContainer
      title="Finance Provider Integration"
      description="Connect to external payroll & accounting systems (vendor-agnostic)"
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Connection Settings
            </CardTitle>
            <CardDescription>Configure external finance system connection</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              {settings.enabled ? (
                <Badge className="bg-green-100 text-green-700">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  ENABLED
                </Badge>
              ) : (
                <Badge variant="secondary">
                  <XCircle className="h-3 w-3 mr-1" />
                  DISABLED
                </Badge>
              )}
            </div>

            <div>
              <Label>Provider Name (Your Label)</Label>
              <Input
                value={settings.provider_label || ''}
                onChange={(e) => setSettings({ ...settings, provider_label: e.target.value })}
                placeholder="e.g., Payroll System A"
              />
            </div>

            <div>
              <Label>Integration Mode</Label>
              <select
                value={settings.mode || 'EXPORT_ONLY'}
                onChange={(e) => setSettings({ ...settings, mode: e.target.value })}
                className="w-full p-2 border rounded"
              >
                <option value="EXPORT_ONLY">Export Only (File-based)</option>
                <option value="API_PUSH">API Push</option>
                <option value="API_PULL">API Pull</option>
                <option value="HYBRID">Hybrid (Push + Pull)</option>
              </select>
            </div>

            <div>
              <Label>Company Code</Label>
              <Input
                value={settings.company_code || ''}
                onChange={(e) => setSettings({ ...settings, company_code: e.target.value })}
                placeholder="Your company code in external system"
              />
            </div>

            <Button onClick={saveSettings} disabled={saving} className="w-full">
              {saving ? 'Saving...' : 'Save Settings'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5" />
              Integration Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-sm font-medium text-blue-900 mb-2">Vendor-Agnostic Design</p>
              <p className="text-xs text-blue-700">
                This integration works with ANY Malta-compliant payroll/accounting system.
                No brand lock-in. Configure your preferred provider.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between p-2 bg-slate-50 rounded">
                <span className="text-sm">Mode:</span>
                <Badge variant="outline">{settings.mode}</Badge>
              </div>
              <div className="flex items-center justify-between p-2 bg-slate-50 rounded">
                <span className="text-sm">Provider:</span>
                <span className="text-sm font-medium">{settings.provider_label}</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-slate-50 rounded">
                <span className="text-sm">Status:</span>
                <Badge variant={settings.enabled ? 'default' : 'secondary'}>
                  {settings.enabled ? 'ACTIVE' : 'INACTIVE'}
                </Badge>
              </div>
            </div>

            <Button variant="outline" className="w-full">
              Test Connection
            </Button>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}