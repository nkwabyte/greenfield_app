/**
 * Connectivity Service
 * Monitors online/offline status and manages connectivity state
 */

import type { ConnectivityState } from './types';

/** Timeout (ms) for the active HTTP connectivity probe */
const CONNECTIVITY_CHECK_TIMEOUT_MS = 5000;

/**
 * URL used to probe real internet access.
 * Uses Google's dedicated connectivity-check endpoint (returns 204 No Content).
 * Requests are sent with mode:'no-cors' so no CORS headers are required.
 */
const CONNECTIVITY_CHECK_URL = 'https://www.google.com';

class ConnectivityService {
    private listeners: Set<(isOnline: boolean) => void> = new Set();
    private state: ConnectivityState = {
        isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    };

    constructor() {
        if (typeof window !== 'undefined') {
            // Listen for online/offline events
            window.addEventListener('online', this.handleOnline);
            window.addEventListener('offline', this.handleOffline);

            // Initialize state
            this.state.isOnline = navigator.onLine;
            if (this.state.isOnline) {
                this.state.lastOnlineAt = Date.now();
            } else {
                this.state.lastOfflineAt = Date.now();
                // navigator.onLine can be unreliable in desktop (Electron) apps,
                // particularly during startup. Run a real connectivity check and
                // update state if we are actually online.
                this.checkConnection().then((online) => {
                    if (online) {
                        this.handleOnline();
                    }
                }).catch(() => { /* keep current offline state */ });
            }
        }
    }

    private handleOnline = () => {
        this.state.isOnline = true;
        this.state.lastOnlineAt = Date.now();
        // console.log('🟢 Connection restored');
        this.notifyListeners(true);
    };

    private handleOffline = () => {
        this.state.isOnline = false;
        this.state.lastOfflineAt = Date.now();
        // console.log('🔴 Connection lost - working offline');
        this.notifyListeners(false);

        // Verify offline status asynchronously. In desktop (Electron) environments
        // the browser 'offline' event can fire spuriously (e.g. when switching
        // between network adapters). If we can still reach the internet, restore
        // the online state immediately so sync is not incorrectly blocked.
        this.checkConnection().then((actuallyOnline) => {
            if (actuallyOnline) {
                this.handleOnline();
            }
        }).catch(() => { /* keep offline state on unexpected error */ });
    };

    private notifyListeners(isOnline: boolean) {
        this.listeners.forEach(listener => listener(isOnline));
    }

    /**
     * Subscribe to connectivity changes
     */
    subscribe(listener: (isOnline: boolean) => void): () => void {
        this.listeners.add(listener);

        // Return unsubscribe function
        return () => {
            this.listeners.delete(listener);
        };
    }

    /**
     * Get current connectivity state
     */
    getState(): ConnectivityState {
        return { ...this.state };
    }

    /**
     * Check if currently online
     */
    isOnline(): boolean {
        return this.state.isOnline;
    }

    /**
     * Manually check connection (useful for testing)
     */
    async checkConnection(): Promise<boolean> {
        try {
            // Use a well-known absolute URL so this works correctly in desktop
            // (Electron) apps where a relative URL would resolve to the app server
            // rather than testing real internet access. The request uses no-cors so
            // CORS headers are not required, and a short timeout prevents long hangs.
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), CONNECTIVITY_CHECK_TIMEOUT_MS);
            await fetch(CONNECTIVITY_CHECK_URL, {
                method: 'HEAD',
                cache: 'no-cache',
                mode: 'no-cors',
                signal: controller.signal,
            });
            clearTimeout(timeoutId);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Cleanup event listeners
     */
    destroy() {
        if (typeof window !== 'undefined') {
            window.removeEventListener('online', this.handleOnline);
            window.removeEventListener('offline', this.handleOffline);
        }
        this.listeners.clear();
    }
}

// Export singleton instance
export const connectivityService = new ConnectivityService();
