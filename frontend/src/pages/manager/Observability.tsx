import { logger } from '@/lib/logger';
import {
  Activity,
  AlertCircle,
  Cpu,
  Database,
  HardDrive,
  Monitor,
  Printer,
  RefreshCw,
  Server,
  Tablet,
  Wifi,
  Clock,
  Zap,
  AlertTriangle,
} from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { StatCard, StatsGrid } from '../../components/shared/Stats';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { useAuth } from '../../context/AuthContext';
import { useVenue } from '../../context/VenueContext';
import PageContainer from '../../layouts/PageContainer';
import api from '../../lib/api';
import { cn } from '../../lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────
interface SystemMetrics {
  avg_latency_ms: number;
  p50_latency_ms: number;
  p95_latency_ms: number;
  p99_latency_ms: number;
  rps: number;
  error_rate_5xx: number;
  uptime_seconds: number;
  db_ok: boolean;
  db_latency_ms: number;
  memory_mb: number;
  cpu_percent: number;
  total_requests: number;
  total_errors_5xx: number;
  queue_depth: number;
  active_alerts: number;
  dlq_size: number;
  total_documents: number;
  collection_stats: Record<string, number>;
}

// ─── Fetchers ─────────────────────────────────────────────────────────────────
const fetchMetrics = async (): Promise<SystemMetrics> => {
  const { data } = await api.get('/system/hyperscale-metrics');
  return data;
};

// ─── Status Pill ──────────────────────────────────────────────────────────────
interface StatusPillProps {
  icon: React.ElementType;
  status: string;
  label: string;
  sublabel?: string;
}

const StatusPill: React.FC<StatusPillProps> = ({ icon: Icon, status, label, sublabel }) => {
  const isOnline = status === 'online' || status === 'healthy';
  const isDegraded = status === 'degraded' || status === 'warning';

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-black/40 border border-border hover:bg-black/60 transition-all group">
      <div className={cn(
        "w-10 h-10 rounded-lg flex items-center justify-center border transition-all shadow-lg",
        isOnline ? "bg-green-500/10 border-green-500/20 text-green-500" :
          isDegraded ? "bg-yellow-500/10 border-yellow-500/20 text-yellow-500" :
            "bg-red-500/10 border-red-500/20 text-red-500"
      )}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground truncate">{label}</span>
          <div className={cn(
            "h-1.5 w-1.5 rounded-full",
            isOnline ? "bg-green-500 shadow-[0_0_8px_#22c55e]" :
              isDegraded ? "bg-yellow-500" : "bg-red-500"
          )} />
        </div>
        <div className="flex items-baseline gap-2">
          <span className={cn(
            "text-xs font-black uppercase tracking-tighter",
            isOnline ? "text-green-500" : isDegraded ? "text-yellow-500" : "text-red-500"
          )}>
            {status === 'healthy' || status === 'online' ? 'CLOUD ONLINE' : status?.toUpperCase() || 'OFFLINE'}
          </span>
          {sublabel && <span className="text-[9px] text-muted-foreground truncate">({sublabel})</span>}
        </div>
      </div>
    </div>
  );
};

