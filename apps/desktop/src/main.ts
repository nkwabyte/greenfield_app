import { app, BrowserWindow, nativeImage } from 'electron';
import * as path from 'path';
import * as isDev from 'electron-is-dev';

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
    // In production, load from Vercel to support Server Actions (AI features)
    const url = isDev
        ? 'http://localhost:9002'
        : 'https://greenfield-app-web.vercel.app';

    mainWindow.loadURL(url);

    if (isDev) {
        // mainWindow.webContents.openDevTools();
    }

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
