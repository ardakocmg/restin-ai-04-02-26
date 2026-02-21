import { logger } from '@/lib/logger';
import { Plus,Shield,X } from 'lucide-react';
import { useEffect,useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '../../../components/ui/badge';
import { Card,CardContent } from '../../../components/ui/card';
import PageContainer from '../../../layouts/PageContainer';
import api from '../../../lib/api';

export default function ApprovalWorkflow() {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    rule_name: '',
    condition: 'amount_gt',
    threshold: 0,
    approvers: [],
    escalation_hours: 24
  });

  useEffect(() => {
    fetchRules();
  }, []);

  const fetchRules = async () => {
    try {
      const venueId = localStorage.getItem('currentVenueId');
      const response = await api.get(`/venues/${venueId}/procurement/approval-rules`);
      setRules(response.data || []);
    } catch (error) {
      logger.error('Failed to fetch rules:', error);
      setRules([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      const venueId = localStorage.getItem('currentVenueId');
      await api.post(`/venues/${venueId}/procurement/approval-rules`, formData);
      setShowModal(false);
      resetForm();
      fetchRules();
    } catch (error) {
      logger.error('Failed to create rule:', error);
      toast.error('Failed to create approval rule');
    }
  };

  const resetForm = () => {
    setFormData({
      rule_name: '',
      condition: 'amount_gt',
      threshold: 0,
      approvers: [],
      escalation_hours: 24
    });
  };

  return (
    <PageContainer
      title="Approval Workflow"
      description="Configure approval rules for procurement"
      actions={
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-foreground rounded-lg hover:bg-green-700"
        >
          <Plus className="h-4 w-4" />
          New Rule
        </button>
      }
    >
      <div className="space-y-4">
        {loading ? (
          <Card><CardContent className="p-8 text-center">Loading...</CardContent></Card>
        ) : rules.length === 0 ? (
          <Card><CardContent className="p-8 text-center text-slate-400">{"No "}approval rules configured</CardContent></Card>
        ) : (
          rules.map((rule) => (
            <Card key={rule.id} className="border-slate-700">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Shield className="h-5 w-5 text-green-400" />
                      <h3 className="text-lg font-semibold text-slate-50">{rule.rule_name}</h3>
                      <Badge className={rule.active ? 'bg-green-600/20 text-green-100' : 'bg-gray-600/20 text-gray-100'}>
                        {rule.active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <div className="space-y-1 text-sm text-slate-400">
                      <p>Condition: {rule.condition} {rule.threshold && `($${rule.threshold})`}</p>
                      <p>Approvers: {rule.approvers?.length || 0} users</p>
                      {rule.escalation_hours && <p>Escalation: {rule.escalation_hours} hours</p>}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold">Create Approval Rule</h3>
                <button onClick={() => setShowModal(false)}><X className="h-5 w-5" /></button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Rule Name</label>
                  <input aria-label="Input"
                    type="text"
                    value={formData.rule_name}
                    onChange={(e) => setFormData({ ...formData, rule_name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded"
                    placeholder="e.g., Manager Approval for Orders > $1000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Condition</label>
                  <select aria-label="Input"
                    value={formData.condition}
                    onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded"
                  >
                    <option value="amount_gt">Amount Greater Than</option>
                    <option value="supplier_new">New Supplier</option>
                    <option value="item_category">Item Category</option>
                  </select>
                </div>
                {formData.condition === 'amount_gt' && (
                  <div>
                    <label className="block text-sm font-medium mb-1">Threshold Amount ($)</label>
                    <input aria-label="Input"
                      type="number"
                      value={formData.threshold}
                      onChange={(e) => setFormData({ ...formData, threshold: parseFloat(e.target.value) })}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium mb-1">Escalation Hours</label>
                  <input aria-label="Input"
                    type="number"
                    value={formData.escalation_hours}
                    onChange={(e) => setFormData({ ...formData, escalation_hours: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded"
                  />
                </div>
                <div className="flex gap-2 pt-4">
                  <button
                    onClick={handleCreate}
                    className="flex-1 px-4 py-2 bg-green-600 text-foreground rounded hover:bg-green-700"
                  >
                    Create Rule
                  </button>
                  <button
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 bg-slate-700 rounded hover:bg-slate-600"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </PageContainer>
  );
}
