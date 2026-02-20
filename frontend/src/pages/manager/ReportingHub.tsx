import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import ReportingService from '../../services/ReportingService';
import { toast } from 'sonner';
import PageContainer from '../../layouts/PageContainer';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Badge } from '../../components/ui/badge';
import { Play, FileDown, Users, ShoppingCart, RefreshCw } from 'lucide-react';

const CATEGORY_COLORS = {
  CRM: 'bg-purple-100 text-purple-700 border-purple-200',
  OPS: 'bg-orange-100 text-orange-700 border-orange-200',
  FINANCE: 'bg-green-100 text-green-700 border-green-200',
  HR: 'bg-blue-100 text-blue-700 border-blue-200'
};

export default function ReportingHub() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [reportDefs, setReportDefs] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);

  const venueId = user?.venueId || user?.venue_id;

  useEffect(() => {
    loadReportDefs();
  }, []);

  const loadReportDefs = async () => {
    setLoading(true);
    try {
      const defs = await ReportingService.listDefs(venueId);
      setReportDefs(defs);
    } catch (error: any) {
      console.error('Failed to load report defs:', error);
      if (error.response?.status !== 403) {
        toast.error('Failed to load reports');
      }
    } finally {
      setLoading(false);
    }
  };

  const runReport = async () => {
    if (!selectedReport) return;

    setRunning(true);
    try {
      const runResult = await ReportingService.runReport(
        venueId,
        selectedReport.key,
        {},
        'json'
      );

      if (runResult.status === 'done') {
        setResult(runResult.result_data);
        toast.success('Report generated successfully');
      } else {
        toast.error(runResult.error?.message || 'Report failed');
      }
    } catch (error: any) {
      console.error('Failed to run report:', error);
      toast.error('Failed to run report');
    } finally {
      setRunning(false);
    }
  };

  const crmReports = reportDefs.filter(r => r.category === 'CRM');
  const opsReports = reportDefs.filter(r => r.category === 'OPS');

  return (
    <PageContainer
      title="Reporting Hub"
      description="CRM & operational analytics"
      actions={
        <Button onClick={loadReportDefs} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Report List */}
        <Card className="lg:col-span-1">
          <Tabs defaultValue="crm" className="w-full">
            <CardHeader className="pb-3">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="crm">
                  <Users className="w-4 h-4 mr-1" />
                  CRM
                </TabsTrigger>
                <TabsTrigger value="ops">
                  <ShoppingCart className="w-4 h-4 mr-1" />
                  OPS
                </TabsTrigger>
              </TabsList>
            </CardHeader>

            <CardContent>
              <TabsContent value="crm" className="space-y-2 mt-0">
                {crmReports.map(report => (
                  <div
                    key={report.key}
                    onClick={() => setSelectedReport(report)}
                    className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${selectedReport?.key === report.key
                      ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-500'
                      : 'border-zinc-200 dark:border-border hover:border-zinc-300 dark:hover:border-border'
                      }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm text-zinc-900 dark:text-foreground">{report.title}</h4>
                        <p className="text-xs text-muted-foreground dark:text-muted-foreground mt-1">{report.description}</p>
                      </div>
                      <Badge className={`${CATEGORY_COLORS[report.category]} dark:bg-opacity-20`}>
                        {report.category}
                      </Badge>
                    </div>
                  </div>
                ))}
              </TabsContent>

              <TabsContent value="ops" className="space-y-2 mt-0">
                {opsReports.map(report => (
                  <div
                    key={report.key}
                    onClick={() => setSelectedReport(report)}
                    className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${selectedReport?.key === report.key
                      ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-500'
                      : 'border-zinc-200 dark:border-border hover:border-zinc-300 dark:hover:border-border'
                      }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm text-zinc-900 dark:text-foreground">{report.title}</h4>
                        <p className="text-xs text-muted-foreground dark:text-muted-foreground mt-1">{report.description}</p>
                      </div>
                      <Badge className={`${CATEGORY_COLORS[report.category]} dark:bg-opacity-20`}>
                        {report.category}
                      </Badge>
                    </div>
                  </div>
                ))}
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>

        {/* Report Result */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>
                {selectedReport ? selectedReport.title : 'Select a Report'}
              </CardTitle>
              {selectedReport && (
                <Button onClick={runReport} disabled={running} size="sm">
                  <Play className="w-4 h-4 mr-2" />
                  {running ? 'Running...' : 'Run Report'}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!selectedReport ? (
              <div className="text-center py-12 text-gray-500">
                <p>Select a report from the list to view details</p>
              </div>
            ) : result ? (
              <div className="space-y-4">
                <div className="text-sm text-gray-600">
                  <strong>Rows:</strong> {result?.rows?.length || 0}
                </div>
                <pre className="bg-zinc-50 dark:bg-card p-4 rounded-lg overflow-auto text-xs text-zinc-900 dark:text-foreground border border-zinc-200 dark:border-border">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <p>Click "Run Report" to generate results</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
