import React, { useState } from 'react';
import PageContainer from '../../../layouts/PageContainer';
import { Card, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Image, Video, Wand2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

// Mock Assets Library
const MOCK_ASSETS = [
    { id: 1, type: 'image', url: 'https://images.unsplash.com/photo-1546241072-48010ad2862c?q=80&w=300', tag: 'Bowl' },
    { id: 2, type: 'image', url: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?q=80&w=300', tag: 'Pizza' },
    { id: 3, type: 'video', url: '', tag: 'Chef Reel' }
];

export default function StudioDashboard() {
    const [isGenerating, setIsGenerating] = useState(false);

    const handleGenerate = () => {
        setIsGenerating(true);
        // Mock API call to Google Imagen 3
        setTimeout(() => {
            setIsGenerating(false);
            toast.success("Generated 4 variations of 'Spicy Tuna Tartare'");
        }, 3000);
    };

    return (
        <PageContainer title="The Studio" description="Generative AI Content Creation">
            <div className="grid grid-cols-12 gap-6">
                {/* Generator Controls */}
                <div className="col-span-4 space-y-4">
                    <Card className="bg-zinc-900 border-white/5">
                        <CardContent className="p-6">
                            <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-purple-500" /> New Generation
                            </h3>
                            <div className="space-y-4">
                                <textarea
                                    className="w-full bg-zinc-950 border border-white/10 rounded-lg p-3 text-sm text-white h-32 resize-none focus:ring-1 focus:ring-purple-500"
                                    placeholder="Describe the food photo you want... e.g. 'cinematic shot of wagyu burger, steam rising, dark moody lighting'"
                                />
                                <Button
                                    onClick={handleGenerate}
                                    disabled={isGenerating}
                                    className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold"
                                >
                                    {isGenerating ? <Wand2 className="w-4 h-4 mr-2 animate-spin" /> : <Wand2 className="w-4 h-4 mr-2" />}
                                    {isGenerating ? 'Dreaming...' : 'Generate with Imagen 3'}
                                </Button>
                                <p className="text-xs text-zinc-500 text-center">Cost: €0.04 per image</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Asset Library */}
                <div className="col-span-8">
                    <div className="grid grid-cols-3 gap-4">
                        {MOCK_ASSETS.map((asset) => (
                            <div key={asset.id} className="aspect-square bg-zinc-800 rounded-xl overflow-hidden relative group border border-white/5">
                                {asset.type === 'image' ? (
                                    <img src={asset.url} alt={asset.tag} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="flex items-center justify-center h-full w-full">
                                        <Video className="w-8 h-8 text-zinc-600" />
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                    <Button size="sm" variant="secondary">Edit</Button>
                                    <Button size="sm" variant="secondary">Post</Button>
                                </div>
                                <span className="absolute bottom-2 left-2 text-xs font-bold text-white shadow-black drop-shadow-md">{asset.tag}</span>
                            </div>
                        ))}
                        {/* Placeholder for new generation */}
                        {isGenerating && (
                            <div className="aspect-square bg-zinc-900 rounded-xl border border-dashed border-purple-500/50 flex flex-col items-center justify-center animate-pulse">
                                <Sparkles className="w-8 h-8 text-purple-500 mb-2" />
                                <span className="text-xs text-purple-400">Rendering...</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </PageContainer>
    );
}
