import React from 'react';
import {
    PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
    BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';

const RADIAN = Math.PI / 180;

// 🧊 3D Effect Definitions Helper
const ChartDefs = () => (
    <defs>
        <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="3" result="blur" />
            <feFlood floodColor="#6366f1" floodOpacity="0.4" result="color" />
            <feComposite in="color" in2="blur" operator="in" />
            <feMerge>
                <feMergeNode />
                <feMergeNode in="SourceGraphic" />
            </feMerge>
        </filter>
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
        <radialGradient id="gradUDF" cx="50%" cy="30%" r="80%">
            <stop offset="0%" stopColor="#818cf8" />
            <stop offset="100%" stopColor="#312e81" />
        </radialGradient>
        <radialGradient id="gradLDF" cx="50%" cy="30%" r="80%">
            <stop offset="0%" stopColor="#fb7185" />
            <stop offset="100%" stopColor="#881337" />
        </radialGradient>
        <radialGradient id="gradNDA" cx="50%" cy="30%" r="80%">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#78350f" />
        </radialGradient>
        <radialGradient id="gradNEU" cx="50%" cy="30%" r="80%">
            <stop offset="0%" stopColor="#94a3b8" />
            <stop offset="100%" stopColor="#1e293b" />
        </radialGradient>
        {/* Depth Gradients */}
        <linearGradient id="depthUDF" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#1e1b4b" /><stop offset="100%" stopColor="#000000" /></linearGradient>
        <linearGradient id="depthLDF" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#4c0519" /><stop offset="100%" stopColor="#000000" /></linearGradient>
        <linearGradient id="depthNDA" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#451a03" /><stop offset="100%" stopColor="#000000" /></linearGradient>
        <linearGradient id="depthNEU" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#0f172a" /><stop offset="100%" stopColor="#000000" /></linearGradient>
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
        <div className="min-h-screen lux-mesh-bg p-12 pl-[420px] pr-16 space-y-16 lux-animate-in">
            <header className="flex flex-wrap justify-between items-center gap-10 border-b border-white/5 pb-10">
                <div>
                    <h1 className="text-7xl font-black tracking-tighter uppercase leading-none">
                        Main <span className="lux-text-gradient">Dashboard</span>
                    </h1>
                    <div className="flex items-center gap-3 mt-4">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_#10b981]" />
                        <p className="text-slate-300 font-black uppercase tracking-[0.4em] text-[10px]">
                            {activeArea} Live Status
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-6">
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
                    <div className="flex flex-col gap-1.5 min-w-[150px] flex-1">
                        <label className="text-[8px] font-black uppercase text-slate-500 tracking-widest ml-1">Constituency</label>
                        <select
                            className="lux-glass text-white border border-white/10 rounded-2xl px-6 py-3.5 text-[10px] font-black uppercase tracking-widest focus:ring-0 cursor-pointer hover:bg-white/10 transition-all outline-none w-full"
                            value={dashFilters.constituency}
                            onChange={(e) => setDashFilters({ ...dashFilters, constituency: e.target.value, lb: '', booth: '' })}
                        >
                            <option value="" className="bg-slate-900">Global View</option>
                            {allLocations.map(c => <option key={c.id} value={c.id} className="bg-slate-900">{c.name}</option>)}
                        </select>
                    </div>

                    {/* Local Body Filter */}
                    <div className="flex flex-col gap-1.5 min-w-[150px] flex-1">
                        <label className="text-[8px] font-black uppercase text-slate-500 tracking-widest ml-1">Area</label>
                        <select
                            disabled={!dashFilters.constituency}
                            className="lux-glass text-white border border-white/10 rounded-2xl px-6 py-3.5 text-[10px] font-black uppercase tracking-widest focus:ring-0 cursor-pointer hover:bg-white/10 transition-all outline-none w-full disabled:opacity-20"
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
                    <div className="flex flex-col gap-1.5 min-w-[150px] flex-1">
                        <label className="text-[8px] font-black uppercase text-slate-500 tracking-widest ml-1">Booth</label>
                        <select
                            disabled={!dashFilters.lb}
                            className="lux-glass text-white border border-white/10 rounded-2xl px-6 py-3.5 text-[10px] font-black uppercase tracking-widest focus:ring-0 cursor-pointer hover:bg-white/10 transition-all outline-none w-full disabled:opacity-20"
                            value={dashFilters.booth}
                            onChange={(e) => setDashFilters({ ...dashFilters, booth: e.target.value })}
                        >
                            <option value="" className="bg-slate-900">All Booths</option>
                            {allLocations.find(c => String(c.id) === String(dashFilters.constituency))?.local_bodies?.find(lb => String(lb.id) === String(dashFilters.lb))?.booths?.map(b => (
                                <option key={b.id} value={b.id} className="bg-slate-900">Booth {b.number}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </header>

            {/* 📋 KEY SNAPSHOT ROW 1 */}
            <div className="grid grid-cols-3 gap-8">
                {[
                    { label: 'Total Voters', value: (dashboardStats.total || 0).toLocaleString(), icon: '👥', color: 'text-white' },
                    { label: 'Total Digitized', value: (dashboardStats.tagging_progress || 0).toLocaleString(), icon: '💎', color: 'text-indigo-400' },
                    { label: 'Neutral Voters', value: (dashboardStats.sentiment?.NEUTRAL || 0).toLocaleString(), icon: '⚖️', color: 'text-amber-400' },
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

            {/* 📋 KEY SNAPSHOT ROW 2 */}
            <div className="grid grid-cols-3 gap-8">
                {[
                    { label: 'Male Voters', value: (dashboardStats.gender?.male || 0).toLocaleString(), icon: '🛡️', color: 'text-blue-400' },
                    { label: 'Female Voters', value: (dashboardStats.gender?.female || 0).toLocaleString(), icon: '✨', color: 'text-rose-400' },
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

                {/* Supporters Breakdown Card */}
                <div className="lux-card p-8 flex flex-col gap-4 border-white/5 shadow-xl bg-slate-900/40">
                    <div className="flex items-center gap-4 mb-2">
                        <div className="text-4xl bg-white/5 w-16 h-16 rounded-2xl flex items-center justify-center border border-white/5 shadow-inner">🏛️</div>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Supporters</p>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-xs font-black uppercase tracking-widest text-blue-400">UDF</span>
                        <span className="text-2xl font-black tracking-tighter text-white">{(dashboardStats.sentiment?.UDF || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-xs font-black uppercase tracking-widest text-rose-400">LDF</span>
                        <span className="text-2xl font-black tracking-tighter text-white">{(dashboardStats.sentiment?.LDF || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-xs font-black uppercase tracking-widest text-amber-500">NDA</span>
                        <span className="text-2xl font-black tracking-tighter text-white">{(dashboardStats.sentiment?.NDA || 0).toLocaleString()}</span>
                    </div>
                </div>
            </div>

            {/* 🎯 MIDDLE INTEL ROW */}
            <div className="grid grid-cols-3 gap-6">
                {/* 1. Winning Chance */}
                <div className="lux-glass rounded-[2rem] !p-4 flex flex-col bg-indigo-600/5 border border-indigo-500/20 shadow-[0_0_50px_rgba(99,102,241,0.1)] relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-[100px] -mr-32 -mt-32" />
                    <h3 className="font-black uppercase tracking-[0.3em] text-[10px] text-indigo-400 mb-2 border-b border-white/5 pb-2 text-center">{perspective} Winning Chance</h3>
                    <div className="flex items-center gap-6">
                        {/* Gauge */}
                        <div className="relative flex items-center justify-center shrink-0" style={{ width: 150, height: 150 }}>
                            <svg viewBox="0 0 200 200" className="w-full h-full transform -rotate-90">
                                <circle className="text-white/5" strokeWidth="12" stroke="currentColor" fill="transparent" r="80" cx="100" cy="100" />
                                <circle className={winProbability > 40 ? "text-emerald-500" : "text-rose-500"} strokeWidth="12" strokeDasharray={2 * Math.PI * 80} strokeDashoffset={2 * Math.PI * 80 * (1 - winProbability / 100)} strokeLinecap="round" stroke="currentColor" fill="transparent" r="80" cx="100" cy="100" style={{ filter: `drop-shadow(0 0 15px ${winProbability > 40 ? '#10b981' : '#f43f5e'})`, transition: 'all 1s ease-out' }} />
                            </svg>
                            <div className="absolute flex flex-col items-center justify-center">
                                <span className={`text-4xl font-black tracking-tighter ${winProbability > 40 ? 'text-emerald-400' : 'text-rose-400'}`}>{winProbability}%</span>
                                <span className="text-[7px] font-black uppercase text-slate-400 tracking-[0.3em] mt-1">Win Share</span>
                            </div>
                        </div>

                        {/* Stats */}
                        <div className="flex-1 space-y-2">
                            <div className="flex justify-between items-center">
                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{perspective} Supporters</span>
                                <span className="text-base font-black text-emerald-400">{confirmedSupporters.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Total Tagged</span>
                                <span className="text-base font-black text-indigo-400">{totalConfirmed.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Majority Needed</span>
                                <span className="text-base font-black text-amber-400">{Math.ceil(totalConfirmed * 0.51).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center border-t border-white/10 pt-2">
                                <span className="text-[8px] font-black uppercase tracking-widest text-white">Margin</span>
                                <span className={`text-base font-black ${margin >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{margin >= 0 ? '+' : ''}{margin.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. Alliance Breakdown */}
                <div className="lux-glass rounded-[2rem] !p-4 bg-gradient-to-br from-indigo-600/10 to-transparent border border-indigo-500/20 shadow-2xl flex flex-col items-center">
                    <h3 className="font-black uppercase tracking-[0.3em] text-[10px] text-indigo-400 mb-0 border-b border-white/5 pb-2 w-full text-center">Alliance Breakdown</h3>

                    <div className="flex-1 w-full" style={{ minHeight: 0 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                                <ChartDefs />
                                {/* 3D Shadow/Depth Layer */}
                                <Pie
                                    data={[
                                        { name: 'UDF', value: dashboardStats.sentiment?.UDF || 0 },
                                        { name: 'LDF', value: dashboardStats.sentiment?.LDF || 0 },
                                        { name: 'NDA', value: dashboardStats.sentiment?.NDA || 0 },
                                        { name: 'NEU', value: dashboardStats.sentiment?.NEUTRAL || 0 }
                                    ]}
                                    cx="50%" cy="50%" innerRadius="58%" outerRadius="95%"
                                    dataKey="value" stroke="none" paddingAngle={0}
                                    isAnimationActive={false}
                                >
                                    {[...Array(4)].map((_, i) => <Cell key={i} fill="rgba(0,0,0,0.5)" style={{ filter: 'blur(3px)' }} />)}
                                </Pie>

                                {/* Main Glass Pillar Ring */}
                                <Pie
                                    data={[
                                        { name: 'UDF', value: dashboardStats.sentiment?.UDF || 0 },
                                        { name: 'LDF', value: dashboardStats.sentiment?.LDF || 0 },
                                        { name: 'NDA', value: dashboardStats.sentiment?.NDA || 0 },
                                        { name: 'NEU', value: dashboardStats.sentiment?.NEUTRAL || 0 }
                                    ]}
                                    cx="50%" cy="50%" innerRadius="55%" outerRadius="98%"
                                    dataKey="value" stroke="rgba(255,255,255,0.15)" strokeWidth={1}
                                    paddingAngle={3} labelLine={false} label={renderCustomizedLabel}
                                    isAnimationActive={false}
                                    style={{ filter: 'url(#neonGlow)' }}
                                >
                                    <Cell fill="url(#gradUDF)" />
                                    <Cell fill="url(#gradLDF)" />
                                    <Cell fill="url(#gradNDA)" />
                                    <Cell fill="url(#gradNEU)" />
                                </Pie>

                                {/* Centered Tactical Core */}
                                <Pie
                                    data={[{ value: 1 }]}
                                    cx="50%" cy="50%" innerRadius={0} outerRadius="45%"
                                    dataKey="value" stroke="none" isAnimationActive={false}
                                    labelLine={false}
                                    label={({ cx, cy }) => (
                                        <g>
                                            <circle cx={cx} cy={cy} r="30" fill="rgba(15, 23, 42, 0.4)" stroke="rgba(99, 102, 241, 0.2)" strokeWidth="1" strokeDasharray="5 5" />
                                        </g>
                                    )}
                                >
                                    <Cell fill="transparent" />
                                </Pie>
                                <Tooltip
                                    contentStyle={{ background: 'rgba(15, 23, 42, 0.9)', borderRadius: '1rem', border: '1px solid rgba(255,255,255,0.2)', fontSize: '12px', fontWeight: '900', color: '#fff' }}
                                    itemStyle={{ color: '#fff' }}
                                    formatter={(value, name) => [value.toLocaleString(), name]}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* 3. Missing Votes (Leakage Analysis) */}
                <div className="lux-glass rounded-[2rem] !p-4 bg-slate-900/40 border border-white/5 shadow-2xl flex flex-col px-6">
                    <h3 className="font-black uppercase tracking-[0.3em] text-[10px] text-indigo-400 mb-2 border-b border-white/5 pb-2 text-center">{perspective} Leakage Analysis</h3>
                    <div className="w-full" style={{ height: 160 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={Object.entries(dashboardStats.missing_votes || {}).map(([cat, leanings]) => ({
                                name: cat === "Likely" ? "LKL" : cat === "Unlikely" ? "UNL" : cat === "Out of Station" ? "OOS" : cat === "Outside State" ? "OSS" : cat === "Outside District" ? "OSD" : cat,
                                full_name: cat,
                                value: leanings[perspective] || 0
                            }))} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
                                <ChartDefs />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 8, fontWeight: 900, fill: '#64748b' }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 8, fontWeight: 900, fill: '#64748b' }} />
                                <Tooltip
                                    contentStyle={{ background: '#0f172a', borderRadius: '1rem', border: '1px solid rgba(255,255,255,0.2)' }}
                                    itemStyle={{ color: '#fff', fontSize: '10px', fontWeight: 'bold' }}
                                    formatter={(value, name, props) => [value.toLocaleString(), props.payload.full_name]}
                                />
                                <Bar dataKey="value" fill={`url(#bar${perspective === 'NEUTRAL' ? 'NEU' : perspective})`} radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
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
                                    formatter={(value, name) => [value.toLocaleString(), name]}
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
                                    formatter={(value, name) => [value.toLocaleString(), name]}
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

            {/* 📊 BOOTH SUPPORT OVERVIEW */}
            <div className="lux-card flex flex-col relative border-white/5 shadow-2xl p-10 bg-slate-900/20 backdrop-blur-3xl">
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

                <div className="grid grid-cols-5 gap-6 flex-1 relative z-10">
                    {strategicStats.booth_stats?.map((booth, i) => {
                        const pStrength = booth[perspective.toLowerCase()] || 0;
                        const pCoverage = Math.round((pStrength / booth.total) * 100);
                        const isFirstCol = i % 5 === 0;
                        const isLastCol = i % 5 === 4;

                        return (
                            <div key={i} onClick={() => { setListFilters({ ...listFilters, booth: booth.id }); setView('voters'); }} className="group relative cursor-pointer shadow-lg perspective-1000 z-10 hover:z-[100]">
                                {/* Glass background separated to prevent CSS backdrop-filter from implicitly clipping the tooltip */}
                                <div className="absolute inset-0 lux-glass rounded-[1.5rem] border-white/5 transition-all duration-500 group-hover:bg-white/10 pointer-events-none" />

                                {/* Massive White External Tooltip */}
                                <div className={`absolute ${i < 5 ? 'top-[calc(100%+15px)]' : 'bottom-[calc(100%+15px)]'} ${isFirstCol ? 'left-0 translate-x-0' : isLastCol ? 'right-0 translate-x-0' : 'left-1/2 -translate-x-1/2'} w-[300px] bg-white p-6 rounded-3xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-300 shadow-[0_30px_60px_rgba(0,0,0,0.6)] flex flex-col gap-4 border-4 border-indigo-100 ${i < 5 ? '-translate-y-4 group-hover:translate-y-0' : 'translate-y-4 group-hover:translate-y-0'}`}>
                                    <div className="border-b border-slate-200 pb-3">
                                        <div className="flex justify-between items-start gap-4">
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-black uppercase tracking-widest text-slate-500 mb-1">Booth {booth.number}</p>
                                                <p className="text-sm font-black text-slate-900 leading-snug mb-2 break-words">{booth.name}</p>
                                            </div>
                                            <div className="text-right shrink-0 bg-slate-50 p-2 rounded-xl border border-slate-100 min-w-[70px]">
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Total</p>
                                                <p className="text-xl font-black text-slate-900 leading-none">{booth.total}</p>
                                            </div>
                                        </div>

                                        {/* 👤 Booth Leadership Section */}
                                        <div className="mt-3 pt-3 border-t border-slate-100">
                                            <p className="text-[8px] font-black uppercase tracking-[0.2em] text-indigo-500 mb-1.5 italic">Field Leadership</p>
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-lg">👤</span>
                                                    <span className="text-xs font-black text-slate-800 uppercase tracking-tight">{booth.head_name || booth.h_name || 'Unassigned'}</span>
                                                </div>
                                                <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
                                                    <span className="text-[12px]">📞</span>
                                                    <span className="text-[13px] font-mono font-black text-slate-700">{booth.head_phone || booth.h_phone || 'N/A'}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                                        <div className="flex justify-between items-center text-sm font-black uppercase tracking-widest"><span className="text-blue-600">UDF:</span> <span className="text-slate-900 text-xl">{booth.udf}</span></div>
                                        <div className="flex justify-between items-center text-sm font-black uppercase tracking-widest"><span className="text-rose-600">LDF:</span> <span className="text-slate-900 text-xl">{booth.ldf}</span></div>
                                        <div className="flex justify-between items-center text-sm font-black uppercase tracking-widest"><span className="text-amber-500">NDA:</span> <span className="text-slate-900 text-xl">{booth.nda}</span></div>
                                        <div className="flex justify-between items-center text-sm font-black uppercase tracking-widest"><span className="text-slate-400">NEU:</span> <span className="text-slate-900 text-xl">{booth.neutral}</span></div>
                                    </div>
                                    <div className="border-t border-slate-200 pt-4 flex justify-between items-center bg-slate-50 -mx-6 -mb-6 p-5 rounded-b-[1.25rem]">
                                        <span className="text-xs font-black uppercase tracking-widest text-indigo-600">{perspective} Win Prob:</span>
                                        <span className={`text-2xl font-black ${pCoverage > 50 ? 'text-emerald-500' : pCoverage > 35 ? 'text-amber-500' : 'text-rose-500'}`}>{pCoverage}%</span>
                                    </div>
                                    {/* Tooltip Arrow */}
                                    <div className={`absolute ${i < 5 ? '-top-3 border-t-4 border-l-4' : '-bottom-3 border-b-4 border-r-4'} ${isFirstCol ? 'left-8 translate-x-0' : isLastCol ? 'right-8 translate-x-0' : 'left-1/2 -translate-x-1/2'} w-6 h-6 bg-white border-indigo-100 rotate-45`} />
                                </div>

                                {/* Content Elements Container */}
                                <div className="relative z-10 p-6 flex flex-col pointer-events-none">
                                    <span className="text-[8px] font-black px-3 py-1 bg-white/5 text-slate-400 rounded-full mb-4 inline-block group-hover:bg-indigo-500 group-hover:text-white transition-all tracking-widest uppercase self-start">Booth {booth.number}</span>
                                    <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-200 mb-6 min-h-[60px] leading-relaxed break-words">{booth.name}</h4>
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
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="pb-16" />
        </div>
    );
};

export default DashboardV2;
