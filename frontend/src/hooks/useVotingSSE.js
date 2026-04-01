import { useEffect, useRef } from 'react';
import { getSession, clearSession } from '../api';

const API_BASE = import.meta.env.VITE_API_URL || '';

/**
 * SSE hook for real-time Election Day voting stats.
 * Connects to /api/voters/voting-stats/stream and pushes stats updates to the callback.
 * EventSource auto-reconnects on network drops (browser-native behavior).
 *
 * @param {string|number} boothId - Booth ID to stream stats for (null/empty = no connection)
 * @param {function} onStats - Callback receiving parsed stats object on each update
 */
const useVotingSSE = (boothId, onStats) => {
    const esRef = useRef(null);
    const onStatsRef = useRef(onStats);
    onStatsRef.current = onStats;

    useEffect(() => {
        if (!boothId) return;

        const session = getSession();
        const token = session?.token;
        if (!token) return;

        const url = `${API_BASE}/api/voters/voting-stats/stream?booth=${boothId}&token=${encodeURIComponent(token)}`;
        const es = new EventSource(url);
        esRef.current = es;

        es.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                onStatsRef.current(data);
            } catch (e) {
                console.warn('SSE parse error:', e);
            }
        };

        // Handle token expiry event from server
        es.addEventListener('auth_expired', () => {
            console.warn('SSE: Token expired, closing connection');
            es.close();
            clearSession();
            window.location.reload();
        });

        es.onerror = () => {
            // EventSource auto-reconnects natively — no custom logic needed.
            // This fires on network drops, server restarts, etc.
            // Browser will retry with increasing backoff automatically.
        };

        // Reconnect immediately when device comes back online (mobile agents)
        const handleOnline = () => {
            if (es.readyState === EventSource.CLOSED) {
                // Connection was fully closed, re-create it
                es.close();
                // Trigger effect re-run by... well, the effect depends on boothId
                // which hasn't changed. So we manually reconnect:
                const newEs = new EventSource(url);
                newEs.onmessage = es.onmessage;
                newEs.onerror = es.onerror;
                newEs.addEventListener('auth_expired', () => {
                    newEs.close();
                    clearSession();
                    window.location.reload();
                });
                esRef.current = newEs;
            }
        };
        window.addEventListener('online', handleOnline);

        return () => {
            es.close();
            esRef.current = null;
            window.removeEventListener('online', handleOnline);
        };
    }, [boothId]);
};

export default useVotingSSE;
