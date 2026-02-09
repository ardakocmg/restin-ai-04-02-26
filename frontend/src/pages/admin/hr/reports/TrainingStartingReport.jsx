import React, { useState, useEffect } from 'react';
import PageContainer from '../../../../layouts/PageContainer';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card';
import { Badge } from '../../../../components/ui/badge';
import { GraduationCap, Calendar, Users, Clock, Search } from 'lucide-react';
import { Input } from '../../../../components/ui/input';
import api from '../../../../lib/api';

export default function TrainingStartingReport() {
  const [training, setTraining] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadTraining();
  }, []);

  const loadTraining = async () => {
    try {
      const venueId = localStorage.getItem('currentVenueId') || 'venue-caviar-bull';
      const res = await api.get(`/hr/training/upcoming?venue_id=${venueId}`);
      setTraining(res.data || []);
    } catch {
      // Fallback data
      setTraining([
        { id: '1', title: 'Food Safety Level 2', trainer: 'MFSA Instructor', start_date: '2026-02-15', duration: '4 hours', attendees: 6, status: 'scheduled', type: 'Compliance' },
        { id: '2', title: 'POS System Training', trainer: 'IT Manager', start_date: '2026-02-18', duration: '2 hours', attendees: 4, status: 'scheduled', type: 'Operations' },
        { id: '3', title: 'Wine & Beverage Pairing', trainer: 'Sommelier', start_date: '2026-02-20', duration: '3 hours', attendees: 8, status: 'scheduled', type: 'Skills' },
        { id: '4', title: 'Fire Safety & Evacuation', trainer: 'Safety Officer', start_date: '2026-02-22', duration: '1 hour', attendees: 15, status: 'scheduled', type: 'Compliance' },
        { id: '5', title: 'Customer Service Excellence', trainer: 'FOH Manager', start_date: '2026-03-01', duration: '2 hours', attendees: 10, status: 'planned', type: 'Skills' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const filtered = training.filter(t =>
    t.title.toLowerCase().includes(search.toLowerCase()) ||
    t.trainer?.toLowerCase().includes(search.toLowerCase())
  );

  const getTypeBadge = (type) => {
    const colors = {
      Compliance: 'bg-red-500/10 text-red-500 border-red-500/20',
      Operations: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
      Skills: 'bg-green-500/10 text-green-500 border-green-500/20',
    };
    return colors[type] || 'bg-muted text-muted-foreground';
  };

  if (loading) return <PageContainer title="Upcoming Training"><div className="flex items-center justify-center h-64 text-muted-foreground">Loading...</div></PageContainer>;

  return (
    <PageContainer title="Upcoming Training Sessions" description="Training programs scheduled to start soon">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10"><GraduationCap className="h-5 w-5 text-primary" /></div>
              <div>
                <p className="text-2xl font-bold">{training.length}</p>
                <p className="text-sm text-muted-foreground">Sessions Planned</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10"><Users className="h-5 w-5 text-green-500" /></div>
              <div>
                <p className="text-2xl font-bold">{training.reduce((sum, t) => sum + t.attendees, 0)}</p>
                <p className="text-sm text-muted-foreground">Total Attendees</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10"><Clock className="h-5 w-5 text-blue-500" /></div>
              <div>
                <p className="text-2xl font-bold">{training.filter(t => t.type === 'Compliance').length}</p>
                <p className="text-sm text-muted-foreground">Compliance Required</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" placeholder="Search training..." />
      </div>

      {/* Training List */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-3">
            {filtered.map((session) => (
              <div key={session.id} className="flex items-center gap-4 p-4 rounded-lg border hover:bg-accent/50 transition">
                <div className="p-3 rounded-xl bg-primary/10">
                  <GraduationCap className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold">{session.title}</div>
                  <div className="text-sm text-muted-foreground">Trainer: {session.trainer}</div>
                </div>
                <div className="text-right hidden md:block">
                  <div className="flex items-center gap-1 text-sm">
                    <Calendar className="h-3 w-3" />
                    {new Date(session.start_date).toLocaleDateString()}
                  </div>
                  <div className="text-xs text-muted-foreground">{session.duration}</div>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  {session.attendees}
                </div>
                <Badge className={getTypeBadge(session.type)} variant="outline">{session.type}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
