import React, { useState, useEffect } from 'react';
import api from '../api';

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
    const [isAddingConst, setIsAddingConst] = useState(false);
    const [isAddingLB, setIsAddingLB] = useState(false);
    const [newLocName, setNewLocName] = useState('');
    const [newLBType, setNewLBType] = useState('PANCHAYAT');
    const [validationTriggered, setValidationTriggered] = useState(false);
    const [newPSName, setNewPSName] = useState('');
    const [newPSNo, setNewPSNo] = useState('');
    const [isAddingBooth, setIsAddingBooth] = useState(false);

    useEffect(() => {
        if (!allLocations || allLocations.length === 0) {
            loadAdminData();
        }
    }, [allLocations, loadAdminData]);

    useEffect(() => {
        if (ocrTargetLoc.boothId && allLocations.length > 0) {
            const currentConst = allLocations.find(c => String(c.id) === String(ocrTargetLoc.constId));
            const currentLB = currentConst?.local_bodies.find(lb => String(lb.id) === String(ocrTargetLoc.lbId));
            const currentBooth = currentLB?.booths.find(b => String(b.id) === String(ocrTargetLoc.boothId));

            if (currentBooth) {
                if (ocrTargetLoc.psName !== (currentBooth.ps_name || '') || ocrTargetLoc.psNo !== (currentBooth.ps_no || '') || ocrTargetLoc.boothNo !== (currentBooth.number || '')) {
                    setOcrTargetLoc(prev => ({
                        ...prev,
                        boothNo: currentBooth.number || '',
                        psNo: (currentBooth.ps_no || '').padStart(3, '0'),
                        psName: currentBooth.ps_name || ''
                    }));
                }
            }
        }
    }, [ocrTargetLoc.boothId, allLocations, ocrTargetLoc.constId, ocrTargetLoc.lbId]);

    const triggerUpload = () => {
        const errors = [];
        if (!ocrTargetLoc.constId) errors.push("Constituency");
        if (!ocrTargetLoc.lbId) errors.push("Local Body");
        if (!ocrTargetLoc.boothNo) errors.push("Booth No");
        if (!ocrTargetLoc.psNo) errors.push("PS No");
        if (!ocrTargetLoc.psName) errors.push("Polling Station Name");

        if (errors.length > 0) {
            setOcrError(`Mandatory Intelligence Required: ${errors.join(", ")}`);
            setValidationTriggered(true);
            return;
        }
        setOcrError(null);
        setValidationTriggered(false);
        ocrRef.current.click();
    };

    const handleQuickAdd = async (type) => {
        if (!newLocName) return;

        // Frontend Validation to prevent 500s
        if (type === 'lb' && !ocrTargetLoc.constId) {
            setOcrError("Please select a Constituency first before adding a Local Body.");
            return;
        }
        if (type === 'booth' && (!ocrTargetLoc.constId || !ocrTargetLoc.lbId)) {
            setOcrError("Please select Constituency and Local Body first before adding a Booth.");
            return;
        }

        setOcrLoading(true);
        try {
            let res;
            if (type === 'const') {
                res = await api.addConst(newLocName);
                await loadAdminData();
                setOcrTargetLoc({ ...ocrTargetLoc, constId: String(res.id), lbId: '', boothId: '' });
                setIsAddingConst(false);
            } else if (type === 'lb') {
                res = await api.addLB(ocrTargetLoc.constId, newLocName, newLBType);
                await loadAdminData();
                setOcrTargetLoc({ ...ocrTargetLoc, lbId: String(res.id), boothId: '' });
                setIsAddingLB(false);
            } else if (type === 'booth') {
                res = await api.addBooth(ocrTargetLoc.constId, ocrTargetLoc.lbId, newLocName, newPSName, newPSNo);
                await loadAdminData();
                setOcrTargetLoc({ ...ocrTargetLoc, boothId: String(res.id) });
                setIsAddingBooth(false);
            }
            setNewLocName('');
            setNewPSName('');
            setNewPSNo('');
        } catch (e) {
            console.error("Quick Add Error:", e);
            const errorMsg = e.response?.data?.detail;
            const finalMsg = typeof errorMsg === 'string' ? errorMsg : (JSON.stringify(errorMsg) || e.message);
            setOcrError(finalMsg);
        }
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
        <div className="min-h-screen lux-mesh-bg p-12 pl-96 space-y-16 lux-animate-in pb-32">
            <header className="space-y-12">
                {/* Header Section: Cybernetic Identity */}
                <div className="flex justify-between items-end border-b border-indigo-500/10 pb-10">
                    <div className="space-y-2">
                        <h1 className="text-8xl font-black tracking-tighter uppercase lux-text-gradient leading-none">AI Processor</h1>
                        <p className="text-indigo-500/60 font-black uppercase tracking-[0.8em] text-[10px] ml-2">Secure Link Active // v5.2</p>
                    </div>
                </div>

                {/* Tactical Location Grid: 2-Row Layout */}
                <div className="lux-glass bg-slate-900/60 p-12 rounded-[3.5rem] border border-white/5 backdrop-blur-3xl shadow-2xl space-y-10 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-30 pointer-events-none" />

                    {/* Row 1: High-Width Units */}
                    <div className="grid grid-cols-2 gap-12 relative z-10">
                        {/* Constituency Column */}
                        <div className="space-y-4">
                            <div className="flex justify-between items-center px-2">
                                <label className={`text-[10px] font-black uppercase tracking-[0.4em] ${validationTriggered && !ocrTargetLoc.constId ? 'text-rose-500' : 'text-indigo-400/80'}`}>Constituency</label>
                            </div>
                            <div className="flex gap-4">
                                {isAddingConst ? (
                                    <input autoFocus placeholder="Register New Constituency..." value={newLocName} onChange={e => setNewLocName(e.target.value)} className="flex-1 bg-black/40 border-2 border-indigo-500/30 rounded-2xl px-8 py-5 text-sm font-bold text-white outline-none focus:border-indigo-500 shadow-inner" />
                                ) : (
                                    <div className="relative flex-1">
                                        <select
                                            value={ocrTargetLoc.constId}
                                            onChange={(e) => setOcrTargetLoc({ ...ocrTargetLoc, constId: e.target.value, lbId: '', boothId: '', boothNo: '', psNo: '', psName: '' })}
                                            className={`w-full bg-black/40 border-2 rounded-2xl px-8 py-5 text-sm font-bold uppercase text-white outline-none cursor-pointer transition-all appearance-none ${validationTriggered && !ocrTargetLoc.constId ? 'border-rose-600' : 'border-white/10 hover:border-white/20'}`}
                                        >
                                            <option value="">-- SELECT CONSTITUENCY --</option>
                                            {allLocations?.map(o => <option key={o.id} value={o.id} className="bg-slate-900">{o.name}</option>)}
                                        </select>
                                        <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-indigo-500/50">▼</div>
                                    </div>
                                )}
                                <button onClick={() => { if (isAddingConst && newLocName) handleQuickAdd('const'); else setIsAddingConst(!isAddingConst); }} className={`w-16 h-[60px] rounded-2xl flex items-center justify-center text-xl transition-all border-2 ${isAddingConst ? 'bg-indigo-600 border-indigo-400' : 'bg-black/40 border-white/10 hover:border-indigo-500/50 text-indigo-400'}`}>
                                    {isAddingConst ? '✓' : '+'}
                                </button>
                            </div>
                        </div>

                        {/* Local Body Column */}
                        <div className="space-y-4">
                            <div className="flex justify-between items-center px-2">
                                <label className={`text-[10px] font-black uppercase tracking-[0.4em] ${validationTriggered && !ocrTargetLoc.lbId ? 'text-rose-500' : 'text-indigo-400/80'}`}>Local Body</label>
                            </div>
                            <div className="flex gap-4">
                                {isAddingLB ? (
                                    <div className="flex-1 flex gap-2">
                                        <input autoFocus placeholder="New Local Body..." value={newLocName} onChange={e => setNewLocName(e.target.value)} className="flex-1 bg-black/40 border-2 border-indigo-500/30 rounded-2xl px-6 py-5 text-sm font-bold text-white outline-none" />
                                        <select value={newLBType} onChange={e => setNewLBType(e.target.value)} className="w-[100px] bg-black/40 border border-white/10 rounded-xl px-2 text-[9px] font-black uppercase text-white">
                                            <option value="PANCHAYAT">PCH</option>
                                            <option value="MUNICIPALITY">MUN</option>
                                            <option value="CORPORATION">COR</option>
                                        </select>
                                    </div>
                                ) : (
                                    <div className="relative flex-1">
                                        <select
                                            disabled={!ocrTargetLoc.constId}
                                            value={ocrTargetLoc.lbId}
                                            onChange={(e) => setOcrTargetLoc({ ...ocrTargetLoc, lbId: e.target.value, boothId: '', boothNo: '', psNo: '', psName: '' })}
                                            className={`w-full bg-black/40 border-2 rounded-2xl px-8 py-5 text-sm font-bold uppercase text-white outline-none cursor-pointer transition-all appearance-none disabled:opacity-20 ${validationTriggered && !ocrTargetLoc.lbId ? 'border-rose-600' : 'border-white/10 hover:border-white/20'}`}
                                        >
                                            <option value="">-- SELECT LOCAL BODY --</option>
                                            {allLocations.find(c => String(c.id) === String(ocrTargetLoc.constId))?.local_bodies?.map(o => <option key={o.id} value={o.id} className="bg-slate-900">{o.name}</option>)}
                                        </select>
                                        <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-indigo-500/50">▼</div>
                                    </div>
                                )}
                                <button disabled={!ocrTargetLoc.constId} onClick={() => { if (isAddingLB && newLocName) handleQuickAdd('lb'); else setIsAddingLB(!isAddingLB); }} className={`w-16 h-[60px] rounded-2xl flex items-center justify-center text-xl transition-all border-2 disabled:opacity-10 ${isAddingLB ? 'bg-indigo-600 border-indigo-400' : 'bg-black/40 border-white/10 hover:border-indigo-500/50 text-indigo-400'}`}>
                                    {isAddingLB ? '✓' : '+'}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Row 2: Metadata Units */}
                    <div className="grid grid-cols-12 gap-8 relative z-10">
                        {/* Booth No (2 blocks) */}
                        <div className="col-span-3 space-y-4">
                            <label className={`text-[10px] font-black uppercase tracking-[0.4em] px-2 block ${validationTriggered && !ocrTargetLoc.boothNo ? 'text-rose-500' : 'text-indigo-400/80'}`}>Booth No</label>
                            <div className="flex gap-4">
                                {isAddingBooth ? (
                                    <input autoFocus placeholder="No..." value={ocrTargetLoc.boothNo} onChange={e => setOcrTargetLoc({ ...ocrTargetLoc, boothId: '', boothNo: e.target.value })} className="flex-1 bg-black/40 border-2 border-indigo-500/50 rounded-2xl px-6 py-5 text-sm font-black text-indigo-400 text-center outline-none h-[60px]" />
                                ) : (
                                    <div className="relative flex-1">
                                        <select
                                            disabled={!ocrTargetLoc.lbId}
                                            value={ocrTargetLoc.boothId}
                                            onChange={(e) => setOcrTargetLoc({ ...ocrTargetLoc, boothId: e.target.value })}
                                            className={`w-full bg-black/40 border-2 rounded-2xl px-6 py-5 text-sm font-bold uppercase text-white outline-none appearance-none disabled:opacity-20 ${validationTriggered && !ocrTargetLoc.boothNo ? 'border-rose-600' : 'border-white/10'}`}
                                        >
                                            <option value="">-- CHOOSE BOOTH --</option>
                                            {allLocations.find(c => String(c.id) === String(ocrTargetLoc.constId))?.local_bodies?.find(lb => String(lb.id) === String(ocrTargetLoc.lbId))?.booths?.map(o => (
                                                <option key={o.id} value={o.id} className="bg-slate-900">BOOTH {o.number}</option>
                                            ))}
                                        </select>
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-indigo-500/50 text-[10px]">▼</div>
                                    </div>
                                )}
                                <button disabled={!ocrTargetLoc.lbId} onClick={() => setIsAddingBooth(!isAddingBooth)} className={`w-14 h-[60px] rounded-2xl flex items-center justify-center text-lg transition-all border-2 disabled:opacity-10 ${isAddingBooth ? 'bg-indigo-600 border-indigo-400' : 'bg-black/40 border-white/10 hover:border-indigo-500/50 text-indigo-400'}`}>
                                    {isAddingBooth ? '✓' : '+'}
                                </button>
                            </div>
                        </div>

                        {/* PS No (1 block) */}
                        <div className="col-span-1 space-y-4">
                            <label className={`text-[10px] font-black uppercase tracking-[0.4em] px-2 block ${validationTriggered && !ocrTargetLoc.psNo ? 'text-rose-500' : 'text-indigo-400/80'}`}>PS No</label>
                            <input maxLength={3} placeholder="###" value={ocrTargetLoc.psNo} onChange={e => setOcrTargetLoc({ ...ocrTargetLoc, psNo: e.target.value })} className={`w-full bg-black/40 border-2 rounded-2xl px-2 py-5 text-center text-sm font-mono font-black text-white outline-none h-[60px] transition-all ${validationTriggered && !ocrTargetLoc.psNo ? 'border-rose-600 shadow-[0_0_20px_rgba(225,29,72,0.2)]' : 'border-white/10 focus:border-indigo-500/50'}`} />
                        </div>

                        {/* Polling Station Name (Remaining 5 blocks) */}
                        <div className="col-span-8 space-y-4">
                            <label className={`text-[10px] font-black uppercase tracking-[0.4em] px-2 block ${validationTriggered && !ocrTargetLoc.psName ? 'text-rose-500' : 'text-indigo-400/80'}`}>Polling Station Name</label>
                            <input placeholder="ENTER FULL PHYSICAL LOCATION DESIGNATION..." value={ocrTargetLoc.psName} onChange={e => setOcrTargetLoc({ ...ocrTargetLoc, psName: e.target.value })} className={`w-full bg-black/40 border-2 rounded-2xl px-8 py-5 text-sm font-bold text-white outline-none h-[60px] transition-all tracking-wide ${validationTriggered && !ocrTargetLoc.psName ? 'border-rose-600 shadow-[0_0_20px_rgba(225,29,72,0.2)]' : 'border-white/10 focus:border-indigo-500/50'}`} />
                        </div>
                    </div>
                </div>
            </header>
            {ocrError && (
                <div className="bg-rose-500/10 border border-rose-500/20 p-6 rounded-3xl flex items-center justify-between animate-shake">
                    <div className="flex items-center gap-4">
                        <span className="text-2xl">⚠️</span>
                        <p className="text-rose-400 font-black uppercase text-[11px] tracking-widest">{ocrError}</p>
                    </div>
                    <button onClick={() => setOcrError(null)} className="text-rose-400 hover:text-white font-black uppercase text-[9px] tracking-widest">Dismiss</button>
                </div>
            )}

            {!ocrBatch && (
                <div onClick={triggerUpload} className="group max-w-5xl mx-auto p-24 rounded-[4rem] bg-slate-900/40 border border-white/5 flex flex-col items-center justify-center gap-12 cursor-pointer hover:bg-indigo-500/5 hover:border-indigo-500/40 transition-all duration-700 shadow-[0_40px_80px_rgba(0,0,0,0.5)] relative overflow-hidden backdrop-blur-xl">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />

                    {/* Futuristic Document Core */}
                    <div className="relative">
                        <div className="w-32 h-32 bg-indigo-500/10 rounded-[3rem] flex items-center justify-center text-6xl shadow-[inset_0_0_40px_rgba(99,102,241,0.2)] group-hover:scale-110 group-hover:shadow-[0_0_60px_rgba(99,102,241,0.4)] transition-all duration-700 border border-indigo-500/20">
                            📄
                        </div>
                        <div className="v2-scanline absolute inset-0 opacity-40 rounded-[3rem] overflow-hidden" />
                    </div>

                    <div className="text-center space-y-6 relative z-10">
                        <h2 className="text-6xl font-black uppercase tracking-tighter italic text-white group-hover:text-indigo-400 transition-colors duration-500">Initialize Data Matrix</h2>
                        <div className="flex flex-col items-center gap-2">
                            <p className="text-indigo-400/60 font-black uppercase tracking-[0.6em] text-[10px]">Drag & Drop CSV/PDF to initiate parsing // Secure Link Active</p>
                            <div className="h-[1px] w-24 bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />
                        </div>
                    </div>

                    <input type="file" ref={ocrRef} className="hidden" accept="application/pdf,text/csv" onChange={handleFileUpload} />

                    {/* Corner Tactical Accents */}
                    <div className="absolute top-8 left-8 w-8 h-8 border-t-2 border-l-2 border-indigo-500/20 rounded-tl-xl" />
                    <div className="absolute bottom-8 right-8 w-8 h-8 border-b-2 border-r-2 border-indigo-500/20 rounded-br-xl" />
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
                                                <span className={`text-[11px] font-black uppercase tracking-widest ${isActive ? 'text-white' : 'text-slate-300'}`}>{s.label}</span>
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
