import { app, BrowserWindow, nativeImage, globalShortcut, dialog, ipcMain, net } from 'electron';
import * as path from 'path';
import { autoUpdater } from 'electron-updater';

// Set the application name
app.name = 'GreenField CRM';

/**
 * Connectivity probe URL — used both at startup and during background monitoring.
 * We probe the production Vercel URL so a successful response means the app can
 * also reach Supabase (same network path).
 */
const PROD_URL = process.env.GREENFIELD_PROD_URL || 'https://greenfield-app-web.vercel.app';

/** How often (ms) the main process polls for connectivity changes during a session. */
const CONNECTIVITY_POLL_INTERVAL_MS = 30_000;

/** Resolves true if the remote URL responds within timeoutMs, false otherwise. */
function checkConnectivity(url: string, timeoutMs = 5000): Promise<boolean> {
    return new Promise((resolve) => {
        const req = net.request({ method: 'HEAD', url });
        const timer = setTimeout(() => { req.abort(); resolve(false); }, timeoutMs);
        req.on('response', () => { clearTimeout(timer); resolve(true); });
        req.on('error', () => { clearTimeout(timer); resolve(false); });
        req.end();
    });
}

let mainWindow: BrowserWindow | null = null;
let connectivityMonitorTimer: NodeJS.Timeout | null = null;
let lastKnownOnlineState: boolean | null = null; // null = not yet checked

/**
 * Starts a background connectivity monitor.
 * Polls PROD_URL every CONNECTIVITY_POLL_INTERVAL_MS. Whenever the online/offline
 * state changes, it pushes a `connectivity-changed` IPC event to the renderer so
 * the web app's ConnectivityService can react immediately (trigger sync, update UI).
 */
function startConnectivityMonitor(): void {
    if (connectivityMonitorTimer) return;

    const probe = async () => {
        const online = await checkConnectivity(PROD_URL);
        if (online !== lastKnownOnlineState) {
            lastKnownOnlineState = online;
            console.log(`[Main] Connectivity changed → ${online ? 'online' : 'offline'}`);
            mainWindow?.webContents.send('connectivity-changed', online);
        }
    };

    // Run immediately so the renderer gets an early signal, then keep polling.
    probe();
    connectivityMonitorTimer = setInterval(probe, CONNECTIVITY_POLL_INTERVAL_MS);
}

function stopConnectivityMonitor(): void {
    if (connectivityMonitorTimer) {
        clearInterval(connectivityMonitorTimer);
        connectivityMonitorTimer = null;
    }
}

async function createWindow() {
    const iconPath = path.join(__dirname, '../build/icon.png');
    const appIcon = nativeImage.createFromPath(iconPath);

    // Set the dock icon on macOS
    if (process.platform === 'darwin' && app.dock) {
        app.dock.setIcon(appIcon);
    }

    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        title: 'GreenField CRM',
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
        },
        icon: iconPath,
    });

    // URL selection logic:
    //  - Dev:        always localhost:9002 (Next.js dev server)
    //  - Production: always load the bundled static export (file://).
    //
    // The static bundle is the offline-first build — all routes are pre-generated
    // HTML files on disk, so navigation works regardless of internet connectivity.
    // Supabase data sync is handled by the app's own ConnectivityService and
    // SyncQueue, which trigger automatically when a connection is (re-)established.
    const isDev = !app.isPackaged;
    const localIndexPath = path.join(app.getAppPath(), 'web', 'out', 'index.html');
    const localUrl = `file://${localIndexPath}`;

    const url = isDev ? 'http://localhost:9002' : localUrl;

    console.log(`[Main] Environment: ${isDev ? 'Development' : 'Production'} (isPackaged: ${app.isPackaged})`);
    console.log(`[Main] Loading URL: ${url}`);

    mainWindow.loadURL(url).catch(err => {
        console.error(`[Main] Failed to initiate load: ${err}`);
    });

    // Start the connectivity monitor once the page is ready so IPC messages reach the renderer.
    mainWindow.webContents.on('did-finish-load', () => {
        console.log('[Main] did-finish-load');
        if (!isDev) startConnectivityMonitor();
    });

    mainWindow.webContents.on('dom-ready', () => console.log('[Main] dom-ready'));

    // Error handling
    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
        const errorMsg = `Page failed to load: ${errorCode} - ${errorDescription} (URL: ${validatedURL})`;
        console.error(`[Main] ${errorMsg}`);

        if (app.isPackaged) {
            dialog.showMessageBox(mainWindow!, {
                type: 'error',
                title: 'Load Error',
                message: errorMsg,
                buttons: ['Reload', 'Quit'],
            }).then((result) => {
                if (result.response === 0) mainWindow?.loadURL(url);
                else app.quit();
            });
        }
    });

    mainWindow.webContents.on('render-process-gone', (event, details) => {
        console.error(`[Main] Renderer process gone: ${details.reason}`);
        dialog.showErrorBox('Crashed', `The renderer process is gone: ${details.reason}`);
    });

    if (isDev) {
        // mainWindow.webContents.openDevTools();
    }

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

app.whenReady().then(() => {
    createWindow();

    // IPC Handlers for Settings page
    ipcMain.handle('get-app-version', () => app.getVersion());
    ipcMain.handle('is-online', () => checkConnectivity(PROD_URL));
    ipcMain.handle('check-for-updates', async () => {
        if (app.isPackaged) {
            try {
                await autoUpdater.checkForUpdates();
                return { success: true };
            } catch (err: any) {
                console.error('[AutoUpdater] Manual check failed:', err);
                return { success: false, error: err?.message ?? 'Update check failed' };
            }
        }
        return { success: false, error: 'Auto-update is only available in the packaged application.' };
    });

    // Auto-update check
    if (app.isPackaged) {
        autoUpdater.autoDownload = true;
        autoUpdater.autoInstallOnAppQuit = true;
        autoUpdater.checkForUpdatesAndNotify();

        autoUpdater.on('update-available', (info) => {
            dialog.showMessageBox({
                type: 'info',
                title: 'Update Available',
                message: `Version ${info.version} is available. Downloading now in the background...`,
                buttons: ['Okay']
            });
        });

        autoUpdater.on('update-downloaded', (info) => {
            dialog.showMessageBox({
                type: 'info',
                title: 'Update Ready',
                message: `Version ${info.version} has been downloaded. The application will restart to install it.`,
                buttons: ['Restart Now', 'Later']
            }).then((result) => {
                if (result.response === 0) {
                    // isSilent = true, isForceRunAfter = true
                    // Ensures smooth restart on both Windows (NSIS silent install) and Mac
                    autoUpdater.quitAndInstall(true, true);
                }
            });
        });

        autoUpdater.on('error', (err) => {
            console.error('[AutoUpdater] Error fetching updates', err);
            // We do not show an error dialog here to prevent annoying popups if the network is down
        });
    }

    // Register a shortcut to open DevTools in production for debugging
    const devToolsShortcut = process.platform === 'darwin' ? 'Command+Alt+I' : 'Control+Shift+I';
    globalShortcut.register(devToolsShortcut, () => {
        if (mainWindow) {
            mainWindow.webContents.toggleDevTools();
        }
    });

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('will-quit', () => {
    stopConnectivityMonitor();
    globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
