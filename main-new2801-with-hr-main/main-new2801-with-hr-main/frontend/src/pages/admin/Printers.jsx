import React, { useState } from 'react';
import PageContainer from '../../layouts/PageContainer';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Printer, Plus, Settings, Trash2, Copy, FileText } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { cn } from '../../lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Checkbox } from '../../components/ui/checkbox';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { toast } from 'sonner';
import DataTable from '../../components/shared/DataTable';
import { ScrollArea } from '../../components/ui/scroll-area';

const MOCK_PRINTERS = [
    { id: '1', name: 'Bull POS 1', type: 'Receipt', location: 'Front Desk', ip: '192.168.1.100', port: 9100, status: 'Online', template: 'Receipt - Station' },
    { id: '2', name: 'Kitchen Main', type: 'Kitchen', location: 'Kitchen', ip: '192.168.1.101', port: 9100, status: 'Online', template: 'Kitchen MAIN' },
    { id: '3', name: 'Bar Printer', type: 'Bar', location: 'Bar', ip: '192.168.1.102', port: 9100, status: 'Offline', template: 'Bar' },
    { id: '4', name: 'Kitchen Pass', type: 'Kitchen', location: 'Kitchen Pass', ip: '192.168.1.103', port: 9100, status: 'Online', template: 'Kitchen STR' },
];

