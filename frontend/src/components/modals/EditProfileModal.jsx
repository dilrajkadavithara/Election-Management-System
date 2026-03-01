import React from 'react';
import api from '../../api';

const EditProfileModal = ({
    editData,
    setEditData,
    setEditMode,
    saveCorrection,
    ocrBatch
}) => {
    // Large, accessible selection component for Booth Agents
    const ActionCard = ({ label, options, currentVal, onSelect, columns = 2 }) => (
        <div className="space-y-2 sm:space-y-4">
            <h3 className="text-[10px] sm:text-[11px] font-black uppercase text-slate-400 tracking-[0.2em] ml-1 sm:ml-2 leading-relaxed">{label}</h3>
            <div className={`grid grid-cols-${columns} gap-2 sm:gap-3`}>
                {options.map(opt => (
                    <button
                        key={opt.id}
                        onClick={() => {
                            // Toggle Logic: Unselect if already selected
                            if (currentVal === opt.id) {
                                onSelect('');
                            } else {
                                onSelect(opt.id);
                            }
                        }}
                        style={{ borderLeftColor: opt.color || 'transparent' }}
                        className={`p-3 sm:p-5 rounded-2xl sm:rounded-[2rem] border-2 transition-all duration-300 flex flex-col items-center justify-center gap-1 sm:gap-3 relative overflow-hidden group ${currentVal === opt.id
                            ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg shadow-indigo-100/50 scale-[1.02]'
                            : 'bg-slate-50 border-slate-100 text-slate-500 hover:border-indigo-200 hover:bg-white'
                            } ${opt.color ? 'border-l-[4px] sm:border-l-[6px]' : ''}`}
                    >
                        <span className={`text-xl sm:text-3xl transition-transform duration-500 ${currentVal === opt.id ? 'scale-110 rotate-3' : 'group-hover:scale-110'}`}>
                            {opt.icon}
                        </span>
                        <span className="text-[9px] sm:text-[12px] font-black uppercase tracking-tight leading-tight text-center">
                            {opt.label}
                        </span>
                        {currentVal === opt.id && (
                            <div className="absolute top-1 right-2 sm:top-3 sm:right-4 text-[7px] sm:text-[8px] animate-pulse">● LIVE</div>
                        )}
                    </button>
                ))}
            </div>
        </div>
    );

    const deleteRecord = async () => {
        if (!confirm("Delete this person from the system?")) return;
        try {
            await api.deleteVoterFromBatch(ocrBatch.id, editData.voter_id);
            setEditMode(false);
            if (saveCorrection) saveCorrection();
        } catch (e) { alert("Error: " + e.message); }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[200] flex items-center justify-center p-2 sm:p-4">
            <div className="bg-white w-full max-w-2xl rounded-3xl sm:rounded-[3.5rem] p-5 sm:p-14 shadow-[0_40px_120px_rgba(0,0,0,0.4)] space-y-6 sm:space-y-12 overflow-y-auto max-h-[98vh] custom-scrollbar relative animate-in fade-in slide-in-from-bottom-8 duration-500">

                {/* 1. Profile Identity */}
                <div className="text-center space-y-1 sm:space-y-3 relative">
                    <div className="mx-auto w-12 h-1 bg-slate-100 rounded-full mb-3 sm:mb-6" />
                    <p className="hidden sm:block text-[10px] font-black text-indigo-500 uppercase tracking-[0.5em] opacity-60">വിവര ശേഖരണം</p>
                    <h2 className="text-2xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight px-2 sm:px-4 break-words">
                        {editData.full_name || 'System Voter'}
                    </h2>
                    <div className="flex justify-center flex-wrap gap-2 pt-1 sm:pt-2">
                        <span className="text-[8px] sm:text-[9px] font-black bg-slate-100 text-slate-500 px-3 py-1 sm:px-5 sm:py-2 rounded-full uppercase tracking-tighter shadow-sm border border-slate-200/50">
                            {editData.gender === 'MALE' ? 'പുരുഷൻ' : editData.gender === 'FEMALE' ? 'സ്ത്രീ' : editData.gender || '??'}
                        </span>
                        <span className="text-[8px] sm:text-[9px] font-black bg-slate-100 text-slate-500 px-3 py-1 sm:px-5 sm:py-2 rounded-full uppercase tracking-tighter shadow-sm border border-slate-200/50">
                            {editData.age || 'UNK'} വയസ്സ്
                        </span>
                    </div>
                </div>

                <div className="space-y-4 sm:space-y-12">
                    {/* 2. Political Alignment (Aligned to LEANING_CHOICES) */}
                    <ActionCard
                        label="ആരെ പിന്തുണയ്ക്കുന്നു?"
                        currentVal={editData.voter_leaning}
                        onSelect={(id) => setEditData({ ...editData, voter_leaning: id })}
                        options={[
                            { id: 'UDF', label: 'യു.ഡി.എഫ്', icon: '🟦', color: '#2563eb' },
                            { id: 'LDF', label: 'എൽ.ഡി.എഫ്', icon: '🟥', color: '#dc2626' },
                            { id: 'NDA', label: 'എൻ.ഡി.എ', icon: '🟧', color: '#ea580c' },
                            { id: 'NEUTRAL', label: 'നിഷ്പക്ഷൻ', icon: '⬜', color: '#94a3b8' }
                        ]}
                    />

                    {/* 3. Physical Presence (Aligned to LOCATION_CHOICES) */}
                    <ActionCard
                        label="ഇപ്പോൾ എവിടെയുണ്ട്?"
                        currentVal={editData.current_location}
                        onSelect={(id) => setEditData({ ...editData, current_location: id })}
                        options={[
                            { id: 'LOCAL', label: 'നാട്ടിലുണ്ട്', icon: '🏠' },
                            { id: 'ABROAD', label: 'വിദേശത്ത്', icon: '✈️' },
                            { id: 'STATE', label: 'മറ്റൊരു സംസ്ഥാനത്ത്', icon: '🚆' },
                            { id: 'DISTRICT', label: 'മറ്റൊരു ജില്ലയിൽ', icon: '🚗' }
                        ]}
                    />

                    {/* 4. Voting Probability (Aligned to PROBABILITY_CHOICES) */}
                    <ActionCard
                        label="വോട്ട് ചെയ്യാൻ സാധ്യത എത്ര?"
                        currentVal={editData.voting_probability}
                        onSelect={(id) => setEditData({ ...editData, voting_probability: id })}
                        options={[
                            { id: 'CONFIRMED', label: 'ഉറപ്പായും വോട്ട് ചെയ്യും', icon: '🎯' },
                            { id: 'LIKELY', label: 'സാധ്യതയുണ്ട്', icon: '📈' },
                            { id: 'UNLIKELY', label: 'സാധ്യത കുറവാണ്', icon: '📉' },
                            { id: 'OUT_OF_STATION', label: 'വോട്ട് ചെയ്യാൻ എത്തില്ല', icon: '🚪' }
                        ]}
                    />

                    {/* 5. Mobile Connection */}
                    <div className="space-y-2 sm:space-y-4">
                        <label className="text-[10px] sm:text-[11px] font-black uppercase text-slate-400 tracking-[0.2em] ml-1 sm:ml-2">ഫോൺ നമ്പർ</label>
                        <div className="relative group">
                            <input
                                type="text"
                                value={editData.phone_no || ''}
                                placeholder="പത്ത് അക്ക ഫോൺ നമ്പർ"
                                onChange={(e) => setEditData({ ...editData, phone_no: e.target.value })}
                                className="w-full text-xl sm:text-3xl font-black bg-slate-50 border-2 border-slate-100 rounded-2xl sm:rounded-[2.5rem] p-4 sm:p-8 focus:border-indigo-500 focus:bg-white transition-all text-slate-900 outline-none tracking-[0.1em] placeholder:text-slate-200"
                            />
                            <div className="absolute right-4 sm:right-8 top-1/2 -translate-y-1/2 text-xl sm:text-3xl animate-bounce">📱</div>
                        </div>
                    </div>
                </div>

                {/* 6. Technical Footnote (Safe & Hidden) */}
                <details className="hidden sm:block group border-t border-slate-100 pt-8 opacity-40 hover:opacity-100 transition-opacity">
                    <summary className="text-[10px] font-black uppercase text-slate-400 cursor-pointer list-none flex items-center justify-center gap-3">
                        <span className="w-1.5 h-1.5 bg-slate-300 rounded-full" />
                        സിസ്റ്റം ഡാറ്റ റെഫറൻസ്
                        <span className="w-1.5 h-1.5 bg-slate-300 rounded-full" />
                    </summary>
                    <div className="grid grid-cols-2 gap-8 mt-8 text-left bg-slate-50 rounded-[2rem] p-6 border border-slate-100">
                        <div className="space-y-1">
                            <p className="text-[8px] font-black text-slate-400">വോട്ടർ ഐഡി (EPIC)</p>
                            <p className="text-sm font-bold font-mono tracking-tight text-slate-600">{editData.epic_id}</p>
                        </div>
                        <div className="space-y-1 text-right">
                            <p className="text-[8px] font-black text-slate-400 uppercase">വീട്ടുപേര് / നമ്പർ</p>
                            <p className="text-sm font-bold text-slate-600 uppercase tracking-tighter truncate">{editData.house_name} ({editData.house_no})</p>
                        </div>
                    </div>
                </details>

                {/* Submit & Cancel */}
                <div className="flex flex-row gap-2 sm:gap-5 pt-0 sm:pt-4">
                    <button
                        onClick={() => setEditMode(false)}
                        className="flex-1 p-3 sm:p-7 rounded-xl sm:rounded-[2.5rem] font-black uppercase text-[10px] sm:text-[11px] tracking-[0.2em] border-2 border-slate-100 text-slate-400 hover:bg-slate-50 transition-all active:scale-95 whitespace-nowrap"
                    >
                        റദ്ദാക്കുക
                    </button>
                    <button
                        onClick={saveCorrection}
                        className="flex-[2] p-3 sm:p-7 rounded-xl sm:rounded-[2.5rem] font-black uppercase text-[10px] sm:text-[11px] tracking-[0.1em] sm:tracking-[0.2em] bg-indigo-600 text-white shadow-[0_10px_30px_-5px_rgba(79,70,229,0.5)] sm:shadow-2xl sm:shadow-indigo-200 hover:bg-indigo-700 sm:hover:shadow-indigo-300 transition-all active:scale-95 relative overflow-hidden whitespace-nowrap"
                    >
                        <span className="relative z-10">സേവ് ചെയ്യുക ➔</span>
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full hover:translate-x-full transition-transform duration-1000" />
                    </button>
                </div>

                {/* Quick Deletion (Top-Right Trash) */}
                {ocrBatch && (
                    <button
                        onClick={deleteRecord}
                        className="absolute top-4 right-4 sm:top-10 sm:right-10 w-8 h-8 sm:w-12 sm:h-12 bg-rose-50 rounded-full flex items-center justify-center text-sm sm:text-xl hover:bg-rose-600 hover:text-white transition-all shadow-sm border border-rose-100"
                        title="ഡിലീറ്റ് ചെയ്യുക"
                    >
                        🗑️
                    </button>
                )}
            </div>
        </div>
    );
};

export default EditProfileModal;

