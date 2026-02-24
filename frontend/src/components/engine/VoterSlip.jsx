import React from 'react';

const THEME_CONFIG = {
    'INC': { primary: '#1e40af', secondary: '#eff6ff', accent: '#6366f1', text: 'text-indigo-800' },
    'CPIM': { primary: '#DE0000', secondary: '#fff1f1', accent: '#DE0000', text: 'text-red-700' },
    'CPI': { primary: '#D40000', secondary: '#fff1f1', accent: '#D40000', text: 'text-red-800' },
    'IUML': { primary: '#006600', secondary: '#f0fdf4', accent: '#006600', text: 'text-emerald-800' },
    'KCM': { primary: '#FF6600', secondary: '#fff7ed', accent: '#ea580c', text: 'text-orange-700' },
    'KCJ': { primary: '#0050A0', secondary: '#f0f9ff', accent: '#0050A0', text: 'text-blue-800' },
    'RSP': { primary: '#ED1B24', secondary: '#fff1f2', accent: '#ED1B24', text: 'text-rose-700' }
};

const VoterSlip = ({ voterName, serialNo, epicNo, boothNo, pollingStation, party }) => {
    // Determine the theme based on party short_label or name
    const partyIdentifier = (party?.short_label || party?.name || '').toUpperCase();
    let theme = THEME_CONFIG['INC']; // Default

    if (partyIdentifier.includes('INC') || partyIdentifier.includes('CONGRESS')) theme = THEME_CONFIG['INC'];
    else if (partyIdentifier.includes('CPIM') || partyIdentifier.includes('CPM')) theme = THEME_CONFIG['CPIM'];
    else if (partyIdentifier.includes('CPI')) theme = THEME_CONFIG['CPI'];
    else if (partyIdentifier.includes('IUML') || partyIdentifier.includes('LEAGUE')) theme = THEME_CONFIG['IUML'];
    else if (partyIdentifier.includes('RSP')) theme = THEME_CONFIG['RSP'];
    else if (partyIdentifier.includes('KCM') || (partyIdentifier.includes('KERALA') && partyIdentifier.includes('M'))) theme = THEME_CONFIG['KCM'];
    else if (partyIdentifier.includes('KCJ') || (partyIdentifier.includes('KERALA') && partyIdentifier.includes('J'))) theme = THEME_CONFIG['KCJ'];

    // If no party selected, use a plain slate theme
    const isPlain = !party;
    const activeTheme = isPlain ? { primary: '#475569', secondary: '#f8fafc', accent: '#64748b', text: 'text-slate-600' } : theme;

    return (
        <div className="w-[102mm] h-[48mm] bg-white border border-slate-300 relative flex overflow-hidden shrink-0 print:border print:border-slate-500 font-sans" style={{ pageBreakInside: 'avoid' }}>

            {/* BRANDING STRIP (Top emphasis) */}
            {!isPlain && (
                <div className="absolute top-0 right-0 left-0 h-[2px]" style={{ backgroundColor: activeTheme.primary }}></div>
            )}

            {/* DETACHABLE SYMBOL SECTION (26mm) */}
            <div className="w-[26mm] flex-shrink-0 flex flex-col items-center justify-center relative py-2" style={{ backgroundColor: isPlain ? '#f8fafc' : activeTheme.secondary }}>
                <div className="w-[18mm] h-[18mm] bg-white rounded-lg border border-white/50 flex items-center justify-center p-1.5 mb-1 relative overflow-hidden shadow-sm">
                    {party?.symbol_image ? (
                        <img src={`/api/party-symbol/${party.symbol_image}`} className="w-full h-full object-contain" alt="symbol" />
                    ) : (
                        <div className="text-[10px] font-black text-slate-300 uppercase rotate-[-20deg]">NO LOGO</div>
                    )}
                </div>

                {/* Perforation guide */}
                <div className="absolute top-0 right-[-1px] bottom-0 w-[1px] border-r border-dashed border-slate-300 h-full"></div>

                <span className="text-[6.5px] font-black uppercase tracking-tighter mt-1 opacity-40" style={{ color: activeTheme.primary }}>Detach Section</span>
            </div>

            {/* MAIN SLIP DATA */}
            <div className="flex-1 flex flex-col bg-white overflow-hidden relative pr-4">

                {/* Background Watermark (Subtle symbol in background) */}
                {party?.symbol_image && (
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 opacity-[0.03] pointer-events-none select-none grayscale invert">
                        <img src={`/api/party-symbol/${party.symbol_image}`} className="w-full h-full object-contain" alt="" />
                    </div>
                )}

                {/* TOP BAR */}
                <div className="flex w-full h-11 border-b border-slate-200">
                    <div className="flex-[0.8] px-3 flex items-center justify-between border-r border-slate-200" style={{ backgroundColor: activeTheme.secondary }}>
                        <div className="flex flex-col">
                            <span className="text-[8px] font-black uppercase malayalam-font opacity-60" style={{ color: activeTheme.primary }}>ക്രമ നമ്പർ</span>
                            <span className="text-[6px] font-bold text-slate-400 -mt-1 uppercase">Serial No.</span>
                        </div>
                        <span className="text-3xl font-black leading-none" style={{ color: activeTheme.primary }}>{serialNo}</span>
                    </div>
                    <div className="flex-1 px-4 flex items-center justify-between">
                        <div className="flex flex-col">
                            <span className="text-[9px] font-black text-slate-500 uppercase malayalam-font opacity-60">ബൂത്ത്</span>
                            <span className="text-[6px] font-bold text-slate-400 -mt-1 uppercase">Booth</span>
                        </div>
                        <span className="text-2xl font-black text-slate-900 leading-none">{boothNo}</span>
                    </div>
                </div>

                {/* DATA AREA */}
                <div className="px-5 flex-grow flex flex-col pt-2 pb-1.5 overflow-hidden z-10">

                    {/* Name Row */}
                    <div className="flex flex-col mb-1 group">
                        <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="text-[7px] font-black uppercase malayalam-font" style={{ color: activeTheme.primary }}>വോട്ടറുടെ പേര് (Voter's Name)</span>
                            <div className="h-[0.5px] flex-1 opacity-10" style={{ backgroundColor: activeTheme.primary }}></div>
                        </div>
                        <h2 className="text-[14px] font-bold text-slate-900 malayalam-font leading-[1.15] line-clamp-1 uppercase tracking-tight">
                            {voterName}
                        </h2>
                    </div>

                    {/* Voter ID and Metadata Row */}
                    <div className="flex justify-between items-end mb-2">
                        <div className="flex flex-col">
                            <span className="text-[7px] font-black text-slate-400 uppercase malayalam-font leading-none mb-0.5">വോട്ടർ ഐഡി (Voter ID)</span>
                            <span className={`text-[11px] font-black font-mono tracking-widest ${activeTheme.text}`}>{epicNo}</span>
                        </div>
                        {!isPlain && (
                            <div className="flex items-center gap-1 px-2 py-1 rounded bg-slate-50 border border-slate-100 mb-0.5">
                                <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest leading-none">{party.name}</span>
                            </div>
                        )}
                    </div>

                    {/* Polling Station */}
                    <div className="mt-auto border-t border-slate-100 pt-1.5 flex flex-col">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-[7px] font-black text-white uppercase malayalam-font px-2 py-0.5 rounded shadow-sm" style={{ backgroundColor: activeTheme.primary }}>പോളിംഗ് സ്റ്റേഷൻ</span>
                            <span className="text-[6.5px] font-bold text-slate-400 uppercase tracking-wider">Polling Station</span>
                        </div>
                        <p className="text-[9px] font-black text-slate-800 malayalam-font leading-[1.2] line-clamp-2">
                            {pollingStation || "---"}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VoterSlip;
