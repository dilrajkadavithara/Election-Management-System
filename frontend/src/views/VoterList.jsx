import React, { useCallback, useMemo } from 'react';
import api from '../api';
import { DEFAULT_PAGE_SIZE } from '../constants';

const VoterList = ({
    voterList,
    voterTotal,
    currentPage,
    voterLoading,
    listFilters,
    setListFilters,
    searchQuery,
    setSearchQuery,
    allLocations,
    loadVoters,
    loadAdminData,
    currentUser,
    userRole,
    setEditData,
    setEditMode,
    handleUpdateIntel
}) => {
    const pageSize = DEFAULT_PAGE_SIZE;
    const totalPages = Math.max(1, Math.ceil(voterTotal / pageSize));

    React.useEffect(() => {
        // Auto-select booth for Booth Agents
        if (userRole === 'BOOTH_AGENT' && currentUser?.assignments?.booths?.length > 0) {
            const bid = parseInt(currentUser.assignments.booths[0]);
            let resolved = false;
            for (const c of allLocations) {
                for (const lb of c.local_bodies) {
                    if (lb.booths.some(b => parseInt(b.id) === bid)) {
                        setListFilters(f => ({ ...f, constituency: c.id, lb: lb.id, booth: bid }));
                        resolved = true;
                        break;
                    }
                }
                if (resolved) break;
            }
        }
    }, [allLocations, currentUser, userRole]);

    return (
        <div className="min-h-screen lux-mesh-bg p-6 pt-24 lg:p-12 lg:pl-[420px] lg:pr-16 space-y-8 lg:space-y-12 lux-animate-in">
            <header className="flex flex-col lg:flex-row justify-between items-center lg:items-end border-b border-white/5 pb-8 lg:pb-10 gap-6 lg:gap-10 text-center lg:text-left">
                <div className="flex flex-col items-center lg:items-start">
                    <h1 className="text-4xl sm:text-5xl lg:text-7xl font-black tracking-tighter uppercase lux-text-gradient">Voters Base</h1>
                    <p className="text-slate-300 font-black uppercase tracking-[0.4em] text-[11px] mt-4 ml-0 lg:ml-1">Live Database: {voterTotal} Synchronized Profiles</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 sm:items-center">
                    <button
                        onClick={() => api.exportVoters({
                            search: searchQuery,
                            constituency: listFilters.constituency,
                            lb: listFilters.lb,
                            booth: listFilters.booth,
                            gender: listFilters.gender,
                            age_from: listFilters.ageFrom,
                            age_to: listFilters.ageTo,
                            leaning: listFilters.leaning,
                            location: listFilters.location
                        })}
                        disabled={(currentUser?.role !== 'SUPERUSER' && userRole !== 'SUPERUSER') && !currentUser?.can_download}
                        className="lux-btn-primary !py-4 !px-8 shadow-[0_0_20px_rgba(99,102,241,0.3)]"
                    >
                        Export Assets 📥
                    </button>
                    <div className="relative group">
                        <input
                            type="text"
                            placeholder="Search Intelligence..."
                            className="lux-glass w-full sm:w-80 py-4 px-8 rounded-2xl text-[11px] font-black uppercase tracking-widest outline-none border border-white/5 focus:border-indigo-500/50 transition-all text-white placeholder-slate-500"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        <div className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-300 group-hover:text-indigo-400 transition-colors">🔍</div>
                    </div>
                </div>
            </header>

            {/* 🛡️ Intelligence Filter Bar */}
            <div className="lux-glass p-6 sm:p-8 rounded-[3rem] border-white/5 shadow-2xl space-y-6 group">
                <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/5 rounded-full blur-[100px] -mr-40 -mt-40 transition-all group-hover:bg-indigo-500/10" />

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 items-end relative z-10">
                    {[
                        { label: 'Constituency', key: 'constituency', icon: '🗺️', options: allLocations },
                        { label: 'Local Body', key: 'lb', icon: '🏘️', options: allLocations.find(c => String(c.id) === String(listFilters.constituency))?.local_bodies, disabled: !listFilters.constituency },
                        { label: 'Booth Unit', key: 'booth', icon: '📍', options: allLocations.find(c => String(c.id) === String(listFilters.constituency))?.local_bodies?.find(l => String(l.id) === String(listFilters.lb))?.booths, disabled: !listFilters.lb },
                        { label: 'Gender', key: 'gender', icon: '👤', options: [{ id: 'MALE', name: 'MALE' }, { id: 'FEMALE', name: 'FEMALE' }, { id: 'TRANSGENDER', name: 'TRANSGENDER' }] },
                        { label: 'Voter Sentiment', key: 'leaning', icon: '⚖️', options: [{ id: 'UDF', name: 'UDF' }, { id: 'LDF', name: 'LDF' }, { id: 'NDA', name: 'NDA' }, { id: 'NEUTRAL', name: 'NEUTRAL' }] },
                        { label: 'LOCATION / CHANCES', key: 'location', icon: '🌎', options: [{ id: 'LOCAL', name: 'LOCAL' }, { id: 'ABROAD', name: 'ABROAD' }, { id: 'STATE', name: 'OTHER STATE' }, { id: 'DISTRICT', name: 'OTHER DIST' }, { id: 'LIKELY', name: 'LIKELY' }, { id: 'UNLIKELY', name: 'UNLIKELY' }, { id: 'OUT_OF_STATION', name: 'OUT OF STATION' }] }
                    ].filter(f => userRole !== 'BOOTH_AGENT' || !['constituency', 'lb', 'booth'].includes(f.key)).map(f => (
                        <div key={f.key} className="flex flex-col gap-2">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs">{f.icon}</span>
                                <label className="text-[9px] font-black uppercase text-indigo-400 tracking-[0.2em]">{f.label}</label>
                            </div>
                            <select
                                disabled={f.disabled}
                                className="lux-glass text-white border border-white/10 rounded-xl px-4 py-3 text-[10px] font-black uppercase tracking-widest focus:ring-2 focus:ring-indigo-500/50 cursor-pointer hover:bg-white/10 transition-all outline-none w-full appearance-none disabled:opacity-20 shadow-inner"
                                value={listFilters[f.key]}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    if (f.key === 'constituency') setListFilters({ ...listFilters, constituency: val, lb: '', booth: '' });
                                    else if (f.key === 'lb') setListFilters({ ...listFilters, lb: val, booth: '' });
                                    else setListFilters({ ...listFilters, [f.key]: val });
                                }}
                            >
                                <option value="" className="bg-slate-900">GLOBAL VIEW</option>
                                {f.options?.map(o => (
                                    <option key={o.id} value={o.id} className="bg-slate-900">
                                        {o.name || `BOOTH ${o.number}`}
                                    </option>
                                ))}
                            </select>
                        </div>
                    ))}
                </div>

                <div className="flex gap-4 mt-8 pt-8 border-t border-white/5 relative z-10">
                    <button
                        onClick={() => { loadVoters(1); loadAdminData(); }}
                        className="bg-indigo-600 text-white px-10 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-indigo-500 transition-all shadow-[0_10px_20px_rgba(99,102,241,0.2)] active:scale-95"
                    >
                        Update Data
                    </button>
                    <button
                        onClick={() => { setListFilters({ constituency: '', lb: '', booth: '', gender: '', ageFrom: '', ageTo: '', leaning: '', serialFrom: '', serialTo: '', location: '' }); setSearchQuery(''); }}
                        className="bg-white/5 text-slate-400 px-10 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-white/10 hover:text-white transition-all border border-white/5"
                    >
                        Reset Matrix
                    </button>
                </div>
            </div>

            {/* MAIN DATA TABLE - Made Horizontally Scrollable for Mobile */}
            <div className="lux-glass rounded-[2rem] border-white/5 shadow-2xl overflow-hidden group">
                <div className="overflow-x-auto w-full">
                    {voterLoading && (
                        <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm z-10 flex items-center justify-center">
                            <div className="flex flex-col items-center gap-4">
                                <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                                <span className="text-[10px] font-black uppercase text-indigo-400 tracking-widest animate-pulse">Loading Intelligence...</span>
                            </div>
                        </div>
                    )}
                    <div className="w-full text-left flex flex-col">
                        <div className="hidden lg:grid grid-cols-12 border-b border-white/5 text-[9px] font-black uppercase text-slate-300 tracking-[0.2em] items-center px-8 lg:px-4 pl-4 lg:pl-10">
                            <div className="col-span-1 py-6">Sl</div>
                            <div className="col-span-3 py-6 px-2">Name</div>
                            <div className="col-span-2 py-6 px-2">EPIC ID</div>
                            <div className="col-span-2 py-6 px-2">House</div>
                            <div className="col-span-2 py-6 px-2 text-center">Gen/Age</div>
                            <div className="col-span-1 py-6 px-2">Booth</div>
                            <div className="col-span-1 py-6 pr-10 text-right">Action</div>
                        </div>
                        <div className="flex flex-col gap-4 lg:gap-0 lg:divide-y divide-white/5 p-4 lg:p-0">
                            {voterList.map(v => (
                                <div key={v.id} className="flex flex-col lg:grid lg:grid-cols-12 group hover:bg-white/5 lg:hover:bg-white/5 bg-white/5 lg:bg-transparent rounded-3xl lg:rounded-none border border-white/10 lg:border-transparent transition-all duration-300 p-6 lg:p-0 lg:items-center pl-6 lg:pl-10 relative">

                                    <div className="hidden lg:block col-span-1 py-5 font-black text-slate-600 text-[10px]">{v.serial_no}</div>

                                    <div className="col-span-3 lg:px-2 py-0 lg:py-5 flex justify-between lg:block mb-4 lg:mb-0 border-b border-white/10 lg:border-0 pb-4 lg:pb-0 items-start">
                                        <div className="flex flex-col">
                                            <span className="text-white font-black text-lg lg:text-[12px] uppercase tracking-wider lg:tracking-widest group-hover:text-indigo-400 transition-colors">
                                                {v.full_name} {v.is_head_of_family && <span className="text-amber-500 animate-pulse ml-1" title="Head of Family (ഗൃഹനാഥൻ)">👑</span>}
                                            </span>
                                            <span className="text-slate-300 text-[9px] font-bold mt-1 uppercase leading-none">{v.local_body} Unit • SL NO: {v.serial_no}</span>
                                        </div>
                                        <div className="lg:hidden flex gap-2">
                                            <span className="bg-slate-800 text-indigo-400 px-3 py-1.5 rounded-xl font-mono text-[10px] border border-indigo-500/20">{v.epic_id}</span>
                                        </div>
                                    </div>

                                    <div className="hidden lg:block col-span-2 lg:px-2 py-0 lg:py-5">
                                        <span className="bg-slate-800 text-indigo-400 px-3 py-1.5 rounded-lg font-mono text-[10px] border border-indigo-500/20">{v.epic_id}</span>
                                    </div>

                                    <div className="col-span-2 lg:px-2 py-2 lg:py-5 flex justify-between lg:block items-center">
                                        <span className="lg:hidden text-[10px] font-black text-slate-500 uppercase tracking-widest">House / Location</span>
                                        <div className="flex flex-col lg:block gap-1 text-right lg:text-left">
                                            <span className="text-[12px] lg:text-[10px] font-black text-white uppercase tracking-tighter">{v.house_name || '—'}</span>
                                            <span className="text-[10px] lg:text-[9px] font-bold text-slate-500 block">{v.house_no || ''}</span>
                                        </div>
                                    </div>

                                    <div className="col-span-2 lg:px-2 py-2 lg:py-5 flex justify-between lg:block lg:text-center items-center">
                                        <span className="lg:hidden text-[10px] font-black text-slate-500 uppercase tracking-widest">Gender & Age</span>
                                        <div className="flex flex-row lg:flex-col gap-2 lg:gap-0 items-center justify-end lg:justify-center">
                                            <span className="text-[13px] lg:text-[11px] font-black text-white">{v.gender?.charAt(0)}</span>
                                            <span className="text-[11px] lg:text-[9px] font-black text-slate-300"> • {v.age} YRS</span>
                                        </div>
                                    </div>

                                    <div className="col-span-1 lg:px-2 py-2 lg:py-5 flex justify-between lg:block items-center">
                                        <span className="lg:hidden text-[10px] font-black text-slate-500 uppercase tracking-widest">Voting Booth</span>
                                        <span className="text-[11px] lg:text-[10px] font-black text-indigo-400 lg:text-slate-400 uppercase tracking-tighter">Booth {v.booth_no}</span>
                                    </div>

                                    <div className="col-span-1 py-4 lg:py-5 mt-4 lg:mt-0 border-t border-white/5 lg:border-0 lg:pr-10 text-right w-full lg:w-auto flex flex-col justify-center lg:block gap-2 items-center">
                                        {v.voter_leaning && (
                                            <div className="lg:hidden text-[10px] font-black uppercase text-emerald-400 tracking-widest text-center mb-2">✅ Already Updated</div>
                                        )}
                                        <button
                                            onClick={() => { setEditData({ ...v, phone_no: v.phone_no || '' }); setEditMode(true); }}
                                            className={`w-full lg:w-auto px-5 py-4 lg:py-2 rounded-2xl lg:rounded-xl font-black uppercase text-[12px] lg:text-[9px] tracking-[0.3em] lg:tracking-widest transition-all ${v.voter_leaning
                                                ? 'bg-emerald-500 lg:bg-emerald-500/10 text-white lg:text-emerald-400 border-emerald-500 lg:border-emerald-500/20 hover:bg-emerald-600 hover:text-white shadow-[0_0_20px_rgba(16,185,129,0.3)] lg:shadow-none'
                                                : 'bg-indigo-500 lg:bg-indigo-500/10 text-white lg:text-indigo-400 border border-indigo-500 lg:border-indigo-500/20 hover:bg-indigo-500 hover:text-white shadow-[0_0_20px_rgba(99,102,241,0.3)] lg:shadow-none'
                                                }`}
                                        >
                                            {v.voter_leaning ? 'Edit Again ✏️' : 'Update Profile ✏️'}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Pagination Controls */}
                <div className="flex items-center justify-between px-10 py-6 border-t border-white/5">
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                        Showing {voterTotal > 0 ? ((currentPage - 1) * pageSize) + 1 : 0}–{Math.min(currentPage * pageSize, voterTotal)} of {voterTotal}
                    </p>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => loadVoters(currentPage - 1)}
                            disabled={currentPage <= 1}
                            className="bg-white/5 text-slate-300 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all disabled:opacity-20 disabled:cursor-not-allowed"
                        >
                            ← Previous
                        </button>
                        <span className="text-[11px] font-black text-indigo-400 tracking-widest">
                            Page {currentPage} / {totalPages}
                        </span>
                        <button
                            onClick={() => loadVoters(currentPage + 1)}
                            disabled={currentPage >= totalPages}
                            className="bg-white/5 text-slate-300 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all disabled:opacity-20 disabled:cursor-not-allowed"
                        >
                            Next →
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VoterList;
