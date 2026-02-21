import { AlertTriangle,CheckCircle,History,Loader2,Play,XCircle } from 'lucide-react';
import { useEffect,useMemo,useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card,CardContent,CardHeader,CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Select,SelectContent,SelectItem,SelectTrigger,SelectValue } from '../../components/ui/select';
import { Tabs,TabsContent,TabsList,TabsTrigger } from '../../components/ui/tabs';
import PageContainer from '../../layouts/PageContainer';
import api from '../../lib/api';

export default function TestPanel() {
  const [method, setMethod] = useState('GET');
  const [path, setPath] = useState('/api/venues');
  const [requestBody, setRequestBody] = useState('{}');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [runs, setRuns] = useState([]);
  const [runsLoading, setRunsLoading] = useState(false);
  const [selectedRunId, setSelectedRunId] = useState(null);
  const venueId = localStorage.getItem('restin_pos_venue') || 'venue-caviar-bull';

  useEffect(() => {
    loadRuns();
  }, []);

  const activeRun = useMemo(() => {
    if (result) return result;
    return runs.find((run) => run.id === selectedRunId) || null;
  }, [result, runs, selectedRunId]);

  const loadRuns = async () => {
    try {
      setRunsLoading(true);
      const response = await api.get('/observability/testpanel/runs', { params: { venue_id: venueId } });
      setRuns(response.data.runs || []);
    } catch (error) {
      toast.error('Failed to load test runs');
    } finally {
      setRunsLoading(false);
    }
  };

  const handleRun = async () => {
    try {
      setLoading(true);
      const response = await api.post('/observability/testpanel/run', {
        venue_id: venueId,
        target: { method, path },
        request_body: JSON.parse(requestBody)
      });
      setResult(response.data.run);
      setSelectedRunId(response.data.run?.id || null);
      loadRuns();
      toast.success('Test executed');
    } catch (error) {
      toast.error('Test failed');
      setResult({
        display_id: 'ERROR',
        response: error?.response?.data || { message: error.message },
        status_code: error?.response?.status || 500,
        created_at: new Date().toISOString(),
        steps: [],
        trace: {}
      });
    } finally {
      setLoading(false);
    }
  };

  const getStepColor = (status) => {
    const colors = {
      SUCCESS: '#4ADE80',
      FAILED: '#EF4444',
      PENDING: '#FB8C00',
      PARTIAL: '#FDB86C',
      SKIPPED: '#71717A',
      BLOCKED: '#71717A',
      RETRIED: '#3B82F6'
    };
    return colors[status] || '#A1A1AA';
  };

  const formatJson = (payload) => {
    if (!payload) return '';
    try {
      return JSON.stringify(payload, null, 2);
    } catch (error) {
      return String(payload);
    }
  };

  return (
    <PageContainer title="Test Panel" description="Run internal API tests">
      <div className="grid grid-cols-1 xl:grid-cols-[420px_1fr] gap-6">
        {/* Request Builder */}
        <Card data-testid="testpanel-request-card">
          <CardHeader>
            <CardTitle>Request Builder</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2 block">Method</label>
              <Select aria-label="Select option" value={method} onValueChange={setMethod}>
                <SelectTrigger aria-label="Testpanel Method Select" data-testid="testpanel-method-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GET">GET</SelectItem>
                  <SelectItem value="POST">POST</SelectItem>
                  <SelectItem value="PUT">PUT</SelectItem>
                  <SelectItem value="DELETE">DELETE</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2 block">Path</label>
              <Input aria-label="Input field" value={path} onChange={(e) => setPath(e.target.value)} data-testid="testpanel-path-input" />
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2 block">Request Body (JSON)</label>
              <textarea aria-label="Input"
                className="w-full p-3 rounded-lg text-sm font-mono"
                style={{ /* keep-inline */
                  backgroundColor: '#09090B',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  color: '#F8FAFC',
                  minHeight: '120px'
                 /* keep-inline */ }} /* keep-inline */ /* keep-inline */
                value={requestBody}
                onChange={(e) => setRequestBody(e.target.value)}
                data-testid="testpanel-body-textarea"
              />
            </div>
            <Button
              onClick={handleRun}
              disabled={loading}
              className="w-full bg-card border-border text-foreground hover:bg-secondary transition-all shadow-lg font-bold uppercase tracking-tight"
              data-testid="testpanel-run-button"
            >
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin text-red-500" /> : <Play className="w-4 h-4 mr-2 text-red-500" />}
              Run Test
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card data-testid="testpanel-runs-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <History className="w-4 h-4" />
                Recent Runs
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={loadRuns}
                data-testid="testpanel-refresh-runs"
                className="text-red-500 hover:text-red-400 hover:bg-red-500/10 font-black uppercase text-[10px] tracking-widest"
              >
                Refresh
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {runsLoading && <p className="text-sm text-muted-foreground">{"Loading "}runs...</p>}
              {!runsLoading && runs.length === 0 && (
                <p className="text-sm text-muted-foreground">{"No "}runs yet.</p>
              )}
              {!runsLoading && runs.map((run) => (
                <button
                  key={run.id}
                  onClick={() => {
                    setResult(null);
                    setSelectedRunId(run.id);
                  }}
                  className={`w-full text-left p-3 rounded-lg border transition-all ${selectedRunId === run.id ? 'border-red-500 bg-red-500/15 ring-1 ring-red-500/50' : 'border-border bg-card/60 hover:bg-secondary'}`}
                  data-testid={`testpanel-run-${run.display_id}`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-secondary-foreground font-semibold">{run.display_id}</p>
                      <p className="text-xs text-muted-foreground">{run.target?.method} {run.target?.path}</p>
                    </div>
                    <Badge variant={run.success ? 'default' : 'destructive'}>{run.status_code}</Badge>
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>

          {/* Results */}
          {activeRun && (
            <Card data-testid="testpanel-result-card">
              <CardHeader>
                <CardTitle>Test Result: {activeRun.display_id}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2 mb-4">
                  <Badge variant={activeRun.success ? 'default' : 'destructive'} data-testid="testpanel-status-badge">
                    {activeRun.success ? 'SUCCESS' : 'FAILED'}
                  </Badge>
                  <Badge variant="outline" data-testid="testpanel-status-code">
                    {activeRun.status_code}
                  </Badge>
                  <Badge variant="outline" data-testid="testpanel-method-badge">
                    {activeRun.target?.method}
                  </Badge>
                </div>
                <Tabs defaultValue="steps">
                  <TabsList>
                    <TabsTrigger value="steps" data-testid="testpanel-tab-steps">Steps</TabsTrigger>
                    <TabsTrigger value="response" data-testid="testpanel-tab-response">Response</TabsTrigger>
                    <TabsTrigger value="trace" data-testid="testpanel-tab-trace">Trace</TabsTrigger>
                    <TabsTrigger value="events" data-testid="testpanel-tab-events">Events</TabsTrigger>
                    <TabsTrigger value="audits" data-testid="testpanel-tab-audits">Audits</TabsTrigger>
                    <TabsTrigger value="diagrams" data-testid="testpanel-tab-diagrams">Diagrams</TabsTrigger>
                  </TabsList>
                  <TabsContent value="steps" className="space-y-2 mt-4">
                    {activeRun.steps?.map((step) => (
                      <div
                        key={step.step_id}
                        className="flex items-center gap-3 p-3 rounded-lg"
                        style={{ backgroundColor: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.05)'  /* keep-inline */ }} /* keep-inline */ /* keep-inline */
                        data-testid={`testpanel-step-${step.step_id}`}
                      >
                        {step.status === 'SUCCESS' ? (
                          <CheckCircle className="h-5 w-5" style={{ color: getStepColor(step.status)  /* keep-inline */ }} /* keep-inline */ /* keep-inline */ />
                        ) : step.status === 'FAILED' ? (
                          <XCircle className="h-5 w-5" style={{ color: getStepColor(step.status)  /* keep-inline */ }} /* keep-inline */ /* keep-inline */ />
                        ) : (
                          <AlertTriangle className="h-5 w-5" style={{ color: getStepColor(step.status)  /* keep-inline */ }} /* keep-inline */ /* keep-inline */ />
                        )}
                        <div className="flex-1">
                          <p style={{ color: '#F5F5F7'  /* keep-inline */ }} /* keep-inline */ /* keep-inline */>{step.title}</p>
                          <p className="text-xs" style={{ color: '#71717A'  /* keep-inline */ }} /* keep-inline */ /* keep-inline */>{step.domain}</p>
                        </div>
                        <Badge variant={step.status === 'SUCCESS' ? 'default' : 'destructive'}>
                          {step.status}
                        </Badge>
                      </div>
                    ))}
                  </TabsContent>
                  <TabsContent value="response">
                    <pre
                      className="text-xs p-4 rounded-lg overflow-auto"
                      style={{ backgroundColor: '#27272A', color: '#F5F5F7', maxHeight: '400px'  /* keep-inline */ }} /* keep-inline */ /* keep-inline */
                      data-testid="testpanel-response-output"
                    >
                      {formatJson(activeRun.response)}
                    </pre>
                  </TabsContent>
                  <TabsContent value="trace">
                    <div className="space-y-2" data-testid="testpanel-trace-summary">
                      <div className="flex justify-between">
                        <span style={{ color: '#A1A1AA'  /* keep-inline */ }} /* keep-inline */ /* keep-inline */>Status Code:</span>
                        <span style={{ color: '#F5F5F7'  /* keep-inline */ }} /* keep-inline */ /* keep-inline */>{activeRun.status_code}</span>
                      </div>
                      <div className="flex justify-between">
                        <span style={{ color: '#A1A1AA'  /* keep-inline */ }} /* keep-inline */ /* keep-inline */>Latency:</span>
                        <span style={{ color: '#F5F5F7'  /* keep-inline */ }} /* keep-inline */ /* keep-inline */>{activeRun.trace?.latency_ms || '--'} ms</span>
                      </div>
                      <div className="flex justify-between">
                        <span style={{ color: '#A1A1AA'  /* keep-inline */ }} /* keep-inline */ /* keep-inline */>Request ID:</span>
                        <span style={{ color: '#F5F5F7'  /* keep-inline */ }} /* keep-inline */ /* keep-inline */>{activeRun.trace?.request_id || '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span style={{ color: '#A1A1AA'  /* keep-inline */ }} /* keep-inline */ /* keep-inline */>Created:</span>
                        <span style={{ color: '#F5F5F7'  /* keep-inline */ }} /* keep-inline */ /* keep-inline */>{new Date(activeRun.created_at).toLocaleString()}</span>
                      </div>
                    </div>
                  </TabsContent>
                  <TabsContent value="events">
                    <pre
                      className="text-xs p-4 rounded-lg overflow-auto"
                      style={{ backgroundColor: '#27272A', color: '#F5F5F7', maxHeight: '400px'  /* keep-inline */ }} /* keep-inline */ /* keep-inline */
                      data-testid="testpanel-events-output"
                    >
                      {formatJson(activeRun.events)}
                    </pre>
                  </TabsContent>
                  <TabsContent value="audits">
                    <pre
                      className="text-xs p-4 rounded-lg overflow-auto"
                      style={{ backgroundColor: '#27272A', color: '#F5F5F7', maxHeight: '400px'  /* keep-inline */ }} /* keep-inline */ /* keep-inline */
                      data-testid="testpanel-audits-output"
                    >
                      {formatJson(activeRun.audits)}
                    </pre>
                  </TabsContent>
                  <TabsContent value="diagrams">
                    <pre
                      className="text-xs p-4 rounded-lg overflow-auto"
                      style={{ backgroundColor: '#27272A', color: '#F5F5F7', maxHeight: '400px'  /* keep-inline */ }} /* keep-inline */ /* keep-inline */
                      data-testid="testpanel-diagrams-output"
                    >
                      {formatJson(activeRun.diagrams)}
                    </pre>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </PageContainer>
  );
}
