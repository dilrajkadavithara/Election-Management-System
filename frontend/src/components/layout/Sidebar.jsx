const Sidebar = ({ view, setView, userRole, username, handleLogout }) => {
    return (
        <aside className="fixed left-6 top-6 bottom-6 w-80 lux-glass rounded-[3rem] p-10 flex flex-col z-50 border-white/5 shadow-[0_0_80px_rgba(0,0,0,0.5)] overflow-y-auto custom-scrollbar">
            <div className="flex items-center gap-5 mb-16 px-2 flex-shrink-0">
                <div className="w-14 h-14 bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 rounded-[1.25rem] flex items-center justify-center text-3xl shadow-[0_10px_30px_rgba(99,102,241,0.3)] animate-pulse">
                    🗳️
                </div>
                <div>
                    <h1 className="font-black uppercase text-[10px] tracking-[0.3em] lux-text-gradient opacity-90">Election Intel</h1>
                    <p className="text-[12px] text-white font-black uppercase tracking-widest mt-1">{username}</p>
                </div>
            </div>

            <nav className="space-y-4 flex-grow">
                {[
                    { id: 'dashboard', label: 'WAR ROOM', icon: '📊' },
                    ...(userRole !== 'BOOTH_AGENT' ? [{ id: 'engine', label: 'AI Processor', icon: '⚡' }] : []),
                    { id: 'voters', label: 'Voters Base', icon: '👥' },
                    { id: 'comm', label: 'Reachout to Voters', icon: '📡' },
                    { id: 'design', label: 'AI driven Voter slips', icon: '🎨' },
                    ...(['SUPERUSER', 'CONSTITUENCY_ADMIN', 'LOCAL_BODY_HEAD', 'ZONE_COMMANDER'].includes(userRole) ? [{ id: 'admin', label: 'GOVERNANCE LAYER', icon: '🛡️' }] : [])
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
            </nav>

            <button onClick={handleLogout} className="mt-12 flex-shrink-0 flex items-center gap-5 px-8 py-5 rounded-[1.5rem] text-rose-500 font-black text-[10px] tracking-[0.2em] hover:bg-rose-500/10 transition-all group">
                <span className="text-2xl group-hover:rotate-12 transition-transform">🚪</span>
                <span>DEACTIVATE CORE</span>
            </button>
        </aside>
    );
};

export default Sidebar;
