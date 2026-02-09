/**
 * MODULE 5-7: Payroll Management
 */
import { useState, useEffect } from "react";import { logger } from '@/lib/logger';

import { useAuth } from "../../../context/AuthContext";import { logger } from '@/lib/logger';

import api from "../../../lib/api";import { logger } from '@/lib/logger';

import { toast } from "sonner";import { logger } from '@/lib/logger';

import { Button } from "../../../components/ui/button";import { logger } from '@/lib/logger';

import { Badge } from "../../../components/ui/badge";import { logger } from '@/lib/logger';

import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../components/ui/tabs";import { logger } from '@/lib/logger';

import { Loader2, Calculator, CheckCircle, Lock, Mail, Download, Plus } from "lucide-react";import { logger } from '@/lib/logger';

import { useHRFeatureFlags } from "../../../hooks/useHRFeatureFlags";import { logger } from '@/lib/logger';

import HRAccessPanel from "../../../components/hr/HRAccessPanel";

import { logger } from '@/lib/logger';
const STATUS_COLORS = {
  draft: "bg-blue-500/20 text-blue-400 border-blue-500/50",
  calculated: "bg-yellow-500/20 text-yellow-400 border-yellow-500/50",
  approved: "bg-purple-500/20 text-purple-400 border-purple-500/50",
  locked: "bg-green-500/20 text-green-400 border-green-500/50"
};

export default function PayrollPage() {
  const { user } = useAuth();
  const { getAccess, loading: flagsLoading } = useHRFeatureFlags();
  const [loading, setLoading] = useState(true);
  const [payruns, setPayruns] = useState([]);
  const [selectedPayrun, setSelectedPayrun] = useState(null);
  const [payslips, setPayslips] = useState([]);

  const venueId = user?.venueId || user?.venue_id;
  const access = getAccess('payroll');

  const loadPayruns = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/hr/payruns?venue_id=${venueId}`);
      setPayruns(response.data);
    } catch (error) {
      logger.error("Failed to load payruns:", error);
      if (error.response?.status !== 403) {
        toast.error("Failed to load payruns");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (access.enabled) {
      loadPayruns();
    }
  }, [access.enabled]);

  if (!flagsLoading && !access.enabled) {
    return (
      <div className="min-h-screen bg-zinc-950 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-white">Payroll</h1>
            <p className="text-zinc-400">Pay runs and payslips</p>
          </div>
          <HRAccessPanel message="Payroll module is disabled for your role." />
        </div>
      </div>
    );
  }


  const loadPayslips = async (payrunId) => {
    try {
      const response = await api.get(`/hr/payruns/${payrunId}/payslips`);
      setPayslips(response.data);
      setSelectedPayrun(payrunId);
    } catch (error) {
      logger.error("Failed to load payslips:", error);
      toast.error("Failed to load payslips");
    }
  };

  const calculatePayrun = async (payrunId) => {
    try {
      await api.post(`/hr/payruns/${payrunId}/calculate`);
      toast.success("Payroll calculated");
      await loadPayruns();
    } catch (error) {
      toast.error("Failed to calculate payroll");
    }
  };

  const approvePayrun = async (payrunId) => {
    try {
      await api.post(`/hr/payruns/${payrunId}/approve`);
      toast.success("Payrun approved");
      await loadPayruns();
    } catch (error) {
      toast.error("Failed to approve");
    }
  };

  const lockPayrun = async (payrunId) => {
    if (!confirm("Lock payrun? This will generate PDFs and send emails. This action is irreversible.")) return;

    try {
      await api.post(`/hr/payruns/${payrunId}/lock`);
      toast.success("Payrun locked - PDFs will be generated");
      await loadPayruns();
    } catch (error) {
      toast.error("Failed to lock payrun");
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Payroll</h1>
            <p className="text-zinc-400">Manage payroll runs and payslips</p>
          </div>
          <Button className="bg-indigo-500 hover:bg-indigo-600">
            <Plus className="w-4 h-4 mr-2" />
            Create Payrun
          </Button>
        </div>

        <Tabs defaultValue="payruns" className="w-full">
          <TabsList className="bg-zinc-900 mb-6">
            <TabsTrigger value="payruns">Pay Runs</TabsTrigger>
            <TabsTrigger value="payslips" disabled={!selectedPayrun}>Payslips</TabsTrigger>
          </TabsList>

          <TabsContent value="payruns">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-12 h-12 text-indigo-400 animate-spin" />
              </div>
            ) : (
              <div className="space-y-4">
                {payruns.map((payrun) => (
                  <div key={payrun.id} className="bg-zinc-900 rounded-lg p-6 border border-indigo-500/20">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <p className="text-sm text-zinc-500">{payrun.display_id}</p>
                        <h3 className="text-lg font-bold text-white">
                          {new Date(payrun.period_start).toLocaleDateString()} - {new Date(payrun.period_end).toLocaleDateString()}
                        </h3>
                      </div>
                      <Badge className={`${STATUS_COLORS[payrun.status]} border`}>
                        {payrun.status}
                      </Badge>
                    </div>

                    <div className="text-sm text-zinc-400 mb-4">
                      Pay Date: {new Date(payrun.pay_date).toLocaleDateString()}
                    </div>

                    <div className="flex gap-2">
                      {payrun.status === "draft" && (
                        <Button onClick={() => calculatePayrun(payrun.id)} size="sm" className="bg-blue-600 hover:bg-blue-700">
                          <Calculator className="w-3 h-3 mr-1" />
                          Calculate
                        </Button>
                      )}
                      {payrun.status === "calculated" && (
                        <>
                          <Button onClick={() => loadPayslips(payrun.id)} size="sm" variant="outline">
                            View Payslips
                          </Button>
                          <Button onClick={() => approvePayrun(payrun.id)} size="sm" className="bg-purple-600 hover:bg-purple-700">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Approve
                          </Button>
                        </>
                      )}
                      {payrun.status === "approved" && (
                        <Button onClick={() => lockPayrun(payrun.id)} size="sm" className="bg-green-600 hover:bg-green-700">
                          <Lock className="w-3 h-3 mr-1" />
                          Lock & Send
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {payruns.length === 0 && !loading && (
              <div className="text-center py-12 text-zinc-500">
                <Calculator className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>No payroll runs yet</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="payslips">
            <div className="space-y-4">
              {payslips.map((ps) => (
                <div key={ps.id} className="bg-zinc-900 rounded-lg p-6 border border-zinc-800">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="text-sm text-zinc-500">{ps.display_id}</p>
                      <h3 className="text-lg font-bold text-white">Employee ID: {ps.employee_id}</h3>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-zinc-500">Gross</p>
                      <p className="text-xl font-bold text-white">€{(ps.gross || 0).toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-zinc-500">Deductions</p>
                      <p className="text-xl text-red-400">-€{((ps.gross || 0) - (ps.net || 0)).toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-zinc-500">Net</p>
                      <p className="text-2xl font-bold text-green-400">€{(ps.net || 0).toFixed(2)}</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button size="sm" variant="outline">
                      <Download className="w-3 h-3 mr-1" />
                      PDF
                    </Button>
                    <Button size="sm" variant="outline">
                      <Mail className="w-3 h-3 mr-1" />
                      Email
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {payslips.length === 0 && (
              <div className="text-center py-12 text-zinc-500">
                <p>Select a payrun to view payslips</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
