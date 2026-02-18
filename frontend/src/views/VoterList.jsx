import React from 'react';
import api from '../api';

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
        <div className="space-y-8 animate-in">
            <header className="flex justify-between items-center">
                <div>
                    <h1 className="text-4xl font-black tracking-tighter uppercase">Voters List</h1>
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-xs mt-1">Found {voterTotal} records</p>
                </div>
                <div className="flex gap-4 items-center">
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
                        className="px-6 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-indigo-700 shadow-lg disabled:opacity-50"
                    >
                        Export CSV 📥
                    </button>
                    <input
                        type="text"
                        placeholder="Search..."
                        className="p-4 bg-white border border-slate-200 rounded-2xl font-bold text-sm w-72 shadow-sm"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </header>

            <div className="bg-white p-4 rounded-[30px] border border-slate-100 flex flex-wrap gap-4 items-end shadow-sm">
                <div className="flex-1 min-w-[150px] space-y-1">
                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest pl-2">Constituency</label>
                    <select
                        className="w-full p-2 bg-slate-50 rounded-xl text-xs font-bold border-none"
                        value={listFilters.constituency}
                        onChange={(e) => setListFilters({ ...listFilters, constituency: e.target.value, lb: '', booth: '' })}
                    >
                        <option value="">All Constituencies</option>
                        {allLocations.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>
                <div className="flex-1 min-w-[150px] space-y-1">
                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest pl-2">Local Body</label>
                    <select
                        disabled={!listFilters.constituency}
                        className="w-full p-2 bg-slate-50 rounded-xl text-xs font-bold border-none"
                        value={listFilters.lb}
                        onChange={(e) => setListFilters({ ...listFilters, lb: e.target.value, booth: '' })}
                    >
                        <option value="">All Local Bodies</option>
                        {allLocations.find(c => String(c.id) === String(listFilters.constituency))?.local_bodies.map(lb => <option key={lb.id} value={lb.id}>{lb.name}</option>)}
                    </select>
                </div>
                <div className="flex-1 min-w-[150px] space-y-1">
                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest pl-2">Booth</label>
                    <select
                        disabled={!listFilters.lb}
                        className="w-full p-2 bg-slate-50 rounded-xl text-xs font-bold border-none"
                        value={listFilters.booth}
                        onChange={(e) => setListFilters({ ...listFilters, booth: e.target.value })}
                    >
                        <option value="">All Booths</option>
                        {allLocations.find(c => String(c.id) === String(listFilters.constituency))?.local_bodies.find(lb => String(lb.id) === String(listFilters.lb))?.booths.map(b => <option key={b.id} value={b.id}>Booth {b.number}</option>)}
                    </select>
                </div>
                <div className="w-[80px] space-y-1">
                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest pl-2">Gender</label>
                    <select className="w-full p-2 bg-slate-50 rounded-xl text-xs font-bold border-none" value={listFilters.gender} onChange={(e) => setListFilters({ ...listFilters, gender: e.target.value })}>
                        <option value="">All</option>
                        <option value="MALE">M</option>
                        <option value="FEMALE">F</option>
                        <option value="TRANSGENDER">T</option>
                    </select>
                </div>
                <div className="w-[80px] space-y-1">
                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest pl-2">Age From</label>
                    <input type="number" placeholder="Min" className="w-full p-2 bg-slate-50 rounded-xl text-xs font-bold border-none" value={listFilters.ageFrom} onChange={(e) => setListFilters({ ...listFilters, ageFrom: e.target.value })} />
                </div>
                <div className="w-[80px] space-y-1">
                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest pl-2">Age To</label>
                    <input type="number" placeholder="Max" className="w-full p-2 bg-slate-50 rounded-xl text-xs font-bold border-none" value={listFilters.ageTo} onChange={(e) => setListFilters({ ...listFilters, ageTo: e.target.value })} />
                </div>
                <div className="w-[140px] space-y-1">
                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest pl-2">Sentiment</label>
                    <select className="w-full p-2 bg-slate-50 rounded-xl text-xs font-bold border-none" value={listFilters.leaning} onChange={(e) => setListFilters({ ...listFilters, leaning: e.target.value })}>
                        <option value="">All</option>
                        <option value="UDF">UDF</option>
                        <option value="LDF">LDF</option>
                        <option value="NDA">NDA</option>
                        <option value="NEUTRAL">Neutral</option>
                    </select>
                </div>
                <div className="w-[140px] space-y-1">
                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest pl-2">Location</label>
                    <select className="w-full p-2 bg-slate-50 rounded-xl text-xs font-bold border-none" value={listFilters.location} onChange={(e) => setListFilters({ ...listFilters, location: e.target.value })}>
                        <option value="">All</option>
                        <option value="LOCAL">Local</option>
                        <option value="OUTSIDE_DISTRICT">Outside District</option>
                        <option value="OUTSIDE_STATE">Outside State</option>
                        <option value="ABROAD">Abroad</option>
                    </select>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => { loadVoters(); loadAdminData(); }} className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 shadow-md">Apply</button>
                    <button onClick={() => { setListFilters({ constituency: '', lb: '', booth: '', gender: '', ageFrom: '', ageTo: '', leaning: '', serialFrom: '', serialTo: '', location: '' }); setSearchQuery(''); }} className="px-5 py-2.5 bg-slate-100 text-slate-400 rounded-xl text-[10px] font-black uppercase hover:bg-slate-200">Clear</button>
                </div>
            </div>

            <div className="bg-white rounded-[20px] shadow-sm border border-slate-100 overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 border-b">
                        <tr className="text-[9px] font-black uppercase text-slate-500">
                            <th className="px-4 py-3">Sl</th>
                            <th className="px-4 py-3 min-w-[180px] border-x">Name</th>
                            <th className="px-4 py-3 border-x">EPIC ID</th>
                            <th className="px-4 py-3 border-x">Const</th>
                            <th className="px-4 py-3 border-x">LB</th>
                            <th className="px-4 py-3 border-x">Booth</th>
                            <th className="px-4 py-3 border-x">Gen</th>
                            <th className="px-4 py-3 border-x">Age</th>
                            <th className="px-4 py-3 border-x">Intel</th>
                            <th className="px-4 py-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="text-[11px] font-medium text-slate-700 divide-y">
                        {voterList.map(v => (
                            <tr key={v.id} className="hover:bg-blue-50/50 odd:bg-white even:bg-slate-50/30 transition-colors">
                                <td className="px-4 py-2 font-black text-slate-400">{v.serial_no}</td>
                                <td className="px-4 py-2 font-bold text-slate-900">{v.full_name}</td>
                                <td className="px-4 py-2"><span className="bg-slate-100 px-2 py-0.5 rounded font-mono text-[9px]">{v.epic_id}</span></td>
                                <td className="px-4 py-2 border-x text-slate-500 font-bold">{v.constituency}</td>
                                <td className="px-4 py-2 border-x text-slate-500 font-bold">{v.local_body}</td>
                                <td className="px-4 py-2 border-x font-black text-indigo-600">{v.booth_no}</td>
                                <td className="px-4 py-2 border-x font-black">{v.gender?.charAt(0)}</td>
                                <td className="px-4 py-2 border-x font-black">{v.age}</td>
                                <td className="px-4 py-2 border-x">
                                    <div className="flex flex-col gap-1">
                                        <div className="flex gap-1">
                                            {['UDF', 'LDF', 'NDA', 'NEUTRAL'].map(l => (
                                                <button
                                                    key={l}
                                                    onClick={() => handleUpdateIntel(v.id, { voter_leaning: l })}
                                                    className={`w-6 h-6 rounded flex items-center justify-center text-[8px] font-black transition-all ${v.voter_leaning === l ? (l === 'UDF' ? 'bg-blue-600 text-white' : l === 'LDF' ? 'bg-rose-600 text-white' : l === 'NDA' ? 'bg-orange-600 text-white' : 'bg-slate-600 text-white') : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
                                                >
                                                    {l[0]}
                                                </button>
                                            ))}
                                        </div>
                                        <div className="flex gap-1">
                                            {[
                                                { id: 'LOCAL', icon: '🏠' },
                                                { id: 'ABROAD', icon: '✈️' },
                                                { id: 'STATE', icon: '🇮🇳' },
                                                { id: 'DISTRICT', icon: '🏘️' }
                                            ].map(loc => (
                                                <button
                                                    key={loc.id}
                                                    onClick={() => handleUpdateIntel(v.id, { current_location: loc.id })}
                                                    className={`w-6 h-6 rounded flex items-center justify-center text-[10px] transition-all ${v.current_location === loc.id ? 'bg-emerald-100 border border-emerald-500' : 'bg-slate-50 border border-transparent hover:border-slate-200'}`}
                                                    title={loc.id}
                                                >
                                                    {loc.icon}
                                                </button>
                                            ))}
                                        </div>
                                        <div className="flex gap-1">
                                            {[
                                                { id: 'CONFIRMED', icon: '🎯' },
                                                { id: 'LIKELY', icon: '📈' },
                                                { id: 'UNLIKELY', icon: '📉' },
                                                { id: 'OUT_OF_STATION', icon: '🚪' }
                                            ].map(prob => (
                                                <button
                                                    key={prob.id}
                                                    onClick={() => handleUpdateIntel(v.id, { voting_probability: prob.id })}
                                                    className={`w-6 h-6 rounded flex items-center justify-center text-[10px] transition-all ${v.voting_probability === prob.id ? 'bg-amber-100 border border-amber-500' : 'bg-slate-50 border border-transparent hover:border-slate-200'}`}
                                                    title={prob.id}
                                                >
                                                    {prob.icon}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </td>
                                <td className="px-4 py-2 text-right">
                                    <button
                                        onClick={() => { setEditData(v); setEditMode(true); }}
                                        className="text-indigo-600 font-black uppercase text-[9px] bg-indigo-50 px-2 py-1 rounded hover:bg-indigo-600 hover:text-white transition-all"
                                    >
                                        Edit
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default VoterList;
