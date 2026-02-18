import React from 'react';

const StrategicGrid = ({ boothStats, onBoothClick }) => {
    if (!boothStats) return null;

    return (
        <div className="v2-glass p-8 rounded-[2.5rem] relative">
            {/* Ambient background effect */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 blur-[100px] pointer-events-none"></div>
            <div className="v2-scanline absolute inset-0 opacity-10 pointer-events-none"></div>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10 relative z-10">
                <div>
                    <h3 className="text-2xl font-black text-white uppercase tracking-tight flex items-center gap-3">
                        <span className="w-2 h-8 bg-blue-500 rounded-full"></span>
                        Booth Status
                    </h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 ml-5">
                        Area Performance Overview
                    </p>
                </div>

                <div className="flex flex-wrap gap-6 bg-white/5 p-4 rounded-2xl border border-white/5">
                    <div className="flex items-center gap-3">
                        <div className="w-4 h-4 rounded-md bg-blue-500"></div>
                        <span className="text-[10px] font-black uppercase text-slate-300">Strong UDF</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-4 h-4 rounded-md bg-rose-500"></div>
                        <span className="text-[10px] font-black uppercase text-slate-300">Strong LDF</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-4 h-4 rounded-md bg-orange-500"></div>
                        <span className="text-[10px] font-black uppercase text-slate-300">NDA</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-4 h-4 rounded-md bg-slate-400"></div>
                        <span className="text-[10px] font-black uppercase text-slate-300">Neutral</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-3 relative z-10">
                {boothStats.map((booth, index) => {
                    const udf = Number(booth.udf) || 0;
                    const ldf = Number(booth.ldf) || 0;
                    const nda = Number(booth.nda) || 0;

                    let dominantLeaning = 'NULL';
                    if (udf > ldf && udf > nda) dominantLeaning = 'UDF';
                    else if (ldf > udf && ldf > nda) dominantLeaning = 'LDF';
                    else if (nda > udf && nda > ldf) dominantLeaning = 'NDA';

                    let baseColor = 'bg-slate-800/30';
                    let borderColor = 'border-white/5';

                    if (booth.coverage < 5) {
                        baseColor = 'bg-slate-900/20';
                        borderColor = 'border-transparent';
                    } else if (dominantLeaning === 'UDF') {
                        baseColor = 'bg-blue-600/80';
                        borderColor = 'border-blue-400/50';
                    } else if (dominantLeaning === 'LDF') {
                        baseColor = 'bg-rose-600/80';
                        borderColor = 'border-rose-400/50';
                    } else if (dominantLeaning === 'NDA') {
                        baseColor = 'bg-orange-600/80';
                        borderColor = 'border-orange-400/50';
                    }

                    // Tooltip position: if in top 2 rows (approx 24 items for 12-col grid), show below (top-full), otherwise above (bottom-full)
                    const showBelow = index < 24;

                    return (
                        <button
                            key={booth.id}
                            onClick={() => onBoothClick(booth)}
                            className={`group relative aspect-square rounded-xl flex flex-col items-center justify-center transition-all duration-300 hover:scale-110 hover:-translate-y-1 z-0 hover:z-[100] border-2 ${baseColor} ${borderColor}`}
                        >
                            <span className={`text-[11px] font-black transition-colors ${dominantLeaning !== 'NULL' ? 'text-white' : 'text-slate-500'}`}>
                                {booth.number}
                            </span>

                            {/* Coverage Bar */}
                            <div className="absolute bottom-2 w-1/2 h-[2px] bg-black/30 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-cyan-400"
                                    style={{ width: `${booth.coverage}%` }}
                                ></div>
                            </div>

                            {/* Data HUD on hover - High Contrast */}
                            <div className={`absolute ${showBelow ? 'top-full pt-3' : 'bottom-full pb-3'} hidden group-hover:block w-56 z-[200] cursor-default`}>
                                <div className="bg-white p-4 rounded-2xl text-[11px] shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-slate-200 pointer-events-auto">
                                    <div className="flex justify-between items-center border-b border-slate-100 pb-2 mb-2">
                                        <span className="font-black text-slate-800 uppercase">Booth {booth.number}</span>
                                        <span className="px-2 py-0.5 bg-slate-100 rounded-full text-[9px] text-slate-600 font-bold uppercase">
                                            Data Saved: {booth.coverage}%
                                        </span>
                                    </div>
                                    <div className="space-y-2 text-slate-600">
                                        <div className="flex justify-between font-bold"><span>Total Voters</span> <span className="text-slate-900">{Number(booth.total) || 0}</span></div>
                                        <div className="flex justify-between items-center text-blue-600 font-bold">
                                            <span>UDF Supporters</span>
                                            <span className="font-black">{Number(booth.udf) || 0}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-rose-600 font-bold">
                                            <span>LDF Supporters</span>
                                            <span className="font-black">{Number(booth.ldf) || 0}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-orange-600 font-bold">
                                            <span>NDA Supporters</span>
                                            <span className="font-black">{Number(booth.nda) || 0}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-slate-500 font-bold">
                                            <span>Neutral Voters</span>
                                            <span className="font-black text-slate-700">{Number(booth.neutral) || 0}</span>
                                        </div>
                                        <div className="flex justify-between text-slate-400 border-t border-slate-50 pt-2 mt-1">
                                            <span>Untagged / Others</span>
                                            <span className="font-bold text-slate-500">{(Number(booth.total) || 0) - (Number(booth.udf) || 0) - (Number(booth.ldf) || 0) - (Number(booth.nda) || 0) - (Number(booth.neutral) || 0)}</span>
                                        </div>
                                    </div>
                                    <div className="mt-4 text-center text-[9px] text-blue-600 font-black uppercase tracking-widest bg-blue-50 py-2.5 rounded-xl border border-blue-100 group-hover:bg-blue-600 group-hover:text-white transition-all">
                                        Click to View Details
                                    </div>
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default StrategicGrid;
