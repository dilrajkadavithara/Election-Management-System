import { useState, useEffect, useRef } from 'react';
import api from '../api';
import { OCR_POLL_INTERVAL } from '../constants';

/**
 * Manages OCR batch lifecycle: upload, extraction, processing, save, cancel.
 *
 * Depends on:
 *   - isLoggedIn, view (to auto-reconnect when engine view opens)
 *   - loadStats, setView, setShowSuccess (from context/voters — called after save-to-db)
 *   - setEditData, setEditMode (from context — for correction workflow)
 */
export default function useOCR({ isLoggedIn, view, loadStats, loadAdminData, setView, setShowSuccess, setEditData, setEditMode }) {
    const [ocrBatch, setOcrBatch] = useState(null);
    const [ocrLoading, setOcrLoading] = useState(false);
    const [ocrError, setOcrError] = useState(null);
    const [ocrTargetLoc, setOcrTargetLoc] = useState({ constId: '', lbId: '', boothId: '', psNo: '', psName: '' });
    const [useDirectPdf, setUseDirectPdf] = useState(false);
    const [useGemini, setUseGemini] = useState(true);
    const ocrRef = useRef(null);

    // --- Auto-reconnect to latest batch when engine view opens ---
    useEffect(() => {
        if (!isLoggedIn || view !== 'engine' || ocrBatch) return;
        (async () => {
            try {
                const res = await api.getLatestBatch();
                if (res.found && res.batch) setOcrBatch(res.batch);
            } catch (_) {}
        })();
    }, [view, isLoggedIn]);

    // --- Status polling while extracting/processing ---
    useEffect(() => {
        if (!ocrBatch || !['extracting', 'processing', 'extracted'].includes(ocrBatch.status)) return;

        const interval = setInterval(async () => {
            try {
                const s = await api.getBatchStatus(ocrBatch.id);
                setOcrBatch(prev => ({ ...prev, ...s }));
            } catch (_) {}
        }, OCR_POLL_INTERVAL);

        return () => clearInterval(interval);
    }, [ocrBatch?.id, ocrBatch?.status]);

    // --- Actions ---
    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setOcrLoading(true);
        try {
            const res = await api.uploadPDF(file);
            // Store location snapshot in batch so Save works even if location state resets
            const loc = { ...ocrTargetLoc };
            setOcrBatch({ ...res, filename: file.name, _loc: loc });
            // Persist location to Redis so it survives page reloads
            try {
                await api.updateBatchLocation(res.id, loc);
            } catch (_) {}
        } catch (e) { setOcrError(e.message); }
        finally { setOcrLoading(false); }
    };

    const startExtraction = async () => {
        if (!ocrBatch) return;
        try {
            await api.startExtract(ocrBatch.id, useDirectPdf);
            setOcrBatch(prev => ({ ...prev, status: 'extracting', direct_pdf: useDirectPdf }));
        } catch (e) { setOcrError(e.message); }
    };

    const startOcr = async () => {
        if (!ocrBatch) return;
        try {
            await api.startProcess(ocrBatch.id, useGemini, ocrBatch.direct_pdf || useDirectPdf);
            setOcrBatch(prev => ({ ...prev, status: 'processing', use_gemini: useGemini }));
        } catch (e) { setOcrError(e.message); }
    };

    const handleSaveBatch = async () => {
        if (!ocrBatch) {
            alert('No batch data available. Please upload and extract first.');
            return;
        }
        setOcrLoading(true);
        setOcrError(null);
        try {
            // Use current location state, fall back to snapshot stored at upload time or in Redis
            const loc = (ocrTargetLoc.constId) ? ocrTargetLoc : (ocrBatch._loc || ocrBatch.location || ocrTargetLoc);
            console.log('Save to DB:', { batchId: ocrBatch.id, loc, status: ocrBatch.status });

            if (!loc.constId && !loc.constName) {
                alert('Location not set. Please select Constituency, Local Body, and Booth before saving.');
                setOcrLoading(false);
                return;
            }

            const res = await api.saveToDB(
                ocrBatch.id,
                loc.constId || loc.constName,
                '',
                loc.lbId || loc.lbName,
                loc.boothId,
                loc.boothNo || loc.boothId,
                loc.psNo,
                loc.psName
            );
            if (res.success) {
                try { await api.clearSession(ocrBatch.id); } catch (_) {}
                setShowSuccess(true);
                setTimeout(() => {
                    setShowSuccess(false);
                    setOcrBatch(null);
                    loadStats();
                    loadAdminData();
                    setView('dashboard');
                }, 2000);
            } else {
                alert('Save failed: ' + (res.message || 'Unknown error'));
                setOcrError(res.message || "Failed to commit data to Intelligence Engine.");
            }
        } catch (e) {
            const msg = e.response?.data?.detail || e.message;
            alert('Save error: ' + (typeof msg === 'string' ? msg : JSON.stringify(msg)));
            setOcrError(typeof msg === 'string' ? msg : JSON.stringify(msg));
        }
        finally { setOcrLoading(false); }
    };

    const stopAndClearRAM = async () => {
        if (!ocrBatch) return;
        try { await api.stopAndClearRAM(ocrBatch.id); }
        catch (_) {}
        finally {
            setOcrBatch(null);
            setOcrError(null);
        }
    };

    const discardBatch = () => setOcrBatch(null);

    const saveCorrection = async (editData, ocrBatch, currentPage, loadVoters, setLoading) => {
        setLoading(true);
        try {
            if (editData.id) {
                // Regular database edit
                await api.editVoterInDB(editData.id, editData);
                setEditMode(false);
                loadVoters(currentPage);
                loadStats();
            } else if (ocrBatch && editData.voter_id) {
                // OCR process correction
                await api.updateVoter(ocrBatch.id, editData.voter_id, editData);
                const s = await api.getBatchStatus(ocrBatch.id);
                setOcrBatch(prev => ({ ...prev, ...s }));

                const flagged = (s.results || []).filter(r => r.Status !== '\u2705 OK');
                if (flagged.length > 0) {
                    const res = flagged[0];
                    setEditData({
                        full_name: res['Full Name'] || res.full_name,
                        relation_type: res['Relation Type'] || res.relation_type,
                        relation_name: res['Relation Name'] || res.relation_name,
                        house_no: res['House Number'] || res.house_no,
                        house_name: res['House Name'] || res.house_name,
                        epic_id: res.EPIC_ID || res.epic_id,
                        age: res.Age || res.age,
                        gender: (res.Gender || res.gender)?.toUpperCase() === 'MALE' ? 'MALE' : 'FEMALE',
                        voter_leaning: res.voter_leaning || res.Leaning || '',
                        current_location: res.current_location || res.Location || 'LOCAL',
                        voting_probability: res.voting_probability || res.Probability || '',
                        phone_no: res.phone_no || res.phone || '',
                        voter_id: res.voter_id,
                        image_name: res.image_name
                    });
                } else {
                    setEditMode(false);
                    alert("All corrections complete!");
                }
            }
        } catch (e) { throw e; }
        finally { setLoading(false); }
    };

    return {
        ocrBatch, setOcrBatch,
        ocrLoading, setOcrLoading,
        ocrError, setOcrError,
        ocrTargetLoc, setOcrTargetLoc,
        useDirectPdf, setUseDirectPdf,
        useGemini, setUseGemini,
        ocrRef,
        handleFileUpload, startExtraction, startOcr,
        handleSaveBatch, stopAndClearRAM, discardBatch,
        saveCorrection,
    };
}
