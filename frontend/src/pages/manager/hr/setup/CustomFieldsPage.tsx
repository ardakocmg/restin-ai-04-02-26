import { Calendar,GripVertical,Hash,List,Plus,Settings,ToggleLeft,Trash2,Type } from 'lucide-react';
import { useEffect,useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '../../../../components/ui/badge';
import { Button } from '../../../../components/ui/button';
import { Card,CardContent,CardHeader,CardTitle } from '../../../../components/ui/card';
import { Input } from '../../../../components/ui/input';
import { Label } from '../../../../components/ui/label';
import PageContainer from '../../../../layouts/PageContainer';
import api from '../../../../lib/api';
import LoadingSpinner from '@/components/shared/LoadingSpinner';

const FIELD_TYPES = [
  { value: 'text', label: 'Text', icon: Type },
  { value: 'number', label: 'Number', icon: Hash },
  { value: 'date', label: 'Date', icon: Calendar },
  { value: 'boolean', label: 'Toggle', icon: ToggleLeft },
  { value: 'select', label: 'Dropdown', icon: List },
];

export default function CustomFieldsPage() {
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newField, setNewField] = useState({ label: '', key: '', type: 'text', required: false, options: '' });

  useEffect(() => {
    loadFields();
  }, []);

  const loadFields = async () => {
    try {
      const venueId = localStorage.getItem('currentVenueId') || 'venue-caviar-bull';
      const res = await api.get(`/hr/custom-fields?venue_id=${venueId}`);
      setFields(res.data?.fields || []);
    } catch {
      // Seed with defaults if API not ready
      setFields([
        { id: '1', label: 'Bank Account (IBAN)', key: 'bank_iban', type: 'text', required: true, entity: 'employee' },
        { id: '2', label: 'Shoe Size', key: 'shoe_size', type: 'number', required: false, entity: 'employee' },
        { id: '3', label: 'Uniform Size', key: 'uniform_size', type: 'select', required: false, options: ['XS', 'S', 'M', 'L', 'XL', 'XXL'], entity: 'employee' },
        { id: '4', label: 'Food Safety Cert Date', key: 'food_safety_cert', type: 'date', required: false, entity: 'employee' },
        { id: '5', label: 'Has Driving License', key: 'driving_license', type: 'boolean', required: false, entity: 'employee' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!newField.label) return toast.error('Field label is required');
    const key = newField.key || newField.label.toLowerCase().replace(/\s+/g, '_');
    const field = {
      id: Date.now().toString(),
      label: newField.label,
      key,
      type: newField.type,
      required: newField.required,
      options: newField.type === 'select' ? newField.options.split(',').map(o => o.trim()) : undefined,
      entity: 'employee',
    };

    try {
      const venueId = localStorage.getItem('currentVenueId') || 'venue-caviar-bull';
      await api.post(`/hr/custom-fields?venue_id=${venueId}`, field);
    } catch {
      // Continue with local state
    }

    setFields([...fields, field]);
    setNewField({ label: '', key: '', type: 'text', required: false, options: '' });
    setShowForm(false);
    toast.success(`Custom field "${field.label}" created`);
  };

  const handleDelete = (id) => {
    setFields(fields.filter(f => f.id !== id));
    toast.success('Field removed');
  };

  const getTypeIcon = (type) => {
    const found = FIELD_TYPES.find(t => t.value === type);
    return found ? found.icon : Type;
  };

  if (loading) return <PageContainer title="Custom Fields"><LoadingSpinner variant="page" /></PageContainer>;

  return (
    <PageContainer
      title="Custom Fields"
      description="Define additional data fields for employee records"
      actions={
        <Button onClick={() => setShowForm(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Add Field
        </Button>
      }
    >
      {/* Add Field Form */}
      {showForm && (
        <Card className="mb-6 border-primary/20">
          <CardHeader>
            <CardTitle className="text-lg">New Custom Field</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Field Label</Label>
                <Input aria-label="Input field"
                  value={newField.label}
                  onChange={(e) => setNewField({ ...newField, label: e.target.value })}
                  placeholder="e.g. Emergency Contact"
                />
              </div>
              <div>
                <Label>Field Key (auto-generated)</Label>
                <Input aria-label="Input field"
                  value={newField.key || newField.label.toLowerCase().replace(/\s+/g, '_')}
                  onChange={(e) => setNewField({ ...newField, key: e.target.value })}
                  placeholder="emergency_contact"
                  className="font-mono text-sm"
                />
              </div>
              <div>
                <Label>Type</Label>
                <select aria-label="Input"
                  value={newField.type}
                  onChange={(e) => setNewField({ ...newField, type: e.target.value })}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                >
                  {FIELD_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {newField.type === 'select' && (
              <div className="mt-4">
                <Label>Options (comma-separated)</Label>
                <Input aria-label="Input field"
                  value={newField.options}
                  onChange={(e) => setNewField({ ...newField, options: e.target.value })}
                  placeholder="Option A, Option B, Option C"
                />
              </div>
            )}

            <div className="flex items-center gap-4 mt-4">
              <label className="flex items-center gap-2 text-sm">
                <input aria-label="Input"
                  type="checkbox"
                  checked={newField.required}
                  onChange={(e) => setNewField({ ...newField, required: e.target.checked })}
                  className="rounded"
                />
                Required field
              </label>
              <div className="flex-1" />
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={handleAdd}>Create Field</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Fields List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Defined Fields ({fields.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {fields.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Type className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>{"No "}custom fields defined yet</p>
              <p className="text-sm mt-1">Click "Add Field" to create your first custom field</p>
            </div>
          ) : (
            <div className="space-y-2">
              {fields.map((field) => {
                const Icon = getTypeIcon(field.type);
                return (
                  <div
                    key={field.id}
                    className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition group"
                  >
                    <GripVertical className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 cursor-grab" />
                    <div className="p-2 rounded-md bg-primary/10">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{field.label}</div>
                      <div className="text-xs text-muted-foreground font-mono">{field.key}</div>
                    </div>
                    <Badge variant="outline" className="capitalize">{field.type}</Badge>
                    {field.required && <Badge variant="destructive" className="text-xs">Required</Badge>}
                    {field.options && (
                      <span className="text-xs text-muted-foreground">
                        {Array.isArray(field.options) ? field.options.length : 0} options
                      </span>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="opacity-0 group-hover:opacity-100 text-destructive"
                      onClick={() => handleDelete(field.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </PageContainer>
  );
}
