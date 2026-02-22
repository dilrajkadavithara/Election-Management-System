import React, { useState, useEffect } from 'react';
import {
    ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar
} from 'recharts';
import api from '../api';

const WarRoom = ({ allLocations, dashFilters }) => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        constituencyId: dashFilters.constituency || '',
        lbId: dashFilters.lb || '',
        boothId: dashFilters.booth || ''
    });

    useEffect(() => {
        const loadTacticalData = async () => {
            setLoading(true);
            try {
                const data = await api.getWarRoomStats({
                    constituency_id: filters.constituencyId,
                    lb: filters.lbId,
                    booth: filters.boothId
                });
                setStats(data);
            } catch (e) { console.error(e); }
            finally { setLoading(false); }
        };
        loadTacticalData();
    }, [filters]);

    // Derived location names
    const activeConst = allLocations.find(c => String(c.id) === String(filters.constituencyId));
    const activeLB = activeConst?.local_bodies.find(l => String(l.id) === String(filters.lbId));
    const activeBooth = activeLB?.booths.find(b => String(b.id) === String(filters.boothId));

    if (loading && !stats) return (
        <div className="min-h-screen lux-mesh-bg flex items-center justify-center">
            <div className="flex flex-col items-center">
                <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
                <p className="font-black uppercase tracking-[0.4em] text-[10px] text-indigo-400">Tactical Synchronization In Progress...</p>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen lux-mesh-bg p-12 pl-96 space-y-10 animate-in overflow-x-hidden">
            {/* 🛠️ HEADER & FILTERS */}
            <div className="flex flex-col gap-8 border-b border-white/5 pb-10">
                <div className="flex justify-between items-end">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <span className="w-3 h-3 rounded-full bg-rose-600 animate-pulse shadow-[0_0_15px_#e11d48]" />
                            <h4 className="font-black uppercase tracking-[0.4em] text-[10px] text-rose-500">Field Operations Command</h4>
                        </div>
                        <h1 className="text-6xl font-black uppercase tracking-tighter leading-none">
                            Tactical <span className="lux-text-gradient">War Room</span>
                        </h1>
                    </div>

                    <div className="flex items-center gap-6">
                        {/* Filters Dropdowns */}
                        <div className="flex gap-4 bg-white/5 p-4 rounded-3xl border border-white/5 backdrop-blur-xl">
                            {/* Constituency Filter */}
                            <div className="flex flex-col gap-1">
                                <label className="text-[8px] font-black uppercase text-slate-500 tracking-widest ml-1">Constituency</label>
                                <select
                                    className="bg-transparent text-white text-[10px] font-black uppercase tracking-widest outline-none cursor-pointer hover:text-indigo-400 transition-colors px-2"
                                    value={filters.constituencyId}
                                    onChange={(e) => setFilters({ ...filters, constituencyId: e.target.value, lbId: '', boothId: '' })}
                                >
                                    <option value="" className="bg-slate-900 text-white">Global Scope</option>
                                    {allLocations.map(c => <option key={c.id} value={c.id} className="bg-slate-900">{c.name}</option>)}
                                </select>
                            </div>

                            <div className="w-px h-10 bg-white/5 self-center" />

                            {/* LB Filter */}
                            <div className="flex flex-col gap-1">
                                <label className="text-[8px] font-black uppercase text-slate-500 tracking-widest ml-1">Local Body</label>
                                <select
                                    disabled={!filters.constituencyId}
                                    className="bg-transparent text-white text-[10px] font-black uppercase tracking-widest outline-none cursor-pointer hover:text-indigo-400 transition-colors disabled:opacity-20 px-2"
                                    value={filters.lbId}
                                    onChange={(e) => setFilters({ ...filters, lbId: e.target.value, boothId: '' })}
                                >
                                    <option value="" className="bg-slate-900">All Entities</option>
                                    {activeConst?.local_bodies.map(l => <option key={l.id} value={l.id} className="bg-slate-900">{l.name}</option>)}
                                </select>
                            </div>

                            <div className="w-px h-10 bg-white/5 self-center" />

                            {/* Booth Filter */}
                            <div className="flex flex-col gap-1">
                                <label className="text-[8px] font-black uppercase text-slate-500 tracking-widest ml-1">Booth</label>
                                <select
                                    disabled={!filters.lbId}
                                    className="bg-transparent text-white text-[10px] font-black uppercase tracking-widest outline-none cursor-pointer hover:text-indigo-400 transition-colors disabled:opacity-20 px-2"
                                    value={filters.boothId}
                                    onChange={(e) => setFilters({ ...filters, boothId: e.target.value })}
                                >
                                    <option value="" className="bg-slate-900">All Units</option>
                                    {activeLB?.booths.map(b => <option key={b.id} value={b.id} className="bg-slate-900">#{b.number}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 🛡️ TACTICAL SUMMARY STRIP */}
                <div className="grid grid-cols-4 gap-6">
                    {[
                        { label: 'Total Digitized', val: stats?.summary?.digitized || 0, change: stats?.daily_change?.digitized || 0, unit: 'Daily Progress' },
                        { label: 'Confirmed UDF', val: stats?.summary?.udf || 0, change: stats?.daily_change?.udf || 0, unit: 'Tactical Conversion' },
                        { label: 'Weekly Growth', val: (stats?.weekly_change?.digitized || 0).toLocaleString(), change: null, unit: 'Last 7 Days (Dig)' },
                        { label: 'Win Probability', val: `${Math.round(stats?.summary?.win_prob || 0)}%`, change: null, unit: 'Current Battle Prediction' }
                    ].map((card, i) => (
                        <div key={i} className="lux-card p-8 bg-slate-900/40 border-white/5 flex flex-col justify-between">
                            <div>
                                <h5 className="font-black uppercase tracking-[0.3em] text-[8px] text-slate-500 mb-2">{card.label}</h5>
                                <div className="flex items-baseline gap-4">
                                    <p className="text-4xl font-black tracking-tighter text-white">{(card.val).toLocaleString()}</p>
                                    {card.change !== null && (
                                        <span className={`text-[10px] font-black ${card.change >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                            {card.change >= 0 ? '↑' : '↓'} {Math.abs(card.change)}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <p className="text-[7px] font-bold text-slate-600 uppercase tracking-widest mt-4">📡 {card.unit}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* 📊 MOMENTUM TIMELINE */}
            <div className="grid grid-cols-12 gap-8">
                <div className="col-span-12 lux-card p-10 bg-slate-900/40 border-white/5">
                    <div className="flex justify-between items-center mb-10">
                        <div>
                            <h3 className="font-black uppercase tracking-[0.3em] text-[10px] text-indigo-400 border-l-4 border-indigo-500 pl-4">Operation Momentum</h3>
                            <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest ml-5 mt-1">14-Day Tactical Analysis (Digitization vs Conversion)</p>
                        </div>
                        <div className="flex gap-4">
                            <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_10px_#6366f1]" /> <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Daily Dig.</span></div>
                            <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_#10b981]" /> <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Confirmed Shift</span></div>
                        </div>
                    </div>

                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={stats?.history || []}>
                                <defs>
                                    <linearGradient id="colorDig" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} /><stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorConv" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} /><stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 900, fill: '#64748b' }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 900, fill: '#64748b' }} />
                                <Tooltip
                                    contentStyle={{ background: '#020617', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '1rem' }}
                                    itemStyle={{ fontSize: '10px', fontWeight: 'bold' }}
                                />
                                <Area type="monotone" dataKey="new_dig" stroke="#6366f1" fillOpacity={1} fill="url(#colorDig)" strokeWidth={3} name="New Digitized" />
                                <Area type="monotone" dataKey="new_udf" stroke="#10b981" fillOpacity={1} fill="url(#colorConv)" strokeWidth={3} name="Party Gain" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* 📋 UNIT-BY-UNIT TRACKING GRID */}
            <div className="lux-card p-10 bg-slate-900/40 border-white/5">
                <h3 className="font-black uppercase tracking-[0.3em] text-[10px] text-indigo-400 border-l-4 border-indigo-500 pl-4 mb-8">
                    {filters.lbId || filters.boothId ? 'Booth-Level Intelligence' : 'Regional Performance Grid'}
                </h3>

                <div className="grid grid-cols-1 gap-2">
                    {/* Header */}
                    <div className="grid grid-cols-7 p-4 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5">
                        <div className="col-span-2">{filters.lbId || filters.boothId ? 'Booth Unit' : 'Local Body'}</div>
                        <div className="text-right">Total Dig.</div>
                        <div className="text-right">Coverage</div>
                        <div className="text-right">Confirmed</div>
                        <div className="text-right">Daily Activity</div>
                        <div className="text-right">Win Chance</div>
                    </div>

                    {/* Data Rows */}
                    {(stats?.breakdown || []).map((item, i) => (
                        <div key={i} className="grid grid-cols-7 p-6 bg-white/2 hover:bg-white/5 rounded-2xl border border-transparent hover:border-white/5 transition-all group items-center">
                            <div className="col-span-2">
                                <p className="text-[11px] font-black text-white group-hover:text-indigo-400 transition-colors">{item.name}</p>
                                <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mt-1 opacity-60">{item.sub}</p>
                            </div>
                            <div className="text-right font-black text-slate-300 text-xs">{item.digitized.toLocaleString()}</div>
                            <div className="text-right px-4">
                                <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                                    <div className="h-full bg-indigo-500 shadow-[0_0_10px_#6366f1]" style={{ width: `${item.coverage}%` }} />
                                </div>
                                <p className="text-[8px] font-black text-slate-500 mt-2">{item.coverage}% Complete</p>
                            </div>
                            <div className="text-right font-black text-indigo-400 text-xs">{item.udf.toLocaleString()}</div>
                            <div className="text-right flex flex-col items-end">
                                <div className="text-[10px] font-black text-emerald-500">+{item.daily_dig} Dig.</div>
                                <div className="text-[9px] font-bold text-amber-500">+{item.daily_udf} Conv.</div>
                            </div>
                            <div className="text-right">
                                <span className={`px-4 py-2 rounded-full text-[10px] font-black ${item.win_prob > 55 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                                    {Math.round(item.win_prob)}%
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="text-center pb-20 opacity-30">
                <p className="text-[8px] font-black text-slate-500 uppercase tracking-[0.5em]">Intel Hub Legacy • Tactical War Room Module • Restricted Access</p>
            </div>
        </div>
    );
};

export default WarRoom;
