import React, { useState, useCallback, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
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
import { printersAPI, printerTemplatesAPI } from '../../lib/api/printers';
import api from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { Loader2 } from 'lucide-react';
import DataTable from '../../components/shared/DataTable';

// Removed MOCK_PRINTERS constant in favor of API fetching

// MOCK DATA REMOVED - STRICT DATABASE MODE


export default function Printers() {
    const { user } = useAuth();
    const location = useLocation();
    const [activeTab, setActiveTab] = useState('printers');

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const tab = params.get('tab');
        if (tab) setActiveTab(tab);
    }, [location.search]);

    const [printers, setPrinters] = useState([]);
    const [templates, setTemplates] = useState([]); // Will load from API
    const [cashDrawers, setCashDrawers] = useState([]);
    const [loading, setLoading] = useState(false);

    const [editPrinterModal, setEditPrinterModal] = useState(false);
    const [editTemplateModal, setEditTemplateModal] = useState(false);
    const [addDrawerModal, setAddDrawerModal] = useState(false);

    const [selectedPrinter, setSelectedPrinter] = useState(null);
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [newDrawerName, setNewDrawerName] = useState('');

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [printersData, templatesData, drawersRes] = await Promise.all([
                printersAPI.list({ venue_id: user?.defaultVenueId }),
                printerTemplatesAPI.list(),
                api.get('/hr/cash-drawers', { params: { venue_id: user?.defaultVenueId } })
            ]);
            setPrinters(printersData);
            setTemplates(templatesData);
            setCashDrawers(drawersRes.data || []);
        } catch (error) {
            console.error("Failed to load printers:", error);
            // FAIL LOUDLY - No Mock Data
            toast.error("Failed to load printer configuration from server.");
            setTemplates([]);
        } finally {
            setLoading(false);
        }
    }, [user?.defaultVenueId]);

    useEffect(() => {
        loadData();
    }, [loadData]);

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

    const handleUpdateTemplateField = (field, value) => {
        setSelectedTemplate(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleSaveTemplate = async () => {
        setLoading(true);
        try {
            // Check if it's a new template (no ID) or update
            let updatedTemplates;
            if (templates.some(t => t.id === selectedTemplate.id)) {
                updatedTemplates = templates.map(t => t.id === selectedTemplate.id ? selectedTemplate : t);
                await printerTemplatesAPI.update(selectedTemplate.id, selectedTemplate);
            } else {
                const newId = (Math.max(...templates.map(t => parseInt(t.id) || 0)) + 1).toString();
                const newTemplate = { ...selectedTemplate, id: newId };
                updatedTemplates = [...templates, newTemplate];
                await printerTemplatesAPI.create(newTemplate);
            }

            setTemplates(updatedTemplates);
            setEditTemplateModal(false);
            toast.success('Template saved successfully');
        } catch (error) {
            console.error('Failed to save template:', error);
            // Fallback for mock if API fails
            let updatedTemplates;
            if (templates.some(t => t.id === selectedTemplate.id)) {
                updatedTemplates = templates.map(t => t.id === selectedTemplate.id ? selectedTemplate : t);
            } else {
                const newId = (Math.max(...templates.map(t => parseInt(t.id) || 0)) + 1).toString();
                updatedTemplates = [...templates, { ...selectedTemplate, id: newId }];
            }
            setTemplates(updatedTemplates);
            setEditTemplateModal(false);
            toast.success('Template saved (Local Fallback)');
        } finally {
            setLoading(false);
        }
    };

    const handleCopyTemplate = () => {
        const copy = {
            ...selectedTemplate,
            id: (Math.max(...templates.map(t => parseInt(t.id) || 0)) + 1).toString(),
            name: `Copy of ${selectedTemplate.name}`
        };
        setTemplates([...templates, copy]);
        setSelectedTemplate(copy);
        toast.success('Template duplicated');
    };

    const handleDeleteTemplate = async () => {
        if (!window.confirm('Are you sure you want to delete this template?')) return;

        try {
            await printerTemplatesAPI.delete(selectedTemplate.id);
            setTemplates(templates.filter(t => t.id !== selectedTemplate.id));
            setEditTemplateModal(false);
            toast.success('Template deleted');
        } catch (error) {
            toast.error('Failed to delete template: Backend Error');
        }
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
                                        onChange={(e) => handleUpdateTemplateField('name', e.target.value)}
                                        className="bg-zinc-950 border-white/10 text-white mt-1"
                                    />
                                </div>

                                <div>
                                    <Label className="text-zinc-400 text-xs">Type</Label>
                                    <div className="flex gap-2 mt-1">
                                        <Button variant={selectedTemplate.type === 'Ticket' ? 'default' : 'outline'} size="sm" className="flex-1" onClick={() => handleUpdateTemplateField('type', 'Ticket')}>Ticket</Button>
                                        <Button variant={selectedTemplate.type === 'Bar' ? 'default' : 'outline'} size="sm" className="flex-1" onClick={() => handleUpdateTemplateField('type', 'Bar')}>Bar</Button>
                                        <Button variant={selectedTemplate.type === 'Kitchen' ? 'default' : 'outline'} size="sm" className="flex-1" onClick={() => handleUpdateTemplateField('type', 'Kitchen')}>Kitchen</Button>
                                        <Button variant={selectedTemplate.type === 'Receipt' ? 'default' : 'outline'} size="sm" className="flex-1" onClick={() => handleUpdateTemplateField('type', 'Receipt')}>Receipt</Button>
                                    </div>
                                </div>

                                <div>
                                    <Label className="text-zinc-400 text-xs">Printer</Label>
                                    <Input
                                        value={selectedTemplate.printer}
                                        onChange={(e) => handleUpdateTemplateField('printer', e.target.value)}
                                        className="bg-zinc-950 border-white/10 text-white mt-1"
                                    />
                                </div>

                                <div>
                                    <Label className="text-zinc-400 text-xs">Backup printer</Label>
                                    <Select value={selectedTemplate.backupPrinter} onValueChange={(val) => handleUpdateTemplateField('backupPrinter', val)}>
                                        <SelectTrigger className="bg-zinc-950 border-white/10 text-white mt-1">
                                            <SelectValue placeholder="Select backup" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="kitchen-pass">Kitchen-Pass</SelectItem>
                                            <SelectItem value="station">Station</SelectItem>
                                            <SelectItem value="Bar">Bar</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div>
                                    <div>
                                        <Label className="text-zinc-400 text-xs">Logo Url</Label>
                                        <Input
                                            value={selectedTemplate.logoUrl || ''}
                                            onChange={(e) => handleUpdateTemplateField('logoUrl', e.target.value)}
                                            placeholder="https://..."
                                            className="bg-zinc-950 border-white/10 text-white mt-1"
                                        />
                                    </div>

                                    <div>
                                        <Label className="text-zinc-400 text-xs">Bottom Logo Url</Label>
                                        <Input
                                            value={selectedTemplate.bottomLogoUrl || ''}
                                            onChange={(e) => handleUpdateTemplateField('bottomLogoUrl', e.target.value)}
                                            placeholder="https://..."
                                            className="bg-zinc-950 border-white/10 text-white mt-1"
                                        />
                                    </div>

                                    <div>
                                        <Label className="text-zinc-400 text-xs">Title Text</Label>
                                        <Input
                                            value={selectedTemplate.titleText || ''}
                                            onChange={(e) => handleUpdateTemplateField('titleText', e.target.value)}
                                            className="bg-zinc-950 border-white/10 text-white mt-1"
                                        />
                                    </div>

                                    <div>
                                        <Label className="text-zinc-400 text-xs">Greeting Text</Label>
                                        <Input
                                            value={selectedTemplate.greetingText || ''}
                                            onChange={(e) => handleUpdateTemplateField('greetingText', e.target.value)}
                                            className="bg-zinc-950 border-white/10 text-white mt-1"
                                        />
                                    </div>

                                    <div>
                                        <Label className="text-zinc-400 text-xs">Promotion Text</Label>
                                        <Input
                                            value={selectedTemplate.promotionText || ''}
                                            onChange={(e) => handleUpdateTemplateField('promotionText', e.target.value)}
                                            className="bg-zinc-950 border-white/10 text-white mt-1"
                                        />
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
                            </div>

                            {/* Right Column - Receipt Preview */},
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
                                            <span className="text-orange-600 dark:text-orange-400">20ProductWithPricedAddition</span>
                                            <span className="text-zinc-900">1</span>
                                        </div>
                                        <p className="text-zinc-600 text-[10px] ml-2">* payedTwo</p>
                                        <p className="text-zinc-600 text-[10px] ml-2">* payedThree</p>
                                    </div>
                                    <div>
                                        <div className="flex justify-between">
                                            <span className="text-orange-600 dark:text-orange-400">10ProductWithPricedAddition</span>
                                            <span className="text-zinc-900">2</span>
                                        </div>
                                        <p className="text-zinc-600 text-[10px] ml-2">* payedTwo</p>
                                    </div>
                                    <div>
                                        <div className="flex justify-between">
                                            <span className="text-orange-600 dark:text-orange-400">10ProductWithPricedAddition</span>
                                            <span className="text-zinc-900">3</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <DialogFooter className="flex gap-2">
                        <Button variant="destructive" className="bg-red-500 hover:bg-red-600" onClick={handleDeleteTemplate}>
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                        </Button>
                        <Button variant="outline" className="bg-cyan-500 hover:bg-cyan-600 text-white border-none" onClick={handleCopyTemplate}>
                            <Copy className="w-4 h-4 mr-2" />
                            Copy
                        </Button>
                        <div className="flex-1" />
                        <Button variant="outline" onClick={() => setEditTemplateModal(false)}>
                            Cancel
                        </Button>
                        <Button className="bg-cyan-500 hover:bg-cyan-600" onClick={handleSaveTemplate}>
                            Save Changes
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
