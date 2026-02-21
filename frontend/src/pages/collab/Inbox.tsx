
import { logger } from '@/lib/logger';
import { useEffect,useState } from 'react';

import { useAuth } from '../../context/AuthContext';
import { useVenue } from '../../context/VenueContext';

import api from '../../lib/api';

import PageContainer from '../../layouts/PageContainer';

import { Card,CardContent,CardHeader,CardTitle } from '../../components/ui/card';

import { Badge } from '../../components/ui/badge';

import { Bell,CheckCircle2,Inbox,User } from 'lucide-react';

export default function CollabInbox() {
  const { activeVenue } = useVenue();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (activeVenue?.id && user?.id) {
      loadInbox();
    }
  }, [activeVenue?.id, user?.id]);

  const loadInbox = async () => {
    try {
      const res = await api.get(`/collab/inbox?venue_id=${activeVenue.id}&user_id=${user.id}`);
      setNotifications(res.data?.data || []);
    } catch (error) {
      logger.error('Inbox error:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notifId) => {
    try {
      await api.patch(`/collab/inbox/${notifId}/read`);
      setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, status: 'READ' } : n));
    } catch (error) {
      logger.error('Mark read failed:', error);
    }
  };

  if (!user) {
    return (
      <PageContainer title="Inbox" description="Unified notifications">
        <div className="text-center py-16">
          <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold text-secondary-foreground">Not Authenticated</h2>
          <p className="text-muted-foreground mt-2">Please log in to access your inbox.</p>
        </div>
      </PageContainer>
    );
  }

  const unreadCount = notifications.filter(n => n.status === 'UNREAD').length;

  return (
    <PageContainer
      title="Inbox"
      description={`${user.name}'s notifications and updates`}
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Inbox className="h-6 w-6 text-blue-400" />
          <span className="text-2xl font-bold text-foreground">{unreadCount} Unread</span>
        </div>
        <Badge variant="outline" className="py-1.5 px-3 text-sm border-border text-secondary-foreground">
          <User className="w-3.5 h-3.5 mr-1.5" />
          {user.name}
        </Badge>
      </div>

      <Card className="bg-background border-border">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <Bell className="h-5 w-5 text-blue-400" />
            Notifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-3" />
              <p>{"Loading "}notifications...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-emerald-500" />
              <p className="text-secondary-foreground font-medium">All caught up!</p>
              <p className="text-muted-foreground text-sm mt-1">{"No "}notifications for {user.name}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => notif.status === 'UNREAD' && markAsRead(notif.id)}
                  className={`p-4 rounded-lg border cursor-pointer transition-all ${notif.status === 'UNREAD'
                      ? 'bg-blue-500/5 border-blue-500/20 hover:bg-blue-500/10'
                      : 'bg-card/50 border-border hover:bg-card'
                    }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      {notif.status === 'UNREAD' && (
                        <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                      )}
                      <Badge variant="outline" className="border-border text-muted-foreground">{notif.type}</Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(notif.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm text-secondary-foreground">
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