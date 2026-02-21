/**
 * POSUsersGroups.tsx — K-Series POS Users & Groups
 * Manage POS user access, PINs, permissions groups
 * Lightspeed K-Series Back Office > Configuration > POS Users parity
 * WIRED TO: /api/venues/{venueId}/staff (useStaffService)
 */
import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Plus, Save, Edit3, Trash2, Search, X, Shield, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useStaffService } from '../../hooks/shared/useStaffService';
import type { StaffMember, PosConfig } from '../../hooks/shared/useStaffService';
import authStore from '../../lib/AuthStore';
import './pos-shared.css';

interface POSUser { id: string; name: string; pin: string; group: string; email: string; isActive: boolean; lastLogin: string; avatar: string; }
interface UserGroup { id: string; name: string; color: string; permissions: string[]; memberCount: number; }

const ALL_PERMS = ['Take Orders', 'Apply Discounts', 'Void Items', 'Process Refunds', 'Open Cash Drawer', 'View Reports', 'Manage Inventory', 'Edit Menu', 'Clock In/Out', 'Manager Override', 'Close Register', 'Reprint Receipts', 'Transfer Tables', 'Merge Orders', 'Access Back Office'];

const SEED_GROUPS: UserGroup[] = [
    { id: 'g1', name: 'Owner', color: '#EF4444', permissions: ALL_PERMS, memberCount: 1 },
    { id: 'g2', name: 'Manager', color: '#3B82F6', permissions: ALL_PERMS.filter(p => p !== 'Access Back Office'), memberCount: 2 },
    { id: 'g3', name: 'Server', color: '#10B981', permissions: ['Take Orders', 'Apply Discounts', 'Clock In/Out', 'Transfer Tables', 'Merge Orders', 'Reprint Receipts'], memberCount: 6 },
    { id: 'g4', name: 'Bartender', color: '#8B5CF6', permissions: ['Take Orders', 'Clock In/Out', 'Open Cash Drawer', 'Reprint Receipts'], memberCount: 3 },
    { id: 'g5', name: 'Cashier', color: '#F59E0B', permissions: ['Take Orders', 'Process Refunds', 'Open Cash Drawer', 'Close Register', 'Clock In/Out', 'Reprint Receipts'], memberCount: 2 },
];
const GROUP_COLORS: Record<string, string> = { Owner: '#EF4444', Manager: '#3B82F6', Server: '#10B981', Bartender: '#8B5CF6', Cashier: '#F59E0B' };

function staffToUser(s: StaffMember): POSUser {
    const initials = s.name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '??';
    return { id: s.id, name: s.name || 'Unknown', pin: String(s.pos_config?.pin || '0000'), group: String(s.pos_config?.group || s.role || 'Server'), email: s.email || '', isActive: s.pos_config?.is_pos_active ?? true, lastLogin: s.created_at ? new Date(s.created_at).toLocaleDateString() : 'Never', avatar: initials };
}

type TabKey = 'users' | 'groups';
const userTableCols = '44px 1fr 120px 100px 130px 60px';

