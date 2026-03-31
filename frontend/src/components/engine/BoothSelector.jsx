import React from 'react';

/**
 * Booth selector for booth agents with multiple assigned booths.
 * Only renders when the agent has 2+ booths.
 */
const BoothSelector = ({ userRole, userAssignments, allLocations, selectedBooth, onSelect }) => {
    if (userRole !== 'BOOTH_AGENT') return null;
    const boothIds = userAssignments?.booths || [];
    if (boothIds.length < 2) return null;

    // Resolve booth details from allLocations
    const resolvedBooths = boothIds.map(bid => {
        for (const c of (allLocations || [])) {
            for (const lb of c.local_bodies || []) {
                const found = lb.booths?.find(b => String(b.id) === String(bid));
                if (found) return { id: found.id, number: found.number, lbName: lb.name, constName: c.name, lbId: lb.id, constId: c.id };
            }
        }
        return { id: bid, number: bid, lbName: '', constName: '', lbId: '', constId: '' };
    });

    return (
        <div className="flex items-center gap-3 bg-white/5 p-2 rounded-2xl border border-white/5">
            <span className="text-[9px] font-black uppercase text-indigo-400 tracking-[0.2em] ml-3">Booth</span>
            <div className="flex gap-1">
                {resolvedBooths.map(b => (
                    <button
                        key={b.id}
                        onClick={() => onSelect(b)}
                        className={`px-4 py-2 rounded-xl text-[10px] font-black tracking-widest transition-all ${
                            String(selectedBooth) === String(b.id)
                                ? 'bg-indigo-500 text-white shadow-[0_0_20px_#6366f1]'
                                : 'text-slate-400 hover:text-white hover:bg-white/10'
                        }`}
                    >
                        BOOTH {b.number}
                    </button>
                ))}
            </div>
        </div>
    );
};

export default BoothSelector;
