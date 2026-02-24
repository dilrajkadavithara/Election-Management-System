import React, { useState } from 'react';
import api from '../../api';

const ChangePasswordModal = ({ isOpen, onClose }) => {
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        if (newPassword !== confirmPassword) {
            setError("New passwords do not match");
            return;
        }

        if (newPassword.length < 6) {
            setError("Password must be at least 6 characters");
            return;
        }

        setLoading(true);
        try {
            await api.changePassword(oldPassword, newPassword);
            setSuccess(true);
            setTimeout(() => {
                onClose();
                setSuccess(false);
                setOldPassword('');
                setNewPassword('');
                setConfirmPassword('');
            }, 2000);
        } catch (err) {
            setError(err.response?.data?.detail || "Failed to change password");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[2000] flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-[3rem] p-10 shadow-[0_40px_120px_rgba(0,0,0,0.4)] space-y-8 relative overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-500">

                {success ? (
                    <div className="text-center py-10 space-y-6">
                        <div className="text-6xl animate-bounce">✨</div>
                        <h2 className="text-2xl font-black text-emerald-600 uppercase tracking-tight">Security Updated</h2>
                        <p className="text-slate-500 text-sm font-bold">Your new access key is now active.</p>
                    </div>
                ) : (
                    <>
                        <div className="text-center space-y-2">
                            <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4">🔐</div>
                            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Change Access Key</h2>
                            <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">Security Protocol v2.1</p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div className="space-y-2">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Current Password</label>
                                <input
                                    type="password"
                                    required
                                    value={oldPassword}
                                    onChange={(e) => setOldPassword(e.target.value)}
                                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:border-indigo-500 focus:bg-white transition-all"
                                    placeholder="••••••••"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">New Password</label>
                                <input
                                    type="password"
                                    required
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:border-indigo-500 focus:bg-white transition-all"
                                    placeholder="••••••••"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Confirm New Password</label>
                                <input
                                    type="password"
                                    required
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:border-indigo-500 focus:bg-white transition-all"
                                    placeholder="••••••••"
                                />
                            </div>

                            {error && (
                                <div className="bg-rose-50 text-rose-600 p-4 rounded-xl text-[10px] font-black uppercase tracking-tight border border-rose-100">
                                    ⚠️ {error}
                                </div>
                            )}

                            <div className="flex gap-4 pt-4">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="flex-1 px-6 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest border-2 border-slate-100 text-slate-400 hover:bg-slate-50 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex-[2] bg-indigo-600 text-white px-6 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all disabled:opacity-50"
                                >
                                    {loading ? 'Processing...' : 'Update Password'}
                                </button>
                            </div>
                        </form>
                    </>
                )}
            </div>
        </div>
    );
};

export default ChangePasswordModal;
