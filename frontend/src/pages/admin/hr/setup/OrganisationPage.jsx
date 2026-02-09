import React, { useState } from 'react';
import PageContainer from '../../../layouts/PageContainer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Badge } from '../../../components/ui/badge';
import { Building2, Plus, Users, MapPin, ChevronRight, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function OrganisationPage() {
  const [departments, setDepartments] = useState([
    { id: '1', name: 'Kitchen', head: 'Head Chef', headcount: 8, location: 'Main Kitchen' },
    { id: '2', name: 'Front of House', head: 'FOH Manager', headcount: 12, location: 'Dining Area' },
    { id: '3', name: 'Bar', head: 'Bar Manager', headcount: 4, location: 'Main Bar' },
    { id: '4', name: 'Management', head: 'General Manager', headcount: 3, location: 'Office' },
    { id: '5', name: 'Pastry', head: 'Pastry Chef', headcount: 3, location: 'Pastry Kitchen' },
  ]);

  const [locations, setLocations] = useState([
    { id: '1', name: 'Main Restaurant', address: 'Portomaso, St Julians', type: 'Venue' },
    { id: '2', name: 'Central Kitchen', address: 'Mriehel Industrial Estate', type: 'Production' },
  ]);

  const [showAddDept, setShowAddDept] = useState(false);
  const [newDept, setNewDept] = useState({ name: '', head: '', location: '' });
  const [activeTab, setActiveTab] = useState('departments');

  const handleAddDept = () => {
    if (!newDept.name) return toast.error('Department name is required');
    setDepartments([...departments, {
      id: Date.now().toString(),
      name: newDept.name,
      head: newDept.head,
      headcount: 0,
      location: newDept.location,
    }]);
    setNewDept({ name: '', head: '', location: '' });
    setShowAddDept(false);
    toast.success(`Department "${newDept.name}" created`);
  };

  const removeDept = (id) => {
    setDepartments(departments.filter(d => d.id !== id));
    toast.success('Department removed');
  };

  return (
    <PageContainer
      title="Organisation Structure"
      description="Manage departments, locations, and company hierarchy"
      actions={
        <Button onClick={() => setShowAddDept(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Add Department
        </Button>
      }
    >
      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-muted rounded-lg mb-6 w-fit">
        {[
          { id: 'departments', label: 'Departments', icon: Building2 },
          { id: 'locations', label: 'Locations', icon: MapPin },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition ${activeTab === t.id ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Add Department */}
      {showAddDept && (
        <Card className="mb-6 border-primary/20">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Department Name *</Label>
                <Input value={newDept.name} onChange={(e) => setNewDept({ ...newDept, name: e.target.value })} placeholder="e.g. Sommelier" />
              </div>
              <div>
                <Label>Department Head</Label>
                <Input value={newDept.head} onChange={(e) => setNewDept({ ...newDept, head: e.target.value })} placeholder="Head of Department" />
              </div>
              <div>
                <Label>Location</Label>
                <Input value={newDept.location} onChange={(e) => setNewDept({ ...newDept, location: e.target.value })} placeholder="Which venue/area" />
              </div>
            </div>
            <div className="flex gap-3 mt-4 justify-end">
              <Button variant="outline" onClick={() => setShowAddDept(false)}>Cancel</Button>
              <Button onClick={handleAddDept}>Create Department</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Departments */}
      {activeTab === 'departments' && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {departments.map((dept) => (
            <Card key={dept.id} className="hover:shadow-md transition group">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{dept.name}</CardTitle>
                    <CardDescription>{dept.head || 'No head assigned'}</CardDescription>
                  </div>
                  <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 text-destructive" onClick={() => removeDept(dept.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    {dept.headcount} members
                  </div>
                  {dept.location && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {dept.location}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Locations */}
      {activeTab === 'locations' && (
        <Card>
          <CardHeader>
            <CardTitle>Company Locations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {locations.map((loc) => (
                <div key={loc.id} className="flex items-center gap-4 p-4 rounded-lg border hover:bg-accent/50 transition">
                  <div className="p-2 rounded-md bg-primary/10">
                    <MapPin className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{loc.name}</div>
                    <div className="text-sm text-muted-foreground">{loc.address}</div>
                  </div>
                  <Badge variant="outline">{loc.type}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </PageContainer>
  );
}
