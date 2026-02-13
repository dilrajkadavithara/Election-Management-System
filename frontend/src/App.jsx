import React, { useState, useEffect } from 'react';
import api from './api';
import VoterSlip from './components/VoterSlip';

const PARTY_PRESETS = [
    { label: 'Congress (INC)', short: 'INC', color: '#000080', gradient: 'linear-gradient(to bottom, #FF9933, #ffffff, #138808)' },
    { label: 'Left (CPI/M)', short: 'CPIM', color: '#DE0000', gradient: 'linear-gradient(to bottom, #DE0000, #8B0000)' },
    { label: 'BJP', short: 'BJP', color: '#FF6600', gradient: 'linear-gradient(to bottom, #FF6600, #ffffff, #138808)' },
    { label: 'IUML', short: 'IUML', color: '#006600', gradient: 'linear-gradient(to bottom, #006600, #004400)' },
    { label: 'UDF', short: 'UDF', color: '#0033CC', gradient: 'linear-gradient(to bottom, #0033CC, #ffffff, #0033CC)' },
    { label: 'LDF', short: 'LDF', color: '#C00000', gradient: 'linear-gradient(to bottom, #DE0000, #ffffff, #DE0000)' },
];

const App = () => {
    // Auth & Navigation State
    const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('voter_token'));
    const [userRole, setUserRole] = useState(localStorage.getItem('voter_role'));
    const [username, setUsername] = useState(localStorage.getItem('voter_user'));
    const [view, setView] = useState('dashboard'); // dashboard, engine, voters, admin
    const [loginUser, setLoginUser] = useState('');
    const [loginPass, setLoginPass] = useState('');
    const [currentUser, setCurrentUser] = useState(null);

    // Global Data
    const [dashboardStats, setDashboardStats] = useState(null);
    const [voterList, setVoterList] = useState([]);
    const [voterTotal, setVoterTotal] = useState(0);
    const [dashFilters, setDashFilters] = useState({ constituency: '', booth: '' });
    const [listFilters, setListFilters] = useState({ constituency: '', lb: '', booth: '', gender: '', ageFrom: '', ageTo: '', leaning: '' });
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);

    // Admin Data
    const [allLocations, setAllLocations] = useState([]);
    const [allUsers, setAllUsers] = useState([]);
    const [newLocData, setNewLocData] = useState({ type: 'const', name: '', parentId: '', lbType: 'PANCHAYAT', boothNum: '', psName: '', psNo: '' });
    const [newUserData, setNewUserData] = useState({ username: '', password: '', role: 'BOOTH', assignments: { constituencies: [], local_bodies: [], booths: [] } });
    const [allParties, setAllParties] = useState([]);
    const [newPartyData, setNewPartyData] = useState({ name: '', shortLabel: '', color: '#000080', gradient: 'linear-gradient(to bottom, #FF9933, #ffffff, #138808)' });
    const [newPartyFile, setNewPartyFile] = useState(null);
    const [activePrintParty, setActivePrintParty] = useState(null);
    const [assignSelection, setAssignSelection] = useState({ constId: '', lbId: '' });

    // Engine/OCR State
    const [constituency, setConstituency] = useState('');
    const [lgbType, setLgbType] = useState('PANCHAYAT');
    const [lgbName, setLgbName] = useState('');
    const [booth, setBooth] = useState('');
    const [psNo, setPsNo] = useState('');
    const [psName, setPsName] = useState('');
    const [constituencies, setConstituencies] = useState([]);
    const [localBodies, setLocalBodies] = useState([]);
    const [file, setFile] = useState(null);
    const [stage, setStage] = useState('setup'); // setup, uploading, converting, detecting, ocr, results, review
    const [batchId, setBatchId] = useState(null);
    const [status, setStatus] = useState({});

    // Modals & Status
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [apiHealth, setApiHealth] = useState(null);
    const [editMode, setEditMode] = useState(false);
    const [editData, setEditData] = useState({});

    useEffect(() => {
        checkHealth();
        if (isLoggedIn) {
            loadConstituencies();
            if (view === 'dashboard') { loadStats(); if (!allLocations.length) loadAdminData(); }
            if (view === 'voters') { loadVoters(); if (!allLocations.length) loadAdminData(); }
            if (view === 'admin') { loadAdminData(); loadParties(); }
        }
    }, [isLoggedIn, view, searchQuery, currentPage, dashFilters, listFilters]);

    useEffect(() => {
        if (constituency) loadLocalBodies();
        else { setLocalBodies([]); setLgbName(''); }
    }, [constituency]);

    const checkHealth = async () => {
        try { const h = await api.checkHealth(); setApiHealth(h.status === 'healthy'); }
        catch { setApiHealth(false); }
    };

    const loadStats = async () => {
        try {
            const s = await api.getStats(dashFilters.constituency, dashFilters.booth);
            setDashboardStats(s);
        }
        catch (e) { if (e.response?.status === 401) handleLogout(); }
    };

    const loadVoters = async () => {
        try {
            const res = await api.getVoters(searchQuery, currentPage, {
                constituency: listFilters.constituency,
                lb: listFilters.lb,
                booth: listFilters.booth,
                gender: listFilters.gender,
                age_from: listFilters.ageFrom,
                age_to: listFilters.ageTo,
                leaning: listFilters.leaning
            });
            setVoterList(res.results);
            setVoterTotal(res.total);
        } catch (e) { console.error(e); }
    };

    const loadAdminData = async () => {
        try {
            const [locs, users] = await Promise.all([api.getLocations(), api.getUsers()]);
            setAllLocations(locs);
            setAllUsers(users);
        } catch (e) { console.error(e); }
    };

    const loadParties = async () => {
        try {
            const p = await api.getParties();
            setAllParties(p);
        } catch (e) { console.error(e); }
    };

    const handleAddParty = async () => {
        if (!newPartyData.name || !newPartyFile) { alert("Please provide both name and logo."); return; }
        setLoading(true);
        try {
            await api.addParty(newPartyData.name, newPartyFile, newPartyData.shortLabel, newPartyData.color, newPartyData.gradient);
            setNewPartyData({ name: '', shortLabel: '', color: '#000080', gradient: 'linear-gradient(to bottom, #FF9933, #ffffff, #138808)' });
            setNewPartyFile(null);
            const fileInput = document.getElementById('party-logo-input');
            if (fileInput) fileInput.value = '';
            loadParties();
        } catch (e) { alert(e.message); }
        finally { setLoading(false); }
    };

    const loadConstituencies = async () => {
        try { const c = await api.getConstituencies(); setConstituencies(c); }
        catch (e) { if (e.response?.status === 401) handleLogout(); }
    };

    const loadLocalBodies = async () => {
        try { const lb = await api.getLocalBodies(constituency); setLocalBodies(lb); }
        catch (e) { }
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true); setError(null);
        try {
            const res = await api.login(loginUser, loginPass);
            setIsLoggedIn(true);
            setUserRole(res.role);
            setUsername(res.username);
            setCurrentUser(res);
            setLoginPass('');
            setView('dashboard');
        } catch (e) { setError("Invalid credentials."); }
        finally { setLoading(false); }
    };

    const handleLogout = () => {
        api.logout();
        setIsLoggedIn(false); setUserRole(null); setUsername(null);
        setStage('setup'); setView('dashboard');
    };

    const handleInitialUpload = async () => {
        if (!constituency || !lgbName || !booth || !file) {
            setError("All fields, including Booth Number, are mandatory."); return;
        }
        setLoading(true); setError(null);
        try {
            const res = await api.uploadPDF(file);
            setBatchId(res.batch_id); setStage('converting');
            await api.extractBoxes(res.batch_id);
        } catch (e) { setError(e.message); setLoading(false); }
    };

    const handleStartOCR = async () => {
        setLoading(true);
        try { await api.processBatch(batchId); setStage('ocr'); setLoading(false); }
        catch (e) { setError(e.message); setLoading(false); }
    };

    const [showSuccess, setShowSuccess] = useState(false);

    const handleFinalSave = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await api.saveToDB(batchId, constituency, lgbType, lgbName, booth, psNo, psName);
            if (res.success) {
                setShowSuccess(true);
                setTimeout(() => {
                    setShowSuccess(false);
                    handleCycleReset();
                    loadStats();
                    setView('dashboard');
                }, 2000);
            }
            else setError(res.message);
        } catch (e) { setError(e.message); }
        finally { setLoading(false); }
    };

    const handleCycleReset = () => {
        if (batchId) api.clearSession(batchId).catch(() => { });
        setBatchId(null); setStatus({}); setFile(null); setBooth(''); setPsNo(''); setPsName(''); setLgbName(''); setStage('setup'); setLoading(false);
    };

    const saveCorrection = async () => {
        setLoading(true);
        try {
            if (editMode) {
                await api.editVoterInDB(editData.id, editData);
                setEditMode(false);
                loadVoters();
                loadStats();
            } else {
                await api.updateVoter(batchId, editData.voter_id, editData);
                const s = await api.getBatchStatus(batchId);
                setStatus(s);
                const rem = s.results.filter(r => r.Status !== '✅ OK');
                if (rem.length > 0) setEditData({ ...rem[0] });
                else setStage('results');
            }
        } catch (e) { setError(e.message); }
        finally { setLoading(false); }
    };

    const handleUpdateLeaning = async (voterId, leaning) => {
        try {
            const res = await api.editVoterInDB(voterId, { voter_leaning: leaning });
            if (res.success) {
                // Optimistic update
                setVoterList(prev => prev.map(v => v.id === voterId ? { ...v, voter_leaning: leaning } : v));
                loadStats();
            }
        } catch (e) { console.error(e); }
    };

    const handleAddLocation = async () => {
        try {
            setLoading(true);
            if (newLocData.type === 'const') await api.addConst(newLocData.name);
            else if (newLocData.type === 'lb') await api.addLB(newLocData.parentId, newLocData.name, newLocData.lbType);
            else if (newLocData.type === 'booth') await api.addBooth(newLocData.grandParentId, newLocData.parentId, newLocData.boothNum, newLocData.psName, newLocData.psNo);
            loadAdminData();
            setNewLocData({ type: 'const', name: '', parentId: '', lbType: 'PANCHAYAT', boothNum: '', psName: '', psNo: '' });
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const handleCreateUser = async () => {
        try {
            setLoading(true);
            const res = await api.createManagedUser(newUserData);
            if (res.success) {
                loadAdminData();
                setNewUserData({ username: '', password: '', role: 'BOOTH', assignments: { constituencies: [], local_bodies: [], booths: [] } });
                setAssignSelection({ constId: '', lbId: '' });
                alert("User created successfully!");
            } else alert(res.message);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const handleDeleteUser = async (uid) => {
        if (!window.confirm("Are you sure you want to delete this user? Their assignments will be released.")) return;
        try {
            setLoading(true);
            const res = await api.deleteUser(uid);
            if (res.success) loadAdminData();
            else alert(res.message);
        } catch (e) { alert(e.message); }
        finally { setLoading(false); }
    };

    useEffect(() => {
        let interval;
        const activeStages = ['converting', 'ocr'];
        if (batchId && activeStages.includes(stage)) {
            interval = setInterval(async () => {
                try { const s = await api.getBatchStatus(batchId); setStatus(s); }
                catch (e) { if (e.response?.status === 401) handleLogout(); }
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [batchId, stage]);

    if (!isLoggedIn) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 font-sans">
                <div className="w-full max-w-md space-y-8 animate-in">
                    <div className="text-center text-white">
                        <span className="text-6xl">🗳️</span>
                        <h1 className="mt-6 text-4xl font-black uppercase tracking-tighter">Election Engine</h1>
                    </div>
                    <form className="bg-white p-10 rounded-3xl shadow-2xl space-y-6" onSubmit={handleLogin}>
                        {error && <div className="text-rose-600 font-bold">{error}</div>}
                        <input type="text" placeholder="Username" required value={loginUser} onChange={(e) => setLoginUser(e.target.value)} className="w-full p-4 bg-slate-100 rounded-2xl font-bold" />
                        <input type="password" placeholder="Password" required value={loginPass} onChange={(e) => setLoginPass(e.target.value)} className="w-full p-4 bg-slate-100 rounded-2xl font-bold" />
                        <button type="submit" disabled={loading} className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black uppercase">{loading ? "Wait..." : "Sign In"}</button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 flex font-sans">
            {/* Sidebar */}
            <aside className="w-72 bg-slate-900 text-white flex flex-col p-6 sticky top-0 h-screen shrink-0">
                <div className="flex items-center gap-3 mb-12">
                    <span className="text-3xl">🗳️</span>
                    <div>
                        <h1 className="font-black uppercase text-sm leading-tight">Election Engine</h1>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{username}</p>
                    </div>
                </div>

                <nav className="flex-1 space-y-2">
                    {[
                        { id: 'dashboard', label: 'Dashboard', icon: '📊' },
                        { id: 'voters', label: 'Voter List', icon: '👥' },
                        { id: 'engine', label: 'OCR Engine', icon: '⚡' },
                        { id: 'design', label: 'Slip Design', icon: '🎨' },
                        ...(userRole === 'SUPERUSER' ? [{ id: 'admin', label: 'System Admin', icon: '⚙️' }] : [])
                    ].map(item => (
                        <button
                            key={item.id} onClick={() => setView(item.id)}
                            className={`w-full flex items-center gap-4 p-4 rounded-2xl font-black uppercase text-[11px] tracking-widest transition-all ${view === item.id ? 'bg-primary-600 shadow-xl' : 'hover:bg-slate-800 text-slate-400'}`}
                        >
                            <span>{item.icon}</span> {item.label}
                        </button>
                    ))}
                </nav>

                <div className="mt-auto pt-6 border-t border-slate-800">
                    <button onClick={handleLogout} className="w-full flex items-center gap-4 p-4 rounded-2xl font-black uppercase text-[11px] tracking-widest text-rose-400 hover:bg-rose-950/30 transition-all">
                        <span>🚪</span> Logout
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className={`flex-1 flex flex-col overflow-y-auto ${view === 'design' ? 'bg-slate-200 p-0' : 'p-12'}`}>
                {/* Dashboard View */}
                {view === 'dashboard' && dashboardStats && (
                    <div className="space-y-12 animate-in">
                        <header className="flex justify-between items-end border-b pb-6">
                            <div>
                                <h1 className="text-5xl font-black tracking-tighter uppercase">Voter Insight</h1>
                                <p className="text-slate-400 font-bold uppercase tracking-widest text-xs mt-2">Constituency Analytics Dashboard</p>
                            </div>

                            {/* Intelligent Filters */}
                            <div className="flex gap-4 mb-1">
                                <div className="flex flex-col gap-1">
                                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Constituency</label>
                                    <select
                                        className="bg-white border-2 border-slate-100 rounded-2xl px-5 py-3 text-xs font-bold focus:border-primary-500 outline-none transition-all cursor-pointer shadow-sm hover:border-slate-300"
                                        value={dashFilters.constituency}
                                        onChange={(e) => setDashFilters({ ...dashFilters, constituency: e.target.value, booth: '' })}
                                    >
                                        <option value="">Global View (All)</option>
                                        {allLocations.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Booth Unit</label>
                                    <select
                                        className="bg-white border-2 border-slate-100 rounded-2xl px-5 py-3 text-xs font-bold focus:border-primary-500 outline-none transition-all cursor-pointer shadow-sm hover:border-slate-300 disabled:opacity-50 disabled:grayscale"
                                        value={dashFilters.booth}
                                        disabled={!dashFilters.constituency}
                                        onChange={(e) => setDashFilters({ ...dashFilters, booth: e.target.value })}
                                    >
                                        <option value="">All Booths</option>
                                        {dashFilters.constituency && allLocations.find(c => String(c.id) === String(dashFilters.constituency))?.local_bodies.flatMap(lb => lb.booths).sort((a, b) => a.number - b.number).map(b => (
                                            <option key={b.id} value={b.id}>Booth {b.number} - {b.name || b.polling_station_name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </header>

                        <div className="grid grid-cols-3 gap-8">
                            {[
                                { l: 'Total Voters', v: dashboardStats.total, c: 'bg-white text-slate-800' },
                                { l: 'Male Voters', v: dashboardStats.male, c: 'bg-blue-50 text-blue-700' },
                                { l: 'Female Voters', v: dashboardStats.female, c: 'bg-rose-50 text-rose-700' },
                            ].map((s, i) => (
                                <div key={i} className={`${s.c} p-8 rounded-[40px] shadow-sm border border-slate-100 flex flex-col justify-end min-h-[160px]`}>
                                    <p className="text-[10px] font-black uppercase tracking-widest mb-1 opacity-60">{s.l}</p>
                                    <p className="text-5xl font-black tracking-tighter">{s.v}</p>
                                </div>
                            ))}
                        </div>

                        {/* Intelligence Row */}
                        <div className="grid grid-cols-3 gap-8">
                            {/* Voter Sentiment */}
                            <div className="bg-white p-10 rounded-[40px] shadow-sm border border-slate-100">
                                <h3 className="font-black uppercase tracking-widest text-[10px] text-slate-400 mb-8 border-b pb-4">Voter Sentiment</h3>
                                <div className="space-y-6">
                                    {[
                                        { l: 'Supporters', v: dashboardStats.sentiment?.supporter || 0, color: 'bg-emerald-500' },
                                        { l: 'Neutral', v: dashboardStats.sentiment?.neutral || 0, color: 'bg-amber-400' },
                                        { l: 'Opponents', v: dashboardStats.sentiment?.opponent || 0, color: 'bg-rose-500' }
                                    ].map(s => (
                                        <div key={s.l}>
                                            <div className="flex justify-between font-black text-[11px] uppercase mb-1">
                                                <span>{s.l}</span>
                                                <span className="text-slate-400">{Math.round((s.v / (dashboardStats.total || 1)) * 100)}%</span>
                                            </div>
                                            <div className="h-2 bg-slate-50 rounded-full overflow-hidden">
                                                <div className={`h-full ${s.color}`} style={{ width: `${(s.v / (dashboardStats.total || 1)) * 100}%` }}></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Geographical Logistics */}
                            <div className="bg-white p-10 rounded-[40px] shadow-sm border border-slate-100">
                                <h3 className="font-black uppercase tracking-widest text-[10px] text-slate-400 mb-8 border-b pb-4">Geographical Logistics</h3>
                                <div className="space-y-4">
                                    {[
                                        { l: 'Local Residents', v: dashboardStats.location?.local || 0, c: 'text-emerald-600' },
                                        { l: 'NRI / Abroad', v: dashboardStats.location?.abroad || 0, c: 'text-blue-600' },
                                        { l: 'Other State', v: dashboardStats.location?.state || 0, c: 'text-amber-600' },
                                        { l: 'Other District', v: dashboardStats.location?.district || 0, c: 'text-slate-600' }
                                    ].map(l => (
                                        <div key={l.l} className="flex justify-between items-center py-2 border-b border-slate-50 last:border-0">
                                            <span className="text-[10px] font-black uppercase text-slate-400">{l.l}</span>
                                            <span className={`text-sm font-black ${l.c}`}>{l.v}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Outreach Tracker */}
                            <div className="bg-primary-600 text-white p-10 rounded-[40px] shadow-xl relative overflow-hidden flex flex-col justify-between">
                                <div className="relative z-10">
                                    <h3 className="font-black uppercase tracking-widest text-[10px] opacity-60 mb-8">Outreach Coverage</h3>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-5xl font-black tracking-tighter">{dashboardStats.outreach?.with_phone || 0}</span>
                                        <span className="text-sm font-bold opacity-60">Collected</span>
                                    </div>
                                    <p className="text-[10px] font-black uppercase mt-4 tracking-widest opacity-60">Target: {dashboardStats.total} Voters</p>
                                </div>
                                <div className="relative z-10">
                                    <div className="h-2 bg-primary-800 rounded-full mt-8 overflow-hidden">
                                        <div className="h-full bg-white" style={{ width: `${((dashboardStats.outreach?.with_phone || 0) / (dashboardStats.total || 1)) * 100}%` }}></div>
                                    </div>
                                    <p className="text-[9px] font-bold mt-2 opacity-80 uppercase tracking-widest">Phone Collection Efficiency: {Math.round(((dashboardStats.outreach?.with_phone || 0) / (dashboardStats.total || 1)) * 100)}%</p>
                                </div>
                            </div>
                        </div>

                        {/* Field Force Status Row */}
                        <div className="grid grid-cols-2 gap-8">
                            <div className="bg-white p-10 rounded-[40px] shadow-sm border border-slate-100">
                                <h3 className="font-black uppercase tracking-widest text-[10px] text-slate-400 mb-8 border-b pb-4">Ground Verification Progress</h3>
                                <div className="flex items-center gap-10">
                                    <div className="relative w-32 h-32">
                                        <svg className="w-full h-full transform -rotate-90">
                                            <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-slate-100" />
                                            <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="12" fill="transparent" strokeDasharray={364} strokeDashoffset={364 - (364 * (dashboardStats.tagging_progress || 0) / (dashboardStats.total || 1))} className="text-emerald-500 transition-all duration-1000" />
                                        </svg>
                                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                                            <span className="text-2xl font-black">{Math.round(((dashboardStats.tagging_progress || 0) / (dashboardStats.total || 1)) * 100)}%</span>
                                        </div>
                                    </div>
                                    <div className="flex-1 space-y-4">
                                        <div className="bg-slate-50 p-6 rounded-3xl">
                                            <p className="text-[9px] font-black uppercase text-slate-400 mb-1">Tagged Records</p>
                                            <p className="text-2xl font-black text-slate-800">{dashboardStats.tagging_progress || 0}</p>
                                        </div>
                                        <p className="text-[10px] font-bold text-slate-400 italic">"Includes voters tagged with Leaning, Location, or Contact details."</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-emerald-600 text-white p-10 rounded-[40px] shadow-xl flex flex-col justify-between">
                                <div>
                                    <h3 className="font-black uppercase tracking-widest text-[10px] opacity-60 mb-8">Work Strategy</h3>
                                    <h2 className="text-3xl font-black uppercase tracking-tighter leading-tight">Focus on Neutral Voters</h2>
                                    <p className="text-xs font-bold opacity-80 mt-2">Targeting {dashboardStats.sentiment?.neutral || 0} neutral voters can flip the results in your favor.</p>
                                </div>
                                <button onClick={() => { setListFilters({ ...listFilters, leaning: 'NEUTRAL' }); setView('list'); }} className="w-fit bg-white text-emerald-600 px-8 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest mt-6 hover:scale-105 transition-all">Filter Neutral List</button>
                            </div>
                        </div>

                        {/* Age Row */}
                        <div className="grid grid-cols-3 gap-8 pb-12">
                            <div className="bg-white p-10 rounded-[40px] shadow-sm border border-slate-100 col-span-2">
                                <h3 className="font-black uppercase tracking-widest text-[10px] text-slate-400 mb-8 underline decoration-primary-500 decoration-4 underline-offset-4">Voter Age Brackets</h3>
                                <div className="grid grid-cols-2 gap-x-12 gap-y-6">
                                    {Object.entries(dashboardStats.age_dist).map(([label, count]) => (
                                        <div key={label}>
                                            <div className="flex justify-between font-black text-[11px] uppercase mb-2">
                                                <span>{label.replace('_', '-')} Years</span>
                                                <span>{count}</span>
                                            </div>
                                            <div className="h-2 bg-slate-50 rounded-full overflow-hidden">
                                                <div className="h-full bg-slate-900" style={{ width: `${(count / (dashboardStats.total || 1)) * 100}%` }}></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="bg-slate-900 text-white p-10 rounded-[40px] shadow-2xl relative overflow-hidden group">
                                <div className="z-10 relative">
                                    <h3 className="font-black uppercase tracking-widest text-[10px] text-slate-500 mb-2">Data Acquisition</h3>
                                    <h2 className="text-3xl font-black mb-6 leading-tight uppercase tracking-tighter">Expand Booth Data</h2>
                                    <button onClick={() => setView('engine')} className="bg-white text-slate-900 px-8 py-4 rounded-2xl font-black uppercase text-[11px] tracking-widest hover:scale-105 transition-all">Launch Engine ⚡</button>
                                </div>
                                <span className="absolute -bottom-10 -right-10 text-9xl grayscale opacity-10 group-hover:rotate-12 transition-all">🗳️</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Voter List View */}
                {view === 'voters' && (
                    <div className="space-y-8 animate-in">
                        <header className="flex justify-between items-center">
                            <div>
                                <h1 className="text-4xl font-black tracking-tighter uppercase">Voters List</h1>
                                <p className="text-slate-400 font-bold uppercase tracking-widest text-xs mt-1">Found {voterTotal} records</p>
                            </div>
                            <div className="flex gap-4 items-center">
                                <button
                                    onClick={() => api.exportVoters({
                                        search: searchQuery,
                                        constituency: listFilters.constituency,
                                        lb: listFilters.lb,
                                        booth: listFilters.booth,
                                        gender: listFilters.gender,
                                        age_from: listFilters.ageFrom,
                                        age_to: listFilters.ageTo,
                                        leaning: listFilters.leaning
                                    })}
                                    disabled={currentUser?.role !== 'SUPERUSER' && !currentUser?.can_download}
                                    className="px-6 py-4 bg-primary-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-primary-700 transition-all shadow-lg flex items-center gap-2 disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed"
                                >
                                    <span>Export Filtered CSV</span>
                                    <span>📥</span>
                                </button>
                                <button
                                    onClick={() => setView('design')}
                                    className="px-6 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-800 transition-all shadow-lg flex items-center gap-2"
                                >
                                    <span>Generate Slips</span>
                                    <span>🖨️</span>
                                </button>
                                <input
                                    type="text" placeholder="Search by name, ID or house..."
                                    className="p-4 bg-white border border-slate-200 rounded-2xl font-bold text-sm w-72 shadow-sm"
                                    value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </header>

                        <div className="bg-white p-4 rounded-[30px] shadow-sm border border-slate-100 flex flex-wrap gap-4 items-end">
                            <div className="flex-1 min-w-[150px] space-y-1">
                                <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest pl-2">Constituency</label>
                                <select
                                    className="w-full p-2 bg-slate-50 rounded-xl text-xs font-bold border-none"
                                    value={listFilters.constituency}
                                    onChange={(e) => setListFilters({ ...listFilters, constituency: e.target.value, lb: '', booth: '' })}
                                >
                                    <option value="">All Constituencies</option>
                                    {allLocations.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div className="flex-1 min-w-[150px] space-y-1">
                                <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest pl-2">Local Body</label>
                                <select
                                    className="w-full p-2 bg-slate-50 rounded-xl text-xs font-bold border-none"
                                    value={listFilters.lb}
                                    onChange={(e) => setListFilters({ ...listFilters, lb: e.target.value, booth: '' })}
                                    disabled={!listFilters.constituency}
                                >
                                    <option value="">All Bodies</option>
                                    {allLocations.find(c => c.id == listFilters.constituency)?.local_bodies.map(lb => (
                                        <option key={lb.id} value={lb.id}>{lb.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex-1 min-w-[150px] space-y-1">
                                <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest pl-2">Booth</label>
                                <select
                                    className="w-full p-2 bg-slate-50 rounded-xl text-xs font-bold border-none"
                                    value={listFilters.booth}
                                    onChange={(e) => setListFilters({ ...listFilters, booth: e.target.value })}
                                    disabled={!listFilters.lb}
                                >
                                    <option value="">All Booths</option>
                                    {allLocations.find(c => c.id == listFilters.constituency)?.local_bodies.find(lb => lb.id == listFilters.lb)?.booths.map(b => (
                                        <option key={b.id} value={b.id}>Booth {b.number}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="w-[120px] space-y-1">
                                <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest pl-2">Gender</label>
                                <select
                                    className="w-full p-2 bg-slate-50 rounded-xl text-xs font-bold border-none"
                                    value={listFilters.gender}
                                    onChange={(e) => setListFilters({ ...listFilters, gender: e.target.value })}
                                >
                                    <option value="">All</option>
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                            <div className="w-[80px] space-y-1">
                                <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest pl-2">Age From</label>
                                <input
                                    type="number" className="w-full p-2 bg-slate-50 rounded-xl text-xs font-bold border-none"
                                    placeholder="Min" value={listFilters.ageFrom} onChange={(e) => setListFilters({ ...listFilters, ageFrom: e.target.value })}
                                />
                            </div>
                            <div className="w-[80px] space-y-1">
                                <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest pl-2">Age To</label>
                                <input
                                    type="number" className="w-full p-2 bg-slate-50 rounded-xl text-xs font-bold border-none"
                                    placeholder="Max" value={listFilters.ageTo} onChange={(e) => setListFilters({ ...listFilters, ageTo: e.target.value })}
                                />
                            </div>
                            <div className="w-[120px] space-y-1">
                                <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest pl-2">Sentiment</label>
                                <select
                                    className="w-full p-2 bg-slate-50 rounded-xl text-xs font-bold border-none"
                                    value={listFilters.leaning}
                                    onChange={(e) => setListFilters({ ...listFilters, leaning: e.target.value })}
                                >
                                    <option value="">All</option>
                                    <option value="SUPPORTER">Supporters</option>
                                    <option value="NEUTRAL">Neutral</option>
                                    <option value="OPPONENT">Opponents</option>
                                </select>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => { loadVoters(); loadAdminData(); }} className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-md">Apply</button>
                                <button onClick={() => { setListFilters({ constituency: '', lb: '', booth: '', gender: '', ageFrom: '', ageTo: '', leaning: '' }); setSearchQuery(''); }} className="px-5 py-2.5 bg-slate-100 text-slate-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all">Clear</button>
                            </div>
                        </div>

                        <div className="bg-white rounded-[20px] shadow-sm border border-slate-100 overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-slate-50 sticky top-0 z-10">
                                    <tr className="text-[9px] font-black uppercase text-slate-500 border-b">
                                        <th className="px-4 py-3 whitespace-nowrap">Sl No</th>
                                        <th className="px-4 py-3 min-w-[200px] border-x">Name (Malayalam)</th>
                                        <th className="px-4 py-3 whitespace-nowrap border-x">EPIC ID</th>
                                        <th className="px-4 py-3 whitespace-nowrap border-x">G</th>
                                        <th className="px-4 py-3 whitespace-nowrap border-x">Age</th>
                                        <th className="px-4 py-3 border-x">House Name</th>
                                        <th className="px-4 py-3 border-x">House No</th>
                                        <th className="px-4 py-3 border-x">Constituency</th>
                                        <th className="px-4 py-3 border-x">Local Body</th>
                                        <th className="px-4 py-3 border-x">Booth</th>
                                        <th className="px-4 py-3 whitespace-nowrap border-x">PS No</th>
                                        <th className="px-4 py-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="text-[11px] font-medium text-slate-700 divide-y">
                                    {voterList.map(v => (
                                        <tr key={v.id} className="hover:bg-blue-50/50 transition-colors odd:bg-white even:bg-slate-50/30">
                                            <td className="px-4 py-2 font-black text-slate-400">{v.serial_no}</td>
                                            <td className="px-4 py-2 font-bold text-slate-900 text-sm">{v.full_name}</td>
                                            <td className="px-4 py-2"><span className="bg-slate-100 px-2 py-0.5 rounded font-mono text-[10px]">{v.epic_id}</span></td>
                                            <td className="px-4 py-2 font-black text-slate-400">{v.gender?.charAt(0)}</td>
                                            <td className="px-4 py-2">{v.age}</td>
                                            <td className="px-4 py-2 text-slate-500 truncate max-w-[150px]">{v.house_name}</td>
                                            <td className="px-4 py-2 font-bold">{v.house_no}</td>
                                            <td className="px-4 py-2 text-[10px] uppercase font-bold text-slate-400">{v.constituency}</td>
                                            <td className="px-4 py-2 text-[10px] uppercase font-bold text-slate-400">{v.local_body}</td>
                                            <td className="px-4 py-2 font-black">#{v.booth_no}</td>
                                            <td className="px-4 py-2 text-primary-600 font-black">{v.ps_no}</td>
                                            <td className="px-4 py-2 text-right">
                                                <button onClick={() => { setEditData(v); setEditMode(true); }} className="text-primary-600 font-black uppercase text-[9px] bg-primary-50 px-2 py-1 rounded hover:bg-primary-600 hover:text-white transition-all">Edit Details</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {voterList.length === 0 && (
                            <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-[30px] p-20 text-center">
                                <p className="text-slate-400 font-black uppercase tracking-widest text-xs">No records matching the filter criteria</p>
                            </div>
                        )}

                        {/* Pagination */}
                        <div className="flex justify-center gap-4 py-8">
                            <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="p-4 font-black uppercase text-[10px] text-slate-400 hover:text-slate-800 disabled:opacity-30">Previous</button>
                            <span className="p-4 font-black uppercase text-[10px] bg-white rounded-xl shadow-sm border px-6">Page {currentPage}</span>
                            <button disabled={voterList.length < 50} onClick={() => setCurrentPage(p => p + 1)} className="p-4 font-black uppercase text-[10px] text-slate-400 hover:text-slate-800 disabled:opacity-30">Next</button>
                        </div>
                    </div>
                )
                }

                {/* System Admin View */}
                {
                    view === 'admin' && (
                        <div className="space-y-12 animate-in pb-20">
                            <header className="flex justify-between items-end">
                                <div>
                                    <h1 className="text-4xl font-black tracking-tighter uppercase text-slate-800">System Control</h1>
                                    <p className="text-slate-400 font-bold uppercase tracking-widest text-xs mt-2">Organizational Governance Layer</p>
                                </div>
                                <div className="flex gap-6">
                                    <div className="bg-white px-8 py-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-center">
                                        <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest mb-1">Unassigned Booths</p>
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-2xl font-black text-rose-600">
                                                {(() => {
                                                    const allBoothIds = allLocations.flatMap(c => c.local_bodies.flatMap(lb => lb.booths.map(b => b.id)));
                                                    const assignedBoothIds = allUsers.flatMap(u => u.booth_ids || []);
                                                    const unassigned = allBoothIds.filter(id => !assignedBoothIds.includes(id));
                                                    return unassigned.length;
                                                })()}
                                            </span>
                                            <span className="text-[10px] font-bold text-slate-400">Records Pending</span>
                                        </div>
                                    </div>
                                    <div className="bg-white px-8 py-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-center">
                                        <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest mb-1">Human Intelligence</p>
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-2xl font-black text-slate-800">{allUsers.length}</span>
                                            <span className="text-[10px] font-bold text-slate-400">Activated Agents</span>
                                        </div>
                                    </div>
                                </div>
                            </header>

                            <div className="grid grid-cols-2 gap-12">
                                {/* Location Management */}
                                <div className="space-y-8">
                                    <div className="bg-white p-10 rounded-[40px] shadow-xl border border-slate-100 space-y-6">
                                        <h3 className="text-xl font-black uppercase tracking-tight">Geo-Hierarchy Entry</h3>
                                        <div className="flex gap-2">
                                            {['const', 'lb', 'booth'].map(t => (
                                                <button key={t} onClick={() => setNewLocData({ ...newLocData, type: t })} className={`flex-1 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all ${newLocData.type === t ? 'bg-primary-600 text-white shadow-lg' : 'bg-slate-50 text-slate-400'}`}>{t}</button>
                                            ))}
                                        </div>

                                        <div className="space-y-4">
                                            {newLocData.type === 'lb' && (
                                                <>
                                                    <select value={newLocData.parentId} onChange={(e) => setNewLocData({ ...newLocData, parentId: e.target.value })} className="w-full p-4 bg-slate-50 border-2 border-slate-50 rounded-2xl focus:border-primary-500 font-bold">
                                                        <option value="">Select Constituency</option>
                                                        {allLocations.filter(l => !l.parentId).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                                    </select>
                                                    <select value={newLocData.lbType} onChange={(e) => setNewLocData({ ...newLocData, lbType: e.target.value })} className="w-full p-4 bg-slate-50 border-2 border-slate-50 rounded-2xl focus:border-primary-500 font-bold">
                                                        <option value="PANCHAYAT">Panchayat</option>
                                                        <option value="MUNICIPALITY">Municipality</option>
                                                        <option value="CORPORATION">Corporation</option>
                                                    </select>
                                                </>
                                            )}

                                            {newLocData.type === 'booth' && (
                                                <>
                                                    <select value={newLocData.grandParentId} onChange={(e) => {
                                                        const cid = e.target.value;
                                                        setNewLocData({ ...newLocData, grandParentId: cid, parentId: '' });
                                                    }} className="w-full p-4 bg-slate-50 border-2 border-slate-50 rounded-2xl focus:border-primary-500 font-bold">
                                                        <option value="">Select Constituency</option>
                                                        {allLocations.filter(l => !l.parentId).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                                    </select>
                                                    <select value={newLocData.parentId} onChange={(e) => setNewLocData({ ...newLocData, parentId: e.target.value })} className="w-full p-4 bg-slate-50 border-2 border-slate-50 rounded-2xl focus:border-primary-500 font-bold">
                                                        <option value="">Select Local Body</option>
                                                        {allLocations.filter(l => l.parentId && l.parentId == newLocData.grandParentId).map(lb => <option key={lb.id} value={lb.id}>{lb.name}</option>)}
                                                    </select>
                                                    <input type="text" placeholder="Booth Number (e.g. 001, 145A)" value={newLocData.boothNum} onChange={(e) => setNewLocData({ ...newLocData, boothNum: e.target.value })} className="w-full p-4 bg-slate-50 border-2 border-slate-50 rounded-2xl focus:border-primary-500 font-bold" />
                                                    <input type="text" placeholder="Polling Station Number" value={newLocData.psNo} onChange={(e) => setNewLocData({ ...newLocData, psNo: e.target.value })} className="w-full p-4 bg-slate-50 border-2 border-slate-50 rounded-2xl focus:border-primary-500 font-bold" />
                                                    <input type="text" placeholder="Polling Station Name" value={newLocData.psName} onChange={(e) => setNewLocData({ ...newLocData, psName: e.target.value })} className="w-full p-4 bg-slate-50 border-2 border-slate-50 rounded-2xl focus:border-primary-500 font-bold" />
                                                </>
                                            )}

                                            {newLocData.type !== 'booth' && (
                                                <input type="text" placeholder={`${newLocData.type.toUpperCase()} Name`} value={newLocData.name} onChange={(e) => setNewLocData({ ...newLocData, name: e.target.value })} className="w-full p-4 bg-slate-50 border-2 border-slate-50 rounded-2xl focus:border-primary-500 font-bold" />
                                            )}

                                            <button onClick={handleAddLocation} className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black uppercase tracking-widest text-[11px]">Add Location Element</button>
                                        </div>
                                    </div>

                                    {/* Party Management */}
                                    <div className="bg-white p-10 rounded-[40px] shadow-xl border border-slate-100 space-y-6">
                                        <h3 className="text-xl font-black uppercase tracking-tight">Political Party Configuration</h3>
                                        <div className="space-y-4">
                                            <input type="text" placeholder="Party Name (Full)" value={newPartyData.name} onChange={(e) => setNewPartyData({ ...newPartyData, name: e.target.value })} className="w-full p-4 bg-slate-50 border-2 border-slate-50 rounded-2xl focus:border-primary-500 font-bold" />

                                            <div className="grid grid-cols-2 gap-4">
                                                <input type="text" placeholder="Short Label (e.g. INC)" value={newPartyData.shortLabel} onChange={(e) => setNewPartyData({ ...newPartyData, shortLabel: e.target.value })} className="p-4 bg-slate-50 border-2 border-slate-50 rounded-2xl font-bold" />
                                                <select
                                                    onChange={(e) => {
                                                        const p = PARTY_PRESETS.find(pr => pr.label === e.target.value);
                                                        if (p) setNewPartyData({ ...newPartyData, name: p.label.split(' (')[0], shortLabel: p.short, color: p.color, gradient: p.gradient });
                                                    }}
                                                    className="p-4 bg-slate-50 border-2 border-slate-50 rounded-2xl font-bold"
                                                >
                                                    <option value="">Apply Preset...</option>
                                                    {PARTY_PRESETS.map(p => <option key={p.label} value={p.label}>{p.label}</option>)}
                                                </select>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-1">
                                                    <label className="text-[8px] font-black uppercase text-slate-400 px-2">Primary Color</label>
                                                    <input type="color" value={newPartyData.color} onChange={(e) => setNewPartyData({ ...newPartyData, color: e.target.value })} className="w-full h-12 bg-slate-50 border-2 border-slate-50 rounded-xl cursor-pointer" />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[8px] font-black uppercase text-slate-400 px-2">Gradient (CSS)</label>
                                                    <input type="text" value={newPartyData.gradient} onChange={(e) => setNewPartyData({ ...newPartyData, gradient: e.target.value })} className="w-full p-3 bg-slate-50 border-2 border-slate-50 rounded-xl font-mono text-[9px]" />
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest px-2">Symbol Logo (PNG/SVG preferred)</label>
                                                <input type="file" id="party-logo-input" onChange={(e) => setNewPartyFile(e.target.files[0])} className="w-full p-4 bg-slate-50 border-2 border-slate-50 rounded-2xl font-bold text-xs" />
                                            </div>
                                            <button onClick={handleAddParty} className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black uppercase tracking-widest text-[11px]">Register Party & Symbol</button>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            {allParties.map(p => (
                                                <div key={p.id} className="bg-slate-50 p-4 rounded-3xl flex items-center gap-4 border border-slate-100" style={{ borderLeft: `6px solid ${p.primary_color}` }}>
                                                    <img src={`/api/party-symbol/${p.symbol_image}`} className="w-10 h-10 object-contain rounded-lg bg-white p-1" alt={p.name} />
                                                    <div className="overflow-hidden">
                                                        <span className="text-[10px] font-black uppercase truncate block">{p.name}</span>
                                                        <span className="text-[8px] font-bold text-slate-400 uppercase">{p.short_label}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* User Management */}
                                <div className="space-y-8">
                                    <div className="bg-white p-10 rounded-[40px] shadow-xl border border-slate-100 space-y-6">
                                        <h3 className="text-xl font-black uppercase tracking-tight">Managed Identity Creation</h3>
                                        <div className="grid grid-cols-2 gap-4 text-xs">
                                            <input type="text" placeholder="Username" value={newUserData.username} onChange={(e) => setNewUserData({ ...newUserData, username: e.target.value })} className="p-4 bg-slate-50 border-2 border-slate-50 rounded-2xl font-bold" />
                                            <input type="password" placeholder="Password" value={newUserData.password} onChange={(e) => setNewUserData({ ...newUserData, password: e.target.value })} className="p-4 bg-slate-50 border-2 border-slate-50 rounded-2xl font-bold" />
                                            <select value={newUserData.role} onChange={(e) => setNewUserData({ ...newUserData, role: e.target.value, assignments: { constituencies: [], local_bodies: [], booths: [] } })} className="col-span-2 p-4 bg-slate-50 border-2 border-slate-50 rounded-2xl font-bold">
                                                <option value="SUPERUSER">Superuser (Full Access)</option>
                                                <option value="CONSTITUENCY">Constituency Head</option>
                                                <option value="LOCAL_BODY">Local Body Head</option>
                                                <option value="BOOTH">Booth Head</option>
                                                <option value="EMPLOYEE">Employee (OCR Only)</option>
                                            </select>
                                        </div>

                                        {/* Scope Assignments */}
                                        <div className="bg-slate-50 p-6 rounded-3xl space-y-4">
                                            <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest px-2">Hierarchical Assignment</label>

                                            <div className="space-y-4">
                                                {/* Role-Specific Selection Logic */}
                                                {(newUserData.role === 'LOCAL_BODY' || newUserData.role === 'BOOTH') && (
                                                    <select
                                                        value={assignSelection.constId}
                                                        onChange={(e) => setAssignSelection({ ...assignSelection, constId: e.target.value, lbId: '' })}
                                                        className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-bold text-xs"
                                                    >
                                                        <option value="">Select Constituency...</option>
                                                        {allLocations.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                                    </select>
                                                )}

                                                {newUserData.role === 'BOOTH' && assignSelection.constId && (
                                                    <select
                                                        value={assignSelection.lbId}
                                                        onChange={(e) => setAssignSelection({ ...assignSelection, lbId: e.target.value })}
                                                        className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-bold text-xs"
                                                    >
                                                        <option value="">Select Local Body...</option>
                                                        {allLocations.find(c => c.id == assignSelection.constId)?.local_bodies.map(lb => (
                                                            <option key={lb.id} value={lb.id}>{lb.name}</option>
                                                        ))}
                                                    </select>
                                                )}

                                                <div className="max-h-48 overflow-y-auto space-y-2 border-t pt-4">
                                                    {/* Filter and Show relevant items to click */}
                                                    {(() => {
                                                        let items = [];
                                                        let key = '';

                                                        if (newUserData.role === 'CONSTITUENCY') {
                                                            items = allLocations;
                                                            key = 'constituencies';
                                                        } else if (newUserData.role === 'LOCAL_BODY') {
                                                            items = allLocations.find(c => c.id == assignSelection.constId)?.local_bodies || [];
                                                            key = 'local_bodies';
                                                        } else if (newUserData.role === 'BOOTH') {
                                                            items = allLocations.find(c => c.id == assignSelection.constId)?.local_bodies.find(lb => lb.id == assignSelection.lbId)?.booths || [];
                                                            key = 'booths';
                                                        }

                                                        if (items.length === 0 && (newUserData.role === 'LOCAL_BODY' || newUserData.role === 'BOOTH')) {
                                                            return <p className="text-[10px] text-slate-400 font-bold italic text-center py-4">Please select the parent areas above first</p>;
                                                        }

                                                        return items.map(item => {
                                                            const isAssigned = newUserData.assignments[key].includes(item.id);
                                                            // Check if taken by ANY other user
                                                            const isTaken = allUsers.some(u =>
                                                                (key === 'booths' && u.booth_ids?.includes(item.id)) ||
                                                                (key === 'local_bodies' && u.local_body_ids?.includes(item.id)) ||
                                                                (key === 'constituencies' && u.constituency_ids?.includes(item.id))
                                                            );

                                                            return (
                                                                <button
                                                                    key={item.id}
                                                                    disabled={isTaken && !isAssigned}
                                                                    onClick={() => {
                                                                        const current = newUserData.assignments[key];
                                                                        const updated = isAssigned ? current.filter(id => id !== item.id) : [...current, item.id];
                                                                        setNewUserData({ ...newUserData, assignments: { ...newUserData.assignments, [key]: updated } });
                                                                    }}
                                                                    className={`w-full text-left p-3 rounded-xl text-[10px] font-black uppercase tracking-tight flex justify-between items-center transition-all ${isAssigned ? 'bg-primary-600 text-white shadow-md' :
                                                                        isTaken ? 'bg-slate-100 text-slate-300 cursor-not-allowed opacity-50' :
                                                                            'bg-white hover:bg-slate-200 text-slate-600'
                                                                        }`}
                                                                >
                                                                    <div className="flex flex-col">
                                                                        <span>{item.name || `Booth ${item.number}`}</span>
                                                                        {isTaken && !isAssigned && <span className="text-[7px] font-bold text-rose-400">Already Assigned</span>}
                                                                    </div>
                                                                    <span>{isAssigned ? '✅' : isTaken ? '🔒' : '+'}</span>
                                                                </button>
                                                            );
                                                        });
                                                    })()}
                                                </div>
                                            </div>
                                        </div>

                                        <button onClick={handleCreateUser} className="w-full bg-primary-600 text-white py-5 rounded-3xl font-black uppercase tracking-widest shadow-xl">Activate Account</button>
                                    </div>

                                    <div className="bg-white rounded-[40px] shadow-sm border border-slate-100 overflow-hidden">
                                        <table className="w-full text-left">
                                            <thead className="bg-slate-50 border-b">
                                                <tr className="text-[10px] font-black uppercase text-slate-400">
                                                    <th className="p-6">User</th>
                                                    <th className="p-6">Role</th>
                                                    <th className="p-6">Assigned Scopes</th>
                                                    <th className="p-6 text-right">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y">
                                                {allUsers.map(u => (
                                                    <tr key={u.id} className="text-xs">
                                                        <td className="p-6 font-black uppercase">{u.username}</td>
                                                        <td className="p-6 font-bold text-slate-400">{u.role}</td>
                                                        <td className="p-6">
                                                            <div className="flex flex-wrap gap-1">
                                                                {u.constituencies.map(n => <span key={n} className="bg-blue-50 text-blue-600 px-2 py-1 rounded-md">Const: {n}</span>)}
                                                                {u.local_bodies.map(n => <span key={n} className="bg-emerald-50 text-emerald-600 px-2 py-1 rounded-md">LB: {n}</span>)}
                                                                {u.booths.map(n => <span key={n} className="bg-slate-100 text-slate-600 px-2 py-1 rounded-md">Booth {n}</span>)}
                                                            </div>
                                                        </td>
                                                        <td className="p-6 text-right">
                                                            <button
                                                                onClick={() => handleDeleteUser(u.id)}
                                                                className="p-3 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-100 transition-all font-black uppercase text-[8px] tracking-widest"
                                                            >
                                                                Revoke & Delete
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                }

                {/* OCR Engine View */}
                {
                    view === 'engine' && (
                        <div className="max-w-4xl mx-auto space-y-8 animate-in">
                            <header className="mb-12">
                                <h1 className="text-5xl font-black tracking-tighter uppercase">OCR Engine</h1>
                                <p className="text-slate-400 font-bold uppercase tracking-widest text-xs mt-2">Neural PDF Extraction Layer</p>
                            </header>

                            {error && <div className="bg-rose-50 p-6 rounded-2xl mb-8 border border-rose-100 text-rose-700 font-bold">{error}</div>}

                            {stage === 'setup' && (
                                <div className="bg-white rounded-[40px] p-12 shadow-xl border border-slate-100 space-y-12">
                                    <div className="grid grid-cols-2 gap-10">
                                        <div className="space-y-2">
                                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">Constituency</label>
                                            <input type="text" list="const-list" placeholder="Search..." value={constituency} onChange={(e) => setConstituency(e.target.value)} className="w-full p-5 bg-slate-50 border-2 border-slate-50 rounded-3xl focus:border-primary-500 font-bold text-lg" />
                                            <datalist id="const-list">{constituencies.map(c => <option key={c} value={c} />)}</datalist>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">Body Type</label>
                                            <select value={lgbType} onChange={(e) => setLgbType(e.target.value)} className="w-full p-5 bg-slate-50 border-2 border-slate-50 rounded-3xl focus:border-primary-500 font-bold text-lg appearance-none">
                                                <option value="PANCHAYAT">Panchayath</option>
                                                <option value="MUNICIPALITY">Municipality</option>
                                                <option value="CORPORATION">Corporation</option>
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">Body Name</label>
                                            <input type="text" list="lb-list" placeholder="e.g. Udayamperoor" value={lgbName} onChange={(e) => setLgbName(e.target.value)} className="w-full p-5 bg-slate-50 border-2 border-slate-50 rounded-3xl focus:border-primary-500 font-bold text-lg" />
                                            <datalist id="lb-list">{localBodies.filter(lb => lb.body_type === lgbType).map(lb => <option key={lb.id} value={lb.name} />)}</datalist>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">Booth No. (Required)</label>
                                            <input type="text" placeholder="e.g. 001, 002, 145A" value={booth} onChange={(e) => setBooth(e.target.value)} className="w-full p-5 bg-slate-50 border-2 border-slate-50 rounded-3xl focus:border-primary-500 font-bold text-lg" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">Polling Station No.</label>
                                            <input type="text" placeholder="e.g. 145" value={psNo} onChange={(e) => setPsNo(e.target.value)} className="w-full p-5 bg-slate-50 border-2 border-slate-50 rounded-3xl focus:border-primary-500 font-bold text-lg" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">Polling Station Name</label>
                                            <input type="text" placeholder="e.g. GHS Trippunithura" value={psName} onChange={(e) => setPsName(e.target.value)} className="w-full p-5 bg-slate-50 border-2 border-slate-50 rounded-3xl focus:border-primary-500 font-bold text-lg" />
                                        </div>
                                    </div>
                                    <div className="border-t pt-8">
                                        <label className="border-4 border-dashed border-slate-100 rounded-[40px] p-16 block text-center cursor-pointer hover:bg-primary-50 transition-all">
                                            <input type="file" onChange={(e) => setFile(e.target.files[0])} className="hidden" accept=".pdf" />
                                            <span className="text-5xl mb-4 block">{file ? "✅" : "📄"}</span>
                                            <h3 className="font-black text-slate-800 uppercase tracking-tight">{file ? file.name : "Drop PDF Document"}</h3>
                                        </label>
                                    </div>
                                    <button onClick={handleInitialUpload} className="w-full bg-primary-600 text-white py-6 rounded-3xl text-xl font-black uppercase tracking-widest shadow-2xl hover:bg-primary-700 transition-all">Initialize Engine</button>
                                </div>
                            )}

                            {stage === 'converting' && (
                                <div className="bg-white rounded-[40px] p-12 shadow-xl text-center space-y-8 animate-in">
                                    <h2 className="text-3xl font-black uppercase tracking-tighter">Segmenting Document</h2>
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-[10px] font-black uppercase text-slate-400">
                                            <span>Conversion Progress</span>
                                            <span>{Math.round(((status.pages_processed || 0) / (status.total_pages || 1)) * 100)}%</span>
                                        </div>
                                        <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
                                            <div className="h-full bg-primary-500 transition-all duration-500" style={{ width: `${((status.pages_processed || 0) / (status.total_pages || 1)) * 100}%` }}></div>
                                        </div>
                                        <p className="text-xl font-bold text-slate-800">{(status.pages_processed || 0)} / {(status.total_pages || 0)} Pages</p>
                                    </div>
                                    {status.status === 'extracted' && <button onClick={handleStartOCR} className="w-full bg-primary-600 text-white py-6 rounded-3xl font-black uppercase tracking-widest shadow-xl">Start Neural OCR</button>}
                                </div>
                            )}

                            {stage === 'ocr' && (
                                <div className="bg-white rounded-[40px] p-12 shadow-xl text-center space-y-8 animate-in">
                                    <h2 className="text-3xl font-black uppercase tracking-tighter">Neural OCR Activity</h2>
                                    <div className="space-y-4">
                                        <div className="flex justify-between text-[10px] font-black uppercase text-slate-400">
                                            <span>Deep Learning Extraction</span>
                                            <span>{Math.round(((status.voters_processed || 0) / (status.total_voters || 1)) * 100)}%</span>
                                        </div>
                                        <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
                                            <div className="h-full bg-emerald-500 transition-all duration-300" style={{ width: `${((status.voters_processed || 0) / (status.total_voters || 1)) * 100}%` }}></div>
                                        </div>
                                        <p className="text-4xl font-black text-emerald-600">{(status.voters_processed || 0)} / {(status.total_voters || 0)} Voters</p>

                                        <div className="grid grid-cols-2 gap-4 mt-4">
                                            <div className="bg-emerald-50 p-4 rounded-2xl">
                                                <p className="text-[10px] font-black text-emerald-600 uppercase">Clean</p>
                                                <p className="text-xl font-black">{status.clean_count || 0}</p>
                                            </div>
                                            <div className="bg-rose-50 p-4 rounded-2xl">
                                                <p className="text-[10px] font-black text-rose-600 uppercase">Flagged</p>
                                                <p className="text-xl font-black">{status.flagged_count || 0}</p>
                                            </div>
                                        </div>
                                    </div>
                                    {status.status === 'processed' && <button onClick={() => setStage('results')} className="w-full bg-slate-900 text-white py-6 rounded-3xl font-black uppercase tracking-widest shadow-2xl">Review Summary</button>}
                                </div>
                            )}

                            {stage === 'results' && (
                                <div className="space-y-10 animate-in">
                                    <div className="grid grid-cols-3 gap-8">
                                        <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100">
                                            <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Total</p>
                                            <p className="text-5xl font-black tracking-tighter">{status.total_voters || 0}</p>
                                        </div>
                                        <div className="bg-emerald-50 p-8 rounded-[40px] shadow-sm border border-emerald-100">
                                            <p className="text-[10px] font-black uppercase text-emerald-500 mb-1">Clean</p>
                                            <p className="text-5xl font-black text-emerald-700 tracking-tighter">{status.clean_count || 0}</p>
                                        </div>
                                        <div className="bg-rose-50 p-8 rounded-[40px] shadow-sm border border-rose-100">
                                            <p className="text-[10px] font-black uppercase text-rose-500 mb-1">Flagged</p>
                                            <p className="text-5xl font-black text-rose-700 tracking-tighter">{status.flagged_count || 0}</p>
                                        </div>
                                    </div>
                                    <div className="bg-white p-12 rounded-[40px] shadow-xl border border-slate-100 flex gap-6">
                                        <button
                                            disabled={!status.flagged_count}
                                            onClick={() => {
                                                const flagged = (status.results || []).filter(r => r.Status !== '✅ OK');
                                                if (flagged.length > 0) {
                                                    setEditData({ ...flagged[0] });
                                                    setStage('review');
                                                }
                                            }}
                                            className="flex-1 bg-amber-500 text-white py-6 rounded-3xl font-black uppercase tracking-widest hover:bg-amber-600 shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            Manual Review
                                        </button>
                                        <button onClick={handleFinalSave} className="flex-1 bg-primary-600 text-white py-6 rounded-3xl font-black uppercase tracking-widest hover:bg-primary-700 shadow-xl">Commit to Database</button>
                                    </div>
                                </div>
                            )}

                            {stage === 'review' && (
                                <div className="animate-in grid grid-cols-2 gap-10 items-start">
                                    <div className="bg-slate-900 rounded-[40px] p-6 shadow-2xl sticky top-28">
                                        <img src={`/api/voter-image/${batchId}/${editData.image_name}`} alt="Box" className="w-full h-auto bg-white rounded-2xl" />
                                    </div>
                                    <div className="bg-white rounded-[40px] p-10 shadow-xl border border-slate-100 space-y-6">
                                        <h3 className="text-2xl font-black uppercase tracking-tighter">OCR Correction</h3>
                                        <div className="space-y-4">
                                            {[
                                                { k: 'Full Name', l: 'Full Name' },
                                                { k: 'Relation Name', l: 'Guardian' },
                                                { k: 'House Name', l: 'House Name' },
                                                { k: 'EPIC_ID', l: 'EPIC ID' },
                                                { k: 'Age', l: 'Age', type: 'number' },
                                                { k: 'Gender', l: 'Gender' },
                                            ].map(f => (
                                                <div key={f.k}>
                                                    <label className="block text-[8px] font-black text-slate-400 tracking-widest uppercase mb-1">{f.l}</label>
                                                    <input type={f.type || 'text'} value={editData[f.k] || ''} onChange={(e) => setEditData({ ...editData, [f.k]: e.target.value })} className="w-full p-4 bg-slate-50 border-2 border-slate-50 rounded-2xl focus:border-primary-500 font-bold" />
                                                </div>
                                            ))}
                                        </div>
                                        <div className="flex gap-4 pt-6">
                                            <button onClick={() => setStage('results')} className="flex-1 font-black uppercase text-xs p-6 border rounded-2xl">Skip</button>
                                            <button onClick={saveCorrection} className="flex-[2] bg-emerald-600 text-white p-6 rounded-2xl font-black uppercase shadow-lg">Save & Next</button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )
                }

                {/* Voter Slip Design View */}
                {
                    view === 'design' && (
                        <div className="w-full flex-1 flex flex-col items-center py-12 px-6 gap-8 animate-in min-h-full print:p-0 print:gap-0 bg-slate-100/50">
                            <header className="mb-8 text-center w-full max-w-4xl no-print flex justify-between items-end">
                                <div className="text-left">
                                    <h1 className="text-4xl font-black tracking-tighter uppercase text-slate-800">Voter Slip Engine</h1>
                                    <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mt-2">Print Pipeline: {voterList.length > 0 ? `${voterList.length} Real Records` : "Dummy Preview Mode"}</p>
                                </div>
                                <div className="flex gap-4 items-center bg-white p-4 rounded-3xl shadow-sm border">
                                    <div className="text-right">
                                        <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Branding Theme</label>
                                        <select
                                            value={activePrintParty?.id || ''}
                                            onChange={(e) => setActivePrintParty(allParties.find(p => p.id == e.target.value))}
                                            className="p-3 bg-slate-50 rounded-xl text-xs font-black uppercase border-none focus:ring-0"
                                        >
                                            <option value="">Default (INC)</option>
                                            {allParties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                        </select>
                                    </div>
                                    <button onClick={() => window.print()} className="bg-primary-600 text-white px-8 py-3 rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg hover:scale-105 transition-all">Print A4 Slips</button>
                                </div>
                            </header>

                            <div className="grid grid-cols-2 gap-4 w-fit mx-auto print:gap-0 print:grid-cols-2">
                                {(voterList.length > 0 ? voterList : [...Array(8)]).map((v, i) => (
                                    <VoterSlip
                                        key={v?.id || i}
                                        voterName={v?.full_name || (i % 2 === 0 ? "ശ്രീരാം വെങ്കിട്ടരാമൻ" : "അനില ജോർജ്")}
                                        serialNo={v?.serial_no || (124 + i)}
                                        epicNo={v?.epic_id || (i % 2 === 0 ? "KL/12/345/678901" : "WQR1234567")}
                                        boothNo={v?.booth_no || "45"}
                                        pollingStation={v?.ps_name || "ഗവ. ഹയർ സെക്കൻഡറി സ്കൂൾ, തൃപ്പൂണിത്തുറ"}
                                        constituency={v?.constituency || "തൃപ്പൂണിത്തുറ"}
                                        party={activePrintParty}
                                    />
                                ))}
                            </div>
                        </div>
                    )
                }
            </main >

            {/* Editing DB Modal */}
            {
                editMode && (
                    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
                        <div className="bg-white w-full max-w-lg rounded-[40px] p-12 shadow-2xl animate-in space-y-8">
                            <h2 className="text-3xl font-black uppercase tracking-tighter">Local Representative Edit</h2>
                            <div className="grid grid-cols-2 gap-6">
                                {[
                                    { k: 'full_name', l: 'Full Name' },
                                    { k: 'epic_id', l: 'EPIC ID' },
                                    { k: 'house_name', l: 'House Name' },
                                    { k: 'house_no', l: 'House No' },
                                    { k: 'age', l: 'Age', type: 'number' },
                                    { k: 'phone_no', l: 'Phone Number' },
                                ].map(f => (
                                    <div key={f.k} className={f.k === 'full_name' ? 'col-span-2' : ''}>
                                        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{f.l}</label>
                                        <input type={f.type || 'text'} value={editData[f.k] || ''} onChange={(e) => setEditData({ ...editData, [f.k]: e.target.value })} className="w-full p-4 bg-slate-50 border-2 border-slate-50 rounded-2xl focus:border-primary-500 font-bold" />
                                    </div>
                                ))}

                                {/* Campaign Intelligence Dropdowns */}
                                <div>
                                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Current Location</label>
                                    <select value={editData.current_location || ''} onChange={(e) => setEditData({ ...editData, current_location: e.target.value })} className="w-full p-4 bg-blue-50/50 border-2 border-transparent rounded-2xl focus:border-primary-500 font-bold">
                                        <option value="">Unassigned</option>
                                        <option value="LOCAL">Local</option>
                                        <option value="ABROAD">Abroad</option>
                                        <option value="STATE">Another State</option>
                                        <option value="DISTRICT">Another District</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Voter Leaning</label>
                                    <select value={editData.voter_leaning || ''} onChange={(e) => setEditData({ ...editData, voter_leaning: e.target.value })} className="w-full p-4 bg-amber-50/50 border-2 border-transparent rounded-2xl focus:border-primary-500 font-bold">
                                        <option value="">Unassigned</option>
                                        <option value="SUPPORTER">Supporter</option>
                                        <option value="NEUTRAL">Neutral</option>
                                        <option value="OPPONENT">Opponent</option>
                                    </select>
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Voting Probability</label>
                                    <select value={editData.voting_probability || ''} onChange={(e) => setEditData({ ...editData, voting_probability: e.target.value })} className="w-full p-4 bg-emerald-50/50 border-2 border-transparent rounded-2xl focus:border-primary-500 font-bold">
                                        <option value="">Unassigned</option>
                                        <option value="CONFIRMED">Confirmed</option>
                                        <option value="LIKELY">Likely</option>
                                        <option value="UNLIKELY">Unlikely</option>
                                        <option value="OUT_OF_STATION">Out of Station</option>
                                    </select>
                                </div>
                            </div>
                            <div className="flex gap-4 pt-6">
                                <button onClick={() => setEditMode(false)} className="flex-1 font-black uppercase text-xs p-5 border rounded-2xl">Cancel</button>
                                <button onClick={saveCorrection} className="flex-[2] bg-primary-600 text-white p-5 rounded-2xl font-black uppercase shadow-lg">Update Voter</button>
                            </div>
                        </div>
                    </div>
                )
            }
            {/* Success Overlay */}
            {
                showSuccess && (
                    <div className="fixed inset-0 bg-emerald-600/90 backdrop-blur-md z-[200] flex flex-col items-center justify-center text-white animate-in">
                        <div className="bg-white/20 p-10 rounded-full mb-8 animate-bounce">
                            <span className="text-8xl">✅</span>
                        </div>
                        <h2 className="text-4xl font-black uppercase tracking-tighter">Database Committed</h2>
                        <p className="font-bold opacity-80 uppercase tracking-widest mt-2">Booth {booth} Sync Complete</p>
                    </div>
                )
            }
        </div >
    );
};

export default App;
