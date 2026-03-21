import { useState, useEffect, useCallback } from 'react';
import api from '../api';
import { STATS_DEBOUNCE_MS } from '../constants';

/**
 * Manages communication hub state: stats, templates, broadcast sending.
 *
 * Depends on:
 *   - isLoggedIn, view (to know when to fetch comm data)
 *   - setLoading (global loading flag from context)
 */
export default function useComm({ isLoggedIn, view, setLoading }) {
    const [commStats, setCommStats] = useState({ total_sent: 0, whatsapp: 0, sms: 0, calls: 0, status_dist: {} });
    const [commTemplates, setCommTemplates] = useState([]);
    const [commType, setCommType] = useState('WHATSAPP');
    const [commMessage, setCommMessage] = useState('');
    const [selectedImage, setSelectedImage] = useState(null);

    // --- Load comm data ---
    const loadCommData = useCallback(async () => {
        try {
            const [stats, templates] = await Promise.all([
                api.getCommStats(),
                api.getTemplates(),
            ]);
            setCommStats(stats);
            setCommTemplates(templates);
        } catch (_) {}
    }, []);

    // --- Auto-load when comm view is active ---
    useEffect(() => {
        if (!isLoggedIn || view !== 'comm') return;
        const timer = setTimeout(loadCommData, STATS_DEBOUNCE_MS);
        return () => clearTimeout(timer);
    }, [view, isLoggedIn, loadCommData]);

    // --- Send broadcast ---
    const handleCommunicationSend = useCallback(async (payload) => {
        setLoading(true);
        try {
            if (payload.mode === 'FILTERED' || payload.image) {
                await api.sendBroadcastForm({
                    heading: payload.heading,
                    message: payload.message,
                    medium: payload.type,
                    filters: JSON.stringify(payload.filters || {}),
                    image: payload.image
                });
            } else {
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
    }, [setLoading]);

    return {
        commStats, commTemplates,
        commType, setCommType,
        commMessage, setCommMessage,
        selectedImage, setSelectedImage,
        loadCommData, handleCommunicationSend,
    };
}
