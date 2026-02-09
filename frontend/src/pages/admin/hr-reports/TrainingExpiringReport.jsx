import React, { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import api from '@/lib/api';

export default function TrainingExpiringReport() {
  const [trainings, setTrainings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const response = await api.get('reporting/training-expiring-soon');
      setTrainings(response.data);
    } catch (error) {
      logger.error('Failed to fetch training data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <h1 className="text-3xl font-bold text-foreground mb-6">Training & Certifications Expiring Soon</h1>
      <Card>
        <CardContent className="p-0">
          <table className="w-full">
            <thead className="bg-slate-100">
              <tr>
                <th className="p-3 text-left">Employee</th>
                <th className="p-3 text-left">Certification</th>
                <th className="p-3 text-left">Expiry Date</th>
                <th className="p-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {trainings.map(training => (
                <tr key={training.id} className="border-b hover:bg-slate-50">
                  <td className="p-3">{training.employee_name}</td>
                  <td className="p-3">{training.certification_name}</td>
                  <td className="p-3">{training.expiry_date}</td>
                  <td className="p-3"><span className="px-2 py-1 bg-orange-100 text-orange-800 rounded text-xs">{training.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}