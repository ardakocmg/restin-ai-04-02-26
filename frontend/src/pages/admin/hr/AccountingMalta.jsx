import React, { useState } from 'react';
import { useVenue } from '../../../context/VenueContext';
import api from '../../../lib/api';
import PageContainer from '../../../layouts/PageContainer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { Label } from '../../../components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table';
import { FileDown, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function AccountingMalta() {
  const { activeVenue } = useVenue();
  const [loading, setLoading] = useState(false);
  const [target, setTarget] = useState('xero');
  const [range, setRange] = useState('last_month');

  // Mock History (Replace with real API call if available)
  const [history, setHistory] = useState([
    { id: 1, date: '2024-01-05 10:00', type: 'Xero', period: 'Dec 2023', status: 'Success', user: 'Admin' },
    { id: 2, date: '2023-12-05 09:30', type: 'SFM', period: 'Nov 2023', status: 'Success', user: 'Admin' },
  ]);

  const handleExport = async () => {
    setLoading(true);
    try {
      // Simulate API call or call real endpoint
      // await api.post(`/accounting/export`, { venue_id: activeVenue.id, target, range });
      await new Promise(r => setTimeout(r, 1500)); // Fake processing

      toast.success(`${target.toUpperCase()} Export generated successfully`);

      // Add to history
      setHistory(prev => [{
        id: Date.now(),
        date: new Date().toISOString().replace('T', ' ').substring(0, 16),
        type: target === 'xero' ? 'Xero' : 'Shireburn SFM',
        period: range === 'last_month' ? 'Last Month' : 'Year to Date',
        status: 'Success',
        user: 'You'
      }, ...prev]);

    } catch (e) {
      console.error(e);
      toast.error("Export failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer
      title="Accounting Bridge"
      description="Export financial data to Xero or Shireburn SFM"
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="bg-zinc-950 border-white/10 h-fit">
          <CardHeader>
            <CardTitle>Generate Export</CardTitle>
            <CardDescription>Select target system and period</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Target System</Label>
              <Select value={target} onValueChange={setTarget}>
                <SelectTrigger className="bg-zinc-900 border-white/10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="xero">Xero Cloud Accounting</SelectItem>
                  <SelectItem value="sfm">Shireburn SFM (local)</SelectItem>
                  <SelectItem value="sage">Sage Pastel</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Period</Label>
              <Select value={range} onValueChange={setRange}>
                <SelectTrigger className="bg-zinc-900 border-white/10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="last_month">Last Month</SelectItem>
                  <SelectItem value="this_month">Current Month</SelectItem>
                  <SelectItem value="last_quarter">Last Quarter</SelectItem>
                  <SelectItem value="ytd">Year to Date (YTD)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="p-4 bg-yellow-900/10 border border-yellow-900/30 rounded text-xs text-yellow-500 flex gap-2">
              <AlertCircle className="w-4 h-4" />
              <div>
                Ensure all invoices and daily sales are finalized before exporting to prevent Journal entry mismatches.
              </div>
            </div>

            <Button
              className="w-full bg-indigo-600 hover:bg-indigo-700 font-bold"
              onClick={handleExport}
              disabled={loading}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <FileDown className="w-4 h-4 mr-2" />}
              GENERATE {target.toUpperCase()} BATCH
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-zinc-950 border-white/10 lg:col-span-2">
          <CardHeader>
            <CardTitle>Export History</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 hover:bg-transparent">
                  <TableHead>Date</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((row) => (
                  <TableRow key={row.id} className="border-white/5 hover:bg-white/5">
                    <TableCell className="font-mono text-xs">{row.date}</TableCell>
                    <TableCell>{row.type}</TableCell>
                    <TableCell>{row.period}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1 text-green-500 text-xs font-bold px-2 py-1 bg-green-900/20 rounded-full">
                        <CheckCircle2 className="w-3 h-3" /> {row.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <FileDown className="w-4 h-4 text-zinc-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
