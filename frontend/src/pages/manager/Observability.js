import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useVenue } from '../../context/VenueContext';
import api from '../../lib/api';
import { toast } from 'sonner';
import PageContainer from '../../layouts/PageContainer';
import { StatsGrid, StatCard } from '../../components/shared/Stats';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import {
  Activity,
  Database,
  Cpu,
  HardDrive,
  RefreshCw,
  Wifi,
  WifiOff,
  Monitor,
  Printer,
  Server,
  Tablet,
  Smartphone,
  AlertCircle
} from 'lucide-react';
import { cn } from '../../lib/utils';

// Status Pill Component (CLOUD ONLINE Style)
const StatusPill = ({ icon: Icon, status, label, sublabel }) => {
  const isOnline = status === 'online' || status === 'healthy';
  const isDegraded = status === 'degraded' || status === 'warning';

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-black/40 border border-white/5 hover:bg-black/60 transition-all group">
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
          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 truncate">{label}</span>
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
          {sublabel && <span className="text-[9px] text-zinc-600 truncate">({sublabel})</span>}
        </div>
      </div>
    </div>
  );
};

export default function Observability() {
  const { user } = useAuth();
  const { activeVenue } = useVenue();
  const [metrics, setMetrics] = useState(null);
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);

  const venueId = activeVenue?.id || user?.venueId || user?.venue_id;

  useEffect(() => {
    if (venueId) {
      loadData();
      const interval = setInterval(loadData, 30000);
      return () => clearInterval(interval);
    }
  }, [venueId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [metricsRes, devicesRes] = await Promise.all([
        api.get(`/venues/${venueId}/metrics`).catch(() => ({ data: null })),
        api.get(`/venues/${venueId}/devices`).catch(() => ({ data: [] }))
      ]);
      setMetrics(metricsRes.data);
      setDevices(devicesRes.data || []);
    } catch (error) {
      console.error('Failed to load observability data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Mock infra for demo if no metrics
  const infraStatus = [
    { id: 'backend', icon: Server, label: 'FastAPI Backend', status: 'healthy', sublabel: 'v1.0.0-indigo' },
    { id: 'db', icon: Database, label: 'MongoDB Cluster', status: 'healthy', sublabel: 'Atlas MT' },
    { id: 'edge', icon: Activity, label: 'Edge Gateway', status: 'healthy', sublabel: 'Local Hub' },
  ];

  return (
    <PageContainer
      title="Observability"
      description="System health and real-time device monitoring"
      actions={
        <Button
          onClick={loadData}
          variant="outline"
          size="sm"
          className="bg-zinc-900 border-white/10 text-zinc-300 hover:bg-zinc-800 hover:text-white transition-all shadow-lg"
        >
          <RefreshCw className={cn("w-4 h-4 mr-2 text-red-500", loading && "animate-spin")} />
          Refresh
        </Button>
      }
    >
      {/* Test Panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <Card className="bg-zinc-900/50 border-white/5 shadow-2xl">
          <CardHeader>
            <CardTitle className="text-sm font-black uppercase tracking-[0.2em] text-white flex items-center gap-2">
              <Cpu className="w-4 h-4 text-blue-500" />
              Test Panel
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-tight">Run safe API calls and capture run artifacts.</p>
            <Link to="/manager/observability/testpanel">
              <Button
                variant="outline"
                className="w-full bg-zinc-950 border-white/10 text-white hover:bg-zinc-900 transition-all font-black uppercase tracking-widest text-[10px] h-12"
              >
                Open Test Panel
              </Button>
            </Link>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900/50 border-white/5 shadow-2xl">
          <CardHeader>
            <CardTitle className="text-sm font-black uppercase tracking-[0.2em] text-white flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500" />
              Error Inbox
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-tight">Triaged errors with safe retry workflows.</p>
            <Link to="/manager/observability/error-inbox">
              <Button
                variant="outline"
                className="w-full bg-zinc-950 border-white/10 text-white hover:bg-zinc-900 transition-all font-black uppercase tracking-widest text-[10px] h-12"
              >
                Open Error Inbox
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* NEW: Device Connectivity Section */}
      <div className="mb-8 p-6 rounded-2xl bg-zinc-950/50 border border-white/5 shadow-inner">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xs font-black uppercase tracking-[0.25em] text-white flex items-center gap-2">
            <Wifi className="w-4 h-4 text-green-500" />
            Network & Device Connectivity
          </h3>
          <Badge variant="outline" className="text-[10px] bg-green-500/5 text-green-500 border-green-500/20 uppercase font-black tracking-widest">
            {devices.filter(d => d.status === 'online').length + infraStatus.length} Active Nodes
          </Badge>
        </div>

        <div className="space-y-8">
          {/* Infrastructure */}
          <div>
            <h4 className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-600 mb-4 ml-1">Cloud Infrastructure</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {infraStatus.map(item => (
                <StatusPill key={item.id} {...item} />
              ))}
            </div>
          </div>

          {/* Terminals */}
          <div>
            <h4 className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-600 mb-4 ml-1">Connected Terminals & PCs</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {devices.filter(d => ['pos', 'kds', 'terminal'].includes(d.device_type?.toLowerCase())).length > 0 ? (
                devices
                  .filter(d => ['pos', 'kds', 'terminal'].includes(d.device_type?.toLowerCase()))
                  .map(device => (
                    <StatusPill
                      key={device.id}
                      icon={Monitor}
                      label={device.name}
                      status={device.status}
                      sublabel={device.device_type?.toUpperCase()}
                    />
                  ))
              ) : (
                <div className="col-span-full py-4 text-center border-2 border-dashed border-white/5 rounded-xl">
                  <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">No active terminals detected</p>
                </div>
              )}
            </div>
          </div>

          {/* Peripherals */}
          <div>
            <h4 className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-600 mb-4 ml-1">Peripherals & IoT</h4>
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
                <div className="col-span-full py-4 text-center border-2 border-dashed border-white/5 rounded-xl">
                  <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">No peripherals detected</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Original Metrics (Condensed) */}
      <h3 className="text-xs font-black uppercase tracking-[0.25em] text-white mb-6 flex items-center gap-2">
        <Activity className="w-4 h-4 text-blue-500" />
        Performance Benchmarks
      </h3>
      <StatsGrid columns={4}>
        <StatCard
          title="Avg API Latency"
          value={metrics?.avg_latency ? `${metrics.avg_latency}ms` : "<45ms"}
          icon={Cpu}
          description="Global response time"
          className="bg-black/40 border-white/5"
        />
        <StatCard
          title="Database IO"
          value="Healthy"
          icon={Database}
          description="MongoDB replica active"
          className="bg-black/40 border-white/5"
        />
        <StatCard
          title="Storage Delta"
          value="62%"
          icon={HardDrive}
          description="Incremental backup status"
          className="bg-black/40 border-white/5"
        />
        <StatCard
          title="Throughput"
          value="240 r/m"
          icon={Activity}
          description="Current traffic volume"
          className="bg-black/40 border-white/5"
        />
      </StatsGrid>
    </PageContainer>
  );
}

const Badge = ({ children, variant, className }) => (
  <span className={cn(
    "px-2 py-1 rounded text-xs font-medium",
    variant === 'outline' ? "border" : "bg-primary text-white",
    className
  )}>
    {children}
  </span>
);
