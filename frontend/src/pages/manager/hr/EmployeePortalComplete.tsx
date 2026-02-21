import React, { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';
import PermissionGate from '@/components/shared/PermissionGate';
import { useAuditLog } from '@/hooks/useAuditLog';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  ChevronLeft, ChevronRight, Calendar as CalendarIcon,
  Clock, FileText, DollarSign, Users, TrendingUp, Award,
  Mail, Phone, MapPin, Briefcase, Building2, AlertCircle,
  Download, Bell, Heart, Star, Shield, UserCheck
} from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';

// ─── Default Data (Fallback when API is empty) ────────────────────────────────
const DEFAULT_PORTAL_DATA = {
  my_profile: {
    name: "Sarah Johnson",
    job_title: "Restaurant Manager",
    department: "Operations",
    employee_code: "EMP-001",
    email: "sarah.johnson@restin.ai",
    phone: "+356 7777 1234",
    location: "Valletta Branch",
    start_date: "2023-03-15",
    reporting_to: "Mark Williams",
    profile_photo: null,
  },
  leave_balances: [
    { leave_type: "Vacation Leave 2025", hours_left: 120, total_hours: 200, is_segmented: true, segments: [{ type: "carried over", hours: 32 }, { type: "new allocation", hours: 168 }] },
    { leave_type: "Sick Leave", hours_left: 48, total_hours: 80 },
    { leave_type: "Personal Leave", hours_left: 16, total_hours: 24 },
    { leave_type: "Parental Leave", hours_left: 40, total_hours: 40 },
  ],
  out_of_office: [
    { name: "James Miller", leave_type: "VAC25", start_time: "All Day", end_time: null, is_sick: false, duration: "5 days" },
    { name: "Emma Davis", leave_type: "Sick Leave", start_time: "09:00", end_time: "17:00", is_sick: true, duration: "1 day" },
    { name: "Robert Chen", leave_type: "WORKING REMOTELY", start_time: "08:00", end_time: "16:00", is_sick: false },
    { name: "Lisa Anderson", leave_type: "VAC25", start_time: "All Day", end_time: null, is_sick: false, duration: "3 days" },
    { name: "David Wilson", leave_type: "Personal", start_time: "13:00", end_time: "17:00", is_sick: false, duration: "Half day" },
  ],
  leave_metrics: { on_leave_today: 3, on_leave_tomorrow: 2, on_sick_leave_today: 1 },
  calendar_events: [
    { date: "2026-02-14", event_type: "Public Holiday", label: "Valentine's Day" },
    { date: "2026-02-17", event_type: "VAC25", label: "Vacation" },
    { date: "2026-02-18", event_type: "VAC25", label: "Vacation" },
    { date: "2026-02-21", event_type: "WORKING REMOTELY", label: "WFH" },
    { date: "2026-03-10", event_type: "Public Holiday", label: "Feast of St Paul" },
    { date: "2026-03-19", event_type: "Public Holiday", label: "Feast of St Joseph" },
  ],
  payslips: [
    { month: "January 2026", amount: "€2,850.00", net: "€2,120.00" },
    { month: "December 2025", amount: "€3,150.00", net: "€2,340.00" },
    { month: "November 2025", amount: "€2,850.00", net: "€2,120.00" },
    { month: "October 2025", amount: "€2,850.00", net: "€2,120.00" },
  ],
  upcoming_shifts: [
    { date: "Today", time: "09:00 – 17:00", location: "Valletta Branch", role: "Manager on Duty" },
    { date: "Tomorrow", time: "12:00 – 22:00", location: "Valletta Branch", role: "Manager on Duty" },
    { date: "Wed, Feb 12", time: "09:00 – 17:00", location: "Valletta Branch", role: "Manager on Duty" },
  ],
  announcements: [
    { title: "Valentine's Day Special Menu", date: "Feb 10", priority: "high" },
    { title: "New POS Training Session", date: "Feb 15", priority: "normal" },
    { title: "Health & Safety Refresher", date: "Feb 20", priority: "normal" },
  ],
  team_members: [
    { name: "James Miller", role: "Head Waiter", status: "online" },
    { name: "Emma Davis", role: "Bartender", status: "offline" },
    { name: "Robert Chen", role: "Chef de Partie", status: "online" },
    { name: "Lisa Anderson", role: "Waitress", status: "online" },
  ],
  pending_requests: 2,
  documents_to_sign: 1,
};

