import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { logger } from '@/lib/logger';
import { Briefcase, Plus, Users, ChevronRight, Search, Filter, BarChart2, ExternalLink, Eye, Calendar, CheckCircle, Clock, X } from 'lucide-react';

const PIPELINE_STAGES = ['Applied', 'Screening', 'Interview', 'Offer', 'Hired', 'Rejected'] as const;
const STAGE_COLORS: Record<string, string> = { Applied: '#6366f1', Screening: '#f59e0b', Interview: '#3b82f6', Offer: '#10b981', Hired: '#22c55e', Rejected: '#ef4444' };

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
        } catch (e: any) { logger.error('Failed to fetch hiring data:', e); }
        setLoading(false);
    }, [venueId]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const createJob = async () => {
        try {
            await api.post(`/venues/${venueId}/hr/hiring/jobs`, newJob);
            setShowNewJob(false);
            setNewJob({ title: '', department: '', location: '', employment_type: 'Full-time', description: '' });
            fetchData();
        } catch (e: any) { logger.error('Failed to create job:', e); }
    };

    const fetchCandidates = async (jobId: string) => {
        try {
            const res = await api.get(`/venues/${venueId}/hr/hiring/jobs/${jobId}/applicants`);
            setCandidates(res.data || []);
            setView('pipeline');
        } catch (e: any) { logger.error('Failed to fetch candidates:', e); }
    };

    /* No full-page spinner — page renders immediately with 0s */

    return (
        <div style={{ padding: '24px 32px', maxWidth: 1400, margin: '0 auto' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div>
                    <h1 style={{ fontSize: 28, fontWeight: 700, color: '#f1f5f9', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Briefcase size={28} style={{ color: '#6366f1' }} /> Hiring & Recruitment
                    </h1>
                    <p style={{ color: '#64748b', marginTop: 4 }}>Applicant Tracking System — manage job postings, candidates & pipeline</p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    {(['jobs', 'pipeline', 'analytics'] as const).map(v => (
                        <button key={v} onClick={() => setView(v)} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: view === v ? '#6366f1' : '#1e293b', color: view === v ? '#fff' : '#94a3b8', cursor: 'pointer', fontWeight: 500, fontSize: 13, textTransform: 'capitalize' }}>{v}</button>
                    ))}
                    <button onClick={() => setShowNewJob(true)} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#22c55e', color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Plus size={16} /> New Job
                    </button>
                </div>
            </div>

            {/* Analytics Cards */}
            {analytics && view !== 'pipeline' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
                    {[
                        { label: 'Open Positions', value: analytics.open_positions || 0, color: '#6366f1', icon: Briefcase },
                        { label: 'Total Candidates', value: analytics.total_candidates || 0, color: '#3b82f6', icon: Users },
                        { label: 'In Pipeline', value: analytics.in_pipeline || 0, color: '#f59e0b', icon: Filter },
                        { label: 'Hired This Month', value: analytics.hired_this_month || 0, color: '#22c55e', icon: CheckCircle },
                    ].map((stat, i) => (
                        <div key={i} style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, padding: 20 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ color: '#64748b', fontSize: 13 }}>{stat.label}</span>
                                <stat.icon size={18} style={{ color: stat.color }} />
                            </div>
                            <div style={{ fontSize: 32, fontWeight: 700, color: '#f1f5f9', marginTop: 8 }}>{stat.value}</div>
                        </div>
                    ))}
                </div>
            )}

            {/* Jobs List */}
            {view === 'jobs' && (
                <div style={{ display: 'grid', gap: 12 }}>
                    {jobs.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: 60, color: '#64748b', background: '#0f172a', borderRadius: 12, border: '1px solid #1e293b' }}>
                            <Briefcase size={48} style={{ opacity: 0.3, marginBottom: 16 }} />
                            <p style={{ fontSize: 16 }}>No job postings yet. Click "New Job" to create your first posting.</p>
                        </div>
                    ) : jobs.map(job => (
                        <div key={job.id} style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, padding: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', transition: 'border-color 0.2s' }} onClick={() => fetchCandidates(job.id)} onMouseOver={e => (e.currentTarget.style.borderColor = '#6366f1')} onMouseOut={e => (e.currentTarget.style.borderColor = '#1e293b')}>
                            <div>
                                <h3 style={{ color: '#f1f5f9', fontSize: 18, fontWeight: 600, margin: 0 }}>{job.title}</h3>
                                <div style={{ display: 'flex', gap: 16, marginTop: 6, color: '#94a3b8', fontSize: 13 }}>
                                    <span>{job.department}</span><span>•</span><span>{job.location}</span><span>•</span><span>{job.employment_type}</span>
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                <span style={{ background: job.status === 'open' ? '#16a34a22' : '#ef444422', color: job.status === 'open' ? '#22c55e' : '#ef4444', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>{job.status?.toUpperCase()}</span>
                                <span style={{ color: '#64748b', fontSize: 13 }}>{job.candidates_count || 0} candidates</span>
                                <ChevronRight size={18} style={{ color: '#64748b' }} />
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Pipeline View */}
            {view === 'pipeline' && (
                <div style={{ display: 'grid', gridTemplateColumns: `repeat(${PIPELINE_STAGES.length}, 1fr)`, gap: 12, overflowX: 'auto' }}>
                    {PIPELINE_STAGES.map(stage => (
                        <div key={stage} style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, padding: 16, minHeight: 300 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                <h4 style={{ color: STAGE_COLORS[stage], fontSize: 14, fontWeight: 600, margin: 0 }}>{stage}</h4>
                                <span style={{ background: '#1e293b', color: '#94a3b8', padding: '2px 8px', borderRadius: 10, fontSize: 12 }}>
                                    {candidates.filter(c => c.stage === stage.toLowerCase()).length}
                                </span>
                            </div>
                            {candidates.filter(c => c.stage === stage.toLowerCase()).map(c => (
                                <div key={c.id} style={{ background: '#1e293b', borderRadius: 8, padding: 12, marginBottom: 8 }}>
                                    <div style={{ color: '#f1f5f9', fontSize: 14, fontWeight: 500 }}>{c.candidate_name}</div>
                                    <div style={{ color: '#64748b', fontSize: 12, marginTop: 4 }}>{c.candidate_email}</div>
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            )}

            {/* Analytics View */}
            {view === 'analytics' && analytics && (
                <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, padding: 24 }}>
                    <h3 style={{ color: '#f1f5f9', fontSize: 18, fontWeight: 600, marginBottom: 16 }}>Pipeline Analytics</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                        {(analytics.pipeline_stages || []).map((stage, i) => (
                            <div key={i} style={{ background: '#1e293b', borderRadius: 8, padding: 16 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                    <span style={{ color: '#94a3b8', fontSize: 13 }}>{stage.stage}</span>
                                    <span style={{ color: '#f1f5f9', fontWeight: 700 }}>{stage.count}</span>
                                </div>
                                <div style={{ height: 6, background: '#0f172a', borderRadius: 3 }}>
                                    <div style={{ height: '100%', background: '#6366f1', borderRadius: 3, width: `${Math.min((stage.count / (analytics.total_candidates || 1)) * 100, 100)}%` }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* New Job Modal */}
            {showNewJob && (
                <div style={{ position: 'fixed', inset: 0, background: '#00000080', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 16, padding: 32, width: 500 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                            <h2 style={{ color: '#f1f5f9', fontSize: 20, fontWeight: 600, margin: 0 }}>Create Job Posting</h2>
                            <button onClick={() => setShowNewJob(false)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}><X size={20} /></button>
                        </div>
                        {(['title', 'department', 'location', 'description'] as const).map(field => (
                            <div key={field} style={{ marginBottom: 16 }}>
                                <label style={{ color: '#94a3b8', fontSize: 13, display: 'block', marginBottom: 6, textTransform: 'capitalize' }}>{field}</label>
                                {field === 'description' ? (
                                    <textarea value={newJob[field]} onChange={e => setNewJob(p => ({ ...p, [field]: e.target.value }))} style={{ width: '100%', background: '#1e293b', border: '1px solid #334155', borderRadius: 8, padding: '10px 12px', color: '#f1f5f9', fontSize: 14, minHeight: 80, resize: 'vertical' }} />
                                ) : (
                                    <input value={newJob[field]} onChange={e => setNewJob(p => ({ ...p, [field]: e.target.value }))} style={{ width: '100%', background: '#1e293b', border: '1px solid #334155', borderRadius: 8, padding: '10px 12px', color: '#f1f5f9', fontSize: 14 }} />
                                )}
                            </div>
                        ))}
                        <button onClick={createJob} style={{ width: '100%', padding: '12px', borderRadius: 8, border: 'none', background: '#6366f1', color: '#fff', fontWeight: 600, fontSize: 14, cursor: 'pointer', marginTop: 8 }}>Create Job Posting</button>
                    </div>
                </div>
            )}
        </div>
    );
}
