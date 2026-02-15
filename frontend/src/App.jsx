import React, { useState, useEffect, useMemo } from 'react';
import api from './api';
import VoterSlip from './components/VoterSlip';
import {
    PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
    BarChart, Bar, XAxis, YAxis, CartesianGrid, LabelList,
    RadialBarChart, RadialBar, Legend
} from 'recharts';

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
    const [loginConsent, setLoginConsent] = useState(false);

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
    const [newUserData, setNewUserData] = useState({
        username: '',
        password: '',
        role: 'BOOTH_AGENT',
        can_download: false,
        can_upload: false,
        can_verify: true,
        can_edit_voters: true,
        can_send_broadcasts: false,
        can_manage_system: false,
        assignments: { constituencies: [], local_bodies: [], booths: [] }
    });
    const [allParties, setAllParties] = useState([]);
    const [newPartyData, setNewPartyData] = useState({ name: '', shortLabel: '', color: '#000080', gradient: 'linear-gradient(to bottom, #FF9933, #ffffff, #138808)' });
    const [newPartyFile, setNewPartyFile] = useState(null);
    const [activePrintParty, setActivePrintParty] = useState(null);
    const [assignSelection, setAssignSelection] = useState({ constId: '', lbId: '' });
    const [editingUser, setEditingUser] = useState(null);

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

    // Communication State
    const [commStats, setCommStats] = useState({ total_sent: 0, whatsapp: 0, sms: 0, calls: 0, status_dist: {} });
    const [commTemplates, setCommTemplates] = useState([]);
    const [selectedVotersForComm, setSelectedVotersForComm] = useState([]);
    const [newTemplate, setNewTemplate] = useState({ name: '', msg_type: 'WA', content: '' });

    // Modals & Status
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [apiHealth, setApiHealth] = useState(null);
    const [editMode, setEditMode] = useState(false);
    const [editData, setEditData] = useState({});
    const [showSuccess, setShowSuccess] = useState(false);

    useEffect(() => {
        checkHealth();
        if (isLoggedIn) {
            loadConstituencies();
            if (view === 'dashboard') { loadStats(); if (!allLocations.length) loadAdminData(); }
            if (view === 'voters' || view === 'design') { loadVoters(); if (!allLocations.length) loadAdminData(); }
            if (view === 'admin' || view === 'design' || view === 'engine') { loadAdminData(); loadParties(); }
            if (view === 'comm') { loadCommData(); }
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
            }, view === 'design' ? 2500 : 50);
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

    const loadCommData = async () => {
        try {
            const [stats, tmpl] = await Promise.all([api.getCommStats(), api.getTemplates()]);
            setCommStats(stats);
            setCommTemplates(tmpl);
        } catch (e) { console.error("Failed to load comm data", e); }
    };

    const handleSendBroadcast = async (templateId) => {
        if (selectedVotersForComm.length === 0) {
            alert("Please select voters first");
            return;
        }
        setLoading(true);
        try {
            const res = await api.sendComm({ voter_ids: selectedVotersForComm, template_id: templateId });
            alert(`Broadcast Initiated: ${res.success} Sent, ${res.failed} Failed.`);
            setSelectedVotersForComm([]);
            loadCommData();
        } catch (e) { setError(e.message); }
        finally { setLoading(false); }
    };

    const handleCreateTemplate = async () => {
        if (!newTemplate.name || !newTemplate.content) { alert("Missing fields"); return; }
        setLoading(true);
        try {
            await api.createTemplate(newTemplate);
            setNewTemplate({ name: '', msg_type: 'WA', content: '' });
            loadCommData();
        } catch (e) { setError(e.message); }
        finally { setLoading(false); }
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

    const handleFinalSave = async () => {
        setLoading(true); setError(null);
        try {
            const res = await api.saveToDB(batchId, constituency, lgbType, lgbName, booth, psNo, psName);
            if (res.success) {
                setShowSuccess(true);
                setTimeout(() => {
                    setShowSuccess(false);
                    handleCycleReset();
                    loadStats();
                    loadAdminData();
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

    const handleUpdateIntel = async (voterId, updates) => {
        try {
            const res = await api.editVoterInDB(voterId, updates);
            if (res.success) {
                setVoterList(prev => prev.map(v => v.id === voterId ? { ...v, ...updates } : v));
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
                setNewUserData({
                    username: '',
                    password: '',
                    role: 'BOOTH_AGENT',
                    can_download: false,
                    can_upload: false,
                    can_verify: true,
                    can_edit_voters: true,
                    can_send_broadcasts: false,
                    can_manage_system: false,
                    assignments: { constituencies: [], local_bodies: [], booths: [] }
                });
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

    const handleUpdateUser = async () => {
        try {
            setLoading(true);
            const res = await api.updateManagedUser(editingUser.id, {
                role: newUserData.role,
                assignments: newUserData.assignments,
                can_download: newUserData.can_download,
                can_upload: newUserData.can_upload,
                can_verify: newUserData.can_verify,
                can_edit_voters: newUserData.can_edit_voters,
                can_send_broadcasts: newUserData.can_send_broadcasts,
                can_manage_system: newUserData.can_manage_system
            });
            if (res.success) {
                loadAdminData();
                setEditingUser(null);
                setNewUserData({
                    username: '',
                    password: '',
                    role: 'BOOTH_AGENT',
                    can_download: false,
                    can_upload: false,
                    can_verify: true,
                    can_edit_voters: true,
                    can_send_broadcasts: false,
                    can_manage_system: false,
                    assignments: { constituencies: [], local_bodies: [], booths: [] }
                });
                setAssignSelection({ constId: '', lbId: '' });
                alert("User updated successfully!");
            } else alert(res.message);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const startEditUser = (u) => {
        setEditingUser(u);
        setNewUserData({
            username: u.username,
            role: u.role,
            can_download: u.can_download,
            can_upload: u.can_upload,
            can_verify: u.can_verify,
            can_edit_voters: u.can_edit_voters,
            can_send_broadcasts: u.can_send_broadcasts,
            can_manage_system: u.can_manage_system,
            assignments: {
                constituencies: u.constituency_ids || [],
                local_bodies: u.local_body_ids || [],
                booths: u.booth_ids || []
            }
        });
        setAssignSelection({ constId: '', lbId: '' });
        window.scrollTo({ top: 0, behavior: 'smooth' });
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
                        <div className="flex items-start gap-3 px-1 text-slate-500">
                            <input type="checkbox" checked={loginConsent} onChange={(e) => setLoginConsent(e.target.checked)} id="consent" className="mt-1 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900" />
                            <label htmlFor="consent" className="text-xs font-semibold leading-relaxed">
                                I agree to the <a href="#" onClick={(e) => { e.preventDefault(); alert("View docs/PRIVACY_POLICY.md"); }} className="text-slate-900 underline">Privacy Policy</a> and <a href="#" onClick={(e) => { e.preventDefault(); alert("View docs/TERMS_OF_SERVICE.md"); }} className="text-slate-900 underline">Terms of Service</a>.
                                I understand that my access is monitored for audit purposes.
                            </label>
                        </div>
                        <button type="submit" disabled={loading || !loginConsent} className="w-full bg-slate-900 disabled:bg-slate-300 text-white py-5 rounded-2xl font-black uppercase">{loading ? "Wait..." : "Sign In"}</button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 flex font-sans">
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
                        ...(['SUPERUSER', 'CONSTITUENCY_ADMIN', 'LOCAL_BODY_HEAD', 'ZONE_COMMANDER'].includes(userRole) ? [{ id: 'admin', label: 'Admin Hub', icon: '🛡️' }] : [])
                    ].map(item => (
                        <button key={item.id} onClick={() => setView(item.id)} className={`w-full text-left p-4 rounded-2xl flex items-center gap-4 transition-all ${view === item.id ? 'bg-primary-600 text-white shadow-lg scale-105 font-black' : 'text-slate-400 hover:bg-slate-800 font-bold'}`}>
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

            <main className={`flex-1 flex flex-col overflow-y-auto ${view === 'design' ? 'bg-slate-200 p-0' : 'p-12'}`}>
                {view === 'dashboard' && dashboardStats && (
                    <div className="space-y-12 animate-in">
                        <header className="flex justify-between items-end border-b pb-6">
                            <div>
                                <h1 className="text-5xl font-black tracking-tighter uppercase">Voter Insight</h1>
                                <p className="text-slate-400 font-bold uppercase tracking-widest text-xs mt-2">Constituency Analytics Dashboard</p>
                            </div>
                            <div className="flex gap-4 mb-1">
                                <div className="flex flex-col gap-1">
                                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Constituency</label>
                                    <select className="bg-white border-2 border-slate-100 rounded-2xl px-5 py-3 text-xs font-bold focus:border-primary-500 shadow-sm hover:border-slate-300 transition-all cursor-pointer" value={dashFilters.constituency} onChange={(e) => setDashFilters({ ...dashFilters, constituency: e.target.value, booth: '' })}>
                                        <option value="">Global View (All)</option>
                                        {allLocations.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Booth Unit</label>
                                    <select className="bg-white border-2 border-slate-100 rounded-2xl px-5 py-3 text-xs font-bold focus:border-primary-500 shadow-sm hover:border-slate-300 transition-all cursor-pointer disabled:opacity-50" value={dashFilters.booth} disabled={!dashFilters.constituency} onChange={(e) => setDashFilters({ ...dashFilters, booth: e.target.value })}>
                                        <option value="">All Booths</option>
                                        {dashFilters.constituency && allLocations.find(c => String(c.id) === String(dashFilters.constituency))?.local_bodies.flatMap(lb => lb.booths).sort((a, b) => a.number - b.number).map(b => <option key={b.id} value={b.id}>Booth {b.number} - {b.name || b.polling_station_name}</option>)}
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

                        <div className="grid grid-cols-3 gap-8">
                            <div className="bg-white p-10 rounded-[40px] shadow-sm border border-slate-100 flex flex-col h-[420px]">
                                <h3 className="font-black uppercase tracking-widest text-[10px] text-slate-400 mb-4 border-b pb-4">Voter Sentiment</h3>
                                <div className="flex-1 w-full relative">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={[{ name: 'UDF', value: dashboardStats.sentiment?.UDF || 0 }, { name: 'LDF', value: dashboardStats.sentiment?.LDF || 0 }, { name: 'NDA', value: dashboardStats.sentiment?.NDA || 0 }, { name: 'Neutral', value: dashboardStats.sentiment?.Neutral || 0 }].filter(d => d.value > 0)} innerRadius={65} outerRadius={90} paddingAngle={8} dataKey="value" stroke="none">
                                                {['#3b82f6', '#ef4444', '#f97316', '#64748b'].map((color, index) => <Cell key={`cell-${index}`} fill={color} />)}
                                            </Pie>
                                            <Tooltip contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pt-4">
                                        <span className="text-3xl font-black text-slate-800">{dashboardStats.total}</span>
                                        <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Voters</span>
                                    </div>
                                </div>
                                <div className="grid grid-cols-4 gap-2 mt-4">
                                    {[{ l: 'UDF', c: '#3b82f6', v: dashboardStats.sentiment?.UDF || 0 }, { l: 'LDF', c: '#ef4444', v: dashboardStats.sentiment?.LDF || 0 }, { l: 'NDA', c: '#f97316', v: dashboardStats.sentiment?.NDA || 0 }, { l: 'Neutral', c: '#64748b', v: dashboardStats.sentiment?.Neutral || 0 }].map(s => (
                                        <div key={s.l} className="text-center">
                                            <div className="w-2 h-2 rounded-full mx-auto mb-1" style={{ backgroundColor: s.c }}></div>
                                            <p className="text-[9px] font-black text-slate-400 uppercase">{s.l}</p>
                                            <p className="text-xs font-black">{s.v}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-white p-10 rounded-[40px] shadow-sm border border-slate-100 flex flex-col h-[420px]">
                                <h3 className="font-black uppercase tracking-widest text-[10px] text-slate-400 mb-4 border-b pb-4">Geographical Logistics</h3>
                                <div className="flex-1 w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <RadialBarChart cx="50%" cy="50%" innerRadius="30%" outerRadius="100%" barSize={15} data={[{ name: 'Local', value: dashboardStats.location?.local || 0, fill: '#10b981' }, { name: 'Abroad', value: dashboardStats.location?.abroad || 0, fill: '#3b82f6' }, { name: 'State', value: dashboardStats.location?.state || 0, fill: '#f59e0b' }, { name: 'District', value: dashboardStats.location?.district || 0, fill: '#64748b' }]}>
                                            <RadialBar background dataKey="value" cornerRadius={10} />
                                            <Tooltip contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }} />
                                        </RadialBarChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="space-y-1">
                                    {[{ l: 'Local', v: dashboardStats.location?.local || 0, c: '#10b981' }, { l: 'Abroad', v: dashboardStats.location?.abroad || 0, c: '#3b82f6' }, { l: 'Other State', v: dashboardStats.location?.state || 0, c: '#f59e0b' }, { l: 'Other District', v: dashboardStats.location?.district || 0, c: '#64748b' }].map(i => (
                                        <div key={i.l} className="flex justify-between items-center text-[10px]">
                                            <span className="font-bold text-slate-400 uppercase">{i.l}</span>
                                            <span className="font-black" style={{ color: i.c }}>{i.v}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-primary-600 text-white p-10 rounded-[40px] shadow-xl relative overflow-hidden flex flex-col justify-between h-[420px]">
                                <div className="relative z-10">
                                    <h3 className="font-black uppercase tracking-widest text-[10px] opacity-60 mb-8">Outreach Coverage</h3>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-6xl font-black tracking-tighter">{dashboardStats.outreach?.with_phone || 0}</span>
                                        <span className="text-lg font-bold opacity-60 uppercase">Collected</span>
                                    </div>
                                    <p className="text-[10px] font-black uppercase mt-4 tracking-widest opacity-60 italic">"Target: Digital saturation of local voters"</p>
                                </div>
                                <div className="relative z-10">
                                    <div className="flex justify-between items-end mb-2">
                                        <span className="text-4xl font-black tracking-tighter">{Math.round(((dashboardStats.outreach?.with_phone || 0) / (dashboardStats.total || 1)) * 100)}%</span>
                                        <span className="text-[10px] uppercase font-black opacity-60">Efficiency</span>
                                    </div>
                                    <div className="h-4 bg-primary-800 rounded-full overflow-hidden shadow-inner">
                                        <div className="h-full bg-white transition-all duration-1000" style={{ width: `${((dashboardStats.outreach?.with_phone || 0) / (dashboardStats.total || 1)) * 100}%` }}></div>
                                    </div>
                                </div>
                                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20 blur-3xl"></div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-8">
                            <div className="bg-white p-10 rounded-[40px] shadow-sm border border-slate-100 h-[280px] flex gap-10">
                                <div className="w-1/3 flex flex-col">
                                    <h3 className="font-black uppercase tracking-widest text-[10px] text-slate-400 mb-6 border-b pb-4">Ground Status</h3>
                                    <div className="flex-1 flex flex-col justify-center">
                                        <span className="text-5xl font-black text-slate-800 tracking-tighter">{Math.round(((dashboardStats.tagging_progress || 0) / (dashboardStats.total || 1)) * 100)}%</span>
                                        <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Verified Tags</span>
                                    </div>
                                </div>
                                <div className="flex-1 flex items-center justify-center p-4 bg-slate-50 rounded-[30px] border border-slate-100 shadow-inner">
                                    <div className="text-center space-y-2">
                                        <p className="text-[10px] font-black uppercase text-slate-400">Total Tagged Records</p>
                                        <p className="text-4xl font-black text-slate-900">{dashboardStats.tagging_progress || 0}</p>
                                        <div className="w-16 h-1.5 bg-emerald-500 mx-auto rounded-full"></div>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-emerald-600 text-white p-10 rounded-[40px] shadow-xl flex flex-col justify-between h-[280px]">
                                <div>
                                    <h3 className="font-black uppercase tracking-widest text-[10px] opacity-60 mb-8">Work Strategy</h3>
                                    <h2 className="text-4xl font-black uppercase tracking-tighter leading-tight">Focus on Neutral Voters</h2>
                                    <p className="text-sm font-bold opacity-80 mt-2 max-w-sm">Targeting <span className="text-white underline decoration-amber-400 decoration-4 underline-offset-4 font-black">{dashboardStats.sentiment?.neutral || 0} neutral voters</span> can flip the results.</p>
                                </div>
                                <button onClick={() => { setListFilters({ ...listFilters, leaning: 'NEUTRAL' }); setView('voters'); }} className="w-fit bg-white text-emerald-600 px-10 py-4 rounded-2xl font-black uppercase text-[11px] tracking-widest shadow-lg hover:scale-105 transition-all">Filter Neutral List</button>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-8 pb-12">
                            <div className="bg-white p-10 rounded-[40px] shadow-sm border border-slate-100 col-span-2 h-[450px] flex flex-col">
                                <h3 className="font-black uppercase tracking-widest text-[10px] text-slate-400 mb-10 border-b pb-4">Voter Age Brackets</h3>
                                <div className="flex-1 w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={Object.entries(dashboardStats.age_dist).map(([label, count]) => ({ name: label.replace('_', '-'), voters: count }))} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                                            <defs><linearGradient id="ageColor" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#4f46e5" stopOpacity={0.8} /><stop offset="95%" stopColor="#4f46e5" stopOpacity={0.2} /></linearGradient></defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900, fill: '#94a3b8' }} dy={10} />
                                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900, fill: '#94a3b8' }} />
                                            <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }} />
                                            <Bar dataKey="voters" fill="url(#ageColor)" radius={[10, 10, 0, 0]} barSize={40}><LabelList dataKey="voters" position="top" style={{ fontSize: 10, fontWeight: 900, fill: '#4f46e5' }} /></Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                            <div className="bg-slate-900 text-white p-10 rounded-[40px] shadow-2xl relative overflow-hidden h-[450px] flex flex-col justify-between">
                                <div className="z-10 relative">
                                    <h3 className="font-black uppercase tracking-widest text-[10px] text-slate-500 mb-2">Data Acquisition</h3>
                                    <h2 className="text-4xl font-black mb-6 uppercase tracking-tighter">Expand Booth Data</h2>
                                    <button onClick={() => setView('engine')} className="bg-primary-600 text-white px-10 py-5 rounded-3xl font-black uppercase text-[12px] tracking-widest hover:scale-105 transition-all shadow-xl shadow-primary-900/40">Launch Engine ⚡</button>
                                </div>
                                <div className="absolute -right-20 -top-20 w-80 h-80 bg-primary-600/10 rounded-full blur-[100px]"></div>
                            </div>
                        </div>
                    </div>
                )}

                {view === 'voters' && (
                    <div className="space-y-8 animate-in">
                        <header className="flex justify-between items-center">
                            <div>
                                <h1 className="text-4xl font-black tracking-tighter uppercase">Voters List</h1>
                                <p className="text-slate-400 font-bold uppercase tracking-widest text-xs mt-1">Found {voterTotal} records</p>
                            </div>
                            <div className="flex gap-4 items-center">
                                <button onClick={() => api.exportVoters({ search: searchQuery, constituency: listFilters.constituency, lb: listFilters.lb, booth: listFilters.booth, gender: listFilters.gender, age_from: listFilters.ageFrom, age_to: listFilters.ageTo, leaning: listFilters.leaning })} disabled={currentUser?.role !== 'SUPERUSER' && !currentUser?.can_download} className="px-6 py-4 bg-primary-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-primary-700 shadow-lg disabled:opacity-50">Export CSV 📥</button>
                                <button onClick={() => setView('design')} className="px-6 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-800 shadow-lg font-bold">Generate Slips 🖨️</button>
                                <input type="text" placeholder="Search..." className="p-4 bg-white border border-slate-200 rounded-2xl font-bold text-sm w-72 shadow-sm" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                            </div>
                        </header>

                        <div className="bg-white p-4 rounded-[30px] border border-slate-100 flex flex-wrap gap-4 items-end shadow-sm">
                            <div className="flex-1 min-w-[150px] space-y-1">
                                <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest pl-2">Constituency</label>
                                <select className="w-full p-2 bg-slate-50 rounded-xl text-xs font-bold border-none" value={listFilters.constituency} onChange={(e) => setListFilters({ ...listFilters, constituency: e.target.value, lb: '', booth: '' })}>
                                    <option value="">All Constituencies</option>
                                    {allLocations.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div className="flex-1 min-w-[150px] space-y-1">
                                <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest pl-2">Local Body</label>
                                <select disabled={!listFilters.constituency} className="w-full p-2 bg-slate-50 rounded-xl text-xs font-bold border-none" value={listFilters.lb} onChange={(e) => setListFilters({ ...listFilters, lb: e.target.value, booth: '' })}>
                                    <option value="">All Local Bodies</option>
                                    {allLocations.find(c => String(c.id) === String(listFilters.constituency))?.local_bodies.map(lb => <option key={lb.id} value={lb.id}>{lb.name}</option>)}
                                </select>
                            </div>
                            <div className="flex-1 min-w-[150px] space-y-1">
                                <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest pl-2">Booth</label>
                                <select disabled={!listFilters.lb} className="w-full p-2 bg-slate-50 rounded-xl text-xs font-bold border-none" value={listFilters.booth} onChange={(e) => setListFilters({ ...listFilters, booth: e.target.value })}>
                                    <option value="">All Booths</option>
                                    {allLocations.find(c => String(c.id) === String(listFilters.constituency))?.local_bodies.find(lb => String(lb.id) === String(listFilters.lb))?.booths.map(b => <option key={b.id} value={b.id}>Booth {b.number}</option>)}
                                </select>
                            </div>
                            <div className="w-[80px] space-y-1">
                                <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest pl-2">Gender</label>
                                <select className="w-full p-2 bg-slate-50 rounded-xl text-xs font-bold border-none" value={listFilters.gender} onChange={(e) => setListFilters({ ...listFilters, gender: e.target.value })}>
                                    <option value="">All</option>
                                    <option value="MALE">M</option>
                                    <option value="FEMALE">F</option>
                                    <option value="TRANSGENDER">T</option>
                                </select>
                            </div>
                            <div className="w-[80px] space-y-1">
                                <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest pl-2">Age From</label>
                                <input type="number" placeholder="Min" className="w-full p-2 bg-slate-50 rounded-xl text-xs font-bold border-none" value={listFilters.ageFrom} onChange={(e) => setListFilters({ ...listFilters, ageFrom: e.target.value })} />
                            </div>
                            <div className="w-[80px] space-y-1">
                                <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest pl-2">Age To</label>
                                <input type="number" placeholder="Max" className="w-full p-2 bg-slate-50 rounded-xl text-xs font-bold border-none" value={listFilters.ageTo} onChange={(e) => setListFilters({ ...listFilters, ageTo: e.target.value })} />
                            </div>
                            <div className="w-[120px] space-y-1">
                                <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest pl-2">Sentiment</label>
                                <select className="w-full p-2 bg-slate-50 rounded-xl text-xs font-bold border-none" value={listFilters.leaning} onChange={(e) => setListFilters({ ...listFilters, leaning: e.target.value })}>
                                    <option value="">All</option>
                                    <option value="UDF">UDF</option>
                                    <option value="LDF">LDF</option>
                                    <option value="NDA">NDA</option>
                                    <option value="NEUTRAL">Neutral</option>
                                </select>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => { loadVoters(); loadAdminData(); }} className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 shadow-md">Apply</button>
                                <button onClick={() => { setListFilters({ constituency: '', lb: '', booth: '', gender: '', ageFrom: '', ageTo: '', leaning: '' }); setSearchQuery(''); }} className="px-5 py-2.5 bg-slate-100 text-slate-400 rounded-xl text-[10px] font-black uppercase hover:bg-slate-200">Clear</button>
                            </div>
                        </div>


                        <div className="bg-white rounded-[20px] shadow-sm border border-slate-100 overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-slate-50 border-b">
                                    <tr className="text-[9px] font-black uppercase text-slate-500">
                                        <th className="px-4 py-3 border-r text-center">
                                            <input type="checkbox" checked={voterList.length > 0 && selectedVotersForComm.length === voterList.length} onChange={(e) => setSelectedVotersForComm(e.target.checked ? voterList.map(v => v.id) : [])} className="w-4 h-4 rounded border-slate-300 text-primary-600" />
                                        </th>
                                        <th className="px-4 py-3">Sl No</th>
                                        <th className="px-4 py-3 min-w-[200px] border-x">Name</th>
                                        <th className="px-4 py-3 border-x">EPIC ID</th>
                                        <th className="px-4 py-3 border-x">Intel</th>
                                        <th className="px-4 py-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="text-[11px] font-medium text-slate-700 divide-y">
                                    {voterList.map(v => (
                                        <tr key={v.id} className="hover:bg-blue-50/50 odd:bg-white even:bg-slate-50/30 transition-colors">
                                            <td className="px-4 py-2 border-r text-center">
                                                <input type="checkbox" checked={selectedVotersForComm.includes(v.id)} onChange={(e) => setSelectedVotersForComm(e.target.checked ? [...selectedVotersForComm, v.id] : selectedVotersForComm.filter(id => id !== v.id))} className="w-4 h-4 rounded border-slate-300 text-primary-600" />
                                            </td>
                                            <td className="px-4 py-2 font-black text-slate-400">{v.serial_no}</td>
                                            <td className="px-4 py-2 font-bold text-slate-900 text-sm">{v.full_name}</td>
                                            <td className="px-4 py-2"><span className="bg-slate-100 px-2 py-0.5 rounded font-mono text-[10px]">{v.epic_id}</span></td>
                                            <td className="px-4 py-2 border-x">
                                                <div className="flex gap-1">
                                                    {v.voter_leaning && <span className={`px-2 py-0.5 rounded-full text-[8px] font-black text-white ${v.voter_leaning === 'UDF' ? 'bg-blue-500' : v.voter_leaning === 'LDF' ? 'bg-rose-500' : 'bg-orange-500'}`}>{v.voter_leaning}</span>}
                                                </div>
                                            </td>
                                            <td className="px-4 py-2 text-right"><button onClick={() => { setEditData(v); setEditMode(true); }} className="text-primary-600 font-black uppercase text-[9px] bg-primary-50 px-2 py-1 rounded hover:bg-primary-600 hover:text-white transition-all">Edit</button></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {view === 'admin' && (
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
                            {userRole === 'SUPERUSER' && (
                                <div className="space-y-8">
                                    <div className="bg-white p-10 rounded-[40px] shadow-xl border border-slate-100 space-y-6">
                                        <h3 className="text-xl font-black uppercase tracking-tight">Geo-Hierarchy Entry</h3>
                                        <div className="flex gap-2">
                                            {['const', 'lb', 'booth'].map(t => <button key={t} onClick={() => setNewLocData({ ...newLocData, type: t })} className={`flex-1 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all ${newLocData.type === t ? 'bg-primary-600 text-white shadow-lg' : 'bg-slate-50 text-slate-400'}`}>{t}</button>)}
                                        </div>
                                        <div className="space-y-4">
                                            {newLocData.type === 'booth' && (
                                                <>
                                                    <select value={newLocData.grandParentId} onChange={(e) => setNewLocData({ ...newLocData, grandParentId: e.target.value, parentId: '' })} className="w-full p-4 bg-slate-50 border-2 border-slate-50 rounded-2xl font-bold font-xs">
                                                        <option value="">Select Constituency...</option>
                                                        {allLocations.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                                    </select>
                                                    <select value={newLocData.parentId} onChange={(e) => setNewLocData({ ...newLocData, parentId: e.target.value })} className="w-full p-4 bg-slate-50 border-2 border-slate-50 rounded-2xl font-bold font-xs" disabled={!newLocData.grandParentId}>
                                                        <option value="">Select Local Body...</option>
                                                        {allLocations.find(c => String(c.id) === String(newLocData.grandParentId))?.local_bodies.map(lb => <option key={lb.id} value={lb.id}>{lb.name}</option>)}
                                                    </select>
                                                    <input type="text" placeholder="Booth Num" value={newLocData.boothNum} onChange={(e) => setNewLocData({ ...newLocData, boothNum: e.target.value })} className="w-full p-4 bg-slate-50 border-2 border-slate-50 rounded-2xl font-bold" />
                                                </>
                                            )}
                                            {newLocData.type !== 'booth' && <input type="text" placeholder={`${newLocData.type.toUpperCase()} Name`} value={newLocData.name} onChange={(e) => setNewLocData({ ...newLocData, name: e.target.value })} className="w-full p-4 bg-slate-50 border-2 border-slate-50 rounded-2xl font-bold" />}
                                            <button onClick={handleAddLocation} className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black uppercase text-[11px] shadow-xl">Add Location</button>
                                        </div>
                                    </div>

                                    {/* Party Management */}
                                    <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-100 space-y-8">
                                        <div className="flex items-center gap-4 border-b border-slate-50 pb-6">
                                            <div className="w-12 h-12 bg-primary-50 rounded-2xl flex items-center justify-center text-primary-600 text-xl shadow-inner">🎨</div>
                                            <div>
                                                <h3 className="text-lg font-black uppercase tracking-tight text-slate-800">Political Brand Control</h3>
                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Manage Party Identities & Symbols</p>
                                            </div>
                                        </div>

                                        <div className="space-y-6">
                                            <div className="grid grid-cols-1 gap-5">
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-black uppercase text-slate-500 px-1">Full Organization Name</label>
                                                    <input type="text" placeholder="e.g. Indian National Congress" value={newPartyData.name} onChange={(e) => setNewPartyData({ ...newPartyData, name: e.target.value })} className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all font-bold text-slate-700 outline-none" />
                                                </div>

                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-1.5">
                                                        <label className="text-[10px] font-black uppercase text-slate-500 px-1">Short Label</label>
                                                        <input type="text" placeholder="e.g. INC" value={newPartyData.shortLabel} onChange={(e) => setNewPartyData({ ...newPartyData, shortLabel: e.target.value })} className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:bg-white" />
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <label className="text-[10px] font-black uppercase text-slate-500 px-1">Quick Presets</label>
                                                        <select
                                                            onChange={(e) => {
                                                                const p = PARTY_PRESETS.find(pr => pr.label === e.target.value);
                                                                if (p) setNewPartyData({ ...newPartyData, name: p.label.split(' (')[0], shortLabel: p.short, color: p.color, gradient: p.gradient });
                                                            }}
                                                            className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-600 outline-none cursor-pointer focus:bg-white"
                                                        >
                                                            <option value="">Select Template...</option>
                                                            {PARTY_PRESETS.map(p => <option key={p.label} value={p.label}>{p.label}</option>)}
                                                        </select>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="p-5 bg-slate-50/50 rounded-2xl border border-slate-100 space-y-4">
                                                <div className="flex items-center justify-between gap-4">
                                                    <div className="flex-1 space-y-1.5">
                                                        <label className="text-[9px] font-black uppercase text-slate-400">Primary Branding Color</label>
                                                        <div className="flex items-center gap-3 bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
                                                            <input type="color" value={newPartyData.color} onChange={(e) => setNewPartyData({ ...newPartyData, color: e.target.value })} className="w-10 h-8 bg-transparent border-none rounded cursor-pointer shrink-0" />
                                                            <span className="text-[11px] font-mono font-bold text-slate-500">{newPartyData.color.toUpperCase()}</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex-1 space-y-1.5">
                                                        <label className="text-[9px] font-black uppercase text-slate-400">Identity Gradient</label>
                                                        <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-sm h-12 flex items-center">
                                                            <input type="text" value={newPartyData.gradient} onChange={(e) => setNewPartyData({ ...newPartyData, gradient: e.target.value })} className="w-full bg-transparent border-none outline-none font-mono text-[9px] text-slate-400 px-2 truncate" />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-1.5">
                                                <label className="block text-[10px] font-black text-slate-500 uppercase px-1">Official Symbol Logo</label>
                                                <div className="relative cursor-pointer group">
                                                    <input type="file" id="party-logo-input" onChange={(e) => setNewPartyFile(e.target.files[0])} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                                                    <div className="w-full py-6 bg-white border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-2 group-hover:border-primary-400 group-hover:bg-primary-50/10 transition-all">
                                                        <span className="text-2xl">{newPartyFile ? "✅" : "📤"}</span>
                                                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{newPartyFile ? newPartyFile.name : "Click to Upload Symbol"}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <button onClick={handleAddParty} className="w-full bg-slate-900 text-white py-4 rounded-xl font-black uppercase tracking-[0.1em] text-[11px] shadow-lg shadow-slate-200 active:scale-[0.98] transition-all hover:bg-slate-800">Register Branding</button>
                                        </div>

                                        <div className="pt-6 border-t border-slate-50">
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">Registered Parties</p>
                                            <div className="grid grid-cols-2 gap-3">
                                                {allParties.map(p => (
                                                    <div key={p.id} className="bg-white p-3 rounded-2xl flex items-center gap-3 border border-slate-100 shadow-sm hover:translate-y-[-2px] transition-all" style={{ borderLeft: `4px solid ${p.primary_color}` }}>
                                                        <img src={`/api/party-symbol/${p.symbol_image}`} className="w-8 h-8 object-contain rounded-lg bg-slate-50 p-1 border border-slate-100" alt={p.name} />
                                                        <div className="overflow-hidden">
                                                            <span className="text-[10px] font-black uppercase truncate block text-slate-700 leading-tight">{p.name}</span>
                                                            <span className="text-[8px] font-bold text-slate-400 uppercase leading-none">{p.short_label}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className={`space-y-8 ${userRole !== 'SUPERUSER' ? 'col-span-2' : ''}`}>
                                <div className="bg-white p-10 rounded-[40px] shadow-xl border border-slate-100 space-y-6">
                                    <h3 className="text-xl font-black uppercase tracking-tight">{editingUser ? `Update ${editingUser.username}` : 'Account Activation'}</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <input type="text" disabled={!!editingUser} placeholder="Username" value={newUserData.username} onChange={(e) => setNewUserData({ ...newUserData, username: e.target.value })} className="p-4 bg-slate-50 border-2 border-slate-50 rounded-2xl font-bold" />
                                        {!editingUser && <input type="password" placeholder="Password" value={newUserData.password} onChange={(e) => setNewUserData({ ...newUserData, password: e.target.value })} className="p-4 bg-slate-50 border-2 border-slate-50 rounded-2xl font-bold" />}
                                        <select value={newUserData.role} onChange={(e) => setNewUserData({ ...newUserData, role: e.target.value, assignments: { constituencies: [], local_bodies: [], booths: [] } })} className="col-span-2 p-4 bg-slate-50 border-2 border-slate-50 rounded-2xl font-bold">
                                            <option value="">Select Role...</option>
                                            <option value="BOOTH_AGENT">Booth Agent</option>
                                            <option value="ZONE_COMMANDER">Zone Commander</option>
                                            <option value="LOCAL_BODY_HEAD">Local Body Head</option>
                                            <option value="CONSTITUENCY_ADMIN">Constituency Admin</option>
                                            <option value="MANAGER">Manager</option>
                                            <option value="OPERATOR">Operator</option>
                                            <option value="SUPERUSER">Superuser</option>
                                        </select>

                                        {/* Permission Assignments Matrix */}
                                        <div className="col-span-2 space-y-4 py-2">
                                            <div className="flex items-center gap-2 border-b border-slate-50 pb-2">
                                                <span className="text-[10px] font-black uppercase text-slate-400">Permission Matrix</span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                {[
                                                    { key: 'can_download', label: 'Report Export', icon: '📊' },
                                                    { key: 'can_upload', label: 'OCR Engine', icon: '⚡' },
                                                    { key: 'can_verify', label: 'Data Verification', icon: '✅' },
                                                    { key: 'can_edit_voters', label: 'Intelligence Edit', icon: '✏️' },
                                                    { key: 'can_send_broadcasts', label: 'Comms Hub', icon: '📣' },
                                                    { key: 'can_manage_system', label: 'System Admin', icon: '🛡️' },
                                                ].map(perm => (
                                                    <button
                                                        key={perm.key}
                                                        onClick={() => setNewUserData({ ...newUserData, [perm.key]: !newUserData[perm.key] })}
                                                        className={`p-3 rounded-2xl flex items-center gap-3 border transition-all ${newUserData[perm.key] ? 'bg-primary-50 border-primary-200 text-primary-700 shadow-sm' : 'bg-slate-50 border-slate-100 text-slate-400 opacity-60'}`}
                                                    >
                                                        <span className="text-sm">{perm.icon}</span>
                                                        <span className="text-[9px] font-black uppercase tracking-tight">{perm.label}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Scope Assignments */}
                                        {newUserData.role && !['SUPERUSER', 'MANAGER', 'OPERATOR'].includes(newUserData.role) && (
                                            <div className="col-span-2 bg-slate-50 p-6 rounded-3xl space-y-4">
                                                <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest px-2">Hierarchical Assignment</label>

                                                <div className="space-y-4">
                                                    {['LOCAL_BODY_HEAD', 'ZONE_COMMANDER', 'BOOTH_AGENT'].includes(newUserData.role) && (
                                                        <select
                                                            value={assignSelection.constId}
                                                            onChange={(e) => setAssignSelection({ ...assignSelection, constId: e.target.value, lbId: '' })}
                                                            className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-bold text-xs"
                                                        >
                                                            <option value="">Select Constituency...</option>
                                                            {allLocations.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                                        </select>
                                                    )}

                                                    {['ZONE_COMMANDER', 'BOOTH_AGENT'].includes(newUserData.role) && assignSelection.constId && (
                                                        <select
                                                            value={assignSelection.lbId}
                                                            onChange={(e) => setAssignSelection({ ...assignSelection, lbId: e.target.value })}
                                                            className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-bold text-xs"
                                                        >
                                                            <option value="">Select Local Body...</option>
                                                            {(allLocations.find(c => String(c.id) === String(assignSelection.constId))?.local_bodies || []).map(lb => (
                                                                <option key={lb.id} value={lb.id}>{lb.name}</option>
                                                            ))}
                                                        </select>
                                                    )}

                                                    <div className="max-h-48 overflow-y-auto space-y-2 border-t pt-4">
                                                        {(() => {
                                                            let items = [];
                                                            let key = '';

                                                            if (newUserData.role === 'CONSTITUENCY_ADMIN') {
                                                                items = allLocations;
                                                                key = 'constituencies';
                                                            } else if (newUserData.role === 'LOCAL_BODY_HEAD') {
                                                                items = allLocations.find(c => String(c.id) === String(assignSelection.constId))?.local_bodies || [];
                                                                key = 'local_bodies';
                                                            } else if (['ZONE_COMMANDER', 'BOOTH_AGENT'].includes(newUserData.role)) {
                                                                items = (allLocations.find(c => String(c.id) === String(assignSelection.constId))?.local_bodies || []).find(lb => String(lb.id) === String(assignSelection.lbId))?.booths || [];
                                                                key = 'booths';
                                                            }

                                                            if (items.length === 0 && !['CONSTITUENCY_ADMIN'].includes(newUserData.role)) {
                                                                return <p className="text-[10px] text-slate-400 font-bold italic text-center py-4">Please select parent area first</p>;
                                                            }

                                                            return items.map(item => {
                                                                const isAssigned = newUserData.assignments[key]?.includes(item.id);
                                                                const isTaken = allUsers.some(u =>
                                                                    u.id !== editingUser?.id && (
                                                                        (key === 'booths' && u.booth_ids?.includes(item.id)) ||
                                                                        (key === 'local_bodies' && u.local_body_ids?.includes(item.id)) ||
                                                                        (key === 'constituencies' && u.constituency_ids?.includes(item.id))
                                                                    )
                                                                );

                                                                return (
                                                                    <button
                                                                        key={item.id}
                                                                        disabled={isTaken && !isAssigned}
                                                                        onClick={() => {
                                                                            const current = newUserData.assignments[key] || [];
                                                                            const updated = isAssigned ? current.filter(id => id !== item.id) : [...current, item.id];
                                                                            setNewUserData({ ...newUserData, assignments: { ...newUserData.assignments, [key]: updated } });
                                                                        }}
                                                                        className={`w-full text-left p-3 rounded-xl text-[10px] font-black uppercase tracking-tight flex justify-between items-center transition-all ${isAssigned ? 'bg-primary-600 text-white shadow-md' :
                                                                            isTaken ? 'bg-slate-100 text-slate-300 cursor-not-allowed opacity-50' :
                                                                                'bg-white hover:bg-slate-200 text-slate-600 shadow-sm'
                                                                            }`}
                                                                    >
                                                                        <div className="flex flex-col">
                                                                            <span>{item.name || `Booth ${item.number}`}</span>
                                                                            {isTaken && !isAssigned && <span className="text-[7px] font-bold text-rose-400">Already Active</span>}
                                                                        </div>
                                                                        <span>{isAssigned ? '✅' : isTaken ? '🔒' : '+'}</span>
                                                                    </button>
                                                                );
                                                            });
                                                        })()}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex gap-4">
                                        {editingUser && (
                                            <button onClick={() => {
                                                setEditingUser(null);
                                                setNewUserData({ username: '', password: '', role: 'BOOTH_AGENT', assignments: { constituencies: [], local_bodies: [], booths: [] } });
                                            }} className="flex-1 bg-slate-100 text-slate-400 py-5 rounded-3xl font-black uppercase tracking-widest text-[11px]">Cancel</button>
                                        )}
                                        <button onClick={editingUser ? handleUpdateUser : handleCreateUser} className="flex-[2] bg-primary-600 text-white py-5 rounded-3xl font-black uppercase shadow-xl hover:bg-primary-700 transition-all">
                                            {editingUser ? 'Save Updates' : 'Activate Account'}
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div className="flex justify-between items-center px-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-1.5 h-6 bg-primary-500 rounded-full"></div>
                                            <h3 className="text-xl font-black uppercase tracking-tight text-slate-800">Active Intelligence Network</h3>
                                        </div>
                                        <div className="bg-slate-100 px-3 py-1 rounded-full text-[10px] font-black text-slate-400 uppercase tracking-widest">{allUsers.length} Agents</div>
                                    </div>

                                    <div className="space-y-4">
                                        {allUsers.map(u => (
                                            <div key={u.id} className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100 flex items-center justify-between hover:border-primary-200 hover:shadow-md transition-all group">
                                                <div className="flex items-center gap-5 flex-1 min-w-0">
                                                    <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center font-black text-slate-400 text-xs shadow-inner uppercase shrink-0">
                                                        {u.username.substring(0, 2)}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-3 mb-1">
                                                            <h4 className="font-black uppercase text-sm text-slate-800 tracking-tight truncate">{u.username}</h4>
                                                            <span className="px-2 py-0.5 bg-slate-900 text-white rounded-md text-[8px] font-black uppercase tracking-[0.1em] shrink-0">{u.role}</span>
                                                        </div>
                                                        <div className="flex flex-wrap gap-2">
                                                            {(u.constituencies || []).map(n => <span key={n} className="text-[9px] font-bold text-blue-500 uppercase bg-blue-50 px-2 py-0.5 rounded border border-blue-100/50">Const: {n}</span>)}
                                                            {(u.local_bodies || []).map(n => <span key={n} className="text-[9px] font-bold text-emerald-500 uppercase bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100/50">LB: {n}</span>)}
                                                            {(u.booths || []).map(n => <span key={n} className="text-[9px] font-bold text-slate-500 uppercase bg-slate-50 px-2 py-0.5 rounded border border-slate-200">Booth {n}</span>)}
                                                            {!(u.constituencies?.length || u.local_bodies?.length || u.booths?.length) && <span className="text-[9px] italic text-slate-300 font-bold uppercase tracking-widest">Awaiting Assignment</span>}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-3 pl-6 border-l border-slate-50 ml-6 shrink-0">
                                                    <button
                                                        onClick={() => startEditUser(u)}
                                                        className="px-5 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all active:scale-95 shadow-sm"
                                                    >
                                                        Modify
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteUser(u.id)}
                                                        className="px-5 py-2.5 bg-rose-50 border border-rose-100 text-rose-600 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-rose-600 hover:text-white hover:border-rose-600 transition-all active:scale-95 shadow-sm"
                                                    >
                                                        Revoke
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )
                }

                {
                    view === 'engine' && (
                        <div className="max-w-4xl mx-auto space-y-8 animate-in">
                            <header className="mb-12">
                                <h1 className="text-5xl font-black tracking-tighter uppercase">OCR Engine</h1>
                            </header>
                            {stage === 'setup' && (
                                <div className="bg-white rounded-[40px] p-12 shadow-xl border border-slate-100 space-y-8">
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-2">Constituency</label>
                                            <input list="const-list" type="text" placeholder="Select or Type..." value={constituency} onChange={(e) => setConstituency(e.target.value)} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold" />
                                            <datalist id="const-list">
                                                {allLocations.map(c => <option key={c.id} value={c.name} />)}
                                            </datalist>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-2">Local Body Type</label>
                                            <select value={lgbType} onChange={(e) => setLgbType(e.target.value)} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold">
                                                <option value="PANCHAYAT">Panchayath</option>
                                                <option value="MUNICIPALITY">Municipality</option>
                                                <option value="CORPORATION">Corporation</option>
                                            </select>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-2">Local Body Name</label>
                                            <input list="lb-list" type="text" placeholder="e.g. Trippunithura" value={lgbName} onChange={(e) => setLgbName(e.target.value)} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold" />
                                            <datalist id="lb-list">
                                                {allLocations.find(c => c.name === constituency)?.local_bodies.map(lb => <option key={lb.id} value={lb.name} />)}
                                            </datalist>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-2">Booth Number</label>
                                            <input type="text" placeholder="e.g. 145" value={booth} onChange={(e) => setBooth(e.target.value)} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-2">Polling Station No (Optional)</label>
                                            <input type="text" placeholder="e.g. 145" value={psNo} onChange={(e) => setPsNo(e.target.value)} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-2">Polling Station Name (Optional)</label>
                                            <input type="text" placeholder="e.g. Govt School..." value={psName} onChange={(e) => setPsName(e.target.value)} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold" />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-2">Source PDF Document</label>
                                        <label className="border-4 border-dashed border-slate-100 rounded-[40px] p-10 block text-center cursor-pointer hover:bg-primary-50 transition-all">
                                            <input type="file" onChange={(e) => setFile(e.target.files[0])} className="hidden" accept=".pdf" />
                                            <span className="text-4xl mb-2 block">{file ? "✅" : "📄"}</span>
                                            <h3 className="font-black text-slate-800 uppercase text-sm">{file ? file.name : "Click to Select PDF Roll"}</h3>
                                        </label>
                                    </div>

                                    <div className="flex gap-4">
                                        <button onClick={handleCycleReset} className="flex-1 bg-slate-100 text-slate-400 py-6 rounded-3xl font-black uppercase tracking-widest">Clear</button>
                                        <button onClick={handleInitialUpload} className="flex-[2] bg-primary-600 text-white py-6 rounded-3xl text-xl font-black uppercase shadow-2xl hover:bg-primary-700 transition-all active:scale-95">Initialize Engine ⚡</button>
                                    </div>
                                    {error && <p className="text-rose-600 font-black text-center uppercase text-xs">{error}</p>}
                                </div>
                            )}
                            {stage === 'ocr' && <div className="bg-white rounded-[40px] p-12 shadow-xl text-center space-y-8 animate-in"><h2 className="text-3xl font-black uppercase">OCR Activity</h2>{/* Status bars here */}</div>}
                        </div>
                    )
                }

                {
                    view === 'design' && (
                        <div className="w-full flex-1 flex flex-col items-center py-12 px-6 gap-8 animate-in bg-slate-100/50 min-h-full print:p-0 print:bg-white">
                            <header className="mb-8 w-full max-w-6xl no-print flex justify-between items-end">
                                <h1 className="text-4xl font-black uppercase text-slate-800 tracking-tighter">Voter Slip Engine</h1>
                                <button onClick={() => window.print()} className="bg-primary-600 text-white px-8 py-3 rounded-2xl font-black uppercase text-xs shadow-lg hover:scale-105 transition-all">Print Slips 🖨️</button>
                            </header>
                            <div className="grid grid-cols-2 gap-4 w-fit mx-auto print:p-0 print:gap-0">
                                {(voterList.length > 0 ? voterList : [...Array(6)]).map((v, i) => (
                                    <VoterSlip key={v?.id || i} voterName={v?.full_name || "Voter Name"} serialNo={v?.serial_no || i + 1} epicNo={v?.epic_id || "KL/XX/XXX/XXXXXX"} pollingStation={v?.ps_name || "Polling Station"} party={activePrintParty} />
                                ))}
                            </div>
                        </div>
                    )
                }
            </main >

            {editMode && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
                    <div className="bg-white w-full max-w-lg rounded-[40px] p-12 shadow-2xl space-y-8">
                        <h2 className="text-3xl font-black uppercase text-slate-900">Edit Voter</h2>
                        <input type="text" value={editData.full_name || ''} onChange={(e) => setEditData({ ...editData, full_name: e.target.value })} className="w-full p-4 bg-slate-50 border-2 rounded-2xl" placeholder="Full Name" />
                        <div className="flex gap-4 pt-6">
                            <button onClick={() => setEditMode(false)} className="flex-1 font-black uppercase text-xs p-5 border rounded-2xl hover:bg-slate-50">Cancel</button>
                            <button onClick={saveCorrection} className="flex-[2] bg-primary-600 text-white p-5 rounded-2xl font-black uppercase shadow-lg hover:bg-primary-700">Update</button>
                        </div>
                    </div>
                </div>
            )}

            {
                showSuccess && (
                    <div className="fixed inset-0 bg-emerald-600/90 backdrop-blur-md z-[200] flex flex-col items-center justify-center text-white animate-in">
                        <span className="text-8xl mb-8 animate-bounce">✅</span>
                        <h2 className="text-4xl font-black uppercase">Sync Complete</h2>
                    </div>
                )
            }
        </div >
    );
};

export default App;
