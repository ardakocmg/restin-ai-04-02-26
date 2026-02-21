import React, { useState, useEffect } from 'react';
import PageContainer from '../../../../layouts/PageContainer';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card';
import { Badge } from '../../../../components/ui/badge';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { BookOpen, Clock, CheckCircle2, AlertTriangle, Users, Search, BarChart3 } from 'lucide-react';
import api from '../../../../lib/api';

export default function TrainingOngoingReport() {
  const [training, setTraining] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadTraining();
  }, []);

  const loadTraining = async () => {
    try {
      const venueId = localStorage.getItem('currentVenueId') || 'venue-caviar-bull';
      const res = await api.get(`/hr/training/ongoing?venue_id=${venueId}`);
      setTraining(res.data || []);
    } catch {
      setTraining([
        { id: '1', title: 'HACCP Certification', employee: 'Marco Vella', progress: 75, started: '2026-01-15', deadline: '2026-03-15', status: 'on_track' },
        { id: '2', title: 'Barista Masterclass', employee: 'Sarah Borg', progress: 45, started: '2026-01-20', deadline: '2026-02-28', status: 'at_risk' },
        { id: '3', title: 'Management Leadership', employee: 'David Camilleri', progress: 90, started: '2025-12-01', deadline: '2026-02-15', status: 'on_track' },
        { id: '4', title: 'First Aid Refresher', employee: 'Lisa Grech', progress: 100, started: '2026-01-10', deadline: '2026-02-10', status: 'completed' },
        { id: '5', title: 'Allergen Awareness', employee: 'Mark Zammit', progress: 30, started: '2026-02-01', deadline: '2026-03-01', status: 'on_track' },
        { id: '6', title: 'Wine Sommelier Level 1', employee: 'Anna Mifsud', progress: 60, started: '2025-11-15', deadline: '2026-04-15', status: 'on_track' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusConfig = (status) => {
    const map = {
      on_track: { label: 'On Track', className: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20', icon: CheckCircle2 },
      at_risk: { label: 'At Risk', className: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20', icon: AlertTriangle },
      completed: { label: 'Completed', className: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20', icon: CheckCircle2 },
      overdue: { label: 'Overdue', className: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20', icon: AlertTriangle },
    };
    return map[status] || map.on_track;
  };

  const filtered = training.filter(t =>
    t.title.toLowerCase().includes(search.toLowerCase()) ||
    t.employee?.toLowerCase().includes(search.toLowerCase())
  );

  const completedCount = training.filter(t => t.status === 'completed').length;
  const atRiskCount = training.filter(t => t.status === 'at_risk').length;
  const avgProgress = training.length ? Math.round(training.reduce((s, t) => s + t.progress, 0) / training.length) : 0;

  if (loading) return <PageContainer title="Ongoing Training"><div className="flex items-center justify-center h-64 text-muted-foreground">Loading...</div></PageContainer>;

  return (
    <PageContainer title="Ongoing Training" description="Monitor active training progress for all staff">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10"><BookOpen className="h-5 w-5 text-primary" /></div>
              <div>
                <p className="text-2xl font-bold">{training.length}</p>
                <p className="text-sm text-muted-foreground">Active Programs</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10"><CheckCircle2 className="h-5 w-5 text-green-500" /></div>
              <div>
                <p className="text-2xl font-bold">{completedCount}</p>
                <p className="text-sm text-muted-foreground">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10"><AlertTriangle className="h-5 w-5 text-amber-500" /></div>
              <div>
                <p className="text-2xl font-bold">{atRiskCount}</p>
                <p className="text-sm text-muted-foreground">At Risk</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10"><BarChart3 className="h-5 w-5 text-blue-500" /></div>
              <div>
                <p className="text-2xl font-bold">{avgProgress}%</p>
                <p className="text-sm text-muted-foreground">Avg Progress</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" placeholder="Search by training or employee..." />
      </div>

      {/* Training Cards */}
      <div className="space-y-3">
        {filtered.map((item) => {
          const statusConfig = getStatusConfig(item.status);
          return (
            <Card key={item.id} className="hover:shadow-md transition">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-semibold text-lg">{item.title}</span>
                      <Badge className={statusConfig.className} variant="outline">{statusConfig.label}</Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {item.employee}</span>
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Started {new Date(item.started).toLocaleDateString()}</span>
                      <span>Deadline: {new Date(item.deadline).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-bold">{item.progress}%</span>
                  </div>
                </div>
                {/* Progress Bar */}
                <div className="mt-4 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${item.progress === 100 ? 'bg-green-500' :
                        item.status === 'at_risk' ? 'bg-amber-500' : 'bg-primary'
                      }`}
                    style={{ width: `${item.progress}%` }}
                  />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </PageContainer>
  );
}
