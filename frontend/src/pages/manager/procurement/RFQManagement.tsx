import { useState, useEffect } from 'react';
import { logger } from '../../../lib/logger';
import PageContainer from '../../../layouts/PageContainer';
import { Card, CardContent } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Plus, Send, Award, X, Eye, Edit } from 'lucide-react';
import api from '../../../lib/api';
import { toast } from 'sonner';

interface RFQItem {
  item_id: string;
  item_name: string;
  quantity: number;
  unit: string;
  specifications: string;
  [key: string]: string | number;
}

interface RFQQuote {
  supplier_name: string;
  total_amount: number;
  valid_until: string;
}

interface RFQData {
  id: string;
  rfq_number: string;
  title: string;
  description: string;
  status: string;
  items?: RFQItem[];
  suppliers?: string[];
  quotes?: RFQQuote[];
  deadline?: string;
}

interface RFQFormData {
  title: string;
  description: string;
  items: RFQItem[];
  suppliers: string[];
  deadline: string;
}

export default function RFQManagement() {
  const [rfqs, setRfqs] = useState<RFQData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedRFQ, setSelectedRFQ] = useState<RFQData | null>(null);
  const [formData, setFormData] = useState<RFQFormData>({
    title: '',
    description: '',
    items: [{ item_id: '', item_name: '', quantity: 1, unit: 'kg', specifications: '' }],
    suppliers: [],
    deadline: ''
  });

  useEffect(() => {
    fetchRFQs();
  }, []);

  const fetchRFQs = async () => {
    try {
      const venueId = localStorage.getItem('currentVenueId');
      const response = await api.get(`/venues/${venueId}/rfq`);
      setRfqs(response.data || []);
    } catch (error: unknown) {
      logger.error('Failed to fetch RFQs:', { error: String(error) });
      setRfqs([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      const venueId = localStorage.getItem('currentVenueId');
      await api.post(`/venues/${venueId}/rfq`, formData);
      setShowModal(false);
      resetForm();
      fetchRFQs();
    } catch (error: unknown) {
      logger.error('Failed to create RFQ:', { error: String(error) });
      toast.error('Failed to create RFQ');
    }
  };

  const handleSend = async (rfqId: string) => {
    try {
      const venueId = localStorage.getItem('currentVenueId');
      await api.post(`/venues/${venueId}/rfq/${rfqId}/send`);
      fetchRFQs();
    } catch (error: unknown) {
      logger.error('Failed to send RFQ:', { error: String(error) });
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      items: [{ item_id: '', item_name: '', quantity: 1, unit: 'kg', specifications: '' }],
      suppliers: [],
      deadline: ''
    });
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { item_id: '', item_name: '', quantity: 1, unit: 'kg', specifications: '' }]
    });
  };

  const removeItem = (index: number) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index)
    });
  };

  const updateItem = (index: number, field: keyof RFQItem, value: string | number) => {
    const newItems = [...formData.items];
    (newItems[index] as Record<string, string | number>)[field] = value;
    setFormData({ ...formData, items: newItems as RFQItem[] });
  };

  const getStatusColor = (status: string): string => {
    const colors: Record<string, string> = {
      draft: 'bg-gray-600/20 text-gray-100',
      sent: 'bg-blue-600/20 text-blue-100',
      quoted: 'bg-yellow-600/20 text-yellow-100',
      awarded: 'bg-green-600/20 text-green-100',
      cancelled: 'bg-red-600/20 text-red-100'
    };
    return colors[status] || 'bg-gray-600/20 text-gray-100';
  };

  return (
    <PageContainer
      title="RFQ Management"
      description="Create and manage Request for Quotations"
      actions={
        <button
          onClick={() => { setShowModal(true); setSelectedRFQ(null); resetForm(); }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-foreground rounded-lg hover:bg-blue-700 transition"
        >
          <Plus className="h-4 w-4" />
          New RFQ
        </button>
      }
    >
      <div className="space-y-4">
        {loading ? (
          <Card><CardContent className="p-8 text-center text-slate-400">Loading...</CardContent></Card>
        ) : rfqs.length === 0 ? (
          <Card><CardContent className="p-8 text-center text-slate-400">No RFQs found. Create your first RFQ!</CardContent></Card>
        ) : (
          rfqs.map((rfq: RFQData) => (
            <Card key={rfq.id} className="border-slate-700 hover:border-slate-600 transition">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-slate-50">{rfq.title}</h3>
                      <Badge className={getStatusColor(rfq.status)}>
                        {rfq.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-400 mb-3">{rfq.description}</p>
                    <div className="flex items-center gap-4 text-sm text-slate-400">
                      <span>RFQ #{rfq.rfq_number}</span>
                      <span>•</span>
                      <span>{rfq.items?.length || 0} items</span>
                      <span>•</span>
                      <span>{rfq.suppliers?.length || 0} suppliers</span>
                      <span>•</span>
                      <span>{rfq.quotes?.length || 0} quotes</span>
                      {rfq.deadline && (
                        <>
                          <span>•</span>
                          <span>Due: {new Date(rfq.deadline).toLocaleDateString()}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { setSelectedRFQ(rfq); setShowModal(true); }}
                      className="p-2 hover:bg-slate-700 rounded transition"
                      title="View Details"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    {rfq.status === 'draft' && (
                      <button
                        onClick={() => handleSend(rfq.id)}
                        className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-foreground text-sm rounded hover:bg-blue-700 transition"
                      >
                        <Send className="h-3 w-3" />
                        Send
                      </button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold">{selectedRFQ ? 'RFQ Details' : 'Create New RFQ'}</h3>
                <button onClick={() => setShowModal(false)} className="hover:bg-slate-700 p-1 rounded">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {selectedRFQ ? (
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Items</h4>
                    <div className="space-y-2">
                      {selectedRFQ.items?.map((item: RFQItem, idx: number) => (
                        <div key={idx} className="p-3 bg-slate-800 rounded">
                          <p className="font-medium">{item.item_name}</p>
                          <p className="text-sm text-slate-400">Quantity: {item.quantity} {item.unit}</p>
                          {item.specifications && <p className="text-sm text-slate-400">Specs: {item.specifications}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Quotes Received ({selectedRFQ.quotes?.length || 0})</h4>
                    {(selectedRFQ.quotes?.length ?? 0) > 0 ? (
                      <div className="space-y-2">
                        {(selectedRFQ.quotes ?? []).map((quote: RFQQuote, idx: number) => (
                          <div key={idx} className="p-3 bg-slate-800 rounded">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-medium">{quote.supplier_name}</p>
                                <p className="text-sm text-slate-400">Valid until: {new Date(quote.valid_until).toLocaleDateString()}</p>
                              </div>
                              <p className="text-lg font-bold text-green-400">${quote.total_amount}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-slate-400 text-sm">No quotes received yet</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Title *</label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded focus:outline-none focus:border-blue-500"
                      placeholder="e.g., Q1 2026 Dairy Products"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Description</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded focus:outline-none focus:border-blue-500"
                      placeholder="Additional details..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Deadline</label>
                    <input
                      type="date"
                      value={formData.deadline}
                      onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium">Items *</label>
                      <button
                        onClick={addItem}
                        className="text-sm text-blue-400 hover:text-blue-300"
                      >
                        + Add Item
                      </button>
                    </div>
                    <div className="space-y-3">
                      {formData.items.map((item, idx) => (
                        <div key={idx} className="p-3 bg-slate-800 rounded space-y-2">
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={item.item_name}
                              onChange={(e) => updateItem(idx, 'item_name', e.target.value)}
                              placeholder="Item name"
                              className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded text-sm"
                            />
                            {formData.items.length > 1 && (
                              <button
                                onClick={() => removeItem(idx)}
                                className="px-3 py-2 bg-red-600/20 text-red-400 rounded hover:bg-red-600/30"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => updateItem(idx, 'quantity', parseFloat(e.target.value))}
                              placeholder="Qty"
                              className="w-24 px-3 py-2 bg-slate-900 border border-slate-700 rounded text-sm"
                            />
                            <select
                              value={item.unit}
                              onChange={(e) => updateItem(idx, 'unit', e.target.value)}
                              className="w-32 px-3 py-2 bg-slate-900 border border-slate-700 rounded text-sm"
                            >
                              <option value="kg">kg</option>
                              <option value="lbs">lbs</option>
                              <option value="pcs">pcs</option>
                              <option value="box">box</option>
                            </select>
                            <input
                              type="text"
                              value={item.specifications}
                              onChange={(e) => updateItem(idx, 'specifications', e.target.value)}
                              placeholder="Specifications (optional)"
                              className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded text-sm"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2 pt-4">
                    <button
                      onClick={handleCreate}
                      disabled={!formData.title || formData.items.length === 0}
                      className="flex-1 px-4 py-2 bg-blue-600 text-foreground rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                    >
                      Create RFQ
                    </button>
                    <button
                      onClick={() => setShowModal(false)}
                      className="px-4 py-2 bg-slate-700 rounded hover:bg-slate-600 transition"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </PageContainer>
  );
}
