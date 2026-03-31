import React from 'react';

/**
 * V1/V2 Engine Toggle — allows switching between Standard (V1) and Optimized (V2) OCR engines.
 *
 * Props:
 *   engineVersion: 'v1' | 'v2'
 *   onToggle: (version) => void
 *   disabled: boolean — disable when processing is active
 */
const EngineToggle = ({ engineVersion, onToggle, disabled }) => {
    return (
        <div className="flex items-center gap-3">
            <span className="lux-tech-label !text-[9px] text-slate-400">ENGINE</span>
            <div className={`flex rounded-xl overflow-hidden border ${disabled ? 'opacity-40 pointer-events-none' : ''} ${engineVersion === 'v2' ? 'border-emerald-500/40' : 'border-white/10'}`}>
                <button
                    onClick={() => onToggle('v1')}
                    className={`px-4 py-2 text-[10px] font-bold uppercase tracking-widest transition-all ${
                        engineVersion === 'v1'
                            ? 'bg-white/10 text-white'
                            : 'bg-transparent text-slate-500 hover:text-slate-300'
                    }`}
                    style={{ fontFamily: '"Rajdhani", sans-serif' }}
                >
                    V1 Standard
                </button>
                <button
                    onClick={() => onToggle('v2')}
                    className={`px-4 py-2 text-[10px] font-bold uppercase tracking-widest transition-all ${
                        engineVersion === 'v2'
                            ? 'bg-emerald-600/30 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                            : 'bg-transparent text-slate-500 hover:text-slate-300'
                    }`}
                    style={{ fontFamily: '"Rajdhani", sans-serif' }}
                >
                    V2 Optimized
                </button>
            </div>
            {engineVersion === 'v2' && (
                <span className="text-[9px] text-emerald-400/60 tracking-wider">COST SAVING MODE</span>
            )}
        </div>
    );
};

export default EngineToggle;
