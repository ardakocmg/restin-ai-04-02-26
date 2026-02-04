import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '@/lib/api';

export default function EmployeePortal() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const response = await api.get('employee-portal/data');
      setData(response.data);
    } catch (error) {
      console.error('Failed to fetch portal data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-8">Loading...</div>;
  if (!data) return <div className="p-8">No data available</div>;

  const getColorForEventType = (type) => {
    const colorMap = {
      'Public Holiday': 'bg-green-200',
      'WORKING REMOTELY': 'bg-purple-200',
      'VAC24': 'bg-blue-200',
      'CURRENT': 'bg-blue-500 text-white'
    };
    return colorMap[type] || 'bg-gray-100';
  };

  return (
    <div className="p-6 space-y-6 bg-[#09090b] min-h-screen text-zinc-100">
      <h1 className="text-3xl font-black text-white uppercase tracking-tighter">Employee Portal</h1>

      <div className="grid gap-6 md:grid-cols-3">
        {/* My Profile */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white">My Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center">
              <div className="w-24 h-24 rounded-full bg-zinc-800 flex items-center justify-center mb-4 border border-zinc-700">
                <span className="text-2xl font-bold text-zinc-400">
                  {data.my_profile.name.split(' ').map(n => n[0]).join('')}
                </span>
              </div>
              <h3 className="text-lg font-bold text-white">{data.my_profile.name}</h3>
              <p className="text-sm text-zinc-500 font-medium uppercase tracking-wide">{data.my_profile.job_title}</p>
              <div className="flex gap-2 mt-4">
                <Button variant="outline" size="sm" className="border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-800">More details</Button>
                <Button size="sm" className="bg-blue-600 hover:bg-blue-500 text-white">My Profile</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Leave Balances */}
        <Card className="col-span-2 bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white">Leave Balances</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {data.leave_balances.map((balance, idx) => (
                <div key={idx} className="text-center group">
                  <div className="relative w-24 h-24 mx-auto mb-2">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle
                        cx="48"
                        cy="48"
                        r="40"
                        stroke="#27272a"
                        strokeWidth="8"
                        fill="none"
                      />
                      <circle
                        cx="48"
                        cy="48"
                        r="40"
                        stroke="#3B82F6"
                        strokeWidth="8"
                        fill="none"
                        strokeDasharray={`${(balance.hours_left / balance.total_hours) * 251.2} 251.2`}
                        className="transition-all duration-1000 ease-out group-hover:stroke-blue-400"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-2xl font-black text-white">{balance.hours_left}</span>
                      <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">hours left</span>
                    </div>
                  </div>
                  <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">{balance.leave_type}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Out of Office & Leave Metrics */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="col-span-2 bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white">Out of the office</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 mb-4">
              <Button size="sm" className="bg-blue-600 hover:bg-blue-500 text-white">Apply</Button>
              <Button size="sm" variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">Cancel</Button>
              <Button size="sm" variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">Sick</Button>
              <Button size="sm" variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">Heat Map</Button>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
              {data.out_of_office.map((staff, idx) => (
                <div key={idx} className="flex items-center gap-3 p-3 bg-zinc-950/50 border border-zinc-800/50 rounded-lg hover:border-zinc-700 transition-colors">
                  <div className="w-8 h-8 rounded-md bg-zinc-800 border border-zinc-700" />
                  <div className="flex-1">
                    <p className="text-sm font-bold text-zinc-200">{staff.name}</p>
                    <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-wide">
                      {staff.leave_type} • {staff.start_time}{staff.end_time && ` - ${staff.end_time}`}
                    </p>
                  </div>
                  {staff.is_sick && <span className="text-red-500 text-xs">🔴</span>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white">Leave Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-center p-4 bg-zinc-950/50 border border-zinc-800 rounded-xl">
                <p className="text-3xl font-black text-white">{data.leave_metrics.on_leave_today}</p>
                <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">On leave today</p>
              </div>
              <div className="text-center p-4 bg-zinc-950/50 border border-zinc-800 rounded-xl">
                <p className="text-3xl font-black text-white">{data.leave_metrics.on_leave_tomorrow}</p>
                <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">On leave tomorrow</p>
              </div>
              <div className="text-center p-4 bg-zinc-950/50 border border-zinc-800 rounded-xl">
                <p className="text-3xl font-black text-white">{data.leave_metrics.on_sick_leave_today}</p>
                <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">On sick leave today</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
