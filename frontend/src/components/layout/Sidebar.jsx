const Sidebar = ({ view, setView, userRole, username, handleLogout, isV2, setIsV2 }) => {
    return (
        <aside className="fixed left-6 top-6 bottom-6 w-80 lux-glass rounded-[3rem] p-10 flex flex-col z-[1000] border-white/5 shadow-[0_0_80px_rgba(0,0,0,0.5)] overflow-y-auto custom-scrollbar">
            <div className="flex items-center gap-5 mb-16 px-2 flex-shrink-0">
                <div className="w-14 h-14 bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 rounded-[1.25rem] flex items-center justify-center text-3xl shadow-[0_10px_30px_rgba(99,102,241,0.3)] animate-pulse">
                    🗳️
                </div>
                <div>
                    <h1 className="font-black uppercase text-[10px] tracking-[0.3em] lux-text-gradient opacity-90">Election Manager</h1>
                    <p className="text-[12px] text-white font-black uppercase tracking-widest mt-1">{username}</p>
                </div>
            </div>

            <nav className="space-y-4 flex-grow">
                {[
                    { id: 'dashboard', label: 'Main Dashboard', icon: '📊' },
                    { id: 'warroom', label: 'TACTICAL WAR ROOM', icon: '⚔️' },
                    ...(userRole !== 'BOOTH_AGENT' ? [{ id: 'engine', label: 'Batch Upload', icon: '⚡' }] : []),
                    { id: 'voters', label: 'Voter List', icon: '👥' },
                    { id: 'comm', label: 'Send Messages', icon: '📡' },
                    { id: 'design', label: 'Voter Slips', icon: '🎨' },
                    ...(['SUPERUSER', 'CONSTITUENCY_ADMIN', 'LOCAL_BODY_HEAD', 'ZONE_COMMANDER'].includes(userRole) ? [{ id: 'admin', label: 'USER SETTINGS', icon: '🛡️' }] : [])
                ].map(item => (
                    <button
                        key={item.id}
                        onClick={() => setView(item.id)}
                        className={`w-full flex items-center gap-5 px-8 py-5 rounded-[1.5rem] transition-all duration-700 group relative overflow-hidden ${view === item.id ? 'bg-indigo-500/10 text-white lux-neon-border' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                    >
                        <span className={`text-2xl transition-all duration-700 ${view === item.id ? 'scale-125 rotate-6' : 'grayscale group-hover:grayscale-0 group-hover:scale-110 opacity-40 group-hover:opacity-100'}`}>{item.icon}</span>
                        <span className="font-black text-[10px] tracking-[0.2em]">{item.label}</span>
                        {view === item.id && (
                            <div className="absolute right-6 w-2 h-2 bg-indigo-400 rounded-full shadow-[0_0_15px_#818cf8]" />
                        )}
                    </button>
                ))}

                <div className="pt-8 border-t border-white/5 mt-8 space-y-4">
                    <p className="text-[8px] font-black text-slate-500 uppercase tracking-[0.3em] px-8">System Mode</p>
                    <button
                        onClick={() => setIsV2(!isV2)}
                        className={`w-full flex items-center gap-5 px-8 py-4 rounded-[1.25rem] transition-all duration-500 border border-white/5 ${isV2 ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-500/10 text-slate-400'}`}
                    >
                        <span className="text-xl">{isV2 ? '🚀' : '🏛️'}</span>
                        <span className="font-black text-[9px] tracking-[0.2em] uppercase">{isV2 ? 'V2 Dashboard' : 'Legacy Mode'}</span>
                    </button>
                </div>
            </nav>

            <div className="mt-8 px-8 opacity-20 hover:opacity-100 transition-opacity">
                <p className="text-[7px] font-black text-white tracking-[0.4em] uppercase">Build: v5.2-Strategic</p>
            </div>
            <button onClick={handleLogout} className="mt-4 flex-shrink-0 flex items-center gap-5 px-8 py-5 rounded-[1.5rem] text-rose-500 font-black text-[10px] tracking-[0.2em] hover:bg-rose-500/10 transition-all group">
                <span className="text-2xl group-hover:rotate-12 transition-transform">🚪</span>
                <span>LOGOUT</span>
            </button>
        </aside >
    );
};

export default Sidebar;
