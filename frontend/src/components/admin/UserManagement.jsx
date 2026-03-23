import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { ROLE_INFO, PERMISSIONS, ADMIN_INPUT, ADMIN_SELECT } from '../../constants';

const UserManagement = () => {
    const {
        allLocations, allUsers, userRole,
        newUserData, setNewUserData,
        editingUser, setEditingUser,
        handleCreateUser, handleUpdateUser, handleDeleteUser, startEditUser,
    } = useAppContext();

    const [boothFilterConst, setBoothFilterConst] = useState('');
    const [userSearchTerm, setUserSearchTerm] = useState('');
    const [userRoleFilter, setUserRoleFilter] = useState('');

    const selectedRole = newUserData.role;
    const roleScope = ROLE_INFO[selectedRole]?.scope || '';

    const cancelEdit = () => {
        setEditingUser(null);
        setNewUserData({
            username: '', password: '', full_name: '', phone_number: '', role: 'BOOTH_AGENT',
            can_download: false, can_upload: false, can_verify: true,
            can_edit_voters: true, can_send_broadcasts: false, can_manage_system: false,
            assignments: { constituencies: [], local_bodies: [], booths: [] }
        });
    };

    const toggleBoothAssignment = (boothId) => {
        const current = newUserData.assignments?.booths || [];
        const updated = current.includes(boothId) ? current.filter(x => x !== boothId) : [...current, boothId];
        setNewUserData({ ...newUserData, assignments: { ...newUserData.assignments, booths: updated } });
    };

    const toggleConstAssignment = (constId) => {
        const current = newUserData.assignments?.constituencies || [];
        const updated = current.includes(constId) ? current.filter(x => x !== constId) : [...current, constId];
        setNewUserData({ ...newUserData, assignments: { ...newUserData.assignments, constituencies: updated } });
    };

    const toggleLBAssignment = (lbId) => {
        const current = newUserData.assignments?.local_bodies || [];
        const updated = current.includes(lbId) ? current.filter(x => x !== lbId) : [...current, lbId];
        setNewUserData({ ...newUserData, assignments: { ...newUserData.assignments, local_bodies: updated } });
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

            {/* Left: Add / Edit User Form */}
            <div className="col-span-12 lg:col-span-5">
                <div className="lux-glass p-8 rounded-3xl border-white/5 space-y-6">
                    <div>
                        <h2 className="text-base font-bold text-white">{editingUser ? '✏️ Edit Staff Member' : '➕ Add Staff Member'}</h2>
                        <p className="text-xs text-slate-400 mt-0.5">Start by selecting the role, then fill in login details.</p>
                    </div>

                    {/* STEP 1: ROLE */}
                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-slate-300">Step 1 — Select Role</label>
                        <select
                            value={newUserData.role}
                            onChange={(e) => setNewUserData({ ...newUserData, role: e.target.value, assignments: { constituencies: [], local_bodies: [], booths: [] } })}
                            className={ADMIN_SELECT}
                        >
                            <option value="">Choose a role...</option>
                            {Object.entries(ROLE_INFO).map(([val, info]) => (
                                <option key={val} value={val} className="bg-slate-900">{info.label} — {info.desc}</option>
                            ))}
                        </select>
                        {selectedRole && (
                            <p className="text-xs text-indigo-400 pl-1">{ROLE_INFO[selectedRole]?.desc}</p>
                        )}
                    </div>

                    {/* STEP 2: LOCATION ASSIGNMENT */}
                    {selectedRole && roleScope === 'constituency' && (
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-slate-300">Step 2 — Assign Constituency</label>
                            <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                                {allLocations.map(c => (
                                    <button
                                        key={c.id}
                                        onClick={() => toggleConstAssignment(c.id)}
                                        className={`w-full text-left px-4 py-2.5 rounded-xl text-sm transition-all border ${(newUserData.assignments?.constituencies || []).includes(c.id) ? 'bg-indigo-600/20 border-indigo-500/40 text-white' : 'bg-white/5 border-white/5 text-slate-400 hover:text-white'}`}
                                    >
                                        {(newUserData.assignments?.constituencies || []).includes(c.id) ? '✓ ' : ''}{c.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {selectedRole && roleScope === 'lb' && (
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-slate-300">Step 2 — Assign Local Body</label>
                            <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                                {allLocations.flatMap(c => c.local_bodies.map(lb => ({ ...lb, constName: c.name }))).map(lb => (
                                    <button
                                        key={lb.id}
                                        onClick={() => toggleLBAssignment(lb.id)}
                                        className={`w-full text-left px-4 py-2.5 rounded-xl text-sm transition-all border ${(newUserData.assignments?.local_bodies || []).includes(lb.id) ? 'bg-indigo-600/20 border-indigo-500/40 text-white' : 'bg-white/5 border-white/5 text-slate-400 hover:text-white'}`}
                                    >
                                        <span className="font-medium">{lb.name}</span>
                                        <span className="text-xs text-slate-500 ml-2">({lb.constName})</span>
                                        {(newUserData.assignments?.local_bodies || []).includes(lb.id) && <span className="float-right text-indigo-400">✓</span>}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {selectedRole && (roleScope === 'booth') && (
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <label className="text-xs font-semibold text-slate-300">Step 2 — Assign Booth(s)</label>
                                <select
                                    value={boothFilterConst}
                                    onChange={(e) => setBoothFilterConst(e.target.value)}
                                    className="bg-slate-800 text-[10px] text-slate-300 border border-white/10 rounded px-2 py-1 outline-none focus:border-indigo-500/50"
                                >
                                    <option value="">All Constituencies</option>
                                    {allLocations.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="max-h-64 overflow-y-auto space-y-2 pr-1 border border-white/5 rounded-xl p-2 bg-black/20">
                                {allLocations
                                    .filter(c => !boothFilterConst || c.id === parseInt(boothFilterConst))
                                    .map(c => (
                                        <div key={c.id} className="mb-4 last:mb-0">
                                            <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest px-1 mb-2 sticky top-0 bg-slate-900/90 py-1">{c.name}</p>
                                            {c.local_bodies.flatMap(lb => lb.booths.map(b => ({ ...b, lbName: lb.name }))).map(b => (
                                                <button
                                                    key={b.id}
                                                    onClick={() => toggleBoothAssignment(b.id)}
                                                    className={`w-full text-left px-3 py-2.5 rounded-lg text-xs transition-all border mb-1.5 flex justify-between items-center ${(newUserData.assignments?.booths || []).includes(b.id) ? 'bg-indigo-600/20 border-indigo-500/40 text-white shadow-[0_0_15px_rgba(79,70,229,0.1)]' : 'bg-white/5 border-white/5 text-slate-400 hover:text-white hover:border-white/10'}`}
                                                >
                                                    <div className="flex flex-col">
                                                        <span className="font-bold">Booth {b.number}</span>
                                                        <span className="text-[10px] text-slate-500">{b.lbName}</span>
                                                    </div>
                                                    {(newUserData.assignments?.booths || []).includes(b.id) && <span className="text-indigo-400 font-bold bg-indigo-400/10 w-5 h-5 flex items-center justify-center rounded-full">✓</span>}
                                                </button>
                                            ))}
                                        </div>
                                    ))}
                            </div>
                        </div>
                    )}

                    {/* STEP 3: LOGIN DETAILS */}
                    {selectedRole && (
                        <div className="space-y-3">
                            <label className="text-xs font-semibold text-slate-300">Step 3 — Login Details</label>
                            <input type="text" placeholder="Full Name (e.g. Rahul K)" value={newUserData.full_name || ''} onChange={(e) => setNewUserData({ ...newUserData, full_name: e.target.value })} className={ADMIN_INPUT} />
                            <input type="text" placeholder="Phone Number" value={newUserData.phone_number || ''} onChange={(e) => setNewUserData({ ...newUserData, phone_number: e.target.value })} className={ADMIN_INPUT} />
                            <input type="text" placeholder="Username" disabled={!!editingUser} value={newUserData.username} onChange={(e) => setNewUserData({ ...newUserData, username: e.target.value })} className={ADMIN_INPUT + (editingUser ? ' opacity-40 cursor-not-allowed' : '')} />
                            <input type="password" placeholder={editingUser ? "New password (leave blank to keep current)" : "Password"} value={newUserData.password || ''} onChange={(e) => setNewUserData({ ...newUserData, password: e.target.value })} className={ADMIN_INPUT} />
                        </div>
                    )}

                    {/* STEP 4: PERMISSIONS */}
                    {selectedRole && (
                        <div className="space-y-3">
                            <label className="text-xs font-semibold text-slate-300">Step 4 — Permissions</label>
                            <div className="grid grid-cols-2 gap-2">
                                {PERMISSIONS.map(p => (
                                    <button
                                        key={p.key}
                                        onClick={() => setNewUserData({ ...newUserData, [p.key]: !newUserData[p.key] })}
                                        title={p.desc}
                                        className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs text-left transition-all ${newUserData[p.key] ? 'bg-indigo-600/20 border-indigo-500/40 text-white' : 'bg-white/5 border-white/5 text-slate-500 hover:text-slate-300'}`}
                                    >
                                        <span>{p.icon}</span>
                                        <span className="font-semibold leading-tight">{p.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Action Buttons */}
                    {selectedRole && (
                        <div className="flex gap-3 pt-2">
                            {editingUser && (
                                <button onClick={cancelEdit} className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 text-sm font-semibold hover:bg-white/10 transition-all">
                                    Cancel
                                </button>
                            )}
                            <button
                                onClick={editingUser ? handleUpdateUser : handleCreateUser}
                                className="flex-[2] py-3 rounded-xl lux-btn-primary text-sm font-bold"
                            >
                                {editingUser ? 'Save Changes' : 'Create Account'}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Right: Staff List */}
            <div className="col-span-12 lg:col-span-7">
                <div className="lux-glass p-6 rounded-3xl border-white/5 space-y-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <h2 className="text-base font-bold text-white">Staff Members</h2>
                            <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">{allUsers.length} accounts total</span>
                        </div>
                        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                            <div className="relative flex-1 sm:min-w-[200px]">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs">🔍</span>
                                <input
                                    type="text"
                                    placeholder="Search name, user or phone..."
                                    value={userSearchTerm}
                                    onChange={(e) => setUserSearchTerm(e.target.value)}
                                    className="w-full bg-black/40 border border-white/5 rounded-xl pl-9 pr-4 py-2 text-xs text-white outline-none focus:border-indigo-500/50 transition-all"
                                />
                            </div>
                            <select
                                value={userRoleFilter}
                                onChange={(e) => setUserRoleFilter(e.target.value)}
                                className="bg-black/40 border border-white/5 rounded-xl px-4 py-2 text-xs text-slate-400 outline-none focus:border-indigo-500/50 appearance-none cursor-pointer"
                            >
                                <option value="">All Roles</option>
                                {Object.entries(ROLE_INFO).map(([val, info]) => (
                                    <option key={val} value={val} className="bg-slate-900">{info.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="space-y-2 max-h-[700px] overflow-y-auto pr-1">
                        {allUsers
                            .filter(u => {
                                const matchesSearch = !userSearchTerm ||
                                    u.username?.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
                                    u.full_name?.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
                                    u.phone_number?.includes(userSearchTerm);
                                const matchesRole = !userRoleFilter || u.role === userRoleFilter;
                                return matchesSearch && matchesRole;
                            })
                            .map(u => (
                                <div key={u.id} className="flex items-center justify-between gap-4 px-4 py-3 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/8 hover:border-indigo-500/20 transition-all group">
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                        <div className="w-9 h-9 rounded-xl bg-indigo-500/15 border border-white/10 flex items-center justify-center text-sm font-black text-indigo-400 shrink-0 uppercase">
                                            {u.username.substring(0, 2)}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="font-semibold text-sm text-white">{u.full_name || u.username}</span>
                                                {u.full_name && <span className="text-[10px] text-slate-500">@{u.username}</span>}
                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white/10 text-slate-300">{ROLE_INFO[u.role]?.label || u.role}</span>
                                                {u.phone_number && <span className="text-[10px] text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-500/20">{u.phone_number}</span>}
                                            </div>
                                            <div className="flex flex-wrap gap-1 mt-1">
                                                {(u.constituencies || []).map(n => <span key={n} className="text-[9px] text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded">{n}</span>)}
                                                {(u.local_bodies || []).map(n => <span key={n} className="text-[9px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">{n}</span>)}
                                                {(u.booths || []).map(n => <span key={n} className="text-[9px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">Booth {n}</span>)}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 shrink-0">
                                        <button onClick={() => startEditUser(u)} className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs font-semibold text-slate-300 hover:bg-white hover:text-black transition-all">
                                            Edit
                                        </button>
                                        {(userRole === 'SUPERUSER' || userRole === 'MANAGER') && (
                                            <button onClick={() => handleDeleteUser(u.id)} className="px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs font-semibold text-rose-400 hover:bg-rose-500 hover:text-white transition-all">
                                                Remove
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        {allUsers.length === 0 && (
                            <div className="text-center py-12 text-slate-500 text-sm">No staff accounts yet. Create the first one →</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UserManagement;
