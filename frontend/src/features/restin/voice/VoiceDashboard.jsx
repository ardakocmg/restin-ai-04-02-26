import React, { useState } from 'react';
import {
    Mic, Settings, PhoneIncoming, Clock, Shield,
    Menu, BookOpen, UserPlus, Play, BarChart3,
    Calendar, MessageSquare, Volume2
} from 'lucide-react';
import { Card } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { cn } from '../../../lib/utils';

/**
 * 📞 VOICE AI DASHBOARD (Pillar 4)
 * Manage the 24/7 AI Receptionist & RAG Knowledge Base.
 */
export default function VoiceDashboard() {
    const [activeTab, setActiveTab] = useState('status');

    const activities = [
        { time: '2m ago', guest: '+356 9928 XXXX', action: 'Table for 4 confirmed', status: 'success' },
        { time: '15m ago', guest: '+356 7712 XXXX', action: 'Inquiry: Vegan options', status: 'info' },
        { time: '1h ago', guest: '+356 2134 XXXX', action: 'Opening hours query', status: 'info' },
    ];

    return (
        <div className="flex flex-col gap-8 animate-in zoom-in duration-500">
            {/* Top Banner: Status & Controls */}
            <Card className="bg-gradient-to-br from-zinc-900 to-black border-zinc-800 p-8 overflow-hidden relative group">
                <div className="absolute top-0 right-0 p-12 opacity-10 blur-2xl text-red-600">
                    <Mic size={200} />
                </div>

                <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                    <div className="flex items-center gap-6">
                        <div className="relative">
                            <div className="w-20 h-20 rounded-full bg-red-600/10 border border-red-500/20 flex items-center justify-center">
                                <Mic size={32} className="text-red-500 animate-pulse" />
                            </div>
                            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 border-4 border-black flex items-center justify-center">
                                <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
                            </div>
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-white italic tracking-tighter">VOICE RECEPTIONIST</h1>
                            <div className="flex items-center gap-3 mt-2">
                                <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Active Line: +356 2100 0001</span>
                                <div className="w-1 h-1 rounded-full bg-zinc-700"></div>
                                <span className="text-xs font-bold text-emerald-500 uppercase tracking-widest">Cloud Sync Active</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <Button variant="outline" className="h-12 border-zinc-800 text-white font-bold px-6 rounded-xl hover:bg-white/5 gap-2">
                            <Settings size={18} /> Voice Settings
                        </Button>
                        <Button className="h-12 bg-red-600 text-white font-black px-8 rounded-xl hover:bg-red-700 shadow-[0_10px_30px_rgba(220,38,38,0.3)] gap-2">
                            <Play size={18} /> Live Monitor
                        </Button>
                    </div>
                </div>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Knowledge Base Section (Left) */}
                <div className="lg:col-span-4 space-y-6">
                    <Card className="bg-zinc-900/30 border-zinc-800 p-6 backdrop-blur-lg">
                        <h3 className="text-lg font-black text-white italic mb-6 flex items-center gap-2">
                            <BookOpen size={20} className="text-red-500" />
                            KNOWLEDGE BASE (RAG)
                        </h3>
                        <div className="space-y-3">
                            {[
                                { name: 'Dinner Menu 2026.pdf', size: '1.2MB', date: 'Feb 4' },
                                { name: 'Allergen Policy.pdf', size: '0.4MB', date: 'Jan 22' },
                                { name: 'Cancellation Rules.pdf', size: '0.8MB', date: 'Feb 1' },
                            ].map((doc, i) => (
                                <div key={i} className="flex items-center justify-between p-3 bg-zinc-950/50 rounded-xl border border-zinc-800/50 group hover:border-zinc-700 transition-all">
                                    <div className="flex items-center gap-3 truncate">
                                        <Shield size={16} className="text-zinc-600 group-hover:text-red-500" />
                                        <span className="text-xs font-bold text-zinc-400 truncate">{doc.name}</span>
                                    </div>
                                    <span className="text-[10px] font-bold text-zinc-600 whitespace-nowrap">{doc.date}</span>
                                </div>
                            ))}
                            <Button variant="ghost" className="w-full mt-4 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] hover:text-white">
                                Upload New Policy +
                            </Button>
                        </div>
                    </Card>

                    <Card className="bg-gradient-to-br from-red-600/10 to-transparent border-red-500/10 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="text-xs font-black text-zinc-300 uppercase tracking-widest">AI Persona</h4>
                            <span className="text-[10px] font-black text-red-500">PRO MODE</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-red-600/20 rounded-xl">
                                <Volume2 className="text-red-500" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-white italic">"Professional & British"</p>
                                <p className="text-[10px] text-zinc-600 font-bold uppercase mt-1">Generated by ElevenLabs</p>
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Live Call Logs (Right) */}
                <div className="lg:col-span-8">
                    <Card className="bg-zinc-900/10 border-zinc-800 h-full flex flex-col">
                        <div className="p-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/20">
                            <h3 className="text-lg font-black text-white italic flex items-center gap-2">
                                <PhoneIncoming size={20} className="text-emerald-500" />
                                RECENT INTERACTIONS
                            </h3>
                            <div className="flex gap-2">
                                <Button variant="ghost" size="sm" className="text-xs font-bold text-zinc-500">Filter</Button>
                                <Button variant="ghost" size="sm" className="text-xs font-bold text-zinc-500">Export CSV</Button>
                            </div>
                        </div>

                        <div className="flex-1 p-6">
                            <div className="space-y-4">
                                {activities.map((log, i) => (
                                    <div key={i} className="flex items-center gap-6 p-4 bg-zinc-900/40 rounded-2xl border border-zinc-800/50 hover:bg-zinc-900/60 transition-all cursor-pointer group">
                                        <div className="p-3 bg-zinc-950 rounded-xl group-hover:scale-110 transition-transform">
                                            <MessageSquare size={18} className={cn(
                                                log.status === 'success' ? "text-emerald-500" : "text-blue-500"
                                            )} />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex justify-between items-start">
                                                <p className="font-black text-white">{log.guest}</p>
                                                <span className="text-[10px] font-bold text-zinc-600">{log.time}</span>
                                            </div>
                                            <p className="text-sm text-zinc-500 font-medium mt-1">{log.action}</p>
                                        </div>
                                        <ChevronRight size={18} className="text-zinc-800" />
                                    </div>
                                ))}
                            </div>

                            <div className="mt-8 grid grid-cols-2 gap-4">
                                <div className="p-4 bg-zinc-950/50 rounded-2xl border border-white/5">
                                    <BarChart3 className="text-zinc-600 mb-2" size={16} />
                                    <p className="text-2xl font-black text-white">84%</p>
                                    <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Resolution Rate</p>
                                </div>
                                <div className="p-4 bg-zinc-950/50 rounded-2xl border border-white/5">
                                    <Clock className="text-zinc-600 mb-2" size={16} />
                                    <p className="text-2xl font-black text-white">12s</p>
                                    <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Avg Response</p>
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}
