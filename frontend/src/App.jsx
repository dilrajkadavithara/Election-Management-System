import React from 'react';
import { AppProvider, useAppContext } from './context/AppContext';
import useVoters from './hooks/useVoters';
import useOCR from './hooks/useOCR';
import useComm from './hooks/useComm';
import Sidebar from './components/layout/Sidebar';
import LoginForm from './components/auth/LoginForm';
import DashboardV2 from './views/DashboardV2';
import VoterList from './views/VoterList';
import AdminControl from './views/AdminControl';
import CommunicationHub from './views/CommunicationHub';
import OCREngine from './views/OCREngine';
import SlipDesign from './views/SlipDesign';
import EditProfileModal from './components/modals/EditProfileModal';
import ChangePasswordModal from './components/modals/ChangePasswordModal';
import WarRoom from './views/WarRoom';
import ElectionDay from './views/ElectionDay';
import FamilyHeads from './views/FamilyHeads';
import PWAInstallPrompt from './components/PWAInstallPrompt';
import { PARTY_PRESETS } from './constants';

const AppInner = () => {
    // --- Section 1: Auth, navigation, admin, UI from context ---
    const ctx = useAppContext();
    const {
        isLoggedIn, userRole, username, currentUser,
        loginUser, setLoginUser, loginPass, setLoginPass,
        loginConsent, setLoginConsent,
        handleLogin: ctxHandleLogin, handleLogout,
        view, setView,
        allLocations, allUsers, allParties, loadAdminData,
        newLocData, setNewLocData, editingLoc, setEditingLoc,
        handleAddLocation, handleUpdateLocation,
        newUserData, setNewUserData, editingUser, setEditingUser,
        assignSelection, setAssignSelection,
        handleCreateUser, handleUpdateUser, handleDeleteUser, startEditUser,
        newPartyData, setNewPartyData, newPartyFile, setNewPartyFile,
        activePrintParty, setActivePrintParty,
        handleAddParty, handleSyncParties,
        loading, setLoading, error, setError,
        editMode, setEditMode, editData, setEditData,
        showChangePassword, setShowChangePassword,
        showSuccess, setShowSuccess,
    } = ctx;

    // --- Section 2: Voter state from hook ---
    const voters = useVoters({ isLoggedIn, view });
    const {
        dashboardStats, strategicStats, loadStats,
        dashFilters, setDashFilters,
        listFilters, setListFilters,
        searchQuery, setSearchQuery,
        voterList, voterTotal, currentPage, voterLoading,
        loadVoters,
        handleUpdateIntel,
        initBoothAgentFilters,
    } = voters;

    // --- Section 3: OCR state from hook ---
    const ocr = useOCR({
        isLoggedIn, view, loadStats, loadAdminData, setView, setShowSuccess, setEditData, setEditMode,
    });
    const {
        ocrBatch, setOcrBatch,
        ocrLoading, setOcrLoading,
        ocrError, setOcrError,
        ocrTargetLoc, setOcrTargetLoc,
        useDirectPdf, setUseDirectPdf,
        useGemini, setUseGemini,
        ocrRef,
        handleFileUpload, startExtraction, startOcr,
        handleSaveBatch, stopAndClearRAM, discardBatch,
        saveCorrection: ocrSaveCorrection,
    } = ocr;

    // --- Section 4: Comm state from hook ---
    const comm = useComm({ isLoggedIn, view, setLoading });
    const {
        commStats, commTemplates,
        commType, setCommType,
        commMessage, setCommMessage,
        handleCommunicationSend,
    } = comm;

    // --- Booth agent filter init on login ---
    const handleLogin = async (e) => {
        const res = await ctxHandleLogin(e);
        if (res) {
            initBoothAgentFilters(res.role, res.assignments);
            loadStats();
        }
    };

    // --- Correction workflow (bridges OCR hook + context editMode/editData) ---
    const saveCorrection = async () => {
        try {
            await ocrSaveCorrection(editData, ocrBatch, currentPage, loadVoters, setLoading);
        } catch (e) {
            setError(e.message);
        }
    };

    // --- Render ---
    if (!isLoggedIn) {
        return <LoginForm
            loginUser={loginUser} setLoginUser={setLoginUser}
            loginPass={loginPass} setLoginPass={setLoginPass}
            loginConsent={loginConsent} setLoginConsent={setLoginConsent}
            handleLogin={handleLogin} loading={loading} error={error}
        />;
    }

    return (
        <div className={`min-h-screen ${['dashboard', 'electionday', 'warroom', 'familyheads'].includes(view) ? 'v2-bg-obsidian' : 'bg-slate-50'} flex font-sans transition-colors duration-700`}>
            <Sidebar view={view} setView={setView} userRole={userRole} username={username} handleLogout={handleLogout} setShowChangePassword={setShowChangePassword} />

            <main className="flex-1 flex flex-col overflow-y-auto p-0">
                {view === 'dashboard' && (
                    <div className="relative">
                        <DashboardV2
                            dashboardStats={dashboardStats}
                            strategicStats={strategicStats}
                            dashFilters={dashFilters}
                            setDashFilters={setDashFilters}
                            allLocations={allLocations}
                            listFilters={listFilters}
                            setListFilters={setListFilters}
                            setView={setView}
                            userRole={userRole}
                            setShowChangePassword={setShowChangePassword}
                        />
                    </div>
                )}
                {view === 'voters' && <VoterList voterList={voterList} voterTotal={voterTotal} currentPage={currentPage} voterLoading={voterLoading} listFilters={listFilters} setListFilters={setListFilters} searchQuery={searchQuery} setSearchQuery={setSearchQuery} allLocations={allLocations} loadVoters={loadVoters} loadAdminData={loadAdminData} currentUser={currentUser} userRole={userRole} setEditData={setEditData} setEditMode={setEditMode} handleUpdateIntel={handleUpdateIntel} />}
                {view === 'admin' && <AdminControl />}
                {view === 'comm' && <CommunicationHub commType={commType} setCommType={setCommType} commMessage={commMessage} setCommMessage={setCommMessage} handleCommunicationSend={handleCommunicationSend} voterTotal={voterTotal} commStats={commStats} commTemplates={commTemplates} allLocations={allLocations} listFilters={listFilters} setListFilters={setListFilters} loadVoters={loadVoters} userRole={userRole} />}
                {view === 'engine' && <OCREngine />}
                {view === 'design' && <SlipDesign activePrintParty={activePrintParty} setActivePrintParty={setActivePrintParty} allParties={allParties} allLocations={allLocations} listFilters={listFilters} setListFilters={setListFilters} voterList={voterList} loadVoters={loadVoters} setSearchQuery={setSearchQuery} userRole={userRole} userAssignments={currentUser?.assignments} />}
                {view === 'warroom' && <WarRoom allLocations={allLocations} dashFilters={dashFilters} listFilters={listFilters} setListFilters={setListFilters} setView={setView} userRole={userRole} setShowChangePassword={setShowChangePassword} />}
                {view === 'electionday' && <ElectionDay userRole={userRole} userAssignments={currentUser?.assignments} username={username} setShowChangePassword={setShowChangePassword} />}
                {view === 'familyheads' && <FamilyHeads allLocations={allLocations} currentUser={currentUser} userRole={userRole} setEditData={setEditData} setEditMode={setEditMode} />}
            </main>

            {editMode && <EditProfileModal editData={editData} setEditData={setEditData} setEditMode={setEditMode} saveCorrection={saveCorrection} ocrBatch={ocrBatch} />}
            <ChangePasswordModal isOpen={showChangePassword} onClose={() => setShowChangePassword(false)} />
            {showSuccess && (
                <div className="fixed inset-0 bg-emerald-600/90 backdrop-blur-md z-[200] flex flex-col items-center justify-center text-white animate-in">
                    <span className="text-8xl mb-8 animate-bounce">✅</span>
                    <h2 className="text-4xl font-black uppercase">Sync Complete</h2>
                </div>
            )}
            <PWAInstallPrompt />
        </div>
    );
};

const App = () => (
    <AppProvider>
        <AppInner />
    </AppProvider>
);

export default App;
