import React, { useEffect } from 'react';
import VoterSlip from '../components/engine/VoterSlip';

const SlipDesign = ({
    activePrintParty,
    setActivePrintParty,
    allParties,
    allLocations,
    listFilters,
    setListFilters,
    voterList,
    loadVoters,
    setSearchQuery,
    userRole,
    userAssignments
}) => {

    useEffect(() => {
        if (setSearchQuery) setSearchQuery('');
        const blankFilters = {
            constituency: '', lb: '', booth: '', gender: '', ageFrom: '', ageTo: '', leaning: '', serialFrom: '', serialTo: '', location: ''
        };
        
        // Auto-select booth for Booth Agents
        if (userRole === 'BOOTH_AGENT' && userAssignments?.booths?.length > 0) {
            blankFilters.booth = String(userAssignments.booths[0]);
        }
        
        setListFilters(blankFilters);
        loadVoters(1, blankFilters);
    }, [userRole, userAssignments]);

    const handleReset = () => {
        const blankFilters = { constituency: '', lb: '', booth: '', gender: '', ageFrom: '', ageTo: '', leaning: '', serialFrom: '', serialTo: '', location: '' };
        if (userRole === 'BOOTH_AGENT' && userAssignments?.booths?.length > 0) {
            blankFilters.booth = String(userAssignments.booths[0]);
        }
        setListFilters(blankFilters);
        loadVoters(1, blankFilters);
    };

    return (
        <div className="min-h-screen lux-mesh-bg p-6 lg:p-12 pl-6 lg:pl-[420px] pr-6 lg:pr-16 space-y-8 lg:space-y-16 lux-animate-in pb-32 pt-24 lg:pt-12">
            <header className="flex flex-col lg:flex-row justify-between items-start lg:items-end border-b border-white/5 pb-6 lg:pb-10 no-print gap-6 lg:gap-12">
                <div>
                    <h1 className="text-4xl lg:text-7xl font-black tracking-tighter uppercase lux-text-gradient">Voter Slips</h1>
                    <p className="text-slate-300 font-bold uppercase tracking-widest text-xs lg:text-sm mt-3 ml-1">Generate and Print Slips for Distribution</p>
                </div>
                <div className="flex gap-6 items-center w-full lg:w-auto mt-4 lg:mt-0">
                    <button
                        onClick={() => window.print()}
                        disabled={voterList.length === 0}
                        className="lux-btn-primary w-full lg:w-auto !py-4 lg:!py-6 !px-6 lg:!px-10 text-xs lg:text-sm tracking-widest shadow-[0_0_40px_rgba(99,102,241,0.3)] group overflow-hidden relative active:scale-95"
                    >
                        <div className="absolute inset-0 bg-white/20 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                        <span className="relative z-10">PRINT SELECTED SLIPS 🖨️</span>
                    </button>
                </div>
            </header>

            <div className="lux-glass p-6 lg:p-8 rounded-3xl lg:rounded-[3rem] border-white/5 shadow-2xl space-y-6 no-print group">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 lg:gap-6 items-end">
                    {userRole !== 'BOOTH_AGENT' && (
                        <>
                            <div className="space-y-2">
                                <label className="text-xs font-black text-indigo-400 uppercase tracking-widest ml-1">Constituency</label>
                                <select className="w-full bg-slate-900/80 text-white border border-white/10 rounded-xl px-4 py-3 text-sm font-black uppercase tracking-widest outline-none focus:border-indigo-500/50 appearance-none transition-all" value={listFilters.constituency} onChange={(e) => setListFilters({ ...listFilters, constituency: e.target.value, lb: '', booth: '' })}>
                                    <option value="" className="bg-slate-900">All Constituencies</option>
                                    {allLocations.map(c => <option key={c.id} value={c.id} className="bg-slate-900">{c.name}</option>)}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-black text-indigo-400 uppercase tracking-widest ml-1">Local Body</label>
                                <select disabled={!listFilters.constituency} className="w-full bg-slate-900/80 text-white border border-white/10 rounded-xl px-4 py-3 text-sm font-black uppercase tracking-widest outline-none focus:border-indigo-500/50 appearance-none disabled:opacity-20 transition-all" value={listFilters.lb} onChange={(e) => setListFilters({ ...listFilters, lb: e.target.value, booth: '' })}>
                                    <option value="" className="bg-slate-900">All Local Bodies</option>
                                    {listFilters.constituency && allLocations.find(c => String(c.id) === String(listFilters.constituency))?.local_bodies.map(lb => <option key={lb.id} value={lb.id} className="bg-slate-900">{lb.name}</option>)}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-black text-indigo-400 uppercase tracking-widest ml-1">Booth Number</label>
                                <select disabled={!listFilters.lb} className="w-full bg-slate-900/80 text-white border border-white/10 rounded-xl px-4 py-3 text-sm font-black uppercase tracking-widest outline-none focus:border-indigo-500/50 appearance-none disabled:opacity-20 transition-all" value={listFilters.booth} onChange={(e) => setListFilters({ ...listFilters, booth: e.target.value })}>
                                    <option value="" className="bg-slate-900">All Booths</option>
                                    {listFilters.lb && allLocations.find(c => String(c.id) === String(listFilters.constituency))?.local_bodies.find(l => String(l.id) === String(listFilters.lb))?.booths.sort((a, b) => a.number - b.number).map(b => <option key={b.id} value={b.id} className="bg-slate-900">Booth {b.number}</option>)}
                                </select>
                            </div>
                        </>
                    )}
                    <div className="space-y-2">
                        <label className="text-xs font-black text-indigo-400 uppercase tracking-widest ml-1">Party</label>
                        <select className="w-full bg-slate-900/80 text-white border border-white/10 rounded-xl px-4 py-3 text-sm font-black uppercase tracking-widest outline-none focus:border-indigo-500/50 appearance-none transition-all" value={listFilters.leaning} onChange={(e) => setListFilters({ ...listFilters, leaning: e.target.value })}>
                            <option value="" className="bg-slate-900">All Parties</option>
                            <option value="UDF" className="bg-slate-900">UDF</option>
                            <option value="LDF" className="bg-slate-900">LDF</option>
                            <option value="NDA" className="bg-slate-900">NDA</option>
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-black text-emerald-400 uppercase tracking-widest ml-1">Slip Branding</label>
                        <select className="w-full bg-emerald-500/5 text-emerald-400 border border-emerald-500/20 rounded-xl px-4 py-3 text-sm font-black uppercase tracking-widest outline-none focus:border-emerald-500 transition-all appearance-none" value={activePrintParty?.id || ''} onChange={(e) => setActivePrintParty(allParties.find(p => String(p.id) === String(e.target.value)))}>
                            <option value="" className="bg-slate-900">Plain Slip (No Logo)</option>
                            {allParties.map(p => <option key={p.id} value={p.id} className="bg-slate-900">{p.name}</option>)}
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-black text-indigo-400 uppercase tracking-widest ml-1">Gender</label>
                        <select className="w-full bg-slate-900/80 text-white border border-white/10 rounded-xl px-4 py-3 text-sm font-black uppercase tracking-widest outline-none focus:border-indigo-500/50 appearance-none transition-all" value={listFilters.gender} onChange={(e) => setListFilters({ ...listFilters, gender: e.target.value })}>
                            <option value="" className="bg-slate-900">All Genders</option>
                            <option value="MALE" className="bg-slate-900">Male</option>
                            <option value="FEMALE" className="bg-slate-900">Female</option>
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-black text-indigo-400 uppercase tracking-widest ml-1">Age Group</label>
                        <select className="w-full bg-slate-900/80 text-white border border-white/10 rounded-xl px-4 py-3 text-sm font-black uppercase tracking-widest outline-none focus:border-indigo-500/50 appearance-none transition-all" value={listFilters.ageFrom ? `${listFilters.ageFrom}-${listFilters.ageTo === '150' ? '' : listFilters.ageTo}` : ''} onChange={(e) => {
                            const val = e.target.value;
                            if (val === '18-25') setListFilters({ ...listFilters, ageFrom: '18', ageTo: '25' });
                            else if (val === '26-40') setListFilters({ ...listFilters, ageFrom: '26', ageTo: '40' });
                            else if (val === '41-60') setListFilters({ ...listFilters, ageFrom: '41', ageTo: '60' });
                            else if (val === '60-') setListFilters({ ...listFilters, ageFrom: '60', ageTo: '150' });
                            else setListFilters({ ...listFilters, ageFrom: '', ageTo: '' });
                        }}>
                            <option value="" className="bg-slate-900">All Ages</option>
                            <option value="18-25" className="bg-slate-900">18-25</option>
                            <option value="26-40" className="bg-slate-900">26-40</option>
                            <option value="41-60" className="bg-slate-900">41-60</option>
                            <option value="60-" className="bg-slate-900">60+</option>
                        </select>
                    </div>

                    <div className="col-span-1 sm:col-span-2 lg:col-span-3 flex flex-col sm:flex-row gap-4 mt-2 h-auto sm:h-11">
                        <button onClick={() => loadVoters(1)} className="lux-btn-primary w-full sm:flex-1 py-4 sm:!p-0 sm:max-w-[200px] text-[10px] sm:text-xs tracking-widest shadow-xl">APPLY FILTERS</button>
                        <button onClick={handleReset} className="bg-white/5 text-slate-300 w-full sm:flex-1 py-4 sm:!p-0 sm:max-w-[150px] rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest hover:bg-white/10 transition-all">CLEAR ALL</button>
                    </div>
                </div>
            </div>

            <div className="flex justify-center no-print pb-4 px-4">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] text-center">Showing Preview of Slips Generated Using Applied Filters</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 lg:gap-8 w-full sm:w-fit mx-auto print:p-0 print:gap-0 print-grid relative justify-items-center">
                <div className="absolute inset-0 bg-indigo-500/5 blur-[120px] rounded-full pointer-events-none no-print" />
                {voterList.length > 0 ? (
                    voterList.map((v) => (
                        <div key={v.id} className="relative group/slip">
                            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500/20 to-transparent rounded-lg opacity-0 group-hover/slip:opacity-100 transition-opacity no-print" />
                            <VoterSlip
                                voterName={v.full_name}
                                serialNo={v.serial_no}
                                epicNo={v.epic_id}
                                boothNo={v.booth_no}
                                constituency={v.constituency}
                                pollingStation={v.ps_name}
                                relationName={v.relation_name}
                                relationType={v.relation_type}
                                houseName={v.house_name}
                                houseNo={v.house_no}
                                party={activePrintParty}
                            />
                        </div>
                    ))
                ) : (
                    <div className="col-span-1 sm:col-span-2 py-20 lg:py-40 lux-glass border-2 border-dashed border-white/5 rounded-3xl lg:rounded-[5rem] flex flex-col items-center justify-center space-y-6 lg:space-y-8 no-print w-full max-w-3xl">
                        <div className="w-32 h-32 bg-indigo-500/5 rounded-full flex items-center justify-center text-6xl shadow-inner animate-bounce">📥</div>
                        <div className="text-center space-y-4">
                            <h3 className="text-2xl font-black uppercase text-indigo-400 tracking-widest">No Voters Found</h3>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Adjust the filters above or switch to a different constituency.</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SlipDesign;