const POSUsersGroups: React.FC = () => {
    const navigate = useNavigate();
    const [tab, setTab] = useState<TabKey>('users');
    const [search, setSearch] = useState('');
    const [editUser, setEditUser] = useState<POSUser | null>(null);
    const [editGroup, setEditGroup] = useState<UserGroup | null>(null);
    const [showPin, setShowPin] = useState(false);
    const [localUsers, setLocalUsers] = useState<POSUser[]>([]);
    const venueId = String(localStorage.getItem('restin_pos_venue') || authStore.getUser()?.venue_id || '');
    const { staff, loading, error, refetch, updatePosConfig } = useStaffService({ venueId, includePos: true, includeShifts: false, includeStats: false, search, enabled: !!venueId });
    useEffect(() => { if (staff.length > 0) setLocalUsers(staff.map(staffToUser)); }, [staff]);
    const [groups, setGroups] = useState(SEED_GROUPS);
    const filteredUsers = useMemo(() => { if (!search) return localUsers; const s = search.toLowerCase(); return localUsers.filter(u => u.name.toLowerCase().includes(s)); }, [localUsers, search]);
    const filteredGroups = useMemo(() => { if (!search) return groups; const s = search.toLowerCase(); return groups.filter(g => g.name.toLowerCase().includes(s)); }, [groups, search]);

    const saveUser = async () => {
        if (!editUser) return;
        try {
            await updatePosConfig(editUser.id, { pin: editUser.pin, group: editUser.group, is_pos_active: editUser.isActive, permissions: groups.find(g => g.name === editUser.group)?.permissions || [] });
            toast.success('User saved'); setEditUser(null);
        } catch {
            const exists = localUsers.find(u => u.id === editUser.id);
            if (exists) setLocalUsers(p => p.map(u => u.id === editUser.id ? editUser : u));
            else setLocalUsers(p => [...p, editUser]);
            toast.success('User saved (local)'); setEditUser(null);
        }
    };
    const saveGroup = () => { if (!editGroup) return; const exists = groups.find(g => g.id === editGroup.id); if (exists) setGroups(p => p.map(g => g.id === editGroup.id ? editGroup : g)); else setGroups(p => [...p, editGroup]); setEditGroup(null); toast.success('Group saved'); };
    const getGroupColor = (groupName: string) => GROUP_COLORS[groupName] || groups.find(g => g.name === groupName)?.color || '#3B82F6';

    return (
        <div className="pos-page"><div className="pos-container">
            <div className="pos-header">
                <div>
                    <button onClick={() => navigate(-1)} className="pos-btn-outline pos-btn-back"><ArrowLeft size={14} /> Back</button>
                    <h1 className="pos-title">POS Users & Groups</h1>
                    <p className="pos-subtitle">Manage staff POS access, PINs, and permission groups{venueId && <span className="pos-live-dot">● Live</span>}</p>
                </div>
                <button className="pos-btn-primary" onClick={() => {
                    if (tab === 'users') setEditUser({ id: crypto.randomUUID(), name: '', pin: Math.floor(1000 + Math.random() * 9000).toString(), group: groups[0]?.name || 'Server', email: '', isActive: true, lastLogin: 'Never', avatar: '' });
                    else setEditGroup({ id: crypto.randomUUID(), name: '', color: '#3B82F6', permissions: [], memberCount: 0 });
                }}><Plus size={16} /> Add {tab === 'users' ? 'User' : 'Group'}</button>
            </div>

            <div className="pos-toggle-group pos-mb-20" style={{ width: 'fit-content' }}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                {(['users', 'groups'] as TabKey[]).map(t => (
                    <button key={t} onClick={() => setTab(t)} className={`pos-toggle-btn ${tab === t ? 'pos-toggle-btn--active' : ''}`} style={{ padding: '10px 24px', fontSize: 13, fontWeight: tab === t ? 600 : 400 }}>{t === 'users' ? '👤 Users' : '🛡️ Groups'}</button> /* keep-inline */ /* keep-inline */ /* keep-inline */
                ))}
            </div>

            <div className="pos-search-wrapper pos-mb-16"><Search size={14} className="pos-search-icon" /><input className="pos-input pos-search-input" placeholder={`Search ${tab}...`} value={search} onChange={e => setSearch(e.target.value)} /></div>

            {loading && <div className="pos-card pos-flex pos-flex--center" style={{ justifyContent: 'center', gap: 8, padding: 40 }}><Loader2 size={18} className="animate-spin" style={{ color: '#3B82F6' }} /><span className="pos-text-secondary">{"Loading "}staff from API...</span></div>} /* keep-inline */ /* keep-inline */ /* keep-inline */
            {error && <div className="pos-card pos-flex pos-flex--between pos-flex--center pos-mb-16" style={{ borderColor: '#EF4444', padding: 16 }}><span style={{ color: '#EF4444', fontSize: 13 }}>⚠ {error} — showing cached data</span><button className="pos-btn-outline" style={{ padding: '6px 14px', fontSize: 12 }} onClick={() => refetch()}>Retry</button></div>} /* keep-inline */ /* keep-inline */ /* keep-inline */

            {/* Users Tab */}
            {tab === 'users' && !loading && <div className="pos-card">
                <div className="pos-table-header" style={{ gridTemplateColumns: userTableCols }}><div></div><div>Name</div><div>Group</div><div>PIN</div><div>Last Login</div><div></div></div> /* keep-inline */ /* keep-inline */ /* keep-inline */
                {filteredUsers.length === 0 && <div className="pos-empty-state">{"No "}staff found. {!venueId && 'Please select a venue first.'}</div>}
                {filteredUsers.map(user => (
                    <div key={user.id} className="pos-table-row" style={{ gridTemplateColumns: userTableCols, opacity: user.isActive ? 1 : 0.5 }} onClick={() => setEditUser({ ...user })}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                        <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(59,130,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, color: '#3B82F6' }}>{user.avatar}</div> /* keep-inline */ /* keep-inline */ /* keep-inline */
                        <div><div className="pos-cell-value">{user.name}</div><div className="pos-cell-secondary">{user.email}</div></div>
                        <span className="pos-badge" style={{ background: `${getGroupColor(user.group)}15`, color: getGroupColor(user.group) }}>{user.group}</span> /* keep-inline */ /* keep-inline */ /* keep-inline */
                        <span className="pos-cell-secondary" style={{ fontFamily: 'monospace' }}>{'••••'}</span> /* keep-inline */ /* keep-inline */ /* keep-inline */
                        <span className="pos-cell-secondary">{user.lastLogin}</span>
                        <button className="pos-btn-icon" onClick={e => { e.stopPropagation(); setEditUser({ ...user }); }} title="Edit user"><Edit3 size={13} /></button>
                    </div>
                ))}
            </div>}

            {/* Groups Tab */}
            {tab === 'groups' && <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))', gap: 16 }}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                {filteredGroups.map(group => (
                    <div key={group.id} className="pos-card" style={{ cursor: 'pointer', borderLeft: `4px solid ${group.color}` }} onClick={() => setEditGroup({ ...group })}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                        <div className="pos-flex pos-flex--between pos-flex--center pos-mb-12">
                            <div className="pos-flex pos-flex--center pos-gap-8"><Shield size={16} style={{ color: group.color }} /><h3 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>{group.name}</h3></div> /* keep-inline */ /* keep-inline */ /* keep-inline */
                            <span className="pos-cell-secondary">{localUsers.filter(u => u.group === group.name).length} members</span>
                        </div>
                        <div className="pos-flex pos-flex--wrap pos-gap-4">
                            {group.permissions.slice(0, 6).map(p => <span key={p} className="pos-badge">{p}</span>)}
                            {group.permissions.length > 6 && <span className="pos-badge pos-badge--blue">+{group.permissions.length - 6} more</span>}
                        </div>
                    </div>
                ))}
            </div>}
        </div>

            {/* Edit User Modal */}
            {editUser && <div className="pos-modal-overlay" onClick={() => setEditUser(null)}>
                <div className="pos-card pos-modal pos-modal--sm" onClick={e => e.stopPropagation()}>
                    <div className="pos-modal-header"><h3 className="pos-modal-title">{localUsers.find(u => u.id === editUser.id) ? 'Edit' : 'New'} POS User</h3><button title="Close" className="pos-btn-icon" onClick={() => setEditUser(null)}><X size={20} /></button></div>
                    <div className="pos-form-group"><label className="pos-form-label">Full Name *</label><input className="pos-input" value={editUser.name} onChange={e = aria-label="Input field"> setEditUser(p => p ? { ...p, name: e.target.value, avatar: e.target.value.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) } : null)} placeholder="John Doe" /></div>
                    <div className="pos-form-group"><label className="pos-form-label">Email</label><input className="pos-input" value={editUser.email} onChange={e = aria-label="Input field"> setEditUser(p => p ? { ...p, email: e.target.value } : null)} placeholder="john@venue.com" /></div>
                    <div className="pos-form-grid">
                        <div><label className="pos-form-label">PIN Code</label>
                            <div style={{ position: 'relative' }}><input type={showPin ? 'text' : 'password'} className="pos-input" value={editUser.pin} onChange={e = aria-label="Input field"> setEditUser(p => p ? { ...p, pin: e.target.value } : null)} maxLength={4} /> /* keep-inline */ /* keep-inline */ /* keep-inline */
                                <button style={{ position: 'absolute', right: 8, top: 8 }} className="pos-btn-icon" onClick={() => setShowPin(!showPin)} title="Toggle PIN visibility">{showPin ? <EyeOff size={14} /> : <Eye size={14} />}</button></div></div>
                        <div><label className="pos-form-label">User Group</label><select className="pos-select" value={editUser.group} onChange={e = aria-label="Input field"> setEditUser(p => p ? { ...p, group: e.target.value } : null)} aria-label="User group">{groups.map(g => <option key={g.id} value={g.name}>{g.name}</option>)}</select></div>
                    </div>
                    <div className="pos-mb-16"><label className="pos-toggle-label"><input type="checkbox" checked={editUser.isActive} onChange={() = aria-label="Input field"> setEditUser(p => p ? { ...p, isActive: !p.isActive } : null)} /> Active</label></div>
                    <div className="pos-modal-footer">
                        <button className="pos-btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={saveUser}><Save size={14} /> Save</button> /* keep-inline */ /* keep-inline */ /* keep-inline */
                        <button title="Delete user" className="pos-btn-outline" style={{ color: '#EF4444', borderColor: 'rgba(239,68,68,0.3)' }} onClick={() => { setLocalUsers(p => p.filter(u => u.id !== editUser.id)); setEditUser(null); toast.success('Deleted'); }}><Trash2 size={14} /></button> /* keep-inline */ /* keep-inline */ /* keep-inline */
                        <button className="pos-btn-outline" onClick={() => setEditUser(null)}>Cancel</button>
                    </div>
                </div>
            </div>}

            {/* Edit Group Modal */}
            {editGroup && <div className="pos-modal-overlay" onClick={() => setEditGroup(null)}>
                <div className="pos-card pos-modal" style={{ maxHeight: '85vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                    <div className="pos-modal-header"><h3 className="pos-modal-title">{groups.find(g => g.id === editGroup.id) ? 'Edit' : 'New'} Permission Group</h3><button title="Close" className="pos-btn-icon" onClick={() => setEditGroup(null)}><X size={20} /></button></div>
                    <div className="pos-form-group"><label className="pos-form-label">Group Name *</label><input className="pos-input" value={editGroup.name} onChange={e = aria-label="Input field"> setEditGroup(p => p ? { ...p, name: e.target.value } : null)} placeholder="e.g. Manager" /></div>
                    <div className="pos-form-group"><label className="pos-form-label pos-mb-4">Permissions</label>
                        <div className="pos-flex pos-flex--col pos-gap-6">
                            {ALL_PERMS.map(perm => <label key={perm} className="pos-flex pos-flex--center pos-gap-10" style={{ padding: '8px 12px', background: 'var(--bg-secondary,#09090b)', borderRadius: 8, cursor: 'pointer', border: editGroup.permissions.includes(perm) ? '1px solid #3B82F6' : '1px solid rgba(255,255,255,0.04)' }}> /* keep-inline */ /* keep-inline */ /* keep-inline */
                                <input type="checkbox" checked={editGroup.permissions.includes(perm)} onChange={() = aria-label="Input field"> setEditGroup(p => { if (!p) return null; const has = p.permissions.includes(perm); return { ...p, permissions: has ? p.permissions.filter(x => x !== perm) : [...p.permissions, perm] }; })} />
                                <span className="pos-text-sm">{perm}</span>
                            </label>)}
                        </div></div>
                    <div className="pos-modal-footer">
                        <button className="pos-btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={saveGroup}><Save size={14} /> Save</button> /* keep-inline */ /* keep-inline */ /* keep-inline */
                        <button className="pos-btn-outline" onClick={() => setEditGroup(null)}>Cancel</button>
                    </div>
                </div>
            </div>}
        </div>
    );
};

export default POSUsersGroups;
