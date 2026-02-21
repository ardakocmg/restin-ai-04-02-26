import { useState, useEffect } from 'react';
import api from '../../lib/api';
import PageContainer from '../../layouts/PageContainer';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Zap, Clock, CheckCircle2, XCircle, Database } from 'lucide-react';
import { logger } from '@/lib/logger';

export default function EventMonitorPage() {
  const [outboxEvents, setOutboxEvents] = useState([]);
  const [dlqEvents, setDlqEvents] = useState([]);
  const [completedEvents, setCompletedEvents] = useState([]);
  const [filter] = useState('all');
  const [, setLoading] = useState(true);

  useEffect(() => {
    loadEvents();
    // PERF: Visibility-aware polling
    let interval = setInterval(loadEvents, 3000);
    const handleVisibility = () => {
      clearInterval(interval);
      if (document.visibilityState === 'visible') {
        loadEvents();
        interval = setInterval(loadEvents, 3000);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [filter]);

  const loadEvents = async () => {
    try {
      const [outboxRes, dlqRes, completedRes] = await Promise.all([
        api.get('/events/outbox?limit=50'),
        api.get('/events/dlq?limit=20'),
        api.get('/events/outbox?status=COMPLETED&limit=30').catch(() => ({ data: { events: [] } }))
      ]);

      setOutboxEvents(outboxRes.data.events || []);
      setDlqEvents(dlqRes.data.events || []);
      setCompletedEvents(completedRes.data.events || []);
    } catch (error) {
      logger.error('Failed to load events:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEventTypeColor = (eventType) => {
    const colors = {
      'order.closed': 'bg-blue-100 text-blue-700',
      'order.created': 'bg-green-100 text-green-700',
      'order.payment_received': 'bg-purple-100 text-purple-700',
      'reservation.created': 'bg-orange-100 text-orange-700',
    };
    return colors[eventType] || 'bg-slate-100 text-slate-700';
  };

  const EventCard = ({ event, type = 'pending' }) => (
    <div className={`p-4 rounded-lg border ${type === 'dlq' ? 'bg-red-50 border-red-200' :
      type === 'completed' ? 'bg-green-50 border-green-200' :
        'bg-white border-slate-200'
      }`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Badge className={getEventTypeColor(event.event_type)}>
              {event.event_type}
            </Badge>
            <span className="text-xs text-slate-500">ID: {event.id?.substring(0, 8)}</span>
          </div>
          <p className="text-sm text-slate-700">
            {JSON.stringify(event.data).substring(0, 100)}...
          </p>
        </div>
        <Badge variant={type === 'dlq' ? 'destructive' : type === 'completed' ? 'default' : 'outline'}>
          {event.status || type.toUpperCase()}
        </Badge>
      </div>

      <div className="flex items-center gap-4 mt-3 text-xs text-slate-600">
        <div className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {type === 'dlq' ? new Date(event.moved_to_dlq_at).toLocaleString() :
            type === 'completed' ? new Date(event.completed_at).toLocaleString() :
              new Date(event.published_at).toLocaleString()}
        </div>
        {event.retry_count > 0 && (
          <Badge variant="outline" className="text-xs">
            Retries: {event.retry_count}
          </Badge>
        )}
      </div>

      {type === 'dlq' && event.final_error && (
        <div className="mt-2 p-2 bg-red-100 dark:bg-red-950/20 rounded text-xs text-red-800">
          <strong>Error:</strong> {event.final_error.substring(0, 150)}
        </div>
      )}
    </div>
  );

  return (
    <PageContainer
      title="Event Monitor"
      description="Real-time event processing and queue management"
      actions={
        <Button onClick={loadEvents} variant="outline" size="sm">
          <Zap className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      }
    >
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Pending Events</p>
                <p className="text-3xl font-bold text-foreground mt-1">
                  {outboxEvents.filter(e => e.status === 'PENDING').length}
                </p>
              </div>
              <Database className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Completed Today</p>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-1">
                  {completedEvents.length}
                </p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Failed Events</p>
                <p className="text-3xl font-bold text-red-600 dark:text-red-400 mt-1">
                  {dlqEvents.length}
                </p>
              </div>
              <XCircle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Event Tabs */}
      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pending">
            Pending ({outboxEvents.filter(e => e.status === 'PENDING').length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed ({completedEvents.length})
          </TabsTrigger>
          <TabsTrigger value="failed">
            Failed ({dlqEvents.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4">
          <div className="space-y-3">
            {outboxEvents.filter(e => e.status === 'PENDING').length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-slate-500">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-green-500" />
                  <p>No pending events</p>
                </CardContent>
              </Card>
            ) : (
              outboxEvents.filter(e => e.status === 'PENDING').map(event => (
                <EventCard key={event.id} event={event} type="pending" />
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="completed" className="mt-4">
          <div className="space-y-3">
            {completedEvents.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-slate-500">
                  <p>No completed events yet</p>
                </CardContent>
              </Card>
            ) : (
              completedEvents.map(event => (
                <EventCard key={event.id} event={event} type="completed" />
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="failed" className="mt-4">
          <div className="space-y-3">
            {dlqEvents.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-slate-500">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-green-500" />
                  <p>No failed events</p>
                </CardContent>
              </Card>
            ) : (
              dlqEvents.map(event => (
                <EventCard key={event.id} event={event} type="dlq" />
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}
