import React from 'react';
import PageContainer from '../../../layouts/PageContainer';
import { Card, CardContent } from '../../../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table';
import { Badge } from '../../../components/ui/badge';
import { Phone, Play, FileText, Clock } from 'lucide-react';
import { Button } from '../../../components/ui/button';

const MOCK_LOGS = [
    { id: 1, caller: "+356 9912 3456", duration: "2m 15s", time: "10:45 AM", status: "BOOKED", sentiment: "positive", summary: "Booked table for 4 tonight at 8pm." },
    { id: 2, caller: "+356 7788 9900", duration: "1m 05s", time: "11:20 AM", status: "Inquiry", sentiment: "neutral", summary: "Asked about gluten-free options." },
    { id: 3, caller: "+356 9900 1122", duration: "0m 45s", time: "11:45 AM", status: "Escalated", sentiment: "negative", summary: "Complained about parking. Transferred to manager." },
    { id: 4, caller: "+44 7700 900123", duration: "3m 30s", time: "12:10 PM", status: "BOOKED", sentiment: "positive", summary: "Large group booking for next Friday." },
];

export default function CallLogs() {
    return (
        <PageContainer title="Call Analytics" description="Review AI performance and call transcripts">
            <Card className="bg-zinc-900 border-white/10">
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="border-white/5 hover:bg-transparent">
                                <TableHead className="text-zinc-400">Caller</TableHead>
                                <TableHead className="text-zinc-400">Time</TableHead>
                                <TableHead className="text-zinc-400">Duration</TableHead>
                                <TableHead className="text-zinc-400">Outcome</TableHead>
                                <TableHead className="text-zinc-400">Summary</TableHead>
                                <TableHead className="text-right text-zinc-400">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {MOCK_LOGS.map((log) => (
                                <TableRow key={log.id} className="border-white/5 hover:bg-white/5">
                                    <TableCell className="font-medium text-white">
                                        <div className="flex items-center gap-2">
                                            <Phone className="w-4 h-4 text-zinc-500" />
                                            {log.caller}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-zinc-400">{log.time}</TableCell>
                                    <TableCell className="text-zinc-400">{log.duration}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className={
                                            log.status === 'BOOKED' ? 'bg-green-500/10 text-green-500 border-green-500/20' :
                                                log.status === 'Escalated' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                                                    'bg-blue-500/10 text-blue-500 border-blue-500/20'
                                        }>
                                            {log.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-zinc-300 max-w-[300px] truncate">
                                        {log.summary}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-white/10">
                                                <Play className="w-4 h-4" />
                                            </Button>
                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-white/10">
                                                <FileText className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </PageContainer>
    );
}
