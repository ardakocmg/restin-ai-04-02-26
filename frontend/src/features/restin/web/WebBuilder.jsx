import React, { useState } from 'react';
import PageContainer from '../../../layouts/PageContainer';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Globe, Layout, Upload } from 'lucide-react';

export default function WebBuilder() {
    const [isPublished, setIsPublished] = useState(false);

    return (
        <PageContainer title="Website Builder" description="Drag & Drop Digital Storefront">
            <div className="grid grid-cols-12 gap-6 h-[calc(100vh-200px)]">
                {/* Sidebar Controls */}
                <div className="col-span-3 bg-zinc-900 border border-white/5 rounded-xl p-4">
                    <div className="space-y-4">
                        <h3 className="text-white font-bold flex items-center gap-2">
                            <Layout className="w-4 h-4 text-purple-500" /> Sections
                        </h3>
                        <Button variant="outline" className="w-full justify-start text-zinc-300">Hero Section</Button>
                        <Button variant="outline" className="w-full justify-start text-zinc-300">Live Menu</Button>
                        <Button variant="outline" className="w-full justify-start text-zinc-300">About Us</Button>
                        <Button variant="outline" className="w-full justify-start text-zinc-300">Gallery</Button>

                        <div className="border-t border-white/10 pt-4 mt-4">
                            <Button className={`w-full ${isPublished ? 'bg-green-600' : 'bg-purple-600'}`}>
                                <Globe className="w-4 h-4 mr-2" />
                                {isPublished ? 'Published Live' : 'Publish Website'}
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Live Preview Canvas */}
                <div className="col-span-9 bg-white rounded-xl overflow-hidden shadow-2xl relative">
                    <div className="absolute top-0 left-0 w-full bg-zinc-100 p-2 flex justify-center border-b items-center gap-2">
                        <span className="text-xs text-zinc-500">restin.ai/demo-restaurant</span>
                    </div>
                    <div className="mt-8 p-8 flex flex-col items-center justify-center h-full text-zinc-400">
                        <p>Drag sections here to build your site</p>
                    </div>
                </div>
            </div>
        </PageContainer>
    );
}
