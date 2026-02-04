'use client';

import React, { useState } from 'react';
import PageContainer from '@/components/layout/PageContainer';
import { Card, CardContent } from '@antigravity/ui';
import { Button } from '@antigravity/ui';
import { Input } from '@antigravity/ui';
import { Badge } from '@antigravity/ui';
import { Users, Search, MoreHorizontal, Clock, ChevronRight } from 'lucide-react';

export default function GuestDirectoryPage() {
    const [guests, setGuests] = useState([
        { id: 1, name: 'John Doe', tier: 'GOLD', visits: 12, spend: 450, last_visit: '2026-02-01', tags: ['VIP', 'Wine Lover'] },
        { id: 2, name: 'Jane Smith', tier: 'SILVER', visits: 5, spend: 120, last_visit: '2026-01-20', tags: ['Vegetarian'] },
    ]);

    return (
        <PageContainer title="Guest Directory" description="Search and manage guest profiles" actions={
            <div className="flex gap-2 w-full md:w-auto">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <Input placeholder="Search..." className="pl-10 bg-zinc-900 border-zinc-800 w-[200px]" />
                </div>
                <Button className="bg-blue-600">Add Guest</Button>
            </div>
        }>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {guests.map(guest => (
                    <Card key={guest.id} className="border-zinc-800 bg-zinc-900/50 hover:border-zinc-700 transition cursor-pointer group">
                        <CardContent className="p-6">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="h-12 w-12 rounded-xl bg-zinc-800 flex items-center justify-center font-bold text-zinc-500 text-lg">
                                        {guest.name.substring(0, 2).toUpperCase()}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-white group-hover:text-blue-400 transition-colors">{guest.name}</h3>
                                        <div className="flex items-center gap-2 mt-1">
                                            {guest.tags.map(tag => (
                                                <Badge key={tag} className="text-[10px] bg-zinc-800 text-zinc-400 border-zinc-700">{tag}</Badge>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4 text-zinc-500" /></Button>
                            </div>

                            <div className="grid grid-cols-3 gap-2 mb-6">
                                <div className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-center">
                                    <p className="text-[10px] font-bold text-zinc-500 uppercase">Visits</p>
                                    <p className="text-white font-bold">{guest.visits}</p>
                                </div>
                                <div className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-center">
                                    <p className="text-[10px] font-bold text-zinc-500 uppercase">Tier</p>
                                    <p className="text-yellow-500 font-bold">{guest.tier}</p>
                                </div>
                                <div className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-center">
                                    <p className="text-[10px] font-bold text-zinc-500 uppercase">Spend</p>
                                    <p className="text-green-500 font-bold">${guest.spend}</p>
                                </div>
                            </div>

                            <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
                                <div className="flex items-center gap-2 text-xs text-zinc-500">
                                    <Clock className="h-3 w-3" /> Last: {guest.last_visit}
                                </div>
                                <ChevronRight className="h-4 w-4 text-zinc-600 group-hover:translate-x-1 transition-transform" />
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </PageContainer>
    );
}
