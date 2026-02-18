import React, { useMemo } from 'react';

const WinProbabilityRing = ({ stats }) => {
    // Logic: Win Prop = (Confirmed UDF + (Neutral * 0.35)) / Total
    const winProbability = useMemo(() => {
        if (!stats) return 0;
        const total = stats.total || 1;
        const confirmed = stats.sentiment?.UDF || 0;
        const neutral = stats.sentiment?.Neutral || 0;

        // Strategic weighting: 100% of confirmed + 35% of neutral
        const weighted = confirmed + (neutral * 0.35);
        return Math.min(Math.round((weighted / total) * 100), 100);
    }, [stats]);

    const circumference = 2 * Math.PI * 90;
    const strokeDashoffset = circumference - (winProbability / 100) * circumference;

    return (
        <div className="v2-glass aspect-square flex flex-col items-center justify-center p-10 rounded-full relative group">
            {/* Pulsing Outer Ring */}
            <div className="absolute inset-0 rounded-full border border-cyan-500/10 animate-pulse-slow"></div>

            {/* SVG Ring */}
            <div className="relative w-64 h-64">
                <svg className="w-full h-full transform -rotate-90">
                    {/* Background Track */}
                    <circle
                        cx="128"
                        cy="128"
                        r="90"
                        stroke="rgba(255,255,255,0.05)"
                        strokeWidth="12"
                        fill="transparent"
                    />
                    {/* Glowing Progress Track */}
                    <circle
                        cx="128"
                        cy="128"
                        r="90"
                        stroke="#00F3FF"
                        strokeWidth="12"
                        fill="transparent"
                        strokeDasharray={circumference}
                        style={{
                            strokeDashoffset,
                            transition: 'stroke-dashoffset 2s ease-in-out',
                            filter: 'drop-shadow(0 0 10px rgba(0, 243, 255, 0.6))'
                        }}
                        strokeLinecap="round"
                    />
                </svg>

                {/* Central Data */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                        Chance of Winning
                    </span>
                    <div className="flex items-baseline gap-1">
                        <span className="text-7xl font-black text-white tracking-tighter">
                            {winProbability}
                        </span>
                        <span className="text-2xl font-black text-cyan-400">%</span>
                    </div>
                    <div className="mt-4 px-4 py-1.5 bg-emerald-500/10 rounded-full border border-emerald-500/20">
                        <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">
                            Real-time Probability
                        </span>
                    </div>
                </div>
            </div>

            {/* Subtext info */}
            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-max bg-white border border-slate-200 px-6 py-3 rounded-2xl shadow-2xl scale-0 group-hover:scale-100 transition-transform duration-300 z-[300]">
                <p className="text-[10px] font-bold text-slate-500 text-center leading-relaxed">
                    Weighted calculation based on <br />
                    <span className="text-slate-900 font-black">Confirmed Supporters (100%)</span> <br />
                    <span className="text-slate-500 font-black">Neutral Voters (35%)</span>
                </p>
            </div>
        </div>
    );
};

export default WinProbabilityRing;
