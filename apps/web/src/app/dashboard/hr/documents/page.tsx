'use client';

import PageContainer from '@/components/layout/PageContainer';
import { Button } from '@antigravity/ui';
import { FileText, Upload, Folder } from 'lucide-react';
import { Card, CardContent } from '@antigravity/ui';

export default function DocumentManagementPage() {
    return (
        <PageContainer
            title="Document Management"
            description="Secure implementation of employee contracts and files."
            actions={<Button><Upload className="w-4 h-4 mr-2" /> Upload Document</Button>}
        >
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                {['Contracts', 'Identifications', 'Certifications', 'Policies'].map((folder) => (
                    <Card key={folder} className="cursor-pointer hover:bg-zinc-900/50 transition-colors">
                        <CardContent className="p-6 flex flex-col items-center text-center gap-4">
                            <Folder className="h-12 w-12 text-zinc-700" />
                            <p className="font-medium">{folder}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Card>
                <CardContent className="p-6">
                    <div className="flex items-center justify-center h-64 border-2 border-dashed border-zinc-800 rounded-lg">
                        <div className="text-center text-zinc-500">
                            <FileText className="mx-auto h-12 w-12 opacity-50 mb-4" />
                            <h3 className="text-lg font-medium">Recent Documents</h3>
                            <p className="text-sm max-w-sm mx-auto mt-2">
                                No recent documents found. Select a folder to browse or upload a new file.
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </PageContainer>
    );
}
