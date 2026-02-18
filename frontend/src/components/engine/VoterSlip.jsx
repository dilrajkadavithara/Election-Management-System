import React from 'react';

const VoterSlip = ({ voterName, serialNo, epicNo, boothNo, pollingStation, party }) => (
    <div className="w-[102mm] h-[48mm] bg-white border border-slate-400 relative flex overflow-hidden shrink-0 print:border print:border-slate-500 font-sans" style={{ pageBreakInside: 'avoid' }}>

        {/* DETACHABLE SYMBOL SECTION (26mm - optimized) */}
        <div className="w-[26mm] flex-shrink-0 flex flex-col items-center justify-center bg-slate-50 border-r-[1.5px] border-dashed border-slate-300 relative py-2">
            <div className="w-16 h-16 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center justify-center p-2 mb-1">
                {party?.symbol_image ? (
                    <img src={`/api/party-symbol/${party.symbol_image}`} className="w-full h-full object-contain" alt="symbol" />
                ) : (
                    <img src="/symbol.webp" className="w-full h-full object-contain mix-blend-multiply" alt="hand symbol" />
                )}
            </div>
            <div className="absolute top-0 right-[-1px] bottom-0 flex flex-col justify-around py-2 pointer-events-none opacity-20">
                {[...Array(6)].map((_, i) => <div key={i} className="text-[6px]">✂️</div>)}
            </div>
            <span className="text-[6px] font-black text-slate-400 uppercase tracking-tighter mt-1">Detach</span>
        </div>

        {/* MAIN SLIP DATA (76mm - expanded for long names) */}
        <div className="flex-1 flex flex-col bg-white overflow-hidden relative pr-4">

            {/* TOP BAR - IMPROVED READABILITY */}
            <div className="flex w-full h-10 border-b border-slate-300">
                <div className="flex-[0.8] bg-white px-3 flex items-center justify-between border-r border-slate-200">
                    <span className="text-[9px] font-black text-slate-500 uppercase malayalam-font">ക്രമ നമ്പർ</span>
                    <span className="text-2xl font-black text-slate-900 leading-none">{serialNo}</span>
                </div>
                <div className="flex-1 bg-white px-4 flex items-center justify-between">
                    <span className="text-[10px] font-black text-slate-400 uppercase malayalam-font">ബൂത്ത്</span>
                    <span className="text-xl font-black text-slate-900 leading-none">{boothNo}</span>
                </div>
            </div>

            {/* DATA AREA - OPTIMIZED FOR FULL NAME AND POLLING STATION VISIBILITY */}
            <div className="px-5 flex-grow flex flex-col pt-1.5 pb-1 overflow-hidden">

                {/* Name Row - Using 2 lines to prevent pruning */}
                <div className="flex flex-col mb-0.5">
                    <span className="text-[6.5px] font-black text-slate-400 uppercase malayalam-font leading-none mb-0.5">പേര് (Name)</span>
                    <h2 className="text-[13px] font-bold text-slate-900 malayalam-font leading-[1.15] line-clamp-2">
                        {voterName}
                    </h2>
                </div>

                {/* Voter ID Row - Tightened further */}
                <div className="flex flex-col mb-1">
                    <span className="text-[6.5px] font-black text-slate-400 uppercase malayalam-font leading-none mb-0.5">വോട്ടർ ഐഡി (Voter ID)</span>
                    <span className="text-[10px] font-black text-indigo-700 font-mono tracking-wider">{epicNo}</span>
                </div>

                {/* Polling Station - Maximized space for zero truncation */}
                <div className="mt-auto pt-1 border-t border-slate-100 flex-grow flex flex-col justify-center">
                    <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[7.5px] font-black text-slate-900 uppercase malayalam-font border-[1px] border-slate-800 px-1.5 py-0.5 rounded-full">പോളിംഗ് സ്റ്റേഷൻ</span>
                        <div className="h-[0.5px] flex-1 bg-slate-200"></div>
                    </div>
                    <p className="text-[8.5px] font-bold text-slate-800 malayalam-font leading-[1.25] line-clamp-3">
                        {pollingStation || "---"}
                    </p>
                </div>
            </div>
        </div>
    </div>
);

export default VoterSlip;
