import React from 'react';

const Sidebar = ({ view, setView, userRole, username, handleLogout }) => {
    return (
        <aside className="w-72 bg-slate-900 text-white flex flex-col p-6 sticky top-0 h-screen shrink-0">
            <div className="flex items-center gap-3 mb-12">
                <span className="text-3xl">🗳️</span>
                <div>
                    <h1 className="font-black uppercase text-sm leading-tight">Election Engine</h1>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{username}</p>
                </div>
            </div>
            <nav className="space-y-2 flex-grow">
                {[
                    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
                    ...(userRole !== 'BOOTH_AGENT' ? [{ id: 'engine', label: 'OCR Engine', icon: '⚡' }] : []),
                    { id: 'voters', label: 'Voter List', icon: '👥' },
                    { id: 'comm', label: 'Comm Hub', icon: '📡' },
                    { id: 'design', label: 'Slip Design', icon: '🎨' },
                    ...(['SUPERUSER', 'CONSTITUENCY_ADMIN', 'LOCAL_BODY_HEAD', 'ZONE_COMMANDER'].includes(userRole) ? [{ id: 'admin', label: 'System Admin', icon: '🛡️' }] : [])
                ].map(item => (
                    <button
                        key={item.id}
                        onClick={() => setView(item.id)}
                        className={`w-full text-left p-4 rounded-2xl flex items-center gap-4 transition-all ${view === item.id ? 'bg-indigo-600 text-white shadow-lg scale-105 font-black' : 'text-slate-400 hover:bg-slate-800 font-bold'}`}
                    >
                        <span>{item.icon}</span>
                        <span className="uppercase text-[11px] tracking-widest">{item.label}</span>
                    </button>
                ))}
            </nav>
            <div className="mt-auto pt-6 border-t border-slate-800">
                <button onClick={handleLogout} className="w-full flex items-center gap-4 p-4 rounded-2xl font-black uppercase text-[11px] tracking-widest text-rose-400 hover:bg-rose-950/30 transition-all">
                    <span>🚪</span> Logout
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
