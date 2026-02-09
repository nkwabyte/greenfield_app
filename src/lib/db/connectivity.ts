/**
 * Connectivity Service
 * Monitors online/offline status and manages connectivity state
 */

import type { ConnectivityState } from './types';

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
            }
        }
    }

    private handleOnline = () => {
        this.state.isOnline = true;
        this.state.lastOnlineAt = Date.now();
        console.log('🟢 Connection restored');
        this.notifyListeners(true);
    };

    private handleOffline = () => {
        this.state.isOnline = false;
        this.state.lastOfflineAt = Date.now();
        console.log('🔴 Connection lost - working offline');
        this.notifyListeners(false);
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
        if (!navigator.onLine) {
            return false;
        }

        try {
            // Try to fetch a small resource to verify actual connectivity
            const response = await fetch('/favicon.ico', {
                method: 'HEAD',
                cache: 'no-cache',
            });
            return response.ok;
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
