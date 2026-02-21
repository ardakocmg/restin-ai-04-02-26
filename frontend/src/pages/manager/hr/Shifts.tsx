/**
 * PHASE 1: Shifts & Attendance
 */
import { useState, useEffect } from "react";
import { logger } from '@/lib/logger';

import { useAuth } from "../../../context/AuthContext";

import api from "../../../lib/api";

import { toast } from "sonner";

import { Button } from "../../../components/ui/button";

import { Badge } from "../../../components/ui/badge";

import { Loader2, Clock, Calendar, Plus } from "lucide-react";

import { useHRFeatureFlags } from "../../../hooks/useHRFeatureFlags";

import HRAccessPanel from "../../../components/hr/HRAccessPanel";

const STATUS_COLORS = {
  scheduled: "bg-blue-500/20 text-blue-400",
  clocked_in: "bg-green-500/20 text-green-400",
  completed: "bg-zinc-500/20 text-muted-foreground",
  no_show: "bg-red-500/20 text-red-400"
};

const safeDate = (dateStr) => {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
};

const formatDateTime = (dateStr) => {
  const d = safeDate(dateStr);
  return d ? d.toLocaleString() : '—';
};

const formatTime = (dateStr) => {
  const d = safeDate(dateStr);
  return d ? d.toLocaleTimeString() : '—';
};

export default function ShiftsPage() {
  const { user } = useAuth();
  const { getAccess, loading: flagsLoading } = useHRFeatureFlags();
  const [loading, setLoading] = useState(true);
  const [shifts, setShifts] = useState([]);

  const venueId = user?.venueId ;
  const access = getAccess('shifts');

  useEffect(() => {
    loadShifts();
  }, []);

  const loadShifts = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/hr/shifts?venue_id=${venueId}`);
      const data = Array.isArray(response.data) ? response.data : (response.data?.shifts || []);
      setShifts(data);
    } catch (error) {
      logger.error("Failed to load shifts:", error);
      if (error.response?.status !== 403) {
        toast.error("Failed to load shifts");
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
            <h1 className="text-3xl font-bold text-foreground">Shifts & Attendance</h1>
            <p className="text-muted-foreground">Schedule and attendance management</p>
          </div>
          <HRAccessPanel message="Shifts module is disabled for your role." />
        </div>
      </div>
    );
  }

  const clockIn = async (shiftId) => {
    try {
      await api.post(`/hr/shifts/${shiftId}/clock-in`);
      toast.success("Clocked in");
      await loadShifts();
    } catch (error) {
      toast.error("Failed to clock in");
    }
  };

  const clockOut = async (shiftId) => {
    try {
      await api.post(`/hr/shifts/${shiftId}/clock-out`);
      toast.success("Clocked out");
      await loadShifts();
    } catch (error) {
      toast.error("Failed to clock out");
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Shifts & Attendance</h1>
            <p className="text-muted-foreground">Manage schedules and time tracking</p>
          </div>
          <Button className="bg-indigo-500 hover:bg-indigo-600">
            <Plus className="w-4 h-4 mr-2" />
            Create Shift
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-12 h-12 text-indigo-400 animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            {shifts.map((shift) => (
              <div key={shift.id} className="bg-card rounded-lg p-6 border border-indigo-500/20">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-sm text-muted-foreground">{shift.display_id}</p>
                    <h3 className="text-lg font-bold text-foreground">{shift.station}</h3>
                  </div>
                  <Badge className={`${STATUS_COLORS[shift.status]} border`}>
                    {shift.status}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Scheduled</p>
                    <p className="text-foreground">
                      {formatDateTime(shift.scheduled_start)} -<br />
                      {formatTime(shift.scheduled_end)}
                    </p>
                  </div>

                  {shift.actual_start && (
                    <div>
                      <p className="text-muted-foreground">Actual</p>
                      <p className="text-foreground">
                        {formatTime(shift.actual_start)}
                        {shift.actual_end && ` - ${formatTime(shift.actual_end)}`}
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 mt-4">
                  {shift.status === "scheduled" && (
                    <Button onClick={() => clockIn(shift.id)} size="sm" className="bg-green-600 hover:bg-green-700">
                      <Clock className="w-3 h-3 mr-1" />
                      Clock In
                    </Button>
                  )}
                  {shift.status === "clocked_in" && (
                    <Button onClick={() => clockOut(shift.id)} size="sm" className="bg-blue-600 hover:bg-blue-700">
                      <Clock className="w-3 h-3 mr-1" />
                      Clock Out
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {shifts.length === 0 && !loading && (
          <div className="text-center py-12 text-muted-foreground">
            <Calendar className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p>{"No "}shifts scheduled</p>
          </div>
        )}
      </div>
    </div>
  );
}