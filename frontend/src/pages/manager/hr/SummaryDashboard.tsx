import React, { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';

import { useNavigate } from 'react-router-dom';

import { useVenue } from '@/context/VenueContext';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

import {
  Users, UserPlus, UserMinus, Calendar, Clock, ShieldCheck, Wallet, FileText,
  Umbrella, SlidersHorizontal, ClipboardList, DollarSign, Upload, Map, AlertCircle,
  Settings, Layout, Layers, Box, Smartphone, UserCheck, Activity, Gift, XCircle,
  Scissors, Landmark, BarChart3, Briefcase
} from 'lucide-react';

import api from '@/lib/api';

const COLORS = ['#3B82F6', '#EF4444'];

const Section = ({ title, children }) => (
  <div className="mb-8">
    <h2 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-4 px-1">{title}</h2>
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
      {children}
    </div>
  </div>
);

const Tile = ({ title, icon: Icon, onClick, highlight = false, sub = false }) => (
  <div
    onClick={onClick}
    className={`
      cursor-pointer group flex flex-col items-center justify-center p-4 rounded-xl transition-all border
      ${highlight ? 'bg-blue-600/10 border-blue-500/20 hover:bg-blue-600/20' : 'bg-card/40 border-border hover:border-white/20 hover:bg-card/60'}
      ${sub ? 'h-24' : 'h-32'}
    `}
  >
    <div className={`mb-3 p-2 rounded-lg ${highlight ? 'bg-blue-500/10 text-blue-400' : 'bg-secondary text-muted-foreground group-hover:text-foreground transition-colors'}`}>
      <Icon className="w-5 h-5" />
    </div>
    <span className="text-[10px] font-bold text-foreground text-center uppercase tracking-tighter leading-tight px-2">
      {title}
    </span>
  </div>
);

const ReportTile = ({ title, onClick }) => (
  <div
    onClick={onClick}
    className="flex items-center gap-3 p-3 bg-card/30 border border-border rounded-lg hover:bg-secondary/50 hover:border-border transition-all cursor-pointer group"
  >
    <div className="h-6 w-6 rounded bg-secondary flex items-center justify-center group-hover:bg-blue-500/10 transition-colors">
      <FileText className="w-3 h-3 text-muted-foreground group-hover:text-blue-400" />
    </div>
    <span className="text-[10px] font-bold text-muted-foreground group-hover:text-foreground uppercase tracking-tighter truncate">
      {title}
    </span>
  </div>
);

export default function SummaryDashboard() {
  const navigate = useNavigate();
  const { activeVenueId: venueId } = useVenue();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedCompany, setSelectedCompany] = useState('All');
  const [period, setPeriod] = useState("All");

  const mainActions = [
    { title: 'People & Talent', icon: Users, path: '/manager/hr/people' },
    { title: 'Scheduler', icon: Calendar, path: '/manager/hr/scheduler' },
    { title: 'Import Clocking Data', icon: Upload, path: '/manager/hr/import' },
    { title: 'Clocking Data', icon: Clock, path: '/manager/hr/clocking' },
    { title: 'Clocking Map View', icon: Map, path: '/manager/hr/map' },
    { title: 'Attendance Exceptions', icon: AlertCircle, path: '/manager/hr/exceptions' },
  ];

  const setupActions = [
    { title: 'Shift Presets', icon: Layout, path: '/manager/hr/setup/presets' },
    { title: 'Shift Patterns', icon: Layers, path: '/manager/hr/setup/patterns' },
    { title: 'Daily Attendance Profiles', icon: UserCheck, path: '/manager/hr-setup/work-schedules' },
    { title: 'Target Attendance Profiles', icon: Activity, path: '/manager/hr/setup/targets' },
    { title: 'Rewards', icon: Gift, path: '/manager/hr/setup/rewards' },
    { title: 'Penalties', icon: XCircle, path: '/manager/hr/setup/penalties' },
    { title: 'Clocking Devices', icon: Settings, path: '/manager/hr/setup/devices' },
    { title: 'Invite to Mobile App', icon: Smartphone, path: '/manager/hr/setup/mobile' },
    { title: 'Banks', icon: Landmark, path: '/manager/hr-setup/banks' },
    { title: 'Departments', icon: Briefcase, path: '/manager/hr-setup/departments' },
  ];

  const reports = [
    'Allocation Return', 'Allocations', 'Attendance Reconciliation', 'Breaks', 'Clocking Details', 'Clocking Exceptions', 'Clocking Summary',
    'Clocking Weekly', 'Costs Detailed', 'Daily Manning', 'Daily Schedule', 'Device Access Control Audit', 'Device Manager Audit', 'Device List',
    'Employee Schedule', 'Geo-Tagging Exceptions', 'Late Arrival/Early Departure', 'Scheduled Hours', 'Scheduled Hours Validation', 'Scheduled Staff by Hour',
    'Who\'s In', 'Scheduler Report'
  ];

  useEffect(() => {
    fetchData();
  }, [selectedCompany]);

  const fetchData = async () => {
    try {
      const response = await api.get(`/venues/${venueId}/summary/dashboard?company=${selectedCompany}`);
      setData(response.data);
    } catch (error) {
      logger.error('Failed to fetch summary data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="animate-pulse flex flex-col items-center gap-4">
        <div className="h-12 w-12 rounded-full border-t-2 border-red-500 animate-spin" />
        <p className="text-muted-foreground font-bold uppercase tracking-widest text-xs">Synchronizing HR Intelligence...</p>
      </div>
    </div>
  );

  if (!data) return <div className="p-8 bg-background min-h-screen text-muted-foreground">{"No "}core intelligence data available.</div>;

  const iconMap = {
    'user-plus': UserPlus,
    'users': Users,
    'user-x': UserMinus
  };

  return (
    <div className="p-6 space-y-12 bg-background min-h-screen text-foreground pb-20">
      {/* Header */}
      <div className="flex justify-between items-end border-b border-border pb-8">
        <div>
          <h1 className="text-4xl font-black text-foreground uppercase tracking-tighter leading-none mb-2">Human Resources</h1>
          <p className="text-muted-foreground font-bold uppercase tracking-[0.2em] text-[10px]">Unified Intelligence &amp; Global Control</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">Venue</label>
            <select aria-label="Input"
              title="Venue Selection"
              
              value={selectedCompany}
              onChange={(e) => setSelectedCompany(e.target.value)}
              className="border rounded-lg px-4 py-1.5 bg-card border-border text-foreground text-[10px] font-bold uppercase tracking-widest focus:ring-1 focus:ring-red-500/50 outline-none"
            >
              <option value="All">Marvin Gauci Group</option>
            </select>
          </div>
        </div>
      </div>

      {/* QUICK NAVIGATION */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        {[
          { title: "Directory", icon: Users, path: "/manager/hr/people" },
          { title: "Leave", icon: Umbrella, path: "/manager/hr/leave-management" },
          { title: "Payroll", icon: Wallet, path: "/manager/hr/payroll" },
          { title: "Scheduler", icon: Calendar, path: "/manager/hr/scheduler" },
          { title: "Clocking", icon: Clock, path: "/manager/hr/clocking" },
          { title: "Contracts", icon: FileText, path: "/manager/hr/contracts" },
          { title: "Audits", icon: ClipboardList, path: "/manager/hr/audit-trail" },
          { title: "Settings", icon: SlidersHorizontal, path: "/manager/hr/settings" },
        ].map((item) => (
          <button
            key={item.title}
            onClick={() => navigate(item.path)}
            className="flex flex-col items-center justify-center h-28 rounded-xl border border-border bg-[#121214] hover:bg-secondary hover:border-red-500/30 transition-all group shadow-xl"
          >
            <div className="mb-3 p-2 rounded-lg bg-secondary text-muted-foreground group-hover:text-red-500 transition-colors">
              <item.icon className="h-5 w-5" />
            </div>
            <span className="text-[10px] font-bold text-foreground uppercase tracking-tighter leading-tight">{item.title}</span>
          </button>
        ))}
      </div>

      {/* KPI Row */}
      <div className="grid gap-4 md:grid-cols-3">
        {(data as /**/any).kpi_metrics.map((metric: Record<string, string>, idx: number) => {
          const Icon = metric.icon === 'wallet' ? Wallet : (metric.icon === 'clock' ? Clock : Users);
          return (
            <Card key={idx} className="border-border bg-card/40 shadow-xl backdrop-blur-md">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{metric.label}</p>
                    <p className="text-4xl font-black text-foreground mt-2 font-heading tracking-tight">{metric.value}</p>
                    <p className="text-[10px] text-muted-foreground mt-2 font-bold uppercase tracking-tighter">Synchronized Intelligence</p>
                  </div>
                  <div className="p-3 bg-red-500/10 rounded-2xl">
                    <Icon className="h-8 w-8 text-red-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts Row 1 */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border-border bg-card/40">
          <CardHeader><CardTitle className="text-[11px] uppercase tracking-widest text-muted-foreground font-bold">Temporal Headcount Trend</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={(data as/**/any).headcount_by_year}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="year" stroke="#666" fontSize={10} />
                <YAxis stroke="#666" fontSize={10} />
                <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46' }} />
                <Line type="monotone" dataKey="count" stroke="#3B82F6" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-border bg-card/40">
          <CardHeader><CardTitle className="text-[11px] uppercase tracking-widest text-muted-foreground font-bold">Employment Archetype</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={(data as/**/any).headcount_by_employment_type}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis type="number" stroke="#666" fontSize={10} />
                <YAxis dataKey="type_name" type="category" width={80} stroke="#666" fontSize={10} />
                <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46' }} />
                <Bar dataKey="count" fill="#3B82F6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-border bg-card/40">
          <CardHeader><CardTitle className="text-[11px] uppercase tracking-widest text-muted-foreground font-bold">Demographic Bracket</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={(data as/**/any).headcount_by_age_bracket}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="bracket" angle={-45} textAnchor="end" height={60} stroke="#666" fontSize={9} />
                <YAxis stroke="#666" fontSize={10} />
                <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46' }} />
                <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-border bg-card/40">
          <CardHeader><CardTitle className="text-[11px] uppercase tracking-widest text-muted-foreground font-bold">Attrition vs Engagement Dynamics</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={(data as/**/any).engagements_terminations}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="year" stroke="#666" fontSize={10} />
                <YAxis stroke="#666" fontSize={10} />
                <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 10, textTransform: 'uppercase', fontWeight: 'bold' }} />
                <Bar dataKey="engagements" fill="#3B82F6" name="Engaged" stackId="a" />
                <Bar dataKey="terminations" fill="#1E3A8A" name="Terminated" stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-border bg-card/40">
          <CardHeader><CardTitle className="text-[11px] uppercase tracking-widest text-muted-foreground font-bold">Gender Polarity Matrix</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={(data as /**/any).headcount_by_gender}
                  cx="50%" cy="50%" innerRadius={60} outerRadius={90}
                  paddingAngle={8} dataKey="count"
                  // @ts-expect-error Recharts internal types for labels are hardcoded to generic objects
                  label={(props: { gender?: string; percentage?: number | string }) => `${props.gender || ''} ${props.percentage || ''}%`}
                >
                  {(data as /**/any).headcount_by_gender.map((entry: /**/any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* OPERATIONS SECTION */}
      <div className="pt-12 border-t border-border">
        <Section title="Operational Control (MAIN)">
          {mainActions.map((action, idx) => (
            <Tile
              key={idx}
              title={action.title}
              icon={action.icon}
              onClick={() => navigate(action.path)}
              highlight={idx === 0}
            />
          ))}
        </Section>

        <Section title="System Configuration (SETUP)">
          {setupActions.map((action, idx) => (
            <Tile
              key={idx}
              title={action.title}
              icon={action.icon}
              onClick={() => navigate(action.path)}
              sub
            />
          ))}
        </Section>

        <div className="mb-8">
          <h2 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-4 px-1">Analytical Intelligence (REPORTING)</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
            {reports.map((report, idx) => (
              <ReportTile
                key={idx}
                title={report}
                onClick={() => navigate(`/manager/hr/reports/${report.toLowerCase().replace(/ /g, '-')}`)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="pt-12 border-t border-border flex items-center justify-between text-muted-foreground font-bold uppercase text-[9px] tracking-[0.3em]">
        <span>Unified HR Architecture v2.0.0</span>
        <span>Restin.ai Intelligence System</span>
      </div>
    </div>
  );
}