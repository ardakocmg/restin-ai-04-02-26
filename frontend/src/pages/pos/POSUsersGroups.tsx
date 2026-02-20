/**
 * POSUsersGroups.tsx — K-Series POS Users & Groups
 * Manage POS user access, PINs, permissions groups
 * Lightspeed K-Series Back Office > Configuration > POS Users parity
 * 
 * WIRED TO: /api/venues/{venueId}/staff (useStaffService)
 */
import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Plus, Save, Edit3, Trash2, Search, X, Shield, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useStaffService } from '../../hooks/shared/useStaffService';
import type { StaffMember, PosConfig } from '../../hooks/shared/useStaffService';
import authStore from '../../lib/AuthStore';

/* ── local types for UI ─── */
interface POSUser {
    id: string;
    name: string;
    pin: string;
    group: string;
    email: string;
    isActive: boolean;
    lastLogin: string;
    avatar: string;
}
interface UserGroup {
    id: string;
    name: string;
    color: string;
    permissions: string[];
    memberCount: number;
}

/* ── styles ─── */
const pg: React.CSSProperties = { minHeight: '100vh', background: 'var(--bg-primary,#0a0a0a)', color: 'var(--text-primary,#fafafa)', fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif' };
const ct: React.CSSProperties = { maxWidth: 1100, margin: '0 auto', padding: '24px 20px' };
const cd: React.CSSProperties = { background: 'var(--bg-card,#18181b)', border: '1px solid var(--border-primary,#27272a)', borderRadius: 12, padding: 20, marginBottom: 16 };
const bp: React.CSSProperties = { padding: '10px 24px', background: '#3B82F6', border: 'none', borderRadius: 8, color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 };
const bo: React.CSSProperties = { padding: '10px 24px', background: 'transparent', border: '1px solid var(--border-primary,#27272a)', borderRadius: 8, color: 'var(--text-primary,#fafafa)', fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 };
const ip: React.CSSProperties = { width: '100%', padding: '10px 14px', background: 'var(--bg-secondary,#09090b)', border: '1px solid var(--border-primary,#27272a)', borderRadius: 8, color: 'var(--text-primary,#fafafa)', fontSize: 14 };
const sl: React.CSSProperties = { ...ip, cursor: 'pointer' };

const ALL_PERMS = ['Take Orders', 'Apply Discounts', 'Void Items', 'Process Refunds', 'Open Cash Drawer', 'View Reports', 'Manage Inventory', 'Edit Menu', 'Clock In/Out', 'Manager Override', 'Close Register', 'Reprint Receipts', 'Transfer Tables', 'Merge Orders', 'Access Back Office'];

/* ── fallback seed groups (if API doesn't return groups) ─── */
const SEED_GROUPS: UserGroup[] = [
    { id: 'g1', name: 'Owner', color: '#EF4444', permissions: ALL_PERMS, memberCount: 1 },
    { id: 'g2', name: 'Manager', color: '#3B82F6', permissions: ALL_PERMS.filter(p => p !== 'Access Back Office'), memberCount: 2 },
    { id: 'g3', name: 'Server', color: '#10B981', permissions: ['Take Orders', 'Apply Discounts', 'Clock In/Out', 'Transfer Tables', 'Merge Orders', 'Reprint Receipts'], memberCount: 6 },
    { id: 'g4', name: 'Bartender', color: '#8B5CF6', permissions: ['Take Orders', 'Clock In/Out', 'Open Cash Drawer', 'Reprint Receipts'], memberCount: 3 },
    { id: 'g5', name: 'Cashier', color: '#F59E0B', permissions: ['Take Orders', 'Process Refunds', 'Open Cash Drawer', 'Close Register', 'Clock In/Out', 'Reprint Receipts'], memberCount: 2 },
];

const GROUP_COLORS: Record<string, string> = { Owner: '#EF4444', Manager: '#3B82F6', Server: '#10B981', Bartender: '#8B5CF6', Cashier: '#F59E0B' };

/* ── helper: map API StaffMember → local POSUser ─── */
function staffToUser(s: StaffMember): POSUser {
    const initials = s.name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '??';
    return {
        id: s.id,
        name: s.name || 'Unknown',
        pin: s.pos_config?.pin || '0000',
        group: s.pos_config?.group || s.role || 'Server',
        email: s.email || '',
        isActive: s.pos_config?.is_pos_active ?? true,
        lastLogin: s.created_at ? new Date(s.created_at).toLocaleDateString() : 'Never',
        avatar: initials,
    };
}

type TabKey = 'users' | 'groups';

const POSUsersGroups: React.FC = () => {
    const navigate = useNavigate();
    const [tab, setTab] = useState<TabKey>('users');
    const [search, setSearch] = useState('');
    const [editUser, setEditUser] = useState<POSUser | null>(null);
    const [editGroup, setEditGroup] = useState<UserGroup | null>(null);
    const [showPin, setShowPin] = useState(false);
    const [localUsers, setLocalUsers] = useState<POSUser[]>([]);

    // Get venueId from POS localStorage or user auth
    const venueId = localStorage.getItem('restin_pos_venue') || authStore.getUser()?.venue_id || '';

    // Wire to real API
    const { staff, loading, error, refetch, updatePosConfig } = useStaffService({
        venueId,
        includePos: true,
        includeShifts: false,
        includeStats: false,
        search,
        enabled: !!venueId,
    });

    // Sync API data → local state
    useEffect(() => {
        if (staff.length > 0) {
            setLocalUsers(staff.map(staffToUser));
        }
    }, [staff]);

    // Groups are currently static (stored client-side); could be moved to API later
    const [groups, setGroups] = useState(SEED_GROUPS);

    const filteredUsers = useMemo(() => {
        if (!search) return localUsers;
        const s = search.toLowerCase();
        return localUsers.filter(u => u.name.toLowerCase().includes(s));
    }, [localUsers, search]);

    const filteredGroups = useMemo(() => {
        if (!search) return groups;
        const s = search.toLowerCase();
        return groups.filter(g => g.name.toLowerCase().includes(s));
    }, [groups, search]);

    const saveUser = async () => {
        if (!editUser) return;
        try {
            // Persist POS config via unified API
            await updatePosConfig(editUser.id, {
                pin: editUser.pin,
                group: editUser.group,
                is_pos_active: editUser.isActive,
                permissions: groups.find(g => g.name === editUser.group)?.permissions || [],
            });
            toast.success('User saved');
            setEditUser(null);
        } catch {
            // If API fails, save locally
            const exists = localUsers.find(u => u.id === editUser.id);
            if (exists) {
                setLocalUsers(p => p.map(u => u.id === editUser.id ? editUser : u));
            } else {
                setLocalUsers(p => [...p, editUser]);
            }
            toast.success('User saved (local)');
            setEditUser(null);
        }
    };

    const saveGroup = () => {
        if (!editGroup) return;
        const exists = groups.find(g => g.id === editGroup.id);
        if (exists) {
            setGroups(p => p.map(g => g.id === editGroup.id ? editGroup : g));
        } else {
            setGroups(p => [...p, editGroup]);
        }
        setEditGroup(null);
        toast.success('Group saved');
    };

    const getGroupColor = (groupName: string) => GROUP_COLORS[groupName] || groups.find(g => g.name === groupName)?.color || '#3B82F6';

    return (
        <div style={pg}><div style={ct}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                <div>
                    <button onClick={() => navigate(-1)} style={{ ...bo, marginBottom: 8, padding: '6px 14px', fontSize: 12 }}><ArrowLeft size={14} /> Back</button>
                    <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>POS Users & Groups</h1>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary,#a1a1aa)', margin: '4px 0 0' }}>
                        Manage staff POS access, PINs, and permission groups
                        {venueId && <span style={{ marginLeft: 8, fontSize: 11, color: '#10B981' }}>● Live</span>}
                    </p>
                </div>
                <button style={bp} onClick={() => {
                    if (tab === 'users') setEditUser({ id: crypto.randomUUID(), name: '', pin: Math.floor(1000 + Math.random() * 9000).toString(), group: groups[0]?.name || 'Server', email: '', isActive: true, lastLogin: 'Never', avatar: '' });
                    else setEditGroup({ id: crypto.randomUUID(), name: '', color: '#3B82F6', permissions: [], memberCount: 0 });
                }}><Plus size={16} /> Add {tab === 'users' ? 'User' : 'Group'}</button>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'var(--bg-card,#18181b)', borderRadius: 10, padding: 4, border: '1px solid var(--border-primary,#27272a)', width: 'fit-content' }}>
                {(['users', 'groups'] as TabKey[]).map(t => (
                    <button key={t} onClick={() => setTab(t)} style={{ padding: '10px 24px', borderRadius: 8, border: 'none', fontSize: 13, fontWeight: tab === t ? 600 : 400, cursor: 'pointer', background: tab === t ? 'rgba(59,130,246,0.1)' : 'transparent', color: tab === t ? '#3B82F6' : 'var(--text-secondary)' }}>
                        {t === 'users' ? '👤 Users' : '🛡️ Groups'}
                    </button>
                ))}
            </div>

            <div style={{ position: 'relative', marginBottom: 16 }}>
                <Search size={14} style={{ position: 'absolute', left: 14, top: 12, color: 'var(--text-secondary)' }} />
                <input style={{ ...ip, paddingLeft: 36 }} placeholder={`Search ${tab}...`} value={search} onChange={e => setSearch(e.target.value)} />
            </div>

            {/* Loading / Error States */}
            {loading && (
                <div style={{ ...cd, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 40 }}>
                    <Loader2 size={18} className="animate-spin" style={{ color: '#3B82F6' }} />
                    <span style={{ color: 'var(--text-secondary)' }}>Loading staff from API...</span>
                </div>
            )}

            {error && (
                <div style={{ ...cd, borderColor: '#EF4444', padding: 16, marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#EF4444', fontSize: 13 }}>⚠ {error} — showing cached data</span>
                    <button style={{ ...bo, padding: '6px 14px', fontSize: 12 }} onClick={() => refetch()}>Retry</button>
                </div>
            )}

            {/* Users Tab */}
            {tab === 'users' && !loading && <div style={cd}>
                <div style={{ display: 'grid', gridTemplateColumns: '44px 1fr 120px 100px 130px 60px', gap: 12, padding: '8px 12px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: 0.5, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <div></div><div>Name</div><div>Group</div><div>PIN</div><div>Last Login</div><div></div>
                </div>
                {filteredUsers.length === 0 && (
                    <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)', fontSize: 13 }}>
                        No staff found. {!venueId && 'Please select a venue first.'}
                    </div>
                )}
                {filteredUsers.map(user => (
                    <div key={user.id} style={{ display: 'grid', gridTemplateColumns: '44px 1fr 120px 100px 130px 60px', gap: 12, padding: '12px', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.03)', cursor: 'pointer', opacity: user.isActive ? 1 : 0.5 }} onClick={() => setEditUser({ ...user })}>
                        <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(59,130,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, color: '#3B82F6' }}>{user.avatar}</div>
                        <div><div style={{ fontSize: 14, fontWeight: 500 }}>{user.name}</div><div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{user.email}</div></div>
                        <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 4, background: `${getGroupColor(user.group)}15`, color: getGroupColor(user.group) }}>{user.group}</span>
                        <span style={{ fontSize: 13, fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{'••••'}</span>
                        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{user.lastLogin}</span>
                        <button style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }} onClick={e => { e.stopPropagation(); setEditUser({ ...user }); }} title="Edit user"><Edit3 size={13} /></button>
                    </div>
                ))}
            </div>}

            {/* Groups Tab */}
            {tab === 'groups' && <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))', gap: 16 }}>
                {filteredGroups.map(group => (
                    <div key={group.id} style={{ ...cd, cursor: 'pointer', borderLeft: `4px solid ${group.color}` }} onClick={() => setEditGroup({ ...group })}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Shield size={16} style={{ color: group.color }} />
                                <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>{group.name}</h3>
                            </div>
                            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{localUsers.filter(u => u.group === group.name).length} members</span>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                            {group.permissions.slice(0, 6).map(p => <span key={p} style={{ padding: '2px 8px', borderRadius: 4, fontSize: 10, background: 'rgba(255,255,255,0.04)', color: 'var(--text-secondary)' }}>{p}</span>)}
                            {group.permissions.length > 6 && <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 10, background: 'rgba(59,130,246,0.1)', color: '#3B82F6' }}>+{group.permissions.length - 6} more</span>}
                        </div>
                    </div>
                ))}
            </div>}
        </div>

            {/* Edit User Modal */}
            {editUser && <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setEditUser(null)}>
                <div style={{ ...cd, width: 480 }} onClick={e => e.stopPropagation()}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                        <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{localUsers.find(u => u.id === editUser.id) ? 'Edit' : 'New'} POS User</h3>
                        <button style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }} onClick={() => setEditUser(null)} title="Close"><X size={20} /></button>
                    </div>
                    <div style={{ marginBottom: 14 }}><label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Full Name *</label>
                        <input style={ip} value={editUser.name} onChange={e => setEditUser(p => p ? { ...p, name: e.target.value, avatar: e.target.value.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) } : null)} placeholder="John Doe" /></div>
                    <div style={{ marginBottom: 14 }}><label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Email</label>
                        <input style={ip} value={editUser.email} onChange={e => setEditUser(p => p ? { ...p, email: e.target.value } : null)} placeholder="john@venue.com" /></div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                        <div><label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>PIN Code</label>
                            <div style={{ position: 'relative' }}><input type={showPin ? 'text' : 'password'} style={ip} value={editUser.pin} onChange={e => setEditUser(p => p ? { ...p, pin: e.target.value } : null)} maxLength={4} />
                                <button style={{ position: 'absolute', right: 8, top: 8, background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }} onClick={() => setShowPin(!showPin)} title="Toggle PIN visibility">{showPin ? <EyeOff size={14} /> : <Eye size={14} />}</button></div></div>
                        <div><label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>User Group</label>
                            <select style={sl} value={editUser.group} onChange={e => setEditUser(p => p ? { ...p, group: e.target.value } : null)} aria-label="User group">{groups.map(g => <option key={g.id} value={g.name}>{g.name}</option>)}</select></div>
                    </div>
                    <div style={{ marginBottom: 16 }}><label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                        <input type="checkbox" checked={editUser.isActive} onChange={() => setEditUser(p => p ? { ...p, isActive: !p.isActive } : null)} /> Active</label></div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button style={{ ...bp, flex: 1, justifyContent: 'center' }} onClick={saveUser}><Save size={14} /> Save</button>
                        <button style={{ ...bo, color: '#EF4444' }} onClick={() => { setLocalUsers(p => p.filter(u => u.id !== editUser.id)); setEditUser(null); toast.success('Deleted'); }}><Trash2 size={14} /></button>
                        <button style={bo} onClick={() => setEditUser(null)}>Cancel</button>
                    </div>
                </div>
            </div>}

            {/* Edit Group Modal */}
            {editGroup && <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setEditGroup(null)}>
                <div style={{ ...cd, width: 480, maxHeight: '85vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                        <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{groups.find(g => g.id === editGroup.id) ? 'Edit' : 'New'} Permission Group</h3>
                        <button style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }} onClick={() => setEditGroup(null)} title="Close"><X size={20} /></button>
                    </div>
                    <div style={{ marginBottom: 14 }}><label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Group Name *</label>
                        <input style={ip} value={editGroup.name} onChange={e => setEditGroup(p => p ? { ...p, name: e.target.value } : null)} placeholder="e.g. Manager" /></div>
                    <div style={{ marginBottom: 14 }}><label style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>Permissions</label>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {ALL_PERMS.map(perm => <label key={perm} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'var(--bg-secondary,#09090b)', borderRadius: 8, cursor: 'pointer', border: editGroup.permissions.includes(perm) ? '1px solid #3B82F6' : '1px solid rgba(255,255,255,0.04)' }}>
                                <input type="checkbox" checked={editGroup.permissions.includes(perm)} onChange={() => setEditGroup(p => { if (!p) return null; const has = p.permissions.includes(perm); return { ...p, permissions: has ? p.permissions.filter(x => x !== perm) : [...p.permissions, perm] }; })} />
                                <span style={{ fontSize: 13 }}>{perm}</span>
                            </label>)}
                        </div></div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button style={{ ...bp, flex: 1, justifyContent: 'center' }} onClick={saveGroup}><Save size={14} /> Save</button>
                        <button style={bo} onClick={() => setEditGroup(null)}>Cancel</button>
                    </div>
                </div>
            </div>}
        </div>
    );
};

export default POSUsersGroups;
