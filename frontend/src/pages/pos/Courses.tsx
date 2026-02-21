/**
 * Courses.tsx — K-Series Course Management
 * Configure meal courses for kitchen timing
 * Lightspeed K-Series Back Office > Configuration > Courses parity
 */
import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Save, Edit3, Trash2, X, Clock, GripVertical, Wifi } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useVenueConfig } from '../../hooks/shared/useVenueConfig';
import './pos-shared.css';

interface Course { id: string; name: string; sortOrder: number; color: string; defaultDelay: number; autoFire: boolean; isActive: boolean; itemCount: number; }

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316'];

const SEED: Course[] = [
    { id: '1', name: 'Drinks / Aperitif', sortOrder: 1, color: '#8B5CF6', defaultDelay: 0, autoFire: true, isActive: true, itemCount: 24 },
    { id: '2', name: 'Appetizer / Starter', sortOrder: 2, color: '#3B82F6', defaultDelay: 0, autoFire: false, isActive: true, itemCount: 12 },
    { id: '3', name: 'Soup / Salad', sortOrder: 3, color: '#10B981', defaultDelay: 5, autoFire: false, isActive: true, itemCount: 8 },
    { id: '4', name: 'Main Course', sortOrder: 4, color: '#F59E0B', defaultDelay: 10, autoFire: false, isActive: true, itemCount: 18 },
    { id: '5', name: 'Side Dish', sortOrder: 5, color: '#06B6D4', defaultDelay: 0, autoFire: true, isActive: true, itemCount: 10 },
    { id: '6', name: 'Dessert', sortOrder: 6, color: '#EC4899', defaultDelay: 15, autoFire: false, isActive: true, itemCount: 8 },
    { id: '7', name: 'Digestif / Coffee', sortOrder: 7, color: '#F97316', defaultDelay: 5, autoFire: false, isActive: true, itemCount: 6 },
];

const courseTableCols = '28px 40px 1fr 100px 80px 80px 50px';

