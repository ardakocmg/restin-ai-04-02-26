'use client';

import React, { useState, useEffect } from 'react';
import PageContainer from '@/components/layout/PageContainer';
import { Card, CardContent, CardHeader, CardTitle, Button, Input, ScrollArea, Avatar, Badge, Textarea } from '@antigravity/ui';
import { Mic, Send, Users, Hash, Volume2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

export default function HiveMindChat() {
    const [messages, setMessages] = useState<any[]>([]);
    const [inputText, setInputText] = useState("");
    const [isTalking, setIsTalking] = useState(false);
    const [activeChannel, setActiveChannel] = useState("kitchen");
    const [isTyping, setIsTyping] = useState(false);

    // Mock Channels
    const channels = [
        { id: "general", name: "General", type: "text" },
        { id: "kitchen", name: "Kitchen", type: "voice" },
        { id: "service", name: "Service", type: "text" },
        { id: "ai-copilot", name: "AI Copilot", type: "ai" },
        { id: "managers", name: "Managers", type: "private" },
    ];

    useEffect(() => {
        // Mock incoming messages
        setMessages([
            { id: 1, user: "Chef Mike", text: "Order #123 is ready!", type: "text", time: "10:30 AM" },
            { id: 2, user: "Sarah (Waiter)", text: "Hold on, guest allergy check.", type: "text", time: "10:31 AM" },
            { id: 3, user: "Manager", text: "Voice Note: Table 5 VIP arrival.", type: "voice", time: "10:35 AM", duration: "12s" },
            { id: 4, user: "Restin AI", text: "I'm ready to help with Sales, Inventory, or Staffing questions.", type: "text", time: "10:36 AM", channel: "ai-copilot" },
        ]);
        if (activeChannel === 'ai-copilot') {
            setMessages(prev => prev.filter(m => m.channel === 'ai-copilot' || m.channel === undefined));
        }
    }, [activeChannel]);

    const getAIResponse = (query: string) => {
        const q = query.toLowerCase();
        if (q.includes("sales") || q.includes("revenue") || q.includes("how much")) {
            return "💰 **Sales Update:**\nToday we've done **€1,250.50** across 42 orders.\nTrending **+12%** vs last week.";
        }
        if (q.includes("staff") || q.includes("who")) {
            return "👨‍🍳 **Team Status:**\n- **Kitchen:** Marco, Giovanni (Busy)\n- **Floor:** Sarah, Mike\n\nLabor Cost is currently **18%** (Optimal).";
        }
        if (q.includes("stock") || q.includes("inventory")) {
            return "⚠️ **Low Stock Alert:**\n- **Truffle Oil:** 2 Bottles left\n- **Wagyu Beef:** 1.5kg left\n\nI've drafted a PO for Supplier A.";
        }
        return "I can help with Sales, Staffing, or Inventory. Try asking 'How are sales?'";
    };

    const handleSend = () => {
        if (!inputText.trim()) return;
        const newMsg = {
            id: Date.now(),
            user: "You",
            text: inputText,
            type: "text",
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            channel: activeChannel
        };
        setMessages(prev => [...prev, newMsg]);
        const question = inputText;
        setInputText("");

        // AI Response Simulation
        if (activeChannel === 'ai-copilot') {
            setIsTyping(true);
            setTimeout(() => {
                const aiMsg = {
                    id: Date.now() + 1,
                    user: "Restin AI",
                    text: getAIResponse(question),
                    type: "text",
                    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    channel: "ai-copilot",
                    isAI: true
                };
                setMessages(prev => [...prev, aiMsg]);
                setIsTyping(false);
            }, 1000);
        }
    };

    const togglePTT = () => {
        if (!isTalking) {
            setIsTalking(true);
            toast.info("Walkie Talkie Active", { description: "Release to send..." });
            // Simulate recording start
        } else {
            setIsTalking(false);
            toast.success("Voice Note Sent", { description: "Broadcasted to #Kitchen" });
            const newMsg = {
                id: Date.now(),
                user: "You",
                text: "Voice Note",
                type: "voice",
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                duration: "5s"
            };
            setMessages([...messages, newMsg]);
        }
    };

    const filteredMessages = messages.filter(m =>
        (activeChannel === 'ai-copilot' && (m.channel === 'ai-copilot')) ||
        (activeChannel !== 'ai-copilot' && m.channel !== 'ai-copilot')
    );

    return (
        <PageContainer title="Hive Mind" description="Team Comms & AI Copilot">
            <div className="flex gap-6 h-[calc(100vh-200px)]">
                {/* Channel List */}
                <div className="w-64 flex-shrink-0 flex flex-col gap-2">
                    {channels.map(ch => (
                        <Button
                            key={ch.id}
                            variant={activeChannel === ch.id ? "default" : "outline"}
                            className={`justify-start ${activeChannel === ch.id ? 'bg-zinc-800' : 'bg-transparent border-zinc-800 text-zinc-400'}`}
                            onClick={() => setActiveChannel(ch.id)}
                        >
                            {ch.type === 'voice' ? <Volume2 className="h-4 w-4 mr-2 text-emerald-500" /> :
                                ch.type === 'ai' ? <Sparkles className="h-4 w-4 mr-2 text-purple-500" /> :
                                    <Hash className="h-4 w-4 mr-2 text-zinc-500" />}
                            {ch.name}
                        </Button>
                    ))}

                    <div className="mt-auto p-4 bg-zinc-900 rounded-lg border border-zinc-900">
                        <h4 className="text-xs font-bold text-zinc-500 mb-2 uppercase">Online Staff</h4>
                        <div className="flex -space-x-2">
                            <div className="h-8 w-8 rounded-full bg-blue-500 border-2 border-black flex items-center justify-center text-xs">A</div>
                            <div className="h-8 w-8 rounded-full bg-green-500 border-2 border-black flex items-center justify-center text-xs">B</div>
                            <div className="h-8 w-8 rounded-full bg-purple-500 border-2 border-black flex items-center justify-center text-xs">C</div>
                            <div className="h-8 w-8 rounded-full bg-zinc-700 border-2 border-black flex items-center justify-center text-xs text-zinc-400">+4</div>
                        </div>
                    </div>
                </div>

                {/* Chat Area */}
                <div className="flex-1 flex flex-col bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                    <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-950/50">
                        <div className="flex items-center gap-2">
                            {activeChannel === 'ai-copilot' ? <Sparkles className="h-5 w-5 text-purple-500" /> : <Hash className="h-5 w-5 text-zinc-400" />}
                            <h3 className="font-bold text-white uppercase">{activeChannel}</h3>
                        </div>
                        {activeChannel === 'kitchen' && (
                            <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">VOICE ACTIVE</Badge>
                        )}
                        {activeChannel === 'ai-copilot' && (
                            <Badge className="bg-purple-500/10 text-purple-500 border-purple-500/20">RAG ONLINE</Badge>
                        )}
                    </div>

                    <ScrollArea className="flex-1 p-4">
                        <div className="space-y-4">
                            {filteredMessages.map((msg) => (
                                <div key={msg.id} className={`flex gap-3 ${msg.user === 'You' ? 'flex-row-reverse' : ''}`}>
                                    <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${msg.user === 'You' ? 'bg-indigo-600' : msg.user === 'Restin AI' ? 'bg-purple-600' : 'bg-zinc-700'}`}>
                                        {msg.user.charAt(0)}
                                    </div>
                                    <div className={`max-w-[70%] p-3 rounded-2xl text-sm ${msg.user === 'You'
                                        ? 'bg-indigo-600 text-white rounded-tr-none'
                                        : msg.user === 'Restin AI' ? 'bg-purple-900/50 border border-purple-500/20 text-purple-100 rounded-tl-none' : 'bg-zinc-800 text-zinc-200 rounded-tl-none'
                                        }`}>
                                        <div className="flex justify-between items-baseline gap-4 mb-1">
                                            <span className="font-bold text-xs opacity-70">{msg.user}</span>
                                            <span className="text-[10px] opacity-50">{msg.time}</span>
                                        </div>
                                        {msg.type === 'voice' ? (
                                            <div className="flex items-center gap-2 bg-black/20 p-2 rounded-lg min-w-[120px]">
                                                <Button size="icon" variant="ghost" className="h-6 w-6 rounded-full bg-white/10 hover:bg-white/20">
                                                    <Volume2 className="h-3 w-3" />
                                                </Button>
                                                <div className="h-1 flex-1 bg-white/10 rounded-full overflow-hidden">
                                                    <div className="h-full w-1/3 bg-emerald-500 rounded-full" />
                                                </div>
                                                <span className="text-xs font-mono">{msg.duration}</span>
                                            </div>
                                        ) : (
                                            <div className="whitespace-pre-wrap">{msg.text}</div>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {isTyping && (
                                <div className="flex gap-3">
                                    <div className="h-8 w-8 rounded-full bg-purple-600 flex items-center justify-center text-xs font-bold flex-shrink-0">R</div>
                                    <div className="bg-purple-900/50 border border-purple-500/20 text-purple-100 rounded-2xl rounded-tl-none p-3 text-sm flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                        <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                        <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                    </div>
                                </div>
                            )}
                        </div>
                    </ScrollArea>

                    <div className="p-4 bg-zinc-950 border-t border-zinc-800">
                        <div className="flex gap-2 items-end">
                            <Button
                                variant={isTalking ? "destructive" : "secondary"}
                                className={`h-12 w-12 rounded-xl flex-shrink-0 transition-all ${isTalking ? 'animate-pulse scale-105 ring-4 ring-red-500/20' : ''}`}
                                onMouseDown={togglePTT}
                                onMouseUp={togglePTT}
                            >
                                <Mic className={`h-5 w-5 ${isTalking ? 'text-white' : 'text-zinc-400'}`} />
                            </Button>
                            <Input
                                placeholder={`Message #${activeChannel}...`}
                                className="h-12 bg-zinc-900 border-zinc-800"
                                value={inputText}
                                onChange={(e) => setInputText(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                            />
                            <Button className="h-12 w-12 rounded-xl" onClick={handleSend}>
                                <Send className="h-5 w-5" />
                            </Button>
                        </div>
                        <p className="text-[10px] text-zinc-500 text-center mt-2">
                            Hold <strong>Mic</strong> to speak (Walkie Talkie) • Enter to send
                        </p>
                    </div>
                </div>
            </div>
        </PageContainer>
    );
}
