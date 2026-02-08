import React from 'react';
import { Activity, Users as UsersIcon, Clock, AlertTriangle, TrendingUp } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';

/**
 * 👥 OPS HUB - Operations & Labor Management
 */
export default function Ops() {
    const shifts = [
        { name: 'John Doe', role: 'Chef', hours: '08:00 - 16:00', status: 'active' },
        { name: 'Maria Borg', role: 'Server', hours: '12:00 - 20:00', status: 'active' },
        { name: 'Peter Vella', role: 'Manager', hours: '10:00 - 18:00', status: 'break' },
    ];

    return (
        <div className="p-6 space-y-6">
            <Card className="bg-gradient-to-br from-orange-900/20 to-black border-orange-500/20">
                <CardHeader>
                    <div className="flex items-center gap-4">
                        <div className="p-4 bg-orange-600/20 rounded-xl">
                            <Activity size={32} className="text-orange-500" />
                        </div>
                        <div>
                            <CardTitle className="text-3xl font-black text-white italic">OPS HUB</CardTitle>
                            <p className="text-zinc-500 font-bold text-sm mt-1">Operations & Workforce Management</p>
                        </div>
                    </div>
                </CardHeader>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card className="bg-zinc-900/30 border-zinc-800">
                    <CardContent className="p-6">
                        <UsersIcon size={24} className="text-orange-500 mb-4" />
                        <p className="text-3xl font-black text-white">12</p>
                        <p className="text-sm text-zinc-500 font-bold uppercase tracking-widest mt-1">Active Staff</p>
                    </CardContent>
                </Card>

                <Card className="bg-zinc-900/30 border-zinc-800">
                    <CardContent className="p-6">
                        <Clock size={24} className="text-blue-500 mb-4" />
                        <p className="text-3xl font-black text-white">87h</p>
                        <p className="text-sm text-zinc-500 font-bold uppercase tracking-widest mt-1">This Week</p>
                    </CardContent>
                </Card>

                <Card className="bg-zinc-900/30 border-zinc-800">
                    <CardContent className="p-6">
                        <TrendingUp size={24} className="text-green-500 mb-4" />
                        <p className="text-3xl font-black text-white">28%</p>
                        <p className="text-sm text-zinc-500 font-bold uppercase tracking-widest mt-1">Labor Cost</p>
                    </CardContent>
                </Card>

                <Card className="bg-zinc-900/30 border-zinc-800">
                    <CardContent className="p-6">
                        <AlertTriangle size={24} className="text-red-500 mb-4" />
                        <p className="text-3xl font-black text-white">2</p>
                        <p className="text-sm text-zinc-500 font-bold uppercase tracking-widest mt-1">Alerts</p>
                    </CardContent>
                </Card>
            </div>

            <Card className="bg-zinc-900/10 border-zinc-800">
                <CardHeader>
                    <CardTitle>Today's Schedule</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {shifts.map((shift, i) => (
                            <div key={i} className="flex items-center justify-between p-4 bg-zinc-900/40 rounded-xl border border-zinc-800">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center">
                                        <UsersIcon size={20} className="text-zinc-400" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-white">{shift.name}</p>
                                        <p className="text-sm text-zinc-500">{shift.role} • {shift.hours}</p>
                                    </div>
                                </div>
                                <Badge variant={shift.status === 'active' ? 'default' : 'secondary'}>
                                    {shift.status.toUpperCase()}
                                </Badge>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
