import React from 'react';

const EditProfileModal = ({
    editData,
    setEditData,
    setEditMode,
    saveCorrection,
    ocrBatch
}) => {
    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
            <div className="bg-white w-full max-w-2xl rounded-[40px] p-12 shadow-2xl space-y-6 overflow-y-auto max-h-[90vh]">
                <div className="flex justify-between items-center border-b pb-4">
                    <h2 className="text-3xl font-black uppercase text-slate-900">Edit Profile</h2>
                    {ocrBatch && editData.voter_id && <span className="text-[10px] font-black uppercase bg-indigo-50 text-indigo-600 px-4 py-1.5 rounded-full border border-indigo-100 animate-pulse">Smart Review Mode</span>}
                </div>

                {ocrBatch && editData.image_name && (
                    <div className="p-4 bg-slate-50 rounded-[32px] border-2 border-slate-100 flex flex-col items-center gap-4">
                        <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest leading-none">Original Scan Data</p>
                        <div className="w-full h-32 bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-inner flex items-center justify-center">
                            <img src={`/api/crop/${ocrBatch.id}/${editData.image_name}`} className="h-full object-contain" alt="voter crop" />
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-2 gap-6 text-left">
                    <div className="space-y-1 col-span-2">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-2">Full Name</label>
                        <input type="text" value={editData.full_name || ''} onChange={(e) => setEditData({ ...editData, full_name: e.target.value })}
                            className={`w-full p-3 bg-slate-50 border-2 rounded-2xl font-bold transition-all ${!editData.full_name || editData.full_name === 'N/A' ? 'border-rose-200 bg-rose-50/30' : 'border-slate-50'}`}
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-2">Relation Type</label>
                        <input type="text" placeholder="Father/Mother/Husband" value={editData.relation_type || ''} onChange={(e) => setEditData({ ...editData, relation_type: e.target.value })} className="w-full p-3 bg-slate-50 border-2 border-slate-50 rounded-2xl font-bold" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-2">Relation Name</label>
                        <input type="text" value={editData.relation_name || ''} onChange={(e) => setEditData({ ...editData, relation_name: e.target.value })}
                            className={`w-full p-3 bg-slate-50 border-2 rounded-2xl font-bold transition-all ${!editData.relation_name || editData.relation_name === 'N/A' ? 'border-rose-200 bg-rose-50/30' : 'border-slate-50'}`}
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-2">House No</label>
                        <input type="text" value={editData.house_no || ''} onChange={(e) => setEditData({ ...editData, house_no: e.target.value })} className="w-full p-3 bg-slate-50 border-2 border-slate-50 rounded-2xl font-bold font-mono" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-2">House Name</label>
                        <input type="text" value={editData.house_name || ''} onChange={(e) => setEditData({ ...editData, house_name: e.target.value })} className="w-full p-3 bg-slate-50 border-2 border-slate-50 rounded-2xl font-bold" />
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-2">EPIC ID</label>
                        <input type="text" value={editData.epic_id || ''} onChange={(e) => setEditData({ ...editData, epic_id: e.target.value })}
                            className={`w-full p-3 bg-slate-50 border-2 rounded-2xl font-bold font-mono transition-all ${!editData.epic_id || editData.epic_id === 'N/A' ? 'border-rose-200 bg-rose-50/30' : 'border-slate-50'}`}
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-2">Age</label>
                        <input type="number" value={editData.age || ''} onChange={(e) => setEditData({ ...editData, age: e.target.value })}
                            className={`w-full p-3 bg-slate-50 border-2 rounded-2xl font-bold transition-all ${!editData.age || editData.age === 'N/A' ? 'border-rose-200 bg-rose-50/30' : 'border-slate-50'}`}
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-2">Gender</label>
                        <select value={editData.gender || ''} onChange={(e) => setEditData({ ...editData, gender: e.target.value })} className="w-full p-3 bg-slate-50 border-2 border-slate-50 rounded-2xl font-bold uppercase text-xs">
                            <option value="MALE">Male</option>
                            <option value="FEMALE">Female</option>
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-2">Voter Leaning</label>
                        <select value={editData.voter_leaning || ''} onChange={(e) => setEditData({ ...editData, voter_leaning: e.target.value })} className="w-full p-3 bg-slate-50 border-2 border-slate-50 rounded-2xl font-bold uppercase text-xs">
                            <option value="">Unknown</option>
                            <option value="UDF">UDF</option>
                            <option value="LDF">LDF</option>
                            <option value="NDA">NDA</option>
                            <option value="NEUTRAL">Neutral</option>
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-2">Residence</label>
                        <select value={editData.current_location || ''} onChange={(e) => setEditData({ ...editData, current_location: e.target.value })} className="w-full p-3 bg-slate-50 border-2 border-slate-50 rounded-2xl font-bold uppercase text-xs">
                            <option value="LOCAL">Local</option>
                            <option value="OUTSIDE_DISTRICT">Outside District</option>
                            <option value="OUTSIDE_STATE">Outside State</option>
                            <option value="ABROAD">Abroad</option>
                        </select>
                    </div>
                    <div className="space-y-1 col-span-2">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-2">Phone Number</label>
                        <input type="text" value={editData.phone_no || ''} onChange={(e) => setEditData({ ...editData, phone_no: e.target.value })} className="w-full p-3 bg-slate-50 border-2 border-slate-50 rounded-2xl font-bold" placeholder="e.g. +91 9876543210" />
                    </div>
                </div>
                <div className="flex gap-4 pt-6">
                    <button onClick={() => setEditMode(false)} className="flex-1 font-black uppercase text-[10px] tracking-widest p-5 border-2 rounded-2xl hover:bg-slate-50 transition-all">Dismiss</button>
                    <button onClick={saveCorrection} className="flex-[2] bg-indigo-600 text-white p-5 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl hover:bg-indigo-700 transition-all active:scale-[0.98]">Confirm & Save ➔</button>
                </div>
            </div>
        </div>
    );
};

export default EditProfileModal;
