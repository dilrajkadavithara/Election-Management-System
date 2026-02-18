import React, { useState, useRef } from 'react';

const CommunicationHub = ({
    commType,
    setCommType,
    commMessage,
    setCommMessage,
    handleCommunicationSend,
    voterTotal,
    commStats,
    commTemplates,
    allLocations,
    listFilters,
    setListFilters,
    loadVoters
}) => {
    const [heading, setHeading] = useState('');
    const [selectedImage, setSelectedImage] = useState(null);
    const fileRef = useRef();

    const getAudienceSummary = () => {
        let summary = `${voterTotal} people in this group`;
        if (listFilters.constituency) {
            const c = allLocations.find(l => String(l.id) === String(listFilters.constituency));
            summary += ` in ${c?.name || 'Constituency'}`;
        }
        if (listFilters.booth) {
            summary += ` (Booth ${listFilters.booth})`;
        }
        return summary;
    };

    const handleFilterChange = (updates) => {
        setListFilters({ ...listFilters, ...updates });
        setTimeout(() => loadVoters(), 100);
    };

    const onSend = () => {
        const payload = {
            mode: 'FILTERED',
            heading: heading,
            message: commMessage,
            type: commType,
            filters: listFilters,
            voterIds: null,
            image: selectedImage
        };
        handleCommunicationSend(payload);
    };

    return (
        <div className="space-y-8 animate-in pb-20">
            <header className="flex justify-between items-center border-b pb-6">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight">SEND MESSAGES</h1>
                    <p className="text-slate-400 font-bold text-[11px] uppercase tracking-widest mt-1">Contact your voters</p>
                </div>
                <div className="bg-slate-800 text-white px-6 py-3 rounded-2xl text-center shadow">
                    <p className="text-[10px] font-bold uppercase opacity-60 mb-0.5">MESSAGES SENT</p>
                    <p className="text-xl font-black">{commStats?.total_sent || 0}</p>
                </div>
            </header>

            <div className="bg-white rounded-3xl p-8 shadow-lg border border-slate-100 space-y-8">
                {/* Filters Section - Always Visible */}
                <div className="bg-slate-50 p-6 rounded-2xl space-y-4">
                    <h3 className="text-[10px] font-black uppercase text-slate-400 border-b pb-2">CHOOSE WHO TO SEND TO:</h3>
                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                        <div className="space-y-1">
                            <label className="text-[9px] font-bold text-slate-400 ml-1">Constituency</label>
                            <select className="w-full p-3 bg-white rounded-xl font-bold text-xs border border-slate-200" value={listFilters.constituency} onChange={(e) => handleFilterChange({ constituency: e.target.value, lb: '', booth: '' })}>
                                <option value="">All Constituencies</option>
                                {allLocations.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[9px] font-bold text-slate-400 ml-1">Local Body</label>
                            <select disabled={!listFilters.constituency} className="w-full p-3 bg-white rounded-xl font-bold text-xs border border-slate-200 disabled:opacity-50" value={listFilters.lb} onChange={(e) => handleFilterChange({ lb: e.target.value, booth: '' })}>
                                <option value="">All Local Bodies</option>
                                {allLocations.find(c => String(c.id) === String(listFilters.constituency))?.local_bodies.map(lb => <option key={lb.id} value={lb.id}>{lb.name}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[9px] font-bold text-slate-400 ml-1">Booth</label>
                            <select disabled={!listFilters.lb} className="w-full p-3 bg-white rounded-xl font-bold text-xs border border-slate-200 disabled:opacity-50" value={listFilters.booth} onChange={(e) => handleFilterChange({ booth: e.target.value })}>
                                <option value="">All Booths</option>
                                {allLocations.find(c => String(c.id) === String(listFilters.constituency))?.local_bodies.find(lb => String(lb.id) === String(listFilters.lb))?.booths.map(b => <option key={b.id} value={b.id}>Booth {b.number}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[9px] font-bold text-slate-400 ml-1">Where they live</label>
                            <select className="w-full p-3 bg-white rounded-xl font-bold text-xs border border-slate-200" value={listFilters.location} onChange={(e) => handleFilterChange({ location: e.target.value })}>
                                <option value="">All Locations</option>
                                <option value="LOCAL">Local</option>
                                <option value="OUTSIDE_DISTRICT">Outside District</option>
                                <option value="OUTSIDE_STATE">Outside State</option>
                                <option value="ABROAD">Abroad</option>
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[9px] font-bold text-slate-400 ml-1">Party Lean</label>
                            <select className="w-full p-3 bg-white rounded-xl font-bold text-xs border border-slate-200" value={listFilters.leaning} onChange={(e) => handleFilterChange({ leaning: e.target.value })}>
                                <option value="">All Sides</option>
                                <option value="LDF">LDF</option>
                                <option value="UDF">UDF</option>
                                <option value="NDA">NDA</option>
                                <option value="NEUTRAL">Neutral</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="p-4 bg-indigo-50 rounded-2xl flex items-center justify-between border border-indigo-100">
                    <p className="text-sm font-black text-indigo-900 uppercase tracking-tight">Sending to: {getAudienceSummary()}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <button onClick={() => setCommType('WATI')} className={`p-4 rounded-2xl border-2 flex items-center justify-center gap-3 transition-all ${commType === 'WATI' ? 'border-emerald-500 bg-emerald-50 shadow-sm' : 'border-slate-100 bg-white hover:bg-slate-50'}`}>
                        <span className="text-2xl">🟢</span>
                        <div className="text-left leading-tight">
                            <h3 className="font-bold text-sm">WHATSAPP</h3>
                            <p className="text-[9px] opacity-40">With Photos</p>
                        </div>
                    </button>
                    <button onClick={() => setCommType('SMS')} className={`p-4 rounded-2xl border-2 flex items-center justify-center gap-3 transition-all ${commType === 'SMS' ? 'border-indigo-500 bg-indigo-50 shadow-sm' : 'border-slate-100 bg-white hover:bg-slate-50'}`}>
                        <span className="text-2xl">🔵</span>
                        <div className="text-left leading-tight">
                            <h3 className="font-bold text-sm">NORMAL SMS</h3>
                            <p className="text-[9px] opacity-40">Text Only</p>
                        </div>
                    </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 ml-1 uppercase tracking-tighter">Message Title</label>
                        <input type="text" value={heading} onChange={e => setHeading(e.target.value)} placeholder="Topic of your message" className="w-full p-4 bg-slate-50 rounded-xl font-bold outline-none text-sm border border-slate-100 focus:bg-white focus:border-indigo-300 transition-all" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 ml-1 uppercase tracking-tighter">Add Photo</label>
                        <div onClick={() => fileRef.current.click()} className={`w-full p-4 border border-dashed rounded-xl font-bold text-[11px] cursor-pointer bg-slate-50 flex items-center justify-center gap-2 transition-all ${selectedImage ? 'text-emerald-700 bg-emerald-50 border-emerald-500' : 'text-slate-400 border-slate-200 hover:border-slate-300 hover:bg-slate-100'}`}>
                            <span className="truncate">{selectedImage ? selectedImage.name : "Click here to pick a photo"}</span>
                            <input ref={fileRef} type="file" className="hidden" accept="image/*" onChange={e => setSelectedImage(e.target.files[0])} />
                        </div>
                    </div>
                </div>

                <div className="space-y-1">
                    <div className="flex justify-between items-center mb-1">
                        <label className="text-[10px] font-bold text-slate-400 ml-1 uppercase tracking-tighter">Your Message:</label>
                        <div className="flex gap-2">
                            {commTemplates?.map(t => (
                                <button key={t.id} onClick={() => setCommMessage(t.content)} className="text-[9px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg border border-indigo-100 hover:bg-indigo-100 transition-all">{t.name}</button>
                            ))}
                        </div>
                    </div>
                    <textarea value={commMessage} onChange={(e) => setCommMessage(e.target.value)} placeholder="Type what you want to say to the voters..." className="w-full h-34 p-4 bg-slate-50 rounded-2xl font-bold outline-none text-base border border-slate-100 focus:bg-white focus:border-indigo-300 transition-all" />
                </div>

                <button onClick={onSend} disabled={!commMessage || voterTotal === 0} className="w-full bg-slate-900 text-white py-6 rounded-2xl font-black text-lg uppercase shadow-xl hover:bg-black transition-all active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed">
                    SEND NOW
                </button>
            </div>
        </div>
    );
};

export default CommunicationHub;
