import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { logger } from '@/lib/logger';
import { ClipboardList, Plus, Check, Clock, Users, ChevronRight, X, Trash2, CheckCircle } from 'lucide-react';

interface ChecklistItem {
    title: string;
    assignee_role: string;
    due_days_offset: number;
}

interface ChecklistTemplate {
    id: string;
    name: string;
    template_type: string;
    items?: ChecklistItem[];
}

interface ChecklistTask {
    id: string;
    title: string;
    completed: boolean;
}

interface ActiveChecklist {
    id: string;
    employee_name?: string;
    template_name?: string;
    progress: number;
    status?: string;
    tasks?: ChecklistTask[];
}

interface NewTemplateForm {
    name: string;
    template_type: string;
    items: ChecklistItem[];
}

export default function OnboardingChecklists() {
    const { user } = useAuth();
    const [templates, setTemplates] = useState<ChecklistTemplate[]>([]);
    const [activeChecklists, setActiveChecklists] = useState<ActiveChecklist[]>([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState<'templates' | 'active'>('templates');
    const [showNewTemplate, setShowNewTemplate] = useState(false);
    const [newTemplate, setNewTemplate] = useState<NewTemplateForm>({ name: '', template_type: 'onboarding', items: [{ title: '', assignee_role: 'hr', due_days_offset: 0 }] });

    const venueId = localStorage.getItem('currentVenueId');

    const fetchData = useCallback(async () => {
        if (!venueId) return;
        setLoading(true);
        try {
            const [tRes, aRes] = await Promise.all([
                api.get(`/venues/${venueId}/hr/checklist-templates`),
                api.get(`/venues/${venueId}/hr/checklists`),
            ]);
            setTemplates(tRes.data || []);
            setActiveChecklists(aRes.data || []);
        } catch (e) { logger.error('Failed to fetch checklists:', e); }
        setLoading(false);
    }, [venueId]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const createTemplate = async () => {
        const payload = { ...newTemplate, items: newTemplate.items.filter(i => i.title.trim()) };
        try {
            await api.post(`/venues/${venueId}/hr/checklist-templates`, payload);
            setShowNewTemplate(false);
            setNewTemplate({ name: '', template_type: 'onboarding', items: [{ title: '', assignee_role: 'hr', due_days_offset: 0 }] });
            fetchData();
        } catch (e) { logger.error('Failed to create template:', e); }
    };

    const completeTask = async (checklistId: string, taskId: string) => {
        try {
            await api.put(`/venues/${venueId}/hr/checklists/${checklistId}/tasks/${taskId}/complete`);
            fetchData();
        } catch (e) { logger.error('Failed to complete task:', e); }
    };

    const addItem = () => setNewTemplate(p => ({ ...p, items: [...p.items, { title: '', assignee_role: 'hr', due_days_offset: 0 }] }));
    const removeItem = (i: number) => setNewTemplate(p => ({ ...p, items: p.items.filter((_, idx) => idx !== i) }));
    const updateItem = (i: number, field: keyof ChecklistItem, val: string | number) => setNewTemplate(p => ({ ...p, items: p.items.map((item, idx) => idx === i ? { ...item, [field]: val } : item) }));

    /* No full-page spinner — page renders immediately with 0s */

    return (
        <div style={{ padding: '24px 32px', maxWidth: 1400, margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div>
                    <h1 style={{ fontSize: 28, fontWeight: 700, color: '#f1f5f9', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
                        <ClipboardList size={28} style={{ color: '#6366f1' }} /> Onboarding & Task Checklists
                    </h1>
                    <p style={{ color: '#64748b', marginTop: 4 }}>Manage onboarding, offboarding & custom task templates</p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    {(['templates', 'active'] as const).map(v => (
                        <button key={v} onClick={() => setView(v)} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: view === v ? '#6366f1' : '#1e293b', color: view === v ? '#fff' : '#94a3b8', cursor: 'pointer', fontWeight: 500, fontSize: 13, textTransform: 'capitalize' }}>{v}</button>
                    ))}
                    <button onClick={() => setShowNewTemplate(true)} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#22c55e', color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Plus size={16} /> New Template
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
                {[
                    { label: 'Templates', value: templates.length, color: '#6366f1', icon: ClipboardList },
                    { label: 'Active Checklists', value: activeChecklists.length, color: '#3b82f6', icon: Users },
                    { label: 'Completed', value: activeChecklists.filter(c => c.progress === 100 || c.status === 'completed').length, color: '#22c55e', icon: CheckCircle },
                ].map((s, i) => (
                    <div key={i} style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, padding: 20 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#64748b', fontSize: 13 }}>{s.label}</span>
                            <s.icon size={18} style={{ color: s.color }} />
                        </div>
                        <div style={{ fontSize: 32, fontWeight: 700, color: '#f1f5f9', marginTop: 8 }}>{s.value}</div>
                    </div>
                ))}
            </div>

            {/* Templates List */}
            {view === 'templates' && (
                <div style={{ display: 'grid', gap: 12 }}>
                    {templates.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: 60, color: '#64748b', background: '#0f172a', borderRadius: 12, border: '1px solid #1e293b' }}>
                            <ClipboardList size={48} style={{ opacity: 0.3, marginBottom: 16 }} />
                            <p>No templates yet. Create your first onboarding checklist.</p>
                        </div>
                    ) : templates.map(t => (
                        <div key={t.id} style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, padding: 20 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <h3 style={{ color: '#f1f5f9', fontSize: 18, fontWeight: 600, margin: 0 }}>{t.name}</h3>
                                    <div style={{ display: 'flex', gap: 12, marginTop: 6, color: '#94a3b8', fontSize: 13 }}>
                                        <span style={{ background: '#6366f122', color: '#6366f1', padding: '2px 10px', borderRadius: 12, fontSize: 12 }}>{t.template_type}</span>
                                        <span>{t.items?.length || 0} tasks</span>
                                    </div>
                                </div>
                                <ChevronRight size={18} style={{ color: '#64748b' }} />
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Active Checklists */}
            {view === 'active' && (
                <div style={{ display: 'grid', gap: 12 }}>
                    {activeChecklists.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: 60, color: '#64748b', background: '#0f172a', borderRadius: 12, border: '1px solid #1e293b' }}>
                            <Users size={48} style={{ opacity: 0.3, marginBottom: 16 }} />
                            <p>No active checklists. Activate a template for an employee.</p>
                        </div>
                    ) : activeChecklists.map(c => (
                        <div key={c.id} style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, padding: 20 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                <h3 style={{ color: '#f1f5f9', fontSize: 16, fontWeight: 600, margin: 0 }}>{c.employee_name || 'Employee'} — {c.template_name || 'Checklist'}</h3>
                                <span style={{ color: c.progress === 100 ? '#22c55e' : '#f59e0b', fontWeight: 600 }}>{c.progress || 0}%</span>
                            </div>
                            <div style={{ height: 6, background: '#1e293b', borderRadius: 3, marginBottom: 12 }}>
                                <div style={{ height: '100%', background: c.progress === 100 ? '#22c55e' : '#6366f1', borderRadius: 3, width: `${c.progress || 0}%`, transition: 'width 0.3s' }} />
                            </div>
                            {(c.tasks || []).map((task) => (
                                <div key={task.id} onClick={() => !task.completed && completeTask(c.id, task.id)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid #1e293b22', cursor: task.completed ? 'default' : 'pointer' }}>
                                    <div style={{ width: 20, height: 20, borderRadius: 4, background: task.completed ? '#22c55e' : '#1e293b', border: task.completed ? 'none' : '2px solid #334155', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        {task.completed && <Check size={14} style={{ color: '#fff' }} />}
                                    </div>
                                    <span style={{ color: task.completed ? '#64748b' : '#f1f5f9', fontSize: 14, textDecoration: task.completed ? 'line-through' : 'none' }}>{task.title}</span>
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            )}

            {/* New Template Modal */}
            {showNewTemplate && (
                <div style={{ position: 'fixed', inset: 0, background: '#00000080', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 16, padding: 32, width: 540, maxHeight: '80vh', overflow: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                            <h2 style={{ color: '#f1f5f9', fontSize: 20, fontWeight: 600, margin: 0 }}>New Checklist Template</h2>
                            <button onClick={() => setShowNewTemplate(false)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}><X size={20} /></button>
                        </div>
                        <div style={{ marginBottom: 16 }}>
                            <label style={{ color: '#94a3b8', fontSize: 13, display: 'block', marginBottom: 6 }}>Template Name</label>
                            <input value={newTemplate.name} onChange={e => setNewTemplate(p => ({ ...p, name: e.target.value }))} style={{ width: '100%', background: '#1e293b', border: '1px solid #334155', borderRadius: 8, padding: '10px 12px', color: '#f1f5f9', fontSize: 14 }} />
                        </div>
                        <div style={{ marginBottom: 16 }}>
                            <label style={{ color: '#94a3b8', fontSize: 13, display: 'block', marginBottom: 6 }}>Type</label>
                            <select value={newTemplate.template_type} onChange={e => setNewTemplate(p => ({ ...p, template_type: e.target.value }))} style={{ width: '100%', background: '#1e293b', border: '1px solid #334155', borderRadius: 8, padding: '10px 12px', color: '#f1f5f9', fontSize: 14 }}>
                                <option value="onboarding">Onboarding</option>
                                <option value="offboarding">Offboarding</option>
                                <option value="probation_review">Probation Review</option>
                                <option value="contract_renewal">Contract Renewal</option>
                            </select>
                        </div>
                        <label style={{ color: '#94a3b8', fontSize: 13, display: 'block', marginBottom: 8 }}>Tasks</label>
                        {newTemplate.items.map((item, i) => (
                            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                                <input value={item.title} onChange={e => updateItem(i, 'title', e.target.value)} placeholder="Task title" style={{ flex: 1, background: '#1e293b', border: '1px solid #334155', borderRadius: 8, padding: '8px 10px', color: '#f1f5f9', fontSize: 13 }} />
                                <button onClick={() => removeItem(i)} style={{ background: '#ef444422', border: 'none', borderRadius: 8, padding: '6px 10px', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={14} /></button>
                            </div>
                        ))}
                        <button onClick={addItem} style={{ width: '100%', padding: '8px', borderRadius: 8, border: '1px dashed #334155', background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontSize: 13, marginBottom: 16 }}>+ Add Task</button>
                        <button onClick={createTemplate} style={{ width: '100%', padding: '12px', borderRadius: 8, border: 'none', background: '#6366f1', color: '#fff', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>Create Template</button>
                    </div>
                </div>
            )}
        </div>
    );
}
