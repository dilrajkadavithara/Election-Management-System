import React, { useState, useEffect } from 'react';
import api from '../api';
import { useAppContext } from '../context/AppContext';
import useOCR from '../hooks/useOCR';
import useVoters from '../hooks/useVoters';
import LocationSetup from '../components/engine/LocationSetup';
import BatchProgress from '../components/engine/BatchProgress';
import { SYSTEM_HEALTH_POLL_INTERVAL } from '../constants';

const OCREngine = () => {
    const ctx = useAppContext();
    const { isLoggedIn, view, setView, setShowSuccess, setEditData, setEditMode, allLocations, loadAdminData } = ctx;

    const voters = useVoters({ isLoggedIn, view });
    const { loadStats } = voters;

    const ocr = useOCR({ isLoggedIn, view, loadStats, loadAdminData, setView, setShowSuccess, setEditData, setEditMode });
    const { ocrBatch, ocrError, setOcrError, ocrTargetLoc, startExtraction, startOcr, handleSaveBatch, stopAndClearRAM, engineVersion, setEngineVersion } = ocr;

    // System health + logs polling (owned here, passed to BatchProgress)
    const [systemHealth, setSystemHealth] = useState(null);
    const [systemLogs, setSystemLogs] = useState([]);

    useEffect(() => {
        const checkSystem = async () => {
            try {
                const health = await api.checkHealth();
                setSystemHealth(health);
                const logsRes = await api.getSystemLogs();
                if (logsRes && logsRes.logs) setSystemLogs(logsRes.logs);
            } catch (_) {}
        };
        checkSystem();
        const interval = setInterval(checkSystem, SYSTEM_HEALTH_POLL_INTERVAL);
        return () => clearInterval(interval);
    }, []);

    // Ensure locations are loaded
    useEffect(() => {
        if (!allLocations || allLocations.length === 0) loadAdminData();
    }, [allLocations, loadAdminData]);

    const isLocationValid = !!(ocrTargetLoc.constId && ocrTargetLoc.lbId && (ocrTargetLoc.boothId || ocrTargetLoc.boothNo) && ocrTargetLoc.psNo && ocrTargetLoc.psName);

    return (
        <div className="min-h-screen lux-mesh-bg p-6 pt-24 lg:p-12 lg:pl-[420px] lg:pr-16 lux-animate-in pb-32" style={{ fontFamily: '"Inter", sans-serif' }}>

            {/* Mobile warning */}
            <div className="lg:hidden flex flex-col items-center justify-center min-h-[60vh] text-center px-6 py-12 border border-white/5 rounded-[2rem] bg-slate-900/40 backdrop-blur-md shadow-2xl relative overflow-hidden mt-8">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-50" />
                <span className="text-6xl mb-6 relative z-10 drop-shadow-2xl opacity-80 animate-pulse">🖥️</span>
                <h2 className="text-2xl font-black uppercase tracking-widest text-white mb-4 relative z-10">Desktop Required</h2>
                <p className="text-slate-400 text-sm font-bold leading-relaxed max-w-sm relative z-10">
                    The Voter List OCR Processor is a heavy-duty data engine. To prevent mobile browser crashes and ensure stable file processing, this suite is exclusively available on desktop devices.
                </p>
                <div className="mt-8 px-6 py-3 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] font-black uppercase tracking-[0.2em] relative z-10">
                    Please switch to a computer
                </div>
            </div>

            {/* Desktop engine */}
            <div className="hidden lg:block space-y-12">

                {/* System health banner */}
                {systemHealth && systemHealth.status !== 'healthy' && (
                    <div className="bg-amber-500/10 border border-amber-500/20 p-6 rounded-2xl flex items-center justify-between mb-8 animate-in fade-in slide-in-from-top-4">
                        <div className="flex items-center gap-6">
                            <div className="w-12 h-12 bg-amber-500/20 rounded-xl flex items-center justify-center text-2xl text-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.2)]">⚠️</div>
                            <div className="space-y-1">
                                <p className="lux-tech-label !text-amber-500 !text-xs font-bold uppercase tracking-wider">System Alert: Environment Configuration Required</p>
                                <p className="text-slate-400 text-[11px] leading-relaxed">
                                    {systemHealth.poppler === 'missing' && "PDF Engine (Poppler) is missing. "}
                                    {systemHealth.tesseract === 'missing' && "OCR Engine (Tesseract) is missing. "}
                                    {systemHealth.redis !== 'connected' && "Local Fallback Mode active (Redis offline). "}
                                    Please check server configuration to restore full processing speed.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Error banner */}
                {ocrError && (
                    <div className="bg-rose-500/10 border border-rose-500/20 p-6 rounded-2xl flex items-center justify-between animate-shake">
                        <div className="flex items-center gap-4">
                            <span className="text-2xl">⚠️</span>
                            <p className="lux-tech-label !text-rose-400 italic">{ocrError}</p>
                        </div>
                        <button onClick={() => setOcrError(null)} className="lux-tech-label !text-rose-400 hover:text-white transition-colors">Dismiss</button>
                    </div>
                )}

                {/* Location setup (always visible) + upload dropzone (only when no batch) */}
                <LocationSetup ocr={ocr} isLocationValid={isLocationValid} showUpload={!ocrBatch} />

                {/* Active batch progress */}
                {ocrBatch && (
                    <BatchProgress
                        ocrBatch={ocrBatch}
                        startExtraction={startExtraction}
                        startOcr={startOcr}
                        handleSaveBatch={handleSaveBatch}
                        stopAndClearRAM={stopAndClearRAM}
                        isLocationValid={isLocationValid}
                        systemLogs={systemLogs}
                        engineVersion={engineVersion}
                        setEngineVersion={setEngineVersion}
                    />
                )}
            </div>
        </div>
    );
};

export default OCREngine;
