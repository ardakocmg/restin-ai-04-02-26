'use client';

import React, { useState } from 'react';
import PageContainer from '@/components/layout/PageContainer';
import { Button } from '@antigravity/ui';
import { Badge } from '@antigravity/ui';
import {
    Monitor, Settings, Plus, Play, Pause,
    ChefHat, Coffee, AlertCircle
} from 'lucide-react';
import { Switch } from '@antigravity/ui';
import { toast } from 'sonner';

export default function KDSStationsPage() {
    const [stations, setStations] = useState([
        { id: '1', name: 'Hot Kitchen', key: 'ST-HOT', type: 'KITCHEN', enabled: true, routing: ['Main Course', 'Starters'] },
        { id: '2', name: 'Cold Larder', key: 'ST-COLD', type: 'KITCHEN', enabled: true, routing: ['Salads', 'Desserts'] },
        { id: '3', name: 'Bar Dispense', key: 'ST-BAR', type: 'BAR', enabled: false, routing: ['Drinks', 'Wines'] },
    ]);

    const toggleStation = (id: string) => {
        setStations(prev => prev.map(s => {
            if (s.id === id) {
                const newState = !s.enabled;
                toast.success(`${s.name} is now ${newState ? 'ONLINE' : 'OFFLINE'}`);
                return { ...s, enabled: newState };
            }
            return s;
        }));
    };

    return (
        <PageContainer title="KDS Stations" description="Kitchen Display Routing Configuration">
            <div className="flex justify-end mb-6">
                <Button className="bg-blue-600 hover:bg-blue-700 text-white"><Plus className="h-4 w-4 mr-2" /> New Station</Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {stations.map(station => (
                    <div key={station.id} className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden hover:border-zinc-700 transition-all">
                        <div className="p-6">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <div className={`p-3 rounded-lg border ${station.enabled ? 'bg-green-900/10 border-green-900 text-green-500' : 'bg-zinc-800 border-zinc-700 text-zinc-500'}`}>
                                        {station.type === 'BAR' ? <Coffee className="h-6 w-6" /> : <ChefHat className="h-6 w-6" />}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-white text-lg">{station.name}</h3>
                                        <p className="text-zinc-500 text-xs font-mono">{station.key}</p>
                                    </div>
                                </div>
                                <Switch
                                    checked={station.enabled}
                                    onCheckedChange={() => toggleStation(station.id)}
                                />
                            </div>

                            <div className="space-y-3">
                                <div className="bg-black/20 p-3 rounded-lg border border-zinc-800/50">
                                    <p className="text-[10px] font-bold text-zinc-500 uppercase mb-2">Routing Rules</p>
                                    <div className="flex flex-wrap gap-2">
                                        {station.routing.map(tag => (
                                            <Badge key={tag} variant="secondary" className="bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700">
                                                {tag}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-zinc-950 p-3 border-t border-zinc-800 flex gap-2">
                            <Button variant="ghost" size="sm" className="flex-1 text-zinc-400 hover:text-white">
                                <Monitor className="h-4 w-4 mr-2" />
                                View Screen
                            </Button>
                            <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white">
                                <Settings className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                ))}

                {/* Add Station Placeholder */}
                <div className="border-2 border-dashed border-zinc-800 rounded-xl flex flex-col items-center justify-center p-8 text-zinc-600 hover:border-zinc-700 hover:bg-zinc-900/20 cursor-pointer transition-all">
                    <div className="h-12 w-12 rounded-full bg-zinc-900 flex items-center justify-center mb-4">
                        <Plus className="h-6 w-6" />
                    </div>
                    <span className="font-bold">Add New Station</span>
                </div>
            </div>
        </PageContainer>
    );
}
