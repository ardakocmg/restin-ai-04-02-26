
import React, { useState, useEffect } from 'react';
import api from '../../../../lib/api';
import { Loader2, CalendarRange } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../../components/ui/table';

export default function EmploymentDatesReport() {
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

  if (loading) return <Loader2 className="animate-spin w-8 h-8 m-auto text-blue-500" />;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
        <CalendarRange className="w-6 h-6 text-blue-500" />
        Employment Dates (Contracts & Probation)
      </h1>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <Table>
          <TableHeader className="bg-secondary">
            <TableRow>
              <TableHead className="text-foreground">Employee</TableHead>
              <TableHead className="text-foreground">Department</TableHead>
              <TableHead className="text-foreground">Start Date</TableHead>
              <TableHead className="text-foreground">Probation End</TableHead>
              <TableHead className="text-foreground">Contract End</TableHead>
              <TableHead className="text-foreground">Tenure</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {employees.map(emp => {
              const start = emp.start_date ? new Date(emp.start_date) : null;
              const probation = start ? new Date(start.getTime() + (180 * 24 * 60 * 60 * 1000)) : null; // +6 Months Mock
              const tenure = start ? Math.floor((new Date().getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365)) + ' Years' : '-';

              return (
                <TableRow key={emp.id} className="border-border">
                  <TableCell className="font-medium text-foreground">{emp.full_name}</TableCell>
                  <TableCell>{emp.department}</TableCell>
                  <TableCell>{start ? start.toLocaleDateString() : '-'}</TableCell>
                  <TableCell>{probation ? probation.toLocaleDateString() : '-'}</TableCell>
                  <TableCell>{emp.end_date || 'Ongoing'}</TableCell>
                  <TableCell><span className="px-2 py-1 bg-secondary rounded text-xs">{tenure}</span></TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
