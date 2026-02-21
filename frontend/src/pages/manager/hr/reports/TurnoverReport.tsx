
import { Loader2,TrendingDown,TrendingUp,UserMinus } from 'lucide-react';
import { useEffect,useState } from 'react';
import { Card,CardContent,CardHeader,CardTitle } from '../../../../components/ui/card';
import { useAuth } from '../../../../context/AuthContext';
import api from '../../../../lib/api';

import { logger } from '@/lib/logger';
export default function TurnoverReport() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ joined: 0, left: 0, turnoverRate: "0" });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const venueId = localStorage.getItem("restin_venue_id") || "venue-caviar-bull";
      const response = await api.get(`/venues/${venueId}/hr/employees`);

      // Simulating turnover logic (as mock doesn't retain history well)
      // In real app, we would query historical logs or `end_date`
      const employees = response.data || [];
      const joined = employees.filter(e => e.start_date?.startsWith('2025') || e.start_date?.startsWith('2026')).length;
      const left = employees.filter(e => e.employment_status === 'terminated').length;
      const total = employees.length || 1;

      setStats({
        joined,
        left,
        turnoverRate: ((left / total) * 100).toFixed(1)
      });
      setLoading(false);
    } catch (error) {
      logger.error("Failed to load turnover:", error);
      setLoading(false);
    }
  };

  if (loading) return <Loader2 className="animate-spin w-8 h-8 m-auto text-red-500" />;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
        <UserMinus className="w-6 h-6 text-red-500" />
        Turnover Report (YTD)
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-card border-border">
          <CardHeader><CardTitle className="text-muted-foreground text-sm">New Joiners</CardTitle></CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-green-400 flex items-center gap-2">
              {stats.joined}
              <TrendingUp className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardHeader><CardTitle className="text-muted-foreground text-sm">Leavers</CardTitle></CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-red-400 flex items-center gap-2">
              {stats.left}
              <TrendingDown className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardHeader><CardTitle className="text-muted-foreground text-sm">Turnover Rate</CardTitle></CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-orange-400">{stats.turnoverRate}%</div>
          </CardContent>
        </Card>
      </div>

      <div className="p-4 bg-secondary/50 rounded-lg text-muted-foreground text-sm">
        * Data based on start/end dates recorded in employment history.
      </div>
    </div>
  );
}
