import React, { useState } from 'react';
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

    if (!dashboardStats) return (
        <div className="min-h-screen lux-mesh-bg flex items-center justify-center">
            <div className="flex flex-col items-center animate-pulse">
                <div className="w-20 h-20 bg-indigo-500 rounded-full blur-2xl opacity-50 mb-4" />
                <p className="font-black uppercase tracking-[0.4em] text-xs text-indigo-400">Initializing Intelligence Core...</p>
            </div>
        </div>
    );

    const { total, male, female, sentiment, outreach, age_dist, probability, location } = dashboardStats;

    // --- WAR ROOM MATH ---
    // Decisive Set: Local + Confirmed
    const decisiveTotal = dashboardStats.decisive_stats?.total || 0;
    const selectedPartyDecisive = dashboardStats.decisive_stats?.[perspective] || 0;
    const winProbability = decisiveTotal > 0 ? Math.round((selectedPartyDecisive / decisiveTotal) * 100) : 0;
    const marginToVictory = Math.max(0, 51 - winProbability);

    // Voter Leakage: Total Supporters - Decisive Supporters
    const partyOverall = dashboardStats.sentiment?.[perspective] || 0;
    const leakage = partyOverall - selectedPartyDecisive;
    const leakagePercent = partyOverall > 0 ? Math.round((leakage / partyOverall) * 100) : 0;

    // BRANDING FOR WAR ROOM MODULE
    const branding = {
        UDF: { color: '#6366f1', text: 'text-indigo-400', gradient: 'from-indigo-600/20 to-indigo-900/10' },
        LDF: { color: '#f43f5e', text: 'text-rose-400', gradient: 'from-rose-600/20 to-rose-900/10' },
        NDA: { color: '#f59e0b', text: 'text-amber-400', gradient: 'from-amber-600/20 to-amber-900/10' }
    };
    const activeBrand = branding[perspective];

    // --- WAR ROOM VIEW ---
    if (viewMode === 'WAR_ROOM') {
        return (
            <div className="min-h-screen lux-mesh-bg p-12 pl-96 space-y-12 lux-animate-in pb-32">
                <header className="flex justify-between items-center border-b border-white/5 pb-12 relative z-20">
                    <div>
                        <button onClick={() => setViewMode('CLASSIC')} className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white mb-4 flex items-center gap-2">
                            ← Back to Dashboard
                        </button>
                        <h1 className="text-7xl font-black tracking-tighter uppercase leading-none">
                            War <span className="lux-text-gradient">Room</span>
                        </h1>
                    </div>
                </header>

                <div className={`mt-8 border-t border-white/5 pt-12 ${activeBrand.gradient} rounded-[3rem] p-10 transition-all duration-1000`}>
                    <div className="flex justify-between items-start mb-12">
                        <div>
                            <h2 className="text-4xl font-black uppercase tracking-tighter leading-tight flex items-center gap-4">
                                Tactical Operations Center
                            </h2>
                            <p className={`font-black uppercase tracking-[0.3em] text-[10px] ${activeBrand.text} mt-4`}>{perspective} Mode Active</p>
                        </div>

                        {/* Perspective Toggle */}
                        <div className="flex bg-black/40 backdrop-blur-md p-1 rounded-xl border border-white/10">
                            {Object.keys(branding).map(p => (
                                <button
                                    key={p}
                                    onClick={() => setPerspective(p)}
                                    className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all duration-500 ${perspective === p ? 'bg-white text-black shadow-lg' : 'text-slate-400 hover:text-white'}`}
                                >
                                    {p}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-12 gap-8">
                        {/* 1. Victory Probability Ring */}
                        <div className="col-span-3 flex flex-col justify-center items-center bg-black/20 rounded-3xl p-8 border border-white/5 group hover:border-white/10 transition-all">
                            <div className="relative w-48 h-48 flex items-center justify-center">
                                <svg className="w-full h-full transform -rotate-90">
                                    <circle className="text-white/5" strokeWidth="12" stroke="currentColor" fill="none" r="70" cx="96" cy="96" />
                                    <circle
                                        className="transition-all duration-1000 ease-out"
                                        strokeWidth="12"
                                        strokeDasharray={2 * Math.PI * 70}
                                        strokeDashoffset={2 * Math.PI * 70 * (1 - winProbability / 100)}
                                        strokeLinecap="round"
                                        stroke={activeBrand.color}
                                        fill="none"
                                        r="70" cx="96" cy="96"
                                        style={{ filter: `drop-shadow(0 0 15px ${activeBrand.color}60)` }}
                                    />
                                </svg>
                                <div className="absolute text-center">
                                    <span className="text-5xl font-black tracking-tighter block">{winProbability}%</span>
                                    <span className={`text-[8px] font-black uppercase tracking-widest ${activeBrand.text}`}>Win Prob.</span>
                                </div>
                            </div>
                            <div className="w-full mt-6 text-center">
                                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Decisive Volume: <span className="text-white">{selectedPartyDecisive}</span></p>
                            </div>
                        </div>

                        {/* 2. Decisive Segment (Neutrals) */}
                        <div className="col-span-5 bg-black/20 rounded-3xl p-8 border border-white/5 flex flex-col justify-between">
                            <div>
                                <h3 className="font-black uppercase tracking-[0.3em] text-[10px] text-emerald-500 mb-4">Target: Decisive Neutrals</h3>
                                <div className="flex items-baseline gap-4">
                                    <span className="text-5xl font-black text-emerald-500">{dashboardStats.decisive_stats?.NEUTRAL || 0}</span>
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest max-w-[120px]">Voters are Local & Confirmed</span>
                                </div>
                                <p className="text-[10px] font-medium text-slate-400 mt-4 leading-relaxed">
                                    Need {marginToVictory}% more for majority. Converting 5% of this segment bridges the gap.
                                </p>
                            </div>
                            <div className="flex gap-4 mt-6">
                                <button onClick={() => { setListFilters({ ...listFilters, leaning: 'NEUTRAL', location: 'LOCAL' }); setView('voters'); }} className="bg-emerald-500 hover:bg-emerald-600 text-black px-6 py-3 rounded-xl font-black text-[9px] uppercase tracking-widest w-full transition-all">Extract List</button>
                            </div>
                        </div>

                        {/* 3. Logistical Status (Mini) */}
                        <div className="col-span-4 bg-black/20 rounded-3xl p-8 border border-white/5 space-y-4">
                            <h4 className="text-[9px] font-black uppercase text-slate-500 tracking-widest border-b border-white/5 pb-2">Logistical Status</h4>
                            {['LOCAL', 'ABROAD', 'STATE'].map(loc => (
                                <div key={loc} className="flex justify-between items-center bg-white/5 p-2 px-3 rounded-lg">
                                    <span className={`text-[9px] font-black uppercase ${loc === 'LOCAL' ? 'text-emerald-400' : 'text-slate-400'}`}>{loc}</span>
                                    <span className="text-xs font-bold text-white">{dashboardStats.location?.[loc] || 0}</span>
                                </div>
                            ))}
                            <h4 className="text-[9px] font-black uppercase text-slate-500 tracking-widest border-b border-white/5 pb-2 pt-2">Voting Pulse</h4>
                            {['CONFIRMED', 'LIKELY'].map(prob => (
                                <div key={prob} className="flex justify-between items-center bg-white/5 p-2 px-3 rounded-lg">
                                    <span className={`text-[9px] font-black uppercase ${prob === 'CONFIRMED' ? 'text-emerald-400' : 'text-slate-400'}`}>{prob}</span>
                                    <span className="text-xs font-bold text-white">{dashboardStats.probability?.[prob] || 0}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // --- CLASSIC DASHBOARD VIEW ---
    return (
        <div className="min-h-screen lux-mesh-bg p-12 pl-96 space-y-12 lux-animate-in pb-32">

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
};

export default Dashboard;
