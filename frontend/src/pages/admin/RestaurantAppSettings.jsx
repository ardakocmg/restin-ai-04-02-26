import React from 'react';
import {
    Settings, ShoppingCart, Utensils, Users,
    Receipt, Clock, Layout, Save, Info,
    ChevronRight, ArrowLeft
} from 'lucide-react';
import PageContainer from '../../layouts/PageContainer';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Switch } from '../../components/ui/switch';
import { Label } from '../../components/ui/label';
import { Input } from '../../components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '../../components/ui/select';

export default function RestaurantAppSettings() {
    const sections = [
        {
            id: 'basket',
            title: 'Basket Settings',
            icon: ShoppingCart,
            settings: [
                { id: 'disp_basket', label: 'Display basket contents on front screen', desc: 'When enabled, customers can see the list of items as they are being typed', type: 'switch', default: true },
                { id: 'basket_scroll', label: 'Basket Scroll', desc: 'Allow scrolling through the basket items during service', type: 'switch', default: false },
                { id: 'single_entry', label: 'Single basket entries', desc: 'Treat each item as a separate entry in the basket list', type: 'switch', default: true }
            ]
        },
        {
            id: 'kitchen',
            title: 'Kitchen Settings',
            icon: Utensils,
            settings: [
                { id: 'print_before', label: 'Print into kitchen before', desc: 'When enabled, kitchen orders are sent immediately when the bill is started', type: 'switch', default: true },
                { id: 'prep_status', label: 'Show prep status on POS', desc: 'Display prep progress from KDS onto the POS terminal', type: 'switch', default: false },
                { id: 'picking_mode', label: 'Pin into picking list mode', desc: 'Enable picking list view for takeout and delivery orders', type: 'switch', default: true },
                { id: 'print_on_bill', label: 'Print on bill generation', desc: 'Automatically print a copy for the kitchen when bill is printed', type: 'switch', default: false },
                { id: 'show_kds', label: 'Show on KDS', desc: 'Send orders to Kitchen Display System', type: 'switch', default: true }
            ]
        },
        {
            id: 'rounding',
            title: 'Rounding & Tax',
            icon: Receipt,
            settings: [
                { id: 'price_round', label: 'Price Rounding Method', desc: 'Choose how prices are rounded for cash transactions', type: 'select', options: ['None', 'Nearest 0.05', 'Nearest 0.10', 'Round Up'], default: 'None' },
                { id: 'tax_calc', label: 'Tax Calculation', desc: 'Define if taxes are inclusive or exclusive by default', type: 'select', options: ['Inclusive', 'Exclusive'], default: 'Inclusive' }
            ]
        },
        {
            id: 'customer',
            title: 'Customer & Payments',
            icon: Users,
            settings: [
                { id: 'receipt_print', label: 'Receipt Print', desc: 'Option to print receipt automatically after payment', type: 'switch', default: true },
                { id: 'quick_pin', label: 'Quick PIN mode', desc: 'Allow faster user switching using short PINs', type: 'switch', default: false }
            ]
        }
    ];

    return (
        <PageContainer
            title="Restaurant App Settings"
            description="Configure your POS behavior, kitchen workflows, and customer interaction settings."
            actions={
                <div className="flex gap-3">
                    <Button variant="outline" className="border-white/10 text-zinc-400 hover:bg-zinc-900 rounded-xl px-6">
                        Discard
                    </Button>
                    <Button className="bg-red-600 hover:bg-red-700 text-white rounded-xl px-6 font-bold">
                        <Save className="w-4 h-4 mr-2" />
                        Save Changes
                    </Button>
                </div>
            }
        >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {sections.map((section) => (
                    <Card key={section.id} className="border-white/5 bg-zinc-900/50 backdrop-blur-xl overflow-hidden flex flex-col">
                        <CardHeader className="border-b border-white/5 bg-white/5 py-4">
                            <CardTitle className="text-sm font-black uppercase tracking-[0.2em] text-zinc-500 flex items-center gap-3">
                                <section.icon className="w-4 h-4 text-red-500" />
                                {section.title}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0 flex-1">
                            <div className="divide-y divide-white/5">
                                {section.settings.map((setting) => (
                                    <div key={setting.id} className="p-6 hover:bg-white/[0.02] transition-colors group">
                                        <div className="flex items-start justify-between gap-6">
                                            <div className="space-y-1">
                                                <Label className="text-sm font-bold text-white group-hover:text-red-400 transition-colors">
                                                    {setting.label}
                                                </Label>
                                                <p className="text-xs text-zinc-500 line-clamp-2">{setting.desc}</p>
                                            </div>

                                            {setting.type === 'switch' ? (
                                                <Switch defaultChecked={setting.default} className="data-[state=checked]:bg-red-600 mt-1" />
                                            ) : setting.type === 'select' ? (
                                                <Select defaultValue={setting.default}>
                                                    <SelectTrigger className="w-[140px] bg-zinc-950 border-white/10 h-9 text-xs">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent className="bg-zinc-900 border-white/10">
                                                        {setting.options.map(opt => (
                                                            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            ) : (
                                                <Input className="w-[140px] bg-zinc-950 border-white/10 h-9 text-xs" />
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="mt-8 bg-blue-500/10 border border-blue-500/20 rounded-2xl p-6 flex items-start gap-4">
                <Info className="w-6 h-6 text-blue-400 shrink-0 mt-1" />
                <div className="space-y-1">
                    <h4 className="text-sm font-bold text-white uppercase tracking-wider">Configuration Note</h4>
                    <p className="text-sm text-zinc-400">These settings are applied globally across all POS terminals registered to this venue. Changes may take up to 60 seconds to sync with active devices depending on their connection strength.</p>
                </div>
            </div>
        </PageContainer>
    );
}
