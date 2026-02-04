import React, { useState, useEffect } from 'react';
import { useVenue } from '../../context/VenueContext';
import api from '../../lib/api';
import PageContainer from '../../layouts/PageContainer';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import DataTable from '../../components/shared/DataTable';
import { Inbox, CheckCircle2 } from 'lucide-react';

export default function CollabInbox() {
  const { activeVenue } = useVenue();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (activeVenue?.id) {
      loadInbox();
    }
  }, [activeVenue?.id]);

  const loadInbox = async () => {
    try {
      const res = await api.get(`/collab/inbox?venue_id=${activeVenue.id}`);
      setNotifications(res.data?.data || []);
    } catch (error) {
      console.error('Inbox error:', error);
    } finally {
      setLoading(false);
    }
  };

  const unreadCount = notifications.filter(n => n.status === 'UNREAD').length;

  return (
    <PageContainer
      title="Inbox"
      description="Unified notifications and updates"
    >
      <div className="mb-4 flex items-center gap-2">
        <Inbox className="h-6 w-6 text-blue-600 dark:text-blue-400" />
        <span className="text-2xl font-bold text-slate-900">{unreadCount} Unread</span>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
        </CardHeader>
        <CardContent>
          {notifications.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-green-500" />
              <p>All caught up!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`p-4 rounded border ${
                    notif.status === 'UNREAD' ? 'bg-blue-50 border-blue-200' : 'bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <Badge variant="outline">{notif.type}</Badge>
                    <span className="text-xs text-slate-600">
                      {new Date(notif.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm text-slate-700">
                    Ref: {notif.ref?.type} {notif.ref?.id?.substring(0, 8)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </PageContainer>
  );
}
