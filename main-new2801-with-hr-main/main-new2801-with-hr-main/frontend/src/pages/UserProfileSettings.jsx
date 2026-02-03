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

export default function UserProfileSettings() {
  const { user } = useAuth();
  const { settings, updateSettings, enable2FA, verify2FA, disable2FA } = useUserSettings();
  const { themeMode, toggleTheme, formatCurrency } = useDesignSystem();

  const [loading, setLoading] = useState(false);
  const [twoFASetup, setTwoFASetup] = useState(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState(null);

  const handleEnable2FA = async () => {
    setLoading(true);
    const result = await enable2FA('google_authenticator');

    if (result.success) {
      setTwoFASetup(result);
      setMessage({ type: 'success', text: 'Scan QR code with your authenticator app' });
    } else {
      setMessage({ type: 'error', text: result.error || 'Failed to enable 2FA' });
    }
    setLoading(false);
  };

  const handleVerify2FA = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      setMessage({ type: 'error', text: 'Please enter a valid 6-digit code' });
      return;
    }

    setLoading(true);
    const result = await verify2FA(verificationCode);

    if (result.success) {
      setMessage({ type: 'success', text: '2FA enabled successfully!' });
      setTwoFASetup(null);
      setVerificationCode('');
    } else {
      setMessage({ type: 'error', text: result.error || 'Invalid verification code' });
    }
    setLoading(false);
  };

  const handleDisable2FA = async () => {
    if (!window.confirm('Are you sure you want to disable 2FA?')) return;

    setLoading(true);
    const result = await disable2FA();

    if (result.success) {
      setMessage({ type: 'success', text: '2FA disabled successfully' });
    } else {
      setMessage({ type: 'error', text: result.error || 'Failed to disable 2FA' });
    }
    setLoading(false);
  };

  const downloadBackupCodes = () => {
    if (!twoFASetup?.backupCodes) return;

    const content = `restin.ai Backup Codes\n\n${twoFASetup.backupCodes.join('\n')}\n\nKeep these codes safe!`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'restin-backup-codes.txt';
    a.click();
  };

  return (
    <div className="container max-w-4xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Profile & Settings</h1>
        <p className="text-muted-foreground">Manage your personal information and preferences</p>
      </div>

      {message && (
        <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
          {message.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="security">Security & 2FA</TabsTrigger>
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
