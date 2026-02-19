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

    if (!dashboardStats || !strategicStats) return (
        <div className="min-h-screen lux-mesh-bg flex items-center justify-center">
            <div className="flex flex-col items-center animate-pulse">
                <div className="w-20 h-20 bg-indigo-500 rounded-full blur-2xl opacity-50 mb-4" />
                <p className="font-black uppercase tracking-[0.4em] text-xs text-indigo-400">Synchronizing Strategic Core...</p>
            </div>
        </div>
    );

    const activeArea = dashFilters.constituency ? allLocations.find(c => String(c.id) === String(dashFilters.constituency))?.name : 'Global Sector';
    const votesNeeded = Math.ceil((dashboardStats.total || 0) * 0.51);
    const currentUDF = dashboardStats.sentiment?.UDF || 0;
    const gap = Math.max(0, votesNeeded - currentUDF);

    return (
        <div className="min-h-screen lux-mesh-bg p-12 pl-96 space-y-12 lux-animate-in">
            <header className="flex justify-between items-center border-b border-white/5 pb-12">
                <div>
                    <h1 className="text-7xl font-black tracking-tighter uppercase leading-none">
                        Neural <span className="lux-text-gradient">Command</span>
                    </h1>
                    <div className="flex items-center gap-3 mt-4">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_#10b981]" />
                        <p className="text-slate-500 font-black uppercase tracking-[0.4em] text-[10px]">
                            {activeArea} Analysis Live
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    <select
                        className="lux-glass text-white border border-white/10 rounded-2xl px-10 py-5 text-[10px] font-black uppercase tracking-widest focus:ring-0 cursor-pointer hover:bg-white/10 transition-all outline-none"
                        value={dashFilters.constituency}
                        onChange={(e) => setDashFilters({ ...dashFilters, constituency: e.target.value, lb: '', booth: '' })}
                    >
                        <option value="" className="bg-slate-900">Sector Selection</option>
                        {allLocations.map(c => <option key={c.id} value={c.id} className="bg-slate-900">{c.name}</option>)}
                    </select>
                </div>
            </header>

            <div className="grid grid-cols-12 gap-10">
                <div className="col-span-8 lux-card min-h-[500px] flex flex-col relative overflow-hidden bg-gradient-to-br from-indigo-500/5 to-transparent border-white/5 shadow-2xl">
                    <div className="flex justify-between items-start mb-12 relative z-10">
                        <div>
                            <h3 className="font-black uppercase tracking-[0.3em] text-[10px] text-indigo-400 mb-2 italic">Tactical Deployment</h3>
                            <h2 className="text-4xl font-black uppercase tracking-tighter">Strategic Grid</h2>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] font-black text-slate-500 tracking-[0.2em] mb-1 uppercase">Operational Load</p>
                            <p className="text-2xl font-black">{strategicStats.booth_stats?.length || 0} Sectors</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-4 gap-6 flex-1 relative z-10 overflow-y-auto max-h-[600px] pr-4">
                        {strategicStats.booth_stats?.map((booth, i) => (
                            <div key={i} onClick={() => { setListFilters({ ...listFilters, booth: booth.id }); setView('voters'); }} className="lux-glass group p-6 rounded-[1.5rem] border-white/5 transition-all duration-700 hover:scale-105 hover:bg-white/10 cursor-pointer shadow-lg hover:shadow-indigo-500/20">
                                <span className="text-[9px] font-black px-3 py-1 bg-white/5 text-slate-400 rounded-full mb-4 inline-block group-hover:bg-indigo-500 group-hover:text-white transition-all capitalize">Booth {booth.number}</span>
                                <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-200 line-clamp-1 mb-6 group-hover:text-indigo-400">{booth.name}</h4>
                                <div className="space-y-3">
                                    <div className="flex justify-between text-[8px] font-black uppercase tracking-widest text-slate-500">
                                        <span>Intel Sync</span>
                                        <span>{booth.coverage}%</span>
                                    </div>
                                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden p-0.5">
                                        <div className="h-full bg-indigo-500 shadow-[0_0_10px_#6366f1] rounded-full" style={{ width: `${booth.coverage}%` }} />
                                    </div>
                                </div>
                            </div>
                        ))}
                        {(!strategicStats.booth_stats || strategicStats.booth_stats.length === 0) && (
                            <div className="col-span-full h-full flex flex-col items-center justify-center text-slate-500 gap-4 group opacity-50">
                                <div className="text-4xl filter grayscale group-hover:grayscale-0 transition-all">🔍</div>
                                <p className="font-black uppercase tracking-widest text-[10px]">Awaiting Sector Selection</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="col-span-4 space-y-10">
                    <div className="lux-card flex flex-col items-center justify-center p-12 text-center bg-indigo-600/10 border-indigo-500/30 shadow-2xl">
                        <h3 className="font-black uppercase tracking-[0.3em] text-[10px] text-indigo-400 mb-10">Victory Probability</h3>
                        <div className="relative flex items-center justify-center group h-64 w-64">
                            <svg className="w-full h-full transform -rotate-90">
                                <circle className="text-white/5" strokeWidth="12" stroke="currentColor" fill="transparent" r="90" cx="128" cy="128" />
                                <circle className="text-indigo-500" strokeWidth="12" strokeDasharray={2 * Math.PI * 90} strokeDashoffset={2 * Math.PI * 90 * (1 - 0.72)} strokeLinecap="round" stroke="currentColor" fill="transparent" r="90" cx="128" cy="128" style={{ filter: 'drop-shadow(0 0 15px #6366f1)' }} />
                            </svg>
                            <div className="absolute flex flex-col items-center justify-center">
                                <span className="text-7xl font-black tracking-tighter">72%</span>
                                <span className="text-[10px] font-black uppercase text-indigo-400 tracking-[0.4em] mt-2">Active</span>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-8 w-full mt-12 border-t border-white/5 pt-8">
                            <div className="text-center border-r border-white/5">
                                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Confirmed</p>
                                <p className="text-xl font-black">{currentUDF}</p>
                            </div>
                            <div className="text-center">
                                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Target</p>
                                <p className="text-xl font-black text-indigo-400">{votesNeeded}</p>
                            </div>
                        </div>
                    </div>

                    <div className="lux-card bg-gradient-to-br from-purple-600/10 to-transparent shadow-2xl">
                        <h3 className="font-black uppercase tracking-[0.3em] text-[10px] text-purple-400 mb-8 pb-4 border-b border-white/5">Synthesized Simulation</h3>
                        <div className="space-y-8">
                            <div>
                                <div className="flex justify-between mb-4">
                                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Expected Turnout Scenario</span>
                                    <span className="text-2xl font-black text-purple-400">{turnoutScenario}%</span>
                                </div>
                                <input
                                    type="range"
                                    min="60"
                                    max="100"
                                    value={turnoutScenario}
                                    onChange={(e) => setTurnoutScenario(e.target.value)}
                                    className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-purple-500"
                                />
                            </div>
                            <div className="p-6 bg-white/5 rounded-2xl border border-white/5 text-center shadow-inner">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-relaxed">
                                    Expected Effective Yield <br />
                                    <span className="text-3xl font-black text-white mt-1 block">{Math.round(dashboardStats.total * (turnoutScenario / 100))}</span>
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-4 gap-10 pb-20">
                {[
                    { l: 'Pulse Synchronization', v: 'SYNCED', c: 'text-emerald-400', i: '🔮' },
                    { l: 'Neural Readiness', v: 'OPTIMAL', c: 'text-indigo-400', i: '⚡' },
                    { l: 'Propogation Reach', v: '94%', c: 'text-purple-400', i: '📡' },
                    { l: 'System Risk', v: '12%', c: 'text-rose-400', i: '⚠️' }
                ].map((s, i) => (
                    <div key={i} className="lux-card flex items-center gap-6 group hover:-translate-y-2 shadow-2xl border-white/5">
                        <div className="text-4xl group-hover:scale-125 transition-transform duration-500">{s.i}</div>
                        <div>
                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">{s.l}</p>
                            <p className={`text-4xl font-black tracking-tighter ${s.c}`}>{s.v}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default DashboardV2;
