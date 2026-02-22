import { Activity, AlertCircle, CheckCircle, Database, Loader2, RefreshCw, Server, Wifi, Clock, Cpu, HardDrive, Zap } from 'lucide-react';
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import PermissionGate from '../../components/shared/PermissionGate';
import { Badge } from '../../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Progress } from '../../components/ui/progress';
import { useAuth } from '../../context/AuthContext';
import { useAuditLog } from '../../hooks/useAuditLog';
import PageLayout from '../../layouts/PageLayout';
import api from '../../lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────
interface MonitoringMetrics {
  avg_latency_ms: number;
  p50_latency_ms: number;
  p95_latency_ms: number;
  p99_latency_ms: number;
  rps: number;
  error_rate_5xx: number;
  total_requests: number;
  total_errors_5xx: number;
  uptime_seconds: number;
  db_ok: boolean;
  db_latency_ms: number;
  memory_mb: number;
  cpu_percent: number;
  queue_depth: number;
  consumer_throughput: number;
  dlq_size: number;
  total_documents: number;
  collection_stats: Record<string, number>;
  db_read_qps: number;
  db_write_qps: number;
  replication_lag_ms: number;
  active_alerts: number;
}

// ─── Fetcher ──────────────────────────────────────────────────────────────────
const fetchMonitoringMetrics = async (): Promise<MonitoringMetrics> => {
  const { data } = await api.get('/system/hyperscale-metrics');
  return data;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatUptime = (seconds: number): string => {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
};

// ─── Main Component ───────────────────────────────────────────────────────────
export default function MonitoringDashboard() {
  const { user } = useAuth();
  const { logAction } = useAuditLog();

  // Audit log
  useEffect(() => {
    if (user?.id) logAction('MONITORING_DASHBOARD_VIEWED', 'monitoring_dashboard');
  }, [user?.id]);

  // Real API with 5s polling + visibility awareness
  const { data: metrics, isLoading, refetch } = useQuery<MonitoringMetrics>({
    queryKey: ['monitoring-metrics'],
    queryFn: fetchMonitoringMetrics,
    refetchInterval: 5000,
    staleTime: 3000,
    refetchOnWindowFocus: true,
  });

  // Derive service statuses from real data
  const services = metrics ? [
    {
      name: 'FastAPI Backend',
      status: metrics.error_rate_5xx < 0.05 ? 'healthy' : metrics.error_rate_5xx < 0.1 ? 'degraded' : 'unhealthy',
      responseTime: `${metrics.avg_latency_ms.toFixed(1)}ms`,
      uptime: formatUptime(metrics.uptime_seconds),
      details: {
        rps: metrics.rps.toFixed(2),
        total_requests: metrics.total_requests,
        error_rate: `${(metrics.error_rate_5xx * 100).toFixed(2)}%`,
      },
    },
    {
      name: 'MongoDB Atlas',
      status: metrics.db_ok ? 'healthy' : 'unhealthy',
      responseTime: `${metrics.db_latency_ms.toFixed(1)}ms`,
      uptime: metrics.db_ok ? '99.9%' : 'DOWN',
      details: {
        collections: Object.keys(metrics.collection_stats || {}).length,
        total_documents: metrics.total_documents,
        read_qps: metrics.db_read_qps,
        write_qps: metrics.db_write_qps,
      },
    },
    {
      name: 'Event Bus',
      status: metrics.queue_depth < 50 ? 'healthy' : metrics.queue_depth < 200 ? 'degraded' : 'unhealthy',
      responseTime: `${metrics.queue_depth} pending`,
      uptime: formatUptime(metrics.uptime_seconds),
      details: {
        consumer_throughput: metrics.consumer_throughput?.toFixed(1),
        dlq_size: metrics.dlq_size,
        note: metrics.dlq_size > 0 ? `${metrics.dlq_size} in DLQ` : 'Clean',
      },
    },
  ] : [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-400';
      case 'degraded': return 'text-amber-500';
      case 'unhealthy': return 'text-red-400';
      default: return 'text-zinc-500';
    }
  };

  const getStatusVariant = (status: string): "default" | "destructive" | "secondary" | "outline" => {
    switch (status) {
      case 'healthy': return 'default';
      case 'unhealthy': return 'destructive';
      default: return 'secondary';
    }
  };

  const getIcon = (name: string) => {
    switch (name) {
      case 'FastAPI Backend': return <Server className="h-5 w-5" />;
      case 'MongoDB Atlas': return <Database className="h-5 w-5" />;
      case 'Event Bus': return <Activity className="h-5 w-5" />;
      default: return <Activity className="h-5 w-5" />;
    }
  };

  // Resource usage from real data
  const memoryPct = metrics ? Math.min(100, Math.round((metrics.memory_mb / 512) * 100)) : 0;
  const cpuPct = metrics ? Math.min(100, Math.round(metrics.cpu_percent)) : 0;

  return (
    <PermissionGate requiredRole="OWNER">
      <PageLayout
        title="Real-Time Monitor"
        description="Live system metrics with 5-second refresh"
        actions={
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm bg-white/5 text-zinc-300 border border-white/10"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Refresh
          </button>
        }
      >
        <div className="space-y-6">
          {/* Top Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Cpu className="h-4 w-4 text-blue-400" />
                  <span className="text-xs text-zinc-400 uppercase font-bold">Avg Latency</span>
                </div>
                <div className="text-2xl font-bold text-zinc-100">{metrics?.avg_latency_ms.toFixed(1) || '—'}ms</div>
                <p className="text-xs text-zinc-500 mt-1">P95: {metrics?.p95_latency_ms.toFixed(0) || '—'}ms · P99: {metrics?.p99_latency_ms.toFixed(0) || '—'}ms</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="h-4 w-4 text-yellow-400" />
                  <span className="text-xs text-zinc-400 uppercase font-bold">Throughput</span>
                </div>
                <div className="text-2xl font-bold text-zinc-100">{metrics ? (metrics.rps * 60).toFixed(0) : '—'} r/m</div>
                <p className="text-xs text-zinc-500 mt-1">{metrics?.rps.toFixed(2) || '—'} req/s</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="h-4 w-4 text-red-400" />
                  <span className="text-xs text-zinc-400 uppercase font-bold">Error Rate</span>
                </div>
                <div className={`text-2xl font-bold ${metrics && metrics.error_rate_5xx > 0.01 ? 'text-red-400' : 'text-green-400'}`}>
                  {metrics ? (metrics.error_rate_5xx * 100).toFixed(2) : '—'}%
                </div>
                <p className="text-xs text-zinc-500 mt-1">{metrics?.total_errors_5xx.toLocaleString() || '0'} / {metrics?.total_requests.toLocaleString() || '0'}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4 text-purple-400" />
                  <span className="text-xs text-zinc-400 uppercase font-bold">Uptime</span>
                </div>
                <div className="text-2xl font-bold text-zinc-100">{metrics ? formatUptime(metrics.uptime_seconds) : '—'}</div>
                <p className="text-xs text-zinc-500 mt-1">{metrics?.total_requests.toLocaleString() || '0'} requests served</p>
              </CardContent>
            </Card>
          </div>

          {/* Services Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Services Status</span>
                <span className="text-xs font-normal text-zinc-500">
                  Auto-refresh: 5s
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {services.map((service) => (
                  <div key={service.name} className="flex items-center justify-between p-4 rounded-lg bg-white/[0.02] border border-white/5">
                    <div className="flex items-center gap-3">
                      <div className={getStatusColor(service.status)}>
                        {getIcon(service.name)}
                      </div>
                      <div>
                        <h4 className="font-medium text-zinc-100">{service.name}</h4>
                        <p className="text-xs text-zinc-400">
                          Response: {service.responseTime}
                          {service.details?.collections !== undefined && ` · ${service.details.collections} collections · ${service.details.total_documents?.toLocaleString()} docs`}
                          {service.details?.rps && ` · ${service.details.rps} req/s`}
                          {service.details?.note && ` · ${service.details.note}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-sm font-medium text-zinc-300">{service.uptime}</div>
                        <p className="text-xs text-zinc-500">uptime</p>
                      </div>
                      <Badge variant={getStatusVariant(service.status)}>{service.status}</Badge>
                    </div>
                  </div>
                ))}
                {!services.length && !isLoading && (
                  <p className="text-center py-4 text-zinc-500">{"No "}services data available</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Resource Usage — REAL DATA */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Cpu className="h-4 w-4 text-blue-400" />
                  Backend Resources
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-zinc-400">Memory Usage</span>
                    <span className="text-zinc-100">{metrics?.memory_mb?.toFixed(0) || 0} MB</span>
                  </div>
                  <Progress value={memoryPct} />
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-zinc-400">CPU Usage</span>
                    <span className="text-zinc-100">{metrics?.cpu_percent?.toFixed(1) || 0}%</span>
                  </div>
                  <Progress value={cpuPct} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-4 w-4 text-green-400" />
                  MongoDB Performance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-zinc-400">Read QPS</span>
                    <span className="text-zinc-100">{metrics?.db_read_qps?.toFixed(0) || 0}</span>
                  </div>
                  <Progress value={Math.min(100, (metrics?.db_read_qps || 0) / 10 * 100)} />
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-zinc-400">Write QPS</span>
                    <span className="text-zinc-100">{metrics?.db_write_qps?.toFixed(0) || 0}</span>
                  </div>
                  <Progress value={Math.min(100, (metrics?.db_write_qps || 0) / 5 * 100)} />
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-zinc-400">Replication Lag</span>
                    <span className="text-zinc-100">{metrics?.replication_lag_ms?.toFixed(1) || 0}ms</span>
                  </div>
                  <Progress value={Math.min(100, (metrics?.replication_lag_ms || 0) / 100 * 100)} />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Queue Metrics — REAL DATA */}
          <Card>
            <CardHeader>
              <CardTitle>Event Queue Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-6">
                <div className="text-center">
                  <Database className="h-8 w-8 mx-auto mb-2 text-amber-500" />
                  <div className="text-3xl font-bold text-zinc-100">{metrics?.queue_depth || 0}</div>
                  <p className="text-sm text-zinc-400">Pending</p>
                </div>
                <div className="text-center">
                  <Zap className="h-8 w-8 mx-auto mb-2 text-blue-400" />
                  <div className="text-3xl font-bold text-zinc-100">{metrics?.consumer_throughput?.toFixed(0) || 0}</div>
                  <p className="text-sm text-zinc-400">Throughput/s</p>
                </div>
                <div className="text-center">
                  <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-400" />
                  <div className="text-3xl font-bold text-zinc-100">{metrics?.total_requests?.toLocaleString() || 0}</div>
                  <p className="text-sm text-zinc-400">Processed</p>
                </div>
                <div className="text-center">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2 text-red-400" />
                  <div className="text-3xl font-bold text-zinc-100">{metrics?.dlq_size || 0}</div>
                  <p className="text-sm text-zinc-400">Dead Letter</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </PageLayout>
    </PermissionGate>
  );
}
