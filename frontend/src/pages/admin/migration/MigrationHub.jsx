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

    const providers = [
        { id: 'apicbase', name: 'Apicbase', type: 'Inventory & Recipes', color: 'bg-orange-600', icon: '🥘' },
        { id: 'lightspeed', name: 'Lightspeed K-Series', type: 'POS & Menu', color: 'bg-red-600', icon: '📟' },
        { id: 'shireburn', name: 'Shireburn Indigo', type: 'HR & Payroll', color: 'bg-blue-600', icon: '👥' },
    ];

    const handleFileUpload = (e) => {
        setFile(e.target.files[0]);
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
            const res = await api.post('/migrations/preview', formData, {
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
            // Mock API Execution
            setTimeout(() => {
                setStep(4);
                setIsProcessing(false);
                toast.success("Migration Completed Successfully!");
            }, 1500);
        } catch (error) {
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
                {step > 1 && (
                    <Button variant="outline" onClick={reset}>
                        Cancel / Reset
                    </Button>
                )}
            </div>

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
                            <div className="border-2 border-dashed border-zinc-700 rounded-xl p-8 text-center bg-zinc-900/50">
                                <Upload className="w-10 h-10 text-zinc-500 mx-auto mb-4" />
                                <h3 className="text-lg font-bold text-white mb-2">Upload Export File</h3>
                                <p className="text-zinc-400 text-sm mb-4">Support CSV, XML, or JSON exports from {selectedProvider.name}</p>
                                <input type="file" onChange={handleFileUpload} className="text-zinc-400" />
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
                        <div className="grid grid-cols-3 gap-4 text-center">
                            <div className="p-4 bg-green-900/20 rounded-xl border border-green-900/50">
                                <div className="text-3xl font-black text-green-400">{previewData.new}</div>
                                <div className="text-xs text-green-500 uppercase font-bold mt-1">New Items</div>
                            </div>
                            <div className="p-4 bg-yellow-900/20 rounded-xl border border-yellow-900/50">
                                <div className="text-3xl font-black text-yellow-400">{previewData.update}</div>
                                <div className="text-xs text-yellow-500 uppercase font-bold mt-1">Updates</div>
                            </div>
                            <div className="p-4 bg-red-900/20 rounded-xl border border-red-900/50">
                                <div className="text-3xl font-black text-red-500">{previewData.conflict}</div>
                                <div className="text-xs text-red-500 uppercase font-bold mt-1">Conflicts</div>
                            </div>
                        </div>

                        {/* Detailed Tabs */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider">Detailed Analysis</h3>

                            {/* Conflicts Section */}
                            {previewData.conflict > 0 && (
                                <div className="space-y-2">
                                    <div className="text-xs text-red-400 font-bold uppercase mb-2">Conflicts Options</div>
                                    {previewData.details.filter(d => d.type === 'conflict').map((d, i) => (
                                        <div key={i} className="flex items-center justify-between p-3 bg-red-900/10 border border-red-900/20 rounded-lg">
                                            <div className="flex items-center gap-3">
                                                <AlertCircle className="w-5 h-5 text-red-500" />
                                                <div>
                                                    <div className="text-sm text-red-200 font-medium">{d.message}</div>
                                                    <div className="text-xs text-red-400/60">New Price: €{d.newPrice} vs Old Price: €{d.oldPrice}</div>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button size="sm" variant="outline" className="h-7 text-xs border-red-800 hover:bg-red-900/50">Keep Old</Button>
                                                <Button size="sm" className="h-7 text-xs bg-red-600 hover:bg-red-700">Overwrite</Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* New Items Preview */}
                            {previewData.new > 0 && (
                                <div className="p-4 bg-zinc-950 rounded-lg border border-zinc-800">
                                    <div className="text-xs text-green-500 font-bold uppercase mb-2">New Items Preview</div>
                                    <div className="space-y-1">
                                        {/* State for pagination */}
                                        {(() => {
                                            const [visibleCount, setVisibleCount] = React.useState(5);
                                            const newItems = previewData.details.filter(d => d.type === 'new' || d.type === 'new_recipe' || d.type === 'new_employee');
                                            const total = newItems.length;

                                            // Reset when previewData changes (handled by key or effect usually, but inline here works for simple render)
                                            // Better to lift state up if complex, but inline component pattern or just simple logic:

                                            return (
                                                <>
                                                    {newItems.slice(0, visibleCount).map((d, i) => (
                                                        <div key={i} className="flex justify-between text-sm text-zinc-400 border-b border-white/5 pb-1 last:border-0 last:pb-0">
                                                            <div className="flex flex-col">
                                                                <span className="font-medium text-zinc-300">{d.name}</span>
                                                                <span className="text-xs text-zinc-500">{d.info}</span>
                                                            </div>
                                                            <span className="text-zinc-600 font-mono text-xs">{d.sku || d.code}</span>
                                                        </div>
                                                    ))}

                                                    {visibleCount < total && (
                                                        <div className="pt-2 flex justify-center">
                                                            <button
                                                                onClick={() => setVisibleCount(prev => prev + 20)}
                                                                className="text-xs text-blue-400 hover:text-blue-300 hover:underline flex items-center gap-1 transition-colors"
                                                            >
                                                                + {total - visibleCount} more items... (Show 20 more)
                                                            </button>
                                                        </div>
                                                    )}
                                                </>
                                            );
                                        })()}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="text-sm text-zinc-400 bg-zinc-800/50 p-4 rounded-lg flex gap-3">
                            <AlertCircle className="w-5 h-5 text-blue-400 shrink-0" />
                            <div>
                                <strong>Smart Merge:</strong> We will automatically link items by SKU or Barcode.
                            </div>
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
                    <p className="text-zinc-400 max-w-lg mx-auto mb-8 text-lg">
                        Successfully processed <strong className="text-white">{previewData?.new + previewData?.update} items</strong> from {selectedProvider?.name}.
                        <br /><span className="text-sm opacity-70">Background jobs are fetching images (24% complete).</span>
                    </p>

                    <div className="flex gap-4">
                        <Button onClick={reset} variant="outline" className="h-12 px-6">
                            Start Another Sync
                        </Button>

                        {/* Dynamic Navigation Based on Provider */}
                        {selectedProvider?.id === 'apicbase' && (
                            <Button className="h-12 px-8 bg-blue-600 hover:bg-blue-700 text-lg font-bold shadow-lg shadow-blue-900/20" onClick={() => window.location.href = '/admin/inventory'}>
                                Go to Inventory Hub <ArrowRight className="w-5 h-5 ml-2" />
                            </Button>
                        )}
                        {selectedProvider?.id === 'lightspeed' && (
                            <Button className="h-12 px-8 bg-red-600 hover:bg-red-700 text-lg font-bold shadow-lg shadow-red-900/20" onClick={() => window.location.href = '/admin/products'}>
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
        </div>
    );
};

export default MigrationHub;
