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
    setSearchQuery
}) => {

    useEffect(() => {
        if (setSearchQuery) setSearchQuery('');
        setListFilters(prev => ({
            ...prev,
            gender: '', ageFrom: '', ageTo: '', leaning: '', serialFrom: '', serialTo: '', location: ''
        }));
    }, []);

    const handleReset = () => {
        setListFilters({ ...listFilters, serialFrom: '', serialTo: '' });
        loadVoters();
    };

    return (
        <div className="min-h-screen lux-mesh-bg p-12 pl-96 space-y-12 lux-animate-in pb-32">
            <header className="flex justify-between items-end border-b border-white/5 pb-10 no-print">
                <div>
                    <h1 className="text-6xl font-black tracking-tighter uppercase lux-text-gradient">Asset Synthesis Lab</h1>
                    <p className="text-slate-300 font-black uppercase tracking-[0.4em] text-[10px] mt-2 ml-1">Autonomous Distribution & Precision Logistics</p>
                </div>
                <div className="flex gap-6 items-center">
                    <button
                        onClick={() => window.print()}
                        disabled={voterList.length === 0}
                        className="lux-btn-primary !py-6 !px-10 text-sm tracking-[0.3em] shadow-[0_0_40px_rgba(99,102,241,0.3)] group overflow-hidden relative active:scale-95"
                    >
                        <div className="absolute inset-0 bg-white/20 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 italic" />
                        <span className="relative z-10">PRINT_BATCH_PROTOCOL 🖨️</span>
                    </button>
                </div>
            </header>

            <div className="lux-glass p-8 rounded-[3rem] border-white/5 shadow-2xl space-y-8 no-print group">
                <div className="flex flex-wrap gap-8 items-end">
                    <div className="flex-1 min-w-[200px] space-y-3">
                        <label className="text-[9px] font-black text-indigo-400 uppercase tracking-widest ml-1 italic">Tactical Sector</label>
                        <select className="w-full bg-slate-900/80 text-white border border-white/10 rounded-2xl px-6 py-4 text-[11px] font-black uppercase tracking-widest outline-none focus:border-indigo-500/50 appearance-none transition-all" value={listFilters.constituency} onChange={(e) => setListFilters({ ...listFilters, constituency: e.target.value, lb: '', booth: '' })}>
                            <option value="" className="bg-slate-900">GLOBAL_SECTOR</option>
                            {allLocations.map(c => <option key={c.id} value={c.id} className="bg-slate-900">{c.name}</option>)}
                        </select>
                    </div>
                    <div className="flex-1 min-w-[150px] space-y-3">
                        <label className="text-[9px] font-black text-indigo-400 uppercase tracking-widest ml-1 italic">Core Unit</label>
                        <select disabled={!listFilters.constituency} className="w-full bg-slate-900/80 text-white border border-white/10 rounded-2xl px-6 py-4 text-[11px] font-black uppercase tracking-widest outline-none focus:border-indigo-500/50 appearance-none disabled:opacity-20 transition-all" value={listFilters.booth} onChange={(e) => setListFilters({ ...listFilters, booth: e.target.value })}>
                            <option value="" className="bg-slate-900">SELECT_UNIT</option>
                            {listFilters.constituency && allLocations.find(c => String(c.id) === String(listFilters.constituency))?.local_bodies.flatMap(lb => lb.booths).sort((a, b) => a.number - b.number).map(b => <option key={b.id} value={b.id} className="bg-slate-900">BOOTH {b.number}</option>)}
                        </select>
                    </div>
                    <div className="flex-1 min-w-[200px] space-y-3">
                        <label className="text-[9px] font-black text-emerald-400 uppercase tracking-widest ml-1 italic">Identity Branding</label>
                        <select className="w-full bg-emerald-500/5 text-emerald-400 border border-emerald-500/20 rounded-2xl px-6 py-4 text-[11px] font-black uppercase tracking-widest outline-none focus:border-emerald-500 transition-all appearance-none italic" value={activePrintParty?.id || ''} onChange={(e) => setActivePrintParty(allParties.find(p => String(p.id) === String(e.target.value)))}>
                            <option value="" className="bg-slate-900">PLAIN_IDENT_BLOCK</option>
                            {allParties.map(p => <option key={p.id} value={p.id} className="bg-slate-900">{p.name}</option>)}
                        </select>
                    </div>
                    <div className="flex gap-4">
                        <button onClick={loadVoters} className="lux-btn-primary !px-10 !py-4 text-[10px] tracking-widest shadow-xl">INITIATE_FETCH</button>
                        <button onClick={handleReset} className="bg-white/5 text-slate-300 px-8 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all">SYSTEM_RESET</button>
                    </div>
                </div>
            </div>

            <div className="flex justify-center no-print">
                <p className="text-[9px] font-black text-slate-700 uppercase tracking-[0.5em] italic animate-pulse">Previewing Tactical Assets in Secure Matrix Environment</p>
            </div>

            <div className="grid grid-cols-2 gap-8 w-fit mx-auto print:p-0 print:gap-0 print-grid relative">
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
                    <div className="col-span-2 py-40 lux-glass border-2 border-dashed border-white/5 rounded-[5rem] flex flex-col items-center justify-center space-y-8 no-print w-[800px]">
                        <div className="w-32 h-32 bg-indigo-500/5 rounded-full flex items-center justify-center text-6xl shadow-inner animate-bounce">📥</div>
                        <div className="text-center space-y-4">
                            <h3 className="text-2xl font-black uppercase text-indigo-400 tracking-widest">Awaiting Logistics Data</h3>
                            <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">Configure Matrix Parameters Above to Synthesize Assets</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SlipDesign;