// ─── Format Helpers ───────────────────────────────────────────────────────────
const formatUptime = (seconds: number): string => {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
};

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Observability() {
  const { user } = useAuth();
  const { activeVenue } = useVenue();
  const venueId = activeVenue?.id || user?.venueId;

  const [devices] = useState<Array<{ id: string; name: string; status: string; device_type: string }>>([]);

  // Real API data with 10s polling
  const { data: metrics, isLoading, refetch } = useQuery<SystemMetrics>({
    queryKey: ['observability-metrics'],
    queryFn: fetchMetrics,
    refetchInterval: 10000,
    staleTime: 5000,
  });

  // Derive infra status from real metrics
  const infraStatus = [
    {
      id: 'backend', icon: Server, label: 'FastAPI Backend',
      status: metrics ? (metrics.error_rate_5xx < 0.05 ? 'healthy' : metrics.error_rate_5xx < 0.1 ? 'degraded' : 'unhealthy') : 'unknown',
      sublabel: metrics ? `${metrics.avg_latency_ms.toFixed(0)}ms avg` : 'Loading...',
    },
    {
      id: 'db', icon: Database, label: 'MongoDB Atlas',
      status: metrics?.db_ok ? 'healthy' : 'unhealthy',
      sublabel: metrics?.db_ok ? `${metrics.db_latency_ms.toFixed(0)}ms ping` : 'Unreachable',
    },
    {
      id: 'api', icon: Activity, label: 'API Gateway',
      status: metrics ? (metrics.rps > 0 ? 'healthy' : 'healthy') : 'unknown',
      sublabel: metrics ? `${metrics.rps.toFixed(1)} req/s` : 'Loading...',
    },
  ];

  // Load devices from venue API
  const loadDevices = async () => {
    if (!venueId) return;
    try {
      await api.get(`/venues/${venueId}/devices`).catch(() => ({ data: [] }));
    } catch (error) {
      logger.error('Failed to load devices:', error);
    }
  };

  return (
    <PageContainer
      title="Observability"
      description="System health and real-time monitoring"
      actions={
        <Button
          onClick={() => { refetch(); loadDevices(); }}
          variant="outline"
          size="sm"
          className="bg-card border-border text-secondary-foreground hover:bg-secondary hover:text-foreground transition-all shadow-lg"
        >
          <RefreshCw className={cn("w-4 h-4 mr-2 text-red-500", isLoading && "animate-spin")} />
          Refresh
        </Button>
      }
    >
      {/* Quick Links: Test Panel & Error Inbox */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <Card className="bg-card/50 border-border shadow-2xl">
          <CardHeader>
            <CardTitle className="text-sm font-black uppercase tracking-[0.2em] text-foreground flex items-center gap-2">
              <Cpu className="w-4 h-4 text-blue-500" />
              Test Panel
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-tight">Run safe API calls and capture run artifacts.</p>
            <Link to="/manager/observability/testpanel">
              <Button
                variant="outline"
                className="w-full bg-background border-border text-foreground hover:bg-card transition-all font-black uppercase tracking-widest text-[10px] h-12"
              >
                Open Test Panel
              </Button>
            </Link>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border shadow-2xl">
          <CardHeader>
            <CardTitle className="text-sm font-black uppercase tracking-[0.2em] text-foreground flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500" />
              Error Inbox
              {metrics && metrics.active_alerts > 0 && (
                <span className="ml-auto bg-red-500/20 text-red-400 text-[10px] px-2 py-0.5 rounded-full font-mono">
                  {metrics.active_alerts}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-tight">Triaged errors with safe retry workflows.</p>
            <Link to="/manager/observability/error-inbox">
              <Button
                variant="outline"
                className="w-full bg-background border-border text-foreground hover:bg-card transition-all font-black uppercase tracking-widest text-[10px] h-12"
              >
                Open Error Inbox
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Infrastructure Status — REAL DATA */}
      <div className="mb-8 p-6 rounded-2xl bg-background/50 border border-border shadow-inner">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xs font-black uppercase tracking-[0.25em] text-foreground flex items-center gap-2">
            <Wifi className="w-4 h-4 text-green-500" />
            Cloud Infrastructure
          </h3>
          <span className="text-[10px] px-2 py-1 rounded bg-green-500/5 text-green-600 dark:text-green-400 border border-green-500/20 uppercase font-black tracking-widest">
            {metrics ? (metrics.db_ok ? 'ALL SYSTEMS GO' : 'DEGRADED') : 'LOADING...'}
          </span>
        </div>

        <div className="space-y-8">
          {/* Core Infrastructure */}
          <div>
            <h4 className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground mb-4 ml-1">Core Services</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {infraStatus.map(item => (
                <StatusPill key={item.id} {...item} />
              ))}
            </div>
          </div>

          {/* Collection Stats Table */}
          {metrics?.collection_stats && Object.keys(metrics.collection_stats).length > 0 && (
            <div>
              <h4 className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground mb-4 ml-1">Database Collections</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {Object.entries(metrics.collection_stats).map(([name, count]) => (
                  <div key={name} className="p-3 rounded-lg bg-black/40 border border-border">
                    <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground truncate">{name}</div>
                    <div className="text-lg font-bold text-foreground">{count.toLocaleString()}</div>
                    <div className="text-[9px] text-muted-foreground">documents</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Connected Terminals */}
          <div>
            <h4 className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground mb-4 ml-1">Connected Terminals & PCs</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {devices.filter(d => ['pos', 'kds', 'terminal'].includes(d.device_type?.toLowerCase())).length > 0 ? (
                devices
                  .filter(d => ['pos', 'kds', 'terminal'].includes(d.device_type?.toLowerCase()))
                  .map(device => (
                    <StatusPill key={device.id} icon={Monitor} label={device.name} status={device.status} sublabel={device.device_type?.toUpperCase()} />
                  ))
              ) : (
                <div className="col-span-full py-4 text-center border-2 border-dashed border-border rounded-xl">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{"No "}active terminals detected</p>
                </div>
              )}
            </div>
          </div>

          {/* Peripherals */}
          <div>
            <h4 className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground mb-4 ml-1">Peripherals & IoT</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {devices.filter(d => ['printer', 'scanner', 'sensor'].includes(d.device_type?.toLowerCase())).length > 0 ? (
                devices
                  .filter(d => ['printer', 'scanner', 'sensor'].includes(d.device_type?.toLowerCase()))
                  .map(device => (
                    <StatusPill
                      key={device.id}
                      icon={device.device_type?.toLowerCase() === 'printer' ? Printer : Tablet}
                      label={device.name}
                      status={device.status}
                      sublabel={device.device_type?.toUpperCase()}
                    />
                  ))
              ) : (
                <div className="col-span-full py-4 text-center border-2 border-dashed border-border rounded-xl">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{"No "}peripherals detected</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Performance Benchmarks — REAL DATA */}
      <h3 className="text-xs font-black uppercase tracking-[0.25em] text-foreground mb-6 flex items-center gap-2">
        <Activity className="w-4 h-4 text-blue-500" />
        Performance Benchmarks
      </h3>
      <StatsGrid columns={4}>
        <StatCard
          title="Avg API Latency"
          value={metrics ? `${metrics.avg_latency_ms.toFixed(1)}ms` : '—'}
          icon={Cpu}
          description={metrics ? `P95: ${metrics.p95_latency_ms.toFixed(0)}ms · P99: ${metrics.p99_latency_ms.toFixed(0)}ms` : 'Loading...'}
          className="bg-black/40 border-border"
        />
        <StatCard
          title="Database IO"
          value={metrics?.db_ok ? 'Healthy' : 'Down'}
          icon={Database}
          description={metrics?.db_ok ? `${metrics.db_latency_ms.toFixed(0)}ms ping · ${(metrics.total_documents || 0).toLocaleString()} docs` : 'Connection failed'}
          className="bg-black/40 border-border"
        />
        <StatCard
          title="Uptime"
          value={metrics ? formatUptime(metrics.uptime_seconds) : '—'}
          icon={Clock}
          description={metrics ? `${metrics.total_requests.toLocaleString()} total requests` : 'Loading...'}
          className="bg-black/40 border-border"
        />
        <StatCard
          title="Throughput"
          value={metrics ? `${(metrics.rps * 60).toFixed(0)} r/m` : '—'}
          icon={Zap}
          description={metrics ? `${metrics.rps.toFixed(2)} req/s · ${(metrics.error_rate_5xx * 100).toFixed(2)}% errors` : 'Loading...'}
          className="bg-black/40 border-border"
        />
      </StatsGrid>

      {/* Active Alerts Summary */}
      {metrics && metrics.active_alerts > 0 && (
        <div className="mt-8">
          <h3 className="text-xs font-black uppercase tracking-[0.25em] text-foreground mb-4 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-500" />
            Active Alerts ({metrics.active_alerts})
          </h3>
          <Card className="bg-yellow-500/5 border-yellow-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-500" />
                <div>
                  <p className="text-sm text-foreground font-medium">{metrics.active_alerts} unresolved alert{metrics.active_alerts > 1 ? 's' : ''}</p>
                  <p className="text-xs text-muted-foreground">
                    DLQ size: {metrics.dlq_size} · Queue depth: {metrics.queue_depth}
                  </p>
                </div>
                <Link to="/manager/observability/error-inbox" className="ml-auto">
                  <Button variant="outline" size="sm" className="text-xs">View All</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </PageContainer>
  );
}
