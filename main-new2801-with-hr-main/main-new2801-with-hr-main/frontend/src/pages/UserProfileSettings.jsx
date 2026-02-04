import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  User,
  Mail,
  Bell,
  Lock,
  Shield,
  Eye,
  EyeOff,
  Smartphone,
  Key,
  Download,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { useUserSettings } from '../context/UserSettingsContext';
import { useDesignSystem } from '../context/DesignSystemContext';
import { useAuth } from '../context/AuthContext';
import { QRCodeSVG } from 'qrcode.react';
import { useVenue } from '../context/VenueContext';
import api from '../lib/api';
import { Calendar, FileText, DollarSign, Clock } from 'lucide-react';

export default function UserProfileSettings() {
  // Employee Portal Logic
  const { activeVenue } = useVenue();
  const [documents, setDocuments] = useState([]);
  const [payslips, setPayslips] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [tips, setTips] = useState([]);
  const [employeeLoading, setEmployeeLoading] = useState(false);

  React.useEffect(() => {
    if (user && activeVenue) {
      loadEmployeeData();
    }
  }, [user, activeVenue]);

  const loadEmployeeData = async () => {
    try {
      setEmployeeLoading(true);
      // In a real app we would have proper endpoints, using mocks here effectively as per previous context
      // Assuming api wrapper handles base URL
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
      console.error('Failed to load employee data:', error);
    } finally {
      setEmployeeLoading(false);
    }
  };

  const totalTips = tips.reduce((sum, t) => sum + (t.amount || 0), 0);
  const upcomingShifts = shifts.filter(s => new Date(s.start_time) > new Date());

  return (
    <div className="container max-w-5xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Profile & Settings</h1>
        <p className="text-muted-foreground">Manage your personal information, security, and work details</p>
      </div>

      {message && (
        <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
          {message.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5 h-auto">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="work">Work & Pay</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>Update your profile details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" defaultValue={user?.name} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" defaultValue={user?.email} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="user-role">Role</Label>
                <div id="user-role">
                  <Badge variant="outline">{user?.role}</Badge>
                </div>
              </div>
              <Button>Save Changes</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Work & Pay Tab (Merged Employee Portal) */}
        <TabsContent value="work" className="space-y-6 animate-in fade-in-50 duration-500">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Tips (Month)</p>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400 dark:text-green-400 mt-1">€{totalTips.toFixed(2)}</p>
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
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 dark:text-blue-400 mt-1">{upcomingShifts.length}</p>
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
                    <p className="text-2xl font-bold text-purple-600 dark:text-purple-400 dark:text-purple-400 mt-1">{payslips.length}</p>
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
                    <p className="text-2xl font-bold text-orange-600 dark:text-orange-400 dark:text-orange-400 mt-1">{documents.length}</p>
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
                <CardHeader>
                  <CardTitle>Upcoming Shifts</CardTitle>
                  <CardDescription>Your scheduled work roster</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {upcomingShifts.length === 0 ? (
                      <p className="text-center py-8 text-muted-foreground">No upcoming shifts</p>
                    ) : (
                      upcomingShifts.map((shift) => (
                        <div key={shift.id} className="p-4 rounded-lg border flex items-center justify-between">
                          <div>
                            <p className="font-medium">{new Date(shift.start_time).toLocaleDateString()}</p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(shift.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(shift.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
                <CardHeader>
                  <CardTitle>Payslips</CardTitle>
                  <CardDescription>View and download your salary statements</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {payslips.length === 0 ? (
                      <p className="text-center py-8 text-muted-foreground">No payslips available</p>
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
                          <Button variant="outline" size="sm">
                            <Download className="h-4 w-4 mr-2" /> Download
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="tips" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Tips History</CardTitle>
                  <CardDescription>Record of gratuities received</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {tips.length === 0 ? (
                      <p className="text-center py-8 text-muted-foreground">No tips recorded</p>
                    ) : (
                      tips.map((tip) => (
                        <div key={tip.id} className="p-4 rounded-lg border border-green-500/20 bg-green-500/5 flex items-center justify-between">
                          <div>
                            <p className="font-medium text-green-600 dark:text-green-400 dark:text-green-400">€{tip.amount.toFixed(2)}</p>
                            <p className="text-sm text-muted-foreground">{new Date(tip.distributed_at).toLocaleDateString()}</p>
                          </div>
                          <Badge variant="outline" className="border-green-500/30 text-green-600 dark:text-green-400 dark:text-green-400">Order #{tip.order_id?.substring(0, 8)}</Badge>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="documents" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>General Documents</CardTitle>
                  <CardDescription>Contracts, policies, and certificates</CardDescription>
                </CardHeader>
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
                          <Button variant="outline" size="sm">
                            <Download className="h-4 w-4 mr-2" /> Download
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

          </Tabs>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="h-5 w-5" />
                <span>Two-Factor Authentication (2FA)</span>
              </CardTitle>
              <CardDescription>
                Add an extra layer of security to your account with an authenticator app
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!settings.mfaEnabled && !twoFASetup && (
                <div className="space-y-4">
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      2FA is currently disabled. Enable it to secure your account.
                    </AlertDescription>
                  </Alert>
                  <Button onClick={handleEnable2FA} disabled={loading}>
                    <Smartphone className="mr-2 h-4 w-4" />
                    Enable 2FA
                  </Button>
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
                        <li>Install an authenticator app on your phone</li>
                        <li>Scan the QR code above</li>
                        <li>Enter the 6-digit code to verify</li>
                      </ol>
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-2">
                    <Label htmlFor="code">Verification Code</Label>
                    <Input
                      id="code"
                      placeholder="000000"
                      maxLength={6}
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                    />
                  </div>

                  <div className="flex space-x-2">
                    <Button onClick={handleVerify2FA} disabled={loading || verificationCode.length !== 6}>
                      Verify & Enable
                    </Button>
                    <Button variant="outline" onClick={() => setTwoFASetup(null)}>
                      Cancel
                    </Button>
                  </div>

                  {twoFASetup.backupCodes && (
                    <div className="space-y-2">
                      <Label htmlFor="backup-codes">Backup Codes</Label>
                      <div id="backup-codes" className="p-3 bg-muted rounded-md space-y-1 text-sm font-mono">
                        {twoFASetup.backupCodes.slice(0, 3).map((code, i) => (
                          <div key={i}>{code}</div>
                        ))}
                        <div className="text-muted-foreground">...and more</div>
                      </div>
                      <Button variant="outline" size="sm" onClick={downloadBackupCodes}>
                        <Download className="mr-2 h-4 w-4" />
                        Download All Codes
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {settings.mfaEnabled && (
                <div className="space-y-4">
                  <Alert>
                    <CheckCircle2 className="h-4 w-4" />
                    <AlertDescription>
                      2FA is currently enabled and protecting your account.
                    </AlertDescription>
                  </Alert>
                  <Button variant="destructive" onClick={handleDisable2FA} disabled={loading}>
                    Disable 2FA
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Change PIN</CardTitle>
              <CardDescription>Update your login PIN</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current-pin">Current PIN</Label>
                <Input id="current-pin" type={showPassword ? 'text' : 'password'} maxLength={4} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-pin">New PIN</Label>
                <Input id="new-pin" type={showPassword ? 'text' : 'password'} maxLength={4} />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={showPassword}
                  onCheckedChange={setShowPassword}
                  id="show-pin"
                />
                <Label htmlFor="show-pin">Show PIN</Label>
              </div>
              <Button>Update PIN</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>Choose how you want to be notified</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="email-notif">Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">Receive updates via email</p>
                </div>
                <Switch
                  id="email-notif"
                  checked={settings.emailNotifications}
                  onCheckedChange={(checked) => updateSettings({ emailNotifications: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="push-notif">Push Notifications</Label>
                  <p className="text-sm text-muted-foreground">Browser notifications</p>
                </div>
                <Switch
                  id="push-notif"
                  checked={settings.pushNotifications}
                  onCheckedChange={(checked) => updateSettings({ pushNotifications: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="sms-notif">SMS Notifications</Label>
                  <p className="text-sm text-muted-foreground">Receive critical alerts via SMS</p>
                </div>
                <Switch
                  id="sms-notif"
                  checked={settings.smsNotifications}
                  onCheckedChange={(checked) => updateSettings({ smsNotifications: checked })}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Preferences Tab */}
        <TabsContent value="preferences" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Display Preferences</CardTitle>
              <CardDescription>Customize your interface</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="dark-mode">Dark Mode</Label>
                  <p className="text-sm text-muted-foreground">Switch to dark theme</p>
                </div>
                <Switch
                  id="dark-mode"
                  checked={themeMode === 'dark'}
                  onCheckedChange={toggleTheme}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="compact-mode">Compact Mode</Label>
                  <p className="text-sm text-muted-foreground">Reduce spacing for more content</p>
                </div>
                <Switch
                  id="compact-mode"
                  checked={settings.compactMode}
                  onCheckedChange={(checked) => updateSettings({ compactMode: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="high-contrast">High Contrast</Label>
                  <p className="text-sm text-muted-foreground">Improve readability</p>
                </div>
                <Switch
                  id="high-contrast"
                  checked={settings.highContrast}
                  onCheckedChange={(checked) => updateSettings({ highContrast: checked })}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
