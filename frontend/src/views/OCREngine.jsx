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
        <div className="min-h-screen lux-mesh-bg p-12 pl-96 space-y-12 lux-animate-in pb-32" style={{ fontFamily: '"Inter", sans-serif' }}>
            <header className="space-y-10">
                {/* Tactical Location Grid: Logical 2-Row Design */}
                <div className="lux-glass bg-slate-900/80 p-12 rounded-[2rem] border border-white/5 shadow-2xl space-y-12 relative overflow-hidden lux-tactical-border">
                    <div className="lux-tactical-corner-tl" />
                    <div className="lux-tactical-corner-tr" />
                    <div className="lux-tactical-corner-bl" />
                    <div className="lux-tactical-corner-br" />

                    {/* Row 1: High-Width Modules */}
                    <div className="grid grid-cols-2 gap-16 relative z-10">
                        {/* Constituency Column */}
                        <div className="space-y-4">
                            <label className={`lux-tech-label px-2 ${validationTriggered && !ocrTargetLoc.constId ? 'text-rose-500 animate-pulse' : ''}`}>Constituency</label>
                            <div className="flex gap-4">
                                {isAddingConst ? (
                                    <input autoFocus placeholder="REGISTER NEW CONSTITUENCY..." value={newLocName} onChange={e => setNewLocName(e.target.value)} className="flex-1 lux-data-field border-indigo-500/40 shadow-[0_0_15px_rgba(99,102,241,0.1)]" />
                                ) : (
                                    <div className="relative flex-1">
                                        <select
                                            value={ocrTargetLoc.constId}
                                            onChange={(e) => setOcrTargetLoc({ ...ocrTargetLoc, constId: e.target.value, lbId: '', boothId: '', boothNo: '', psNo: '', psName: '' })}
                                            className={`w-full lux-data-field appearance-none cursor-pointer ${validationTriggered && !ocrTargetLoc.constId ? 'border-rose-600 shadow-[0_0_15px_rgba(225,29,72,0.1)]' : ''}`}
                                        >
                                            <option value="">-- SELECT CONSTITUENCY --</option>
                                            {allLocations?.map(o => <option key={o.id} value={o.id} className="bg-slate-900">{o.name}</option>)}
                                        </select>
                                        <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-indigo-500/40 text-xs">▼</div>
                                    </div>
                                )}
                                <button onClick={() => { if (isAddingConst && newLocName) handleQuickAdd('const'); else setIsAddingConst(!isAddingConst); }} className={`w-16 h-[52px] rounded-xl flex items-center justify-center text-2xl transition-all border shadow-lg ${isAddingConst ? 'bg-indigo-600 border-indigo-400 text-white' : 'bg-black/40 border-indigo-500/20 text-indigo-400 hover:border-indigo-500 hover:shadow-[0_0_15px_rgba(99,102,241,0.3)]'}`}>
                                    {isAddingConst ? '✓' : '+'}
                                </button>
                            </div>
                        </div>

                        {/* Local Body Column */}
                        <div className="space-y-4">
                            <label className={`lux-tech-label px-2 ${validationTriggered && !ocrTargetLoc.lbId ? 'text-rose-500 animate-pulse' : ''}`}>Local Body</label>
                            <div className="flex gap-4">
                                {isAddingLB ? (
                                    <div className="flex-1 flex gap-2">
                                        <input autoFocus placeholder="NEW UNIT NAME..." value={newLocName} onChange={e => setNewLocName(e.target.value)} className="flex-1 lux-data-field border-indigo-500/40" />
                                        <select value={newLBType} onChange={e => setNewLBType(e.target.value)} className="w-24 lux-data-field !text-[10px] !px-2 uppercase">
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
                                            className={`w-full lux-data-field appearance-none cursor-pointer disabled:opacity-20 ${validationTriggered && !ocrTargetLoc.lbId ? 'border-rose-600 shadow-[0_0_15px_rgba(225,29,72,0.1)]' : ''}`}
                                        >
                                            <option value="">-- SELECT LOCAL BODY --</option>
                                            {allLocations.find(c => String(c.id) === String(ocrTargetLoc.constId))?.local_bodies?.map(o => <option key={o.id} value={o.id} className="bg-slate-900">{o.name}</option>)}
                                        </select>
                                        <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-indigo-500/40 text-xs">▼</div>
                                    </div>
                                )}
                                <button disabled={!ocrTargetLoc.constId} onClick={() => { if (isAddingLB && newLocName) handleQuickAdd('lb'); else setIsAddingLB(!isAddingLB); }} className={`w-16 h-[52px] rounded-xl flex items-center justify-center text-2xl transition-all border shadow-lg disabled:opacity-10 ${isAddingLB ? 'bg-indigo-600 border-indigo-400 text-white' : 'bg-black/40 border-indigo-500/20 text-indigo-400 hover:border-indigo-500 hover:shadow-[0_0_15px_rgba(99,102,241,0.3)]'}`}>
                                    {isAddingLB ? '✓' : '+'}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Row 2: Tactical Metadata */}
                    <div className="grid grid-cols-12 gap-10 relative z-10">
                        {/* Booth Selector (3 cols) */}
                        <div className="col-span-3 space-y-4">
                            <label className={`lux-tech-label px-2 ${validationTriggered && !ocrTargetLoc.boothNo ? 'text-rose-500' : ''}`}>Booth Identity</label>
                            <div className="flex gap-4">
                                {isAddingBooth ? (
                                    <input autoFocus placeholder="NO." value={ocrTargetLoc.boothNo} onChange={e => setOcrTargetLoc({ ...ocrTargetLoc, boothId: '', boothNo: e.target.value })} className="flex-1 lux-data-field border-indigo-500/40 text-center !px-0" />
                                ) : (
                                    <div className="relative flex-1">
                                        <select
                                            disabled={!ocrTargetLoc.lbId}
                                            value={ocrTargetLoc.boothId}
                                            onChange={(e) => setOcrTargetLoc({ ...ocrTargetLoc, boothId: e.target.value })}
                                            className={`w-full lux-data-field appearance-none cursor-pointer disabled:opacity-20 ${validationTriggered && !ocrTargetLoc.boothNo ? 'border-rose-600' : ''}`}
                                        >
                                            <option value="">-- SELECT --</option>
                                            {allLocations.find(c => String(c.id) === String(ocrTargetLoc.constId))?.local_bodies?.find(lb => String(lb.id) === String(ocrTargetLoc.lbId))?.booths?.map(o => (
                                                <option key={o.id} value={o.id} className="bg-slate-900">BOOTH {o.number}</option>
                                            ))}
                                        </select>
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-indigo-500/40 text-[10px]">▼</div>
                                    </div>
                                )}
                                <button disabled={!ocrTargetLoc.lbId} onClick={() => setIsAddingBooth(!isAddingBooth)} className={`w-14 h-[52px] rounded-xl flex items-center justify-center text-xl transition-all border shadow-lg disabled:opacity-10 ${isAddingBooth ? 'bg-indigo-600 border-indigo-400 text-white' : 'bg-black/40 border-indigo-500/20 text-indigo-400 hover:border-indigo-500'}`}>
                                    {isAddingBooth ? '✓' : '+'}
                                </button>
                            </div>
                        </div>

                        {/* PS No (1 col) */}
                        <div className="col-span-1 space-y-4">
                            <label className={`lux-tech-label text-center block ${validationTriggered && !ocrTargetLoc.psNo ? 'text-rose-500' : ''}`}>PS NO</label>
                            <input maxLength={3} placeholder="###" value={ocrTargetLoc.psNo} onChange={e => setOcrTargetLoc({ ...ocrTargetLoc, psNo: e.target.value })} className={`w-full lux-data-field text-center !px-0 font-bold ${validationTriggered && !ocrTargetLoc.psNo ? 'border-rose-600' : ''}`} />
                        </div>

                        {/* Polling Station Name (Remaining 8 cols) */}
                        <div className="col-span-8 space-y-4">
                            <label className={`lux-tech-label px-2 ${validationTriggered && !ocrTargetLoc.psName ? 'text-rose-500' : ''}`}>Full Physical Designation</label>
                            <input
                                placeholder="ENTER FULL INSTITUTIONAL POLLING STATION NAME..."
                                value={ocrTargetLoc.psName}
                                onChange={e => setOcrTargetLoc({ ...ocrTargetLoc, psName: e.target.value })}
                                className={`w-full lux-data-field tracking-wide ${validationTriggered && !ocrTargetLoc.psName ? 'border-rose-600' : ''}`}
                            />
                        </div>
                    </div>
                </div>
            </header>

            {ocrError && (
                <div className="bg-rose-500/10 border border-rose-500/20 p-6 rounded-2xl flex items-center justify-between animate-shake">
                    <div className="flex items-center gap-4">
                        <span className="text-2xl">⚠️</span>
                        <p className="lux-tech-label !text-rose-400 italic">{ocrError}</p>
                    </div>
                    <button onClick={() => setOcrError(null)} className="lux-tech-label !text-rose-400 hover:text-white transition-colors">Dismiss</button>
                </div>
            )}

            {!ocrBatch && (
                <div onClick={triggerUpload} className="group max-w-5xl mx-auto p-12 rounded-[3rem] bg-slate-900/60 border border-white/5 flex flex-col items-center justify-center gap-8 cursor-pointer hover:bg-indigo-500/5 hover:border-indigo-500/40 transition-all duration-700 shadow-2xl relative overflow-hidden backdrop-blur-3xl lux-tactical-border">
                    <div className="lux-tactical-corner-tl" />
                    <div className="lux-tactical-corner-tr" />
                    <div className="lux-tactical-corner-bl" />
                    <div className="lux-tactical-corner-br" />

                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />

                    {/* Futuristic Document Core with Scanner Line */}
                    <div className="relative">
                        <div className="w-32 h-32 bg-indigo-500/5 rounded-[2rem] flex items-center justify-center text-6xl shadow-[inset_0_0_30px_rgba(99,102,241,0.1)] group-hover:scale-110 group-hover:shadow-[0_0_50px_rgba(99,102,241,0.3)] transition-all duration-1000 border border-white/5 relative overflow-hidden">
                            <span className="relative z-10 transition-transform duration-700 group-hover:-translate-y-1">📄</span>
                            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-indigo-500/40 to-transparent h-8 w-full animate-scanner opacity-0 group-hover:opacity-100" />
                        </div>
                    </div>

                    <div className="text-center space-y-4 relative z-10">
                        <h2 className="text-5xl font-black uppercase tracking-tighter italic text-white group-hover:text-indigo-400 transition-colors duration-500" style={{ fontFamily: '"Rajdhani", sans-serif' }}>UPLOAD YOUR DOC</h2>
                        <div className="flex flex-col items-center gap-3">
                            <p className="lux-tech-label tracking-[0.4em] text-slate-400 !text-[8px]">DRAG & DROP CSV/PDF TO INITIATE PARSING // SECURE LINK ACTIVE</p>
                            <div className="h-[1px] w-32 bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />
                        </div>
                    </div>

                    <input type="file" ref={ocrRef} className="hidden" accept="application/pdf,text/csv" onChange={handleFileUpload} />
                </div>
            )}

            {ocrBatch && (
                <div className="grid grid-cols-12 gap-10">
                    <div className="col-span-4 lux-card bg-indigo-900/10 border-indigo-500/20 shadow-2xl flex flex-col justify-between p-12 min-h-[600px] lux-tactical-border">
                        <div className="lux-tactical-corner-tl" />
                        <div className="lux-tactical-corner-tr" />
                        <div className="lux-tactical-corner-bl" />
                        <div className="lux-tactical-corner-br" />

                        <div>
                            <h3 className="lux-tech-label mb-12 italic border-b border-white/5 pb-4">Neural Flow Status</h3>
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
                                                <span className={`lux-tech-label !text-xs ${isActive ? 'text-white' : 'text-slate-300'}`}>{s.label}</span>
                                                {isActive && <div className="h-1 w-12 bg-indigo-500 mt-2 animate-pulse rounded-full shadow-[0_0_10px_#6366f1]" />}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="lux-glass !bg-rose-500/5 border-rose-500/20 p-8 rounded-3xl mt-12">
                            <p className="lux-tech-label !text-rose-400 mb-4">Risk Management</p>
                            <button onClick={stopAndClearRAM} className="w-full py-4 rounded-xl bg-rose-500 text-white lux-tech-label !text-white shadow-lg hover:bg-rose-600 transition-all">Emergency Deactivate</button>
                        </div>
                    </div>

                    <div className="col-span-8 space-y-10">
                        <div className="lux-card !bg-black border-white/10 p-16 relative overflow-hidden min-h-[450px] shadow-2xl lux-tactical-border">
                            <div className="lux-tactical-corner-tl" />
                            <div className="lux-tactical-corner-tr" />
                            <div className="lux-tactical-corner-bl" />
                            <div className="lux-tactical-corner-br" />

                            <div className="v2-scanline absolute inset-0 opacity-10" />
                            <div className="relative z-10 flex flex-col h-full">
                                <h2 className="text-8xl font-black uppercase tracking-tighter leading-none mb-12 italic" style={{ fontFamily: '"Rajdhani", sans-serif' }}>
                                    {ocrBatch.status === 'uploaded' && <span className="text-slate-800">READY_FOR_EXTRACT</span>}
                                    {(ocrBatch.status === 'extracting' || ocrBatch.status === 'processing') && <span className="lux-text-gradient animate-pulse">NEURAL_DEEP_SYNC</span>}
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
                                            <p className="lux-tech-label mb-3">{m.l}</p>
                                            <p className={`text-5xl font-black ${m.c} tracking-tighter italic`} style={{ fontFamily: '"Rajdhani", sans-serif' }}>{m.v}</p>
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
                            <div className="lux-card bg-emerald-500/5 border-emerald-500/20 p-10 flex justify-between items-center group cursor-pointer hover:bg-emerald-500/10 transition-all shadow-xl lux-tactical-border">
                                <div className="lux-tactical-corner-tl" />
                                <div className="lux-tactical-corner-br" />
                                <div>
                                    <p className="lux-tech-label !text-emerald-400 mb-2">Optimal Profiles</p>
                                    <p className="text-5xl font-black text-white group-hover:scale-110 transition-transform origin-left" style={{ fontFamily: '"Rajdhani", sans-serif' }}>{ocrBatch.clean_count || 0}</p>
                                </div>
                                <div className="text-5xl opacity-20 transform group-hover:rotate-12 transition-all">💎</div>
                            </div>
                            <div className="lux-card bg-rose-500/5 border-rose-500/20 p-10 flex justify-between items-center group cursor-pointer hover:bg-rose-500/10 transition-all shadow-xl lux-tactical-border">
                                <div className="lux-tactical-corner-tl" />
                                <div className="lux-tactical-corner-br" />
                                <div>
                                    <p className="lux-tech-label !text-rose-400 mb-2">Tactical Anomalies</p>
                                    <p className="text-5xl font-black text-white group-hover:scale-110 transition-transform origin-left" style={{ fontFamily: '"Rajdhani", sans-serif' }}>{ocrBatch.flagged_count || 0}</p>
                                </div>
                                <div className="text-5xl opacity-20 transform group-hover:-rotate-12 transition-all">🚩</div>
                            </div>
                        </div>

                        <div className="flex gap-8 mt-10">
                            {ocrBatch.status === 'uploaded' && <button onClick={startExtraction} className="lux-btn-primary flex-1 !py-8 text-sm tracking-[0.3em] !font-bold" style={{ fontFamily: '"Rajdhani", sans-serif' }}>Initialize Matrix Extraction Protocol</button>}
                            {ocrBatch.status === 'extracted' && <button onClick={startOcr} className="lux-btn-primary flex-1 !py-8 text-sm tracking-[0.3em] !font-bold !from-indigo-600 !to-purple-600 shadow-[0_0_30px_rgba(99,102,241,0.5)]" style={{ fontFamily: '"Rajdhani", sans-serif' }}>Deploy Neural AI Core ⚡</button>}
                            {ocrBatch.status === 'processed' && (
                                <div className="flex-1 flex gap-6">
                                    <button onClick={handleSaveBatch} className="flex-1 bg-white text-black py-8 rounded-2xl font-bold uppercase text-[11px] tracking-[0.2em] shadow-2xl hover:bg-indigo-400 hover:text-white transition-all" style={{ fontFamily: '"Rajdhani", sans-serif' }}>Commit Intelligence to DB</button>
                                    <button onClick={() => api.exportBatchCSV(ocrBatch.id)} className="px-12 lux-glass rounded-2xl font-bold text-white text-[11px] uppercase tracking-widest border-white/10 hover:bg-white/10" style={{ fontFamily: '"Rajdhani", sans-serif' }}>Export Result</button>
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
