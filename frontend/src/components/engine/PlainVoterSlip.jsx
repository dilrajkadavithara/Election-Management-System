import React from 'react';

const PlainVoterSlip = ({ voterName, serialNo, epicNo, boothNo, pollingStation }) => {
    return (
        <div
            className="bg-white border border-slate-200 shadow-lg relative flex flex-col overflow-hidden shrink-0 print:border print:shadow-none print:border-slate-300 font-sans"
            style={{ width: '100mm', height: '60mm', pageBreakInside: 'avoid' }}
        >
            {/* DARK HEADER — Serial + Booth */}
            <div className="flex justify-between items-center px-3 py-2" style={{ backgroundColor: '#0f172a' }}>
                <div className="flex flex-col">
                    <span className="text-[8px] font-bold uppercase tracking-widest text-white/70 malayalam-font">ക്രമ നമ്പർ</span>
                    <span className="text-[22px] font-black leading-none text-white">{serialNo}</span>
                </div>
                <div className="flex flex-col text-right">
                    <span className="text-[8px] font-bold uppercase tracking-widest text-white/70 malayalam-font">ബൂത്ത്</span>
                    <span className="text-[22px] font-black leading-none text-white">{String(boothNo).padStart(3, '0')}</span>
                </div>
            </div>

            {/* BODY */}
            <div className="flex-1 flex flex-col px-4 pt-2.5 pb-3 overflow-hidden">

                {/* VOTER NAME — centered */}
                <div className="flex-1 flex flex-col items-center justify-center text-center py-1">
                    <span className="text-[8px] font-bold uppercase tracking-wider text-slate-500 mb-1 malayalam-font">വോട്ടറുടെ പേര്</span>
                    <h1 className="text-[22px] font-black text-slate-900 malayalam-font leading-tight break-words max-w-full line-clamp-2">
                        {voterName}
                    </h1>
                </div>

                {/* INFO ROW — EPIC + Polling Station */}
                <div className="grid grid-cols-[1fr_2fr] gap-2.5 border-t border-slate-200 pt-2 items-start">
                    <div>
                        <span className="text-[7px] font-bold uppercase tracking-wider text-slate-500 malayalam-font">വോട്ടർ ഐഡി</span>
                        <div className="text-[13px] font-bold font-mono tracking-wide text-slate-700 mt-0.5">{epicNo}</div>
                    </div>
                    <div className="bg-slate-50 rounded px-2.5 py-1.5" style={{ minHeight: '38px' }}>
                        <span className="text-[7px] font-bold uppercase tracking-wider text-slate-500 malayalam-font">പോളിംഗ് സ്റ്റേഷൻ</span>
                        <p className="text-[10px] font-bold text-slate-700 malayalam-font leading-tight line-clamp-3 mt-0.5">
                            {pollingStation || '---'}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PlainVoterSlip;
