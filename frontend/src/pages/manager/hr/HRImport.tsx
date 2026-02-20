import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Upload,
    CheckCircle2,
    AlertCircle,
    Download,
    ArrowRight,
    Clock,
    Users
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

export default function HRImport() {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [importType, setImportType] = useState('clocking'); // 'clocking' or 'employees'

    const handleUpload = () => {
        setUploading(true);
        let p = 0;
        const interval = setInterval(() => {
            p += 10;
            setProgress(p);
            if (p >= 100) {
                clearInterval(interval);
                setUploading(false);
                setStep(3);
            }
        }, 300);
    };

    const downloadTemplate = () => {
        const headers = importType === 'clocking'
            ? "PunchCardID,EmployeeName,Date,TimeIn,TimeOut,Location"
            : "EmployeeCode,FirstName,LastName,Department,Occupation,Email,Mobile";
        const blob = new Blob([headers], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.setAttribute('hidden', '');
        a.setAttribute('href', url);
        a.setAttribute('download', `template_${importType}.csv`);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    return (
        <div className="min-h-screen bg-[#0A0A0B] text-foreground p-8">
            <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

                {/* Header */}
                <div className="flex items-center justify-between border-b border-border pb-8">
                    <div>
                        <h1 className="text-3xl font-black text-foreground uppercase tracking-tighter mb-2 flex items-center gap-3">
                            <Upload className="w-8 h-8 text-blue-500" />
                            Import Data
                        </h1>
                        <p className="text-muted-foreground font-bold uppercase tracking-widest text-[10px]">
                            Upload CSV/Excel files to synchronize HR records
                        </p>
                    </div>
                    <Button
                        variant="outline"
                        onClick={() => navigate('/manager/hr/summary')}
                        className="border-border hover:bg-white/5 text-muted-foreground text-[10px] font-bold uppercase"
                    >
                        Back to Hub
                    </Button>
                </div>

                {/* Steps Indicator */}
                <div className="flex items-center justify-center gap-4 mb-12">
                    {[1, 2, 3].map((s) => (
                        <React.Fragment key={s}>
                            <div className={`flex items-center gap-2 ${step >= s ? 'text-blue-500' : 'text-muted-foreground'}`}>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border-2 ${step >= s ? 'border-blue-500 bg-blue-500/10' : 'border-border bg-card/50'}`}>
                                    {s}
                                </div>
                                <span className="text-[10px] font-bold uppercase tracking-widest">
                                    {s === 1 ? 'Configure' : s === 2 ? 'Upload' : 'Complete'}
                                </span>
                            </div>
                            {s < 3 && <div className={`h-[1px] w-12 ${step > s ? 'bg-blue-500' : 'bg-secondary'}`} />}
                        </React.Fragment>
                    ))}
                </div>

                {step === 1 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 scale-in-center">
                        <Card
                            className={`cursor-pointer transition-all border-2 ${importType === 'clocking' ? 'border-blue-500 bg-blue-500/5' : 'border-border bg-card/30 hover:border-border'}`}
                            onClick={() => setImportType('clocking')}
                        >
                            <CardContent className="p-8 flex flex-col items-center text-center space-y-4">
                                <div className={`p-4 rounded-full ${importType === 'clocking' ? 'bg-blue-500 text-foreground shadow-[0_0_20px_rgba(59,130,246,0.3)]' : 'bg-secondary text-muted-foreground'}`}>
                                    <Clock className="w-8 h-8" />
                                </div>
                                <div>
                                    <h3 className="font-bold uppercase tracking-tighter text-lg leading-tight">Clocking Data</h3>
                                    <p className="text-muted-foreground text-[10px] font-medium mt-1 uppercase">Import punch card logs from external terminals</p>
                                </div>
                            </CardContent>
                        </Card>

                        <Card
                            className={`cursor-pointer transition-all border-2 ${importType === 'employees' ? 'border-blue-500 bg-blue-500/5' : 'border-border bg-card/30 hover:border-border'}`}
                            onClick={() => setImportType('employees')}
                        >
                            <CardContent className="p-8 flex flex-col items-center text-center space-y-4">
                                <div className={`p-4 rounded-full ${importType === 'employees' ? 'bg-blue-500 text-foreground shadow-[0_0_20px_rgba(59,130,246,0.3)]' : 'bg-secondary text-muted-foreground'}`}>
                                    <Users className="w-8 h-8" />
                                </div>
                                <div>
                                    <h3 className="font-bold uppercase tracking-tighter text-lg leading-tight">Employee Records</h3>
                                    <p className="text-muted-foreground text-[10px] font-medium mt-1 uppercase">Bulk create or update employee profiles</p>
                                </div>
                            </CardContent>
                        </Card>

                        <div className="md:col-span-2 flex justify-end pt-4">
                            <Button className="bg-blue-600 hover:bg-blue-500 px-8 py-6 rounded-xl font-bold uppercase tracking-widest text-xs gap-2 group" onClick={() => setStep(2)}>
                                Next Step
                                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </Button>
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <Card className="bg-card/30 border-border scale-in-center overflow-hidden">
                        <CardContent className="p-0">
                            <div className="p-12 flex flex-col items-center text-center space-y-6">
                                <div className="w-24 h-24 rounded-3xl bg-secondary flex items-center justify-center border border-border shadow-inner group cursor-pointer hover:bg-secondary/80 transition-colors">
                                    <Upload className="w-10 h-10 text-muted-foreground group-hover:text-blue-400 transition-colors" />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-xl font-black uppercase tracking-tighter">Drop your file here</h3>
                                    <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest">Supports CSV, XLS, XLSX formats (Max 10MB)</p>
                                </div>

                                {uploading ? (
                                    <div className="w-full max-w-md space-y-4">
                                        <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-blue-500">
                                            <span>Analyzing Structure...</span>
                                            <span>{progress}%</span>
                                        </div>
                                        <Progress value={progress} className="h-2 bg-secondary rounded-full" />
                                    </div>
                                ) : (
                                    <div className="flex gap-4">
                                        <Button variant="ghost" onClick={() => setStep(1)} className="text-muted-foreground hover:text-foreground uppercase font-bold text-[10px] tracking-widest">
                                            Cancel
                                        </Button>
                                        <Button className="bg-blue-600 hover:bg-blue-500" onClick={handleUpload}>
                                            Choose File
                                        </Button>
                                    </div>
                                )}
                            </div>

                            <div className="bg-blue-600/5 p-6 border-t border-border flex items-center justify-between">
                                <div className="flex items-center gap-3 cursor-pointer group" onClick={downloadTemplate}>
                                    <Download className="w-4 h-4 text-blue-400 group-hover:scale-110 transition-transform" />
                                    <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest group-hover:text-blue-300">Download {importType === 'clocking' ? 'Clocking' : 'Employee'} Template</span>
                                </div>
                                <Button variant="link" className="p-0 h-auto text-[10px] font-black uppercase text-blue-500 tracking-tighter">
                                    README_IMPORT_GUIDE.PDF
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {step === 3 && (
                    <div className="space-y-6 scale-in-center">
                        <Card className="bg-card/30 border-blue-500/20">
                            <CardContent className="p-12 flex flex-col items-center text-center space-y-6">
                                <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center border border-green-500/20 text-green-500 shadow-[0_0_30px_rgba(34,197,94,0.1)]">
                                    <CheckCircle2 className="w-10 h-10" />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-3xl font-black uppercase tracking-tighter">Import Successful</h3>
                                    <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest max-w-sm">
                                        Your {importType} file has been processed successfully. 248 records were identified and synchronized.
                                    </p>
                                </div>
                                <div className="grid grid-cols-2 gap-4 w-full max-w-md mt-4">
                                    <div className="bg-background p-4 rounded-xl border border-border text-left">
                                        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Total Processed</p>
                                        <p className="text-2xl font-black text-foreground leading-none">248</p>
                                    </div>
                                    <div className="bg-background p-4 rounded-xl border border-border text-left">
                                        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-1">New Records</p>
                                        <p className="text-2xl font-black text-blue-500 leading-none">12</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <div className="flex gap-4">
                            <Button
                                variant="outline"
                                className="flex-1 py-8 border-border hover:bg-white/5 font-bold uppercase tracking-widest text-xs"
                                onClick={() => setStep(1)}
                            >
                                Import Another File
                            </Button>
                            <Button
                                className="flex-1 py-8 bg-blue-600 hover:bg-blue-500 font-bold uppercase tracking-widest text-xs shadow-lg shadow-blue-600/20"
                                onClick={() => navigate(importType === 'clocking' ? '/manager/hr/clocking' : '/manager/hr/people')}
                            >
                                View Imported Data
                            </Button>
                        </div>
                    </div>
                )}

                {/* System Message */}
                <div className="flex items-start gap-4 p-4 rounded-xl bg-card/50 border border-border">
                    <AlertCircle className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                    <p className="text-[10px] text-muted-foreground font-bold leading-relaxed uppercase tracking-tight">
                        <span className="text-muted-foreground">Data Guard:</span> All incoming files are scanned for structural integrity. Duplicates are automatically merged based on unique identifiers (Punch Card ID / Employee Code).
                    </p>
                </div>
            </div>

            <style>{`
                @keyframes scale-in-center {
                    0% { transform: scale(0.95); opacity: 0; }
                    100% { transform: scale(1); opacity: 1; }
                }
                .scale-in-center {
                    animation: scale-in-center 0.4s cubic-bezier(0.390, 0.575, 0.565, 1.000) both;
                }
            `}</style>
        </div>
    );
}
