const {app, BrowserWindow, ipcMain, dialog, session } = require('electron')
const path = require('path')
const fs = require("fs");
const simpleGit = require('simple-git');
const stream = require("stream");



const urlInstanceTyroGit = app.getPath("appData") + "/.Tyrolium/TyroGit/";

// INITIALISATION DE L'ONGLET PRINCIPAL
function createWindow () {
    mainWindow = new BrowserWindow({
        frame: false,
        title: "TyroGit - 0.1.0",
        width: 361,
        height: 854,
        resizable: false,
        // transparent: true,
        icon: path.join(__dirname, "/assets/logo.png"),
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: true,
            contextIsolation: false,
            enableRemoteModule: true,
        }
    })

    let selectedRepo = urlInstanceTyroGit + "Selected_Repo.json";
    if (fs.existsSync(selectedRepo)) {
        mainWindow.loadFile('page/panel.html')
    } else {
        mainWindow.loadFile('page/start.html')
    }
    mainWindow.setMenuBarVisibility(false);

    initFile();

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



/***************
 * CHANGE PAGE
 **************/
ipcMain.on("reposChoose", () => {
    mainWindow.loadFile('page/repos.html');
});
ipcMain.on("panelChoose", () => {
    mainWindow.loadFile('page/panel.html');
});
ipcMain.on("branchChoose", () => {
    mainWindow.loadFile('page/branch.html');
});
ipcMain.on("settingsChoose", () => {
    mainWindow.loadFile('page/settings.html');
});



/***************
 * CONNEXION REPOS
 **************/
ipcMain.on('select-save-dirs', async (event, data) => {

    let filePath = data.url;

    if (filePath) {
            if (fs.existsSync(filePath)) {
                console.log('Le repertoire existe:', filePath);
                if (fs.existsSync(filePath + "/.git/")) {
                    console.log('Git existe:', filePath + "/.git/");
                    mainWindow.loadFile('page/panel.html');

                    getNameRepos(filePath, event);
                    getBranchRepos(filePath, event);
                    getDiffRepos(filePath, event);

                } else {
                    console.log('Git existe pas:', filePath);
                    event.reply('notif', { type: 'err', message: 'Le répertoire n\'est plus un repository Git.' });
                }
            } else {
                console.log('Le repertoire n\'existe plus:', filePath);
                event.reply('notif', { type: 'err', message: 'Le répertoire n\'existe plus.' });
            }
    } else {
        console.log('Aucun repertoire selectionne ou selection annulee');
        event.reply('notif', { type: 'err', message: 'Aucun répertoire sélectionné ou sélection annulée.' });
    }

})

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
                    mainWindow.loadFile('page/panel.html');

                    getNameRepos(filePath, event);
                    getBranchRepos(filePath, event);
                    getDiffRepos(filePath, event);

                } else {
                    console.log('Git existe pas:', filePath);
                    event.reply('notif', { type: 'err', message: 'Le répertoire n\'est pas un repository Git.' });
                }
            } else {
                console.log('Le repertoire n\'existe pas:', filePath);
                event.reply('notif', { type: 'err', message: 'Le répertoire n\'existe pas.' });
            }
        }
    } else {
        console.log('Aucun repertoire selectionne ou selection annulee');
        event.reply('notif', { type: 'err', message: 'Aucun répertoire sélectionné ou sélection annulée.' });
    }

})


function getNameRepos(gitRepoPath, event){
    const git = simpleGit(gitRepoPath);

    git.listRemote(['--get-url'], (err, remote) => {
        if (err) {
            event.reply('notif', { type: 'err', message: 'Git est mal configurer.' });
            console.error('Erreur lors de la récupération des informations sur le repository:', err);
            return;
        }

        const repoUrl = remote.trim();
        let repoName = repoUrl.split('/').pop().replace('.git', '');

        if (repoName === "") {
            // Si repoName est une chaîne vide, cela signifie que repoUrl se termine par un "/"
            // Dans ce cas, essayez de supprimer le dernier "/"
            repoName = repoUrl.slice(0, -1).split('/').pop().replace('.git', '');
        }

        console.log("Nom du repos", repoName)
        console.log("repoUrl ", repoUrl)
        event.reply('repos-set-info', { reposName: repoName, reposUrl: gitRepoPath });

        setFileActuel(repoName, gitRepoPath);

    });
}


function getBranchRepos(gitRepoPath, event) {

    const git = simpleGit(gitRepoPath);

    git.branch((err, branches) => {
        if (err) {
            console.error('Erreur lors de la récupération des branches:', err);
            return;
        }
        const currentBranch = branches.current;
        const allBranch = branches.all;

        // console.log('Liste de toutes les branches:', allBranch);
        console.log('Branche actuelle :', currentBranch);

        compareCommitCounts(gitRepoPath, currentBranch, event);
        event.reply('repos-set-branch', { reposBranchSelected: currentBranch, reposBranchAll: allBranch });

    });

}


