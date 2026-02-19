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
        let summary = `${voterTotal} Synchronized Assets`;
        if (listFilters.constituency) {
            const c = allLocations.find(l => String(l.id) === String(listFilters.constituency));
            summary += ` in ${c?.name || 'Sector'}`;
        }
        if (listFilters.booth) {
            summary += ` (Unit ${listFilters.booth})`;
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
        <div className="min-h-screen lux-mesh-bg p-12 pl-96 space-y-12 lux-animate-in pb-32">
            <header className="flex justify-between items-end border-b border-white/5 pb-10">
                <div>
                    <h1 className="text-6xl font-black tracking-tighter uppercase lux-text-gradient">Propagation Hub</h1>
                    <p className="text-slate-300 font-black uppercase tracking-[0.4em] text-[10px] mt-2 ml-1">Strategic Awareness Deployment Center</p>
                </div>
                <div className="lux-glass border-indigo-500/20 px-8 py-5 rounded-[2rem] text-center shadow-2xl relative overflow-hidden group">
                    <div className="absolute inset-0 bg-indigo-500/5 group-hover:bg-indigo-500/10 transition-colors" />
                    <p className="text-[9px] font-black uppercase text-indigo-400 tracking-widest mb-1 relative z-10">Total Reach</p>
                    <p className="text-3xl font-black text-white italic relative z-10">{commStats?.total_sent || 0}</p>
                </div>
            </header>

            <div className="grid grid-cols-12 gap-10">
                <div className="col-span-12 lux-glass p-8 rounded-[2.5rem] border-white/5 shadow-2xl space-y-8">
                    <h3 className="text-[10px] font-black uppercase text-indigo-400 tracking-[0.3em] border-b border-white/5 pb-4 italic">Target Acquisition Matrix</h3>
                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-6">
                        {[
                            { label: 'Sector (Const)', key: 'constituency', options: allLocations },
                            { label: 'Unit (Local Body)', key: 'lb', options: allLocations.find(c => String(c.id) === String(listFilters.constituency))?.local_bodies, disabled: !listFilters.constituency },
                            { label: 'Module (Booth)', key: 'booth', options: allLocations.find(c => String(c.id) === String(listFilters.constituency))?.local_bodies.find(lb => String(lb.id) === String(listFilters.lb))?.booths, disabled: !listFilters.lb },
                            { label: 'Neural Location', key: 'location', options: [{ id: 'LOCAL', name: 'LOCAL' }, { id: 'ABROAD', name: 'ABROAD' }, { id: 'STATE', name: 'OTHER STATE' }, { id: 'DISTRICT', name: 'OTHER DIST' }] },
                            { label: 'Leaning Bias', key: 'leaning', options: [{ id: 'LDF', name: 'LDF' }, { id: 'UDF', name: 'UDF' }, { id: 'NDA', name: 'NDA' }, { id: 'NEUTRAL', name: 'NEUTRAL' }] }
                        ].map(f => (
                            <div key={f.key} className="space-y-2">
                                <label className="text-[9px] font-black text-slate-300 uppercase tracking-widest ml-1">{f.label}</label>
                                <select
                                    className="w-full bg-slate-900/50 text-slate-300 border border-white/10 rounded-xl px-4 py-3 text-[10px] font-black uppercase tracking-widest outline-none focus:border-indigo-500/50 transition-all disabled:opacity-20 appearance-none"
                                    value={listFilters[f.key]}
                                    onChange={(e) => handleFilterChange({ [f.key]: e.target.value })}
                                >
                                    <option value="" className="bg-slate-900">GLOBAL</option>
                                    {f.options?.map(o => <option key={o.id} value={o.id} className="bg-slate-900">{o.name || `BOOTH ${o.number}`}</option>)}
                                </select>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="col-span-12 lux-card !bg-indigo-600/10 border-indigo-500/30 p-8 flex items-center justify-between group overflow-hidden relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
                    <div className="flex items-center gap-6 relative z-10">
                        <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_10px_#10b981] animate-pulse" />
                        <p className="text-sm font-black text-indigo-100 uppercase tracking-[0.2em] italic">Deployment Vector: {getAudienceSummary()}</p>
                    </div>
                    <div className="text-[10px] font-black text-indigo-400 tracking-[0.4em] relative z-10 group-hover:text-white transition-colors">READY_FOR_PROPAGATION</div>
                </div>

                <div className="col-span-12 grid grid-cols-2 gap-10">
                    <div className="space-y-10">
                        <div className="grid grid-cols-2 gap-6">
                            {[
                                { id: 'WATI', name: 'NEURAL WHATSAPP', icon: '🟢', desc: 'Multimedia Stream' },
                                { id: 'SMS', name: 'DIRECT SMS', icon: '🔵', desc: 'Secure Text Stream' }
                            ].map(t => (
                                <button key={t.id} onClick={() => setCommType(t.id)} className={`p-8 rounded-[2rem] border transition-all duration-700 flex flex-col items-center gap-4 group ${commType === t.id ? 'bg-indigo-600/20 border-indigo-500 shadow-[0_0_30px_rgba(99,102,241,0.2)]' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}>
                                    <span className="text-4xl group-hover:scale-125 transition-transform duration-500">{t.icon}</span>
                                    <div className="text-center">
                                        <h3 className="font-black text-[12px] uppercase tracking-widest text-white">{t.name}</h3>
                                        <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest mt-1">{t.desc}</p>
                                    </div>
                                    {commType === t.id && <div className="w-12 h-1 bg-indigo-500 rounded-full animate-pulse" />}
                                </button>
                            ))}
                        </div>

                        <div className="lux-glass p-10 rounded-[2.5rem] border-white/5 space-y-8">
                            <div className="space-y-3">
                                <label className="text-[9px] font-black text-slate-300 uppercase tracking-widest ml-1">Message Header</label>
                                <input type="text" value={heading} onChange={e => setHeading(e.target.value)} placeholder="ENTER PROTOCOL TOPIC" className="w-full bg-slate-900/50 text-white border border-white/10 rounded-2xl px-6 py-4 text-[11px] font-black uppercase tracking-widest outline-none focus:border-indigo-500/50 transition-all placeholder-slate-700" />
                            </div>
                            <div className="space-y-3">
                                <label className="text-[9px] font-black text-slate-300 uppercase tracking-widest ml-1">Multimedia Asset</label>
                                <div onClick={() => fileRef.current.click()} className={`w-full p-6 border-2 border-dashed rounded-2xl flex items-center justify-center gap-4 cursor-pointer transition-all duration-700 ${selectedImage ? 'bg-indigo-500/10 border-indigo-500 shadow-inner' : 'bg-white/5 border-white/5 hover:border-white/20'}`}>
                                    <span className="text-xl">{selectedImage ? '✨' : '📎'}</span>
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 truncate max-w-[200px]">{selectedImage ? selectedImage.name : "Inject Media Block"}</span>
                                    <input ref={fileRef} type="file" className="hidden" accept="image/*" onChange={e => setSelectedImage(e.target.files[0])} />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="lux-glass p-10 rounded-[2.5rem] border-white/5 flex flex-col shadow-[0_0_80px_rgba(0,0,0,0.5)]">
                        <div className="flex justify-between items-center mb-8 border-b border-white/5 pb-6">
                            <label className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] italic">Neural Template Hub</label>
                            <div className="flex gap-2">
                                {commTemplates?.map(t => (
                                    <button key={t.id} onClick={() => setCommMessage(t.content)} className="px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-indigo-500 hover:text-white transition-all shadow-lg">{t.name}</button>
                                ))}
                            </div>
                        </div>
                        <textarea
                            value={commMessage}
                            onChange={(e) => setCommMessage(e.target.value)}
                            placeholder="INITIALIZE MESSAGE CONTENT STREAM..."
                            className="flex-1 w-full bg-transparent text-white text-lg font-medium outline-none resize-none placeholder-slate-800 leading-relaxed"
                        />
                        <div className="mt-8 pt-8 border-t border-white/5">
                            <button
                                onClick={onSend}
                                disabled={!commMessage || voterTotal === 0}
                                className="w-full lux-btn-primary !py-8 text-sm tracking-[0.4em] shadow-[0_0_40px_rgba(99,102,241,0.3)] group overflow-hidden relative"
                            >
                                <div className="absolute inset-0 bg-white/20 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 italic" />
                                INITIATE PROPAGATION
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CommunicationHub;