const Courses: React.FC = () => {
    const navigate = useNavigate();
    const [courses, setCourses] = useState(SEED);
    const [editing, setEditing] = useState<Course | null>(null);
    const [isLive, setIsLive] = useState(false);

    const venueId = localStorage.getItem('restin_pos_venue') || '';
    const { data: apiData } = useVenueConfig<Course>({ venueId, configType: 'courses' });
    useEffect(() => {
        if (apiData && apiData.length > 0) {
            setCourses(apiData.map(// eslint-disable-next-line @typescript-eslint/no-explicit-any
                (c: /**/any) => ({ id: c.id || c._id || crypto.randomUUID(), name: c.name || '', sortOrder: c.sortOrder ?? c.sort_order ?? 0, color: c.color || '#3B82F6', defaultDelay: c.defaultDelay ?? c.default_delay ?? 0, autoFire: c.autoFire ?? c.auto_fire ?? false, isActive: c.isActive ?? c.is_active ?? true, itemCount: c.itemCount ?? c.item_count ?? 0 }))); setIsLive(true);
        }
    }, [apiData]);

    const save = () => { if (!editing) return; const e = courses.find(c => c.id === editing.id); if (e) setCourses(p => p.map(c => c.id === editing.id ? editing : c)); else setCourses(p => [...p, editing]); setEditing(null); toast.success('Saved'); };

    return (
        <div className="pos-page"><div className="pos-container">
            <div className="pos-header">
                <div>
                    <button onClick={() => navigate(-1)} className="pos-btn-outline pos-btn-back"><ArrowLeft size={14} /> Back</button>
                    <h1 className="pos-title">Courses {isLive && <Wifi size={14} className="pos-live-icon" />}</h1>
                    <p className="pos-subtitle">Manage meal courses and kitchen firing sequence</p>
                </div>
                <button className="pos-btn-primary" onClick={() => setEditing({ id: crypto.randomUUID(), name: '', sortOrder: courses.length + 1, color: '#3B82F6', defaultDelay: 0, autoFire: false, isActive: true, itemCount: 0 })}><Plus size={16} /> Add Course</button>
            </div>

            <div className="pos-card">
                <div className="pos-table-header" style={{ gridTemplateColumns: courseTableCols  /* keep-inline */ }} /* keep-inline */ /* keep-inline */>
                    <div></div><div>#</div><div>Course</div><div>Delay</div><div>Auto Fire</div><div>Items</div><div></div>
                </div>
                {courses.sort((a, b) => a.sortOrder - b.sortOrder).map(course => (
                    <div key={course.id} className="pos-table-row" style={{ gridTemplateColumns: courseTableCols, opacity: course.isActive ? 1 : 0.5  /* keep-inline */ }} /* keep-inline */ /* keep-inline */ onClick={() => setEditing({ ...course })}>
                        <GripVertical size={14} className="pos-icon-grab" />
                        <div className="pos-stat-icon" style={{ width: 28, height: 28, borderRadius: 6, background: course.color, fontSize: 12, fontWeight: 700, color: '#fff'  /* keep-inline */ }} /* keep-inline */ /* keep-inline */>{course.sortOrder}</div>
                        <span className="pos-cell-value">{course.name}</span>
                        <span className="pos-cell-secondary">{course.defaultDelay > 0 ? `${course.defaultDelay} min delay` : 'No delay'}</span>
                        <span className={`pos-badge ${course.autoFire ? 'pos-badge--green' : 'pos-badge--gray'}`}>{course.autoFire ? 'Yes' : 'Manual'}</span>
                        <span className="pos-cell-value">{course.itemCount}</span>
                        <button className="pos-btn-icon" title="Edit course" onClick={e => { e.stopPropagation(); setEditing({ ...course }); }}><Edit3 size={13} /></button>
                    </div>
                ))}
            </div>

            <div className="pos-card" style={{ background: 'rgba(59,130,246,0.04)', borderColor: 'rgba(59,130,246,0.2)'  /* keep-inline */ }} /* keep-inline */ /* keep-inline */>
                <div className="pos-text-sm pos-text-bold pos-mb-8" style={{ color: '#3B82F6'  /* keep-inline */ }} /* keep-inline */ /* keep-inline */>💡 Course Flow</div>
                <p className="pos-cell-secondary pos-mb-0" style={{ lineHeight: 1.6  /* keep-inline */ }} /* keep-inline */ /* keep-inline */>
                    Courses are fired to the kitchen in sequence. Items in Course 1 fire immediately ("Auto Fire"), while later courses wait for the server to manually fire them or use default delays. This ensures soup arrives before mains, and desserts after.
                </p>
            </div>
        </div>

            {editing && <div className="pos-modal-overlay" onClick={() => setEditing(null)}>
                <div className="pos-card pos-modal pos-modal--sm" onClick={e => e.stopPropagation()}>
                    <div className="pos-modal-header">
                        <h3 className="pos-modal-title">{courses.find(c => c.id === editing.id) ? 'Edit' : 'New'} Course</h3>
                        <button title="Close" className="pos-btn-icon" onClick={() => setEditing(null)}><X size={20} /></button>
                    </div>
                    <div className="pos-form-group"><label className="pos-form-label">Name *</label>
                        <input className="pos-input" value={editing.name} onChange={e => setEditing(p => p ? { ...p, name: e.target.value } : null)} placeholder="e.g. Main Course" /></div>
                    <div className="pos-form-grid">
                        <div><label className="pos-form-label">Order</label>
                            <input type="number" min={1} className="pos-input" value={editing.sortOrder} onChange={e => setEditing(p => p ? { ...p, sortOrder: parseInt(e.target.value) || 1 } : null)} aria-label="Sort order" /></div>
                        <div><label className="pos-form-label">Default Delay (min)</label>
                            <input type="number" min={0} className="pos-input" value={editing.defaultDelay} onChange={e => setEditing(p => p ? { ...p, defaultDelay: parseInt(e.target.value) || 0 } : null)} aria-label="Default delay minutes" /></div>
                    </div>
                    <div className="pos-form-group"><label className="pos-form-label">Color</label>
                        <div className="pos-color-picker">{COLORS.map(c => <div key={c} onClick={() => setEditing(p => p ? { ...p, color: c } : null)} className={`pos-color-swatch ${editing.color === c ? 'pos-color-swatch--selected' : ''}`} style={{ background: c  /* keep-inline */ }} /* keep-inline */ /* keep-inline */ />)}</div></div>
                    <div className="pos-flex pos-gap-16 pos-mb-16">
                        <label className="pos-toggle-label"><input type="checkbox" checked={editing.autoFire} onChange={() => setEditing(p => p ? { ...p, autoFire: !p.autoFire } : null)} /> Auto Fire</label>
                        <label className="pos-toggle-label"><input type="checkbox" checked={editing.isActive} onChange={() => setEditing(p => p ? { ...p, isActive: !p.isActive } : null)} /> Active</label>
                    </div>
                    <div className="pos-modal-footer">
                        <button className="pos-btn-primary" style={{ flex: 1, justifyContent: 'center'  /* keep-inline */ }} /* keep-inline */ /* keep-inline */ onClick={save}><Save size={14} /> Save</button>
                        <button title="Delete course" className="pos-btn-outline" style={{ color: '#EF4444'  /* keep-inline */ }} /* keep-inline */ /* keep-inline */ onClick={() => { setCourses(p => p.filter(c => c.id !== editing.id)); setEditing(null); toast.success('Deleted'); }}><Trash2 size={14} /></button>
                        <button className="pos-btn-outline" onClick={() => setEditing(null)}>Cancel</button>
                    </div>
                </div>
            </div>}
        </div>
    );
};

export default Courses;