function getDiffRepos(gitRepoPath, event) {

    const git = simpleGit(gitRepoPath);

    // Utilisez simple-git pour récupérer les différences entre HEAD (dernier commit) et HEAD~1 (commit précédent)
    git.status((err, status) => {
        if (err) {
            console.error('Erreur lors de la récupération de l\'état du repository :', err);
            return;
        }

        const untrackedFiles = status.not_added;

        const renameFiles = status.renamed;

        const modifiedFiles = status.modified;

        const createdFiles = status.created;

        const deletedFiles = status.deleted;

        // Affichez les listes de fichiers
        console.log('Liste des fichiers modifiés mais non encore ajoutés pour le commit :', untrackedFiles);
        console.log('Liste des fichiers modifiés :', modifiedFiles);
        console.log('Liste des nouveaux fichiers créés :', createdFiles);
        console.log('Liste des fichiers supprimés :', deletedFiles);
        console.log('Liste des fichiers rename :', renameFiles);

        event.reply('repos-set-file', { modifiedFiles: modifiedFiles, createdFiles: createdFiles, deletedFiles: deletedFiles, untrackedFiles:untrackedFiles, renameFiles:renameFiles});
    });
}
function getUnpushedCommitCount(reposUrl, callback) {
    const git = simpleGit(reposUrl);
    git.status((err, status) => {
        if (err) {
            console.error('Erreur lors de la récupération de l\'état du dépôt :', err);
            callback(err);
            return;
        }
        // Analyser la sortie de git status pour obtenir le nombre de commits non poussés
        const unpushedCommitCount = status.ahead;
        callback(null, unpushedCommitCount);
    });
}

function compareCommitCounts(repoUrl, branch, event) {
    getUnpushedCommitCount(repoUrl, (err, count) => {
        if (err) {
            // Gérer les erreurs
            return;
        }
        console.log(`Il y a ${count} commits non poussés.`);
        event.reply('repos-set-commit', { nbCommitNotPush:count });
    });
}

ipcMain.on('git-pull', async (event, data) => {

    const git = simpleGit({
        baseDir: data.url
    });

    git.pull((err, update) => {
        if (err) {
            console.error('Erreur lors du pull :', err);
            getSaveRepo(event);
            event.reply('notif', { type: 'err', message: 'Erreur lors du pull.' });
            return;
        }

        console.log('Pull effectué avec succès !');
        getSaveRepo(event);
        event.reply('notif', { type: 'true', message: 'Pull effectué avec succès !' });

        // Si des mises à jour ont été récupérées
        // if (update && update.summary.changes) {
        //     console.log('Mises à jour récupérées :', update.summary.changes);
        //     event.reply('notif', { type: 'info', message: 'Nouveau fichier recupérée.' });
        // }

    });

});
ipcMain.on('git-push', async (event, data) => {

    const git = simpleGit({
        baseDir: data.url
    });

    git.push('origin', data.branch, (err, result) => {
        if (err) {
            console.error('Erreur lors du push :', err);
            getSaveRepo(event);
            event.reply('notif', { type: 'err', message: 'Erreur lors du push.' });
            return;
        }

        console.log('Push effectué avec succès !');
        console.log('Résultat du push :', result);
        getSaveRepo(event);
        event.reply('notif', { type: 'true', message: 'Push effectué avec succès !' });
    });

});

ipcMain.on('git-commit', async (event, data) => {

    const git = simpleGit({
        baseDir: data.url
    });

    git.add('.')
        .commit(data.title + '\n\n' + data.desc)
        .then(() => {
            console.log('Commit effectué avec succès !');
            getSaveRepo(event);
            event.reply('notif', { type: 'true', message: 'Commit effectué avec succès !' });
        })
        .catch(err => {
            console.error('Erreur lors du commit :', err);
            getSaveRepo(event);
            event.reply('notif', { type: 'err', message: 'Erreur lors du commit' });
        });

});
ipcMain.on('git-checkout', async (event, data) => {

    const git = simpleGit(data.url);

    // Exécution de la commande git checkout
    git.checkout(data.branch, (err, result) => {
        if (err) {
            event.reply('notif', { type: 'err', message: 'Erreur lors du changement de branch' });
            console.error('Erreur lors du checkout :', err);
            return;
        }

        console.log('Checkout effectué avec succès !');
        mainWindow.loadFile('page/panel.html');

    });

});


/**********
* FILE
**********/

function initFile(){

    fs.mkdir(urlInstanceTyroGit, (err) => {
        if (err) {
            if (err.code === "EEXIST")
                console.log("Le Dossier '.Tyrolium/TyroGit' a deja ete cree");
        } else {
            console.log("Repertoire '.Tyrolium/TyroGit' cree avec succes.");
        }
    });

    let videInfo = {};

    let selectedRepo = urlInstanceTyroGit + "Selected_Repo.json";
    if (!fs.existsSync(selectedRepo)) {
        fs.appendFile(selectedRepo, JSON.stringify(videInfo), function (err) {
            if (err)
                throw err;
            console.log('Fichier Selected_Repo.json cree !');
        });
    } else {
        console.log('Le fichier Selected_Repo.json existe deja.');
    }

    let saveRepo = urlInstanceTyroGit + "Save_Repo.json";
    if (!fs.existsSync(saveRepo)) {
        fs.appendFile(saveRepo, "", function (err) {
            if (err)
                throw err;
            console.log('Fichier Save_Repo.json cree !');
        });
    } else {
        console.log('Le fichier Save_Repo.json existe deja.');
    }


}

