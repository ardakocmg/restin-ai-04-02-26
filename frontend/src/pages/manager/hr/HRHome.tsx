import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Calendar,
    Settings,
    Upload,
    Clock,
    Map,
    AlertCircle,
    PlusCircle,
    FileText,
    BarChart3,
    Users,
    Briefcase,
    Smartphone,
    Gift,
    XCircle,
    Scissors,
    DollarSign,
    TrendingDown,
    Navigation,
    History,
    Layout,
    CheckCircle,
    Search,
    BadgeInfo,
    Layers,
    FilePieChart,
    HardDrive,
    Activity,
    UserCheck,
    Landmark,
    ShoppingCart,
    Flame
} from 'lucide-react';

const icons = {
    scheduler: Calendar,
    settings: Settings,
    import: Upload,
    clocking: Clock,
    map: Map,
    exceptions: AlertCircle,
    devices: Settings, // Fallback
    warning: AlertCircle,
    presets: Layout,
    patterns: Layers,
    mobile: Smartphone,
    profiles: UserCheck,
    targets: Activity,
    rewards: Gift,
    penalties: XCircle,
    custom: Scissors,
    report: FileText
};

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

export default function HRHome() {
    const navigate = useNavigate();

    const mainActions = [
        { title: 'Scheduler', icon: Calendar, path: '/manager/hr/scheduler' },
        { title: 'Payroll Processing', icon: DollarSign, path: '/manager/hr/payroll' },
        { title: 'Employee Directory', icon: UserCheck, path: '/manager/hr/people' },
        { title: 'Hiring & Recruitment', icon: Briefcase, path: '/manager/hr/hiring', highlight: true },
        { title: 'Onboarding Checklists', icon: CheckCircle, path: '/manager/hr/onboarding' },
        { title: 'HR Calendar', icon: Calendar, path: '/manager/hr/calendar' },
        { title: 'Salary Benchmarks', icon: DollarSign, path: '/manager/hr/salary-benchmarks' },
        { title: 'Import Clocking Data', icon: Upload, path: '/manager/hr/import' },
        { title: 'Clocking Data', icon: Clock, path: '/manager/hr/clocking' },
        { title: 'Clocking Map View', icon: Map, path: '/manager/hr/map' },
        { title: 'Attendance Exceptions', icon: AlertCircle, path: '/manager/hr/exceptions' },
        { title: 'Device Manager', icon: Settings, path: '/manager/hr/devices' },
        { title: 'Settings', icon: Settings, path: '/manager/hr/settings' },
        { title: 'Employee Performance', icon: Activity, path: '/manager/hr/analytics', highlight: true },
        { title: 'POS / KDS Analytics', icon: ShoppingCart, path: '/manager/hr/analytics' },
        { title: 'System Usage', icon: Layers, path: '/manager/hr/analytics' },
    ];

    const setupActions = [
        { title: 'Shift Presets', icon: Layout, path: '/manager/hr/setup/presets' },
        { title: 'Shift Patterns', icon: Layers, path: '/manager/hr/setup/patterns' },
        { title: 'Daily Attendance Profiles', icon: UserCheck, path: '/manager/hr-setup/work-schedules' }, // Mapping to existing
        { title: 'Target Attendance Profiles', icon: Activity, path: '/manager/hr/setup/targets' },
        { title: 'Rewards', icon: Gift, path: '/manager/hr/setup/rewards' },
        { title: 'Penalties', icon: XCircle, path: '/manager/hr/setup/penalties' },
        { title: 'Clocking Devices', icon: Settings, path: '/manager/hr/setup/devices' },
        { title: 'Invite to Mobile App', icon: Smartphone, path: '/manager/hr/setup/mobile' },
        { title: 'Banks', icon: Landmark, path: '/manager/hr-setup/banks' }, // Added to show more connectivity
        { title: 'Departments', icon: Briefcase, path: '/manager/hr-setup/departments' },
    ];

    const reports = [
        'Allocation Return', 'Allocations', 'Attendance Reconciliation', 'Breaks', 'Clocking Details', 'Clocking Exceptions', 'Clocking Summary',
        'Clocking Weekly', 'Costs Detailed', 'Daily Manning', 'Daily Schedule', 'Device Access Control Audit', 'Device Manager Audit', 'Device List',
        'Employee Schedule', 'Geo-Tagging Exceptions', 'Late Arrival/Early Departure', 'Scheduled Hours', 'Scheduled Hours Validation', 'Scheduled Staff by Hour',
        'Who\'s In', 'Scheduler Report',
        'POS Usage by Employee', 'KDS Speed Analysis', 'System Activity Log', 'Employee Performance',
    ];

    return (
        <div className="min-h-screen bg-[#0A0A0B] text-foreground p-8 pt-12">
            <div className="max-w-7xl mx-auto space-y-12 animate-in fade-in duration-700">

                {/* Header */}
                <div className="flex items-end justify-between border-b border-border pb-8 mb-4">
                    <div>
                        <h1 className="text-4xl font-black text-foreground uppercase tracking-tighter leading-none mb-2">HR HUB</h1>
                        <p className="text-muted-foreground font-bold uppercase tracking-[0.2em] text-[10px]">Administrative Control Center</p>
                    </div>
                    <div className="flex gap-4">
                        <div className="text-right">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase">System Status</p>
                            <div className="flex items-center gap-2 text-green-400 font-black text-xs">
                                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                                OPERATIONAL
                            </div>
                        </div>
                    </div>
                </div>

                {/* MAIN SECTION */}
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

                {/* SETUP SECTION */}
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

                {/* REPORTING SECTION */}
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

                {/* Footer info */}
                <div className="pt-12 border-t border-border flex items-center justify-between text-muted-foreground font-bold uppercase text-[9px] tracking-widest">
                    <span>HR Parity v1.4.2</span>
                    <span>Restin.ai Enterprise HR Architecture</span>
                </div>
            </div>
        </div>
    );
}
