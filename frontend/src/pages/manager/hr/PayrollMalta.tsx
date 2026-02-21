import { Download,FileText,Loader2,Play } from 'lucide-react';
import { useEffect,useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import DataTable from '../../../components/shared/DataTable';
import PermissionGate from '../../../components/shared/PermissionGate';
import { Button } from '../../../components/ui/button';
import { Card,CardContent,CardHeader,CardTitle } from '../../../components/ui/card';
import { Select,SelectContent,SelectItem,SelectTrigger,SelectValue } from '../../../components/ui/select';
import { Tabs,TabsContent,TabsList,TabsTrigger } from '../../../components/ui/tabs';
import { useAuth } from '../../../context/AuthContext';
import { useVenue } from '../../../context/VenueContext';
import { useAuditLog } from '../../../hooks/useAuditLog';
import PageContainer from '../../../layouts/PageContainer';
import api from '../../../lib/api';

import { logger } from '@/lib/logger';
export default function PayrollMalta() {
  const { activeVenue } = useVenue();
  const { user, isOwner: _isOwner, isManager: _isManager } = useAuth();
  const navigate = useNavigate();
  const { logAction } = useAuditLog();

  const [activeTab, setActiveTab] = useState('payrun');
  const [loading, setLoading] = useState(false);
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [month, setMonth] = useState((new Date().getMonth() + 1).toString());

  // Data State
  const [payRuns, setPayRuns] = useState([]);
  const [fs5Data, setFs5Data] = useState(null);
  const [selectedRun, setSelectedRun] = useState(null);

  // Audit: log payroll views
  useEffect(() => {
    if (user?.id && activeVenue?.id) {
      logAction('PAYROLL_VIEWED', 'payroll_malta', activeVenue.id);
    }
  }, [user?.id, activeVenue?.id]);

  useEffect(() => {
    if (activeVenue?.id) {
      if (activeTab === 'payrun') loadPayRuns();
      if (activeTab === 'fs5') loadFs5();
    }
  }, [activeVenue?.id, activeTab, year, month]);

  const loadPayRuns = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/payroll-mt/payruns?venue_id=${activeVenue.id}`);
      setPayRuns(res.data?.data || []);
    } catch (e) {
      logger.error(e);
      toast.error("Failed to load pay runs");
    } finally {
      setLoading(false);
    }
  };

  const loadFs5 = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/payroll-mt/reports/fs5?venue_id=${activeVenue.id}&year=${year}&month=${month}`);
      setFs5Data(res.data?.data);
    } catch (e) {
      logger.error(e);
      // toast.error("Failed to load FS5 data"); // Might be 404 if no data, suppress noise
      setFs5Data(null);
    } finally {
      setLoading(false);
    }
  };

  const activeRun = async () => {
    setLoading(true);
    try {
      const _res = await api.post('/payroll-mt/run', {
        venue_id: activeVenue.id,
        year: parseInt(year),
        month: parseInt(month),
        commit: true
      });
      toast.success("Pay run generated successfully");
      loadPayRuns();
    } catch (e) {
      logger.error(e);
      toast.error("Failed to generate pay run");
    } finally {
      setLoading(false);
    }
  };

  const downloadPayslip = async (runId, employeeId, employeeName) => {
    try {
      const res = await api.get(
        `/payroll-mt/run/${runId}/payslip/${employeeId}/pdf`,
        {
          params: { venue_id: activeVenue.id },
          responseType: 'blob'
        }
      );

      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Payslip_${employeeName}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (e) {
      logger.error(e);
      toast.error("Failed to download PDF");
    }
  };

  return (
    <PermissionGate requiredRole="MANAGER">
      <PageContainer
        title="Malta Payroll"
        description="FS3, FS5, and Pay Run Management (Malta Parity)"
      >
        <div className="flex gap-4 mb-6">
          <Select aria-label="Select option" value={year} onValueChange={setYear}>
            <SelectTrigger aria-label="Select option" className="w-32 bg-background border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[2024, 2025, 2026].map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select aria-label="Select option" value={month} onValueChange={setMonth}>
            <SelectTrigger aria-label="Select option" className="w-32 bg-background border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                <SelectItem key={m} value={m.toString()}>Month {m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-background border border-border mb-4">
            <TabsTrigger value="payrun">Pay Runs</TabsTrigger>
            <TabsTrigger value="fs5">FS5 Report</TabsTrigger>
            <TabsTrigger value="fs3">FS3 Report</TabsTrigger>
          </TabsList>

          <TabsContent value="payrun">
            <div className="mb-4 flex justify-between">
              <h3 className="font-bold text-lg">History</h3>
              <Button onClick={activeRun} disabled={loading} className="bg-blue-600 hover:bg-blue-700">
                <Play className="w-4 h-4 mr-2" />
                Run Payroll for {year}-{month}
              </Button>
            </div>
            <Card className="bg-background border-border">
              <CardContent className="p-0">
                <DataTable
                  columns={[
                    { key: 'period', label: 'Period' },
                    { key: 'employee_count', label: 'Employees' },
                    {
                      key: 'total_net',
                      label: 'Total Net',
                      render: (row) => `€${row.total_net.toFixed(2)}`
                    },
                    {
                      key: 'state',
                      label: 'Status',
                      render: (row) => <span className="uppercase text-xs font-bold text-green-500">{row.state}</span>
                    },
                    {
                      key: 'actions',
                      label: 'Payslips',
                      render: (row) => (
                        <Button variant="ghost" size="sm" onClick={() => setSelectedRun(row)}>
                          View Slips
                        </Button>
                      )
                    }
                  ]}
                  data={payRuns}
                  loading={loading}
                />
              </CardContent>
            </Card>

            {selectedRun && (
              <div className="mt-8">
                <h3 className="font-bold text-lg mb-4">Payslips: {selectedRun.period}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {selectedRun.payslips.map((slip, i) => (
                    <Card key={i} className="bg-card border-border">
                      <CardContent className="p-4 flex justify-between items-center">
                        <div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (slip.employee_id) navigate(`/manager/hr/people/${slip.employee_id}`);
                            }}
                            className="font-bold text-foreground hover:text-blue-400 transition-colors hover:underline decoration-blue-500/40 underline-offset-2"
                          >
                            {slip.employee_name}
                          </button>
                          <div className="text-xs text-muted-foreground">Net: €{slip.net_pay.toFixed(2)}</div>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => downloadPayslip(selectedRun.id, slip.employee_id, slip.employee_name)}>
                          <Download className="w-4 h-4" />
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="fs5">
            <Card className="bg-background border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-muted-foreground" />
                  FS5 - Monthly FSS & SSC Return
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="py-12 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground" /></div>
                ) : !fs5Data ? (
                  <div className="py-12 text-center text-muted-foreground">{"No "}Data for this period</div>
                ) : (
                  <div className="space-y-6 text-sm">
                    <div className="grid grid-cols-2 gap-8 border-b border-border pb-4">
                      <div>
                        <div className="text-muted-foreground">Period</div>
                        <div className="font-bold text-xl">{fs5Data.year} - {fs5Data.month}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-muted-foreground">Total Due</div>
                        <div className="font-bold text-xl text-red-500">€{fs5Data.totals?.total_due?.toFixed(2) || '0.00'}</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="p-4 bg-card rounded border border-border">
                        <div className="text-xs text-muted-foreground mb-1">D2. Total Tax (FSS)</div>
                        <div className="font-bold text-lg">€{fs5Data.totals?.fss_tax?.toFixed(2)}</div>
                      </div>
                      <div className="p-4 bg-card rounded border border-border">
                        <div className="text-xs text-muted-foreground mb-1">D3. SSC (Emp+Matenity)</div>
                        <div className="font-bold text-lg">€{fs5Data.totals?.ssc_total?.toFixed(2)}</div>
                      </div>
                      <div className="p-4 bg-card rounded border border-border">
                        <div className="text-xs text-muted-foreground mb-1">D4. Maternity Fund</div>
                        <div className="font-bold text-lg">€{fs5Data.totals?.maternity_fund?.toFixed(2)}</div>
                      </div>
                    </div>
                    <Button className="w-full bg-secondary hover:bg-secondary/80">Download Official FS5 PDF</Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="fs3">
            <div className="py-12 text-center text-muted-foreground border border-dashed border-border rounded-xl">
              Select an employee to generate Annual FS3 Statement.
              <br />
              <span className="text-xs italic">(Viewing Mode Only in this demo)</span>
            </div>
          </TabsContent>
        </Tabs>
      </PageContainer>
    </PermissionGate>
  );
}
