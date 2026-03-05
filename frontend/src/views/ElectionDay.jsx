import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import api from '../api';

const LEANING_CONFIG = {
    UDF: { color: 'bg-blue-500', border: 'border-blue-500/60', glow: 'shadow-[0_0_15px_rgba(59,130,246,0.4)]', text: 'text-blue-400', badge: 'bg-blue-500/20 text-blue-300' },
    LDF: { color: 'bg-red-500', border: 'border-red-500/60', glow: 'shadow-[0_0_15px_rgba(239,68,68,0.4)]', text: 'text-red-400', badge: 'bg-red-500/20 text-red-300' },
    NDA: { color: 'bg-orange-500', border: 'border-orange-500/60', glow: 'shadow-[0_0_15px_rgba(249,115,22,0.4)]', text: 'text-orange-400', badge: 'bg-orange-500/20 text-orange-300' },
    NEUTRAL: { color: 'bg-slate-500', border: 'border-slate-600', glow: '', text: 'text-slate-400', badge: 'bg-slate-700 text-slate-300' },
};

const ElectionDay = ({ userRole, userAssignments }) => {
    const [locations, setLocations] = useState([]);
    const [selConst, setSelConst] = useState('');
    const [selLB, setSelLB] = useState('');
    const [selBooth, setSelBooth] = useState('');
    const [voters, setVoters] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(false);
    const [updatingId, setUpdatingId] = useState(null);
    const [filterStatus, setFilterStatus] = useState('ALL');
    const [filterParty, setFilterParty] = useState('ALL');
    // Detail popup (modal on mobile, hover tooltip on desktop)
    const [selectedVoter, setSelectedVoter] = useState(null);
    // Desktop hover tooltip
    const [hoveredVoter, setHoveredVoter] = useState(null);
    const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
    // Double-tap tracking for mobile
    const lastTapRef = useRef({});

    useEffect(() => {
        api.getLocations().then(data => {
            setLocations(data);
            if (userAssignments?.constituencies?.length > 0) {
                const cid = userAssignments.constituencies[0];
                setSelConst(cid);
                const cObj = data.find(c => c.id === cid);
                if (cObj && userAssignments.local_bodies?.length > 0) {
                    const lbid = userAssignments.local_bodies[0];
                    setSelLB(lbid);
                    if (userAssignments.booths?.length > 0) {
                        setSelBooth(userAssignments.booths[0]);
                    }
                }
            }
        });
    }, [userAssignments]);

    const fetchData = useCallback(async (boothId) => {
        if (!boothId) return;
        setLoading(true);
        setVoters([]);
        try {
            const [vData, sData] = await Promise.all([
                api.getVoters({ booth: boothId, page: 1, page_size: 9999 }),
                api.getVotingStats(null, null, boothId)
            ]);
            const counts = {};
            vData.results.forEach(v => counts[v.serial_no] = (counts[v.serial_no] || 0) + 1);
            const marked = vData.results.map(v => ({ ...v, is_duplicate: counts[v.serial_no] > 1 }));
            const sorted = marked.sort((a, b) => (parseInt(a.serial_no) || 0) - (parseInt(b.serial_no) || 0));
            setVoters(sorted);
            setStats(sData);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => {
        fetchData(selBooth);
        const interval = setInterval(() => {
            if (selBooth) api.getVotingStats(null, null, selBooth).then(setStats);
        }, 30000);
        return () => clearInterval(interval);
    }, [selBooth, fetchData]);

    const handleVoteToggle = useCallback(async (voter, val) => {
        if (updatingId) return;
        setUpdatingId(voter.id);
        try {
            const res = await api.toggleAttendance(voter.id, val);
            setVoters(prev => prev.map(v => v.id === voter.id ? { ...v, has_voted: val } : v));
            if (res.booth_stats) setStats(res.booth_stats);
            // Update selectedVoter if open
            setSelectedVoter(prev => prev?.id === voter.id ? { ...prev, has_voted: val } : prev);
        } catch (e) { alert("Error: " + e.message); }
        finally { setUpdatingId(null); }
    }, [updatingId]);

    // -----------------------------------------------
    // DESKTOP: Hover to show tooltip, Click to toggle
    // -----------------------------------------------
    const handleMouseEnter = useCallback((v, e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        // Position tooltip to the right of card, or left if too close to edge
        const tipX = rect.right + 8 > window.innerWidth - 220 ? rect.left - 228 : rect.right + 8;
        const tipY = Math.min(rect.top, window.innerHeight - 180);
        setTooltipPos({ x: tipX, y: tipY });
        setHoveredVoter(v);
    }, []);

    const handleMouseLeave = useCallback(() => {
        setHoveredVoter(null);
    }, []);

    const handleDesktopClick = useCallback((v) => {
        handleVoteToggle(v, !v.has_voted);
    }, [handleVoteToggle]);

    // -----------------------------------------------
    // MOBILE: Single tap = tooltip, double tap = vote
    // Voted card: single tap = unvote
    // -----------------------------------------------
    const handleTouchEnd = useCallback((v, e) => {
        e.preventDefault(); // prevent ghost click
        if (v.has_voted) {
            // Voted: single tap unvotes
            handleVoteToggle(v, false);
            return;
        }
        const now = Date.now();
        const last = lastTapRef.current[v.id] || 0;
        if (now - last < 350) {
            // Double tap — mark as voted
            lastTapRef.current[v.id] = 0;
            handleVoteToggle(v, true);
        } else {
            // Single tap — show detail modal
            lastTapRef.current[v.id] = now;
            setSelectedVoter(v);
        }
    }, [handleVoteToggle]);

    const filteredVoters = useMemo(() => {
        return voters.filter(v => {
            const matchesStatus = filterStatus === 'ALL' || (filterStatus === 'VOTED' ? v.has_voted : !v.has_voted);
            const matchesParty = filterParty === 'ALL' || v.voter_leaning === filterParty;
            return matchesStatus && matchesParty;
        });
    }, [voters, filterStatus, filterParty]);

    const pendingCounts = useMemo(() => {
        const counts = { UDF: 0, LDF: 0, NDA: 0, NEUTRAL: 0, TOTAL: 0 };
        voters.forEach(v => {
            if (!v.has_voted) {
                counts.TOTAL++;
                if (v.voter_leaning === 'UDF') counts.UDF++;
                else if (v.voter_leaning === 'LDF') counts.LDF++;
                else if (v.voter_leaning === 'NDA') counts.NDA++;
                else counts.NEUTRAL++;
            }
        });
        return counts;
    }, [voters]);

    const currentConst = locations.find(c => c.id === parseInt(selConst));
    const currentLB = currentConst?.local_bodies.find(lb => lb.id === parseInt(selLB));

    const pct = (a, b) => b > 0 ? Math.round((a / b) * 100) : 0;

    return (
        <div className="w-full text-white p-6 pt-24 lg:p-12 lg:pl-[420px] lg:pr-16 space-y-6 sm:space-y-10 animate-in fade-in duration-700 pb-32">

            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pt-14 lg:pt-0">
                <div>
                    <h1 className="text-3xl sm:text-5xl font-black tracking-tighter uppercase lux-text-gradient">Election Day</h1>
                    <p className="text-[10px] font-black tracking-[0.4em] text-indigo-400 uppercase opacity-70">Live Attendance Tracking</p>
                </div>

                <div className="flex flex-wrap gap-3 w-full sm:w-auto">
                    {['SUPERUSER', 'MANAGER', 'CONSTITUENCY_ADMIN'].includes(userRole) && (
                        <>
                            <select value={selConst} onChange={e => { setSelConst(e.target.value); setSelLB(''); setSelBooth(''); }}
                                className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs font-bold outline-none focus:border-indigo-500">
                                <option value="" className="bg-slate-800">Constituency</option>
                                {locations.map(c => <option key={c.id} value={c.id} className="bg-slate-800">{c.name}</option>)}
                            </select>
                            <select value={selLB} onChange={e => { setSelLB(e.target.value); setSelBooth(''); }} disabled={!selConst}
                                className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs font-bold outline-none focus:border-indigo-500 disabled:opacity-30">
                                <option value="" className="bg-slate-800">Local Body</option>
                                {currentConst?.local_bodies.map(lb => <option key={lb.id} value={lb.id} className="bg-slate-800">{lb.name}</option>)}
                            </select>
                        </>
                    )}
                    <select value={selBooth} onChange={e => setSelBooth(e.target.value)}
                        disabled={!selLB && userRole !== 'BOOTH_AGENT'}
                        className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs font-bold outline-none focus:border-indigo-500 disabled:opacity-30">
                        <option value="" className="bg-slate-800">Select Booth</option>
                        {userRole === 'BOOTH_AGENT'
                            ? userAssignments?.booths?.map(bid => {
                                const b = locations.flatMap(c => c.local_bodies).flatMap(lb => lb.booths).find(bo => bo.id === bid);
                                return <option key={bid} value={bid} className="bg-slate-800">Booth {b?.number || bid}</option>;
                            })
                            : currentLB?.booths.map(b => <option key={b.id} value={b.id} className="bg-slate-800">Booth {b.number}</option>)
                        }
                    </select>
                </div>
            </div>

            {/* Stats Cards */}
            {stats && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
                    {[
                        { label: 'ആകെ പോളിംഗ്', voted: stats.voted, total: stats.total, cls: 'text-white', dot: 'bg-emerald-500 animate-pulse' },
                        { label: 'യു.ഡി.എഫ്', voted: stats.udf_voted, total: stats.udf_total, cls: 'text-blue-400', dot: 'bg-blue-500' },
                        { label: 'എൽ.ഡി.എഫ്', voted: stats.ldf_voted, total: stats.ldf_total, cls: 'text-red-400', dot: 'bg-red-500' },
                        { label: 'എൻ.ഡി.എ', voted: stats.nda_voted, total: stats.nda_total, cls: 'text-orange-400', dot: 'bg-orange-500' },
                    ].map(s => (
                        <div key={s.label} className="lux-glass rounded-3xl p-5 sm:p-7 border border-white/5 shadow-xl hover:border-white/10 transition-all">
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />{s.label}
                            </div>
                            <div className="flex items-baseline gap-2">
                                <span className={`text-3xl sm:text-4xl font-black ${s.cls}`}>{pct(s.voted, s.total)}%</span>
                                <span className="text-sm text-slate-500">{s.voted}/{s.total}</span>
                            </div>
                            {/* Mini progress bar */}
                            <div className="mt-3 h-1 bg-white/5 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full transition-all duration-1000 ${s.dot}`} style={{ width: `${pct(s.voted, s.total)}%` }} />
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Filter Bar */}
            <div className="flex flex-wrap gap-3 items-center">
                <div className="flex bg-white/5 p-1 rounded-2xl gap-1">
                    {[['ALL', 'എല്ലാം'], ['PENDING', 'ചെയ്യാത്തവർ'], ['VOTED', 'ചെയ്തവർ']].map(([s, label]) => (
                        <button key={s} onClick={() => setFilterStatus(s)}
                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${filterStatus === s ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}>
                            {label}
                        </button>
                    ))}
                </div>
                <div className="flex bg-white/5 p-1 rounded-2xl gap-1 flex-wrap">
                    {['ALL', 'UDF', 'LDF', 'NDA', 'NEUTRAL'].map(p => (
                        <button key={p} onClick={() => setFilterParty(p)}
                            className={`px-3 sm:px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filterParty === p ? 'bg-slate-600 text-white' : 'text-slate-400 hover:text-white'}`}>
                            {p}
                        </button>
                    ))}
                </div>
                {selBooth && !loading && (
                    <span className="ml-auto text-[10px] font-black text-slate-500 uppercase tracking-widest">
                        {filteredVoters.length} Voters &nbsp;·&nbsp;
                        <span className="text-slate-300">Hover/tap number for details</span>
                    </span>
                )}
            </div>

            {/* Dynamic Pending Counter Panel */}
            {selBooth && !loading && voters.length > 0 && (
                <div className="flex flex-wrap gap-2 lg:gap-4 my-3 sm:my-6">
                    <div className="lux-glass px-5 py-3 rounded-2xl flex-1 flex flex-col justify-center border-l-4 border-b border-r border-t border-l-blue-500 border-white/5 shadow-lg min-w-[120px]">
                        <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">UDF PENDING</span>
                        <span className="text-2xl sm:text-4xl font-black text-blue-400 drop-shadow-md">{pendingCounts.UDF}</span>
                    </div>
                    <div className="lux-glass px-5 py-3 rounded-2xl flex-1 flex flex-col justify-center border-l-4 border-b border-r border-t border-l-red-500 border-white/5 shadow-lg min-w-[120px]">
                        <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">LDF PENDING</span>
                        <span className="text-2xl sm:text-4xl font-black text-red-400 drop-shadow-md">{pendingCounts.LDF}</span>
                    </div>
                    <div className="lux-glass px-5 py-3 rounded-2xl flex-1 flex flex-col justify-center border-l-4 border-b border-r border-t border-l-orange-500 border-white/5 shadow-lg min-w-[120px]">
                        <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">NDA PENDING</span>
                        <span className="text-2xl sm:text-4xl font-black text-orange-400 drop-shadow-md">{pendingCounts.NDA}</span>
                    </div>
                    <div className="lux-glass px-5 py-3 rounded-2xl flex-1 flex flex-col justify-center border-l-4 border-b border-r border-t border-l-slate-400 border-white/5 shadow-lg min-w-[120px]">
                        <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">NEUTRAL OUTSTANDING</span>
                        <span className="text-2xl sm:text-4xl font-black text-slate-300 drop-shadow-md">{pendingCounts.NEUTRAL}</span>
                    </div>
                </div>
            )}

            {/* ══════ The Battle Board ══════ */}
            {!selBooth ? (
                <div className="flex flex-col items-center justify-center py-32 space-y-4 opacity-20">
                    <span className="text-9xl">🏔️</span>
                    <p className="font-black uppercase tracking-[0.4em] text-center text-sm">Select a Booth to begin</p>
                </div>
            ) : loading ? (
                <div className="grid grid-cols-5 sm:grid-cols-8 lg:grid-cols-12 xl:grid-cols-14 gap-2">
                    {[...Array(40)].map((_, i) => <div key={i} className="aspect-square bg-white/5 rounded-xl animate-pulse" />)}
                </div>
            ) : (
                <div className="grid grid-cols-5 sm:grid-cols-8 lg:grid-cols-12 xl:grid-cols-14 gap-2">
                    {filteredVoters.map(v => {
                        const lc = LEANING_CONFIG[v.voter_leaning] || LEANING_CONFIG.NEUTRAL;
                        const isUpdating = updatingId === v.id;
                        return (
                            <div
                                key={v.id}
                                /* Desktop: hover shows tooltip, click votes */
                                onMouseEnter={e => handleMouseEnter(v, e)}
                                onMouseLeave={handleMouseLeave}
                                onClick={() => handleDesktopClick(v)}
                                /* Mobile: touchEnd handles single/double tap */
                                onTouchEnd={e => handleTouchEnd(v, e)}
                                className={`
                                    relative rounded-xl border cursor-pointer select-none overflow-hidden
                                    transition-all duration-200 active:scale-95
                                    ${v.has_voted
                                        ? `bg-emerald-500/25 border-emerald-500/60 ${lc.glow}`
                                        : `bg-white/5 ${lc.border} hover:bg-white/10`
                                    }
                                    ${isUpdating ? 'opacity-50' : ''}
                                `}
                            >
                                {/* Party color top stripe */}
                                <div className={`w-full h-[3px] ${lc.color}`} />

                                <div className="flex flex-col items-center justify-center py-2 px-1 gap-1">
                                    {/* Serial Number */}
                                    <div className="flex items-center gap-1">
                                        <span className={`text-sm sm:text-base font-black leading-none ${v.has_voted ? 'text-emerald-300' : 'text-white'}`}>
                                            {isUpdating ? '⋯' : v.serial_no}
                                        </span>
                                        {v.is_duplicate && <span className="text-[10px] text-orange-500 font-bold" title="Duplicate Serial">!</span>}
                                    </div>
                                    {/* Status label */}
                                    <span className={`text-[7px] sm:text-[8px] font-black leading-none ${v.has_voted ? 'text-emerald-400' : 'text-slate-500'}`}>
                                        {v.has_voted ? '✓' : '○'}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ══════ Desktop Hover Tooltip ══════ */}
            {hoveredVoter && (
                <div
                    className="fixed z-[3000] pointer-events-none animate-in fade-in zoom-in-95 duration-150"
                    style={{ left: tooltipPos.x, top: tooltipPos.y }}
                >
                    <div className={`w-52 bg-slate-900/95 backdrop-blur-xl border rounded-2xl p-4 shadow-2xl space-y-3 ${LEANING_CONFIG[hoveredVoter.voter_leaning]?.border || 'border-white/10'}`}>
                        <div className="space-y-1">
                            <p className="text-xs font-black text-white leading-snug">{hoveredVoter.full_name}</p>
                            <p className="text-[10px] text-slate-400">{hoveredVoter.house_name || ''} {hoveredVoter.house_no ? `(${hoveredVoter.house_no})` : ''}</p>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${LEANING_CONFIG[hoveredVoter.voter_leaning]?.badge || 'bg-slate-700 text-slate-300'}`}>
                                {hoveredVoter.voter_leaning || 'NEUTRAL'}
                            </span>
                            {hoveredVoter.phone_no && (
                                <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-white/10 text-slate-300">📞 {hoveredVoter.phone_no}</span>
                            )}
                        </div>
                        <div className={`text-[9px] font-black uppercase tracking-widest ${hoveredVoter.has_voted ? 'text-emerald-400' : 'text-slate-400'}`}>
                            {hoveredVoter.has_voted ? '✓ വോട്ട് ചെയ്തു' : '○ ചെയ്തില്ല'} · Click to {hoveredVoter.has_voted ? 'unmark' : 'mark voted'}
                        </div>
                    </div>
                </div>
            )}

            {/* ══════ Mobile Detail Modal ══════ */}
            {selectedVoter && (
                <div
                    className="fixed inset-0 bg-black/80 backdrop-blur-md z-[2000] flex items-end sm:items-center justify-center p-4"
                    onClick={() => setSelectedVoter(null)}
                >
                    <div
                        className={`w-full max-w-sm bg-slate-900 border rounded-3xl p-7 space-y-6 animate-in slide-in-from-bottom-4 duration-300 ${LEANING_CONFIG[selectedVoter.voter_leaning]?.border || 'border-white/10'}`}
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="text-center space-y-2">
                            <div className={`w-14 h-14 rounded-2xl mx-auto flex items-center justify-center text-xl font-black ${LEANING_CONFIG[selectedVoter.voter_leaning]?.color || 'bg-slate-700'}`}>
                                {selectedVoter.serial_no}
                            </div>
                            <h2 className="text-xl font-black text-white">{selectedVoter.full_name}</h2>
                            <p className="text-xs text-slate-400">{selectedVoter.house_name} {selectedVoter.house_no ? `(${selectedVoter.house_no})` : ''}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <div className="bg-white/5 rounded-2xl p-3 space-y-1">
                                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Leaning</p>
                                <p className={`font-black text-sm ${LEANING_CONFIG[selectedVoter.voter_leaning]?.text || 'text-slate-300'}`}>{selectedVoter.voter_leaning || 'NEUTRAL'}</p>
                            </div>
                            <div className="bg-white/5 rounded-2xl p-3 space-y-1">
                                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Phone</p>
                                <p className="font-bold text-sm text-white">{selectedVoter.phone_no || '—'}</p>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button onClick={() => setSelectedVoter(null)}
                                className="flex-1 py-4 rounded-2xl bg-white/5 font-black text-[10px] uppercase tracking-widest text-slate-400 hover:bg-white/10">
                                അടയ്ക്കുക
                            </button>
                            <button
                                onClick={() => { handleVoteToggle(selectedVoter, !selectedVoter.has_voted); setSelectedVoter(null); }}
                                disabled={!!updatingId}
                                className={`flex-[2] py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all disabled:opacity-50 ${selectedVoter.has_voted ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white shadow-[0_0_20px_rgba(16,185,129,0.4)]'}`}>
                                {selectedVoter.has_voted ? 'Unmark' : 'വോട്ട് ചെയ്തു ✓'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ══════ Mobile Bottom Bar ══════ */}
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-slate-900/90 backdrop-blur-xl border border-white/10 px-5 py-3 rounded-full shadow-2xl z-[1000] lg:hidden">
                <div className="text-center px-3 border-r border-white/10">
                    <div className="text-[8px] font-black text-slate-500 uppercase">Polling</div>
                    <div className="text-lg font-black">{stats ? pct(stats.voted, stats.total) : 0}%</div>
                </div>
                <div className="text-[9px] text-slate-400 leading-tight">
                    <span className="block font-black">Tap</span>
                    <span>= Details</span>
                </div>
                <div className="text-[9px] text-slate-400 leading-tight">
                    <span className="block font-black">Double tap</span>
                    <span>= Mark Voted</span>
                </div>
            </div>

        </div>
    );
};

export default ElectionDay;
