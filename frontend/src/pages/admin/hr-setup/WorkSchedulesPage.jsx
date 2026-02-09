import React, { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';

import { Card, CardContent } from '@/components/ui/card';

import { Button } from '@/components/ui/button';

import { Plus, Edit, Trash } from 'lucide-react';

import api from '@/lib/api';

export default function WorkSchedulesPage() {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSchedules();
  }, []);

  const fetchSchedules = async () => {
    try {
      const response = await api.get('/employee-setup/work-schedules');
      setSchedules(response.data);
    } catch (error) {
      logger.error('Failed to fetch work schedules:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">Work Schedule Profiles</h1>
        <Button><Plus className="h-4 w-4 mr-2" /> Add Schedule</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full">
            <thead className="bg-slate-100">
              <tr>
                <th className="p-3 text-left">Profile Name</th>
                <th className="p-3 text-left">Hours/Week</th>
                <th className="p-3 text-left">Days/Week</th>
                <th className="p-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {schedules.map(schedule => (
                <tr key={schedule.id} className="border-b hover:bg-slate-50">
                  <td className="p-3">{schedule.profile_name}</td>
                  <td className="p-3">{schedule.hours_per_week}</td>
                  <td className="p-3">{schedule.days_per_week}</td>
                  <td className="p-3 text-center">
                    <div className="flex gap-2 justify-center">
                      <button className="text-blue-600 dark:text-blue-400"><Edit className="h-4 w-4" /></button>
                      <button className="text-red-600 dark:text-red-400"><Trash className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}