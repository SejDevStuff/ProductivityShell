const { ipcMain, protocol, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { v4 : uuidv4 } = require('uuid');
const { exec } = require('child_process');
const log = require('electron-log');
const ipcManLog = log.scope("IPCManager");

const folderMan = require('./folderman');
const appMan = require('./appman');

var progInit = false;

// ============================ //
let SHELL_VERSION = 3;
let SHELL_PATH = null;
// ============================ //

async function init(app) {
    ipcManLog.info("Initialising Inter-Process Communications Manager ...");
    folderMan.init();
    appMan.init(folderMan);

    protocol.registerFileProtocol('atom', (request, callback) => {
        const filePath = folderMan.relpath_to_realpath(request.url.slice('atom://'.length));
        callback(filePath);
    })
    
    progInit = true;
}

function manageIPC(app, win) {
    if (!progInit) {
        ipcManLog.error("Please run init() before using any other function!");
        return;
    }

    appMan.install("Unknown.png", SHELL_VERSION).then((res) => {
        appMan.install("ApplicationStore", SHELL_VERSION).then((res) => {
            setTimeout(() => {
                let Applications = appMan.getInstalledApplications();
                win.webContents.send('ApplicationsList', Applications);
                appMan.returnSafeAppList(SHELL_VERSION).then((applist) => {
                    win.webContents.send("AppList", applist);
                })
            }, 500)
        });
    });

    ipcMain.on('GetOnlineAppList', (e, args) => {
        ipcManLog.error("GetOnlineAppList request");
        appMan.returnSafeAppList(SHELL_VERSION).then((applist) => {
            win.webContents.send("AppList", applist);
        })
    });

    ipcMain.on('AvailableForUpdates', (e,args) => {
        appMan.checkVersion(SHELL_VERSION).then((result) => {
            if (result) {
                if (SHELL_PATH == null) {
                    win.webContents.send("GetShellPath", "");
                    setTimeout(() => {
                        ipcManLog.info("An update is available!");
                        dialog.showOpenDialog({ properties: ['openFile'], title: "Your shell needs updating. Please select your shell EXE." }).then((path) => {
                            if (path.canceled) {
                                win.webContents.send("Message", "<h1>Error</h1>There was an error whilst trying to update your shell. Restart your computer please.");
                                return;
                            }
                            SHELL_PATH = path.filePaths[0];
                            appMan.updateShell(SHELL_PATH).then((result) => {
                                if (result) {
                                    process.exit();
                                } else {
                                    win.webContents.send("Message", "<h1>Error</h1>There was an error whilst trying to update your shell. Restart your computer please.");
                                    return;
                                }
                            });
                        });
                    }, 2000);
                    return;
                }
            }
        });
    });

    ipcMain.on('ShutdownComputer', (e,args) => {
        exec('shutdown /s /t 0');
    });

    ipcMain.on('RestartComputer', (e,args) => {
        exec('shutdown /r /t 0');
    });

    ipcMain.on('RunApp', (e, args) => {
        ipcManLog.info("RunApp request");
        let RealAppPath = folderMan.relpath_to_realpath(args);
        let Mainfile = "INDEX.HTML";

        ipcManLog.info("Trying to run app: " + path.join(RealAppPath, Mainfile));

        if (fs.existsSync(path.join(RealAppPath, "Info.json"))) {
            try {
                let JSONData = JSON.parse(fs.readFileSync(path.join(RealAppPath, "Info.json")));
                if ((JSONData["Mainfile"] === undefined) == false) {
                    Mainfile = JSONData["Mainfile"];
                }
            } catch (e) {}
        }

        if (fs.existsSync(path.join(RealAppPath, Mainfile))) {
            let name = RealAppPath;
            let uuid = uuidv4();
            let app_path = path.join(RealAppPath, Mainfile);
            if (fs.existsSync(path.join(RealAppPath, "Info.json"))) {
                try {
                    let JSONData = JSON.parse(fs.readFileSync(path.join(RealAppPath, "Info.json")));
                    if ((JSONData["AppName"] === undefined) == false) {
                        name = JSONData["AppName"];
                    }
                } catch (e) {}
            }
            win.webContents.send('RunApp', {name: name, uuid: uuid, path: app_path});
            //win.loadFile('ui/RUNFILE.HTML');
            return;
        } else {
            win.webContents.send("Message", "<h1>Error</h1>We couldn't run that app! (No Mainfile present)");
            return;
        }
    });

    ipcMain.on('InstallApplication', (e, args) => {
        ipcManLog.info("InstallApp request");
        appMan.appExists(args).then((result) => {
            if (result) {
                dialog.showMessageBox(win, {title: "Install '" + args + "'?", message: "Do you want to install the application '" + args + "'?\nIf you do not remember wanting to install this application, click on No.", buttons: ["Yes", "No"]}).then((data) => {
                    if (data.response == 0) {
                        appMan.install(args, SHELL_VERSION).then((result) => {
                            setTimeout(() => {
                                let Applications = appMan.getInstalledApplications();
                                win.webContents.send('ApplicationsList', Applications);
                                appMan.returnSafeAppList(SHELL_VERSION).then((applist) => {
                                    win.webContents.send("AppList", applist);
                                })
                            }, 500)
                        });
                    }
                });
            } else {
                ipcManLog.info("InstallApp request: App does not exist");
            }
        })
    });

    ipcMain.on('UninstallApplication', (e, args) => {
        ipcManLog.info("InstallApp request");
        if (appMan.appExistsLocal(args)) {
            dialog.showMessageBox(win, {title: "Uninstall '" + args + "'?", message: "Do you want to remove the application '" + args + "'?\nIf you do not remember wanting to remove this application, click on No.", buttons: ["Yes", "No"]}).then((data) => {
                if (data.response == 0) {
                    appMan.uninstallApp(args);
                    let Applications = appMan.getInstalledApplications();
                    win.webContents.send('ApplicationsList', Applications);
                    appMan.returnSafeAppList(SHELL_VERSION).then((applist) => {
                        win.webContents.send("AppList", applist);
                    })
                }
            });
        }
    })

    ipcMain.on('GetApplications', (e, args) => {
        ipcManLog.info("GetApps request");
        let Applications = appMan.getInstalledApplications();
        win.webContents.send('ApplicationsList', Applications);
    });
}

module.exports = {
    init,
    manageIPC
}