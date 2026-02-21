/**
 * MEGA PATCH: KDS Main - Item-Based Workflow
 * Complete rewrite for item-level status tracking with timers, badges, and dynamic colors
 */
import { logger } from '@/lib/logger';
import {
Award,
CheckCircle,
Loader2,
LogOut,
PauseCircle,
PlayCircle,RefreshCw,
Truck
} from "lucide-react";
import { useEffect,useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import BottomNav from "../../components/BottomNav";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { useAuth } from "../../context/AuthContext";
import { useVenueSettings } from "../../hooks/useVenueSettings";
import api from "../../lib/api";
import { getStatusColor } from "../../lib/palette";

export default function KDSMain() {
  const navigate = useNavigate();
  const { user: _user, isAuthenticated, loading: authLoading } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stationFilter, setStationFilter] = useState("all");
  const [lastUpdate, setLastUpdate] = useState(new Date());

  const venueId = localStorage.getItem("restin_kds_venue");
  const { settings } = useVenueSettings(venueId);

  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated) return;
    if (!venueId) {
      navigate("/kds/setup");
      return;
    }
    loadData();

    // PERF: Visibility-aware polling
    let interval = setInterval(loadData, 5000);
    const handleVisibility = () => {
      clearInterval(interval);
      if (document.visibilityState === 'visible') {
        loadData();
        interval = setInterval(loadData, 5000);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [isAuthenticated, venueId, authLoading]);

  const loadData = async () => {
    try {
      const response = await api.get(`/venues/${venueId}/kds/tickets`);
      setTickets(response.data);
      setLastUpdate(new Date());
    } catch (error) {
      logger.error("Failed to load tickets:", error);
    } finally {
      setLoading(false);
    }
  };

  // Item-level actions
  const startItem = async (ticketId, itemId) => {
    try {
      await api.post(`/kds/tickets/${ticketId}/items/${itemId}/start`);
      toast.success("Item started");
      await loadData();
    } catch (error) {
      logger.error("Failed to start item:", error);
      toast.error("Failed to start item");
    }
  };

  const readyItem = async (ticketId, itemId) => {
    try {
      await api.post(`/kds/tickets/${ticketId}/items/${itemId}/ready`);
      toast.success("Item ready");
      await loadData();
    } catch (error) {
      logger.error("Failed to mark ready:", error);
      toast.error("Failed to mark ready");
    }
  };

  const holdItem = async (ticketId, itemId) => {
    const reason = prompt("Hold reason:");
    if (!reason) return;

    try {
      await api.post(`/kds/tickets/${ticketId}/items/${itemId}/hold?reason=${encodeURIComponent(reason)}`);
      toast.success("Item held");
      await loadData();
    } catch (error) {
      logger.error("Failed to hold item:", error);
      toast.error("Failed to hold item");
    }
  };

  const passApprove = async (ticketId) => {
    try {
      await api.post(`/kds/tickets/${ticketId}/pass-approve`);
      toast.success("PASS approved");
      await loadData();
    } catch (error) {
      logger.error("Failed to approve:", error);
      toast.error("Failed to approve");
    }
  };

  const deliverTicket = async (ticketId) => {
    try {
      await api.post(`/kds/tickets/${ticketId}/deliver`);
      toast.success("Delivered to table");
      await loadData();
    } catch (error) {
      logger.error("Failed to deliver:", error);
      toast.error(error.response?.data?.message || "Failed to deliver");
    }
  };

  // Filter tickets by station
  const filteredTickets = tickets.filter(ticket => {
    if (stationFilter === "all") return ticket.status !== "DONE";
    if (stationFilter === "held") return ticket.status === "HELD";
    return ticket.station?.toLowerCase() === stationFilter && ticket.status !== "DONE";
  });

  // Flatten tickets to items for item-based display
  const flattenedItems = [];
  filteredTickets.forEach(ticket => {
    const items = ticket.items || [];
    items.forEach(item => {
      flattenedItems.push({
        ...item,
        ticket_id: ticket.id,
        ticket_display_id: ticket.display_id,
        table_name: ticket.table_name,
        order_type: ticket.order_type,
        station: ticket.station,
        ticket_status: ticket.status,
        pass_approved: ticket.pass_approved,
        pass_required: ticket.pass_required,
        delivered: ticket.delivered,
        round_label: ticket.round_label || `Round ${item.round_no || 1}`
      });
    });
  });

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-green-600 dark:text-green-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-card border-b border-border z-50 flex items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-foreground">
            KDS <span className="text-red-500">STATION</span>
          </h1>
        </div>

        {/* Station Filter Tabs */}
        <div className="hidden md:flex items-center gap-2">
          {["all", "kitchen", "bar", "pass", "held"].map(station => (
            <button
              key={station}
              onClick={() => setStationFilter(station)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${stationFilter === station
                  ? "bg-red-500 text-foreground"
                  : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                }`}
            >
              {station.toUpperCase()}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-4">
          <div className="text-xs text-muted-foreground">
            Last update: {lastUpdate.toLocaleTimeString()}
          </div>
          <Button aria-label="Action" onClick={loadData} variant="ghost" size="sm">
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button onClick={() => navigate("/kds/setup")} variant="ghost" size="sm">
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </header>

      {/* Main Content - Item Cards */}
      <div className="pt-20 pb-20 px-4">
        {flattenedItems.length === 0 ? (
          <div className="text-center py-20">
            <CheckCircle className="w-16 h-16 mx-auto text-green-600 dark:text-green-400 mb-4" />
            <p className="text-xl text-foreground mb-2">All Caught Up!</p>
            <p className="text-muted-foreground">{"No "}pending items</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {flattenedItems.map((item, idx) => (
              <ItemCard
                key={`${item.ticket_id}-${item.item_id || item.id || idx}`}
                item={item}
                settings={settings}
                onStart={() => startItem(item.ticket_id, item.item_id || item.id)}
                onReady={() => readyItem(item.ticket_id, item.item_id || item.id)}
                onHold={() => holdItem(item.ticket_id, item.item_id || item.id)}
                onPassApprove={() => passApprove(item.ticket_id)}
                onDeliver={() => deliverTicket(item.ticket_id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="md:hidden">
        <BottomNav mode="kds" onFilterChange={() => {}} />
      </div>
    </div>
  );
}

// Item Card Component with Timer
function ItemCard({ item, settings, onStart, onReady, onHold, onPassApprove, onDeliver }) {
  const [timeLeft, setTimeLeft] = useState(null);
  const [_elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (item.status === "PREPARING" && item.started_at) {
      const interval = setInterval(() => {
        const started = new Date(item.started_at);
        const now = new Date().getTime();
        const elapsedSeconds = Math.floor((now - started.getTime()) / 1000);
        setElapsed(elapsedSeconds);

        const target = item.target_prep_seconds || 900;
        const remaining = target - elapsedSeconds;
        setTimeLeft(remaining);
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [item.status, item.started_at, item.target_prep_seconds]);

  const statusColor = getStatusColor(settings, item.status) || "#2F80ED";

  const formatTime = (seconds) => {
    const mins = Math.floor(Math.abs(seconds) / 60);
    const secs = Math.abs(seconds) % 60;
    const sign = seconds < 0 ? "-" : "";
    return `${sign}${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const showPassApprove =
    item.status === "READY" &&
    item.pass_required &&
    !item.pass_approved;

  const showDeliver =
    item.status === "READY" &&
    item.pass_approved &&
    !item.delivered;

  return (
    <div
      className="bg-card rounded-lg overflow-hidden border-l-4 transition-all hover:shadow-lg"
      style={{ borderLeftColor: statusColor  /* keep-inline */ }} /* keep-inline */ /* keep-inline */
    >
      {/* Card Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-start justify-between mb-2">
          <div>
            <div className="text-sm text-muted-foreground">{item.table_name}</div>
            <div className="text-xs text-muted-foreground">{item.ticket_display_id}</div>
          </div>
          <div className="flex flex-wrap gap-1 justify-end">
            {settings?.kds?.show_seat && item.seat_no && (
              <Badge variant="outline" className="text-xs bg-secondary border-border">
                S{item.seat_no}
              </Badge>
            )}
            {settings?.kds?.show_course && item.course_no && (
              <Badge variant="outline" className="text-xs bg-secondary border-border">
                C{item.course_no}
              </Badge>
            )}
            {settings?.kds?.show_round_badge && (
              <Badge variant="outline" className="text-xs bg-secondary border-border">
                {item.round_label}
              </Badge>
            )}
          </div>
        </div>

        {/* Item Name */}
        <h3 className="text-lg font-bold text-foreground mb-1">
          {item.quantity || 1}x {item.menu_item_name}
        </h3>

        {/* Modifiers & Notes */}
        {item.modifiers && item.modifiers.length > 0 && (
          <div className="text-sm text-orange-400">
            {item.modifiers.map((mod, i) => (
              <div key={i}>• {typeof mod === 'object' ? (mod?.name || 'Unknown') : (mod || '')}</div>
            ))}
          </div>
        )}
        {item.notes && (
          <div className="text-sm text-yellow-400 mt-1">
            ⚠️ {item.notes}
          </div>
        )}
      </div>

      {/* Timer Section */}
      <div className="p-4 bg-secondary/50">
        {item.status === "PREPARING" && timeLeft !== null && (
          <div className="text-center">
            <div className={`text-3xl font-mono font-bold ${timeLeft < 0 ? 'text-red-500' : 'text-foreground'}`}>
              {formatTime(timeLeft)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {timeLeft < 0 ? "OVERTIME" : "remaining"}
            </div>
          </div>
        )}

        {item.status === "READY" && !item.pass_approved && (
          <div className="text-center text-purple-400 font-bold">
            <Award className="w-6 h-6 mx-auto mb-1" />
            WAITING PASS
          </div>
        )}

        {item.status === "READY" && item.pass_approved && !item.delivered && (
          <div className="text-center text-green-400 font-bold">
            <Truck className="w-6 h-6 mx-auto mb-1" />
            READY TO DELIVER
          </div>
        )}

        {item.status === "DONE" && item.actual_prep_seconds && (
          <div className="text-center">
            <div className="text-sm text-muted-foreground">Actual Time</div>
            <div className="text-xl font-mono font-bold text-green-400">
              {formatTime(item.actual_prep_seconds)}
            </div>
          </div>
        )}

        {item.status === "HELD" && (
          <div className="text-center text-red-400">
            <PauseCircle className="w-6 h-6 mx-auto mb-1" />
            HELD
            {item.hold_reason && (
              <div className="text-xs mt-1">{item.hold_reason}</div>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="p-3 border-t border-border space-y-2">
        {item.status === "NEW" && (
          <Button onClick={onStart} className="w-full bg-blue-600 hover:bg-blue-700">
            <PlayCircle className="w-4 h-4 mr-2" />
            Start Prep
          </Button>
        )}

        {item.status === "PREPARING" && (
          <>
            <Button onClick={onReady} className="w-full bg-green-600 hover:bg-green-700">
              <CheckCircle className="w-4 h-4 mr-2" />
              Mark Ready
            </Button>
            <Button onClick={onHold} variant="outline" className="w-full border-red-500 text-red-500">
              <PauseCircle className="w-4 h-4 mr-2" />
              Hold
            </Button>
          </>
        )}

        {showPassApprove && (
          <Button onClick={onPassApprove} className="w-full bg-purple-600 hover:bg-purple-700">
            <Award className="w-4 h-4 mr-2" />
            PASS Approve
          </Button>
        )}

        {showDeliver && (
          <Button onClick={onDeliver} className="w-full bg-green-600 hover:bg-green-700">
            <Truck className="w-4 h-4 mr-2" />
            Deliver to Table
          </Button>
        )}

        {item.status === "HELD" && (
          <Button onClick={onStart} className="w-full bg-blue-600 hover:bg-blue-700">
            <PlayCircle className="w-4 h-4 mr-2" />
            Resume
          </Button>
        )}
      </div>

      {/* Status Badge */}
      <div
        className="px-4 py-2 text-center text-foreground font-bold text-sm"
        style={{ backgroundColor: statusColor  /* keep-inline */ }} /* keep-inline */ /* keep-inline */
      >
        {item.status}
      </div>
    </div>
  );
}
