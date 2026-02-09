import React, { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';

import { useVenue } from '../../context/VenueContext';

import api from '../../lib/api';

import PageContainer from '../../layouts/PageContainer';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';

import { Badge } from '../../components/ui/badge';

import { Button } from '../../components/ui/button';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';

import {
  MapPin, Star, Calendar, FolderOpen, BarChart3,
  Megaphone, FileText, Table, CheckCircle2, XCircle, RefreshCw, Send
} from 'lucide-react';

import { toast } from 'sonner';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';

import { Input } from '../../components/ui/input';

export default function GoogleHub() {
  const { activeVenue } = useVenue();
  const [settings, setSettings] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [events, setEvents] = useState([]);
  const [analytics, setAnalytics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [replyDialog, setReplyDialog] = useState({ open: false, review: null, text: '' });

  useEffect(() => {
    if (activeVenue?.id) {
      loadGoogleData();
    }
  }, [activeVenue?.id]);

  const loadGoogleData = async () => {
    try {
      const [settingsRes, reviewsRes, eventsRes, analyticsRes] = await Promise.all([
        api.get(`/google/settings?venue_id=${activeVenue.id}`).catch(() => ({ data: { data: null } })),
        api.get(`/google/reviews?venue_id=${activeVenue.id}`).catch(() => ({ data: { data: [] } })),
        api.get(`/google/calendar/events?venue_id=${activeVenue.id}`).catch(() => ({ data: { data: [] } })),
        api.get(`/google/analytics/snapshot?venue_id=${activeVenue.id}`).catch(() => ({ data: { data: [] } }))
      ]);

      setSettings(settingsRes.data?.data);
      setReviews(reviewsRes.data?.data || []);
      setEvents(eventsRes.data?.data || []);
      setAnalytics(analyticsRes.data?.data || []);
    } catch (error) {
      logger.error('Connector data error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    try {
      await api.post(`/google/connect?venue_id=${activeVenue.id}`);
      toast.success('Google connected successfully');
      loadGoogleData();
    } catch (error) {
      toast.error('Failed to connect Google');
    }
  };

  const handleDisconnect = async () => {
    try {
      await api.post(`/google/disconnect?venue_id=${activeVenue.id}`);
      toast.success('Google disconnected');
      loadGoogleData();
    } catch (error) {
      toast.error('Failed to disconnect');
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      await api.post(`/google/sync?venue_id=${activeVenue.id}`);
      toast.success('Sync completed');
      loadGoogleData();
    } catch (error) {
      toast.error('Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const handleReply = async () => {
    if (!replyDialog.text.trim()) return;
    try {
      await api.post(`/google/reviews/${replyDialog.review.id}/reply?venue_id=${activeVenue.id}&reply_text=${encodeURIComponent(replyDialog.text)}`);
      toast.success('Reply saved');
      setReplyDialog({ open: false, review: null, text: '' });
      loadGoogleData();
    } catch (error) {
      toast.error('Failed to save reply');
    }
  };

  const connectorServices = [
    { key: 'business_profile', icon: MapPin, label: 'Business Profile', description: 'Maps, hours, photos' },
    { key: 'reviews', icon: Star, label: 'Reviews', description: 'Ratings & text' },
    { key: 'calendar', icon: Calendar, label: 'Calendar', description: 'Events & closures' },
    { key: 'drive', icon: FolderOpen, label: 'Drive', description: 'Exports & documents' },
    { key: 'analytics', icon: BarChart3, label: 'Analytics', description: 'Traffic metrics' },
    { key: 'ads', icon: Megaphone, label: 'Ads', description: 'Performance insights' },
    { key: 'forms', icon: FileText, label: 'Forms', description: 'Intake → Tickets' },
    { key: 'sheets', icon: Table, label: 'Sheets', description: 'Reports staging' }
  ];

  return (
    <PageContainer
      title="External Connector"
      description="All-in-one services integration"
    >
      {settings && (
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            {settings.enabled ? (
              <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-lg px-4 py-2">
                <CheckCircle2 className="h-4 w-4 mr-2" />
                CONNECTED
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-lg px-4 py-2">
                <XCircle className="h-4 w-4 mr-2" />
                NOT CONNECTED
              </Badge>
            )}
            {settings.enabled ? (
              <>
                <Button variant="outline" onClick={handleSync} disabled={syncing}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                  {syncing ? 'Syncing...' : 'Sync Now'}
                </Button>
                <Button variant="destructive" onClick={handleDisconnect}>Disconnect</Button>
              </>
            ) : (
              <Button onClick={handleConnect}>Connect Google</Button>
            )}
          </div>
        </div>
      )}

      <Tabs defaultValue="services" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="reviews">Reviews ({reviews.length})</TabsTrigger>
          <TabsTrigger value="calendar">Calendar ({events.length})</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="services" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {connectorServices.map((service) => {
              const ServiceIcon = service.icon;
              const isEnabled = settings?.enabled_features?.[service.key];

              return (
                <Card key={service.key} className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <ServiceIcon className="h-10 w-10 mx-auto mb-3 text-primary" />
                      <h3 className="font-bold text-foreground mb-1">{service.label}</h3>
                      <p className="text-xs text-muted-foreground mb-3">{service.description}</p>
                      <Badge variant={isEnabled ? 'default' : 'secondary'} className="text-xs">
                        {isEnabled ? 'ENABLED' : 'DISABLED'}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="reviews" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5" />
                Reviews Inbox
              </CardTitle>
              <CardDescription>Customer feedback stream</CardDescription>
            </CardHeader>
            <CardContent>
              {reviews.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No reviews synced yet</p>
              ) : (
                <div className="space-y-3">
                  {reviews.slice(0, 5).map((review) => (
                    <div key={review.id} className="p-4 bg-muted/50 rounded border border-border">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {[...Array(review.rating)].map((_, i) => (
                            <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          ))}
                        </div>
                        <Badge variant="outline">{review.status}</Badge>
                      </div>
                      <p className="text-sm font-medium text-foreground mb-1">{review.author_name}</p>
                      <p className="text-sm text-foreground/80">{review.text}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {new Date(review.published_at).toLocaleDateString()}
                      </p>
                      {review.status !== 'REPLIED' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="mt-2"
                          onClick={() => setReplyDialog({ open: true, review, text: '' })}
                        >
                          <Send className="h-3 w-3 mr-1" /> Reply
                        </Button>
                      )}
                      {review.reply_text && (
                        <div className="mt-3 p-2 bg-primary/5 rounded border-l-2 border-primary">
                          <p className="text-xs text-muted-foreground">Your reply:</p>
                          <p className="text-sm text-foreground">{review.reply_text}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calendar" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Calendar Events
              </CardTitle>
            </CardHeader>
            <CardContent>
              {events.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No events synced</p>
              ) : (
                <div className="space-y-2">
                  {events.slice(0, 5).map((event) => (
                    <div key={event.id} className="p-3 bg-muted/50 rounded flex items-center justify-between border border-border">
                      <div>
                        <p className="font-medium text-foreground">{event.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(event.start_time).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge variant="outline">{event.event_type}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Analytics Snapshot
              </CardTitle>
              <CardDescription>Read-only traffic metrics</CardDescription>
            </CardHeader>
            <CardContent>
              {analytics.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No analytics data</p>
              ) : (
                <div className="grid grid-cols-3 gap-4">
                  {analytics[0] && Object.entries(analytics[0].metrics || {}).map(([key, value]) => (
                    <div key={key} className="p-4 bg-primary/10 rounded-lg text-center">
                      <p className="text-sm text-muted-foreground capitalize">{key.replace(/_/g, ' ')}</p>
                      <p className="text-2xl font-bold text-primary">{value}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Reply Dialog */}
      <Dialog open={replyDialog.open} onOpenChange={(open) => setReplyDialog({ ...replyDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reply to Review</DialogTitle>
          </DialogHeader>
          {replyDialog.review && (
            <div className="space-y-4">
              <div className="p-3 bg-muted/50 rounded">
                <div className="flex items-center gap-1 mb-1">
                  {[...Array(replyDialog.review.rating)].map((_, i) => (
                    <Star key={i} className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-sm font-medium">{replyDialog.review.author_name}</p>
                <p className="text-sm text-muted-foreground">{replyDialog.review.text}</p>
              </div>
              <Input
                placeholder="Write your reply..."
                value={replyDialog.text}
                onChange={(e) => setReplyDialog({ ...replyDialog, text: e.target.value })}
              />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setReplyDialog({ open: false, review: null, text: '' })}>
              Cancel
            </Button>
            <Button onClick={handleReply} disabled={!replyDialog.text.trim()}>
              <Send className="h-4 w-4 mr-2" /> Send Reply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}