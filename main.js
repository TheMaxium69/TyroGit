const {app, BrowserWindow, ipcMain, dialog } = require('electron')
const path = require('path');
const fs = require("fs");
const request = require('request');
const {spawn} = require("child_process");
const http = require("http");


let urlTyroInstance = "/.Tyrolium/";
let urlTyroGit = urlTyroInstance + "TyroGit/";
let apiUrl = "http://tyrolium.fr/Download/TyroGit/index.php";

function createWindow () {
    mainWindow = new BrowserWindow({
        frame: false,
        title: "TyroGit Loader",
        width: 419,
        height: 572,
        resizable: false,
        icon: path.join(__dirname, "/assets/logo.png"),
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            enableRemoteModule: true,
        }
    })

    mainWindow.loadFile('module/index.html')
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



ipcMain.on("start", (event, data) =>{


    let TyroliumInstance = path.join(app.getPath("appData"), urlTyroInstance);
    let TyroGitInstance = path.join(app.getPath("appData"), urlTyroGit);


    /*
    *
    * GESTION DES FICHIER
    *
    * */

    // Si il existe déjà un .Tyrolium/
    if (!fs.existsSync(TyroliumInstance)) {
        console.log("a creer");

        fs.mkdir(TyroliumInstance, (err) => {
            if (err) {
                showErrorDialog("Erreur", 'Une erreur s\'est produite. Veuillez réessayer.');
            } else {
                console.log("Repertoire '.Tyrolium' cree avec succes.");
            }
        });



    }

    // Si il existe déjà .Tyrolium/TyroGit
    if (!fs.existsSync(TyroGitInstance)){

        fs.mkdir(TyroGitInstance, (err) => {
            if (err) {
                showErrorDialog("Erreur", 'Une erreur s\'est produite. Veuillez réessayer.');
            } else {
                console.log("Repertoire 'TyroGit' cree avec succes.");
            }
        });

    }

    /*
    *
    * SAVOIR LA DERNIER VERSION
    * @avec une api a créer
    *
    * */

    function getInfoLoaderServer(ip) {
        return new Promise((resolve, reject) => {
            request(ip, (error, response, body) => {
                if (error) {
                    reject(error);
                } else {
                    try {
                        const data = JSON.parse(body);
                        resolve(data);
                    } catch (parseError) {
                        reject(parseError);
                    }
                }
            });
        });
    }

    getInfoLoaderServer(apiUrl)
        .then(InfoLoaderServer => {
            console.log(InfoLoaderServer)

            let versionName = InfoLoaderServer.latest;
            let linkDownload  = InfoLoaderServer.download;
            let pathLaunch = path.join(app.getPath("appData"), '/.Tyrolium/TyroGit/' + versionName +'/');

            if (!fs.existsSync(pathLaunch)){
                updatedLauncher(linkDownload, pathLaunch, versionName);
            } else {
                lancement(versionName);
                // showErrorDialog("Erreur Internet", 'Une erreur s\'est produite. Veuillez réessayer.');
            }
        })
        .catch(error => {
            console.log(error);
            showErrorDialog("Erreur Internet", 'Une erreur s\'est produite. Veuillez réessayer.');
        });


    /*
    *
    * INSTALLATION DU LAUNCHER
    *
    * */

    function updatedLauncher(linkDownload, pathLaunch, versionName){

        const http = require('http');
        const AdmZip = require('adm-zip');

        // URL du fichier ZIP à télécharger
        const zipUrl = linkDownload;

        // Emplacement où extraire le contenu du fichier ZIP
        const extractDir = pathLaunch;

        // Fonction pour télécharger et extraire le fichier ZIP
        function downloadAndExtractZip(zipUrl, extractDir) {
            return new Promise((resolve, reject) => {
                const file = fs.createWriteStream('temp.zip');
                http.get(zipUrl, (response) => {
                    response.pipe(file);
                    file.on('finish', () => {
                        file.close(() => {
                            const zip = new AdmZip('temp.zip');
                            zip.extractAllTo(extractDir, /*overwrite*/ true);
                            fs.unlink('temp.zip', (err) => {
                                if (err) reject(err);
                                resolve();
                            });
                        });
                    });
                }).on('error', (err) => {
                    fs.unlink('temp.zip', () => {
                        reject(err);
                    });
                });
            });
        }

        // Appeler la fonction pour télécharger et extraire le fichier ZIP
        downloadAndExtractZip(zipUrl, extractDir)
            .then(() => {
                console.log('Fichier ZIP telecharge et extrait avec succes.');
                lancement(versionName);
            })
            .catch((error) => {
                console.error('Erreur lors du telechargement ou de l\'extraction du fichier ZIP :', error);
                showErrorDialog("Erreur", 'Une erreur s\'est produite. Veuillez réessayer.');
            });

    }

    /*
    *
    * LANCEMENT DU LAUNCHER
    *
    * */

    function lancement(versionName){

        const { spawn} = require('child_process');

        const executablePath = TyroGitInstance + versionName + '/tyrogit-client.exe';

        const options = {
            detached: true,
        };

        const childProcess = spawn(executablePath, [], options);

        childProcess.on('error', (err) => {
            console.error('Erreur lors du lancement de l\'executable :', err);
            showErrorDialog("Erreur", 'Une erreur s\'est produite. Veuillez réessayer.');
        });

        childProcess.on('close', (code) => {
            console.log('L\'executable s\'est termine avec le code de sortie :', code);
            app.quit();
        });

        childProcess.stdout.on('data', function (data) {
            console.log("Launcher talk");
            mainWindow.hide();
        });

    }

});

function showErrorDialog(context, message) {
    dialog.showErrorBox(context, message);
    app.quit();
}