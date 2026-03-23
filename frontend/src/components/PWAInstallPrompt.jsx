import React, { useState, useEffect } from 'react';

const PWAInstallPrompt = () => {
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [showPrompt, setShowPrompt] = useState(false);
    const [isIOS, setIsIOS] = useState(false);

    useEffect(() => {
        // Don't show if already installed as PWA
        if (window.matchMedia('(display-mode: standalone)').matches) return;
        // Don't show if already dismissed
        if (localStorage.getItem('pwa-dismissed')) return;
        // Mobile only — skip on desktop/laptop (screen wider than 1024px)
        if (window.innerWidth > 1024) return;

        // Detect iOS (no beforeinstallprompt on iOS)
        const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        setIsIOS(ios);

        if (ios) {
            // Show iOS instructions after a short delay
            const timer = setTimeout(() => setShowPrompt(true), 2000);
            return () => clearTimeout(timer);
        }

        // Android/Chrome: listen for the install prompt
        const handler = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
            setShowPrompt(true);
        };
        window.addEventListener('beforeinstallprompt', handler);
        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const handleInstall = async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            setShowPrompt(false);
        }
        setDeferredPrompt(null);
    };

    const handleDismiss = () => {
        setShowPrompt(false);
        localStorage.setItem('pwa-dismissed', '1');
    };

    if (!showPrompt) return null;

    return (
        <div className="fixed bottom-4 left-4 right-4 z-[2000] animate-in fade-in slide-in-from-bottom-4 duration-500 lg:left-auto lg:right-6 lg:bottom-6 lg:w-96">
            <div className="bg-slate-900 border border-indigo-500/30 rounded-2xl p-5 shadow-[0_20px_60px_rgba(0,0,0,0.5)] backdrop-blur-xl">
                <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0">
                        <span className="text-2xl">📲</span>
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="text-white font-black text-sm">Install IntelHub</h3>
                        {isIOS ? (
                            <p className="text-slate-400 text-xs mt-1 leading-relaxed">
                                Tap the <strong className="text-white">Share</strong> button (⬆️) then <strong className="text-white">"Add to Home Screen"</strong>
                            </p>
                        ) : (
                            <p className="text-slate-400 text-xs mt-1 leading-relaxed">
                                Install as an app for quick access from your home screen
                            </p>
                        )}
                    </div>
                </div>
                <div className="flex gap-3 mt-4">
                    <button
                        onClick={handleDismiss}
                        className="flex-1 py-2.5 rounded-xl text-xs font-bold text-slate-500 border border-slate-700 hover:bg-slate-800 transition-all active:scale-95"
                    >
                        Not now
                    </button>
                    {!isIOS && (
                        <button
                            onClick={handleInstall}
                            className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-all active:scale-95 shadow-lg shadow-indigo-500/20"
                        >
                            Install
                        </button>
                    )}
                    {isIOS && (
                        <button
                            onClick={handleDismiss}
                            className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-all active:scale-95 shadow-lg shadow-indigo-500/20"
                        >
                            Got it
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PWAInstallPrompt;
