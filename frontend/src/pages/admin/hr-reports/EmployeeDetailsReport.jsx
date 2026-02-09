import React, { useState, useEffect } from 'react';import { logger } from '@/lib/logger';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';import { logger } from '@/lib/logger';

import api from '@/lib/api';

import { logger } from '@/lib/logger';
export default function EmployeeDetailsReport() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const response = await api.get('reporting/employee-details');
      setEmployees(response.data);
    } catch (error) {
      logger.error('Failed to fetch employee details:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <h1 className="text-3xl font-bold text-foreground mb-6">Employee Details Report</h1>
      <Card>
        <CardContent className="p-0">
          <table className="w-full">
            <thead className="bg-slate-100">
              <tr>
                <th className="p-3 text-left">Name</th>
                <th className="p-3 text-left">Occupation</th>
                <th className="p-3 text-left">Department</th>
                <th className="p-3 text-left">Employment Date</th>
                <th className="p-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {employees.map(emp => (
                <tr key={emp.employee_id} className="border-b hover:bg-slate-50">
                  <td className="p-3">{emp.name}</td>
                  <td className="p-3">{emp.occupation}</td>
                  <td className="p-3">{emp.department}</td>
                  <td className="p-3">{emp.employment_date}</td>
                  <td className="p-3"><span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">{emp.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
