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
        } catch (e) { logger.error('Failed to fetch checklists:', { error: String(e) }); }
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
        } catch (e) { logger.error('Failed to create template:', { error: String(e) }); }
    };

    const completeTask = async (checklistId: string, taskId: string) => {
        try {
            await api.put(`/venues/${venueId}/hr/checklists/${checklistId}/tasks/${taskId}/complete`);
            fetchData();
        } catch (e) { logger.error('Failed to complete task:', { error: String(e) }); }
    };

    const addItem = () => setNewTemplate(p => ({ ...p, items: [...p.items, { title: '', assignee_role: 'hr', due_days_offset: 0 }] }));
    const removeItem = (i: number) => setNewTemplate(p => ({ ...p, items: p.items.filter((_, idx) => idx !== i) }));
    const updateItem = (i: number, field: keyof ChecklistItem, val: string | number) => setNewTemplate(p => ({ ...p, items: p.items.map((item, idx) => idx === i ? { ...item, [field]: val } : item) }));

    /* No full-page spinner — page renders immediately with 0s */

    return (
        <div className="px-8 py-6 max-w-[1400px] mx-auto">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-[28px] font-bold text-slate-100 m-0 flex items-center gap-2.5">
                        <ClipboardList size={28} className="text-indigo-400" /> Onboarding & Task Checklists
                    </h1>
                    <p className="text-slate-500 mt-1">Manage onboarding, offboarding & custom task templates</p>
                </div>
                <div className="flex gap-2">
                    {(['templates', 'active'] as const).map(v => (
                        <button key={v} onClick={() => setView(v)} className={`px-4 py-2 rounded-lg border-none cursor-pointer font-medium text-[13px] capitalize ${view === v ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-400'}`}>{v}</button>
                    ))}
                    <button onClick={() => setShowNewTemplate(true)} className="px-4 py-2 rounded-lg border-none bg-green-500 text-white cursor-pointer font-semibold text-[13px] flex items-center gap-1.5">
                        <Plus size={16} /> New Template
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-6">
                {[
                    { label: 'Templates', value: templates.length, color: 'text-indigo-400', icon: ClipboardList },
                    { label: 'Active Checklists', value: activeChecklists.length, color: 'text-blue-400', icon: Users },
                    { label: 'Completed', value: activeChecklists.filter(c => c.progress === 100 || c.status === 'completed').length, color: 'text-green-400', icon: CheckCircle },
                ].map((s, i) => (
                    <div key={i} className="bg-slate-950 border border-slate-800 rounded-xl p-5">
                        <div className="flex justify-between">
                            <span className="text-slate-500 text-[13px]">{s.label}</span>
                            <s.icon size={18} className={s.color} />
                        </div>
                        <div className="text-[32px] font-bold text-slate-100 mt-2">{s.value}</div>
                    </div>
                ))}
            </div>

            {/* Templates List */}
            {view === 'templates' && (
                <div className="grid gap-3">
                    {templates.length === 0 ? (
                        <div className="text-center p-[60px] text-slate-500 bg-slate-950 rounded-xl border border-slate-800">
                            <ClipboardList size={48} className="opacity-30 mb-4" />
                            <p>{"No "}templates yet. Create your first onboarding checklist.</p>
                        </div>
                    ) : templates.map(t => (
                        <div key={t.id} className="bg-slate-950 border border-slate-800 rounded-xl p-5">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h3 className="text-slate-100 text-lg font-semibold m-0">{t.name}</h3>
                                    <div className="flex gap-3 mt-1.5 text-slate-400 text-[13px]">
                                        <span className="bg-indigo-500/10 text-indigo-400 px-2.5 py-0.5 rounded-xl text-xs">{t.template_type}</span>
                                        <span>{t.items?.length || 0} tasks</span>
                                    </div>
                                </div>
                                <ChevronRight size={18} className="text-slate-500" />
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Active Checklists */}
            {view === 'active' && (
                <div className="grid gap-3">
                    {activeChecklists.length === 0 ? (
                        <div className="text-center p-[60px] text-slate-500 bg-slate-950 rounded-xl border border-slate-800">
                            <Users size={48} className="opacity-30 mb-4" />
                            <p>{"No "}active checklists. Activate a template for an employee.</p>
                        </div>
                    ) : activeChecklists.map(c => (
                        <div key={c.id} className="bg-slate-950 border border-slate-800 rounded-xl p-5">
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="text-slate-100 text-base font-semibold m-0">{c.employee_name || 'Employee'} — {c.template_name || 'Checklist'}</h3>
                                <span className={`font-semibold ${c.progress === 100 ? 'text-green-400' : 'text-amber-400'}`}>{c.progress || 0}%</span>
                            </div>
                            <div className="h-1.5 bg-slate-800 rounded-sm mb-3">
                                <div className={`h-full rounded-sm transition-[width] duration-300 ${c.progress === 100 ? 'bg-green-400' : 'bg-indigo-500'}`} style={{ width: `${c.progress || 0}%` }} /> {}
                            </div>
                            {(c.tasks || []).map((task) => (
                                <div key={task.id} onClick={() => !task.completed && completeTask(c.id, task.id)} className={`flex items-center gap-2.5 py-2 border-b border-slate-800/20 ${task.completed ? 'cursor-default' : 'cursor-pointer'}`}>
                                    <div className={`w-5 h-5 rounded flex items-center justify-center shrink-0 ${task.completed ? 'bg-green-500 border-none' : 'bg-slate-800 border-2 border-slate-700'}`}>
                                        {task.completed && <Check size={14} className="text-white" />}
                                    </div>
                                    <span className={`text-sm ${task.completed ? 'text-slate-500 line-through' : 'text-slate-100'}`}>{task.title}</span>
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            )}

            {/* New Template Modal */}
            {showNewTemplate && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000]">
                    <div className="bg-slate-950 border border-slate-800 rounded-2xl p-8 w-[540px] max-h-[80vh] overflow-auto">
                        <div className="flex justify-between items-center mb-5">
                            <h2 className="text-slate-100 text-xl font-semibold m-0">New Checklist Template</h2>
                            <button onClick={() => setShowNewTemplate(false)} className="bg-transparent border-none text-slate-500 cursor-pointer" aria-label="Close"><X size={20} /></button>
                        </div>
                        <div className="mb-4">
                            <label className="text-slate-400 text-[13px] block mb-1.5">Template Name</label>
                            <input value={newTemplate.name} onChange={e => setNewTemplate(p => ({ ...p, name: e.target.value }))} aria-label="Template name" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-slate-100 text-sm" />
                        </div>
                        <div className="mb-4">
                            <label className="text-slate-400 text-[13px] block mb-1.5">Type</label>
                            <select value={newTemplate.template_type} onChange={e => setNewTemplate(p => ({ ...p, template_type: e.target.value }))} aria-label="Template type" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-slate-100 text-sm">
                                <option value="onboarding">Onboarding</option>
                                <option value="offboarding">Offboarding</option>
                                <option value="probation_review">Probation Review</option>
                                <option value="contract_renewal">Contract Renewal</option>
                            </select>
                        </div>
                        <label className="text-slate-400 text-[13px] block mb-2">Tasks</label>
                        {newTemplate.items.map((item, i) => (
                            <div key={i} className="flex gap-2 mb-2">
                                <input value={item.title} onChange={e => updateItem(i, 'title', e.target.value)} placeholder="Task title" className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-2 text-slate-100 text-[13px]" />
                                <button onClick={() => removeItem(i)} className="bg-red-500/10 border-none rounded-lg px-2.5 py-1.5 text-red-400 cursor-pointer" aria-label="Remove task"><Trash2 size={14} /></button>
                            </div>
                        ))}
                        <button onClick={addItem} className="w-full py-2 rounded-lg border border-dashed border-slate-700 bg-transparent text-slate-400 cursor-pointer text-[13px] mb-4">+ Add Task</button>
                        <button onClick={createTemplate} className="w-full py-3 rounded-lg border-none bg-indigo-500 text-white font-semibold text-sm cursor-pointer">Create Template</button>
                    </div>
                </div>
            )}
        </div>
    );
}
