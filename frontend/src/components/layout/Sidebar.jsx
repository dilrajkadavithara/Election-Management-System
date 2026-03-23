import React, { useState } from 'react';

const Sidebar = ({ view, setView, userRole, username, handleLogout, setShowChangePassword }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="lg:hidden fixed top-4 left-4 z-[1002] w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-[0_0_20px_rgba(99,102,241,0.5)] transition-all hover:scale-105"
            >
                <span className="text-xl">{isOpen ? '✕' : '☰'}</span>
            </button>

            {/* Backdrop for mobile */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[999] lg:hidden"
                    onClick={() => setIsOpen(false)}
                />
            )}

            <aside className={`fixed top-0 left-0 h-full lg:h-auto lg:left-6 lg:top-6 lg:bottom-6 w-[300px] sm:w-[360px] lux-glass rounded-none lg:rounded-[3rem] p-6 sm:p-10 flex flex-col z-[1001] border-r lg:border border-white/5 shadow-[0_0_80px_rgba(0,0,0,0.5)] overflow-y-auto custom-scrollbar transition-transform duration-500 ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
                <div className="flex items-center gap-4 sm:gap-5 mt-16 lg:mt-0 mb-10 sm:mb-16 px-1 sm:px-2 flex-shrink-0">
                    <div className="w-14 h-14 bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 rounded-[1.25rem] flex items-center justify-center text-3xl shadow-[0_10px_30px_rgba(99,102,241,0.3)] animate-pulse">
                        🗳️
                    </div>
                    <div>
                        <h1 className="font-black uppercase text-[10px] tracking-[0.3em] lux-text-gradient opacity-90">Election Manager</h1>
                        <div className="flex flex-col gap-2 mt-2">
                            <p className="text-[12px] text-white font-black uppercase tracking-widest">{username}</p>
                            <button
                                onClick={() => {
                                    setShowChangePassword(true);
                                    setIsOpen(false);
                                }}
                                className="w-fit flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 transition-all border border-white/5 group"
                            >
                                <span className="text-[10px] group-hover:scale-110 transition-transform">🔐</span>
                                <span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest">Update Security</span>
                            </button>
                        </div>
                    </div>
                </div>

                <nav className="space-y-4 flex-grow">
                    {[
                        { id: 'dashboard', label: 'Dashboard', icon: '📊' },
                        ...(userRole !== 'BOOTH_AGENT' ? [{ id: 'warroom', label: 'War room', icon: '⚔️' }] : []),
                        ...(userRole !== 'BOOTH_AGENT' ? [{ id: 'engine', label: 'Upload Voter List', icon: '⚡' }] : []),
                        { id: 'voters', label: 'Voter List', icon: '👥' },
                        { id: 'familyheads', label: 'Influencer Segment', icon: '👑' },
                        { id: 'comm', label: 'Send Messages', icon: '💬' },
                        ...(['SUPERUSER', 'MANAGER', 'CONSTITUENCY_ADMIN'].includes(userRole) ? [{ id: 'design', label: 'Voter Slips', icon: '🎨' }] : []),
                        { id: 'electionday', label: 'Election Day', icon: '🗳️' },
                        ...(['SUPERUSER', 'MANAGER', 'CONSTITUENCY_ADMIN', 'LOCAL_BODY_HEAD', 'ZONE_COMMANDER'].includes(userRole) ? [{ id: 'admin', label: 'User Settings', icon: '⚙️' }] : [])
                    ].map(item => (
                        <button
                            key={item.id}
                            onClick={() => {
                                setView(item.id);
                                setIsOpen(false);
                            }}
                            className={`w-full flex items-center gap-5 px-8 py-5 rounded-[1.5rem] transition-all duration-700 group relative overflow-hidden ${view === item.id ? 'bg-indigo-500/10 text-white lux-neon-border' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                        >
                            <span className={`text-2xl transition-all duration-700 ${view === item.id ? 'scale-125 rotate-6' : 'grayscale group-hover:grayscale-0 group-hover:scale-110 opacity-40 group-hover:opacity-100'}`}>{item.icon}</span>
                            <span className="font-black text-[10px] tracking-[0.2em]">{item.label}</span>
                            {view === item.id && (
                                <div className="absolute right-6 w-2 h-2 bg-indigo-400 rounded-full shadow-[0_0_15px_#818cf8]" />
                            )}
                        </button>
                    ))}

                </nav>

                <div className="mt-8 px-8 opacity-20 hover:opacity-100 transition-opacity">
                    <p className="text-[7px] font-black text-white tracking-[0.4em] uppercase">Build: v5.2-Strategic</p>
                </div>
                <button onClick={() => {
                    handleLogout();
                    setIsOpen(false);
                }} className="mt-4 flex-shrink-0 flex items-center gap-5 px-8 py-5 rounded-[1.5rem] text-rose-500 font-black text-[10px] tracking-[0.2em] hover:bg-rose-500/10 transition-all group">
                    <span className="text-2xl group-hover:rotate-12 transition-transform">🚪</span>
                    <span>LOGOUT</span>
                </button>
            </aside >
        </>
    );
};

export default Sidebar;
