import React from 'react';
import { Wand2, Image, FileText, Sparkles, Zap } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';

/**
 * 🎨 STUDIO - AI Content Generation (Pillar 5)
 */
export default function Studio() {
    return (
        <div className="p-6 space-y-6">
            <Card className="bg-gradient-to-br from-purple-900/20 to-black border-purple-500/20">
                <CardHeader>
                    <div className="flex items-center gap-4">
                        <div className="p-4 bg-purple-600/20 rounded-xl">
                            <Wand2 size={32} className="text-purple-500" />
                        </div>
                        <div>
                            <CardTitle className="text-3xl font-black text-white italic">CONTENT STUDIO</CardTitle>
                            <p className="text-zinc-500 font-bold text-sm mt-1">AI-Powered Media Generation</p>
                        </div>
                    </div>
                </CardHeader>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-zinc-900/30 border-zinc-800 hover:border-purple-500/30 transition-all cursor-pointer group">
                    <CardContent className="p-8 text-center">
                        <Image size={48} className="mx-auto mb-4 text-purple-500 group-hover:scale-110 transition-transform" />
                        <h3 className="text-xl font-black text-white mb-2">Generate Images</h3>
                        <p className="text-sm text-zinc-500">Create food photography with Imagen 3</p>
                        <Button className="mt-4 w-full bg-purple-600 hover:bg-purple-700">
                            <Sparkles size={16} className="mr-2" /> Create Image
                        </Button>
                    </CardContent>
                </Card>

                <Card className="bg-zinc-900/30 border-zinc-800 hover:border-purple-500/30 transition-all cursor-pointer group">
                    <CardContent className="p-8 text-center">
                        <FileText size={48} className="mx-auto mb-4 text-purple-500 group-hover:scale-110 transition-transform" />
                        <h3 className="text-xl font-black text-white mb-2">Write Content</h3>
                        <p className="text-sm text-zinc-500">Generate menu descriptions</p>
                        <Button className="mt-4 w-full bg-purple-600 hover:bg-purple-700">
                            <Zap size={16} className="mr-2" /> Generate Text
                        </Button>
                    </CardContent>
                </Card>

                <Card className="bg-zinc-900/30 border-zinc-800 hover:border-purple-500/30 transition-all cursor-pointer group">
                    <CardContent className="p-8 text-center">
                        <Sparkles size={48} className="mx-auto mb-4 text-purple-500 group-hover:scale-110 transition-transform" />
                        <h3 className="text-xl font-black text-white mb-2">Social Media</h3>
                        <p className="text-sm text-zinc-500">Create posts & campaigns</p>
                        <Button className="mt-4 w-full bg-purple-600 hover:bg-purple-700">
                            <Wand2 size={16} className="mr-2" /> Auto-Generate
                        </Button>
                    </CardContent>
                </Card>
            </div>

            <Card className="bg-zinc-900/10 border-zinc-800">
                <CardHeader>
                    <CardTitle>Recent Generated Content</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-center text-zinc-500 py-8">
                        <Sparkles size={48} className="mx-auto mb-4 text-zinc-700" />
                        <p className="font-medium">No content generated yet</p>
                        <p className="text-sm mt-1">Start creating AI-powered media above</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
