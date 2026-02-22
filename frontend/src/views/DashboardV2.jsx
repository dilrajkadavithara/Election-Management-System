import React from 'react';
import {
    PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
    BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';

const RADIAN = Math.PI / 180;

// 🧊 3D Effect Definitions Helper
const ChartDefs = () => (
    <defs>
        <filter id="shadow" height="200%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="3" />
            <feOffset dx="2" dy="4" result="offsetblur" />
            <feComponentTransfer>
                <feFuncA type="linear" slope="0.5" />
            </feComponentTransfer>
            <feMerge>
                <feMergeNode />
                <feMergeNode in="SourceGraphic" />
            </feMerge>
        </filter>
        {/* Party Gradients */}
        <radialGradient id="gradUDF" cx="50%" cy="50%" r="80%" fx="50%" fy="50%">
            <stop offset="0%" stopColor="#60a5fa" />
            <stop offset="100%" stopColor="#1d4ed8" />
        </radialGradient>
        <radialGradient id="gradLDF" cx="50%" cy="50%" r="80%" fx="50%" fy="50%">
            <stop offset="0%" stopColor="#fb7185" />
            <stop offset="100%" stopColor="#be123c" />
        </radialGradient>
        <radialGradient id="gradNDA" cx="50%" cy="50%" r="80%" fx="50%" fy="50%">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#b45309" />
        </radialGradient>
        <radialGradient id="gradNEU" cx="50%" cy="50%" r="80%" fx="50%" fy="50%">
            <stop offset="0%" stopColor="#94a3b8" />
            <stop offset="100%" stopColor="#334155" />
        </radialGradient>
        {/* Bar Gradients */}
        <linearGradient id="barUDF" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#1e40af" />
            <stop offset="50%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#1e40af" />
        </linearGradient>
        <linearGradient id="barLDF" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#9f1239" />
            <stop offset="50%" stopColor="#f43f5e" />
            <stop offset="100%" stopColor="#9f1239" />
        </linearGradient>
        <linearGradient id="barNDA" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#92400e" />
            <stop offset="50%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#92400e" />
        </linearGradient>
        <linearGradient id="barNEU" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#1e293b" />
            <stop offset="50%" stopColor="#64748b" />
            <stop offset="100%" stopColor="#1e293b" />
        </linearGradient>
    </defs>
);

const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.6;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
        <g>
            <text x={x} y={y - 8} fill="white" textAnchor="middle" dominantBaseline="central" className="text-[10px] font-black uppercase tracking-widest pointer-events-none" style={{ filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.5))' }}>
                {name}
            </text>
            <text x={x} y={y + 8} fill="white" textAnchor="middle" dominantBaseline="central" className="text-[11px] font-black pointer-events-none" style={{ filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.5))' }}>
                {`${(percent * 100).toFixed(0)}%`}
            </text>
        </g>
    );
};

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
                <p className="font-black uppercase tracking-[0.4em] text-xs text-indigo-400">Loading Dashboard Data...</p>
            </div>
        </div>
    );

    const activeArea = dashFilters.constituency ? allLocations.find(c => String(c.id) === String(dashFilters.constituency))?.name : 'Constituency Overview';

    // Simplified Winning Chance based on Confirmed Voters
    const decisive = dashboardStats.decisive_stats || { total: 0, UDF: 0, LDF: 0, NDA: 0, NEUTRAL: 0 };
    const confirmedSupporters = decisive[perspective] || 0;
    const totalConfirmed = decisive.total || 1; // Avoid division by zero

    const winProbability = Math.min(100, Math.round((confirmedSupporters / totalConfirmed) * 100));
    const margin = confirmedSupporters - Math.ceil(totalConfirmed * 0.51); // Margin to simple majority

    return (
        <div className="min-h-screen lux-mesh-bg p-12 pl-96 space-y-12 lux-animate-in">
            <header className="flex justify-between items-center border-b border-white/5 pb-10">
                <div>
                    <h1 className="text-6xl font-black tracking-tighter uppercase leading-none">
                        Main <span className="lux-text-gradient">Dashboard</span>
                    </h1>
                    <div className="flex items-center gap-3 mt-4">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_#10b981]" />
                        <p className="text-slate-300 font-black uppercase tracking-[0.4em] text-[10px]">
                            {activeArea} Live Status
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-8">
                    <button
                        onClick={() => setView('warroom')}
                        className="bg-rose-600 hover:bg-rose-500 text-white px-8 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-[0_0_30px_rgba(225,29,72,0.3)] transition-all flex items-center gap-3 group animate-pulse hover:animate-none"
                    >
                        <span>⚔️</span>
                        <span>ENTER WAR ROOM</span>
                    </button>

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

                    {/* Constituency Filter */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-[8px] font-black uppercase text-slate-500 tracking-widest ml-1">Constituency</label>
                        <select
                            className="lux-glass text-white border border-white/10 rounded-2xl px-8 py-3.5 text-[10px] font-black uppercase tracking-widest focus:ring-0 cursor-pointer hover:bg-white/10 transition-all outline-none min-w-[200px]"
                            value={dashFilters.constituency}
                            onChange={(e) => setDashFilters({ ...dashFilters, constituency: e.target.value, lb: '', booth: '' })}
                        >
                            <option value="" className="bg-slate-900">Global View</option>
                            {allLocations.map(c => <option key={c.id} value={c.id} className="bg-slate-900">{c.name}</option>)}
                        </select>
                    </div>

                    {/* Local Body Filter */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-[8px] font-black uppercase text-slate-500 tracking-widest ml-1">Panchayat / Municipality</label>
                        <select
                            disabled={!dashFilters.constituency}
                            className="lux-glass text-white border border-white/10 rounded-2xl px-8 py-3.5 text-[10px] font-black uppercase tracking-widest focus:ring-0 cursor-pointer hover:bg-white/10 transition-all outline-none min-w-[200px] disabled:opacity-20"
                            value={dashFilters.lb}
                            onChange={(e) => setDashFilters({ ...dashFilters, lb: e.target.value, booth: '' })}
                        >
                            <option value="" className="bg-slate-900">All Areas</option>
                            {allLocations.find(c => String(c.id) === String(dashFilters.constituency))?.local_bodies?.map(lb => (
                                <option key={lb.id} value={lb.id} className="bg-slate-900">{lb.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Booth Filter */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-[8px] font-black uppercase text-slate-500 tracking-widest ml-1">Booth</label>
                        <select
                            disabled={!dashFilters.lb}
                            className="lux-glass text-white border border-white/10 rounded-2xl px-8 py-3.5 text-[10px] font-black uppercase tracking-widest focus:ring-0 cursor-pointer hover:bg-white/10 transition-all outline-none min-w-[200px] disabled:opacity-20"
                            value={dashFilters.booth}
                            onChange={(e) => setDashFilters({ ...dashFilters, booth: e.target.value })}
                        >
                            <option value="" className="bg-slate-900">All Booths</option>
                            {allLocations.find(c => String(c.id) === String(dashFilters.constituency))?.local_bodies?.find(lb => String(lb.id) === String(dashFilters.lb))?.booths?.map(b => (
                                <option key={b.id} value={b.id} className="bg-slate-900">Booth {b.number} - {b.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </header>

            {/* 📋 KEY SNAPSHOT ROW */}
            <div className="grid grid-cols-4 gap-8">
                {[
                    { label: 'Total Voters', value: (dashboardStats.total || 0).toLocaleString(), icon: '👥', color: 'text-white' },
                    { label: 'Total Digitized', value: (dashboardStats.tagging_progress || 0).toLocaleString(), icon: '💎', color: 'text-indigo-400' },
                    { label: 'Male Voters', value: (dashboardStats.gender?.male || 0).toLocaleString(), icon: '🛡️', color: 'text-blue-400' },
                    { label: 'Female Voters', value: (dashboardStats.gender?.female || 0).toLocaleString(), icon: '✨', color: 'text-rose-400' }
                ].map((stat, i) => (
                    <div key={i} className="lux-card p-8 flex items-center gap-6 border-white/5 shadow-xl bg-slate-900/40">
                        <div className="text-4xl bg-white/5 w-16 h-16 rounded-2xl flex items-center justify-center border border-white/5 shadow-inner">
                            {stat.icon}
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{stat.label}</p>
                            <p className={`text-3xl font-black tracking-tighter ${stat.color}`}>{stat.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* 🎯 WINNING CHANCE & LOYALTY */}
            <div className="grid grid-cols-12 gap-10">
                <div className="col-span-12 grid grid-cols-2 gap-10">
                    <div className="lux-card flex flex-col items-center justify-center p-12 text-center bg-indigo-600/5 border-indigo-500/20 shadow-[0_0_50px_rgba(99,102,241,0.1)] relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-[100px] -mr-32 -mt-32" />
                        <h3 className="font-black uppercase tracking-[0.3em] text-[10px] text-indigo-400 mb-10">Winning Chance</h3>
                        <div className="flex items-center gap-16">
                            <div className="relative flex items-center justify-center h-48 w-48">
                                <svg className="w-full h-full transform -rotate-90">
                                    <circle className="text-white/5" strokeWidth="10" stroke="currentColor" fill="transparent" r="80" cx="96" cy="96" />
                                    <circle className={winProbability > 40 ? "text-emerald-500" : "text-rose-500"} strokeWidth="10" strokeDasharray={2 * Math.PI * 80} strokeDashoffset={2 * Math.PI * 80 * (1 - winProbability / 100)} strokeLinecap="round" stroke="currentColor" fill="transparent" r="80" cx="96" cy="96" style={{ filter: `drop-shadow(0 0 15px ${winProbability > 40 ? '#10b981' : '#f43f5e'})`, transition: 'all 1s ease-out' }} />
                                </svg>
                                <div className="absolute flex flex-col items-center justify-center">
                                    <span className={`text-5xl font-black tracking-tighter ${winProbability > 40 ? 'text-emerald-400' : 'text-rose-400'}`}>{winProbability}%</span>
                                    <span className="text-[8px] font-black uppercase text-slate-400 tracking-[0.4em] mt-1">Win Share</span>
                                </div>
                            </div>
                            <div className="space-y-6 text-left">
                                <div>
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Confirmed Supporters</p>
                                    <p className="text-3xl font-black text-emerald-400">{confirmedSupporters}</p>
                                </div>
                                <div>
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Confirmed Voters</p>
                                    <p className="text-3xl font-black text-indigo-400">{totalConfirmed}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="lux-card bg-gradient-to-br from-indigo-600/10 to-transparent border-indigo-500/20 shadow-2xl p-12 flex flex-col items-center justify-center">
                        <h3 className="font-black uppercase tracking-[0.3em] text-[10px] text-indigo-400 mb-4 border-b border-white/5 pb-4 w-full text-center">Alliance Breakdown</h3>

                        <div className="h-80 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <ChartDefs />
                                    <Pie
                                        data={[
                                            { name: 'UDF', value: dashboardStats.sentiment?.UDF || 0 },
                                            { name: 'LDF', value: dashboardStats.sentiment?.LDF || 0 },
                                            { name: 'NDA', value: dashboardStats.sentiment?.NDA || 0 },
                                            { name: 'NEU', value: dashboardStats.sentiment?.NEUTRAL || 0 }
                                        ]}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        label={renderCustomizedLabel}
                                        innerRadius={0}
                                        outerRadius={130}
                                        paddingAngle={0}
                                        dataKey="value"
                                        stroke="rgba(255,255,255,0.1)"
                                        strokeWidth={1}
                                        style={{ filter: 'url(#shadow)' }}
                                    >
                                        <Cell fill="url(#gradUDF)" />
                                        <Cell fill="url(#gradLDF)" />
                                        <Cell fill="url(#gradNDA)" />
                                        <Cell fill="url(#gradNEU)" />
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ background: 'rgba(15, 23, 42, 0.9)', borderRadius: '1rem', border: '1px solid rgba(255,255,255,0.2)', fontSize: '12px', fontWeight: '900', color: '#fff' }}
                                        itemStyle={{ color: '#fff' }}
                                        formatter={(value) => [`${value.toLocaleString()} Voters`, 'Total Strength']}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </div>

            {/* 📊 DEMOGRAPHIC PILLARS */}
            <div className="grid grid-cols-2 gap-10">
                {/* Age Profile Pillar */}
                <div className="lux-card p-10 bg-slate-900/40 border-white/5 shadow-2xl">
                    <h3 className="font-black uppercase tracking-[0.3em] text-[10px] text-indigo-400 mb-8 border-b border-white/5 pb-4">Age Profile (Political Split)</h3>
                    <div className="h-[350px] w-full mt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={Object.entries(dashboardStats.age_split || {}).map(([age, leanings]) => ({
                                name: age,
                                ...leanings
                            }))}>
                                <ChartDefs />
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900, fill: '#64748b' }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900, fill: '#64748b' }} />
                                <Tooltip
                                    cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                                    contentStyle={{ background: '#0f172a', borderRadius: '1.5rem', border: '1px solid rgba(255,255,255,0.2)', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.5)' }}
                                    labelStyle={{ color: '#f8fafc', fontWeight: 'bold', marginBottom: '8px', display: 'block' }}
                                    itemStyle={{ fontSize: '10px', textTransform: 'uppercase', color: '#fff', fontWeight: 'bold' }}
                                    formatter={(value) => [`${value} Voters`]}
                                />
                                <Bar dataKey="UDF" stackId="a" fill="url(#barUDF)" radius={[0, 0, 0, 0]} barSize={50} />
                                <Bar dataKey="LDF" stackId="a" fill="url(#barLDF)" radius={[0, 0, 0, 0]} />
                                <Bar dataKey="NDA" stackId="a" fill="url(#barNDA)" radius={[0, 0, 0, 0]} />
                                <Bar dataKey="NEUTRAL" stackId="a" fill="url(#barNEU)" radius={[12, 12, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Gender Alignment Pillar */}
                <div className="lux-card p-10 bg-slate-900/40 border-white/5 shadow-2xl">
                    <h3 className="font-black uppercase tracking-[0.3em] text-[10px] text-indigo-400 mb-8 border-b border-white/5 pb-4">Gender Alignment (Political Split)</h3>
                    <div className="h-[350px] w-full mt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart layout="vertical" data={Object.entries(dashboardStats.gender_split || {}).map(([gender, leanings]) => ({
                                name: gender,
                                ...leanings
                            }))}>
                                <ChartDefs />
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.05)" />
                                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900, fill: '#64748b' }} />
                                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900, fill: '#64748b' }} width={80} />
                                <Tooltip
                                    cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                                    contentStyle={{ background: '#0f172a', borderRadius: '1.5rem', border: '1px solid rgba(255,255,255,0.2)', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.5)' }}
                                    labelStyle={{ color: '#f8fafc', fontWeight: 'bold', marginBottom: '8px', display: 'block' }}
                                    itemStyle={{ fontSize: '10px', textTransform: 'uppercase', color: '#fff', fontWeight: 'bold' }}
                                    formatter={(value) => [`${value} Voters`]}
                                />
                                <Bar dataKey="UDF" stackId="a" fill="url(#barUDF)" barSize={50} />
                                <Bar dataKey="LDF" stackId="a" fill="url(#barLDF)" />
                                <Bar dataKey="NDA" stackId="a" fill="url(#barNDA)" />
                                <Bar dataKey="NEUTRAL" stackId="a" fill="url(#barNEU)" radius={[0, 12, 12, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* 📊 BOOTH SUPPORT OVERVIEW (PUSHED TO BOTTOM) */}
            <div className="lux-card flex flex-col relative overflow-hidden border-white/5 shadow-2xl p-10 bg-slate-900/20 backdrop-blur-3xl">
                <div className="lux-tactical-corner-tl" />
                <div className="lux-tactical-corner-tr" />
                <div className="flex justify-between items-start mb-10 relative z-10">
                    <div>
                        <h3 className="font-black uppercase tracking-[0.3em] text-[10px] text-indigo-400 mb-2 italic tracking-widest">Detail View</h3>
                        <h2 className="text-4xl font-black uppercase tracking-tighter">Booth Support Overview</h2>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] font-black text-slate-300 tracking-[0.2em] mb-1 uppercase">Total Units</p>
                        <p className="text-2xl font-black text-indigo-400">{strategicStats.booth_stats?.length || 0}</p>
                    </div>
                </div>

                <div className="grid grid-cols-5 gap-6 flex-1 relative z-10 overflow-y-auto max-h-[800px] pr-4 custom-scrollbar">
                    {strategicStats.booth_stats?.map((booth, i) => {
                        const pStrength = booth[perspective.toLowerCase()] || 0;
                        const pCoverage = Math.round((pStrength / booth.total) * 100);
                        return (
                            <div key={i} onClick={() => { setListFilters({ ...listFilters, booth: booth.id }); setView('voters'); }} className="lux-glass group p-6 rounded-[1.5rem] border-white/5 transition-all duration-500 hover:bg-white/10 cursor-pointer shadow-lg relative perspective-1000">
                                {/* Booth Data Tooltip */}
                                <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-48 lux-glass bg-slate-900 p-4 rounded-2xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-300 z-50 border-indigo-500/30 -translate-y-2 group-hover:translate-y-0 shadow-[0_0_30px_rgba(0,0,0,0.8)]">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="text-[7px] font-black uppercase tracking-widest text-blue-400">UDF: <span className="text-white ml-1">{booth.udf}</span></div>
                                        <div className="text-[7px] font-black uppercase tracking-widest text-rose-400">LDF: <span className="text-white ml-1">{booth.ldf}</span></div>
                                        <div className="text-[7px] font-black uppercase tracking-widest text-amber-500">NDA: <span className="text-white ml-1">{booth.nda}</span></div>
                                        <div className="text-[7px] font-black uppercase tracking-widest text-slate-200">NEU: <span className="text-white ml-1">{booth.neutral}</span></div>
                                    </div>
                                    <div className="absolute bottom-[-6px] left-1/2 -translate-x-1/2 w-3 h-3 bg-slate-900 rotate-45 border-r border-b border-indigo-500/30" />
                                </div>

                                <span className="text-[8px] font-black px-3 py-1 bg-white/5 text-slate-400 rounded-full mb-4 inline-block group-hover:bg-indigo-500 group-hover:text-white transition-all tracking-widest uppercase">Booth {booth.number}</span>
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-200 line-clamp-1 mb-6">{booth.name}</h4>
                                <div className="space-y-3">
                                    <div className="flex justify-between text-[8px] font-black uppercase tracking-widest text-slate-300">
                                        <span>Support Level</span>
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

            <div className="grid grid-cols-4 gap-10 pb-16">
                {[
                    { l: 'Voters Away (NRI)', v: '-14%', c: 'text-amber-400', i: '✈️', d: 'People currently out of town' },
                    { l: 'Complete Data', v: '92%', c: 'text-emerald-400', i: '💎', d: 'Percentage of voters verified' },
                    { l: 'Undecided Voters', v: dashboardStats.sentiment?.NEUTRAL || 0, c: 'text-indigo-400', i: '⚖️', d: 'Voters with no fixed leaning' },
                    { l: 'Young Voters', v: '78%', c: 'text-purple-400', i: '🎓', d: 'Ages 18-25 coverage' }
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
