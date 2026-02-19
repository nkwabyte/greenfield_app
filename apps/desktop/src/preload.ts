console.log('[Preload] Script starting...');
import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electron', {
    // Add any Electron-specific APIs you want to expose to the web app
    platform: process.platform,
    versions: process.versions,
});
