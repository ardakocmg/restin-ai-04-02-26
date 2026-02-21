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
// keep-inline: gridTemplateColumns uses a CSS variable-like string for table column layout
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

            <div className="pos-toggle-group pos-mb-20 w-fit">
                {(['users', 'groups'] as TabKey[]).map(t => (
                    <button key={t} onClick={() => setTab(t)} className={`pos-toggle-btn py-2.5 px-6 text-[13px] ${tab === t ? 'pos-toggle-btn--active font-semibold' : 'font-normal'}`}>{t === 'users' ? '👤 Users' : '🛡️ Groups'}</button>
                ))}
            </div>

            <div className="pos-search-wrapper pos-mb-16"><Search size={14} className="pos-search-icon" /><input aria-label="Input field" className="pos-input pos-search-input" placeholder={`Search ${tab}...`} value={search} onChange={e => setSearch(e.target.value)} /></div>

            {loading && <div className="pos-card pos-flex pos-flex--center justify-center gap-2 p-10"><Loader2 size={18} className="animate-spin text-blue-500" /><span className="pos-text-secondary">{"Loading "}staff from API...</span></div>}
            {error && <div className="pos-card pos-flex pos-flex--between pos-flex--center pos-mb-16 border-red-500 p-4"><span className="text-red-500 text-[13px]">⚠ {error} — showing cached data</span><button className="pos-btn-outline py-1.5 px-3.5 text-xs" onClick={() => refetch()}>Retry</button></div>}

            {/* Users Tab */}
            {/* keep-inline: gridTemplateColumns uses runtime variable userTableCols */}
            {tab === 'users' && !loading && <div className="pos-card">
                <div className="pos-table-header" style={{ gridTemplateColumns: userTableCols }}><div></div><div>Name</div><div>Group</div><div>PIN</div><div>Last Login</div><div></div></div>
                {filteredUsers.length === 0 && <div className="pos-empty-state">{"No "}staff found. {!venueId && 'Please select a venue first.'}</div>}
                {filteredUsers.map(user => (
                    <div key={user.id} className={`pos-table-row${user.isActive ? '' : ' opacity-50'}`} style={{ gridTemplateColumns: userTableCols }} onClick={() => setEditUser({ ...user })}>
                        <div className="w-9 h-9 rounded-full bg-blue-500/15 flex items-center justify-center text-xs font-semibold text-blue-500">{user.avatar}</div>
                        <div><div className="pos-cell-value">{user.name}</div><div className="pos-cell-secondary">{user.email}</div></div>
                        {/* keep-inline: dynamic background/color from getGroupColor() which resolves user-configurable group colors */}
                        <span className="pos-badge" style={{ background: `${getGroupColor(user.group)}15`, color: getGroupColor(user.group) }}>{user.group}</span>
                        <span className="pos-cell-secondary font-mono">{'••••'}</span>
                        <span className="pos-cell-secondary">{user.lastLogin}</span>
                        <button className="pos-btn-icon" onClick={e => { e.stopPropagation(); setEditUser({ ...user }); }} title="Edit user"><Edit3 size={13} /></button>
                    </div>
                ))}
            </div>}

            {/* Groups Tab */}
            {tab === 'groups' && <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-4">
                {filteredGroups.map(group => (
                    // keep-inline: borderLeft uses dynamic group.color from user-configurable data
                    <div key={group.id} className="pos-card cursor-pointer" style={{ borderLeft: `4px solid ${group.color}` }} onClick={() => setEditGroup({ ...group })}>
                        <div className="pos-flex pos-flex--between pos-flex--center pos-mb-12">
                            {/* keep-inline: color uses dynamic group.color */}
                            <div className="pos-flex pos-flex--center pos-gap-8"><Shield size={16} style={{ color: group.color }} /><h3 className="text-base font-semibold m-0">{group.name}</h3></div>
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
                    <div className="pos-form-group"><label className="pos-form-label">Full Name *</label><input className="pos-input" value={editUser.name} onChange={e => setEditUser(p => p ? { ...p, name: e.target.value, avatar: e.target.value.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) } : null)} placeholder="John Doe" aria-label="Full name" /></div>
                    <div className="pos-form-group"><label className="pos-form-label">Email</label><input className="pos-input" value={editUser.email} onChange={e => setEditUser(p => p ? { ...p, email: e.target.value } : null)} placeholder="john@venue.com" aria-label="Email" /></div>
                    <div className="pos-form-grid">
                        <div><label className="pos-form-label">PIN Code</label>
                            <div className="relative"><input type={showPin ? 'text' : 'password'} className="pos-input" value={editUser.pin} onChange={e => setEditUser(p => p ? { ...p, pin: e.target.value } : null)} maxLength={4} aria-label="PIN code" />
                                <button className="pos-btn-icon absolute right-2 top-2" onClick={() => setShowPin(!showPin)} title="Toggle PIN visibility">{showPin ? <EyeOff size={14} /> : <Eye size={14} />}</button></div></div>
                        <div><label className="pos-form-label">User Group</label><select className="pos-select" value={editUser.group} onChange={e => setEditUser(p => p ? { ...p, group: e.target.value } : null)} aria-label="User group">{groups.map(g => <option key={g.id} value={g.name}>{g.name}</option>)}</select></div>
                    </div>
                    <div className="pos-mb-16"><label className="pos-toggle-label"><input type="checkbox" checked={editUser.isActive} onChange={() => setEditUser(p => p ? { ...p, isActive: !p.isActive } : null)} /> Active</label></div>
                    <div className="pos-modal-footer">
                        <button className="pos-btn-primary flex-1 justify-center" onClick={saveUser}><Save size={14} /> Save</button>
                        <button title="Delete user" className="pos-btn-outline text-red-400 border-red-500/30" onClick={() => { setLocalUsers(p => p.filter(u => u.id !== editUser.id)); setEditUser(null); toast.success('Deleted'); }}><Trash2 size={14} /></button>
                        <button className="pos-btn-outline" onClick={() => setEditUser(null)}>Cancel</button>
                    </div>
                </div>
            </div>}

            {/* Edit Group Modal */}
            {editGroup && <div className="pos-modal-overlay" onClick={() => setEditGroup(null)}>
                <div className="pos-card pos-modal max-h-[85vh] overflow-auto" onClick={e => e.stopPropagation()}>
                    <div className="pos-modal-header"><h3 className="pos-modal-title">{groups.find(g => g.id === editGroup.id) ? 'Edit' : 'New'} Permission Group</h3><button title="Close" className="pos-btn-icon" onClick={() => setEditGroup(null)}><X size={20} /></button></div>
                    <div className="pos-form-group"><label className="pos-form-label">Group Name *</label><input className="pos-input" value={editGroup.name} onChange={e => setEditGroup(p => p ? { ...p, name: e.target.value } : null)} placeholder="e.g. Manager" aria-label="Group name" /></div>
                    <div className="pos-form-group"><label className="pos-form-label pos-mb-4">Permissions</label>
                        <div className="pos-flex pos-flex--col pos-gap-6">
                            {ALL_PERMS.map(perm => <label key={perm} className={`pos-flex pos-flex--center pos-gap-10 py-2 px-3 bg-[var(--bg-secondary,#09090b)] rounded-lg cursor-pointer ${editGroup.permissions.includes(perm) ? 'border border-blue-500' : 'border border-white/[0.04]'}`}>
                                <input type="checkbox" checked={editGroup.permissions.includes(perm)} onChange={() => setEditGroup(p => { if (!p) return null; const has = p.permissions.includes(perm); return { ...p, permissions: has ? p.permissions.filter(x => x !== perm) : [...p.permissions, perm] }; })} />
                                <span className="pos-text-sm">{perm}</span>
                            </label>)}
                        </div></div>
                    <div className="pos-modal-footer">
                        <button className="pos-btn-primary flex-1 justify-center" onClick={saveGroup}><Save size={14} /> Save</button>
                        <button className="pos-btn-outline" onClick={() => setEditGroup(null)}>Cancel</button>
                    </div>
                </div>
            </div>}
        </div>
    );
};

export default POSUsersGroups;
