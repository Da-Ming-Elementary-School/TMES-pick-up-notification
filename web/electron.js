// electron.js
const { app, BrowserWindow, Notification } = require('electron');
const { autoUpdater } = require('electron-updater');
// const path = require('path');

app.setAppUserModelId("DMES.PickUpNotification");

autoUpdater.logger = require("electron-log/main");
autoUpdater.logger.transports.file.level = "debug";
autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;
autoUpdater.checkForUpdatesAndNotify().then((result) => {
    console.log(result.isUpdateAvailable);
});

function createWindow () {
    const win = new BrowserWindow({
        autoHideMenuBar: true,
        width: 800,
        height: 600,
        webPreferences: {
            // preload: path.join(__dirname, 'preload.js'),
            contextIsolation: false,
            nodeIntegration: true
        }
    });

    win.loadFile('index.html').then();
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});
