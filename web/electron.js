// electron.js
const { app, BrowserWindow } = require('electron');
const { autoUpdater } = require('electron-updater');
// const path = require('path');

autoUpdater.logger = require("electron-log");
autoUpdater.logger.transports.file.level = "debug";
autoUpdater.checkForUpdatesAndNotify();

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
