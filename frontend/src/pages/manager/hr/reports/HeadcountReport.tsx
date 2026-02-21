
import { Loader2,Users } from 'lucide-react';
import { useEffect,useState } from 'react';
import { Bar,BarChart,Cell,ResponsiveContainer,Tooltip,XAxis,YAxis } from 'recharts';
import { Card,CardContent,CardHeader,CardTitle } from '../../../../components/ui/card';
import { useAuth } from '../../../../context/AuthContext';
import api from '../../../../lib/api';

import { logger } from '@/lib/logger';
export default function HeadcountReport() {
  const { user } = useAuth();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const venueId = localStorage.getItem("restin_venue_id") || "venue-caviar-bull";
      const response = await api.get(`/venues/${venueId}/hr/employees`);
      processData(response.data);
      setLoading(false);
    } catch (error) {
      logger.error("Failed to load headcount:", error);
      setLoading(false);
    }
  };

  const processData = (employees) => {
    // Group by Department
    const byDept = {};
    employees.forEach(emp => {
      if (emp.employment_status !== 'active') return;
      const dept = emp.department || 'Unassigned';
      byDept[dept] = (byDept[dept] || 0) + 1;
    });

    const chartData = Object.keys(byDept).map(key => ({
      name: key,
      count: byDept[key]
    }));
    setData(chartData);
  };

  if (loading) return <Loader2 className="animate-spin w-8 h-8 m-auto text-indigo-500" />;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
        <Users className="w-6 h-6 text-indigo-400" />
        Headcount Report
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Active Headcount by Department</CardTitle>
          </CardHeader>
          <CardContent className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <XAxis dataKey="name" stroke="#71717a" />
                <YAxis stroke="#71717a" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', color: '#fff' }} /* keep-inline */
                  itemStyle={{ color: '#818cf8' }} /* keep-inline */
                />
                <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]}>
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={['#4f46e5', '#818cf8', '#6366f1', '#a5b4fc'][index % 4]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Summary Stats */}
        <div className="space-y-4">
          {data.map((item, idx) => (
            <Card key={idx} className="bg-card border-border">
              <CardContent className="flex items-center justify-between p-6">
                <div>
                  <div className="text-sm font-medium text-muted-foreground">{item.name}</div>
                  <div className="text-2xl font-bold text-foreground">{item.count} Employees</div>
                </div>
                <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-indigo-400" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
