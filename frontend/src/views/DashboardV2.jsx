import React, { useState, useMemo } from 'react';
import StrategicGrid from '../components/v2/StrategicGrid';
import WinProbabilityRing from '../components/v2/WinProbabilityRing';
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
    const [turnoutScenario, setTurnoutScenario] = useState(85); // 85% projected turnout

    if (!dashboardStats || !strategicStats) return (
        <div className="min-h-screen v2-bg-obsidian flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-white/10 border-t-cyan-500 rounded-full animate-spin"></div>
                <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Updating Intelligence Data...</p>
            </div>
        </div>
    );

    // Filter booths for the Strategic Grid
    const boothStats = strategicStats?.booth_stats || [];

    // Victory Logic
    const votesNeeded = Math.ceil((dashboardStats.total || 0) * 0.51);
    const currentUDF = dashboardStats.sentiment?.UDF || 0;
    const gap = Math.max(0, votesNeeded - currentUDF);

    return (
        <div className="min-h-screen v2-bg-obsidian text-white p-6 md:p-10 space-y-10 relative overflow-hidden">
            {/* Header: Simplified */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10 border-b border-white/5 pb-8">
                <div>
                    <h1 className="text-5xl font-black tracking-tight uppercase">
                        Election <span className="text-cyan-400">Dashboard</span>
                    </h1>
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-1">
                        {dashFilters.constituency ? allLocations.find(c => String(c.id) === String(dashFilters.constituency))?.name : 'All Areas'} Overview
                    </p>
                </div>

                <div className="flex items-center gap-4">
                    <select
                        className="bg-white/5 text-white border border-white/10 rounded-2xl px-6 py-3 text-xs font-black uppercase tracking-widest focus:ring-0 cursor-pointer hover:bg-white/10 transition-all"
                        value={dashFilters.constituency}
                        onChange={(e) => setDashFilters({ ...dashFilters, constituency: e.target.value, booth: '' })}
                    >
                        <option value="" className="bg-slate-900">Choose Area</option>
                        {allLocations.map(c => <option key={c.id} value={c.id} className="bg-slate-900">{c.name}</option>)}
                    </select>
                </div>
            </header>

            {/* Victory Section */}
            <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-10">
                <div className="lg:col-span-4 flex justify-center items-center">
                    <WinProbabilityRing stats={dashboardStats} />
                </div>

                <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Victory Stats */}
                    <div className="v2-glass p-8 rounded-[2.5rem] border-white/5">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6">Winning Progress</h3>
                        <div className="space-y-6">
                            <div className="flex justify-between items-end">
                                <div>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase">Confirmed Support</p>
                                    <p className="text-4xl font-black text-white">{currentUDF}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[9px] font-bold text-slate-400 uppercase">Target (51%)</p>
                                    <p className="text-xl font-black text-cyan-400">{votesNeeded}</p>
                                </div>
                            </div>

                            <div className="h-4 bg-white/5 rounded-full overflow-hidden border border-white/10">
                                <div
                                    className="h-full bg-gradient-to-r from-blue-600 to-cyan-400 transition-all duration-1000"
                                    style={{ width: `${Math.min((currentUDF / votesNeeded) * 100, 100)}%` }}
                                ></div>
                            </div>

                            <p className="text-xs font-bold text-slate-300">
                                {gap > 0 ? (
                                    <>Need <span className="text-orange-400 font-black">{gap}</span> more voters to win.</>
                                ) : (
                                    <span className="text-emerald-400 font-black">Winning target achieved!</span>
                                )}
                            </p>
                        </div>
                    </div>

                    {/* Simple Simulator */}
                    <div className="v2-glass p-8 rounded-[2.5rem] border-white/5">
                        <div className="flex justify-between items-start mb-6">
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Voting Calculator</h3>
                        </div>
                        <div className="space-y-6">
                            <div>
                                <div className="flex justify-between mb-4">
                                    <span className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Expected Turnout</span>
                                    <span className="text-2xl font-black text-orange-400">{turnoutScenario}%</span>
                                </div>
                                <input
                                    type="range"
                                    min="60"
                                    max="100"
                                    value={turnoutScenario}
                                    onChange={(e) => setTurnoutScenario(e.target.value)}
                                    className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-orange-500"
                                />
                            </div>
                            <div className="p-4 bg-white/5 rounded-2xl border border-white/10 text-center">
                                <p className="text-[10px] font-bold text-slate-300 leading-relaxed uppercase tracking-tighter">
                                    Expected Total Votes: <br />
                                    <span className="text-2xl font-black text-white">{Math.round(dashboardStats.total * (turnoutScenario / 100))}</span>
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Booth Status */}
            <section className="relative z-10 w-full overflow-visible">
                {dashFilters.constituency ? (
                    <div className="space-y-4">
                        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Individual Booth Status</h3>
                        <StrategicGrid
                            boothStats={boothStats}
                            onBoothClick={(booth) => {
                                setListFilters({ ...listFilters, booth: booth.id });
                                setView('voters');
                            }}
                        />
                    </div>
                ) : (
                    <div className="v2-glass p-16 rounded-[2.5rem] flex flex-col items-center justify-center text-center">
                        <h3 className="text-xl font-black uppercase">Please Pick an Area</h3>
                        <p className="text-slate-400 text-sm max-w-sm mt-3 font-medium">Select a constituency at the top to see booth data.</p>
                    </div>
                )}
            </section>

            {/* Simple Actions */}
            <footer className="grid grid-cols-1 md:grid-cols-3 gap-4 relative z-10">
                <button onClick={() => setView('engine')} className="v2-glass px-8 py-5 rounded-[2rem] hover:bg-white/5 transition-all text-left">
                    <p className="text-xs font-black uppercase tracking-widest">Voter List Import</p>
                    <p className="text-[10px] font-bold text-slate-500 uppercase mt-1">Scan & Save Voters</p>
                </button>
                <button onClick={() => setView('comm')} className="v2-glass px-8 py-5 rounded-[2rem] hover:bg-white/5 transition-all text-left">
                    <p className="text-xs font-black uppercase tracking-widest">Messaging Hub</p>
                    <p className="text-[10px] font-bold text-slate-500 uppercase mt-1">Send Broadcasts</p>
                </button>
                <div className="v2-glass px-8 py-5 rounded-[2rem] text-left">
                    <p className="text-xs font-black uppercase tracking-widest">Voter Count</p>
                    <p className="text-[10px] font-bold text-slate-500 uppercase mt-1">{dashboardStats.total} Total Registered</p>
                </div>
            </footer>
        </div>
    );
};

export default DashboardV2;
