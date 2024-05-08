const {app, BrowserWindow, ipcMain, dialog} = require('electron')
const path = require('path')
const fs = require("fs");


// INITIALISATION DE L'ONGLET PRINCIPAL
function createWindow () {
    mainWindow = new BrowserWindow({
        frame: false,
        title: "TyroGit - 0.1.0",
        width: 361,
        height: 854,
        resizable: true,
        icon: path.join(__dirname, "/assets/logo.png"),
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            enableRemoteModule: true,
            // preload: path.join(__dirname, 'preload.js'),
        }
    })

    // mainWindow.loadFile('page/start.html')
    mainWindow.loadFile('page/panel.html')
    mainWindow.setMenuBarVisibility(false);

}

// CREATION DE L'ONGLET PRINCIPAL
app.whenReady().then(() => {
    createWindow()

    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0){
            createWindow()
        }
    })
})

// METTRE EN PETIT L'ONGLET PRINCIPAL
ipcMain.on("manualMinimize", () => {
    mainWindow.minimize();
});


// MAXIMIZE DE L'ONGLET PRINCIPAL
let maximizeToggle=false;
ipcMain.on("manualMaximize", () => {
    if (maximizeToggle) {
        mainWindow.unmaximize();
    } else {
        mainWindow.maximize();
    }
    maximizeToggle=!maximizeToggle;
});

// FERMETURE DE L'ONGLET PRINCIPAL
ipcMain.on("manualClose", () => {
    app.quit();
  if (process.platform !== 'darwin') app.quit()
});
