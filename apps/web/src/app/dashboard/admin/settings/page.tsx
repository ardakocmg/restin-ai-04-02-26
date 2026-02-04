'use client';

import React, { useState } from 'react';
import PageContainer from '@/components/layout/PageContainer';
import { Button } from '@antigravity/ui';
import { Badge } from '@antigravity/ui';
import { Input } from '@antigravity/ui';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@antigravity/ui';
import { Card, CardContent, CardHeader, CardTitle } from '@antigravity/ui';
import { Switch } from '@antigravity/ui';
import {
    Settings, Scale, MapPin, Package, Palette,
    UserCheck, Upload, Save, Building2
} from 'lucide-react';
import { toast } from 'sonner';

export default function VenueSettingsPage() {
    const [activeTab, setActiveTab] = useState('general');

    // Mock Data based on legacy component
    const [venue, setVenue] = useState({
        name: 'Caviar & Bull',
        type: 'Fine Dining',
        pacing_enabled: true,
        pacing_interval: 15,
        review_low: 30,
        review_med: 60,
        legal: {
            name: 'Caviar & Bull Limited',
            pe: '456398',
            vat: 'MT 12345678',
            address: 'Corinthia Hotel, St. Georges Bay, St. Julians'
        },
        branding: {
            primary_color: '#dc2626',
            logo_url: ''
        }
    });

    const modules = [
        { id: 'ops', title: 'OPERATIONS', desc: 'Complimentary items, specials', status: 'active' },
        { id: 'people', title: 'PEOPLE', desc: 'Staff, users, roles, shifts', status: 'active' },
        { id: 'menu', title: 'MENU', desc: 'Menu management, modifiers', status: 'active' },
        { id: 'inventory', title: 'INVENTORY', desc: 'Stock ledger, recipes', status: 'active' },
        { id: 'kds', title: 'KDS', desc: 'Kitchen Display System', status: 'active' },
        { id: 'payroll', title: 'PAYROLL (MALTA)', desc: 'FS3, FS5, FS7 generation', status: 'planned' },
    ];

    const handleSave = () => {
        toast.success("Venue settings saved successfully");
    };

    return (
        <PageContainer title="Venue Settings" description="Configuration & Preference Center">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList className="bg-zinc-900 border border-zinc-800 p-1 rounded-xl h-auto flex flex-wrap gap-2">
                    <TabsTrigger value="general" className="data-[state=active]:bg-red-600 data-[state=active]:text-white h-9 px-4 rounded-lg">General</TabsTrigger>
                    <TabsTrigger value="legal" className="data-[state=active]:bg-red-600 data-[state=active]:text-white h-9 px-4 rounded-lg">Legal & Branding</TabsTrigger>
                    <TabsTrigger value="modules" className="data-[state=active]:bg-red-600 data-[state=active]:text-white h-9 px-4 rounded-lg">Modules</TabsTrigger>
                </TabsList>

                {/* General Tab */}
                <TabsContent value="general">
                    <Card className="bg-zinc-900/50 border-zinc-800">
                        <CardHeader>
                            <CardTitle className="text-white flex items-center gap-2"><Settings className="h-5 w-5" /> General Configuration</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Venue Name</label>
                                    <Input
                                        value={venue.name}
                                        onChange={(e) => setVenue({ ...venue, name: e.target.value })}
                                        className="bg-zinc-950 border-zinc-800 text-lg font-bold h-12"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Service Type</label>
                                    <div className="flex gap-2">
                                        <Badge className="bg-red-900/20 text-red-500 border-red-900 h-12 px-4 text-sm">FINE DINING</Badge>
                                    </div>
                                </div>
                            </div>

                            <div className="border-t border-zinc-800 pt-6">
                                <h3 className="text-white font-bold mb-4">Course Pacing</h3>
                                <div className="flex items-center justify-between bg-zinc-950 p-4 rounded-xl border border-zinc-800">
                                    <div>
                                        <div className="text-white font-bold">Enable Auto-Pacing</div>
                                        <div className="text-zinc-500 text-sm">Automatically calculated fire times</div>
                                    </div>
                                    <Switch checked={venue.pacing_enabled} onCheckedChange={(c) => setVenue({ ...venue, pacing_enabled: c })} />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Legal Tab */}
                <TabsContent value="legal">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card className="bg-zinc-900/50 border-zinc-800">
                            <CardHeader>
                                <CardTitle className="text-white flex items-center gap-2 text-sm uppercase tracking-widest"><Scale className="h-4 w-4" /> Legal Entity</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Registered Name</label>
                                    <Input value={venue.legal.name} className="bg-zinc-950 border-zinc-800" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">VAT Number</label>
                                        <Input value={venue.legal.vat} className="bg-zinc-950 border-zinc-800" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">PE Number</label>
                                        <Input value={venue.legal.pe} className="bg-zinc-950 border-zinc-800" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-zinc-900/50 border-zinc-800">
                            <CardHeader>
                                <CardTitle className="text-white flex items-center gap-2 text-sm uppercase tracking-widest"><Palette className="h-4 w-4" /> Branding</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Primary Color</label>
                                    <div className="flex gap-2">
                                        <div className="h-10 w-10 rounded bg-red-600 border border-white/20"></div>
                                        <Input value={venue.branding.primary_color} className="bg-zinc-950 border-zinc-800 flex-1 font-mono" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* Modules Tab */}
                <TabsContent value="modules">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {modules.map(mod => (
                            <div key={mod.id} className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl flex items-center gap-4 group hover:border-zinc-700 transition-all">
                                <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${mod.status === 'active' ? 'bg-red-900/10 text-red-500' : 'bg-zinc-800 text-zinc-500'}`}>
                                    <Package className="h-5 w-5" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-bold text-white text-sm">{mod.title}</h3>
                                        {mod.status === 'active' && <div className="h-1.5 w-1.5 rounded-full bg-emerald-500"></div>}
                                    </div>
                                    <p className="text-zinc-500 text-xs mt-1">{mod.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </TabsContent>
            </Tabs>

            <div className="mt-8 flex justify-end">
                <Button size="lg" className="bg-white text-black hover:bg-zinc-200 font-bold" onClick={handleSave}>
                    <Save className="h-4 w-4 mr-2" /> Save Changes
                </Button>
            </div>
        </PageContainer>
    );
}
