import React, { useState } from 'react';
import PageContainer from '../../../layouts/PageContainer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Switch } from '../../../components/ui/switch';
import { Slider } from '../../../components/ui/slider';
import { Textarea } from '../../../components/ui/textarea';
import { Save, Mic, Upload, FileText, Bot } from 'lucide-react';
import { toast } from 'sonner';

export default function VoiceSettings() {
    const [persona, setPersona] = useState('British Butler');
    const [voiceSpeed, setVoiceSpeed] = useState([1.0]);
    const [autoReservations, setAutoReservations] = useState(true);
    const [greeting, setGreeting] = useState("Good evening, welcome to Restin. How may I assist you today?");
    const [isPlaying, setIsPlaying] = useState(false);

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

        // Simple voice selection heuristic
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
        toast.success("Voice configuration saved successfully");
    };

    return (
        <PageContainer title="Voice AI Configuration" description="Customize your AI Receptionist's personality and knowledge">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Left Column: Personality */}
                <div className="lg:col-span-2 space-y-6">
                    <Card className="bg-zinc-900 border-white/10">
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
                                            className={`p-4 rounded-lg border cursor-pointer transition-all ${persona === p ? 'bg-purple-500/10 border-purple-500 text-purple-400' : 'bg-black/20 border-white/5 hover:border-white/10'}`}
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
                                        className={`h-8 gap-2 border-purple-500/30 hover:bg-purple-500/10 hover:text-purple-400 ${isPlaying ? 'text-purple-400 animate-pulse' : 'text-zinc-400'}`}
                                    >
                                        <Mic className="w-3 h-3" />
                                        {isPlaying ? "Playing..." : "Test Voice"}
                                    </Button>
                                </div>
                                <Textarea
                                    value={greeting}
                                    onChange={(e) => setGreeting(e.target.value)}
                                    className="bg-black/20 border-white/10 min-h-[80px]"
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

                    <Card className="bg-zinc-900 border-white/10">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <FileText className="w-5 h-5 text-blue-400" />
                                Knowledge Base (RAG)
                            </CardTitle>
                            <CardDescription>Upload menus and policy documents for the AI to reference.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="border-2 border-dashed border-zinc-800 rounded-xl p-8 text-center hover:bg-zinc-900/50 transition-colors cursor-pointer">
                                <div className="w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Upload className="w-6 h-6 text-zinc-400" />
                                </div>
                                <h3 className="text-sm font-bold text-white mb-1">Upload PDF Menu or Policy</h3>
                                <p className="text-xs text-zinc-500">Drag and drop or click to browse</p>
                            </div>

                            <div className="mt-6 space-y-3">
                                <div className="flex items-center justify-between p-3 bg-black/20 rounded-lg border border-white/5">
                                    <div className="flex items-center gap-3">
                                        <FileText className="w-4 h-4 text-green-500" />
                                        <span className="text-sm text-zinc-300">Dinner_Menu_Winter_2026.pdf</span>
                                    </div>
                                    <span className="text-xs text-green-500 bg-green-500/10 px-2 py-1 rounded">Indexed</span>
                                </div>
                                <div className="flex items-center justify-between p-3 bg-black/20 rounded-lg border border-white/5">
                                    <div className="flex items-center gap-3">
                                        <FileText className="w-4 h-4 text-green-500" />
                                        <span className="text-sm text-zinc-300">Reservation_Policy.pdf</span>
                                    </div>
                                    <span className="text-xs text-green-500 bg-green-500/10 px-2 py-1 rounded">Indexed</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column: Capabilities */}
                <div className="space-y-6">
                    <Card className="bg-zinc-900 border-white/10">
                        <CardHeader>
                            <CardTitle className="text-sm uppercase tracking-widest text-zinc-500">Capabilities</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label>Auto-Reservations</Label>
                                    <p className="text-xs text-zinc-500">Allow AI to book tables directly</p>
                                </div>
                                <Switch checked={autoReservations} onCheckedChange={setAutoReservations} />
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label>Call Transfer</Label>
                                    <p className="text-xs text-zinc-500">Forward to human if confused</p>
                                </div>
                                <Switch checked={true} />
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label>SMS Confirmation</Label>
                                    <p className="text-xs text-zinc-500">Send text after call</p>
                                </div>
                                <Switch checked={true} />
                            </div>
                        </CardContent>
                    </Card>

                    <div className="sticky top-6">
                        <Button onClick={handleSave} className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold h-12">
                            <Save className="w-4 h-4 mr-2" /> Save Configuration
                        </Button>
                    </div>
                </div>
            </div>
        </PageContainer>
    );
}
