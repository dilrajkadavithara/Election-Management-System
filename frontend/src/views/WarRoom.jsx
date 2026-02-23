import React, { useState, useEffect } from 'react';
import {
    ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar
} from 'recharts';
import api from '../api';

const WarRoom = ({ allLocations, dashFilters }) => {
    const [perspective, setPerspective] = useState('UDF');
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filters, setFilters] = useState({
        constituencyId: dashFilters.constituency || '',
        lbId: dashFilters.lb || '',
        boothId: dashFilters.booth || ''
    });

    const branding = {
        UDF: { color: '#6366f1', text: 'text-indigo-400', shadow: 'shadow-[0_0_10px_#6366f1]' },
        LDF: { color: '#f43f5e', text: 'text-rose-500', shadow: 'shadow-[0_0_10px_#f43f5e]' },
        NDA: { color: '#f59e0b', text: 'text-amber-500', shadow: 'shadow-[0_0_10px_#f59e0b]' }
    };
    const activeBrand = branding[perspective] || branding.UDF;

    const loadTacticalData = async () => {
        setLoading(true);
        try {
            const data = await api.getWarRoomStats({
                constituency_id: filters.constituencyId,
                lb: filters.lbId,
                booth: filters.boothId,
                perspective: perspective
            });
            setStats(data);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    useEffect(() => {
        loadTacticalData();
    }, [filters, perspective]);

    // Derived location names
    const activeConst = allLocations.find(c => String(c.id) === String(filters.constituencyId));
    const activeLB = activeConst?.local_bodies.find(l => String(l.id) === String(filters.lbId));
    const activeBooth = activeLB?.booths.find(b => String(b.id) === String(filters.boothId));

    if (loading && !stats) return (
        <div className="min-h-screen lux-mesh-bg flex items-center justify-center">
            <div className="flex flex-col items-center">
                <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
                <p className="font-bold uppercase tracking-widest text-xs text-indigo-400">Loading Data...</p>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen lux-mesh-bg p-12 pl-[420px] pr-16 space-y-16 animate-in overflow-x-hidden">
            {/* 🛠️ HEADER & FILTERS */}
            <div className="flex flex-col gap-10 border-b border-white/5 pb-10">
                <div className="flex flex-wrap justify-between items-end gap-12">
                    <div>
                        <div className="flex items-center gap-3 mb-4">
                            <span className="w-3 h-3 rounded-full bg-rose-600 animate-pulse shadow-[0_0_15px_#e11d48]" />
                            <h4 className="font-bold uppercase tracking-[0.2em] text-sm text-rose-500">Live Field Tracking</h4>
                        </div>
                        <h1 className="text-7xl font-black uppercase tracking-tight leading-none text-white">
                            Tactical <span className="lux-text-gradient">Deployment HQ</span>
                        </h1>
                        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 mt-4 ml-1 flex items-center gap-2">
                            {stats?.performance?.top_win?.length > 0 ? (
                                <><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Intelligence Feed Active</>
                            ) : (
                                <><span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" /> Synchronizing Area Intel...</>
                            )}
                        </p>
                    </div>

                    <div className="flex items-center gap-6">
                        {/* Perspective Toggle */}
                        <div className="bg-slate-900/80 backdrop-blur-md p-1.5 rounded-2xl border border-white/10 flex gap-1">
                            {['UDF', 'LDF', 'NDA'].map(p => (
                                <button
                                    key={p}
                                    onClick={() => setPerspective(p)}
                                    className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${perspective === p ? 'bg-white text-black shadow-lg scale-105' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                                >
                                    {p}
                                </button>
                            ))}
                        </div>

                        {/* Filters Dropdowns */}
                        <div className="flex gap-4 bg-white/5 p-4 rounded-3xl border border-white/5 backdrop-blur-xl">
                            {/* Constituency Filter */}
                            <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Constituency</label>
                                <select
                                    className="bg-transparent text-white text-sm font-black uppercase tracking-widest outline-none cursor-pointer hover:text-indigo-400 transition-colors px-2"
                                    value={filters.constituencyId}
                                    onChange={(e) => setFilters({ ...filters, constituencyId: e.target.value, lbId: '', boothId: '' })}
                                >
                                    <option value="" className="bg-slate-900 text-white">All Areas</option>
                                    {allLocations.map(c => <option key={c.id} value={c.id} className="bg-slate-900">{c.name}</option>)}
                                </select>
                            </div>

                            <div className="w-px h-10 bg-white/5 self-center" />

                            {/* LB Filter */}
                            <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Local Body</label>
                                <select
                                    disabled={!filters.constituencyId}
                                    className="bg-transparent text-white text-sm font-black uppercase tracking-widest outline-none cursor-pointer hover:text-indigo-400 transition-colors disabled:opacity-20 px-2"
                                    value={filters.lbId}
                                    onChange={(e) => setFilters({ ...filters, lbId: e.target.value, boothId: '' })}
                                >
                                    <option value="" className="bg-slate-900">All Panchayats</option>
                                    {activeConst?.local_bodies.map(l => <option key={l.id} value={l.id} className="bg-slate-900">{l.name}</option>)}
                                </select>
                            </div>

                            <div className="w-px h-10 bg-white/5 self-center" />

                            {/* Booth Filter */}
                            <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Booth</label>
                                <select
                                    disabled={!filters.lbId}
                                    className="bg-transparent text-white text-sm font-black uppercase tracking-widest outline-none cursor-pointer hover:text-indigo-400 transition-colors disabled:opacity-20 px-2"
                                    value={filters.boothId}
                                    onChange={(e) => setFilters({ ...filters, boothId: e.target.value })}
                                >
                                    <option value="" className="bg-slate-900">All Booths</option>
                                    {activeLB?.booths.map(b => <option key={b.id} value={b.id} className="bg-slate-900">#{b.number}</option>)}
                                </select>
                            </div>
                        </div>

                        {/* Hard Sync Button */}
                        <button
                            onClick={() => { setStats(null); loadTacticalData(); }}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white p-4 rounded-2xl shadow-lg transition-all active:scale-95 flex flex-col items-center justify-center gap-1 min-w-[100px]"
                        >
                            <span className="text-xl">🔄</span>
                            <span className="text-[9px] font-black uppercase tracking-widest">Hard Sync</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* 🛡️ TACTICAL SUMMARY STRIP */}
            <div className="grid grid-cols-4 gap-6">
                {[
                    { label: 'Total Digitized', val: stats?.summary?.digitized || 0, change: stats?.daily_change?.digitized || 0, unit: 'Daily Progress' },
                    { label: `Total Confirmed ${perspective}`, val: stats?.summary?.supporters || 0, change: stats?.daily_change?.supporters || 0, unit: `New ${perspective} Today` },
                    { label: `${perspective} Weekly Gain`, val: (stats?.weekly_change?.supporters || 0).toLocaleString(), change: null, unit: 'Confirmed Last 7 Days' },
                    { label: 'Winning Chance', val: `${Math.round(stats?.summary?.win_prob || 0)}%`, change: null, unit: `Based on ${perspective} data` }
                ].map((card, i) => (
                    <div key={i} className="lux-card p-8 bg-slate-900/40 border-white/5 flex flex-col justify-between">
                        <div>
                            <h5 className="font-bold uppercase tracking-widest text-xs text-slate-400 mb-2">{card.label}</h5>
                            <div className="flex items-baseline gap-4">
                                <p className="text-4xl font-black tracking-tighter text-white">{(card.val).toLocaleString()}</p>
                                {card.change !== null && (
                                    <span className={`text-xs font-black ${card.change >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                        {card.change >= 0 ? '↑' : '↓'} {Math.abs(card.change)}
                                    </span>
                                )}
                            </div>
                        </div>
                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-4">📡 {card.unit}</p>
                    </div>
                ))}
            </div>

            {/* 🎯 TACTICAL INSIGHTS: LEADERS & RISKS */}
            <div className="grid grid-cols-4 gap-6">
                {[
                    { title: 'Top 5 - Winning Priority', icon: '🏆', data: stats?.performance?.top_win, valKey: 'win_prob', unit: '% Win', color: 'text-emerald-400' },
                    { title: 'Bottom 5 - Winning Priority', icon: '⚠️', data: stats?.performance?.bottom_win, valKey: 'win_prob', unit: '% Win', color: 'text-rose-400' },
                    { title: 'Top 5 - No of Neutrals', icon: '⚖️', data: stats?.performance?.top_neutrals, valKey: 'neutrals', unit: ' Neutrals', color: 'text-amber-400' },
                    { title: 'Bottom 5 - No of Neutrals', icon: '🔒', data: stats?.performance?.bottom_neutrals, valKey: 'neutrals', unit: ' Neutrals', color: 'text-indigo-400' }
                ].map((insight, idx) => (
                    <div key={idx} className="lux-card px-3 py-6 bg-slate-900/40 border-white/5 flex flex-col h-full relative hover:z-[200] z-10 transition-all duration-300">
                        <div className="flex items-center gap-3 mb-6 px-3">
                            <span className="text-xl">{insight.icon}</span>
                            <h4 className="font-black uppercase tracking-widest text-[10px] text-slate-300">{insight.title}</h4>
                        </div>
                        <div className="flex-1 space-y-1">
                            {insight.data?.map((booth, i) => (
                                <div key={i} className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-all group relative">

                                    {/* Massive White Tooltip (Unified Design) */}
                                    <div className={`absolute z-[250] ${i < 3 ? 'top-[calc(100%+10px)]' : 'bottom-[calc(100%+10px)]'} ${idx === 0 ? 'left-0' : idx === 3 ? 'right-0' : 'left-1/2 -translate-x-1/2'} w-[300px] bg-white p-6 rounded-3xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-300 shadow-[0_30px_60px_rgba(0,0,0,0.6)] flex flex-col gap-4 border-4 border-indigo-100 ${i < 3 ? '-translate-y-2 group-hover:translate-y-0' : 'translate-y-2 group-hover:translate-y-0'}`}>
                                        <div className="border-b border-slate-200 pb-3">
                                            <div className="flex justify-between items-start gap-4">
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-black uppercase tracking-widest text-slate-500 mb-1">Booth {booth.number}</p>
                                                    <p className="text-sm font-black text-slate-900 leading-snug mb-2 break-words text-left">{booth.ps_name}</p>
                                                </div>
                                                <div className="text-right shrink-0 bg-slate-50 p-2 rounded-xl border border-slate-100 min-w-[70px]">
                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Total</p>
                                                    <p className="text-xl font-black text-slate-900 leading-none">{(booth.total || 0).toLocaleString()}</p>
                                                </div>
                                            </div>

                                            {/* 👤 Booth Leadership Section */}
                                            <div className="mt-3 pt-3 border-t border-slate-100">
                                                <p className="text-[8px] font-black uppercase tracking-[0.2em] text-indigo-500 mb-1.5 italic text-left">Field Leadership</p>
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-lg">👤</span>
                                                        <span className="text-xs font-black text-slate-800 uppercase tracking-tight">{booth.head_name || booth.h_name || 'Unassigned'}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
                                                        <span className="text-[12px]">📞</span>
                                                        <span className="text-[13px] font-mono font-black text-slate-700">{booth.head_phone || booth.h_phone || 'N/A'}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                                            <div className="flex justify-between items-center text-sm font-black uppercase tracking-widest"><span className="text-blue-600">UDF:</span> <span className="text-slate-900 text-xl">{booth.udf}</span></div>
                                            <div className="flex justify-between items-center text-sm font-black uppercase tracking-widest"><span className="text-rose-600">LDF:</span> <span className="text-slate-900 text-xl">{booth.ldf}</span></div>
                                            <div className="flex justify-between items-center text-sm font-black uppercase tracking-widest"><span className="text-amber-500">NDA:</span> <span className="text-slate-900 text-xl">{booth.nda}</span></div>
                                            <div className="flex justify-between items-center text-sm font-black uppercase tracking-widest"><span className="text-slate-400">NEU:</span> <span className="text-slate-900 text-xl">{booth.neutral}</span></div>
                                        </div>

                                        <div className="border-t border-slate-200 pt-4 flex justify-between items-center bg-slate-50 -mx-6 -mb-6 p-5 rounded-b-[1.25rem]">
                                            <span className="text-xs font-black uppercase tracking-widest text-indigo-600">{perspective} Win Prob:</span>
                                            <span className={`text-2xl font-black ${booth.win_prob > 50 ? 'text-emerald-500' : booth.win_prob > 35 ? 'text-amber-500' : 'text-rose-500'}`}>{Math.round(booth.win_prob)}%</span>
                                        </div>
                                        {/* Tooltip Arrow */}
                                        <div className={`absolute ${i < 3 ? '-top-3' : '-bottom-3'} ${idx === 0 ? 'left-8' : idx === 3 ? 'right-8' : 'left-1/2 -translate-x-1/2'} w-6 h-6 bg-white border-indigo-100 rotate-45 border-4 ${i < 3 ? 'border-b-0 border-r-0' : 'border-t-0 border-l-0'}`} />
                                    </div>

                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black text-white group-hover:text-indigo-400">Booth {booth.number}</span>
                                        <span className="text-[8px] font-bold text-slate-300 uppercase tracking-tighter truncate w-32">{booth.ps_name}</span>
                                    </div>
                                    <div className="text-right">
                                        <span className={`text-sm font-black tracking-tighter ${insight.color}`}>
                                            {booth[insight.valKey].toLocaleString()}{insight.unit}
                                        </span>
                                    </div>
                                </div>
                            ))}
                            {(!insight.data || insight.data.length === 0) && (
                                <div className="h-full flex flex-col items-center justify-center opacity-30 py-10 gap-2">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-white">No Data for this Area</p>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* 📊 MOMENTUM TIMELINE */}
            <div className="grid grid-cols-12 gap-8">
                <div className="col-span-12 lux-card p-10 bg-slate-900/40 border-white/5">
                    <div className="flex justify-between items-center mb-10">
                        <div>
                            <h3 className={`font-black uppercase tracking-widest text-sm ${activeBrand.text} border-l-4 border-current pl-4`}>14-Day Progress Chart</h3>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-5 mt-1">Comparison of new voters digitized and confirmed supporters</p>
                        </div>
                        <div className="flex gap-4">
                            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-indigo-500 shadow-[0_0_10px_#6366f1]" /> <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Added Digitally</span></div>
                            <div className="flex items-center gap-2"><div className={`w-3 h-3 rounded-full bg-[${activeBrand.color}] ${activeBrand.shadow}`} style={{ backgroundColor: activeBrand.color }} /> <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Confirmed {perspective}</span></div>
                        </div>
                    </div>

                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={stats?.history || []}>
                                <defs>
                                    <linearGradient id="colorDig" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} /><stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorPersp" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={activeBrand.color} stopOpacity={0.3} /><stop offset="95%" stopColor={activeBrand.color} stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 900, fill: '#94a3b8' }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 900, fill: '#94a3b8' }} />
                                <Tooltip
                                    contentStyle={{ background: '#020617', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '1rem' }}
                                    itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                                />
                                <Area type="monotone" dataKey="new_dig" stroke="#6366f1" fillOpacity={1} fill="url(#colorDig)" strokeWidth={3} name="Newly Digitized" />
                                <Area type="monotone" dataKey="new_supporters" stroke={activeBrand.color} fillOpacity={1} fill="url(#colorPersp)" strokeWidth={3} name={`Newly Confirmed ${perspective}`} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* 📋 UNIT-BY-UNIT TRACKING GRID */}
            <div className="lux-card p-10 bg-slate-900/40 border-white/5">
                <div className="flex justify-between items-center mb-8">
                    <h3 className={`font-black uppercase tracking-widest text-sm ${activeBrand.text} border-l-4 border-current pl-4`}>
                        {filters.lbId || filters.boothId ? 'Booth-Wise Progress Report' : 'Panchayat-Wise Progress Report'}
                    </h3>
                    <div className="flex items-center gap-3">
                        <span className="text-xl">🔍</span>
                        <input
                            type="text"
                            placeholder="Find specific booth or area..."
                            className="bg-slate-900 border border-white/10 rounded-xl px-5 py-3 text-sm font-bold text-white outline-none focus:border-indigo-500 min-w-[300px]"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {(!searchTerm && !filters.lbId && !filters.boothId && (stats?.breakdown || []).length > 10) ? (
                    <div className="text-center py-20 border-t border-white/5">
                        <div className="text-4xl mb-4 opacity-50">📂</div>
                        <p className="text-sm font-bold text-slate-400 max-w-md mx-auto">
                            The full list has been hidden to keep your dashboard clean. Please use the top filters or the search bar above to view specific areas.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-2">
                        {/* Header */}
                        <div className="grid grid-cols-7 px-8 py-4 text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] border-b border-white/5">
                            <div className="col-span-2">Strategic Unit</div>
                            <div className="text-right">Total Voters</div>
                            <div className="text-right">Digitization</div>
                            <div className="text-right">Confirmed {perspective}</div>
                            <div className="text-right">Growth Today</div>
                            <div className="text-right">Win Share</div>
                        </div>

                        {/* Data Rows */}
                        {(stats?.breakdown || [])
                            .filter(item => !searchTerm || item.name.toLowerCase().includes(searchTerm.toLowerCase()) || item.sub.toLowerCase().includes(searchTerm.toLowerCase()))
                            .map((item, i) => (
                                <div key={i} className="grid grid-cols-7 px-8 py-6 bg-white/2 hover:bg-white/5 rounded-2xl border border-transparent hover:border-white/5 transition-all group items-center">
                                    <div className="col-span-2">
                                        <p className="text-sm font-black text-white group-hover:text-indigo-400 transition-colors">{item.name}</p>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 opacity-80">{item.sub}</p>
                                    </div>
                                    <div className="text-right font-black text-slate-200 text-sm">{item.total_voters?.toLocaleString()}</div>
                                    <div className="text-right px-4">
                                        <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                                            <div className="h-full bg-indigo-500 shadow-[0_0_10px_#6366f1]" style={{ width: `${item.coverage}%` }} />
                                        </div>
                                        <p className="text-[9px] font-bold text-slate-400 mt-2 tracking-widest truncate">{item.digitized?.toLocaleString()} ({item.coverage}%)</p>
                                    </div>
                                    <div className={`text-right font-black ${activeBrand.text} text-sm`}>{(item.perspective_total || 0).toLocaleString()}</div>
                                    <div className="text-right flex flex-col items-end">
                                        <div className="text-xs font-black text-emerald-500">+{item.daily_dig} Added</div>
                                        <div className="text-[10px] font-bold text-amber-500">+{item.daily_perspective} Confirmed</div>
                                    </div>
                                    <div className="text-right">
                                        <span className={`px-4 py-2 rounded-full text-xs font-black ${item.win_prob > 55 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                                            {Math.round(item.win_prob)}%
                                        </span>
                                    </div>
                                </div>
                            ))}
                    </div>
                )}
            </div>

            <div className="text-center pb-20 opacity-40">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Intel Hub • Secure Dashboard</p>
            </div>
        </div >
    );
};

export default WarRoom;
