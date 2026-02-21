import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { logger } from '@/lib/logger';
import { Briefcase, Plus, Users, ChevronRight, Search, Filter, BarChart2, ExternalLink, Eye, Calendar, CheckCircle, Clock, X } from 'lucide-react';

const PIPELINE_STAGES = ['Applied', 'Screening', 'Interview', 'Offer', 'Hired', 'Rejected'] as const;
const STAGE_COLORS: Record<string, string> = { Applied: 'text-indigo-400', Screening: 'text-amber-400', Interview: 'text-blue-400', Offer: 'text-emerald-400', Hired: 'text-green-400', Rejected: 'text-red-400' };

interface JobPosting {
    id: string;
    title: string;
    department: string;
    location: string;
    employment_type: string;
    status: string;
    candidates_count?: number;
    description?: string;
}

interface Candidate {
    id: string;
    candidate_name: string;
    candidate_email: string;
    stage: string;
}

interface Analytics {
    open_positions: number;
    total_candidates: number;
    in_pipeline: number;
    hired_this_month: number;
    pipeline_stages?: { stage: string; count: number }[];
}

interface NewJobForm {
    title: string;
    department: string;
    location: string;
    employment_type: string;
    description: string;
}

export default function HiringATS() {
    const { user } = useAuth();
    const [jobs, setJobs] = useState<JobPosting[]>([]);
    const [candidates, setCandidates] = useState<Candidate[]>([]);
    const [analytics, setAnalytics] = useState<Analytics | null>(null);
    const [view, setView] = useState<'jobs' | 'pipeline' | 'analytics'>('jobs');
    const [loading, setLoading] = useState(true);
    const [showNewJob, setShowNewJob] = useState(false);
    const [newJob, setNewJob] = useState<NewJobForm>({ title: '', department: '', location: '', employment_type: 'Full-time', description: '' });

    const venueId = localStorage.getItem('currentVenueId');

    const fetchData = useCallback(async () => {
        if (!venueId) return;
        setLoading(true);
        try {
            const [jobsRes, analyticsRes] = await Promise.all([
                api.get(`/venues/${venueId}/hr/hiring/jobs`),
                api.get(`/venues/${venueId}/hr/hiring/dashboard`),
            ]);
            setJobs(jobsRes.data || []);
            setAnalytics(analyticsRes.data || null);
        } catch (e: unknown) { logger.error('Failed to fetch hiring data:', { error: String(e) }); }
        setLoading(false);
    }, [venueId]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const createJob = async () => {
        try {
            await api.post(`/venues/${venueId}/hr/hiring/jobs`, newJob);
            setShowNewJob(false);
            setNewJob({ title: '', department: '', location: '', employment_type: 'Full-time', description: '' });
            fetchData();
        } catch (e: unknown) { logger.error('Failed to create job:', { error: String(e) }); }
    };

    const fetchCandidates = async (jobId: string) => {
        try {
            const res = await api.get(`/venues/${venueId}/hr/hiring/jobs/${jobId}/applicants`);
            setCandidates(res.data || []);
            setView('pipeline');
        } catch (e: unknown) { logger.error('Failed to fetch candidates:', { error: String(e) }); }
    };

    /* No full-page spinner — page renders immediately with 0s */

    return (
        <div className="px-8 py-6 max-w-[1400px] mx-auto">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-[28px] font-bold text-slate-100 m-0 flex items-center gap-2.5">
                        <Briefcase size={28} className="text-indigo-400" /> Hiring & Recruitment
                    </h1>
                    <p className="text-slate-500 mt-1">Applicant Tracking System — manage job postings, candidates & pipeline</p>
                </div>
                <div className="flex gap-2">
                    {(['jobs', 'pipeline', 'analytics'] as const).map(v => (
                        <button key={v} onClick={() => setView(v)} className={`px-4 py-2 rounded-lg border-none cursor-pointer font-medium text-[13px] capitalize ${view === v ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-400'}`}>{v}</button>
                    ))}
                    <button onClick={() => setShowNewJob(true)} className="px-4 py-2 rounded-lg border-none bg-green-500 text-white cursor-pointer font-semibold text-[13px] flex items-center gap-1.5">
                        <Plus size={16} /> New Job
                    </button>
                </div>
            </div>

            {/* Analytics Cards */}
            {analytics && view !== 'pipeline' && (
                <div className="grid grid-cols-4 gap-4 mb-6">
                    {[
                        { label: 'Open Positions', value: analytics.open_positions || 0, color: 'text-indigo-400', icon: Briefcase },
                        { label: 'Total Candidates', value: analytics.total_candidates || 0, color: 'text-blue-400', icon: Users },
                        { label: 'In Pipeline', value: analytics.in_pipeline || 0, color: 'text-amber-400', icon: Filter },
                        { label: 'Hired This Month', value: analytics.hired_this_month || 0, color: 'text-green-400', icon: CheckCircle },
                    ].map((stat, i) => (
                        <div key={i} className="bg-slate-950 border border-slate-800 rounded-xl p-5">
                            <div className="flex justify-between items-center">
                                <span className="text-slate-500 text-[13px]">{stat.label}</span>
                                <stat.icon size={18} className={stat.color} />
                            </div>
                            <div className="text-[32px] font-bold text-slate-100 mt-2">{stat.value}</div>
                        </div>
                    ))}
                </div>
            )}

            {/* Jobs List */}
            {view === 'jobs' && (
                <div className="grid gap-3">
                    {jobs.length === 0 ? (
                        <div className="text-center py-[60px] px-[60px] text-slate-500 bg-slate-950 rounded-xl border border-slate-800">
                            <Briefcase size={48} className="opacity-30 mb-4" />
                            <p className="text-base">{"No "}job postings yet. Click "New Job" to create your first posting.</p>
                        </div>
                    ) : jobs.map(job => (
                        <div key={job.id} className="bg-slate-950 border border-slate-800 rounded-xl p-5 flex justify-between items-center cursor-pointer transition-colors hover:border-indigo-500" onClick={() => fetchCandidates(job.id)}>
                            <div>
                                <h3 className="text-slate-100 text-lg font-semibold m-0">{job.title}</h3>
                                <div className="flex gap-4 mt-1.5 text-slate-400 text-[13px]">
                                    <span>{job.department}</span><span>•</span><span>{job.location}</span><span>•</span><span>{job.employment_type}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${job.status === 'open' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>{job.status?.toUpperCase()}</span>
                                <span className="text-slate-500 text-[13px]">{job.candidates_count || 0} candidates</span>
                                <ChevronRight size={18} className="text-slate-500" />
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Pipeline View */}
            {view === 'pipeline' && (
                <div className={`grid grid-cols-${PIPELINE_STAGES.length} gap-3 overflow-x-auto`}>
                    {PIPELINE_STAGES.map(stage => (
                        <div key={stage} className="bg-slate-950 border border-slate-800 rounded-xl p-4 min-h-[300px]">
                            <div className="flex justify-between items-center mb-3">
                                <h4 className={`${STAGE_COLORS[stage]} text-sm font-semibold m-0`}>{stage}</h4>
                                <span className="bg-slate-800 text-slate-400 px-2 py-0.5 rounded-[10px] text-xs">
                                    {candidates.filter(c => c.stage === stage.toLowerCase()).length}
                                </span>
                            </div>
                            {candidates.filter(c => c.stage === stage.toLowerCase()).map(c => (
                                <div key={c.id} className="bg-slate-800 rounded-lg p-3 mb-2">
                                    <div className="text-slate-100 text-sm font-medium">{c.candidate_name}</div>
                                    <div className="text-slate-500 text-xs mt-1">{c.candidate_email}</div>
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            )}

            {/* Analytics View */}
            {view === 'analytics' && analytics && (
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-6">
                    <h3 className="text-slate-100 text-lg font-semibold mb-4">Pipeline Analytics</h3>
                    <div className="grid grid-cols-3 gap-4">
                        {(analytics.pipeline_stages || []).map((stage, i) => (
                            <div key={i} className="bg-slate-800 rounded-lg p-4">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-slate-400 text-[13px]">{stage.stage}</span>
                                    <span className="text-slate-100 font-bold">{stage.count}</span>
                                </div>
                                <div className="h-1.5 bg-slate-950 rounded-sm">
                                    <div className="h-full bg-indigo-500 rounded-sm" style={{ width: `${Math.min((stage.count / (analytics.total_candidates || 1)) * 100, 100)}%` }} /> {}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* New Job Modal */}
            {showNewJob && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000]">
                    <div className="bg-slate-950 border border-slate-800 rounded-2xl p-8 w-[500px]">
                        <div className="flex justify-between items-center mb-5">
                            <h2 className="text-slate-100 text-xl font-semibold m-0">Create Job Posting</h2>
                            <button onClick={() => setShowNewJob(false)} className="bg-transparent border-none text-slate-500 cursor-pointer" aria-label="Close">
                                <X size={20} />
                            </button>
                        </div>
                        {(['title', 'department', 'location', 'description'] as const).map(field => (
                            <div key={field} className="mb-4">
                                <label className="text-slate-400 text-[13px] block mb-1.5 capitalize">{field}</label>
                                {field === 'description' ? (
                                    <textarea value={newJob[field]} onChange={e => setNewJob(p => ({ ...p, [field]: e.target.value }))} aria-label={field} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-slate-100 text-sm min-h-[80px] resize-y" />
                                ) : (
                                    <input value={newJob[field]} onChange={e => setNewJob(p => ({ ...p, [field]: e.target.value }))} aria-label={field} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-slate-100 text-sm" />
                                )}
                            </div>
                        ))}
                        <button onClick={createJob} className="w-full py-3 rounded-lg border-none bg-indigo-500 text-white font-semibold text-sm cursor-pointer mt-2">Create Job Posting</button>
                    </div>
                </div>
            )}
        </div>
    );
}
