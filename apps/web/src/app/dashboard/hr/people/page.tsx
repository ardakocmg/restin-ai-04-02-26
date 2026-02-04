'use client';

import React, { useState } from 'react';
import PageContainer from '@/components/layout/PageContainer';
import { Button } from '@antigravity/ui';
import { Badge } from '@antigravity/ui';
import { Input } from '@antigravity/ui';
import { UserPlus, Mail, Calendar, Phone } from 'lucide-react';

const mockEmployees = [
    { id: 1, first: 'John', last: 'Doe', role: 'Server', status: 'active', email: 'john@restin.ai', joined: '2025-01-10' },
    { id: 2, first: 'Jane', last: 'Smith', role: 'Manager', status: 'active', email: 'jane@restin.ai', joined: '2024-11-05' },
    { id: 3, first: 'Mike', last: 'Ross', role: 'Chef', status: 'on_leave', email: 'mike@restin.ai', joined: '2024-12-01' },
];

export default function PeoplePage() {
    return (
        <PageContainer title="People & Talent" description="Employee Directory">
            <div className="flex justify-between mb-6">
                <Input className="max-w-xs bg-zinc-900" placeholder="Search employees..." />
                <Button className="bg-blue-600"><UserPlus className="h-4 w-4 mr-2" /> New Employee</Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {mockEmployees.map(emp => (
                    <div key={emp.id} className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl flex items-start gap-4 hover:border-zinc-700 transition-all cursor-pointer">
                        <div className="h-12 w-12 rounded-full bg-zinc-800 flex items-center justify-center font-bold text-white text-lg">
                            {emp.first[0]}{emp.last[0]}
                        </div>
                        <div className="flex-1">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="text-white font-bold">{emp.first} {emp.last}</h3>
                                    <p className="text-xs text-zinc-500 uppercase font-bold">{emp.role}</p>
                                </div>
                                <Badge variant="outline" className={emp.status === 'active' ? 'text-green-500 border-green-900 bg-green-900/10' : 'text-yellow-500 border-yellow-900 bg-yellow-900/10'}>
                                    {emp.status}
                                </Badge>
                            </div>

                            <div className="mt-4 space-y-1">
                                <div className="flex items-center gap-2 text-xs text-zinc-400">
                                    <Mail className="h-3 w-3" /> {emp.email}
                                </div>
                                <div className="flex items-center gap-2 text-xs text-zinc-400">
                                    <Calendar className="h-3 w-3" /> Joined {emp.joined}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </PageContainer>
    )
}
