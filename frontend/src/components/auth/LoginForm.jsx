import React from 'react';

const LoginForm = ({
    loginUser,
    setLoginUser,
    loginPass,
    setLoginPass,
    loginConsent,
    setLoginConsent,
    handleLogin,
    loading,
    error
}) => {
    return (
        <div className="min-h-screen lux-mesh-bg flex items-center justify-center p-8 font-sans relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-transparent to-purple-500/10 animate-pulse" />
            <div className="w-full max-w-xl space-y-12 lux-animate-in relative z-10">
                <div className="text-center space-y-4">
                    <div className="w-24 h-24 bg-indigo-500/10 rounded-[2rem] border border-white/10 flex items-center justify-center text-5xl mx-auto shadow-2xl animate-float">🛡️</div>
                    <h1 className="text-7xl font-black uppercase tracking-tighter lux-text-gradient leading-none">Neural Access</h1>
                    <p className="text-slate-300 font-black uppercase tracking-[0.4em] text-[10px]">Secure Intelligence Core Uplink</p>
                </div>

                <div className="lux-glass !bg-white/5 border-white/10 p-16 rounded-[4rem] shadow-[0_0_100px_rgba(0,0,0,0.5)] space-y-10 group">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />

                    <form className="space-y-8 relative z-10" onSubmit={handleLogin}>
                        {error && (
                            <div className="bg-rose-500/10 border border-rose-500/20 p-5 rounded-2xl flex items-center gap-4 animate-shake">
                                <span className="text-rose-500 text-xl text-shadow-sm">⚠️</span>
                                <p className="text-rose-400 font-black uppercase text-[10px] tracking-widest">{error}</p>
                            </div>
                        )}

                        <div className="space-y-6">
                            <div className="relative group/field">
                                <label className="text-[9px] font-black text-slate-300 uppercase tracking-widest ml-1 italic group-focus-within/field:text-indigo-400 transition-colors">Identity Identification</label>
                                <input
                                    type="text"
                                    placeholder="ENTER_UID"
                                    required
                                    value={loginUser}
                                    onChange={(e) => setLoginUser(e.target.value)}
                                    className="w-full bg-slate-900/50 text-white border border-white/10 rounded-2xl px-8 py-5 text-sm font-black uppercase tracking-widest outline-none focus:border-indigo-500/50 transition-all placeholder-slate-800"
                                />
                                <div className="absolute right-6 top-12 text-slate-700">👤</div>
                            </div>

                            <div className="relative group/field">
                                <label className="text-[9px] font-black text-slate-300 uppercase tracking-widest ml-1 italic group-focus-within/field:text-indigo-400 transition-colors">Security Bypass</label>
                                <input
                                    type="password"
                                    placeholder="••••••••"
                                    required
                                    value={loginPass}
                                    onChange={(e) => setLoginPass(e.target.value)}
                                    className="w-full bg-slate-900/50 text-white border border-white/10 rounded-2xl px-8 py-5 text-sm font-black uppercase tracking-widest outline-none focus:border-indigo-500/50 transition-all placeholder-slate-800"
                                />
                                <div className="absolute right-6 top-12 text-slate-700">🔑</div>
                            </div>
                        </div>

                        <div className="flex items-start gap-4 px-2 group/consent">
                            <div className="relative flex items-center mt-1">
                                <input
                                    type="checkbox"
                                    checked={loginConsent}
                                    onChange={(e) => setLoginConsent(e.target.checked)}
                                    id="consent"
                                    className="peer h-6 w-6 rounded-lg bg-slate-900/80 border border-white/10 checked:bg-indigo-600 appearance-none transition-all cursor-pointer shadow-inner"
                                />
                                <span className="absolute left-1.5 text-white opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none text-xs">✓</span>
                            </div>
                            <label htmlFor="consent" className="text-[10px] font-semibold text-slate-400 leading-relaxed cursor-pointer group-hover/consent:text-slate-300 transition-colors">
                                I verify authorization protocol compliance under the <a href="#" className="text-indigo-400 underline italic">Neural Governance Framework</a>.
                                Access is cryptographically audited for strategic integrity.
                            </label>
                        </div>

                        <button
                            type="submit"
                            disabled={loading || !loginConsent}
                            className="w-full lux-btn-primary !py-8 text-[12px] tracking-[0.5em] shadow-[0_0_50px_rgba(99,102,241,0.3)] disabled:opacity-20 disabled:grayscale group/submit relative overflow-hidden active:scale-95"
                        >
                            <div className="absolute inset-0 bg-white/20 -translate-x-full group-hover/submit:translate-x-full transition-transform duration-1000 italic" />
                            {loading ? "SYNCHRONIZING..." : "INITIATE UPLINK"}
                        </button>
                    </form>
                </div>

                <p className="text-center text-[8px] font-bold text-slate-600 uppercase tracking-[0.8em] animate-pulse">Neural Intelligence Engine v4.2 // Secure Session</p>
            </div>
        </div>
    );
};

export default LoginForm;
