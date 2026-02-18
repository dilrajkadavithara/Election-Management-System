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
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 font-sans">
            <div className="w-full max-w-md space-y-8 animate-in">
                <div className="text-center text-white">
                    <span className="text-6xl">🗳️</span>
                    <h1 className="mt-6 text-4xl font-black uppercase tracking-tighter">Election Engine</h1>
                </div>
                <form className="bg-white p-10 rounded-3xl shadow-2xl space-y-6" onSubmit={handleLogin}>
                    {error && <div className="text-rose-600 font-bold">{error}</div>}
                    <input
                        type="text"
                        placeholder="Username"
                        required
                        value={loginUser}
                        onChange={(e) => setLoginUser(e.target.value)}
                        className="w-full p-4 bg-slate-100 rounded-2xl font-bold"
                    />
                    <input
                        type="password"
                        placeholder="Password"
                        required
                        value={loginPass}
                        onChange={(e) => setLoginPass(e.target.value)}
                        className="w-full p-4 bg-slate-100 rounded-2xl font-bold"
                    />
                    <div className="flex items-start gap-3 px-1 text-slate-500">
                        <input
                            type="checkbox"
                            checked={loginConsent}
                            onChange={(e) => setLoginConsent(e.target.checked)}
                            id="consent"
                            className="mt-1 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                        />
                        <label htmlFor="consent" className="text-xs font-semibold leading-relaxed">
                            I agree to the <a href="#" onClick={(e) => { e.preventDefault(); alert("View docs/PRIVACY_POLICY.md"); }} className="text-slate-900 underline">Privacy Policy</a> and <a href="#" onClick={(e) => { e.preventDefault(); alert("View docs/TERMS_OF_SERVICE.md"); }} className="text-slate-900 underline">Terms of Service</a>.
                            I understand that my access is monitored for audit purposes.
                        </label>
                    </div>
                    <button
                        type="submit"
                        disabled={loading || !loginConsent}
                        className="w-full bg-slate-900 disabled:bg-slate-300 text-white py-5 rounded-2xl font-black uppercase"
                    >
                        {loading ? "Wait..." : "Sign In"}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default LoginForm;
