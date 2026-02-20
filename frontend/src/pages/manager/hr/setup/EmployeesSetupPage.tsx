import React, { useState, useEffect } from 'react';
import PageContainer from '../../../../layouts/PageContainer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../../components/ui/card';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { Label } from '../../../../components/ui/label';
import { Badge } from '../../../../components/ui/badge';
import { Users, Upload, UserPlus, Search, ArrowRight, CheckCircle2, AlertCircle, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';
import api from '../../../../lib/api';

export default function EmployeesSetupPage() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('directory');
  const [search, setSearch] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newEmployee, setNewEmployee] = useState({ full_name: '', email: '', role: 'staff', department: '' });

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    try {
      const venueId = localStorage.getItem('currentVenueId') || 'venue-caviar-bull';
      const res = await api.get(`/venues/${venueId}/hr/employees`);
      setEmployees(res.data || []);
    } catch {
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddEmployee = async () => {
    if (!newEmployee.full_name || !newEmployee.email) {
      return toast.error('Name and email are required');
    }
    try {
      const venueId = localStorage.getItem('currentVenueId') || 'venue-caviar-bull';
      await api.post(`/venues/${venueId}/hr/employees`, {
        ...newEmployee,
        venue_id: venueId,
        status: 'active',
      });
      toast.success(`Employee "${newEmployee.full_name}" added successfully`);
      setNewEmployee({ full_name: '', email: '', role: 'staff', department: '' });
      setShowAddForm(false);
      loadEmployees();
    } catch (error: any) {
      toast.error('Failed to add employee');
    }
  };

  const filteredEmployees = employees.filter(e =>
    e.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    e.email?.toLowerCase().includes(search.toLowerCase())
  );

  const tabs = [
    { id: 'directory', label: 'Employee Directory', icon: Users },
    { id: 'import', label: 'Bulk Import', icon: FileSpreadsheet },
    { id: 'onboarding', label: 'Onboarding Checklist', icon: CheckCircle2 },
  ];

  return (
    <PageContainer
      title="Employees Setup"
      description="Manage employee onboarding, import, and directory"
      actions={
        <Button onClick={() => setShowAddForm(true)} className="gap-2">
          <UserPlus className="h-4 w-4" /> Add Employee
        </Button>
      }
    >
      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-muted rounded-lg mb-6 w-fit">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition ${tab === t.id ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Add Employee Modal */}
      {showAddForm && (
        <Card className="mb-6 border-primary/20">
          <CardHeader>
            <CardTitle className="text-lg">New Employee</CardTitle>
            <CardDescription>Enter employee details to onboard them</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Full Name *</Label>
                <Input value={newEmployee.full_name} onChange={(e) => setNewEmployee({ ...newEmployee, full_name: e.target.value })} placeholder="John Doe" />
              </div>
              <div>
                <Label>Email *</Label>
                <Input type="email" value={newEmployee.email} onChange={(e) => setNewEmployee({ ...newEmployee, email: e.target.value })} placeholder="john@restaurant.com" />
              </div>
              <div>
                <Label>Role</Label>
                <select
                  value={newEmployee.role}
                  onChange={(e) => setNewEmployee({ ...newEmployee, role: e.target.value })}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="staff">Staff</option>
                  <option value="manager">Manager</option>
                  <option value="chef">Chef</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <Label>Department</Label>
                <Input value={newEmployee.department} onChange={(e) => setNewEmployee({ ...newEmployee, department: e.target.value })} placeholder="Kitchen / FOH / Bar" />
              </div>
            </div>
            <div className="flex gap-3 mt-4 justify-end">
              <Button variant="outline" onClick={() => setShowAddForm(false)}>Cancel</Button>
              <Button onClick={handleAddEmployee}>Create Employee</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Directory Tab */}
      {tab === 'directory' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Employee Directory ({filteredEmployees.length})</CardTitle>
              <div className="relative w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" placeholder="Search employees..." />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading employees...</div>
            ) : filteredEmployees.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No employees found</p>
              </div>
            ) : (
              <div className="divide-y">
                {filteredEmployees.map((emp) => (
                  <div key={emp.id} className="flex items-center gap-4 py-3 hover:bg-accent/50 rounded px-2 transition">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-bold text-primary">
                        {emp.full_name?.split(' ').map(n => n[0]).join('') || '?'}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{emp.full_name}</div>
                      <div className="text-sm text-muted-foreground">{emp.email}</div>
                    </div>
                    <Badge variant="outline" className="capitalize">{emp.role || 'staff'}</Badge>
                    <Badge variant={emp.status === 'active' ? 'default' : 'secondary'}>
                      {emp.status || 'active'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Import Tab */}
      {tab === 'import' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" /> Bulk Import
            </CardTitle>
            <CardDescription>Upload a CSV or Excel file to import employees</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-xl p-12 text-center">
              <FileSpreadsheet className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="font-medium mb-2">Drag & drop your file here</p>
              <p className="text-sm text-muted-foreground mb-4">Supports CSV, XLSX (max 500 rows)</p>
              <Button variant="outline">Browse Files</Button>
            </div>
            <div className="mt-4 p-4 bg-muted rounded-lg">
              <p className="text-sm font-medium mb-2">Required columns:</p>
              <code className="text-xs text-muted-foreground">full_name, email, role, department, phone, start_date</code>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Onboarding Tab */}
      {tab === 'onboarding' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" /> Onboarding Checklist Template
            </CardTitle>
            <CardDescription>Default tasks assigned to new employees</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { task: 'Complete personal information form', days: 1 },
                { task: 'Upload ID document copy', days: 2 },
                { task: 'Sign employment contract', days: 3 },
                { task: 'Complete food safety training', days: 7 },
                { task: 'Uniform fitting & collection', days: 5 },
                { task: 'POS system training session', days: 7 },
                { task: 'Read employee handbook', days: 14 },
                { task: 'Complete probation review', days: 90 },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg border">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                    {i + 1}
                  </div>
                  <div className="flex-1 font-medium">{item.task}</div>
                  <Badge variant="outline">Due in {item.days} days</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </PageContainer>
  );
}
