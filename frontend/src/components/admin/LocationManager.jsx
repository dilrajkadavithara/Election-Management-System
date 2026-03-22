import React from 'react';
import { useAppContext } from '../../context/AppContext';
import { ADMIN_INPUT, ADMIN_SELECT } from '../../constants';

const LocationManager = () => {
    const {
        allLocations,
        newLocData, setNewLocData,
        editingLoc, setEditingLoc,
        handleAddLocation, handleUpdateLocation,
    } = useAppContext();

    const startEditLoc = (type, item) => {
        setEditingLoc({ type, id: item.id });
        if (type === 'const') {
            setNewLocData({ type: 'const', name: item.name });
        } else if (type === 'lb') {
            setNewLocData({ type: 'lb', name: item.name, parentId: item.constituency_id || '', lbType: item.body_type });
        } else if (type === 'booth') {
            setNewLocData({
                type: 'booth',
                boothNum: item.number,
                psName: item.ps_name,
                psNo: item.ps_no,
                grandParentId: item.constituency_id || '',
                parentId: item.local_body_id || ''
            });
        }
    };

    const cancelLocEdit = () => {
        setEditingLoc(null);
        setNewLocData({ type: 'const', name: '', parentId: '', lbType: 'PANCHAYAT', boothNum: '', psName: '', psNo: '' });
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="col-span-1 lg:col-span-5">
                <div className="lux-glass p-8 rounded-3xl border-white/5 space-y-6">
                    <div>
                        <h2 className="text-base font-bold text-white">{editingLoc ? `✏️ Edit ${editingLoc.type === 'const' ? 'Constituency' : editingLoc.type === 'lb' ? 'Local Body' : 'Booth'}` : '➕ Add Location'}</h2>
                        <p className="text-xs text-slate-400 mt-0.5">{editingLoc ? 'Update the details below.' : 'Add a constituency, local body, or polling booth.'}</p>
                    </div>

                    {/* Type Selector */}
                    {!editingLoc && (
                        <div className="flex gap-2 bg-black/30 p-1 rounded-xl border border-white/5">
                            {[
                                { val: 'const', label: 'Constituency' },
                                { val: 'lb', label: 'Local Body' },
                                { val: 'booth', label: 'Booth' },
                            ].map(t => (
                                <button
                                    key={t.val}
                                    onClick={() => setNewLocData({ ...newLocData, type: t.val })}
                                    className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${newLocData.type === t.val ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                                >
                                    {t.label}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Constituency */}
                    {newLocData.type === 'const' && (
                        <input type="text" placeholder="Constituency name" value={newLocData.name} onChange={(e) => setNewLocData({ ...newLocData, name: e.target.value })} className={ADMIN_INPUT} />
                    )}

                    {/* Local Body */}
                    {newLocData.type === 'lb' && (
                        <div className="space-y-3">
                            <select value={newLocData.parentId} onChange={(e) => setNewLocData({ ...newLocData, parentId: e.target.value })} className={ADMIN_SELECT}>
                                <option value="">Select constituency</option>
                                {allLocations.map(c => <option key={c.id} value={c.id} className="bg-slate-900">{c.name}</option>)}
                            </select>
                            <input type="text" placeholder="Local body name" value={newLocData.name} onChange={(e) => setNewLocData({ ...newLocData, name: e.target.value })} className={ADMIN_INPUT} />
                        </div>
                    )}

                    {/* Booth */}
                    {newLocData.type === 'booth' && (
                        <div className="space-y-3">
                            <select value={newLocData.grandParentId} onChange={(e) => setNewLocData({ ...newLocData, grandParentId: e.target.value, parentId: '' })} className={ADMIN_SELECT}>
                                <option value="">Select constituency</option>
                                {allLocations.map(c => <option key={c.id} value={c.id} className="bg-slate-900">{c.name}</option>)}
                            </select>
                            <select value={newLocData.parentId} onChange={(e) => setNewLocData({ ...newLocData, parentId: e.target.value })} className={ADMIN_SELECT} disabled={!newLocData.grandParentId}>
                                <option value="">Select local body</option>
                                {allLocations.find(c => String(c.id) === String(newLocData.grandParentId))?.local_bodies.map(lb => (
                                    <option key={lb.id} value={lb.id} className="bg-slate-900">{lb.name}</option>
                                ))}
                            </select>
                            <input type="text" placeholder="Booth number" value={newLocData.boothNum} onChange={(e) => setNewLocData({ ...newLocData, boothNum: e.target.value })} className={ADMIN_INPUT} />
                            <div className="grid grid-cols-2 gap-3">
                                <input type="text" placeholder="Polling station no." value={newLocData.psNo} onChange={(e) => setNewLocData({ ...newLocData, psNo: e.target.value })} className={ADMIN_INPUT} />
                                <input type="text" placeholder="Polling station name" value={newLocData.psName} onChange={(e) => setNewLocData({ ...newLocData, psName: e.target.value })} className={ADMIN_INPUT} />
                            </div>
                        </div>
                    )}

                    <div className="flex gap-3">
                        {editingLoc && (
                            <button onClick={cancelLocEdit} className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 text-sm font-semibold hover:bg-white/10 transition-all">
                                Cancel
                            </button>
                        )}
                        <button onClick={editingLoc ? handleUpdateLocation : handleAddLocation} className="flex-[2] lux-btn-primary py-3 text-sm font-bold rounded-xl">
                            {editingLoc ? 'Save Changes' : `Add ${newLocData.type === 'const' ? 'Constituency' : newLocData.type === 'lb' ? 'Local Body' : 'Booth'}`}
                        </button>
                    </div>
                </div>
            </div>

            {/* Location Summary */}
            <div className="col-span-12 lg:col-span-7">
                <div className="lux-glass p-6 rounded-3xl border-white/5 space-y-4">
                    <h2 className="text-base font-bold text-white">Location Overview</h2>
                    <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                        {allLocations.map(c => (
                            <div key={c.id} className="bg-white/5 border border-white/5 rounded-2xl p-4">
                                <div className="flex justify-between items-center mb-2">
                                    <p className="font-bold text-sm text-white">🏛️ {c.name}</p>
                                    <button onClick={() => startEditLoc('const', c)} className="text-[10px] text-indigo-400 hover:text-indigo-300">Edit</button>
                                </div>
                                {c.local_bodies.map(lb => (
                                    <div key={lb.id} className="ml-4 mb-2">
                                        <div className="flex justify-between items-center mb-1">
                                            <p className="text-xs font-semibold text-slate-300">📍 {lb.name} <span className="text-slate-600">({lb.booths?.length || 0} booths)</span></p>
                                            <button onClick={() => startEditLoc('lb', { ...lb, constituency_id: c.id })} className="text-[10px] text-indigo-400 hover:text-indigo-300">Edit</button>
                                        </div>
                                        <div className="flex flex-wrap gap-1 ml-3">
                                            {lb.booths?.map(b => (
                                                <span
                                                    key={b.id}
                                                    onClick={() => startEditLoc('booth', { ...b, constituency_id: c.id, local_body_id: lb.id })}
                                                    className="text-[10px] bg-white/5 border border-white/8 rounded-md px-2 py-0.5 text-slate-400 hover:bg-white/10 hover:border-indigo-500/30 cursor-pointer"
                                                >
                                                    Booth {b.number}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LocationManager;