// ─── Helper: Initials ─────────────────────────────────────────────────────────
const getInitials = (name) => name?.split(' ').map(n => n[0]).join('') || '??';

export default function EmployeePortalComplete() {
  const navigate = useNavigate();
  const { logAction } = useAuditLog();
  useEffect(() => {
    logAction('EMPLOYEE_PORTAL_VIEWED', 'employee-portal');
  }, []);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [showLeaveRequestDialog, setShowLeaveRequestDialog] = useState(false);
  const [leaveRequestType, setLeaveRequestType] = useState('vacation');

  useEffect(() => {
    fetchPortalData();
  }, []);

  const fetchPortalData = async () => {
    try {
      const response = await api.get('employee-portal/data');
      if (response.data && response.data.my_profile) {
        setData(response.data);
      } else {
        setData(DEFAULT_PORTAL_DATA);
      }
    } catch {
      logger.error('Employee portal API unavailable, using defaults');
      setData(DEFAULT_PORTAL_DATA);
    } finally {
      setLoading(false);
    }
  };

  // ─── Calendar ──────────────────────────────────────────────────────────────
  const getDaysInMonth = (month, year) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (month, year) => new Date(year, month, 1).getDay();

  const getEventForDate = (date, monthOffset = 0) => {
    const m = currentMonth + monthOffset;
    const dateStr = `${currentYear}-${String(m + 1).padStart(2, '0')}-${String(date).padStart(2, '0')}`;
    return data?.calendar_events?.find(e => e.date === dateStr);
  };

  const getColorClass = (eventType) => {
    const colorMap = {
      'Public Holiday': 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
      'WORKING REMOTELY': 'bg-purple-500/20 text-purple-400 border border-purple-500/30',
      'VAC25': 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
      'VAC24': 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
      'CURRENT': 'bg-indigo-600 text-foreground ring-2 ring-indigo-400',
    };
    return colorMap[eventType] || '';
  };

  const renderCalendar = (monthOffset = 0) => {
    const month = currentMonth + monthOffset;
    const year = currentYear;
    const daysInMonth = getDaysInMonth(month, year);
    const firstDay = getFirstDayOfMonth(month, year);
    const dayNames = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const today = new Date();
    const isCurrentMonth = today.getMonth() === month && today.getFullYear() === year;

    return (
      <div className="mb-4">
        <h4 className="text-sm font-semibold text-secondary-foreground mb-2">{monthNames[month]} {year}</h4>
        <div className="grid grid-cols-7 gap-1 mb-1">
          {dayNames.map(day => (
            <div key={day} className="text-[10px] font-bold text-muted-foreground text-center py-1 uppercase tracking-wider">{day}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: firstDay }, (_, i) => <div key={`e-${i}`} className="p-2" />)}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const date = i + 1;
            const event = getEventForDate(date, monthOffset);
            const isToday = isCurrentMonth && today.getDate() === date;
            return (
              <button
                key={date}
                className={`p-1.5 text-center rounded-lg text-sm font-medium transition-all ${isToday ? 'bg-indigo-600 text-foreground ring-2 ring-indigo-400/50 shadow-lg shadow-indigo-600/20' :
                  event ? getColorClass(event.event_type) :
                    'text-muted-foreground hover:bg-secondary/50'
                  }`}
                onClick={() => event && toast.info(`${event.label || event.event_type} — ${date}/${month + 1}/${year}`)}
              >
                {date}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const handleLeaveBalanceClick = (balance) => {
    setSelectedLeave(balance);
    setShowLeaveDialog(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-64px)] bg-black">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
      </div>
    );
  }

  if (!data) return <div className="p-8 text-muted-foreground">{"No "}data available</div>;

  return (
    <PermissionGate requiredRole="STAFF">
      <div className="p-6 bg-black min-h-screen text-foreground">
        {/* ─── Header ───────────────────────────────── */}
        <div className="mb-6 flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
              <Shield className="w-6 h-6 text-indigo-400" />
              Employee Portal
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Welcome back, {data.my_profile.name.split(' ')[0]} 👋</p>
          </div>
          <div className="flex items-center gap-3">
            {data.pending_requests > 0 && (
              <button className="relative p-2 bg-card rounded-lg border border-border hover:bg-secondary transition-colors">
                <Bell className="w-5 h-5 text-muted-foreground" />
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-foreground text-[10px] font-bold rounded-full flex items-center justify-center">{data.pending_requests}</span>
              </button>
            )}
            {data.documents_to_sign > 0 && (
              <button
                className="px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-400 text-xs font-medium flex items-center gap-2 hover:bg-amber-500/15 transition-colors"
                onClick={() => toast.info("Opening documents...")}
              >
                <FileText className="w-4 h-4" />
                {data.documents_to_sign} doc to sign
              </button>
            )}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-12">
          {/* ════════════════ LEFT COLUMN ════════════════ */}
          <div className="lg:col-span-4 space-y-6">

            {/* ── My Profile Card ── */}
            <Card className="bg-card/50 border-border overflow-hidden">
              <div className="h-20 bg-gradient-to-r from-indigo-600/30 via-purple-600/20 to-blue-600/20 relative">
                <div className="absolute -bottom-10 left-1/2 -translate-x-1/2">
                  <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-zinc-900 shadow-xl">
                    {data.my_profile.profile_photo ? (
                      <img src={data.my_profile.profile_photo} alt={data.my_profile.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                        <span className="text-2xl font-bold text-foreground">{getInitials(data.my_profile.name)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <CardContent className="pt-14 pb-5 text-center">
                <h3 className="text-lg font-bold text-foreground">{data.my_profile.name}</h3>
                <p className="text-sm text-indigo-400 font-medium">{data.my_profile.job_title}</p>
                {data.my_profile.employee_code && (
                  <p className="text-[10px] text-muted-foreground font-mono mt-1">{data.my_profile.employee_code}</p>
                )}

                <div className="mt-4 space-y-2 text-left">
                  {data.my_profile.department && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                      {data.my_profile.department}
                    </div>
                  )}
                  {data.my_profile.location && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                      {data.my_profile.location}
                    </div>
                  )}
                  {data.my_profile.email && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                      {data.my_profile.email}
                    </div>
                  )}
                  {data.my_profile.phone && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                      {data.my_profile.phone}
                    </div>
                  )}
                  {data.my_profile.reporting_to && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Users className="w-3.5 h-3.5 text-muted-foreground" />
                      Reports to: <span className="text-secondary-foreground">{data.my_profile.reporting_to}</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 mt-5">
                  <Button variant="outline" size="sm" className="flex-1 border-border text-secondary-foreground hover:text-foreground hover:bg-secondary" onClick={() => navigate('/manager/hr/people/' + (data.my_profile.employee_code || 'EMP-001'))}>More details</Button>
                  <Button size="sm" className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-foreground" onClick={() => navigate('/manager/profile')}>My Profile</Button>
                </div>
              </CardContent>
            </Card>

            {/* ── Calendar ── */}
            <Card className="bg-card/50 border-border">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base text-foreground flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4 text-indigo-400" />
                    My Leave Planner
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {/* Legend */}
                <div className="flex gap-3 mb-4 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span className="text-[10px] text-muted-foreground">Holiday</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                    <span className="text-[10px] text-muted-foreground">Remote</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                    <span className="text-[10px] text-muted-foreground">Vacation</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                    <span className="text-[10px] text-muted-foreground">Today</span>
                  </div>
                </div>

                {/* Navigation */}
                <div className="flex items-center justify-between mb-4">
                  <button onClick={() => setCurrentMonth(m => m > 0 ? m - 1 : 11)} className="p-1.5 hover:bg-secondary rounded-lg transition-colors">
                    <ChevronLeft className="h-4 w-4 text-muted-foreground" />
                  </button>
                  <div className="text-sm font-semibold text-secondary-foreground">
                    {new Date(currentYear, currentMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </div>
                  <button onClick={() => setCurrentMonth(m => m < 11 ? m + 1 : 0)} className="p-1.5 hover:bg-secondary rounded-lg transition-colors">
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                </div>

                {renderCalendar(0)}
                {renderCalendar(1)}
              </CardContent>
            </Card>

            {/* ── Payslips ── */}
            <Card className="bg-card/50 border-border">
              <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base text-foreground flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                  My Payslips
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-indigo-400 hover:text-indigo-300 text-xs font-semibold"
                  onClick={() => navigate('/manager/hr/payroll')}
                >
                  View All
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {data.payslips?.map((payslip, idx) => (
                    <button
                      key={idx}
                      onClick={() => toast.info(`Viewing payslip for ${payslip.month}`)}
                      className="w-full flex items-center justify-between p-3 bg-background/50 border border-border rounded-lg hover:border-border hover:bg-card/50 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-emerald-500/10">
                          <FileText className="w-4 h-4 text-emerald-400" />
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-medium text-secondary-foreground">{payslip.month}</p>
                          {payslip.net && <p className="text-[11px] text-muted-foreground">Net: {payslip.net}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-emerald-400">{payslip.amount}</span>
                        <Download className="w-3.5 h-3.5 text-muted-foreground" />
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ════════════════ MIDDLE COLUMN ════════════════ */}
          <div className="lg:col-span-4 space-y-6">

            {/* ── Leave Balances ── */}
            <Card className="bg-card/50 border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-foreground flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-400" />
                  Leave Balances
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-5">
                  {data.leave_balances?.map((balance, idx) => {
                    const percentage = balance.total_hours > 0 ? (balance.hours_left / balance.total_hours) * 100 : 0;
                    const circumference = 2 * Math.PI * 40;
                    const strokeDashoffset = circumference - (percentage / 100) * circumference;

                    return (
                      <button
                        key={idx}
                        className="flex flex-col items-center cursor-pointer hover:opacity-80 transition group"
                        onClick={() => handleLeaveBalanceClick(balance)}
                      >
                        <div className="relative w-28 h-28 mb-2">
                          <svg className="w-full h-full transform -rotate-90">
                            <circle cx="56" cy="56" r="40" stroke="#27272a" strokeWidth="10" fill="none" />
                            <circle
                              cx="56" cy="56" r="40"
                              stroke={percentage > 50 ? '#6366f1' : percentage > 20 ? '#eab308' : '#ef4444'}
                              strokeWidth="10"
                              fill="none"
                              strokeDasharray={circumference}
                              strokeDashoffset={strokeDashoffset}
                              strokeLinecap="round"
                              className="transition-all duration-1000 ease-out"
                            />
                            {balance.is_segmented && balance.segments && (
                              <>
                                <circle cx="56" cy="56" r="48" stroke="#10B981" strokeWidth="3" fill="none" strokeDasharray="30 270" />
                                <circle cx="56" cy="56" r="48" stroke="#6366f1" strokeWidth="3" fill="none" strokeDasharray="180 120" strokeDashoffset="-30" />
                              </>
                            )}
                          </svg>
                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-2xl font-black text-foreground group-hover:text-indigo-400 transition-colors">{balance.hours_left}</span>
                            <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest">hrs left</span>
                          </div>
                        </div>
                        <p className="text-xs font-semibold text-muted-foreground text-center leading-tight">{balance.leave_type}</p>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* ── Upcoming Shifts ── */}
            {data.upcoming_shifts && (
              <Card className="bg-card/50 border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base text-foreground flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-amber-400" />
                    Upcoming Shifts
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {data.upcoming_shifts.map((shift, idx) => (
                      <div key={idx} className={`p-3 rounded-lg border transition-all ${idx === 0 ? 'bg-indigo-500/5 border-indigo-500/20' : 'bg-background/50 border-border'}`}>
                        <div className="flex justify-between items-start">
                          <div>
                            <p className={`text-sm font-semibold ${idx === 0 ? 'text-indigo-400' : 'text-secondary-foreground'}`}>{shift.date}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{shift.time}</p>
                          </div>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground border border-border">{shift.role}</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
                          <MapPin className="w-3 h-3" />{shift.location}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ── Team Members ── */}
            {data.team_members && (
              <Card className="bg-card/50 border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base text-foreground flex items-center gap-2">
                    <Users className="w-4 h-4 text-purple-400" />
                    My Team
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {data.team_members.map((member, idx) => (
                      <div key={idx} className="flex items-center gap-3 p-2.5 hover:bg-secondary/30 rounded-lg transition-colors">
                        <div className="relative">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-zinc-700 to-zinc-800 flex items-center justify-center border border-border">
                            <span className="text-xs font-bold text-muted-foreground">{getInitials(member.name)}</span>
                          </div>
                          <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-zinc-900 ${member.status === 'online' ? 'bg-emerald-500' : 'bg-zinc-600'}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-secondary-foreground truncate">{member.name}</p>
                          <p className="text-[11px] text-muted-foreground">{member.role}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* ════════════════ RIGHT COLUMN ════════════════ */}
          <div className="lg:col-span-4 space-y-6">

            {/* ── Out of Office ── */}
            <Card className="bg-card/50 border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-foreground flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-orange-400" />
                  Out of the Office
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-2 mb-4">
                  <Button size="sm" className="text-xs bg-indigo-600 hover:bg-indigo-500 text-foreground" onClick={() => { setLeaveRequestType('vacation'); setShowLeaveRequestDialog(true); }}>Apply ▼</Button>
                  <Button size="sm" variant="outline" className="text-xs border-border text-muted-foreground hover:text-foreground" onClick={() => navigate('/manager/hr/leave-management')}>{"Cancel "}▼</Button>
                  <Button size="sm" className="text-xs bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20" onClick={() => { setLeaveRequestType('sick'); setShowLeaveRequestDialog(true); }}>Sick</Button>
                  <Button size="sm" variant="outline" className="text-xs border-border text-muted-foreground hover:text-foreground" onClick={() => navigate('/manager/hr/scheduler')}>Heat Map</Button>
                </div>

                <div className="space-y-2 max-h-80 overflow-y-auto custom-scrollbar">
                  {data.out_of_office?.map((staff, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-3 p-2.5 hover:bg-secondary/30 rounded-lg cursor-pointer transition-all border border-transparent hover:border-border"
                      onClick={() => toast.info(`${staff.name} — ${staff.leave_type}: ${staff.start_time}${staff.end_time ? ` - ${staff.end_time}` : ''} ${staff.duration || ''}`)}
                    >
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-zinc-700 to-zinc-800 flex items-center justify-center flex-shrink-0 border border-border">
                        <span className="text-xs font-bold text-muted-foreground">{getInitials(staff.name)}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-secondary-foreground truncate">{staff.name}</p>
                          {staff.is_sick && <span className="text-xs">🔴</span>}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${staff.is_sick
                            ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                            : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                            }`}>
                            {staff.leave_type}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {staff.start_time}{staff.end_time && ` – ${staff.end_time}`}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* ── Leave Metrics ── */}
            <Card className="bg-card/50 border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-foreground flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-cyan-400" />
                  Leave Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={() => toast.info(`${data.leave_metrics?.on_leave_today || 0} employees on leave today`)}
                    className="text-center p-4 bg-background/50 border border-border rounded-xl hover:border-border transition-all"
                  >
                    <p className="text-3xl font-black text-foreground">{data.leave_metrics?.on_leave_today || 0}</p>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mt-1">Leave Today</p>
                  </button>
                  <button
                    onClick={() => toast.info(`${data.leave_metrics?.on_leave_tomorrow || 0} employees on leave tomorrow`)}
                    className="text-center p-4 bg-background/50 border border-border rounded-xl hover:border-border transition-all"
                  >
                    <p className="text-3xl font-black text-foreground">{data.leave_metrics?.on_leave_tomorrow || 0}</p>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mt-1">Tomorrow</p>
                  </button>
                  <button
                    onClick={() => toast.info(`${data.leave_metrics?.on_sick_leave_today || 0} on sick leave`)}
                    className="text-center p-4 bg-red-500/5 border border-red-500/10 rounded-xl hover:border-red-500/20 transition-all"
                  >
                    <p className="text-3xl font-black text-red-400">{data.leave_metrics?.on_sick_leave_today || 0}</p>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mt-1">Sick Leave</p>
                  </button>
                </div>
              </CardContent>
            </Card>

            {/* ── Announcements ── */}
            {data.announcements && (
              <Card className="bg-card/50 border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base text-foreground flex items-center gap-2">
                    <Bell className="w-4 h-4 text-yellow-400" />
                    Announcements
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {data.announcements.map((ann, idx) => (
                      <div key={idx} className={`p-3 rounded-lg border transition-all cursor-pointer hover:bg-secondary/30 ${ann.priority === 'high' ? 'border-amber-500/20 bg-amber-500/5' : 'border-border bg-background/30'}`}>
                        <div className="flex justify-between items-start">
                          <p className="text-sm font-medium text-secondary-foreground">{ann.title}</p>
                          {ann.priority === 'high' && <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />}
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-1">{ann.date}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ── Staff Leave Balances ── */}
            <Card className="bg-card/50 border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-foreground flex items-center gap-2">
                  <Award className="w-4 h-4 text-fuchsia-400" />
                  Staff Reporting to Me
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Team leave overview will appear here when data syncs.</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* ─── Leave Balance Dialog ─────────────────── */}
        <Dialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle className="text-foreground">{selectedLeave?.leave_type} Balance</DialogTitle>
              <DialogDescription className="text-muted-foreground">Detailed breakdown of your leave balance</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-background border border-border rounded-lg">
                  <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Total Allocation</p>
                  <p className="text-2xl font-black text-foreground mt-1">{selectedLeave?.total_hours}h</p>
                </div>
                <div className="p-4 bg-indigo-500/5 border border-indigo-500/20 rounded-lg">
                  <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Remaining</p>
                  <p className="text-2xl font-black text-indigo-400 mt-1">{selectedLeave?.hours_left}h</p>
                </div>
              </div>
              <div className="p-4 bg-background border border-border rounded-lg">
                <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Used</p>
                <p className="text-xl font-bold text-foreground mt-1">
                  {selectedLeave ? selectedLeave.total_hours - selectedLeave.hours_left : 0}h
                </p>
              </div>
              {selectedLeave?.is_segmented && selectedLeave?.segments && (
                <div className="border-t border-border pt-4">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Balance Breakdown</p>
                  {selectedLeave.segments.map((seg, i) => (
                    <div key={i} className="flex justify-between items-center py-2 border-b border-border/50 last:border-0">
                      <span className="text-sm text-muted-foreground capitalize">{seg.type}</span>
                      <span className="text-sm font-bold text-foreground">{seg.hours}h</span>
                    </div>
                  ))}
                </div>
              )}
              <Button className="w-full bg-indigo-600 hover:bg-indigo-500 text-foreground" onClick={() => setShowLeaveDialog(false)}>Close</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* ─── Leave Request Dialog ─────────────────── */}
        <Dialog open={showLeaveRequestDialog} onOpenChange={setShowLeaveRequestDialog}>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle className="text-foreground flex items-center gap-2">
                {leaveRequestType === 'sick' ? (
                  <><Heart className="w-5 h-5 text-red-400" /> Report Sick Leave</>
                ) : (
                  <><CalendarIcon className="w-5 h-5 text-indigo-400" /> Apply for Leave</>
                )}
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                {leaveRequestType === 'sick' ? 'Report your sick leave below' : 'Submit a leave request for approval'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Leave Type</label>
                <select
                  className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm text-secondary-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  defaultValue={leaveRequestType === 'sick' ? 'sick' : 'vacation'}
                >
                  {leaveRequestType === 'sick' ? (
                    <>
                      <option value="sick">Sick Leave</option>
                      <option value="family-sick">Family Emergency</option>
                    </>
                  ) : (
                    <>
                      <option value="vacation">Vacation Leave 2025</option>
                      <option value="personal">Personal Leave</option>
                      <option value="parental">Parental Leave</option>
                      <option value="remote">Working Remotely</option>
                    </>
                  )}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Start Date</label>
                  <input type="date" className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm text-secondary-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/50" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">End Date</label>
                  <input type="date" className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm text-secondary-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/50" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Duration</label>
                <div className="grid grid-cols-3 gap-2">
                  <Button variant="outline" size="sm" className="border-border text-secondary-foreground hover:bg-indigo-600 hover:text-foreground hover:border-indigo-600">Full Day</Button>
                  <Button variant="outline" size="sm" className="border-border text-secondary-foreground hover:bg-indigo-600 hover:text-foreground hover:border-indigo-600">Morning</Button>
                  <Button variant="outline" size="sm" className="border-border text-secondary-foreground hover:bg-indigo-600 hover:text-foreground hover:border-indigo-600">Afternoon</Button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Notes</label>
                <textarea
                  className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm text-secondary-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/50 min-h-20 resize-none"
                  placeholder={leaveRequestType === 'sick' ? 'Brief description of illness...' : 'Reason for leave request...'}
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1 border-border text-muted-foreground" onClick={() => setShowLeaveRequestDialog(false)}>Cancel</Button>
                <Button
                  className={`flex-1 text-foreground ${leaveRequestType === 'sick' ? 'bg-red-600 hover:bg-red-500' : 'bg-indigo-600 hover:bg-indigo-500'}`}
                  onClick={() => {
                    toast.success(leaveRequestType === 'sick' ? 'Sick leave reported successfully' : 'Leave request submitted for approval');
                    setShowLeaveRequestDialog(false);
                  }}
                >
                  {leaveRequestType === 'sick' ? 'Report Sick' : 'Submit Request'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </PermissionGate>
  );
}