import React, { useState, useEffect } from 'react';
import { useVenue } from '../../context/VenueContext';
import api from '../../lib/api';
import { logger } from '../../lib/logger';
import PageContainer from '../../layouts/PageContainer';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/tabs';
import {
  Users, Heart, Search, Filter, TrendingUp, Calendar, CreditCard,
  ChevronRight, Star, Clock, Info, ShieldAlert, MoreHorizontal
} from 'lucide-react';
import { toast } from 'sonner';
import GuestDrawer from './GuestDrawer';

interface Guest {
  id: string;
  name: string;
  tags?: string[];
  visit_count?: number;
  visit_summary?: {
    total_visits?: number;
    total_spend?: number;
    last_visit?: string;
  };
  churn_risk?: string;
  risk?: string;
  total_spend?: number;
  last_visit?: string;
}

interface CRMSummary {
  total_unique_guests: number;
  vip_count: number;
  loyalty_participation: string;
  new_this_month: number;
}

export default function CRMPage() {
  const { activeVenue } = useVenue();
  const [guests, setGuests] = useState<Guest[]>([]);
  const [summary, setSummary] = useState<CRMSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeSegment, setActiveSegment] = useState('all');
  const [selectedGuestId, setSelectedGuestId] = useState<string | null>(null);

  useEffect(() => {
    if (activeVenue?.id) {
      loadSummary();
      loadGuests();
    }
  }, [activeVenue?.id, activeSegment, search]);

  const loadSummary = async () => {
    try {
      const res = await api.get(`/crm/summary?venue_id=${activeVenue!.id}`);
      setSummary(res.data);
    } catch (e: unknown) { logger.error('Failed to load CRM summary', { error: String(e) }); }
  };

  const loadGuests = async () => {
    setLoading(true);
    try {
      let url = `/crm/guests?venue_id=${activeVenue!.id}`;
      if (search) url += `&q=${search}`;
      if (activeSegment !== 'all') url += `&segment=${activeSegment}`;

      const res = await api.get(url);
      setGuests(res.data || []);
    } catch (e: unknown) {
      logger.error('Failed to load guests', { error: String(e) });
      toast.error("Failed to load guest profiles");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer
      title="Guest CRM"
      description="Manage relationships, loyalty, and visit intelligence"
      actions={
        <Button variant="outline" size="sm">
          <TrendingUp className="w-4 h-4 mr-2" />
          Analytics
        </Button>
      }
    >
      {/* Top Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Guests', value: summary?.total_unique_guests || 0, icon: Users, color: 'text-blue-500' },
          { label: 'VIP Members', value: summary?.vip_count || 0, icon: Star, color: 'text-yellow-500' },
          { label: 'Loyalty Participation', value: summary?.loyalty_participation || '0%', icon: Heart, color: 'text-red-500' },
          { label: 'New this Month', value: summary?.new_this_month || 0, icon: Calendar, color: 'text-green-500' }
        ].map((m, i) => {
          const Icon = m.icon;
          return (
            <Card key={i} className="bg-background border-border shadow-2xl">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{m.label}</p>
                  <p className="text-2xl font-black text-foreground">{m.value}</p>
                </div>
                <Icon className={`w-8 h-8 ${m.color} opacity-20`} />
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Segment Controls */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search guests by name or phone..."
            className="bg-background border-border pl-10 h-11 text-sm font-medium"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Tabs value={activeSegment} onValueChange={setActiveSegment} className="w-full md:w-auto">
          <TabsList className="bg-background border border-border h-11 p-1">
            <TabsTrigger value="all" className="text-[10px] font-black uppercase px-6">All</TabsTrigger>
            <TabsTrigger value="VIP" className="text-[10px] font-black uppercase px-6">VIPs</TabsTrigger>
            <TabsTrigger value="at_risk" className="text-[10px] font-black uppercase px-6 text-red-400">At Risk</TabsTrigger>
            <TabsTrigger value="regulars" className="text-[10px] font-black uppercase px-6">Regulars</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Guest List View */}
      <div className="space-y-3">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-48 bg-card/50 rounded-xl border border-border animate-pulse" />
            ))}
          </div>
        ) : guests.length === 0 ? (
          <div className="py-20 text-center bg-background border border-border rounded-2xl">
            <Users className="w-12 h-12 text-zinc-800 mx-auto mb-4" />
            <h3 className="text-foreground font-black uppercase italic tracking-tighter text-xl">No Guests Found</h3>
            <p className="text-muted-foreground font-bold uppercase text-[11px]">Expand your search or clear filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {guests.map((guest: Guest) => (
              <Card
                key={guest.id}
                onClick={() => setSelectedGuestId(guest.id)}
                className="bg-background border-border hover:border-border transition-all cursor-pointer group shadow-xl"
              >
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-zinc-800 to-zinc-900 border border-border flex items-center justify-center text-xl font-black text-muted-foreground">
                        {(guest.name || 'G').split(' ').map((n: string) => n[0] || '').join('')}
                      </div>
                      <div>
                        <h3 className="font-black text-foreground uppercase tracking-tight text-sm group-hover:text-red-500 transition-colors">
                          {guest.name || 'Unknown Guest'}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          {(guest.tags || []).map((tag: string) => (
                            <Badge key={tag} className="bg-card text-muted-foreground border-border text-[8px] font-black uppercase tracking-widest px-1.5 py-0">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mb-6">
                    <div className="p-2 rounded-lg bg-card/50 border border-border text-center">
                      <p className="text-[8px] font-black text-muted-foreground uppercase">Visits</p>
                      <p className="text-sm font-black text-foreground">{guest.visit_count || guest.visit_summary?.total_visits || 0}</p>
                    </div>
                    <div className="p-2 rounded-lg bg-card/50 border border-border text-center">
                      <p className="text-[8px] font-black text-muted-foreground uppercase">Risk</p>
                      <p className={`text-xs font-black uppercase italic ${(guest.churn_risk === 'high' || guest.risk === 'HIGH') ? 'text-red-500' : (guest.churn_risk === 'medium' || guest.risk === 'MEDIUM') ? 'text-amber-500' : 'text-green-500'}`}>{guest.risk || (guest.churn_risk || 'low').toUpperCase()}</p>
                    </div>
                    <div className="p-2 rounded-lg bg-card/50 border border-border text-center">
                      <p className="text-[8px] font-black text-muted-foreground uppercase">Spend</p>
                      <p className="text-sm font-black text-green-500">€{Math.round(guest.total_spend || guest.visit_summary?.total_spend || 0)}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-border">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase">
                      <Clock className="w-3 h-3" />
                      {guest.last_visit || guest.visit_summary?.last_visit ? `Last seen ${new Date(guest.last_visit || guest.visit_summary?.last_visit || '').toLocaleDateString()}` : 'New Guest'}
                    </div>
                    <ChevronRight className="w-4 h-4 text-zinc-700 group-hover:text-foreground transition-all group-hover:translate-x-1" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <GuestDrawer
        open={!!selectedGuestId}
        onOpenChange={() => setSelectedGuestId(null)}
        guestId={selectedGuestId}
      />
    </PageContainer>
  );
}
