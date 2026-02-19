import React from 'react';
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
    if (!dashboardStats) return null;

    return (
        <div className="min-h-screen lux-mesh-bg p-12 pl-96 space-y-12 lux-animate-in">
            <header className="flex justify-between items-end border-b border-white/5 pb-10">
                <div>
                    <h1 className="text-6xl font-black tracking-tighter uppercase lux-text-gradient">Strategic Hub</h1>
                    <p className="text-slate-300 font-black uppercase tracking-[0.4em] text-[10px] mt-2 ml-1">Autonomous Campaign Command</p>
                </div>
                <div className="flex gap-6 mb-1">
                    {[
                        { label: 'Constituency', key: 'constituency', width: 'w-56', options: allLocations },
                        { label: 'Local Body Unit', key: 'lb', width: 'w-48', options: dashFilters.constituency ? allLocations.find(c => String(c.id) === String(dashFilters.constituency))?.local_bodies : [] },
                        { label: 'Booth Unit', key: 'booth', width: 'w-40', options: dashFilters.lb ? allLocations.find(c => String(c.id) === String(dashFilters.constituency))?.local_bodies.find(l => String(l.id) === String(dashFilters.lb))?.booths : [] }
                    ].map((f) => (
                        <div key={f.key} className="flex flex-col gap-2">
                            <label className="text-[9px] font-black uppercase text-slate-300 tracking-widest ml-1">{f.label}</label>
                            <select
                                className={`${f.width} lux-glass rounded-2xl px-6 py-4 text-[10px] font-black uppercase tracking-widest focus:border-indigo-500/50 shadow-sm transition-all cursor-pointer outline-none text-slate-300`}
                                value={dashFilters[f.key]}
                                disabled={f.key !== 'constituency' && !dashFilters[f.key === 'booth' ? 'lb' : 'constituency']}
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
            </header>

            <div className="grid grid-cols-3 gap-10">
                {[
                    { l: 'Total Registered', v: dashboardStats.total, c: 'from-indigo-600/20 to-indigo-900/20', icon: '💎' },
                    { l: 'Male Intelligence', v: dashboardStats.male, c: 'from-blue-600/20 to-blue-900/20', icon: '🛡️' },
                    { l: 'Female Intelligence', v: dashboardStats.female, c: 'from-rose-600/20 to-rose-900/20', icon: '✨' },
                ].map((s, i) => (
                    <div key={i} className={`lux-card relative overflow-hidden bg-gradient-to-br ${s.c} flex flex-col justify-end min-h-[220px]`}>
                        <div className="absolute top-8 right-8 text-4xl opacity-20">{s.icon}</div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-2 text-slate-400">{s.l}</p>
                        <p className="text-6xl font-black tracking-tighter">{s.v}</p>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-12 gap-10">
                <div className="col-span-4 lux-card flex flex-col h-[500px]">
                    <h3 className="font-black uppercase tracking-[0.3em] text-[10px] text-slate-300 mb-8 border-b border-white/5 pb-6">Sentiment Analysis</h3>
                    <div className="flex-1 relative flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={[
                                        { name: 'UDF', value: dashboardStats.sentiment?.UDF || 0 },
                                        { name: 'LDF', value: dashboardStats.sentiment?.LDF || 0 },
                                        { name: 'NDA', value: dashboardStats.sentiment?.NDA || 0 },
                                        { name: 'Neutral', value: dashboardStats.sentiment?.Neutral || 0 }
                                    ].filter(d => d.value > 0)}
                                    innerRadius={80}
                                    outerRadius={110}
                                    paddingAngle={10}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {['#6366f1', '#f43f5e', '#f59e0b', '#334155'].map((color, index) => (
                                        <Cell key={`cell-${index}`} fill={color} className="filter drop-shadow-[0_0_10px_rgba(255,255,255,0.1)]" />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{ background: '#0f172a', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)', fontWeight: 'bold' }} />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute flex flex-col items-center justify-center">
                            <span className="text-4xl font-black tracking-tighter">{dashboardStats.total}</span>
                            <span className="text-[9px] font-black uppercase text-slate-300 tracking-widest">Profiles</span>
                        </div>
                    </div>
                    <div className="grid grid-cols-4 gap-4 mt-10">
                        {[
                            { l: 'UDF', c: 'bg-indigo-500', v: dashboardStats.sentiment?.UDF || 0 },
                            { l: 'LDF', c: 'bg-rose-500', v: dashboardStats.sentiment?.LDF || 0 },
                            { l: 'NDA', c: 'bg-amber-500', v: dashboardStats.sentiment?.NDA || 0 },
                            { l: 'Neut', c: 'bg-slate-600', v: dashboardStats.sentiment?.Neutral || 0 }
                        ].map(s => (
                            <div key={s.l} className="text-center group-hover:scale-110 transition-transform duration-500">
                                <div className={`w-1.5 h-1.5 rounded-full mx-auto mb-2 ${s.c} shadow-[0_0_10px_rgba(255,255,255,0.2)]`}></div>
                                <p className="text-[9px] font-black text-slate-300 uppercase">{s.l}</p>
                                <p className="text-sm font-black text-slate-200">{s.v}</p>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="col-span-8 lux-card flex flex-col h-[500px]">
                    <h3 className="font-black uppercase tracking-[0.3em] text-[10px] text-slate-300 mb-8 border-b border-white/5 pb-6">Operational Readiness Heatmap</h3>
                    <div className="flex-1">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={dashboardStats?.age_dist ? Object.entries(dashboardStats.age_dist).map(([label, count]) => ({ name: label.replace('_', '-'), voters: count })) : []}>
                                <defs>
                                    <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#818cf8" stopOpacity={0.8} />
                                        <stop offset="100%" stopColor="#818cf8" stopOpacity={0.1} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900, fill: '#64748b' }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900, fill: '#64748b' }} />
                                <Tooltip cursor={{ fill: 'rgba(255,255,255,0.03)' }} contentStyle={{ background: '#0f172a', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)', fontWeight: 'bold' }} />
                                <Bar dataKey="voters" fill="url(#barGrad)" radius={[15, 15, 0, 0]} barSize={50}>
                                    <LabelList dataKey="voters" position="top" style={{ fontSize: 11, fontWeight: 900, fill: '#818cf8' }} offset={15} />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-10 pb-20">
                <div className="lux-card bg-gradient-to-br from-emerald-600/10 to-emerald-900/10 flex flex-col justify-between h-[300px]">
                    <div>
                        <h3 className="font-black uppercase tracking-[0.3em] text-[10px] text-emerald-500 mb-4 italic">Optimization Vector</h3>
                        <h2 className="text-4xl font-black uppercase tracking-tighter leading-tight">Neutral Engagement</h2>
                        <p className="text-xs font-medium text-slate-400 mt-4 leading-relaxed">Targeting <span className="text-emerald-400 font-bold underline decoration-emerald-500/50 decoration-4 underline-offset-8 transition-all hover:text-white cursor-help">{dashboardStats?.sentiment?.Neutral || 0} tactical neutrals</span> will maximize conversion probability by 42%.</p>
                    </div>
                    <button onClick={() => { setListFilters({ ...listFilters, leaning: 'NEUTRAL' }); setView('voters'); }} className="lux-btn-primary w-fit mt-10">Activate Conversion Protocol</button>
                </div>

                <div className="lux-card flex flex-col justify-between h-[300px]">
                    <h3 className="font-black uppercase tracking-[0.3em] text-[10px] text-slate-300 border-b border-white/5 pb-4">Digital Saturation</h3>
                    <div className="flex-1 flex flex-col justify-center">
                        <div className="flex items-baseline gap-3 mb-2">
                            <span className="text-5xl font-black tracking-tighter lux-text-gradient">{Math.round(((dashboardStats.outreach?.with_phone || 0) / (dashboardStats.total || 1)) * 100)}%</span>
                            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Global Reach</span>
                        </div>
                        <div className="h-3 bg-white/5 rounded-full overflow-hidden border border-white/5 p-0.5">
                            <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-1000" style={{ width: `${((dashboardStats.outreach?.with_phone || 0) / (dashboardStats.total || 1)) * 100}%` }}></div>
                        </div>
                    </div>
                    <p className="text-[9px] font-bold text-slate-300 uppercase tracking-[0.2em]">Verified Assets Recorded: {dashboardStats.outreach?.with_phone || 0}</p>
                </div>

                <div className="lux-card flex flex-col justify-between h-[300px] border-indigo-500/30">
                    <h3 className="font-black uppercase tracking-[0.3em] text-[10px] text-indigo-400 border-b border-white/5 pb-4 italic">Next Phase Command</h3>
                    <div className="space-y-4">
                        <h4 className="text-2xl font-black uppercase tracking-tighter leading-tight">Tactical Outreach <br />System Ready</h4>
                        <div className="flex gap-4">
                            <button onClick={() => setView('engine')} className="lux-glass px-6 py-3 rounded-xl font-bold text-[9px] uppercase tracking-widest hover:border-indigo-500 transition-all">Launch Engine</button>
                            <button onClick={() => setView('comm')} className="bg-white text-black px-6 py-3 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-indigo-400 transition-all">Start Broadcast</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
