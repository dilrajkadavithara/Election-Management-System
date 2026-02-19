import React from 'react';

const VoterList = ({
    voterList,
    voterTotal,
    listFilters,
    setListFilters,
    searchQuery,
    setSearchQuery,
    allLocations,
    loadVoters,
    loadAdminData,
    currentUser,
    setEditData,
    setEditMode,
    handleUpdateIntel
}) => {
    return (
        <div className="min-h-screen lux-mesh-bg p-12 pl-96 space-y-12 lux-animate-in">
            <header className="flex justify-between items-end border-b border-white/5 pb-10">
                <div>
                    <h1 className="text-6xl font-black tracking-tighter uppercase lux-text-gradient">Intelligence Base</h1>
                    <p className="text-slate-300 font-black uppercase tracking-[0.4em] text-[10px] mt-2 ml-1">Live Database: {voterTotal} Synchronized Profiles</p>
                </div>
                <div className="flex gap-6 items-center">
                    <button
                        onClick={() => api.exportVoters({
                            search: searchQuery,
                            constituency: listFilters.constituency,
                            lb: listFilters.lb,
                            booth: listFilters.booth,
                            gender: listFilters.gender,
                            age_from: listFilters.ageFrom,
                            age_to: listFilters.ageTo,
                            leaning: listFilters.leaning,
                            location: listFilters.location
                        })}
                        disabled={currentUser?.role !== 'SUPERUSER' && !currentUser?.can_download}
                        className="lux-btn-primary !py-4 !px-8 shadow-[0_0_20px_rgba(99,102,241,0.3)]"
                    >
                        Export Assets 📥
                    </button>
                    <div className="relative group">
                        <input
                            type="text"
                            placeholder="Search Intelligence..."
                            className="lux-glass w-80 py-4 px-8 rounded-2xl text-[11px] font-black uppercase tracking-widest outline-none border border-white/5 focus:border-indigo-500/50 transition-all text-white placeholder-slate-500"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        <div className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-300 group-hover:text-indigo-400 transition-colors">🔍</div>
                    </div>
                </div>
            </header>

            <div className="lux-glass p-8 rounded-[2.5rem] border-white/5 shadow-2xl space-y-8">
                <div className="flex flex-wrap gap-6 items-end">
                    {[
                        { label: 'Constituency', key: 'constituency', type: 'select', options: allLocations },
                        { label: 'Local Body', key: 'lb', type: 'select', options: allLocations.find(c => String(c.id) === String(listFilters.constituency))?.local_bodies, disabled: !listFilters.constituency },
                        { label: 'Booth Unit', key: 'booth', type: 'select', options: allLocations.find(c => String(c.id) === String(listFilters.constituency))?.local_bodies.find(l => String(l.id) === String(listFilters.lb))?.booths, disabled: !listFilters.lb },
                        { label: 'Gender', key: 'gender', type: 'select', options: [{ id: 'MALE', name: 'MALE' }, { id: 'FEMALE', name: 'FEMALE' }, { id: 'TRANSGENDER', name: 'TRANSGENDER' }] },
                        { label: 'Sentiment', key: 'leaning', type: 'select', options: [{ id: 'UDF', name: 'UDF' }, { id: 'LDF', name: 'LDF' }, { id: 'NDA', name: 'NDA' }, { id: 'NEUTRAL', name: 'NEUTRAL' }] },
                        { label: 'Location', key: 'location', type: 'select', options: [{ id: 'LOCAL', name: 'LOCAL' }, { id: 'ABROAD', name: 'ABROAD' }, { id: 'STATE', name: 'OTHER STATE' }, { id: 'DISTRICT', name: 'OTHER DIST' }] }
                    ].map(f => (
                        <div key={f.key} className="flex-1 min-w-[150px] space-y-2">
                            <label className="text-[9px] font-black uppercase text-slate-300 tracking-[0.2em] ml-1">{f.label}</label>
                            <select
                                disabled={f.disabled}
                                className="w-full bg-slate-900/50 text-slate-300 border border-white/10 rounded-xl px-4 py-3 text-[10px] font-black uppercase tracking-widest outline-none focus:border-indigo-500/50 transition-all disabled:opacity-30 appearance-none"
                                value={listFilters[f.key]}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    if (f.key === 'constituency') setListFilters({ ...listFilters, constituency: val, lb: '', booth: '' });
                                    else if (f.key === 'lb') setListFilters({ ...listFilters, lb: val, booth: '' });
                                    else setListFilters({ ...listFilters, [f.key]: val });
                                }}
                            >
                                <option value="" className="bg-slate-900">GLOBAL</option>
                                {f.options?.map(o => <option key={o.id} value={o.id} className="bg-slate-900">{o.name || `BOOTH ${o.number}`}</option>)}
                            </select>
                        </div>
                    ))}
                    <div className="flex gap-4 min-w-fit">
                        <button onClick={() => { loadVoters(); loadAdminData(); }} className="bg-white text-black px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-400 hover:text-white transition-all shadow-lg">Load Intelligence</button>
                        <button onClick={() => { setListFilters({ constituency: '', lb: '', booth: '', gender: '', ageFrom: '', ageTo: '', leaning: '', serialFrom: '', serialTo: '', location: '' }); setSearchQuery(''); }} className="bg-white/5 text-slate-300 px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all">Reset</button>
                    </div>
                </div>
            </div>

            <div className="lux-glass rounded-[2.5rem] border-white/5 shadow-2xl overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-white/5 text-[9px] font-black uppercase text-slate-300 tracking-[0.2em]">
                            <th className="pl-10 py-6">Sl</th>
                            <th className="px-6 py-6 min-w-[200px]">Strategic Asset</th>
                            <th className="px-6 py-6 w-[120px]">EPIC ID</th>
                            <th className="px-6 py-6">Sector Info</th>
                            <th className="px-6 py-6 text-center">Gen/Age</th>
                            <th className="px-6 py-6 min-w-[220px]">Neural Intelligence Tags</th>
                            <th className="pr-10 py-6 text-right w-[100px]">Control</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {voterList.map(v => (
                            <tr key={v.id} className="group hover:bg-white/5 transition-all duration-300">
                                <td className="pl-10 py-5 font-black text-slate-600 text-[10px]">{v.serial_no}</td>
                                <td className="px-6 py-5">
                                    <div className="flex flex-col">
                                        <span className="text-white font-black text-[12px] uppercase tracking-widest group-hover:text-indigo-400 transition-colors">{v.full_name}</span>
                                        <span className="text-slate-300 text-[9px] font-bold mt-1 uppercase leading-none">{v.local_body} Unit</span>
                                    </div>
                                </td>
                                <td className="px-6 py-5">
                                    <span className="bg-slate-800 text-indigo-400 px-3 py-1.5 rounded-lg font-mono text-[10px] border border-indigo-500/20">{v.epic_id}</span>
                                </td>
                                <td className="px-6 py-5">
                                    <div className="flex flex-col gap-1">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Booth {v.booth_no}</span>
                                        <div className="h-1 w-8 bg-indigo-500/20 rounded-full group-hover:w-full transition-all duration-700"></div>
                                    </div>
                                </td>
                                <td className="px-6 py-5 text-center">
                                    <div className="flex flex-col">
                                        <span className="text-[11px] font-black text-white">{v.gender?.charAt(0)}</span>
                                        <span className="text-[9px] font-black text-slate-300">{v.age} YRS</span>
                                    </div>
                                </td>
                                <td className="px-6 py-5">
                                    <div className="flex flex-wrap gap-2 group-hover:scale-105 transition-transform duration-500 origin-left">
                                        {['UDF', 'LDF', 'NDA', 'NEUTRAL'].map(l => (
                                            <button
                                                key={l}
                                                onClick={() => handleUpdateIntel(v.id, { voter_leaning: l })}
                                                className={`px-3 py-1.5 rounded-lg text-[9px] font-black transition-all border ${v.voter_leaning === l ? (l === 'UDF' ? 'bg-indigo-600 border-indigo-400 text-white shadow-[0_0_10px_#6366f1]' : l === 'LDF' ? 'bg-rose-600 border-rose-400 text-white shadow-[0_0_10px_#f43f5e]' : l === 'NDA' ? 'bg-amber-600 border-amber-400 text-white shadow-[0_0_10px_#f59e0b]' : 'bg-slate-600 border-slate-400 text-white shadow-[0_0_10px_#475569]') : 'bg-transparent border-white/10 text-slate-300 hover:border-white/30'}`}
                                            >
                                                {l}
                                            </button>
                                        ))}
                                        <div className="w-[1px] h-6 bg-white/10 mx-1" />
                                        {[
                                            { id: 'LOCAL', icon: '🏠' },
                                            { id: 'ABROAD', icon: '✈️' },
                                            { id: 'STATE', icon: '🇮🇳' },
                                            { id: 'DISTRICT', icon: '🏘️' }
                                        ].map(loc => (
                                            <button
                                                key={loc.id}
                                                onClick={() => handleUpdateIntel(v.id, { current_location: loc.id })}
                                                className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-all border ${v.current_location === loc.id ? 'bg-white/10 border-indigo-500 shadow-[0_0_10px_#818cf8]' : 'bg-transparent border-white/5 hover:border-white/20 grayscale group-hover:grayscale-0'}`}
                                                title={loc.id}
                                            >
                                                {loc.icon}
                                            </button>
                                        ))}
                                    </div>
                                </td>
                                <td className="pr-10 py-5 text-right">
                                    <button
                                        onClick={() => { setEditData(v); setEditMode(true); }}
                                        className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500 hover:text-white px-5 py-2 rounded-xl font-black uppercase text-[9px] tracking-widest transition-all"
                                    >
                                        Modify Asset
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <div className="h-10" />
            </div>
        </div>
    );
};

export default VoterList;
