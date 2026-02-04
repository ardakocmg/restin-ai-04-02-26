'use client';

import React, { useState } from 'react';
import PageContainer from '@/components/layout/PageContainer';
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Tabs, TabsContent, TabsList, TabsTrigger, Textarea } from '@antigravity/ui';
import { Save, Image as ImageIcon, Layout, Type } from 'lucide-react';
import { toast } from 'sonner';

export default function ContentEditorPage() {
    const [activeTab, setActiveTab] = useState("pages");

    // Mock State for CMS
    const [pages, setPages] = useState([
        { id: "p1", title: "Home", slug: "/", status: "published" },
        { id: "p2", title: "About Us", slug: "/about", status: "published" },
        { id: "p3", title: "Terms", slug: "/terms", status: "draft" },
    ]);

    const handleSave = () => {
        toast.success("Content saved successfully");
    };

    return (
        <PageContainer title="Content Manager (CMS)" description="Manage Marketing Pages & Assets">
            <div className="flex gap-6">
                {/* Sidebar */}
                <div className="w-64 flex-shrink-0">
                    <Card className="bg-zinc-900 border-zinc-800 h-full">
                        <CardHeader>
                            <CardTitle className="text-sm">Structure</CardTitle>
                        </CardHeader>
                        <CardContent className="p-2">
                            <Tabs value={activeTab} onValueChange={setActiveTab} orientation="vertical" className="w-full">
                                <TabsList className="flex flex-col h-auto bg-transparent gap-1">
                                    <TabsTrigger value="pages" className="w-full justify-start px-3 py-2 data-[state=active]:bg-zinc-800">
                                        <Layout className="h-4 w-4 mr-2" /> Pages
                                    </TabsTrigger>
                                    <TabsTrigger value="blog" className="w-full justify-start px-3 py-2 data-[state=active]:bg-zinc-800">
                                        <Type className="h-4 w-4 mr-2" /> Blog Posts
                                    </TabsTrigger>
                                    <TabsTrigger value="media" className="w-full justify-start px-3 py-2 data-[state=active]:bg-zinc-800">
                                        <ImageIcon className="h-4 w-4 mr-2" /> Media Library
                                    </TabsTrigger>
                                </TabsList>
                            </Tabs>
                        </CardContent>
                    </Card>
                </div>

                {/* Editor Area */}
                <div className="flex-1">
                    <Card className="bg-zinc-900 border-zinc-800 min-h-[500px]">
                        <CardHeader className="flex flex-row items-center justify-between border-b border-zinc-800 pb-4">
                            <div>
                                <CardTitle>Home Page Editor</CardTitle>
                                <p className="text-xs text-zinc-500">Last edited 2 hours ago</p>
                            </div>
                            <Button onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-700">
                                <Save className="h-4 w-4 mr-2" /> Publish
                            </Button>
                        </CardHeader>
                        <CardContent className="p-6 space-y-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-zinc-400">Page Title</label>
                                <Input defaultValue="Welcome to Restin" className="bg-zinc-950 border-zinc-800" />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-zinc-400">Hero Section Text</label>
                                <Textarea className="bg-zinc-950 border-zinc-800 min-h-[100px]" defaultValue="Experience the future of dining with our automated systems." />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-zinc-400">SEO Meta Description</label>
                                <Input defaultValue="Best restaurant in Malta" className="bg-zinc-950 border-zinc-800" />
                            </div>

                            <div className="p-4 bg-zinc-950 rounded-lg border border-zinc-800 text-center border-dashed">
                                <ImageIcon className="h-8 w-8 text-zinc-600 mx-auto mb-2" />
                                <p className="text-xs text-zinc-500">Drag and drop hero image here</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </PageContainer>
    );
}
