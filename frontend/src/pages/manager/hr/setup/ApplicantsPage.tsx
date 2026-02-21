// @ts-nocheck

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../../../components/ui/card';
import { Users, Filter, Plus, Mail, Loader2 } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import { Badge } from '../../../../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../../components/ui/table';
import api from '../../../../lib/api';
import { useVenue } from '../../../../context/VenueContext';

import { logger } from '@/lib/logger';
export default function ApplicantsPage() {
  const { activeVenue } = useVenue();
  const [loading, setLoading] = useState(true);
  const [applicants, setApplicants] = useState([]);
  const [summary, setSummary] = useState({ open_roles: 0, total_applicants: 0, interviews_today: 0 });

  useEffect(() => {
    if (activeVenue?.id) loadData();
  }, [activeVenue?.id]);

  const loadData = async () => {
    try {
      const res = await api.get('/hr/applicants', { params: { venue_id: activeVenue.id } });
      const data = res.data;
      setApplicants(data.applicants || []);
      setSummary(data.summary || { open_roles: 0, total_applicants: 0, interviews_today: 0 });
    } catch (err) {
      logger.warn('Failed to load applicants');
    } finally {
      setLoading(false);
    }
  };

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

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-500/10 rounded-xl">
            <Users className="w-8 h-8 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Recruitment</h1>
            <p className="text-muted-foreground">Applicant Tracking System (ATS)</p>
          </div>
        </div>
        <Button className="bg-indigo-600 hover:bg-indigo-700">
          <Plus className="w-4 h-4 mr-2" /> Post Job
        </Button>
      </div>

      <div className="flex gap-4">
        <Card className="flex-1 bg-card border-border">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Open Roles</p>
              <p className="text-2xl font-bold text-foreground">{summary.open_roles}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="flex-1 bg-card border-border">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Applicants</p>
              <p className="text-2xl font-bold text-foreground">{summary.total_applicants}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="flex-1 bg-card border-border">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Interviews Today</p>
              <p className="text-2xl font-bold text-foreground">{summary.interviews_today}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h3 className="text-lg font-bold text-foreground">Candidates</h3>
          <Button variant="outline" size="sm"><Filter className="w-4 h-4 mr-2" /> Filter</Button>
        </div>
        <Table>
          <TableHeader className="bg-secondary">
            <TableRow>
              <TableHead className="text-foreground">Name</TableHead>
              <TableHead className="text-foreground">Role Applied</TableHead>
              <TableHead className="text-foreground">Date</TableHead>
              <TableHead className="text-foreground">Status</TableHead>
              <TableHead className="text-right text-foreground">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {applicants.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No applicants found</TableCell>
              </TableRow>
            ) : applicants.map(app => (
              <TableRow key={app.id || app._id} className="border-border hover:bg-white/5">
                <TableCell className="font-medium text-foreground">
                  {app.name}
                  <div className="text-xs text-muted-foreground">{app.email}</div>
                </TableCell>
                <TableCell>{app.role || app.position}</TableCell>
                <TableCell>{(app.date || app.created_at || '').split('T')[0]}</TableCell>
                <TableCell>
                  <Badge className={`${getStatusColor(app.status)} border-0 text-foreground`}>
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
