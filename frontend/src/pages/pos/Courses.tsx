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

interface Course { id: string; name: string; sortOrder: number; color: string; defaultDelay: number; autoFire: boolean; isActive: boolean; itemCount: number; }

const pg: React.CSSProperties = { minHeight: '100vh', background: 'var(--bg-primary,#0a0a0a)', color: 'var(--text-primary,#fafafa)', fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif' };
const ct: React.CSSProperties = { maxWidth: 1100, margin: '0 auto', padding: '24px 20px' };
const cd: React.CSSProperties = { background: 'var(--bg-card,#18181b)', border: '1px solid var(--border-primary,#27272a)', borderRadius: 12, padding: 20, marginBottom: 16 };
const bp: React.CSSProperties = { padding: '10px 24px', background: '#3B82F6', border: 'none', borderRadius: 8, color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 };
const bo: React.CSSProperties = { padding: '10px 24px', background: 'transparent', border: '1px solid var(--border-primary,#27272a)', borderRadius: 8, color: 'var(--text-primary,#fafafa)', fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 };
const ip: React.CSSProperties = { width: '100%', padding: '10px 14px', background: 'var(--bg-secondary,#09090b)', border: '1px solid var(--border-primary,#27272a)', borderRadius: 8, color: 'var(--text-primary,#fafafa)', fontSize: 14 };

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
                (c: any) => ({ id: c.id || c._id || crypto.randomUUID(), name: c.name || '', sortOrder: c.sortOrder ?? c.sort_order ?? 0, color: c.color || '#3B82F6', defaultDelay: c.defaultDelay ?? c.default_delay ?? 0, autoFire: c.autoFire ?? c.auto_fire ?? false, isActive: c.isActive ?? c.is_active ?? true, itemCount: c.itemCount ?? c.item_count ?? 0 }))); setIsLive(true);
        }
    }, [apiData]);

    const save = () => { if (!editing) return; const e = courses.find(c => c.id === editing.id); if (e) setCourses(p => p.map(c => c.id === editing.id ? editing : c)); else setCourses(p => [...p, editing]); setEditing(null); toast.success('Saved'); };

    return (
        <div style={pg}><div style={ct}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                <div>
                    <button onClick={() => navigate(-1)} style={{ ...bo, marginBottom: 8, padding: '6px 14px', fontSize: 12 }}><ArrowLeft size={14} /> Back</button>
                    <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Courses {isLive && <Wifi size={14} style={{ color: '#10B981', verticalAlign: 'middle', marginLeft: 6 }} />}</h1>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary,#a1a1aa)', margin: '4px 0 0' }}>Manage meal courses and kitchen firing sequence</p>
                </div>
                <button style={bp} onClick={() => setEditing({ id: crypto.randomUUID(), name: '', sortOrder: courses.length + 1, color: '#3B82F6', defaultDelay: 0, autoFire: false, isActive: true, itemCount: 0 })}><Plus size={16} /> Add Course</button>
            </div>

            <div style={cd}>
                <div style={{ display: 'grid', gridTemplateColumns: '28px 40px 1fr 100px 80px 80px 50px', gap: 12, padding: '8px 12px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: 0.5, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <div></div><div>#</div><div>Course</div><div>Delay</div><div>Auto Fire</div><div>Items</div><div></div>
                </div>
                {courses.sort((a, b) => a.sortOrder - b.sortOrder).map(course => (
                    <div key={course.id} style={{ display: 'grid', gridTemplateColumns: '28px 40px 1fr 100px 80px 80px 50px', gap: 12, padding: '14px 12px', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.03)', cursor: 'pointer', opacity: course.isActive ? 1 : 0.5 }} onClick={() => setEditing({ ...course })}>
                        <GripVertical size={14} style={{ color: 'var(--text-secondary)', opacity: 0.3, cursor: 'grab' }} />
                        <div style={{ width: 28, height: 28, borderRadius: 6, background: course.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff' }}>{course.sortOrder}</div>
                        <span style={{ fontSize: 14, fontWeight: 500 }}>{course.name}</span>
                        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{course.defaultDelay > 0 ? `${course.defaultDelay} min delay` : 'No delay'}</span>
                        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: course.autoFire ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.04)', color: course.autoFire ? '#10B981' : 'var(--text-secondary)' }}>{course.autoFire ? 'Yes' : 'Manual'}</span>
                        <span style={{ fontSize: 13, fontWeight: 500 }}>{course.itemCount}</span>
                        <button style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }} onClick={e => { e.stopPropagation(); setEditing({ ...course }); }}><Edit3 size={13} /></button>
                    </div>
                ))}
            </div>

            <div style={{ ...cd, background: 'rgba(59,130,246,0.04)', border: '1px solid rgba(59,130,246,0.2)' }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, color: '#3B82F6' }}>💡 Course Flow</div>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6 }}>
                    Courses are fired to the kitchen in sequence. Items in Course 1 fire immediately ("Auto Fire"), while later courses wait for the server to manually fire them or use default delays. This ensures soup arrives before mains, and desserts after.
                </p>
            </div>
        </div>

            {editing && <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setEditing(null)}>
                <div style={{ ...cd, width: 480 }} onClick={e => e.stopPropagation()}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                        <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{courses.find(c => c.id === editing.id) ? 'Edit' : 'New'} Course</h3>
                        <button title="Close" style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }} onClick={() => setEditing(null)}><X size={20} /></button>
                    </div>
                    <div style={{ marginBottom: 14 }}><label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Name *</label>
                        <input style={ip} value={editing.name} onChange={e => setEditing(p => p ? { ...p, name: e.target.value } : null)} placeholder="e.g. Main Course" /></div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                        <div><label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Order</label>
                            <input type="number" min={1} style={ip} value={editing.sortOrder} onChange={e => setEditing(p => p ? { ...p, sortOrder: parseInt(e.target.value) || 1 } : null)} aria-label="Sort order" /></div>
                        <div><label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Default Delay (min)</label>
                            <input type="number" min={0} style={ip} value={editing.defaultDelay} onChange={e => setEditing(p => p ? { ...p, defaultDelay: parseInt(e.target.value) || 0 } : null)} aria-label="Default delay minutes" /></div>
                    </div>
                    <div style={{ marginBottom: 14 }}><label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>Color</label>
                        <div style={{ display: 'flex', gap: 6 }}>{COLORS.map(c => <div key={c} onClick={() => setEditing(p => p ? { ...p, color: c } : null)} style={{ width: 28, height: 28, borderRadius: 6, background: c, cursor: 'pointer', border: editing.color === c ? '3px solid #fff' : '3px solid transparent' }} />)}</div></div>
                    <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
                        <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}><input type="checkbox" checked={editing.autoFire} onChange={() => setEditing(p => p ? { ...p, autoFire: !p.autoFire } : null)} /> Auto Fire</label>
                        <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}><input type="checkbox" checked={editing.isActive} onChange={() => setEditing(p => p ? { ...p, isActive: !p.isActive } : null)} /> Active</label>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button style={{ ...bp, flex: 1, justifyContent: 'center' }} onClick={save}><Save size={14} /> Save</button>
                        <button title="Delete course" style={{ ...bo, color: '#EF4444' }} onClick={() => { setCourses(p => p.filter(c => c.id !== editing.id)); setEditing(null); toast.success('Deleted'); }}><Trash2 size={14} /></button>
                        <button style={bo} onClick={() => setEditing(null)}>Cancel</button>
                    </div>
                </div>
            </div>}
        </div>
    );
};

export default Courses;
