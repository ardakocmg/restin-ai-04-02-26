import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Switch } from '../../../components/ui/switch';
import { Slider } from '../../../components/ui/slider';
import { Textarea } from '../../../components/ui/textarea';
import {
    Save, Mic, Upload, FileText, Bot, Trash2, Loader2, CheckCircle,
    Globe, Phone as PhoneIcon, Volume2, Key, Zap, RefreshCw, PhoneCall,
    Unplug, Shield, ChevronRight, ExternalLink, AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { voiceService } from './voice-service';
import { useVenue } from '../../../context/VenueContext';
import { useAuth } from '../../../context/AuthContext';
import { cn } from '../../../lib/utils';

/* ========== Tab Nav ========== */
const TABS = [
    { id: 'dashboard', label: 'Dashboard', path: '/admin/restin/voice' },
    { id: 'settings', label: 'Settings', path: '/admin/restin/voice/settings' },
    { id: 'logs', label: 'Call Logs', path: '/admin/restin/voice/logs' },
];

const PERSONA_OPTIONS = [
    { id: 'British Butler', icon: '🎩', desc: 'Formal & refined' },
    { id: 'Casual American', icon: '😊', desc: 'Friendly & warm' },
    { id: 'Formal Concierge', icon: '🏨', desc: 'Luxury service' },
];
const PROVIDER_OPTIONS = [
    { value: 'google', label: 'Google TTS', desc: 'Default — fast & cost-effective', icon: '🔵' },
    { value: 'elevenlabs', label: 'ElevenLabs', desc: 'Premium — ultra-realistic voices', icon: '🟣' },
    { value: 'vapi', label: 'Vapi', desc: 'Full telephony — real phone calls', icon: '📞' },
];
const LANGUAGE_OPTIONS = [
    { value: 'en', label: 'English', flag: '🇬🇧' },
    { value: 'mt', label: 'Maltese', flag: '🇲🇹' },
    { value: 'it', label: 'Italian', flag: '🇮🇹' },
];

/* ========== Vapi Config Panel ========== */
function VapiConfigPanel({ venueId }: { venueId: string }) {
    const queryClient = useQueryClient();
    const [apiKey, setApiKey] = useState('');
    const [showKey, setShowKey] = useState(false);
    const [testNumber, setTestNumber] = useState('');

    const { data: vapiStatus, isLoading: statusLoading, refetch: refetchStatus } = useQuery({
        queryKey: ['vapi-status', venueId],
        queryFn: () => voiceService.getVapiStatus(venueId),
        enabled: !!venueId,
    });

    const saveKeyMutation = useMutation({
        mutationFn: (key: string) => voiceService.saveVapiKey(venueId, key),
        onSuccess: (data) => {
            toast.success(data.message || 'Vapi connected!');
            queryClient.invalidateQueries({ queryKey: ['vapi-status'] });
            setApiKey('');
        },
        onError: (err: Error) => toast.error(err.message || 'Invalid API key'),
    });

    const syncMutation = useMutation({
        mutationFn: () => voiceService.syncVapiAssistant(venueId),
        onSuccess: (data) => {
            toast.success(`Assistant synced: ${data.assistant_name}`);
            queryClient.invalidateQueries({ queryKey: ['vapi-status'] });
        },
        onError: (err: Error) => toast.error(err.message || 'Sync failed'),
    });

    const setPhoneMutation = useMutation({
        mutationFn: (phoneId: string) => voiceService.setVapiPhone(venueId, phoneId),
        onSuccess: () => {
            toast.success('Phone number assigned to assistant');
            queryClient.invalidateQueries({ queryKey: ['vapi-status'] });
        },
        onError: (err: Error) => toast.error(err.message || 'Assignment failed'),
    });

    const testCallMutation = useMutation({
        mutationFn: () => voiceService.testVapiCall(venueId, testNumber),
        onSuccess: (data) => toast.success(data.message || 'Test call initiated!'),
        onError: (err: Error) => toast.error(err.message || 'Test call failed'),
    });

    const disconnectMutation = useMutation({
        mutationFn: () => voiceService.disconnectVapi(venueId),
        onSuccess: () => {
            toast.success('Vapi disconnected');
            queryClient.invalidateQueries({ queryKey: ['vapi-status'] });
        },
    });

    const isConnected = vapiStatus?.connected;

    // ── Not Connected: Show API Key Input ──
    if (!isConnected) {
        return (
            <Card className="bg-gradient-to-br from-orange-950/20 to-card border-orange-500/30">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-orange-400">
                        <Key className="w-5 h-5" />
                        Connect Vapi
                    </CardTitle>
                    <CardDescription>
                        Enter your Vapi API key to enable live phone calls. Get it from{' '}
                        <a href="https://dashboard.vapi.ai" target="_blank" rel="noopener noreferrer"
                            className="text-orange-400 hover:underline inline-flex items-center gap-1">
                            dashboard.vapi.ai <ExternalLink className="w-3 h-3" />
                        </a>
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex gap-3">
                        <div className="relative flex-1">
                            <Input aria-label="Input field"
                                type={showKey ? 'text' : 'password'}
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                placeholder="vapi-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                                className="bg-black/30 border-orange-500/30 pr-16 font-mono text-xs"
                            />
                            <button
                                onClick={() => setShowKey(!showKey)}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground hover:text-foreground"
                            >
                                {showKey ? 'Hide' : 'Show'}
                            </button>
                        </div>
                        <Button
                            onClick={() => saveKeyMutation.mutate(apiKey)}
                            disabled={!apiKey.trim() || saveKeyMutation.isPending}
                            className="bg-orange-600 hover:bg-orange-700 text-white gap-2"
                        >
                            {saveKeyMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                            Connect
                        </Button>
                    </div>
                    <div className="flex items-start gap-2 p-3 bg-black/20 rounded-lg">
                        <Shield className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <p className="text-[11px] text-muted-foreground">
                            Your API key is stored encrypted per-venue. It never leaves the backend server.
                        </p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    // ── Connected: Show full Vapi panel ──
    return (
        <div className="space-y-6">
            {/* Connection Status */}
            <Card className="bg-gradient-to-br from-green-950/20 to-card border-green-500/30">
                <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                                <CheckCircle className="w-5 h-5 text-green-500" />
                            </div>
                            <div>
                                <h3 className="font-bold text-green-400">Vapi Connected</h3>
                                <p className="text-xs text-muted-foreground">
                                    {vapiStatus.assistants?.length || 0} assistant(s) · {vapiStatus.phone_numbers?.length || 0} phone number(s)
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => refetchStatus()}
                                className="h-8 gap-1 border-green-500/30 text-muted-foreground hover:text-green-400"
                            >
                                <RefreshCw className={cn("w-3 h-3", statusLoading && "animate-spin")} />
                                Refresh
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    if (confirm('Disconnect Vapi? Your assistant and phone assignment will be removed from this venue.')) {
                                        disconnectMutation.mutate();
                                    }
                                }}
                                className="h-8 gap-1 border-red-500/30 text-red-400 hover:bg-red-500/10"
                            >
                                <Unplug className="w-3 h-3" />
                                Disconnect
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Step 1: Sync Assistant */}
            <Card className="bg-card border-border">
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 text-xs font-black flex items-center justify-center">1</span>
                        Sync AI Assistant
                    </CardTitle>
                    <CardDescription>Push your persona, greeting, knowledge base to Vapi as an assistant.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-between">
                        <div className="text-xs text-muted-foreground">
                            {vapiStatus.active_assistant_id ? (
                                <span className="text-green-400">
                                    Active: <code className="bg-green-500/10 px-1 py-0.5 rounded text-[10px]">{vapiStatus.active_assistant_id}</code>
                                </span>
                            ) : (
                                <span className="text-amber-400 flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" /> No assistant synced yet
                                </span>
                            )}
                        </div>
                        <Button
                            onClick={() => syncMutation.mutate()}
                            disabled={syncMutation.isPending}
                            className="gap-2 bg-purple-600 hover:bg-purple-700 text-white"
                        >
                            {syncMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                            {vapiStatus.active_assistant_id ? 'Update Assistant' : 'Create Assistant'}
                        </Button>
                    </div>

                    {/* Show existing assistants from Vapi */}
                    {vapiStatus.assistants?.length > 0 && (
                        <div className="mt-4 space-y-2">
                            <Label className="text-xs text-muted-foreground">Assistants on your Vapi account:</Label>
                            {vapiStatus.assistants.map((a: { id: string; name: string }) => (
                                <div key={a.id} className={cn(
                                    'flex items-center justify-between p-2 rounded-lg border text-xs',
                                    a.id === vapiStatus.active_assistant_id
                                        ? 'bg-purple-500/10 border-purple-500/30 text-purple-300'
                                        : 'bg-black/20 border-border text-muted-foreground'
                                )}>
                                    <span>{a.name}</span>
                                    <code className="text-[10px]">{a.id.slice(0, 12)}…</code>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Step 2: Assign Phone Number */}
            <Card className="bg-card border-border">
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 text-xs font-black flex items-center justify-center">2</span>
                        Assign Phone Number
                    </CardTitle>
                    <CardDescription>Choose which Vapi phone number the AI assistant answers on.</CardDescription>
                </CardHeader>
                <CardContent>
                    {vapiStatus.phone_numbers?.length > 0 ? (
                        <div className="space-y-2">
                            {vapiStatus.phone_numbers.map((p: { id: string; number: string; provider: string }) => (
                                <div key={p.id} className={cn(
                                    'flex items-center justify-between p-3 rounded-lg border transition-all cursor-pointer',
                                    p.id === vapiStatus.active_phone_number_id
                                        ? 'bg-blue-500/10 border-blue-500/30'
                                        : 'bg-black/20 border-border hover:border-blue-500/20'
                                )}
                                    onClick={() => setPhoneMutation.mutate(p.id)}
                                >
                                    <div className="flex items-center gap-3">
                                        <PhoneIcon className={cn("w-4 h-4", p.id === vapiStatus.active_phone_number_id ? "text-blue-400" : "text-muted-foreground")} />
                                        <div>
                                            <span className={cn("text-sm font-bold", p.id === vapiStatus.active_phone_number_id ? "text-blue-300" : "text-foreground")}>{p.number}</span>
                                            <span className="text-[10px] text-muted-foreground ml-2">{p.provider}</span>
                                        </div>
                                    </div>
                                    {p.id === vapiStatus.active_phone_number_id ? (
                                        <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full font-bold">ACTIVE</span>
                                    ) : (
                                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-6">
                            <PhoneIcon className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                            <p className="text-xs text-muted-foreground mb-2">{"No "}phone numbers on your Vapi account.</p>
                            <a href="https://dashboard.vapi.ai/phone-numbers" target="_blank" rel="noopener noreferrer"
                                className="text-xs text-blue-400 hover:underline inline-flex items-center gap-1">
                                Add a phone number in Vapi Dashboard <ExternalLink className="w-3 h-3" />
                            </a>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Step 3: Test Call */}
            <Card className="bg-card border-border">
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-black flex items-center justify-center">3</span>
                        Test Call
                    </CardTitle>
                    <CardDescription>Trigger a test outbound call to verify everything works.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex gap-3">
                        <div className="flex items-center gap-2 px-3 bg-black/20 border border-border rounded-lg">
                            <PhoneCall className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <Input aria-label="Input field"
                            value={testNumber}
                            onChange={(e) => setTestNumber(e.target.value)}
                            placeholder="+356 9999 0000"
                            className="bg-black/20 border-border flex-1"
                        />
                        <Button
                            onClick={() => testCallMutation.mutate()}
                            disabled={!testNumber.trim() || !vapiStatus.active_assistant_id || testCallMutation.isPending}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                        >
                            {testCallMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <PhoneCall className="w-4 h-4" />}
                            Call
                        </Button>
                    </div>
                    {!vapiStatus.active_assistant_id && (
                        <p className="text-[10px] text-amber-400 mt-2 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> Sync an assistant first (Step 1)
                        </p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

/* ========== Main Settings Page ========== */
export default function VoiceSettings() {
    const { activeVenueId } = useVenue();
    const { user, isManager, isOwner } = useAuth();
    const queryClient = useQueryClient();
    const fileInputRef = useRef(null);
    const navigate = useNavigate();
    const location = useLocation();

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
    const [voiceProvider, setVoiceProvider] = useState(config?.voice_provider || 'google');
    const [language, setLanguage] = useState(config?.language || 'en');
    const [phoneNumber, setPhoneNumber] = useState(config?.phone_number || '+356 2100 0001');

    // Sync state when config loads
    useEffect(() => {
        if (config) {
            setPersona(config.persona || 'British Butler');
            setVoiceSpeed([config.voice_speed || 1.0]);
            setAutoReservations(config.auto_reservations ?? true);
            setCallTransfer(config.call_transfer ?? true);
            setSmsConfirmation(config.sms_confirmation ?? true);
            setGreeting(config.greeting || "Good evening, welcome to Restin. How may I assist you today?");
            setVoiceProvider(config.voice_provider || 'google');
            setLanguage(config.language || 'en');
            setPhoneNumber(config.phone_number || '+356 2100 0001');
        }
    }, [config]);

    const saveMutation = useMutation({
        mutationFn: (data) => voiceService.updateConfig(activeVenueId || 'default', data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['voice-config'] });
            toast.success("Voice configuration saved");
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
        if (isPlaying) { window.speechSynthesis.cancel(); setIsPlaying(false); return; }

        const utterance = new SpeechSynthesisUtterance(greeting);
        utterance.rate = voiceSpeed[0];
        const voices = window.speechSynthesis.getVoices();
        let selectedVoice = voices.find(v => v.lang.includes('en'));
        if (persona === 'British Butler') selectedVoice = voices.find(v => v.lang.includes('GB')) || selectedVoice;
        else if (persona === 'Casual American') selectedVoice = voices.find(v => v.lang.includes('US')) || selectedVoice;
        if (selectedVoice) utterance.voice = selectedVoice;
        utterance.onstart = () => setIsPlaying(true);
        utterance.onend = () => setIsPlaying(false);
        utterance.onerror = () => setIsPlaying(false);
        window.speechSynthesis.speak(utterance);
    };

    const handleSave = () => {
        saveMutation.mutate({
            persona, greeting,
            voice_speed: voiceSpeed[0],
            auto_reservations: autoReservations,
            call_transfer: callTransfer,
            sms_confirmation: smsConfirmation,
            voice_provider: voiceProvider,
            language,
            phone_number: phoneNumber,
        });
    };

    const handleFileUpload = (e) => {
        const file = e.target.files?.[0];
        if (file) uploadMutation.mutate(file);
    };

    const activeTab = location.pathname.includes('/settings') ? 'settings'
        : location.pathname.includes('/logs') ? 'logs' : 'dashboard';

    return (
        <div className="flex flex-col gap-6 animate-in zoom-in duration-500">
            {/* ── Tab Navigation ── */}
            <div className="flex items-center gap-1 bg-card/30 p-1 rounded-xl border border-border w-fit">
                {TABS.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => navigate(tab.path)}
                        className={cn(
                            'px-5 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all',
                            activeTab === tab.id
                                ? 'bg-red-600 text-white shadow-lg shadow-red-600/20'
                                : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                        )}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Agent Identity */}
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
                                    {PERSONA_OPTIONS.map((p) => (
                                        <div key={p.id} onClick={() => setPersona(p.id)}
                                            className={cn(
                                                'p-4 rounded-lg border cursor-pointer transition-all',
                                                persona === p.id ? 'bg-purple-500/10 border-purple-500 text-purple-400' : 'bg-black/20 border-border hover:border-border/80'
                                            )}>
                                            <div className="text-xl mb-1">{p.icon}</div>
                                            <div className="font-bold text-sm">{p.id}</div>
                                            <div className="text-[10px] text-muted-foreground">{p.desc}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <Label>Opening Greeting</Label>
                                    <Button variant="outline" size="sm" onClick={handlePreview}
                                        className={cn(
                                            'h-8 gap-2 border-purple-500/30 hover:bg-purple-500/10 hover:text-purple-400',
                                            isPlaying ? 'text-purple-400 animate-pulse' : 'text-muted-foreground'
                                        )}>
                                        <Mic className="w-3 h-3" />
                                        {isPlaying ? "Playing..." : "Test Voice"}
                                    </Button>
                                </div>
                                <Textarea aria-label="Input field" value={greeting} onChange={(e) => setGreeting(e.target.value)}
                                    className="bg-black/20 border-border min-h-20" />
                            </div>

                            <div className="space-y-4">
                                <Label>Speaking Rate ({voiceSpeed[0]}x)</Label>
                                <Slider defaultValue={[1.0]} max={2.0} min={0.5} step={0.1}
                                    value={voiceSpeed} onValueChange={setVoiceSpeed} className="py-4" />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Voice Provider */}
                    <Card className="bg-card border-border">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Volume2 className="w-5 h-5 text-blue-400" />
                                Voice Provider
                            </CardTitle>
                            <CardDescription>Choose the engine for your AI receptionist.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {PROVIDER_OPTIONS.map((p) => (
                                    <div key={p.value} onClick={() => setVoiceProvider(p.value)}
                                        className={cn(
                                            'p-4 rounded-xl border cursor-pointer transition-all',
                                            voiceProvider === p.value ? 'bg-blue-500/10 border-blue-500' : 'bg-black/20 border-border hover:border-border/80'
                                        )}>
                                        <div className="text-xl mb-1">{p.icon}</div>
                                        <div className={cn('font-bold text-sm', voiceProvider === p.value ? 'text-blue-400' : 'text-foreground')}>{p.label}</div>
                                        <p className="text-[10px] text-muted-foreground mt-1">{p.desc}</p>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* ── VAPI CONFIG PANEL (conditional) ── */}
                    {voiceProvider === 'vapi' && activeVenueId && (
                        <VapiConfigPanel venueId={activeVenueId} />
                    )}

                    {/* Language & Phone */}
                    <Card className="bg-card border-border">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Globe className="w-5 h-5 text-emerald-400" />
                                Language & Phone
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-2">
                                <Label>Voice Language</Label>
                                <div className="flex gap-3">
                                    {LANGUAGE_OPTIONS.map(l => (
                                        <button key={l.value} onClick={() => setLanguage(l.value)}
                                            className={cn(
                                                'flex items-center gap-2 px-4 py-2 rounded-lg border transition-all',
                                                language === l.value ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400' : 'bg-black/20 border-border text-muted-foreground hover:border-border/80'
                                            )}>
                                            <span className="text-lg">{l.flag}</span>
                                            <span className="text-xs font-bold">{l.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                            {voiceProvider !== 'vapi' && (
                                <div className="space-y-2">
                                    <Label>Phone Number</Label>
                                    <div className="flex gap-3">
                                        <div className="flex items-center gap-2 px-3 bg-black/20 border border-border rounded-lg">
                                            <PhoneIcon className="w-4 h-4 text-muted-foreground" />
                                        </div>
                                        <Input aria-label="Input field" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)}
                                            className="bg-black/20 border-border flex-1" placeholder="+356 2100 0001" />
                                    </div>
                                    <p className="text-[10px] text-muted-foreground">The number your AI receptionist answers on.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Knowledge Base */}
                    <Card className="bg-card border-border">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <FileText className="w-5 h-5 text-blue-400" />
                                Knowledge Base (RAG)
                            </CardTitle>
                            <CardDescription>Upload menus and policies for the AI to reference.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <input aria-label="Input" type="file" ref={fileInputRef} onChange={handleFileUpload}
                                accept=".pdf,.txt,.doc,.docx" className="hidden" aria-label="Upload knowledge base file" />
                            <div onClick={() => fileInputRef.current?.click()}
                                className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:bg-card/50 transition-colors cursor-pointer">
                                <div className="w-12 h-12 bg-secondary rounded-full flex items-center justify-center mx-auto mb-4">
                                    {uploadMutation.isPending ? <Loader2 className="w-6 h-6 text-purple-400 animate-spin" /> : <Upload className="w-6 h-6 text-muted-foreground" />}
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
                                            <span className="text-xs text-green-600 dark:text-green-400 bg-green-500/10 px-2 py-1 rounded">{doc.status || 'Indexed'}</span>
                                            <Button size="icon" aria-label="Action" variant="ghost"
                                                onClick={() = aria-label="Action"> deleteMutation.mutate(doc.id)}
                                                className="h-7 w-7 text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Trash2 className="w-3 h-3" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                                {knowledge.length === 0 && (
                                    <p className="text-xs text-muted-foreground text-center py-4">{"No "}documents uploaded yet.</p>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column */}
                <div className="space-y-6">
                    <Card className="bg-card border-border">
                        <CardHeader>
                            <CardTitle className="text-sm uppercase tracking-widest text-muted-foreground">Capabilities</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label>Auto-Reservations</Label>
                                    <p className="text-xs text-muted-foreground">Allow AI to book tables</p>
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
                        <Button onClick={handleSave} disabled={saveMutation.isPending}
                            className="w-full bg-red-600 hover:bg-red-700 text-foreground font-bold h-12 gap-2">
                            {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : saveMutation.isSuccess ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                            {saveMutation.isPending ? 'Saving...' : saveMutation.isSuccess ? 'Saved!' : 'Save Configuration'}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
