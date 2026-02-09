"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
electron_1.contextBridge.exposeInMainWorld('electron', {
    // Add any Electron-specific APIs you want to expose to the web app
    platform: process.platform,
    versions: process.versions,
});
