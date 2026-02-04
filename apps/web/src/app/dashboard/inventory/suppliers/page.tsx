'use client';

import React, { useState } from 'react';
import PageContainer from '@/components/layout/PageContainer';
import { Button } from '@antigravity/ui';
import { Badge } from '@antigravity/ui';
import { Building2, Mail, Phone, Plus, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

export default function SuppliersPage() {
    const [suppliers, setSuppliers] = useState([
        { id: '1', name: 'Fresh Foods Ltd', code: 'SUP-001', email: 'orders@fresh.com', phone: '+356 2133 4455', lead_time: 2, terms: 'Net 30' },
        { id: '2', name: 'Global Spirits', code: 'SUP-002', email: 'sales@global.com', phone: '+356 7900 1122', lead_time: 5, terms: 'COD' },
    ]);

    return (
        <PageContainer title="Suppliers" description="Vendor Relationship Management">
            <div className="flex justify-end mb-6">
                <Button className="bg-blue-600 hover:bg-blue-700 text-white"><Plus className="h-4 w-4 mr-2" /> Add Supplier</Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {suppliers.map(sup => (
                    <div key={sup.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 hover:border-zinc-700 transition-all">
                        <div className="flex items-start gap-4 mb-4">
                            <div className="p-3 bg-blue-900/10 rounded-lg text-blue-500">
                                <Building2 className="h-6 w-6" />
                            </div>
                            <div>
                                <h3 className="font-bold text-white text-lg">{sup.name}</h3>
                                <p className="text-zinc-500 text-xs font-mono">{sup.code}</p>
                            </div>
                        </div>

                        <div className="space-y-3 mb-6">
                            <div className="flex items-center gap-2 text-sm text-zinc-400">
                                <Mail className="h-4 w-4 opacity-50" /> {sup.email}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-zinc-400">
                                <Phone className="h-4 w-4 opacity-50" /> {sup.phone}
                            </div>
                        </div>

                        <div className="bg-black/20 p-3 rounded-lg border border-zinc-800 flex justify-between text-xs">
                            <div>
                                <span className="block text-zinc-600 uppercase font-bold text-[9px]">Lead Time</span>
                                <span className="text-zinc-300 font-bold">{sup.lead_time} Days</span>
                            </div>
                            <div className="text-right">
                                <span className="block text-zinc-600 uppercase font-bold text-[9px]">Terms</span>
                                <span className="text-zinc-300 font-bold">{sup.terms}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </PageContainer>
    );
}
