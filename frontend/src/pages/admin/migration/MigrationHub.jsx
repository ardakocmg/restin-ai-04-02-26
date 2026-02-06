import React, { useState } from 'react';
import { Button } from "../../../components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "../../../components/ui/card";
import { Badge } from "../../../components/ui/badge";
import { Upload, Link, Check, AlertCircle, ArrowRight, RefreshCw } from "lucide-react";
import { toast } from 'sonner';
import api from "../../../lib/api";

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

    const fetchHistory = async () => {
        try {
            const res = await api.get('migrations/history');
            setHistory(Array.isArray(res.data) ? res.data : []);
        } catch (error) {
            console.error(error);
        }
    };

    // Auto-fetch history on mount
    React.useEffect(() => {
        fetchHistory();
    }, []);

    const providers = [
        { id: 'apicbase', name: 'Apicbase', type: 'Inventory & Recipes', color: 'bg-orange-600', icon: '🥘' },
        { id: 'lightspeed', name: 'Lightspeed K-Series', type: 'POS & Menu', color: 'bg-red-600', icon: '📟' },
        { id: 'shireburn', name: 'Shireburn Indigo', type: 'HR & Payroll', color: 'bg-blue-600', icon: '👥' },
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

    const handlePreview = async () => {
        if (!file && mode === 'migrate') {
            toast.error("Please select a file to upload");
            return;
        }

        setIsProcessing(true);
        const formData = new FormData();
        formData.append('source', selectedProvider.id);
        formData.append('file', file);

        try {
            // Real API Call
            const res = await api.post('migrations/preview', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            setPreviewData(res.data);
            setStep(3);
            setIsProcessing(false);

        } catch (error) {
            console.error(error);
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
            });

            setStep(4);
            setIsProcessing(false);
            toast.success("Migration Completed Successfully!");
            fetchHistory(); // Refresh history
        } catch (error) {
            console.error(error);
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
                    <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Quick Sync Wizard (Migration)</h1>
                    <p className="text-zinc-400">Import data from legacy systems or link them for real-time updates.</p>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant={viewMode === 'wizard' ? 'default' : 'outline'}
                        onClick={() => setViewMode('wizard')}
                        className={viewMode === 'wizard' ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'border-zinc-600 text-zinc-200 hover:bg-zinc-800 hover:text-white'}
                    >
                        New Sync
                    </Button>
                    <Button
                        variant={viewMode === 'history' ? 'default' : 'outline'}
                        onClick={() => { setViewMode('history'); fetchHistory(); }}
                        className={viewMode === 'history' ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'border-zinc-600 text-zinc-200 hover:bg-zinc-800 hover:text-white'}
                    >
                        History
                    </Button>
                </div>
            </div>

            {viewMode === 'history' ? (
                <Card className="bg-zinc-900 border-zinc-800">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Migration Logs</CardTitle>
                        <Button variant="outline" size="sm" onClick={() => setViewMode('wizard')}>
                            <ArrowRight className="w-4 h-4 mr-2 rotate-180" /> Back to Wizard
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-zinc-400">
                                <thead className="text-xs uppercase bg-zinc-950 text-zinc-500 font-bold border-b border-zinc-800">
                                    <tr>
                                        <th className="px-4 py-3">Date</th>
                                        <th className="px-4 py-3">Filename</th>
                                        <th className="px-4 py-3">Source</th>
                                        <th className="px-4 py-3">Mode</th>
                                        <th className="px-4 py-3">Status</th>
                                        <th className="px-4 py-3">Summary</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-800">
                                    {history.length === 0 ? (
                                        <tr>
                                            <td colSpan="6" className="px-4 py-8 text-center text-zinc-600 italic">No migration history found.</td>
                                        </tr>
                                    ) : (
                                        history.map((log) => (
                                            <tr key={log.id} className="hover:bg-zinc-800/50 transition-colors">
                                                <td className="px-4 py-3 font-mono text-xs text-zinc-500">{new Date(log.started_at || log.created_at).toLocaleString()}</td>
                                                <td className="px-4 py-3">
                                                    <span className="text-zinc-300 text-xs font-mono truncate max-w-[180px] block" title={log.filename}>
                                                        {log.filename || '-'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <Badge variant="outline" className="capitalize bg-zinc-800">{log.source}</Badge>
                                                </td>
                                                <td className="px-4 py-3 capitalize">{log.mode}</td>
                                                <td className="px-4 py-3">
                                                    <Badge className={log.status === 'completed' ? 'bg-green-600' : 'bg-red-600'}>
                                                        {log.status}
                                                    </Badge>
                                                </td>
                                                <td className="px-4 py-3 text-zinc-300">{log.summary || 'No summary'}</td>
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
                            <Button variant="outline" onClick={reset} size="sm" className="border-zinc-600 text-zinc-200 hover:bg-zinc-800 hover:text-white">
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
                                    className="bg-zinc-900 border-zinc-800 hover:border-zinc-600 cursor-pointer transition-all hover:scale-[1.02]"
                                >
                                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                                        <CardTitle className="text-xl font-bold text-white">{p.name}</CardTitle>
                                        <span className="text-4xl">{p.icon}</span>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-zinc-400 font-medium mb-4">{p.type}</div>
                                        <div className="flex gap-2">
                                            <Badge variant="outline" className="bg-zinc-800 text-zinc-300">
                                                CSV Import
                                            </Badge>
                                            <Badge variant="outline" className="bg-zinc-800 text-zinc-300">
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
                        <Card className="bg-zinc-900 border-zinc-800 max-w-2xl mx-auto">
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
                                        className={`p-4 rounded-xl border-2 text-left transition-all ${mode === 'migrate' ? 'border-primary bg-primary/10' : 'border-zinc-700 hover:border-zinc-500'}`}
                                    >
                                        <div className="font-bold text-white flex items-center gap-2">
                                            <Upload className="w-5 h-5" /> Migrate Data
                                        </div>
                                        <p className="text-xs text-zinc-400 mt-1">One-time import. You own and edit the data in Restin.</p>
                                    </button>
                                    <button
                                        onClick={() => setMode('link')}
                                        className={`p-4 rounded-xl border-2 text-left transition-all ${mode === 'link' ? 'border-primary bg-primary/10' : 'border-zinc-700 hover:border-zinc-500'}`}
                                    >
                                        <div className="font-bold text-white flex items-center gap-2">
                                            <Link className="w-5 h-5" /> API Link (Hybrid)
                                        </div>
                                        <p className="text-xs text-zinc-400 mt-1">Read-only in Restin. Syncs daily from {selectedProvider.name}.</p>
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
                                                : 'border-zinc-700 bg-zinc-900/50 hover:border-zinc-500 hover:bg-zinc-900'
                                            }`}
                                    >
                                        <div className="flex flex-col items-center gap-4">
                                            <div className={`p-4 rounded-full transition-transform duration-300 ${isDragging ? 'scale-110 bg-primary/20 text-primary' : file ? 'bg-green-500/20 text-green-500' : 'bg-zinc-800 text-zinc-500'}`}>
                                                {file ? <Check className="w-8 h-8" /> : <Upload className="w-8 h-8" />}
                                            </div>

                                            <div>
                                                <h3 className="text-xl font-bold text-white mb-1">
                                                    {file ? file.name : 'Drop export file here'}
                                                </h3>
                                                <p className="text-zinc-400 text-sm max-w-[280px] mx-auto leading-relaxed">
                                                    {file
                                                        ? `${(file.size / 1024).toFixed(1)} KB ready for analysis.`
                                                        : `Drag & drop or Click to upload CSV, Excel (XLSX), or JSON from ${selectedProvider.name}`}
                                                </p>
                                            </div>

                                            <input
                                                type="file"
                                                id="migration-upload"
                                                accept=".csv,.json,.xlsx,.xls"
                                                onChange={handleFileUpload}
                                                className="absolute inset-0 opacity-0 cursor-pointer"
                                            />

                                            {!file && (
                                                <div className="flex gap-2 mt-2">
                                                    <Badge variant="outline" className="bg-zinc-950/50 text-[10px] text-zinc-500 border-zinc-800">CSV</Badge>
                                                    <Badge variant="outline" className="bg-zinc-950/50 text-[10px] text-zinc-500 border-zinc-800">XLSX</Badge>
                                                    <Badge variant="outline" className="bg-zinc-950/50 text-[10px] text-zinc-500 border-zinc-800">JSON</Badge>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* API Key for Link Mode */}
                                {mode === 'link' && (
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-zinc-300">API Key / Token</label>
                                        <input type="password" placeholder="Enter API Key" className="w-full bg-zinc-800 border-zinc-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-primary outline-none" />
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
                        <Card className="bg-zinc-900 border-zinc-800 max-w-3xl mx-auto">
                            <CardHeader>
                                <CardTitle>Migration Preview</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                                    {previewData.error ? (
                                        <div className="col-span-3 p-6 bg-red-950/20 rounded-2xl border border-red-900/50 text-left">
                                            <div className="flex items-start gap-4">
                                                <div className="p-3 bg-red-500 rounded-xl text-white">
                                                    <AlertCircle className="w-6 h-6" />
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-red-500 text-lg mb-1">Column Mapping Error</h3>
                                                    <p className="text-zinc-300 text-sm font-mono break-all">{previewData.error}</p>
                                                    <p className="text-zinc-500 text-xs mt-3 bg-zinc-950 p-2 rounded border border-red-900/20">
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
                                                className={`relative p-6 rounded-2xl border transition-all duration-300 cursor-pointer group overflow-hidden ${activeTab === 'new' ? 'bg-green-950/30 border-green-500/50 shadow-[0_0_30px_rgba(34,197,94,0.1)]' : 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900'}`}
                                            >
                                                <div className="flex justify-between items-start mb-4">
                                                    <div className={`p-3 rounded-xl ${activeTab === 'new' ? 'bg-green-500 text-zinc-950' : 'bg-zinc-800 text-zinc-400 group-hover:bg-zinc-700'}`}>
                                                        <div className="text-xl">📦</div>
                                                    </div>
                                                    {activeTab === 'new' && <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />}
                                                </div>
                                                <div className="space-y-1">
                                                    <div className={`text-4xl font-black tracking-tight ${activeTab === 'new' ? 'text-white' : 'text-zinc-300'}`}>
                                                        {previewData.new}
                                                    </div>
                                                    <div className={`text-sm font-bold uppercase tracking-wider ${activeTab === 'new' ? 'text-green-400' : 'text-zinc-500'}`}>
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
                                                className={`relative p-6 rounded-2xl border transition-all duration-300 cursor-pointer group overflow-hidden ${activeTab === 'update' ? 'bg-amber-950/30 border-amber-500/50 shadow-[0_0_30px_rgba(245,158,11,0.1)]' : 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900'}`}
                                            >
                                                <div className="flex justify-between items-start mb-4">
                                                    <div className={`p-3 rounded-xl ${activeTab === 'update' ? 'bg-amber-500 text-zinc-950' : 'bg-zinc-800 text-zinc-400 group-hover:bg-zinc-700'}`}>
                                                        <div className="text-xl">🔄</div>
                                                    </div>
                                                    {activeTab === 'update' && <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />}
                                                </div>
                                                <div className="space-y-1">
                                                    <div className={`text-4xl font-black tracking-tight ${activeTab === 'update' ? 'text-white' : 'text-zinc-300'}`}>
                                                        {previewData.update}
                                                    </div>
                                                    <div className={`text-sm font-bold uppercase tracking-wider ${activeTab === 'update' ? 'text-amber-400' : 'text-zinc-500'}`}>
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
                                                className={`relative p-6 rounded-2xl border transition-all duration-300 cursor-pointer group overflow-hidden ${activeTab === 'conflict' ? 'bg-red-950/30 border-red-500/50 shadow-[0_0_30px_rgba(239,68,68,0.1)]' : 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900'}`}
                                            >
                                                <div className="flex justify-between items-start mb-4">
                                                    <div className={`p-3 rounded-xl ${activeTab === 'conflict' ? 'bg-red-500 text-white' : 'bg-zinc-800 text-zinc-400 group-hover:bg-zinc-700'}`}>
                                                        <div className="text-xl">⚠️</div>
                                                    </div>
                                                    {activeTab === 'conflict' && <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />}
                                                </div>
                                                <div className="space-y-1">
                                                    <div className={`text-4xl font-black tracking-tight ${activeTab === 'conflict' ? 'text-white' : 'text-zinc-300'}`}>
                                                        {previewData.conflict}
                                                    </div>
                                                    <div className={`text-sm font-bold uppercase tracking-wider ${activeTab === 'conflict' ? 'text-red-400' : 'text-zinc-500'}`}>
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
                                                className={`relative p-6 rounded-2xl border transition-all duration-300 cursor-pointer group overflow-hidden ${activeTab === 'restore_archive' ? 'bg-purple-950/30 border-purple-500/50 shadow-[0_0_30px_rgba(168,85,247,0.1)]' : 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900'}`}
                                            >
                                                <div className="flex justify-between items-start mb-4">
                                                    <div className={`p-3 rounded-xl ${activeTab === 'restore_archive' ? 'bg-purple-500 text-white' : 'bg-zinc-800 text-zinc-400 group-hover:bg-zinc-700'}`}>
                                                        <div className="text-xl">📦</div>
                                                    </div>
                                                    {activeTab === 'restore_archive' && <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />}
                                                </div>
                                                <div className="space-y-1">
                                                    <div className={`text-4xl font-black tracking-tight ${activeTab === 'restore_archive' ? 'text-white' : 'text-zinc-300'}`}>
                                                        {previewData.restore_from_archive || 0}
                                                    </div>
                                                    <div className={`text-sm font-bold uppercase tracking-wider ${activeTab === 'restore_archive' ? 'text-purple-400' : 'text-zinc-500'}`}>
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
                                                className={`relative p-6 rounded-2xl border transition-all duration-300 cursor-pointer group overflow-hidden ${activeTab === 'restore_trash' ? 'bg-rose-950/30 border-rose-500/50 shadow-[0_0_30px_rgba(244,63,94,0.1)]' : 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900'}`}
                                            >
                                                <div className="flex justify-between items-start mb-4">
                                                    <div className={`p-3 rounded-xl ${activeTab === 'restore_trash' ? 'bg-rose-500 text-white' : 'bg-zinc-800 text-zinc-400 group-hover:bg-zinc-700'}`}>
                                                        <div className="text-xl">🗑️</div>
                                                    </div>
                                                    {activeTab === 'restore_trash' && <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />}
                                                </div>
                                                <div className="space-y-1">
                                                    <div className={`text-4xl font-black tracking-tight ${activeTab === 'restore_trash' ? 'text-white' : 'text-zinc-300'}`}>
                                                        {previewData.restore_from_trash || 0}
                                                    </div>
                                                    <div className={`text-sm font-bold uppercase tracking-wider ${activeTab === 'restore_trash' ? 'text-rose-400' : 'text-zinc-500'}`}>
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
                                                className={`relative p-6 rounded-2xl border transition-all duration-300 cursor-pointer group overflow-hidden ${activeTab === 'unchanged' ? 'bg-teal-950/30 border-teal-500/50 shadow-[0_0_30px_rgba(20,184,166,0.1)]' : 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900'}`}
                                            >
                                                <div className="flex justify-between items-start mb-4">
                                                    <div className={`p-3 rounded-xl ${activeTab === 'unchanged' ? 'bg-teal-500 text-white' : 'bg-zinc-800 text-zinc-400 group-hover:bg-zinc-700'}`}>
                                                        <div className="text-xl">✓</div>
                                                    </div>
                                                    {activeTab === 'unchanged' && <div className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />}
                                                </div>
                                                <div className="space-y-1">
                                                    <div className={`text-4xl font-black tracking-tight ${activeTab === 'unchanged' ? 'text-white' : 'text-zinc-300'}`}>
                                                        {previewData.unchanged || 0}
                                                    </div>
                                                    <div className={`text-sm font-bold uppercase tracking-wider ${activeTab === 'unchanged' ? 'text-teal-400' : 'text-zinc-500'}`}>
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

                                {/* Detailed View Area */}
                                <div className="min-h-[400px] bg-zinc-900/30 rounded-2xl border border-zinc-800/50 overflow-hidden flex flex-col">
                                    {!previewData.error && (
                                        <>
                                            {/* Header for Detail View */}
                                            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-zinc-900/50">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-2 h-2 rounded-full ${activeTab === 'new' ? 'bg-green-500' : activeTab === 'update' ? 'bg-amber-500' : 'bg-red-500'}`} />
                                                    <h3 className="font-bold text-white uppercase tracking-wider text-xs">
                                                        {activeTab === 'new' ? 'Incoming Items' : activeTab === 'update' ? 'Updates Logic' : 'Conflict Resolution'}
                                                    </h3>
                                                </div>
                                                <div className="text-[10px] text-zinc-500 font-mono uppercase">
                                                    {activeTab === 'new' ? `${previewData.new} Items` : activeTab === 'update' ? `${previewData.update} Items` : `${previewData.conflict} Issues`}
                                                </div>
                                            </div>

                                            {/* Content */}
                                            <div className="flex-1 overflow-y-auto max-h-[500px]">
                                                {/* NEW ITEMS VIEW */}
                                                {activeTab === 'new' && (
                                                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                                                        <div className="p-2 divide-y divide-white/5">
                                                            {previewData.new === 0 ? (
                                                                <div className="py-20 text-center text-zinc-600 italic">No new items found.</div>
                                                            ) : (
                                                                previewData.details.filter(d => d.type === 'new' || d.type === 'new_recipe' || d.type === 'new_employee').slice(0, visibleCount).map((d, i) => (
                                                                    <div key={i} className="flex items-center justify-between p-4 hover:bg-white/5 transition-colors group">
                                                                        <div className="flex items-center gap-4">
                                                                            <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-500 text-xs font-mono group-hover:bg-zinc-700 group-hover:text-white transition-colors">
                                                                                {(i + 1).toString().padStart(2, '0')}
                                                                            </div>
                                                                            <div className="flex-1">
                                                                                <div className="font-semibold text-zinc-200 group-hover:text-white transition-colors">{d.name}</div>
                                                                                <div className="text-xs text-zinc-500 flex items-center gap-3 mt-0.5">
                                                                                    <span className="font-mono bg-emerald-950 text-emerald-400 px-1.5 py-0.5 rounded text-[10px] font-bold">
                                                                                        {d.item_id || `CB/${String(i + 1).padStart(3, '0')}`}
                                                                                    </span>
                                                                                    {d.sku && d.sku !== 'N/A' && <span className="font-mono bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-800 text-[10px]">{d.sku}</span>}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                        <Badge variant="outline" className="opacity-0 group-hover:opacity-100 transition-opacity bg-zinc-950 border-zinc-800 text-green-500 text-[10px] h-5">READY</Badge>
                                                                    </div>
                                                                ))
                                                            )}

                                                            {visibleCount < previewData.new && (
                                                                <div className="p-6 flex justify-center border-t border-white/5">
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        onClick={() => setVisibleCount(prev => prev + 20)}
                                                                        className="text-zinc-500 hover:text-white hover:bg-zinc-800/50"
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
                                                                <div className="text-zinc-500 italic">No updates needed - all items are new.</div>
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
                                                                                <div className="text-base text-zinc-100 font-bold">{d.name}</div>
                                                                                <div className="flex items-center gap-3 text-xs mt-1">
                                                                                    <Badge className="bg-zinc-800 text-zinc-400 font-mono">{d.item_id || d.sku}</Badge>
                                                                                    <span className="text-amber-500">{d.info}</span>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                        {/* Changed Fields Diff */}
                                                                        {d.changed_fields && d.changed_fields.length > 0 && (
                                                                            <div className="ml-14 space-y-2 border-l-2 border-amber-500/30 pl-4">
                                                                                {d.changed_fields.map((cf, cfIdx) => (
                                                                                    <div key={cfIdx} className="flex items-center gap-3 text-sm">
                                                                                        <span className="text-zinc-500 uppercase text-[10px] font-bold min-w-[80px]">{cf.field}</span>
                                                                                        <span className="text-red-400 line-through font-mono text-xs">{cf.old}</span>
                                                                                        <span className="text-zinc-600">→</span>
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
                                                                <div className="text-zinc-500 italic">No structure or data conflicts found.</div>
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
                                                                                <div className="text-base text-zinc-100 font-bold">{d.message}</div>
                                                                                <div className="flex items-center gap-6 mt-3">
                                                                                    <div className="flex flex-col">
                                                                                        <span className="text-[10px] text-zinc-500 uppercase font-black mb-1">Current State</span>
                                                                                        <span className="font-mono text-zinc-400 text-sm italic">€{d.oldPrice}</span>
                                                                                    </div>
                                                                                    <div className="h-6 w-px bg-zinc-800" />
                                                                                    <div className="flex flex-col">
                                                                                        <span className="text-[10px] text-amber-500 uppercase font-black mb-1">Incoming Change</span>
                                                                                        <span className="font-mono text-amber-400 text-sm font-bold">€{d.newPrice}</span>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                        <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                                                                            <Button size="sm" variant="ghost" className="text-zinc-500 hover:text-white flex-1 h-9">Ignore Change</Button>
                                                                            <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-900/40 flex-1 h-9 font-bold">Overwrite Local Data</Button>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </>
                                    )}
                                </div> {/* End of min-h-[400px] detailed view area */}

                                <div className="text-xs text-zinc-500 flex items-center gap-2 px-2 mt-4">
                                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                                    Smart Mapping active: Restin is auto-linking items by Name and SKU.
                                </div>
                            </CardContent>
                            <CardFooter className="flex justify-between bg-zinc-950/30 p-6">
                                <div className="text-xs text-zinc-600 font-mono">Analysis ID: {Math.random().toString(36).substring(7).toUpperCase()}</div>
                                <div className="flex gap-3">
                                    <Button variant="ghost" onClick={() => setStep(2)}>Back</Button>
                                    <Button onClick={handleExecute} disabled={isProcessing} className="bg-green-600 hover:bg-green-700 min-w-[160px]">
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
                            <h2 className="text-4xl font-black text-white mb-2 tracking-tight">Sync Complete!</h2>
                            <p className="text-zinc-400 max-w-lg mx-auto mb-4 text-lg">
                                Successfully processed <strong className="text-white">{previewData?.new + previewData?.update} {previewData?.type === 'recipes' ? 'recipes' : 'items'}</strong> from {selectedProvider?.name}.
                            </p>

                            {/* Target Section Badge */}
                            <div className="flex items-center justify-center gap-2 mb-8">
                                <span className="text-zinc-500">Added to:</span>
                                <Badge className={`text-sm px-3 py-1 ${previewData?.type === 'recipes' ? 'bg-orange-600 text-white' : 'bg-blue-600 text-white'}`}>
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
                                    <Button className="h-12 px-8 bg-orange-600 hover:bg-orange-700 text-lg font-bold shadow-lg shadow-orange-900/20" onClick={() => window.location.href = '/admin/inventory-recipes'}>
                                        Go to Recipe Engineering <ArrowRight className="w-5 h-5 ml-2" />
                                    </Button>
                                ) : selectedProvider?.id === 'apicbase' && (
                                    <Button className="h-12 px-8 bg-blue-600 hover:bg-blue-700 text-lg font-bold shadow-lg shadow-blue-900/20" onClick={() => window.location.href = '/admin/inventory'}>
                                        Go to Inventory Hub <ArrowRight className="w-5 h-5 ml-2" />
                                    </Button>
                                )}
                                {selectedProvider?.id === 'lightspeed' && (
                                    <Button className="h-12 px-8 bg-red-600 hover:bg-red-700 text-lg font-bold shadow-lg shadow-red-900/40" onClick={() => window.location.href = '/admin/products'}>
                                        View Products <ArrowRight className="w-5 h-5 ml-2" />
                                    </Button>
                                )}
                                {selectedProvider?.id === 'shireburn' && (
                                    <Button className="h-12 px-8 bg-indigo-600 hover:bg-indigo-700 text-lg font-bold shadow-lg shadow-indigo-900/20" onClick={() => window.location.href = '/admin/hr/people'}>
                                        Open Employee Directory <ArrowRight className="w-5 h-5 ml-2" />
                                    </Button>
                                )}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default MigrationHub;
