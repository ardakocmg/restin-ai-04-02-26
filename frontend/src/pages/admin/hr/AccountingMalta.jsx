import React, { useState, useEffect } from 'react';
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

import { logger } from '@/lib/logger';
export default function AccountingMalta() {
  const { activeVenue } = useVenue();
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [target, setTarget] = useState('xero');
  const [range, setRange] = useState('last_month');
  const [history, setHistory] = useState([]);

  useEffect(() => {
    if (activeVenue?.id) loadHistory();
  }, [activeVenue?.id]);

  const loadHistory = async () => {
    try {
      const res = await api.get('/accounting/exports', { params: { venue_id: activeVenue.id } });
      setHistory(Array.isArray(res.data) ? res.data : res.data.exports || []);
    } catch (err) {
      logger.warn('Failed to load accounting exports');
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleExport = async () => {
    setLoading(true);
    try {
      await api.post('/accounting/exports', {
        venue_id: activeVenue.id,
        target,
        range
      });
      toast.success(`${target.toUpperCase()} Export generated successfully`);
      // Reload history to show the new export
      loadHistory();
    } catch (e) {
      logger.error(e);
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
            {historyLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
              </div>
            ) : (
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
                  {history.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-zinc-500">No exports yet</TableCell>
                    </TableRow>
                  ) : history.map((row) => (
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
            )}
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