const MOCK_TEMPLATES = [
    {
        id: '1', name: 'Bar', type: 'Bar', printer: 'Bar', backupPrinter: '',
        titleText: 'BAR', greetingText: '', promotionText: '',
        fontName: 'Arial', fontSize: 35, timesPrinted: 1,
        bigFontName: 'Arial-BoldMT', bigFontSize: 50,
        smallFontName: 'Arial', smallFontSize: 30,
        itemNumberWidth: 0, priceWidth: 0,
        showCompany: false, showCustomer: false, showTotalPrice: false,
        showWaiterTimes: true, signalAccessory: false, showSequenceNr: true, showVAT: false,
        printItemsSplit: 'Don\'t split', chooseLayout: 'EN-MT'
    },
    {
        id: '2', name: 'Kitchen STR', type: 'Kitchen', printer: 'Kitchen-Pass', backupPrinter: 'Kitchen-Pass',
        titleText: 'KITCHEN STR', greetingText: '', promotionText: '',
        fontName: 'Arial', fontSize: 35, timesPrinted: 2,
        bigFontName: 'Arial-BoldMT', bigFontSize: 50,
        smallFontName: 'Arial', smallFontSize: 25,
        itemNumberWidth: 0, priceWidth: 0,
        showCompany: false, showCustomer: false, showTotalPrice: false,
        showWaiterTimes: true, signalAccessory: false, showSequenceNr: true, showVAT: false,
        printItemsSplit: 'Don\'t split', chooseLayout: 'EN-MT'
    },
    {
        id: '3', name: 'Kitchen MAIN', type: 'Kitchen', printer: 'Kitchen-Main', backupPrinter: 'Kitchen-Pass',
        titleText: 'KITCHEN', greetingText: '', promotionText: '',
        fontName: 'Arial', fontSize: 30, timesPrinted: 2,
        bigFontName: 'Arial-BoldMT', bigFontSize: 50,
        smallFontName: 'Arial', smallFontSize: 35,
        itemNumberWidth: 0, priceWidth: 0,
        showCompany: false, showCustomer: false, showTotalPrice: false,
        showWaiterTimes: true, signalAccessory: false, showSequenceNr: true, showVAT: false,
        printItemsSplit: 'Don\'t split', chooseLayout: 'EN-MT'
    },
    {
        id: '4', name: 'Kitchen Dessert Sedic', type: 'Kitchen', printer: 'Kitchen-Dessert', backupPrinter: 'Kitchen-Pass',
        titleText: 'Dessert', greetingText: '', promotionText: '',
        fontName: 'Arial', fontSize: 30, timesPrinted: 2,
        bigFontName: 'Arial-BoldMT', bigFontSize: 50,
        smallFontName: 'Arial', smallFontSize: 40,
        itemNumberWidth: 0, priceWidth: 0,
        showCompany: false, showCustomer: false, showTotalPrice: false,
        showWaiterTimes: true, signalAccessory: false, showSequenceNr: true, showVAT: false,
        printItemsSplit: 'Don\'t split', chooseLayout: 'EN-MT'
    },
    {
        id: '5', name: 'STATION 2', type: 'Kitchen', printer: 'Station', backupPrinter: 'Bar',
        titleText: 'Kitchen Order', greetingText: '', promotionText: '',
        fontName: 'Arial', fontSize: 30, timesPrinted: 1,
        bigFontName: 'Arial-BoldMT', bigFontSize: 60,
        smallFontName: 'Arial', smallFontSize: 35,
        itemNumberWidth: 0, priceWidth: 0,
        showCompany: false, showCustomer: false, showTotalPrice: false,
        showWaiterTimes: true, signalAccessory: false, showSequenceNr: true, showVAT: false,
        printItemsSplit: 'Don\'t split', chooseLayout: 'EN-MT'
    },
    {
        id: '6', name: 'Wine Order @ Station', type: 'Bar', printer: 'Bar', backupPrinter: 'Select a backup printer',
        titleText: 'BAR', greetingText: '', promotionText: '',
        fontName: 'Arial', fontSize: 25, timesPrinted: 1,
        bigFontName: 'Arial-BoldMT', bigFontSize: 45,
        smallFontName: 'Arial', smallFontSize: 16,
        itemNumberWidth: 4, priceWidth: 0,
        showCompany: false, showCustomer: false, showTotalPrice: true,
        showWaiterTimes: true, signalAccessory: false, showSequenceNr: true, showVAT: false,
        printItemsSplit: 'Don\'t split', chooseLayout: 'EN-MT'
    },
    {
        id: '7', name: 'Receipt - Station', type: 'Receipt', printer: 'Station', backupPrinter: '',
        logoUrl: 'CAVIAR & BULL', bottomLogoUrl: '',
        titleText: '', greetingText: 'Thank you - we look fo', promotionText: 'Please note that service charge is not included in the bill',
        fontName: 'Arial', fontSize: 25, timesPrinted: 1,
        bigFontName: 'Arial-BoldMT', bigFontSize: 45,
        smallFontName: 'Arial', smallFontSize: 20,
        itemNumberWidth: 0, priceWidth: 8,
        showCompany: true, showCustomer: true, showTotalPrice: true,
        showWaiterTimes: true, signalAccessory: false, showSequenceNr: true, showVAT: false,
        printItemsSplit: 'Don\'t split', chooseLayout: 'EN-MT',
        qrCode: 'Website', suggestedTips: '10, 15, 20'
    },
    {
        id: '8', name: 'Receipt - Bar', type: 'Receipt', printer: 'Bar', backupPrinter: '',
        logoUrl: 'CAVIAR & BULL', bottomLogoUrl: '',
        titleText: '', greetingText: 'Thank you for dining a', promotionText: 'Please note that service charge is not included in the bill',
        fontName: 'Arial', fontSize: 25, timesPrinted: 1,
        bigFontName: 'Arial-BoldMT', bigFontSize: 45,
        smallFontName: 'Arial', smallFontSize: 20,
        itemNumberWidth: 0, priceWidth: 8,
        showCompany: true, showCustomer: false, showTotalPrice: true,
        showWaiterTimes: true, signalAccessory: false, showSequenceNr: true, showVAT: false,
        printItemsSplit: 'Don\'t split', chooseLayout: 'EN-MT',
        qrCode: 'Website', suggestedTips: '10, 15, 20'
    },
    {
        id: '9', name: 'Copy of Kitchen STR', type: 'Kitchen', printer: 'Station', backupPrinter: 'Kitchen-Pass',
        titleText: 'KITCHEN STR', greetingText: '', promotionText: '',
        fontName: 'ArialMT', fontSize: 35, timesPrinted: 2,
        bigFontName: 'Arial-BoldMT', bigFontSize: 50,
        smallFontName: 'Arial', smallFontSize: 25,
        itemNumberWidth: 0, priceWidth: 0,
        showCompany: false, showCustomer: false, showTotalPrice: false,
        showWaiterTimes: true, signalAccessory: false, showSequenceNr: true, showVAT: false,
        printItemsSplit: 'Don\'t split', chooseLayout: 'EN-MT'
    },
    {
        id: '10', name: 'Copy of Kitchen', type: 'Kitchen', printer: 'Kitchen Main', titleText: 'KITCHEN', fontName: 'Arial', fontSize: 35
    },
    {
        id: '11', name: 'Copy of Bar', type: 'Bar', printer: 'Bar', titleText: 'BAR', fontName: 'Arial', fontSize: 35
    },
    {
        id: '12', name: 'Receipt - Host', type: 'Receipt', printer: 'Host (Bill)', backupPrinter: '',
        logoUrl: 'CAVIAR & BULL', bottomLogoUrl: '',
        titleText: '', greetingText: 'Thank you for dining a', promotionText: 'Please note that service charge is not included in the bill',
        fontName: 'Arial', fontSize: 25, timesPrinted: 1,
        bigFontName: 'Arial-BoldMT', bigFontSize: 45,
        smallFontName: 'Arial', smallFontSize: 20,
        itemNumberWidth: 0, priceWidth: 8,
        showCompany: true, showCustomer: true, showTotalPrice: true,
        showWaiterTimes: true, signalAccessory: false, showSequenceNr: true, showVAT: false,
        printItemsSplit: 'Don\'t split', chooseLayout: 'EN-MT',
        qrCode: 'Website', suggestedTips: '10, 15, 20',
        currency: '€', secondaryCurrency: '', exchangeRate: 0.00, taxName: 'VAT'
    },
];

