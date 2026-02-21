import React, { useState, useEffect, useRef } from 'react';
import api from './api';
import Sidebar from './components/layout/Sidebar';
import LoginForm from './components/auth/LoginForm';
import Dashboard from './views/Dashboard';
import DashboardV2 from './views/DashboardV2';
import VoterList from './views/VoterList';
import AdminControl from './views/AdminControl';
import CommunicationHub from './views/CommunicationHub';
import OCREngine from './views/OCREngine';
import SlipDesign from './views/SlipDesign';
import EditProfileModal from './components/modals/EditProfileModal';

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
    const [view, setView] = useState('dashboard');
    const [isV2, setIsV2] = useState(false);
    const [loginUser, setLoginUser] = useState('');
    const [loginPass, setLoginPass] = useState('');
    const [loginConsent, setLoginConsent] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);

    // Global Data
    const [dashboardStats, setDashboardStats] = useState(null);
    const [strategicStats, setStrategicStats] = useState(null);
    const [voterList, setVoterList] = useState([]);
    const [voterTotal, setVoterTotal] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [dashFilters, setDashFilters] = useState({ constituency: '', lb: '', booth: '' });
    const [listFilters, setListFilters] = useState({ constituency: '', lb: '', booth: '', gender: '', ageFrom: '', ageTo: '', leaning: '', serialFrom: '', serialTo: '', location: '' });
    const [searchQuery, setSearchQuery] = useState('');

    // Admin Data
    const [allLocations, setAllLocations] = useState([]);
    const [allUsers, setAllUsers] = useState([]);
    const [newLocData, setNewLocData] = useState({ type: 'const', name: '', parentId: '', lbType: 'PANCHAYAT', boothNum: '', psName: '', psNo: '' });
    const [newUserData, setNewUserData] = useState({
        username: '', password: '', role: 'BOOTH_AGENT',
        can_download: false, can_upload: false, can_verify: true,
        can_edit_voters: true, can_send_broadcasts: false, can_manage_system: false,
        assignments: { constituencies: [], local_bodies: [], booths: [] }
    });
    const [allParties, setAllParties] = useState([]);
    const [newPartyData, setNewPartyData] = useState({ name: '', shortLabel: '', color: '#000080', gradient: '' });
    const [newPartyFile, setNewPartyFile] = useState(null);
    const [activePrintParty, setActivePrintParty] = useState(null);
    const [assignSelection, setAssignSelection] = useState({ constId: '', lbId: '' });
    const [editingUser, setEditingUser] = useState(null);

    // Engine/OCR State
    const [ocrBatch, setOcrBatch] = useState(null);
    const [ocrLoading, setOcrLoading] = useState(false);
    const [ocrError, setOcrError] = useState(null);
    const [ocrTargetLoc, setOcrTargetLoc] = useState({ constId: '', lbId: '', boothId: '', psNo: '', psName: '' });
    const [useDirectPdf, setUseDirectPdf] = useState(true); // Default to Safe Mode
    const ocrRef = useRef(null);

    // Communication State
    const [commStats, setCommStats] = useState({ total_sent: 0, whatsapp: 0, sms: 0, calls: 0, status_dist: {} });
    const [commTemplates, setCommTemplates] = useState([]);
    const [commType, setCommType] = useState('WHATSAPP');
    const [commMessage, setCommMessage] = useState('');
    const [selectedImage, setSelectedImage] = useState(null);

    // UI State
    const [loading, setLoading] = useState(false);
    const [voterLoading, setVoterLoading] = useState(false);
    const [error, setError] = useState(null);
    const [editMode, setEditMode] = useState(false);
    const [editData, setEditData] = useState({});
    const [showSuccess, setShowSuccess] = useState(false);

    useEffect(() => {
        const checkHealth = async () => {
            try { await api.checkHealth(); } catch (e) { console.error("API Health Check Failed"); }
        };
        checkHealth();
        if (isLoggedIn) {
            loadAdminData();
            loadStats();
        }
    }, [isLoggedIn]);

    useEffect(() => {
        if (isLoggedIn && view === 'voters') loadVoters(currentPage);
    }, [view, dashFilters, listFilters, searchQuery]);

    useEffect(() => {
        if (isLoggedIn && view === 'dashboard') loadStats();
        if (isLoggedIn && view === 'comm') loadCommData();
    }, [view, dashFilters]);

    // Auto-reconnect to latest processed batch when opening AI Processor
    useEffect(() => {
        if (isLoggedIn && view === 'engine' && !ocrBatch) {
            (async () => {
                try {
                    const res = await api.getLatestBatch();
                    if (res.found && res.batch) {
                        setOcrBatch(res.batch);
                    }
                } catch (e) { console.error("Auto-reconnect failed:", e); }
            })();
        }
    }, [view, isLoggedIn]);

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true); setError(null);
        try {
            const res = await api.login(loginUser, loginPass);
            // Storage is handled inside api.login now, just update local state
            setIsLoggedIn(true);
            setUserRole(res.role);
            setUsername(res.username);
            setCurrentUser(res);
        } catch (e) { setError("Invalid credentials or server error"); }
        finally { setLoading(false); }
    };

    const handleLogout = () => {
        localStorage.clear();
        setIsLoggedIn(false);
        setView('dashboard');
    };

    const loadStats = async () => {
        try {
            // Load core stats independently
            api.getStats(dashFilters.constituency, dashFilters.lb, dashFilters.booth)
                .then(setDashboardStats)
                .catch(e => console.error("Stats Error:", e));

            // Load strategic data independently
            api.getStrategicAnalytics(dashFilters.constituency)
                .then(setStrategicStats)
                .catch(e => {
                    console.error("Strategic Analytics Error:", e);
                    // Provide empty fallback to prevent crashing DashboardV2
                    setStrategicStats({ booth_stats: [], recent_activity: [] });
                });
        } catch (e) { console.error("Global Stats Load Error:", e); }
    };

    const loadVoters = async (page = 1) => {
        setVoterLoading(true);
        try {
            const data = await api.getVoters({
                search: searchQuery,
                constituency: listFilters.constituency,
                lb: listFilters.lb,
                booth: listFilters.booth,
                gender: listFilters.gender,
                age_from: listFilters.ageFrom,
                age_to: listFilters.ageTo,
                location: listFilters.location,
                page: page,
                page_size: 50
            });
            setVoterList(data.results);
            setVoterTotal(data.total || data.count || 0);
            setCurrentPage(page);
        } catch (e) { console.error(e); }
        setVoterLoading(false);
    };

    const loadCommData = async () => {
        try {
            const stats = await api.getCommStats();
            setCommStats(stats);
            const templates = await api.getTemplates();
            setCommTemplates(templates);
        } catch (e) { console.error(e); }
    };

    const loadAdminData = async () => {
        // Individual try-catches ensure one failure doesn't block others (e.g. non-superusers can't get users)
        try {
            const locs = await api.getLocations();
            setAllLocations(locs);
        } catch (e) { console.error("Locations Load Error:", e); }

        try {
            const users = await api.getUsers();
            setAllUsers(users);
        } catch (e) { console.error("Users Load Error:", e); }

        try {
            const parties = await api.getParties();
            setAllParties(parties);
        } catch (e) { console.error("Parties Load Error:", e); }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setOcrLoading(true);
        try {
            const res = await api.uploadPDF(file);
            setOcrBatch({ ...res, filename: file.name });
        } catch (e) { setOcrError(e.message); }
        finally { setOcrLoading(false); }
    };

    const startExtraction = async () => {
        if (!ocrBatch) return;
        try {
            await api.startExtract(ocrBatch.id, useDirectPdf);
            setOcrBatch(prev => ({ ...prev, status: 'extracting', direct_pdf: useDirectPdf }));
        } catch (e) { setOcrError(e.message); }
    };

    const [useGemini, setUseGemini] = useState(true);
    const startOcr = async () => {
        if (!ocrBatch) return;
        try {
            await api.startProcess(ocrBatch.id, useGemini, ocrBatch.direct_pdf || useDirectPdf);
            setOcrBatch(prev => ({ ...prev, status: 'processing', use_gemini: useGemini }));
        } catch (e) { setOcrError(e.message); }
    };

    const handleSaveBatch = async () => {
        if (!ocrBatch) return;
        setOcrLoading(true);
        setOcrError(null);
        try {
            const res = await api.saveToDB(
                ocrBatch.id,
                ocrTargetLoc.constId || ocrTargetLoc.constName,
                '',
                ocrTargetLoc.lbId || ocrTargetLoc.lbName,
                ocrTargetLoc.boothId || ocrTargetLoc.boothNo,
                ocrTargetLoc.psNo,
                ocrTargetLoc.psName
            );
            if (res.success) {
                // Clear the batch from Redis so auto-reconnect doesn't reload it
                try { await api.clearSession(ocrBatch.id); } catch (_) { }
                setShowSuccess(true);
                setTimeout(() => {
                    setShowSuccess(false);
                    setOcrBatch(null);
                    loadStats();
                    setView('dashboard');
                }, 2000);
            } else {
                setOcrError(res.message || "Failed to commit data to Intelligence Engine.");
            }
        } catch (e) {
            const msg = e.response?.data?.detail || e.message;
            setOcrError(typeof msg === 'string' ? msg : JSON.stringify(msg));
        }
        finally { setOcrLoading(false); }
    };

    const stopAndClearRAM = async () => {
        if (!ocrBatch) return;
        try {
            await api.stopAndClearRAM(ocrBatch.id);
            setOcrBatch(null);
        } catch (e) { console.error(e); }
    };

    const discardBatch = () => setOcrBatch(null);

    const saveCorrection = async () => {
        setLoading(true);
        try {
            if (editMode && editData.id) {
                // Regular database edit
                await api.editVoterInDB(editData.id, editData);
                setEditMode(false);
                loadVoters();
                loadStats();
            } else if (ocrBatch && editData.voter_id) {
                // OCR process correction (Smart Workflow)
                await api.updateVoter(ocrBatch.id, editData.voter_id, editData);
                const s = await api.getBatchStatus(ocrBatch.id);
                setOcrBatch(prev => ({ ...prev, ...s }));

                // Automatically find and load next flagged item
                const flagged = (s.results || []).filter(r => r.Status !== '✅ OK');
                if (flagged.length > 0) {
                    const res = flagged[0];
                    setEditData({
                        full_name: res['Full Name'] || res.full_name,
                        relation_type: res['Relation Type'] || res.relation_type,
                        relation_name: res['Relation Name'] || res.relation_name,
                        house_no: res['House Number'] || res.house_no,
                        house_name: res['House Name'] || res.house_name,
                        epic_id: res.EPIC_ID || res.epic_id,
                        age: res.Age || res.age,
                        gender: (res.Gender || res.gender)?.toUpperCase() === 'MALE' ? 'MALE' : 'FEMALE',
                        voter_leaning: res.voter_leaning || res.Leaning || '',
                        current_location: res.current_location || res.Location || 'LOCAL',
                        voting_probability: res.voting_probability || res.Probability || '',
                        phone_no: res.phone_no || res.phone || '',
                        voter_id: res.voter_id,
                        image_name: res.image_name
                    });
                } else {
                    setEditMode(false);
                    alert("All corrections complete!");
                }
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
        setLoading(true);
        try {
            if (newLocData.type === 'const') await api.addConst(newLocData.name);
            else if (newLocData.type === 'lb') await api.addLB(newLocData.parentId, newLocData.name, newLocData.lbType);
            else if (newLocData.type === 'booth') await api.addBooth(newLocData.grandParentId, newLocData.parentId, newLocData.boothNum, newLocData.psName, newLocData.psNo);
            loadAdminData();
            setNewLocData({ type: 'const', name: '', parentId: '', lbType: 'PANCHAYAT', boothNum: '', psName: '', psNo: '' });
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const handleCreateUser = async () => {
        setLoading(true);
        try {
            const res = await api.createManagedUser(newUserData);
            if (res.success) {
                loadAdminData();
                setNewUserData({
                    username: '', password: '', role: 'BOOTH_AGENT',
                    can_download: false, can_upload: false, can_verify: true,
                    can_edit_voters: true, can_send_broadcasts: false, can_manage_system: false,
                    assignments: { constituencies: [], local_bodies: [], booths: [] }
                });
                alert("User created successfully!");
            } else alert(res.message);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const handleDeleteUser = async (uid) => {
        if (!window.confirm("Are you sure?")) return;
        setLoading(true);
        try {
            await api.deleteUser(uid);
            loadAdminData();
        } catch (e) { alert(e.message); }
        finally { setLoading(false); }
    };

    const handleUpdateUser = async () => {
        setLoading(true);
        try {
            await api.updateManagedUser(editingUser.id, newUserData);
            setEditingUser(null);
            loadAdminData();
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const startEditUser = (u) => {
        setEditingUser(u);
        setNewUserData({
            username: u.username, role: u.role,
            can_download: u.can_download, can_upload: u.can_upload,
            can_verify: u.can_verify, can_edit_voters: u.can_edit_voters,
            can_send_broadcasts: u.can_send_broadcasts, can_manage_system: u.can_manage_system,
            assignments: {
                constituencies: u.constituency_ids || [],
                local_bodies: u.local_body_ids || [],
                booths: u.booth_ids || []
            }
        });
    };

    const handleAddParty = async () => {
        setLoading(true);
        try {
            await api.addParty(newPartyData.name, newPartyData.shortLabel, newPartyData.color, newPartyData.gradient, newPartyFile);
            loadAdminData();
            setNewPartyData({ name: '', shortLabel: '', color: '#000080', gradient: '' });
            setNewPartyFile(null);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const handleCommunicationSend = async (payload) => {
        setLoading(true);
        try {
            if (payload.mode === 'FILTERED' || payload.image) {
                // Use form-based broadcast for rich media or filter-based targeting
                await api.sendBroadcastForm({
                    heading: payload.heading,
                    message: payload.message,
                    medium: payload.type,
                    filters: JSON.stringify(payload.filters || {}),
                    image: payload.image
                });
            } else {
                // Use standard ID-based broadcast
                await api.sendBroadcast({
                    type: payload.type,
                    message: payload.message,
                    voter_ids: payload.voterIds
                });
            }
            alert("Strategic broadcast successfully deployed to network!");
            setCommMessage('');
        } catch (e) { alert(e.message); }
        finally { setLoading(false); }
    };

    // OCR Status Polling
    useEffect(() => {
        let interval;
        if (ocrBatch && ['extracting', 'processing'].includes(ocrBatch.status)) {
            interval = setInterval(async () => {
                try {
                    const s = await api.getBatchStatus(ocrBatch.id);
                    setOcrBatch(prev => ({ ...prev, ...s }));
                } catch (e) { console.error(e); }
            }, 2000);
        }
        return () => clearInterval(interval);
    }, [ocrBatch?.id, ocrBatch?.status]);

    if (!isLoggedIn) {
        return <LoginForm
            loginUser={loginUser} setLoginUser={setLoginUser}
            loginPass={loginPass} setLoginPass={setLoginPass}
            loginConsent={loginConsent} setLoginConsent={setLoginConsent}
            handleLogin={handleLogin} loading={loading} error={error}
        />;
    }

    return (
        <div className={`min-h-screen ${isV2 && view === 'dashboard' ? 'v2-bg-obsidian' : 'bg-slate-50'} flex font-sans transition-colors duration-700`}>
            <Sidebar view={view} setView={setView} userRole={userRole} username={username} handleLogout={handleLogout} />

            <main className={`flex-1 flex flex-col overflow-y-auto ${view === 'design' ? 'bg-slate-200 p-0' : (isV2 && view === 'dashboard' ? 'p-0' : 'p-12')}`}>
                {view === 'dashboard' && (
                    <div className="relative">
                        {isV2 ? (
                            <DashboardV2
                                dashboardStats={dashboardStats}
                                strategicStats={strategicStats}
                                dashFilters={dashFilters}
                                setDashFilters={setDashFilters}
                                allLocations={allLocations}
                                listFilters={listFilters}
                                setListFilters={setListFilters}
                                setView={setView}
                            />
                        ) : (
                            <Dashboard
                                dashboardStats={dashboardStats}
                                dashFilters={dashFilters}
                                setDashFilters={setDashFilters}
                                allLocations={allLocations}
                                listFilters={listFilters}
                                setListFilters={setListFilters}
                                setView={setView}
                            />
                        )}
                    </div>
                )}
                {view === 'voters' && <VoterList voterList={voterList} voterTotal={voterTotal} currentPage={currentPage} voterLoading={voterLoading} listFilters={listFilters} setListFilters={setListFilters} searchQuery={searchQuery} setSearchQuery={setSearchQuery} allLocations={allLocations} loadVoters={loadVoters} loadAdminData={loadAdminData} currentUser={currentUser} setEditData={setEditData} setEditMode={setEditMode} handleUpdateIntel={handleUpdateIntel} />}
                {view === 'admin' && <AdminControl allLocations={allLocations} allUsers={allUsers} userRole={userRole} newLocData={newLocData} setNewLocData={setNewLocData} handleAddLocation={handleAddLocation} newUserData={newUserData} setNewUserData={setNewUserData} assignSelection={assignSelection} setAssignSelection={setAssignSelection} handleCreateUser={handleCreateUser} handleUpdateUser={handleUpdateUser} handleDeleteUser={handleDeleteUser} startEditUser={startEditUser} editingUser={editingUser} setEditingUser={setEditingUser} allParties={allParties} newPartyData={newPartyData} setNewPartyData={setNewPartyData} newPartyFile={newPartyFile} setNewPartyFile={setNewPartyFile} handleAddParty={handleAddParty} PARTY_PRESETS={PARTY_PRESETS} dashboardStats={dashboardStats} />}
                {view === 'comm' && <CommunicationHub commType={commType} setCommType={setCommType} commMessage={commMessage} setCommMessage={setCommMessage} handleCommunicationSend={handleCommunicationSend} voterTotal={voterTotal} commStats={commStats} commTemplates={commTemplates} allLocations={allLocations} listFilters={listFilters} setListFilters={setListFilters} loadVoters={loadVoters} />}
                {view === 'engine' && <OCREngine ocrBatch={ocrBatch} setOcrBatch={setOcrBatch} ocrLoading={ocrLoading} setOcrLoading={setOcrLoading} ocrError={ocrError} setOcrError={setOcrError} ocrRef={ocrRef} handleFileUpload={handleFileUpload} startExtraction={startExtraction} startOcr={startOcr} handleSaveBatch={handleSaveBatch} discardBatch={discardBatch} stopAndClearRAM={stopAndClearRAM} setEditData={setEditData} setEditMode={setEditMode} allLocations={allLocations} ocrTargetLoc={ocrTargetLoc} setOcrTargetLoc={setOcrTargetLoc} loadAdminData={loadAdminData} useGemini={useGemini} setUseGemini={setUseGemini} useDirectPdf={useDirectPdf} setUseDirectPdf={setUseDirectPdf} />}
                {view === 'design' && <SlipDesign activePrintParty={activePrintParty} setActivePrintParty={setActivePrintParty} allParties={allParties} allLocations={allLocations} listFilters={listFilters} setListFilters={setListFilters} voterList={voterList} loadVoters={loadVoters} setSearchQuery={setSearchQuery} />}
            </main>

            {editMode && <EditProfileModal editData={editData} setEditData={setEditData} setEditMode={setEditMode} saveCorrection={saveCorrection} ocrBatch={ocrBatch} />}
            {showSuccess && (
                <div className="fixed inset-0 bg-emerald-600/90 backdrop-blur-md z-[200] flex flex-col items-center justify-center text-white animate-in">
                    <span className="text-8xl mb-8 animate-bounce">✅</span>
                    <h2 className="text-4xl font-black uppercase">Sync Complete</h2>
                </div>
            )}
        </div>
    );
};

export default App;
