import React from 'react';

const TacticalGrid = ({ boothStats, onBoothClick }) => {
    return (
        <div className="bg-white/50 backdrop-blur-xl p-8 rounded-[40px] border border-white/20 shadow-2xl">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h3 className="text-xl font-black uppercase tracking-tight text-slate-800">Constituency Command Grid</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Real-time Booth Performance Heatmap</p>
                </div>
                <div className="flex gap-4">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-sm bg-blue-500"></div>
                        <span className="text-[9px] font-black uppercase text-slate-400">UDF Strong</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-sm bg-rose-500"></div>
                        <span className="text-[9px] font-black uppercase text-slate-400">LDF Strong</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-sm bg-slate-200"></div>
                        <span className="text-[9px] font-black uppercase text-slate-400">Low Intel</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-3">
                {boothStats.map((booth) => {
                    const dominantLeaning = booth.udf > booth.ldf ? 'UDF' : (booth.ldf > booth.udf ? 'LDF' : 'NULL');
                    const intensity = Math.min(Math.max((Math.abs(booth.udf - booth.ldf) / booth.total) * 10, 2), 9) * 10;

                    let bgColor = 'bg-slate-100';
                    let textColor = 'text-slate-400';
                    let borderColor = 'border-slate-200';

                    if (booth.coverage < 10) {
                        bgColor = 'bg-slate-50';
                        textColor = 'text-slate-300';
                    } else if (dominantLeaning === 'UDF') {
                        bgColor = `bg-blue-600`;
                        textColor = 'text-white';
                        borderColor = 'border-blue-400';
                    } else if (dominantLeaning === 'LDF') {
                        bgColor = `bg-rose-600`;
                        textColor = 'text-white';
                        borderColor = 'border-rose-400';
                    }

                    return (
                        <button
                            key={booth.id}
                            onClick={() => onBoothClick(booth)}
                            className={`group relative aspect-square rounded-2xl flex flex-col items-center justify-center transition-all hover:scale-110 hover:z-10 shadow-lg border-2 ${bgColor} ${borderColor} ${textColor}`}
                        >
                            <span className="text-[10px] font-black leading-none">{booth.number}</span>
                            <div className="absolute bottom-1 w-2/3 h-1 bg-black/10 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-white/40 transition-all duration-1000"
                                    style={{ width: `${booth.coverage}%` }}
                                ></div>
                            </div>

                            {/* Tooltip on hover */}
                            <div className="absolute bottom-full mb-2 hidden group-hover:block w-32 bg-slate-900 text-white p-2 rounded-xl text-[8px] z-50 pointer-events-none shadow-2xl">
                                <p className="font-black uppercase border-b border-white/10 pb-1 mb-1">{booth.name}</p>
                                <div className="space-y-1 font-bold">
                                    <div className="flex justify-between"><span>Voters:</span> <span>{booth.total}</span></div>
                                    <div className="flex justify-between text-blue-400"><span>UDF:</span> <span>{booth.udf}</span></div>
                                    <div className="flex justify-between text-rose-400"><span>LDF:</span> <span>{booth.ldf}</span></div>
                                    <div className="flex justify-between text-emerald-400"><span>Intel:</span> <span>{booth.coverage}%</span></div>
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default TacticalGrid;
