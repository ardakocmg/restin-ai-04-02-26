/**
 * PHASE 1: People - Employee Detail (Indigo Parity Edition)
 */
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft,
  User,
  Briefcase,
  CreditCard,
  MapPin,
  ShieldCheck,
  Clock,
  Mail,
  Phone,
  FileText,
  Printer,
  ChevronRight,
  Download
} from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Eye } from 'lucide-react';

function EmployeePayrollHistoryLocal({ employeeCode }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await api.get(`/employees/${employeeCode}/payroll-history`);
        setHistory(res.data);
      } catch (err) {
        console.error("Failed to load payroll history", err);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [employeeCode]);

  const handleDownloadPayslip = async (runId, employeeId) => {
    const venueId = localStorage.getItem('currentVenueId') || 'venue-caviar-bull';
    try {
      toast.info("Generating PDF...");
      const response = await api.get(`/venues/${venueId}/hr/payroll-mt/run/${runId}/payslip/${employeeId}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Payslip_${employeeId}_${runId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("Payslip downloaded");
    } catch (error) {
      console.error(error);
      toast.error("Failed to download");
    }
  };

  if (loading) return <div className="p-4 text-center text-zinc-500">Loading payroll history...</div>;

  return (
    <div className="space-y-4">
      {history.length === 0 && (
        <div className="p-8 text-center border border-dashed border-zinc-800 rounded-xl text-zinc-500">
          No payroll history found.
        </div>
      )}
      {history.map(item => (
        <Card key={item.id} className="bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-colors">
          <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center text-green-500">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-bold text-white uppercase tracking-wider">{item.month}</h4>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-[10px] bg-zinc-950 border-zinc-800 text-zinc-500">{item.status}</Badge>
                  <span className="text-xs text-zinc-600">Period: {item.period}</span>
                  <span className="text-xs text-zinc-600">• {new Date(item.date).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="text-right hidden md:block">
                <p className="text-xs text-zinc-500 uppercase tracking-widest font-bold">Net Pay</p>
                <p className="text-lg font-black text-white">
                  {new Intl.NumberFormat('en-MT', { style: 'currency', currency: 'EUR' }).format(item.net)}
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="bg-zinc-900 border-zinc-700 hover:bg-zinc-800" onClick={() => handleDownloadPayslip(item.id, employeeCode)}>
                  <Download className="h-4 w-4 mr-2" /> PDF
                </Button>
                <Button variant="ghost" size="sm" onClick={() => navigate(`/admin/hr/payroll/${item.id}`)}>
                  <Eye className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function EmployeeDocuments({ employeeCode }) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDocuments();
  }, [employeeCode]);

  const fetchDocuments = async () => {
    try {
      const res = await api.get(`/employees/${employeeCode}/documents`);
      setDocuments(res.data);
    } catch (err) {
      console.error("Failed to load docs", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (docId, filename) => {
    try {
      const res = await api.get(`/employees/documents/${docId}/download`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
    } catch (e) {
      toast.error("Download failed");
    }
  };

  if (loading) return <div className="p-4 text-center text-zinc-500">Loading documents...</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {documents.length === 0 && (
        <div className="col-span-full p-8 text-center border border-dashed border-zinc-800 rounded-xl text-zinc-500">
          No documents found for this employee.
        </div>
      )}
      {documents.map((doc) => (
        <Card key={doc.id} className="bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-colors group">
          <CardContent className="p-4 flex items-start gap-4">
            <div className="h-10 w-10 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-400 group-hover:text-blue-400 transition-colors">
              <FileText className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-zinc-200 text-sm truncate" title={doc.filename}>{doc.filename}</h4>
              <p className="text-xs text-zinc-500 mt-1">{new Date(doc.created_at).toLocaleDateString()}</p>
              <div className="flex gap-2 mt-2">
                <Badge variant="outline" className="text-[10px] bg-zinc-950 border-zinc-800 text-zinc-500">{doc.extension || 'PDF'}</Badge>
              </div>
            </div>
            <Button variant="ghost" size="icon" className="text-zinc-500 hover:text-white" onClick={() => handleDownload(doc.id, doc.filename)}>
              <Download className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function EmployeeDetailPage() {
  const { employeeCode } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (employeeCode) fetchData();
  }, [employeeCode]);

  const fetchData = async () => {
    try {
      // Fetching from the dedicated detail endpoint
      const response = await api.get(`employees/${employeeCode}`);
      setData(response.data);
    } catch (error) {
      console.error('Failed to fetch employee details:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-[#0A0A0B]">
      <div className="animate-pulse flex flex-col items-center gap-4">
        <div className="h-12 w-12 rounded-full border-t-2 border-blue-500 animate-spin" />
        <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">Retrieving Personnel File...</p>
      </div>
    </div>
  );

  if (!data) return (
    <div className="p-8 text-center text-zinc-500 bg-[#0A0A0B] min-h-screen">
      Record not found in the directory.
      <Button onClick={() => navigate(-1)} variant="ghost" className="mt-4">Go Back</Button>
    </div>
  );

  const Section = ({ title, icon: Icon, children }) => (
    <div className="space-y-4">
      <div className="flex items-center gap-2 px-1">
        <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
          <Icon className="h-4 w-4 text-blue-400" />
        </div>
        <h3 className="font-black text-white uppercase tracking-widest text-xs">{title}</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {children}
      </div>
    </div>
  );

  const InfoField = ({ label, value, highlight = false }) => (
    <div className="bg-zinc-900/40 p-3 rounded-xl border border-white/5 hover:border-white/10 transition-all group">
      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1 group-hover:text-zinc-400 transition-colors">{label}</p>
      <p className={`text-sm font-bold ${highlight ? 'text-blue-400' : 'text-zinc-100'}`}>
        {value || <span className="text-zinc-700 italic font-medium">N/A</span>}
      </p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-zinc-100 p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Breadcrumbs & Navigation */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => navigate('/admin/hr/employees')}
              className="p-2 hover:bg-white/5 rounded-full"
            >
              <ArrowLeft className="h-5 w-5 text-zinc-400" />
            </Button>
            <div>
              <div className="flex items-center gap-2 text-zinc-500 text-xs font-bold uppercase tracking-wider mb-1">
                <span>Directory</span>
                <ChevronRight className="h-3 w-3" />
                <span className="text-zinc-300">Personnel File</span>
              </div>
              <h1 className="text-3xl font-black text-white uppercase tracking-tighter">
                {data.personal_details?.name || 'Unknown Employee'}
              </h1>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="border-white/10 bg-zinc-900/50 hover:bg-white/5 text-xs font-bold uppercase tracking-widest h-10">
              <Printer className="h-4 w-4 mr-2" />
              Print File
            </Button>
            <Button className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-widest h-10 rounded-xl">
              Update Records
            </Button>
          </div>
        </div>

        {/* Profile Summary Card */}
        <div className="bg-gradient-to-br from-blue-600/10 to-transparent border border-white/5 rounded-3xl p-8 relative overflow-hidden backdrop-blur-3xl">
          <div className="absolute top-0 right-0 p-8">
            <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-[10px] uppercase font-bold tracking-widest px-3 py-1">
              Active Duty
            </Badge>
          </div>
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="h-32 w-32 rounded-3xl bg-zinc-800 border-2 border-white/10 flex items-center justify-center text-4xl font-black text-zinc-600 shadow-2xl overflow-hidden relative group">
              {data.personal_details?.name?.substring(0, 2).toUpperCase() || '??'}
              <div className="absolute inset-0 bg-blue-500/0 group-hover:bg-blue-500/10 transition-colors" />
            </div>
            <div className="space-y-4 text-center md:text-left flex-1">
              <div>
                <h2 className="text-4xl font-black text-white tracking-tighter uppercase leading-none mb-2">
                  {data.personal_details?.surname}
                </h2>
                <p className="text-blue-400 font-bold uppercase tracking-widest text-sm italic">
                  {data.employment_details?.occupation}
                </p>
              </div>
              <div className="flex flex-wrap justify-center md:justify-start gap-4">
                <div className="flex items-center gap-2 text-zinc-400 text-sm">
                  <Briefcase className="h-4 w-4" />
                  <span>{data.employment_details.department || 'Service'}</span>
                </div>
                <div className="flex items-center gap-2 text-zinc-400 text-sm">
                  <User className="h-4 w-4" />
                  <span>{data.personal_details.code}</span>
                </div>
                <div className="flex items-center gap-2 text-zinc-400 text-sm">
                  <Calendar className="h-4 w-4" />
                  <span>Joined {data.employment_details.employment_date}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabbed Content Area */}
        <Tabs defaultValue="overview" className="space-y-8">
          <TabsList className="bg-zinc-900/50 border border-white/5 p-1 rounded-2xl h-14 backdrop-blur-xl">
            <TabsTrigger value="overview" className="rounded-xl px-6 data-[state=active]:bg-white/10 data-[state=active]:text-white font-bold uppercase tracking-widest text-[10px]">Overview</TabsTrigger>
            <TabsTrigger value="personal" className="rounded-xl px-6 data-[state=active]:bg-white/10 data-[state=active]:text-white font-bold uppercase tracking-widest text-[10px]">Tax & Fiscal</TabsTrigger>
            <TabsTrigger value="contact" className="rounded-xl px-6 data-[state=active]:bg-white/10 data-[state=active]:text-white font-bold uppercase tracking-widest text-[10px]">Contact</TabsTrigger>
            <TabsTrigger value="attendance" className="rounded-xl px-6 data-[state=active]:bg-white/10 data-[state=active]:text-white font-bold uppercase tracking-widest text-[10px]">Work Rules</TabsTrigger>
            <TabsTrigger value="documents" className="rounded-xl px-6 data-[state=active]:bg-white/10 data-[state=active]:text-white font-bold uppercase tracking-widest text-[10px]">Documents</TabsTrigger>
            <TabsTrigger value="payroll" className="rounded-xl px-6 data-[state=active]:bg-white/10 data-[state=active]:text-white font-bold uppercase tracking-widest text-[10px]">Payroll History</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-12 animate-in fade-in duration-500 fill-mode-both">
            {/* Employment Highlights */}
            <Section title="Employment Foundation" icon={Briefcase}>
              <InfoField label="Employee Type" value={data.employment_details.employee_type} highlight />
              <InfoField label="Contract Term" value={data.employment_details.employment_type} />
              <InfoField label="Work Schedule" value={data.employment_details.work_schedule} />
              <InfoField label="Service Length" value={data.employment_details.employment_duration} />
              <InfoField label="Work Permit Expiry" value={data.employment_details.work_permit_end_date} />
              <InfoField label="Reporting To" value={data.attendance_details.reporting_to_employee} />
            </Section>

            {/* Personal Core */}
            <Section title="Identity & Profile" icon={User}>
              <InfoField label="Surname" value={data.personal_details.surname} />
              <InfoField label="First Name" value={data.personal_details.name} />
              <InfoField label="I.D. / Passport" value={data.personal_details.id_number} highlight />
              <InfoField label="Birth Date" value={data.personal_details.date_of_birth} />
              <InfoField label="Age" value={`${data.personal_details.age} years old`} />
              <InfoField label="Nationality" value={data.personal_details.nationality} />
              <InfoField label="Citizenship" value={data.personal_details.citizenship} />
              <InfoField label="Gender" value={data.personal_details.sex} />
            </Section>
          </TabsContent>

          <TabsContent value="personal" className="space-y-12 animate-in slide-in-from-bottom-2 duration-400">
            {/* Tax Info */}
            <Section title="Tax & Registration" icon={ShieldCheck}>
              <InfoField label="Tax Profile" value={data.employment_details.tax_profile} highlight />
              <InfoField label="Civil Status" value={data.tax_personal_details.civil_status} />
              <InfoField label="Tax Reg. No" value={data.tax_personal_details.tax_registration_number} />
              <InfoField label="Social Security" value={data.tax_personal_details.social_security_number} />
              <InfoField label="Accademic Level" value={data.tax_personal_details.academic_level} />
              <InfoField label="Benefit Rates" value={data.tax_personal_details.short_term_benefits} />
            </Section>

            {/* Banks */}
            <Section title="Banking & Disbursements" icon={CreditCard}>
              <InfoField label="Payment Method" value={data.payment_details.payment_method} highlight />
              <InfoField label="Payroll Frequency" value={data.payment_details.payroll_frequency} />
              <InfoField label="Payslip Method" value={data.payment_details.payslip_method} />
              <InfoField label="Bank Institution" value={data.bank_details.bank} />
              <InfoField label="IBAN Record" value={data.bank_details.iban} />
              <InfoField label="Beneficiary Name" value={data.bank_details.beneficiary_fullname} />
            </Section>
          </TabsContent>

          <TabsContent value="contact" className="space-y-12 animate-in zoom-in-95 duration-400">
            {/* Address */}
            <Section title="Residential Logistics" icon={MapPin}>
              <InfoField label="Address Line 1" value={data.contact_details.address_1} />
              <InfoField label="Town / Village" value={data.contact_details.town_village} highlight />
              <InfoField label="Country Origin" value={data.contact_details.country} />
            </Section>

            {/* Contact */}
            <Section title="Communication" icon={Mail}>
              <InfoField label="Mobile Number" value={data.contact_details.employee_mobile_no} highlight />
              <InfoField label="Personal Email" value={data.contact_details.personal_email} />
              <InfoField label="Work Email" value={data.contact_details.work_email} />
            </Section>

            {/* Emergency */}
            <Section title="Emergency Protocol" icon={Phone}>
              <InfoField label="Primary Kin" value="E. HEMIDA" highlight />
              <InfoField label="Primary Relation" value="Brother" />
              <InfoField label="Contact Line" value="+356 79XX XXXX" />
            </Section>
          </TabsContent>

          <TabsContent value="attendance" className="space-y-12">
            {/* Attendance */}
            <Section title="Time & Attendance Rules" icon={Clock}>
              <InfoField label="Attendance Tracking" value={data.attendance_details.attendance_employee ? 'Active' : 'Inactive'} highlight />
              <InfoField label="Punching Rule" value={data.attendance_details.punch_type} />
              <InfoField label="Primary Card ID" value={data.attendance_details.punch_card_number} highlight />
              <InfoField label="Backup Card ID (2)" value={data.attendance_details.punch_card_number_2} />
              <InfoField label="Backup Card ID (3)" value={data.attendance_details.punch_card_number_3} />
              <InfoField label="Allocation Plan" value={data.attendance_details.daily_attendance_profile} />
              <InfoField label="Allocation Type" value={data.attendance_details.daily_attendance_type} />
            </Section>

            {/* Leave */}
            <Section title="Leave Entitlements" icon={FileText}>
              <InfoField label="Can Request Leave" value={data.leave_details.can_apply_for_leave ? 'Authorized' : 'Unauthorized'} highlight />
              <InfoField label="Self-Approval Power" value={data.leave_details.self_approve_leave ? 'Enabled' : 'Disabled'} />
            </Section>
          </TabsContent>


          <TabsContent value="documents" className="space-y-6 animate-in fade-in duration-500">
            <EmployeeDocuments employeeCode={employeeCode} />
          </TabsContent>

          <TabsContent value="payroll" className="space-y-6 animate-in fade-in duration-500">
            <EmployeePayrollHistoryLocal employeeCode={employeeCode} />
          </TabsContent>
        </Tabs>

        {/* System Footer/Tags */}
        <div className="pt-8 border-t border-white/5 flex items-center justify-between">
          <div className="flex gap-2">
            {data.payment_details.tags.map(tag => (
              <Badge key={tag} variant="outline" className="text-zinc-500 border-white/5 bg-zinc-900/40 text-[9px] uppercase tracking-widest">{tag}</Badge>
            ))}
          </div>
          <p className="text-[10px] text-zinc-700 font-bold uppercase tracking-widest">Global Record I.D. {data.personal_details.code}</p>
        </div>
      </div>
    </div >
  );
}
