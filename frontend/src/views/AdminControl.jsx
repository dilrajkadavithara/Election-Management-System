import React, { useState } from 'react';

// Role definitions with plain descriptions
const ROLE_INFO = {
    BOOTH_AGENT: { label: 'Booth Agent', desc: 'Access to one or more booths', scope: 'booth' },
    ZONE_COMMANDER: { label: 'Zone Commander', desc: 'Access to a cluster of booths', scope: 'booth' },
    LOCAL_BODY_HEAD: { label: 'Local Body Head', desc: 'Access to an entire panchayat/municipality', scope: 'lb' },
    CONSTITUENCY_ADMIN: { label: 'Constituency Admin', desc: 'Access to an entire constituency', scope: 'constituency' },
    MANAGER: { label: 'Manager', desc: 'Full data access across all areas', scope: 'all' },
    OPERATOR: { label: 'Operator', desc: 'Data entry and upload only', scope: 'all' },
    SUPERUSER: { label: 'Super Admin', desc: 'Complete system control', scope: 'all' },
};

const PERMISSIONS = [
    { key: 'can_download', label: 'Download Data', icon: '📥', desc: 'Export voter lists as CSV/Excel' },
    { key: 'can_upload', label: 'Upload & OCR', icon: '📤', desc: 'Upload and process voter lists' },
    { key: 'can_verify', label: 'Verify Records', icon: '✅', desc: 'Approve scanned voter data' },
    { key: 'can_edit_voters', label: 'Edit Voters', icon: '✏️', desc: 'Edit voter details and phone numbers' },
    { key: 'can_send_broadcasts', label: 'Send Messages', icon: '💬', desc: 'Send WhatsApp/SMS to voters' },
    { key: 'can_manage_system', label: 'Manage System', icon: '⚙️', desc: 'Add locations and parties' },
];

const inp = "w-full bg-slate-900/60 text-white border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-500/60 transition-all placeholder-slate-600";
const sel = inp + " appearance-none cursor-pointer";

