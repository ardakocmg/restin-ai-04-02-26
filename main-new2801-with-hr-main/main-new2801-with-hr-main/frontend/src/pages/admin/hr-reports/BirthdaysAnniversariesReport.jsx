import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Cake } from 'lucide-react';
import api from '@/lib/api';

export default function BirthdaysAnniversariesReport() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const response = await api.get('reporting/birthdays-anniversaries');
      setEvents(response.data);
    } catch (error) {
      console.error('Failed to fetch birthdays/anniversaries:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <h1 className="text-3xl font-bold text-slate-900 mb-6">Birthdays & Anniversaries</h1>
      <Card>
        <CardContent className="p-0">
          <table className="w-full">
            <thead className="bg-slate-100">
              <tr>
                <th className="p-3 text-left">Employee</th>
                <th className="p-3 text-left">Event Type</th>
                <th className="p-3 text-left">Date</th>
                <th className="p-3 text-left">Years</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event, idx) => (
                <tr key={idx} className="border-b hover:bg-slate-50">
                  <td className="p-3 flex items-center gap-2">
                    <Cake className="h-4 w-4 text-pink-500" />
                    {event.employee_name}
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded text-xs ${event.event_type === 'birthday' ? 'bg-pink-100 text-pink-800' : 'bg-blue-100 text-blue-800'
                      }`}>{event.event_type}</span>
                  </td>
                  <td className="p-3">{event.date}</td>
                  <td className="p-3">{event.years || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}