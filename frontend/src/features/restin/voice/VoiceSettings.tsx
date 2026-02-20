// @ts-nocheck
import React, { useState, useRef } from 'react';
import PageContainer from '../../../layouts/PageContainer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Switch } from '../../../components/ui/switch';
import { Slider } from '../../../components/ui/slider';
import { Textarea } from '../../../components/ui/textarea';
import { Save, Mic, Upload, FileText, Bot, Trash2, Loader2, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { voiceService } from './voice-service';
import { useVenue } from '../../../context/VenueContext';
import { useAuth } from '../../../context/AuthContext';

export default function VoiceSettings() {
    const { activeVenueId } = useVenue();
    const { user, isManager, isOwner } = useAuth();
    const queryClient = useQueryClient();
    const fileInputRef = useRef(null);

    const { data: config, isLoading } = useQuery({
        queryKey: ['voice-config', activeVenueId],
        queryFn: () => voiceService.getConfig(activeVenueId || 'default'),
        enabled: !!activeVenueId
    });

    const { data: knowledge = [] } = useQuery({
        queryKey: ['voice-knowledge', activeVenueId],
        queryFn: () => voiceService.getKnowledge(activeVenueId || 'default'),
        enabled: !!activeVenueId
    });

    const [persona, setPersona] = useState(config?.persona || 'British Butler');
    const [voiceSpeed, setVoiceSpeed] = useState([config?.voice_speed || 1.0]);
    const [autoReservations, setAutoReservations] = useState(config?.auto_reservations ?? true);
    const [callTransfer, setCallTransfer] = useState(config?.call_transfer ?? true);
    const [smsConfirmation, setSmsConfirmation] = useState(config?.sms_confirmation ?? true);
    const [greeting, setGreeting] = useState(config?.greeting || "Good evening, welcome to Restin. How may I assist you today?");
    const [isPlaying, setIsPlaying] = useState(false);

    // Sync state when config loads
    React.useEffect(() => {
        if (config) {
            setPersona(config.persona || 'British Butler');
            setVoiceSpeed([config.voice_speed || 1.0]);
            setAutoReservations(config.auto_reservations ?? true);
            setCallTransfer(config.call_transfer ?? true);
            setSmsConfirmation(config.sms_confirmation ?? true);
            setGreeting(config.greeting || "Good evening, welcome to Restin. How may I assist you today?");
        }
    }, [config]);

    const saveMutation = useMutation({
        mutationFn: (data) => voiceService.updateConfig(activeVenueId || 'default', data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['voice-config'] });
            toast.success("Voice configuration saved to database");
        },
        onError: () => toast.error("Failed to save configuration"),
    });

    const uploadMutation = useMutation({
        mutationFn: (file) => voiceService.uploadKnowledge(activeVenueId || 'default', file),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['voice-knowledge'] });
            toast.success("Document uploaded and indexed!");
        },
        onError: () => toast.error("Upload failed"),
    });

    const deleteMutation = useMutation({
        mutationFn: (docId) => voiceService.deleteKnowledge(docId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['voice-knowledge'] });
            toast.success("Document removed");
        },
    });

    const handlePreview = () => {
        if (!window.speechSynthesis) {
            toast.error("Your browser does not support text-to-speech preview.");
            return;
        }

        if (isPlaying) {
            window.speechSynthesis.cancel();
            setIsPlaying(false);
            return;
        }

        const utterance = new SpeechSynthesisUtterance(greeting);
        utterance.rate = voiceSpeed[0];

        const voices = window.speechSynthesis.getVoices();
        let selectedVoice = voices.find(v => v.lang.includes('en'));

        if (persona === 'British Butler') {
            selectedVoice = voices.find(v => v.lang.includes('GB') && v.name.includes('Male')) || voices.find(v => v.lang.includes('GB'));
        } else if (persona === 'Casual American') {
            selectedVoice = voices.find(v => v.lang.includes('US') && v.name.includes('Female')) || voices.find(v => v.lang.includes('US'));
        }

        if (selectedVoice) utterance.voice = selectedVoice;

        utterance.onstart = () => setIsPlaying(true);
        utterance.onend = () => setIsPlaying(false);
        utterance.onerror = () => setIsPlaying(false);

        window.speechSynthesis.speak(utterance);
    };

    const handleSave = () => {
        saveMutation.mutate({
            persona,
            greeting,
            voice_speed: voiceSpeed[0],
            auto_reservations: autoReservations,
            call_transfer: callTransfer,
            sms_confirmation: smsConfirmation,
        });
    };

    const handleFileUpload = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            uploadMutation.mutate(file);
        }
    };

    return (
        <PageContainer title="Voice AI Configuration" description="Customize your AI Receptionist's personality and knowledge">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Left Column: Personality */}
                <div className="lg:col-span-2 space-y-6">
                    <Card className="bg-card border-border">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Bot className="w-5 h-5 text-purple-400" />
                                Agent Identity
                            </CardTitle>
                            <CardDescription>Define how your AI sounds and behaves.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-2">
                                <Label>Persona Template</Label>
                                <div className="grid grid-cols-3 gap-4">
                                    {['British Butler', 'Casual American', 'Formal Concierge'].map((p) => (
                                        <div
                                            key={p}
                                            onClick={() => setPersona(p)}
                                            className={`p-4 rounded-lg border cursor-pointer transition-all ${persona === p ? 'bg-purple-500/10 border-purple-500 text-purple-400' : 'bg-black/20 border-border hover:border-border'}`}
                                        >
                                            <div className="font-bold text-sm">{p}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <Label>Opening Greeting</Label>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handlePreview}
                                        className={`h-8 gap-2 border-purple-500/30 hover:bg-purple-500/10 hover:text-purple-400 ${isPlaying ? 'text-purple-400 animate-pulse' : 'text-muted-foreground'}`}
                                    >
                                        <Mic className="w-3 h-3" />
                                        {isPlaying ? "Playing..." : "Test Voice"}
                                    </Button>
                                </div>
                                <Textarea
                                    value={greeting}
                                    onChange={(e) => setGreeting(e.target.value)}
                                    className="bg-black/20 border-border min-h-20"
                                />
                            </div>

                            <div className="space-y-4">
                                <div className="flex justify-between">
                                    <Label>Speaking Rate ({voiceSpeed[0]}x)</Label>
                                </div>
                                <Slider
                                    defaultValue={[1.0]}
                                    max={2.0}
                                    min={0.5}
                                    step={0.1}
                                    value={voiceSpeed}
                                    onValueChange={setVoiceSpeed}
                                    className="py-4"
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-card border-border">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <FileText className="w-5 h-5 text-blue-400" />
                                Knowledge Base (RAG)
                            </CardTitle>
                            <CardDescription>Upload menus and policy documents for the AI to reference during calls.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileUpload}
                                accept=".pdf,.txt,.doc,.docx"
                                className="hidden"
                            />
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:bg-card/50 transition-colors cursor-pointer"
                            >
                                <div className="w-12 h-12 bg-secondary rounded-full flex items-center justify-center mx-auto mb-4">
                                    {uploadMutation.isPending ? (
                                        <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
                                    ) : (
                                        <Upload className="w-6 h-6 text-muted-foreground" />
                                    )}
                                </div>
                                <h3 className="text-sm font-bold text-foreground mb-1">
                                    {uploadMutation.isPending ? 'Uploading & Indexing...' : 'Upload PDF Menu or Policy'}
                                </h3>
                                <p className="text-xs text-muted-foreground">Drag and drop or click to browse</p>
                            </div>

                            <div className="mt-6 space-y-3">
                                {knowledge.map((doc, i) => (
                                    <div key={doc.id || i} className="flex items-center justify-between p-3 bg-black/20 rounded-lg border border-border group">
                                        <div className="flex items-center gap-3">
                                            <FileText className="w-4 h-4 text-green-500" />
                                            <span className="text-sm text-secondary-foreground">{doc.filename}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-green-500 bg-green-500/10 px-2 py-1 rounded">
                                                {doc.status || 'Indexed'}
                                            </span>
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                onClick={() => deleteMutation.mutate(doc.id)}
                                                className="h-7 w-7 text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <Trash2 className="w-3 h-3" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                                {knowledge.length === 0 && (
                                    <p className="text-xs text-muted-foreground text-center py-4">No documents uploaded yet. Upload a menu or policy PDF to get started.</p>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column: Capabilities */}
                <div className="space-y-6">
                    <Card className="bg-card border-border">
                        <CardHeader>
                            <CardTitle className="text-sm uppercase tracking-widest text-muted-foreground">Capabilities</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label>Auto-Reservations</Label>
                                    <p className="text-xs text-muted-foreground">Allow AI to book tables directly</p>
                                </div>
                                <Switch checked={autoReservations} onCheckedChange={setAutoReservations} />
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label>Call Transfer</Label>
                                    <p className="text-xs text-muted-foreground">Forward to human if confused</p>
                                </div>
                                <Switch checked={callTransfer} onCheckedChange={setCallTransfer} />
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label>SMS Confirmation</Label>
                                    <p className="text-xs text-muted-foreground">Send text after call</p>
                                </div>
                                <Switch checked={smsConfirmation} onCheckedChange={setSmsConfirmation} />
                            </div>
                        </CardContent>
                    </Card>

                    <div className="sticky top-6 space-y-3">
                        <Button
                            onClick={handleSave}
                            disabled={saveMutation.isPending}
                            className="w-full bg-purple-600 hover:bg-purple-700 text-foreground font-bold h-12 gap-2"
                        >
                            {saveMutation.isPending ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : saveMutation.isSuccess ? (
                                <CheckCircle className="w-4 h-4" />
                            ) : (
                                <Save className="w-4 h-4" />
                            )}
                            {saveMutation.isPending ? 'Saving...' : saveMutation.isSuccess ? 'Saved!' : 'Save Configuration'}
                        </Button>
                    </div>
                </div>
            </div>
        </PageContainer>
    );
}
