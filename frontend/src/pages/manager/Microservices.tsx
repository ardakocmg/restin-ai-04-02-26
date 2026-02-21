import { logger } from '@/lib/logger';
import {
AlertCircle,CheckCircle2,
Clock,
Database,RefreshCw,
Server,
Zap
} from 'lucide-react';
import { useEffect,useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card,CardContent,CardDescription,CardHeader,CardTitle } from '../../components/ui/card';
import PageContainer from '../../layouts/PageContainer';
import api from '../../lib/api';

export default function MicroservicesPage() {
  const [services, setServices] = useState([]);
  const [eventBusRunning, setEventBusRunning] = useState(false);
  const [outboxEvents, setOutboxEvents] = useState([]);
  const [dlqEvents, setDlqEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadServiceData();
    // PERF: Visibility-aware polling
    let interval = setInterval(loadServiceData, 5000);
    const handleVisibility = () => {
      clearInterval(interval);
      if (document.visibilityState === 'visible') {
        loadServiceData();
        interval = setInterval(loadServiceData, 5000);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  const loadServiceData = async () => {
    try {
      const [statusRes, outboxRes, dlqRes] = await Promise.all([
        api.get('/services/status'),
        api.get('/events/outbox?limit=10'),
        api.get('/events/dlq?limit=10')
      ]);

      setServices(statusRes.data.services || []);
      setEventBusRunning(statusRes.data.event_bus_running || false);
      setOutboxEvents(outboxRes.data.events || []);
      setDlqEvents(dlqRes.data.events || []);
    } catch (error) {
      logger.error('Failed to load service data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getServiceStatusColor = (service) => {
    const now = new Date();
    const lastHeartbeat = new Date(service.last_heartbeat);
    const diff = (now.getTime() - lastHeartbeat.getTime()) / 1000; // seconds

    if (diff < 30) return 'text-green-600';
    if (diff < 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <PageContainer
      title="Microservices Dashboard"
      description="Monitor event-driven services and event processing"
      actions={
        <Button onClick={loadServiceData} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      }
    >
      {/* Event Bus Status */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`h-3 w-3 rounded-full ${eventBusRunning ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
              <CardTitle>Event Bus Status</CardTitle>
            </div>
            <Badge variant={eventBusRunning ? 'default' : 'destructive'}>
              {eventBusRunning ? 'RUNNING' : 'STOPPED'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Database className="h-5 w-5 text-blue-600" />
                <span className="text-sm font-medium text-slate-700">Outbox Events</span>
              </div>
              <p className="text-2xl font-bold text-slate-900">{outboxEvents.length}</p>
              <p className="text-xs text-muted-foreground mt-1">Pending processing</p>
            </div>
            <div className="bg-red-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <span className="text-sm font-medium text-slate-700">Failed Events</span>
              </div>
              <p className="text-2xl font-bold text-slate-900">{dlqEvents.length}</p>
              <p className="text-xs text-muted-foreground mt-1">Dead letter queue</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Server className="h-5 w-5 text-green-600" />
                <span className="text-sm font-medium text-slate-700">Active Services</span>
              </div>
              <p className="text-2xl font-bold text-slate-900">{services.length}</p>
              <p className="text-xs text-muted-foreground mt-1">Microservices running</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Services List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {services.map((service) => (
          <Card key={service.name}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Server className={`h-5 w-5 ${getServiceStatusColor(service)}`} />
                  <CardTitle className="text-lg">{service.name}</CardTitle>
                </div>
                <Badge variant="outline" className="text-xs">
                  {service.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {/* Capabilities */}
                <div>
                  <p className="text-sm font-medium text-foreground mb-2">Capabilities:</p>
                  <div className="flex flex-wrap gap-1">
                    {service.capabilities?.map((cap) => (
                      <Badge key={cap} variant="secondary" className="text-xs">
                        {cap}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Subscribed Events */}
                <div>
                  <p className="text-sm font-medium text-foreground mb-2">Subscribed Events:</p>
                  <div className="flex flex-wrap gap-1">
                    {service.subscribed_events?.map((event) => (
                      <Badge key={event} variant="outline" className="text-xs">
                        <Zap className="h-3 w-3 mr-1" />
                        {event}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Timestamps */}
                <div className="pt-3 border-t border-slate-200">
                  <div className="flex justify-between text-xs text-slate-600">
                    <span>Registered:</span>
                    <span>{new Date(service.registered_at).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>Last Heartbeat:</span>
                    <span>{new Date(service.last_heartbeat).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Events */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Outbox Events */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Event Outbox
            </CardTitle>
            <CardDescription>Pending events to be processed</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {outboxEvents.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500" />
                  <p className="text-sm">{"No "}pending events</p>
                </div>
              ) : (
                outboxEvents.map((event) => (
                  <div key={event.id} className="p-3 bg-background rounded-lg border border-slate-200">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-slate-900">{event.event_type}</span>
                      <Badge variant={event.status === 'PENDING' ? 'default' : 'secondary'} className="text-xs">
                        {event.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-600">Published: {new Date(event.published_at).toLocaleTimeString()}</p>
                    {event.retry_count > 0 && (
                      <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">Retries: {event.retry_count}</p>
                    )}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* DLQ Events */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              Dead Letter Queue
            </CardTitle>
            <CardDescription>Failed events requiring attention</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {dlqEvents.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500" />
                  <p className="text-sm">{"No "}failed events</p>
                </div>
              ) : (
                dlqEvents.map((event) => (
                  <div key={event.id} className="p-3 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-slate-900">{event.event_type}</span>
                      <Badge variant="destructive" className="text-xs">
                        FAILED
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-600">Moved to DLQ: {new Date(event.moved_to_dlq_at).toLocaleTimeString()}</p>
                    <p className="text-xs text-red-600 dark:text-red-400 mt-1">Error: {event.final_error?.substring(0, 100)}</p>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
