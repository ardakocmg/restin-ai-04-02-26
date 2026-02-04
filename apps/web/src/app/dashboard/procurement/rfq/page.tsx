'use client';

import React, { useState, useEffect } from 'react';
import PageContainer from '@/components/layout/PageContainer';
import { Card, CardContent } from '@antigravity/ui';
import { Badge } from '@antigravity/ui';
import { Button } from '@antigravity/ui';
import { Input } from '@antigravity/ui';
import { Plus, Send, Eye, X, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function RFQManagementPage() {
    const [rfqs, setRfqs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [selectedRFQ, setSelectedRFQ] = useState<any | null>(null);

    // Form State
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        items: [{ item_name: '', quantity: 1, unit: 'kg', specifications: '' }],
        deadline: ''
    });

    useEffect(() => {
        // Mock data
        setRfqs([
            { id: 1, title: 'Q1 Dairy Supply', status: 'draft', rfq_number: 'RFQ-2026-001', description: 'Milk, Cream, Butter bulk order', items: [{}, {}], suppliers: [], quotes: [] },
            { id: 2, title: 'Bar Consumables', status: 'sent', rfq_number: 'RFQ-2026-002', description: 'Napkins, Straws, Coasters', items: [{}, {}, {}], suppliers: [{}, {}], quotes: [] }
        ]);
        setLoading(false);
    }, []);

    const handleCreate = () => {
        const newRfq = {
            id: rfqs.length + 1,
            title: formData.title,
            status: 'draft',
            rfq_number: `RFQ-2026-00${rfqs.length + 1}`,
            description: formData.description,
            items: formData.items,
            suppliers: [],
            quotes: []
        };
        setRfqs([newRfq, ...rfqs]);
        setShowModal(false);
        toast.success("RFQ Created Successfully");
        resetForm();
    };

    const resetForm = () => {
        setFormData({
            title: '',
            description: '',
            items: [{ item_name: '', quantity: 1, unit: 'kg', specifications: '' }],
            deadline: ''
        });
    };

    const addItem = () => {
        setFormData({
            ...formData,
            items: [...formData.items, { item_name: '', quantity: 1, unit: 'kg', specifications: '' }]
        });
    };

    const removeItem = (index: number) => {
        setFormData({
            ...formData,
            items: formData.items.filter((_, i) => i !== index)
        });
    };

    const updateItem = (index: number, field: string, value: any) => {
        const newItems: any = [...formData.items];
        newItems[index][field] = value;
        setFormData({ ...formData, items: newItems });
    };

    const getStatusColor = (status: string) => {
        const colors: any = {
            draft: 'bg-zinc-800 text-zinc-300 border-zinc-700',
            sent: 'bg-blue-900/20 text-blue-400 border-blue-900/50',
            quoted: 'bg-yellow-900/20 text-yellow-400 border-yellow-900/50',
            awarded: 'bg-green-900/20 text-green-400 border-green-900/50',
            cancelled: 'bg-red-900/20 text-red-400 border-red-900/50'
        };
        return colors[status] || 'bg-zinc-800 text-zinc-300';
    };

    return (
        <PageContainer
            title="RFQ Management"
            description="Create and manage Request for Quotations"
            actions={
                <Button onClick={() => { setShowModal(true); setSelectedRFQ(null); resetForm(); }} size="sm" className="bg-blue-600 text-white hover:bg-blue-700">
                    <Plus className="h-4 w-4 mr-2" />
                    New RFQ
                </Button>
            }
        >
            <div className="space-y-4">
                {loading ? (
                    <div className="text-center p-8 text-zinc-500">Loading RFQs...</div>
                ) : rfqs.length === 0 ? (
                    <div className="text-center p-8 text-zinc-500">No RFQs found. Create your first one.</div>
                ) : (
                    rfqs.map((rfq) => (
                        <Card key={rfq.id} className="border-zinc-800 bg-zinc-900/50 hover:border-zinc-700 transition">
                            <CardContent className="p-6">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h3 className="text-lg font-bold text-white">{rfq.title}</h3>
                                            <Badge variant="outline" className={getStatusColor(rfq.status)}>
                                                {rfq.status.toUpperCase()}
                                            </Badge>
                                        </div>
                                        <p className="text-sm text-zinc-400 mb-3">{rfq.description}</p>
                                        <div className="flex items-center gap-4 text-xs font-mono text-zinc-500">
                                            <span>{rfq.rfq_number}</span>
                                            <span>•</span>
                                            <span>{rfq.items?.length || 0} ITEMS</span>
                                            <span>•</span>
                                            <span>{rfq.suppliers?.length || 0} SUPPLIERS</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button variant="ghost" size="icon" onClick={() => { setSelectedRFQ(rfq); setShowModal(true); }}>
                                            <Eye className="h-4 w-4" />
                                        </Button>
                                        {rfq.status === 'draft' && (
                                            <Button size="sm" variant="outline" className="border-blue-900/30 text-blue-400 hover:bg-blue-900/20">
                                                <Send className="h-3 w-3 mr-2" /> Send
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-zinc-950 border-zinc-800">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between mb-6 border-b border-zinc-800 pb-4">
                                <h3 className="text-xl font-bold text-white">{selectedRFQ ? 'RFQ Details' : 'Create New RFQ'}</h3>
                                <Button variant="ghost" size="icon" onClick={() => setShowModal(false)}>
                                    <X className="h-5 w-5" />
                                </Button>
                            </div>

                            {selectedRFQ ? (
                                <div className="space-y-6">
                                    <div>
                                        <h4 className="font-bold text-zinc-400 text-xs uppercase tracking-widest mb-3">Line Items</h4>
                                        <div className="space-y-2">
                                            {selectedRFQ.items?.map((item: any, idx: number) => (
                                                <div key={idx} className="p-3 bg-zinc-900 rounded border border-zinc-800">
                                                    <div className="font-medium text-white">{item.item_name || 'Generic Item'}</div>
                                                    <div className="text-sm text-zinc-500">Qty: {item.quantity} {item.unit}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-zinc-400 text-xs uppercase tracking-widest mb-3">Quotes</h4>
                                        <div className="text-sm text-zinc-500 italic">No quotes received yet.</div>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="col-span-2">
                                            <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1 block">Title</label>
                                            <Input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="bg-zinc-900 border-zinc-800" placeholder="e.g. Weekly Veg Order" />
                                        </div>
                                        <div className="col-span-2">
                                            <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1 block">Description</label>
                                            <Input value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="bg-zinc-900 border-zinc-800" placeholder="Optional details" />
                                        </div>
                                    </div>

                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Items</label>
                                            <Button variant="ghost" size="sm" onClick={addItem} className="text-blue-400 hover:text-blue-300 h-6">
                                                <Plus className="h-3 w-3 mr-1" /> Add Item
                                            </Button>
                                        </div>
                                        <div className="space-y-3">
                                            {formData.items.map((item, idx) => (
                                                <div key={idx} className="flex gap-2 items-start">
                                                    <Input
                                                        placeholder="Item Name"
                                                        value={item.item_name}
                                                        onChange={(e) => updateItem(idx, 'item_name', e.target.value)}
                                                        className="flex-1 bg-zinc-900 border-zinc-800"
                                                    />
                                                    <Input
                                                        type="number"
                                                        placeholder="Qty"
                                                        value={item.quantity}
                                                        onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                                                        className="w-20 bg-zinc-900 border-zinc-800"
                                                    />
                                                    <Input
                                                        placeholder="Unit"
                                                        value={item.unit}
                                                        onChange={(e) => updateItem(idx, 'unit', e.target.value)}
                                                        className="w-20 bg-zinc-900 border-zinc-800"
                                                    />
                                                    <Button variant="ghost" size="icon" onClick={() => removeItem(idx)} className="text-red-500 hover:bg-red-900/20">
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="flex justify-end gap-2 mt-6">
                                        <Button variant="ghost" onClick={() => setShowModal(false)}>Cancel</Button>
                                        <Button onClick={handleCreate} disabled={!formData.title} className="bg-white text-black hover:bg-zinc-200">Create Draft</Button>
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
