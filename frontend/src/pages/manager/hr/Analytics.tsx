/**
 * PHASE 1: HR Analytics Dashboard
 */
import { useState, useEffect } from "react";
import { logger } from '@/lib/logger';

import { useAuth } from "../../../context/AuthContext";

import api from "../../../lib/api";

import { toast } from "sonner";

import { Loader2, Users, Calendar, Umbrella, FileText } from "lucide-react";

import { useHRFeatureFlags } from "../../../hooks/useHRFeatureFlags";

import HRAccessPanel from "../../../components/hr/HRAccessPanel";

export default function AnalyticsPage() {
  const { user } = useAuth();
  const { getAccess, loading: flagsLoading } = useHRFeatureFlags();
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);
  
  const venueId = user?.venueId ;
  const access = getAccess('analytics');

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/hr/analytics?venue_id=${venueId}`);
      setAnalytics(response.data);
    } catch (error) {
      logger.error("Failed to load analytics:", error);
      if (error.response?.status !== 403) {
        toast.error("Failed to load analytics");
      }
    } finally {
      setLoading(false);
    }
  };

  if (!flagsLoading && !access.enabled) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-foreground">Analytics</h1>
            <p className="text-muted-foreground">HR metrics and insights</p>
          </div>
          <HRAccessPanel message="Analytics module is disabled for your role." />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">HR Analytics</h1>
          <p className="text-muted-foreground">Key metrics and insights</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-12 h-12 text-indigo-400 animate-spin" />
          </div>
        ) : analytics ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-card rounded-lg p-6 border border-indigo-500/30">
              <Users className="w-8 h-8 text-indigo-400 mb-4" />
              <p className="text-sm text-muted-foreground mb-1">Total Employees</p>
              <p className="text-3xl font-bold text-foreground">{analytics.total_employees}</p>
            </div>

            <div className="bg-card rounded-lg p-6 border border-indigo-500/30">
              <Calendar className="w-8 h-8 text-indigo-400 mb-4" />
              <p className="text-sm text-muted-foreground mb-1">Shifts Today</p>
              <p className="text-3xl font-bold text-foreground">{analytics.shifts_today}</p>
            </div>

            <div className="bg-card rounded-lg p-6 border border-indigo-500/30">
              <Umbrella className="w-8 h-8 text-indigo-400 mb-4" />
              <p className="text-sm text-muted-foreground mb-1">Pending Leave</p>
              <p className="text-3xl font-bold text-foreground">{analytics.pending_leave}</p>
            </div>

            <div className="bg-card rounded-lg p-6 border border-indigo-500/30">
              <FileText className="w-8 h-8 text-indigo-400 mb-4" />
              <p className="text-sm text-muted-foreground mb-1">Expiring Docs</p>
              <p className="text-3xl font-bold text-foreground">{analytics.expiring_docs}</p>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <p>No analytics available</p>
          </div>
        )}
      </div>
    </div>
  );
}