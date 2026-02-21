/**
 * MODULE 3: Timesheets Management
 */
import { useState, useEffect } from "react";
import { logger } from '@/lib/logger';

import { useAuth } from "../../../context/AuthContext";

import api from "../../../lib/api";

import { toast } from "sonner";

import { Button } from "../../../components/ui/button";

import { Badge } from "../../../components/ui/badge";

import { Loader2, Clock, Send, CheckCircle, XCircle } from "lucide-react";

import { useHRFeatureFlags } from "../../../hooks/useHRFeatureFlags";

import HRAccessPanel from "../../../components/hr/HRAccessPanel";

const STATUS_COLORS = {
  open: "bg-blue-500/20 text-blue-400 border-blue-500/50",
  submitted: "bg-yellow-500/20 text-yellow-400 border-yellow-500/50",
  approved: "bg-green-500/20 text-green-400 border-green-500/50",
  rejected: "bg-red-500/20 text-red-400 border-red-500/50",
  locked: "bg-zinc-500/20 text-muted-foreground border-zinc-500/50"
};

export default function TimesheetsPage() {
  const { user } = useAuth();
  const { getAccess, loading: flagsLoading } = useHRFeatureFlags();
  const [loading, setLoading] = useState(true);
  const [timesheets, setTimesheets] = useState([]);

  const venueId = user?.venueId ;
  const access = getAccess('timesheets');

  useEffect(() => {
    loadTimesheets();
  }, []);

  const loadTimesheets = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/hr/timesheets?venue_id=${venueId}`);
      setTimesheets(response.data);
    } catch (error) {
      logger.error("Failed to load timesheets:", error);
      if (error.response?.status !== 403) {
        toast.error("Failed to load timesheets");
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
            <h1 className="text-3xl font-bold text-foreground">Timesheets</h1>
            <p className="text-muted-foreground">Time entry and approvals</p>
          </div>
          <HRAccessPanel message="Timesheets module is disabled for your role." />
        </div>
      </div>
    );
  }

  const submitTimesheet = async (timesheetId) => {
    try {
      await api.post(`/hr/timesheets/${timesheetId}/submit`);
      toast.success("Timesheet submitted");
      await loadTimesheets();
    } catch (error) {
      toast.error("Failed to submit");
    }
  };

  const approveTimesheet = async (timesheetId) => {
    try {
      await api.post(`/hr/timesheets/${timesheetId}/approve`);
      toast.success("Timesheet approved");
      await loadTimesheets();
    } catch (error) {
      toast.error("Failed to approve");
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Timesheets</h1>
          <p className="text-muted-foreground">Time entry and approval</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-12 h-12 text-indigo-400 animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            {timesheets.map((ts) => (
              <div key={ts.id} className="bg-card rounded-lg p-6 border border-indigo-500/20">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-sm text-muted-foreground">{ts.display_id}</p>
                    <h3 className="text-lg font-bold text-foreground">Period: {new Date(ts.period_start).toLocaleDateString()} - {new Date(ts.period_end).toLocaleDateString()}</h3>
                  </div>
                  <Badge className={`${STATUS_COLORS[ts.status]} border`}>
                    {ts.status}
                  </Badge>
                </div>

                <div className="flex items-center gap-4 text-sm mb-4">
                  <div>
                    <p className="text-muted-foreground">Total Hours</p>
                    <p className="text-2xl font-bold text-foreground">{(ts.total_hours || 0).toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Entries</p>
                    <p className="text-xl text-foreground">{ts.entries?.length || 0}</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  {ts.status === "open" && (
                    <Button onClick={() => submitTimesheet(ts.id)} size="sm" className="bg-blue-600 hover:bg-blue-700">
                      <Send className="w-3 h-3 mr-1" />
                      Submit
                    </Button>
                  )}
                  {ts.status === "submitted" && (
                    <Button onClick={() => approveTimesheet(ts.id)} size="sm" className="bg-green-600 hover:bg-green-700">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Approve
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {timesheets.length === 0 && !loading && (
          <div className="text-center py-12 text-muted-foreground">
            <Clock className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p>{"No "}timesheets yet</p>
          </div>
        )}
      </div>
    </div>
  );
}