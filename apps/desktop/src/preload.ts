console.log('[Preload] Script starting...');
import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electron', {
    platform: process.platform,
    versions: process.versions,
    getAppVersion: () => ipcRenderer.invoke('get-app-version'),
    checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
    /** One-shot check: resolves true if the app can reach the server right now. */
    isOnline: () => ipcRenderer.invoke('is-online'),
    /**
     * Subscribe to connectivity-change events pushed by the main process.
     * The main process polls the server every 30 s and calls this callback
     * whenever the online/offline state actually changes.
     * Returns an unsubscribe function — call it to remove the listener.
     */
    onConnectivityChanged: (callback: (isOnline: boolean) => void): (() => void) => {
        const handler = (_event: Electron.IpcRendererEvent, isOnline: boolean) => callback(isOnline);
        ipcRenderer.on('connectivity-changed', handler);
        return () => ipcRenderer.removeListener('connectivity-changed', handler);
    },
});
