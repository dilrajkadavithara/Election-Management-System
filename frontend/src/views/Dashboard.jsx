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
    const [perspective, setPerspective] = useState('UDF'); // Default Perspective

    if (!dashboardStats) return (
        <div className="min-h-screen lux-mesh-bg flex items-center justify-center">
            <div className="flex flex-col items-center animate-pulse">
                <div className="w-20 h-20 bg-indigo-500 rounded-full blur-2xl opacity-50 mb-4" />
                <p className="font-black uppercase tracking-[0.4em] text-xs text-indigo-400">Initializing War Room...</p>
            </div>
        </div>
    );

    // Perspective Branding Data
    const branding = {
        UDF: {
            name: 'UDF Perspective',
            color: '#6366f1',
            accent: 'indigo',
            gradient: 'from-indigo-600/20 to-indigo-900/30',
            glow: 'shadow-[0_0_50px_rgba(99,102,241,0.2)]',
            text: 'text-indigo-400'
        },
        LDF: {
            name: 'LDF Perspective',
            color: '#f43f5e',
            accent: 'rose',
            gradient: 'from-rose-600/20 to-rose-900/30',
            glow: 'shadow-[0_0_50px_rgba(244,63,94,0.2)]',
            text: 'text-rose-400'
        },
        NDA: {
            name: 'NDA Perspective',
            color: '#f59e0b',
            accent: 'amber',
            gradient: 'from-amber-600/20 to-amber-900/30',
            glow: 'shadow-[0_0_50px_rgba(245,158,11,0.2)]',
            text: 'text-amber-400'
        }
    };

    const activeBrand = branding[perspective];

    // Win Probability Math (Selected Party Share of Decisive Set)
    const decisiveTotal = dashboardStats.decisive_stats?.total || 0;
    const selectedPartyDecisive = dashboardStats.decisive_stats?.[perspective] || 0;
    const winProbability = decisiveTotal > 0 ? Math.round((selectedPartyDecisive / decisiveTotal) * 100) : 0;
    const marginToVictory = Math.max(0, 51 - winProbability);

    // Voter Leakage Math (Supporters NOT in the Decisive Set)
    const partyOverall = dashboardStats.sentiment?.[perspective] || 0;
    const leakage = partyOverall - selectedPartyDecisive;
    const leakagePercent = partyOverall > 0 ? Math.round((leakage / partyOverall) * 100) : 0;

    return (
        <div className="min-h-screen lux-mesh-bg p-12 pl-96 space-y-12 lux-animate-in">
            {/* Perspective & Global Command Header */}
            <header className="flex justify-between items-center border-b border-white/5 pb-12 relative">
                <div>
                    <h1 className="text-7xl font-black tracking-tighter uppercase leading-none">
                        War <span className="lux-text-gradient">Room</span>
                    </h1>
                    <div className="flex items-center gap-4 mt-6">
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-[0.3em]">Operational Perspective:</span>
                        <div className="flex lux-glass p-1 rounded-2xl border-white/10">
                            {Object.keys(branding).map(p => (
                                <button
                                    key={p}
                                    onClick={() => setPerspective(p)}
                                    className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-500 ${perspective === p ? 'bg-white text-black shadow-lg' : 'text-slate-400 hover:text-white'}`}
                                >
                                    {p}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex flex-col gap-4 items-end">
                    <div className="flex gap-4">
                        {[
                            { label: 'Constituency', key: 'constituency', options: allLocations },
                            { label: 'Local Body', key: 'lb', options: dashFilters.constituency ? allLocations.find(c => String(c.id) === String(dashFilters.constituency))?.local_bodies : [] },
                            { label: 'Booth', key: 'booth', options: dashFilters.lb ? allLocations.find(c => String(c.id) === String(dashFilters.constituency))?.local_bodies.find(l => String(l.id) === String(dashFilters.lb))?.booths : [] }
                        ].map(f => (
                            <div key={f.key} className="flex flex-col gap-1.5">
                                <label className="text-[8px] font-black uppercase text-slate-400 tracking-widest ml-1">{f.label}</label>
                                <select
                                    className="bg-slate-900/50 lux-glass border-white/5 rounded-xl px-5 py-3 text-[10px] font-black text-white hover:border-white/20 transition-all outline-none"
                                    value={dashFilters[f.key]}
                                    onChange={(e) => {
                                        const updates = { [f.key]: e.target.value };
                                        if (f.key === 'constituency') { updates.lb = ''; updates.booth = ''; }
                                        if (f.key === 'lb') { updates.booth = ''; }
                                        setDashFilters({ ...dashFilters, ...updates });
                                    }}
                                >
                                    <option value="">Global</option>
                                    {f.options?.map(o => <option key={o.id} value={o.id} className="bg-slate-900">{o.name || `Booth ${o.number}`}</option>)}
                                </select>
                            </div>
                        ))}
                    </div>
                </div>
            </header>

            {/* Core Neural Visualizer - Victory Probability */}
            <div className="grid grid-cols-12 gap-10">
                <div className={`col-span-5 lux-card ${activeBrand.gradient} flex flex-col items-center justify-center p-16 relative overflow-hidden group transition-all duration-1000 ${activeBrand.glow} border-white/10`}>
                    <div className="absolute top-8 left-8">
                        <h3 className={`font-black uppercase tracking-[0.3em] text-[10px] ${activeBrand.text}`}>Victory Probability</h3>
                        <p className="text-white/40 text-[9px] font-bold mt-1 uppercase">Based on Decisive Local Assets</p>
                    </div>

                    <div className="relative flex items-center justify-center w-72 h-72">
                        {/* Static Target Line (51%) */}
                        <svg className="absolute w-full h-full transform -rotate-90">
                            <circle className="text-white/5" strokeWidth="2" stroke="currentColor" fill="none" r="110" cx="144" cy="144" />
                            <circle className="text-emerald-500/30" strokeWidth="4" strokeDasharray="2 10" strokeLinecap="round" stroke="currentColor" fill="none" r="110" cx="144" cy="144" transform="rotate(183.6 144 144)" />
                        </svg>

                        {/* Active Probability Ring */}
                        <svg className="w-full h-full transform -rotate-90">
                            <circle className="text-white/5" strokeWidth="16" stroke="currentColor" fill="none" r="100" cx="144" cy="144" />
                            <circle
                                className="transition-all duration-1000 ease-out"
                                strokeWidth="16"
                                strokeDasharray={2 * Math.PI * 100}
                                strokeDashoffset={2 * Math.PI * 100 * (1 - winProbability / 100)}
                                strokeLinecap="round"
                                stroke={activeBrand.color}
                                fill="none"
                                r="100" cx="144" cy="144"
                                style={{ filter: `drop-shadow(0 0 20px ${activeBrand.color}80)` }}
                            />
                        </svg>

                        <div className="absolute flex flex-col items-center justify-center">
                            <span className="text-8xl font-black tracking-tighter transition-all duration-500">{winProbability}%</span>
                            <span className={`text-[10px] font-black uppercase tracking-[0.4em] mt-2 ${activeBrand.text} animate-pulse`}>Calculated Path</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-10 w-full mt-12 border-t border-white/5 pt-10">
                        <div className="text-center">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Decisive Volume</p>
                            <p className="text-3xl font-black">{selectedPartyDecisive}</p>
                            <p className="text-[8px] font-bold text-slate-500 uppercase mt-1">Found in Decisive Set</p>
                        </div>
                        <div className="text-center border-l border-white/5">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Gap to 51%</p>
                            <p className={`text-3xl font-black ${winProbability >= 51 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {winProbability >= 51 ? 'Sustain' : `${marginToVictory}%`}
                            </p>
                            <p className="text-[8px] font-bold text-slate-500 uppercase mt-1">Mission Critical</p>
                        </div>
                    </div>
                </div>

                <div className="col-span-7 space-y-10">
                    <div className="grid grid-cols-2 gap-10">
                        <div className="lux-card flex flex-col justify-between p-10 bg-gradient-to-br from-white/5 to-transparent h-[240px]">
                            <div>
                                <h3 className="font-black uppercase tracking-[0.3em] text-[10px] text-slate-400 mb-4 italic">Voter Leakage</h3>
                                <div className="flex items-baseline gap-4">
                                    <span className="text-5xl font-black text-rose-500">{leakagePercent}%</span>
                                    <span className="text-xs font-black text-slate-300 uppercase tracking-widest">Unavailable Capital</span>
                                </div>
                                <p className="text-[10px] font-medium text-slate-400 mt-4 leading-relaxed">
                                    <span className="text-rose-400 font-bold">{leakage} {perspective} supporters</span> are categorized as Abroad, Other State, or Other District. They are not part of your current Win Probability.
                                </p>
                            </div>
                        </div>

                        <div className="lux-card flex flex-col justify-between p-10 bg-gradient-to-br from-white/5 to-transparent h-[240px]">
                            <div>
                                <h3 className="font-black uppercase tracking-[0.3em] text-[10px] text-emerald-500 mb-4 italic">The Decisive Segment</h3>
                                <div className="flex items-baseline gap-4">
                                    <span className="text-5xl font-black text-emerald-500">{dashboardStats.decisive_stats?.NEUTRAL || 0}</span>
                                    <span className="text-xs font-black text-slate-300 uppercase tracking-widest">Active Neutrals</span>
                                </div>
                                <p className="text-[10px] font-medium text-slate-400 mt-4 leading-relaxed">
                                    These voters are <span className="text-emerald-400 font-bold">Local</span> and <span className="text-emerald-400 font-bold">Confirmed</span>. Converting just {Math.ceil(decisiveTotal * 0.05)} of these gains you a 5% instant swing.
                                </p>
                            </div>
                            <button onClick={() => { setListFilters({ ...listFilters, leaning: 'NEUTRAL', location: 'LOCAL' }); setView('voters'); }} className="lux-btn-primary !py-4 !px-6 text-[9px] w-fit mt-4">Extract Targets</button>
                        </div>
                    </div>

                    <div className="lux-card p-10 flex flex-col h-[280px]">
                        <h3 className="font-black uppercase tracking-[0.3em] text-[10px] text-slate-400 mb-8 border-b border-white/5 pb-4">Age Linearity Focus</h3>
                        <div className="flex-1">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={Object.entries(dashboardStats.age_dist).map(([label, count]) => ({ name: label, value: count }))}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 900, fill: '#64748b' }} />
                                    <Tooltip contentStyle={{ background: '#0f172a', borderRadius: '15px', border: '1px solid rgba(255,255,255,0.1)', fontSize: '10px' }} itemStyle={{ color: '#fff' }} />
                                    <Bar dataKey="value" fill={activeBrand.color} radius={[10, 10, 0, 0]} opacity={0.6}>
                                        <LabelList dataKey="value" position="top" style={{ fontSize: 9, fontWeight: 900, fill: 'white' }} />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </div>

            {/* Comprehensive Logistical Status & Focus Grid */}
            <div className="grid grid-cols-4 gap-10 pb-24">
                {/* Location Grid */}
                <div className="lux-card col-span-1 p-8 space-y-6 bg-slate-900/40">
                    <h4 className="text-[9px] font-black uppercase text-slate-500 tracking-widest border-b border-white/5 pb-4">Logistical Status</h4>
                    <div className="space-y-4">
                        {['LOCAL', 'ABROAD', 'STATE', 'DISTRICT'].map(loc => (
                            <div key={loc} className="flex justify-between items-center group">
                                <span className={`text-[10px] font-black uppercase tracking-widest transition-colors ${dashboardStats.location?.[loc] > 0 ? 'text-white' : 'text-slate-600'}`}>{loc === 'STATE' ? 'Another State' : loc === 'DISTRICT' ? 'Another Dist' : loc}</span>
                                <div className="flex items-center gap-3">
                                    <span className="text-sm font-black text-slate-300">{dashboardStats.location?.[loc] || 0}</span>
                                    <div className={`h-1 w-8 rounded-full ${dashboardStats.location?.[loc] > 0 ? (loc === 'LOCAL' ? 'bg-emerald-500' : 'bg-rose-500/50') : 'bg-white/5'}`} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Political Pulse Grid */}
                <div className="lux-card col-span-1 p-8 space-y-6 bg-slate-900/40">
                    <h4 className="text-[9px] font-black uppercase text-slate-500 tracking-widest border-b border-white/5 pb-4">Voting Possibility</h4>
                    <div className="space-y-4">
                        {['CONFIRMED', 'LIKELY', 'UNLIKELY', 'OUT_OF_STATION'].map(prob => (
                            <div key={prob} className="flex justify-between items-center">
                                <span className={`text-[10px] font-black uppercase tracking-widest transition-colors ${dashboardStats.probability?.[prob] > 0 ? 'text-white' : 'text-slate-600'}`}>
                                    {prob.replace('_', ' ')}
                                </span>
                                <span className="text-sm font-black text-slate-300">{dashboardStats.probability?.[prob] || 0}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Perspective Distribution (The Reality Check) */}
                <div className="lux-card col-span-2 p-8 flex flex-col bg-slate-900/40">
                    <h4 className="text-[9px] font-black uppercase text-slate-500 tracking-widest border-b border-white/5 pb-4">Global Intelligence Distribution</h4>
                    <div className="flex-1 flex items-center justify-around mt-6">
                        <div className="w-1/2 h-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={[
                                            { name: 'UDF', value: dashboardStats.sentiment?.UDF || 0 },
                                            { name: 'LDF', value: dashboardStats.sentiment?.LDF || 0 },
                                            { name: 'NDA', value: dashboardStats.sentiment?.NDA || 0 },
                                            { name: 'Neutral', value: dashboardStats.sentiment?.NEUTRAL || 0 }
                                        ].filter(d => d.value > 0)}
                                        innerRadius={45} outerRadius={65} paddingAngle={8} dataKey="value" stroke="none"
                                    >
                                        <Cell fill="#6366f1" />
                                        <Cell fill="#f43f5e" />
                                        <Cell fill="#f59e0b" />
                                        <Cell fill="#334155" />
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="grid grid-cols-2 gap-x-12 gap-y-6 pr-10">
                            {[
                                { key: 'UDF', color: 'bg-indigo-500' },
                                { key: 'LDF', color: 'bg-rose-500' },
                                { key: 'NDA', color: 'bg-amber-500' },
                                { key: 'NEUTRAL', color: 'bg-slate-600' }
                            ].map(p => (
                                <div key={p.key} className="flex flex-col">
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className={`w-1.5 h-1.5 rounded-full ${p.color}`} />
                                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{p.key}</span>
                                    </div>
                                    <p className="text-2xl font-black">{dashboardStats.sentiment?.[p.key] || 0}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
