import React from 'react';
import {
    PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
    BarChart, Bar, XAxis, YAxis, CartesianGrid, LabelList,
    RadialBarChart, RadialBar
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
        <div className="space-y-12 animate-in">
            <header className="flex justify-between items-end border-b pb-6">
                <div>
                    <h1 className="text-5xl font-black tracking-tighter uppercase">Voter Analytics</h1>
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-xs mt-2">Live Intelligence Dashboard</p>
                </div>
                <div className="flex gap-4 mb-1">
                    <div className="flex flex-col gap-1">
                        <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Constituency</label>
                        <select
                            className="w-48 bg-white border-2 border-slate-100 rounded-2xl px-5 py-3 text-xs font-bold focus:border-indigo-500 shadow-sm hover:border-slate-300 transition-all cursor-pointer"
                            value={dashFilters.constituency}
                            onChange={(e) => setDashFilters({ ...dashFilters, constituency: e.target.value, booth: '' })}
                        >
                            <option value="">Global View (All)</option>
                            {allLocations.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Booth Unit</label>
                        <select
                            className="w-40 bg-white border-2 border-slate-100 rounded-2xl px-5 py-3 text-xs font-bold focus:border-indigo-500 shadow-sm hover:border-slate-300 transition-all cursor-pointer disabled:opacity-50"
                            value={dashFilters.booth}
                            disabled={!dashFilters.constituency}
                            onChange={(e) => setDashFilters({ ...dashFilters, booth: e.target.value })}
                        >
                            <option value="">All Booths</option>
                            {dashFilters.constituency && allLocations.find(c => String(c.id) === String(dashFilters.constituency))?.local_bodies.flatMap(lb => lb.booths).sort((a, b) => a.number - b.number).map(b => <option key={b.id} value={b.id}>Booth {b.number}</option>)}
                        </select>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-3 gap-8">
                {[
                    { l: 'Total Voters', v: dashboardStats.total, c: 'bg-white text-slate-800' },
                    { l: 'Male Voters', v: dashboardStats.male, c: 'bg-blue-50 text-blue-700' },
                    { l: 'Female Voters', v: dashboardStats.female, c: 'bg-rose-50 text-rose-700' },
                ].map((s, i) => (
                    <div key={i} className={`${s.c} p-8 rounded-[40px] shadow-sm border border-slate-100 flex flex-col justify-end min-h-[160px]`}>
                        <p className="text-[10px] font-black uppercase tracking-widest mb-1 opacity-60">{s.l}</p>
                        <p className="text-5xl font-black tracking-tighter">{s.v}</p>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-3 gap-8">
                <div className="bg-white p-10 rounded-[40px] shadow-sm border border-slate-100 flex flex-col h-[420px]">
                    <h3 className="font-black uppercase tracking-widest text-[10px] text-slate-400 mb-4 border-b pb-4">Voter Sentiment</h3>
                    <div className="w-full relative h-[320px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={[{ name: 'UDF', value: dashboardStats.sentiment?.UDF || 0 }, { name: 'LDF', value: dashboardStats.sentiment?.LDF || 0 }, { name: 'NDA', value: dashboardStats.sentiment?.NDA || 0 }, { name: 'Neutral', value: dashboardStats.sentiment?.Neutral || 0 }].filter(d => d.value > 0)}
                                    innerRadius={65}
                                    outerRadius={90}
                                    paddingAngle={8}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {['#3b82f6', '#ef4444', '#f97316', '#64748b'].map((color, index) => <Cell key={`cell-${index}`} fill={color} />)}
                                </Pie>
                                <Tooltip contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }} />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pt-4">
                            <span className="text-3xl font-black text-slate-800">{dashboardStats.total}</span>
                            <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Voters</span>
                        </div>
                    </div>
                    <div className="grid grid-cols-4 gap-2 mt-4">
                        {[{ l: 'UDF', c: '#3b82f6', v: dashboardStats.sentiment?.UDF || 0 }, { l: 'LDF', c: '#ef4444', v: dashboardStats.sentiment?.LDF || 0 }, { l: 'NDA', c: '#f97316', v: dashboardStats.sentiment?.NDA || 0 }, { l: 'Neutral', c: '#64748b', v: dashboardStats.sentiment?.Neutral || 0 }].map(s => (
                            <div key={s.l} className="text-center">
                                <div className="w-2 h-2 rounded-full mx-auto mb-1" style={{ backgroundColor: s.c }}></div>
                                <p className="text-[9px] font-black text-slate-400 uppercase">{s.l}</p>
                                <p className="text-xs font-black">{s.v}</p>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-white p-10 rounded-[40px] shadow-sm border border-slate-100 flex flex-col h-[420px]">
                    <h3 className="font-black uppercase tracking-widest text-[10px] text-slate-400 mb-4 border-b pb-4">Geographical Logistics</h3>
                    <div className="w-full h-[320px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <RadialBarChart cx="50%" cy="50%" innerRadius="30%" outerRadius="100%" barSize={15} data={[{ name: 'Local', value: dashboardStats.location?.local || 0, fill: '#10b981' }, { name: 'Abroad', value: dashboardStats.location?.abroad || 0, fill: '#3b82f6' }, { name: 'State', value: dashboardStats.location?.state || 0, fill: '#f59e0b' }, { name: 'District', value: dashboardStats.location?.district || 0, fill: '#64748b' }]}>
                                <RadialBar background dataKey="value" cornerRadius={10} />
                                <Tooltip contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }} />
                            </RadialBarChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="space-y-1">
                        {[{ l: 'Local', v: dashboardStats.location?.local || 0, c: '#10b981' }, { l: 'Abroad', v: dashboardStats.location?.abroad || 0, c: '#3b82f6' }, { l: 'Other State', v: dashboardStats.location?.state || 0, c: '#f59e0b' }, { l: 'Other District', v: dashboardStats.location?.district || 0, c: '#64748b' }].map(i => (
                            <div key={i.l} className="flex justify-between items-center text-[10px]">
                                <span className="font-bold text-slate-400 uppercase">{i.l}</span>
                                <span className="font-black" style={{ color: i.c }}>{i.v}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-indigo-600 text-white p-10 rounded-[40px] shadow-xl relative overflow-hidden flex flex-col justify-between h-[420px]">
                    <div className="relative z-10">
                        <h3 className="font-black uppercase tracking-widest text-[10px] opacity-60 mb-8">Outreach Coverage</h3>
                        <div className="flex items-baseline gap-2">
                            <span className="text-6xl font-black tracking-tighter">{dashboardStats.outreach?.with_phone || 0}</span>
                            <span className="text-lg font-bold opacity-60 uppercase">Collected</span>
                        </div>
                        <p className="text-[10px] font-black uppercase mt-4 tracking-widest opacity-60 italic">"Target: Digital saturation of local voters"</p>
                    </div>
                    <div className="relative z-10">
                        <div className="flex justify-between items-end mb-2">
                            <span className="text-4xl font-black tracking-tighter">{Math.round(((dashboardStats.outreach?.with_phone || 0) / (dashboardStats.total || 1)) * 100)}%</span>
                            <span className="text-[10px] uppercase font-black opacity-60">Efficiency</span>
                        </div>
                        <div className="h-4 bg-indigo-800 rounded-full overflow-hidden shadow-inner">
                            <div className="h-full bg-white transition-all duration-1000" style={{ width: `${((dashboardStats.outreach?.with_phone || 0) / (dashboardStats.total || 1)) * 100}%` }}></div>
                        </div>
                    </div>
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20 blur-3xl"></div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-8">
                <div className="bg-white p-10 rounded-[40px] shadow-sm border border-slate-100 h-[280px] flex gap-10">
                    <div className="w-1/3 flex flex-col">
                        <h3 className="font-black uppercase tracking-widest text-[10px] text-slate-400 mb-6 border-b pb-4">Ground Status</h3>
                        <div className="flex-1 flex flex-col justify-center">
                            <span className="text-5xl font-black text-slate-800 tracking-tighter">{Math.round(((dashboardStats.tagging_progress || 0) / (dashboardStats.total || 1)) * 100)}%</span>
                            <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Verified Tags</span>
                        </div>
                    </div>
                    <div className="flex-1 flex items-center justify-center p-4 bg-slate-50 rounded-[30px] border border-slate-100 shadow-inner">
                        <div className="text-center space-y-2">
                            <p className="text-[10px] font-black uppercase text-slate-400">Total Tagged Records</p>
                            <p className="text-4xl font-black text-slate-900">{dashboardStats.tagging_progress || 0}</p>
                            <div className="w-16 h-1.5 bg-emerald-500 mx-auto rounded-full"></div>
                        </div>
                    </div>
                </div>
                <div className="bg-emerald-600 text-white p-10 rounded-[40px] shadow-xl flex flex-col justify-between h-[280px]">
                    <div>
                        <h3 className="font-black uppercase tracking-widest text-[10px] opacity-60 mb-8">Work Strategy</h3>
                        <h2 className="text-4xl font-black uppercase tracking-tighter leading-tight">Focus on Neutral Voters</h2>
                        <p className="text-sm font-bold opacity-80 mt-2 max-w-sm">Targeting <span className="text-white underline decoration-amber-400 decoration-4 underline-offset-4 font-black">{dashboardStats?.sentiment?.Neutral || 0} neutral voters</span> can flip the results.</p>
                    </div>
                    <button onClick={() => { setListFilters({ ...listFilters, leaning: 'NEUTRAL' }); setView('voters'); }} className="w-fit bg-white text-emerald-600 px-10 py-4 rounded-2xl font-black uppercase text-[11px] tracking-widest shadow-lg hover:scale-105 transition-all">Filter Neutral List</button>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-8 pb-12">
                <div className="bg-white p-10 rounded-[40px] shadow-sm border border-slate-100 col-span-2 h-[450px] flex flex-col">
                    <h3 className="font-black uppercase tracking-widest text-[10px] text-slate-400 mb-10 border-b pb-4">Voter Age Brackets</h3>
                    <div className="w-full h-[400px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={dashboardStats?.age_dist ? Object.entries(dashboardStats.age_dist).map(([label, count]) => ({ name: label.replace('_', '-'), voters: count })) : []} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                                <defs><linearGradient id="ageColor" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#4f46e5" stopOpacity={0.8} /><stop offset="95%" stopColor="#4f46e5" stopOpacity={0.2} /></linearGradient></defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900, fill: '#94a3b8' }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900, fill: '#94a3b8' }} />
                                <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }} />
                                <Bar dataKey="voters" fill="url(#ageColor)" radius={[10, 10, 0, 0]} barSize={40}><LabelList dataKey="voters" position="top" style={{ fontSize: 10, fontWeight: 900, fill: '#4f46e5' }} /></Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                <div className="flex flex-col gap-6 h-[450px]">
                    <div className="bg-slate-900 text-white p-8 rounded-[32px] shadow-2xl relative overflow-hidden flex-1 flex flex-col justify-between">
                        <div className="z-10 relative">
                            <h3 className="font-black uppercase tracking-widest text-[9px] text-slate-500 mb-1">Data Acquisition</h3>
                            <h4 className="text-xl font-black uppercase tracking-tighter">Expand Booths</h4>
                            <button onClick={() => setView('engine')} className="mt-4 bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:scale-105 transition-all">Launch Engine ⚡</button>
                        </div>
                        <div className="absolute -right-10 -top-10 w-40 h-40 bg-indigo-600/10 rounded-full blur-[60px]"></div>
                    </div>
                    <div className="bg-emerald-600 text-white p-8 rounded-[32px] shadow-xl relative overflow-hidden flex-1 flex flex-col justify-between">
                        <div className="z-10 relative">
                            <h3 className="font-black uppercase tracking-widest text-[9px] text-white/50 mb-1">Outreach Engine</h3>
                            <h4 className="text-xl font-black uppercase tracking-tighter">Comm Hub</h4>
                            <button onClick={() => setView('comm')} className="mt-4 bg-white text-emerald-600 px-6 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:scale-105 transition-all">Start Broadcast 📣</button>
                        </div>
                        <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full blur-[60px]"></div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
