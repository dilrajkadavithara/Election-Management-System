import React, { useState, useEffect } from 'react';
import api from '../api';

const FamilyHeads = ({
    allLocations,
    currentUser,
    userRole,
    setEditData,
    setEditMode
}) => {
    const [filters, setFilters] = useState({
        constituency: '', lb: '', booth: '',
        gender: '', leaning: '', location: ''
    });
    const [searchQuery, setSearchQuery] = useState('');
    const [headList, setHeadList] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(false);

    const pageSize = 50;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    // Force constituency selection first (allows global lb/booth view)
    // Booth Agents skip this check as they are pre-assigned to a booth
    const canFetch = !!filters.constituency || userRole === 'BOOTH_AGENT';

    const loadData = async (currentPage = 1) => {
        if (!canFetch) {
            setHeadList([]);
            setTotal(0);
            return;
        }
        setLoading(true);
        try {
            const data = await api.getVoters({
                search: searchQuery,
                constituency: filters.constituency,
                lb: filters.lb,
                booth: filters.booth,
                gender: filters.gender,
                leaning: filters.leaning,
                location: filters.location,
                is_head_of_family: true,
                page: currentPage,
                page_size: pageSize
            });
            setHeadList(data.results);
            setTotal(data.total || data.count || 0);
            setPage(currentPage);
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    useEffect(() => {
        // Auto-select booth for Booth Agents
        if (userRole === 'BOOTH_AGENT' && currentUser?.assignments?.booths?.length > 0) {
            const bid = parseInt(currentUser.assignments.booths[0]);
            let resolved = false;
            for (const c of allLocations) {
                for (const lb of c.local_bodies) {
                    if (lb.booths.some(b => parseInt(b.id) === bid)) {
                        setFilters(f => ({ ...f, constituency: c.id, lb: lb.id, booth: bid }));
                        resolved = true;
                        break;
                    }
                }
                if (resolved) break;
            }
        }
    }, [allLocations, currentUser, userRole]);

    useEffect(() => {
        const timer = setTimeout(() => {
            loadData(1);
        }, 500);
        return () => clearTimeout(timer);
    }, [filters, searchQuery]);

    return (
        <div className="min-h-screen border-l border-white/5 bg-slate-50 v2-bg-obsidian p-6 pt-24 lg:p-12 lg:pl-[420px] lg:pr-16 space-y-8 lg:space-y-12 lux-animate-in">
            <header className="flex flex-col lg:flex-row justify-between items-center lg:items-end border-b border-white/5 pb-8 lg:pb-10 gap-6 lg:gap-10 text-center lg:text-left">
                <div className="flex flex-col items-center lg:items-start">
                    <h1 className="text-4xl sm:text-5xl lg:text-7xl font-black tracking-tighter uppercase lux-text-gradient">Influencer Segment</h1>
                    <p className="text-slate-300 font-black uppercase tracking-[0.4em] text-[11px] mt-4 ml-0 lg:ml-1">Strategic view of Family Heads (ഗൃഹനാഥൻ)</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 sm:items-center">
                    <div className="relative group">
                        <input
                            type="text"
                            placeholder="Search Heads..."
                            className="lux-glass w-80 py-4 px-8 rounded-2xl text-[11px] font-black uppercase tracking-widest outline-none border border-white/5 focus:border-indigo-500/50 transition-all text-white placeholder-slate-500"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        <div className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-300 group-hover:text-amber-400 transition-colors">🔍</div>
                    </div>
                </div>
            </header>

            {/* Matrix Filter Bar */}
            <div className="lux-glass p-6 sm:p-8 rounded-[3rem] border-white/5 shadow-2xl space-y-6 group">
                <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/5 rounded-full blur-[100px] -mr-40 -mt-40 transition-all group-hover:bg-amber-500/10" />

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-end relative z-10">
                    {[
                        { label: 'Constituency', key: 'constituency', icon: '🗺️', options: allLocations },
                        { label: 'Local Body', key: 'lb', icon: '🏘️', options: allLocations.find(c => String(c.id) === String(filters.constituency))?.local_bodies, disabled: !filters.constituency },
                        { label: 'Booth Unit', key: 'booth', icon: '📍', options: allLocations.find(c => String(c.id) === String(filters.constituency))?.local_bodies?.find(l => String(l.id) === String(filters.lb))?.booths, disabled: !filters.lb },
                        { label: 'Voter Sentiment', key: 'leaning', icon: '⚖️', options: [{ id: 'UDF', name: 'UDF' }, { id: 'LDF', name: 'LDF' }, { id: 'NDA', name: 'NDA' }, { id: 'NEUTRAL', name: 'NEUTRAL' }] }
                    ].filter(f => userRole !== 'BOOTH_AGENT' || !['constituency', 'lb', 'booth'].includes(f.key)).map(f => (
                        <div key={f.key} className="flex flex-col gap-2">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs">{f.icon}</span>
                                <label className="text-[9px] font-black uppercase text-amber-400 tracking-[0.2em]">{f.label}</label>
                            </div>
                            <select
                                disabled={f.disabled}
                                className="lux-glass text-white border border-white/10 rounded-xl px-4 py-3 text-[10px] font-black uppercase tracking-widest focus:ring-2 focus:ring-amber-500/50 cursor-pointer hover:bg-white/10 transition-all outline-none w-full appearance-none disabled:opacity-20 shadow-inner"
                                value={filters[f.key]}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    if (f.key === 'constituency') setFilters({ ...filters, constituency: val, lb: '', booth: '' });
                                    else if (f.key === 'lb') setFilters({ ...filters, lb: val, booth: '' });
                                    else setFilters({ ...filters, [f.key]: val });
                                }}
                            >
                                <option value="" className="bg-slate-900">Select...</option>
                                {f.options?.map(o => (
                                    <option key={o.id} value={o.id} className="bg-slate-900">
                                        {o.name || `BOOTH ${o.number}`}
                                    </option>
                                ))}
                            </select>
                        </div>
                    ))}
                </div>
            </div>

            {/* List View */}
            {!canFetch ? (
                <div className="flex flex-col items-center justify-center py-32 space-y-4 opacity-30 text-white">
                    <span className="text-8xl">👑</span>
                    <p className="font-black uppercase tracking-[0.3em] text-center text-xs">Select a Constituency to reveal key influencers</p>
                </div>
            ) : (
                <div className="lux-glass rounded-[2rem] border-amber-500/20 shadow-[0_0_50px_rgba(245,158,11,0.05)] overflow-hidden group">
                    <div className="overflow-x-auto w-full">
                        {loading && (
                            <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm z-10 flex items-center justify-center">
                                <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
                            </div>
                        )}
                        <div className="w-full text-left flex flex-col">
                            <div className="hidden lg:grid grid-cols-12 border-b border-white/5 text-[9px] font-black uppercase text-slate-300 tracking-[0.2em] items-center px-8 lg:px-4 pl-4 lg:pl-10">
                                <div className="col-span-1 py-6">Sl</div>
                                <div className="col-span-3 py-6 px-2">Family Head</div>
                                <div className="col-span-3 py-6 px-2">House Details</div>
                                <div className="col-span-2 py-6 px-2">Phone No</div>
                                <div className="col-span-1 py-6 px-2 text-center">Gen/Age</div>
                                <div className="col-span-1 py-6 px-2">Status</div>
                                <div className="col-span-1 py-6 pr-10 text-right">Action</div>
                            </div>
                            <div className="flex flex-col gap-4 lg:gap-0 lg:divide-y divide-white/5 p-4 lg:p-0">
                                {headList.length === 0 && !loading && (
                                    <div className="py-20 text-center text-slate-500 text-xs font-black uppercase tracking-[0.2em]">No family heads identified in this booth yet.</div>
                                )}
                                {headList.map(v => (
                                    <div key={v.id} className="flex flex-col lg:grid lg:grid-cols-12 group hover:bg-white/5 lg:hover:bg-amber-500/10 bg-white/5 lg:bg-transparent rounded-3xl lg:rounded-none border border-white/10 lg:border-transparent transition-all duration-300 p-6 lg:p-0 lg:items-center pl-6 lg:pl-10 relative">

                                        <div className="hidden lg:block col-span-1 py-5 font-black text-amber-500 text-[10px]">{v.serial_no}</div>

                                        <div className="col-span-3 lg:px-2 py-0 lg:py-5 flex flex-col items-start mb-4 lg:mb-0 border-b border-white/10 lg:border-0 pb-4 lg:pb-0">
                                            <span className="text-white font-black text-lg lg:text-[12px] uppercase tracking-wider lg:tracking-widest group-hover:text-amber-400 transition-colors">
                                                {v.full_name} <span className="text-amber-500" title="Head of Family (ഗൃഹനാഥൻ)">👑</span>
                                            </span>
                                            <span className="text-slate-300 text-[9px] font-bold mt-1 uppercase leading-none">EPIC: <span className="text-amber-400/80">{v.epic_id}</span></span>
                                        </div>

                                        <div className="col-span-3 lg:px-2 py-2 lg:py-5 flex flex-col text-left">
                                            <span className="text-[12px] lg:text-[10px] font-black text-white uppercase tracking-tighter">{v.house_name || '—'}</span>
                                            <span className="text-[10px] lg:text-[9px] font-bold text-slate-500 block">{v.house_no || ''}</span>
                                        </div>

                                        <div className="col-span-2 lg:px-2 py-2 lg:py-5 flex flex-col text-left">
                                            <span className="text-[12px] lg:text-[10px] font-black text-white uppercase tracking-widest">{v.phone_no || 'NOT GATHERED'}</span>
                                        </div>

                                        <div className="col-span-1 lg:px-2 py-2 lg:py-5 flex justify-center text-center items-center gap-1">
                                            <span className="text-[13px] lg:text-[11px] font-black text-white">{v.gender?.charAt(0)}</span>
                                            <span className="text-[11px] lg:text-[9px] font-black text-slate-300"> • {v.age}</span>
                                        </div>

                                        <div className="col-span-1 lg:px-2 py-2 lg:py-5 flex items-center gap-2">
                                            {v.voter_leaning ? (
                                                <span className={`text-[9px] px-2 py-1 rounded font-black uppercase text-white shadow-sm
                                                    ${v.voter_leaning === 'UDF' ? 'bg-blue-500' : v.voter_leaning === 'LDF' ? 'bg-red-500' : v.voter_leaning === 'NDA' ? 'bg-orange-500' : 'bg-slate-500'}
                                                `}>
                                                    {v.voter_leaning}
                                                </span>
                                            ) : (
                                                <span className="text-[9px] font-black uppercase text-slate-500 border border-slate-600 px-2 py-1 rounded">PENDING</span>
                                            )}
                                        </div>

                                        <div className="col-span-1 py-4 lg:py-5 mt-4 lg:mt-0 border-t border-white/5 lg:border-0 lg:pr-10 text-right w-full lg:w-auto flex justify-center lg:block">
                                            <button
                                                onClick={() => { setEditData({ ...v, phone_no: v.phone_no || '' }); setEditMode(true); }}
                                                className="w-full lg:w-auto px-5 py-2 rounded-2xl lg:rounded-xl font-black uppercase text-[12px] lg:text-[9px] tracking-[0.3em] lg:tracking-widest transition-all bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500 hover:text-white"
                                            >
                                                Edit
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-between px-10 py-6 border-t border-amber-500/10 text-white">
                        <p className="text-[10px] font-black uppercase text-amber-400/50 tracking-widest">
                            Showing {total > 0 ? ((page - 1) * pageSize) + 1 : 0}–{Math.min(page * pageSize, total)} of {total} Influencers
                        </p>
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => loadData(page - 1)}
                                disabled={page <= 1}
                                className="bg-amber-500/5 text-amber-300 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-500/20 transition-all disabled:opacity-20 disabled:cursor-not-allowed"
                            >
                                ← Prev
                            </button>
                            <span className="text-[11px] font-black text-amber-500/80 tracking-widest">
                                Page {page} / {totalPages}
                            </span>
                            <button
                                onClick={() => loadData(page + 1)}
                                disabled={page >= totalPages}
                                className="bg-amber-500/5 text-amber-300 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-500/20 transition-all disabled:opacity-20 disabled:cursor-not-allowed"
                            >
                                Next →
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FamilyHeads;
