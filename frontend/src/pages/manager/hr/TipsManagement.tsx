/**
 * MODULE 4: Tips Tracking & Allocation
 */
import { useState, useEffect } from "react";
import { logger } from '@/lib/logger';

import { useAuth } from "@/context/AuthContext";

import api from "@/lib/api";

import { toast } from "sonner";

import { Button } from "@/components/ui/button";

import { Badge } from "@/components/ui/badge";

import { Loader2, DollarSign, Plus, Lock } from "lucide-react";

import { useHRFeatureFlags } from "@/hooks/useHRFeatureFlags";

import HRAccessPanel from "@/components/hr/HRAccessPanel";

const STATUS_COLORS = {
  open: "bg-blue-500/20 text-blue-400 border-blue-500/50",
  allocated: "bg-yellow-500/20 text-yellow-400 border-yellow-500/50",
  locked: "bg-green-500/20 text-green-400 border-green-500/50"
};

export default function TipsManagement() {
  const { user } = useAuth();
  const { getAccess, loading: flagsLoading } = useHRFeatureFlags();
  const [loading, setLoading] = useState(true);
  const [tipsPools, setTipsPools] = useState([]);

  const venueId = user?.venueId ;
  const access = getAccess('tips');

  useEffect(() => {
    loadTipsPools();
  }, []);

  const loadTipsPools = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/hr/tips/pools?venue_id=${venueId}`);
      setTipsPools(response.data);
    } catch (error) {
      logger.error("Failed to load tips pools:", error);
      if (error.response?.status !== 403) {
        toast.error("Failed to load tips pools");
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
            <h1 className="text-3xl font-bold text-foreground">Tips Management</h1>
            <p className="text-muted-foreground">Tips pooling and distribution</p>
          </div>
          <HRAccessPanel message="Tips module is disabled for your role." />
        </div>
      </div>
    );
  }

  const lockPool = async (poolId) => {
    try {
      await api.post(`/hr/tips/pools/${poolId}/lock`);
      toast.success("Tips pool locked");
      await loadTipsPools();
    } catch (error) {
      toast.error("Failed to lock pool");
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground dark:text-slate-50 mb-2">Tips Management</h1>
            <p className="text-muted-foreground">Track and allocate tips to staff</p>
          </div>
          <Button className="bg-indigo-500 hover:bg-indigo-600">
            <Plus className="w-4 h-4 mr-2" />
            New Tips Pool
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-12 h-12 text-indigo-400 animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tipsPools.map((pool) => (
              <div key={pool.id} className="bg-background rounded-lg p-6 border border-border shadow-sm">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-sm text-muted-foreground">{pool.display_id}</p>
                    <h3 className="text-lg font-bold text-foreground">{new Date(pool.date).toLocaleDateString()}</h3>
                  </div>
                  <Badge className={`${STATUS_COLORS[pool.status]} border`}>
                    {pool.status}
                  </Badge>
                </div>

                <div className="mb-4">
                  <p className="text-sm text-muted-foreground">Total Amount</p>
                  <p className="text-3xl font-bold text-green-400">€{(pool.total_amount || 0).toFixed(2)}</p>
                </div>

                <div className="text-xs text-muted-foreground mb-4">
                  {pool.sources?.length || 0} sources
                </div>

                {pool.status === "allocated" && (
                  <Button onClick={() => lockPool(pool.id)} size="sm" className="w-full bg-green-600 hover:bg-green-700">
                    <Lock className="w-3 h-3 mr-1" />
                    Lock Pool
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}

        {tipsPools.length === 0 && !loading && (
          <div className="text-center py-12 text-muted-foreground">
            <DollarSign className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p>No tips pools yet</p>
          </div>
        )}
      </div>
    </div>
  );
}