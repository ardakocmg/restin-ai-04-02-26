import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useVenue } from '../../context/VenueContext';
import api from '../../lib/api';
import PageContainer from '../../layouts/PageContainer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { FileText, Download, Calendar, DollarSign, Clock } from 'lucide-react';

export default function EmployeePortal() {
  const { user } = useAuth();
  const { activeVenue } = useVenue();
  const [documents, setDocuments] = useState([]);
  const [payslips, setPayslips] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [tips, setTips] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && activeVenue) {
      loadEmployeeData();
    }
  }, [user, activeVenue]);

  const loadEmployeeData = async () => {
    try {
      const [docsRes, shiftsRes, tipsRes] = await Promise.all([
        api.get(`/documents?entity_type=user&entity_id=${user.id}`),
        api.get(`/venues/${activeVenue.id}/shifts?user_id=${user.id}`),
        api.get(`/employee/tips?user_id=${user.id}`).catch(() => ({ data: [] }))
      ]);
      
      setDocuments(docsRes.data || []);
      setShifts(shiftsRes.data || []);
      setTips(tipsRes.data || []);
      
      // Filter payslips from documents
      setPayslips(docsRes.data?.filter(d => d.category === 'payslip') || []);
    } catch (error) {
      console.error('Failed to load employee data:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalTips = tips.reduce((sum, t) => sum + (t.amount || 0), 0);
  const upcomingShifts = shifts.filter(s => new Date(s.start_time) > new Date());

  return (
    <PageContainer
      title="Employee Self-Service"
      description="Access your documents, payslips, and shift information"
    >
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Total Tips (Month)</p>
                <p className="text-2xl font-bold text-green-600 mt-1">
                  €{totalTips.toFixed(2)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Upcoming Shifts</p>
                <p className="text-2xl font-bold text-blue-600 mt-1">
                  {upcomingShifts.length}
                </p>
              </div>
              <Calendar className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Payslips</p>
                <p className="text-2xl font-bold text-purple-600 mt-1">
                  {payslips.length}
                </p>
              </div>
              <FileText className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Documents</p>
                <p className="text-2xl font-bold text-orange-600 mt-1">
                  {documents.length}
                </p>
              </div>
              <FileText className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="shifts" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="shifts">My Shifts</TabsTrigger>
          <TabsTrigger value="payslips">Payslips</TabsTrigger>
          <TabsTrigger value="tips">Tips</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="shifts" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Shifts</CardTitle>
              <CardDescription>Your scheduled work shifts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {upcomingShifts.length === 0 ? (
                  <p className="text-center py-8 text-slate-500">No upcoming shifts</p>
                ) : (
                  upcomingShifts.map((shift) => (
                    <div key={shift.id} className="p-4 bg-slate-50 rounded-lg border">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-slate-900">
                            {new Date(shift.start_time).toLocaleDateString()}
                          </p>
                          <p className="text-sm text-slate-600">
                            {new Date(shift.start_time).toLocaleTimeString()} - {new Date(shift.end_time).toLocaleTimeString()}
                          </p>
                        </div>
                        <Badge>{shift.checked_in ? 'Checked In' : 'Scheduled'}</Badge>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payslips" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Payslips</CardTitle>
              <CardDescription>Download your salary statements</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {payslips.length === 0 ? (
                  <p className="text-center py-8 text-slate-500">No payslips available</p>
                ) : (
                  payslips.map((doc) => (
                    <div key={doc.id} className="p-4 bg-slate-50 rounded-lg border flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-blue-600" />
                        <div>
                          <p className="font-medium text-slate-900">{doc.filename}</p>
                          <p className="text-sm text-slate-600">
                            {new Date(doc.uploaded_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tips" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Tips History</CardTitle>
              <CardDescription>Your tip earnings</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {tips.length === 0 ? (
                  <p className="text-center py-8 text-slate-500">No tips recorded</p>
                ) : (
                  tips.map((tip) => (
                    <div key={tip.id} className="p-4 bg-green-50 rounded-lg border border-green-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-slate-900">€{tip.amount.toFixed(2)}</p>
                          <p className="text-sm text-slate-600">
                            {new Date(tip.distributed_at).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge variant="outline" className="bg-green-50">
                          Order #{tip.order_id?.substring(0, 8)}
                        </Badge>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>My Documents</CardTitle>
              <CardDescription>Contracts, certificates, and other documents</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {documents.filter(d => d.category !== 'payslip').length === 0 ? (
                  <p className="text-center py-8 text-slate-500">No documents available</p>
                ) : (
                  documents.filter(d => d.category !== 'payslip').map((doc) => (
                    <div key={doc.id} className="p-4 bg-slate-50 rounded-lg border flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-slate-600" />
                        <div>
                          <p className="font-medium text-slate-900">{doc.filename}</p>
                          <p className="text-sm text-slate-600">
                            {doc.category} • {new Date(doc.uploaded_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}
