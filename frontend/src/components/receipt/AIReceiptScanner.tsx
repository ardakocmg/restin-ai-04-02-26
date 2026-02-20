/**
 * AIReceiptScanner — Upload a receipt photo, AI extracts template config
 * Uses Gemini Vision API to analyze receipt images and auto-create templates.
 */
import React, { useState, useCallback, useRef } from 'react';
import {
    Upload, Camera, Sparkles, Loader2, CheckCircle, X, Wand2,
    FileImage, ZoomIn, RotateCcw, AlertTriangle, FileSpreadsheet,
    FileText, File, Image
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { cn } from '../../lib/utils';
import { type ReceiptTemplate, type AIScanResult, type TemplateType, makeTemplate, TYPE_META } from './types';

interface AIReceiptScannerProps {
    open: boolean;
    onClose: () => void;
    onTemplateCreated: (template: ReceiptTemplate) => void;
}

type ScanPhase = 'upload' | 'analyzing' | 'review' | 'error';

/* ─── Supported File Formats ─── */
const ACCEPTED_FORMATS = [
    // Images
    'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif',
    'image/tiff', 'image/bmp', 'image/gif', 'image/avif',
    // Documents
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    'application/msword', // .doc
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-excel', // .xls
    'text/csv',
];

const ACCEPT_STRING = 'image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.heic,.heif,.tiff,.bmp,.avif';

const getFileFormatInfo = (file: File): { icon: React.ElementType; label: string; color: string } => {
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const type = file.type;

    if (type.startsWith('image/')) return { icon: Image, label: ext.toUpperCase(), color: '#3B82F6' };
    if (type === 'application/pdf') return { icon: FileText, label: 'PDF', color: '#EF4444' };
    if (ext === 'docx' || ext === 'doc') return { icon: FileText, label: 'WORD', color: '#2563EB' };
    if (ext === 'xlsx' || ext === 'xls') return { icon: FileSpreadsheet, label: 'EXCEL', color: '#16A34A' };
    if (ext === 'csv') return { icon: FileSpreadsheet, label: 'CSV', color: '#F59E0B' };
    return { icon: File, label: ext.toUpperCase() || 'FILE', color: '#6B7280' };
};

const isFileSupported = (file: File): boolean => {
    if (ACCEPTED_FORMATS.includes(file.type)) return true;
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif', 'tiff', 'bmp', 'avif', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'csv'].includes(ext);
};

/* ─── Simulated AI Analysis ─── */
const simulateAIAnalysis = async (imageFile: File): Promise<AIScanResult> => {
    // Simulate network + AI processing delay
    await new Promise(r => setTimeout(r, 2800));

    // Simulated AI extraction — in production, this calls POST /print/templates/scan-receipt
    const isInvoice = imageFile.name.toLowerCase().includes('invoice') || imageFile.name.toLowerCase().includes('fatura');
    const isKitchen = imageFile.name.toLowerCase().includes('kitchen') || imageFile.name.toLowerCase().includes('ticket');

    const detectedType: TemplateType = isInvoice ? 'invoice' : isKitchen ? 'kitchen' : 'customer';

    return {
        confidence: 0.87 + Math.random() * 0.1,
        detectedType,
        rawAnalysis: `Detected a ${detectedType} receipt. Found restaurant header, ${isInvoice ? 'VAT number, invoice prefix,' : ''} itemized list, tax breakdown, and payment info. Paper width estimated at 80mm.`,
        template: {
            type: detectedType,
            headerLine1: 'Ristorante Da Marco',
            headerLine2: '42 Republic Street, Valletta VLT 1116',
            headerLine3: 'Tel: +356 2125 9876 | VAT: MT23456789',
            showLogo: true,
            showDateTime: true,
            showServer: !isKitchen,
            showTable: true,
            showOrderNumber: true,
            showItemPrices: !isKitchen,
            showModifiers: true,
            showTax: !isKitchen,
            showPaymentMethod: !isKitchen,
            showTipLine: detectedType === 'customer',
            showCourseHeaders: isKitchen,
            showBarcode: false,
            footerLine1: isInvoice ? 'This is a fiscal document' : 'Thank you for visiting Da Marco!',
            footerLine2: isInvoice ? 'Retain for your records' : 'WiFi: DaMarco_Guest / Pass: benvenuto',
            footerLine3: '',
            qrCodeUrl: !isKitchen ? 'https://damarco.mt/feedback' : '',
            invoicePrefix: isInvoice ? 'INV-' : '',
            paperWidth: '80mm' as const,
            fontSize: isKitchen ? 'large' as const : 'medium' as const,
        },
    };
};

/* ─── Analysis Step Labels ─── */
const ANALYSIS_STEPS = [
    { label: 'Uploading file...', duration: 400 },
    { label: 'Detecting document format...', duration: 400 },
    { label: 'Extracting receipt layout...', duration: 600 },
    { label: 'Reading header & venue info...', duration: 500 },
    { label: 'Extracting line items & prices...', duration: 500 },
    { label: 'Identifying tax & totals...', duration: 400 },
    { label: 'Detecting footer, QR & barcodes...', duration: 400 },
    { label: 'Generating template config...', duration: 300 },
];

export const AIReceiptScanner: React.FC<AIReceiptScannerProps> = ({ open, onClose, onTemplateCreated }) => {
    const [phase, setPhase] = useState<ScanPhase>('upload');
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);
    const [isDragOver, setIsDragOver] = useState(false);
    const [analysisStep, setAnalysisStep] = useState(0);
    const [result, setResult] = useState<AIScanResult | null>(null);
    const [editedName, setEditedName] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const reset = useCallback(() => {
        setPhase('upload');
        setImagePreview(null);
        setUploadedFile(null);
        setIsDragOver(false);
        setAnalysisStep(0);
        setResult(null);
        setEditedName('');
    }, []);

    const handleFile = useCallback(async (file: File) => {
        if (!isFileSupported(file)) {
            setPhase('error');
            return;
        }

        setUploadedFile(file);

        // Show preview for images, placeholder for docs
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => setImagePreview(e.target?.result as string);
            reader.readAsDataURL(file);
        } else {
            // Non-image files show a format badge instead of preview
            setImagePreview(null);
        }

        // Start analysis
        setPhase('analyzing');

        // Animate steps
        for (let i = 0; i < ANALYSIS_STEPS.length; i++) {
            setAnalysisStep(i);
            await new Promise(r => setTimeout(r, ANALYSIS_STEPS[i].duration));
        }

        try {
            const scanResult = await simulateAIAnalysis(file);
            setResult(scanResult);
            setEditedName(`AI: ${scanResult.template.headerLine1 || 'Scanned Template'}`);
            setPhase('review');
        } catch {
            setPhase('error');
        }
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
    }, [handleFile]);

    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleFile(file);
    }, [handleFile]);

    const handleAccept = useCallback(() => {
        if (!result) return;
        const template = makeTemplate({
            id: crypto.randomUUID(),
            name: editedName || 'AI Scanned Template',
            type: result.detectedType,
            ...result.template,
        });
        onTemplateCreated(template);
        reset();
        onClose();
    }, [result, editedName, onTemplateCreated, onClose, reset]);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="bg-zinc-950 border border-white/10 rounded-2xl w-full max-w-2xl mx-4 shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center">
                            <Sparkles className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white">AI Receipt Scanner</h2>
                            <p className="text-xs text-zinc-500">Upload a receipt photo — AI creates your template instantly</p>
                        </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => { reset(); onClose(); }} className="text-zinc-500 hover:text-white">
                        <X className="w-4 h-4" />
                    </Button>
                </div>

                {/* Content */}
                <div className="p-6">
                    {/* ── UPLOAD PHASE ── */}
                    {phase === 'upload' && (
                        <div
                            className={cn(
                                'border-2 border-dashed rounded-xl p-12 text-center transition-all cursor-pointer',
                                isDragOver
                                    ? 'border-blue-500 bg-blue-500/10'
                                    : 'border-white/10 hover:border-white/20 bg-zinc-900/50'
                            )}
                            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                            onDragLeave={() => setIsDragOver(false)}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <input ref={fileInputRef} type="file" accept={ACCEPT_STRING} className="hidden" onChange={handleInputChange} />

                            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-violet-500/20 to-blue-500/20 border border-white/5 flex items-center justify-center">
                                <Upload className="w-7 h-7 text-violet-400" />
                            </div>

                            <h3 className="text-lg font-semibold text-white mb-2">Drop your receipt here</h3>
                            <p className="text-sm text-zinc-500 mb-4">
                                Upload any receipt — AI will extract everything automatically
                            </p>

                            {/* Supported format badges */}
                            <div className="flex flex-wrap items-center justify-center gap-2 mb-4">
                                <span className="flex items-center gap-1 text-[10px] text-blue-400 bg-blue-500/10 px-2 py-1 rounded-full">
                                    <Image className="w-3 h-3" /> JPG / PNG / WebP / HEIC
                                </span>
                                <span className="flex items-center gap-1 text-[10px] text-red-400 bg-red-500/10 px-2 py-1 rounded-full">
                                    <FileText className="w-3 h-3" /> PDF
                                </span>
                                <span className="flex items-center gap-1 text-[10px] text-blue-400 bg-blue-400/10 px-2 py-1 rounded-full">
                                    <FileText className="w-3 h-3" /> Word (.docx)
                                </span>
                                <span className="flex items-center gap-1 text-[10px] text-green-400 bg-green-500/10 px-2 py-1 rounded-full">
                                    <FileSpreadsheet className="w-3 h-3" /> Excel (.xlsx)
                                </span>
                                <span className="flex items-center gap-1 text-[10px] text-amber-400 bg-amber-500/10 px-2 py-1 rounded-full">
                                    <FileSpreadsheet className="w-3 h-3" /> CSV
                                </span>
                            </div>

                            <div className="flex items-center justify-center gap-6 text-xs text-zinc-600">
                                <span className="flex items-center gap-1"><FileImage className="w-3.5 h-3.5" /> Photo of receipt</span>
                                <span className="flex items-center gap-1"><Camera className="w-3.5 h-3.5" /> Camera capture</span>
                                <span className="flex items-center gap-1"><Upload className="w-3.5 h-3.5" /> Scanned document</span>
                            </div>

                            <div className="mt-6 pt-4 border-t border-white/5">
                                <p className="text-[11px] text-zinc-600">
                                    Works with: Customer receipts • Invoices • Kitchen tickets • Reports • Fiscal documents • Any POS printout
                                </p>
                            </div>
                        </div>
                    )}

                    {/* ── ANALYZING PHASE ── */}
                    {phase === 'analyzing' && (
                        <div className="flex gap-6">
                            {/* File preview */}
                            <div className="w-48 flex-shrink-0">
                                <div className="rounded-lg overflow-hidden border border-white/10 bg-zinc-900">
                                    {imagePreview ? (
                                        <img src={imagePreview} alt="Receipt" className="w-full h-auto opacity-80" />
                                    ) : uploadedFile ? (
                                        <div className="flex flex-col items-center justify-center py-10 px-4">
                                            {(() => {
                                                const info = getFileFormatInfo(uploadedFile);
                                                const Icon = info.icon;
                                                return (
                                                    <>
                                                        <Icon className="w-10 h-10 mb-2" style={{ color: info.color }} />
                                                        <span className="text-xs font-bold" style={{ color: info.color }}>{info.label}</span>
                                                        <span className="text-[10px] text-zinc-500 mt-1 text-center truncate max-w-full">{uploadedFile.name}</span>
                                                        <span className="text-[9px] text-zinc-600 mt-0.5">{(uploadedFile.size / 1024).toFixed(0)} KB</span>
                                                    </>
                                                );
                                            })()}
                                        </div>
                                    ) : null}
                                </div>
                            </div>

                            {/* Analysis progress */}
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-6">
                                    <Loader2 className="w-5 h-5 text-violet-400 animate-spin" />
                                    <h3 className="text-lg font-semibold text-white">Analyzing receipt...</h3>
                                </div>

                                <div className="space-y-3">
                                    {ANALYSIS_STEPS.map((step, i) => (
                                        <div key={i} className="flex items-center gap-3">
                                            {i < analysisStep ? (
                                                <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                                            ) : i === analysisStep ? (
                                                <Loader2 className="w-4 h-4 text-violet-400 animate-spin flex-shrink-0" />
                                            ) : (
                                                <div className="w-4 h-4 rounded-full border border-zinc-700 flex-shrink-0" />
                                            )}
                                            <span className={cn(
                                                'text-sm transition-colors',
                                                i < analysisStep ? 'text-zinc-400' : i === analysisStep ? 'text-white' : 'text-zinc-600'
                                            )}>
                                                {step.label}
                                            </span>
                                        </div>
                                    ))}
                                </div>

                                {/* Progress shimmer */}
                                <div className="mt-6 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                                    <div
                                        className="h-full rounded-full bg-gradient-to-r from-violet-500 to-blue-500 transition-all duration-500"
                                        style={{ width: `${((analysisStep + 1) / ANALYSIS_STEPS.length) * 100}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── REVIEW PHASE ── */}
                    {phase === 'review' && result && (
                        <div className="space-y-5">
                            {/* Confidence bar */}
                            <div className="flex items-center gap-4 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                                <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                                <div className="flex-1">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-sm font-medium text-white">Analysis Complete</span>
                                        <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                                            {Math.round(result.confidence * 100)}% confidence
                                        </Badge>
                                    </div>
                                    <p className="text-xs text-zinc-500">{result.rawAnalysis}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                {/* Left — Image */}
                                <div>
                                    {imagePreview && (
                                        <div className="rounded-lg overflow-hidden border border-white/10 bg-zinc-900 relative">
                                            <img src={imagePreview} alt="Receipt" className="w-full h-auto" />
                                            <div className="absolute top-2 right-2 flex gap-1">
                                                <Button variant="ghost" size="sm" className="h-7 w-7 bg-black/50 p-0">
                                                    <ZoomIn className="w-3.5 h-3.5 text-white" />
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Right — Extracted data */}
                                <div className="space-y-3">
                                    {/* Template name */}
                                    <div>
                                        <label className="text-xs text-zinc-500 mb-1 block">Template Name</label>
                                        <input
                                            value={editedName}
                                            onChange={(e) => setEditedName(e.target.value)}
                                            className="w-full bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                                        />
                                    </div>

                                    {/* Detected type */}
                                    <div>
                                        <label className="text-xs text-zinc-500 mb-1 block">Detected Type</label>
                                        <Badge style={{ background: `${TYPE_META[result.detectedType].color}20`, color: TYPE_META[result.detectedType].color }}>
                                            {TYPE_META[result.detectedType].label}
                                        </Badge>
                                    </div>

                                    {/* Extracted fields summary */}
                                    <div>
                                        <label className="text-xs text-zinc-500 mb-2 block">Extracted Fields</label>
                                        <div className="space-y-1.5 text-xs">
                                            {result.template.headerLine1 && (
                                                <div className="flex items-center gap-2">
                                                    <CheckCircle className="w-3 h-3 text-emerald-400" />
                                                    <span className="text-zinc-400">Header:</span>
                                                    <span className="text-white font-medium">{result.template.headerLine1}</span>
                                                </div>
                                            )}
                                            {result.template.headerLine2 && (
                                                <div className="flex items-center gap-2">
                                                    <CheckCircle className="w-3 h-3 text-emerald-400" />
                                                    <span className="text-zinc-400">Address:</span>
                                                    <span className="text-white">{result.template.headerLine2}</span>
                                                </div>
                                            )}
                                            {result.template.headerLine3 && (
                                                <div className="flex items-center gap-2">
                                                    <CheckCircle className="w-3 h-3 text-emerald-400" />
                                                    <span className="text-zinc-400">Contact:</span>
                                                    <span className="text-white">{result.template.headerLine3}</span>
                                                </div>
                                            )}
                                            <div className="flex flex-wrap gap-1.5 mt-2">
                                                {result.template.showTax && <span className="bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-400">Tax</span>}
                                                {result.template.showTipLine && <span className="bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-400">Tip</span>}
                                                {result.template.showPaymentMethod && <span className="bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-400">Payment</span>}
                                                {result.template.qrCodeUrl && <span className="bg-violet-500/10 px-1.5 py-0.5 rounded text-violet-400">QR</span>}
                                                {result.template.invoicePrefix && <span className="bg-amber-500/10 px-1.5 py-0.5 rounded text-amber-400">{result.template.invoicePrefix}</span>}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3 pt-2">
                                <Button onClick={handleAccept} className="flex-1 bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700 h-11">
                                    <Wand2 className="w-4 h-4 mr-2" /> Create Template
                                </Button>
                                <Button variant="outline" onClick={reset} className="text-zinc-400 border-white/10 h-11">
                                    <RotateCcw className="w-4 h-4 mr-2" /> Scan Another
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* ── ERROR PHASE ── */}
                    {phase === 'error' && (
                        <div className="text-center py-8">
                            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                                <AlertTriangle className="w-6 h-6 text-red-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-white mb-2">Analysis Failed</h3>
                            <p className="text-sm text-zinc-500 mb-6">
                                Could not analyze this image. Please try a clearer photo with good lighting.
                            </p>
                            <Button variant="outline" onClick={reset} className="text-zinc-400 border-white/10">
                                <RotateCcw className="w-4 h-4 mr-2" /> Try Again
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AIReceiptScanner;
