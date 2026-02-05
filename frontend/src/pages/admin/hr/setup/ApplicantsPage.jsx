
import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../../../components/ui/card';
import { Users, Filter, Plus, Mail } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import { Badge } from '../../../../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../../components/ui/table';

export default function ApplicantsPage() {
  // Mock Data for Recruitment Phase
  const [applicants, setApplicants] = useState([
    { id: 1, name: "Maria Vella", role: "Head Chef", status: "Interviewing", date: "2026-02-01", email: "maria@example.com" },
    { id: 2, name: "Liam Borg", role: "Waiter", status: "Applied", date: "2026-02-03", email: "liam@example.com" },
    { id: 3, name: "Sarah Camilleri", role: "Bartender", status: "Offer Sent", date: "2026-01-28", email: "sarah@example.com" },
  ]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'Applied': return 'bg-blue-500';
      case 'Interviewing': return 'bg-orange-500';
      case 'Offer Sent': return 'bg-purple-500';
      case 'Hired': return 'bg-green-500';
      case 'Rejected': return 'bg-zinc-600';
      default: return 'bg-zinc-500';
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-500/10 rounded-xl">
            <Users className="w-8 h-8 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Recruitment</h1>
            <p className="text-zinc-400">Applicant Tracking System (ATS)</p>
          </div>
        </div>
        <Button className="bg-indigo-600 hover:bg-indigo-700">
          <Plus className="w-4 h-4 mr-2" /> Post Job
        </Button>
      </div>

      <div className="flex gap-4">
        <Card className="flex-1 bg-zinc-900 border-white/10">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-zinc-400">Open Roles</p>
              <p className="text-2xl font-bold text-white">4</p>
            </div>
          </CardContent>
        </Card>
        <Card className="flex-1 bg-zinc-900 border-white/10">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-zinc-400">Total Applicants</p>
              <p className="text-2xl font-bold text-white">12</p>
            </div>
          </CardContent>
        </Card>
        <Card className="flex-1 bg-zinc-900 border-white/10">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-zinc-400">Interviews Today</p>
              <p className="text-2xl font-bold text-white">1</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="bg-zinc-900 border border-white/10 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">Candidates</h3>
          <Button variant="outline" size="sm"><Filter className="w-4 h-4 mr-2" /> Filter</Button>
        </div>
        <Table>
          <TableHeader className="bg-zinc-800">
            <TableRow>
              <TableHead className="text-white">Name</TableHead>
              <TableHead className="text-white">Role Applied</TableHead>
              <TableHead className="text-white">Date</TableHead>
              <TableHead className="text-white">Status</TableHead>
              <TableHead className="text-right text-white">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {applicants.map(app => (
              <TableRow key={app.id} className="border-white/5 hover:bg-white/5">
                <TableCell className="font-medium text-white">
                  {app.name}
                  <div className="text-xs text-zinc-500">{app.email}</div>
                </TableCell>
                <TableCell>{app.role}</TableCell>
                <TableCell>{app.date}</TableCell>
                <TableCell>
                  <Badge className={`${getStatusColor(app.status)} border-0 text-white`}>
                    {app.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="ghost" className="text-indigo-400">
                    <Mail className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
