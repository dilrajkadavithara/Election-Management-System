import React, { useState, useEffect } from 'react';

const InstallPage = ({ onContinue }) => {
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [isInstalled, setIsInstalled] = useState(false);
    const [isIOS, setIsIOS] = useState(false);
    const [installing, setInstalling] = useState(false);
    const [installed, setInstalled] = useState(false);

    useEffect(() => {
        // Check if already installed
        if (window.matchMedia('(display-mode: standalone)').matches) {
            setIsInstalled(true);
            return;
        }

        // Detect iOS
        const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        setIsIOS(ios);

        // Listen for Chrome install prompt
        const handler = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
        };
        window.addEventListener('beforeinstallprompt', handler);

        // Listen for successful install
        window.addEventListener('appinstalled', () => {
            setInstalled(true);
            setDeferredPrompt(null);
        });

        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const handleInstall = async () => {
        if (!deferredPrompt) return;
        setInstalling(true);
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            setInstalled(true);
        }
        setInstalling(false);
        setDeferredPrompt(null);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-6 font-sans">
            <div className="w-full max-w-md space-y-8 text-center">

                {/* Logo */}
                <div className="space-y-4">
                    <div className="w-24 h-24 bg-indigo-600 rounded-3xl flex items-center justify-center text-5xl mx-auto shadow-[0_0_40px_rgba(99,102,241,0.4)]">
                        🛡️
                    </div>
                    <h1 className="text-4xl font-black text-white tracking-tight">IntelHub</h1>
                    <p className="text-slate-400 text-sm">Election Management System</p>
                </div>

                {/* State: Already installed */}
                {(isInstalled || installed) && (
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-3xl p-8 space-y-6">
                        <div className="text-5xl">✅</div>
                        <h2 className="text-xl font-black text-emerald-400">
                            {installed ? 'App Installed!' : 'Already Installed'}
                        </h2>
                        <p className="text-slate-400 text-sm">
                            {installed
                                ? 'IntelHub is now on your home screen. You can open it from there.'
                                : 'IntelHub is already on your home screen.'
                            }
                        </p>
                        <button
                            onClick={onContinue}
                            className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm rounded-2xl transition-all active:scale-95 shadow-lg shadow-emerald-500/20"
                        >
                            Open IntelHub
                        </button>
                    </div>
                )}

                {/* State: iOS — show manual instructions */}
                {!isInstalled && !installed && isIOS && (
                    <div className="bg-white/5 border border-white/10 rounded-3xl p-8 space-y-6">
                        <h2 className="text-xl font-black text-white">Install on iPhone</h2>
                        <div className="space-y-4 text-left">
                            <div className="flex items-start gap-4">
                                <span className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-white text-sm font-black flex-shrink-0">1</span>
                                <p className="text-slate-300 text-sm pt-1">
                                    Tap the <strong className="text-white">Share</strong> button <span className="text-indigo-400 text-lg">⬆️</span> at the bottom of Safari
                                </p>
                            </div>
                            <div className="flex items-start gap-4">
                                <span className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-white text-sm font-black flex-shrink-0">2</span>
                                <p className="text-slate-300 text-sm pt-1">
                                    Scroll down and tap <strong className="text-white">"Add to Home Screen"</strong>
                                </p>
                            </div>
                            <div className="flex items-start gap-4">
                                <span className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-white text-sm font-black flex-shrink-0">3</span>
                                <p className="text-slate-300 text-sm pt-1">
                                    Tap <strong className="text-white">"Add"</strong> — the app appears on your home screen
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onContinue}
                            className="w-full py-4 bg-white/10 hover:bg-white/20 text-white font-black text-sm rounded-2xl transition-all active:scale-95 border border-white/10"
                        >
                            Skip — Continue to Login
                        </button>
                    </div>
                )}

                {/* State: Android/Chrome — install button ready */}
                {!isInstalled && !installed && !isIOS && deferredPrompt && (
                    <div className="bg-white/5 border border-white/10 rounded-3xl p-8 space-y-6">
                        <h2 className="text-xl font-black text-white">Install the App</h2>
                        <p className="text-slate-400 text-sm">
                            Add IntelHub to your home screen for quick access. Works offline too.
                        </p>
                        <button
                            onClick={handleInstall}
                            disabled={installing}
                            className="w-full py-5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-lg rounded-2xl transition-all active:scale-95 shadow-[0_10px_30px_rgba(99,102,241,0.4)] disabled:opacity-50"
                        >
                            {installing ? 'Installing...' : '📲 Install App'}
                        </button>
                        <button
                            onClick={onContinue}
                            className="w-full py-3 text-slate-500 hover:text-slate-300 font-bold text-xs transition-all"
                        >
                            Skip — Continue to Login
                        </button>
                    </div>
                )}

                {/* State: Waiting for browser install prompt (Android, prompt not yet fired) */}
                {!isInstalled && !installed && !isIOS && !deferredPrompt && (
                    <div className="bg-white/5 border border-white/10 rounded-3xl p-8 space-y-6">
                        <h2 className="text-xl font-black text-white">Install the App</h2>
                        <p className="text-slate-400 text-sm">
                            If you see an install bar at the top or bottom of your screen, tap <strong className="text-white">Install</strong>.
                        </p>
                        <p className="text-slate-500 text-xs">
                            Or tap <strong className="text-slate-300">⋮</strong> (menu) → <strong className="text-slate-300">"Install app"</strong> or <strong className="text-slate-300">"Add to Home Screen"</strong>
                        </p>
                        <button
                            onClick={onContinue}
                            className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm rounded-2xl transition-all active:scale-95 shadow-lg shadow-indigo-500/20"
                        >
                            Continue to Login
                        </button>
                    </div>
                )}

                {/* Footer */}
                <p className="text-slate-600 text-[10px] font-bold tracking-wider">
                    intelhub.live — Secure Election Intelligence
                </p>
            </div>
        </div>
    );
};

export default InstallPage;
