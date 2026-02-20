import React, { useState } from 'react';
import api from '../api';
import {
    PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
    BarChart, Bar, XAxis, YAxis, CartesianGrid, LabelList
} from 'recharts';

const Dashboard = ({
    dashboardStats,
    dashFilters,
    setDashFilters,
    allLocations,
    listFilters,
    setListFilters,
    setView
}) => {
    const [viewMode, setViewMode] = useState('CLASSIC'); // CLASSIC or WAR_ROOM
    const [perspective, setPerspective] = useState('UDF'); // Default Perspective

    // --- WAR ROOM LOGIC ---
    const [warStats, setWarStats] = useState({
        total_pool: 0,
        supporter_count: 0,
        probability: 0
    });

    const [warFilters, setWarFilters] = useState({
        ageGroup: 'ALL',
        gender: 'ALL',
        location: 'ALL', // Default: Global View
        probability: 'ALL', // Default: Global View
        constituency: '',
        lb: '',
        booth: ''
    });

    // Fetch REAL-TIME Accurate Stats from Backend
    React.useEffect(() => {
        if (viewMode === 'WAR_ROOM') {
            const fetchWarStats = async () => {
                try {
                    const data = await api.getWarRoomStats({
                        constituency: warFilters.constituency,
                        lb: warFilters.lb,
                        booth: warFilters.booth,
                        gender: warFilters.gender,
                        age_group: warFilters.ageGroup,
                        location: warFilters.location,
                        probability: warFilters.probability,
                        perspective: perspective
                    });
                    setWarStats(data);
                } catch (e) {
                    console.error("Failed to fetch War Room stats", e);
                }
            };
            fetchWarStats();
        }
    }, [warFilters, perspective, viewMode]);

    if (!dashboardStats) return (
        <div className="min-h-screen lux-mesh-bg flex items-center justify-center">
            <div className="flex flex-col items-center animate-pulse">
                <div className="w-20 h-20 bg-indigo-500 rounded-full blur-2xl opacity-50 mb-4" />
                <p className="font-black uppercase tracking-[0.4em] text-xs text-indigo-400">Initializing Intelligence Core...</p>
            </div>
        </div>
    );

    const { total = 0, sentiment, age_dist } = dashboardStats || {};

    // BRANDING FOR WAR ROOM MODULE
    const branding = {
        UDF: { color: '#6366f1', text: 'text-indigo-400', gradient: 'from-indigo-600/20 to-indigo-900/10' },
        LDF: { color: '#f43f5e', text: 'text-rose-400', gradient: 'from-rose-600/20 to-rose-900/10' },
        NDA: { color: '#f59e0b', text: 'text-amber-400', gradient: 'from-amber-600/20 to-amber-900/10' }
    };
    const activeBrand = branding[perspective];

    // Helper for Toggle Logic (Clicking again deselects to 'ALL')
    const toggleFilter = (key, value) => {
        setWarFilters(prev => ({
            ...prev,
            [key]: prev[key] === value ? 'ALL' : value
        }));
    };

    // Helper for Geo Logic (Updates BOTH War & Global Filters to trigger data refresh)
    const handleWarGeoChange = (key, value) => {
        const updates = {
            [key]: value,
            location: 'ALL',
            probability: 'ALL',
            gender: 'ALL',
            ageGroup: 'ALL'
        };
        if (key === 'constituency') { updates.lb = ''; updates.booth = ''; }
        if (key === 'lb') { updates.booth = ''; }

        setWarFilters(prev => ({ ...prev, ...updates }));
        setDashFilters(prev => ({ ...prev, ...updates }));
    };

    // Calculate Gap/Surplus based on REAL data
    const majorityLine = Math.floor(warStats.total_pool / 2) + 1;
    const gap = majorityLine - warStats.supporter_count;
    const warGap = Math.max(0, gap);
    const warSurplus = Math.max(0, warStats.supporter_count - majorityLine);

    // Active Filters List for Display
    const activeFilters = [
        warFilters.location !== 'ALL' && warFilters.location,
        warFilters.probability !== 'ALL' && warFilters.probability.replace(/_/g, ' '),
        warFilters.gender !== 'ALL' && warFilters.gender,
        warFilters.ageGroup !== 'ALL' && warFilters.ageGroup,
        warFilters.constituency && allLocations.find(c => String(c.id) === String(warFilters.constituency))?.name,
        warFilters.lb && allLocations.find(c => String(c.id) === String(warFilters.constituency))?.local_bodies.find(l => String(l.id) === String(warFilters.lb))?.name,
        warFilters.booth && `Booth ${allLocations.find(c => String(c.id) === String(warFilters.constituency))?.local_bodies.find(l => String(l.id) === String(warFilters.lb))?.booths.find(b => String(b.id) === String(warFilters.booth))?.number}`
    ].filter(Boolean);


    if (viewMode === 'WAR_ROOM') {
        return (
            <div className="min-h-screen lux-mesh-bg p-8 pl-96 flex gap-6 lux-animate-in">

                {/* LEFT: TACTICAL MAIN DISPLAY */}
                <div className="flex-grow space-y-6">
                    <header className="flex justify-between items-center border-b border-white/5 pb-6">
                        <div>
                            <button onClick={() => setViewMode('CLASSIC')} className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white mb-2 flex items-center gap-2 transition-colors">
                                ← AI Dashboard
                            </button>
                            <h1 className="text-6xl font-black tracking-tighter uppercase leading-none">
                                War <span className="lux-text-gradient">Room</span>
                            </h1>
                        </div>
                        {/* Perspective Toggle */}
                        <div className="bg-slate-900/80 backdrop-blur-md p-1.5 rounded-2xl border border-white/10 flex gap-1">
                            {Object.keys(branding).map(p => (
                                <button
                                    key={p}
                                    onClick={() => setPerspective(p)}
                                    className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${perspective === p ? 'bg-white text-black shadow-lg scale-105' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                                >
                                    {p}
                                </button>
                            ))}
                        </div>
                    </header>

                    {/* ACTIVE FILTERS INDICATOR */}
                    {activeFilters.length > 0 && (
                        <div className="flex gap-2 flex-wrap animate-in fade-in slide-in-from-top-4 duration-500">
                            <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest py-1.5 self-center mr-2">Viewing Scope:</span>
                            {activeFilters.map((f, i) => (
                                <span key={i} className="px-3 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-[10px] font-black uppercase tracking-wider flex items-center gap-2">
                                    {f}
                                </span>
                            ))}
                        </div>
                    )}

                    {activeFilters.length === 0 && (
                        <div className="flex gap-2 flex-wrap">
                            <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest py-1.5 self-center mr-2">Viewing Scope:</span> <span className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-400 text-[10px] font-black uppercase tracking-wider">GLOBAL VIEW (ALL VOTERS)</span>
                        </div>
                    )}

                    {/* MAIN HUD */}
                    <div className={`grid grid-cols-12 gap-6 ${activeBrand.gradient} p-8 rounded-[3rem] border border-white/5 shadow-2xl transition-all duration-1000`}>

                        {/* Victory Ring */}
                        <div className="col-span-4 flex flex-col items-center justify-center bg-black/20 rounded-3xl p-6 border border-white/5 relative overflow-hidden group">
                            <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="relative w-56 h-56 flex items-center justify-center">
                                <svg className="w-full h-full transform -rotate-90">
                                    <circle className="text-black/40" strokeWidth="16" stroke="currentColor" fill="none" r="80" cx="112" cy="112" />
                                    <circle
                                        className="transition-all duration-1000 ease-out"
                                        strokeWidth="16"
                                        strokeDasharray={2 * Math.PI * 80}
                                        strokeDashoffset={2 * Math.PI * 80 * (1 - warStats.probability / 100)}
                                        strokeLinecap="round"
                                        stroke={activeBrand.color}
                                        fill="none"
                                        r="80" cx="112" cy="112"
                                        style={{ filter: `drop-shadow(0 0 20px ${activeBrand.color}80)` }}
                                    />
                                </svg>
                                <div className="absolute text-center">
                                    <span className="text-6xl font-black tracking-tighter block text-white drop-shadow-md">{warStats.probability}%</span>
                                    <span className={`text-[9px] font-black uppercase tracking-[0.2em] ${activeBrand.text}`}>Probability</span>
                                </div>
                            </div>
                        </div>

                        {/* Strategy Info */}
                        <div className="col-span-8 bg-black/20 rounded-3xl p-8 border border-white/5 flex flex-col justify-between">
                            <div>
                                <h3 className="font-black uppercase tracking-[0.3em] text-[10px] text-slate-400 mb-2">Tactical Assessment</h3>
                                <h2 className="text-3xl font-black uppercase text-white leading-tight mb-4">
                                    {perspective} Secured Vote Bank
                                </h2>
                                <div className="flex gap-8 mt-6">
                                    <div>
                                        <span className="block text-4xl font-black text-white">{warStats.supporter_count.toLocaleString()}</span>
                                        <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Solid Votes</span>
                                    </div>
                                    <div>
                                        <span className={`block text-4xl font-black ${warGap > 0 ? 'text-white' : 'text-emerald-400'}`}>
                                            {warGap > 0 ? warGap.toLocaleString() : `+${warSurplus.toLocaleString()}`}
                                        </span>
                                        <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest">
                                            {warGap > 0 ? 'To Majority' : 'Surplus Lead'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* RIGHT: TACTICAL FILTER SIDEBAR */}
                <div className="w-80 bg-slate-900/50 lux-glass border-l border-white/5 p-5 flex flex-col gap-5 h-[calc(100vh-2rem)] sticky top-4 rounded-3xl overflow-y-auto custom-scrollbar shadow-2xl">

                    {/* 1. Global Geography Filters (LINKED) */}
                    <div>
                        <h3 className="font-black uppercase tracking-[0.2em] text-[10px] text-slate-400 mb-4 flex items-center gap-2">
                            🗺️ Battleground Scope
                        </h3>
                        <div className="space-y-3">
                            {[
                                { label: 'Constituency', key: 'constituency', options: allLocations },
                                { label: 'Local Body', key: 'lb', options: warFilters.constituency ? allLocations.find(c => String(c.id) === String(warFilters.constituency))?.local_bodies : [] },
                                { label: 'Booth', key: 'booth', options: warFilters.lb ? allLocations.find(c => String(c.id) === String(warFilters.constituency))?.local_bodies.find(l => String(l.id) === String(warFilters.lb))?.booths : [] }
                            ].map(f => (
                                <div key={f.key}>
                                    <label className="text-[8px] font-black uppercase text-slate-500 tracking-widest ml-1 mb-1 block">{f.label}</label>
                                    <select
                                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-[10px] font-bold text-white outline-none focus:border-indigo-500/50"
                                        value={warFilters[f.key]}
                                        onChange={(e) => handleWarGeoChange(f.key, e.target.value)}
                                    >
                                        <option value="">Global View</option>
                                        {f.options?.map(o => <option key={o.id} value={o.id}>{o.name || `Booth ${o.number}`}</option>)}
                                    </select>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="border-t border-white/5 my-1"></div>

                    {/* 2. Variable Controls */}
                    <div>
                        <h3 className="font-black uppercase tracking-[0.2em] text-[10px] text-slate-400 mb-4 flex items-center gap-2">
                            ⚡ Live Variables
                        </h3>

                        {/* Filter: Location */}
                        <div className="space-y-2 mb-6">
                            <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Voter Location</label>
                            <div className="grid grid-cols-2 gap-2">
                                {['LOCAL', 'ABROAD', 'STATE', 'DISTRICT'].map(l => (
                                    <button
                                        key={l}
                                        onClick={() => toggleFilter('location', l)}
                                        className={`py-2 rounded-lg text-[9px] font-black uppercase tracking-wider border ${warFilters.location === l ? `bg-${activeBrand.color} border-${activeBrand.color} text-white bg-opacity-20 border-opacity-50` : 'border-white/10 text-slate-400 hover:bg-white/5'}`}
                                    >
                                        {l}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Filter: Probability */}
                        <div className="space-y-2 mb-6">
                            <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Voting Probability</label>
                            <div className="grid grid-cols-2 gap-2">
                                {['CONFIRMED', 'LIKELY', 'UNLIKELY', 'OUT_OF_STATION'].map(p => (
                                    <button
                                        key={p}
                                        onClick={() => toggleFilter('probability', p)}
                                        className={`py-2 px-3 text-left rounded-lg text-[8px] font-black uppercase tracking-wider border flex justify-between items-center group ${warFilters.probability === p ? 'bg-emerald-500/20 border-emerald-500/50 text-white' : 'border-white/10 text-slate-400 hover:bg-white/5'}`}
                                    >
                                        <span>{p.replace(/_/g, ' ')}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Filter: Demographics (Visual Only for now) */}
                        <div className="space-y-3 mb-6">
                            <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Demographics</label>
                            <div className="grid grid-cols-2 gap-2">
                                <select
                                    value={warFilters.ageGroup}
                                    onChange={(e) => setWarFilters({ ...warFilters, ageGroup: e.target.value })}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-[10px] font-bold text-white outline-none focus:border-indigo-500/50"
                                >
                                    <option value="ALL">All Ages</option>
                                    <option value="18-25">18-25</option>
                                    <option value="26-40">26-40</option>
                                    <option value="41-60">41-60</option>
                                    <option value="60+">60+</option>
                                </select>
                                <select
                                    value={warFilters.gender}
                                    onChange={(e) => setWarFilters({ ...warFilters, gender: e.target.value })}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-[10px] font-bold text-white outline-none focus:border-indigo-500/50"
                                >
                                    <option value="ALL">All Genders</option>
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="mt-auto pt-4 border-t border-white/5">
                    </div>
                </div>
            </div>
        );
    };



    // --- CLASSIC DASHBOARD VIEW ---
    return (
        <div className="min-h-screen lux-mesh-bg p-12 pl-96 space-y-12 lux-animate-in pb-32 relative z-0">

            {/* --- CLASSIC VIEW: FILTER HEADER --- */}
            <header className="flex justify-between items-center border-b border-white/5 pb-12 relative z-20">
                <div>
                    <h3 className="font-black uppercase tracking-[0.3em] text-[10px] text-emerald-500 mb-2 italic">AI Driven Campaign</h3>
                    <h1 className="text-6xl font-black tracking-tighter uppercase lux-text-gradient">AI Dashboard</h1>
                </div>

                <div className="flex flex-col gap-4 items-end">
                    <button onClick={() => setViewMode('WAR_ROOM')} className="bg-white text-black px-6 py-3 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-slate-200 transition-all shadow-[0_0_20px_rgba(255,255,255,0.3)] animate-pulse">
                        Go to War Room →
                    </button>

                    <div className="flex gap-4">
                        {[
                            { label: 'Constituency', key: 'constituency', options: allLocations },
                            { label: 'Local Body', key: 'lb', options: dashFilters.constituency ? allLocations.find(c => String(c.id) === String(dashFilters.constituency))?.local_bodies : [] },
                            { label: 'Booth', key: 'booth', options: dashFilters.lb ? allLocations.find(c => String(c.id) === String(dashFilters.constituency))?.local_bodies.find(l => String(l.id) === String(dashFilters.lb))?.booths : [] }
                        ].map(f => (
                            <div key={f.key} className="flex flex-col gap-1.5">
                                <label className="text-[8px] font-black uppercase text-slate-400 tracking-widest ml-1">{f.label}</label>
                                <select
                                    className="bg-slate-900/50 lux-glass border-white/5 rounded-xl px-5 py-3 text-[10px] font-black text-white hover:border-white/20 transition-all outline-none min-w-[140px]"
                                    value={dashFilters[f.key]}
                                    onChange={(e) => {
                                        const updates = { [f.key]: e.target.value };
                                        if (f.key === 'constituency') { updates.lb = ''; updates.booth = ''; }
                                        if (f.key === 'lb') { updates.booth = ''; }
                                        setDashFilters({ ...dashFilters, ...updates });
                                    }}
                                >
                                    <option value="">Global View</option>
                                    {f.options?.map(o => <option key={o.id} value={o.id} className="bg-slate-900">{o.name || `Booth ${o.number}`}</option>)}
                                </select>
                            </div>
                        ))}
                    </div>
                </div>
            </header>

            {/* --- CLASSIC VIEW: METRICS GRID --- */}
            <div className="grid grid-cols-12 gap-10 relative z-10">

                {/* 1. Total Registered Card */}
                <div className="col-span-4 lux-card p-10 relative overflow-hidden group h-[220px] flex flex-col justify-center">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl -mr-16 -mt-16 group-hover:bg-indigo-500/20 transition-all duration-700" />
                    <div className="text-[3rem] mb-2 z-10">💎</div>
                    <div>
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Total Registered</span>
                        <span className="text-6xl font-black text-white tracking-tighter block leading-none">{(dashboardStats.tagging_progress || total).toLocaleString()}</span>
                    </div>
                </div>

                {/* 2. Male Representation Card */}
                <div className="col-span-4 lux-card p-10 relative overflow-hidden group h-[220px] flex flex-col justify-center">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl -mr-16 -mt-16 group-hover:bg-blue-500/20 transition-all duration-700" />
                    <div className="text-[3rem] text-blue-500/50 mb-2 z-10">🛡️</div>
                    <div>
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Male Representation</span>
                        <span className="text-6xl font-black text-white tracking-tighter block leading-none">{(dashboardStats.gender?.male || 0).toLocaleString()}</span>
                    </div>
                </div>

                {/* 3. Female Representation Card */}
                <div className="col-span-4 lux-card p-10 relative overflow-hidden group h-[220px] flex flex-col justify-center">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 rounded-full blur-2xl -mr-16 -mt-16 group-hover:bg-rose-500/20 transition-all duration-700" />
                    <div className="text-[3rem] text-rose-500/50 mb-2 z-10">✨</div>
                    <div>
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Female Representation</span>
                        <span className="text-6xl font-black text-white tracking-tighter block leading-none">{(dashboardStats.gender?.female || 0).toLocaleString()}</span>
                    </div>
                </div>


                {/* VoteIntel (Sentiment) */}
                <div className="col-span-8 lux-card p-10 relative overflow-hidden group min-h-[300px]">
                    <h3 className="font-black uppercase tracking-[0.3em] text-[10px] text-slate-300 mb-8 border-b border-white/5 pb-6">VoteIntel™</h3>
                    <div className="h-[200px] w-full mt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={[
                                { name: 'UDF', value: sentiment?.UDF || 0, fill: '#6366f1' },
                                { name: 'LDF', value: sentiment?.LDF || 0, fill: '#f43f5e' },
                                { name: 'NDA', value: sentiment?.NDA || 0, fill: '#f59e0b' },
                                { name: 'Neutral', value: sentiment?.NEUTRAL || 0, fill: '#334155' }
                            ]} barSize={60}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900, fill: '#64748b' }} dy={10} />
                                <Tooltip
                                    cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                                    contentStyle={{ background: '#0f172a', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)', fontWeight: 'bold' }}
                                    itemStyle={{ color: '#fff' }}
                                />
                                <Bar dataKey="value" radius={[12, 12, 0, 0]}>
                                    <LabelList dataKey="value" position="top" style={{ fontSize: 10, fontWeight: 900, fill: 'white' }} offset={10} />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Age Composition (Bottom Right Block 1) */}
                <div className="col-span-4 lux-card p-10 h-[300px] flex flex-col justify-between relative overflow-hidden">
                    <h3 className="font-black uppercase tracking-[0.3em] text-[10px] text-slate-300 mb-8 border-b border-white/5 pb-6">Age Composition</h3>
                    <div className="w-full h-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart layout="vertical" data={Object.entries(age_dist).map(([k, v]) => ({ name: k, value: v }))} margin={{ left: 0, right: 30 }}>
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={40} tick={{ fontSize: 9, fontWeight: 900, fill: '#64748b' }} />
                                <Tooltip cursor={{ fill: 'rgba(255,255,255,0.03)' }} contentStyle={{ background: '#0f172a', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)', fontWeight: 'bold' }} itemStyle={{ color: '#fff' }} />
                                <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20}>
                                    <LabelList dataKey="value" position="right" style={{ fontSize: 9, fontWeight: 900, fill: 'white' }} />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Target Neutrals (Optimization Vector) */}
                <div className="col-span-4 lux-card p-10 bg-slate-900/50 border border-emerald-500/20 relative group h-[260px] flex flex-col justify-between">
                    <div>
                        <h3 className="font-black uppercase tracking-[0.3em] text-[10px] text-emerald-500 mb-4 italic">Target Neutrals</h3>
                        <h2 className="text-4xl font-black uppercase tracking-tighter leading-tight">Optimization <br />Vector</h2>
                    </div>
                    <button onClick={() => { setListFilters({ ...listFilters, leaning: 'NEUTRAL' }); setView('voters'); }} className="lux-btn-primary w-fit mt-4">Get the list</button>
                </div>

                {/* Digitization Level */}
                <div className="col-span-4 lux-card p-10 bg-slate-900/50 border border-indigo-500/20 relative group h-[260px] flex flex-col justify-between">
                    <div>
                        <h3 className="font-black uppercase tracking-[0.3em] text-[10px] text-slate-300 border-b border-white/5 pb-4">Digitization level</h3>
                        <div className="mt-6">
                            <div className="flex justify-between items-end">
                                <span className="text-5xl font-black text-white tracking-tighter">{(dashboardStats.tagging_progress || 0).toLocaleString()}</span>
                            </div>
                            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mt-2 block">Records digitized</span>
                        </div>
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full mt-4 overflow-hidden">
                        <div
                            className="bg-indigo-500 h-full rounded-full transition-all duration-1000 ease-out"
                            style={{ width: `${Math.min(100, ((dashboardStats.tagging_progress || 0) / (total || 1)) * 100)}%` }}
                        />
                    </div>
                </div>

                {/* Further Moves (Tactical Actions) */}
                <div className="col-span-4 lux-card p-10 border border-white/5 h-[260px] flex flex-col justify-between">
                    <h3 className="font-black uppercase tracking-[0.3em] text-[10px] text-indigo-400 border-b border-white/5 pb-4 italic">Further Moves</h3>
                    <div>
                        <h4 className="text-2xl font-black uppercase tracking-tighter leading-tight">Digital Advantage <br />System Ready</h4>
                        <div className="flex gap-4 mt-6">
                            <button onClick={() => setView('engine')} className="lux-glass px-6 py-3 rounded-xl font-bold text-[9px] uppercase tracking-widest hover:border-indigo-500 transition-all">Digitize more</button>
                            <button onClick={() => setView('comm')} className="bg-white text-black px-6 py-3 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-indigo-400 transition-all">Reachout to Voters</button>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}



export default Dashboard;

