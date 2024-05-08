const {app, BrowserWindow, ipcMain, dialog} = require('electron')
const path = require('path')
const fs = require("fs");
const simpleGit = require('simple-git');
const stream = require("stream");


// INITIALISATION DE L'ONGLET PRINCIPAL
function createWindow () {
    mainWindow = new BrowserWindow({
        frame: false,
        title: "TyroGit - 0.1.0",
        width: 361,
        height: 854,
        resizable: false,
        icon: path.join(__dirname, "/assets/logo.png"),
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: true,
            contextIsolation: false,
            enableRemoteModule: true,
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


// SELECT DIRS
ipcMain.on('select-dirs', async (event, arg) => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory']
    })
    console.log('directories selected', result.filePaths)

    if (!result.canceled && result.filePaths.length > 0) {
        for (const filePath of result.filePaths) {
            if (fs.existsSync(filePath)) {
                console.log('Le repertoire existe:', filePath);
                if (fs.existsSync(filePath + "/.git/")) {
                    console.log('Git existe:', filePath + "/.git/");

                    getNameRepos(filePath);
                    // getBranchRepos(filePath);
                    getDiffRepos(filePath)

                } else {
                    console.log('Git existe pas:', filePath);
                }
            } else {
                console.log('Le repertoire n\'existe pas:', filePath);
            }
        }
    } else {
        console.log('Aucun répertoire selectionne ou sélection annulee');
    }

})


function getNameRepos(gitRepoPath){
    const git = simpleGit(gitRepoPath);

    git.listRemote(['--get-url'], (err, remote) => {
        if (err) {
            console.error('Erreur lors de la récupération des informations sur le repository:', err);
            return;
        }

        const repoUrl = remote.trim();
        const repoName = repoUrl.split('/').pop().replace('.git', '');

        console.log(repoName)
    });
}


function getBranchRepos(gitRepoPath) {

    const git = simpleGit(gitRepoPath);

    git.branch((err, branches) => {
        if (err) {
            console.error('Erreur lors de la récupération des branches:', err);
            return;
        }

        console.log('Liste de toutes les branches:', branches.all);
    });

}


function getDiffRepos(gitRepoPath) {

    const git = simpleGit(gitRepoPath);

    // Utilisez simple-git pour récupérer les différences entre HEAD (dernier commit) et HEAD~1 (commit précédent)
    git.status((err, status) => {
        if (err) {
            console.error('Erreur lors de la récupération de l\'état du repository :', err);
            return;
        }

        // Obtenez la liste des fichiers modifiés mais non encore ajoutés pour le commit
        const untrackedFiles = status.not_added;

        // Obtenez la liste des fichiers modifiés
        const modifiedFiles = status.modified;

        // Obtenez la liste des nouveaux fichiers créés
        const createdFiles = status.created;

        const deletedFiles = status.deleted;

        // Affichez les listes de fichiers
        console.log('Liste des fichiers modifiés mais non encore ajoutés pour le commit :', untrackedFiles);
        console.log('Liste des fichiers modifiés :', modifiedFiles);
        console.log('Liste des nouveaux fichiers créés :', createdFiles);
        console.log('Liste des fichiers supprimés :', deletedFiles);
    });
}