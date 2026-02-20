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
    const [isAddingBooth, setIsAddingBooth] = useState(false);
    const [newLocName, setNewLocName] = useState('');
    const [newLBType, setNewLBType] = useState('PANCHAYAT');
    const [validationTriggered, setValidationTriggered] = useState(false);

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
                        psName: currentBooth.ps_name || '',
                        psNo: currentBooth.ps_no || ''
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
        if (!ocrTargetLoc.psName) errors.push("PS Name");

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
                {/* Expert Header: Institutional Branding */}
                <div className="flex justify-between items-center border-b border-white/10 pb-8">
                    <div className="flex items-center gap-10">
                        <div className="w-2 h-16 bg-gradient-to-b from-indigo-500 to-purple-600 rounded-full shadow-[0_0_20px_rgba(99,102,241,0.5)]" />
                        <div className="space-y-1">
                            <h1 className="text-7xl font-black tracking-tighter uppercase lux-text-gradient leading-none">AI Processor</h1>
                            <p className="text-slate-500 font-bold uppercase tracking-[0.5em] text-[10px]">Election Intelligence Hub // Deployment Core v5.0</p>
                        </div>
                    </div>
                </div>

                {/* Tactical Location Intelligence: Precision Alignment */}
                <div className="bg-slate-900/40 p-12 rounded-[3rem] border border-white/5 backdrop-blur-2xl shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                        <span className="text-9xl font-black text-white">LOC</span>
                    </div>

                    <div className="flex items-start gap-8 relative z-10 w-full overflow-x-visible">
                        {/* 1. Constituency */}
                        <div className="flex-1 min-w-[200px] space-y-3">
                            <div className="flex justify-between items-center">
                                <label className="text-[11px] font-black uppercase text-indigo-400 tracking-widest whitespace-nowrap">Constituency</label>
                                <button onClick={() => setIsAddingConst(!isAddingConst)} className="text-[9px] font-black px-3 py-1 bg-white/5 hover:bg-indigo-600 rounded-lg text-white/50 hover:text-white transition-all uppercase border border-white/5">{isAddingConst ? 'Close' : '+ New'}</button>
                            </div>
                            {isAddingConst ? (
                                <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-top-2">
                                    <input autoFocus placeholder="Enter Name..." value={newLocName} onChange={e => setNewLocName(e.target.value)} className="w-full bg-slate-950 border-2 border-indigo-500/50 rounded-2xl px-5 py-4 text-sm font-bold text-white outline-none" />
                                    <button onClick={() => handleQuickAdd('const')} className="w-full bg-indigo-600 hover:bg-indigo-500 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-white transition-all">Register</button>
                                </div>
                            ) : (
                                <select
                                    value={ocrTargetLoc.constId}
                                    onChange={(e) => setOcrTargetLoc({ ...ocrTargetLoc, constId: e.target.value, lbId: '', boothId: '', boothNo: '', psNo: '', psName: '' })}
                                    className={`w-full bg-slate-950/90 border rounded-2xl px-6 py-4.5 text-sm font-bold uppercase text-white outline-none cursor-pointer h-[58px] transition-all ${validationTriggered && !ocrTargetLoc.constId ? 'border-rose-500 ring-4 ring-rose-500/10' : 'border-white/10 hover:border-indigo-500/30'}`}
                                >
                                    <option value="">-- Select --</option>
                                    {allLocations?.map(o => <option key={o.id} value={o.id} className="bg-slate-900">{o.name}</option>)}
                                </select>
                            )}
                        </div>

                        {/* 2. Local Body */}
                        <div className="flex-1 min-w-[200px] space-y-3">
                            <div className="flex justify-between items-center">
                                <label className="text-[11px] font-black uppercase text-indigo-400 tracking-widest whitespace-nowrap">Local Body</label>
                                <button disabled={!ocrTargetLoc.constId} onClick={() => setIsAddingLB(!isAddingLB)} className="text-[9px] font-black px-3 py-1 bg-white/5 hover:bg-indigo-600 rounded-lg text-white/50 hover:text-white transition-all uppercase border border-white/5 disabled:opacity-0">{isAddingLB ? 'Close' : '+ New'}</button>
                            </div>
                            {isAddingLB ? (
                                <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-top-2">
                                    <input autoFocus placeholder="Enter Name..." value={newLocName} onChange={e => setNewLocName(e.target.value)} className="w-full bg-slate-950 border-2 border-indigo-500/50 rounded-2xl px-5 py-4 text-sm font-bold text-white outline-none" />
                                    <div className="flex gap-2">
                                        <select value={newLBType} onChange={e => setNewLBType(e.target.value)} className="flex-1 bg-slate-950 border border-white/10 rounded-xl px-2 py-1 text-[8px] font-black uppercase text-white outline-none">
                                            <option value="PANCHAYAT">Panchayat</option>
                                            <option value="MUNICIPALITY">Municipality</option>
                                            <option value="CORPORATION">Corporation</option>
                                        </select>
                                        <button onClick={() => handleQuickAdd('lb')} className="bg-indigo-600 px-4 rounded-xl text-[9px] font-black uppercase text-white">Add</button>
                                    </div>
                                </div>
                            ) : (
                                <select
                                    disabled={!ocrTargetLoc.constId}
                                    value={ocrTargetLoc.lbId}
                                    onChange={(e) => setOcrTargetLoc({ ...ocrTargetLoc, lbId: e.target.value, boothId: '', boothNo: '', psNo: '', psName: '' })}
                                    className={`w-full bg-slate-950/90 border rounded-2xl px-6 py-4.5 text-sm font-bold uppercase text-white outline-none cursor-pointer h-[58px] transition-all disabled:opacity-20 ${validationTriggered && !ocrTargetLoc.lbId ? 'border-rose-500 ring-4 ring-rose-500/10' : 'border-white/10 hover:border-indigo-500/30'}`}
                                >
                                    <option value="">-- Select --</option>
                                    {allLocations.find(c => String(c.id) === String(ocrTargetLoc.constId))?.local_bodies?.map(o => <option key={o.id} value={o.id} className="bg-slate-900">{o.name}</option>)}
                                </select>
                            )}
                        </div>

                        {/* 3. Booth No */}
                        <div className="w-[120px] space-y-3">
                            <label className="text-[11px] font-black uppercase text-indigo-400 tracking-widest block whitespace-nowrap">Booth No</label>
                            <input
                                placeholder="###"
                                value={ocrTargetLoc.boothNo}
                                onChange={e => {
                                    const val = e.target.value;
                                    const matchingBooth = allLocations.find(c => String(c.id) === String(ocrTargetLoc.constId))?.local_bodies?.find(lb => String(lb.id) === String(ocrTargetLoc.lbId))?.booths?.find(b => b.number === val);
                                    if (matchingBooth) {
                                        setOcrTargetLoc({ ...ocrTargetLoc, boothId: matchingBooth.id, boothNo: val, psNo: matchingBooth.ps_no || '', psName: matchingBooth.ps_name || '' });
                                    } else {
                                        setOcrTargetLoc({ ...ocrTargetLoc, boothId: '', boothNo: val });
                                    }
                                }}
                                className={`w-full bg-slate-950 border rounded-2xl px-6 py-4 text-center text-sm font-black text-indigo-400 outline-none h-[58px] transition-all ${validationTriggered && !ocrTargetLoc.boothNo ? 'border-rose-500 ring-4 ring-rose-500/10' : 'border-white/10 focus:border-indigo-500/50'}`}
                            />
                        </div>

                        {/* 4. PS No */}
                        <div className="w-[120px] space-y-3">
                            <label className="text-[11px] font-black uppercase text-indigo-400 tracking-widest block whitespace-nowrap">PS No</label>
                            <input
                                placeholder="PS ###"
                                value={ocrTargetLoc.psNo}
                                onChange={e => setOcrTargetLoc({ ...ocrTargetLoc, psNo: e.target.value })}
                                className={`w-full bg-slate-950 border rounded-2xl px-6 py-4 text-center text-sm font-black text-white outline-none h-[58px] transition-all ${validationTriggered && !ocrTargetLoc.psNo ? 'border-rose-500 ring-4 ring-rose-500/10' : 'border-white/10 focus:border-indigo-500/50'}`}
                            />
                        </div>

                        {/* 5. Station Name */}
                        <div className="flex-[1.5] space-y-3">
                            <label className="text-[11px] font-black uppercase text-indigo-400 tracking-widest block whitespace-nowrap">Station Name</label>
                            <input
                                placeholder="Enter Full Polling Station Name..."
                                value={ocrTargetLoc.psName}
                                onChange={e => setOcrTargetLoc({ ...ocrTargetLoc, psName: e.target.value })}
                                className={`w-full bg-slate-950 border rounded-2xl px-8 py-4 text-sm font-bold text-white outline-none h-[58px] transition-all ${validationTriggered && !ocrTargetLoc.psName ? 'border-rose-500 ring-4 ring-rose-500/10' : 'border-white/10 focus:border-indigo-500/50'}`}
                            />
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
                <div onClick={triggerUpload} className="lux-glass group max-w-5xl mx-auto p-24 rounded-[4rem] border border-white/5 flex flex-col items-center justify-center gap-10 cursor-pointer hover:bg-white/5 hover:border-indigo-500/30 transition-all shadow-[0_30px_60px_rgba(0,0,0,0.4)] relative overflow-hidden backdrop-blur-md">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                    <div className="w-24 h-24 bg-indigo-500/10 rounded-[2.5rem] flex items-center justify-center text-4xl shadow-inner group-hover:scale-110 transition-all duration-700 group-hover:shadow-[0_0_40px_rgba(99,102,241,0.3)] border border-white/10">📄</div>
                    <div className="text-center space-y-4 relative z-10">
                        <h2 className="text-5xl font-black uppercase tracking-tighter italic text-white group-hover:text-indigo-400 transition-colors duration-500">Inject Source Matrix</h2>
                        <p className="text-slate-400 font-black uppercase tracking-[0.5em] text-[10px]">Optimized for Neural Parallel Extraction Protocol // Secure Link Active</p>
                    </div>
                    <input type="file" ref={ocrRef} className="hidden" accept="application/pdf" onChange={handleFileUpload} />
                    <div className="v2-scanline absolute inset-0 opacity-10 pointer-events-none" />
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
