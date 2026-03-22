import React from 'react';
import { useAppContext } from '../../context/AppContext';
import { PARTY_PRESETS, ADMIN_INPUT, ADMIN_SELECT } from '../../constants';

const PartyManager = () => {
    const {
        allParties,
        newPartyData, setNewPartyData,
        newPartyFile, setNewPartyFile,
        handleAddParty, handleSyncParties,
    } = useAppContext();

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="col-span-1 lg:col-span-5 space-y-6">

                {/* Sync Button */}
                <div className="lux-glass p-6 rounded-3xl border-emerald-500/20 bg-emerald-500/5 space-y-4">
                    <div>
                        <h2 className="text-base font-bold text-emerald-400">Sync Official Parties</h2>
                        <p className="text-xs text-slate-400 mt-1">Automatically loads INC, CPM, IUML, CPI, Kerala Congress, RSP branding into the system.</p>
                    </div>
                    <button onClick={handleSyncParties} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl font-bold text-sm transition-all">
                        Sync Party Data
                    </button>
                </div>

                {/* Add Custom Party */}
                <div className="lux-glass p-6 rounded-3xl border-white/5 space-y-4">
                    <div>
                        <h2 className="text-base font-bold text-white">Add Custom Party</h2>
                        <p className="text-xs text-slate-400 mt-1">Manually register a party with its logo and colors.</p>
                    </div>

                    <select
                        onChange={(e) => {
                            const p = PARTY_PRESETS.find(pr => pr.label === e.target.value);
                            if (p) setNewPartyData({ ...newPartyData, name: p.label.split(' (')[0], shortLabel: p.short, color: p.color, gradient: p.gradient });
                        }}
                        className={ADMIN_SELECT}
                    >
                        <option value="">Load from template...</option>
                        {PARTY_PRESETS.map(p => <option key={p.label} value={p.label} className="bg-slate-900">{p.label}</option>)}
                    </select>

                    <div className="grid grid-cols-2 gap-3">
                        <input type="text" placeholder="Party name" value={newPartyData.name} onChange={(e) => setNewPartyData({ ...newPartyData, name: e.target.value })} className={ADMIN_INPUT} />
                        <input type="text" placeholder="Short code (e.g. INC)" value={newPartyData.shortLabel} onChange={(e) => setNewPartyData({ ...newPartyData, shortLabel: e.target.value })} className={ADMIN_INPUT} />
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-xl">
                        <div>
                            <p className="text-xs text-slate-400 mb-1">Party Colour</p>
                            <div className="flex items-center gap-2">
                                <input type="color" value={newPartyData.color} onChange={(e) => setNewPartyData({ ...newPartyData, color: e.target.value })} className="w-10 h-8 bg-transparent border-none rounded cursor-pointer" />
                                <span className="text-xs font-mono text-slate-400">{newPartyData.color.toUpperCase()}</span>
                            </div>
                        </div>
                        <div className="flex-1">
                            <p className="text-xs text-slate-400 mb-1">Gradient (CSS)</p>
                            <input type="text" value={newPartyData.gradient} onChange={(e) => setNewPartyData({ ...newPartyData, gradient: e.target.value })} className="w-full bg-transparent text-xs font-mono text-indigo-400 outline-none" />
                        </div>
                    </div>

                    <div
                        onClick={() => document.getElementById('party-logo-input').click()}
                        className="border border-dashed border-white/15 p-6 rounded-2xl flex flex-col items-center gap-2 cursor-pointer hover:bg-white/5 transition-all"
                    >
                        <span className="text-2xl">{newPartyFile ? '✅' : '🖼️'}</span>
                        <span className="text-xs text-slate-400">{newPartyFile ? newPartyFile.name : 'Click to upload party logo (PNG)'}</span>
                        <input type="file" id="party-logo-input" className="hidden" accept="image/*" onChange={(e) => setNewPartyFile(e.target.files[0])} />
                    </div>

                    <button onClick={handleAddParty} className="w-full lux-btn-primary py-3 text-sm font-bold rounded-xl">
                        Add Party
                    </button>
                </div>
            </div>

            {/* Party List */}
            <div className="col-span-12 lg:col-span-7">
                <div className="lux-glass p-6 rounded-3xl border-white/5 space-y-4">
                    <h2 className="text-base font-bold text-white">Registered Parties</h2>
                    <div className="space-y-2">
                        {allParties.map(p => (
                            <div key={p.id} className="flex items-center gap-4 px-4 py-3 bg-white/5 border border-white/5 rounded-2xl">
                                <div className="w-10 h-10 rounded-xl overflow-hidden bg-white/10 shrink-0">
                                    {p.symbol_image && <img src={`/api/party-symbol/${p.symbol_image}`} alt={p.name} className="w-full h-full object-contain" />}
                                </div>
                                <div className="flex-1">
                                    <p className="font-semibold text-sm text-white">{p.name}</p>
                                    <p className="text-xs text-slate-500">{p.short_label}</p>
                                </div>
                                <div className="w-6 h-6 rounded-full shrink-0" style={{ backgroundColor: p.primary_color }} />
                            </div>
                        ))}
                        {allParties.length === 0 && (
                            <div className="text-center py-8 text-slate-500 text-sm">No parties registered. Click "Sync Party Data" to get started.</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PartyManager;
