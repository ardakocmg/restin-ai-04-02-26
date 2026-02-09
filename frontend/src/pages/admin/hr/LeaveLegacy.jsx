/**
 * PHASE 1: Leave & Absence Management
 */
import { useState, useEffect } from "react";import { logger } from '@/lib/logger';

import { useAuth } from "../../../context/AuthContext";import { logger } from '@/lib/logger';

import api from "../../../lib/api";import { logger } from '@/lib/logger';

import { toast } from "sonner";import { logger } from '@/lib/logger';

import { Button } from "../../../components/ui/button";import { logger } from '@/lib/logger';

import { Badge } from "../../../components/ui/badge";import { logger } from '@/lib/logger';

import { Loader2, Umbrella, CheckCircle, XCircle } from "lucide-react";import { logger } from '@/lib/logger';

import { useHRFeatureFlags } from "../../../hooks/useHRFeatureFlags";import { logger } from '@/lib/logger';

import HRAccessPanel from "../../../components/hr/HRAccessPanel";

import { logger } from '@/lib/logger';
const STATUS_COLORS = {
  pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/50",
  approved: "bg-green-500/20 text-green-400 border-green-500/50",
  rejected: "bg-red-500/20 text-red-400 border-red-500/50"
};

export default function LeavePage() {
  const { user } = useAuth();
  const { getAccess, loading: flagsLoading } = useHRFeatureFlags();
  const [loading, setLoading] = useState(true);
  const [leaveRequests, setLeaveRequests] = useState([]);
  
  const venueId = user?.venueId || user?.venue_id;
  const access = getAccess('leave');

  const loadLeaveRequests = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/hr/leave?venue_id=${venueId}`);
      setLeaveRequests(response.data);
    } catch (error) {
      logger.error("Failed to load leave requests:", error);
      if (error.response?.status !== 403) {
        toast.error("Failed to load leave requests");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (access.enabled) {
      loadLeaveRequests();
    }
  }, [access.enabled]);

  if (!flagsLoading && !access.enabled) {
    return (
      <div className="min-h-screen bg-zinc-950 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-white">Leave & Absence</h1>
            <p className="text-zinc-400">Leave requests and approvals</p>
          </div>
          <HRAccessPanel message="Leave module is disabled for your role." />
        </div>
      </div>
    );
  }


  const approveLeave = async (leaveId) => {
    try {
      await api.post(`/hr/leave/${leaveId}/approve`);
      toast.success("Leave approved");
      await loadLeaveRequests();
    } catch (error) {
      toast.error(error.response?.data?.detail?.message || "Failed to approve");
    }
  };

  const rejectLeave = async (leaveId) => {
    const reason = prompt("Rejection reason:");
    if (!reason) return;
    
    try {
      await api.post(`/hr/leave/${leaveId}/reject?reason=${encodeURIComponent(reason)}`);
      toast.success("Leave rejected");
      await loadLeaveRequests();
    } catch (error) {
      toast.error("Failed to reject");
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Leave & Absence</h1>
          <p className="text-zinc-400">Manage leave requests and approvals</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-12 h-12 text-indigo-400 animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            {leaveRequests.map((leave) => (
              <div key={leave.id} className="bg-zinc-900 rounded-lg p-6 border border-indigo-500/20">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-sm text-zinc-500">{leave.display_id}</p>
                    <h3 className="text-lg font-bold text-white capitalize">{leave.type} Leave</h3>
                  </div>
                  <Badge className={`${STATUS_COLORS[leave.status]} border`}>
                    {leave.status}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                  <div>
                    <p className="text-zinc-500">From</p>
                    <p className="text-white">{new Date(leave.start_date).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-zinc-500">To</p>
                    <p className="text-white">{new Date(leave.end_date).toLocaleDateString()}</p>
                  </div>
                </div>

                {leave.notes && (
                  <p className="text-sm text-zinc-400 mb-4">{leave.notes}</p>
                )}

                {leave.status === "pending" && (
                  <div className="flex gap-2">
                    <Button onClick={() => approveLeave(leave.id)} size="sm" className="bg-green-600 hover:bg-green-700">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Approve
                    </Button>
                    <Button onClick={() => rejectLeave(leave.id)} size="sm" variant="outline" className="border-red-500 text-red-500">
                      <XCircle className="w-3 h-3 mr-1" />
                      Reject
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {leaveRequests.length === 0 && !loading && (
          <div className="text-center py-12 text-zinc-500">
            <Umbrella className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p>No leave requests</p>
          </div>
        )}
      </div>
    </div>
  );
}
