import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../api';
import { DEFAULT_PAGE_SIZE, FILTER_DEBOUNCE_MS, STATS_DEBOUNCE_MS } from '../constants';

/**
 * Manages voter list state, filters, pagination, and dashboard/strategic stats.
 *
 * Depends on AppContext values passed in via `deps`:
 *   - isLoggedIn, view, userRole (to know when to fetch)
 *   - setLoading (global loading flag for inline edits)
 *   - loadStats is exposed so OCR save-to-db can refresh dashboard
 */
export default function useVoters({ isLoggedIn, view }) {
    // --- Stats ---
    const [dashboardStats, setDashboardStats] = useState(null);
    const [strategicStats, setStrategicStats] = useState(null);

    // --- Filters ---
    const [dashFilters, setDashFilters] = useState({ constituency: '', lb: '', booth: '' });
    const [listFilters, setListFilters] = useState({
        constituency: '', lb: '', booth: '',
        gender: '', ageFrom: '', ageTo: '',
        leaning: '', serialFrom: '', serialTo: '', location: ''
    });
    const [searchQuery, setSearchQuery] = useState('');

    // --- Voter list ---
    const [voterList, setVoterList] = useState([]);
    const [voterTotal, setVoterTotal] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [voterLoading, setVoterLoading] = useState(false);

    // --- Debounce ref ---
    const lastFiltersRef = useRef(null);

    // --- Load stats (dashboard + strategic) ---
    const loadStats = useCallback(() => {
        api.getStats(dashFilters.constituency, dashFilters.lb, dashFilters.booth)
            .then(setDashboardStats)
            .catch(() => {});

        api.getStrategicAnalytics(dashFilters.constituency)
            .then(setStrategicStats)
            .catch(() => {
                setStrategicStats({ booth_stats: [], recent_activity: [] });
            });
    }, [dashFilters.constituency, dashFilters.lb, dashFilters.booth]);

    // --- Load voter list ---
    const loadVoters = useCallback(async (page = 1, overrideFilters = null) => {
        setVoterLoading(true);
        const tf = overrideFilters || listFilters;
        try {
            const data = await api.getVoters({
                search: searchQuery,
                constituency: tf.constituency,
                lb: tf.lb,
                booth: tf.booth,
                gender: tf.gender,
                age_from: tf.ageFrom,
                age_to: tf.ageTo,
                location: tf.location,
                leaning: tf.leaning,
                serial_from: tf.serialFrom,
                serial_to: tf.serialTo,
                page,
                page_size: DEFAULT_PAGE_SIZE,
            });
            setVoterList(data.results);
            setVoterTotal(data.total || data.count || 0);
            setCurrentPage(page);
        } catch (_) {}
        setVoterLoading(false);
    }, [listFilters, searchQuery]);

    // --- Inline intel update (leaning, phone, etc from VoterList rows) ---
    const handleUpdateIntel = useCallback(async (voterId, updates) => {
        try {
            const res = await api.editVoterInDB(voterId, updates);
            if (res.success) {
                setVoterList(prev => prev.map(v => v.id === voterId ? { ...v, ...updates } : v));
                loadStats();
            }
        } catch (_) {}
    }, [loadStats]);

    // --- Auto-init filters for booth agents ---
    const initBoothAgentFilters = useCallback((role, assignments) => {
        if (role === 'BOOTH_AGENT' && assignments?.booths?.length > 0) {
            const bid = String(assignments.booths[0]);
            setDashFilters(prev => ({ ...prev, booth: bid, constituency: '', lb: '' }));
            setListFilters(prev => ({ ...prev, booth: bid, constituency: '', lb: '' }));
        }
    }, []);

    // --- Effect: debounced voter list reload on filter change ---
    useEffect(() => {
        if (!isLoggedIn || view !== 'voters') return;

        const currentFilterState = JSON.stringify({ dashFilters, listFilters, searchQuery });
        if (lastFiltersRef.current !== currentFilterState) {
            const timer = setTimeout(() => {
                loadVoters(1);
                lastFiltersRef.current = currentFilterState;
            }, FILTER_DEBOUNCE_MS);
            return () => clearTimeout(timer);
        }
    }, [view, dashFilters, listFilters, searchQuery, isLoggedIn, loadVoters]);

    // --- Effect: load stats when dashboard view is active ---
    useEffect(() => {
        if (!isLoggedIn) return;
        const timer = setTimeout(() => {
            if (view === 'dashboard') loadStats();
        }, STATS_DEBOUNCE_MS);
        return () => clearTimeout(timer);
    }, [view, dashFilters, isLoggedIn, loadStats]);

    return {
        // Stats
        dashboardStats, strategicStats, loadStats,

        // Filters
        dashFilters, setDashFilters,
        listFilters, setListFilters,
        searchQuery, setSearchQuery,

        // Voter list
        voterList, setVoterList, voterTotal, currentPage, voterLoading,
        loadVoters,

        // Actions
        handleUpdateIntel,
        initBoothAgentFilters,
    };
}
