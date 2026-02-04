'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import PageContainer from '@/components/layout/PageContainer';
import { Card, CardContent } from '@antigravity/ui';
import { Button } from '@antigravity/ui';
import { Badge } from '@antigravity/ui';
import { Calendar, Users, Clock, Plus } from 'lucide-react';

export default function ReservationsHub() {
    const router = useRouter();
    const [reservations, setReservations] = useState([
        { id: 1, name: 'Michael Scott', time: '19:00', guests: 4, area: 'Main Hall', status: 'confirmed', date: 'Today' },
        { id: 2, name: 'Dwight Schrute', time: '19:30', guests: 2, area: 'Beet Garden', status: 'seated', date: 'Today' },
    ]);

    return (
        <PageContainer title="Reservations" description="Bookings and table management" actions={
            <div className="flex gap-2">
                <Button variant="outline" onClick={() => router.push('/dashboard/reservations/timeline')}>
                    <Calendar className="h-4 w-4 mr-2" /> Timeline View
                </Button>
                <Button>
                    <Plus className="h-4 w-4 mr-2" /> New Booking
                </Button>
            </div>
        }>
            <div className="space-y-4">
                {reservations.map(res => (
                    <Card key={res.id} className="border-zinc-800 bg-zinc-900/50">
                        <CardContent className="p-6 flex items-center justify-between">
                            <div className="flex items-center gap-6">
                                <div className="h-12 w-12 bg-zinc-800 rounded-lg flex items-center justify-center font-bold text-white">
                                    {res.time}
                                </div>
                                <div>
                                    <h3 className="font-bold text-white text-lg">{res.name}</h3>
                                    <p className="text-zinc-400 text-sm flex items-center gap-2">
                                        <Users className="h-3 w-3" /> {res.guests} pax • {res.area}
                                    </p>
                                </div>
                            </div>
                            <Badge className={res.status === 'confirmed' ? 'bg-blue-900/20 text-blue-500' : 'bg-green-900/20 text-green-500'}>
                                {res.status.toUpperCase()}
                            </Badge>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </PageContainer>
    );
}
