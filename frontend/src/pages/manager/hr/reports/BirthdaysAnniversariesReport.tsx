
import { Cake,Gift,Loader2 } from 'lucide-react';
import { useEffect,useState } from 'react';
import { Card,CardContent,CardHeader,CardTitle } from '../../../../components/ui/card';
import api from '../../../../lib/api';

export default function BirthdaysAnniversariesReport() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const venueId = localStorage.getItem("restin_venue_id") || "venue-caviar-bull";
      const response = await api.get(`/venues/${venueId}/hr/employees`);
      setEmployees(response.data || []);
      setLoading(false);
    } catch (error) {
      setLoading(false);
    }
  };

  // Helper to get upcoming dates
  const getUpcoming = (list, field) => {
    const today = new Date();
    const currentMonth = today.getMonth();
    return list
      .filter(e => e[field])
      .map(e => ({ ...e, dateObj: new Date(e[field]) }))
      .filter(e => e.dateObj.getMonth() === currentMonth || e.dateObj.getMonth() === (currentMonth + 1) % 12)
      .sort((a, b) => a.dateObj.getDate() - b.dateObj.getDate());
  };

  const upcomingBirthdays = getUpcoming(employees, 'date_of_birth'); // Assuming field exists
  const upcomingAnniversaries = getUpcoming(employees, 'start_date');

  if (loading) return <Loader2 className="animate-spin w-8 h-8 m-auto text-pink-500" />;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
        <Gift className="w-6 h-6 text-pink-500" />
        Culture & Moments (This Month)
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-card border-border">
          <CardHeader><CardTitle className="text-foreground flex items-center gap-2"><Cake className="w-4 h-4 text-pink-400" /> Upcoming Birthdays</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {upcomingBirthdays.length === 0 ? <p className="text-muted-foreground">{"No "}upcoming birthdays.</p> : (
              upcomingBirthdays.map(e => (
                <div key={e.id} className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                  <div className="font-medium text-foreground">{e.full_name}</div>
                  <div className="text-muted-foreground">
                    {new Date(e.date_of_birth).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader><CardTitle className="text-foreground flex items-center gap-2"><Gift className="w-4 h-4 text-purple-400" /> Work Anniversaries</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {upcomingAnniversaries.length === 0 ? <p className="text-muted-foreground">{"No "}upcoming anniversaries.</p> : (
              upcomingAnniversaries.map(e => (
                <div key={e.id} className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                  <div className="font-medium text-foreground">{e.full_name}</div>
                  <div className="text-muted-foreground">
                    {new Date(e.start_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
