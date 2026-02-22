import { app, BrowserWindow, nativeImage, globalShortcut, dialog } from 'electron';
import * as path from 'path';
import { autoUpdater } from 'electron-updater';

// Set the application name
app.name = 'GreenField CRM';

let mainWindow: BrowserWindow | null = null;

function createWindow() {
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

    // In development, load from Next.js dev server
    // URL selection logic
    // In development, load from Next.js dev server
    // In production, load from Vercel to support Server Actions (AI features)
    const isDev = !app.isPackaged;
    const prodUrl = process.env.GREENFIELD_PROD_URL || 'https://greenfield-app-web.vercel.app';
    const url = isDev
        ? 'http://localhost:9002'
        : prodUrl;

    console.log(`[Main] Environment: ${isDev ? 'Development' : 'Production'} (isPackaged: ${app.isPackaged})`);
    console.log(`[Main] Loading URL: ${url}`);

    mainWindow.loadURL(url).catch(err => {
        console.error(`[Main] Failed to initiate load: ${err}`);
    });

    // Verbose load event logging (kept for troubleshooting)
    mainWindow.webContents.on('did-finish-load', () => console.log('[Main] did-finish-load'));
    mainWindow.webContents.on('dom-ready', () => console.log('[Main] dom-ready'));

    // Error handling
    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
        const errorMsg = `Page failed to load: ${errorCode} - ${errorDescription} (URL: ${validatedURL})`;
        console.error(`[Main] ${errorMsg}`);

        // Show dialog on failure to load production URL
        if (app.isPackaged) {
            dialog.showMessageBox(mainWindow!, {
                type: 'error',
                title: 'Load Error',
                message: errorMsg,
                buttons: ['Reload', 'Quit']
            }).then((result) => {
                if (result.response === 0) {
                    mainWindow?.loadURL(url);
                } else {
                    app.quit();
                }
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

    // Auto-update check
    if (app.isPackaged) {
        autoUpdater.checkForUpdatesAndNotify();
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
    globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
