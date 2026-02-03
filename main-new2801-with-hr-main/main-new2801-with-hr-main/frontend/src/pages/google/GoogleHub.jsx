import React, { useState, useEffect } from 'react';
import { useVenue } from '../../context/VenueContext';
import api from '../../lib/api';
import PageContainer from '../../layouts/PageContainer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { 
  MapPin, Star, Calendar, FolderOpen, BarChart3, 
  Megaphone, FileText, Table, CheckCircle2, XCircle 
} from 'lucide-react';

export default function GoogleHub() {
  const { activeVenue } = useVenue();
  const [settings, setSettings] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [events, setEvents] = useState([]);
  const [analytics, setAnalytics] = useState([]);
  const [loading, setLoading] = useState(true);

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
      console.error('Connector data error:', error);
    } finally {
      setLoading(false);
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
              <Badge className="bg-green-100 text-green-700 text-lg px-4 py-2">
                <CheckCircle2 className="h-4 w-4 mr-2" />
                CONNECTED
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-lg px-4 py-2">
                <XCircle className="h-4 w-4 mr-2" />
                NOT CONNECTED
              </Badge>
            )}
            <Button>Configure OAuth</Button>
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
                      <ServiceIcon className="h-10 w-10 mx-auto mb-3 text-blue-600" />
                      <h3 className="font-bold text-slate-900 mb-1">{service.label}</h3>
                      <p className="text-xs text-slate-600 mb-3">{service.description}</p>
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
                <p className="text-center py-8 text-slate-500">No reviews synced yet</p>
              ) : (
                <div className="space-y-3">
                  {reviews.slice(0, 5).map((review) => (
                    <div key={review.id} className="p-4 bg-slate-50 rounded border">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {[...Array(review.rating)].map((_, i) => (
                            <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          ))}
                        </div>
                        <Badge variant="outline">{review.status}</Badge>
                      </div>
                      <p className="text-sm font-medium text-slate-900 mb-1">{review.author_name}</p>
                      <p className="text-sm text-slate-700">{review.text}</p>
                      <p className="text-xs text-slate-500 mt-2">
                        {new Date(review.published_at).toLocaleDateString()}
                      </p>
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
                <p className="text-center py-8 text-slate-500">No events synced</p>
              ) : (
                <div className="space-y-2">
                  {events.slice(0, 5).map((event) => (
                    <div key={event.id} className="p-3 bg-slate-50 rounded flex items-center justify-between">
                      <div>
                        <p className="font-medium text-slate-900">{event.title}</p>
                        <p className="text-sm text-slate-600">
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
                <p className="text-center py-8 text-slate-500">No analytics data</p>
              ) : (
                <div className="grid grid-cols-3 gap-4">
                  {analytics[0] && Object.entries(analytics[0].metrics || {}).map(([key, value]) => (
                    <div key={key} className="p-4 bg-blue-50 rounded-lg text-center">
                      <p className="text-sm text-slate-600 capitalize">{key.replace(/_/g, ' ')}</p>
                      <p className="text-2xl font-bold text-blue-600">{value}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}
