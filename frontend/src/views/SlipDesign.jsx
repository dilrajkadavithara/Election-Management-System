import React from 'react';
import VoterSlip from '../components/engine/VoterSlip';

const SlipDesign = ({
    activePrintParty,
    setActivePrintParty,
    allParties,
    allLocations,
    listFilters,
    setListFilters,
    voterList,
    loadVoters
}) => {

    const handleReset = () => {
        setListFilters({ ...listFilters, serialFrom: '', serialTo: '' });
        loadVoters();
    };

    return (
        <div className="space-y-12 animate-in pb-20">
            <header className="flex justify-between items-end border-b pb-8 no-print">
                <div>
                    <h1 className="text-6xl font-black tracking-tighter uppercase text-slate-900 leading-none">Print Slips</h1>
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-xs mt-4">Voter Distribution Management</p>
                </div>
                <div className="flex gap-4">
                    <button
                        onClick={() => window.print()}
                        disabled={voterList.length === 0}
                        className="bg-slate-900 text-white px-10 py-5 rounded-[24px] font-black uppercase text-xs tracking-[0.2em] shadow-2xl hover:bg-black transition-all flex items-center gap-4 disabled:opacity-30"
                    >
                        <span>🖨️</span> PRINT BATCH
                    </button>
                </div>
            </header>

            <div className="w-full max-w-6xl no-print bg-white p-6 rounded-[32px] shadow-sm border border-slate-100 space-y-6">
                <div className="flex flex-wrap gap-6 items-end">
                    <div className="flex-1 min-w-[200px] space-y-1">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-2">Constituency</label>
                        <select className="w-full p-3 bg-slate-50 rounded-2xl font-bold border-2 border-slate-100 focus:border-indigo-500 transition-all text-sm" value={listFilters.constituency} onChange={(e) => setListFilters({ ...listFilters, constituency: e.target.value, lb: '', booth: '' })}>
                            <option value="">Select Constituency</option>
                            {allLocations.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                    <div className="flex-1 min-w-[150px] space-y-1">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-2">Booth</label>
                        <select disabled={!listFilters.constituency} className="w-full p-3 bg-slate-50 rounded-2xl font-bold border-2 border-slate-100 focus:border-indigo-500 transition-all text-sm disabled:opacity-50" value={listFilters.booth} onChange={(e) => setListFilters({ ...listFilters, booth: e.target.value })}>
                            <option value="">Select Booth</option>
                            {listFilters.constituency && allLocations.find(c => String(c.id) === String(listFilters.constituency))?.local_bodies.flatMap(lb => lb.booths).sort((a, b) => a.number - b.number).map(b => <option key={b.id} value={b.id}>Booth {b.number}</option>)}
                        </select>
                    </div>
                    <div className="flex-1 min-w-[200px] space-y-1">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-2 font-bold text-indigo-600">Party Logo / Branding</label>
                        <select className="w-full p-3 bg-indigo-50 rounded-2xl font-black uppercase text-indigo-700 border-2 border-indigo-100 focus:border-indigo-500 transition-all text-xs tracking-widest" value={activePrintParty?.id || ''} onChange={(e) => setActivePrintParty(allParties.find(p => String(p.id) === String(e.target.value)))}>
                            <option value="">No Logo (Plain)</option>
                            {allParties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={loadVoters} className="bg-indigo-600 text-white px-8 py-3.5 rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg hover:bg-indigo-700 transition-all active:scale-95">Fetch Voters</button>
                        <button onClick={handleReset} className="bg-slate-100 text-slate-400 px-6 py-3.5 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-200 transition-all">Reset</button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 w-fit mx-auto print:p-0 print:gap-0 print-grid">
                {voterList.length > 0 ? (
                    voterList.map((v) => (
                        <VoterSlip
                            key={v.id}
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
                    ))
                ) : (
                    <div className="col-span-2 py-20 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[40px] flex flex-col items-center justify-center text-slate-400 space-y-4 no-print">
                        <span className="text-6xl">📥</span>
                        <div className="text-center">
                            <h3 className="text-xl font-black uppercase text-slate-600 transition-all bg-white px-6 py-2 rounded-full border border-slate-100">No Voters Loaded</h3>
                            <p className="text-xs font-bold mt-2">Pick a Constituency & Booth, then click "Fetch Voters"</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SlipDesign;
