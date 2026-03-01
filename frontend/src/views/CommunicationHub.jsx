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
        const newFilters = { ...listFilters, ...updates };
        setListFilters(newFilters);
        loadVoters(1, newFilters);
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
        <div className="min-h-screen lux-mesh-bg p-6 lg:p-12 pl-6 lg:pl-[420px] pr-6 lg:pr-16 space-y-8 lg:space-y-16 lux-animate-in pb-32 pt-24 lg:pt-12">
            <header className="flex flex-col lg:flex-row justify-between items-start lg:items-end border-b border-white/5 pb-6 lg:pb-10 gap-6 lg:gap-12">
                <div>
                    <h1 className="text-4xl lg:text-7xl font-black tracking-tight uppercase lux-text-gradient">Send Messages</h1>
                    <p className="text-slate-300 font-bold uppercase tracking-widest text-xs lg:text-sm mt-3 ml-1">Send SMS and WhatsApp to Voters</p>
                </div>
                <div className="lux-glass border-indigo-500/20 px-8 py-5 rounded-[2rem] text-center shadow-2xl relative overflow-hidden group w-full lg:w-auto mt-4 lg:mt-0">
                    <div className="absolute inset-0 bg-indigo-500/5 group-hover:bg-indigo-500/10 transition-colors" />
                    <p className="text-[11px] font-black uppercase text-indigo-400 tracking-widest mb-1 relative z-10">Total Messages Sent</p>
                    <p className="text-3xl font-black text-white italic relative z-10">{commStats?.total_sent || 0}</p>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10">
                <div className="col-span-1 lg:col-span-12 lux-glass p-6 lg:p-8 rounded-3xl lg:rounded-[2.5rem] border-white/5 shadow-2xl space-y-6 lg:space-y-8">
                    <h3 className="text-sm font-black uppercase text-indigo-400 tracking-widest border-b border-white/5 pb-4">Audience Filters</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
                        {[
                            { label: 'Constituency', key: 'constituency', options: allLocations },
                            { label: 'Local Body', key: 'lb', options: allLocations.find(c => String(c.id) === String(listFilters.constituency))?.local_bodies, disabled: !listFilters.constituency },
                            { label: 'Booth', key: 'booth', options: allLocations.find(c => String(c.id) === String(listFilters.constituency))?.local_bodies.find(lb => String(lb.id) === String(listFilters.lb))?.booths, disabled: !listFilters.lb },
                            { label: 'Political Leaning', key: 'leaning', options: [{ id: 'LDF', name: 'LDF' }, { id: 'UDF', name: 'UDF' }, { id: 'NDA', name: 'NDA' }, { id: 'NEUTRAL', name: 'NEUTRAL' }] },
                            { label: 'Gender', key: 'gender', options: [{ id: 'MALE', name: 'MALE' }, { id: 'FEMALE', name: 'FEMALE' }, { id: 'TRANSGENDER', name: 'TRANSGENDER' }] },
                            { label: 'Age Group', key: 'ageRange', options: [{ id: '18-25', name: '18-25' }, { id: '26-40', name: '26-40' }, { id: '41-60', name: '41-60' }, { id: '60-', name: '60+' }] },
                            { label: 'Voter Location', key: 'location', options: [{ id: 'LOCAL', name: 'LOCAL' }, { id: 'ABROAD', name: 'ABROAD' }, { id: 'STATE', name: 'OTHER STATE' }, { id: 'DISTRICT', name: 'OTHER DIST' }] }
                        ].map(f => (
                            <div key={f.key} className="space-y-2">
                                <label className="text-xs font-black text-slate-300 uppercase tracking-widest ml-1">{f.label}</label>
                                <select
                                    disabled={f.disabled}
                                    className="w-full bg-slate-900/50 text-slate-300 border border-white/10 rounded-xl px-4 py-3 text-sm font-black uppercase tracking-widest outline-none focus:border-indigo-500/50 transition-all disabled:opacity-20 appearance-none bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIHZpZXdCb3g9IjAgMCAyMCAyMCI+PHBhdGggc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBzdHJva2Utd2lkdGg9IjEuNSIgZD0ibTYgOGw0IDQgNC00Ii8+PC9zdmc+')] bg-no-repeat bg-[position:right_1rem_center] bg-[length:1.2em_1.2em] pr-10"
                                    value={f.key === 'ageRange' ? (listFilters.ageFrom ? `${listFilters.ageFrom}-${listFilters.ageTo === '150' ? '' : listFilters.ageTo}` : '') : listFilters[f.key] || ''}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        if (f.key === 'ageRange') {
                                            if (val === '18-25') handleFilterChange({ ageFrom: '18', ageTo: '25' });
                                            else if (val === '26-40') handleFilterChange({ ageFrom: '26', ageTo: '40' });
                                            else if (val === '41-60') handleFilterChange({ ageFrom: '41', ageTo: '60' });
                                            else if (val === '60-') handleFilterChange({ ageFrom: '60', ageTo: '150' });
                                            else handleFilterChange({ ageFrom: '', ageTo: '' });
                                        } else {
                                            handleFilterChange({ [f.key]: val });
                                        }
                                    }}
                                >
                                    <option value="" className="bg-slate-900">ALL</option>
                                    {f.options?.map(o => <option key={o.id} value={o.id} className="bg-slate-900">{o.name || `BOOTH ${o.number}`}</option>)}
                                </select>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="col-span-1 lg:col-span-12 lux-card !bg-indigo-600/10 border-indigo-500/30 p-6 lg:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group overflow-hidden relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
                    <div className="flex items-center gap-4 lg:gap-6 relative z-10">
                        <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_10px_#10b981] animate-pulse" />
                        <p className="text-xs lg:text-sm font-black text-indigo-100 uppercase tracking-widest">Audience Size: <br className="sm:hidden" />{voterTotal} Voters Selected</p>
                    </div>
                    <div className="text-xs lg:text-sm font-black text-indigo-400 tracking-widest relative z-10 group-hover:text-white transition-colors">READY TO SEND</div>
                </div>

                <div className="col-span-1 lg:col-span-12 grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10">
                    <div className="space-y-6 lg:space-y-10">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6">
                            {[
                                { id: 'WATI', name: 'WhatsApp', icon: '🟢', desc: 'With Images & Text' },
                                { id: 'SMS', name: 'Direct SMS', icon: '🔵', desc: 'Text Only' }
                            ].map(t => (
                                <button key={t.id} onClick={() => setCommType(t.id)} className={`p-8 rounded-[2rem] border transition-all duration-700 flex flex-col items-center gap-4 group ${commType === t.id ? 'bg-indigo-600/20 border-indigo-500 shadow-[0_0_30px_rgba(99,102,241,0.2)]' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}>
                                    <span className="text-4xl group-hover:scale-125 transition-transform duration-500">{t.icon}</span>
                                    <div className="text-center">
                                        <h3 className="font-black text-sm uppercase tracking-widest text-white">{t.name}</h3>
                                        <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest mt-1">{t.desc}</p>
                                    </div>
                                    {commType === t.id && <div className="w-12 h-1 bg-indigo-500 rounded-full animate-pulse" />}
                                </button>
                            ))}
                        </div>

                        <div className="lux-glass p-6 lg:p-10 rounded-3xl lg:rounded-[2.5rem] border-white/5 space-y-6 lg:space-y-8">
                            <div className="space-y-3">
                                <label className="text-xs font-black text-slate-300 uppercase tracking-widest ml-1">Message Title</label>
                                <input type="text" value={heading} onChange={e => setHeading(e.target.value)} placeholder="ENTER CAMPAIGN TOPIC" className="w-full bg-slate-900/50 text-white border border-white/10 rounded-2xl px-6 py-4 text-sm font-bold tracking-wide outline-none focus:border-indigo-500/50 transition-all placeholder-slate-700" />
                            </div>
                            <div className="space-y-3">
                                <label className="text-xs font-black text-slate-300 uppercase tracking-widest ml-1">Attach Image (Optional)</label>
                                <div onClick={() => fileRef.current.click()} className={`w-full p-6 border-2 border-dashed rounded-2xl flex items-center justify-center gap-4 cursor-pointer transition-all duration-700 ${selectedImage ? 'bg-indigo-500/10 border-indigo-500 shadow-inner' : 'bg-white/5 border-white/5 hover:border-white/20'}`}>
                                    <span className="text-xl">{selectedImage ? '✨' : '📎'}</span>
                                    <span className="text-[11px] font-black uppercase tracking-widest text-slate-400 truncate max-w-[200px]">{selectedImage ? selectedImage.name : "Upload Image"}</span>
                                    <input ref={fileRef} type="file" className="hidden" accept="image/*" onChange={e => setSelectedImage(e.target.files[0])} />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="lux-glass p-6 lg:p-10 rounded-3xl lg:rounded-[2.5rem] border-white/5 flex flex-col shadow-[0_0_80px_rgba(0,0,0,0.5)]">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 lg:mb-8 border-b border-white/5 pb-4 lg:pb-6 gap-4">
                            <label className="text-sm font-black text-indigo-400 uppercase tracking-widest">Message Templates</label>
                            <div className="flex flex-wrap gap-2">
                                {commTemplates?.map(t => (
                                    <button key={t.id} onClick={() => setCommMessage(t.content)} className="px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-indigo-500 hover:text-white transition-all shadow-lg">{t.name}</button>
                                ))}
                            </div>
                        </div>
                        <textarea
                            value={commMessage}
                            onChange={(e) => setCommMessage(e.target.value)}
                            placeholder="Type your message here..."
                            className="flex-1 w-full bg-transparent text-white text-lg font-medium outline-none resize-none placeholder-slate-800 leading-relaxed"
                        />
                        <div className="mt-6 sm:mt-8 pt-6 sm:pt-8 border-t border-white/5">
                            <button
                                onClick={onSend}
                                disabled={!commMessage || voterTotal === 0}
                                className="w-full lux-btn-primary !py-8 text-sm tracking-widest shadow-[0_0_40px_rgba(99,102,241,0.3)] group overflow-hidden relative"
                            >
                                <div className="absolute inset-0 bg-white/20 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                                SEND MESSAGE
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CommunicationHub;
