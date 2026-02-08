import React from 'react';
import { Globe, Layout, Code, Eye, Smartphone } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';

/**
 * 🌐 WEB BUILDER - Website & Menu Management
 */
export default function WebBuilder() {
    return (
        <div className="p-6 space-y-6">
            <Card className="bg-gradient-to-br from-blue-900/20 to-black border-blue-500/20">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-4 bg-blue-600/20 rounded-xl">
                                <Globe size={32} className="text-blue-500" />
                            </div>
                            <div>
                                <CardTitle className="text-3xl font-black text-white italic">WEB BUILDER</CardTitle>
                                <p className="text-zinc-500 font-bold text-sm mt-1">Digital Menu & Website</p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline"><Eye size={16} className="mr-2" /> Preview</Button>
                            <Button className="bg-blue-600 hover:bg-blue-700">Publish</Button>
                        </div>
                    </div>
                </CardHeader>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="bg-zinc-900/30 border-zinc-800">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Layout size={20} /> Page Builder
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="aspect-video bg-zinc-950/50 rounded-lg border border-zinc-800 flex items-center justify-center">
                            <div className="text-center">
                                <Code size={48} className="mx-auto mb-4 text-zinc-700" />
                                <p className="text-zinc-500 font-medium">Drag & Drop Editor</p>
                                <p className="text-sm text-zinc-600 mt-1">Coming soon</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-zinc-900/30 border-zinc-800">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Smartphone size={20} /> Live Preview
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="aspect-video bg-zinc-950/50 rounded-lg border border-zinc-800 flex items-center justify-center">
                            <div className="text-center">
                                <Eye size={48} className="mx-auto mb-4 text-zinc-700" />
                                <p className="text-zinc-500 font-medium">Mobile & Desktop Preview</p>
                                <p className="text-sm text-zinc-600 mt-1">Real-time sync</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
