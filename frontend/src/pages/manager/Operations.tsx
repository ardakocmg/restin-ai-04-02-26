import { useState, useEffect } from 'react';
import { useVenue } from '../../context/VenueContext';
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/api';
import { toast } from 'sonner';
import PageContainer from '../../layouts/PageContainer';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Switch } from '../../components/ui/switch';
import { Badge } from '../../components/ui/badge';
import { Save, Plus, X } from 'lucide-react';
import { logger } from '@/lib/logger';

export default function Operations() {
  const { activeVenue } = useVenue();
  const { user } = useAuth();
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [complimentaryItems, setComplimentaryItems] = useState([]);
  const [newItem, setNewItem] = useState('');

  useEffect(() => {
    if (activeVenue?.id) {
      loadSettings();
    }
  }, [activeVenue?.id]);

  const loadSettings = async () => {
    try {
      const response = await api.get(`/venues/${activeVenue.id}/settings`);
      const ops = response.data.settings?.ops || {};
      setSettings(ops);
      setComplimentaryItems(ops.complimentary_items || []);
    } catch (error) {
      logger.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      await api.patch(`/venues/${activeVenue.id}/settings`, {
        ops: { ...settings, complimentary_items: complimentaryItems }
      });
      toast.success('Settings saved');
    } catch (error) {
      toast.error('Failed to save settings');
    }
  };

  const addComplimentaryItem = () => {
    if (newItem.trim()) {
      setComplimentaryItems([...complimentaryItems, newItem.trim()]);
      setNewItem('');
    }
  };

  const removeItem = (idx) => {
    setComplimentaryItems(complimentaryItems.filter((_, i) => i !== idx));
  };

  return (
    <PageContainer
      title="Operations Settings"
      description="Configure operational settings and complimentary items"
      actions={
        <Button onClick={saveSettings} size="sm">
          <Save className="w-4 h-4 mr-2" />
          Save Changes
        </Button>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="bg-background border-border shadow-2xl overflow-hidden">
          <CardHeader className="border-b border-border bg-card/50 p-6">
            <CardTitle className="text-sm font-black uppercase tracking-[0.2em] text-foreground flex items-center gap-2">
              <Plus className="w-4 h-4 text-red-500" />
              Complimentary Items
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="flex gap-3">
              <Input
                value={newItem}
                onChange={(e) => setNewItem(e.target.value)}
                placeholder="Item name (e.g., Bread Basket)..."
                onKeyPress={(e) => e.key === 'Enter' && addComplimentaryItem()}
                className="bg-card border-border text-foreground font-bold h-12 focus:ring-red-500/50"
              />
              <Button onClick={addComplimentaryItem} className="h-12 w-12 bg-red-600 hover:bg-red-500 text-foreground border-none shadow-lg shadow-red-900/20">
                <Plus className="w-5 h-5" />
              </Button>
            </div>
            <div className="space-y-3">
              {complimentaryItems.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 bg-card border border-border rounded-xl group hover:border-red-500/30 transition-all">
                  <span className="text-sm font-bold text-foreground uppercase tracking-tight">{item}</span>
                  <Button variant="ghost" size="sm" onClick={() => removeItem(idx)} className="text-muted-foreground hover:text-red-500 hover:bg-red-500/10">
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              {complimentaryItems.length === 0 && (
                <p className="text-center py-8 text-muted-foreground font-bold italic text-xs uppercase tracking-widest">No complimentary items configured</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-background border-border shadow-2xl overflow-hidden">
          <CardHeader className="border-b border-border bg-card/50 p-6">
            <CardTitle className="text-sm font-black uppercase tracking-[0.2em] text-foreground flex items-center gap-2">
              <Save className="w-4 h-4 text-red-500" />
              Auto Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-8">
            <div className="flex items-center justify-between p-4 rounded-xl bg-card/30 border border-border">
              <div>
                <p className="text-xs font-black text-foreground uppercase tracking-widest">Auto-add on open</p>
                <p className="text-[10px] font-medium text-muted-foreground mt-1">Automatically add complimentary items when opening a table</p>
              </div>
              <Switch
                checked={settings?.auto_complimentary_on_open || false}
                onCheckedChange={(checked) => setSettings({ ...settings, auto_complimentary_on_open: checked })}
              />
            </div>
            <div className="flex items-center justify-between p-4 rounded-xl bg-card/30 border border-border">
              <div>
                <p className="text-xs font-black text-foreground uppercase tracking-widest">Low stock alerts</p>
                <p className="text-[10px] font-medium text-muted-foreground mt-1">Push notifications when items fall below threshold</p>
              </div>
              <Switch
                checked={settings?.push_low_stock_enabled || false}
                onCheckedChange={(checked) => setSettings({ ...settings, push_low_stock_enabled: checked })}
              />
            </div>
            <div className="space-y-4 pt-4 border-t border-border">
              <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Low Stock Threshold</Label>
              <Input
                type="number"
                value={settings?.low_stock_threshold || 3}
                onChange={(e) => setSettings({ ...settings, low_stock_threshold: parseInt(e.target.value) })}
                className="bg-background border-border text-foreground font-bold h-12 focus:ring-red-500/50 w-32"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
