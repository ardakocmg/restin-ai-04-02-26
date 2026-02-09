
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import api from '../../../lib/api';
import { Loader2, FileText, Download } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { toast } from 'sonner';


import { logger } from '@/lib/logger';
export default function EmployeeDetailsReport() {
  const { user } = useAuth();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const venueId = localStorage.getItem("restin_venue_id") || "venue-caviar-bull";
      const response = await api.get('/hr/employees', { params: { venue_id: venueId } });
      setData(response.data || []);
      setLoading(false);
    } catch (error) {
      logger.error("Failed to load details:", error);
      setLoading(false);
    }
  };

  const columns = [
    { accessorKey: "display_id", header: "ID" },
    { accessorKey: "full_name", header: "Name" },
    { accessorKey: "role", header: "Role" },
    { accessorKey: "department", header: "Department" },
    {
      accessorKey: "start_date",
      header: "Start Date",
      cell: ({ row }) => row.original.start_date ? new Date(row.original.start_date).toLocaleDateString() : '-'
    },
    { accessorKey: "phone", header: "Mobile" },
    { accessorKey: "email", header: "Email" },
  ];

  if (loading) return <Loader2 className="animate-spin w-8 h-8 m-auto text-blue-500" />;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <FileText className="w-6 h-6 text-blue-500" />
          Employee Master Data
        </h1>
        <Button variant="outline" onClick={() => toast.info("Export CSV coming soon")}>
          <Download className="w-4 h-4 mr-2" /> Export
        </Button>
      </div>

      <div className="bg-zinc-900 border border-white/10 rounded-xl overflow-hidden p-4">
        {/* Fallback to simple table if DataTable not compatible */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-zinc-400">
            <thead className="text-xs uppercase bg-zinc-800 text-zinc-200">
              <tr>
                {columns.map(c => <th key={c.header} className="p-3">{c.header}</th>)}
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr key={row.id} className="border-b border-white/5 hover:bg-white/5">
                  <td className="p-3 font-mono">{row.display_id || row.id.slice(0, 5)}</td>
                  <td className="p-3 font-medium text-white">{row.full_name}</td>
                  <td className="p-3 capitalize">{row.role}</td>
                  <td className="p-3">{row.department || '-'}</td>
                  <td className="p-3">{row.start_date || '-'}</td>
                  <td className="p-3">{row.phone || '-'}</td>
                  <td className="p-3">{row.email || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
