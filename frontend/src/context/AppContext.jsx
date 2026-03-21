import React, { createContext, useContext, useState, useEffect } from 'react';
import api, { getSession, setSession as saveSession } from '../api';

const AppContext = createContext(null);

export function useAppContext() {
    const ctx = useContext(AppContext);
    if (!ctx) throw new Error('useAppContext must be used within AppProvider');
    return ctx;
}

const INITIAL_NEW_USER = {
    username: '', password: '', full_name: '', phone_number: '', role: 'BOOTH_AGENT',
    can_download: false, can_upload: false, can_verify: true,
    can_edit_voters: true, can_send_broadcasts: false, can_manage_system: false,
    assignments: { constituencies: [], local_bodies: [], booths: [] }
};

const INITIAL_NEW_LOC = {
    type: 'const', name: '', parentId: '', lbType: 'PANCHAYAT',
    boothNum: '', psName: '', psNo: ''
};

export function AppProvider({ children }) {
    // --- Auth ---
    const session = getSession();
    const [isLoggedIn, setIsLoggedIn] = useState(!!session.token);
    const [userRole, setUserRole] = useState(session.role);
    const [username, setUsername] = useState(session.username);
    const [currentUser, setCurrentUser] = useState(null);

    // --- Navigation ---
    const [view, setView] = useState('dashboard');

    // --- Login form (local to login screen but kept here for simplicity) ---
    const [loginUser, setLoginUser] = useState('');
    const [loginPass, setLoginPass] = useState('');
    const [loginConsent, setLoginConsent] = useState(false);

    // --- Shared reference data ---
    const [allLocations, setAllLocations] = useState([]);
    const [allUsers, setAllUsers] = useState([]);
    const [allParties, setAllParties] = useState([]);

    // --- Admin form state ---
    const [newLocData, setNewLocData] = useState(INITIAL_NEW_LOC);
    const [newUserData, setNewUserData] = useState(INITIAL_NEW_USER);
    const [newPartyData, setNewPartyData] = useState({ name: '', shortLabel: '', color: '#000080', gradient: '' });
    const [newPartyFile, setNewPartyFile] = useState(null);
    const [activePrintParty, setActivePrintParty] = useState(null);
    const [assignSelection, setAssignSelection] = useState({ constId: '', lbId: '' });
    const [editingUser, setEditingUser] = useState(null);
    const [editingLoc, setEditingLoc] = useState(null);

    // --- Global UI ---
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [editMode, setEditMode] = useState(false);
    const [editData, setEditData] = useState({});
    const [showChangePassword, setShowChangePassword] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    // --- Bootstrap: profile sync on login ---
    useEffect(() => {
        if (!isLoggedIn) return;
        if (currentUser) return; // already hydrated

        const s = getSession();
        const initialUser = {
            username: s.username,
            role: s.role,
            assignments: s.assignments || {},
            can_download: !!s.can_download,
            can_upload: !!s.can_upload,
            can_verify: !!s.can_verify,
            can_edit_voters: !!s.can_edit_voters,
            can_send_broadcasts: !!s.can_send_broadcasts,
            can_manage_system: !!s.can_manage_system,
        };
        setCurrentUser(initialUser);

        // Sync latest from server
        api.getMyProfile().then(latest => {
            setCurrentUser(latest);
            const current = getSession();
            saveSession({
                ...current,
                assignments: latest.assignments || {},
                can_download: latest.can_download,
                can_upload: latest.can_upload,
                can_verify: latest.can_verify,
                can_edit_voters: latest.can_edit_voters,
                can_send_broadcasts: latest.can_send_broadcasts,
                can_manage_system: latest.can_manage_system,
            });
        }).catch(() => {});
    }, [isLoggedIn]);

    // --- Health check on mount ---
    useEffect(() => {
        api.checkHealth().catch(() => {});
        if (isLoggedIn) loadAdminData();
    }, [isLoggedIn]);

    // --- Auth actions ---
    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            const res = await api.login(loginUser, loginPass);
            setIsLoggedIn(true);
            setUserRole(res.role);
            setUsername(res.username);
            setCurrentUser(res);
            return res; // allow callers to read the result (e.g. for filter init)
        } catch (_) {
            setError("Invalid credentials or server error");
            return null;
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        api.logout();
        setIsLoggedIn(false);
        setCurrentUser(null);
        setView('dashboard');
    };

    // --- Admin data loader ---
    const loadAdminData = async () => {
        try {
            const locs = await api.getLocations();
            setAllLocations(locs);
        } catch (_) {}

        if (['SUPERUSER', 'MANAGER'].includes(userRole)) {
            try {
                const users = await api.getUsers();
                setAllUsers(users);
            } catch (_) {}
        }

        try {
            const parties = await api.getParties();
            setAllParties(parties);
        } catch (_) {}
    };

    // --- Admin mutation actions ---
    const handleAddLocation = async () => {
        setLoading(true);
        try {
            let res;
            if (newLocData.type === 'const') res = await api.addConst(newLocData.name);
            else if (newLocData.type === 'lb') res = await api.addLB(newLocData.parentId, newLocData.name, newLocData.lbType);
            else if (newLocData.type === 'booth') res = await api.addBooth(newLocData.grandParentId, newLocData.parentId, newLocData.boothNum, newLocData.psName, newLocData.psNo);

            if (res && res.error) { alert("Blocked: " + res.error); return; }
            alert(`${newLocData.type.toUpperCase()} successfully registered.`);
            loadAdminData();
            setNewLocData(INITIAL_NEW_LOC);
        } catch (e) {
            alert("Error: " + (e.response?.data?.detail || e.message));
        } finally { setLoading(false); }
    };

    const handleUpdateLocation = async () => {
        setLoading(true);
        try {
            if (editingLoc.type === 'const') await api.updateConst(editingLoc.id, { name: newLocData.name });
            else if (editingLoc.type === 'lb') await api.updateLB(editingLoc.id, { name: newLocData.name, type: newLocData.lbType });
            else if (editingLoc.type === 'booth') await api.updateBooth(editingLoc.id, { number: newLocData.boothNum, ps_name: newLocData.psName, ps_no: newLocData.psNo });
            loadAdminData();
            setEditingLoc(null);
            setNewLocData(INITIAL_NEW_LOC);
            alert("Location updated successfully.");
        } catch (e) {
            alert("Error updating location: " + (e.response?.data?.detail || e.message));
        } finally { setLoading(false); }
    };

    const handleCreateUser = async () => {
        setLoading(true);
        try {
            const res = await api.createManagedUser(newUserData);
            if (res.success) {
                loadAdminData();
                setNewUserData(INITIAL_NEW_USER);
                alert("Staff account successfully activated and secured.");
            } else { alert("Creation Failed: " + res.message); }
        } catch (_) {
            alert("System Error: Unable to create user. Please check server logs.");
        } finally { setLoading(false); }
    };

    const handleDeleteUser = async (uid) => {
        if (!window.confirm("Are you sure?")) return;
        setLoading(true);
        try { await api.deleteUser(uid); loadAdminData(); }
        catch (e) { alert(e.message); }
        finally { setLoading(false); }
    };

    const handleUpdateUser = async () => {
        setLoading(true);
        try {
            const res = await api.updateManagedUser(editingUser.id, newUserData);
            if (res.success) {
                setEditingUser(null);
                loadAdminData();
                alert("User profile and permissions updated successfully.");
            } else { alert("Update Failed: " + res.message); }
        } catch (e) {
            alert("Update Failed: " + (e.response?.data?.detail || e.message));
        } finally { setLoading(false); }
    };

    const startEditUser = (u) => {
        setEditingUser(u);
        const assignments = u.assignments || {};
        setNewUserData({
            username: u.username,
            full_name: u.full_name || '',
            phone_number: u.phone_number || '',
            password: '',
            role: u.role,
            can_download: u.can_download, can_upload: u.can_upload,
            can_verify: u.can_verify, can_edit_voters: u.can_edit_voters,
            can_send_broadcasts: u.can_send_broadcasts, can_manage_system: u.can_manage_system,
            assignments: {
                constituencies: assignments.constituencies || u.constituency_ids || [],
                local_bodies: assignments.local_bodies || u.local_body_ids || [],
                booths: assignments.booths || u.booth_ids || []
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
        } catch (_) {}
        finally { setLoading(false); }
    };

    const handleSyncParties = async () => {
        setLoading(true);
        try {
            const res = await api.syncParties();
            if (res.success) { alert("Branding Synchronization Complete!"); loadAdminData(); }
        } catch (e) { alert("Synchronization Failed: " + e.message); }
        finally { setLoading(false); }
    };

    // --- Expose everything ---
    const value = {
        // Auth
        isLoggedIn, userRole, username, currentUser,
        loginUser, setLoginUser, loginPass, setLoginPass,
        loginConsent, setLoginConsent,
        handleLogin, handleLogout,

        // Navigation
        view, setView,

        // Shared data
        allLocations, allUsers, allParties, loadAdminData,

        // Admin form state + actions
        newLocData, setNewLocData, editingLoc, setEditingLoc,
        handleAddLocation, handleUpdateLocation,
        newUserData, setNewUserData, editingUser, setEditingUser,
        assignSelection, setAssignSelection,
        handleCreateUser, handleUpdateUser, handleDeleteUser, startEditUser,
        newPartyData, setNewPartyData, newPartyFile, setNewPartyFile,
        activePrintParty, setActivePrintParty,
        handleAddParty, handleSyncParties,

        // Global UI
        loading, setLoading, error, setError,
        editMode, setEditMode, editData, setEditData,
        showChangePassword, setShowChangePassword,
        showSuccess, setShowSuccess,
    };

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export default AppContext;
