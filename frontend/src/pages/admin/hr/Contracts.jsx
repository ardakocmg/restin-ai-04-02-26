/**
 * MODULE 2: Contracts Management
 */
import { useState, useEffect } from "react";import { logger } from '@/lib/logger';

import { useAuth } from "@/context/AuthContext";import { logger } from '@/lib/logger';

import api from "@/lib/api";import { logger } from '@/lib/logger';

import { useHRFeatureFlags } from "@/hooks/useHRFeatureFlags";import { logger } from '@/lib/logger';

import HRAccessPanel from "@/components/hr/HRAccessPanel";import { logger } from '@/lib/logger';

import { toast } from "sonner";import { logger } from '@/lib/logger';

import { Button } from "@/components/ui/button";import { logger } from '@/lib/logger';

import { Badge } from "@/components/ui/badge";import { logger } from '@/lib/logger';

import { Loader2, FileText, Plus, CheckCircle } from "lucide-react";

import { logger } from '@/lib/logger';
const STATUS_COLORS = {
  draft: "bg-yellow-500/20 text-yellow-400 border-yellow-500/50",
  active: "bg-green-500/20 text-green-400 border-green-500/50",
  ended: "bg-zinc-500/20 text-zinc-400 border-zinc-500/50"
};

export default function Contracts() {
  const { user } = useAuth();
  const { getAccess, loading: flagsLoading } = useHRFeatureFlags();
  const [loading, setLoading] = useState(true);
  const [contracts, setContracts] = useState([]);

  const venueId = user?.venueId || user?.venue_id;
  const access = getAccess('contracts');

  useEffect(() => {
    loadContracts();
  }, []);

  const loadContracts = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/hr/contracts?venue_id=${venueId}`);
      setContracts(response.data);
    } catch (error) {
      logger.error("Failed to load contracts:", error);
      if (error.response?.status !== 403) {
        toast.error("Failed to load contracts");
      }
    } finally {
      setLoading(false);
    }
  };

  if (!flagsLoading && !access.enabled) {
    return (
      <div className="min-h-screen bg-zinc-950 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-white">Contracts</h1>
            <p className="text-zinc-400">Employment contracts and agreements</p>
          </div>
          <HRAccessPanel message="Contracts module is disabled for your role." />
        </div>
      </div>
    );
  }

  const activateContract = async (contractId) => {
    try {
      await api.post(`/hr/contracts/${contractId}/activate`);
      toast.success("Contract activated");
      await loadContracts();
    } catch (error) {
      toast.error("Failed to activate contract");
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground dark:text-slate-50 mb-2">Contracts</h1>
            <p className="text-slate-600 dark:text-slate-400">Employment contracts and agreements</p>
          </div>
          <Button className="bg-indigo-500 hover:bg-indigo-600">
            <Plus className="w-4 h-4 mr-2" />
            New Contract
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-12 h-12 text-indigo-400 animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            {contracts.map((contract) => (
              <div key={contract.id} className="bg-white dark:bg-slate-900 rounded-lg p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-sm text-zinc-500">{contract.display_id}</p>
                    <h3 className="text-lg font-bold text-white capitalize">{contract.contract_type.replace("_", " ")}</h3>
                  </div>
                  <Badge className={`${STATUS_COLORS[contract.status]} border`}>
                    {contract.status}
                  </Badge>
                </div>

                <div className="grid grid-cols-3 gap-4 text-sm mb-4">
                  <div>
                    <p className="text-zinc-500">Base Rate</p>
                    <p className="text-white">€{contract.base_rate}/month</p>
                  </div>
                  <div>
                    <p className="text-zinc-500">Start Date</p>
                    <p className="text-white">{new Date(contract.start_date).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-zinc-500">Hours/Week</p>
                    <p className="text-white">{contract.standard_hours_per_week}</p>
                  </div>
                </div>

                {contract.status === "draft" && (
                  <Button onClick={() => activateContract(contract.id)} size="sm" className="bg-green-600 hover:bg-green-700">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Activate Contract
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}

        {contracts.length === 0 && !loading && (
          <div className="text-center py-12 text-zinc-500">
            <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p>No contracts yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
