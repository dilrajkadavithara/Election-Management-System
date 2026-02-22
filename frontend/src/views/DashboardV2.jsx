import React from 'react';
import {
    PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
    AreaChart, Area, XAxis, YAxis, CartesianGrid
} from 'recharts';

const DashboardV2 = ({
    dashboardStats,
    strategicStats,
    dashFilters,
    setDashFilters,
    allLocations,
    listFilters,
    setListFilters,
    setView
}) => {
    const [turnoutScenario, setTurnoutScenario] = React.useState(85);
    const [perspective, setPerspective] = React.useState('UDF');
    const [neutralConversion, setNeutralConversion] = React.useState(15);

    if (!dashboardStats || !strategicStats) return (
        <div className="min-h-screen lux-mesh-bg flex items-center justify-center">
            <div className="flex flex-col items-center animate-pulse">
                <div className="w-20 h-20 bg-indigo-500 rounded-full blur-2xl opacity-50 mb-4" />
                <p className="font-black uppercase tracking-[0.4em] text-xs text-indigo-400">Synchronizing Strategic Core...</p>
            </div>
        </div>
    );

    const activeArea = dashFilters.constituency ? allLocations.find(c => String(c.id) === String(dashFilters.constituency))?.name : 'North Paravur Sector';

    // Strategic Math for Victory Simulation
    const totalEffectiveVoters = Math.round(dashboardStats.total * (turnoutScenario / 100));
    const votesNeeded = Math.ceil(totalEffectiveVoters * 0.51);
    const baseSupporters = dashboardStats.sentiment?.[perspective] || 0;
    const neutrals = dashboardStats.sentiment?.NEUTRAL || 0;
    const convertibleNeutrals = Math.round(neutrals * (neutralConversion / 100));

    const projectedVotes = baseSupporters + convertibleNeutrals;
    const winProbability = Math.min(100, Math.round((projectedVotes / votesNeeded) * 100));
    const margin = projectedVotes - votesNeeded;

    return (
        <div className="min-h-screen lux-mesh-bg p-12 pl-96 space-y-12 lux-animate-in">
            <header className="flex justify-between items-center border-b border-white/5 pb-10">
                <div>
                    <h1 className="text-6xl font-black tracking-tighter uppercase leading-none">
                        Strategic <span className="lux-text-gradient">Hub</span>
                    </h1>
                    <div className="flex items-center gap-3 mt-4">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_#10b981]" />
                        <p className="text-slate-300 font-black uppercase tracking-[0.4em] text-[10px]">
                            {activeArea} Command Live
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-8">
                    {/* Perspective Switcher */}
                    <div className="flex bg-white/5 p-1.5 rounded-2xl border border-white/5">
                        {['UDF', 'LDF', 'NDA'].map(p => (
                            <button
                                key={p}
                                onClick={() => setPerspective(p)}
                                className={`px-6 py-2.5 rounded-xl text-[10px] font-black tracking-widest transition-all ${perspective === p ? 'bg-indigo-500 text-white shadow-[0_0_20px_#6366f1]' : 'text-slate-400 hover:text-white'}`}
                            >
                                {p} VIEW
                            </button>
                        ))}
                    </div>

                    <select
                        className="lux-glass text-white border border-white/10 rounded-2xl px-8 py-4 text-[10px] font-black uppercase tracking-widest focus:ring-0 cursor-pointer hover:bg-white/10 transition-all outline-none"
                        value={dashFilters.constituency}
                        onChange={(e) => setDashFilters({ ...dashFilters, constituency: e.target.value, lb: '', booth: '' })}
                    >
                        <option value="" className="bg-slate-900">All Sectors</option>
                        {allLocations.map(c => <option key={c.id} value={c.id} className="bg-slate-900">{c.name}</option>)}
                    </select>
                </div>
            </header>

            <div className="grid grid-cols-12 gap-10">
                {/* Strategic Grid */}
                <div className="col-span-8 lux-card flex flex-col relative overflow-hidden border-white/5 shadow-2xl">
                    <div className="flex justify-between items-start mb-10 relative z-10">
                        <div>
                            <h3 className="font-black uppercase tracking-[0.3em] text-[10px] text-indigo-400 mb-2 italic">Ground Deployment</h3>
                            <h2 className="text-4xl font-black uppercase tracking-tighter">Sector Strength Matrix</h2>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] font-black text-slate-300 tracking-[0.2em] mb-1 uppercase">Active Units</p>
                            <p className="text-2xl font-black text-indigo-400">{strategicStats.booth_stats?.length || 0}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-4 gap-6 flex-1 relative z-10 overflow-y-auto max-h-[550px] pr-4">
                        {strategicStats.booth_stats?.map((booth, i) => {
                            const pStrength = booth[perspective.toLowerCase()] || 0;
                            const pCoverage = Math.round((pStrength / booth.total) * 100);
                            return (
                                <div key={i} onClick={() => { setListFilters({ ...listFilters, booth: booth.id }); setView('voters'); }} className="lux-glass group p-6 rounded-[1.5rem] border-white/5 transition-all duration-500 hover:bg-white/10 cursor-pointer shadow-lg">
                                    <span className="text-[8px] font-black px-3 py-1 bg-white/5 text-slate-400 rounded-full mb-4 inline-block group-hover:bg-indigo-500 group-hover:text-white transition-all tracking-widest uppercase">Unit {booth.number}</span>
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-200 line-clamp-1 mb-6">{booth.name}</h4>
                                    <div className="space-y-3">
                                        <div className="flex justify-between text-[8px] font-black uppercase tracking-widest text-slate-300">
                                            <span>{perspective} Strength</span>
                                            <span className={pCoverage > 40 ? 'text-emerald-400' : 'text-rose-400'}>{pCoverage}%</span>
                                        </div>
                                        <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                                            <div className={`h-full transition-all duration-1000 ${pCoverage > 40 ? 'bg-emerald-500' : 'bg-rose-500'}`} style={{ width: `${pCoverage}%` }} />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Victory Probability & Virtual Simulation */}
                <div className="col-span-4 space-y-10">
                    <div className="lux-card flex flex-col items-center justify-center p-12 text-center bg-indigo-600/5 border-indigo-500/20 shadow-[0_0_50px_rgba(99,102,241,0.1)]">
                        <h3 className="font-black uppercase tracking-[0.3em] text-[10px] text-indigo-400 mb-10">Victory Probability</h3>
                        <div className="relative flex items-center justify-center h-64 w-64">
                            <svg className="w-full h-full transform -rotate-90">
                                <circle className="text-white/5" strokeWidth="10" stroke="currentColor" fill="transparent" r="90" cx="128" cy="128" />
                                <circle className={winProbability > 50 ? "text-emerald-500" : "text-rose-500"} strokeWidth="10" strokeDasharray={2 * Math.PI * 90} strokeDashoffset={2 * Math.PI * 90 * (1 - winProbability / 100)} strokeLinecap="round" stroke="currentColor" fill="transparent" r="90" cx="128" cy="128" style={{ filter: `drop-shadow(0 0 15px ${winProbability > 50 ? '#10b981' : '#f43f5e'})`, transition: 'all 1s ease-out' }} />
                            </svg>
                            <div className="absolute flex flex-col items-center justify-center">
                                <span className={`text-7xl font-black tracking-tighter ${winProbability > 50 ? 'text-emerald-400' : 'text-rose-400'}`}>{winProbability}%</span>
                                <span className="text-[9px] font-black uppercase text-slate-400 tracking-[0.4em] mt-2">Projection</span>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-8 w-full mt-12 border-t border-white/5 pt-8">
                            <div className="text-center border-r border-white/5 px-2">
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Lead Margin</p>
                                <p className={`text-xl font-black ${margin >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{margin >= 0 ? `+${margin}` : margin}</p>
                            </div>
                            <div className="text-center px-2">
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Target Yield</p>
                                <p className="text-xl font-black text-indigo-400">{votesNeeded}</p>
                            </div>
                        </div>
                    </div>

                    <div className="lux-card bg-gradient-to-br from-purple-600/10 to-transparent border-purple-500/20 shadow-2xl">
                        <h3 className="font-black uppercase tracking-[0.3em] text-[10px] text-purple-400 mb-10 border-b border-white/5 pb-4">Victory Simulation</h3>
                        <div className="space-y-10">
                            <div className="space-y-4">
                                <div className="flex justify-between items-end">
                                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Turnout Sensitivity</span>
                                    <span className="text-2xl font-black text-white">{turnoutScenario}%</span>
                                </div>
                                <input type="range" min="60" max="100" value={turnoutScenario} onChange={(e) => setTurnoutScenario(e.target.value)} className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-indigo-500" />
                            </div>

                            <div className="space-y-4">
                                <div className="flex justify-between items-end">
                                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Neutral Conversion Target</span>
                                    <span className="text-2xl font-black text-emerald-400">{neutralConversion}%</span>
                                </div>
                                <input type="range" min="0" max="100" value={neutralConversion} onChange={(e) => setNeutralConversion(e.target.value)} className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-emerald-500" />
                                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Converting {convertibleNeutrals} Neutrals across sectors</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-4 gap-10 pb-16">
                {[
                    { l: 'Residency Gap (NRI)', v: '-14%', c: 'text-amber-400', i: '✈️', d: 'Voters abroad / out-of-station' },
                    { l: 'Data Integrity', v: '92%', c: 'text-emerald-400', i: '💎', d: 'Digitization completeness' },
                    { l: 'Neutral Reservoir', v: dashboardStats.sentiment?.NEUTRAL || 0, c: 'text-indigo-400', i: '⚖️', d: 'Unconfirmed swing block' },
                    { l: 'Youth Readiness', v: '78%', c: 'text-purple-400', i: '🎓', d: 'Ages 18-25 coverage' }
                ].map((s, i) => (
                    <div key={i} className="lux-card flex items-center gap-6 group hover:-translate-y-2 transition-all duration-500 border-white/5 shadow-xl">
                        <div className="text-4xl group-hover:scale-125 transition-transform">{s.i}</div>
                        <div>
                            <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest mb-1">{s.l}</p>
                            <p className={`text-3xl font-black tracking-tighter ${s.c}`}>{s.v}</p>
                            <p className="text-[7px] font-black text-slate-500 uppercase mt-1">{s.d}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default DashboardV2;