const AdminControl = ({
    allLocations,
    allUsers,
    userRole,
    newLocData,
    setNewLocData,
    handleAddLocation,
    newUserData,
    setNewUserData,
    assignSelection,
    setAssignSelection,
    handleCreateUser,
    handleUpdateUser,
    handleDeleteUser,
    startEditUser,
    editingUser,
    setEditingUser,
    allParties,
    newPartyData,
    setNewPartyData,
    newPartyFile,
    setNewPartyFile,
    handleAddParty,
    handleSyncParties,
    PARTY_PRESETS,
    dashboardStats
}) => {
    const [activeTab, setActiveTab] = useState('users'); // users | locations | parties

    const selectedRole = newUserData.role;
    const roleScope = ROLE_INFO[selectedRole]?.scope || '';

    const unassignedBooths = (() => {
        const allBoothIds = allLocations.flatMap(c => c.local_bodies.flatMap(lb => lb.booths.map(b => b.id)));
        const assignedIds = allUsers.flatMap(u => u.booth_ids || []);
        return allBoothIds.filter(id => !assignedIds.includes(id)).length;
    })();

    const cancelEdit = () => {
        setEditingUser(null);
        setNewUserData({
            username: '', password: '', role: 'BOOTH_AGENT',
            can_download: false, can_upload: false, can_verify: true,
            can_edit_voters: true, can_send_broadcasts: false, can_manage_system: false,
            assignments: { constituencies: [], local_bodies: [], booths: [] }
        });
    };

    const toggleBoothAssignment = (boothId) => {
        const current = newUserData.assignments?.booths || [];
        const updated = current.includes(boothId)
            ? current.filter(x => x !== boothId)
            : [...current, boothId];
        setNewUserData({ ...newUserData, assignments: { ...newUserData.assignments, booths: updated } });
    };

    const toggleConstAssignment = (constId) => {
        const current = newUserData.assignments?.constituencies || [];
        const updated = current.includes(constId)
            ? current.filter(x => x !== constId)
            : [...current, constId];
        setNewUserData({ ...newUserData, assignments: { ...newUserData.assignments, constituencies: updated } });
    };

    const toggleLBAssignment = (lbId) => {
        const current = newUserData.assignments?.local_bodies || [];
        const updated = current.includes(lbId)
            ? current.filter(x => x !== lbId)
            : [...current, lbId];
        setNewUserData({ ...newUserData, assignments: { ...newUserData.assignments, local_bodies: updated } });
    };

    return (
        <div className="min-h-screen lux-mesh-bg p-8 pl-[400px] pr-10 pb-24 lux-animate-in text-white">

            {/* Header */}
            <div className="flex flex-wrap justify-between items-center border-b border-white/8 pb-8 mb-10 gap-6">
                <div>
                    <h1 className="text-4xl font-black tracking-tight lux-text-gradient">User Settings</h1>
                    <p className="text-slate-400 text-sm mt-1">Manage staff accounts, locations, and party branding</p>
                </div>
                <div className="flex gap-4">
                    <div className="lux-glass border-rose-500/20 px-6 py-4 rounded-2xl text-center">
                        <p className="text-xs text-rose-400 font-semibold mb-1">Unassigned Booths</p>
                        <p className="text-2xl font-black">{unassignedBooths}</p>
                    </div>
                    <div className="lux-glass border-indigo-500/20 px-6 py-4 rounded-2xl text-center">
                        <p className="text-xs text-indigo-400 font-semibold mb-1">Total Staff</p>
                        <p className="text-2xl font-black">{allUsers.length}</p>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-8 bg-black/30 p-1.5 rounded-2xl w-fit border border-white/5">
                {[
                    { key: 'users', label: '👤 Staff Accounts' },
                    ...(['SUPERUSER', 'MANAGER'].includes(userRole) ? [
                        { key: 'locations', label: '📍 Locations' },
                        { key: 'parties', label: '🏳️ Party Branding' },
                    ] : [])
                ].map(t => (
                    <button
                        key={t.key}
                        onClick={() => setActiveTab(t.key)}
                        className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeTab === t.key ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {/* ── TAB: USERS ── */}
            {activeTab === 'users' && (
                <div className="grid grid-cols-12 gap-8">

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
                                    className={sel}
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

                            {/* STEP 2: LOCATION ASSIGNMENT (only if role requires a scope) */}
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
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-slate-300">Step 2 — Assign Booth(s)</label>
                                    <div className="max-h-52 overflow-y-auto space-y-2 pr-1">
                                        {allLocations.map(c => (
                                            <div key={c.id}>
                                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1 mb-1 mt-2">{c.name}</p>
                                                {c.local_bodies.flatMap(lb => lb.booths.map(b => ({ ...b, lbName: lb.name }))).map(b => (
                                                    <button
                                                        key={b.id}
                                                        onClick={() => toggleBoothAssignment(b.id)}
                                                        className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-all border mb-1 flex justify-between items-center ${(newUserData.assignments?.booths || []).includes(b.id) ? 'bg-indigo-600/20 border-indigo-500/40 text-white' : 'bg-white/5 border-white/5 text-slate-400 hover:text-white'}`}
                                                    >
                                                        <span>Booth {b.booth_number} <span className="text-slate-500">— {b.lbName}</span></span>
                                                        {(newUserData.assignments?.booths || []).includes(b.id) && <span className="text-indigo-400 font-bold">✓</span>}
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
                                    <input
                                        type="text"
                                        placeholder="Username"
                                        disabled={!!editingUser}
                                        value={newUserData.username}
                                        onChange={(e) => setNewUserData({ ...newUserData, username: e.target.value })}
                                        className={inp + (editingUser ? ' opacity-40 cursor-not-allowed' : '')}
                                    />
                                    <input
                                        type="password"
                                        placeholder={editingUser ? "New password (leave blank to keep current)" : "Password"}
                                        value={newUserData.password || ''}
                                        onChange={(e) => setNewUserData({ ...newUserData, password: e.target.value })}
                                        className={inp}
                                    />
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
                        <div className="lux-glass p-6 rounded-3xl border-white/5">
                            <div className="flex justify-between items-center mb-5">
                                <h2 className="text-base font-bold text-white">Staff Members</h2>
                                <span className="text-xs text-slate-400">{allUsers.length} accounts</span>
                            </div>
                            <div className="space-y-2">
                                {allUsers.map(u => (
                                    <div key={u.id} className="flex items-center justify-between gap-4 px-4 py-3 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/8 hover:border-indigo-500/20 transition-all group">
                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                            <div className="w-9 h-9 rounded-xl bg-indigo-500/15 border border-white/10 flex items-center justify-center text-sm font-black text-indigo-400 shrink-0 uppercase">
                                                {u.username.substring(0, 2)}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="font-semibold text-sm text-white">{u.username}</span>
                                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white/10 text-slate-300">{ROLE_INFO[u.role]?.label || u.role}</span>
                                                </div>
                                                <div className="flex flex-wrap gap-1 mt-1">
                                                    {(u.constituencies || []).map(n => <span key={n} className="text-[9px] text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded">{n}</span>)}
                                                    {(u.local_bodies || []).map(n => <span key={n} className="text-[9px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">{n}</span>)}
                                                    {(u.booths || []).length > 0 && <span className="text-[9px] text-slate-400 bg-white/5 px-1.5 py-0.5 rounded">{u.booths.length} booth{u.booths.length > 1 ? 's' : ''}</span>}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex gap-2 shrink-0">
                                            <button
                                                onClick={() => startEditUser(u)}
                                                className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs font-semibold text-slate-300 hover:bg-white hover:text-black transition-all"
                                            >
                                                Edit
                                            </button>
                                            {(userRole === 'SUPERUSER' || userRole === 'MANAGER') && (
                                                <button
                                                    onClick={() => handleDeleteUser(u.id)}
                                                    className="px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs font-semibold text-rose-400 hover:bg-rose-500 hover:text-white transition-all"
                                                >
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
            )}

            {/* ── TAB: LOCATIONS ── */}
            {activeTab === 'locations' && ['SUPERUSER', 'MANAGER'].includes(userRole) && (
                <div className="grid grid-cols-12 gap-8">
                    <div className="col-span-12 lg:col-span-5">
                        <div className="lux-glass p-8 rounded-3xl border-white/5 space-y-6">
                            <div>
                                <h2 className="text-base font-bold text-white">Add Location</h2>
                                <p className="text-xs text-slate-400 mt-0.5">Add a constituency, local body, or polling booth.</p>
                            </div>

                            {/* Type Selector */}
                            <div className="flex gap-2 bg-black/30 p-1 rounded-xl border border-white/5">
                                {[
                                    { val: 'const', label: 'Constituency' },
                                    { val: 'lb', label: 'Local Body' },
                                    { val: 'booth', label: 'Booth' },
                                ].map(t => (
                                    <button
                                        key={t.val}
                                        onClick={() => setNewLocData({ ...newLocData, type: t.val })}
                                        className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${newLocData.type === t.val ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                                    >
                                        {t.label}
                                    </button>
                                ))}
                            </div>

                            {/* Constituency */}
                            {newLocData.type === 'const' && (
                                <input
                                    type="text"
                                    placeholder="Constituency name"
                                    value={newLocData.name}
                                    onChange={(e) => setNewLocData({ ...newLocData, name: e.target.value })}
                                    className={inp}
                                />
                            )}

                            {/* Local Body */}
                            {newLocData.type === 'lb' && (
                                <div className="space-y-3">
                                    <select
                                        value={newLocData.parentId}
                                        onChange={(e) => setNewLocData({ ...newLocData, parentId: e.target.value })}
                                        className={sel}
                                    >
                                        <option value="">Select constituency</option>
                                        {allLocations.map(c => <option key={c.id} value={c.id} className="bg-slate-900">{c.name}</option>)}
                                    </select>
                                    <input
                                        type="text"
                                        placeholder="Local body name"
                                        value={newLocData.name}
                                        onChange={(e) => setNewLocData({ ...newLocData, name: e.target.value })}
                                        className={inp}
                                    />
                                </div>
                            )}

                            {/* Booth */}
                            {newLocData.type === 'booth' && (
                                <div className="space-y-3">
                                    <select
                                        value={newLocData.grandParentId}
                                        onChange={(e) => setNewLocData({ ...newLocData, grandParentId: e.target.value, parentId: '' })}
                                        className={sel}
                                    >
                                        <option value="">Select constituency</option>
                                        {allLocations.map(c => <option key={c.id} value={c.id} className="bg-slate-900">{c.name}</option>)}
                                    </select>
                                    <select
                                        value={newLocData.parentId}
                                        onChange={(e) => setNewLocData({ ...newLocData, parentId: e.target.value })}
                                        className={sel}
                                        disabled={!newLocData.grandParentId}
                                    >
                                        <option value="">Select local body</option>
                                        {allLocations.find(c => String(c.id) === String(newLocData.grandParentId))?.local_bodies.map(lb => (
                                            <option key={lb.id} value={lb.id} className="bg-slate-900">{lb.name}</option>
                                        ))}
                                    </select>
                                    <input type="text" placeholder="Booth number" value={newLocData.boothNum} onChange={(e) => setNewLocData({ ...newLocData, boothNum: e.target.value })} className={inp} />
                                    <div className="grid grid-cols-2 gap-3">
                                        <input type="text" placeholder="Polling station no." value={newLocData.psNo} onChange={(e) => setNewLocData({ ...newLocData, psNo: e.target.value })} className={inp} />
                                        <input type="text" placeholder="Polling station name" value={newLocData.psName} onChange={(e) => setNewLocData({ ...newLocData, psName: e.target.value })} className={inp} />
                                    </div>
                                </div>
                            )}

                            <button onClick={handleAddLocation} className="w-full lux-btn-primary py-3 text-sm font-bold rounded-xl">
                                Add {newLocData.type === 'const' ? 'Constituency' : newLocData.type === 'lb' ? 'Local Body' : 'Booth'}
                            </button>
                        </div>
                    </div>

                    {/* Location Summary */}
                    <div className="col-span-12 lg:col-span-7">
                        <div className="lux-glass p-6 rounded-3xl border-white/5 space-y-4">
                            <h2 className="text-base font-bold text-white">Location Overview</h2>
                            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                                {allLocations.map(c => (
                                    <div key={c.id} className="bg-white/5 border border-white/5 rounded-2xl p-4">
                                        <p className="font-bold text-sm text-white mb-2">🏛️ {c.name}</p>
                                        {c.local_bodies.map(lb => (
                                            <div key={lb.id} className="ml-4 mb-2">
                                                <p className="text-xs font-semibold text-slate-300 mb-1">📍 {lb.name} <span className="text-slate-600">({lb.booths?.length || 0} booths)</span></p>
                                                <div className="flex flex-wrap gap-1 ml-3">
                                                    {lb.booths?.map(b => (
                                                        <span key={b.id} className="text-[10px] bg-white/5 border border-white/8 rounded-md px-2 py-0.5 text-slate-400">Booth {b.booth_number}</span>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── TAB: PARTIES ── */}
            {activeTab === 'parties' && ['SUPERUSER', 'MANAGER'].includes(userRole) && (
                <div className="grid grid-cols-12 gap-8">
                    <div className="col-span-12 lg:col-span-5 space-y-6">

                        {/* Sync Button */}
                        <div className="lux-glass p-6 rounded-3xl border-emerald-500/20 bg-emerald-500/5 space-y-4">
                            <div>
                                <h2 className="text-base font-bold text-emerald-400">Sync Official Parties</h2>
                                <p className="text-xs text-slate-400 mt-1">Automatically loads INC, CPM, IUML, CPI, Kerala Congress, RSP branding into the system.</p>
                            </div>
                            <button onClick={handleSyncParties} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl font-bold text-sm transition-all">
                                Sync Party Data
                            </button>
                        </div>

                        {/* Add Custom Party */}
                        <div className="lux-glass p-6 rounded-3xl border-white/5 space-y-4">
                            <div>
                                <h2 className="text-base font-bold text-white">Add Custom Party</h2>
                                <p className="text-xs text-slate-400 mt-1">Manually register a party with its logo and colors.</p>
                            </div>

                            <select
                                onChange={(e) => {
                                    const p = PARTY_PRESETS.find(pr => pr.label === e.target.value);
                                    if (p) setNewPartyData({ ...newPartyData, name: p.label.split(' (')[0], shortLabel: p.short, color: p.color, gradient: p.gradient });
                                }}
                                className={sel}
                            >
                                <option value="">Load from template...</option>
                                {PARTY_PRESETS.map(p => <option key={p.label} value={p.label} className="bg-slate-900">{p.label}</option>)}
                            </select>

                            <div className="grid grid-cols-2 gap-3">
                                <input type="text" placeholder="Party name" value={newPartyData.name} onChange={(e) => setNewPartyData({ ...newPartyData, name: e.target.value })} className={inp} />
                                <input type="text" placeholder="Short code (e.g. INC)" value={newPartyData.shortLabel} onChange={(e) => setNewPartyData({ ...newPartyData, shortLabel: e.target.value })} className={inp} />
                            </div>

                            <div className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-xl">
                                <div>
                                    <p className="text-xs text-slate-400 mb-1">Party Colour</p>
                                    <div className="flex items-center gap-2">
                                        <input type="color" value={newPartyData.color} onChange={(e) => setNewPartyData({ ...newPartyData, color: e.target.value })} className="w-10 h-8 bg-transparent border-none rounded cursor-pointer" />
                                        <span className="text-xs font-mono text-slate-400">{newPartyData.color.toUpperCase()}</span>
                                    </div>
                                </div>
                                <div className="flex-1">
                                    <p className="text-xs text-slate-400 mb-1">Gradient (CSS)</p>
                                    <input type="text" value={newPartyData.gradient} onChange={(e) => setNewPartyData({ ...newPartyData, gradient: e.target.value })} className="w-full bg-transparent text-xs font-mono text-indigo-400 outline-none" />
                                </div>
                            </div>

                            <div
                                onClick={() => document.getElementById('party-logo-input').click()}
                                className="border border-dashed border-white/15 p-6 rounded-2xl flex flex-col items-center gap-2 cursor-pointer hover:bg-white/5 transition-all"
                            >
                                <span className="text-2xl">{newPartyFile ? '✅' : '🖼️'}</span>
                                <span className="text-xs text-slate-400">{newPartyFile ? newPartyFile.name : 'Click to upload party logo (PNG)'}</span>
                                <input type="file" id="party-logo-input" className="hidden" accept="image/*" onChange={(e) => setNewPartyFile(e.target.files[0])} />
                            </div>

                            <button onClick={handleAddParty} className="w-full lux-btn-primary py-3 text-sm font-bold rounded-xl">
                                Add Party
                            </button>
                        </div>
                    </div>

                    {/* Party List */}
                    <div className="col-span-12 lg:col-span-7">
                        <div className="lux-glass p-6 rounded-3xl border-white/5 space-y-4">
                            <h2 className="text-base font-bold text-white">Registered Parties</h2>
                            <div className="space-y-2">
                                {allParties.map(p => (
                                    <div key={p.id} className="flex items-center gap-4 px-4 py-3 bg-white/5 border border-white/5 rounded-2xl">
                                        <div className="w-10 h-10 rounded-xl overflow-hidden bg-white/10 shrink-0">
                                            {p.symbol_image && <img src={`/api/party-symbol/${p.symbol_image}`} alt={p.name} className="w-full h-full object-contain" />}
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-semibold text-sm text-white">{p.name}</p>
                                            <p className="text-xs text-slate-500">{p.short_label}</p>
                                        </div>
                                        <div className="w-6 h-6 rounded-full shrink-0" style={{ backgroundColor: p.primary_color }} />
                                    </div>
                                ))}
                                {allParties.length === 0 && (
                                    <div className="text-center py-8 text-slate-500 text-sm">No parties registered. Click "Sync Party Data" to get started.</div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminControl;
