import React, { useState } from 'react';
import PageContainer from '../../../layouts/PageContainer';
import { Card, CardContent } from '../../../components/ui/card';
import { Switch } from '../../../components/ui/switch';
import { Mic, Phone, Volume2, Activity } from 'lucide-react';

export default function VoiceDashboard() {
    const [isActive, setIsActive] = useState(false);

    return (
        <PageContainer title="Voice AI Receptionist" description="24/7 Phone Handling & Reservations">
            <div className="grid grid-cols-3 gap-6">
                {/* Status Card */}
                <div onClick={() => window.location.href = '/admin/restin/voice/settings'} className="cursor-pointer group">
                    <Card className="bg-zinc-900 border-purple-500/20 shadow-lg shadow-purple-900/10 h-full group-hover:border-purple-500/50 transition-colors">
                        <CardContent className="p-6">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-zinc-400 text-sm">Status</p>
                                    <h2 className={`text-2xl font-bold ${isActive ? 'text-green-400' : 'text-zinc-500'}`}>
                                        {isActive ? 'Active & Listening' : 'Offline'}
                                    </h2>
                                </div>
                                <div onClick={(e) => e.stopPropagation()}>
                                    <Switch checked={isActive} onCheckedChange={setIsActive} className="data-[state=checked]:bg-green-500" />
                                </div>
                            </div>

                            <div className="mt-6 flex items-center gap-3 text-xs text-zinc-500">
                                <Activity className="w-4 h-4" />
                                <span className="group-hover:text-purple-400 transition-colors">Click to configure</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Config Card */}
                <div onClick={() => window.location.href = '/admin/restin/voice/settings'} className="cursor-pointer group">
                    <Card className="bg-zinc-900 border-white/5 h-full group-hover:border-white/20 transition-colors">
                        <CardContent className="p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                                    <Mic className="w-5 h-5 text-purple-400" />
                                </div>
                                <div>
                                    <p className="text-white font-bold">Persona</p>
                                    <p className="text-zinc-400 text-xs text-blue-300">British Butler</p>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <div className="h-2 bg-zinc-800 rounded-full w-full overflow-hidden">
                                    <div className="h-full bg-purple-500 w-[65%]" />
                                </div>
                                <p className="text-xs text-zinc-500 text-right group-hover:text-white transition-colors">Knowledge Base: 65% Trained</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Stats Card */}
                <div onClick={() => window.location.href = '/admin/restin/voice/logs'} className="cursor-pointer group">
                    <Card className="bg-zinc-900 border-white/5 h-full group-hover:border-white/20 transition-colors">
                        <CardContent className="p-6">
                            <p className="text-zinc-400 text-sm">Calls Handled Today</p>
                            <h2 className="text-3xl font-bold text-white mt-2">42</h2>
                            <p className="text-green-500 text-xs mt-1 flex items-center gap-1 group-hover:underline">
                                <Phone className="w-3 h-3" /> View detailed logs
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </div>

            <div className="mt-8 bg-zinc-900 rounded-xl border border-white/5 p-6 min-h-[400px]">
                <h3 className="text-white font-bold mb-4">Live Call Transcript</h3>
                <div className="text-center text-zinc-500 py-20 italic">
                    Waiting for incoming calls...
                </div>
            </div>
        </PageContainer>
    );
}
