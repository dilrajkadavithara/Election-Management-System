const OCREngine = ({
    ocrBatch,
    setOcrBatch,
    ocrLoading,
    setOcrLoading,
    ocrError,
    setOcrError,
    ocrRef,
    handleFileUpload,
    startExtraction,
    startOcr,
    handleSaveBatch,
    discardBatch,
    stopAndClearRAM,
    setEditData,
    setEditMode,
    allLocations,
    ocrTargetLoc,
    setOcrTargetLoc,
    loadAdminData,
    useGemini,
    setUseGemini,
    useDirectPdf,
    setUseDirectPdf
}) => {
    const [isAddingConst, setIsAddingConst] = React.useState(false);
    const [isAddingLB, setIsAddingLB] = React.useState(false);
    const [isAddingBooth, setIsAddingBooth] = React.useState(false);
    const [newLocName, setNewLocName] = React.useState('');
    const [newLBType, setNewLBType] = React.useState('PANCHAYAT');

    React.useEffect(() => {
        if (!allLocations || allLocations.length === 0) {
            loadAdminData();
        }
    }, [allLocations, loadAdminData]);

    const handleQuickAdd = async (type) => {
        if (!newLocName) return;
        setOcrLoading(true);
        try {
            let res;
            if (type === 'const') {
                res = await api.addConst(newLocName);
                await loadAdminData();
                setOcrTargetLoc({ ...ocrTargetLoc, constId: res.id, lbId: '', boothId: '' });
                setIsAddingConst(false);
            } else if (type === 'lb') {
                res = await api.addLB(ocrTargetLoc.constId, newLocName, newLBType);
                await loadAdminData();
                setOcrTargetLoc({ ...ocrTargetLoc, lbId: res.id, boothId: '' });
                setIsAddingLB(false);
            } else if (type === 'booth') {
                res = await api.addBooth(ocrTargetLoc.constId, ocrTargetLoc.lbId, newLocName, ocrTargetLoc.psName, ocrTargetLoc.psNo);
                await loadAdminData();
                setOcrTargetLoc({ ...ocrTargetLoc, boothId: res.id });
                setIsAddingBooth(false);
            }
            setNewLocName('');
        } catch (e) { setOcrError(e.message); }
        finally { setOcrLoading(false); }
    };

    const calculateIntelligence = () => {
        if (!ocrBatch) return 0;
        if (ocrBatch.status === 'processed') return 100;
        if (ocrBatch.status !== 'processing') return 0;
        const total = Math.max(1, (ocrBatch.total_pages || 0) - 2);
        return Math.min(100, Math.round((ocrBatch.pages_processed / total) * 100));
    };

    return (
        <div className="min-h-screen lux-mesh-bg p-12 pl-96 space-y-12 lux-animate-in pb-32">
            <header className="flex justify-between items-end border-b border-white/5 pb-10">
                <div>
                    <h1 className="text-6xl font-black tracking-tighter uppercase lux-text-gradient">Neural AI Lab</h1>
                    <p className="text-slate-500 font-black uppercase tracking-[0.4em] text-[10px] mt-2 ml-1">Autonomous Intelligence Synthesis Core</p>
                </div>
                {!ocrBatch && (
                    <div className="flex gap-6 items-end">
                        {[
                            { label: 'Constituency', key: 'constId', add: setIsAddingConst, state: isAddingConst, options: allLocations },
                            { label: 'Local Body', key: 'lbId', add: setIsAddingLB, state: isAddingLB, options: allLocations.find(c => String(c.id) === String(ocrTargetLoc.constId))?.local_bodies, disabled: !ocrTargetLoc.constId },
                            { label: 'Booth Unit', key: 'boothId', add: setIsAddingBooth, state: isAddingBooth, options: allLocations.find(c => String(c.id) === String(ocrTargetLoc.constId))?.local_bodies.find(lb => String(lb.id) === String(ocrTargetLoc.lbId))?.booths, disabled: !ocrTargetLoc.lbId }
                        ].map(f => (
                            <div key={f.key} className="flex flex-col gap-2">
                                <div className="flex justify-between items-center px-1">
                                    <label className="text-[9px] font-black uppercase text-slate-500 tracking-widest">{f.label}</label>
                                    <button disabled={f.disabled} onClick={() => f.add(!f.state)} className="text-[9px] font-black text-indigo-400 hover:text-white transition-colors disabled:opacity-0">{f.state ? 'CANCEL' : '+ NEW'}</button>
                                </div>
                                {f.state ? (
                                    <div className="flex gap-2">
                                        <input autoFocus placeholder="Name..." value={newLocName} onChange={e => setNewLocName(e.target.value)} className="lux-glass !bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-[10px] font-black uppercase outline-none w-32 text-white" />
                                        <button onClick={() => handleQuickAdd(f.key.replace('Id', ''))} className="bg-indigo-600 text-white px-4 rounded-xl font-black text-[9px] uppercase tracking-widest">ADD</button>
                                    </div>
                                ) : (
                                    <select
                                        disabled={f.disabled}
                                        value={ocrTargetLoc[f.key]}
                                        onChange={(e) => setOcrTargetLoc({ ...ocrTargetLoc, [f.key]: e.target.value })}
                                        className="lux-glass border-white/10 rounded-2xl px-6 py-4 text-[10px] font-black uppercase tracking-widest outline-none disabled:opacity-20 text-slate-300 w-44"
                                    >
                                        <option value="">SELECT</option>
                                        {f.options?.map(o => <option key={o.id} value={o.id} className="bg-slate-900">{o.name || `BOOTH ${o.number}`}</option>)}
                                    </select>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </header>

            {!ocrBatch && (
                <div onClick={() => ocrRef.current.click()} className="lux-glass group p-32 rounded-[4rem] border-white/5 flex flex-col items-center justify-center gap-10 cursor-pointer hover:bg-white/5 hover:border-indigo-500/30 transition-all shadow-2xl relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="w-32 h-32 bg-indigo-500/10 rounded-[2.5rem] flex items-center justify-center text-5xl shadow-inner group-hover:scale-110 transition-all duration-700 group-hover:shadow-[0_0_30px_rgba(99,102,241,0.2)] border border-white/5">📄</div>
                    <div className="text-center space-y-4 relative z-10">
                        <h2 className="text-4xl font-black uppercase tracking-tighter lux-text-gradient">Inject Source Matrix</h2>
                        <p className="text-slate-500 font-black uppercase tracking-[0.4em] text-[10px]">Optimized for Neural Parallel Extraction Protocol</p>
                    </div>
                    <input type="file" ref={ocrRef} className="hidden" accept="application/pdf" onChange={handleFileUpload} />
                    <div className="v2-scanline absolute inset-0 opacity-20 pointer-events-none" />
                </div>
            )}

            {ocrBatch && (
                <div className="grid grid-cols-12 gap-10">
                    <div className="col-span-4 lux-card bg-indigo-900/10 border-indigo-500/20 shadow-2xl flex flex-col justify-between p-12 min-h-[600px]">
                        <div>
                            <h3 className="font-black uppercase tracking-[0.3em] text-[10px] text-indigo-400 mb-12 italic border-b border-white/5 pb-4">Neural Flow Status</h3>
                            <div className="space-y-8">
                                {[
                                    { step: 'uploaded', label: 'Matrix Ingestion', icon: '📥' },
                                    { step: 'processing', label: 'Parallel Extraction', icon: '⚡' },
                                    { step: 'extracted', label: 'Target Stream Secured', icon: '🎯' },
                                    { step: 'processed', label: 'Intelligence Synthesis', icon: '✨' }
                                ].map((s, i) => {
                                    const steps = ['uploaded', 'processing', 'extracted', 'processed'];
                                    const status = ocrBatch.status;
                                    const currentIndex = steps.indexOf(status === 'extracting' ? 'processing' : status);
                                    const itemIndex = steps.indexOf(s.step);
                                    const isDone = itemIndex < currentIndex;
                                    const isActive = itemIndex === currentIndex;

                                    return (
                                        <div key={s.step} className={`flex items-center gap-6 group transition-all duration-700 ${isActive ? 'scale-110 translate-x-4' : isDone ? 'opacity-30' : 'opacity-50'}`}>
                                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl border transition-all ${isActive ? 'bg-indigo-600 border-indigo-400 shadow-[0_0_20px_#6366f1]' : 'bg-white/5 border-white/5'}`}>
                                                {isDone ? '✅' : s.icon}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className={`text-[11px] font-black uppercase tracking-widest ${isActive ? 'text-white' : 'text-slate-500'}`}>{s.label}</span>
                                                {isActive && <div className="h-1 w-12 bg-indigo-500 mt-2 animate-pulse rounded-full" />}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="lux-glass !bg-rose-500/5 border-rose-500/20 p-8 rounded-3xl mt-12">
                            <p className="text-[9px] font-black text-rose-400 uppercase tracking-widest mb-4">Risk Management</p>
                            <button onClick={stopAndClearRAM} className="w-full py-4 rounded-xl bg-rose-500 text-white font-black uppercase text-[10px] tracking-widest shadow-lg hover:bg-rose-600 transition-all">Emergency Deactivate</button>
                        </div>
                    </div>

                    <div className="col-span-8 space-y-10">
                        <div className="lux-card !bg-black border-white/10 p-16 relative overflow-hidden min-h-[450px] shadow-2xl">
                            <div className="v2-scanline absolute inset-0 opacity-10" />
                            <div className="relative z-10 flex flex-col h-full">
                                <h2 className="text-8xl font-black uppercase tracking-tighter leading-none mb-12">
                                    {ocrBatch.status === 'uploaded' && <span className="text-slate-800">READY_FOR_EXTRACT</span>}
                                    {(ocrBatch.status === 'extracting' || ocrBatch.status === 'processing') && <span className="lux-text-gradient animate-pulse italic">NEURAL_DEEP_SYNC</span>}
                                    {ocrBatch.status === 'extracted' && <span className="text-indigo-600">TARGET_LOCKED</span>}
                                    {ocrBatch.status === 'processed' && <span className="text-emerald-500">SYNTHESIS_COMPLETE</span>}
                                </h2>

                                <div className="grid grid-cols-3 gap-12 mt-auto">
                                    {[
                                        { l: 'Matrix Pages', v: ocrBatch.total_pages || 0, c: 'text-white' },
                                        { l: 'Neural Sync', v: `${calculateIntelligence()}%`, c: 'text-indigo-400' },
                                        { l: 'Asset Records', v: ocrBatch.voters_processed || 0, c: 'text-emerald-400' }
                                    ].map(m => (
                                        <div key={m.l}>
                                            <p className="text-[9px] font-black uppercase text-slate-600 tracking-[0.2em] mb-3">{m.l}</p>
                                            <p className={`text-5xl font-black ${m.c} tracking-tighter italic`}>{m.v}</p>
                                            {m.l === 'Neural Sync' && (
                                                <div className="h-1 w-full bg-white/5 mt-4 rounded-full overflow-hidden">
                                                    <div className="h-full bg-indigo-500 shadow-[0_0_10px_#6366f1] transition-all duration-1000" style={{ width: m.v }} />
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-10">
                            <div className="lux-card bg-emerald-500/5 border-emerald-500/20 p-10 flex justify-between items-center group cursor-pointer hover:bg-emerald-500/10 transition-all shadow-xl">
                                <div>
                                    <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-2">Optimal Profiles</p>
                                    <p className="text-5xl font-black text-white group-hover:scale-110 transition-transform origin-left">{ocrBatch.clean_count || 0}</p>
                                </div>
                                <div className="text-5xl opacity-20 transform group-hover:rotate-12 transition-all">💎</div>
                            </div>
                            <div className="lux-card bg-rose-500/5 border-rose-500/20 p-10 flex justify-between items-center group cursor-pointer hover:bg-rose-500/10 transition-all shadow-xl">
                                <div>
                                    <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-2">Tactical Anomalies</p>
                                    <p className="text-5xl font-black text-white group-hover:scale-110 transition-transform origin-left">{ocrBatch.flagged_count || 0}</p>
                                </div>
                                <div className="text-5xl opacity-20 transform group-hover:-rotate-12 transition-all">🚩</div>
                            </div>
                        </div>

                        <div className="flex gap-8 mt-10">
                            {ocrBatch.status === 'uploaded' && <button onClick={startExtraction} className="lux-btn-primary flex-1 !py-8 text-sm tracking-[0.3em]">Initialize Matrix Extraction Protocol</button>}
                            {ocrBatch.status === 'extracted' && <button onClick={startOcr} className="lux-btn-primary flex-1 !py-8 text-sm tracking-[0.3em] !from-indigo-600 !to-purple-600 shadow-[0_0_30px_rgba(99,102,241,0.5)]">Deploy Neural AI Core ⚡</button>}
                            {ocrBatch.status === 'processed' && (
                                <div className="flex-1 flex gap-6">
                                    <button onClick={handleSaveBatch} className="flex-1 bg-white text-black py-8 rounded-[2rem] font-black uppercase text-[11px] tracking-[0.2em] shadow-2xl hover:bg-indigo-400 hover:text-white transition-all">Commit Intelligence to DB</button>
                                    <button onClick={() => api.exportBatchCSV(ocrBatch.id)} className="px-12 lux-glass rounded-[2rem] font-black text-white text-[11px] uppercase tracking-widest border-white/10 hover:bg-white/10">Export Result</button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OCREngine;
