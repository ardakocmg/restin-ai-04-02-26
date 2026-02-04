/**
 * PHASE 1: People - Employee Directory (Indigo Parity Edition)
 */
import { useState, useEffect, useMemo } from "react";
import { useAuth } from "../../../context/AuthContext";
import api from "../../../lib/api";
import { useHRFeatureFlags } from "../../../hooks/useHRFeatureFlags";
import HRAccessPanel from "../../../components/hr/HRAccessPanel";
import { toast } from "sonner";
import { Button } from "../../../components/ui/button";
import { Badge } from "../../../components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "../../../components/ui/tabs";
import { UserPlus, Mail, Phone, Calendar } from "lucide-react";
import DataTable from "../../../components/shared/DataTable";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from "../../../components/ui/dialog";
import { Label } from "../../../components/ui/label";
import { Input } from "../../../components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "../../../components/ui/select";

const STATUS_MAP = {
  active: "success",
  on_leave: "warning",
  suspended: "destructive",
  terminated: "secondary"
};

export default function EmployeeDirectory() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { getAccess, loading: flagsLoading } = useHRFeatureFlags();
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [newEmployee, setNewEmployee] = useState({
    full_name: "",
    role: "staff",
    department: "",
    email: "",
    phone: "",
    start_date: new Date().toISOString().split("T")[0]
  });

  const venueId = user?.venueId || user?.venue_id;
  const access = getAccess('people');

  useEffect(() => {
    if (access.enabled && venueId) {
      loadEmployees();
    }
  }, [access.enabled, venueId]);

  const loadEmployees = async () => {
    setLoading(true);
    try {
      const response = await api.get(`hr/employees?venue_id=${venueId}`);
      setEmployees(response.data);
    } catch (error) {
      console.error("Failed to load employees:", error);
      if (error.response?.status !== 403) {
        toast.error("Failed to load employees");
      }
    } finally {
      setLoading(false);
    }
  };

  const createEmployee = async () => {
    try {
      await api.post("hr/employees", {
        ...newEmployee,
        venue_id: venueId
      });
      toast.success("Employee created");
      setShowCreateDialog(false);
      loadEmployees();
    } catch (error) {
      toast.error("Failed to create employee");
    }
  };

  const columns = useMemo(() => [
    {
      key: "display_id",
      label: "ID",
      render: (row) => <span className="font-mono text-zinc-500">{row.display_id}</span>
    },
    {
      key: "full_name",
      label: "Employee Name",
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-bold text-white">{row.full_name}</span>
          <span className="text-[10px] text-zinc-500 uppercase tracking-tighter italic">{row.role}</span>
        </div>
      )
    },
    {
      key: "department",
      label: "Department",
    },
    {
      key: "employment_status",
      label: "Status",
      render: (row) => (
        <Badge variant={STATUS_MAP[row.employment_status] || "outline"} className="capitalize">
          {row.employment_status.replace('_', ' ')}
        </Badge>
      )
    },
    {
      key: "email",
      label: "Contact",
      render: (row) => (
        <div className="flex flex-col gap-1">
          {row.email && <div className="flex items-center gap-1.5 text-zinc-400"><Mail className="w-3 h-3" /> {row.email}</div>}
          {row.phone && <div className="flex items-center gap-1.5 text-zinc-400"><Phone className="w-3 h-3" /> {row.phone}</div>}
        </div>
      )
    },
    {
      key: "start_date",
      label: "Joined",
      render: (row) => (
        <div className="flex items-center gap-2 text-zinc-400">
          <Calendar className="w-3 h-3" />
          {new Date(row.start_date).toLocaleDateString()}
        </div>
      )
    }
  ], []);

  const filteredEmployees = useMemo(() => {
    if (activeTab === "all") return employees;
    return employees.filter(emp => emp.employment_status === activeTab);
  }, [employees, activeTab]);

  if (!flagsLoading && !access.enabled) {
    return (
      <div className="min-h-screen bg-zinc-950 p-6">
        <div className="max-w-7xl mx-auto">
          <HRAccessPanel message="People module is disabled for your role." />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0B] p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-white uppercase tracking-tighter">People & Talent</h1>
            <p className="text-zinc-500 font-medium italic">Indigo-parity enterprise workforce management</p>
          </div>
          <Button
            onClick={() => setShowCreateDialog(true)}
            className="bg-blue-600 hover:bg-blue-500 text-white font-bold h-11 px-6 rounded-xl shadow-lg shadow-blue-500/20"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Empanel New
          </Button>
        </div>

        {/* Directory Filters */}
        <div className="flex items-center justify-between gap-4 bg-zinc-900/40 p-1.5 rounded-2xl border border-white/5 backdrop-blur-md">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="bg-transparent h-10 gap-1">
              <TabsTrigger value="all" className="rounded-lg data-[state=active]:bg-white/10 data-[state=active]:text-white">All Personnel</TabsTrigger>
              <TabsTrigger value="active" className="rounded-lg data-[state=active]:bg-green-500/10 data-[state=active]:text-green-400">Active</TabsTrigger>
              <TabsTrigger value="on_leave" className="rounded-lg data-[state=active]:bg-yellow-500/10 data-[state=active]:text-yellow-400">On Leave</TabsTrigger>
              <TabsTrigger value="terminated" className="rounded-lg data-[state=active]:bg-red-500/10 data-[state=active]:text-red-400">Terminated</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* The Grid */}
        <DataTable
          columns={columns}
          data={filteredEmployees}
          loading={loading}
          onRowClick={(row) => navigate(`/admin/hr/employees/${row.display_id || row.id}`)}
          emptyMessage="No personnel records found for this cohort"
          enableRowSelection={true}
          tableId="hr-employee-directory"
        />

        {/* Create Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="bg-zinc-900 border-white/10 max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-white">Empanel New Personnel</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Input
                    value={newEmployee.full_name}
                    onChange={e => setNewEmployee({ ...newEmployee, full_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Occupation Role</Label>
                  <Select value={newEmployee.role} onValueChange={val => setNewEmployee({ ...newEmployee, role: val })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="staff">General Staff</SelectItem>
                      <SelectItem value="manager">Management</SelectItem>
                      <SelectItem value="kitchen">Kitchen Operation</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button variant="ghost" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
                <Button onClick={createEmployee} className="bg-blue-600 hover:bg-blue-500">Add to Directory</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
