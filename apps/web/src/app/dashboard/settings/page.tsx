'use client';

import React, { useState } from 'react';
import PageContainer from '@/components/layout/PageContainer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label, Badge, Button, Tabs, TabsList, TabsTrigger, TabsContent, Switch, Alert, AlertDescription } from '@antigravity/ui';
import { User, Mail, Shield, Smartphone, Download, FileText, Calendar, DollarSign, CheckCircle2, AlertCircle } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState('profile');
    const [twoFAEnabled, setTwoFAEnabled] = useState(false);
    const [twoFASetup, setTwoFASetup] = useState<any>(null); // Mock state
    const [settings, setSettings] = useState({
        emailNotifications: true,
        pushNotifications: false,
        smsNotifications: true,
        compactMode: false,
        highContrast: false,
        darkMode: true
    });

    const toggleSetting = (key: string) => {
        setSettings(prev => ({ ...prev, [key]: !prev[key as keyof typeof settings] }));
    };

    const start2FASetup = () => {
        setTwoFASetup({
            qrCode: "otpauth://totp/Restin:Admin?secret=JBSWY3DPEHPK3PXP&issuer=Restin",
            backupCodes: ["1234-5678", "8765-4321", "1111-2222"]
        });
    };

    return (
        <PageContainer title="Settings & Profile" description="Manage your account, preferences and security settings.">

            <Tabs defaultValue="profile" className="w-full space-y-6">
                <TabsList className="bg-zinc-900/50 border border-white/5 p-1 w-full justify-start h-auto flex-wrap">
                    <TabsTrigger value="profile" className="data-[state=active]:bg-red-600 data-[state=active]:text-white px-6 py-2">Profile</TabsTrigger>
                    <TabsTrigger value="work" className="data-[state=active]:bg-red-600 data-[state=active]:text-white px-6 py-2">Work & Pay</TabsTrigger>
                    <TabsTrigger value="security" className="data-[state=active]:bg-red-600 data-[state=active]:text-white px-6 py-2">Security</TabsTrigger>
                    <TabsTrigger value="notifications" className="data-[state=active]:bg-red-600 data-[state=active]:text-white px-6 py-2">Notifications</TabsTrigger>
                    <TabsTrigger value="preferences" className="data-[state=active]:bg-red-600 data-[state=active]:text-white px-6 py-2">Preferences</TabsTrigger>
                </TabsList>

                {/* PROFILE TAB */}
                <TabsContent value="profile">
                    <Card className="bg-zinc-900/40 border-white/5">
                        <CardHeader>
                            <CardTitle className="text-white">Personal Information</CardTitle>
                            <CardDescription className="text-zinc-500">Update your public profile details</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4 max-w-xl">
                            <div className="space-y-2">
                                <Label>Full Name</Label>
                                <div className="relative">
                                    <User className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
                                    <Input className="pl-10 bg-black/20 border-white/10" defaultValue="Admin User" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Email Address</Label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
                                    <Input className="pl-10 bg-black/20 border-white/10" defaultValue="admin@restin.ai" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Role</Label>
                                <div>
                                    <Badge className="bg-red-500/10 text-red-500 hover:bg-red-500/20 border-red-500/20">super_admin</Badge>
                                </div>
                            </div>
                            <Button className="bg-white text-black hover:bg-zinc-200 mt-4">Save Changes</Button>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* WORK TAB */}
                <TabsContent value="work" className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <Card className="bg-zinc-900/40 border-white/5">
                            <CardContent className="pt-6">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="text-sm text-zinc-500">Total Tips (Month)</p>
                                        <h3 className="text-2xl font-bold text-green-500 mt-1">€450.00</h3>
                                    </div>
                                    <DollarSign className="h-8 w-8 text-green-500/20" />
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="bg-zinc-900/40 border-white/5">
                            <CardContent className="pt-6">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="text-sm text-zinc-500">Next Shift</p>
                                        <h3 className="text-xl font-bold text-blue-500 mt-1">Tomorrow</h3>
                                        <p className="text-xs text-zinc-500">09:00 - 17:00</p>
                                    </div>
                                    <Calendar className="h-8 w-8 text-blue-500/20" />
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <Card className="bg-zinc-900/40 border-white/5">
                        <CardHeader>
                            <CardTitle className="text-white">Recent Payslips</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="flex items-center justify-between p-4 bg-black/20 rounded-lg border border-white/5 hover:bg-white/5 transition-colors cursor-pointer group">
                                        <div className="flex items-center gap-4">
                                            <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-500">
                                                <FileText className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-white group-hover:text-red-500 transition-colors">Payslip_Jan_2026.pdf</p>
                                                <p className="text-xs text-zinc-500">Uploaded on Jan 28, 2026</p>
                                            </div>
                                        </div>
                                        <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white"><Download className="h-4 w-4 mr-2" /> Download</Button>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* SECURITY TAB */}
                <TabsContent value="security">
                    <Card className="bg-zinc-900/40 border-white/5">
                        <CardHeader>
                            <CardTitle className="text-white flex items-center gap-2">
                                <Shield className="h-5 w-5 text-zinc-400" />
                                Two-Factor Authentication
                            </CardTitle>
                            <CardDescription className="text-zinc-500">Add an extra layer of security</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {!twoFAEnabled && !twoFASetup && (
                                <div className="space-y-4">
                                    <Alert variant="destructive" className="bg-red-900/10 border-red-900/20 text-red-500">
                                        <AlertCircle className="h-4 w-4" />
                                        <AlertDescription>2FA is currently disabled. Your account is vulnerable.</AlertDescription>
                                    </Alert>
                                    <Button onClick={start2FASetup} className="bg-white text-black hover:bg-zinc-200">
                                        <Smartphone className="h-4 w-4 mr-2" /> Enable 2FA
                                    </Button>
                                </div>
                            )}

                            {twoFASetup && !twoFAEnabled && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-top-4">
                                    <div className="p-6 bg-white rounded-xl w-fit mx-auto">
                                        <QRCodeSVG value={twoFASetup.qrCode} size={180} />
                                    </div>
                                    <div className="text-center space-y-2">
                                        <p className="text-zinc-300 text-sm">Scan this QR code with your authenticator app</p>
                                        <div className="flex gap-2 justify-center">
                                            <Input className="w-40 text-center text-lg tracking-widest bg-black/40 border-white/10 text-white" placeholder="000 000" maxLength={6} />
                                            <Button onClick={() => setTwoFAEnabled(true)} className="bg-red-600 hover:bg-red-700 text-white">Verify</Button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {twoFAEnabled && (
                                <Alert className="bg-green-500/10 border-green-500/20 text-green-500">
                                    <CheckCircle2 className="h-4 w-4" />
                                    <AlertDescription>2FA is ENABLED. Your account is secure.</AlertDescription>
                                </Alert>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* NOTIFICATIONS & PREFERENCES (Combined visually for brevity) */}
                <TabsContent value="notifications" className="space-y-4">
                    <Card className="bg-zinc-900/40 border-white/5">
                        <CardHeader>
                            <CardTitle className="text-white">Preferences</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label className="text-base text-zinc-200">Email Notifications</Label>
                                    <p className="text-sm text-zinc-500">Receive daily summaries</p>
                                </div>
                                <Switch checked={settings.emailNotifications} onCheckedChange={() => toggleSetting('emailNotifications')} />
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label className="text-base text-zinc-200">Dark Mode</Label>
                                    <p className="text-sm text-zinc-500">Always on for Enterprise</p>
                                </div>
                                <Switch checked={settings.darkMode} disabled />
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

            </Tabs>
        </PageContainer>
    );
}
