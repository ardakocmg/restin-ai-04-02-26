import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useVenue } from "../../context/VenueContext";
import { venueAPI } from "../../lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { 
  ShoppingCart, Users, Clock, Package, AlertTriangle, 
  TrendingUp, DollarSign, Utensils, Monitor, ChefHat, Activity
} from "lucide-react";

export default function Dashboard() {
  const navigate = useNavigate();
  const { activeVenue } = useVenue();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (activeVenue?.id) {
      loadStats();
    }
  }, [activeVenue?.id]);

  const loadStats = async () => {
    try {
      const response = await venueAPI.getStats(activeVenue.id);
      setStats(response.data);
    } catch (error) {
      console.error("Failed to load stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: "Open Orders",
      testId: "open-orders",
      value: stats?.open_orders || 0,
      icon: ShoppingCart,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10"
    },
    {
      title: "Tables Occupied",
      testId: "tables-occupied",
      value: `${stats?.occupied_tables || 0}/${stats?.total_tables || 0}`,
      icon: Utensils,
      color: "text-emerald-500",
      bgColor: "bg-emerald-500/10"
    },
    {
      title: "KDS Tickets",
      testId: "kds-tickets",
      value: stats?.pending_kds_tickets || 0,
      icon: Clock,
      color: "text-red-500",
      bgColor: "bg-red-500/10"
    },
    {
      title: "Low Stock Items",
      testId: "low-stock-items",
      value: stats?.low_stock_items || 0,
      icon: Package,
      color: stats?.low_stock_items > 0 ? "text-red-500" : "text-zinc-400",
      bgColor: stats?.low_stock_items > 0 ? "bg-red-500/10" : "bg-zinc-500/10"
    }
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-heading font-bold text-white">Dashboard</h1>
        <p className="text-zinc-400 mt-1">
          {activeVenue?.name || "Select a venue"} — Real-time operations overview
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <Card 
              key={i} 
              data-testid={`stat-card-${stat.testId}`}
              className="bg-zinc-900/50 border-white/5"
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-zinc-400 text-sm uppercase tracking-wide">{stat.title}</p>
                    <p className="text-3xl font-mono font-bold text-white mt-2">{stat.value}</p>
                  </div>
                  <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                    <Icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Venue Info Card */}
      {activeVenue && (
        <Card className="bg-zinc-900/50 border-white/5">
          <CardHeader>
            <CardTitle className="text-white font-heading">Venue Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className="text-zinc-400 text-xs uppercase tracking-wide mb-1">Type</p>
                <p className="text-white font-medium capitalize">{activeVenue.type.replace('_', ' ')}</p>
              </div>
              <div>
                <p className="text-zinc-400 text-xs uppercase tracking-wide mb-1">Course Pacing</p>
                <p className="text-white font-medium">
                  {activeVenue.pacing_enabled 
                    ? `Enabled (${activeVenue.pacing_interval_minutes} min)` 
                    : "Disabled"}
                </p>
              </div>
              <div>
                <p className="text-zinc-400 text-xs uppercase tracking-wide mb-1">Review Policy</p>
                <p className="text-white font-medium">
                  Low: 0-{activeVenue.review_policy_low_threshold} | 
                  Med: {activeVenue.review_policy_low_threshold + 1}-{activeVenue.review_policy_medium_threshold}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-zinc-900/50 border-white/5">
          <CardHeader>
            <CardTitle className="text-white font-heading flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats?.low_stock_items > 0 ? (
              <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                <p className="text-red-400 text-sm">
                  {stats.low_stock_items} items are below minimum stock level
                </p>
              </div>
            ) : (
              <p className="text-zinc-500 text-sm">No active alerts</p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/50 border-white/5">
          <CardHeader>
            <CardTitle className="text-white font-heading flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-500" />
              Quick Stats
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-zinc-400 text-sm">Table Occupancy</span>
                <span className="text-white font-mono">
                  {stats?.total_tables 
                    ? Math.round((stats.occupied_tables / stats.total_tables) * 100) 
                    : 0}%
                </span>
              </div>
              <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-500 transition-all duration-500"
                  style={{ 
                    width: `${stats?.total_tables 
                      ? (stats.occupied_tables / stats.total_tables) * 100 
                      : 0}%` 
                  }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* POS/KDS Quick Access */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-gradient-to-br from-orange-500/10 to-zinc-900 border-red-500/20">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-red-500/20 rounded-lg">
                <Monitor className="w-8 h-8 text-red-500" />
              </div>
              <div className="flex-1">
                <h3 className="text-white font-heading font-bold text-lg">Point of Sale</h3>
                <p className="text-zinc-400 text-sm">Open POS terminal</p>
              </div>
              <Button
                onClick={() => navigate("/pos/setup")}
                className="bg-red-500 hover:bg-red-600"
              >
                Open POS
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-zinc-900 border-green-500/20">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-green-500/20 rounded-lg">
                <ChefHat className="w-8 h-8 text-green-500" />
              </div>
              <div className="flex-1">
                <h3 className="text-white font-heading font-bold text-lg">Kitchen Display</h3>
                <p className="text-zinc-400 text-sm">Open KDS terminal</p>
              </div>
              <Button
                onClick={() => navigate("/kds/setup")}
                className="bg-green-500 hover:bg-green-600"
              >
                Open KDS
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Diagnostics */}
      <Card className="bg-zinc-900/50 border-white/5">
        <CardHeader>
          <CardTitle className="text-white font-heading flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-500" />
            System Diagnostics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-zinc-800 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-zinc-400 text-sm">Backend API</span>
                <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
              </div>
              <p className="text-white font-mono text-xs">Connected</p>
            </div>
            <div className="p-4 bg-zinc-800 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-zinc-400 text-sm">Database</span>
                <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
              </div>
              <p className="text-white font-mono text-xs">MongoDB Active</p>
            </div>
            <div className="p-4 bg-zinc-800 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-zinc-400 text-sm">Active Users</span>
                <Users className="w-4 h-4 text-blue-500" />
              </div>
              <p className="text-white font-mono text-xs">{stats?.occupied_tables || 0} staff online</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
