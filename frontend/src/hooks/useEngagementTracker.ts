import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { addEngagementSession, getAllEngagementSessions, clearEngagementSessions } from '../utils/indexedDB';

const SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

export const useEngagementTracker = () => {
    const location = useLocation();
    const activeTimeRef = useRef(0);
    const interactionsRef = useRef(0);
    const lastActiveRef = useRef(Date.now());
    const intervalRef = useRef<number | null>(null);
    const currentPathRef = useRef(location.pathname);

    const getDeviceInfo = () => {
        return {
            userAgent: navigator.userAgent,
            screenWidth: window.screen.width,
            screenHeight: window.screen.height,
            language: navigator.language
        };
    };

    const flushCurrentSession = async () => {
        if (activeTimeRef.current > 0 || interactionsRef.current > 0) {
            await addEngagementSession({
                page_url: currentPathRef.current,
                active_time: Math.round(activeTimeRef.current),
                interactions: interactionsRef.current,
                device_info: getDeviceInfo(),
                timestamp: new Date().toISOString()
            });
            activeTimeRef.current = 0;
            interactionsRef.current = 0;
        }
    };

    const syncToServer = async () => {
        await flushCurrentSession();
        const sessions = await getAllEngagementSessions();
        if (sessions.length === 0) return;

        const batchId = crypto.randomUUID();
        
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/track_engagement.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ batch_id: batchId, sessions })
            });

            const data = await response.json();
            if (response.ok && data.status === 'success') {
                const idsToDelete = sessions.map(s => s.id as number);
                await clearEngagementSessions(idsToDelete);
            }
        } catch (error) {
            console.error('Failed to sync engagement data:', error);
        }
    };

    useEffect(() => {
        const rawUser = localStorage.getItem('user');
        if (!rawUser) return; // Only track if logged in

        const handleActivity = () => {
            interactionsRef.current += 1;
            lastActiveRef.current = Date.now();
        };

        const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart'];
        activityEvents.forEach(e => window.addEventListener(e, handleActivity));

        // Time tracking (only track if user was active in last 30s)
        const timeInterval = setInterval(() => {
            if (Date.now() - lastActiveRef.current < 30000) {
                activeTimeRef.current += 1;
            }
        }, 1000);

        // Sync interval
        intervalRef.current = setInterval(syncToServer, SYNC_INTERVAL_MS);

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden') {
                syncToServer();
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            activityEvents.forEach(e => window.removeEventListener(e, handleActivity));
            clearInterval(timeInterval);
            if (intervalRef.current) clearInterval(intervalRef.current);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            flushCurrentSession(); // ensure we save on unmount
        };
    }, []);

    // Handle route changes
    useEffect(() => {
        const rawUser = localStorage.getItem('user');
        if (!rawUser) return;

        if (currentPathRef.current !== location.pathname) {
            flushCurrentSession().then(() => {
                currentPathRef.current = location.pathname;
                lastActiveRef.current = Date.now(); // reset active timer for new page
            });
        }
    }, [location.pathname]);
};
