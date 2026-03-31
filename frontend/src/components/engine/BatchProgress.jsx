import React from 'react';
import api from '../../api';
import EngineToggle from './EngineToggle';

/**
 * Active batch processing view: step tracker, stats, action buttons, live terminal.
 *
 * Props:
 *   ocrBatch, startExtraction, startOcr, handleSaveBatch, stopAndClearRAM — from useOCR
 *   isLocationValid — computed boolean from parent
 *   systemLogs — from parent's polling effect
 */
const BatchProgress = ({ ocrBatch, startExtraction, startOcr, handleSaveBatch, stopAndClearRAM, isLocationValid, systemLogs, engineVersion, setEngineVersion }) => {
    const isComplete = ocrBatch && ['processed', 'warning', 'completed'].includes(ocrBatch.status);
    const hasFailed = ocrBatch && ocrBatch.status === 'error';

    const calculateIntelligence = () => {
        if (!ocrBatch) return 0;
        if (isComplete) return 100;
        if (hasFailed) return 0;

        if (ocrBatch.status === 'extracting') {
            return 5; // Brief state — extraction is instant now
        }
        if (ocrBatch.status === 'processing') {
            // Gemini processes page by page — track pages completed
            const totalPages = Math.max(1, (ocrBatch.total_pages || 1) - 3); // minus cover pages
            const pagesProcessed = ocrBatch.pages_processed || 0;
            return Math.min(99, Math.round((pagesProcessed / totalPages) * 100));
        }
        return 0;
    };

    const steps = [
        { step: 'uploaded', label: 'Upload Complete', icon: '📥' },
        { step: 'extracted', label: 'Pages Detected', icon: '🎯' },
        { step: 'processing', label: 'Processing Data', icon: '⚡' },
        { step: 'processed', label: 'Data Ready', icon: '✨' }
    ];
    const stepKeys = ['uploaded', 'extracted', 'processing', 'processed'];
    const statusKey = isComplete ? 'processed' : (ocrBatch.status === 'completed' ? 'processed' : ocrBatch.status);
    const currentIndex = stepKeys.indexOf(statusKey === 'extracting' ? 'extracted' : (hasFailed ? 'processing' : statusKey));

    return (
        <div className="grid grid-cols-12 gap-10">
            {/* Left: Step Tracker */}
            <div className="col-span-4 lux-card bg-indigo-900/10 border-indigo-500/20 shadow-2xl flex flex-col justify-between p-12 min-h-[600px] lux-tactical-border">
                <div className="lux-tactical-corner-tl" />
                <div className="lux-tactical-corner-tr" />
                <div className="lux-tactical-corner-bl" />
                <div className="lux-tactical-corner-br" />

                <div>
                    <h3 className="lux-tech-label mb-12 italic border-b border-white/5 pb-4">Current Progress</h3>
                    <div className="space-y-8">
                        {steps.map((s, i) => {
                            const itemIndex = stepKeys.indexOf(s.step);
                            const isDone = itemIndex < currentIndex || (hasFailed && itemIndex < currentIndex);
                            const isActive = itemIndex === currentIndex && !hasFailed;
                            const isErrorStep = hasFailed && itemIndex === currentIndex;

                            return (
                                <div key={s.step} className={`flex items-center gap-6 group transition-all duration-700 ${(isActive || isErrorStep) ? 'scale-110 translate-x-4' : isDone ? 'opacity-30' : 'opacity-50'}`}>
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl border transition-all ${isActive ? 'bg-indigo-600 border-indigo-400 shadow-[0_0_20px_#6366f1]' : isErrorStep ? 'bg-rose-600 border-rose-400 shadow-[0_0_20px_#e11d48]' : 'bg-white/5 border-white/5'}`}>
                                        {isErrorStep ? '❌' : (isDone ? '✅' : s.icon)}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className={`lux-tech-label !text-xs ${isActive ? 'text-white' : isErrorStep ? 'text-rose-400' : 'text-slate-300'}`}>{s.label}</span>
                                        {isActive && <div className="h-1 w-12 bg-indigo-500 mt-2 animate-pulse rounded-full shadow-[0_0_10px_#6366f1]" />}
                                        {isErrorStep && <div className="h-1 w-12 bg-rose-500 mt-2 rounded-full shadow-[0_0_10px_#e11d48]" />}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="lux-glass !bg-rose-500/5 border-rose-500/20 p-8 rounded-3xl mt-12">
                    <p className="lux-tech-label !text-rose-400 mb-4">Actions</p>
                    <button onClick={stopAndClearRAM} className="w-full py-4 rounded-xl bg-rose-500 text-white lux-tech-label !text-white shadow-lg hover:bg-rose-600 transition-all">Cancel and Stop</button>
                </div>
            </div>

            {/* Right: Stats + Actions + Terminal */}
            <div className="col-span-8 space-y-10">
                {/* Main stats card */}
                <div className="lux-card !bg-black border-white/10 p-16 relative overflow-hidden min-h-[450px] shadow-2xl lux-tactical-border">
                    <div className="lux-tactical-corner-tl" />
                    <div className="lux-tactical-corner-tr" />
                    <div className="lux-tactical-corner-bl" />
                    <div className="lux-tactical-corner-br" />

                    <div className="v2-scanline absolute inset-0 opacity-10" />
                    <div className="relative z-10 flex flex-col h-full">
                        <h2 className="text-5xl font-black uppercase tracking-tighter leading-none mb-12 italic" style={{ fontFamily: '"Rajdhani", sans-serif' }}>
                            {ocrBatch.status === 'uploaded' && <span className="text-slate-800">FILE READY</span>}
                            {(ocrBatch.status === 'extracting' || ocrBatch.status === 'processing') && <span className="lux-text-gradient animate-pulse">PROCESSING DATA</span>}
                            {hasFailed && <span className="text-rose-500">SYSTEM FAILURE</span>}
                            {ocrBatch.status === 'extracted' && <span className="text-indigo-600">PAGES READ</span>}
                            {isComplete && <span className="text-emerald-500">PREVIEW READY</span>}
                        </h2>

                        <div className="grid grid-cols-3 gap-12 mt-auto">
                            {[
                                { l: 'Total Pages', v: ocrBatch.total_pages || 0, c: 'text-white' },
                                { l: 'Progress', v: `${calculateIntelligence()}%`, c: 'text-indigo-400' },
                                { l: 'Voters Found', v: ocrBatch.voters_processed || 0, c: 'text-emerald-400' }
                            ].map(m => (
                                <div key={m.l}>
                                    <p className="lux-tech-label mb-3">{m.l}</p>
                                    <p className={`text-5xl font-black ${m.c} tracking-tighter italic`} style={{ fontFamily: '"Rajdhani", sans-serif' }}>{m.v}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                    {hasFailed && (
                        <div className="mt-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl">
                            <p className="lux-tech-label !text-rose-400 !text-[10px] mb-1">CRITICAL ERROR REPORT</p>
                            <p className="text-rose-200 font-mono text-sm leading-relaxed">{ocrBatch.error || "Unknown system failure occurred during background processing."}</p>
                        </div>
                    )}
                </div>

                {/* Clean / Flagged counts */}
                <div className="grid grid-cols-2 gap-10">
                    <div className="lux-card bg-emerald-500/5 border-emerald-500/20 p-10 flex justify-between items-center group cursor-pointer hover:bg-emerald-500/10 transition-all shadow-xl lux-tactical-border">
                        <div className="lux-tactical-corner-tl" />
                        <div className="lux-tactical-corner-br" />
                        <div>
                            <p className="lux-tech-label !text-emerald-400 mb-2">Ready to Save</p>
                            <p className="text-5xl font-black text-white group-hover:scale-110 transition-transform origin-left" style={{ fontFamily: '"Rajdhani", sans-serif' }}>{ocrBatch.clean_count || 0}</p>
                        </div>
                        <div className="text-5xl opacity-20 transform group-hover:rotate-12 transition-all">💎</div>
                    </div>
                    <div className="lux-card bg-rose-500/5 border-rose-500/20 p-10 flex justify-between items-center group cursor-pointer hover:bg-rose-500/10 transition-all shadow-xl lux-tactical-border">
                        <div className="lux-tactical-corner-tl" />
                        <div className="lux-tactical-corner-br" />
                        <div>
                            <p className="lux-tech-label !text-rose-400 mb-2">Records with Errors</p>
                            <p className="text-5xl font-black text-white group-hover:scale-110 transition-transform origin-left" style={{ fontFamily: '"Rajdhani", sans-serif' }}>{ocrBatch.flagged_count || 0}</p>
                        </div>
                        <div className="text-5xl opacity-20 transform group-hover:-rotate-12 transition-all">🚩</div>
                    </div>
                </div>

                {/* Cost Report — shown after extraction completes */}
                {isComplete && ocrBatch.cost && (
                    <div className="lux-card bg-amber-500/5 border-amber-500/20 p-6 flex justify-between items-center shadow-xl">
                        <div className="flex gap-8 items-center">
                            <div>
                                <p className="lux-tech-label !text-amber-400 mb-1">API Calls</p>
                                <p className="text-2xl font-black text-white">{ocrBatch.cost.api_calls || 0}</p>
                            </div>
                            <div>
                                <p className="lux-tech-label !text-amber-400 mb-1">Input Tokens</p>
                                <p className="text-2xl font-black text-white">{(ocrBatch.cost.input_tokens || 0).toLocaleString()}</p>
                            </div>
                            <div>
                                <p className="lux-tech-label !text-amber-400 mb-1">Output Tokens</p>
                                <p className="text-2xl font-black text-white">{(ocrBatch.cost.output_tokens || 0).toLocaleString()}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="lux-tech-label !text-amber-400 mb-1">Estimated Cost</p>
                            <p className="text-3xl font-black text-amber-400">${ocrBatch.cost.estimated_cost_usd || '0.00'}</p>
                            {ocrBatch.engine_version && (
                                <p className={`text-[9px] mt-1 font-bold tracking-wider ${ocrBatch.engine_version === 'v2' ? 'text-emerald-400' : 'text-slate-500'}`}>
                                    ENGINE {ocrBatch.engine_version.toUpperCase()}
                                </p>
                            )}
                        </div>
                    </div>
                )}

                {/* Action buttons */}
                <div className="flex gap-8 mt-10">
                    {ocrBatch.status === 'uploaded' && (
                        <button onClick={startExtraction} disabled={!isLocationValid} className="lux-btn-primary flex-1 !py-8 text-sm tracking-[0.3em] !font-bold disabled:opacity-30 disabled:cursor-not-allowed" style={{ fontFamily: '"Rajdhani", sans-serif' }}>
                            Start Scanning
                        </button>
                    )}
                    {ocrBatch.status === 'extracted' && (
                        <div className="flex-1 flex flex-col gap-4">
                            <EngineToggle engineVersion={engineVersion} onToggle={setEngineVersion} disabled={false} />
                            <button onClick={startOcr} disabled={!isLocationValid} className="lux-btn-primary w-full !py-8 text-sm tracking-[0.3em] !font-bold !from-indigo-600 !to-purple-600 shadow-[0_0_30px_rgba(99,102,241,0.5)] disabled:opacity-30 disabled:cursor-not-allowed" style={{ fontFamily: '"Rajdhani", sans-serif' }}>
                                Run Data Processor {engineVersion === 'v2' ? '(V2) ⚡' : '⚡'}
                            </button>
                        </div>
                    )}
                    {isComplete && (
                        <div className="flex-1 flex gap-6">
                            <button onClick={handleSaveBatch} className="flex-1 bg-white text-black py-8 rounded-2xl font-bold uppercase text-[11px] tracking-[0.2em] shadow-2xl hover:bg-indigo-400 hover:text-white transition-all" style={{ fontFamily: '"Rajdhani", sans-serif' }}>
                                Save to Database
                            </button>
                            <button onClick={() => api.exportBatchCSV(ocrBatch.id)} className="px-12 lux-glass rounded-2xl font-bold text-white text-[11px] uppercase tracking-widest border-white/10 hover:bg-white/10" style={{ fontFamily: '"Rajdhani", sans-serif' }}>Export Result</button>
                        </div>
                    )}
                </div>

                {/* Live Activity Terminal */}
                <div className="mt-12 bg-[#09090b] border border-white/10 rounded-xl p-4 font-mono text-xs overflow-hidden shadow-2xl">
                    <div className="flex items-center gap-3 mb-4 pb-3 border-b border-white/10 opacity-60">
                        <div className="flex gap-1.5">
                            <div className="w-2.5 h-2.5 rounded-full bg-rose-500/80"></div>
                            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80"></div>
                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80"></div>
                        </div>
                        <span className="uppercase tracking-[0.2em] text-[9px] text-white font-bold ml-2">Live System Activity Feed</span>
                        <div className="ml-auto w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                    </div>
                    <div className="space-y-1.5 h-[160px] overflow-y-auto pr-2 custom-scrollbar flex flex-col-reverse">
                        {systemLogs && systemLogs.map((log, i) => (
                            <div key={i} className={`opacity-${Math.max(20, 100 - (i * 5))} ${log.includes('❌') || log.includes('ERROR') ? 'text-rose-400 font-bold' : log.includes('⚠️') || log.includes('Quota') ? 'text-yellow-400' : 'text-emerald-400/80'}`}>
                                <span className="opacity-40 mr-3">[{new Date().toLocaleTimeString()}]</span>
                                {log}
                            </div>
                        ))}
                        {(!systemLogs || systemLogs.length === 0) && (
                            <div className="text-white/20 italic text-center mt-10">Awaiting system activity...</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BatchProgress;
