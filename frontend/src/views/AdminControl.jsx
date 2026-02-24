import React, { useState } from 'react';

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
    return (
        <div className="min-h-screen lux-mesh-bg p-12 pl-[420px] pr-16 space-y-16 lux-animate-in pb-32 text-white">
            <header className="flex flex-wrap justify-between items-end border-b border-white/5 pb-10 gap-12">
                <div>
                    <h1 className="text-7xl font-black tracking-tighter uppercase lux-text-gradient">Neural Config Engine</h1>
                    <p className="text-slate-300 font-black uppercase tracking-[0.4em] text-[11px] mt-4 ml-1">Elite Organizational Governance Protocol</p>
                </div>
                <div className="flex gap-8">
                    <div className="lux-glass border-rose-500/20 px-10 py-6 rounded-[2rem] text-center shadow-2xl relative overflow-hidden group">
                        <div className="absolute inset-0 bg-rose-500/5 group-hover:bg-rose-500/10 transition-colors" />
                        <p className="text-[9px] font-black uppercase text-rose-400 tracking-widest mb-1 relative z-10">Pending Units</p>
                        <div className="flex items-baseline gap-3 relative z-10">
                            <span className="text-4xl font-black italic">
                                {(() => {
                                    const allBoothIds = allLocations.flatMap(c => c.local_bodies.flatMap(lb => lb.booths.map(b => b.id)));
                                    const assignedBoothIds = allUsers.flatMap(u => u.booth_ids || []);
                                    return allBoothIds.filter(id => !assignedBoothIds.includes(id)).length;
                                })()}
                            </span>
                            <span className="text-[10px] font-black uppercase text-slate-300 italic">Unassigned</span>
                        </div>
                    </div>
                    <div className="lux-glass border-indigo-500/20 px-10 py-6 rounded-[2rem] text-center shadow-2xl relative overflow-hidden group">
                        <div className="absolute inset-0 bg-indigo-500/5 group-hover:bg-indigo-500/10 transition-colors" />
                        <p className="text-[9px] font-black uppercase text-indigo-400 tracking-widest mb-1 relative z-10">Activated Agents</p>
                        <div className="flex items-baseline gap-3 relative z-10">
                            <span className="text-4xl font-black italic">{allUsers.length}</span>
                            <span className="text-[10px] font-black uppercase text-slate-300 italic">Units</span>
                        </div>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-12 gap-10">
                {userRole === 'SUPERUSER' && (
                    <div className="col-span-12 lg:col-span-5 space-y-10">
                        {/* EMERGENCY SYNC - TOP PRIORITY */}
                        <div className="lux-glass p-10 rounded-[3.5rem] border-emerald-500/30 shadow-2xl space-y-6 bg-emerald-500/10 animate-pulse">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-400 italic">Core Branding Protocol</h3>
                            <button onClick={handleSyncParties} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-5 rounded-2xl font-black uppercase text-[11px] tracking-[0.4em] transition-all shadow-[0_0_20px_rgba(16,185,129,0.2)]">SYNCHRONIZE GLOBAL ASSETS</button>
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest text-center">Inject official identities (INC, CPM, IUML) into database.</p>
                        </div>

                        <div className="lux-glass p-12 rounded-[3.5rem] border-white/5 shadow-2xl space-y-10">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400 italic">Geo-Hierarchy Synthesis</h3>
                            <div className="flex gap-4 p-2 bg-black/40 rounded-2xl border border-white/5">
                                {['const', 'lb', 'booth'].map(t => (
                                    <button
                                        key={t}
                                        onClick={() => setNewLocData({ ...newLocData, type: t })}
                                        className={`flex-1 py-4 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all duration-500 ${newLocData.type === t ? 'bg-indigo-600 text-white shadow-[0_0_20px_rgba(99,102,241,0.4)] translate-y-[-2px]' : 'text-slate-300 hover:text-white'}`}
                                    >
                                        {t}
                                    </button>
                                ))}
                            </div>
                            <div className="space-y-6">
                                {newLocData.type === 'booth' && (
                                    <div className="space-y-4">
                                        <select
                                            value={newLocData.grandParentId}
                                            onChange={(e) => setNewLocData({ ...newLocData, grandParentId: e.target.value, parentId: '' })}
                                            className="w-full bg-slate-900/80 text-white border border-white/10 rounded-2xl px-6 py-4 text-[10px] font-black uppercase tracking-widest outline-none focus:border-indigo-500/50 appearance-none transition-all"
                                        >
                                            <option value="">SELECT SECTOR</option>
                                            {allLocations.map(c => <option key={c.id} value={c.id} className="bg-slate-900">{c.name}</option>)}
                                        </select>
                                        <select
                                            value={newLocData.parentId}
                                            onChange={(e) => setNewLocData({ ...newLocData, parentId: e.target.value })}
                                            className="w-full bg-slate-900/80 text-white border border-white/10 rounded-2xl px-6 py-4 text-[10px] font-black uppercase tracking-widest outline-none focus:border-indigo-500/50 appearance-none disabled:opacity-20 transition-all"
                                            disabled={!newLocData.grandParentId}
                                        >
                                            <option value="">SELECT CORE UNIT</option>
                                            {allLocations.find(c => String(c.id) === String(newLocData.grandParentId))?.local_bodies.map(lb => <option key={lb.id} value={lb.id} className="bg-slate-900">{lb.name}</option>)}
                                        </select>
                                        <input
                                            type="text"
                                            placeholder="SERIAL NUMBER"
                                            value={newLocData.boothNum}
                                            onChange={(e) => setNewLocData({ ...newLocData, boothNum: e.target.value })}
                                            className="w-full bg-slate-900/80 text-white border border-white/10 rounded-2xl px-6 py-4 text-[10px] font-black uppercase tracking-widest outline-none focus:border-indigo-500/50 transition-all placeholder-slate-700"
                                        />
                                        <div className="grid grid-cols-2 gap-4">
                                            <input type="text" placeholder="PS_NO" value={newLocData.psNo} onChange={(e) => setNewLocData({ ...newLocData, psNo: e.target.value })} className="bg-slate-900/80 text-white border border-white/10 rounded-2xl px-6 py-4 text-[10px] font-black uppercase tracking-widest outline-none focus:border-indigo-500/50 transition-all placeholder-slate-700" />
                                            <input type="text" placeholder="PS_NAME" value={newLocData.psName} onChange={(e) => setNewLocData({ ...newLocData, psName: e.target.value })} className="bg-slate-900/80 text-white border border-white/10 rounded-2xl px-6 py-4 text-[10px] font-black uppercase tracking-widest outline-none focus:border-indigo-500/50 transition-all placeholder-slate-700" />
                                        </div>
                                    </div>
                                )}
                                {newLocData.type !== 'booth' && (
                                    <input
                                        type="text"
                                        placeholder={`${newLocData.type.toUpperCase()} IDENTITY NAME`}
                                        value={newLocData.name}
                                        onChange={(e) => setNewLocData({ ...newLocData, name: e.target.value })}
                                        className="w-full bg-slate-900/80 text-white border border-white/10 rounded-2xl px-6 py-5 text-[11px] font-black uppercase tracking-widest outline-none focus:border-indigo-500/50 transition-all placeholder-slate-700 shadow-inner"
                                    />
                                )}
                                <button onClick={handleAddLocation} className="w-full lux-btn-primary !py-6 text-[10px] tracking-[0.3em] shadow-[0_0_30px_rgba(99,102,241,0.3)]">Inject Neural Area Block</button>
                            </div>
                        </div>

                        <div className="lux-glass p-12 rounded-[3.5rem] border-white/5 shadow-2xl space-y-10">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400 italic">Party Brand Synthesis</h3>
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[8px] font-black uppercase text-slate-300 tracking-widest ml-1">Identity Map</label>
                                    <select
                                        onChange={(e) => {
                                            const p = PARTY_PRESETS.find(pr => pr.label === e.target.value);
                                            if (p) setNewPartyData({ ...newPartyData, name: p.label.split(' (')[0], shortLabel: p.short, color: p.color, gradient: p.gradient });
                                        }}
                                        className="w-full bg-slate-900/80 text-white border border-white/10 rounded-2xl px-6 py-4 text-[10px] font-black uppercase tracking-widest outline-none focus:border-indigo-500/50 appearance-none transition-all cursor-pointer"
                                    >
                                        <option value="">LOAD TEMPLATE...</option>
                                        {PARTY_PRESETS.map(p => <option key={p.label} value={p.label} className="bg-slate-900">{p.label}</option>)}
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <input type="text" placeholder="ORG_NAME" value={newPartyData.name} onChange={(e) => setNewPartyData({ ...newPartyData, name: e.target.value })} className="bg-slate-900/80 text-white border border-white/10 rounded-2xl px-6 py-4 text-[10px] font-black uppercase tracking-widest outline-none focus:border-indigo-500/50 transition-all placeholder-slate-700" />
                                    <input type="text" placeholder="SHORT_LABEL" value={newPartyData.shortLabel} onChange={(e) => setNewPartyData({ ...newPartyData, shortLabel: e.target.value })} className="bg-slate-900/80 text-white border border-white/10 rounded-2xl px-6 py-4 text-[10px] font-black uppercase tracking-widest outline-none focus:border-indigo-500/50 transition-all placeholder-slate-700" />
                                </div>
                                <div className="flex gap-4 p-4 bg-white/5 border border-white/10 rounded-2xl items-center">
                                    <div className="flex-1 space-y-2">
                                        <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Brand Color</p>
                                        <div className="flex items-center gap-4">
                                            <input type="color" value={newPartyData.color} onChange={(e) => setNewPartyData({ ...newPartyData, color: e.target.value })} className="w-12 h-10 bg-transparent border-none rounded cursor-pointer shrink-0" />
                                            <span className="text-[10px] font-mono text-slate-400 font-black">{newPartyData.color.toUpperCase()}</span>
                                        </div>
                                    </div>
                                    <div className="flex-[2] space-y-2">
                                        <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Neural Gradient</p>
                                        <input type="text" value={newPartyData.gradient} onChange={(e) => setNewPartyData({ ...newPartyData, gradient: e.target.value })} className="w-full bg-transparent text-[9px] font-mono text-indigo-400 outline-none truncate italic" />
                                    </div>
                                </div>
                                <div onClick={() => document.getElementById('party-logo-input').click()} className="group border-2 border-dashed border-white/10 p-10 rounded-3xl flex flex-col items-center gap-3 cursor-pointer hover:bg-white/5 hover:border-indigo-500/30 transition-all relative overflow-hidden">
                                    <span className="text-3xl group-hover:scale-125 transition-transform duration-500">{newPartyFile ? '✨' : '📤'}</span>
                                    <span className="text-[9px] font-black text-slate-300 uppercase tracking-[0.3em]">{newPartyFile ? newPartyFile.name : 'INJECT SYMBOL_PROTOCOL'}</span>
                                    <input type="file" id="party-logo-input" className="hidden" onChange={(e) => setNewPartyFile(e.target.files[0])} />
                                </div>
                                <button onClick={handleAddParty} className="w-full lux-btn-primary !from-indigo-600 !to-purple-600 !py-6 text-[10px] tracking-[0.3em] shadow-[0_0_30px_rgba(139,92,246,0.3)]">Register Neural Party Brand</button>
                            </div>
                        </div>
                    </div>
                )}

                <div className={`col-span-12 lg:col-span-7 space-y-12 ${userRole !== 'SUPERUSER' ? 'lg:col-span-12' : ''}`}>
                    <div className="lux-glass p-12 rounded-[3.5rem] border-white/5 shadow-2xl space-y-12">
                        <h3 className="text-[11px] font-black uppercase tracking-[0.4em] text-indigo-400 italic">Agent Activation Crypt</h3>
                        <div className="grid grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <label className="text-[8px] font-black text-slate-300 uppercase tracking-widest ml-1">Identity Key</label>
                                <input type="text" disabled={!!editingUser} placeholder="USERNAME" value={newUserData.username} onChange={(e) => setNewUserData({ ...newUserData, username: e.target.value })} className="w-full bg-slate-900/80 text-white border border-white/10 rounded-2xl px-6 py-4 text-[11px] font-black uppercase tracking-widest outline-none focus:border-indigo-500/50 transition-all placeholder-slate-800 disabled:opacity-20" />
                            </div>
                            <div className="space-y-4">
                                <label className="text-[8px] font-black text-slate-300 uppercase tracking-widest ml-1">{editingUser ? 'RESET PASSWORD' : 'SECURE BYPASS'}</label>
                                <input type="password" placeholder={editingUser ? "LEAVE BLANK TO KEEP SAME" : "PASSWORD"} value={newUserData.password} onChange={(e) => setNewUserData({ ...newUserData, password: e.target.value })} className="w-full bg-slate-900/80 text-white border border-white/10 rounded-2xl px-6 py-4 text-[11px] font-black uppercase tracking-widest outline-none focus:border-indigo-500/50 transition-all placeholder-slate-800" />
                            </div>
                            <div className="col-span-2 space-y-4">
                                <label className="text-[8px] font-black text-slate-300 uppercase tracking-widest ml-1">Tactical Rank</label>
                                <select value={newUserData.role} onChange={(e) => setNewUserData({ ...newUserData, role: e.target.value, assignments: { constituencies: [], local_bodies: [], booths: [] } })} className="w-full bg-slate-900/80 text-white border border-white/10 rounded-2xl px-6 py-5 text-[11px] font-black uppercase tracking-widest outline-none focus:border-indigo-500/50 appearance-none transition-all">
                                    <option value="">SELECT CLEARANCE LEVEL</option>
                                    <option value="BOOTH_AGENT" className="bg-slate-900">BOOTH AGENT</option>
                                    <option value="ZONE_COMMANDER" className="bg-slate-900">ZONE COMMANDER</option>
                                    <option value="LOCAL_BODY_HEAD" className="bg-slate-900">LOCAL BODY HEAD</option>
                                    <option value="CONSTITUENCY_ADMIN" className="bg-slate-900">CONSTITUENCY ADMIN</option>
                                    <option value="MANAGER" className="bg-slate-900">GENERAL MANAGER</option>
                                    <option value="OPERATOR" className="bg-slate-900">SYSTEM OPERATOR</option>
                                    <option value="SUPERUSER" className="bg-slate-900">SUPERUSER COMMAND</option>
                                </select>
                            </div>

                            <div className="col-span-2 p-10 bg-black/40 border border-white/5 rounded-[2.5rem] space-y-10 group">
                                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.4em] italic flex items-center gap-3">
                                    <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse shadow-[0_0_10px_#6366f1]" />
                                    Permission Clearance Matrix
                                </p>
                                <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
                                    {[
                                        { key: 'can_download', label: 'Intel Export', icon: '📊' },
                                        { key: 'can_upload', label: 'AI Synthesis', icon: '⚡' },
                                        { key: 'can_verify', label: 'Truth Auth', icon: '✅' },
                                        { key: 'can_edit_voters', label: 'Core Intel Mod', icon: '✏️' },
                                        { key: 'can_send_broadcasts', label: 'Propagation', icon: '📣' },
                                        { key: 'can_manage_system', label: 'Full Governance', icon: '🛡️' },
                                    ].map(perm => (
                                        <button
                                            key={perm.key}
                                            onClick={() => setNewUserData({ ...newUserData, [perm.key]: !newUserData[perm.key] })}
                                            className={`p-5 rounded-2xl flex items-center gap-4 border transition-all duration-700 relative overflow-hidden group/btn ${newUserData[perm.key] ? 'border-indigo-500/50 bg-indigo-500/10 shadow-[0_0_20px_rgba(99,102,241,0.1)]' : 'border-white/5 bg-white/5 opacity-40 hover:opacity-100'}`}
                                        >
                                            <span className="text-xl group-hover/btn:scale-125 transition-transform duration-500">{perm.icon}</span>
                                            <span className="text-[10px] font-black uppercase tracking-widest text-white leading-none">{perm.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-6">
                            {editingUser && (
                                <button onClick={() => { setEditingUser(null); setNewUserData({ username: '', password: '', role: 'BOOTH_AGENT', assignments: { constituencies: [], local_bodies: [], booths: [] } }); }} className="flex-1 lux-glass border-white/10 py-6 rounded-3xl font-black uppercase tracking-widest text-[11px] hover:bg-white/5 transition-all">Abadon Modification</button>
                            )}
                            <button onClick={editingUser ? handleUpdateUser : handleCreateUser} className="flex-[2] lux-btn-primary !py-8 text-sm tracking-[0.4em] shadow-[0_0_40px_rgba(99,102,241,0.3)]">
                                {editingUser ? 'Commit Agent Logic' : 'Initiate Agent Activation'}
                            </button>
                        </div>
                    </div>

                    <div className="space-y-10">
                        <div className="flex justify-between items-end px-6">
                            <div>
                                <h3 className="text-2xl font-black uppercase tracking-tighter text-white italic">Active Node Network</h3>
                                <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.4em] mt-1">Live Agents Online: {allUsers.length}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-6">
                            {allUsers.map(u => (
                                <div key={u.id} className="lux-glass !bg-white/5 border-white/5 p-10 rounded-[3rem] flex items-center justify-between hover:bg-white/10 hover:border-indigo-500/30 transition-all duration-700 group relative overflow-hidden">
                                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <div className="flex items-center gap-8 relative z-10 flex-1">
                                        <div className="w-16 h-16 rounded-[1.5rem] bg-indigo-500/10 border border-white/10 flex items-center justify-center font-black text-indigo-400 text-xl shadow-inner uppercase italic">
                                            {u.username.substring(0, 2)}
                                        </div>
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-4">
                                                <h4 className="text-xl font-black uppercase text-white tracking-tight italic">{u.username}</h4>
                                                <span className="px-3 py-1 bg-white text-black rounded-lg text-[9px] font-black uppercase tracking-widest italic">{u.role}</span>
                                            </div>
                                            <div className="flex flex-wrap gap-3">
                                                {(u.constituencies || []).map(n => <span key={n} className="text-[9px] font-black text-indigo-400 uppercase bg-indigo-500/5 px-3 py-1 rounded-lg border border-indigo-500/20 italic">Sector: {n}</span>)}
                                                {(u.local_bodies || []).map(n => <span key={n} className="text-[9px] font-black text-emerald-400 uppercase bg-emerald-500/5 px-3 py-1 rounded-lg border border-emerald-500/20 italic">Unit: {n}</span>)}
                                                {(u.booths || []).map(n => <span key={n} className="text-[9px] font-black text-slate-400 uppercase bg-white/5 px-3 py-1 rounded-lg border border-white/10 italic">Core: {n}</span>)}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4 pl-10 border-l border-white/5 relative z-10">
                                        <button onClick={() => startEditUser(u)} className="p-4 rounded-2xl bg-white/5 border border-white/10 text-white hover:bg-white hover:text-black transition-all group/btn">
                                            <span className="text-[10px] font-black uppercase tracking-widest">MOD_NODE</span>
                                        </button>
                                        {(userRole === 'SUPERUSER' || userRole === 'MANAGER') && (
                                            <button onClick={() => handleDeleteUser(u.id)} className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 hover:bg-rose-500 hover:text-white transition-all">
                                                <span className="text-[10px] font-black uppercase tracking-widest italic">DEACTIVATE</span>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div >
    );
};

export default AdminControl;
