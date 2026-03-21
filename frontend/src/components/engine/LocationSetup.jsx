import React, { useState, useEffect } from 'react';
import api from '../../api';
import { useAppContext } from '../../context/AppContext';
import useOCR from '../../hooks/useOCR';

/**
 * Location selector form with quick-add for constituency/LB/booth.
 * Also owns the upload trigger logic and file input ref.
 *
 * Props:
 *   ocr — the full useOCR() return object (from parent)
 *   isLocationValid — computed boolean (from parent)
 */
const LocationSetup = ({ ocr, isLocationValid, showUpload = true }) => {
    const { allLocations, loadAdminData } = useAppContext();
    const {
        ocrTargetLoc, setOcrTargetLoc,
        ocrError, setOcrError,
        ocrLoading, setOcrLoading,
        ocrRef, handleFileUpload,
    } = ocr;

    const [isAddingConst, setIsAddingConst] = useState(false);
    const [isAddingLB, setIsAddingLB] = useState(false);
    const [isAddingBooth, setIsAddingBooth] = useState(true);
    const [newLocName, setNewLocName] = useState('');
    const [newLBType, setNewLBType] = useState('PANCHAYAT');
    const [newPSName, setNewPSName] = useState('');
    const [newPSNo, setNewPSNo] = useState('');
    const [validationTriggered, setValidationTriggered] = useState(false);

    // Sync PS data when booth selection changes
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
            setOcrError(`Please fill in all details: ${errors.join(", ")}`);
            setValidationTriggered(true);
            return;
        }
        setOcrError(null);
        setValidationTriggered(false);
        ocrRef.current.click();
    };

    const handleQuickAdd = async (type) => {
        if (!newLocName) return;

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
            const errorMsg = e.response?.data?.detail;
            setOcrError(typeof errorMsg === 'string' ? errorMsg : (JSON.stringify(errorMsg) || e.message));
        }
        finally { setOcrLoading(false); }
    };

    return (
        <header className="space-y-8">
            <h1 className="text-7xl font-black tracking-tighter uppercase lux-text-gradient leading-none" style={{ fontFamily: '"Rajdhani", sans-serif' }}>Voter List Importer</h1>

            <div className="lux-glass bg-slate-900/80 p-10 rounded-[2rem] border border-white/5 shadow-2xl space-y-10 relative overflow-hidden">
                <h3 className="lux-tech-label mb-2 italic border-b border-white/5 pb-4">Select Location</h3>

                {/* Row 1: Constituency + Local Body */}
                <div className="grid grid-cols-2 gap-16 relative z-10">
                    {/* Constituency Column */}
                    <div className="space-y-4">
                        <label className={`lux-tech-label px-2 ${validationTriggered && !ocrTargetLoc.constId ? 'text-rose-500 animate-pulse' : ''}`}>Constituency</label>
                        <div className="flex gap-4">
                            {isAddingConst ? (
                                <input autoFocus placeholder="ENTER NEW CONSTITUENCY NAME..." value={newLocName} onChange={e => setNewLocName(e.target.value)} className="flex-1 lux-data-field border-indigo-500/40 shadow-[0_0_15px_rgba(99,102,241,0.1)]" />
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
                        <label className={`lux-tech-label px-2 ${validationTriggered && !ocrTargetLoc.lbId ? 'text-rose-500 animate-pulse' : ''}`}>Panchayat / Municipality</label>
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

                {/* Booth Details */}
                <div className="grid grid-cols-12 gap-10 relative z-10 items-end">
                    {/* Booth Selector (3 cols) */}
                    <div className="col-span-3 space-y-4">
                        <label className={`lux-tech-label px-2 ${validationTriggered && !ocrTargetLoc.boothNo ? 'text-rose-500' : ''}`}>Booth Number</label>
                        <div className="flex gap-4">
                            {isAddingBooth ? (
                                <input autoFocus placeholder="NO." value={ocrTargetLoc.boothNo} onChange={e => setOcrTargetLoc({ ...ocrTargetLoc, boothId: '', boothNo: e.target.value })} className="flex-1 min-w-0 lux-data-field border-indigo-500/40 text-center h-[52px]" />
                            ) : (
                                <div className="relative flex-1">
                                    <select
                                        disabled={!ocrTargetLoc.lbId}
                                        value={ocrTargetLoc.boothId}
                                        onChange={(e) => setOcrTargetLoc({ ...ocrTargetLoc, boothId: e.target.value })}
                                        className={`w-full lux-data-field appearance-none cursor-pointer disabled:opacity-20 h-[52px] ${validationTriggered && !ocrTargetLoc.boothNo ? 'border-rose-600' : ''}`}
                                    >
                                        <option value="">-- SELECT --</option>
                                        {allLocations.find(c => String(c.id) === String(ocrTargetLoc.constId))?.local_bodies?.find(lb => String(lb.id) === String(ocrTargetLoc.lbId))?.booths?.map(o => (
                                            <option key={o.id} value={o.id} className="bg-slate-900">BOOTH {o.number}</option>
                                        ))}
                                    </select>
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-indigo-500/40 text-[10px]">▼</div>
                                </div>
                            )}
                            <button disabled={!ocrTargetLoc.lbId} onClick={() => setIsAddingBooth(!isAddingBooth)} className={`flex-shrink-0 w-14 h-[52px] rounded-xl flex items-center justify-center text-xl transition-all border shadow-lg disabled:opacity-10 ${isAddingBooth ? 'bg-indigo-600 border-indigo-400 text-white' : 'bg-black/40 border-indigo-500/20 text-indigo-400 hover:border-indigo-500'}`}>
                                {isAddingBooth ? '✓' : '+'}
                            </button>
                        </div>
                    </div>

                    {/* PS No (2 cols) */}
                    <div className="col-span-2 space-y-4">
                        <label className={`lux-tech-label text-center block ${validationTriggered && !ocrTargetLoc.psNo ? 'text-rose-500' : ''}`}>PS NO.</label>
                        <input maxLength={3} placeholder="###" value={ocrTargetLoc.psNo} onChange={e => setOcrTargetLoc({ ...ocrTargetLoc, psNo: e.target.value })} className={`w-full lux-data-field text-center font-bold h-[52px] ${validationTriggered && !ocrTargetLoc.psNo ? 'border-rose-600' : ''}`} />
                    </div>

                    {/* Polling Station Name (7 cols) */}
                    <div className="col-span-7 space-y-4">
                        <label className={`lux-tech-label px-2 ${validationTriggered && !ocrTargetLoc.psName ? 'text-rose-500' : ''}`}>School / Building Name</label>
                        <input
                            placeholder="ENTER FULL INSTITUTIONAL POLLING STATION NAME..."
                            value={ocrTargetLoc.psName}
                            onChange={e => setOcrTargetLoc({ ...ocrTargetLoc, psName: e.target.value })}
                            className={`w-full lux-data-field tracking-wide h-[52px] ${validationTriggered && !ocrTargetLoc.psName ? 'border-rose-600' : ''}`}
                        />
                    </div>
                </div>
            </div>

            {/* Hidden file input (always present for ref) */}
            <input type="file" ref={ocrRef} className="hidden" accept="application/pdf,text/csv" onChange={handleFileUpload} />

            {/* Upload dropzone — only shown when no active batch */}
            {showUpload && (
                <div
                    onClick={isLocationValid ? triggerUpload : () => setValidationTriggered(true)}
                    className={`group max-w-5xl mx-auto p-12 rounded-[2rem] border flex flex-col items-center justify-center gap-6 cursor-pointer transition-all duration-700 shadow-2xl relative overflow-hidden backdrop-blur-3xl ${!isLocationValid ? 'bg-slate-900/40 border-white/5 opacity-80' : 'bg-slate-900/60 border-white/5 hover:bg-indigo-500/5 hover:border-indigo-500/40'}`}
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
                    <div className="relative">
                        <div className="w-24 h-24 bg-indigo-500/5 rounded-2xl flex items-center justify-center text-5xl shadow-[inset_0_0_20px_rgba(99,102,241,0.1)] group-hover:scale-110 group-hover:shadow-[0_0_40px_rgba(99,102,241,0.3)] transition-all duration-1000 border border-white/5 relative overflow-hidden">
                            <span className="relative z-10 transition-transform duration-700 group-hover:-translate-y-1">📄</span>
                            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-indigo-500/40 to-transparent h-6 w-full animate-scanner opacity-0 group-hover:opacity-100" />
                        </div>
                    </div>
                    <div className="text-center space-y-3 relative z-10">
                        <h2 className="text-4xl font-black uppercase tracking-tighter italic text-white group-hover:text-indigo-400 transition-colors duration-500" style={{ fontFamily: '"Rajdhani", sans-serif' }}>UPLOAD VOTER LIST</h2>
                        <div className="flex flex-col items-center gap-2">
                            <p className="lux-tech-label tracking-[0.4em] text-slate-400 !text-[7px]">DRAG & DROP FILE TO START SCANNING // SECURE LINK ACTIVE</p>
                            <div className="h-[1px] w-24 bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />
                        </div>
                    </div>
                </div>
            )}
        </header>
    );
};

export default LocationSetup;
