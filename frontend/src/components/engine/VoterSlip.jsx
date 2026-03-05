import React from 'react';

const THEME_CONFIG = {
    'INC': { primary: '#1e40af', secondary: '#eff6ff', accent: '#3b82f6', text: 'text-indigo-900', grad: 'from-[#1e40af] to-[#3b82f6]', shadow: 'shadow-indigo-500/30' },
    'CPIM': { primary: '#dc2626', secondary: '#fef2f2', accent: '#ef4444', text: 'text-red-900', grad: 'from-[#dc2626] to-[#ef4444]', shadow: 'shadow-red-500/30' },
    'CPI': { primary: '#b91c1c', secondary: '#fef2f2', accent: '#dc2626', text: 'text-red-900', grad: 'from-[#b91c1c] to-[#ef4444]', shadow: 'shadow-red-500/30' },
    'IUML': { primary: '#15803d', secondary: '#f0fdf4', accent: '#22c55e', text: 'text-green-900', grad: 'from-[#15803d] to-[#22c55e]', shadow: 'shadow-green-500/30' },
    'KCM': { primary: '#ea580c', secondary: '#fff7ed', accent: '#f97316', text: 'text-orange-900', grad: 'from-[#ea580c] to-[#f97316]', shadow: 'shadow-orange-500/30' },
    'KCJ': { primary: '#0369a1', secondary: '#f0f9ff', accent: '#0ea5e9', text: 'text-sky-900', grad: 'from-[#0369a1] to-[#0ea5e9]', shadow: 'shadow-sky-500/30' },
    'RSP': { primary: '#be123c', secondary: '#fff1f2', accent: '#f43f5e', text: 'text-rose-900', grad: 'from-[#be123c] to-[#f43f5e]', shadow: 'shadow-rose-500/30' }
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
    const activeTheme = isPlain ? { primary: '#475569', secondary: '#f8fafc', accent: '#64748b', text: 'text-slate-800', grad: 'from-[#475569] to-[#64748b]', shadow: 'shadow-slate-500/30' } : theme;

    return (
        <div className={`w-[102mm] h-[48mm] bg-white rounded-xl shadow-xl border border-slate-200 relative flex overflow-hidden shrink-0 print:border print:shadow-none print:border-slate-300 print:rounded-none font-sans`} style={{ pageBreakInside: 'avoid' }}>

            {/* BRANDING STRIP */}
            {!isPlain && (
                <div className={`absolute top-0 right-0 left-0 h-1 bg-gradient-to-r ${activeTheme.grad}`}></div>
            )}

            {/* DETACHABLE SYMBOL SECTION (26mm) */}
            <div className={`w-[26mm] flex-shrink-0 flex flex-col items-center justify-center relative py-2 overflow-hidden bg-gradient-to-b from-white to-${isPlain ? 'slate-50' : 'slate-50'}`} style={{ backgroundColor: activeTheme.secondary }}>
                {party?.symbol_image && (
                    <div className="absolute top-0 left-0 w-full h-full opacity-10" style={{ background: `radial-gradient(circle at center, ${activeTheme.primary} 0%, transparent 70%)` }}></div>
                )}
                <div className={`w-[18mm] h-[18mm] bg-white rounded-full border-2 border-white flex items-center justify-center p-2 mb-1 relative overflow-hidden shadow-lg ${activeTheme.shadow} z-10`}>
                    {party?.symbol_image ? (
                        <img src={`/api/party-symbol/${party.symbol_image}`} className="w-full h-full object-contain mix-blend-multiply" alt="symbol" />
                    ) : (
                        <div className="text-[10px] font-black text-slate-300 uppercase rotate-[-20deg]">LOG</div>
                    )}
                </div>

                {/* Perforation guide */}
                <div className="absolute top-0 right-[-1px] bottom-0 w-[2px] border-r-2 border-dashed border-slate-300 h-full opacity-50 z-20"></div>

                <span className="text-[6.5px] font-black uppercase tracking-widest mt-1 opacity-70 z-10" style={{ color: activeTheme.primary }}>മുറിച്ചു മാറ്റുക</span>
            </div>

            {/* MAIN SLIP DATA */}
            <div className="flex-1 flex flex-col bg-white overflow-hidden relative">

                {/* Subtle Geometric Background */}
                <div className="absolute top-[-50%] right-[-10%] w-[120px] h-[120px] rounded-full opacity-[0.03] blur-xl pointer-events-none" style={{ backgroundColor: activeTheme.primary }}></div>


                {/* HEADER ROW */}
                <div className="flex w-full mt-1.5 px-3">
                    <div className={`flex items-center justify-between px-3 py-1.5 rounded-l-lg border-y border-l bg-gradient-to-r ${activeTheme.grad} border-transparent flex-[0.7] text-white shadow-inner`}>
                        <span className="text-[8px] font-black uppercase malayalam-font opacity-90">ക്രമ നമ്പർ</span>
                        <span className="text-2xl font-black leading-none bg-white/20 px-2 py-0.5 rounded-md drop-shadow-sm">{serialNo}</span>
                    </div>
                    <div className="flex items-center justify-between px-3 py-1.5 rounded-r-lg border border-slate-200 bg-slate-50 flex-1">
                        <span className="text-[8px] font-black uppercase malayalam-font text-slate-500">ബൂത്ത്</span>
                        <span className="text-xl font-black leading-none text-slate-800">{boothNo}</span>
                    </div>
                </div>

                {/* DATA AREA */}
                <div className="px-4 flex-grow flex flex-col mt-2.5 pb-5 z-10">

                    {/* Name Row */}
                    <div className="flex flex-col mb-3 relative">
                        <span className="text-[6.5px] font-black uppercase malayalam-font mb-0.5 tracking-wider" style={{ color: activeTheme.primary }}>വോട്ടറുടെ പേര്</span>
                        <h2 className="text-[16px] font-black text-slate-900 malayalam-font leading-normal pb-1 line-clamp-1 uppercase tracking-tight drop-shadow-sm">
                            {voterName}
                        </h2>
                    </div>

                    {/* Voter ID and Metadata Row */}
                    <div className="flex justify-between items-center mb-auto mt-1">
                        <div className="flex flex-col">
                            <span className="text-[6.5px] font-black text-slate-400 uppercase malayalam-font leading-none mb-1 tracking-wider">വോട്ടർ ഐഡി</span>
                            <div className="flex items-center">
                                <span className={`text-[12px] font-black font-mono tracking-widest px-2 py-0.5 rounded border bg-white shadow-sm ${activeTheme.text} border-slate-200`}>
                                    {epicNo}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Polling Station */}
                    <div className="border-t border-slate-100 pt-1.5 flex flex-col mt-2 mb-3">
                        <div className="flex items-center gap-1.5 mb-1">
                            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: activeTheme.accent }}></div>
                            <span className="text-[6.5px] font-black uppercase malayalam-font tracking-wider" style={{ color: activeTheme.primary }}>പോളിംഗ് സ്റ്റേഷൻ</span>
                        </div>
                        <p className="text-[8.5px] font-black text-slate-700 malayalam-font leading-[1.3] line-clamp-2">
                            {pollingStation || "---"}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VoterSlip;
