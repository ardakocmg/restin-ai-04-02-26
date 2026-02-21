/**
 * People & Talent — Employee Directory
 * Connected to live API: /venues/{venue_id}/hr/employees
 */
import DataTable from "@/components/shared/DataTable";
import PermissionGate from "@/components/shared/PermissionGate";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
Dialog,
DialogContent,
DialogDescription,
DialogHeader,
DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
Select,
SelectContent,
SelectItem,
SelectTrigger,
SelectValue
} from "@/components/ui/select";
import { Tabs,TabsList,TabsTrigger } from "@/components/ui/tabs";
import { useVenue } from "@/context/VenueContext";
import { useAuditLog } from "@/hooks/useAuditLog";
import { useHRFeatureFlags } from "@/hooks/useHRFeatureFlags";
import api from "@/lib/api";
import { logger } from '@/lib/logger';
import {
AlertCircle,
Calendar,
CheckCircle2,
Clock,
Loader2,
Mail,
Search,
UserPlus,
XCircle
} from "lucide-react";
import { useEffect,useMemo,useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const STATUS_MAP = {
  active: "success",
  on_leave: "warning",
  suspended: "destructive",
  terminated: "secondary"
};

const STATUS_ICONS = {
  active: CheckCircle2,
  on_leave: Clock,
  suspended: AlertCircle,
  terminated: XCircle,
};

export default function EmployeeDirectory() {
  const navigate = useNavigate();
  const { activeVenue } = useVenue();
  const { getAccess: _getAccess } = useHRFeatureFlags();
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [creating, setCreating] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [newEmployee, setNewEmployee] = useState({
    first_name: "",
    last_name: "",
    role: "staff",
    email: "",
    start_date: new Date().toISOString().split("T")[0]
  });

  const venueId = activeVenue?.id;
  const { logAction } = useAuditLog();

  useEffect(() => {
    logAction('EMPLOYEE_DIRECTORY_VIEWED', 'employee-directory');
  }, []);

  useEffect(() => {
    if (venueId) loadEmployees();
  }, [venueId]);

  const loadEmployees = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/venues/${venueId}/hr/employees`);
      setEmployees(response.data || []);
    } catch (error) {
      logger.error("Failed to load employees:", error);
      toast.error("Failed to load employee directory");
    } finally {
      setLoading(false);
    }
  };

  const createEmployee = async () => {
    if (!newEmployee.first_name || !newEmployee.last_name) {
      toast.error("First and last name are required");
      return;
    }
    setCreating(true);
    try {
      await api.post(`/venues/${venueId}/hr/employees`, {
        ...newEmployee,
        status: "active",
        employment_status: "active",
      });
      toast.success("Employee added to directory");
      setShowCreateDialog(false);
      setNewEmployee({
        first_name: "", last_name: "", role: "staff",
        email: "", start_date: new Date().toISOString().split("T")[0]
      });
      loadEmployees();
    } catch (error) {
      logger.error("Failed to create employee:", error);
      toast.error("Failed to create employee");
    } finally {
      setCreating(false);
    }
  };

  const columns = useMemo(() => [
    {
      key: "id_card_number",
      label: "Malta ID",
      render: (row) => (
        <span className="font-mono text-muted-foreground font-bold text-xs">
          {row.id_card_number || row.display_id || 'PENDING'}
        </span>
      )
    },
    {
      key: "name",
      label: "Employee Name",
      render: (row) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/manager/hr/people/${row.employee_code || row.id}`);
          }}
          className="group text-left"
        >
          <div className="flex flex-col">
            <span className="font-bold text-foreground group-hover:text-blue-400 transition-colors">
              {row.first_name && row.last_name ? `${row.first_name} ${row.last_name}` : row.full_name || row.name || 'Unknown'}
            </span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-tighter italic">
              {row.role || row.occupation}
            </span>
          </div>
        </button>
      )
    },
    {
      key: "fss_tax_status",
      label: "Tax Profile",
      render: (row) => (
        <Badge variant="outline" className="text-[10px] border-border text-muted-foreground">
          {row.fss_tax_status || 'N/A'}
        </Badge>
      )
    },
    {
      key: "status",
      label: "Status",
      render: (row) => {
        const status = row.status || row.employment_status || 'active';
        const StatusIcon = STATUS_ICONS[status] || CheckCircle2;
        return (
          <Badge variant={STATUS_MAP[status] || "outline"} className="capitalize flex items-center gap-1 w-fit">
            <StatusIcon className="h-3 w-3" />
            {status.replace('_', ' ')}
          </Badge>
        );
      }
    },
    {
      key: "contact",
      label: "Contact",
      render: (row) => (
        <div className="flex flex-col gap-1">
          {row.email && (
            <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
              <Mail className="w-3 h-3" /> {row.email}
            </div>
          )}
        </div>
      )
    },
    {
      key: "start_date",
      label: "Joined",
      render: (row) => (
        <div className="flex items-center gap-2 text-muted-foreground text-xs">
          <Calendar className="w-3 h-3" />
          {row.start_date ? new Date(row.start_date).toLocaleDateString() : 'N/A'}
        </div>
      )
    }
  ], []);

  const filteredEmployees = useMemo(() => {
    let list = employees;
    if (activeTab !== "all") {
      list = list.filter(emp => (emp.status || emp.employment_status) === activeTab);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(emp =>
        (emp.first_name && emp.last_name ? `${emp.first_name} ${emp.last_name}` : emp.full_name || emp.name || '').toLowerCase().includes(q) ||
        (emp.email || '').toLowerCase().includes(q) ||
        (emp.id_card_number || '').toLowerCase().includes(q) ||
        (emp.display_id || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [employees, activeTab, searchQuery]);

  const statusCounts = useMemo(() => ({
    all: employees.length,
    active: employees.filter(e => (e.status || e.employment_status) === 'active').length,
    on_leave: employees.filter(e => (e.status || e.employment_status) === 'on_leave').length,
    terminated: employees.filter(e => (e.status || e.employment_status) === 'terminated').length,
  }), [employees]);

  return (
    <PermissionGate requiredRole="MANAGER">
      <div className="min-h-screen bg-[#0A0A0B] p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-black text-foreground uppercase tracking-tighter">People & Talent</h1>
              <p className="text-muted-foreground font-medium">
                {loading ? 'Loading...' : `${employees.length} employees in directory`}
              </p>
            </div>
            <Button
              onClick={() => setShowCreateDialog(true)}
              className="bg-blue-600 hover:bg-blue-500 text-foreground font-bold h-11 px-6 rounded-xl shadow-lg shadow-blue-500/20"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Add Employee
            </Button>
          </div>

          {/* Search + Filters */}
          <div className="flex items-center gap-4 bg-card/40 p-2 rounded-2xl border border-border backdrop-blur-md">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input aria-label="Search by name, email, ID..."
                placeholder="Search by name, email, ID..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 bg-transparent border-border text-secondary-foreground placeholder:text-muted-foreground h-10"
              />
            </div>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
              <TabsList className="bg-transparent h-10 gap-1">
                <TabsTrigger value="all" className="rounded-lg data-[state=active]:bg-white/10 data-[state=active]:text-foreground">
                  All ({statusCounts.all})
                </TabsTrigger>
                <TabsTrigger value="active" className="rounded-lg data-[state=active]:bg-emerald-500/10 data-[state=active]:text-emerald-400">
                  Active ({statusCounts.active})
                </TabsTrigger>
                <TabsTrigger value="on_leave" className="rounded-lg data-[state=active]:bg-amber-500/10 data-[state=active]:text-amber-400">
                  On Leave ({statusCounts.on_leave})
                </TabsTrigger>
                <TabsTrigger value="terminated" className="rounded-lg data-[state=active]:bg-rose-500/10 data-[state=active]:text-rose-400">
                  Terminated ({statusCounts.terminated})
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Data Table */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={filteredEmployees}
              loading={false}
              onRowClick={(row) => navigate(`/manager/hr/people/${row.employee_code || row.id}`)}
              emptyMessage="No personnel records found for this filter"
              enableRowSelection={true}
              tableId="hr-employee-directory"
            />
          )}

          {/* Create Dialog */}
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogContent className="bg-card border-border max-w-lg">
              <DialogHeader>
                <DialogTitle className="text-foreground flex items-center gap-2">
                  <UserPlus className="h-5 w-5 text-blue-400" /> Add New Employee
                </DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  Add a new team member to the employee directory
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">First Name</Label>
                    <Input aria-label="Input field"
                      value={newEmployee.first_name}
                      onChange={e => setNewEmployee({ ...newEmployee, first_name: e.target.value })}
                      className="bg-background border-border text-secondary-foreground"
                      placeholder="John"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Last Name</Label>
                    <Input aria-label="Input field"
                      value={newEmployee.last_name}
                      onChange={e => setNewEmployee({ ...newEmployee, last_name: e.target.value })}
                      className="bg-background border-border text-secondary-foreground"
                      placeholder="Doe"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Email</Label>
                  <Input aria-label="Input field"
                    type="email"
                    value={newEmployee.email}
                    onChange={e => setNewEmployee({ ...newEmployee, email: e.target.value })}
                    className="bg-background border-border text-secondary-foreground"
                    placeholder="john@restaurant.com"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Role</Label>
                    <Select aria-label="Select option" value={newEmployee.role} onValueChange={val => setNewEmployee({ ...newEmployee, role: val })}>
                      <SelectTrigger aria-label="Select option" className="bg-background border-border text-secondary-foreground">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border">
                        <SelectItem value="staff">General Staff</SelectItem>
                        <SelectItem value="waiter">Waiter</SelectItem>
                        <SelectItem value="bartender">Bartender</SelectItem>
                        <SelectItem value="kitchen">Kitchen</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="host">Host</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Start Date</Label>
                    <Input aria-label="Input field"
                      type="date"
                      value={newEmployee.start_date}
                      onChange={e => setNewEmployee({ ...newEmployee, start_date: e.target.value })}
                      className="bg-background border-border text-secondary-foreground"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <Button variant="outline" className="border-border text-muted-foreground" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
                  <Button onClick={createEmployee} disabled={creating} className="bg-blue-600 hover:bg-blue-500 text-foreground font-bold">
                    {creating ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Adding...</> : 'Add to Directory'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </PermissionGate>
  );
}