const MOCK_CASH_DRAWERS = [
    { id: '1', name: 'Main Drawer' },
    { id: '2', name: 'Bar Drawer' },
];

export default function Printers() {
    const [activeTab, setActiveTab] = useState('printers');
    const [printers, setPrinters] = useState(MOCK_PRINTERS);
    const [templates, setTemplates] = useState(MOCK_TEMPLATES);
    const [cashDrawers, setCashDrawers] = useState(MOCK_CASH_DRAWERS);

    const [editPrinterModal, setEditPrinterModal] = useState(false);
    const [editTemplateModal, setEditTemplateModal] = useState(false);
    const [addDrawerModal, setAddDrawerModal] = useState(false);

    const [selectedPrinter, setSelectedPrinter] = useState(null);
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [newDrawerName, setNewDrawerName] = useState('');

    const openEditTemplate = (template) => {
        setSelectedTemplate(template);
        setEditTemplateModal(true);
    };

    const handleAddDrawer = () => {
        if (!newDrawerName.trim()) {
            toast.error('Please enter a drawer name');
            return;
        }
        const newDrawer = {
            id: (cashDrawers.length + 1).toString(),
            name: newDrawerName
        };
        setCashDrawers([...cashDrawers, newDrawer]);
        setNewDrawerName('');
        setAddDrawerModal(false);
        toast.success('Cash drawer added successfully');
    };

    return (
        <PageContainer
            title="Printers"
            description="Manage printers, templates, and cash drawers for Caviar & Bull."
            breadcrumb={[
                { label: 'Management', href: '#' },
                { label: 'Printers', href: '/admin/printers' }
            ]}
        >
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="bg-zinc-900 border border-white/5 p-1 mb-6">
                    <TabsTrigger value="printers" className="data-[state=active]:bg-red-600 data-[state=active]:text-white">
                        <Printer className="w-4 h-4 mr-2" />
                        Printers
                    </TabsTrigger>
                    <TabsTrigger value="templates" className="data-[state=active]:bg-red-600 data-[state=active]:text-white">
                        <FileText className="w-4 h-4 mr-2" />
                        Printer Templates
                    </TabsTrigger>
                    <TabsTrigger value="cash-drawers" className="data-[state=active]:bg-red-600 data-[state=active]:text-white">
                        <Plus className="w-4 h-4 mr-2" />
                        Cash Drawers
                    </TabsTrigger>
                </TabsList>

                {/* Printers Tab */}
                <TabsContent value="printers" className="m-0">
                    <Card className="border-white/5 bg-zinc-900/50 backdrop-blur-xl">
                        <CardContent className="pt-6">
                            <DataTable
                                data={printers}
                                columns={[
                                    { header: 'Name', accessorKey: 'name' },
                                    { header: 'Type', accessorKey: 'type' },
                                    { header: 'Location', accessorKey: 'location' },
                                    { header: 'IP Address', accessorKey: 'ip' },
                                    { header: 'Port', accessorKey: 'port' },
                                    { header: 'Template', accessorKey: 'template' },
                                    {
                                        header: 'Status',
                                        accessorKey: 'status',
                                        cell: ({ row }) => (
                                            <Badge className={row.original.status === 'Online' ? 'bg-emerald-600' : 'bg-red-600'}>
                                                {row.original.status}
                                            </Badge>
                                        )
                                    },
                                    {
                                        header: 'Actions',
                                        cell: ({ row }) => (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => {
                                                    setSelectedPrinter(row.original);
                                                    setEditPrinterModal(true);
                                                }}
                                            >
                                                <Settings className="w-4 h-4" />
                                            </Button>
                                        )
                                    }
                                ]}
                            />
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Printer Templates Tab */}
                <TabsContent value="templates" className="m-0">
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        {templates.map(template => (
                            <Card
                                key={template.id}
                                className="border-white/5 bg-zinc-900/50 backdrop-blur-xl cursor-pointer hover:border-emerald-500/50 transition-all group"
                                onClick={() => openEditTemplate(template)}
                            >
                                <CardContent className="pt-6 flex flex-col items-center gap-3">
                                    <div className="w-16 h-20 bg-emerald-600 rounded-lg flex items-center justify-center relative overflow-hidden">
                                        <div className="absolute inset-0 bg-gradient-to-b from-emerald-500 to-emerald-700" />
                                        <div className="absolute bottom-0 w-full h-3 bg-emerald-800" style={{
                                            clipPath: 'polygon(0 0, 10% 100%, 20% 0, 30% 100%, 40% 0, 50% 100%, 60% 0, 70% 100%, 80% 0, 90% 100%, 100% 0, 100% 100%, 0 100%)'
                                        }} />
                                        <FileText className="w-8 h-8 text-white relative z-10" />
                                    </div>
                                    <span className="text-xs font-bold text-white text-center">{template.name}</span>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </TabsContent>

                {/* Cash Drawers Tab */}
                <TabsContent value="cash-drawers" className="m-0">
                    <div className="flex items-center justify-center min-h-[400px]">
                        <Card
                            className="border-white/5 bg-zinc-900/50 backdrop-blur-xl w-48 cursor-pointer hover:border-cyan-500/50 transition-all"
                            onClick={() => setAddDrawerModal(true)}
                        >
                            <CardContent className="pt-6 flex flex-col items-center gap-4">
                                <div className="w-16 h-16 rounded-full bg-cyan-500 flex items-center justify-center">
                                    <Plus className="w-8 h-8 text-white" />
                                </div>
                                <span className="text-sm font-bold text-white">Add Cashdrawer</span>
                            </CardContent>
                        </Card>
                    </div>

                    {cashDrawers.length > 0 && (
                        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                            {cashDrawers.map(drawer => (
                                <Card key={drawer.id} className="border-white/5 bg-zinc-900/50 backdrop-blur-xl">
                                    <CardContent className="pt-6">
                                        <p className="text-white font-bold">{drawer.name}</p>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </TabsContent>
            </Tabs>

            {/* Edit Printer Modal */}
            <Dialog open={editPrinterModal} onOpenChange={setEditPrinterModal}>
                <DialogContent className="bg-zinc-900 border-white/10 text-white">
                    <DialogHeader>
                        <DialogTitle className="text-white">Edit Printer</DialogTitle>
                    </DialogHeader>
                    {selectedPrinter && (
                        <div className="space-y-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-zinc-400">Name</Label>
                                    <Input defaultValue={selectedPrinter.name} className="bg-zinc-950 border-white/10 text-white" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-zinc-400">Type</Label>
                                    <Select defaultValue={selectedPrinter.type}>
                                        <SelectTrigger className="bg-zinc-950 border-white/10 text-white">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Receipt">Receipt</SelectItem>
                                            <SelectItem value="Kitchen">Kitchen</SelectItem>
                                            <SelectItem value="Bar">Bar</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-zinc-400">IP Address</Label>
                                    <Input defaultValue={selectedPrinter.ip} className="bg-zinc-950 border-white/10 text-white" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-zinc-400">Port</Label>
                                    <Input defaultValue={selectedPrinter.port} type="number" className="bg-zinc-950 border-white/10 text-white" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-zinc-400">Printer Template</Label>
                                <Select defaultValue={selectedPrinter.template}>
                                    <SelectTrigger className="bg-zinc-950 border-white/10 text-white">
                                        <SelectValue placeholder="Select a template" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {templates.map(t => (
                                            <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditPrinterModal(false)}>Cancel</Button>
                        <Button className="bg-red-600 hover:bg-red-700" onClick={() => setEditPrinterModal(false)}>Save Changes</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Printer Template Modal */}
            <Dialog open={editTemplateModal} onOpenChange={setEditTemplateModal}>
                <DialogContent className="max-w-6xl bg-zinc-900 border-white/10 text-white">
                    <DialogHeader>
                        <DialogTitle className="text-white">Edit Printer Template</DialogTitle>
                    </DialogHeader>

                    {selectedTemplate && (
                        <div className="grid grid-cols-3 gap-6">
                            {/* Left Column */}
                            <div className="space-y-4">
                                <div>
                                    <Label className="text-zinc-400 text-xs">Name</Label>
                                    <Input
                                        value={selectedTemplate.name}
                                        className="bg-zinc-950 border-white/10 text-white mt-1"
                                    />
                                </div>

                                <div>
                                    <Label className="text-zinc-400 text-xs">Type</Label>
                                    <div className="flex gap-2 mt-1">
                                        <Button variant={selectedTemplate.type === 'Ticket' ? 'default' : 'outline'} size="sm" className="flex-1">Ticket</Button>
                                        <Button variant={selectedTemplate.type === 'Bar' ? 'default' : 'outline'} size="sm" className="flex-1">Bar</Button>
                                        <Button variant={selectedTemplate.type === 'Kitchen' ? 'default' : 'outline'} size="sm" className="flex-1">Kitchen</Button>
                                        <Button variant="outline" size="sm" className="flex-1">Gate</Button>
                                    </div>
                                </div>

                                <div>
                                    <Label className="text-zinc-400 text-xs">Printer</Label>
                                    <Input
                                        value={selectedTemplate.printer}
                                        className="bg-zinc-950 border-white/10 text-white mt-1"
                                    />
                                </div>

                                <div>
                                    <Label className="text-zinc-400 text-xs">Backup printer</Label>
                                    <Select>
                                        <SelectTrigger className="bg-zinc-950 border-white/10 text-white mt-1">
                                            <SelectValue placeholder="Select backup" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="kitchen-pass">Kitchen-Pass</SelectItem>
                                            <SelectItem value="station">Station</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div>
                                    <Label className="text-zinc-400 text-xs">Logo Url</Label>
                                    <a href="#" className="text-cyan-500 text-sm block mt-1">Attach an image</a>
                                </div>

                                <div>
                                    <Label className="text-zinc-400 text-xs">Bottom Logo Url</Label>
                                    <a href="#" className="text-cyan-500 text-sm block mt-1">Attach an image</a>
                                </div>

                                <div>
                                    <Label className="text-zinc-400 text-xs">Title Text</Label>
                                    <Input
                                        value={selectedTemplate.titleText}
                                        className="bg-zinc-950 border-white/10 text-white mt-1"
                                    />
                                </div>

                                <div>
                                    <Label className="text-zinc-400 text-xs">Greeting Text</Label>
                                    <Input className="bg-zinc-950 border-white/10 text-white mt-1" />
                                </div>

                                <div>
                                    <Label className="text-zinc-400 text-xs">Promotion Text</Label>
                                    <Input className="bg-zinc-950 border-white/10 text-white mt-1" />
                                </div>

                                <div className="flex items-center gap-2">
                                    <Checkbox id="show-company" />
                                    <Label htmlFor="show-company" className="text-zinc-400 text-xs">Show Company</Label>
                                </div>

                                <div className="flex items-center gap-2">
                                    <Checkbox id="show-customer" />
                                    <Label htmlFor="show-customer" className="text-zinc-400 text-xs">Show Customer</Label>
                                </div>
                            </div>

                            {/* Middle Column - Font Settings */}
                            <div className="space-y-4">
                                <div>
                                    <Label className="text-zinc-400 text-xs">Font Name</Label>
                                    <Select defaultValue="arial">
                                        <SelectTrigger className="bg-zinc-950 border-white/10 text-white mt-1">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="arial">Arial</SelectItem>
                                            <SelectItem value="arial-bold">Arial-BoldMT</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div>
                                    <Label className="text-zinc-400 text-xs">Font Size</Label>
                                    <Input type="number" defaultValue="35" className="bg-zinc-950 border-white/10 text-white mt-1" />
                                </div>

                                <div>
                                    <Label className="text-zinc-400 text-xs">Times Printed</Label>
                                    <Input type="number" defaultValue="1" className="bg-zinc-950 border-white/10 text-white mt-1" />
                                </div>

                                <div>
                                    <Label className="text-zinc-400 text-xs">Big Font Name</Label>
                                    <Select defaultValue="arial-bold">
                                        <SelectTrigger className="bg-zinc-950 border-white/10 text-white mt-1">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="arial">Arial</SelectItem>
                                            <SelectItem value="arial-bold">Arial-BoldMT</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div>
                                    <Label className="text-zinc-400 text-xs">Big Font Size</Label>
                                    <Input type="number" defaultValue="50" className="bg-zinc-950 border-white/10 text-white mt-1" />
                                </div>

                                <div>
                                    <Label className="text-zinc-400 text-xs">Small Font Name</Label>
                                    <Select defaultValue="arial">
                                        <SelectTrigger className="bg-zinc-950 border-white/10 text-white mt-1">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="arial">Arial</SelectItem>
                                            <SelectItem value="arial-bold">Arial-BoldMT</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div>
                                    <Label className="text-zinc-400 text-xs">Small Font Size</Label>
                                    <Input type="number" defaultValue="30" className="bg-zinc-950 border-white/10 text-white mt-1" />
                                </div>

                                <div>
                                    <Label className="text-zinc-400 text-xs">Item number width</Label>
                                    <Input type="number" defaultValue="0" className="bg-zinc-950 border-white/10 text-white mt-1" />
                                </div>

                                <div>
                                    <Label className="text-zinc-400 text-xs">Price Width</Label>
                                    <Input type="number" defaultValue="0" className="bg-zinc-950 border-white/10 text-white mt-1" />
                                </div>

                                <div className="flex items-center gap-2">
                                    <Checkbox id="show-total" />
                                    <Label htmlFor="show-total" className="text-zinc-400 text-xs">Show Total Price</Label>
                                </div>

                                <div className="flex items-center gap-2">
                                    <Checkbox id="show-waiter" defaultChecked />
                                    <Label htmlFor="show-waiter" className="text-zinc-400 text-xs">Show waiter times</Label>
                                </div>

                                <div className="flex items-center gap-2">
                                    <Checkbox id="signal-accessory" />
                                    <Label htmlFor="signal-accessory" className="text-zinc-400 text-xs">Signal accessory</Label>
                                </div>

                                <div className="flex items-center gap-2">
                                    <Checkbox id="show-sequence" defaultChecked />
                                    <Label htmlFor="show-sequence" className="text-zinc-400 text-xs">Show sequence nr</Label>
                                </div>

                                <div className="flex items-center gap-2">
                                    <Checkbox id="show-vat" />
                                    <Label htmlFor="show-vat" className="text-zinc-400 text-xs">Show VAT</Label>
                                </div>
                            </div>

                            {/* Right Column - Receipt Preview */}
                            <div className="bg-white rounded-lg p-4 h-fit">
                                <div className="text-center border-b border-zinc-300 pb-2 mb-2">
                                    <p className="text-xs text-zinc-600">T-3</p>
                                    <p className="text-lg font-black text-zinc-900">{selectedTemplate.titleText}</p>
                                    <p className="text-xs text-zinc-600">#4</p>
                                    <p className="text-xs text-zinc-600">01 02 2026 19:30</p>
                                    <p className="text-xs text-zinc-600">94331</p>
                                    <p className="text-xs font-bold text-zinc-900">Nicolas Doe</p>
                                    <p className="text-xs text-zinc-600">John Doe</p>
                                </div>
                                <div className="space-y-1 text-xs">
                                    <div className="flex justify-between border-b border-zinc-200 pb-1">
                                        <span className="font-bold text-zinc-900">#Item</span>
                                        <span className="font-bold text-zinc-900">Cst. #</span>
                                    </div>
                                    <div>
                                        <div className="flex justify-between">
                                            <span className="text-orange-600">20ProductWithPricedAddition</span>
                                            <span className="text-zinc-900">1</span>
                                        </div>
                                        <p className="text-zinc-600 text-[10px] ml-2">* payedTwo</p>
                                        <p className="text-zinc-600 text-[10px] ml-2">* payedThree</p>
                                    </div>
                                    <div>
                                        <div className="flex justify-between">
                                            <span className="text-orange-600">10ProductWithPricedAddition</span>
                                            <span className="text-zinc-900">2</span>
                                        </div>
                                        <p className="text-zinc-600 text-[10px] ml-2">* payedTwo</p>
                                    </div>
                                    <div>
                                        <div className="flex justify-between">
                                            <span className="text-orange-600">10ProductWithPricedAddition</span>
                                            <span className="text-zinc-900">3</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <DialogFooter className="flex gap-2">
                        <Button variant="destructive" className="bg-cyan-500 hover:bg-cyan-600">
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                        </Button>
                        <Button variant="outline" className="bg-cyan-500 hover:bg-cyan-600 text-white border-none">
                            <Copy className="w-4 h-4 mr-2" />
                            Copy
                        </Button>
                        <div className="flex-1" />
                        <Button variant="outline" onClick={() => setEditTemplateModal(false)}>
                            Cancel
                        </Button>
                        <Button className="bg-cyan-500 hover:bg-cyan-600">
                            Ok
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Add Cash Drawer Modal */}
            <Dialog open={addDrawerModal} onOpenChange={setAddDrawerModal}>
                <DialogContent className="bg-zinc-900 border-white/10 text-white">
                    <DialogHeader>
                        <DialogTitle className="text-white">Add Cash Drawer</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label className="text-zinc-400">Drawer Name</Label>
                            <Input
                                value={newDrawerName}
                                onChange={(e) => setNewDrawerName(e.target.value)}
                                placeholder="Enter drawer name"
                                className="bg-zinc-950 border-white/10 text-white mt-2"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setAddDrawerModal(false)}>
                            Cancel
                        </Button>
                        <Button className="bg-cyan-500 hover:bg-cyan-600" onClick={handleAddDrawer}>
                            Add
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </PageContainer>
    );
}
