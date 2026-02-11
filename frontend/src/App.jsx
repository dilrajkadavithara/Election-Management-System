import React, { useState, useEffect } from 'react';
import api from './api';

const App = () => {
    // Phase 1: Meta
    const [constituency, setConstituency] = useState('');
    const [booth, setBooth] = useState('');
    const [constituencies, setConstituencies] = useState([]);
    const [file, setFile] = useState(null);

    // Phase Status
    const [stage, setStage] = useState('setup'); // setup, uploading, converting, detecting, ocr, results, review
    const [batchId, setBatchId] = useState(null);
    const [status, setStatus] = useState({});

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [apiHealth, setApiHealth] = useState(null);

    // Review
    const [editData, setEditData] = useState({});

    useEffect(() => {
        checkHealth();
        loadConstituencies();
    }, []);

    // Polling Logic (Status Only, No Auto-Transitions)
    useEffect(() => {
        let interval;
        const activeStages = ['uploading', 'converting', 'detecting', 'ocr'];
        if (batchId && activeStages.includes(stage)) {
            interval = setInterval(async () => {
                try {
                    const s = await api.getBatchStatus(batchId);
                    setStatus(s);
                    // No transitions here - just update UI counters
                } catch (e) {
                    console.error("Polling error", e);
                }
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [batchId, stage]);

    const checkHealth = async () => {
        try { const h = await api.checkHealth(); setApiHealth(h.status === 'healthy'); }
        catch { setApiHealth(false); }
    };

    const loadConstituencies = async () => {
        try { const c = await api.getConstituencies(); setConstituencies(c); }
        catch (e) { console.error("Could not load constituencies", e); }
    };

    // ACTION: STEP 1 - UPLOAD
    const handleInitialUpload = async () => {
        if (!constituency || !booth || !file) {
            setError("Please complete all fields (Constituency, Booth, and File).");
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const res = await api.uploadPDF(file);
            setBatchId(res.batch_id);
            setStage('converting');
            // Auto-start Phase 1: PDF to Image conversion + Boxing
            await api.extractBoxes(res.batch_id);
        } catch (e) { setError(e.message); setLoading(false); }
    };

    // ACTION: STEP 2 - MOVE TO OCR (Neural Engine)
    const handleStartOCR = async () => {
        setLoading(true);
        try {
            await api.processBatch(batchId);
            setStage('ocr');
            setLoading(false);
        } catch (e) { setError(e.message); setLoading(false); }
    };

    // ACTION: STEP 3 - MOVE TO RESULTS
    const handleFinishOCR = () => {
        setStage('results');
    };

    // ACTION: STEP 4 - PERSIST & RESET
    const handleFinalSave = async () => {
        if (!constituency || !booth) { alert("Data missing."); return; }
        setLoading(true);
        try {
            const res = await api.saveToDB(batchId, constituency, booth);
            if (res.success) {
                alert("✅ Record Saved to DB & CSV!");
                handleCycleReset();
            } else {
                setError(res.message);
            }
        } catch (e) { setError(e.message); }
        finally { setLoading(false); }
    };

    const handleCycleReset = async () => {
        if (batchId) {
            try { await api.clearSession(batchId); } catch (e) { }
        }
        // RESET UI but keep Constituency in dropdown
        setBatchId(null);
        setStatus({});
        setFile(null);
        setBooth('');
        setStage('setup');
        setError(null);
        setLoading(false);
        loadConstituencies(); // Refresh dropdown
    };

    // Review Logic
    const flaggedVoters = status.results ? status.results.filter(r => r.Status !== '✅ OK') : [];

    const startReview = () => {
        if (flaggedVoters.length === 0) { alert("No items need review!"); return; }
        setEditData({ ...flaggedVoters[0] });
        setStage('review');
    };

    const saveCorrection = async () => {
        setLoading(true);
        try {
            await api.updateVoter(batchId, editData.voter_id, editData);
            const freshStatus = await api.getBatchStatus(batchId);
            setStatus(freshStatus);
            const remaining = freshStatus.results.filter(r => r.Status !== '✅ OK');
            if (remaining.length > 0) { setEditData({ ...remaining[0] }); }
            else { setStage('results'); }
        } catch (e) { setError(e.message); }
        finally { setLoading(false); }
    };

    // UI Helpers
    const stats_total_pages = status.total_pages || 0;
    const stats_pages_done = status.pages_processed || 0;
    const stats_extraction_done = status.status === 'extracted';

    const stats_total_voters = status.total_voters || 0;
    const stats_voters_done = status.voters_processed || 0;
    const stats_ocr_done = status.status === 'processed';

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20">
            {/* Header */}
            <header className="bg-white border-b px-8 py-4 flex justify-between items-center sticky top-0 z-50 shadow-sm">
                <div className="flex items-center gap-4">
                    <span className="text-3xl">🗳️</span>
                    <div>
                        <h1 className="text-xl font-black tracking-tight text-primary-700 uppercase leading-none">Voter OCR <span className="text-slate-400">v2.6</span></h1>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Gated Workflow Engine</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${apiHealth ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600'}`}>
                        <span className={`w-2 h-2 rounded-full ${apiHealth ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></span>
                        {apiHealth ? 'Engine Online' : 'Connecting'}
                    </div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto mt-12 px-6">
                {error && <div className="bg-rose-50 p-6 rounded-2xl mb-8 border border-rose-100 text-rose-700 font-bold">{error}</div>}

                {/* STAGE 1: SETUP */}
                {stage === 'setup' && (
                    <div className="bg-white rounded-3xl p-12 shadow-xl border border-slate-100 space-y-10">
                        <div className="grid grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <label className="block text-xs font-black uppercase tracking-widest text-slate-400">1. Constituency Name</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        list="const-list"
                                        placeholder="Type or Select..."
                                        value={constituency}
                                        onChange={(e) => setConstituency(e.target.value)}
                                        className="w-full p-5 bg-slate-50 border-2 border-slate-50 rounded-2xl focus:border-primary-500 transition-all font-bold text-lg"
                                    />
                                    <datalist id="const-list">
                                        {constituencies.map(c => <option key={c} value={c} />)}
                                    </datalist>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <label className="block text-xs font-black uppercase tracking-widest text-slate-400">2. Booth Number</label>
                                <input
                                    type="number"
                                    placeholder="Enter No."
                                    value={booth}
                                    onChange={(e) => setBooth(e.target.value)}
                                    className="w-full p-5 bg-slate-50 border-2 border-slate-50 rounded-2xl focus:border-primary-500 transition-all font-bold text-lg"
                                />
                            </div>
                        </div>

                        <div className="space-y-4 pt-4 border-t border-slate-100">
                            <label className="block text-xs font-black uppercase tracking-widest text-slate-400">3. Source Document</label>
                            <label className="border-4 border-dashed border-slate-100 rounded-3xl p-12 block text-center cursor-pointer hover:bg-primary-50 hover:border-primary-200 transition-all">
                                <input type="file" onChange={(e) => setFile(e.target.files[0])} className="hidden" accept=".pdf" />
                                <div className="text-4xl mb-4">{file ? "✅" : "📄"}</div>
                                <h3 className="text-xl font-bold text-slate-700">{file ? file.name : "Select PDF Sheet"}</h3>
                            </label>
                        </div>

                        <button onClick={handleInitialUpload} className="w-full bg-primary-600 text-white py-6 rounded-2xl text-xl font-black uppercase tracking-widest hover:bg-primary-700 shadow-xl shadow-primary-200 transition-all">
                            Initialize Cycle
                        </button>
                    </div>
                )}

                {/* STAGE 2: CONVERSION & DETECTION (Phases 1+2 Combined Counter) */}
                {stage === 'converting' && (
                    <div className="bg-white rounded-3xl p-12 shadow-xl border border-slate-100 text-center space-y-10">
                        <div className="inline-block px-4 py-1 bg-primary-50 text-primary-600 rounded-full text-[10px] font-black uppercase tracking-widest">Phase 1: Detection</div>
                        <h2 className="text-3xl font-black">Converting & Segmenting Pages</h2>

                        <div className="max-w-md mx-auto space-y-4">
                            <div className="flex justify-between font-black text-xs text-slate-400 uppercase">
                                <span>Progress</span>
                                <span className={`${stats_extraction_done ? 'text-emerald-500' : 'text-slate-800'}`}>
                                    {stats_extraction_done ? 'Completed' : `${stats_pages_done} / ${stats_total_pages || '?'}`}
                                </span>
                            </div>
                            <div className="h-4 bg-slate-100 rounded-full overflow-hidden p-1 shadow-inner">
                                <div className={`h-full rounded-full transition-all duration-1000 ${stats_extraction_done ? 'bg-emerald-500' : 'bg-primary-500 animate-pulse'}`} style={{ width: `${Math.max(5, (stats_pages_done / stats_total_pages) * 100 || 0)}%` }}></div>
                            </div>
                        </div>

                        <div className="pt-8 border-t border-slate-50">
                            {stats_extraction_done ? (
                                <div className="space-y-6 animate-in">
                                    <p className="text-slate-500 font-bold">Successfully extracted <span className="text-slate-900">{stats_total_voters}</span> voter regions from all pages.</p>
                                    <button onClick={handleStartOCR} className="w-full bg-primary-600 text-white py-6 rounded-2xl text-xl font-black uppercase tracking-widest hover:bg-primary-700">Proceed to Neural OCR</button>
                                </div>
                            ) : (
                                <p className="text-slate-400 font-bold animate-pulse">Running Background Core Tasks...</p>
                            )}
                        </div>
                    </div>
                )}

                {/* STAGE 3: NEURAL OCR */}
                {stage === 'ocr' && (
                    <div className="bg-white rounded-3xl p-12 shadow-xl border border-slate-100 text-center space-y-10">
                        <div className="inline-block px-4 py-1 bg-secondary-50 text-secondary-600 rounded-full text-[10px] font-black uppercase tracking-widest">Phase 2: Neural OCR</div>
                        <h2 className="text-3xl font-black">Parsing Field Entries</h2>

                        <div className="max-w-md mx-auto space-y-4">
                            <div className="flex justify-between font-black text-xs text-slate-400 uppercase">
                                <span>Parse Count</span>
                                <span className={`${stats_ocr_done ? 'text-emerald-500' : 'text-slate-800'}`}>
                                    {stats_ocr_done ? 'Completed' : `${stats_voters_done} / ${stats_total_voters || '?'}`}
                                </span>
                            </div>
                            <div className="h-4 bg-slate-100 rounded-full overflow-hidden p-1 shadow-inner">
                                <div className={`h-full rounded-full transition-all duration-1000 ${stats_ocr_done ? 'bg-emerald-500' : 'bg-secondary-500 animate-pulse'}`} style={{ width: `${Math.max(5, (stats_voters_done / stats_total_voters) * 100 || 0)}%` }}></div>
                            </div>
                        </div>

                        <div className="pt-8 border-t border-slate-50">
                            {stats_ocr_done ? (
                                <div className="space-y-6 animate-in">
                                    <p className="text-slate-500 font-bold">OCR Cycle Finished. {status.flagged_count} records requires manual review.</p>
                                    <button onClick={handleFinishOCR} className="w-full bg-slate-900 text-white py-6 rounded-2xl text-xl font-black uppercase tracking-widest hover:bg-black">View Results Summary</button>
                                </div>
                            ) : (
                                <p className="text-slate-400 font-bold animate-pulse">Processing Neural Extractions...</p>
                            )}
                        </div>
                    </div>
                )}

                {/* STAGE 4: RESULTS SUMMARY */}
                {stage === 'results' && (
                    <div className="space-y-8 animate-in">
                        <div className="grid grid-cols-3 gap-6">
                            <div className="bg-white p-8 rounded-3xl shadow-lg border border-slate-100">
                                <p className="text-[10px] font-black uppercase text-slate-400 mb-2">Total Voters</p>
                                <p className="text-4xl font-black text-slate-800">{status.total_voters}</p>
                            </div>
                            <div className="bg-emerald-50 p-8 rounded-3xl shadow-lg border border-emerald-100">
                                <p className="text-[10px] font-black uppercase text-emerald-500 mb-2">Clean Pass</p>
                                <p className="text-4xl font-black text-emerald-700">{status.clean_count}</p>
                            </div>
                            <div className="bg-rose-50 p-8 rounded-3xl shadow-lg border border-rose-100">
                                <p className="text-[10px] font-black uppercase text-rose-500 mb-2">Flagged</p>
                                <p className="text-4xl font-black text-rose-700">{status.flagged_count}</p>
                            </div>
                        </div>

                        <div className="bg-white rounded-3xl p-10 shadow-xl border border-slate-100 space-y-8">
                            <div className="flex flex-col gap-4">
                                <div className="flex gap-4">
                                    <button onClick={startReview} className="flex-1 bg-amber-500 text-white py-6 rounded-2xl font-black text-xl uppercase tracking-widest hover:bg-amber-600 shadow-xl shadow-amber-200">Manual Review ({status.flagged_count})</button>
                                    <button onClick={handleFinalSave} disabled={loading} className="flex-1 bg-primary-600 text-white py-6 rounded-2xl font-black text-xl uppercase tracking-widest hover:bg-primary-700 shadow-xl shadow-primary-200">Commit to Database</button>
                                </div>
                                <button
                                    onClick={() => api.downloadCSV(batchId)}
                                    className="w-full bg-slate-100 text-slate-700 py-6 rounded-2xl font-black text-xl uppercase tracking-widest hover:bg-slate-200 border-2 border-slate-200 transition-all flex items-center justify-center gap-4"
                                >
                                    <span>📥</span> Download CSV for Verification
                                </button>
                            </div>
                            <button onClick={handleCycleReset} className="w-full py-4 text-xs font-black text-slate-400 uppercase tracking-widest hover:text-rose-500 transition-colors">Discard Batch & Reset</button>
                        </div>
                    </div>
                )}

                {/* MANUAL REVIEW STAGE */}
                {stage === 'review' && (
                    <div className="animate-in grid grid-cols-2 gap-10 items-start">
                        <div className="bg-slate-900 rounded-3xl p-6 shadow-2xl sticky top-28 border-4 border-slate-800">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 block text-center">Core Crop Output</label>
                            <div className="bg-white rounded-xl p-4 flex items-center justify-center">
                                <img src={`/api/voter-image/${batchId}/${editData.image_name}`} alt="Voter Box" className="max-w-full max-h-[350px] object-contain" />
                            </div>
                        </div>

                        <div className="bg-white rounded-3xl p-8 shadow-2xl border border-slate-100 space-y-6">
                            <h3 className="text-2xl font-black tracking-tighter mb-4 uppercase">Field Correction</h3>
                            <div className="space-y-5">
                                {[
                                    { k: 'Full Name', l: 'Full Name' },
                                    { k: 'Relation Name', l: 'Guardian / Relation' },
                                    { k: 'House Number', l: 'House No' },
                                    { k: 'House Name', l: 'House Name' },
                                    { k: 'EPIC_ID', l: 'EPIC ID' },
                                    { k: 'Age', l: 'Age', type: 'number' },
                                    { k: 'Gender', l: 'Gender' },
                                ].map(f => (
                                    <div key={f.k}>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">{f.l}</label>
                                        <input
                                            type={f.type || 'text'}
                                            value={editData[f.k] || ''}
                                            onChange={(e) => setEditData({ ...editData, [f.k]: e.target.value })}
                                            className="w-full p-3.5 bg-slate-50 border-2 border-slate-50 rounded-xl focus:border-primary-500 transition-all font-bold text-slate-800"
                                        />
                                    </div>
                                ))}
                            </div>
                            <div className="flex gap-4 pt-6">
                                <button onClick={() => setStage('results')} className="flex-1 text-slate-400 font-black text-[10px] uppercase border p-4 rounded-xl hover:bg-slate-50">Cancel</button>
                                <button onClick={saveCorrection} className="flex-[3] bg-emerald-600 text-white py-4 rounded-xl font-black text-lg uppercase hover:bg-emerald-700 shadow-xl shadow-emerald-200">Save & Next</button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default App;
