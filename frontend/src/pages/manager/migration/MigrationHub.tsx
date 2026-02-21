import React, { useState } from 'react';
import { logger } from '@/lib/logger';

import { Button } from "../../../components/ui/button";

import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "../../../components/ui/card";

import { Badge } from "../../../components/ui/badge";

import { Upload, Link, Check, AlertCircle, ArrowRight, RefreshCw, Save, FolderOpen , Search} from "lucide-react";

import { toast } from 'sonner';

import api from "../../../lib/api";

import * as XLSX from 'xlsx';

const MigrationHub = () => {
    const [selectedProvider, setSelectedProvider] = useState(null);
    const [mode, setMode] = useState('migrate'); // 'migrate' or 'link'
    const [file, setFile] = useState(null);
    const [step, setStep] = useState(1); // 1: Provider, 2: Mode/Input, 3: Preview, 4: Done
    const [previewData, setPreviewData] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [visibleCount, setVisibleCount] = useState(5); // Pagination state
    const [history, setHistory] = useState([]);
    const [viewMode, setViewMode] = useState('wizard'); // 'wizard' or 'history'
    const [activeTab, setActiveTab] = useState('new'); // 'new', 'update', 'conflict'
    const [isDragging, setIsDragging] = useState(false);
    const [showAllMappings, setShowAllMappings] = useState(false);

    // Import Template State
    const [importTemplates, setImportTemplates] = useState([]);
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [templateName, setTemplateName] = useState('');
    const [showSaveDialog, setShowSaveDialog] = useState(false);
    const [isSavingTemplate, setIsSavingTemplate] = useState(false);

    const fetchHistory = async () => {
        try {
            const res = await api.get('migrations/history');
            setHistory(Array.isArray(res.data) ? res.data : []);
        } catch (error) {
            logger.error(error);
        }
    };

    const fetchImportTemplates = async (source) => {
        try {
            const venueId = localStorage.getItem('venueId') || '';
            const res = await api.get(`import-templates?venue_id=${venueId}&source=${source}`);
            setImportTemplates(Array.isArray(res.data) ? res.data : []);
        } catch (error) {
            logger.error(error);
            setImportTemplates([]);
        }
    };

    const handleSaveTemplate = async () => {
        if (!templateName.trim()) {
            toast.error('Please enter a template name');
            return;
        }
        setIsSavingTemplate(true);
        try {
            const venueId = localStorage.getItem('venueId') || '';
            await api.post('import-templates', {
                venue_id: venueId,
                name: templateName.trim(),
                source: selectedProvider.id,
                target_type: previewData?.type || 'auto',
                column_mappings: previewData?.column_mapping || [],
                options: {},
            });
            toast.success(`Template "${templateName}" saved`);
            setShowSaveDialog(false);
            setTemplateName('');
            fetchImportTemplates(selectedProvider.id);
        } catch (error) {
            logger.error(error);
            toast.error('Failed to save template');
        } finally {
            setIsSavingTemplate(false);
        }
    };

    const handleLoadTemplate = (tpl) => {
        setSelectedTemplate(tpl);
        toast.info(`Template "${tpl.name}" loaded — mappings will be applied on next preview.`);
    };

    // Auto-fetch history on mount
    React.useEffect(() => {
        fetchHistory();
    }, []);

    // Fetch templates when provider changes
    React.useEffect(() => {
        if (selectedProvider) {
            fetchImportTemplates(selectedProvider.id);
        }
    }, [selectedProvider]);

    const providers = [
        { id: 'apicbase', name: 'Apicbase', type: 'Inventory & Recipes', color: 'bg-orange-600', icon: '🥘' },
        { id: 'lightspeed', name: 'Lightspeed K-Series', type: 'POS & Menu', color: 'bg-red-600', icon: '📟' },
        { id: 'shireburn', name: 'Shireburn HR', type: 'HR & Payroll', color: 'bg-blue-600', icon: '👥' },
    ];

    const handleFileUpload = (e) => {
        const selectedFile = e.target.files ? e.target.files[0] : e.dataTransfer.files[0];
        if (selectedFile) {
            setFile(selectedFile);
            toast.success(`File "${selectedFile.name}" selected`);
        }
    };

    const onDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const onDragLeave = () => {
        setIsDragging(false);
    };

    const onDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        handleFileUpload(e);
    };

    const readExcelFile = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = e.target.result;
                    const workbook = XLSX.read(data, { type: 'binary' });
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];
                    const json = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
                    resolve(json);
                } catch (err) {
                    reject(err);
                }
            };
            reader.onerror = (err) => reject(err);
            reader.readAsBinaryString(file);
        });
    };

    const handlePreview = async () => {
        if (!file && mode === 'migrate') {
            toast.error("Please select a file to upload");
            return;
        }

        setIsProcessing(true);

        try {
            let jsonData = [];

            // CLIENT-SIDE PARSING
            if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.name.endsWith('.csv')) {
                toast.info("Analyzing file locally...");
                // @ts-ignore
                jsonData = await readExcelFile(file);
            } else if (file.name.endsWith('.json')) {
                const text = await file.text();
                jsonData = JSON.parse(text);
            } else {
                toast.error("Unsupported file type");
                setIsProcessing(false);
                return;
            }

            // Call NEW endpoint
            const res = await api.post('migrations/preview-json', {
                source: selectedProvider.id,
                data: jsonData,
                filename: file.name
            }, { timeout: 60000 }); // 60s timeout for processing large JSON

            setPreviewData(res.data);
            setStep(3);
            setIsProcessing(false);

        } catch (error) {
            logger.error(error);
            toast.error(error.response?.data?.detail || "Failed to analyze file");
            setIsProcessing(false);
        }
    };

    const handleExecute = async () => {
        setIsProcessing(true);
        try {
            await api.post('migrations/execute', {
                source: selectedProvider.id,
                mode: mode,
                data: mode === 'migrate' ? previewData.details : null, // Send full data for migration
                options: {},
                filename: previewData.filename  // Pass filename for tracking
            }, { timeout: 120000 }); // 2 minute timeout for large migrations

            setStep(4);
            setIsProcessing(false);
            toast.success("Migration Completed Successfully!");
            fetchHistory(); // Refresh history
        } catch (error) {
            logger.error(error);
            toast.error("Migration failed");
            setIsProcessing(false);
        }
    };

    const reset = () => {
        setStep(1);
        setSelectedProvider(null);
        setFile(null);
        setPreviewData(null);
    };

    return (
        <div className="p-6 space-y-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">Quick Sync Wizard (Migration)</h1>
                    <p className="text-muted-foreground">Import data from legacy systems or link them for real-time updates.</p>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant={viewMode === 'wizard' ? 'default' : 'outline'}
                        onClick={() => setViewMode('wizard')}
                        className={viewMode === 'wizard' ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'border-border text-foreground hover:bg-accent hover:text-accent-foreground'}
                    >
                        New Sync
                    </Button>
                    <Button
                        variant={viewMode === 'history' ? 'default' : 'outline'}
                        onClick={() => { setViewMode('history'); fetchHistory(); }}
                        className={viewMode === 'history' ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'border-border text-foreground hover:bg-accent hover:text-accent-foreground'}
                    >
                        History
                    </Button>
                </div>
            </div>

            {viewMode === 'history' ? (
                <Card className="bg-card border-border">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Migration Logs</CardTitle>
                        <Button variant="outline" size="sm" onClick={() => setViewMode('wizard')}>
                            <ArrowRight className="w-4 h-4 mr-2 rotate-180" /> Back to Wizard
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-muted-foreground">
                                <thead className="text-xs uppercase bg-muted text-muted-foreground font-bold border-b border-border">
                                    <tr>
                                        <th className="px-4 py-3">Date</th>
                                        <th className="px-4 py-3">Filename</th>
                                        <th className="px-4 py-3">Source</th>
                                        <th className="px-4 py-3">Mode</th>
                                        <th className="px-4 py-3">Status</th>
                                        <th className="px-4 py-3">Summary</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {history.length === 0 ? (
                                        <tr>
                                            {/* @ts-ignore */}
                                            <td colSpan="6" className="px-4 py-8 text-center text-muted-foreground italic">{"No "}migration history found.</td>
                                        </tr>
                                    ) : (
                                        history.map((log) => (
                                            <tr key={log._id || log.id} className="hover:bg-muted/50 transition-colors">
                                                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                                                    {log.executed_at ? new Date(log.executed_at).toLocaleString() : (log.started_at ? new Date(log.started_at).toLocaleString() : '-')}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className="text-foreground text-xs font-mono truncate max-w-[180px] block" title={log.filename}>
                                                        {log.filename || '-'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <Badge variant="outline" className="capitalize bg-muted text-muted-foreground border-border">{log.source}</Badge>
                                                </td>
                                                <td className="px-4 py-3 capitalize">{log.mode}</td>
                                                <td className="px-4 py-3">
                                                    <Badge className={log.status === 'completed' ? 'bg-success' : 'bg-destructive'}>
                                                        {log.status}
                                                    </Badge>
                                                </td>
                                                <td className="px-4 py-3 text-muted-foreground">
                                                    {log.stats ? `${log.stats.new || 0} new, ${log.stats.updated || 0} updated` : (log.summary || 'No summary')}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <>
                    {step > 1 && (
                        <div className="flex justify-end mb-4">
                            <Button variant="outline" onClick={reset} size="sm" className="border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground">
                                Reset Wizard
                            </Button>
                        </div>
                    )}

                    {/* STEP 1: SELECT PROVIDER */}
                    {step === 1 && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {providers.map(p => (
                                <Card
                                    key={p.id}
                                    onClick={() => { setSelectedProvider(p); setStep(2); }}
                                    className="bg-card border-border hover:border-primary/50 cursor-pointer transition-all hover:scale-[1.02]"
                                >
                                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                                        <CardTitle className="text-xl font-bold text-foreground">{p.name}</CardTitle>
                                        <span className="text-4xl">{p.icon}</span>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-muted-foreground font-medium mb-4">{p.type}</div>
                                        <div className="flex gap-2">
                                            <Badge variant="outline" className="bg-muted text-muted-foreground border-border">
                                                CSV Import
                                            </Badge>
                                            <Badge variant="outline" className="bg-muted text-muted-foreground border-border">
                                                API Link
                                            </Badge>
                                        </div>
                                    </CardContent>
                                    <CardFooter>
                                        <Button className={`w-full ${p.color}`}>Select {p.name}</Button>
                                    </CardFooter>
                                </Card>
                            ))}
                        </div>
                    )}

                    {/* STEP 2: CONFIGURE */}
                    {step === 2 && selectedProvider && (
                        <Card className="bg-card border-border max-w-2xl mx-auto">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-3">
                                    <span className="text-2xl">{selectedProvider.icon}</span>
                                    Setup {selectedProvider.name}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {/* Mode Selection */}
                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        onClick={() => setMode('migrate')}
                                        className={`p-4 rounded-xl border-2 text-left transition-all ${mode === 'migrate' ? 'border-primary bg-primary/10' : 'border-border hover:border-muted-foreground/50'}`}
                                    >
                                        <div className="font-bold text-foreground flex items-center gap-2">
                                            <Upload className="w-5 h-5" /> Migrate Data
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-1">One-time import. You own and edit the data in Restin.</p>
                                    </button>
                                    <button
                                        onClick={() => setMode('link')}
                                        className={`p-4 rounded-xl border-2 text-left transition-all ${mode === 'link' ? 'border-primary bg-primary/10' : 'border-border hover:border-muted-foreground/50'}`}
                                    >
                                        <div className="font-bold text-foreground flex items-center gap-2">
                                            <Link className="w-5 h-5" /> API Link (Hybrid)
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-1">Read-only in Restin. Syncs daily from {selectedProvider.name}.</p>
                                    </button>
                                </div>

                                {/* File Upload for Migrate Mode */}
                                {mode === 'migrate' && (
                                    <div
                                        onDragOver={onDragOver}
                                        onDragLeave={onDragLeave}
                                        onDrop={onDrop}
                                        className={`relative border-2 border-dashed rounded-xl p-10 text-center transition-all duration-200 group ${isDragging
                                            ? 'border-primary bg-primary/10 scale-[1.01]'
                                            : file
                                                ? 'border-green-500/50 bg-green-500/5'
                                                : 'border-border bg-muted/50 hover:border-muted-foreground hover:bg-muted'
                                            }`}
                                    >
                                        <div className="flex flex-col items-center gap-4">
                                            <div className={`p-4 rounded-full transition-transform duration-300 ${isDragging ? 'scale-110 bg-primary/20 text-primary' : file ? 'bg-green-500/20 text-green-500' : 'bg-muted text-muted-foreground'}`}>
                                                {file ? <Check className="w-8 h-8" /> : <Upload className="w-8 h-8" />}
                                            </div>

                                            <div>
                                                <h3 className="text-xl font-bold text-foreground mb-1">
                                                    {file ? file.name : 'Drop export file here'}
                                                </h3>
                                                <p className="text-muted-foreground text-sm max-w-[280px] mx-auto leading-relaxed">
                                                    {file
                                                        ? `${(file.size / 1024).toFixed(1)} KB ready for analysis.`
                                                        : `Drag & drop or Click to upload CSV, Excel (XLSX), or JSON from ${selectedProvider.name}`}
                                                </p>
                                            </div>

                                            <input aria-label="Input"
                                                type="file"
                                                id="migration-upload"
                                                accept=".csv,.json,.xlsx,.xls"
                                                onChange={handleFileUpload}
                                                className="absolute inset-0 opacity-0 cursor-pointer"
                                            />

                                            {!file && (
                                                <div className="flex gap-2 mt-2">
                                                    <Badge variant="outline" className="bg-muted/50 text-[10px] text-muted-foreground border-border">CSV</Badge>
                                                    <Badge variant="outline" className="bg-muted/50 text-[10px] text-muted-foreground border-border">XLSX</Badge>
                                                    <Badge variant="outline" className="bg-muted/50 text-[10px] text-muted-foreground border-border">JSON</Badge>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Load Template Dropdown */}
                                {mode === 'migrate' && importTemplates.length > 0 && (
                                    <div className="space-y-2">
                                        <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                                            <FolderOpen className="w-3.5 h-3.5" /> Load Saved Template
                                        </label>
                                        <div className="flex gap-2">
                                            <select
                                                aria-label="Select template"
                                                value={selectedTemplate?.id || ''}
                                                onChange={(e) => {
                                                    const tpl = importTemplates.find(t => t.id === e.target.value);
                                                    if (tpl) handleLoadTemplate(tpl);
                                                    else setSelectedTemplate(null);
                                                }}
                                                className="flex-1 bg-input border border-border rounded-lg p-2 text-sm text-foreground focus:ring-2 focus:ring-primary outline-none"
                                            >
                                                <option value="">— None (auto-detect) —</option>
                                                {importTemplates.map(tpl => (
                                                    <option key={tpl.id} value={tpl.id}>
                                                        {tpl.name} ({tpl.target_type}) — used {tpl.use_count}x
                                                    </option>
                                                ))}
                                            </select>
                                            {selectedTemplate && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => setSelectedTemplate(null)}
                                                    className="text-xs text-muted-foreground"
                                                >
                                                    Clear
                                                </Button>
                                            )}
                                        </div>
                                        {selectedTemplate && (
                                            <p className="text-[10px] text-green-400 flex items-center gap-1">
                                                <Check className="w-3 h-3" /> Template loaded — {selectedTemplate.column_mappings?.length || 0} mappings will be applied.
                                            </p>
                                        )}
                                    </div>
                                )}

                                {/* API Key for Link Mode */}
                                {mode === 'link' && (
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-muted-foreground">API Key / Token</label>
                                        <input aria-label="Enter API Key" type="password" placeholder="Enter API Key" className="w-full bg-input border-border rounded-lg p-3 text-foreground focus:ring-2 focus:ring-primary outline-none" />
                                    </div>
                                )}
                            </CardContent>
                            <CardFooter className="flex justify-end gap-3">
                                <Button variant="ghost" onClick={() => setStep(1)}>Back</Button>
                                <Button onClick={handlePreview} disabled={isProcessing}>
                                    {isProcessing ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <ArrowRight className="w-4 h-4 mr-2" />}
                                    Analyze & Preview
                                </Button>
                            </CardFooter>
                        </Card>
                    )}

                    {/* STEP 3: PREVIEW */}
                    {step === 3 && previewData && (
                        <Card className="bg-card border-border max-w-3xl mx-auto">
                            <CardHeader>
                                <CardTitle>Migration Preview</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                                    {previewData.error ? (
                                        <div className="col-span-3 p-6 bg-red-950/20 rounded-2xl border border-red-900/50 text-left">
                                            <div className="flex items-start gap-4">
                                                <div className="p-3 bg-red-500 rounded-xl text-foreground">
                                                    <AlertCircle className="w-6 h-6" />
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-red-600 dark:text-red-400 text-lg mb-1">Column Mapping Error</h3>
                                                    <p className="text-secondary-foreground text-sm font-mono break-all">{previewData.error}</p>
                                                    <p className="text-muted-foreground text-xs mt-3 bg-background p-2 rounded border border-red-900/20">
                                                        Tip: Ensure your file has a 'Name', 'Item Name', or 'Description' column.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            {/* New Items Widget */}
                                            <div
                                                onClick={() => setActiveTab('new')}
                                                className={`relative p-6 rounded-2xl border transition-all duration-300 cursor-pointer group overflow-hidden ${activeTab === 'new' ? 'bg-success/10 border-success/50 shadow-[0_0_30px_rgba(34,197,94,0.1)]' : 'bg-card border-border hover:border-border/80 hover:bg-accent/50'}`}
                                            >
                                                <div className="flex justify-between items-start mb-4">
                                                    <div className={`p-3 rounded-xl ${activeTab === 'new' ? 'bg-success text-success-foreground' : 'bg-muted text-muted-foreground group-hover:bg-accent'}`}>
                                                        <div className="text-xl">📦</div>
                                                    </div>
                                                    {activeTab === 'new' && <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />}
                                                </div>
                                                <div className="space-y-1">
                                                    <div className={`text-4xl font-black tracking-tight ${activeTab === 'new' ? 'text-foreground' : 'text-muted-foreground'}`}>
                                                        {previewData.new}
                                                    </div>
                                                    <div className={`text-sm font-bold uppercase tracking-wider ${activeTab === 'new' ? 'text-success' : 'text-muted-foreground'}`}>
                                                        New Items
                                                    </div>
                                                </div>
                                                {activeTab === 'new' && (
                                                    <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-green-500 to-transparent opacity-50" />
                                                )}
                                            </div>

                                            {/* Updates Widget */}
                                            <div
                                                onClick={() => setActiveTab('update')}
                                                className={`relative p-6 rounded-2xl border transition-all duration-300 cursor-pointer group overflow-hidden ${activeTab === 'update' ? 'bg-warning/10 border-warning/50 shadow-[0_0_30px_rgba(245,158,11,0.1)]' : 'bg-card border-border hover:border-border/80 hover:bg-accent/50'}`}
                                            >
                                                <div className="flex justify-between items-start mb-4">
                                                    <div className={`p-3 rounded-xl ${activeTab === 'update' ? 'bg-warning text-warning-foreground' : 'bg-muted text-muted-foreground group-hover:bg-accent'}`}>
                                                        <div className="text-xl">🔄</div>
                                                    </div>
                                                    {activeTab === 'update' && <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />}
                                                </div>
                                                <div className="space-y-1">
                                                    <div className={`text-4xl font-black tracking-tight ${activeTab === 'update' ? 'text-foreground' : 'text-muted-foreground'}`}>
                                                        {previewData.update}
                                                    </div>
                                                    <div className={`text-sm font-bold uppercase tracking-wider ${activeTab === 'update' ? 'text-warning' : 'text-muted-foreground'}`}>
                                                        Updates
                                                    </div>
                                                </div>
                                                {activeTab === 'update' && (
                                                    <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent opacity-50" />
                                                )}
                                            </div>

                                            {/* Conflicts Widget */}
                                            <div
                                                onClick={() => setActiveTab('conflict')}
                                                className={`relative p-6 rounded-2xl border transition-all duration-300 cursor-pointer group overflow-hidden ${activeTab === 'conflict' ? 'bg-destructive/10 border-destructive/50 shadow-[0_0_30px_rgba(239,68,68,0.1)]' : 'bg-card border-border hover:border-border/80 hover:bg-accent/50'}`}
                                            >
                                                <div className="flex justify-between items-start mb-4">
                                                    <div className={`p-3 rounded-xl ${activeTab === 'conflict' ? 'bg-destructive text-destructive-foreground' : 'bg-muted text-muted-foreground group-hover:bg-accent'}`}>
                                                        <div className="text-xl">⚠️</div>
                                                    </div>
                                                    {activeTab === 'conflict' && <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />}
                                                </div>
                                                <div className="space-y-1">
                                                    <div className={`text-4xl font-black tracking-tight ${activeTab === 'conflict' ? 'text-foreground' : 'text-muted-foreground'}`}>
                                                        {previewData.conflict}
                                                    </div>
                                                    <div className={`text-sm font-bold uppercase tracking-wider ${activeTab === 'conflict' ? 'text-destructive' : 'text-muted-foreground'}`}>
                                                        Conflicts
                                                    </div>
                                                </div>
                                                {activeTab === 'conflict' && (
                                                    <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent opacity-50" />
                                                )}
                                            </div>

                                            {/* Restore from Archive Widget */}
                                            <div
                                                onClick={() => setActiveTab('restore_archive')}
                                                className={`relative p-6 rounded-2xl border transition-all duration-300 cursor-pointer group overflow-hidden ${activeTab === 'restore_archive' ? 'bg-purple-950/30 border-purple-500/50 shadow-[0_0_30px_rgba(168,85,247,0.1)]' : 'bg-card/50 border-border hover:border-border hover:bg-card'}`}
                                            >
                                                <div className="flex justify-between items-start mb-4">
                                                    <div className={`p-3 rounded-xl ${activeTab === 'restore_archive' ? 'bg-purple-500 text-foreground' : 'bg-secondary text-muted-foreground group-hover:bg-secondary/80'}`}>
                                                        <div className="text-xl">📦</div>
                                                    </div>
                                                    {activeTab === 'restore_archive' && <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />}
                                                </div>
                                                <div className="space-y-1">
                                                    <div className={`text-4xl font-black tracking-tight ${activeTab === 'restore_archive' ? 'text-foreground' : 'text-secondary-foreground'}`}>
                                                        {previewData.restore_from_archive || 0}
                                                    </div>
                                                    <div className={`text-sm font-bold uppercase tracking-wider ${activeTab === 'restore_archive' ? 'text-purple-400' : 'text-muted-foreground'}`}>
                                                        From Archive
                                                    </div>
                                                </div>
                                                {activeTab === 'restore_archive' && (
                                                    <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-purple-500 to-transparent opacity-50" />
                                                )}
                                            </div>

                                            {/* Restore from Trash Widget */}
                                            <div
                                                onClick={() => setActiveTab('restore_trash')}
                                                className={`relative p-6 rounded-2xl border transition-all duration-300 cursor-pointer group overflow-hidden ${activeTab === 'restore_trash' ? 'bg-rose-950/30 border-rose-500/50 shadow-[0_0_30px_rgba(244,63,94,0.1)]' : 'bg-card/50 border-border hover:border-border hover:bg-card'}`}
                                            >
                                                <div className="flex justify-between items-start mb-4">
                                                    <div className={`p-3 rounded-xl ${activeTab === 'restore_trash' ? 'bg-rose-500 text-foreground' : 'bg-secondary text-muted-foreground group-hover:bg-secondary/80'}`}>
                                                        <div className="text-xl">🗑️</div>
                                                    </div>
                                                    {activeTab === 'restore_trash' && <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />}
                                                </div>
                                                <div className="space-y-1">
                                                    <div className={`text-4xl font-black tracking-tight ${activeTab === 'restore_trash' ? 'text-foreground' : 'text-secondary-foreground'}`}>
                                                        {previewData.restore_from_trash || 0}
                                                    </div>
                                                    <div className={`text-sm font-bold uppercase tracking-wider ${activeTab === 'restore_trash' ? 'text-rose-400' : 'text-muted-foreground'}`}>
                                                        From Trash
                                                    </div>
                                                </div>
                                                {activeTab === 'restore_trash' && (
                                                    <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-rose-500 to-transparent opacity-50" />
                                                )}
                                            </div>

                                            {/* Unchanged Widget */}
                                            <div
                                                onClick={() => setActiveTab('unchanged')}
                                                className={`relative p-6 rounded-2xl border transition-all duration-300 cursor-pointer group overflow-hidden ${activeTab === 'unchanged' ? 'bg-muted/30 border-muted/50 shadow-[0_0_30px_rgba(20,184,166,0.1)]' : 'bg-card border-border hover:border-border/80 hover:bg-accent/50'}`}
                                            >
                                                <div className="flex justify-between items-start mb-4">
                                                    <div className={`p-3 rounded-xl ${activeTab === 'unchanged' ? 'bg-muted text-foreground' : 'bg-muted text-muted-foreground group-hover:bg-accent'}`}>
                                                        <div className="text-xl">✓</div>
                                                    </div>
                                                    {activeTab === 'unchanged' && <div className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />}
                                                </div>
                                                <div className="space-y-1">
                                                    <div className={`text-4xl font-black tracking-tight ${activeTab === 'unchanged' ? 'text-foreground' : 'text-muted-foreground'}`}>
                                                        {previewData.unchanged || 0}
                                                    </div>
                                                    <div className={`text-sm font-bold uppercase tracking-wider ${activeTab === 'unchanged' ? 'text-muted-foreground' : 'text-muted-foreground'}`}>
                                                        Unchanged
                                                    </div>
                                                </div>
                                                {activeTab === 'unchanged' && (
                                                    <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-teal-500 to-transparent opacity-50" />
                                                )}
                                            </div>
                                        </>
                                    )}
                                </div>

                                {/* Smart Column Mapping Section */}
                                {previewData.meta?.mappings && previewData.meta.mappings.length > 0 && (() => {
                                    // Using component-level state: showAllMappings, setShowAllMappings
                                    const mappings = previewData.meta.mappings;

                                    // Mappings are already sorted by backend: mapped first, then non-empty, then empty
                                    const visibleMappings = showAllMappings ? mappings : mappings.slice(0, 10);
                                    const hiddenCount = mappings.length - 10;

                                    return (
                                        <div className="mt-4 p-4 bg-muted/30 rounded-xl border border-border">
                                            <div className="flex items-center justify-between mb-3">
                                                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                                    <span className="text-blue-500">🔗</span> Smart Column Mapping
                                                </h3>
                                                <div className="flex items-center gap-2">
                                                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px]">
                                                        {mappings.filter(m => m.is_mapped || m.confidence === 'high').length} mapped
                                                    </Badge>
                                                    <Badge variant="outline" className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 text-[10px]">
                                                        {previewData.meta.detected_type || 'Auto-Detected'}
                                                    </Badge>
                                                </div>
                                            </div>
                                            {/* Smart Filter & Expand */}
                                            <div className="flex items-center gap-4 mb-4">
                                                <div className="relative flex-1">
                                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                                    <input aria-label="Input"
                                                        type="text"
                                                        placeholder="Filter mappings..."
                                                        className="w-full bg-background border border-input rounded-lg pl-9 pr-4 py-2 text-sm focus:ring-1 focus:ring-primary outline-none"
                                                        onChange={(e) => {
                                                            const term = e.target.value.toLowerCase();
                                                            // Filter logic would go here if we had state for it
                                                        }}
                                                    />
                                                </div>
                                                <div className="flex bg-muted rounded-lg p-1">
                                                    <button
                                                        onClick={() => setShowAllMappings(false)}
                                                        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${!showAllMappings ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                                                    >
                                                        Compact
                                                    </button>
                                                    <button
                                                        onClick={() => setShowAllMappings(true)}
                                                        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${showAllMappings ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                                                    >
                                                        Expanded
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
                                                <table className="w-full text-xs">
                                                    <thead className="sticky top-0 bg-card">
                                                        <tr className="text-muted-foreground text-left border-b border-border">
                                                            <th className="pb-2 pr-4 font-medium">Excel Column</th>
                                                            <th className="pb-2 px-2 font-medium text-center">→</th>
                                                            <th className="pb-2 px-4 font-medium">Recipe Field</th>
                                                            <th className="pb-2 pl-4 font-medium">Sample Data</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {visibleMappings.map((mapping, idx) => {
                                                            // Handle both old string format and new object format
                                                            let originalCol, targetField, sampleData, confidence;

                                                            if (typeof mapping === 'string') {
                                                                // Old format: "Mapped 'X' -> 'Y'"
                                                                const parts = mapping.match(/Mapped '(.+?)' -> '(.+?)'/);
                                                                originalCol = parts ? parts[1] : mapping;
                                                                targetField = parts ? parts[2] : "-";
                                                                sampleData = previewData.details?.[0]?.raw_import_data?.[originalCol] || "-";
                                                                confidence = 'high';
                                                            } else {
                                                                // New object format
                                                                originalCol = mapping.excel_column || '';
                                                                targetField = mapping.restin_field || '-';
                                                                sampleData = mapping.sample_value || '-';
                                                                confidence = mapping.confidence || 'unmapped';
                                                            }

                                                            // Skip empty unnamed columns
                                                            if (mapping.is_empty) return null;

                                                            const isHighConfidence = confidence === 'high' || mapping.is_mapped;

                                                            return (
                                                                <tr key={idx} className="border-t border-border/50 hover:bg-white/5 transition-colors">
                                                                    <td className="py-2 pr-4 text-muted-foreground font-mono truncate max-w-[180px]" title={originalCol}>
                                                                        {originalCol.length > 30 ? originalCol.substring(0, 27) + "..." : originalCol}
                                                                    </td>
                                                                    <td className={`py-2 px-2 text-center font-bold ${isHighConfidence ? 'text-green-500' : 'text-muted-foreground'}`}>→</td>
                                                                    <td className="py-2 px-4">
                                                                        <span className={`px-2 py-0.5 rounded font-medium ${isHighConfidence
                                                                            ? 'bg-emerald-950/50 text-emerald-400'
                                                                            : 'bg-muted text-muted-foreground'
                                                                            }`}>
                                                                            {targetField}
                                                                        </span>
                                                                    </td>
                                                                    <td className="py-2 pl-4 text-muted-foreground font-mono text-[10px] truncate max-w-[150px]" title={String(sampleData)}>
                                                                        {String(sampleData).length > 25 ? String(sampleData).substring(0, 22) + "..." : sampleData}
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>

                                            {/* Load More Button */}
                                            {hiddenCount > 0 && !showAllMappings && (
                                                <button
                                                    onClick={() => setShowAllMappings(true)}
                                                    className="mt-3 w-full py-2 text-xs text-blue-400 hover:text-blue-300 bg-blue-950/20 hover:bg-blue-950/40 rounded-lg border border-blue-800/30 transition-colors"
                                                >
                                                    Show {hiddenCount} more columns...
                                                </button>
                                            )}
                                            {showAllMappings && hiddenCount > 0 && (
                                                <button
                                                    onClick={() => setShowAllMappings(false)}
                                                    className="mt-3 w-full py-2 text-xs text-muted-foreground hover:text-foreground bg-muted hover:bg-accent rounded-lg border border-border transition-colors"
                                                >
                                                    Show less
                                                </button>
                                            )}

                                            <div className="mt-3 pt-3 border-t border-border/30 flex items-center gap-2">
                                                <span className="text-[10px] text-blue-400 bg-blue-950/30 px-2 py-1 rounded-full">
                                                    ● Smart Mapping active: Restin is auto-linking items by Name and SKU.
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })()}

                                {/* Detailed View Area */}
                                <div className="min-h-[400px] bg-card/30 rounded-2xl border border-border overflow-hidden flex flex-col">
                                    {!previewData.error && (
                                        <>
                                            {/* Header for Detail View */}
                                            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card/50">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-2 h-2 rounded-full ${activeTab === 'new' ? 'bg-green-500' : activeTab === 'update' ? 'bg-amber-500' : activeTab === 'unchanged' ? 'bg-teal-500' : 'bg-red-500'}`} />
                                                    <h3 className="font-bold text-foreground uppercase tracking-wider text-xs">
                                                        {activeTab === 'new' ? 'Incoming Items' : activeTab === 'update' ? 'Updates Logic' : activeTab === 'unchanged' ? 'Synced Items' : 'Conflict Resolution'}
                                                    </h3>
                                                </div>
                                                <div className="text-[10px] text-muted-foreground font-mono uppercase">
                                                    {activeTab === 'new' ? `${previewData.new} Items` : activeTab === 'update' ? `${previewData.update} Items` : activeTab === 'unchanged' ? `${previewData.unchanged} Items` : `${previewData.conflict} Issues`}
                                                </div>
                                            </div>

                                            {/* Content */}
                                            <div className="flex-1 overflow-y-auto max-h-[500px]">
                                                {/* NEW ITEMS VIEW */}
                                                {activeTab === 'new' && (
                                                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                                                        <div className="p-2 divide-y divide-white/5">
                                                            {previewData.new === 0 ? (
                                                                <div className="py-20 text-center text-muted-foreground italic">{"No "}new items found.</div>
                                                            ) : (
                                                                previewData.details.filter(d => d.type === 'new' || d.type === 'new_recipe' || d.type === 'new_employee').slice(0, visibleCount).map((d, i) => (
                                                                    <div key={i} className="flex items-center justify-between p-4 hover:bg-white/5 transition-colors group">
                                                                        <div className="flex items-center gap-4">
                                                                            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground text-xs font-mono group-hover:bg-accent group-hover:text-foreground transition-colors">
                                                                                {(i + 1).toString().padStart(2, '0')}
                                                                            </div>
                                                                            <div className="flex-1">
                                                                                <div className="font-semibold text-foreground group-hover:text-foreground transition-colors">{d.name}</div>
                                                                                <div className="text-xs text-muted-foreground flex items-center gap-3 mt-0.5">
                                                                                    <span className="font-mono bg-emerald-950 text-emerald-400 px-1.5 py-0.5 rounded text-[10px] font-bold">
                                                                                        {d.item_id || `CB/${String(i + 1).padStart(3, '0')}`}
                                                                                    </span>
                                                                                    {d.sku && d.sku !== 'N/A' && <span className="font-mono bg-background px-1.5 py-0.5 rounded border border-border text-[10px]">{d.sku}</span>}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                        <Badge variant="outline" className="opacity-0 group-hover:opacity-100 transition-opacity bg-muted border-border text-success text-[10px] h-5">READY</Badge>
                                                                    </div>
                                                                ))
                                                            )}

                                                            {visibleCount < previewData.new && (
                                                                <div className="p-6 flex justify-center border-t border-border">
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        onClick={() => setVisibleCount(prev => prev + 20)}
                                                                        className="text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                                                                    >
                                                                        Load 20 more entries...
                                                                    </Button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* UPDATES VIEW - Show list with changed fields */}
                                                {activeTab === 'update' && (
                                                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                                                        {previewData.update === 0 ? (
                                                            <div className="py-24 text-center">
                                                                <div className="text-4xl mb-4 opacity-20">✨</div>
                                                                <div className="text-muted-foreground italic">{"No "}updates needed - all items are new.</div>
                                                            </div>
                                                        ) : (
                                                            <div className="p-4 space-y-3 max-h-[400px] overflow-y-auto">
                                                                {previewData.details.filter(d => d.type === 'update').slice(0, visibleCount).map((d, i) => (
                                                                    <div key={i} className="flex flex-col p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl gap-3">
                                                                        <div className="flex items-center gap-4">
                                                                            <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center text-sm font-bold text-amber-400">
                                                                                {String(i + 1).padStart(2, '0')}
                                                                            </div>
                                                                            <div className="flex-1">
                                                                                <div className="text-base text-foreground font-bold">{d.name}</div>
                                                                                <div className="flex items-center gap-3 text-xs mt-1">
                                                                                    <Badge className="bg-card border-border font-mono">{d.item_id || d.sku}</Badge>
                                                                                    <span className="text-amber-500">{d.info}</span>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                        {/* Changed Fields Diff */}
                                                                        {d.changed_fields && d.changed_fields.length > 0 && (
                                                                            <div className="ml-14 space-y-2 border-l-2 border-amber-500/30 pl-4">
                                                                                {d.changed_fields.map((cf, cfIdx) => (
                                                                                    <div key={cfIdx} className="flex items-center gap-3 text-sm">
                                                                                        <span className="text-muted-foreground uppercase text-[10px] font-bold min-w-20">{cf.field}</span>
                                                                                        <span className="text-red-400 line-through font-mono text-xs">{cf.old}</span>
                                                                                        <span className="text-muted-foreground">→</span>
                                                                                        <span className="text-green-400 font-mono text-xs font-bold">{cf.new}</span>
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {/* CONFLICTS VIEW */}
                                                {activeTab === 'conflict' && (
                                                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                                                        {previewData.conflict === 0 ? (
                                                            <div className="py-24 text-center">
                                                                <div className="text-4xl mb-4 opacity-20">✨</div>
                                                                <div className="text-muted-foreground italic">{"No "}structure or data conflicts found.</div>
                                                            </div>
                                                        ) : (
                                                            <div className="p-4 space-y-3">
                                                                {previewData.details.filter(d => d.type === 'conflict').map((d, i) => (
                                                                    <div key={i} className="flex flex-col p-5 bg-red-500/5 border border-red-500/20 rounded-2xl gap-4">
                                                                        <div className="flex items-start gap-4">
                                                                            <div className="p-2 bg-red-500/20 rounded-lg">
                                                                                <AlertCircle className="w-5 h-5 text-red-500" />
                                                                            </div>
                                                                            <div className="flex-1">
                                                                                <div className="text-base text-foreground font-bold">{d.message}</div>
                                                                                <div className="flex items-center gap-6 mt-3">
                                                                                    <div className="flex flex-col">
                                                                                        <span className="text-[10px] text-muted-foreground uppercase font-black mb-1">Current State</span>
                                                                                        <span className="font-mono text-muted-foreground text-sm italic">€{d.oldPrice}</span>
                                                                                    </div>
                                                                                    <div className="h-6 w-px bg-secondary" />
                                                                                    <div className="flex flex-col">
                                                                                        <span className="text-[10px] text-amber-600 dark:text-amber-400 uppercase font-black mb-1">Incoming Change</span>
                                                                                        <span className="font-mono text-amber-400 text-sm font-bold">€{d.newPrice}</span>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                        <div className="flex items-center gap-2 pt-2 border-t border-border">
                                                                            <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-foreground flex-1 h-9">Ignore Change</Button>
                                                                            <Button size="sm" className="bg-red-600 hover:bg-red-700 text-foreground shadow-lg shadow-red-900/40 flex-1 h-9 font-bold">Overwrite Local Data</Button>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {/* UNCHANGED VIEW */}
                                                {activeTab === 'unchanged' && (
                                                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                                                        {previewData.unchanged === 0 ? (
                                                            <div className="py-24 text-center">
                                                                <div className="text-4xl mb-4 opacity-20">🔄</div>
                                                                <div className="text-muted-foreground italic">All items have changes - nothing is unchanged.</div>
                                                            </div>
                                                        ) : (
                                                            <div className="p-2 divide-y divide-white/5">
                                                                {previewData.details?.filter(d => d.type === 'unchanged').slice(0, visibleCount).map((d, i) => (
                                                                    <div key={i} className="flex items-center justify-between p-4 hover:bg-white/5 transition-colors group">
                                                                        <div className="flex items-center gap-4">
                                                                            <div className="w-8 h-8 rounded-lg bg-teal-900/50 flex items-center justify-center text-teal-400 text-xs font-mono group-hover:bg-teal-800 group-hover:text-foreground transition-colors">
                                                                                <Check className="w-4 h-4" />
                                                                            </div>
                                                                            <div className="flex-1">
                                                                                <div className="font-semibold text-foreground group-hover:text-foreground transition-colors">{d.name}</div>
                                                                                <div className="text-xs text-muted-foreground flex items-center gap-3 mt-0.5">
                                                                                    <span className="font-mono bg-teal-950 text-teal-400 px-1.5 py-0.5 rounded text-[10px] font-bold">
                                                                                        {d.item_id || `CB/${String(i + 1).padStart(3, '0')}`}
                                                                                    </span>
                                                                                    {d.sku && d.sku !== 'N/A' && <span className="font-mono bg-background px-1.5 py-0.5 rounded border border-border text-[10px]">{d.sku}</span>}
                                                                                    {d.category && <span className="text-muted-foreground">{d.category}</span>}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                        <Badge variant="outline" className="opacity-60 group-hover:opacity-100 transition-opacity bg-teal-950/50 border-teal-800 text-teal-400 text-[10px] h-5">SYNCED</Badge>
                                                                    </div>
                                                                ))}

                                                                {visibleCount < previewData.unchanged && (
                                                                    <div className="p-6 flex justify-center border-t border-border">
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="sm"
                                                                            onClick={() => setVisibleCount(prev => prev + 20)}
                                                                            className="text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                                                                        >
                                                                            Load 20 more entries...
                                                                        </Button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </>
                                    )}
                                </div> {/* End of min-h-[400px] detailed view area */}

                                <div className="text-xs text-muted-foreground flex items-center gap-2 px-2 mt-4">
                                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                                    Smart Mapping active: Restin is auto-linking items by Name and SKU.
                                </div>
                            </CardContent>
                            <CardFooter className="flex justify-between bg-background/30 p-6">
                                <div className="flex items-center gap-3">
                                    <div className="text-xs text-muted-foreground font-mono">Analysis ID: {Math.random().toString(36).substring(7).toUpperCase()}</div>
                                    {/* Save as Template */}
                                    {!showSaveDialog ? (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setShowSaveDialog(true)}
                                            className="text-xs border-border"
                                        >
                                            <Save className="w-3.5 h-3.5 mr-1.5" /> Save as Template
                                        </Button>
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            <input
                                                aria-label="Template name"
                                                type="text"
                                                value={templateName}
                                                onChange={(e) => setTemplateName(e.target.value)}
                                                placeholder="Template name..."
                                                className="bg-input border border-border rounded px-2 py-1 text-xs text-foreground w-40 focus:ring-1 focus:ring-primary outline-none"
                                                onKeyDown={(e) => e.key === 'Enter' && handleSaveTemplate()}
                                                autoFocus
                                            />
                                            <Button
                                                size="sm"
                                                onClick={handleSaveTemplate}
                                                disabled={isSavingTemplate}
                                                className="text-xs bg-blue-600 hover:bg-blue-700"
                                            >
                                                {isSavingTemplate ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'Save'}
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => { setShowSaveDialog(false); setTemplateName(''); }}
                                                className="text-xs"
                                            >
                                                Cancel
                                            </Button>
                                        </div>
                                    )}
                                </div>
                                <div className="flex gap-3">
                                    <Button variant="ghost" onClick={() => setStep(2)}>Back</Button>
                                    <Button onClick={handleExecute} disabled={isProcessing} className="bg-green-600 hover:bg-green-700 min-w-40">
                                        {isProcessing ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
                                        Confirm & Execute
                                    </Button>
                                </div>
                            </CardFooter>
                        </Card>
                    )}

                    {/* STEP 4: SUCCESS */}
                    {step === 4 && (
                        <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in zoom-in duration-300">
                            <div className="w-24 h-24 bg-green-500/10 rounded-full flex items-center justify-center mb-6 ring-1 ring-green-500/20 shadow-[0_0_40px_rgba(34,197,94,0.2)]">
                                <Check className="w-12 h-12 text-green-500" />
                            </div>
                            <h2 className="text-4xl font-black text-foreground mb-2 tracking-tight">Sync Complete!</h2>
                            <p className="text-muted-foreground max-w-lg mx-auto mb-4 text-lg">
                                Successfully processed <strong className="text-foreground">{previewData?.new + previewData?.update} {previewData?.type === 'recipes' ? 'recipes' : 'items'}</strong> from {selectedProvider?.name}.
                            </p>

                            {/* Target Section Badge */}
                            <div className="flex items-center justify-center gap-2 mb-8">
                                <span className="text-muted-foreground">Added to:</span>
                                <Badge className={`text-sm px-3 py-1 ${previewData?.type === 'recipes' ? 'bg-orange-600 text-foreground' : 'bg-blue-600 text-foreground'}`}>
                                    {previewData?.type === 'recipes' ? '🍳 Recipe Engineering' : '📦 Inventory Management'}
                                </Badge>
                                {previewData?.new > 0 && (
                                    <Badge variant="outline" className="text-green-400 border-green-500/50">{previewData?.new} New</Badge>
                                )}
                                {previewData?.update > 0 && (
                                    <Badge variant="outline" className="text-amber-400 border-amber-500/50">{previewData?.update} Updated</Badge>
                                )}
                            </div>

                            <div className="flex gap-4">
                                <Button onClick={reset} variant="outline" className="h-12 px-6">
                                    Start Another Sync
                                </Button>

                                {/* Dynamic Navigation Based on Data Type */}
                                {previewData?.type === 'recipes' ? (
                                    <Button className="h-12 px-8 bg-orange-600 hover:bg-orange-700 text-lg font-bold shadow-lg shadow-orange-900/20" onClick={() => window.location.href = '/manager/inventory-recipes'}>
                                        Go to Recipe Engineering <ArrowRight className="w-5 h-5 ml-2" />
                                    </Button>
                                ) : selectedProvider?.id === 'apicbase' && (
                                    <Button className="h-12 px-8 bg-blue-600 hover:bg-blue-700 text-lg font-bold shadow-lg shadow-blue-900/20" onClick={() => window.location.href = '/manager/inventory'}>
                                        Go to Inventory Hub <ArrowRight className="w-5 h-5 ml-2" />
                                    </Button>
                                )}
                                {selectedProvider?.id === 'lightspeed' && (
                                    <Button className="h-12 px-8 bg-red-600 hover:bg-red-700 text-lg font-bold shadow-lg shadow-red-900/40" onClick={() => window.location.href = '/manager/products'}>
                                        View Products <ArrowRight className="w-5 h-5 ml-2" />
                                    </Button>
                                )}
                                {selectedProvider?.id === 'shireburn' && (
                                    <Button className="h-12 px-8 bg-indigo-600 hover:bg-indigo-700 text-lg font-bold shadow-lg shadow-indigo-900/20" onClick={() => window.location.href = '/manager/hr/people'}>
                                        Open Employee Directory <ArrowRight className="w-5 h-5 ml-2" />
                                    </Button>
                                )}
                            </div>
                        </div>
                    )}
                </>
            )
            }
        </div >
    );
};

export default MigrationHub;