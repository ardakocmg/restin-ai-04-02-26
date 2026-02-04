'use client';

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import { useVenueSettings } from "@/hooks/useVenueSettings";
import { Button } from "@antigravity/ui";
import { Badge } from "@antigravity/ui";
import BottomNav from "@/components/BottomNav";
import {
    LogOut, CheckCircle, PlayCircle, RefreshCw, Loader2,
    PauseCircle, Truck, Award
} from "lucide-react";

export default function KDSMain() {
    const router = useRouter();
    const { user, isAuthenticated } = useAuth();
    const [tickets, setTickets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [stationFilter, setStationFilter] = useState("all");
    const [lastUpdate, setLastUpdate] = useState(new Date());

    const venueId = 'venue_123';
    const { settings } = useVenueSettings(venueId);

    useEffect(() => {
        loadData();
        const interval = setInterval(loadData, 5000); // Auto-refresh
        return () => clearInterval(interval);
    }, []);

    const loadData = async () => {
        try {
            // Mock data
            setTickets([
                {
                    id: 't1', display_id: '#101', table_name: 'Table 4', status: 'PREPARING',
                    items: [
                        { id: 'i1', menu_item_name: 'Burger', status: 'PREPARING', quantity: 2, started_at: new Date().toISOString() },
                        { id: 'i2', menu_item_name: 'Fries', status: 'NEW', quantity: 2 }
                    ]
                },
                {
                    id: 't2', display_id: '#102', table_name: 'Table 1', status: 'NEW',
                    items: [
                        { id: 'i3', menu_item_name: 'Steak', status: 'NEW', quantity: 1, notes: 'Medium Rare' }
                    ]
                }
            ]);
            setLastUpdate(new Date());
        } catch (error) {
            console.error("Failed to load tickets:", error);
        } finally {
            setLoading(false);
        }
    };

    const flattenItems = () => {
        const items: any[] = [];
        tickets.forEach(t => {
            t.items.forEach((i: any) => {
                items.push({ ...i, ticket_id: t.id, table_name: t.table_name, ticket_display_id: t.display_id });
            });
        });
        return items;
    };

    const flattenedItems = flattenItems();

    if (loading) {
        return <div className="min-h-screen bg-zinc-950 flex items-center justify-center"><Loader2 className="w-12 h-12 text-green-500 animate-spin" /></div>;
    }

    return (
        <div className="min-h-screen bg-zinc-950">
            {/* Header */}
            <header className="fixed top-0 left-0 right-0 h-16 bg-zinc-900 border-b border-white/10 z-50 flex items-center justify-between px-4">
                <h1 className="text-xl font-bold text-white">KDS <span className="text-red-500">STATION</span></h1>
                <div className="hidden md:flex items-center gap-2">
                    {["all", "kitchen", "bar"].map(station => (
                        <button
                            key={station}
                            onClick={() => setStationFilter(station)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${stationFilter === station ? "bg-red-600 text-white" : "bg-zinc-800 text-zinc-400 hover:text-white"}`}
                        >
                            {station.toUpperCase()}
                        </button>
                    ))}
                </div>
                <div className="flex items-center gap-4 text-xs text-zinc-500">
                    <span>Last: {lastUpdate.toLocaleTimeString()}</span>
                    <Button variant="ghost" onClick={loadData}><RefreshCw className="w-4 h-4" /></Button>
                </div>
            </header>

            {/* Grid */}
            <div className="pt-20 pb-24 px-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {flattenedItems.map((item, idx) => (
                        <div key={idx} className={`bg-zinc-900 rounded-lg border-l-4 overflow-hidden ${item.status === 'PREPARING' ? 'border-yellow-500' : 'border-blue-500'}`}>
                            <div className="p-4 border-b border-white/5 flex justify-between">
                                <div>
                                    <div className="text-sm text-zinc-400">{item.table_name}</div>
                                    <div className="text-xs text-zinc-600 font-mono">{item.ticket_display_id}</div>
                                </div>
                                <Badge variant="outline" className="h-6">{item.status}</Badge>
                            </div>
                            <div className="p-4">
                                <h3 className="text-lg font-bold text-white mb-2">{item.quantity}x {item.menu_item_name}</h3>
                                {item.notes && <p className="text-yellow-400 text-sm">⚠️ {item.notes}</p>}
                            </div>
                            <div className="p-3 bg-zinc-800/50">
                                <Button className="w-full bg-blue-600 hover:bg-blue-500">
                                    {item.status === 'NEW' ? 'Start' : 'Complete'}
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="md:hidden">
                <BottomNav mode="kds" />
            </div>
        </div>
    );
}
