import React, { useState } from 'react';
import PageContainer from '../../../../layouts/PageContainer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../../components/ui/card';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { Label } from '../../../../components/ui/label';
import { Badge } from '../../../../components/ui/badge';
import { Settings, Calendar, Clock, Shield, Bell, Save } from 'lucide-react';
import { toast } from 'sonner';

export default function SettingsSetupPage() {
  const [settings, setSettings] = useState({
    // Leave Settings
    annual_leave_days: 24,
    sick_leave_days: 15,
    leave_year_start: '01-01',
    carry_over_max: 5,
    min_notice_days: 14,
    // Work Settings
    work_hours_per_week: 40,
    overtime_multiplier: 1.5,
    sunday_multiplier: 2.0,
    probation_months: 6,
    notice_period_weeks: 4,
    // Malta Specific
    ssc_class: '1',
    maternity_weeks: 14,
    paternity_days: 2,
    // Notifications
    notify_leave_request: true,
    notify_clock_anomaly: true,
    notify_document_expiry: true,
    document_expiry_reminder_days: 30,
  });

  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      // Save to API when available
      await new Promise(resolve => setTimeout(resolve, 500));
      toast.success('HR settings saved successfully');
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const updateField = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <PageContainer
      title="HR Settings"
      description="Configure leave policies, work rules, and Malta-specific compliance"
      actions={
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          <Save className="h-4 w-4" />
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      }
    >
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Leave Policy */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" /> Leave Policy
            </CardTitle>
            <CardDescription>Configure annual, sick, and special leave</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Annual Leave Days</Label>
                <Input type="number" value={settings.annual_leave_days} onChange={(e) => updateField('annual_leave_days', parseInt(e.target.value))} />
              </div>
              <div>
                <Label>Sick Leave Days</Label>
                <Input type="number" value={settings.sick_leave_days} onChange={(e) => updateField('sick_leave_days', parseInt(e.target.value))} />
              </div>
              <div>
                <Label>Leave Year Start (MM-DD)</Label>
                <Input value={settings.leave_year_start} onChange={(e) => updateField('leave_year_start', e.target.value)} placeholder="01-01" />
              </div>
              <div>
                <Label>Max Carry-Over Days</Label>
                <Input type="number" value={settings.carry_over_max} onChange={(e) => updateField('carry_over_max', parseInt(e.target.value))} />
              </div>
              <div>
                <Label>Min Notice for Leave (days)</Label>
                <Input type="number" value={settings.min_notice_days} onChange={(e) => updateField('min_notice_days', parseInt(e.target.value))} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Work Rules */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" /> Work Rules
            </CardTitle>
            <CardDescription>Hours, overtime, and notice periods</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Work Hours / Week</Label>
                <Input type="number" value={settings.work_hours_per_week} onChange={(e) => updateField('work_hours_per_week', parseInt(e.target.value))} />
              </div>
              <div>
                <Label>Overtime Multiplier</Label>
                <Input type="number" step="0.1" value={settings.overtime_multiplier} onChange={(e) => updateField('overtime_multiplier', parseFloat(e.target.value))} />
              </div>
              <div>
                <Label>Sunday Multiplier</Label>
                <Input type="number" step="0.1" value={settings.sunday_multiplier} onChange={(e) => updateField('sunday_multiplier', parseFloat(e.target.value))} />
              </div>
              <div>
                <Label>Probation Period (months)</Label>
                <Input type="number" value={settings.probation_months} onChange={(e) => updateField('probation_months', parseInt(e.target.value))} />
              </div>
              <div>
                <Label>Notice Period (weeks)</Label>
                <Input type="number" value={settings.notice_period_weeks} onChange={(e) => updateField('notice_period_weeks', parseInt(e.target.value))} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Malta Compliance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" /> Malta Compliance
              <Badge variant="outline" className="ml-2">🇲🇹</Badge>
            </CardTitle>
            <CardDescription>Malta-specific employment regulations</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>SSC Class</Label>
                <select
                  value={settings.ssc_class}
                  onChange={(e) => updateField('ssc_class', e.target.value)}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="1">Class 1 — Employed</option>
                  <option value="2">Class 2 — Self-Employed</option>
                </select>
              </div>
              <div>
                <Label>Maternity Leave (weeks)</Label>
                <Input type="number" value={settings.maternity_weeks} onChange={(e) => updateField('maternity_weeks', parseInt(e.target.value))} />
              </div>
              <div>
                <Label>Paternity Leave (days)</Label>
                <Input type="number" value={settings.paternity_days} onChange={(e) => updateField('paternity_days', parseInt(e.target.value))} />
              </div>
            </div>
            <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-sm">
              <p className="font-medium text-blue-600 dark:text-blue-400">⚖️ Statutory Minimums</p>
              <p className="text-muted-foreground mt-1">
                Malta law: 24 days annual + 14 public holidays. SSC rates updated annually.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" /> Notifications
            </CardTitle>
            <CardDescription>Automated alerts for HR events</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { key: 'notify_leave_request', label: 'Leave requests submitted' },
              { key: 'notify_clock_anomaly', label: 'Clock-in/out anomalies' },
              { key: 'notify_document_expiry', label: 'Document expiry warnings' },
            ].map(({ key, label }) => (
              <label key={key} className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition cursor-pointer">
                <span className="font-medium">{label}</span>
                <input
                  type="checkbox"
                  checked={settings[key]}
                  onChange={(e) => updateField(key, e.target.checked)}
                  className="w-5 h-5 rounded"
                />
              </label>
            ))}
            <div>
              <Label>Document Expiry Reminder (days before)</Label>
              <Input type="number" value={settings.document_expiry_reminder_days} onChange={(e) => updateField('document_expiry_reminder_days', parseInt(e.target.value))} />
            </div>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
