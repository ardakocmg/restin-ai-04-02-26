import React, { useState, useCallback } from 'react';
import { logger } from '@/lib/logger';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  User, Mail, Shield, Eye, EyeOff, Smartphone, Download,
  AlertCircle, CheckCircle2, Save, Loader2, LayoutDashboard,
  Calendar, FileText, DollarSign, Clock, Lock, Globe, Palette,
  BellRing, KeyRound
} from 'lucide-react';
import { useUserSettings } from '../context/UserSettingsContext';
import { useDesignSystem } from '../context/DesignSystemContext';
import { useAuth } from '../context/AuthContext';
import { QRCodeSVG } from 'qrcode.react';
import { useVenue } from '../context/VenueContext';
import api from '../lib/api';

const EmployeePortalComplete = React.lazy(() => import('./admin/hr/EmployeePortalComplete'));

export default function UserProfileSettings() {
  // ─── Hooks ───────────────────────────────────────────────────────
  const { user } = useAuth();
  const { settings, updateSettings, enable2FA, verify2FA, disable2FA, loading: settingsLoading } = useUserSettings();
  const { themeMode, toggleTheme } = useDesignSystem();
  const { activeVenue } = useVenue();

  // Guard: user not loaded yet (not authenticated or token expired)
  if (!user) {
    return (
      <div className="container max-w-5xl mx-auto p-6 space-y-6">
        <div className="text-center py-16">
          <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold text-foreground">Not Authenticated</h2>
          <p className="text-muted-foreground mt-2">Please log in to access your profile settings.</p>
        </div>
      </div>
    );
  }

  // ─── Global UI state ─────────────────────────────────────────────
  const [message, setMessage] = useState(null);
  const clearMessage = useCallback(() => { setTimeout(() => setMessage(null), 4000); }, []);

  // ─── Profile Tab State ───────────────────────────────────────────
  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
  });
  const [profileSaving, setProfileSaving] = useState(false);

  React.useEffect(() => {
    if (user) {
      setProfileForm({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
      });
    }
  }, [user]);

  const handleProfileSave = async () => {
    try {
      setProfileSaving(true);
      await api.patch(`/users/${user.id}/profile`, profileForm);
      setMessage({ type: 'success', text: 'Profile updated successfully.' });
      clearMessage();
    } catch (err) {
      logger.error('Profile save failed', err);
      setMessage({ type: 'error', text: 'Failed to update profile.' });
      clearMessage();
    } finally {
      setProfileSaving(false);
    }
  };

  // ─── Security Tab State ──────────────────────────────────────────
  const [twoFASetup, setTwoFASetup] = useState(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [pinForm, setPinForm] = useState({ currentPin: '', newPin: '', confirmPin: '' });
  const [pinSaving, setPinSaving] = useState(false);

  const handleEnable2FA = async () => {
    try {
      const result = await enable2FA();
      if (result.success) {
        setTwoFASetup({ qrCode: result.qrCode || '', backupCodes: result.backupCodes || [] });
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to enable 2FA' });
        clearMessage();
      }
    } catch (err) {
      logger.error('Enable 2FA failed', err);
      setMessage({ type: 'error', text: 'Failed to start 2FA setup' });
      clearMessage();
    }
  };

  const handleVerify2FA = async () => {
    try {
      const result = await verify2FA(verificationCode);
      if (result.success) {
        setMessage({ type: 'success', text: '2FA enabled successfully!' });
        setTwoFASetup(null);
        setVerificationCode('');
        clearMessage();
      } else {
        setMessage({ type: 'error', text: result.error || 'Invalid code' });
        clearMessage();
      }
    } catch (err) {
      logger.error('Verify 2FA failed', err);
    }
  };

  const handleDisable2FA = async () => {
    try {
      const result = await disable2FA('');
      if (result.success) {
        setMessage({ type: 'success', text: '2FA has been disabled.' });
        clearMessage();
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to disable 2FA' });
        clearMessage();
      }
    } catch (err) {
      logger.error('Disable 2FA failed', err);
    }
  };

  const downloadBackupCodes = () => {
    if (!twoFASetup?.backupCodes) return;
    const blob = new Blob([twoFASetup.backupCodes.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'restin-backup-codes.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePinChange = async () => {
    if (pinForm.newPin !== pinForm.confirmPin) {
      setMessage({ type: 'error', text: 'New PIN and confirmation do not match.' });
      clearMessage();
      return;
    }
    if (pinForm.newPin.length < 4) {
      setMessage({ type: 'error', text: 'PIN must be at least 4 digits.' });
      clearMessage();
      return;
    }
    try {
      setPinSaving(true);
      await api.post(`/auth/change-pin`, {
        user_id: user.id,
        current_pin: pinForm.currentPin,
        new_pin: pinForm.newPin,
      });
      setMessage({ type: 'success', text: 'PIN updated successfully.' });
      setPinForm({ currentPin: '', newPin: '', confirmPin: '' });
      clearMessage();
    } catch (err) {
      logger.error('PIN change failed', err);
      setMessage({ type: 'error', text: err?.response?.data?.detail || 'Failed to change PIN.' });
      clearMessage();
    } finally {
      setPinSaving(false);
    }
  };

  // ─── Notification Toggle Handler ─────────────────────────────────
  const handleSettingToggle = async (key, value) => {
    const ok = await updateSettings({ [key]: value });
    if (ok) {
      setMessage({ type: 'success', text: `${key.replace(/([A-Z])/g, ' $1')} updated.` });
      clearMessage();
    }
  };

  // ─── Work & Pay Tab State ────────────────────────────────────────
  const [documents, setDocuments] = useState([]);
  const [payslips, setPayslips] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [tips, setTips] = useState([]);
  const [employeeLoading, setEmployeeLoading] = useState(false);

  React.useEffect(() => {
    if (user && activeVenue) {
      loadEmployeeData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, activeVenue]);

  const loadEmployeeData = async () => {
    try {
      setEmployeeLoading(true);
      const [docsRes, shiftsRes, tipsRes] = await Promise.all([
        api.get(`/documents?entity_type=user&entity_id=${user.id}`).catch(() => ({ data: [] })),
        activeVenue ? api.get(`/venues/${activeVenue.id}/shifts?user_id=${user.id}`).catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
        api.get(`/employee/tips?user_id=${user.id}`).catch(() => ({ data: [] }))
      ]);
      const docsData = docsRes.data || [];
      setDocuments(docsData);
      setShifts(shiftsRes.data || []);
      setTips(tipsRes.data || []);
      setPayslips(docsData.filter(d => d.category === 'payslip'));
    } catch (error) {
      logger.error('Failed to load employee data:', error);
    } finally {
      setEmployeeLoading(false);
    }
  };

  const totalTips = tips.reduce((sum, t) => sum + (t.amount || 0), 0);
  const upcomingShifts = shifts.filter(s => new Date(s.start_time) > new Date());

  // ─── Render ──────────────────────────────────────────────────────
  return (
    <div className="container max-w-5xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Profile & Settings</h1>
          <p className="text-muted-foreground">Manage your personal information, security, and work details</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="py-1.5 px-3 text-sm">
            <User className="w-3.5 h-3.5 mr-1.5" />
            {user?.role || 'User'}
          </Badge>
          {activeVenue && (
            <Badge variant="secondary" className="py-1.5 px-3 text-sm">
              {activeVenue.name}
            </Badge>
          )}
        </div>
      </div>

      {/* Global Status Message */}
      {message && (
        <Alert variant={message.type === 'error' ? 'destructive' : 'default'}
          className="animate-in fade-in-50 duration-300">
          {message.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      {/* Tab Navigation */}
      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList className="grid w-full grid-cols-6 h-auto">
          <TabsTrigger value="profile" className="flex items-center gap-1.5"><User className="h-3.5 w-3.5 hidden sm:inline" />Profile</TabsTrigger>
          <TabsTrigger value="portal" className="flex items-center gap-1.5"><LayoutDashboard className="h-3.5 w-3.5 hidden sm:inline" />Portal</TabsTrigger>
          <TabsTrigger value="work" className="flex items-center gap-1.5"><DollarSign className="h-3.5 w-3.5 hidden sm:inline" />Work & Pay</TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-1.5"><Shield className="h-3.5 w-3.5 hidden sm:inline" />Security</TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-1.5"><BellRing className="h-3.5 w-3.5 hidden sm:inline" />Notifications</TabsTrigger>
          <TabsTrigger value="preferences" className="flex items-center gap-1.5"><Palette className="h-3.5 w-3.5 hidden sm:inline" />Preferences</TabsTrigger>
        </TabsList>

        {/* ─── PROFILE TAB ─── */}
        <TabsContent value="profile" className="space-y-4 animate-in fade-in-50 duration-500">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><User className="h-5 w-5 text-indigo-400" />Personal Information</CardTitle>
              <CardDescription>Update your profile details. Changes are saved to the server.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="profile-name">Full Name</Label>
                  <Input id="profile-name" value={profileForm.name}
                    onChange={(e) => setProfileForm(p => ({ ...p, name: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="profile-email">Email</Label>
                  <Input id="profile-email" type="email" value={profileForm.email}
                    onChange={(e) => setProfileForm(p => ({ ...p, email: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="profile-phone">Phone Number</Label>
                  <Input id="profile-phone" value={profileForm.phone}
                    onChange={(e) => setProfileForm(p => ({ ...p, phone: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="user-role">Role</Label>
                  <div id="user-role" className="pt-2">
                    <Badge variant="outline" className="text-sm py-1 px-3">{user?.role || '—'}</Badge>
                  </div>
                </div>
              </div>
              <Button onClick={handleProfileSave} disabled={profileSaving} className="w-full sm:w-auto">
                {profileSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save Changes
              </Button>
            </CardContent>
          </Card>

          {/* Quick Info Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Globe className="h-5 w-5 text-blue-400" />Account Info</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">User ID</p>
                  <p className="font-mono text-xs mt-1 truncate">{user?.id || '—'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Venue</p>
                  <p className="font-medium mt-1">{activeVenue?.name || '—'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">2FA</p>
                  <Badge variant={settings.mfaEnabled ? 'default' : 'secondary'} className="mt-1">
                    {settings.mfaEnabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>
                <div>
                  <p className="text-muted-foreground">Theme</p>
                  <p className="font-medium mt-1 capitalize">{themeMode}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── PORTAL TAB ─── */}
        <TabsContent value="portal" className="space-y-4">
          <React.Suspense fallback={<div className="flex items-center justify-center py-16 text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin mr-3" />Loading Portal...</div>}>
            <EmployeePortalComplete />
          </React.Suspense>
        </TabsContent>

        {/* ─── WORK & PAY TAB ─── */}
        <TabsContent value="work" className="space-y-6 animate-in fade-in-50 duration-500">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Tips (Month)</p>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">€{totalTips.toFixed(2)}</p>
                  </div>
                  <DollarSign className="h-8 w-8 text-green-500/50 dark:text-green-400/50" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Upcoming Shifts</p>
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">{upcomingShifts.length}</p>
                  </div>
                  <Calendar className="h-8 w-8 text-blue-500/50 dark:text-blue-400/50" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Payslips</p>
                    <p className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1">{payslips.length}</p>
                  </div>
                  <FileText className="h-8 w-8 text-purple-500/50 dark:text-purple-400/50" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Documents</p>
                    <p className="text-2xl font-bold text-orange-600 dark:text-orange-400 mt-1">{documents.length}</p>
                  </div>
                  <FileText className="h-8 w-8 text-orange-500/50 dark:text-orange-400/50" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sub Tabs for Details */}
          <Tabs defaultValue="shifts" className="w-full">
            <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent space-x-6">
              <TabsTrigger value="shifts" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none bg-transparent px-0 py-2">My Shifts</TabsTrigger>
              <TabsTrigger value="payslips" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none bg-transparent px-0 py-2">Payslips</TabsTrigger>
              <TabsTrigger value="tips" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none bg-transparent px-0 py-2">Tips History</TabsTrigger>
              <TabsTrigger value="documents" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none bg-transparent px-0 py-2">Documents</TabsTrigger>
            </TabsList>

            <TabsContent value="shifts" className="mt-4">
              <Card>
                <CardHeader><CardTitle>Upcoming Shifts</CardTitle><CardDescription>Your scheduled work roster</CardDescription></CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {upcomingShifts.length === 0 ? (
                      <p className="text-center py-8 text-muted-foreground">No upcoming shifts scheduled</p>
                    ) : (
                      upcomingShifts.map((shift) => (
                        <div key={shift.id} className="p-4 rounded-lg border flex items-center justify-between">
                          <div>
                            <p className="font-medium">{new Date(shift.start_time).toLocaleDateString()}</p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(shift.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – {new Date(shift.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                          <Badge variant={shift.checked_in ? "default" : "outline"}>{shift.checked_in ? 'Checked In' : 'Scheduled'}</Badge>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="payslips" className="mt-4">
              <Card>
                <CardHeader><CardTitle>Payslips</CardTitle><CardDescription>View and download your salary statements</CardDescription></CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {payslips.length === 0 ? (
                      <p className="text-center py-8 text-muted-foreground">No payslips available yet</p>
                    ) : (
                      payslips.map((doc) => (
                        <div key={doc.id} className="p-4 rounded-lg border flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <FileText className="h-5 w-5 text-blue-500 dark:text-blue-400" />
                            <div>
                              <p className="font-medium">{doc.filename}</p>
                              <p className="text-sm text-muted-foreground">{new Date(doc.uploaded_at).toLocaleDateString()}</p>
                            </div>
                          </div>
                          <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-2" /> Download</Button>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="tips" className="mt-4">
              <Card>
                <CardHeader><CardTitle>Tips History</CardTitle><CardDescription>Record of gratuities received</CardDescription></CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {tips.length === 0 ? (
                      <p className="text-center py-8 text-muted-foreground">No tips recorded yet</p>
                    ) : (
                      tips.map((tip) => (
                        <div key={tip.id} className="p-4 rounded-lg border border-green-500/20 bg-green-500/5 flex items-center justify-between">
                          <div>
                            <p className="font-medium text-green-600 dark:text-green-400">€{tip.amount.toFixed(2)}</p>
                            <p className="text-sm text-muted-foreground">{new Date(tip.distributed_at).toLocaleDateString()}</p>
                          </div>
                          <Badge variant="outline" className="border-green-500/30 text-green-600 dark:text-green-400">Order #{tip.order_id?.substring(0, 8)}</Badge>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="documents" className="mt-4">
              <Card>
                <CardHeader><CardTitle>General Documents</CardTitle><CardDescription>Contracts, policies, and certificates</CardDescription></CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {documents.filter(d => d.category !== 'payslip').length === 0 ? (
                      <p className="text-center py-8 text-muted-foreground">No documents available</p>
                    ) : (
                      documents.filter(d => d.category !== 'payslip').map((doc) => (
                        <div key={doc.id} className="p-4 rounded-lg border flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <FileText className="h-5 w-5 text-muted-foreground" />
                            <div>
                              <p className="font-medium">{doc.filename}</p>
                              <p className="text-sm text-muted-foreground">{doc.category} • {new Date(doc.uploaded_at).toLocaleDateString()}</p>
                            </div>
                          </div>
                          <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-2" /> Download</Button>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* ─── SECURITY TAB ─── */}
        <TabsContent value="security" className="space-y-4 animate-in fade-in-50 duration-500">
          {/* 2FA Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5 text-indigo-400" />Two-Factor Authentication (2FA)</CardTitle>
              <CardDescription>Add an extra layer of security to your account with an authenticator app</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!settings.mfaEnabled && !twoFASetup && (
                <div className="space-y-4">
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>2FA is currently disabled. Enable it to secure your account.</AlertDescription>
                  </Alert>
                  <Button onClick={handleEnable2FA}><Smartphone className="mr-2 h-4 w-4" />Enable 2FA</Button>
                </div>
              )}

              {twoFASetup && (
                <div className="space-y-4">
                  <div className="flex justify-center p-4 bg-white rounded-lg">
                    <QRCodeSVG value={twoFASetup.qrCode} size={200} />
                  </div>
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <ol className="list-decimal list-inside space-y-1 text-sm">
                        <li>Install an authenticator app (Google Authenticator, Authy)</li>
                        <li>Scan the QR code above</li>
                        <li>Enter the 6-digit code to verify</li>
                      </ol>
                    </AlertDescription>
                  </Alert>
                  <div className="space-y-2">
                    <Label htmlFor="code">Verification Code</Label>
                    <Input id="code" placeholder="000000" maxLength={6}
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))} />
                  </div>
                  <div className="flex space-x-2">
                    <Button onClick={handleVerify2FA} disabled={verificationCode.length !== 6}>Verify & Enable</Button>
                    <Button variant="outline" onClick={() => setTwoFASetup(null)}>Cancel</Button>
                  </div>
                  {twoFASetup.backupCodes?.length > 0 && (
                    <div className="space-y-2">
                      <Label>Backup Codes</Label>
                      <div className="p-3 bg-muted rounded-md space-y-1 text-sm font-mono">
                        {twoFASetup.backupCodes.slice(0, 3).map((code, i) => (<div key={i}>{code}</div>))}
                        <div className="text-muted-foreground">...and {twoFASetup.backupCodes.length - 3} more</div>
                      </div>
                      <Button variant="outline" size="sm" onClick={downloadBackupCodes}>
                        <Download className="mr-2 h-4 w-4" />Download All Codes
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {settings.mfaEnabled && (
                <div className="space-y-4">
                  <Alert>
                    <CheckCircle2 className="h-4 w-4" />
                    <AlertDescription>2FA is currently enabled and protecting your account.</AlertDescription>
                  </Alert>
                  <Button variant="destructive" onClick={handleDisable2FA}>Disable 2FA</Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Change PIN */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><KeyRound className="h-5 w-5 text-amber-400" />Change PIN</CardTitle>
              <CardDescription>Update your login PIN. Must be at least 4 digits.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="current-pin">Current PIN</Label>
                  <div className="relative">
                    <Input id="current-pin" type={showPassword ? 'text' : 'password'} maxLength={6}
                      value={pinForm.currentPin}
                      onChange={(e) => setPinForm(p => ({ ...p, currentPin: e.target.value.replace(/\D/g, '') }))} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-pin">New PIN</Label>
                  <Input id="new-pin" type={showPassword ? 'text' : 'password'} maxLength={6}
                    value={pinForm.newPin}
                    onChange={(e) => setPinForm(p => ({ ...p, newPin: e.target.value.replace(/\D/g, '') }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-pin">Confirm New PIN</Label>
                  <Input id="confirm-pin" type={showPassword ? 'text' : 'password'} maxLength={6}
                    value={pinForm.confirmPin}
                    onChange={(e) => setPinForm(p => ({ ...p, confirmPin: e.target.value.replace(/\D/g, '') }))} />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Switch checked={showPassword} onCheckedChange={setShowPassword} id="show-pin" />
                  <Label htmlFor="show-pin" className="flex items-center gap-1.5">
                    {showPassword ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                    {showPassword ? 'Hide PIN' : 'Show PIN'}
                  </Label>
                </div>
                <Button onClick={handlePinChange} disabled={pinSaving || !pinForm.currentPin || !pinForm.newPin}>
                  {pinSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lock className="mr-2 h-4 w-4" />}
                  Update PIN
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── NOTIFICATIONS TAB ─── */}
        <TabsContent value="notifications" className="space-y-4 animate-in fade-in-50 duration-500">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><BellRing className="h-5 w-5 text-blue-400" />Notification Preferences</CardTitle>
              <CardDescription>Choose how you want to be notified. Changes save automatically.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="email-notif" className="font-medium">Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">Receive shift updates, payslips, and announcements via email</p>
                </div>
                <Switch id="email-notif" checked={settings.emailNotifications}
                  onCheckedChange={(checked) => handleSettingToggle('emailNotifications', checked)} />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="push-notif" className="font-medium">Push Notifications</Label>
                  <p className="text-sm text-muted-foreground">Browser push alerts for orders, chat messages, and system events</p>
                </div>
                <Switch id="push-notif" checked={settings.pushNotifications}
                  onCheckedChange={(checked) => handleSettingToggle('pushNotifications', checked)} />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="sms-notif" className="font-medium">SMS Notifications</Label>
                  <p className="text-sm text-muted-foreground">Critical alerts only: failed payments, security events, schedule changes</p>
                </div>
                <Switch id="sms-notif" checked={settings.smsNotifications}
                  onCheckedChange={(checked) => handleSettingToggle('smsNotifications', checked)} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── PREFERENCES TAB ─── */}
        <TabsContent value="preferences" className="space-y-4 animate-in fade-in-50 duration-500">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Palette className="h-5 w-5 text-purple-400" />Display Preferences</CardTitle>
              <CardDescription>Customize your interface. Changes save automatically.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="dark-mode" className="font-medium">Dark Mode</Label>
                  <p className="text-sm text-muted-foreground">Switch to a dark theme optimized for night use</p>
                </div>
                <Switch id="dark-mode" checked={themeMode === 'dark'} onCheckedChange={toggleTheme} />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="compact-mode" className="font-medium">Compact Mode</Label>
                  <p className="text-sm text-muted-foreground">Reduce spacing and padding to show more content</p>
                </div>
                <Switch id="compact-mode" checked={settings.compactMode}
                  onCheckedChange={(checked) => handleSettingToggle('compactMode', checked)} />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="high-contrast" className="font-medium">High Contrast</Label>
                  <p className="text-sm text-muted-foreground">Improve readability with stronger text contrast</p>
                </div>
                <Switch id="high-contrast" checked={settings.highContrast}
                  onCheckedChange={(checked) => handleSettingToggle('highContrast', checked)} />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="reduced-motion" className="font-medium">Reduced Motion</Label>
                  <p className="text-sm text-muted-foreground">Minimize animations and transitions</p>
                </div>
                <Switch id="reduced-motion" checked={settings.reducedMotion}
                  onCheckedChange={(checked) => handleSettingToggle('reducedMotion', checked)} />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="keyboard-shortcuts" className="font-medium">Keyboard Shortcuts</Label>
                  <p className="text-sm text-muted-foreground">Enable hotkeys for faster navigation (Ctrl+K, etc.)</p>
                </div>
                <Switch id="keyboard-shortcuts" checked={settings.keyboardShortcuts}
                  onCheckedChange={(checked) => handleSettingToggle('keyboardShortcuts', checked)} />
              </div>
            </CardContent>
          </Card>

          {/* Language Setting */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Globe className="h-5 w-5 text-emerald-400" />Language & Region</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="language-select">Interface Language</Label>
                <select id="language-select" value={settings.language || 'en'}
                  onChange={(e) => handleSettingToggle('language', e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                  <option value="en">English</option>
                  <option value="mt">Maltese</option>
                  <option value="it">Italian</option>
                  <option value="de">German</option>
                  <option value="fr">French</option>
                  <option value="es">Spanish</option>
                </select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}