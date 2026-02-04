'use client';

import React, { useState } from 'react';
import PageContainer from '@/components/layout/PageContainer';
import { Button } from '@antigravity/ui';
import { Badge } from '@antigravity/ui';
import {
    Monitor, Smartphone, Wifi, WifiOff, Plus,
    ShieldCheck, ShieldAlert, Laptop
} from 'lucide-react';
import { toast } from 'sonner';

export default function DevicesPage() {
    const [devices, setDevices] = useState([
        { id: '1', name: 'Main POS 1', type: 'POS', ip: '192.168.1.101', trusted: true, online: true },
        { id: '2', name: 'Terrace Tablet', type: 'TABLET', ip: '192.168.1.105', trusted: true, online: true },
        { id: '3', name: 'Kitchen Screen 1', type: 'KDS', ip: '192.168.1.110', trusted: true, online: false },
        { id: '4', name: 'Unknown Device', type: 'UNKNOWN', ip: '192.168.1.144', trusted: false, online: true },
    ]);

    const [pairingCode, setPairingCode] = useState<string | null>(null);

    const generateCode = () => {
        const code = Math.floor(1000 + Math.random() * 9000).toString();
        setPairingCode(code);
        toast.info(`Pairing Code Generated: ${code}`);
    };

    const toggleTrust = (id: string) => {
        setDevices(prev => prev.map(d => {
            if (d.id === id) {
                const newTrust = !d.trusted;
                toast[newTrust ? 'success' : 'warning'](`Device ${newTrust ? 'Trusted' : 'Untrusted'}`);
                return { ...d, trusted: newTrust };
            }
            return d;
        }));
    };

    return (
        <PageContainer title="Device Registry" description="Hardware Access Control">

            {/* Pairing Section */}
            <div className="bg-blue-900/10 border border-blue-900/30 p-6 rounded-xl mb-8 flex items-center justify-between">
                <div>
                    <h2 className="text-blue-400 font-bold text-lg mb-1">Pair New Device</h2>
                    <p className="text-blue-500/60 text-sm">Generate a 4-digit code to connect a new POS or KDS screen.</p>
                </div>
                <div className="flex items-center gap-6">
                    {pairingCode && (
                        <div className="text-center">
                            <span className="block text-[10px] font-bold text-blue-500 uppercase tracking-widest">Active Code</span>
                            <span className="text-4xl font-black text-white font-mono tracking-widest">{pairingCode}</span>
                        </div>
                    )}
                    <Button onClick={generateCode} className="bg-blue-600 hover:bg-blue-500 text-white font-bold h-12 px-6">
                        <Plus className="h-4 w-4 mr-2" /> Generate Code
                    </Button>
                </div>
            </div>

            {/* Devices List */}
            <div className="space-y-4">
                {devices.map(device => (
                    <div key={device.id} className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl flex items-center justify-between group hover:border-zinc-700 transition-all">
                        <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-lg ${device.online ? 'bg-zinc-800' : 'bg-red-900/10'}`}>
                                {device.type === 'POS' && <Laptop className={`h-6 w-6 ${device.online ? 'text-zinc-400' : 'text-red-500'}`} />}
                                {device.type === 'TABLET' && <Smartphone className={`h-6 w-6 ${device.online ? 'text-zinc-400' : 'text-red-500'}`} />}
                                {(device.type === 'KDS' || device.type === 'UNKNOWN') && <Monitor className={`h-6 w-6 ${device.online ? 'text-zinc-400' : 'text-red-500'}`} />}
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="font-bold text-white">{device.name}</h3>
                                    {device.online ?
                                        <Badge className="bg-emerald-900/20 text-emerald-500 border-none px-1.5 py-0 h-5 text-[10px]">ONLINE</Badge> :
                                        <Badge className="bg-red-900/20 text-red-500 border-none px-1.5 py-0 h-5 text-[10px]">OFFLINE</Badge>
                                    }
                                </div>
                                <div className="flex items-center gap-2 text-xs text-zinc-500 font-mono mt-1">
                                    <span>{device.ip}</span>
                                    <span>•</span>
                                    <span>{device.type}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => toggleTrust(device.id)}
                                className={device.trusted
                                    ? "border-emerald-900/30 text-emerald-500 hover:bg-emerald-900/20 hover:text-emerald-400"
                                    : "border-zinc-800 text-zinc-500 hover:text-white"
                                }
                            >
                                {device.trusted ? (
                                    <>
                                        <ShieldCheck className="h-4 w-4 mr-2" /> Trusted
                                    </>
                                ) : (
                                    <>
                                        <ShieldAlert className="h-4 w-4 mr-2" /> Untrusted
                                    </>
                                )}
                            </Button>
                            <Button variant="ghost" size="sm" className="text-zinc-600 hover:text-red-500 hover:bg-red-900/10">Remove</Button>
                        </div>
                    </div>
                ))}
            </div>
        </PageContainer>
    );
}