function setFileActuel(name, url){

    let selectedRepo = urlInstanceTyroGit + "Selected_Repo.json";

    const getSelectedRepoPromise = new Promise((resolve, reject) => {
        fs.readFile(selectedRepo, 'utf8', (err, data) => {
            if (err) {
                reject(new Error("ERREUR AVEC LE FICHIER"))
                return;
            }
            resolve(JSON.parse(data));
        });
    });

    getSelectedRepoPromise.then((data) => {

        // console.log(data);

        data = {
            "name":name,
            "url":url
        };

        fs.writeFile(selectedRepo, JSON.stringify(data), function (err) {
            if (err)
                throw err;
            console.log('Fichier Selected_Repo.json update !');
        });

    });


    let saveRepo = urlInstanceTyroGit + "Save_Repo.json";

    const getSaveRepoPromise = new Promise((resolve, reject) => {
        fs.readFile(saveRepo, 'utf8', (err, data) => {
            if (err) {
                reject(new Error("ERREUR AVEC LE FICHIER"))
                return;
            }
            if (data){
                resolve(JSON.parse(data));
            } else {
                resolve(null)
            }
        });
    });

    getSaveRepoPromise.then((data) => {

        // console.log("data : ", data);

        let newSave = {
            name:name,
            url:url
        };



        if (data !== null){
            let isExist = "0";

            data.forEach(saveRepoOne => {

                // console.log(saveRepoOne);

                if (saveRepoOne.name == newSave.name && saveRepoOne.url == newSave.url){
                    isExist = "1";
                }

            });

            if (isExist == "0"){

                data.push(newSave);

                fs.writeFile(saveRepo, JSON.stringify(data), function (err) {
                    if (err)
                        throw err;
                    console.log('Fichier Save_Repo.json update !');
                });

            } else {
                console.log("existe deja : ", newSave.name)
            }

        } else {
            console.log("null");

            let newData = [
                newSave
            ];

            fs.writeFile(saveRepo, JSON.stringify(newData), function (err) {
                if (err)
                    throw err;
                console.log('Fichier Save_Repo.json first update !');
            });

        }



    });



}


ipcMain.on('get-save-repo', async (event, arg) => {

    getSaveRepo(event)


});

function getSaveRepo(event){
    let selectedRepo = urlInstanceTyroGit + "Selected_Repo.json";

    const getSelectedRepoPromise = new Promise((resolve, reject) => {
        fs.readFile(selectedRepo, 'utf8', (err, data) => {
            if (err) {
                reject(new Error("ERREUR AVEC LE FICHIER"))
                return;
            }
            resolve(JSON.parse(data));
        });
    });

    getSelectedRepoPromise.then((data) => {

        console.log("update repos");

        getBranchRepos(data.url, event);
        getDiffRepos(data.url, event);

        event.reply('repos-set-info', { reposName: data.name, reposUrl: data.url });

    });
}

ipcMain.on('get-repo-page', async (event, arg) => {

    getSelectedRepoPage(event);

});

ipcMain.on('get-repo-page-saveFile', async (event, arg) => {

    getSaveRepoPage(event);

});

function getSaveRepoPage(event){

    let saveRepo = urlInstanceTyroGit + "Save_Repo.json";

    const getSaveRepoPromise = new Promise((resolve, reject) => {
        fs.readFile(saveRepo, 'utf8', (err, data) => {
            if (err) {
                reject(new Error("ERREUR AVEC LE FICHIER"))
                return;
            }
            if (data){
                resolve(JSON.parse(data));
            } else {
                resolve(null)
            }
        });
    });

    getSaveRepoPromise.then((data) => {

        event.reply('get-repos-save', { saveFile: data });

    });

}
function getSelectedRepoPage(event){

    let selectedRepo = urlInstanceTyroGit + "Selected_Repo.json";

    const getSelectedRepoPromise = new Promise((resolve, reject) => {
        fs.readFile(selectedRepo, 'utf8', (err, data) => {
            if (err) {
                reject(new Error("ERREUR AVEC LE FICHIER"))
                return;
            }
            resolve(JSON.parse(data));
        });
    });

    getSelectedRepoPromise.then((data) => {

        event.reply('get-repos-selected', { reposName: data.name, reposUrl: data.url });

    });

}

ipcMain.on('get-branch-page', async (event, data) => {

    const git = simpleGit(data.url);

    git.branch((err, branches) => {
        if (err) {
            console.error('Erreur lors de la récupération des branches:', err);
            return;
        }
        const currentBranch = branches.current;
        const allBranch = branches.all;

        // console.log('Liste de toutes les branches:', allBranch);
        console.log('Branche actuelle :', currentBranch);
        event.reply('transfere-branch', { reposBranchSelected: currentBranch, reposBranchAll: allBranch });

    });


});
