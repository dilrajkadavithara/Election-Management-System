import React from 'react';
import { PieChart, Pie } from 'recharts';

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
    PARTY_PRESETS,
    dashboardStats
}) => {
    return (
        <div className="space-y-12 animate-in pb-20">
            <header className="flex justify-between items-end">
                <div>
                    <h1 className="text-4xl font-black tracking-tighter uppercase text-slate-800">System Control</h1>
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-xs mt-2">Organizational Governance Layer</p>
                </div>
                <div className="flex gap-6">
                    <div className="bg-white px-8 py-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-center">
                        <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest mb-1">Unassigned Booths</p>
                        <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-black text-rose-600">
                                {(() => {
                                    const allBoothIds = allLocations.flatMap(c => c.local_bodies.flatMap(lb => lb.booths.map(b => b.id)));
                                    const assignedBoothIds = allUsers.flatMap(u => u.booth_ids || []);
                                    const unassigned = allBoothIds.filter(id => !assignedBoothIds.includes(id));
                                    return unassigned.length;
                                })()}
                            </span>
                            <span className="text-[10px] font-bold text-slate-400">Records Pending</span>
                        </div>
                    </div>
                    <div className="bg-white px-8 py-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-center">
                        <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest mb-1">Human Intelligence</p>
                        <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-black text-slate-800">{allUsers.length}</span>
                            <span className="text-[10px] font-bold text-slate-400">Activated Agents</span>
                        </div>
                    </div>
                </div>
            </header>
            <div className="grid grid-cols-2 gap-12">
                {userRole === 'SUPERUSER' && (
                    <div className="space-y-8">
                        <div className="bg-white p-10 rounded-[40px] shadow-xl border border-slate-100 space-y-6">
                            <h3 className="text-xl font-black uppercase tracking-tight">Geo-Hierarchy Entry</h3>
                            <div className="flex gap-2">
                                {['const', 'lb', 'booth'].map(t => (
                                    <button
                                        key={t}
                                        onClick={() => setNewLocData({ ...newLocData, type: t })}
                                        className={`flex-1 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all ${newLocData.type === t ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-50 text-slate-400'}`}
                                    >
                                        {t}
                                    </button>
                                ))}
                            </div>
                            <div className="space-y-4">
                                {newLocData.type === 'booth' && (
                                    <>
                                        <select
                                            value={newLocData.grandParentId}
                                            onChange={(e) => setNewLocData({ ...newLocData, grandParentId: e.target.value, parentId: '' })}
                                            className="w-full p-4 bg-slate-50 border-2 border-slate-50 rounded-2xl font-bold font-xs"
                                        >
                                            <option value="">Select Constituency...</option>
                                            {allLocations.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                        <select
                                            value={newLocData.parentId}
                                            onChange={(e) => setNewLocData({ ...newLocData, parentId: e.target.value })}
                                            className="w-full p-4 bg-slate-50 border-2 border-slate-50 rounded-2xl font-bold font-xs"
                                            disabled={!newLocData.grandParentId}
                                        >
                                            <option value="">Select Local Body...</option>
                                            {allLocations.find(c => String(c.id) === String(newLocData.grandParentId))?.local_bodies.map(lb => <option key={lb.id} value={lb.id}>{lb.name}</option>)}
                                        </select>
                                        <input
                                            type="text"
                                            placeholder="Booth Num"
                                            value={newLocData.boothNum}
                                            onChange={(e) => setNewLocData({ ...newLocData, boothNum: e.target.value })}
                                            className="w-full p-4 bg-slate-50 border-2 border-slate-50 rounded-2xl font-bold"
                                        />
                                        <div className="grid grid-cols-2 gap-4">
                                            <input
                                                type="text"
                                                placeholder="PS No"
                                                value={newLocData.psNo}
                                                onChange={(e) => setNewLocData({ ...newLocData, psNo: e.target.value })}
                                                className="p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold"
                                            />
                                            <input
                                                type="text"
                                                placeholder="PS Name"
                                                value={newLocData.psName}
                                                onChange={(e) => setNewLocData({ ...newLocData, psName: e.target.value })}
                                                className="p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold"
                                            />
                                        </div>
                                    </>
                                )}
                                {newLocData.type !== 'booth' && (
                                    <input
                                        type="text"
                                        placeholder={`${newLocData.type.toUpperCase()} Name`}
                                        value={newLocData.name}
                                        onChange={(e) => setNewLocData({ ...newLocData, name: e.target.value })}
                                        className="w-full p-4 bg-slate-50 border-2 border-slate-50 rounded-2xl font-bold"
                                    />
                                )}
                                <button onClick={handleAddLocation} className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black uppercase text-[11px] shadow-xl">Add Location</button>
                            </div>
                        </div>

                        {/* Party Management */}
                        <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-100 space-y-8">
                            <div className="flex items-center gap-4 border-b border-slate-50 pb-6">
                                <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 text-xl shadow-inner">🎨</div>
                                <div>
                                    <h3 className="text-lg font-black uppercase tracking-tight text-slate-800">Political Brand Control</h3>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Manage Party Identities & Symbols</p>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="grid grid-cols-1 gap-5">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black uppercase text-slate-500 px-1">Full Organization Name</label>
                                        <input type="text" placeholder="e.g. Indian National Congress" value={newPartyData.name} onChange={(e) => setNewPartyData({ ...newPartyData, name: e.target.value })} className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-bold text-slate-700 outline-none" />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black uppercase text-slate-500 px-1">Short Label</label>
                                            <input type="text" placeholder="e.g. INC" value={newPartyData.shortLabel} onChange={(e) => setNewPartyData({ ...newPartyData, shortLabel: e.target.value })} className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:bg-white" />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black uppercase text-slate-500 px-1">Quick Presets</label>
                                            <select
                                                onChange={(e) => {
                                                    const p = PARTY_PRESETS.find(pr => pr.label === e.target.value);
                                                    if (p) setNewPartyData({ ...newPartyData, name: p.label.split(' (')[0], shortLabel: p.short, color: p.color, gradient: p.gradient });
                                                }}
                                                className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-600 outline-none cursor-pointer focus:bg-white"
                                            >
                                                <option value="">Select Template...</option>
                                                {PARTY_PRESETS.map(p => <option key={p.label} value={p.label}>{p.label}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-5 bg-slate-50/50 rounded-2xl border border-slate-100 space-y-4">
                                    <div className="flex items-center justify-between gap-4">
                                        <div className="flex-1 space-y-1.5">
                                            <label className="text-[9px] font-black uppercase text-slate-400">Primary Branding Color</label>
                                            <div className="flex items-center gap-3 bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
                                                <input type="color" value={newPartyData.color} onChange={(e) => setNewPartyData({ ...newPartyData, color: e.target.value })} className="w-10 h-8 bg-transparent border-none rounded cursor-pointer shrink-0" />
                                                <span className="text-[11px] font-mono font-bold text-slate-500">{newPartyData.color.toUpperCase()}</span>
                                            </div>
                                        </div>
                                        <div className="flex-1 space-y-1.5">
                                            <label className="text-[9px] font-black uppercase text-slate-400">Identity Gradient</label>
                                            <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-sm h-12 flex items-center">
                                                <input type="text" value={newPartyData.gradient} onChange={(e) => setNewPartyData({ ...newPartyData, gradient: e.target.value })} className="w-full bg-transparent border-none outline-none font-mono text-[9px] text-slate-400 px-2 truncate" />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="block text-[10px] font-black text-slate-500 uppercase px-1">Official Symbol Logo</label>
                                    <div className="relative cursor-pointer group">
                                        <input type="file" id="party-logo-input" onChange={(e) => setNewPartyFile(e.target.files[0])} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                                        <div className="w-full py-6 bg-white border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-2 group-hover:border-indigo-400 group-hover:bg-indigo-50/10 transition-all">
                                            <span className="text-2xl">{newPartyFile ? "✅" : "📤"}</span>
                                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{newPartyFile ? newPartyFile.name : "Click to Upload Symbol"}</span>
                                        </div>
                                    </div>
                                </div>

                                <button onClick={handleAddParty} className="w-full bg-slate-900 text-white py-4 rounded-xl font-black uppercase tracking-[0.1em] text-[11px] shadow-lg shadow-slate-200 active:scale-[0.98] transition-all hover:bg-slate-800">Register Branding</button>
                            </div>

                            <div className="pt-6 border-t border-slate-50">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">Registered Parties</p>
                                <div className="grid grid-cols-2 gap-3">
                                    {allParties.map(p => (
                                        <div key={p.id} className="bg-white p-3 rounded-2xl flex items-center gap-3 border border-slate-100 shadow-sm hover:translate-y-[-2px] transition-all" style={{ borderLeft: `4px solid ${p.primary_color}` }}>
                                            <img src={`/api/party-symbol/${p.symbol_image}`} className="w-8 h-8 object-contain rounded-lg bg-slate-50 p-1 border border-slate-100" alt={p.name} />
                                            <div className="overflow-hidden">
                                                <span className="text-[10px] font-black uppercase truncate block text-slate-700 leading-tight">{p.name}</span>
                                                <span className="text-[8px] font-bold text-slate-400 uppercase leading-none">{p.short_label}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div className={`space-y-8 ${userRole !== 'SUPERUSER' ? 'col-span-2' : ''}`}>
                    <div className="bg-white p-10 rounded-[40px] shadow-xl border border-slate-100 space-y-6">
                        <h3 className="text-xl font-black uppercase tracking-tight">{editingUser ? `Update ${editingUser.username}` : 'Account Activation'}</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <input type="text" disabled={!!editingUser} placeholder="Username" value={newUserData.username} onChange={(e) => setNewUserData({ ...newUserData, username: e.target.value })} className="p-4 bg-slate-50 border-2 border-slate-50 rounded-2xl font-bold" />
                            {!editingUser && <input type="password" placeholder="Password" value={newUserData.password} onChange={(e) => setNewUserData({ ...newUserData, password: e.target.value })} className="p-4 bg-slate-50 border-2 border-slate-50 rounded-2xl font-bold" />}
                            <select value={newUserData.role} onChange={(e) => setNewUserData({ ...newUserData, role: e.target.value, assignments: { constituencies: [], local_bodies: [], booths: [] } })} className="col-span-2 p-4 bg-slate-50 border-2 border-slate-50 rounded-2xl font-bold">
                                <option value="">Select Role...</option>
                                <option value="BOOTH_AGENT">Booth Agent</option>
                                <option value="ZONE_COMMANDER">Zone Commander</option>
                                <option value="LOCAL_BODY_HEAD">Local Body Head</option>
                                <option value="CONSTITUENCY_ADMIN">Constituency Admin</option>
                                <option value="MANAGER">Manager</option>
                                <option value="OPERATOR">Operator</option>
                                <option value="SUPERUSER">Superuser</option>
                            </select>

                            <div className="col-span-2 space-y-4 py-2">
                                <div className="flex items-center gap-2 border-b border-slate-50 pb-2">
                                    <span className="text-[10px] font-black uppercase text-slate-400">Permission Matrix</span>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    {[
                                        { key: 'can_download', label: 'Report Export', icon: '📊' },
                                        { key: 'can_upload', label: 'OCR Engine', icon: '⚡' },
                                        { key: 'can_verify', label: 'Data Verification', icon: '✅' },
                                        { key: 'can_edit_voters', label: 'Intelligence Edit', icon: '✏️' },
                                        { key: 'can_send_broadcasts', label: 'Comms Hub', icon: '📣' },
                                        { key: 'can_manage_system', label: 'System Admin', icon: '🛡️' },
                                    ].map(perm => (
                                        <button
                                            key={perm.key}
                                            onClick={() => setNewUserData({ ...newUserData, [perm.key]: !newUserData[perm.key] })}
                                            className={`p-3 rounded-2xl flex items-center gap-3 border transition-all ${newUserData[perm.key] ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm' : 'bg-slate-50 border-slate-100 text-slate-400 opacity-60'}`}
                                        >
                                            <span className="text-sm">{perm.icon}</span>
                                            <span className="text-[9px] font-black uppercase tracking-tight">{perm.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {newUserData.role && !['SUPERUSER', 'MANAGER', 'OPERATOR'].includes(newUserData.role) && (
                                <div className="col-span-2 bg-slate-50 p-6 rounded-3xl space-y-4">
                                    <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest px-2">Hierarchical Assignment</label>
                                    <div className="space-y-4">
                                        {['LOCAL_BODY_HEAD', 'ZONE_COMMANDER', 'BOOTH_AGENT'].includes(newUserData.role) && (
                                            <select
                                                value={assignSelection.constId}
                                                onChange={(e) => setAssignSelection({ ...assignSelection, constId: e.target.value, lbId: '' })}
                                                className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-bold text-xs"
                                            >
                                                <option value="">Select Constituency...</option>
                                                {allLocations.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                            </select>
                                        )}

                                        {['ZONE_COMMANDER', 'BOOTH_AGENT'].includes(newUserData.role) && assignSelection.constId && (
                                            <select
                                                value={assignSelection.lbId}
                                                onChange={(e) => setAssignSelection({ ...assignSelection, lbId: e.target.value })}
                                                className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-bold text-xs"
                                            >
                                                <option value="">Select Local Body...</option>
                                                {(allLocations.find(c => String(c.id) === String(assignSelection.constId))?.local_bodies || []).map(lb => (
                                                    <option key={lb.id} value={lb.id}>{lb.name}</option>
                                                ))}
                                            </select>
                                        )}

                                        <div className="max-h-48 overflow-y-auto space-y-2 border-t pt-4">
                                            {(() => {
                                                let items = [];
                                                let key = '';

                                                if (newUserData.role === 'CONSTITUENCY_ADMIN') {
                                                    items = allLocations;
                                                    key = 'constituencies';
                                                } else if (newUserData.role === 'LOCAL_BODY_HEAD') {
                                                    items = allLocations.find(c => String(c.id) === String(assignSelection.constId))?.local_bodies || [];
                                                    key = 'local_bodies';
                                                } else if (['ZONE_COMMANDER', 'BOOTH_AGENT'].includes(newUserData.role)) {
                                                    items = (allLocations.find(c => String(c.id) === String(assignSelection.constId))?.local_bodies || []).find(lb => String(lb.id) === String(assignSelection.lbId))?.booths || [];
                                                    key = 'booths';
                                                }

                                                if (items.length === 0 && !['CONSTITUENCY_ADMIN'].includes(newUserData.role)) {
                                                    return <p className="text-[10px] text-slate-400 font-bold italic text-center py-4">Please select parent area first</p>;
                                                }

                                                return items.map(item => {
                                                    const isAssigned = newUserData.assignments[key]?.includes(item.id);
                                                    const isTaken = allUsers.some(u =>
                                                        u.id !== editingUser?.id && (
                                                            (key === 'booths' && u.booth_ids?.includes(item.id)) ||
                                                            (key === 'local_bodies' && u.local_body_ids?.includes(item.id)) ||
                                                            (key === 'constituencies' && u.constituency_ids?.includes(item.id))
                                                        )
                                                    );

                                                    return (
                                                        <button
                                                            key={item.id}
                                                            disabled={isTaken && !isAssigned}
                                                            onClick={() => {
                                                                const current = newUserData.assignments[key] || [];
                                                                const updated = isAssigned ? current.filter(id => id !== item.id) : [...current, item.id];
                                                                setNewUserData({ ...newUserData, assignments: { ...newUserData.assignments, [key]: updated } });
                                                            }}
                                                            className={`w-full text-left p-3 rounded-xl text-[10px] font-black uppercase tracking-tight flex justify-between items-center transition-all ${isAssigned ? 'bg-indigo-600 text-white shadow-md' :
                                                                isTaken ? 'bg-slate-100 text-slate-300 cursor-not-allowed opacity-50' :
                                                                    'bg-white hover:bg-slate-200 text-slate-600 shadow-sm'
                                                                }`}
                                                        >
                                                            <div className="flex flex-col">
                                                                <span>{item.name || `Booth ${item.number}`}</span>
                                                                {isTaken && !isAssigned && <span className="text-[7px] font-bold text-rose-400">Already Active</span>}
                                                            </div>
                                                            <span>{isAssigned ? '✅' : isTaken ? '🔒' : '+'}</span>
                                                        </button>
                                                    );
                                                });
                                            })()}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="flex gap-4">
                            {editingUser && (
                                <button onClick={() => {
                                    setEditingUser(null);
                                    setNewUserData({ username: '', password: '', role: 'BOOTH_AGENT', assignments: { constituencies: [], local_bodies: [], booths: [] } });
                                }} className="flex-1 bg-slate-100 text-slate-400 py-5 rounded-3xl font-black uppercase tracking-widest text-[11px]">Cancel</button>
                            )}
                            <button onClick={editingUser ? handleUpdateUser : handleCreateUser} className="flex-[2] bg-indigo-600 text-white py-5 rounded-3xl font-black uppercase shadow-xl hover:bg-indigo-700 transition-all">
                                {editingUser ? 'Save Updates' : 'Activate Account'}
                            </button>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="flex justify-between items-center px-4">
                            <div className="flex items-center gap-3">
                                <div className="w-1.5 h-6 bg-indigo-500 rounded-full"></div>
                                <h3 className="text-xl font-black uppercase tracking-tight text-slate-800">Active Intelligence Network</h3>
                            </div>
                            <div className="bg-slate-100 px-3 py-1 rounded-full text-[10px] font-black text-slate-400 uppercase tracking-widest">{allUsers.length} Agents</div>
                        </div>

                        <div className="space-y-4">
                            {allUsers.map(u => (
                                <div key={u.id} className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100 flex items-center justify-between hover:border-indigo-200 hover:shadow-md transition-all group">
                                    <div className="flex items-center gap-5 flex-1 min-w-0">
                                        <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center font-black text-slate-400 text-xs shadow-inner uppercase shrink-0">
                                            {u.username.substring(0, 2)}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-3 mb-1">
                                                <h4 className="font-black uppercase text-sm text-slate-800 tracking-tight truncate">{u.username}</h4>
                                                <span className="px-2 py-0.5 bg-slate-900 text-white rounded-md text-[8px] font-black uppercase tracking-[0.1em] shrink-0">{u.role}</span>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {(u.constituencies || []).map(n => <span key={n} className="text-[9px] font-bold text-blue-500 uppercase bg-blue-50 px-2 py-0.5 rounded border border-blue-100/50">Const: {n}</span>)}
                                                {(u.local_bodies || []).map(n => <span key={n} className="text-[9px] font-bold text-emerald-500 uppercase bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100/50">LB: {n}</span>)}
                                                {(u.booths || []).map(n => <span key={n} className="text-[9px] font-bold text-slate-500 uppercase bg-slate-50 px-2 py-0.5 rounded border border-slate-200">Booth {n}</span>)}
                                                {!(u.constituencies?.length || u.local_bodies?.length || u.booths?.length) && <span className="text-[9px] italic text-slate-300 font-bold uppercase tracking-widest">Awaiting Assignment</span>}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 pl-6 border-l border-slate-50 ml-6 shrink-0">
                                        <button
                                            onClick={() => startEditUser(u)}
                                            className="px-5 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all active:scale-95 shadow-sm"
                                        >
                                            Modify
                                        </button>
                                        {(userRole === 'SUPERUSER' || userRole === 'MANAGER') && (
                                            <button
                                                onClick={() => handleDeleteUser(u.id)}
                                                className="px-5 py-2.5 bg-rose-50 border border-rose-100 text-rose-600 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-rose-600 hover:text-white hover:border-rose-600 transition-all active:scale-95 shadow-sm"
                                            >
                                                Revoke
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminControl;
